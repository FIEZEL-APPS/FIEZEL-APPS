/**
 * FIEZEL — gerbang kenyamanan multi-device (m025-574).
 *
 * OWNER: "COBA AUDIT UI DAN UX PWA FIEZEL PADA tampilan iPhone, Tablet/iPad, dan Desktop"
 *        lalu "KAMU PERBAIKI SEMUA, AGAR TAMPILAN DI MULTI DEVICE NYAMAN DI PANDANG MATA".
 *
 * Audit di Chromium pada 5 ukuran (iPhone SE 375, iPhone 15 393 + notch, iPad tegak 820,
 * iPad mendatar 1180, desktop 1440) menemukan, dan gerbang ini menjaga perbaikannya:
 *   A. Soal kuis TIDAK TERBACA di iPad mendatar/desktop (anchor maskot 'side' >=980px) dan
 *      ponsel mendatar (anchor 'peek'): #quizStem duduk di kartu terang, tetapi .question-main
 *      dipaku #FFFFFF. Aturan 15.1 mewarnai soal di luar gelembung gelap dengan tinta.
 *   B. Judul kartu hilang (Membaca, Menulis, Tes Level, Progres "Minggu ini"): mobile-edge-fit
 *      memaku `.card b/strong/h1-h4` #FFFFFF untuk tema kartu gelap yang sudah tidak ada.
 *      Aturan 15.2 membuatnya mewarisi warna kartu, DIMUAT SESUDAH mobile-edge-fit.
 *   C. Teks redup kartu #CBD5E1 (1,48:1 di putih) di mobile-edge-fit diganti #5B6472, dan
 *      pil gelap + lencana Prasasti dikecualikan (mobile-edge-fit dan vivid).
 *   D. Kotak hari "Minggu ini" kosong digambar hitam pekat -> petak terang.
 *   E. >=768px: kolom isi 720/760px (bukan kolom HP 440px), tab bawah jadi dok mengambang di
 *      tengah, topbar sejajar kolom isi - TANPA mengunci scroll 100dvh (pelajaran #602/#603).
 *   F. Bukti negatif: tiap pemeriksaan MERAH pada stub yang melanggar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const indexHtml = read('index.html');
const clay = read('features/ui/fiezel-tactile-clay.css');
const edge = read('features/ui/mobile-edge-fit.css');
const vivid = read('features/ui/fiezel-vivid.css');

let passCount = 0;
const failures = [];
function check(name, fn) {
  try { fn(); passCount++; console.log('  ok   ' + name); }
  catch (err) { failures.push({ name, error: err.message }); console.error('  FAIL ' + name + ': ' + err.message); }
}

function section15(css) {
  const i = css.indexOf('15. MULTI-DEVICE COMFORT');
  assert.ok(i >= 0, 'Section "15. MULTI-DEVICE COMFORT" tidak ditemukan di fiezel-tactile-clay.css');
  return css.slice(i);
}

function rule(css, selectorRe) {
  const m = css.match(new RegExp(selectorRe.source + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : null;
}

function assertQuiz(css) {
  const s = section15(css);
  const body = rule(s, /\.quiz-shell \.question-main:not\(\.quiz-bubble \*\):not\(\.quiz-stage \*\):not\(\.speech-bubble \*\)/);
  assert.ok(body, 'aturan soal kuis di luar gelembung gelap tidak ditemukan');
  const color = (body.match(/color:\s*(#[0-9A-Fa-f]{6})\s*!important/) || [])[1] || '';
  assert.ok(/^#2[0-9A-F]1A11$|^#241A11$/i.test(color), 'soal di kartu terang harus bertinta gelap (#241A11), bukan ' + (color || 'kosong'));
}

function assertCardInherit(css, html) {
  const s = section15(css);
  assert.ok(/\.card :is\(h1, h2, h3, h4, b, strong\)\s*\{\s*color:\s*inherit !important;/.test(s),
    'teks tebal kartu harus mewarisi warna kartu (.card :is(h1..strong){color:inherit!important})');
  const iEdge = html.indexOf('features/ui/mobile-edge-fit.css');
  const iClay = html.indexOf('features/ui/fiezel-tactile-clay.css');
  assert.ok(iEdge > 0 && iClay > iEdge, 'fiezel-tactile-clay.css harus dimuat SESUDAH mobile-edge-fit.css agar aturan setara-spesifisitas menang');
}

function assertMutedSource(edgeCss, vividCss) {
  const cardP = rule(edgeCss, /\n\.card p/);
  assert.ok(cardP && !/#CBD5E1/i.test(cardP), 'mobile-edge-fit `.card p` masih #CBD5E1 (1,48:1 di kartu putih)');
  const i = edgeCss.indexOf('.card > span:not([class*="lvl"]):not(.vocab-focus-word)');
  assert.ok(i >= 0, 'aturan span kartu mobile-edge-fit tidak ditemukan');
  const blk = edgeCss.slice(i, edgeCss.indexOf('}', i));
  assert.ok(!/#CBD5E1/i.test(blk), 'aturan span kartu mobile-edge-fit masih #CBD5E1');
  assert.ok(/:not\(\[class\*="pill"\]\):not\(\.prasasti-badge \*\)\s*\{/.test(blk), 'pil gelap/lencana Prasasti harus dikecualikan dari teks redup mobile-edge-fit');
  const j = vividCss.indexOf('html body:not(.fz-teacher-mode) .card:not(.quiz-shell *):not(.card-quiz *):not(#feedback *):not(.feedback *) > span');
  assert.ok(j >= 0, 'aturan span kartu vivid tidak ditemukan');
  const vblk = vividCss.slice(j, vividCss.indexOf('{', j));
  assert.strictEqual((vblk.match(/:not\(\[class\*="pill"\]\):not\(\.prasasti-badge \*\)/g) || []).length, 3,
    'ketiga selector teks redup vivid harus mengecualikan pil gelap dan lencana Prasasti');
}

function assertWeekTiles(css) {
  const s = section15(css);
  const body = rule(s, /html body \.fz2-day i/);
  assert.ok(body, 'aturan petak hari (html body .fz2-day i) tidak ditemukan');
  assert.ok(/background:\s*#F3EEE7 !important/i.test(body), 'petak hari kosong harus terang, bukan hitam pekat');
}

function wideBlock(css) {
  const s = section15(css);
  const i = s.indexOf('@media (min-width: 768px)');
  assert.ok(i >= 0, 'blok @media (min-width: 768px) tidak ditemukan di Section 15');
  return s.slice(i);
}

function assertWideLayout(css) {
  const w = wideBlock(css);
  assert.ok(/html body #app \{[^}]*max-width:\s*720px !important/.test(w), '>=768px: kolom isi #app harus 720px');
  assert.ok(/@media \(min-width: 1200px\)\s*\{\s*html body #app \{\s*max-width:\s*760px !important/.test(w), '>=1200px: kolom isi #app harus 760px');
  const nav = (w.match(/html\.fiezel-ui-v6 body\.fz-lux nav\.bottomnav,[^{]*\{([^}]*)\}/) || [])[1] || '';
  assert.ok(/left:\s*50% !important/.test(nav) && /transform:\s*translateX\(-50%\) !important/.test(nav) && /border-radius:\s*24px !important/.test(nav),
    '>=768px: tab bawah harus dok mengambang di tengah (left 50%, translateX(-50%), radius 24px) dengan spesifisitas html.fiezel-ui-v6 body.fz-lux');
  assert.ok(/padding-left:\s*max\(16px, calc\(50% - 344px\)\) !important/.test(w), '>=768px: isi topbar harus sejajar kolom isi (50% - 344px)');
}

function assertNoViewportLock(css) {
  const s = section15(css).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/100dvh/.test(s), 'Section 15 tidak boleh memakai 100dvh - pelajaran #602 (scroll mati, kartu terjepit)');
  assert.ok(!/html[^{]*\{[^}]*overflow:\s*hidden/.test(s) && !/body[^{,]*\{[^}]*overflow:\s*hidden/.test(s),
    'Section 15 tidak boleh mengunci overflow html/body');
}

console.log('FIEZEL Multi-Device Comfort Gate:');
check('A. soal kuis di kartu terang bertinta gelap', () => assertQuiz(clay));
check('B. teks tebal kartu mewarisi warna kartu, dimuat sesudah mobile-edge-fit', () => assertCardInherit(clay, indexHtml));
check('C. teks redup kartu bukan #CBD5E1, pil gelap dikecualikan', () => assertMutedSource(edge, vivid));
check('D. petak hari kosong terang', () => assertWeekTiles(clay));
check('E1. >=768px: kolom 720/760, dok tengah, topbar sejajar', () => assertWideLayout(clay));
check('E2. tanpa kunci viewport 100dvh / overflow hidden', () => assertNoViewportLock(clay));

check('F. bukti negatif: gerbang MERAH pada stub yang melanggar', () => {
  const mustThrow = (label, fn) => assert.throws(fn, Error, 'stub "' + label + '" seharusnya merah');
  mustThrow('soal putih', () => assertQuiz(clay.replace(/(\.quiz-shell \.question-main:not\(\.quiz-bubble \*\):not\(\.quiz-stage \*\):not\(\.speech-bubble \*\)\s*\{\s*color:\s*)#241A11/, '$1#FFFFFF')));
  mustThrow('kartu putih', () => assertCardInherit(clay.replace('.card :is(h1, h2, h3, h4, b, strong) {\n  color: inherit !important;', '.card :is(h1, h2, h3, h4, b, strong) {\n  color: #FFFFFF !important;'), indexHtml));
  mustThrow('urutan muat terbalik', () => assertCardInherit(clay, indexHtml.replace('features/ui/mobile-edge-fit.css', 'x').replace('features/ui/fiezel-tactile-clay.css', 'features/ui/mobile-edge-fit.css').replace('x', 'features/ui/fiezel-tactile-clay.css')));
  mustThrow('redup lama', () => assertMutedSource(edge.replace(/(\n\.card p \{\s*color:\s*)#5B6472/, '$1#CBD5E1'), vivid));
  mustThrow('pil tak dikecualikan', () => assertMutedSource(edge, vivid.replace(':not([class*="pill"]):not(.prasasti-badge *)', '')));
  mustThrow('petak hitam', () => assertWeekTiles(clay.replace(/(html body \.fz2-day i \{\s*background:\s*)#F3EEE7/, '$1#181824')));
  mustThrow('kolom HP', () => assertWideLayout(clay.replace(/(html body #app \{\s*max-width:\s*)720px/, '$1440px')));
  mustThrow('kunci 100dvh', () => assertNoViewportLock(clay + '\nhtml body { height: 100dvh !important; overflow: hidden !important; }'));
});

if (failures.length) {
  console.error('\nFAIL: ' + failures.length + ' invarian multi-device dilanggar:');
  failures.forEach((f) => console.error('  - ' + f.name + ': ' + f.error));
  process.exit(1);
}
console.log('\nHIJAU: ' + passCount + ' invarian multi-device terjaga.\n');
process.exit(0);
