/**
 * FIEZEL Item Prior — prior kesulitan item berbasis mode latihan (Braincore v3, A6).
 *
 * MASALAH YANG DIPERBAIKI (council model-council-claude_opus_5_0.md T1/T2/C1)
 * --------------------------------------------------------------------------
 * Sebelum modul ini, SEMUA item pada satu level CEFR punya difficulty yang sama persis:
 * `LEVELS.indexOf(level)+1`. Akibatnya dua hal fatal terjadi sekaligus:
 *
 *   T1. IRT/kalibrasi kemampuan berdegenerasi menjadi penghitung akurasi biasa — kalau
 *       semua b_i identik, informasi Fisher hanya sebanding dengan JUMLAH soal, bukan
 *       KECOCOKAN soal, sehingga "estimasi kemampuan" tidak pernah lebih pintar dari
 *       persentase benar.
 *   T2. `targetDifficulty` menjadi no-op di seleksi soal: term penalti
 *       `|difficulty - target|` bernilai konstan untuk semua kandidat, lalu lenyap saat
 *       sorting. Sistem MENGAKU adaptif terhadap kesulitan, tetapi secara matematis
 *       tidak pernah memilih berdasarkan kesulitan.
 *
 * Padahal sumber variasi kesulitan yang paling nyata SUDAH ada di data soal: MODE
 * latihannya. Menjodohkan aturan dengan pilihan (recognition) jelas lebih ringan daripada
 * menerapkan bentuk kata ke kalimat baru (produksi terarah), dan keduanya lebih ringan
 * daripada MENJELASKAN KENAPA jawaban benar/salah (metabahasa) — urutan beban ini sejalan
 * dengan hierarki recognize < recall < apply < analyze/explain pada beban kognitif.
 * Modul ini mengubah pengetahuan itu menjadi PRIOR numerik: belum kalibrasi Elo dua-sisi
 * penuh (itu langkah C1 berikutnya), tetapi cukup untuk membuat difficulty BERVARIASI di
 * dalam satu level sehingga T1/T2 tidak lagi degenerate sejak hari pertama, dan Elo item
 * nantinya punya titik awal yang masuk akal, bukan titik awal seragam.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random, tanpa waktu.
 * Masukan -> angka, selalu deterministik, sehingga bisa diuji sebagai angka.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelItemPrior = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Urutan CEFR yang sama dengan app.js — basis kesulitan = indeks + 1 (A1=1 .. C2=6).
  var LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

  // Rentang keluaran. Bawah 0.5 (bukan 0) supaya item termudah pun tetap "berharga"
  // di rumus lain yang membagi/mengalikan difficulty; atas 6.9 supaya C2 + mode terberat
  // tetap terwakili tanpa meledak keluar skala 1..6 yang dipakai band level.
  var CLAMP_MIN = 0.5;
  var CLAMP_MAX = 6.9;

  // Stem yang panjang menambah beban BACA sebelum beban grammar dimulai — murid harus
  // menahan lebih banyak konteks di memori kerja. +0.15 kecil dan datar dengan sengaja:
  // ini beban leksikal, bukan beban konsep, jadi tidak boleh menyaingi modeCost.
  var STEM_LENGTH_THRESHOLD = 120;
  var STEM_LENGTH_COST = 0.15;

  /**
   * Biaya kognitif per mode latihan grammar (25 mode dari GRAMMAR_PRACTICE_MODES di
   * app.js), rentang -0.9..+0.9 relatif terhadap basis level.
   *
   * Prinsip penataan (kenapa urutannya begini, bukan sekadar angka):
   *   1. RECOGNITION murni paling ringan: jawabannya sudah tersaji, murid hanya
   *      mencocokkan — retrieval cue penuh, produksi nol.
   *   2. KOMPARASI/KLASIFIKASI di tengah-bawah: butuh membandingkan dua bentuk, tetapi
   *      keduanya masih tersaji di layar.
   *   3. PRODUKSI TERARAH sedang-positif: murid harus MEMBANGKITKAN/menerapkan bentuk
   *      ke konteks, bukan sekadar mengenali — generation effect membuatnya lebih berat.
   *   4. METABAHASA paling berat: menjelaskan KENAPA, mengurutkan penalaran, atau
   *      mengajar balik menuntut model mental eksplisit tentang aturannya, bukan sekadar
   *      intuisi "kedengarannya benar".
   * Varian bernomor (_1/_2/_3) naik tipis: distraktor ke-2/ke-3 biasanya distraktor yang
   * lebih halus (yang paling jelas sudah dipakai varian pertama).
   */
  var MODE_COST = Object.freeze({
    // --- Recognition dasar / identifikasi ringan (negatif) ---
    recognize_rule: -0.9,      // mencocokkan aturan yang tersaji — cue penuh, tanpa produksi; termudah.
    recognize_objective: -0.85, // mengenali tujuan/maksud soal — masih pencocokan, sedikit interpretasi.
    recall_memory_cue: -0.75,  // memanggil ulang lewat petunjuk memori — retrieval berbantuan cue, ringan.
    choose_avoidance: -0.6,    // memilih bentuk yang HARUS dihindari — eliminasi sederhana atas opsi tersaji.
    locate_decision_cue: -0.45, // menunjuk petunjuk penentu di kalimat — identifikasi, tapi harus memindai konteks.

    // --- Komparasi / klasifikasi (sekitar netral) ---
    contrast_distractor_1: -0.3,  // membandingkan jawaban benar vs distraktor pertama (paling kontras) — dua bentuk tersaji.
    contrast_distractor_2: -0.25, // distraktor kedua lebih halus perbedaannya — sedikit lebih berat.
    contrast_distractor_3: -0.2,  // distraktor ketiga paling halus — komparasi paling teliti di kelompok ini.
    classify_family: -0.1,        // menggolongkan soal ke keluarga grammar — kategorisasi, butuh peta konsep kasar.

    // --- Produksi terarah / diagnosis (sedang-positif) ---
    complete_sentence: 0.35,     // melengkapi kalimat — produksi berbantuan konteks; generation effect mulai bekerja.
    diagnose_distractor_1: 0.4,  // mendiagnosis KENAPA distraktor pertama salah — analisis kesalahan, bukan sekadar menolak.
    apply_form: 0.45,            // menerapkan bentuk ke konteks baru — transfer aturan, inti produksi terarah.
    diagnose_distractor_2: 0.45, // diagnosis distraktor kedua — kesalahan yang lebih halus.
    diagnose_distractor_3: 0.5,  // diagnosis distraktor ketiga — kesalahan paling halus di set-nya.
    mastery_check: 0.55,         // pemeriksaan penguasaan gabungan — menuntut semua sub-keterampilan sekaligus.
    repair_distractor_1: 0.55,   // MEMPERBAIKI kalimat salah — diagnosis + produksi ulang, lebih berat dari diagnosis saja.
    repair_distractor_2: 0.6,    // perbaikan kesalahan yang lebih halus.
    repair_distractor_3: 0.65,   // perbaikan kesalahan paling halus — puncak kelompok produksi.

    // --- Metabahasa (paling positif) ---
    label_misconception_1: 0.7,  // memberi NAMA pada miskonsepsi — butuh kosakata metabahasa, bukan cuma intuisi.
    label_misconception_2: 0.75, // miskonsepsi kedua lebih jarang/halus.
    identify_misconception: 0.8, // mengenali miskonsepsi di balik jawaban salah — teori tentang PIKIRAN yang keliru.
    label_misconception_3: 0.8,  // miskonsepsi ketiga paling halus di set-nya.
    justify_correct: 0.85,       // membenarkan jawaban dengan alasan eksplisit — aturan harus bisa DIKATAKAN, bukan dirasakan.
    sequence_reasoning: 0.85,    // mengurutkan langkah penalaran — struktur argumen utuh, memori kerja tinggi.
    teach_back: 0.9              // mengajar balik — bentuk pemahaman terdalam: menyusun ulang aturan untuk orang lain.
  });

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  /**
   * Prior kesulitan kontinu untuk satu item.
   *
   * @param {Object} spec
   * @param {string} spec.level  — level CEFR ('A1'..'C2'); tak dikenal -> dianggap A1,
   *                              karena lebih aman menganggap terlalu mudah daripada
   *                              terlalu sulit (soal kemudahan cepat terkoreksi bukti).
   * @param {string} [spec.mode] — mode latihan grammar (kunci MODE_COST).
   * @param {string} [spec.domain] — 'grammar' (default) memakai modeCost; domain lain
   *                              (vocabulary/reading/listening/...) TIDAK: mode grammar
   *                              tidak bermakna di sana, jadi kembalikan basis level.
   * @param {number} [spec.stemLength] — panjang stem (karakter); >120 menambah beban
   *                              leksikal +0.15 (berlaku untuk semua domain: membaca
   *                              stem panjang membebani siapa pun, apa pun domainnya).
   * @returns {number} kesulitan kontinu, di-clamp ke [0.5, 6.9].
   */
  function difficultyFor(spec) {
    var s = spec && typeof spec === 'object' ? spec : {};
    var idx = LEVELS.indexOf(String(s.level || ''));
    // Basis lama tetap dihormati (kompat mundur dengan app.js): indeks level + 1.
    var base = (idx < 0 ? 0 : idx) + 1;

    var domain = String(s.domain || 'grammar');
    var cost = 0;
    if (domain === 'grammar') {
      // Mode tak dikenal -> biaya 0 (kembali ke basis), BUKAN error: prior tidak boleh
      // meledakkan pipeline hanya karena ada mode baru yang belum dikalibrasi.
      var raw = MODE_COST[String(s.mode || '')];
      cost = typeof raw === 'number' ? raw : 0;
    }

    var lexical = Number(s.stemLength) > STEM_LENGTH_THRESHOLD ? STEM_LENGTH_COST : 0;

    return clamp(base + cost + lexical, CLAMP_MIN, CLAMP_MAX);
  }

  /**
   * Penjelasan keputusan (opsional, untuk telemetri/debug): angka yang sama dengan
   * difficultyFor plus rationale, supaya keluaran keputusan tetap bisa diaudit.
   */
  function explain(spec) {
    var s = spec && typeof spec === 'object' ? spec : {};
    var idx = LEVELS.indexOf(String(s.level || ''));
    var domain = String(s.domain || 'grammar');
    var raw = domain === 'grammar' ? MODE_COST[String(s.mode || '')] : undefined;
    return {
      difficulty: difficultyFor(s),
      base: (idx < 0 ? 0 : idx) + 1,
      modeCost: typeof raw === 'number' ? raw : 0,
      lexicalCost: Number(s.stemLength) > STEM_LENGTH_THRESHOLD ? STEM_LENGTH_COST : 0,
      rationale: domain === 'grammar'
        ? (typeof raw === 'number' ? 'brain3_item_prior_mode' : 'brain3_item_prior_mode_unknown')
        : 'brain3_item_prior_base_only'
    };
  }

  return {
    LEVELS: LEVELS,
    MODE_COST: MODE_COST,
    CLAMP_MIN: CLAMP_MIN,
    CLAMP_MAX: CLAMP_MAX,
    STEM_LENGTH_THRESHOLD: STEM_LENGTH_THRESHOLD,
    STEM_LENGTH_COST: STEM_LENGTH_COST,
    difficultyFor: difficultyFor,
    explain: explain
  };
});
