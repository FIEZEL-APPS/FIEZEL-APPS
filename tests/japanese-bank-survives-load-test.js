// tests/japanese-bank-survives-load-test.js — bank Jepang benar-benar SAMPAI ke hidrasi,
// bukan hanya dipasang lalu ditimpa satu baris kemudian.
//
// KENAPA GERBANG INI ADA
// ----------------------
// m025-290 memasang pemilih bahasa dan memuat bank Jepang. Semua gerbangnya hijau, dan
// kursusnya tetap berbahasa Inggris di layar murid. Sebabnya satu baris:
//
//     if(activeTargetLang()==='ja'){ ... G=jaBank ... }     // baris 4192
//     ...
//     ...grammarMaster=...;save()}G=grammarMaster;          // baris 4209  <-- menimpa
//
// `G` dipasang ke bank Jepang, lalu delapan belas baris kemudian ditimpa kembali ke bank
// Inggris oleh jalur canary yang sudah ada sejak lama. Murid memilih Jepang, menyimpannya,
// melihat toast "Sekarang belajar Bahasa Jepang", lalu kembali ke menu dan melihat Inggris.
//
// KENAPA GERBANG SEBELUMNYA TIDAK MENANGKAPNYA
// --------------------------------------------
// `japanese-course-wiring-test` bertanya "apakah kodenya ADA": apakah setFamilyGraph
// dipanggil, apakah banknya diprecache, apakah modulnya dimuat. Semua jawabannya ya. Yang
// tidak pernah ditanyakan adalah "apakah kodenya BERPENGARUH" — dan penugasan yang ditimpa
// adalah kode yang ada tanpa berpengaruh. Pelajaran yang sengaja ditulis: gerbang yang
// memeriksa keberadaan tidak pernah bisa menangkap penimpaan; yang bisa hanyalah gerbang
// yang memeriksa URUTAN atau menjalankan kodenya.
//
// YANG DIJAGA
//   1. Penugasan bank Jepang ke G terjadi SESUDAH setiap penugasan G lain di dalam load(),
//      jadi tidak ada yang bisa menimpanya lagi.
//   2. Ia terjadi SEBELUM hidrasi membaca G.templates — dipasang sesudah pembacanya sama
//      saja dengan tidak dipasang.
//   3. Cabang 'ja' tidak menyentuh G untuk murid Inggris.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

// Batas load(): dari deklarasinya sampai hidrasi selesai. Mencari di seluruh berkas akan
// menangkap penugasan G milik fungsi lain dan melaporkan kesalahan yang tidak ada.
const mulai = app.indexOf('async function load(');
assert.ok(mulai > 0, 'load() tidak ditemukan di app.js — gerbang ini kehilangan pijakannya');
const hidrasi = app.indexOf('if(Array.isArray(G?.templates)){', mulai);
assert.ok(hidrasi > mulai, 'pembaca hidrasi G.templates tidak ditemukan sesudah load()');
const wilayah = app.slice(mulai, hidrasi);

// Setiap penugasan ke G di wilayah itu, beserta posisinya.
const penugasan = [...wilayah.matchAll(/(?:^|[^\w$.])G\s*=\s*([A-Za-z_$][\w$]*)/g)]
  .map((m) => ({ nilai: m[1], di: m.index }));

test('bank Jepang benar-benar ditugaskan ke G di dalam load()', () => {
  assert.ok(penugasan.some((p) => /ja/i.test(p.nilai)),
    'tidak ada penugasan G = <bank ja> di dalam load() — kursus Jepang tidak akan pernah terhidrasi');
});

test('TIDAK ADA penugasan G lain SESUDAH bank Jepang dipasang', () => {
  const ja = penugasan.filter((p) => /ja/i.test(p.nilai)).pop();
  assert.ok(ja, 'penugasan bank Jepang tidak ditemukan');
  const sesudah = penugasan.filter((p) => p.di > ja.di);
  assert.deepStrictEqual(sesudah.map((p) => p.nilai), [],
    'G ditimpa sesudah bank Jepang dipasang oleh: ' + sesudah.map((p) => p.nilai).join(', ') +
    ' — murid memilih Jepang dan tetap melihat bank Inggris');
});

test('bank Jepang dipasang SEBELUM hidrasi membacanya', () => {
  // Dijamin oleh konstruksi wilayah (berakhir tepat di pembaca), tetapi dinyatakan supaya
  // niatnya tercatat: memindahkan blok ja ke bawah pembaca akan membuat assert pertama merah.
  const ja = penugasan.filter((p) => /ja/i.test(p.nilai)).pop();
  assert.ok(ja && mulai + ja.di < hidrasi,
    'bank Jepang dipasang sesudah hidrasi membaca G — dipasang sesudah pembacanya sama saja dengan tidak dipasang');
});

test('cabang ja tidak merampas jalur Inggris: masih ada penugasan G dari bank Inggris', () => {
  assert.ok(penugasan.some((p) => /grammarMaster/.test(p.nilai)),
    'G tidak pernah ditugaskan dari grammarMaster — bank Inggris tidak lagi terpasang');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('japanese-bank-survives-load-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-bank-survives-load-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-bank-survives-load-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-bank-survives-load-test: ' + pass + '/' + total + ' assert PASS');
