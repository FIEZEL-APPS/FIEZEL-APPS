import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4512;
const ROOT = process.cwd();

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
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
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
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
      document.getElementById('authGate')?.remove();
      document.getElementById('fzRitual')?.remove();
    });

    console.log('1. Navigating to Latihan hub...');
    await page.evaluate(() => window.go('latihan'));
    await page.waitForTimeout(400);

    // Verify chat card is in Latihan
    const hasChatCard = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.launch-card'));
      return cards.some(c => c.getAttribute('onclick')?.includes("'chat'"));
    });
    console.log('Has Chat card in Latihan:', hasChatCard ? 'YES' : 'NO');
    if (!hasChatCard) throw new Error('Chat card missing in Latihan hub!');

    console.log('2. Clicking Chat card to launch interactive Kaiwa chat...');
    await page.evaluate(() => window.go('chat'));
    await page.waitForTimeout(400);

    // Verify view is chat
    const curView = await page.evaluate(() => typeof state !== 'undefined' ? state.view : (window.__fiezelAudit?.liveState()?.view || null));
    console.log('Current state.view:', curView);
    const debugInfo = await page.evaluate(() => ({
      fnExists: typeof window.interactiveChatView,
      fzcExists: typeof window.FiezelInteractiveChat,
      appHtml: document.getElementById('app')?.innerHTML?.slice(0, 300)
    }));
    console.log('DEBUG INFO:', debugInfo);
    if (curView !== 'chat') throw new Error(`Expected state.view to be 'chat', got '${curView}'`);

    // Verify chat container is mounted
    const isChatMounted = await page.evaluate(() => !!document.querySelector('.fzc-container'));
    console.log('Is chat container mounted in DOM:', isChatMounted ? 'YES' : 'NO');
    if (!isChatMounted) throw new Error('Interactive chat UI not mounted in DOM!');

    // Check scenario chips
    const scenarioCount = await page.evaluate(() => document.querySelectorAll('.fzc-scenario-chip').length);
    console.log('Scenario chips count:', scenarioCount);
    if (scenarioCount < 3) throw new Error(`Expected at least 3 scenarios, found ${scenarioCount}`);

    // Switch scenario to Ramen
    console.log('3. Selecting Ramen restaurant scenario...');
    await page.evaluate(() => {
      const ramenBtn = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.textContent.includes('Ramen') || b.textContent.includes('ラーメン'));
      if (ramenBtn) ramenBtn.click();
    });
    await page.waitForTimeout(400);

    // Check message feed
    const firstMsgText = await page.evaluate(() => {
      const bubble = document.querySelector('.fzc-msg-row.is-assistant .fzc-bubble');
      return bubble ? bubble.textContent.trim() : '';
    });
    console.log('Initial AI starter message:', firstMsgText.slice(0, 60) + '...');
    if (!firstMsgText) throw new Error('AI starter message bubble not found!');

    // Check Furigana Ruby presence in Japanese message
    const hasRuby = await page.evaluate(() => !!document.querySelector('.fzc-msg-row.is-assistant .fzc-bubble ruby'));
    console.log('Furigana <ruby> present in Japanese speech:', hasRuby ? 'YES' : 'NO');

    // Verify Scenario Goals checklist is mounted
    const hasGoals = await page.evaluate(() => !!document.querySelector('.fzc-goals-container'));
    console.log('Scenario goals checklist mounted:', hasGoals ? 'YES' : 'NO');
    if (!hasGoals) throw new Error('Scenario goals checklist missing in scenario card');

    // Click translation toggle
    console.log('4. Toggling translation on AI message...');
    await page.evaluate(() => {
      const transToggle = document.querySelector('.fzc-action-btn[data-action="translate"]');
      if (transToggle) transToggle.click();
    });
    await page.waitForTimeout(200);

    const isTransVisible = await page.evaluate(() => {
      const transBox = document.querySelector('.fzc-reveal-box');
      return transBox && !transBox.classList.contains('is-hidden');
    });
    console.log('Is translation visible after toggle:', isTransVisible ? 'YES' : 'NO');

    // Check Shadowing action button presence
    const hasShadowBtn = await page.evaluate(() => !!document.querySelector('.fzc-action-btn[data-action="shadow"]'));
    console.log('Shadowing action button present:', hasShadowBtn ? 'YES' : 'NO');
    if (!hasShadowBtn) throw new Error('Shadowing action button missing on assistant bubble');

    // Click quick suggestion chip
    console.log('5. Clicking quick suggestion chip...');
    const chipText = await page.evaluate(() => {
      const chip = document.querySelector('.fzc-suggestion-chip');
      if (!chip) return null;
      const text = chip.querySelector('strong')?.textContent || chip.textContent;
      chip.click();
      return text.trim();
    });
    console.log('Clicked chip with text:', chipText);
    await page.waitForTimeout(800);

    // Verify user bubble was added
    const userBubbleCount = await page.evaluate(() => document.querySelectorAll('.fzc-msg-row.is-user').length);
    console.log('User bubbles in feed:', userBubbleCount);
    if (userBubbleCount !== 1) throw new Error(`Expected 1 user bubble, got ${userBubbleCount}`);

    // Type and send custom message
    console.log('6. Typing student reply with zero-loss text...');
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      if (input) {
        input.value = 'ごちそうさまでした！とても美味しかったです。';
      }
      const sendBtn = document.getElementById('fzcBtnSend');
      if (sendBtn) sendBtn.click();
    });
    await page.waitForTimeout(800);

    const updatedUserCount = await page.evaluate(() => document.querySelectorAll('.fzc-msg-row.is-user').length);
    console.log('User bubbles after custom send:', updatedUserCount);
    if (updatedUserCount !== 2) throw new Error(`Expected 2 user bubbles, got ${updatedUserCount}`);

    // Verify student's second bubble has exact text
    const secondUserText = await page.evaluate(() => {
      const bubbles = document.querySelectorAll('.fzc-msg-row.is-user .fzc-bubble');
      return bubbles[1]?.textContent?.trim();
    });
    console.log('Preserved student input in second bubble:', secondUserText);
    if (secondUserText !== 'ごちそうさまでした！とても美味しかったです。') {
      throw new Error(`Zero-loss violated! Expected 'ごちそうさまでした！とても美味しかったです。', got '${secondUserText}'`);
    }

    // Verify Topbar back returns to Latihan
    console.log('7. Testing Topbar back navigation...');
    await page.evaluate(() => window.handleTopbarBack());
    await page.waitForTimeout(400);

    const backView = await page.evaluate(() => typeof state !== 'undefined' ? state.view : (window.__fiezelAudit?.liveState()?.view || null));
    console.log('State.view after handleTopbarBack():', backView);
    if (backView !== 'latihan') throw new Error(`Expected return to 'latihan', got '${backView}'`);

    // Capture visual screenshot
    console.log('8. Capturing preview screenshot...');
    await page.evaluate(() => window.go('chat'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ROOT, 'tools', 'dev', 'interactive-chat-preview.png'), fullPage: false });
    console.log('Screenshot saved to tools/dev/interactive-chat-preview.png');

    console.log('\n>>> EMPIRICAL PLAYWRIGHT AUDIT: 100% PASS <<<');
    process.exitCode = 0;
  } catch (err) {
    console.error('Probe failed:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
