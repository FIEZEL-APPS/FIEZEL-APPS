'use strict';
/**
 * Gerbang ANALISIS BUTIR SOAL (R5, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * B1  kategori kesukaran dan daya beda mengikuti batas standar (0,30/0,70; 0,20/0,30/0,40)
 * B2  p dihitung dari w[] (soal yang tidak ada di w[] = benar); nilai kertas tidak dihitung
 * B3  daya beda butuh ≥ 10 murid; kunci yang dipilih kelompok bawah lebih sering = "terbalik"
 * B4  pengecoh yang dipilih < 5% murid ditandai tidak berfungsi
 * B5  CSV aman (kutip) dan sambungan ke shell guru, loader, sw.js
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
global.self = global;
global.FiezelReviewBank = require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
global.FiezelKelasTanpaHP = require(path.join(__fzRoot, 'features/teacher/fiezel-kelas-tanpa-hp.js'));
const AB = require(path.join(__fzRoot, 'features/teacher/fiezel-analisis-butir.js'));
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
let pass = 0, fail = 0;
function check(name, f) { try { f(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); } }

const q1 = { id: 'q1', prompt: 'Mudah "sekali", ya', options: ['a', 'b', 'c', 'd'], answer: 0 };
const q2 = { id: 'q2', prompt: 'Soal pembeda', options: ['a', 'b', 'c', 'd'], answer: 1 };
const q3 = { id: 'q3', prompt: 'Kunci salah', options: ['a', 'b', 'c', 'd'], answer: 2 };
const a = { id: 'as-b', itemIds: ['q1', 'q2', 'q3'], items: [q1, q2, q3], done: {} };
// 12 murid: 6 pintar (benar q1,q2; salah q3 pilih D), 6 lemah (benar q1,q3; salah q2 pilih A)
for (let i = 0; i < 6; i++) a.done['p' + i] = { c: 2, t: 3, w: [{ i: 'q3', o: 3 }] };
for (let i = 0; i < 6; i++) a.done['l' + i] = { c: 1, t: 3, w: [{ i: 'q2', o: 0 }, { i: 'q1', o: i === 0 ? 1 : undefined }].filter((x, k) => k === 0 || i === 0) };
a.done.kertas = { c: 3, t: 3, src: 'kertas' };

check('B1 batas kategori', () => {
  assert.strictEqual(AB.kesukaran(0.71), 'mudah'); assert.strictEqual(AB.kesukaran(0.7), 'sedang');
  assert.strictEqual(AB.kesukaran(0.3), 'sedang'); assert.strictEqual(AB.kesukaran(0.29), 'sukar');
  assert.strictEqual(AB.dayaBeda(0.4), 'sangat-baik'); assert.strictEqual(AB.dayaBeda(0.3), 'baik');
  assert.strictEqual(AB.dayaBeda(0.2), 'cukup'); assert.strictEqual(AB.dayaBeda(0.19), 'perbaiki');
  assert.strictEqual(AB.dayaBeda(-0.1), 'terbalik'); assert.strictEqual(AB.dayaBeda(null), 'kurang-data');
});

const h = AB.analisis({}, a);
check('B2 p dari w[]; nilai kertas dilewati', () => {
  assert.strictEqual(h.n, 12); assert.strictEqual(h.dilewati, 1);
  const [r1, r2, r3] = h.rows;
  assert.strictEqual(r1.p, Math.round(11 / 12 * 100) / 100); assert.strictEqual(r1.kesukaran, 'mudah');
  assert.strictEqual(r2.p, 0.5); assert.strictEqual(r3.p, 0.5);
});

check('B3 daya beda & kunci terbalik', () => {
  const [, r2, r3] = h.rows;
  assert.strictEqual(h.kelompok, 3);
  assert.strictEqual(r2.d, 1); assert.strictEqual(r2.dayaBeda, 'sangat-baik');
  assert.strictEqual(r3.d, -1); assert.strictEqual(r3.dayaBeda, 'terbalik'); assert.strictEqual(r3.rekomendasi, 'periksa-kunci');
  const kecil = AB.analisis({}, Object.assign({}, a, { done: { x: { c: 3, t: 3, w: [] } } }));
  assert.strictEqual(kecil.rows[0].d, null); assert.strictEqual(kecil.rows[0].dayaBeda, 'kurang-data');
  assert.ok(kecil.rows.every((r) => r.rekomendasi === 'kurang-data'), 'murid < 10: tidak boleh "layak dipakai lagi"');
});

check('B4 pengecoh tidak berfungsi', () => {
  const r2 = h.rows[1];
  const byHuruf = Object.fromEntries(r2.pengecoh.map((x) => [x.huruf, x]));
  assert.strictEqual(byHuruf.B.kunci, true); assert.strictEqual(byHuruf.B.dipilih, 6);
  assert.strictEqual(byHuruf.A.dipilih, 6); assert.strictEqual(byHuruf.A.berfungsi, true);
  assert.strictEqual(byHuruf.C.berfungsi, false); assert.strictEqual(byHuruf.D.berfungsi, false);
});

check('B5 CSV aman dan sambungan', () => {
  const csv = AB.csv(h);
  assert.ok(csv.split('\n')[1].includes('"Mudah ""sekali"", ya"'));
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  for (const s2 of ['data-kind="analisis-butir"', "m.kind === 'analisis-butir'", "case 'butir-csv'"]) assert.ok(shell.includes(s2), s2);
  const loader = (read('features/teacher/fiezel-teacher-loader.js').match(/var BUNDLE = \[[^\]]*\]/) || [''])[0];
  assert.ok(loader.indexOf('fiezel-analisis-butir.js') > 0 && loader.indexOf('fiezel-analisis-butir.js') < loader.indexOf('fiezel-teacher-shell.js'));
  assert.ok(read('sw.js').includes("'./features/teacher/fiezel-analisis-butir.js'"));
});

console.log(`\nanalisis-butir-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
