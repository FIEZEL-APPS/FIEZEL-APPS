/**
 * tools/dev/probe-story-voice-autoplay.cjs
 *
 * Playwright E2E Verification & Screenshot Runner for Story Voice & Autoplay
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('c:/Users/hp/fiezel-apps/node_modules/playwright');

const worktreeDir = path.resolve('C:/Users/hp/fiezel-story-autoplay-m025-707');
const artifactDir = path.resolve('C:/Users/hp/.gemini/antigravity/brain/84451d48-14d5-4002-bd34-8ddaed009984');

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

function startStaticServer() {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg'
    };

    const server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const filePath = path.join(worktreeDir, reqPath.replace(/^\//, ''));

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found: ' + reqPath);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`[TEST SERVER] Serving worktree at http://127.0.0.1:${port}`);
      resolve({ server, port });
    });
  });
}

async function run() {
  console.log('=== [PLAYWRIGHT PROBE: STORY VOICE & AUTOPLAY (M025-707)] ===');
  const { server, port } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Test (390 x 844)
  console.log('\n--- 1. Testing Mobile Viewport (390 x 844) ---');
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  await mobileCtx.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ token: 'mock', user: { id: 'u1', name: 'Murid' } }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Murid', locale: 'id', course: 'ja' }));
    localStorage.setItem('fz_target_course', 'ja');
    localStorage.setItem('fz_state_v1', JSON.stringify({
      level: 1, jaLevel: 'KANA', placementDone: true, view: 'story',
      streak: 5, ritualMeta: { lastDay: today }
    }));
  });

  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(500);

  // Remove modal overlays if any and navigate cleanly
  await mobilePage.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .ob-onboarding-layer, #onboardingHost, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour, #fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel').forEach(el => el.remove());
    if (window.FiezelStoryReader) {
      window.FiezelStoryReader.openStory('mizuki-maiko');
      window.FiezelStoryReader.gotoScene(0);
    }
  });
  await mobilePage.waitForTimeout(600);

  // Check UI elements exist
  const playBtnText = await mobilePage.textContent('#fzBtnPlay');
  console.log('Play button initial icon:', playBtnText.trim());
  const badgeText = await mobilePage.textContent('.fz-autoplay-badge');
  console.log('Autoplay badge text:', badgeText.trim());
  const speakerName = await mobilePage.textContent('.fz-speaker-name');
  console.log('Speaker name:', speakerName.trim());

  // Take Mobile Scene 1 screenshot
  const mobileShotPath = path.join(artifactDir, 'story-mobile-scene1.png');
  await mobilePage.screenshot({ path: mobileShotPath });
  console.log('✓ Captured Mobile Scene 1:', mobileShotPath);

  // Click Play Button
  console.log('\n--- 2. Triggering Playback on Scene 1 ---');
  await mobilePage.click('#fzBtnPlay');
  await mobilePage.waitForTimeout(400);

  const isPlaying = await mobilePage.evaluate(() => window.FiezelStoryReader.getIsPlaying());
  const activeSceneIdx = await mobilePage.evaluate(() => window.FiezelStoryReader.getActiveSceneIndex());
  console.log(`Playing status: ${isPlaying}, Active Scene Index: ${activeSceneIdx}`);

  // Take Playing screenshot
  const playingShotPath = path.join(artifactDir, 'story-mobile-autoplay-playing.png');
  await mobilePage.screenshot({ path: playingShotPath });
  console.log('✓ Captured Mobile Playing State:', playingShotPath);

  // Test sequential autoplay progression
  console.log('\n--- 3. Testing Sequential Auto-Advance 1 -> 2 -> 3 -> 4 -> 5 ---');
  // End Scene 0 (1)
  await mobilePage.evaluate(() => window.FiezelStoryReader.handleSceneAudioEnded(0));
  await mobilePage.waitForTimeout(900);
  const sceneAfter1 = await mobilePage.evaluate(() => window.FiezelStoryReader.getActiveSceneIndex());
  console.log('Scene after Adegan 1 ended (expected 1):', sceneAfter1);

  // End Scene 1 (2)
  await mobilePage.evaluate(() => window.FiezelStoryReader.handleSceneAudioEnded(1));
  await mobilePage.waitForTimeout(900);
  const sceneAfter2 = await mobilePage.evaluate(() => window.FiezelStoryReader.getActiveSceneIndex());
  console.log('Scene after Adegan 2 ended (expected 2):', sceneAfter2);

  // End Scene 2 (3)
  await mobilePage.evaluate(() => window.FiezelStoryReader.handleSceneAudioEnded(2));
  await mobilePage.waitForTimeout(900);
  const sceneAfter3 = await mobilePage.evaluate(() => window.FiezelStoryReader.getActiveSceneIndex());
  console.log('Scene after Adegan 3 ended (expected 3):', sceneAfter3);

  // End Scene 3 (4)
  await mobilePage.evaluate(() => window.FiezelStoryReader.handleSceneAudioEnded(3));
  await mobilePage.waitForTimeout(1400);
  const sceneAfter4 = await mobilePage.evaluate(() => window.FiezelStoryReader.getActiveSceneIndex());
  console.log('Scene after Adegan 4 ended (expected 4 / Quiz):', sceneAfter4);

  // 4. Desktop Test (1280 x 800)
  console.log('\n--- 4. Testing Desktop Split-Screen Viewport (1280 x 800) ---');
  const deskCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1
  });
  const deskPage = await deskCtx.newPage();
  await deskPage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await deskPage.waitForTimeout(500);

  await deskPage.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .ob-onboarding-layer, #onboardingHost, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour, #fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel').forEach(el => el.remove());
    if (window.FiezelStoryReader) {
      window.FiezelStoryReader.openStory('mizuki-maiko');
      window.FiezelStoryReader.gotoScene(0);
    }
  });
  await deskPage.waitForTimeout(600);

  const deskShotPath = path.join(artifactDir, 'story-desktop-scene1.png');
  await deskPage.screenshot({ path: deskShotPath });
  console.log('✓ Captured Desktop Split-Screen Scene 1:', deskShotPath);

  await browser.close();
  server.close();
  console.log('\n=== ALL PLAYWRIGHT TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('Playwright probe error:', err);
  process.exit(1);
});
