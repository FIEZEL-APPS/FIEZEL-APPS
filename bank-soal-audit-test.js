#!/usr/bin/env node
/**
 * m025-124 — pagar bank soal.
 *
 * Dua hal yang dikunci di sini, karena dua-duanya pernah lolos ke layar siswa:
 *  1. soal jenis kata tanpa kalimat konteks (kata "dance" sendirian bisa benda atau kerja)
 *  2. label jenis kata yang tampil mentah dalam Bahasa Inggris
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocabulary-master.json'), 'utf8'));

let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
};

console.log('bank-soal-audit-test');

// --- 1. generator soal jenis kata wajib memakai kalimat contoh -------------
check('soal jenis kata memakai kalimat contoh sebagai konteks',
  /Dalam kalimat “\$\{v\.example\}”, kata “\$\{surface\}”\$\{asal\} berperan sebagai jenis kata apa\?/.test(app),
  'stem tanpa konteks membuat kata bermakna ganda tidak bisa dijawab');

check('stem lama tanpa konteks sudah tidak ada',
  !/Di lesson ini, “\$\{v\.word\}” termasuk jenis kata apa\?/.test(app));

check('ada penjaga partOfSpeechAskable',
  /function partOfSpeechAskable\(/.test(app) && /if\(type==='partOfSpeech'&&!partOfSpeechAskable\(v\)\)type='meaning'/.test(app),
  'tanpa penjaga, kata tanpa contoh yang cocok tetap dijadikan soal');

// --- 2. setiap label jenis kata punya padanan Bahasa Indonesia -------------
const map = {};
const block = app.match(/const PART_OF_SPEECH_ID=\{([^}]*)\}/);
check('PART_OF_SPEECH_ID terdefinisi', !!block);
if (block) {
  for (const pair of block[1].split(',')) {
    const m = pair.match(/^\s*([a-z]+)\s*:\s*'([^']+)'\s*$/);
    if (m) map[m[1]] = m[2];
  }
}
const missing = [...new Set(V.map(v => String(v.partOfSpeech || '').toLowerCase()))].filter(p => p && !map[p]);
check('semua partOfSpeech di bank kosakata punya label Bahasa Indonesia',
  missing.length === 0, missing.join(', '));

const english = Object.values(map).filter(label => !/^[a-z ]+$/.test(label) || /\b(noun|verb|adjective|adverb)\b/.test(label));
check('tidak ada label jenis kata yang masih Bahasa Inggris', english.length === 0, english.join(', '));

// --- 3. kata yang tidak layak ditanyakan jenis katanya harus terdeteksi ----
const rxEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function forms(word) {
  const out = new Set();
  for (const raw of String(word || '').split('/')) {
    const b = raw.trim().toLowerCase();
    if (!b) continue;
    out.add(b);
    if (/\s/.test(b)) continue;
    for (const s of ['s', 'es', 'ed', 'ing', 'd', 'er', 'est', 'ly', 'ally']) out.add(b + s);
    if (b.endsWith('y')) { const s = b.slice(0, -1); ['ies', 'ied', 'ier', 'iest'].forEach(x => out.add(s + x)); }
    if (b.endsWith('e')) { const s = b.slice(0, -1); ['ing', 'ed', 'er', 'est'].forEach(x => out.add(s + x)); }
    if (/[^aeiou][aeiou][bdgklmnprt]$/.test(b)) { const c = b + b.slice(-1); ['ing', 'ed', 'er', 'est'].forEach(x => out.add(c + x)); }
  }
  return [...out];
}
const askable = v => {
  const example = String(v.example || '');
  if (!example || !map[String(v.partOfSpeech || '').toLowerCase()]) return false;
  return forms(v.word).some(f => new RegExp('(^|[^A-Za-z])' + rxEsc(f) + '([^A-Za-z]|$)', 'i').test(example));
};
const blocked = V.filter(v => !askable(v));
console.log('  info ' + blocked.length + ' kata dialihkan ke soal arti karena konteksnya tidak memadai');
check('mayoritas kosakata tetap bisa diuji jenis katanya',
  blocked.length < V.length * 0.1, blocked.length + '/' + V.length + ' terblokir');

// --- 4. judul lesson grammar wajib Bahasa Indonesia ------------------------
const TITLES = require('./grammar-labels-id.js').GRAMMAR_SKILL_TITLES_ID;
const templates = JSON.parse(fs.readFileSync(path.join(ROOT, 'grammar-templates.json'), 'utf8')).templates;
const subskills = [...new Set(templates.map(t => t.subskill))];
const noTitle = subskills.filter(s => !TITLES[s]);
check('setiap lesson grammar punya judul Bahasa Indonesia', noTitle.length === 0, noTitle.join(', '));

const rawTitles = Object.entries(TITLES).filter(([, v]) => /_/.test(v) || !/[a-z]/.test(v));
check('tidak ada judul yang masih berupa kunci mentah', rawTitles.length === 0, rawTitles.map(x => x[0]).join(', '));

check('friendlySkillName membaca peta judul Bahasa Indonesia',
  /GRAMMAR_SKILL_TITLES_ID\|\|\{\}\)\[key\]/.test(app),
  'tanpa ini kunci subskill Inggris kembali tampil sebagai judul lesson');

check('grammar-labels-id.js dimuat sebelum app.js', (() => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.indexOf('grammar-labels-id.js');
  const b = html.indexOf('src="./app.js"');
  return a > -1 && b > -1 && a < b;
})());

check('grammar-labels-id.js ikut di-precache service worker',
  fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("'./grammar-labels-id.js'"));

// --- 5. cadangan alasan jawaban tidak boleh Bahasa Inggris -----------------
check('cadangan alasan jawaban benar sudah Bahasa Indonesia',
  !/Correct: \$\{String\(t\.explanation/.test(app) && /Bentuk ini cocok dengan aturan grammar/.test(app));
check('cadangan alasan distraktor sudah Bahasa Indonesia',
  !/does not satisfy the grammar rule tested here/.test(app) && /belum memenuhi aturan grammar yang sedang diuji/.test(app));
check('penjelasan grammar mengutamakan field Bahasa Indonesia',
  /explanation\.ruleId/.test(app) && /explanation\.whyCorrectId/.test(app) && /explanation\.memoryCueId/.test(app),
  'grammarMeta harus membaca varian "...Id" lebih dulu');

// --- 6. seluruh isi bank grammar wajib punya penjelasan Bahasa Indonesia ---
const missingId = [];
for (const t of templates) {
  const ex = t.explanation || {};
  const pairs = [
    ['rule', ex.ruleId, ex.rule], ['whyCorrect', ex.whyCorrectId, ex.whyCorrect],
    ['whyOthersFail', ex.whyOthersFailId, ex.whyOthersFail],
    ['howToAvoid', ex.howToAvoidId, ex.howToAvoid], ['memoryCue', ex.memoryCueId, ex.memoryCue],
    ['objective', t.pedagogicalObjectiveId, t.pedagogicalObjective],
    ['misconception', t.misconceptionTargetedId, t.misconceptionTargeted],
    ['reasoning', t.reasoningOperationId, t.reasoningOperation],
  ];
  for (const [name, id, en] of pairs) if (en && !id) missingId.push(t.id + '.' + name);
  for (const d of t.distractors || []) {
    if (d.whyFails && !d.whyFailsId) missingId.push(t.id + '[' + d.option + '].whyFails');
    if (d.misconception && !d.misconceptionId) missingId.push(t.id + '[' + d.option + '].misconception');
  }
}
check('setiap penjelasan grammar punya versi Bahasa Indonesia',
  missingId.length === 0, missingId.slice(0, 8).join(', ') + (missingId.length > 8 ? ' (+' + (missingId.length - 8) + ')' : ''));

const coverage = JSON.parse(fs.readFileSync(path.join(ROOT, 'grammar-templates.json'), 'utf8')).indonesianCoverage;
check('penanda cakupan terjemahan ikut tercatat di bank soal',
  !!coverage && coverage.translated === coverage.total,
  coverage ? coverage.translated + '/' + coverage.total : 'tidak ada');

// Terjemahan hidup di berkas terpisah supaya bisa ditinjau; keduanya harus tetap seiring.
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'grammar-explanations-id.json'), 'utf8'));
const orphan = Object.keys(source.templates).filter(k => !templates.some(t => t.id === k));
check('semua terjemahan menunjuk template yang benar-benar ada', orphan.length === 0, orphan.join(', '));

console.log(failed ? '\nFAILED: ' + failed : '\nPASS');
process.exit(failed ? 1 : 0);
