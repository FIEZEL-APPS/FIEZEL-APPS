/*
 * FIEZEL Speaking + Listening Sidecar v1
 * Candidate ADD-ONLY runtime. No dependency on FIEZEL canonical state.
 * Speaking score = spoken production / target coverage. It is NOT a pronunciation score.
 */
(function(root,factory){
  const api=factory(root||globalThis);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FiezelSLAddon=api;
})(typeof self!=='undefined'?self:this,function(global){
  'use strict';

  const ADDON_SCHEMA='fiezel-speaking-listening-addon-v1';
  const STATE_SCHEMA='fiezel-speaking-listening-state-v1';
  const EVIDENCE_SCHEMA='fiezel-speaking-listening-evidence-v1';
  const DEFAULT_CONFIG=Object.freeze({
    enabled:false,
    storageKey:'fiezel-sl-v1-state',
    language:'en-US',
    ttsRate:.86,
    maxListeningReplays:2,
    recognitionMode:'browser-default',
    persistRawAudio:false,
    persistRawTranscript:false,
    aggregateEventLimit:120
  });
  const LEVELS=Object.freeze(['A1','A2','B1','B2','C1','C2']);
  const now=()=>Date.now();
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const normalizeText=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const tokens=s=>normalizeText(s).split(' ').filter(Boolean);
  const median=xs=>{const a=xs.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:Math.round((a[m-1]+a[m])/2)};
  function tokenF1(actual,expected){
    const a=tokens(actual),e=tokens(expected);if(!a.length||!e.length)return 0;
    const need=new Map();e.forEach(t=>need.set(t,(need.get(t)||0)+1));let match=0;
    a.forEach(t=>{const n=need.get(t)||0;if(n>0){match++;need.set(t,n-1)}});
    const precision=match/a.length,recall=match/e.length;
    return precision+recall?2*precision*recall/(precision+recall):0;
  }
  function keywordCoverage(actual,keywords){
    const text=` ${normalizeText(actual)} `,ks=(keywords||[]).map(normalizeText).filter(Boolean);if(!ks.length)return 0;
    return ks.filter(k=>text.includes(` ${k} `)||tokens(k).every(t=>text.includes(` ${t} `))).length/ks.length;
  }
  function conceptCoverage(actual,groups){
    const text=` ${normalizeText(actual)} `,rows=(Array.isArray(groups)?groups:[]).map(group=>(Array.isArray(group)?group:[group]).map(normalizeText).filter(Boolean)).filter(group=>group.length);
    if(!rows.length)return 0;
    const matched=rows.filter(group=>group.some(alias=>text.includes(` ${alias} `))).length;
    return matched/rows.length;
  }
  function scoreSpeaking(item,transcript){
    if(!item||!transcript)return{score:0,passed:false,metric:'none',claim:'spoken_production_coverage_not_pronunciation'};
    const metric=item.scoring?.metric||'target_concept_coverage';
    let raw=0,conceptsMatched=null,conceptsTotal=null;
    if(metric==='token_f1')raw=tokenF1(transcript,item.targetText||item.sampleAnswer);
    else{
      const groups=Array.isArray(item.targetConcepts)&&item.targetConcepts.length?item.targetConcepts:(item.requiredKeywords||[]).map(value=>[value]);
      const coverage=conceptCoverage(transcript,groups),minimumWords=Math.max(2,Number(item.scoring?.minimumWords)||4),lengthCoverage=Math.min(1,tokens(transcript).length/minimumWords);
      raw=coverage*.85+lengthCoverage*.15;conceptsTotal=groups.length;conceptsMatched=Math.round(coverage*groups.length);
    }
    const threshold=clamp(item.scoring?.threshold??.7,0,1);
    return{score:Math.round(raw*100),passed:raw>=threshold,metric,threshold:Math.round(threshold*100),conceptsMatched,conceptsTotal,claim:'spoken_production_coverage_not_pronunciation'};
  }
  function scoreListening(item,response){
    if(item?.mode==='dictation'){
      const raw=tokenF1(response,item.answerText||item.script||'');const threshold=clamp(item.scoring?.threshold??.75,0,1);
      return{score:Math.round(raw*100),passed:raw>=threshold,metric:'token_f1',threshold:Math.round(threshold*100)};
    }
    const selected=Number(response),ok=Number.isInteger(selected)&&selected===Number(item?.answerIndex);
    return{score:ok?100:0,passed:ok,metric:'exact_choice',threshold:100};
  }
  function capabilities(){
    const Recognition=global.SpeechRecognition||global.webkitSpeechRecognition;
    return Object.freeze({
      // m025-28: audio capability means the neural runtime is usable. Browser
      // SpeechSynthesis presence is irrelevant: it is never used for listening.
      tts:!!(global.FiezelVoiceRuntime&&typeof global.FiezelVoiceRuntime.speak==='function'),
      neuralVoice:global.FiezelVoiceRuntime?.status?.().ready===true,
      speechRecognition:typeof Recognition==='function',
      mediaRecorder:typeof global.MediaRecorder==='function'&&!!global.navigator?.mediaDevices?.getUserMedia,
      secureContext:global.isSecureContext!==false,
      online:global.navigator?.onLine!==false
    });
  }

  function freshState(){return{schema:STATE_SCHEMA,version:1,updatedAt:0,events:[],listening:{attempts:0,passed:0,scoreSum:0},speaking:{attempts:0,passed:0,scoreSum:0},capabilityEvents:{}}}
  function sanitizeState(raw,limit){
    const s=freshState();if(!raw||raw.schema!==STATE_SCHEMA)return s;
    const cleanEvents=(Array.isArray(raw.events)?raw.events:[]).slice(-limit).map(e=>({
      id:String(e.id||'').slice(0,80),at:Number(e.at||0),domain:e.domain==='speaking'?'speaking':'listening',itemId:String(e.itemId||'').slice(0,80),level:LEVELS.includes(e.level)?e.level:'A1',mode:String(e.mode||'').slice(0,40),score:clamp(e.score,0,100),passed:!!e.passed,responseMs:clamp(e.responseMs,0,600000),metric:String(e.metric||'').slice(0,40),rawAudioStored:false,rawTranscriptStored:false
    }));
    s.events=cleanEvents;s.updatedAt=Number(raw.updatedAt||0);s.capabilityEvents={};
    const capabilityRows=raw.capabilityEvents&&typeof raw.capabilityEvents==='object'?Object.entries(raw.capabilityEvents).slice(-12):[];
    for(const [name,value] of capabilityRows){const key=String(name||'').slice(0,40);if(!key)continue;s.capabilityEvents[key]={status:String(value?.status||'').slice(0,40),at:clamp(value?.at,0,Number.MAX_SAFE_INTEGER)}}
    for(const d of ['listening','speaking']){const es=cleanEvents.filter(e=>e.domain===d);s[d]={attempts:es.length,passed:es.filter(e=>e.passed).length,scoreSum:es.reduce((n,e)=>n+e.score,0)}}
    return s;
  }
  class StateStore{
    constructor(config){this.config=config;this.storage=global.localStorage||null;this.state=this.load()}
    load(){try{return sanitizeState(JSON.parse(this.storage?.getItem(this.config.storageKey)||'null'),this.config.aggregateEventLimit)}catch{return freshState()}}
    save(){this.state.updatedAt=now();try{this.storage?.setItem(this.config.storageKey,JSON.stringify(this.state))}catch{}return this.state}
    record(domain,item,result,responseMs){
      if(!['listening','speaking'].includes(domain))throw new Error('invalid_domain');
      const event={id:`sl-${now()}-${Math.random().toString(36).slice(2,8)}`,at:now(),domain,itemId:String(item.id||'').slice(0,80),level:LEVELS.includes(item.level)?item.level:'A1',mode:String(item.mode||'').slice(0,40),score:clamp(result.score,0,100),passed:!!result.passed,responseMs:clamp(responseMs,0,600000),metric:String(result.metric||'').slice(0,40),rawAudioStored:false,rawTranscriptStored:false};
      this.state.events=[...(this.state.events||[]),event].slice(-this.config.aggregateEventLimit);
      const es=this.state.events.filter(e=>e.domain===domain);this.state[domain]={attempts:es.length,passed:es.filter(e=>e.passed).length,scoreSum:es.reduce((n,e)=>n+e.score,0)};this.save();return event
    }
    noteCapability(name,status){const key=String(name||'').slice(0,40);if(!key)return;const next={...(this.state.capabilityEvents||{}),[key]:{status:String(status||'').slice(0,40),at:now()}};this.state.capabilityEvents=Object.fromEntries(Object.entries(next).slice(-12));this.save()}
    evidence(){
      const events=this.state.events||[],summarize=domain=>{const es=events.filter(e=>e.domain===domain),scores=es.map(e=>e.score),times=es.map(e=>e.responseMs).filter(Boolean);const byMode={};for(const e of es){const b=byMode[e.mode]||{attempts:0,passed:0,scoreSum:0};b.attempts++;if(e.passed)b.passed++;b.scoreSum+=e.score;byMode[e.mode]=b}return{attempts:es.length,passRate:es.length?Math.round(es.filter(e=>e.passed).length/es.length*100):null,averageScore:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null,medianResponseMs:median(times),byMode:Object.fromEntries(Object.entries(byMode).map(([k,b])=>[k,{attempts:b.attempts,passRate:b.attempts?Math.round(b.passed/b.attempts*100):null,averageScore:b.attempts?Math.round(b.scoreSum/b.attempts):null}]))}}
      return{schema:EVIDENCE_SCHEMA,generatedAt:new Date().toISOString(),privacy:{rawAudioIncluded:false,rawTranscriptIncluded:false,rawAnswerTextIncluded:false},domains:{listening:summarize('listening'),speaking:summarize('speaking')},capabilities:capabilities()}
    }
    reset(){this.state=freshState();try{this.storage?.removeItem(this.config.storageKey)}catch{}return this.state}
  }

  class DataRepository{
    constructor(baseUrl){this.baseUrl=String(baseUrl||'./').replace(/\/?$/,'/');this.listening=[];this.speaking=[]}
    async load(){if(typeof global.fetch!=='function')throw new Error('fetch_unavailable');const [l,s]=await Promise.all([global.fetch(this.baseUrl+'listening-bank-v1.json'),global.fetch(this.baseUrl+'speaking-bank-v1.json')]);if(!l.ok||!s.ok)throw new Error('sidecar_data_load_failed');const lj=await l.json(),sj=await s.json();if(lj.schema!=='fiezel-listening-bank-v1'||sj.schema!=='fiezel-speaking-bank-v1')throw new Error('sidecar_schema_mismatch');if(lj.count!==lj.items?.length||sj.count!==sj.items?.length||new Set(lj.items?.map(x=>x.id)).size!==lj.count||new Set(sj.items?.map(x=>x.id)).size!==sj.count)throw new Error('sidecar_data_integrity_failed');this.listening=lj.items||[];this.speaking=sj.items||[];return this}
    for(domain,level){const rows=domain==='speaking'?this.speaking:this.listening;return rows.filter(x=>x.level===level)}
  }

  class TTSService{
    constructor(config){this.config=config}
    stop(){try{global.FiezelVoiceRuntime?.stop?.()}catch{}try{global.speechSynthesis?.cancel()}catch{}}
    // m025-28: listening used to call SpeechSynthesisUtterance directly, so it never
    // touched the neural engine at all -- every listening item was browser TTS by
    // construction. That is also why longer scripts failed: B2 scripts run ~155 chars
    // against A1's ~40, and iOS SpeechSynthesis routinely stalls on the longer ones,
    // tripping the internal timeout and locking the item. Route listening through the
    // same neural runtime as the rest of the app, and never substitute browser TTS.
    play(text,options={}){
      const runtime=global.FiezelVoiceRuntime;
      if(!runtime||typeof runtime.speak!=='function')return Promise.reject(new Error('neural_runtime_unavailable'));
      this.stop();
      const status=typeof runtime.status==='function'?runtime.status():null;
      if(status&&!status.prepared)return Promise.reject(new Error('neural_voice_not_downloaded'));
      const rate=clamp(options.rate??this.config.ttsRate,.55,1.3);
      // allowFallback:false is the whole point: a listening item must be neural or
      // explicitly unavailable, never silently degraded to a robot voice.
      return runtime.speak(String(text||''),{voice:options.voice,speed:rate,lang:this.config.language,allowFallback:false})
        .then(result=>({provider:String(result&&result.provider||'sherpa-vits-local')}));
    }
  }

  class RecognitionService{
    constructor(config){this.config=config;this.active=null}
    stop(){try{this.active?.abort?.()}catch{}this.active=null}
    listen(timeoutMs=12000){
      const R=global.SpeechRecognition||global.webkitSpeechRecognition;if(typeof R!=='function')return Promise.reject(new Error('speech_recognition_unavailable'));
      this.stop();return new Promise((resolve,reject)=>{let done=false,timer;const finish=(fn,v)=>{if(done)return;done=true;clearTimeout(timer);this.active=null;fn(v)};try{const r=new R();this.active=r;r.lang=this.config.language;r.interimResults=false;r.maxAlternatives=1;r.continuous=false;r.onresult=e=>{const alt=e?.results?.[0]?.[0];finish(resolve,{transcript:String(alt?.transcript||''),confidence:Number.isFinite(Number(alt?.confidence))?Number(alt.confidence):null,rawPersisted:false})};r.onerror=e=>finish(reject,new Error(`speech_recognition_${String(e?.error||'error')}`));r.onend=()=>{if(!done)finish(reject,new Error('speech_recognition_no_result'))};timer=setTimeout(()=>{try{r.abort()}catch{}finish(reject,new Error('speech_recognition_timeout'))},timeoutMs);r.start()}catch(e){finish(reject,e)}})
    }
  }

  class RecorderService{
    constructor(){this.stream=null;this.recorder=null;this.chunks=[];this.url=''}
    revoke(){if(this.url){try{global.URL?.revokeObjectURL?.(this.url)}catch{}this.url=''}}
    async start(){if(!capabilities().mediaRecorder)throw new Error('media_recorder_unavailable');this.stopTracks();this.revoke();this.stream=await global.navigator.mediaDevices.getUserMedia({audio:true});this.chunks=[];this.recorder=new global.MediaRecorder(this.stream);this.recorder.ondataavailable=e=>{if(e.data?.size)this.chunks.push(e.data)};this.recorder.start();return true}
    stop(){return new Promise((resolve,reject)=>{const r=this.recorder;if(!r||r.state==='inactive'){this.stopTracks();return resolve(null)};r.onerror=()=>{this.stopTracks();reject(new Error('media_recorder_failed'))};r.onstop=()=>{try{const blob=new global.Blob(this.chunks,{type:r.mimeType||'audio/webm'});this.revoke();this.url=global.URL.createObjectURL(blob);this.stopTracks();resolve({url:this.url,size:blob.size,persisted:false})}catch(e){this.stopTracks();reject(e)}};r.stop()})}
    stopTracks(){try{this.stream?.getTracks?.().forEach(t=>t.stop())}catch{}this.stream=null;this.recorder=null}
    destroy(){this.stopTracks();this.revoke();this.chunks=[]}
  }

  function mergeConfig(input){const cfg={...DEFAULT_CONFIG,...(global.FIEZEL_SPEAKING_LISTENING_CONFIG||{}),...(input||{})};cfg.persistRawAudio=false;cfg.persistRawTranscript=false;cfg.aggregateEventLimit=Math.max(20,Math.min(300,Number(cfg.aggregateEventLimit)||120));return cfg}

  class Controller{
    constructor(options){this.options=options||{};this.config=mergeConfig(this.options.config);this.root=this.options.root||null;this.repo=new DataRepository(this.options.baseUrl||'./features/speaking-listening/');this.store=new StateStore(this.config);this.tts=this.options.tts&&typeof this.options.tts.play==='function'&&typeof this.options.tts.stop==='function'?this.options.tts:new TTSService(this.config);this.recognition=new RecognitionService(this.config);this.recorder=new RecorderService();this.domain='listening';this.level='A1';this.items=[];this.index=0;this.startedAt=0;this.replays=0;this.ephemeralTranscript=''}
    async init(){await this.repo.load();return this}
    mount(root){this.root=root||this.root;if(!this.root)throw new Error('mount_root_required');this.renderHub();return this}
    open(domain,level){if(!['listening','speaking'].includes(domain))throw new Error('invalid_domain');this.domain=domain;this.level=LEVELS.includes(level)?level:this.level;this.items=this.repo.for(domain,this.level);this.index=0;this.startedAt=now();this.replays=0;this.ephemeralTranscript='';this.renderSession();return this}
    exit(){this.tts.stop();this.recognition.stop();this.recorder.destroy();this.ephemeralTranscript='';if(typeof this.options.onExit==='function')this.options.onExit();else this.renderHub()}
    emitEvidence(){const evidence=this.store.evidence();if(typeof this.options.onAggregateEvidence==='function')this.options.onAggregateEvidence(evidence);return evidence}
    renderHub(){if(!this.root)return;const c=capabilities(),ev=this.store.evidence();this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-head"><div><span class="fsl-kicker">FIEZEL SKILLS LAB</span><h1>Speaking + Listening</h1><p>Latihan suara dengan data terisolasi. Speaking mengukur target-language coverage, bukan pronunciation.</p></div></div><div class="fsl-grid"><article class="fsl-card"><span class="fsl-kicker">Listening</span><h2>Dengar lalu pahami</h2><p>Gist, detail, dan dictation. Jawaban baru aktif setelah audio berhasil diputar dan raw dictation tidak disimpan.</p><div class="fsl-actions"><button class="fsl-primary" data-open="listening">Mulai Listening</button></div></article><article class="fsl-card"><span class="fsl-kicker">Speaking</span><h2>Ucapkan dan respons</h2><p>${c.speechRecognition?'Speech recognition tersedia untuk target-language coverage.':'Speech recognition tidak tersedia; mode rekam-dengar mandiri tetap dapat dipakai jika microphone recording tersedia.'}</p><div class="fsl-actions"><button class="fsl-primary" data-open="speaking">Mulai Speaking</button></div></article></div><article class="fsl-card"><span class="fsl-kicker">Capability gate</span><div class="fsl-status">Audio output: <b>${c.neuralVoice?'neural ready':'neural belum diunduh'}</b> · Speech recognition: <b>${c.speechRecognition?'ready':'unavailable'}</b> · Recorder: <b>${c.mediaRecorder?'ready':'unavailable'}</b> · Secure context: <b>${c.secureContext?'yes':'no'}</b></div><p class="fsl-privacy">Browser speech recognition dapat melibatkan layanan pengenal milik browser. FIEZEL tidak menyimpan raw audio, transcript, atau jawaban dictation.</p></article><article class="fsl-card"><span class="fsl-kicker">Evidence lokal</span><p>Listening: <b>${ev.domains.listening.attempts}</b> attempt · average ${ev.domains.listening.averageScore??'-'}%. Speaking: <b>${ev.domains.speaking.attempts}</b> attempt · average ${ev.domains.speaking.averageScore??'-'}%.</p></article></section>`;
      this.root.querySelectorAll?.('[data-open]').forEach(b=>b.addEventListener('click',()=>this.renderLevelPicker(b.getAttribute('data-open'))))
    }
    renderLevelPicker(domain){if(!this.root)return;this.root.innerHTML=`<section class="fsl-shell"><article class="fsl-card"><span class="fsl-kicker">${esc(domain)}</span><h2>Pilih level</h2><div class="fsl-levels">${LEVELS.map(l=>`<button data-level="${l}" aria-pressed="${String(l===this.level)}">${l}</button>`).join('')}</div><div class="fsl-actions"><button data-back>Kembali</button></div></article></section>`;this.root.querySelectorAll?.('[data-level]').forEach(b=>b.addEventListener('click',()=>this.open(domain,b.getAttribute('data-level'))));this.root.querySelector?.('[data-back]')?.addEventListener('click',()=>this.renderHub())}
    current(){return this.items[this.index]||null}
    renderSession(){if(!this.root)return;const item=this.current();if(!item){this.renderComplete();return}this.startedAt=now();this.replays=0;this.ephemeralTranscript='';const progress=Math.round(this.index/Math.max(1,this.items.length)*100);if(this.domain==='listening')this.renderListening(item,progress);else this.renderSpeaking(item,progress)}
    renderListening(item,progress){const isDict=item.mode==='dictation';this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-progress"><span style="width:${progress}%"></span></div><article class="fsl-card"><span class="fsl-kicker">Listening · ${esc(item.level)} · ${esc(item.mode)}</span><h2>${esc(item.question)}</h2><p class="fsl-privacy">Script disembunyikan sampai jawaban dinilai. Jawaban terkunci sampai audio berhasil diputar.</p><div class="fsl-actions"><button class="fsl-primary" data-play>Dengarkan</button><button data-exit>Keluar</button></div><fieldset class="fsl-work" data-work disabled>${isDict?'<input class="fsl-input" data-dictation autocomplete="off" spellcheck="false" placeholder="Ketik yang kamu dengar…"><div class="fsl-actions"><button class="fsl-primary" data-submit>Nilai jawaban</button></div>':`<div class="fsl-options">${item.options.map((o,i)=>`<button class="fsl-option" data-choice="${i}">${esc(o)}</button>`).join('')}</div>`}</fieldset><div data-feedback></div></article></section>`;
      this.root.querySelector('[data-play]').addEventListener('click',async event=>{if(this.replays>=Number(item.maxReplays||this.config.maxListeningReplays)){this.setFeedback('Batas replay untuk item ini sudah tercapai.');return}const button=event.currentTarget;button.disabled=true;this.replays++;try{const result=await Promise.race([this.tts.play(item.script,{voice:item.voice,rate:this.config.ttsRate,profile:'listening'}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('tts_timeout')),35000))]);this.root.querySelector('[data-work]').disabled=false;this.store.noteCapability('tts',String(result?.provider||'ok'));this.setFeedback(`Audio siap · replay ${this.replays}/${Number(item.maxReplays||this.config.maxListeningReplays)}.`)}catch{this.store.noteCapability('tts','unavailable');this.setFeedback('Audio tidak tersedia. Item listening ini tetap terkunci dan tidak dinilai.')}finally{button.disabled=false}});this.root.querySelector('[data-exit]').addEventListener('click',()=>this.exit());
      if(isDict)this.root.querySelector('[data-submit]').addEventListener('click',()=>{const input=this.root.querySelector('[data-dictation]'),value=input.value;const result=scoreListening(item,value);input.value='';this.finishItem(item,result)});else this.root.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>this.finishItem(item,scoreListening(item,Number(b.getAttribute('data-choice'))))))
    }
    renderSpeaking(item,progress){const c=capabilities();this.root.innerHTML=`<section class="fsl-shell"><div class="fsl-progress"><span style="width:${progress}%"></span></div><article class="fsl-card"><span class="fsl-kicker">Speaking · ${esc(item.level)} · ${esc(item.mode)}</span><h2>${esc(item.instruction)}</h2>${item.targetText?`<p class="fsl-prompt">${esc(item.targetText)}</p>`:''}<p class="fsl-privacy">Penilaian otomatis hanya spoken production / target coverage. Ini bukan pengukuran phoneme/pronunciation.</p><div class="fsl-actions">${c.speechRecognition?'<button class="fsl-primary" data-recognize>Mulai bicara</button>':''}${c.mediaRecorder?'<button data-record>Rekam untuk dengar ulang</button>':''}<button data-exit>Keluar</button></div><div data-rec-status class="fsl-status">${c.speechRecognition?'Siap mendengar respons.':'Speech recognition tidak tersedia; gunakan rekam-dengar mandiri tanpa skor otomatis.'}</div><div data-feedback></div><div data-playback></div></article></section>`;this.root.querySelector('[data-exit]').addEventListener('click',()=>this.exit());
      this.root.querySelector('[data-recognize]')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;this.root.querySelector('[data-rec-status]').textContent='Mendengarkan…';try{const r=await this.recognition.listen();this.ephemeralTranscript=r.transcript;const result=scoreSpeaking(item,r.transcript);this.store.noteCapability('speechRecognition','ok');this.root.querySelector('[data-rec-status]').textContent='Respons diterima. Transcript hanya dipakai sementara untuk penilaian.';this.finishItem(item,result,`<div class="fsl-transcript">${esc(r.transcript)}</div>`)}catch(err){this.store.noteCapability('speechRecognition','unavailable');this.root.querySelector('[data-rec-status]').textContent=`Tidak dapat menilai otomatis: ${esc(err.message)}.`;e.currentTarget.disabled=false}});
      this.root.querySelector('[data-record]')?.addEventListener('click',async e=>{const btn=e.currentTarget;if(btn.dataset.active==='1'){btn.disabled=true;try{const clip=await this.recorder.stop();btn.dataset.active='0';btn.textContent='Rekam untuk dengar ulang';btn.disabled=false;if(clip?.url)this.root.querySelector('[data-playback]').innerHTML=`<audio class="fsl-audio" controls src="${esc(clip.url)}"></audio><p class="fsl-privacy">Audio hanya berada di memory browser dan URL blob sementara; tidak disimpan ke state.</p>`}catch{btn.disabled=false}}else{try{await this.recorder.start();btn.dataset.active='1';btn.textContent='Stop rekaman';this.store.noteCapability('mediaRecorder','ok')}catch{this.store.noteCapability('mediaRecorder','unavailable');this.setFeedback('Microphone recording tidak tersedia atau izin ditolak.')}}})
    }
    setFeedback(text){const el=this.root?.querySelector?.('[data-feedback]');if(el)el.innerHTML=`<div class="fsl-feedback">${esc(text)}</div>`}
    finishItem(item,result,prefix=''){
      const ms=now()-this.startedAt;this.store.record(this.domain,item,result,ms);this.emitEvidence();const label=result.passed?'Lolos target item':'Belum mencapai target item';const note=this.domain==='speaking'?`Skor ${result.score}% hanya mengukur ${result.metric.replace(/_/g,' ')}; bukan pronunciation.`:`Skor ${result.score}%.`;
      const fb=this.root.querySelector('[data-feedback]');if(fb)fb.innerHTML=`${prefix}<div class="fsl-feedback"><strong>${label}</strong><span>${esc(note)}</span>${this.domain==='listening'?`<p><b>Script:</b> ${esc(item.script)}</p>`:`<p><b>Contoh respons:</b> ${esc(item.sampleAnswer||item.targetText||'')}</p>`}<div class="fsl-actions"><button class="fsl-primary" data-next>Lanjut</button></div></div>`;
      this.root.querySelectorAll('button').forEach(b=>{if(!b.hasAttribute('data-next')&&!b.hasAttribute('data-exit'))b.disabled=true});this.root.querySelector('[data-next]')?.addEventListener('click',()=>{this.ephemeralTranscript='';this.index++;this.renderSession()})
    }
    renderComplete(){const ev=this.store.evidence(),d=ev.domains[this.domain];this.root.innerHTML=`<section class="fsl-shell"><article class="fsl-card"><span class="fsl-kicker">Session complete</span><h2>${this.domain==='listening'?'Listening':'Speaking'} selesai</h2><p>Evidence sidecar saat ini: ${d.attempts} attempt · average ${d.averageScore??'-'}% · pass rate ${d.passRate??'-'}%.</p><p class="fsl-privacy">Tidak ada raw audio, transcript, atau jawaban dictation yang disimpan di state.</p><div class="fsl-actions"><button class="fsl-primary" data-home>Kembali ke lab</button></div></article></section>`;this.root.querySelector('[data-home]').addEventListener('click',()=>this.renderHub())}
    destroy(){this.tts.stop();this.recognition.stop();this.recorder.destroy();this.ephemeralTranscript='';if(this.root)this.root.innerHTML=''}
  }

  async function create(options){const c=new Controller(options);await c.init();return c}
  return Object.freeze({
    schema:ADDON_SCHEMA,
    version:1,
    create,
    capabilities,
    scoreSpeaking,
    scoreListening,
    normalizeText,
    getDefaultConfig:()=>({...DEFAULT_CONFIG}),
    __test:Object.freeze({tokenF1,keywordCoverage,conceptCoverage,sanitizeState,freshState,mergeConfig,StateStore,DataRepository})
  });
});
