importScripts('./version.js');
// CACHE is the stable runtime/data cache used by neural preparation. Do not bind
// mutable application-shell generations to it: prepared neural assets must survive
// a shell release without being rewritten underneath a live document.
const CACHE=`fiezel-v${self.FIEZEL_VERSION}`;
// m025-162: rebase di atas m026-01 (maskot PAW). DIAG_BUILD + FIEZEL_PAGE_BUILD naik ke
// m025-159 di commit ini, jadi awalan SW_REV ikut naik; deskriptor menggabungkan kedua
// gelombang (reading-register + maskot) supaya jejak rilisnya jujur.
// m028: rebrand "Warm Paper, Bright Mind" fase 1 (token) + splash + onboarding. Yang
// berubah adalah style.css, index.html (blok kritis), dan fiezel-onboarding.js - ketiganya
// ada di shell, jadi revisi HARUS naik atau murid lama akan melihat cangkang berwarna lama
// di atas kode baru. Naik SEKALI untuk seluruh gelombang ini: tiap kenaikan memaksa unduh
// ulang cangkang, dan tiga kenaikan untuk satu rilis berarti tiga kali beban itu.
// m028 fase2: enam belas kelompok komponen (state, tombol, pilihan jawaban, chip,
// progress, tab, nav, kartu, hint, audio, modal, form, toggle, empty/skeleton,
// tipografi, cleanup token pastel) + berkas font baru Fredoka-var.woff2. style.css
// dan assets/fonts ada di shell, jadi revisi HARUS naik. Naik SEKALI untuk seluruh
// fase, bukan per kelompok: tiap kenaikan memaksa unduh ulang cangkang.
// Fase 2 (B3): revisi dinaikkan karena daftar precache berubah (listening adaptif + cloze
// bank) - tanpa menaikkan SW_REV, shell cache lama tetap dipakai dan berkas baru tidak
// pernah masuk precache pengguna lama.
// m025-173: lapisan game & UX overhaul ikut fase ini - ASSETS bertambah (prasasti) dan
// isi app.js/style.css/addon berubah, jadi revisi naik lagi di atas fase 2 braincore.
// MERGE 28 Agu 2026: dua jalur kerja bertemu di sini. Hulu membawa lapisan game & UX
// overhaul + braincore fase 2 (12 berkas precache baru); cabang ini membawa rollout
// Cloudflare (transport TTS, pemberitahuan suara, naskah kuota). Keduanya SAMA-SAMA
// menaikkan versi ke m025-173, jadi revisi digabung dan dinaikkan ke m025-174: dua
// perubahan daftar precache di bawah satu revisi berarti sebagian pengguna memegang
// shell campur. Daftar ASSETS adalah UNION nyata dari kedua sisi, bukan salah satunya.
const SW_REV='m025-174-game-ux-plus-rollout-cf-20260828';
const SHELL_CACHE=`fiezel-shell-${SW_REV}`;
// m025-61: health check menanyakan revisi shell langsung ke worker yang sedang aktif.
// Menebaknya dari nama cache tidak cukup: cache lama bisa tertinggal, sedangkan jawaban ini
// datang dari worker yang benar-benar melayani halaman.
self.addEventListener('message',event=>{
  if(event?.data?.type!=='FIEZEL_HEALTH_PING')return;
  const reply={type:'FIEZEL_HEALTH_PONG',swRev:SW_REV};
  // Balas lewat port yang dikirim halaman bila ada; kalau tidak, lewat klien pengirimnya.
  if(event.ports&&event.ports[0])event.ports[0].postMessage(reply);
  else event.source?.postMessage?.(reply);
});
// m025-121: lapisan mesin suara cadangan ikut di-precache sebagai KODE. Berkas model
// (vendor/supertonic-3, 152 MB) sengaja TIDAK ada di daftar ini - ia punya cache sendiri
// yang diisi pengunduh latar dan bertahan lintas rilis; memasukkannya ke shell berarti
// setiap kenaikan SW_REV mengunduh ulang seluruh 152 MB itu.
const ASSETS=['./','./index.html','./style.css','./features/mascot/fiezel-motion.css','./features/mascot/fiezel-mascot.js','./version.js','./report-config.js','./core-config.js','./fiezel-puter-ready.js','./fiezel-lazy-loader.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./grammar-labels-id.js','./grammar-explanations-id.json','./grammar-curriculum-v1.json','./writing-prompts-v1.json','./reading-exam-v1.json','./grammar-misconception-id.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js','./audio/manifest.json','./features/audio-assets/fiezel-audio-key.js','./features/audio-assets/fiezel-audio-manifest.js','./features/audio-assets/fiezel-audio-resolver.js','./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-diag-panel.js','./features/diagnostics/fiezel-diagnostic-targets.js','./features/diagnostics/fiezel-diagnostic-bus.js','./features/diagnostics/fiezel-module-selftests.js','./features/diagnostics/fiezel-diagnostic-register.js','./features/classroom/fiezel-classroom.js','./features/classroom/classroom-lessons-v1.json','./features/tutor-classroom/fiezel-tutor-v3.js','./features/tutor-classroom/tutor-v3.css','./features/speaking-listening/speaking-listening-config.js','./features/speaking-listening/gems-core.js','./features/prasasti/fiezel-prasasti-core.js','./features/speaking-listening/fiezel-speaking-listening-addon.js','./features/speaking-listening/speaking-listening-addon.css','./features/speaking-listening/listening-bank-v1.json','./features/speaking-listening/speaking-bank-v1.json','./features/speaking-listening/speaking-exam-v1.json','./features/speaking-listening/listening-exam-v1.json','./features/neural-voice/fiezel-prosody.js','./features/neural-voice/fiezel-puter-voice.js','./features/neural-voice/fiezel-subtitle.js','./features/neural-voice/fiezel-subtitle-translate.js','./features/neural-voice/fiezel-voice-say.js','./features/neural-voice/fiezel-voice-diagnostics.js','./features/neural-voice/fiezel-voice-persona.js','./features/neural-voice/fiezel-sherpa-vits-adapter.js','./features/neural-voice/fiezel-neural-voice.js','./features/neural-voice/fiezel-web-audio-player.js','./features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js','./features/neural-voice/fiezel-neural-voice-bootstrap.js','./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js','./features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js','./features/neural-voice/fiezel-neural-voice-audibility-fix.js','./features/neural-voice/fiezel-voice-offline-autoload.js','./features/ui/fiezel-zoom-lock.js','./features/ui/fiezel-back-nav.js','./features/brain/fiezel-core-brain.js','./features/ui/fiezel-icons.js','./features/ui/fiezel-coach-bubble.js','./features/ui/fiezel-report-gesture-isolation.js','./features/ui/fiezel-boot-tail.js','./features/ui/fiezel-ui-manager.js','./features/ui/fiezel-ab-testing.js','./features/ui/skeleton-helpers.js','./features/brand/fiezel-choreography.js','./features/audio/fiezel-ui-sfx.js','./features/daily-target/fiezel-daily-target.js','./features/personal-journey/fiezel-personal-journey.js','./features/skills-evidence/fiezel-skills-evidence.js','./features/academic-readiness/fiezel-academic-readiness.js','./features/continuity/fiezel-continuity.js','./features/health/fiezel-install-health.js','./features/brand/fiezel-splash.js','./features/onboarding/fiezel-onboarding.js','./features/onboarding/fiezel-tour.js','./assets/brand/fiezel-wordmark.svg','./assets/brand/fiezel-paw.svg','./assets/brand/fiezel-wordmark-mono.svg','./assets/brand/fiezel-icon-512.png','./assets/brand/fiezel-icon-192.png','./assets/brand/fiezel-icon.svg','./assets/fonts/InstrumentSerif-400.woff2','./assets/fonts/PlusJakartaSans-400.woff2','./assets/fonts/PlusJakartaSans-500.woff2','./assets/fonts/PlusJakartaSans-600.woff2','./assets/fonts/PlusJakartaSans-700.woff2',
  './assets/fonts/Fredoka-var.woff2','./features/tutor-classroom/fiezel-tutor-dialog.js','./features/tutor-classroom/fiezel-tutor-voice-chat.js','./features/library/fiezel-library.js','./features/library/fiezel-library-ui.js','./features/library/library-books-v1.json','./features/brain/fiezel-tutor-brain.js',
  // Braincore v3: sembilan modul penalaran baru ikut precache shell - PWA ini offline-first,
  // dan modul brain yang tidak ter-cache berarti murid offline kehilangan lapisan adaptifnya
  // secara diam-diam padahal berkasnya kecil dan murni fungsi.
  './features/brain/fiezel-misconception-ledger.js','./features/brain/fiezel-item-prior.js','./features/brain/fiezel-evidence-credibility.js','./features/brain/fiezel-mastery-bkt.js','./features/brain/fiezel-olm.js','./features/brain/fiezel-affect.js','./features/brain/fiezel-confusion-matrix.js','./features/brain/fiezel-step-tutor.js','./features/brain/fiezel-production-grader.js',
  // Fase 2 (B3 butir 8): modul listening adaptif + bank cloze (B6/B7). Ikut precache karena
  // dipakai kebijakan sesi offline. Ingat: cache.addAll gagal total bila salah satu 404,
  // jadi entri ini baru boleh mendarat ketika berkasnya ada di repo - dan keduanya sudah ada.
  // (Catatan alat: pwa-cache-test membaca array ini dengan regex yang berhenti di titik koma
  // pertama - jangan menaruh titik koma di dalam komentar array ini.)
  './features/brain/fiezel-listening-adaptive.js','./cloze-bank-v1.json',
  './features/neural-voice/fiezel-cf-tts-transport.js','./features/neural-voice/fiezel-cf-voice-notice.js','./features/quota/quota-copy.js'];
