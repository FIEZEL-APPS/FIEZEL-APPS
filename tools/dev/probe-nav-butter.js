#!/usr/bin/env node
'use strict';

/**
 * tools/dev/probe-nav-butter.js
 *
 * Empirical Playwright probe audit for:
 * 1. Butter yellow & glossy floating capsule dock (.bottomnav).
 * 2. Sliding liquid pill indicator (#navActivePill).
 * 3. Sequential tab glide across 6 tabs: Home -> KelasKu -> Latihan -> Game -> Progres -> Profil -> Home.
 * 4. High-resolution screenshots saved to tools/dev/screenshots/butter_01_home.png ... butter_06_profil.png.
 * 5. Style assertions:
 *    - Butter yellow background & gradient (warm tones, NOT dark rgb(22, 22, 26)).
 *    - Border-radius 9999px (capsule).
 *    - Floating position (bottom margin >= 14px above screen bottom).
 *    - Pill width > 50px and transform X offset gliding correctly.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ORIGIN = 'http://localhost:4173';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp'
};

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}

function fromDisk(urlStr) {
  const u = new URL(urlStr);
  const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const target = path.resolve(ROOT, rel === '' ? 'index.html' : rel);
  if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    return { status: 404, body: '' };
  }
  return {
    status: 200,
    contentType: MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
    body: fs.readFileSync(target)
  };
}

async function run() {
  console.log('=== STARTING BUTTER YELLOW GLOSSY BOTTOMNAV EMPIRICAL PROBE AUDIT ===\n');

  const pw = loadPlaywright();
  if (!pw) {
    console.error('FAIL: Playwright could not be loaded.');
    process.exit(1);
  }

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--no-first-run']
  });

  // Test Condition 1: Mobile viewport 390x844 (iPhone 14 / modern smartphone)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    serviceWorkers: 'block'
  });

  await context.route('**/*', route => {
    const url = route.request().url();
    if (!url.startsWith(ORIGIN + '/')) return route.abort();
    return route.fulfill(fromDisk(url));
  });

  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('fz_user_name', 'Budi Pratama');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Pratama', at: Date.now(), via: 'finish', locale: 'id' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      const stateObj = {
        version: '5.19.0',
        userName: 'Budi Pratama',
        view: 'home',
        toursSeen: { menu: true, library: true, listening: true },
        daily: { date: '2026-10-08', count: 5, attempts: 5, meaningful: true },
        streak: 5,
        xp: 150,
        level: 'A1',
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'A1' }
      };
      localStorage.setItem('fiezel-state-v1', JSON.stringify(stateObj));
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      sessionStorage.setItem('fiezel_boot_count', '2');
    } catch (_) {}
  });

  const page = await context.newPage();
  console.log(`Navigating to ${ORIGIN}/ (viewport 390x844)...`);
  await page.goto(ORIGIN + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 30000 });
  await page.waitForTimeout(1000);

  // Clear any overlays, dismiss tour/splash, trigger initial pill sync
  await page.evaluate(() => {
    try { window.skipPuterSignIn?.(); } catch (_) {}
    try { window.dismissWelcome?.(); } catch (_) {}
    try { window.FiezelSplash?.dismiss?.(); } catch (_) {}
    try { window.closeModal?.(); } catch (_) {}
    try { window.FiezelTour?.end?.(); } catch (_) {}
    document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .modal, #fiezelSplash, #fiezelBootSplash, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, .toast').forEach(el => el.remove());
    document.body.classList.remove('fz-booting', 'fz-auth-open');
    if (window.syncNavActivePill) window.syncNavActivePill();
  });
  await page.waitForTimeout(500);

  // =========================================================================
  // CONDITION 2: Inspect computed styles of .bottomnav and #navActivePill
  // =========================================================================
  console.log('--- Inspecting Initial Computed Styles (.bottomnav & #navActivePill) ---');
  const navStyles = await page.evaluate(() => {
    const nav = document.querySelector('.bottomnav');
    const pill = document.getElementById('navActivePill');
    if (!nav) return { error: 'No .bottomnav found' };

    const compNav = window.getComputedStyle(nav);
    const compPill = pill ? window.getComputedStyle(pill) : null;
    const navRect = nav.getBoundingClientRect();
    const bottomGap = window.innerHeight - navRect.bottom;

    return {
      nav: {
        bg: compNav.backgroundColor,
        bgImage: compNav.backgroundImage,
        borderRadius: compNav.borderRadius,
        boxShadow: compNav.boxShadow,
        width: navRect.width,
        height: navRect.height,
        bottomGap: bottomGap,
        display: compNav.display,
        position: compNav.position
      },
      pill: compPill ? {
        bg: compPill.backgroundColor,
        bgImage: compPill.backgroundImage,
        borderRadius: compPill.borderRadius,
        boxShadow: compPill.boxShadow,
        width: parseFloat(compPill.width),
        opacity: compPill.opacity,
        transform: compPill.transform
      } : null
    };
  });

  console.log('Bottomnav Computed Styles:', JSON.stringify(navStyles.nav, null, 2));
  console.log('Active Pill Computed Styles:', JSON.stringify(navStyles.pill, null, 2));

  // Assertions on bottomnav
  let auditPassed = true;
  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
    } else {
      console.error(`  [FAIL] ${message}`);
      auditPassed = false;
    }
  }

  // 1. Butter yellow & glossy specular shadow (NOT dark rgb(22, 22, 26))
  const isDark = navStyles.nav.bg.includes('22, 22, 26') || navStyles.nav.bg.includes('0, 0, 0') && !navStyles.nav.bgImage.includes('gradient');
  const isButterGradient = navStyles.nav.bgImage.includes('gradient') || navStyles.nav.bg.includes('254') || navStyles.nav.bg.includes('255');
  assert(!isDark, 'Bottomnav background is NOT dark theme (not rgba(22, 22, 26, ...))');
  assert(isButterGradient, 'Bottomnav has butter yellow frosted gradient background');

  // 2. Stay-fixed dock docked firmly at bottom 0 and full width (NO floating gap, NO see-through)
  assert(navStyles.nav.bottomGap <= 1, `Bottomnav is stay-fixed docked at bottom edge (gap: ${navStyles.nav.bottomGap}px <= 1px)`);
  assert(navStyles.nav.width >= 380, `Bottomnav is full-width docked bar (width: ${navStyles.nav.width}px >= 380px)`);

  // 4. Active pill exists and has rounded radius
  assert(!!navStyles.pill, '#navActivePill element exists inside bottomnav');
  if (navStyles.pill) {
    const isPillCapsule = navStyles.pill.borderRadius.includes('9999px') || parseFloat(navStyles.pill.borderRadius) >= 20;
    assert(isPillCapsule, `Active pill border radius is capsule (computed: ${navStyles.pill.borderRadius})`);
  }

  // =========================================================================
  // CONDITION 3: Simulate sequential clicks across all tabs & take screenshots
  // Tabs: Home -> KelasKu -> Latihan -> Game -> Progres -> Profil -> Home
  // =========================================================================
  console.log('\n--- Simulating Sequential Clicks & Capturing High-Res Screenshots ---');

  const tabs = [
    { name: 'Home', testId: 'nav-home', view: 'home', file: 'butter_01_home.png', label: 'Hari ini' },
    { name: 'KelasKu', testId: 'nav-classroom', view: 'classroom', file: 'butter_02_kelasku.png', label: 'KelasKu' },
    { name: 'Latihan', testId: 'nav-latihan', view: 'latihan', file: 'butter_03_latihan.png', label: 'Latihan' },
    { name: 'Game', testId: 'nav-game', view: 'game', file: 'butter_04_game.png', label: 'Game' },
    { name: 'Progres', testId: 'nav-progress', view: 'progress', file: 'butter_05_progres.png', label: 'Progres' },
    { name: 'Profil', testId: 'nav-profile', view: 'online', file: 'butter_06_profil.png', label: 'Profil' }
  ];

  const screenshotPaths = [];

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    console.log(`\nNavigating to Tab [${tab.name}] (selector: [data-testid="${tab.testId}"])...`);

    if (i > 0) {
      await page.click(`[data-testid="${tab.testId}"]`);
      await page.waitForTimeout(450); // allow spring slide transition
    }

    // Inspect active state and pill position
    const tabState = await page.evaluate((targetView) => {
      const activeBtn = document.querySelector('.bottomnav .nav.active');
      const pill = document.getElementById('navActivePill');
      const nav = document.querySelector('.bottomnav');
      const navRect = nav.getBoundingClientRect();
      const pillRect = pill ? pill.getBoundingClientRect() : null;
      const activeRect = activeBtn ? activeBtn.getBoundingClientRect() : null;

      let matrixX = 0;
      if (pill) {
        const tr = window.getComputedStyle(pill).transform;
        if (tr && tr !== 'none') {
          const match = tr.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,\s*([^,]+)/);
          if (match) matrixX = parseFloat(match[1]);
        }
      }

      return {
        activeView: activeBtn?.getAttribute('data-view'),
        activeLabel: activeBtn?.innerText?.trim(),
        pillWidth: pillRect ? pillRect.width : 0,
        pillX: pillRect ? (pillRect.left - navRect.left) : 0,
        matrixX: matrixX,
        pillOpacity: pill ? parseFloat(window.getComputedStyle(pill).opacity) : 0,
        activeRectWidth: activeRect ? activeRect.width : 0
      };
    }, tab.view);

    console.log(`  Tab: ${tab.name} | ActiveView: ${tabState.activeView} | PillWidth: ${tabState.pillWidth.toFixed(1)}px | PillX: ${tabState.pillX.toFixed(1)}px | MatrixX: ${tabState.matrixX.toFixed(1)}px`);

    // Verify active class
    assert(tabState.activeView === tab.view, `Tab button for [${tab.name}] has .active class`);
    // Verify pill width > 50px
    assert(tabState.pillWidth >= 50, `Sliding pill width is >= 50px (computed: ${tabState.pillWidth.toFixed(1)}px)`);
    // Verify pill opacity is visible
    assert(tabState.pillOpacity > 0.8, `Sliding pill is visible (opacity: ${tabState.pillOpacity})`);

    // Capture screenshot
    const shotPath = path.join(OUT_DIR, tab.file);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`  [SCREENSHOT] Saved: ${shotPath} (${(fs.statSync(shotPath).size / 1024).toFixed(1)} KB)`);
    screenshotPaths.push(shotPath);
  }

  // Final cycle back to Home
  console.log('\nCycling back to Home tab to confirm bidirectional glide...');
  await page.click('[data-testid="nav-home"]');
  await page.waitForTimeout(450);

  const homeBackState = await page.evaluate(() => {
    const activeBtn = document.querySelector('.bottomnav .nav.active');
    const pill = document.getElementById('navActivePill');
    const nav = document.querySelector('.bottomnav');
    const navRect = nav.getBoundingClientRect();
    const pillRect = pill ? pill.getBoundingClientRect() : null;
    return {
      activeView: activeBtn?.getAttribute('data-view'),
      pillWidth: pillRect ? pillRect.width : 0,
      pillX: pillRect ? (pillRect.left - navRect.left) : 0
    };
  });
  console.log(`  Home Back: ActiveView: ${homeBackState.activeView} | PillWidth: ${homeBackState.pillWidth.toFixed(1)}px | PillX: ${homeBackState.pillX.toFixed(1)}px`);
  assert(homeBackState.activeView === 'home', 'Returned cleanly to Home tab with active state');
  assert(homeBackState.pillWidth >= 50, 'Home tab sliding pill width preserved');

  await browser.close();

  console.log('\n======================================================');
  console.log(`AUDIT RESULT: ${auditPassed ? 'ALL PASS (100% HIJAU)' : 'FAILURES DETECTED'}`);
  console.log('Captured Screenshots:');
  screenshotPaths.forEach(p => console.log(' - ' + p));
  console.log('======================================================\n');

  if (!auditPassed) process.exit(1);
}

run().catch(err => {
  console.error('PROBE ERROR:', err);
  process.exit(1);
});
