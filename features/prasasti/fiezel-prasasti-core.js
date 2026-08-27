/*
 * FIEZEL Prasasti — lencana berbasis bukti (inti murni, tanpa DOM & tanpa jaringan).
 *
 * Spesifikasi: FIEZEL-GAME-INTERACTION-AUDIT.md §9 (baris "Prasasti") + §14. Filosofinya
 * mengikuti disiplin reward yang sudah dipegang app.js: lencana HANYA untuk hal yang
 * benar-benar DIKERJAKAN murid — tidak ada lencana login, tidak ada lencana beli,
 * tidak ada mata uang baru.
 *
 * MENGAPA MODUL SENDIRI (pola yang sama dengan features/speaking-listening/gems-core.js):
 *
 *   1. Pengakuan atas bukti belajar tidak boleh dihitung di dalam penangan klik.
 *      Semua fungsi di sini murni: masukan -> keluaran, tanpa localStorage, tanpa
 *      Date.now() tersembunyi. prasasti-test.js memanggilnya langsung, jadi kontrak
 *      "prasasti hanya terukir dari bukti" diverifikasi pada logika yang benar-benar
 *      dipakai aplikasi.
 *   2. Definisi lencana adalah data, bukan cabang if di layar. Menambah lencana baru
 *      berarti menambah SATU baris definisi + satu metrik bukti, bukan menyunting UI.
 *   3. Prasasti tidak pernah dicabut oleh modul ini. Bukti bisa menyusut (ledger gem
 *      dipangkas 60 entri, runtun putus) — tapi yang sudah dikerjakan tetap sudah
 *      dikerjakan. settle() hanya menambah, tidak pernah menghapus.
 *
 * BENTUK BUKTI (dihitung app.js dari state kanonik, dikirim ke sini sebagai angka):
 *   { lessonSessions, examsPassed, booksFinished, streakDays, masteredLessons,
 *     gemAwardSessions }
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelPrasasti = api;
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-prasasti-v1';

  // Definisi lencana, dikunci. Setiap baris menunjuk SATU metrik bukti dan SATU ambang —
  // tidak ada predikat bebas, supaya auditnya bisa membaca tabel ini sebagai kontrak.
  var BADGES = Object.freeze([
    Object.freeze({ id: 'lesson_pertama', title: 'Langkah Pertama', desc: 'Satu sesi lesson grammar penuh selesai — jalurmu resmi dimulai.', hint: 'Selesaikan 1 sesi lesson grammar', metric: 'lessonSessions', min: 1 }),
    Object.freeze({ id: 'ujian_lulus', title: 'Naik Tangga', desc: 'Lulus Ujian Skip Level — levelmu terverifikasi dari bukti, bukan klaim.', hint: 'Lulus 1 Ujian Skip Level', metric: 'examsPassed', min: 1 }),
    Object.freeze({ id: 'buku_tamat', title: 'Tamat Satu Buku', desc: 'Satu buku Perpustakaan dibaca sampai kalimat terakhir.', hint: 'Tamatkan 1 buku Perpustakaan', metric: 'booksFinished', min: 1 }),
    Object.freeze({ id: 'runtun_7', title: 'Seminggu Menyala', desc: 'Belajar bermakna 7 hari beruntun.', hint: 'Jaga runtun 7 hari', metric: 'streakDays', min: 7 }),
    Object.freeze({ id: 'runtun_30', title: 'Sebulan Menyala', desc: 'Belajar bermakna 30 hari beruntun.', hint: 'Jaga runtun 30 hari', metric: 'streakDays', min: 30 }),
    Object.freeze({ id: 'runtun_100', title: 'Seratus Hari', desc: 'Belajar bermakna 100 hari beruntun — kebiasaan yang sudah jadi milikmu.', hint: 'Jaga runtun 100 hari', metric: 'streakDays', min: 100 }),
    Object.freeze({ id: 'sepuluh_dikuasai', title: 'Sepuluh Dikuasai', desc: '10 lesson mencapai ambang dikuasai penuh.', hint: 'Kuasai 10 lesson sampai ambang mastery', metric: 'masteredLessons', min: 10 }),
    Object.freeze({ id: 'gem_lima_sesi', title: 'Kolektor Runtun', desc: '5 sesi berbeda menerbitkan Gem dari runtun 5 jawaban benar.', hint: 'Terbitkan Gem di 5 sesi berbeda', metric: 'gemAwardSessions', min: 5 })
  ]);

  /* ---- utilitas ---------------------------------------------------------- */

  function toCount(value) {
    var n = Math.floor(Number(value));
    return isFinite(n) && n > 0 ? n : 0;
  }

  function freshPrasasti() {
    return { schema: SCHEMA, earned: {} };
  }

  /**
   * Sanitasi saat muat. Schema asing => keadaan bersih. Entri yang tidak dikenal atau
   * timestamp busuk dibuang tanpa melempar — data belajar murid tidak boleh hilang
   * hanya karena satu angka rusak (disiplin yang sama dengan sanitizeGems).
   */
  function sanitizePrasasti(raw) {
    if (!raw || typeof raw !== 'object' || raw.schema !== SCHEMA) return freshPrasasti();
    var src = raw.earned && typeof raw.earned === 'object' ? raw.earned : {};
    var earned = {};
    for (var i = 0; i < BADGES.length; i++) {
      var at = Math.floor(Number(src[BADGES[i].id]));
      if (isFinite(at) && at > 0) earned[BADGES[i].id] = at;
    }
    return { schema: SCHEMA, earned: earned };
  }

  /* ---- aturan pengakuan --------------------------------------------------- */

  function badgeReached(badge, evidence) {
    var ev = evidence && typeof evidence === 'object' ? evidence : {};
    return toCount(ev[badge.metric]) >= badge.min;
  }

  /** Murni: daftar id lencana yang buktinya sudah cukup SAAT INI. */
  function evaluateBadges(evidence) {
    return BADGES.filter(function (b) { return badgeReached(b, evidence); })
      .map(function (b) { return b.id; });
  }

  /**
   * settle(prasasti, evidence, at) -> { prasasti, fresh }
   * Murni, tidak memutasi masukan. fresh berisi DEFINISI lencana yang baru terukir pada
   * panggilan ini (untuk momen perayaan). Lencana yang sudah terukir tidak pernah dicabut,
   * walau buktinya menyusut belakangan.
   */
  function settle(prasasti, evidence, at) {
    var base = sanitizePrasasti(prasasti);
    var when = Math.floor(Number(at));
    if (!isFinite(when) || when <= 0) when = 0;
    var earned = {}, fresh = [];
    for (var i = 0; i < BADGES.length; i++) {
      var badge = BADGES[i];
      if (base.earned[badge.id]) { earned[badge.id] = base.earned[badge.id]; continue; }
      if (badgeReached(badge, evidence)) { earned[badge.id] = when || 1; fresh.push(badge); }
    }
    return { prasasti: { schema: SCHEMA, earned: earned }, fresh: fresh };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    BADGES: BADGES,
    freshPrasasti: freshPrasasti,
    sanitizePrasasti: sanitizePrasasti,
    evaluateBadges: evaluateBadges,
    settle: settle
  });
}));
