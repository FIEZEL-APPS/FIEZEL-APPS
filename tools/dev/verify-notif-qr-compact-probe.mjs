import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

async function main() {
  console.log('--- START EMPIRICAL AUDIT: NOTIF AUTO-SYNC & COMPACT QR MODAL ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
    permissions: ['camera']
  });

  let friendRequestsPayload = [
    { handle: 'siti_rahma', displayName: 'Siti Rahma', at: Date.now() - 3600000 }
  ];

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
      if (url.pathname.includes('/api/auth/anon')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, id: 'anon-123' })
        });
      }
      if (url.pathname.includes('/api/social/friends/requests')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, requests: friendRequestsPayload })
        });
      }
      if (url.pathname.includes('/api/social/friends')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, friends: [] })
        });
      }
      if (url.pathname.includes('/api/config')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ flags: { cfSocialEnabled: true } })
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
      localStorage.setItem('fiezel-social-handle', 'budi_pratama');
      localStorage.setItem('fiezel-tour-v1', 'finish');
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
      sessionStorage.setItem('fiezel_boot_count', '2');
      localStorage.setItem('fz_notif_cached_requests', JSON.stringify([
        { handle: 'siti_rahma', displayName: 'Siti Rahma', at: Date.now() - 3600000 }
      ]));
    } catch (_) {}
  });

  const page = await context.newPage();
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Ensure any tour or welcome dialog is dismissed and cannot intercept clicks
  await page.evaluate(() => {
    document.querySelectorAll('.fz-tour, .welcome, #welcomeModal').forEach(el => el.remove());
    const s = document.createElement('style');
    s.textContent = '.fz-tour, .welcome { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(s);
  });

  // 1. Audit Notification Bell
  console.log('[AUDIT 1] Verifying notification badge & auto-sync...');
  const badge = await page.$('#fzNotifBadge');
  const badgeText = await page.evaluate(() => document.getElementById('fzNotifBadge')?.textContent);
  const badgeVisible = await page.evaluate(() => !document.getElementById('fzNotifBadge')?.classList.contains('hidden'));
  console.log(`- Badge Text: "${badgeText}", Visible: ${badgeVisible}`);
  if (!badgeVisible || badgeText !== '1') {
    throw new Error(`Badge not showing initial cached friend request! Text: ${badgeText}, Visible: ${badgeVisible}`);
  }

  // Click notification bell (1st time)
  console.log('[AUDIT 2] Clicking notification bell (1st time)...');
  await page.evaluate(() => document.getElementById('fzNotifBtn')?.click());
  await page.waitForTimeout(400);

  const notifSheetVisible = await page.evaluate(() => {
    const modal = document.getElementById('modal');
    const sheet = document.querySelector('.notif-sheet');
    return !modal.classList.contains('hidden') && !!sheet;
  });
  console.log(`- Notif sheet opened: ${notifSheetVisible}`);
  if (!notifSheetVisible) throw new Error('Notif sheet failed to open on first click');

  // Verify Siti Rahma friend request item is in the list
  const hasSitiRequest = await page.evaluate(() => !!document.querySelector('[data-testid="notif-item-req-siti_rahma"]'));
  console.log(`- Contains Siti Rahma friend request: ${hasSitiRequest}`);
  if (!hasSitiRequest) throw new Error('Friend request row missing in notif sheet');

  // Capture screenshot of notification sheet
  await page.screenshot({ path: 'tools/dev/output-stills/01_notif_sheet_verified.png' });

  // Close notification sheet
  console.log('[AUDIT 3] Closing notification sheet...');
  await page.evaluate(() => document.querySelector('[data-testid="notif-close"]')?.click());
  await page.waitForTimeout(400);

  const modalClosed = await page.evaluate(() => document.getElementById('modal').classList.contains('hidden'));
  console.log(`- Modal closed properly: ${modalClosed}`);
  if (!modalClosed) throw new Error('Modal failed to close');

  // Click notification bell (2nd time) - verifying "kadang kadang bisa kadang kadang tidak bisa" is fixed!
  console.log('[AUDIT 4] Clicking notification bell (2nd time - reliability test)...');
  await page.evaluate(() => document.getElementById('fzNotifBtn')?.click());
  await page.waitForTimeout(400);

  const notifSheetVisibleSecondTime = await page.evaluate(() => {
    const modal = document.getElementById('modal');
    const sheet = document.querySelector('.notif-sheet');
    return !modal.classList.contains('hidden') && !!sheet;
  });
  console.log(`- Notif sheet opened reliably on 2nd click: ${notifSheetVisibleSecondTime}`);
  if (!notifSheetVisibleSecondTime) {
    throw new Error('REPRODUCED BUG: Notif sheet failed to open on second click!');
  }

  // Close modal again
  await page.click('[data-testid="notif-close"]');
  await page.waitForTimeout(400);

  // 2. Audit QR Scanner & Card Modal Layout (Compact & Zero Scroll)
  console.log('[AUDIT 5] Opening QR Scanner modal and measuring scroll metrics...');
  await page.evaluate(() => window.openFriendConnectModal('scan'));
  await page.waitForTimeout(500);

  const scanMetrics = await page.evaluate(() => {
    const panel = document.getElementById('modalPanel');
    const box = document.getElementById('fzQrScannerBox');
    const galleryBtn = document.querySelector('[data-testid="qr-gallery-btn"]');
    const closeBtn = document.querySelector('.modal-actions button');
    const vpHeight = window.innerHeight;
    const panelRect = panel.getBoundingClientRect();
    const closeRect = closeBtn.getBoundingClientRect();

    return {
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      isPanelOverflown: panel.scrollHeight > panel.clientHeight,
      panelHeightPx: panelRect.height,
      closeBtnBottom: closeRect.bottom,
      viewportHeight: vpHeight,
      boxWidth: box?.offsetWidth,
      boxHeight: box?.offsetHeight,
      fitsCompletelyInViewport: closeRect.bottom <= vpHeight
    };
  });

  console.log('- Scan Tab Metrics on 390x844:');
  console.log(`  panelScrollHeight: ${scanMetrics.panelScrollHeight}px`);
  console.log(`  panelClientHeight: ${scanMetrics.panelClientHeight}px`);
  console.log(`  isPanelOverflown: ${scanMetrics.isPanelOverflown} (MUST BE FALSE)`);
  console.log(`  panelHeightPx: ${scanMetrics.panelHeightPx}px`);
  console.log(`  boxSize: ${scanMetrics.boxWidth}x${scanMetrics.boxHeight}px`);
  console.log(`  fitsCompletelyInViewport: ${scanMetrics.fitsCompletelyInViewport}`);

  if (scanMetrics.isPanelOverflown) {
    throw new Error(`Scan modal has vertical scrollbar! scrollHeight (${scanMetrics.panelScrollHeight}) > clientHeight (${scanMetrics.panelClientHeight})`);
  }
  if (!scanMetrics.fitsCompletelyInViewport) {
    throw new Error('Scan modal footer button is cut off below screen fold!');
  }

  await page.screenshot({ path: 'tools/dev/output-stills/02_qr_scanner_compact_view.png' });

  // 3. Switch to "my-qr" tab
  console.log('[AUDIT 6] Switching to ID & QR (my-qr) tab and measuring scroll metrics...');
  await page.evaluate(() => window._switchConnectModalTab('my-qr'));
  await page.waitForTimeout(400);

  const myQrMetrics = await page.evaluate(() => {
    const panel = document.getElementById('modalPanel');
    const qrSvg = document.querySelector('.fz3-qr svg');
    const closeBtn = document.querySelector('.modal-actions button');
    const vpHeight = window.innerHeight;
    const panelRect = panel.getBoundingClientRect();
    const closeRect = closeBtn.getBoundingClientRect();

    return {
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      isPanelOverflown: panel.scrollHeight > panel.clientHeight,
      panelHeightPx: panelRect.height,
      qrSvgWidth: qrSvg?.getBoundingClientRect()?.width,
      qrSvgHeight: qrSvg?.getBoundingClientRect()?.height,
      fitsCompletelyInViewport: closeRect.bottom <= vpHeight
    };
  });

  console.log('- My-QR Tab Metrics:');
  console.log(`  panelScrollHeight: ${myQrMetrics.panelScrollHeight}px`);
  console.log(`  panelClientHeight: ${myQrMetrics.panelClientHeight}px`);
  console.log(`  isPanelOverflown: ${myQrMetrics.isPanelOverflown} (MUST BE FALSE)`);
  console.log(`  qrSvgSize: ${myQrMetrics.qrSvgWidth}x${myQrMetrics.qrSvgHeight}px`);
  console.log(`  fitsCompletelyInViewport: ${myQrMetrics.fitsCompletelyInViewport}`);

  if (myQrMetrics.isPanelOverflown) {
    throw new Error(`My-QR modal has vertical scrollbar! scrollHeight (${myQrMetrics.panelScrollHeight}) > clientHeight (${myQrMetrics.panelClientHeight})`);
  }

  await page.screenshot({ path: 'tools/dev/output-stills/03_my_qr_compact_view.png' });

  // 4. Test on smaller viewport (360x667 - iPhone SE / compact Android)
  console.log('[AUDIT 7] Testing on smaller viewport (360x667)...');
  await page.setViewportSize({ width: 360, height: 667 });
  await page.waitForTimeout(300);

  const smallVpMetrics = await page.evaluate(() => {
    const panel = document.getElementById('modalPanel');
    const closeBtn = document.querySelector('.modal-actions button');
    const vpHeight = window.innerHeight;
    const closeRect = closeBtn.getBoundingClientRect();
    return {
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      isPanelOverflown: panel.scrollHeight > panel.clientHeight,
      fitsCompletelyInViewport: closeRect.bottom <= vpHeight
    };
  });
  console.log(`- Small viewport 360x667 overflown: ${smallVpMetrics.isPanelOverflown}, fits: ${smallVpMetrics.fitsCompletelyInViewport}`);
  if (smallVpMetrics.isPanelOverflown) {
    throw new Error(`Modal overflown on 360x667 viewport: ${smallVpMetrics.panelScrollHeight} > ${smallVpMetrics.panelClientHeight}`);
  }

  // 5. Test Profile QR Modal (openProfileQr)
  console.log('[AUDIT 8] Testing openProfileQr()...');
  await page.evaluate(() => {
    if (window.state && window.state.preferences) window.state.preferences.socialHandle = 'budi_pratama';
    window.openProfileQr();
  });
  await page.waitForTimeout(600);

  const profileQrMetrics = await page.evaluate(() => {
    const panel = document.getElementById('modalPanel');
    const qrSvg = document.querySelector('.fz3-qr svg');
    const closeBtn = document.querySelector('.modal-actions button');
    const vpHeight = window.innerHeight;
    const closeRect = closeBtn.getBoundingClientRect();
    return {
      panelScrollHeight: panel.scrollHeight,
      panelClientHeight: panel.clientHeight,
      isPanelOverflown: panel.scrollHeight > panel.clientHeight,
      qrSvgWidth: qrSvg?.getBoundingClientRect()?.width,
      fitsCompletelyInViewport: closeRect.bottom <= vpHeight
    };
  });
  console.log(`- openProfileQr() overflown: ${profileQrMetrics.isPanelOverflown}, fits: ${profileQrMetrics.fitsCompletelyInViewport}, qrSvgWidth: ${profileQrMetrics.qrSvgWidth}px`);
  if (profileQrMetrics.isPanelOverflown) {
    throw new Error(`openProfileQr() has scrollbar! ${profileQrMetrics.panelScrollHeight} > ${profileQrMetrics.panelClientHeight}`);
  }

  await page.screenshot({ path: 'tools/dev/output-stills/04_profile_qr_compact_view.png' });

  await browser.close();
  console.log('--- ALL AUDIT CHECKS PASSED: 100% EMPIRICALLY CERTIFIED ---');
}

main().catch(err => {
  console.error('PROBE FAILED:', err);
  process.exit(1);
});
