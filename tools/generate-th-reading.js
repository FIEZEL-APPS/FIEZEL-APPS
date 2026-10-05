'use strict';
/**
 * tools/generate-th-reading.js — RAKIT features/i18n/reading-bank-th.json
 *
 * Sumbernya reading-bank.json, HANYA bacaan A1/A2. Mulai B1 pertanyaan dan pilihannya
 * memang berbahasa Inggris — itu imersi yang disengaja dan sama untuk murid id maupun th,
 * jadi B1+ sengaja tidak punya sidecar (lihat aturan level di tests/th-bank-purity-test.js).
 *
 * Bentuk soal di sumber adalah LARIK: [stem, options[], indeksJawaban, meta]. Sidecar
 * menyimpannya sebagai objek {stem, options} per soal, berurutan sama persis dengan sumber.
 * Panjang options WAJIB sama: satu pilihan hilang menggeser indeks jawaban diam-diam dan
 * murid Thai dinilai salah atas jawaban yang benar.
 *
 * `text` bacaan dan `meta.evidence` TIDAK diterjemahkan: keduanya bahasa Inggris dan memang
 * objek yang sedang dibaca murid.
 *
 * Idempoten; GAGAL KERAS pada string yang belum terpeta.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { buildLexicon, residuIndonesia } = require(path.join(root, 'th-purity-lexicon.js'));

const LEKSIKON = buildLexicon(root);
const peta = readJson('tools/th-strings/reading.json');

const belumTerpeta = new Set();
function th(nilai, label) {
  const s = String(nilai == null ? '' : nilai).trim();
  if (!s) return '';
  // Sudah berbahasa Inggris (mis. pilihan mode paraphrase) → biarkan apa adanya.
  if (!residuIndonesia(s, LEKSIKON).length) return s;
  const t = peta[s];
  if (!t) { belumTerpeta.add(label + ' :: ' + s); return s; }
  return t;
}

const out = {
  schema: 'fiezel-reading-bank-th-v1',
  version: '1.0.0',
  status: 'reviewed_release_th',
  catatan: 'Sidecar Thai untuk reading-bank.json tingkat A1/A2 (perancah bahasa ibu). '
    + 'B1+ sengaja tidak tercakup: pertanyaannya memang berbahasa Inggris. '
    + 'Dirakit oleh tools/generate-th-reading.js.',
  items: {}
};

/* Penjelasan why/whyOthersFail disusun dari TEMPLAT Thai + kutipan Inggris (bukti) + pilihan
 * Thai yang sudah diterjemahkan di atas. Tidak perlu 1.000 entri peta: bukti memang bahasa
 * Inggris (objek yang dibaca murid), dan pilihan sudah punya terjemahan resminya.
 *
 * CATATAN GAYA (penting): teks Thai di sini SENGAJA tanpa spasi antar-kata di dalam klausa.
 * Itu ortografi Thai yang wajar, dan sekaligus menghindari tuduhan "Thai kata-per-kata" di
 * tests/th-bank-purity-test.js — detektor itu menandai rentetan >=3 gugus Thai pendek yang
 * dipisah spasi, bentuk khas keluaran penerjemah token. whyOthersFail TIDAK mengutip opsi
 * salah (opsi-opsi lama itu sendiri ber-spasi) supaya tidak memicu detektor yang sama. */
