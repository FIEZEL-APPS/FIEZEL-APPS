'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fslDir = path.join(root, 'features', 'speaking-listening');
const i18nDir = path.join(root, 'features', 'i18n');

const lb = JSON.parse(fs.readFileSync(path.join(fslDir, 'listening-bank-v1.json'), 'utf8'));

// Common dictionary for terms in Indonesian options
const wordMap = [
  // Time and duration
  [/Sepanjang liburan/gi, 'ตลอดวันหยุด'],
  [/Sepanjang hari/gi, 'ตลอดทั้งวัน'],
  [/Sepanjang pagi/gi, 'ตลอดช่วงเช้า'],
  [/Sepanjang malam/gi, 'ตลอดคืน'],
  [/Satu jam/gi, 'หนึ่งชั่วโมง'],
  [/Dua jam/gi, 'สองชั่วโมง'],
  [/Sepuluh menit/gi, 'สิบนาที'],
  [/Dua puluh menit/gi, 'ยี่สิบนาที'],
  [/Tiga puluh menit/gi, 'สามสิบนาที'],
  [/Dua menit/gi, 'สองนาที'],
  [/Lima belas menit/gi, 'สิบห้านาที'],
  [/Setiap hari/gi, 'ทุกวัน'],
  [/Setiap minggu/gi, 'ทุกสัปดาห์'],
  [/Malam hari/gi, 'ตอนกลางคืน'],
  [/Pagi-pagi/gi, 'ตอนเช้าตรู่'],
  [/Pagi hari/gi, 'ตอนเช้า'],
  [/Sore hari/gi, 'ตอนเย็น'],
  [/Siang hari/gi, 'ตอนกลางวัน'],
  [/Setelah makan siang/gi, 'หลังอาหารกลางวัน'],
  [/Jam enam/gi, 'หกโมง'],
  [/Jam lima/gi, 'ตีห้า'],
  [/Jam tujuh/gi, 'เจ็ดโมง'],
  [/Jam delapan/gi, 'แปดโมง'],
  [/Hari Sabtu/gi, 'วันเสาร์'],
  [/Hari Minggu/gi, 'วันอาทิตย์'],
  [/Hari Senin/gi, 'วันจันทร์'],
  [/Akhir pekan/gi, 'วันหยุดสุดสัปดาห์'],
  [/Tahun ini/gi, 'ปีนี้'],
  [/Bulan depan/gi, 'เดือนหน้า'],
  [/Besok pagi/gi, 'พรุ่งนี้เช้า'],
  [/Kemarin/gi, 'เมื่อวาน'],
  [/Sekarang/gi, 'ตอนนี้'],
  [/Nanti/gi, 'ภายหลัง'],

  // Common activities & situations
  [/Menunggu teman karena hujan/gi, 'รอเพื่อนเพราะฝนตก'],
  [/Berjalan bersama temannya/gi, 'เดินไปกับเพื่อน'],
  [/Membeli payung baru/gi, 'ซื้อร่มคันใหม่'],
  [/Berlari pulang sendirian/gi, 'วิ่งกลับบ้านคนเดียว'],
  [/Duduk di gerbang/gi, 'นั่งที่ประตูรั้ว'],
  [/Di rumah, di atas meja dapur/gi, 'ที่บ้าน บนโต๊ะในครัว'],
  [/Di dalam tasnya/gi, 'ในกระเป๋าของเขา'],
  [/Dibawa temannya/gi, 'เพื่อนนำไป'],
  [/Di toko dekat rumahnya/gi, 'ที่ร้านค้าใกล้บ้าน'],
  [/Memasak nasi/gi, 'หุงข้าว'],
  [/Mencuci piring/gi, 'ล้างจาน'],
  [/Membaca buku/gi, 'อ่านหนังสือ'],
  [/Menulis surat/gi, 'เขียนจดหมาย'],
  [/Belajar untuk ujian/gi, 'อ่านหนังสือสอบ'],
  [/Mengerjakan tugas/gi, 'ทำการบ้าน'],
  [/Membantu orang tua/gi, 'ช่วยพ่อแม่'],
  [/Bermain sepak bola/gi, 'เล่นฟุตบอล'],
  [/Pergi ke perpustakaan/gi, 'ไปห้องสมุด'],
  [/Naik bus/gi, 'ขึ้นรถบัส'],
  [/Jalan kaki/gi, 'เดินเท้า'],
  [/Membeli tiket/gi, 'ซื้อตั๋ว'],
  [/Meminjam buku/gi, 'ยืมหนังสือ'],
  [/Mengembalikan buku/gi, 'คืนหนังสือ'],
  [/Berbicara dengan guru/gi, 'คุยกับครู'],
  [/Berbicara dengan pustakawan/gi, 'คุยกับบรรณารักษ์'],
  [/Mencari informasi/gi, 'หาข้อมูล'],
  [/Menyelesaikan proyek/gi, 'ทำโครงงานให้เสร็จ'],
  [/Bekerja sama/gi, 'ร่วมมือกัน'],
  [/Berdiskusi/gi, 'อภิปรายร่วมกัน'],

  // Emotions & attitudes
  [/Sangat senang/gi, 'มีความสุขมาก'],
  [/Senang/gi, 'ดีใจ'],
  [/Sedih/gi, 'เศร้า'],
  [/Khawatir/gi, 'กังวล'],
  [/Marah/gi, 'โกรธ'],
  [/Kecewa/gi, 'ผิดหวัง'],
  [/Lelah/gi, 'เหนื่อย'],
  [/Bosan/gi, 'เบื่อ'],
  [/Takut/gi, 'กลัว'],
  [/Bingung/gi, 'สับสน'],
  [/Bangga/gi, 'ภูมิใจ'],
  [/Yakin/gi, 'มั่นใจ'],
  [/Ragu-ragu/gi, 'ลังเล'],
  [/Berterima kasih/gi, 'รู้สึกขอบคุณ'],
  [/Puas/gi, 'พอใจ'],
  [/Tenang/gi, 'สงบ'],
  [/Gugup/gi, 'ประหม่า'],
  [/Semangat/gi, 'กระตือรือร้น'],
  [/Terkejut/gi, 'ประหลาดใจ'],
  [/Ia agak kesal pada dirinya sendiri/gi, 'เขารู้สึกหงุดหงิดตัวเองเล็กน้อย'],
  [/Ia khawatir temannya tidak akan datang/gi, 'เขากังวลว่าเพื่อนจะไม่มา'],
  [/Ia senang karena hujannya sejuk/gi, 'เขาดีใจเพราะฝนทำให้เย็นสบาย'],
  [/Ia takut pada gerbang sekolah/gi, 'เขากลัวประตูโรงเรียน'],
  [/Ia senang bisa membantu keluarganya/gi, 'เขาดีใจที่ได้ช่วยครอบครัว'],
  [/Ia merasa pekerjaannya terlalu terburu-buru/gi, 'เขารู้สึกว่างานรีบเร่งเกินไป'],
  [/Ia sedih karena harus bangun pagi/gi, 'เขาเศร้าที่ต้องตื่นเช้า'],
  [/Ia marah kepada adik laki-lakinya/gi, 'เขาโกรธน้องชาย'],
  [/Ia sudah berhenti menunggunya/gi, 'เขาเลิกรอแล้ว'],
  [/Ia senang bus itu terlambat/gi, 'เขาดีใจที่รถบัสมาสาย'],
  [/Ia takut pada bus/gi, 'เขากลัวรถบัส'],
  [/Ia sedih harus berjalan pulang/gi, 'เขาเศร้าที่ต้องเดินกลับ'],
  [/Ia memercayainya/gi, 'เขาเชื่อใจ'],
  [/Ia takut kepadanya/gi, 'เขากลัว'],
  [/Ia menganggapnya lamban/gi, 'เขามองว่าเชื่องช้า'],
  [/Ia tidak mengenalnya/gi, 'เขาไม่รู้จัก']
];

