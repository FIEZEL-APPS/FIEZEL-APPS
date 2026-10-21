#!/usr/bin/env node
'use strict';
/**
 * tests/braincore-wave4-concepts-remedial-test.js — dua kabel BrainCore terakhir dari audit
 * reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md.
 *
 *   D8  Belajar mandiri menampilkan keadaan ingatan per soal dari QuestionMemory: berapa sudah
 *       kuat, masih goyah, dan waktunya diulang. Butir yang "baru saja tampil" dibaca dari keadaan
 *       dasarnya, jadi tidak menyembunyikan kuat atau goyahnya.
 *   K4  Guru bisa membuat tugas remedial KHUSUS satu murid: dikirim hanya ke murid itu (targets),
 *       skill-nya skill bank yang paling lemah milik murid itu, ditambah skill yang ditunjuk
 *       pelajaran lemah dari BrainCore (past tense). Tanpa bukti, tombolnya tidak muncul.
 */
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(__fzRoot, p), 'utf8');
let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); } else { fails.push(name); console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')); }
}

global.self = global; global.window = global;
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };

// ---- D8 ----
require(path.join(__fzRoot, 'features/brain/fiezel-question-memory.js'));
const M = global.FiezelQuestionMemory;
const lfSrc = read('features/learner-flow/fiezel-learner-flow.js');
const body = name => { const i = lfSrc.indexOf('function ' + name + '('); if (i < 0) return ''; let j = lfSrc.indexOf('{', lfSrc.indexOf(')', i)), d = 0; for (; j < lfSrc.length; j++) { if (lfSrc[j] === '{') d++; else if (lfSrc[j] === '}' && !--d) break; } return lfSrc.slice(i, j + 1); };
// eslint-disable-next-line no-new-func
const conceptStates = new Function('QM', 'memoryOf', body('conceptStates') + '\nreturn conceptStates;')(() => M, st => st.qmem);
const now = Date.now();
let mem = M.emptyMemory();
const rec = (id, ok, at) => { mem = M.recordAttempt(mem, { item: id, skill: 'past_tense', marker: 'x', ok, at }); };
for (let i = 0; i < 4; i++) { rec('a' + i, true, now - 3 * 864e5); rec('a' + i, true, now - 2 * 864e5); }
for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rec('b' + i, false, now - 1000 * (j + 1));
rec('c0', true, now - 40 * 864e5); rec('c0', true, now - 39 * 864e5);
const c = conceptStates({ qmem: mem }, now);
check('D8 menghitung kuat, goyah, dan waktunya diulang dari QuestionMemory', c && c.kuat === 4 && c.goyah === 3 && c.ulang === 1 && c.total === 8, JSON.stringify(c));
check('D8 butir yang baru saja salah tetap terhitung goyah (bukan hilang sebagai "baru dilihat")', c && c.goyah === 3);
check('D8 baris ingatan soal tampil di Rencana hari ini, sebelum alasan sesi', /conceptStatesMarkup\(st\) \+\s*\n\s*'<p class="lf-reason" data-testid="lf-plan-reason">/.test(lfSrc) && /data-testid="lf-concept-states"/.test(lfSrc));
check('D8 baris disembunyikan sampai ada cukup bukti (minimal 5 soal)', /c\.total < 5/.test(body('conceptStatesMarkup')));

// ---- K4 ----
const hub = read('features/class-hub/fiezel-class-hub.js');
const hubBody = name => { const i = hub.indexOf('function ' + name + '('); if (i < 0) return ''; let j = hub.indexOf('{', hub.indexOf(')', i)), d = 0; for (; j < hub.length; j++) { if (hub[j] === '{') d++; else if (hub[j] === '}' && !--d) break; } return hub.slice(i, j + 1); };
const acc = { past_tense: 0.4, past_questions: 0.9, vocab_a2: 0.6, listening_detail: null, reading_inference: 0.8 };
// eslint-disable-next-line no-new-func
const remedialSkillsFor = new Function('T', 'bankSkills', hubBody('remedialSkillsFor') + '\nreturn remedialSkillsFor;')(
  () => ({ skillAcc: (s, k) => (s.acc || {})[k] == null ? null : s.acc[k] }),
  () => ['past_tense', 'past_questions', 'vocab_a2', 'listening_detail', 'reading_inference']);
check('K4 skill remedial = skill bank terlemah MILIK murid itu, urut dari yang paling lemah', JSON.stringify(remedialSkillsFor({ acc })) === '["past_tense","vocab_a2"]', JSON.stringify(remedialSkillsFor({ acc })));
check('K4 pelajaran lemah BrainCore yang menyangkut pertanyaan past menunjuk skill bank-nya', JSON.stringify(remedialSkillsFor({ acc: {}, braincore: { weak: ['past_questions_did_wh'] } })) === '["past_questions"]');
check('K4 murid tanpa bukti lemah tidak mendapat tombol (daftar kosong)', remedialSkillsFor({ acc: { past_tense: 0.95 }, braincore: { weak: ['subject_object_pronouns_and_possessives'] } }).length === 0);
check('K4 tombol remedial per murid ada di model BrainCore guru', /data-ch="remedial-murid" data-student="' \+ esc\(s\.id\) \+ '"/.test(hub));
check('K4 tugasnya hanya untuk murid itu (targets) dengan skill miliknya', /case 'remedial-murid':[^\n]*d\.skills = rs;[^\n]*d\.targets = \[sid\];/.test(hub));

// ---- bahasa ----
const pairs = [['features/i18n/copy-id-feat-d.js', 'features/i18n/copy-th-feat-d.js', ['flow.konsep-ringkas', 'flow.konsep-dahulu']], ['features/i18n/copy-id-classjoin.js', 'features/i18n/copy-th-classjoin.js', ['kelas.bc-remedial-murid', 'kelas.bc-remedial-judul']]];
const val = (src, k) => { const m = src.match(new RegExp("'" + k.replace(/[.-]/g, '\\$&') + "':\\s*'((?:[^'\\\\]|\\\\.)*)'")); return m ? m[1] : null; };
const ph = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
let bilingual = true, clean = true;
for (const [idF, thF, keys] of pairs) {
  const id = read(idF), th = read(thF);
  for (const k of keys) {
    const a = val(id, k), b = val(th, k);
    if (!a || !b || !/[฀-๿]/.test(b) || ph(a) !== ph(b)) bilingual = false;
    if (/[–—]|\b(BKT|IRT|FSRS|theta|probabilitas|taksonomi)\b/i.test(String(a) + ' ' + String(b))) clean = false;
  }
}
check('Setiap teks baru punya id dan th beraksara Thai dengan placeholder sama', bilingual);
check('Tanpa tanda pisah dan tanpa istilah mesin di teks baru', clean);

console.log(`\nbraincore-wave4-concepts-remedial-test: ${pass}/${pass + fails.length} PASS`);
if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
