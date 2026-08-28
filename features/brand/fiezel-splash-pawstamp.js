/**
 * FIEZEL splash v4 — Modul CAP PAW penutup splash (porting dari prototipe).
 *
 * KONTRAK (ruling OWNER 2026-08-28 / OA-6):
 *   v4 — TANPA tombol. Orkestrator memanggil arm(null,{...}) sekali saat boot
 *   (menyiapkan overlay + jalur reduced), lalu FiezelSplashPawstamp.play()
 *   dipanggil OTOMATIS oleh jadwal orkestrator (@2200 dari t0 splash).
 *   Hentakan mendarat TENGAH PANGGUNG (menimpa komposisi logo+wordmark) —
 *   grammar visual v2/v3 tak berubah: antisipasi → HENTAK squash 1.12/0.84 +
 *   dua cincin kejut + getar ≤3px + 3 serpihan + debum → menetap −6° dengan
 *   sebaran tinta → cap MEMBESAR sebagai transisi →
 *   FZSplash.events.emit('onboarding-enter') @ +830ms. NOL frame mati.
 *   skip() — merampungkan cap yang sedang berjalan SEKETIKA (langsung fase
 *   keluar + 'onboarding-enter'); dipakai jalur sentuh-lewati integrator.
 *
 * Kompatibilitas: arm(mulaiButton) v3 DIPERTAHANKAN (harness lama & jalur
 * porting alternatif) — bila tombol diberikan, tekanan tetap memicu play()
 * dan cap mendarat di atas tombol; tanpa tombol, slot bawaan tengah panggung.
 *
 * Mandiri penuh: modul membangun lapisan overlay-nya sendiri (scrim gelap +
 * paw + bayang gerak + tinta + cincin + serpihan) dan menyuntikkan CSS-nya
 * sendiri; integrator cukup memanggil arm(). Hanya transform/opacity yang
 * dianimasikan (aturan kualitas v2 dipertahankan).
 *
 * SFX: PUTUSAN OWNER 2026-08-28 — kontak SLAM membunyikan paw_greet.ogg
 * (SUARA KHAS FIEZEL), BUKAN stamp_thud.ogg (pensiun; berkas tetap dikirim).
 * Bunyinya milik fasad features/audio/fiezel-ui-sfx.js: orkestrator
 * menyuntik fungsi lewat arm(null,{sfx}) dan modul ini hanya memanggilnya
 * tepat pada kontak — tanpa fasad, senyap (audio tak boleh mematahkan gerak).
 *
 * Debug (dipakai dev/pawstamp-harness.html, JANGAN diporting):
 *   play({freezeAt: ms}) — membekukan seluruh koreografi tepat di milidetik itu
 *   (pola --fzps-t + animation-play-state: paused, meniru ?t= milik v2).
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSplashPawstamp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  /* ======================================================================
     TABEL KETUKAN — sumber tunggal ritme cap. t=0 saat play() dipanggil
     (v4: otomatis @2200 jam splash; v3: saat Mulai ditekan — tabel SAMA).
     Grammar hentakan disalin dari v2 (css/splash.css b8..b10 + keluar),
     dirapatkan agar total ≤ 1400ms.
     ====================================================================== */
  var T = {
    PRESS:  0,    // awal koreografi (v3: micro-state tombol ≤80ms)
    ANTIC:  60,   // antisipasi 240ms: PAW jatuh dari atas, besar → mendekat
    SLAM:   300,  // KONTAK: squash 1.12/0.84, debum (thud), cincin, getar
    SHOCK1: 360,  // cincin kejut pertama (emas)
    SHOCK2: 410,  // cincin kejut kedua (krem, lebih lebar)
    SHAKE:  365,  // getar panggung 230ms, amplitudo ≤3px
    DEBRIS: 370,  // 3 serpihan terlempar (serpihan-3 menyusul +20ms)
    INK:    400,  // sebaran tinta 420ms + cap menetap ke −6°
    EXIT:   830,  // cap MEMBESAR sebagai transisi; emit 'onboarding-enter'
    DONE:   1360  // overlay dilepas; onboarding sudah tampil penuh (≤1400ms)
  };
  var EXIT_DUR = 530; // ekor animasi keluar terpanjang (paw 480ms + margin)

  /* Palet kontrak v3 — TIDAK ada warna baru. */
  var C = {
    dark:  '#1B1418',
    gold:  '#F0C241',
    goldHi:'#FFD94F',
    cream: '#FFF4DA'
  };

  /* Geometri PAW — persis assets/fiezel-paw.svg (sumber bentuk tunggal). */
  var PAW_SHAPE =
    '<rect x="4.6" y="7.5" width="3.1" height="4.6" rx="1.55"/>' +
    '<rect x="8.9" y="5.1" width="3.1" height="7" rx="1.55"/>' +
    '<rect x="13.2" y="3.4" width="3.1" height="8.7" rx="1.55"/>' +
    '<rect x="17.5" y="6.2" width="3.1" height="5.9" rx="1.55"/>' +
    '<path d="M12.6 14c3.5 0 5.9 1.9 5.9 4.1 0 2-2 3.4-5.9 3.4s-5.9-1.4-5.9-3.4c0-2.2 2.4-4.1 5.9-4.1Z"/>';

  /* ======================================================================
     CSS MODUL — disuntik sekali. Semua delay = calc(ketukan − --fzps-t)
     supaya pembekuan ?t= (harness) bekerja persis seperti v2.
     Squash kontak 1.12/0.84 dan getar ≤3px sesuai angka KONTRAK v3.
     ====================================================================== */
  var CSS = '' +
  '.fzps-overlay{position:fixed;inset:0;z-index:60;pointer-events:none;' +
    '--fzps-t:0ms;--fzps-exit-d:0ms;}' +
  '.fzps-overlay.fzps-frozen *,.fzps-overlay.fzps-frozen{animation-play-state:paused!important;}' +

  /* Scrim DUA TAHAP (storyboard F7–F8, QA-VISUAL P1-2): meredup ke 55%
     selama hentakan — kartu + logo + wordmark tetap TERBACA di bawah cap
     (“cap mengecap sesuatu”, bukan kehampaan) — lalu menutup PENUH tepat
     sebelum EXIT (805ms < 830ms) sehingga pergantian kartu→onboarding di
     baliknya tetap tak pernah terlihat (nol frame mati).
     Kunci %: 30%=249ms (≈55% saat kontak 300), 84%=697ms tahan, 97%=805ms pekat. */
  '@keyframes fzps-scrim-in{0%{opacity:0}30%{opacity:.55}84%{opacity:.55}' +
    '97%{opacity:1}100%{opacity:1}}' +
  '.fzps-scrim{position:absolute;inset:0;background:' + C.dark + ';opacity:0;' +
    'animation:fzps-scrim-in .83s linear calc(0ms - var(--fzps-t)) both;}' +

  /* Panggung: SATU-SATUNYA penerima getar (prinsip v2). */
  '.fzps-stage{position:absolute;inset:0;display:grid;place-items:center;}' +
  '@keyframes fzps-shake{' +   /* amplitudo ≤3px — angka kontrak v3 */
    '0%{transform:translate(0,0)}' +
    '16%{transform:translate(-3px,2px) rotate(-.2deg)}' +
    '34%{transform:translate(2.5px,-2px) rotate(.15deg)}' +
    '52%{transform:translate(-2px,1.5px)}' +
    '72%{transform:translate(1.5px,-1px)}' +
    '100%{transform:translate(0,0)}}' +
  '.fzps-play .fzps-stage{animation:fzps-shake .23s linear calc(' + T.SHAKE + 'ms - var(--fzps-t)) both;}' +

  /* Slot cap — ukuran adaptif viewport (--fzps-size, JS: 30% sisi terpendek,
     128–236px — cap desktop tak lagi sekecil koin, QA-VISUAL P3-8). Posisi
     bawaan TENGAH PANGGUNG (jalur v4 tanpa tombol); bila arm(button) dipakai
     (kompat v3), play() memindahkannya ke atas tombol yang ditekan. */
  '.fzps-slot{position:relative;width:var(--fzps-size,128px);' +
    'height:var(--fzps-size,128px);margin-top:-6vh;}' +
  '.fzps-paw{position:absolute;inset:0;width:100%;height:100%;display:block;}' +

  /* Antisipasi — persis grammar v2: datang dari ATAS dan BESAR, easing
     percepatan (jatuh), bukan perlambatan. */
  '@keyframes fzps-antisipasi{' +
    '0%{opacity:0;transform:translateY(-52px) scale(2.0) rotate(-2deg)}' +
    '55%{opacity:.9}' +
    '100%{opacity:1;transform:translateY(-8px) scale(1.22) rotate(-3deg)}}' +

  /* HENTAK + menetap — squash kontak 1.12/0.84 (kontrak v3), pantulan mikro
     mengecil, menetap miring −6° seperti stempel ditekan lalu dilepas. */
  '@keyframes fzps-slam{' +
    '0%{transform:translateY(-8px) scale(1.22) rotate(-3deg)}' +
    '14%{transform:translateY(2px) scale(1.12,.84) rotate(-7.5deg)}' + /* impak */
    '34%{transform:translateY(0) scale(.955,1.05) rotate(-5.2deg)}' +  /* rebound */
    '58%{transform:scale(1.035,.985) rotate(-6.5deg)}' +
    '80%{transform:scale(.995,1.005) rotate(-5.9deg)}' +
    '100%{transform:scale(1) rotate(-6deg)}}' +
  '.fzps-glyph{opacity:0;will-change:transform,opacity;}' +
  '.fzps-play .fzps-glyph{animation:' +
    'fzps-antisipasi .24s cubic-bezier(.5,.06,.74,.34) calc(' + T.ANTIC + 'ms - var(--fzps-t)) both,' +
    'fzps-slam .52s cubic-bezier(.3,.7,.35,1) calc(' + T.SLAM + 'ms - var(--fzps-t)) both;}' +

  /* Bayang gerak: salinan pucat tertinggal ~25ms — blur gerak tanpa filter.
     Puncak opasitas diturunkan .2→.09 & lebih singkat: pada kontak salinan
     jari tak lagi terbaca sebagai noda cokelat (QA-VISUAL P2-5). */
  '@keyframes fzps-ghost{' +
    '0%{opacity:0;transform:translateY(-64px) scale(2.2) rotate(-2deg)}' +
    '55%{opacity:.09}' +
    '100%{opacity:0;transform:translateY(-10px) scale(1.3) rotate(-3deg)}}' +
  '.fzps-ghost{opacity:0;}' +
  '.fzps-play .fzps-ghost{animation:fzps-ghost .23s cubic-bezier(.5,.06,.74,.34) calc(' + (T.ANTIC + 25) + 'ms - var(--fzps-t)) forwards;}' +

  /* Sebaran tinta: salinan emas mengembang sekali lalu meresap. */
  '@keyframes fzps-ink{' +
    '0%{opacity:.4;transform:scale(.92) rotate(-6deg)}' +
    '100%{opacity:0;transform:scale(1.34) rotate(-6deg)}}' +
  '.fzps-ink{opacity:0;}' +
  '.fzps-play .fzps-ink{animation:fzps-ink .42s cubic-bezier(.17,.67,.35,1) calc(' + T.INK + 'ms - var(--fzps-t)) forwards;}' +

  /* Gelombang kejut: dua cincin dari titik hentakan (grammar v2). */
  '@keyframes fzps-shock-out{0%{opacity:.85;transform:scale(.22)}100%{opacity:0;transform:scale(1)}}' +
  '.fzps-shock{position:absolute;left:50%;top:54%;' +
    'width:calc(var(--fzps-size,128px)*1.4);height:calc(var(--fzps-size,128px)*1.4);' +
    'margin:calc(var(--fzps-size,128px)*-.7) 0 0 calc(var(--fzps-size,128px)*-.7);' +
    'border-radius:50%;opacity:0;' +
    'border:2.5px solid rgba(240,194,65,.9);}' +
  '.fzps-play .fzps-shock1{animation:fzps-shock-out .46s cubic-bezier(.13,.68,.3,1) calc(' + T.SHOCK1 + 'ms - var(--fzps-t)) forwards;}' +
  '.fzps-shock2{width:calc(var(--fzps-size,128px)*1.8);height:calc(var(--fzps-size,128px)*1.8);' +
    'margin:calc(var(--fzps-size,128px)*-.9) 0 0 calc(var(--fzps-size,128px)*-.9);' +
    'border-width:1.5px;border-color:rgba(255,244,218,.5);}' +
  '.fzps-play .fzps-shock2{animation:fzps-shock-out .54s cubic-bezier(.13,.68,.3,1) calc(' + T.SHOCK2 + 'ms - var(--fzps-t)) forwards;}' +

  /* Serpihan: tiga titik kecil terlempar dari titik hentakan lalu padam. */
  '.fzps-debris{position:absolute;left:50%;top:58%;width:5px;height:5px;' +
    'border-radius:50%;background:' + C.goldHi + ';opacity:0;}' +
  '@keyframes fzps-debris1{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(-40px,-36px) scale(.35)}}' +
  '@keyframes fzps-debris2{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(36px,-44px) scale(.35)}}' +
  '@keyframes fzps-debris3{0%{opacity:1;transform:translate(0,0) scale(.8)}100%{opacity:0;transform:translate(28px,22px) scale(.3)}}' +
  '.fzps-play .fzps-debris1{animation:fzps-debris1 .4s cubic-bezier(.17,.67,.4,1) calc(' + T.DEBRIS + 'ms - var(--fzps-t)) forwards;}' +
  '.fzps-play .fzps-debris2{animation:fzps-debris2 .44s cubic-bezier(.17,.67,.4,1) calc(' + T.DEBRIS + 'ms - var(--fzps-t)) forwards;}' +
  '.fzps-debris3{width:4px;height:4px;background:' + C.cream + ';}' +
  '.fzps-play .fzps-debris3{animation:fzps-debris3 .36s cubic-bezier(.17,.67,.4,1) calc(' + (T.DEBRIS + 20) + 'ms - var(--fzps-t)) forwards;}' +

  /* KELUAR — cap membawa transisi: PAW membesar memenuhi layar sambil memudar
     CEPAT (layar baru tidak boleh tertutup jari raksasa — pelajaran v2),
     scrim larut, onboarding di baliknya tersingkap. */
  '@keyframes fzps-exit-paw{' +
    '0%{opacity:1;transform:scale(1) rotate(-6deg)}' +
    '28%{opacity:.2;transform:scale(3) rotate(-5deg)}' +  /* memudar CEPAT; UI onboarding */
    '62%{opacity:.03;transform:scale(6) rotate(-3.5deg)}' + /* tak pernah tertutup gumpalan */
    '100%{opacity:0;transform:scale(8.5) rotate(-2deg)}}' + /* emas 40% (QA-VISUAL P2-6) */
  '@keyframes fzps-exit-fade{from{opacity:1}to{opacity:0}}' +
  '.fzps-leaving .fzps-glyph{animation:fzps-exit-paw .48s cubic-bezier(.5,.05,.75,.4) var(--fzps-exit-d) both;}' +
  '.fzps-leaving .fzps-scrim{animation:fzps-exit-fade .33s ease calc(60ms + var(--fzps-exit-d)) both;}' +
  '.fzps-leaving .fzps-shock,.fzps-leaving .fzps-debris,' +
  '.fzps-leaving .fzps-ink,.fzps-leaving .fzps-ghost{opacity:0!important;animation:none!important;}' +

  /* Micro-state tombol tertekan (≤80ms): dipasang pada tombol Mulai milik
     integrator — hanya transform, tidak menyentuh gayanya yang lain. */
  '.fzps-pressed{transform:scale(.94) translateY(1px)!important;' +
    'transition:transform 70ms cubic-bezier(.3,.7,.4,1)!important;}' +

  /* KURANGI-GERAK — cap yang SUDAH menetap memudar masuk 240ms (opacity
     saja), lalu langsung onboarding. Tidak satu piksel pun terbang. */
  '@keyframes fzps-rm-in{from{opacity:0}to{opacity:1}}' +
  '.fzps-reduced .fzps-glyph{animation:fzps-rm-in .24s ease calc(60ms - var(--fzps-t)) both!important;' +
    'transform:rotate(-6deg)!important;}' +
  '.fzps-reduced .fzps-ghost,.fzps-reduced .fzps-ink,.fzps-reduced .fzps-shock,' +
  '.fzps-reduced .fzps-debris{display:none;}' +
  '.fzps-reduced .fzps-stage{animation:none!important;}' +
  '.fzps-reduced .fzps-scrim{animation-duration:.18s;}' +
  '.fzps-reduced.fzps-leaving .fzps-glyph{animation:fzps-exit-fade .24s ease var(--fzps-exit-d) both!important;}';

  /* ======================================================================
     PEMBANGUNAN OVERLAY — dibuat sekali per arm(), disisipkan ke root.
     ====================================================================== */
  function pawSvg(cls, fillAttr) {
    return '<svg class="fzps-paw ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<g ' + fillAttr + '>' + PAW_SHAPE + '</g></svg>';
  }

  /* Dokumen tempat overlay hidup — diturunkan dari root arm(), bukan global. */
  function doc() {
    if (state.root && state.root.ownerDocument) return state.root.ownerDocument;
    return root && root.document ? root.document : null;
  }
  function win() {
    var d = doc();
    return (d && d.defaultView) || root || {};
  }

  function buildOverlay() {
    var d = doc();
    if (!d || typeof d.createElement !== 'function') return null;
    var el = d.createElement('div');
    el.className = 'fzps-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="fzps-scrim"></div>' +
      '<div class="fzps-stage">' +
        '<div class="fzps-slot">' +
          '<i class="fzps-shock fzps-shock1"></i>' +
          '<i class="fzps-shock fzps-shock2"></i>' +
          /* Tinta di belakang, bayang gerak di tengah, glyph di depan. */
          pawSvg('fzps-ink',   'fill="' + C.gold + '"') +
          pawSvg('fzps-ghost', 'fill="' + C.goldHi + '"') +
          '<svg class="fzps-paw fzps-glyph" viewBox="0 0 24 24" role="img" aria-label="Cap PAW FIEZEL">' +
            '<defs><linearGradient id="fzpsGold" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="' + C.goldHi + '"/>' +
              '<stop offset="100%" stop-color="' + C.gold + '"/>' +
            '</linearGradient></defs>' +
            '<g fill="url(#fzpsGold)">' + PAW_SHAPE + '</g></svg>' +
          '<i class="fzps-debris fzps-debris1"></i>' +
          '<i class="fzps-debris fzps-debris2"></i>' +
          '<i class="fzps-debris fzps-debris3"></i>' +
        '</div>' +
      '</div>';
    return el;
  }

  var styleInjected = false;
  function ensureStyle() {
    if (styleInjected) return;
    var d = doc();
    if (!d || typeof d.createElement !== 'function' || !d.head) return;
    var s = d.createElement('style');
    s.id = 'fzps-style';
    s.textContent = CSS;
    d.head.appendChild(s);
    styleInjected = true;
  }

  /* ======================================================================
     JEMBATAN KE MODUL LAIN — semuanya opsional & dijaga (harness bisa
     berjalan tanpa sfx.js / events milik orkestrator).
     ====================================================================== */
  function sfxSlam() {
    /* Suntikan orkestrator: memutar paw_greet lewat fasad fiezel-ui-sfx. */
    if (typeof state.sfx === 'function') {
      try { state.sfx('paw_greet'); } catch (e) { /* audio tak boleh mematahkan gerak */ }
    }
  }
  function emit(name, detail) {
    if (typeof state.emit === 'function') {
      try { state.emit(name, detail); } catch (e) { /* pendengar rusak bukan urusan cap */ }
    }
    /* Cadangan DOM event supaya pendengar luar (mis. tes/QA) tetap bisa mendengar. */
    var d = doc();
    var w = win();
    try {
      if (d && w.CustomEvent) d.dispatchEvent(new w.CustomEvent('fz:' + name, { detail: detail }));
    } catch (e) { /* lingkungan tanpa CustomEvent */ }
  }

  /* ======================================================================
     MODUL
     ====================================================================== */
  var state = {
    root: null, button: null, overlay: null,
    timers: [], playing: false, reduced: false,
    boundButton: null, onDown: null, onKey: null,
    sfx: null, emit: null // suntikan orkestrator (arm opts)
  };

  function clearTimers() {
    for (var i = 0; i < state.timers.length; i++) clearTimeout(state.timers[i]);
    state.timers = [];
  }
  function at(ms, fn) { state.timers.push(setTimeout(fn, ms)); }

  function prefersReduced() {
    if (state.reduced) return true;
    var w = win();
    try {
      return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  /* Reset overlay ke keadaan siap (untuk replay). */
  function resetOverlay() {
    var o = state.overlay;
    o.classList.remove('fzps-play', 'fzps-leaving', 'fzps-frozen', 'fzps-reduced');
    o.style.setProperty('--fzps-t', '0ms');
    o.style.setProperty('--fzps-exit-d', '0ms');
    o.style.display = 'none';
    /* Trik restart animasi CSS milik v2: cabut dari render tree satu frame. */
    void o.offsetHeight;
  }

  /**
   * play(opts) — jalankan cap penuh.
   * opts.freezeAt (ms) : bekukan koreografi tepat di milidetik itu (QA saja).
   */
  function play(opts) {
    opts = opts || {};
    var o = state.overlay;
    if (!o) {
      /* Overlay sudah dilepas dari DOM pasca-onboarding (QA-PERF F-5) —
         bangun ulang bila play dipanggil lagi tanpa arm. */
      if (!state.root) return;
      o = state.overlay = buildOverlay();
      if (!o) return;
      o.style.display = 'none';
      state.root.appendChild(o);
    }
    clearTimers();
    resetOverlay();

    /* Ukuran cap adaptif viewport (P3-8). v4: tanpa tombol → cabang rect di
       bawah dilewati, slot tetap di tengah panggung. (Kompat v3: bila ada
       tombol, mendarat DI tombol — satu kali baca layout, bukan per frame.) */
    var w = win();
    var vmin = Math.min(w.innerWidth || 0, w.innerHeight || 0) || 390;
    var size = Math.round(Math.max(128, Math.min(236, vmin * 0.30)));
    o.style.setProperty('--fzps-size', size + 'px');
    var slot = o.querySelector('.fzps-slot');
    if (slot) {
      slot.style.position = ''; slot.style.left = '';
      slot.style.top = ''; slot.style.marginTop = '';
      if (state.button && state.button.getBoundingClientRect) {
        var br = state.button.getBoundingClientRect();
        if (br.width > 0 && br.height > 0) {
          slot.style.position = 'absolute';
          slot.style.marginTop = '0';
          slot.style.left = Math.round(br.left + br.width / 2 - size / 2) + 'px';
          /* Sedikit di atas titik tekan: cap “jatuh menimpa” tombol/kartu. */
          slot.style.top = Math.round(br.top + br.height / 2 - size * 0.6) + 'px';
        }
      }
    }

    var reduced = prefersReduced();
    var frozen = typeof opts.freezeAt === 'number' && isFinite(opts.freezeAt);

    o.style.display = '';
    if (reduced) o.classList.add('fzps-reduced');
    o.classList.add('fzps-play');
    state.playing = true;

    /* Micro-state tombol: dipasang SEKARANG, dilepas ≤80ms — inilah "sebab". */
    if (state.button && !frozen) {
      state.button.classList.add('fzps-pressed');
      at(80, function () { state.button.classList.remove('fzps-pressed'); });
    }

    if (frozen) {
      /* Mode beku QA — meniru ?t= v2: --fzps-t menggeser semua delay, lalu
         seluruh animasi di-pause. Tanpa timer, tanpa SFX. */
      var t = Math.max(0, opts.freezeAt);
      var tExit = reduced ? 560 : T.EXIT;
      if (t < tExit) {
        o.style.setProperty('--fzps-t', t + 'ms');
      } else {
        o.style.setProperty('--fzps-t', tExit + 'ms');
        o.style.setProperty('--fzps-exit-d', -(t - tExit) + 'ms');
        o.classList.add('fzps-leaving');
        emit('onboarding-enter', { frozen: true });
      }
      if (state.button && t < 80) state.button.classList.add('fzps-pressed');
      o.classList.add('fzps-frozen');
      return;
    }

    if (reduced) {
      /* Jalur kurangi-gerak: scrim cepat → cap menetap memudar masuk 240ms →
         langsung onboarding. Total ~800ms, tanpa hentakan. */
      at(320, function () { sfxSlam(); }); // sapaan paw_greet tetap memberi bobot
      at(560, function () {
        o.classList.add('fzps-leaving');
        emit('onboarding-enter', { reduced: true });
      });
      at(560 + 300, finish);
      return;
    }

    /* Jalur penuh — SFX & event mengikuti tabel ketukan yang sama dengan CSS. */
    at(T.SLAM, function () { sfxSlam(); });
    at(T.EXIT, function () {
      o.classList.add('fzps-leaving');
      /* Pergantian kartu→onboarding terjadi DI BALIK scrim yang masih pekat:
         nol frame mati, onboarding sudah siap saat scrim larut. */
      emit('onboarding-enter', {});
    });
    at(T.EXIT + EXIT_DUR, finish);
  }

  /**
   * skip() — v4: rampungkan cap yang sedang berjalan SEKETIKA. Semua timer
   * ketukan dibatalkan, overlay langsung masuk fase keluar (kelas
   * fzps-leaving menolkan cincin/serpihan/tinta/bayang), 'onboarding-enter'
   * dipancarkan sekarang — pergantian tetap di balik scrim (fill backwards
   * exit-fade menahan scrim pekat 60ms sebelum larut: nol frame mati).
   * Tidak melakukan apa-apa bila cap belum main, sudah keluar, atau beku QA.
   */
  function skip() {
    var o = state.overlay;
    if (!o || !state.playing) return;
    if (o.classList.contains('fzps-frozen')) return;   // mode beku QA: jangan
    if (o.classList.contains('fzps-leaving')) return;  // sudah keluar: biarkan
    clearTimers();
    o.classList.add('fzps-leaving');
    emit('onboarding-enter', { skipped: true });
    at(EXIT_DUR, finish);
  }

  function finish() {
    state.playing = false;
    /* Overlay DIBUANG dari DOM begitu onboarding tampil (QA-PERF F-5) —
       tidak ada node cap menganggur; arm()/play() membangun ulang saat perlu. */
    if (state.overlay) {
      if (state.overlay.parentNode) state.overlay.parentNode.removeChild(state.overlay);
      state.overlay = null;
    }
    emit('pawstamp-done', {});
  }

  /**
   * arm(mulaiButton, opts) — API kontrak.
   * v4 (jalur utama): arm(null, opts) — hanya membangun overlay + menyimpan
   * preferensi reduced; play() dipanggil orkestrator (jadwal otomatis).
   * Kompat v3: bila tombol diberikan, handler tekan ditempelkan padanya.
   *   opts.root            : elemen induk overlay (bawaan: document.body)
   *   opts.reducedMotion   : paksa jalur kurangi-gerak (uji visual)
   */
  function arm(mulaiButton, opts) {
    opts = opts || {};
    state.root = opts.root || (root && root.document ? root.document.body : null);
    if (!state.root) return api;
    state.button = mulaiButton || null;
    state.reduced = !!opts.reducedMotion;
    if (typeof opts.sfx === 'function') state.sfx = opts.sfx;
    if (typeof opts.emit === 'function') state.emit = opts.emit;
    ensureStyle();

    if (!state.overlay) {
      state.overlay = buildOverlay();
      if (!state.overlay) return api;
      state.overlay.style.display = 'none';
      state.root.appendChild(state.overlay);
    } else if (state.overlay.parentNode !== state.root) {
      state.root.appendChild(state.overlay);
    }

    if (state.button) {
      /* pointerdown, bukan click: hentakan mulai pada TEKANAN — kausalitas.
         click tetap dijaga sebagai cadangan (keyboard/AT). Handler disimpan
         di state supaya disarm() benar-benar melepasnya — tanpa akumulasi
         listener pada siklus Ulangi (QA-PERF F-7). */
      unbindButton();
      var fired = false;
      state.onDown = function (e) {
        if (state.playing || fired) return;
        fired = true;
        setTimeout(function () { fired = false; }, 400);
        play();
      };
      state.onKey = function (e) {
        if (e.key === 'Enter' || e.key === ' ') state.onDown(e);
      };
      state.boundButton = state.button;
      state.button.addEventListener('pointerdown', state.onDown);
      state.button.addEventListener('keydown', state.onKey);
    }
    return api;
  }

  function unbindButton() {
    if (state.boundButton) {
      if (state.onDown) state.boundButton.removeEventListener('pointerdown', state.onDown);
      if (state.onKey) state.boundButton.removeEventListener('keydown', state.onKey);
    }
    state.boundButton = null; state.onDown = null; state.onKey = null;
  }

  function disarm() {
    clearTimers();
    unbindButton();
    if (state.overlay && state.overlay.parentNode) state.overlay.parentNode.removeChild(state.overlay);
    state.overlay = null; state.button = null; state.playing = false;
  }

  /* ======================================================================
     EKSPOR
     ====================================================================== */
  var api = {
    arm: arm,
    play: play,
    skip: skip,     // v4: rampungkan cap seketika (sentuh-lewati)
    disarm: disarm,
    T: T,           // tabel ketukan — dibaca QA
    EXIT_DUR: EXIT_DUR
  };
  return api;
});
