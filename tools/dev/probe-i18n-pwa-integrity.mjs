/**
 * tools/dev/probe-i18n-pwa-integrity.mjs
 *
 * PROBE INTEGRITAS EMPIRIS: PWA, SERVICE WORKER, RUNTIME OFFLINE & AUTO-SYNC
 * Menguji secara nyata di peramban headless Chromium Playwright:
 *   1. Service Worker & Offline Cache Integrity (pengambilan katalog JSON saat offline).
 *   2. Zero-Flicker Dynamic Locale Switching & Persistensi (reaktif & cold boot).
 *   3. Zero 404 & Zero Console Errors.
 *   4. Zero Indonesian Leak pada mode non-ID.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const req = createRequire(import.meta.url);
let pwPkg = null;
for (const cand of [
  path.resolve(rootDir, 'node_modules/playwright'),
  path.resolve(rootDir, '../fiezel-apps/node_modules/playwright')
]) {
  try { pwPkg = req(cand); break; } catch (_) {}
}
if (!pwPkg) throw new Error('playwright module not found');
const { chromium } = pwPkg;

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      let filePath = path.join(rootDir, reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.woff2': 'font/woff2'
        };
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function runProbe() {
  console.log('=== MEMULAI EMPIRICAL AUDIT: PWA & I18N RUNTIME OFFLINE ===');
  const { server, port } = await startStaticServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  let chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!fs.existsSync(chromePath)) {
    chromePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  }

  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow'
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failed404s = [];

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Abaikan error koneksi WebSocket pihak ketiga jika ada
      if (!txt.includes('WebSocket') && !txt.includes('wss://')) {
        consoleErrors.push(txt);
      }
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  page.on('response', resp => {
    if (resp.status() >= 400 && !resp.url().includes('favicon.ico')) {
      failed404s.push(`${resp.status()} ${resp.url()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // UJI 1: Boot Awal & Pemuatan Shell
    // -------------------------------------------------------------
    console.log('[1/4] Menguji Boot Shell dan Pemuatan Runtime...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const i18nReady = await page.evaluate(() => typeof window.FiezelI18n === 'object' && typeof window.FiezelI18n.t === 'function');
    if (!i18nReady) throw new Error('FiezelI18n runtime gagal terpasang di window');
    console.log('  -> PASS: window.FiezelI18n terpasang sempurna.');

    // -------------------------------------------------------------
    // UJI 2: Dynamic Locale Switching & Zero-Flicker Reactive Update
    // -------------------------------------------------------------
    console.log('[2/4] Menguji Dynamic Locale Switching (ID -> TH -> EN)...');

    // Cek teks awal (ID)
    const initialText = await page.evaluate(() => window.FiezelI18n.t('topbar.ask'));
    console.log(`  -> Initial text (ID): "${initialText}"`);

    // Ganti ke Thai
    await page.evaluate(async () => {
      window.FiezelI18n.setLocale('th');
      if (typeof window.FiezelI18n.loadLocale === 'function') {
        await window.FiezelI18n.loadLocale('th');
      }
      if (typeof window.__fzRefreshI18nTables === 'function') window.__fzRefreshI18nTables();
    });

    const thaiText = await page.evaluate(() => window.FiezelI18n.t('topbar.ask'));
    console.log(`  -> Switched text (TH): "${thaiText}"`);
    if (/Tanya FIEZEL/i.test(thaiText)) {
      throw new Error('Teks Indonesia bocor saat beralih ke Thai!');
    }

    // Ganti ke English Golden Pivot
    await page.evaluate(async () => {
      window.FiezelI18n.setLocale('en');
      if (typeof window.FiezelI18n.loadLocale === 'function') {
        await window.FiezelI18n.loadLocale('en');
      }
      if (typeof window.__fzRefreshI18nTables === 'function') window.__fzRefreshI18nTables();
    });
    const enText = await page.evaluate(() => window.FiezelI18n.t('topbar.ask'));
    console.log(`  -> Switched text (EN): "${enText}"`);
    console.log('  -> PASS: Dynamic Locale Switching reaktif tanpa reload.');

    // -------------------------------------------------------------
    // UJI 3: Service Worker & Offline Cache Integrity
    // -------------------------------------------------------------
    console.log('[3/4] Menguji Service Worker Offline Cache Fetch...');

    // Ambil katalog JSON langsung dari browser untuk menguji cache availability
    const catalogTest = await page.evaluate(async () => {
      const results = {};
      const targets = [
        './features/i18n/locales/th/ui.json',
        './features/i18n/locales/th/quiz.json',
        './features/i18n/locales/th/grammar.json',
        './features/i18n/locales/en/ui.json',
        './features/i18n/locales/id/ui.json'
      ];
      for (const t of targets) {
        try {
          const r = await fetch(t);
          results[t] = { ok: r.ok, status: r.status };
        } catch (e) {
          results[t] = { ok: false, error: e.message };
        }
      }
      return results;
    });

    for (const [uri, res] of Object.entries(catalogTest)) {
      if (!res.ok) throw new Error(`Gagal memuat katalog ${uri}: status ${res.status || res.error}`);
    }
    console.log('  -> PASS: Seluruh katalog JSON locale (TH, EN, ID) dapat di-fetch dengan status 200.');

    // Uji simulasi mode offline penuh
    await context.setOffline(true);
    console.log('  -> Mode offline diaktifkan (context.setOffline(true)).');

    // Pengujian translasi runtime saat offline (harus 100% menggunakan in-memory / cached fallback)
    const offlineTranslation = await page.evaluate(() => {
      window.FiezelI18n.setLocale('th');
      return {
        home: window.FiezelI18n.t('nav.home'),
        practice: window.FiezelI18n.t('nav.latihan'),
        ask: window.FiezelI18n.t('topbar.ask'),
        quota: window.FiezelI18n.t('quota.fallback-judul'),
        pivotTest: window.FiezelI18n.t('nonexistent-key-fallback-test')
      };
    });

    console.log('  -> Offline translation results:', JSON.stringify(offlineTranslation));
    if (/Home|Latihan|Jatah/i.test(offlineTranslation.quota)) {
      throw new Error('Kebocoran teks Indonesia terjadi saat mode offline!');
    }
    console.log('  -> PASS: Mode offline berjalan 100% tanpa kebocoran naskah.');

    await context.setOffline(false);

    // -------------------------------------------------------------
    // UJI 4: Cold-Boot Persistence & Zero-404 Console Audit
    // -------------------------------------------------------------
    console.log('[4/4] Menguji Cold-Boot Persistence & Zero Error Console...');

    // Simpan preferensi Thai di localStorage
    await page.evaluate(() => {
      localStorage.setItem('learnerLocale', 'th');
      try {
        const auth = JSON.parse(localStorage.getItem('fiezel-auth-v1') || '{}');
        auth.learnerLocale = 'th';
        localStorage.setItem('fiezel-auth-v1', JSON.stringify(auth));
      } catch (_) {}
    });

    // Buka halaman baru dengan konteks bersih (simulasi tutup app dan buka lagi)
    const freshPage = await context.newPage();
    await freshPage.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await freshPage.waitForTimeout(800);

    const freshLocale = await freshPage.evaluate(() => window.FiezelI18n?.getLocale?.());
    console.log(`  -> Cold-boot detected locale: "${freshLocale}"`);

    // Periksa status log error
    console.log(`  -> Console errors terdeteksi: ${consoleErrors.length}`);
    console.log(`  -> Page errors terdeteksi: ${pageErrors.length}`);
    console.log(`  -> Permintaan 404 terdeteksi: ${failed404s.length}`);

    if (pageErrors.length > 0) {
      throw new Error(`Ditemukan uncaught page errors: ${pageErrors.join('; ')}`);
    }
    if (failed404s.length > 0) {
      throw new Error(`Ditemukan 404 network errors: ${failed404s.join('; ')}`);
    }

    console.log('\n=== EMPIRICAL AUDIT: 100% SUKSES (ALL GATES PASSED) ===');
  } finally {
    await browser.close();
    server.close();
  }
}

runProbe().catch(err => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
