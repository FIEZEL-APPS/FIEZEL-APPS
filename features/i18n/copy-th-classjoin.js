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
    'kelas.abaikan': 'ข้าม',
    'kelas.kurikulum-merdeka': 'หลักสูตรและการเรียนรู้เชิงรุก',
    'kelas.misi-adaptif': 'ภารกิจปรับตัว',
    'kelas.misi-belajar-judul': 'ภารกิจการเรียนรู้และพาสปอร์ตทักษะ',
    'kelas.misi-belajar-desc': 'เส้นทางการเรียนรู้ตามเป้าหมาย: มีเป้าหมายชัดเจน วินิจฉัยข้อผิดพลาดอัตโนมัติ และบันทึกหลักฐานความเชี่ยวชาญ',
    'kelas.buka-misi': 'เปิดภารกิจการเรียนรู้',
    'kelas.paspor-belajar': 'พาสปอร์ตการเรียนรู้',
    'kelas.misi-kurikulum-link': 'ภารกิจหลักสูตรและพาสปอร์ต',
    'kelas.misi-kurikulum-sub': 'เป้าหมายทักษะระดับมัธยมและพาสปอร์ตการเรียนรู้',
    'kelas.kembali-kelasku': '‹ กลับไปยัง KelasKu',
    'kelas.kembali-kelasku-app': '‹ กลับไปยัง KelasKu ในแอป FIEZEL',
    'kelas.papan-kelas': 'กระดานชั้นเรียน',
    'kelas.papan-minggu-ini': 'สัปดาห์นี้',
    'kelas.kamu-badge': '(คุณ)',
    'kelas.skor-xp': 'XP',
    'kelas.peringkat-kamu': 'อันดับของคุณ: ที่ {rank} จากนักเรียน {total} คน',
    'kelas.papan-kosong': 'ยังไม่มีข้อมูลอันดับสำหรับสัปดาห์นี้',
    'kelas.wali-kelas': 'ครูประจำชั้น',
    'kelas.pengumuman-tugas-fokus': 'สัปดาห์นี้เน้นเรื่อง {judul} นะ ทำก่อนครบกำหนด',
    'kelas.sapaan-default': 'ยินดีต้อนรับสู่ {kelas}! ฝึกฝนและสะสมหลักฐานการเรียนรู้ทุกสัปดาห์',
    'kelas.misi-belajar-tab': 'ภารกิจการเรียนรู้',
    'kelas.paspor-kompetensi-tab': 'พาสปอร์ตทักษะ',
    'kelas.mulai-misi': 'เริ่มภารกิจ',
    'kelas.tuntas': 'เชี่ยวชาญแล้ว',
    'kelas.perlu-latihan': 'ต้องฝึกฝนเพิ่ม',
    'kelas.belum-mulai': 'ยังไม่ได้เริ่ม',
    'kelas.bab-dikuasai': 'บทเรียนที่เชี่ยวชาญ',
    'kelas.fase-semua': 'ทุกช่วงชั้น',
    'kelas.perlu-dikerjakan': 'ที่ต้องทำ',
    'kelas.soal-count': '{n} ข้อ',
    'kelas.akurasi-rata': 'ความแม่นยำเฉลี่ย',
    'kelas.total-soal-tuntas': 'ข้อที่ทำเสร็จทั้งหมด',
    'kelas.ulangi-misi': 'ทำภารกิจซ้ำ'
  });
})();
