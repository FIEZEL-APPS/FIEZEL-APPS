/**
 * FIEZEL gerbang — Decision Trace (Fase 2 / Phase B).
 *
 * Gerbang ini MENJALANKAN modulnya, bukan membaca sumbernya. Itu keputusan sadar: audit Fase 1
 * menemukan sebuah gerbang yang hijau selama berbulan-bulan karena ia membandingkan konstanta
 * dengan konstanta, dan sebuah cacat produk (pengikat `say` hilang) yang lolos SEMUA gerbang
 * berbasis pola teks karena polanya masih ada di berkas — yang hilang justru pengikatnya.
 * Trace ada untuk membuat kelas cacat itu terlihat, jadi gerbangnya sendiri tidak boleh
 * mengulangi kesalahan yang sama.
 */
const assert = require('assert');
const T = require('./features/brain/fiezel-decision-trace.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const base = {
  braincoreVersion: '3.0.0',
  sessionId: 1788000000000,
  learnerStateVersion: 42,
  conceptId: 'past-simple',
  evidence: { correct: true, kappa: 1, timing: 'normal', predicted: 0.72 },
  masteryBefore: { L: 0.40, n: 3 },
  masteryAfter: { L: 0.55, n: 4 },
  memoryBefore: { stabilityDays: 2.5, retrievability: 0.80 },
  memoryAfter: { stabilityDays: 4.1, retrievability: 0.95 },
  misconceptionState: { activeCount: 1, topCode: 'past-simple-vs-present-perfect' },
  difficultyState: { prior: 3.2, effective: 3.5, target: 0.8 },
  decision: 'continue',
  reasonCodes: ['brain3_evidence_discounted_guess', 'brain3_bkt_root_cause'],
  confidence: 0.9
};

test('trace terbangun dan membawa schema-nya', () => {
  const t = T.build(base);
  assert.strictEqual(t.schema, 'fiezel-decision-trace-v1');
  assert.strictEqual(t.conceptId, 'past-simple');
  assert.strictEqual(t.decision, 'continue');
});

test('DETERMINISTIK: masukan identik menghasilkan trace identik', () => {
  assert.strictEqual(JSON.stringify(T.build(base)), JSON.stringify(T.build(base)));
});

test('trace beku sampai ke dalam — bukti yang bisa diubah bukan bukti', () => {
  const t = T.build(base);
  assert.ok(Object.isFrozen(t) && Object.isFrozen(t.evidence));
  const before = t.evidence.kappa;
  try { t.evidence.kappa = 0; } catch (_) { /* strict mode boleh melempar */ }
  assert.strictEqual(t.evidence.kappa, before, 'evidence bisa dimutasi!');
});

test('PAGAR PRIVASI: field identitas DITOLAK, bukan dibersihkan diam-diam', () => {
  for (const bad of [
    { ...base, userName: 'Budi' },
    { ...base, evidence: { ...base.evidence, typedAnswer: 'goed' } },
    { ...base, misconceptionState: { activeCount: 1, deviceId: 'abc' } }
  ]) {
    assert.throws(() => T.build(bad), /field identitas terlarang/,
      'trace menerima field identitas — ia bisa berubah jadi jalur kebocoran');
  }
});

test('setiap FORBIDDEN_KEYS benar-benar ditolak (daftar dibuktikan, bukan dihafal)', () => {
  for (const key of T.FORBIDDEN_KEYS) {
    const bad = { ...base };
    bad[key] = 'x';
    assert.throws(() => T.build(bad), /field identitas terlarang/, 'kunci "' + key + '" lolos');
  }
});

test('keputusan di luar enum DITOLAK, bukan diterima sebagai teks bebas', () => {
  assert.throws(() => T.build({ ...base, decision: 'improvise' }), /di luar enum tertutup/);
  for (const d of T.DECISIONS) assert.strictEqual(T.build({ ...base, decision: d }).decision, d);
});

test('kode alasan wajib mengikuti kosakata brain3_* yang sudah ada', () => {
  assert.throws(() => T.build({ ...base, reasonCodes: ['because_i_said_so'] }), /kosakata brain3_/);
  assert.deepStrictEqual(T.build({ ...base, reasonCodes: ['brain3_affect_bored', 'brain3_affect_bored'] }).reasonCodes,
    ['brain3_affect_bored'], 'kode ganda harus dilipat jadi satu');
});

test('kappa null BERBEDA dari kappa 0 — "tidak diukur" bukan "bukti dibuang"', () => {
  const noKappa = T.build({ ...base, evidence: { correct: true, timing: 'normal' } });
  const zeroKappa = T.build({ ...base, evidence: { correct: true, kappa: 0, timing: 'normal' } });
  assert.strictEqual(noKappa.evidence.kappa, null);
  assert.strictEqual(zeroKappa.evidence.kappa, 0);
});

