#!/usr/bin/env node
/**
 * ADAPTIVITY SIMULATION v3 — EXTENDED (multi-seed, censoring, CI bootstrap).
 * Tulis-ulang JUJUR dari pengerasan PR #226 yang dicabut saat rebase
 * (commit fe62a95 di branch brain-learning-infra-v1; versi keras: 7e2db07).
 *
 * KENAPA FILE BARU, BUKAN EDIT adaptivity-simulation-v3.js
 * ---------------------------------------------------------
 * adaptivity-simulation-v3.js adalah GATE CI aktif (step 'Gerbang simulasi
 * adaptivitas v3' di quality.yml). File ini TIDAK menggantikannya dan TIDAK
 * mengubahnya satu byte pun — ia MENUMPANG pada API publiknya (require) dan
 * menambah lapisan multi-seed di atasnya. File ini SENGAJA tidak didaftarkan
 * sebagai gate CI: verdict-nya bisa merah karena TEMUAN NYATA tentang brain
 * (lihat forensik di bawah), dan gate CI yang merah permanen untuk PR yang
 * tidak bersalah adalah gate yang akan dimatikan orang. Yang masuk CI hanya
 * tests/adaptivity-simulation-v3-extended-selftest.js — penjaga MEKANISME gate ini
 * (arah perbandingan, determinisme, kejujuran pesan), bukan verdict brain-nya.
 *
 * FORENSIK — kenapa versi keras 7e2db07 GAGAL 3 gate, dan apa yang jujur
 * ----------------------------------------------------------------------
 * Direproduksi 2026-08-29 terhadap main 42a5e89 (seed 42, 50 seed × 9 profil):
 *
 * (1) GATE KALIBRASI — BUG HARNESS (pesan) + AMBANG TIDAK JUJUR.
 *     Pesan gagalnya: "itemBiasRMSE TIDAK turun (0.2694 → 0.2622)". Angka itu
 *     TURUN 0.0072. Kodenya menguji `rmseKal < rmseTanpa - 0.02` lalu mencetak
 *     "TIDAK turun" untuk SEMUA kegagalan — pesan berbohong tentang arah.
 *     Ambang 0.02 sendiri angka ajaib: CI bootstrap multi-seed-nya sendiri
 *     bilang selisih RMSE −0.0028 dengan CI [−0.012, +0.0064] — inconclusive,
 *     bukan "lebih buruk". Menjatuhkan FAIL keras karena "manfaat belum
 *     terbukti" membuat gate merah permanen. Di sini: FAIL hanya bila RMSE
 *     TERBUKTI memburuk melewati margin praktis (CI utuh di sisi buruk) atau
 *     kontrak shrinkage bocor; manfaat-belum-terbukti = WARN + temuan.
 *
 * (2) GATE RESIDUAL (multi-seed) — DESAIN GATE TIDAK KONSISTEN.
 *     Versi keras menuntut osilasi TERBUKTI membaik (CI menang + praktis) pada
 *     populasi 9 profil. Hasilnya: selisih +0.167 per 10 sesi, CI [0.054,
 *     0.275] — signifikan statistik tapi DI BAWAH ambang praktisnya sendiri
 *     (0.5). Gate itu menghukum efek yang menurut definisinya sendiri remeh.
 *     Di sini: FAIL hanya bila TERBUKTI memburuk melewati praktis pada salah
 *     satu metrik; PASS bila ada ≥1 manfaat terbukti (falseDecline: −0.0415,
 *     CI [−0.0463, −0.0371] — terbukti); sisanya WARN. Temuan nyata yang
 *     tinggal: manfaat osilasi residual TIDAK menggeneralisasi ke populasi
 *     ber-jitter (di 3 profil asli turun 4.22→3.43; di 9 profil malah +0.17).
 *
 * (3) GATE CENSORING — SEBAGIAN BUG DESAIN, SEBAGIAN TEMUAN NYATA.
 *     BUG DESAIN: aturan mutlak "tak pernah mastery di mayoritas seed" ikut
 *     diberlakukan pada varian DIAGNOSTIK dunia-bank (v3_tanpa_kalibrasi &
 *     v3_kalibrasi, 43/50 seed) — keduanya baseline & kandidat perbandingan
 *     RMSE yang gagal BERSAMA-SAMA, jadi aturan itu tidak membedakan defek
 *     kandidat dari dunia yang memang sulit (bank mislabeled, 3 profil).
 *     Aturan mutlak di sini hanya berlaku pada varian KEBIJAKAN di dunia
 *     populasi (v1/v2_lama/v2_residual); varian bank cukup dibandingkan
 *     berpasangan (v3t→v3k).
 *     TEMUAN NYATA (dipertahankan sebagai FAIL): v2_lama tersensor 89.8% run
 *     vs v1 55.6% (CI selisih [0.298, 0.387] >> margin 0.05) — run-mastery
 *     10.2% vs 44.4% dalam horizon 35 hari. Ini konfirmasi temuan pra-rebase
 *     PR #226 (11,8% vs 56,6%) pada basis baru. Itu fakta tentang brain
 *     (refinePolicy menukar kecepatan mastery dengan akurasi/retensi/brier
 *     yang semuanya TERBUKTI lebih baik) — TIDAK diperbaiki di PR ini;
 *     kandidat wave berikut. Gate ini melaporkannya apa adanya.
 *
 * PRINSIP GATE JUJUR
 * ------------------
 *   - KEPUTUSAN DARI INTERVAL: klaim menang/kalah wajib keluar dari CI
 *     bootstrap berpasangan 95% (persentil, seed deterministik), BUKAN dari
 *     selisih titik.
 *   - MARGIN PRAKTIS ≠ AMBANG LULUS: PRAKTIS dipakai untuk membedakan efek
 *     terbukti-tapi-remeh dari efek yang berarti; ia TIDAK pernah sendirian
 *     menjatuhkan FAIL. FAIL butuh CI utuh di sisi buruk DAN efek > praktis.
 *   - TIGA LAPIS STATUS: FAIL = terbukti memburuk / kontrak bocor / rusak
 *     mutlak; WARN = klaim manfaat belum terbukti (temuan, bukan blokir);
 *     PASS = tidak ada bukti memburuk (+ manfaat terbukti bila gate-nya
 *     gate-keberadaan-fitur). SKIPPED = modul belum ada (feature-detect).
 *   - PESAN TIDAK BOLEH BERBOHONG TENTANG ARAH: pesan selalu menyebut arah
 *     faktual (naik/turun/nyaris tak berubah) + status pembuktian CI —
 *     dijaga selftest (kelas bug "TIDAK turun padahal turun" tidak boleh
 *     kembali).
 *
 * Kontrak determinisme & kemurnian sama dengan base: PRNG mulberry32 berseed,
 * tanpa Math.random, tanpa Date.now, tanpa DOM/jaringan/penyimpanan; stdout
 * HANYA JSON, narasi ke stderr. Exit: 0 = tidak ada FAIL (WARN boleh),
 * 1 = ada FAIL (temuan/regresi terbukti), 2 = non-determinisme.
 *
 * Pemakaian: node adaptivity-simulation-v3-extended.js [seed=42] [jumlahSeed=50]
 * (argumen jumlahSeed ada supaya selftest bisa menjalankan end-to-end kecil
 * yang cepat; kontrak analisis penuh tetap 50 seed.)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelAdaptivitySimV3Extended = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Base sim = sumber kebenaran untuk dunia simulasi: profil, murid laten,
  // kebijakan v1/v2, bank item, deteksi fitur. TIDAK ada yang diduplikasi.
  var base = require('./adaptivity-simulation-v3.js');

  // ===================================================================================
  // 1. KONFIGURASI
  // ===================================================================================
  /**
   * HORIZON_DAYS wajib sama dengan SIM_DAYS base (base tidak mengekspornya).
   * Definisi censoring: timeToMasteryDays null ATAU >= horizon — mastery tepat
   * di hari terakhir tidak bisa dibedakan dari "baru lewat horizon", keduanya
   * disensor. Guard runtime: run dengan timeToMasteryDays > HORIZON_DAYS berarti
   * konstanta ini kadaluarsa → lempar error keras, jangan diam-diam salah sensor.
   */
  var HORIZON_DAYS = 35;
  var SEED_COUNT = 50;      // kontrak tugas >= 50
  var PROFIL_TURUNAN = 7;   // 3 asli + 7 turunan = 10 profil (kontrak PR #226: 50×10)
  var PROFIL_BANK = 3;      // skenario bank mahal (estimateAbility per penyajian) → 3 profil asli
  var BOOT_ITERS = 3000;

  /**
   * Margin signifikansi PRAKTIS per metrik — penilaian desain terdokumentasi
   * (identik dengan versi keras 7e2db07 supaya angkanya bisa dibandingkan),
   * TAPI perannya berubah: di sini margin HANYA memisahkan efek terbukti-remeh
   * dari efek berarti. Ia tidak pernah menjatuhkan FAIL tanpa CI.
   *   - timeToMasteryDays 1.0 : di bawah satu hari jadwal murid tidak berubah.
   *   - accuracyGapVsTarget 0.02 : 2pp di sekitar target 0.80 tak teramati murid.
   *   - difficultyOscillationPer10 0.5 : setengah perpindahan per 10 sesi.
   *   - retentionDay90 0.02 : di bawah presisi model FSRS-lite.
   *   - brier 0.01 : di bawah itu kalibrasi prediksi tidak berubah berarti.
   *   - itemBiasRMSE 0.02 : geser successProbability < 1pp pada skala 1..6.
   *   - falseDeclineRate 0.02 : 2pp evaluasi momentum.
   *   - poolSeparationPct 5 : di bawah 5pp himpunan kandidat praktis sama.
   *   - censoringRate 0.05 : margin non-inferioritas proporsi run tersensor.
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

  // Batas kontrak C1 (fiezel-item-calibration): clamp keras ±0.6 dari prior.
  // Ini batas KONTRAK eksak, bukan efek — toleransi float 1e-9, bukan CI.
  var SHRINKAGE_BATAS = 0.6;

  function round(x, d) {
    var f = Math.pow(10, d);
    return Math.round(x * f) / f;
  }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  // ===================================================================================
  // 2. BOOTSTRAP BERPASANGAN — modul resmi bila ada, fallback vendored bila belum
  // ===================================================================================
  /**
   * features/brain/fiezel-stat-gate.js adalah implementasi yang diaudit (PR #226,
   * branch brain-learning-infra-v1) tetapi BELUM ada di main. Feature-detect pola
   * yang sama dengan dukungResidual/dukungKalibrasi base: pakai modul resmi bila
   * tersedia; bila belum, fallback ke salinan algoritma yang SAMA persis
   * (mulberry32 + resample mean + CI persentil 2.5/97.5) di bawah — deterministik,
   * seed sama = CI sama, dan otomatis tergantikan begitu stat-gate mendarat.
   */
  function pairedBootstrapLokal(pairs, iters, seed) {
    var diffs = [];
    if (Array.isArray(pairs)) {
      for (var i = 0; i < pairs.length; i++) {
        var p = pairs[i];
        if (Array.isArray(p) && p.length >= 2 &&
          typeof p[0] === 'number' && isFinite(p[0]) &&
          typeof p[1] === 'number' && isFinite(p[1])) diffs.push(p[1] - p[0]);
      }
    }
    if (diffs.length < 2) return { insufficient: true, n: diffs.length };
    var it = (typeof iters === 'number' && isFinite(iters) && iters >= 100) ? Math.floor(iters) : 2000;
    var sd = (typeof seed === 'number' && isFinite(seed)) ? Math.floor(seed) : 42;
    var rng = base.mulberry32(sd >>> 0);
    var n = diffs.length;
    var means = new Array(it);
    for (var k = 0; k < it; k++) {
      var sum = 0;
      for (var j = 0; j < n; j++) sum += diffs[(rng() * n) | 0];
      means[k] = sum / n;
    }
    means.sort(function (x, y) { return x - y; });
    var loIdx = Math.max(0, Math.floor(0.025 * it));
    var hiIdx = Math.min(it - 1, Math.ceil(0.975 * it) - 1);
    var total = 0;
    for (var m = 0; m < n; m++) total += diffs[m];
    return { n: n, iters: it, seed: sd, meanDiff: total / n, ciLo: means[loIdx], ciHi: means[hiIdx] };
  }

  function ambilBootstrap() {
    try {
      var sg = require('./features/brain/fiezel-stat-gate.js');
      if (sg && typeof sg.pairedBootstrap === 'function') {
        return { fn: sg.pairedBootstrap, sumber: 'features/brain/fiezel-stat-gate.js' };
      }
    } catch (e) { /* belum mendarat di main — fallback di bawah */ }
    return { fn: pairedBootstrapLokal, sumber: 'fallback-lokal (algoritma identik stat-gate)' };
  }
  var BOOT = ambilBootstrap();

  // ===================================================================================
  // 3. POPULASI PROFIL + SEED TURUNAN (deterministik)
  // ===================================================================================
  /**
   * 3 profil ASLI base apa adanya (referensi objek sama — tidak diubah satu angka
   * pun) + PROFIL_TURUNAN profil turunan ber-jitter deterministik dari seed.
   * Konsumsi RNG per turunan KONSTAN (lima tarikan, dipakai atau tidak) supaya
   * menambah parameter kelak tidak menggeser turunan lain. Jitter dijepit ke
   * rentang murid yang plausibel: theta ±0.4, laju ±25%, redaman ±30%,
   * drift ±0.02/hari, slip ±3pp.
   */
  function buatProfilPopulasi(seed) {
    var rng = base.mulberry32(((seed >>> 0) ^ 0x2545F491) >>> 0);
    var profs = base.PROFILES.slice();
    for (var v = 0; v < PROFIL_TURUNAN; v++) {
      var basis = base.PROFILES[v % base.PROFILES.length];
      var dTheta = (rng() * 2 - 1) * 0.4;
      var fLaju = 1 + (rng() * 2 - 1) * 0.25;
      var fRedam = 1 + (rng() * 2 - 1) * 0.30;
      var dDrift = (rng() * 2 - 1) * 0.02;
      var dSlip = (rng() * 2 - 1) * 0.03;
      var thetaAwal = {};
      var fams = Object.keys(basis.thetaAwal);
      for (var f = 0; f < fams.length; f++) {
        thetaAwal[fams[f]] = round(clamp(basis.thetaAwal[fams[f]] + dTheta, 0.4, 4.5), 4);
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

  /** Seed turunan deterministik: Weyl sequence 32-bit (konstanta emas). */
  function turunkanSeeds(seedDasar, jumlah) {
    var seeds = [];
    for (var i = 0; i < jumlah; i++) seeds.push((((seedDasar >>> 0) + Math.imul(i + 1, 0x9E3779B1)) >>> 0));
    return seeds;
  }

  // ===================================================================================
  // 4. UNIT MULTI-SEED + CENSORING
  // ===================================================================================
  /**
   * censored(r): null ATAU >= horizon. Guard: > horizon berarti HORIZON_DAYS
   * tidak lagi sama dengan SIM_DAYS base — konfigurasi kadaluarsa, gagal keras.
   */
  function censored(r) {
    if (r.timeToMasteryDays != null && r.timeToMasteryDays > HORIZON_DAYS) {
      throw new Error('adaptivity-simulation-v3-extended: timeToMasteryDays=' + r.timeToMasteryDays +
        ' > HORIZON_DAYS=' + HORIZON_DAYS + ' — konstanta horizon tidak lagi cocok dengan SIM_DAYS base; perbarui HORIZON_DAYS.');
    }
    return r.timeToMasteryDays == null || r.timeToMasteryDays >= HORIZON_DAYS;
  }

  /**
   * Satu UNIT = semua varian pada satu seed turunan. Pairing dijaga dengan
   * derivasi seedProfil IDENTIK dengan jalankanSuite base (seed*1000003 + p*7919)
   * — tiap varian melihat murid laten yang sama per (seed, profil). Varian bank
   * Fase 3 hanya pada PROFIL_BANK profil pertama (3 profil asli) demi runtime.
   */
  function jalankanUnitSeed(seedUnit, dukungan, jumlahTurunan) {
    var nTurunan = (typeof jumlahTurunan === 'number' && jumlahTurunan >= 0) ? Math.floor(jumlahTurunan) : PROFIL_TURUNAN;
    var profsSemua = buatProfilPopulasi(seedUnit);
    var profs = profsSemua.slice(0, base.PROFILES.length + nTurunan);
    var bank = base.buatBankItem(seedUnit);
    var runs = {
      v1: [], v2Lama: [], v2Residual: dukungan.residual ? [] : null,
      v3TanpaKalibrasi: [], v3Kalibrasi: dukungan.kalibrasi ? [] : null
    };
    for (var p = 0; p < profs.length; p++) {
      var seedProfil = (seedUnit * 1000003 + p * 7919) >>> 0;
      runs.v1.push(base.jalankanRun(profs[p], 'v1', seedProfil));
      runs.v2Lama.push(base.jalankanRun(profs[p], 'v2_lama', seedProfil));
      if (dukungan.residual) runs.v2Residual.push(base.jalankanRun(profs[p], 'v2_residual', seedProfil));
      if (p < PROFIL_BANK) {
        runs.v3TanpaKalibrasi.push(base.jalankanRun(profs[p], 'v3_tanpa_kalibrasi', seedProfil, { bank: bank, kalibrasi: false, kirimPredicted: dukungan.residual }));
        if (dukungan.kalibrasi) runs.v3Kalibrasi.push(base.jalankanRun(profs[p], 'v3_kalibrasi', seedProfil, { bank: bank, kalibrasi: true, kirimPredicted: dukungan.residual }));
      }
    }
    return { seed: seedUnit, profilIds: profs.map(function (pr) { return pr.id; }), runs: runs };
  }

  /**
   * Ringkasan censoring satu varian di seluruh unit. `kebijakanPopulasi` menandai
   * varian yang tunduk aturan MUTLAK (v1/v2_* di dunia populasi). Varian bank
   * TIDAK — lihat forensik butir (3): keduanya gagal bersama-sama di dunia yang
   * memang sulit, aturan mutlak di sana tidak membedakan apa pun.
   */
  function ringkasCensoring(units, kunci, kebijakanPopulasi) {
    var totalRuns = 0, censoredRuns = 0, seedsTanpaMastery = 0, seedCount = 0;
    for (var u = 0; u < units.length; u++) {
      var rows = units[u].runs[kunci];
      if (!rows) continue;
      seedCount++;
      var adaMastery = false;
      for (var i = 0; i < rows.length; i++) {
        totalRuns++;
        if (censored(rows[i])) censoredRuns++; else adaMastery = true;
      }
      if (!adaMastery) seedsTanpaMastery++;
    }
    return {
      variant: kunci,
      kebijakanPopulasi: !!kebijakanPopulasi,
      seedCount: seedCount,
      totalRuns: totalRuns,
      censoredRuns: censoredRuns,
      censoredRate: totalRuns ? round(censoredRuns / totalRuns, 4) : null,
      seedsTanpaMastery: seedsTanpaMastery,
      tanpaMasteryMayoritas: seedCount > 0 && seedsTanpaMastery > seedCount / 2
    };
  }

  // ===================================================================================
  // 5. CI BERPASANGAN + VERDICT EMPAT-NILAI
  // ===================================================================================
  /**
   * Verdict dari CI 95% + margin praktis — EMPAT nilai supaya "signifikan tapi
   * remeh" tidak menyamar jadi apa pun yang lain:
   *   terbukti_lebih_buruk : CI utuh di sisi buruk DAN |meanDiff| > praktis;
   *   terbukti_lebih_baik  : cermin sebaliknya;
   *   terbukti_remeh       : CI utuh di satu sisi TAPI |meanDiff| <= praktis
   *                          (field arahStat menyebut sisinya — jangan dibuang,
   *                          ini bahan temuan);
   *   inconclusive         : CI memeluk nol.
   * HANYA terbukti_lebih_buruk yang boleh menjatuhkan FAIL.
   */
  function klasifikasiVerdict(boot, arah, praktis) {
    if (!boot || boot.insufficient) return { verdict: 'insufficient', arahStat: null };
    var sisiBuruk = arah === 'turun' ? (boot.ciLo > 0) : (boot.ciHi < 0);   // diff = kandidat - base
    var sisiBaik = arah === 'turun' ? (boot.ciHi < 0) : (boot.ciLo > 0);
    var besar = Math.abs(boot.meanDiff) > praktis;
    if (sisiBuruk) return besar ? { verdict: 'terbukti_lebih_buruk', arahStat: 'buruk' } : { verdict: 'terbukti_remeh', arahStat: 'buruk' };
    if (sisiBaik) return besar ? { verdict: 'terbukti_lebih_baik', arahStat: 'baik' } : { verdict: 'terbukti_remeh', arahStat: 'baik' };
    return { verdict: 'inconclusive', arahStat: null };
  }

  /**
   * CI bootstrap berpasangan untuk satu metrik antara dua varian yang urutan
   * run-nya sejajar. saring(r) true → pasangan dibuang (dipakai mengecualikan
   * pasangan tersensor dari timeToMastery — run tersensor tidak punya angka
   * hari yang jujur).
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
    var boot = BOOT.fn(pairs, BOOT_ITERS, seedCI);
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
      row.arahStat = null;
      return row;
    }
    var sA = 0, sB = 0;
    for (var q = 0; q < pairs.length; q++) { sA += pairs[q][0]; sB += pairs[q][1]; }
    row.meanBase = round(sA / pairs.length, 4);
    row.meanKandidat = round(sB / pairs.length, 4);
    row.meanDiff = round(boot.meanDiff, 4);
    row.ciLo = round(boot.ciLo, 4);
    row.ciHi = round(boot.ciHi, 4);
    var k = klasifikasiVerdict(boot, spek.arah, spek.praktis);
    row.verdict = k.verdict;
    row.arahStat = k.arahStat;
    return row;
  }

  // ===================================================================================
  // 6. PESAN JUJUR — arah faktual + status pembuktian, tidak pernah berbohong
  // ===================================================================================
  /**
   * Kelas bug yang dikubur di sini: versi keras mencetak "itemBiasRMSE TIDAK
   * turun (0.2694 → 0.2622)" padahal 0.2622 < 0.2694. Pesan di bawah SELALU
   * menyebut arah faktual dari angkanya (turun/naik/nyaris tak berubah, dengan
   * besarnya), lalu TERPISAH menyebut status pembuktian dari CI. Selftest
   * menuntut: bila kandidat < base, kata "TIDAK turun" haram muncul.
   */
  function pesanArahFaktual(nama, nilaiBase, nilaiKandidat, ciRow) {
    var d = round(nilaiKandidat - nilaiBase, 4);
    var arah = d < 0 ? ('turun ' + round(-d, 4)) : d > 0 ? ('naik ' + round(d, 4)) : 'tidak berubah';
    var s = nama + ' ' + arah + ' (' + round(nilaiBase, 4) + ' \u2192 ' + round(nilaiKandidat, 4) + ')';
    if (ciRow && typeof ciRow.ciLo === 'number') {
      s += '; CI selisih 95% [' + ciRow.ciLo + ', ' + ciRow.ciHi + ']';
      if (ciRow.verdict === 'inconclusive') s += ' memeluk nol \u2014 efek belum terbukti';
      else if (ciRow.verdict === 'terbukti_remeh') s += ' \u2014 terbukti ' + (ciRow.arahStat === 'baik' ? 'membaik' : 'memburuk') + ' tapi di bawah margin praktis ' + ciRow.praktis;
      else if (ciRow.verdict === 'terbukti_lebih_baik') s += ' \u2014 terbukti membaik melewati margin praktis ' + ciRow.praktis;
      else if (ciRow.verdict === 'terbukti_lebih_buruk') s += ' \u2014 terbukti memburuk melewati margin praktis ' + ciRow.praktis;
    }
    return s;
  }

  // ===================================================================================
  // 7. GATE — utama, censoring, residual, kalibrasi
  // ===================================================================================
  /** Utama (v1→v2_lama): FAIL hanya bila kandidat TERBUKTI lebih buruk melewati
   *  praktis pada MAYORITAS metrik inti. (Perilaku ini identik dengan versi keras
   *  — gate ini memang lulus di sana; dipertahankan.) */
  function gateUtama(metrics) {
    var buruk = 0;
    for (var i = 0; i < metrics.length; i++) if (metrics[i].verdict === 'terbukti_lebih_buruk') buruk++;
    var fail = buruk > metrics.length / 2;
    return {
      status: fail ? 'FAIL' : 'PASS',
      kandidatTerbuktiBurukPada: buruk,
      totalMetrik: metrics.length,
      rationale: fail ? 'brain3_simx_utama_regression' : 'brain3_simx_utama_ok'
    };
  }

  /**
   * Censoring:
   *   MUTLAK  : varian KEBIJAKAN POPULASI yang tak pernah mastery pada mayoritas
   *             seed → FAIL (kebijakan yang tak mengantar satu murid pun ke
   *             mastery pada mayoritas dunia bukan kebijakan, itu kerusakan).
   *   RELATIF : per pasangan, CI selisih indikator tersensor; batas BAWAH CI >
   *             margin praktis → kandidat TERBUKTI menyensor lebih sering → FAIL.
   *             (Pra-rebase & basis baru: v1→v2_lama memicu ini — TEMUAN brain,
   *             bukan bug harness; lihat header.)
   */
  function gateCensoring(ringkasan, ciRelatif) {
    var alasan = [];
    var temuan = [];
    for (var i = 0; i < ringkasan.length; i++) {
      if (ringkasan[i].kebijakanPopulasi && ringkasan[i].tanpaMasteryMayoritas) {
        alasan.push('varian ' + ringkasan[i].variant + ' tak pernah mastery pada ' + ringkasan[i].seedsTanpaMastery + '/' + ringkasan[i].seedCount + ' seed (mayoritas) \u2014 rusak mutlak');
      } else if (!ringkasan[i].kebijakanPopulasi && ringkasan[i].tanpaMasteryMayoritas) {
        // dunia bank: dilaporkan sebagai temuan, bukan FAIL — lihat forensik (3)
        temuan.push('varian bank ' + ringkasan[i].variant + ' tak pernah mastery pada ' + ringkasan[i].seedsTanpaMastery + '/' + ringkasan[i].seedCount + ' seed \u2014 dunia bank mislabeled memang sulit; dipakai hanya untuk perbandingan berpasangan RMSE, bukan aturan mutlak');
      }
    }
    var mutlakFail = alasan.length > 0;
    for (var j = 0; j < ciRelatif.length; j++) {
      var r = ciRelatif[j];
      if (!r.insufficient && typeof r.ciLo === 'number' && r.ciLo > PRAKTIS.censoringRate) {
        alasan.push('pasangan ' + r.pair + ': kandidat TERBUKTI tersensor lebih sering (' + pesanArahFaktual('censoredRate', r.meanBase, r.meanKandidat, r) + '; batas bawah CI ' + r.ciLo + ' > margin ' + PRAKTIS.censoringRate + ')');
      }
    }
    var fail = alasan.length > 0;
    return {
      status: fail ? 'FAIL' : 'PASS',
      mutlakFail: mutlakFail,
      alasan: alasan,
      temuan: temuan,
      rationale: !fail ? 'brain3_simx_censoring_ok' : (mutlakFail ? 'brain3_simx_censoring_absolute' : 'brain3_simx_censoring_excess')
    };
  }

  /**
   * Residual (v2_lama→v2_residual):
   *   FAIL : salah satu metrik TERBUKTI memburuk melewati praktis;
   *   PASS : tidak ada FAIL dan >= 1 metrik TERBUKTI membaik melewati praktis
   *          (fitur harus membuktikan alasan keberadaannya di SUATU tempat);
   *   WARN : tidak memburuk, tapi tidak ada manfaat yang terbukti — temuan,
   *          bukan blokir.
   */
  function gateResidual(metrics) {
    var adaBuruk = false, adaBaik = false, catatan = [];
    for (var i = 0; i < metrics.length; i++) {
      var m = metrics[i];
      if (m.verdict === 'terbukti_lebih_buruk') adaBuruk = true;
      if (m.verdict === 'terbukti_lebih_baik') adaBaik = true;
      if (m.verdict === 'terbukti_remeh') catatan.push(pesanArahFaktual(m.metric, m.meanBase, m.meanKandidat, m));
    }
    var status = adaBuruk ? 'FAIL' : adaBaik ? 'PASS' : 'WARN';
    return {
      status: status,
      catatan: catatan,
      rationale: adaBuruk ? 'brain3_simx_residual_terbukti_memburuk'
        : adaBaik ? 'brain3_simx_residual_ok'
          : 'brain3_simx_residual_manfaat_belum_terbukti'
    };
  }

  /**
   * Kalibrasi (v3_tanpa→v3_kalibrasi):
   *   FAIL : shrinkage bocor (|delta| > 0.6 — pelanggaran KONTRAK C1, toleransi
   *          float, bukan CI) ATAU itemBiasRMSE TERBUKTI memburuk melewati praktis;
   *   PASS : RMSE TERBUKTI membaik melewati praktis dan shrinkage utuh;
   *   WARN : manfaat belum terbukti (termasuk kasus historis 0.2694→0.2622:
   *          turun, tapi CI memeluk nol) — temuan, bukan blokir. Pesannya WAJIB
   *          menyebut arah faktual.
   */
  function gateKalibrasi(metrics, shrinkage) {
    var rmse = null;
    for (var i = 0; i < metrics.length; i++) if (metrics[i].metric === 'itemBiasRMSE') rmse = metrics[i];
    var alasan = [];
    if (shrinkage.bocor) alasan.push('shrinkage BOCOR (maks |delta| = ' + shrinkage.maxAbsDelta + ' > ' + SHRINKAGE_BATAS + ' \u2014 pelanggaran kontrak C1)');
    if (rmse && rmse.verdict === 'terbukti_lebih_buruk') alasan.push(pesanArahFaktual('itemBiasRMSE', rmse.meanBase, rmse.meanKandidat, rmse));
    var fail = alasan.length > 0;
    var pass = !fail && rmse && rmse.verdict === 'terbukti_lebih_baik';
    var status = fail ? 'FAIL' : pass ? 'PASS' : 'WARN';
    var pesan;
    if (fail) pesan = 'Kalibrasi item GAGAL: ' + alasan.join('; ') + '.';
    else if (pass) pesan = 'Kalibrasi item terbukti menurunkan bias: ' + pesanArahFaktual('itemBiasRMSE', rmse.meanBase, rmse.meanKandidat, rmse) + '; shrinkage utuh (maks |delta| = ' + shrinkage.maxAbsDelta + ' \u2264 ' + SHRINKAGE_BATAS + ').';
    else if (rmse && !rmse.insufficient) pesan = 'Manfaat kalibrasi BELUM TERBUKTI: ' + pesanArahFaktual('itemBiasRMSE', rmse.meanBase, rmse.meanKandidat, rmse) + '; shrinkage utuh (maks |delta| = ' + shrinkage.maxAbsDelta + ').';
    else pesan = 'Manfaat kalibrasi TIDAK TERUKUR: pasangan itemBiasRMSE valid < 2 (tidak ada item ber-n\u22658 yang cukup).';
    return {
      status: status,
      pesan: pesan,
      rationale: fail ? (shrinkage.bocor ? 'brain3_simx_kalibrasi_shrinkage_leak' : 'brain3_simx_kalibrasi_terbukti_memburuk')
        : pass ? 'brain3_simx_kalibrasi_ok'
          : 'brain3_simx_kalibrasi_manfaat_belum_terbukti'
    };
  }

  // ===================================================================================
  // 8. SUITE MULTI-SEED
  // ===================================================================================
  /** FNV-1a 32-bit — digest determinisme tanpa mencetak run mentah ke stdout. */
  function fnv1a(str) {
    var h = 0x811C9DC5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function agregat(units, kunci) {
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
      if (censored(rows[i])) { cen++; continue; }
      ttmSum += rows[i].timeToMasteryDays; ttmN++;
    }
    return {
      variant: kunci,
      runs: rows.length,
      // timeToMastery HANYA dari run tak-tersensor — run tersensor tidak punya
      // angka hari yang jujur (36 bukan pengganti "tidak pernah").
      timeToMasteryDaysUncensoredMean: ttmN ? round(ttmSum / ttmN, 4) : null,
      uncensoredRuns: ttmN,
      censoredRuns: cen,
      masteryRate: rows.length ? round(ttmN / rows.length, 4) : null,
      accuracyGapVsTarget: rata(function (r) { return r.accuracyGapVsTarget; }),
      difficultyOscillationPer10: rata(function (r) { return r.difficultyOscillationPer10; }),
      retentionDay90: rata(function (r) { return r.retentionDay90; }),
      brier: rata(function (r) { return r.brier; }),
      falseDeclineRate: rata(function (r) { return r.falseDeclineRate; }),
      itemBiasRMSE: rata(function (r) { return r.itemBiasRMSE; })
    };
  }

  function jalankanMultiSeed(seedDasar, dukungan, jumlahSeed, jumlahTurunan) {
    var n = (typeof jumlahSeed === 'number' && jumlahSeed >= 2) ? Math.floor(jumlahSeed) : SEED_COUNT;
    var seeds = turunkanSeeds(seedDasar, n);
    var units = [];
    for (var i = 0; i < seeds.length; i++) units.push(jalankanUnitSeed(seeds[i], dukungan, jumlahTurunan));

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
    var saringCensor = function (r) { return censored(r); };
    var ambilCensor = function (r) { return censored(r) ? 1 : 0; };

    // --- utama v1 → v2_lama ---
    var metrikUtama = [
      ciBerpasangan(v1, v2, { nama: 'timeToMasteryDays', arah: 'turun', praktis: PRAKTIS.timeToMasteryDays, ambil: function (r) { return r.timeToMasteryDays; }, saring: saringCensor }, seedCI(0)),
      ciBerpasangan(v1, v2, { nama: 'accuracyGapVsTarget', arah: 'turun', praktis: PRAKTIS.accuracyGapVsTarget, ambil: function (r) { return r.accuracyGapVsTarget; } }, seedCI(1)),
      ciBerpasangan(v1, v2, { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } }, seedCI(2)),
      ciBerpasangan(v1, v2, { nama: 'retentionDay90', arah: 'naik', praktis: PRAKTIS.retentionDay90, ambil: function (r) { return r.retentionDay90; } }, seedCI(3)),
      ciBerpasangan(v1, v2, { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } }, seedCI(4))
    ];

    // --- censoring relatif per pasangan ---
    var ciCensor = [];
    var cU = ciBerpasangan(v1, v2, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(5));
    cU.pair = 'v1\u2192v2_lama';
    ciCensor.push(cU);
    if (dukungan.residual) {
      var cR = ciBerpasangan(v2, v2r, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(6));
      cR.pair = 'v2_lama\u2192v2_residual';
      ciCensor.push(cR);
    }
    if (dukungan.kalibrasi) {
      var cK = ciBerpasangan(v3t, v3k, { nama: 'censoredRate', arah: 'turun', praktis: PRAKTIS.censoringRate, ambil: ambilCensor }, seedCI(7));
      cK.pair = 'v3_tanpa\u2192v3_kalibrasi';
      ciCensor.push(cK);
    }

    // --- residual v2_lama → v2_residual ---
    var metrikResidual = null;
    if (dukungan.residual) {
      metrikResidual = [
        ciBerpasangan(v2, v2r, { nama: 'difficultyOscillationPer10', arah: 'turun', praktis: PRAKTIS.difficultyOscillationPer10, ambil: function (r) { return r.difficultyOscillationPer10; } }, seedCI(8)),
        ciBerpasangan(v2, v2r, { nama: 'falseDeclineRate', arah: 'turun', praktis: PRAKTIS.falseDeclineRate, ambil: function (r) { return r.falseDeclineRate; } }, seedCI(9))
      ];
    }

    // --- kalibrasi v3_tanpa → v3_kalibrasi ---
    var metrikKalibrasi = null, shrinkage = null;
    if (dukungan.kalibrasi) {
      metrikKalibrasi = [
        ciBerpasangan(v3t, v3k, { nama: 'itemBiasRMSE', arah: 'turun', praktis: PRAKTIS.itemBiasRMSE, ambil: function (r) { return r.itemBiasRMSE; } }, seedCI(10)),
        ciBerpasangan(v3t, v3k, { nama: 'brier', arah: 'turun', praktis: PRAKTIS.brier, ambil: function (r) { return r.brier; } }, seedCI(11)),
        ciBerpasangan(v3t, v3k, { nama: 'poolSeparationPct', arah: 'naik', praktis: PRAKTIS.poolSeparationPct, ambil: function (r) { return r.poolSeparationPct; } }, seedCI(12))
      ];
      var maxDelta = 0;
      for (var vk = 0; vk < v3k.length; vk++) if (v3k[vk].maxAbsDelta > maxDelta) maxDelta = v3k[vk].maxAbsDelta;
      shrinkage = { maxAbsDelta: round(maxDelta, 4), batas: SHRINKAGE_BATAS, bocor: maxDelta > SHRINKAGE_BATAS + 1e-9 };
    }

    // --- censoring per varian (mutlak hanya untuk kebijakan populasi) ---
    var censoringPerVarian = [
      ringkasCensoring(units, 'v1', true),
      ringkasCensoring(units, 'v2Lama', true)
    ];
    if (dukungan.residual) censoringPerVarian.push(ringkasCensoring(units, 'v2Residual', true));
    censoringPerVarian.push(ringkasCensoring(units, 'v3TanpaKalibrasi', false));
    if (dukungan.kalibrasi) censoringPerVarian.push(ringkasCensoring(units, 'v3Kalibrasi', false));

    var kunciAktif = ['v1', 'v2Lama'];
    if (dukungan.residual) kunciAktif.push('v2Residual');
    kunciAktif.push('v3TanpaKalibrasi');
    if (dukungan.kalibrasi) kunciAktif.push('v3Kalibrasi');
    var aggregates = [];
    for (var ka = 0; ka < kunciAktif.length; ka++) aggregates.push(agregat(units, kunciAktif[ka]));

    var unitDigests = [];
    for (var ud = 0; ud < units.length; ud++) unitDigests.push(fnv1a(JSON.stringify(units[ud])));

    return {
      seedDasar: seedDasar,
      seedCount: seeds.length,
      seeds: { pertama: seeds[0], terakhir: seeds[seeds.length - 1] },
      profilesPerSeed: base.PROFILES.length + ((typeof jumlahTurunan === 'number' && jumlahTurunan >= 0) ? Math.floor(jumlahTurunan) : PROFIL_TURUNAN),
      profilBankPerSeed: PROFIL_BANK,
      horizonDays: HORIZON_DAYS,
      bootstrapIters: BOOT_ITERS,
      bootstrapSumber: BOOT.sumber,
      praktis: PRAKTIS,
      aggregates: aggregates,
      censoring: { perVariant: censoringPerVarian, ciRelatif: ciCensor },
      utama: { pair: 'v1\u2192v2_lama', metrics: metrikUtama },
      residual: metrikResidual ? { pair: 'v2_lama\u2192v2_residual', metrics: metrikResidual } : null,
      kalibrasi: metrikKalibrasi ? { pair: 'v3_tanpa\u2192v3_kalibrasi', metrics: metrikKalibrasi, shrinkage: shrinkage } : null,
      unitDigests: unitDigests,
      digest: fnv1a(unitDigests.join('|'))
    };
  }

  /** Verdict seluruh suite — status per gate + daftar TEMUAN (untuk laporan/PR). */
  function nilaiSuite(ms, dukungan) {
    var gates = {
      utama: gateUtama(ms.utama.metrics),
      censoring: gateCensoring(ms.censoring.perVariant, ms.censoring.ciRelatif),
      residual: dukungan.residual ? gateResidual(ms.residual.metrics) : { status: 'SKIPPED', rationale: 'brain3_simx_residual_belum_didukung' },
      kalibrasi: dukungan.kalibrasi ? gateKalibrasi(ms.kalibrasi.metrics, ms.kalibrasi.shrinkage) : { status: 'SKIPPED', rationale: 'brain3_simx_kalibrasi_belum_didukung' }
    };
    var temuan = [];
    // temuan censoring relatif & mutlak sudah dalam bentuk kalimat di gate-nya
    for (var i = 0; i < gates.censoring.alasan.length; i++) temuan.push('[censoring] ' + gates.censoring.alasan[i]);
    for (var j = 0; j < gates.censoring.temuan.length; j++) temuan.push('[censoring/informatif] ' + gates.censoring.temuan[j]);
    if (gates.residual.catatan) for (var k = 0; k < gates.residual.catatan.length; k++) temuan.push('[residual] ' + gates.residual.catatan[k]);
    if (gates.kalibrasi.pesan && gates.kalibrasi.status !== 'PASS') temuan.push('[kalibrasi] ' + gates.kalibrasi.pesan);
    var adaFail = gates.utama.status === 'FAIL' || gates.censoring.status === 'FAIL' || gates.residual.status === 'FAIL' || gates.kalibrasi.status === 'FAIL';
    var adaWarn = gates.residual.status === 'WARN' || gates.kalibrasi.status === 'WARN';
    return {
      pass: !adaFail,
      warn: adaWarn,
      gates: gates,
      temuan: temuan,
      rationale: gates.censoring.status === 'FAIL' ? gates.censoring.rationale
        : gates.utama.status === 'FAIL' ? gates.utama.rationale
          : gates.residual.status === 'FAIL' ? gates.residual.rationale
            : gates.kalibrasi.status === 'FAIL' ? gates.kalibrasi.rationale
              : adaWarn ? 'brain3_simx_pass_dengan_warn'
                : 'brain3_simx_pass'
    };
  }

  // ===================================================================================
  // 9. MAIN
  // ===================================================================================
  function main(argv) {
    var seed = parseInt(argv[2], 10);
    if (!Number.isFinite(seed)) seed = 42;
    var jumlahSeed = parseInt(argv[3], 10);
    if (!Number.isFinite(jumlahSeed)) jumlahSeed = SEED_COUNT;

    var dukungan = { residual: base.dukungResidual(), kalibrasi: base.dukungKalibrasi() };
    var multi = jalankanMultiSeed(seed, dukungan, jumlahSeed);

    // Determinisme: unit pertama & terakhir dihitung ulang, digest wajib identik.
    // (Menjalankan seluruh suite dua kali menggandakan runtime tanpa menambah daya
    // deteksi berarti — sumber keacakan liar muncul di unit mana pun; selftest
    // menambah gate eksternal: dua invocation CLI wajib byte-identik.)
    var seedsUlang = turunkanSeeds(seed, multi.seedCount);
    var deterministik =
      fnv1a(JSON.stringify(jalankanUnitSeed(seedsUlang[0], dukungan))) === multi.unitDigests[0] &&
      fnv1a(JSON.stringify(jalankanUnitSeed(seedsUlang[seedsUlang.length - 1], dukungan))) === multi.unitDigests[multi.unitDigests.length - 1];

    var verdict = nilaiSuite(multi, dukungan);

    var ringkasan = {
      schema: 'fiezel.adaptivity_sim_v3_extended.v1',
      seed: seed,
      deterministic: deterministik,
      residualSupported: dukungan.residual,
      calibrationSupported: dukungan.kalibrasi,
      multiSeed: multi,
      verdict: verdict,
      gate: {
        pass: deterministik && verdict.pass,
        rationale: !deterministik ? 'brain3_simx_nondeterministic' : verdict.rationale
      }
    };

    process.stdout.write(JSON.stringify(ringkasan, null, 2) + '\n');
    if (!deterministik) {
      process.stderr.write('GAGAL: unit multi-seed dihitung ulang menghasilkan digest berbeda (non-determinisme).\n');
      return 2;
    }
    var g = verdict.gates;
    process.stderr.write('gates: utama=' + g.utama.status + ' censoring=' + g.censoring.status + ' residual=' + g.residual.status + ' kalibrasi=' + g.kalibrasi.status + ' (' + multi.seedCount + ' seed \u00d7 ' + multi.profilesPerSeed + ' profil; bootstrap: ' + multi.bootstrapSumber + ')\n');
    for (var t = 0; t < verdict.temuan.length; t++) process.stderr.write('TEMUAN: ' + verdict.temuan[t] + '\n');
    if (!verdict.pass) {
      process.stderr.write('AdaptivitySimV3Extended: FAIL (' + verdict.rationale + ') \u2014 regresi/kerusakan TERBUKTI lewat CI, bukan selisih titik. Lihat field verdict di JSON.\n');
      return 1;
    }
    process.stderr.write('AdaptivitySimV3Extended: ' + (verdict.warn ? 'PASS dengan WARN (manfaat fitur belum terbukti \u2014 lihat TEMUAN)' : 'PASS') + '\n');
    return 0;
  }

  var api = {
    schema: 'fiezel.adaptivity_sim_v3_extended.v1',
    HORIZON_DAYS: HORIZON_DAYS,
    SEED_COUNT: SEED_COUNT,
    PROFIL_TURUNAN: PROFIL_TURUNAN,
    PROFIL_BANK: PROFIL_BANK,
    BOOT_ITERS: BOOT_ITERS,
    PRAKTIS: PRAKTIS,
    SHRINKAGE_BATAS: SHRINKAGE_BATAS,
    bootstrapSumber: BOOT.sumber,
    pairedBootstrapLokal: pairedBootstrapLokal,
    buatProfilPopulasi: buatProfilPopulasi,
    turunkanSeeds: turunkanSeeds,
    censored: censored,
    jalankanUnitSeed: jalankanUnitSeed,
    ringkasCensoring: ringkasCensoring,
    klasifikasiVerdict: klasifikasiVerdict,
    ciBerpasangan: ciBerpasangan,
    pesanArahFaktual: pesanArahFaktual,
    gateUtama: gateUtama,
    gateCensoring: gateCensoring,
    gateResidual: gateResidual,
    gateKalibrasi: gateKalibrasi,
    fnv1a: fnv1a,
    agregat: agregat,
    jalankanMultiSeed: jalankanMultiSeed,
    nilaiSuite: nilaiSuite,
    main: main
  };

  if (typeof require !== 'undefined' && typeof module === 'object' && require.main === module) {
    process.exit(main(process.argv));
  }

  return api;
});
