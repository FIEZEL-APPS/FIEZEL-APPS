#!/usr/bin/env node
/**
 * SELFTEST adaptivity-simulation-v3-extended.js (Wave E2).
 *
 * APA YANG DIJAGA FILE INI (dan kenapa hanya ini yang masuk CI):
 * verdict brain dari simulator extended bisa merah karena TEMUAN NYATA
 * (v2 tersensor jauh lebih sering dari v1 — kandidat wave berikut), dan
 * temuan brain bukan alasan memblokir PR yang tidak menyentuh brain. Yang
 * harus dijaga CI adalah MEKANISME gate-nya: arah perbandingan benar,
 * pesan tidak berbohong tentang arah, bootstrap deterministik, aturan
 * mutlak censoring hanya menimpa varian kebijakan populasi, dan CLI-nya
 * byte-identik antar-invocation. Forensik E2 menemukan versi keras PR #226
 * mencetak "itemBiasRMSE TIDAK turun (0.2694 → 0.2622)" padahal angka itu
 * turun — kelas bug itu dikubur di sini dengan asersi eksplisit.
 *
 * Runtime target < 60 detik (e2e memakai 3 seed × 10 profil, bukan 50).
 * Nol jaringan, nol DOM, nol Math.random di jalur asersi.
 */
'use strict';

var assert = require('assert');
var execFileSync = require('child_process').execFileSync;
var fs = require('fs');

var ext = require('./adaptivity-simulation-v3-extended.js');

var failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('GAGAL - ' + name + ': ' + (e && e.message)); }
}

// ---------------------------------------------------------------------------
// 1. Bootstrap fallback: deterministik, mean benar, fail-safe pada n<2
// ---------------------------------------------------------------------------
test('pairedBootstrapLokal: seed sama → CI byte-identik; mean selisih eksak', function () {
  var pairs = [];
  var rng = require('./adaptivity-simulation-v3.js').mulberry32(7);
  for (var i = 0; i < 40; i++) { var a = rng() * 10; pairs.push([a, a + 1 + rng()]); }
  var b1 = ext.pairedBootstrapLokal(pairs, 1000, 123);
  var b2 = ext.pairedBootstrapLokal(pairs, 1000, 123);
  assert.strictEqual(JSON.stringify(b1), JSON.stringify(b2), 'seed sama wajib CI sama');
  var mean = 0;
  for (var j = 0; j < pairs.length; j++) mean += pairs[j][1] - pairs[j][0];
  mean /= pairs.length;
  assert.ok(Math.abs(b1.meanDiff - mean) < 1e-12, 'meanDiff = rata-rata selisih berpasangan');
  assert.ok(b1.ciLo <= b1.meanDiff && b1.meanDiff <= b1.ciHi, 'mean di dalam CI');
  assert.ok(b1.ciLo > 0, 'efek +1 pada 40 pasangan wajib CI > 0');
});

test('pairedBootstrapLokal: < 2 pasangan valid → insufficient, bukan angka karangan', function () {
  assert.strictEqual(ext.pairedBootstrapLokal([], 1000, 1).insufficient, true);
  assert.strictEqual(ext.pairedBootstrapLokal([[1, 2]], 1000, 1).insufficient, true);
  assert.strictEqual(ext.pairedBootstrapLokal([[1, NaN], [1, 2]], 1000, 1).insufficient, true);
});

// ---------------------------------------------------------------------------
// 2. Klasifikasi verdict: empat nilai, arah tidak boleh terbalik
// ---------------------------------------------------------------------------
test('klasifikasiVerdict: arah "turun" — CI positif = sisi buruk, negatif = sisi baik', function () {
  // diff = kandidat - base; metrik "turun lebih baik" (mis. brier)
  assert.strictEqual(ext.klasifikasiVerdict({ meanDiff: 0.5, ciLo: 0.3, ciHi: 0.7 }, 'turun', 0.1).verdict, 'terbukti_lebih_buruk');
  assert.strictEqual(ext.klasifikasiVerdict({ meanDiff: -0.5, ciLo: -0.7, ciHi: -0.3 }, 'turun', 0.1).verdict, 'terbukti_lebih_baik');
  // signifikan statistik tapi di bawah margin praktis → terbukti_remeh, BUKAN buruk
  var remeh = ext.klasifikasiVerdict({ meanDiff: 0.05, ciLo: 0.01, ciHi: 0.09 }, 'turun', 0.1);
  assert.strictEqual(remeh.verdict, 'terbukti_remeh');
  assert.strictEqual(remeh.arahStat, 'buruk');
  assert.strictEqual(ext.klasifikasiVerdict({ meanDiff: 0.05, ciLo: -0.01, ciHi: 0.11 }, 'turun', 0.1).verdict, 'inconclusive');
  assert.strictEqual(ext.klasifikasiVerdict({ insufficient: true }, 'turun', 0.1).verdict, 'insufficient');
});

