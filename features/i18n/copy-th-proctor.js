/**
 * FIEZEL · features/i18n/copy-th-proctor.js — ตัวตรวจจับการออกจากหน้าจอ (ไทย)
 * คู่ของ copy-id-proctor.js: บอกสิ่งที่เกิดขึ้นตามจริง ไม่กล่าวหาว่านักเรียนทุจริต
 */
(function () {
  'use strict';
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('th', {
    'proctor.aktif': 'โหมดสอบ: ถ้าคุณออกจากหน้าจอนี้ ครูของคุณจะได้รับบันทึกไว้',
    'proctor.tercatat': 'บันทึกการออกจากหน้าจอแล้ว {n} ครั้ง ({detik} วินาที) ครูของคุณได้รับบันทึกนี้แล้ว',
    'proctor.kembali-toast': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว',
    'proctor.guru-chip': 'ออกจากหน้าจอ {n} ครั้ง',
    'proctor.guru-bersih': 'ไม่ได้ออกจากหน้าจอ',
    'proctor.guru-ringkas': 'นักเรียน {jumlah} คนถูกตรวจพบว่าออกจากหน้าจอ',
    'ujian.mode-aktif': 'โหมดสอบ: ผู้ช่วย FIEZEL ถูกปิดไว้ และถ้าคุณออกจากหน้าจอนี้ ครูของคุณจะได้รับบันทึก',
    'ujian.ai-terkunci': 'ผู้ช่วย FIEZEL ถูกปิดระหว่างการสอบ ทำด้วยความสามารถของคุณเอง แล้วผู้ช่วยจะกลับมาเมื่อสอบเสร็จ',
    'ujian.ai-terkunci-singkat': 'ปิดอยู่ระหว่างการสอบ',
    'ujian.keluar-tercatat': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว'
  });
})();
