/**
 * FIEZEL · features/i18n/copy-id-classjoin.js — MASUK KELAS LEWAT KODE (id)
 *
 * Naskah untuk satu momen kecil yang selama ini tidak punya suara: murid mengetik kode kelas
 * dan menekan Gabung. Sebelum m025-272 momen itu berakhir diam — murid tidak tahu apakah
 * gurunya menerima apa pun, dan guru tidak tahu ada yang mengetuk sampai murid itu
 * menyelesaikan tugas pertamanya. Kalimat di bawah menutup kedua sisi kebisuan itu.
 *
 * Pasangan Thai ada di copy-th-classjoin.js, kunci demi kunci.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('id', {
    'kelas.gabung-terkirim': 'Kode tersimpan. Permintaan bergabung sudah dikirim ke gurumu — tugas muncul otomatis setelah kamu ditambahkan.',
    'kelas.gabung-kode-salah': 'Kode tidak valid — bentuknya FZ-XXXXXX.',
    'kelas.menunggu-persetujuan': 'Menunggu persetujuan',
    'kelas.menunggu-penjelasan': 'Mereka memasukkan kode kelas ini. Tambahkan yang kamu kenal; yang tidak ditambahkan tidak menerima tugas apa pun.',
    'kelas.gabung-diterima': '{nama} ditambahkan ke {kelas}. Tugas berikutnya ikut terkirim ke dia.',
    'kelas.tambahkan': 'Tambahkan',
    'kelas.abaikan': 'Abaikan'
  });
})();
