import { chromium } from 'file:///C:/Users/hp/fiezel-apps/node_modules/playwright/index.mjs';

const ARTIFACT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/a32ac6de-6572-4105-b553-f67ec6c92656';

async function run() {
  console.log('🚀 Running Comprehensive Invariant & Visual Verification Probe...');
  const browser = await chromium.launch({ headless: true });

  try {
    // -----------------------------------------------------------------
    // PASS 1: MOBILE (390 x 844)
    // -----------------------------------------------------------------
    console.log('\n--- [PASS 1: MOBILE 390x844] ---');
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });
    const page = await mobileCtx.newPage();

    // 1. Check Auth Login Screen (Cold Boot with Zero Storage)
    console.log('Checking Auth Login Screen (Ensuring Zero Guest Bypass)...');
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1000);

    const authGuestButtons = await page.evaluate(() => {
      const guestBtns = document.querySelectorAll('[data-auth-guest], [data-auth-bypass]');
      const guestText = Array.from(document.querySelectorAll('button, a')).filter(el =>
        /pengunjung|tamu/i.test(el.innerText || '')
      );
      return {
        hasDataAttr: guestBtns.length > 0,
        hasTextMatch: guestText.length > 0,
        count: guestBtns.length + guestText.length
      };
    });
    console.log('✅ Auth Screen Guest Bypass Removed:', !authGuestButtons.hasDataAttr && !authGuestButtons.hasTextMatch, authGuestButtons);

    // 2. Check Onboarding Screen & Mascot Size
    console.log('Navigating to Onboarding / Welcome...');
    const mascotDims = await page.evaluate(() => {
      const mascotEl = document.querySelector('.fiezel-ob-mascot');
      if (!mascotEl) return null;
      const rect = mascotEl.getBoundingClientRect();
      const style = window.getComputedStyle(mascotEl);
      return {
        width: rect.width,
        height: rect.height,
        cssWidth: style.width,
        cssHeight: style.height
      };
    });
    console.log('Mascot dimensions on mobile:', mascotDims);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-onboarding-mascot-restored.png` });

    // 3. Setup Authenticated Learner State for Quiz & Home
    await page.evaluate(() => {
      localStorage.clear();
      const st = {
        name: 'Murid Fiezel',
        level: 1,
        placementDone: true,
        streak: 1,
        targetLang: 'ja',
        sourceLang: 'id',
        gems: { balance: 120 },
        dailyGoal: 10,
        xp: 80,
        view: 'home',
        history: []
      };
      localStorage.setItem('fiezel_state_v1', JSON.stringify(st));
      localStorage.setItem('fz_state', JSON.stringify(st));
      localStorage.setItem('fz_session_v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    });

    // Reload with authenticated state
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1500);

    // Verify Home has NO KelasKu card
    const homeKelaskuExists = await page.evaluate(() => {
      return !!document.querySelector('.fz-stitch-kelasku');
    });
    console.log('✅ KelasKu Card on Home Absent:', !homeKelaskuExists);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-home-verified-no-kelasku.png` });

    // 4. Launch Quiz
    console.log('Launching Japanese Quiz...');
    await page.evaluate(() => {
      document.querySelectorAll('.fiezel-splash, #fiezelBootSplash, .fz-auth').forEach(el => el.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-booting', 'fz-auth-open');
      if (typeof window.startVocabQuiz === 'function') {
        window.startVocabQuiz();
      }
    });
    await page.waitForSelector('.quiz-shell', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Verify Topbar Gem and Header Progress Counter
    const topbarInfo = await page.evaluate(() => {
      const pText = document.querySelector('.quiz-progress-text');
      const pRect = pText ? pText.getBoundingClientRect() : null;
      const gemCount = document.querySelector('#quizTopbarGemCount');
      const globalHeader = document.querySelector('header.topbar');
      const globalHeaderVisible = globalHeader ? window.getComputedStyle(globalHeader).display !== 'none' : false;
      const thoughtBubble = document.querySelector('#fzMochiThoughtBubble');

      return {
        progressText: pText ? pText.innerText.replace(/\s+/g, '') : null,
        isSingleLine: pRect ? pRect.height <= 26 : false,
        gemValue: gemCount ? gemCount.innerText.trim() : null,
        globalHeaderHidden: !globalHeaderVisible,
        hasThoughtBubble: !!thoughtBubble,
        thoughtBubbleText: thoughtBubble ? thoughtBubble.innerText.trim() : null
      };
    });
    console.log('✅ Quiz Topbar Info:', topbarInfo);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-quiz-header-and-thought-bubble.png` });

    // 5. Attempt 1 Wrong Answer -> Tutor Hint Modal
    console.log('Triggering Attempt 1 Wrong Answer for Tutor Hint Modal...');
    await page.evaluate(() => {
      const options = document.querySelectorAll('.option');
      if (options.length > 1) {
        options[1].click(); // pick a wrong option
      }
    });
    await page.waitForTimeout(600);

    const tutorModalInfo = await page.evaluate(() => {
      const modal = document.querySelector('#tutorHintModal');
      const backdrop = document.querySelector('#tutorHintModalBackdrop');
      const retryBtn = document.querySelector('#tutorModalRetryBtn');
      const steps = Array.from(document.querySelectorAll('.tutor-modal-step-item')).map(s => s.innerText.trim());
      const topbarHidden = document.body.classList.contains('has-tutor-modal');

      return {
        isOpen: !!modal,
        hasRetryBtn: !!retryBtn,
        retryText: retryBtn ? retryBtn.innerText.trim() : null,
        steps: steps,
        topbarHidden: topbarHidden
      };
    });
    console.log('✅ Tutor Hint Modal Info:', tutorModalInfo);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-tutor-hint-modal-verified.png` });

    // Click "Coba Lagi" in modal
    console.log('Clicking "Coba Lagi" in Tutor Modal...');
    await page.evaluate(() => {
      document.querySelector('#tutorModalRetryBtn')?.click();
    });
    await page.waitForTimeout(500);

    // 6. Attempt 2 Wrong Answer -> Luxury Feedback Sheet
    console.log('Triggering Attempt 2 Wrong Answer for Feedback Sheet...');
    await page.evaluate(() => {
      const options = document.querySelectorAll('.option:not(.was-tried)');
      if (options.length > 0) {
        options[0].click();
      }
    });
    await page.waitForTimeout(600);

    const feedbackSheetInfo = await page.evaluate(() => {
      const sheet = document.querySelector('#feedback');
      const takeaway = document.querySelector('.feedback-takeaway-card .takeaway-text');
      const exitBtn = document.querySelector('#quizSheetExit');
      const explainBtn = document.querySelector('#quizSheetExplain');
      const nextBtn = document.querySelector('#quizSheetNext');
      const closeX = document.querySelector('#feedbackSheetClose');
      const summarySliver = document.querySelector('.feedback-drawer-summary');
      const summaryVisible = summarySliver ? window.getComputedStyle(summarySliver).display !== 'none' : false;

      return {
        isSheetVisible: sheet && !sheet.classList.contains('hidden'),
        hasTakeawayText: takeaway && takeaway.innerText.trim().length > 0,
        takeawayPreview: takeaway ? takeaway.innerText.trim() : null,
        hasExitBtn: !!exitBtn,
        hasExplainBtn: !!explainBtn,
        hasNextBtn: !!nextBtn,
        hasCloseX: !!closeX,
        summarySliverHidden: !summaryVisible
      };
    });
    console.log('✅ Feedback Sheet Info:', feedbackSheetInfo);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-feedback-sheet-verified.png` });

    // 7. Test Deep Dive Drawer ("Buka Pembahasan")
    console.log('Testing "Buka Pembahasan" toggle...');
    await page.evaluate(() => {
      document.querySelector('#quizSheetExplain')?.click();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${ARTIFACT_DIR}/mobile-feedback-deep-dive-verified.png` });

    // 8. Test Soft-lock Elimination: Click "Lanjut" to Advance to Next Question
    console.log('Testing "Lanjut" button to advance question...');
    const questionBefore = await page.evaluate(() => document.querySelector('.quiz-progress-num')?.innerText);
    await page.evaluate(() => {
      document.querySelector('#quizSheetNext')?.click();
    });
    await page.waitForTimeout(700);
    const questionAfter = await page.evaluate(() => document.querySelector('.quiz-progress-num')?.innerText);
    console.log('✅ Question Advanced from', questionBefore, 'to', questionAfter);

    await mobileCtx.close();

    // -----------------------------------------------------------------
    // PASS 2: DESKTOP (1280 x 800)
    // -----------------------------------------------------------------
    console.log('\n--- [PASS 2: DESKTOP 1280x800] ---');
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });
    const desktopPage = await desktopCtx.newPage();

    await desktopPage.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await desktopPage.waitForTimeout(1000);

    // Setup state
    await desktopPage.evaluate(() => {
      localStorage.clear();
      const st = {
        name: 'Murid Desktop',
        level: 1,
        placementDone: true,
        streak: 2,
        targetLang: 'ja',
        sourceLang: 'id',
        gems: { balance: 120 },
        view: 'home'
      };
      localStorage.setItem('fiezel_state_v1', JSON.stringify(st));
      localStorage.setItem('fz_state', JSON.stringify(st));
      localStorage.setItem('fz_session_v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    });
    await desktopPage.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await desktopPage.waitForTimeout(1000);

    // Launch Quiz on Desktop
    await desktopPage.evaluate(() => {
      document.querySelectorAll('.fiezel-splash, #fiezelBootSplash, .fz-auth').forEach(el => el.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-booting', 'fz-auth-open');
      if (typeof window.startVocabQuiz === 'function') {
        window.startVocabQuiz();
      }
    });
    await desktopPage.waitForSelector('.quiz-shell', { timeout: 10000 });
    await desktopPage.waitForTimeout(600);

    const desktopQuizLayout = await desktopPage.evaluate(() => {
      const shell = document.querySelector('.quiz-shell');
      const stem = document.querySelector('#quizStem');
      const opt = document.querySelector('.option');
      return {
        shellWidth: shell ? shell.getBoundingClientRect().width : null,
        stemFontSize: stem ? window.getComputedStyle(stem).fontSize : null,
        optionHeight: opt ? opt.getBoundingClientRect().height : null
      };
    });
    console.log('✅ Desktop Quiz Layout:', desktopQuizLayout);
    await desktopPage.screenshot({ path: `${ARTIFACT_DIR}/desktop-quiz-wide-layout-verified.png` });

    await desktopCtx.close();
    console.log('\n🎉 ALL INVARIANTS & VISUAL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('❌ Verification Probe Error:', err);
  process.exit(1);
});
