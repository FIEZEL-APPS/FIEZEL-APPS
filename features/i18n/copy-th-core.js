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
    'mochi-sos.conn-connecting': 'กำลังเชื่อมต่อเสียงโมจิ...',
    'mochi-sos.conn-reconnecting': 'กำลังเชื่อมต่อเสียงโมจิใหม่...',
    'mochi-sos.conn-offline': 'อินเทอร์เน็ตขาดหาย — โมจิรอสัญญาณกลับมา',
    'mochi-sos.conn-quota': 'โควตา AI เต็ม — กำลังสลับช่องทางเชื่อมต่อ...',
    'mochi-sos.conn-error': 'การเชื่อมต่อ AI ขัดข้อง — แตะเพื่อลองใหม่',
    'mochi-sos.conn-retry': 'ลองใหม่',
    'mochi-sos.silence-prompt': 'พูดคุยได้เลยนะถ้าต้องการให้โมจิช่วย',
    'mochi-sos.toggle-label': 'ความช่วยเหลือโมจิ',
    'mochi-sos.toggle-on-title': 'ผู้ช่วยเสียงโมจิเปิดอยู่ (แตะเพื่อปิด)',
    'mochi-sos.toggle-off-title': 'ผู้ช่วยเสียงโมจิปิดอยู่ (แตะเพื่อเปิด)',
    'mochi-sos.toggle-on-badge': 'Mochi ON',
    'mochi-sos.toggle-off-badge': 'Mochi OFF',
    'mochi-sos.toast-disabled': 'ปิดผู้ช่วยเสียงโมจิแล้ว',
    'mochi-sos.toast-enabled': 'เปิดผู้ช่วยเสียงโมจิแล้ว (เชื่อมต่อ 0 💎 · คิดตามเสียง AI)',
    'mochi-sos.toast-zero-audio-safe': 'ยังไม่มีเสียง AI เล่นออกมา — ใช้ 0 Gem! 💎',
    'mochi-sos.toast-session-receipt': 'จบเซสชันโมจิ: เสียงตอบกลับ {turns} ครั้ง · ใช้ไป {gems} Gem 💎',
    'mochi-sos.toast-session-free-receipt': 'จบเซสชันโมจิ: เสียงตอบกลับ {turns} ครั้ง · สิทธิ์ฟรีรายวัน (0 💎)',
    'mochi-sos.toast-out-of-gems': 'เจมไม่พอสำหรับข้อถัดไป ปิดผู้ช่วยเสียงโมจิอย่างปลอดภัยแล้ว',
    'mochi-sos.modal-free-title': 'ตัวช่วยเสียงโมจิ (โควตาฟรี)',
    'mochi-sos.modal-gem-title': 'ตัวช่วยเสียงโมจิ (คิดตามโควตาเสียง)',
    'mochi-sos.modal-free-body': 'คุณมีสิทธิ์ตัวช่วยเสียงฟรีเหลือ {remaining} ครั้งในวันนี้ ({limit} ข้อ/วัน) สิทธิ์จะถูกนับเมื่อเสียง AI ดังขึ้นจริงเท่านั้น',
    'mochi-sos.modal-gem-body': 'คิดเจมตามเสียง AI ที่ใช้งานจริง (เชื่อมต่อ/เสียงไม่ติด = 0 Gem) ยอดของคุณ: {balance} 💎',
    'mochi-sos.modal-free-btn': 'เริ่มฟรี (0 💎)',
    'mochi-sos.modal-gem-btn': 'เปิดใช้งาน (เริ่ม 0 💎)',
    'mochi-sos.modal-cancel-btn': 'ยกเลิก',
    'mochi-sos.modal-row-free-quota': 'โควตาฟรีวันนี้',
    'mochi-sos.modal-row-connect-safe': 'เชื่อมต่อ / เสียงไม่ติด',
    'mochi-sos.modal-row-connect-anti': 'เชื่อมต่อ (ป้องกันเจมเสียฟรี)',
    'mochi-sos.modal-row-opening-ai': 'อธิบายโจทย์ด้วยเสียง AI',
    'mochi-sos.modal-row-followup': 'ถามต่อ (สูงสุด {max} 💎)',
    'mochi-sos.modal-row-cashback': 'ตอบถูกในข้อนี้',
    'mochi-sos.modal-unit-questions': 'ข้อ',
    'mochi-sos.modal-confirm-title': 'ตัวช่วยเสียงโมจิ SOS',
    'mochi-sos.modal-confirm-body': 'โมจิจะช่วยวิเคราะห์โจทย์ข้อนี้สดๆ ด้วยเสียง AI Gemini Live ค่าบริการ: 10 Gem (ยอดของคุณ: {balance} 💎) โบนัสคืนเงิน: หากตอบถูกในข้อนี้ รับเงินคืน +5 Gem!',
    'mochi-sos.modal-confirm-cancel': 'ยกเลิก',
    'mochi-sos.modal-confirm-ok': 'ใช้ 10 Gem & เริ่มเลย',
    'mochi-sos.modal-insufficient-title': 'เจมไม่พอ 💎',
    'mochi-sos.modal-insufficient-body': 'คุณต้องมีอย่างน้อย 2 Gem เพื่อวิเคราะห์โจทย์ด้วยเสียง AI ของโมจิ (ยอดปัจจุบัน: {balance} 💎) ฝึกทำแบบฝึกหัดเพื่อสะสม Gem ฟรี หรือใช้สิทธิ์ฟรีรายวันในวันพรุ่งนี้!',
    'mochi-sos.modal-insufficient-btn': 'เข้าใจแล้ว',
    'mochi-sos.bubble-wrong-hint': 'ตรงนี้สับสนใช่ไหม? แตะโมจิมาช่วยกันดูประโยคนี้กันเถอะ!',
    'mochi-sos.bubble-correct-praise': 'สุดยอดเลย! วิเคราะห์ได้แม่นยำมาก! 🎉',
    'daily-reward.login-bonus-toast': 'โบนัสเข้าสู่ระบบรายวัน: ได้รับ +5 Gem! 💎',
    'daily-reward.study-10min-title': 'เป้าหมายเรียน 10 นาทีสำเร็จแล้ว! รับฟรี 20 Gem 🎉'
  });
}());
