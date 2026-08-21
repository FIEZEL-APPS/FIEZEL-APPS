/**
 * FIEZEL — identitas bunyi: motif merek dan SFX transisi.
 *
 * m025-81 OWNER: "nadanya kurang dapat dan tidak membuat user akan mengingat, karena tidak
 * khas dan tidak bagus."
 *
 * Versi sebelumnya memakai F4->C5: kuint naik polos, interval paling umum di antarmuka
 * mana pun, dibunyikan dengan sinus murni. Tidak ada kontur, tidak ada ritme, tidak ada
 * timbre - tidak ada yang bisa diingat. Versi ini dirancang dari motif, bukan dari nada
 * lepas, dengan tiga hal yang membuat sebuah motif melekat:
 *
 * 1. KONTUR. Motifnya F4 -> A4 -> D5: terts besar naik, lalu kuart naik; rentang totalnya
 *    sekst besar. Nada penutup D adalah derajat KEENAM dari F mayor, bukan tonika - jadi
 *    ia berbunyi terbuka dan menggantung, seperti kalimat yang belum selesai. Itu disengaja:
 *    aplikasi belajar tidak sedang mengucapkan titik. F dipilih sebagai pusat karena F
 *    adalah huruf mereknya sendiri.
 * 2. RITME TIMPANG. Dua langkah cepat lalu satu pendaratan panjang - "ta-ta-TAAA".
 *    Jarak yang rata terdengar seperti bip; jarak yang timpang bisa ditirukan orang.
 * 3. TIMBRE BERTUBUH. Bukan sinus murni: ada ketukan palu di serangan, harmonik ketiga
 *    yang memberi kesan kayu, satu parsial taklaras untuk kilau logam, lapisan yang sedikit
 *    dilaraskan-lepas untuk kehangatan, dan lengkung nada kecil saat dipukul - seperti bilah
 *    yang benar-benar dipukul, bukan osilator yang dinyalakan.
 *
 * Setiap SFX transisi adalah POTONGAN dari motif itu, bukan bunyi baru. Jadi seluruh
 * aplikasi terdengar sebagai kutipan dari satu kalimat yang sama.
 *
 * Dua batas yang dijaga:
 * - Preferensi murid dihormati; `feedbackSounds: false` mematikan seluruh modul ini.
 * - Browser memblokir audio sebelum ada sentuhan pengguna. Konteks dibuat malas pada bunyi
 *   pertama dan kegagalan ditelan diam-diam - antarmuka tidak pernah rusak hanya karena
 *   suaranya tidak boleh berbunyi.
 *
 * m025-84 OWNER: "sfx sounds muncul belakangan saat user menekan tombol apapun di menu".
 *
 * Ini bukan bunyi yang dipanggil telat - ini bunyi splash yang TERANTRE, lalu tumpah
 * sekaligus di sentuhan pertama. Mekanismenya persis:
 *
 *   1. Splash memanggil playMotif() tanpa sentuhan pengguna. AudioContext yang lahir di
 *      sana berada dalam keadaan `suspended`.
 *   2. Pada keadaan `suspended`, ctx.currentTime BEKU. schedule() menghitung t0 =
 *      currentTime + 0.005 = 0.005 detik dan memanggil osc.start(0.005).
 *   3. Web Audio tidak membuang jadwal yang lewat - ia menahannya. Motifnya menunggu.
 *   4. Pengguna menekan tombol apa pun di menu. ensureContext() memanggil ctx.resume(),
 *      jam mulai berjalan dari ~0, dan SELURUH motif splash - tiga nada plus sub-bass 1,05
 *      detik - berbunyi di detik itu, di layar yang salah.
 *
 * Perbaikannya satu kalimat: JANGAN PERNAH menjadwalkan ke konteks yang belum berjalan.
 * Bunyi yang tidak bisa berbunyi sekarang tidak diantre - ia ditolak (`false`) atau, khusus
 * motif splash, "disiagakan" dengan tenggat yang terikat pada umur splash lewat windowMs.
 * Lewat tenggat itu ia dibuang. Tidak ada jalan lagi bagi bunyi splash untuk muncul di menu.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelUiSfx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var N = Object.freeze({
    F2: 87.31, F3: 174.61, A3: 220.00, D4: 293.66,
    F4: 349.23, A4: 440.00, C5: 523.25, D5: 587.33, F5: 698.46
  });

  // Motif merek. [nada, mulai (detik), panjang (detik)]
  var MOTIF = Object.freeze([
    [N.F4, 0.000, 0.34],
    [N.A4, 0.105, 0.34],
    [N.D5, 0.210, 1.15]
  ]);

  // SFX transisi — semuanya potongan dari MOTIF.
  var VOICES = Object.freeze({
    tap:       [[N.A4, 0.000, 0.15]],                          // satu nada tengah motif
    toggle:    [[N.F4, 0.000, 0.17]],                          // nada jangkar motif
    nav:       [[N.F4, 0.000, 0.20], [N.A4, 0.075, 0.26]],     // dua langkah pertama
    open:      [[N.A4, 0.000, 0.20], [N.D5, 0.075, 0.30]],     // lompatan penutup motif
    close:     [[N.D5, 0.000, 0.18], [N.A4, 0.075, 0.26]],     // lompatan itu dibalik
    celebrate: [[N.F4, 0.000, 0.26], [N.A4, 0.090, 0.26],
                [N.D5, 0.180, 0.34], [N.F5, 0.290, 0.85]]      // motif + oktaf penutup
  });

  // Susunan parsial satu bilah. Perbandingan inilah yang membuatnya berbunyi berkayu-
  // berlogam alih-alih seperti bip: [pengali frekuensi, kekerasan, pengali panjang].
  // 4.19x sengaja TAKLARAS - itu kilau logam yang cepat hilang.
  var PARTIALS = [[1.00, 1.00, 1.00], [2.00, 0.26, 0.72],
                  [3.00, 0.13, 0.50], [4.19, 0.07, 0.26]];
  var DETUNE = 1.0029;   // +5 sen, lapisan kehangatan
  var DECAY_FLOOR = 0.015; // exp(-4.2): titik akhir peluruhan eksponensial

  var ctx = null, master = null, tailIn = null, noiseBuf = null, enabled = true;
  // Motif yang menunggu izin audio. { notes, level, opts, expiresAt } - dan expiresAt-lah
  // yang membuat bug di header tidak bisa terulang: lewat tenggat, ia dibuang.
  var pending = null;
  var unlockBound = false;
  // Berapa lama sebuah SFX transisi masih relevan setelah diminta. Sentuhan pertama membuka
  // audio lewat resume() yang asinkron; menjadwalkan hasilnya setelah jeda ini berarti bunyi
  // yang tidak lagi menyertai apa pun.
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

  function ensureContext(env) {
    try {
      if (ctx) {
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') ctx.resume();
        return true;
      }
      var Ctx = env.AudioContext || env.webkitAudioContext;
      if (!Ctx) return false;
      ctx = new Ctx();

      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      // Ekor ruang: satu simpul tunda dengan umpan balik teredam. Memberi kesan bilah
      // dipukul di dalam ruangan, bukan di ruang hampa - itu yang membuatnya terdengar
      // mahal, dan jauh lebih murah daripada menjadwalkan salinan nada berulang kali.
      tailIn = ctx.createGain();
      tailIn.gain.value = 0.34;
      var delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.085;
      var damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 3200;
      var fb = ctx.createGain();
      fb.gain.value = 0.30;
      tailIn.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);      // lingkar umpan balik
      delay.connect(master);

      // Derau untuk ketukan palu, dibuat sekali lalu dipakai ulang.
      var len = Math.floor(ctx.sampleRate * 0.02);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0), prev = 0;
      for (var i = 0; i < len; i++) {
        prev = prev * 0.72 + (Math.random() * 2 - 1) * 0.28; // tapis lolos-bawah sederhana
        d[i] = prev;
      }
      return true;
    } catch (_) { return false; }
  }

  /** Ketukan palu: derau sangat pendek. Otak mengenali serangan sebelum mengenali nada. */
  function strike(at, level) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.9;
    var g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.014);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(at); src.stop(at + 0.02);
  }

  /** Satu bilah dipukul: empat parsial, dua lapisan laras, lengkung nada saat serangan. */
  function mallet(freq, at, dur, level) {
    for (var p = 0; p < PARTIALS.length; p++) {
      var mult = PARTIALS[p][0], amp = PARTIALS[p][1] * level, dscale = PARTIALS[p][2];
      for (var k = 0; k < 2; k++) {
        var detune = k ? DETUNE : 1;
        var a = k ? amp * 0.62 : amp;
        var d = dur * dscale;
        if (a < 0.0005) continue;
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        var f = freq * mult * detune;
        // Lengkung nada: mulai ~1,2% di atas lalu turun dalam 40 ms - seperti bilah nyata.
        osc.frequency.setValueAtTime(f * 1.012, at);
        osc.frequency.exponentialRampToValueAtTime(f, at + 0.040);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(a, at + 0.004);            // serangan cepat
        g.gain.exponentialRampToValueAtTime(a * DECAY_FLOOR, at + d); // peluruhan eksponensial
        g.gain.linearRampToValueAtTime(0.0001, at + d + 0.02);
        osc.connect(g);
        g.connect(master);
        if (p === 0 && k === 0) g.connect(tailIn);   // hanya dasar yang masuk ekor ruang
        osc.start(at);
        osc.stop(at + d + 0.05);
      }
    }
  }

  function schedule(notes, level, opts) {
    var t0 = ctx.currentTime + 0.005;
    for (var i = 0; i < notes.length; i++) {
      var freq = notes[i][0], at = t0 + notes[i][1], dur = notes[i][2];
      mallet(freq, at, dur, level);
      strike(at, level * 0.30);
    }
    if (opts && opts.sub) {
      // Nada rendah di bawah pendaratan: bobot tanpa menambah nada baru ke motif.
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(opts.sub[0], t0 + opts.sub[1]);
      g.gain.setValueAtTime(0.0001, t0 + opts.sub[1]);
      g.gain.linearRampToValueAtTime(level * 0.34, t0 + opts.sub[1] + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.sub[1] + opts.sub[2]);
      osc.connect(g); g.connect(master);
      osc.start(t0 + opts.sub[1]); osc.stop(t0 + opts.sub[1] + opts.sub[2] + 0.02);
    }
  }

  function ready(env, ignoreMotion) {
    if (!enabled) return false;
    if (!ignoreMotion && reducedMotion(env)) return false;
    if (!preferencesAllow(env)) return false;
    return ensureContext(env);
  }

  /** Satu-satunya keadaan di mana menjadwalkan bunyi berarti membunyikannya sekarang. */
  function running() { return !!ctx && ctx.state === 'running'; }

  function resumeContext() {
    try {
      if (ctx && ctx.state !== 'running' && typeof ctx.resume === 'function') return ctx.resume();
    } catch (_) { /* resume yang ditolak bukan kegagalan antarmuka */ }
    return null;
  }

  /**
   * Apakah dokumen ini pernah disentuh pengguna. Kalau jawabannya pasti "belum", membuat
   * AudioContext hanya melahirkan konteks `suspended` - persis benda yang bug di header
   * tumbuh di dalamnya. Browser tanpa API ini menjawab null: kita tidak menebak.
   */
  function userActivated(env) {
    try {
      var ua = env && env.navigator && env.navigator.userActivation;
      if (ua && typeof ua.hasBeenActive === 'boolean') return ua.hasBeenActive;
    } catch (_) {}
    return null;
  }

  /**
   * Memasang pembuka audio sekali pakai pada sentuhan pertama di dokumen. Fase CAPTURE
   * dipakai supaya ia berjalan sebelum handler tombol aplikasi: dengan begitu SFX tombol
   * pertama pun punya peluang berbunyi, bukan hanya tombol kedua dan seterusnya.
   */
  function bindUnlock(env) {
    if (unlockBound) return;
    var doc = env && env.document;
    if (!doc || typeof doc.addEventListener !== 'function') return;
    unlockBound = true;
    var types = ['pointerdown', 'touchend', 'mousedown', 'keydown'];
    function unlock() {
      if (!ensureContext(env)) { detach(); return; }
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

  /** Menyiagakan motif dengan TENGGAT. Tanpa tenggat ini, ia jadi bunyi liar di menu. */
  function armMotif(env, windowMs) {
    pending = { notes: MOTIF, level: 0.52, opts: { sub: [N.F2, 0.210, 1.05] }, expiresAt: now() + windowMs };
    bindUnlock(env);
  }

  /**
   * Membunyikan motif yang disiagakan, kalau masih dalam tenggat DAN audio benar-benar
   * sudah berjalan. Di luar itu ia dibuang - tidak pernah ditunda lagi ke kesempatan
   * berikutnya, karena "kesempatan berikutnya" itulah bug yang diperbaiki di sini.
   */
  function firePending(env) {
    if (!pending) return false;
    if (now() > pending.expiresAt) { pending = null; return false; }
    if (!ensureContext(env)) { pending = null; return false; }
    if (!running()) { resumeContext(); return false; }
    var armed = pending;
    pending = null;
    try { schedule(armed.notes, armed.level, armed.opts); return true; }
    catch (_) { return false; }
  }

  /** Membuang motif yang disiagakan. Dipanggil splash saat menutup. */
  function cancelPending() { pending = null; return true; }

  /**
   * Membunyikan satu SFX transisi. Selalu aman dipanggil: nama asing, audio terblokir,
   * preferensi mati, atau kurangi-gerak semuanya berakhir sebagai `false`.
   */
  function play(name, env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var voice = VOICES[name];
    if (!voice) return false;
    // Kurangi-gerak adalah permintaan untuk lebih sedikit kejutan sensorik; bunyi transisi
    // termasuk di dalamnya.
    if (!ready(target, false)) return false;
    // OWNER: "sfx saat menekan tombol itu terlalu keras, turunkan 70%". Level lama 0.34
    // dikali 0.3 (turun 70%, sisa 30%) - motif pembuka splash TIDAK ikut turun, sebab
    // keluhannya khusus soal SFX tekan tombol yang terus-menerus terdengar tiap ketukan,
    // bukan sapaan satu kali di splash.
    if (running()) {
      try { schedule(voice, 0.102); return true; } catch (_) { return false; }
    }
    // Konteks belum berjalan: menjadwalkan di sini berarti menitipkan bunyi ke masa depan
    // yang tidak diketahui. Yang dilakukan hanyalah membuka audio, lalu membunyikan voice
    // ini HANYA kalau izinnya turun dalam hitungan milidetik - selebihnya bunyi ini hilang,
    // dan itu jawaban yang benar untuk sebuah SFX transisi.
    var deadline = now() + GESTURE_GRACE_MS;
    var resumed = resumeContext();
    if (resumed && typeof resumed.then === 'function') {
      resumed.then(function () {
        if (!running() || now() > deadline) return;
        try { schedule(voice, 0.102); } catch (_) {}
      }, function () {});
    }
    bindUnlock(target);
    return false;
  }

  /**
   * Motif merek penuh untuk splash. Berbunyi juga saat kurangi-gerak aktif: ini sapaan
   * sekali per peluncuran, bukan bunyi berulang, dan ia menggantikan animasi yang justru
   * dimatikan di modus itu.
   *
   * `options.windowMs` adalah umur splash yang memanggilnya. Di dalam jendela itu motif
   * boleh menunggu izin audio; di luarnya ia dibuang. Itulah pagar yang membuat motif
   * splash tidak bisa lagi muncul sebagai kejutan di layar menu.
   */
  function playMotif(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var windowMs = Number(opts.windowMs);
    if (!isFinite(windowMs) || windowMs < 0) windowMs = DEFAULT_MOTIF_WINDOW_MS;
    cancelPending();
    if (!enabled) return false;
    if (!preferencesAllow(target)) return false;
    // Dokumen yang belum pernah disentuh PASTI diblokir. Konteksnya tidak dibuat sama
    // sekali di sini - hanya disiagakan sampai sentuhan pertama, atau sampai tenggatnya
    // lewat, mana yang lebih dulu.
    if (userActivated(target) === false) { armMotif(target, windowMs); return false; }
    if (!ensureContext(target)) return false;
    if (running()) {
      try { schedule(MOTIF, 0.52, { sub: [N.F2, 0.210, 1.05] }); return true; }
      catch (_) { return false; }
    }
    armMotif(target, windowMs);
    var resumed = resumeContext();
    if (resumed && typeof resumed.then === 'function') resumed.then(function () { firePending(target); }, function () {});
    return false;
  }

  function setEnabled(v) { enabled = v !== false; return enabled; }

  return {
    NOTES: N,
    MOTIF: MOTIF,
    VOICES: VOICES,
    names: function () { return Object.keys(VOICES); },
    play: play,
    playMotif: playMotif,
    cancelPending: cancelPending,
    pendingMotif: function () { return pending ? { expiresAt: pending.expiresAt } : null; },
    contextState: function () { return ctx ? String(ctx.state) : 'none'; },
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    // Hanya untuk pengujian: mengembalikan modul ke keadaan sebelum konteks apa pun dibuat.
    __reset: function () { ctx = null; master = null; tailIn = null; noiseBuf = null; pending = null; unlockBound = false; enabled = true; }
  };
});
