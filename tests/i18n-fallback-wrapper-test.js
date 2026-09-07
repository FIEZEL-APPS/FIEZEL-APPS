// tests/i18n-fallback-wrapper-test.js — pembungkus t(kunci, cadangan) WAJIB memakai
// cadangannya saat kuncinya tidak terpecahkan.
//
// KENAPA GERBANG INI ADA
// ----------------------
// FiezelI18n.t(kunci) mengembalikan KUNCINYA SENDIRI saat kalimatnya tidak ditemukan —
// itu disengaja, supaya lubangnya terlihat dan bisa dihitung. Tetapi sebelas modul
// membungkusnya begini:
//
//     function t(k, fb) { ... return I && I.t ? I.t(k) : fb; }
//
// Cadangan `fb` hanya dipakai kalau FiezelI18n TIDAK ADA SAMA SEKALI. Kalau modulnya ada
// tetapi kuncinya belum termuat — copy-map telat, deploy tidak lengkap, satu berkas 404 di
// server — I.t(k) mengembalikan 'guru.merek-tag' dan pembungkus mengembalikannya apa adanya.
// Guru melihat 'guru.merek-tag', 'guru.tab-jurnal', 'guru.opsi-bab' di layarnya.
//
// Yang paling menyakitkan: 104 dari 117 pemanggilan di Ruang Guru SUDAH menuliskan kalimat
// cadangannya. Teksnya ada di kode, hanya tidak pernah dipakai. Layar yang rusak itu punya
// jawabannya sendiri satu baris di sebelahnya.
//
// CARA GERBANG INI MEMERIKSA
// Ia tidak membaca pola teks — pola bisa ditulis ulang sampai lolos tanpa berubah perilaku.
// Ia MENGAMBIL sumber pembungkusnya, menjalankannya dengan FiezelI18n palsu yang meniru
// keadaan "kunci tidak ditemukan" (t mengembalikan kuncinya), lalu menuntut hasilnya adalah
// kalimat cadangan. Acuannya sudah ada di repo: features/class-hub/fiezel-class-hub.js.

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; } catch (err) { failures.push(name + ' — ' + err.message); }
}

/* Kumpulkan setiap berkas features/** yang mendefinisikan pembungkus t() lokal berparameter
   cadangan. Ditemukan dari isi direktori, bukan dari daftar: modul baru yang menyalin pola
   rusak ini langsung ikut terjaring. */
const berkas = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) berkas.push(p);
  }
})(path.join(__fzRoot, 'features'));

/** Ambil sumber `function t(k, fb, ...) { ... }` dengan menghitung kurung kurawal. */
function ambilPembungkus(src) {
  /* Parameter kedua harus benar-benar CADANGAN. fiezel-update-prompt.js memakai
     t(kunci, params) — di sana mengembalikan kunci memang benar, dan menjaringnya hanya
     akan membuat gerbang ini menuduh kode yang sehat. */
  const m = src.match(/function t\s*\(\s*\w+\s*,\s*(fb|fallback|cadangan)\b[^)]*\)\s*\{/);
  if (!m) return null;
  let i = src.indexOf('{', m.index), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(m.index, j + 1); }
  }
  return null;
}

/* Hanya pembungkus yang benar-benar memanggil FiezelI18n yang diuji. Yang menutup variabel
   modul lain (registry, tabel copy lokal) tidak bisa dijalankan berdiri sendiri, dan
   memaksanya masuk hanya akan membuat gerbang ini berisik — bukan lebih tajam. Sumber
   kebenaran FiezelI18n sendiri dikecualikan: tandatangannya (kunci, params), bukan cadangan. */
const kandidat = [];
for (const p of berkas) {
  const rel = path.relative(__fzRoot, p);
  if (rel === path.join('features', 'i18n', 'fiezel-i18n.js')) continue;
  const src = fs.readFileSync(p, 'utf8');
  const fn = ambilPembungkus(src);
  if (!fn || fn.indexOf('FiezelI18n') < 0) continue;
  kandidat.push({ rel, fn });
}

test('ada pembungkus t(kunci, cadangan) yang ditemukan untuk diperiksa', () => {
  assert.ok(kandidat.length >= 10,
    'hanya ' + kandidat.length + ' pembungkus ditemukan — pemindainya kemungkinan buta, bukan repo yang bersih');
});

test('SETIAP pembungkus memakai cadangannya saat kunci TIDAK terpecahkan', () => {
  const rusak = [];
  for (const { rel, fn } of kandidat) {
    let hasil;
    try {
      // FiezelI18n palsu: ADA, tetapi kuncinya tidak ditemukan — persis keadaan saat
      // copy-map telat atau satu berkas hilang di server.
      const buat = new Function('self', 'root', 'globalThis', 'return (' + fn + ')');
      const palsu = { FiezelI18n: { t: (k) => k } };
      hasil = buat(palsu, palsu, palsu)('guru.contoh-kunci', 'Kalimat cadangan');
    } catch (err) {
      rusak.push(rel + ' — pembungkusnya melempar: ' + err.message);
      continue;
    }
    if (hasil !== 'Kalimat cadangan') {
      rusak.push(rel + ' — mengembalikan ' + JSON.stringify(hasil) + ', bukan cadangannya');
    }
  }
  assert.deepStrictEqual(rusak.slice(0, 12), [],
    rusak.length + ' dari ' + kandidat.length + ' pembungkus membuang cadangannya — kunci mentah sampai ke layar');
});

test('pembungkus tetap memakai kalimat asli saat kuncinya MEMANG terpecahkan', () => {
  // Penjaga arah sebaliknya: "perbaikan" yang selalu mengembalikan cadangan akan membuat
  // seluruh terjemahan Thai mati diam-diam, dan assert di atas tetap hijau.
  const rusak = [];
  for (const { rel, fn } of kandidat) {
    try {
      const buat = new Function('self', 'root', 'globalThis', 'return (' + fn + ')');
      const palsu = { FiezelI18n: { t: () => 'Kalimat asli' } };
      const hasil = buat(palsu, palsu, palsu)('guru.contoh-kunci', 'Kalimat cadangan');
      if (hasil !== 'Kalimat asli') rusak.push(rel + ' — mengembalikan ' + JSON.stringify(hasil));
    } catch (err) { rusak.push(rel + ' — melempar: ' + err.message); }
  }
  assert.deepStrictEqual(rusak.slice(0, 12), [],
    rusak.length + ' pembungkus mengabaikan kalimat yang sudah terpecahkan — terjemahan mati diam-diam');
});

test('gerbang ini terdaftar di .github/workflows/quality.yml', () => {
  assert.ok(fs.readFileSync(path.join(__fzRoot, '.github/workflows/quality.yml'), 'utf8')
    .indexOf('i18n-fallback-wrapper-test.js') >= 0, 'gerbang belum terdaftar di quality.yml');
});

const total = pass + failures.length;
if (failures.length) {
  failures.forEach((f) => console.error('FAIL: ' + f));
  console.error('i18n-fallback-wrapper-test GAGAL: ' + failures.length + ' assert merah');
  console.log('i18n-fallback-wrapper-test: ' + pass + '/' + total + ' assert PASS');
  process.exit(1);
}
console.log('i18n-fallback-wrapper-test: ' + pass + '/' + total + ' assert PASS');
