'use strict';
/**
 * tests/kurikulum-integritas-test.js — GERBANG: TUGAS KURIKULUM BENAR-BENAR DARI MATERI AJAR.
 *
 * Guru memilih "Descriptive Text — About Me" untuk kelas 7 dan meminta lima soal. Sampai
 * m025-290, yang terkirim ke murid adalah tiga soal kurikulum DITAMBAH lima soal Past Tense
 * dari bank umum ("Yesterday I ___ to the market") — materi kelas 8 — dan tugasnya dilabeli
 * skill `past_tense`. Tidak ada yang merah, tidak ada peringatan; guru mengira ia sedang
 * mengajarkan bab yang ia pilih.
 *
 * Sebabnya berlapis dan itulah mengapa gerbang ini menguji PERILAKU, bukan bentuk kode:
 * nama genre bukan nama skill bank, penyaring membuangnya, baris default memaksa
 * `past_tense`, dan penambal menarik soal dari bank. Empat langkah yang masing-masing
 * masuk akal sendiri-sendiri, dan bersama-sama menghasilkan tugas yang salah.
 *
 *   K1 tanpa pencemaran   — set kurikulum hanya berisi butir dari unit yang dipilih.
 *   K2 saringan sub-bab   — memilih sub-bab menghasilkan soal sub-bab itu saja.
 *   K3 saringan fitur     — mencentang fitur bahasa menghasilkan fitur itu saja.
 *   K4 pilihan jujur      — fitur yang ditawarkan UI adalah fitur yang PUNYA soal.
 *   K5 cakupan kurikulum  — tiap kelas 7-12 punya materi di kedua semester.
 *   K6 bentuk butir       — tiap butir punya sub-bab, fitur, pembahasan, dan kunci yang sah.
 */
const assert = require('assert');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* Panggung: store guru menuntut localStorage, bank soal menuntut window. */
const g = globalThis;
g.window = g;
const bin = {};
g.localStorage = { getItem: (k) => (k in bin ? bin[k] : null), setItem: (k, v) => { bin[k] = String(v); }, removeItem: (k) => { delete bin[k]; } };
require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
require(path.join(__fzRoot, 'features/brain/fiezel-item-prior.js'));
const C = require(path.join(__fzRoot, 'features/teacher/fiezel-teacher-curriculum.js'));
const T = require(path.join(__fzRoot, 'features/teacher/fiezel-teacher-store.js'));

const UNIT = 'd_g7_descriptive_me';

/* ------------------------------------------------------- K1 · tanpa pencemaran --- */

test('K1 · tugas kurikulum tidak pernah ditambal soal bank umum', () => {
  const unit = C.getUnit(UNIT);
  assert.ok(unit, 'unit uji hilang dari bank kurikulum');
  const milikUnit = new Set(unit.items.map((i) => i.id));

  /* Minta LEBIH BANYAK daripada isi babnya — inilah keadaan yang dulu memicu penambalan. */
  const picked = C.pickItems(UNIT, 40, {});
  const a = T.buildAssignment({
    title: unit.title, skills: [unit.genre], items: picked,
    count: 40, curriculumOnly: true, mode: 'latihan'
  });
  const asing = a.itemIds.filter((id) => !milikUnit.has(id));
  assert.deepStrictEqual(asing, [],
    'soal dari luar bab masuk ke tugas kurikulum: ' + asing.join(', '));
  assert.ok(a.itemIds.length <= unit.items.length,
    'jumlah soal melebihi isi bab — ada yang ditambahkan dari tempat lain');
  assert.ok(a.skills.indexOf('past_tense') === -1 || unit.genre === 'past_tense',
    'tugas dilabeli skill past_tense padahal babnya bukan itu');
});

/* ---------------------------------------------------------- K2 · saringan sub-bab --- */

test('K2 · memilih sub-bab menghasilkan soal sub-bab itu saja', () => {
  const subs = C.getSubChapters(UNIT);
  assert.ok(subs.length >= 2, 'unit uji harus punya minimal dua sub-bab');
  for (const sc of subs) {
    const got = C.pickItems(UNIT, 99, { subChapter: sc.id });
    assert.ok(got.length > 0, 'sub-bab ' + sc.no + ' tidak punya satu pun soal');
    const salah = got.filter((it) => it.subChapterId !== sc.id);
    assert.deepStrictEqual(salah.map((x) => x.id), [],
      'sub-bab ' + sc.no + ' kebocoran soal dari sub-bab lain');
  }
});

