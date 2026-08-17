'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const patch=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');
const adapterSource=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-kokoro-adapter.js'),'utf8');

function makeContext({ready=false,prepared=true,errorMode=false,ensureDelayMs=0,ensureError=false,invalidatePrepared=false,withUi=false}={}){
  const events=[];
  let ensureReadyCalls=0,prepareCalls=0,originalSpeakCalls=0,originalStopCalls=0,cancelCalls=0;
  const runtime={
    status:()=>({ready,prepared}),
    prepare:async()=>{prepareCalls++;events.push('prepare');return{ready,prepared}},
    ensureReady:async()=>{
      ensureReadyCalls++;
      events.push('ensure-ready-start');
      if(ensureDelayMs)await new Promise(resolve=>setTimeout(resolve,ensureDelayMs));
      if(ensureError){
        if(invalidatePrepared)prepared=false;
        events.push('ensure-error');
        throw new Error('Offline voice cache verification failed');
      }
      ready=true;
      events.push('ensure-ready');
      return{ready:true,prepared};
    },
    speak:async()=>{originalSpeakCalls++;events.push('original-speak');return{provider:'neural'}},
    stop:()=>{originalStopCalls++;events.push('original-stop')}
  };
  const speechSynthesis={
    paused:false,speaking:false,pending:false,
    getVoices:()=>[{lang:'en-US',name:'English'}],
    resume:()=>events.push('resume'),
    cancel:()=>{cancelCalls++;events.push('cancel')},
    speak:u=>{
      events.push('browser-speak');
      if(errorMode)setTimeout(()=>u.onerror?.({error:'synthesis-failed'}),0);
      else setTimeout(()=>{u.onstart?.();events.push('browser-start');setTimeout(()=>{u.onend?.();events.push('browser-end')},0)},0);
    }
  };
  const localStorageData={};
  const documentEvents={};
  const mutationCallbacks=[];
  const ui=withUi?{
    prepareButton:{id:'prepareNeuralVoice',disabled:false,innerHTML:'Siapkan suara offline',dataset:{}},
    testButton:{id:'testNeuralVoice',disabled:false,innerHTML:'Tes suara',dataset:{}},
    hint:{id:'neuralVoiceProgress',textContent:'Model tersimpan lokal. Siapkan suara offline.',dataset:{}}
  }:null;
  const document=withUi?{
    readyState:'complete',documentElement:{},body:{},
    getElementById:id=>id==='prepareNeuralVoice'?ui.prepareButton:id==='testNeuralVoice'?ui.testButton:id==='neuralVoiceProgress'?ui.hint:null,
    addEventListener:(name,fn,capture)=>{(documentEvents[name]||(documentEvents[name]=[])).push({fn,capture:!!capture})}
  }:undefined;
  const ctx={
    console,setTimeout,clearTimeout,Date,Promise,
    FIEZEL_VERSION:'5.19.0',FiezelVoiceRuntime:runtime,
    FiezelWebAudioPlayer:{createPlayer:()=>({warm:()=>{events.push('warm');return true}})},
    speechSynthesis,
    SpeechSynthesisUtterance:function(text){this.text=text},
    localStorage:{getItem:k=>localStorageData[k]??null,setItem:(k,v)=>{localStorageData[k]=String(v)}}
  };
  if(document){
    ctx.document=document;
    ctx.MutationObserver=function(callback){this.observe=()=>mutationCallbacks.push(callback)};
  }
  vm.createContext(ctx);vm.runInContext(patch,ctx,{filename:'audibility-fix.js'});
  return{
    ctx,events,ui,documentEvents,mutationCallbacks,
    get ensureReadyCalls(){return ensureReadyCalls},
    get prepareCalls(){return prepareCalls},
    get originalSpeakCalls(){return originalSpeakCalls},
    get originalStopCalls(){return originalStopCalls},
    get cancelCalls(){return cancelCalls}
  };
}

