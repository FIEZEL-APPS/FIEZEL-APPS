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
    'nav.reading': 'Reading'
  });
}());
