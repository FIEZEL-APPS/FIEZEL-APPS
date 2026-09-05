#!/usr/bin/env node
/**
 * GERBANG RANTAI KONTEN (tests/content-chain-test.js)
 *
 * APA YANG SEBENARNYA DIJAGA DI SINI
 * ----------------------------------
 * Modul ini menjawab "kandidat sampai mana, dan apa yang menahannya". Cara paling wajar
 * menulisnya — hitung setiap penghalang secara independen, lalu kumpulkan — justru cacat:
 * ia membuat bukti dari PAPARAN KE MURID (angka canary) menutupi kegagalan validasi yang
 * seharusnya mencegah paparan itu terjadi. Kandidat yang gerbang lokalnya merah akan terbaca
 * "hampir siap, tinggal beberapa penghalang" alih-alih "tertahan sebelum boleh dilihat murid".
 *
 * Karena itu K3/K4 tidak sekadar memeriksa `blockers` berisi sesuatu — keduanya menuntut
 * TAHAP-nya juga tidak maju, dan blok RED membuktikan versi tanpa urutan memang lolos.
 *
 * YANG DI-ASSERT
 *   K1  rantai lengkap berhenti tepat di 'owner_decision', dan ready berarti siap DIPUTUSKAN;
 *   K2  fail-closed: tiap dependensi absen menahan, dan laporan ABSEN tidak sama dengan lulus;
 *   K3  urutan mengikat: bukti canary/verdict tidak memajukan tahap saat gerbang lokal merah;
 *   K4  laporan gerbang lokal milik kandidat LAIN ditolak, bukan dipakai;
 *   K5  'hold' adalah penghalang yang sah, bukan galat — dan ia berbeda dari 'rollback';
 *   K6  kebocoran privasi menghentikan rantai di tahap mana pun ia muncul;
 *   K7  ownerDecisionRequired TIDAK PERNAH false, untuk masukan apa pun — termasuk masukan
 *       yang sengaja mencoba menyetelnya;
 *   K8  kosakata tahap tidak punya kata untuk "terbit"; tahap terakhir adalah keputusan manusia;
 *   K9  murni: tanpa DOM/jaringan/penyimpanan/acak, dan hasil sama untuk masukan sama;
 *   RED versi TANPA urutan terbukti meloloskan kandidat bergerbang-merah — kalau tidak,
 *       K3 hijau tanpa membuktikan apa pun.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const C = require('../features/brain/fiezel-content-chain.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const PATCH_ID = 'sr-vocab-abandon-001';

function rantaiLengkap(over) {
  const base = {
    candidate: { patchId: PATCH_ID, domain: 'vocabulary', target: { itemId: 'abandon' } },
    localGate: { ok: true, patchId: PATCH_ID, canonicalImmutable: true },
    canaryConfig: { canaryId: 'cn-1', enabled: true, mode: 'canary' },
    canaryEvidence: { exposureSessions: 6, privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false } },
    verdict: { status: 'promote', reason: 'evidence_threshold_pass' },
    receiptLedger: { ok: true, length: 3 }
  };
  return Object.assign(base, over || {});
}

test('K1 · rantai lengkap berhenti TEPAT di owner_decision, tanpa penghalang tersisa', () => {
  const r = C.assess(rantaiLengkap(), 1000);
  assert.strictEqual(r.stage, 'owner_decision', 'tahap akhir salah: ' + r.stage);
  assert.deepStrictEqual(r.blockers, [], 'masih ada penghalang: ' + r.blockers.join(', '));
  assert.strictEqual(r.ready, true, 'rantai lengkap tidak dinyatakan siap diputuskan');
  assert.strictEqual(r.chain.localGate.ok, true);
  assert.strictEqual(r.chain.verdict.status, 'promote');
});

test('K2 · fail-closed: tiap dependensi absen menahan, dan absen ≠ lulus', () => {
  const kasus = [
    [null, 'chain_no_input'],
    [{}, 'chain_no_candidate'],
    [rantaiLengkap({ localGate: null }), 'chain_local_gate_not_run'],
    [rantaiLengkap({ canaryConfig: null }), 'chain_canary_not_configured'],
    [rantaiLengkap({ canaryEvidence: null }), 'chain_canary_no_evidence'],
    [rantaiLengkap({ verdict: null }), 'chain_verdict_absent'],
    [rantaiLengkap({ receiptLedger: null }), 'chain_receipt_ledger_absent']
  ];
  for (const [inp, kode] of kasus) {
    const r = C.assess(inp, 1000);
    assert.strictEqual(r.ready, false, 'masukan tak lengkap dinyatakan siap: ' + kode);
    assert.ok(r.blockers.includes(kode), 'penghalang salah untuk ' + kode + ': ' + r.blockers.join(', '));
  }
  // Dan yang terpenting: laporan gerbang ABSEN tidak boleh terbaca sama dengan lulus.
  const absen = C.assess(rantaiLengkap({ localGate: null }), 1000);
  const merah = C.assess(rantaiLengkap({ localGate: { ok: false, patchId: PATCH_ID } }), 1000);
  assert.strictEqual(absen.stage, 'candidate', 'gerbang absen memajukan tahap');
  assert.strictEqual(merah.stage, 'candidate', 'gerbang merah memajukan tahap');
});

test('K3 · URUTAN mengikat: bukti belakang tidak memajukan tahap saat gerbang lokal merah', () => {
  // Angka canary sengaja dibuat meyakinkan dan verdict-nya promote. Kalau penghalang
  // dihitung independen, kandidat ini akan terbaca "hampir siap".
  const r = C.assess(rantaiLengkap({
    localGate: { ok: false, patchId: PATCH_ID, canonicalImmutable: true },
    canaryEvidence: { exposureSessions: 40, privacy: {} },
    verdict: { status: 'promote', reason: 'evidence_threshold_pass' }
  }), 1000);
  assert.strictEqual(r.stage, 'candidate',
    'tahap maju melewati gerbang lokal yang MERAH — bukti dari paparan ke murid menutupi ' +
    'kegagalan validasi yang seharusnya mencegah paparan itu');
  assert.deepStrictEqual(r.blockers, ['chain_local_gate_failed'],
    'penghalang tahap belakang ikut dilaporkan padahal tahapnya belum boleh dievaluasi');
  assert.strictEqual(r.chain.canary, null, 'bukti canary ikut terkumpul padahal tahapnya belum tercapai');
});

test('K4 · laporan gerbang milik kandidat LAIN ditolak, bukan dipakai', () => {
  const r = C.assess(rantaiLengkap({ localGate: { ok: true, patchId: 'sr-kandidat-lain', canonicalImmutable: true } }), 1000);
  assert.strictEqual(r.ready, false, 'kandidat lolos memakai bukti milik kandidat lain');
  assert.ok(r.blockers.includes('chain_local_gate_patch_mismatch'), 'ketidakcocokan patchId tidak terdeteksi');
});

test('K5 · hold adalah penghalang SAH dan berbeda dari rollback', () => {
  const hold = C.assess(rantaiLengkap({ verdict: { status: 'hold', reason: 'stat_underpowered' } }), 1000);
  const roll = C.assess(rantaiLengkap({ verdict: { status: 'rollback', reason: 'canary_learning_regression' } }), 1000);
  assert.ok(hold.blockers.includes('chain_verdict_hold'), 'hold tidak dilaporkan sebagai penghalang');
  assert.ok(roll.blockers.includes('chain_verdict_rollback'), 'rollback tidak dilaporkan sebagai penghalang');
  assert.notDeepStrictEqual(hold.blockers, roll.blockers,
    'hold dan rollback dilaporkan sama — "belum tahu" dan "terbukti lebih buruk" adalah dua ' +
    'keadaan berbeda, dan menyamakannya menghapus satu-satunya alasan gate statistik ada');
  // Keduanya sudah melewati canary, jadi tahapnya memang maju sampai situ.
  assert.strictEqual(hold.stage, 'canary');
  assert.strictEqual(roll.stage, 'canary');
});

test('K6 · kebocoran privasi menghentikan rantai, di tahap mana pun ia muncul', () => {
  const diKandidat = C.assess(rantaiLengkap({
    candidate: { patchId: PATCH_ID, privacy: { rawAnswersIncluded: true } }
  }), 1000);
  assert.strictEqual(diKandidat.stage, 'candidate', 'kebocoran di kandidat tidak menghentikan rantai');
  assert.ok(diKandidat.blockers.includes('chain_privacy_violation'));

  const diBukti = C.assess(rantaiLengkap({
    canaryEvidence: { exposureSessions: 9, privacy: { rawHistoryIncluded: true } }
  }), 1000);
  assert.strictEqual(diBukti.ready, false, 'kebocoran di bukti canary tidak menghentikan rantai');
  assert.ok(diBukti.blockers.includes('chain_privacy_violation'));
});

test('K7 · ownerDecisionRequired TIDAK PERNAH false, termasuk saat masukan mencoba menyetelnya', () => {
  const coba = [
    rantaiLengkap(),
    rantaiLengkap({ ownerDecisionRequired: false }),
    Object.assign(rantaiLengkap(), { ownerDecisionRequired: false, ready: true, stage: 'published' }),
    {}, null, 42, 'x', []
  ];
  for (const inp of coba) {
    const r = C.assess(inp, 1000);
    assert.strictEqual(r.ownerDecisionRequired, true,
      'otoritas penerbitan bisa dilepas dari luar: ' + JSON.stringify(inp));
  }
  // Dan sumbernya harus literal, bukan turunan masukan — kalau ia dihitung, suatu hari
  // ada cabang yang menghitungnya jadi false.
  const src = fs.readFileSync(path.join(__fzRoot, 'features', 'brain', 'fiezel-content-chain.js'), 'utf8');
  assert.ok(/ownerDecisionRequired:\s*true/.test(src), 'ownerDecisionRequired tidak ditulis sebagai literal true');
  assert.strictEqual(/ownerDecisionRequired\s*=/.test(src), false,
    'ownerDecisionRequired ditugaskan ulang di suatu tempat — literalnya jadi tidak berarti');
});

test('K8 · kosakata tahap tidak punya kata untuk "terbit"', () => {
  assert.deepStrictEqual(C.STAGES, ['candidate', 'local_gate', 'canary', 'verdict', 'owner_decision']);
  const terlarang = C.STAGES.filter((s) => /publish|adopt|release|terbit|live/i.test(s));
  assert.deepStrictEqual(terlarang, [],
    'ada tahap penerbitan di kosakata — MASTER-ONLY-GOVERNANCE §4–§5 melarangnya, dan ' +
    'kosakata yang punya katanya cepat atau lambat akan memakainya: ' + terlarang.join(', '));
  assert.strictEqual(C.STAGES[C.STAGES.length - 1], 'owner_decision', 'tahap terakhir bukan keputusan manusia');
  // Tahap yang dikembalikan selalu berasal dari kosakata itu.
  for (const inp of [null, {}, rantaiLengkap(), rantaiLengkap({ localGate: null }), rantaiLengkap({ verdict: { status: 'hold' } })]) {
    assert.ok(C.STAGES.includes(C.assess(inp, 1000).stage), 'tahap di luar kosakata');
  }
});

test('K9 · murni dan deterministik', () => {
  const src = fs.readFileSync(path.join(__fzRoot, 'features', 'brain', 'fiezel-content-chain.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const dilarang of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'Math.random', 'Date.now', 'require(']) {
    assert.strictEqual(src.includes(dilarang), false, 'modul murni menyentuh ' + dilarang);
  }
  const a = JSON.stringify(C.assess(rantaiLengkap(), 1000));
  const b = JSON.stringify(C.assess(rantaiLengkap(), 1000));
  assert.strictEqual(a, b, 'dua panggilan identik berbeda hasil — ada sumber acak atau jam tersembunyi');
  // Argumennya tidak dimutasi: pemanggil yang state-nya berubah diam-diam adalah bug senyap.
  const inp = rantaiLengkap();
  const salinan = JSON.parse(JSON.stringify(inp));
  C.assess(inp, 1000);
  assert.deepStrictEqual(inp, salinan, 'assess memutasi argumennya');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · versi TANPA urutan terbukti meloloskan kandidat bergerbang-merah', () => {
  // Tiruan cacat: setiap penghalang dihitung independen lalu dikumpulkan, dan tahap
  // ditentukan oleh tahap terjauh yang datanya ADA — bukan yang syaratnya terpenuhi.
  function assessTanpaUrutan(inp) {
    const blockers = [];
    if (!inp.localGate || inp.localGate.ok !== true) blockers.push('chain_local_gate_failed');
    if (!inp.canaryEvidence) blockers.push('chain_canary_no_evidence');
    if (!inp.verdict || inp.verdict.status !== 'promote') blockers.push('chain_verdict_hold');
    let stage = 'candidate';
    if (inp.localGate) stage = 'local_gate';
    if (inp.canaryEvidence) stage = 'canary';
    if (inp.verdict && inp.verdict.status === 'promote') stage = 'verdict';
    return { stage: stage, blockers: blockers };
  }
  const racun = rantaiLengkap({
    localGate: { ok: false, patchId: PATCH_ID, canonicalImmutable: true },
    canaryEvidence: { exposureSessions: 40, privacy: {} }
  });
  const cacat = assessTanpaUrutan(racun);
  assert.strictEqual(cacat.stage, 'verdict',
    'prasyarat racun tidak terpenuhi: versi cacat seharusnya memajukan tahap sampai verdict');
  assert.strictEqual(cacat.blockers.length, 1,
    'versi cacat seharusnya melaporkan gerbang merah sebagai SATU penghalang di antara ' +
    'tahap yang sudah maju — itulah bentuk penyesatannya');

  // Modul asli menahannya di tahap pertama. Kalau K3 hijau tanpa perbedaan ini, ia tidak
  // membuktikan apa-apa.
  const asli = C.assess(racun, 1000);
  assert.notStrictEqual(asli.stage, cacat.stage,
    'modul asli dan versi tanpa urutan memberi tahap SAMA — urutannya tidak mengikat apa pun');
  assert.strictEqual(asli.stage, 'candidate');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node tests/content-chain-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL content chain: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL content chain: PASS (' + checks + ' uji · rantai berhenti di keputusan manusia, dan urutannya mengikat)');
