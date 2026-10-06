import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4398;
const ROOT = process.cwd();
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Probe server running at http://127.0.0.1:${PORT}`);
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Budi Santoso');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_onboarding_lang_done', '1');
      localStorage.setItem('fz_language_chosen', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fiezel-ob').forEach(e => e.remove());
      }, 50);
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 1. Verify haptic pattern and trigger on go()
    const hapticResult = await page.evaluate(() => {
      let logged = null;
      window.navigator.vibrate = (pattern) => { logged = pattern; return true; };
      window.go('progress');
      return logged;
    });
    console.log('1. haptic duration on window.go("progress"):', hapticResult, 'ms');

    // 2. Verify bottomnav tab :active press rule exists and has scale(0.93)
    const ruleMatch = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && rule.selectorText.includes('.bottomnav .nav:active')) {
              return rule.cssText;
            }
          }
        } catch (_) {}
      }
      return null;
    });
    console.log('2. Bottomnav tab :active CSS rule:', ruleMatch);

    // 3. Verify pop animation on active tab icon
    await page.evaluate(() => window.go('classroom'));
    await page.waitForTimeout(50);
    const activeIconAnim = await page.evaluate(() => {
      const icon = document.querySelector('.bottomnav .nav[data-view="classroom"].active .fz-i');
      return icon ? window.getComputedStyle(icon).animationName : null;
    });
    console.log('3. Active tab icon animation name:', activeIconAnim);

    await browser.close();
  } finally {
    server.close();
  }
});
