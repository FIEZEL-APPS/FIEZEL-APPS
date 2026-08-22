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

  // Koreografi adalah SATU-SATUNYA sumber ritme; lihat features/brand/fiezel-choreography.js
  // untuk alasan lengkapnya. Dimuat lebih dulu di index.html. Fallback di bawah hanya untuk
  // lingkungan uji Node yang memuat modul ini sendirian - bukan jalur produksi.
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
   * Motif merek: akor F mayor add9 yang diurai naik, satu nada per ketukan visual.
   * Bentuknya [nada, mulai (detik), panjang (detik), peran] - dan ketiganya diturunkan dari
   * tabel koreografi, tidak ditulis ulang di sini. Panjang tiap nada sengaja MEMBESAR ke
   * atas: nada rendah dipukul pendek supaya tidak menutupi, nada tinggi dibiarkan
   * menggantung supaya ekornya masih hidup saat gerakan terakhir selesai.
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
      // Setiap nada harus MASIH berbunyi saat gerakan berakhir, ditambah ekor ruang.
      // Inilah yang menutup 950 milidetik senyap yang dilaporkan owner: bukan dengan
      // menambah nada, melainkan dengan membiarkan nada yang ada bertahan.
      var dur = Math.max(0.28, (endsAt - b.at) + 0.45);
      out.push([b.freq, b.at, dur, b.role]);
    }
    return out;
  }

  var MOTIF = Object.freeze(motifFromChoreography());

  // SFX transisi. Semuanya nada dari akor pembuka yang sama, jadi setiap ketukan di dalam
  // aplikasi terdengar sebagai kutipan dari sapaan pembukanya - bukan bunyi lain yang
  // kebetulan hidup di produk yang sama.
  var VOICES = Object.freeze({
    tap:       [[N.C5, 0.000, 0.15]],                          // kuint akor, nada paling netral
    toggle:    [[N.F4, 0.000, 0.17]],                          // tonika
    nav:       [[N.F4, 0.000, 0.20], [N.C5, 0.070, 0.28]],     // tonika -> kuint: gerak
    open:      [[N.A4, 0.000, 0.20], [N.G5, 0.070, 0.34]],     // terts -> add9: membuka
    close:     [[N.G5, 0.000, 0.18], [N.A4, 0.070, 0.28]],     // dibalik: menutup
    celebrate: [[N.F4, 0.000, 0.26], [N.A4, 0.080, 0.26],
                [N.C5, 0.160, 0.34], [N.G5, 0.250, 0.90]]      // akor penuh, diurai
  });

  // Susunan parsial satu bilah. Perbandingan inilah yang membuatnya berbunyi berkayu-
  // berlogam alih-alih seperti bip: [pengali frekuensi, kekerasan, pengali panjang].
  // 2.76x dan 5.40x sengaja TAKLARAS - itu perbandingan bilah logam yang dipukul, dan
  // itulah yang membedakan bunyi "mahal" dari osilator yang dinyalakan. Parsial atas
  // meluruh jauh lebih cepat daripada dasarnya, persis seperti benda nyata.
  var PARTIALS = [[1.00, 1.00, 1.00], [2.00, 0.30, 0.62],
                  [2.76, 0.15, 0.34], [3.00, 0.11, 0.44], [5.40, 0.05, 0.16]];
  var DETUNE = 1.0029;   // +5 sen, lapisan kehangatan
  var SPREAD = 0.34;     // lebar stereo lapisan laras-lepas
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

  /**
   * m025-92: KATEGORI sesi audio, bukan izin audio.
   *
   * iOS 16.4+ (termasuk iOS 26 yang dipakai OWNER) memberi halaman kendali atas kategori
   * sesi audionya lewat `navigator.audioSession`. Bawaan untuk Web Audio adalah **ambient**,
   * dan kategori itu membawa dua sifat yang salah untuk aplikasi ini: ia ikut dibungkam
   * saklar senyap fisik, dan ia mengalah kalau aplikasi lain sedang memutar audio.
   *
   * FIEZEL bukan audio latar. Suara neural adalah materi belajarnya, umpan balik jawaban
   * bagian dari penilaian, dan sapaan merek adalah identitasnya - semuanya "playback".
   *
   * Ini BUKAN perbaikan untuk keluhan "tidak ada bunyi" pada m025-90; OWNER sudah memastikan
   * saklar senyapnya MATI saat itu, dan akar keluhan itu memang suara yang tidak punya
   * pemanggil (#135). Yang diperbaiki di sini adalah kategori yang memang salah sejak awal,
   * dan yang menggigit pada keadaan yang belum pernah diuji: saklar senyap menyala, atau ada
   * audio aplikasi lain sedang berjalan.
   *
   * Diklaim SEKALI, sebelum konteks pertama dibuat, dan kegagalannya ditelan - peramban yang
   * belum punya API ini tidak boleh membuat seluruh SFX gagal.
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
      master.gain.value = 0.5;
      master.connect(ctx.destination);

      // Ekor ruang: satu simpul tunda dengan umpan balik teredam. Memberi kesan bilah
      // dipukul di dalam ruangan, bukan di ruang hampa - itu yang membuatnya terdengar
      // mahal, dan jauh lebih murah daripada menjadwalkan salinan nada berulang kali.
      tailIn = ctx.createGain();
      tailIn.gain.value = 0.42;
      var delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.112;
      var damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;
      var fb = ctx.createGain();
      fb.gain.value = 0.38;
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
  /** Menyalurkan satu suara ke master lewat panner, kalau browsernya punya. */
  function pan(node, amount) {
    try {
      if (!amount || typeof ctx.createStereoPanner !== 'function') { node.connect(master); return; }
      var p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, amount));
      node.connect(p); p.connect(master);
    } catch (_) { try { node.connect(master); } catch (__) {} }
  }

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

  /**
   * Napas pembuka: derau yang disaring sangat rendah, naik lalu hilang. Nyaris tidak
   * terdengar sebagai bunyi - ia terasa sebagai ruangan yang membuka sesaat sebelum nada
   * pertama. Tanpa ini nada pertama datang dari kesenyapan mutlak dan terdengar "dicolok".
   */
  function breath(at, dur, level) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(220, at);
    lp.frequency.exponentialRampToValueAtTime(900, at + dur * 0.7);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(level, at + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(at); src.stop(at + dur + 0.02);
  }

  /**
   * Kilau: satu parsial tinggi yang MELUNCUR naik selama sapuan emas di logo berjalan.
   * Gerakan dan bunyi menempuh arah yang sama pada rentang waktu yang sama - itulah yang
   * membuat sapuan itu terasa berbunyi, bukan sekadar ditemani bunyi.
   */
  function shimmer(freq, at, dur, level) {
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, at);
    osc.frequency.exponentialRampToValueAtTime(freq * 3, at + dur * 0.55);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(level, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    pan(g, 0.22);
    try { g.connect(tailIn); } catch (_) {}
    osc.start(at); osc.stop(at + dur + 0.05);
  }

  /** Satu bilah dipukul: lima parsial, dua lapisan laras yang dilebarkan ke kiri-kanan. */
  function mallet(freq, at, dur, level, spread) {
    var width = typeof spread === 'number' ? spread : 0;
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
        // Dua lapisan laras dilempar ke sisi berlawanan. Lebar stereo inilah yang paling
        // murah membuat bunyi terdengar mahal - dan pada mono ia runtuh jadi bunyi yang
        // sama, jadi tidak ada yang hilang di pengeras suara ponsel.
        pan(g, k ? width : -width);
        if (p === 0 && k === 0) g.connect(tailIn);   // hanya dasar yang masuk ekor ruang
        osc.start(at);
        osc.stop(at + d + 0.05);
      }
    }
  }

  /**
   * Menjadwalkan sederet nada. `notes` boleh membawa peran di indeks ke-4; peran itulah
   * yang memutuskan sebuah ketukan dibunyikan sebagai pukulan, sebagai bobot rendah, atau
   * sebagai kilau yang meluncur. Tanpa peran, semuanya dipukul biasa - itu jalur SFX
   * transisi, yang memang harus seragam dan pendek.
   */
  function schedule(notes, level, opts) {
    var t0 = ctx.currentTime + 0.005;
    var wide = !!(opts && opts.wide);
    for (var i = 0; i < notes.length; i++) {
      var freq = notes[i][0], at = t0 + notes[i][1], dur = notes[i][2], role = notes[i][3];
      var width = wide ? SPREAD * (0.35 + 0.65 * (i / Math.max(1, notes.length - 1))) : 0;
      if (role === 'sub') {
        // Jangkar rendah: dipukul pelan, tanpa parsial atas, ditemani napas.
        mallet(freq, at, dur, level * 0.78, 0);
        breath(at, Math.min(dur, 0.55), level * 0.10);
        continue;
      }
      if (role === 'shimmer') {
        mallet(freq, at, dur, level * 0.72, width);
        shimmer(freq, at, Math.min(dur, 0.9), level * 0.13);
        strike(at, level * 0.18);
        continue;
      }
      mallet(freq, at, dur, level * (role === 'add9' ? 0.62 : 1), width);
      // Nada add9 sengaja paling pelan. Ia nada warna, bukan nada pengumuman; kalau
      // dibunyikan sekeras yang lain, akornya berubah dari "mewah" jadi "ramai".
      strike(at, level * (role === 'add9' ? 0.16 : 0.30));
    }
  }

  /**
   * m025-88 OWNER (iPhone 12, iOS 26, PWA terpasang): "tidak ada suara sfx yang terdengar",
   * dengan saklar senyap fisik dalam keadaan MATI.
   *
   * Sebabnya baris yang baru saja dihapus dari sini: `if (!ignoreMotion && reducedMotion(env))
   * return false`. Setiap SFX transisi dibisukan ketika perangkat meminta KURANGI GERAK.
   *
   * Itu salah kaprah. `prefers-reduced-motion` adalah permintaan tentang GERAKAN - vestibular,
   * bukan pendengaran. Ia tidak pernah berarti "matikan suara"; platform punya jalur sendiri
   * untuk itu (saklar senyap, volume, dan di aplikasi ini sakelar "Suara jawaban"). Menyamakan
   * keduanya membuat murid yang menyalakan Kurangi Gerak - hal yang lumrah di iOS, dan sering
   * ikut menyala sendiri di Mode Daya Rendah - kehilangan seluruh umpan balik bunyi tanpa
   * pernah memintanya, dan tanpa ada tempat untuk mengembalikannya.
   *
   * Sekarang bunyi hanya tunduk pada dua hal yang memang berhak memutuskannya: sakelar
   * preferensi murid, dan izin audio dari browser.
   */
  function ready(env, ignoreMotion) {
    if (!enabled) return false;
    if (!preferencesAllow(env)) return false;
    return ensureContext(env);
  }

  /**
   * Keadaan nyata modul ini di perangkat, untuk dibaca lewat panel Diagnostics.
   *
   * Ini ada karena satu putaran penuh terbuang untuk menebak kenapa perangkat OWNER bisu:
   * saklar senyap iOS tidak bisa dideteksi dari web, dan tanpa pembacaan di perangkat
   * satu-satunya cara maju adalah menanyai pemiliknya satu per satu. Yang bisa dilihat,
   * sekarang bisa dilihat.
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
      // m025-92: kategori sesi BISA dibaca, tidak seperti saklar senyap. Kalau di perangkat
      // ia terbaca 'ambient' padahal sudah diklaim, artinya peramban menolak klaimnya - dan
      // itu keterangan yang jauh lebih berguna daripada menebak lagi.
      sesiAudio: (function () {
        try {
          var s = target.navigator && target.navigator.audioSession;
          return s && typeof s.type === 'string' ? s.type : 'tidak didukung peramban ini';
        } catch (_) { return 'tidak terbaca'; }
      })()
    };
    return out;
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
    pending = { notes: MOTIF, level: 0.52, opts: { wide: true }, expiresAt: now() + windowMs };
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
      try { schedule(MOTIF, 0.52, { wide: true }); return true; }
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
    diagnostics: diagnostics,
    pendingMotif: function () { return pending ? { expiresAt: pending.expiresAt } : null; },
    contextState: function () { return ctx ? String(ctx.state) : 'none'; },
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; },
    // Hanya untuk pengujian: mengembalikan modul ke keadaan sebelum konteks apa pun dibuat.
    __reset: function () { ctx = null; master = null; tailIn = null; noiseBuf = null; pending = null; unlockBound = false; enabled = true; audioSessionClaimed = false; }
  };
});
