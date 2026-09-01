#!/usr/bin/env node
/**
 * GERBANG LAPORAN RANTAI KONTEN (content-chain-report-test.js)
 *
 * KLAIM YANG DIUJI DI SINI, DAN KENAPA IA BERBEDA DARI content-chain-test.js
 * -------------------------------------------------------------------------
 * `content-chain-test.js` menguji LOGIKA rantai atas fixture. Gerbang ini menguji bahwa
 * rantai itu benar-benar berjalan atas **bank soal sungguhan** — dan itu klaim yang berbeda.
 * Sebuah modul bisa sempurna terhadap fixture dan tetap tidak pernah dipakai atas data nyata;
 * selama itu terjadi, `gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED'` yang dikembalikan worker
 * tetap menggantung selamanya dan rantai kontennya cuma empat modul yang tidak pernah
 * menjadi rantai.
 *
 * Karena itu R1 adalah inti berkas ini: ia menuntut status gantung itu BERPINDAH, atas
 * kandidat yang dibangun dari `vocabulary-master.json` asli, lewat CLI yang sama persis
 * dengan yang dijalankan operator.
 *
 * DAN KLAIM KEDUA YANG SAMA PENTINGNYA: alat itu HANYA MEMBACA. Ia menjalankan gerbang QA,
 * membangun salinan yang sudah dipatch, dan menghitung ulang seluruh audit konten — semua
 * operasi yang wajar-wajar saja menulis kalau penulisnya ceroboh. R3 menghitung sha256
 * ketiga bank DARI LUAR alat itu, sebelum dan sesudah, karena jaminan yang dihitung oleh
 * pihak yang dijaga bukan jaminan.
 *
 * YANG DI-ASSERT
 *   R1  atas data kanonik NYATA, gateStatus berpindah ke LOCAL_GATES_PASSED dan tahap maju
 *       melewati 'candidate' — inilah satu-satunya bukti bahwa langkah itu bisa terjadi;
 *   R2  dan ia BERHENTI di situ, dengan penghalang jujur: belum ada canary, jadi belum ada
 *       satu murid pun yang melihat kandidat ini;
 *   R3  ketiga bank kanonik byte-identik sebelum dan sesudah, diukur dari luar;
 *   R4  kandidat yang dirusak ditahan di 'candidate' dengan LOCAL_GATES_FAILED — status itu
 *       tidak bisa dicapai hanya dengan menjalankan alatnya;
 *   R5  ownerDecisionRequired tetap true walau seluruh tautan lain dipasok lengkap;
 *   R6  alat itu tidak punya jalur tulis ke bank kanonik sama sekali;
 *   RED detektor mutasi R3 terbukti MERAH — tanpa itu R3 hijau tanpa membuktikan apa pun.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const TOOL = path.join(ROOT, 'tools', 'content-chain-report.mjs');
const BANKS = ['grammar-templates.json', 'vocabulary-master.json', 'reading-bank.json'];

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
}
function hashBanks() {
  const out = {};
  for (const b of BANKS) out[b] = sha(b);
  return out;
}

/** Jalankan CLI-nya sungguhan — bukan fungsi internalnya. Itu jalur yang dipakai operator. */
function jalankan(args) {
  const raw = execFileSync(process.execPath, [TOOL, '--json'].concat(args || []), {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  return JSON.parse(raw);
}

const SEBELUM = hashBanks();
const laporan = jalankan(['--proof']);
const SESUDAH = hashBanks();

test('R1 · atas data kanonik NYATA, status gantung worker akhirnya BERPINDAH', () => {
  assert.strictEqual(laporan.localGate.ok, true,
    'gerbang lokal gagal atas kandidat bukti: ' + (laporan.localGate.errors || []).join('; '));
  assert.strictEqual(laporan.gateStatus, 'LOCAL_GATES_PASSED',
    'gateStatus tidak berpindah dari nilai gantung — inilah satu-satunya hal yang gerbang ini ada untuk membuktikan');
  assert.notStrictEqual(laporan.chain.stage, 'candidate',
    'tahap tidak maju melewati "candidate" walau gerbang lokalnya hijau');
  assert.strictEqual(laporan.chain.stage, 'local_gate');
  // Kandidatnya benar-benar dari bank asli, bukan karangan fixture.
  assert.strictEqual(laporan.domain, 'vocabulary');
  assert.ok(laporan.target && laporan.target.length > 0, 'kandidat tidak menunjuk item nyata');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocabulary-master.json'), 'utf8'));
  assert.ok(bank.some((v) => v.id === laporan.target),
    'item target tidak ada di vocabulary-master.json — kandidatnya bukan dari data nyata');
});

test('R2 · dan ia BERHENTI di situ, dengan penghalang yang jujur', () => {
  assert.deepStrictEqual(laporan.chain.blockers, ['chain_canary_not_configured'],
    'penghalangnya bukan "belum ada canary" — kalau rantai maju lebih jauh tanpa canary, ' +
    'berarti ada kandidat yang dianggap terbukti tanpa pernah dilihat satu murid pun');
  assert.strictEqual(laporan.chain.ready, false, 'dinyatakan siap padahal belum ada bukti paparan apa pun');
  assert.strictEqual(laporan.chain.chain.canary, null, 'bukti canary terkumpul padahal tahapnya belum tercapai');
});

test('R3 · ketiga bank kanonik byte-identik sebelum dan sesudah, diukur DARI LUAR', () => {
  for (const b of BANKS) {
    assert.strictEqual(SESUDAH[b], SEBELUM[b],
      b + ' berubah saat laporan dibuat. Alat ini menjalankan audit QA dan membangun salinan ' +
      'ter-patch; kalau salah satunya menulis ke sumber, kanoniknya tidak lagi kanonik.');
  }
  // Dan klaim alat itu sendiri harus sepakat dengan pengukuran dari luar.
  assert.strictEqual(laporan.localGate.canonicalImmutable, true,
    'alat melaporkan kanonik termutasi selama validasi');
});

test('R4 · kandidat yang dirusak ditahan di tahap pertama, dan statusnya ikut merah', () => {
  const tmp = path.join(ROOT, '.content-chain-report-test-tmp.json');
  try {
    // Ambil kandidat bukti yang sah, lalu rusak baseline hash-nya: itu membuat gerbang
    // lokal menolaknya karena sumbernya basi/salah — kegagalan yang paling mungkin nyata.
    const G = require('./content-patch-gate.js');
    const kandidat = G.proofCandidate(G.loadCanonical(ROOT));
    kandidat.target.sourceSha256 = 'f'.repeat(64);
    fs.writeFileSync(tmp, JSON.stringify(kandidat));

    const r = jalankan(['--candidate', tmp]);
    assert.strictEqual(r.localGate.ok, false, 'kandidat dengan baseline salah diloloskan gerbang lokal');
    assert.strictEqual(r.gateStatus, 'LOCAL_GATES_FAILED',
      'gateStatus lulus padahal gerbangnya merah — status itu jadi tidak berarti apa-apa');
    assert.strictEqual(r.chain.stage, 'candidate', 'tahap maju walau gerbang lokalnya merah');
    assert.ok(r.chain.blockers.includes('chain_local_gate_failed'));
    // Dan bank tetap utuh walau jalur gagal yang ditempuh.
    const h = hashBanks();
    for (const b of BANKS) assert.strictEqual(h[b], SEBELUM[b], b + ' berubah di jalur GAGAL');
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
});

test('R5 · ownerDecisionRequired tetap true walau seluruh tautan lain dipasok lengkap', () => {
  const tmpdir = ROOT;
  const f = {
    cfg: path.join(tmpdir, '.cc-cfg.json'),
    ev: path.join(tmpdir, '.cc-ev.json'),
    vd: path.join(tmpdir, '.cc-vd.json'),
    rl: path.join(tmpdir, '.cc-rl.json')
  };
  try {
    fs.writeFileSync(f.cfg, JSON.stringify({ canaryId: 'cn-real', enabled: true, mode: 'canary' }));
    fs.writeFileSync(f.ev, JSON.stringify({ exposureSessions: 12, privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false } }));
    fs.writeFileSync(f.vd, JSON.stringify({ status: 'promote', reason: 'evidence_threshold_pass' }));
    fs.writeFileSync(f.rl, JSON.stringify({ ok: true, length: 5 }));

    const r = jalankan(['--proof', '--canary-config', f.cfg, '--canary-evidence', f.ev,
      '--verdict', f.vd, '--receipt-ledger', f.rl]);
    assert.strictEqual(r.chain.stage, 'owner_decision', 'rantai lengkap tidak sampai keputusan OWNER');
    assert.strictEqual(r.chain.ready, true, 'rantai lengkap tidak dinyatakan siap DIPUTUSKAN');
    assert.strictEqual(r.chain.ownerDecisionRequired, true,
      'memasok seluruh tautan mesin melepaskan keperluan keputusan manusia — itu penerbitan otomatis');
    // Tidak ada tahap sesudah owner_decision yang bisa dicapai lewat masukan apa pun.
    const C = require('./features/brain/fiezel-content-chain.js');
    assert.strictEqual(C.STAGES[C.STAGES.length - 1], 'owner_decision');
  } finally {
    for (const p of Object.values(f)) { try { fs.unlinkSync(p); } catch (_) {} }
  }
});

test('R6 · alat itu tidak punya jalur tulis ke bank kanonik sama sekali', () => {
  const src = fs.readFileSync(TOOL, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  for (const dilarang of ['writeFileSync', 'writePatchedData', 'appendFileSync', 'rmSync', 'unlinkSync']) {
    assert.strictEqual(src.includes(dilarang), false,
      'alat laporan memanggil ' + dilarang + ' — ia harus HANYA membaca');
  }
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · detektor mutasi R3 terbukti merah terhadap perubahan satu byte', () => {
  // Tanpa ini, R3 bisa hijau karena hash-nya dihitung salah, bukan karena tidak ada yang menulis.
  const b = BANKS[1];
  const p = path.join(ROOT, b);
  const asli = fs.readFileSync(p);
  try {
    fs.writeFileSync(p, Buffer.concat([asli, Buffer.from('\n')]));
    assert.notStrictEqual(sha(b), SEBELUM[b],
      'menambah satu byte TIDAK mengubah hash — pengukuran R3 tidak mengukur apa pun');
  } finally {
    fs.writeFileSync(p, asli);
  }
  assert.strictEqual(sha(b), SEBELUM[b], 'pemulihan berkas gagal — pohon kerja ditinggalkan kotor');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node content-chain-report-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL content chain report: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL content chain report: PASS (' + checks + ' uji · rantai berjalan atas bank soal nyata, dan hanya membaca)');
