(function(root){
  'use strict';

  const runtime=root.FiezelVoiceRuntime;
  if(!runtime||runtime.__cacheIntegrityPatched)return;

  const PATCH='m025-15-cache-integrity-v1';
  const STATUS_KEY='fiezel-neural-voice-v1';
  const PREPARED_MARKER_KEY='fiezel-neural-voice-prepared-v1';
  const LARGE_ASSET_STREAM_THRESHOLD=8*1024*1024;
  const DIAG_LIMIT=200;
  const version=String(root.FIEZEL_VERSION||'5.19.0');
  const cacheName=`fiezel-v${version}`;
  const rootUrl=new URL('../../',document.currentScript?.src||location.href);
  const absolute=path=>new URL(String(path).replace(/^\.\//,''),rootUrl).href;

  function diag(entry){
    try{
      const key='fiezel-neural-voice-diagnostics-v1';
      const list=JSON.parse(root.localStorage?.getItem(key)||'[]');
      list.push({t:Date.now(),v:version,patch:PATCH,...entry});
      root.localStorage?.setItem(key,JSON.stringify(list.slice(-DIAG_LIMIT)));
    }catch{}
  }

  function isCacheVerificationFailure(error){
    return String(error?.message||error?.name||error||'').toLowerCase().includes('cache verification failed');
  }

  async function invalidatePreparedState(cache){
    try{root.localStorage?.removeItem?.(STATUS_KEY)}catch{}
    try{await cache?.delete?.(absolute(PREPARED_MARKER_KEY))}catch{}
    diag({phase:'cache_integrity_prepared_invalidated'});
  }

  function safeContentType(response,item){
    const value=String(response?.headers?.get?.('content-type')||'').trim();
    if(value)return value;
    if(/\.(?:mjs|js)(?:\?|$)/i.test(item.path))return'text/javascript; charset=utf-8';
    return'application/octet-stream';
  }

  async function inspectAndNormalizeSmallAssets(){
    if(!root.caches||typeof runtime.assets!=='function')return{checked:false,requiresPrepare:false,normalized:0,corrupt:0};
    let cache;
    try{cache=await root.caches.open(cacheName)}catch{return{checked:false,requiresPrepare:false,normalized:0,corrupt:0}}
    let normalized=0,corrupt=0,requiresPrepare=false;
    const items=runtime.assets()||[];
    for(const item of items){
      const expected=Number(item?.bytes)||0;
      if(!expected||expected>=LARGE_ASSET_STREAM_THRESHOLD)continue;
      const url=absolute(item.path);
      let response=null;
      try{response=await cache.match(url)}catch{}
      if(!response)continue;
      const headerLength=Number(response.headers?.get?.('content-length')||0);
      if(!headerLength||headerLength===expected)continue;

      diag({phase:'cache_integrity_header_mismatch',expectedBytes:expected,headerBytes:headerLength});
      let buffer=null;
      try{buffer=await response.clone().arrayBuffer()}catch{}
      const actualLength=Number(buffer?.byteLength)||0;
      if(actualLength===expected){
        const headers=new Headers();
        headers.set('Content-Type',safeContentType(response,item));
        headers.set('Content-Length',String(actualLength));
        try{
          await cache.put(url,new Response(buffer,{status:response.status||200,statusText:response.statusText||'',headers}));
          normalized++;
          diag({phase:'cache_integrity_normalized',expectedBytes:expected,headerBytes:headerLength,actualBytes:actualLength});
          continue;
        }catch{}
      }

      try{await cache.delete(url)}catch{}
      corrupt++;
      requiresPrepare=true;
      diag({phase:'cache_integrity_corrupt',expectedBytes:expected,headerBytes:headerLength,actualBytes:actualLength});
    }
    if(requiresPrepare)await invalidatePreparedState(cache);
    return{checked:true,requiresPrepare,normalized,corrupt,cache};
  }

  async function repairPreparedCacheIfNeeded(wasPrepared){
    const inspection=await inspectAndNormalizeSmallAssets();
    if(inspection.requiresPrepare&&wasPrepared){
      diag({phase:'cache_integrity_prepare_enter'});
      await runtime.prepare();
      diag({phase:'cache_integrity_prepare_ready'});
    }
    return inspection;
  }

  async function ensureReady(){
    const before=runtime.status?.()||{};
    const wasPrepared=!!before.prepared;
    await repairPreparedCacheIfNeeded(wasPrepared);
    try{
      const result=await runtime.ensureReady();
      diag({phase:'cache_integrity_ready'});
      return result;
    }catch(error){
      if(!wasPrepared||!isCacheVerificationFailure(error))throw error;
      let cache=null;
      try{cache=await root.caches?.open?.(cacheName)}catch{}
      await invalidatePreparedState(cache);
      diag({phase:'cache_integrity_verify_repair_enter'});
      await runtime.prepare();
      const result=await runtime.ensureReady();
      diag({phase:'cache_integrity_verify_repair_ready'});
      return result;
    }
  }

  async function speak(text,options={}){
    const state=runtime.status?.()||{};
    if(!state.ready){
      try{await ensureReady()}
      catch(error){if(options.allowFallback===false)throw error}
    }
    return runtime.speak(text,options);
  }

  function status(){return Object.freeze({...runtime.status?.(),cacheIntegrityPatch:PATCH})}

  root.FiezelVoiceRuntime=Object.freeze({...runtime,status,ensureReady,speak,__cacheIntegrityPatched:true});
  diag({phase:'cache_integrity_patch_loaded'});
})(typeof globalThis!=='undefined'?globalThis:this);
