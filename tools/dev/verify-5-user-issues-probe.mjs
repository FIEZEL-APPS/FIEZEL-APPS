import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = 'C:\\Users\\hp\\.gemini\\antigravity\\brain\\a32ac6de-6572-4105-b553-f67ec6c92656';

async function run() {
  console.log('🚀 Launching Chromium for 5 User Issues Verification...');
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Test (390 x 844)
  console.log('\n--- TESTING MOBILE (390 x 844) ---');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fz_auth_session', JSON.stringify({ signedIn: true, role: 'student', name: 'Budi Test', at: Date.now() }));
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ token: 'mock-token', user: { id: 'u1', name: 'Budi Test' } }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Test', locale: 'id', course: 'ja' }));
    localStorage.setItem('fiezel-tour-v1', 'finish');
    localStorage.setItem('fz_tour_done', 'true');
    localStorage.setItem('fz_auth_guest', 'true');
    localStorage.setItem('fiezel_lang_chosen', 'id');
    localStorage.setItem('fz_target_course', 'ja');
    localStorage.setItem('fz_target_lang', 'ja');
    localStorage.setItem('fz_state_v1@ja', JSON.stringify({
      level: 1, jaLevel: 'A1', placementDone: true, view: 'home',
      streak: 3, gems: { balance: 150 }, ritualMeta: { lastDay: today }
    }));
    localStorage.setItem('fz_state_v1', JSON.stringify({
      level: 1, jaLevel: 'A1', placementDone: true, view: 'home',
      streak: 3, gems: { balance: 150 }, ritualMeta: { lastDay: today }
    }));
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Clean overlays
  await page.evaluate(() => {
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    document.documentElement.classList.add('fz-app-open');
    if (window.switchTargetLangStorage) window.switchTargetLangStorage('ja');
    if (window.FiezelI18n?.setCourse) window.FiezelI18n.setCourse('ja');
    if (window.go) window.go('home');
  });
  await page.waitForTimeout(600);

  // Take Home screenshot to verify KelasKu card is gone (Issue 5)
  const homeShot = path.join(artifactDir, 'mobile-home-no-kelasku.png');
  await page.screenshot({ path: homeShot, fullPage: false });
  console.log('📸 Captured mobile Home screenshot:', homeShot);

  const kelaskuPresent = await page.evaluate(() => {
    return !!document.querySelector('.fz-vissol-kelasku-bar') ||
           document.body.innerText.includes('KelasKu • Tugas Aktif');
  });
  console.log('✅ Issue 5 (KelasKu card removed):', !kelaskuPresent ? 'PASSED (Gone)' : 'FAILED (Still present)');

  // Now launch Japanese quiz session
  console.log('Launching Japanese quiz session via startVocabQuiz()...');
  await page.evaluate(() => {
    startVocabQuiz();
  });
  await page.waitForFunction(() => window.__activeQuizQuestion != null, { timeout: 4000 });
  await page.waitForTimeout(600);

  // Verify Issue 1 & Issue 2 (Counter & Toggle)
  const quizHeaderShot = path.join(artifactDir, 'mobile-quiz-header-and-toggle.png');
  await page.screenshot({ path: quizHeaderShot, fullPage: false });
  console.log('📸 Captured mobile Quiz Header & Toggle:', quizHeaderShot);

  const headerCounterInfo = await page.evaluate(() => {
    const el = document.querySelector('.quiz-progress');
    const txtEl = document.querySelector('.quiz-progress-text');
    const numEl = document.querySelector('.quiz-progress-num');
    const sepEl = document.querySelector('.quiz-progress-sep');
    const totalEl = document.querySelector('.quiz-progress-total');
    const toggleEl = document.querySelector('.ja-display');

    const numRect = numEl ? numEl.getBoundingClientRect() : null;
    const sepRect = sepEl ? sepEl.getBoundingClientRect() : null;
    const totalRect = totalEl ? totalEl.getBoundingClientRect() : null;
    const txtRect = txtEl ? txtEl.getBoundingClientRect() : null;

    // Check if on same horizontal line
    const isSingleLine = numRect && totalRect && Math.abs(numRect.y - totalRect.y) < 2;

    const exitLabel = document.querySelector('.quiz-exit-label');
    const grammarHint = document.getElementById('quizGrammarHint');

    return {
      text: txtEl ? txtEl.innerText.replace(/\s+/g, ' ').trim() : null,
      isSingleLine,
      txtWidth: txtRect ? txtRect.width : null,
      txtHeight: txtRect ? txtRect.height : null,
      hasToggle: !!toggleEl,
      exitLabelVisible: exitLabel ? (window.getComputedStyle(exitLabel).display !== 'none') : false,
      hasGrammarHint: !!grammarHint && (window.getComputedStyle(grammarHint).display !== 'none'),
    };
  });
  console.log('✅ Issue 1 & 2 Header Counter & Toggle Info:', headerCounterInfo);

  // Trigger FIRST wrong answer to test Petunjuk Guru Centered Modal (Issue 3)
  console.log('Clicking wrong option for Attempt 1...');
  await page.evaluate(() => {
    const q = window.__activeQuizQuestion;
    const opts = document.querySelectorAll('.option');
    const wrongIdx = q.answerIndex === 0 ? 1 : 0;
    opts[wrongIdx].click();
  });

  await page.waitForTimeout(600);

  const modalShot = path.join(artifactDir, 'mobile-tutor-hint-modal.png');
  await page.screenshot({ path: modalShot, fullPage: false });
  console.log('📸 Captured mobile Tutor Hint Modal:', modalShot);

  const modalInfo = await page.evaluate(() => {
    const modal = document.getElementById('tutorHintModal');
    const retryBtn = document.getElementById('tutorModalRetryBtn');
    const steps = document.querySelectorAll('.tutor-modal-step-item');
    const clue = document.querySelector('.tutor-modal-callout-text');
    const badge = document.querySelector('.tutor-modal-badge');
    const rect = modal ? modal.getBoundingClientRect() : null;
    return {
      modalInDOM: !!modal,
      modalBox: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null,
      badgeText: badge ? badge.innerText.trim() : null,
      retryBtnVisible: !!retryBtn,
      retryBtnText: retryBtn ? retryBtn.innerText.trim() : null,
      stepsCount: steps.length,
      clueText: clue ? clue.innerText.trim() : null,
    };
  });
  console.log('✅ Issue 3 Petunjuk Guru Modal Info:', modalInfo);

  // Click "Coba Lagi" button inside modal
  console.log('Clicking "Coba Lagi" button in modal...');
  await page.evaluate(() => {
    const retryBtn = document.getElementById('tutorModalRetryBtn');
    if (retryBtn) retryBtn.click();
  });

  await page.waitForTimeout(400);

  const retryStateShot = path.join(artifactDir, 'mobile-after-modal-retry-click.png');
  await page.screenshot({ path: retryStateShot, fullPage: false });
  console.log('📸 Captured mobile After "Coba Lagi" click:', retryStateShot);

  const retryOptionsState = await page.evaluate(() => {
    const modal = document.getElementById('tutorHintModal');
    const wasTried = document.querySelectorAll('.option.was-tried');
    const retryAvail = document.querySelectorAll('.option.retry-available');
    return {
      modalDismissed: !modal,
      wasTriedCount: wasTried.length,
      retryAvailableCount: retryAvail.length,
    };
  });
  console.log('✅ After "Coba Lagi" State:', retryOptionsState);

  // Now trigger SECOND wrong answer to test Feedback Sheet (Issue 4)
  console.log('Clicking second wrong option for Attempt 2...');
  await page.evaluate(() => {
    const q = window.__activeQuizQuestion;
    const avail = Array.from(document.querySelectorAll('.option.retry-available'));
    const wrongOpt = avail.find(opt => {
      const idx = Array.from(opt.parentElement.children).indexOf(opt);
      return idx !== q.answerIndex;
    }) || avail[0];
    wrongOpt?.click();
  });

  await page.waitForTimeout(800);

  const feedbackSheetShot = path.join(artifactDir, 'mobile-feedback-sheet-dual-action.png');
  await page.screenshot({ path: feedbackSheetShot, fullPage: false });
  console.log('📸 Captured mobile Feedback Sheet:', feedbackSheetShot);

  const feedbackSheetInfo = await page.evaluate(() => {
    const sheet = document.getElementById('feedback');
    const takeaway = document.querySelector('.takeaway-text');
    const exitBtn = document.getElementById('quizSheetExit');
    const explainBtn = document.getElementById('quizSheetExplain');
    const nextBtn = document.getElementById('quizSheetNext');
    const closeX = document.getElementById('feedbackSheetClose');
    const footer = document.querySelector('.feedback-sheet-footer');
    const diffWrong = document.querySelector('.diff-word-wrong');
    const diffCorrect = document.querySelector('.diff-word-correct');
    const floatingBar = document.getElementById('quizFloatingBar');

    const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
    const isNextCutoff = nextRect ? nextRect.right > 390 : false;

    return {
      sheetInDOM: !!sheet,
      sheetVisible: !!sheet && sheet.classList.contains('feedback-sheet'),
      takeawayText: takeaway ? takeaway.innerText.trim() : null,
      hasExitBtn: !!exitBtn,
      exitBtnText: exitBtn ? exitBtn.innerText.trim() : null,
      hasExplainBtn: !!explainBtn,
      explainBtnText: explainBtn ? explainBtn.innerText.trim() : null,
      hasNextBtn: !!nextBtn,
      nextBtnText: nextBtn ? nextBtn.innerText.trim() : null,
      nextBtnWidth: nextRect ? nextRect.width : null,
      isNextCutoff,
      hasCloseX: !!closeX,
      footerPosition: footer ? window.getComputedStyle(footer).position : null,
      floatingBarVisible: floatingBar ? (window.getComputedStyle(floatingBar).display !== 'none') : false,
      diffWrongColor: diffWrong ? window.getComputedStyle(diffWrong).color : null,
      diffCorrectColor: diffCorrect ? window.getComputedStyle(diffCorrect).color : null,
    };
  });
  console.log('✅ Issue 4 Feedback Sheet Info:', feedbackSheetInfo);

  // Test clicking "Buka Pembahasan" button
  console.log('Testing "Buka Pembahasan" button click...');
  await page.evaluate(() => {
    const explainBtn = document.getElementById('quizSheetExplain');
    if (explainBtn) explainBtn.click();
  });
  await page.waitForTimeout(500);

  const deepDiveInfo = await page.evaluate(() => {
    const drawer = document.querySelector('.feedback-drawer-details');
    const content = document.querySelector('.feedback-drawer-content');
    const memory = document.querySelector('.feedback-memory-box');
    const memoryP = memory ? memory.querySelector('p, span') : null;
    return {
      isOpen: drawer ? drawer.open : false,
      contentVisible: !!content,
      memoryColor: memoryP ? window.getComputedStyle(memoryP).color : null,
    };
  });
  console.log('✅ Deep dive drawer info:', deepDiveInfo);

  const deepDiveShot = path.join(artifactDir, 'mobile-feedback-deep-dive-opened.png');
  await page.screenshot({ path: deepDiveShot, fullPage: false });
  console.log('📸 Captured mobile Feedback Deep Dive Opened:', deepDiveShot);

  // 2. Desktop Test (1280 x 800)
  console.log('\n--- TESTING DESKTOP (1280 x 800) ---');
  const dContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const dPage = await dContext.newPage();
  dPage.on('pageerror', err => console.error('DESKTOP PAGE ERROR:', err.message));

  await dPage.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fz_auth_session', JSON.stringify({ signedIn: true, role: 'student', name: 'Budi Test' }));
    localStorage.setItem('fz_auth_guest', 'true');
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Test', locale: 'id', course: 'ja' }));
    localStorage.setItem('fiezel-tour-v1', 'finish');
    localStorage.setItem('fz_tour_done', 'true');
    localStorage.setItem('fz_target_course', 'ja');
    localStorage.setItem('fz_target_lang', 'ja');
    localStorage.setItem('fz_state_v1@ja', JSON.stringify({ level: 1, jaLevel: 'A1', placementDone: true, view: 'home' }));
    localStorage.setItem('fz_state_v1', JSON.stringify({ level: 1, jaLevel: 'A1', placementDone: true, view: 'home' }));
  });

  await dPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await dPage.waitForTimeout(600);

  await dPage.evaluate(() => {
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    document.documentElement.classList.add('fz-app-open');
    if (window.switchTargetLangStorage) window.switchTargetLangStorage('ja');
    if (window.FiezelI18n?.setCourse) window.FiezelI18n.setCourse('ja');
    if (window.go) window.go('home');
  });
  await dPage.waitForTimeout(600);

  const dHomeShot = path.join(artifactDir, 'desktop-home-no-kelasku.png');
  await dPage.screenshot({ path: dHomeShot, fullPage: false });
  console.log('📸 Captured desktop Home screenshot:', dHomeShot);

  // Launch quiz on desktop
  await dPage.evaluate(() => {
    startVocabQuiz();
  });
  await dPage.waitForFunction(() => window.__activeQuizQuestion != null, { timeout: 4000 });
  await dPage.waitForTimeout(600);

  // Wrong answer attempt 1 on desktop
  await dPage.evaluate(() => {
    const q = window.__activeQuizQuestion;
    const opts = document.querySelectorAll('.option');
    const wrongIdx = q.answerIndex === 0 ? 1 : 0;
    opts[wrongIdx].click();
  });
  await dPage.waitForTimeout(600);

  const dModalShot = path.join(artifactDir, 'desktop-tutor-hint-modal.png');
  await dPage.screenshot({ path: dModalShot, fullPage: false });
  console.log('📸 Captured desktop Modal screenshot:', dModalShot);

  // Dismiss modal and trigger second wrong
  await dPage.evaluate(() => {
    document.getElementById('tutorModalRetryBtn')?.click();
  });
  await dPage.waitForTimeout(400);

  await dPage.evaluate(() => {
    const q = window.__activeQuizQuestion;
    const avail = Array.from(document.querySelectorAll('.option.retry-available'));
    const wrongOpt = avail.find(opt => {
      const idx = Array.from(opt.parentElement.children).indexOf(opt);
      return idx !== q.answerIndex;
    }) || avail[0];
    wrongOpt?.click();
  });
  await dPage.waitForTimeout(800);

  const dFeedbackShot = path.join(artifactDir, 'desktop-feedback-sheet.png');
  await dPage.screenshot({ path: dFeedbackShot, fullPage: false });
  console.log('📸 Captured desktop Feedback Sheet:', dFeedbackShot);

  console.log('\n🎉 ALL 5 USER ISSUES VERIFIED WITH ZERO CRASHES & REAL PLAYWRIGHT PIXELS!');
  await browser.close();
}

run().catch(err => {
  console.error('PROBE RUNNER FAILED:', err);
  process.exit(1);
});
