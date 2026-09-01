/**
 * FIEZEL Attempt Record — proyeksi satu percobaan menjadi BUKTI yang boleh disinkronkan.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Rancangan sinkron antar-perangkat bersandar pada satu gagasan: jangan menggabungkan model
 * otak (BKT/FSRS/ledger tidak punya operasi gabungan yang bermakna), melainkan gabungkan
 * ALIRAN PERCOBAAN lalu putar ulang modul murninya. Kesetaraan putar-ulang itu sudah
 * dibuktikan gerbang brain-replay-equivalence-test.js.
 *
 * Tetapi "kirim aliran percobaan" apa adanya MELANGGAR kontrak yang sudah ditegakkan
 * observability-privacy-test.js: tidak boleh ada riwayat jawaban mentah yang bisa keluar dari
 * perangkat. Baris riwayat membawa kalimat soal, jawaban yang dipilih murid, dan jawaban yang
 * benar — tiga hal yang tidak satu pun dibutuhkan untuk memutar ulang model.
 *
 * Modul ini jembatannya, dan bentuknya sengaja meniru disiplin fiezel-metrics-digest.js:
 * keluaran adalah ALLOWLIST tertutup. Field yang tidak terdaftar tidak "dibuang" belakangan —
 * ia tidak pernah punya jalan masuk. Menutup kebocoran secara struktural lebih kuat daripada
 * menyaringnya, karena penyaring harus diingat setiap kali seseorang menambah field baru.
 *
 * APA YANG BOLEH IKUT, DAN KENAPA
 * -------------------------------
 * Hanya yang benar-benar dibaca modul otak saat putar-ulang: identitas percobaan, waktu,
 * pengenal konten (lesson/skill/item — ini id konten kanonik, bukan data pribadi, dan kelasnya
 * sama dengan targetSkill yang sudah lama dikirim policy outcome), hasil benar/salah, bobot
 * kredibilitas, prediksi saat penyajian, kesulitan, dan label miskonsepsi dari kosakata
 * TERTUTUP taksonomi. Tidak ada teks bebas sama sekali.
 *
 * APA YANG TIDAK PERNAH IKUT
 * --------------------------
 * Kalimat soal, jawaban yang dipilih, jawaban benar, transkrip, audio, nama, endpoint, dan
 * setiap field yang tidak dikenal — termasuk yang disisipkan pemanggil dengan nama yang
 * kelihatan tidak berbahaya.
 *
 * Modul MURNI: tanpa DOM, jaringan, penyimpanan, sumber acak, atau jam internal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAttemptRecord = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-attempt-record-v1';

  /* Enum tertutup. String dari INPUT tidak pernah disalin ke output kecuali cocok persis. */
  var TYPES = ['vocab', 'grammar', 'reading', 'listening', 'speaking'];
  var TIMINGS = ['guess', 'normal', 'struggled'];

  /* Batas panjang untuk pengenal konten. Pengenal yang lebih panjang dari ini bukan pengenal —
     ia teks yang menyamar, dan satu-satunya jawaban yang aman adalah menolak barisnya. */
  var ID_MAX = 80;
  /* Pola pengenal konten: huruf, angka, dan pemisah. Spasi TIDAK diizinkan — kalimat soal
     selalu mengandung spasi, jadi larangan ini menutup seluruh kelas kebocoran sekaligus. */
  var ID_RE = /^[A-Za-z0-9._:@#-]{1,80}$/;

  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null; }
  function clamp01(v) { var n = num(v); return n === null ? null : (n < 0 ? 0 : n > 1 ? 1 : Math.round(n * 1000) / 1000); }

  /** Pengenal konten yang sah, atau null. Tidak pernah memotong: memotong teks bebas
   *  menghasilkan pengenal palsu yang lolos gerbang dan mengacaukan putar-ulang. */
  function contentId(v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    if (!s || s.length > ID_MAX || !ID_RE.test(s)) return null;
    return s;
  }
  function enumOf(list, v) {
    if (typeof v !== 'string') return null;
    var s = v.trim();
    for (var i = 0; i < list.length; i++) if (list[i] === s) return s;
    return null;
  }

  /**
   * project(row) -> catatan bukti terbatas, atau null bila barisnya tidak layak.
   *
   * Menolak (null) lebih baik daripada meloloskan sebagian: catatan tanpa identitas percobaan
   * tidak bisa di-dedup, dan catatan tanpa waktu tidak bisa diurutkan — dua-duanya membuat
   * putar-ulang tidak deterministik, yang justru satu-satunya sifat yang kita andalkan.
   */
  function project(row) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
    var attemptId = contentId(row.attemptId);
    var at = num(row.at);
    if (!attemptId || at === null || at <= 0) return null;
    if (typeof row.ok !== 'boolean') return null;

    var out = {
      schema: SCHEMA,
      attemptId: attemptId,
      at: Math.floor(at),
      ok: row.ok
    };
    var type = enumOf(TYPES, row.type); if (type) out.type = type;
    var skill = contentId(row.skill); if (skill) out.skill = skill;
    var lesson = contentId(row.reviewKey); if (lesson) out.lesson = lesson;
    var item = contentId(row.target) || contentId(row.id); if (item) out.item = item;
    var kappa = clamp01(row.kappa); if (kappa !== null) out.kappa = kappa;
    var predicted = clamp01(row.predicted); if (predicted !== null) out.predicted = predicted;
    var difficulty = num(row.difficulty); if (difficulty !== null) out.difficulty = Math.round(difficulty * 100) / 100;
    var timing = enumOf(TIMINGS, row.timing); if (timing) out.timing = timing;
    var concept = contentId(row.concept); if (concept) out.concept = concept;
    var misconception = contentId(row.misconception); if (misconception) out.misconception = misconception;
    var session = contentId(row.sessionId); if (session) out.sessionId = session;
    return out;
  }

  /** Field yang boleh ada di catatan. Dipakai validate() DAN gerbang privasi. */
  var ALLOWED = ['schema', 'attemptId', 'at', 'ok', 'type', 'skill', 'lesson', 'item',
    'kappa', 'predicted', 'difficulty', 'timing', 'concept', 'misconception', 'sessionId'];

  /**
   * validate(record) -> true bila catatan layak dikirim.
   * MENOLAK field asing, bukan membuangnya: catatan ini kandidat unggahan, dan satu field liar
   * yang lolos berarti kebocoran. Menolak membuat kesalahan terlihat; membuang menyembunyikannya.
   */
  function validate(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    if (record.schema !== SCHEMA) return false;
    var keys = Object.keys(record);
    for (var i = 0; i < keys.length; i++) if (ALLOWED.indexOf(keys[i]) < 0) return false;
    return !!contentId(record.attemptId) && num(record.at) !== null && typeof record.ok === 'boolean';
  }

  /** Proyeksikan banyak baris; baris tak layak dilewat, bukan menggagalkan seluruh batch. */
  function projectAll(rows) {
    var out = [];
    if (!Array.isArray(rows)) return out;
    for (var i = 0; i < rows.length; i++) {
      var rec = project(rows[i]);
      if (rec && validate(rec)) out.push(rec);
    }
    return out;
  }

  return {
    SCHEMA: SCHEMA,
    ALLOWED: ALLOWED,
    TYPES: TYPES,
    project: project,
    projectAll: projectAll,
    validate: validate
  };
});
