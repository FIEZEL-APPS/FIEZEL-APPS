import { chromium, devices } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4529;

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
  console.log(`[ProbeTouchScroll] Server running at http://127.0.0.1:${PORT}`);
  let browser;
  try {
    const device = devices['iPhone 14 Pro'] || {
      viewport: { width: 393, height: 852 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
      isMobile: true
    };

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      ...device,
      hasTouch: true,
      isMobile: true
    });

    await context.addInitScript(() => {
      localStorage.setItem('fiezel_audio_consent', 'true');
      localStorage.setItem('fiezel_boot_count', '5');
      sessionStorage.setItem('fz_tour_completed', 'true');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-auth-open');
      }, 50);
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(500);

    // Enter chat view
    await page.evaluate(() => window.go('chat'));
    await page.waitForSelector('.fzc-feed', { timeout: 8000 });
    await page.waitForTimeout(400);

    // Add multiple messages to generate ample scrollable height
    await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      for (let i = 1; i <= 8; i++) {
        chat.sendMessage('Pesan pengujian nomor ' + i + ' untuk mengisi riwayat chat agar overflow');
      }
    });
    await page.waitForTimeout(800);

    const initialMetrics = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = 200; // set to middle
      return {
        scrollHeight: feed.scrollHeight,
        clientHeight: feed.clientHeight,
        scrollTop: feed.scrollTop,
        isScrollable: feed.scrollHeight > feed.clientHeight,
        bodyClasses: Array.from(document.body.classList),
        htmlClasses: Array.from(document.documentElement.classList)
      };
    });

    console.log('Initial Feed Metrics:', JSON.stringify(initialMetrics, null, 2));

    // Listen for defaultPrevented on touchmove
    await page.evaluate(() => {
      window.__touchMoveEvents = [];
      window.addEventListener('touchmove', (e) => {
        window.__touchMoveEvents.push({
          cancelable: e.cancelable,
          defaultPrevented: e.defaultPrevented,
          targetTag: e.target ? e.target.tagName : null,
          targetClass: e.target ? e.target.className : null
        });
      }, { capture: true });
    });

    // Simulate touch drag on the feed
    const feedHandle = await page.$('.fzc-feed');
    const box = await feedHandle.boundingBox();
    console.log('Feed BoundingBox:', box);

    const touchStartX = box.x + box.width / 2;
    const touchStartY = box.y + box.height / 2;

    // Simulate touch swipe UP (moving finger up to scroll down)
    console.log('Dispatching touch swipe UP (finger moves from Y=' + touchStartY + ' to Y=' + (touchStartY - 100) + ')...');

    // We simulate touch events via page.touchscreen or dispatchEvent
    await page.touchscreen.tap(touchStartX, touchStartY);
    await page.waitForTimeout(100);

    // Test touchmove defaultPrevented via evaluate touch simulation
    const touchResult = await page.evaluate(({ startX, startY }) => {
      const feed = document.getElementById('fzcFeed');
      const startScrollTop = feed.scrollTop;

      // Dispatch touchstart
      const touchObjStart = new Touch({
        identifier: Date.now(),
        target: feed,
        clientX: startX,
        clientY: startY,
        pageX: startX,
        pageY: startY,
        screenX: startX,
        screenY: startY
      });
      const touchStartEvent = new TouchEvent('touchstart', {
        cancelable: true,
        bubbles: true,
        touches: [touchObjStart],
        targetTouches: [touchObjStart],
        changedTouches: [touchObjStart]
      });
      feed.dispatchEvent(touchStartEvent);

      // Dispatch touchmove moving 40px up (finger moving up, dy = -40)
      const touchObjMove = new Touch({
        identifier: touchObjStart.identifier,
        target: feed,
        clientX: startX,
        clientY: startY - 40,
        pageX: startX,
        pageY: startY - 40,
        screenX: startX,
        screenY: startY - 40
      });
      const touchMoveEvent = new TouchEvent('touchmove', {
        cancelable: true,
        bubbles: true,
        touches: [touchObjMove],
        targetTouches: [touchObjMove],
        changedTouches: [touchObjMove]
      });
      feed.dispatchEvent(touchMoveEvent);

      // Also check wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        bubbles: true,
        cancelable: true
      });
      feed.dispatchEvent(wheelEvent);

      return {
        touchMoveDefaultPrevented: touchMoveEvent.defaultPrevented,
        wheelDefaultPrevented: wheelEvent.defaultPrevented,
        startScrollTop,
        currentScrollTop: feed.scrollTop,
        rubberBandState: {
          isRubberBanding: window.__fzRubberBandingActive || false
        }
      };
    }, { startX: touchStartX, startY: touchStartY });

    console.log('Touch & Wheel Simulation Result:', JSON.stringify(touchResult, null, 2));

    const interceptedEvents = await page.evaluate(() => window.__touchMoveEvents);
    console.log('Intercepted touchmove count:', interceptedEvents.length);
    if (interceptedEvents.length > 0) {
      console.log('First touchmove event:', interceptedEvents[0]);
    }

  } catch (err) {
    console.error('Probe failed:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
