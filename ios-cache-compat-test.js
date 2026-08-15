'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=__dirname;
const patch=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-ios-cache-fix.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

assert.ok(index.includes('./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js'),'index must load iOS cache compatibility layer');
assert.ok(index.indexOf('fiezel-neural-voice-bootstrap.js')<index.indexOf('fiezel-neural-voice-ios-cache-fix.js'),'cache compatibility must load after bootstrap');
assert.ok(index.indexOf('fiezel-neural-voice-ios-cache-fix.js')<index.indexOf('fiezel-neural-voice-audibility-fix.js'),'cache compatibility must wrap prepare before audibility layer');
assert.ok(sw.includes("'./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js'"),'service worker must precache cache compatibility layer');
assert.ok(patch.includes('response.arrayBuffer()'),'WASM compatibility path must materialize the response before CacheStorage put');
assert.ok(patch.includes("headers.set('Content-Type',item.mime"),'buffered WASM must keep deterministic application/wasm MIME');
assert.ok(patch.includes('await cache.add(request)'),'large model must use browser-managed CacheStorage transfer');

(async()=>{
  const wasmBytes=21596019;
  const entries=new Map();
  let fetchCalls=0,addCalls=0,originalPrepareCalls=0;
  const cache={
    async match(input){const key=typeof input==='string'?input:input.url;return entries.get(key)||null},
    async put(input,response){const key=typeof input==='string'?input:input.url;entries.set(key,response)},
    async add(request){addCalls++;entries.set(request.url,new Response(new Uint8Array([1]),{status:200,headers:{'Content-Type':'application/octet-stream'}}))}
  };
  const localData={};
  const context={
    console,URL,Request,Response,Headers,setTimeout,clearTimeout,Promise,
    FIEZEL_VERSION:'5.19.0',
    location:{href:'https://example.test/FIEZEL-APPS/index.html'},
    document:{currentScript:{src:'https://example.test/FIEZEL-APPS/features/neural-voice/fiezel-neural-voice-ios-cache-fix.js'}},
    localStorage:{getItem:key=>localData[key]||null,setItem:(key,value)=>{localData[key]=value}},
    caches:{open:async()=>cache},
    fetch:async()=>{fetchCalls++;return new Response(new Uint8Array(wasmBytes),{status:200,headers:{'Content-Type':'application/wasm'}})},
    FiezelVoiceRuntime:Object.freeze({
      status:()=>Object.freeze({prepared:false,ready:false}),
      prepare:async()=>{originalPrepareCalls++;return{prepared:true}},
      speak:async()=>({provider:'original'}),
      stop:()=>{}
    })
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(patch,context,{filename:'ios-cache-fix.js'});
  const result=await context.FiezelVoiceRuntime.prepare();
  assert.equal(result.prepared,true);
  assert.equal(fetchCalls,1,'WASM should be fetched once through buffered compatibility path');
  assert.equal(addCalls,1,'model should be transferred once through cache.add');
  assert.equal(originalPrepareCalls,1,'original prepare must run after compatibility priming');
  const wasmUrl='https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm';
  const wasm=await cache.match(wasmUrl);
  assert.ok(wasm,'WASM must exist in CacheStorage before original prepare');
  assert.equal(wasm.headers.get('content-type'),'application/wasm');
  assert.equal(Number(wasm.headers.get('content-length')),wasmBytes);
  assert.equal((await wasm.arrayBuffer()).byteLength,wasmBytes);
  assert.equal(context.FiezelVoiceRuntime.status().iosCachePatch,'v1');
  await context.FiezelVoiceRuntime.prepare();
  assert.equal(fetchCalls,1,'second prepare must reuse cached WASM');
  assert.equal(addCalls,1,'second prepare must reuse cached model');
  assert.equal(originalPrepareCalls,2,'wrapped prepare remains reusable');


  // Timeout must not start a second 113 MB download path while cache.add is
  // still running. Promise.race does not cancel the losing promise.
  {
    let stalledAddCalls=0,stalledOriginalPrepareCalls=0;
    const wasmUrl='https://example.test/FIEZEL-APPS/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm';
    const stalledEntries=new Map([[wasmUrl,new Response(new Uint8Array([1]),{status:200,headers:{'Content-Type':'application/wasm'}})]]);
    const stalledCache={
      async match(input){const key=typeof input==='string'?input:input.url;return stalledEntries.get(key)||null},
      async put(input,response){const key=typeof input==='string'?input:input.url;stalledEntries.set(key,response)},
      async add(){stalledAddCalls++;return new Promise(()=>{})}
    };
    const stalledContext={
      console,URL,Request,Response,Headers,setTimeout,clearTimeout,Promise,
      FIEZEL_VERSION:'5.19.0',FIEZEL_IOS_PRIME_TIMEOUT_MS:20,
      location:{href:'https://example.test/FIEZEL-APPS/index.html'},
      document:{currentScript:{src:'https://example.test/FIEZEL-APPS/features/neural-voice/fiezel-neural-voice-ios-cache-fix.js'}},
      localStorage:{getItem:()=>null,setItem:()=>{}},
      caches:{open:async()=>stalledCache},
      FiezelVoiceRuntime:Object.freeze({
        totalBytes:119274361,assetCount:13,
        assets:()=>[
          {path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm',bytes:21596019},
          {path:'vendor/kokoro-model/onnx/model_quantized.onnx',bytes:92361116}
        ],
        storageEstimate:async()=>({available:1024*1024*1024}),
        status:()=>Object.freeze({prepared:false,ready:false}),
        prepare:async()=>{stalledOriginalPrepareCalls++;return{prepared:true}},
        speak:async()=>({provider:'original'}),stop:()=>{}
      })
    };
    stalledContext.globalThis=stalledContext;
    vm.createContext(stalledContext);vm.runInContext(patch,stalledContext,{filename:'ios-cache-timeout.js'});
    await assert.rejects(()=>stalledContext.FiezelVoiceRuntime.prepare(),/ios_prime_timeout/);
    assert.equal(stalledOriginalPrepareCalls,0,'timeout must not start the normal downloader concurrently');
    assert.equal(stalledAddCalls,1,'first attempt starts exactly one browser-managed model transfer');
    await assert.rejects(()=>stalledContext.FiezelVoiceRuntime.prepare(),/ios_prime_timeout/);
    assert.equal(stalledOriginalPrepareCalls,0,'retry while prime is pending must still avoid concurrent normal download');
    assert.equal(stalledAddCalls,1,'retry must reuse the in-flight prime task instead of starting a duplicate 92 MB transfer');
  }

  console.log('FIEZEL iOS CacheStorage compatibility: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
