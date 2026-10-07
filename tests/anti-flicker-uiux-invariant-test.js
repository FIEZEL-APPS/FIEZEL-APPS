#!/usr/bin/env node
/**
 * GERBANG PENJAGA INVARIAN UI/UX & ANTI-KEDIPAN PWA (tests/anti-flicker-uiux-invariant-test.js)
 *
 * ==============================================================================
 * KENAPA GERBANG INI WAJIB ADA (PENCEGAH REGRESI AGENT)
 * ==============================================================================
 * Pada m025-493 bug kedipan layar (white flash / double-blink) saat berganti tab
 * navigasi berhasil dieliminasi dengan mempertahankan kelas `.is-repaint` pada `#app`.
 * Namun pada m025-500 seorang agen menambahkan:
 *   (requestAnimationFrame || setTimeout)(() => appContainer.classList.remove('is-repaint'), 0);
 * dengan niat "menghidupkan kembali efek animasi masuk". Akibatnya fatal:
 * keyframe CSS .fade (`pageIn` 0.5s) dan `luxRise` langsung terpicu ulang dari opacity 0,
 * menjatuhkan layar ke putih di setiap perpindahan tab (regresi keras).
 *
 * Diperparah pada m025-501 di mana `header.topbar` diberi `view-transition-name: none !important;`
 * sehingga topbar larut (dissolve) dalam transisi root sementara bottomnav diam.
 * Kemudian pada m025-500 tombol pengaturan (`openSettings()`) disembunyikan dalam `display:none`.
 *
 * Gerbang ini mengunci SEMUA invarian ini secara permanen di CI:
 * 1. app.js: renderInner() WAJIB menyematkan `.is-repaint` dan DILARANG KERAS mencabutnya secara asinkron.
 * 2. app.js: go() DILARANG mencabut `.is-repaint` saat View Transition selesai.
 * 3. style.css & fiezel-lux.css: `.is-repaint` WAJIB mematikan animasi masuk (`animation: none !important`).
 * 4. fiezel-tactile-clay.css: `header.topbar` WAJIB memegang `view-transition-name: topbar !important;` (HARAM `none`),
 *    serta menonaktifkan animasi pada `::view-transition-old(topbar)` dan `::view-transition-new(topbar)`.
 * 5. fiezel-tactile-clay.css: `.bottomnav` WAJIB memegang `view-transition-name: bottomnav !important;`.
 * 6. Topbar Profile Settings Invariant: `#topSettingsBtn` WAJIB ada di index.html, memanggil `openSettings()`,
 *    dan diaktifkan di panel profil (`body.fz-view-profile`).
 * 7. Self-Test / Negative Proof: Gerbang ini membuktikan diri BISA MERAH jika ada kode tiruan yang melanggar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const luxCss = fs.readFileSync(path.join(ROOT, 'features', 'ui', 'fiezel-lux.css'), 'utf8');
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

console.log('FIEZEL Anti-Flicker & Shell UI/UX Invariant Gate:');

// 1. app.js: renderInner() is-repaint persistence
check('app.js: renderInner menyematkan is-repaint ke appContainer', () => {
  assert.ok(
    /appContainer\.classList\.add\(['"]is-repaint['"]\)/.test(appJs) ||
    /\$\('app'\)\.classList\.add\(['"]is-repaint['"]\)/.test(appJs),
    'appContainer.classList.add("is-repaint") wajib ada di renderInner()'
  );
});

check('app.js: renderInner DILARANG mencabut is-repaint secara asinkron', () => {
  assert.ok(
    !/classList\.remove\(['"]is-repaint['"]\)/.test(appJs),
    'app.js DILARANG memanggil classList.remove("is-repaint") yang memicu ulang animasi masuk pageIn/luxRise'
  );
});

check('app.js: go() DILARANG mencabut is-repaint pada penyelesaian View Transition', () => {
  const goMatch = appJs.match(/function go\([^)]*\)\s*\{[\s\S]*?return true\s*\}/);
  assert.ok(goMatch, 'fungsi go() wajib ditemukan');
  assert.ok(
    !goMatch[0].includes("classList.remove('is-repaint')") &&
    !goMatch[0].includes('classList.remove("is-repaint")'),
    'go() tidak boleh mencabut is-repaint'
  );
});

// 2. CSS Animation Suppression Invariant
check('style.css: .is-repaint wajib mematikan animasi pada #app, .fade, dan .card', () => {
  assert.ok(
    /#app\.is-repaint\s+\.fade[\s\S]*?animation:\s*none\s*!important/.test(styleCss) ||
    /\.is-repaint\s+\.fade[\s\S]*?animation:\s*none\s*!important/.test(styleCss),
    'style.css wajib memiliki aturan .is-repaint .fade { animation: none !important; }'
  );
});

check('fiezel-lux.css: tema Lux wajib mematikan luxRise pada .is-repaint', () => {
  assert.ok(
    /body\.fz-lux\s+#app\.is-repaint\s+\.fade>\*[\s\S]*?animation:\s*none\s*!important/.test(luxCss) ||
    /body\.fz-lux\s+\.is-repaint\s+\.fade>\*[\s\S]*?animation:\s*none\s*!important/.test(luxCss),
    'fiezel-lux.css wajib menonaktifkan luxRise saat .is-repaint aktif'
  );
});

// 3. Topbar View Transition Isolation
check('fiezel-tactile-clay.css: header.topbar wajib memiliki view-transition-name: topbar !important', () => {
  assert.ok(
    /header\.topbar[\s\S]*?view-transition-name:\s*topbar\s*!important/.test(clayCss) ||
    /\.topbar[\s\S]*?view-transition-name:\s*topbar\s*!important/.test(clayCss),
    'header.topbar wajib diisolasi dengan view-transition-name: topbar !important'
  );
});

check('fiezel-tactile-clay.css: header.topbar HARAM memakai view-transition-name: none', () => {
  assert.ok(
    !/header\.topbar[\s\S]*?view-transition-name:\s*none/i.test(clayCss),
    'header.topbar dilarang disetel view-transition-name: none karena menyebabkan dissolve glitch'
  );
});

check('fiezel-tactile-clay.css: ::view-transition-old(topbar) dan ::view-transition-new(topbar) wajib mematikan animasi', () => {
  assert.ok(
    /::view-transition-old\(topbar\)[\s\S]*?animation:\s*none\s*!important/.test(clayCss) &&
    /::view-transition-new\(topbar\)[\s\S]*?animation:\s*none\s*!important/.test(clayCss),
    'topbar view transition pseudo-elements wajib dimatikan animasinya agar tidak berkedip'
  );
});

// 4. Bottom Navigation View Transition Isolation
check('fiezel-tactile-clay.css: .bottomnav wajib memiliki view-transition-name: bottomnav !important', () => {
  assert.ok(
    /\.bottomnav[\s\S]*?view-transition-name:\s*bottomnav\s*!important/.test(clayCss),
    '.bottomnav wajib diisolasi dengan view-transition-name: bottomnav !important'
  );
});

// 5. Topbar Profile Settings Invariant
check('index.html: tombol #topSettingsBtn wajib ada, memanggil openSettings(), dan berlabel aksesibel', () => {
  assert.ok(
    /id="topSettingsBtn"/.test(indexHtml),
    'index.html wajib memuat elemen id="topSettingsBtn"'
  );
  assert.ok(
    /onclick="openSettings\(\)"/.test(indexHtml),
    'tombol pengaturan wajib memiliki handler onclick="openSettings()"'
  );
  assert.ok(
    /aria-label="Buka pengaturan"/.test(indexHtml),
    'tombol pengaturan wajib memiliki aria-label="Buka pengaturan"'
  );
});

check('index.html: #topSettingsBtn TIDAK BOLEH disembunyikan dalam display:none permanen di HTML', () => {
  const hiddenSlotMatch = indexHtml.match(/<div style="display:none;"[^>]*>([\s\S]*?)<\/div>/);
  if (hiddenSlotMatch) {
    assert.ok(
      !hiddenSlotMatch[1].includes('id="topSettingsBtn"'),
      '#topSettingsBtn tidak boleh terkubur di dalam preservation slot display:none'
    );
  }
});

check('fiezel-tactile-clay.css: #topSettingsBtn aktif pada panel profil (fz-view-profile)', () => {
  assert.ok(
    /body\.fz-view-profile\s+#topSettingsBtn[\s\S]*?display:\s*inline-flex\s*!important/.test(clayCss),
    'CSS wajib menampilkan #topSettingsBtn saat body memiliki kelas fz-view-profile'
  );
});

check('app.js: renderInner() menyelaraskan display #topSettingsBtn untuk panel profil', () => {
  assert.ok(
    /state\.view==='online'\|\|state\.view==='profile'/.test(appJs) &&
    /\btopSettingsBtn\b/.test(appJs),
    'app.js wajib mengatur visibilitas topSettingsBtn berdasarkan state.view profil'
  );
});

// 6. Negative Self-Test / Penjaga Bisa Merah
check('Negative Self-Test: validator wajib MENOLAK kode yang menghapus is-repaint atau mencabut topbar VT', () => {
  const badAppJs = appJs.replace(
    "appContainer.classList.add('is-repaint');",
    "appContainer.classList.remove('is-repaint');"
  );
  assert.ok(
    /classList\.remove\(['"]is-repaint['"]\)/.test(badAppJs),
    'stub kode buruk harus terdeteksi oleh regex anti-remove'
  );

  const badClayCss = clayCss.replace(
    'view-transition-name: topbar !important;',
    'view-transition-name: none !important;'
  );
  assert.ok(
    /header\.topbar[\s\S]*?view-transition-name:\s*none/i.test(badClayCss),
    'stub CSS buruk harus terdeteksi oleh regex anti-none'
  );

  const badHtml = indexHtml.replace('id="topSettingsBtn"', '');
  assert.ok(
    !/id="topSettingsBtn"/.test(badHtml),
    'stub HTML tanpa settings button harus terdeteksi'
  );
});

if (failures.length > 0) {
  console.error('\nFAIL: ' + failures.length + ' invarian UI/UX dilanggar:');
  failures.forEach(f => console.error('  - ' + f.name + ': ' + f.error));
  process.exit(1);
}

console.log('\nHIJAU: Seluruh ' + passCount + ' invarian UI/UX & anti-flicker PWA terjaga 100% PASS.\n');
process.exit(0);
