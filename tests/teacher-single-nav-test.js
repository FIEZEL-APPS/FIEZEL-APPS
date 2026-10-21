#!/usr/bin/env node
'use strict';
/**
 * tests/teacher-single-nav-test.js — GERBANG SATU LAPIS NAVIGASI RUANG GURU (audit UI/UX F25)
 *
 *   N1  tab hub disembunyikan di Ruang Guru (sidebar satu-satunya navigasi).
 *   N2  tujuan unik hub (hasil, saran otomatis, kurikulum) menjadi butir sidebar lewat
 *       data-hub-tab, dan klik nav memindahkan tab hub.
 *   N3  tidak ada label tumpang tindih: "Kelas & Siswa" / "Braincore" tidak lagi jadi label nav.
 *   N4  "Hapus kelas" di kartu hub berada di menu ⋯, tidak sejajar dengan aksi rutin.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const shell = read('features/teacher/fiezel-teacher-shell.js');
const css = read('features/teacher/teacher-shell.css');
const hub = read('features/class-hub/fiezel-class-hub.js');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok - ' + m); };

ok(/\.tg \.ch-tabs\.is-teacher\{display:none\}/.test(css), 'N1 tab hub disembunyikan di Ruang Guru');
const nav = shell.slice(shell.indexOf('function navItems()'), shell.indexOf('function hubTab()'));
for (const tab of ['hasil', 'braincore', 'kurikulum']) ok(nav.indexOf("'" + tab + "']") >= 0, 'N2 butir sidebar membuka tab hub ' + tab);
ok(/getAttribute\('data-hub-tab'\)/.test(shell) && /_teacherUi\(\)\.tab = btn\.getAttribute\('data-hub-tab'\)/.test(shell), 'N2 klik nav memindahkan tab hub');
ok(nav.indexOf("'Kelas & Siswa'") < 0 && nav.indexOf('Braincore') < 0, 'N3 label nav tidak tumpang tindih');
const labels = [...nav.matchAll(/t\('guru\.[a-z-]+', '([^']+)'\)/g)].map((m) => m[1]);
ok(new Set(labels).size === labels.length, 'N3 setiap label nav unik: ' + labels.join(' · '));
ok(/<details class="tg-more">[\s\S]{0,400}data-testid="tclass-delete-class"/.test(hub), 'N4 "Hapus kelas" di hub masuk menu ⋯');
console.log('FIEZEL teacher single-nav: PASS (' + n + ')');
