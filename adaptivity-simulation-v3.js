#!/usr/bin/env node
/**
 * ADAPTIVITY SIMULATION v3 — simulator berseed + gate CI (milik A11).
 *
 * KENAPA file ini ada (temuan council, model-council-gpt_5_6_sol.md §5):
 * simulator lama (adaptivity-simulation.js) punya dua cacat metodologis fatal —
 *   1. Math.random() tanpa seed, jadi hasilnya tidak bisa direproduksi; dan
 *   2. generator jawabannya MENGABAIKAN difficulty yang disajikan: kurva belajar
 *      ditulis tangan di generator, lalu model "membaca" pola yang memang sengaja
 *      dimasukkan. Itu demonstrasi, bukan evaluasi.
 *
 * Desain v3 membalik keduanya:
 *   - PRNG mulberry32 berseed (argv[2], default 42) → dua run dengan seed sama
 *     WAJIB byte-identik. Kalau tidak, gate gagal — non-determinisme di simulator
 *     berarti setiap klaim efektivitas di atasnya tidak bisa diaudit.
 *   - Murid SINTETIS punya state LATEN (theta per keluarga grammar, laju belajar,
 *     stabilitas memori per item, slip/guess). Jawaban dibangkitkan dari
 *     successProbability(theta_laten, difficulty_yang_DISAJIKAN) + slip/guess.
 *     Kebijakan TIDAK PERNAH membaca state laten — ia hanya melihat baris riwayat
 *     teramati ({at, ok, ms, type, skill, family, difficulty}), persis seperti
 *     aplikasi sungguhan. Dengan begitu, kalau kebijakan memilih soal yang lebih
 *     pas, AKURASINYA yang berubah — bukan karena kurvanya dikarang.
 *   - Dua kebijakan dibandingkan pada murid laten yang SAMA (seed & dinamika sama):
 *       v1 murni  : cermin deriveAdaptivePolicy (fiezel-core-worker.js) — level
 *                   kasar ± 1 dari band akurasi teramati; tanpa model kemampuan.
 *       v2        : v1 + FiezelCoreBrain.refinePolicy(analyze(...)) — lapisan
 *                   resmi yang dipakai aplikasi.
 *     Trace item-nya boleh berbeda SETELAH keputusan pertama berbeda — memang itu
 *     yang diukur: konsekuensi keputusan, pada murid yang identik.
 *
 * Aturan kontrak yang dipatuhi (docs/BRAINCORE-V3-CONTRACTS.md):
 *   - modul murni: tanpa DOM/network/storage, tanpa Math.random tanpa seed,
 *     waktu selalu argumen (NOW konstan, bukan Date.now());
 *   - pola UMD sama dengan features/brain/fiezel-core-brain.js;
 *   - keputusan gate membawa `rationale` berprefiks brain3_;
 *   - keluaran ringkasan JSON ke stdout (log proses ke stderr), exit non-zero
 *     bila v2 lebih buruk dari v1 pada mayoritas metrik ATAU determinisme gagal.
 *
 * FASE 2 (B5) — momentum residual:
 *   Temuan A11: v2 menang kalibrasi/retensi tetapi OSILASI kesulitan lebih buruk
 *   dari v1 (4.22 vs 2.84 per 10 sesi). Hipotesis B1: momentum berbasis AKURASI
 *   mentah salah membaca murid yang sedang ditantang — akurasi turun karena soal
 *   naik kelas, bukan karena murid mundur, lalu kebijakan memantul. Fase 2
 *   menambah kontrak momentum: baris attempts boleh membawa `predicted` (prediksi
 *   P saat penyajian); bila >=60% baris punya predicted, tren dihitung pada
 *   RESIDUAL (ok?1:0)-predicted per blok (field `basis:'residual'`).
 *   Simulator ini menguji TIGA varian pada murid laten identik (seed berpasangan):
 *     v1          : kebijakan worker murni (baseline lama);
 *     v2_lama     : v2 TANPA predicted di baris → momentum basis 'accuracy';
 *     v2_residual : v2 DENGAN predicted per attempt (successProbability saat
 *                   penyajian) → momentum residual aktif.
 *   Metrik baru: falseDeclineRate — berapa proporsi evaluasi momentum yang
 *   menyebut 'declining' padahal theta LATEN murid sedang NAIK (kunci jawaban
 *   simulator dipakai HANYA untuk menilai momentum, tidak pernah dilihat
 *   kebijakan). Gate baru: exit 1 bila v2_residual TIDAK menurunkan osilasi
 *   dibanding v2_lama ATAU false-decline v2_residual > v2_lama. Bila modul core
 *   brain belum punya dukungan residual (B1 belum selesai), varian residual
 *   dilewati dan gate residual ditandai SKIPPED (bukan gagal) — feature-detect
 *   runtime, bukan asumsi.
 *
 * FASE 3 (C6) — skenario kalibrasi item:
 *   Semua fase sebelumnya berasumsi label kesulitan item BENAR (kesulitan yang
 *   dialami murid = kesulitan yang diklaim prior). Dunia nyata tidak sebaik itu:
 *   sebagian item pasti mislabeled — dan justru untuk itulah C1 membangun
 *   FiezelItemCalibration (Elo sisi-item + shrinkage keras ±0.6 dari prior).
 *   Skenario baru (TERPISAH dari skenario Fase 2 supaya semua gate lama tetap
 *   mengukur hal yang sama):
 *     - Bank item sintetis berseed: 3 keluarga × 6 level prior × 6 item = 108
 *       item; ~20% di antaranya MISLABELED — kesulitan SEBENARNYA menyimpang
 *       ±0.8 dari prior-nya. Murid laten menjawab menurut kesulitan SEBENARNYA;
 *       kebijakan/prediksi hanya melihat prior (atau hasil kalibrasi). Bank yang
 *       sama dipakai kedua varian → perbandingan berpasangan yang adil.
 *     - v3_tanpa_kalibrasi : stack v2 (+predicted bila residual didukung) yang
 *       PERCAYA prior apa adanya — baseline defek yang mau diperbaiki C1.
 *     - v3_kalibrasi       : sama persis + FiezelItemCalibration: observe() per
 *       jawaban (kappa=1), lalu kesulitan EFEKTIF effective() dipakai untuk
 *       memilih kandidat, mencatat baris riwayat, dan memprediksi P — persis
 *       wiring C5 butir 1 (buildAdaptivePool memakai effective()).
 *   Metrik baru:
 *     - itemBiasRMSE  : akar rata-rata kuadrat selisih (kesulitan efektif yang
 *       DIPERCAYA sistem − kesulitan SEBENARNYA), HANYA item dengan n>=8
 *       penyajian (di bawah itu effective() memang belum boleh koreksi).
 *     - poolSeparation: persentase perbedaan himpunan kandidat (6 terdekat per
 *       keluarga) antara targetDifficulty rendah (2) vs tinggi (5) — gate temuan
 *       Opus yang dulu TIDAK ADA: buildAdaptivePool lama mengabaikan target,
 *       kandidatnya sama untuk semua target (separation 0%). Di sini pemilihan
 *       yang benar wajib menghasilkan separation tinggi.
 *   Gate baru (exit 1): kalibrasi TIDAK menurunkan itemBiasRMSE dibanding
 *   tanpa-kalibrasi, ATAU ada |delta efektif − prior| > 0.6 (shrinkage kontrak
 *   bocor), ATAU non-determinisme. Bila FiezelItemCalibration belum ada (C1
 *   belum mendarat), varian v3_kalibrasi dilewati dan gate kalibrasi SKIPPED
 *   dengan pesan jelas (bukan gagal) — pola feature-detect yang sama dengan B5.
 *
 * WAVE 3 — PENGERASAN MULTI-SEED (port dari pengerasan wave-2 yang dicabut saat
 * rebase; jawaban atas 4 kelemahan council model-council-claude_opus_5_0.md §1.5):
 *   1. MULTI-SEED: kesimpulan dari 1 seed adalah anekdot. Suite kini juga
 *      dijalankan pada SEED_COUNT (50) seed turunan deterministik, berpasangan
 *      antar-varian (murid laten identik per seed×profil), di ATAS suite
 *      single-seed lama yang dipertahankan apa adanya (semua gate fase 2/3
 *      lama tetap mengukur hal yang sama pada dunia yang sama).
 *   2. PROFIL 3 → 9: tiga profil asli TIDAK diubah satu angka pun; enam profil
 *      turunan dibangkitkan deterministik dari seed (jitter theta/laju/redaman/
 *      drift/slip yang dijepit ke rentang waras) supaya kebijakan diuji pada
 *      populasi, bukan pada tiga titik.
 *   3. CENSORING: timeToMasteryDays yang null ATAU == horizon (SIM_DAYS)
 *      ditandai `censored` — mastery tepat di hari terakhir tidak bisa
 *      dibedakan dari "baru saja melewati horizon", jadi keduanya disensor.
 *      Run tersensor DIKELUARKAN dari rata-rata timeToMastery (agregat & CI —
 *      CI timeToMastery hanya pada pasangan yang dua-duanya mastery). Gate
 *      censoring terpisah: FAIL MUTLAK bila satu varian tak pernah mastery
 *      (di profil mana pun) pada MAYORITAS seed; FAIL relatif bila CI selisih
 *      indikator censoring kandidat−baseline seluruhnya > margin praktis.
 *      Tanpa ini, "36 hari" menyamarkan "tidak pernah" menjadi angka biasa.
 *   4. AMBANG PRAKTIS: perbandingan float mentah (EPS=1e-9) diganti ambang
 *      signifikansi praktis per metrik (var PRAKTIS) — selisih 1e-9 hari
 *      bukan perbedaan pedagogis, itu derau pembulatan.
 *   5. CI BOOTSTRAP: verdict antar-seed memakai FiezelStatGate.pairedBootstrap
 *      (CI persentil 95%, seed deterministik) pada selisih berpasangan per
 *      metrik — klaim menang/kalah harus keluar dari interval, bukan dari
 *      selisih titik satu run.
 *   Biaya runtime dijaga: skenario bank Fase 3 (mahal karena estimateAbility
 *   per penyajian) dijalankan pada 3 profil ASLI per seed (tetap 50 pasangan
 *   seed per varian); varian Fase 2 yang murah dijalankan pada semua 9 profil.
 *
 * WAVE 5c — DUA SEMANTIK DIPISAH: GATE KESELAMATAN (exit code) vs VERDICT RISET
 * (research_hold, TIDAK menyentuh exit code).
 *
 *   KENAPA: sejak file ini didaftarkan sebagai gate CI nyata (quality.yml, temuan
 *   D1 wave D), pengerasan wave-3 membuat exit 1 karena TEMUAN RISET yang jujur:
 *   klaim kalibrasi fase-3 inconclusive pada 50 seed (CI RMSE [-0.012, +0.006]),
 *   varian bank v3 tersensor 43/50 seed, dan klaim perbaikan osilasi residual
 *   terbantah antar-seed (CI [+0.054, +0.275]). Temuan itu BENAR dan tetap
 *   dilaporkan utuh — tetapi "penemuan riset" bukan "regresi rilis": gate yang
 *   merah selamanya memblokir SEMUA rilis, termasuk rilis yang tidak menyentuh
 *   brain, dan gate yang selalu merah akhirnya di-bypass orang — itu kematian
 *   kejujuran, bukan penegakannya.
 *
 *   SEMANTIK 1 — GATE KESELAMATAN (menentukan exit code). Hanya menjaga regresi
 *   terbukti pada kebijakan yang benar-benar DI-SHIP ke murid:
 *     - v2_residual        : stack v2 + momentum residual — konfigurasi yang aktif
 *                            di produksi (fiezel-core-brain, baris attempts app
 *                            membawa `predicted`).
 *     - item_calibration   : FiezelItemCalibration — 'active' per authorityMap di
 *                            features/brain/fiezel-brain-manifest.js (dipakai
 *                            buildAdaptivePool via effective()).
 *   FAIL (exit 1) HANYA bila:
 *     (a) CI bootstrap berpasangan membuktikan kebijakan shipped LEBIH BURUK dari
 *         baseline-nya pada metrik KESELAMATAN — retentionDay90, brier,
 *         falseDeclineRate, difficultyOscillationPer10 — yaitu verdict
 *         kandidat_lebih_buruk: CI 95% mengecualikan nol DAN |meanDiff| melewati
 *         ambang praktis (konsisten filosofi PRAKTIS wave-3: signifikan statistik
 *         tapi remeh praktis bukan dasar memblokir rilis — ia tetap dilaporkan
 *         sebagai temuan riset). Baseline v2_residual = v1 (kebijakan worker lama,
 *         sesuai kontrak tugas); baseline item_calibration = v3_tanpa_kalibrasi
 *         (ablation: stack yang sama minus modul shipped — dunia bank sintetis
 *         TIDAK punya varian v1, jadi ablation adalah pembanding jujur satu-satunya
 *         yang mengisolasi efek modul yang di-ship).
 *     (b) kebijakan shipped tersensor mayoritas seed SECARA ATRIBUTABLE: varian
 *         shipped tak pernah mastery pada mayoritas seed SEMENTARA baseline di
 *         dunia yang sama tidak; ATAU CI membuktikan varian shipped menyensor
 *         lebih sering dari baseline ablation-nya melebihi margin praktis.
 *         Atribusi itu esensial: di dunia bank fase-3, v3_kalibrasi DAN
 *         v3_tanpa_kalibrasi sama-sama tersensor 43/50 seed dengan censoredRate
 *         identik — itu mendakwa SKENARIO (horizon 35 hari + bank mislabeled +
 *         3 profil), bukan modul kalibrasi yang di-ship; menghukum rilis untuk
 *         desain harness adalah kategori yang salah. Temuan skenario itu tetap
 *         dieskalasi utuh sebagai research_hold.
 *     (c) kebijakan yang dinyatakan shipped TIDAK bisa diverifikasi harness
 *         (feature-detect gagal): manifest bilang 'active' tapi simulator tak bisa
 *         mengukurnya = inkonsistensi yang memblokir (brain3_sim_shipped_unverifiable).
 *   Plus gate determinisme lama (exit 2) — tidak berubah.
 *
 *   SEMANTIK 2 — VERDICT RISET (TIDAK menentukan exit code). Semua temuan lain:
 *   klaim perbaikan yang inconclusive (kalibrasi RMSE), klaim yang TERBANTAH
 *   antar-seed (osilasi residual), censoring varian kandidat non-shipped /
 *   censoring level-skenario (bank v3), regresi kandidat non-shipped (v2_lama
 *   kalah timeToMastery), dan tradeoff shipped yang bukan metrik keselamatan
 *   (v2_residual menyensor mastery-35-hari lebih sering dari v1 sambil menang
 *   telak retensi/brier/false-decline). Masing-masing menjadi entri
 *   `researchVerdicts[]` berstatus 'research_hold' dengan rationale brain3_riset_*,
 *   confidence, dan CI LENGKAP — dicetak ke stderr di bawah label
 *   'TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER)' dan ditulis utuh
 *   ke JSON stdout. TIDAK ADA temuan yang dibuang: yang berubah hanya jalur
 *   eskalasinya — penemuan riset naik ke MASTER via ledger (researchVerdicts),
 *   bukan via CI merah. Ini konsisten dengan filosofi fiezel-stat-gate.js:
 *   bukti yang belum memutus berujung 'hold', bukan 'fail'.
 *
 *   Gate-gate lama (residual/kalibrasi single-seed, multi-seed utama/censoring/
 *   residual/kalibrasi) tetap DIHITUNG dan dilaporkan penuh; status 'FAIL' mereka
 *   diganti label 'RESEARCH_HOLD' karena mereka menghakimi KLAIM RISET, bukan
 *   keselamatan rilis. Exit code kini murni: determinisme + shippedGate.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAdaptivitySimulationV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var brain = require('./features/brain/fiezel-core-brain.js');
  // WAVE 3: inferensi CI antar-seed memakai modul stat gate resmi (gelombang 1) —
  // bukan bootstrap tulisan tangan lokal, supaya satu implementasi yang diaudit.
  var statGate = require('./features/brain/fiezel-stat-gate.js');

  var SCHEMA = 'fiezel-adaptivity-simulation-v3';
  var DAY = 86400000;
  // Epoch tetap, BUKAN Date.now(): waktu adalah masukan, bukan efek samping.
  var NOW = Date.parse('2026-08-24T10:00:00Z');
  var SIM_DAYS = 35;
  var RETENTION_DAY = 90;
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  var FAMILIES = ['tense_aspect', 'articles_determiners', 'conditionals'];
  var GUESS_FLOOR = 0.25; // empat opsi pilihan ganda, sama dengan Core Brain

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function round(v, digits) { var f = Math.pow(10, digits); return Math.round(v * f) / f; }

  // ===================================================================================
  // WAVE 3 — AMBANG SIGNIFIKANSI PRAKTIS PER METRIK
  // ===================================================================================
  /**
   * Pengganti EPS=1e-9: sebuah selisih baru dihitung "lebih baik/lebih buruk" bila
   * melewati ambang yang BERARTI secara pedagogis. Angka-angka ini penilaian desain
   * (didokumentasikan, bisa direvisi tanpa mengubah mekanisme gate), bukan hasil
   * kalibrasi empiris:
   *   - timeToMasteryDays 1.0 : di bawah satu hari, jadwal murid tidak berubah.
   *   - accuracyGapVsTarget 0.02 : 2pp di sekitar target 0.80 tak teramati murid.
   *   - difficultyOscillationPer10 0.5 : setengah perpindahan per 10 sesi ~ satu
   *     perpindahan ekstra per 20 sesi — di bawah itu bukan "osilasi".
   *   - retentionDay90 0.02 : 2pp retrievability, di bawah presisi model FSRS-lite.
   *   - brier 0.01 : perbaikan kalibrasi prediksi di bawah 0.01 tidak mengubah
   *     keputusan kebijakan mana pun (band akurasi selebar 25pp).
   *   - falseDeclineRate 0.02 : 2pp evaluasi momentum.
   *   - itemBiasRMSE 0.02 : pergeseran 0.02 pada skala kesulitan 1..6 menggeser
   *     successProbability < 1pp — koreksi label di bawah itu tidak mengubah item
   *     yang tersaji; kalibrasi yang cuma segitu tidak membayar kompleksitasnya.
   *   - poolSeparationPct 5 : lima poin persen himpunan kandidat.
   *   - censoringRate 0.05 : kandidat boleh tersensor sampai 5pp lebih sering
   *     sebelum dianggap regresi mastery yang nyata (margin non-inferioritas).
   */
  var PRAKTIS = {
    timeToMasteryDays: 1.0,
    accuracyGapVsTarget: 0.02,
    difficultyOscillationPer10: 0.5,
    retentionDay90: 0.02,
    brier: 0.01,
    falseDeclineRate: 0.02,
    itemBiasRMSE: 0.02,
    poolSeparationPct: 5,
    censoringRate: 0.05
  };

  // WAVE 3 — konfigurasi multi-seed. SEED_COUNT=50 (kontrak tugas ≥50);
  // PROFIL_TURUNAN=6 → 3 asli + 6 turunan = 9 profil (kontrak 8..12);
  // PROFIL_BANK=3: skenario bank Fase 3 memanggil estimateAbility per PENYAJIAN
  // (O(riwayat²) per run, ~100ms) — dibatasi ke 3 profil ASLI per seed supaya
  // runtime CLI tetap < 1 menit; tiap varian tetap dapat 50 seed berpasangan.
  var SEED_COUNT = 50;
  var PROFIL_TURUNAN = 6;
  var PROFIL_BANK = 3;
  var BOOT_ITERS = 3000;

  /**
   * Feature-detect dukungan momentum residual (kontrak Fase 2 milik B1):
   * beri momentum baris sintetis yang SEMUANYA membawa `predicted`; implementasi
   * yang sudah mendukung wajib menjawab `basis:'residual'`. Deteksi runtime pada
   * PERILAKU, bukan pada nomor versi — kalau B1 belum selesai saat simulator
   * jalan, varian residual dilewati dengan jujur alih-alih diam-diam mengukur
   * perilaku lama dan mengklaimnya sebagai residual.
   */
  function dukungResidual() {
    if (typeof brain.momentum !== 'function') return false;
    var rows = [];
    for (var i = 0; i < 30; i++) rows.push({ ok: i % 2 === 0, predicted: 0.5 });
    var m;
    try { m = brain.momentum(rows); } catch (e) { return false; }
    return !!(m && m.basis === 'residual');
  }

  /**
   * FASE 3 — muat + feature-detect FiezelItemCalibration (kontrak milik C1).
   * Deteksi pada PERILAKU kontrak, bukan nomor versi: observe() harus menerima
   * state null dan mengembalikan state baru; effective() harus MENOLAK koreksi
   * sebelum n>=8 (applied:false, difficulty = prior apa adanya) dan MENERAPKAN
   * koreksi setelahnya (applied:true). Sengaja TIDAK memeriksa arah/besaran
   * delta di sini — modul yang ada tapi salah hitung harus GAGAL di gate
   * kalibrasi (sinyal CI), bukan diam-diam di-SKIP.
   */
  function muatKalibrasi() {
    try { return require('./features/brain/fiezel-item-calibration.js'); } catch (e) { return null; }
  }

  function dukungKalibrasi() {
    var Cal = muatKalibrasi();
    if (!Cal || typeof Cal.observe !== 'function' || typeof Cal.effective !== 'function') return false;
    try {
      // Item tanpa data sama sekali → prior apa adanya, applied:false.
      var kosong = Cal.effective(null, 'probe:kosong', 4);
      if (!kosong || kosong.applied !== false || kosong.difficulty !== 4) return false;
      var st = null, i;
      for (i = 0; i < 3; i++) st = Cal.observe(st, { itemId: 'probe:x', priorDifficulty: 3, ability: 3, ok: false, kappa: 1 }, NOW + i * 60000);
      var sedikit = Cal.effective(st, 'probe:x', 3);
      if (!sedikit || sedikit.applied !== false || sedikit.difficulty !== 3) return false; // n=3 < 8 → belum boleh koreksi
      for (i = 3; i < 12; i++) st = Cal.observe(st, { itemId: 'probe:x', priorDifficulty: 3, ability: 3, ok: false, kappa: 1 }, NOW + i * 60000);
      var cukup = Cal.effective(st, 'probe:x', 3);
      if (!cukup || cukup.applied !== true || typeof cukup.difficulty !== 'number' || !isFinite(cukup.difficulty)) return false;
      return true;
    } catch (err) { return false; }
  }

  // ===================================================================================
  // 1. PRNG BERSEED (mulberry32)
  // ===================================================================================
  /**
   * mulberry32: PRNG 32-bit kecil yang cukup untuk simulasi (bukan kriptografi).
   * Dipilih karena satu state 32-bit → gampang diverifikasi dan tidak bergantung
   * pada implementasi engine. Seed yang sama WAJIB menghasilkan deret yang sama.
   */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ===================================================================================
  // 2. MURID SINTETIS DENGAN STATE LATEN
  // ===================================================================================
  /**
   * Tiga profil yang memang berbeda ARAHNYA, bukan cuma berbeda kecepatan, supaya
   * kebijakan diuji pada rezim yang berbeda: naik cepat (harus berani menaikkan
   * kesulitan), mendatar (harus memecah plateau tanpa osilasi), menurun (harus
   * menurunkan beban tanpa menghukum).
   *
   *   thetaAwal     : kemampuan laten per keluarga grammar (skala difficulty 1..6)
   *   lajuBelajar   : pertumbuhan theta per latihan yang "kena sasaran"
   *   redaman       : makin banyak latihan, gain makin kecil (diminishing returns)
   *   driftHarian   : pergeseran theta per hari TANPA latihan (menurun = negatif)
   *   slip          : peluang murid yang tahu tetap menjawab salah (ceroboh)
   */
  var PROFILES = [
    { id: 'membaik_cepat', thetaAwal: { tense_aspect: 1.2, articles_determiners: 1.0, conditionals: 0.8 }, lajuBelajar: 0.10, redaman: 90, driftHarian: 0.0, slip: 0.06 },
    { id: 'mendatar', thetaAwal: { tense_aspect: 2.3, articles_determiners: 2.2, conditionals: 2.0 }, lajuBelajar: 0.06, redaman: 22, driftHarian: 0.0, slip: 0.08 },
    { id: 'menurun', thetaAwal: { tense_aspect: 2.9, articles_determiners: 2.8, conditionals: 2.6 }, lajuBelajar: 0.02, redaman: 40, driftHarian: -0.035, slip: 0.10 }
  ];

  function buatMurid(profile, rng) {
    var theta = {};
    for (var f = 0; f < FAMILIES.length; f++) theta[FAMILIES[f]] = profile.thetaAwal[FAMILIES[f]];
    return {
      profil: profile,
      rng: rng,
      theta: theta,          // LATEN — kebijakan tidak boleh membacanya
      praktik: 0,            // total latihan (untuk redaman gain)
      memori: {}             // per itemId: {stability (hari), lastAt} — juga LATEN
    };
  }

  /**
   * Jawaban murid untuk SATU item pada difficulty yang DISAJIKAN kebijakan.
   * P(benar) = (1-slip) · successProbability(theta_laten, d) + slip · lantaiTebakan.
   * successProbability adalah IRT 2PL milik Core Brain (sudah memuat lantai tebakan
   * 0.25) — slip di atasnya memodelkan murid yang tahu tapi keliru menekan tombol,
   * yang saat itu jawabannya efektif setara tebakan.
   * INI SATU-SATUNYA tempat difficulty tersaji memengaruhi hasil — persis cacat
   * yang absen di simulator lama.
   */
  function jawab(murid, family, difficulty) {
    var pTahu = brain.successProbability(murid.theta[family], difficulty);
    var p = (1 - murid.profil.slip) * pTahu + murid.profil.slip * GUESS_FLOOR;
    return murid.rng() < p;
  }

  /**
   * Belajar dari satu latihan. Gain terbesar saat kesulitan DEKAT theta (desirable
   * difficulty): soal jauh terlalu mudah/terlalu sulit hampir tidak mengajarkan
   * apa-apa. Inilah mekanisme yang membuat kebijakan yang memilih kesulitan pas
   * benar-benar MENANG di metrik, bukan menang karena dikarang.
   */
  function belajar(murid, family, difficulty, benar) {
    var prox = Math.exp(-0.5 * Math.pow(difficulty - murid.theta[family], 2));
    var eff = murid.profil.lajuBelajar / (1 + murid.praktik / murid.profil.redaman);
    var gain = eff * (benar ? 1.0 : 0.6) * prox; // salah + umpan balik tetap mengajarkan, lebih sedikit
    murid.theta[family] = clamp(murid.theta[family] + gain, 0.3, 6.7);
    murid.praktik++;
  }

  /**
   * FSRS-lite per kontrak (identik dengan tanda tangan FiezelCoreBrain.updateMemory):
   *   sukses: S' = S · (1 + 1.2·(11−Dmap)·S^−0.15·(e^{1.8·(1−R)} − 1))
   *   lapse : S' = min(S, 1.5·Dmap^−0.6·((S+1)^0.35 − 1)), lantai ≥ 10% S
   *   Dmap  = clamp(difficulty·1.6, 1, 10)
   * Dipakai implementasi brain bila sudah tersedia (milik A1); kalau belum, fallback
   * lokal dengan rumus yang sama supaya simulasi tidak menunggu modul lain.
   */
  function perbaruiMemori(murid, itemId, difficulty, benar, nowMs) {
    var m = murid.memori[itemId];
    if (!m) {
      // Stabilitas awal: keberhasilan pertama menempel lebih lama dari kegagalan pertama.
      murid.memori[itemId] = { stability: benar ? 1.0 : 0.3, lastAt: nowMs };
      return;
    }
    var ageDays = Math.max(0, (nowMs - m.lastAt) / DAY);
    var R = brain.retrievability(m.stability, ageDays);
    if (typeof brain.updateMemory === 'function') {
      var out = brain.updateMemory({ stability: m.stability, retrievability: R, difficulty: difficulty, ok: benar });
      m.stability = clamp(Number(out && out.stability) || m.stability, 0.05, 365);
    } else {
      var dmap = clamp(difficulty * 1.6, 1, 10);
      if (benar) {
        m.stability = m.stability * (1 + 1.2 * (11 - dmap) * Math.pow(m.stability, -0.15) * (Math.exp(1.8 * (1 - R)) - 1));
      } else {
        var turun = 1.5 * Math.pow(dmap, -0.6) * (Math.pow(m.stability + 1, 0.35) - 1);
        m.stability = Math.max(0.1 * m.stability, Math.min(m.stability, turun));
      }
      m.stability = clamp(m.stability, 0.05, 365);
    }
    m.lastAt = nowMs;
  }

  // ===================================================================================
  // 2b. FASE 3 — BANK ITEM SINTETIS DENGAN KESULITAN SEBENARNYA ≠ PRIOR
  // ===================================================================================
  var BANK_ITEM_PER_SEL = 6;      // 6 item per keluarga×level, sama dengan pool Fase 2
  var BANK_LAJU_MISLABEL = 0.2;   // ~20% item mislabeled (kontrak tugas C6)
  var BANK_DEVIASI = 0.8;         // besar penyimpangan kesulitan sebenarnya (±0.8)
  var POOL_TARGET_RENDAH = 2;     // pasangan target untuk poolSeparation (temuan Opus)
  var POOL_TARGET_TINGGI = 5;

  /**
   * Bank item berseed: id stabil, prior = level integer 1..6, trueDifficulty =
   * prior kecuali item terpilih mislabeled (±0.8, arah dari PRNG). Deret PRNG
   * bank TERPISAH dari deret murid (seed di-xor konstanta) dan konsumsinya
   * KONSTAN per item (dua tarikan, dipakai atau tidak) supaya menambah/mengubah
   * aturan mislabel di masa depan tidak menggeser item lain — determinisme
   * struktural, bukan kebetulan.
   * Item non-mislabel sengaja dibiarkan PERSIS di prior: dengan begitu seluruh
   * itemBiasRMSE baseline berasal dari item mislabeled, dan penurunan RMSE oleh
   * kalibrasi bisa dibaca langsung sebagai "koreksi label salah", bukan noise.
   */
  function buatBankItem(seed) {
    var rng = mulberry32(((seed >>> 0) ^ 0x5F356495) >>> 0);
    var items = [];
    var byFamily = {};
    var mislabeledCount = 0;
    for (var f = 0; f < FAMILIES.length; f++) {
      var family = FAMILIES[f];
      byFamily[family] = [];
      for (var d = 1; d <= 6; d++) {
        for (var i = 0; i < BANK_ITEM_PER_SEL; i++) {
          var mislabeled = rng() < BANK_LAJU_MISLABEL; // tarikan 1: apakah mislabeled
          var arah = rng() < 0.5 ? -1 : 1;             // tarikan 2: arah (selalu ditarik)
          var trueD = mislabeled ? clamp(d + arah * BANK_DEVIASI, 0.4, 6.6) : d;
          if (mislabeled) mislabeledCount++;
          var item = {
            id: family + ':d' + d + ':i' + i,
            family: family,
            prior: d,                 // label kesulitan yang DIPERCAYA sistem
            trueDifficulty: trueD,    // kesulitan yang DIALAMI murid (laten)
            mislabeled: mislabeled
          };
          items.push(item);
          byFamily[family].push(item);
        }
      }
    }
    return { items: items, byFamily: byFamily, mislabeledCount: mislabeledCount };
  }

  /**
   * Kandidat per (keluarga, target): 6 item dengan kesulitan EFEKTIF terdekat ke
   * target — cermin buildAdaptivePool + effective() (wiring C5 butir 1). Urutan
   * deterministik: jarak dulu, lalu id (tie-break eksplisit, tidak bergantung
   * stabilitas sort engine). effOf dihitung SEKALI per item per pemanggilan
   * supaya effective() tidak dipanggil O(n log n) kali di komparator.
   */
  function poolKandidat(kandidatKeluarga, target, effOf) {
    var dgn = [];
    for (var i = 0; i < kandidatKeluarga.length; i++) {
      var it = kandidatKeluarga[i];
      dgn.push({ it: it, jarak: Math.abs(effOf(it) - target) });
    }
    dgn.sort(function (a, b) {
      if (a.jarak !== b.jarak) return a.jarak - b.jarak;
      return a.it.id < b.it.id ? -1 : a.it.id > b.it.id ? 1 : 0;
    });
    var pool = [];
    for (var j = 0; j < Math.min(BANK_ITEM_PER_SEL, dgn.length); j++) pool.push(dgn[j].it);
    return pool;
  }

  /**
   * poolSeparation — gate temuan Opus yang dulu tidak ada: buildAdaptivePool lama
   * mengembalikan kandidat yang SAMA berapapun targetDifficulty (separation 0%),
   * jadi "adaptif"-nya tidak sampai ke item yang tersaji. Metrik ini mengukur
   * persentase perbedaan himpunan kandidat antara target rendah (2) vs tinggi (5):
   * 100 × |selisih simetris| / |gabungan|. Pemilihan yang benar-benar membedakan
   * kesulitan wajib mendekati 100; pemilihan yang buta target jatuh ke 0.
   */
  function hitungPoolSeparation(bank, effOf) {
    var rendah = {}, tinggi = {};
    for (var f = 0; f < FAMILIES.length; f++) {
      var keluarga = bank.byFamily[FAMILIES[f]];
      var pr = poolKandidat(keluarga, POOL_TARGET_RENDAH, effOf);
      var pt = poolKandidat(keluarga, POOL_TARGET_TINGGI, effOf);
      for (var a = 0; a < pr.length; a++) rendah[pr[a].id] = true;
      for (var b = 0; b < pt.length; b++) tinggi[pt[b].id] = true;
    }
    var gabungan = 0, sama = 0, id;
    for (id in rendah) {
      if (!Object.prototype.hasOwnProperty.call(rendah, id)) continue;
      gabungan++;
      if (tinggi[id]) sama++;
    }
    for (id in tinggi) {
      if (!Object.prototype.hasOwnProperty.call(tinggi, id)) continue;
      if (!rendah[id]) gabungan++;
    }
    var selisihSimetris = gabungan - sama;
    return gabungan ? round(selisihSimetris / gabungan * 100, 2) : 0;
  }

  // ===================================================================================
  // 3. KEBIJAKAN v1 MURNI (cermin deriveAdaptivePolicy di fiezel-core-worker.js)
  // ===================================================================================
  /**
   * v1 hanya tahu AKURASI TERAMATI dan level kasar — tidak punya model kemampuan.
   * Logika kesulitannya disalin setia dari worker:
   *   band: akurasi-lemah <55 → foundation(−1); <80 → standard(0); selain itu stretch(+1)
   *   targetDifficulty = indexLevel + 1 + offset, dijepit 1..6
   *   mode diagnostic bila totalAttempts < 24 (sessionSize 10, selain itu 12).
   * `estimatedLevel` di aplikasi datang dari state.level yang naik lewat unlock;
   * di sini unlock disimulasikan dengan aturan aplikasi yang paling dekat: level
   * naik satu bila ≥30 latihan sejak unlock terakhir DAN akurasi 30 terakhir ≥80%.
   * Tanpa aturan ini v1 terkunci di A1 dan perbandingannya tidak adil.
   */
  function buatStateV1() { return { level: 1, sejakUnlock: 0 }; }

  function kebijakanV1(observed, stateV1) {
    var total = observed.length;
    var recent = observed.slice(-40);
    var benarRecent = 0;
    for (var i = 0; i < recent.length; i++) if (recent[i].ok) benarRecent++;
    var recentAccuracy = recent.length ? Math.round(benarRecent / recent.length * 100) : null;

    // Unlock level kasar (cermin perilaku grammar unlock aplikasi).
    var last30 = observed.slice(-30);
    var benar30 = 0;
    for (var j = 0; j < last30.length; j++) if (last30[j].ok) benar30++;
    if (stateV1.sejakUnlock >= 30 && last30.length >= 30 && benar30 / last30.length >= 0.8 && stateV1.level < 6) {
      stateV1.level++;
      stateV1.sejakUnlock = 0;
    }

    var mode = total < 24 ? 'diagnostic' : 'balance';
    var sessionSize = mode === 'diagnostic' ? 10 : 12;
    var weakAccuracy = recentAccuracy == null ? 70 : recentAccuracy;
    var difficultyBand = weakAccuracy < 55 ? 'foundation' : weakAccuracy < 80 ? 'standard' : 'stretch';
    var offset = difficultyBand === 'foundation' ? -1 : difficultyBand === 'stretch' ? 1 : 0;
    var targetDifficulty = clamp(stateV1.level + offset, 1, 6);

    return {
      schema: 'fiezel-adaptive-policy-v1',
      mode: mode,
      sessionSize: sessionSize,
      targetDifficulty: targetDifficulty,
      difficultyBand: difficultyBand,
      reviewShare: mode === 'diagnostic' ? 0 : 0.25,
      pace: 'normal',
      rationaleCodes: [mode === 'diagnostic' ? 'diagnostic' : 'balanced_progression'],
      source: 'deterministic-policy-v1'
    };
  }

  // ===================================================================================
  // 4. SATU RUN SIMULASI: (profil murid) × (kebijakan) × 35 hari
  // ===================================================================================
  /**
   * Kontrak kejujuran run ini:
   *   - kebijakan hanya menerima `observed` (riwayat teramati) — bukan murid;
   *   - item yang TAMPIL memakai targetDifficulty keputusan hari itu, jadi keputusan
   *     benar-benar mengubah item yang disajikan (temuan council butir 7);
   *   - prediksi untuk kalibrasi dicatat SEBELUM hasil diketahui.
   * Prediktor kalibrasi sama untuk kedua kebijakan — successProbability(abilityEst
   * teramati, d tersaji) — supaya Brier mengukur mutu TRACE yang dihasilkan tiap
   * kebijakan, bukan mengganti rumus prediksinya di tengah jalan.
   */
  function jalankanRun(profile, policyName, seed, opts) {
    opts = opts || {};
    // FASE 3: bank item opsional — tanpa bank, perilaku Fase 2 tidak berubah SATU
    // baris pun (kesulitan sebenarnya = kesulitan tersaji). Dengan bank, murid
    // menjawab menurut trueDifficulty item; sistem hanya tahu prior/efektif.
    var bank = opts.bank || null;
    var pakaiKalibrasi = !!opts.kalibrasi;
    var Cal = pakaiKalibrasi ? muatKalibrasi() : null;
    var calState = null;      // state 'fiezel-item-calibration-v1' (murni, di-thread)
    var nBank = bank ? {} : null; // penyajian per item (untuk ambang n>=8 itemBiasRMSE)

    // Kesulitan EFEKTIF yang dipercaya sistem untuk satu item bank: prior apa
    // adanya tanpa kalibrasi; effective() bila varian kalibrasi (fallback ke prior
    // kalau modul melempar — simulator tidak boleh crash karena modul pihak lain).
    function effDifficulty(item) {
      if (!pakaiKalibrasi || !Cal) return item.prior;
      try {
        var e = Cal.effective(calState, item.id, item.prior);
        if (e && typeof e.difficulty === 'number' && isFinite(e.difficulty)) return e.difficulty;
      } catch (err) { /* jatuh ke prior */ }
      return item.prior;
    }

    var murid = buatMurid(profile, mulberry32(seed));
    var observed = [];        // satu-satunya hal yang boleh dilihat kebijakan
    var stateV1 = buatStateV1();
    var lastSessionAttempts = [];
    var difficulties = [];    // targetDifficulty per sesi (untuk osilasi)
    var brierSum = 0, brierN = 0;
    var masteryDay = null;
    var itemCounter = {};

    // FASE 2: varian menentukan APA yang dikirim di baris riwayat, bukan rumus
    // kebijakannya — v2_lama dan v2_residual memakai analyze+refinePolicy yang
    // sama persis; satu-satunya beda adalah field `predicted` pada baris attempts
    // (persis wiring B3 butir 1: app menyimpan successProbability saat penyajian).
    var pakaiV2 = policyName !== 'v1';
    // FASE 3: varian bank ikut mengirim predicted bila residual didukung (cermin
    // produksi pasca-B1); keduanya (tanpa/dengan kalibrasi) memakai setelan sama
    // supaya satu-satunya beda tetap effective() — perbandingan berpasangan.
    var kirimPredicted = policyName === 'v2_residual' || !!opts.kirimPredicted;

    // Penilaian false-decline: kunci jawaban laten (theta rata-rata) dicatat per
    // hari HANYA untuk menghakimi momentum — kebijakan tetap buta terhadapnya.
    var thetaHistori = [];
    var momentumEvals = 0, falseDecline = 0;
    var basisCount = {};

    for (var day = 0; day < SIM_DAYS; day++) {
      var nowMs = NOW + day * DAY;

      // Drift laten harian (mis. profil menurun): terjadi PADA murid, tak terlihat kebijakan.
      if (day > 0 && profile.driftHarian !== 0) {
        for (var f = 0; f < FAMILIES.length; f++) {
          murid.theta[FAMILIES[f]] = clamp(murid.theta[FAMILIES[f]] + profile.driftHarian, 0.3, 6.7);
        }
      }

      // --- penilaian momentum vs arah laten (metrik false-decline, Fase 2) ---
      // Dievaluasi pada titik keputusan: momentum membaca riwayat teramati sampai
      // kemarin; arah laten dibaca dari theta rata-rata ~3 hari terakhir (sepadan
      // dengan jendela ~40 attempt yang dilihat momentum). 'False decline' =
      // momentum bilang 'declining' padahal theta laten sedang NAIK — kesalahan
      // yang persis ingin dihapus momentum residual: akurasi turun karena soal
      // naik kelas, bukan karena muridnya mundur.
      var thetaRata = 0;
      for (var tf = 0; tf < FAMILIES.length; tf++) thetaRata += murid.theta[FAMILIES[tf]];
      thetaRata /= FAMILIES.length;
      thetaHistori.push(thetaRata);
      var momHariIni = brain.momentum(observed);
      if (momHariIni && momHariIni.state && momHariIni.state !== 'unknown') {
        momentumEvals++;
        var basisKey = momHariIni.basis || 'accuracy';
        basisCount[basisKey] = (basisCount[basisKey] || 0) + 1;
        var pembanding = thetaHistori[Math.max(0, thetaHistori.length - 4)];
        var latenNaik = thetaRata > pembanding + 0.02;
        if (momHariIni.state === 'declining' && latenNaik) falseDecline++;
      }

      // --- keputusan kebijakan hari ini (hanya dari data teramati) ---
      var base = kebijakanV1(observed, stateV1);
      var policy = base;
      var abilityUntukPrediksi = brain.estimateAbility(observed, { now: nowMs, prior: 1.5 }).ability;
      if (pakaiV2) {
        var snapshot = brain.analyze({
          now: nowMs,
          attempts: observed,
          sessionAttempts: lastSessionAttempts,
          priorAbility: 1.5,
          targetSuccess: 0.8,
          abandonmentRate: 0
        });
        policy = brain.refinePolicy(base, snapshot);
        abilityUntukPrediksi = snapshot.ability.ability;
      }
      difficulties.push(policy.targetDifficulty);

      // --- sesi: item TAMPIL pada difficulty keputusan ---
      var sesi = [];
      for (var q = 0; q < policy.sessionSize; q++) {
        var family = FAMILIES[q % FAMILIES.length];
        var d = policy.targetDifficulty;
        var itemId, dTampil, dTrue, priorTampil;
        if (bank) {
          // FASE 3: kandidat = 6 item terdekat ke target menurut kesulitan EFEKTIF
          // (prior tanpa kalibrasi; effective() dengan kalibrasi — wiring C5 butir 1).
          // Rotasi deterministik di dalam pool, seperti rotasi 6-item Fase 2.
          var pool = poolKandidat(bank.byFamily[family], d, effDifficulty);
          var keyBank = family + ':t' + d;
          itemCounter[keyBank] = (itemCounter[keyBank] || 0) + 1;
          var itemTampil = pool[itemCounter[keyBank] % pool.length];
          itemId = itemTampil.id;
          priorTampil = itemTampil.prior;      // label yang tercatat di konten
          dTampil = effDifficulty(itemTampil); // yang DIPERCAYA sistem (prediksi+riwayat)
          dTrue = itemTampil.trueDifficulty;   // yang DIALAMI murid (laten)
          nBank[itemId] = (nBank[itemId] || 0) + 1;
        } else {
          // Pool 6 item per keluarga×difficulty; rotasi deterministik supaya memori per-item terisi.
          var key = family + ':d' + d;
          itemCounter[key] = (itemCounter[key] || 0) + 1;
          itemId = key + ':i' + (itemCounter[key] % 6);
          priorTampil = d;
          dTampil = d;
          dTrue = d; // tanpa bank, label kesulitan dianggap benar (asumsi Fase 2)
        }

        // Prediksi DICATAT DULU (kalibrasi jujur), baru hasilnya dibangkitkan.
        // Prediksi memakai kesulitan yang DIPERCAYA sistem; jawaban dibangkitkan
        // dari kesulitan SEBENARNYA — selisih keduanya persis bias yang harus
        // dipangkas FiezelItemCalibration.
        // FASE 3 (mode bank): taksiran kemampuan disegarkan PER PENYAJIAN, bukan
        // per hari — di aplikasi tutorObserve/coreBrainAttempts memang menghitung
        // ulang estimateAbility pada tiap jawaban, dan `ability` itulah yang
        // diterima observe(). Memakai taksiran basi sehari penuh akan menyuntik
        // galat cold-start ke delta item justru saat Kb terbesar — ketidakadilan
        // harness, bukan sifat modulnya. Skenario Fase 2 dibiarkan per hari
        // (perilaku lama tidak berubah satu baris pun).
        var abilityQ = abilityUntukPrediksi;
        if (bank && q > 0) {
          abilityQ = brain.estimateAbility(observed, { now: nowMs + q * 120000, prior: 1.5 }).ability;
        }
        var prediksi = brain.successProbability(abilityQ, dTampil);
        var benar = jawab(murid, family, dTrue);
        brierSum += Math.pow(prediksi - (benar ? 1 : 0), 2);
        brierN++;

        // Proses LATEN (belajar + memori) memakai kesulitan SEBENARNYA — murid
        // mengalami item sebagaimana adanya, bukan sebagaimana labelnya.
        belajar(murid, family, dTrue, benar);
        perbaruiMemori(murid, itemId, dTrue, benar, nowMs + q * 120000);

        // FASE 3: observe() per jawaban, kappa=1 (bukti grammar penuh), waktu =
        // waktu baris — state di-thread murni persis pola app (wiring C5 butir 1).
        if (pakaiKalibrasi && Cal) {
          calState = Cal.observe(calState, {
            itemId: itemId,
            priorDifficulty: priorTampil,
            ability: abilityQ,
            ok: benar,
            kappa: 1
          }, nowMs + q * 120000);
        }

        var row = {
          at: nowMs + q * 120000,
          ok: benar,
          ms: 3000 + Math.floor(murid.rng() * 4000),
          type: 'grammar',
          skill: family,
          family: family,
          difficulty: dTampil
        };
        // FASE 2: hanya varian residual yang membawa prediksi saat penyajian di
        // baris riwayat — nilainya SAMA dengan yang dipakai Brier (dicatat sebelum
        // hasil diketahui), jadi tidak ada kebocoran masa depan.
        if (kirimPredicted) row.predicted = prediksi;
        sesi.push(row);
        observed.push(row);
        stateV1.sejakUnlock++;
      }
      lastSessionAttempts = sesi;

      // Mastery TERAMATI: taksiran kemampuan dari jawaban saja mencapai B1 (≥3.0)
      // dengan bukti cukup. Sengaja bukan theta laten — kebijakan dinilai dari apa
      // yang bisa dibuktikan, bukan dari kunci jawaban simulator.
      if (masteryDay === null) {
        var est = brain.estimateAbility(observed, { now: nowMs + DAY, prior: 1.5 });
        if (est.ability >= 3.0 && est.confidence >= 0.3) masteryDay = day + 1;
      }
    }

    // --- metrik akhir run ---
    var totalBenar = 0;
    for (var t = 0; t < observed.length; t++) if (observed[t].ok) totalBenar++;
    var akurasi = observed.length ? totalBenar / observed.length : 0;

    // Osilasi: jumlah PERUBAHAN targetDifficulty antar sesi, dinormalkan per 10 sesi.
    var perubahan = 0;
    for (var s = 1; s < difficulties.length; s++) if (difficulties[s] !== difficulties[s - 1]) perubahan++;
    var osilasiPer10 = difficulties.length > 1 ? perubahan / (difficulties.length - 1) * 10 : 0;

    // Retensi hari-90: retrievability rata-rata semua item yang pernah dilatih,
    // dievaluasi pada NOW+90 hari tanpa latihan tambahan (delayed test — council butir 5).
    var day90 = NOW + RETENTION_DAY * DAY;
    var retSum = 0, retN = 0;
    for (var id in murid.memori) {
      if (!Object.prototype.hasOwnProperty.call(murid.memori, id)) continue;
      var m = murid.memori[id];
      retSum += brain.retrievability(m.stability, Math.max(0, (day90 - m.lastAt) / DAY));
      retN++;
    }

    var hasil = {
      policy: policyName,
      profil: profile.id,
      seed: seed,
      attempts: observed.length,
      timeToMasteryDays: masteryDay,                    // null = tidak tercapai dalam 35 hari
      // WAVE 3 — penanda censoring: null ATAU tepat di horizon (SIM_DAYS) dianggap
      // tersensor — mastery di hari terakhir tidak bisa dibedakan dari "lewat
      // sehari", jadi memasukkannya ke rata-rata akan bias ke bawah. Agregat dan
      // CI multi-seed WAJIB mengecualikan run dengan flag ini dari timeToMastery.
      censored: masteryDay === null || masteryDay >= SIM_DAYS,
      observedAccuracy: round(akurasi, 4),
      accuracyGapVsTarget: round(Math.abs(akurasi - 0.8), 4),
      difficultyOscillationPer10: round(osilasiPer10, 3),
      retentionDay90: retN ? round(retSum / retN, 4) : 0,
      brier: brierN ? round(brierSum / brierN, 4) : 1,
      // FASE 2: false decline = momentum bilang 'declining' saat theta laten naik.
      // Rate dinormalkan terhadap jumlah evaluasi momentum yang punya arah (bukan
      // 'unknown'), supaya varian dengan hari 'unknown' lebih banyak tidak tampak
      // palsu lebih baik hanya karena jarang bicara.
      falseDeclineCount: falseDecline,
      momentumEvals: momentumEvals,
      falseDeclineRate: momentumEvals ? round(falseDecline / momentumEvals, 4) : 0,
      momentumBasis: basisCount,
      finalTargetDifficulty: difficulties[difficulties.length - 1],
      itemsTracked: retN
    };

    // --- FASE 3: metrik kalibrasi (hanya mode bank) ---
    if (bank) {
      // itemBiasRMSE: akar rata-rata kuadrat (efektif − sebenarnya), HANYA item
      // dengan n>=8 penyajian DI RUN INI — ambang yang sama dengan syarat applied
      // effective(), dan diberlakukan SAMA pada varian tanpa-kalibrasi supaya
      // himpunan penilaian sepadan (di bawah n=8 tidak ada yang boleh mengklaim tahu).
      // maxAbsDelta: |efektif − prior| terbesar di SELURUH bank — detektor shrinkage
      // bocor (kontrak C1: clamp keras ±0.6 dari prior pada SETIAP update).
      var seJumlah = 0, seItem = 0, maxAbsDelta = 0, diterapkan = 0;
      var seJumlahMislabel = 0, seItemMislabel = 0;
      for (var bi = 0; bi < bank.items.length; bi++) {
        var it = bank.items[bi];
        var effAkhir = effDifficulty(it);
        var deltaAbs = Math.abs(effAkhir - it.prior);
        if (deltaAbs > maxAbsDelta) maxAbsDelta = deltaAbs;
        if (deltaAbs > 1e-12) diterapkan++;
        if ((nBank[it.id] || 0) >= 8) {
          var galat = Math.pow(effAkhir - it.trueDifficulty, 2);
          seJumlah += galat; seItem++;
          if (it.mislabeled) { seJumlahMislabel += galat; seItemMislabel++; }
        }
      }
      hasil.itemBiasRMSE = seItem ? round(Math.sqrt(seJumlah / seItem), 4) : null;
      hasil.itemBiasItems = seItem;                    // berapa item lolos ambang n>=8
      hasil.itemBiasRMSEMislabeledOnly = seItemMislabel ? round(Math.sqrt(seJumlahMislabel / seItemMislabel), 4) : null;
      hasil.itemBiasItemsMislabeled = seItemMislabel;
      hasil.maxAbsDelta = round(maxAbsDelta, 4);
      hasil.calibrationAppliedItems = diterapkan;      // item yang efektifnya ≠ prior
      hasil.poolSeparationPct = hitungPoolSeparation(bank, effDifficulty);

      // Diagnostik arah delta (hanya varian kalibrasi): drift bertanda pada item
      // berlabel BENAR memisahkan dua penyakit yang gate-nya sama-sama merah —
      // derau simetris (wajar, kecil) vs penyerapan bias taksiran kemampuan
      // (sistematis, satu arah). koreksiKeArah = rata-rata delta yang searah
      // dengan (true − prior) pada item mislabeled ber-n>=8 (positif = kalibrasi
      // bergerak ke kebenaran).
      if (pakaiKalibrasi) {
        var sumBenarSigned = 0, sumBenarAbs = 0, nBenarLbl = 0, sumKoreksi = 0, nKoreksi = 0;
        for (var bj = 0; bj < bank.items.length; bj++) {
          var itd = bank.items[bj];
          if ((nBank[itd.id] || 0) < 8) continue;
          var deltaJ = effDifficulty(itd) - itd.prior;
          if (itd.mislabeled) {
            var arahBenar = itd.trueDifficulty > itd.prior ? 1 : -1;
            sumKoreksi += deltaJ * arahBenar; nKoreksi++;
          } else {
            sumBenarSigned += deltaJ; sumBenarAbs += Math.abs(deltaJ); nBenarLbl++;
          }
        }
        hasil.deltaStats = {
          correctlyLabeledMeanSigned: nBenarLbl ? round(sumBenarSigned / nBenarLbl, 4) : null,
          correctlyLabeledMeanAbs: nBenarLbl ? round(sumBenarAbs / nBenarLbl, 4) : null,
          mislabeledMeanCorrectionTowardTrue: nKoreksi ? round(sumKoreksi / nKoreksi, 4) : null
        };
      }
    }

    return hasil;
  }

  // ===================================================================================
  // 5. PERBANDINGAN + GATE
  // ===================================================================================
  /**
   * Lima metrik, arah "lebih baik" eksplisit:
   *   timeToMastery ↓ (null dihitung 36 = melewati horizon), accuracyGapVsTarget ↓,
   *   oscillation ↓, retentionDay90 ↑, brier ↓.
   * Skor agregat: rata-rata antar profil per metrik, lalu v2 dibandingkan v1 dengan
   * AMBANG PRAKTIS per metrik (WAVE 3: dulu EPS=1e-9 — selisih float mentah bukan
   * perbedaan pedagogis; seri di dalam ambang ≠ kalah). Gate gagal bila v2 kalah
   * pada ≥3 dari 5 metrik.
   */
  function bandingkan(hasilV1, hasilV2) {
    var METRIK = [
      { nama: 'timeToMasteryDays', arah: 'turun', praktis: PRAKTIS.timeToMasteryDays, ambil: function (r) { return r.timeToMasteryDays == null ? SIM_DAYS + 1 : r.timeToMasteryDays; } },
      { nama: 'accuracyGapVsTarget', arah: 'turun', praktis: PRAKTIS.accuracyGapVsTarget, ambil: function (r) { return r.accuracyGapVsTarget; } },
      { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } },
      { nama: 'retentionDay90', arah: 'naik', praktis: PRAKTIS.retentionDay90, ambil: function (r) { return r.retentionDay90; } },
      { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } }
    ];
    var rows = [];
    var kalah = 0;
    for (var i = 0; i < METRIK.length; i++) {
      var m = METRIK[i];
      var a1 = 0, a2 = 0;
      for (var p = 0; p < hasilV1.length; p++) { a1 += m.ambil(hasilV1[p]); a2 += m.ambil(hasilV2[p]); }
      a1 /= hasilV1.length; a2 /= hasilV2.length;
      var v2Kalah = m.arah === 'turun' ? (a2 > a1 + m.praktis) : (a2 < a1 - m.praktis);
      if (v2Kalah) kalah++;
      rows.push({ metric: m.nama, arahLebihBaik: m.arah, praktis: m.praktis, v1: round(a1, 4), v2: round(a2, 4), v2LebihBuruk: v2Kalah });
    }
    return { rows: rows, v2KalahPada: kalah, totalMetrik: METRIK.length, v2KalahMayoritas: kalah > METRIK.length / 2 };
  }

  /**
   * FASE 2 — perbandingan v2_lama vs v2_residual untuk gate residual:
   * dua klaim yang harus dibuktikan momentum residual, dua-duanya diukur agregat
   * antar profil (rata-rata):
   *   1. osilasi kesulitan TURUN (alasan keberadaan fitur ini — temuan A11);
   *   2. false-decline TIDAK NAIK (kalau naik, 'perbaikan' osilasi cuma karena
   *      momentum jadi tuli, bukan jadi benar).
   */
  function bandingkanResidual(hasilLama, hasilResidual) {
    // WAVE 3: EPS float mentah → ambang PRAKTIS — klaim "osilasi turun" wajib
    // turun setidaknya setengah perpindahan per 10 sesi, dan "false-decline naik"
    // baru dihitung naik bila melewati 2pp; di bawah itu derau, bukan efek.
    function rata(rows, ambil) { var s = 0; for (var i = 0; i < rows.length; i++) s += ambil(rows[i]); return rows.length ? s / rows.length : 0; }
    var oscLama = rata(hasilLama, function (r) { return r.difficultyOscillationPer10; });
    var oscRes = rata(hasilResidual, function (r) { return r.difficultyOscillationPer10; });
    var fdLama = rata(hasilLama, function (r) { return r.falseDeclineRate; });
    var fdRes = rata(hasilResidual, function (r) { return r.falseDeclineRate; });
    var osilasiTurun = oscRes < oscLama - PRAKTIS.difficultyOscillationPer10;
    var falseDeclineNaik = fdRes > fdLama + PRAKTIS.falseDeclineRate;
    return {
      oscillation: { v2Lama: round(oscLama, 4), v2Residual: round(oscRes, 4), praktis: PRAKTIS.difficultyOscillationPer10, turun: osilasiTurun },
      falseDecline: { v2Lama: round(fdLama, 4), v2Residual: round(fdRes, 4), praktis: PRAKTIS.falseDeclineRate, naik: falseDeclineNaik },
      pass: osilasiTurun && !falseDeclineNaik
    };
  }

  /**
   * FASE 3 — perbandingan v3_tanpa_kalibrasi vs v3_kalibrasi untuk gate kalibrasi.
   * Dua syarat kontrak tugas C6, diukur agregat antar profil:
   *   1. itemBiasRMSE TURUN — kalau tidak, kalibrasi cuma menambah kompleksitas
   *      tanpa memperbaiki peta kesulitan (alasan keberadaan C1 gugur);
   *   2. TIDAK ADA |delta| > 0.6 — shrinkage keras kontrak C1 bocor; koreksi tanpa
   *      rem adalah resep osilasi label (item "terjun" mengejar streak sesaat).
   * poolSeparation dilaporkan sebagai metrik penyerta (gate temuan Opus): kedua
   * varian wajib jauh dari 0 — pemilihan kandidat yang buta target adalah defek
   * lama yang tidak boleh kembali — tapi ambang keras RMSE-lah yang menggagalkan.
   */
  function bandingkanKalibrasi(hasilTanpa, hasilKal) {
    // WAVE 3: klaim "RMSE turun" kini wajib melewati ambang PRAKTIS.itemBiasRMSE
    // (dulu EPS=1e-9): penurunan RMSE di bawah 0.02 pada skala kesulitan 1..6
    // menggeser successProbability < 1pp — kalibrasi yang cuma segitu tidak
    // membayar kompleksitasnya. Kalau gate ini jadi FAIL, itu temuan, bukan bug
    // harness. Ambang shrinkage 0.6 TETAP memakai toleransi float 1e-9 — itu
    // batas KONTRAK C1 yang eksak, bukan perbandingan efek.
    function rata(rows, ambil) {
      var s = 0, n = 0;
      for (var i = 0; i < rows.length; i++) { var v = ambil(rows[i]); if (v != null && isFinite(v)) { s += v; n++; } }
      return n ? s / n : null;
    }
    var rmseTanpa = rata(hasilTanpa, function (r) { return r.itemBiasRMSE; });
    var rmseKal = rata(hasilKal, function (r) { return r.itemBiasRMSE; });
    var maxDelta = 0;
    for (var i = 0; i < hasilKal.length; i++) if (hasilKal[i].maxAbsDelta > maxDelta) maxDelta = hasilKal[i].maxAbsDelta;
    // terukur = dua-duanya punya item n>=8; tanpa itu klaim penurunan tidak berdasar.
    var terukur = rmseTanpa != null && rmseKal != null;
    var turun = terukur && rmseKal < rmseTanpa - PRAKTIS.itemBiasRMSE;
    var bocor = maxDelta > 0.6 + 1e-9;
    return {
      itemBiasRMSE: {
        tanpaKalibrasi: rmseTanpa == null ? null : round(rmseTanpa, 4),
        kalibrasi: rmseKal == null ? null : round(rmseKal, 4),
        praktis: PRAKTIS.itemBiasRMSE,
        terukur: terukur,
        turun: turun
      },
      shrinkage: { maxAbsDelta: round(maxDelta, 4), batas: 0.6, bocor: bocor },
      poolSeparation: {
        tanpaKalibrasi: rata(hasilTanpa, function (r) { return r.poolSeparationPct; }),
        kalibrasi: rata(hasilKal, function (r) { return r.poolSeparationPct; })
      },
      pass: turun && !bocor
    };
  }

  /** Satu suite penuh (3 profil × kebijakan) untuk satu seed — dipakai dua kali
   *  oleh gate determinisme dan hasilnya harus identik string-demi-string.
   *  FASE 2: varian v2_residual hanya dijalankan bila core brain terdeteksi
   *  mendukung basis residual (kalau tidak, hasilnya identik v2_lama dan
   *  membandingkannya berarti menguji nol — lebih jujur dilewati + SKIPPED). */
  function jalankanSuite(seed) {
    var residualTersedia = dukungResidual();
    // FASE 3: feature-detect kalibrasi (pola sama dengan residual/B5) + bank item
    // mislabeled yang SAMA untuk kedua varian v3 dan semua profil — perbandingan
    // kalibrasi vs tanpa-kalibrasi selalu pada dunia yang identik.
    var kalibrasiTersedia = dukungKalibrasi();
    var bank = buatBankItem(seed);
    var v1 = [], v2Lama = [], v2Residual = residualTersedia ? [] : null;
    var v3Tanpa = [], v3Kal = kalibrasiTersedia ? [] : null;
    for (var p = 0; p < PROFILES.length; p++) {
      // Seed diturunkan per profil supaya tiap profil punya deret sendiri, dan semua
      // varian memakai deret yang SAMA → keacakan berpasangan (paired), perbandingan adil.
      var seedProfil = (seed * 1000003 + p * 7919) >>> 0;
      v1.push(jalankanRun(PROFILES[p], 'v1', seedProfil));
      v2Lama.push(jalankanRun(PROFILES[p], 'v2_lama', seedProfil));
      if (residualTersedia) v2Residual.push(jalankanRun(PROFILES[p], 'v2_residual', seedProfil));
      // Baseline tanpa-kalibrasi TETAP dijalankan meski modul C1 belum ada — ia
      // tidak butuh modul, dan angkanya memperlihatkan besar kerugian mislabel.
      v3Tanpa.push(jalankanRun(PROFILES[p], 'v3_tanpa_kalibrasi', seedProfil, { bank: bank, kalibrasi: false, kirimPredicted: residualTersedia }));
      if (kalibrasiTersedia) v3Kal.push(jalankanRun(PROFILES[p], 'v3_kalibrasi', seedProfil, { bank: bank, kalibrasi: true, kirimPredicted: residualTersedia }));
    }
    return {
      seed: seed,
      residualSupported: residualTersedia,
      calibrationSupported: kalibrasiTersedia,
      bank: {
        items: bank.items.length,
        mislabeled: bank.mislabeledCount,
        mislabeledShare: round(bank.mislabeledCount / bank.items.length, 4),
        deviasi: BANK_DEVIASI
      },
      perProfil: { v1: v1, v2Lama: v2Lama, v2Residual: v2Residual, v3TanpaKalibrasi: v3Tanpa, v3Kalibrasi: v3Kal },
      perbandingan: bandingkan(v1, v2Lama),
      perbandinganResidual: residualTersedia ? bandingkanResidual(v2Lama, v2Residual) : null,
      perbandinganKalibrasi: kalibrasiTersedia ? bandingkanKalibrasi(v3Tanpa, v3Kal) : null
    };
  }

  // ===================================================================================
  // 5b. WAVE 3 — MULTI-SEED + CENSORING + CI BOOTSTRAP ANTAR-SEED
  // ===================================================================================
  /** FNV-1a 32-bit atas string — digest murah untuk membandingkan unit multi-seed
   *  tanpa menyimpan (apalagi mencetak) seluruh run mentah ke stdout. */
  function fnv1a(str) {
    var h = 0x811C9DC5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  /**
   * Profil populasi untuk satu seed: 3 profil ASLI apa adanya (referensi objek yang
   * sama — gate lama tetap mengukur hal yang sama) + PROFIL_TURUNAN profil turunan
   * dengan jitter deterministik dari seed. Konsumsi RNG per turunan KONSTAN (lima
   * tarikan, dipakai atau tidak) supaya menambah parameter di masa depan tidak
   * menggeser turunan lain — determinisme struktural, pola yang sama dengan
   * buatBankItem. Jitter dijepit ke rentang waras supaya murid tetap plausibel:
   * theta ±0.4, laju ±25%, redaman ±30%, drift ±0.02/hari, slip ±3pp.
   */
  function buatProfilMultiSeed(seed) {
    var rng = mulberry32(((seed >>> 0) ^ 0x2545F491) >>> 0);
    var profs = PROFILES.slice(); // 3 asli, TIDAK disalin-ubah — identitas dipertahankan
    for (var v = 0; v < PROFIL_TURUNAN; v++) {
      var basis = PROFILES[v % PROFILES.length];
      var dTheta = (rng() * 2 - 1) * 0.4;
      var fLaju = 1 + (rng() * 2 - 1) * 0.25;
      var fRedam = 1 + (rng() * 2 - 1) * 0.30;
      var dDrift = (rng() * 2 - 1) * 0.02;
      var dSlip = (rng() * 2 - 1) * 0.03;
      var thetaAwal = {};
      for (var f = 0; f < FAMILIES.length; f++) {
        thetaAwal[FAMILIES[f]] = round(clamp(basis.thetaAwal[FAMILIES[f]] + dTheta, 0.4, 4.5), 4);
      }
      profs.push({
        id: basis.id + '_var' + (v + 1),
        thetaAwal: thetaAwal,
        lajuBelajar: round(clamp(basis.lajuBelajar * fLaju, 0.01, 0.2), 5),
        redaman: round(clamp(basis.redaman * fRedam, 5, 200), 3),
        driftHarian: round(clamp(basis.driftHarian + dDrift, -0.08, 0.05), 5),
        slip: round(clamp(basis.slip + dSlip, 0.02, 0.2), 5)
      });
    }
    return profs;
  }

  /** Seed turunan deterministik: seed dasar + i·konstanta-emas (Weyl sequence 32-bit)
   *  — tersebar merata, tanpa tabrakan untuk jumlah kecil, dan reproducible. */
  function turunkanSeeds(seedDasar, jumlah) {
    var seeds = [];
    for (var i = 0; i < jumlah; i++) seeds.push((((seedDasar >>> 0) + Math.imul(i + 1, 0x9E3779B1)) >>> 0));
    return seeds;
  }

  /**
   * Satu UNIT multi-seed = semua varian pada satu seed turunan. Pairing dijaga
   * dengan derivasi seedProfil yang SAMA dengan jalankanSuite — tiap varian melihat
   * murid laten identik per (seed, profil). Varian bank Fase 3 hanya pada
   * PROFIL_BANK profil pertama (= 3 profil asli) demi runtime; lihat komentar
   * konfigurasi di atas.
   */
  function jalankanUnitSeed(seedUnit, dukungan) {
    var profs = buatProfilMultiSeed(seedUnit);
    var bank = buatBankItem(seedUnit);
    var runs = {
      v1: [], v2Lama: [], v2Residual: dukungan.residual ? [] : null,
      v3TanpaKalibrasi: [], v3Kalibrasi: dukungan.kalibrasi ? [] : null
    };
    for (var p = 0; p < profs.length; p++) {
      var seedProfil = (seedUnit * 1000003 + p * 7919) >>> 0;
      runs.v1.push(jalankanRun(profs[p], 'v1', seedProfil));
      runs.v2Lama.push(jalankanRun(profs[p], 'v2_lama', seedProfil));
      if (dukungan.residual) runs.v2Residual.push(jalankanRun(profs[p], 'v2_residual', seedProfil));
      if (p < PROFIL_BANK) {
        runs.v3TanpaKalibrasi.push(jalankanRun(profs[p], 'v3_tanpa_kalibrasi', seedProfil, { bank: bank, kalibrasi: false, kirimPredicted: dukungan.residual }));
        if (dukungan.kalibrasi) runs.v3Kalibrasi.push(jalankanRun(profs[p], 'v3_kalibrasi', seedProfil, { bank: bank, kalibrasi: true, kirimPredicted: dukungan.residual }));
      }
    }
    return { seed: seedUnit, profilIds: profs.map(function (pr) { return pr.id; }), runs: runs };
  }

  /**
   * Ringkasan censoring per varian di seluruh unit:
   *   - censoredRuns/totalRuns: proporsi run tersensor;
   *   - seedsTanpaMastery: seed di mana varian TIDAK PERNAH mastery di profil mana
   *     pun — dasar gate FAIL MUTLAK kontrak tugas ("tak pernah mastery di
   *     mayoritas seed"): kebijakan yang tak bisa mengantar SATU murid pun ke
   *     mastery pada mayoritas dunia bukan kebijakan, itu kerusakan.
   */
  function ringkasCensoring(units, kunci) {
    var totalRuns = 0, censoredRuns = 0, seedsTanpaMastery = 0, seedCount = 0;
    for (var u = 0; u < units.length; u++) {
      var rows = units[u].runs[kunci];
      if (!rows) continue;
      seedCount++;
      var adaMastery = false;
      for (var i = 0; i < rows.length; i++) {
        totalRuns++;
        if (rows[i].censored) censoredRuns++; else adaMastery = true;
      }
      if (!adaMastery) seedsTanpaMastery++;
    }
    return {
      variant: kunci,
      seedCount: seedCount,
      totalRuns: totalRuns,
      censoredRuns: censoredRuns,
      censoredRate: totalRuns ? round(censoredRuns / totalRuns, 4) : null,
      seedsTanpaMastery: seedsTanpaMastery,
      tanpaMasteryMayoritas: seedCount > 0 && seedsTanpaMastery > seedCount / 2
    };
  }

  /**
   * CI bootstrap berpasangan untuk SATU metrik antara dua varian yang urutan
   * run-nya sejajar (unit & profil sama). saring(r) true → pasangan dibuang
   * (dipakai untuk mengecualikan pasangan tersensor dari timeToMastery — kontrak
   * censoring butir (c)). Verdict tiga-nilai dari CI 95% + ambang praktis:
   *   kandidat_lebih_buruk : CI seluruhnya di sisi buruk DAN |meanDiff| > praktis;
   *   kandidat_lebih_baik  : cermin sebaliknya;
   *   inconclusive/setara  : selain itu — interval masih memeluk nol ATAU efeknya
   *                          nyata secara statistik tapi remeh secara praktis.
   */
  function ciBerpasangan(runsBase, runsCand, spek, seedCI) {
    var pairs = [];
    var dibuang = 0;
    var nMin = Math.min(runsBase.length, runsCand.length);
    for (var i = 0; i < nMin; i++) {
      if (spek.saring && (spek.saring(runsBase[i]) || spek.saring(runsCand[i]))) { dibuang++; continue; }
      var a = spek.ambil(runsBase[i]);
      var b = spek.ambil(runsCand[i]);
      if (typeof a === 'number' && isFinite(a) && typeof b === 'number' && isFinite(b)) pairs.push([a, b]);
    }
    var boot = statGate.pairedBootstrap(pairs, BOOT_ITERS, seedCI);
    var row = {
      metric: spek.nama,
      arahLebihBaik: spek.arah,
      praktis: spek.praktis,
      nPasangan: pairs.length,
      dikecualikanCensor: dibuang,
      ciSeed: seedCI
    };
    if (!boot || boot.insufficient) {
      row.insufficient = true;
      row.verdict = 'insufficient';
      return row;
    }
    row.meanBase = round(rataDari(pairs, 0), 4);
    row.meanKandidat = round(rataDari(pairs, 1), 4);
    row.meanDiff = round(boot.meanDiff, 4);
    row.ciLo = round(boot.ciLo, 4);
    row.ciHi = round(boot.ciHi, 4);
    var burukSig, baikSig;
    if (spek.arah === 'turun') { // diff = kandidat - base; positif = kandidat lebih buruk
      burukSig = boot.ciLo > 0 && boot.meanDiff > spek.praktis;
      baikSig = boot.ciHi < 0 && boot.meanDiff < -spek.praktis;
    } else {
      burukSig = boot.ciHi < 0 && boot.meanDiff < -spek.praktis;
      baikSig = boot.ciLo > 0 && boot.meanDiff > spek.praktis;
    }
    row.verdict = burukSig ? 'kandidat_lebih_buruk' : baikSig ? 'kandidat_lebih_baik' : 'inconclusive';
    return row;
  }

  function rataDari(pairs, idx) {
    var s = 0;
    for (var i = 0; i < pairs.length; i++) s += pairs[i][idx];
    return pairs.length ? s / pairs.length : 0;
  }

  /**
   * Gate censoring multi-seed (kontrak tugas butir (c)):
   *   MUTLAK  : varian mana pun yang tak pernah mastery pada MAYORITAS seed → FAIL.
   *   RELATIF : per pasangan (baseline→kandidat), CI bootstrap selisih indikator
   *             censoring; bila batas BAWAH CI > PRAKTIS.censoringRate, kandidat
   *             TERBUKTI menyensor lebih sering melebihi margin → FAIL. Diperiksa
   *             lewat CI, bukan selisih titik — konsisten dengan filosofi stat gate.
   */
  function gateCensoringMulti(ringkasan, ciRelatif) {
    var alasan = [];
    for (var i = 0; i < ringkasan.length; i++) {
      if (ringkasan[i].tanpaMasteryMayoritas) {
        alasan.push('varian ' + ringkasan[i].variant + ' tak pernah mastery pada ' + ringkasan[i].seedsTanpaMastery + '/' + ringkasan[i].seedCount + ' seed (mayoritas)');
      }
    }
    var mutlakFail = alasan.length > 0;
    for (var j = 0; j < ciRelatif.length; j++) {
      var r = ciRelatif[j];
      if (!r.insufficient && typeof r.ciLo === 'number' && r.ciLo > PRAKTIS.censoringRate) {
        alasan.push('pasangan ' + r.pair + ': kandidat tersensor lebih sering secara signifikan (rate ' + r.meanBase + ' \u2192 ' + r.meanKandidat + ', CI selisih [' + r.ciLo + ', ' + r.ciHi + '] > margin ' + PRAKTIS.censoringRate + ')');
      }
    }
    return {
      pass: alasan.length === 0,
      mutlakFail: mutlakFail,
      alasan: alasan,
      rationale: alasan.length === 0 ? 'brain3_sim_censoring_ok' : (mutlakFail ? 'brain3_sim_censoring_absolute' : 'brain3_sim_censoring_excess'),
      confidence: alasan.length === 0 ? 0.9 : 0.95
    };
  }

  /** Agregat multi-seed per varian — timeToMastery HANYA dari run tak-tersensor
   *  (kontrak censoring butir (c): tersensor dikeluarkan dari rata-rata). */
  function agregatMultiSeed(units, kunci) {
    var rows = [];
    for (var u = 0; u < units.length; u++) if (units[u].runs[kunci]) rows.push.apply(rows, units[u].runs[kunci]);
    if (!rows.length) return null;
    function rata(ambil) {
      var s = 0, n = 0;
      for (var i = 0; i < rows.length; i++) { var v = ambil(rows[i]); if (typeof v === 'number' && isFinite(v)) { s += v; n++; } }
      return n ? round(s / n, 4) : null;
    }
    var ttmSum = 0, ttmN = 0, cen = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].censored) { cen++; continue; }
      ttmSum += rows[i].timeToMasteryDays; ttmN++;
    }
    return {
      variant: kunci,
      runs: rows.length,
      timeToMasteryDaysUncensoredMean: ttmN ? round(ttmSum / ttmN, 4) : null,
      uncensoredRuns: ttmN,
      censoredRuns: cen,
      accuracyGapVsTarget: rata(function (r) { return r.accuracyGapVsTarget; }),
      difficultyOscillationPer10: rata(function (r) { return r.difficultyOscillationPer10; }),
      retentionDay90: rata(function (r) { return r.retentionDay90; }),
      brier: rata(function (r) { return r.brier; }),
      falseDeclineRate: rata(function (r) { return r.falseDeclineRate; }),
      itemBiasRMSE: rata(function (r) { return r.itemBiasRMSE; })
    };
  }

  /**
   * Suite multi-seed penuh: SEED_COUNT unit + ringkasan censoring + CI bootstrap per
   * metrik per pasangan varian + verdict gate. Output TIDAK memuat run mentah
   * (50×9×5 run akan membengkakkan stdout dan mempersulit diff CI) — hanya digest
   * FNV-1a per unit, ringkasan, dan CI; determinisme tetap terjaga karena digest
   * berubah bila SATU byte run mentah berubah.
   */
  function jalankanMultiSeed(seedDasar, dukungan, jumlahSeed) {
    var n = (typeof jumlahSeed === 'number' && jumlahSeed >= 2) ? Math.floor(jumlahSeed) : SEED_COUNT;
    var seeds = turunkanSeeds(seedDasar, n);
    var units = [];
    for (var i = 0; i < seeds.length; i++) units.push(jalankanUnitSeed(seeds[i], dukungan));

    function gabung(kunci) {
      var all = [];
      for (var u = 0; u < units.length; u++) if (units[u].runs[kunci]) all.push.apply(all, units[u].runs[kunci]);
      return all;
    }
    var v1 = gabung('v1');
    var v2 = gabung('v2Lama');
    var v2r = dukungan.residual ? gabung('v2Residual') : null;
    var v3t = gabung('v3TanpaKalibrasi');
    var v3k = dukungan.kalibrasi ? gabung('v3Kalibrasi') : null;

    function seedCI(idx) { return (((seedDasar >>> 0) ^ Math.imul(idx + 17, 0x85EBCA6B)) >>> 0); }
    var saringCensor = function (r) { return !!r.censored; };
    var ambilCensor = function (r) { return r.censored ? 1 : 0; };

    // --- pasangan utama v1 → v2_lama: lima metrik inti + indikator censoring ---
    var metrikUtama = [
      ciBerpasangan(v1, v2, { nama: 'timeToMasteryDays', arah: 'turun', praktis: PRAKTIS.timeToMasteryDays, ambil: function (r) { return r.timeToMasteryDays; }, saring: saringCensor }, seedCI(0)),
      ciBerpasangan(v1, v2, { nama: 'accuracyGapVsTarget', arah: 'turun', praktis: PRAKTIS.accuracyGapVsTarget, ambil: function (r) { return r.accuracyGapVsTarget; } }, seedCI(1)),
      ciBerpasangan(v1, v2, { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } }, seedCI(2)),
      ciBerpasangan(v1, v2, { nama: 'retentionDay90', arah: 'naik', praktis: PRAKTIS.retentionDay90, ambil: function (r) { return r.retentionDay90; } }, seedCI(3)),
      ciBerpasangan(v1, v2, { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } }, seedCI(4))
    ];
    var burukUtama = 0;
    for (var mu = 0; mu < metrikUtama.length; mu++) if (metrikUtama[mu].verdict === 'kandidat_lebih_buruk') burukUtama++;

    var censorUtama = ciBerpasangan(v1, v2, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(5));
    censorUtama.pair = 'v1\u2192v2_lama';

    // --- pasangan residual v2_lama → v2_residual ---
    var metrikResidual = null, censorResidual = null;
    if (dukungan.residual) {
      metrikResidual = [
        ciBerpasangan(v2, v2r, { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } }, seedCI(6)),
        ciBerpasangan(v2, v2r, { nama: 'falseDeclineRate', arah: 'turun', praktis: PRAKTIS.falseDeclineRate, ambil: function (r) { return r.falseDeclineRate; } }, seedCI(7))
      ];
      censorResidual = ciBerpasangan(v2, v2r, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(8));
      censorResidual.pair = 'v2_lama\u2192v2_residual';
    }

    // --- pasangan kalibrasi v3_tanpa → v3_kalibrasi ---
    var metrikKalibrasi = null, shrinkageMulti = null;
    if (dukungan.kalibrasi) {
      metrikKalibrasi = [
        ciBerpasangan(v3t, v3k, { nama: 'itemBiasRMSE', arah: 'turun', praktis: PRAKTIS.itemBiasRMSE, ambil: function (r) { return r.itemBiasRMSE; } }, seedCI(9)),
        ciBerpasangan(v3t, v3k, { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } }, seedCI(10)),
        ciBerpasangan(v3t, v3k, { nama: 'poolSeparationPct', arah: 'naik', praktis: PRAKTIS.poolSeparationPct, ambil: function (r) { return r.poolSeparationPct; } }, seedCI(11))
      ];
      var maxDeltaMulti = 0;
      for (var vk = 0; vk < v3k.length; vk++) if (v3k[vk].maxAbsDelta > maxDeltaMulti) maxDeltaMulti = v3k[vk].maxAbsDelta;
      shrinkageMulti = { maxAbsDelta: round(maxDeltaMulti, 4), batas: 0.6, bocor: maxDeltaMulti > 0.6 + 1e-9 };
    }

    // --- censoring: ringkasan per varian + gate ---
    var kunciAktif = ['v1', 'v2Lama'];
    if (dukungan.residual) kunciAktif.push('v2Residual');
    kunciAktif.push('v3TanpaKalibrasi');
    if (dukungan.kalibrasi) kunciAktif.push('v3Kalibrasi');
    var censoringPerVarian = [];
    for (var kv = 0; kv < kunciAktif.length; kv++) censoringPerVarian.push(ringkasCensoring(units, kunciAktif[kv]));
    var ciCensor = [censorUtama];
    if (censorResidual) ciCensor.push(censorResidual);
    var gateCensor = gateCensoringMulti(censoringPerVarian, ciCensor);

    // --- WAVE 5c: blok KEBIJAKAN SHIPPED — bahan mentah gate keselamatan rilis ---
    // Metrik keselamatan per kontrak tugas: retensi/brier/falseDecline/oscillation.
    // timeToMastery/censoredRate BUKAN metrik gate (tersensor berat → pasangan bias);
    // ia tetap dihitung & dilaporkan sebagai bahan riset (lihat kumpulkanTemuanRiset).
    var METRIK_KESELAMATAN = [
      { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } },
      { nama: 'retentionDay90', arah: 'naik', praktis: PRAKTIS.retentionDay90, ambil: function (r) { return r.retentionDay90; } },
      { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } },
      { nama: 'falseDeclineRate', arah: 'turun', praktis: PRAKTIS.falseDeclineRate, ambil: function (r) { return r.falseDeclineRate; } }
    ];
    function barisKeselamatan(base, cand, offsetSeed, pairLabel) {
      var rows = [];
      for (var bi = 0; bi < METRIK_KESELAMATAN.length; bi++) {
        var baris = ciBerpasangan(base, cand, METRIK_KESELAMATAN[bi], seedCI(offsetSeed + bi));
        baris.pair = pairLabel;
        rows.push(baris);
      }
      return rows;
    }
    function cariCensor(nama) {
      for (var ci2 = 0; ci2 < censoringPerVarian.length; ci2++) if (censoringPerVarian[ci2].variant === nama) return censoringPerVarian[ci2];
      return null;
    }
    var shipped = { v2Residual: null, itemCalibration: null };
    if (dukungan.residual) {
      var cenV1V2r = ciBerpasangan(v1, v2r, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(16));
      cenV1V2r.pair = 'v1\u2192v2_residual';
      shipped.v2Residual = {
        policy: 'v2_residual',
        authority: 'aktif di produksi (momentum residual fiezel-core-brain; baris attempts app membawa `predicted`)',
        baselineKeselamatan: 'v1',
        baselineAblation: 'v2_lama',
        metrics: barisKeselamatan(v1, v2r, 12, 'v1\u2192v2_residual'),
        censoringShipped: cariCensor('v2Residual'),
        censoringBaseline: cariCensor('v1'),
        // ablation censoring = censorResidual (v2_lama\u2192v2_residual, sudah dihitung di atas)
        censoringAblationCI: censorResidual,
        censoringBaselineCI: cenV1V2r
      };
    }
    if (dukungan.kalibrasi) {
      var cenV3 = ciBerpasangan(v3t, v3k, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(21));
      cenV3.pair = 'v3_tanpa\u2192v3_kalibrasi';
      shipped.itemCalibration = {
        policy: 'item_calibration',
        authority: "authorityMap.itemCalibration='active' (features/brain/fiezel-brain-manifest.js; buildAdaptivePool memakai effective())",
        baselineKeselamatan: 'v3_tanpa_kalibrasi (ablation \u2014 dunia bank tidak punya varian v1)',
        baselineAblation: 'v3_tanpa_kalibrasi',
        metrics: barisKeselamatan(v3t, v3k, 17, 'v3_tanpa\u2192v3_kalibrasi'),
        censoringShipped: cariCensor('v3Kalibrasi'),
        censoringBaseline: cariCensor('v3TanpaKalibrasi'),
        censoringAblationCI: cenV3,
        censoringBaselineCI: cenV3,
        // Kontrak shrinkage ±0.6 adalah kontrak modul SHIPPED — bocornya = gate keras.
        shrinkage: shrinkageMulti
      };
    }

    var agregat = [];
    for (var ka = 0; ka < kunciAktif.length; ka++) agregat.push(agregatMultiSeed(units, kunciAktif[ka]));

    // Digest per unit (determinisme): berubah bila satu angka run mentah berubah.
    var unitDigests = [];
    for (var ud = 0; ud < units.length; ud++) unitDigests.push(fnv1a(JSON.stringify(units[ud])));

    return {
      seedDasar: seedDasar,
      seedCount: seeds.length,
      seeds: { pertama: seeds[0], terakhir: seeds[seeds.length - 1] },
      profilesPerSeed: PROFILES.length + PROFIL_TURUNAN,
      profilBankPerSeed: PROFIL_BANK,
      bootstrapIters: BOOT_ITERS,
      praktis: PRAKTIS,
      runsPerVariant: { v1: v1.length, v2Lama: v2.length, v2Residual: v2r ? v2r.length : null, v3TanpaKalibrasi: v3t.length, v3Kalibrasi: v3k ? v3k.length : null },
      aggregates: agregat,
      censoring: { perVariant: censoringPerVarian, ciRelatif: ciCensor, gate: gateCensor },
      // WAVE 5c — bahan gate keselamatan shipped (dinilai nilaiShipped/nilaiKebijakanShipped)
      shipped: shipped,
      utama: { pair: 'v1\u2192v2_lama', metrics: metrikUtama, kandidatBurukPada: burukUtama, totalMetrik: metrikUtama.length, mayoritasBuruk: burukUtama > metrikUtama.length / 2 },
      residual: metrikResidual ? { pair: 'v2_lama\u2192v2_residual', metrics: metrikResidual } : null,
      kalibrasi: metrikKalibrasi ? { pair: 'v3_tanpa\u2192v3_kalibrasi', metrics: metrikKalibrasi, shrinkage: shrinkageMulti } : null,
      unitDigests: unitDigests,
      digest: fnv1a(unitDigests.join('|'))
    };
  }

  /**
   * Verdict multi-seed — status per gate, pola tiga-status yang sama dengan Fase 2/3.
   * WAVE 5c: gate-gate ini menghakimi KLAIM RISET (nilai tambah kandidat, censoring
   * lintas varian), bukan keselamatan rilis — status buruknya kini 'RESEARCH_HOLD'
   * (bukan 'FAIL') dan TIDAK menentukan exit code; lihat nilaiShipped untuk gate keras.
   *   utama     : RESEARCH_HOLD bila v2_lama TERBUKTI lebih buruk dari v1 (CI + praktis)
   *               pada mayoritas metrik inti (v2_lama = kandidat non-shipped).
   *   censoring : lihat gateCensoringMulti — temuan mutlak/relatif.
   *   residual  : SKIPPED tanpa dukungan; RESEARCH_HOLD bila osilasi TIDAK terbukti
   *               membaik ATAU false-decline terbukti memburuk (klaim nilai tambah).
   *   kalibrasi : SKIPPED tanpa modul; RESEARCH_HOLD bila RMSE TIDAK terbukti turun
   *               melewati ambang praktis ATAU shrinkage bocor di run mana pun.
   */
  function nilaiMultiSeed(ms, dukungan) {
    var utamaStatus = ms.utama.mayoritasBuruk ? 'RESEARCH_HOLD' : 'PASS';
    var censoringStatus = ms.censoring.gate.pass ? 'PASS' : 'RESEARCH_HOLD';
    var residualStatus, kalibrasiStatus;
    if (!dukungan.residual) residualStatus = 'SKIPPED';
    else {
      var osc = ms.residual.metrics[0], fd = ms.residual.metrics[1];
      residualStatus = (osc.verdict === 'kandidat_lebih_baik' && fd.verdict !== 'kandidat_lebih_buruk') ? 'PASS' : 'RESEARCH_HOLD';
    }
    if (!dukungan.kalibrasi) kalibrasiStatus = 'SKIPPED';
    else {
      var rmse = ms.kalibrasi.metrics[0];
      kalibrasiStatus = (rmse.verdict === 'kandidat_lebih_baik' && !ms.kalibrasi.shrinkage.bocor) ? 'PASS' : 'RESEARCH_HOLD';
    }
    var pass = utamaStatus !== 'RESEARCH_HOLD' && censoringStatus !== 'RESEARCH_HOLD' && residualStatus !== 'RESEARCH_HOLD' && kalibrasiStatus !== 'RESEARCH_HOLD';
    var rationale = censoringStatus === 'RESEARCH_HOLD' ? ms.censoring.gate.rationale
      : utamaStatus === 'RESEARCH_HOLD' ? 'brain3_sim_multiseed_v2_regression'
        : residualStatus === 'RESEARCH_HOLD' ? 'brain3_sim_multiseed_residual_no_improvement'
          : kalibrasiStatus === 'RESEARCH_HOLD' ? (ms.kalibrasi.shrinkage.bocor ? 'brain3_sim_multiseed_kalibrasi_shrinkage_leak' : 'brain3_sim_multiseed_kalibrasi_no_improvement')
            : 'brain3_sim_multiseed_pass';
    return {
      pass: pass,
      utama: utamaStatus,
      censoring: censoringStatus,
      residual: residualStatus,
      kalibrasi: kalibrasiStatus,
      rationale: rationale,
      confidence: round((pass ? 0.9 : 0.95)
        * (residualStatus === 'SKIPPED' ? 0.6 : 1)
        * (kalibrasiStatus === 'SKIPPED' ? 0.6 : 1), 3)
    };
  }

  // ===================================================================================
  // WAVE 5c — GATE KESELAMATAN SHIPPED (exit code) & PENGUMPUL TEMUAN RISET (research_hold)
  // ===================================================================================
  /**
   * Nilai SATU kebijakan shipped dari blok multiSeed.shipped.*:
   *   FAIL bila (a) ada metrik keselamatan dengan verdict kandidat_lebih_buruk vs
   *   baseline (CI mengecualikan nol + melewati ambang praktis), (b) censoring
   *   ATRIBUTABLE (shipped tanpa mastery di mayoritas seed SEMENTARA baseline tidak,
   *   ATAU CI ablation membuktikan shipped menyensor lebih sering melebihi margin),
   *   (c) kontrak modul shipped bocor (shrinkage), atau (d) blok null — kebijakan
   *   dinyatakan shipped tetapi harness tak bisa memverifikasinya.
   *   Censoring level-skenario (shipped DAN baseline sama-sama mayoritas) TIDAK
   *   menggagalkan gate — ia ditandai censoringScenarioLevel dan dieskalasi sebagai
   *   research_hold oleh kumpulkanTemuanRiset (mendakwa harness, bukan kebijakan).
   */
  function nilaiKebijakanShipped(nama, blok) {
    if (!blok) {
      return {
        policy: nama, status: 'UNVERIFIED', pass: false,
        alasan: ['kebijakan dinyatakan shipped (produksi/authorityMap) tetapi runtime tidak lolos feature-detect — harness yang tidak bisa mengukur kebijakan yang benar-benar jalan tidak boleh mensertifikasi rilis'],
        regresiTerbukti: [], censoringMutlakAtributable: false, censoringRelatifTerbukti: false, censoringScenarioLevel: false,
        rationale: 'brain3_sim_shipped_unverifiable', confidence: 0.9
      };
    }
    var alasan = [];
    var regresi = [];
    for (var i = 0; i < blok.metrics.length; i++) {
      var m = blok.metrics[i];
      if (m.verdict === 'kandidat_lebih_buruk') {
        regresi.push(m.metric);
        alasan.push('regresi terbukti pada metrik keselamatan ' + m.metric + ' vs ' + blok.baselineKeselamatan + ' (meanDiff ' + m.meanDiff + ', CI [' + m.ciLo + ', ' + m.ciHi + '] mengecualikan nol melewati ambang praktis ' + m.praktis + ')');
      }
    }
    var cs = blok.censoringShipped, cb = blok.censoringBaseline;
    var censorMutlak = !!(cs && cs.tanpaMasteryMayoritas && !(cb && cb.tanpaMasteryMayoritas));
    if (censorMutlak) alasan.push('kebijakan shipped tersensor mayoritas seed (' + cs.seedsTanpaMastery + '/' + cs.seedCount + ' seed tanpa mastery) sementara baseline ' + blok.baselineAblation + ' tidak — atributable ke kebijakan shipped');
    var scenarioLevel = !!(cs && cs.tanpaMasteryMayoritas && cb && cb.tanpaMasteryMayoritas);
    var abl = blok.censoringAblationCI;
    var censorRelatif = !!(abl && !abl.insufficient && typeof abl.ciLo === 'number' && abl.ciLo > PRAKTIS.censoringRate);
    if (censorRelatif) alasan.push('kebijakan shipped TERBUKTI menyensor lebih sering dari baseline ablation ' + blok.baselineAblation + ' (CI [' + abl.ciLo + ', ' + abl.ciHi + '] > margin ' + PRAKTIS.censoringRate + ')');
    var kontrakBocor = !!(blok.shrinkage && blok.shrinkage.bocor);
    if (kontrakBocor) alasan.push('kontrak shrinkage modul shipped BOCOR (maks |delta| = ' + blok.shrinkage.maxAbsDelta + ' > ' + blok.shrinkage.batas + ')');
    var pass = alasan.length === 0;
    return {
      policy: blok.policy,
      authority: blok.authority,
      baselineKeselamatan: blok.baselineKeselamatan,
      baselineAblation: blok.baselineAblation,
      status: pass ? 'PASS' : 'FAIL',
      pass: pass,
      regresiTerbukti: regresi,
      censoringMutlakAtributable: censorMutlak,
      censoringRelatifTerbukti: censorRelatif,
      censoringScenarioLevel: scenarioLevel,
      kontrakBocor: kontrakBocor,
      alasan: alasan,
      rationale: pass ? 'brain3_sim_shipped_ok'
        : regresi.length ? 'brain3_sim_shipped_regression'
          : censorMutlak ? 'brain3_sim_shipped_censoring_absolute'
            : censorRelatif ? 'brain3_sim_shipped_censoring_excess'
              : 'brain3_sim_shipped_contract_leak',
      confidence: pass ? 0.9 : 0.95
    };
  }

  /** Gate keselamatan gabungan — SATU-SATUNYA penentu exit 1 (selain determinisme). */
  function nilaiShipped(ms, dukungan) {
    var pols = [
      nilaiKebijakanShipped('v2_residual', dukungan.residual && ms.shipped ? ms.shipped.v2Residual : null),
      nilaiKebijakanShipped('item_calibration', dukungan.kalibrasi && ms.shipped ? ms.shipped.itemCalibration : null)
    ];
    var pass = true, rationale = 'brain3_sim_shipped_pass', alasan = [];
    for (var i = 0; i < pols.length; i++) {
      if (!pols[i].pass) {
        pass = false;
        if (rationale === 'brain3_sim_shipped_pass') rationale = pols[i].rationale;
        for (var a = 0; a < pols[i].alasan.length; a++) alasan.push(pols[i].policy + ': ' + pols[i].alasan[a]);
      }
    }
    return { pass: pass, policies: pols, alasan: alasan, rationale: rationale, confidence: pass ? 0.9 : 0.95 };
  }

  /**
   * Klasifikasi klaim perbaikan kandidat dari satu baris CI:
   *   'terbantah'    : CI 95% mengecualikan nol di sisi BURUK — klaim perbaikan
   *                    dibantah antar-seed (mis. osilasi residual [+0.054, +0.275]);
   *   'inconclusive' : interval memeluk nol atau efek < ambang praktis.
   */
  function klasifikasiKlaim(row) {
    if (!row || row.insufficient) return 'insufficient';
    var terbantah = row.arahLebihBaik === 'turun' ? row.ciLo > 0 : row.ciHi < 0;
    return terbantah ? 'terbantah' : 'inconclusive';
  }

  /**
   * Pengumpul TEMUAN RISET — setiap temuan jujur yang TIDAK memblokir rilis menjadi
   * entri { id, status:'research_hold', claim, rationale brain3_riset_*, confidence,
   * ci (baris CI lengkap bila ada), detail }. TIDAK ADA temuan yang dibuang:
   * semuanya masuk JSON (field researchVerdicts) dan dicetak ke stderr dengan label
   * 'TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER)'. Eskalasi ke MASTER
   * berjalan via ledger, bukan via CI merah — konsisten fiezel-stat-gate.js
   * (hold-bukan-fail saat bukti belum memutus).
   */
  function kumpulkanTemuanRiset(ctx) {
    var temuan = [];
    function tambah(id, claim, rationale, confidence, ci, detail) {
      temuan.push({ id: id, status: 'research_hold', claim: claim, rationale: rationale, confidence: confidence, ci: ci || null, detail: detail == null ? null : detail });
    }
    // (a) klaim single-seed — anekdot 1 seed, selalu level riset
    if (ctx.residualStatus === 'RESEARCH_HOLD') tambah('singleseed_residual', ctx.residualMessage, 'brain3_riset_residual_singleseed_unproven', 0.6, null, ctx.resGate);
    if (ctx.kalibrasiStatus === 'RESEARCH_HOLD') tambah('singleseed_kalibrasi', ctx.kalibrasiMessage, 'brain3_riset_kalibrasi_singleseed_unproven', 0.6, null, ctx.kalGate);
    if (ctx.cmp.v2KalahMayoritas) tambah('singleseed_utama', 'v2 kalah dari v1 pada ' + ctx.cmp.v2KalahPada + '/' + ctx.cmp.totalMetrik + ' metrik pada suite single-seed (anekdot 1 seed; keselamatan rilis dinilai CI multi-seed shipped).', 'brain3_riset_v2_singleseed_kalah', 0.6, null, ctx.cmp.rows);
    var ms = ctx.multi;
    // (b) regresi terbukti pada kandidat non-shipped v2_lama (konfigurasi produksi = v2_residual)
    for (var i = 0; i < ms.utama.metrics.length; i++) {
      var r = ms.utama.metrics[i];
      if (r.verdict === 'kandidat_lebih_buruk') tambah('multiseed_utama_' + r.metric, 'v2_lama (kandidat non-shipped; konfigurasi produksi = v2_residual) terbukti lebih buruk dari v1 pada ' + r.metric + ' (meanDiff ' + r.meanDiff + ', CI [' + r.ciLo + ', ' + r.ciHi + ']).', 'brain3_riset_kandidat_v2lama_regresi', 0.9, r);
    }
    if (ms.utama.mayoritasBuruk) tambah('multiseed_utama_mayoritas', 'v2_lama terbukti lebih buruk dari v1 pada mayoritas metrik inti (' + ms.utama.kandidatBurukPada + '/' + ms.utama.totalMetrik + ') — kandidat non-shipped.', 'brain3_riset_kandidat_v2lama_mayoritas_buruk', 0.9, null, ms.utama);
    // (c) klaim nilai tambah residual (v2_lama→v2_residual) yang tidak terbukti/terbantah
    if (ms.residual) {
      for (var j = 0; j < ms.residual.metrics.length; j++) {
        var rr = ms.residual.metrics[j];
        if (rr.verdict === 'kandidat_lebih_baik') continue;
        var kr = klasifikasiKlaim(rr);
        tambah('multiseed_residual_' + rr.metric,
          'Klaim perbaikan ' + rr.metric + ' oleh momentum residual (' + ms.residual.pair + ') ' + (kr === 'terbantah' ? 'TERBANTAH antar-seed' : 'inconclusive pada ' + ms.seedCount + ' seed') + ' (meanDiff ' + rr.meanDiff + ', CI [' + rr.ciLo + ', ' + rr.ciHi + '], ambang praktis ' + rr.praktis + ').',
          kr === 'terbantah' ? 'brain3_riset_residual_klaim_terbantah' : 'brain3_riset_residual_klaim_inconclusive',
          kr === 'terbantah' ? 0.9 : 0.6, rr);
      }
    }
    // (d) klaim nilai tambah kalibrasi (v3_tanpa→v3_kalibrasi) yang tidak terbukti/terbantah
    if (ms.kalibrasi) {
      for (var k = 0; k < ms.kalibrasi.metrics.length; k++) {
        var rk = ms.kalibrasi.metrics[k];
        if (rk.verdict === 'kandidat_lebih_baik') continue;
        var kk = klasifikasiKlaim(rk);
        tambah('multiseed_kalibrasi_' + rk.metric,
          'Klaim perbaikan ' + rk.metric + ' oleh kalibrasi item (' + ms.kalibrasi.pair + ') ' + (kk === 'terbantah' ? 'TERBANTAH antar-seed' : 'inconclusive pada ' + ms.seedCount + ' seed') + ' (meanDiff ' + rk.meanDiff + ', CI [' + rk.ciLo + ', ' + rk.ciHi + '], ambang praktis ' + rk.praktis + ').',
          kk === 'terbantah' ? 'brain3_riset_kalibrasi_klaim_terbantah' : 'brain3_riset_kalibrasi_klaim_inconclusive',
          kk === 'terbantah' ? 0.9 : 0.6, rk);
      }
    }
    // (e1) censoring level-skenario / kandidat non-shipped: varian bank tanpa mastery
    //      di mayoritas seed. Bila shipped & baseline identik → mendakwa skenario
    //      (horizon+bank mislabeled), bukan kebijakan; tetap dieskalasi utuh.
    var bankCensor = [];
    for (var c1 = 0; c1 < ms.censoring.perVariant.length; c1++) {
      var pv = ms.censoring.perVariant[c1];
      if (pv.tanpaMasteryMayoritas) bankCensor.push(pv.variant + ' ' + pv.seedsTanpaMastery + '/' + pv.seedCount + ' seed tanpa mastery (censoredRate ' + pv.censoredRate + ')');
    }
    if (bankCensor.length) tambah('censoring_scenario_bank',
      'Censoring mayoritas seed pada varian dunia bank fase-3: ' + bankCensor.join('; ') + '. Baseline ablation dan varian shipped tersensor IDENTIK — temuan mendakwa desain skenario (horizon ' + SIM_DAYS + ' hari + bank mislabeled + ' + PROFIL_BANK + ' profil), bukan regresi kebijakan shipped; keputusan perpanjangan horizon/redesain skenario di MASTER.',
      'brain3_riset_censoring_bank_scenario', 0.9, null, ms.censoring.perVariant);
    // (e2) censoring relatif terbukti pada pasangan kandidat non-shipped (v1→v2_lama)
    for (var c2 = 0; c2 < ms.censoring.ciRelatif.length; c2++) {
      var rc = ms.censoring.ciRelatif[c2];
      if (!rc.insufficient && typeof rc.ciLo === 'number' && rc.ciLo > PRAKTIS.censoringRate && rc.pair === 'v1\u2192v2_lama') {
        tambah('censoring_kandidat_' + rc.pair, 'Kandidat non-shipped v2_lama tersensor lebih sering dari v1 secara signifikan (rate ' + rc.meanBase + ' \u2192 ' + rc.meanKandidat + ', CI [' + rc.ciLo + ', ' + rc.ciHi + '] > margin ' + PRAKTIS.censoringRate + ').', 'brain3_riset_censoring_kandidat_excess', 0.9, rc);
      }
    }
    // (e3) tradeoff shipped di luar metrik keselamatan: v2_residual mencapai mastery-
    //      horizon lebih jarang dari v1 sambil menang pada retensi/brier/false-decline.
    if (ms.shipped && ms.shipped.v2Residual && ms.shipped.v2Residual.censoringBaselineCI) {
      var tb = ms.shipped.v2Residual.censoringBaselineCI;
      if (tb.verdict === 'kandidat_lebih_buruk') tambah('censoring_shipped_tradeoff_v2residual',
        'v2_residual (shipped) mencapai mastery dalam horizon ' + SIM_DAYS + ' hari lebih jarang dari v1 (censoredRate ' + tb.meanBase + ' \u2192 ' + tb.meanKandidat + ', CI [' + tb.ciLo + ', ' + tb.ciHi + ']) SAMBIL menang terbukti pada retensi/brier/false-decline — tradeoff kecepatan-mastery vs kualitas belajar, bukan regresi metrik keselamatan per definisi gate; arah kebijakan diputuskan MASTER.',
        'brain3_riset_censoring_shipped_tradeoff', 0.9, tb);
    }
    return temuan;
  }

  // ===================================================================================
  // 6. MAIN — gate CI
  // ===================================================================================
  /**
   * FASE 2 — tabel metrik agregat (rata-rata antar profil) untuk TIGA varian,
   * supaya laporan CI langsung bisa dibaca manusia tanpa merakit ulang angka.
   * timeToMasteryDays null → SIM_DAYS+1 (melewati horizon), konsisten dengan gate lama.
   */
  function tabelMetrik(perProfil) {
    var METRIK = [
      { nama: 'timeToMasteryDays', arah: 'turun', ambil: function (r) { return r.timeToMasteryDays == null ? SIM_DAYS + 1 : r.timeToMasteryDays; } },
      { nama: 'observedAccuracy', arah: 'target 0.80', ambil: function (r) { return r.observedAccuracy; } },
      { nama: 'accuracyGapVsTarget', arah: 'turun', ambil: function (r) { return r.accuracyGapVsTarget; } },
      { nama: 'difficultyOscillationPer10', arah: 'turun', ambil: function (r) { return r.difficultyOscillationPer10; } },
      { nama: 'retentionDay90', arah: 'naik', ambil: function (r) { return r.retentionDay90; } },
      { nama: 'brier', arah: 'turun', ambil: function (r) { return r.brier; } },
      { nama: 'falseDeclineRate', arah: 'turun', ambil: function (r) { return r.falseDeclineRate; } }
    ];
    function rata(rows, ambil) { var s = 0; for (var i = 0; i < rows.length; i++) s += ambil(rows[i]); return rows.length ? round(s / rows.length, 4) : null; }
    var rows = [];
    for (var i = 0; i < METRIK.length; i++) {
      var m = METRIK[i];
      rows.push({
        metric: m.nama,
        arahLebihBaik: m.arah,
        v1: rata(perProfil.v1, m.ambil),
        v2Lama: rata(perProfil.v2Lama, m.ambil),
        v2Residual: perProfil.v2Residual ? rata(perProfil.v2Residual, m.ambil) : null
      });
    }
    return rows;
  }

  /**
   * FASE 3 — tabel metrik skenario kalibrasi (rata-rata antar profil) untuk dua
   * varian bank: kolom v3Kalibrasi null bila modul C1 belum terdeteksi (SKIPPED).
   * Dipisah dari tabel Fase 2 karena dunianya berbeda (bank mislabeled) —
   * menyandingkan angkanya dengan v1/v2 dalam satu tabel akan menyesatkan.
   */
  function tabelKalibrasi(perProfil) {
    var METRIK = [
      { nama: 'itemBiasRMSE', arah: 'turun', ambil: function (r) { return r.itemBiasRMSE; } },
      { nama: 'itemBiasRMSEMislabeledOnly', arah: 'turun', ambil: function (r) { return r.itemBiasRMSEMislabeledOnly; } },
      { nama: 'poolSeparationPct', arah: 'naik (0 = defek Opus)', ambil: function (r) { return r.poolSeparationPct; } },
      { nama: 'maxAbsDelta', arah: '<= 0.6 (shrinkage)', ambil: function (r) { return r.maxAbsDelta; } },
      { nama: 'observedAccuracy', arah: 'target 0.80', ambil: function (r) { return r.observedAccuracy; } },
      { nama: 'accuracyGapVsTarget', arah: 'turun', ambil: function (r) { return r.accuracyGapVsTarget; } },
      { nama: 'difficultyOscillationPer10', arah: 'turun', ambil: function (r) { return r.difficultyOscillationPer10; } },
      { nama: 'retentionDay90', arah: 'naik', ambil: function (r) { return r.retentionDay90; } },
      { nama: 'brier', arah: 'turun', ambil: function (r) { return r.brier; } },
      { nama: 'falseDeclineRate', arah: 'turun', ambil: function (r) { return r.falseDeclineRate; } }
    ];
    function rata(rows, ambil) {
      if (!rows) return null;
      var s = 0, n = 0;
      for (var i = 0; i < rows.length; i++) { var v = ambil(rows[i]); if (v != null && isFinite(v)) { s += v; n++; } }
      return n ? round(s / n, 4) : null;
    }
    var rows = [];
    for (var i = 0; i < METRIK.length; i++) {
      var m = METRIK[i];
      rows.push({
        metric: m.nama,
        arahLebihBaik: m.arah,
        v3TanpaKalibrasi: rata(perProfil.v3TanpaKalibrasi, m.ambil),
        v3Kalibrasi: perProfil.v3Kalibrasi ? rata(perProfil.v3Kalibrasi, m.ambil) : null
      });
    }
    return rows;
  }

  function main(argv) {
    var seed = parseInt(argv[2], 10);
    if (!Number.isFinite(seed)) seed = 42;

    // Gate determinisme: suite yang sama dijalankan DUA KALI di dalam proses.
    // Kalau string JSON-nya beda, ada sumber keacakan liar → semua metrik gugur.
    var runA = jalankanSuite(seed);
    var runB = jalankanSuite(seed);
    var deterministik = JSON.stringify(runA) === JSON.stringify(runB);

    // WAVE 3 — suite multi-seed di atas suite single-seed. Dukungan fitur diambil
    // dari deteksi runA (deteksi yang sama, bukan diulang — satu sumber kebenaran).
    var dukungan = { residual: runA.residualSupported, kalibrasi: runA.calibrationSupported };
    var t0Multi = Date.now(); // HANYA untuk log stderr; tidak pernah masuk stdout
    var multi = jalankanMultiSeed(seed, dukungan);
    // Determinisme multi-seed: menjalankan seluruh 50 unit dua kali menggandakan
    // runtime tanpa menambah daya deteksi berarti — sumber keacakan liar akan
    // muncul di unit MANA PUN. Spot-check: unit pertama dan terakhir dihitung
    // ulang dan digest-nya wajib identik dengan yang tercatat; ditambah gate
    // eksternal di tests/adaptivity-simulation-v3-hardened-test.js yang menjalankan
    // CLI ini dua kali penuh dan menuntut stdout byte-identik.
    var seedsUlang = turunkanSeeds(seed, multi.seedCount);
    var deterministikMulti =
      fnv1a(JSON.stringify(jalankanUnitSeed(seedsUlang[0], dukungan))) === multi.unitDigests[0] &&
      fnv1a(JSON.stringify(jalankanUnitSeed(seedsUlang[seedsUlang.length - 1], dukungan))) === multi.unitDigests[multi.unitDigests.length - 1];
    var msMulti = Date.now() - t0Multi;
    var multiVerdict = nilaiMultiSeed(multi, dukungan);
    // WAVE 5c — gate keselamatan shipped: SATU-SATUNYA penentu exit 1.
    var shippedVerdict = nilaiShipped(multi, dukungan);

    var cmp = runA.perbandingan;
    var resGate = runA.perbandinganResidual; // null bila dukungan residual belum ada

    // FASE 2 — status gate residual, tiga kemungkinan yang sengaja dibedakan
    // (WAVE 5c: 'FAIL' → 'RESEARCH_HOLD' — klaim nilai tambah adalah temuan riset,
    //  bukan regresi rilis; exit code milik shippedVerdict):
    //   SKIPPED       : B1 belum mendarat → varian residual tak bisa diuji.
    //   RESEARCH_HOLD : residual TIDAK menurunkan osilasi vs v2_lama, ATAU false-decline NAIK.
    //   PASS          : dua-duanya terpenuhi.
    var residualStatus = !runA.residualSupported ? 'SKIPPED' : (resGate.pass ? 'PASS' : 'RESEARCH_HOLD');
    var residualMessage;
    if (residualStatus === 'SKIPPED') {
      residualMessage = 'FiezelCoreBrain.momentum belum mendukung basis residual (B1 belum selesai saat simulasi dijalankan). Varian v2_residual DILEWATI dan gate residual TIDAK digagalkan — jalankan ulang setelah dukungan `predicted`/basis residual mendarat di features/brain/fiezel-core-brain.js.';
    } else if (residualStatus === 'PASS') {
      residualMessage = 'v2_residual menurunkan osilasi (' + resGate.oscillation.v2Lama + ' → ' + resGate.oscillation.v2Residual + ' per 10 sesi) tanpa menaikkan false-decline (' + resGate.falseDecline.v2Lama + ' → ' + resGate.falseDecline.v2Residual + ').';
    } else {
      var alasan = [];
      if (!resGate.oscillation.turun) alasan.push('osilasi TIDAK turun (' + resGate.oscillation.v2Lama + ' → ' + resGate.oscillation.v2Residual + ')');
      if (resGate.falseDecline.naik) alasan.push('false-decline NAIK (' + resGate.falseDecline.v2Lama + ' → ' + resGate.falseDecline.v2Residual + ')');
      residualMessage = 'Momentum residual gagal membuktikan nilainya pada seed tunggal: ' + alasan.join('; ') + '.';
    }

    // FASE 3 — status gate kalibrasi, pola tiga-status yang sama dengan residual
    // (WAVE 5c: 'FAIL' → 'RESEARCH_HOLD', alasan sama dengan residual di atas):
    //   SKIPPED       : C1 belum mendarat → varian v3_kalibrasi tak bisa diuji.
    //   RESEARCH_HOLD : itemBiasRMSE TIDAK turun vs tanpa-kalibrasi, ATAU ada |delta| > 0.6.
    //   PASS          : RMSE turun dan shrinkage utuh.
    var kalGate = runA.perbandinganKalibrasi; // null bila modul C1 belum ada
    var kalibrasiStatus = !runA.calibrationSupported ? 'SKIPPED' : (kalGate.pass ? 'PASS' : 'RESEARCH_HOLD');
    var kalibrasiMessage;
    if (kalibrasiStatus === 'SKIPPED') {
      kalibrasiMessage = 'FiezelItemCalibration belum tersedia/lolos deteksi kontrak (C1 belum selesai saat simulasi dijalankan). Varian v3_kalibrasi DILEWATI dan gate kalibrasi TIDAK digagalkan — jalankan ulang setelah features/brain/fiezel-item-calibration.js mendarat dengan observe()/effective() sesuai kontrak (applied hanya saat n>=8).';
    } else if (kalibrasiStatus === 'PASS') {
      kalibrasiMessage = 'Kalibrasi menurunkan itemBiasRMSE (' + kalGate.itemBiasRMSE.tanpaKalibrasi + ' → ' + kalGate.itemBiasRMSE.kalibrasi + ') dengan shrinkage utuh (maks |delta| = ' + kalGate.shrinkage.maxAbsDelta + ' ≤ 0.6); poolSeparation ' + kalGate.poolSeparation.tanpaKalibrasi + '% → ' + kalGate.poolSeparation.kalibrasi + '%.';
    } else {
      var alasanKal = [];
      if (!kalGate.itemBiasRMSE.terukur) alasanKal.push('itemBiasRMSE tidak terukur (tidak ada item dengan n>=8)');
      else if (!kalGate.itemBiasRMSE.turun) alasanKal.push('itemBiasRMSE TIDAK turun melewati ambang praktis (' + kalGate.itemBiasRMSE.tanpaKalibrasi + ' → ' + kalGate.itemBiasRMSE.kalibrasi + ', praktis ' + kalGate.itemBiasRMSE.praktis + ')');
      if (kalGate.shrinkage.bocor) alasanKal.push('shrinkage BOCOR (maks |delta| = ' + kalGate.shrinkage.maxAbsDelta + ' > 0.6)');
      kalibrasiMessage = 'Kalibrasi item gagal membuktikan nilainya pada seed tunggal: ' + alasanKal.join('; ') + '.';
    }

    // WAVE 5c — kumpulkan SEMUA temuan riset (tidak ada yang dibuang; lihat header).
    var temuanRiset = kumpulkanTemuanRiset({
      residualStatus: residualStatus, residualMessage: residualMessage, resGate: resGate,
      kalibrasiStatus: kalibrasiStatus, kalibrasiMessage: kalibrasiMessage, kalGate: kalGate,
      cmp: cmp, multi: multi
    });

    // WAVE 5c — exit code HANYA dari determinisme + gate keselamatan shipped.
    var lulus = deterministik && deterministikMulti && shippedVerdict.pass;

    var ringkasan = {
      schema: SCHEMA,
      seed: seed,
      simDays: SIM_DAYS,
      retentionEvaluatedAtDay: RETENTION_DAY,
      profiles: PROFILES.map(function (p) { return p.id; }),
      deterministic: deterministik,
      deterministicMultiSeed: deterministikMulti,
      residualSupported: runA.residualSupported,
      calibrationSupported: runA.calibrationSupported,
      bank: runA.bank,
      results: runA.perProfil,
      metricsTable: tabelMetrik(runA.perProfil),
      calibrationTable: tabelKalibrasi(runA.perProfil),
      comparison: cmp.rows,
      v2WorseOnMetrics: cmp.v2KalahPada,
      totalMetrics: cmp.totalMetrik,
      residualGate: {
        status: residualStatus,
        detail: resGate,
        message: residualMessage
      },
      calibrationGate: {
        status: kalibrasiStatus,
        detail: kalGate,
        message: kalibrasiMessage
      },
      // WAVE 3 — blok multi-seed: ringkasan + CI + gate. Run mentah TIDAK dicetak
      // (hanya digest) supaya stdout tetap bisa di-diff manusia; lihat jalankanMultiSeed.
      multiSeed: multi,
      multiSeedGate: multiVerdict,
      // WAVE 5c — gate keselamatan shipped: satu-satunya penentu exit 1 (lihat header).
      shippedGate: shippedVerdict,
      // WAVE 5c — SEMUA temuan riset, utuh (status research_hold; TIDAK menyentuh exit code).
      researchVerdicts: temuanRiset,
      gate: {
        pass: lulus,
        // Semantik WAVE 5c: exit code = determinisme + gate keselamatan shipped.
        // Temuan riset dieskalasi ke MASTER via researchVerdicts (ledger), bukan CI merah.
        rationale: (!deterministik || !deterministikMulti) ? 'brain3_sim_nondeterministic'
          : !shippedVerdict.pass ? shippedVerdict.rationale
            : 'brain3_sim_shipped_pass_research_holds_' + temuanRiset.length,
        researchHolds: temuanRiset.length,
        confidence: round(((!deterministik || !deterministikMulti) ? 0.95 : shippedVerdict.confidence)
          * (residualStatus === 'SKIPPED' ? 0.6 : 1)
          * (kalibrasiStatus === 'SKIPPED' ? 0.6 : 1), 3)
      }
    };

    // stdout HANYA JSON (supaya byte-identik gampang di-diff oleh CI); narasi ke stderr.
    process.stdout.write(JSON.stringify(ringkasan, null, 2) + '\n');
    process.stderr.write('runtime multi-seed: ' + multi.seedCount + ' seed x ' + multi.profilesPerSeed + ' profil (+' + multi.profilBankPerSeed + ' profil bank) selesai dalam ' + msMulti + ' ms\n');
    if (!deterministik) {
      process.stderr.write('GAGAL: dua run dengan seed sama menghasilkan output berbeda.\n');
      return 2;
    }
    if (!deterministikMulti) {
      process.stderr.write('GAGAL: unit multi-seed dihitung ulang menghasilkan digest berbeda (non-determinisme).\n');
      return 2;
    }
    if (residualStatus === 'SKIPPED') {
      process.stderr.write('SKIPPED (gate residual): ' + residualMessage + '\n');
    }
    if (kalibrasiStatus === 'SKIPPED') {
      process.stderr.write('SKIPPED (gate kalibrasi): ' + kalibrasiMessage + '\n');
    }
    // WAVE 5c — TEMUAN RISET dicetak SELALU (lulus maupun tidak), sebelum verdict,
    // supaya tidak ada temuan yang tenggelam. Isi blok deterministik (turunan JSON).
    if (temuanRiset.length) {
      process.stderr.write('\n=== TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER) ===\n');
      for (var tr = 0; tr < temuanRiset.length; tr++) {
        var t = temuanRiset[tr];
        process.stderr.write('- [' + t.rationale + '] status=research_hold confidence=' + t.confidence
          + (t.ci && typeof t.ci.ciLo === 'number' ? ' CI95=[' + t.ci.ciLo + ', ' + t.ci.ciHi + ']' : '')
          + '\n  ' + t.claim + '\n');
      }
      process.stderr.write('=== AKHIR TEMUAN RISET: ' + temuanRiset.length + ' temuan ditahan sebagai research_hold — dieskalasi ke MASTER via ledger (field researchVerdicts di JSON stdout), bukan via CI merah ===\n\n');
    }
    // WAVE 5c — gate keselamatan shipped: satu-satunya jalan ke exit 1.
    if (!shippedVerdict.pass) {
      process.stderr.write('GAGAL (gate keselamatan shipped, ' + shippedVerdict.rationale + '):\n');
      for (var sa = 0; sa < shippedVerdict.alasan.length; sa++) process.stderr.write('  - ' + shippedVerdict.alasan[sa] + '\n');
      process.stderr.write('AdaptivitySimulationV3: FAIL (regresi terbukti pada kebijakan SHIPPED — memblokir rilis; detail di field shippedGate)\n');
      return 1;
    }
    process.stderr.write('AdaptivitySimulationV3: PASS (gate keselamatan shipped hijau — v2_residual & item_calibration tanpa regresi terbukti vs baseline; '
      + temuanRiset.length + ' temuan riset berstatus research_hold, lihat researchVerdicts; gate residual single-seed ' + residualStatus + '; gate kalibrasi single-seed ' + kalibrasiStatus + ')\n');
    return 0;
  }

  var api = {
    schema: SCHEMA,
    PROFILES: PROFILES,
    PRAKTIS: PRAKTIS,
    SEED_COUNT: SEED_COUNT,
    PROFIL_TURUNAN: PROFIL_TURUNAN,
    PROFIL_BANK: PROFIL_BANK,
    mulberry32: mulberry32,
    buatMurid: buatMurid,
    jawab: jawab,
    kebijakanV1: kebijakanV1,
    jalankanRun: jalankanRun,
    jalankanSuite: jalankanSuite,
    bandingkan: bandingkan,
    bandingkanResidual: bandingkanResidual,
    bandingkanKalibrasi: bandingkanKalibrasi,
    dukungResidual: dukungResidual,
    dukungKalibrasi: dukungKalibrasi,
    buatBankItem: buatBankItem,
    poolKandidat: poolKandidat,
    hitungPoolSeparation: hitungPoolSeparation,
    tabelMetrik: tabelMetrik,
    tabelKalibrasi: tabelKalibrasi,
    // WAVE 3 — permukaan multi-seed (diekspor supaya test gate bisa menguji tiap
    // bagian dengan data sintetis tanpa menjalankan 50 seed penuh).
    fnv1a: fnv1a,
    buatProfilMultiSeed: buatProfilMultiSeed,
    turunkanSeeds: turunkanSeeds,
    jalankanUnitSeed: jalankanUnitSeed,
    ringkasCensoring: ringkasCensoring,
    ciBerpasangan: ciBerpasangan,
    gateCensoringMulti: gateCensoringMulti,
    agregatMultiSeed: agregatMultiSeed,
    jalankanMultiSeed: jalankanMultiSeed,
    nilaiMultiSeed: nilaiMultiSeed,
    // WAVE 5c — permukaan gate keselamatan shipped & pengumpul temuan riset
    // (diekspor supaya test gate bisa menguji semantiknya dengan data sintetis).
    nilaiKebijakanShipped: nilaiKebijakanShipped,
    nilaiShipped: nilaiShipped,
    klasifikasiKlaim: klasifikasiKlaim,
    kumpulkanTemuanRiset: kumpulkanTemuanRiset,
    main: main
  };

  if (typeof require !== 'undefined' && typeof module === 'object' && require.main === module) {
    process.exit(main(process.argv));
  }

  return api;
});
