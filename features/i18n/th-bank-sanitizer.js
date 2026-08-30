(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FiezelThBankSanitizer = api;
    api.installRuntime(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var THAI_RE = /[\u0E00-\u0E7F]/;
  var RESIDUE_RE = /\b(?:agar|akan|anaknya|anjingnya|awal|bagus|balik|barunya|beli|berapa|berhati-hati|bersama|berterima\s+kasih|buat|catatan|cocok|dalam|dari|dengannya|diambil|dilakukan|ditutup|dokternya|gurunya|habiskan|hadiah|harganya|hilang|hitungan|jam|jalan|jumlahnya|kalah|kalem|kartunya|kepada|ketakutan|keinginan|kemarahan|kembali|kilo|kotak|kotak-kotak|kunjungannya|kue|lama|lamanya|langkah|lari|lebih|lomba|malam|mangga|memarahi|memikirkan|meminta|membuang-buang|menertawakan|menginginkannya|menyukainya|muat|padanya|pasar|patah|peduli|pekerjaan|pelajaran|pelan|pelari|penuh|perhatian|pernah|pertama|pesta|pecahkan|penjualnya|putaran|punya|rencanakan|ruangan|sabun|salah|sampai|saat|sebuah|sendiri|sepanjang|setelah|setengah|suka|tambahan|taman|tanam|temukan|terhadap|terbuka|tertinggal|tetap|tepat|tokonya|tua|tutup|ulang|warna|warnanya|wajah)\b/i;

  // Only mixed Thai strings are normalized. Pure-English target material is deliberately
  // untouched, and full Indonesian exam metadata is replaced separately below.
  var RULES = [
    [/\bpesta ulang tahun\b/gi, 'งานวันเกิด'],
    [/\bkue ulang tahun\b/gi, 'เค้กวันเกิด'],
    [/\bberterima kasih\b/gi, 'รู้สึกขอบคุณ'],
    [/\bmembuang-buang waktu\b/gi, 'เสียเวลา'],
    [/\bpenuh perhatian\b/gi, 'เอาใจใส่'],
    [/\bsepekan penuh\b/gi, 'ตลอดทั้งสัปดาห์'],
    [/\bhabiskan bersama\b/gi, 'ใช้เวลาด้วยกัน'],
    [/\btidak ada seorang pun\b/gi, 'ไม่มีใครเลย'],
    [/\bada seorang pun\b/gi, 'มีใครเลย'],
    [/\bpatah kaki\b/gi, 'ขาหัก'],
    [/\bkotak tambahan\b/gi, 'กล่องเพิ่มเติม'],
    [/\bwarna barunya\b/gi, 'สีใหม่ของเธอ'],
    [/\bwarna lamanya\b/gi, 'สีเดิมของเธอ'],
    [/\bkeinginan\b/gi, 'ความต้องการ'],
    [/\bpekerjaan\b/gi, 'งาน'],
    [/\bdilakukan\b/gi, 'ทำ'],
    [/\bterhadap\b/gi, 'ต่อ'],
    [/\bmenyukainya\b/gi, 'ชอบมัน'],
    [/\bmemikirkan\b/gi, 'เมื่อนึกถึง'],
    [/\bmenertawakan\b/gi, 'หัวเราะกับ'],
    [/\bmemarahi\b/gi, 'ดุ'],
    [/\bmenginginkannya\b/gi, 'ต้องการมัน'],
    [/\bberhati-hati\b/gi, 'ระมัดระวัง'],
    [/\bketakutan\b/gi, 'ความกลัว'],
    [/\bkemarahan\b/gi, 'ความโกรธ'],
    [/\btertinggal\b/gi, 'ตามไม่ทัน'],
    [/\brencanakan\b/gi, 'วางแผน'],
    [/\bpecahkan\b/gi, 'ทำแตก'],
    [/\bditutup\b/gi, 'ปิด'],
    [/\bdiambil\b/gi, 'หยิบ'],
    [/\btemukan\b/gi, 'พบ'],
    [/\bhitung(?:an)?\b/gi, 'การนับ'],
    [/\bjumlahnya\b/gi, 'จำนวน'],
    [/\bkotak-kotak\b/gi, 'กล่องต่าง ๆ'],
    [/\bpenjualnya\b/gi, 'คนขาย'],
    [/\bdokternya\b/gi, 'แพทย์'],
    [/\bgurunya\b/gi, 'ครูของเขา'],
    [/\banaknya\b/gi, 'ลูกของเขา'],
    [/\banjingnya\b/gi, 'สุนัขของเขา'],
    [/\bkartunya\b/gi, 'การ์ดนั้น'],
    [/\btokonya\b/gi, 'ร้านนั้น'],
    [/\brumahnya\b/gi, 'บ้านของเขา'],
    [/\btasnya\b/gi, 'กระเป๋าของเขา'],
    [/\bharganya\b/gi, 'ราคา'],
    [/\bwarnanya\b/gi, 'สีนั้น'],
    [/\bbarunya\b/gi, 'ใหม่'],
    [/\blamanya\b/gi, 'เดิม'],
    [/\bpadanya\b/gi, 'ต่อเขา'],
    [/\bdengannya\b/gi, 'กับเขา'],
    [/\bkepada\b/gi, 'ต่อ'],
    [/\bsepanjang\b/gi, 'ตลอด'],
    [/\bsampai\b/gi, 'จนถึง'],
    [/\bsetelah\b/gi, 'หลังจาก'],
    [/\bsebelum\b/gi, 'ก่อน'],
    [/\bsetengah\b/gi, 'ครึ่ง'],
    [/\bpertama\b/gi, 'แรก'],
    [/\bkedua\b/gi, 'ที่สอง'],
    [/\bketiga\b/gi, 'ที่สาม'],
    [/\bkeempat\b/gi, 'ที่สี่'],
    [/\bberapa\b/gi, 'กี่'],
    [/\bjam\b/gi, 'ชั่วโมง'],
    [/\bkilo\b/gi, 'กิโลกรัม'],
    [/\bwarna\b/gi, 'สี'],
    [/\bhadiah\b/gi, 'ของขวัญ'],
    [/\bwajah\b/gi, 'ใบหน้า'],
    [/\bmangga\b/gi, 'มะม่วง'],
    [/\bpasar\b/gi, 'ตลาด'],
    [/\bruangan\b/gi, 'ห้อง'],
    [/\bterbuka\b/gi, 'เปิดอยู่'],
    [/\bjaket\b/gi, 'เสื้อแจ็กเก็ต'],
    [/\bsabun\b/gi, 'สบู่'],
    [/\bcatatan\b/gi, 'บันทึก'],
    [/\bpelajaran\b/gi, 'บทเรียน'],
    [/\bkunjungannya\b/gi, 'การไปเยี่ยมของเขา'],
    [/\btaman\b/gi, 'สวน'],
    [/\bjalan\b/gi, 'ถนน'],
    [/\bputaran\b/gi, 'รอบ'],
    [/\bpelari\b/gi, 'นักวิ่ง'],
    [/\blomba\b/gi, 'การแข่งขัน'],
    [/\blari\b/gi, 'วิ่ง'],
    [/\bmalam\b/gi, 'กลางคืน'],
    [/\btua\b/gi, 'เก่า'],
    [/\bbasah\b/gi, 'เปียก'],
    [/\blangkah\b/gi, 'ขั้นตอน'],
    [/\btepat\b/gi, 'ถูกต้อง'],
    [/\bpelan\b/gi, 'ช้า'],
    [/\bawal\b/gi, 'ช่วงแรก'],
    [/\bkalem\b/gi, 'สงบ'],
    [/\bpeduli\b/gi, 'ใส่ใจ'],
    [/\bbagus\b/gi, 'ดี'],
    [/\bsalah\b/gi, 'ผิด'],
    [/\bkembali\b/gi, 'กลับมา'],
    [/\bhilang\b/gi, 'หายไป'],
    [/\bcocok\b/gi, 'ตรงกัน'],
    [/\btutup\b/gi, 'ปิด'],
    [/\btetap\b/gi, 'ยังคง'],
    [/\bsuka\b/gi, 'ชอบ'],
    [/\bpernah\b/gi, 'เคย'],
    [/\bpenuh\b/gi, 'เต็มไปด้วย'],
    [/\bmuat\b/gi, 'ใส่ได้'],
    [/\blagi\b/gi, 'อีก'],
    [/\btambahan\b/gi, 'เพิ่มเติม'],
    [/\bsendiri\b/gi, 'เอง'],
    [/\bbersama\b/gi, 'กับ'],
    [/\bdaripada\b/gi, 'กว่า'],
    [/\bagar\b/gi, 'เพื่อให้'],
    [/\bsaat\b/gi, 'เมื่อ'],
    [/\bdalam\b/gi, 'ใน'],
    [/\bdari\b/gi, 'จาก'],
    [/\bbuat\b/gi, 'ทำ'],
    [/\bbeli\b/gi, 'ซื้อ'],
    [/\btanam\b/gi, 'ปลูก'],
    [/\bkalah\b/gi, 'แพ้'],
    [/\bpunya\b/gi, 'มี'],
    [/\bmeminta\b/gi, 'ขอ'],
    [/\blebih\b/gi, 'มากกว่า'],
    [/\bakan\b/gi, 'จะ'],
    [/\bsebuah\b/gi, 'หนึ่ง'],
    [/\bkarena\b/gi, 'เพราะ'],
    [/\bdengan\b/gi, 'ด้วย'],
    [/\buntuk\b/gi, 'สำหรับ'],
    [/\byang\b/gi, 'ที่'],
    [/\btetapi\b/gi, 'แต่'],
    [/\btidak\b/gi, 'ไม่'],
    [/\bbukan\b/gi, 'ไม่ใช่'],
    [/\bharus\b/gi, 'ต้อง'],
    [/\bbisa\b/gi, 'สามารถ'],
    [/\bdapat\b/gi, 'สามารถ'],
    [/\bsudah\b/gi, 'แล้ว'],
    [/\bbelum\b/gi, 'ยังไม่'],
    [/\bsedang\b/gi, 'กำลัง'],
    [/\bsangat\b/gi, 'มาก'],
    [/\bterlalu\b/gi, 'เกินไป'],
    [/\bhanya\b/gi, 'เท่านั้น'],
    [/\bsemua\b/gi, 'ทั้งหมด'],
    [/\bbanyak\b/gi, 'มาก'],
    [/\bsedikit\b/gi, 'เล็กน้อย'],
    [/\blain\b/gi, 'อื่น'],
    [/\bsama\b/gi, 'เหมือนกัน'],
    [/\bbaru\b/gi, 'ใหม่'],
    [/\blama\b/gi, 'นาน'],
    [/\bcepat\b/gi, 'เร็ว'],
    [/\blambat\b/gi, 'ช้า'],
    [/\bdan\b/gi, 'และ'],
    [/\batau\b/gi, 'หรือ'],
    [/\bini\b/gi, 'นี้'],
    [/\bitu\b/gi, 'นั้น']
  ];

  function normalizeMixedString(value) {
    var text = String(value == null ? '' : value);
    if (!THAI_RE.test(text)) return text;
    for (var i = 0; i < RULES.length; i += 1) text = text.replace(RULES[i][0], RULES[i][1]);
    return text.replace(/\s{2,}/g, ' ').replace(/\s+([,.;!?])/g, '$1').trim();
  }

  function sanitizeTree(value) {
    if (typeof value === 'string') return normalizeMixedString(value);
    if (Array.isArray(value)) return value.map(sanitizeTree);
    if (!value || typeof value !== 'object') return value;
    var out = {};
    Object.keys(value).forEach(function (key) { out[key] = sanitizeTree(value[key]); });
    return out;
  }

  function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    ['speaking', 'listening', 'writing', 'reading', 'grammar', 'vocab'].forEach(function (key) {
      if (data[key]) data[key] = sanitizeTree(data[key]);
    });
    return data;
  }

  function findResidues(value, path, out) {
    path = path || '$';
    out = out || [];
    if (typeof value === 'string') {
      if (THAI_RE.test(value) && RESIDUE_RE.test(value)) out.push({ path: path, text: value });
      return out;
    }
    if (Array.isArray(value)) {
      value.forEach(function (row, i) { findResidues(row, path + '[' + i + ']', out); });
      return out;
    }
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { findResidues(value[key], path + '.' + key, out); });
    }
    return out;
  }

  var SPEAKING_FORMAT_NOTES = {
    ielts_speaking_part1: 'ถามตอบเรื่องตัวเองและชีวิตประจำวัน ตอบแต่ละข้อให้กระชับแต่มีรายละเอียดพอสมควร',
    ielts_speaking_part2: 'มีเวลาเตรียม 1 นาที จากนั้นพูดต่อเนื่อง 1-2 นาที และควรกล่าวถึงทุกประเด็นบนการ์ด',
    ielts_speaking_part3: 'อภิปรายประเด็นที่เป็นนามธรรมมากขึ้น โดยอธิบายเหตุผลและขยายความให้ชัดเจน',
    toefl_speaking_task1: 'เตรียม 15 วินาทีและพูด 45 วินาที ระบุจุดยืนให้ชัดเจนแล้วสนับสนุนด้วยเหตุผลและตัวอย่าง',
    toefl_speaking_task2_adapted: 'รูปแบบดัดแปลง: อ่านประกาศและบทสนทนาเป็นข้อความ แล้วสรุปความเห็นของผู้พูดพร้อมเหตุผล',
    toefl_speaking_task3_adapted: 'รูปแบบดัดแปลง: อ่านแนวคิดทางวิชาการและบทบรรยายเป็นข้อความ แล้วอธิบายแนวคิดด้วยตัวอย่างจากบทบรรยาย',
    toefl_speaking_task4_adapted: 'รูปแบบดัดแปลง: อ่านบทบรรยายเป็นข้อความ แล้วสรุปสองประเด็นหลักพร้อมตัวอย่างของแต่ละประเด็น'
  };

  var LISTENING_FORMAT_NOTES = {
    ielts_listening_s1: 'บทสนทนาในชีวิตประจำวัน มักมีการกรอกข้อมูล เสียงเล่นหนึ่งครั้งและสามารถอ่านคำถามระหว่างฟังได้',
    ielts_listening_s2: 'บทพูดเดี่ยวเกี่ยวกับสถานการณ์ในชีวิตประจำวัน เสียงเล่นหนึ่งครั้ง คำถามแผนที่บางส่วนถูกดัดแปลงเป็นคำถามตำแหน่งแบบตัวเลือก',
    ielts_listening_s3: 'การสนทนาเชิงวิชาการของผู้พูดหลายคน เสียงเล่นหนึ่งครั้ง เน้นติดตามว่าใครมีความคิดเห็นหรือข้อมูลใด',
    ielts_listening_s4: 'บทบรรยายเชิงวิชาการต่อเนื่อง เสียงเล่นหนึ่งครั้งและไม่มีการหยุดกลางทาง',
    toefl_listening_conversation: 'บทสนทนาในบริบทมหาวิทยาลัย เสียงเล่นหนึ่งครั้ง และคำถามจะแสดงหลังเสียงจบ',
    toefl_listening_lecture: 'บทบรรยายเชิงวิชาการ เสียงเล่นหนึ่งครั้ง คำถามเน้นโครงสร้าง จุดประสงค์ และรายละเอียดสนับสนุน'
  };

  var THAI_RUBRIC = {
    id: 'fiezel-speaking-rubric-v1',
    scale: { min: 0, max: 4 },
    note: 'เกณฑ์นี้ใช้เพื่อการวินิจฉัยในแอป ไม่ใช่คะแนนอย่างเป็นทางการจาก IELTS หรือ TOEFL และระบบไม่ให้คะแนนการออกเสียงอัตโนมัติ',
    criteria: [
      {
        id: 'fluency_coherence', label: 'ความคล่องแคล่วและความเชื่อมโยง', labelEn: 'Fluency and coherence',
        asks: 'คำพูดดำเนินต่อเนื่องและติดตามแนวคิดได้ง่ายหรือไม่', machineScored: false,
        why: 'ข้อความถอดเสียงไม่สามารถสะท้อนช่วงหยุด ความลังเล และการพูดซ้ำได้อย่างแม่นยำ จึงควรให้ครูหรือผู้ประเมินตรวจ',
        levels: ['ยังไม่มีคำพูดเพียงพอให้ประเมิน', 'พูดขาดช่วงมากและติดตามแนวคิดได้ยาก', 'พอติดตามได้ แต่ยังหยุดหาคำหรือเริ่มประโยคใหม่บ่อย', 'โดยรวมคล่อง มีช่วงหยุดตามธรรมชาติและเชื่อมโยงแนวคิดได้ดี', 'คล่องแคล่ว เป็นระบบ และเชื่อมโยงแนวคิดได้อย่างเป็นธรรมชาติ']
      },
      {
        id: 'lexical_resource', label: 'ความหลากหลายและความเหมาะสมของคำศัพท์', labelEn: 'Lexical resource',
        asks: 'เลือกใช้คำได้เหมาะสมและครอบคลุมประเด็นที่โจทย์ต้องการหรือไม่', machineScored: true,
        why: 'ระบบตรวจจากข้อความถอดเสียงได้ว่าประเด็นสำคัญที่โจทย์กำหนดถูกกล่าวถึงครบหรือไม่',
        levels: ['คำศัพท์ยังไม่เพียงพอที่จะสื่อความหมาย', 'ใช้คำพื้นฐานมากและมักติดขัดเมื่อหาคำ', 'เพียงพอสำหรับหัวข้อทั่วไป แต่ยังใช้คำซ้ำหรือคลาดเคลื่อนบ้าง', 'ใช้คำได้หลากหลายและเหมาะสม รวมถึงคำเฉพาะหัวข้อบางส่วน', 'ใช้คำได้ยืดหยุ่น แม่นยำ และเป็นธรรมชาติ']
      },
      {
        id: 'grammatical_range_accuracy', label: 'ความหลากหลายและความถูกต้องทางไวยากรณ์', labelEn: 'Grammatical range and accuracy',
        asks: 'โครงสร้างประโยคมีความหลากหลายและข้อผิดพลาดไม่รบกวนความหมายหรือไม่', machineScored: false,
        why: 'ระบบรู้จำเสียงอาจแก้รูปประโยคระหว่างถอดเสียง จึงไม่ควรใช้ข้อความถอดเสียงเพียงอย่างเดียวเพื่อตัดสินไวยากรณ์ของผู้เรียน',
        levels: ['ยังสร้างประโยคที่ประเมินได้ไม่เพียงพอ', 'ส่วนใหญ่เป็นประโยคสั้นรูปแบบเดียวและข้อผิดพลาดรบกวนความเข้าใจ', 'ใช้ทั้งประโยคง่ายและประโยคเชื่อม แม้ยังมีข้อผิดพลาดอยู่บ่อย', 'ใช้โครงสร้างได้หลากหลายรวมถึงประโยคซับซ้อน และส่วนใหญ่ถูกต้อง', 'ใช้โครงสร้างได้หลากหลายและควบคุมความถูกต้องได้สม่ำเสมอ']
      },
      {
        id: 'pronunciation', label: 'ความชัดเจนของการออกเสียง', labelEn: 'Pronunciation',
        asks: 'ผู้ฟังเข้าใจคำพูดได้ง่ายเพียงใด', machineScored: false,
        why: 'FIEZEL ไม่ให้คะแนนการออกเสียงอัตโนมัติ เพราะผลรู้จำเสียงอาจเปลี่ยนตามไมโครโฟน สำเนียง และเสียงรบกวน',
        levels: ['ยังไม่มีเสียงเพียงพอให้ผู้ฟังประเมิน', 'ฟังเข้าใจได้ยากในส่วนใหญ่', 'พอฟังเข้าใจได้ แต่ยังต้องใช้ความพยายาม', 'โดยรวมชัดเจน มีบางช่วงที่ยังไม่สม่ำเสมอ', 'ชัดเจน สม่ำเสมอ และจังหวะช่วยให้เข้าใจได้ง่าย']
      }
    ]
  };

  var SNAPSHOTS = typeof WeakMap === 'function' ? new WeakMap() : null;
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function isThai(root) {
    try {
      if (root.FiezelI18n && root.FiezelI18n.getLocale) return root.FiezelI18n.getLocale() === 'th';
      if (root.FiezelLocale && root.FiezelLocale.get) return String(root.FiezelLocale.get()).toLowerCase() === 'th';
    } catch (_) {}
    return !!root.FiezelThData;
  }

  function remember(repo) {
    if (!SNAPSHOTS) return null;
    var snap = SNAPSHOTS.get(repo) || {};
    if (!snap.speaking && repo.examRubric && Object.keys(repo.examFormats || {}).length) {
      snap.speaking = { honesty: repo.examHonesty, formats: clone(repo.examFormats), rubric: clone(repo.examRubric) };
    }
    if (!snap.listening && Object.keys(repo.listeningFormats || {}).length) {
      snap.listening = { honesty: repo.listeningHonesty, formats: clone(repo.listeningFormats), audioSource: clone(repo.listeningAudioSource) };
    }
    SNAPSHOTS.set(repo, snap);
    return snap;
  }

  function syncRepository(root, repo) {
    var snap = remember(repo);
    if (!snap) return;
    if (!isThai(root)) {
      if (snap.speaking) { repo.examHonesty = snap.speaking.honesty; repo.examFormats = clone(snap.speaking.formats); repo.examRubric = clone(snap.speaking.rubric); }
      if (snap.listening) { repo.listeningHonesty = snap.listening.honesty; repo.listeningFormats = clone(snap.listening.formats); repo.listeningAudioSource = clone(snap.listening.audioSource); }
      return;
    }
    if (snap.speaking) {
      repo.examHonesty = 'FIEZEL ไม่ได้คาดการณ์ Band ของ IELTS หรือคะแนน TOEFL และไม่ให้คะแนนการออกเสียงอัตโนมัติ ระบบประเมินจากข้อความถอดเสียงได้เฉพาะความครอบคลุมของแนวคิด ส่วนอื่นควรให้ครูหรือผู้ประเมินตรวจ';
      repo.examFormats = clone(snap.speaking.formats);
      Object.keys(repo.examFormats).forEach(function (key) { if (SPEAKING_FORMAT_NOTES[key]) repo.examFormats[key].note = SPEAKING_FORMAT_NOTES[key]; });
      repo.examRubric = clone(THAI_RUBRIC);
    }
    if (snap.listening) {
      repo.listeningHonesty = 'FIEZEL ไม่ได้คาดการณ์ Band ของ IELTS หรือคะแนน TOEFL เสียงฝึกสร้างจากสคริปต์ต้นฉบับด้วยระบบสังเคราะห์เสียง จึงใช้เพื่อฝึกรูปแบบคำถาม การฟังครั้งเดียว และการจดบันทึก ไม่ใช่เพื่อเลียนแบบความหลากหลายของสำเนียงในข้อสอบจริง';
      repo.listeningFormats = clone(snap.listening.formats);
      Object.keys(repo.listeningFormats).forEach(function (key) { if (LISTENING_FORMAT_NOTES[key]) repo.listeningFormats[key].note = LISTENING_FORMAT_NOTES[key]; });
      repo.listeningAudioSource = {
        kind: 'tts_original_script',
        why: 'สคริปต์และเสียงฝึกถูกสร้างขึ้นสำหรับแอปโดยเฉพาะ เพื่อไม่เผยแพร่ซ้ำสื่อข้อสอบ IELTS หรือ TOEFL ที่มีลิขสิทธิ์',
        limitation: 'บทสนทนาหลายผู้พูดอาจใช้เสียงสังเคราะห์แบบเดียวกัน หากต้องการฝึกความหลากหลายของสำเนียง ควรใช้สื่อฝึกทางการจากผู้จัดสอบร่วมด้วย'
      };
    }
  }

  function thaiExamExplain(question) {
    if (!question || typeof question !== 'object') return '';
    if (question.answerType === 'choice' && Array.isArray(question.options)) {
      var choice = question.options[Number(question.answerIndex)];
      return choice != null ? 'คำตอบที่ถูกต้องคือ “' + choice + '” โดยอ้างอิงจากข้อมูลที่ระบุไว้ในเสียง' : 'เลือกคำตอบจากข้อมูลที่ระบุไว้ในเสียง';
    }
    if (Array.isArray(question.accept) && question.accept.length) return 'คำตอบที่คาดหวังคือ “' + question.accept[0] + '” โดยตรวจจากข้อมูลที่ระบุไว้ในเสียงโดยตรง';
    return 'คำตอบนี้ตรวจจากข้อมูลที่ระบุไว้ในเสียงโดยตรง';
  }

  function installRepositoryPatch(root) {
    var Repo = root.FiezelSLAddon && root.FiezelSLAddon.__test && root.FiezelSLAddon.__test.DataRepository;
    if (!Repo || Repo.prototype.__fiezelThSanitizerInstalled) return false;
    Repo.prototype.__fiezelThSanitizerInstalled = true;

    ['loadExam', 'loadListeningExam'].forEach(function (name) {
      var native = Repo.prototype[name];
      if (typeof native !== 'function') return;
      Repo.prototype[name] = async function () {
        var result = await native.apply(this, arguments);
        syncRepository(root, this);
        return result;
      };
    });

    ['examFormat', 'listeningFormat'].forEach(function (name) {
      var native = Repo.prototype[name];
      if (typeof native !== 'function') return;
      Repo.prototype[name] = function () { syncRepository(root, this); return native.apply(this, arguments); };
    });

    var nativeFor = Repo.prototype.for;
    if (typeof nativeFor === 'function') {
      Repo.prototype.for = function () {
        syncRepository(root, this);
        var rows = nativeFor.apply(this, arguments);
        return isThai(root) ? sanitizeTree(rows) : rows;
      };
    }

    var nativeExamFor = Repo.prototype.examFor;
    if (typeof nativeExamFor === 'function') {
      Repo.prototype.examFor = function () {
        syncRepository(root, this);
        var rows = nativeExamFor.apply(this, arguments);
        return isThai(root) ? sanitizeTree(rows) : rows;
      };
    }

    var nativeListeningExamFor = Repo.prototype.listeningExamFor;
    if (typeof nativeListeningExamFor === 'function') {
      Repo.prototype.listeningExamFor = function () {
        syncRepository(root, this);
        var rows = nativeListeningExamFor.apply(this, arguments);
        if (!isThai(root)) return rows;
        return sanitizeTree(rows).map(function (set) {
          var copy = Object.assign({}, set);
          copy.questions = Array.isArray(set.questions) ? set.questions.map(function (q) {
            var qCopy = Object.assign({}, q);
            qCopy.explain = thaiExamExplain(qCopy);
            return qCopy;
          }) : set.questions;
          return copy;
        });
      };
    }
    return true;
  }

  function installRuntime(root) {
    if (!root || root.__FiezelThSanitizerBooted) return;
    root.__FiezelThSanitizerBooted = true;
    if (root.FiezelThData) sanitizeData(root.FiezelThData);
    if (installRepositoryPatch(root)) return;
    var attempts = 0;
    var timer = root.setInterval ? root.setInterval(function () {
      attempts += 1;
      if (root.FiezelThData) sanitizeData(root.FiezelThData);
      if (installRepositoryPatch(root) || attempts >= 200) root.clearInterval(timer);
    }, 50) : null;
    return timer;
  }

  return {
    normalizeMixedString: normalizeMixedString,
    sanitizeTree: sanitizeTree,
    sanitizeData: sanitizeData,
    findResidues: findResidues,
    residuePattern: RESIDUE_RE,
    installRuntime: installRuntime
  };
}));
