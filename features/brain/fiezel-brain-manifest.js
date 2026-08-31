/**
 * FIEZEL Brain Manifest — identitas bundle Brain yang sedang shipping (Braincore v3, Fase 0).
 *
 * MASALAH YANG DIPERBAIKI (council model-council-gpt_5_6_sol.md §2.1 / Fase 0)
 * ---------------------------------------------------------------------------
 * "Brain v3" selama ini BUKAN unit yang koheren: Core masih mendeklarasikan
 * SCHEMA 'fiezel-core-brain-v2', Tutor sudah v3, dan setiap sidecar (BKT, ledger,
 * affect, dst.) membawa schema v1 masing-masing. FIEZEL_VERSION di version.js adalah
 * versi PRODUK, bukan versi kebijakan belajar — tidak ada satu pun peta yang menjawab
 * "kombinasi modul mana yang sedang mengambil keputusan, dan mana yang cuma bayangan?".
 * Tanpa peta itu, dua bahaya nyata: (1) telemetri/diagnostik tidak bisa menyebut bundle
 * yang menghasilkan sebuah keputusan, sehingga perbandingan antar rilis jadi omong
 * kosong; (2) modul shadow bisa diam-diam dianggap punya otoritas (atau sebaliknya)
 * hanya karena tidak ada dokumen mesin yang menegaskannya.
 *
 * Manifest ini adalah JAWABAN LOKAL untuk masalah itu — bukan registry cloud (itu
 * prematur menurut council): satu objek beku yang mendaftarkan SEMUA modul di
 * features/brain/ dengan string SCHEMA yang benar-benar tertulis di file masing-masing
 * (diverifikasi dengan membaca sumbernya, bukan mengarang), plus peta otoritas yang
 * jujur terhadap wiring app.js hari ini.
 *
 * SUMBER KEBENARAN PETA OTORITAS (hasil inspeksi app.js, per bundle 3.0.0)
 * ------------------------------------------------------------------------
 * - memory (core-brain): AKTIF — scheduleNext() menulis stabilitas via
 *   FiezelCoreBrain.updateMemory, dan analyze() memberi kebijakan adaptif.
 * - tutorSelection (tutor-brain): AKTIF — selectNext() memilih soal berikutnya,
 *   observe() memutus reteach/advance.
 * - misconceptionPrior (ledger): AKTIF — active() menjadi priorMisconceptions
 *   pada createSession tutor.
 * - itemDifficultyPrior (item-prior): AKTIF — difficultyFor() MENIMPA q.difficulty
 *   soal grammar sebelum seleksi.
 * - evidenceCredibility: AKTIF — kappa menjadi pengali credibility di
 *   estimateAbility (coreBrainAttempts) dan bobot bukti BKT.
 * - affectTargetSuccess: AKTIF — menggeser targetSuccess pemilih soal
 *   (frustrated 0.90 / bored 0.75 / default 0.80).
 * - bktUnlock (mastery-bkt): BAYANGAN — bukti dicatat, tetapi panel diagnostik
 *   sendiri memberi label "bayangan - tanpa otoritas unlock"; keputusan buka-kunci
 *   masih di mesin lama (app.js bktShadowMarkup).
 * - confusionMap (confusion-matrix): BAYANGAN — sel kebingungan dicatat ke
 *   penyimpanan lokal oleh app.js tetapi TIDAK pernah dibaca untuk keputusan
 *   maupun UI (hanya terekspos lewat __fiezelAudit).
 * - olmInsight (olm): BAYANGAN — hanya dirender di panel diagnostik
 *   (olmPanelMarkup), tidak memutuskan apa pun.
 * - listeningPolicy (listening-adaptive): BAYANGAN — policy() dihitung dan
 *   ditempel sebagai metadata q.__listeningPolicy, tetapi tidak ada satu baris
 *   pun yang membacanya kembali untuk mengubah playback.
 * - stepTutor: AKTIF — stepTutorGuidance()/stepTutorGuidanceMarkup() memecah soal
 *   ber-reasoningOperation jadi tuntunan langkah yang DITAMPILKAN ke murid saat
 *   scaffold mencapai 'worked' (app.js, jalur render jawaban).
 * - productionGrader: AKTIF — grade() adalah penilai jawaban mode cloze; hasilnya
 *   menentukan benar/salah murid dan matchedDistractor-nya masuk ledger miskonsepsi.
 * - retentionProbe: BAYANGAN — schedule() dipanggil saat mastery BKT tembus dan
 *   evaluate() menilai kalibrasi dari jawaban NYATA setelah jatuh tempo, tetapi
 *   rekomendasi half-life-nya ADVISORY: penulis nextReview tetap tunggal (FSRS).
 * - learningMetrics: BAYANGAN — lima metrik longitudinal dihitung di perangkat dan
 *   dirender di panel diagnostik; nol keputusan yang bergantung padanya.
 * - statGate: OFF di jalur aplikasi (nol referensi app.js), tetapi BERWENANG di jalur
 *   pipeline konten — content-promotion.js memakai verdict()-nya untuk memutus
 *   promote/hold/reject. Peta ini memetakan otoritas DI PERANGKAT, jadi 'off' di sini
 *   bukan berarti modul mati; lihat catatan di entri authorityMap-nya.
 *
 * BATAS YANG DIJAGA
 * -----------------
 * Modul MURNI: tanpa DOM, tanpa jaringan, tanpa storage, tanpa Math.random,
 * tanpa waktu. Seluruh isi manifest dibekukan dalam (deep freeze) — manifest yang
 * bisa dimutasi runtime sama bohongnya dengan tidak punya manifest. minAppVersion
 * DIBACA dari version.js (self.FIEZEL_VERSION='5.19.0') tanpa mengeditnya.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBrainManifest = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-brain-manifest-v1';

  // Versi BUNDLE kebijakan belajar — terpisah dari versi produk. 3.0.0 menandai
  // gelombang Braincore v3 pertama yang punya identitas bundle eksplisit.
  var BUNDLE_VERSION = '3.6.0';

  // Disalin apa adanya dari version.js (self.FIEZEL_VERSION). Bundle ini mengandalkan
  // wiring app.js 5.19.0 (guard modul-absen, sidecar stabilityDays, dsb.) — versi
  // aplikasi yang lebih tua tidak menjamin titik sambung itu ada.
  var MIN_APP_VERSION = '5.19.0';

  /**
   * Bekukan objek secara rekursif. Object.freeze dangkal saja tidak cukup jujur:
   * manifest yang array modulnya masih bisa di-push berarti daftar modulnya bisa
   * dibohongi setelah dimuat.
   */
  function deepFreeze(obj) {
    if (obj && (typeof obj === 'object' || typeof obj === 'function') && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      var keys = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < keys.length; i++) deepFreeze(obj[keys[i]]);
    }
    return obj;
  }

  /**
   * SEMUA modul di features/brain/, satu entri per file. `schema` adalah string
   * SCHEMA yang benar-benar dideklarasikan file itu; null berarti file tersebut
   * MEMANG tidak mendeklarasikan SCHEMA (item-prior dan step-tutor adalah fungsi
   * murni tanpa state persisten, jadi tidak butuh schema penyimpanan) — mencantumkan
   * null lebih jujur daripada mengarang versi yang tidak ada di sumbernya.
   * `authorityKey` menunjuk entri authorityMap yang memutuskan nasib modul itu.
   */
  var MODULES = [
    { file: 'fiezel-affect.js', global: 'FiezelAffect', schema: 'fiezel-affect-v1', authorityKey: 'affectTargetSuccess' },
    { file: 'fiezel-attempt-record.js', global: 'FiezelAttemptRecord', schema: 'fiezel-attempt-record-v1', authorityKey: 'attemptRecord' },
    { file: 'fiezel-brain-config.js', global: 'FiezelBrainConfig', schema: 'fiezel-brain-config-v1', authorityKey: 'brainConfig' },
    { file: 'fiezel-brain-manifest.js', global: 'FiezelBrainManifest', schema: SCHEMA, authorityKey: 'manifest' },
    { file: 'fiezel-confusion-matrix.js', global: 'FiezelConfusionMatrix', schema: 'fiezel-confusion-matrix-v1', authorityKey: 'confusionMap' },
    { file: 'fiezel-core-brain.js', global: 'FiezelCoreBrain', schema: 'fiezel-core-brain-v2', authorityKey: 'memory' },
    { file: 'fiezel-evidence-credibility.js', global: 'FiezelEvidenceCredibility', schema: 'fiezel-evidence-credibility-v1', authorityKey: 'evidenceCredibility' },
    { file: 'fiezel-item-calibration.js', global: 'FiezelItemCalibration', schema: 'fiezel-item-calibration-v1', authorityKey: 'itemCalibration' },
    { file: 'fiezel-item-prior.js', global: 'FiezelItemPrior', schema: null, authorityKey: 'itemDifficultyPrior' },
    { file: 'fiezel-learning-metrics.js', global: 'FiezelLearningMetrics', schema: 'fiezel-learning-metrics-v1', authorityKey: 'learningMetrics' },
    { file: 'fiezel-listening-adaptive.js', global: 'FiezelListeningAdaptive', schema: 'fiezel-listening-adaptive-v1', authorityKey: 'listeningPolicy' },
    { file: 'fiezel-mastery-bkt.js', global: 'FiezelMasteryBKT', schema: 'fiezel-mastery-bkt-v1', authorityKey: 'bktUnlock' },
    { file: 'fiezel-metrics-digest.js', global: 'FiezelMetricsDigest', schema: 'fiezel-metrics-digest-v1', authorityKey: 'metricsDigest' },
    { file: 'fiezel-misconception-ledger.js', global: 'FiezelMisconceptionLedger', schema: 'fiezel-misconception-ledger-v1', authorityKey: 'misconceptionPrior' },
    { file: 'fiezel-param-ledger.js', global: 'FiezelParamLedger', schema: 'fiezel-param-ledger-v1', authorityKey: 'paramLedger' },
    { file: 'fiezel-policy-verdict.js', global: 'FiezelPolicyVerdict', schema: 'fiezel-policy-verdict-v1', authorityKey: 'policyVerdict' },
    { file: 'fiezel-nof1.js', global: 'FiezelNof1', schema: 'fiezel-nof1-v1', authorityKey: 'nof1' },
    { file: 'fiezel-olm.js', global: 'FiezelOLM', schema: 'fiezel-olm-v1', authorityKey: 'olmInsight' },
    { file: 'fiezel-production-grader.js', global: 'FiezelProductionGrader', schema: 'fiezel-production-grader-v1', authorityKey: 'productionGrader' },
    { file: 'fiezel-retention-probe.js', global: 'FiezelPostTest', schema: 'fiezel-post-test-v1', authorityKey: 'retentionProbe' },
    { file: 'fiezel-speaking-adaptive.js', global: 'FiezelSpeakingAdaptive', schema: 'fiezel-speaking-adaptive-v1', authorityKey: 'speakingPolicy' },
    { file: 'fiezel-srl-coach.js', global: 'FiezelSrlCoach', schema: 'fiezel-srl-coach-v1', authorityKey: 'srlCoach' },
    { file: 'fiezel-stat-gate.js', global: 'FiezelStatGate', schema: null, authorityKey: 'statGate' },
    { file: 'fiezel-step-tutor.js', global: 'FiezelStepTutor', schema: null, authorityKey: 'stepTutor' },
    { file: 'fiezel-tutor-brain.js', global: 'FiezelTutorBrain', schema: 'fiezel-tutor-brain-v3', authorityKey: 'tutorSelection' }
  ];

  /**
   * Peta otoritas — SATU-SATUNYA nilai yang boleh: 'active' | 'shadow' | 'off'.
   *   active = keluarannya benar-benar mengubah pengalaman murid (pemilihan soal,
   *            jadwal, kesulitan, bobot bukti);
   *   shadow = berjalan dan/atau mencatat, tetapi keputusannya DIBUANG atau hanya
   *            tampil di panel diagnostik — mesin lama yang tetap memutus;
   *   off    = dimuat tetapi tidak pernah dipanggil oleh jalur aplikasi mana pun.
   * Bukti tiap klasifikasi ada di komentar kepala berkas (hasil inspeksi app.js).
   */
  var AUTHORITY_MAP = {
    memory: 'active',
    tutorSelection: 'active',
    misconceptionPrior: 'active',
    itemDifficultyPrior: 'active',
    evidenceCredibility: 'active',
    affectTargetSuccess: 'active',
    // Fase 3 (sesi hulu): kalibrasi item Elo dipakai buildAdaptivePool via effective()
    // (app.js:1802/1809) — mempengaruhi soal yang tampil: 'active'. SRL coach
    // sessionPlan() dipakai perencanaan sesi (app.js:1984): 'active'. Speaking
    // adaptive: evidence/policy dibaca hook Speaking Lab, addon yang memutuskan
    // kapan memakainya (app.js:2045-2048) — jalur keputusan belum pasti: 'shadow'.
    itemCalibration: 'active',
    srlCoach: 'active',
    speakingPolicy: 'shadow',
    bktUnlock: 'shadow',
    confusionMap: 'shadow',
    olmInsight: 'shadow',
    listeningPolicy: 'shadow',
    // Langkah 1 roadmap otonomi: keduanya BERWENANG dan sudah lama berwenang — peta
    // lama menyebutnya 'off' dengan alasan 'nol referensi di app.js' yang tidak lagi
    // benar. Gerbang W8 di brain-page-wiring-test.js sekarang menangkap drift arah ini.
    stepTutor: 'active',
    productionGrader: 'active',
    // Langkah 1 roadmap otonomi: probe retensi kini dimuat halaman dan dipanggil —
    // schedule() saat mastery BKT tembus, evaluate() atas jawaban nyata sesudah jatuh
    // tempo. Ia MENGUKUR dan tidak memutuskan (rekomendasi half-life tetap advisory,
    // penulis nextReview tetap tunggal), maka jujurnya 'shadow', bukan 'active'.
    retentionProbe: 'shadow',
    // Registry konfigurasi (fiezel-brain-config.js) menyatakan sendiri bahwa ia TIDAK
    // dibaca modul lain saat runtime dan tidak dimuat index.html — sumber kebenaran
    // untuk manusia/tooling, bukan jalur keputusan: jujurnya 'off'.
    brainConfig: 'off',
    // Langkah 1 roadmap otonomi: learningMetricsSnapshot() di app.js menghitung lima
    // metrik longitudinal dari riwayat lokal dan merendernya di panel diagnostik.
    // Tampilan saja — nol keputusan sesi yang bergantung padanya: 'shadow'.
    learningMetrics: 'shadow',
    // Proyeksi bukti sinkron (S5b). Dipanggil app.js lewat brainSyncQueue, tetapi ia
    // MEMBATASI apa yang boleh keluar — ia tidak memutuskan apa pun tentang belajar murid,
    // dan sinkronnya sendiri mati secara default. Jujurnya 'shadow', bukan 'active'.
    attemptRecord: 'shadow',
    // Langkah 2 roadmap otonomi: pemutus nasib kebijakan belajar. Ia BENAR-BENAR
    // memutuskan — hasilnya menentukan status outcome yang membentuk kebijakan sesi
    // berikutnya lewat deriveAdaptivePolicy. Jujurnya 'active'.
    policyVerdict: 'active',
    // Langkah 3 roadmap otonomi: pembagi lengan eksperimen N-of-1. Modul murni yang belum
    // punya pemanggil di app.js — eksperimen pertama belum dibuka. Jujurnya 'off'.
    nof1: 'off',
    // Langkah 4: rantai hash perubahan parameter. Prasyarat penyetelan-diri, belum ada
    // pemanggil di app.js karena belum ada parameter yang boleh bergerak sendiri: 'off'.
    paramLedger: 'off',
    // Digest metrik tetap 'off' dengan sengaja: ia adalah PENGUNGGAH, dan menyalakannya
    // tanpa keputusan produk soal telemetri berarti menambah permukaan privasi diam-diam.
    metricsDigest: 'off',
    // 'off' DI PERANGKAT saja. content-promotion.js memakai FiezelStatGate.verdict untuk
    // memutus promote/hold/reject kandidat konten — modul ini hidup, hanya belum di jalur
    // keputusan otak. Langkah 2 roadmap otonomi yang memindahkannya ke sini.
    statGate: 'off',
    // Manifest sendiri deskriptif murni: ia tidak memutuskan apa-apa untuk murid,
    // maka jujurnya 'shadow' (informasi diagnostik), bukan 'active'.
    manifest: 'shadow'
  };

  /**
   * Versi konten yang menjadi asumsi bundle ini, disalin dari deklarasi di file
   * konten masing-masing (BUKAN dikira-kira). Kalau salah satu file konten naik
   * versi mayor, bundle Brain berikutnya wajib menyatakan ulang kompatibilitasnya.
   * Nilai dipertahankan dalam TIPE aslinya (grammar-misconception-id memakai angka 1).
   */
  var CONTENT_COMPATIBILITY = {
    'grammar-templates.json': '2.0.0',
    'grammar-curriculum-v1.json': '1.0.0',
    'grammar-misconception-id.json': 1,
    'misconception-taxonomy-v1.json': 'fiezel-misconception-taxonomy-v1',
    'grammar-explanations-id.json': 'fiezel-grammar-explanations-id-v1'
  };

  /**
   * Ringkasan manifest untuk diagnostik/log keputusan. Mengikuti kontrak Braincore v3:
   * setiap keluaran membawa `rationale` berprefix brain3_ dan `confidence`.
   * Confidence 0.9, bukan 1.0, dengan alasan yang bisa diverifikasi: string schema
   * dan versi dibaca langsung dari sumbernya (kepastian tinggi), tetapi klasifikasi
   * otoritas adalah hasil inspeksi wiring app.js pada satu titik waktu — wiring bisa
   * berubah tanpa file ini ikut berubah, dan manifest yang mengaku 100% yakin atas
   * fakta yang bisa basi adalah manifest yang bohong.
   */
  function describe() {
    var counts = { active: 0, shadow: 0, off: 0 };
    var keys = Object.keys(AUTHORITY_MAP);
    for (var i = 0; i < keys.length; i++) {
      var v = AUTHORITY_MAP[keys[i]];
      if (counts[v] != null) counts[v]++;
    }
    return {
      schema: SCHEMA,
      bundleVersion: BUNDLE_VERSION,
      minAppVersion: MIN_APP_VERSION,
      moduleCount: MODULES.length,
      authorityCounts: counts,
      summary: 'Brain bundle ' + BUNDLE_VERSION + ': ' + MODULES.length + ' modul (' +
        counts.active + ' active, ' + counts.shadow + ' shadow, ' + counts.off + ' off); ' +
        'core=fiezel-core-brain-v2, tutor=fiezel-tutor-brain-v3; min app ' + MIN_APP_VERSION + '.',
      rationale: 'brain3_manifest_v1',
      confidence: 0.9
    };
  }

  return deepFreeze({
    SCHEMA: SCHEMA,
    bundleVersion: BUNDLE_VERSION,
    minAppVersion: MIN_APP_VERSION,
    modules: MODULES,
    authorityMap: AUTHORITY_MAP,
    contentCompatibility: CONTENT_COMPATIBILITY,
    describe: describe
  });
});
