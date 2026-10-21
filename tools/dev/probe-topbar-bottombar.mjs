import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

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
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    res.end(buf);
  });
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`Server running at ${baseUrl}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true
});
const page = await context.newPage();
page.on('console', msg => console.log(`PAGE LOG [${msg.type()}]:`, msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err));

await page.goto(`${baseUrl}/index.html`);
await page.waitForTimeout(1000);

// Bypass splash / auth
await page.evaluate(() => {
  try {
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', at: Date.now(), via: 'test' }));
    if (window.FiezelAuthScreen) {
      window.FiezelAuthScreen.checkServer = () => Promise.resolve({ ok: true, signedIn: true });
    }
  } catch (_) {}
  const splash = document.getElementById('fiezelBootSplash') || document.querySelector('.fiezel-splash');
  if (splash) splash.remove();
  document.documentElement.classList.remove('fz-booting');
  document.body.classList.remove('fz-auth-open');
  if (typeof window.go === 'function') window.go('home');
});
await page.waitForTimeout(500);

// Capture Screenshot 1: Home
await page.screenshot({ path: path.join(ROOT, 'tools/dev/screen-1-home.png') });

const homeMetrics = await page.evaluate(() => {
  const topbar = document.querySelector('.topbar');
  const bottomnav = document.querySelector('.bottomnav');
  return {
    view: window.state?.view,
    topbar: topbar ? {
      display: getComputedStyle(topbar).display,
      visibility: getComputedStyle(topbar).visibility,
      height: topbar.offsetHeight,
      rect: topbar.getBoundingClientRect()
    } : null,
    bottomnav: bottomnav ? {
      display: getComputedStyle(bottomnav).display,
      visibility: getComputedStyle(bottomnav).visibility,
      height: bottomnav.offsetHeight,
      rect: bottomnav.getBoundingClientRect()
    } : null
  };
});
console.log('--- Home Metrics ---', JSON.stringify(homeMetrics, null, 2));

// Step 2: Click on Kawan Bicara card
console.log('\nNavigating to Kawan Bicara via window.go("chat")...');
await page.evaluate(() => window.go('chat'));
await page.waitForTimeout(600);

// Capture Screenshot 2: Chat View
await page.screenshot({ path: path.join(ROOT, 'tools/dev/screen-2-chat.png') });

const chatMetrics = await page.evaluate(() => {
  const topbar = document.querySelector('.topbar');
  const bottomnav = document.querySelector('.bottomnav');
  const fzcHeader = document.querySelector('.fzc-header');
  const fzcBtnBack = document.querySelector('#fzcBtnBack');
  const topContextBackBtn = document.querySelector('#topContextBackBtn');
  return {
    view: window.state?.view,
    topbar: topbar ? {
      display: getComputedStyle(topbar).display,
      visibility: getComputedStyle(topbar).visibility,
      height: topbar.offsetHeight
    } : null,
    bottomnav: bottomnav ? {
      display: getComputedStyle(bottomnav).display,
      visibility: getComputedStyle(bottomnav).visibility,
      height: bottomnav.offsetHeight
    } : null,
    fzcHeader: fzcHeader ? {
      display: getComputedStyle(fzcHeader).display,
      visibility: getComputedStyle(fzcHeader).visibility,
      height: fzcHeader.offsetHeight,
      rect: fzcHeader.getBoundingClientRect()
    } : null,
    fzcBtnBack: fzcBtnBack ? {
      exists: true,
      display: getComputedStyle(fzcBtnBack).display,
      visibility: getComputedStyle(fzcBtnBack).visibility,
      rect: fzcBtnBack.getBoundingClientRect()
    } : null,
    topContextBackBtn: topContextBackBtn ? {
      exists: true,
      display: getComputedStyle(topContextBackBtn).display,
      visibility: getComputedStyle(topContextBackBtn).visibility
    } : null,
    bodyClasses: Array.from(document.body.classList),
    htmlClasses: Array.from(document.documentElement.classList)
  };
});
console.log('--- Chat Metrics ---', JSON.stringify(chatMetrics, null, 2));

// Step 3: Now click Back button
console.log('\nClicking Back button in Chat (#fzcBtnBack)...');
const backBtn = await page.$('#fzcBtnBack');
if (backBtn) {
  await backBtn.click();
} else {
  console.log('#fzcBtnBack NOT FOUND! Trying window.handleTopbarBack()...');
  await page.evaluate(() => window.handleTopbarBack());
}
await page.waitForTimeout(500);

// Capture Screenshot 3: After Back
await page.screenshot({ path: path.join(ROOT, 'tools/dev/screen-3-after-back.png') });

const afterBackMetrics = await page.evaluate(() => {
  const topbar = document.querySelector('.topbar');
  const bottomnav = document.querySelector('.bottomnav');
  const fzcContainer = document.querySelector('.fzc-container');
  return {
    view: window.state?.view,
    fzcContainerExists: !!fzcContainer,
    topbar: topbar ? {
      display: getComputedStyle(topbar).display,
      visibility: getComputedStyle(topbar).visibility,
      height: topbar.offsetHeight,
      rect: topbar.getBoundingClientRect()
    } : null,
    bottomnav: bottomnav ? {
      display: getComputedStyle(bottomnav).display,
      visibility: getComputedStyle(bottomnav).visibility,
      height: bottomnav.offsetHeight,
      styleAttr: bottomnav.getAttribute('style'),
      rect: bottomnav.getBoundingClientRect()
    } : null,
    bodyClasses: Array.from(document.body.classList),
    htmlClasses: Array.from(document.documentElement.classList)
  };
});
console.log('--- After Back Metrics ---', JSON.stringify(afterBackMetrics, null, 2));

// Step 4: Now test what happens if user uses browser back button (history.back / popstate)
console.log('\nTesting Browser Back button (popstate)...');
// First go to chat again
await page.evaluate(() => window.go('chat'));
await page.waitForTimeout(500);

// Now trigger popstate / browser back
console.log('Calling history.back()...');
await page.evaluate(() => window.history.back());
await page.waitForTimeout(800);

await page.screenshot({ path: path.join(ROOT, 'tools/dev/screen-4-history-back.png') });

const historyBackMetrics = await page.evaluate(() => {
  const topbar = document.querySelector('.topbar');
  const bottomnav = document.querySelector('.bottomnav');
  const fzcContainer = document.querySelector('.fzc-container');
  return {
    view: window.state?.view,
    fzcContainerExists: !!fzcContainer,
    topbar: topbar ? {
      display: getComputedStyle(topbar).display,
      visibility: getComputedStyle(topbar).visibility,
      height: topbar.offsetHeight
    } : null,
    bottomnav: bottomnav ? {
      display: getComputedStyle(bottomnav).display,
      visibility: getComputedStyle(bottomnav).visibility,
      height: bottomnav.offsetHeight,
      styleAttr: bottomnav.getAttribute('style')
    } : null,
    bodyClasses: Array.from(document.body.classList),
    htmlClasses: Array.from(document.documentElement.classList)
  };
});
console.log('--- History Back Metrics ---', JSON.stringify(historyBackMetrics, null, 2));

await browser.close();
server.close();
