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
test('alamat backend ADA di konfigurasi, dan kalau terisi ia https tanpa ekor', () => {
  /* KOREKSI ASSERT (m025-300), sepasang dengan koreksi di curriculum-api-base-test.
     "Harus kosong" lebih ketat daripada praktik repo ini sendiri (workerUrl sudah berisi
     alamat operator) dan mustahil dipenuhi begitu backend-nya benar-benar dipasang — repo
     tanpa langkah build tidak punya tempat lain untuk menaruh alamat.

     Yang menjaga bug pintu-ke-ruangan-kosong BUKAN assert ini, melainkan assert di bawah
     yang MENJALANKAN penjaganya: alamat kosong -> pintu tertutup. Itu tetap utuh. */
  const cfg = baca('core-config.js');
  const m = cfg.match(/curriculumApiUrl\s*:\s*'([^']*)'/);
  assert.ok(m, 'curriculumApiUrl belum ada di core-config.js');
  const v = m[1];
  if (v === '') return;
  /* Dua tuntutan dengan berat yang berbeda, dan itu perlu dikatakan supaya tidak ada yang
     mengira keduanya sama gentingnya (koreksi dari temuan gitar-bot di PR #395):
       - https WAJIB: alamat http mengirim token guru dan jawaban murid sebagai teks terbuka.
       - tanpa ekor garis miring: KANONIKALISASI saja. base() di fz-api.js sudah membuang
         ekor itu (`.replace(/\/$/, '')`), jadi 'https://x/' tetap berfungsi; kita hanya
         menolak dua ejaan untuk alamat yang sama. */
  assert.ok(/^https:\/\/[^\s'"]+$/.test(v) && !/\/$/.test(v),
    "curriculumApiUrl terisi tetapi tidak sah: '" + v + "' (wajib https; ekor garis miring " +
    'ditolak demi satu bentuk kanonik — fz-api sendiri sudah membuangnya)');
});

test('dua jalur bendera sepakat (fiezel-ux-flags.js dan peta cadangan app.js)', () => {
  const a = (flags.match(/curriculumConsole\s*:\s*(true|false)/) || [])[1];
  const b = (app.match(/curriculumConsole\s*:\s*(true|false)/) || [])[1];
  assert.ok(a && b, 'bendera curriculumConsole hilang dari salah satu jalur');
  assert.strictEqual(a, b,
    'dua jalur bendera tidak sepakat — yang satu menyembunyikan, yang lain menampilkan');
});

/* PINTUNYA BERPINDAH DI m025-357, PENJAGANYA TIDAK.
   ==========================================================================
   Sampai m025-356, pintu kurikulum adalah butir nav kedelapan di sidebar Ruang Guru
   (`tg-nav-curriculum`) dan gerbang ini memeriksa penjagaan DI SEKITAR butir itu. Owner
   mencabut butir nav tersebut: sistem kurikulum kini tab di dalam dasbor KelasKu
   (features/class-hub/fiezel-class-hub.js, tab `kurikulum`).

   Yang gerbang ini jaga TIDAK berubah — pintu mustahil terbuka tanpa alamat backend —
   hanya alamat pintunya yang berubah. Ketiga assert di bawah menggantikan satu assert
   lama, dan bersama-sama mereka lebih ketat daripada aslinya: dulu cukup ada kata
   `konsolKurikulumSiap` di dekat tautan, sekarang rantai penjaganya diikuti dari hub
   sampai ke shell.

   Dicatat supaya tidak ada yang mengira butir nav itu hilang karena kelalaian: ia
   memang dicabut, dan gerbang ini ikut menuntut ia TETAP tercabut. */
test('butir nav kurikulum TIDAK kembali ke sidebar Ruang Guru', () => {
  assert.ok(!/tg-nav-curriculum/.test(shell),
    'features/teacher/fiezel-teacher-shell.js memasang lagi butir nav `tg-nav-curriculum`. ' +
    'Sistem kurikulum sudah pindah ke dalam dasbor KelasKu (m025-357, instruksi owner); ' +
    'dua pintu ke sistem yang sama berarti salah satunya akan menyimpang.');
  assert.ok(!/data-view="curriculum"/.test(shell),
    'masih ada tombol yang menuju view `curriculum`, padahal view itu sudah dihapus dari peta views — ' +
    'tombolnya akan mendarat di layar Ringkasan tanpa penjelasan apa pun.');
});

test('tab kurikulum di dasbor KelasKu DIJAGA, bukan dipasang tanpa syarat', () => {
  const hub = baca('features/class-hub/fiezel-class-hub.js');
  const i = hub.indexOf("list.push(['kurikulum'");
  assert.ok(i > 0, 'tab kurikulum tidak ditemukan di hub guru');
  const sekitar = hub.slice(Math.max(0, i - 300), i + 200);
  assert.ok(/kurikulumSiap\(env\)/.test(sekitar),
    'tab kurikulum dipasang tanpa penjaga — ia bisa membuka panel kosong saat backend mati');
  assert.ok(/function kurikulumSiap\(env\)[\s\S]{0,240}env\.kurikulum\.siap\(\)/.test(hub),
    'kurikulumSiap() di hub tidak membaca env.kurikulum.siap(). Penjaga yang disalin ke hub ' +
    'adalah penjaga kedua yang bisa menyimpang dari yang asli di teacher shell.');
});

test('rantai penjaga sampai ke alamat backend, bukan berhenti di bendera', () => {
  assert.ok(/siap:\s*konsolKurikulumSiap/.test(shell),
    'teacher shell tidak lagi meneruskan konsolKurikulumSiap sebagai env.kurikulum.siap — ' +
    'rantai penjaga hub terputus dari alamat backend.');
  // Penjaganya WAJIB membaca alamat backend, bukan hanya bendera: bendera saja bisa
  // dinyalakan tanpa backend dan mengembalikan bug pintu-ke-ruangan-kosong.
  assert.ok(/curriculumApiUrl/.test(shell),
    'penjaga pintu tidak pernah membaca curriculumApiUrl — bendera saja tidak cukup');
});

test('panel kurikulum sendiri memeriksa ulang penjaganya sebelum menggambar', () => {
  const i = shell.indexOf('function kurikulumPanel()');
  assert.ok(i > 0, 'kurikulumPanel() tidak ditemukan di teacher shell');
  assert.ok(/if \(!konsolKurikulumSiap\(\)\) return '';/.test(shell.slice(i, i + 700)),
    'kurikulumPanel() menggambar tanpa memeriksa konsolKurikulumSiap(). Pemeriksaan hub saja ' +
    'tidak cukup: panel ini bisa dipanggil pemanggil lain nanti.');
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
