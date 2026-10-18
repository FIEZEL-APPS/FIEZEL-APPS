import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4518;

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Probe server running at http://127.0.0.1:${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox']
    });

    // Test on short mobile screen (iPhone SE: 375x667)
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      permissions: ['microphone']
    });

    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rian Pratama', goal: 'general', level: 'N5', role: 'murid', course: 'ja' }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-auth-open');
      }, 50);
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(400);

    // Launch chat
    await page.evaluate(() => window.go('chat'));
    await page.waitForSelector('#fzcFeed', { timeout: 5000 });
    await page.waitForTimeout(300);

    console.log('=== TEST 1: Inspect feed and dock layout geometry ===');
    const layoutGeo = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      const dock = document.querySelector('.fzc-dock');
      const newMsgBtn = document.getElementById('fzcNewMsgBtn');
      const feedRect = feed.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const btnRect = newMsgBtn ? newMsgBtn.getBoundingClientRect() : null;
      const feedStyle = window.getComputedStyle(feed);
      const dockStyle = window.getComputedStyle(dock);
      const btnStyle = newMsgBtn ? window.getComputedStyle(newMsgBtn) : null;

      return {
        viewportHeight: window.innerHeight,
        feed: {
          top: feedRect.top,
          bottom: feedRect.bottom,
          height: feedRect.height,
          scrollHeight: feed.scrollHeight,
          scrollTop: feed.scrollTop,
          paddingTop: feedStyle.paddingTop,
          paddingBottom: feedStyle.paddingBottom,
          webkitOverflowScrolling: feedStyle.webkitOverflowScrolling,
          scrollBehavior: feedStyle.scrollBehavior
        },
        dock: {
          top: dockRect.top,
          bottom: dockRect.bottom,
          height: dockRect.height,
          zIndex: dockStyle.zIndex,
          position: dockStyle.position
        },
        btn: btnRect ? {
          top: btnRect.top,
          bottom: btnRect.bottom,
          height: btnRect.height,
          display: btnStyle.display,
          zIndex: btnStyle.zIndex,
          position: btnStyle.position,
          bottomStyle: btnStyle.bottom
        } : null,
        parentOfBtn: newMsgBtn ? newMsgBtn.parentElement.className : null
      };
    });
    console.log('Layout Geometry on 375x667 viewport:', JSON.stringify(layoutGeo, null, 2));

    console.log('\n=== TEST 2: Add multiple messages and test bottom clearance ===');
    // Send a message and let fallback/assistant respond to have enough scroll height
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = 'こんにちは！';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(1000);

    // Send second message
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = 'ラーメンを食べたいです';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(1000);

    // Check last element vs dock when scrolled to bottom
    const clearanceInfo = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = feed.scrollHeight;
      const dock = document.querySelector('.fzc-dock');
      const dockRect = dock.getBoundingClientRect();

      // Find the last visible child element in feed (excluding floating button)
      const feedChildren = Array.from(feed.children).filter(el => !el.classList.contains('fzc-floating-new-msg'));
      const lastChild = feedChildren[feedChildren.length - 1];
      const lastChildRect = lastChild ? lastChild.getBoundingClientRect() : null;

      // Also check suggestions chips if present
      const suggestions = feed.querySelector('.fzc-suggestions-row');
      const suggRect = suggestions ? suggestions.getBoundingClientRect() : null;

      return {
        feedScrollHeight: feed.scrollHeight,
        feedClientHeight: feed.clientHeight,
        feedScrollTop: feed.scrollTop,
        dockTop: dockRect.top,
        dockHeight: dockRect.height,
        lastChildTag: lastChild ? lastChild.className : null,
        lastChildBottom: lastChildRect ? lastChildRect.bottom : null,
        overlapWithDock: lastChildRect ? (lastChildRect.bottom > dockRect.top) : null,
        gapBetweenLastChildAndDock: lastChildRect ? (dockRect.top - lastChildRect.bottom) : null,
        suggestionsBottom: suggRect ? suggRect.bottom : null,
        suggestionsOverlap: suggRect ? (suggRect.bottom > dockRect.top) : null
      };
    });
    console.log('Clearance at bottom scroll:', JSON.stringify(clearanceInfo, null, 2));

    console.log('\n=== TEST 3: Smart Scroll Anchoring when AI reply arrives ===');
    // Scroll UP into history (e.g. scrollTop = 50)
    await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = 50;
    });
    await page.waitForTimeout(100);

    const scrollBefore = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      return {
        scrollTop: feed.scrollTop,
        scrollHeight: feed.scrollHeight,
        clientHeight: feed.clientHeight,
        isNear: (feed.scrollHeight - feed.scrollTop - feed.clientHeight) < 60
      };
    });
    console.log('Scroll state before assistant reply arrives:', scrollBefore);

    // Simulate deliverAssistantReply while student is at scrollTop=50
    await page.evaluate(() => {
      window.FiezelInteractiveChat.deliverAssistantReply({
        text: '美味しい豚骨ラーメンですね！トッピングは何にしますか？',
        furigana: '美味[しい] 豚骨ラーメンですね！',
        romaji: 'Oishii tonkotsu raamen desu ne!',
        translation: 'Ramen tonkotsu lezat ya! Mau topping apa?',
        source: 'probe'
      }, 'ramen', null, 'ja');
    });

    // Wait 150ms for any setTimeout (like scrollBottom's 30ms timeout)
    await page.waitForTimeout(200);

    const scrollAfter = await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      const btn = document.getElementById('fzcNewMsgBtn');
      return {
        scrollTop: feed.scrollTop,
        scrollHeight: feed.scrollHeight,
        clientHeight: feed.clientHeight,
        wasAnchored: Math.abs(feed.scrollTop - 50) < 10,
        btnDisplay: btn ? window.getComputedStyle(btn).display : null,
        btnVisibility: btn ? window.getComputedStyle(btn).visibility : null,
        btnOpacity: btn ? window.getComputedStyle(btn).opacity : null
      };
    });
    console.log('Scroll state after assistant reply arrived:', scrollAfter);

    console.log('\n=== TEST 4: Floating pill button (#fzcNewMsgBtn) scroll up/down test ===');
    // Scroll up manually
    await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = 10;
      feed.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(100);

    const btnAfterManualScrollUp = await page.evaluate(() => {
      const btn = document.getElementById('fzcNewMsgBtn');
      return {
        btnDisplay: btn ? window.getComputedStyle(btn).display : null,
        btnBoundingRect: btn ? btn.getBoundingClientRect() : null
      };
    });
    console.log('Pill button state after manual scroll up:', btnAfterManualScrollUp);

    // Scroll down manually near bottom
    await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = feed.scrollHeight - feed.clientHeight - 10;
      feed.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(100);

    const btnAfterManualScrollDown = await page.evaluate(() => {
      const btn = document.getElementById('fzcNewMsgBtn');
      const cs = btn ? window.getComputedStyle(btn) : null;
      return {
        hasIsHiddenClass: btn ? btn.classList.contains('is-hidden') : false,
        visibility: cs ? cs.visibility : null,
        opacity: cs ? cs.opacity : null
      };
    });
    console.log('Pill button state after manual scroll down to bottom (should be hidden):', btnAfterManualScrollDown);

    console.log('\n=== TEST 5: Dock auto-grow and button coverage ===');
    // Expand dock textarea to multiple lines
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = 'Baris 1 kalimat panjang\nBaris 2 kalimat panjang\nBaris 3 kalimat panjang';
      input.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(100);

    // Scroll up far so button is visible
    await page.evaluate(() => {
      const feed = document.getElementById('fzcFeed');
      feed.scrollTop = 50;
      feed.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(100);

    const dockExpandedGeo = await page.evaluate(() => {
      const dock = document.querySelector('.fzc-dock');
      const btn = document.getElementById('fzcNewMsgBtn');
      const dockRect = dock.getBoundingClientRect();
      const btnRect = btn ? btn.getBoundingClientRect() : null;
      const isVisible = btn ? !btn.classList.contains('is-hidden') : false;
      return {
        dockHeight: dockRect.height,
        dockTop: dockRect.top,
        btnRect: btnRect,
        isBtnVisible: isVisible,
        clearanceAboveDock: btnRect ? (dockRect.top - btnRect.bottom) : null,
        isBtnProperlyAboveDock: btnRect ? (btnRect.bottom <= dockRect.top) : null
      };
    });
    console.log('Dock expanded geometry with visible button:', dockExpandedGeo);

  } catch (err) {
    console.error('PROBE ERROR:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    console.log('Probe finished and server closed.');
  }
});
