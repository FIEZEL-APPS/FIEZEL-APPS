/**
 * FIEZEL · features/i18n/copy-id-worker.js — COPY-MAP INDONESIA untuk naskah yang
 * ASALNYA dari Worker.
 *
 * MENGAPA DOMAIN SENDIRI. `workers/api/route-quota.js` sudah menyatakan aturannya:
 * "Server mengirim FAKTA + `copyKey`, bukan kalimat." Rute warisan di
 * `workers/api/route-legacy.js` melanggarnya - ia mengirim kalimat Indonesia jadi, dan
 * kalimat yang lahir di server tidak pernah lewat FiezelI18n. Akibatnya bukan "teks
 * hilang" melainkan LAYAR CAMPUR: murid Thai membaca antarmuka berbahasa Thai dengan
 * jawaban AI berbahasa Indonesia di tengahnya.
 *
 * Worker kini mengirim `copyKey` DI SAMPING `text`. Klien memakai kuncinya kalau ada,
 * dan jatuh ke `text` kalau tidak - jadi klien lama tetap bekerja apa adanya.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // route-legacy.js /api/ai/chat — dipakai saat binding AI tidak tersedia
    'worker.chat.fallback': 'Halo! Saya PAW, asisten belajar FIEZEL.',
    // route-legacy.js /api/coach/context — teks bawaan sebelum model menjawab
    'worker.coach.default': 'Tetap semangat belajar! Kamu sudah membuat kemajuan yang baik.',
    // route-legacy.js /api/coach/context — dipakai saat panggilan model gagal
    'worker.coach.fallback': 'Lanjutkan latihanmu untuk memperkuat pemahaman!'
  });
}());