/* ----------------------------------------------------------- K3 · saringan fitur --- */

test('K3 · mencentang fitur bahasa menghasilkan fitur itu saja', () => {
  const fitur = C.getFeatures(UNIT);
  assert.ok(fitur.length >= 2, 'unit uji harus punya minimal dua fitur bahasa berisi soal');
  const pilih = fitur[0];
  const got = C.pickItems(UNIT, 99, { features: [pilih] });
  assert.ok(got.length > 0, 'fitur "' + pilih + '" tidak menghasilkan soal');
  const salah = got.filter((it) => it.feature !== pilih);
  assert.deepStrictEqual(salah.map((x) => x.id), [],
    'saringan fitur bocor: ' + salah.map((x) => x.feature).join(', '));

  /* Saringan yang menghabiskan kolam WAJIB kosong, bukan diisi ulang diam-diam. */
  const kosong = C.pickItems(UNIT, 5, { features: ['Fitur Yang Tidak Ada'] });
  assert.deepStrictEqual(kosong, [],
    'saringan yang tidak cocok justru mengembalikan soal — itu penambalan diam-diam');
});

/* ------------------------------------------------------------ K4 · pilihan jujur --- */

test('K4 · fitur yang ditawarkan adalah fitur yang benar-benar punya soal', () => {
  for (const u of C.allUnits()) {
    for (const f of C.getFeatures(u.id)) {
      assert.ok(C.pickItems(u.id, 99, { features: [f] }).length > 0,
        u.id + ': fitur "' + f + '" ditawarkan tetapi nol soal');
    }
    for (const sc of C.getSubChapters(u.id)) {
      assert.ok(C.pickItems(u.id, 99, { subChapter: sc.id }).length > 0,
        u.id + ': sub-bab ' + sc.no + ' ditawarkan tetapi nol soal');
    }
  }
});

/* --------------------------------------------------------- K5 · cakupan kurikulum --- */

test('K5 · setiap kelas 7-12 punya materi di kedua semester', () => {
  const ada = new Set(C.allUnits().map((u) => u.grade + '/' + u.semester));
  const bolong = [];
  for (let g = 7; g <= 12; g++) {
    for (const sem of [1, 2]) if (!ada.has(g + '/' + sem)) bolong.push('kelas ' + g + ' semester ' + sem);
  }
  assert.deepStrictEqual(bolong, [],
    'semester tanpa satu pun bab — guru membuka daftar dan menemukannya kosong: ' + bolong.join('; '));
});

/* -------------------------------------------------------------- K6 · bentuk butir --- */

test('K6 · tiap butir punya sub-bab, fitur, kunci sah, dan pembahasan', () => {
  const cacat = [];
  for (const u of C.allUnits()) {
    const subIds = new Set(C.getSubChapters(u.id).map((s) => s.id));
    for (const it of u.items) {
      const at = u.id + '/' + it.id;
      if (!it.subChapterId || !subIds.has(it.subChapterId)) cacat.push(at + ': sub-bab tidak dikenal');
      if (!it.feature) cacat.push(at + ': tanpa fitur bahasa');
      if (!Array.isArray(it.options) || it.options.length < 3) cacat.push(at + ': pilihan kurang dari tiga');
      if (typeof it.answer !== 'number' || !it.options[it.answer]) cacat.push(at + ': kunci jawaban di luar pilihan');
      if (new Set(it.options).size !== it.options.length) cacat.push(at + ': ada pilihan kembar');
      if (!it.note) cacat.push(at + ': tanpa catatan pembahasan');
      if (!it.why || Object.keys(it.why).length < 2) cacat.push(at + ': pengecoh tidak dijelaskan');
    }
  }
  assert.deepStrictEqual(cacat, [], cacat.join('\n      '));
});

let failures = 0;
for (const [n, fn] of tests) {
  try { fn(); console.log('ok - ' + n); }
  catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); }
}
const total = C.allUnits().reduce((a, u) => a + u.items.length, 0);
console.log('\nKurikulumIntegritas: ' + (failures ? 'FAIL (' + failures + ')' : 'PASS') +
  ' — ' + C.allUnits().length + ' bab, ' + total + ' soal');
process.exit(failures ? 1 : 0);
