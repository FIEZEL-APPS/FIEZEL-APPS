/**
 * FIEZEL splash v4 — MODUL PARTIKEL (porting dari prototipe pau-redesign/splash-prototype).
 *
 * Awan titik emas/krem menyebar lalu MENGUMPUL membentuk huruf F lebih dulu
 * (batang tegak tiba lebih awal daripada kedua lengan), kemudian sisa
 * partikel emas merapat menjadi DUA KAPSUL batang. Saat kedua batang mulai
 * memadat, modul memancarkan event 'bars-solid' — serah-terima ke equalizer.
 *
 * Prinsip yang dipegang (arahan OWNER):
 *   - TANPA glow/bloom/sheen. Titik pejal bertepi tajam; kilau emas dihapus.
 *   - Palet terkunci: medan #1B1418, emas #F0C241/#FFD94F, krem #FFF4DA.
 *   - 60fps: kerja per-frame O(n), TANPA alokasi di hot loop, sprite titik
 *     dipra-render sekali. Posisi partikel PARAMETRIK terhadap waktu —
 *     scrub maju/mundur menghasilkan frame identik (QA reproducible).
 *   - Deterministik dari seed (mulberry32) — screenshot QA dapat diulang.
 *   - Jumlah partikel adaptif terhadap devicePixelRatio & layar kecil.
 *
 * API: FiezelSplashParticles = { init(canvas, opts), update(t, dt),
 *   getPhase(t), getLayout(), setSeed(s), T }.
 * opts.emit — fungsi event dari orkestrator ('f-locked'/'bars-solid');
 * modul TIDAK pernah memanggil requestAnimationFrame dan TIDAK menyentuh global.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSplashParticles = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  /* ====================================================================
     LINIMASA MODUL (ms sejak splash mulai) — selaras master timeline:
       0–950   : sebar → F mengumpul (batang lebih dulu, lengan menyusul)
       700–1150: partikel batang emas merapat; 'bars-solid' pada 1150
     Nilai hasil tuning QA — jangan ubah tanpa cek screenshot 5 titik.
     ==================================================================== */
  var T = {
    SCATTER_END: 140,   // akhir fase sebar murni (awan masih utuh)
    F_START: 120,       // partikel F paling awal mulai bergerak
    F_STEM_LOCK: 760,   // batang tegak F terkunci (bias lebih awal)
    F_LOCK: 950,        // F utuh terkunci → event 'f-locked'
    BARS_START: 700,    // partikel batang emas mulai merapat
    BARS_SOLID: 1150,   // dua kapsul terbaca → event 'bars-solid'
    F_FADE_IN: 820,     // (harness) SVG F tajam mulai crossfade masuk
    F_FADE_OUT0: 870,   // partikel F memudar SEIRING SVG masuk — di 950 debu
    F_FADE_OUT1: 970,   //   tinggal ≈4% sehingga kunci F jatuh KREM TAJAM,
                        //   tanpa bintik emas/abu (perbaikan QA-VISUAL P1-1)
    B_FADE_OUT0: 1150,  // partikel batang memudar setelah serah-terima
    B_FADE_OUT1: 1300,  // partikel batang habis — tak ada titik tersisa
    DONE: 1320
  };

  /* Geometri merek PERSIS dari assets/fiezel-icon.svg (ruang 512x512).
     grup: 0 = batang F, 1 = lengan F, 2 = batang emas 1, 3 = batang emas 2. */
  var RECTS = [
    { x: 136, y: 148, w: 42,  h: 216, r: 20, grp: 0 }, // batang tegak F
    { x: 136, y: 148, w: 128, h: 42,  r: 20, grp: 1 }, // lengan atas F
    { x: 136, y: 230, w: 102, h: 40,  r: 19, grp: 1 }, // lengan tengah F
    { x: 298, y: 200, w: 34,  h: 112, r: 17, grp: 2 }, // batang emas 1
    { x: 348, y: 166, w: 34,  h: 180, r: 17, grp: 3 }  // batang emas 2
  ];
  var LOGO_CX = 259, LOGO_CY = 256; // titik berat visual logo (ruang 512)

  /* Palet terkunci (CONTRACT: tanpa warna baru). indeks 0..2. */
  var COLORS = ['#F0C241', '#FFD94F', '#FFF4DA'];

  /* ---------- RNG deterministik (mulberry32) ---------- */
  var _rngState = 0;
  function srand(seed) { _rngState = seed >>> 0; }
  function rnd() {
    _rngState = (_rngState + 0x6D2B79F5) >>> 0;
    var z = _rngState;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /* ---------- Keadaan modul ---------- */
  var cv = null, ctx = null;
  var dpr = 1, cssW = 0, cssH = 0;
  var scale = 1, offX = 0, offY = 0;   // pemetaan ruang-512 → px CSS
  var seed = 20260828;                  // seed bawaan (tanggal ruling owner)
  var N = 0;                            // jumlah partikel aktif

  // Array datar — SEMUA data partikel, tanpa objek per-partikel.
  var sx, sy;        // posisi sebar (ruang 512)
  var tx, ty;        // posisi target (ruang 512)
  var t0a, t1a;      // jendela konvergensi per partikel [mulai, tiba] ms
  var siz;           // ukuran titik px CSS (1..2.5)
  var swA, ph1, ph2; // amplitudo curl + dua fase gelombang
  var rotW;          // laju orbit awan pra-konvergensi (rad/ms, ± arah)
  var colI, grpI;    // indeks warna, indeks grup (Uint8)

  var sprites = [];  // sprite titik pra-render per warna (canvas kecil)
  var emitF = false, emitB = false; // penjaga event sekali-jalan
  var _emit = null;                 // fungsi event suntikan orkestrator

  /* Sprite titik: cakram PEJAL 24px dengan tepi antialias tipis —
     BUKAN glow (tak ada halo; alfa 1 sampai 82% radius lalu putus cepat). */
  function makeSprites() {
    sprites.length = 0;
    var doc = (cv && cv.ownerDocument) || (root && root.document);
    if (!doc || typeof doc.createElement !== 'function') return;
    for (var i = 0; i < COLORS.length; i++) {
      var s = doc.createElement('canvas');
      s.width = 24; s.height = 24;
      var c = s.getContext('2d');
      var g = c.createRadialGradient(12, 12, 0, 12, 12, 12);
      g.addColorStop(0, COLORS[i]);
      g.addColorStop(0.82, COLORS[i]);
      g.addColorStop(1, COLORS[i] + '00'); // tepi halus 2px = antialias saja
      c.fillStyle = g;
      c.fillRect(0, 0, 24, 24);
      sprites.push(s);
    }
  }

  /* Sampel titik seragam di dalam rect bersudut bulat (rejection sampling,
     deterministik karena memakai rnd() berseed). */
  function sampleRoundRect(rc, out) {
    for (;;) {
      var px = rnd() * rc.w, py = rnd() * rc.h;
      var qx = Math.max(rc.r - px, px - (rc.w - rc.r), 0);
      var qy = Math.max(rc.r - py, py - (rc.h - rc.r), 0);
      if (qx * qx + qy * qy <= rc.r * rc.r) { out.x = rc.x + px; out.y = rc.y + py; return; }
    }
  }

  /* Jumlah partikel adaptif: layar luas + DPR tinggi → mendekati 2200;
     layar sempit (ponsel) / DPR rendah → turun mendekati 1400 agar 60fps. */
  function adaptiveCount(w, h, ratio) {
    var n = Math.round((w * h) / 640);
    if (ratio < 1.5) n = Math.round(n * 0.85);
    var lo = 1400, hi = 2200;
    if (Math.min(w, h) < 480) { lo = 1400; hi = 1700; } // ponsel: hemat fill-rate
    return Math.max(lo, Math.min(hi, n));
  }

  var _tmpPt = { x: 0, y: 0 };

  /* Bangun seluruh populasi partikel dari seed — deterministik penuh. */
  function build() {
    srand(seed);
    N = adaptiveCount(cssW, cssH, dpr);

    sx = new Float32Array(N);  sy = new Float32Array(N);
    tx = new Float32Array(N);  ty = new Float32Array(N);
    t0a = new Float32Array(N); t1a = new Float32Array(N);
    siz = new Float32Array(N);
    swA = new Float32Array(N); ph1 = new Float32Array(N); ph2 = new Float32Array(N);
    rotW = new Float32Array(N);
    colI = new Uint8Array(N);  grpI = new Uint8Array(N);

    // Pembagian jatah per rect sebanding luasnya; batang emas diberi bobot
    // ekstra 1.3x supaya kapsul terbaca padat saat serah-terima.
    var areas = [], total = 0, i, k;
    for (i = 0; i < RECTS.length; i++) {
      var a = RECTS[i].w * RECTS[i].h * (RECTS[i].grp >= 2 ? 1.3 : 1);
      areas.push(a); total += a;
    }

    // Radius medan sebar dalam ruang-512 (menutupi seluruh kanvas).
    var fieldR = Math.max(cssW, cssH) / scale * 0.46;

    var idx = 0;
    for (k = 0; k < RECTS.length; k++) {
      var rc = RECTS[k];
      var quota = (k === RECTS.length - 1) ? (N - idx) : Math.round(N * areas[k] / total);
      for (i = 0; i < quota && idx < N; i++, idx++) {
        sampleRoundRect(rc, _tmpPt);
        tx[idx] = _tmpPt.x; ty[idx] = _tmpPt.y;
        grpI[idx] = rc.grp;

        // ---- Posisi sebar: galaksi dua-lengan yang berputar pelan.
        // Partikel BATANG EMAS disebar di sisi KANAN (awan menunggu di sisi
        // targetnya) supaya saat F terkunci, sisa awan terbaca disengaja.
        var u = rnd();
        var r = fieldR * (0.30 + 0.70 * Math.pow(u, 0.62));
        var th;
        if (rc.grp >= 2) {
          // Awan-tunggu batang emas: gumpalan lonjong RAPAT di sekitar
          // centroid kedua batang (356,256) — tidak meluber ke tepi layar,
          // terbaca sebagai awan yang sengaja menunggu di posisi targetnya.
          th = rnd() * 6.2832;
          var rb = fieldR * (0.10 + 0.42 * Math.pow(u, 0.7));
          sx[idx] = 356 + Math.cos(th) * rb * 0.72;
          sy[idx] = 256 + Math.sin(th) * rb * 1.05;
        } else {
          th = (idx % 2 ? 0 : Math.PI) + r * 0.0105 + (rnd() - 0.5) * 0.9;
          sx[idx] = LOGO_CX + Math.cos(th) * r * 1.12;
          sy[idx] = LOGO_CY + Math.sin(th) * r * 0.88;
        }

        // ---- Jendela konvergensi (stagger tiba satu-satu, kunci renyah).
        var j = rnd();
        if (rc.grp === 0) {          // batang F: bias LEBIH AWAL
          t0a[idx] = T.F_START + j * 160;
          t1a[idx] = 520 + Math.pow(rnd(), 1.4) * (T.F_STEM_LOCK - 520);
        } else if (rc.grp === 1) {   // lengan F: menyusul, rampung 910 — partikel
          t0a[idx] = T.F_START + 90 + j * 210; // “memegang” bentuk sampai ≈98%
          t1a[idx] = 620 + Math.pow(rnd(), 1.25) * (910 - 620); // sebelum SVG penuh @944
        } else {                     // batang emas: 700 → ≤1148
          t0a[idx] = T.BARS_START + j * 190;
          t1a[idx] = 960 + Math.pow(rnd(), 1.2) * (1148 - 960) + (rc.grp === 3 ? 0 : -30);
        }

        // ---- Rupa titik: 1–2.5px; huruf F condong krem, batang condong emas
        // (meniru pewarnaan logo asli sehingga bentuk terbaca sejak dini).
        siz[idx] = 1 + rnd() * 1.5;
        var cr = rnd();
        colI[idx] = rc.grp >= 2
          ? (cr < 0.55 ? 0 : cr < 0.9 ? 1 : 2)   // emas #F0C241 dominan
          : (cr < 0.52 ? 2 : cr < 0.8 ? 0 : 1);  // krem #FFF4DA dominan

        // ---- Parameter curl-noise per partikel.
        swA[idx] = 16 + rnd() * 26;               // amplitudo (unit 512)
        ph1[idx] = rnd() * 6.2832;
        ph2[idx] = rnd() * 6.2832;
        /* Orbit awan pra-konvergensi: dipercepat ×3.5 dari tuning awal —
           300ms pertama kini memperlihatkan busur gerak yang jelas antar
           frame (dulu “debu statis”, QA-VISUAL P2-3). */
        rotW[idx] = (rnd() < 0.5 ? -1 : 1) * (0.00042 + rnd() * 0.00048);
      }
    }
    emitF = false; emitB = false;
  }

  /* ==================================================================
     POSISI PARAMETRIK — pos(i, t) dihitung murni dari t (tanpa keadaan
     terakumulasi) sehingga scrub QA deterministik. Hasil ditulis ke
     _px/_py level-modul: NOL alokasi di hot loop.
     ================================================================== */
  var _px = 0, _py = 0;
  function posAt(i, t) {
    var p = (t - t0a[i]) / (t1a[i] - t0a[i]);
    if (p <= 0) p = 0; else if (p >= 1) p = 1;
    // Easing: berangkat halus, meluncur cepat, lalu MENGUNCI renyah
    // (pangkat 3.2 → kecepatan datang masih terasa saat snap ke target).
    var q = 1 - p, e = 1 - q * q * q * (1 + 0.2 * p);

    if (e >= 1) { _px = tx[i]; _py = ty[i]; return; } // terkunci: presisi mutlak

    // Awan pra-konvergensi berputar pelan mengelilingi pusat logo
    // (rotasi membeku begitu partikel berangkat — bobotnya (1-e) → 0).
    var a = rotW[i] * (t < t0a[i] ? t : t0a[i]);
    var ca = Math.cos(a), sa = Math.sin(a);
    var dx = sx[i] - LOGO_CX, dy = sy[i] - LOGO_CY;
    var ox = LOGO_CX + dx * ca - dy * sa;
    var oy = LOGO_CY + dx * sa + dy * ca;

    var x = ox + (tx[i] - ox) * e;
    var y = oy + (ty[i] - oy) * e;

    // Curl-noise analitik (medan hampir bebas-divergensi dari dua gelombang
    // potensial) — pusaran koheren selama terbang, meluruh (1-e)^1.6 → snap.
    var w = (1 - e); w = w * Math.sqrt(w) * swA[i];
    _px = x + w * (Math.sin(y * 0.021 + t * 0.0011 + ph1[i]) +
                   0.5 * Math.sin(y * 0.047 - t * 0.0007 + ph2[i]));
    _py = y + w * (Math.cos(x * 0.019 - t * 0.0009 + ph2[i]) +
                   0.5 * Math.cos(x * 0.043 + t * 0.0013 + ph1[i]));
  }

  /* Alfa per grup: partikel F memudar setelah SVG tajam masuk; partikel
     batang memudar setelah 'bars-solid' — tak ada titik tersisa > DONE. */
  function groupAlpha(grp, t) {
    var a0, a1;
    if (grp <= 1) { a0 = T.F_FADE_OUT0; a1 = T.F_FADE_OUT1; }
    else          { a0 = T.B_FADE_OUT0; a1 = T.B_FADE_OUT1; }
    if (t <= a0) return 1;
    if (t >= a1) return 0;
    var k = 1 - (t - a0) / (a1 - a0);
    return k * k; // meluruh kuadratik: cepat bersih, tanpa ekor kabur
  }

  /* ==================================================================
     API PUBLIK
     ================================================================== */
  var particles = {
    T: T,

    /* init(canvas, {targets?, seed?, count?}) — targets opsional; bila tak
       diberikan, disampel dari RECTS (geometri persis fiezel-icon.svg). */
    init: function (canvas, opts) {
      opts = opts || {};
      cv = canvas;
      if (!cv || typeof cv.getContext !== 'function') { ctx = null; return false; }
      ctx = cv.getContext('2d');
      if (!ctx) return false;
      _emit = typeof opts.emit === 'function' ? opts.emit : null;
      dpr = Math.max(1, Math.min(2, (root && root.devicePixelRatio) || 1));
      cssW = cv.clientWidth || cv.width;
      cssH = cv.clientHeight || cv.height;
      cv.width = Math.round(cssW * dpr);
      cv.height = Math.round(cssH * dpr);

      // Tata letak: logo 512 dipusatkan, tinggi ~62% sisi terpendek —
      // proporsi sama dengan .fz-logo-slot pada splash terintegrasi.
      var box = Math.min(cssW, cssH) * 0.62;
      scale = box / 512;
      // ViewBox center is x=256, but the visible mark center is LOGO_CX=259.
      // Match the SVG optical correction so particles and sharp logo share one center.
      offX = (cssW - 512 * scale) / 2 - (LOGO_CX - 256) * scale;
      offY = (cssH - 512 * scale) / 2;

      if (typeof opts.seed === 'number') seed = opts.seed >>> 0;
      makeSprites();
      build();
      if (typeof opts.count === 'number') { /* count eksplisit menimpa adaptif */
        N = Math.max(200, Math.min(2200, opts.count | 0)); build();
      }

      // Bila orkestrator memasok targets hasil sampling SVG offscreen,
      // pakai itu (menimpa sampling RECTS) — kontrak init({targets}).
      if (opts.targets && opts.targets.f) this._applyTargets(opts.targets);
      return true;
    },

    /* Terapkan target eksternal {f, bar1, bar2} (array {x,y} ruang 512). */
    _applyTargets: function (tg) {
      var lists = [tg.f, tg.bar1, tg.bar2];
      var grps = [1, 2, 3];
      for (var i = 0; i < N; i++) {
        var li = grpI[i] <= 1 ? 0 : grpI[i] - 1;
        var arr = lists[li];
        if (!arr || !arr.length) continue;
        var p = arr[i % arr.length];
        tx[i] = p.x; ty[i] = p.y;
        grpI[i] = grpI[i] <= 1 ? grpI[i] : grps[li];
      }
    },

    setSeed: function (s) { seed = s >>> 0; if (cv) build(); },
    getLayout: function () { return { scale: scale, offX: offX, offY: offY, width: cssW, height: cssH }; },

    getPhase: function (t) {
      if (t < T.SCATTER_END) return 'SCATTER';
      if (t < T.F_LOCK) return 'CONVERGE_F';
      if (t < T.BARS_START + 260 && t < T.F_LOCK + 10) return 'F_LOCKED';
      if (t < T.BARS_SOLID) return 'CONVERGE_BARS';
      return 'HANDOFF';
    },

    /* update(t, dt) — dipanggil jam orkestrator (atau harness). Menggambar
       satu frame penuh pada waktu t. Scrub mundur mereset penjaga event. */
    update: function (t, dt) {
      if (!ctx) return;
      void dt; // gerak parametrik: dt tak dipakai (kecepatan dihitung analitik)

      // Penjaga event: reset bila jam melompat mundur (scrub QA).
      if (t < T.F_LOCK) emitF = false;
      if (t < T.BARS_SOLID) emitB = false;
      if (!emitF && t >= T.F_LOCK) {
        emitF = true;
        if (_emit) _emit('f-locked');
      }
      if (!emitB && t >= T.BARS_SOLID) {
        emitB = true;
        if (_emit) _emit('bars-solid');
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (t >= T.DONE) return; // semua partikel sudah bersih — hemat GPU

      var aF = groupAlpha(0, t), aB = groupAlpha(2, t);
      var i, gAlpha, spr;
      var lastAlpha = -1, lastCol = -1;

      /* Nyala pembuka: 0–420ms titik digambar hingga 1.5× ukuran (meluruh ke
         1×) — medan sebar lebih terang & terasa menyala sejak frame pertama
         (QA-VISUAL P2-3). Parametrik murni terhadap t: scrub tetap identik. */
      var ign = t < 420 ? 1 + 0.5 * (1 - t / 420) : 1;

      for (i = 0; i < N; i++) {
        gAlpha = grpI[i] <= 1 ? aF : aB;
        if (gAlpha <= 0.004) continue;

        /* Posisi kini & kecepatan. Dua jalur hemat (QA-PERF F-3):
           - TERKUNCI dua sampel: posisi = target persis, tanpa trig sama sekali.
           - PRA-TERBANG: satu posAt + kecepatan analitik rotasi (v = ω×r) —
             busur regang awan tetap tergambar tanpa sampel kedua.
           Jalur penuh (dua posAt) hanya untuk partikel yang sedang terbang. */
        var pNow = (t - t0a[i]) / (t1a[i] - t0a[i]);
        var x1, y1, vx, vy, sp2;
        if (pNow >= 1) {
          x1 = tx[i]; y1 = ty[i];
          if (t - 16.7 >= t1a[i]) { vx = 0; vy = 0; sp2 = 0; }
          else {
            posAt(i, t - 16.7);
            vx = (x1 - _px) * scale; vy = (y1 - _py) * scale;
            sp2 = vx * vx + vy * vy;
          }
        } else if (pNow <= 0) {
          posAt(i, t);
          x1 = _px; y1 = _py;
          var wv = rotW[i] * 16.7;
          vx = -(y1 - LOGO_CY) * wv * scale; vy = (x1 - LOGO_CX) * wv * scale;
          sp2 = vx * vx + vy * vy;
        } else {
          posAt(i, t);
          x1 = _px; y1 = _py;
          posAt(i, t - 16.7);
          vx = (x1 - _px) * scale; vy = (y1 - _py) * scale; // px CSS / frame
          sp2 = vx * vx + vy * vy;
        }

        var x = offX + x1 * scale, y = offY + y1 * scale;
        var s = siz[i] * ign;
        var cs = 1, sn = 0, len = s, wid = s;
        if (sp2 > 0.09) {
          var sp = Math.sqrt(sp2);
          cs = vx / sp; sn = vy / sp;
          var st = sp * 0.085; if (st > 1.5) st = 1.5; // regangan maks 2.5x
          len = s * (1 + st);
          wid = s * (1 - st * 0.24); if (wid < 0.55) wid = 0.55;
        }

        if (gAlpha !== lastAlpha) { ctx.globalAlpha = gAlpha; lastAlpha = gAlpha; }
        if (colI[i] !== lastCol) { spr = sprites[colI[i]]; lastCol = colI[i]; }
        else spr = sprites[lastCol];

        // Transform per titik: rotasi searah kecepatan + skala len×wid.
        var kx = len / 24 * dpr, ky = wid / 24 * dpr;
        ctx.setTransform(cs * kx, sn * kx, -sn * ky, cs * ky, x * dpr, y * dpr);
        ctx.drawImage(spr, -12, -12);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }
  };

  return particles;
});
