/**
 * FIEZEL · features/i18n/copy-th-bahasa.js — COPY-MAP PEMILIH BAHASA TARGET (th)
 *
 * ⚠ DRAFT AI — WAJIB DIREVIEW PENUTUR ASLI THAI, sama seperti seluruh copy-th lain.
 *
 * Pasangan satu-satu dari copy-id-bahasa.js. Yang diatur di sini adalah BAHASA YANG
 * DIPELAJARI, bukan bahasa layar — perbedaan itu harus tetap terasa dalam bahasa Thai,
 * karena murid Thai melihat kedua pilihan itu berdekatan di Pengaturan.
 *
 * Placeholder {bahasa} dipertahankan namanya persis; urutan katanya mengikuti tata bahasa
 * Thai, bukan hasil menerjemahkan kata per kata dari Indonesia.
 */
(function () {
  'use strict';
  /* Akses lewat `self`, bukan identifier telanjang: gerbang paritas (th-ui-leak-test) memuat
     berkas ini di Node dengan `self` yang disuntik, dan berkas yang menyebut FiezelI18n
     telanjang tidak terlihat olehnya — kuncinya lolos tanpa pernah dihitung. */
  var I18N = (typeof self !== 'undefined' ? self : globalThis).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;
  I18N.registerCopy('th', {
    'bahasa.judul': 'ภาษาที่กำลังเรียน',
    'bahasa.penjelasan': 'ความคืบหน้าของแต่ละภาษาแยกจากกัน การเปลี่ยนภาษาไม่ลบข้อมูลใด ๆ',
    'bahasa.en': 'ภาษาอังกฤษ',
    'bahasa.ja': 'ภาษาญี่ปุ่น',
    'bahasa.en-catatan': 'หลักสูตรครบถ้วน',
    'bahasa.ja-catatan': 'ระดับ A1/N5 · ยังเป็นฉบับร่าง',
    'bahasa.ja-peringatan': 'หลักสูตรภาษาญี่ปุ่นยังอยู่ในระยะเริ่มต้น มีเพียงระดับ A1 ยังไม่มีแบบฝึกการฟัง การพูด และการเขียน จึงซ่อนการ์ดเหล่านั้นไว้ก่อน และเนื้อหายังไม่ผ่านการตรวจโดยเจ้าของภาษา',
    'bahasa.chip-coba-ja': 'ลองเรียนภาษาญี่ปุ่น',
    'bahasa.chip-coba-ja-sub': 'ระดับ A1/N5 · ยังเป็นฉบับร่าง',
    'bahasa.chip-aktif-ja': 'กำลังเรียนภาษาญี่ปุ่น',
    'bahasa.chip-kembali-en': 'แตะเพื่อกลับไปเรียนภาษาอังกฤษ',
    'bahasa.chip-aria': 'เปลี่ยนภาษาที่กำลังเรียน',
    'bahasa.berganti': 'ตอนนี้กำลังเรียน{bahasa}'
  });
})();
