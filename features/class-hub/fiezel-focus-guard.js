/**
 * FIEZEL — fiezel-focus-guard.js · PENDETEKSI KELUAR LAYAR SAAT UJIAN.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Ujian mini dari guru (assignment mode 'ujian') dikerjakan di perangkat murid sendiri,
 * tanpa pengawas. Satu ketukan tombol Home — atau berpindah tab — sudah cukup untuk
 * membuka mesin pencari, lalu kembali seolah tidak terjadi apa-apa. Yang bisa dilihat
 * guru selama ini hanya hasil akhir, jadi celah itu tidak meninggalkan jejak apa pun.
 *
 * Modul ini menutup celahnya dengan cara yang paling jujur yang tersedia di web: setiap
 * kali halaman ujian kehilangan layar (visibilitychange -> hidden, pagehide, atau blur
 * jendela), satu "episode keluar" dibuka; saat murid kembali, episode ditutup dan
 * lamanya dihitung. Ringkasannya dikirim ke guru lewat jalur laporan kelas yang SUDAH
 * ADA (assign.f pada class-report), jadi guru melihatnya nyaris seketika — bukan
 * setelah ujian selesai.
 *
 * KENAPA ADA MASA TENGGANG (GRACE_MS)
 * -----------------------------------
 * Browser mengirim blur/hidden untuk hal-hal yang bukan kecurangan: laci notifikasi
 * tersenggol, dialog izin mikrofon, rotasi layar, keyboard virtual pada sebagian
 * peranti Android. Episode yang lebih pendek dari GRACE_MS DIBUANG. Konsekuensinya
 * disengaja: modul ini lebih memilih melewatkan kepergian 1 detik daripada menuduh
 * murid yang tidak ke mana-mana. Menuduh secara keliru merusak kepercayaan kelas jauh
 * lebih dalam daripada satu episode yang lolos.
 *
 * MODUL MURNI: tanpa DOM, tanpa jaringan, tanpa penyimpanan, TANPA JAM INTERNAL. Semua
 * waktu masuk sebagai argumen supaya gerbang Node bisa menguji setiap batas tanpa
 * menunggu waktu nyata, dan supaya state-nya bisa diserialisasi apa adanya ke
 * localStorage (ujian yang dimuat ulang di tengah jalan tidak kehilangan hitungannya).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelFocusGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-focus-guard-v1';
  // Di bawah ini = gangguan sistem, bukan kepergian. Lihat catatan kepala berkas.
  var GRACE_MS = 1500;
  // Bukti per-episode yang disimpan lokal (guru hanya menerima agregatnya).
  var EPISODES_MAX = 20;
  // Sebuah episode tunggal tidak mungkin lebih lama dari satu sesi ujian yang wajar.
  // Jam perangkat yang meloncat (zona waktu, sinkron NTP) tidak boleh melahirkan
  // angka mustahil di layar guru, jadi dipotong di sini.
  var EPISODE_MS_MAX = 6 * 3600000;
  var REASONS = ['hidden', 'pagehide', 'blur', 'unknown'];

  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function reasonOf(v) { return REASONS.indexOf(String(v)) > -1 ? String(v) : 'unknown'; }
  function clampSpan(ms) { return Math.max(0, Math.min(EPISODE_MS_MAX, Math.round(num(ms)))); }

  /** State awal untuk satu sesi ujian. `aid` = id tugas, dipakai saat melapor. */
  function start(aid, at) {
    return { schema: SCHEMA, aid: String(aid || ''), startedAt: Math.round(num(at)), awaySince: 0, awayReason: '', n: 0, ms: 0, longestMs: 0, episodes: [] };
  }

  /** Terima state dari localStorage. Bentuk yang tidak dikenal -> null (pemanggil mulai baru). */
  function restore(raw) {
    if (!raw || raw.schema !== SCHEMA) return null;
    return {
      schema: SCHEMA, aid: String(raw.aid || ''), startedAt: Math.round(num(raw.startedAt)),
      awaySince: Math.round(num(raw.awaySince)), awayReason: raw.awaySince ? reasonOf(raw.awayReason) : '',
      n: Math.max(0, Math.round(num(raw.n))), ms: clampSpan(raw.ms), longestMs: clampSpan(raw.longestMs),
      episodes: (Array.isArray(raw.episodes) ? raw.episodes : []).slice(-EPISODES_MAX)
        .map(function (e) { return { at: Math.round(num(e && e.at)), ms: clampSpan(e && e.ms), r: reasonOf(e && e.r) }; })
    };
  }

  /**
   * Layar hilang. Idempoten: blur DAN visibilitychange sering datang berpasangan untuk
   * satu kepergian yang sama, dan menghitungnya dua kali akan melipatgandakan angka di
   * layar guru — kepergian kedua diabaikan selama episode pertama belum ditutup.
   */
  function leave(state, at, reason) {
    if (!state || state.awaySince) return state;
    state.awaySince = Math.round(num(at));
    state.awayReason = reasonOf(reason);
    return state;
  }

  /**
   * Layar kembali. Mengembalikan episode yang baru ditutup ({at, ms, r}) bila lolos masa
   * tenggang, atau null bila tidak ada episode terbuka / episode dibuang sebagai gangguan.
   */
  function back(state, at) {
    if (!state || !state.awaySince) return null;
    var span = clampSpan(Math.round(num(at)) - state.awaySince);
    var episode = { at: state.awaySince, ms: span, r: state.awayReason || 'unknown' };
    state.awaySince = 0; state.awayReason = '';
    if (span < GRACE_MS) return null;
    state.n += 1;
    state.ms = clampSpan(state.ms + span);
    if (span > state.longestMs) state.longestMs = span;
    state.episodes = state.episodes.concat([episode]).slice(-EPISODES_MAX);
    return episode;
  }

  /**
   * Ringkasan saat ini. `at` dipakai untuk menghitung episode yang MASIH berjalan supaya
   * guru melihat "sedang di luar layar 40 detik", bukan menunggu murid kembali dulu —
   * itulah bagian realtime-nya.
   */
  function summary(state, at) {
    if (!state) return { n: 0, ms: 0, longestMs: 0, away: false, awayMs: 0 };
    var live = state.awaySince ? clampSpan(Math.round(num(at)) - state.awaySince) : 0;
    var counted = live >= GRACE_MS;
    return {
      n: state.n + (counted ? 1 : 0),
      ms: clampSpan(state.ms + (counted ? live : 0)),
      longestMs: counted && live > state.longestMs ? live : state.longestMs,
      away: !!state.awaySince,
      awayMs: live
    };
  }

  /**
   * Bentuk yang dikirim ke guru (assign.f pada class-report): TIGA BILANGAN dan tidak
   * lebih — berapa kali (n), total detik di luar (s), dan kepergian terlama (x). Tanpa
   * jam presisi, tanpa nama aplikasi, tanpa teks bebas: guru perlu tahu ada celah yang
   * terbuka, bukan mengintip isi ponsel murid. Detik, bukan milidetik, karena presisi
   * milidetik hanya menambah kesan pengawasan tanpa menambah keputusan yang bisa diambil.
   */
  function payload(state, at) {
    var s = summary(state, at);
    return { n: s.n, s: Math.round(s.ms / 1000), x: Math.round(s.longestMs / 1000) };
  }

  /**
   * Tingkat keseriusan — dipakai untuk memilih warna/kalimat, BUKAN untuk memvonis.
   * 'bersih' tidak pernah keluar layar; 'ringan' satu kepergian singkat (jeda wajar:
   * dipanggil orang rumah, notifikasi ditutup); 'berat' berulang atau lama, yaitu pola
   * yang cukup untuk membuka sumber lain. Keputusannya tetap milik guru.
   */
  function severity(sum) {
    var n = Math.max(0, Math.round(num(sum && sum.n))), ms = clampSpan(sum && sum.ms);
    if (!n) return 'bersih';
    if (n >= 3 || ms >= 30000) return 'berat';
    return 'ringan';
  }

  return {
    SCHEMA: SCHEMA, GRACE_MS: GRACE_MS, EPISODES_MAX: EPISODES_MAX, EPISODE_MS_MAX: EPISODE_MS_MAX, REASONS: REASONS,
    start: start, restore: restore, leave: leave, back: back, summary: summary, payload: payload, severity: severity
  };
});
