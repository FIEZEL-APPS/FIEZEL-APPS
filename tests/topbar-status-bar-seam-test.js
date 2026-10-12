/**
 * FIEZEL — gerbang "topbar terpotong" (m025-572).
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
 *   C. app.js memasang kelas .is-scrolled di header.topbar lewat listener scroll capture+pasif
 *      (jendela ATAU panel dalam #app), dan mencabutnya saat pindah layar - diuji bentuk DAN
 *      perilakunya di atas DOM tiruan;
 *   D. CSS memberi header.topbar.is-scrolled tepi (box-shadow bukan none);
 *   E. bukti negatif: tiap pemeriksaan di atas MERAH pada stub yang melanggar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

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
  assert.ok(/function syncTopbarScrolled\(source\)\{[\s\S]{0,400}?header\.topbar[\s\S]{0,400}?classList\.toggle\('is-scrolled'/.test(js),
    'syncTopbarScrolled(source) harus men-toggle .is-scrolled pada header.topbar');
  assert.ok(/document\.addEventListener\('scroll',[\s\S]{0,240}?syncTopbarScrolled\([\s\S]{0,60}?\{capture:true,passive:true\}/.test(js),
    'syncTopbarScrolled() harus dipanggil dari listener scroll document {capture:true,passive:true} - panel dalam #app tidak menggelembungkan scroll');
  assert.ok(/window\.scrollTo\(0,0\);syncTopbarScrolled\(\)\}\}/.test(js),
    'renderInner() harus memanggil syncTopbarScrolled() saat pindah layar agar tepi layar lama tidak tertinggal');
}

/* Perilaku, bukan hanya bentuk: fungsi aslinya dijalankan di atas DOM tiruan. */
function runSyncTopbarScrolled(js, scenario) {
  const m = js.match(/function syncTopbarScrolled\(source\)\{[\s\S]*?\n(?=try\{let topbarScrollRaf)/);
  assert.ok(m, 'badan syncTopbarScrolled tidak bisa diekstrak dari app.js');
  const classes = new Set(scenario.initial || []);
  const bar = { classList: { toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); } } };
  const appEl = { contains: (el) => !!el && el.insideApp === true };
  const ctx = {
    window: { scrollY: scenario.windowY || 0 },
    document: {
      documentElement: { scrollTop: scenario.windowY || 0 },
      querySelector: (sel) => (sel === 'header.topbar' ? bar : null),
      getElementById: (id) => (id === 'app' ? appEl : null)
    }
  };
  vm.runInNewContext(m[0] + '\nsyncTopbarScrolled(__src);', Object.assign(ctx, { __src: scenario.source }));
  return classes.has('is-scrolled');
}

function assertScrollBehaviour(js) {
  const pane = (top, extra) => Object.assign({ nodeType: 1, insideApp: true, scrollTop: top, scrollHeight: 2000, clientHeight: 600 }, extra || {});
  assert.strictEqual(runSyncTopbarScrolled(js, { windowY: 0 }), false, 'puncak jendela: tanpa tepi');
  assert.strictEqual(runSyncTopbarScrolled(js, { windowY: 300 }), true, 'jendela digulir: tepi muncul');
  assert.strictEqual(runSyncTopbarScrolled(js, { source: pane(250) }), true, 'panel dalam #app digulir (cangkang 100dvh): tepi muncul');
  assert.strictEqual(runSyncTopbarScrolled(js, { source: pane(0), initial: ['is-scrolled'] }), false, 'panel dalam kembali ke puncak: tepi hilang');
  assert.strictEqual(runSyncTopbarScrolled(js, { source: pane(0, { scrollHeight: 48, clientHeight: 48 }), initial: ['is-scrolled'] }), true,
    'penggulir horizontal (tinggi tak bisa digulir) tidak boleh mencabut tepi');
  assert.strictEqual(runSyncTopbarScrolled(js, { source: pane(400, { insideApp: false }) }), false,
    'penggulir di luar #app (modal, panel notifikasi) tidak boleh memasang tepi');
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

check('C1. app.js memasang .is-scrolled lewat scroll capture+pasif dan mereset saat pindah layar', () => assertScrollWiring(appJs));

check('C2. perilaku: jendela, panel dalam #app, penggulir horizontal, dan luar #app', () => assertScrollBehaviour(appJs));

check('D. header.topbar.is-scrolled punya tepi (box-shadow)', () => assertScrolledEdge(clayCss));

check('E. bukti negatif: gerbang MERAH pada stub yang melanggar', () => {
  const mustThrow = (label, fn) => assert.throws(fn, Error, 'stub "' + label + '" seharusnya merah');
  mustThrow('meta abu-abu', () => assert.strictEqual(
    metaThemeColor(indexHtml.replace(/(<meta name="theme-color" content=")#[0-9A-Fa-f]{6}/, '$1#F4EDE6')),
    topbarAuthorityBg(clayCss)));
  mustThrow('palet langit', () => assertNoSkyThemeColor(
    appJs.replace("setAttribute?.('content',TOPBAR_THEME_COLOR)", "setAttribute?.('content',c.palette.top)")));
  mustThrow('tanpa listener', () => assertScrollWiring(appJs.replace(/function syncTopbarScrolled\(source\)/, 'function _gone(source)')));
  mustThrow('listener di window saja', () => assertScrollWiring(appJs.replace("document.addEventListener('scroll',", "window.addEventListener('scroll',")));
  mustThrow('tanpa reset pindah layar', () => assertScrollWiring(appJs.replace('window.scrollTo(0,0);syncTopbarScrolled()}}', 'window.scrollTo(0,0)}}')));
  mustThrow('abai panel dalam', () => assertScrollBehaviour(appJs.replace('y=Math.max(y,source.scrollTop||0)', 'y=y')));
  mustThrow('horizontal mencabut tepi', () => assertScrollBehaviour(appJs.replace('if(source.scrollHeight<=source.clientHeight+1||', 'if(')));
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
