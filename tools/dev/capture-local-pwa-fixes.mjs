import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'reports', 'local-pwa-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const TARGET_URL = 'https://fiezel.my.id/app/';

async function capture() {
  console.log('=== Capturing Local PWA Fixes (Edge-Fit, Compact Pill, Zero Duplicates) ===');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  // Intercept app requests to serve local files
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
        '.svg': 'image/svg+xml'
      };
      return route.fulfill({
        status: 200,
        contentType: contentTypes[ext] || 'application/octet-stream',
        body: fs.readFileSync(localFile)
      });
    }
    return route.continue();
  });

  // Mock session API
  await context.route('**/api/auth/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, signedIn: true, account: { handle: 'Rani', role: 'murid' } })
    });
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-state-v1', JSON.stringify({
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, learningIntensity: 'santai', learningIntensityChosen: true, motion: false },
        level: 1,
        activeLevel: 'A1',
        history: [],
        grammar: { 'to-be-present': { vocabReady: true, mastered: false } },
        toursSeen: { menu: true, library: true, listening: true }
      }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-tour-seen', '1');
      localStorage.setItem('fz_tour_menu', '1');
      localStorage.setItem('fz_tour_library', '1');
      localStorage.setItem('fz_tour_listening', '1');
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ menu: true, library: true, listening: true }));
      localStorage.setItem('fiezel-tour-seen', '1');
      localStorage.setItem('fz_tour_menu', '1');
      localStorage.setItem('fz_tour_library', '1');
      localStorage.setItem('fz_tour_listening', '1');
      localStorage.setItem('fz_tour_seen', '1');
      localStorage.setItem('fz_tour_done', '1');
      window.FiezelTour = null;
    } catch (_) {}
  });

  console.log('Navigating to App...');
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const cleanOverlays = async () => {
    await page.evaluate(() => {
      try { document.getElementById('fiezelBootSplash')?.remove(); } catch(_) {}
      try { document.documentElement.classList.remove('fz-booting'); } catch(_) {}
      try { document.querySelector('.fiezel-ob')?.remove(); } catch(_) {}
      try { document.querySelector('.fz-auth')?.remove(); } catch(_) {}
      try {
        if (typeof window.FiezelTour !== 'undefined' && window.FiezelTour && typeof window.FiezelTour.finish === 'function') {
          window.FiezelTour.finish();
        }
      } catch(_) {}
      try { document.querySelectorAll('.fz-tour, .tour-overlay, .tour-bubble, .tour-card, .coach-mark, #ritmeModal, .modal-backdrop, [class*="tour"]').forEach(e => e.remove()); } catch(_) {}
      try {
        const modal = document.querySelector('.modal-intensity-sheet');
        if (modal) {
          const opt = modal.querySelector('.intensity-option-card');
          if (opt) opt.click();
          else modal.remove();
        }
      } catch(_) {}
      try {
        if (typeof closeModal === 'function') closeModal();
      } catch(_) {}
      try {
        if (typeof state !== 'undefined' && state.preferences) {
          state.preferences.learningIntensityChosen = true;
          state.preferences.learningIntensity = 'santai';
        }
      } catch(_) {}
      try {
        const tourSkip = Array.from(document.querySelectorAll('.fz-tour button, .tour-bubble button')).find(b => b.textContent && b.textContent.includes('Lewati'));
        if (tourSkip) tourSkip.click();
      } catch(_) {}
    });
    await page.waitForTimeout(200);
  };

  await cleanOverlays();

  // 1. Home Panel
  console.log('1. Capturing Home Panel...');
  await page.evaluate(() => window.go('home'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '01-home-screen.png') });

  // 2. Latihan Panel
  console.log('2. Capturing Latihan Panel...');
  await page.evaluate(() => window.go('latihan'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '02-latihan-panel.png') });

  // 3. Grammar Panel
  console.log('3. Capturing Grammar Panel...');
  await page.evaluate(() => window.go('grammar'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '03-grammar-map.png') });

  // 4. Vocab Hub
  console.log('4. Capturing Vocab Hub...');
  await page.evaluate(() => window.go('vocab'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '04-vocab-hub.png') });

  // 5. KelasKu Panel
  console.log('5. Capturing KelasKu Panel...');
  await page.evaluate(() => window.go('classroom'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '05-kelasku-panel.png') });

  // 6. Profil Panel
  console.log('6. Capturing Profil Panel...');
  await page.evaluate(() => window.go('profile'));
  await page.waitForTimeout(800);
  await cleanOverlays();
  await page.screenshot({ path: path.join(OUT, '06-profil-panel.png') });

  console.log('Screenshots saved to:', OUT);
  await browser.close();
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
