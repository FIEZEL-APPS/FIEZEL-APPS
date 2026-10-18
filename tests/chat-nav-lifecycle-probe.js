#!/usr/bin/env node
'use strict';
/**
 * tests/chat-nav-lifecycle-probe.js
 * Empirical Playwright Probe: Navigation Lifecycle & BottomNav Disappearance Audit
 * when entering and exiting Kawan Bicara (state.view === 'chat').
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const pw = (() => {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
})();
if (!pw) {
  console.error('[FATAL] Playwright not found in environment.');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
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

async function run() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[Probe Server] Started at ${baseUrl}`);

  const browser = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    });

    const page = await context.newPage();
    page.on('console', msg => {
      // suppress verbose logs
    });

    console.log('[Step 1] Loading Fiezel PWA...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Set auth session and state so auth gate never triggers
    await page.evaluate(() => {
      try {
        if (window.FiezelAuthScreen && typeof window.FiezelAuthScreen.saveSession === 'function') {
          window.FiezelAuthScreen.saveSession(window, { role: 'murid', via: 'test' });
        } else {
          localStorage.setItem('fiezel_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
        }
      } catch (_) {}
      const splash = document.getElementById('fiezelBootSplash') || document.querySelector('.fiezel-splash');
      if (splash) splash.remove();
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-auth-open');
      if (typeof window.go === 'function') window.go('home');
    });
    await page.waitForTimeout(500);

    // Initial state audit on 'home'
    const homeState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      return {
        view: window.state?.view,
        bottomNavExists: !!bn,
        bottomNavInlineStyle: bn ? bn.getAttribute('style') : null,
        bottomNavComputedDisplay: bn ? window.getComputedStyle(bn).display : null,
        htmlClassList: Array.from(document.documentElement.classList),
        bodyClassList: Array.from(document.body.classList)
      };
    });
    console.log('[Initial State on Home]:', JSON.stringify(homeState, null, 2));

    // Step 2: Open Kawan Bicara (chat) from Home
    console.log('\n[Step 2] Navigating from Home to Kawan Bicara (state.view === "chat")...');
    const goResult = await page.evaluate(() => {
      const res = window.go('chat');
      return {
        res: res,
        view: window.state?.view,
        isValidView: window.VALID_VIEWS ? window.VALID_VIEWS.has('chat') : null,
        isBlocked: typeof window.targetLangSurfaceBlocked === 'function' ? window.targetLangSurfaceBlocked('chat') : null,
        targetLang: typeof window.activeTargetLang === 'function' ? window.activeTargetLang() : null
      };
    });
    console.log('[goResult]:', JSON.stringify(goResult, null, 2));
    await page.waitForTimeout(500);


    const chatState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const fzc = document.querySelector('.fzc-container');
      const snap = window.FiezelBackNav && typeof window.FiezelBackNav.controller === 'function' && window.FiezelBackNav.controller()
        ? window.FiezelBackNav.controller().snapshot()
        : null;
      return {
        view: window.state?.view,
        backNavStack: snap,
        fzcContainerExists: !!fzc,
        bottomNavInlineStyle: bn ? bn.getAttribute('style') : null,
        bottomNavComputedDisplay: bn ? window.getComputedStyle(bn).display : null,
        htmlClassList: Array.from(document.documentElement.classList),
        bodyClassList: Array.from(document.body.classList)
      };
    });
    console.log('[Chat State]:', JSON.stringify(chatState, null, 2));

    // Step 3: Click Topbar Back Button
    console.log('\n[Step 3] Clicking Topbar Back Button (handleTopbarBack())...');
    const beforeBackStack = await page.evaluate(() => {
      return window.FiezelBackNav && typeof window.FiezelBackNav.controller === 'function' && window.FiezelBackNav.controller()
        ? window.FiezelBackNav.controller().snapshot()
        : null;
    });
    console.log('[BackNav Stack Before Back]:', JSON.stringify(beforeBackStack, null, 2));

    await page.evaluate(() => {
      window.handleTopbarBack();
    });
    await page.waitForTimeout(500);


    const afterBackState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const pill = document.getElementById('navActivePill');
      return {
        view: window.state?.view,
        bottomNavInlineStyle: bn ? bn.getAttribute('style') : null,
        bottomNavComputedDisplay: bn ? window.getComputedStyle(bn).display : null,
        bottomNavOffsetWidth: bn ? bn.offsetWidth : 0,
        bottomNavOffsetHeight: bn ? bn.offsetHeight : 0,
        pillComputedOpacity: pill ? window.getComputedStyle(pill).opacity : null,
        htmlClassList: Array.from(document.documentElement.classList),
        bodyClassList: Array.from(document.body.classList)
      };
    });
    console.log('[After Back State]:', JSON.stringify(afterBackState, null, 2));

    // Step 4: Manually try to go to 'home'
    console.log('\n[Step 4] Calling window.go("home")...');
    await page.evaluate(() => {
      window.go('home');
    });
    await page.waitForTimeout(500);

    const homeAfterBackState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      return {
        view: window.state?.view,
        bottomNavInlineStyle: bn ? bn.getAttribute('style') : null,
        bottomNavComputedDisplay: bn ? window.getComputedStyle(bn).display : null,
        bottomNavOffsetHeight: bn ? bn.offsetHeight : 0,
        htmlClassList: Array.from(document.documentElement.classList),
        bodyClassList: Array.from(document.body.classList)
      };
    });
    console.log('[Home After Back State]:', JSON.stringify(homeAfterBackState, null, 2));

    // Step 5: Test calling window.FiezelInteractiveChat.unmount() directly
    console.log('\n[Step 5] Calling window.FiezelInteractiveChat.unmount()...');
    await page.evaluate(() => {
      if (window.FiezelInteractiveChat && typeof window.FiezelInteractiveChat.unmount === 'function') {
        window.FiezelInteractiveChat.unmount();
      }
    });
    await page.waitForTimeout(200);

    const afterUnmountState = await page.evaluate(() => {
      const bn = document.querySelector('.bottomnav');
      const pill = document.getElementById('navActivePill');
      const fzc = document.querySelector('.fzc-container');

      // Check which CSS rule hides it
      const matched = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && bn.matches(rule.selectorText)) {
              if (rule.style.display === 'none') {
                matched.push({ selector: rule.selectorText, href: sheet.href || 'inline' });
              }
            }
          }
        } catch (_) {}
      }

      return {
        hasFzcContainerInDom: !!fzc,
        fzcContainerParent: fzc ? fzc.parentNode.tagName + '#' + fzc.parentNode.id : null,
        matchingDisplayNoneRules: matched,
        bottomNavInlineStyle: bn ? bn.getAttribute('style') : null,
        bottomNavComputedDisplay: bn ? window.getComputedStyle(bn).display : null,
        bottomNavOffsetHeight: bn ? bn.offsetHeight : 0,
        pillComputedOpacity: pill ? window.getComputedStyle(pill).opacity : null,
        htmlClassList: Array.from(document.documentElement.classList),
        bodyClassList: Array.from(document.body.classList)
      };
    });
    console.log('[After Unmount State]:', JSON.stringify(afterUnmountState, null, 2));


    console.log('\n================ AUDIT SUMMARY ================');
    console.log(`1. Navigated back landed in: "${afterBackState.bodyClassList.find(c => c.startsWith('fz-view-'))}" (Expected: "fz-view-home")`);
    console.log(`2. BottomNav inline style after back (without unmount): "${afterBackState.bottomNavInlineStyle}"`);
    console.log(`3. BottomNav computed display after back (without unmount): "${afterBackState.bottomNavComputedDisplay}"`);
    console.log(`4. Is BottomNav invisible after back? ${afterBackState.bottomNavComputedDisplay === 'none' ? 'YES (BUG CONFIRMED)' : 'NO'}`);
    console.log(`5. After calling unmount():`);
    console.log(`   - BottomNav inline style: "${afterUnmountState.bottomNavInlineStyle}"`);
    console.log(`   - BottomNav computed display: "${afterUnmountState.bottomNavComputedDisplay}"`);
    console.log(`   - Is BottomNav restored? ${afterUnmountState.bottomNavComputedDisplay !== 'none' ? 'YES (UNMOUNT RESTORES IT)' : 'NO'}`);


  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('[Probe Error]:', err);
  process.exit(1);
});
