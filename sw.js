importScripts('./version.js');
const CACHE=`fiezel-v${self.FIEZEL_VERSION}`;
// SW_REV tidak dibaca kode mana pun. Fungsinya hanya mengubah byte sw.js supaya
// browser mendeteksi service worker baru dan menjalankan install ulang. Itu perlu
// karena fetch handler di bawah cache-first untuk semua same-origin, jadi file baru
// TIDAK akan pernah dilayani sampai install memanggil addAll dengan cache:'reload'.
// JANGAN naikkan version.js bersamaan: nama CACHE terikat ke FIEZEL_VERSION, dan
// activate menghapus semua cache fiezel-* yang bukan CACHE -- termasuk 113 MB aset
// neural voice yang menumpang di cache yang sama.
const SW_REV='m021-corp-wrapper-20260815-1';
const ASSETS=['./','./index.html','./style.css','./version.js','./report-config.js','./core-config.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js','./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-kokoro-adapter.js','./features/neural-voice/fiezel-neural-voice.js','./features/neural-voice/fiezel-web-audio-player.js','./features/neural-voice/fiezel-neural-voice-bootstrap.js','./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js','./features/neural-voice/fiezel-neural-voice-audibility-fix.js','./features/neural-voice/fiezel-diag-panel.js','./features/speaking-listening/speaking-listening-config.js','./features/speaking-listening/fiezel-speaking-listening-addon.js','./features/speaking-listening/speaking-listening-addon.css','./features/speaking-listening/listening-bank-v1.json','./features/speaking-listening/speaking-bank-v1.json'];
const isNeuralAsset=request=>new URL(request.url).pathname.includes('/vendor/kokoro-');

// --- Cross-origin isolation (COOP/COEP) injection ---
// FIEZEL's neural voice WASM runtime is compiled with thread/shared-memory
// support and can only be instantiated when the page is "cross-origin
// isolated" (self.crossOriginIsolated === true). That requires the top
// document response to carry COOP + COEP headers. FIEZEL is hosted as
// static files with no control over server response headers, so this
// service worker adds them itself for same-origin document/script
// responses. require-corp is used instead of credentialless because
// credentialless is not supported on Safari, which FIEZEL specifically
// targets (see fiezel-neural-voice-ios-cache-fix.js).
//
// require-corp blocks cross-origin no-cors subresources unless the upstream
// response opts in through CORP (or the request succeeds through CORS). FIEZEL
// loads https://js.puter.com as its backend SDK. For no-cors requests the
// worker first attempts a readable CORS fetch; if that is unavailable it
// passes the opaque response through unchanged and lets the browser enforce
// COEP. Opaque bodies are never reconstructed as synthetic 200 responses.
const COOP_COEP_HEADERS={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'};
function withCoopCoep(response){
  if(!response)return response;
  const headers=new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy',COOP_COEP_HEADERS['Cross-Origin-Opener-Policy']);
  headers.set('Cross-Origin-Embedder-Policy',COOP_COEP_HEADERS['Cross-Origin-Embedder-Policy']);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function guessContentType(url){
  const path=url.pathname.toLowerCase();
  if(path.endsWith('.js')||path.endsWith('.mjs'))return'application/javascript; charset=utf-8';
  if(path.endsWith('.css'))return'text/css; charset=utf-8';
  return'';
}
async function fetchCrossOriginWithCorp(request){
  // KOREKSI: versi sebelumnya mengambil dalam mode no-cors lalu menyalurkan
  // response.body ke Response baru. Itu tidak bisa bekerja. Menurut spesifikasi
  // Fetch, opaque filtered response punya status 0, header list kosong, dan
  // **body null**. Jadi `new Response(response.body, {status:200})` menghasilkan
  // respons 200 OK dengan BODY KOSONG. Untuk https://js.puter.com/v2/ artinya
  // SDK Puter dimuat sebagai skrip kosong dan `puter` menjadi undefined, yang
  // mematikan fitur AI, Creator Hub, dan core worker exec -- tapi hanya dari
  // load kedua ke atas, karena pada load pertama belum ada SW yang mengontrol.
  //
  // Satu-satunya cara membaca body cross-origin adalah lewat CORS. Coba itu
  // dulu; kalau server mengirim Access-Control-Allow-Origin, body-nya terbaca
  // dan bisa dibungkus ulang dengan CORP sintetis.
  try{
    const cors=await fetch(request.url,{mode:'cors',credentials:'omit'});
    if(cors&&cors.ok&&cors.type!=='opaque'){
      const headers=new Headers(cors.headers);
      headers.set('Cross-Origin-Resource-Policy','cross-origin');
      if(!headers.get('Content-Type')){
        const guessed=guessContentType(new URL(request.url));
        if(guessed)headers.set('Content-Type',guessed);
      }
      return new Response(cors.body,{status:cors.status,statusText:cors.statusText,headers});
    }
  }catch{}
  // Server tidak mengirim header CORS. Tidak ada cara sah membaca body-nya, jadi
  // teruskan apa adanya dan biarkan browser yang memutuskan. Kalau COEP memblokir,
  // itu kegagalan yang terlihat -- jauh lebih baik daripada skrip kosong ber-200
  // yang tampak berhasil.
  return fetch(request,{mode:'no-cors',credentials:'omit'});
}

const shellRequests=()=>ASSETS.map(asset=>new Request(asset,{cache:'reload'}));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(shellRequests())).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fiezel-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const requestUrl=new URL(e.request.url);
  if(requestUrl.pathname.toLowerCase().endsWith('/version.json')){e.respondWith(fetch(e.request).then(r=>r&&r.ok?r:caches.match(e.request)).catch(()=>caches.match(e.request)));return}
  if(requestUrl.origin!==self.location.origin){
    // Third-party resource (e.g. js.puter.com): only no-cors traffic enters
    // the CORS-first compatibility path. Existing CORS-mode API requests pass
    // through untouched so Authorization/puter-auth headers are preserved.
    if(e.request.mode==='no-cors')e.respondWith(fetchCrossOriginWithCorp(e.request).catch(()=>fetch(e.request,{mode:'no-cors'})));
    return;
  }
  e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok&&!isNeuralAsset(e.request)){const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return r}).catch(error=>{if(e.request.mode==='navigate')return caches.match('./index.html');throw error})).then(r=>r&&(e.request.mode==='navigate'||/\.(?:m?js)$/i.test(requestUrl.pathname))?withCoopCoep(r):r));
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
