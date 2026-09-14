/**
 * FIEZEL · features/i18n/copy-th-certificate.js — COPY-MAP THAI, domain sertifikat CEFR.
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum sertifikat berbahasa Thai DITERBITKAN ke murid.
 * Taruhannya di domain ini lebih tinggi daripada domain mana pun di aplikasi: naskah ini
 * ikut tercetak pada dokumen yang dibawa murid ke pemberi kerja. Kalimat penafian yang
 * salah terjemah bukan sekadar canggung — ia menghapus perlindungan yang justru jadi
 * alasan kalimat itu ada.
 *
 * Kunci 1:1 byte-identik dengan copy-id-certificate.js (dituntut tests/th-coverage-test.js).
 *
 * KANON NADA th untuk domain ini:
 *   - ภาษาทางการ (bahasa formal), bukan sapaan akrab — pembacanya HRD/panitia, bukan murid;
 *   - tanpa istilah mesin yang tidak dipakai naskah id-nya;
 *   - 'cert.disclaimer.body' dan 'cert.skill.notMeasured' TIDAK BOLEH dilunakkan saat
 *     direview: keduanya adalah perlindungan murid, bukan formalitas.
 */
(function () {
  'use strict';
  var g = (typeof self !== 'undefined') ? self
    : (typeof globalThis !== 'undefined') ? globalThis : this;
  var I18N = g && g.FiezelI18n;
  if (!I18N && typeof require === 'function') {
    try { I18N = require('./fiezel-i18n.js'); } catch (loadError) { I18N = null; }
  }
  if (!I18N) return;

  I18N.registerCopy('th', {
    /* ---- dokumen sertifikat ---------------------------------------------- */
    'cert.doc.title': 'ใบรับรองผลการประเมินภาษาอังกฤษ',
    'cert.doc.subtitle': 'ผลการประเมินแบบปรับระดับของ FIEZEL เทียบกับมาตรฐาน CEFR',
    'cert.doc.holderLabel': 'มอบให้แก่',
    'cert.doc.levelLabel': 'ระดับโดยรวม',
    'cert.doc.idLabel': 'เลขที่ใบรับรอง',
    'cert.doc.issuedLabel': 'วันที่ออก',
    'cert.doc.expiresLabel': 'ใช้ได้ถึง',
    'cert.doc.itemsLabel': 'จำนวนข้อที่ทำ',
    'cert.doc.profileLabel': 'ผลแยกตามทักษะ',

    /* ---- keterampilan ----------------------------------------------------- */
    'cert.skill.grammar': 'ไวยากรณ์',
    'cert.skill.vocabulary': 'คำศัพท์',
    'cert.skill.reading': 'การอ่าน',
    'cert.skill.listening': 'การฟัง',
    'cert.skill.speaking': 'การพูด',
    'cert.skill.notMeasured': 'ไม่ได้ประเมิน',
    'cert.skill.notMeasuredHint': 'ทักษะนี้ไม่ได้อยู่ในการประเมินครั้งนี้ จึงไม่มีผลคะแนน ไม่ได้หมายความว่าได้ศูนย์',

    /* ---- level ------------------------------------------------------------ */
    'cert.level.A1': 'A1 — เริ่มต้น',
    'cert.level.A2': 'A2 — พื้นฐาน',
    'cert.level.B1': 'B1 — ระดับกลาง',
    'cert.level.B2': 'B2 — ระดับกลางตอนปลาย',
    'cert.level.C1': 'C1 — ขั้นสูง',
    'cert.level.C2': 'C2 — เชี่ยวชาญ',

    /* ---- integritas sesi --------------------------------------------------- */
    'cert.integrity.proctored': 'การประเมินมีระบบกำกับดูแล',
    'cert.integrity.unproctored': 'การประเมินด้วยตนเอง ไม่มีผู้กำกับดูแล',
    'cert.integrity.screenExits': 'บันทึกการออกจากหน้าจอ: {count} ครั้ง',

    /* ---- verifikasi -------------------------------------------------------- */
    'cert.verify.instruction': 'ตรวจสอบความถูกต้องของใบรับรองนี้ได้ที่ {url} โดยใช้เลขที่ด้านบน',
    'cert.verify.pagePrompt': 'กรอกเลขที่ใบรับรอง',
    'cert.verify.pageHint': 'ตัวอย่าง: FZ-A234-C679',
    'cert.verify.submit': 'ตรวจสอบ',
    'cert.verify.valid': 'ใบรับรองนี้เป็นของแท้และยังใช้ได้อยู่',
    'cert.verify.expired': 'ใบรับรองนี้เป็นของแท้ แต่หมดอายุแล้วเมื่อ {date}',
    'cert.verify.revoked': 'ใบรับรองนี้ถูกเพิกถอนแล้วและใช้ไม่ได้',
    'cert.verify.notFound': 'ไม่พบเลขที่นี้ กรุณาตรวจสอบตัวอักษรที่กรอกอีกครั้ง',
    'cert.verify.malformed': 'รูปแบบเลขที่ใบรับรองไม่ถูกต้อง รูปแบบที่ถูกคือ FZ-XXXX-XXXX',

    /* ---- penolakan penerbitan ----------------------------------------------- */
    'cert.refuse.title': 'ยังออกใบรับรองให้ไม่ได้',
    'cert.refuse.tooFewItems': 'จำนวนข้อที่ทำยังไม่พอที่จะประเมินระดับได้อย่างตรงไปตรงมา กรุณาทำการประเมินให้ครบก่อน',
    'cert.refuse.tooFewSkills': 'ตอนนี้วัดได้เพียงทักษะเดียว ใบรับรองต้องมีอย่างน้อยสองทักษะเพื่อให้ระดับที่ระบุรับผิดชอบได้',
    'cert.refuse.noEvidence': 'ยังไม่มีผลการประเมินที่อ่านได้',
    'cert.refuse.noLevel': 'ผลที่ได้ยังไม่พอจะกำหนดระดับได้ ลองทำการประเมินอีกครั้งโดยไม่ต้องรีบ',

    /* ---- penafian — JANGAN DILUNAKKAN SAAT REVIEW --------------------------- */
    'cert.disclaimer.title': 'ข้อจำกัดความรับผิดชอบ',
    'cert.disclaimer.body': 'FIEZEL ไม่ใช่สถาบันประเมินที่ได้รับการรับรอง ใบรับรองนี้รายงานผลการประเมินแบบปรับระดับในแอป FIEZEL ที่เทียบกับมาตรฐาน CEFR และไม่เทียบเท่ากับ TOEFL IELTS หรือการสอบที่ได้รับการรับรองอื่นใด ผู้รับใบรับรองสามารถพิจารณาความเพียงพอได้ด้วยตนเอง',
    'cert.disclaimer.scope': 'ระดับที่ระบุไว้อ้างอิงจากทักษะที่ได้รับการประเมินจริงและแสดงอยู่ในผลแยกตามทักษะด้านบนเท่านั้น'
  });
}());
