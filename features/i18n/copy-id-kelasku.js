/**
 * FIEZEL · features/i18n/copy-id-kelasku.js — naskah pintu KelasKu di konsol kurikulum.
 *
 * Tiga kalimat ini muncul saat penukaran tiket identitas GAGAL (features/curriculum/fz-api.js).
 * Berbeda dengan istilah Kurikulum Merdeka di layar yang sama — yang sengaja tidak
 * diterjemahkan karena guru Thai tidak mengajar di bawahnya — kalimat-kalimat ini adalah
 * naskah ANTARMUKA murni: mereka menjelaskan keadaan aplikasi, bukan regulasi Indonesia.
 * Jadi mereka punya kembaran Thai penuh di copy-th-kelasku.js.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    'kelasku.belum-tersambung': 'Akun KelasKu belum tersambung di aplikasi ini.',
    'kelasku.belum-masuk': 'Kamu belum masuk KelasKu. Masuk dulu di aplikasi FIEZEL, lalu kembali ke sini.',
    'kelasku.jembatan-mati': 'Jembatan KelasKu belum dinyalakan di server.',
    'kelasku.tiket-gagal': 'Gagal mengambil tiket KelasKu.'
  });
})();
