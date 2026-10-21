import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4522;

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
  const auditReport = {
    test1_scenario_switching: null,
    test2_reset_isolation: null,
    test3_goals_reactivity_and_xp: null,
    test4_state_leaks: null
  };

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
      localStorage.setItem('fz_user_name', 'Budi Murid');
      localStorage.setItem('fiezel_course', 'ja');
      localStorage.setItem('fiezel_target_lang', 'ja');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Budi Murid', goal: 'general', level: 'N5', role: 'murid', course: 'ja' }));
      sessionStorage.setItem('fiezel_boot_count', '2');
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
      }, 50);
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
    await page.waitForTimeout(500);

    // Launch chat
    await page.evaluate(() => window.go('chat'));
    await page.waitForTimeout(500);

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Carousel scenario switching & multi-turn persistence
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- AUDIT 1: Carousel Switching & State Transition ---');
    // Start at 'free'
    const initialScenario = await page.evaluate(() => window.FiezelInteractiveChat.getState().scenarioId);
    console.log('Initial scenarioId:', initialScenario);

    // Send a message in 'free'
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = 'こんにちは！元気ですか？';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(600);

    // Check message count in 'free'
    const freeMsgsCount = await page.evaluate(() => window.FiezelInteractiveChat.getState().messages.length);
    console.log("Messages in 'free':", freeMsgsCount);

    // Click 'ramen' chip
    console.log("Switching to 'ramen'...");
    await page.evaluate(() => {
      const ramenChip = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.dataset.scenario === 'ramen');
      if (ramenChip) ramenChip.click();
    });
    await page.waitForTimeout(400);

    const ramenScenario = await page.evaluate(() => window.FiezelInteractiveChat.getState().scenarioId);
    console.log("Current scenarioId after switch:", ramenScenario);

    // Send a message in 'ramen'
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = '豚骨ラーメン、硬めでお願いします。';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(600);

    const ramenMsgsCount = await page.evaluate(() => window.FiezelInteractiveChat.getState().messages.length);
    console.log("Messages in 'ramen':", ramenMsgsCount);

    // Click 'konbini' chip
    console.log("Switching to 'konbini'...");
    await page.evaluate(() => {
      const konbiniChip = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.dataset.scenario === 'konbini');
      if (konbiniChip) konbiniChip.click();
    });
    await page.waitForTimeout(400);

    const konbiniScenario = await page.evaluate(() => window.FiezelInteractiveChat.getState().scenarioId);
    console.log("Current scenarioId after switch:", konbiniScenario);

    // Switch back to 'free' and verify message preservation
    console.log("Switching back to 'free'...");
    await page.evaluate(() => {
      const freeChip = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.dataset.scenario === 'free');
      if (freeChip) freeChip.click();
    });
    await page.waitForTimeout(400);

    const freeMsgsRestored = await page.evaluate(() => {
      const msgs = window.FiezelInteractiveChat.getState().messages;
      return {
        count: msgs.length,
        hasUserMsg: msgs.some(m => m.role === 'user' && m.text === 'こんにちは！元気ですか？')
      };
    });
    console.log("Free scenario restored:", freeMsgsRestored);

    // Switch back to 'ramen' and verify message preservation
    console.log("Switching back to 'ramen'...");
    await page.evaluate(() => {
      const ramenChip = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.dataset.scenario === 'ramen');
      if (ramenChip) ramenChip.click();
    });
    await page.waitForTimeout(400);

    const ramenMsgsRestored = await page.evaluate(() => {
      const msgs = window.FiezelInteractiveChat.getState().messages;
      return {
        count: msgs.length,
        hasUserMsg: msgs.some(m => m.role === 'user' && m.text === '豚骨ラーメン、硬めでお願いします。')
      };
    });
    console.log("Ramen scenario restored:", ramenMsgsRestored);

    auditReport.test1_scenario_switching = {
      smoothSwitch: ramenScenario === 'ramen' && konbiniScenario === 'konbini',
      freePreserved: freeMsgsRestored.hasUserMsg,
      ramenPreserved: ramenMsgsRestored.hasUserMsg,
      pageErrors: pageErrors.slice()
    };

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Reset Scenario Isolation & localStorage Safety
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- AUDIT 2: Reset Scenario Isolation & localStorage Safety ---');
    // Currently on 'ramen'. Let's click #fzcBtnReset.
    const storageBeforeReset = await page.evaluate(() => {
      const raw = localStorage.getItem('fiezel-interactive-chat-v1');
      const parsed = JSON.parse(raw || '{}');
      return {
        hasJaFree: Array.isArray(parsed.scenarioHistories?.ja_free) && parsed.scenarioHistories.ja_free.length > 1,
        hasJaRamen: Array.isArray(parsed.scenarioHistories?.ja_ramen) && parsed.scenarioHistories.ja_ramen.length > 1,
        jaFreeLength: parsed.scenarioHistories?.ja_free?.length,
        jaRamenLength: parsed.scenarioHistories?.ja_ramen?.length
      };
    });
    console.log("Storage state BEFORE reset:", storageBeforeReset);

    // Click #fzcBtnReset
    console.log("Clicking #fzcBtnReset on active scenario 'ramen'...");
    await page.evaluate(() => {
      const resetBtn = document.getElementById('fzcBtnReset');
      if (resetBtn) resetBtn.click();
    });
    await page.waitForTimeout(400);

    const storageAfterReset = await page.evaluate(() => {
      const raw = localStorage.getItem('fiezel-interactive-chat-v1');
      const parsed = JSON.parse(raw || '{}');
      const activeMsgs = window.FiezelInteractiveChat.getState().messages;
      return {
        activeMsgsCount: activeMsgs.length,
        activeIsStarterOnly: activeMsgs.length === 1 && activeMsgs[0].role === 'assistant',
        hasJaFree: Array.isArray(parsed.scenarioHistories?.ja_free) && parsed.scenarioHistories.ja_free.length > 1,
        jaFreeLength: parsed.scenarioHistories?.ja_free?.length,
        jaRamenLength: parsed.scenarioHistories?.ja_ramen?.length
      };
    });
    console.log("Storage state AFTER reset:", storageAfterReset);

    auditReport.test2_reset_isolation = {
      ramenCleaned: storageAfterReset.activeIsStarterOnly && storageAfterReset.jaRamenLength === 1,
      freeUntouched: storageAfterReset.hasJaFree && storageAfterReset.jaFreeLength === storageBeforeReset.jaFreeLength
    };

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Goal progress evaluation (evaluateGoalProgress)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- AUDIT 3: Goal Progress Evaluation & Reactivity ---');
    // On 'ramen' scenario (now fresh starter).
    // Let's check goals:
    // g1: 醤油|味噌|豚骨...
    // g2: 普通|硬め...
    // g3: ごちそう|ありがとう...
    const goalsInitial = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.fzc-goal-item'));
      return items.map(el => ({
        text: el.textContent.trim(),
        isDone: el.classList.contains('is-done')
      }));
    });
    console.log('Initial ramen goals:', goalsInitial);

    // Send msg satisfying g1 and g2: "味噌ラーメンの硬めをください"
    console.log("Sending: '味噌ラーメンの硬めをください'...");
    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = '味噌ラーメンの硬めをください。';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(500);

    const goalsAfterStep1 = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.fzc-goal-item'));
      return items.map(el => ({
        text: el.textContent.trim(),
        isDone: el.classList.contains('is-done')
      }));
    });
    console.log('Goals after step 1:', goalsAfterStep1);

    // Now send msg satisfying g3: "ごちそうさまでした！"
    console.log("Sending: 'ごちそうさまでした！'...");
    const xpBeforeAllDone = await page.evaluate(() => {
      const appState = (typeof window.__getFiezelState === 'function') ? window.__getFiezelState() : (window.state || {});
      return appState.xp;
    });

    await page.evaluate(() => {
      const input = document.getElementById('fzcInput');
      input.value = 'ごちそうさまでした！美味しかったです。';
      document.getElementById('fzcBtnSend').click();
    });
    await page.waitForTimeout(500);

    const goalsAfterStep2 = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.fzc-goal-item'));
      const bonusTag = document.querySelector('.fzc-goal-bonus-tag')?.textContent?.trim() || null;
      return {
        goals: items.map(el => ({
          text: el.textContent.trim(),
          isDone: el.classList.contains('is-done')
        })),
        allDone: items.every(el => el.classList.contains('is-done')),
        bonusTag: bonusTag
      };
    });
    console.log('Goals after step 2 (All Goals Done):', goalsAfterStep2);

    const xpAfterAllDone = await page.evaluate(() => {
      const appState = (typeof window.__getFiezelState === 'function') ? window.__getFiezelState() : (window.state || {});
      return appState.xp;
    });
    console.log(`XP before completion: ${xpBeforeAllDone}, XP after completion: ${xpAfterAllDone} (Diff: ${xpAfterAllDone - xpBeforeAllDone})`);

    // Also check what evaluateGoalProgress does on 'intro', 'free', 'interview', 'hotel'
    const fallbackAudit = await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      // Test direct evaluation
      const scList = [
        { id: 'free', goals: [{ id: 'g1', text: 'Sapa' }, { id: 'g2', text: 'Hobi' }, { id: 'g3', text: 'Respon' }] },
        { id: 'intro', goals: [{ id: 'g1', text: 'Nama' }, { id: 'g2', text: 'Status' }, { id: 'g3', text: 'Salam' }] },
        { id: 'interview', goals: [{ id: 'g1', text: 'Name' }, { id: 'g2', text: 'Skill' }, { id: 'g3', text: 'Motivation' }] },
        { id: 'hotel', goals: [{ id: 'g1', text: 'Reserve' }, { id: 'g2', text: 'Wifi' }, { id: 'g3', text: 'Key' }] }
      ];

      // Provide 3 meaningless user messages: "halo", "tes", "123"
      const fakeMsgs = [
        { role: 'user', text: 'halo' },
        { role: 'user', text: 'tes' },
        { role: 'user', text: '123' }
      ];

      return scList.map(sc => {
        const res = chat.evaluateGoalProgress(sc, fakeMsgs);
        return {
          scenarioId: sc.id,
          allDoneWithRandomText: res.every(g => g.done)
        };
      });
    });
    console.log('Fallback goal audit for unhandled scenarios:', fallbackAudit);

    auditReport.test3_goals_reactivity_and_xp = {
      step1Reactive: goalsAfterStep1[0].isDone && goalsAfterStep1[1].isDone && !goalsAfterStep1[2].isDone,
      step2AllDone: goalsAfterStep2.allDone,
      bonusTagPresent: !!goalsAfterStep2.bonusTag,
      bonusXpAwarded: (xpAfterAllDone - xpBeforeAllDone) >= 25,
      actualXpDiff: xpAfterAllDone - xpBeforeAllDone,
      unhandledScenariosLoophole: fallbackAudit
    };

    // ─────────────────────────────────────────────────────────────
    // TEST 4: State Leaks across switches (isThinking, shadowingMsgId, isListening)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- AUDIT 4: State Leak & Race Condition Check ---');
    const stateLeakAudit = await page.evaluate(() => {
      const chat = window.FiezelInteractiveChat;
      const s = chat.getState();

      // Check if initScenario cleans state fields
      // Simulate isListening = true, shadowingMsgId = 'test-msg-1'
      s.isListening = true;
      s.shadowingMsgId = 'test-msg-1';

      // Call switch to 'direction'
      const dirChip = Array.from(document.querySelectorAll('.fzc-scenario-chip')).find(b => b.dataset.scenario === 'direction');
      if (dirChip) dirChip.click();

      const afterSwitch = chat.getState();
      return {
        shadowingMsgIdAfterSwitch: afterSwitch.shadowingMsgId,
        isListeningAfterSwitch: afterSwitch.isListening
      };
    });
    console.log('State leak audit results:', stateLeakAudit);

    auditReport.test4_state_leaks = stateLeakAudit;

    console.log('\n=============================================');
    console.log('FULL AUDIT REPORT:');
    console.log(JSON.stringify(auditReport, null, 2));
    console.log('=============================================');

    fs.writeFileSync(path.join(ROOT, 'tools', 'dev', 'scenario-audit-report.json'), JSON.stringify(auditReport, null, 2));

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
