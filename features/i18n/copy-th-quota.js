/**
 * FIEZEL · features/i18n/copy-th-quota.js — COPY-MAP THAI, naskah blok notice app.js (W3-COPY-C)
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini adalah terjemahan draft AI dan WAJIB
 * direview penutur asli sebelum rilis. LEBIH DARI ITU: quota-notice-a11y-test.js memasang
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
    'quota.reset.marker': "หลังเที่ยงคืน",
    'quota.reset.at': "เวลา {jam} น. (เวลาจาการ์ตา)",
    'quota.reset.next': "โควตาถัดไปเริ่มเวลา {jam} น. (เวลาจาการ์ตา)",
    'quota.reassurance.text': "ข้อนี้ไม่ถูกให้คะแนนและไม่ถูกล็อก",
    'quota.ok.title': "โควตาวันนี้ยังเหลืออยู่",
    'quota.ok.spoken': "ทุกอย่างยังทำงานตามปกติ",
    'quota.ok.silent': "ทุกอย่างยังทำงานตามปกติ ถ้าเสียงยังไม่ออก ข้อความก็ยังอ่านได้ตามเดิม",
    'quota.low.title': "โควตาเสียงของวันนี้ใกล้หมดแล้ว",
    'quota.low.spoken': "ยังมีเสียงตามปกติ ถ้าหมดเมื่อไร ฉันจะเปลี่ยนไปใช้เสียงสำรองของฉัน",
    'quota.low.silent': "ประโยคนี้ยังไม่มีเสียงบนเครื่องของคุณ ข้อความยังอ่านได้ และกดฟังอีกครั้งได้เสมอ",
    'quota.exhausted.title': "โควตาวันนี้หมดแล้ว",
    'quota.exhausted.spoken': "ฉันขอใช้เสียงสำรองไปก่อน บทเรียนไม่หยุดแน่นอน",
    'quota.exhausted.silent': "ตอนนี้ยังเล่นเสียงไม่ได้ ข้อความยังอยู่ครบ และโควตาจะกลับมาหลังเที่ยงคืน",
    'quota.tts.exhausted.title': "โควตาเสียงของวันนี้หมดแล้ว",
    'quota.tts.exhausted.spoken': "ฉันขอใช้เสียงสำรองสำหรับช่วงที่เหลือของครั้งนี้ เสียงจะต่างไป แต่บทเรียนยังเดินหน้าเหมือนเดิม",
    'quota.tts.exhausted.silent': "เสียงสำรองของฉันก็ยังไม่พร้อม ประโยคนี้จึงยังไม่มีเสียง ข้อความยังอ่านได้ และโควตาจะกลับมาหลังเที่ยงคืน",
    'quota.ai.exhausted.title': "โควตาถาม-ตอบของวันนี้หมดแล้ว",
    'quota.ai.exhausted.spoken': "คำอธิบายจากบทเรียนยังขึ้นอยู่ และไม่ใช้โควตาเลย การฝึกของคุณเดินหน้าต่อได้",
    'quota.ai.exhausted.silent': "คำอธิบายจากบทเรียนยังขึ้นอยู่ และไม่ใช้โควตาเลย ตอนนี้เสียงยังไม่ออก ลองอ่านข้อความไปก่อน",
    'quota.aiTranslate.exhausted.title': "โควตาคำแปลของวันนี้หมดแล้ว",
    'quota.aiTranslate.exhausted.spoken': "ความหมายของคำจากพจนานุกรมในเครื่องยังเปิดดูได้ การฝึกฟังของคุณไม่ได้รับผลกระทบ",
    'quota.aiTranslate.exhausted.silent': "ความหมายของคำจากพจนานุกรมในเครื่องยังเปิดดูได้ ตอนนี้เสียงยังไม่ออก ลองอ่านข้อความไปก่อน",
    'quota.rate.slowdown.title': "กดถี่เกินไป เว้นจังหวะสักครู่",
    'quota.rate.slowdown.spoken': "ประโยคนี้ฉันขอใช้เสียงสำรอง รอสักครู่ก่อนกดอีกครั้ง",
    'quota.rate.slowdown.silent': "ประโยคนี้ยังเล่นเสียงไม่ได้ รอสักสองสามวินาทีแล้วลองใหม่ ข้อความยังอยู่ครบ",
    'quota.concurrency.wait.title': "กำลังเตรียมประโยคก่อนหน้าอยู่",
    'quota.concurrency.wait.spoken': "ขอทำอันเมื่อกี้ให้เสร็จก่อนนะ แป๊บเดียว",
    'quota.concurrency.wait.silent': "อันเมื่อกี้ยังเตรียมไม่เสร็จ ประโยคนี้จึงยังไม่มีเสียง ระหว่างรอ ข้อความยังอ่านได้",
    'quota.payload.tooLong.title': "ประโยคยาวเกินกว่าจะอ่านรวดเดียว",
    'quota.payload.tooLong.spoken': "ฉันขออ่านบางส่วนก่อน ถ้าอยากได้ครบ ลองตัดเป็นสองท่อน",
    'quota.payload.tooLong.silent': "ประโยคยาวเกินกว่าจะเล่นรวดเดียว จึงยังไม่มีเสียง ข้อความยังอ่านได้ — ลองตัดเป็นสองท่อนแล้วลองใหม่",
    'service.degraded.title': "ระบบเสียงขอพักสักครู่",
    'service.degraded.spoken': "ขอใช้เสียงสำรองไปก่อนนะ ไม่ใช่ความผิดของคุณ และไม่มีอะไรหายไป",
    'service.degraded.silent': "ฉันยังเล่นเสียงประโยคนี้ไม่สำเร็จ ไม่ใช่ความผิดของคุณ — ข้อความยังอ่านได้ และเสียงมักกลับมาในอีกไม่กี่นาที",
    'service.providerError.title': "เตรียมเสียงไม่สำเร็จ",
    'service.providerError.spoken': "ประโยคนี้ฉันขอใช้เสียงสำรอง",
    'service.providerError.silent': "ฉันยังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และลองใหม่ได้เลยตอนนี้",
    'service.unknown.title': "ประโยคนี้ยังไม่มีเสียง",
    'service.unknown.spoken': "ฉันขอใช้เสียงสำรองไปก่อน",
    'service.unknown.silent': "ฉันยังเล่นเสียงประโยคนี้ไม่สำเร็จ ข้อความยังอ่านได้ และกดฟังอีกครั้งได้",
    'quota.unavailable.title': "ฉันยังอ่านโควตาคงเหลือของคุณไม่ได้",
    'quota.unavailable.spoken': "โควตาของคุณน่าจะยังอยู่ครบ — ที่มีปัญหาคือบันทึก ไม่ใช่ตัวคุณ ระหว่างนี้ฉันขอใช้เสียงสำรอง",
    'quota.unavailable.silent': "โควตาของคุณน่าจะยังอยู่ครบ — ที่มีปัญหาคือบันทึก ไม่ใช่ตัวคุณ ประโยคนี้ยังเล่นเสียงไม่ได้ ข้อความยังอยู่ครบ ลองใหม่อีกสักครู่",
    'network.offline.title': "เครื่องของคุณกำลังหลุดจากอินเทอร์เน็ต",
    'network.offline.spoken': "เสียงจากเครื่องของคุณยังทำงานได้ และแบบฝึกที่บันทึกไว้แล้วยังทำต่อได้",
    'network.offline.silent': "ประโยคนี้ต้องใช้อินเทอร์เน็ตจึงจะเล่นเสียงได้ ตอนนี้จึงยังไม่มีเสียง ข้อความยังอ่านได้ และโควตาของคุณไม่ถูกใช้เลย",
    'session.expired.title': "คุณต้องเข้าสู่ระบบอีกครั้งเพื่อให้ผลถูกบันทึก",
    'session.expired.spoken': "เข้าสู่ระบบอีกครั้งสักครู่นะ สิ่งที่ทำเสร็จแล้วยังปลอดภัยดี",
    'session.expired.silent': "เข้าสู่ระบบอีกครั้งสักครู่นะ สิ่งที่ทำเสร็จแล้วยังปลอดภัยดี ส่วนแบบฝึกถัดไปจะเริ่มบันทึกหลังจากคุณเข้าสู่ระบบแล้ว",
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
