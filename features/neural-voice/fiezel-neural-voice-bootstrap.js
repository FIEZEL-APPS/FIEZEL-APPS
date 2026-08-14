(function(root){
  'use strict';

  const STATUS_SCHEMA='fiezel-neural-voice-status-v1';
  const STATUS_KEY='fiezel-neural-voice-v1';
  const rootUrl=new URL('../../',document.currentScript?.src||location.href);
  const absolute=path=>new URL(String(path).replace(/^\.\//,''),rootUrl).href;
  const version=String(root.FIEZEL_VERSION||'5.19.0');
  const cacheName=`fiezel-v${version}`;
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
  let phase='idle',lastError='',service=null,adapter=null,preparePromise=null,initializePromise=null,verifiedForSession=false;

  function readStatus(){
    try{
      const value=JSON.parse(root.localStorage?.getItem(STATUS_KEY)||'null');
      if(value?.schema===STATUS_SCHEMA&&value.version===version&&value.prepared===true)return value;
    }catch{}
    return{schema:STATUS_SCHEMA,version,prepared:false,preparedAt:0};
  }
  function writeStatus(prepared){
    const value={schema:STATUS_SCHEMA,version,prepared:prepared===true,preparedAt:prepared?Date.now():0};
    try{root.localStorage?.setItem(STATUS_KEY,JSON.stringify(value))}catch{}
    return value;
  }
  function status(){
    const stored=readStatus();
    return Object.freeze({schema:STATUS_SCHEMA,version,phase,prepared:stored.prepared,ready:!!service,error:lastError,totalBytes,assetCount:assets.length,zeroPaidRuntime:true,crossOriginInference:false});
  }
  function emit(progress,callback){
    const payload=Object.freeze({...progress,totalBytes,assetCount:assets.length,phase});
    if(typeof callback==='function')callback(payload);
    root.dispatchEvent?.(new CustomEvent('fiezel-neural-voice-progress',{detail:payload}));
  }
  async function verifyCachedAssets(){
    if(!('caches'in root))return false;
    const cache=await caches.open(cacheName);
    for(const item of assets){
      const response=await cache.match(absolute(item.path));
      if(!response)return false;
      const length=Number(response.headers.get('content-length')||0);
      if(length&&length!==item.bytes)return false;
    }
    return true;
  }
  async function warmAssets(onProgress){
    if(!root.isSecureContext&&!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(location.href))throw new Error('Secure context required for offline voice assets');
    if(!('caches'in root))throw new Error('Cache Storage is unavailable');
    const cache=await caches.open(cacheName);
    let completedBytes=0,completed=0;
    phase='downloading';lastError='';emit({completed,completedBytes,current:''},onProgress);
    for(const item of assets){
      const url=absolute(item.path),cached=await cache.match(url);
      if(!cached){
        const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
        if(!response.ok)throw new Error(`Voice asset failed: ${item.path} (${response.status})`);
        const length=Number(response.headers.get('content-length')||0);
        if(length&&length!==item.bytes)throw new Error(`Voice asset size mismatch: ${item.path}`);
        await cache.put(url,response.clone());
      }
      completed++;completedBytes+=item.bytes;emit({completed,completedBytes,current:item.path},onProgress);
    }
    if(!(await verifyCachedAssets()))throw new Error('Offline voice cache verification failed');
    writeStatus(true);verifiedForSession=true;phase='cached';emit({completed,completedBytes,current:''},onProgress);return status();
  }
  async function initialize(){
    if(service)return service;
    if(initializePromise)return initializePromise;
    initializePromise=(async()=>{
      if(!root.FiezelNeuralVoiceConfig||!root.FiezelKokoroAdapter||!root.FiezelNeuralVoice||!root.FiezelWebAudioPlayer)throw new Error('Neural voice runtime modules are missing');
      phase='initializing';lastError='';
      const kokoro=await import(absolute('vendor/kokoro-js/kokoro.web.js'));
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
    })().catch(error=>{phase='error';lastError=String(error?.message||error);initializePromise=null;service=null;throw error});
    return initializePromise;
  }
  async function prepare(options={}){
    if(preparePromise)return preparePromise;
    preparePromise=(async()=>{await warmAssets(options.onProgress);await initialize();return status()})().catch(error=>{phase='error';lastError=String(error?.message||error);writeStatus(false);throw error}).finally(()=>{preparePromise=null});
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
    }catch(error){lastError=String(error?.message||error);return browserSpeak(text,options)}
  }
  function stop(){try{service?.stop?.()}catch{}try{root.speechSynthesis?.cancel?.()}catch{}}

  root.FiezelVoiceRuntime=Object.freeze({schema:STATUS_SCHEMA,status,prepare,speak,stop,verifyCachedAssets,assets:()=>assets.map(item=>({...item})),totalBytes});
})(typeof globalThis!=='undefined'?globalThis:this);
