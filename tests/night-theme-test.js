#!/usr/bin/env node
/**
 * GERBANG ANTI-REGRESI: PENGHAPUSAN MODE GELAP (Satu Tampilan Tunggal).
 *
 * OWNER: "HAPUS KAN SISTEM MODE GELAP"
 *
 * Gerbang ini memastikan sistem mode gelap benar-benar dicabut dari aplikasi:
 *   G1  style.css tidak memiliki media query prefers-color-scheme atau selektor data-theme="dark".
 *   G2  index.html memaku data-theme="light" pada <html> dan color-scheme="light" pada meta.
 *   G3  features/ui/fiezel-ui-manager.js mengunci tema ke 'light' dan tidak membaca prefers-color-scheme.
 *   G4  app.js tidak menyediakan baris pemilih tema di Pengaturan dan mengunci activeThemeMode ke 'light'.
 *   G5  features/tutor-classroom/tutor-v3.css tidak memiliki deklarasi tema gelap.
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__fzRoot, 'style.css'), 'utf8');
const INDEX = fs.readFileSync(path.join(__fzRoot, 'index.html'), 'utf8');
const UI = fs.readFileSync(path.join(__fzRoot, 'features/ui/fiezel-ui-manager.js'), 'utf8');
const APP = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
const TUTOR_CSS = fs.readFileSync(path.join(__fzRoot, 'features/tutor-classroom/tutor-v3.css'), 'utf8');

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

/* -- G1: style.css bebas dari aturan tema gelap --------------------------------------- */
{
  check(!/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/i.test(CSS),
    'G1a style.css tidak memiliki @media (prefers-color-scheme:dark)');
  check(!/\[\s*data-theme\s*=\s*["']dark["']\s*\]/i.test(CSS),
    'G1b style.css tidak memiliki selektor data-theme="dark"');
  check(!/--n-panel|--n-line|--n-text/.test(CSS),
    'G1c style.css tidak mendefinisikan token palet malam (--n-*)');
}

/* -- G2: index.html memaku tema terang ----------------------------------------------- */
{
  const htmlTag = (/<html[^>]*>/i.exec(INDEX) || [''])[0];
  check(/data-theme\s*=\s*["']light["']/i.test(htmlTag),
    'G2a index.html memaku data-theme="light" pada tag <html>',
    'tag aktual: ' + htmlTag);
  check(/<meta\s+name=["']color-scheme["']\s+content=["']light["']/i.test(INDEX),
    'G2b index.html menyatakan <meta name="color-scheme" content="light">');
}

/* -- G3: fiezel-ui-manager.js terkunci pada 'light' ---------------------------------- */
{
  check(/THEME_CHOICES\(\)\s*\{\s*return\s*\[\s*['"]light['"]\s*\];?\s*\}/.test(UI),
    'G3a THEME_CHOICES() hanya mengembalikan [\'light\']');
  check(/storedTheme\(\)\s*\{\s*return\s*['"]light['"];?\s*\}/.test(UI),
    'G3b storedTheme() mengembalikan \'light\'');
  check(/getCurrentTheme\(\)\s*\{\s*return\s*['"]light['"];?\s*\}/.test(UI),
    'G3c getCurrentTheme() mengembalikan \'light\'');
  check(!/prefers-color-scheme/i.test(UI),
    'G3d fiezel-ui-manager.js tidak membaca prefers-color-scheme');
  check(/root\.setAttribute\(['"]data-theme['"],\s*['"]light['"]\)/.test(UI),
    'G3e applyTheme memasang data-theme="light"');
}

/* -- G4: app.js tidak menampilkan opsi tema ----------------------------------------- */
{
  check(/function themeChoiceRowMarkup\(\)\s*\{\s*return '';?\s*\}/.test(APP),
    'G4a themeChoiceRowMarkup() mengembalikan string kosong');
  check(!/id="settingTheme"/.test(APP),
    'G4b app.js tidak lagi merender select id="settingTheme"');
  check(/function activeThemeMode\(\)\s*\{\s*return ['"]light['"];?\s*\}/.test(APP),
    'G4c activeThemeMode() terkunci ke \'light\'');
}

/* -- G5: tutor-v3.css bebas dari aturan tema gelap ----------------------------------- */
{
  check(!/prefers-color-scheme|data-theme="dark"/i.test(TUTOR_CSS),
    'G5 tutor-v3.css tidak memiliki aturan tema gelap');
}

console.log('');
if (failures) {
  console.error('FIEZEL night theme guard: FAIL (' + failures + ')');
  process.exit(1);
}
console.log('FIEZEL night theme guard: PASS');
