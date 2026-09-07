// tests/family-graph-injection-test.js — graf keluarga boleh diganti bahasa, TANPA menggeser
// satu pun prasyarat murid Inggris.
//
// KENAPA GERBANG INI ADA
// ----------------------
// `PREREQUISITES` di `features/brain/fiezel-core-brain.js` adalah satu-satunya jawaban mesin
// atas pertanyaan "sebelum ini, apa yang harus sudah bisa?". `rootCause()` memakainya untuk
// menunjuk akar kesalahan, dan penjadwal memakainya untuk memutuskan apa yang layak muncul
// berikutnya. Isinya keluarga tata bahasa INGGRIS — `tense_aspect`, `articles_determiners`,
// `relative_clauses`.
//
// Kursus Jepang butuh graf yang sama sekali lain: `particles`, `te_form`, `counters`. Cara
// termurah menambahkannya adalah menempelkan keluarga Jepang ke dalam peta yang sama.
// Itu justru kelas kegagalan yang paling mahal di repo ini: peta itu dibaca murid Inggris
// HARI INI, dan pencemarannya tidak melempar error — ia hanya membuat `rootCause()` mulai
// menunjuk akar yang keliru, pelan-pelan, tanpa satu pun gerbang lain yang merah.
//
// Maka jalurnya bukan menempel, melainkan MENYUNTIK: graf keluarga jadi bisa diganti utuh
// (mengikuti pola `setCurriculumGraph(rows)` yang sudah ada untuk graf lesson), dengan graf
// Inggris sebagai bawaan yang tidak berubah sebyte pun.
//
// YANG DIJAGA GERBANG INI
// -----------------------
//   1. Graf Inggris bawaan IDENTIK dengan daftar yang ditulis ulang di berkas ini. Daftar itu
//      sengaja diketik tangan, bukan disalin dari modul saat uji berjalan — kalau ia dibaca
//      dari modul yang sedang diuji, ia akan setuju dengan dirinya sendiri selamanya.
//   2. `PREREQUISITES` yang diekspor tetap menunjuk graf Inggris, bukan graf yang disuntikkan.
//   3. Menyuntik graf Jepang benar-benar mengganti jawaban `prerequisiteChain()`.
//   4. `resetFamilyGraph()` mengembalikan graf Inggris persis seperti semula.
//   5. Objek yang disuntikkan TIDAK bisa dipakai memutasi graf bawaan dari luar.
//   6. Graf keluarga Jepang yang diusulkan memang bisa disuntikkan apa adanya.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const brain = require(path.join(__fzRoot, 'features', 'brain', 'fiezel-core-brain.js'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

// Daftar ini adalah PATOKAN, bukan cerminan. Ia ditulis tangan dari graf Inggris yang berlaku
// saat gerbang ini lahir. Kalau ada yang mengubah PREREQUISITES, gerbang ini yang menyalak.
const GRAF_INGGRIS = {
  tense_aspect: [],
  question_negation: ['tense_aspect'],
  articles_determiners: [],
  prepositions: [],
  comparison: ['articles_determiners'],
  modals: ['tense_aspect'],
  passive: ['tense_aspect'],
  conditionals: ['tense_aspect', 'modals'],
  reported_speech: ['tense_aspect', 'question_negation'],
  gerunds_infinitives: ['prepositions'],
  relative_clauses: ['question_negation'],
  linking_devices: ['relative_clauses'],
  emphasis_inversion: ['relative_clauses', 'question_negation'],
  error_correction: ['tense_aspect', 'articles_determiners'],
  core_grammar: [],
  advanced_grammar: ['conditionals', 'passive', 'relative_clauses'],
  nouns: [],
  pronouns_determiners: [],
  possession: ['nouns', 'pronouns_determiners'],
  quantifiers: ['nouns'],
  question_formation: ['tense_aspect']
};

function petaDari(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => { out[k] = Array.prototype.slice.call(obj[k] || []); });
  return out;
}

test('API penyuntikan graf keluarga ada dan berbentuk fungsi', () => {
  assert.strictEqual(typeof brain.setFamilyGraph, 'function', 'setFamilyGraph belum ada');
  assert.strictEqual(typeof brain.resetFamilyGraph, 'function', 'resetFamilyGraph belum ada');
  assert.strictEqual(typeof brain.familyGraph, 'function', 'familyGraph belum ada');
});

