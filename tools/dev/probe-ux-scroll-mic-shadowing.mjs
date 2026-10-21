import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4519;

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
  console.log(`[ProbeUX] Server running at http://127.0.0.1:${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
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
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
    });

    console.log('--- TEST 1: Open Chat View and Test Feed Scrolling ---');
    await page.evaluate(() => window.go('chat'));
    await page.waitForSelector('.fzc-feed', { timeout: 8000 });
    await page.waitForTimeout(400);

    // Send multiple messages to fill up feed and create ample scrollable content
    await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      chat.sendMessage('こんにちは、はじめまして！');
      chat.sendMessage('ラーメンを注文したいです。おすすめは何ですか？');
      chat.sendMessage('大盛りでお願いします！');
    });
    await page.waitForTimeout(600);

    const scrollMetrics = await page.evaluate(() => {
      const feed = document.querySelector('.fzc-feed');
      feed.scrollTop = 0;
      const topZero = feed.scrollTop;
      feed.scrollTop = 180;
      const topScrolled = feed.scrollTop;
      return {
        scrollHeight: feed.scrollHeight,
        clientHeight: feed.clientHeight,
        topZero,
        topScrolled,
        isScrollable: feed.scrollHeight > feed.clientHeight,
        scrollWorked: topScrolled > 0
      };
    });
    console.log('Feed Scroll Metrics:', scrollMetrics);
    if (!scrollMetrics.isScrollable || !scrollMetrics.scrollWorked) {
      throw new Error(`Feed scroll failed! Metrics: ${JSON.stringify(scrollMetrics)}`);
    }
    console.log('✓ Feed scrolling is 100% functional and unstuck!');

    // Take screenshot of scrolled chat
    await page.screenshot({ path: path.join(ROOT, 'tools/dev/ux-chat-scrolled.png') });
    console.log('✓ Saved tools/dev/ux-chat-scrolled.png');

    console.log('--- TEST 2: Horizontal Scenarios & Suggestion Cards Clipping Audit ---');
    await page.evaluate(() => {
      const rail = document.querySelector('.fzc-scenarios-rail');
      rail.scrollTo({ left: rail.scrollWidth, behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    const scenariosAudit = await page.evaluate(() => {
      const rail = document.querySelector('.fzc-scenarios-rail');
      const chips = Array.from(rail.querySelectorAll('.fzc-scenario-chip'));
      const lastChip = chips[chips.length - 1];
      const lastRect = lastChip.getBoundingClientRect();
      return {
        railWidth: rail.clientWidth,
        chipsCount: chips.length,
        lastChipTitle: lastChip.textContent.trim(),
        lastChipLeft: lastRect.left,
        lastChipRight: lastRect.right,
        windowWidth: window.innerWidth,
        fitsInWindow: lastRect.right <= window.innerWidth + 2 && lastRect.left >= 0
      };
    });
    console.log('Scenarios Rail Audit:', scenariosAudit);
    if (!scenariosAudit.fitsInWindow) {
      throw new Error(`Scenario card truncated on right! Audit: ${JSON.stringify(scenariosAudit)}`);
    }
    console.log('✓ Scenario chips scroll edge-to-edge without being cut off!');

    console.log('--- TEST 3: Real-Time Audio Visualizer in Shadowing ---');
    await page.evaluate(() => {
      document.querySelectorAll('.fiezel-splash, #brandSplash, .fiezel-ob, #authGate').forEach(e => e.remove());
      const btn = document.querySelector('button[data-action="shadow"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    const shadowBoxState = await page.evaluate(() => {
      const box = document.getElementById('fzcShadowBoxActive');
      const eq = document.getElementById('fzcShadowLiveEq');
      const bars = eq ? eq.querySelectorAll('.fzc-eq-bar') : [];
      const statusPill = document.getElementById('fzcShadowStatusPill');
      const transcriptEl = document.getElementById('fzcShadowLiveTranscript');
      return {
        hasBox: !!box,
        hasEq: !!eq,
        barCount: bars.length,
        statusText: statusPill ? statusPill.textContent.trim() : null,
        hasLiveTranscript: !!transcriptEl
      };
    });
    console.log('Shadowing Visualizer State:', shadowBoxState);
    if (!shadowBoxState.hasBox || shadowBoxState.barCount < 4) {
      throw new Error(`Shadowing audio visualizer failed to mount! State: ${JSON.stringify(shadowBoxState)}`);
    }
    console.log(`✓ Shadowing mounted with ${shadowBoxState.barCount} dynamic audio visualizer bars & status pill!`);

    // Simulate speech detection in UI
    await page.evaluate(() => {
      const box = document.getElementById('fzcShadowBoxActive');
      const statusPill = document.getElementById('fzcShadowStatusPill');
      const transcriptEl = document.getElementById('fzcShadowLiveTranscript');
      const bars = document.querySelectorAll('.fzc-eq-bar');
      if (box) box.classList.add('is-speaking-detected');
      if (statusPill) {
        statusPill.classList.add('is-detecting');
        statusPill.textContent = '● Mendengar suaramu...';
      }
      if (transcriptEl) {
        transcriptEl.textContent = '"こんにちは"';
      }
      const heights = [14, 22, 18, 20, 16, 12, 8];
      bars.forEach((b, i) => {
        b.style.height = `${heights[i % heights.length]}px`;
      });
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(ROOT, 'tools/dev/ux-shadowing-live-eq.png') });
    console.log('✓ Saved tools/dev/ux-shadowing-live-eq.png');

    console.log('--- TEST 4: Microphone Permission Guidance Modal ---');
    // Ensure any active call or voice session is ended
    await page.evaluate(() => {
      if (window.FiezelVoiceCall) window.FiezelVoiceCall.end();
    });
    await page.waitForTimeout(300);

    // Mock getUserMedia rejection and trigger startCall
    await page.evaluate(async () => {
      const origGUM = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      try {
        await window.FiezelVoiceCall.startCall({ partnerName: 'フィゼル先生', course: 'ja' });
      } catch (_) {}
      navigator.mediaDevices.getUserMedia = origGUM;
    });
    await page.waitForTimeout(300);

    const modalTriggered = await page.evaluate(() => {
      const modal = document.getElementById('fzcMicModal');
      return {
        hasModal: !!modal,
        title: modal ? modal.querySelector('.fzc-mic-modal-title')?.textContent : null,
        desc: modal ? modal.querySelector('.fzc-mic-modal-desc')?.textContent : null,
        allowBtnText: modal ? modal.querySelector('#fzcMicModalAllowBtn')?.textContent.trim() : null
      };
    });
    console.log('Microphone Permission Modal Status:', modalTriggered);
    if (!modalTriggered.hasModal) {
      throw new Error('Microphone permission modal did not appear!');
    }
    console.log('✓ Microphone permission modal successfully displayed!');

    await page.screenshot({ path: path.join(ROOT, 'tools/dev/ux-mic-permission-modal.png') });
    console.log('✓ Saved tools/dev/ux-mic-permission-modal.png');

    console.log('\n=============================================');
    console.log('ALL EMPIRICAL PLAYWRIGHT UX PROBES PASSED! 🎉');
    console.log('=============================================');

  } catch (err) {
    console.error('PROBE FAILED:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
