import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'reports', 'universal-gallery', '06-contextual-topbar-verification');
fs.mkdirSync(OUT, { recursive: true });

const LIVE_URL = 'https://fiezel.my.id/app/';

async function run() {
  console.log('=== Running Contextual Topbar & Panel Overhaul Verification Probe ===');

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

  // Mock session API
  await context.route('**/api/auth/session', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, signedIn: true, account: { handle: 'Rani', role: 'murid' } })
    });
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

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('UNCAUGHT PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-state-v1', JSON.stringify({
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, learningIntensity: 'santai', learningIntensityChosen: true, motion: false },
        level: 1,
        activeLevel: 'A1',
        history: [],
        grammar: {},
        toursSeen: { menu: true, library: true, listening: true }
      }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-tour-seen', '1');
      localStorage.setItem('fz_tour_menu', '1');
      localStorage.setItem('fz_tour_library', '1');
      localStorage.setItem('fz_tour_listening', '1');
      localStorage.setItem('fz_tour_seen', '1');
      localStorage.setItem('fz_tour_done', '1');
      window.FiezelTour = null;
    } catch (_) {}
  });

  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Clean overlays
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove();
    document.querySelector('.fz-auth')?.remove();
    document.querySelector('.fz-tour')?.remove();
    document.querySelectorAll('.coach-mark, .tour-bubble').forEach(e => e.remove());
    const rm = document.getElementById('ritmeModal');
    if (rm) { rm.classList.remove('show'); rm.style.display = 'none'; }
  });

  const cleanOverlays = async () => {
    await page.evaluate(() => {
      document.querySelectorAll('.fz-tour, .tour-bubble, #ritmeModal, .coach-mark').forEach(e => e.remove());
    });
  };

  const readTopbar = async () => {
    return page.evaluate(() => {
      const topBrand = document.getElementById('topBrandWrap');
      const topContext = document.getElementById('topContextWrap');
      const backBtn = document.getElementById('topContextBackBtn');
      const title = document.getElementById('topContextTitle');
      const actions = document.getElementById('topContextActions');
      const courseBtn = document.getElementById('fzCourseSwitchBtn');
      const settingsBtn = document.getElementById('topSettingsBtn');
      const brandKelasKu = document.getElementById('topBrandKelasKu');
      const clusterKelasKu = document.getElementById('topKelasKuCluster');

      return {
        view: typeof state !== 'undefined' ? state.view : null,
        brandDisplay: topBrand ? window.getComputedStyle(topBrand).display : 'none',
        contextDisplay: topContext ? window.getComputedStyle(topContext).display : 'none',
        backDisplay: backBtn ? window.getComputedStyle(backBtn).display : 'none',
        titleText: title ? title.textContent.trim() : '',
        actionsDisplay: actions ? window.getComputedStyle(actions).display : 'none',
        hasLevelInActions: actions ? !!actions.querySelector('.active-level-control') : false,
        courseDisplay: courseBtn ? window.getComputedStyle(courseBtn).display : 'none',
        settingsDisplay: settingsBtn ? window.getComputedStyle(settingsBtn).display : 'none',
        brandKelasKuDisplay: brandKelasKu ? window.getComputedStyle(brandKelasKu).display : 'none',
        clusterKelasKuDisplay: clusterKelasKu ? window.getComputedStyle(clusterKelasKu).display : 'none'
      };
    });
  };

  // 1. Home Panel
  console.log('\n--- 1. Testing Home Panel ---');
  await page.evaluate(() => window.go('home'));
  await page.waitForTimeout(600);
  await cleanOverlays();
  const homeTb = await readTopbar();
  console.log('Home Topbar:', homeTb);
  if (homeTb.brandDisplay !== 'flex' || homeTb.courseDisplay === 'none' || homeTb.contextDisplay !== 'none') {
    throw new Error('Home topbar invariant violated!');
  }
  await page.screenshot({ path: path.join(OUT, '01-home-topbar.png') });

  // 2. Latihan Panel
  console.log('\n--- 2. Testing Latihan Panel ---');
  await page.evaluate(() => window.go('latihan'));
  await page.waitForTimeout(600);
  await cleanOverlays();
  const latihanTb = await readTopbar();
  console.log('Latihan Topbar:', latihanTb);
  if (latihanTb.brandDisplay !== 'none' || latihanTb.courseDisplay !== 'none' || latihanTb.contextDisplay !== 'flex' || latihanTb.titleText !== 'Latihan' || !latihanTb.hasLevelInActions) {
    throw new Error('Latihan topbar invariant violated!');
  }
  await page.screenshot({ path: path.join(OUT, '02-latihan-topbar.png') });

  // 3. Grammar Panel
  console.log('\n--- 3. Testing Grammar Panel ---');
  const gRes = await page.evaluate(() => {
    const ok = window.go('grammar');
    return { ok, view: state.view };
  });
  console.log('go grammar result:', gRes);
  await page.waitForTimeout(600);
  await cleanOverlays();
  const grammarTb = await readTopbar();
  console.log('Grammar Topbar:', grammarTb);
  if (grammarTb.brandDisplay !== 'none' || grammarTb.courseDisplay !== 'none' || grammarTb.contextDisplay !== 'flex' || grammarTb.backDisplay === 'none' || grammarTb.titleText !== 'Grammar' || !grammarTb.hasLevelInActions) {
    throw new Error('Grammar topbar invariant violated!');
  }
  await page.screenshot({ path: path.join(OUT, '03-grammar-topbar.png') });

  // 4. Vocab Panel (Kosakata)
  console.log('\n--- 4. Testing Vocab Panel (Kosakata) ---');
  await page.evaluate(() => window.go('vocab'));
  await page.waitForTimeout(600);
  await cleanOverlays();
  const vocabTb = await readTopbar();
  console.log('Vocab Topbar:', vocabTb);
  if (vocabTb.brandDisplay !== 'none' || vocabTb.courseDisplay !== 'none' || vocabTb.contextDisplay !== 'flex' || vocabTb.backDisplay === 'none' || vocabTb.titleText !== 'Kosakata' || !vocabTb.hasLevelInActions) {
    throw new Error('Vocab topbar invariant violated!');
  }
  const hasVocabHubPage = await page.$('.vocab-hub-page');
  const hasHeroCard = await page.$('.vocab-hero-card');
  const hasFlashcardBtn = await page.$('.vocab-main-flashcard-btn');
  const hasQuickGrid = await page.$('.vocab-quick-grid');
  console.log('Vocab DOM Elements:', {
    hasVocabHubPage: !!hasVocabHubPage,
    hasHeroCard: !!hasHeroCard,
    hasFlashcardBtn: !!hasFlashcardBtn,
    hasQuickGrid: !!hasQuickGrid
  });
  if (!hasVocabHubPage || !hasHeroCard || !hasFlashcardBtn || !hasQuickGrid) {
    throw new Error('Vocab modern layout elements missing!');
  }
  await page.screenshot({ path: path.join(OUT, '04-vocab-topbar-and-card.png') });

  // 5. KelasKu Panel
  console.log('\n--- 5. Testing KelasKu Panel ---');
  await page.evaluate(() => window.go('classroom'));
  await page.waitForTimeout(600);
  await cleanOverlays();
  const kelasTb = await readTopbar();
  console.log('KelasKu Topbar:', kelasTb);
  if (kelasTb.brandDisplay !== 'none' || kelasTb.brandKelasKuDisplay !== 'flex' || kelasTb.clusterKelasKuDisplay !== 'flex') {
    throw new Error('KelasKu topbar invariant violated!');
  }
  await page.screenshot({ path: path.join(OUT, '05-kelasku-topbar.png') });

  // 6. Profile Panel
  console.log('\n--- 6. Testing Profile Panel ---');
  await page.evaluate(() => window.go('profile'));
  await page.waitForTimeout(600);
  await cleanOverlays();
  const profileTb = await readTopbar();
  console.log('Profile Topbar:', profileTb);
  if (profileTb.brandDisplay !== 'none' || profileTb.settingsDisplay === 'none' || profileTb.courseDisplay !== 'none' || profileTb.contextDisplay !== 'flex') {
    throw new Error('Profile topbar invariant violated!');
  }
  await page.screenshot({ path: path.join(OUT, '06-profile-topbar.png') });

  // 7. Test Topbar Back Button
  console.log('\n--- 7. Testing Topbar Back Button Navigation ---');
  await page.evaluate(() => window.go('grammar'));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.handleTopbarBack());
  await page.waitForTimeout(600);
  const backTarget = await page.evaluate(() => state.view);
  console.log('Back from grammar landed on view:', backTarget, '(Expected: latihan)');
  if (backTarget !== 'latihan') {
    throw new Error('Topbar back navigation failed!');
  }

  console.log('\n=== ALL PROBE CHECKS PASSED PERFECTLY (100% GREEN) ===');
  await browser.close();
}

run().catch(err => {
  console.error('PROBE ERROR:', err);
  process.exit(1);
});
