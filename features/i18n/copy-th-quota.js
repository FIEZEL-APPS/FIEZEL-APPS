/**
 * FIEZEL · features/i18n/copy-th-quota.js — COPY-MAP THAI, naskah blok notice app.js (W3-COPY-C)
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum rilis. LEBIH DARI ITU: tests/quota-notice-a11y-test.js memasang
 * slot kanon th FAIL-CLOSED (CANON_TH_RULES=null; keberadaan berkas ini tanpa kanon th yang
 * ditulis penutur asli = gerbang MERAH, by design). Berkas ini dibuat atas penugasan
 * eksplisit W3-COPY-C; status merah gerbang itu DIHARAPKAN dan dilaporkan ke orkestrator —
 * jangan menonaktifkan gerbangnya, isi CANON_TH_RULES bersama penutur asli.
 *
 * KANON NADA th (padanan kanon id di header features/quota/quota-copy.js, rujukan nada:
 * impl/TH-STYLE.md):
 *   - bahasa Thai sehari-hari yang hangat, sudut pandang คุณ (murid) / เรา (aplikasi);
 *   - tanpa istilah mesin: เซิร์ฟเวอร์, โควตา, เอนด์พอยต์, 429, Puter, cache, token —
 *     murid nggak pernah membaca nama mesin (peramban/pop-up dipertahankan karena naskah
 *     id-nya sendiri memakai kata itu);
 *   - tanpa menyalahkan murid — padanan kanon "bukan kesalahanmu": ไม่ใช่ความผิดของคุณ;
 *   - tanpa janji hasil; mengaku masalah, tenangkan murid, tunjuk satu jalan terus.
 *
 * Kunci 1:1 byte-identik dengan copy-id-quota.js (kontrak K3 quota-notice-a11y).
 * JANGAN campur naskah domain lain ke file ini (permintaan W2-TEST-A).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    // pasangan copy-id-quota.js — jawaban AI nggak datang tepat waktu
    'ai.answer-no-datang-dalam-waktu': 'คำตอบมาไม่ทันในเวลาที่ควร เช็กสัญญาณอินเทอร์เน็ตของคุณ แล้วลองอีกครั้งนะ',
    // pasangan copy-id-quota.js — pop-up login diblokir peramban
    'ai.jendela-masuk-akun-diblokir-peramban': 'หน้าต่างเข้าสู่ระบบถูกเบราว์เซอร์กันไว้ อนุญาตหน้าต่างป็อปอัปให้เว็บนี้ แล้วลองอีกครั้งนะ',
    // pasangan copy-id-quota.js — login belum selesai
    'ai.masuk-akunnya-pending-finish-try': 'การเข้าสู่ระบบยังไม่เสร็จ ลองอีกครั้งนะ เหลืออีกแค่ขั้นตอนเดียว',
    // pasangan copy-id-quota.js — penjelasan AI belum bisa dimuat (kanon no-blame)
    'ai.penjelasan-ai-nya-pending-can': 'คำอธิบายจาก AI ยังโหลดไม่ได้ตอนนี้ ไม่ใช่ความผิดของคุณ — อีกสักครู่ค่อยลองใหม่นะ'
  });
}());
