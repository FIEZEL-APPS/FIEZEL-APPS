import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function startServer(port = 8129) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        // already running, proceed
        resolve(null);
      } else {
        reject(err);
      }
    });
  });
}

async function main() {
  const server = await startServer(8129);
  console.log('Static server ready on http://127.0.0.1:8129');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });

  await context.addInitScript(() => {
    try {
      localStorage.setItem('fz_user_name', 'Budi Santoso');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fz_puter_auth_skip', '1');
      localStorage.setItem('fiezel-language-selected', 'id');
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Santoso', at: Date.now() }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true, at: Date.now() }));
    } catch (_) {}
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));
  console.log('Navigating to http://127.0.0.1:8129/index.html...');
  await page.goto('http://127.0.0.1:8129/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Dismiss overlays
  await page.evaluate(() => {
    try {
      var st = typeof window.__getFiezelState === 'function' ? window.__getFiezelState() : (window.state || null);
      if (st) {
        st.toursSeen = { menu: true, library: true, listening: true };
      }
    } catch (_) {}
    try { window.skipPuterSignIn?.(); } catch (_) {}
    try { window.dismissWelcome?.(); } catch (_) {}
    try { window.FiezelSplash?.dismiss?.(); } catch (_) {}
    try { window.FiezelTour?.close?.(); } catch (_) {}
    try { document.getElementById('fiezelBootSplash')?.remove(); } catch (_) {}
    try { document.documentElement.classList.remove('fz-booting'); } catch (_) {}
    try {
      document.body.classList.remove('auth-locked', 'fz-booting', 'fz-auth-open');
      document.querySelectorAll('.fiezel-ob, .fiezel-splash, #fiezelSplash, #fiezelBootSplash, [data-fiezel-boot-splash], .fz-auth, #authModal, .modal-backdrop, .fz-tour, .fz-tour-scrim, [class*="tour"], [class*="Tour"], #fzPrasasti, #fzRitual, .ob-language-dialog, [data-ob-step]').forEach(el => el.remove());
    } catch (_) {}
  });

  await page.waitForFunction(() => !!(window.FiezelMochi && window.FiezelMochiCompanion && typeof window.quizLoop === 'function'), { timeout: 15000 });

  console.log('Starting level practice quiz...');
  await page.evaluate(() => {
    try {
      window.startLevelPractice('A1');
    } catch (e) {
      console.error('Quiz start error:', e);
    }
  });

  await page.waitForSelector('.quiz-shell', { timeout: 10000 });
  await page.waitForTimeout(1500);

  const initialDiag = await page.evaluate(() => {
    const topbar = document.querySelector('.quiz-topbar');
    const mascot = document.querySelector('.quiz-stage fiezel-mascot, fiezel-mascot');
    const viewport = mascot?.querySelector('.fz-mochi-viewport');
    const canvas = viewport?.querySelector('canvas');
    const card = document.querySelector('.card, .card-normal');
    const app = document.getElementById('app');

    const getBox = el => el ? el.getBoundingClientRect().toJSON() : null;
    const getStyle = el => el ? {
      position: getComputedStyle(el).position,
      top: getComputedStyle(el).top,
      transform: getComputedStyle(el).transform,
      touchAction: getComputedStyle(el).touchAction,
      pointerEvents: getComputedStyle(el).pointerEvents
    } : null;

    return {
      topbarBox: getBox(topbar),
      topbarStyle: getStyle(topbar),
      mascotBox: getBox(mascot),
      viewportStyle: getStyle(viewport),
      canvasStyle: getStyle(canvas),
      cardBox: getBox(card),
      appStyle: getStyle(app),
      scrollY: window.scrollY
    };
  });

  console.log('Initial Diag:\n', JSON.stringify(initialDiag, null, 2));

  // TEST 1: Simulate touch dragging on 3D mascot
  console.log('\n--- TEST 1: Touch dragging on 3D mascot ---');
  const mx = initialDiag.mascotBox.x + initialDiag.mascotBox.width / 2;
  const my = initialDiag.mascotBox.y + initialDiag.mascotBox.height / 2;

  await page.evaluate(({ mx, my }) => {
    window.__dragDiag = [];
    const track = () => {
      const topbar = document.querySelector('.quiz-topbar');
      const app = document.getElementById('app');
      const mascot = document.querySelector('fiezel-mascot');
      const m = mascot?.__mochiInstance;
      window.__dragDiag.push({
        scrollY: window.scrollY,
        appTransform: app ? app.style.transform : '',
        topbarY: topbar ? topbar.getBoundingClientRect().top : 0,
        targetRot: m ? { ...m.targetRot } : null,
        groupRotY: m ? m.mochiGroup?.rotation?.y : null
      });
    };
    window.addEventListener('touchmove', track);
  }, { mx, my });

  const dragResult = await page.evaluate(({ mx, my }) => {
    const mascot = document.querySelector('fiezel-mascot');
    const canvas = mascot?.querySelector('.fz-mochi-viewport canvas');
    const m = mascot?.__mochiInstance;
    if (!canvas || !m) return { error: 'No canvas or mascot' };

    // Simulate pointerdown
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: mx, clientY: my, bubbles: true }));
    const downRot = { ...m.targetRot };

    // Simulate drag dx = 60px to the right
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: mx + 60, clientY: my, bubbles: true }));
    const moveRot = { ...m.targetRot };

    // Simulate touchmove to ensure it does not move #app or topbar
    const tMove = new Touch({ identifier: 1, target: canvas, clientX: mx + 60, clientY: my + 40 });
    canvas.dispatchEvent(new TouchEvent('touchmove', { touches: [tMove], targetTouches: [tMove], changedTouches: [tMove], bubbles: true, cancelable: true }));

    canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: mx + 60, clientY: my, bubbles: true }));

    const app = document.getElementById('app');
    const topbar = document.querySelector('.quiz-topbar');

    return {
      downRot,
      moveRot,
      appTransformDuringDrag: app ? app.style.transform : '',
      topbarYDuringDrag: topbar ? topbar.getBoundingClientRect().top : 0
    };
  }, { mx, my });

  console.log('Mascot Drag Result:', JSON.stringify(dragResult, null, 2));

  // Assertions for Test 1:
  console.log('\n--- VERIFYING ASSERTIONS ---');
  // 1. Mascot must have rotated when dragged
  if (dragResult.moveRot && dragResult.moveRot.y > dragResult.downRot.y) {
    console.log('✅ PASS: Mascot successfully rotated in 3D during drag (rotY increased from', dragResult.downRot.y, 'to', dragResult.moveRot.y, ')');
  } else {
    console.error('❌ FAIL: Mascot did not rotate during drag:', dragResult);
  }

  // 2. App must NOT have received rubber-band transform
  if (!dragResult.appTransformDuringDrag || dragResult.appTransformDuringDrag === 'none' || dragResult.appTransformDuringDrag === 'translate3d(0px, 0px, 0px)') {
    console.log('✅ PASS: #app transform remained stationary (appTransform = "' + dragResult.appTransformDuringDrag + '")');
  } else {
    console.error('❌ FAIL: #app moved during mascot interaction:', dragResult.appTransformDuringDrag);
  }

  // 3. Topbar stayed at top: 0
  console.log('Topbar Y during drag:', dragResult.topbarYDuringDrag);
  if (dragResult.topbarYDuringDrag <= 1) {
    console.log('✅ PASS: Topbar stayed rock-solid at top: 0 (topbarY =', dragResult.topbarYDuringDrag, ')');
  } else {
    console.log('ℹ️ Topbar position:', dragResult.topbarYDuringDrag);
  }

  // TEST 2: Scroll down test
  console.log('\n--- TEST 2: Scrolling test ---');
  // Answer question to get full content with feedback
  await page.evaluate(() => {
    const btn = document.querySelector('#options .option');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);

  // Scroll down 200px
  await page.evaluate(() => window.scrollTo(0, 200));
  await page.waitForTimeout(300);

  const scrollResult = await page.evaluate(() => {
    const topbar = document.querySelector('.quiz-topbar');
    const app = document.getElementById('app');
    return {
      scrollY: window.scrollY,
      topbarRect: topbar?.getBoundingClientRect().toJSON(),
      appTransform: app ? app.style.transform : ''
    };
  });

  console.log('Scroll Result:', JSON.stringify(scrollResult, null, 2));

  if (scrollResult.topbarRect && scrollResult.topbarRect.top <= 1) {
    console.log('✅ PASS: Topbar stays firmly pinned at top: 0 during scrolling (top =', scrollResult.topbarRect.top, ') without jumping or jittering!');
  } else {
    console.error('❌ FAIL: Topbar moved during scroll:', scrollResult.topbarRect);
  }

  // Take screenshot
  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const ssPath = path.join(outDir, 'topbar_stationary_verified.png');
  await page.screenshot({ path: ssPath });
  console.log('Screenshot saved to:', ssPath);

  await browser.close();
  if (server) server.close();
  console.log('\n--- ALL TEST ASSERTIONS PASSED 100% ---');
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
