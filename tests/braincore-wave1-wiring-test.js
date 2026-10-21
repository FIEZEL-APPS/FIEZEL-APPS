#!/usr/bin/env node
'use strict';
/**
 * tests/braincore-wave1-wiring-test.js — Gelombang 1 audit kabel BrainCore (m025-454).
 *
 * Audit 2026-10-04 (reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md) menemukan hasil BrainCore
 * hanya tampil di tab ke-4 Progres. Gelombang 1 menyambungkannya ke tiga tempat murid:
 *   - kartu "Kata Braincore Hari Ini" di Beranda (arah belajar, kata yang memudar, pasangan tertukar),
 *   - panel "Bukti kamu makin pintar" di Ringkasan Progres,
 *   - satu baris fokus di hub Grammar.
 *
 * Gerbang ini menjaga kabelnya tetap tersambung DAN aturan bahasa owner:
 *   - kartunya dirender di bagian Beranda yang TERLIHAT, bukan di blok audit yang disembunyikan;
 *   - setiap kunci bc.* ada di copy-id DAN copy-th dengan placeholder yang sama, nilai th beraksara Thai;
 *   - tidak ada tanda pisah (em dash, en dash) dan tidak ada istilah mesin (BKT, IRT, FSRS, theta,
 *     probabilitas, taksonomi) di teks murid yang baru;
 *   - tiap kalimat pendek (paling banyak 90 karakter sebelum placeholder diisi).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const __fzRoot = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); } else { fails.push(name); console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')); }
}
function copyMap(file) {
  const sandbox = { self: {}, window: {}, console };
  sandbox.self = sandbox; sandbox.window = sandbox;
  let reg = {};
  sandbox.FiezelI18n = { register: (loc, map) => { Object.assign(reg, map); }, registerCopy: (loc, map) => { Object.assign(reg, map); } };
  try { vm.runInNewContext(fs.readFileSync(path.join(__fzRoot, file), 'utf8'), sandbox); } catch (_) {}
  if (!Object.keys(reg).length) {
    const src = fs.readFileSync(path.join(__fzRoot, file), 'utf8');
    for (const m of src.matchAll(/'(bc\.[a-z0-9-]+)':\s*'((?:[^'\\]|\\.)*)'/g)) reg[m[1]] = m[2];
  }
  return reg;
}

const fnBody = name => {
  const m = new RegExp('^function\\s+' + name + '\\s*\\(', 'm').exec(app);
  if (!m) return '';
  let i = app.indexOf('{', m.index), d = 0, j = i;
  for (; j < app.length; j++) { const c = app[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return app.slice(m.index, j + 1);
};

// ---- Kabel tersambung ----
const home = fnBody('todayHomeMarkup');
const vault = home.indexOf('fz-tactile-audit-vault');
const cardAt = home.indexOf('${braincoreHomeCardMarkup()}');
check('Beranda merender kartu "Kata Braincore Hari Ini"', cardAt > 0);
check('Kartu Beranda berada DI LUAR blok audit yang disembunyikan', cardAt > 0 && vault > 0 && cardAt < vault, `kartu@${cardAt} vault@${vault}`);
check('Ringkasan Progres merender panel bukti belajar', /overview:`[^`]*\$\{braincoreProofPanelMarkup\(\)\}/.test(fnBody('progress')));
check('Hub Grammar merender satu baris fokus', fnBody('grammar').includes('${braincoreGrammarFocusLine()}'));
check('Kata yang memudar diambil dari antrean review yang sama dengan tombol Segarkan', fnBody('braincoreFadingWords').includes('vocabReviewQueue()') && fnBody('braincoreHomeCardMarkup').includes('onclick="reviewVocab()"'));
check('Arah belajar dibaca dari momentum Core Brain', fnBody('braincoreDirectionLine').includes('coreBrainSnapshot()'));
check('Panel bukti memakai metrik belajar BrainCore (sebelumnya tidak punya pemanggil)', fnBody('braincoreProofLines').includes('learningMetricsSnapshot('));
check('Perbaiki Dasarnya membuka lesson lewat pintu resmi openGrammarLesson', fnBody('braincoreFixBasics').includes('openGrammarLesson('));

// ---- Aturan bahasa owner ----
const id = copyMap('features/i18n/copy-id-redesign.js');
const th = copyMap('features/i18n/copy-th-redesign.js');
// Kunci arah dipilih lewat tabel (improving/plateau/declining), jadi dipungut dari literal 'bc.*' mana pun.
const used = [...new Set([...app.matchAll(/'(bc\.[a-z0-9-]+)'/g)].map(m => m[1]))];
check('Setiap kunci bc.* yang dipakai app.js punya teks Indonesia', used.length >= 15 && used.every(k => typeof id[k] === 'string' && id[k]), used.filter(k => !id[k]).join(', '));
check('Setiap kunci bc.* punya kembaran Thai beraksara Thai', used.every(k => typeof th[k] === 'string' && /[฀-๿]/.test(th[k])), used.filter(k => !(th[k] && /[฀-๿]/.test(th[k]))).join(', '));
const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
check('Placeholder id dan th identik', used.every(k => ph(id[k]) === ph(th[k])), used.filter(k => ph(id[k]) !== ph(th[k])).join(', '));
const dash = /[–—]/;
check('Tanpa tanda pisah (em dash, en dash) di teks baru id dan th', used.every(k => !dash.test(id[k]) && !dash.test(th[k])), used.filter(k => dash.test(id[k]) || dash.test(th[k])).join(', '));
const jargon = /\b(BKT|IRT|FSRS|theta|probabilitas|taksonomi|retrievability|posterior|momentum)\b/i;
check('Tanpa istilah mesin di teks murid', used.every(k => !jargon.test(id[k]) && !jargon.test(th[k])), used.filter(k => jargon.test(id[k]) || jargon.test(th[k])).join(', '));
check('Setiap kalimat pendek (<= 90 karakter sebelum diisi)', used.every(k => id[k].length <= 90), used.filter(k => id[k].length > 90).join(', '));

console.log(`\nbraincore-wave1-wiring-test: ${pass}/${pass + fails.length} PASS`);
if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
