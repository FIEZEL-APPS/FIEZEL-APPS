'use strict';
/**
 * Gerbang RAPOR KKTP (R2, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * R1  KKTP kelas: bawaan 75%, dibatasi 50–95%, bisa diubah guru
 * R2  tingkat ketercapaian bergeser mengikuti KKTP
 * R3  TP dengan bukti < MIN_BUKTI tidak diberi tingkat ("belum cukup data")
 * R4  deskripsi dua kalimat memakai rumusan tujuan dari bank, bukan kode keterampilan
 * R5  CSV e-Rapor: suntingan guru menang atas deskripsi otomatis; kutip/koma aman
 * R6  "KKM 75" tidak lagi tertanam di layar guru; semua jalur memakai KKTP kelas
 * R7  sambungan: tombol & modal Rapor KKTP, loader, sw.js
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.self = global;
global.FiezelReviewBank = require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
const R = require(path.join(__fzRoot, 'features/teacher/fiezel-rapor-kktp.js'));
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
}

const c = {
  name: '8A',
  students: [
    { id: 'a', name: 'Rina', results: [{ skill: 'past_tense', correct: 9, total: 10 }, { skill: 'vocab_a2', correct: 4, total: 10 }] },
    { id: 'b', name: 'Budi "Bud", Jr', results: [{ skill: 'past_tense', correct: 2, total: 3 }, { skill: 'vocab_a2', correct: 8, total: 10 }] },
    { id: 'c', name: 'Sari', results: [] }
  ]
};

check('R1 KKTP bawaan, batas, dan ubah', () => {
  assert.strictEqual(R.kktpOf({}), 0.75);
  const k = {};
  R.setKktp(k, 40); assert.strictEqual(R.kktpOf(k), 0.5);
  R.setKktp(k, 120); assert.strictEqual(R.kktpOf(k), 0.95);
  R.setKktp(k, 70); assert.strictEqual(R.kktpOf(k), 0.7);
});

check('R2 tingkat mengikuti KKTP', () => {
  assert.strictEqual(R.tingkat(0.55, 0.75), 'perlu-bimbingan');
  assert.strictEqual(R.tingkat(0.7, 0.75), 'mulai-berkembang');
  assert.strictEqual(R.tingkat(0.8, 0.75), 'tercapai');
  assert.strictEqual(R.tingkat(0.95, 0.75), 'mahir');
  assert.strictEqual(R.tingkat(0.7, 0.65), 'tercapai', 'KKTP lebih rendah menggeser ambang');
  assert.strictEqual(R.tingkat(null, 0.75), 'kurang-data');
});

check('R3 bukti tipis tidak diberi tingkat', () => {
  const r = R.raporMurid(c, c.students[1]);
  const pt = r.rows.find((x) => x.skill === 'past_tense');
  assert.strictEqual(pt.n, 3);
  assert.strictEqual(pt.acc, null);
  assert.strictEqual(pt.tingkat, 'kurang-data');
  assert.strictEqual(r.nilai, 80, 'nilai akhir hanya dari TP yang cukup bukti');
  const kosong = R.raporMurid(c, c.students[2]);
  assert.strictEqual(kosong.nilai, null);
  assert.ok(/belum memiliki cukup bukti/.test(R.deskripsi(kosong).tinggi));
});

check('R4 deskripsi memakai rumusan tujuan pembelajaran', () => {
  const r = R.raporMurid(c, c.students[0]);
  const d = R.deskripsi(r);
  assert.ok(/^Ananda Rina menunjukkan penguasaan yang baik dalam membedakan bentuk dasar/.test(d.tinggi), d.tinggi);
  assert.ok(/^Ananda Rina perlu bimbingan dalam memilih kata A2/.test(d.rendah), d.rendah);
  assert.ok(!/past_tense|vocab_a2/.test(d.tinggi + d.rendah), 'kode keterampilan bocor ke rapor');
});

check('R5 CSV e-Rapor: suntingan guru menang, kutip aman', () => {
  const csv = R.csvRapor(c, { a: { tinggi: 'Disunting "guru", rapi.' } });
  const lines = csv.split('\n');
  assert.strictEqual(lines.length, 4);
  assert.ok(lines[0].includes('Status KKTP 75%'));
  assert.ok(lines[1].includes('"Disunting ""guru"", rapi."'));
  assert.ok(lines[2].includes('"Budi ""Bud"", Jr"'));
});

check('R8 nilai kertas (Kelas Tanpa HP) masuk rapor', () => {
  global.FiezelKelasTanpaHP = require(path.join(__fzRoot, 'features/teacher/fiezel-kelas-tanpa-hp.js'));
  const B = global.FiezelReviewBank;
  const pt = B.pickFresh('past_tense', 4, { seed: 3 }).map((q) => q.id);
  const vc = B.pickFresh('vocab_a2', 4, { seed: 3 }).map((q) => q.id);
  const k = {
    name: '7B',
    students: [{ id: 'x', name: 'Tono', results: [] }],
    assignments: [
      { id: 'p1', skills: ['past_tense'], itemIds: pt, done: { x: { c: 3, t: 4, src: 'kertas' } } },
      { id: 'p2', skills: ['past_tense', 'vocab_a2'], itemIds: pt.concat(vc), done: { x: { c: 6, t: 8, src: 'kertas' } } },
      { id: 'p3', skills: ['past_tense'], itemIds: pt, done: { x: { c: 4, t: 4, at: 1, w: [] } } }
    ]
  };
  assert.deepStrictEqual(R.daftarTP(k), ['past_tense', 'vocab_a2'], 'TP lahir dari nilai kertas');
  const r = R.raporMurid(k, k.students[0]);
  const rp = r.rows.find((x) => x.skill === 'past_tense'), rv = r.rows.find((x) => x.skill === 'vocab_a2');
  assert.strictEqual(rp.n, 8, 'p1 utuh + separuh p2; hasil aplikasi p3 tidak dihitung dua kali');
  assert.strictEqual(rp.acc, 6 / 8);
  assert.strictEqual(rv.n, 4);
  assert.strictEqual(rv.tingkat, 'kurang-data', 'separuh lembar kertas (4 soal) belum cukup bukti untuk TP sendiri');
  assert.ok(r.nilai != null, 'murid tanpa HP tetap punya nilai rapor');
  assert.ok(/var tps = daftarTP\(c, env\);\s*return \(c && c\.students \|\| \[\]\)\.map\(function \(s\) \{ var r = raporMurid\(c, s, env, tps\)/.test(fs.readFileSync(path.join(__fzRoot, 'features/teacher/fiezel-rapor-kktp.js'), 'utf8')), 'raporKelas menghitung daftar TP sekali per kelas');
  delete global.FiezelKelasTanpaHP;
});

check('R6 KKM 75 tidak lagi tertanam di layar guru', () => {
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  assert.ok(!/KKM 75/.test(shell.replace(/\/\*[\s\S]*?\*\//g, '')), 'masih ada "KKM 75" di kode yang tampil');
  assert.ok(/remedialGroups\(c, kktpKelas\(c\)\)/.test(shell));
  assert.ok(/acc >= kktpKelas\(c\)/.test(shell));
});

check('R7 sambungan Rapor KKTP', () => {
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  for (const s of ['data-kind="rapor-kktp"', "m.kind === 'rapor-kktp'", "kind === 'rapor-kktp'", 'Rk.csvRapor(c, c.raporEdits)']) assert.ok(shell.includes(s), s);
  const loader = (read('features/teacher/fiezel-teacher-loader.js').match(/var BUNDLE = \[[^\]]*\]/) || [''])[0];
  assert.ok(loader.indexOf('fiezel-rapor-kktp.js') > 0 && loader.indexOf('fiezel-rapor-kktp.js') < loader.indexOf('fiezel-teacher-shell.js'));
  assert.ok(read('sw.js').includes("'./features/teacher/fiezel-rapor-kktp.js'"));
});

console.log(`\nrapor-kktp-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
