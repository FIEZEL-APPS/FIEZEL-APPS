// tests/curriculum-config-wiring-test.js — halaman yang memakai fz-api WAJIB memuat
// core-config.js, karena di situlah alamat backendnya tinggal.
//
// KENAPA GERBANG INI ADA
// ----------------------
// m025-298 memindahkan konsol kurikulum dari 'same-origin' ke alamat absolut yang dibaca
// dari FIEZEL_CURRICULUM_CONFIG.curriculumApiUrl, dan menurunkan pintunya dari nilai itu.
// Yang tidak ikut diperiksa siapa pun: apakah konfigurasi itu benar-benar ADA di halaman
// yang membacanya. Ternyata tidak. kurikulum.html dan misi.html hanya memuat
// features/curriculum/fz-api.js dan modul layarnya; core-config.js tidak pernah disebut,
// jadi self.FIEZEL_CURRICULUM_CONFIG bernilai undefined di kedua halaman itu.
//
// Akibatnya persis kebalikan dari yang dijanjikan: owner boleh memasang MongoDB, boleh
// menjalankan FastAPI, boleh menempelkan alamatnya ke core-config.js — konsolnya TETAP
// mati, dan pesannya menuduh owner belum mengonfigurasi apa pun. Diukur di peramban
// (Chromium, backend FastAPI+MongoDB hidup di 127.0.0.1:8001): sebelum core-config.js
// ditambahkan, kurikulum.html melaporkan FIEZEL_CURRICULUM_CONFIG = null; sesudahnya
// login token guru menembus dan seluruh papan Kopilot Guru terisi data nyata.
//
// Gerbang ini karena itu memeriksa DUA hal sekaligus, dan urutannya penting: core-config.js
// harus disebut SEBELUM fz-api.js. Skrip klasik dieksekusi berurutan; kalau terbalik,
// fz-api.js membaca konfigurasi yang belum ada dan kita kembali ke bug yang sama.
//
// Daftar halamannya TIDAK ditulis tangan: berkas ini memindai seluruh *.html di akar repo
// dan menuntut setiap halaman yang memuat fz-api.js ikut memuat core-config.js. Halaman
// konsol berikutnya otomatis terjaga tanpa ada daftar yang perlu disunting.

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

/* Komentar HTML dibuang sebelum dipindai. Berkas ini sendiri menulis penjelasan di dalam
   <!-- ... --> tepat di atas <script src="./core-config.js">, dan pemindai yang membaca
   prosa sebagai kode adalah kesalahan yang sudah dua kali terjadi di repo ini (m025-285,
   m025-298). */
const tanpaKomentar = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

const halaman = fs.readdirSync(__fzRoot)
  .filter((f) => f.endsWith('.html'))
  .map((f) => ({ nama: f, isi: tanpaKomentar(baca(f)) }))
  .filter((h) => /<script[^>]+features\/curriculum\/fz-api\.js/.test(h.isi));

test('ada halaman yang memakai fz-api.js (pemindainya tidak menemukan ruang kosong)', () => {
  assert.ok(halaman.length > 0,
    'tidak satu pun *.html memuat features/curriculum/fz-api.js — entah mesinnya dihapus, ' +
    'entah pemindai gerbang ini yang rusak; keduanya wajib diperiksa tangan');
});

halaman.forEach((h) => {
  test('`' + h.nama + '` memuat core-config.js', () => {
    assert.ok(/<script[^>]+(\.\/)?core-config\.js/.test(h.isi),
      h.nama + ' memakai fz-api.js tetapi tidak pernah memuat core-config.js. ' +
      'FIEZEL_CURRICULUM_CONFIG tidak ada di halaman itu, jadi alamat backend terbaca ' +
      'kosong dan konsolnya menolak SEMUA panggilan — walau backendnya hidup dan ' +
      'alamatnya sudah ditempel owner.');
  });

  test('`' + h.nama + '` memuat core-config.js SEBELUM fz-api.js', () => {
    const iConfig = h.isi.search(/<script[^>]+(\.\/)?core-config\.js/);
    const iApi = h.isi.search(/<script[^>]+features\/curriculum\/fz-api\.js/);
    assert.ok(iConfig >= 0 && iConfig < iApi,
      h.nama + ': core-config.js disebut SESUDAH fz-api.js. Skrip klasik dieksekusi ' +
      'berurutan, jadi fz-api.js membaca konfigurasi yang belum ada — sama saja dengan ' +
      'tidak memuatnya sama sekali.');
  });
});

/* Arah sebaliknya: alamat bawaan WAJIB tetap kosong di repo yang didistribusikan. Gerbang
   ini menambah kabel yang hilang; ia tidak boleh berubah jadi alasan menyalakan pintunya
   dengan alamat milik pemasang pertama. */
test('alamat bawaan di core-config.js tetap kosong', () => {
  const cfg = baca('core-config.js');
  const m = cfg.match(/curriculumApiUrl\s*:\s*'([^']*)'/);
  assert.ok(m, 'curriculumApiUrl tidak ditemukan di core-config.js');
  assert.strictEqual(m[1], '',
    'curriculumApiUrl terisi di repo. Salinan repo ini tidak boleh mengirim data murid ' +
    'ke server milik pemasang pertama — alamat diisi di pemasangan, bukan di git.');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('curriculum-config-wiring-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('curriculum-config-wiring-test GAGAL: ' + failures.length + ' assert merah');
  console.log('curriculum-config-wiring-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('curriculum-config-wiring-test: ' + pass + '/' + total + ' assert PASS');
