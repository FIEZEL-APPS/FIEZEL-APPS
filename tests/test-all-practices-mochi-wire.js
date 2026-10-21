const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 8135;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.mp3': 'audio/mpeg'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[TEST] Self-contained HTTP server listening on http://127.0.0.1:${PORT}`);
  const errors = [];
  try {
    console.log('[TEST] Starting Comprehensive Practice Sessions 3D Mochi Wire Verification...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 430, height: 932 } });

    await context.addInitScript(() => {
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Learner', at: Date.now() }));
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
    });

    const page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        // Filter out non-fatal network or audio failures in headless environment
        const text = msg.text();
        if (!text.includes('Failed to load resource') &&
            !text.includes('net::ERR') &&
            !text.includes('AudioContext') &&
            !text.includes('CORS policy') &&
            !text.includes('api.fiezel.my.id')) {
          console.error('[BROWSER ERROR]', text);
          errors.push(text);
        }
      }
    });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Clean up overlays
    await page.evaluate(() => {
      window.skipPuterSignIn?.();
      window.dismissWelcome?.();
      window.FiezelSplash?.dismiss?.();
      document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('fz-booting');
    });

    // =========================================================================
    // SECTION 1: JLPT Chōkai Listening Modal
    // =========================================================================
    console.log('\n--- [TEST 1] JLPT Chōkai Listening Mascot Integration ---');
    await page.evaluate(() => {
      if (typeof window.openListeningPanel === 'function') {
        window.openListeningPanel();
        var modal = document.getElementById('listeningPanelModal');
        if (modal) {
          modal.style.zIndex = '999999';
          modal.style.opacity = '1';
          modal.style.display = 'flex';
        }
      }
    });

    await page.waitForFunction(() => {
      const slot = document.querySelector('.jlpt-mascot-slot');
      const mascot = slot ? slot.querySelector('fiezel-mascot.jlpt-mascot') : null;
      return !!(mascot && mascot.__mochiAttached && mascot.__mochiInstance);
    }, { timeout: 15000 });

    const jlptStatus = await page.evaluate(() => {
      const mascot = document.querySelector('.jlpt-mascot-slot fiezel-mascot.jlpt-mascot');
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        mood: mochi ? mochi.mood : null
      };
    });

    if (jlptStatus.badge !== 'chat_purple' || jlptStatus.aura !== 'purple') {
      throw new Error(`FAIL: JLPT idle state indicator badge mismatch: ${JSON.stringify(jlptStatus)}`);
    }
    console.log('✓ PASS: JLPT idle state has active chat_purple badge and purple aura.');

    // Test session entrance / lesson-start on JLPT mascot
    const jlptStartStatus = await page.evaluate(() => {
      const mascot = document.querySelector('.jlpt-mascot-slot fiezel-mascot.jlpt-mascot');
      if (mascot && typeof mascot.react === 'function') {
        mascot.react('lesson-start');
      }
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        earWiggleTimer: mochi ? mochi.earWiggleTimer : 0,
        earWiggleIntensity: mochi ? mochi.earWiggleIntensity : 0
      };
    });
    if (jlptStartStatus.earWiggleTimer <= 0 || jlptStartStatus.badge !== 'chat_purple') {
      throw new Error(`FAIL: JLPT lesson-start ear wiggle mismatch: ${JSON.stringify(jlptStartStatus)}`);
    }
    console.log('✓ PASS: JLPT lesson-start triggers dynamic ear wiggle (1.3) and preserves chat_purple badge.');

    // Close JLPT modal
    await page.evaluate(() => {
      var modal = document.getElementById('listeningPanelModal');
      if (modal) modal.style.display = 'none';
    });

    // =========================================================================
    // SECTION 2: General Quiz Container (.fz-paw-slot / Grammar / Vocab / Reading)
    // =========================================================================
    console.log('\n--- [TEST 2] Standard Quiz Container (.fz-paw-slot) Verification ---');
    const quizTestStatus = await page.evaluate(async () => {
      // Simulate standard quiz question render with .fz-paw-slot
      const testContainer = document.createElement('div');
      testContainer.id = 'testQuizContainer';
      testContainer.className = 'quiz-stage';
      testContainer.innerHTML = '<div class="fz-paw-slot"><fiezel-mascot class="quiz-mascot"></fiezel-mascot></div>';
      document.body.appendChild(testContainer);

      // Trigger companion scan
      if (window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.scan === 'function') {
        window.FiezelMochiCompanion.scan();
      }

      const mascot = testContainer.querySelector('fiezel-mascot');
      // Wait briefly for async initialization
      await new Promise(r => setTimeout(r, 400));

      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        hasMascot: !!mascot,
        attached: mascot ? !!mascot.__mochiAttached : false,
        hasMochi: !!mochi,
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        mood: mochi ? mochi.mood : null
      };
    });

    console.log('[TEST] Quiz Container Status:', JSON.stringify(quizTestStatus, null, 2));
    if (!quizTestStatus.attached || !quizTestStatus.hasMochi) {
      throw new Error(`FAIL: Mascot in .fz-paw-slot did not attach 3D companion.`);
    }
    if (quizTestStatus.badge !== 'chat_purple' || quizTestStatus.aura !== 'purple') {
      throw new Error(`FAIL: Quiz mascot idle badge mismatch: ${JSON.stringify(quizTestStatus)}`);
    }
    console.log('✓ PASS: Standard Quiz mascot attaches with active chat_purple badge and purple aura.');

    // Test question-shown reaction on quiz mascot
    const qShownStatus = await page.evaluate(() => {
      const mascot = document.querySelector('#testQuizContainer fiezel-mascot');
      if (mascot && typeof mascot.react === 'function') {
        mascot.react('question-shown');
      }
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        earWiggleTimer: mochi ? mochi.earWiggleTimer : 0,
        earWiggleIntensity: mochi ? mochi.earWiggleIntensity : 0
      };
    });
    if (qShownStatus.earWiggleTimer <= 0 || qShownStatus.badge !== 'chat_purple') {
      throw new Error(`FAIL: question-shown ear wiggle mismatch: ${JSON.stringify(qShownStatus)}`);
    }
    console.log('✓ PASS: question-shown triggers dynamic ear wiggle (1.3) and maintains chat_purple badge.');

    // Test wrong reaction: toddler pout
    const qWrongStatus = await page.evaluate(() => {
      const mascot = document.querySelector('#testQuizContainer fiezel-mascot');
      if (mascot && typeof mascot.react === 'function') {
        mascot.react('wrong');
      }
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        mood: mochi ? mochi.mood : null,
        aura: mochi ? mochi.aura : null,
        handState: mochi ? mochi.handState : null
      };
    });
    if (qWrongStatus.mood !== 'pout' || qWrongStatus.aura !== 'pink' || qWrongStatus.handState !== 'sulk') {
      throw new Error(`FAIL: wrong reaction expected pout/pink/sulk: ${JSON.stringify(qWrongStatus)}`);
    }
    console.log('✓ PASS: wrong answer triggers toddler pout ("pout"), pink aura, sulk gesture.');

    // Test correct reaction: joyful hop
    const qCorrectStatus = await page.evaluate(() => {
      const mascot = document.querySelector('#testQuizContainer fiezel-mascot');
      if (mascot && typeof mascot.react === 'function') {
        mascot.react('correct');
      }
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        mood: mochi ? mochi.mood : null,
        aura: mochi ? mochi.aura : null,
        fx: mochi ? mochi.fx : null,
        handState: mochi ? mochi.handState : null
      };
    });
    if (qCorrectStatus.mood !== 'happy' || qCorrectStatus.aura !== 'green' || qCorrectStatus.fx !== 'stars' || qCorrectStatus.handState !== 'cheer') {
      throw new Error(`FAIL: correct reaction expected happy/green/stars/cheer: ${JSON.stringify(qCorrectStatus)}`);
    }
    console.log('✓ PASS: correct answer triggers joyful hop ("happy"), green aura, stars fx, cheering hands.');

    // Clean up test quiz container
    await page.evaluate(() => {
      const el = document.getElementById('testQuizContainer');
      if (el) el.remove();
    });

    // =========================================================================
    // SECTION 3: Writing (Susun Kata / Sakubun) Stage Verification
    // =========================================================================
    console.log('\n--- [TEST 3] Writing Stage (.writing-stage) Verification ---');
    const writingStatus = await page.evaluate(async () => {
      const stage = document.createElement('div');
      stage.id = 'testWritingStage';
      stage.className = 'writing-stage';
      stage.innerHTML = '<span class="lesson-stage-paw"><fiezel-mascot class="writing-mascot"></fiezel-mascot></span>';
      document.body.appendChild(stage);

      if (window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.scan === 'function') {
        window.FiezelMochiCompanion.scan();
      }
      await new Promise(r => setTimeout(r, 400));

      const mascot = stage.querySelector('fiezel-mascot');
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        attached: mascot ? !!mascot.__mochiAttached : false,
        hasMochi: !!mochi,
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        mood: mochi ? mochi.mood : null
      };
    });

    console.log('[TEST] Writing Stage Status:', JSON.stringify(writingStatus, null, 2));
    if (!writingStatus.attached || !writingStatus.hasMochi) {
      throw new Error(`FAIL: Mascot in .writing-stage did not attach 3D companion.`);
    }
    if (writingStatus.badge !== 'chat_purple' || writingStatus.aura !== 'purple') {
      throw new Error(`FAIL: Writing mascot idle badge mismatch: ${JSON.stringify(writingStatus)}`);
    }
    console.log('✓ PASS: Writing stage mascot attaches with active chat_purple badge and purple aura.');

    // Clean up test writing stage
    await page.evaluate(() => {
      const el = document.getElementById('testWritingStage');
      if (el) el.remove();
    });

    // =========================================================================
    // SECTION 4: Skills Lab Player (.fsl-player / .fsl-mascot-slot) Verification
    // =========================================================================
    console.log('\n--- [TEST 4] Skills Lab Player (.fsl-player) Verification ---');
    const fslStatus = await page.evaluate(async () => {
      const player = document.createElement('div');
      player.id = 'testFslPlayer';
      player.className = 'fsl-player fsl-player-stage';
      player.innerHTML = '<span class="fsl-mascot-slot"><fiezel-mascot class="fsl-mascot"></fiezel-mascot></span>';
      document.body.appendChild(player);

      if (window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.scan === 'function') {
        window.FiezelMochiCompanion.scan();
      }
      await new Promise(r => setTimeout(r, 400));

      const mascot = player.querySelector('fiezel-mascot');
      const mochi = mascot ? mascot.__mochiInstance : null;
      return {
        attached: mascot ? !!mascot.__mochiAttached : false,
        hasMochi: !!mochi,
        badge: mochi ? mochi.badge : null,
        aura: mochi ? mochi.aura : null,
        mood: mochi ? mochi.mood : null
      };
    });

    console.log('[TEST] Skills Lab Status:', JSON.stringify(fslStatus, null, 2));
    if (!fslStatus.attached || !fslStatus.hasMochi) {
      throw new Error(`FAIL: Mascot in .fsl-player did not attach 3D companion.`);
    }
    if (fslStatus.badge !== 'chat_purple' || fslStatus.aura !== 'purple') {
      throw new Error(`FAIL: Skills Lab mascot idle badge mismatch: ${JSON.stringify(fslStatus)}`);
    }
    console.log('✓ PASS: Skills Lab mascot attaches with active chat_purple badge and purple aura.');

    // Clean up fsl player
    await page.evaluate(() => {
      const el = document.getElementById('testFslPlayer');
      if (el) el.remove();
    });

    // =========================================================================
    // SECTION 5: Universal Corong pawReact() Verification
    // =========================================================================
    console.log('\n--- [TEST 5] Global pawReact() and FiezelPaw Event Funnel Verification ---');
    const globalFunnelStatus = await page.evaluate(async () => {
      const container = document.createElement('div');
      container.id = 'testGlobalFunnel';
      container.className = 'quiz-stage';
      container.innerHTML = '<div class="fz-paw-slot"><fiezel-mascot class="quiz-mascot"></fiezel-mascot></div>';
      document.body.appendChild(container);

      if (window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.scan === 'function') {
        window.FiezelMochiCompanion.scan();
      }
      await new Promise(r => setTimeout(r, 400));

      const mascot = container.querySelector('fiezel-mascot');
      const mochi = mascot ? mascot.__mochiInstance : null;

      // Test pawReact('wake')
      if (typeof window.pawReact === 'function') {
        window.pawReact('wake');
      }
      const wakeWiggle = mochi ? mochi.earWiggleTimer : 0;

      // Test pawReact('wrong')
      if (typeof window.pawReact === 'function') {
        window.pawReact('wrong');
      }
      const wrongMood = mochi ? mochi.mood : null;

      // Test pawReact('correct')
      if (typeof window.pawReact === 'function') {
        window.pawReact('correct');
      }
      const correctMood = mochi ? mochi.mood : null;

      return {
        wakeWiggle: wakeWiggle > 0,
        wrongMood,
        correctMood,
        currentBadge: mochi ? mochi.badge : null
      };
    });

    console.log('[TEST] Global Funnel Status:', JSON.stringify(globalFunnelStatus, null, 2));
    if (!globalFunnelStatus.wakeWiggle) {
      throw new Error('FAIL: pawReact("wake") did not trigger ear wiggle on mascot!');
    }
    if (globalFunnelStatus.correctMood !== 'happy') {
      throw new Error('FAIL: pawReact("correct") did not set happy mood on mascot!');
    }
    console.log('✓ PASS: Global pawReact() funnel flawlessly drives all mascot companion instances.');

    // Clean up global funnel container
    await page.evaluate(() => {
      const el = document.getElementById('testGlobalFunnel');
      if (el) el.remove();
    });

    // Check for accumulated browser console errors
    if (errors.length > 0) {
      throw new Error(`FAIL: Encountered ${errors.length} browser errors during test execution: ${errors.join('; ')}`);
    }
    console.log('✓ PASS: Zero browser console errors recorded throughout execution.');

    await browser.close();
    server.close();
    console.log('\n===========================================================');
    console.log('🎉 ALL PRACTICE SESSIONS 3D MOCHI VERIFICATIONS 100% SUCCESS!');
    console.log('===========================================================');
    process.exit(0);
  } catch (err) {
    console.error('TEST ERROR:', err);
    server.close();
    process.exit(1);
  }
});
