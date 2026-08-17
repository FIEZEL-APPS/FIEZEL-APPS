importScripts('./version.js');
// CACHE is the stable runtime/data cache used by neural preparation. Do not bind
// mutable application-shell generations to it: prepared neural assets must survive
// a shell release without being rewritten underneath a live document.
const CACHE=`fiezel-v${self.FIEZEL_VERSION}`;
const SW_REV='m025-22-real-wasm-proxy-20260817-1';
const SHELL_CACHE=`fiezel-shell-${SW_REV}`;
const ASSETS=['./','./index.html','./style.css','./version.js','./report-config.js','./core-config.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js','./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-kokoro-adapter.js','./features/neural-voice/fiezel-neural-voice.js','./features/neural-voice/fiezel-web-audio-player.js','./features/neural-voice/fiezel-neural-voice-bootstrap.js','./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js','./features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js','./features/neural-voice/fiezel-neural-voice-audibility-fix.js','./features/neural-voice/fiezel-diag-panel.js','./features/neural-voice/fiezel-pipeline-device-probe.js','./features/speaking-listening/speaking-listening-config.js','./features/speaking-listening/fiezel-speaking-listening-addon.js','./features/speaking-listening/speaking-listening-addon.css','./features/speaking-listening/listening-bank-v1.json','./features/speaking-listening/speaking-bank-v1.json'];
const isNeuralAsset=request=>new URL(request.url).pathname.includes('/vendor/kokoro-');
const shellScope=String(self.registration?.scope||`${self.location.origin}/`);
const shellUrls=new Set(ASSETS.map(asset=>new URL(asset,shellScope).href));
const isShellRequest=request=>request?.mode==='navigate'||shellUrls.has(new URL(request.url).href);

// Cross-origin policy is intentionally engine-aware. Chromium-family browsers can
// keep COOP:same-origin and use the isolation-capable Puter auth path. WebKit uses
// Puter's popup/postMessage auth path on the affected PWA, so navigation responses
// use same-origin-allow-popups to preserve the opener relationship. COEP remains
// credentialless, and third-party Puter traffic is never reconstructed by this SW.
const workerUa=String(self.navigator?.userAgent||'');
const WEBKIT_POPUP_COMPAT=/AppleWebKit/i.test(workerUa)&&!/(?:Chrome|Chromium|Edg|OPR|SamsungBrowser)\//i.test(workerUa);
const COEP_POLICY='credentialless';
function openerPolicyFor(request){return request?.mode==='navigate'&&WEBKIT_POPUP_COMPAT?'same-origin-allow-popups':'same-origin'}
function withCoopCoep(response,request){
  if(!response)return response;
  const headers=new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy',openerPolicyFor(request));
  headers.set('Cross-Origin-Embedder-Policy',COEP_POLICY);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

const shellRequests=()=>ASSETS.map(asset=>new Request(asset,{cache:'reload'}));
// Do not skipWaiting here. A new release is allowed to activate only after clients
// using the previous worker are gone, preventing a controller-generation swap in
// the middle of a live installed-PWA document.
self.addEventListener('install',e=>e.waitUntil(caches.open(SHELL_CACHE).then(c=>c.addAll(shellRequests()))));
// Because activation is no longer forced over live old clients, stale dedicated
// shell caches can be removed here. The stable neural/runtime CACHE is preserved.
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fiezel-shell-')&&k!==SHELL_CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const requestUrl=new URL(e.request.url);
  if(requestUrl.pathname.toLowerCase().endsWith('/version.json')){e.respondWith(fetch(e.request).then(r=>r&&r.ok?r:caches.match(e.request,{cacheName:SHELL_CACHE})).catch(()=>caches.match(e.request,{cacheName:SHELL_CACHE})));return}
  if(requestUrl.origin!==self.location.origin){
    // Third-party SDK/API traffic is deliberately left to the browser. The
    // document uses COEP: credentialless, so no-cors resources such as Puter.js
    // can load without the service worker reconstructing or proxying opaque bodies.
    return;
  }
  let responsePromise;
  if(isNeuralAsset(e.request)){
    // Neural runtime/model/voice assets are owned by the neural prepare layer and
    // stay in the stable runtime cache. A shell release never precaches/rewrites them.
    responsePromise=caches.match(e.request,{cacheName:CACHE}).then(c=>c||fetch(e.request));
  }else if(isShellRequest(e.request)){
    // Current worker generation serves only its own revisioned shell cache. Missing
    // shell bytes are refetched into this generation, never borrowed from legacy
    // shell entries that still happen to exist in the stable runtime cache.
    responsePromise=caches.match(e.request,{cacheName:SHELL_CACHE}).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(SHELL_CACHE).then(cache=>cache.put(e.request,copy))}return r})).catch(error=>{if(e.request.mode==='navigate')return caches.match('./index.html',{cacheName:SHELL_CACHE});throw error});
  }else{
    responsePromise=caches.match(e.request,{cacheName:CACHE}).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok&&!isNeuralAsset(e.request)){const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return r}));
  }
  e.respondWith(responsePromise.then(r=>r&&(e.request.mode==='navigate'||/\.(?:m?js)$/i.test(requestUrl.pathname))?withCoopCoep(r,e.request):r));
});

self.addEventListener('periodicsync',e=>{if(e.tag==='fiezel-update-check')e.waitUntil(self.registration.update().catch(()=>{}))});

self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if('focus'in client)return client.focus()}return clients.openWindow?clients.openWindow(url):undefined}))});

self.addEventListener('push',event=>{
  let payload={title:'FIEZEL · Reminder belajar',body:'Jahran, waktunya kembali ke sesi belajar.',url:'./',tag:'fiezel-remote'};
  try{
    if(event.data){
      const parsed=event.data.json();
      if(parsed&&typeof parsed==='object')payload={...payload,...parsed};
    }
  }catch{
    try{payload.body=event.data?.text?.()||payload.body}catch{}
  }
  const options={body:String(payload.body||'').slice(0,280),tag:String(payload.tag||'fiezel-remote').slice(0,64),renotify:false,icon:'./apple-touch-icon.png',badge:'./favicon-64.png',data:{url:payload.url||'./'}};
  event.waitUntil(self.registration.showNotification(String(payload.title||'FIEZEL').slice(0,80),options));
});