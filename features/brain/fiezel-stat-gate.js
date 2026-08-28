/**
 * FIEZEL Stat Gate — inferensi statistik untuk gate promosi konten/kebijakan (Braincore v3).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Gate promosi lama (content-promotion.js) memutuskan nasib kandidat dari 8 attempt
 * per lengan dengan ambang regresi 5 poin persentase. Audit council (model-council-
 * claude_opus_5_0.md §3.2) membuktikan lewat 200.000 trial Monte Carlo bahwa aturan
 * itu adalah lempar koin: kandidat IDENTIK dengan kontrol (keduanya p=0.75) tetap
 * dipromosikan 53,9% dan di-rollback 46,1%; kandidat yang 15pp LEBIH BURUK masih
 * lolos 27,5%. Akar masalahnya sederhana: lebar-setengah CI 95% proporsi pada n=8
 * adalah ±30pp — ambang 5pp pada pengukuran ±30pp tidak mengukur apa pun selain
 * derau sampling. Ledger hash-chain yang rapi hanya mengarsipkan keputusan acak.
 *
 * Modul ini penggantinya. Prinsip desain:
 *   1. FAIL-SAFE KE 'hold'. Saat bukti tidak cukup untuk membedakan sinyal dari
 *      derau, keputusan yang benar adalah TIDAK memutuskan — kontrol tetap dipakai,
 *      bukti terus dikumpulkan. Gate lama gagal justru karena ia MEMAKSA keputusan
 *      biner dari data yang bisu.
 *   2. KEPUTUSAN DARI INTERVAL, BUKAN TITIK. Promosi memakai kerangka non-inferioritas:
 *      batas BAWAH CI selisih harus melewati -margin, bukan sekadar selisih titik.
 *      Penolakan memakai superioritas kerugian: batas ATAS CI harus di bawah nol.
 *   3. DETERMINISTIK. Bootstrap memakai PRNG mulberry32 berseed — dua run dengan seed
 *      sama wajib byte-identik, supaya setiap klaim statistik bisa diaudit ulang.
 *   4. MODUL MURNI. Tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal,
 *      tanpa PRNG engine tanpa seed. Semua masukan lewat argumen.
 *
 * PILIHAN METODE, DAN KENAPA
 * --------------------------
 * - Wilson score interval untuk proporsi satu lengan: interval Wald klasik runtuh
 *   pada n kecil dan p ekstrem (bisa keluar [0,1], cakupan anjlok); Wilson tetap
 *   waras pada n=8 dan 0/n — persis rezim data FIEZEL yang berpengguna sedikit.
 * - CI selisih dua proporsi memakai metode hibrid Newcombe (skor Wilson per lengan,
 *   Newcombe 1998 metode 10): cakupannya jauh lebih baik daripada Wald pada n kecil.
 * - Uji z dua proporsi memakai varians pooled di bawah H0 (standar buku teks) —
 *   p-value hanya pelengkap; KEPUTUSAN diambil dari CI, bukan dari p-value semata.
 * - MDE/ukuran sampel memakai rumus dua-proporsi standar (yang sama dengan kalkulator
 *   Evan Miller yang dikutip council): baseline 0.80, efek 5pp, alpha 0.05, power
 *   0.80 → ±905 attempt per lengan. Angka itu, bukan 8, adalah harga sebenarnya
 *   dari klaim "tidak lebih buruk dari 5pp".
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelStatGate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Default gate. minNPerArm=25 adalah lantai fail-safe: di bawah itu, lebar-setengah
   * Wilson bahkan pada kasus terbaik masih ~4x margin 5pp, sehingga keputusan apa pun
   * hanyalah derau berkostum — temuan inti council §3.2. Angka 25 sengaja konservatif
   * dan bisa dinaikkan pemanggil lewat evidence.minNPerArm; TIDAK bisa diturunkan di
   * bawah 1 tanpa mengedit modul, dan itu disengaja.
   */
  var DEFAULTS = {
    alpha: 0.05,      // taraf dua sisi untuk semua CI dan uji
    power: 0.80,      // power baku untuk hitung MDE/ukuran sampel
    marginPp: 0.05,   // margin non-inferioritas: regresi terburuk yang masih ditoleransi
    minNPerArm: 25    // lantai bukti minimum per lengan sebelum gate MAU memutuskan
  };

  // =================================================================================
  // 1. PRNG BERSEED (mulberry32) — kontrak determinisme
  // =================================================================================
  /**
   * mulberry32: PRNG 32-bit kecil, sama dengan yang dipakai adaptivity-simulation-v3.
   * Bukan kriptografi — cukup untuk bootstrap. Dipilih karena state tunggal 32-bit
   * membuat deretnya mudah direproduksi lintas engine; seed sama = deret sama, titik.
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

  // =================================================================================
  // 2. DISTRIBUSI NORMAL — CDF dan kuantil, tanpa dependensi
  // =================================================================================
  /**
   * CDF normal baku via aproksimasi erf Abramowitz–Stegun 7.1.26 (galat < 1.5e-7).
   * Cukup presisi untuk p-value gate; kesalahan di digit ke-7 tidak pernah membalik
   * keputusan yang diambil dari CI.
   */
  function normalCdf(x) {
    var sign = x < 0 ? -1 : 1;
    var ax = Math.abs(x) / Math.SQRT2;
    var t = 1 / (1 + 0.3275911 * ax);
    var y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return 0.5 * (1 + sign * y);
  }

  /**
   * Kuantil normal baku (inverse CDF) via aproksimasi rasional Acklam (galat relatif
   * ~1e-9). Dipakai untuk z_alpha dan z_power pada rumus ukuran sampel — di sinilah
   * presisi penting, karena 905-vs-910 attempt per lengan harus bisa direproduksi
   * terhadap kalkulator buku teks.
   */
  function normalQuantile(p) {
    if (!(p > 0 && p < 1)) return NaN;
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, q, r;
    if (p < pl) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p <= 1 - pl) {
      q = p - 0.5; r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // =================================================================================
  // 3. VALIDASI — semua jalan buntu berujung null, dan null berujung 'hold'
  // =================================================================================
  /** Hitungan valid = bilangan bulat non-negatif berhingga. NaN/pecahan/negatif ditolak. */
  function isCount(x) {
    return typeof x === 'number' && isFinite(x) && x >= 0 && Math.floor(x) === x;
  }

  /** Lengan valid = {successes, n} dengan 0 <= successes <= n dan n >= 1. */
  function validArm(arm) {
    return !!arm && typeof arm === 'object' &&
      isCount(arm.successes) && isCount(arm.n) && arm.n >= 1 && arm.successes <= arm.n;
  }

  // =================================================================================
  // 4. WILSON SCORE INTERVAL — proporsi satu lengan
  // =================================================================================
  /**
   * wilsonInterval(successes, n, z) -> {p, lo, hi, halfWidth, n, z} | null.
   * z opsional (default 1.96 untuk 95%). Kembalikan null (bukan lempar error) saat
   * masukan tak valid — gate di atasnya menerjemahkan null menjadi 'hold', karena
   * data rusak adalah bentuk paling ekstrem dari "data tidak cukup".
   */
  function wilsonInterval(successes, n, z) {
    if (!isCount(successes) || !isCount(n) || n < 1 || successes > n) return null;
    var zz = (typeof z === 'number' && isFinite(z) && z > 0) ? z : normalQuantile(0.975);
    var p = successes / n;
    var z2 = zz * zz;
    var denom = n + z2;
    var center = (successes + z2 / 2) / denom;
    var half = (zz / denom) * Math.sqrt((successes * (n - successes)) / n + z2 / 4);
    return {
      p: p,
      lo: Math.max(0, center - half),
      hi: Math.min(1, center + half),
      halfWidth: half,
      n: n,
      z: zz
    };
  }

  // =================================================================================
  // 5. UJI DUA PROPORSI + CI SELISIH (Newcombe hibrid)
  // =================================================================================
  /**
   * twoProportionTest(a, b, alpha) -> hasil | null.
   * a = lengan pertama (konvensi gate: KONTROL), b = lengan kedua (KANDIDAT).
   * diff = pB - pA, jadi diff negatif berarti kandidat lebih buruk.
   *
   * CI selisih memakai Newcombe metode 10: batas dibangun dari batas Wilson per
   * lengan, bukan dari SE Wald gabungan — inilah yang membuat CI tetap jujur pada
   * n=8 (lebar, sebagaimana mestinya) alih-alih pura-pura sempit.
   * p-value memakai z pooled standar; pada n sangat kecil ia hanya indikatif, dan
   * karena itu verdict() TIDAK pernah memutus dari p-value sendirian.
   */
  function twoProportionTest(a, b, alpha) {
    if (!validArm(a) || !validArm(b)) return null;
    var al = (typeof alpha === 'number' && alpha > 0 && alpha < 1) ? alpha : DEFAULTS.alpha;
    var z = normalQuantile(1 - al / 2);
    var pA = a.successes / a.n;
    var pB = b.successes / b.n;
    var diff = pB - pA;

    // z pooled di bawah H0: pA == pB.
    var pPool = (a.successes + b.successes) / (a.n + b.n);
    var sePool = Math.sqrt(pPool * (1 - pPool) * (1 / a.n + 1 / b.n));
    var zStat = sePool > 0 ? diff / sePool : 0;
    var pValue = sePool > 0 ? 2 * (1 - normalCdf(Math.abs(zStat))) : 1;

    // Newcombe: gabungkan jarak batas Wilson tiap lengan secara kuadratik.
    var wA = wilsonInterval(a.successes, a.n, z);
    var wB = wilsonInterval(b.successes, b.n, z);
    var ciLo = diff - Math.sqrt(Math.pow(pB - wB.lo, 2) + Math.pow(wA.hi - pA, 2));
    var ciHi = diff + Math.sqrt(Math.pow(wB.hi - pB, 2) + Math.pow(pA - wA.lo, 2));

    return {
      pA: pA, pB: pB, diff: diff,
      z: zStat, pValue: Math.min(1, Math.max(0, pValue)),
      ciLo: Math.max(-1, ciLo), ciHi: Math.min(1, ciHi),
      alpha: al, nA: a.n, nB: b.n
    };
  }

  // =================================================================================
  // 6. PAIRED BOOTSTRAP — untuk bukti berpasangan (simulasi seed-berpasangan council)
  // =================================================================================
  /**
   * pairedBootstrap(pairs, iters, seed) -> {n, iters, seed, meanDiff, ciLo, ciHi} |
   * {insufficient:true, n}. Setiap pair boleh [a, b] atau {a, b} atau
   * {control, candidate}; selisih dihitung KANDIDAT - KONTROL (b - a) supaya searah
   * dengan twoProportionTest: negatif = kandidat lebih buruk.
   *
   * Kenapa bootstrap berpasangan: council merekomendasikan simulasi seed-berpasangan
   * sebagai sumber bukti primer pada skala pengguna FIEZEL — dua kebijakan dievaluasi
   * pada murid laten yang SAMA, sehingga varians antar-murid tersingkir dan yang
   * tersisa hanyalah efek kebijakan. CI persentil dari resample selisih per pasangan
   * adalah cara paling sederhana yang tetap sahih untuk memberi interval pada efek itu.
   */
  function pairedBootstrap(pairs, iters, seed) {
    var diffs = [];
    if (Array.isArray(pairs)) {
      for (var i = 0; i < pairs.length; i++) {
        var p = pairs[i], a = null, b = null;
        if (Array.isArray(p) && p.length >= 2) { a = p[0]; b = p[1]; }
        else if (p && typeof p === 'object') {
          a = (typeof p.a === 'number') ? p.a : p.control;
          b = (typeof p.b === 'number') ? p.b : p.candidate;
        }
        if (typeof a === 'number' && isFinite(a) && typeof b === 'number' && isFinite(b)) {
          diffs.push(b - a);
        }
      }
    }
    // Fail-safe: < 2 pasangan valid berarti tidak ada varians untuk diresample.
    if (diffs.length < 2) return { insufficient: true, n: diffs.length };

    var it = (isCount(iters) && iters >= 100) ? iters : 2000;
    var sd = (typeof seed === 'number' && isFinite(seed)) ? Math.floor(seed) : 42;
    var rng = mulberry32(sd);
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
    return {
      n: n, iters: it, seed: sd,
      meanDiff: total / n,
      ciLo: means[loIdx],
      ciHi: means[hiIdx]
    };
  }

  // =================================================================================
  // 7. UKURAN SAMPEL & MDE — harga sebenarnya dari sebuah klaim
  // =================================================================================
  /**
   * sampleSizeForProportion(baseline, deltaPp, alpha, power) -> n per lengan | null.
   * Rumus dua-proporsi standar (identik dengan kalkulator Evan Miller yang dikutip
   * council §3.3): n = (z_{1-a/2}·sqrt(2·p̄·q̄) + z_{power}·sqrt(p1q1 + p2q2))² / delta².
   * Arah efek: p2 = baseline + delta bila muat di bawah 1, selain itu baseline - delta.
   * Kalibrasi council: baseline 0.80, delta 0.05, alpha 0.05, power 0.80 → ±905.
   */
  function sampleSizeForProportion(baseline, deltaPp, alpha, power) {
    if (typeof baseline !== 'number' || !(baseline > 0 && baseline < 1)) return null;
    if (typeof deltaPp !== 'number' || !(deltaPp > 0 && deltaPp < 1)) return null;
    var al = (typeof alpha === 'number' && alpha > 0 && alpha < 1) ? alpha : DEFAULTS.alpha;
    var pw = (typeof power === 'number' && power > 0 && power < 1) ? power : DEFAULTS.power;
    var p1 = baseline;
    var p2 = (p1 + deltaPp < 1) ? p1 + deltaPp : p1 - deltaPp;
    if (!(p2 > 0 && p2 < 1)) return null;
    var zA = normalQuantile(1 - al / 2);
    var zB = normalQuantile(pw);
    var pBar = (p1 + p2) / 2;
    var num = zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return Math.ceil((num * num) / (deltaPp * deltaPp));
  }

  /**
   * mdeForProportion(baseline, nPerArm, alpha, power) -> efek minimum terdeteksi
   * (dalam proporsi absolut, mis. 0.05 = 5pp) | null bila n terlalu kecil untuk
   * mendeteksi efek apa pun yang masuk akal (<= 49.9pp). Diselesaikan dengan biseksi
   * pada delta karena n(delta) monoton turun — 60 iterasi memberi presisi jauh di
   * bawah 0.01pp, lebih dari cukup.
   *
   * Inilah angka yang seharusnya membuat gate lama malu: mde(0.75, 8) tidak ada —
   * pada 8 attempt per lengan bahkan efek 40pp pun tidak terdeteksi dengan andal.
   */
  function mdeForProportion(baseline, nPerArm, alpha, power) {
    if (typeof baseline !== 'number' || !(baseline > 0 && baseline < 1)) return null;
    if (!isCount(nPerArm) || nPerArm < 1) return null;
    var maxDelta = Math.min(0.499, (baseline < 0.5 ? 1 - baseline : baseline) - 1e-6);
    var need = sampleSizeForProportion(baseline, maxDelta, alpha, power);
    if (need === null || need > nPerArm) return null; // n terlalu kecil: tak ada MDE yang jujur
    var lo = 1e-6, hi = maxDelta;
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      var n = sampleSizeForProportion(baseline, mid, alpha, power);
      if (n !== null && n <= nPerArm) hi = mid; else lo = mid;
    }
    return hi;
  }

  // =================================================================================
  // 8. VERDICT — keputusan gate: promote | hold | reject
  // =================================================================================
  /**
   * verdict(evidence) -> {decision, rationale, confidence, test?, mde?}.
   * evidence = {
   *   control:   {successes, n},   // lengan kontrol (aturan/konten berjalan)
   *   candidate: {successes, n},   // lengan kandidat (yang diusulkan)
   *   alpha?, marginPp?, minNPerArm?  // override opsional, lihat DEFAULTS
   * }
   *
   * Urutan pemeriksaan, dan KENAPA urutannya begitu:
   *   1. Bukti tak valid / tak ada        -> hold. Data rusak bukan alasan memutus.
   *   2. n per lengan < minNPerArm        -> hold 'underpowered'. Inilah perbaikan
   *      langsung atas temuan §3.2: pada n=8 gate ini MENOLAK berjudi, selalu.
   *   3. CI selisih seluruhnya < 0        -> reject. Kandidat TERBUKTI lebih buruk.
   *      Diperiksa SEBELUM non-inferioritas dengan sengaja: kandidat yang pasti
   *      lebih buruk — sekecil apa pun — tidak pantas dipromosikan ke murid,
   *      meskipun regresinya masih di dalam margin toleransi.
   *   4. Batas bawah CI > -marginPp       -> promote. Skenario terburuk yang masih
   *      konsisten dengan data tidak lebih buruk dari margin: aman dipromosikan.
   *   5. Selain itu                       -> hold 'inconclusive'. CI masih memeluk
   *      kedua kemungkinan; kumpulkan bukti lagi.
   *
   * confidence:
   *   - hold underpowered/invalid: 0.9 — kami SANGAT yakin menahan adalah benar,
   *     justru karena datanya tidak berkata apa-apa.
   *   - reject: peluang posterior-normal bahwa selisih sungguhan < 0, diklem 0.5..0.99.
   *   - promote: peluang bahwa selisih sungguhan > -margin, diklem 0.5..0.99.
   *   - hold inconclusive: 0.6 — menahan itu wajar tapi bukti baru bisa mengubahnya.
   */
  function verdict(evidence) {
    function hold(code, confidence, extra) {
      var out = { decision: 'hold', rationale: code, confidence: confidence };
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) out[k] = extra[k];
      return out;
    }
    if (!evidence || typeof evidence !== 'object') {
      return hold('brain3_stat_hold_invalid_evidence', 0.9);
    }
    var ctrl = evidence.control, cand = evidence.candidate;
    if (!validArm(ctrl) || !validArm(cand)) {
      return hold('brain3_stat_hold_invalid_evidence', 0.9);
    }
    var alpha = (typeof evidence.alpha === 'number' && evidence.alpha > 0 && evidence.alpha < 1)
      ? evidence.alpha : DEFAULTS.alpha;
    var margin = (typeof evidence.marginPp === 'number' && evidence.marginPp > 0 && evidence.marginPp < 1)
      ? evidence.marginPp : DEFAULTS.marginPp;
    var minN = (isCount(evidence.minNPerArm) && evidence.minNPerArm >= 1)
      ? evidence.minNPerArm : DEFAULTS.minNPerArm;

    var test = twoProportionTest(ctrl, cand, alpha);
    if (!test) return hold('brain3_stat_hold_invalid_evidence', 0.9);

    // Lantai fail-safe: di bawah minNPerArm gate tidak pernah memutus. Lampirkan MDE
    // supaya pemanggil tahu berapa banyak bukti lagi yang dibutuhkan alih-alih
    // mengulangi kesalahan "8 attempt cukuplah".
    if (ctrl.n < minN || cand.n < minN) {
      return hold('brain3_stat_hold_underpowered', 0.9, {
        test: test,
        needPerArm: sampleSizeForProportion(test.pA > 0 && test.pA < 1 ? test.pA : 0.75, margin, alpha, DEFAULTS.power)
      });
    }

    // SE non-pooled untuk confidence (bukan untuk keputusan — keputusan dari CI Newcombe).
    var seU = Math.sqrt(test.pA * (1 - test.pA) / ctrl.n + test.pB * (1 - test.pB) / cand.n);

    if (test.ciHi < 0) {
      var confR = seU > 0 ? normalCdf(-test.diff / seU) : 0.99;
      return {
        decision: 'reject',
        rationale: 'brain3_stat_reject_significant_regression',
        confidence: Math.min(0.99, Math.max(0.5, confR)),
        test: test
      };
    }
    if (test.ciLo > -margin) {
      var confP = seU > 0 ? normalCdf((test.diff + margin) / seU) : 0.99;
      return {
        decision: 'promote',
        rationale: 'brain3_stat_promote_noninferior',
        confidence: Math.min(0.99, Math.max(0.5, confP)),
        test: test
      };
    }
    return hold('brain3_stat_hold_inconclusive', 0.6, { test: test });
  }

  return {
    DEFAULTS: DEFAULTS,
    mulberry32: mulberry32,
    normalCdf: normalCdf,
    normalQuantile: normalQuantile,
    wilsonInterval: wilsonInterval,
    twoProportionTest: twoProportionTest,
    pairedBootstrap: pairedBootstrap,
    sampleSizeForProportion: sampleSizeForProportion,
    mdeForProportion: mdeForProportion,
    verdict: verdict
  };
});
