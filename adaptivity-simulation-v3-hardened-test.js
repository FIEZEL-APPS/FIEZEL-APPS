#!/usr/bin/env node
/**
 * TEST GATE — pengerasan multi-seed adaptivity-simulation-v3 (Wave 3, port dari
 * pengerasan wave-2 yang dicabut saat rebase ke basis fase 3).
 *
 * KENAPA test ini terpisah dari simulatornya: simulator adalah ALAT ukur; file ini
 * mengukur ALAT UKURNYA — determinisme byte-identik lintas proses, kontrak jumlah
 * seed/profil, mekanika censoring (termasuk kasus sintetis yang WAJIB gagal), dan
 * kehadiran CI bootstrap pada setiap verdict antar-seed. Test TIDAK menghakimi
 * verdict pedagogis simulator (PASS/FAIL kebijakan adalah temuan, bukan bug);
 * yang dihakimi adalah apakah mesin verdict-nya bekerja sesuai kontrak.
 *
 * Kontrak (BRAINCORE-V3-CONTRACTS.md): Node mandiri di root, tanpa DOM/network/
 * storage, mencetak `ok - ...` per asersi, diakhiri `AdaptivitySimHardened: PASS`.
 */
'use strict';

var path = require('path');
var execFileSync = require('child_process').execFileSync;

var SIM_FILE = path.join(__dirname, 'adaptivity-simulation-v3.js');
var sim = require('./adaptivity-simulation-v3.js');

var fails = 0;
function ok(cond, msg) {
  if (cond) { console.log('ok - ' + msg); }
  else { console.error('NOT OK - ' + msg); fails++; }
}