// m025-142 (B-11): pencocok ini SEMPAT dimatikan jadi `()=>false` dengan alasan "model lokal
// sudah dihapus". Modelnya tidak dihapus - vendor/supertonic-3 masih 152 MB dan masih disajikan
// dari origin yang sama. Selama pencocoknya mati, setiap permintaan ke berkas itu jatuh ke
// cabang terakhir fetch handler dan DITULIS diam-diam ke cache runtime: kontraknya opt-in, tetapi
// perilakunya otomatis, dan kuota perangkat murid habis tanpa ia pernah menyalakan suara neural.
//
// Batasnya sengaja satu direktori, bukan daftar ekstensi: seluruh runtime dan model besar hidup
// di bawah vendor/, tidak ada satu pun entri vendor/ di ASSETS, dan lapisan neural punya cache
// sendiri yang ia isi saat murid benar-benar meminta. Daftar ekstensi akan meleset begitu ada
// berkas model baru dengan akhiran lain.
const isNeuralAsset=request=>{
  if(!request?.url)return false;
  try{return new URL(request.url).pathname.includes('/vendor/')}catch{return false}
};
const shellScope=String(self.registration?.scope||`${self.location.origin}/`);
const shellUrls=new Set(ASSETS.map(asset=>new URL(asset,shellScope).href));
const isShellRequest=request=>request?.mode==='navigate'||shellUrls.has(new URL(request.url).href);

