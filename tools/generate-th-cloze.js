'use strict';
/**
 * tools/generate-th-cloze.js — RAKIT features/i18n/cloze-bank-th.json
 *
 * Sumbernya cloze-bank-v1.json (210 butir). Yang sampai ke mata murid ada dua lapis:
 *   - explain.{why,rule,memory,avoid} — penjelasan sesudah menjawab.
 *   - distractors[].{whyFailsId,misconceptionId} — umpan balik per pilihan yang salah.
 * Keduanya berbahasa Indonesia di sumber, jadi keduanya butuh sidecar th.
 *
 * KUNCI DISTRAKTOR = TEKS PILIHAN PERSIS (bukan indeks). Urutan pilihan diacak saat
 * disajikan, jadi indeks tidak stabil; teks pilihan yang meleset satu byte = umpan balik
 * tak ditemukan runtime dan murid melihat kalimat umum, bukan koreksi atas kekeliruannya.
 *
 * Bidang `misconception` (tanpa sufiks Id) sengaja TIDAK diterjemahkan: isinya nama teknis
 * berbahasa Inggris yang dipakai mesin untuk menjodohkan pola, bukan kalimat untuk dibaca.
 *
 * Idempoten; GAGAL KERAS pada string yang belum terpeta.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { buildLexicon, residuIndonesia } = require(path.join(root, 'th-purity-lexicon.js'));

const LEKSIKON = buildLexicon(root);
const peta = readJson('tools/th-strings/cloze.json');

const belumTerpeta = new Set();
function th(nilai, label) {
  const s = String(nilai == null ? '' : nilai).trim();
  if (!s) return '';
  if (!residuIndonesia(s, LEKSIKON).length) return s;
  const t = peta[s];
  if (!t) { belumTerpeta.add(label + ' :: ' + s); return s; }
  return t;
}

const out = {
  schema: 'fiezel-cloze-bank-th-v1',
  version: '1.0.0',
  status: 'reviewed_release_th',
  catatan: 'Sidecar Thai untuk cloze-bank-v1.json: penjelasan (explain) dan umpan balik '
    + 'per distraktor. Kunci butir = id butir; kunci distraktor = teks pilihan persis. '
    + 'Dirakit oleh tools/generate-th-cloze.js.',
  items: {}
};

const bank = readJson('cloze-bank-v1.json');
let bidang = 0;
for (const it of bank.items || []) {
  const entry = {};

  const explain = {};
  for (const k of ['why', 'rule', 'memory', 'avoid']) {
    if (it.explain && it.explain[k]) {
      explain[k] = th(it.explain[k], it.id + '.explain.' + k);
      bidang++;
    }
  }
  if (Object.keys(explain).length) entry.explain = explain;

  const distractors = {};
  for (const d of it.distractors || []) {
    const kunci = String(d.text == null ? '' : d.text);
    if (!kunci) continue;
    const dt = {};
    for (const k of ['whyFailsId', 'misconceptionId']) {
      if (d[k]) {
        dt[k] = th(d[k], it.id + '.d[' + kunci + '].' + k);
        bidang++;
      }
    }
    if (Object.keys(dt).length) distractors[kunci] = dt;
  }
  if (Object.keys(distractors).length) entry.distractors = distractors;

  if (Object.keys(entry).length) out.items[it.id] = entry;
}

if (belumTerpeta.size) {
  console.error('BELUM TERPETA (' + belumTerpeta.size + ') — tambahkan ke tools/th-strings/cloze.json:');
  [...belumTerpeta].slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

out.count = Object.keys(out.items).length;
fs.writeFileSync(path.join(root, 'features/i18n/cloze-bank-th.json'), JSON.stringify(out, null, 2) + '\n');
console.log('cloze-bank-th.json: ' + out.count + ' butir, ' + bidang + ' bidang');
