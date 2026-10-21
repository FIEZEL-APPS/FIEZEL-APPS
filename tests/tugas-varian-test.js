'use strict';
/**
 * Gerbang TUGAS BERBEDA PER MURID (R4, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 * Menjalankan fungsi ASLI dari features/class-hub/fiezel-class-hub.js (diekstrak ke vm),
 * bukan mencari teks.
 *
 * V1  murid berbeda → urutan pilihan berbeda; murid sama → urutan sama (stabil saat dibuka ulang)
 * V2  tombol membawa indeks pilihan ASLI (data-i) — analisis guru (w[], pengecoh) tidak berubah;
 *     huruf A–D mengikuti posisi tampil
 * V3  soal tulisan guru tidak diacak pilihannya; a.variant === false mematikan pengacakan
 * V4  runner non-ujian mengacak urutan soal per murid
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const src = fs.readFileSync(path.join(__fzRoot, 'features/class-hub/fiezel-class-hub.js'), 'utf8');

function fn(name) {
  const i = src.indexOf('function ' + name + '(');
  assert.ok(i > 0, name);
  let depth = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error('tidak tertutup: ' + name);
}
function env(nama) {
  const ctx = vm.createContext({
    readJson: () => ({ name: nama }),
    esc: (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    Math, String, Array, Number
  });
  vm.runInContext(['shuffle', 'variantSeed', 'optionPerm', 'optionButtons'].map(fn).join('\n'), ctx);
  return ctx;
}
let pass = 0, fail = 0;
function check(name, f) { try { f(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); } }

const a = { id: 'as-uji', itemIds: [], items: [{ id: 'c1', prompt: 'x', options: ['A', 'B', 'A dan B', 'Bukan keduanya'], answer: 2 }] };
const bankItems = Array.from({ length: 8 }, (_, i) => ({ id: 'pt' + i, options: ['go', 'went', 'goes', 'going'], answer: 1 }));

check('V1 beda murid beda urutan, murid sama stabil', () => {
  const rina = env('Rina'), budi = env('Budi'), rina2 = env('rina');
  const pr = bankItems.map((q) => JSON.stringify(rina.optionPerm(a, q)));
  const pb = bankItems.map((q) => JSON.stringify(budi.optionPerm(a, q)));
  const pr2 = bankItems.map((q) => JSON.stringify(rina2.optionPerm(a, q)));
  assert.notDeepStrictEqual(pr, pb, 'Rina dan Budi mendapat urutan yang sama untuk semua soal');
  assert.deepStrictEqual(pr, pr2, 'urutan tidak stabil untuk murid yang sama');
  for (const p of pr) assert.deepStrictEqual(JSON.parse(p).slice().sort(), [0, 1, 2, 3]);
});

check('V2 tombol membawa indeks asli; huruf mengikuti posisi', () => {
  const e = env('Rina');
  const q = bankItems[3], perm = e.optionPerm(a, q);
  const html = e.optionButtons(q, null, false, perm);
  const dataI = [...html.matchAll(/data-i="(\d)"/g)].map((m) => Number(m[1]));
  assert.deepStrictEqual(dataI, JSON.parse(JSON.stringify(perm)));
  const keys = [...html.matchAll(/ch-opt-key">([A-D])</g)].map((m) => m[1]);
  assert.deepStrictEqual(keys, ['A', 'B', 'C', 'D']);
  const revealed = e.optionButtons(q, 0, true, perm);
  assert.ok(new RegExp('is-correct" data-ch="answer" data-i="1"').test(revealed), 'kunci ditandai pada indeks asli');
});

check('V3 soal guru tidak diacak; variant:false mematikan', () => {
  const e = env('Rina');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.optionPerm(a, a.items[0]))), [0, 1, 2, 3]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(e.optionPerm(Object.assign({}, a, { variant: false }), bankItems[0]))), [0, 1, 2, 3]);
});

check('V4 runner non-ujian mengacak urutan soal per murid', () => {
  const body = fn('startRunner');
  assert.ok(/else if \(a\.variant !== false && !a\.isMission\) order = shuffle\(order, variantSeed\(a\)\)/.test(body));
  assert.ok(/optionButtons\(item, r\.chosen, r\.revealed, optionPerm\(a, item\)\)/.test(src));
});

console.log(`\ntugas-varian-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
