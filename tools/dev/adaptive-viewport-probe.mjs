import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'reports', 'adaptive-viewport-probe');
fs.mkdirSync(OUT, { recursive: true });

const TARGET_URL = 'https://fiezel.my.id/app/';

const DEVICES = [
  { id: 'iphone-se', label: 'iPhone SE (375x667)', width: 375, height: 667, isMobile: true, hasTouch: true },
  { id: 'iphone-14', label: 'iPhone 14 (390x844)', width: 390, height: 844, isMobile: true, hasTouch: true },
  { id: 'ipad-portrait', label: 'iPad Portrait (820x1180)', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { id: 'ipad-landscape', label: 'iPad Landscape (1180x820)', width: 1180, height: 820, isMobile: false, hasTouch: true },
  { id: 'desktop', label: 'Desktop (1440x900)', width: 1440, height: 900, isMobile: false, hasTouch: false }
];

const VIEWS = [
  { id: 'home', action: "go('home')" },
  { id: 'classroom', action: "go('classroom')" },
  { id: 'latihan', action: "go('latihan')" },
  { id: 'game', action: "go('game')" },
  { id: 'progress', action: "go('progress')" },
  { id: 'online', action: "go('online')" },
  { id: 'vocab', action: "go('vocab')" },
  { id: 'quiz-vocab', action: "startVocabQuiz()" }
];

async function runProbe() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const results = [];

  for (const dev of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: 2,
      isMobile: dev.isMobile,
      hasTouch: dev.hasTouch
    });

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
          '.woff2': 'font/woff2'
        };
        return route.fulfill({
          status: 200,
          contentType: contentTypes[ext] || 'application/octet-stream',
          body: fs.readFileSync(localFile)
        });
      }
      return route.continue();
    });

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
        localStorage.setItem('fz_tour_seen', '1');
        localStorage.setItem('fz_tour_done', '1');
        window.FiezelTour = null;
      } catch (_) {}
    });

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      try { document.getElementById('fiezelBootSplash')?.remove(); } catch(_) {}
      try { document.documentElement.classList.remove('fz-booting'); } catch(_) {}
      try { document.querySelector('.fiezel-ob')?.remove(); } catch(_) {}
      try { document.querySelector('.fz-auth')?.remove(); } catch(_) {}
      try { document.getElementById('welcome')?.classList.add('hidden'); } catch(_) {}
      try { document.getElementById('authGate')?.classList.add('hidden'); } catch(_) {}
      try { document.querySelectorAll('.fz-tour, .tour-overlay, .tour-bubble, .tour-card, .coach-mark, #ritmeModal, .modal-backdrop').forEach(e => e.remove()); } catch(_) {}
    });

    for (const v of VIEWS) {
      await page.evaluate((act) => {
        try { eval(act); } catch (e) {}
      }, v.action);
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        try { document.querySelectorAll('.fz-tour, .tour-overlay, .tour-bubble, .tour-card, .coach-mark, #ritmeModal, #fzRitual, .fz-ritual, .modal-backdrop, .modal-intensity-sheet').forEach(e => e.remove()); } catch(_) {}
        try { document.getElementById('modal')?.classList.add('hidden'); } catch(_) {}
        try { if (typeof window.syncNavActivePill === 'function') window.syncNavActivePill(); } catch(_) {}
      });

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const app = document.querySelector('main.app');
        const appInner = document.getElementById('app');
        const nav = document.querySelector('nav.bottomnav');
        const topbar = document.querySelector('header.topbar');

        const appRect = app ? app.getBoundingClientRect() : null;
        const navRect = nav ? nav.getBoundingClientRect() : null;
        const navStyle = nav ? window.getComputedStyle(nav) : null;
        const appInnerStyle = appInner ? window.getComputedStyle(appInner) : null;
        const firstSection = appInner && appInner.firstElementChild ? appInner.firstElementChild : null;
        const firstSectionStyle = firstSection ? window.getComputedStyle(firstSection) : null;

        const scrollH = Math.max(docEl.scrollHeight, body.scrollHeight);
        const viewH = window.innerHeight;
        const overflowPx = scrollH - viewH;
        const innerOverflowPx = firstSection ? Math.max(0, firstSection.scrollHeight - firstSection.clientHeight) : 0;

        return {
          viewportW: window.innerWidth,
          viewportH: viewH,
          scrollHeight: scrollH,
          overflowPx,
          innerOverflowPx,
          fitsViewport: overflowPx <= 4,
          appWidth: appRect ? Math.round(appRect.width) : 0,
          appLeft: appRect ? Math.round(appRect.left) : 0,
          navPos: navStyle ? `${navStyle.position} (left:${Math.round(navRect.left)}, top:${Math.round(navRect.top)}, w:${Math.round(navRect.width)}, h:${Math.round(navRect.height)}, dir:${navStyle.flexDirection})` : 'none',
          sectionDisplay: firstSectionStyle ? `${firstSectionStyle.display} (${firstSectionStyle.gridTemplateColumns || firstSectionStyle.flexDirection || ''})` : 'none'
        };
      });

      if ((v.id === 'home' || v.id === 'latihan' || v.id === 'progress') && (dev.id === 'iphone-14' || dev.id === 'ipad-portrait' || dev.id === 'desktop')) {
        await page.screenshot({ path: path.join(OUT, `${dev.id}-${v.id}.png`) });
      }

      results.push({
        device: dev.id,
        view: v.id,
        ...metrics
      });
    }

    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'probe-results-after.json'), JSON.stringify(results, null, 2));
  console.table(results.map(r => ({
    device: r.device,
    view: r.view,
    vp: `${r.viewportW}x${r.viewportH}`,
    scrollH: r.scrollHeight,
    overflow: r.overflowPx,
    secOvf: r.innerOverflowPx,
    fits: r.fitsViewport,
    appW: r.appWidth,
    nav: r.navPos
  })));
}

runProbe().catch(err => {
  console.error(err);
  process.exit(1);
});
