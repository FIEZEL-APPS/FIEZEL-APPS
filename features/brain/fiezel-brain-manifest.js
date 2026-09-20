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
 * - bktUnlock (mastery-bkt): AKTIF sejak m025-337 (permintaan OWNER: "BKT nya jangan
 *   di bekukan" — parameter L0/T/slip/guess TETAP beku, lihat BRAIN-EVOLUTION-DECISIONS.md
 *   §5; yang dibuka adalah OTORITASNYA). bktMasteredSkills() menyapu lessons BKT yang
 *   lolos masteryGate() (L>=0,95, n>=5) jadi Set; lessonUnlockState() memakainya sebagai
 *   jalur TAMBAHAN menuju unlock — satu arah, hanya membuka, tidak pernah mengunci ulang
 *   yang sudah terbuka heuristik lama. Lima pemanggil: grammar() hub, openGrammarLesson(),
 *   renderGrammarLesson(), practiceSkill(), buildGrammarQuickQuestions(). Sejak m025-337
 *   frontier()-nya juga MEMILIH simpul aktif jalur Grammar di antara lesson yang sudah
 *   terbuka (zpdFrontierPick), tanpa pernah menambah kandidat.
 * - confusionMap (confusion-matrix): AKTIF sejak m025-337 — topConfusions() dibaca
 *   confusionRemediationTarget() dan MENENTUKAN isi kartu AI Booster: pasangan yang
 *   tertukar terarah (share >= 0,34) menggantikan kartu akurasi-mentah dan menautkan
 *   murid ke lesson yang aturannya sedang tergeser. Sebelum itu ia cuma dipajang
 *   confusionInsightMarkup dan tidak memutuskan apa pun.
 * - olmInsight (olm): AKTIF sejak m025-337 — vonis kalibrasi summarize() dibaca
 *   olmCalibrationNudge() dan memunculkan blok nasihat di ringkasan akhir sesi saat
 *   nadanya overconfidence/underconfidence. Sebelum itu kalimat yang sama hanya ada di
 *   panel diagnostik (olmPanelMarkup) yang jarang dibuka murid.
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
  // 3.8.0 -> 3.9.0 (m025-337): bktUnlock shadow -> active, lihat authorityMap di bawah.
  // 3.9.0 -> 3.10.0 (m025-337, gelombang kedua): confusionMap dan olmInsight ikut aktif,
  // dan frontier() BKT mulai memilih simpul aktif jalur Grammar.
  var BUNDLE_VERSION = '3.11.0';

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
    { file: 'fiezel-arena-bot.js', global: 'FiezelArenaBot', schema: 'fiezel-arena-bot-v1', authorityKey: 'arenaBot' },
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
    { file: 'fiezel-content-chain.js', global: 'FiezelContentChain', schema: 'fiezel-content-chain-v1', authorityKey: 'contentChain' },
    { file: 'fiezel-policy-verdict.js', global: 'FiezelPolicyVerdict', schema: 'fiezel-policy-verdict-v1', authorityKey: 'policyVerdict' },
    { file: 'fiezel-nof1.js', global: 'FiezelNof1', schema: 'fiezel-nof1-v1', authorityKey: 'nof1' },
    { file: 'fiezel-olm.js', global: 'FiezelOLM', schema: 'fiezel-olm-v1', authorityKey: 'olmInsight' },
    { file: 'fiezel-production-grader.js', global: 'FiezelProductionGrader', schema: 'fiezel-production-grader-v1', authorityKey: 'productionGrader' },
    { file: 'fiezel-question-memory.js', global: 'FiezelQuestionMemory', schema: 'fiezel-question-memory-v1', authorityKey: 'questionMemory' },
    { file: 'fiezel-question-allocator.js', global: 'FiezelQuestionAllocator', schema: 'fiezel-question-allocator-v1', authorityKey: 'questionAllocation' },
    { file: 'fiezel-retention-probe.js', global: 'FiezelPostTest', schema: 'fiezel-post-test-v1', authorityKey: 'retentionProbe' },
    { file: 'fiezel-speaking-adaptive.js', global: 'FiezelSpeakingAdaptive', schema: 'fiezel-speaking-adaptive-v1', authorityKey: 'speakingPolicy' },
    { file: 'fiezel-self-tune.js', global: 'FiezelSelfTune', schema: 'fiezel-self-tune-v1', authorityKey: 'selfTune' },
    { file: 'fiezel-srl-coach.js', global: 'FiezelSrlCoach', schema: 'fiezel-srl-coach-v1', authorityKey: 'srlCoach' },
    { file: 'fiezel-stat-gate.js', global: 'FiezelStatGate', schema: null, authorityKey: 'statGate' },
    { file: 'fiezel-step-tutor.js', global: 'FiezelStepTutor', schema: null, authorityKey: 'stepTutor' },
    { file: 'fiezel-target-language.js', global: 'FiezelTargetLanguage', schema: 'fiezel-target-language-v1', authorityKey: 'targetLanguage' },
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
    // targetLanguage: 'off' -> 'active' (m025-285). Sebelumnya 'off' dan itu jujur: modulnya
    // ada tetapi nol pemanggil. Sekarang app.js benar-benar memakainya — pemilih bahasa di
    // Pengaturan menulis preferences.targetLang, pemuat bank membaca bahasa itu untuk memilih
    // bank Jepang, dan graf keluarga Jepang disuntikkan ke Core Brain lewat setFamilyGraph.
    // Otoritas naik BERSAMA pemuatannya di index.html dan precache sw.js dalam satu commit;
    // otoritas yang naik tanpa pemuatan adalah peta yang bohong ke arah sebaliknya.
    targetLanguage: 'active',
    memory: 'active',
    // PAW ARENA (m025-279): bot lawan untuk tiga permainan arena. MURNI — seed→langkah
    // deterministik, tanpa DOM/jam/acak — dimuat index.html dan di-precache sw.js.
    //
    // Nilainya 'off' sampai penyambungannya belum ada, dan komentar di sini pernah berbunyi
    // begitu. Klaim itu berhenti benar pada commit yang menyambungkan view arena:
    // features/learner-flow/fiezel-paw-arena.js memanggilnya delapan kali untuk memilih
    // jawaban, kalimat lanjutan, kartu petunjuk, tebakan, dan taruhan bot. Bot yang benar-
    // benar memutuskan langkah lawan murid adalah 'active'; membiarkannya 'off' membuat peta
    // ini berbohong ke arah yang paling berbahaya — mengaku tidak berjalan padahal berjalan.
    arenaBot: 'active',
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
    // m025-337 (permintaan OWNER: "BKT nya jangan di bekukan"): shadow -> active.
    // masteryGate() (L>=0,95 DAN n>=5 — bukti tinggi, bukan cuma posterior tinggi) kini
    // dibaca lessonUnlockState() lewat bktMasteredSkills(): sebuah prasyarat yang lolos
    // gerbang ini membuka lesson berikutnya SEKALIPUN akurasi mentah v2 belum sampai
    // ambang. Klaim ini bukan "BKT menggantikan v2" — ia cuma bisa MEMBUKA, tidak pernah
    // MENGUNCI (bktMastered kosong/absen = perilaku identik sebelum m025-337). Parameter
    // BKT sendiri (L0/T/slip/guess) TETAP beku; itu keputusan terpisah yang tidak berubah
    // (BRAIN-EVOLUTION-DECISIONS.md §5).
    bktUnlock: 'active',
    // m025-337: shadow -> active, dua modul sekaligus, keduanya lewat pola yang sama dengan
    // bktUnlock — modulnya sudah lengkap dan teruji sejak lahir, yang absen cuma pemanggil.
    // confusionMap: topConfusions() memilih isi kartu AI Booster (pasangan tertukar
    // menggantikan kartu akurasi-mentah). olmInsight: vonis kalibrasi summarize() menyalakan
    // blok nasihat di ringkasan akhir sesi. Keduanya fail-quiet: modul absen, bukti tipis,
    // atau vonis netral = layar persis seperti sebelum m025-337.
    confusionMap: 'active',
    olmInsight: 'active',
    // listeningPolicy (listening-adaptive): AKTIF (P0.1) — rateBand dan replayQuota
    // langsung mengatur kecepatan pemutar audio dan kuota putar ulang di app.js.
    listeningPolicy: 'active',
    stepTutor: 'active',
    productionGrader: 'active',
    // m025-341: penjadwalnya memang sudah jalan sejak lama, tetapi jadwalnya tidak pernah
    // dibaca siapa pun — tidak ada satu pun lesson yang benar-benar diuji ulang. Sekarang
    // ada dua jalur yang MEMUTUSKAN: probe jatuh tempo mengembalikan lesson mastered ke
    // kolam review (buildAdaptivePool), dan vonis 'rapuh' mencabut klaim penguasaannya di
    // hub Grammar. Rekomendasi half-life TETAP advisory dan penulis nextReview tetap
    // tunggal; yang berubah adalah probe kini sampai ke murid. Jujurnya 'active'.
    retentionProbe: 'active',
    // Registry konfigurasi (fiezel-brain-config.js) menyatakan sendiri bahwa ia TIDAK
    // dibaca modul lain saat runtime dan tidak dimuat index.html — sumber kebenaran
    // untuk manusia/tooling, bukan jalur keputusan: jujurnya 'off'.
    brainConfig: 'off',
    // m025-341: bukan tampilan lagi. brierCalibration() sekarang memutuskan lewat
    // brierEvidenceBump(): Brier Skill Score <= 0 (model kalah dari tebakan base-rate)
    // menaikkan ambang bukti n yang dituntut sebelum mastery BKT boleh ikut membuka
    // prasyarat. Satu arah — hanya bisa memperketat, tidak pernah melonggarkan. 'active'.
    learningMetrics: 'active',
    // Proyeksi bukti sinkron (S5b). Dipanggil app.js lewat brainSyncQueue, tetapi ia
    // MEMBATASI apa yang boleh keluar — ia tidak memutuskan apa pun tentang belajar murid,
    // dan sinkronnya sendiri mati secara default. Jujurnya 'shadow', bukan 'active'.
    // m025-341: DIPERIKSA ULANG pada gelombang lapisan ukur dan sengaja DIBIARKAN 'shadow'.
    // Alasan di atas masih benar kata per kata sesudah retentionProbe/learningMetrics naik:
    // modul ini tetap pembatas jalur keluar, bukan pengambil keputusan belajar. Menaikkannya
    // hanya supaya "genap tiga" adalah klaim yang lolos gerbang tanpa ada yang berubah.
    attemptRecord: 'shadow',
    // Langkah 2 roadmap otonomi: pemutus nasib kebijakan belajar. Ia BENAR-BENAR
    // memutuskan — hasilnya menentukan status outcome yang membentuk kebijakan sesi
    // berikutnya lewat deriveAdaptivePolicy. Jujurnya 'active'.
    policyVerdict: 'active',
    // Langkah 3 roadmap otonomi: pembagi lengan eksperimen N-of-1. Modul murni yang belum
    // punya pemanggil di app.js — eksperimen pertama belum dibuka. Jujurnya 'off'.
    // Bankor sebagai mesin alokasi (m025-271). Keduanya MURNI dan dimuat halaman,
    // tetapi hari ini belum ada satu pun pemanggil di jalur murid: modulnya lahir
    // lebih dulu beserta gerbangnya, penyambungannya menyusul di perubahan
    // tersendiri yang bisa ditinjau. Selama itu jujurnya 'off' — bukan 'shadow',
    // karena 'shadow' berarti ia berjalan dan hasilnya dibuang, sedangkan ini
    // belum berjalan sama sekali.
    /* m025-278: langkah 1 handoff BANKOR selesai — latihan mandiri murid memakai kedua
       modul ini. fiezel-learner-flow.js memilih butir lewat allocate() dan mencatat hasil
       per BUTIR lewat recordAttempt(); ingatannya hidup di st.qmem. Sisi guru belum,
       dan itu sengaja: langkah 2-4 handoff masih terbuka. */
    questionMemory: 'active',
    questionAllocation: 'active',
    nof1: 'off',
    // Langkah 4: rantai hash perubahan parameter. Prasyarat penyetelan-diri, belum ada
    // pemanggil di app.js karena belum ada parameter yang boleh bergerak sendiri: 'off'.
    paramLedger: 'off',
    // Langkah 5: pengusul penyetelan-diri. 'off' dan HARUS tetap 'off' sampai OWNER
    // memutuskan kelas perubahan apa yang boleh berjalan tanpa manusia. Modulnya siap dan
    // pagarnya terbukti; yang belum ada adalah izinnya, dan izin bukan pekerjaan kode.
    selfTune: 'off',
    // Langkah 6 (separuh kode): pelapor posisi kandidat konten dalam rantainya. Ia tidak
    // pernah menerbitkan apa pun — tahap terjauh yang bisa ia laporkan adalah
    // 'owner_decision' — tetapi ia tetap 'off' karena belum ada pemanggil di app.js, dan
    // 'active' tanpa pemanggil adalah persis kebohongan yang Langkah 1 ada untuk menutup.
    contentChain: 'off',
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
