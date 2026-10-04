#!/usr/bin/env node
'use strict';
/**
 * tests/grammar-ux-p3-2026-10-04-test.js — sisa audit UX sesi grammar (U13, U15 sampai U17) dan
 * temuan kontras dari probe ulang sesudah m025-458.
 *
 * Probe tools/dev/grammar-ux-audit-2026-10-04-probe.js diputar ulang dan menemukan:
 *   U13  toast pelajaran menutup pilihan jawaban di bawah layar;
 *   U15  simpul jalur di hub kosong (padding tombol umum membuat lingkarannya selebar 0);
 *   U16  chip "Sudah dicoba" 2,24:1;  U17  petunjuk keping QUEST 2,45:1;
 *   kalimat pegangan ingatan tutor kuning di kartu terang (1,19:1), kartu "Trik Cepat Ingat"
 *   cokelat di panel gelap (1,56:1), label "Daftar kata tersedia" (1,48:1), "PRASASTI BARU" (1,29:1),
 *   dua judul modal yang putih di atas putih (1:1), dan enam label kecil di bawah 4,5:1.
 * Gerbang ini menjaga aturannya ada DAN pasangan warna yang ditulisnya lolos 4,5:1.
 */
const fs = require('fs');
const path = require('path');

const __fzRoot = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(__fzRoot, 'features/ui/fiezel-tactile-clay.css'), 'utf8');
let pass = 0;
const fails = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS  ' + name); } else { fails.push(name); console.log('FAIL  ' + name + (detail ? ' :: ' + detail : '')); }
}
const lum = hex => { const n = parseInt(hex.slice(1), 16); return [16, 8, 0].map(s => (n >> s) & 255).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rule = sel => { const i = css.lastIndexOf(sel); if (i < 0) return ''; return css.slice(i, css.indexOf('}', i) + 1); };
const color = sel => (rule(sel).match(/[{;]color:(#[0-9A-Fa-f]{6})/) || [])[1];

check('U13 toast pelajaran pindah ke atas, tidak menutup pilihan jawaban', /body\.fz-lesson-mode \.toast,body:has\(\.quiz-shell\) \.toast\{top:[^}]*bottom:auto!important\}/.test(css));
check('U15 simpul jalur tanpa padding tombol umum, lingkarannya 34px', /\.path-step \.path-node\{padding:0!important;display:flex!important/.test(css) && /\.path-node \.path-ring\{width:34px!important;height:34px!important/.test(css));
check('U15 nomor pelajaran tampil lagi (fiezel-2.css menyembunyikannya)', /\.path-node \.path-ring > b\{display:block!important/.test(css) && /\.path-ring>b,body \.path-ring>i,body \.path-ring>svg\{display:none\}/.test(fs.readFileSync(path.join(__fzRoot, 'fiezel-2.css'), 'utf8')));
check('U15 ikon kunci, centang, dan ikon pil Ujian tampil dengan goresan warna induknya', /\.path-node \.path-ring > svg\{display:block!important/.test(css) && /\.exam-entry-chip > svg \*\{color:inherit!important;fill:none!important;stroke:currentColor!important\}/.test(css));
check('Judul modal Misi Kosakata dan judul kemenangan QUEST tidak lagi putih di atas putih', /html body \.gateway-header h2,[^{]*h2\.victory-headline\{color:#0F172A!important;-webkit-text-fill-color:#0F172A!important/.test(css));

const pairs = [
  ['U16 chip "Sudah dicoba"', 'html body .tried-tag{', '#E8EDF3'],
  ['U17 petunjuk keping QUEST', 'html body .puzzle-empty-hint{', '#FFFFFF'],
  ['Kalimat pegangan ingatan tutor di kartu terang', 'html body #tutorTurn .tutor-ladder p.tutor-turn-ask{', '#F8FAFC'],
  ['Judul "Trik Cepat Ingat"', 'html body .card .feedback-memory-box .feedback-memory-kicker{', '#FFF6DF'],
  ['Isi "Trik Cepat Ingat"', 'html body .card .feedback-memory-box .feedback-memory-content span{', '#FFF6DF'],
  ['Label "Daftar kata tersedia"', 'html body .gx-gloss-bar .token-bank-label{', '#FFFFFF'],
  ['Label "PRASASTI BARU"', 'html body .fz-prasasti-card .modal-mark{', '#FFFDF8'],
  ['Level aktif "A1" di Latihan', 'html body .active-level-control strong{', '#FFFFFF'],
  ['Badge "Misi Kosakata Kunci"', 'html body .gateway-badge{', '#E0F2FE'],
  ['Arti kosakata misi', 'html body .gw-meaning{', '#FFFFFF'],
  ['Label "Tahap N" QUEST', 'html body .stage-tag{', '#FFFFFF'],
  ['Badge "TATA BAHASA · A1"', 'html body #app .grammar-hero-badge{', '#FEF3C7'],
  ['Label "Petunjuk Guru" di panel gelap', 'html body #tutorTurn .tutor-turn-head b{', '#181826']
];
for (const [name, sel, bg] of pairs) {
  const fg = color(sel);
  const r = fg ? ratio(fg, bg) : 0;
  check(`${name} lolos 4,5:1`, r >= 4.5, `${fg} di atas ${bg} = ${r.toFixed(2)}`);
}
check('Kartu "Trik Cepat Ingat" berlatar krem padat (terbaca di panel terang maupun gelap)', /\.feedback-memory-box\{background:#FFF6DF!important/.test(css));

console.log(`\ngrammar-ux-p3-2026-10-04-test: ${pass}/${pass + fails.length} PASS`);
if (fails.length) { console.error('GAGAL: ' + fails.join(' | ')); process.exit(1); }