// m025-83 OWNER: "puter jangan dialihkan ke web lagi, itu sangat mengganggu". This USED to
// be engine-aware: Chromium got strict COOP:same-origin (crossOriginIsolated=true, so the
// neural voice WASM runtime could run multi-threaded), WebKit got same-origin-allow-popups
// (preserving the Puter sign-in popup's window.opener channel). The theory was that Chromium
// had an "isolation-capable" Puter auth path that didn't need the opener - it doesn't. Strict
// COOP:same-origin severs window.opener for ANY cross-origin popup regardless of engine, so
// on Chromium (the majority of installs) the Puter sign-in popup could never message its
// result back to the app and fell through to a full top-level navigation instead - exactly
// the "redirected to the web" escape the owner is reporting. Login now wins over the
// multi-thread optimization: every engine gets same-origin-allow-popups on navigation, so
// the popup's opener channel survives and sign-in can complete without leaving the app.
// This is a safe trade, not a regression risk: fiezel-neural-voice-bootstrap.js already
// treats crossOriginIsolated as optional (`numThreads=1`/`wasmPolicy='single-thread'` when
// it's false) because WebKit has run without it since m025-79 - Chromium now takes the same
// already-proven fallback path instead of a new, untested one. COEP stays credentialless,
// and third-party Puter traffic is never reconstructed by this SW.
const COEP_POLICY='credentialless';
function openerPolicyFor(request){return request?.mode==='navigate'?'same-origin-allow-popups':'same-origin'}
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
  // m025-150 indeks audio TIDAK boleh cache-first.
  //
  // Batch aset mendarat di antara rilis, sedangkan SHELL_CACHE hanya berganti saat SW_REV
  // naik. Kalau manifest ikut aturan shell, setiap perangkat yang sudah terpasang akan terus
  // membaca indeks lama - dan setiap kalimat yang baru dibayar ke ElevenLabs terbaca ABSENT
  // sampai ada rilis yang sama sekali tidak berhubungan. Jaringan didahulukan, salinan shell
  // tetap jadi jaring pengaman luring. Polanya sama persis dengan version.json di atas.
  if(requestUrl.pathname.toLowerCase().endsWith('/audio/manifest.json')){e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(SHELL_CACHE).then(cache=>cache.put(e.request,copy));return r}return caches.match(e.request,{cacheName:SHELL_CACHE}).then(c=>c||r)}).catch(()=>caches.match(e.request,{cacheName:SHELL_CACHE})));return}
  if(requestUrl.origin!==self.location.origin){
    // Third-party SDK/API traffic is deliberately left to the browser. The
    // document uses COEP: credentialless, so no-cors resources such as Puter.js
    // can load without the service worker reconstructing or proxying opaque bodies.
    return;
  }
  let responsePromise;
  if(e.request.mode==='navigate'){
    // Installed-PWA startup is recovery-first: validate a fresh network document
    // before trusting the revisioned shell entry. A blank/stale cached navigation
    // can therefore self-heal online; offline launch still falls back to the exact
    // current generation's index.html and never borrows legacy runtime-shell bytes.
    const freshRequest=new Request(e.request,{cache:'reload'});
    responsePromise=fetch(freshRequest).then(r=>{
      if(r&&r.ok){
        const copy=r.clone();
        caches.open(SHELL_CACHE).then(cache=>cache.put(e.request,copy));
        return r;
      }
      return caches.match('./index.html',{cacheName:SHELL_CACHE}).then(c=>c||r);
    }).catch(()=>caches.match('./index.html',{cacheName:SHELL_CACHE}));
  }else if(isNeuralAsset(e.request)){
    // Neural runtime/model/voice assets are owned by the neural prepare layer and
    // stay in the stable runtime cache. A shell release never precaches/rewrites them.
    responsePromise=caches.match(e.request,{cacheName:CACHE}).then(c=>c||fetch(e.request));
  }else if(isShellRequest(e.request)){
    // Non-navigation shell assets remain cache-first within this exact generation.
    // Missing shell bytes are refetched into this generation, never borrowed from
    // legacy shell entries that still happen to exist in the stable runtime cache.
    responsePromise=caches.match(e.request,{cacheName:SHELL_CACHE}).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(SHELL_CACHE).then(cache=>cache.put(e.request,copy))}return r}));
  }else{
    responsePromise=caches.match(e.request,{cacheName:CACHE}).then(c=>c||fetch(e.request).then(r=>{if(r&&r.ok&&!isNeuralAsset(e.request)){const copy=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,copy))}return r}));
  }
  e.respondWith(responsePromise.then(r=>r&&(e.request.mode==='navigate'||/\.(?:m?js)$/i.test(requestUrl.pathname))?withCoopCoep(r,e.request):r));
});

