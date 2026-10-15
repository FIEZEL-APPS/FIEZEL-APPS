const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm'
};

function startServer() {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, rel);
    if (!target.startsWith(root)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found: ' + rel);
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function runProbe() {
  console.log('=== STARTING EMPIRICAL BRAINCORE & TELEMETRY LISTENING AUDIT PROBE ===');
  const { server, port } = await startServer();
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const findings = {
    jlpt: {},
    skillsLab: {},
    inQuiz: {},
    telemetry: {},
    bankIntegrity: {}
  };

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Setup initial clean state & dismiss overlays
    await page.evaluate(() => {
      try {
        const splash = document.getElementById('bootSplash');
        if (splash) splash.remove();
        document.documentElement.classList.remove('fz-booting');
        window.__fiezelBootSplashDismissed = true;
        localStorage.setItem('fiezel_auth_user', JSON.stringify({ name: 'Murid Audit', email: 'audit@fiezel.com' }));
        document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .fz-tour-card, #fzTourCard, .fz-tour-backdrop, [data-testid="auth-screen"]').forEach(el => el.remove());
      } catch (_) {}
    });
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // TEST 1: JLPT CHOKAI EMPIRICAL PROBE
    // -------------------------------------------------------------
    console.log('[PROBE 1] Testing JLPT Chokai Engine...');
    const stateBeforeJlpt = await page.evaluate(() => {
      const s = window.__getFiezelState ? window.__getFiezelState() : null;
      return {
        historyLength: s?.history?.length || 0,
        listeningMasteryCount: s?.listening ? Object.keys(s.listening).length : 0,
        bktRaw: localStorage.getItem('fiezel-mastery-bkt-v1'),
        slStateRaw: localStorage.getItem('fiezel-sl-v1-state')
      };
    });

    // Open JLPT listening panel
    await page.evaluate(() => {
      if (window.FiezelJlptListening && window.FiezelJlptListening.open) {
        window.FiezelJlptListening.open();
      } else if (window.openListeningPanel) {
        window.openListeningPanel();
      }
    });

    await page.waitForSelector('#listeningQuestionSlot .jlpt-mobile-card', { timeout: 8000 });

    // Test: Can options be clicked BEFORE audio is played?
    const audioPlayedBeforeClick = await page.evaluate(() => {
      const playBtn = document.getElementById('jlptMainPlayBtn');
      const optBtn = document.querySelector('.jlpt-opt-btn');
      return {
        playBtnText: playBtn ? playBtn.textContent.trim() : null,
        optDisabled: optBtn ? optBtn.disabled : null,
        optHasLockedClass: optBtn ? optBtn.classList.contains('locked') : null
      };
    });
    findings.jlpt.preAudioClickable = !audioPlayedBeforeClick.optDisabled && !audioPlayedBeforeClick.optHasLockedClass;

    // Test: Check if Indonesian translation leaks on card
    const translationLeaksOnCard = await page.evaluate(() => {
      const idTexts = Array.from(document.querySelectorAll('.jlpt-opt-id')).map(el => el.textContent.trim());
      const questionId = document.querySelector('.jlpt-question-id')?.textContent.trim();
      return {
        questionIndonesian: questionId,
        optionTranslations: idTexts
      };
    });
    findings.jlpt.translationLeaksOnCard = translationLeaksOnCard;

    // Test: Check if answer key leaks in detail sheet BEFORE answering
    const sheetLeakBeforeAnswer = await page.evaluate(() => {
      if (window.FiezelJlptListening && window.FiezelJlptListening.openSheet) {
        window.FiezelJlptListening.openSheet('explain');
      } else if (window.openJlptDetailSheet) {
        window.openJlptDetailSheet('explain');
      }
      const explainPane = document.getElementById('paneExplain');
      const keyChoice = explainPane?.querySelector('.jlpt-key-choice')?.textContent.trim();
      const explainDesc = explainPane?.querySelector('.jlpt-explain-desc')?.textContent.trim();
      const statusBadge = explainPane?.querySelector('.jlpt-status-badge')?.textContent.trim();
      return {
        paneVisible: explainPane ? explainPane.style.display !== 'none' : false,
        keyChoice: keyChoice || null,
        explainDesc: explainDesc || null,
        statusBadge: statusBadge || null
      };
    });
    findings.jlpt.sheetLeakBeforeAnswer = sheetLeakBeforeAnswer;

    // Close detail sheet
    await page.evaluate(() => {
      if (window.closeJlptDetailSheet) window.closeJlptDetailSheet();
    });
    await page.waitForTimeout(300);

    // Answer choice 2 (wrong answer)
    await page.evaluate(() => {
      const btn = document.querySelector('.jlpt-opt-btn[data-opt-id="2"]');
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);

    // Inspect feedback banner
    const feedbackBanner = await page.evaluate(() => {
      const banner = document.getElementById('jlptFeedbackSlot')?.innerHTML;
      const title = document.querySelector('.jlpt-fb-title')?.textContent.trim();
      const sub = document.querySelector('.jlpt-fb-sub')?.textContent.trim();
      return { title, sub, html: banner };
    });
    findings.jlpt.feedbackBanner = feedbackBanner;

    // Read state after JLPT answer
    const stateAfterJlpt = await page.evaluate(() => {
      const s = window.__getFiezelState ? window.__getFiezelState() : null;
      return {
        historyLength: s?.history?.length || 0,
        listeningMasteryCount: s?.listening ? Object.keys(s.listening).length : 0,
        bktRaw: localStorage.getItem('fiezel-mastery-bkt-v1'),
        slStateRaw: localStorage.getItem('fiezel-sl-v1-state'),
        lastHistoryItem: s?.history ? s.history[s.history.length - 1] : null
      };
    });

    findings.jlpt.stateSync = {
      historyDelta: stateAfterJlpt.historyLength - stateBeforeJlpt.historyLength,
      listeningMasteryDelta: stateAfterJlpt.listeningMasteryCount - stateBeforeJlpt.listeningMasteryCount,
      bktChanged: stateAfterJlpt.bktRaw !== stateBeforeJlpt.bktRaw,
      persistedToStorage: false
    };

    // Close panel
    await page.evaluate(() => {
      if (window.closeListeningPanel) window.closeListeningPanel();
    });
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // TEST 2: SKILLS LAB LISTENING PROBE
    // -------------------------------------------------------------
    console.log('[PROBE 2] Testing Skills Lab Listening...');
    try {
      const slMount = await page.evaluate(async () => {
        const s = window.__getFiezelState ? window.__getFiezelState() : null;
        if (s) s.view = 'listening';
        if (typeof window.skillsLab === 'function') {
          await window.skillsLab('listening');
        }
        return {
          view: s?.view,
          addonExists: !!window.FiezelSLAddon,
          controllerExists: !!window.speakingListeningController
        };
      });

      findings.skillsLab.mount = slMount;
      await page.waitForTimeout(600);

      const slUI = await page.evaluate(() => {
        const card = document.querySelector('.fsl-card-listening');
        const work = document.querySelector('.fsl-card-listening [data-work]');
        const play = document.querySelector('.fsl-card-listening [data-play]');
        const gemBar = document.querySelector('.fsl-gem-bar');
        const translateToggle = document.querySelector('#fslTranslateToggle');
        return {
          cardPresent: !!card,
          workDisabledBeforeAudio: work ? work.disabled : null,
          playButtonPresent: !!play,
          hasGemBar: !!gemBar,
          hasTranslateToggle: !!translateToggle
        };
      });
      findings.skillsLab.ui = slUI;

      // Check how controller finishItem records:
      const slFinishItemCheck = await page.evaluate(() => {
        const ctrl = window.speakingListeningController;
        if (!ctrl) return { error: 'no_controller' };
        const testItem = { id: 'test_sl_probe', level: 'A1', mode: 'choice', script: 'Hello world' };
        const testResult = { passed: false, score: 0, metric: 'exact' };
        const sBefore = window.__getFiezelState ? window.__getFiezelState() : null;
        const histBefore = sBefore?.history?.length || 0;
        const slEventsBefore = (ctrl.store?.state?.events || []).length;

        // Finish item via controller
        ctrl.finishItem(testItem, testResult);

        const sAfter = window.__getFiezelState ? window.__getFiezelState() : null;
        const histAfter = sAfter?.history?.length || 0;
        const slEventsAfter = (ctrl.store?.state?.events || []).length;

        return {
          canonicalHistoryDelta: histAfter - histBefore,
          slSidecarEventsDelta: slEventsAfter - slEventsBefore,
          persistedStorageKey: ctrl.config?.storageKey
        };
      });
      findings.skillsLab.finishItemBehavior = slFinishItemCheck;
    } catch (err) {
      findings.skillsLab.error = err.message;
    }

    // -------------------------------------------------------------
    // TEST 3: IN-QUIZ LISTENING & BRAINCORE HOOKS EVALUATION
    // -------------------------------------------------------------
    console.log('[PROBE 3] Testing In-Quiz Listening & Braincore...');
    const inQuizHooks = await page.evaluate(() => {
      const audit = window.__fiezelAudit || {};
      const s = window.__getFiezelState ? window.__getFiezelState() : null;

      // 1. Listening Adaptive Policy evaluation
      const M = window.FiezelListeningAdaptive;
      const adaptiveResult = M && typeof M.policy === 'function' ? M.policy({
        mastery: 85,
        replayHistory: [{ replays: 0, correct: true }, { replays: 1, correct: true }, { replays: 0, correct: true }]
      }) : null;

      // 2. buildAdaptivePool check
      let adaptivePoolHasListening = false;
      let poolTypes = [];
      try {
        if (typeof audit.buildAdaptivePool === 'function') {
          const pool = audit.buildAdaptivePool(12);
          adaptivePoolHasListening = pool.some(q => q && q.type === 'listening');
          poolTypes = Array.from(new Set(pool.map(q => q?.type)));
        }
      } catch (_) {}

      // 3. record() behavior for listening
      const testQuestion = {
        id: 'test-listening-probe-01',
        type: 'listening',
        level: 'A2',
        skill: 'listening_detail',
        question: 'What is the speaker doing?',
        options: ['Walking', 'Running', 'Sleeping', 'Eating'],
        answerIndex: 1,
        __replayCount: 2,
        __plays: 3
      };

      const histLenBefore = s?.history?.length || 0;
      if (typeof audit.record === 'function') {
        audit.record(testQuestion, true, 4200, 1);
      }
      const recorded = s?.history ? s.history[s.history.length - 1] : null;

      // 4. Check if bktRecord was called for listening
      const bktState = localStorage.getItem('fiezel-mastery-bkt-v1');

      // 5. Check CoreBrain memory
      const coreBrainMem = typeof audit.coreBrainMemory === 'function' ? audit.coreBrainMemory() : [];
      const coreBrainDomains = Array.from(new Set(coreBrainMem.map(m => m.domain)));

      return {
        listeningAdaptivePolicyAvailable: !!(M && typeof M.policy === 'function'),
        adaptiveSampleOutput: adaptiveResult,
        adaptivePoolTypes: poolTypes,
        adaptivePoolHasListening,
        recordedAttempt: {
          type: recorded?.type,
          replayCount: recorded?.replayCount,
          kappa: recorded?.kappa,
          target: recorded?.target,
          reviewBucket: recorded?.reviewBucket,
          reviewKey: recorded?.reviewKey
        },
        bktHasListening: bktState ? bktState.includes('listening_detail') : false,
        coreBrainMemoryDomains: coreBrainDomains
      };
    });
    findings.inQuiz = inQuizHooks;

    // -------------------------------------------------------------
    // TEST 4: TELEMETRY & OFFLINE QUEUE EVALUATION
    // -------------------------------------------------------------
    console.log('[PROBE 4] Testing Telemetry & Offline Queue...');
    const telemetryEval = await page.evaluate(async () => {
      const E = window.FiezelLearningEvents;
      const Q = window.FiezelLearningQueue;

      const domains = E ? E.DOMAINS : null;
      const testEventListening = E ? E.buildEvent('answer_outcome', {
        domain: 'listening',
        lessonId: 'listening_01',
        itemId: 'listen_a1_01',
        mode: 'recognize_detail',
        correct: true,
        responseTimeBucket: '2-5s'
      }, { studyDay: 1 }) : null;

      const testEventGrammar = E ? E.buildEvent('answer_outcome', {
        domain: 'grammar',
        lessonId: 'present_simple',
        itemId: 'present_simple:apply_form',
        mode: 'apply_form',
        correct: true,
        responseTimeBucket: '2-5s'
      }, { studyDay: 1 }) : null;

      return {
        eventsModuleAvailable: !!E,
        queueModuleAvailable: !!Q,
        supportedDomains: domains ? Array.from(domains) : [],
        listeningEventRejected: testEventListening ? testEventListening.ok === false : true,
        listeningRejectionReason: testEventListening?.reason || null,
        grammarEventAccepted: testEventGrammar ? testEventGrammar.ok === true : false
      };
    });
    findings.telemetry = telemetryEval;

    // -------------------------------------------------------------
    // TEST 5: BANK INTEGRITY EVALUATION
    // -------------------------------------------------------------
    console.log('[PROBE 5] Evaluating Bank Integrity...');
    const banks = {
      listeningBank: require('../features/speaking-listening/listening-bank-v1.json'),
      jlptBank: require('../features/speaking-listening/jlpt-listening-bank-v1.json'),
      listeningExam: require('../features/speaking-listening/listening-exam-v1.json')
    };

    // JLPT Bank Analysis
    const jlptAnsDist = [0, 0, 0, 0];
    const jlptMondaiDist = {};
    banks.jlptBank.items.forEach(q => {
      const idx = q.answerIndex !== undefined ? q.answerIndex : (q.correct_answer - 1);
      if (idx >= 0 && idx < 4) jlptAnsDist[idx]++;
      const m = q.mondai || 'unknown';
      jlptMondaiDist[m] = jlptMondaiDist[m] || { total: 0, ansDist: [0, 0, 0, 0], optsCounts: new Set() };
      jlptMondaiDist[m].total++;
      if (idx >= 0 && idx < 4) jlptMondaiDist[m].ansDist[idx]++;
      jlptMondaiDist[m].optsCounts.add(q.options?.length);
    });

    Object.keys(jlptMondaiDist).forEach(k => {
      jlptMondaiDist[k].optsCounts = Array.from(jlptMondaiDist[k].optsCounts);
    });

    findings.bankIntegrity.jlpt = {
      count: banks.jlptBank.items.length,
      answerIndexDistribution: {
        'Index 0 (Pilihan 1)': jlptAnsDist[0],
        'Index 1 (Pilihan 2)': jlptAnsDist[1],
        'Index 2 (Pilihan 3)': jlptAnsDist[2],
        'Index 3 (Pilihan 4)': jlptAnsDist[3]
      },
      mondaiBreakdown: jlptMondaiDist
    };

    // Listening Bank (Skills Lab) Analysis
    const slAnsDist = {};
    const slModes = {};
    banks.listeningBank.items.forEach(q => {
      slAnsDist[q.answerIndex] = (slAnsDist[q.answerIndex] || 0) + 1;
      slModes[q.mode] = (slModes[q.mode] || 0) + 1;
    });

    findings.bankIntegrity.skillsLab = {
      count: banks.listeningBank.items.length,
      answerIndexDistribution: slAnsDist,
      modeDistribution: slModes
    };

    // Listening Exam Analysis
    const examAnsDist = {};
    let examQCount = 0;
    banks.listeningExam.sets.forEach(s => {
      (s.questions || []).forEach(q => {
        examQCount++;
        examAnsDist[q.answerIndex] = (examAnsDist[q.answerIndex] || 0) + 1;
      });
    });

    findings.bankIntegrity.exam = {
      setsCount: banks.listeningExam.sets.length,
      totalQuestions: examQCount,
      answerIndexDistribution: examAnsDist
    };

  } catch (err) {
    console.error('Probe execution error:', err);
    findings.error = err.message;
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n=== EMPIRICAL PROBE RESULTS ===');
  console.log(JSON.stringify(findings, null, 2));

  fs.writeFileSync(path.join(root, 'tests/listening-braincore-audit-results.json'), JSON.stringify(findings, null, 2));
  console.log('Results saved to tests/listening-braincore-audit-results.json');
}

runProbe();
