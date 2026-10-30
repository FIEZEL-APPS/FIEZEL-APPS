'use strict';
/**
 * FIEZEL PWA Standalone Ecosystem Test
 *
 * Memverifikasi bahwa seluruh permukaan ekosistem FIEZEL (baik root website/ mau pun /app/)
 * memenuhi standar PWA Standalone:
 * 1. website/manifest.json tersaji, valid JSON, start_url: '/app/', display: 'standalone'.
 * 2. website/index.html, website/th/index.html, dan website/install/index.html memiliki:
 *    - link rel="manifest"
 *    - meta mobile-web-app-capable & apple-mobile-web-app-capable
 *    - meta apple-mobile-web-app-title "FIEZEL"
 *    - Standalone redirect guard (mencegah user membuka web landing saat shortcut dibuka)
 *    - Service worker registration untuk /app/sw.js
 * 3. index.html dan manifest.json di /app/ memiliki konfigurasi standalone lengkap.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

// 1. Root website manifest.json
test('website/manifest.json harus ada dan valid JSON', () => {
  assert.ok(exists('website/manifest.json'), 'website/manifest.json wajib ada');
  const manifest = JSON.parse(read('website/manifest.json'));
  assert.strictEqual(manifest.id, '/app/', 'id harus /app/');
  assert.strictEqual(manifest.start_url, '/app/', 'start_url harus /app/');
  assert.strictEqual(manifest.scope, '/', 'scope harus /');
  assert.strictEqual(manifest.display, 'standalone', 'display harus standalone');
  assert.strictEqual(manifest.background_color, '#1B1418', 'background_color harus #1B1418');
  assert.strictEqual(manifest.theme_color, '#1B1418', 'theme_color harus #1B1418');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'icons minimal 2');

  for (const icon of manifest.icons) {
    const iconPath = path.join('website', icon.src);
    assert.ok(exists(iconPath), `Ikon ${icon.src} harus ada di disk (${iconPath})`);
  }
});

// 2. website/index.html
test('website/index.html harus memuat manifest dan standalone meta tags', () => {
  const html = read('website/index.html');
  assert.ok(/<link[^>]*rel=["']manifest["'][^>]*href=["']manifest\.json["']/i.test(html), 'link manifest wajib ada');
  assert.ok(/<meta[^>]*name=["']mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), 'mobile-web-app-capable yes');
  assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), 'apple-mobile-web-app-capable yes');
  assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-title["'][^>]*content=["']FIEZEL["']/i.test(html), 'apple-mobile-web-app-title FIEZEL');
  assert.ok(html.includes('(display-mode: standalone)'), 'standalone redirect guard wajib ada');
  assert.ok(html.includes("navigator.serviceWorker.register('app/sw.js'"), 'service worker /app/sw.js wajib diregistrasi');
});

// 3. website/th/index.html
test('website/th/index.html harus memuat manifest dan standalone meta tags', () => {
  const html = read('website/th/index.html');
  assert.ok(/<link[^>]*rel=["']manifest["']/i.test(html), 'link manifest wajib ada');
  assert.ok(/<meta[^>]*name=["']mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), 'mobile-web-app-capable yes');
  assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), 'apple-mobile-web-app-capable yes');
  assert.ok(html.includes('(display-mode: standalone)'), 'standalone redirect guard wajib ada');
  assert.ok(html.includes("navigator.serviceWorker.register('../app/sw.js'"), 'service worker ../app/sw.js wajib diregistrasi');
});

// 4. website/install/index.html & website/th/install/index.html
test('website install pages harus memuat manifest dan standalone meta tags', () => {
  for (const page of ['website/install/index.html', 'website/th/install/index.html']) {
    const html = read(page);
    assert.ok(/<link[^>]*rel=["']manifest["']/i.test(html), `link manifest wajib di ${page}`);
    assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), `apple-mobile-web-app-capable wajib di ${page}`);
    assert.ok(html.includes('(display-mode: standalone)'), `standalone redirect guard wajib di ${page}`);
  }
});

// 5. Root index.html & manifest.json
test('Root index.html & manifest.json harus konsisten standalone', () => {
  const html = read('index.html');
  assert.ok(/<link[^>]*rel=["']manifest["']/i.test(html), 'link manifest wajib di index.html');
  assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html), 'apple-mobile-web-app-capable wajib di index.html');
  assert.ok(/<meta[^>]*name=["']apple-mobile-web-app-title["'][^>]*content=["']FIEZEL["']/i.test(html), 'apple-mobile-web-app-title FIEZEL wajib di index.html');

  const manifest = JSON.parse(read('manifest.json'));
  assert.strictEqual(manifest.display, 'standalone', 'display harus standalone');
  assert.strictEqual(manifest.theme_color, '#1B1418', 'theme_color harus #1B1418');
  assert.strictEqual(manifest.background_color, '#1B1418', 'background_color harus #1B1418');
});

console.log(`\nSemua ${passCount} pengujian PWA Standalone Ecosystem PASS!`);
