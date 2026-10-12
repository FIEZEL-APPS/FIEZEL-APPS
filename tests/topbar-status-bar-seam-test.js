/**
 * FIEZEL — gerbang "topbar terpotong" (m025-570).
 *
 * OWNER: "KENAPA TAMPILAN UI PWA FIEZEL TAMPAK TERLIHAT TERPOTONG DI TOPBAR TIDAK SEPERTI
 * APLIKASI GENERIK?"
 *
 * Dua akar, keduanya terukur di Chromium 390 px, bukan dugaan dari membaca kode:
 *   1. Status bar HP digambar OS dengan meta theme-color. app.js menimpanya dengan palet
 *      langit (#F4EDE6) yang lebih gelap dari topbar (#FDFAF3), jadi puncak layar tampil dua
 *      pita warna dan topbar terlihat seperti potongan terpisah dari status bar.
 *   2. "TOPBAR AUTHORITY" (fiezel-tactile-clay.css) mencabut garis dan bayangan topbar, dan
 *      latarnya nyaris sama dengan latar halaman. Saat di-scroll, kartu hilang di garis yang
 *      tidak terlihat - tampak terpotong.
 *
 * Gerbang ini menjaga:
 *   A. theme-color di index.html, manifest.json, dan TOPBAR_THEME_COLOR di app.js SAMA
 *      dengan latar topbar di TOPBAR AUTHORITY;
 *   B. app.js tidak lagi menulis palet langit ke theme-color;
 *   C. app.js memasang kelas .is-scrolled di header.topbar lewat listener scroll pasif;
 *   D. CSS memberi header.topbar.is-scrolled tepi (box-shadow bukan none);
 *   E. bukti negatif: tiap pemeriksaan di atas MERAH pada stub yang melanggar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const clayCss = fs.readFileSync(path.join(ROOT, 'features', 'ui', 'fiezel-tactile-clay.css'), 'utf8');

let passCount = 0;
const failures = [];

function check(name, fn) {
  try {
    fn();
    passCount++;
    console.log('  ok   ' + name);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}

const norm = (hex) => String(hex || '').trim().toUpperCase();

function topbarAuthorityBg(css) {
  const start = css.indexOf('m025-501 TOPBAR AUTHORITY');
  assert.ok(start >= 0, 'blok "m025-501 TOPBAR AUTHORITY" tidak ditemukan di fiezel-tactile-clay.css');
  const block = css.slice(start, css.indexOf('}', start));
  const m = block.match(/background:\s*var\(--bgDay,\s*(#[0-9A-Fa-f]{6})\)\s*!important/);
  assert.ok(m, 'latar topbar di TOPBAR AUTHORITY harus berbentuk var(--bgDay, #RRGGBB) !important');
  return norm(m[1]);
}

function metaThemeColor(html) {
  const m = html.match(/<meta name="theme-color" content="(#[0-9A-Fa-f]{6})">/);
  assert.ok(m, 'meta theme-color tidak ditemukan di index.html');
  return norm(m[1]);
}

function appThemeColor(js) {
  const m = js.match(/const TOPBAR_THEME_COLOR='(#[0-9A-Fa-f]{6})';/);
  assert.ok(m, 'const TOPBAR_THEME_COLOR tidak ditemukan di app.js');
  return norm(m[1]);
}

function assertNoSkyThemeColor(js) {
  assert.ok(!/meta\[name="theme-color"\]['"]\)\?*\.setAttribute\?*\.\(['"]content['"],\s*c\.palette/.test(js),
    'app.js menulis palet langit ke theme-color - status bar akan berbeda warna dari topbar');
  assert.ok(/meta\[name="theme-color"\]['"]\)\?*\.setAttribute\?*\.\(['"]content['"],\s*TOPBAR_THEME_COLOR\)/.test(js),
    'app.js harus menulis TOPBAR_THEME_COLOR ke theme-color');
}

function assertScrollWiring(js) {
  assert.ok(/function syncTopbarScrolled\(\)\{[^}]*header\.topbar[^}]*classList\.toggle\('is-scrolled'/.test(js),
    'syncTopbarScrolled() harus men-toggle .is-scrolled pada header.topbar');
  assert.ok(/addEventListener\('scroll',[\s\S]{0,200}?syncTopbarScrolled\(\)[\s\S]{0,40}?\{passive:true\}/.test(js),
    'syncTopbarScrolled() harus dipanggil dari listener scroll {passive:true}');
}

function assertScrolledEdge(css) {
  const m = css.match(/html body header\.topbar\.is-scrolled[^{]*\{([^}]*)\}/);
  assert.ok(m, 'aturan html body header.topbar.is-scrolled tidak ditemukan');
  const shadow = (m[1].match(/box-shadow:\s*([^;]+);/) || [])[1] || '';
  assert.ok(shadow && !/^none/.test(shadow.trim()) && /!important/.test(shadow),
    'header.topbar.is-scrolled harus memberi box-shadow (bukan none) dengan !important');
}

console.log('FIEZEL Topbar & Status Bar Seam Gate:');

check('A. theme-color index.html = manifest.json = TOPBAR_THEME_COLOR = latar topbar', () => {
  const bar = topbarAuthorityBg(clayCss);
  assert.strictEqual(metaThemeColor(indexHtml), bar, 'index.html meta theme-color berbeda dari latar topbar ' + bar);
  assert.strictEqual(norm(manifest.theme_color), bar, 'manifest.json theme_color berbeda dari latar topbar ' + bar);
  assert.strictEqual(appThemeColor(appJs), bar, 'app.js TOPBAR_THEME_COLOR berbeda dari latar topbar ' + bar);
});

check('B. app.js tidak menulis palet langit ke theme-color', () => assertNoSkyThemeColor(appJs));

check('C. app.js memasang .is-scrolled di header.topbar lewat scroll pasif', () => assertScrollWiring(appJs));

check('D. header.topbar.is-scrolled punya tepi (box-shadow)', () => assertScrolledEdge(clayCss));

check('E. bukti negatif: gerbang MERAH pada stub yang melanggar', () => {
  const mustThrow = (label, fn) => assert.throws(fn, Error, 'stub "' + label + '" seharusnya merah');
  mustThrow('meta abu-abu', () => assert.strictEqual(
    metaThemeColor(indexHtml.replace(/(<meta name="theme-color" content=")#[0-9A-Fa-f]{6}/, '$1#F4EDE6')),
    topbarAuthorityBg(clayCss)));
  mustThrow('palet langit', () => assertNoSkyThemeColor(
    appJs.replace("setAttribute?.('content',TOPBAR_THEME_COLOR)", "setAttribute?.('content',c.palette.top)")));
  mustThrow('tanpa listener', () => assertScrollWiring(appJs.replace(/function syncTopbarScrolled\(\)/, 'function _gone()')));
  mustThrow('tepi none', () => assertScrolledEdge(
    clayCss.replace(/(html body header\.topbar\.is-scrolled[^{]*\{[^}]*box-shadow:\s*)[^;]+;/, '$1none !important;')));
});

if (failures.length > 0) {
  console.error('\nFAIL: ' + failures.length + ' invarian topbar/status bar dilanggar:');
  failures.forEach(f => console.error('  - ' + f.name + ': ' + f.error));
  process.exit(1);
}

console.log('\nHIJAU: ' + passCount + ' invarian topbar/status bar terjaga.\n');
process.exit(0);
