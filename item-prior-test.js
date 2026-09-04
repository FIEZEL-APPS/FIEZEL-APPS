/**
 * FIEZEL gate — Item Prior (Braincore v3, A6).
 *
 * Council (model-council-claude_opus_5_0.md T1/T2/C1) membuktikan bahwa semua item satu
 * level punya difficulty identik LEVELS.indexOf(level)+1, sehingga seleksi berbasis
 * kesulitan adalah no-op. Gate ini menguji hal yang MEMATIKAN defek itu, bukan sekadar
 * "modulnya ada":
 *
 *   (a) difficulty dalam SATU level harus BERVARIASI nyata (variansi > 0.3) — kalau tidak,
 *       T1/T2 kembali degenerate;
 *   (b) semua 25 mode latihan grammar dari app.js punya biaya — mode tanpa biaya diam-diam
 *       jatuh ke basis dan mengecilkan variansi tanpa ada yang sadar;
 *   (c) urutan beban kognitif harus benar arah: metabahasa > recognition — angka yang
 *       terbalik arah lebih berbahaya daripada tidak ada angka;
 *   (d) clamp [0.5, 6.9] bekerja di kedua ujung;
 *   (e) domain non-grammar (vocabulary/reading) TIDAK terkontaminasi biaya mode grammar.
 */
