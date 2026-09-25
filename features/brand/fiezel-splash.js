/**
 * FIEZEL — splash pembuka v4 "ALUR OTOMATIS: FORMASI PARTIKEL → CAP PAW →
 * ONBOARDING" (ORKESTRATOR, porting dari prototipe pau-redesign/splash-prototype).
 *
 * Ruling OWNER 2026-08-28 (OA-6): splash lama (F berkelip + sheen emas)
 * DIGANTI SELURUHNYA. Alur baru mengalir otomatis tanpa tombol:
 *
 *   0–950     logo F terbentuk dari AWAN PARTIKEL (modul fiezel-splash-particles)
 *   820–944   crossfade SVG F tajam masuk (easeOut — penuh SEBELUM 950)
 *   700–1150  partikel batang emas merapat; SVG batang masuk 1060–1150
 *   1150      'bars-solid' → equalizer mulai (modul fiezel-splash-equalizer)
 *   1150–1900 dua batang memantul sinkron tabel ketukan (m025-86: SATU jam)
 *   1200–1500 wordmark KECIL tersingkap di bawah
 *   1900      equalizer settle 240ms → 2140 batang tepat proporsi logo
 *   2200      CAP PAW menghentak OTOMATIS (modul fiezel-splash-pawstamp) →
 *             'onboarding-enter' @ ~3030 → splash menutup; app tersingkap
 *
 * PUTUSAN OWNER 2026-08-28 (bunyi): paw_greet.ogg adalah SUARA KHAS FIEZEL —
 * hentakan cap membunyikan paw_greet, BUKAN stamp_thud (pensiun, berkas tetap
 * dikirim tetapi tidak ada yang memicunya). Nada pembuka memakai berkas
 * splash_intro.ogg. Keduanya diputar lewat fasad features/audio/fiezel-ui-sfx.js
 * (preferensi bunyi + kebijakan autoplay ditangani di sana, bukan di sini).
 *
 * Tiga batas lama TETAP dijaga (alasannya sudah dibayar mahal):
 * 1. TIDAK PERNAH MENGHALANGI GERBANG NOTIFIKASI — splash menutup sendiri
 *    lewat pewaktu pengaman DAN lewat event cap DAN lewat sentuhan.
 * 2. SEKALI PER HARI (kunci hari WIB, sama dengan modul perjalanan belajar).
 * 3. MENGHORMATI KURANGI-GERAK — jalur statis: komposisi akhir tampil diam,
 *    lalu cap versi pudar-masuk (tanpa hentakan) → app (~740ms).
 *
 * m025-84 tetap berlaku: splash frame-pertama dipasang statis di index.html
 * dan modul ini MENGADOPSINYA (BOOT_ATTR). Karena boot yang lambat sudah
 * "memakai" sebagian umur tayang, jam koreografi ikut DILONCATKAN sebesar
 * waktu yang sudah lewat (clock mulai pada VISIBLE_MS − visibleMs) sehingga
 * penonton tidak pernah menunggu dua kali.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSplash = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // i18n (AI-02 F01): naskah murid modul ini pindah ke features/i18n/copy-id-feat-a.js.
  // Di browser, fiezel-i18n.js + copy-map dimuat lebih dulu lewat urutan <script defer>
  // di index.html (AI-01 F02), jadi FiezelI18n dipakai langsung tanpa guard. Di Node
  // (tes print-only me-require modul ini), copy-map dimuat lewat require supaya nilai
  // 'id' tetap SATU sumber yang byte-identik dengan naskah beku gerbang emas.
  var I18N = (typeof FiezelI18n !== 'undefined') ? FiezelI18n
    : ((typeof module === 'object' && module.exports) ? require('../i18n/copy-id-feat-a.js') : null);
  function t(key, params) { return I18N.t(key, params); }

  var STORAGE_KEY = 'fiezel-splash-seen-v1';
  // v4: gerak selesai 2140, cap mulai 2200, cap rampung 2200+1360=3560 —
  // umur tayang = tepat akhir koreografi cap; tidak ada detik mati.
  var VISIBLE_MS = 3560;
  // Splash frame-pertama yang dipasang statis di index.html. Atribut inilah
  // kontraknya: selama namanya sama, modul ini mengadopsi elemen itu.
  var BOOT_ATTR = 'data-fiezel-boot-splash';
  var BOOT_SELECTOR = '[' + BOOT_ATTR + ']';
  var BOOT_CLAIMED_ATTR = 'data-fiezel-boot-claimed';
  var BOOTING_CLASS = 'fz-booting';
  // Sisa minimum setelah adopsi = durasi penuh koreografi cap PAW (1360ms):
  // boot selambat apa pun, penonton selalu mendapat hentakan cap yang utuh.
  var MIN_TAIL_MS = 1360;
  var COPY = Object.freeze({
    word: 'FIEZEL',
    kelasku: 'KelasKu',
    tagline: 'untuk Guru'
  });

  /* Garis waktu master v4 — nilai teruji QA prototipe (crossfade mengikuti
     timing modul partikel; settle & cap dari CONTRACT prototipe). */
  var TL = {
    F_IN0: 820, F_IN1: 944,   // SVG F tajam masuk — penuh sebelum ketukan 950
    B_IN0: 1060, B_IN1: 1150, // SVG batang masuk — pejal tepat @1150
    WORD0: 1200, WORD1: 1500, // wordmark kecil naik di bawah
    SETTLE: 1900,             // equalizer settle (240ms → 2140)
    STAMP0: 2200              // cap PAW otomatis — penutup splash
  };
  var SKIP_STALE_MS = 120; // penjaga basi ketukan bersuara saat jam meloncat

  /* ------------------------------------------------------------------
     MODUL PENDUKUNG — dicari di env dulu (kontrak env-first repo), lalu
     global, lalu require (jalur Node/tes). Semuanya opsional: tanpa modul,
     splash jatuh ke jalur pewaktu polos (perilaku aman lama).
     ------------------------------------------------------------------ */
  var REQ = {
    FiezelChoreography: './fiezel-choreography.js',
    FiezelSplashParticles: './fiezel-splash-particles.js',
    FiezelSplashEqualizer: './fiezel-splash-equalizer.js',
    FiezelSplashPawstamp: './fiezel-splash-pawstamp.js'
  };
  function mod(env, name) {
    try { if (env && env[name]) return env[name]; } catch (_) {}
    try { if (typeof globalThis !== 'undefined' && globalThis[name]) return globalThis[name]; } catch (_) {}
    try { if (typeof require === 'function' && REQ[name]) return require(REQ[name]); } catch (_) {}
    return null;
  }

  /* ------------------------------------------------------------------
     BUNYI — semuanya lewat fasad fiezel-ui-sfx (mute/preferensi/autoplay
     miliknya). Kegagalan ditelan diam-diam: splash harus utuh tanpa bunyi.
     ------------------------------------------------------------------ */
  function playSfx(env, name) {
    try {
      if (!env || !env.FiezelUiSfx || typeof env.FiezelUiSfx.play !== 'function') return false;
      return env.FiezelUiSfx.play(name, env) === true;
    } catch (_) { return false; }
  }
  /**
   * Nada pembuka splash_intro - SATU titik masuk per tayangan (audit 2026-08-28).
   * Dulu ada dua jalur dan dua-duanya mati di produksi: (1) ketukan t=0 dibuang
   * penjaga basi karena jam mulai pada startOffset ≈ waktu boot (selalu > 120 ms
   * di boot nyata - load() mengunduh ~2,7 MB JSON dulu); (2) panggilan langsung
   * disyaratkan !motion, yang false di semua peramban berfungsi. Akibatnya
   * splash_intro TIDAK PERNAH diminta, bahkan di lingkungan yang MENGIZINKAN
   * autoplay (PWA terpasang). Kini fasad playOnce() mencoba TANPA GESTUR lebih
   * dulu, lalu menyiagakan dengan tenggat umur splash bila terblokir; play()
   * lama tetap dipakai bila fasad belum punya playOnce (deploy parsial).
   */
  function requestIntro(env, windowMs) {
    try {
      var facade = env && env.FiezelUiSfx;
      if (!facade) return false;
      if (typeof facade.playOnce === 'function') return facade.playOnce('splash_intro', env, { windowMs: windowMs }) === true;
      if (typeof facade.play === 'function') return facade.play('splash_intro', env) === true;
    } catch (_) { /* splash harus utuh tanpa bunyi */ }
    return false;
  }
  function cancelChime(env) {
    try { if (env && env.FiezelUiSfx && typeof env.FiezelUiSfx.cancelPending === 'function') env.FiezelUiSfx.cancelPending(); }
    catch (_) { /* membatalkan bunyi tidak boleh menggagalkan penutupan splash */ }
  }

  /**
   * Splash frame-pertama dari index.html, kalau ada dan belum diklaim.
   */
  function bootSplashElement(env) {
    try {
      var doc = env && env.document;
      if (!doc || typeof doc.querySelector !== 'function') return null;
      var node = doc.querySelector(BOOT_SELECTOR);
      if (!node) return null;
      if (typeof node.getAttribute === 'function' && node.getAttribute(BOOT_CLAIMED_ATTR)) return null;
      return node;
    } catch (_) { return null; }
  }

  /** Melepas latar gelap boot supaya warna aplikasi asli kembali saat splash memudar. */
  function endBootBackground(env) {
    try {
      var rootEl = env && env.document && env.document.documentElement;
      if (rootEl && rootEl.classList && typeof rootEl.classList.remove === 'function') rootEl.classList.remove(BOOTING_CLASS);
    } catch (_) { /* tanpa ini aplikasi tetap jalan, hanya latarnya gelap sebentar */ }
  }

  /**
   * Membuang splash frame-pertama tanpa menampilkannya (sudah disapa hari ini).
   */
  function disposeBootSplash(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var node = bootSplashElement(target);
    endBootBackground(target);
    if (!node) return false;
    try { if (typeof node.setAttribute === 'function') node.setAttribute(BOOT_CLAIMED_ATTR, 'disposed'); } catch (_) {}
    try { if (node.parentNode) node.parentNode.removeChild(node); } catch (_) {}
    return true;
  }

  /**
   * Berapa lama splash frame-pertama sudah tampil (stempel `__fiezelBootSplashAt`
   * ditulis index.html pada frame pertama).
   */
  function bootSplashElapsed(env) {
    try {
      var startedAt = Number(env && env.__fiezelBootSplashAt);
      if (!isFinite(startedAt)) return 0;
      var perf = env && env.performance;
      if (!perf || typeof perf.now !== 'function') return 0;
      var elapsed = Number(perf.now()) - startedAt;
      return isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
    } catch (_) { return 0; }
  }

  function dayKey(now) {
    // Hari WIB, sama seperti modul perjalanan belajar, supaya "sekali sehari"
    // berarti hal yang sama di seluruh aplikasi.
    return new Date(Number(now) + 7 * 3600000).toISOString().slice(0, 10);
  }

  function seenToday(env, now) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return false;
      return String(store.getItem(STORAGE_KEY) || '') === dayKey(now);
    } catch (_) { return false; }
  }

  function markSeen(env, now) {
    try {
      var store = env && env.localStorage;
      if (store && typeof store.setItem === 'function') store.setItem(STORAGE_KEY, dayKey(now));
    } catch (_) { /* penyimpanan penuh tidak boleh menggagalkan pembukaan aplikasi */ }
  }

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  /* Kontur topografi identik dengan auth login live (fiezel-auth-screen.js). */
  var TOPO = 'M121 120C122 123 118 128 115 131C112 133 106 134 102 134C98 135 94 136 90 135C85 135 76 135 74 132C72 130 77 124 77 120C78 116 77 113 79 110C81 107 84 103 88 102C92 101 100 101 103 103C107 104 107 109 110 112C113 115 121 117 121 120Z|M146 120C147 126 140 137 134 141C127 146 116 144 107 147C98 149 90 155 82 155C73 154 59 149 55 143C52 137 57 127 58 120C59 113 59 107 63 101C66 95 72 83 80 81C88 79 101 86 109 89C117 93 120 98 127 103C133 108 145 114 146 120Z|M171 120C172 131 164 146 154 153C144 159 126 154 112 159C98 163 83 180 71 179C59 178 45 162 39 152C33 142 35 130 35 120C36 110 38 101 44 91C50 80 59 60 70 58C82 56 100 73 113 78C126 84 139 83 149 90C159 97 171 109 171 120Z|M197 120C197 135 188 156 175 165C161 173 137 166 118 173C99 180 75 210 60 208C44 205 33 175 25 161C16 146 10 134 9 120C9 106 14 93 22 78C31 64 44 35 60 34C76 32 98 61 118 68C137 75 163 66 177 74C190 83 198 105 197 120Z|M225 120C223 140 209 163 193 175C177 187 151 183 126 193C102 203 67 240 48 236C28 232 21 188 10 169C-1 150 -16 138 -19 120C-21 102 -16 81 -4 63C7 45 30 13 51 12C72 11 97 47 123 55C149 62 190 46 207 57C224 68 228 100 225 120Z|M257 120C252 144 228 167 208 183C188 200 167 209 138 221C110 234 62 268 37 261C13 254 6 203 -8 179C-22 156 -42 142 -47 120C-52 98 -53 65 -38 44C-23 23 16 -3 44 -4C73 -6 99 28 131 35C163 43 217 26 238 40C259 54 262 96 257 120Z|M292 120C284 148 243 167 220 190C197 214 186 244 154 259C122 274 60 291 29 280C-1 269 -14 219 -31 192C-49 166 -69 148 -76 120C-84 92 -97 44 -77 22C-58 -1 4 -11 40 -14C77 -16 105 1 143 7C181 13 242 5 266 23C291 42 299 92 292 120Z|M328 120C318 152 259 167 233 197C207 228 208 289 173 305C138 320 63 309 24 293C-15 277 -38 237 -60 208C-82 180 -98 155 -108 120C-118 85 -144 21 -120 -2C-96 -26 -8 -14 38 -19C85 -24 116 -35 159 -30C201 -26 265 -17 293 8C321 34 338 88 328 120Z|M349 70C349 73 346 76 344 78C341 80 338 79 334 81C331 82 325 88 323 88C320 87 319 80 318 77C316 74 314 73 313 70C313 67 313 64 315 61C316 59 320 54 323 54C326 54 330 60 334 61C338 62 344 59 347 60C350 62 350 67 349 70Z|M371 70C369 76 361 80 356 85C351 89 348 93 341 96C334 100 321 108 315 106C309 104 308 90 305 84C302 78 296 76 295 70C293 64 291 55 295 50C298 45 310 40 318 40C325 40 330 48 339 49C347 51 361 46 366 49C372 53 372 64 371 70Z|M395 70C392 79 374 82 367 91C359 99 360 114 351 119C341 124 319 125 309 121C299 116 295 102 289 93C283 85 278 80 275 70C272 60 263 42 269 36C276 29 301 31 314 30C326 30 334 30 346 32C358 33 378 32 386 38C394 45 398 61 395 70Z|M422 70C417 82 389 84 379 98C369 111 376 144 363 150C351 156 319 141 304 134C288 126 277 116 268 105C259 94 255 84 250 70C245 56 230 27 240 19C250 11 291 25 310 23C330 21 340 5 357 6C373 7 397 15 408 26C418 37 427 58 422 70Z|M446 70C440 86 408 89 397 108C386 127 393 177 377 183C361 189 321 156 299 145C277 134 259 130 245 118C232 106 223 89 218 70C212 51 198 13 213 3C227 -6 280 18 307 14C333 9 349 -24 369 -24C390 -24 417 -2 430 13C442 29 451 54 446 70Z|M315 300C315 302 312 303 311 306C309 309 309 315 306 315C304 316 299 312 296 310C293 309 290 309 288 307C286 305 284 303 283 300C283 297 282 293 285 291C287 290 293 293 297 292C300 291 303 286 306 286C309 286 312 290 314 292C315 294 316 298 315 300Z|M328 300C328 305 330 310 327 316C325 321 319 329 313 330C307 331 297 324 291 321C285 319 280 318 275 314C269 311 261 305 260 300C260 295 267 288 272 284C278 281 285 282 292 280C298 278 306 270 312 271C318 271 327 278 330 283C332 288 329 295 328 300Z|M341 300C342 310 358 323 354 330C350 338 330 343 318 344C307 345 295 340 285 337C275 333 267 330 258 324C249 318 228 307 229 300C230 293 254 286 263 279C272 273 274 265 284 261C293 256 308 252 319 254C330 256 345 265 349 272C352 280 340 290 341 300Z'.split('|');
  function topoMarkup() {
    return '<svg class="fz-auth-topo" viewBox="0 0 390 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">'
      + TOPO.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  }

  /**
   * Logo v4 — SVG sebaris, geometri persis assets/brand/fiezel-icon.svg dan
   * PERSIS tabel RECTS modul partikel: SVG tajam ini di-crossfade tepat di
   * atas formasi partikel, jadi satu unit pun geometri tidak boleh berbeda.
   * Palet v4 terkunci: F krem #FFF4DA polos, batang gradien #FFD94F→#F0C241.
   * TANPA sheen/halo/glow (ruling OWNER — lapisan kilau lama dihapus).
   */
  function logoMarkup() {
    return '<svg class="fiezel-logo" viewBox="0 0 512 512" role="img" aria-label="FIEZEL">'
      + '<defs>'
      + '<linearGradient id="fzsGold" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#FFD94F"/><stop offset="100%" stop-color="#F0C241"/></linearGradient>'
      + '</defs>'
      + '<g class="fz-fgroup" fill="#FFF4DA">'
      + '<rect class="fz-f fz-f1" x="136" y="148" width="42"  height="216" rx="20"/>'
      + '<rect class="fz-f fz-f2" x="136" y="148" width="128" height="42"  rx="20"/>'
      + '<rect class="fz-f fz-f3" x="136" y="230" width="102" height="40"  rx="19"/>'
      + '</g>'
      + '<g class="fz-barsgroup" fill="url(#fzsGold)">'
      + '<rect class="fz-bar fz-bar1" x="298" y="200" width="34" height="112" rx="17"/>'
      + '<rect class="fz-bar fz-bar2" x="348" y="166" width="34" height="180" rx="17"/>'
      + '</g>'
      + '</svg>';
  }

  /**
   * Wordmark FIEZEL. Digambar dari sistem huruf yang sama dengan logoMarkup() -
   * monoline 42 unit, ujung membulat penuh. Sumber tunggalnya
   * tools/build-wordmark.mjs; berkas SVG-nya ada di assets/brand.
   *
   * Huruf I adalah motif logo: DUA batang emas dengan tinggi berbeda (lebar 26,
   * celah 22 - teruji bertahan sampai 96px).
   *
   * `idPrefix` wajib unik per pemakaian dalam satu halaman: id gradien bersifat
   * global di dokumen.
   */
  function wordmarkMarkup(idPrefix) {
    var p = String(idPrefix || 'fzw');
    return '<svg class="fiezel-wordmark" viewBox="0 0 1000 260" role="img" aria-label="FIEZEL">'
      + '<defs>'
      + '<linearGradient id="' + p + 'Iv" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#FFFBF3"/><stop offset="100%" stop-color="#EBDBC0"/></linearGradient>'
      + '<linearGradient id="' + p + 'Go" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#FFD94F"/><stop offset="45%" stop-color="#F5CE45"/>'
      + '<stop offset="100%" stop-color="#F0C241"/></linearGradient>'
      + '</defs>'
      + '<g fill="url(#' + p + 'Iv)">'
      + '<rect x="30" y="30" width="42" height="200" rx="21"/>'
      + '<rect x="30" y="30" width="144" height="42" rx="21"/>'
      + '<rect x="30" y="109" width="116" height="42" rx="21"/>'
      + '<rect x="300" y="30" width="42" height="200" rx="21"/>'
      + '<rect x="300" y="30" width="144" height="42" rx="21"/>'
      + '<rect x="300" y="109" width="100" height="42" rx="21"/>'
      + '<rect x="300" y="188" width="130" height="42" rx="21"/>'
      + '<rect x="478" y="30" width="150" height="42" rx="21"/>'
      + '<rect x="478" y="188" width="150" height="42" rx="21"/>'
      + '<rect x="607" y="30" width="191.38" height="42" rx="21" transform="rotate(124.354 607 51)"/>'
      + '<rect x="662" y="30" width="42" height="200" rx="21"/>'
      + '<rect x="662" y="30" width="144" height="42" rx="21"/>'
      + '<rect x="662" y="109" width="100" height="42" rx="21"/>'
      + '<rect x="662" y="188" width="130" height="42" rx="21"/>'
      + '<rect x="840" y="30" width="42" height="200" rx="21"/>'
      + '<rect x="840" y="188" width="130" height="42" rx="21"/>'
      + '</g>'
      + '<g fill="url(#' + p + 'Go)">'
      + '<rect x="192" y="30" width="26" height="200" rx="13"/>'
      + '<rect x="240" y="106" width="26" height="124" rx="13"/>'
      + '</g>'
      + '</svg>';
  }

  /**
   * Markup isi splash v4: kanvas partikel (paling bawah), SVG logo tajam
   * (di-crossfade JS di atas formasi partikel), lalu slot wordmark kecil +
   * tagline di bawah. TANPA kartu, TANPA tombol — splash mengalir otomatis.
   */
  function kelaskuMarkup() {
    return '<div class="fiezel-splash-kelasku">'
      + '<div class="kelasku-brand">'
      + '<span class="kelasku-wordmark">' + COPY.kelasku + '</span>'
      + '<span class="kelasku-tag">' + COPY.tagline + '</span>'
      + '</div>'
      + '</div>';
  }

  function markup() {
    return '<div class="fiezel-splash-body fiezel-splash-brand">'
      + topoMarkup()
      + '<canvas class="fz-splash-canvas" aria-hidden="true"></canvas>'
      + logoMarkup()
      + '<div class="fiezel-splash-word">'
      + wordmarkMarkup('fzs')
      + kelaskuMarkup()
      + '</div>'
      + '</div>';
  }

  /* ====================================================================
     JAM KOREOGRAFI — SATU jam rAF per tayangan (konvensi m025-86: gerak
     dan bunyi membaca garis waktu yang sama; modul TIDAK memanggil
     requestAnimationFrame sendiri). Porting dari FZSplash.clock prototipe;
     di sini dibuat per-show (bukan global) supaya env-first dan bisa diuji.
     ==================================================================== */
  function makeClock(env) {
    var perf = env.performance;
    var raf = typeof env.requestAnimationFrame === 'function'
      ? function (fn) { return env.requestAnimationFrame(fn); } : null;
    var caf = typeof env.cancelAnimationFrame === 'function'
      ? function (id) { env.cancelAnimationFrame(id); } : function () {};
    var t0 = 0, last = 0, playing = false, frozen = null, rafId = 0;
    var frames = [], scheds = [];

    function now() { return frozen != null ? frozen : (playing ? perf.now() - t0 : last); }
    function fireDue(t) {
      for (var i = 0; i < scheds.length; i++) {
        var s = scheds[i];
        if (!s.fired && t >= s.t) { s.fired = true; s.fn(s.t); }
      }
    }
    function framePass(t, dt) { for (var i = 0; i < frames.length; i++) frames[i](t, dt); }
    function tick() {
      rafId = 0;
      if (!playing) return;
      var t = now(), dt = t - last; last = t;
      fireDue(t);
      framePass(t, dt);
      rafId = raf(tick);
    }

    return {
      now: now,
      schedule: function (t, fn) {
        scheds.push({ t: t, fn: fn, fired: false });
        scheds.sort(function (a, b) { return a.t - b.t; }); // susul-terlewat tetap urut waktu
      },
      onFrame: function (fn) { frames.push(fn); },
      /* start(offset): jam mulai pada `offset` ms — adopsi splash boot yang
         lambat MELONCATI bagian yang sudah "dipakai" boot, bukan mengulang. */
      start: function (offset) {
        frozen = null;
        t0 = perf.now() - (offset || 0); last = offset || 0; playing = true;
        if (!rafId) rafId = raf(tick);
      },
      jumpTo: function (t) { if (frozen == null) t0 = perf.now() - t; },
      /* freeze(t): mode debug ?t= — dua lintasan frame supaya urutan event
         partikel → jadwal settle sama dengan pemutaran nyata. */
      freeze: function (t) {
        playing = false; frozen = t; last = t;
        if (rafId) { caf(rafId); rafId = 0; }
        framePass(t, 16.7);
        fireDue(t);
        framePass(t, 16.7);
      },
      stop: function () {
        playing = false; last = now();
        if (rafId) { caf(rafId); rafId = 0; }
      }
    };
  }

  /* ====================================================================
     SUMBER LEVEL EQUALIZER — diturunkan dari tabel ketukan koreografi
     (fiezel-choreography.js, bar:1/bar:2). Amplop per ketukan: serangan
     smoothstep 70ms lalu peluruhan eksponensial; jumlah level disaturasi
     lembut supaya ketukan bertumpuk tidak meledak melewati klem batang.
     Ini padanan visual dari berkas splash_intro.ogg — equalizer tetap
     sinkron tabel MESKIPUN audio dibisukan (kontrak prototipe).
     ==================================================================== */
  function smoothstep01(x) {
    if (x < 0) x = 0; else if (x > 1) x = 1;
    return x * x * (3 - 2 * x);
  }
  function makeGetLevels(beats) {
    var hits = [[], []]; // [0]=.fz-bar1, [1]=.fz-bar2
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      if (b.bar !== 1 && b.bar !== 2) continue;
      hits[b.bar - 1].push({ at: b.at, dur: b.dur, gain: b.gain || 1 });
    }
    return function (u) {
      var lv = [0, 0];
      for (var k = 0; k < 2; k++) {
        var acc = 0;
        for (var j = 0; j < hits[k].length; j++) {
          var h = hits[k][j];
          var dt = u - h.at;
          if (dt < 0) continue;
          var atk = dt < 70 ? smoothstep01(dt / 70) : 1;
          var rel = Math.exp(-Math.max(0, dt - 70) / Math.max(80, h.dur / 3));
          acc += h.gain * atk * rel;
        }
        /* Saturasi lembut + pudar menjelang settle (1900–2100). */
        var level = 1 - Math.exp(-1.35 * acc);
        level *= 1 - smoothstep01((u - TL.SETTLE) / 200);
        lv[k] = level;
      }
      return lv;
    };
  }

  /* ====================================================================
     JALUR GERAK PENUH — menjahit partikel + equalizer + cap PAW pada satu
     jam. Mengembalikan true bila jalur gerak benar-benar berjalan; false
     berarti pemanggil memakai jalur pewaktu polos (env tanpa DOM penuh,
     mis. fake env di tes Node — kontrak lama tidak boleh patah).
     ==================================================================== */
  function startMotion(env, host, ctl) {
    var doc = env.document;
    if (!doc || typeof env.setTimeout !== 'function') return false;
    if (!env.performance || typeof env.performance.now !== 'function') return false;
    if (typeof env.requestAnimationFrame !== 'function') return false;
    if (!host || typeof host.querySelector !== 'function') return false;

    var CHOREO = mod(env, 'FiezelChoreography');
    var particles = mod(env, 'FiezelSplashParticles');
    var equalizer = mod(env, 'FiezelSplashEqualizer');
    var pawstamp = mod(env, 'FiezelSplashPawstamp');
    if (!CHOREO || !particles || !equalizer || !pawstamp) return false;

    var canvas = host.querySelector('.fz-splash-canvas');
    var logoSvg = host.querySelector('.fiezel-logo');
    var fGroup = host.querySelector('.fz-fgroup');
    var barsGroup = host.querySelector('.fz-barsgroup');
    var wordSlot = host.querySelector('.fiezel-splash-word');
    if (!canvas || typeof canvas.getContext !== 'function') return false;
    if (!logoSvg || !logoSvg.style || !fGroup || !fGroup.style || !barsGroup || !barsGroup.style) return false;
    if (!wordSlot || !wordSlot.style) return false;

    /* Parameter debug QA (paritas prototipe): ?t= bekukan jam; ?still=
       ditangani pemanggil. Hanya dibaca bila URLSearchParams tersedia. */
    var tParam = null;
    try {
      if (env.location && typeof env.URLSearchParams === 'function') {
        var q = new env.URLSearchParams(env.location.search || '');
        if (q.has('t')) tParam = Math.max(0, parseInt(q.get('t'), 10) || 0);
      }
    } catch (_) { tParam = null; }
    var frozenMode = tParam !== null;
    ctl.frozen = frozenMode;

    /* Pub/sub mungil — modul partikel memancarkan 'f-locked'/'bars-solid'
       lewat suntikan emit; cap memancarkan 'onboarding-enter'. */
    var listeners = {};
    var events = {
      on: function (name, fn) { (listeners[name] = listeners[name] || []).push(fn); },
      emit: function (name, detail) {
        var l = listeners[name]; if (!l) return;
        for (var i = 0; i < l.length; i++) { try { l[i](detail); } catch (_) {} }
      }
    };

    var clock = makeClock(env);
    ctl.clock = clock;

    function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
    function ramp(t, a, b) { return clamp01((t - a) / (b - a)); }
    function easeOutCubic(p) { var s = 1 - p; return 1 - s * s * s; }

    /* TATA LETAK — rumus IDENTIK dengan particles.init (kotak 512 dipusatkan,
       tinggi 62% sisi terpendek) supaya SVG tajam menumpuk piksel-persis di
       atas target partikel. JS menimpa posisi CSS dengan px persis. */
    function layout() {
      var w = host.clientWidth || 0, h = host.clientHeight || 0;
      if (!w || !h) return;
      var box = Math.min(w, h) * 0.62;
      var scale = box / 512;
      logoSvg.style.position = 'absolute';
      logoSvg.style.left = ((w - 512 * scale) / 2) + 'px';
      logoSvg.style.top = ((h - 512 * scale) / 2) + 'px';
      logoSvg.style.width = (512 * scale) + 'px';
      logoSvg.style.height = (512 * scale) + 'px';
    }

    /* FRAME — semua opasitas/transform dihitung MURNI dari t (parametrik):
       scrub, lompat, dan adopsi-terlambat selalu konsisten. */
    function perFrame(t, dt) {
      particles.update(t, dt);
      fGroup.style.opacity = easeOutCubic(ramp(t, TL.F_IN0, TL.F_IN1)).toFixed(3);
      barsGroup.style.opacity = ramp(t, TL.B_IN0, TL.B_IN1).toFixed(3);
      equalizer.update(t, dt);
      var pw = easeOutCubic(ramp(t, TL.WORD0, TL.WORD1));
      wordSlot.style.opacity = pw.toFixed(3);
      /* Hanya translateY: pemusatan horizontal milik CSS (margin:0 auto). */
      wordSlot.style.transform = 'translateY(' + ((1 - pw) * 14).toFixed(2) + 'px)';
    }

    /* JADWAL — ketukan bersuara dibaca dari tabel koreografi (sumber tunggal
       ritme, m025-86). splash_intro.ogg jatuh pada ketukan pertama; penjaga
       basi mencegah nada terlambat menyusul setelah jam meloncat (adopsi
       lambat / sentuh-lewati): bunyi yang lewat DIBUANG, bukan diantre. */
    function buildSchedules() {
      var beats = CHOREO.BEATS || [];
      for (var i = 0; i < beats.length; i++) {
        (function (b) {
          if (!b.sound || !b.strong) return;
          /* splash_intro TIDAK lagi dipicu dari ketukan (audit 2026-08-28): jam
             mulai pada startOffset ≈ waktu boot, sehingga ketukan t=0 SELALU
             basi di boot nyata - itulah akar "SFX splash tidak pernah berbunyi".
             Titik masuknya kini satu: requestIntro() di show(). Ketukannya tetap
             di tabel sebagai metadata visual (equalizer + tes koreografi). */
          if (b.sound === 'splash_intro') return;
          clock.schedule(b.at, function (tAt) {
            if (clock.now() - tAt <= SKIP_STALE_MS) playSfx(env, b.sound);
          });
        })(beats[i]);
      }
      clock.schedule(TL.SETTLE, function (tAt) { equalizer.settle(tAt); });
      clock.schedule(TL.STAMP0, function () {
        if (frozenMode) return;
        ctl.stampStarted = true;
        pawstamp.play();
      });
    }

    /* Cap PAW rampung → splash menutup DI BALIK scrim cap (nol frame mati). */
    events.on('onboarding-enter', function () {
      clock.stop();
      ctl.finish();
    });

    /* Semantik lewati v4 (tap ATAU Enter/Spasi):
         t < SETTLE          → lompat ke 1900 (settle tampil, cap tetap @2200)
         SETTLE ≤ t < STAMP0 → lompat langsung ke 2200 (cap mulai seketika)
         cap sedang main     → rampungkan seketika (pawstamp.skip())
         sudah menutup/beku  → tidak ada apa-apa */
    ctl.skip = function () {
      if (frozenMode || !ctl.ready) return;
      if (ctl.stampStarted) { pawstamp.skip(); return; }
      var t = clock.now();
      if (t < TL.SETTLE) {
        clock.jumpTo(TL.SETTLE);
        particles.update(TL.SETTLE, 16.7);
      } else {
        clock.jumpTo(TL.STAMP0); // jadwal STAMP0 menyusul di tick berikut
      }
    };

    var onResize = function () {
      layout();
      /* Kanvas hanya perlu ditata ulang selama partikel masih hidup. */
      if (clock.now() < particles.T.DONE) particles.init(canvas, { emit: events.emit });
    };
    try { env.addEventListener && env.addEventListener('resize', onResize); } catch (_) {}
    ctl.cleanup.push(function () {
      try { env.removeEventListener && env.removeEventListener('resize', onResize); } catch (_) {}
      clock.stop();
    });

    /* Boot gerak: sampling target partikel (kerja terberat) DITUNDA ke
       belakang first paint — rAF (frame ter-commit) lalu setTimeout(0) —
       supaya long task evaluasi skrip dan particles.init tidak menumpuk
       jadi satu hitch di ponsel pelan. Mode beku QA tetap sinkron. */
    function bootMotion() {
      if (ctl.closed) return;
      layout();
      particles.init(canvas, { emit: events.emit });
      equalizer.init(logoSvg, {
        beats: CHOREO.BEATS,
        beatsAbsolute: true,
        getLevels: makeGetLevels(CHOREO.BEATS),
        idleShimmer: true
      });
      /* Equalizer mulai tepat saat batang partikel memadat — event modul P. */
      events.on('bars-solid', function () { equalizer.start(clock.now()); });
      pawstamp.arm(null, {
        root: host,
        reducedMotion: false,
        /* PUTUSAN OWNER: hentakan = paw_greet (suara khas), bukan stamp_thud. */
        sfx: function () { playSfx(env, 'paw_greet'); },
        emit: events.emit
      });
      buildSchedules();
      clock.onFrame(perFrame);
      ctl.ready = true;

      if (frozenMode) {
        if (tParam >= TL.STAMP0) {
          clock.freeze(TL.STAMP0);
          pawstamp.play({ freezeAt: tParam - TL.STAMP0 });
        } else {
          clock.freeze(tParam);
        }
      } else {
        clock.start(ctl.startOffset);
      }
    }

    if (frozenMode) {
      bootMotion(); // QA beku: tanpa penundaan — frame harus deterministik
    } else {
      env.requestAnimationFrame(function () { env.setTimeout(bootMotion, 0); });
    }
    return true;
  }

  /* Jalur kurangi-gerak: komposisi akhir statis (CSS .fiezel-splash-still
     menampilkannya bertahap dengan pudar-masuk pada ketukan b1/b6/b7/b12),
     lalu cap PAW versi pudar-masuk otomatis → app. Tidak satu piksel pun terbang. */
  function startStill(env, host, ctl, stampAt) {
    var pawstamp = mod(env, 'FiezelSplashPawstamp');
    if (!pawstamp || typeof env.setTimeout !== 'function') return false;
    if (!host || typeof host.querySelector !== 'function') return false;
    try {
      pawstamp.arm(null, {
        root: host,
        reducedMotion: true,
        sfx: function () { playSfx(env, 'paw_greet'); },
        emit: function (name, detail) {
          if (name === 'onboarding-enter') ctl.finish();
        }
      });
    } catch (_) { return false; }
    /* Cap PAW menunggu pudar-masuk terakhir selesai (b12 1900+240=2140ms) —
       ketukan yang sama dengan jalur gerak (STAMP0). Splash yang diadopsi
       terlambat menerima stampAt yang sudah dikecilkan pemanggilnya, sampai 0. */
    var timer = env.setTimeout(function () {
      ctl.stampStarted = true;
      try { pawstamp.play(); } catch (_) { ctl.finish(); }
    }, isFinite(stampAt) && stampAt >= 0 ? stampAt : TL.STAMP0);
    ctl.cleanup.push(function () { try { env.clearTimeout && env.clearTimeout(timer); } catch (_) {} });
    ctl.skip = function () { try { pawstamp.skip(); } catch (_) { ctl.finish(); } };
    return true;
  }

  /**
   * Menampilkan splash. Mengembalikan objek dengan `shown` supaya pemanggil -
   * dan gate - bisa tahu apakah ia benar-benar tampil, bukan menebak dari
   * efek samping.
   */
  function show(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var now = Number(opts.now) || Date.now();
    var doc = target.document;
    if (!doc || typeof doc.createElement !== 'function') return { shown: false, reason: 'no_document' };
    try {
      if (target.__fiezelBootSplash && typeof target.__fiezelBootSplash.clearRecovery === 'function') target.__fiezelBootSplash.clearRecovery();
    } catch (_) {}
    if (opts.force !== true && seenToday(target, now)) {
      // Splash frame-pertama TIDAK boleh tertinggal hanya karena sapaan hari ini dilewati.
      disposeBootSplash(target);
      return { shown: false, reason: 'seen_today' };
    }

    // Splash frame-pertama diadopsi kalau ada: bidang gelapnya sudah tampil
    // sejak frame pertama, jadi membuat elemen kedua berarti menumpuk dua
    // lapisan penuh layar di atas satu sama lain.
    var adopted = bootSplashElement(target);
    var host = adopted;
    var still = prefersReducedMotion(target);
    try {
      if (!still && host && host.className && String(host.className).indexOf('fiezel-splash-still') >= 0) still = true;
    } catch (_) {}
    try {
      if (!still && target.location && String(target.location.search || '').indexOf('still=1') >= 0) still = true;
    } catch (_) {}
    if (host) {
      try { host.setAttribute(BOOT_CLAIMED_ATTR, 'shown'); } catch (_) {}
    } else {
      host = doc.createElement('div');
      // Bidang gelap dipasang di HOST, bukan hanya di anaknya: host punya
      // padding-top untuk safe-area.
      host.className = 'fiezel-splash fiezel-splash-dark';
      if (still) host.className += ' fiezel-splash-still';
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-label', t('splash.welcome-aria'));
      host.innerHTML = markup();
    }

    // Ketukan koreografi dipasang sebagai custom property. CSS jalur statis
    // membaca jeda animasinya dari sini; index.html menuliskan nilai yang sama
    // sebagai default frame-pertama (m025-86: satu tabel untuk semuanya).
    try {
      var CHOREO = mod(target, 'FiezelChoreography');
      if (CHOREO && typeof CHOREO.applyTo === 'function') CHOREO.applyTo(host);
    } catch (_) {}

    // Sisa waktu tayang. Untuk splash yang diadopsi, waktu yang sudah dipakai
    // boot ikut dihitung; lantainya MIN_TAIL_MS = durasi penuh koreografi cap.
    var visibleMs = Number(opts.visibleMs) > 0 ? Number(opts.visibleMs) : VISIBLE_MS;
    if (adopted) visibleMs = Math.max(MIN_TAIL_MS, visibleMs - bootSplashElapsed(target));

    /* ctl — jabat tangan antara show() dan jalur gerak/statis. */
    var ctl = {
      /* Jam koreografi mulai dari sini: bagian yang sudah "dipakai" boot
         diloncati, bukan diulang (adopsi lambat → langsung dekat cap). */
      startOffset: Math.max(0, VISIBLE_MS - visibleMs),
      ready: false, stampStarted: false, frozen: false, closed: false,
      introRequested: false,
      clock: null, skip: null, cleanup: [],
      finish: function () { close(); }
    };

    /* Persiapan audio berjalan PARALEL dengan penataan DOM: konteks + dekode
       splash_intro dimulai sekarang; keputusan bunyi/siaga diambil di bawah,
       setelah jalur gerak diketahui. Kegagalan ditelan - splash utuh tanpa bunyi. */
    try {
      if (opts.silent !== true && target.FiezelUiSfx && typeof target.FiezelUiSfx.prepare === 'function') {
        target.FiezelUiSfx.prepare('splash_intro', target);
      }
    } catch (_) {}

    var closed = false;
    var timer = null;
    function close() {
      if (closed) return;
      closed = true;
      ctl.closed = true;
      if (timer && target.clearTimeout) target.clearTimeout(timer);
      for (var i = 0; i < ctl.cleanup.length; i++) { try { ctl.cleanup[i](); } catch (_) {} }
      markSeen(target, now);
      // Bunyi yang belum sempat berbunyi mati bersama splash — mencegahnya
      // muncul lagi nanti sebagai bunyi liar di tekanan tombol pertama.
      cancelChime(target);
      // Latar gelap boot dilepas di AWAL penutupan, bukan setelah animasi
      // keluar: yang tersingkap harus sudah berwarna aplikasi.
      endBootBackground(target);
      // Pemanggil perlu tahu KAPAN sapaan selesai, bukan menebaknya dengan
      // pewaktu kedua. Dipanggil sebelum animasi keluar supaya menyambung.
      if (typeof opts.onClose === 'function') { try { opts.onClose({ via: 'close' }); } catch (_) {} }
      try { host.classList.add('is-leaving'); } catch (_) {}
      if (typeof target.setTimeout === 'function') target.setTimeout(remove, 320);
      else remove();
    }
    function remove() {
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
    }

    if (!adopted) {
      try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }
    }

    /* Jalur gerak penuh dulu; kurangi-gerak memakai jalur statis; env tanpa
       DOM penuh (mis. tes Node) jatuh ke pewaktu polos — kontrak lama utuh. */
    var motion = false;
    if (still) motion = startStill(target, host, ctl, Math.max(0, visibleMs - MIN_TAIL_MS));
    else motion = startMotion(target, host, ctl);

    /* Sentuh/Enter/Spasi = lewati-maju (bukan langsung tutup) selama jalur
       gerak hidup; tanpa jalur gerak, sentuhan menutup seperti dulu. */
    try {
      host.addEventListener('click', function () {
        if (motion && typeof ctl.skip === 'function') ctl.skip();
        else close();
      });
    } catch (_) { /* tanpa listener, pewaktu di bawah tetap menutupnya */ }
    if (motion) {
      try {
        var onKey = function (e) {
          if (closed) return;
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof ctl.skip === 'function') ctl.skip();
        };
        doc.addEventListener('keydown', onKey);
        ctl.cleanup.push(function () { try { doc.removeEventListener('keydown', onKey); } catch (_) {} });
      } catch (_) {}
    }

    /* Nada pembuka: SATU permintaan per tayangan, TIDAK lagi bergantung pada
       startOffset (audit 2026-08-28 - syarat lama membuatnya tak pernah diminta
       di boot nyata). Zero-gesture dicoba lebih dulu oleh fasad; bila terblokir,
       ia disiagakan dengan tenggat = sisa umur tayang dan berbunyi pada izin/
       gestur asli pertama. close() → cancelChime() tetap pagar terakhirnya
       (m025-84: tidak ada bunyi liar setelah splash tertutup). Mode beku QA
       (?t=) tetap senyap. */
    if (opts.silent !== true && !ctl.frozen && !ctl.introRequested) {
      ctl.introRequested = true;
      requestIntro(target, visibleMs);
    }

    /* Pewaktu pengaman: pada jalur gerak, cap PAW selalu menutup lebih dulu
       ('onboarding-enter' @ VISIBLE_MS−530 pada jam tayangan); pewaktu ini
       hanya jaring bila jalur gerak macet. Mode beku QA tidak memasangnya. */
    if (!ctl.frozen && typeof target.setTimeout === 'function') {
      timer = target.setTimeout(close, visibleMs);
    }
    return { shown: true, close: close, element: host, adopted: !!adopted, visibleMs: visibleMs };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    VISIBLE_MS: VISIBLE_MS,
    MIN_TAIL_MS: MIN_TAIL_MS,
    BOOT_ATTR: BOOT_ATTR,
    BOOT_SELECTOR: BOOT_SELECTOR,
    BOOTING_CLASS: BOOTING_CLASS,
    COPY: COPY,
    TL: TL,
    dayKey: dayKey,
    seenToday: seenToday,
    // Diekspor supaya markup statis di index.html bisa diuji identik dengan
    // sumber ini, bukan disalin sekali lalu menyimpang diam-diam.
    logoMarkup: logoMarkup,
    wordmarkMarkup: wordmarkMarkup,
    markup: markup,
    disposeBootSplash: disposeBootSplash,
    show: show
  };
});
