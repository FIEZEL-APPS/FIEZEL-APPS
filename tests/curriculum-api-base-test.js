// tests/curriculum-api-base-test.js — konsol kurikulum memanggil backend lewat ALAMAT
// YANG DIKONFIGURASI, dan pintunya membuka SENDIRI hanya kalau alamat itu terisi.
//
// KENAPA GERBANG INI ADA
// ----------------------
// fz-api.js lahir dengan asumsi 'same-origin': ia memanggil fetch('/api' + path), yang
// berarti "cari backend di domain yang sama dengan halaman ini". Asumsi itu benar di
// lingkungan tempat agen pembuatnya bekerja (ingress mengarahkan /api ke FastAPI port
// 8001) dan SALAH di produksi FIEZEL: fiezel.my.id adalah hosting statis. Owner
// memeriksanya sendiri pada 7 September 2026 — /api/health menjawab 404.
//
// Backend FIEZEL yang SUDAH hidup tidak pernah memakai asumsi itu. fiezel-core-worker
// dipanggil lewat CORE_CONFIG.workerUrl — alamat ABSOLUT dari konfigurasi
// (https://fiezel-core.puter.work). Berkas ini menuntut konsol kurikulum mengikuti pola
// yang sama, karena pola itu sudah terbukti bekerja di produksi yang sama.
//
// SATU BENDERA, SATU SUMBER KEBENARAN
// Pintu konsol (m025-296) dulu dijaga bendera manual. Bendera manual bisa dinyalakan orang
// yang lupa memasang backend-nya, dan itu mengembalikan persis bug yang ditutup m025-296:
// pintu menuju ruangan kosong. Karena itu benderanya kini DITURUNKAN dari alamatnya:
// alamat kosong -> pintu tertutup, alamat terisi -> pintu terbuka. Tidak ada keadaan
// "menyala tetapi tidak punya backend" yang bisa dibuat tanpa berbohong di konfigurasi.

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

/* Komentar dibuang sebelum diperiksa: kepala berkas fz-api.js MENGUTIP pola lama
   (fetch('/api' + path)) untuk menjelaskan apa yang pernah salah, dan pemindai yang
   membaca prosa akan menuduh penjelasan itu sebagai kodenya. Gerbang yang bisa dibohongi
   -- atau dituduh -- oleh sebuah kalimat bukan gerbang. */
const apiMentah = baca('features/curriculum/fz-api.js');
const api = apiMentah.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
const cfg = baca('core-config.js');
const app = baca('app.js');
const flags = baca('fiezel-ux-flags.js');