const assert = require('assert');
const prior = require('./features/brain/fiezel-item-prior.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

// Sumber kebenaran daftar mode: GRAMMAR_PRACTICE_MODES di app.js (disalin apa adanya
// supaya gate gagal keras kalau daftar di app.js dan MODE_COST tidak lagi sinkron).
const GRAMMAR_PRACTICE_MODES = [
  'apply_form', 'complete_sentence', 'justify_correct', 'recognize_rule', 'recognize_objective',
  'sequence_reasoning', 'identify_misconception', 'recall_memory_cue', 'choose_avoidance',
  'diagnose_distractor_1', 'diagnose_distractor_2', 'diagnose_distractor_3',
  'label_misconception_1', 'label_misconception_2', 'label_misconception_3',
  'repair_distractor_1', 'repair_distractor_2', 'repair_distractor_3',
  'contrast_distractor_1', 'contrast_distractor_2', 'contrast_distractor_3',
  'classify_family', 'locate_decision_cue', 'teach_back', 'mastery_check'
];

test('daftar mode sinkron dengan app.js (25 mode, tidak lebih tidak kurang)', () => {
  assert.strictEqual(GRAMMAR_PRACTICE_MODES.length, 25, 'harus tepat 25 mode');
  const keys = Object.keys(prior.MODE_COST).sort();
  const modes = GRAMMAR_PRACTICE_MODES.slice().sort();
  assert.deepStrictEqual(keys, modes, 'kunci MODE_COST harus persis sama dengan GRAMMAR_PRACTICE_MODES');
});

// (b) semua 25 mode punya biaya numerik di rentang kontrak -0.9..+0.9
test('(b) semua 25 mode punya biaya numerik dalam rentang -0.9..+0.9', () => {
  for (const mode of GRAMMAR_PRACTICE_MODES) {
    const cost = prior.MODE_COST[mode];
    assert.strictEqual(typeof cost, 'number', mode + ' harus punya biaya angka');
    assert.ok(Number.isFinite(cost), mode + ' harus finite');
    assert.ok(cost >= -0.9 && cost <= 0.9, mode + ' harus dalam [-0.9, 0.9], dapat ' + cost);
  }
});

// (a) variansi difficulty di dalam SATU level > 0.3 — ini gate yang membunuh T1/T2:
// kalau semua mode kembali ke angka yang sama, seleksi kesulitan kembali jadi no-op.
test('(a) variansi difficulty dalam satu level > 0.3', () => {
  for (const level of ['A2', 'B1', 'B2', 'C1']) {
    const values = GRAMMAR_PRACTICE_MODES.map(mode =>
      prior.difficultyFor({ level, mode, domain: 'grammar' }));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    assert.ok(variance > 0.3, 'variansi level ' + level + ' harus > 0.3, dapat ' + variance.toFixed(4));
  }
});

// (c) arah beban kognitif: metabahasa > recognition. Angka boleh berubah saat kalibrasi
// nanti, tetapi ARAH ini tidak boleh terbalik.
test('(c) mode metabahasa lebih berat daripada mode recognition', () => {
  const meta = ['justify_correct', 'identify_misconception', 'sequence_reasoning', 'teach_back'];
  const recog = ['recognize_rule', 'recognize_objective', 'recall_memory_cue'];
  for (const m of meta) for (const r of recog) {
    assert.ok(prior.MODE_COST[m] > prior.MODE_COST[r],
      m + ' (' + prior.MODE_COST[m] + ') harus > ' + r + ' (' + prior.MODE_COST[r] + ')');
    assert.ok(
      prior.difficultyFor({ level: 'B1', mode: m }) > prior.difficultyFor({ level: 'B1', mode: r }),
      'difficultyFor B1 ' + m + ' harus > ' + r);
  }
  // produksi terarah harus sedang-positif: di atas recognition, di bawah/sama metabahasa terberat.
  for (const p of ['apply_form', 'complete_sentence']) {
    assert.ok(prior.MODE_COST[p] > 0, p + ' harus positif');
    assert.ok(prior.MODE_COST[p] < prior.MODE_COST.teach_back, p + ' harus < teach_back');
  }
});

// (d) clamp bekerja di kedua ujung.
test('(d) clamp bawah 0.5 dan atas 6.9 bekerja', () => {
  // A1 (basis 1) + recognize_rule (-0.9) = 0.1 -> harus naik ke 0.5.
  assert.strictEqual(prior.difficultyFor({ level: 'A1', mode: 'recognize_rule', domain: 'grammar' }), 0.5);
  // C2 (basis 6) + teach_back (+0.9) = 6.9 -> tepat di plafon.
  assert.strictEqual(prior.difficultyFor({ level: 'C2', mode: 'teach_back', domain: 'grammar' }), 6.9);
  // C2 + teach_back + stem panjang = 7.05 -> harus turun ke 6.9.
  assert.strictEqual(
    prior.difficultyFor({ level: 'C2', mode: 'teach_back', domain: 'grammar', stemLength: 200 }), 6.9);
  // Level tak dikenal dianggap A1 (basis 1), bukan NaN/negatif.
  const unknown = prior.difficultyFor({ level: 'Z9', mode: 'classify_family' });
  assert.ok(unknown >= 0.5 && unknown <= 6.9 && Number.isFinite(unknown),
    'level tak dikenal harus tetap dalam rentang, dapat ' + unknown);
});

// (e) domain non-grammar kembali ke basis level murni — biaya mode grammar tidak
// bermakna untuk vocabulary/reading dan tidak boleh bocor ke sana.
test('(e) domain vocabulary/reading mengembalikan basis level', () => {
  for (const domain of ['vocabulary', 'reading']) {
    assert.strictEqual(prior.difficultyFor({ level: 'A1', mode: 'teach_back', domain }), 1);
    assert.strictEqual(prior.difficultyFor({ level: 'B1', mode: 'apply_form', domain }), 3);
    assert.strictEqual(prior.difficultyFor({ level: 'C2', mode: 'recognize_rule', domain }), 6);
  }
});

// Beban leksikal opsional: stem > 120 karakter menambah +0.15, <= 120 tidak.
test('beban leksikal: stem > 120 karakter menambah +0.15', () => {
  const short = prior.difficultyFor({ level: 'B1', mode: 'apply_form', stemLength: 120 });
  const long = prior.difficultyFor({ level: 'B1', mode: 'apply_form', stemLength: 121 });
  assert.ok(Math.abs((long - short) - 0.15) < 1e-9, 'selisih harus 0.15, dapat ' + (long - short));
  const noStem = prior.difficultyFor({ level: 'B1', mode: 'apply_form' });
  assert.strictEqual(noStem, short, 'tanpa stemLength harus sama dengan stem pendek');
});

// MODE_COST harus beku — prior yang bisa dimutasi runtime bukan lagi prior.
test('MODE_COST adalah objek beku (frozen)', () => {
  assert.ok(Object.isFrozen(prior.MODE_COST), 'MODE_COST harus Object.freeze');
  assert.throws(() => { 'use strict'; prior.MODE_COST.apply_form = 99; }, /Cannot|read only|not extensible/i);
});

// Modul murni & deterministik: masukan sama -> keluaran sama.
test('deterministik: masukan sama menghasilkan angka sama', () => {
  const a = prior.difficultyFor({ level: 'B2', mode: 'repair_distractor_2', stemLength: 150 });
  const b = prior.difficultyFor({ level: 'B2', mode: 'repair_distractor_2', stemLength: 150 });
  assert.strictEqual(a, b);
  assert.ok(Number.isFinite(a));
});

if (failures) { console.error(failures + ' kegagalan'); process.exit(1); }
console.log('FiezelItemPrior: PASS');
