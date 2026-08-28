/* ======================================================================
 * FIEZEL splash v4 — MODUL EQUALIZER (porting dari prototipe).
 * ----------------------------------------------------------------------
 * Dua batang emas logo "hidup" sebagai equalizer audio saat event
 * 'bars-solid'. Semua gerak HANYA scaleY (transform) dengan poros bawah
 * (pivot bottom) supaya tidak ada layout thrash — 60fps aman.
 *
 * API:
 *   FiezelSplashEqualizer.init(container, {getLevels, beatsAbsolute, reduceMotion, ...})
 *   FiezelSplashEqualizer.start(t)      — mulai koreografi pada jam t (ms)
 *   FiezelSplashEqualizer.update(t, dt) — dipanggil orkestrator tiap frame
 *   FiezelSplashEqualizer.settle(t)     — luruh mulus ke proporsi logo persis
 *
 * Sumber ritme: opts.getLevels (diturunkan orkestrator dari tabel ketukan
 * features/brand/fiezel-choreography.js — SATU jam untuk gerak dan bunyi,
 * m025-86) atau opts.beats sebagai cadangan. Ketukan dianggap RELATIF
 * terhadap start(t0); dengan {beatsAbsolute:true} waktunya absolut.
 *
 * Desain kurva level (seperti musik sungguhan):
 *   - ATTACK cepat 52ms (easeOutCubic) — pukulan terasa tegas.
 *   - DECAY dieasing: pow(1-p, 2.1) + benjolan pantul kecil Gaussian di
 *     p≈0.42 — batang jatuh lalu memantul halus sekali, seperti VU meter —
 *     lalu MENUKIK sebentar di bawah tinggi istirahat (p≈0.78) sebelum
 *     pulih: "duck" khas equalizer sungguhan, bukan sekadar meregang.
 *   - Frasa berselang-seling: ketukan ganjil/genap bergantian batang,
 *     ketukan kuat (role 'sub' dan penutup frase) UNISON dua batang
 *     (batang kedua telat 24ms + amp 0.85 supaya terasa manusiawi).
 *   - "Simpati" 12%: tiap pukulan memberi getar kecil ke batang lawannya.
 *   - Groove dasar sinus ±3.5% berlawanan fase — batang tak pernah mati.
 *   - Kompresor lutut-lunak: simpangan > ±0.42 diperas 0.35× (seperti
 *     limiter audio) supaya tumpukan pukulan tak menempel rata di plafon,
 *     lalu clamp keras: scaleY selalu di [0.35, 1.65] dari tinggi rehat.
 *
 * settle(): ease-in-out cubic selama 240ms — lepas halus dari gerak, lalu
 * mendarat lembut TEPAT di scaleY=1; setelah selesai transform inline
 * DIHAPUS sehingga rect kembali 100% ke geometri logo (pixel-correct).
 *
 * Idle shimmer (opsional, default AKTIF, mati saat reduced-motion):
 * setelah settle, saat menunggu kartu sambutan, batang bernafas ±2%
 * scaleY sangat pelan (periode 1.6s, fase berlawanan, ramp-in 400ms).
 *
 * TANPA glow/sheen apa pun (dihapus owner). Tanpa warna baru.
 * Portabel ke fiezel-splash.js.
 * ====================================================================== */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSplashEqualizer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------- Konstanta rasa (tuning hasil QA visual) ------------------ */
  var MIN_SCALE   = 0.35;   // batas bawah keras — batang tak pernah runtuh
  var MAX_SCALE   = 1.65;   // batas atas keras — tak pernah lebay
  var ATTACK_MS   = 52;     // serangan cepat: naik penuh dalam ~3 frame
  var SETTLE_MS   = 240;    // durasi luruh kembali ke logo
  var GROOVE_AMP  = 0.035;  // nafas dasar antar ketukan (±3.5%)
  var GROOVE_MS   = 460;    // periode groove ~ setengah frase motif
  var IDLE_AMP    = 0.02;   // shimmer diam ±2% (kontrak)
  var IDLE_MS     = 1600;   // periode shimmer — sangat kalem
  var ECHO_LAG    = 24;     // keterlambatan batang kedua saat unison (ms)
  var SYMPATHY    = 0.12;   // porsi getar simpati ke batang lawan

  /* Amplitudo per peran ketukan — nada rendah = bobot besar (seperti bass). */
  var ROLE_AMP = { sub: 0.62, strike: 0.52, colour: 0.44, shimmer: 0.36, add9: 0.40 };

  /* Kurangi-gerak: bisa disuntik orkestrator lewat init({reduceMotion}) —
     satu keputusan untuk seluruh splash — dengan matchMedia sebagai cadangan. */
  var reduceMotion = false;
  try {
    reduceMotion = !!(root && root.matchMedia &&
      root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* lingkungan tanpa matchMedia: anggap gerak penuh */ }

  /* ---------- Easing kecil ------------------------------------------- */
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function easeOutCubic(p)  { p = clamp(p, 0, 1); var q = 1 - p; return 1 - q * q * q; }
  function easeInOutCubic(p) {
    p = clamp(p, 0, 1);
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  /* ---------- Keadaan modul ------------------------------------------ */
  var bars = [];            // [{el, phase}] — dua batang emas
  var hits = [[], []];      // daftar pukulan per batang: {at, amp, decay}
  var opts = {
    idleShimmer: true,      // flag-gated, default nyala
    loopMs: 0,              // >0: ketukan diputar berulang (mode harness)
    beatsAbsolute: false,   // true: beat.t sudah absolut sejak awal splash
    beats: null,            // tabel ketukan cadangan bila FZSplash.sfx absen
    /* [PATCH INTEGRATOR 2026-08-28] Sumber level eksternal opsional:
       fungsi (t) -> [kiri, kanan] 0..1 (kontrak v3: FZSplash.sfx.getLevels).
       Alasan: buildHits melewati ketukan TANPA nada, padahal aksen equalizer
       v3 (e1–e4, 1400–1775ms) memang tanpa pitch — tanpa sumber ini batang
       nyaris diam 1475–1900. Bila null, daftar pukulan internal tetap dipakai
       (harness mandiri tidak berubah perilaku). */
    getLevels: null
  };
  var state = {
    mode: 'pre',            // pre → play → settling → rest
    t0: 0,                  // jam saat start()
    settleT: 0,             // jam saat settle()
    settleFrom: [1, 1],     // scaleY awal saat settle dipanggil
    restT: 0                // jam saat settle selesai (awal shimmer)
  };

  /* ---------- Amplop satu pukulan ------------------------------------ *
   * du: usia pukulan (ms). Bentuk: serangan cepat → luruh pow(1-p,2.1)
   * → benjolan pantul kecil di p≈0.42 → habis di p=1.                    */
  function env(du, amp, decay) {
    if (du < 0) return 0;
    if (du < ATTACK_MS) return amp * easeOutCubic(du / ATTACK_MS);
    var p = (du - ATTACK_MS) / decay;
    if (p >= 1) return 0;
    var fall   = Math.pow(1 - p, 2.1);
    var bounce = 0.24 * Math.exp(-Math.pow((p - 0.42) / 0.16, 2)) * (1 - p);
    /* Tukik equalizer: turun sejenak di bawah istirahat lalu pulih ke 0. */
    var duck   = 1.8  * Math.exp(-Math.pow((p - 0.78) / 0.14, 2)) * (1 - p);
    return amp * (fall + bounce - duck);
  }

  /* ---------- Susun daftar pukulan dari tabel ketukan ----------------- */
  function ampFor(beat) {
    if (beat.role && ROLE_AMP[beat.role] != null) return ROLE_AMP[beat.role];
    if (beat.pitch) { // tanpa peran: nada rendah → amplitudo besar
      var n = clamp(Math.log(beat.pitch / 87.31) / Math.log(783.99 / 87.31), 0, 1);
      return 0.34 + 0.3 * (1 - n);
    }
    return 0.4;
  }

  function buildHits(beatTable) {
    hits = [[], []];
    var pitched = [];
    for (var i = 0; i < beatTable.length; i++) {
      var b = beatTable[i];
      if (b.pitch != null) pitched.push(b); // ketukan PAW (tanpa nada) dilewati
    }
    var alt = 0; // penunjuk giliran batang untuk frasa berselang-seling
    for (var k = 0; k < pitched.length; k++) {
      var beat  = pitched[k];
      var at    = (beat.t != null ? beat.t : beat.at) || 0;
      var amp   = ampFor(beat);
      var decay = clamp((beat.dur || 420) * 1.15, 320, 640);
      /* Unison pada ketukan kuat: 'sub' pembuka dan penutup frase. */
      var unison = beat.role === 'sub' || beat.unison === true || k === pitched.length - 1;
      if (unison) {
        hits[0].push({ at: at,            amp: amp,        decay: decay });
        hits[1].push({ at: at + ECHO_LAG, amp: amp * 0.85, decay: decay });
      } else {
        var main = alt % 2, other = 1 - main;
        alt++;
        hits[main].push({ at: at, amp: amp, decay: decay });
        /* Getar simpati kecil di batang lawan supaya keduanya satu lagu. */
        hits[other].push({ at: at + 18, amp: amp * SYMPATHY, decay: decay * 0.6 });
      }
    }
  }

  /* Kompresor lutut-lunak: simpangan dari 1.0 di atas ambang ±0.42
   * diperas 0.35× — puncak yang bertumpuk tetap terlihat berbeda tinggi,
   * tidak menempel rata di plafon clamp. */
  var KNEE = 0.42, KNEE_RATIO = 0.35;
  function softKnee(dev) {
    var a = Math.abs(dev);
    if (a <= KNEE) return dev;
    var out = KNEE + (a - KNEE) * KNEE_RATIO;
    return dev < 0 ? -out : out;
  }

  /* ---------- Level satu batang pada usia lagu u (ms) ----------------- */
  function levelAt(barIdx, u) {
    var v = GROOVE_AMP * Math.sin(TAU * u / GROOVE_MS + bars[barIdx].phase);
    /* [PATCH INTEGRATOR 2026-08-28] Mode terintegrasi v3: level dibaca dari
       sfx.getLevels (deterministik, sumber ritme yang sama dengan audio) lalu
       tetap melewati kompresor lutut-lunak + clamp milik modul ini. */
    if (opts.getLevels) {
      var ext = opts.getLevels(u);
      v += 0.85 * (ext[barIdx] || 0);
      return clamp(1 + softKnee(v), MIN_SCALE, MAX_SCALE);
    }
    var list = hits[barIdx];
    for (var i = 0; i < list.length; i++) {
      var h  = list[i];
      var du = u - h.at;
      if (opts.loopMs > 0) {
        du = du % opts.loopMs;
        if (du < 0) du += opts.loopMs;
      }
      v += env(du, h.amp, h.decay);
    }
    return clamp(1 + softKnee(v), MIN_SCALE, MAX_SCALE);
  }

  function applyScale(barIdx, s) {
    /* Hanya transform — tanpa layout, tanpa paint properti lain. */
    bars[barIdx].el.style.transform = 'scaleY(' + s.toFixed(4) + ')';
  }

  function clearTransform(barIdx) {
    /* Hapus transform inline: rect kembali PERSIS ke geometri logo. */
    bars[barIdx].el.style.transform = '';
  }

  /* ---------- API publik ---------------------------------------------- */
  var eq = {
    /* init: ambil alih dua batang. Bila container sudah punya
     * .fz-bar1/.fz-bar2 (SVG logo), pakai rect itu langsung; kalau tidak,
     * buat <div> emas dari bar1Rect/bar2Rect (posisi absolut, px). */
    init: function (container, o) {
      o = o || {};
      for (var k in o) if (o.hasOwnProperty(k)) opts[k] = o[k];
      if (typeof o.reduceMotion === 'boolean') reduceMotion = o.reduceMotion;
      if (!container || typeof container.querySelector !== 'function') { bars = []; return eq; }

      var el1 = container.querySelector('.fz-bar1');
      var el2 = container.querySelector('.fz-bar2');

      if ((!el1 || !el2) && o.bar1Rect && o.bar2Rect) {
        el1 = makeBarDiv(container, o.bar1Rect, o.palette);
        el2 = makeBarDiv(container, o.bar2Rect, o.palette);
      }
      if (!el1 || !el2 || !el1.style || !el2.style) { bars = []; return eq; }
      [el1, el2].forEach(function (el) {
        /* Poros bawah: batang memantul dari dasarnya, ujung atas bergerak. */
        el.style.transformBox = 'fill-box';
        el.style.transformOrigin = 'center bottom';
        el.style.willChange = 'transform';
      });

      bars = [
        { el: el1, phase: 0 },       // batang pendek — nafas fase 0
        { el: el2, phase: Math.PI }  // batang tinggi — nafas berlawanan
      ];
      state.mode = 'pre';
      return eq;
    },

    /* start: kunci jam t0 dan susun koreografi dari tabel ketukan. */
    start: function (t) {
      if (!bars.length) return;
      state.t0 = t || 0;
      buildHits(opts.beats || []);
      if (reduceMotion) {
        /* Reduced-motion: tanpa equalizer — langsung diam di bentuk logo. */
        state.mode = 'rest';
        state.restT = state.t0;
        clearTransform(0); clearTransform(1);
        return;
      }
      state.mode = 'play';
    },

    /* update: dipanggil orkestrator/harness tiap frame dengan jam bersama. */
    update: function (t /*, dt */) {
      if (!bars.length) return;

      if (state.mode === 'play') {
        var u = opts.beatsAbsolute ? t : t - state.t0;
        applyScale(0, levelAt(0, u));
        applyScale(1, levelAt(1, u));

      } else if (state.mode === 'settling') {
        var p = easeInOutCubic((t - state.settleT) / SETTLE_MS);
        applyScale(0, state.settleFrom[0] + (1 - state.settleFrom[0]) * p);
        applyScale(1, state.settleFrom[1] + (1 - state.settleFrom[1]) * p);
        if (t - state.settleT >= SETTLE_MS) {
          state.mode = 'rest';
          state.restT = t;
          clearTransform(0); clearTransform(1); // pixel-correct: logo murni
        }

      } else if (state.mode === 'rest') {
        /* Shimmer diam ±2% hanya bila diizinkan flag & bukan reduced-motion. */
        if (!opts.idleShimmer || reduceMotion) return;
        var w = t - state.restT;
        var ramp = easeOutCubic(w / 400); // masuk halus, tanpa sentakan
        var a = IDLE_AMP * ramp;
        applyScale(0, 1 + a * Math.sin(TAU * w / IDLE_MS));
        applyScale(1, 1 + a * Math.sin(TAU * w / IDLE_MS + Math.PI));
      }
    },

    /* settle: rekam skala saat ini lalu luncurkan luruh 240ms ke scaleY=1. */
    settle: function (t) {
      if (!bars.length) return;
      if (state.mode === 'settling' || state.mode === 'rest') return;
      var u = opts.beatsAbsolute ? t : t - state.t0;
      state.settleFrom = [levelAt(0, u), levelAt(1, u)];
      state.settleT = t;
      state.mode = 'settling';
      if (reduceMotion) { // reduced-motion: langsung snap tanpa animasi
        state.mode = 'rest';
        state.restT = t;
        clearTransform(0); clearTransform(1);
      }
    },

    /* Saklar shimmer diam — bisa dimatikan orkestrator kapan pun. */
    setIdleShimmer: function (on) {
      opts.idleShimmer = !!on;
      if (!on && state.mode === 'rest') { clearTransform(0); clearTransform(1); }
    },

    /* Diagnostik harness: mode & level terkini (tak dipakai terintegrasi). */
    _debug: function () { return { mode: state.mode, hits: hits }; }
  };

  /* Buat batang <div> dari rect {x,y,width,height,rx} bila tak ada SVG. */
  function makeBarDiv(container, r, palette) {
    var doc = container.ownerDocument || (root && root.document);
    if (!doc || typeof doc.createElement !== 'function') return null;
    var el = doc.createElement('div');
    var gold = (palette && palette.gold) || '#F0C241';
    var goldHi = (palette && palette.goldHi) || '#FFD94F';
    el.style.cssText =
      'position:absolute;left:' + r.x + 'px;top:' + r.y + 'px;' +
      'width:' + r.width + 'px;height:' + r.height + 'px;' +
      'border-radius:' + (r.rx || r.width / 2) + 'px;' +
      'background:linear-gradient(180deg,' + goldHi + ',' + gold + ');';
    container.appendChild(el);
    return el;
  }

  /* Pendaftaran event 'bars-solid' → start() milik ORKESTRATOR
     (features/brand/fiezel-splash.js), bukan modul ini — supaya modul
     tetap bebas global dan aman dimuat di Node. */
  return eq;
});
