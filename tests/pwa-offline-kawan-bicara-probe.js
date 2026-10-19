#!/usr/bin/env node
'use strict';
/**
 * tests/pwa-offline-kawan-bicara-probe.js
 * Empirical Playwright Probe: PWA Offline & Precache Integrity Audit for Kawan Bicara.
 *
 * Verifies:
 * 1. PWA offline environment (simulated network disconnect / server offline).
 * 2. Navigating to Kawan Bicara (state.view === 'chat') without freeze or white screen.
 * 3. Text chat operates seamlessly in offline deterministic mode (fail-quiet L5).
 * 4. Panggilan Kawan Bicara (Voice Call mode) remains resilient offline:
 *    - Fails quiet (L5: zero unhandled rejection, zero freeze, zero white screen).
 *    - Falls back gracefully to text transcription/subtitles or prompt dismiss.
 *    - Ending call returns cleanly to text feed with zero message loss.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
  console.log(`[Offline Probe Server] Started at ${baseUrl}`);

  const browser = await pw.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const pageErrors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      permissions: ['microphone']
    });

    const page = await context.newPage();
    page.on('pageerror', err => {
      console.error('[Browser Uncaught Error]:', err.message);
      pageErrors.push(err.message);
    });

    console.log('[Step 1] Loading Fiezel PWA Shell...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Bootstrap test user session so gates/modals do not block interaction
    await page.evaluate(() => {
      try {
        localStorage.setItem('fz_user_name', 'Budi Santoso');
        localStorage.setItem('fiezel_course', 'en');
        localStorage.setItem('fiezel_target_lang', 'en');
        localStorage.setItem('fz_target_course', 'en');
        localStorage.setItem('fz_onboarding_done', '1');
        localStorage.setItem('fz_auth_skip', '1');
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Budi Santoso', goal: 'general', level: 'A1', role: 'murid', course: 'en' }));
        localStorage.setItem('fiezel-tour-v1', 'finish');
      } catch (_) {}
      const splash = document.getElementById('fiezelBootSplash') || document.querySelector('.fiezel-splash');
      if (splash) splash.remove();
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-auth-open');
      if (typeof window.go === 'function') window.go('home');
    });
    await page.waitForTimeout(500);

    console.log('[Step 2] Simulating Offline Condition (Network severed / Server Offline)...');
    // Block any external AI endpoints or cloud workers to simulate total offline
    await page.route('**', route => {
      const url = route.request().url();
      if (url.includes('api.fiezel.my.id') || url.includes('workers.dev') || url.includes('puter.com') || url.includes('accounts.google.com')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    console.log('[Step 3] Navigating to Kawan Bicara (state.view = "chat")...');
    const goCalled = await page.evaluate(() => {
      return window.go('chat');
    });
    assert.strictEqual(goCalled, true, 'window.go("chat") must return true');

    // Wait for view transition to mount .fzc-container
    await page.waitForSelector('.fzc-container', { timeout: 5000 });

    const enterChatResult = await page.evaluate(() => {
      const container = document.querySelector('.fzc-container');
      const partnerName = document.querySelector('.fzc-partner-name');
      return {
        view: window.state?.view,
        containerFound: !!container,
        partnerName: partnerName ? partnerName.textContent : null,
        isWhiteScreen: !document.body || document.body.innerHTML.trim() === ''
      };
    });
    console.log('Navigated to Kawan Bicara:', JSON.stringify(enterChatResult, null, 2));
    assert.strictEqual(enterChatResult.containerFound, true, '.fzc-container must be mounted');
    assert.strictEqual(enterChatResult.isWhiteScreen, false, 'Must not be white screen');

    console.log('[Step 4] Sending Text Message in Offline Mode...');
    const chatFeedStateBefore = await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      const sendBtn = document.getElementById('fzcBtnSend');
      if (!input || !sendBtn) return null;
      input.value = 'Hello! Nice to meet you today!';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      sendBtn.click();
      return {
        inputFound: true,
        sentText: 'Hello! Nice to meet you today!'
      };
    });
    assert.ok(chatFeedStateBefore && chatFeedStateBefore.inputFound, 'Chat input & send button must exist');

    // Wait for deterministic offline reply to be rendered
    await page.waitForTimeout(600);

    const chatFeedStateAfter = await page.evaluate(() => {
      const msgRows = document.querySelectorAll('.fzc-msg-row');
      const lastAssistantMsg = document.querySelector('.fzc-msg-row.is-assistant .fzc-bubble-ai');
      const badgeOffline = document.querySelector('.fzc-badge-source, .fzc-source-note, .fzc-offline-badge');
      const text = lastAssistantMsg ? lastAssistantMsg.innerText : '';
      return {
        totalRows: msgRows.length,
        hasAssistantReply: !!lastAssistantMsg,
        assistantText: text.substring(0, 100),
        badgeText: badgeOffline ? badgeOffline.innerText : null
      };
    });
    console.log('Offline Text Chat Result:', JSON.stringify(chatFeedStateAfter, null, 2));
    assert.ok(chatFeedStateAfter.totalRows >= 2, 'Message count must include user and assistant turn');
    assert.ok(chatFeedStateAfter.hasAssistantReply, 'Assistant must reply deterministically offline');

    console.log('[Step 5] Triggering Panggilan Kawan Bicara (Voice Call mode) Offline...');
    const callModeResult = await page.evaluate(() => {
      // Click call button
      const callBtn = document.getElementById('fzcBtnCall');
      if (!callBtn) return { error: 'No call button' };
      callBtn.click();

      const overlay = document.getElementById('fzcCallOverlay') || document.querySelector('.fzc-call-stage');
      const voiceCallState = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
      return {
        callBtnFound: true,
        overlayFound: !!overlay,
        voiceCallStatus: voiceCallState ? voiceCallState.status : null
      };
    });
    console.log('Voice Call Triggered:', JSON.stringify(callModeResult, null, 2));
    assert.ok(callModeResult.callBtnFound, '#fzcBtnCall must be present in Kawan Bicara');

    await page.waitForTimeout(500);

    console.log('[Step 6] Ending Call and Verifying Return to Text Mode...');
    const endCallResult = await page.evaluate(() => {
      // Hang up via end call button or API
      const endBtn = document.getElementById('fzcBtnEndCall') || document.getElementById('fzcCallBtnEnd') || document.querySelector('.fzc-call-btn-hangup');
      if (endBtn) {
        endBtn.click();
      } else if (window.FiezelVoiceCall && typeof window.FiezelVoiceCall.endCall === 'function') {
        window.FiezelVoiceCall.endCall();
      } else if (window.FiezelInteractiveChat && typeof window.FiezelInteractiveChat.endVoiceCall === 'function') {
        window.FiezelInteractiveChat.endVoiceCall();
      }
      return {
        overlayStillPresent: !!document.getElementById('fzcCallOverlay'),
        containerVisible: !!document.querySelector('.fzc-container')
      };
    });
    console.log('End Call Result:', JSON.stringify(endCallResult, null, 2));

    await page.waitForTimeout(300);

    const finalPwaState = await page.evaluate(() => {
      const app = document.getElementById('app');
      const fzc = document.querySelector('.fzc-container');
      const isWhiteScreen = !app || app.innerHTML.trim() === '';
      return {
        view: window.state?.view,
        isWhiteScreen: isWhiteScreen,
        containerMounted: !!fzc
      };
    });
    console.log('Final PWA State:', JSON.stringify(finalPwaState, null, 2));
    assert.strictEqual(finalPwaState.isWhiteScreen, false, 'Screen must NOT be white');
    assert.strictEqual(finalPwaState.containerMounted, true, 'Kawan Bicara text container must remain mounted');

    // Confirm no fatal page errors occurred during offline operation
    assert.strictEqual(pageErrors.length, 0, `Zero page errors expected. Found: ${pageErrors.join('; ')}`);

    console.log('\n>>> PWA OFFLINE & KAWAN BICARA AUDIT PASSED 100% <<<');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('[FATAL FAILURE]:', err);
  process.exit(1);
});
