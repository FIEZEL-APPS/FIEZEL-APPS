(function(root){
  'use strict';

  const STATUS_SCHEMA='fiezel-neural-voice-status-v1';
  const STATUS_KEY='fiezel-neural-voice-v1';
  const rootUrl=new URL('../../',document.currentScript?.src||location.href);
  const absolute=path=>new URL(String(path).replace(/^\.\//,''),rootUrl).href;
  const version=String(root.FIEZEL_VERSION||'5.19.0');
  const cacheName=`fiezel-v${version}`;
  const LARGE_ASSET_STREAM_THRESHOLD=8*1024*1024;
  const STORAGE_RESERVE_BYTES=24*1024*1024;
  const DOWNLOAD_ATTEMPTS=2;
  const NEURAL_GENERATION_TIMEOUT_MS=Number(root.FIEZEL_GENERATION_TIMEOUT_MS)||Number(root.FIEZEL_TTS_TIMEOUT_MS)||(root.navigator?.standalone===true?30000:20000);
  const BROWSER_TTS_TIMEOUT_MS=Number(root.FIEZEL_BROWSER_TTS_TIMEOUT_MS)||12000;
  const INITIALIZE_TIMEOUT_MS=Number(root.FIEZEL_INIT_TIMEOUT_MS)||20000;
  const PREPARED_MARKER_KEY='fiezel-neural-voice-prepared-v1';
  const assets=Object.freeze([
    {path:'vendor/kokoro-js/kokoro.web.js',bytes:2135645},
    {path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.mjs',bytes:44484},
    {path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm',bytes:21596019},
    {path:'vendor/kokoro-model/config.json',bytes:45},
    {path:'vendor/kokoro-model/tokenizer.json',bytes:3498},
    {path:'vendor/kokoro-model/tokenizer_config.json',bytes:114},
    {path:'vendor/kokoro-model/onnx/model_quantized.onnx',bytes:92361116},
    {path:'vendor/kokoro-model/voices/af_heart.bin',bytes:522240},
    {path:'vendor/kokoro-model/voices/af_bella.bin',bytes:522240},
    {path:'vendor/kokoro-model/voices/af_nicole.bin',bytes:522240},
    {path:'vendor/kokoro-model/voices/am_michael.bin',bytes:522240},
    {path:'vendor/kokoro-model/voices/bf_emma.bin',bytes:522240},
    {path:'vendor/kokoro-model/voices/bm_george.bin',bytes:522240}
  ]);
  const totalBytes=assets.reduce((sum,item)=>sum+item.bytes,0);
  let phase='idle',lastError='',lastFallbackReason='',storage='',service=null,adapter=null,preparePromise=null,initializePromise=null,backendInitPromise=null,verifiedForSession=false,lastStorageEstimate=null,preparedFlag=readStatus().prepared,assetsCached=false,playerRef=null,speechActive=false,initFailedThisSession=false,initTimedOutThisSession=false,circuitOpen=false,audibleVerified=false,wasmPolicy='default';
  function diag(entry){try{const key='fiezel-neural-voice-diagnostics-v1';const list=JSON.parse(root.localStorage?.getItem(key)||'[]');list.push({t:Date.now(),v:version,...entry});root.localStorage?.setItem(key,JSON.stringify(list.slice(-200)))}catch{}}
  function warmAudioGesture(){
    try{
      if(!playerRef&&root.FiezelWebAudioPlayer)playerRef=root.FiezelWebAudioPlayer.createPlayer(root);
      playerRef?.warm?.();
    }catch{}
    try{
      if(root.speechSynthesis&&root.SpeechSynthesisUtterance&&!root.__fiezelTtsUnlocked){
        const warm=new root.SpeechSynthesisUtterance(' ');
        warm.volume=0;warm.rate=1;
        root.speechSynthesis.speak(warm);
        root.__fiezelTtsUnlocked=true;
      }
    }catch{}
  }

  function readStatus(){
    try{
      const value=JSON.parse(root.localStorage?.getItem(STATUS_KEY)||'null');
      if(value?.schema===STATUS_SCHEMA&&value.version===version&&value.prepared===true&&value.storage==='cache')return value;
    }catch{}
    return{schema:STATUS_SCHEMA,version,prepared:false,storage:'',preparedAt:0};
  }
  function writeStatus(prepared,storageMode){
    const value={schema:STATUS_SCHEMA,version,prepared:prepared===true,storage:prepared?String(storageMode||storage||'cache'):'',preparedAt:prepared?Date.now():0};
    try{root.localStorage?.setItem(STATUS_KEY,JSON.stringify(value))}catch{}
    return value;
  }
  function preparedStorage(){const stored=readStatus();return (stored.prepared||preparedFlag)?(storage||stored.storage||'cache'):''}
  async function refreshPreparedFlag(){
    if(readStatus().prepared){preparedFlag=true;return true}
    if(!('caches'in root)){preparedFlag=false;return false}
    try{
      const cache=await caches.open(cacheName);
      if(await cache.match(absolute(PREPARED_MARKER_KEY))){preparedFlag=true;return true}
    }catch{}
    preparedFlag=false;return false;
  }
  function status(){
    const stored=readStatus();
    return Object.freeze({schema:STATUS_SCHEMA,version,phase,prepared:stored.prepared||preparedFlag,assetsCached:stored.prepared||preparedFlag,initialized:!!service,ready:!!service&&!circuitOpen,audibleVerified,circuitOpen,error:lastError,storage:preparedStorage(),totalBytes,assetCount:assets.length,zeroPaidRuntime:true,crossOriginInference:false,crossOriginIsolated:!!root.crossOriginIsolated,speechSynthesis:!!(root.speechSynthesis&&root.SpeechSynthesisUtterance),storageEstimate:lastStorageEstimate,timeoutMs:NEURAL_GENERATION_TIMEOUT_MS,generationTimeoutMs:NEURAL_GENERATION_TIMEOUT_MS,initializeTimeoutMs:INITIALIZE_TIMEOUT_MS,lastFallbackReason,wasmPolicy});
  }
  function emit(progress,callback){
    const payload=Object.freeze({...progress,totalBytes,assetCount:assets.length,phase});
    if(typeof callback==='function')callback(payload);
    root.dispatchEvent?.(new CustomEvent('fiezel-neural-voice-progress',{detail:payload}));
  }
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function errorText(error){return String(error?.message||error?.name||error||'unknown error')}
  function requiredContentType(item){
    if(/\.(?:mjs|js)$/i.test(item.path))return'text/javascript; charset=utf-8';
    if(/\.wasm$/i.test(item.path))return'application/wasm';
    return'';
  }
  function cachedContentTypeIsValid(item,value){
    const mime=String(value||'').split(';',1)[0].trim().toLowerCase();
    if(!mime)return true;
    if(/\.(?:mjs|js)$/i.test(item.path))return['text/javascript','application/javascript','text/ecmascript','application/ecmascript'].includes(mime);
    if(/\.wasm$/i.test(item.path))return mime==='application/wasm';
    return true;
  }

  async function storageEstimate(requestPersistence=false){
    const manager=root.navigator?.storage;
    let persisted=null,usage=null,quota=null,available=null;
    if(manager){
      if(requestPersistence&&typeof manager.persist==='function'){
        try{await manager.persist()}catch{}
      }
      if(typeof manager.persisted==='function'){
        try{persisted=!!(await manager.persisted())}catch{}
      }
      if(typeof manager.estimate==='function'){
        try{
          const estimate=await manager.estimate();
          usage=Number.isFinite(Number(estimate?.usage))?Number(estimate.usage):null;
          quota=Number.isFinite(Number(estimate?.quota))?Number(estimate.quota):null;
          if(usage!==null&&quota!==null)available=Math.max(0,quota-usage);
        }catch{}
      }
    }
    lastStorageEstimate=Object.freeze({persisted,usage,quota,available});
    return lastStorageEstimate;
  }
  async function cachedAssetState(cache,item){
    const url=absolute(item.path);
    try{
      const response=await cache.match(url);
      if(!response)return{url,valid:false,length:0,contentType:''};
      const length=Number(response.headers?.get?.('content-length')||0);
      const contentType=String(response.headers?.get?.('content-type')||'');
      const isLarge=item.bytes>=LARGE_ASSET_STREAM_THRESHOLD;
      if(!cachedContentTypeIsValid(item,contentType))return{url,valid:false,length,contentType,reason:'mime'};
      if(!isLarge&&length&&length!==item.bytes)return{url,valid:false,length,contentType,reason:'size'};
      return{url,valid:true,length,contentType};
    }catch{return{url,valid:false,length:0,contentType:''}}
  }
  async function storagePreflight(cache){
    const states=[];
    for(const item of assets)states.push(await cachedAssetState(cache,item));
    const missingBytes=assets.reduce((sum,item,index)=>sum+(states[index].valid?0:item.bytes),0);
    const estimate=await storageEstimate(true);
    const reserve=Math.min(STORAGE_RESERVE_BYTES,Math.ceil(missingBytes*.20));
    if(estimate.available!==null&&estimate.available<missingBytes+reserve){
      const needMb=Math.ceil((missingBytes+reserve)/1000000),availableMb=Math.floor(estimate.available/1000000);
      const error=new Error(`Penyimpanan tidak cukup untuk suara offline. Butuh sekitar ${needMb} MB ruang origin, tersedia sekitar ${availableMb} MB.`);
      error.code='storage_insufficient';throw error;
    }
    return{states,missingBytes,estimate};
  }
  async function verifyCachedAssets(){
    if(!('caches'in root))return false;
    let cache;
    try{cache=await caches.open(cacheName)}catch{return false}
    for(const item of assets){
      const state=await cachedAssetState(cache,item);
      if(!state.valid)return false;
    }
    return true;
  }
  async function putFetchedAsset(cache,item,url,fetched){
    const contentType=requiredContentType(item)||fetched.headers?.get?.('content-type')||'application/octet-stream';
    if(item.bytes>=LARGE_ASSET_STREAM_THRESHOLD){
      await cache.put(url,new Response(fetched.body,{status:fetched.status||200,statusText:fetched.statusText||'',headers:{'Content-Type':contentType}}));
    }else{
      const buffer=await fetched.arrayBuffer();
      if(buffer.byteLength!==item.bytes)throw new Error(`Voice asset size mismatch: ${item.path}`);
      await cache.put(url,new Response(buffer,{headers:{'Content-Type':contentType,'Content-Length':String(buffer.byteLength)}}));
    }
    const stored=await cachedAssetState(cache,item);
    if(!stored.valid)throw new Error(`Offline voice cache verification failed: ${item.path}${stored.reason==='mime'?' (MIME)':''}`);
  }
  async function downloadAsset(cache,item){
    const url=absolute(item.path);
    let last=null;
    for(let attempt=1;attempt<=DOWNLOAD_ATTEMPTS;attempt++){
      try{
        const fetched=await fetch(url,{cache:'no-store',credentials:'same-origin'});
        if(!fetched.ok)throw new Error(`Voice asset failed: ${item.path} (${fetched.status})`);
        await putFetchedAsset(cache,item,url,fetched);
        return;
      }catch(error){
        last=error;
        try{await cache.delete(url)}catch{}
        if(attempt<DOWNLOAD_ATTEMPTS)await delay(250*attempt);
      }
    }
    const detail=errorText(last);
    const error=new Error(`Offline voice storage failed: ${item.path} · ${detail}`);
    error.code=last?.name==='QuotaExceededError'?'storage_quota':'asset_store_failed';
    throw error;
  }
  async function warmAssets(onProgress){
    if(!root.isSecureContext&&!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(location.href))throw new Error('Secure context required for offline voice assets');
    if(!('caches'in root))throw new Error('Cache Storage is unavailable');
    const cache=await caches.open(cacheName);
    const preflight=await storagePreflight(cache);
    let completedBytes=0,completed=0;
    phase='downloading';lastError='';storage='';emit({completed,completedBytes,current:'',storageEstimate:preflight.estimate},onProgress);
    for(const item of assets){
      let state=await cachedAssetState(cache,item);
      if(!state.valid){
        try{await cache.delete(state.url)}catch{}
        await downloadAsset(cache,item);
        state=await cachedAssetState(cache,item);
      }
      if(!state.valid)throw new Error(`Offline voice cache verification failed: ${item.path}`);
      completed++;completedBytes+=item.bytes;emit({completed,completedBytes,current:item.path,storageEstimate:lastStorageEstimate},onProgress);
    }
    storage='cache';
    if(!(await verifyCachedAssets()))throw new Error('Offline voice cache verification failed');
    writeStatus(true,'cache');preparedFlag=true;assetsCached=true;verifiedForSession=true;phase='cached';
    try{await cache.put(absolute(PREPARED_MARKER_KEY),new Response('1',{headers:{'Content-Type':'text/plain'}}))}catch{}
    emit({completed,completedBytes,current:'',storageEstimate:lastStorageEstimate},onProgress);return status();
  }
  function startBackendInitialize(){
    if(service)return Promise.resolve(service);
    if(backendInitPromise)return backendInitPromise;
    backendInitPromise=(async()=>{
      if(!root.FiezelNeuralVoiceConfig||!root.FiezelKokoroAdapter||!root.FiezelNeuralVoice||!root.FiezelWebAudioPlayer)throw new Error('Neural voice runtime modules are missing');
      phase='initializing';lastError='';
      const initStartedAt=Date.now();
      diag({phase:'init_start'});
      const dynamicImport=typeof root.__fiezelDynamicImport==='function'?root.__fiezelDynamicImport:(url)=>import(url);
      const kokoro=await dynamicImport(absolute('vendor/kokoro-js/kokoro.web.js'));
      try{
        const wasmEnv=kokoro.env?.backends?.onnx?.wasm;
        const appleStandalone=root.navigator?.standalone===true;
        if(wasmEnv&&typeof wasmEnv==='object'){
          if(appleStandalone||root.crossOriginIsolated!==true)wasmEnv.numThreads=1;
          if(appleStandalone)wasmEnv.proxy=true;
          wasmPolicy=appleStandalone?'apple-standalone-single-thread-proxy':(root.crossOriginIsolated===true?'auto-threaded':'single-thread');
          diag({phase:'wasm_policy',policy:wasmPolicy,numThreads:Number(wasmEnv.numThreads||0),proxy:!!wasmEnv.proxy});
        }
      }catch{}
      adapter=root.FiezelKokoroAdapter.createKokoroAdapter({
        KokoroTTS:kokoro.KokoroTTS,
        kokoroEnv:kokoro.env,
        setVoiceDataUrl:kokoro.setVoiceDataUrl,
        modelId:root.FiezelNeuralVoiceConfig.modelId,
        localModelPath:'./vendor/',
        voiceBaseUrl:'./vendor/kokoro-model/voices',
        wasmBasePath:absolute('vendor/kokoro-js/wasm/'),
        runtimeOrigin:new URL(rootUrl).origin,
        dtype:root.FiezelNeuralVoiceConfig.dtype,
        device:root.FiezelNeuralVoiceConfig.device
      });
      await adapter.initialize();
      const player=root.FiezelWebAudioPlayer.createPlayer(root);
      service=root.FiezelNeuralVoice.createVoiceService({config:root.FiezelNeuralVoiceConfig,adapter,env:root,playAudio:player.play,generationTimeoutMs:NEURAL_GENERATION_TIMEOUT_MS});
      phase='ready';lastError='';initFailedThisSession=false;initTimedOutThisSession=false;diag({phase:'init_ready',elapsedMs:Date.now()-initStartedAt});return service;
    })().catch(error=>{phase='error';lastError=errorText(error);service=null;adapter=null;initFailedThisSession=true;initTimedOutThisSession=false;diag({phase:'init_error',error:lastError});throw error}).finally(()=>{backendInitPromise=null});
    return backendInitPromise;
  }
  async function initialize(){
    if(service)return service;
    if(initializePromise)return initializePromise;
    initializePromise=(async()=>{
      const timedOut=Symbol('fiezel-init-timeout');
      let backendError=null;
      const observed=startBackendInitialize().catch(error=>{backendError=error;return null});
      const result=await Promise.race([observed,delay(INITIALIZE_TIMEOUT_MS).then(()=>timedOut)]);
      if(result===timedOut){
        initTimedOutThisSession=true;
        lastError=`Neural voice init timed out after ${Math.max(1,Math.round(INITIALIZE_TIMEOUT_MS/1000))}s`;
        diag({phase:'init_timeout',error:lastError});
        throw new Error(lastError);
      }
      if(result===null)throw backendError;
      return result;
    })().finally(()=>{initializePromise=null});
    return initializePromise;
  }
  async function prepare(options={}){
    if(preparePromise)return preparePromise;
    initFailedThisSession=false;initTimedOutThisSession=false;circuitOpen=false;lastFallbackReason='';lastError='';warmAudioGesture();
    preparePromise=(async()=>{await warmAssets(options.onProgress);await initialize();diag({phase:'prepared'});return status()})().catch(error=>{if(!(backendInitPromise&&initTimedOutThisSession))phase='error';lastError=errorText(error);diag({phase:'prepare_error',error:lastError});if(!assetsCached){storage='';preparedFlag=false;writeStatus(false)}throw error}).finally(()=>{preparePromise=null});
    return preparePromise;
  }
  function browserSpeak(text,options={}){
    if(!root.speechSynthesis||!root.SpeechSynthesisUtterance){diag({phase:'tts_unavailable'});return Promise.reject(new Error('Browser TTS unavailable'))}
    return new Promise((resolve,reject)=>{
      let done=false,started=false,timer=null;
      const settle=(ok,value)=>{if(done)return;done=true;if(timer)clearTimeout(timer);speechActive=false;ok?resolve(value):reject(value)};
      const utterance=new root.SpeechSynthesisUtterance(String(text||''));
      utterance.lang=options.lang||'en-US';utterance.rate=Number(options.speed||options.rate||.88);
      utterance.onstart=()=>{started=true};
      utterance.onend=()=>settle(true,{provider:'browser-speech-synthesis',started:true});
      utterance.onerror=event=>settle(false,new Error(`browser_tts_${String(event?.error||'error')}`));
      if(speechActive){try{root.speechSynthesis.cancel()}catch{}}
      speechActive=true;
      timer=setTimeout(()=>settle(false,new Error(started?'browser_tts_timeout':'browser_tts_not_started')),BROWSER_TTS_TIMEOUT_MS);
      try{root.speechSynthesis.speak(utterance)}catch(error){settle(false,error)}
    });
  }
  async function ensureReady(){
    warmAudioGesture();
    if(circuitOpen)throw new Error(`neural_circuit_open:${lastFallbackReason||lastError||'previous_failure'}`);
    if(service)return status();
    if(initTimedOutThisSession&&backendInitPromise)throw new Error('Neural voice initialization is still running');
    initFailedThisSession=false;
    if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared');
    if(!verifiedForSession){
      if(!(await verifyCachedAssets())){writeStatus(false);preparedFlag=false;phase='idle';throw new Error('Offline voice cache verification failed')}
      verifiedForSession=true;
    }
    await initialize();
    return status();
  }
  async function speak(text,options={}){
    warmAudioGesture();
    const allowFallback=options.allowFallback!==false;
    const fallbackOrThrow=async(error)=>{
      if(!allowFallback)throw error;
      return browserSpeak(text,options);
    };
    if(!readStatus().prepared&&!preparedFlag&&allowFallback)return browserSpeak(text,options);
    if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared');
    if(circuitOpen)return fallbackOrThrow(new Error(`neural_circuit_open:${lastFallbackReason||lastError||'previous_failure'}`));
    if(initFailedThisSession||(initTimedOutThisSession&&backendInitPromise))return fallbackOrThrow(new Error(lastError||'Neural voice initialization is still running'));
    if(!verifiedForSession){
      if(!(await verifyCachedAssets())){writeStatus(false);preparedFlag=false;phase='idle';return fallbackOrThrow(new Error('Offline voice cache verification failed'))}
      verifiedForSession=true;
    }
    let local;
    const speakInitStartedAt=Date.now();
    try{
      local=await initialize();
      diag({phase:'speak_init_ready',elapsedMs:Date.now()-speakInitStartedAt});
    }catch(error){
      lastError=errorText(error);lastFallbackReason=lastError;audibleVerified=false;
      diag({phase:'speak_init_error',error:lastError,elapsedMs:Date.now()-speakInitStartedAt});
      return fallbackOrThrow(error);
    }
    const voice=options.voice||root.FiezelNeuralVoiceConfig.voices.fiezelPrimary;
    const neuralStartedAt=Date.now();
    diag({phase:'speak_neural_start',voice:String(voice),generationTimeoutMs:NEURAL_GENERATION_TIMEOUT_MS});
    let result;
    try{
      result=await local.speak(text,{voice,speed:options.speed||options.rate||1,lang:options.lang||'en-US',allowFallback:false});
    }catch(error){
      lastError=errorText(error);lastFallbackReason=lastError;
      const generationBusy=lastError==='neural_generation_busy';
      const shouldOpenCircuit=!!service&&!generationBusy;
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:shouldOpenCircuit,elapsedMs:Date.now()-neuralStartedAt,voice:String(voice)});
      circuitOpen=shouldOpenCircuit;audibleVerified=false;if(circuitOpen)phase='error';else if(service)phase='ready';
      try{service?.stop?.()}catch{}
      return fallbackOrThrow(error);
    }
    circuitOpen=false;audibleVerified=true;lastError='';lastFallbackReason='';phase='ready';
    diag({phase:'speak_neural_success',provider:String(result?.provider||'neural'),voice:String(result?.voice||voice||''),requestId:String(result?.requestId||''),elapsedMs:Date.now()-neuralStartedAt});
    return result;
  }
  function stop(){try{service?.stop?.()}catch{}try{root.speechSynthesis?.cancel?.()}catch{}}
  // T-023 lifecycle: bebaskan sesi neural + WebAudio saat tab tidak terlihat agar
  // tab tidak dipaksa mati oleh browser (WASM 92MB+21MB + AudioContext tetap hidup
  // saat hidden). ADDITIVE — kontrak publik tidak berubah; init ulang on-demand
  // terjadi otomatis lewat speak()/ensureReady() berikutnya.
  function release(){
    try{service?.stop?.()}catch{}
    try{root.speechSynthesis?.cancel?.()}catch{}
    speechActive=false;
    try{root.FiezelWebAudioPlayer?.createPlayer?.(root)?.close?.()}catch{}
    playerRef=null;service=null;adapter=null;
    phase='idle';lastError='';audibleVerified=false;
    diag({phase:'released'});
    return status();
  }

  diag({phase:'bootstrap_loaded',crossOriginIsolated:!!root.crossOriginIsolated,speechSynthesis:!!(root.speechSynthesis&&root.SpeechSynthesisUtterance),cacheAvailable:('caches'in root)});
  if(typeof Promise!=='undefined'&&root.caches)refreshPreparedFlag().then(prepared=>{
    if(prepared){phase='cached';diag({phase:'prepared_idle'});}
  }).catch(()=>{});
  root.FiezelVoiceRuntime=Object.freeze({schema:STATUS_SCHEMA,status,prepare,ensureReady,speak,stop,release,verifyCachedAssets,refreshPreparedFlag,storageEstimate:()=>storageEstimate(false),diagnostics:()=>{try{return JSON.parse(root.localStorage?.getItem('fiezel-neural-voice-diagnostics-v1')||'[]')}catch{return[]}},assets:()=>assets.map(item=>({...item})),totalBytes,assetCount:assets.length});
})(typeof globalThis!=='undefined'?globalThis:this);