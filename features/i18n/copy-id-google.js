/**
 * FIEZEL · features/i18n/copy-id-google.js — COPY-MAP INDONESIA, domain "masuk dengan Google".
 *
 * Domain terpisah, bukan tumpangan di copy-id-feat-*: `tests/th-coverage-test.js` MENEMUKAN
 * domain dari isi direktori ini, jadi berkas ini otomatis menuntut kembaran
 * `copy-th-google.js` dengan kunci dan `{placeholder}` yang sama persis. Menaruh naskah
 * Google di berkas domain lain akan menyembunyikannya di tengah ratusan kunci milik orang
 * lain — dan naskah yang tidak bisa ditunjuk adalah naskah yang tidak bisa diperiksa.
 *
 * NADA: satu langkah berikutnya di setiap keadaan gagal, tanpa nama mesin, tanpa
 * menyalahkan murid. Murid yang gagal masuk tidak sedang melakukan kesalahan.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    /* --- ajakan dan penjelasan ------------------------------------------------ */
    'google.judul': 'Masuk dengan Google',
    'google.penjelasan': 'Masuk sekali, lalu kelas, tugas dari gurumu, dan teman-temanmu ikut ke perangkat mana pun yang kamu pakai.',
    'google.atau': 'atau',
    'google.pakai-akun-fiezel': 'Belum punya akun Google? Pakai akun FIEZEL saja — sama-sama bisa.',
    'google.menyiapkan': 'Menyiapkan tombol Google…',
    'google.email-untuk-sekolah': 'Alamat emailmu disimpan supaya sekolah atau orang tuamu bisa dihubungi kalau perlu. Tidak dipakai untuk hal lain.',

    /* --- keadaan berhasil ----------------------------------------------------- */
    'google.status-masuk': 'Kamu masuk dengan Google sebagai {email}.',
    'google.toast-berhasil': 'Berhasil masuk dengan Google.',
    'google.toast-tertaut': 'Akun Google-mu sudah tertaut. Belajarmu kini bisa dilanjutkan dari perangkat lain.',

    /* --- keadaan gagal -------------------------------------------------------- */
    'google.gagal': 'Masuk dengan Google belum berhasil. Coba lagi, ya — ini bukan kesalahanmu.',
    'google.gagal-muat': 'Tombol Google belum bisa dimuat. Masuk dengan akun FIEZEL di bawah, ya.',
    'google.gagal-jaringan': 'Sambungannya putus di tengah jalan. Coba lagi setelah internetmu kembali stabil.',
    'google.belum-aktif': 'Masuk dengan Google belum aktif di aplikasi ini.',
    'google.terlalu-cepat': 'Terlalu cepat. Tunggu sebentar, lalu coba lagi.',
    'google.server-sibuk': 'Belum bisa dijawab sekarang. Coba lagi sebentar lagi, ya.',
    'google.sudah-tertaut': 'Akun FIEZEL ini sudah tertaut ke akun Google yang lain. Keluar dulu, lalu masuk lagi dengan akun Google itu.',
    'google.email-belum-terverifikasi': 'Alamat email akun Google itu belum diverifikasi Google, jadi belum bisa dipakai masuk.'
  });
}());
