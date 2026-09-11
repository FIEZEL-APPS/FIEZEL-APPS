// tests/curriculum-console-gate-test.js — pintu yang menuju ruangan kosong wajib tertutup.
//
// KENAPA GERBANG INI ADA
// ----------------------
// m025-294 memasang tautan "Kurikulum & Kompetensi" di sidebar Ruang Guru. Tautannya
// menuju ./kurikulum.html, dan seluruh isi halaman itu dilayani oleh
// features/curriculum/fz-api.js yang memanggil '/api/...' — RELATIF ke origin yang sama.
// Artinya halaman itu menuntut server FastAPI berjalan di domain yang sama dengan PWA-nya.
//
// Diperiksa owner sendiri pada 7 September 2026 di fiezel.my.id: /api/health menjawab
// 404, dan begitu pula /kurikulum.html. Repo ini juga tidak memuat satu pun berkas yang
// memberi tahu hosting cara menjalankan Python — tidak ada passenger_wsgi.py, tidak ada
// Procfile, requirements.txt hanya ada di dalam backend/ dan bukan di akar.
//
// Jadi guru yang menekan tautan itu di produksi menemukan halaman yang tidak berfungsi.
// Itu lebih buruk daripada fitur yang belum ada: fitur yang belum ada tidak menjanjikan
// apa-apa, sedangkan pintu yang terbuka ke ruangan kosong menghabiskan kepercayaan.
//
// YANG DIJAGA
//   1. Bendera curriculumConsole ADA dan bawaannya MATI, di kedua jalur (fiezel-ux-flags.js
//      dan peta cadangan di app.js) — supaya salah ketik pun tetap menyembunyikan.
//   2. Tautan sidebar hanya dirender saat benderanya menyala.
//   3. Kode mesinnya TIDAK dihapus. Ini menyembunyikan pintu, bukan membakar ruangannya:
//      begitu backend benar-benar berjalan, satu bendera membalikkannya.

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

const flags = baca('fiezel-ux-flags.js');
const app = baca('app.js');
const shell = baca('features/teacher/fiezel-teacher-shell.js');

/* m025-298: penjaganya BERPINDAH, dan menguat. Dulu pintu dijaga bendera manual; kini
   dijaga ALAMAT BACKEND yang bawaannya kosong (core-config.js). Bendera tetap ada sebagai
   sakelar mati paksa. Yang dituntut gerbang ini karena itu bukan lagi "bendera mati"
   melainkan "pintu mustahil terbuka tanpa backend" — tuntutan yang lebih kuat, karena
   bendera bisa dinyalakan orang yang lupa memasang backend-nya, sedangkan alamat tidak
   bisa diisi tanpa benar-benar punya alamat. */
test('alamat backend ADA di konfigurasi dan bawaannya KOSONG', () => {
  const cfg = baca('core-config.js');
  const m = cfg.match(/curriculumApiUrl\s*:\s*'([^']*)'/);
  assert.ok(m, 'curriculumApiUrl belum ada di core-config.js');
  assert.strictEqual(m[1], '',
    "bawaan curriculumApiUrl bukan kosong ('" + m[1] + "') — repo yang didistribusikan " +
    'akan mengirim data murid ke server milik pemasang pertama');
});

test('dua jalur bendera sepakat (fiezel-ux-flags.js dan peta cadangan app.js)', () => {
  const a = (flags.match(/curriculumConsole\s*:\s*(true|false)/) || [])[1];
  const b = (app.match(/curriculumConsole\s*:\s*(true|false)/) || [])[1];
  assert.ok(a && b, 'bendera curriculumConsole hilang dari salah satu jalur');
  assert.strictEqual(a, b,
    'dua jalur bendera tidak sepakat — yang satu menyembunyikan, yang lain menampilkan');
});

test('tautan sidebar DIJAGA benderanya, bukan dirender tanpa syarat', () => {
  const i = shell.indexOf('tg-nav-curriculum');
  assert.ok(i > 0, 'tautan kurikulum tidak ditemukan di teacher shell');
  // Penjagaannya harus berada di dekat tautannya, di potongan yang sama.
  const sekitar = shell.slice(Math.max(0, i - 700), i + 200);
  assert.ok(/konsolKurikulumSiap|curriculumConsole/.test(sekitar),
    'tautan kurikulum dirender tanpa penjaga apa pun');
  // Penjaganya WAJIB membaca alamat backend, bukan hanya bendera: bendera saja bisa
  // dinyalakan tanpa backend dan mengembalikan bug pintu-ke-ruangan-kosong.
  assert.ok(/curriculumApiUrl/.test(shell),
    'penjaga pintu tidak pernah membaca curriculumApiUrl — bendera saja tidak cukup');
});

test('DIJALANKAN: pintu tertutup tanpa alamat, terbuka dengan alamat, dan sakelar mati tetap berfungsi', () => {
  const m = shell.match(/function konsolKurikulumSiap\(\) \{[\s\S]*?\n  \}/);
  assert.ok(m, 'fungsi penjaga konsolKurikulumSiap() tidak ditemukan');
  const jalan = (alamat, bendera) => new Function('self', 'uxOn', 'return (' + m[0] + ')')(
    { FIEZEL_CURRICULUM_CONFIG: { curriculumApiUrl: alamat } }, () => bendera)();
  assert.strictEqual(jalan('', true), false, 'alamat kosong tetapi pintu terbuka');
  assert.strictEqual(jalan('https://contoh.example', true), true, 'alamat terisi tetapi pintu tertutup');
  assert.strictEqual(jalan('https://contoh.example', false), false, 'sakelar mati paksa tidak berfungsi');
});

test('mesinnya TIDAK dihapus — ini menutup pintu, bukan membakar ruangan', () => {
  ['kurikulum.html', 'misi.html', 'features/curriculum/fz-api.js',
   'features/curriculum/teacher-console.js'].forEach((f) => {
    assert.ok(fs.existsSync(path.join(__fzRoot, f)), f + ' hilang — bendera seharusnya cukup');
  });
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('curriculum-console-gate-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('curriculum-console-gate-test GAGAL: ' + failures.length + ' assert merah');
  console.log('curriculum-console-gate-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('curriculum-console-gate-test: ' + pass + '/' + total + ' assert PASS');
