#!/usr/bin/env node
'use strict';
/**
 * tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js — angka yang bisa diulang untuk
 * reports/BRAINCORE-PEDAGOGY-AUDIT-2026-10-11.md. BUKAN gerbang (gerbangnya
 * tests/braincore-pedagogy-audit-2026-10-11-test.js): mencetak hitungan per dimensi audit dan
 * contoh kandidat, selalu exit 0. Node murni, membaca bank soal di akar repo:
 *
 *   node tools/dev/braincore-pedagogy-audit-2026-10-11-probe.js [--json out.json]
 *
 * Dimensi (prompt audit): D1 kesesuaian stem/opsi, D2 tautologi & pujian palsu, D3 presisi
 * istilah & kebocoran metadata, D4 scaffolding vs spoiler, D5 nada. Heuristik di sini MENANDAI
 * kandidat; vonis FATAL/MAJOR/MINOR di laporan diberikan sesudah dibaca manusia.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const T = read('grammar-templates.json').templates;
const TH = read('grammar-explanations-th.json').templates;
const n = (s) => String(s ?? '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const wholeWord = (hay, needle) => { const k = n(needle); return !!k && (' ' + n(hay) + ' ').includes(' ' + k + ' '); };
const quoted = (s) => [...String(s || '').matchAll(/[“"']([^”"']{1,60})[”"']/g)].map((m) => m[1]);
const out = {};
const add = (k, v) => (out[k] = out[k] || []).push(v);

for (const t of T) {
  const key = t.options[t.correctIndex];
  const ex = t.explanation || {};
  for (const d of t.distractors) if (!t.options.includes(d.option)) add('D1_pengecoh_hantu', { id: t.id, option: d.option });
  t.options.forEach((o, i) => { if (i !== t.correctIndex && !String(t.distractors.find((x) => x.option === o)?.whyFailsId || '').trim()) add('D1_opsi_tanpa_alasan', { id: t.id, option: o }); });
  for (const d of t.distractors) {
    const w = String(d.whyFailsId || '');
    const ctx = { id: t.id, key, option: d.option, why: w };
    for (const o of t.options) if (o !== d.option && o !== key && quoted(w).some((q) => n(q) === n(o))) add('D1_alasan_menunjuk_pengecoh_lain', { ...ctx, other: o });
    if (/sama (kayak|seperti) [“"]([^”"]+)[”"]/i.test(w)) {
      const ref = w.match(/sama (kayak|seperti) [“"]([^”"]+)[”"]/i)[2];
      if (!wholeWord(t.stem + ' ' + t.options.join(' '), ref) && !/^(he|she|it|we|they|i|you)$/i.test(ref)) add('D1_rujukan_hantu', { ...ctx, ref });
    }
    if (/(bukan|tidak|nggak)\s+(jawaban|pilihan|bentuk)\s+yang\s+(tepat|benar|bener|pas)|yang (benar|bener|tepat) (adalah|itu)\b|nggak pernah (bener|benar)\b(?![^.]*[,;:])/i.test(w)) add('D2_tautologi', ctx);
    if (n(w) === n(ex.whyCorrectId)) add('D2_sama_dengan_alasan_kunci', ctx);
    if (/<[a-z/][^>]*>|Target:|patternId|undefined|\[object/.test(w)) add('D3_kebocoran_kode', ctx);
    if (quoted(w).some((q) => n(q) === n(key)) || (n(key).length > 2 && wholeWord(w, key))) add('D4_alasan_menyebut_kunci_id', ctx);
    const thW = String(TH[t.id]?.distractors?.[d.option]?.whyFails || '');
    if (thW && (quoted(thW).some((q) => n(q) === n(key)) || (n(key).length > 2 && wholeWord(thW, key)))) add('D4_alasan_menyebut_kunci_th', { ...ctx, why: thW });
    if (/\b(bodoh|goblok|ngawur|asal-asalan|parah|masa sih|harusnya kamu|gampang banget|ceroboh|malas)\b/i.test(w)) add('D5_nada_merendahkan', ctx);
  }
  if (n(key).length > 1 && wholeWord(ex.memoryCueId, key)) add('D4_pegangan_ingatan_menyebut_kunci', { id: t.id, key, v: ex.memoryCueId });
  if (n(key).length > 1 && wholeWord(ex.howToAvoidId, key)) add('D4_saran_menghindar_menyebut_kunci', { id: t.id, key, v: ex.howToAvoidId });
}

// Susun kata: soal dirakit dengan aturan makeGrammarTokenOrderQuestion().
const cleanWord = (w) => String(w || '').trim().replace(/^[^\w\s]+|[^\w\s]+$/g, '');
let eligible = 0;
for (const t of T) {
  const base = String(t.stem || '').trim(), correct = String(t.options[t.correctIndex] || '').trim();
  const bm = base.match(/_{2,}|\[\.\.\.\]/g);
  if (!bm || bm.length !== 1 || /^(find and correct|which sentence|correct the error|what is the plural)\b/i.test(base)) continue;
  if (!correct || /[;/]/.test(correct) || correct.split(/\s+/).length > 3) continue;
  const full = base.replace(/_{2,}|\[\.\.\.\]/g, correct).trim();
  if (!full.includes(correct)) continue;
  const toks = full.split(/\s+/).map(cleanWord).filter(Boolean);
  if (toks.length < 3 || toks.length > 18) continue;
  eligible++;
  const dis = t.options.filter((_, i) => i !== t.correctIndex).map(cleanWord).filter((w) => w && !w.includes(' ')).slice(0, 2);
  for (const d of dis) if (toks.some((x) => x.toLowerCase() === d.toLowerCase())) add('D1_susun_kata_pengecoh_kembar', { id: t.id, distractor: d, full });
  if (/^(yesterday|today|tomorrow|tonight|last|next|every|on|in|at|after|before|when|once|so|by|this|while|if|because|although|despite|these|nowadays)\b/i.test(toks[0])) add('D2_susun_kata_dibuka_keterangan', { id: t.id, full });
  if (/\?\s*$/.test(full)) add('D2_susun_kata_kalimat_tanya', { id: t.id, full });
}

// Reading: templat generik "tidak ada di teks".
const reading = read('reading-bank.json');
for (const p of Object.values(reading)) for (const q of p.qs || []) {
  const m = q && q[3];
  if (m && /^Pilihan .+ tidak ada di teks\./.test(m.whyOthersFail || '')) add('D2_reading_klaim_tidak_ada_di_teks', { id: p.id, type: m.type });
}

console.log('templat grammar: ' + T.length + ' · pengecoh: ' + T.reduce((a, t) => a + t.distractors.length, 0) + ' · soal susun kata layak: ' + eligible);
for (const [k, v] of Object.entries(out).sort()) console.log(k.padEnd(44) + v.length);
const i = process.argv.indexOf('--json');
if (i > 0 && process.argv[i + 1]) fs.writeFileSync(process.argv[i + 1], JSON.stringify(out, null, 1));
