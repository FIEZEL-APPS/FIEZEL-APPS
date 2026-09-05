'use strict';
/**
 * tools/generate-th-exam-writing.js — RAKIT SIDECAR TH UNTUK READING-EXAM & WRITING
 *
 * Kedua sidecar ini sudah ada sebelum commit ini, tetapi baru menutup lapisan luarnya:
 * `honesty`, label `formats`, dan `rubric`. Yang justru dibaca murid sepanjang sesi —
 * penjelasan tiap soal ujian (why / whyOthersFail) dan seluruh prompt menulis (id_hint,
 * focus, examTasks) — masih berbahasa Indonesia. Skrip ini menutup sisanya.
 *
 * Sumber terjemahannya peta KALIMAT UTUH di tools/th-strings/: satu entri = satu kalimat
 * sumber, bukan peta token. Penerjemah token adalah yang melahirkan kolase Thai+Indonesia di
 * listening (lihat docs/handoffs/THAI-BANK-PURITY-HANDOFF.md); pola itu sengaja tidak diulang.
 *
 * Idempoten, dan GAGAL KERAS saat menemui string yang belum terpeta — diam-diam melewatkannya
 * berarti membiarkan satu kalimat Indonesia lolos ke layar murid Thai, yaitu persis kegagalan
 * yang seluruh pekerjaan ini ada untuk mencegahnya.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { buildLexicon, residuIndonesia } = require(path.join(root, 'th-purity-lexicon.js'));

const LEKSIKON = buildLexicon(root);
const petaWriting = readJson('tools/th-strings/writing.json');
const petaFormat = readJson('tools/th-strings/reading-exam-format.json');
const petaExplain = readJson('tools/th-strings/reading-exam-explain.json');

const belumTerpeta = new Set();
/** Terjemahkan bila nilainya memang berbahasa Indonesia; nilai netral/Inggris dibiarkan. */
function th(nilai, peta, label) {
  const s = String(nilai == null ? '' : nilai).trim();
  if (!s) return '';
  if (!residuIndonesia(s, LEKSIKON).length) return s; // sudah netral bahasa (label, angka)
  const t = peta[s];
  if (!t) { belumTerpeta.add(label + ' :: ' + s); return s; }
  return t;
}

/* ------------------------------- reading-exam-th.json ------------------------------- */
const bankExam = readJson('reading-exam-v1.json');
const examTh = readJson('features/i18n/reading-exam-th.json');

examTh.formats = examTh.formats || {};
for (const [key, f] of Object.entries(bankExam.examFormats || {})) {
  const slot = examTh.formats[key] || (examTh.formats[key] = {});
  // label: nama ujian resmi ("IELTS Academic Reading") — nama diri, tidak diterjemahkan.
  if (f.label) slot.label = f.label;
  if (f.note) slot.note = th(f.note, petaFormat, 'format ' + key + '.note');
}

examTh.passages = {};
for (const p of bankExam.passages || []) {
  const questions = {};
  for (const q of p.questions || []) {
    const e = q.explain || {};
    const entry = {};
    if (e.why) entry.why = th(e.why, petaExplain, p.id + '.' + q.id + '.why');
    if (e.whyOthersFail) entry.whyOthersFail = th(e.whyOthersFail, petaExplain, p.id + '.' + q.id + '.whyOthersFail');
    if (Object.keys(entry).length) questions[q.id] = entry;
  }
  examTh.passages[p.id] = { questions };
}

/* ----------------------------- writing-prompts-th.json ------------------------------ */
const bankWriting = readJson('writing-prompts-v1.json');
const writingTh = readJson('features/i18n/writing-prompts-th.json');

writingTh.prompts = {};
for (const p of bankWriting.prompts || []) {
  const entry = {};
  // id_hint = terjemahan prompt Inggris ke bahasa murid; focus = label fokus tata bahasa.
  if (p.id_hint) entry.hint = th(p.id_hint, petaWriting, 'prompt ' + p.id + '.hint');
  if (p.focus) entry.focus = th(p.focus, petaWriting, 'prompt ' + p.id + '.focus');
  if (Object.keys(entry).length) writingTh.prompts[p.id] = entry;
}

// examTasks adalah PETA ber-kunci id ujian ('ielts_task2'), bukan larik ber-field id —
// membacanya sebagai larik menghasilkan kunci kosong dan seluruh examTask diam-diam terlewat.
const examTasks = Array.isArray(bankWriting.examTasks)
  ? bankWriting.examTasks.map((t) => [String((t && (t.id || t.task)) || ''), t])
  : Object.entries(bankWriting.examTasks || {});
writingTh.examTasks = {};
for (const [key, t] of examTasks) {
  if (!key || !t) continue;
  const entry = {};
  for (const [k, v] of Object.entries(t)) {
    if (typeof v !== 'string' || !residuIndonesia(v, LEKSIKON).length) continue;
    entry[k] = th(v, petaWriting, 'examTask ' + key + '.' + k);
  }
  if (Object.keys(entry).length) writingTh.examTasks[key] = entry;
}

// Rubrik: bentuk kriteria diubah dari daftar ke peta ber-id supaya overlay app.js bisa
// mencocokkan per kriteria, bukan per posisi (urutan bank boleh berubah tanpa merusak th).
writingTh.rubric = writingTh.rubric || {};
const kriteria = {};
for (const c of (bankWriting.rubric && bankWriting.rubric.criteria) || []) {
  const entry = {};
  if (c.label) entry.label = th(c.label, petaWriting, 'rubric ' + c.id + '.label');
  if (c.asks) entry.asks = th(c.asks, petaWriting, 'rubric ' + c.id + '.asks');
  if (Array.isArray(c.levels)) entry.levels = c.levels.map((l, i) => th(l, petaWriting, 'rubric ' + c.id + '.levels[' + i + ']'));
  kriteria[c.id] = entry;
}
writingTh.rubric.criteria = kriteria;

if (belumTerpeta.size) {
  console.error('BELUM TERPETA (' + belumTerpeta.size + ') — tambahkan ke tools/th-strings/:');
  [...belumTerpeta].slice(0, 20).forEach((s) => console.error('  ' + s));
  process.exit(1);
}

fs.writeFileSync(path.join(root, 'features/i18n/reading-exam-th.json'), JSON.stringify(examTh, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'features/i18n/writing-prompts-th.json'), JSON.stringify(writingTh, null, 2) + '\n');
console.log('reading-exam-th.json: ' + Object.keys(examTh.passages).length + ' bacaan, '
  + Object.values(examTh.passages).reduce((n, p) => n + Object.keys(p.questions).length, 0) + ' soal');
console.log('writing-prompts-th.json: ' + Object.keys(writingTh.prompts).length + ' prompt, '
  + Object.keys(writingTh.examTasks).length + ' examTask, ' + Object.keys(kriteria).length + ' kriteria rubrik');
