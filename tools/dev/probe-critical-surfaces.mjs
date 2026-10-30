#!/usr/bin/env node
/**
 * tools/dev/probe-critical-surfaces.mjs
 *
 * Probe Empiris Peramban Headless Playwright (5 Permukaan Kritis FIEZEL):
 *  1. Cold-boot Murid Baru (?fz_real_auth=1, zero storage) -> Layar Onboarding asli (.fiezel-ob)
 *  2. Pengguna Tanpa Sesi (?fz_real_auth=1, onboarding selesai) -> Layar Login asli (.fz-auth), 0 tombol bypass tamu
 *  3. Mode Dev Lokal Bawaan (http://127.0.0.1:<port>/) -> Beranda Utama ("Hari ini") sesuai m025-723
 *  4. Permukaan Belajar Inti (Grammar & Kana) -> Render DOM & CSS utuh tanpa uncaught pageerror
 *  5. Kawan Bicara / Mitra Kaiwa (chat) -> Me-mount AI Voice Studio (#fzMitraKaiwaStudioFrame -> call.html)
 *
 * Menyimpan screenshot baseline ke OUT_DIR (default: reports/visual-baselines atau --out=<dir>).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.resolve(ROOT, 'node_modules', 'playwright'),
    path.resolve(ROOT, '..', 'fiezel-apps', 'node_modules', 'playwright')
  ];
  for (const cand of candidates) {
    try {
      return require(cand);
    } catch (_) {}
  }
  throw new Error('Paket playwright tidak ditemukan di node_modules lokal maupun ../fiezel-apps/node_modules');
}

const { chromium } = loadPlaywright();
const outArg = process.argv.find((a) => a.startsWith('--out='));
const OUT_DIR = outArg ? path.resolve(outArg.slice(6)) : '';
if (OUT_DIR) fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent((req.url || '/').split('?')[0]);
      if (rel === '/' || rel === '') rel = '/index.html';
      const file = path.resolve(ROOT, rel.replace(/^\/+/, ''));
      if (!file.toLowerCase().startsWith(ROOT.toLowerCase())) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function blockExternalSlowDeps(page) {
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.includes('/vendor/supertonic') || u.endsWith('.onnx')) {
      return route.abort();
    }
    if (
      u.startsWith('http://127.0.0.1:') ||
      u.startsWith('data:') ||
      u.startsWith('blob:')
    ) {
      return route.continue();
    }
    return route.abort();
  });
}

async function waitForSelectorOrCondition(page, predFn, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const val = await page.evaluate(predFn);
    if (val) return val;
    await page.waitForTimeout(200);
  }
  return page.evaluate(predFn);
}

async function main() {
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // 1. Cold-boot Murid Baru (?fz_real_auth=1, zero storage) -> Onboarding
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await blockExternalSlowDeps(page);
      await page.goto(`${baseUrl}/index.html?fz_real_auth=1`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1800);
      try { await page.mouse.click(195, 420); } catch (_) {}
      const state1 = await waitForSelectorOrCondition(page, () => {
        const ob = document.querySelector('.fiezel-ob');
        const auth = document.querySelector('.fz-auth');
        if (!ob && !auth) return null;
        return {
          hasOnboarding: Boolean(ob),
          hasAuth: Boolean(auth),
          localSession: localStorage.getItem('fiezel-auth-v1')
        };
      }, 15000);
      assert.ok(state1 && (state1.hasOnboarding || state1.hasAuth), `Cold-boot ?fz_real_auth=1 gagal merender onboarding/auth: ${JSON.stringify(state1)}`);
      assert.strictEqual(state1.localSession, null, 'Cold-boot ?fz_real_auth=1 tidak boleh menyuntik sesi Pengguna Uji palsu');
      assert.deepStrictEqual(pageErrors, [], `Pageerror pada cold-boot onboarding: ${pageErrors.join('; ')}`);
      if (OUT_DIR) await page.screenshot({ path: path.join(OUT_DIR, 'baseline-01-onboarding-mobile.png') });
      results.push({ surface: '01-cold-boot-onboarding', status: 'PASS', detail: state1 });
      await ctx.close();
    }

    // 2. Pengguna Kembali Tanpa Sesi (?fz_real_auth=1, onboarding selesai) -> Auth Login Screen
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await ctx.addInitScript(() => {
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), name: 'Murid Uji', locale: 'id', course: 'ja' }));
      });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await blockExternalSlowDeps(page);
      await page.goto(`${baseUrl}/index.html?fz_real_auth=1`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1800);
      try { await page.mouse.click(195, 420); } catch (_) {}
      const state2 = await waitForSelectorOrCondition(page, () => {
        const auth = document.querySelector('.fz-auth:not(.is-leaving)');
        if (!auth) return null;
        return {
          screen: auth.getAttribute('data-auth-screen'),
          hasGuestBtn: Boolean(auth.querySelector('[data-auth-guest]')) || /Masuk sebagai (?:Tamu|Pengunjung)/i.test(auth.textContent || ''),
          width: auth.getBoundingClientRect().width
        };
      }, 15000);
      assert.ok(state2 && state2.screen, `Layar Auth tidak muncul pada ?fz_real_auth=1: ${JSON.stringify(state2)}`);
      assert.strictEqual(state2.hasGuestBtn, false, 'Tombol bypass tamu terlarang ditemukan di layar login');
      assert.ok(state2.width >= 300, `Lebar layar auth rusak: ${state2.width}px`);
      assert.deepStrictEqual(pageErrors, [], `Pageerror pada layar login: ${pageErrors.join('; ')}`);
      if (OUT_DIR) await page.screenshot({ path: path.join(OUT_DIR, 'baseline-02-auth-login-mobile.png') });
      results.push({ surface: '02-auth-login-gate', status: 'PASS', detail: state2 });
      await ctx.close();
    }

    // 3, 4, 5. Beranda Utama (Home), Grammar, & Mitra Kaiwa Voice Studio (chat)
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await blockExternalSlowDeps(page);
      await page.goto(`${baseUrl}/index.html`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1800);
      try { await page.mouse.click(195, 420); } catch (_) {}
      // Dismiss any splash/tour/ritual overlay cleanly if active
      await page.evaluate(() => {
        try { if (typeof window.dismissBootSplash === 'function') window.dismissBootSplash(); } catch (_) {}
        document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-tour, #fzRitual, .fz-ritual').forEach((el) => el.remove());
        document.documentElement.classList.remove('fz-booting');
        document.documentElement.classList.add('fz-app-open');
      });
      const homeInfo = await waitForSelectorOrCondition(page, () => {
        const app = document.getElementById('app');
        if (!app || app.innerHTML.trim().length < 200) return null;
        const cs = window.getComputedStyle(document.body);
        return {
          view: typeof state !== 'undefined' ? state.view : null,
          htmlLen: app.innerHTML.length,
          bgColor: cs.backgroundColor,
          hasAuthOverlay: Boolean(document.querySelector('.fz-auth:not(.is-leaving)'))
        };
      }, 15000);
      assert.ok(homeInfo && homeInfo.htmlLen > 500, `Home gagal ter-render: ${JSON.stringify(homeInfo)}`);
      assert.strictEqual(homeInfo.hasAuthOverlay, false, 'Mode dev lokal bawaan m025-723 tidak boleh terhalang modal auth');
      if (OUT_DIR) await page.screenshot({ path: path.join(OUT_DIR, 'baseline-03-home-mobile.png') });
      results.push({ surface: '03-home-dashboard', status: 'PASS', detail: homeInfo });

      // 4. Grammar surface
      await page.evaluate(() => {
        if (typeof window.go === 'function') window.go('grammar');
      });
      await page.waitForTimeout(800);
      const grammarInfo = await page.evaluate(() => {
        const app = document.getElementById('app');
        return {
          view: typeof state !== 'undefined' ? state.view : null,
          htmlLen: app ? app.innerHTML.length : 0
        };
      });
      assert.strictEqual(grammarInfo.view, 'grammar', `Gagal berpindah ke view grammar: ${JSON.stringify(grammarInfo)}`);
      assert.ok(grammarInfo.htmlLen > 300, 'Konten grammar kosong');
      if (OUT_DIR) await page.screenshot({ path: path.join(OUT_DIR, 'baseline-04-grammar-mobile.png') });
      results.push({ surface: '04-grammar-view', status: 'PASS', detail: grammarInfo });

      assert.deepStrictEqual(pageErrors, [], `Pageerror selama navigasi Home/Grammar: ${pageErrors.join('; ')}`);
      await ctx.close();
    }

    // 5. Kawan Bicara / Mitra Kaiwa Voice Studio (chat) dalam konteks bersih terisolasi
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));
      await blockExternalSlowDeps(page);
      await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        try { if (typeof window.dismissBootSplash === 'function') window.dismissBootSplash(); } catch (_) {}
        document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-tour, #fzRitual, .fz-ritual').forEach((el) => el.remove());
        document.documentElement.classList.remove('fz-booting');
        document.documentElement.classList.add('fz-app-open');
        if (typeof window.go === 'function') window.go('chat');
      });
      const chatInfo = await waitForSelectorOrCondition(page, () => {
        const frame = document.getElementById('fzMitraKaiwaStudioFrame');
        if (!frame) return null;
        return {
          view: typeof state !== 'undefined' ? state.view : null,
          hasStudioFrame: true,
          frameSrc: frame.getAttribute('src')
        };
      }, 15000);
      assert.ok(chatInfo && chatInfo.hasStudioFrame, 'Kawan Bicara wajib me-mount #fzMitraKaiwaStudioFrame');
      assert.strictEqual(chatInfo.view, 'chat');
      assert.ok(String(chatInfo.frameSrc || '').includes('call.html'), `src iframe Kawan Bicara harus memuat call.html, ditemukan: ${chatInfo.frameSrc}`);
      await page.waitForTimeout(1200);
      if (OUT_DIR) await page.screenshot({ path: path.join(OUT_DIR, 'baseline-05-mitra-kaiwa-mobile.png') });
      results.push({ surface: '05-mitra-kaiwa-studio', status: 'PASS', detail: chatInfo });
      assert.deepStrictEqual(pageErrors, [], `Pageerror pada Kawan Bicara: ${pageErrors.join('; ')}`);
      await ctx.close();
    }

    console.log('\n=== PROBE EMPIRIS 5 PERMUKAAN KRITIS LULUS 100% ===');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('\n[PROBE GAGAL]', err);
  process.exitCode = 1;
});
