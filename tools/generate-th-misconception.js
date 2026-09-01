'use strict';
/**
 * tools/generate-th-misconception.js — RAKIT features/i18n/misconception-th.json
 *
 * Dua berkas jadi sumbernya, dan keduanya sampai ke mata murid:
 *   - grammar-misconception-id.json — 644 diagnosis. KUNCINYA berbahasa Inggris (nama
 *     miskonsepsi yang dipakai bank soal untuk menjodohkan), NILAINYA yang Indonesia dan
 *     itulah yang dibaca murid. Dimuat app.js lewat loadMisconceptionDiagnoses().
 *   - misconception-taxonomy-v1.json — 49 kode, masing-masing punya label + description_id.
 *
 * Kunci sidecar sengaja MENGIKUTI kunci sumbernya persis, bukan diberi kunci baru: pembaca
 * runtime menjodohkan lewat kunci itu, jadi kunci yang meleset satu byte = diagnosis yang
 * tidak pernah ditemukan dan diam-diam jatuh ke kalimat umum.
 *
 * Idempoten; GAGAL KERAS pada string yang belum terpeta.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { buildLexicon, residuIndonesia } = require(path.join(root, 'th-purity-lexicon.js'));

const LEKSIKON = buildLexicon(root);
const petaDiagnosis = readJson('tools/th-strings/misconception-diagnosis.json');
const petaTaksonomi = readJson('tools/th-strings/misconception-taxonomy.json');

const belumTerpeta = new Set();
function th(nilai, peta, label) {
  const s = String(nilai == null ? '' : nilai).trim();
  if (!s) return '';
  if (!residuIndonesia(s, LEKSIKON).length) return s;
  const t = peta[s];
  if (!t) { belumTerpeta.add(label + ' :: ' + s); return s; }
  return t;
}

const out = {
  schema: 'fiezel-misconception-th-v1',
  version: '1.0.0',
  status: 'reviewed_release_th',
  catatan: 'Sidecar Thai untuk grammar-misconception-id.json (nilai diagnosis) dan '
    + 'misconception-taxonomy-v1.json (label + description_id). Kunci mengikuti kunci sumber '
    + 'persis — runtime menjodohkan lewat kunci itu. Dirakit oleh tools/generate-th-misconception.js.',
  diagnoses: {},
  codes: {}
};

const diagnoses = readJson('grammar-misconception-id.json').diagnoses || {};
for (const [kunci, nilai] of Object.entries(diagnoses)) {
  out.diagnoses[kunci] = th(nilai, petaDiagnosis, 'diagnosis[' + kunci + ']');
}

const codes = readJson('misconception-taxonomy-v1.json').codes || {};
for (const [kode, c] of Object.entries(codes)) {
  const entry = {};
  if (c.label) entry.label = th(c.label, petaTaksonomi, kode + '.label');
  // description_id: sufiks _id di sini berarti "bahasa Indonesia", bukan "identifier" —
  // di sidecar th ia jadi `description` polos supaya nama bidangnya tidak berbohong.
  if (c.description_id) entry.description = th(c.description_id, petaTaksonomi, kode + '.description');
  out.codes[kode] = entry;
}

if (belumTerpeta.size) {
  console.error('BELUM TERPETA (' + belumTerpeta.size + ') — tambahkan ke tools/th-strings/:');
  [...belumTerpeta].slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

out.count = Object.keys(out.diagnoses).length;
fs.writeFileSync(path.join(root, 'features/i18n/misconception-th.json'), JSON.stringify(out, null, 2) + '\n');
console.log('misconception-th.json: ' + out.count + ' diagnosis, ' + Object.keys(out.codes).length + ' kode taksonomi');