test('klasifikasiVerdict: arah "naik" adalah cermin — regresi kelas salah-arah dikubur', function () {
  // metrik "naik lebih baik" (mis. retentionDay90): CI negatif = buruk
  assert.strictEqual(ext.klasifikasiVerdict({ meanDiff: -0.5, ciLo: -0.7, ciHi: -0.3 }, 'naik', 0.1).verdict, 'terbukti_lebih_buruk');
  assert.strictEqual(ext.klasifikasiVerdict({ meanDiff: 0.5, ciLo: 0.3, ciHi: 0.7 }, 'naik', 0.1).verdict, 'terbukti_lebih_baik');
});

// ---------------------------------------------------------------------------
// 3. Pesan jujur: kasus historis "TIDAK turun (0.2694 → 0.2622)" tidak boleh kembali
// ---------------------------------------------------------------------------
test('pesanArahFaktual: angka yang turun WAJIB disebut turun (bug forensik E2)', function () {
  var p = ext.pesanArahFaktual('itemBiasRMSE', 0.2694, 0.2622, {
    ciLo: -0.012, ciHi: 0.0064, verdict: 'inconclusive', praktis: 0.02
  });
  assert.ok(p.indexOf('TIDAK turun') === -1, 'pesan versi keras berbohong tentang arah: "' + p + '"');
  assert.ok(p.indexOf('turun 0.0072') !== -1, 'arah faktual + besar selisih wajib disebut: "' + p + '"');
  assert.ok(p.indexOf('belum terbukti') !== -1, 'status pembuktian CI wajib terpisah dari arah: "' + p + '"');
});

test('pesanArahFaktual: naik disebut naik; verdict remeh menyebut sisinya', function () {
  var p = ext.pesanArahFaktual('difficultyOscillationPer10', 2.8253, 2.9794, {
    ciLo: 0.0506, ciHi: 0.2571, verdict: 'terbukti_remeh', arahStat: 'buruk', praktis: 0.5
  });
  assert.ok(p.indexOf('naik 0.1541') !== -1, p);
  assert.ok(p.indexOf('memburuk') !== -1 && p.indexOf('di bawah margin praktis') !== -1, p);
});

// ---------------------------------------------------------------------------
// 4. Gate kalibrasi: WARN untuk manfaat-belum-terbukti, FAIL hanya bukti buruk/kontrak
// ---------------------------------------------------------------------------
test('gateKalibrasi: kasus historis (RMSE turun, CI memeluk nol) = WARN, pesan jujur', function () {
  var g = ext.gateKalibrasi([{
    metric: 'itemBiasRMSE', meanBase: 0.2694, meanKandidat: 0.2622, meanDiff: -0.0072,
    ciLo: -0.012, ciHi: 0.0064, verdict: 'inconclusive', arahStat: null, praktis: 0.02
  }], { maxAbsDelta: 0.6, batas: 0.6, bocor: false });
  assert.strictEqual(g.status, 'WARN', 'manfaat belum terbukti = temuan, bukan blokir');
  assert.ok(g.pesan.indexOf('TIDAK turun') === -1, 'pesan tidak boleh berbohong: ' + g.pesan);
  assert.ok(g.pesan.indexOf('turun 0.0072') !== -1, g.pesan);
});

