/**
 * FIEZEL · features/i18n/copy-th-worker.js — COPY-MAP THAI, kembaran copy-id-worker.js.
 *
 * Kunci WAJIB sama persis dengan pasangannya; tests/th-coverage-test.js menemukan berkas
 * ini sendiri dari isi direktori dan menuntut kembarannya lengkap.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('th', {
    'worker.chat.fallback': 'สวัสดี! ฉันชื่อ PAW ผู้ช่วยเรียนของ FIEZEL',
    'worker.coach.default': 'ตั้งใจเรียนต่อไปนะ! เธอก้าวหน้าขึ้นมากแล้ว',
    'worker.coach.fallback': 'ฝึกต่อไปเพื่อให้เข้าใจแน่นขึ้นนะ!'
  });
}());
