(function(root){
  'use strict';

  const runtime=root.FiezelVoiceRuntime;
  if(!runtime||runtime.__iosCachePatched)return;

  const version=String(root.FIEZEL_VERSION||'5.19.0');
  const cacheName=`fiezel-v${version}`;
  const rootUrl=new URL('../../',document.currentScript?.src||location.href);
  const absolute=path=>new URL(String(path).replace(/^\.\//,''),rootUrl).href;
  const WASM={path:'vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm',bytes:21596019,mime:'application/wasm'};
  const MODEL={path:'vendor/kokoro-model/onnx/model_quantized.onnx',bytes:92361116};
  // Regression fix: the original patch had no ceiling on how long priming
  // could take. On a slow/stalled connection, fetch()/cache.add() for the
  // 21MB WASM and 92MB model can hang indefinitely with zero feedback --
  // this was reported as "Siapkan suara offline" getting stuck forever
  // with the button never re-enabling. PRIME_TIMEOUT_MS caps that: if
  // priming doesn't finish in time, we give up on the head-start and let
  // the normal prepare()/warmAssets() flow (which already retries and
  // surfaces errors to the UI) do the actual work instead.
  const PRIME_TIMEOUT_MS=Number(root.FIEZEL_IOS_PRIME_TIMEOUT_MS)||45000;
  const PRIME_ASSET_COUNT=Number(runtime.assetCount)||13;
  const PRIME_TOTAL_BYTES=Number(runtime.totalBytes)||119796601;
  let primePromise=null;

  function withTimeout(promise,ms,label){
    let timer=null;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_timeout`)),ms)});
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
  }

  function reportProgress(progress,onProgress){
    const payload=Object.freeze({...progress,totalBytes:PRIME_TOTAL_BYTES,assetCount:PRIME_ASSET_COUNT});
    if(typeof onProgress==='function')onProgress(payload);
    try{if(typeof CustomEvent!=='undefined'&&root.dispatchEvent)root.dispatchEvent(new CustomEvent('fiezel-neural-voice-progress',{detail:payload}))}catch{}
  }

  function diag(entry){
    try{
      const key='fiezel-neural-voice-diagnostics-v1';
      const list=JSON.parse(root.localStorage?.getItem(key)||'[]');
      list.push({t:Date.now(),v:version,patch:'ios-cache-v1',...entry});
      root.localStorage?.setItem(key,JSON.stringify(list.slice(-40)));
    }catch{}
  }

  async function has(cache,url){
    try{return !!(await cache.match(url))}catch(error){diag({phase:'cache_match_error',error:String(error?.message||error)});return false}
  }

  async function cacheBuffered(cache,item){
    const url=absolute(item.path);
    if(await has(cache,url))return true;
    let response;
    try{
      response=await fetch(url,{cache:'reload',credentials:'same-origin'});
    }catch(error){
      diag({phase:'buffer_fetch_error',asset:item.path,error:String(error?.message||error)});
      throw error;
    }
    if(!response.ok)throw new Error(`Voice asset failed: ${item.path} (${response.status})`);
    let buffer;
    try{buffer=await response.arrayBuffer()}
    catch(error){diag({phase:'buffer_read_error',asset:item.path,error:String(error?.message||error)});throw error}
    if(buffer.byteLength!==item.bytes)throw new Error(`Voice asset size mismatch: ${item.path} (${buffer.byteLength}/${item.bytes})`);
    const headers=new Headers();
    headers.set('Content-Type',item.mime||response.headers?.get?.('content-type')||'application/octet-stream');
    headers.set('Content-Length',String(buffer.byteLength));
    try{await cache.put(url,new Response(buffer,{status:200,headers}))}
    catch(error){diag({phase:'buffer_cache_put_error',asset:item.path,error:String(error?.message||error)});throw error}
    if(!(await has(cache,url)))throw new Error(`Buffered cache verification failed: ${item.path}`);
    diag({phase:'buffer_cached',asset:item.path,bytes:buffer.byteLength});
    return true;
  }

  async function cacheBrowserManaged(cache,item){
    const url=absolute(item.path);
    if(await has(cache,url))return true;
    try{
      const request=new Request(url,{cache:'reload',credentials:'same-origin'});
      await cache.add(request);
    }catch(error){
      diag({phase:'cache_add_error',asset:item.path,error:String(error?.message||error)});
      throw error;
    }
    if(!(await has(cache,url)))throw new Error(`Browser-managed cache verification failed: ${item.path}`);
    diag({phase:'cache_add_ok',asset:item.path,bytes:item.bytes});
    return true;
  }

  async function primeLargeAssets(onProgress){
    if(!root.caches)return false;
    const cache=await root.caches.open(cacheName);
    let completed=0,completedBytes=0;
    const done=(item)=>{
      completed++;completedBytes+=item.bytes;
      reportProgress({phase:'downloading',completed,completedBytes,current:item.path},onProgress);
    };
    // WebKit is more reliable when the 21 MB WASM is fully materialized before cache.put.
    if(!(await has(cache,absolute(WASM.path)))){
      try{await cacheBuffered(cache,WASM)}catch(error){diag({phase:'wasm_prime_failed',error:String(error?.message||error)})}
    }
    done(WASM);
    // Let CacheStorage own the 92 MB model transfer instead of wrapping a live JS ReadableStream.
    if(!(await has(cache,absolute(MODEL.path)))){
      try{await cacheBrowserManaged(cache,MODEL)}catch(error){diag({phase:'model_prime_failed',error:String(error?.message||error)})}
    }
    done(MODEL);
    return true;
  }

  function prepare(options={}){
    if(primePromise)return primePromise;
    primePromise=(async()=>{
      try{
        await withTimeout(primeLargeAssets(options.onProgress),PRIME_TIMEOUT_MS,'ios_prime');
      }catch(error){
        // Priming is a best-effort head start, not a requirement -- if it
        // stalls or times out, fall through to the normal prepare() flow
        // below instead of leaving the caller waiting forever.
        diag({phase:'prime_timeout_or_error',error:String(error?.message||error)});
      }
      return runtime.prepare(options);
    })().finally(()=>{primePromise=null});
    return primePromise;
  }

  function status(){return Object.freeze({...runtime.status?.(),iosCachePatch:'v1'})}

  root.FiezelVoiceRuntime=Object.freeze({...runtime,status,prepare,__iosCachePatched:true});
  diag({phase:'ios_cache_patch_loaded'});
})(typeof globalThis!=='undefined'?globalThis:this);