test('gateKalibrasi: FAIL hanya pada shrinkage bocor atau RMSE terbukti memburuk', function () {
  var bocor = ext.gateKalibrasi([{ metric: 'itemBiasRMSE', meanBase: 0.3, meanKandidat: 0.29, meanDiff: -0.01, ciLo: -0.02, ciHi: 0.0, verdict: 'terbukti_remeh', arahStat: 'baik', praktis: 0.02 }],
    { maxAbsDelta: 0.75, batas: 0.6, bocor: true });
  assert.strictEqual(bocor.status, 'FAIL');
  assert.strictEqual(bocor.rationale, 'brain3_simx_kalibrasi_shrinkage_leak');
  var buruk = ext.gateKalibrasi([{ metric: 'itemBiasRMSE', meanBase: 0.3, meanKandidat: 0.4, meanDiff: 0.1, ciLo: 0.05, ciHi: 0.15, verdict: 'terbukti_lebih_buruk', arahStat: 'buruk', praktis: 0.02 }],
    { maxAbsDelta: 0.6, batas: 0.6, bocor: false });
  assert.strictEqual(buruk.status, 'FAIL');
  var pass = ext.gateKalibrasi([{ metric: 'itemBiasRMSE', meanBase: 0.3, meanKandidat: 0.2, meanDiff: -0.1, ciLo: -0.15, ciHi: -0.05, verdict: 'terbukti_lebih_baik', arahStat: 'baik', praktis: 0.02 }],
    { maxAbsDelta: 0.55, batas: 0.6, bocor: false });
  assert.strictEqual(pass.status, 'PASS');
});

// ---------------------------------------------------------------------------
// 5. Gate residual: FAIL butuh bukti memburuk; PASS butuh >=1 manfaat terbukti
// ---------------------------------------------------------------------------
test('gateResidual: efek stat-signifikan-tapi-remeh tidak menjatuhkan FAIL (bug desain versi keras)', function () {
  // Persis situasi basis baru: osilasi terbukti naik tapi < praktis; falseDecline terbukti membaik.
  var g = ext.gateResidual([
    { metric: 'difficultyOscillationPer10', meanBase: 2.8253, meanKandidat: 2.9794, meanDiff: 0.1541, ciLo: 0.0506, ciHi: 0.2571, verdict: 'terbukti_remeh', arahStat: 'buruk', praktis: 0.5 },
    { metric: 'falseDeclineRate', meanBase: 0.0552, meanKandidat: 0.0116, meanDiff: -0.0436, ciLo: -0.048, ciHi: -0.0395, verdict: 'terbukti_lebih_baik', arahStat: 'baik', praktis: 0.02 }
  ]);
  assert.strictEqual(g.status, 'PASS', 'versi keras menjatuhkan FAIL di sini — itu bug desain, bukan temuan');
  assert.strictEqual(g.catatan.length, 1, 'efek remeh tetap dilaporkan sebagai catatan');
  var warn = ext.gateResidual([
    { metric: 'difficultyOscillationPer10', verdict: 'inconclusive', meanBase: 1, meanKandidat: 1, meanDiff: 0, ciLo: -0.1, ciHi: 0.1, praktis: 0.5 },
    { metric: 'falseDeclineRate', verdict: 'inconclusive', meanBase: 0.05, meanKandidat: 0.05, meanDiff: 0, ciLo: -0.01, ciHi: 0.01, praktis: 0.02 }
  ]);
  assert.strictEqual(warn.status, 'WARN', 'tanpa manfaat terbukti fitur belum membuktikan alasan keberadaannya');
  var fail = ext.gateResidual([
    { metric: 'difficultyOscillationPer10', verdict: 'terbukti_lebih_buruk', meanBase: 2, meanKandidat: 3, meanDiff: 1, ciLo: 0.7, ciHi: 1.3, praktis: 0.5 },
    { metric: 'falseDeclineRate', verdict: 'terbukti_lebih_baik', meanBase: 0.05, meanKandidat: 0.01, meanDiff: -0.04, ciLo: -0.05, ciHi: -0.03, praktis: 0.02 }
  ]);
  assert.strictEqual(fail.status, 'FAIL');
});

// ---------------------------------------------------------------------------
// 6. Gate censoring: aturan mutlak HANYA untuk kebijakan populasi; relatif via CI
// ---------------------------------------------------------------------------
test('gateCensoring: varian bank yang tak pernah mastery = temuan informatif, bukan FAIL mutlak', function () {
  var ringkasan = [
    { variant: 'v1', kebijakanPopulasi: true, seedCount: 50, seedsTanpaMastery: 0, tanpaMasteryMayoritas: false },
    { variant: 'v3TanpaKalibrasi', kebijakanPopulasi: false, seedCount: 50, seedsTanpaMastery: 43, tanpaMasteryMayoritas: true }
  ];
  var g = ext.gateCensoring(ringkasan, []);
  assert.strictEqual(g.status, 'PASS', 'dunia bank yang sulit bukan kerusakan kebijakan');
  assert.strictEqual(g.temuan.length, 1, 'tetapi WAJIB tercatat sebagai temuan');
  var g2 = ext.gateCensoring([
    { variant: 'v2Lama', kebijakanPopulasi: true, seedCount: 50, seedsTanpaMastery: 30, tanpaMasteryMayoritas: true }
  ], []);
  assert.strictEqual(g2.status, 'FAIL', 'kebijakan populasi yang tak pernah mastery di mayoritas seed = rusak mutlak');
  assert.strictEqual(g2.rationale, 'brain3_simx_censoring_absolute');
});

