// tests/japanese-course-wiring-test.js — kursus Jepang benar-benar sampai ke layar murid,
// dan murid Inggris tidak membayar sepeser pun untuk itu.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Sampai sekarang seluruh kursus Jepang ada di repo tetapi NOL byte-nya sampai ke murid:
// tidak ada pemuat, tidak ada pemilih bahasa, tidak ada pemanggil setFamilyGraph. Itu
// disengaja — fondasi dulu, layar belakangan. Gerbang ini menandai batas itu terlewati.
//
// Menyalakannya punya satu cara gampang dan satu cara benar.
//
// Yang gampang: bikin jalur kedua — pemuat sendiri, tampilan sendiri, penyimpan sendiri.
// Murid Jepang akan melihat soal, dan tidak satu pun mesin adaptif ikut: tanpa alokator,
// tanpa ingatan soal, tanpa tutor brain. Soalnya tetap keluar, tetapi kursusnya berhenti
// menyesuaikan diri: butir yang sudah dikuasai muncul lagi, yang salah tidak diulang.
//
// Yang benar: bank Jepang memakai NAMA MEDAN yang sama dengan bank Inggris, jadi ia lewat
// jalur hidrasi YANG SAMA. Satu mesin, dua bahasa. Gerbang ini menahan janji itu — dan
// menahan janji yang lebih penting di sebelahnya: jalur Inggris tidak berubah.
//
// YANG DIJAGA
//   1. Bahasa bawaan tetap 'en'. Murid yang sudah ada tidak berpindah kursus karena update.
//   2. Bank Jepang dan graf keluarganya ADA DI ASSETS sw.js — kalau tidak, kursusnya mati
//      begitu murid offline, dan itu justru keadaan yang paling sering di lapangan.
//   3. Modul sumbu bahasa benar-benar DIMUAT di index.html. Modul yang tidak dimuat adalah
//      modul yang tidak ada, seberapa pun rapi isinya.
//   4. Graf keluarga Jepang disuntikkan saat ja aktif, DAN dipulihkan saat kembali ke en.
//      Suntik tanpa pulih berarti murid Inggris mewarisi prasyarat Jepang.
//   5. Otoritas manifest naik 'off' -> 'active'. Peta yang bilang "tidak berjalan" padahal
//      berjalan adalah kebohongan ke arah paling berbahaya.
//   6. Naskah pemilih bahasa punya kembaran Thai. Murid Thai melihat layar ini juga.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

const app = baca('app.js');
const indexHtml = baca('index.html');
const sw = baca('sw.js');

test('BAHASA BAWAAN TETAP en — murid yang sudah ada tidak berpindah kursus', () => {
  const m = app.match(/targetLang\s*:\s*'([a-z-]+)'/);
  assert.ok(m, 'preferensi targetLang belum ada di defaultPreferences');
  assert.strictEqual(m[1], 'en',
    'bawaan targetLang bukan en — setiap murid Inggris yang sudah ada akan dipindahkan diam-diam');
});

test('bank Jepang dan graf keluarganya ada, dan berisi butir', () => {
  const bank = JSON.parse(baca('content/ja/grammar-templates-ja.json'));
  assert.ok(Array.isArray(bank.templates) && bank.templates.length >= 200,
    'bank Jepang terlalu sedikit: ' + (bank.templates || []).length);
  const graf = JSON.parse(baca('content/ja/family-graph-ja.json'));
  assert.ok(graf.families && Object.keys(graf.families).length >= 12,
    'graf keluarga Jepang tidak lengkap');
  const dikenal = Object.keys(graf.families);
  const asing = bank.templates.filter((t) => dikenal.indexOf(t.family) < 0).map((t) => t.id);
  assert.deepStrictEqual(asing.slice(0, 5), [], asing.length + ' butir memakai family di luar graf');
});

test('BANK JEPANG DIPRECACHE sw.js — tanpa ini kursusnya mati saat murid offline', () => {
  ['content/ja/grammar-templates-ja.json', 'content/ja/family-graph-ja.json'].forEach((f) => {
    assert.ok(sw.indexOf(f) >= 0, f + ' tidak ada di ASSETS sw.js');
  });
});

test('modul sumbu bahasa benar-benar dimuat di index.html', () => {
  assert.ok(indexHtml.indexOf('fiezel-target-language.js') >= 0,
    'fiezel-target-language.js tidak dimuat — modul yang tidak dimuat sama dengan tidak ada');
  assert.ok(sw.indexOf('fiezel-target-language.js') >= 0,
    'fiezel-target-language.js tidak diprecache sw.js');
});

test('graf keluarga Jepang DISUNTIK saat ja, dan DIPULIHKAN saat kembali ke en', () => {
  assert.ok(/setFamilyGraph/.test(app), 'app.js tidak pernah memanggil setFamilyGraph');
  assert.ok(/resetFamilyGraph/.test(app),
    'app.js tidak pernah memanggil resetFamilyGraph — murid yang kembali ke Inggris mewarisi prasyarat Jepang');
});

test('jalur Inggris tetap utuh: bank Inggris masih dimuat apa adanya', () => {
  assert.ok(/const DATA=\['vocabulary-master\.json','reading-bank\.json','grammar-templates\.json'\]/.test(app),
    'daftar bank Inggris berubah — jalur murid yang sudah ada tidak boleh tersentuh');
});

test('otoritas manifest targetLanguage naik ke active (ia sekarang PUNYA pemanggil)', () => {
  // Komentar dibuang dulu: komentar di atas entri ini MENYEBUT kata 'off' saat menjelaskan
  // riwayatnya, dan regex yang membaca prosa akan menangkap kata itu alih-alih nilai peta.
  // Gerbang yang membaca komentar adalah gerbang yang bisa dibohongi dengan menulis kalimat.
  const manifest = baca('features/brain/fiezel-brain-manifest.js')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const m = manifest.match(/targetLanguage\s*:\s*'([a-z]+)'/);
  assert.ok(m, 'targetLanguage tidak ada di peta otoritas manifest');
  assert.strictEqual(m[1], 'active',
    "otoritas masih '" + m[1] + "' padahal modulnya sudah dipanggil — peta yang bilang tidak berjalan padahal berjalan");
});

test('naskah pemilih bahasa punya kembaran Thai, bukan Indonesia saja', () => {
  const id = baca('features/i18n/copy-id-bahasa.js');
  const th = baca('features/i18n/copy-th-bahasa.js');
  const kunci = (s) => (s.match(/'bahasa\.[a-z0-9-]+'/g) || []).sort();
  const kid = kunci(id);
  const kth = kunci(th);
  assert.ok(kid.length >= 4, 'naskah pemilih bahasa terlalu sedikit: ' + kid.length);
  assert.deepStrictEqual(kid, kth, 'kunci id dan th tidak cocok satu-satu');
  assert.ok(/[฀-๿]/.test(th), 'berkas th tidak beraksara Thai');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('japanese-course-wiring-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-course-wiring-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-course-wiring-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-course-wiring-test: ' + pass + '/' + total + ' assert PASS');
