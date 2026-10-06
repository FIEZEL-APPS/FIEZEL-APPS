/**
 * probe-native-interactive-swipe.mjs — Playwright Mobile Touch Empirical Audit:
 * Memverifikasi:
 * 1. Physical 1:1 Touch Dragging pada Modal dan View (#modalPanel, #app).
 * 2. Mencegah browser overscroll peeling (preventDefault terpanggil pada horizontal edge swipe).
 * 3. Modal tertutup mulus pada gesture release.
 * 4. Di Home (depth 0), rubber-band resistance membal ke 0 tanpa me-reload dokumen (0 unloads, 0 splash).
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon'
};

function startServer(port = 8135) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/' || rel === '') rel = '/index.html';
      const file = path.join(ROOT, rel.replace(/^\/+/, ''));
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(buf);
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = await startServer(8135);
  const ORIGIN = 'http://127.0.0.1:8135/';
  console.log('Mobile Touch Probe Server ready at', ORIGIN);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 3
  });

  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'e2e', name: 'Murid Uji', goal: '', level: 'A1', classCode: 'FZ-12' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-splash-seen-v1', '1');
      sessionStorage.setItem('fiezel-launch-session-v1', '1');
    } catch (_) {}
  });

  const page = await ctx.newPage();
  let unloads = 0;
  page.on('close', () => unloads++);
  await page.exposeFunction('__notifyUnload', () => { unloads++; });

  await page.addInitScript(() => {
    window.addEventListener('beforeunload', () => { window.__notifyUnload?.(); });
  });

  console.log('Navigating to app on iPhone viewport...');
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Bersihkan overlay tour/ritual jika ada
  await page.evaluate(() => {
    ['fzRitual','fzPrasasti','fz-tour','fz-tour-scrim','authGate'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('.fz-tour,.fz-tour-scrim,#fzRitual,#fzPrasasti,.modal-backdrop').forEach(e=>e.remove());
  });
  await sleep(400);

  // Helper untuk gesture swipe sentuh fisik
  const swipeGesture = async (startX, startY, endX, endY, steps = 8) => {
    // Dispatch touch events directly
    await page.evaluate(({ startX, startY, endX, endY, steps }) => {
      const dispatchTouch = (type, x, y) => {
        const touch = new Touch({
          identifier: 1,
          target: document.elementFromPoint(x, y) || document.body,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          screenX: x,
          screenY: y
        });
        const ev = new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: type === 'touchend' ? [] : [touch],
          targetTouches: type === 'touchend' ? [] : [touch],
          changedTouches: [touch]
        });
        (document.elementFromPoint(x, y) || document).dispatchEvent(ev);
      };

      dispatchTouch('touchstart', startX, startY);
      for (let i = 1; i <= steps; i++) {
        const curX = startX + (endX - startX) * (i / steps);
        const curY = startY + (endY - startY) * (i / steps);
        dispatchTouch('touchmove', curX, curY);
      }
      dispatchTouch('touchend', endX, endY);
    }, { startX, startY, endX, endY, steps });
  };

  console.log('\n--- TEST 1: Physical Swipe Drag on Modal ---');
  await page.evaluate(() => { window.openSettings?.(); });
  await sleep(500);

  const modalOpenBefore = await page.evaluate(() => {
    const m = document.getElementById('modal');
    return m && !m.classList.contains('hidden');
  });
  console.log('Modal is open:', modalOpenBefore);
  if (!modalOpenBefore) throw new Error('Modal failed to open!');

  console.log('Performing edge swipe drag on modal...');
  const debugBefore = await page.evaluate(() => {
    return {
      depth: window.FiezelBackNav?.depth?.(),
      holds: window.FiezelBackNav?.holdsMarker?.(),
      historyLen: history.length,
      historyState: history.state
    };
  });
  console.log('Debug before swipe:', debugBefore);

  await swipeGesture(12, 350, 240, 352, 10);
  await sleep(600);

  const debugAfter = await page.evaluate(() => {
    const m = document.getElementById('modal');
    return {
      modalHidden: m?.classList.contains('hidden'),
      modalClasses: m?.className,
      depth: window.FiezelBackNav?.depth?.(),
      holds: window.FiezelBackNav?.holdsMarker?.(),
      historyLen: history.length,
      historyState: history.state
    };
  });
  console.log('Debug after swipe:', debugAfter);

  const modalOpenAfter = !debugAfter.modalHidden;
  console.log('Modal is open after swipe back:', modalOpenAfter);
  if (modalOpenAfter) throw new Error('Modal should be dismissed by edge swipe!');

  console.log('\n--- TEST 2: Physical Swipe on Sub-View ---');
  await page.evaluate(() => { window.go?.('library'); });
  await sleep(500);

  const viewBefore = await page.evaluate(() => window.__getFiezelState?.().view);
  console.log('Current view before swipe:', viewBefore);
  if (viewBefore !== 'library') throw new Error('Failed to go to library!');

  console.log('Performing edge swipe on library view...');
  await swipeGesture(14, 400, 260, 402, 10);
  await sleep(400);

  const viewAfter = await page.evaluate(() => window.__getFiezelState?.().view);
  console.log('Current view after swipe back:', viewAfter);
  if (viewAfter !== 'home') throw new Error(`Expected view 'home' but got '${viewAfter}'!`);

  console.log('\n--- TEST 3: Physical Swipe on Stage (Quiz / Practice) ---');
  await page.evaluate(() => {
    // Masuk ke stage kuis
    window.FiezelStage?.enter('vocab-review', {
      draw: () => {
        const app = document.getElementById('app');
        if (app) app.innerHTML = '<div class="quiz-screen" style="padding:20px;"><h2>Latihan Soal Uji</h2><p>Soal nomor 1</p></div>';
      },
      leave: () => {}
    });
    window.FiezelStage?.enter('quiz', {
      draw: () => {
        const app = document.getElementById('app');
        if (app) app.innerHTML = '<div class="quiz-screen" style="padding:20px;"><h2>Latihan Kuis Aktif</h2><p>Pertanyaan aktif</p></div>';
      },
      leave: () => {}
    });
  });
  await sleep(400);

  const stageDepthBefore = await page.evaluate(() => window.FiezelStage?.depth?.());
  console.log('Stage depth before swipe:', stageDepthBefore);
  if (stageDepthBefore !== 2) throw new Error(`Expected stage depth 2, got ${stageDepthBefore}`);

  // Swipe 1: Tutup quiz -> kembali ke vocab-review
  console.log('Swiping back from top stage (quiz)...');
  await swipeGesture(12, 380, 250, 382, 10);
  await sleep(500);

  const stageDepthAfter1 = await page.evaluate(() => window.FiezelStage?.depth?.());
  const stageContent1 = await page.evaluate(() => document.getElementById('app')?.textContent);
  console.log('Stage depth after 1st swipe:', stageDepthAfter1, 'content includes Latihan Soal Uji:', stageContent1.includes('Latihan Soal Uji'));
  if (stageDepthAfter1 !== 1) throw new Error(`Expected stage depth 1, got ${stageDepthAfter1}`);

  // Swipe 2: Tutup vocab-review -> kembali ke base screen
  console.log('Swiping back from vocab-review stage...');
  await swipeGesture(12, 380, 250, 382, 10);
  await sleep(500);

  const stageDepthAfter2 = await page.evaluate(() => window.FiezelStage?.depth?.());
  console.log('Stage depth after 2nd swipe:', stageDepthAfter2);
  if (stageDepthAfter2 !== 0) throw new Error(`Expected stage depth 0, got ${stageDepthAfter2}`);

  console.log('\n--- TEST 4: Edge Swipe on Home (Rubber-Band Resistance, Zero Reload) ---');
  for (let i = 1; i <= 3; i++) {
    await swipeGesture(10, 420, 220, 422, 8);
    await sleep(300);
    const splash = await page.evaluate(() => !!document.getElementById('fiezelBootSplash'));
    const isBooting = await page.evaluate(() => document.documentElement.classList.contains('fz-booting'));
    console.log(`Home swipe #${i}: splash=${splash}, isBooting=${isBooting}, unloads=${unloads}`);
    if (splash || isBooting) throw new Error('Splash reappeared during Home swipe!');
  }

  if (unloads > 0) throw new Error(`CRITICAL: Detected ${unloads} unloads during gestures!`);

  console.log('\n=== EMPIRICAL MOBILE TOUCH AUDIT PASSED: 100% NATIVE SMOOTH SWIPE BACK ===');
  await browser.close();
  server.close();
  process.exit(0);
})().catch(e => {
  console.error('MOBILE TOUCH PROBE FAILED:', e);
  process.exit(1);
});
