/**
 * tests/curriculum-cache-version-test.js — HALAMAN KURIKULUM TIDAK BOLEH BISA
 * TERTUTUP SALINAN LAMA DI CACHE PERAMBAN.
 *
 * ==========================================================================
 * KEJADIAN YANG MELAHIRKAN GERBANG INI (m025-326)
 * ==========================================================================
 * Pada 18 September 2026 owner membuka `fiezel.my.id/app/kurikulum.html` dan
 * melihat layar login token `FZG-` — layar yang SUDAH DICABUT tiga rilis
 * sebelumnya di PR #428. Verifier rilis pada saat yang sama membuktikan server
 * menyajikan `m025-325`, dan `teacher-console.js` di server memang sudah berisi
 * kode berpintu-KelasKu. Berkasnya benar; yang salah adalah peramban tidak
 * pernah memintanya lagi.
 *
 * Sebabnya struktural, bukan kebetulan:
 *
 *   1. `kurikulum.html` dan `misi.html` TIDAK ada di daftar precache `sw.js`
 *      (nol entri untuk keduanya, dan nol untuk fz-api.js / teacher-console.js /
 *      learning-mission.js). Jadi service worker — yang menamai cache-nya dengan
 *      SW_REV dan membuang generasi lain saat `activate` — tidak pernah menyentuh
 *      halaman-halaman ini. Seluruh penjaga generasi yang dipunyai cangkang murid
 *      TIDAK berlaku di sini.
 *
 *   2. Rujukan skripnya telanjang: `./features/curriculum/teacher-console.js`.
 *      URL yang sama persis untuk setiap rilis, selamanya. Cache HTTP biasa boleh
 *      menyajikan salinan lama dan ia benar melakukannya — tidak ada satu pun
 *      sinyal di URL itu yang memberitahunya isinya sudah berubah.
 *
 * Gabungan keduanya berarti rilis bisa TERBIT tanpa pernah TERLIHAT, dan tidak
 * ada gerbang yang bisa melihat bedanya: repo hijau, server benar, layar salah.
 *
 * ==========================================================================
 * YANG DITUNTUT GERBANG INI
 * ==========================================================================
 * (A) Setiap rujukan lokal di kedua halaman membawa `?v=m025-N`.
 * (B) N-nya SAMA dengan `FIEZEL_PAGE_BUILD` di core-config.js.
 *
 * (B) yang membuat (A) berarti. Penanda versi yang tidak ikut naik saat rilis naik
 * adalah penanda yang berbohong: ia terlihat seperti penjaga cache sambil
 * menyajikan URL yang sama persis dengan rilis sebelumnya. Karena itu
 * `tools/bump-build.mjs` menulis ulang SEMUA kemunculannya pada setiap bump, dan
 * gerbang ini yang membuktikan penulisan itu benar-benar terjadi.
 *
 * KENAPA BUKAN HEADER CACHE DI SERVER: `.htaccess` ada di `deploy/site-exclude.txt`
 * sebagai MILIK SERVER — repo sengaja tidak pernah mengirimkannya, supaya deploy
 * tidak menghapus aturan yang dipasang owner langsung di cPanel. Jadi repo tidak
 * bisa menjamin header cache, tetapi ia BISA menjamin bentuk URL-nya. Yang bisa
 * dijamin itulah yang dijadikan gerbang.
 */

const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const baca = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');

const HALAMAN = ['kurikulum.html', 'misi.html'];

let lulus = 0;
const gagal = [];
function tegaskan(syarat, pesan) {
  if (syarat) { lulus += 1; return; }
  gagal.push(pesan);
}

/* Build yang sedang dijanjikan repo. Dibaca dari SUMBER-nya, bukan diketik ulang:
   gerbang yang memuat nomornya sendiri akan tetap hijau saat rilis bergerak. */
const buildSekarang = (baca('core-config.js').match(/self\.FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1];
tegaskan(!!buildSekarang, 'core-config.js: FIEZEL_PAGE_BUILD tidak terbaca — bentuk penandanya berubah.');

/* Hanya rujukan LOKAL yang dituntut. Alamat mutlak (CDN, font) tidak kita kendalikan
   versinya, dan memaksakan `?v=` ke sana justru bisa mematahkan pengambilannya. */
const RUJUKAN = /(?:src|href)="(\.\/[^"]+\.(?:js|css))([^"]*)"/g;

for (const halaman of HALAMAN) {
  const isi = baca(halaman);
  const temuan = [...isi.matchAll(RUJUKAN)];

  tegaskan(
    temuan.length > 0,
    halaman + ': nol rujukan skrip/gaya lokal ditemukan — bentuk halamannya berubah, perbarui gerbang ini.'
  );

  for (const [, berkas, ekor] of temuan) {
    const m = /^\?v=(m025-\d+)$/.exec(ekor);
    tegaskan(
      !!m,
      halaman + ': `' + berkas + '` tidak membawa penanda versi. Tanpa `?v=<build>`, peramban boleh ' +
      'menyajikan salinan rilis lama di URL yang sama — persis cacat m025-325 yang membuat layar token ' +
      'FZG- muncul kembali tiga rilis sesudah dicabut.'
    );
    if (m && buildSekarang) {
      tegaskan(
        m[1] === buildSekarang,
        halaman + ': `' + berkas + '` menandai ' + m[1] + ' sementara FIEZEL_PAGE_BUILD ' + buildSekarang +
        '. Penanda yang tertinggal menyajikan URL rilis lama — jalankan `node tools/bump-build.mjs`, ' +
        'jangan sunting nomornya dengan tangan.'
      );
    }
  }
}

/* Ritual bump WAJIB ikut menuliskannya. Tanpa cek ini, penanda benar hari ini dan
   diam-diam tertinggal pada rilis berikutnya — dan gerbang di atas baru berteriak
   sesudah rilisnya terlanjur terbit. */
const bump = baca('tools/bump-build.mjs');
tegaskan(
  /HALAMAN_BERVERSI/.test(bump) && HALAMAN.every((h) => bump.includes("'" + h + "'")),
  'tools/bump-build.mjs: kedua halaman kurikulum harus terdaftar di HALAMAN_BERVERSI, supaya setiap ' +
  'bump build ikut menaikkan penanda `?v=`-nya.'
);

if (gagal.length) {
  console.error('MERAH curriculum-cache-version (' + gagal.length + '):');
  for (const g of gagal) console.error('  - ' + g);
  process.exit(1);
}
console.log('OK curriculum-cache-version: ' + lulus + ' penegasan, ' + HALAMAN.length + ' halaman, build ' + buildSekarang + '.');
