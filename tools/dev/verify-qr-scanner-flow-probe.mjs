import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
    permissions: ['camera']
  });

  // Serve directly from repository disk
  await context.route('**/*', r => {
    const url = new URL(r.request().url());
    if (url.origin.includes('api.test') || url.pathname.includes('/api/')) {
      if (url.pathname.includes('/api/auth/session')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, signedIn: true, role: 'murid', handle: 'budi_pratama', name: 'Budi Pratama' })
        });
      }
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: {} })
      });
    }

    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const p = path.resolve(ROOT, rel || 'index.html');
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) return r.abort();

    const contentType = p.endsWith('.css') ? 'text/css'
      : p.endsWith('.js') ? 'text/javascript'
      : p.endsWith('.json') ? 'application/json'
      : p.endsWith('.png') ? 'image/png'
      : p.endsWith('.svg') ? 'image/svg+xml'
      : 'text/html';

    r.fulfill({
      body: fs.readFileSync(p),
      contentType
    });
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
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      sessionStorage.setItem('fiezel_boot_count', '2');

      const stateObj = {
        version: '5.19.0',
        userName: 'Budi Pratama',
        view: 'profile',
        toursSeen: { menu: true, library: true, listening: true },
        daily: { date: '2026-10-09', count: 5, attempts: 5, meaningful: true },
        streak: 5,
        xp: 150,
        level: 'A1',
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'A1', motion: false, haptics: true }
      };
      localStorage.setItem('fiezel_state', JSON.stringify(stateObj));

      // Mock social cache
      localStorage.setItem('fz_social_profile', JSON.stringify({
        handle: 'budi_pratama',
        displayName: 'Budi Pratama',
        created: Date.now()
      }));
    } catch (_) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Clear splash and overlays
  await page.evaluate(() => {
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fz-splash-canvas, .fz-auth, #fzRitual, .fz-tour, .toast, #fiezelDiagHost, #fiezelDiagOpen').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-booting', 'fz-auth-open');
  });

  // 1. Ensure Profile view is active
  await page.evaluate(() => {
    if (typeof window.go === 'function') {
      window.go('profile');
    } else if (typeof window.switchView === 'function') {
      window.switchView('profile');
    }
  });
  await page.waitForTimeout(1000);
  console.log('✓ Profile view loaded');

  // 2. Click "Scan & QR" button
  const scanBtn = page.locator('button:has-text("Scan & QR")').first();
  await scanBtn.scrollIntoViewIfNeeded();
  if (!(await scanBtn.isVisible())) {
    throw new Error('Tombol Scan & QR tidak terlihat di Profil');
  }
  await scanBtn.click();
  await page.waitForTimeout(800);
  console.log('✓ Clicked Scan & QR button');

  // 3. Verify Scanner UI components
  const scannerBox = page.locator('#fzQrScannerBox');
  if (!(await scannerBox.isVisible())) {
    throw new Error('Modal scanner QR (#fzQrScannerBox) tidak muncul');
  }
  console.log('✓ Scanner viewport box (#fzQrScannerBox) is visible');

  const galleryBtn = page.locator('[data-testid="qr-gallery-btn"]');
  if (!(await galleryBtn.isVisible())) {
    throw new Error('Tombol "Pilih dari Galeri" tidak terlihat');
  }
  console.log('✓ "Pilih dari Galeri" button is visible');

  // Verify tabs
  const scanTab = page.locator('button:has-text("Pindai QR")');
  const myQrTab = page.locator('button:has-text("ID & QR")');
  if (!(await scanTab.isVisible()) || !(await myQrTab.isVisible())) {
    throw new Error('Segmented nav tabs tidak lengkap');
  }
  console.log('✓ Segmented nav tabs (Pindai QR, ID & QR) are visible');

  // Capture screenshot of Camera Scanner modal
  const screenshotDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const scannerScreenshot = path.join(screenshotDir, 'qr_scanner_camera_view.png');
  await page.screenshot({ path: scannerScreenshot });
  console.log('✓ Scanner screenshot saved to:', scannerScreenshot);

  // 4. Test QR Gallery Upload decoding
  const testQrDataUrl = await page.evaluate(() => {
    const qr = window.FiezelQr;
    if (!qr) return null;
    const targetUrl = 'https://fiezel.my.id/app/?friend=@siti_nurhaliza';
    const q = qr.matrix(targetUrl, { level: 'M' });
    const canvas = document.createElement('canvas');
    const quiet = 4;
    const total = q.size + quiet * 2;
    const scale = 8;
    canvas.width = total * scale;
    canvas.height = total * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < q.size; r++) {
      for (let c = 0; c < q.size; c++) {
        if (q.modules[r][c] === 1) {
          ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }
    return canvas.toDataURL('image/png');
  });

  if (!testQrDataUrl) {
    throw new Error('FiezelQr gagal membuat QR matrix');
  }
  console.log('✓ Synthesized test QR code for @siti_nurhaliza');

  // Convert base64 dataUrl to buffer and trigger file upload via input
  const base64Data = testQrDataUrl.replace(/^data:image\/png;base64,/, '');
  const testImagePath = path.join(ROOT, 'test-target-qr.png');
  fs.writeFileSync(testImagePath, Buffer.from(base64Data, 'base64'));

  const fileInput = page.locator('#qrFileInput');
  await fileInput.setInputFiles(testImagePath);
  await page.waitForTimeout(800);

  // Clean up temporary image
  if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath);

  // 5. Verify Friend Link Sheet opened for @siti_nurhaliza
  const friendModalTitle = await page.locator('#modalPanel h2').textContent();
  console.log('✓ Friend modal opened with title:', friendModalTitle);
  if (!friendModalTitle || !friendModalTitle.includes('siti_nurhaliza')) {
    throw new Error('Sheet pertemanan tidak terbuka untuk @siti_nurhaliza, judul saat ini: ' + friendModalTitle);
  }
  console.log('✓ Successfully decoded QR code from gallery and opened friend request confirmation!');

  // Capture screenshot of Friend Confirmation Sheet
  const friendSheetScreenshot = path.join(screenshotDir, 'qr_scanned_friend_confirm.png');
  await page.screenshot({ path: friendSheetScreenshot });
  console.log('✓ Friend confirmation screenshot saved to:', friendSheetScreenshot);

  // 6. Test direct call to openQrScanner()
  await page.evaluate(() => {
    if (typeof window.closeModal === 'function') window.closeModal();
  });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    if (typeof window.openQrScanner === 'function') window.openQrScanner();
  });
  await page.waitForTimeout(500);

  const scannerReopened = await page.locator('#fzQrScannerBox').isVisible();
  if (!scannerReopened) {
    throw new Error('openQrScanner() gagal membuka scanner modal');
  }
  console.log('✓ openQrScanner() verified directly');

  // 7. Test Tab Switch: Switch to "ID & QR" and back to "Pindai QR"
  await page.locator('button:has-text("ID & QR")').click();
  await page.waitForTimeout(400);
  const myQrVisible = await page.locator('[data-testid="profile-qr"]').isVisible();
  if (!myQrVisible) {
    throw new Error('Tab ID & QR gagal menampilkan QR pribadi');
  }
  console.log('✓ Switched to "ID & QR" tab successfully');

  await page.locator('button:has-text("Pindai QR")').click();
  await page.waitForTimeout(400);
  const scannerBack = await page.locator('#fzQrScannerBox').isVisible();
  if (!scannerBack) {
    throw new Error('Kembali ke tab "Pindai QR" gagal menampilkan viewfinder');
  }
  console.log('✓ Switched back to "Pindai QR" tab successfully');

  await browser.close();
  console.log('\n==========================================');
  console.log('EMPIRICAL AUDIT VERIFIED: ALL PROBES PASSED 100%');
  console.log('==========================================\n');
}

main().catch(err => {
  console.error('PROBE ERROR:', err);
  process.exit(1);
});
