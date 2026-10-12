/**
 * FIEZEL — gerbang "topbar terpotong" (m025-573).
 *
 * OWNER: "KENAPA TAMPILAN UI PWA FIEZEL TAMPAK TERLIHAT TERPOTONG DI TOPBAR TIDAK SEPERTI
 * APLIKASI GENERIK?"
 *
 * OWNER (lanjutan): "KAMU TIDAK MEMPERBAIKI TOPBAR SAAT SPLASH ATAU BOOT PWA, KARENA MASIH
 * TAMPAK SEPERTI TERPOTONG"
 *
 * Akar, semuanya terukur di Chromium 393x852 dengan notch tiruan, bukan dugaan dari kode:
 *   1. Status bar HP digambar OS dengan meta theme-color. app.js dulu menimpanya dengan palet
 *      langit (#F4EDE6), lalu dengan satu warna topbar (#FDFAF3). Keduanya salah di saat
 *      berbeda: di app terang palet langit lebih gelap dari topbar, dan saat splash (#1B1418),
 *      layar masuk (hero #1B1418), serta tur (peredup .78) status bar krem memotong layar
 *      gelap. Kini theme-color mengikuti permukaan paling atas (statusBarSurfaceColor).
 *   2. "TOPBAR AUTHORITY" (fiezel-tactile-clay.css) mencabut garis dan bayangan topbar, dan
 *      latarnya nyaris sama dengan latar halaman. Saat di-scroll, kartu hilang di garis yang
 *      tidak terlihat - tampak terpotong.
 *
 * Gerbang ini menjaga:
 *   A. TOPBAR_THEME_COLOR = latar topbar TOPBAR AUTHORITY; warna awal index.html + manifest
 *      (theme_color dan background_color) = STATUS_BAR_CORE = medan splash .fiezel-splash-dark,
 *      karena splash adalah cat pertama setiap boot;
 *   B. app.js tidak menulis palet langit; updateCelestialClock memanggil syncStatusBarColor;
 *      observer memantau anak <body> + kelas <html>/<body> (splash/layar masuk/tur menempel
 *      di sana); perilaku statusBarSurfaceColor diuji di atas tumpukan elemen tiruan;
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

function appConst(js, name) {
  const m = js.match(new RegExp('const ' + name + "='(#[0-9A-Fa-f]{6})';"));
  assert.ok(m, 'const ' + name + ' tidak ditemukan di app.js');
  return norm(m[1]);
}

function splashCore(html) {
  const m = html.match(/\.fiezel-splash-dark\{background:(#[0-9A-Fa-f]{6})/);
  assert.ok(m, '.fiezel-splash-dark{background:#RRGGBB} tidak ditemukan di CSS kritis index.html');
  return norm(m[1]);
}

function assertStatusBarWiring(js) {
  assert.ok(!/meta\[name="theme-color"\]['"]\)\?*\.setAttribute\?*\.\(['"]content['"],\s*c\.palette/.test(js),
    'app.js menulis palet langit ke theme-color - status bar akan berbeda warna dari permukaan');
  const clock = (js.match(/function updateCelestialClock\(input=new Date\(\)\)\{[\s\S]*?\n\}/) || [''])[0];
  assert.ok(/syncStatusBarColor\(\)/.test(clock), 'updateCelestialClock harus memanggil syncStatusBarColor()');
  assert.ok(!/setAttribute\?*\.\(['"]content['"],\s*TOPBAR_THEME_COLOR\)/.test(clock),
    'updateCelestialClock tidak boleh memaku theme-color ke satu warna - splash/layar masuk/tur akan terpotong');
  assert.ok(/statusBarObserver\.observe\(document\.body,\{attributes:true,attributeFilter:\['class'\],childList:true\}\)/.test(js),
    'observer status bar harus memantau anak <body> (splash/layar masuk/tur) dan kelasnya');
  assert.ok(/statusBarObserver\.observe\(document\.documentElement,\{attributes:true,attributeFilter:\['class'\]\}\)/.test(js),
    'observer status bar harus memantau kelas <html> (fz-booting)');
}

/* Perilaku: statusBarSurfaceColor asli dijalankan di atas tumpukan elemen tiruan (urutan elementsFromPoint, atas ke bawah). */
function runSurface(js, stack, opts) {
  const m = js.match(/const TOPBAR_THEME_COLOR=[\s\S]*?\nlet statusBarRaf=0;/);
  assert.ok(m, 'blok TOPBAR_THEME_COLOR..statusBarSurfaceColor tidak bisa diekstrak dari app.js');
  const tour = opts && opts.tour ? { contains: (el) => el.inTour === true, display: 'block' } : null;
  const ctx = {
    window: { innerWidth: 393 },
    document: {
      querySelector: (sel) => (sel === '.fz-tour' ? tour : null),
      elementsFromPoint: () => stack
    },
    getComputedStyle: (el) => (el === tour ? { display: 'block' } : { backgroundColor: el.bg, opacity: el.opacity == null ? '1' : String(el.opacity), display: 'block' })
  };
  return vm.runInNewContext(m[0].replace(/\nlet statusBarRaf=0;$/, '') + '\nstatusBarSurfaceColor();', ctx);
}

