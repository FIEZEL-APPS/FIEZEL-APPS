'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const patchPath=path.join(__dirname,'features','neural-voice','fiezel-neural-voice-cache-integrity-repair.js');
const patch=fs.readFileSync(patchPath,'utf8');
const EXPECTED=2136684;
const COMPRESSED_HEADER=900420;
const TARGET='vendor/kokoro-js/kokoro.web.js?nv=m025-5';
const MARKER='fiezel-neural-voice-prepared-v1';

function makeHarness({bodyBytes=EXPECTED,headerBytes=COMPRESSED_HEADER,prepared=true,withTarget=true}={}){
  const entries=new Map();
  const deleted=[];
  const local={};
  let ready=false,prepareCalls=0,baseEnsureCalls=0,baseSpeakCalls=0;
  const origin='https://example.test/FIEZEL-APPS/';
  const targetUrl=new URL(TARGET,origin).href;
  const markerUrl=new URL(MARKER,origin).href;
  const keyOf=input=>typeof input==='string'?input:input.url;
  const putResponse=(url,bytes,header)=>entries.set(url,new Response(new Uint8Array(bytes),{
    status:200,
    headers:{'Content-Type':'text/javascript; charset=utf-8','Content-Length':String(header)}
  }));
  if(withTarget)putResponse(targetUrl,bodyBytes,headerBytes);
  if(prepared)entries.set(markerUrl,new Response('1',{headers:{'Content-Type':'text/plain'}}));
  local['fiezel-neural-voice-v1']=JSON.stringify({schema:'fiezel-neural-voice-status-v1',version:'5.19.0',prepared,storage:prepared?'cache':'',preparedAt:prepared?1:0});

  const cache={
    async match(input){return entries.get(keyOf(input))||null},
    async put(input,response){entries.set(keyOf(input),response)},
    async delete(input){const key=keyOf(input);deleted.push(key);return entries.delete(key)}
  };
  const status=()=>Object.freeze({prepared,ready,assetsCached:prepared});
  const baseRuntime={
    assets:()=>[{path:TARGET,bytes:EXPECTED}],
    status,
    refreshPreparedFlag:async()=>prepared,
    ensureReady:async()=>{
      baseEnsureCalls++;
      if(!prepared)throw new Error('Neural voice assets are not prepared');
      const response=await cache.match(targetUrl);
      if(!response)throw new Error('Offline voice cache verification failed');
      const length=Number(response.headers.get('content-length')||0);
      if(length&&length!==EXPECTED)throw new Error('Offline voice cache verification failed');
      ready=true;
      return status();
    },
    prepare:async()=>{
      prepareCalls++;
      prepared=true;
      putResponse(targetUrl,EXPECTED,EXPECTED);
      entries.set(markerUrl,new Response('1',{headers:{'Content-Type':'text/plain'}}));
      local['fiezel-neural-voice-v1']=JSON.stringify({schema:'fiezel-neural-voice-status-v1',version:'5.19.0',prepared:true,storage:'cache',preparedAt:2});
      ready=true;
      return status();
    },
    speak:async()=>{baseSpeakCalls++;if(!ready)throw new Error('not_ready');return{provider:'neural'}},
    stop:()=>{},
    diagnostics:()=>[]
  };
  const context={
    console,URL,Response,Headers,Request,Promise,Date,setTimeout,clearTimeout,
    FIEZEL_VERSION:'5.19.0',
    location:{href:origin+'index.html'},
    document:{currentScript:{src:origin+'features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js'}},
    navigator:{standalone:true},
    localStorage:{
      getItem:key=>Object.prototype.hasOwnProperty.call(local,key)?local[key]:null,
      setItem:(key,value)=>{local[key]=String(value)},
      removeItem:key=>{delete local[key]}
    },
    caches:{open:async()=>cache},
    FiezelVoiceRuntime:baseRuntime,
    dispatchEvent:()=>{}
  };
  context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(patch,context,{filename:'cache-integrity-repair.js'});
  return{
    context,cache,entries,deleted,targetUrl,markerUrl,local,
    get prepareCalls(){return prepareCalls},
    get baseEnsureCalls(){return baseEnsureCalls},
    get baseSpeakCalls(){return baseSpeakCalls}
  };
}

(async()=>{
  {
    const t=makeHarness({bodyBytes:EXPECTED,headerBytes:COMPRESSED_HEADER,prepared:true});
    const result=await t.context.FiezelVoiceRuntime.ensureReady();
    assert.equal(result.ready,true,'full decoded body must remain usable even when cached Content-Length reflects different network metadata');
    assert.equal(t.prepareCalls,0,'metadata-only mismatch must be normalized locally without a network-style prepare');
    const repaired=await t.cache.match(t.targetUrl);
    assert.equal(Number(repaired.headers.get('content-length')),EXPECTED,'normalized cache entry must advertise decoded byte length');
    assert.equal((await repaired.arrayBuffer()).byteLength,EXPECTED,'normalization must preserve the full decoded body');
    assert.equal(t.context.FiezelVoiceRuntime.status().cacheIntegrityPatch,'m025-15-cache-integrity-v1');
  }

  {
    const t=makeHarness({bodyBytes:COMPRESSED_HEADER,headerBytes:COMPRESSED_HEADER,prepared:true});
    const result=await t.context.FiezelVoiceRuntime.ensureReady();
    assert.equal(result.ready,true,'genuinely short cached body must be repaired before readiness');
    assert.equal(t.prepareCalls,1,'genuinely short body must use the existing prepare/warm repair path exactly once');
    assert.ok(t.deleted.includes(t.targetUrl),'corrupt cached asset must be deleted');
    assert.ok(t.deleted.includes(t.markerUrl),'prepared marker must be invalidated before repair so stale state cannot resurrect');
    const repaired=await t.cache.match(t.targetUrl);
    assert.equal((await repaired.arrayBuffer()).byteLength,EXPECTED,'repair must restore the expected asset bytes');
  }

  {
    const t=makeHarness({prepared:false,withTarget:false});
    await assert.rejects(()=>t.context.FiezelVoiceRuntime.ensureReady(),/assets are not prepared/,'fresh unprepared users must not be forced into an implicit 119 MB download');
    assert.equal(t.prepareCalls,0,'missing assets without prepared state must not auto-download');
  }

  {
    const t=makeHarness({bodyBytes:COMPRESSED_HEADER,headerBytes:COMPRESSED_HEADER,prepared:true});
    const result=await t.context.FiezelVoiceRuntime.speak('fixed regression text',{allowFallback:false});
    assert.equal(result.provider,'neural','neural-only speech must self-heal the corrupt prepared cache before speaking');
    assert.equal(t.prepareCalls,1);
    assert.equal(t.baseSpeakCalls,1);
  }

  assert.ok(!/\b(?:prompt|token|credential|cookie)\b/i.test(patch),'repair layer must not persist sensitive payload fields');
  console.log('FIEZEL neural cache-integrity repair: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
