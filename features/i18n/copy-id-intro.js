/**
 * FIEZEL · features/i18n/copy-id-intro.js — COPY-MAP INTRO (id)
 *
 * Naskah layar intro baru (3 slide perkenalan + layar Masuk/Daftar, m025-300).
 * Kalimatnya lahir bersama redesign ini dan belum pernah ada di baseline emas, karena
 * itu diisolasi di domainnya sendiri. Kembarannya: copy-th-intro.js (kunci identik).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('id', {
    'intro.skip': 'Lewati',
    'intro.next': 'Lanjut',
    'intro.start': 'Mulai',
    'intro.badge': 'FIEZEL • BELAJAR BARENG NUSA • ADAPTIVE ENGLISH • ',
    'intro.slide1-title': 'Belajar Inggris se-seru main game',
    'intro.slide1-sub': 'Latihan singkat setiap hari bareng Nusa — kosakata, grammar, dan reading yang menyesuaikan levelmu.',
    'intro.slide2-title': 'Dengar & bicara tanpa malu',
    'intro.slide2-sub': 'Latihan listening dan speaking dengan suara natural, langsung di HP-mu — bahkan saat offline.',
    'intro.slide3-title': 'Naik level, rayakan bareng',
    'intro.slide3-sub': 'Tes penempatan menentukan titik mulaimu. Setiap kemajuan dihitung — dari A1 sampai C2.',

    'intro.auth-login-title': 'Masuk',
    'intro.auth-register-title': 'Buat akun',
    'intro.auth-login-sub': 'Lanjutkan belajar dari perangkat mana pun.',
    'intro.auth-register-sub': 'Gratis. Progres, streak, dan kelasmu ikut ke mana saja.',
    'intro.auth-tab-login': 'Masuk',
    'intro.auth-tab-register': 'Daftar',
    'intro.auth-handle': 'Nama akun',
    'intro.auth-handle-ph': 'mis. nusa_123',
    'intro.auth-password': 'Kata sandi',
    'intro.auth-password-ph': 'Ketik kata sandimu',
    'intro.auth-confirm': 'Ulangi kata sandi',
    'intro.auth-confirm-ph': 'Ketik lagi kata sandinya',
    'intro.auth-login-btn': 'Masuk',
    'intro.auth-register-btn': 'Buat akun',
    'intro.auth-or': 'atau lanjut dengan',
    'intro.auth-skip': 'Lanjut tanpa akun',
    'intro.auth-skip-help': 'Semua materi tetap bisa dipakai. Kamu bisa masuk kapan saja dari Pengaturan.',
    'intro.auth-no-account': 'Belum punya akun?',
    'intro.auth-signup-link': 'Daftar di sini',
    'intro.auth-have-account': 'Sudah punya akun?',
    'intro.auth-login-link': 'Masuk di sini',
    'intro.auth-show-pw': 'Lihat kata sandi',
    'intro.auth-hide-pw': 'Sembunyikan kata sandi',
    'intro.auth-close': 'Tutup dan lanjut tanpa akun',
    'intro.auth-quote': 'Halo! Aku Nusa. Ayo lanjutkan petualangan bahasa Inggrismu.',
    'intro.auth-toast-login': 'Berhasil masuk sebagai @{handle}',
    'intro.auth-toast-register': 'Akun @{handle} siap. Selamat datang!',
    'intro.auth-fail-login': 'Belum bisa masuk. Periksa nama akun dan kata sandimu.',
    'intro.auth-fail-register': 'Pendaftaran belum berhasil. Coba lagi, ya.',
    'intro.auth-busy': 'Sebentar…'
  });
}());
