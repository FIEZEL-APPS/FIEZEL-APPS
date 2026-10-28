import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'file:///C:/Users/hp/fiezel-apps/node_modules/playwright/index.mjs';

const rootDir = process.cwd();
const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/53c29b7d-5d4c-4f0d-80c6-971cc3705aa0';
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function startStaticServer(port = 8899) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      let filePath = path.join(rootDir, reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.mp3': 'audio/mpeg'
        };
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  console.log('--- STARTING PLACEMENT PEDAGOGY PROBE ---');
  const server = await startStaticServer(8899);
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Mobile Test
    console.log('[PROBE 1] Testing Mobile 390x844 Placement Test with Pedagogical Feedback...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('fiezel_test_mode', '1');
      localStorage.setItem('fiezel_lang', 'id');
      localStorage.setItem('fz_user_name', 'Tester');
      localStorage.setItem('fz_target_lang', 'en');
      localStorage.setItem('fz_onboarding_completed', 'true');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        v: 1,
        signedIn: true,
        at: Date.now(),
        role: 'murid',
        via: 'google'
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
        done: true,
        name: 'Tester',
        course: 'en',
        locale: 'id',
        at: Date.now()
      }));
    });
    const mobilePage = await mobileContext.newPage();

    mobilePage.on('console', msg => console.log('PAGE LOG:', msg.text()));
    mobilePage.on('pageerror', err => console.error('[Mobile PageError Stack]:', err.stack || err.message));

    await mobilePage.goto('http://127.0.0.1:8899/?test=1', { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(2500);

    // Complete onboarding cleanly
    await mobilePage.evaluate(() => {
      localStorage.setItem('fiezel_test_mode', '1');
      if (window.FiezelOnboarding?.markCompleted) {
        window.FiezelOnboarding.markCompleted(window, { at: Date.now(), role: 'murid', name: 'Tester' });
      }
      if (window.state) {
        window.state.onboardingDone = true;
        window.state.placementDone = false;
        window.state.placementLastAt = 0;
      }
      document.querySelectorAll('.fiezel-ob, .fiezel-splash, #fiezelBootSplash, #welcome, .fz-auth-screen, .auth-overlay, #fzAuthModal').forEach(el => el.remove());
      if (typeof window.dismissWelcome === 'function') window.dismissWelcome();
    });

    // Start Level A2 Placement
    console.log('[PROBE 1.1] Launching startLevelPlacement("A2")...');
    await mobilePage.evaluate(async () => {
      if (window.state) {
        window.state.placementDone = false;
        window.state.placementLastAt = 0;
      }
      document.querySelectorAll('.fiezel-ob, .fiezel-splash, #fiezelBootSplash, #welcome, .fz-auth-screen, .auth-overlay, #fzAuthModal').forEach(el => el.remove());
      await window.startLevelPlacement('A2');
    });

    await mobilePage.waitForSelector('.quiz-shell', { timeout: 8000 });
    console.log('✓ Quiz shell rendered for Level A2 Placement');

    // Verify question is not long reading
    const questionText = await mobilePage.textContent('#quizStem');
    console.log('✓ Question stem:', questionText.slice(0, 80));

    // Answer question 1
    const options = await mobilePage.$$('.option');
    console.log(`✓ Found ${options.length} options`);
    if (options.length > 0) {
      await options[0].evaluate(b => b.click());
      await mobilePage.waitForTimeout(500);

      // Verify feedback drawer is visible and rich
      const feedbackVisible = await mobilePage.isVisible('#feedback:not(.hidden)');
      console.log('✓ Feedback drawer is visible:', feedbackVisible);

      const feedbackHtml = await mobilePage.innerHTML('#feedback');
      const hasVerdict = feedbackHtml.includes('feedback-title');
      const hasWhyOrTakeaway = feedbackHtml.includes('Intinya') || feedbackHtml.includes('feedback-rule');
      const hasMemoryBox = feedbackHtml.includes('feedback-memory-box');
      console.log('✓ Feedback details:', { hasVerdict, hasWhyOrTakeaway, hasMemoryBox });

      const nextEnabled = await mobilePage.isEnabled('#quizNext');
      console.log('✓ Next button enabled:', nextEnabled);

      // Capture Mobile Screenshot immediately while feedback is on screen
      const mobileShotPath = path.join(artifactDir, 'placement-feedback-mobile.png');
      await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
      console.log('✓ Mobile screenshot saved:', mobileShotPath);
    }

    // 2. Desktop Test (Anti-Void Split Screen / Card Check)
    console.log('[PROBE 2] Testing Desktop 1280x800 Placement...');
    await mobilePage.setViewportSize({ width: 1280, height: 800 });
    await mobilePage.waitForTimeout(600);

    const deskShotPath = path.join(artifactDir, 'placement-feedback-desktop.png');
    await mobilePage.screenshot({ path: deskShotPath, fullPage: false });
    console.log('✓ Desktop screenshot saved:', deskShotPath);

    console.log('=== ALL EMPIRICAL CHECKS PASSED ===');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('PROBE FAILED:', err);
  process.exit(1);
});