async function adapterProxyObservation({standalone=false,displayModeStandalone=false}={}){
  const stages=[];
  const ctx={console,URL,Promise,Date,setTimeout,clearTimeout};
  ctx.navigator={standalone:!!standalone};
  ctx.matchMedia=query=>({matches:query==='(display-mode: standalone)'&&!!displayModeStandalone});
  ctx.crossOriginIsolated=false;
  vm.createContext(ctx);
  vm.runInContext(adapterSource,ctx,{filename:'fiezel-kokoro-adapter.js'});
  const wasm={numThreads:1,proxy:false};
  const env={
    allowRemoteModels:true,
    allowLocalModels:true,
    localModelPath:'',
    wasmPaths:'',
    wasmEnv:wasm
  };
  let proxyAtSessionCreation=null;
  const KokoroTTS={
    from_pretrained:async()=>{
      proxyAtSessionCreation=wasm.proxy;
      return{
        tokenizer:()=>({input_ids:{dims:[1,1]}}),
        model:()=>Promise.resolve({}),
        generate:async()=>({audio:new Float32Array(1)}),
        voices:{af_heart:{}}
      };
    }
  };
  const adapter=ctx.FiezelKokoroAdapter.createKokoroAdapter({
    KokoroTTS,kokoroEnv:env,setVoiceDataUrl:()=>{},
    modelId:'kokoro-model',localModelPath:'./vendor/',voiceBaseUrl:'./vendor/kokoro-model/voices',
    wasmBasePath:'./vendor/kokoro-js/wasm/',dtype:'q8',device:'wasm',runtime:ctx,onStage:entry=>stages.push(entry)
  });
  await adapter.initialize();
  return{proxyAtSessionCreation,wasm,stages};
}

