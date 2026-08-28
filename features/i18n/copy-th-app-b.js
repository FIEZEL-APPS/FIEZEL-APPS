/**
 * FIEZEL · features/i18n/copy-th-app-b.js — COPY-MAP THAI, pasangan 1:1 copy-id-app-b.js
 *
 * ⚠️ DRAFT AI — SELURUH terjemahan Thai di berkas ini adalah draf mesin dan WAJIB
 * di-review penutur asli Thai sebelum rilis (keputusan provisional orkestrator).
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01) — segmen B app.js (progress/OLM, quiz
 * SRL+burst, tutor, home coach + jam langit, settings laporan, grammar fallback, notif,
 * auth Puter, quota fallback, sys, ask) kini punya copy-map id; berkas ini melengkapi
 * locale 'th' dengan kunci IDENTIK 1:1. Persona: hangat kasual-sopan (TH-STYLE), sapaan
 * คุณ, tanpa ครับ/ค่ะ, tanpa jargon teknis (larangan โควตา dipatuhi: "jatah" → สิทธิ์),
 * tanpa emoji baru. Placeholder {nama} dipertahankan persis.
 *
 * HTML-TRUSTED (ikut copy-id-app-b.js): notif.bantuan-ditolak (<b>Allow / อนุญาต</b>)
 * dan ask.intro (<b>...</b>) dikonsumsi lewat innerHTML — markup dipertahankan persis;
 * nilai berinterpolasi dari input murid tetap di-esc() di sisi pemanggil (app.js:3954).
 * Nilai Thai TIDAK masuk himpunan literal gerbang id-golden-snapshot-test.js; kunci
 * duplikat byte-identik kunci copy-id sehingga himpunan literal tidak berubah.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    'ask.materi-terkait': 'เนื้อหาที่เกี่ยวข้อง',
    'ask.memikirkan': 'FIEZEL กำลังคิดคำตอบอยู่…',
    'auth.galat-layanan': 'ยังติดต่อบริการบัญชี Puter ไม่ได้ เช็กการเชื่อมต่อแล้วลองอีกครั้งนะ',
    'auth.galat-timeout': 'การเข้าสู่ระบบ Puter ไม่ตอบสนอง ลองเช็กหน้าต่างเข้าสู่ระบบ หรือลองอีกครั้งนะ',
    'auth.galat-unfinished': 'การเข้าสู่ระบบยังไม่เสร็จ ลองอีกครั้งนะ',
    'auth.status-dilewati': 'โอเค ไปต่อแบบไม่มีบัญชี',
    'auth.status-idle': 'ความคืบหน้าการเรียน สตรีค และ AI tutor ของคุณจะถูกเก็บไว้ในบัญชี',
    'auth.status-menghubungkan': 'กำลังเชื่อมต่อกับ Puter…',
    'auth.status-tersambung': 'เชื่อมต่อบัญชีแล้ว กำลังเปิด FIEZEL…',
    'auth.toast-lewati': 'ไปต่อแบบไม่มีบัญชี เข้าสู่ระบบได้ทุกเมื่อผ่านการตั้งค่า',
    'auth.toast-tersambung': 'เชื่อมต่อบัญชี FIEZEL แล้ว',
    'auth.tombol-lanjutkan': 'ดำเนินการต่อด้วย Puter',
    'auth.tombol-menghubungkan': 'กำลังเชื่อมต่อ…',
    'auth.tombol-tersambung': 'เชื่อมต่อแล้ว',
    'grammar.alasan-benar-fallback': 'รูปนี้เข้ากับกฎ grammar และเข้ากับบริบทของประโยคด้วย',
    'home.celestial-bulan': 'ดวงจันทร์',
    // {benda}{posisi} ditulis rapat: Thai menyambung subjek+predikat tanpa spasi
    'home.celestial-detail': '{benda}{posisi} ตำแหน่งอิงตามเวลา {pukul} บนเครื่องนี้',
    'home.celestial-label-bulan': 'เส้นทางของดวงจันทร์',
    'home.celestial-label-matahari': 'เส้นทางของดวงอาทิตย์',
    'home.celestial-matahari': 'ดวงอาทิตย์',
    'home.celestial-posisi-naik': 'กำลังขึ้นสูง',
    'home.celestial-posisi-puncak': 'อยู่ที่จุดสูงสุด',
    'home.celestial-posisi-tenggelam': 'ใกล้จะลับขอบฟ้า',
    'home.celestial-posisi-terbit': 'เพิ่งขึ้นมา',
    'home.celestial-posisi-turun': 'กำลังคล้อยต่ำลง',
    'home.celestial-status': '{benda}{posisi}',
    'notif.badan-ditolak': 'เบราว์เซอร์นี้ปฏิเสธสิทธิ์การแจ้งเตือนของ FIEZEL ไปแล้ว เลยเปิดตัวเตือนจากตรงนี้ไม่ได้ แต่การเรียนยังใช้ได้ครบทุกอย่างโดยไม่ต้องมีมัน',
    'notif.badan-unsupported': 'เบราว์เซอร์นี้ยังไม่มี Web Notifications ให้ใช้ FIEZEL เลยส่งตัวเตือนที่นี่ไม่ได้ แต่เนื้อหาและแบบฝึกหัดทั้งหมดยังใช้ได้ตามปกติ',
    'notif.bantuan-aktif': 'ปิดได้ทุกเมื่อผ่านการตั้งค่า',
    // mengutip nilai notif.tombol-nanti — jaga byte-identik dengan kunci itu
    'notif.bantuan-default': 'เลือก "ไว้ก่อน" แล้ว FIEZEL จะเปิดให้ทันที ตัวเตือนจะรออยู่ในการตั้งค่า เผื่อวันไหนต้องการ',
    // HTML-TRUSTED (<b>), konsumen innerHTML — jangan pindah ke textContent
    'notif.bantuan-ditolak': 'ถ้าวันไหนอยากเปิดใช้ เปลี่ยนสิทธิ์ของเว็บไซต์นี้เป็น <b>Allow / อนุญาต</b> ผ่านไอคอนแม่กุญแจของเบราว์เซอร์ แล้วค่อยเปิดจากการตั้งค่า',
    'notif.bantuan-nanti': 'ตัวเตือนรออยู่ในการตั้งค่านะ',
    'notif.bantuan-unsupported': 'ติดตั้ง FIEZEL เป็น PWA บนเครื่องที่รองรับการแจ้งเตือน แล้วตัวเตือนจะเปิดใช้ได้',
    'notif.status-aktif': 'เปิดตัวเตือนแล้ว ขอให้สนุกกับการเรียนนะ!',
    'notif.status-default': 'เริ่มเรียนได้เลยโดยไม่ต้องมีสิ่งนี้',
    'notif.status-ditolak': 'ไม่เป็นไรเลย - FIEZEL ยังเปิดใช้ได้ตามปกติ',
    'notif.status-nanti': 'โอเค ไปต่อแบบไม่มีตัวเตือน',
    'notif.status-unsupported': 'เบราว์เซอร์นี้ไม่มี Notification API',
    'notif.toast-aktif': 'เปิดตัวเตือนการเรียนแล้ว',
    'notif.tombol-aktif': 'ตัวเตือนเปิดอยู่',
    'notif.tombol-ingatkan': 'เตือนฉันด้วย',
    'notif.tombol-nanti': 'ไว้ก่อน',
    'notif.tombol-nonaktif': 'ตัวเตือนปิดอยู่',
    'notif.tombol-unsupported': 'ตัวเตือนใช้ไม่ได้ที่นี่',
    'progress.olm-bukti-diskon': 'จากนี้ไปเราจะให้น้ำหนักหลักฐานชิ้นนั้นเบาลงนะ',
    'progress.olm-tunggu-probe': 'ข้อเสนอนั้นกำลังถูกวัดผลใหม่อยู่ - รอผลการวัดก่อนนะ',
    'quiz.analyzing-judul': 'FIEZEL กำลังเตรียมคำอธิบายอยู่…',
    'quiz.srl-tujuan-kepegang': 'โอเค จดเป้าหมายของเซสชันนี้ไว้แล้ว',
    'quiz.srl-tujuan-lewati': 'ข้าม',
    'quiz.srl-tujuan-tanya': 'เป้าหมายของคุณในเซสชันนี้คืออะไร?',
    'settings.laporan-antrean': 'คิวการส่งกำลังทำงาน',
    'settings.laporan-hub-belum': 'ยังไม่ได้เชื่อมต่อ Creator Hub',
    'settings.laporan-menunggu-koneksi': 'กำลังรอการเชื่อมต่อ',
    'settings.laporan-privat': 'รายงานเป็นส่วนตัว',
    'settings.laporan-terkirim': 'ส่งแล้ว {tanggal}',
    'settings.laporan-terkirim-polos': 'ส่งแล้ว',
    'sys.core-belum-tersambung': 'Core Brain ยังเชื่อมต่อไม่สมบูรณ์',
    'sys.core-push-aktif': 'Core Brain + push ทำงานแล้ว',
    'sys.core-push-belum': 'Core Brain ทำงานอยู่ แต่ remote push ยังไม่เชื่อมต่อ',
    'tutor.tuntunan-eyebrow': 'ไกด์ทีละขั้น',

    // ---------- pasangan entri W2-REGEN di copy-id-app-b.js ----------
    'ask.answer-judul': 'คำตอบจาก FIEZEL',
    'ask.disclosure': 'คำถามและบริบทของเนื้อหาที่คุณเปิดอยู่จะถูกประมวลผลโดย Core AI อย่าใส่ข้อมูลส่วนตัวนะ',
    'ask.galat-judul': 'ตอนนี้ยังตอบไม่ได้',
    // HTML-TRUSTED (<b>) — contoh pertanyaan tetap mengajarkan did/do (istilah Inggris)
    'ask.intro': 'ถามอะไรก็ได้ที่ยังไม่เข้าใจ ใช้ภาษาที่คุยกันทุกวันได้เลย เช่น <b>ทำไมใช้ did ไม่ใช่ do</b> เนื้อหาที่เกี่ยวข้องจะจำกัดอยู่ที่ระดับ {level}',
    'ask.judul': 'ถาม FIEZEL',
    'ask.kirim-aria': 'ส่งคำถาม',
    'ask.minta-materi': 'ขอเนื้อหานี้',
    'ask.placeholder': 'พิมพ์คำถามของคุณ…',
    'auth.tombol-retry': 'ลองอีกครั้ง',
    // kutip tipografis “ ” dipertahankan mengikuti naskah id
    'grammar.alasan-salah-fallback': '“{pilihan}” ยังไม่ตรงกับกฎ grammar ที่กำลังทดสอบในประโยคนี้',
    'home.coach-fokus': '{ringkasan} โฟกัส: {fokus} จำนวน {jumlahSoal} ข้อ ประมาณ {menit} นาที',
    'progress.olm-ukur-ulang': 'โอเค เราจะวัด {skill} ใหม่ผ่านโจทย์ {jumlahSoal} ข้อในเซสชันถัดไปนะ',
    'quiz.burst-miss': 'ยังไม่ถูกต้อง',
    'quiz.burst-miss-sub': 'ใจเย็น ๆ เดี๋ยวเรามาแกะคำตอบกัน',
    'quiz.burst-ok': 'ถูกต้อง!',
    'quiz.burst-ok-sub': 'เยี่ยม คุณอ่านรูปแบบออกแล้ว',
    // "jatah" → สิทธิ์ (TH-STYLE melarang jargon โควตา)
    'quota.fallback-badan': 'เนื้อหา แบบฝึกหัด และความคืบหน้าของคุณยังใช้ได้ตามปกติ สิทธิ์จะกลับมาอีกครั้งหลังเที่ยงคืน',
    'quota.fallback-judul': 'สิทธิ์ของวันนี้หมดแล้ว',
    'quota.fallback-tombol': 'โอเค เรียนต่อเลย',
    'settings.laporan-siap': 'พร้อมส่งอัตโนมัติ'
  });
}());
