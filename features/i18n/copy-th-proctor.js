/**
 * FIEZEL · features/i18n/copy-th-proctor.js — ตัวตรวจจับการออกจากหน้าจอ (ไทย)
 * คู่ของ copy-id-proctor.js: บอกสิ่งที่เกิดขึ้นตามจริง ไม่กล่าวหาว่านักเรียนทุจริต
 */
(function () {
  'use strict';
  if (typeof FiezelI18n === 'undefined' || !FiezelI18n || typeof FiezelI18n.registerCopy !== 'function') return;
  FiezelI18n.registerCopy('th', {
    'proctor.aktif': 'โหมดสอบ: ถ้าคุณออกจากหน้าจอนี้ ครูของคุณจะได้รับบันทึกไว้',
    'proctor.tercatat': 'บันทึกการออกจากหน้าจอแล้ว {n} ครั้ง ({detik} วินาที) ครูของคุณได้รับบันทึกนี้แล้ว',
    'proctor.kembali-toast': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว',
    'proctor.guru-chip': 'ออกจากหน้าจอ {n} ครั้ง',
    'proctor.guru-bersih': 'ไม่ได้ออกจากหน้าจอ',
    'proctor.guru-ringkas': 'นักเรียน {jumlah} คนถูกตรวจพบว่าออกจากหน้าจอ'
  });
})();
