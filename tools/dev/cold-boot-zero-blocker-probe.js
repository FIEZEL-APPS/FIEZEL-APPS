const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Simple static file server
function createServer(rootDir) {
  return http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath.replace(/^\//, ''));

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found: ' + reqPath);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

async function runTest() {
  const rootDir = path.resolve(__dirname, '..');
  const server = createServer(rootDir);

  const testPort = 32000 + Math.floor(Math.random() * 10000);
  await new Promise((resolve) => server.listen(testPort, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[TEST SERVER] Running on http://127.0.0.1:${port}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 } // standard iPhone mobile view
  });
  const page = await context.newPage();

  const allLogs = [];
  const network404s = [];
  page.on('console', msg => allLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => allLogs.push(`[PAGEERROR] ${err.stack || err.message}`));
  page.on('response', res => {
    if (res.status() === 404) network404s.push(res.url());
  });

  try {
    console.log('[PROBE 1] Cold-boot navigation to index.html with clean storage...');
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });

    // Wait for brand splash to transition to onboarding dialog
    await page.locator('.fiezel-ob').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);

    const bodyClasses = await page.evaluate(() => document.body.className);
    const hasAuthLock = await page.evaluate(() => document.body.classList.contains('fz-auth-open') || document.body.classList.contains('auth-locked'));
    const obVisible = await page.locator('.fiezel-ob').isVisible();
    const obCount = await page.locator('.fiezel-ob').count();
    const appHtmlLength = await page.evaluate(() => document.getElementById('app')?.innerHTML?.length || 0);
    const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 800));

    console.log('[PROBE 1 RESULT] App HTML length:', appHtmlLength);
    console.log('[PROBE 1 RESULT] Onboarding count:', obCount);
    console.log('[PROBE 1 RESULT] Onboarding visible:', obVisible);
    console.log('[PROBE 1 RESULT] Body classes:', bodyClasses);
    console.log('[PROBE 1 RESULT] Auth lock present:', hasAuthLock);
    console.log('[PROBE 1 RESULT] 404 errors:', network404s);
    console.log('[PROBE 1 RESULT] Console logs:\n', allLogs.join('\n'));
    console.log('[PROBE 1 RESULT] Body HTML preview:\n', bodyHtml);

    if (hasAuthLock) throw new Error('FAIL: Body has auth-lock on fresh cold boot!');
    if (!obVisible) throw new Error('FAIL: Onboarding is NOT visible on fresh cold boot!');
    if (network404s.some(u => u.includes('fiezel-mochi.js'))) throw new Error('FAIL: 404 error on fiezel-mochi.js still occurs!');

    console.log('[PROBE 2] Stepping through Onboarding...');
    // Log initial step
    let stepInfo = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-ob [data-ob-step]');
      const title = document.querySelector('.fiezel-title')?.textContent;
      return { stepAttr: sheet ? sheet.getAttribute('data-ob-step') : 'no sheet', title };
    });
    console.log('[PROBE 2] Initial step:', stepInfo);

    // Step 0: Language selection (if present)
    const idLocaleBtn = page.locator('[data-ob-locale="id"]').first();
    if (await idLocaleBtn.isVisible()) {
      console.log('[PROBE 2] Selecting language: id (Bahasa Indonesia)...');
      await idLocaleBtn.click();
      await page.waitForTimeout(1000);
    }

    stepInfo = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-ob [data-ob-step]');
      const title = document.querySelector('.fiezel-title')?.textContent;
      return { stepAttr: sheet ? sheet.getAttribute('data-ob-step') : 'no sheet', title };
    });
    console.log('[PROBE 2] After Step 0 (Language):', stepInfo);

    // Step 1: Name
    const nameInput = page.locator('[data-ob-name-input], [data-ob-name], input[type="text"]').first();
    if (await nameInput.isVisible()) {
      console.log('[PROBE 2] Typing student name...');
      await nameInput.fill('Murid Baru');
      await page.waitForTimeout(300);
      const step1Next = page.locator('[data-ob-advance], [data-ob-primary]').first();
      await step1Next.click();
      // Wait for validation to finish and step to advance to course
      await page.waitForTimeout(2500);
    }

    stepInfo = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-ob [data-ob-step]');
      const title = document.querySelector('.fiezel-title')?.textContent;
      return { stepAttr: sheet ? sheet.getAttribute('data-ob-step') : 'no sheet', title };
    });
    console.log('[PROBE 2] After Step 1 (Name):', stepInfo);

    // Step 2: Course
    const courseJa = page.locator('[data-ob-course="ja"], [data-course="ja"]').first();
    if (await courseJa.isVisible()) {
      console.log('[PROBE 2] Selecting course: ja (Bahasa Jepang)...');
      await courseJa.click();
      await page.waitForTimeout(600);
      const step2Next = page.locator('[data-ob-advance], [data-ob-primary]').first();
      await step2Next.click();
      await page.waitForTimeout(1000);
    }

    stepInfo = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-ob [data-ob-step]');
      const title = document.querySelector('.fiezel-title')?.textContent;
      return { stepAttr: sheet ? sheet.getAttribute('data-ob-step') : 'no sheet', title };
    });
    console.log('[PROBE 2] After Step 2 (Course):', stepInfo);

    // Step 3: Goal
    const goalOption = page.locator('[data-ob-goal]').first();
    if (await goalOption.isVisible()) {
      console.log('[PROBE 2] Selecting learning goal...');
      await goalOption.click();
      await page.waitForTimeout(600);
      const step3Next = page.locator('[data-ob-advance], [data-ob-primary]').first();
      await step3Next.click();
      await page.waitForTimeout(1000);
    }

    stepInfo = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-ob [data-ob-step]');
      const title = document.querySelector('.fiezel-title')?.textContent;
      return { stepAttr: sheet ? sheet.getAttribute('data-ob-step') : 'no sheet', title };
    });
    console.log('[PROBE 2] After Step 3 (Goal):', stepInfo);

    const currentStepHtml = await page.evaluate(() => document.querySelector('.fiezel-ob')?.innerHTML || 'NOT FOUND');
    console.log('[DEBUG CURRENT OB HTML]:\n', currentStepHtml.slice(0, 1000));

    // Step 4: Dual-Gate Fork (Mulai dari Nol vs Cari Level Saya)
    console.log('[PROBE 3] Checking Dual-Gate Fork on Step 4...');
    const beginnerBtn = page.locator('[data-ob-beginner]').first();
    const placementBtn = page.locator('[data-ob-primary]').first();

    const beginnerVisible = await beginnerBtn.isVisible();
    const placementVisible = await placementBtn.isVisible();
    console.log('[PROBE 3 RESULT] Beginner button visible:', beginnerVisible);
    console.log('[PROBE 3 RESULT] Placement button visible:', placementVisible);

    if (!beginnerVisible) throw new Error('FAIL: Dual-Gate Beginner button is missing on Step 4!');

    // Click "Mulai dari Nol"
    console.log('[PROBE 4] Clicking Mulai dari Nol (Bypass placement)...');
    await beginnerBtn.click();

    // Verify Quick-Win Lesson launches
    const quizShell = page.locator('.quiz-shell').first();
    await quizShell.waitFor({ state: 'visible', timeout: 8000 });
    const quizVisible = await quizShell.isVisible();
    console.log('[PROBE 4 RESULT] Quick-Win Quiz card visible:', quizVisible);

    if (!quizVisible) throw new Error('FAIL: Quick-Win lesson did not launch after selecting Mulai dari Nol!');

    console.log('[PROBE 5] Answering Quick-Win Lesson 3 questions...');
    const correctIndices = [0, 1, 0];
    for (let q = 1; q <= 3; q++) {
      console.log(`[PROBE 5] Waiting for Question ${q} options...`);
      const ansIdx = correctIndices[q - 1];
      const opt = page.locator(`button.option[data-choice="${ansIdx}"]:not([disabled])`).first();
      await opt.waitFor({ state: 'visible', timeout: 8000 });
      console.log(`[PROBE 5] Answering Question ${q} (choice ${ansIdx})...`);
      await opt.click();

      // Wait for confidence popup or next button to appear
      const confOrNext = page.locator('#confidencePop button, #quizNext:not([disabled])').first();
      await confOrNext.waitFor({ state: 'visible', timeout: 6000 });
      console.log(`[PROBE 5] Advancing after Question ${q}...`);
      await confOrNext.click();
      await page.waitForTimeout(1000);

      // If next button is visible and enabled (e.g. after reviewing feedback)
      const lanjut = page.locator('#quizNext:not([disabled]), [data-testid="quiz-floating-next"]:not([disabled])').first();
      if (await lanjut.isVisible()) {
        console.log(`[PROBE 5] Clicking quiz next button for Question ${q}...`);
        await lanjut.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('[PROBE 6] Verifying victory screen & transition to home...');
    const resultStage = page.locator('.result-stage').first();
    await resultStage.waitFor({ state: 'visible', timeout: 5000 });
    console.log('[PROBE 6 RESULT] Result / Victory Stage is visible!');

    const homeBtn = page.locator('.result-stage button.primary, .result-stage button.ghost, button:has-text("Home"), button:has-text("Beranda"), button:has-text("Lanjut")').first();
    if (await homeBtn.isVisible()) {
      await homeBtn.click();
      await page.waitForTimeout(1200);
    }

    const stateEvaluation = await page.evaluate(() => {
      const s = (typeof window.__getFiezelState === 'function' ? window.__getFiezelState() : window.state) || {};
      return {
        level: s.level,
        gems: s.gems,
        placementDone: s.placementDone,
        streak: s.streak
      };
    });

    console.log('[PROBE 6 RESULT] User state after Quick Win:', stateEvaluation);
    if (stateEvaluation.level !== 1) throw new Error(`FAIL: Expected level 1, got ${stateEvaluation.level}`);
    if (stateEvaluation.gems < 15) throw new Error(`FAIL: Expected gems >= 15, got ${stateEvaluation.gems}`);
    if (!stateEvaluation.placementDone) throw new Error('FAIL: Expected placementDone to be true');

    console.log('>>> ALL COLD-BOOT & DUOLINGO-PARITY CHECKS PASSED 100%! <<<');
  } finally {
    await browser.close();
    server.close();
  }
}

runTest().catch(err => {
  console.error('[TEST FAILED]', err.message);
  process.exit(1);
});
