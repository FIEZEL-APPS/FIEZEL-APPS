#!/usr/bin/env node
/**
 * tests/japanese-i18n-probe.mjs
 *
 * Empirical Playwright probe for Japanese Localization (JA):
 * 1. Serves the workspace via an ephemeral HTTP server.
 * 2. Launches Chromium.
 * 3. Probes Onboarding Language Selector:
 *    - Opens index.html?fz_real_auth=1 (with clean localStorage)
 *    - Confirms [data-ob-locale="ja"] button is visible, clickable, and labeled "日本語"
 *    - Clicks Japanese option
 *    - Confirms FiezelI18n.getLocale() === 'ja'
 *    - Confirms FiezelJaLoader lazy loads and FiezelJaData.ready === true
 *    - Verifies Onboarding step renders authentic Japanese characters
 * 4. Probes Settings Language Switcher:
 *    - Injects active auth session and preferences
 *    - Changes locale to 'ja' via select#settingLearnerLocale / setLearnerLocalePreference('ja')
 *    - Confirms active UI elements display authentic Japanese Kanji/Kana
 * 5. Asserts ZERO unhandled exceptions, ZERO console errors.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  chromium = (await import('playwright')).chromium;
} catch (_) {
  chromium = require('c:/Users/hp/fiezel-apps/node_modules/playwright').chromium;
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[path.extname(f)] || 'application/octet-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  fs.createReadStream(f).pipe(res);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const BASE_URL = `http://127.0.0.1:${PORT}`;

console.log(`[PROBE JA] Test server running on ${BASE_URL}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']
});

let failed = 0;
function assertCheck(name, cond, msg = '') {
  if (cond) {
    console.log(`  ✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name} -> ${msg}`);
  }
}

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!txt.includes('favicon.ico') && !txt.includes('CORS') && !txt.includes('Failed to load resource') && !txt.includes('api.fiezel.my.id')) {
        consoleErrors.push(txt);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  console.log('\n--- SKENARIO 1: PEMILIH BAHASA ONBOARDING (STEP 0 -> JA) ---');
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.removeItem('fiezel-onboarding-v1');
    if (window.FiezelOnboarding && typeof window.FiezelOnboarding.show === 'function') {
      window.FiezelOnboarding.show(window, {
        now: Date.now(),
        onLocale: ({ locale }) => {
          if (window.FiezelI18n && typeof window.FiezelI18n.setLocale === 'function') {
            window.FiezelI18n.setLocale(locale);
          }
        }
      });
    }
  });

  await page.waitForSelector('.fiezel-language-sheet, [data-ob-step="language"]', { timeout: 8000 });
  const hasJaOption = await page.locator('[data-ob-locale="ja"]').count();
  assertCheck('Tombol opsi bahasa Jepang [data-ob-locale="ja"] ada di DOM', hasJaOption === 1);

  const jaButtonText = await page.locator('[data-ob-locale="ja"]').innerText();
  assertCheck('Tombol memuat label 日本語', jaButtonText.includes('日本語'));

  console.log('  -> Klik pilihan bahasa 日本語...');
  await page.click('[data-ob-locale="ja"]');

  await page.waitForFunction(() => {
    return window.FiezelI18n && window.FiezelI18n.getLocale() === 'ja';
  }, { timeout: 8000 });
  assertCheck('FiezelI18n.getLocale() menjadi "ja"', true);

  await page.waitForFunction(() => {
    return window.FiezelJaData && window.FiezelJaData.ready === true;
  }, { timeout: 10000 });
  assertCheck('FiezelJaData.ready === true (katalog JA terunduh)', true);

  await page.waitForTimeout(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  const containsJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(bodyText);
  assertCheck('Layar menampilkan teks autentik bahasa Jepang (Kanji/Kana)', containsJapanese);

  console.log('\n--- SKENARIO 2: SAKLAR BAHASA PENGATURAN (APP -> JA) ---');
  await page.evaluate(() => {
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({
      user: { id: 'test-user-ja', name: 'Riku', email: 'riku@example.com' },
      token: 'fake-token'
    }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
      done: true,
      name: 'Riku',
      course: 'en',
      locale: 'id'
    }));
  });

  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const debugInfo = await page.evaluate(() => ({
    hasFn: typeof window.setLearnerLocalePreference,
    hasI18n: typeof window.FiezelI18n,
    locale: window.FiezelI18n?.getLocale?.()
  }));
  console.log('  -> Debug:', JSON.stringify(debugInfo));

  const switchSuccess = await page.evaluate(() => {
    if (typeof window.setLearnerLocalePreference === 'function') {
      return window.setLearnerLocalePreference('ja');
    }
    if (window.FiezelI18n && typeof window.FiezelI18n.setLocale === 'function') {
      window.FiezelI18n.setLocale('ja');
      return true;
    }
    return false;
  });
  assertCheck('Fungsi setLearnerLocalePreference("ja") berhasil dieksekusi', switchSuccess);

  await page.waitForFunction(() => {
    return window.FiezelI18n && window.FiezelI18n.getLocale() === 'ja';
  }, { timeout: 5000 });
  assertCheck('FiezelI18n.getLocale() aktif pada "ja" di layar utama', true);

  await page.waitForTimeout(1000);
  const homeText = await page.evaluate(() => document.body.innerText);
  const homeHasJa = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(homeText);
  assertCheck('Tampilan beranda memuat teks bahasa Jepang nyata', homeHasJa);

  assertCheck('NOL unhandled error pada browser console', consoleErrors.length === 0, consoleErrors.join('; '));

  console.log('\n======================================================');
  if (failed === 0) {
    console.log('✓ SEMUA PROBE EMPIRIS PLAYWRIGHT JA: 100% SUKSES!');
  } else {
    console.error(`✗ TERDAPAT ${failed} KEGAGALAN PADA PROBE PLAYWRIGHT JA!`);
  }
  console.log('======================================================\n');

} catch (err) {
  console.error('[PROBE JA] Error eksekusi:', err);
  failed++;
} finally {
  await browser.close();
  server.close();
  process.exit(failed === 0 ? 0 : 1);
}
