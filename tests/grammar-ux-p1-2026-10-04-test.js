#!/usr/bin/env node
'use strict';
/**
 * tests/grammar-ux-p1-2026-10-04-test.js — temuan prioritas 1 audit UX sesi grammar (U1 sampai U7).
 *
 * reports/GRAMMAR-SESSION-UX-AUDIT-2026-10-04.md memainkan pelajaran A1 sebagai murid dan menemukan
 * tujuh hal yang membuat murid tidak bisa membaca, salah paham, atau dirugikan nilainya. Gerbang ini
 * menjaga perbaikannya:
 *   U1  subtitle soal video terbaca (warna eksplisit) dan tidak membocorkan jawaban;
 *   U2  soal video hanya diambil dari skill pelajaran itu sendiri, perintahnya lewat i18n;
 *   U3  kartu Prasasti berlatar terang (bukan var(--bg) yang kini hampir hitam), tanpa tanda pisah;
 *   U4  petunjuk sebelum jawaban dibuka tidak memuat kunci jawabannya;
 *   U5  soal susun kata menampilkan kalimat tujuannya;
 *   U6  arti kosakata misi mengikuti locale murid;
 *   U7  tur pengenalan menunggu modal lain tertutup, dan judulnya terbaca.
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

const app = read('app.js');
const video = read('features/grammar/fiezel-grammar-video.js');
const bridge = read('features/grammar/grammar-vocab-bridge.js');
const tour = read('features/onboarding/fiezel-tour.js');
const style = read('style.css');

// U1
global.self = global;
require(path.join(__fzRoot, 'features/grammar/fiezel-grammar-video.js'));
const blank = self.FiezelGrammarVideo && self.FiezelGrammarVideo.blankAnswerInSubtitle;
const ex = { clozeText: 'I usually ___ coffee in the morning.', clozeAnswer: 'drink' };
check('U1 subtitle yang sama dengan kalimat soal terisi ditampilkan rumpang', typeof blank === 'function' && blank('I usually drink coffee in the morning.', ex) === ex.clozeText);
check('U1 subtitle lain tidak diubah', typeof blank === 'function' && blank('But today I want tea.', ex) === 'But today I want tea.');
check('U1 baris subtitle memakai warna teks eksplisit, bukan mewarisi', /color:#F1F5F9/.test(video) && !/background:var\(--panel, #0F172A\)/.test(video));
check('U1 kalimat "Video tidak tersedia" tidak lagi tampil ke murid', !/grammar\.video\.no-video/.test(video));
// U2
const vg = (app.match(/function getOrMakeVideoGrammarQuestion[\s\S]*?\n}\n/) || [''])[0];
check('U2 video hanya dari skill pelajaran itu sendiri', /x\.skill===skill\|\|x\.lessonSkill===skill/.test(vg) && !/x\.level===level/.test(vg) && !/bank\.find\(x=>!usedVgIds\.has\(x\.id\)\)/.test(vg));
check('U2 perintah soal video lewat i18n, bukan teks Inggris bank', /let stemQuestion = \(typeof FiezelI18n/.test(video));
// U3
check('U3 kartu Prasasti berlatar terang yang pasti', /\.fz-prasasti-card\{[^}]*background:#FFFDF8/.test(style));
const idD = read('features/i18n/copy-id-app-d.js'), thD = read('features/i18n/copy-th-app-d.js');
const line = (s, k) => (s.split('\n').find(l => l.includes("'" + k + "'")) || '');
check('U3 deskripsi Prasasti pertama tanpa tanda pisah (id dan th)', !/[–—]/.test(line(idD, 'prasasti.desc.lesson_pertama')) && !/[–—]/.test(line(thD, 'prasasti.desc.lesson_pertama')));
// U4
const TB = require(path.join(__fzRoot, 'features/brain/fiezel-tutor-brain.js'));
const leak = TB.composeTurn({ move: 'hint', scaffold: 'hint', correctAnswer: 'him', conceptLabel: 'x', explanation: { memoryCue: "'I see him', tapi 'he sees me'" } }, null, null);
check('U4 petunjuk pegangan ingatan yang memuat kunci tidak ditampilkan sebelum jawaban dibuka', !/\bhim\b/i.test(String(leak.ask)), String(leak.ask));
const fine = TB.composeTurn({ move: 'hint', scaffold: 'hint', correctAnswer: 'him', conceptLabel: 'x', explanation: { memoryCue: 'sesudah kata kerja pakai bentuk objek' } }, null, null);
check('U4 petunjuk yang tidak membocorkan tetap dipakai', /bentuk objek/.test(String(fine.ask)), String(fine.ask));
// U5
check('U5 soal susun kata menampilkan kalimat tujuannya', /grammar\.token-order-panduan/.test(app));
check('U5 kunci panduan ada di id dan th', /'grammar\.token-order-panduan':\s*'[^']*\{kalimat\}/.test(read('features/i18n/copy-id-grammar-labels.js')) && /'grammar\.token-order-panduan':\s*'[^']*[฀-๿][^']*\{kalimat\}/.test(read('features/i18n/copy-th-grammar-labels.js')));
// U6
check('U6 arti kosakata misi diambil dari bank yang sudah mengikuti locale', /bank\.find\(x => x && x\.id === d\.id\)/.test(bridge) && /meaning: v\.meaning/.test(bridge));
// U7
check('U7 tur ditunda selama ada modal lain terbuka', /reason: 'dialog_open'/.test(tour));
check('U7 judul tur dipaku putih (termasuk fill teks)', /\.fz-tour \.fz-tour-card h2\{color:#FFFFFF!important;-webkit-text-fill-color:#FFFFFF!important/.test(read('features/ui/fiezel-tactile-clay.css')));

console.log(`\ngrammar-ux-p1-2026-10-04-test: ${pass}/${pass + fails.length} PASS`);
if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
