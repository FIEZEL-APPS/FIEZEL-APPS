/**
 * FIEZEL gate — Evidence Credibility (Braincore v3, C6 model-council-claude_opus_5_0.md).
 *
 * Modul kredibilitas bukti adalah tempat yang berbahaya untuk salah arah: kalau diskonnya
 * terbalik (menghukum bukti bersih, meloloskan bukti kotor), model murid justru dirusak
 * oleh modul yang katanya menjaganya. Karena itu gate ini menguji NILAI dan ARAH setiap
 * diskon secara eksplisit, bukan hanya "ada angkanya":
 *
 *   - tebakan harus terdiskon berat DAN membawa alasan yang bisa diaudit;
 *   - item cacat (evidence_mismatch) harus dibuang total, apa pun kondisi lainnya;
 *   - soal Inggris penuh harus lebih menghukum A1/A2 daripada B1+ (relatif level, bukan
 *     properti item semata);
 *   - kombinasi kontaminasi harus MENGALI, bukan mengambil minimum;
 *   - dan tanpa bukti kontaminasi, bukti dianggap bersih (kappa = 1) — modul higiene
 *     tidak boleh menghukum ketidaktahuannya sendiri.
 */
const assert = require('assert');
const fs = require('fs');
const cred = require('./features/brain/fiezel-evidence-credibility.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}
function near(a, b, eps) {
  assert.ok(Math.abs(a - b) <= (eps == null ? 1e-9 : eps), 'diharapkan ~' + b + ', dapat ' + a);
}

// (a) Tebakan: hampir nol informasi kemampuan -> diskon berat + alasan auditable.
test('guess (label) -> kappa <= 0.3 dengan alasan brain3_evidence_discounted_guess', () => {
  const out = cred.weigh({ timing: 'guess' });
  assert.ok(out.kappa <= 0.3, 'kappa tebakan harus <= 0.3, dapat ' + out.kappa);
  assert.ok(out.reasons.includes('brain3_evidence_discounted_guess'), 'diskon tanpa alasan tidak bisa diaudit');
});

test('guess (angka ms < 1800) -> diskon sama dengan label guess', () => {
  const out = cred.weigh({ timing: 1200 });
  near(out.kappa, 0.3);
  assert.ok(out.reasons.includes('brain3_evidence_discounted_guess'));
  // Di atas ambang: bukan tebakan, tanpa diskon timing.
  near(cred.weigh({ timing: 5000 }).kappa, 1);
});

// (b) Item cacat: bukti DIBUANG, bukan didiskon — dan tetap nol saat dikombinasikan.
test('evidence_mismatch -> kappa = 0, apa pun kondisi lainnya', () => {
  const out = cred.weigh({ integrity: 'evidence_mismatch' });
  assert.strictEqual(out.kappa, 0);
  assert.ok(out.reasons.includes('brain3_evidence_rejected_integrity'));
  // Nol harus menyerap semua komponen lain: item cacat + tebakan tetap nol.
  assert.strictEqual(cred.weigh({ integrity: 'evidence_mismatch', timing: 'guess', langLoad: 'full_en', learnerLevel: 'A1' }).kappa, 0);
});

test('integrity valid -> tanpa diskon integritas', () => {
  const out = cred.weigh({ integrity: 'valid' });
  near(out.kappa, 1);
  assert.strictEqual(out.reasons.length, 0);
});

// (c) Beban bahasa relatif level: soal yang sama menghukum A1 jauh lebih berat daripada B2.
test('A1 + full_en -> ~0.45; B2 + full_en -> ~0.85', () => {
  const a1 = cred.weigh({ langLoad: 'full_en', learnerLevel: 'A1' });
  near(a1.kappa, 0.45);
  assert.ok(a1.reasons.includes('brain3_evidence_discounted_language'));
  near(cred.weigh({ langLoad: 'full_en', learnerLevel: 'A2' }).kappa, 0.45);
  const b2 = cred.weigh({ langLoad: 'full_en', learnerLevel: 'B2' });
  near(b2.kappa, 0.85);
  assert.ok(b2.reasons.includes('brain3_evidence_discounted_language'));
  // Kesalahan murid A1 pada soal EN penuh harus bernilai < separuh bukti soal berdukungan ID.
  assert.ok(a1.kappa < 0.5 * cred.weigh({ langLoad: 'id', learnerLevel: 'A1' }).kappa);
});

test('assisted -> 0.8; id -> 1.0 (tanpa alasan)', () => {
  near(cred.weigh({ langLoad: 'assisted', learnerLevel: 'A1' }).kappa, 0.8);
  const id = cred.weigh({ langLoad: 'id', learnerLevel: 'A1' });
  near(id.kappa, 1);
  assert.strictEqual(id.reasons.length, 0);
});

test('listening benar setelah replay >= 3 -> 0.6; replay sedikit tidak didiskon', () => {
  const out = cred.weigh({ replayCount: 4 });
  near(out.kappa, 0.6);
  assert.ok(out.reasons.includes('brain3_evidence_discounted_replay'));
  near(cred.weigh({ replayCount: 2 }).kappa, 1);
});

// (d) Kombinasi harus MENGALI: kontaminasi independen saling memperparah.
test('kombinasi multiplikatif: guess * full_en(A1) * replay = 0.3 * 0.45 * 0.6', () => {
  const out = cred.weigh({ timing: 'guess', langLoad: 'full_en', learnerLevel: 'A1', replayCount: 3 });
  near(out.kappa, 0.3 * 0.45 * 0.6);
  // Satu alasan per diskon aktif — reasons harus cukup untuk merekonstruksi kappa.
  assert.strictEqual(out.reasons.length, 3);
  assert.ok(out.reasons.includes('brain3_evidence_discounted_guess'));
  assert.ok(out.reasons.includes('brain3_evidence_discounted_language'));
  assert.ok(out.reasons.includes('brain3_evidence_discounted_replay'));
  // Dua kontaminasi lebih buruk daripada masing-masing sendirian (bukan minimum).
  near(cred.weigh({ timing: 'guess', langLoad: 'assisted' }).kappa, 0.3 * 0.8);
});

// (e) classifyLangLoad: heuristik harus membedakan fixture nyata, bukan hanya kasus ekstrem sintetis.
test('classifyLangLoad: stem instruksi Indonesia -> id', () => {
  const out = cred.classifyLangLoad({
    stem: 'Pilih bentuk kata kerja yang paling tepat untuk melengkapi kalimat berikut.',
    options: ['yang benar', 'yang tepat', 'bukan ini', 'bukan itu'],
    learnerLevel: 'A1'
  });
  assert.strictEqual(out, 'id');
});

test('classifyLangLoad: stem ID + opsi EN -> assisted (dukungan sebagian)', () => {
  const out = cred.classifyLangLoad({
    stem: 'Pilih jawaban yang benar untuk melengkapi kalimat berikut: She ___ to school every morning before her first class starts.',
    options: ['goes', 'is going', 'has gone', 'went'],
    learnerLevel: 'A1'
  });
  assert.strictEqual(out, 'assisted');
});

test('classifyLangLoad: stem + opsi Inggris penuh -> full_en', () => {
  const out = cred.classifyLangLoad({
    stem: 'Choose the correct form of the verb to complete the sentence: She ___ to school every morning.',
    options: ['goes', 'is going', 'has gone', 'went'],
    learnerLevel: 'A1'
  });
  assert.strictEqual(out, 'full_en');
});

test('classifyLangLoad: alur penuh — hasil klasifikasi bisa langsung dipakai weigh', () => {
  const load = cred.classifyLangLoad({ stem: 'Select the sentence that uses the past perfect correctly.', options: ['a', 'b', 'c', 'd'] });
  near(cred.weigh({ langLoad: load, learnerLevel: 'A1' }).kappa, 0.45);
});

// (f) Input kosong aman: tanpa bukti kontaminasi, bukti dianggap bersih.
test('input kosong aman: kappa = 1, reasons kosong', () => {
  for (const input of [undefined, null, {}]) {
    const out = cred.weigh(input);
    assert.strictEqual(out.kappa, 1, 'input kosong tidak boleh didiskon');
    assert.deepStrictEqual(out.reasons, []);
  }
  assert.strictEqual(cred.classifyLangLoad(), 'id');
  assert.strictEqual(cred.classifyLangLoad({ stem: '', options: [] }), 'id');
});

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa waktu implisit', () => {
  const source = fs.readFileSync('./features/brain/fiezel-evidence-credibility.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden), 'modul kredibilitas menyentuh ' + forbidden + ' - itu membuatnya tidak bisa ditabelkan di gate');
  }
});

console.log('');
if (failures) { console.error('FIEZEL Evidence Credibility: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Evidence Credibility: PASS');
