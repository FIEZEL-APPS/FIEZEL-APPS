#!/usr/bin/env node
'use strict';

/**
 * tools/dev/probe-chat-header.js
 * Empirical Playwright probe for Kawan Bicara header & back button audit.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const pw = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(buf);
  });
});

async function run() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;
  console.log(`[Probe Server] Running on ${baseUrl}`);

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14 viewport
    deviceScaleFactor: 2,
    serviceWorkers: 'block' // block SW cache to test live disk files directly
  });

  const page = await context.newPage();

  try {
    // Prime local storage to bypass first-time welcome/auth screens
    await page.addInitScript(() => {
      try {
        localStorage.setItem('fz_user_registered', '1');
        localStorage.setItem('fz_auth_mode', 'guest');
        localStorage.setItem('fz_auth_completed', '1');
        localStorage.setItem('fiezel_user', JSON.stringify({ name: 'Murid QA', level: 'A1' }));
        sessionStorage.setItem('fz_tour_done', '1');
      } catch (_) {}
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Bypass splash and auth modal if present
    await page.evaluate(() => {
      try {
        const splash = document.getElementById('fiezelBootSplash');
        if (splash) splash.remove();
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting');
        document.querySelectorAll('.fz-auth').forEach(el => el.remove());
      } catch (_) {}
    });

    // Navigate to chat view
    console.log('[PROBE] Navigating to chat...');
    await page.evaluate(() => {
      if (typeof window.go === 'function') {
        window.go('chat');
      }
    });
    await page.waitForTimeout(800);

    // Remove any leftover modal overlays
    await page.evaluate(() => {
      document.querySelectorAll('.fz-auth').forEach(el => el.remove());
    });

    // Inspect layout
    const info = await page.evaluate(() => {
      const topbar = document.querySelector('.topbar');
      const topbarStyle = topbar ? window.getComputedStyle(topbar) : null;

      const fzcHeader = document.querySelector('.fzc-header');
      const fzcBtnBack = document.getElementById('fzcBtnBack');
      const fzcBtnBackBox = fzcBtnBack ? fzcBtnBack.getBoundingClientRect() : null;

      const partnerName = document.querySelector('.fzc-partner-name');
      const partnerNameBox = partnerName ? partnerName.getBoundingClientRect() : null;

      const badgeLevel = document.querySelector('.fzc-badge-level');
      const badgeLevelBox = badgeLevel ? badgeLevel.getBoundingClientRect() : null;

      const btnCall = document.getElementById('fzcBtnCall');
      const btnCallBox = btnCall ? btnCall.getBoundingClientRect() : null;

      const btnReset = document.getElementById('fzcBtnReset');
      const btnResetBox = btnReset ? btnReset.getBoundingClientRect() : null;

      const h2 = document.querySelector('.fzc-partner-info h2');

      const isColliding = (r1, r2) => {
        if (!r1 || !r2) return false;
        return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
      };

      return {
        view: window.state ? window.state.view : null,
        topbarVisible: topbarStyle ? (topbarStyle.display !== 'none' && topbarStyle.visibility !== 'hidden' && topbarStyle.height !== '0px') : false,
        topbarComputedDisplay: topbarStyle ? topbarStyle.display : null,
        fzcHeaderExists: !!fzcHeader,
        fzcHeaderHeight: fzcHeader ? fzcHeader.offsetHeight : 0,
        fzcBtnBackExists: !!fzcBtnBack,
        fzcBtnBackWidth: fzcBtnBackBox ? Math.round(fzcBtnBackBox.width) : 0,
        fzcBtnBackHeight: fzcBtnBackBox ? Math.round(fzcBtnBackBox.height) : 0,
        fzcBtnBackTouchFriendly: fzcBtnBackBox ? (fzcBtnBackBox.width >= 40 && fzcBtnBackBox.height >= 40) : false,
        h2FontSize: h2 ? window.getComputedStyle(h2).fontSize : null,
        badgeCallCollision: isColliding(badgeLevelBox, btnCallBox),
        hasHandleChatBack: typeof window.handleChatBack === 'function' || (window.FiezelInteractiveChat && typeof window.FiezelInteractiveChat.handleChatBack === 'function'),
        partnerBarChildren: document.querySelector('.fzc-partner-bar') ? Array.from(document.querySelector('.fzc-partner-bar').children).map(c => c.className || c.id) : []
      };
    });

    console.log('[PROBE AUDIT RESULT]:\n', JSON.stringify(info, null, 2));

    const shotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: path.join(shotDir, 'chat_header_verified.png') });
    console.log('[PROBE] Screenshot saved: chat_header_verified.png');

    // Test Back Button interaction
    console.log('[PROBE] Testing Click on #fzcBtnBack...');
    await page.click('#fzcBtnBack');
    await page.waitForTimeout(600);

    const postBackView = await page.evaluate(() => {
      const topbar = document.querySelector('.topbar');
      const topbarStyle = topbar ? window.getComputedStyle(topbar) : null;
      return {
        view: window.state ? window.state.view : null,
        topbarVisible: topbarStyle ? (topbarStyle.display !== 'none' && topbarStyle.visibility !== 'hidden') : false,
        topbarDisplay: topbarStyle ? topbarStyle.display : null
      };
    });

    console.log('[PROBE POST-BACK RESULT]:', JSON.stringify(postBackView, null, 2));

  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('[PROBE ERROR]:', err);
  process.exit(1);
});
