/**
 * FIEZEL · features/i18n/copy-th-classjoin.js — เข้าชั้นเรียนด้วยรหัส (ไทย)
 * คู่ของ copy-id-classjoin.js: บอกนักเรียนว่าคำขอถูกส่งแล้ว และบอกครูว่ามีใครรออยู่
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('th', {
    'kelas.gabung-terkirim': 'บันทึกรหัสแล้ว ส่งคำขอเข้าชั้นเรียนถึงครูของคุณแล้ว — งานจะปรากฏเองเมื่อครูเพิ่มคุณเข้าชั้นเรียน',
    'kelas.gabung-kode-salah': 'รหัสไม่ถูกต้อง — รูปแบบคือ FZ-XXXXXX',
    'kelas.menunggu-persetujuan': 'รอการอนุมัติ',
    'kelas.menunggu-penjelasan': 'พวกเขากรอกรหัสของชั้นเรียนนี้ เพิ่มคนที่คุณรู้จัก ส่วนคนที่ไม่ได้เพิ่มจะไม่ได้รับงานใด ๆ',
    'kelas.gabung-diterima': 'เพิ่ม {nama} เข้า {kelas} แล้ว งานครั้งต่อไปจะถูกส่งถึงเขาด้วย',
    'kelas.tambahkan': 'เพิ่ม',
    'kelas.abaikan': 'ข้าม'
  });
})();
