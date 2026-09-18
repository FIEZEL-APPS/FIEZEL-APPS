/**
 * FIEZEL · features/i18n/copy-th-kurikulum.js — kembaran Thai dari copy-id-kurikulum.js.
 *
 * Kunci dan {placeholder}-nya sama persis dengan berkas id; tests/th-coverage-test.js
 * menemukan pasangan ini sendiri dari isi direktori dan menuntut keduanya selaras.
 *
 * "Kurikulum Merdeka" dibiarkan apa adanya: ia nama kurikulum resmi Indonesia, sama
 * seperti nama diri — menerjemahkannya justru membuatnya tidak bisa dikenali.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('th', {
    'kurikulum.semai-kicker': 'คลังหลักสูตร',
    'kurikulum.semai-judul': 'หลักสูตรภาษาอังกฤษ ชั้นปีที่ 1–12',
    'kurikulum.semai-ajakan': 'หลักสูตร Kurikulum Merdeka วิชาภาษาอังกฤษฉบับสมบูรณ์ ระยะ A–F: จุดประสงค์การเรียนรู้ 72 ข้อ สมรรถนะ 144 รายการ พร้อมสื่อการสอนและเงื่อนไขความรู้พื้นฐานที่เชื่อมระหว่างชั้นปี เพาะเพียงครั้งเดียว แล้วจะกลายเป็นคลังหลักสูตรของคุณ',
    'kurikulum.semai-tombol': 'เพาะข้อมูลเดี๋ยวนี้',
    'kurikulum.semai-ulang': 'เพาะข้อมูลอีกครั้ง',
    'kurikulum.semai-jalan': 'กำลังเพาะข้อมูล — ใช้เวลาสักครู่',
    'kurikulum.semai-sudah': 'เพาะข้อมูลแล้ว: จุดประสงค์การเรียนรู้ {tp} ข้อ สมรรถนะ {komp} รายการ สื่อการสอน {materi} รายการ',
    'kurikulum.semai-belum': 'ยังไม่ได้เพาะข้อมูล คลังหลักสูตรยังมีเพียงตัวอย่างสาธิตเท่านั้น',
    'kurikulum.semai-selesai': 'เพาะหลักสูตรภาษาอังกฤษ ชั้นปีที่ 1–12 เรียบร้อยแล้ว',
    'kurikulum.semai-gagal': 'ไม่สามารถเพาะข้อมูลหลักสูตรได้',
    'kurikulum.mapel-judul': 'วิชาอื่น ๆ — ชั้นปีที่ 1–12',
    'kurikulum.mapel-ajakan': 'สิบเจ็ดวิชาในระยะ A–F: คณิตศาสตร์ ภาษาอินโดนีเซีย วิชาปัญจศีล วิทยาศาสตร์และสังคมศึกษา ประวัติศาสตร์ วิทยาการคอมพิวเตอร์ ฟิสิกส์ เคมี ชีววิทยา เศรษฐศาสตร์ สังคมวิทยา ภูมิศาสตร์ พลศึกษา ศิลปวัฒนธรรม และงานฝีมือ จุดประสงค์การเรียนรู้ 210 ข้อ สมรรถนะ 420 รายการ พร้อมสื่อการสอนและเงื่อนไขความรู้พื้นฐานที่เชื่อมระหว่างชั้นปี',
    'kurikulum.mapel-selesai': 'เพาะข้อมูลวิชาชั้นปีที่ 1–12 เรียบร้อยแล้ว',
    'kurikulum.semai-memeriksa': 'กำลังตรวจสอบเนื้อหาในคลังหลักสูตร…'
  });
})();
