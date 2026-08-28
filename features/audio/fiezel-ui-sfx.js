/**
 * FIEZEL — identitas bunyi: pustaka SFX terproduksi (27 berkas), pemutar sampel.
 *
 * [ADAPTASI] OA-7 / brief SFX OWNER 2026-08-28: "hapus yang lama semuanya, ganti dengan ini."
 * Seluruh sintesis WebAudio lama (motif-quotation: mallet/PARTIALS/shimmer/breath/strike,
 * m025-81..m025-92) DIHAPUS dari berkas ini dan digantikan pemutar sampel untuk 27 berkas
 * OGG hasil produksi di assets/audio/sfx/ (spesifikasi: pau-redesign/systems/20-sfx-system.md,
 * mekanika produksi: pau-redesign/sfx/SFX-CONTRACT.md). Motif merek "Ascent & Crown"
 * (F4→A4→C5→G5) sekarang hidup DI DALAM berkas-berkas itu, bukan di osilator.
 *
 * PUTUSAN OWNER (2026-08-28, surat lanjutan):
 *   1. paw_greet adalah BUNYI TANDA TANGAN FIEZEL - setiap slot "signature"/sapaan/
 *      pembukaan aplikasi memetakan ke paw_greet (termasuk playMotif() lama).
 *   2. stamp_thud PENSIUN sebagai pemicu: tidak ada satu pun peristiwa yang membunyikannya.
 *      Berkasnya tetap dikirim di assets/audio/sfx/ untuk kompatibilitas koreografi splash.
 *
 * Yang SENGAJA dipertahankan dari versi lama, karena pelajarannya dibayar mahal:
 *   - Nama modul, bentuk API publik (play/playMotif/cancelPending/diagnostics/...), dan
 *     nama-nama bunyi lama sebagai ALIAS - semua pemanggil tetap bekerja tanpa diubah.
 *   - Sakelar preferensi murid "Suara jawaban" (feedbackSounds) tetap satu-satunya sakelar
 *     (m025-90): preferencesAllow() membaca state lewat __getFiezelState.
 *   - m025-84: JANGAN PERNAH menjadwalkan bunyi ke konteks yang belum berjalan. Bunyi yang
 *     tidak boleh berbunyi sekarang ditolak atau disiagakan dengan tenggat, tidak diantre.
 *   - m025-88: kurangi-gerak TIDAK membisukan bunyi - ia permintaan tentang GERAKAN.
 *   - m025-92: sesi audio iOS diklaim sebagai 'playback' SEKALI, sebelum konteks pertama.
 *
 * Yang baru di pemutar sampel:
 *   - MANIFEST: 27 nama → {berkas, gain, cooldown, jatah sesi} - nilai penjatahan dibawa
 *     dari systems/14-voice-sfx.md §3.2 (entrance ≥8 dtk, encourage ≥20 dtk ×2/sesi, dst).
 *   - fetch → decodeAudioData → cache AudioBuffer, malas per bunyi; empat bunyi
 *     berfrekuensi tertinggi (answer_correct, answer_wrong, button_tap, xp_gain)
 *     dipanaskan setelah sentuhan pertama, sisanya menunggu giliran dipanggil.
 *   - exam_score_tick menaiki playbackRate lewat opsi {rate} - satu aset, bukan tangga berkas.
 *   - Nama asing: console.warn sekali per nama, lalu diam - antarmuka tidak pernah rusak
 *     hanya karena bunyinya tidak dikenal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelUiSfx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Koreografi tetap SATU-SATUNYA sumber ritme visual splash; tabel ketukannya juga masih
  // dibaca di sini sebagai METADATA (grid ketukan yang kini tertanam di splash_intro.ogg),
  // supaya tes koreografi dan pembaca beat grid tidak kehilangan sumbernya. Fallback di
  // bawah hanya untuk lingkungan uji Node yang memuat modul ini sendirian.
  var CHOREO = (function () {
    try {
      var g = typeof globalThis !== 'undefined' ? globalThis : null;
      if (g && g.FiezelChoreography) return g.FiezelChoreography;
      if (typeof require === 'function') return require('../brand/fiezel-choreography.js');
    } catch (_) {}
    return null;
  })();

  var N = Object.freeze(CHOREO ? CHOREO.PITCH : {
    F2: 87.31, F3: 174.61, C4: 261.63, F4: 349.23, A4: 440.00, C5: 523.25, G5: 783.99
  });

  /**
   * Grid ketukan splash sebagai data [nada, mulai, panjang, peran] - diturunkan dari tabel
   * koreografi, tidak ditulis ulang di sini. Ini BUKAN lagi jadwal osilator: berkas
   * splash_intro.ogg yang membawa bunyinya. Grid ini tinggal sebagai metadata sinkronisasi
   * (equalizer splash & tes koreografi membacanya).
   */
  function motifFromChoreography() {
    if (!CHOREO || typeof CHOREO.audioBeats !== 'function') {
      return [[N.F4, 0.000, 0.34], [N.A4, 0.105, 0.34], [N.C5, 0.210, 1.15]];
    }
    var beats = CHOREO.audioBeats();
    var endsAt = CHOREO.motionEndsAt() / 1000;
    var out = [];
    for (var i = 0; i < beats.length; i++) {
      var b = beats[i];
      var dur = Math.max(0.28, (endsAt - b.at) + 0.45);
      out.push([b.freq, b.at, dur, b.role]);
    }
    return out;
  }

  var MOTIF = Object.freeze(motifFromChoreography());

  var BASE = './assets/audio/sfx/';

  /**
   * [ADAPTASI] OI-1: Safari/iOS tidak bisa mendekode Ogg Vorbis, jadi setiap bunyi dikirim
   * kembar .ogg + .mp3 dan ekstensinya dinegosiasikan SEKALI di sini lewat canPlayType.
   * OGG tetap format utama (lebih kecil + gapless), MP3 hanya untuk mesin yang mengaku
   * tidak sanggup OGG tetapi sanggup MP3. Di lingkungan tanpa DOM (tes Node) jawabannya
   * .ogg - kontrak urlFor() untuk tes berbasis fs tidak berubah.
   */
  var EXT = (function () {
    try {
      var d = typeof document !== 'undefined' ? document : null;
      if (d && typeof d.createElement === 'function') {
        var probe = d.createElement('audio');
        if (probe && typeof probe.canPlayType === 'function') {
          var ogg = probe.canPlayType('audio/ogg; codecs="vorbis"');
          var mp3 = probe.canPlayType('audio/mpeg');
          if (!ogg && mp3) return '.mp3';
        }
      }
    } catch (_) { /* deteksi gagal = pakai format utama */ }
    return '.ogg';
  })();

  /**
   * Manifest 27 bunyi. `gain` relatif terhadap master (level akhir sudah ditata di master
   * produksi lewat tangga RMS - lihat 20-sfx-system.md §6 - jadi 1.0 adalah nilai jujur).
   * `cooldownMs`/`maxPerSession` membawa aturan penjatahan 14 §3.2. `caller` mencatat siapa
   * yang berhak membunyikannya: 'app' (uiSfx di app.js), 'module' (fitur lain),
   * 'splash' (koreografi splash), 'preview' (belum punya momen produk - hanya halaman
   * audisi), 'reserved'/'retired' (tidak dipicu apa pun).
   */
  var MANIFEST = Object.freeze({
    answer_correct:         { gain: 1.0, cooldownMs: 120,   caller: 'app' },
    answer_correct_perfect: { gain: 1.0, cooldownMs: 120,   caller: 'preview' },
    answer_wrong:           { gain: 1.0, cooldownMs: 120,   caller: 'app' },
    answer_wrong_retry:     { gain: 1.0, cooldownMs: 120,   caller: 'preview' },
    button_tap:             { gain: 1.0, cooldownMs: 50,    caller: 'app' },
    page_transition:        { gain: 1.0, cooldownMs: 160,   caller: 'app' },
    error_system:           { gain: 1.0, cooldownMs: 1500,  caller: 'app' },
    lesson_start:           { gain: 1.0, cooldownMs: 1000,  caller: 'app' },
    lesson_complete:        { gain: 1.0, cooldownMs: 1500,  caller: 'app' },
    level_up:               { gain: 1.0, cooldownMs: 3000,  caller: 'app' },      // [SFX-WIRING] milestone once-ever non-streak (pawMilestone app.js)
    streak_5:               { gain: 1.0, cooldownMs: 1500,  caller: 'app' },
    streak_10:              { gain: 1.0, cooldownMs: 1500,  caller: 'app' },      // [SFX-WIRING] milestone runtun hari 7/30/100 (pawStreakWatch)
    xp_gain:                { gain: 1.0, cooldownMs: 80,    caller: 'app' },
    exam_complete:          { gain: 1.0, cooldownMs: 3000,  caller: 'app' },
    exam_pass:              { gain: 1.0, cooldownMs: 3000,  caller: 'app' },
    exam_result_reveal:     { gain: 1.0, cooldownMs: 1500,  caller: 'preview' },
    exam_score_tick:        { gain: 1.0, cooldownMs: 0,     caller: 'preview' },
    notif_general:          { gain: 1.0, cooldownMs: 4000,  caller: 'app' },
    notif_achievement:      { gain: 1.0, cooldownMs: 4000,  caller: 'app' },      // [SFX-WIRING] prasasti/lencana terbit (presentPrasastiMoment)
    notif_streak_reminder:  { gain: 1.0, cooldownMs: 4000,  caller: 'app' },
    // PUTUSAN OWNER: paw_greet = bunyi tanda tangan. Sekali per sesi cukup - sapaan yang
    // diulang berhenti terdengar sebagai sapaan.
    paw_greet:              { gain: 1.0, cooldownMs: 8000,  maxPerSession: 2, caller: 'app' },
    // Entrance ≥8 dtk antar-bunyi, sekali per mount (14 §3.2) - cooldown yang menjaganya.
    paw_appear:             { gain: 1.0, cooldownMs: 8000,  caller: 'module' },   // [SFX-WIRING] coach-bubble + slot paw + onboarding
    // Encourage: maksimal 2/sesi, jarak ≥20 dtk (09 §4 / 14 §3.2).
    paw_encourage:          { gain: 1.0, cooldownMs: 20000, maxPerSession: 2, caller: 'app' },
    paw_celebrate:          { gain: 1.0, cooldownMs: 3000,  caller: 'app' },
    splash_intro:           { gain: 1.0, cooldownMs: 3000,  caller: 'splash' },
    // RESERVED - m025-80: splash tetap tanpa maskot, permanen. Aset ada, pemicunya tidak.
    splash_paw_appear:      { gain: 1.0, cooldownMs: 8000,  caller: 'reserved' },
    // PENSIUN sebagai pemicu (putusan OWNER 2026-08-28): tidak ada peristiwa yang
    // membunyikan stamp_thud lagi; slot hentakan memetakan ke paw_greet. Berkas tetap
    // dikirim untuk kompatibilitas koreografi splash.
    stamp_thud:             { gain: 1.0, cooldownMs: 3000,  caller: 'retired' }
  });

  /**
   * Nama-nama lama → berkas baru (peta peristiwa 20-sfx-system.md §4 + putusan OWNER).
   * Pemanggil lama tidak diubah satu pun; alias inilah kabel penyambungnya.
   */
  var ALIASES = Object.freeze({
    tap:       'button_tap',       // ketuk generik
    toggle:    'button_tap',       // sakelar = ketuk standar (bunyi khusus toggle pensiun)
    open:      'button_tap',       // buka/tutup panel: cukup ketuk standar (14 §3.1-5)
    close:     'button_tap',
    nav:       'page_transition',  // pindah layar → whoosh transisi
    celebrate: 'lesson_complete',  // akor perayaan lama = fanfare lesson_complete
    success:   'answer_correct',   // kosakata playFeedbackSound lama
    error:     'answer_wrong',
    motif:     'paw_greet'         // slot signature/sapaan → paw_greet (putusan OWNER)
  });

  // Empat bunyi berfrekuensi tertinggi: dipanaskan setelah sentuhan pertama supaya jawaban
  // pertama pun berbunyi tanpa menunggu unduhan. Sisanya malas - dipanggil, baru diambil.
  var PRELOAD = Object.freeze(['answer_correct', 'answer_wrong', 'button_tap', 'xp_gain']);

  var ctx = null, master = null, enabled = true;
  var buffers = {};   // nama → AudioBuffer yang sudah didekode
  var loading = {};   // nama → Promise unduhan yang sedang berjalan
  var lastPlayedAt = {}, sessionCount = {};
  var warned = {};
  // Sapaan signature yang menunggu izin audio (bekas motif splash). expiresAt-lah pagar
  // yang membuat bug "bunyi splash tumpah di menu" (m025-84) tidak bisa terulang.
  var pending = null;
  var unlockBound = false;
  var preloaded = false;
  // Berapa lama sebuah SFX transisi masih relevan setelah diminta (resume() asinkron).
  var GESTURE_GRACE_MS = 350;
  var DEFAULT_MOTIF_WINDOW_MS = 2600;

  function preferencesAllow(env) {
    try {
      var s = env && typeof env.__getFiezelState === 'function' ? env.__getFiezelState() : null;
      var p = s && s.preferences;
      // Ikut sakelar "Suara jawaban" yang sudah ada - menambah sakelar baru untuk hal
      // sejenis hanya memperumit Pengaturan.
      return !p || p.feedbackSounds !== false;
    } catch (_) { return true; }
  }

  function reducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  /**
   * m025-92: KATEGORI sesi audio, bukan izin audio. iOS memberi Web Audio kategori
   * 'ambient' secara bawaan - ikut dibungkam saklar senyap dan mengalah pada audio lain.
   * FIEZEL bukan audio latar; kategorinya 'playback'. Diklaim SEKALI, sebelum konteks
   * pertama dibuat, dan kegagalannya ditelan.
   */
  var audioSessionClaimed = false;
  function claimAudioSession(env) {
    if (audioSessionClaimed) return false;
    audioSessionClaimed = true;
    try {
      var session = env && env.navigator && env.navigator.audioSession;
      if (session && typeof session.type === 'string') { session.type = 'playback'; return true; }
    } catch (_) { /* kategori sesi bukan syarat berbunyi, hanya syarat terdengar di iOS */ }
    return false;
  }

  function ensureContext(env) {
    try {
      claimAudioSession(env);
      if (ctx) {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
        return true;
      }
      var Ctx = env.AudioContext || env.webkitAudioContext;
      if (!Ctx) return false;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.5;   // master 0.5 dipertahankan; tangga kekerasan hidup di master produksi
      master.connect(ctx.destination);
      return true;
    } catch (_) { return false; }
  }

  /**
   * m025-88: bunyi hanya tunduk pada dua hal yang memang berhak memutuskannya - sakelar
   * preferensi murid dan izin audio browser. Kurangi-gerak TIDAK membisukan bunyi.
   */
  function ready(env, ignoreMotion) {
    if (!enabled) return false;
    if (!preferencesAllow(env)) return false;
    return ensureContext(env);
  }

  function running() { return !!ctx && ctx.state === 'running'; }

  function resumeContext() {
    try {
      if (ctx && ctx.state !== 'running' && typeof ctx.resume === 'function') return ctx.resume();
    } catch (_) { /* resume yang ditolak bukan kegagalan antarmuka */ }
    return null;
  }

  function userActivated(env) {
    try {
      var ua = env && env.navigator && env.navigator.userActivation;
      if (ua && typeof ua.hasBeenActive === 'boolean') return ua.hasBeenActive;
    } catch (_) {}
    return null;
  }

  function resolve(name) {
    var key = ALIASES[name] || name;
    return MANIFEST[key] ? key : null;
  }

  function urlFor(name) { return BASE + name + EXT; }

  /** Mengambil dan mendekode satu sampel, sekali; hasil dan janji unduhannya di-cache. */
  function loadBuffer(env, name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    var fetcher = env && env.fetch ? env.fetch.bind(env) : (typeof fetch === 'function' ? fetch : null);
    if (!fetcher || !ctx || typeof ctx.decodeAudioData !== 'function') {
      return Promise.reject(new Error('audio decode tidak tersedia'));
    }
    loading[name] = fetcher(urlFor(name))
      .then(function (r) {
        if (!r || !r.ok) throw new Error('sfx ' + name + ' gagal diunduh');
        return r.arrayBuffer();
      })
      .then(function (raw) {
        // decodeAudioData gaya-callback masih dipakai Safari lama; bungkus dua-duanya.
        return new Promise(function (yes, no) {
          try {
            var p = ctx.decodeAudioData(raw, yes, no);
            if (p && typeof p.then === 'function') p.then(yes, no);
          } catch (e) { no(e); }
        });
      })
      .then(function (buf) { buffers[name] = buf; delete loading[name]; return buf; })
      .catch(function (e) { delete loading[name]; throw e; });
    return loading[name];
  }

  /** Memanaskan empat bunyi tersibuk. Dipanggil pada sentuhan pertama, sekali. */
  function preloadHot(env) {
    if (preloaded || !ctx) return false;
    preloaded = true;
    for (var i = 0; i < PRELOAD.length; i++) {
      try { loadBuffer(env, PRELOAD[i]).catch(function () {}); } catch (_) {}
    }
    return true;
  }

  /** Penjatahan: cooldown antar-bunyi dan jatah per sesi (14 §3.2). */
  function rationAllows(name) {
    var m = MANIFEST[name];
    var t = Date.now();
    if (m.cooldownMs && lastPlayedAt[name] && t - lastPlayedAt[name] < m.cooldownMs) return false;
    if (m.maxPerSession && (sessionCount[name] || 0) >= m.maxPerSession) return false;
    return true;
  }

  function noteRation(name) {
    lastPlayedAt[name] = Date.now();
    sessionCount[name] = (sessionCount[name] || 0) + 1;
  }

  /** Membunyikan buffer yang SUDAH ada, sekarang. Sumber sekali pakai + gain per bunyi. */
  function startBuffer(name, opts) {
    var m = MANIFEST[name];
    var src = ctx.createBufferSource();
    src.buffer = buffers[name];
    if (opts && isFinite(opts.rate) && opts.rate > 0 && src.playbackRate) {
      try { src.playbackRate.value = opts.rate; } catch (_) {}
    }
    var g = ctx.createGain();
    g.gain.value = (m.gain || 1) * (opts && isFinite(opts.gain) ? opts.gain : 1);
    src.connect(g);
    g.connect(master);
    src.start(ctx.currentTime);
    return true;
  }

  /**
   * Jalur pemutaran inti. Buffer yang belum ada diambil dulu, lalu dibunyikan HANYA kalau
   * masih dalam jendela relevansinya - bunyi transisi yang datang telat bukan bunyi,
   * melainkan gangguan (pelajaran m025-84/-90).
   */
  function trigger(env, name, opts, windowMs) {
    if (!rationAllows(name)) return false;
    noteRation(name);
    var deadline = Date.now() + (isFinite(windowMs) ? windowMs : GESTURE_GRACE_MS);
    if (buffers[name]) {
      try { return startBuffer(name, opts); } catch (_) { return false; }
    }
    loadBuffer(env, name).then(function () {
      if (!running() || Date.now() > deadline) return;
      try { startBuffer(name, opts); } catch (_) {}
    }, function () { /* unduhan gagal = senyap, bukan antarmuka rusak */ });
    return true;
  }

  /**
   * Keadaan nyata modul ini di perangkat, untuk dibaca lewat panel Diagnostics (m025-90:
   * yang bisa dilihat, sekarang bisa dilihat).
   */
  function diagnostics(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var out = {
      enabled: enabled,
      preferensiSuara: preferencesAllow(target),
      kurangiGerak: reducedMotion(target),
      pernahDisentuh: userActivated(target),
      konteks: ctx ? String(ctx.state) : 'belum dibuat',
      motifDisiagakan: !!pending,
      webAudioTersedia: !!(target.AudioContext || target.webkitAudioContext),
      // Tidak bisa dideteksi dari web sama sekali; ditulis eksplisit supaya pembacanya tahu
      // ini titik buta, bukan sesuatu yang lupa diperiksa.
      saklarSenyapIOS: 'tidak dapat dideteksi dari web',
      sampelSiap: Object.keys(buffers).length,
      sampelTotal: Object.keys(MANIFEST).length,
      // m025-92: kategori sesi BISA dibaca, tidak seperti saklar senyap.
      sesiAudio: (function () {
        try {
          var s = target.navigator && target.navigator.audioSession;
          return s && typeof s.type === 'string' ? s.type : 'tidak didukung peramban ini';
        } catch (_) { return 'tidak terbaca'; }
      })()
    };
    return out;
  }

  /**
   * Pembuka audio sekali pakai pada sentuhan pertama. Fase CAPTURE supaya berjalan sebelum
   * handler tombol aplikasi - SFX tombol pertama pun punya peluang berbunyi. Sentuhan
   * pertama juga memanaskan empat bunyi tersibuk.
   */
  function bindUnlock(env) {
    if (unlockBound) return;
    var doc = env && env.document;
    if (!doc || typeof doc.addEventListener !== 'function') return;
    unlockBound = true;
    var types = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
    function unlock() {
      if (!ensureContext(env)) { detach(); return; }
      preloadHot(env);
      var p = resumeContext();
      if (p && typeof p.then === 'function') p.then(function () { firePending(env); }, function () {});
      else firePending(env);
      if (running()) detach();
    }
    function detach() {
      for (var i = 0; i < types.length; i++) {
        try { doc.removeEventListener(types[i], unlock, true); } catch (_) {}
      }
      unlockBound = false;
    }
    for (var i = 0; i < types.length; i++) {
      try { doc.addEventListener(types[i], unlock, true); } catch (_) {}
    }
  }

  function now() { return Date.now(); }

  /** Menyiagakan sapaan signature dengan TENGGAT. Lewat tenggat, ia dibuang (m025-84). */
  function armMotif(env, windowMs) {
    pending = { env: env, expiresAt: now() + windowMs };
    bindUnlock(env);
  }

  function firePending(env) {
    if (!pending) return false;
    if (now() > pending.expiresAt) { pending = null; return false; }
    if (!ensureContext(env)) { pending = null; return false; }
    if (!running()) { resumeContext(); return false; }
    var armed = pending;
    pending = null;
    var msLeft = Math.max(200, armed.expiresAt - now());
    try { return trigger(env, ALIASES.motif, null, msLeft); }
    catch (_) { return false; }
  }

  /** Membuang sapaan yang disiagakan. Dipanggil splash saat menutup. */
  function cancelPending() { pending = null; return true; }

  /**
   * Membunyikan satu SFX. Selalu aman dipanggil: nama asing (warn sekali + diam), audio
   * terblokir, atau preferensi mati semuanya berakhir sebagai `false`.
   * opts: { rate, gain } - rate dipakai exam_score_tick untuk tangga nada count-up.
   */
  function play(name, env, opts) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var key = resolve(name);
    if (!key) {
      if (!warned[name]) {
        warned[name] = true;
        try { console.warn('[FiezelUiSfx] bunyi tidak dikenal: "' + name + '" - tidak ada di manifest 27 SFX'); } catch (_) {}
      }
      return false;
    }
    if (!ready(target, false)) return false;
    if (running()) {
      preloadHot(target);
      return trigger(target, key, opts, buffers[key] ? 0 : 1200);
    }
    // Konteks belum berjalan: buka audio, lalu bunyikan HANYA kalau izinnya turun dalam
    // hitungan milidetik - selebihnya bunyi ini hilang, dan itu jawaban yang benar untuk
    // sebuah SFX transisi.
    var deadline = now() + GESTURE_GRACE_MS;
    var resumed = resumeContext();
    if (resumed && typeof resumed.then === 'function') {
      resumed.then(function () {
        if (!running() || now() > deadline) return;
        try { trigger(target, key, opts, GESTURE_GRACE_MS); } catch (_) {}
      }, function () {});
    }
    bindUnlock(target);
    return false;
  }

  /**
   * Sapaan merek untuk splash (API lama dipertahankan; fiezel-splash.js memanggil ini).
   * PUTUSAN OWNER: slot signature/sapaan = paw_greet. Berbunyi juga saat kurangi-gerak
   * aktif: ini sapaan sekali per peluncuran, bukan bunyi berulang.
   *
   * `options.windowMs` adalah umur splash yang memanggilnya. Di dalam jendela itu sapaan
   * boleh menunggu izin audio; di luarnya ia dibuang - pagar yang membuat bunyi splash
   * tidak bisa muncul sebagai kejutan di layar menu (m025-84).
   */
  function playMotif(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var windowMs = Number(opts.windowMs);
    if (!isFinite(windowMs) || windowMs < 0) windowMs = DEFAULT_MOTIF_WINDOW_MS;
    cancelPending();
    if (!enabled) return false;
    if (!preferencesAllow(target)) return false;
    // Dokumen yang belum pernah disentuh PASTI diblokir: hanya disiagakan sampai sentuhan
    // pertama, atau sampai tenggatnya lewat, mana yang lebih dulu.
    if (userActivated(target) === false) { armMotif(target, windowMs); return false; }
    if (!ensureContext(target)) return false;
    if (running()) {
      preloadHot(target);
      try { return trigger(target, ALIASES.motif, null, windowMs); }
      catch (_) { return false; }
    }
    armMotif(target, windowMs);
    var resumed = resumeContext();
    if (resumed && typeof resumed.then === 'function') resumed.then(function () { firePending(target); }, function () {});
    return false;
  }

  /** Membuka audio + memanaskan bunyi tersibuk. Untuk pembuka gestur milik app.js. */
  function unlock(env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    if (!ready(target, false)) return false;
    resumeContext();
    preloadHot(target);
    return true;
  }

  function setEnabled(v) { enabled = v !== false; return enabled; }

  return {
    NOTES: N,
    MOTIF: MOTIF,
    MANIFEST: MANIFEST,
    ALIASES: ALIASES,
    PRELOAD: PRELOAD,
    baseUrl: function () { return BASE; },
    urlFor: function (name) { var k = resolve(name); return k ? urlFor(k) : null; },
    names: function () { return Object.keys(MANIFEST); },
    play: play,
    playMotif: playMotif,
    unlock: unlock,
    cancelPending: cancelPending,
    diagnostics: diagnostics,
    pendingMotif: function () { return pending ? { expiresAt: pending.expiresAt } : null; },
    contextState: function () { return ctx ? String(ctx.state) : 'none'; },
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    // Hanya untuk pengujian: mengembalikan modul ke keadaan sebelum konteks apa pun dibuat.
    __reset: function () {
      ctx = null; master = null; pending = null; unlockBound = false; enabled = true;
      audioSessionClaimed = false; buffers = {}; loading = {}; lastPlayedAt = {};
      sessionCount = {}; warned = {}; preloaded = false;
    }
  };
});
