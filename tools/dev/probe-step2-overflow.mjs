import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'file:///c:/Users/hp/fiezel-apps/node_modules/playwright/index.mjs';

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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });

  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('fz_user_registered', '1');
    localStorage.setItem('fz_auth_mode', 'guest');
    setInterval(() => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-booting', 'fz-auth-open');
    }, 50);
  });

  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    window.validateLearnerNameAvailability = async () => ({ ok: true });
    window.showOnboarding(window, { force: true });
  });
  await page.waitForTimeout(500);

  // Fill name
  await page.fill('[data-ob-name]', 'Kenji');
  await page.click('[data-ob-advance]');
  await page.waitForTimeout(400);

  // Select JA
  await page.click('[data-ob-course="ja"]');
  await page.waitForTimeout(400);

  const step2Overflow = await page.evaluate(() => {
    const ob = document.querySelector('.fiezel-ob');
    const adv = document.querySelector('[data-ob-advance]');
    const r = adv ? adv.getBoundingClientRect() : null;
    return {
      docScrollH: document.documentElement.scrollHeight,
      windowH: window.innerHeight,
      obScrollH: ob ? ob.scrollHeight : null,
      obClientH: ob ? ob.clientHeight : null,
      buttonBottom: r ? r.bottom : null,
      buttonFits: r ? r.bottom <= window.innerHeight : false
    };
  });
  console.log('Step 2 (JA Course) Check on iPhone-SE:', step2Overflow);

  await page.screenshot({ path: 'C:/Users/hp/.gemini/antigravity/brain/d3f56d3b-9b20-4aed-abe2-a5d2b1e722f5/audit-iPhone-SE-step2-fixed.png' });

  await browser.close();
  server.close();
});
