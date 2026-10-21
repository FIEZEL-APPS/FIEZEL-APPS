import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4512;

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
  console.log(`Probe server running at http://127.0.0.1:${PORT} (ROOT: ${ROOT})`);
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
    if (curView !== 'chat') throw new Error(`Expected state.view to be 'chat', got '${curView}'`);

    // Verify chat container is mounted
    const isChatMounted = await page.evaluate(() => !!document.querySelector('.fzc-container'));
    console.log('Is chat container mounted in DOM:', isChatMounted ? 'YES' : 'NO');
    if (!isChatMounted) throw new Error('Interactive chat UI not mounted in DOM!');

    // ── Audit Scroll Invariants & No Double Scroll ──
    console.log('2b. Auditing scroll metrics & body overflow containment...');
    const scrollAudit = await page.evaluate(() => {
      const b = document.body;
      const h = document.documentElement;
      const feed = document.querySelector('.fzc-feed');
      return {
        bodyScrollHeight: b.scrollHeight,
        bodyClientHeight: b.clientHeight,
        htmlScrollHeight: h.scrollHeight,
        htmlClientHeight: h.clientHeight,
        feedHeight: feed ? feed.offsetHeight : 0,
        feedScrollHeight: feed ? feed.scrollHeight : 0,
        feedCanScroll: feed ? (feed.scrollHeight > feed.clientHeight) : false
      };
    });
    console.log('Scroll audit results:', JSON.stringify(scrollAudit, null, 2));
    if (scrollAudit.bodyScrollHeight > 844 || scrollAudit.htmlScrollHeight > 844) {
      throw new Error(`Double scroll leak detected! Body scroll height is ${scrollAudit.bodyScrollHeight}px (expected 844px)`);
    }
    if (scrollAudit.feedHeight < 250) {
      throw new Error(`Feed container is squashed! Feed height is ${scrollAudit.feedHeight}px (expected >= 250px)`);
    }

    // ── Audit Zero Emoji Slop Invariant ──
    console.log('2c. Auditing Zero Emoji Slop across all buttons & components...');
    const emojiAudit = await page.evaluate(() => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
      const container = document.querySelector('.fzc-container');
      if (!container) return { error: 'No container' };

      const buttons = Array.from(container.querySelectorAll('button'));
      const buttonsWithEmoji = buttons.filter(b => emojiRegex.test(b.textContent || ''));

      const chips = Array.from(container.querySelectorAll('.fzc-scenario-chip'));
      const chipsWithoutSvg = chips.filter(c => !c.querySelector('svg'));

      const callBtn = document.getElementById('fzcBtnCall');
      const resetBtn = document.getElementById('fzcBtnReset');
      const callHasSvg = callBtn && !!callBtn.querySelector('svg');
      const resetHasSvg = resetBtn && !!resetBtn.querySelector('svg');

      const micBtn = document.getElementById('fzcBtnMic');
      const sendBtn = document.getElementById('fzcBtnSend');
      const micHasSvg = micBtn && !!micBtn.querySelector('svg');
      const sendHasSvg = sendBtn && !!sendBtn.querySelector('svg');

      const actionBtns = Array.from(container.querySelectorAll('.fzc-action-btn'));
      const actionBtnsWithoutSvg = actionBtns.filter(b => !b.querySelector('svg'));

      const avatarWrap = container.querySelector('.fzc-avatar-wrap');
      const avatarHasSvg = avatarWrap && !!avatarWrap.querySelector('svg');

      return {
        buttonsWithEmojiCount: buttonsWithEmoji.length,
        buttonsWithEmoji: buttonsWithEmoji.map(b => b.className || b.id),
        chipsWithoutSvgCount: chipsWithoutSvg.length,
        callHasSvg,
        resetHasSvg,
        micHasSvg,
        sendHasSvg,
        actionBtnsWithoutSvgCount: actionBtnsWithoutSvg.length,
        avatarHasSvg
      };
    });
    console.log('Emoji slop audit results:', emojiAudit);
    if (emojiAudit.buttonsWithEmojiCount > 0) {
      throw new Error(`Emoji slop detected in buttons: ${JSON.stringify(emojiAudit.buttonsWithEmoji)}`);
    }
    if (emojiAudit.chipsWithoutSvgCount > 0) {
      throw new Error(`Scenario chips missing SVG icon: ${emojiAudit.chipsWithoutSvgCount}`);
    }
    if (!emojiAudit.callHasSvg || !emojiAudit.resetHasSvg || !emojiAudit.micHasSvg || !emojiAudit.sendHasSvg || !emojiAudit.avatarHasSvg) {
      throw new Error(`UI components missing inline SVG icons: ${JSON.stringify(emojiAudit)}`);
    }

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

    // ── Audit Audio & Speech Synthesis ──
    console.log('3b. Testing Audio Playback & Web Speech Synthesis...');
    const chatState = await page.evaluate(() => window.FiezelInteractiveChat.getState());
    console.log('Live Chat State:', chatState);
    const speechCallResult = await page.evaluate(() => {
      let spokenUtterance = null;
      SpeechSynthesis.prototype.speak = function(u) {
        spokenUtterance = { text: u.text, lang: u.lang };
      };
      SpeechSynthesis.prototype.getVoices = function() {
        return [{ name: 'Nanami', lang: 'ja-JP' }];
      };

      const audioBtn = document.querySelector('.fzc-action-btn[data-action="audio"]');
      if (!audioBtn) return { error: 'Audio button not found' };

      audioBtn.click();
      return {
        spoken: spokenUtterance,
        isPlayingClass: audioBtn.classList.contains('is-playing')
      };
    });
    console.log('Speech playback result:', speechCallResult);
    if (!speechCallResult.spoken || speechCallResult.spoken.lang !== 'ja-JP') {
      throw new Error(`Audio failed to invoke SpeechSynthesis! Result: ${JSON.stringify(speechCallResult)}`);
    }

    // ── Audit Feed Scrolling ──
    console.log('3c. Testing programmatic feed scrolling...');
    const scrollTest = await page.evaluate(() => {
      const feed = document.querySelector('.fzc-feed');
      if (!feed) return { error: 'No feed' };
      feed.scrollTop = 50;
      return { scrollTop: feed.scrollTop };
    });
    console.log('Feed scrollTop after scroll:', scrollTest.scrollTop);
    if (scrollTest.scrollTop <= 0) {
      console.warn('Feed did not scroll; verifying feed scrollability:', scrollAudit.feedCanScroll);
    }

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

    // ── Audit Voice Call Mode (Teleponan) ──
    console.log('7. Clicking #fzcBtnCall to launch Voice Call Mode (Teleponan)...');
    await page.evaluate(() => {
      const callBtn = document.getElementById('fzcBtnCall');
      if (callBtn) callBtn.click();
    });
    await page.waitForTimeout(800);

    // Verify call overlay & active voice orb are mounted in DOM
    const callOverlayAudit = await page.evaluate(() => {
      const overlay = document.getElementById('fzcCallOverlay');
      const orb = document.getElementById('fzcVoiceOrb');
      const endBtn = document.getElementById('fzcCallBtnEnd') || document.getElementById('fzcBtnEndCall');
      const muteBtn = document.getElementById('fzcCallBtnMute');
      const subCard = document.getElementById('fzcCallSubtitleCard');
      const timer = document.getElementById('fzcCallTimer');
      const state = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;

      return {
        hasOverlay: !!overlay,
        hasOrb: !!orb,
        hasEndBtn: !!endBtn,
        hasMuteBtn: !!muteBtn,
        hasSubCard: !!subCard,
        hasTimer: !!timer,
        status: state ? state.status : null
      };
    });
    console.log('Voice Call Overlay Audit:', JSON.stringify(callOverlayAudit, null, 2));
    if (!callOverlayAudit.hasOverlay) throw new Error('#fzcCallOverlay modal not mounted in DOM!');
    if (!callOverlayAudit.hasOrb) throw new Error('#fzcVoiceOrb active orb visualizer not found!');
    if (!callOverlayAudit.hasEndBtn) throw new Error('Hangup button (#fzcCallBtnEnd) not found in call overlay!');

    // Capture visual screenshot of active call overlay
    console.log('8. Capturing interactive call preview screenshot...');
    await page.screenshot({ path: path.join(ROOT, 'tools', 'dev', 'interactive-call-preview.png'), fullPage: false });
    console.log('Screenshot saved to tools/dev/interactive-call-preview.png');

    // Simulate hands-free telephone turn-taking loop (listening -> thinking -> speaking -> listening)
    console.log('9. Simulating hands-free telephone turn-taking loop...');
    const simTurnResult = await page.evaluate(async () => {
      if (!window.FiezelVoiceCall || typeof window.FiezelVoiceCall._testSimulateTurn !== 'function') {
        return { error: 'window.FiezelVoiceCall._testSimulateTurn is not defined' };
      }
      const spokenText = 'こんにちは！豚骨ラーメンを一杯お願いします。';
      const result = await window.FiezelVoiceCall._testSimulateTurn(spokenText);
      const state = window.FiezelVoiceCall.getState();
      const subText = document.getElementById('fzcCallSubText')?.textContent || '';

      return {
        turnResult: result,
        finalStatus: state.status,
        callTurnsCount: state.callTurns ? state.callTurns.length : 0,
        latestAiReply: state.latestAiReply ? state.latestAiReply.text : null,
        subText: subText
      };
    });
    console.log('Turn simulation result:', JSON.stringify(simTurnResult, null, 2));
    if (simTurnResult.error) throw new Error(simTurnResult.error);
    if (simTurnResult.callTurnsCount < 1) throw new Error('Turn was not recorded in state.callTurns!');

    // End call via #fzcCallBtnEnd
    console.log('10. Ending call via #fzcCallBtnEnd...');
    await page.evaluate(() => {
      const endBtn = document.getElementById('fzcCallBtnEnd') || document.getElementById('fzcBtnEndCall');
      if (endBtn) endBtn.click();
    });
    await page.waitForTimeout(600);

    const callClosedAudit = await page.evaluate(() => {
      const overlay = document.getElementById('fzcCallOverlay');
      const state = window.FiezelVoiceCall ? window.FiezelVoiceCall.getState() : null;
      return {
        overlayRemaining: !!overlay,
        status: state ? state.status : null
      };
    });
    console.log('Call closure audit:', callClosedAudit);
    if (callClosedAudit.status !== 'idle') throw new Error(`Expected call status to be 'idle', got '${callClosedAudit.status}'`);

    // Verify dialogue is saved intact without loss in chat feed (.fzc-feed)
    console.log('11. Verifying zero-loss voice dialogue preservation in chat feed (.fzc-feed)...');
    const feedVerification = await page.evaluate(() => {
      const feed = document.querySelector('.fzc-feed');
      if (!feed) return { error: 'No feed' };
      const bubbles = Array.from(feed.querySelectorAll('.fzc-msg-row .fzc-bubble'));
      const textList = bubbles.map(b => b.textContent.trim());
      const hasSpokenInput = textList.some(t => t.includes('こんにちは！豚骨ラーメンを一杯お願いします。'));
      const voiceBubbles = Array.from(feed.querySelectorAll('.fzc-msg-row'));
      return {
        totalBubbles: bubbles.length,
        hasSpokenInput,
        textList: textList
      };
    });
    console.log('Feed verification results:', JSON.stringify(feedVerification, null, 2));
    if (!feedVerification.hasSpokenInput) {
      throw new Error(`Zero-Loss Invariant Violated! Spoken turn 'こんにちは！豚骨ラーメンを一杯お願いします。' missing from .fzc-feed!`);
    }
    console.log('✓ Zero-loss state certified: Spoken phone dialogue preserved in chat feed');

    // Verify Topbar back returns to Latihan
    console.log('12. Testing Topbar back navigation...');
    await page.evaluate(() => window.handleTopbarBack());
    await page.waitForTimeout(400);

    const backView = await page.evaluate(() => typeof state !== 'undefined' ? state.view : (window.__fiezelAudit?.liveState()?.view || null));
    console.log('State.view after handleTopbarBack():', backView);
    if (backView !== 'latihan') throw new Error(`Expected return to 'latihan', got '${backView}'`);

    // Capture visual screenshot of final interactive chat screen
    console.log('13. Capturing final interactive chat preview screenshot...');
    await page.evaluate(() => window.go('chat'));
    await page.waitForTimeout(1000);
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
    process.exit(process.exitCode ?? 0);
  }
});