test('gateCensoring relatif: FAIL hanya bila batas BAWAH CI > margin (bukan selisih titik)', function () {
  var trip = ext.gateCensoring([], [{ pair: 'v1\u2192v2_lama', meanBase: 0.5, meanKandidat: 0.88, meanDiff: 0.38, ciLo: 0.33, ciHi: 0.42, verdict: 'terbukti_lebih_buruk', praktis: 0.05 }]);
  assert.strictEqual(trip.status, 'FAIL');
  assert.strictEqual(trip.rationale, 'brain3_simx_censoring_excess');
  var aman = ext.gateCensoring([], [{ pair: 'x\u2192y', meanBase: 0.5, meanKandidat: 0.56, meanDiff: 0.06, ciLo: 0.03, ciHi: 0.09, verdict: 'terbukti_remeh', praktis: 0.05 }]);
  assert.strictEqual(aman.status, 'PASS', 'titik 0.06 > margin tapi CI bawah 0.03 < margin — belum terbukti melewati margin');
});

// ---------------------------------------------------------------------------
// 7. Censoring & horizon: definisi + guard konfigurasi kadaluarsa
// ---------------------------------------------------------------------------
test('censored: null dan tepat-horizon tersensor; > horizon = konfigurasi kadaluarsa (throw)', function () {
  assert.strictEqual(ext.censored({ timeToMasteryDays: null }), true);
  assert.strictEqual(ext.censored({ timeToMasteryDays: ext.HORIZON_DAYS }), true, 'mastery di hari terakhir tak terbedakan dari lewat-horizon');
  assert.strictEqual(ext.censored({ timeToMasteryDays: ext.HORIZON_DAYS - 1 }), false);
  assert.throws(function () { ext.censored({ timeToMasteryDays: ext.HORIZON_DAYS + 1 }); }, /HORIZON_DAYS/);
});

test('ringkasCensoring: hitungan proporsi dan seed-tanpa-mastery benar', function () {
  var units = [
    { runs: { u: [{ timeToMasteryDays: 10 }, { timeToMasteryDays: null }] } },
    { runs: { u: [{ timeToMasteryDays: null }, { timeToMasteryDays: null }] } }
  ];
  var r = ext.ringkasCensoring(units, 'u', true);
  assert.strictEqual(r.totalRuns, 4);
  assert.strictEqual(r.censoredRuns, 3);
  assert.strictEqual(r.seedsTanpaMastery, 1);
  assert.strictEqual(r.tanpaMasteryMayoritas, false);
  assert.strictEqual(r.kebijakanPopulasi, true);
});

// ---------------------------------------------------------------------------
// 8. Determinisme struktural: profil populasi & seed turunan
// ---------------------------------------------------------------------------
test('buatProfilPopulasi: 3 profil asli tidak disentuh (referensi sama) + turunan deterministik & terjepit', function () {
  var basePROFILES = require('./adaptivity-simulation-v3.js').PROFILES;
  var a = ext.buatProfilPopulasi(42);
  var b = ext.buatProfilPopulasi(42);
  assert.strictEqual(a.length, basePROFILES.length + ext.PROFIL_TURUNAN);
  for (var i = 0; i < basePROFILES.length; i++) assert.strictEqual(a[i], basePROFILES[i], 'profil asli wajib referensi objek yang sama');
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b), 'seed sama = populasi sama');
  for (var j = basePROFILES.length; j < a.length; j++) {
    var p = a[j];
    assert.ok(p.lajuBelajar >= 0.01 && p.lajuBelajar <= 0.2, 'lajuBelajar terjepit');
    assert.ok(p.slip >= 0.02 && p.slip <= 0.2, 'slip terjepit');
    Object.keys(p.thetaAwal).forEach(function (f) { assert.ok(p.thetaAwal[f] >= 0.4 && p.thetaAwal[f] <= 4.5, 'theta terjepit'); });
  }
  assert.notStrictEqual(JSON.stringify(ext.buatProfilPopulasi(43)), JSON.stringify(a), 'seed beda = populasi beda');
});