function assertSurfaceBehaviour(js) {
  const T = 'rgb(253, 250, 243)', CORE = 'rgb(27, 20, 24)', BODY = 'rgb(251, 247, 243)';
  assert.strictEqual(runSurface(js, [{ bg: 'rgba(0, 0, 0, 0)' }, { bg: CORE }, { bg: BODY }]), '#1B1418', 'splash menutup puncak: status bar = #1B1418');
  assert.strictEqual(runSurface(js, [{ bg: CORE }, { bg: BODY }]), '#1B1418', 'hero layar masuk: status bar = #1B1418');
  assert.strictEqual(runSurface(js, [{ bg: 'rgba(0, 0, 0, 0)' }, { bg: T }, { bg: BODY }]), '#FDFAF3', 'app biasa: status bar = latar topbar');
  assert.strictEqual(runSurface(js, [{ bg: T }, { bg: BODY }], { tour: true }), '#3F3B3C', 'tur aktif: status bar = topbar di bawah peredup .78');
  assert.strictEqual(runSurface(js, [{ bg: 'rgba(0, 0, 0, 0.5)' }, { bg: T }]), '#7F7D7A', 'peredup modal 50%: dikomposit, bukan diabaikan');
  assert.strictEqual(runSurface(js, [{ bg: CORE, opacity: 0 }, { bg: T }]), '#FDFAF3', 'splash yang sudah pudar (opacity 0) tidak boleh menahan warna gelap');
  assert.strictEqual(runSurface(js, []), '#FDFAF3', 'tanpa elemen terbaca: cadangan latar topbar');
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

check('A1. TOPBAR_THEME_COLOR = latar topbar TOPBAR AUTHORITY', () => {
  const bar = topbarAuthorityBg(clayCss);
  assert.strictEqual(appConst(appJs, 'TOPBAR_THEME_COLOR'), bar, 'app.js TOPBAR_THEME_COLOR berbeda dari latar topbar ' + bar);
});

check('A2. warna awal (index.html, manifest theme/background) = STATUS_BAR_CORE = medan splash', () => {
  const core = splashCore(indexHtml);
  assert.strictEqual(appConst(appJs, 'STATUS_BAR_CORE'), core, 'STATUS_BAR_CORE berbeda dari .fiezel-splash-dark ' + core);
  assert.strictEqual(metaThemeColor(indexHtml), core, 'meta theme-color awal harus = medan splash ' + core + ' - splash adalah cat pertama');
  assert.strictEqual(norm(manifest.theme_color), core, 'manifest theme_color harus = medan splash ' + core);
  assert.strictEqual(norm(manifest.background_color), core, 'manifest background_color (splash OS Android) harus = medan splash ' + core + ' agar tidak berkedip krem->gelap');
});

check('B1. theme-color disinkronkan dari permukaan, bukan palet langit atau satu warna mati', () => assertStatusBarWiring(appJs));

check('B2. perilaku: splash, layar masuk, app, tur, peredup modal, splash pudar, cadangan', () => assertSurfaceBehaviour(appJs));

check('C1. app.js memasang .is-scrolled lewat scroll capture+pasif dan mereset saat pindah layar', () => assertScrollWiring(appJs));

check('C2. perilaku: jendela, panel dalam #app, penggulir horizontal, dan luar #app', () => assertScrollBehaviour(appJs));

check('D. header.topbar.is-scrolled punya tepi (box-shadow)', () => assertScrolledEdge(clayCss));

check('E. bukti negatif: gerbang MERAH pada stub yang melanggar', () => {
  const mustThrow = (label, fn) => assert.throws(fn, Error, 'stub "' + label + '" seharusnya merah');
  mustThrow('meta awal krem', () => assert.strictEqual(
    metaThemeColor(indexHtml.replace(/(<meta name="theme-color" content=")#[0-9A-Fa-f]{6}/, '$1#FDFAF3')),
    splashCore(indexHtml)));
  mustThrow('palet langit', () => assertStatusBarWiring(
    appJs.replace(/(function updateCelestialClock\(input=new Date\(\)\)\{[\s\S]*?)syncStatusBarColor\(\);/, "$1document.querySelector?.('meta[name=\"theme-color\"]')?.setAttribute?.('content',c.palette.top);")));
  mustThrow('satu warna mati', () => assertStatusBarWiring(
    appJs.replace(/(function updateCelestialClock\(input=new Date\(\)\)\{[\s\S]*?)syncStatusBarColor\(\);/, "$1document.querySelector?.('meta[name=\"theme-color\"]')?.setAttribute?.('content',TOPBAR_THEME_COLOR);")));
  mustThrow('observer tanpa anak body', () => assertStatusBarWiring(appJs.replace("attributeFilter:['class'],childList:true}", "attributeFilter:['class']}")));
  mustThrow('abaikan tur', () => assertSurfaceBehaviour(appJs.replace('if(tour&&getComputedStyle(tour).display!==\'none\')layers.push(STATUS_BAR_TOUR_SCRIM);', '')));
  mustThrow('abaikan opacity', () => assertSurfaceBehaviour(appJs.replace("const a=c.a*(cs.opacity===''?1:Number(cs.opacity));", 'const a=c.a;')));
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