test('fz-api TIDAK lagi memanggil /api same-origin secara buta', () => {
  assert.ok(!/fetch\(\s*['"]\/api['"]\s*\+/.test(api),
    "fz-api masih memanggil fetch('/api' + path) — di hosting statis itu selalu 404");
});

test('alamat backend dibaca dari konfigurasi, seperti CORE_CONFIG.workerUrl', () => {
  assert.ok(/curriculumApiUrl/.test(api),
    'fz-api tidak membaca curriculumApiUrl dari konfigurasi');
  assert.ok(/curriculumApiUrl/.test(cfg),
    'core-config.js tidak menyediakan curriculumApiUrl');
});

test('alamatnya kosong ATAU https — tidak pernah http, tidak pernah sampah', () => {
  /* KOREKSI ASSERT (m025-300). Versi pertama gerbang ini menuntut alamatnya SELALU kosong
     di repo, dengan alasan "salinan repo tidak boleh mengirim data murid ke server orang
     lain". Tuntutan itu lebih ketat daripada praktik repo ini sendiri: CORE_CONFIG.workerUrl
     SUDAH berisi alamat operator ('https://fiezel-core.puter.work') dan sudah lama begitu,
     karena FIEZEL tidak punya langkah build — tidak ada tempat lain untuk menaruh alamat
     selain berkas ini, dan repo ini milik satu operator (lihat CLAUDE.md).

     Yang benar-benar perlu dijaga karena itu bukan "harus kosong", melainkan: kalau terisi,
     ia WAJIB https. Alamat http mengirim token guru dan jawaban murid sebagai teks terbuka,
     dan itu kerusakan yang nyata — bukan soal selera. Pintu tetap tertutup saat kosong;
     assert itu ada di curriculum-console-gate-test dan dijalankan, bukan dibaca. */
  const m = cfg.match(/curriculumApiUrl\s*:\s*'([^']*)'/);
  assert.ok(m, 'curriculumApiUrl tidak ditemukan di core-config.js');
  const v = m[1];
  if (v === '') return;                       // kosong = backend belum dipasang, sah
  assert.ok(/^https:\/\/[^\s'"]+$/.test(v),
    "curriculumApiUrl terisi tetapi bukan https yang sah: '" + v + "' — token guru dan " +
    'jawaban murid tidak boleh lewat jalur terbuka');
  /* KOREKSI PENJELASAN (gitar-bot, PR #395). Versi pertama assert ini mengatakan ekor
     garis miring "menghasilkan //api dan setiap panggilan gagal". Itu SALAH, dan salahnya
     bertabrakan dengan kodeku sendiri di PR yang sama: base() di fz-api.js sudah membuang
     ekor itu (`.replace(/\/$/, '')`), jadi 'https://x/' tetap memanggil '/api/...' dengan
     benar. Assert ini murni kanonikalisasi: satu bentuk alamat saja yang hidup di repo,
     supaya diff, gerbang, dan mata manusia tidak perlu membedakan dua ejaan alamat yang
     sama. Ia bukan penjaga kerusakan — penjaga kerusakan yang nyata adalah assert https
     di atas dan assert pintu-tertutup-saat-kosong yang DIJALANKAN. */
  assert.ok(!/\/$/.test(v),
    "curriculumApiUrl diakhiri garis miring ('" + v + "') — tulis tanpa ekor. base() di " +
    'fz-api memang membuangnya, jadi ini soal satu bentuk kanonik, bukan panggilan gagal');
});

test('fz-api MENOLAK memanggil apa pun saat alamatnya kosong', () => {
  // Dijalankan, bukan dibaca: tanpa alamat, panggilan harus gagal cepat dan JELAS,
  // bukan diam-diam menembak halaman statis lalu memunculkan galat JSON yang membingungkan.
  const kosong = /base\s*\(\s*\)/.test(api) || /function base/.test(api);
  assert.ok(kosong, 'fz-api tidak punya pembaca alamat terpusat');
  assert.ok(/belum dikonfigurasi|not configured|tidak dikonfigurasi/i.test(apiMentah),
    'fz-api tidak menjelaskan apa-apa saat alamatnya kosong — guru akan melihat galat mentah');
});

test('bendera pintu DITURUNKAN dari alamat, bukan disetel tangan', () => {
  assert.ok(/curriculumApiUrl/.test(flags) || /curriculumApiUrl/.test(app),
    'bendera curriculumConsole masih manual — orang bisa menyalakannya tanpa backend ' +
    'dan mengembalikan bug pintu-ke-ruangan-kosong yang ditutup m025-296');
});

test('base() BENAR-BENAR membuang ekor garis miring (dijalankan, bukan dibaca)', () => {
  /* Assert ini lahir dari temuan gitar-bot di PR #395: aku menulis komentar yang
     mengklaim ekor garis miring "mematikan setiap panggilan", padahal base() di berkas
     yang sama sudah membuangnya. Perbaikan komentar saja masih berupa prosa — prosa bisa
     salah lagi. Jadi klaimnya dijalankan di sini: kalau suatu hari normalisasi itu
     dihapus dari fz-api.js, assert inilah yang merah, bukan pembaca yang bingung. */
  const src = (apiMentah.match(/function base\s*\([\s\S]*?\n  \}/) || [''])[0];
  assert.ok(src, 'base() tidak ditemukan di fz-api.js');
  const buat = (alamat) => new Function(
    'root',
    src + '\n  return base();'
  )({ FIEZEL_CURRICULUM_CONFIG: { curriculumApiUrl: alamat } });
  assert.strictEqual(buat('https://contoh.test/'), 'https://contoh.test',
    'base() tidak membuang ekor garis miring — komentar kanonikalisasi di gerbang ini ' +
    'jadi bohong, dan alamat berekor benar-benar akan menghasilkan //api');
  assert.strictEqual(buat('https://contoh.test'), 'https://contoh.test',
    'base() merusak alamat yang sudah kanonik');
  assert.strictEqual(buat(''), '', 'base() tidak mengembalikan kosong saat alamat kosong');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(baca('.github/workflows/quality.yml').indexOf('curriculum-api-base-test.js') >= 0,
    'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('curriculum-api-base-test GAGAL: ' + failures.length + ' assert merah');
  console.log('curriculum-api-base-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('curriculum-api-base-test: ' + pass + '/' + total + ' assert PASS');
