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

const bank = readJson('reading-bank.json');
let bidang = 0;
for (const p of bank) {
  if (p.level !== 'A1' && p.level !== 'A2') continue;
  const qs = (p.qs || []).map((q, i) => {
    const stem = th(q[0], p.id + '.q' + i + '.stem');
    const options = (q[1] || []).map((o, j) => th(o, p.id + '.q' + i + '.opt' + j));
    bidang += 1 + options.length;
    return { stem, options };
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
console.log('reading-bank-th.json: ' + out.count + ' bacaan, ' + bidang + ' bidang');