test('turunkanSeeds: deterministik, unik, panjang benar', function () {
  var s1 = ext.turunkanSeeds(42, 50);
  var s2 = ext.turunkanSeeds(42, 50);
  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
  assert.strictEqual(s1.length, 50);
  assert.strictEqual(new Set(s1).size, 50, 'tanpa tabrakan');
});

// ---------------------------------------------------------------------------
// 9. End-to-end kecil: CLI dua kali → stdout byte-identik, exit code sesuai verdict
// ---------------------------------------------------------------------------
test('CLI 3-seed: byte-identik antar-invocation; exit code konsisten dengan verdict JSON', function () {
  function jalankan() {
    try {
      var out = execFileSync(process.execPath, ['adaptivity-simulation-v3-extended.js', '42', '3'],
        { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { stdout: out, code: 0 };
    } catch (e) {
      assert.ok(typeof e.status === 'number' && e.status !== 0, 'kegagalan spawn, bukan exit gate: ' + e.message);
      return { stdout: e.stdout, code: e.status };
    }
  }
  var r1 = jalankan();
  var r2 = jalankan();
  assert.strictEqual(r1.stdout, r2.stdout, 'dua invocation dengan seed sama wajib stdout byte-identik');
  assert.strictEqual(r1.code, r2.code, 'exit code wajib sama');
  var d = JSON.parse(r1.stdout);
  assert.strictEqual(d.deterministic, true, 'digest unit dihitung ulang wajib identik');
  assert.strictEqual(d.multiSeed.seedCount, 3);
  assert.strictEqual(d.multiSeed.horizonDays, ext.HORIZON_DAYS);
  ['utama', 'censoring', 'residual', 'kalibrasi'].forEach(function (g) {
    assert.ok(['PASS', 'FAIL', 'WARN', 'SKIPPED'].indexOf(d.verdict.gates[g].status) !== -1, 'status gate ' + g + ' sah');
  });
  // exit code kontrak: 1 <=> ada gate FAIL; 0 <=> tidak ada (WARN boleh)
  var adaFail = ['utama', 'censoring', 'residual', 'kalibrasi'].some(function (g) { return d.verdict.gates[g].status === 'FAIL'; });
  assert.strictEqual(r1.code, adaFail ? 1 : 0, 'exit code wajib mengikuti verdict, bukan sebaliknya');
  // Pesan-pesan temuan tidak boleh mengandung kebohongan arah kelas forensik E2:
  // "X TIDAK turun (a → b)" dengan b < a.
  var bohong = /TIDAK turun \((\d+\.?\d*) \u2192 (\d+\.?\d*)\)/g, m;
  var teks = JSON.stringify(d.verdict);
  while ((m = bohong.exec(teks)) !== null) {
    assert.ok(parseFloat(m[2]) >= parseFloat(m[1]), 'pesan berbohong tentang arah: ' + m[0]);
  }
});

// ---------------------------------------------------------------------------
// 10. Kemurnian: tanpa Math.random / Date.now / DOM / jaringan / penyimpanan
// ---------------------------------------------------------------------------
test('modul murni: sumber extended bebas Math.random, Date.now, DOM, jaringan, penyimpanan', function () {
  var source = fs.readFileSync(__dirname + '/adaptivity-simulation-v3-extended.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ['Math.random', 'Date.now', 'document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.'].forEach(function (forbidden) {
    assert.ok(source.indexOf(forbidden) === -1, 'extended menyentuh ' + forbidden);
  });
});

test('file gate CI tidak disentuh: base API yang dipakai extended tersedia apa adanya', function () {
  var b = require('./adaptivity-simulation-v3.js');
  ['PROFILES', 'mulberry32', 'jalankanRun', 'buatBankItem', 'dukungResidual', 'dukungKalibrasi'].forEach(function (k) {
    assert.ok(b[k] != null, 'base sim wajib mengekspor ' + k + ' — extended menumpang, tidak menduplikasi');
  });
});

console.log('');
if (failures) { console.error('AdaptivitySimV3Extended selftest: FAIL (' + failures + ')'); process.exit(1); }
console.log('AdaptivitySimV3Extended selftest: PASS');
