(function(root){
  'use strict';

  const runtime=root.FiezelVoiceRuntime;
  if(!runtime||runtime.__audibilityPatched)return;

  const BROWSER_TTS_TIMEOUT_MS=Number(root.FIEZEL_BROWSER_TTS_TIMEOUT_MS)||12000;
  const DIAG_LIMIT=200;
  const READINESS_PATCH='m025-13-readiness-v1';
  const UX_PATCH='m025-18-persisted-ready-ux-v1';
  let browserActive=false;
  let activeUtterance=null;
  let backgroundReadyPromise=null;
  let automaticReadyAttempted=false;
  let uxObserver=null;

  function diag(entry){
    try{
      const key='fiezel-neural-voice-diagnostics-v1';
      const list=JSON.parse(root.localStorage?.getItem(key)||'[]');
      list.push({t:Date.now(),v:String(root.FIEZEL_VERSION||''),patch:'audibility-v1',...entry});
      root.localStorage?.setItem(key,JSON.stringify(list.slice(-DIAG_LIMIT)));
    }catch{}
  }

  function warmWebAudio(){
    try{
      const player=root.FiezelWebAudioPlayer?.createPlayer?.(root);
      player?.warm?.();
    }catch{}
  }

  function readinessErrorCode(error){
    const value=String(error?.message||error?.name||error||'').toLowerCase();
    if(value.includes('assets are not prepared'))return'assets_not_prepared';
    if(value.includes('cache verification failed'))return'cache_verification_failed';
    if(value.includes('initialization is still running'))return'init_still_running';
    if(value.includes('init timed out')||value.includes('initialization timed out'))return'init_timeout';
    if(value.includes('neural_circuit_open'))return'circuit_open';
    return'other';
  }

  async function ensureReady(){
    // Keep the user-gesture-sensitive WebAudio resume in the synchronous click turn,
    // before any CacheStorage await. m025-12 awaited refresh in the probe first.
    warmWebAudio();
    const before=runtime.status?.()||{};
    diag({patch:READINESS_PATCH,phase:'ensure_ready_enter',prepared:!!before.prepared,ready:!!before.ready});
    try{
      if(typeof runtime.refreshPreparedFlag==='function'){
        diag({patch:READINESS_PATCH,phase:'ensure_ready_refresh_enter'});
        const refreshed=await runtime.refreshPreparedFlag();
        const afterRefresh=runtime.status?.()||{};
        diag({patch:READINESS_PATCH,phase:'ensure_ready_refresh_ready',prepared:!!afterRefresh.prepared,refreshed:!!refreshed});
      }
      diag({patch:READINESS_PATCH,phase:'ensure_ready_base_enter'});
      const result=await runtime.ensureReady();
      const after=runtime.status?.()||{};
      diag({patch:READINESS_PATCH,phase:'ensure_ready_ready',prepared:!!after.prepared,ready:!!after.ready});
      return result;
    }catch(error){
      const after=runtime.status?.()||{};
      diag({patch:READINESS_PATCH,phase:'ensure_ready_error',code:readinessErrorCode(error),prepared:!!after.prepared,ready:!!after.ready});
      throw error;
    }
  }

  function pickVoice(lang){
    try{
      const voices=root.speechSynthesis?.getVoices?.()||[];
      const wanted=String(lang||'en-US').toLowerCase();
      return voices.find(v=>String(v.lang||'').toLowerCase()===wanted)
        ||voices.find(v=>String(v.lang||'').toLowerCase().startsWith(wanted.split('-')[0]))
        ||null;
    }catch{return null}
  }

  function browserSpeakImmediate(text,options={}){
    if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){
      diag({phase:'browser_unavailable'});
      return Promise.reject(new Error('Browser TTS unavailable'));
    }
    warmWebAudio();
    return new Promise((resolve,reject)=>{
      let done=false,started=false,timer=null;
      const finish=(ok,value)=>{
        if(done)return;
        done=true;
        if(timer)clearTimeout(timer);
        browserActive=false;
        activeUtterance=null;
        try{root.__fiezelActiveUtterance=null}catch{}
        if(ok)resolve(value);else reject(value);
      };
      let utterance;
      try{utterance=new root.SpeechSynthesisUtterance(String(text||''))}catch(error){finish(false,error);return}
      activeUtterance=utterance;
      root.__fiezelActiveUtterance=utterance;
      browserActive=true;
      utterance.lang=options.lang||'en-US';
      utterance.rate=Number(options.speed||options.rate||.88);
      const voice=pickVoice(utterance.lang);
      if(voice)utterance.voice=voice;
      utterance.onstart=()=>{started=true;diag({phase:'browser_start',lang:utterance.lang})};
      utterance.onend=()=>{diag({phase:'browser_end'});finish(true,{provider:'browser-speech-synthesis',started:true})};
      utterance.onerror=event=>{
        const reason=String(event?.error||'error');
        diag({phase:'browser_error',reason});
        finish(false,new Error(`browser_tts_${reason}`));
      };
      timer=setTimeout(()=>{
        const reason=started?'browser_tts_timeout':'browser_tts_not_started';
        diag({phase:'browser_timeout',reason});
        try{root.speechSynthesis.cancel()}catch{}
        finish(false,new Error(reason));
      },BROWSER_TTS_TIMEOUT_MS);
      try{
        if(root.speechSynthesis.paused&&typeof root.speechSynthesis.resume==='function')root.speechSynthesis.resume();
        root.speechSynthesis.speak(utterance);
        diag({phase:'browser_enqueued',lang:utterance.lang});
      }catch(error){finish(false,error)}
    });
  }

  function currentRenderKey(node){
    if(!node)return'';
    try{return String(node.dataset?.fiezelNeuralUxKey||node.getAttribute?.('data-fiezel-neural-ux-key')||'')}catch{return''}
  }
  function setRenderKey(node,key){
    if(!node)return;
    try{
      if(node.dataset)node.dataset.fiezelNeuralUxKey=key;
      else node.setAttribute?.('data-fiezel-neural-ux-key',key);
    }catch{}
  }
  function setHtml(node,key,value){
    if(!node||currentRenderKey(node)===key)return;
    setRenderKey(node,key);
    node.innerHTML=value;
  }
  function setText(node,value){if(node&&String(node.textContent||'')!==value)node.textContent=value}
  function setDisabled(node,value){if(node&&node.disabled!==!!value)node.disabled=!!value}

  function syncPersistedReadyUi(){
    try{
      const doc=root.document;
      if(!doc||typeof doc.getElementById!=='function')return;
      const prepareButton=doc.getElementById('prepareNeuralVoice');
      if(!prepareButton)return;
      const testButton=doc.getElementById('testNeuralVoice');
      const hint=doc.getElementById('neuralVoiceProgress');
      const state=runtime.status?.()||{};
      if(!state.prepared){
        // Verification is authoritative. If a stale marker is invalidated, return
        // the UI to the real one-time download state instead of pretending the
        // cached activation path still exists.
        setDisabled(prepareButton,false);
        setHtml(prepareButton,'unprepared','<i data-lucide="download"></i> Siapkan suara offline');
        setDisabled(testButton,true);
        setText(hint,'Aset suara offline belum lengkap. Siapkan sekali untuk mengunduh dan memverifikasi model lokal.');
        return;
      }
      if(state.ready){
        setDisabled(prepareButton,true);
        setHtml(prepareButton,'ready','<i data-lucide="badge-check"></i> Suara neural aktif');
        setDisabled(testButton,false);
        if(hint&&/Model tersimpan|Aset suara offline|Mengaktifkan mesin neural/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline tersimpan. Mesin neural aktif dan siap dipakai.');
      }else if(backgroundReadyPromise){
        setDisabled(prepareButton,true);
        setHtml(prepareButton,'warming','<i data-lucide="loader-circle"></i> Mengaktifkan neural…');
        setDisabled(testButton,true);
        if(hint&&/Model tersimpan|Aset suara offline|Mengaktifkan mesin neural|Mengunduh aset suara|Menyiapkan mesin suara/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline sudah tersimpan. Mesin neural sedang diaktifkan di latar; latihan Listening tetap dapat langsung bersuara selama pemanasan.');
      }else{
        setDisabled(prepareButton,false);
        setHtml(prepareButton,'cached-cold','<i data-lucide="zap"></i> Aktifkan suara neural');
        setDisabled(testButton,true);
        if(hint&&/Model tersimpan|Mengunduh aset suara|Menyiapkan mesin suara|Aset suara offline/i.test(String(hint.textContent||'')))setText(hint,'Aset suara offline sudah tersimpan. Aktifkan mesin neural tanpa mengunduh ulang aset.');
      }
    }catch{}
  }

  function primeBackgroundReady(options={}){
    const automatic=options.automatic===true;
    const state=runtime.status?.()||{};
    if(!state.prepared||state.ready||typeof runtime.ensureReady!=='function')return Promise.resolve(state);
    if(backgroundReadyPromise)return backgroundReadyPromise;
    if(automatic&&automaticReadyAttempted)return Promise.resolve(state);
    if(automatic)automaticReadyAttempted=true;
    diag({patch:UX_PATCH,phase:'background_ready_start',prepared:true,automatic});
    backgroundReadyPromise=ensureReady().then(result=>{
      const after=runtime.status?.()||{};
      diag({patch:UX_PATCH,phase:'background_ready',prepared:!!after.prepared,ready:!!after.ready,automatic});
      return result;
    }).catch(error=>{
      const after=runtime.status?.()||{};
      diag({patch:UX_PATCH,phase:'background_ready_error',code:readinessErrorCode(error),prepared:!!after.prepared,ready:!!after.ready,automatic});
      throw error;
    }).finally(()=>{
      backgroundReadyPromise=null;
      syncPersistedReadyUi();
    });
    // A background warm must never become an unhandled rejection when ordinary
    // audio already completed through the bounded browser bridge.
    backgroundReadyPromise.catch(()=>{});
    return backgroundReadyPromise;
  }

  function installPersistedReadyUx(){
    const doc=root.document;
    if(!doc||typeof doc.addEventListener!=='function')return;
    const refresh=()=>{
      const state=runtime.status?.()||{};
      // One automatic attempt belongs to one continuous prepared+cold epoch. A
      // verified unprepared state or a successfully ready state closes that epoch.
      // A failure that remains prepared+cold deliberately keeps the latch set so
      // MutationObserver/Lucide DOM activity cannot re-arm hidden init attempts.
      if(!state.prepared||state.ready)automaticReadyAttempted=false;
      syncPersistedReadyUi();
      const prepareButton=typeof doc.getElementById==='function'?doc.getElementById('prepareNeuralVoice'):null;
      if(prepareButton&&state.prepared&&!state.ready&&!backgroundReadyPromise&&!automaticReadyAttempted){
        primeBackgroundReady({automatic:true}).catch(()=>{});
        syncPersistedReadyUi();
      }
    };
    doc.addEventListener('click',event=>{
      let button=null;
      try{button=event?.target?.closest?.('#prepareNeuralVoice')||null}catch{}
      if(!button)return;
      const state=runtime.status?.()||{};
      if(!state.prepared||state.ready)return;
      // Cached assets already exist. Do not allow the legacy app handler to send
      // this user back through the download/prepare ritual. An explicit click may
      // retry a failed automatic activation, but still never calls runtime.prepare().
      try{event.preventDefault?.();event.stopImmediatePropagation?.()}catch{}
      diag({patch:UX_PATCH,phase:'prepared_activation_click'});
      const warming=primeBackgroundReady({automatic:false});
      syncPersistedReadyUi();
      warming.catch(()=>{});
    },true);
    if(typeof root.MutationObserver==='function'){
      try{
        uxObserver=new root.MutationObserver(refresh);
        uxObserver.observe(doc.documentElement||doc.body,{childList:true,subtree:true});
      }catch{}
    }
    if(String(doc.readyState||'')==='loading')root.addEventListener?.('DOMContentLoaded',refresh,{once:true});
    else refresh();
  }

  async function speak(text,options={}){
    warmWebAudio();
    const state=runtime.status?.()||{};
    const neuralOnly=options.allowFallback===false;
    if(state.circuitOpen){
      diag({phase:'circuit_open',reason:String(state.lastFallbackReason||state.error||'previous_failure')});
      if(neuralOnly)return runtime.speak(text,{...options,allowFallback:false});
      return browserSpeakImmediate(text,options);
    }
    if(!state.ready){
      diag({phase:'audibility_first',prepared:!!state.prepared});
      if(state.prepared&&typeof runtime.ensureReady==='function'){
        // A user-requested utterance is explicit intent and may retry even when the
        // background automatic attempt for this prepared/cold epoch already failed.
        const warming=primeBackgroundReady({automatic:false});
        if(!neuralOnly){
          // m025-17+ UX: do not make the first Listening audio wait tens of seconds
          // for a cold in-memory Kokoro service after a reload. The cached model is
          // activated in parallel; the bridge is used only until neural is ready.
          diag({patch:UX_PATCH,phase:'cold_bridge_browser',prepared:true});
          return browserSpeakImmediate(text,options);
        }
        try{
          await warming;
          const warmed=runtime.status?.()||{};
          if(warmed.ready){
            try{return await runtime.speak(text,{...options,allowFallback:false})}
            catch(error){
              diag({phase:'neural_throw_fallback',error:String(error?.message||error)});
              if(neuralOnly)throw error;
              return browserSpeakImmediate(text,options);
            }
          }
        }catch(error){
          diag({phase:'neural_resume_error',error:String(error?.message||error)});
          if(neuralOnly)throw error;
        }
      }
      if(neuralOnly)return runtime.speak(text,{...options,allowFallback:false});
      return browserSpeakImmediate(text,options);
    }
    try{return await runtime.speak(text,{...options,allowFallback:false})}
    catch(error){
      diag({phase:'neural_throw_fallback',error:String(error?.message||error)});
      if(neuralOnly)throw error;
      return browserSpeakImmediate(text,options);
    }
  }

  function stop(){
    const state=runtime.status?.()||{};
    if(browserActive){
      try{root.speechSynthesis?.cancel?.()}catch{}
      browserActive=false;
      activeUtterance=null;
      try{root.__fiezelActiveUtterance=null}catch{}
    }
    if(state.ready){try{runtime.stop?.()}catch{}}
  }

  function status(){
    const base=runtime.status?.()||{};
    const wasmPolicy=String(root.__fiezelNeuralWasmPolicy||base.wasmPolicy||'default');
    return Object.freeze({...base,wasmPolicy,audibilityPatch:'v1',persistedReadyUxPatch:'m025-18'});
  }

  // Prevent the bootstrap's zero-volume speech warmup from occupying Safari's speech queue.
  root.__fiezelTtsUnlocked=true;
  root.FiezelVoiceRuntime=Object.freeze({...runtime,status,ensureReady,speak,stop,browserSpeakImmediate,__audibilityPatched:true});
  installPersistedReadyUx();
  diag({phase:'audibility_patch_loaded'});
})(typeof globalThis!=='undefined'?globalThis:this);