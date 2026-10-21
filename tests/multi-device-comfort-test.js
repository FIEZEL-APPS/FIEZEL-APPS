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
 *   E. Tata letak ADAPTIF per perangkat (m025-575; OWNER sesudah #605: "MULTI ADAPTIVE DEVICE
 *      UI NYA TIDAK BERFUNGSI" - #605 hanya melebarkan kolom HP):
 *        - 768-1023px: rail navigasi kiri 88px (ikon di atas label);
 *        - >=1024px: sidebar kiri 232px (baris ikon + label);
 *        - >=1100px: isi multi-kolom (Hari ini 2 kolom, Latihan/Perpustakaan 3 kolom,
 *          Progres statistik + detail);
 *        - lebar rail kembali 0 saat navigasi disembunyikan (kuis/pelajaran/sesi dengar);
 *        - pil aktif di app.js bergerak 2D saat navigasi vertikal;
 *      semuanya TANPA mengunci scroll 100dvh / overflow:hidden / height:100% (pelajaran
 *      #602/#603: scroll mati, kartu terjepit).
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
const appJs = read('app.js');

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

function adaptiveBlock(css) {
  const s = section15(css);
  const i = s.indexOf('15.8 ADAPTIF MULTI-DEVICE');
  assert.ok(i >= 0, 'blok "15.8 ADAPTIF MULTI-DEVICE" tidak ditemukan di Section 15');
  return s.slice(s.lastIndexOf('/*', i)); // mulai dari pembuka komentarnya, agar komentar bisa dibuang utuh
}

function mediaBodies(css, query) {
  // Isi setiap blok @media dengan kueri persis ini (kurung kurawal diseimbangkan).
  const out = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf('@media ' + query + ' {', from);
    if (at < 0) return out;
    let k = css.indexOf('{', at) + 1, depth = 1;
    const start = k;
    while (depth && k < css.length) { if (css[k] === '{') depth++; else if (css[k] === '}') depth--; k++; }
    out.push(css.slice(start, k - 1));
    from = k;
  }
}

const NAV = 'html body:not(.fz-teacher-mode) nav.bottomnav.bottomnav.bottomnav';

function assertAdaptiveLayout(css) {
  const a = adaptiveBlock(css);
  const tab = mediaBodies(a, '(min-width: 768px)').join('\n');
  const desk = mediaBodies(a, '(min-width: 1024px)').join('\n');
  const wide = mediaBodies(a, '(min-width: 1100px)').join('\n');
  assert.ok(/html body:not\(\.fz-teacher-mode\) \{[^}]*--fz-rail:\s*88px/.test(tab), '>=768px: --fz-rail harus 88px (rail tablet)');
  assert.ok(/html body:not\(\.fz-teacher-mode\) \{[^}]*--fz-rail:\s*232px/.test(desk), '>=1024px: --fz-rail harus 232px (sidebar desktop)');
  assert.ok(/fz-stage-quiz[^{]*\.quiz-shell[^{]*\{[^}]*--fz-rail:\s*0px !important/.test(tab),
    'saat kuis/pelajaran (navigasi disembunyikan) --fz-rail harus 0 agar isi tidak menyisakan lajur kosong');
  const navTab = rule(tab, new RegExp(NAV.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(navTab && /width:\s*var\(--fz-rail\) !important/.test(navTab) && /flex-direction:\s*column !important/.test(navTab) && /left:\s*0 !important/.test(navTab),
    '>=768px: navigasi harus rail kiri vertikal selebar --fz-rail (' + NAV + ')');
  const navDeskItem = rule(desk, new RegExp((NAV + ' .nav').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(navDeskItem && /flex-direction:\s*row !important/.test(navDeskItem), '>=1024px: item sidebar harus baris ikon + label');
  assert.ok(/main\.app\.app \{[^}]*padding-left:\s*var\(--fz-rail\) !important/.test(tab), 'isi (main.app) harus bergeser sebesar --fz-rail');
  assert.ok(/html body #app \{[^}]*max-width:\s*var\(--fz-col\) !important/.test(tab), 'kolom isi #app harus dibatasi --fz-col dengan spesifisitas (1,0,2)');
  assert.ok(/\.today-home-cockpit\.today-home-cockpit \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/.test(wide), '>=1100px: Hari ini harus 2 kolom');
  assert.ok(/\.learning-launcher\.learning-launcher[^{]*\{[^}]*repeat\(3, minmax\(0, 1fr\)\)/.test(wide), '>=1100px: Latihan harus 3 kolom');
  assert.ok(/fz-stage-map #app > section\.fade \{[^}]*grid-template-columns:\s*340px minmax\(0, 1fr\)/.test(wide), '>=1100px: Progres harus statistik + detail');
}

function assertPill2D(js) {
  const m = js.match(/function syncNavActivePill\(targetEl\)\{[^\n]*/);
  assert.ok(m, 'syncNavActivePill tidak ditemukan di app.js');
  const f = m[0];
  assert.ok(/getComputedStyle\(nav\)\.flexDirection==='column'/.test(f) && /translate3d\(\$\{left\}px,\$\{top\}px,0\)/.test(f),
    'pil aktif harus bergerak 2D (translate3d) saat navigasi vertikal (rail/sidebar)');
  assert.ok(/translateX\(\$\{left\}px\)/.test(f) && /removeProperty\('top'\)/.test(f), 'di dok HP pil tetap translateX dan tinggi/top dikembalikan ke CSS');
}

function assertNoViewportLock(css) {
  const s = section15(css).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/100dvh/.test(s), 'Section 15 tidak boleh memakai 100dvh - pelajaran #602 (scroll mati, kartu terjepit)');
  assert.ok(!/html[^{]*\{[^}]*overflow:\s*hidden/.test(s) && !/body[^{,]*\{[^}]*overflow:\s*hidden/.test(s),
    'Section 15 tidak boleh mengunci overflow html/body');
  assert.ok(!/height:\s*100%/.test(adaptiveBlock(css).replace(/\/\*[\s\S]*?\*\//g, '')),
    'tata letak adaptif tidak boleh memaku height:100% (kartu terjepit seperti #602)');
}

console.log('FIEZEL Multi-Device Comfort Gate:');
check('A. soal kuis di kartu terang bertinta gelap', () => assertQuiz(clay));
check('B. teks tebal kartu mewarisi warna kartu, dimuat sesudah mobile-edge-fit', () => assertCardInherit(clay, indexHtml));
check('C. teks redup kartu bukan #CBD5E1, pil gelap dikecualikan', () => assertMutedSource(edge, vivid));
check('D. petak hari kosong terang', () => assertWeekTiles(clay));
check('E1. adaptif: rail 768-1023, sidebar >=1024, multi-kolom >=1100, rail 0 saat kuis', () => assertAdaptiveLayout(clay));
check('E2. tanpa kunci viewport 100dvh / overflow hidden / height 100%', () => assertNoViewportLock(clay));
check('E3. pil aktif navigasi bergerak 2D di rail/sidebar', () => assertPill2D(appJs));

check('F. bukti negatif: gerbang MERAH pada stub yang melanggar', () => {
  const mustThrow = (label, fn) => assert.throws(fn, Error, 'stub "' + label + '" seharusnya merah');
  mustThrow('soal putih', () => assertQuiz(clay.replace(/(\.quiz-shell \.question-main:not\(\.quiz-bubble \*\):not\(\.quiz-stage \*\):not\(\.speech-bubble \*\)\s*\{\s*color:\s*)#241A11/, '$1#FFFFFF')));
  mustThrow('kartu putih', () => assertCardInherit(clay.replace('.card :is(h1, h2, h3, h4, b, strong) {\n  color: inherit !important;', '.card :is(h1, h2, h3, h4, b, strong) {\n  color: #FFFFFF !important;'), indexHtml));
  mustThrow('urutan muat terbalik', () => assertCardInherit(clay, indexHtml.replace('features/ui/mobile-edge-fit.css', 'x').replace('features/ui/fiezel-tactile-clay.css', 'features/ui/mobile-edge-fit.css').replace('x', 'features/ui/fiezel-tactile-clay.css')));
  mustThrow('redup lama', () => assertMutedSource(edge.replace(/(\n\.card p \{\s*color:\s*)#5B6472/, '$1#CBD5E1'), vivid));
  mustThrow('pil tak dikecualikan', () => assertMutedSource(edge, vivid.replace(':not([class*="pill"]):not(.prasasti-badge *)', '')));
  mustThrow('petak hitam', () => assertWeekTiles(clay.replace(/(html body \.fz2-day i \{\s*background:\s*)#F3EEE7/, '$1#181824')));
  mustThrow('tanpa rail', () => assertAdaptiveLayout(clay.replace('--fz-rail: 88px;', '--fz-rail: 0px;')));
  mustThrow('dok bawah di desktop', () => assertAdaptiveLayout(clay.replace(/(nav\.bottomnav\.bottomnav\.bottomnav \{[^}]*flex-direction:\s*)column/, '$1row')));
  mustThrow('rail tetap saat kuis', () => assertAdaptiveLayout(clay.replace('--fz-rail: 0px !important;', '--fz-rail: 88px !important;')));
  mustThrow('Latihan 2 kolom', () => assertAdaptiveLayout(clay.replace(/(\.learning-launcher\.learning-launcher[^{]*\{[^}]*)repeat\(3,/, '$1repeat(2,')));
  mustThrow('kunci tinggi 100%', () => assertNoViewportLock(clay + '\nhtml body #app > section.fade { height: 100% !important; }'));
  mustThrow('pil hanya horizontal', () => assertPill2D(appJs.replace("getComputedStyle(nav).flexDirection==='column'", 'false')));
  mustThrow('kunci 100dvh', () => assertNoViewportLock(clay + '\nhtml body { height: 100dvh !important; overflow: hidden !important; }'));
});

if (failures.length) {
  console.error('\nFAIL: ' + failures.length + ' invarian multi-device dilanggar:');
  failures.forEach((f) => console.error('  - ' + f.name + ': ' + f.error));
  process.exit(1);
}
console.log('\nHIJAU: ' + passCount + ' invarian multi-device terjaga.\n');
process.exit(0);
