#!/usr/bin/env node
'use strict';
/**
 * tests/braincore-wave3-reminder-analysis-test.js — Gelombang 3 audit kabel BrainCore (m025-463).
 *
 * D4  Jam belajar terbaik murid (studyWindows Core Brain) dipakai pengingat lunak: ulangan rawan lupa
 *     dan "kemarin belum belajar" boleh datang lebih awal di awal jam terbaik, hanya bila Core Brain
 *     yakin, tidak pernah lebih larut dari jadwal lama, dan jam tenang malam tetap berlaku.
 * D7  Tab Analisis Progres menampilkan peta kekeliruan antar-pelajaran dari matriks BrainCore.
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
const fnSrc = name => {
  const m = new RegExp('^function\\s+' + name + '\\s*\\(', 'm').exec(app);
  if (!m) return '';
  // Mulai dari kurung kurawal BADAN fungsi, bukan dari parameter bawaan seperti meta={}.
  const head = /\)\s*\{/g; head.lastIndex = m.index; const hm = head.exec(app);
  let i = hm ? hm.index + hm[0].length - 1 : app.indexOf('{', m.index), d = 0, j = i;
  for (; j < app.length; j++) { const c = app[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) break; } }
  return app.slice(m.index, j + 1);
};

// D4
const soft = fnSrc('alrsSoftHour');
const ctx = {};
vm.runInNewContext(soft + '; this.alrsSoftHour = alrsSoftHour;', ctx);
check('D4 tanpa jam terbaik yang meyakinkan, jadwal lama utuh', ctx.alrsSoftHour({ bestWindowFrom: null }, 18) === 18 && ctx.alrsSoftHour({}, 16) === 16);
check('D4 murid pagi diingatkan di awal jam terbaiknya', ctx.alrsSoftHour({ bestWindowFrom: 5 }, 18) === 5 && ctx.alrsSoftHour({ bestWindowFrom: 11 }, 16) === 11);
check('D4 pengingat tidak pernah digeser lebih larut dari jadwal lama', ctx.alrsSoftHour({ bestWindowFrom: 19 }, 16) === 16);
check('D4 jam terbaik hanya dipakai saat Core Brain yakin', /c\?\.confident&&Number\.isFinite\(from\)/.test(fnSrc('braincoreBestWindowFrom')) && /coreBrainSnapshot\(now\)\?\.chronotype/.test(fnSrc('braincoreBestWindowFrom')));
const decide = fnSrc('selectALRSDecision');
check('D4 dua pengingat lunak memakai jam terbaik', /ctx\.hour>=alrsSoftHour\(ctx,18\)\)\{kind='inactivity_1'/.test(decide) && /ctx\.hour>=alrsSoftHour\(ctx,16\)\)\{kind='due_review'/.test(decide));
check('D4 jam tenang malam tetap ditegakkan sebelum aturan lain', /ctx\.hour<ALRS_QUIET_END_HOUR\|\|ctx\.hour>=ALRS_QUIET_START_HOUR/.test(decide));
check('D4 konteks pengingat membawa jam terbaik', /bestWindowFrom:braincoreBestWindowFrom\(now\)/.test(app));
// D7
check('D7 tab Analisis menampilkan peta kekeliruan BrainCore', /analysis:`<div class="grid progress-grid">\n\s*\$\{[^}]*confusionInsightMarkup\(\)\}/.test(fnSrc('progress')));

console.log(`\nbraincore-wave3-reminder-analysis-test: ${pass}/${pass + fails.length} PASS`);
if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
