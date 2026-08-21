/**
 * FIEZEL — SFX transisi antarmuka.
 *
 * m025-80 OWNER: "short UI transition SFX yang sangat elegan dan harus authentic fiezel".
 *
 * "Authentic FIEZEL" di sini bukan selera, melainkan aturan yang bisa diperiksa: setiap
 * bunyi di modul ini dibangun dari DNA yang sama dengan nada pembuka merek di
 * fiezel-splash.js, sehingga seluruh aplikasi terdengar seperti satu alat, bukan kumpulan
 * bip yang kebetulan berkumpul.
 *
 * Tiga aturan DNA itu:
 *
 * 1. SATU TIMBRE. Semua memakai "bel" yang sama: satu sinus dasar plus satu harmonik oktaf
 *    yang jauh lebih pelan dan meluruh lebih cepat. Itulah yang membedakan bunyi bel dari
 *    bip sinus polos, dan itu pula yang dipakai nada pembuka.
 * 2. SATU TANGGA NADA. F mayor — F, A, C — dengan F sebagai pusat, karena F adalah huruf
 *    mereknya sendiri. Tidak ada nada di luar tangga ini, jadi dua bunyi yang kebetulan
 *    bertumpuk tidak akan pernah sumbang.
 * 3. PENDEK DAN LEMBUT. Transisi antarmuka terjadi puluhan kali per sesi; bunyi yang
 *    panjang atau keras berubah dari elegan menjadi mengganggu pada kali kesepuluh. Semua
 *    di bawah 220ms, serangannya diayun (bukan dipatuk) supaya tidak terdengar mengklik.
 *
 * Dua batas yang dijaga:
 * - Preferensi murid dihormati. `feedbackSounds: false` mematikan seluruh modul ini.
 * - Browser memblokir audio sebelum ada sentuhan pengguna. Konteks karena itu dibuat malas
 *   pada bunyi pertama dan kegagalan ditelan diam-diam - antarmuka tidak pernah rusak
 *   hanya karena suaranya tidak boleh berbunyi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelUiSfx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Tangga nada F mayor. Nama dipakai di definisi bunyi supaya niatnya terbaca sebagai
  // musik, bukan sebagai angka ajaib.
  var N = Object.freeze({
    F3: 174.61, A3: 220.00, C4: 261.63,
    F4: 349.23, A4: 440.00, C5: 523.25,
    F5: 698.46, A5: 880.00
  });

  /**
   * Resep bunyi. Setiap entri: daftar [nada, jeda detik, panjang detik, kekerasan].
   * Semuanya selesai di bawah 220ms kecuali `celebrate`, yang memang ditandai sebagai
   * momen, bukan transisi.
   */
  var VOICES = Object.freeze({
    // Sentuhan ringan — satu ketuk bel tinggi yang nyaris tidak terasa.
    tap:       [[N.C5, 0.000, 0.075, 0.16]],
    // Pindah halaman — kuint naik, gema kecil dari nada pembuka merek.
    nav:       [[N.F4, 0.000, 0.110, 0.20], [N.C5, 0.050, 0.130, 0.17]],
    // Panel/lembar terbuka — naik, terbuka.
    open:      [[N.A4, 0.000, 0.110, 0.19], [N.F5, 0.055, 0.150, 0.16]],
    // Panel/lembar tertutup — kebalikannya, turun dan mereda.
    close:     [[N.F5, 0.000, 0.100, 0.16], [N.A4, 0.055, 0.140, 0.14]],
    // Sakelar — satu nada tengah, netral.
    toggle:    [[N.A4, 0.000, 0.090, 0.17]],
    // Momen kecil (target harian tercapai, langkah selesai) — trinada F mayor naik.
    celebrate: [[N.F4, 0.000, 0.150, 0.20], [N.A4, 0.070, 0.170, 0.18], [N.C5, 0.140, 0.240, 0.16]]
  });

  var ctx = null;
  var bus = null;
  var enabled = true;

  function preferencesAllow(env) {
    try {
      var state = env && typeof env.__getFiezelState === 'function' ? env.__getFiezelState() : null;
      var prefs = state && state.preferences;
      // Bunyi transisi ikut sakelar "Suara jawaban" yang sudah ada, bukan sakelar baru:
      // menambah satu sakelar lagi untuk hal sejenis hanya memperumit Pengaturan.
      return !prefs || prefs.feedbackSounds !== false;
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
      bus = ctx.createGain();
      // Kepala volume dijaga rendah: ini lapisan latar, bukan bunyi utama.
      bus.gain.value = 0.5;
      bus.connect(ctx.destination);
      return true;
    } catch (_) { return false; }
  }

  /**
   * Satu ketuk bel: sinus dasar + harmonik oktaf yang lebih pelan dan lebih cepat hilang.
   * Serangannya diayun 8ms, bukan seketika - itu yang membuat bunyinya terdengar diayun,
   * bukan diklik.
   */
  function bell(freq, at, dur, level) {
    [[freq, level, dur], [freq * 2, level * 0.26, dur * 0.5]].forEach(function (p) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p[0], at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(Math.max(p[1], 0.0002), at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + p[2]);
      osc.connect(gain);
      gain.connect(bus);
      osc.start(at);
      osc.stop(at + p[2] + 0.02);
    });
  }

  /**
   * Membunyikan satu SFX. Selalu aman dipanggil: nama asing, audio terblokir, preferensi
   * mati, atau kurangi-gerak semuanya berakhir sebagai `false`, bukan sebagai kesalahan.
   */
  function play(name, env) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    if (!enabled) return false;
    var voice = VOICES[name];
    if (!voice) return false;
    // Kurangi-gerak adalah permintaan untuk lebih sedikit kejutan sensorik; bunyi transisi
    // termasuk di dalamnya. Umpan balik jawaban di app.js tetap berjalan - itu informasi,
    // bukan hiasan.
    if (reducedMotion(target)) return false;
    if (!preferencesAllow(target)) return false;
    if (!ensureContext(target)) return false;
    try {
      var t0 = ctx.currentTime + 0.005;
      for (var i = 0; i < voice.length; i++) {
        bell(voice[i][0], t0 + voice[i][1], voice[i][2], voice[i][3]);
      }
      return true;
    } catch (_) { return false; }
  }

  function setEnabled(value) { enabled = value !== false; return enabled; }

  return {
    NOTES: N,
    VOICES: VOICES,
    names: function () { return Object.keys(VOICES); },
    play: play,
    setEnabled: setEnabled,
    isEnabled: function () { return enabled; }
  };
});
