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
 * Aturan kontrak yang dipatuhi (BRAINCORE-V3-CONTRACTS.md):
 *   - modul murni: tanpa DOM/network/storage, tanpa Math.random tanpa seed,
 *     waktu selalu argumen (NOW konstan, bukan Date.now());
 *   - pola UMD sama dengan features/brain/fiezel-core-brain.js;
 *   - keputusan gate membawa `rationale` berprefiks brain3_;
 *   - keluaran ringkasan JSON ke stdout (log proses ke stderr), exit non-zero
 *     bila v2 lebih buruk dari v1 pada mayoritas metrik ATAU determinisme gagal.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAdaptivitySimulationV3 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var brain = require('./features/brain/fiezel-core-brain.js');

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
  function jalankanRun(profile, policyName, seed) {
    var murid = buatMurid(profile, mulberry32(seed));
    var observed = [];        // satu-satunya hal yang boleh dilihat kebijakan
    var stateV1 = buatStateV1();
    var lastSessionAttempts = [];
    var difficulties = [];    // targetDifficulty per sesi (untuk osilasi)
    var brierSum = 0, brierN = 0;
    var masteryDay = null;
    var itemCounter = {};

    for (var day = 0; day < SIM_DAYS; day++) {
      var nowMs = NOW + day * DAY;

      // Drift laten harian (mis. profil menurun): terjadi PADA murid, tak terlihat kebijakan.
      if (day > 0 && profile.driftHarian !== 0) {
        for (var f = 0; f < FAMILIES.length; f++) {
          murid.theta[FAMILIES[f]] = clamp(murid.theta[FAMILIES[f]] + profile.driftHarian, 0.3, 6.7);
        }
      }

      // --- keputusan kebijakan hari ini (hanya dari data teramati) ---
      var base = kebijakanV1(observed, stateV1);
      var policy = base;
      var abilityUntukPrediksi = brain.estimateAbility(observed, { now: nowMs, prior: 1.5 }).ability;
      if (policyName === 'v2') {
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
        // Pool 6 item per keluarga×difficulty; rotasi deterministik supaya memori per-item terisi.
        var key = family + ':d' + d;
        itemCounter[key] = (itemCounter[key] || 0) + 1;
        var itemId = key + ':i' + (itemCounter[key] % 6);

        // Prediksi DICATAT DULU (kalibrasi jujur), baru hasilnya dibangkitkan.
        var prediksi = brain.successProbability(abilityUntukPrediksi, d);
        var benar = jawab(murid, family, d);
        brierSum += Math.pow(prediksi - (benar ? 1 : 0), 2);
        brierN++;

        belajar(murid, family, d, benar);
        perbaruiMemori(murid, itemId, d, benar, nowMs + q * 120000);

        var row = {
          at: nowMs + q * 120000,
          ok: benar,
          ms: 3000 + Math.floor(murid.rng() * 4000),
          type: 'grammar',
          skill: family,
          family: family,
          difficulty: d
        };
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

    return {
      policy: policyName,
      profil: profile.id,
      seed: seed,
      attempts: observed.length,
      timeToMasteryDays: masteryDay,                    // null = tidak tercapai dalam 35 hari
      observedAccuracy: round(akurasi, 4),
      accuracyGapVsTarget: round(Math.abs(akurasi - 0.8), 4),
      difficultyOscillationPer10: round(osilasiPer10, 3),
      retentionDay90: retN ? round(retSum / retN, 4) : 0,
      brier: brierN ? round(brierSum / brierN, 4) : 1,
      finalTargetDifficulty: difficulties[difficulties.length - 1],
      itemsTracked: retN
    };
  }

  // ===================================================================================
  // 5. PERBANDINGAN + GATE
  // ===================================================================================
  /**
   * Lima metrik, arah "lebih baik" eksplisit:
   *   timeToMastery ↓ (null dihitung 36 = melewati horizon), accuracyGapVsTarget ↓,
   *   oscillation ↓, retentionDay90 ↑, brier ↓.
   * Skor agregat: rata-rata antar profil per metrik, lalu v2 dibandingkan v1 dengan
   * toleransi kecil (seri ≠ kalah). Gate gagal bila v2 kalah pada ≥3 dari 5 metrik.
   */
  function bandingkan(hasilV1, hasilV2) {
    var METRIK = [
      { nama: 'timeToMasteryDays', arah: 'turun', ambil: function (r) { return r.timeToMasteryDays == null ? SIM_DAYS + 1 : r.timeToMasteryDays; } },
      { nama: 'accuracyGapVsTarget', arah: 'turun', ambil: function (r) { return r.accuracyGapVsTarget; } },
      { nama: 'difficultyOscillationPer10', arah: 'turun', ambil: function (r) { return r.difficultyOscillationPer10; } },
      { nama: 'retentionDay90', arah: 'naik', ambil: function (r) { return r.retentionDay90; } },
      { nama: 'brier', arah: 'turun', ambil: function (r) { return r.brier; } }
    ];
    var EPS = 1e-9;
    var rows = [];
    var kalah = 0;
    for (var i = 0; i < METRIK.length; i++) {
      var m = METRIK[i];
      var a1 = 0, a2 = 0;
      for (var p = 0; p < hasilV1.length; p++) { a1 += m.ambil(hasilV1[p]); a2 += m.ambil(hasilV2[p]); }
      a1 /= hasilV1.length; a2 /= hasilV2.length;
      var v2Kalah = m.arah === 'turun' ? (a2 > a1 + EPS) : (a2 < a1 - EPS);
      if (v2Kalah) kalah++;
      rows.push({ metric: m.nama, arahLebihBaik: m.arah, v1: round(a1, 4), v2: round(a2, 4), v2LebihBuruk: v2Kalah });
    }
    return { rows: rows, v2KalahPada: kalah, totalMetrik: METRIK.length, v2KalahMayoritas: kalah > METRIK.length / 2 };
  }

  /** Satu suite penuh (3 profil × 2 kebijakan) untuk satu seed — dipakai dua kali
   *  oleh gate determinisme dan hasilnya harus identik string-demi-string. */
  function jalankanSuite(seed) {
    var v1 = [], v2 = [];
    for (var p = 0; p < PROFILES.length; p++) {
      // Seed diturunkan per profil supaya tiap profil punya deret sendiri, dan v1/v2
      // memakai deret yang SAMA → keacakan berpasangan (paired), perbandingan lebih adil.
      var seedProfil = (seed * 1000003 + p * 7919) >>> 0;
      v1.push(jalankanRun(PROFILES[p], 'v1', seedProfil));
      v2.push(jalankanRun(PROFILES[p], 'v2', seedProfil));
    }
    return { seed: seed, perProfil: { v1: v1, v2: v2 }, perbandingan: bandingkan(v1, v2) };
  }

  // ===================================================================================
  // 6. MAIN — gate CI
  // ===================================================================================
  function main(argv) {
    var seed = parseInt(argv[2], 10);
    if (!Number.isFinite(seed)) seed = 42;

    // Gate determinisme: suite yang sama dijalankan DUA KALI di dalam proses.
    // Kalau string JSON-nya beda, ada sumber keacakan liar → semua metrik gugur.
    var runA = jalankanSuite(seed);
    var runB = jalankanSuite(seed);
    var deterministik = JSON.stringify(runA) === JSON.stringify(runB);

    var cmp = runA.perbandingan;
    var lulus = deterministik && !cmp.v2KalahMayoritas;

    var ringkasan = {
      schema: SCHEMA,
      seed: seed,
      simDays: SIM_DAYS,
      retentionEvaluatedAtDay: RETENTION_DAY,
      profiles: PROFILES.map(function (p) { return p.id; }),
      deterministic: deterministik,
      results: runA.perProfil,
      comparison: cmp.rows,
      v2WorseOnMetrics: cmp.v2KalahPada,
      totalMetrics: cmp.totalMetrik,
      gate: {
        pass: lulus,
        rationale: !deterministik ? 'brain3_sim_nondeterministic'
          : cmp.v2KalahMayoritas ? 'brain3_sim_v2_regression'
            : 'brain3_sim_v2_no_regression',
        confidence: round(1 - cmp.v2KalahPada / cmp.totalMetrik, 3)
      }
    };

    // stdout HANYA JSON (supaya byte-identik gampang di-diff oleh CI); narasi ke stderr.
    process.stdout.write(JSON.stringify(ringkasan, null, 2) + '\n');
    if (!deterministik) {
      process.stderr.write('GAGAL: dua run dengan seed sama menghasilkan output berbeda.\n');
      return 2;
    }
    if (cmp.v2KalahMayoritas) {
      process.stderr.write('GAGAL: v2 lebih buruk dari v1 pada ' + cmp.v2KalahPada + '/' + cmp.totalMetrik + ' metrik.\n');
      return 1;
    }
    process.stderr.write('AdaptivitySimulationV3: PASS (v2 kalah pada ' + cmp.v2KalahPada + '/' + cmp.totalMetrik + ' metrik)\n');
    return 0;
  }

  var api = {
    schema: SCHEMA,
    PROFILES: PROFILES,
    mulberry32: mulberry32,
    buatMurid: buatMurid,
    jawab: jawab,
    kebijakanV1: kebijakanV1,
    jalankanRun: jalankanRun,
    jalankanSuite: jalankanSuite,
    bandingkan: bandingkan,
    main: main
  };

  if (typeof require !== 'undefined' && typeof module === 'object' && require.main === module) {
    process.exit(main(process.argv));
  }

  return api;
});
