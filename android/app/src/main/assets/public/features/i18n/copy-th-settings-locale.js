/**
 * FIEZEL · features/i18n/copy-th-settings-locale.js — COPY-MAP SAKLAR BAHASA (th, W3-COPY-C)
 *
 * ⚠ DRAFT AI — nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB direview
 * penutur asli sebelum rilis.
 *
 * Pasangan copy-id-settings-locale.js (saklar bahasa m025-182, W2-STATE, AI-11 F03).
 * CATATAN OPSI (kontrak header berkas id): label opsi bahasa adalah AUTONYM — kedua nilai
 * settings.locale-opsi-* di bawah WAJIB byte-identik dengan yang di copy-id, supaya murid
 * yang tersasar ke locale yang salah tetap bisa menemukan bahasanya sendiri.
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('th', {
    'settings.locale-judul': 'ภาษาที่แสดง',
    'settings.locale-catatan': 'ภาษาของหน้าจอแอป เนื้อหาเรียนภาษาอังกฤษยังเหมือนเดิม',
    'settings.locale-toast': 'บันทึกภาษาที่แสดงแล้ว',
    // AUTONYM — byte-identik dengan copy-id-settings-locale.js, jangan diterjemahkan
    'settings.locale-opsi-id': 'Bahasa Indonesia',
    'settings.locale-opsi-th': 'ภาษาไทย'
  });
}());
