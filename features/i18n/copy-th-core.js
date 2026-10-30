/**
 * FIEZEL · features/i18n/copy-th-core.js — COPY-MAP THAI, domain "core" (W3-COPY-C)
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum rilis (keputusan provisional orkestrator, IMPL-BRIEF).
 *
 * ATURAN (penjelasan penuh: copy-id-core.js + impl/TH-STYLE.md):
 * 1. Kunci 1:1 byte-identik dengan copy-id-core.js — gerbang coverage menghitung pasangan,
 *   dan reuse kunci yang sudah ada di baseline emas tidak menambah literal Indonesia baru.
 * 2. Nilai Thai mengikuti persona TH-STYLE: hangat kasual-sopan, murid disapa คุณ,
 *   tanpa ครับ/ค่ะ, angka Arab, tanpa emoji.
 * 3. Placeholder bernama dan markup dipertahankan persis.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    // pasangan copy-id-core.js 'core.placement-cta'
    'core.placement-cta': 'มาดูระดับของคุณกัน',
    // pasangan copy-id-core.js 'core.auth-skip-status'
    'core.auth-skip-status': 'โอเค ไปต่อแบบไม่มีบัญชีนะ',
    // pasangan copy-id-core.js 'core.reminder-on-toast'
    'core.reminder-on-toast': 'เปิดการแจ้งเตือนการเรียนแล้ว',
    'topbar.ask': 'ถาม FIEZEL?',
    'nav.peta': 'แผนที่',
    'nav.home': 'Home',
    'nav.vocab': 'Vocab',
    'nav.grammar': 'Grammar',
    'nav.reading': 'Reading',

    // features/mascot/fiezel-mochi-voice-sos.js — Mochi Live Voice SOS Lifeline (Thai)
    'mochi-sos.bubble-tap': 'แตะฉันสิ',
    'mochi-sos.bubble-title': 'คุยสดกับโมจิเพื่อขอคำแนะนำ',
    'mochi-sos.badge-free': 'ฟรี',
    'mochi-sos.call-title': 'โมจิคอลล์',
    'mochi-sos.call-listening': 'โมจิกำลังฟังอยู่...',
    'mochi-sos.call-speaking': 'โมจิกำลังอธิบาย...',
    'mochi-sos.call-close-title': 'แตะเพื่อวางสาย',
    'mochi-sos.toast-insufficient': 'เจมไม่พอ ({balance}/{cost} 💎) ฝึกฝนต่อเพื่อสะสมเจมนะ!',
    'mochi-sos.toast-refund': 'สายสั้น: คืน {cost} เจมแล้ว 💎',
    'mochi-sos.toast-cashback': 'สุดยอด! ตอบถูก: รับเงินคืน +{reward} เจม! 🎉',
    'mochi-sos.intro-title': 'ตัวช่วยเสียงสดโมจิ! ✨',
    'mochi-sos.intro-body': 'หากสงสัยข้อไหน แตะโมจิเพื่อรับคำอธิบายเสียงแบบไม่บอกคำตอบตรงๆ ได้เลย!',
    'mochi-sos.intro-btn': 'เข้าใจแล้ว เริ่มฝึกเลย!',
    'mochi-sos.guide-rule-prefix': 'คำแนะนำจากโมจิ: ',
    'mochi-sos.guide-concept-prefix': 'ข้อนี้ทดสอบแนวคิด "{concept}" ลองดูรูปแบบคำหรือคำช่วยนะ!',
    'mochi-sos.guide-default': 'โมจิพร้อมช่วย! ลองสังเกตคำช่วยบอกเวลาหรือทิศทางในประโยคนี้นะ!',
    'mochi-sos.exam-locked': 'ทำด้วยตัวเองนะ โมจิพักผ่อนระหว่างทำแบบทดสอบจ้า!',
    'mochi-sos.greet-1': 'สวัสดี! โมจิพร้อมอยู่เป็นเพื่อนฝึกวันนี้แล้ว ถ้าสงสัยแตะฉันได้เลยนะ! ✨',
    'mochi-sos.greet-2': 'สู้ๆ! โมจิอยู่ตรงนี้ อยากได้คำใบ้เมื่อไหร่ก็แตะฉันเลย!',
    'mochi-sos.greet-3': 'เริ่มกันเลย! ถ้าอยากคุยเรื่องโจทย์ แตะฉันได้ตลอดนะ!',
    'mochi-sos.greet-listening': 'สวัสดี! รอบนี้เป็นการฟัง ตั้งใจฟังก่อนนะ ถ้าไม่ชัดค่อยแตะฉัน!',
    'mochi-sos.greet-reading': 'สวัสดี! วันนี้มีบทอ่าน อ่านสบายๆ ก่อน เจอคำยากก็แตะฉันนะ!',
    'mochi-sos.greet-vocab': 'สวัสดี! ได้เวลาคำศัพท์! เจอคำแปลกๆ แตะฉันแล้วมาคุยความหมายกัน!',
    'mochi-sos.greet-grammar': 'สวัสดี! เริ่มฝึกไวยากรณ์! สังเกตคำช่วยกับรูปกริยานะ สงสัยก็แตะฉัน!',
    'mochi-sos.greet-kanji': 'สวัสดี! รอบคันจิ! ดูรูปและเสียงช้าๆ ต้องการคำใบ้ก็แตะฉันนะ!',
    'mochi-sos.greet-build': 'สวัสดี! มาเรียงประโยคกัน! เริ่มจากประธานและคำช่วย ติดตรงไหนแตะฉัน!',
    'mochi-sos.greet-cue': 'สวัสดี! โมจิพร้อมแล้ว สงสัยก็แตะฉันนะ!',
    'mochi-sos.leak-correction': '[SYSTEM FIEZEL: คุณเกือบเฉลยคำตอบ ห้ามพูดตัวอักษรตัวเลือกหรือข้อความคำตอบที่ถูก พูดใหม่เป็นคำใบ้แบบโสเครติส 1 ประโยค]',
    'mochi-sos.connecting': 'กำลังเชื่อมต่อโมจิ...',
    'mochi-sos.silence-prompt': 'พูดคุยได้เลยนะถ้าต้องการให้โมจิช่วย'
  });
}());
