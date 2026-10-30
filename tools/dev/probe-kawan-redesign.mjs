import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const rootDir = 'C:/Users/hp/fiezel-kawan-bicara-m025-725';
const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/4c759766-7170-46d2-b12f-2017cc49bf5f';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
      const cleanReq = decodeURIComponent(reqPath.replace(/^\/+/, ''));
      const filePath = path.join(rootDir, cleanReq);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          console.log('[SERVER 404]', req.url, '-> tried:', filePath);
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function run() {
  const { server, port } = await startServer();
  const targetUrl = `http://127.0.0.1:${port}/index.html`;

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']
  });

  try {
    // 1. Mobile Capture (Home Card & Modal & Kawan Bicara)
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      permissions: ['microphone']
    });

    await ctx.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        token: 'local-probe-token',
        user: { name: 'Rian Pratama', level: 'Dasar', exp: 120, email: 'rian@fiezel.local' }
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, timestamp: Date.now() }));
      localStorage.setItem('fz_target_course', 'en');
      localStorage.setItem('fz_tour_completed', 'true');
      localStorage.setItem('fz_tour_done_v1', '1');
      localStorage.setItem('fz_tour_done', '1');
      localStorage.setItem('fz_state_v1@en', JSON.stringify({
        level: 1, placementDone: true, view: 'home', ritualMeta: { lastDay: today },
        toursSeen: { menu: true, library: true, listening: true }
      }));
      localStorage.setItem('fz_state_v1', JSON.stringify({
        level: 1, placementDone: true, view: 'home', ritualMeta: { lastDay: today },
        toursSeen: { menu: true, library: true, listening: true }
      }));
    });

    const page = await ctx.newPage();
    page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));
    page.on('framenavigated', frame => console.log('[FRAME NAVIGATED]', frame.url()));
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.addStyleTag({ content: '.fz-tour, [class*="fz-tour"], .driver-popover { display: none !important; pointer-events: none !important; }' });
    await page.waitForTimeout(500);

    // Remove obstructive popups & tour
    await page.evaluate(() => {
      document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, #fzRitual, .fz-tour, #fzTour, [data-tour], .driver-popover, #modal, #modalPanel, .modal').forEach(el => {
        try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch (_) {}
      });
      document.documentElement.classList.remove('fz-booting');
      document.documentElement.classList.add('fz-app-open');
      if (window.go) window.go('home');
    });

    await page.waitForTimeout(600);

    // Scroll to Kawan Bicara Card
    await page.waitForSelector('.fz-kawan-card-v2', { timeout: 5000 });
    await page.evaluate(() => {
      const el = document.querySelector('.fz-kawan-card-v2');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(500);

    // Screenshot 1: Home Card Mobile
    const homeCardPath = path.join(artifactDir, 'preview-home-kawan-card-mobile.png');
    await page.screenshot({ path: homeCardPath });
    console.log('[PROBE] Saved home card screenshot:', homeCardPath);

    // Click Card to open Modal
    await page.click('.fz-kawan-card-v2');
    await page.waitForSelector('#fzKawanCallModal', { state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600);

    // Screenshot 2: Telepon aku sekarang Modal
    const modalPath = path.join(artifactDir, 'preview-kawan-modal-mobile.png');
    await page.screenshot({ path: modalPath });
    console.log('[PROBE] Saved modal screenshot:', modalPath);

    // Click the Ringing Phone button in modal
    await page.click('#fzKawanModalPhone');

    // Wait for transition to Kawan Bicara
    await page.waitForTimeout(1000);
    const frameEl = await page.waitForSelector('#fzMitraKaiwaStudioFrame', { timeout: 10000 });
    const frame = await frameEl.contentFrame();
    if (frame) {
      await frame.waitForSelector('[data-testid="mochi-3d-stage"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
    }

    // Screenshot 3: Kawan Bicara Live Studio
    const studioPath = path.join(artifactDir, 'preview-kawan-studio-mobile.png');
    await page.screenshot({ path: studioPath });
    console.log('[PROBE] Saved studio screenshot:', studioPath);

    await ctx.close();

    // 2. Desktop Capture (Home Card)
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });
    await desktopCtx.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        token: 'local-probe-token',
        user: { name: 'Rian Pratama', level: 'Dasar', exp: 120, email: 'rian@fiezel.local' }
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, timestamp: Date.now() }));
      localStorage.setItem('fz_target_course', 'en');
      localStorage.setItem('fz_tour_completed', 'true');
      localStorage.setItem('fz_tour_done_v1', '1');
      localStorage.setItem('fz_tour_done', '1');
      localStorage.setItem('fz_state_v1@en', JSON.stringify({
        level: 1, placementDone: true, view: 'home', ritualMeta: { lastDay: today },
        toursSeen: { menu: true, library: true, listening: true }
      }));
      localStorage.setItem('fz_state_v1', JSON.stringify({
        level: 1, placementDone: true, view: 'home', ritualMeta: { lastDay: today },
        toursSeen: { menu: true, library: true, listening: true }
      }));
    });
    const desktopPage = await desktopCtx.newPage();
    await desktopPage.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await desktopPage.addStyleTag({ content: '.fz-tour, [class*="fz-tour"], .driver-popover { display: none !important; pointer-events: none !important; }' });
    await desktopPage.waitForTimeout(500);
    await desktopPage.evaluate(() => {
      document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, #fzRitual, .fz-tour, #fzTour, [data-tour], .driver-popover, #modal, #modalPanel, .modal').forEach(el => {
        try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch (_) {}
      });
      document.documentElement.classList.remove('fz-booting');
      document.documentElement.classList.add('fz-app-open');
      if (window.go) window.go('home');
    });
    await desktopPage.waitForTimeout(1200);
    const desktopCard = await desktopPage.waitForSelector('.fz-kawan-card-v2', { timeout: 15000 });
    if (desktopCard) await desktopCard.scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(500);

    const desktopHomeCardPath = path.join(artifactDir, 'preview-home-kawan-card-desktop.png');
    await desktopPage.screenshot({ path: desktopHomeCardPath });
    console.log('[PROBE] Saved desktop home card screenshot:', desktopHomeCardPath);

  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('[PROBE] Error:', err);
  process.exit(1);
});