test('graf Inggris bawaan identik dengan patokan yang ditulis tangan di gerbang ini', () => {
  const aktual = petaDari(brain.familyGraph());
  assert.deepStrictEqual(aktual, GRAF_INGGRIS,
    'graf keluarga Inggris bergeser dari patokan — ini menggeser rootCause() untuk murid yang ada');
});

test('PREREQUISITES yang diekspor tetap graf Inggris, bukan graf yang sedang aktif', () => {
  assert.deepStrictEqual(petaDari(brain.PREREQUISITES), GRAF_INGGRIS);
});

test('rantai prasyarat Inggris tetap seperti semula sebelum penyuntikan apa pun', () => {
  const rantai = brain.prerequisiteChain('conditionals');
  assert.ok(rantai.indexOf('modals') >= 0, 'conditionals kehilangan modals');
  assert.ok(rantai.indexOf('tense_aspect') >= 0, 'conditionals kehilangan tense_aspect');
});

test('menyuntik graf lain benar-benar mengganti jawaban prerequisiteChain', () => {
  brain.setFamilyGraph({ te_form: ['verb_forms'], verb_forms: ['particles'], particles: [] });
  const rantai = brain.prerequisiteChain('te_form');
  assert.deepStrictEqual(rantai, ['verb_forms', 'particles'],
    'graf yang disuntikkan tidak dipakai prerequisiteChain');
  assert.deepStrictEqual(brain.prerequisiteChain('conditionals'), [],
    'keluarga Inggris masih terjawab padahal graf sudah diganti — dua graf tercampur');
  brain.resetFamilyGraph();
});

test('resetFamilyGraph mengembalikan graf Inggris persis seperti semula', () => {
  brain.setFamilyGraph({ apa_saja: [] });
  brain.resetFamilyGraph();
  assert.deepStrictEqual(petaDari(brain.familyGraph()), GRAF_INGGRIS);
  assert.ok(brain.prerequisiteChain('conditionals').indexOf('modals') >= 0);
});

test('objek yang disuntikkan tidak bisa dipakai memutasi graf dari luar', () => {
  const luar = { satu: ['dua'], dua: [] };
  brain.setFamilyGraph(luar);
  luar.satu.push('tiga');
  luar.empat = [];
  assert.deepStrictEqual(brain.prerequisiteChain('satu'), ['dua'],
    'menyunting objek pemanggil ikut mengubah graf di dalam brain');
  assert.deepStrictEqual(brain.prerequisiteChain('empat'), [],
    'keluarga yang ditambahkan setelah penyuntikan ikut masuk');
  brain.resetFamilyGraph();
});

test('graf keluarga Jepang yang diusulkan bisa disuntikkan apa adanya', () => {
  const berkas = path.join(__fzRoot, 'docs', 'japanese', 'n5-a1-family-graph.json');
  const doc = JSON.parse(fs.readFileSync(berkas, 'utf8'));
  brain.setFamilyGraph(doc.families);
  const rantai = brain.prerequisiteChain('te_form');
  assert.ok(rantai.length > 0, 'te_form tidak punya prasyarat setelah graf Jepang disuntikkan');
  Object.keys(doc.families).forEach((keluarga) => {
    (doc.families[keluarga] || []).forEach((induk) => {
      assert.ok(Object.prototype.hasOwnProperty.call(doc.families, induk),
        'prasyarat "' + induk + '" (dari ' + keluarga + ') tidak dikenal graf Jepang');
    });
  });
  brain.resetFamilyGraph();
  assert.deepStrictEqual(petaDari(brain.familyGraph()), GRAF_INGGRIS,
    'graf Inggris tidak pulih setelah graf Jepang dipakai');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  const wf = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(wf.includes('family-graph-injection-test.js'), 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('family-graph-injection-test GAGAL: ' + failures.length + ' assert merah');
  console.log('family-graph-injection-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('family-graph-injection-test: ' + pass + '/' + total + ' assert PASS');
