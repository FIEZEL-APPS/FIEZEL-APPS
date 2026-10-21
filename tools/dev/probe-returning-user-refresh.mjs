import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

function createServer() {
  return http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.join(ROOT, rel.replace(/^\/+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
      res.end(buf);
    });
  });
}

(async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;

  const browser = await pw.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  const todayWib = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);

  // Storage setup for existing authenticated student who refreshed the page
  await context.addInitScript(`
    localStorage.setItem('fiezel-splash-seen-v1', '${todayWib}');
    sessionStorage.setItem('fiezel-launch-session-v1', '1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', at: Date.now() }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), name: 'Budi' }));
    localStorage.setItem('fiezel-learner-name-v1', 'Budi');
  `);

  const page = await context.newPage();

  // Record DOM timestamps and visual states
  await page.addInitScript(() => {
    const P = window.__refreshProbe = { marks: {}, visualSnapshots: [] };
    const now = () => performance.now();
    try {
      new PerformanceObserver(l => {
        for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') P.marks.fcp = Math.round(e.startTime);
      }).observe({ type: 'paint', buffered: true });
    } catch (_) {}

    new MutationObserver(() => {
      const sp = document.getElementById('fiezelBootSplash');
      if (sp && !P.marks.splashInDom) P.marks.splashInDom = Math.round(now());
      if (!sp && P.marks.splashInDom && !P.marks.splashGone) P.marks.splashGone = Math.round(now());
      const home = document.querySelector('.home-page, .home-today, main.app');
      if (home && !P.marks.homeFound) P.marks.homeFound = Math.round(now());
    }).observe(document, { childList: true, subtree: true });

    // Sample visual state periodically
    const timer = setInterval(() => {
      const sp = document.getElementById('fiezelBootSplash');
      const home = document.querySelector('.home-today, .home-page');
      P.visualSnapshots.push({
        t: Math.round(now()),
        splashPresent: !!sp,
        splashVisible: sp ? (sp.offsetWidth > 0 && sp.offsetHeight > 0 && window.getComputedStyle(sp).display !== 'none' && window.getComputedStyle(sp).opacity !== '0') : false,
        splashClaimed: sp ? sp.getAttribute('data-fiezel-boot-claimed') : null,
        homePresent: !!home,
        homeVisible: home ? (home.offsetWidth > 0 && home.offsetHeight > 0) : false
      });
      if (P.marks.splashGone && P.marks.homeFound && now() > P.marks.splashGone + 500) {
        clearInterval(timer);
      }
    }, 100);
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => window.__refreshProbe);
  console.log('REFRESH PROBE RESULT:');
  console.log(JSON.stringify(data, null, 2));

  await browser.close();
  server.close();
})();
