#!/usr/bin/env node
'use strict';
/**
 * tests/grammar-lesson-rule-test.js — GERBANG INTRO MATERI MENGAJARKAN ATURANNYA (audit UI/UX F10)
 *
 *   R1  setiap template grammar punya aturan khusus topik dalam id (explanation.ruleId) dan th
 *       (grammar-explanations-th.json templates[id].rule) — intro tidak lagi jatuh ke strategi umum.
 *   R2  intro materi memakai grammarLessonRule() (aturan template), strategi keluarga hanya cadangan.
 *   R3  kartu latihan yang memajang kalimat contoh intro dipindah dari posisi soal 1.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok - ' + m); };

const templates = JSON.parse(read('grammar-templates.json')).templates;
const th = JSON.parse(read('grammar-explanations-th.json')).templates;
const noId = templates.filter((t) => !String((t.explanation || {}).ruleId || '').trim()).map((t) => t.id);
ok(noId.length === 0, 'R1 ' + templates.length + ' template punya aturan id' + (noId.length ? ' (kurang: ' + noId.slice(0, 5).join(', ') + ')' : ''));
const noTh = templates.filter((t) => !String((th[t.id] || {}).rule || '').trim()).map((t) => t.id);
ok(noTh.length === 0, 'R1 ' + templates.length + ' template punya aturan th' + (noTh.length ? ' (kurang: ' + noTh.slice(0, 5).join(', ') + ')' : ''));
const generic = new Set(templates.map((t) => t.explanation.ruleId));
ok(generic.size > templates.length * 0.5, 'R1 aturan beragam per topik (' + generic.size + ' aturan berbeda untuk ' + templates.length + ' template)');

const app = read('app.js');
ok(/function grammarLessonRule\(item\)\{try\{const r=String\(grammarMeta\(item\)\.rule/.test(app), 'R2 grammarLessonRule membaca aturan template lewat grammarMeta');
ok(/rule=grammarLessonRule\(item\),clue=grammarClue/.test(app), 'R2 intro materi memakai grammarLessonRule');
ok(/const exampleStem=String\(own\[0\]\?\.\[0\]/.test(app) && /if\(idx===0\)unique\.push\(unique\.shift\(\)\)/.test(app), 'R3 soal 1 bukan kalimat contoh intro');
console.log('FIEZEL grammar lesson rule: PASS (' + n + ')');