test('correct null BERBEDA dari false — pemanggil yang tidak tahu tidak ditebak jadi salah', () => {
  assert.strictEqual(T.build({ ...base, evidence: {} }).evidence.correct, null);
  assert.strictEqual(T.build({ ...base, evidence: { correct: false } }).evidence.correct, false);
});

test('REGRESI: null/\'\'/[]/bool TIDAK boleh luruh menjadi 0 (Number(null)===0)', () => {
  // Cacat NYATA di versi pertama modul ini, ketahuan saat pipeline Fase C membangun trace
  // pertamanya: `predicted` dilaporkan 0 — "murid ini pasti salah" — padahal yang benar
  // adalah "belum ada bukti untuk memprediksi". Nol yang mengaku sebagai pengukuran lebih
  // berbahaya daripada field kosong, dan ini persis pembedaan yang modul ini ada untuk jaga.
  for (const bad of [null, undefined, '', [], true, false, 'abc', {}]) {
    const t = T.build({ ...base, evidence: { correct: true, kappa: bad, predicted: bad }, confidence: bad });
    assert.strictEqual(t.evidence.kappa, null, 'kappa dari ' + JSON.stringify(bad) + ' harus null, bukan ' + t.evidence.kappa);
    assert.strictEqual(t.evidence.predicted, null, 'predicted dari ' + JSON.stringify(bad) + ' harus null');
    assert.strictEqual(t.confidence, null, 'confidence dari ' + JSON.stringify(bad) + ' harus null');
  }
  // ...tetapi nol yang SUNGGUHAN tetap nol.
  const real = T.build({ ...base, evidence: { correct: true, kappa: 0, predicted: 0 }, confidence: 0 });
  assert.strictEqual(real.evidence.kappa, 0);
  assert.strictEqual(real.evidence.predicted, 0);
  assert.strictEqual(real.confidence, 0);
});

test('REGRESI: angka yang sah di difficultyState tidak ikut ditolak penjaga blank()', () => {
  const t = T.build({ ...base, difficultyState: { prior: 2, effective: 2.5, target: 0.8 } });
  assert.strictEqual(t.difficultyState.prior, 2);
  assert.strictEqual(t.difficultyState.effective, 2.5);
  assert.strictEqual(t.difficultyState.target, 0.8);
  const empty = T.build({ ...base, difficultyState: { prior: null, effective: '', target: undefined } });
  assert.strictEqual(empty.difficultyState.prior, null);
  assert.strictEqual(empty.difficultyState.effective, null);
  assert.strictEqual(empty.difficultyState.target, null);
});

test('movedState: mendeteksi state yang BERGERAK', () => {
  assert.strictEqual(T.movedState(T.build(base)), true, 'mastery 0.40->0.55 harus terbaca bergerak');
});

test('movedState: state yang TIDAK bergerak terbaca tidak bergerak (temuan, bukan kegagalan alat)', () => {
  const still = T.build({
    ...base,
    masteryBefore: { L: 0.4, n: 3 }, masteryAfter: { L: 0.4, n: 3 },
    memoryBefore: { stabilityDays: 2.5, retrievability: 0.8 },
    memoryAfter: { stabilityDays: 2.5, retrievability: 0.8 }
  });
  assert.strictEqual(T.movedState(still), false);
});

test('summarize: satu baris, dan TANPA apa pun yang mengidentifikasi murid', () => {
  const line = T.summarize(T.build(base));
  assert.ok(/concept=past-simple/.test(line) && /decision=continue/.test(line) && /moved=yes/.test(line));
  assert.ok(!/Budi/.test(line) && !/1788000000000/.test(line), 'ringkasan membocorkan identitas/sesi');
});

test('MURNI: tanpa DOM/jaringan/storage/Math.random/Date.now di sumbernya', () => {
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'features', 'brain', 'fiezel-decision-trace.js'), 'utf8');
  const code = src.split('\n')
    .filter(l => !/^\s*\*/.test(l) && !/^\s*\/\//.test(l) && !/^\s*\/\*/.test(l))
    .join('\n');
  for (const banned of ['document.', 'fetch(', 'localStorage', 'indexedDB', 'Math.random', 'Date.now(']) {
    assert.ok(!code.includes(banned), 'modul memakai ' + banned);
  }
});

test('terdaftar di manifest Brain dengan schema yang sama persis', () => {
  const manifest = require('./features/brain/fiezel-brain-manifest.js');
  const entry = manifest.modules.find(m => m.file === 'fiezel-decision-trace.js');
  assert.ok(entry, 'modul tidak terdaftar di manifest');
  assert.strictEqual(entry.schema, T.SCHEMA);
  assert.strictEqual(entry.global, 'FiezelDecisionTrace');
});

console.log(failures ? 'DecisionTrace: FAIL (' + failures + ' kegagalan)' : 'DecisionTrace: PASS');
process.exit(failures ? 1 : 0);
