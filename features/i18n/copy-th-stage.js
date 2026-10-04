/**
 * FIEZEL · features/i18n/copy-th-stage.js — COPY-MAP THAI (domain: stage).
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum dianggap final. Aturannya sama dengan copy-th-redesign.js:
 * status draft dikirim TERBUKA, karena alternatifnya bukan naskah yang lebih baik —
 * alternatifnya murid Thai membaca puluhan kalimat berbahasa Indonesia di layar panggung
 * suara (SLOT 13: laci, mesin Sarang Tabu, undangan WhatsApp, keadaan gagal).
 *
 * Kembaran dari copy-id-stage.js. Karena berkas id-nya ada, pendaftaran domain OTOMATIS di
 * tests/th-coverage-test.js menuntut berkas ini; tanpanya, murid Thai melihat layar campur.
 * WAJIB dimuat lewat fiezel-th-loader.js (bukan <script> statis di index.html), sama seperti
 * copy-th-redesign.js: murid Indonesia tidak boleh menanggung satu byte pun aset Thai.
 *
 * KONVENSI: kunci dan urutan mengikuti copy-id-stage.js satu-satu. {placeholder} WAJIB
 * identik dengan versi id — urutan katanya boleh berbeda karena tata bahasa Thai.
 */

(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N || typeof I18N.registerCopy !== 'function') return;

  I18N.registerCopy('th', {
    /* ── Kerangka laci & atribut index.html ─────────────────────────────────── */
    'stage.drawer-aria': 'เวทีเสียงสด',
    'stage.judul': 'เวทีเสียงสด',
    'stage.tutup-aria': 'ปิดเวทีเสียง',

    /* ── Identitas ruang ─────────────────────────────────────────────────────── */
    'stage.live': 'LIVE',
    'stage.ruang': 'ห้อง',
    'stage.room-belum-ada': 'ยังไม่มีห้อง',
    'stage.skor': 'คะแนน',
    'stage.buat-ruangan-dulu': 'สร้างห้องก่อน เพื่อให้เพื่อนเข้าผ่านลิงก์เชิญได้',
    'stage.system-sender': 'เวทีเสียง',
    'stage.judge-sender': 'กรรมการ FIEZEL',
    'stage.default-room-title': 'รังคำต้องห้าม',

    /* ── Panggung pembicara & kartu permainan ────────────────────────────────── */
    'stage.rekan': 'คู่หู',
    'stage.penonton': 'ผู้ชม',
    'stage.kartu-rahasia': 'การ์ดลับ',
    'stage.siap': 'พร้อม',
    'stage.tekan-mulai': 'กดเริ่มรอบ',
    'stage.belum-ada-kartu': 'ยังไม่มีการ์ดที่ใช้งาน',
    'stage.kata-terlarang': 'คำต้องห้าม',
    'stage.jelaskan-tanpa-kata-tabu': 'อธิบายโดยไม่พูดคำต้องห้าม',
    'stage.benar': 'ถูก',
    'stage.ganti': 'เปลี่ยนการ์ด',
    'stage.mulai-ronde': 'เริ่มรอบ',
    'stage.hentikan-ronde': 'หยุดรอบ',

    /* ── Obrolan juri & sistem ───────────────────────────────────────────────── */
    'stage.juri': 'กรรมการ FIEZEL',
    'stage.sambut': 'ขอให้สนุก อธิบายการ์ดให้ได้ อย่าเผลอหลุด',
    'stage.keceplosan': 'เผลอหลุด! พบคำต้องห้าม คะแนนถูกหัก',
    'stage.chat-benar': 'ตอบถูก: ',
    'stage.chat-benar-akhir': '! สำเร็จ!',

    /* ── Reaksi, suara, mikrofon ─────────────────────────────────────────────── */
    'stage.tepuk': 'ปรบมือ',
    'stage.semangat': 'สู้ ๆ',
    'stage.tawa': 'หัวเราะ',
    'stage.mikrofon': 'เปิดหรือปิดไมโครโฟน',
    'stage.mikrofon-mati': 'ปิดไมโครโฟนแล้ว',
    'stage.mikrofon-hidup': 'เปิดไมโครโฟนแล้ว',
    'stage.reaksi': 'กำลังส่งรีแอกชัน',
    'stage.sfx-ding': 'กระดิ่ง',
    'stage.sfx-buzzer': 'เสียงบัสเซอร์',
    'stage.sfx-alarm': 'สัญญาณเตือน',
    'stage.sfx-cheer': 'เสียงเชียร์',

    /* ── Undangan & kehadiran rekan ──────────────────────────────────────────── */
    'stage.undang-wa': 'แชร์คำเชิญทาง WhatsApp',
    'stage.undangan-teks': 'มาเล่นซารังตาบูบนเวทีเสียง FIEZEL กัน รหัสห้อง {kode}',
    'stage.teman': 'เพื่อน',
    'stage.teman-masuk': '{nama} เข้าร่วมเวที',
    'stage.teman-keluar': '{nama} ออกจากเวที',
    'stage.undangan-terkirim': 'เปิด WhatsApp แล้ว ลิงก์ถูกคัดลอกไว้ด้วย',
    'stage.undangan-gagal': 'เปิด WhatsApp ไม่ได้ คัดลอกลิงก์นี้: {tautan}',

    /* ── Keadaan gagal & penjelasan jujur ────────────────────────────────────── */
    'stage.modul-belum-siap': 'ฟีเจอร์เวทีเสียงยังไม่พร้อมบนอุปกรณ์นี้',
    'stage.offline': 'คุณออฟไลน์อยู่ เวทีเสียงต้องใช้การเชื่อมต่อเพื่อสร้างห้อง',
    'stage.belum-aktif': 'ฟีเจอร์เวทีเสียงยังไม่เปิดใช้สำหรับบัญชีของคุณ',
    'stage.ruang-gagal': 'ไม่พบห้อง หรือห้องสิ้นสุดแล้ว',
    'stage.ruang-gagal-buat': 'ตอนนี้สร้างห้องไม่ได้',
    'stage.tepat': 'ถูกต้อง! การ์ดถัดไปกำลังมา',
    'stage.catatan-footer': 'เสียงสื่อสารสองทางผ่าน P2P พูดสลับกันเพื่อไม่ให้ทับเสียงกัน',

    /* ── Kehadiran sosial, penonton & interaksi panggung baru ───────────── */
    'stage.kode-disalin': 'คัดลอกรหัสห้องไปยังคลิปบอร์ดแล้ว',
    'stage.menunggu-rekan': 'กำลังรอคู่หู',
    'stage.kosong': 'ว่าง',
    'stage.salin-kode': 'คัดลอกรหัสห้อง',
    'stage.keluar': 'ออก',
    'stage.pendengar': 'ผู้ฟัง',
    'stage.belum-ada-pendengar': 'ยังไม่มีผู้ชมอื่น',
    'stage.mode-penonton-info': 'คุณกำลังรับชมเกม ฟังคำใบ้โดยไม่มีคำต้องห้าม!',
    'stage.menunggu-izin': 'กำลังรอการอนุญาตจากโฮสต์...',
    'stage.minta-naik': 'ขอขึ้นเวที',
    'stage.cinta': 'ชอบ',
    'stage.catatan-footer-penonton': 'คุณอยู่ในโหมดผู้ชม ยกมือเพื่อขออนุญาตพูด',
    'stage.ajak-teman': 'ชวนเพื่อน',
    'stage.izin-bicara': 'ขออนุญาตพูด',
    'stage.catatan-footer-speaker': 'คุณกำลังพูดบนเวทีร่วมกับโฮสต์',
    'stage.ada-permintaan': '{nama} ขออนุญาตขึ้นเวที',
    'stage.promosi-berhasil': 'ตอนนี้คุณอยู่บนเวทีในฐานะผู้พูดแล้ว!',
    'stage.kembali-penonton': 'คุณกลับสู่โหมดผู้ชมแล้ว',
    'stage.permintaan-terkirim': 'ส่งคำขอพูดไปยังโฮสต์แล้ว',
    'stage.permintaan-gagal': 'ส่งคำขอพูดไม่สำเร็จ',
    'stage.permintaan-bicara': 'คำขอพูด',
    'stage.permintaan-bicara-desc': 'เลือกผู้ชมที่คุณต้องการอนุญาตให้ขึ้นเวที',
    'stage.tidak-ada-permintaan': 'ยังไม่มีคำขอพูด',
    'stage.izin-diberikan': 'อนุมัติคำขอพูดแล้ว',
    'stage.izin-ditolak': 'ปฏิเสธคำขอพูดแล้ว',
    'stage.teman-tidak-siap': 'รายชื่อเพื่อนยังไม่พร้อม',
    'stage.ajak-teman-live': 'ชวนเพื่อนขึ้นเวที',
    'stage.ajak-masuk': 'ชวนเข้าร่วม',
    'stage.belum-punya-teman': 'ยังไม่มีเพื่อนที่เชื่อมต่อ เพิ่มเพื่อนได้ที่แท็บเพื่อน!',
    'stage.mengirim': 'กำลังส่ง...',
    'stage.terkirim': 'ส่งแล้ว',
    'stage.undangan-terkirim-teman': 'ส่งคำเชิญไปยัง @{handle} แล้ว',
    'stage.gagal-kirim-undangan': 'ส่งคำเชิญไม่สำเร็จ',
    'stage.mengajak-ke-ruang': 'ชวนคุณไปที่เวที {kode}',
    'stage.nonton-langsung': 'รับชม',
    'stage.nanti': 'ไว้ทีหลัง'
  });
}());
