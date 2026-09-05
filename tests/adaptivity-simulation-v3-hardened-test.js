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
 * WAVE 5c — semantik gate dipisah dua dan test ini mengawal keduanya:
 *   exit code = HANYA determinisme + gate keselamatan kebijakan SHIPPED
 *   (nilaiShipped/nilaiKebijakanShipped); temuan riset (inconclusive/terbantah/
 *   censoring kandidat non-shipped) = research_hold di researchVerdicts + blok
 *   stderr 'TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER)' — TIDAK
 *   menyentuh exit code, dan TIDAK BOLEH ada temuan yang hilang dari JSON.
 *
 * Kontrak (docs/BRAINCORE-V3-CONTRACTS.md): Node mandiri di root, tanpa DOM/network/
 * storage, mencetak `ok - ...` per asersi, diakhiri `AdaptivitySimHardened: PASS`.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

var path = require('path');
var spawnSync = require('child_process').spawnSync;

var SIM_FILE = path.join(__fzRoot, 'adaptivity-simulation-v3.js');
var sim = require('../adaptivity-simulation-v3.js');

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
  // spawnSync (bukan execFileSync) supaya stderr ikut tertangkap — WAVE 5c
  // mensyaratkan blok TEMUAN RISET tercetak ke stderr dan itu harus diasersikan.
  var r = spawnSync(process.execPath, [SIM_FILE, '42'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  return {
    stdout: r.stdout ? String(r.stdout) : '',
    stderr: r.stderr ? String(r.stderr) : '',
    code: typeof r.status === 'number' ? r.status : -1
  };
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

// 3b. Detektor censoring sintetis WAJIB menyala: varian yang tak pernah mastery
//     di mayoritas seed (di sini: 3 dari 4 seed) harus memicu temuan MUTLAK.
//     (WAVE 5c: detektor gateCensoringMulti tidak berubah; konsumennya kini
//      memutuskan gate-keras vs research_hold — diuji di seksi 6.)
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
// WAVE 5c: status buruk single-seed kini 'RESEARCH_HOLD' (bukan 'FAIL') — klaim
// nilai tambah kandidat adalah temuan riset, bukan blocker rilis.
ok(j.residualGate && ['PASS', 'RESEARCH_HOLD', 'SKIPPED'].indexOf(j.residualGate.status) !== -1, 'residualGate fase 2 tetap ada (status: ' + j.residualGate.status + ')');
ok(j.calibrationGate && ['PASS', 'RESEARCH_HOLD', 'SKIPPED'].indexOf(j.calibrationGate.status) !== -1, 'calibrationGate fase 3 tetap ada (status: ' + j.calibrationGate.status + ')');
ok(Array.isArray(j.calibrationTable) && j.calibrationTable.length > 0, 'calibrationTable fase 3 (C6) tetap ada');
ok(j.bank && j.bank.items === 108, 'bank item C6 tetap 108 item (aktual: ' + j.bank.items + ')');
ok(j.results && j.results.v1.length === 3 && j.results.v3TanpaKalibrasi.length === 3, 'suite single-seed tetap 3 profil asli per varian');
ok(typeof j.gate.rationale === 'string' && j.gate.rationale.indexOf('brain3_') === 0 && typeof j.gate.confidence === 'number',
  'gate akhir membawa rationale brain3_* + confidence (kontrak Braincore v3)');
ok(j.multiSeedGate && typeof j.multiSeedGate.rationale === 'string' && j.multiSeedGate.rationale.indexOf('brain3_') === 0,
  'multiSeedGate membawa rationale brain3_* (aktual: ' + j.multiSeedGate.rationale + ')');

// ===================================================================================
// 6. WAVE 5c — SEMANTIK GATE SHIPPED vs TEMUAN RISET
// ===================================================================================
// 6a. Exit code HANYA dari determinisme + gate shipped — kontrak baru, diasersikan
//     terhadap output nyata (bukan sintetis) supaya drift semantik ketahuan.
ok(j.shippedGate && Array.isArray(j.shippedGate.policies) && j.shippedGate.policies.length === 2,
  'shippedGate hadir dengan 2 kebijakan (v2_residual, item_calibration)');
ok(j.shippedGate.policies[0].policy === 'v2_residual' && j.shippedGate.policies[1].policy === 'item_calibration',
  'shippedGate menilai persis kebijakan yang DI-SHIP (v2_residual produksi; itemCalibration authorityMap active)');
ok(typeof j.shippedGate.rationale === 'string' && j.shippedGate.rationale.indexOf('brain3_') === 0,
  'shippedGate membawa rationale brain3_* (aktual: ' + j.shippedGate.rationale + ')');
var exitEkspektasi = (j.deterministic && j.deterministicMultiSeed) ? (j.shippedGate.pass ? 0 : 1) : 2;
ok(r1.code === exitEkspektasi,
  'exit code mengikuti semantik shipped: determinisme+shippedGate.pass=' + j.shippedGate.pass + ' \u2192 expect ' + exitEkspektasi + ', aktual ' + r1.code);
ok(j.gate.pass === (j.deterministic && j.deterministicMultiSeed && j.shippedGate.pass),
  'gate.pass = determinisme && shippedGate.pass (temuan riset tidak ikut menentukan)');

// 6b. Sintetis: censoring pada kebijakan SHIPPED (baseline tidak) → gate keras FAIL.
function blokSintetis(override) {
  var b = {
    policy: 'sintetis', authority: 'test', baselineKeselamatan: 'v1', baselineAblation: 'vAbl',
    metrics: [{ metric: 'brier', verdict: 'inconclusive', meanDiff: 0, ciLo: -0.01, ciHi: 0.01, praktis: 0.01 }],
    censoringShipped: { variant: 'vS', seedsTanpaMastery: 1, seedCount: 4, censoredRate: 0.2, tanpaMasteryMayoritas: false },
    censoringBaseline: { variant: 'vB', seedsTanpaMastery: 0, seedCount: 4, censoredRate: 0.1, tanpaMasteryMayoritas: false },
    censoringAblationCI: { pair: 'vAbl\u2192vS', insufficient: false, ciLo: -0.02, ciHi: 0.02 },
    shrinkage: null
  };
  for (var k in override) if (Object.prototype.hasOwnProperty.call(override, k)) b[k] = override[k];
  return b;
}
var vCensorShipped = sim.nilaiKebijakanShipped('sintetis', blokSintetis({
  censoringShipped: { variant: 'vS', seedsTanpaMastery: 3, seedCount: 4, censoredRate: 0.95, tanpaMasteryMayoritas: true }
}));
ok(vCensorShipped.pass === false && vCensorShipped.rationale === 'brain3_sim_shipped_censoring_absolute' && vCensorShipped.censoringMutlakAtributable === true,
  'sintetis: censoring mayoritas pada kebijakan SHIPPED (baseline sehat) \u2192 gate keras FAIL (brain3_sim_shipped_censoring_absolute \u2192 exit 1)');

// 6c. Sintetis: censoring level-SKENARIO (shipped DAN baseline sama-sama mayoritas)
//     → BUKAN gate keras; hanya flag scenarioLevel (dieskalasi sebagai research_hold).
var vCensorScenario = sim.nilaiKebijakanShipped('sintetis', blokSintetis({
  censoringShipped: { variant: 'vS', seedsTanpaMastery: 3, seedCount: 4, censoredRate: 0.95, tanpaMasteryMayoritas: true },
  censoringBaseline: { variant: 'vB', seedsTanpaMastery: 3, seedCount: 4, censoredRate: 0.95, tanpaMasteryMayoritas: true }
}));
ok(vCensorScenario.pass === true && vCensorScenario.censoringScenarioLevel === true && vCensorScenario.rationale === 'brain3_sim_shipped_ok',
  'sintetis: censoring identik shipped+baseline (level skenario/kandidat non-shipped) \u2192 research_hold, TIDAK exit 1');

// 6d. Sintetis: regresi terbukti pada metrik keselamatan shipped → gate keras FAIL.
var vRegresi = sim.nilaiKebijakanShipped('sintetis', blokSintetis({
  metrics: [{ metric: 'retentionDay90', verdict: 'kandidat_lebih_buruk', meanDiff: -0.08, ciLo: -0.1, ciHi: -0.06, praktis: 0.02 }]
}));
ok(vRegresi.pass === false && vRegresi.rationale === 'brain3_sim_shipped_regression' && vRegresi.regresiTerbukti[0] === 'retentionDay90',
  'sintetis: regresi terbukti (CI ekslusif nol + praktis) pada kebijakan shipped \u2192 brain3_sim_shipped_regression \u2192 exit 1');

// 6e. Sintetis: shipped TERBUKTI menyensor lebih sering dari ablation-nya → FAIL.
var vCensorRelatif = sim.nilaiKebijakanShipped('sintetis', blokSintetis({
  censoringAblationCI: { pair: 'vAbl\u2192vS', insufficient: false, ciLo: 0.12, ciHi: 0.2 }
}));
ok(vCensorRelatif.pass === false && vCensorRelatif.rationale === 'brain3_sim_shipped_censoring_excess',
  'sintetis: CI censoring ablation seluruhnya di atas margin \u2192 brain3_sim_shipped_censoring_excess \u2192 exit 1');

// 6f. Sintetis: kebijakan dinyatakan shipped tapi tak terverifikasi harness → FAIL
//     (gate tak boleh hijau untuk kebijakan yang tak bisa diukur).
var vNull = sim.nilaiKebijakanShipped('hilang', null);
ok(vNull.pass === false && vNull.rationale === 'brain3_sim_shipped_unverifiable' && vNull.status === 'UNVERIFIED',
  'sintetis: blok shipped null \u2192 brain3_sim_shipped_unverifiable \u2192 exit 1');

// 6g. TEMUAN RISET UTUH DI JSON — tidak ada temuan yang dibuang.
ok(Array.isArray(j.researchVerdicts) && j.researchVerdicts.length > 0,
  'researchVerdicts hadir dan tidak kosong (' + (j.researchVerdicts ? j.researchVerdicts.length : 0) + ' temuan)');
var rvUtuh = true;
for (var rv = 0; rv < j.researchVerdicts.length; rv++) {
  var tRv = j.researchVerdicts[rv];
  if (!(tRv.status === 'research_hold' && typeof tRv.rationale === 'string' && tRv.rationale.indexOf('brain3_') === 0 &&
    typeof tRv.confidence === 'number' && typeof tRv.claim === 'string' && ('ci' in tRv) && ('detail' in tRv))) rvUtuh = false;
}
ok(rvUtuh, 'setiap temuan riset: status research_hold + rationale brain3_* + confidence + claim + ci/detail');
function cariRV(id) { for (var q = 0; q < j.researchVerdicts.length; q++) if (j.researchVerdicts[q].id === id) return j.researchVerdicts[q]; return null; }
// Temuan wave-3 yang dulu memblokir rilis WAJIB tetap ada, lengkap dengan CI-nya:
if (j.calibrationSupported) {
  var rmseRow = j.multiSeed.kalibrasi.metrics[0];
  if (rmseRow.verdict !== 'kandidat_lebih_baik') {
    var rvRmse = cariRV('multiseed_kalibrasi_itemBiasRMSE');
    ok(!!rvRmse && rvRmse.ci && rvRmse.ci.ciLo === rmseRow.ciLo && rvRmse.ci.ciHi === rmseRow.ciHi,
      'temuan kalibrasi inconclusive (CI [' + rmseRow.ciLo + ', ' + rmseRow.ciHi + ']) UTUH di researchVerdicts');
  }
}
if (j.residualSupported) {
  var oscRow = j.multiSeed.residual.metrics[0];
  if (oscRow.verdict !== 'kandidat_lebih_baik') {
    var rvOsc = cariRV('multiseed_residual_difficultyOscillationPer10');
    ok(!!rvOsc && rvOsc.ci && rvOsc.ci.ciLo === oscRow.ciLo && rvOsc.ci.ciHi === oscRow.ciHi,
      'temuan osilasi residual (CI [' + oscRow.ciLo + ', ' + oscRow.ciHi + ']) UTUH di researchVerdicts');
  }
}
var adaBankMayoritas = false;
for (var pv2 = 0; pv2 < j.multiSeed.censoring.perVariant.length; pv2++) {
  var pvx = j.multiSeed.censoring.perVariant[pv2];
  if ((pvx.variant === 'v3TanpaKalibrasi' || pvx.variant === 'v3Kalibrasi') && pvx.tanpaMasteryMayoritas) adaBankMayoritas = true;
}
ok(adaBankMayoritas === !!cariRV('censoring_scenario_bank'),
  'temuan censoring bank fase-3 ada di researchVerdicts tepat ketika varian bank tersensor mayoritas (' + adaBankMayoritas + ')');

// 6h. Blok stderr TEMUAN RISET tercetak dengan label kontrak.
ok(r1.stderr.indexOf('TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER)') !== -1,
  "stderr memuat blok 'TEMUAN RISET (tidak memblokir rilis; keputusan di MASTER)'");
// stderr penuh memuat baris runtime-ms (sengaja non-deterministik); yang wajib
// deterministik adalah BLOK TEMUAN RISET (turunan murni JSON stdout).
function blokTemuan(s) {
  var awal = s.indexOf('=== TEMUAN RISET');
  var akhir = s.indexOf('=== AKHIR TEMUAN RISET');
  return (awal === -1 || akhir === -1) ? null : s.slice(awal, akhir);
}
ok(blokTemuan(r1.stderr) !== null && blokTemuan(r1.stderr) === blokTemuan(r2.stderr),
  'blok TEMUAN RISET di stderr deterministik antar 2 run');
ok(j.gate.researchHolds === j.researchVerdicts.length,
  'gate.researchHolds = jumlah temuan riset (' + j.gate.researchHolds + ')');

// ===================================================================================
// HASIL
// ===================================================================================
if (fails > 0) {
  console.error('AdaptivitySimHardened: FAIL (' + fails + ' asersi gagal)');
  process.exit(1);
}
console.log('AdaptivitySimHardened: PASS');
