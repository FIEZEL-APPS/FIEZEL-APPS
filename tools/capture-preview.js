const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.join('C:', 'Users', 'hp', '.gemini', 'antigravity', 'brain', 'd266a757-7392-425b-baa1-797d9d2505d7');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 mobile viewport
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Seed user state so it goes straight to Home without tour/rituals
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Fitra' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true, at: Date.now() }));
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-active-level-v1', 'A1');
    } catch (_) {}
  });

  console.log('Navigating to http://localhost:8080/index.html ...');
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'load', timeout: 30000 });

  // Settle splash & overlays
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    try {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('welcome')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
      document.querySelector('.fz-ritual-sheet')?.remove();
      document.querySelector('.modal-scrim')?.remove();
      document.querySelectorAll('.fz-tour, .fz-tour-card, [class*="fz-tour"]').forEach(e => e.remove());
      if (typeof window.go === 'function') window.go('home');
    } catch (_) {}
  });
  await page.waitForTimeout(1000);

  // 1. Screenshot Home with NUJUM Card
  await page.evaluate(() => {
    try {
      const skipBtns = Array.from(document.querySelectorAll('button')).filter(b => /Lewati|Nanti dulu|Lanjut/i.test(b.textContent || ''));
      skipBtns.forEach(b => b.click());
      document.querySelectorAll('.fz-tour, .fz-tour-card, [class*="fz-tour"], .fz-ritual-sheet, #fzRitual, .modal-scrim, [class*="coach"]').forEach(e => e.remove());
      window.scrollTo(0, 0);
    } catch (_) {}
  });
  await page.waitForTimeout(600);

  const homePath = path.join(ARTIFACT_DIR, 'preview-nujum-home.png');
  await page.screenshot({ path: homePath, fullPage: false });
  console.log('Home screenshot saved:', homePath);

  // 2. Open NUJUM Arena (Live Glass-Box HUD)
  await page.evaluate(() => {
    if (typeof window.go === 'function') window.go('nujum');
  });
  await page.waitForTimeout(1500);

  // Clean any stray elements inside nujum
  await page.evaluate(() => {
    document.querySelectorAll('.fz-tour, .fz-tour-card, [class*="fz-tour"]').forEach(e => e.remove());
    document.querySelectorAll('.fz-subtitle-band, #fzSubtitle, .subtitle-band').forEach(e => e.remove());
  });

  const arenaPath = path.join(ARTIFACT_DIR, 'preview-nujum-arena.png');
  await page.screenshot({ path: arenaPath, fullPage: false });
  console.log('Live NUJUM Arena screenshot saved:', arenaPath);

  // 3. Click "Aku Menyerah" to test Honest Surrender & Echo Redemption
  await page.evaluate(() => {
    const btn = document.getElementById('nujumSurrenderBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);

  const surrenderPath = path.join(ARTIFACT_DIR, 'preview-nujum-surrender.png');
  await page.screenshot({ path: surrenderPath, fullPage: false });
  console.log('Live NUJUM Surrender screenshot saved:', surrenderPath);

  await browser.close();
  console.log('Done capturing all live screenshots!');
}

main().catch(err => {
  console.error('Error capturing preview:', err);
  process.exit(1);
});
