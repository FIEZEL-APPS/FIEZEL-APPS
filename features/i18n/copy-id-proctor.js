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
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('id', {
    'proctor.aktif': 'Mode ujian: kalau kamu keluar dari layar ini, gurumu menerima catatannya.',
    'proctor.tercatat': 'Tercatat keluar layar {n}× ({detik} detik). Gurumu sudah menerima catatannya.',
    'proctor.kembali-toast': 'Kamu keluar dari layar ujian {n}× ({detik} detik terakhir). Catatannya sudah sampai ke gurumu.',
    'proctor.guru-chip': 'Keluar layar {n}×',
    'proctor.guru-bersih': 'Tidak keluar layar',
    'proctor.guru-ringkas': '{jumlah} murid terdeteksi keluar layar',
    /* m025-273 — kunci ujian berlaku di SELURUH permukaan ujian, bukan hanya tugas Kelas. */
    'ujian.mode-aktif': 'Mode ujian: pembimbing FIEZEL nonaktif, dan kalau kamu keluar dari layar ini gurumu menerima catatannya.',
    'ujian.ai-terkunci': 'Pembimbing FIEZEL nonaktif selama sesi ujian. Kerjakan dengan kemampuanmu sendiri — ia kembali begitu ujian selesai.',
    'ujian.ai-terkunci-singkat': 'Nonaktif selama ujian.',
    'ujian.keluar-tercatat': 'Kamu keluar dari layar ujian {n}× ({detik} detik terakhir). Catatannya sudah sampai ke gurumu.'
  });
})();
