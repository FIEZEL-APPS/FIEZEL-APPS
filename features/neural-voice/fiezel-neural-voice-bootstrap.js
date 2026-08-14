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
  let phase='idle',lastError='',storage='',service=null,adapter=null,preparePromise=null,initializePromise=null,verifiedForSession=false,lastStorageEstimate=null;

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
  function preparedStorage(){return phase==='cached'||phase==='ready'?(storage||readStatus().storage):''}
  function status(){
    const stored=readStatus();
    return Object.freeze({schema:STATUS_SCHEMA,version,phase,prepared:stored.prepared,ready:!!service,error:lastError,storage:preparedStorage(),totalBytes,assetCount:assets.length,zeroPaidRuntime:true,crossOriginInference:false,storageEstimate:lastStorageEstimate});
  }
  function emit(progress,callback){
    const payload=Object.freeze({...progress,totalBytes,assetCount:assets.length,phase});
    if(typeof callback==='function')callback(payload);
    root.dispatchEvent?.(new CustomEvent('fiezel-neural-voice-progress',{detail:payload}));
  }
  function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function errorText(error){return String(error?.message||error?.name||error||'unknown error')}

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
      if(!response)return{url,valid:false,length:0};
      const length=Number(response.headers?.get?.('content-length')||0);
      if(length&&length!==item.bytes)return{url,valid:false,length};
      return{url,valid:true,length};
    }catch{return{url,valid:false,length:0}}
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
    const length=Number(fetched.headers?.get?.('content-length')||0);
    if(length&&length!==item.bytes)throw new Error(`Voice asset size mismatch: ${item.path}`);
    if(item.bytes>=LARGE_ASSET_STREAM_THRESHOLD){
      await cache.put(url,fetched);
    }else{
      const buffer=await fetched.arrayBuffer();
      if(buffer.byteLength!==item.bytes)throw new Error(`Voice asset size mismatch: ${item.path}`);
      await cache.put(url,new Response(buffer,{headers:{'Content-Type':fetched.headers?.get?.('content-type')||'application/octet-stream','Content-Length':String(buffer.byteLength)}}));
    }
    const stored=await cachedAssetState(cache,item);
    if(!stored.valid)throw new Error(`Offline voice cache verification failed: ${item.path}`);
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
    writeStatus(true,'cache');verifiedForSession=true;phase='cached';emit({completed,completedBytes,current:'',storageEstimate:lastStorageEstimate},onProgress);return status();
  }
  async function initialize(){
    if(service)return service;
    if(initializePromise)return initializePromise;
    initializePromise=(async()=>{
      if(!root.FiezelNeuralVoiceConfig||!root.FiezelKokoroAdapter||!root.FiezelNeuralVoice||!root.FiezelWebAudioPlayer)throw new Error('Neural voice runtime modules are missing');
      phase='initializing';lastError='';
      const dynamicImport=typeof root.__fiezelDynamicImport==='function'?root.__fiezelDynamicImport:(url)=>import(url);
      const kokoro=await dynamicImport(absolute('vendor/kokoro-js/kokoro.web.js'));
      adapter=root.FiezelKokoroAdapter.createKokoroAdapter({
        KokoroTTS:kokoro.KokoroTTS,
        kokoroEnv:kokoro.env,
        setVoiceDataUrl:kokoro.setVoiceDataUrl,
        modelId:root.FiezelNeuralVoiceConfig.modelId,
        localModelPath:'./vendor/',
        voiceBaseUrl:'./vendor/kokoro-model/voices',
        wasmBasePath:'./vendor/kokoro-js/wasm/',
        dtype:root.FiezelNeuralVoiceConfig.dtype,
        device:root.FiezelNeuralVoiceConfig.device
      });
      await adapter.initialize();
      const player=root.FiezelWebAudioPlayer.createPlayer(root);
      service=root.FiezelNeuralVoice.createVoiceService({config:root.FiezelNeuralVoiceConfig,adapter,env:root,playAudio:player.play});
      phase='ready';return service;
    })().catch(error=>{phase='error';lastError=errorText(error);initializePromise=null;service=null;throw error});
    return initializePromise;
  }
  async function prepare(options={}){
    if(preparePromise)return preparePromise;
    preparePromise=(async()=>{await warmAssets(options.onProgress);await initialize();return status()})().catch(error=>{phase='error';lastError=errorText(error);storage='';writeStatus(false);throw error}).finally(()=>{preparePromise=null});
    return preparePromise;
  }
  function browserSpeak(text,options={}){
    if(!root.speechSynthesis||!root.SpeechSynthesisUtterance)return Promise.reject(new Error('Browser TTS unavailable'));
    root.speechSynthesis.cancel();
    return new Promise((resolve,reject)=>{const utterance=new root.SpeechSynthesisUtterance(String(text||''));utterance.lang=options.lang||'en-US';utterance.rate=Number(options.speed||options.rate||.88);utterance.onend=()=>resolve({provider:'browser-speech-synthesis'});utterance.onerror=event=>reject(new Error(event?.error||'Browser TTS failed'));root.speechSynthesis.speak(utterance)});
  }
  async function speak(text,options={}){
    if(!readStatus().prepared)return browserSpeak(text,options);
    if(!verifiedForSession){
      if(!(await verifyCachedAssets())){writeStatus(false);phase='idle';return browserSpeak(text,options)}
      verifiedForSession=true;
    }
    try{
      const local=await initialize();
      return await local.speak(text,{voice:options.voice||root.FiezelNeuralVoiceConfig.voices.fiezelPrimary,speed:options.speed||options.rate||1,lang:options.lang||'en-US',allowFallback:true});
    }catch(error){lastError=errorText(error);return browserSpeak(text,options)}
  }
  function stop(){try{service?.stop?.()}catch{}try{root.speechSynthesis?.cancel?.()}catch{}}

  root.FiezelVoiceRuntime=Object.freeze({schema:STATUS_SCHEMA,status,prepare,speak,stop,verifyCachedAssets,storageEstimate:()=>storageEstimate(false),assets:()=>assets.map(item=>({...item})),totalBytes});
})(typeof globalThis!=='undefined'?globalThis:this);