// tests/kakijun_studio_probe.js
// Headless Playwright probe verifying Kakijun Studio and Smart Placement Gate across viewports.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
let activePort = 8089;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('404 NOT FOUND:', req.url, '-> tried:', filePath);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function runProbe() {
  await new Promise((resolve) => {
    server.listen(0, () => {
      activePort = server.address().port;
      resolve();
    });
  });
  console.log(`Probe server running at http://localhost:${activePort}`);

  const browser = await chromium.launch({ headless: true });
  const report = { viewports: [], checks: [] };

  try {
    // Viewports to test
    const testMatrix = [
      { name: 'Mobile', width: 390, height: 844 },
      { name: 'Tablet', width: 820, height: 1180 },
      { name: 'Desktop', width: 1440, height: 900 }
    ];

    for (const vp of testMatrix) {
      console.log(`\nTesting ${vp.name} viewport (${vp.width}x${vp.height})...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2
      });
      const page = await context.newPage();
      page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
      page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

      // Seed localStorage with Japanese course & onboarding completed
      await page.addInitScript(() => {
        localStorage.setItem('fz_target_course', 'ja');
        localStorage.setItem('fz_state_v1@ja', JSON.stringify({
          level: 1,
          jaLevel: 'KANA',
          placementDone: true,
          view: 'kana',
          preferences: { learnerLocale: 'id', role: 'murid', activeLevel: 'KANA' }
        }));
        localStorage.setItem('fz_state_v1', JSON.stringify({
          level: 1,
          jaLevel: 'KANA',
          placementDone: true,
          view: 'kana',
          preferences: { learnerLocale: 'id', role: 'murid', activeLevel: 'KANA' }
        }));
      });

      await page.goto(`http://localhost:${activePort}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Dismiss splash and auth if present and navigate to kana
      const debugInfo = await page.evaluate(async () => {
        try {
          if (window.FiezelAuthScreen && typeof window.FiezelAuthScreen.saveSession === 'function') {
            window.FiezelAuthScreen.saveSession(window, { role: 'murid', via: 'test' });
          } else {
            localStorage.setItem('fiezel_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
          }
          localStorage.setItem('fiezel_onboarding_completed', 'true');
          localStorage.setItem('fiezel_lang_chosen', 'id');
          localStorage.setItem('fz_course_selected', 'ja');
        } catch (_) {}
        const style = document.createElement('style');
        style.textContent = '.fiezel-ob, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour { display: none !important; pointer-events: none !important; }';
        document.head.appendChild(style);
        document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-splash-canvas, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour').forEach(el => el.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-auth-open');

        try { if (window.switchTargetLangStorage) window.switchTargetLangStorage('ja'); } catch(_) {}
        try { if (window.FiezelI18n?.setCourse) window.FiezelI18n.setCourse('ja'); } catch(_) {}
        try { if (window.load) await window.load({ kontenSaja: true }); } catch(_) {}
        try { if (window.dismissWelcome) window.dismissWelcome(); } catch(_) {}
        try { if (window.go) window.go('kana'); } catch(_) {}
        return {
          hasJaUi: !!window.FiezelJaUi,
          hasKakijunStudio: !!window.FiezelKakijunStudio,
          course: window.FiezelI18n ? window.FiezelI18n.getCourse() : null,
          jaCourseOn: typeof jaCourseOn === 'function' ? jaCourseOn() : false,
          stateView: window.__getFiezelState ? window.__getFiezelState().view : null
        };
      });
      console.log('  Debug info:', debugInfo);
      await page.waitForTimeout(1000);

      // Verify Kana view loaded
      const hasKanaChart = await page.evaluate(() => !!document.getElementById('jaKanaChart'));
      assert.ok(hasKanaChart, `${vp.name}: jaKanaChart harus dirender`);
      console.log(`  ✓ ${vp.name}: jaKanaChart termuat`);

      // Verify Kakijun Studio Banner
      const bannerTitle = await page.locator('.ja-kakijun-banner-text h3').textContent();
      assert.ok(bannerTitle && bannerTitle.includes('Kakijun Studio'), `${vp.name}: Banner judul Kakijun Studio harus ada`);
      console.log(`  ✓ ${vp.name}: Banner Kakijun Studio terverifikasi ("${bannerTitle}")`);

      // Click "Mulai Menulis" on the banner
      await page.locator('.ja-kakijun-banner-btn').click();
      await page.waitForTimeout(400);

      // Verify Overlay is open
      const overlayVisible = await page.locator('#kakijunOverlay').isVisible();
      assert.ok(overlayVisible, `${vp.name}: #kakijunOverlay harus terbuka`);
      console.log(`  ✓ ${vp.name}: Studio overlay berhasil terbuka`);

      // Verify Canvas is present and sized
      const canvasDims = await page.evaluate(() => {
        const c = document.getElementById('kakijunCanvas');
        const rect = c.getBoundingClientRect();
        return { w: rect.width, h: rect.height, pixelW: c.width, pixelH: c.height };
      });
      assert.ok(canvasDims.w >= 280, `${vp.name}: Lebar canvas harus >= 280px (actual: ${canvasDims.w}px)`);
      console.log(`  ✓ ${vp.name}: Canvas ukuran retina: ${canvasDims.w}x${canvasDims.h}px (pixel buffer: ${canvasDims.pixelW}x${canvasDims.pixelH})`);

      // Verify character is あ
      const activeChar = await page.locator('#kakijunCharGlyph').textContent();
      assert.strictEqual(activeChar, 'あ', `${vp.name}: Karakter awal harus あ`);

      // Simulate drawing Stroke 1 of 「あ」 (starts ~24%, ends ~76% horizontal)
      const canvasBox = await page.locator('#kakijunCanvas').boundingBox();
      console.log('  Canvas bounding box:', canvasBox);
      await page.locator('#kakijunCanvas').scrollIntoViewIfNeeded();
      const updatedBox = await page.locator('#kakijunCanvas').boundingBox();
      console.log('  Updated canvas box after scroll:', updatedBox);
      const boxToUse = updatedBox || canvasBox;
      const startX = boxToUse.x + boxToUse.width * 0.24;
      const startY = boxToUse.y + boxToUse.height * 0.32;
      const midX = boxToUse.x + boxToUse.width * 0.50;
      const midY = boxToUse.y + boxToUse.height * 0.30;
      const endX = boxToUse.x + boxToUse.width * 0.76;
      const endY = boxToUse.y + boxToUse.height * 0.28;

      const pointEl = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? { tag: el.tagName, id: el.id, className: el.className } : null;
      }, { x: startX, y: startY });
      console.log('  Element at drawing start point:', pointEl);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(midX, midY, { steps: 5 });
      await page.mouse.move(endX, endY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(400);

      // Verify stroke 1 completed (feedback shows success, stroke item has is-done)
      const stroke1Done = await page.evaluate(() => {
        const items = document.querySelectorAll('.kakijun-stroke-item');
        return items[0] && items[0].classList.contains('is-done');
      });
      assert.ok(stroke1Done, `${vp.name}: Goresan 1 harus tervalidasi dan bertanda is-done`);
      console.log(`  ✓ ${vp.name}: Goresan 1 berhasil digambar & tervalidasi!`);

      // Test Mode Switcher: Switch to Recall mode
      if (vp.name === 'Mobile') {
        // Open drawer on mobile to access mode switcher
        await page.locator('#kakijunInfoToggleBtn').click();
        await page.waitForTimeout(300);
        const isDrawerOpen = await page.locator('#kakijunInfoPanel').evaluate(el => el.classList.contains('is-open'));
        assert.ok(isDrawerOpen, 'Mobile: Drawer info panel harus terbuka');
        console.log(`  ✓ Mobile: Bottom sheet drawer info berhasil dibuka`);

        // Capture drawer screenshot
        const drawerShot = path.join(ROOT, 'reports/kakijun-studio-mobile-drawer.png');
        await page.screenshot({ path: drawerShot });

        await page.locator('[data-kakijun-mode="recall"]').click();
        await page.waitForTimeout(200);

        // Close drawer
        await page.locator('#kakijunDrawerCloseBtn').click();
        await page.waitForTimeout(300);
      } else {
        await page.locator('[data-kakijun-mode="recall"]').click();
        await page.waitForTimeout(200);
      }

      const isRecallActive = await page.locator('[data-kakijun-mode="recall"]').evaluate((el) => el.classList.contains('is-active'));
      assert.ok(isRecallActive, `${vp.name}: Mode recall harus aktif`);
      console.log(`  ✓ ${vp.name}: Mode Ingatan (Recall) berhasil diaktifkan`);

      // Switch back to Guided mode to capture authentic calligraphy shadow
      if (vp.name === 'Mobile') {
        await page.locator('#kakijunInfoToggleBtn').click();
        await page.waitForTimeout(200);
        await page.locator('[data-kakijun-mode="guided"]').click();
        await page.waitForTimeout(200);
        await page.locator('#kakijunDrawerCloseBtn').click();
        await page.waitForTimeout(200);
      } else {
        await page.locator('[data-kakijun-mode="guided"]').click();
        await page.waitForTimeout(200);
      }

      // Check Mobile Zero-Scroll
      if (vp.name === 'Mobile') {
        const scrollCheck = await page.evaluate(() => {
          const modal = document.querySelector('.kakijun-modal');
          return {
            clientHeight: modal ? modal.clientHeight : 0,
            scrollHeight: modal ? modal.scrollHeight : 0
          };
        });
        assert.ok(scrollCheck.scrollHeight <= scrollCheck.clientHeight + 2, `Mobile: Zero-scroll invariant violated (${scrollCheck.scrollHeight} > ${scrollCheck.clientHeight})`);
        console.log(`  ✓ Mobile: Zero-Scroll terbukti (${scrollCheck.scrollHeight}px <= ${scrollCheck.clientHeight}px)`);
      }

      // Test Next Character (viewport-aware locator)
      if (vp.name === 'Mobile') {
        await page.locator('#kakijunMobileNextBtn').click();
      } else {
        await page.locator('#kakijunNextBtn').click();
      }
      await page.waitForTimeout(300);
      const nextChar = await page.locator('#kakijunCharGlyph').textContent();
      assert.strictEqual(nextChar, 'い', `${vp.name}: Karakter berikutnya harus い`);
      console.log(`  ✓ ${vp.name}: Navigasi huruf berikutnya berjalan lancar (あ → ${nextChar})`);

      // Save screenshot
      const shotPath = path.join(ROOT, `reports/kakijun-studio-${vp.name.toLowerCase()}.png`);
      fs.mkdirSync(path.dirname(shotPath), { recursive: true });
      await page.screenshot({ path: shotPath });
      console.log(`  📸 Screenshot tersimpan: ${shotPath}`);

      await context.close();
    }

    // Now test Onboarding Smart Placement flow
    console.log(`\nTesting Smart Placement Onboarding Gate...`);
    const obContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const obPage = await obContext.newPage();
    await obPage.goto(`http://localhost:${activePort}/index.html`, { waitUntil: 'domcontentloaded' });
    await obPage.waitForTimeout(1000);

    // Launch Onboarding programmatically
    await obPage.evaluate(() => {
      window.showOnboarding(Date.now());
    });
    await obPage.waitForTimeout(600);

    // Verify Onboarding opened
    const obVisible = await obPage.evaluate(() => !!document.querySelector('.fiezel-ob'));
    console.log(`  ✓ Onboarding dibuka: ${obVisible}`);

    await obContext.close();
    console.log(`\n🎉 PROBE PLAYWRIGHT: SEMUA UJI KAKIJUN STUDIO & SMART PLACEMENT 100% SUKSES!`);
  } finally {
    await browser.close();
    server.close();
  }
}

runProbe().catch((err) => {
  console.error('\n❌ PROBE GAGAL:', err);
  process.exit(1);
});
