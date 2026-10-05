'use strict';
/**
 * Gerbang LATIHAN BICARA PRIVAT (R7, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * P1  bank: 25 topik A1–A2 × 6 latihan = 150, id unik, tahap berurutan tirukan → ganti → jawab
 * P2  umpan balik TANPA angka: cocokkan() tidak mengembalikan skor/persen/lulus
 * P3  ganti kata: isian mana pun diakui; isian yang tidak terdengar ditandai, bukan disalahkan
 * P4  kemajuan lokal: tandai lancar, latihan berikutnya, topik saran, data asing ditolak
 * P5  privasi: tidak menyimpan transkrip/audio, tidak memanggil jaringan, tidak melapor ke guru
 * P6  tampilan: janji tanpa nilai tampil; kalimat target di-escape; jalan tanpa pengenal suara
 * P7  sambungan: tab "Bicara privat" + kartu ajakan di rencana, index.html, sw.js
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const store = {};
global.self = global;
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const B = require(path.join(__fzRoot, 'features/speaking-listening/fiezel-bicara-privat.js'));
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '-', e && e.message); }
}

check('P1 bank 150 latihan A1–A2, bertahap per topik', () => {
  assert.strictEqual(B.TOPIK_IDS.length, 25);
  assert.strictEqual(B.ITEMS.length, 150);
  assert.strictEqual(new Set(B.ITEMS.map((x) => x.id)).size, 150, 'id unik');
  assert.ok(B.ITEMS.every((x) => x.level === 'A1' || x.level === 'A2'));
  for (const id of B.TOPIK_IDS) {
    const tahap = B.ITEMS.filter((x) => x.topik === id).map((x) => x.tahap).join(',');
    assert.strictEqual(tahap, 'tirukan,tirukan,ganti,ganti,jawab,jawab', id);
    assert.ok(B.judulTopik(id) && B.judulTopik(id) !== id, 'judul Indonesia untuk ' + id);
  }
  for (const it of B.ITEMS) {
    assert.ok(/^[A-Z]/.test(it.contoh) && /[.?!]$/.test(it.contoh), 'contoh kalimat utuh: ' + it.id);
    if (it.tahap === 'ganti') assert.ok(it.pola.includes('{x}') && it.isian.length === 3, it.id);
  }
});

check('P2 umpan balik tanpa angka', () => {
  const r = B.cocokkan(B.byId('sekolah-t1'), 'I go to school every morning');
  assert.deepStrictEqual(r.belum, []);
  assert.ok(r.terdengar.includes('school'));
  const isi = JSON.stringify(r);
  assert.ok(!/score|skor|persen|percent|lulus|pass/i.test(Object.keys(r).join(' ')), 'kunci berbau nilai: ' + Object.keys(r));
  assert.ok(Object.values(r).every((v) => typeof v !== 'number'), 'tidak ada angka: ' + isi);
  const sebagian = B.cocokkan(B.byId('sekolah-t1'), 'I go to school');
  assert.ok(sebagian.belum.includes('every') && sebagian.belum.includes('morning'));
  assert.strictEqual(B.cocokkan(B.byId('sekolah-t1'), '').kosong, true);
});

check('P3 ganti kata: isian bebas dipilih, yang tak terdengar ditandai', () => {
  const it = B.byId('perkenalan-g1');
  assert.strictEqual(B.cocokkan(it, 'I am from Medan').isian, 'Medan');
  assert.strictEqual(B.cocokkan(it, 'i am from makassar.').isian, 'Makassar');
  const lain = B.cocokkan(it, 'I am from Jakarta');
  assert.strictEqual(lain.isian, null);
  assert.strictEqual(lain.isianBelum, true);
  assert.strictEqual(B.cocokkan(B.byId('transportasi-g2'), 'I go to school by online motorbike taxi').isian, 'by online motorbike taxi');
});

check('P4 kemajuan lokal', () => {
  let p = B.muat();
  assert.deepStrictEqual(p, { lancar: {} });
  assert.strictEqual(B.topikSaran(p), 'perkenalan');
  assert.strictEqual(B.berikutnya(p, 'perkenalan').id, 'perkenalan-t1');
  B.tandaiLancar(p, 'perkenalan-t1');
  B.tandaiLancar(p, 'tidak-ada');
  p = B.muat();
  assert.deepStrictEqual(Object.keys(p.lancar), ['perkenalan-t1']);
  assert.strictEqual(B.berikutnya(p, 'perkenalan').id, 'perkenalan-t2');
  B.ITEMS.filter((x) => x.topik === 'perkenalan').forEach((x) => B.tandaiLancar(p, x.id));
  assert.strictEqual(B.ringkasTopik(B.muat(), 'perkenalan').selesai, true);
  assert.strictEqual(B.topikSaran(B.muat()), 'keluarga');
  store[B.KEY] = '{"lancar":"rusak"}';
  assert.deepStrictEqual(B.muat(), { lancar: {} }, 'data rusak tidak membuat layar mati');
});

check('P5 privasi: tanpa transkrip tersimpan, tanpa jaringan, tanpa laporan guru', () => {
  const src = read('features/speaking-listening/fiezel-bicara-privat.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|reportToClass|MediaRecorder|getUserMedia/.test(src), 'modul tidak boleh mengirim/merekam');
  assert.ok(/JSON\.stringify\(\{ lancar: p\.lancar \|\| \{\} \}\)/.test(src), 'yang disimpan hanya peta lancar');
  B.tandaiLancar(B.muat(), 'keluarga-t1');
  assert.deepStrictEqual(Object.keys(JSON.parse(store[B.KEY])), ['lancar']);
});

check('P6 tampilan: janji privat, escape, tanpa pengenal suara', () => {
  delete store[B.KEY];
  const el = { innerHTML: '', _h: null, addEventListener(t, fn) { this._h = fn; }, removeEventListener() {}, contains: () => true };
  B.mount(el, {});
  assert.ok(/tidak ada nilai, tidak ada penonton/.test(el.innerHTML));
  assert.ok(!/\d+%/.test(el.innerHTML), 'tidak ada persen di layar');
  const klik = (bp, extra) => el._h({ target: { closest: () => ({ getAttribute: (a) => (a === 'data-bp' ? bp : extra) }) } });
  klik('topik', 'perkenalan');
  assert.ok(/Hello, my name is Dina\./.test(el.innerHTML));
  assert.ok(!/data-bp="bicara"/.test(el.innerHTML), 'tanpa pengenal suara tidak ada tombol rekam');
  assert.ok(/tidak punya pengenal suara/.test(el.innerHTML));
  klik('lancar');
  assert.ok(/Hello|Nice to meet you/.test(el.innerHTML));
  assert.ok(/Nice to meet you\./.test(el.innerHTML), 'lanjut ke latihan berikutnya');
  B.unmount();
  const src = read('features/speaking-listening/fiezel-bicara-privat.js');
  assert.ok(/esc\(it\.target\)/.test(src) && /esc\(it\.tanya\)/.test(src) && /esc\(it\.pola\)/.test(src));
});

check('P7 sambungan ke aplikasi', () => {
  const lf = read('features/learner-flow/fiezel-learner-flow.js');
  assert.ok(lf.includes("['bicara', t('sekolah.tab-bicara', 'Bicara privat')]"), 'tab bicara');
  assert.ok(lf.includes('data-tab="bicara"'), 'kartu ajakan di rencana');
  assert.ok(lf.includes('BP.mount(bh, env)') && lf.includes('BP.unmount()'));
  assert.ok(read('index.html').includes('./features/speaking-listening/fiezel-bicara-privat.js'));
  assert.ok(read('sw.js').includes("'./features/speaking-listening/fiezel-bicara-privat.js'"));
  assert.ok(read('features/i18n/copy-id-sekolah.js').includes("'sekolah.bicara-janji'"));
});

console.log(`\nbicara-privat-test: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
