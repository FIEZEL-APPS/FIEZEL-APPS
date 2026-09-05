/**
 * FIEZEL · features/i18n/copy-id-proctor.js — COPY-MAP PENDETEKSI KELUAR LAYAR (id)
 *
 * Kalimat yang dibaca MURID saat mengerjakan ujian dari guru, dan kalimat yang dibaca
 * GURU saat pendeteksi melaporkan kepergian. Semuanya baru (lahir bersama pendeteksi
 * keluar layar), jadi tidak ada padanan di baseline emas — pasangan Thai-nya ada di
 * copy-th-proctor.js, kunci demi kunci.
 *
 * NADA: menyebut fakta, tidak menuduh. Pendeteksi ini melaporkan bahwa layar ditinggalkan,
 * bukan bahwa murid menyontek — perbedaan itu harus terdengar di setiap kalimat, karena
 * kalimat inilah yang dibaca murid yang keluar hanya karena dipanggil orang rumah.
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('id', {
    'proctor.aktif': 'Mode ujian: kalau kamu keluar dari layar ini, gurumu menerima catatannya.',
    'proctor.tercatat': 'Tercatat keluar layar {n}× ({detik} detik). Gurumu sudah menerima catatannya.',
    'proctor.kembali-toast': 'Kamu keluar dari layar ujian {n}× ({detik} detik terakhir). Catatannya sudah sampai ke gurumu.',
    'proctor.guru-chip': 'Keluar layar {n}×',
    'proctor.guru-bersih': 'Tidak keluar layar',
    'proctor.guru-ringkas': '{jumlah} murid terdeteksi keluar layar'
  });
})();
