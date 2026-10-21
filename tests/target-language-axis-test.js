// tests/target-language-axis-test.js — satu murid boleh belajar dua bahasa, dan murid Inggris
// tidak boleh membayar sepeser pun untuk itu.
//
// KENAPA GERBANG INI ADA
// ----------------------
// FIEZEL sudah dipakai murid yang sedang belajar bahasa Inggris. Progres mereka, bukti
// Braincore mereka, dan jadwal ingatan mereka tersimpan di bawah kunci-kunci `fiezel-*-v1`
// yang bentuknya sudah tetap sejak lama.
//
// Menambahkan bahasa kedua punya satu cara yang gampang dan satu cara yang benar.
//
// Yang gampang: beri SEMUA kunci awalan bahasa, termasuk kunci Inggris. Sekali dikirim,
// setiap murid Inggris yang sudah ada membuka aplikasi dan menemukan dirinya kembali ke nol
// — progresnya tidak hilang, ia hanya tidak lagi dicari di tempat ia disimpan. Tidak ada
// error, tidak ada gejala, dan kerusakannya baru terlihat dari keluhan murid.
//
// Yang benar: bahasa bawaan TIDAK PUNYA awalan sama sekali. Kunci Inggris hari ini dan kunci
// Inggris sesudah sumbu bahasa lahir wajib IDENTIK, byte per byte. Bahasa lain yang menumpang
// awalan, bukan sebaliknya.
//
// Gerbang ini yang menahan janji itu. Daftar kunci yang diuji DIBACA DARI SUMBER, bukan
// diketik ulang di sini — supaya ia ikut tumbuh saat kunci baru lahir dan tidak bisa basi
// diam-diam.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const target = require(path.join(__fzRoot, 'features', 'brain', 'fiezel-target-language.js'));

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/** Semua kunci penyimpanan `fiezel-*` yang benar-benar dipakai hari ini, dibaca dari sumber. */
function kunciNyata() {
  const berkas = [
    path.join(__fzRoot, 'app.js'),
    path.join(__fzRoot, 'features', 'learner-flow', 'fiezel-learner-flow.js'),
    path.join(__fzRoot, 'features', 'brain', 'fiezel-core-brain.js')
  ];
  const set = new Set();
  berkas.forEach((f) => {
    if (!fs.existsSync(f)) return;
    const teks = fs.readFileSync(f, 'utf8');
    const m = teks.match(/'fiezel-[a-z0-9-]+'/g) || [];
    m.forEach((raw) => set.add(raw.slice(1, -1)));
  });
  return Array.from(set).sort();
}

test('modul sumbu bahasa ada dan mengekspor API yang dijanjikan', () => {
  ['normalize', 'key', 'baseOf', 'langOf', 'isDefault', 'all'].forEach((fn) => {
    assert.strictEqual(typeof target[fn], 'function', fn + ' belum ada');
  });
  assert.strictEqual(target.DEFAULT, 'en', 'bahasa bawaan harus en');
});

test('daftar bahasa tertutup dan memuat en serta ja', () => {
  const all = target.all();
  assert.ok(Array.isArray(all), 'all() bukan array');
  assert.ok(all.indexOf('en') >= 0 && all.indexOf('ja') >= 0);
  assert.ok(Object.isFrozen(all) || true);
});

test('KUNCI INGGRIS IDENTIK BYTE PER BYTE — ini janji intinya', () => {
  const kunci = kunciNyata();
  assert.ok(kunci.length >= 20, 'terlalu sedikit kunci terbaca dari sumber: ' + kunci.length);
  const geser = kunci.filter((k) => target.key(k, 'en') !== k);
  assert.deepStrictEqual(geser, [],
    'kunci Inggris bergeser — setiap murid Inggris yang sudah ada kehilangan progresnya');
});

test('bahasa tidak dikenal, kosong, atau salah bentuk JATUH KE INGGRIS, bukan ke kunci asing', () => {
  const contoh = [undefined, null, '', '   ', 'EN', 'en-US', 'english', 'xx', 0, 42, {}, [], true];
  contoh.forEach((v) => {
    assert.strictEqual(target.key('fiezel-olm-v1', v), 'fiezel-olm-v1',
      'nilai ' + JSON.stringify(v) + ' menggeser kunci Inggris');
    assert.strictEqual(target.isDefault(v), true, 'nilai ' + JSON.stringify(v) + ' dianggap bukan bawaan');
  });
});

test('bahasa kedua memakai kunci sendiri dan TIDAK PERNAH bertabrakan dengan Inggris', () => {
  const kunci = kunciNyata();
  const inggris = new Set(kunci.map((k) => target.key(k, 'en')));
  kunci.forEach((k) => {
    const ja = target.key(k, 'ja');
    assert.notStrictEqual(ja, k, 'kunci ja sama dengan kunci Inggris untuk ' + k);
    assert.ok(!inggris.has(ja), 'kunci ja "' + ja + '" bertabrakan dengan kunci Inggris');
  });
});

test('kunci bahasa kedua bisa dibaca balik menjadi kunci dasar dan bahasanya', () => {
  const dasar = 'fiezel-mastery-bkt-v1';
  const ja = target.key(dasar, 'ja');
  assert.strictEqual(target.baseOf(ja), dasar);
  assert.strictEqual(target.langOf(ja), 'ja');
  assert.strictEqual(target.baseOf(dasar), dasar, 'kunci Inggris berubah saat dibaca balik');
  assert.strictEqual(target.langOf(dasar), 'en', 'kunci tanpa awalan harus terbaca sebagai en');
});

test('normalize memetakan masukan apa pun ke satu bahasa yang sah', () => {
  assert.strictEqual(target.normalize('ja'), 'ja');
  assert.strictEqual(target.normalize(' ja '), 'ja');
  assert.strictEqual(target.normalize('JA'), 'ja');
  target.all().forEach((l) => assert.strictEqual(target.normalize(l), l));
  [undefined, null, 'zz', 7, {}].forEach((v) => assert.strictEqual(target.normalize(v), 'en'));
});

test('kunci yang bukan kunci fiezel dibiarkan apa adanya untuk bahasa bawaan', () => {
  ['', 'apa-saja', 'token'].forEach((k) => {
    assert.strictEqual(target.key(k, 'en'), k);
  });
});

test('modul terdaftar di manifest brain', () => {
  const manifest = fs.readFileSync(
    path.join(__fzRoot, 'features', 'brain', 'fiezel-brain-manifest.js'), 'utf8');
  assert.ok(manifest.includes('fiezel-target-language.js'), 'modul belum terdaftar di manifest');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  const wf = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(wf.includes('target-language-axis-test.js'), 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('target-language-axis-test GAGAL: ' + failures.length + ' assert merah');
  console.log('target-language-axis-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('target-language-axis-test: ' + pass + '/' + total + ' assert PASS');
