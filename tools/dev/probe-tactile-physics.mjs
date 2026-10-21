import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4215;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
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
  console.log(`Probe server running on port ${PORT}...`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true
    });

    await page.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Budi Santoso');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
      }, 50);
    });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(600);

    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
    });

    // Test 1: Check Overscroll behavior on html/body
    const overscroll = await page.evaluate(() => {
      const htmlStyle = window.getComputedStyle(document.documentElement);
      const bodyStyle = window.getComputedStyle(document.body);
      return {
        htmlX: htmlStyle.overscrollBehaviorX,
        htmlY: htmlStyle.overscrollBehaviorY,
        bodyX: bodyStyle.overscrollBehaviorX,
        bodyY: bodyStyle.overscrollBehaviorY
      };
    });
    console.log('TEST 1: Overscroll behavior computed styles:', overscroll);

    // Test 2: Rubber-band scroll bounce simulation at top boundary
    console.log('TEST 2: Simulating top-boundary pull down for rubberband stretch...');
    const bounceRes = await page.evaluate(async () => {
      const app = document.getElementById('app');
      window.scrollTo(0, 0);

      // Dispatch touchstart at (195, 200)
      const touchStart = new Touch({ identifier: 1, target: document.body, clientX: 195, clientY: 200 });
      window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));

      // Dispatch touchmove pulling down to (195, 350) => dy = +150
      const touchMove = new Touch({ identifier: 1, target: document.body, clientX: 195, clientY: 350 });
      window.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], changedTouches: [touchMove], cancelable: true, bubbles: true }));

      const transformDuringDrag = app.style.transform;

      // Dispatch touchend
      const touchEnd = new Touch({ identifier: 1, target: document.body, clientX: 195, clientY: 350 });
      window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));

      const transitionOnRelease = app.style.transition;
      const transformOnRelease = app.style.transform;

      return {
        transformDuringDrag,
        transitionOnRelease,
        transformOnRelease
      };
    });
    console.log('TEST 2 Result:', bounceRes);

    // Test 3: Flashcard Tactile Drag & Swipe Physics
    console.log('TEST 3: Testing flashcards tactile drag and swipe gestures...');
    await page.evaluate(() => {
      window.go('vocab');
    });
    await page.waitForTimeout(400);

    // Launch flashcards
    await page.evaluate(() => {
      window.flashcards('A1');
    });
    await page.waitForTimeout(400);

    const cardPresent = await page.evaluate(() => !!document.getElementById('flashcard'));
    console.log('Flashcard mounted:', cardPresent);

    if (cardPresent) {
      // Simulate drag
      const dragRes = await page.evaluate(() => {
        const fc = document.getElementById('flashcard');
        const touchStart = new Touch({ identifier: 2, target: fc, clientX: 200, clientY: 300 });
        fc.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart], bubbles: true }));

        const touchMove = new Touch({ identifier: 2, target: fc, clientX: 100, clientY: 310 }); // dx = -100
        fc.dispatchEvent(new TouchEvent('touchmove', { touches: [touchMove], changedTouches: [touchMove], cancelable: true, bubbles: true }));

        const transformDrag = fc.style.transform;
        const opacityDrag = fc.style.opacity;

        return { transformDrag, opacityDrag };
      });
      console.log('Card during drag (-100px):', dragRes);

      // Simulate swipe commit
      const commitRes = await page.evaluate(async () => {
        const fc = document.getElementById('flashcard');
        const touchEnd = new Touch({ identifier: 2, target: fc, clientX: 100, clientY: 310 });
        fc.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd], bubbles: true }));

        const flyTransform = fc.style.transform;
        const flyTransition = fc.style.transition;
        return { flyTransform, flyTransition };
      });
      console.log('Card committed fly-out:', commitRes);
    }

    // Capture screenshot of updated view
    const screenshotDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'tactile-physics-verified.png') });
    console.log('Screenshot saved to reports/tactile-physics-verified.png');

    console.log('ALL TACTILE PROBE CHECKS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('PROBE ERROR:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
