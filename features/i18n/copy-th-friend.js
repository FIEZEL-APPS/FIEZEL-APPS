/**
 * FIEZEL · features/i18n/copy-th-friend.js · COPY-MAP THAI (domain: friend).
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum dianggap final. Aturannya sama dengan copy-th-student.js:
 * status draft dikirim TERBUKA, karena alternatifnya bukan naskah yang lebih baik —
 * alternatifnya murid Thai membaca puluhan kalimat berbahasa Indonesia di layar
 * pertemanan (Kode QR, tautan masuk, permintaan teman, ajakan suara).
 *
 * Kembaran dari copy-id-friend.js. Karena berkas id-nya ada, pendaftaran domain OTOMATIS
 * di tests/th-coverage-test.js menuntut berkas ini; tanpanya, murid Thai melihat layar campur.
 * WAJIB dimuat lewat fiezel-th-loader.js (bukan <script> statis di index.html), sama seperti
 * seluruh copy-th-<domain>.js lain.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return;

  I18N.registerCopy('th', {
    /* ── Kartu ID & QR โค้ดโปรไฟล์ ─────────────────────────────────────────── */
    'social3.my-id-title': 'ID ของคุณ',
    'social3.copy-id': 'คัดลอก ID',
    'social3.copy-id-done': 'คัดลอก ID ของคุณแล้ว',
    'social3.copy-id-fail': 'คัดลอกอัตโนมัติไม่ได้ ID ของคุณ: @{handle}',
    'social3.show-qr': 'แสดง QR โค้ดของฉัน',
    'social3.qr-title': 'QR โค้ดโปรไฟล์',
    'social3.qr-desc': 'ให้เพื่อนสแกนโค้ดนี้ด้วยกล้องมือถือ แล้วคุณจะเชื่อมต่อกันทันที',
    'social3.qr-aria': 'QR โค้ดโปรไฟล์ @{handle}',
    'social3.qr-download': 'ดาวน์โหลดรูปภาพ',
    'social3.qr-share': 'แชร์ลิงก์โปรไฟล์',
    'social3.qr-share-done': 'คัดลอกลิงก์โปรไฟล์ของคุณแล้ว',
    'social3.qr-share-fail': 'แชร์อัตโนมัติไม่ได้ คัดลอกลิงก์นี้: {tautan}',
    'social3.qr-share-body': 'มาเป็นเพื่อนกันบน FIEZEL สแกนหรือเปิดลิงก์นี้:',
    'social3.qr-fail': 'ตอนนี้สร้าง QR โค้ดไม่ได้ ลองใหม่ภายหลัง',
    'social3.qr-need-profile': 'สร้าง ID ออนไลน์ก่อน เพื่อให้ QR โค้ดของคุณแสดงได้',

    /* ── สแกน QR กล้อง & อัปโหลดจากคลังภาพ ──────────────────────────────────── */
    'social3.scan-title': 'สแกน QR โค้ด',
    'social3.scan-desc': 'หันกล้องไปที่ QR โค้ดของเพื่อน หรือเลือกรูปจากคลังภาพ',
    'social3.scan-btn': 'สแกน QR',
    'social3.scan-from-gallery': 'เลือกจากคลังภาพ',
    'social3.scan-my-qr': 'QR โค้ดของฉัน',
    'social3.scan-cam-err': 'ไม่สามารถเข้าถึงกล้องหรือยังไม่ได้รับอนุญาต',
    'social3.scan-not-found': 'ไม่พบ QR โค้ดในรูปนี้ โปรดตรวจสอบว่ารูปภาพชัดเจน',
    'social3.scan-self': 'นี่คือ QR โค้ดโปรไฟล์ของคุณเอง',
    'social3.scan-invalid': 'QR โค้ดนี้ไม่ใช่ลิงก์โปรไฟล์หรือ ID เพื่อนของ FIEZEL',

    /* ── ตรวจลิงก์ขาเข้า ?friend=@handle ──────────────────────────────────── */
    'social3.link-mark': 'คำเชิญเพื่อน',
    'social3.link-title': 'เพิ่ม @{handle} เป็นเพื่อนไหม?',
    'social3.link-body': 'คุณเปิดลิงก์คำเชิญเป็นเพื่อนจาก @{handle}',
    'social3.link-send': 'ส่งคำขอ',
    'social3.link-cancel': 'ยกเลิก',
    'social3.link-sent': 'ส่งคำขอถึง @{handle} แล้ว',
    'social3.link-friends': 'คุณและ @{handle} เป็นเพื่อนกันแล้ว',
    'social3.link-fail': 'ตอนนี้ส่งคำขอไม่ได้ ลองใหม่ภายหลัง',

    /* ── กล่องคำขอเป็นเพื่อน ────────────────────────────────────────────────── */
    'social3.req-section-title': 'คำขอเป็นเพื่อนที่เข้ามา',
    'social3.req-section-desc': 'กดยอมรับเพื่อเริ่มเป็นเพื่อนกัน',
    'social3.req-none': 'ยังไม่มีคำขอที่เข้ามา',

    /* ── ชวนเล่นเสียง (เวทีเสียง SLOT 13) ──────────────────────────────────── */
    'social3.voice-ajak': 'ชวนเล่นเสียง',
    'social3.voice-ajak-title': 'ชวน @{handle} เล่นเสียงไหม?',
    'social3.voice-ajak-body': 'ระบบจะสร้างห้องเสียง แล้วเตรียมคำเชิญให้ส่ง',
    'social3.voice-ajak-send': 'สร้างและชวน',
    'social3.voice-ajak-ok': 'ห้องพร้อมแล้ว คำเชิญสำหรับ @{handle} เปิดใน WhatsApp',
    'social3.voice-ajak-fail': 'ตอนนี้สร้างห้องเสียงไม่ได้',
    'social3.voice-off': 'ฟีเจอร์เสียงยังไม่เปิดใช้สำหรับบัญชีของคุณ'
  });
}());