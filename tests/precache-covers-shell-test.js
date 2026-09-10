// tests/precache-covers-shell-test.js — setiap berkas yang DIMUAT index.html wajib ada di
// ASSETS sw.js.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Owner melaporkan dasbor guru penuh frasa mentah: 'guru.merek-tag', 'guru.tab-jurnal',
// 'guru.opsi-bab'. Kuncinya terdaftar lengkap di id dan th, dan di Node semuanya terpecahkan
// dengan benar. Penyebabnya ada satu lapis lebih dalam:
//
//   'guru.merek-tag' hidup di features/i18n/copy-id-feat-d.js
//   berkas itu DIMUAT index.html — dan TIDAK ADA di ASSETS sw.js
//
// PWA yang sudah terpasang dilayani dari cache shell. Berkas yang tidak pernah diprecache
// tidak ada di cache; ia hanya sampai kalau jaringan sedang baik saat itu juga. Di jaringan
// buruk atau saat offline — keadaan paling sering di lapangan — berkasnya tidak pernah
// dieksekusi, seluruh kunci di dalamnya tidak terdaftar, dan guru membaca nama kuncinya.
// Lima berkas copy-map dalam keadaan itu sekaligus, termasuk yang memuat seluruh naskah
// Ruang Guru.
//
// KENAPA GERBANG PWA YANG SUDAH ADA TIDAK MENANGKAPNYA
// tests/pwa-cache-test.js memeriksa DAFTAR TETAP yang ditulis tangan di dalamnya. Daftar
// tetap hanya menjaga yang sempat diingat penulisnya; berkas yang ditambahkan ke index.html
// sesudah itu tidak pernah masuk daftar, dan gerbangnya tetap hijau. Gerbang ini menurunkan
// tuntutannya dari index.html SENDIRI, jadi setiap skrip baru langsung ikut terjaga tanpa
// ada daftar yang perlu disunting.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(__fzRoot, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__fzRoot, 'sw.js'), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/* Hanya blok ASSETS yang dibaca — menyebut nama berkas di komentar sw.js tidak boleh
   dihitung sebagai "sudah diprecache". */
const blokAssets = (sw.match(/const ASSETS=\[[\s\S]*?\];/) || [''])[0];
const diprecache = new Set(
  [...blokAssets.matchAll(/'([^']+)'/g)].map((m) => m[1].replace(/^\.\//, ''))
);

/* Semua skrip dan gaya yang dimuat index.html, termasuk yang ditulis type="fiezel/lazy":
   pemuat malas mengangkatnya jadi <script> sungguhan, jadi ia tetap bagian shell. */
const dimuat = [...new Set(
  [...indexHtml.matchAll(/(?:src|href)="\.\/([^"]+\.(?:js|css))"/g)].map((m) => m[1])
)];

test('index.html memang terbaca (pemindainya tidak buta)', () => {
  assert.ok(dimuat.length >= 100,
    'hanya ' + dimuat.length + ' berkas terdeteksi di index.html — pemindainya kemungkinan rusak');
  assert.ok(diprecache.size >= 100,
    'hanya ' + diprecache.size + ' entri terbaca dari ASSETS sw.js');
});

test('SETIAP berkas yang dimuat index.html ada di ASSETS sw.js', () => {
  const luput = dimuat.filter((p) => !diprecache.has(p));
  assert.deepStrictEqual(luput.slice(0, 12), [],
    luput.length + ' berkas dimuat index.html tetapi tidak diprecache — di jaringan buruk ' +
    'atau offline ia tidak pernah sampai, dan kunci di dalamnya tampil sebagai nama kunci');
});

test('naskah Ruang Guru khususnya, karena itu yang pernah patah', () => {
  // Penjaga yang menyebut kejadiannya dengan nama. Kalau kelak copy-map dipecah ulang,
  // yang penting bukan nama berkasnya melainkan bahwa kunci guru.* punya rumah yang
  // diprecache — jadi yang diperiksa adalah berkas TEMPAT kuncinya benar-benar tinggal.
  const dir = path.join(__fzRoot, 'features/i18n');
  const rumah = fs.readdirSync(dir)
    .filter((f) => /^copy-id-.*\.js$/.test(f))
    .filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes("'guru."));
  assert.ok(rumah.length > 0, 'tidak ada copy-id yang memuat kunci guru.* — pemindainya salah');
  const telanjang = rumah.filter((f) => !diprecache.has('features/i18n/' + f));
  assert.deepStrictEqual(telanjang, [],
    'naskah Ruang Guru tidak diprecache: ' + telanjang.join(', '));
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('precache-covers-shell-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('precache-covers-shell-test GAGAL: ' + failures.length + ' assert merah');
  console.log('precache-covers-shell-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('precache-covers-shell-test: ' + pass + '/' + total + ' assert PASS');
