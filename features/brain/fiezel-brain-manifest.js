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
 * - stepTutor: AKTIF (dikoreksi audit Fase 2, 30 Agu 2026) — app.js:7732 merender
 *   stepTutorGuidanceMarkup(q) saat murid mengulang di anak tangga scaffold 'worked',
 *   dan markup itu memanggil FiezelStepTutor.decompose() lewat stepTutorGuidance()
 *   (app.js:2712). Dulu tercatat 'off'; wiring berubah, manifest tidak ikut.
 * - productionGrader: AKTIF (dikoreksi audit Fase 2) — app.js:6651 menyisipkan soal
 *   cloze ke pool sesi adaptif (posisi 2 dan 5) lewat clozeAdaptivePicks(), dan
 *   answerCloze() memanggil FiezelProductionGrader.grade() (app.js:7944) untuk
 *   MEMUTUSKAN benar/salah jawaban ketik murid. Keputusan itu lalu menjadi bukti BKT
 *   (bobot 1,5), kalibrasi item, dan ledger miskonsepsi. Ini otoritas penuh, bukan
 *   bayangan. Dulu tercatat 'off' dengan alasan 'nol referensi di app.js' — alasan itu
 *   sudah tidak benar sejak jalur cloze masuk.
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
  var BUNDLE_VERSION = '3.0.0';

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
    { file: 'fiezel-brain-config.js', global: 'FiezelBrainConfig', schema: 'fiezel-brain-config-v1', authorityKey: 'brainConfig' },
    { file: 'fiezel-brain-manifest.js', global: 'FiezelBrainManifest', schema: SCHEMA, authorityKey: 'manifest' },
    { file: 'fiezel-confusion-matrix.js', global: 'FiezelConfusionMatrix', schema: 'fiezel-confusion-matrix-v1', authorityKey: 'confusionMap' },
    { file: 'fiezel-core-brain.js', global: 'FiezelCoreBrain', schema: 'fiezel-core-brain-v2', authorityKey: 'memory' },
    { file: 'fiezel-braincore-evidence.js', global: 'FiezelBraincoreEvidence', schema: 'fiezel-braincore-evidence-v1', authorityKey: 'braincoreEvidence' },
    { file: 'fiezel-decision-trace.js', global: 'FiezelDecisionTrace', schema: 'fiezel-decision-trace-v1', authorityKey: 'decisionTrace' },
    { file: 'fiezel-evidence-credibility.js', global: 'FiezelEvidenceCredibility', schema: 'fiezel-evidence-credibility-v1', authorityKey: 'evidenceCredibility' },
    { file: 'fiezel-item-calibration.js', global: 'FiezelItemCalibration', schema: 'fiezel-item-calibration-v1', authorityKey: 'itemCalibration' },
    { file: 'fiezel-item-prior.js', global: 'FiezelItemPrior', schema: null, authorityKey: 'itemDifficultyPrior' },
    { file: 'fiezel-learning-metrics.js', global: 'FiezelLearningMetrics', schema: 'fiezel-learning-metrics-v1', authorityKey: 'learningMetrics' },
    { file: 'fiezel-listening-adaptive.js', global: 'FiezelListeningAdaptive', schema: 'fiezel-listening-adaptive-v1', authorityKey: 'listeningPolicy' },
    { file: 'fiezel-mastery-bkt.js', global: 'FiezelMasteryBKT', schema: 'fiezel-mastery-bkt-v1', authorityKey: 'bktUnlock' },
    { file: 'fiezel-metrics-digest.js', global: 'FiezelMetricsDigest', schema: 'fiezel-metrics-digest-v1', authorityKey: 'metricsDigest' },
    { file: 'fiezel-misconception-ledger.js', global: 'FiezelMisconceptionLedger', schema: 'fiezel-misconception-ledger-v1', authorityKey: 'misconceptionPrior' },
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
    // KOREKSI audit Fase 2 (30 Agu 2026): keduanya DULU 'off' dengan alasan tertulis
    // "nol referensi di app.js". Alasan itu sudah basi — lihat komentar kepala berkas.
    // productionGrader memutuskan benar/salah jawaban ketik; stepTutor merender tuntunan
    // langkah yang dilihat murid. Gerbang brain-manifest-test.js kini MEMBACA app.js dan
    // memverifikasi klasifikasi ini terhadap wiring nyata, bukan terhadap konstanta.
    stepTutor: 'active',
    productionGrader: 'active',
    // Wave E4 (29 Agu): probe retensi tertunda — modul murni baru, belum ada pemanggil
    // di app.js; rekomendasi half-life-nya ADVISORY dan tidak menulis memori: 'off'.
    retentionProbe: 'off',
    // Registry konfigurasi (fiezel-brain-config.js) menyatakan sendiri bahwa ia TIDAK
    // dibaca modul lain saat runtime dan tidak dimuat index.html — sumber kebenaran
    // untuk manusia/tooling, bukan jalur keputusan: jujurnya 'off'.
    brainConfig: 'off',
    // Learning metrics menghitung metrik longitudinal on-device untuk pelaporan —
    // belum ada satu pun pemanggil di app.js/index.html pada bundle ini: 'off'.
    learningMetrics: 'off',
    // Dua modul infrastruktur gelombang v3 lain (digest metrik dan gerbang statistik):
    // sama-sama nol pemanggil di app.js/index.html pada bundle ini — 'off' sampai
    // ada wiring nyata yang bisa ditunjuk.
    metricsDigest: 'off',
    // statGate TETAP 'off', dan itu diverifikasi bukan diasumsikan (audit Fase 2).
    // content-promotion.js MEMANG memasang FiezelStatGate.verdict sebagai pemutus
    // promote/rollback konten, dan app.js:3004 memanggil CONTENT_PROMOTION.evaluate()
    // tiap kali aplikasi dimuat. TETAPI konfigurasi canary yang benar-benar dikirim
    // (content-canary-config.js: enabled:false, mode:'off') membuat evaluate() keluar
    // lebih dulu dengan reason 'canary_not_active' — probe empiris: verdict dipanggil
    // NOL kali. Jadi 'off' benar UNTUK KONFIGURASI YANG DIKIRIM; modul ini satu sakelar
    // konfigurasi dari menjadi aktif. Kalau canary dinyalakan, entri ini WAJIB jadi
    // 'active' di gelombang bundle yang sama.
    statGate: 'off',
    // Decision Trace (Fase 2 / Phase B): catatan diagnosis internal "apa yang dilihat Braincore
    // dan apa yang diputuskannya". Ia DESKRIPTIF MURNI — ia tidak memutuskan apa pun untuk
    // murid, dan sengaja belum dimuat index.html. 'off' adalah klasifikasi yang jujur hari ini:
    // modul ada, teruji, dan belum satu pun jalur aplikasi memanggilnya. Fase C yang
    // menyambungkannya; entri ini WAJIB ikut berubah di commit yang sama.
    // Fase 2 / Phase K. Skema bukti untuk MENILAI MESIN (bukan menjelaskan murid — itu
    // milik fiezel-learner-evidence-v1 di app.js). 'off' adalah klasifikasi yang JUJUR
    // hari ini: modulnya membentuk catatan, dan TIDAK ADA satu pun pemanggil di produksi.
    // Tidak ada baris di dalamnya yang tahu cara bicara dengan server, dan itu disengaja.
    braincoreEvidence: 'off',
    decisionTrace: 'off',
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