(async()=>{
  // Physical m025-17 evidence shows model latency and event-loop watchdog delay are
  // effectively the same 10-16 s interval. Apple standalone must therefore use the
  // shipped ORT proxy worker before the session is created; chunking alone is not a
  // responsiveness boundary. Keep single-thread WASM because the document is not
  // crossOriginIsolated, but move that one thread off the UI thread.
  {
    const apple=await adapterProxyObservation({standalone:true});
    assert.equal(apple.proxyAtSessionCreation,true,'Apple standalone ORT proxy must be enabled before Kokoro session creation');
    assert.equal(apple.wasm.proxy,true,'Apple standalone must retain proxy-worker execution after adapter initialization');
    assert.equal(apple.wasm.numThreads,1,'Apple standalone remains single-threaded inside the worker');
    assert.ok(apple.stages.some(entry=>entry.phase==='wasm_policy'&&entry.proxy===true),'diagnostics must report the effective proxy-worker policy');

    const displayMode=await adapterProxyObservation({displayModeStandalone:true});
    assert.equal(displayMode.proxyAtSessionCreation,true,'display-mode standalone must receive the same worker isolation when navigator.standalone is unavailable');

    const web=await adapterProxyObservation();
    assert.equal(web.proxyAtSessionCreation,false,'non-standalone runtime must preserve direct/default ORT execution');
    assert.equal(web.wasm.proxy,false,'non-standalone proxy policy must not change');
  }

  // P0 #48 UX contract: an already-downloaded but cold runtime must not hold the
  // first ordinary Listening utterance behind model initialization. Neural warms
  // in parallel; browser speech is a bounded audible bridge for that cold start.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:40});
    assert.equal(t.ctx.__fiezelTtsUnlocked,true,'silent bootstrap warmup must be disabled');
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US'});
    assert.equal(result.provider,'browser-speech-synthesis','prepared cold launch must bridge immediately instead of blocking first audio on neural init');
    assert.equal(t.ensureReadyCalls,1,'prepared cold launch must start one background neural readiness attempt');
    assert.equal(t.originalSpeakCalls,0,'cold bridge must not double-play neural while browser audio is used');
    assert.ok(t.events.includes('browser-speak'),'cold bridge must enqueue browser audio');
    await new Promise(resolve=>setTimeout(resolve,55));
    assert.ok(t.events.includes('ensure-ready'),'background neural readiness must continue after bridge audio starts');
  }

  // Diagnostics/Tes suara remain strict neural-only: no bridge is allowed when
  // allowFallback=false, and the call waits for readiness before neural speech.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:10});
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US',allowFallback:false});
    assert.equal(result.provider,'neural','neural-only path must remain neural');
    assert.equal(t.ensureReadyCalls,1,'neural-only cold path must ensure readiness');
    assert.equal(t.originalSpeakCalls,1,'neural-only cold path must speak after readiness');
    assert.ok(!t.events.includes('browser-speak'),'neural-only path must never use the browser bridge');
    assert.ok(t.events.indexOf('ensure-ready')<t.events.indexOf('original-speak'),'runtime must become ready before strict neural speech');
  }

  {
    const t=makeContext({ready:true,prepared:true});
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello');
    assert.equal(result.provider,'neural');
    assert.equal(t.originalSpeakCalls,1,'ready neural service should remain primary');
    assert.equal(t.ensureReadyCalls,0,'ready neural service must not reinitialize');
    assert.ok(!t.events.includes('browser-speak'),'ready neural service must not double-play browser TTS');
  }

  {
    const t=makeContext({ready:false,prepared:false,errorMode:true});
    await assert.rejects(()=>t.ctx.FiezelVoiceRuntime.speak('hello'),/browser_tts_synthesis-failed/);
    assert.equal(t.ensureReadyCalls,0,'unprepared neural engine must not start neural initialization');
  }

  {
    const t=makeContext({ready:false,prepared:false});
    t.ctx.FiezelVoiceRuntime.stop();
    assert.equal(t.originalStopCalls,0,'cold stop must not gratuitously cancel neural/browser pipelines');
    assert.equal(t.cancelCalls,0,'cold idle stop must not call speechSynthesis.cancel');
  }

  // Execute the persisted Skills Lab UI path, not merely source-string checks.
  // A cached reload must identify the assets as already stored, auto-start exactly
  // one background activation, and never re-enter runtime.prepare/download.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:40,withUi:true});
    assert.doesNotMatch(t.ui.prepareButton.innerHTML,/Siapkan suara offline/,'cached reload must never render offline download as the required action');
    assert.match(t.ui.prepareButton.innerHTML,/Mengaktifkan neural/,'cached Skills Lab mount should visibly warm the already-downloaded engine');
    assert.equal(t.ui.prepareButton.disabled,true,'activation control is disabled while the coalesced warm is in flight');
    assert.equal(t.ui.testButton.disabled,true,'strict neural test stays disabled while the cold service warms');
    assert.match(t.ui.hint.textContent,/sudah tersimpan/i,'cached reload copy must explicitly recognize persisted offline assets');
    assert.equal(t.ensureReadyCalls,1,'mounting cached Skills Lab controls should start one background readiness attempt');
    assert.equal(t.prepareCalls,0,'cached mount must never invoke runtime.prepare or redownload assets');

    // Repeated DOM mutation notifications must remain idempotent: no second warm,
    // no download call, and no return to the misleading offline-prepare label.
    for(const callback of t.mutationCallbacks)for(let i=0;i<5;i++)callback([]);
    assert.equal(t.ensureReadyCalls,1,'repeated Skills Lab mutations must coalesce on one readiness flight');
    assert.equal(t.prepareCalls,0,'observer refresh must never call runtime.prepare');
    assert.doesNotMatch(t.ui.prepareButton.innerHTML,/Siapkan suara offline/);

    let prevented=false,stopped=false;
    const event={
      target:{closest:selector=>selector==='#prepareNeuralVoice'?t.ui.prepareButton:null},
      preventDefault:()=>{prevented=true},
      stopImmediatePropagation:()=>{stopped=true}
    };
    for(const entry of t.documentEvents.click||[])entry.fn(event);
    assert.equal(prevented,true,'cached activation capture path must prevent legacy handling');
    assert.equal(stopped,true,'cached activation capture path must stop the legacy prepare/download target handler');
    assert.equal(t.ensureReadyCalls,1,'cached activation path must coalesce with existing background readiness');
    assert.equal(t.prepareCalls,0,'cached activation path must not call runtime.prepare or fetch assets again');

    await new Promise(resolve=>setTimeout(resolve,55));
    assert.match(t.ui.prepareButton.innerHTML,/Suara neural aktif/,'UI must transition to ready after background activation');
    assert.equal(t.ui.prepareButton.disabled,true,'ready state must not offer another prepare action');
    assert.equal(t.ui.testButton.disabled,false,'strict neural test becomes available only after readiness');
    assert.equal(t.prepareCalls,0,'the entire cached activation path must remain download-free');
  }

  // Source-proven m025-17 blocker: when automatic activation fails but the cache is
  // still valid, observer-driven DOM refresh must become quiescent. It must not
  // silently launch another ~20 s initialize attempt. A deliberate button click is
  // allowed to retry once because that is explicit user intent.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:5,ensureError:true,invalidatePrepared:false,withUi:true});
    assert.equal(t.ensureReadyCalls,1,'cached mount starts one automatic activation attempt');
    await new Promise(resolve=>setTimeout(resolve,15));
    assert.ok(t.events.includes('ensure-error'),'automatic activation failure must be observed');
    for(const callback of t.mutationCallbacks)for(let i=0;i<5;i++)callback([]);
    await new Promise(resolve=>setTimeout(resolve,2));
    assert.equal(t.ensureReadyCalls,1,'failed automatic activation must not re-arm through MutationObserver refresh');
    assert.equal(t.prepareCalls,0,'quiescent failure path must remain download-free');

    let prevented=false,stopped=false;
    const event={
      target:{closest:selector=>selector==='#prepareNeuralVoice'?t.ui.prepareButton:null},
      preventDefault:()=>{prevented=true},
      stopImmediatePropagation:()=>{stopped=true}
    };
    for(const entry of t.documentEvents.click||[])entry.fn(event);
    assert.equal(prevented,true);
    assert.equal(stopped,true);
    assert.equal(t.ensureReadyCalls,2,'explicit cached activation click may retry after automatic failure');
    assert.equal(t.prepareCalls,0,'manual cached retry must still avoid runtime.prepare/redownload');
    await new Promise(resolve=>setTimeout(resolve,10));
  }

  // Source-proven m025-17 blocker: Lucide hydrates <i data-lucide> into <svg>.
  // MutationObserver refresh must recognize the semantic render state and leave the
  // hydrated SVG intact instead of rewriting raw innerHTML back to <i> forever.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:40,withUi:true});
    assert.equal(t.ui.prepareButton.dataset.fiezelNeuralUxKey,'warming','render state must be tracked independently from Lucide child markup');
    const hydrated='<svg data-lucide="loader-circle"></svg> Mengaktifkan neural…';
    t.ui.prepareButton.innerHTML=hydrated;
    for(const callback of t.mutationCallbacks)callback([]);
    assert.equal(t.ui.prepareButton.innerHTML,hydrated,'observer refresh must preserve Lucide-hydrated markup for the same semantic state');
    await new Promise(resolve=>setTimeout(resolve,45));
  }

  // A persisted marker is not permission to lie. If cache verification invalidates
  // prepared state, the compatibility UI must fall back to the genuine one-time
  // download path rather than leaving an "activate cached" label behind.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:10,ensureError:true,invalidatePrepared:true,withUi:true});
    assert.equal(t.ensureReadyCalls,1,'stale prepared marker must be verified once');
    await new Promise(resolve=>setTimeout(resolve,25));
    assert.ok(t.events.includes('ensure-error'),'verification failure must be observed');
    assert.match(t.ui.prepareButton.innerHTML,/Siapkan suara offline/,'invalid cache must restore the true preparation action');
    assert.equal(t.ui.prepareButton.disabled,false,'invalid cache must allow the real repair action');
    assert.equal(t.ui.testButton.disabled,true,'strict neural test must stay disabled when cache is invalid');
    assert.match(t.ui.hint.textContent,/belum lengkap/i,'invalid cache copy must explain that offline assets require repair');
    assert.equal(t.prepareCalls,0,'verification itself must not silently trigger a redownload');
  }

  assert.ok(patch.includes('background_ready'),'background readiness must be explicitly diagnosed');
  assert.ok(patch.includes('fiezelNeuralUxKey'),'UI sync must use semantic render keys so Lucide hydration is mutation-safe');
  assert.ok(patch.includes('automaticReadyAttempted'),'persisted-ready auto activation must remember a failed attempt until the prepared/cold epoch changes');

  console.log('FIEZEL neural voice audibility + m025-18 worker/quiescence regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});