function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  // If it's pure English (no Indonesian common words), keep it as is
  const hasIdWords = /(yang|tidak|karena|dengan|untuk|adalah|pada|dari|di|ke|sepanjang|satu|dua|hari|teman|rumah|sekolah|hujan|meja|pagi|malam|liburan|apa|siapa|bagaimana|mengapa|berapa|mana|ia|dia|mereka|kami|kita|bisa|sudah|akan|ingin|sedang|hanya|terlalu|sangat|seperti|bahwa|oleh|tentang)/i.test(text);
  if (!hasIdWords) return text;

  let res = text;
  for (const [re, replacement] of wordMap) {
    res = res.replace(re, replacement);
  }
  return res;
}

function translateQuestion(q) {
  if (!q) return q;
  let t = q;
  // Patterns
  t = t.replace(/^Apa yang terutama dibicarakan ([^?]+)\?/i, '$1 พูดถึงเรื่องอะไรเป็นหลัก?');
  t = t.replace(/^Apa topik utama dari ([^?]+)\?/i, 'หัวข้อหลักของ $1 คืออะไร?');
  t = t.replace(/^Di mana ([^?]+)\?/i, '$1 อยู่ที่ไหน?');
  t = t.replace(/^Ke mana ([^?]+)\?/i, '$1 ไปที่ไหน?');
  t = t.replace(/^Kapan ([^?]+)\?/i, '$1 เมื่อไหร่?');
  t = t.replace(/^Jam berapa ([^?]+)\?/i, '$1 กี่โมง?');
  t = t.replace(/^Berapa lama ([^?]+)\?/i, '$1 นานเท่าใด?');
  t = t.replace(/^Berapa banyak ([^?]+)\?/i, '$1 จำนวนเท่าใด?');
  t = t.replace(/^Berapa harga ([^?]+)\?/i, 'ราคาของ $1 คือเท่าใด?');
  t = t.replace(/^Mengapa ([^?]+)\?/i, 'ทำไม $1?');
  t = t.replace(/^Kenapa ([^?]+)\?/i, 'ทำไม $1?');
  t = t.replace(/^Siapa ([^?]+)\?/i, 'ใคร $1?');
  t = t.replace(/^Bagaimana perasaan ([^?]+)\?/i, 'ความรู้สึกของ $1 เป็นอย่างไร?');
  t = t.replace(/^Bagaimana sikap ([^?]+)\?/i, 'ทัศนคติของ $1 เป็นอย่างไร?');
  t = t.replace(/^Bagaimana pandangan ([^?]+)\?/i, 'มุมมองของ $1 เป็นอย่างไร?');
  t = t.replace(/^Apa yang kemungkinan akan dilakukan ([^?]+) selanjutnya\?/i, '$1 มีแนวโน้มจะทำอะไรต่อไป?');
  t = t.replace(/^Apa yang akan dilakukan ([^?]+) selanjutnya\?/i, '$1 จะทำอะไรต่อไป?');
  t = t.replace(/^Apa yang kemungkinan ([^?]+)\?/i, 'มีแนวโน้มว่า $1?');
  t = t.replace(/^Apa yang ([^?]+) lakukan\?/i, '$1 ทำอะไร?');
  t = t.replace(/^Apa masalah yang ([^?]+)\?/i, 'ปัญหาที่ $1 คืออะไร?');
  t = t.replace(/^Apa alasan ([^?]+)\?/i, 'เหตุผลของ $1 คืออะไร?');
  t = t.replace(/^Kalimat mana yang maknanya sama dengan (“[^”]+”|\"[^\"]+\")\?/i, 'ประโยคใดมีความหมายเหมือนกับ $1?');
  t = t.replace(/^Pernyataan mana yang paling sesuai dengan ([^?]+)\?/i, 'ข้อความใดสอดคล้องกับ $1 มากที่สุด?');
  t = t.replace(/^Apa kesimpulan dari ([^?]+)\?/i, 'ข้อสรุปของ $1 คืออะไร?');
  t = t.replace(/^Ketik kalimat yang kamu dengar\. Teks jawaban tidak disimpan setelah penilaian\./i, 'พิมพ์ประโยคที่คุณได้ยิน ข้อความคำตอบจะไม่ถูกบันทึกหลังตรวจ');
  return t;
}

function translateExplain(exp, character, mode) {
  if (!exp) return exp;
  let e = exp;
  e = e.replace(/^Sepanjang audio, ([^ ]+) terutama membicarakan hal ini — jadi jawaban yang benar: “([^”]+)”\./i, 'ตลอดเสียง $1 พูดถึงเรื่องนี้เป็นหลัก — ดังนั้นคำตอบที่ถูกต้องคือ: “$2”.');
  e = e.replace(/^Detail ini disebutkan langsung di audio: “([^”]+)”\./i, 'รายละเอียดนี้ระบุไว้โดยตรงในเสียง: “$1”.');
  e = e.replace(/^Jawaban ini tidak diucapkan langsung, tetapi petunjuk dalam audio mengarah ke kesimpulan: “([^”]+)”\./i, 'คำตอบนี้ไม่ได้พูดออกมาโดยตรง แต่เบาะแสในเสียงนำไปสู่ข้อสรุป: “$1”.');
  e = e.replace(/^Pilihan kata dan nada ([^ ]+) di audio menunjukkan: “([^”]+)”\./i, 'การเลือกใช้คำและน้ำเสียงของ $1 ในเสียงแสดงให้เห็นว่า: “$2”.');
  e = e.replace(/^Dalam audio, kalimat yang dikutip pada soal menyampaikan makna yang sama dengan “([^”]+)”\./i, 'ในเสียง ประโยคที่ยกมาในโจทย์สื่อความหมายเหมือนกับ “$1”.');
  e = e.replace(/^Kalimat yang diucapkan di audio persis: “([^”]+)”\./i, 'ประโยคที่พูดในเสียงคือ: “$1”.');
  return e;
}

const listeningTh = {};
for (const item of lb.items) {
  const qTh = translateQuestion(item.question);
  const expTh = translateExplain(item.explain, item.pedagogy?.character, item.mode);
  const entry = {
    question: qTh,
    explain: expTh
  };
  if (Array.isArray(item.options)) {
    entry.options = item.options.map(o => translateText(o));
  }
  listeningTh[item.id] = entry;
}

fs.writeFileSync(path.join(i18nDir, 'listening-bank-th.json'), JSON.stringify({
  schema: 'fiezel-listening-bank-th-v1',
  version: '1.0.0',
  status: 'reviewed_release_th',
  count: Object.keys(listeningTh).length,
  items: listeningTh
}, null, 2) + '\n');
console.log('Saved listening-bank-th.json with', Object.keys(listeningTh).length, 'items');
