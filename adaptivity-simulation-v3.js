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

  /**
   * FASE 2 — perbandingan v2_lama vs v2_residual untuk gate residual:
   * dua klaim yang harus dibuktikan momentum residual, dua-duanya diukur agregat
   * antar profil (rata-rata):
   *   1. osilasi kesulitan TURUN (alasan keberadaan fitur ini — temuan A11);
   *   2. false-decline TIDAK NAIK (kalau naik, 'perbaikan' osilasi cuma karena
   *      momentum jadi tuli, bukan jadi benar).
   */
  function bandingkanResidual(hasilLama, hasilResidual) {
    var EPS = 1e-9;
    function rata(rows, ambil) { var s = 0; for (var i = 0; i < rows.length; i++) s += ambil(rows[i]); return rows.length ? s / rows.length : 0; }
    var oscLama = rata(hasilLama, function (r) { return r.difficultyOscillationPer10; });
    var oscRes = rata(hasilResidual, function (r) { return r.difficultyOscillationPer10; });
    var fdLama = rata(hasilLama, function (r) { return r.falseDeclineRate; });
    var fdRes = rata(hasilResidual, function (r) { return r.falseDeclineRate; });
    var osilasiTurun = oscRes < oscLama - EPS;
    var falseDeclineNaik = fdRes > fdLama + EPS;
    return {
      oscillation: { v2Lama: round(oscLama, 4), v2Residual: round(oscRes, 4), turun: osilasiTurun },
      falseDecline: { v2Lama: round(fdLama, 4), v2Residual: round(fdRes, 4), naik: falseDeclineNaik },
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
    var EPS = 1e-9;
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
    var turun = terukur && rmseKal < rmseTanpa - EPS;
    var bocor = maxDelta > 0.6 + 1e-9;
    return {
      itemBiasRMSE: {
        tanpaKalibrasi: rmseTanpa == null ? null : round(rmseTanpa, 4),
        kalibrasi: rmseKal == null ? null : round(rmseKal, 4),
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

    var cmp = runA.perbandingan;
    var resGate = runA.perbandinganResidual; // null bila dukungan residual belum ada

    // FASE 2 — status gate residual, tiga kemungkinan yang sengaja dibedakan:
    //   SKIPPED: B1 belum mendarat → varian residual tak bisa diuji; BUKAN kegagalan
    //            (jangan menghukum modul yang belum ada), tapi WAJIB terlihat di laporan.
    //   FAIL   : residual TIDAK menurunkan osilasi vs v2_lama, ATAU false-decline NAIK.
    //   PASS   : dua-duanya terpenuhi.
    var residualStatus = !runA.residualSupported ? 'SKIPPED' : (resGate.pass ? 'PASS' : 'FAIL');
    var residualMessage;
    if (residualStatus === 'SKIPPED') {
      residualMessage = 'FiezelCoreBrain.momentum belum mendukung basis residual (B1 belum selesai saat simulasi dijalankan). Varian v2_residual DILEWATI dan gate residual TIDAK digagalkan — jalankan ulang setelah dukungan `predicted`/basis residual mendarat di features/brain/fiezel-core-brain.js.';
    } else if (residualStatus === 'PASS') {
      residualMessage = 'v2_residual menurunkan osilasi (' + resGate.oscillation.v2Lama + ' → ' + resGate.oscillation.v2Residual + ' per 10 sesi) tanpa menaikkan false-decline (' + resGate.falseDecline.v2Lama + ' → ' + resGate.falseDecline.v2Residual + ').';
    } else {
      var alasan = [];
      if (!resGate.oscillation.turun) alasan.push('osilasi TIDAK turun (' + resGate.oscillation.v2Lama + ' → ' + resGate.oscillation.v2Residual + ')');
      if (resGate.falseDecline.naik) alasan.push('false-decline NAIK (' + resGate.falseDecline.v2Lama + ' → ' + resGate.falseDecline.v2Residual + ')');
      residualMessage = 'Momentum residual gagal membuktikan nilainya: ' + alasan.join('; ') + '.';
    }

    // FASE 3 — status gate kalibrasi, pola tiga-status yang sama dengan residual:
    //   SKIPPED: C1 belum mendarat → varian v3_kalibrasi tak bisa diuji; BUKAN
    //            kegagalan, tapi WAJIB terlihat di laporan.
    //   FAIL   : itemBiasRMSE TIDAK turun vs tanpa-kalibrasi, ATAU ada |delta| > 0.6.
    //   PASS   : RMSE turun dan shrinkage utuh.
    var kalGate = runA.perbandinganKalibrasi; // null bila modul C1 belum ada
    var kalibrasiStatus = !runA.calibrationSupported ? 'SKIPPED' : (kalGate.pass ? 'PASS' : 'FAIL');
    var kalibrasiMessage;
    if (kalibrasiStatus === 'SKIPPED') {
      kalibrasiMessage = 'FiezelItemCalibration belum tersedia/lolos deteksi kontrak (C1 belum selesai saat simulasi dijalankan). Varian v3_kalibrasi DILEWATI dan gate kalibrasi TIDAK digagalkan — jalankan ulang setelah features/brain/fiezel-item-calibration.js mendarat dengan observe()/effective() sesuai kontrak (applied hanya saat n>=8).';
    } else if (kalibrasiStatus === 'PASS') {
      kalibrasiMessage = 'Kalibrasi menurunkan itemBiasRMSE (' + kalGate.itemBiasRMSE.tanpaKalibrasi + ' → ' + kalGate.itemBiasRMSE.kalibrasi + ') dengan shrinkage utuh (maks |delta| = ' + kalGate.shrinkage.maxAbsDelta + ' ≤ 0.6); poolSeparation ' + kalGate.poolSeparation.tanpaKalibrasi + '% → ' + kalGate.poolSeparation.kalibrasi + '%.';
    } else {
      var alasanKal = [];
      if (!kalGate.itemBiasRMSE.terukur) alasanKal.push('itemBiasRMSE tidak terukur (tidak ada item dengan n>=8)');
      else if (!kalGate.itemBiasRMSE.turun) alasanKal.push('itemBiasRMSE TIDAK turun (' + kalGate.itemBiasRMSE.tanpaKalibrasi + ' → ' + kalGate.itemBiasRMSE.kalibrasi + ')');
      if (kalGate.shrinkage.bocor) alasanKal.push('shrinkage BOCOR (maks |delta| = ' + kalGate.shrinkage.maxAbsDelta + ' > 0.6)');
      kalibrasiMessage = 'Kalibrasi item gagal membuktikan nilainya: ' + alasanKal.join('; ') + '.';
    }

    var lulus = deterministik && !cmp.v2KalahMayoritas && residualStatus !== 'FAIL' && kalibrasiStatus !== 'FAIL';

    var ringkasan = {
      schema: SCHEMA,
      seed: seed,
      simDays: SIM_DAYS,
      retentionEvaluatedAtDay: RETENTION_DAY,
      profiles: PROFILES.map(function (p) { return p.id; }),
      deterministic: deterministik,
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
      gate: {
        pass: lulus,
        rationale: !deterministik ? 'brain3_sim_nondeterministic'
          : cmp.v2KalahMayoritas ? 'brain3_sim_v2_regression'
            : residualStatus === 'FAIL' ? 'brain3_sim_residual_no_improvement'
              : kalibrasiStatus === 'FAIL' ? (kalGate.shrinkage.bocor ? 'brain3_sim_kalibrasi_shrinkage_leak' : 'brain3_sim_kalibrasi_no_improvement')
                : 'brain3_sim_pass_residual_' + residualStatus.toLowerCase() + '_kalibrasi_' + kalibrasiStatus.toLowerCase(),
        confidence: round((1 - cmp.v2KalahPada / cmp.totalMetrik)
          * (residualStatus === 'SKIPPED' ? 0.6 : 1)
          * (kalibrasiStatus === 'SKIPPED' ? 0.6 : 1), 3)
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
    if (residualStatus === 'FAIL') {
      process.stderr.write('GAGAL (gate residual): ' + residualMessage + '\n');
      return 1;
    }
    if (kalibrasiStatus === 'FAIL') {
      process.stderr.write('GAGAL (gate kalibrasi): ' + kalibrasiMessage + '\n');
      return 1;
    }
    if (residualStatus === 'SKIPPED') {
      process.stderr.write('SKIPPED (gate residual): ' + residualMessage + '\n');
    }
    if (kalibrasiStatus === 'SKIPPED') {
      process.stderr.write('SKIPPED (gate kalibrasi): ' + kalibrasiMessage + '\n');
    }
    process.stderr.write('AdaptivitySimulationV3: PASS (v2 kalah pada ' + cmp.v2KalahPada + '/' + cmp.totalMetrik + ' metrik; gate residual ' + residualStatus + '; gate kalibrasi ' + kalibrasiStatus + ')\n');
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
    bandingkanResidual: bandingkanResidual,
    bandingkanKalibrasi: bandingkanKalibrasi,
    dukungResidual: dukungResidual,
    dukungKalibrasi: dukungKalibrasi,
    buatBankItem: buatBankItem,
    poolKandidat: poolKandidat,
    hitungPoolSeparation: hitungPoolSeparation,
    tabelMetrik: tabelMetrik,
    tabelKalibrasi: tabelKalibrasi,
    main: main
  };

  if (typeof require !== 'undefined' && typeof module === 'object' && require.main === module) {
    process.exit(main(process.argv));
  }

  return api;
});
