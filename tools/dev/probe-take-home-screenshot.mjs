import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');
const ARTIFACT_DIR = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\6dcb1367-b8ab-4757-b970-69d2dbaccd49';
const STILLS_DIR = path.join(ROOT, 'tools', 'dev', 'output-stills');

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.mkdirSync(STILLS_DIR, { recursive: true });

const LIVE_URL = 'https://fiezel.my.id/app/';

async function setupContextAndRoutes(context) {
  // Mock API routes
  await context.route('**/api/auth/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, signedIn: true, account: { handle: 'budi_pratama', name: 'Budi Pratama', role: 'murid' } })
    });
  });

  await context.route('**/api/auth/anon', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true })
    });
  });

  await context.route('**/api/config', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, flags: { cfSocialEnabled: true } })
    });
  });

  await context.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: {} })
    });
  });

  // Serve local files directly
  await context.route('https://fiezel.my.id/app/**', async route => {
    const url = new URL(route.request().url());
    let relPath = url.pathname.replace(/^\/app\/?/, '');
    if (!relPath || relPath === '' || relPath === 'index.html') relPath = 'index.html';
    relPath = relPath.split('?')[0];

    const localFile = path.join(ROOT, relPath);
    if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
      const ext = path.extname(localFile).toLowerCase();
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
        '.mp3': 'audio/mpeg'
      };
      return route.fulfill({
        status: 200,
        contentType: contentTypes[ext] || 'application/octet-stream',
        body: fs.readFileSync(localFile)
      });
    }

    return route.continue();
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  await context.addInitScript(({ todayStr }) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.FIEZEL_CF_CONFIG = { base: 'https://api.fiezel.my.id' };
      localStorage.setItem('fz_user_name', 'Budi Pratama');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-splash-seen-v1', todayStr);
      sessionStorage.setItem('fiezel-launch-session-v1', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Pratama', at: Date.now(), via: 'finish', locale: 'id' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      sessionStorage.setItem('fiezel_boot_count', '2');

      const stateObj = {
        version: '5.19.0',
        userName: 'Budi Pratama',
        view: 'home',
        toursSeen: { menu: true, library: true, listening: true },
        daily: { date: todayStr, count: 5, attempts: 5, meaningful: true },
        streak: 5,
        xp: 150,
        level: 'A1',
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'A1', motion: false, haptics: true }
      };
      localStorage.setItem('fiezel-v4-state', JSON.stringify(stateObj));
      localStorage.setItem('fiezel-state-v1', JSON.stringify(stateObj));
    } catch (_) {}
  }, { todayStr });
}

async function preparePage(page) {
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[PAGE ERROR LOG]:', msg.text());
  });
  page.on('pageerror', err => console.log('[UNCAUGHT ERROR]:', err.message));

  await page.goto(LIVE_URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  // Dismiss splash and force render home view
  await page.evaluate(() => {
    try { window.__fiezelBootSplash?.dismiss?.(); } catch (_) {}
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelectorAll('.fiezel-splash, .fz-tour, .fz-tour-scrim, [data-tour-card], .fz-ritual-sheet, #fzRitual, .welcome').forEach(el => el.remove());
    if (typeof openApp === 'function' && !window.appOpened) {
      openApp();
    }
    if (typeof go === 'function') {
      go('home');
    } else if (typeof render === 'function') {
      render();
    }
  });

  await page.addStyleTag({
    content: `
      #fiezelBootSplash, .fiezel-splash, .fz-tour, .fz-tour-scrim, [data-tour-card], .fz-ritual-sheet, #fzRitual, .welcome, #authGate {
        display: none !important;
        pointer-events: none !important;
      }
      html.fz-booting, body.fz-booting {
        overflow: auto !important;
      }
      .app {
        opacity: 1 !important;
        visibility: visible !important;
      }
    `
  });

  // Wait for home page content to settle
  await page.waitForSelector('#app .home-page, #app .home-today, #app .launcher-shell, #app', { timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function main() {
  console.log('=== STARTING FIEZEL HOME SCREENSHOT CAPTURE ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  // 1. Mobile Device (iPhone 14 standard: 390x844, 2x scale)
  console.log('\n[1/3] Capturing Mobile Viewport...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await setupContextAndRoutes(mobileContext);

  const mobilePage = await mobileContext.newPage();
  await preparePage(mobilePage);

  const mobileInfo = await mobilePage.evaluate(() => {
    const appEl = document.getElementById('app');
    const homeEl = document.querySelector('.home-page, .home-today, .launcher-shell');
    const topbar = document.querySelector('header.topbar');
    const bottomnav = document.querySelector('.bottomnav');
    return {
      title: document.title,
      view: typeof state !== 'undefined' ? state?.view : 'undefined',
      appChildrenCount: appEl?.children?.length,
      homeElFound: !!homeEl,
      homeTextSnippet: homeEl?.textContent?.slice(0, 150)?.replace(/\s+/g, ' '),
      topbarVisible: topbar ? window.getComputedStyle(topbar).display : 'none',
      bottomnavVisible: bottomnav ? window.getComputedStyle(bottomnav).display : 'none',
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight
    };
  });
  console.log('[DEBUG MOBILE DOM INFO]:', JSON.stringify(mobileInfo, null, 2));

  const mobileViewportPath = path.join(ARTIFACT_DIR, 'fiezel-home-mobile.png');
  await mobilePage.screenshot({ path: mobileViewportPath, fullPage: false });
  console.log(`[CAPTURED] Mobile Viewport -> ${mobileViewportPath}`);

  // 2. Mobile Full Page
  console.log('\n[2/3] Capturing Mobile Full Page...');
  const mobileFullPath = path.join(ARTIFACT_DIR, 'fiezel-home-mobile-full.png');
  await mobilePage.screenshot({ path: mobileFullPath, fullPage: true });
  console.log(`[CAPTURED] Mobile Full Page -> ${mobileFullPath}`);

  // Copy mobile to stills dir
  fs.copyFileSync(mobileViewportPath, path.join(STILLS_DIR, 'fiezel-home-mobile.png'));
  fs.copyFileSync(mobileFullPath, path.join(STILLS_DIR, 'fiezel-home-mobile-full.png'));

  // 3. Desktop / Tablet Viewport (1280x800)
  console.log('\n[3/3] Capturing Desktop Viewport...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });
  await setupContextAndRoutes(desktopContext);

  const desktopPage = await desktopContext.newPage();
  await preparePage(desktopPage);

  const desktopViewportPath = path.join(ARTIFACT_DIR, 'fiezel-home-desktop.png');
  await desktopPage.screenshot({ path: desktopViewportPath, fullPage: false });
  console.log(`[CAPTURED] Desktop Viewport -> ${desktopViewportPath}`);

  fs.copyFileSync(desktopViewportPath, path.join(STILLS_DIR, 'fiezel-home-desktop.png'));

  await browser.close();
  console.log('\n=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===');
}

main().catch(err => {
  console.error('[PROBE FATAL ERROR]', err);
  process.exit(1);
});