self.addEventListener('periodicsync',e=>{if(e.tag==='fiezel-update-check')e.waitUntil(self.registration.update().catch(()=>{}))});

// m025-103: jendela yang sudah terbuka DIARAHKAN, bukan sekadar difokuskan.
// Sebelumnya tab yang sudah ada selalu menang, jadi notifikasi masukan pengguna yang
// menunjuk ke dasbor kreator hanya memunculkan aplikasi belajar - kabar sampai, tetapi
// tujuannya tidak. Untuk pengingat belajar url-nya './' sehingga perilakunya tidak
// berubah; navigate() juga tidak selalu tersedia, jadi fokus tetap jadi cadangan.
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||'./';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const client of list){if(typeof client.navigate==='function'&&url&&url!=='./'){return client.navigate(url).then(c=>(c&&c.focus?c.focus():client.focus())).catch(()=>client.focus())}if('focus'in client)return client.focus()}return clients.openWindow?clients.openWindow(url):undefined}))});

self.addEventListener('push',event=>{
  // m025-117: service worker tidak punya akses ke state murid, jadi teks cadangan di sini
  // TIDAK boleh menyebut nama siapa pun. Sapaan bernama datang dari payload push yang
  // memang membawanya; cadangan ini hanya berlaku saat payload-nya kosong atau rusak.
  let payload={title:'FIEZEL · Reminder belajar',body:'Waktunya kembali ke sesi belajar.',url:'./',tag:'fiezel-remote'};
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
