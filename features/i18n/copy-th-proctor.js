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
    'proctor.kamera-aktif': 'กล้องตรวจการสอบเปิดใช้งาน',
    'proctor.wajah-peringatan': 'ตรวจไม่พบใบหน้าบนกล้องหน้า กรุณาหันหน้าเข้าหาหน้าจอ เพื่อไม่ให้ผู้คุมสอบทำเครื่องหมาย',
    'proctor.modal-judul': 'กลับมามองหน้าจอกันเถอะ!',
    'proctor.modal-pesan': 'สวัสดี! ยังตรวจไม่พบใบหน้าของคุณบนกล้องหน้า กรุณาหันหน้าเข้าหาหน้าจอ เพื่อให้การสอบของคุณเป็นไปอย่างราบรื่น',
    'proctor.modal-status': 'กำลังตรวจสอบกล้องหน้า...',
    'proctor.modal-tombol': 'ฉันมองหน้าจออยู่แล้ว',
    'proctor.wajah-kembali': 'ตรวจพบใบหน้าอีกครั้งแล้ว! ขอให้ทำข้อสอบต่อไปอย่างราบรื่น',
    'proctor.wajah-belum': 'ยังตรวจไม่พบใบหน้า กรุณาตรวจสอบแสงสว่างและหันหน้าเข้าหากล้อง',
    'proctor.wajah-tercatat': 'ตรวจไม่พบใบหน้า {vn} ครั้ง ({detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว',
    'proctor.tercatat': 'บันทึกการออกจากหน้าจอแล้ว {n} ครั้ง ({detik} วินาที) ครูของคุณได้รับบันทึกนี้แล้ว',
    'proctor.kembali-toast': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว',
    'proctor.guru-chip': 'ออกจากหน้าจอ {n} ครั้ง',
    'proctor.guru-bersih': 'ไม่ได้ออกจากหน้าจอ',
    'proctor.guru-ringkas': 'นักเรียน {jumlah} คนถูกตรวจพบว่าออกจากหน้าจอ',
    'proctor.verifikasi-kicker': 'การคุมสอบและการตรวจตรา',
    'proctor.verifikasi-judul': 'ยืนยันใบหน้าก่อนเริ่มสอบ',
    'proctor.verifikasi-desc': 'ก่อนเริ่มทำข้อสอบ กรุณาให้แน่ใจว่าใบหน้าของคุณปรากฏชัดเจนบนกล้องหน้า แสงสว่างเพียงพอ และไม่ได้สวมหน้ากาก กล้องหน้าจะคอยตรวจตราการเข้าสอบของคุณโดยอัตโนมัติ',
    'proctor.verifikasi-panduan': 'วางใบหน้าของคุณให้อยู่ในกรอบวงกลม',
    'proctor.verifikasi-liveness-panduan': 'ขั้นตอนที่ 2/2: กรุณากะพริบตาช้าๆ หรือเอียงศีรษะเล็กน้อย',
    'proctor.verifikasi-btn-mulai': 'เปิดกล้องและสแกนใบหน้า',
    'proctor.verifikasi-menghubungkan': 'กำลังเชื่อมต่อกล้อง...',
    'proctor.verifikasi-memindai': 'กำลังสแกนใบหน้า... กรุณามองที่กล้อง',
    'proctor.verifikasi-sukses': 'ยืนยันใบหน้าสำเร็จแล้ว!',
    'proctor.verifikasi-liveness-sukses': 'ยืนยันบุคคลจริงสำเร็จ',
    'proctor.verifikasi-sukses-sub': 'กล้องพร้อมดูแลความโปร่งใสของการสอบของคุณแล้ว สามารถเริ่มทำข้อสอบได้',
    'proctor.verifikasi-sukses-toast': 'ยืนยันใบหน้าสำเร็จ! กล้องพร้อมดูแลการสอบของคุณ',
    'proctor.verifikasi-btn-lanjut': 'เริ่มทำข้อสอบ',
    'proctor.verifikasi-error-info': 'ไม่สามารถเข้าถึงกล้องได้หรือไม่ได้รับอนุญาต กรุณาคลิกไอคอนการอนุญาตบนเบราว์เซอร์ แล้วลองใหม่อีกครั้ง',
    'proctor.verifikasi-btn-bypass': 'ทำข้อสอบต่อโดยไม่ใช้กล้อง (ส่งรายงานให้ครู)',
    'proctor.wajah-peringatan-ringkas': 'ใบหน้าไม่อยู่ในกล้อง!',
    'proctor.keluar-layar-slot': 'ออกจากหน้าจอ',
    'proctor.wajah-hilang-slot': 'ตรวจไม่พบใบหน้า',
    'proctor.mode-ujian-ringkas': 'เปิดโหมดสอบ',
    'proctor.keluar-ujian': 'ออกจากการสอบ',
    'proctor.keluar-ujian-judul': 'ต้องการออกจากการสอบหรือไม่?',
    'proctor.keluar-ujian-desc': 'การสอบจะสิ้นสุดลงทันทีและคุณจะไม่สามารถทำต่อได้ ยืนยันที่จะออกหรือไม่?',
    'proctor.keluar-dan-selesaikan': 'ออกและส่งข้อสอบ',
    'proctor.lanjut-ujian': 'ทำข้อสอบต่อ',
    'ujian.mode-aktif': 'โหมดสอบ: ผู้ช่วย FIEZEL ถูกปิดไว้ และถ้าคุณออกจากหน้าจอนี้ ครูของคุณจะได้รับบันทึก',
    'ujian.ai-terkunci': 'ผู้ช่วย FIEZEL ถูกปิดระหว่างการสอบ ทำด้วยความสามารถของคุณเอง แล้วผู้ช่วยจะกลับมาเมื่อสอบเสร็จ',
    'ujian.ai-terkunci-singkat': 'ปิดอยู่ระหว่างการสอบ',
    'ujian.keluar-tercatat': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที) บันทึกถูกส่งถึงครูของคุณแล้ว',
    'ujian.mode-aktif-tes-awal': 'แบบทดสอบแรก: ทำด้วยตัวเองนะ Mochi ขอพักก่อน ไม่มีคะแนนและไม่มีบทลงโทษ',
    'ujian.mode-aktif-tanpa-kelas': 'โหมดสอบ: ผู้ช่วย FIEZEL ถูกปิดไว้จนกว่าการสอบจะจบ',
    'ujian.keluar-tercatat-tanpa-kelas': 'คุณออกจากหน้าจอสอบ {n} ครั้ง (ครั้งล่าสุด {detik} วินาที)'
  });
})();
