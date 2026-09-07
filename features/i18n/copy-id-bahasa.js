/**
 * FIEZEL · features/i18n/copy-id-bahasa.js — COPY-MAP PEMILIH BAHASA TARGET (id)
 *
 * Kalimat yang dibaca murid saat memilih BAHASA YANG DIPELAJARI — bukan bahasa layar.
 * Dua hal itu berbeda dan gampang tertukar: `learnerLocale` mengatur bahasa antarmuka
 * (Indonesia / ไทย), sedangkan yang di sini mengatur kursus mana yang sedang dibuka.
 * Setiap kalimat dijaga supaya perbedaan itu terdengar.
 *
 * NADA: menyebut apa yang terjadi pada progres, karena itu pertanyaan pertama murid yang
 * berganti kursus. Progres tiap bahasa berdiri sendiri dan tidak ada yang terhapus —
 * dikatakan terbuka, bukan diasumsikan dimengerti.
 *
 * Pasangan Thai-nya di copy-th-bahasa.js, kunci demi kunci.
 */
(function () {
  'use strict';
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('id', {
    'bahasa.judul': 'Bahasa yang dipelajari',
    'bahasa.penjelasan': 'Progres tiap bahasa berdiri sendiri. Berganti tidak menghapus apa pun.',
    'bahasa.en': 'Bahasa Inggris',
    'bahasa.ja': 'Bahasa Jepang',
    'bahasa.en-catatan': 'Kursus lengkap',
    'bahasa.ja-catatan': 'Tingkat A1/N5 · masih draf',
    'bahasa.ja-peringatan': 'Kursus Jepang masih tahap awal: baru tingkat A1; latihan menyimak, berbicara, dan menulis belum ada sehingga kartunya disembunyikan; naskahnya belum ditinjau penutur asli.',
    'bahasa.berganti': 'Sekarang belajar {bahasa}.'
  });
})();
