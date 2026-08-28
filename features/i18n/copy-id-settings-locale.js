/**
 * FIEZEL · features/i18n/copy-id-settings-locale.js — COPY-MAP SAKLAR BAHASA (id)
 *
 * MENGAPA BERKAS TERPISAH. Semua copy-id-* lain berisi kalimat yang DIPINDAH byte-identik
 * dari app.js/features (kontrak gerbang id-golden-snapshot-test: pemindahan = hijau).
 * Berkas ini satu-satunya pengecualian yang disengaja: saklar bahasa di Pengaturan adalah
 * fitur BARU (m025-182, W2-STATE, AI-11 F03), jadi kalimat Indonesianya juga baru dan
 * belum ada di baseline emas. Dengan mengisolasinya di sini — bukan menumpang
 * copy-id-app-d.js — regen baseline untuk kalimat baru ini teraudit sendiri:
 * bukti verifier independen ada di impl/w2regen/batch-7-proof.json.
 *
 * KONVENSI: kunci settings.locale-* mengikuti pola <domain>.<slug> rumah; copy-th 1:1
 * menyusul di copy-th-settings-locale.js (Wave 3, draft AI wajib review penutur asli).
 * CATATAN OPSI: label opsi bahasa adalah AUTONYM — 'Bahasa Indonesia' dan 'ภาษาไทย' tampil
 * dalam bahasanya masing-masing di KEDUA locale (konvensi pemilih bahasa: murid yang
 * tersasar ke locale yang salah harus tetap bisa menemukan bahasanya sendiri). Karena itu
 * kedua nilai ini di copy-th nanti WAJIB byte-identik dengan yang di sini.
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('id', {
    'settings.locale-judul': 'Bahasa tampilan',
    'settings.locale-catatan': 'Bahasa antarmuka aplikasi. Materi belajar bahasa Inggris tidak berubah.',
    'settings.locale-toast': 'Bahasa tampilan tersimpan.',
    'settings.locale-opsi-id': 'Bahasa Indonesia',
    'settings.locale-opsi-th': 'ภาษาไทย'
  });
}());
