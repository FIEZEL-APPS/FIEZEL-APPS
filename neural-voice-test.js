'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=__dirname;
const lock=JSON.parse(fs.readFileSync(path.join(root,'NEURAL-VOICE-SOURCE-LOCK.json'),'utf8'));
const config=require(path.join(root,'features','neural-voice','fiezel-neural-voice-config.js'));
const core=require(path.join(root,'features','neural-voice','fiezel-neural-voice.js'));
const adapterApi=require(path.join(root,'features','neural-voice','fiezel-kokoro-adapter.js'));
const player=require(path.join(root,'features','neural-voice','fiezel-web-audio-player.js'));
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');
let pass=0;
async function test(name,fn){await fn();pass++;console.log('PASS',name)}
function file(rel){return path.join(root,rel)}
function sha(rel){return crypto.createHash('sha256').update(fs.readFileSync(file(rel))).digest('hex')}
function verifyAsset(asset){assert.ok(fs.existsSync(file(asset.path)),asset.path);assert.equal(fs.statSync(file(asset.path)).size,asset.sizeBytes,asset.path);assert.equal(sha(asset.path),asset.sha256,asset.path)}

(async()=>{
  await test('source lock schema',()=>assert.equal(lock.schema,'fiezel-neural-voice-source-lock-v1'));
  await test('Kokoro source commit is full and pinned',()=>assert.match(lock.provider.commit,/^[a-f0-9]{40}$/));
  await test('provider version remains 1.2.1',()=>assert.equal(lock.provider.version,'1.2.1'));
  await test('runtime bundle integrity',()=>verifyAsset(lock.runtime.bundle));
  await test('WASM module integrity',()=>verifyAsset(lock.runtime.wasmModule));
  await test('WASM binary integrity',()=>verifyAsset(lock.runtime.wasmBinary));
  await test('model integrity',()=>verifyAsset(lock.model));
  await test('model stays below GitHub single-file limit',()=>assert.ok(lock.model.sizeBytes<100*1024*1024));
  await test('all six voice hashes match',()=>{for(const voice of lock.voices){const rel=`vendor/kokoro-model/voices/${voice.id}.bin`;assert.equal(sha(rel),voice.sha256)}});
  await test('support JSON parses',()=>{for(const rel of ['vendor/kokoro-model/config.json','vendor/kokoro-model/tokenizer.json','vendor/kokoro-model/tokenizer_config.json'])JSON.parse(fs.readFileSync(file(rel),'utf8'))});
  await test('required licenses are present',()=>{for(const rel of ['vendor/kokoro-js/LICENSE','vendor/kokoro-model/LICENSE','vendor/kokoro-js/licenses/HUGGINGFACE-TRANSFORMERS-APACHE-2.0.txt','vendor/kokoro-js/licenses/PHONEMIZER-APACHE-2.0.txt','vendor/kokoro-js/licenses/ONNXRUNTIME-MIT.txt'])assert.ok(fs.statSync(file(rel)).size>500,rel)});
  await test('zero paid runtime policy',()=>assert.deepStrictEqual([lock.policy.paidRuntime,lock.policy.vendorApiKey,lock.policy.remoteInference,lock.policy.crossOriginTtsRequests],[false,false,false,false]));
  await test('explicit same-origin warmup policy',()=>assert.deepStrictEqual([lock.policy.sameOriginExplicitWarmup,lock.policy.offlineAfterWarmRequired],[true,true]));
  await test('config pins source and runtime dependencies',()=>assert.deepStrictEqual([config.schema,config.providerVersion,config.providerSourceCommit,config.transformersVersion,config.onnxRuntimeWebVersion],['fiezel-neural-voice-v2','1.2.1',lock.provider.commit,'3.5.1','1.22.0-dev.20250409-89f8206ba4']));
  await test('adapter rejects cross-origin paths',()=>assert.throws(()=>adapterApi.assertLocalPath('https://example.com/model'),'must be same-origin/local'));
  await test('adapter forces local routing before model load',async()=>{const env={allowRemoteModels:true,allowLocalModels:false,localModelPath:'',wasmPaths:''};let voiceBase='',captured=null;const KokoroTTS={from_pretrained:async(id,options)=>{captured={id,options,remote:env.allowRemoteModels,local:env.allowLocalModels,path:env.localModelPath,wasm:env.wasmPaths,voiceBase};return{generate:async()=>({data:new Float32Array([0]),sampling_rate:24000})}}};const adapter=adapterApi.createKokoroAdapter({KokoroTTS,kokoroEnv:env,setVoiceDataUrl:value=>{voiceBase=value},modelId:'kokoro-model',localModelPath:'./vendor/',voiceBaseUrl:'./vendor/kokoro-model/voices',wasmBasePath:'./vendor/kokoro-js/wasm/'});await adapter.initialize();assert.deepStrictEqual(captured,{id:'kokoro-model',options:{dtype:'q8',device:'wasm'},remote:false,local:true,path:'./vendor/',wasm:'./vendor/kokoro-js/wasm/',voiceBase:'./vendor/kokoro-model/voices'})});
  await test('voice service rejects empty input',()=>assert.throws(()=>core.normalizeText('',100),'empty'));
  await test('voice service bounds input',()=>assert.throws(()=>core.normalizeText('x'.repeat(101),100),'bounded'));
  await test('web audio accepts Kokoro Float32 payload',()=>assert.ok(player.pickSamples({data:new Float32Array([0,.1])}) instanceof Float32Array));
  await test('bootstrap uses dynamic same-origin vendor import',()=>assert.ok(bootstrap.includes("absolute('vendor/kokoro-js/kokoro.web.js')")&&bootstrap.includes("credentials:'same-origin'")&&bootstrap.includes("cache:'no-store'")));
  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared&&!preparedFlag)return browserSpeak")));
  await test('bootstrap verifies complete cache before ready flag',()=>assert.ok(bootstrap.indexOf('verifyCachedAssets()')<bootstrap.indexOf("writeStatus(true,'cache')")));
  await test('stale prepared state fails closed to browser TTS',()=>assert.ok(bootstrap.includes('if(!(await verifyCachedAssets())){writeStatus(false)')));
  await test('bootstrap contains no vendor endpoint or credential',()=>assert.ok(!/https?:\/\//i.test(bootstrap)&&!/(?:api[_-]?key|bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9_-]{12,})/i.test(bootstrap)));
  await test('production claim remains false pending device gates',()=>assert.deepStrictEqual([lock.promotion.sourceAndAssetClosure,lock.promotion.realDeviceGate,lock.promotion.productionClaim],['PASS','PENDING',false]));
  const bundle=await import('./vendor/kokoro-js/kokoro.web.js');
  await test('browser bundle exports patched controls',()=>assert.ok(bundle.KokoroTTS&&bundle.env&&bundle.setVoiceDataUrl&&'allowRemoteModels'in bundle.env&&'allowLocalModels'in bundle.env&&'localModelPath'in bundle.env&&'wasmPaths'in bundle.env));
  await test('bootstrap streams large assets instead of buffering the model',()=>assert.ok(bootstrap.includes('LARGE_ASSET_STREAM_THRESHOLD')&&bootstrap.includes('new Response(fetched.body')&&bootstrap.includes('await fetched.arrayBuffer()')));
  await test('bootstrap does not claim a memory-only offline install',()=>assert.ok(!bootstrap.includes('memoryAssets')&&!bootstrap.includes("storage=usedMemory?'memory':'cache'")));
  await test('bootstrap uses Storage API preflight when available',()=>assert.ok(bootstrap.includes("manager.estimate")&&bootstrap.includes("manager.persist")&&bootstrap.includes('storage_insufficient')));

  const fakeAssets=[['vendor/kokoro-js/kokoro.web.js',2135645],['vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.mjs',44484],['vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm',21596019],['vendor/kokoro-model/config.json',45],['vendor/kokoro-model/tokenizer.json',3498],['vendor/kokoro-model/tokenizer_config.json',114],['vendor/kokoro-model/onnx/model_quantized.onnx',92361116],['vendor/kokoro-model/voices/af_heart.bin',522240],['vendor/kokoro-model/voices/af_bella.bin',522240],['vendor/kokoro-model/voices/af_nicole.bin',522240],['vendor/kokoro-model/voices/am_michael.bin',522240],['vendor/kokoro-model/voices/bf_emma.bin',522240],['vendor/kokoro-model/voices/bm_george.bin',522240]];
  const sizes=Object.fromEntries(fakeAssets);
  const localStorageData={};
  const localStorage={getItem:k=>localStorageData[k]??null,setItem:(k,v)=>localStorageData[k]=String(v),removeItem:k=>delete localStorageData[k]};
  function keyForUrl(url){const text=String(url);return fakeAssets.find(([p])=>text.endsWith(p))?.[0]||''}
  function makeFetch(options={}){
    const calls=[];
    const fn=async url=>{const key=keyForUrl(url),len=sizes[key];calls.push(key);if(!len)throw new Error('unexpected asset '+String(url));return{ok:true,status:200,headers:{get:n=>{n=String(n).toLowerCase();if(n==='content-length')return String(len);if(n==='content-type')return 'application/octet-stream';return null}},arrayBuffer:async()=>{if(options.rejectLargeBuffer&&len>=8*1024*1024)throw new Error('large asset was buffered');return new ArrayBuffer(len)}}};
    fn.calls=calls;return fn;
  }
  function makeCaches(options={}){
    const store=new Map();
    const cache={
      match:async url=>store.get(String(url))||null,
      put:async(url,response)=>{if(options.putThrows){const e=new Error('quota');e.name='QuotaExceededError';throw e}const key=keyForUrl(url),len=sizes[key];store.set(String(url),{headers:{get:n=>String(n).toLowerCase()==='content-length'?String(len):null},response})},
      delete:async url=>store.delete(String(url))
    };
    return{open:async()=>cache,_store:store};
  }
  const moduleStub={KokoroTTS:{from_pretrained:async()=>({generate:async()=>({data:new Float32Array([0]),sampling_rate:24000}),voices:{}})},env:{allowRemoteModels:false,allowLocalModels:true,localModelPath:'./vendor/',wasmPaths:'./vendor/kokoro-js/wasm/'},setVoiceDataUrl:()=>{}};
  function makeContext(caches,fetchFn,navigatorStorage){
    const ctx={console,FIEZEL_VERSION:'5.19.0',location:{href:'http://localhost/'},document:{currentScript:{src:'http://localhost/features/neural-voice/fiezel-neural-voice-bootstrap.js'}},isSecureContext:true,localStorage,caches,fetch:fetchFn,Response:function(buffer,options){this.buffer=buffer;this.headers={get:n=>{const h=options?.headers||{};return h[n]||h[String(n).toLowerCase()]||h['Content-Length']||null}}},CustomEvent:function(type){this.type=type},dispatchEvent(){},navigator:{storage:navigatorStorage},__fiezelDynamicImport:async()=>moduleStub,FiezelNeuralVoiceConfig:config,FiezelKokoroAdapter:adapterApi,FiezelNeuralVoice:core,FiezelWebAudioPlayer:player,URL,Promise,setTimeout:(fn)=>{fn();return 0}};
    return ctx;
  }

  await test('large ONNX and WASM assets are not copied into ArrayBuffer during warmup',async()=>{
    const vm=require('vm');
    const caches=makeCaches();const fetchFn=makeFetch({rejectLargeBuffer:true});
    const storage={estimate:async()=>({usage:0,quota:1024*1024*1024}),persisted:async()=>true,persist:async()=>true};
    const ctx=makeContext(caches,fetchFn,storage);vm.createContext(ctx);vm.runInContext(bootstrap,ctx,{filename:'bootstrap-stream.js'});
    const result=await ctx.FiezelVoiceRuntime.prepare();
    assert.equal(result.prepared,true);assert.equal(result.storage,'cache');assert.equal(await ctx.FiezelVoiceRuntime.verifyCachedAssets(),true);
  });

  await test('cache quota failure is fail-closed and never marked prepared',async()=>{
    const vm=require('vm');
    const caches=makeCaches({putThrows:true});const fetchFn=makeFetch();
    const storage={estimate:async()=>({usage:0,quota:1024*1024*1024}),persisted:async()=>true,persist:async()=>true};
    const ctx=makeContext(caches,fetchFn,storage);vm.createContext(ctx);vm.runInContext(bootstrap,ctx,{filename:'bootstrap-quota.js'});
    let rejected=false;try{await ctx.FiezelVoiceRuntime.prepare()}catch(error){rejected=true;assert.match(String(error?.message||error),/Offline voice storage failed/)}
    assert.equal(rejected,true);const result=ctx.FiezelVoiceRuntime.status();assert.equal(result.prepared,false);assert.equal(result.storage,'');
  });

  await test('insufficient origin quota fails before downloading neural assets',async()=>{
    const vm=require('vm');
    const caches=makeCaches();const fetchFn=makeFetch();
    const storage={estimate:async()=>({usage:0,quota:50*1000*1000}),persisted:async()=>false,persist:async()=>false};
    const ctx=makeContext(caches,fetchFn,storage);vm.createContext(ctx);vm.runInContext(bootstrap,ctx,{filename:'bootstrap-preflight.js'});
    let rejected=false;try{await ctx.FiezelVoiceRuntime.prepare()}catch(error){rejected=true;assert.match(String(error?.message||error),/Penyimpanan tidak cukup/)}
    assert.equal(rejected,true);assert.equal(fetchFn.calls.length,0,'preflight should fail before network download');
  });

  await test('speak falls back to browser TTS when the neural backend times out',async()=>{
    const vm=require('vm');
    const caches=makeCaches();const fetchFn=makeFetch();
    const storage={estimate:async()=>({usage:0,quota:1024*1024*1024}),persisted:async()=>true,persist:async()=>true};
    localStorageData['fiezel-neural-voice-v1']=JSON.stringify({schema:'fiezel-neural-voice-status-v1',version:'5.19.0',prepared:true,storage:'cache',preparedAt:0});
    for(const [path,size] of fakeAssets)caches._store.set('http://localhost/'+path,{headers:{get:n=>String(n).toLowerCase()==='content-length'?String(size):null}});
    const hangStub={KokoroTTS:{from_pretrained:async()=>new Promise(()=>{})},env:{allowRemoteModels:false,allowLocalModels:true,localModelPath:'./vendor/',wasmPaths:'./vendor/kokoro-js/wasm/'},setVoiceDataUrl:()=>{}};
    const ctx=makeContext(caches,fetchFn,storage);
    ctx.__fiezelDynamicImport=async()=>hangStub;
    ctx.speechSynthesis={speak(){}};ctx.SpeechSynthesisUtterance=function(){};
    vm.createContext(ctx);vm.runInContext(bootstrap,ctx,{filename:'bootstrap-speak-timeout.js'});
    const result=await ctx.FiezelVoiceRuntime.speak('hello world');
    assert.equal(result.provider,'browser-speech-synthesis');
    assert.match(ctx.FiezelVoiceRuntime.status().error,/timed out|timeout/);
  });

  await test('cache marker keeps prepared state when localStorage is cleared',async()=>{
    const vm=require('vm');
    const caches=makeCaches();const fetchFn=makeFetch();
    const storage={estimate:async()=>({usage:0,quota:1024*1024*1024}),persisted:async()=>true,persist:async()=>true};
    const ctx=makeContext(caches,fetchFn,storage);vm.createContext(ctx);vm.runInContext(bootstrap,ctx,{filename:'bootstrap-marker.js'});
    const prepared=await ctx.FiezelVoiceRuntime.prepare();
    assert.equal(prepared.prepared,true);
    delete localStorageData['fiezel-neural-voice-v1'];
    await ctx.FiezelVoiceRuntime.refreshPreparedFlag();
    assert.equal(ctx.FiezelVoiceRuntime.status().prepared,true);
  });

  console.log(`FIEZEL Neural Voice: PASS ${pass}/0`);
})().catch(error=>{console.error('FIEZEL Neural Voice: FAIL',error.stack||error);process.exit(1)});
