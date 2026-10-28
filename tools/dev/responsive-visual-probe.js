let chromium;
try { chromium = require('playwright').chromium; } catch(e) { chromium = require('c:/Users/hp/fiezel-apps/node_modules/playwright').chromium; }
const http = require('http');
const fs = require('fs');
const path = require('path');

function createServer(baseDir) {
  return http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(baseDir, reqPath);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

async function runResponsiveAudit() {
  const rootDir = path.resolve(__dirname, '../..');
  const server = createServer(rootDir);
  const port = 37500 + Math.floor(Math.random() * 5000);
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  console.log(`[RESPONSIVE AUDIT] Server running on http://127.0.0.1:${port}`);

  const browser = await chromium.launch({ headless: true });

  // Test 1: Mobile 390x844
  console.log('[AUDIT 1] Testing Mobile (390x844)...');
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto(`http://127.0.0.1:${port}/index.html`);
  await mobilePage.locator('.fiezel-ob').waitFor({ state: 'visible', timeout: 8000 });
  await mobilePage.screenshot({ path: path.join(__dirname, 'mobile-ob-step0.png') });

  // Advance to dual-gate on mobile
  await mobilePage.locator('[data-ob-locale="id"]').click();
  await mobilePage.waitForTimeout(800);
  await mobilePage.locator('[data-ob-name]').fill('Budi Mobile');
  await mobilePage.locator('[data-ob-advance]').click();
  await mobilePage.waitForTimeout(2200);
  await mobilePage.locator('[data-ob-course="ja"]').click();
  await mobilePage.waitForTimeout(500);
  await mobilePage.locator('[data-ob-advance]').click();
  await mobilePage.waitForTimeout(800);
  await mobilePage.locator('[data-ob-goal]').first().click();
  await mobilePage.waitForTimeout(500);
  await mobilePage.locator('[data-ob-advance]').click();
  await mobilePage.waitForTimeout(800);

  await mobilePage.screenshot({ path: path.join(__dirname, 'mobile-dual-gate.png') });

  // Check that dual-gate buttons are above the fold (within 844px)
  const mobileBtnBox = await mobilePage.locator('[data-ob-beginner]').boundingBox();
  console.log('[AUDIT 1] Mobile beginner button bounding box:', mobileBtnBox);
  if (!mobileBtnBox || mobileBtnBox.y + mobileBtnBox.height > 844) {
    console.warn('[WARNING] Beginner button extends below fold on mobile:', mobileBtnBox);
  } else {
    console.log('[PASS] Beginner button is 100% above the fold on Mobile (Zero-Scroll Thumb Zone)!');
  }

  // Click Mulai dari Nol and check quick-win quiz on mobile
  await mobilePage.locator('[data-ob-beginner]').click();
  await mobilePage.locator('.quiz-shell').waitFor({ state: 'visible', timeout: 8000 });
  await mobilePage.screenshot({ path: path.join(__dirname, 'mobile-quickwin-q1.png') });

  await mobilePage.close();
  await mobileCtx.close();
  console.log('[AUDIT 1] Mobile test closed cleanly.');

  // Test 2: Desktop 1280x800
  console.log('[AUDIT 2] Testing Desktop (1280x800)...');
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopCtx.newPage();
  desktopPage.on('console', msg => console.log('[DESKTOP LOG]', msg.type(), msg.text()));
  desktopPage.on('pageerror', err => console.log('[DESKTOP ERROR]', err));
  await desktopPage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });

  // Wait up to 10s for splash transition
  await desktopPage.locator('.fiezel-ob').waitFor({ state: 'visible', timeout: 10000 });
  await desktopPage.screenshot({ path: path.join(__dirname, 'desktop-ob-step0.png') });

  // Check desktop container width to prevent void
  const obWidth = await desktopPage.evaluate(() => {
    const el = document.querySelector('.fiezel-ob');
    return el ? el.getBoundingClientRect().width : 0;
  });
  console.log('[AUDIT 2] Desktop onboarding container width:', obWidth);

  // Advance to dual gate on desktop
  await desktopPage.locator('[data-ob-locale="id"]').click();
  await desktopPage.waitForTimeout(800);
  await desktopPage.locator('[data-ob-name]').fill('Budi Desktop');
  await desktopPage.locator('[data-ob-advance]').click();
  await desktopPage.waitForTimeout(2200);
  await desktopPage.locator('[data-ob-course="ja"]').click();
  await desktopPage.waitForTimeout(500);
  await desktopPage.locator('[data-ob-advance]').click();
  await desktopPage.waitForTimeout(800);
  await desktopPage.locator('[data-ob-goal]').first().click();
  await desktopPage.waitForTimeout(500);
  await desktopPage.locator('[data-ob-advance]').click();
  await desktopPage.waitForTimeout(800);

  await desktopPage.screenshot({ path: path.join(__dirname, 'desktop-dual-gate.png') });

  // Start quick win on desktop
  await desktopPage.locator('[data-ob-beginner]').click();
  await desktopPage.locator('.quiz-shell').waitFor({ state: 'visible', timeout: 8000 });
  await desktopPage.screenshot({ path: path.join(__dirname, 'desktop-quickwin-q1.png') });

  const quizWidth = await desktopPage.evaluate(() => {
    const el = document.querySelector('.quiz-shell');
    return el ? el.getBoundingClientRect().width : 0;
  });
  console.log('[AUDIT 2] Desktop quiz container width:', quizWidth);

  await desktopPage.close();
  await desktopCtx.close();

  await browser.close();
  server.close();
  console.log('>>> RESPONSIVE AUDIT COMPLETED SUCCESSFULLY! <<<');
}

runResponsiveAudit().catch(err => {
  console.error('[AUDIT FAILED]', err);
  process.exit(1);
});
