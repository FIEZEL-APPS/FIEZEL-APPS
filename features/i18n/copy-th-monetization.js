/**
 * FIEZEL · features/i18n/copy-th-monetization.js — COPY-MAP THAI, naskah hak akses.
 *
 * ⚠ DRAFT AI — seluruh nilai Thai di berkas ini terjemahan draft dan WAJIB direview
 * penutur asli sebelum menagih uang kepada satu murid Thai pun. Naskah yang meminta
 * pembayaran adalah naskah dengan biaya kesalahan tertinggi: nada yang meleset sedikit
 * saja berubah dari "ajakan" menjadi "tuntutan". Status ini dilaporkan ke owner, bukan
 * disembunyikan — mengikuti preseden header copy-th-quota.js.
 *
 * Kunci byte-identik dengan copy-id-monetization.js, himpunan {placeholder} identik per
 * kunci (dituntut tests/th-coverage-test.js).
 *
 * KANON NADA th (padanan kanon id, rujukan impl/TH-STYLE.md):
 *   - bahasa Thai sehari-hari yang hangat, sudut pandang คุณ (murid) / เรา (aplikasi);
 *   - tanpa menakuti, tanpa hitungan mundur, tanpa "โอกาสสุดท้าย";
 *   - tanpa menyalahkan murid: batas ini keputusan kami — ไม่ใช่ความผิดของคุณ;
 *   - selalu tunjuk satu jalan yang masih terbuka sekarang dan gratis;
 *   - tanpa istilah mesin (โควตา, เซิร์ฟเวอร์, โทเคน); murid membaca 'สิทธิ์', 'ส่วน', 'ห้องเรียน'.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('th', {
    /* --- nama rencana ------------------------------------------------------------- */
    'akses.rencana.free.nama': 'ฟรี',
    'akses.rencana.free.ringkas': 'ฝึกได้ทุกวัน เปิดเต็มที่ในระดับ A1 และ A2',
    'akses.rencana.pro.nama': 'โปร',
    'akses.rencana.pro.ringkas': 'ฝึกได้ไม่จำกัด ตั้งแต่ A1 ถึง C2 พร้อมเสียงนิวรัล ข้อสอบจำลอง และใบรับรอง',
    'akses.rencana.sekolah.nama': 'โรงเรียน',
    'akses.rencana.sekolah.ringkas': 'ได้ทุกอย่างเหมือนโปร โดยโรงเรียนของคุณจ่ายให้ คุณไม่ต้องจ่ายอะไรเลย',

    /* --- gerbang sesi harian ------------------------------------------------------- */
    'akses.sesi.sisa': 'วันนี้เหลืออีก {sisa} รอบฝึก',
    'akses.sesi.terakhir.judul': 'นี่คือรอบฝึกสุดท้ายของวันนี้',
    'akses.sesi.terakhir.pesan': 'ทำไปตามสบายเหมือนเดิมนะ หลังจากนี้การทบทวนและบทอ่านยังเปิดอยู่ และสิทธิ์ฝึกจะกลับมาใหม่พรุ่งนี้เช้า',
    'akses.sesi.habis.judul': 'วันนี้คุณฝึกครบแล้ว',
    'akses.sesi.habis.pesan': 'คุณทำครบ {limit} รอบในวันนี้ เก่งมากเลย ตอนนี้การทบทวน บทอ่าน และงานจากคุณครูยังเปิดอยู่ ส่วนการฝึกจะกลับมาใหม่พรุ่งนี้เช้า',

    /* --- gerbang level ------------------------------------------------------------- */
    'akses.level.terkunci.judul': 'ระดับ {level} เปิดได้ด้วยโปร',
    'akses.level.terkunci.pesan': 'ระดับ A1 และ A2 ยังเปิดเต็มที่สำหรับคุณ และความก้าวหน้าของคุณตรงนั้นไม่หายไปไหน ถ้าห้องเรียนของคุณมีรหัสจากโรงเรียนแล้ว ใส่รหัสนั้นได้เลย ระดับ {level} จะเปิดตามมาโดยไม่มีค่าใช้จ่าย',

    /* --- gerbang suara -------------------------------------------------------------- */
    'akses.suara.terkunci.judul': 'เสียงนิวรัลอยู่ในโปร',
    'akses.suara.terkunci.pesan': 'ตอนนี้ประโยคยังอ่านออกเสียงได้ด้วยเสียงพื้นฐานของเครื่องคุณ ส่วนเสียงนิวรัลจะฟังเป็นธรรมชาติกว่า และดังขึ้นในเครื่องของคุณเองโดยไม่ต้องต่ออินเทอร์เน็ต',
    'akses.fitur.neuralVoice.terkunci.judul': 'เสียงนิวรัลอยู่ในโปร',
    'akses.fitur.neuralVoice.terkunci.pesan': 'ตอนนี้ประโยคยังอ่านออกเสียงได้ด้วยเสียงพื้นฐานของเครื่องคุณ ส่วนเสียงนิวรัลจะฟังเป็นธรรมชาติกว่า และดังขึ้นในเครื่องของคุณเองโดยไม่ต้องต่ออินเทอร์เน็ต',

    /* --- gerbang fitur -------------------------------------------------------------- */
    'akses.fitur.examSim.terkunci.judul': 'ข้อสอบจำลองเต็มชุดอยู่ในโปร',
    'akses.fitur.examSim.terkunci.pesan': 'ข้อสอบจำลองทำตามรูปแบบ IELTS และ TOEFL ตั้งแต่ต้นจนจบ พร้อมจับเวลาจริง ส่วนข้อสอบเลื่อนระดับของคุณยังเปิดให้ทำฟรีเหมือนเดิม',
    'akses.fitur.certificate.terkunci.judul': 'ใบรับรองอยู่ในโปร',
    'akses.fitur.certificate.terkunci.pesan': 'ใบรับรองจะระบุระดับ CEFR ของคุณพร้อมหลักฐานการทำจริง จึงแนบไปใช้ต่อได้ ส่วนบันทึกความก้าวหน้าของคุณยังเก็บไว้และเปิดดูได้ทุกเมื่อ',

    /* --- sekolah -------------------------------------------------------------------- */
    'akses.sekolah.menunggu.judul': 'กำลังตรวจสอบรหัสห้องเรียนของคุณ',
    'akses.sekolah.menunggu.pesan': 'รหัส {kode} บันทึกไว้ในเครื่องของคุณแล้ว เมื่อคุณครูอนุมัติ เนื้อหาทั้งหมดจะเปิดให้คุณโดยไม่มีค่าใช้จ่าย ระหว่างรอ ระดับ A1 และ A2 ยังทำได้ตามปกติ',
    'akses.sekolah.aktif.judul': 'สิทธิ์จากโรงเรียนใช้งานอยู่',
    'akses.sekolah.aktif.pesan': 'โรงเรียนของคุณเปิดเนื้อหา FIEZEL ทั้งหมดผ่านห้องเรียน {kode} แล้ว คุณไม่ต้องจ่ายอะไรเลย',
    'akses.sekolah.tenggang.judul': 'สิทธิ์ห้องเรียนของคุณยังใช้ได้ตามปกติ',
    'akses.sekolah.tenggang.pesan': 'โรงเรียนของคุณกำลังต่ออายุสิทธิ์อยู่ การเรียนของคุณไม่สะดุดเลย เรียนต่อได้ตามปกติ',

    /* --- harga & ajakan ------------------------------------------------------------- */
    'akses.pro.harga.bulanan': '{harga} ต่อเดือน',
    'akses.pro.harga.tahunan': '{harga} ต่อปี',
    'akses.pro.hemat': 'ประหยัดกว่าแบบรายเดือน {persen}%',
    'akses.pro.aktif.judul': 'โปรใช้งานอยู่',
    'akses.pro.aktif.pesan': 'เนื้อหาทั้งหมดเปิดให้คุณจนถึง {tanggal}',
    'akses.sekolah.harga': '{harga} ต่อห้องเรียนต่อภาคเรียน',
    'akses.cta.pro': 'ดูแพ็กโปร',
    'akses.cta.sekolah': 'ใส่รหัสห้องเรียน',
    'akses.cta.nanti': 'ไว้ก่อน'
  });
}());
