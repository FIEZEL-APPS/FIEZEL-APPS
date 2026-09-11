// tests/japanese-surface-honesty-test.js — kursus Jepang tidak boleh menawarkan latihan
// yang isinya bahasa Inggris.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Murid memilih Bahasa Jepang di Pengaturan. Bank tata bahasa, kosakata, dan bacaan
// berganti. Tetapi tiga permukaan lain TIDAK punya versi Jepang sama sekali:
//
//   menyimak  -> features/speaking-listening/listening-bank-v1.json  (Inggris)
//   berbicara -> features/speaking-listening/speaking-bank-v1.json   (Inggris)
//   menulis   -> writing-prompts-v1.json  ("Describe your day...", fokus 'present simple')
//
// Sebelum gerbang ini, ketiganya tetap ditawarkan. Murid yang memilih Jepang membuka
// "Latihan bicara & dengar" lalu MENDENGAR BAHASA INGGRIS, atau diminta menulis kalimat
// Inggris dengan fokus tata bahasa Inggris — tanpa satu kalimat pun yang memberitahunya.
// Itu bukan fitur yang belum lengkap; itu aplikasi yang mengatakan satu hal dan melakukan
// hal lain.
//
// Peringatan di pemilih bahasa SUDAH berjanji "belum ada latihan menyimak" sejak m025-290.
// Layarnya yang tidak menepati janji itu. Gerbang ini menyatukan keduanya.
//
// YANG DIJAGA, DAN KENAPA DIIKAT KE DATA
//   Penjaga di app.js WAJIB ada selama bank Jepangnya belum ada — dan gerbang ini membaca
//   ADA-TIDAKNYA bank itu dari direktori content/ja/, bukan dari daftar tertulis. Jadi saat
//   suatu hari listening-bank-ja.json benar-benar dibuat, gerbang ini BERBALIK: ia menuntut
//   penjaganya dicabut. Penjaga yang ditinggalkan setelah kontennya ada adalah fitur yang
//   hilang diam-diam, dan itu sama buruknya dengan menawarkan yang kosong.

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
const isiJa = fs.existsSync(path.join(__fzRoot, 'content/ja'))
  ? fs.readdirSync(path.join(__fzRoot, 'content/ja'))
  : [];

/* Permukaan -> penanda bank Jepangnya. Kalau berkasnya muncul, permukaannya berhak hidup. */
const PERMUKAAN = [
  { nama: 'menyimak/berbicara', bank: /listening-bank-ja|speaking-bank-ja/, kartu: 'skills' },
  { nama: 'menulis', bank: /writing-prompts-ja/, kartu: 'writing' }
];

test('bank Jepang untuk menyimak/berbicara/menulis memang belum ada', () => {
  // Kalau assert ini merah, bukan berarti ada kerusakan — berarti kontennya sudah dibuat
  // dan penjaganya harus dicabut. Pesannya sengaja mengatakan itu.
  const sudahAda = PERMUKAAN.filter((p) => isiJa.some((f) => p.bank.test(f))).map((p) => p.nama);
  assert.deepStrictEqual(sudahAda, [],
    'bank Jepang untuk ' + sudahAda.join(', ') + ' SUDAH ADA — cabut penjaganya di app.js ' +
    'dan perbarui gerbang ini, jangan biarkan permukaannya tersembunyi padahal isinya siap');
});

test('kartu latihan tanpa konten Jepang DIJAGA saat bahasa target ja', () => {
  const i = app.indexOf('function latihanCards()');
  assert.ok(i > 0, 'latihanCards() tidak ditemukan di app.js');
  const blok = app.slice(i, i + 3500);
  PERMUKAAN.forEach((p) => {
    const j = blok.indexOf("view:'" + p.kartu + "'");
    assert.ok(j > 0, 'kartu ' + p.kartu + ' tidak ditemukan di latihanCards()');
    // Penjaganya harus berada di potongan yang sama dengan kartunya, bukan di berkas lain.
    const sekitar = blok.slice(Math.max(0, j - 600), j + 200);
    assert.ok(/targetLang|activeTargetLang|punyaKontenJa/.test(sekitar),
      'kartu ' + p.kartu + ' (' + p.nama + ') ditawarkan tanpa memeriksa bahasa target — ' +
      'murid Jepang mendapat latihan berbahasa Inggris tanpa diberi tahu');
  });
});

test('blok dengar/bicara di rencana harian juga dijaga', () => {
  const i = app.indexOf('function todayPlanBlocks(');
  assert.ok(i > 0, 'todayPlanBlocks() tidak ditemukan');
  const blok = app.slice(i, i + 2500);
  const j = blok.indexOf("latihan.bicara-dengar");
  assert.ok(j > 0, 'blok bicara-dengar tidak ditemukan di todayPlanBlocks()');
  const sekitar = blok.slice(Math.max(0, j - 700), j + 120);
  assert.ok(/targetLang|activeTargetLang|punyaKontenJa/.test(sekitar),
    'rencana harian tetap menyelipkan blok dengar/bicara untuk murid Jepang');
});

test('peringatan pemilih bahasa menyebut ketiganya, bukan menyimak saja', () => {
  const id = baca('features/i18n/copy-id-bahasa.js');
  const th = baca('features/i18n/copy-th-bahasa.js');
  const kalimat = (id.match(/'bahasa\.ja-peringatan':\s*'([^']*)'/) || [])[1] || '';
  ['menyimak', 'berbicara', 'menulis'].forEach((kata) => {
    assert.ok(kalimat.toLowerCase().includes(kata),
      'peringatan tidak menyebut "' + kata + '" — murid tidak diberi tahu apa yang belum ada');
  });
  assert.ok(/'bahasa\.ja-peringatan'/.test(th), 'peringatan kehilangan kembaran Thai');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('japanese-surface-honesty-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('japanese-surface-honesty-test GAGAL: ' + failures.length + ' assert merah');
  console.log('japanese-surface-honesty-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('japanese-surface-honesty-test: ' + pass + '/' + total + ' assert PASS');
