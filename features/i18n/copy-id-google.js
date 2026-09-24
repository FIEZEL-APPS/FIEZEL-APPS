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
    'google.email-belum-terverifikasi': 'Alamat email akun Google itu belum diverifikasi Google, jadi belum bisa dipakai masuk.',
    /* m025-367 · layar masuk wajib: Selamat datang · Masuk · Daftar (features/auth/fiezel-auth-screen.js). */
    'auth.layar.aktifkan': 'Aktifkan akun guru',
    'auth.layar.aktifkan-singkat': 'Aktifkan akun',
    'auth.layar.atau-akun': 'atau pakai akun FIEZEL',
    'auth.layar.atau-buat': 'atau buat akun FIEZEL',
    'auth.layar.belum-akun': 'Belum punya akun?',
    'auth.layar.belum-guru': 'Guru baru?',
    'auth.layar.daftar': 'Daftar',
    'auth.layar.demo-guru': 'Lihat demo Ruang Guru',
    'auth.layar.galat-beda': 'Kedua kata sandi belum sama.',
    'auth.layar.galat-bukan-guru': 'Akun ini akun murid. Pilih tab Murid untuk masuk.',
    'auth.layar.galat-cepat': 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.',
    'auth.layar.galat-kode-kelas': 'Kode KelasKu berbentuk FZ- lalu enam huruf/angka, misalnya FZ-AB2C3D.',
    'auth.layar.galat-kode-kosong': 'Isi kode undangan dari admin FIEZEL.',
    'auth.layar.galat-kosong': 'Isi nama pengguna dan kata sandi.',
    'auth.layar.galat-kredensial': 'Nama pengguna atau kata sandi salah.',
    'auth.layar.galat-nama': 'Nama pengguna hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.',
    'auth.layar.galat-nama-dipakai': 'Nama pengguna itu sudah dipakai. Coba nama lain.',
    'auth.layar.galat-offline': 'Tidak ada sambungan internet. Masuk butuh internet sekali saja.',
    'auth.layar.galat-sandi': 'Kata sandi itu belum bisa dipakai. Coba kata sandi lain.',
    'auth.layar.galat-sandi-mudah': 'Kata sandi itu terlalu mudah ditebak. Pilih yang lain.',
    'auth.layar.galat-server': 'Server belum bisa dihubungi. Coba lagi sebentar lagi.',
    'auth.layar.galat-sudah-ada': 'Perangkat ini sudah punya akun. Masuk dengan akun itu.',
    'auth.layar.galat-umum': 'Belum berhasil. Coba lagi, ya.',
    'auth.layar.galat-undangan': 'Kode undangan tidak berlaku atau sudah dipakai.',
    'auth.layar.google-diblokir': 'Tombol Google tidak bisa dimuat di jaringan ini. Pakai akun FIEZEL di bawah.',
    'auth.layar.guru': 'Guru',
    'auth.layar.guru-daftar-hint': 'Akun guru dibuat dengan kode undangan dari admin FIEZEL.',
    'auth.layar.guru-masuk-hint': 'Masuk dengan akun guru yang sudah kamu aktifkan.',
    'auth.layar.kata-sandi': 'Kata sandi',
    'auth.layar.kode-kelasku': 'Kode KelasKu',
    'auth.layar.kode-undangan': 'Kode undangan',
    'auth.layar.lanjut': 'Lanjut',
    'auth.layar.lihat-sandi': 'Tampilkan kata sandi',
    'auth.layar.lupa': 'Lupa kata sandi?',
    'auth.layar.lupa-guru': 'Hubungi admin FIEZEL untuk mengatur ulang kata sandi guru.',
    'auth.layar.lupa-murid': 'Belum ada pemulihan otomatis. Masuk dengan Google bila akunmu tertaut, atau minta bantuan gurumu.',
    'auth.layar.masuk': 'Masuk',
    'auth.layar.memproses': 'Memproses…',
    'auth.layar.murid': 'Murid',
    'auth.layar.nama-pengguna': 'Nama pengguna',
    'auth.layar.opsional': '(opsional)',
    'auth.layar.peran-aria': 'Masuk sebagai',
    'auth.layar.selamat-datang': 'Selamat datang',
    'auth.layar.sudah-akun': 'Sudah punya akun?',
    'auth.layar.sudah-guru': 'Sudah punya akun guru?',
    'auth.layar.ulangi-sandi': 'Ulangi kata sandi',
    'auth.layar.welcome-lead': 'Belajar Bahasa Inggris dan Bahasa Jepang bersama PAW. Masuk sekali, progresmu ikut ke HP mana pun.'
  });
}());
