'use strict';
/**
 * tools/repair-th-listening-bank.js — PERBAIKAN BEDAH listening-bank-th.json
 *
 * MENGAPA. Sidecar th listening dibangun oleh generator kata-per-kata (wordMap/phraseMap).
 * Untuk kalimat yang kebetulan tertutup peta, hasilnya benar; untuk sisanya ia menghasilkan
 * dua cacat yang lolos ke rilis: (a) kalimat campur Thai+Indonesia — "เขา ไม่ punya pena" —
 * karena kata yang tak ada di peta dibiarkan apa adanya, dan (b) Thai kata-per-kata bersepasi
 * — "รถบัส นั้น สาย นานเท่าใด?" — karena token disambung dengan spasi, padahal aksara Thai
 * tidak menaruh spasi antar-kata. Keduanya omong kosong bagi murid Thai.
 *
 * APA YANG DILAKUKAN. BEDAH, bukan bangun ulang: hanya bidang yang GAGAL uji kemurnian yang
 * disentuh, sisanya dikembalikan byte-identik. Sumber terjemahannya adalah peta tulisan tangan
 * di tools/th-strings/listening-{questions,options}.json — kalimat utuh, bukan token, jadi
 * cacat yang sama tidak bisa lahir lagi. Bidang explain DIBANGUN ULANG dari templat per mode
 * (templat yang sama dengan generator asli) memakai teks pilihan yang sudah diperbaiki, sebab
 * explain mengutip jawaban benar: memperbaiki pilihan tanpa explain akan menyisakan kutipan
 * lama yang rusak di dalam kalimat yang sudah benar.
 *
 * Idempoten: dijalankan dua kali menghasilkan berkas yang sama.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bankPath = path.join(root, 'features/speaking-listening/listening-bank-v1.json');
const thPath = path.join(root, 'features/i18n/listening-bank-th.json');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const bank = readJson(bankPath);
const th = readJson(thPath);
const mapQ = readJson(path.join(root, 'tools/th-strings/listening-questions.json'));
const mapO = readJson(path.join(root, 'tools/th-strings/listening-options.json'));

const { buildLexicon, residuIndonesia, thaiKataPerKata } = require(path.join(root, 'th-purity-lexicon.js'));
const LEKSIKON = buildLexicon(root);
/**
 * Artefak sisa yang lolos ambang gerbang: DUA gugus Thai bersebelahan yang keduanya pendek
 * ("Indra วิ่ง นานเท่าใด?"). Gerbang menuntut >=3 gugus supaya satu jeda klausa yang sah tidak
 * pernah dituduh; di sini, saat sumber Indonesianya sudah ada di peta, ambangnya boleh lebih
 * ketat karena perbaikannya pasti benar.
 */
function duaGugusPendek(v) {
  const s = String(v == null ? '' : v).replace(/ +\u0E46/g, '\u0E46');
  for (const r of s.match(/[\u0E00-\u0E7F]+(?: [\u0E00-\u0E7F]+)+/g) || []) {
    const g = r.split(' ').map((x) => x.length);
    if (g.length === 2 && g.every((n) => n < 10)) return true;
  }
  return false;
}
const cacat = (v) => typeof v === 'string' && v.trim() !== '' && (residuIndonesia(v, LEKSIKON).length > 0 || thaiKataPerKata(v) || duaGugusPendek(v));

/** Templat explain per mode — SAMA dengan generator asli, supaya nada sidecar tetap seragam. */
function explainTh(mode, karakter, kutipan, item) {
  const q = kutipan ? '“' + kutipan + '”' : '';
  switch (mode) {
    case 'gist':
      return karakter
        ? `ตลอดเสียง ${karakter} พูดถึงเรื่องนี้เป็นหลัก — ดังนั้นคำตอบที่ถูกต้องคือ: ${q}.`
        : `ตลอดเสียงพูดถึงเรื่องนี้เป็นหลัก — ดังนั้นคำตอบที่ถูกต้องคือ: ${q}.`;
    case 'detail':
      return `รายละเอียดนี้ระบุไว้โดยตรงในเสียง: ${q}.`;
    case 'inference':
      return `คำตอบนี้ไม่ได้พูดออกมาโดยตรง แต่เบาะแสในเสียงนำไปสู่ข้อสรุป: ${q}.`;
    case 'attitude':
      return karakter
        ? `การเลือกใช้คำและน้ำเสียงของ ${karakter} ในเสียงแสดงให้เห็นว่า: ${q}.`
        : `การเลือกใช้คำและน้ำเสียงแสดงให้เห็นว่า: ${q}.`;
    case 'paraphrase':
      return `ในเสียง ประโยคที่ยกมาในโจทย์สื่อความหมายเหมือนกับ ${q}.`;
    case 'dictation': {
      const m = String(item && item.explain || '').match(/“([^”]+)”/);
      return `ประโยคที่พูดในเสียงคือ: “${m ? m[1] : String(item && item.answerText || '')}”.`;
    }
    default:
      return '';
  }
}

const belumTerpeta = new Set();
let bidangDiperbaiki = 0;
let butirDisentuh = 0;

for (const item of bank.items || []) {
  const e = th.items[item.id];
  if (!e) continue;
  let berubah = false;

  if (cacat(e.question)) {
    const t = mapQ[String(item.question || '')];
    if (t) { e.question = t; bidangDiperbaiki++; berubah = true; }
    else belumTerpeta.add('Q :: ' + item.question);
  }

  // Mode paraphrase: pilihan Inggris ADALAH objek ujinya — tidak diterjemahkan.
  if (item.mode !== 'paraphrase' && Array.isArray(e.options)) {
    e.options.forEach((opt, i) => {
      if (!cacat(opt)) return;
      const t = mapO[String((item.options || [])[i] || '')];
      if (t) { e.options[i] = t; bidangDiperbaiki++; berubah = true; }
      else belumTerpeta.add('O :: ' + (item.options || [])[i]);
    });
  }

  // explain mengutip jawaban benar: bangun ulang bila explain-nya sendiri cacat ATAU bila
  // pilihannya baru saja berubah (kutipan lama = kutipan rusak di kalimat yang sudah benar).
  if (berubah || cacat(e.explain)) {
    const idx = Number.isInteger(item.answerIndex) ? item.answerIndex : 0;
    const kutipan = Array.isArray(e.options) ? String(e.options[idx] || '') : '';
    const baru = explainTh(item.mode, (item.pedagogy && item.pedagogy.character) || '', kutipan, item);
    if (baru && baru !== e.explain) { e.explain = baru; bidangDiperbaiki++; berubah = true; }
  }

  if (berubah) butirDisentuh++;
}

if (belumTerpeta.size) {
  console.error('BELUM TERPETA (' + belumTerpeta.size + ') — tambahkan ke tools/th-strings/:');
  [...belumTerpeta].slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

th.count = Object.keys(th.items).length;
fs.writeFileSync(thPath, JSON.stringify(th, null, 2) + '\n');
console.log('listening-bank-th.json: ' + butirDisentuh + ' butir disentuh, ' + bidangDiperbaiki + ' bidang diperbaiki, ' + th.count + ' butir total');
