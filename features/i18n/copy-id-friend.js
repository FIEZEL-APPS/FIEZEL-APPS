/**
 * FIEZEL · features/i18n/copy-id-friend.js · COPY-MAP INDONESIA (domain: friend).
 *
 * SISTEM PERTEMANAN ala LINE (SLOT 7 sosial): kartu ID pribadi, Kode QR profil,
 * deteksi tautan masuk ?friend=@handle, kotak masuk permintaan teman, dan tombol
 * "Ajak Main Suara" ke Panggung Suara (SLOT 13).
 *
 * MENGAPA DOMAIN SENDIRI. Kunci `social2.add-*` dan `social2.req-*` yang sudah ada
 * (copy-id-student.js) tetap dipakai apa adanya: menambah teman lewat ID dan menerima
 * permintaan SUDAH berdiri di sana. Yang lahir di berkas ini adalah permukaan BARU yang
 * belum punya kunci: QR, tautan ?friend=, dan ajakan suara. Memisahkannya membuat naskah
 * ini dibaca sebagai satu blok saat ditinjau, persis alasan copy-id-stage.js dipisah.
 *
 * NASKAH TANPA TANDA HUBUNG: setiap kalimat Indonesia di bawah ditulis tanpa tanda
 * hubung (baik minus, en dash, maupun em dash), sesuai naskah naskah app lain.
 *
 * Kembaran Thai: copy-th-friend.js. Karena berkas id-nya ada, pendaftaran domain
 * OTOMATIS di tests/th-coverage-test.js menuntut kembarannya.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('id', {
    /* ── Kartu ID pribadi & Kode QR profil ───────────────────────────────────── */
    'social3.my-id-title': 'ID pribadimu',
    'social3.copy-id': 'Salin ID',
    'social3.copy-id-done': 'ID kamu disalin.',
    'social3.copy-id-fail': 'Tidak bisa menyalin otomatis. ID kamu: @{handle}',
    'social3.show-qr': 'Tampilkan Kode QR Saya',
    'social3.qr-title': 'Kode QR Profil',
    'social3.qr-desc': 'Minta teman memindai kode ini dengan kamera ponselnya. Kalian langsung terhubung.',
    'social3.qr-aria': 'Kode QR profil @{handle}',
    'social3.qr-download': 'Unduh gambar',
    'social3.qr-share': 'Bagikan tautan profil',
    'social3.qr-share-done': 'Tautan profil kamu disalin.',
    'social3.qr-share-fail': 'Tidak bisa membagikan otomatis. Salin tautan ini: {tautan}',
    'social3.qr-share-body': 'Ayo berteman di FIEZEL. Pindai atau buka tautan ini:',
    'social3.qr-fail': 'Kode QR tidak bisa dibuat sekarang. Coba lagi nanti.',
    'social3.qr-need-profile': 'Buat ID online dulu supaya kode QR kamu bisa tampil.',

    /* ── Pindai QR kamera & unggah galeri ────────────────────────────────────── */
    'social3.scan-title': 'Pindai Kode QR',
    'social3.scan-desc': 'Arahkan kamera ke kode QR teman atau pilih gambar dari galeri.',
    'social3.scan-btn': 'Pindai QR',
    'social3.scan-from-gallery': 'Pilih dari Galeri',
    'social3.scan-my-qr': 'Kode QR Saya',
    'social3.scan-cam-err': 'Kamera tidak dapat diakses atau izin belum diberikan.',
    'social3.scan-not-found': 'Kode QR tidak ditemukan pada gambar ini. Pastikan gambar jelas.',
    'social3.scan-self': 'Ini adalah kode QR profil kamu sendiri.',
    'social3.scan-invalid': 'Kode QR ini bukan tautan profil atau ID teman FIEZEL.',

    /* ── Deteksi tautan masuk ?friend=@handle ────────────────────────────────── */
    'social3.link-mark': 'Undangan teman',
    'social3.link-title': 'Tambahkan @{handle} sebagai teman?',
    'social3.link-body': 'Kamu membuka tautan undangan pertemanan dari @{handle}.',
    'social3.link-send': 'Kirim Permintaan',
    'social3.link-cancel': 'Batal',
    'social3.link-sent': 'Permintaan terkirim ke @{handle}.',
    'social3.link-friends': 'Kamu dan @{handle} sekarang berteman.',
    'social3.link-fail': 'Tidak bisa mengirim permintaan sekarang. Coba lagi nanti.',

    /* ── Kotak masuk permintaan pertemanan ───────────────────────────────────── */
    'social3.req-section-title': 'Permintaan Pertemanan Masuk',
    'social3.req-section-desc': 'Terima untuk mulai berteman.',
    'social3.req-none': 'Belum ada permintaan masuk.',

    /* ── Ajak Main Suara (Panggung Suara SLOT 13) ────────────────────────────── */
    'social3.voice-ajak': 'Ajak Main Suara',
    'social3.voice-ajak-title': 'Ajak @{handle} main suara?',
    'social3.voice-ajak-body': 'Ruangan suara dibuat, lalu undangannya disiapkan untuk dikirim.',
    'social3.voice-ajak-send': 'Buat dan undang',
    'social3.voice-ajak-ok': 'Ruangan siap. Undangan untuk @{handle} dibuka di WhatsApp.',
    'social3.voice-ajak-fail': 'Ruangan suara belum bisa dibuat sekarang.',
    'social3.voice-off': 'Fitur suara belum aktif untuk akunmu.'
  });
}());