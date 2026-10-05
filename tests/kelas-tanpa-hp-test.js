'use strict';
/**
 * Gerbang KELAS TANPA HP (R1, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * K1  soal tugas terselesaikan dari bank (itemIds) dan soal tulisan guru (items)
 * K2  varian B berisi soal yang sama, urutan berbeda, dan kuncinya tetap menunjuk jawaban benar
 * K3  lembar cetak memuat varian A, B, kunci — dan soal tulisan guru tidak bisa menyisipkan markup
 * K4  nilai kertas: rentang divalidasi, hasil dari aplikasi tidak ditimpa
 * K5  pemanasan mengurutkan soal yang paling banyak salah; tanpa data jatuh ke keterampilan terlemah
 * K6  layar pemanasan menandai kunci hanya setelah "tampilkan jawaban"
 * K7  sambungan: tombol di kartu tugas, modal & form nilai kertas, tombol pemanasan, loader, sw.js, index.html
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.self = global;
const B = require(path.join(__fzRoot, 'features/learner-flow/fiezel-review-bank.js'));
global.FiezelReviewBank = B;
const K = require(path.join(__fzRoot, 'features/teacher/fiezel-kelas-tanpa-hp.js'));
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
}

const bankIds = B.pickFresh('past_tense', 6, { seed: 5 }).map((q) => q.id);
const custom = { id: 'c1', prompt: '<script>alert(1)</script> She ___ home.', options: ['go', 'went', '<b>goes</b>'], answer: 1, skill: 'past_tense' };
const a = { id: 'as-tes', title: 'Latihan <img src=x>', itemIds: bankIds.concat(['c1']), items: [custom], deadline: '2026-10-20' };
const c = {
  name: 'Kelas 8A',
  students: [{ id: 's1', name: 'Rina' }, { id: 's2', name: 'Budi' }, { id: 's3', name: 'Sari' }],
  assignments: [a]
};

check('K1 soal bank + soal guru terselesaikan, urutan asli', () => {
  const items = K.resolveItems(a);
  assert.strictEqual(items.length, 7);
  assert.deepStrictEqual(items.map((q) => q.id), a.itemIds);
});

check('K2 varian B: soal sama, urutan beda, kunci tetap benar', () => {
  const items = K.resolveItems(a);
  const v = K.buildVariants(a, items);
  assert.deepStrictEqual(v.A.map((p) => p.id).sort(), v.B.map((p) => p.id).sort());
  assert.notDeepStrictEqual(v.A.map((p) => p.id), v.B.map((p) => p.id), 'urutan soal B harus berbeda');
  for (const p of v.A.concat(v.B)) {
    const q = items.find((x) => x.id === p.id);
    assert.strictEqual(p.options[p.key], q.options[q.answer], 'kunci ' + p.id);
  }
  const again = K.buildVariants(a, items);
  assert.deepStrictEqual(again.B.map((p) => p.id), v.B.map((p) => p.id), 'cetak ulang = lembar yang sama');
});

check('K3 lembar cetak lengkap dan aman dari markup', () => {
  const html = K.worksheetHtml(c, a, { teacherName: 'Bu Sari' });
  assert.ok(/Varian A/.test(html) && /Varian B/.test(html) && /Kunci jawaban/.test(html));
  assert.ok(!/<script>alert/.test(html), 'script dari soal guru lolos');
  assert.ok(!/<img src=x>/.test(html), 'markup dari judul lolos');
  assert.ok(/&lt;script&gt;/.test(html));
  assert.ok(/size:A4/.test(html));
});

check('K4 nilai kertas tervalidasi dan tidak menimpa hasil aplikasi', () => {
  const a2 = JSON.parse(JSON.stringify(a));
  a2.done = { s3: { at: 1, acc: 0.5, c: 3, t: 6, w: [] } };
  const c2 = Object.assign({}, c, { assignments: [a2] });
  const n = K.recordPaperScores(c2, a2, { s1: '5', s2: '99', s3: '7' }, 1000);
  assert.strictEqual(n, 1, 'hanya s1 yang sah');
  assert.deepStrictEqual(a2.done.s1, { at: 1000, acc: 5 / 7, c: 5, t: 7, src: 'kertas' });
  assert.ok(!a2.done.s2, '99 di luar rentang ditolak');
  assert.strictEqual(a2.done.s3.src, undefined, 'hasil aplikasi tidak ditimpa');
  assert.strictEqual(K.recordPaperScores(c2, a2, { s1: '6' }, 2000), 1, 'nilai kertas boleh dikoreksi');
  assert.strictEqual(a2.done.s1.c, 6);
  assert.strictEqual(K.recordPaperScores(c2, a2, { s1: '', s2: '', s3: '' }, 3000), 1, 'kotak kosong menghapus nilai kertas saja');
  assert.ok(!a2.done.s1, 'nilai kertas yang salah input bisa dihapus');
  assert.ok(a2.done.s3 && a2.done.s3.c === 3, 'hasil aplikasi tidak ikut terhapus');
});

check('K5 pemanasan: paling banyak salah dulu; tanpa data pakai keterampilan terlemah', () => {
  const a3 = JSON.parse(JSON.stringify(a));
  a3.done = {
    s1: { w: [{ i: bankIds[2], o: 0 }, { i: bankIds[4], o: 1 }] },
    s2: { w: [{ i: bankIds[2], o: 3 }] },
    s3: { w: [{ i: bankIds[2], o: 0 }, { i: bankIds[4], o: 2 }, { i: 'tidak-ada', o: 0 }] }
  };
  const list = K.warmupItems({ assignments: [a3] }, { count: 2 });
  assert.deepStrictEqual(list.map((r) => r.item.id), [bankIds[2], bankIds[4]]);
  assert.deepStrictEqual(list.map((r) => r.wrong), [3, 2]);
  const fallback = K.warmupItems({ assignments: [] }, { count: 3, weakSkill: 'past_tense' });
  assert.strictEqual(fallback.length, 3);
  assert.ok(fallback.every((r) => r.from === 'terlemah'));
});

check('K6 kunci hanya terlihat setelah tampilkan jawaban', () => {
  const list = K.warmupItems({ assignments: [] }, { count: 1, weakSkill: 'past_tense' });
  assert.ok(!/ktp-warm-key/.test(K.warmupSlideHtml(list, 0, false)));
  assert.ok(/ktp-warm-key/.test(K.warmupSlideHtml(list, 0, true)));
  assert.ok(/ktp-warm-empty/.test(K.warmupSlideHtml([], 0, false)));
});

check('K7 sambungan ke layar guru, loader, service worker, halaman', () => {
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  for (const s of ['data-tg="print-sheet"', "data-kind=\"paper-scores\"", "case 'print-sheet'", "kind === 'paper-scores'", 'data-tg="warm-start"', "m.kind === 'warmup'", "case 'warm-reveal'", "case 'warm-next'"]) {
    assert.ok(shell.includes(s), 'shell: ' + s);
  }
  const papan = shell.slice(shell.indexOf('function board(c)'), shell.indexOf('function warmup(c)'));
  assert.ok(papan.indexOf('data-tg="warm-start"') > 0 && papan.indexOf('data-tg="warm-start"') < papan.indexOf('tg-board-kpi'), 'tombol pemanasan di atas statistik papan (terjangkau di layar 720p/HP)');
  const css = read('features/teacher/teacher-shell.css');
  assert.ok(/\.tg-board\{overflow-y:auto/.test(css), 'papan bisa digulir');
  assert.ok(/\.tg-board \.ktp-warm-prompt\{color:#EAF1EE!important\}/.test(css), 'pertanyaan pemanasan tidak gelap-di-atas-gelap');
  const loader = (read('features/teacher/fiezel-teacher-loader.js').match(/var BUNDLE = \[[^\]]*\]/) || [''])[0];
  assert.ok(loader.indexOf('fiezel-kelas-tanpa-hp.js') > 0 && loader.indexOf('fiezel-kelas-tanpa-hp.js') < loader.indexOf('fiezel-teacher-shell.js'), 'modul dimuat sebelum shell');
  const sw = read('sw.js');
  assert.ok(sw.includes("'./features/teacher/fiezel-kelas-tanpa-hp.js'") && sw.includes("'./features/i18n/copy-id-sekolah.js'"));
  assert.ok(read('index.html').includes('./features/i18n/copy-id-sekolah.js'));
});

console.log(`\nkelas-tanpa-hp-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
