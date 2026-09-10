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
    'ai.penjelasan-ai-nya-pending-can': 'คำอธิบายจาก AI ยังโหลดไม่ได้ตอนนี้ ไม่ใช่ความผิดของคุณ — อีกสักครู่ค่อยลองใหม่นะ',

    /* m025-269 · NASKAH NOTICE KUOTA/SUARA MASUK COPY-MAP. Sebelum ini tabel kanon di
       features/quota/quota-copy.js dibaca LANGSUNG oleh presentQuotaNotice(), jadi murid
       th membaca ke-15 keadaan itu dalam bahasa Indonesia. Nilai id di bawah byte-identik
       dengan tabelnya — tabel itu tetap ada sebagai fallback kalau copy-map belum termuat. */
    'quota.copy.quota.ok.title': 'วันนี้ยังใช้ได้ตามปกติ',
    'quota.copy.quota.ok.spoken': 'ทุกอย่างยังทำงานตามปกติ',
    'quota.copy.quota.ok.silent': 'ทุกอย่างยังทำงานตามปกติ ถ้าเสียงยังไม่ออก คุณก็ยังอ่านข้อความได้',
    'quota.copy.quota.low.title': 'เสียงของวันนี้ใกล้ครบจำนวนแล้ว',
    'quota.copy.quota.low.spoken': 'ยังมีเสียงตามปกติ ถ้าครบจำนวนเมื่อไร เราจะเปลี่ยนไปใช้เสียงสำรอง',
    'quota.copy.quota.low.silent': 'ประโยคนี้ยังไม่มีเสียงในเครื่องของคุณ ข้อความยังอ่านได้ และกดฟังใหม่ได้เสมอ',
    'quota.copy.quota.exhausted.title': 'วันนี้ใช้ครบจำนวนแล้ว',
    'quota.copy.quota.exhausted.spoken': 'เราใช้เสียงสำรองก่อนนะ บทเรียนไม่หยุด',
    'quota.copy.quota.exhausted.silent': 'ตอนนี้ยังเล่นเสียงไม่ได้ ข้อความยังอยู่ครบ และจะใช้ได้อีกครั้งหลังเที่ยงคืน',
    'quota.copy.quota.tts.exhausted.title': 'เสียงของวันนี้ใช้ครบจำนวนแล้ว',
    'quota.copy.quota.tts.exhausted.spoken': 'เราใช้เสียงสำรองไปก่อนจนจบเซสชันนี้ เสียงจะต่างไป แต่บทเรียนยังเดินต่อ',
    'quota.copy.quota.tts.exhausted.silent': 'เสียงสำรองก็ยังไม่พร้อม ประโยคนี้จึงยังไม่มีเสียง ข้อความยังอ่านได้ และจะใช้ได้อีกครั้งหลังเที่ยงคืน',
    'quota.copy.quota.ai.exhausted.title': 'การถาม-ตอบของวันนี้ใช้ครบจำนวนแล้ว',
    'quota.copy.quota.ai.exhausted.spoken': 'คำอธิบายจากบทเรียนยังขึ้นตามปกติ และไม่นับรวมจำนวนครั้ง แบบฝึกหัดเดินต่อได้',
    'quota.copy.quota.ai.exhausted.silent': 'คำอธิบายจากบทเรียนยังขึ้นตามปกติ และไม่นับรวมจำนวนครั้ง ตอนนี้เสียงยังไม่ออก อ่านข้อความไปก่อนได้เลย',
    'quota.copy.quota.aiTranslate.exhausted.title': 'คำแปลของวันนี้ใช้ครบจำนวนแล้ว',
    'quota.copy.quota.aiTranslate.exhausted.spoken': 'ความหมายของคำจากพจนานุกรมในเครื่องยังเปิดดูได้ เซสชันการฟังของคุณไม่ได้รับผลกระทบ',
    'quota.copy.quota.aiTranslate.exhausted.silent': 'ความหมายของคำจากพจนานุกรมในเครื่องยังเปิดดูได้ ตอนนี้เสียงยังไม่ออก อ่านข้อความไปก่อนได้เลย',
    'quota.copy.quota.rate.slowdown.title': 'กดถี่เกินไป เว้นจังหวะสักนิด',
    'quota.copy.quota.rate.slowdown.spoken': 'ประโยคนี้เราใช้เสียงสำรอง รอสักครู่ก่อนกดอีกครั้ง',
    'quota.copy.quota.rate.slowdown.silent': 'ประโยคนี้ยังเล่นเสียงไม่ได้ รอสักครู่แล้วลองใหม่ — ข้อความยังอยู่',
    'quota.copy.quota.concurrency.wait.title': 'กำลังเตรียมประโยคก่อนหน้าอยู่',
    'quota.copy.quota.concurrency.wait.spoken': 'ขอทำอันเมื่อกี้ให้เสร็จก่อนนะ แป๊บเดียว',
    'quota.copy.quota.concurrency.wait.silent': 'อันเมื่อกี้ยังเตรียมไม่เสร็จ ประโยคนี้จึงยังไม่มีเสียง อ่านข้อความไปพลางก่อนได้',
    'quota.copy.quota.payload.tooLong.title': 'ประโยคยาวเกินกว่าจะอ่านรวดเดียว',
    'quota.copy.quota.payload.tooLong.spoken': 'เราอ่านให้บางส่วนก่อน ถ้าอยากได้ทั้งหมด ลองตัดเป็นสองท่อน',
    'quota.copy.quota.payload.tooLong.silent': 'ประโยคยาวเกินกว่าจะเล่นเสียงรวดเดียว จึงยังไม่มีเสียง ข้อความยังอ่านได้ — ตัดเป็นสองท่อนแล้วลองใหม่',
    'quota.copy.service.degraded.title': 'ระบบเสียงขอพักสักครู่',
    'quota.copy.service.degraded.spoken': 'ใช้เสียงสำรองก่อนนะ ไม่ใช่ความผิดของคุณ และไม่มีอะไรหายไป',
    'quota.copy.service.degraded.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ไม่ใช่ความผิดของคุณ — ข้อความยังอ่านได้ และเสียงมักกลับมาในไม่กี่นาที',
    'quota.copy.service.providerError.title': 'เตรียมเสียงไม่สำเร็จ',
    'quota.copy.service.providerError.spoken': 'ประโยคนี้เราใช้เสียงสำรอง',
    'quota.copy.service.providerError.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และลองใหม่ได้ตอนนี้เลย',
    'quota.copy.service.unknown.title': 'ประโยคนี้ยังไม่มีเสียง',
    'quota.copy.service.unknown.spoken': 'เราใช้เสียงสำรองไปก่อน',
    'quota.copy.service.unknown.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และกดฟังใหม่ได้',
    'quota.copy.quota.unavailable.title': 'เรายังอ่านจำนวนครั้งที่เหลือของคุณไม่ได้',
    'quota.copy.quota.unavailable.spoken': 'จำนวนครั้งของคุณน่าจะยังอยู่ครบ สิ่งที่มีปัญหาคือบันทึก ไม่ใช่คุณ ระหว่างนี้เราใช้เสียงสำรอง',
    'quota.copy.quota.unavailable.silent': 'จำนวนครั้งของคุณน่าจะยังอยู่ครบ สิ่งที่มีปัญหาคือบันทึก ไม่ใช่คุณ ประโยคนี้ยังเล่นเสียงไม่ได้ ข้อความยังอยู่ ลองใหม่อีกสักครู่',
    'quota.copy.network.offline.title': 'เครื่องของคุณหลุดจากอินเทอร์เน็ต',
    'quota.copy.network.offline.spoken': 'เสียงจากเครื่องของคุณยังทำงาน และแบบฝึกหัดที่บันทึกไว้แล้วยังทำต่อได้',
    'quota.copy.network.offline.silent': 'ประโยคนี้ต้องใช้อินเทอร์เน็ตจึงจะมีเสียง ตอนนี้จึงยังไม่มี ข้อความยังอ่านได้ และไม่ถูกนับจำนวนครั้งเลย',
    'quota.copy.session.expired.title': 'คุณต้องเข้าสู่ระบบอีกครั้ง ผลของคุณจึงจะถูกบันทึก',
    'quota.copy.session.expired.spoken': 'เข้าสู่ระบบอีกครั้งสักครู่นะ สิ่งที่ทำเสร็จแล้วยังปลอดภัย',
    'quota.copy.session.expired.silent': 'เข้าสู่ระบบอีกครั้งสักครู่นะ สิ่งที่ทำเสร็จแล้วยังปลอดภัย และแบบฝึกหัดถัดไปจะถูกบันทึกหลังคุณเข้าสู่ระบบ',
    'quota.copy.reassurance': 'ข้อนี้ไม่ถูกให้คะแนนและไม่ถูกล็อก',
    'quota.copy.reset-marker': 'หลังเที่ยงคืน',
    'quota.copy.reset-inline': 'เวลา {jam} น.',
    'quota.copy.reset-tail': ' เริ่มใช้ได้อีกครั้งเวลา {jam} น.',

    /* m025-269 · cermin naskah notice di zona suara (fiezel-cf-voice-notice.js). Nilai id
       byte-identik dengan tabel bekunya; tabel itu tetap menjadi cadangan fail-soft. */
    'voice.notice.quota.tts.exhausted.title': 'เสียงของวันนี้ใช้ครบจำนวนแล้ว',
    'voice.notice.quota.tts.exhausted.spoken': 'เราใช้เสียงสำรองไปก่อนจนจบเซสชันนี้ เสียงจะต่างไป แต่บทเรียนยังเดินต่อ',
    'voice.notice.quota.tts.exhausted.silent': 'เครื่องนี้ยังไม่มีเสียงสำรองเช่นกัน ประโยคนี้จึงยังเล่นเสียงไม่ได้ ข้อความยังอ่านได้ และจะใช้ได้อีกครั้งหลังเที่ยงคืน',
    'voice.notice.quota.exhausted.title': 'วันนี้ใช้ครบจำนวนแล้ว',
    'voice.notice.quota.exhausted.spoken': 'เราใช้เสียงสำรองก่อนนะ บทเรียนยังเดินต่อ',
    'voice.notice.quota.exhausted.silent': 'ตอนนี้ยังเล่นเสียงไม่ได้ ข้อความยังอยู่ครบ และจะใช้ได้อีกครั้งหลังเที่ยงคืน',
    'voice.notice.quota.low.title': 'เสียงของวันนี้ใกล้ครบจำนวนแล้ว',
    'voice.notice.quota.low.spoken': 'ยังมีเสียงตามปกติ ถ้าครบจำนวนเมื่อไร เราจะเปลี่ยนไปใช้เสียงสำรอง',
    'voice.notice.quota.low.silent': 'ประโยคนี้ยังไม่มีเสียง ข้อความยังอ่านได้',
    'voice.notice.quota.rate.slowdown.title': 'กดถี่เกินไป',
    'voice.notice.quota.rate.slowdown.spoken': 'ประโยคนี้เราใช้เสียงสำรอง รอสักครู่ก่อนกดอีกครั้ง',
    'voice.notice.quota.rate.slowdown.silent': 'ประโยคนี้ยังเล่นเสียงไม่ได้ รอสักครู่แล้วลองใหม่ — ข้อความยังอยู่',
    'voice.notice.service.degraded.title': 'ระบบเสียงขอพักสักครู่',
    'voice.notice.service.degraded.spoken': 'ใช้เสียงสำรองก่อนนะ ไม่ใช่ความผิดของคุณ และไม่มีอะไรหายไป',
    'voice.notice.service.degraded.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ไม่ใช่ความผิดของคุณ — ข้อความยังอ่านได้ และเสียงมักกลับมาในไม่กี่นาที',
    'voice.notice.service.providerError.title': 'เตรียมเสียงไม่สำเร็จ',
    'voice.notice.service.providerError.spoken': 'ประโยคนี้เราใช้เสียงสำรอง',
    'voice.notice.service.providerError.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และลองใหม่ได้ตอนนี้เลย',
    'voice.notice.service.unknown.title': 'ประโยคนี้ยังไม่มีเสียง',
    'voice.notice.service.unknown.spoken': 'เราใช้เสียงสำรองไปก่อน',
    'voice.notice.service.unknown.silent': 'เรายังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และกดฟังใหม่ได้',
    'voice.notice.reassurance': 'ข้อนี้ไม่ถูกให้คะแนนและไม่ถูกล็อก',
    'voice.notice.reset-tail': ' เริ่มใช้ได้อีกครั้งเวลา {jam} น.',
    'voice.notice.reset-marker': 'หลังเที่ยงคืน',
    'voice.notice.reset-inline': 'เวลา {jam} น.'
  });
}());
