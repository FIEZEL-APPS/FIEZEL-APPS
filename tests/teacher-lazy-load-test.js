#!/usr/bin/env node
'use strict';
/**
 * tests/teacher-lazy-load-test.js — GERBANG PEMUAT MALAS RUANG GURU (audit UI/UX F28)
 *
 *   L1  index.html tidak lagi memuat fiezel-teacher-shell.js / fiezel-teacher-curriculum.js
 *       saat boot; hanya fiezel-teacher-loader.js, sebelum app.js.
 *   L2  pemuat mengambil kurikulum LALU shell (shell membaca kurikulum saat diurai).
 *   L3  aturan previewAllowed() di pemuat identik dengan milik shell: isVerifiedTeacher()
 *       menanyakannya saat Home pertama digambar, sebelum shell penuh tiba.
 *   L4  semua pemanggil app.js tetap bekerja dengan stub: mount/render meneruskan, unmount
 *       aman, dan kegagalan unduh jatuh ke Tutor Action Center.
 *   L5  berkas malasnya tetap di precache sw.js (offline tetap bisa membuka Ruang Guru).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');

const html = read('index.html');
const loader = read('features/teacher/fiezel-teacher-loader.js');
const shell = read('features/teacher/fiezel-teacher-shell.js');
const app = read('app.js');
const sw = read('sw.js');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok - ' + m); };

ok(html.indexOf('features/teacher/fiezel-teacher-shell.js') < 0 && html.indexOf('features/teacher/fiezel-teacher-curriculum.js') < 0,
  'L1 shell & kurikulum guru tidak dimuat saat boot');
ok(html.indexOf('fiezel-teacher-loader.js') > 0 && html.indexOf('fiezel-teacher-loader.js') < html.indexOf('src="./app.js'),
  'L1 pemuat guru dimuat sebelum app.js');
ok(/BUNDLE = \['\.\/features\/teacher\/fiezel-teacher-curriculum\.js', '\.\/features\/teacher\/fiezel-teacher-shell\.js'\]/.test(loader),
  'L2 urutan bundel: kurikulum lalu shell');

const body = (src, name) => {
  const i = src.indexOf('function ' + name + '()');
  assert.ok(i >= 0, name + ' ditemukan');
  let depth = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(j, k + 1).replace(/\s+/g, ' ');
  }
  return '';
};
ok(body(loader, 'previewAllowed') === body(shell, 'previewAllowed'), 'L3 previewAllowed() pemuat identik dengan shell');
for (const probe of ["getItem('fz_teacher_mode') === '1'", "preferences.role === 'guru'", "acc.role === 'teacher'", "'Bu Sari'"]) {
  ok(loader.indexOf(probe) >= 0 && shell.indexOf(probe) >= 0, 'L3 isTeacherRole membawa aturan ' + probe);
}

ok(/mount: forward\('mount'\)/.test(loader) && /render: forward\('render'\)/.test(loader) && /unmount: function \(\) \{\}/.test(loader),
  'L4 stub meneruskan mount/render dan unmount aman');
ok(/mounted&&typeof mounted\.catch==='function'/.test(app), 'L4 app.js menangani kegagalan unduh shell (jatuh ke Tutor Action Center)');

ok(sw.indexOf('./features/teacher/fiezel-teacher-shell.js') >= 0 && sw.indexOf('./features/teacher/fiezel-teacher-curriculum.js') >= 0 &&
  sw.indexOf('./features/teacher/fiezel-teacher-loader.js') >= 0, 'L5 shell, kurikulum, dan pemuat ada di precache');

console.log('FIEZEL teacher lazy-load: PASS (' + n + ')');
