import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = 'C:/Users/hp/fiezel-mobile-audit-m025-712';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const views = ['home', 'vocab', 'grammar', 'reading', 'writing', 'kana'];
  const results = [];

  for (const v of views) {
    const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
    await page.route('**/*', r => (r.request().url().includes('puter.com') || r.request().url().includes('google-analytics')) ? r.abort() : r.continue());

    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('fz_user_registered', '1');
      localStorage.setItem('fz_auth_mode', 'guest');
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Kenji', locale: 'id', course: 'ja' }));
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_target_lang', 'ja');
    });

    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    await page.evaluate((targetView) => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-booting', 'fz-auth-open');
      if (window.go) window.go(targetView);
    }, v);
    await page.waitForTimeout(500);

    // Scroll down 200px
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(200);

    const check = await page.evaluate(() => {
      const tb = document.querySelector('header.topbar');
      const r = tb ? tb.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        top: r ? Math.round(r.top) : null,
        height: r ? Math.round(r.height) : null,
        pinned: r ? Math.abs(r.top) <= 1 && r.height > 40 : false,
        pos: tb ? window.getComputedStyle(tb).position : null
      };
    });

    results.push({ view: v, ...check });
    await page.close();
  }

  console.log('Topbar Scroll Verification Results:\n', JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
});
