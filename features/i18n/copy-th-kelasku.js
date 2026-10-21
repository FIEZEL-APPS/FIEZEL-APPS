/**
 * FIEZEL · features/i18n/copy-th-kelasku.js — kembaran Thai dari copy-id-kelasku.js.
 *
 * Kunci dan {placeholder}-nya sama persis dengan berkas id; tests/th-coverage-test.js
 * menemukan pasangan ini sendiri dari isi direktori dan menuntut keduanya selaras.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('th', {
    'kelasku.belum-tersambung': 'บัญชี KelasKu ยังไม่ได้เชื่อมต่อในแอปนี้',
    'kelasku.belum-masuk': 'คุณยังไม่ได้เข้าสู่ระบบ KelasKu กรุณาเข้าสู่ระบบในแอป FIEZEL ก่อน แล้วกลับมาที่หน้านี้',
    'kelasku.jembatan-mati': 'สะพานเชื่อม KelasKu ยังไม่ได้เปิดใช้งานบนเซิร์ฟเวอร์',
    'kelasku.tiket-gagal': 'ไม่สามารถรับตั๋วเข้าใช้งานจาก KelasKu ได้',
    'kelas.demo-rekam-meta': 'บันทึก 1 นาที · ประเมินโดยครูและ AI',
    'kelas.demo-selesai-meta': 'เสร็จสิ้น · คะแนน 90 (ถูก 18/20 ข้อ)',
    'kelas.soal-adaptif-bobot': 'ข้อสอบแบบปรับระดับ · น้ำหนักคะแนน 15%'
  });
})();
