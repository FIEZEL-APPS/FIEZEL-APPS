import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8195;
const ROOT = path.resolve(import.meta.dirname, '..', '..');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].replace(/^\/+/, '');
  if (!reqPath) reqPath = 'index.html';
  const filePath = path.join(ROOT, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[E2E] Server running on http://127.0.0.1:${PORT}`);
  const browser = await chromium.launch({ headless: true });

  const results = {
    t1_directMascotTap: false,
    t2_mochiTapCustomEvent: false,
    t3_proactiveGreeting: false,
    t4_deepContextAwareness: false,
    t5_zeroSpoilingLeakGuard: false,
    t6_examLockStrict: false
  };

  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      permissions: ['microphone']
    });

    await ctx.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ token: 'mock-token', user: { id: 'u1', name: 'Murid E2E' } }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Murid E2E', locale: 'id', course: 'ja' }));
      localStorage.setItem('fz_tour_done', 'true');
      localStorage.setItem('fiezel_lang_chosen', 'id');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fz_target_lang', 'ja');
      localStorage.setItem('fz_state_v1@ja', JSON.stringify({
        level: 2, jaLevel: 'N5', placementDone: true, view: 'home',
        gems: { balance: 100 },
        mochiIntroSeenCount: 2,
        ritualMeta: { lastDay: today }
      }));
      localStorage.setItem('fz_state_v1', JSON.stringify({
        level: 2, jaLevel: 'N5', placementDone: true, view: 'home',
        gems: { balance: 100 },
        mochiIntroSeenCount: 2,
        ritualMeta: { lastDay: today }
      }));
    });

    const page = await ctx.newPage();

    // Mock external analytics and cloudflare API
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.includes('google-analytics') || url.includes('clarity.ms')) {
        return route.abort();
      }
      if (url.includes('/api/voice/live-session')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            token: 'mock-live-token',
            model: 'models/gemini-3.8-live',
            endpoint: 'wss://generativelanguage.googleapis.com/ws/mock',
            keyIndex: 1
          })
        });
      }
      return route.continue();
    });

    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      document.querySelectorAll('#fiezelBootSplash, .ob-language-dialog, .fiezel-ob, .fiezel-splash, #fzRitual, .fz-tour').forEach(el => el.remove());
      document.documentElement.classList.remove('fz-booting');
      document.documentElement.classList.add('fz-app-open');
      if (typeof window.startQuickWinLesson === 'function') {
        window.startQuickWinLesson('ja');
      }
    });
    await page.waitForTimeout(600);

    // -------------------------------------------------------------
    // T3: Clean Entry Face (No text cover on Mochi) & Silence Prompt
    // -------------------------------------------------------------
    console.log('[TEST T3] Clean Entry Face (No text cover) & Silence Prompt...');
    const entryCheck = await page.evaluate(() => {
      const bubble = document.getElementById('fzMochiThoughtBubble');
      const isGreeting = bubble?.classList?.contains('is-greeting') || false;
      const S = window.FiezelMochiVoiceSos;
      const hasTrigger = typeof S?.triggerSilencePrompt === 'function';
      return { isGreeting, hasTrigger, cleanFace: !isGreeting };
    });
    console.log('  Clean Entry Result:', entryCheck);
    if (entryCheck.cleanFace && entryCheck.hasTrigger) {
      results.t3_proactiveGreeting = true;
      console.log('  ✓ T3 Clean Entry Face & Silence Prompt PASSED');
    }

    // -------------------------------------------------------------
    // T1: Direct Mascot Tap (Pointer capture on mascot element)
    // -------------------------------------------------------------
    console.log('[TEST T1] Direct Mascot Tap-to-Voice...');
    const t1Res = await page.evaluate(() => {
      const S = window.FiezelMochiVoiceSos;
      if (S.isCallActive()) S.closeCall('reset');

      const mascot = document.querySelector('.quiz-shell fiezel-mascot, .quiz-shell .fz-paw-slot, .quiz-shell .quiz-mascot, .quiz-shell .coach-strip-face.has-mascot');
      if (!mascot) return { foundMascot: false };

      const r = mascot.getBoundingClientRect();
      // Dispatch capture-phase pointerdown + pointerup
      const pDown = new PointerEvent('pointerdown', {
        clientX: r.x + r.width / 2,
        clientY: r.y + r.height / 2,
        pointerId: 1,
        bubbles: true
      });
      const pUp = new PointerEvent('pointerup', {
        clientX: r.x + r.width / 2,
        clientY: r.y + r.height / 2,
        pointerId: 1,
        bubbles: true
      });
      mascot.dispatchEvent(pDown);
      mascot.dispatchEvent(pUp);

      const isActive = S.isCallActive();
      const hasWave = !!document.getElementById('fzMochiVoiceUnder');
      const hasBounce = mascot.classList.contains('fz-mochi-tap-bounce') || !!mascot.closest('.fz-mochi-tap-bounce');

      return {
        foundMascot: true,
        isActive,
        hasWave,
        hasBounce
      };
    });
    console.log('  Direct Tap Result:', t1Res);
    if (t1Res.foundMascot && t1Res.isActive && t1Res.hasWave) {
      results.t1_directMascotTap = true;
      console.log('  ✓ T1 Direct Mascot Tap PASSED');
    }

    // Close call
    await page.evaluate(() => {
      window.FiezelMochiVoiceSos?.closeCall('test_close');
    });
    await page.waitForTimeout(600);

    // -------------------------------------------------------------
    // T2: mochi-tap CustomEvent from 3D canvas
    // -------------------------------------------------------------
    console.log('[TEST T2] mochi-tap CustomEvent from 3D Canvas...');
    const t2Res = await page.evaluate(() => {
      const S = window.FiezelMochiVoiceSos;
      const mascot = document.querySelector('fiezel-mascot, .fz-paw-slot, .quiz-stage, .quiz-mascot, .coach-strip-face.has-mascot') || document.body;

      // Dispatch mochi-tap
      mascot.dispatchEvent(new CustomEvent('mochi-tap', { bubbles: true }));
      const active1 = S.isCallActive();

      // Dispatch again within 450ms dedupe window -> should not toggle off
      mascot.dispatchEvent(new CustomEvent('mochi-tap', { bubbles: true }));
      const active2 = S.isCallActive();

      return { active1, active2 };
    });
    console.log('  mochi-tap CustomEvent Result:', t2Res);
    if (t2Res.active1 && t2Res.active2) {
      results.t2_mochiTapCustomEvent = true;
      console.log('  ✓ T2 mochi-tap CustomEvent & Deduplication PASSED');
    }

    await page.evaluate(() => {
      window.FiezelMochiVoiceSos?.closeCall('test_close');
    });

    // -------------------------------------------------------------
    // T4: Deep Quiz-Context Awareness
    // -------------------------------------------------------------
    console.log('[TEST T4] Deep Quiz-Context Awareness...');
    const t4Res = await page.evaluate(() => {
      const S = window.FiezelMochiVoiceSos;

      // 1. Grammar question with attempts
      const gQ = {
        id: 'g1',
        type: 'grammar',
        question: '猫は庭____寝ています。',
        options: ['に', 'で', 'へ', 'を'],
        answerIndex: 1,
        concept: 'Partikel で vs に',
        explain: { rule: 'Gunakan で untuk tempat aktivitas.', why: 'Tidur adalah aktivitas.' }
      };
      S.setActiveQuestion(gQ, { cfgType: 'grammar', level: 'N5', targetLang: 'ja', asked: 2, planned: 10 });
      S.noteAttempt(gQ, 0, false, { firstTry: true }); // Murid pilih "に" dan salah

      const gPrompt = S.__debugPrompt();

      // 2. Listening question with transcript
      const lQ = {
        id: 'l1',
        type: 'listening',
        question: '二人はどこへ行きますか。',
        options: ['図書館', '駅', 'カフェ'],
        answerIndex: 2,
        script: '男：図書館へ行く？ 女：ううん、先にカフェでコーヒーを飲もう。',
        scenario: 'Percakapan di jalan'
      };
      S.setActiveQuestion(lQ, { cfgType: 'listening', level: 'N5', targetLang: 'ja' });
      const lPrompt = S.__debugPrompt();

      // 3. Reading question with passage
      const rQ = {
        id: 'r1',
        type: 'reading',
        question: '田中さんの趣味は何ですか。',
        options: ['読書', '料理', '水泳'],
        passage: { title: '田中さんの休日', text: '田中さんは週末によく料理を作ります。' }
      };
      S.setActiveQuestion(rQ, { cfgType: 'reading', level: 'N5', targetLang: 'ja' });
      const rPrompt = S.__debugPrompt();

      return {
        gHasRule: gPrompt.includes('tempat aktivitas'),
        gHasAttempt: gPrompt.includes('SALAH'),
        lHasScript: lPrompt.includes('先にカフェでコーヒー'),
        lHasScenario: lPrompt.includes('Percakapan di jalan'),
        rHasPassage: rPrompt.includes('田中さんは週末によく料理')
      };
    });
    console.log('  Deep Context Result:', t4Res);
    if (t4Res.gHasRule && t4Res.gHasAttempt && t4Res.lHasScript && t4Res.rHasPassage) {
      results.t4_deepContextAwareness = true;
      console.log('  ✓ T4 Deep Context Awareness PASSED');
    }

    // -------------------------------------------------------------
    // T5: Zero-Spoiling Runtime Leak Guard
    // -------------------------------------------------------------
    console.log('[TEST T5] Zero-Spoiling Runtime Leak Guard...');
    const t5Res = await page.evaluate(() => {
      const S = window.FiezelMochiVoiceSos;
      const testQ = {
        type: 'grammar',
        question: 'テスト問題',
        options: ['opsiA', 'opsiB', 'opsiC'],
        answerIndex: 1
      };
      S.setActiveQuestion(testQ, {});

      let sentMessages = [];
      const fakeWs = {
        readyState: 1,
        send: (msg) => sentMessages.push(msg),
        close: () => {}
      };
      S.__injectWsForTest(fakeWs);

      // Model attempts to leak answer letter "jawabannya B"
      S._handleLiveWsMessage({
        data: JSON.stringify({
          serverContent: {
            outputTranscription: { text: 'Jawabannya B ya! Pilih opsi B!' }
          }
        })
      }, testQ);

      const leakIntercepted = sentMessages.some(m => m.includes('SISTEM FIEZEL') && m.includes('DILARANG'));

      return { leakIntercepted, sentCount: sentMessages.length };
    });
    console.log('  Leak Guard Result:', t5Res);
    if (t5Res.leakIntercepted) {
      results.t5_zeroSpoilingLeakGuard = true;
      console.log('  ✓ T5 Zero-Spoiling Runtime Leak Guard PASSED');
    }

    // -------------------------------------------------------------
    // T6: Anti-Leak Exam Invariant
    // -------------------------------------------------------------
    console.log('[TEST T6] Anti-Leak Exam Invariant (Placement / Measure Lock)...');
    const t6Res = await page.evaluate(() => {
      const S = window.FiezelMochiVoiceSos;

      // 1. Placement session
      const startPlacement = S.onQuizSessionStart({ type: 'placement', placement: true });
      const placementCanCall = S.canCall({ isPlacement: true });

      // 2. Measure mode
      const startMeasure = S.onQuizSessionStart({ type: 'level-exam', measure: true });
      const measureCanCall = S.canCall({ measureMode: true });

      // 3. Exam lock active
      window.examLockActive = () => true;
      const coreLockCanCall = S.canCall();
      window.examLockActive = () => false;

      return {
        placementLocked: startPlacement === false && placementCanCall.allowed === false,
        measureLocked: startMeasure === false && measureCanCall.allowed === false,
        coreLocked: coreLockCanCall.allowed === false
      };
    });
    console.log('  Exam Lock Result:', t6Res);
    if (t6Res.placementLocked && t6Res.measureLocked && t6Res.coreLocked) {
      results.t6_examLockStrict = true;
      console.log('  ✓ T6 Anti-Leak Exam Invariant PASSED');
    }

    console.log('\n================ E2E AUDIT RESULTS ================');
    console.log(JSON.stringify(results, null, 2));

    const allPassed = Object.values(results).every(Boolean);
    if (!allPassed) {
      console.error('One or more E2E tests failed!');
      process.exit(1);
    }
    console.log('\n>>> ALL 6 E2E AUDIT CHECKS PASSED EMPIRICALLY! <<<');

    await browser.close();
    server.close();
  } catch (err) {
    console.error('E2E execution error:', err);
    await browser.close();
    server.close();
    process.exit(1);
  }
});
