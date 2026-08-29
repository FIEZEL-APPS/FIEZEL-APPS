/**
 * FIEZEL · features/i18n/copy-th-gems.js — COPY-MAP THAI, naskah GEMS_COPY (W3-COPY-C)
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum rilis.
 *
 * Pasangan copy-id-gems.js (W2-INT). gems-core.js terkunci sha256 (AI-02 F01) dan TIDAK
 * disentuh: overlay gemsI18nOverlay di fiezel-speaking-listening-addon.js membaca kunci
 * gems.* HANYA saat locale bukan id, jadi berkas ini yang membuat murid th melihat kalimat
 * Thai alih-alih fallback id.
 *
 * DUA KUNCI TH-ONLY (permintaan W2-INT §3/§5, sengaja TIDAK ada di copy-id-gems.js karena
 * padanan id-nya FUNGSI perakit di gems-core.js, bukan literal):
 *   - gems.chip-aria    ← chipAria(balance): teks aria chip saldo, placeholder {saldo};
 *   - gems.streak-toast ← toastFor(streak, amount): toast perayaan generik, placeholder
 *     {s} (runtun) dan {n} (jumlah gem). Angka mengikuti yang benar-benar terjadi —
 *     jangan mengarang angka di terjemahan (kontrak gems-core toastFor).
 *
 * Istilah: gems = เพชร (glosarium TH-STYLE) → nama produk Gem Terjemahan = เพชรคำแปล;
 * streak = สตรีค. Terjemahan otomatis untuk murid th mengikuti locale (target Thai), maka
 * gems.toggle-label = คำแปลภาษาไทย — keputusan draft, ikut direview penutur asli/produk.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    // pasangan gems.name
    'gems.name': 'เพชรคำแปล',
    // pasangan gems.toast-streak (varian runtun 5 verbatim copy-tour-gems §4b di id)
    'gems.toast-streak': 'สตรีค 5! ได้เพชรคำแปล +2 เม็ด จะเก็บไว้หรือใช้เลยก็ได้ตามใจคุณ',
    // pasangan gems.toggle-label — target terjemahan mengikuti locale murid (th)
    'gems.toggle-label': 'คำแปลภาษาไทย',
    // pasangan gems.empty-title
    'gems.empty-title': 'เพชรของคุณตอนนี้ยังว่างอยู่',
    // pasangan gems.empty-body
    'gems.empty-body': 'ไม่ต้องห่วง นี่ไม่ใช่กำแพงเก็บเงิน — เพชรคำแปลไม่มีขาย และจะไม่มีวันขายด้วย วิธีได้มามีทางเดียวคือการเรียน สะสมสตรีคตอบถูกไปเรื่อย ๆ แล้วเพชรจะไหลมาเอง PAW มั่นใจว่าไม่นานหรอกนะ',
    // pasangan gems.settings-title
    'gems.settings-title': 'เพชรคำแปล',
    // pasangan gems.settings-body
    'gems.settings-body': 'เพชรคำแปลคือสกุลเงินการเรียนของคุณ: ได้ฟรีทุกครั้งที่ทำสตรีคตอบถูก และใช้ปลดล็อกคำแปลอัตโนมัติในเซสชัน Listening (1 เม็ดต่อเซสชัน ต้องต่ออินเทอร์เน็ต) เพชรไม่มีขายและซื้อไม่ได้ — ทางเดียวที่จะได้มาก็คือการเรียนเท่านั้น',
    // pasangan gems.unavailable — kanon no-blame + gem nggak hangus
    'gems.unavailable': 'ยังดึงคำแปลมาไม่ได้ — ต้องต่ออินเทอร์เน็ตและตอนนี้ AI ยังให้บริการได้จำกัด เพชรของคุณไม่ถูกหักนะ',
    // pasangan gems.auto-note
    'gems.auto-note': 'คำแปลอัตโนมัติ',
    // TH-ONLY ← gems-core.js chipAria(balance)
    'gems.chip-aria': 'เพชรคำแปลของคุณ: {saldo} ได้ฟรีจากสตรีคตอบถูก ใช้สำหรับคำแปลอัตโนมัติ',
    // TH-ONLY ← gems-core.js toastFor(streak, amount) — cabang generik
    'gems.streak-toast': 'สตรีค {s}! ได้เพชรคำแปล +{n} เม็ด จะเก็บไว้หรือใช้เลยก็ได้ตามใจคุณ'
  });
}());
