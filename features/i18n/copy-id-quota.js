/**
 * FIEZEL · features/i18n/copy-id-quota.js — COPY-MAP INDONESIA, naskah blok notice app.js
 *
 * MENGAPA BERKAS TERPISAH: tests/quota-notice-a11y-test.js meng-union korpus kanonnya (K3) HANYA
 * dari daftar eksplisit [copy-id-quota.js, copy-id-notice.js] (handoff W2-TEST-A §3).
 * Kalimat blok aiErrorMessage yang pindah ke copy-map WAJIB mendarat di sini supaya tetap
 * terhitung kanon register (nggak/kamu/no-blame) — pindah ke file lain = kalimat keluar
 * dari korpus dan gerbang kehilangan penjaganya. Nilai byte-identik dari app.js (Hukum
 * Besi #1); JANGAN campur naskah domain lain ke file ini (permintaan W2-TEST-A).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:7643 — aiErrorMessage
    'ai.answer-no-datang-dalam-waktu': 'Jawabannya nggak datang dalam waktu yang wajar. Periksa sambungan internetmu lalu coba lagi.',
    // app.js:7641 — aiErrorMessage
    'ai.jendela-masuk-akun-diblokir-peramban': 'Jendela masuk akun diblokir peramban. Izinkan jendela pop-up untuk situs ini, lalu coba lagi.',
    // app.js:7642 — aiErrorMessage
    'ai.masuk-akunnya-pending-finish-try': 'Masuk akunnya belum selesai. Coba lagi, ya — tinggal satu langkah.',
    // app.js:7655 — aiErrorMessage
    'ai.penjelasan-ai-nya-pending-can': 'Penjelasan AI-nya belum bisa dimuat sekarang. Ini bukan kesalahanmu — coba lagi sebentar lagi, ya.'
  });
}());