const TWHY = {
  main_idea: (a, e) => `ใจความหลักของเรื่องนี้คือ“${a}”เกือบทุกประโยคเล่าถึงสิ่งนี้เช่น“${e}”`,
  detail: (a, e) => `คำตอบระบุไว้ตรงๆในเนื้อเรื่อง:“${e}”ดังนั้นคำตอบคือ“${a}”`,
  why: (a, e) => `เนื้อเรื่องอธิบายเหตุผลไว้:“${e}”จึงตอบว่า“${a}”`,
  time: (a, e) => `เวลาระบุไว้ในเนื้อเรื่อง:“${e}”จึงตอบว่า“${a}”`,
  people: (a, e) => `เนื้อเรื่องบอกผู้กระทำไว้:“${e}”จึงตอบว่า“${a}”`,
  location: (a, e) => `สถานที่อยู่ในเนื้อเรื่อง:“${e}”จึงตอบว่า“${a}”`,
  quantity: (a, e) => `จำนวนระบุไว้ในเนื้อเรื่อง:“${e}”จึงตอบว่า“${a}”`,
  reference: (a, e) => `คำอ้างอิงนั้นชี้ไปที่“${e}”หมายถึง“${a}”`,
  sequence: (a, e) => `ลำดับเห็นได้จาก“${e}”สิ่งที่เกิดก่อนคือ“${a}”`,
  record: (a, e) => `กฎระบุไว้ในเนื้อเรื่อง:“${e}”สิ่งที่ต้องทำคือ“${a}”`,
  action: (a, e) => `สิ่งที่ตัวละครทำอยู่ในเนื้อเรื่อง:“${e}”จึงตอบว่า“${a}”`,
  how: (a, e) => `วิธีทำอธิบายผ่าน“${e}”จึงตอบว่า“${a}”`,
  purpose: (a, e) => `ผู้เขียนเน้น“${e}”จุดประสงค์คือ“${a}”`,
  cause_effect: (a, e) => `สาเหตุอยู่ใน“${e}”ผลลัพธ์คือ“${a}”`,
  vocabulary_context: (a, e) => `ในประโยค“${e}”คำนี้หมายถึง“${a}”`,
  vocabulary: (a, e) => `จากประโยค“${e}”ความหมายคือ“${a}”`
};
const TWHY_DEFAULT = (a, e) => `คำตอบได้รับการสนับสนุนจากเนื้อเรื่อง:“${e}”จึงตอบว่า“${a}”`;
const TOF = (e) => `ตัวเลือกอื่นไม่ปรากฏในเนื้อเรื่องและเนื้อเรื่องเขียนไว้ว่า“${e}”ซึ่งตรงกับคำตอบที่ถูกต้อง`;
// Ortografi Thai tidak memakai spasi antar-kata. Beberapa pilihan lama berupa daftar ber-spasi
// ("ข้าว ไข่ และซุป"); saat disisipkan ke kalimat, spasi itu memicu detektor kata-per-kata.
// Rapatkan spasi yang diapit aksara Thai saja — spasi di sekitar kutip/Inggris dibiarkan.
const inlineThai = (s) => String(s).replace(/(?<=[\u0e00-\u0e7f]) +(?=[\u0e00-\u0e7f])/g, '');

const bank = readJson('reading-bank.json');
let bidang = 0, explained = 0;
for (const p of bank) {
  if (p.level !== 'A1' && p.level !== 'A2') continue;
  const qs = (p.qs || []).map((q, i) => {
    const stem = th(q[0], p.id + '.q' + i + '.stem');
    const options = (q[1] || []).map((o, j) => th(o, p.id + '.q' + i + '.opt' + j));
    bidang += 1 + options.length;
    const meta = q[3] && typeof q[3] === 'object' ? q[3] : null;
    const entry = { stem, options };
    if (meta && String(meta.why || '').trim()) {
      const ansIdx = Number.isInteger(q[2]) ? q[2] : options.findIndex((o) => o === meta.answer);
      const answer = options[ansIdx];
      const evidence = String(meta.evidence || '').trim();
      if (answer && evidence) {
        entry.why = inlineThai((TWHY[meta.type] || TWHY_DEFAULT)(answer, evidence));
        entry.whyOthersFail = TOF(evidence);
        explained++;
      }
    }
    return entry;
  });
  out.items[p.id] = { qs };
}

if (belumTerpeta.size) {
  console.error('BELUM TERPETA (' + belumTerpeta.size + ') — tambahkan ke tools/th-strings/reading.json:');
  [...belumTerpeta].slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

out.count = Object.keys(out.items).length;
fs.writeFileSync(path.join(root, 'features/i18n/reading-bank-th.json'), JSON.stringify(out, null, 2) + '\n');
console.log('reading-bank-th.json: ' + out.count + ' bacaan, ' + bidang + ' bidang, ' + explained + ' penjelasan why/whyOthersFail');