// ===================================================================================
// 1. DETERMINISME 2 RUN — CLI dijalankan dua kali sebagai PROSES TERPISAH.
//    Byte-identik stdout adalah gate paling keras: satu Math.random() liar, satu
//    Date.now() yang bocor ke stdout, satu iterasi objek yang tak stabil — semuanya
//    ketahuan di sini. Exit code ikut dibandingkan (verdict harus reproducible).
// ===================================================================================
function jalanCLI() {
  try {
    var out = execFileSync(process.execPath, [SIM_FILE, '42'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    return { stdout: out, code: 0 };
  } catch (e) {
    // exit non-zero (verdict FAIL yang jujur) bukan crash — stdout tetap dipakai.
    return { stdout: e.stdout ? String(e.stdout) : '', code: typeof e.status === 'number' ? e.status : -1 };
  }
}

var r1 = jalanCLI();
var r2 = jalanCLI();
ok(r1.stdout.length > 0, 'CLI run 1 menghasilkan stdout (' + Buffer.byteLength(r1.stdout) + ' byte)');
ok(r1.stdout === r2.stdout, 'determinisme: 2 run CLI terpisah byte-identik di stdout');
ok(r1.code === r2.code, 'determinisme: exit code identik antar run (' + r1.code + ')');
ok(r1.code === 0 || r1.code === 1, 'exit code adalah verdict (0/1), bukan crash/non-determinisme (2): ' + r1.code);

var j = null;
try { j = JSON.parse(r1.stdout); } catch (e) { /* jatuh ke asersi berikut */ }
ok(!!j, 'stdout adalah JSON valid');
if (!j) {
  console.error('AdaptivitySimHardened: FAIL (stdout tidak bisa diparse — asersi lanjutan mustahil)');
  process.exit(1);
}
ok(j.deterministic === true, 'gate determinisme internal single-seed: true');
ok(j.deterministicMultiSeed === true, 'gate determinisme internal multi-seed (digest unit dihitung ulang): true');

// ===================================================================================
// 2. KONTRAK JUMLAH SEED & PROFIL
// ===================================================================================
ok(j.multiSeed && typeof j.multiSeed === 'object', 'blok multiSeed hadir di output');
ok(j.multiSeed.seedCount >= 50, 'jumlah seed >= 50 (aktual: ' + j.multiSeed.seedCount + ')');
ok(j.multiSeed.profilesPerSeed >= 8 && j.multiSeed.profilesPerSeed <= 12,
  'jumlah profil per seed dalam rentang 8..12 (aktual: ' + j.multiSeed.profilesPerSeed + ')');
ok(j.multiSeed.runsPerVariant.v1 === j.multiSeed.seedCount * j.multiSeed.profilesPerSeed,
  'runs v1 = seed x profil (' + j.multiSeed.runsPerVariant.v1 + ')');
ok(j.multiSeed.runsPerVariant.v3TanpaKalibrasi === j.multiSeed.seedCount * j.multiSeed.profilBankPerSeed,
  'runs bank = seed x profil bank (' + j.multiSeed.runsPerVariant.v3TanpaKalibrasi + ')');

// Tiga profil ASLI tidak boleh berubah satu angka pun — gate lama harus tetap
// mengukur hal yang sama. Nilai diverifikasi terhadap konstanta yang DIKUNCI di
// test (bukan dibaca dari modul, supaya perubahan diam-diam ketahuan).
var ASLI = [
  { id: 'membaik_cepat', lajuBelajar: 0.10, redaman: 90, driftHarian: 0.0, slip: 0.06, theta: { tense_aspect: 1.2, articles_determiners: 1.0, conditionals: 0.8 } },
  { id: 'mendatar', lajuBelajar: 0.06, redaman: 22, driftHarian: 0.0, slip: 0.08, theta: { tense_aspect: 2.3, articles_determiners: 2.2, conditionals: 2.0 } },
  { id: 'menurun', lajuBelajar: 0.02, redaman: 40, driftHarian: -0.035, slip: 0.10, theta: { tense_aspect: 2.9, articles_determiners: 2.8, conditionals: 2.6 } }
];
for (var a = 0; a < ASLI.length; a++) {
  var asli = ASLI[a], p = sim.PROFILES[a];
  ok(p && p.id === asli.id && p.lajuBelajar === asli.lajuBelajar && p.redaman === asli.redaman &&
    p.driftHarian === asli.driftHarian && p.slip === asli.slip &&
    p.thetaAwal.tense_aspect === asli.theta.tense_aspect &&
    p.thetaAwal.articles_determiners === asli.theta.articles_determiners &&
    p.thetaAwal.conditionals === asli.theta.conditionals,
    'profil asli #' + a + ' (' + asli.id + ') tidak berubah satu angka pun');
}
ok(JSON.stringify(j.profiles) === JSON.stringify(['membaik_cepat', 'mendatar', 'menurun']),
  'output profiles (suite single-seed) tetap 3 profil asli');

// Profil turunan: deterministik dari seed (seed sama = populasi sama; seed beda =
// populasi beda) dan 3 elemen pertama adalah OBJEK ASLI (referensi identik).
var pa = sim.buatProfilMultiSeed(12345);
var pb = sim.buatProfilMultiSeed(12345);
var pc = sim.buatProfilMultiSeed(54321);
ok(pa.length >= 8 && pa.length <= 12, 'buatProfilMultiSeed menghasilkan 8..12 profil (aktual: ' + pa.length + ')');
ok(pa[0] === sim.PROFILES[0] && pa[1] === sim.PROFILES[1] && pa[2] === sim.PROFILES[2],
  '3 profil pertama adalah referensi objek PROFILES asli (bukan salinan yang bisa menyimpang)');
ok(JSON.stringify(pa) === JSON.stringify(pb), 'profil turunan deterministik: seed sama = populasi identik');
ok(JSON.stringify(pa) !== JSON.stringify(pc), 'profil turunan bervariasi: seed beda = populasi beda');
for (var t = 3; t < pa.length; t++) {
  var tp = pa[t];
  ok(tp.lajuBelajar >= 0.01 && tp.lajuBelajar <= 0.2 && tp.slip >= 0.02 && tp.slip <= 0.2 &&
    tp.thetaAwal.tense_aspect >= 0.4 && tp.thetaAwal.tense_aspect <= 4.5,
    'profil turunan ' + tp.id + ' dijepit ke rentang waras');
}

// ===================================================================================
// 3. CENSORING — mekanika flag, pengecualian dari rata-rata, dan gate FAIL sintetis
// ===================================================================================
// 3a. Run tersensor DIKELUARKAN dari rata-rata timeToMastery (agregat sintetis).
var unitsSintetis = [
  { runs: { u: [{ censored: false, timeToMasteryDays: 10 }, { censored: true, timeToMasteryDays: 35 }] } },
  { runs: { u: [{ censored: false, timeToMasteryDays: 20 }, { censored: true, timeToMasteryDays: null }] } }
];
var ag = sim.agregatMultiSeed(unitsSintetis, 'u');
ok(ag.timeToMasteryDaysUncensoredMean === 15, 'agregat: mean timeToMastery HANYA dari run tak-tersensor (15, bukan tercemar 35/null)');
ok(ag.uncensoredRuns === 2 && ag.censoredRuns === 2, 'agregat: hitungan censored/uncensored benar (2/2)');

// 3b. Censoring sintetis WAJIB mem-FAIL-kan gate: varian yang tak pernah mastery
//     di mayoritas seed (di sini: 3 dari 4 seed) harus memicu FAIL MUTLAK.
function unitCensor(semuaCensored) {
  return { runs: { vX: [{ censored: semuaCensored }, { censored: semuaCensored }, { censored: true }] } };
}
var unitsSakit = [unitCensor(true), unitCensor(true), unitCensor(true), unitCensor(false)];
var ringkasSakit = sim.ringkasCensoring(unitsSakit, 'vX');
ok(ringkasSakit.seedsTanpaMastery === 3 && ringkasSakit.tanpaMasteryMayoritas === true,
  'ringkasCensoring mendeteksi varian tanpa mastery di mayoritas seed (3/4)');
var gateSakit = sim.gateCensoringMulti([ringkasSakit], []);
ok(gateSakit.pass === false && gateSakit.rationale === 'brain3_sim_censoring_absolute',
  'gate censoring sintetis FAIL MUTLAK (rationale brain3_sim_censoring_absolute)');

// 3c. Kasus sehat TIDAK boleh gagal — gate yang selalu merah sama tak bergunanya
//     dengan gate yang selalu hijau.
var unitsSehat = [unitCensor(false), unitCensor(false), unitCensor(false), unitCensor(false)];
var gateSehat = sim.gateCensoringMulti([sim.ringkasCensoring(unitsSehat, 'vX')], []);
ok(gateSehat.pass === true && gateSehat.rationale === 'brain3_sim_censoring_ok', 'gate censoring kasus sehat PASS');

// 3d. FAIL RELATIF: CI selisih indikator censoring seluruhnya di atas margin praktis.
var gateRelatif = sim.gateCensoringMulti([], [{ pair: 'x\u2192y', meanBase: 0.5, meanKandidat: 0.85, ciLo: 0.3, ciHi: 0.4 }]);
ok(gateRelatif.pass === false && gateRelatif.rationale === 'brain3_sim_censoring_excess',
  'gate censoring relatif FAIL bila CI selisih > margin (brain3_sim_censoring_excess)');

// 3e. Flag censored pada run sungguhan konsisten dengan definisi (null ATAU >= horizon).
var contohRun = j.results.v1;
var flagKonsisten = true;
for (var cr = 0; cr < contohRun.length; cr++) {
  var ekspektasi = contohRun[cr].timeToMasteryDays === null || contohRun[cr].timeToMasteryDays >= j.simDays;
  if (contohRun[cr].censored !== ekspektasi) flagKonsisten = false;
}
ok(flagKonsisten, 'flag censored konsisten dengan definisi (timeToMastery null/horizon) pada output nyata');

// ===================================================================================
// 4. CI BOOTSTRAP HADIR + AMBANG PRAKTIS DIPAKAI
// ===================================================================================
function cekBarisCI(rows, label) {
  ok(Array.isArray(rows) && rows.length > 0, label + ': daftar metrik CI tidak kosong');
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (r.insufficient) { ok(false, label + '/' + r.metric + ': CI insufficient (pasangan valid < 2)'); continue; }
    ok(typeof r.ciLo === 'number' && typeof r.ciHi === 'number' && r.ciLo <= r.ciHi &&
      typeof r.meanDiff === 'number' && typeof r.praktis === 'number' && r.praktis > 0 &&
      typeof r.nPasangan === 'number' && r.nPasangan >= 46 &&
      ['kandidat_lebih_buruk', 'kandidat_lebih_baik', 'inconclusive'].indexOf(r.verdict) !== -1,
      label + '/' + r.metric + ': CI 95% hadir [' + r.ciLo + ', ' + r.ciHi + '], praktis=' + r.praktis + ', n=' + r.nPasangan + ', verdict=' + r.verdict);
  }
}
cekBarisCI(j.multiSeed.utama.metrics, 'utama(v1\u2192v2_lama)');
if (j.residualSupported) cekBarisCI(j.multiSeed.residual.metrics, 'residual(v2_lama\u2192v2_residual)');
if (j.calibrationSupported) cekBarisCI(j.multiSeed.kalibrasi.metrics, 'kalibrasi(v3_tanpa\u2192v3_kalibrasi)');

// Perbandingan single-seed lama kini membawa ambang praktis (bukan EPS float mentah).
var adaPraktis = true;
for (var cp = 0; cp < j.comparison.length; cp++) if (typeof j.comparison[cp].praktis !== 'number' || j.comparison[cp].praktis <= 0) adaPraktis = false;
ok(adaPraktis && j.comparison.length === 5, 'comparison single-seed membawa ambang praktis per metrik (5 metrik)');
ok(sim.PRAKTIS && sim.PRAKTIS.timeToMasteryDays > 0 && sim.PRAKTIS.itemBiasRMSE > 0 && sim.PRAKTIS.censoringRate > 0,
  'tabel ambang PRAKTIS diekspor dan positif');

// Mesin verdict CI: kandidat yang JELAS lebih buruk pada metrik arah-turun wajib
// divonis kandidat_lebih_buruk; pasangan tersensor wajib dikecualikan bila diminta.
var basisRuns = [], kandRuns = [];
for (var s = 0; s < 12; s++) {
  basisRuns.push({ x: 1 + (s % 3) * 0.1, censored: s === 0 });
  kandRuns.push({ x: 3 + (s % 3) * 0.1, censored: false });
}
var vonis = sim.ciBerpasangan(basisRuns, kandRuns,
  { nama: 'x', arah: 'turun', praktis: 0.5, ambil: function (r) { return r.x; }, saring: function (r) { return !!r.censored; } }, 99);
ok(vonis.verdict === 'kandidat_lebih_buruk' && vonis.nPasangan === 11 && vonis.dikecualikanCensor === 1,
  'ciBerpasangan: kandidat lebih buruk terdeteksi via CI; pasangan tersensor dikecualikan (11 pasangan, 1 dibuang)');

// ===================================================================================
// 5. OUTPUT/GATE FASE 3 LAMA TETAP UTUH (extend, bukan rewrite)
// ===================================================================================
ok(j.residualGate && ['PASS', 'FAIL', 'SKIPPED'].indexOf(j.residualGate.status) !== -1, 'residualGate fase 2 tetap ada (status: ' + j.residualGate.status + ')');
ok(j.calibrationGate && ['PASS', 'FAIL', 'SKIPPED'].indexOf(j.calibrationGate.status) !== -1, 'calibrationGate fase 3 tetap ada (status: ' + j.calibrationGate.status + ')');
ok(Array.isArray(j.calibrationTable) && j.calibrationTable.length > 0, 'calibrationTable fase 3 (C6) tetap ada');
ok(j.bank && j.bank.items === 108, 'bank item C6 tetap 108 item (aktual: ' + j.bank.items + ')');
ok(j.results && j.results.v1.length === 3 && j.results.v3TanpaKalibrasi.length === 3, 'suite single-seed tetap 3 profil asli per varian');
ok(typeof j.gate.rationale === 'string' && j.gate.rationale.indexOf('brain3_') === 0 && typeof j.gate.confidence === 'number',
  'gate akhir membawa rationale brain3_* + confidence (kontrak Braincore v3)');
ok(j.multiSeedGate && typeof j.multiSeedGate.rationale === 'string' && j.multiSeedGate.rationale.indexOf('brain3_') === 0,
  'multiSeedGate membawa rationale brain3_* (aktual: ' + j.multiSeedGate.rationale + ')');

// ===================================================================================
// HASIL
// ===================================================================================
if (fails > 0) {
  console.error('AdaptivitySimHardened: FAIL (' + fails + ' asersi gagal)');
  process.exit(1);
}
console.log('AdaptivitySimHardened: PASS');
