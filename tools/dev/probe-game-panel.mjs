import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/hp/.gemini/antigravity/brain/d090e235-0869-4243-a644-1402b5dfd27e';
const PORT = 4188;

function startServer() {
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
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.woff2': 'font/woff2'
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise(resolve => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function setupAndBoot(page) {
  await page.addInitScript(() => {
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Santoso', locale: 'id', course: 'en' }));
    localStorage.setItem('fiezel-name-v1', JSON.stringify({ name: 'Budi Santoso' }));
    localStorage.setItem('fz_user_name', 'Budi Santoso');
    localStorage.setItem('fz_onboarding_done', '1');
    localStorage.setItem('fz_lang_chosen', 'id');
    localStorage.setItem('fz_streak', '5');
    localStorage.setItem('fz_xp', '420');
    localStorage.setItem('fz_auth_skip', '1');
    localStorage.setItem('fiezel-puter-auth-skipped', '1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fiezel-tour-v1', '1');
    localStorage.setItem('fiezel-state-v1', JSON.stringify({
      preferences: { learnerLocale: 'id', learnerLocaleExplicit: true },
      ritualMeta: { lastDay: today },
      toursSeen: { menu: true, library: true, listening: true }
    }));
    sessionStorage.setItem('fiezel_boot_count', '2');
    setInterval(() => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
    }, 50);
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/index.html...`);
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 30000 });
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    try {
      if (window.__fiezelBootSplash?.dismiss) {
        window.__fiezelBootSplash.dismiss();
      }
      if (window.FiezelTour) {
        window.FiezelTour.show = () => false;
        window.FiezelTour.hide?.();
      }
      if (window.dismissDailyRitual) {
        window.dismissDailyRitual();
      }
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, .fz-prasasti-moment, #fzPrasasti, #fzRitual, .modal.show').forEach(el => el.remove());
      if (window.state) {
        window.state.toursSeen = { menu: true, library: true, listening: true };
        window.state.ritualMeta = { lastDay: new Date().toISOString().slice(0, 10) };
      }
    } catch (e) {
      console.error('Error during splash dismiss:', e);
    }
  });
  await page.waitForTimeout(600);
}

async function run() {
  const server = await startServer();
  console.log(`Embedded static server running on http://127.0.0.1:${PORT}`);

  try {
    console.log('Launching Chromium for Game Panel Probe...');
    const browser = await chromium.launch({ headless: true });

    // 1. Mobile viewport test (390 x 844)
    console.log('--- Testing Mobile Viewport (390 x 844) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });
    const page = await mobileContext.newPage();
    await setupAndBoot(page);

    const navButtons = await page.$$('.bottomnav button.nav');
    console.log(`Bottom nav buttons count: ${navButtons.length}`);

    const navLabels = await page.$$eval('.bottomnav button.nav', els => els.map(e => ({
      view: e.getAttribute('data-view'),
      text: e.innerText.trim(),
      visible: e.offsetWidth > 0 && e.offsetHeight > 0
    })));
    console.log('Nav items:', JSON.stringify(navLabels));

    const homeScreenshotPath = path.join(ARTIFACTS_DIR, 'home-bottomnav-mobile-view.png');
    await page.screenshot({ path: homeScreenshotPath, fullPage: false });
    console.log(`Home screenshot saved to: ${homeScreenshotPath}`);

    console.log('Clicking Game tab...');
    await page.click('[data-testid="nav-game"]', { force: true });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.getElementById('fzRitual')?.remove();
    });
    await page.waitForTimeout(400);

    const isGameActive = await page.$eval('[data-view="game"]', el => el.classList.contains('active'));
    console.log(`Game tab has .active class: ${isGameActive}`);

    const mobileScreenshotPath = path.join(ARTIFACTS_DIR, 'game-panel-mobile-view.png');
    await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
    console.log(`Mobile screenshot saved to: ${mobileScreenshotPath}`);

    // Scroll down to see arcade cards on mobile
    await page.evaluate(() => window.scrollBy(0, 420));
    await page.waitForTimeout(400);
    const mobileScrollScreenshotPath = path.join(ARTIFACTS_DIR, 'game-panel-mobile-scrolled.png');
    await page.screenshot({ path: mobileScrollScreenshotPath, fullPage: false });
    console.log(`Mobile scrolled screenshot saved to: ${mobileScrollScreenshotPath}`);

    // Scroll further to see the 4 arcade poster cards
    await page.evaluate(() => window.scrollBy(0, 460));
    await page.waitForTimeout(400);
    const mobileArcadeScreenshotPath = path.join(ARTIFACTS_DIR, 'game-panel-mobile-arcade.png');
    await page.screenshot({ path: mobileArcadeScreenshotPath, fullPage: false });
    console.log(`Mobile arcade screenshot saved to: ${mobileArcadeScreenshotPath}`);

    // 2. Desktop viewport test (1200 x 800)
    console.log('--- Testing Desktop Viewport (1200 x 800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1200, height: 800 },
      deviceScaleFactor: 1
    });
    const desktopPage = await desktopContext.newPage();
    await setupAndBoot(desktopPage);

    await desktopPage.click('[data-testid="nav-game"]', { force: true });
    await desktopPage.waitForTimeout(600);
    await desktopPage.evaluate(() => {
      document.getElementById('fzRitual')?.remove();
    });
    await desktopPage.waitForTimeout(400);

    const desktopScreenshotPath = path.join(ARTIFACTS_DIR, 'game-panel-desktop-view.png');
    await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: false });
    console.log(`Desktop screenshot saved to: ${desktopScreenshotPath}`);

    await browser.close();
    console.log('Probe completed successfully!');
  } finally {
    server.close();
  }
}

run().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
