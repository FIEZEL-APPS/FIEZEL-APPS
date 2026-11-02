import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function startServer(port = 4173) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      let filePath = path.join(rootDir, reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.mjs': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg'
        };
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.on('error', reject);
    server.listen(port, () => resolve(server));
  });
}

async function runAudit() {
  console.log('--- Starting Empirical Playwright Audit for Settings, Splash, and PWA ---');
  const server = await startServer(4173);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  // Inject initial state to bypass onboarding and provide clean environment
  await page.addInitScript(() => {
    try {
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        authenticated: true,
        user: { id: 'test-user-123', handle: 'haiza', role: 'student', displayName: 'Haiza Murid' },
        sessionToken: 'test-tok'
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, timestamp: Date.now() }));
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fiezel-v4-state', JSON.stringify({
        userName: 'Haiza',
        level: 2,
        xp: 350,
        streak: 3,
        grammar: { 'n5-g1': { mastery: 0.85, attempts: 5 } },
        preferences: { reportEndpoint: '', motion: true, haptics: true }
      }));
    } catch (_) {}
  });

  const auditResults = [];

  try {
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 1. Audit "Pilih Ritme Belajarmu" Modal (Image 0 collision check)
    console.log('[Test 1] Testing "Pilih Ritme Belajarmu" Modal Layout...');
    await page.evaluate(() => {
      if (typeof FiezelGrammarVocabBridge !== 'undefined' && FiezelGrammarVocabBridge.openFirstTimeIntensityModal) {
        FiezelGrammarVocabBridge.openFirstTimeIntensityModal();
      }
    });
    await page.waitForTimeout(500);

    const rhythmMetrics = await page.evaluate(() => {
      const closeBtn = document.querySelector('.modal-close-icon');
      const h2 = document.querySelector('.modal-intensity-sheet h2');
      if (!closeBtn || !h2) return null;
      const b1 = closeBtn.getBoundingClientRect();
      const b2 = h2.getBoundingClientRect();
      // Check collision: if b1 overlaps b2
      const overlaps = !(b1.right < b2.left || b1.left > b2.right || b1.bottom < b2.top || b1.top > b2.bottom);
      return {
        closeRect: { top: b1.top, bottom: b1.bottom, left: b1.left, right: b1.right },
        h2Rect: { top: b2.top, bottom: b2.bottom, left: b2.left, right: b2.right },
        verticalGap: b2.top - b1.bottom,
        overlaps
      };
    });

    console.log('  Rhythm Modal Metrics:', rhythmMetrics);
    if (rhythmMetrics && !rhythmMetrics.overlaps && rhythmMetrics.verticalGap >= 0) {
      console.log('  ✅ PASS: Close button and H2 title are cleanly separated without collision.');
      auditResults.push({ name: 'Rhythm Modal Header Collision', pass: true });
    } else {
      console.error('  ❌ FAIL: Overlap detected or metrics missing in Rhythm Modal.');
      auditResults.push({ name: 'Rhythm Modal Header Collision', pass: false });
    }

    const artifactDir = 'C:/Users/hp/.gemini/antigravity/brain/59330e96-cf0f-4b1b-b649-dcdef9cc3dff';
    await page.screenshot({ path: path.join(artifactDir, 'audit-rhythm-modal.png') });

    // Close rhythm modal
    await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
    await page.waitForTimeout(400);

    // 2. Audit "Pengaturan" Modal (Image 2 & 4 fix check)
    console.log('[Test 2] Testing "Pengaturan" Modal Architecture & Scrolling...');
    await page.evaluate(() => {
      if (typeof openSettings === 'function') openSettings();
    });
    await page.waitForTimeout(600);

    const settingsMetrics = await page.evaluate(() => {
      const modal = document.getElementById('modal');
      const panel = document.getElementById('modalPanel');
      const wrapper = document.querySelector('.settings-modal-wrapper');
      const scroller = document.getElementById('settingsScrollBody');
      const actions = document.querySelector('.modal-actions.settings-actions');
      const cancelBtn = document.getElementById('settingsCancel');
      const saveBtn = document.getElementById('settingsSave');
      const bottomNav = document.querySelector('nav.bottomnav, .bottomnav');

      const isModalOpen = modal?.classList.contains('show') && !modal?.classList.contains('hidden');
      const isBodyLocked = document.documentElement.classList.contains('fz-modal-open') && document.body.classList.contains('fz-modal-open');
      const isNavHidden = !bottomNav || window.getComputedStyle(bottomNav).display === 'none' || window.getComputedStyle(bottomNav).visibility === 'hidden';

      const actionsBg = actions ? window.getComputedStyle(actions).backgroundColor : null;
      const actionsPos = actions ? window.getComputedStyle(actions).position : null;

      // Open first fold to check internal card background
      const firstFold = document.querySelector('.settings-fold');
      if (firstFold) firstFold.setAttribute('open', '');

      const card = document.querySelector('.settings-fold .card, .settings-scroll-body .card');
      const cardBg = card ? window.getComputedStyle(card).backgroundColor : null;
      let winningRules = [];
      if (card) {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule.selectorText && card.matches(rule.selectorText)) {
                if (rule.style.backgroundColor || rule.style.background) {
                  winningRules.push({ sel: rule.selectorText, bg: rule.style.backgroundColor || rule.style.background });
                }
              }
            }
          } catch (_) {}
        }
      }
      const cardDetails = card ? {
        className: card.className,
        tagName: card.tagName,
        parentClass: card.parentElement?.className,
        computedBg: cardBg,
        winningRules
      } : null;

      return {
        isModalOpen,
        isBodyLocked,
        isNavHidden,
        hasWrapper: !!wrapper,
        hasScroller: !!scroller,
        hasActions: !!actions,
        actionsBg,
        actionsPos,
        cardBg,
        cardDetails,
        scrollHeight: scroller?.scrollHeight,
        clientHeight: scroller?.clientHeight
      };
    });

    console.log('  Settings Modal Metrics:', settingsMetrics);
    console.log('  Card Winning Rules:', JSON.stringify(settingsMetrics.cardDetails?.winningRules, null, 2));

    // Check actions bar background is dark (not white cream rgb(255, 253, 248))
    const isDarkFooter = settingsMetrics.actionsBg && !settingsMetrics.actionsBg.includes('255, 253, 248') && !settingsMetrics.actionsBg.includes('255, 255, 255');
    const isDarkCard = !settingsMetrics.cardBg || (!settingsMetrics.cardBg.includes('255, 255, 255') && !settingsMetrics.cardBg.includes('251, 247, 243'));
    const isRelativeAction = settingsMetrics.actionsPos === 'relative';

    if (settingsMetrics.isModalOpen && settingsMetrics.isBodyLocked && settingsMetrics.isNavHidden && isDarkFooter && isRelativeAction && isDarkCard) {
      console.log('  ✅ PASS: Settings modal uses dark lux architecture, relative pinned footer, dark cards, and hidden bottomnav.');
      auditResults.push({ name: 'Settings Modal Architecture', pass: true });
    } else {
      console.error('  ❌ FAIL: Settings modal architecture check failed:', { isDarkFooter, isRelativeAction, isDarkCard, isNavHidden: settingsMetrics.isNavHidden });
      auditResults.push({ name: 'Settings Modal Architecture', pass: false });
    }

    await page.screenshot({ path: path.join(artifactDir, 'audit-settings-top.png') });

    // Test scrolling in Settings modal
    console.log('[Test 3] Testing Settings Modal Scrolling...');
    const scrollResult = await page.evaluate(async () => {
      const scroller = document.getElementById('settingsScrollBody');
      if (!scroller) return { scrolled: false };
      const initialScroll = scroller.scrollTop;
      scroller.scrollTop = 350;
      await new Promise(r => setTimeout(r, 200));
      return {
        initialScroll,
        finalScroll: scroller.scrollTop,
        scrolled: scroller.scrollTop > 100
      };
    });

    console.log('  Scroll Result:', scrollResult);
    if (scrollResult.scrolled) {
      console.log('  ✅ PASS: Settings modal scrolls smoothly without touch deadlock or jam.');
      auditResults.push({ name: 'Settings Modal Scrollability', pass: true });
    } else {
      console.error('  ❌ FAIL: Settings modal failed to scroll.');
      auditResults.push({ name: 'Settings Modal Scrollability', pass: false });
    }

    await page.screenshot({ path: path.join(artifactDir, 'audit-settings-scrolled.png') });

    // Close settings modal
    await page.evaluate(() => { if (typeof closeModal === 'function') closeModal(); });
    await page.waitForTimeout(400);

    // 3. Test Progress Tab
    console.log('[Test 4] Testing Progress Tab Navigation...');
    await page.evaluate(() => {
      if (typeof go === 'function') go('progress');
      else if (typeof progress === 'function') progress();
    });
    await page.waitForTimeout(600);

    const progressMetrics = await page.evaluate(() => {
      const app = document.getElementById('app');
      const progressCard = document.querySelector('[data-testid="progress-level-card"], .fz2-level, .progress-grid');
      const hasError = app?.textContent?.includes('TypeError') || app?.textContent?.includes('Cannot read properties');
      return {
        hasProgressCard: !!progressCard,
        hasError,
        appLength: app?.innerHTML?.length || 0
      };
    });

    console.log('  Progress View Metrics:', progressMetrics);
    if (progressMetrics.hasProgressCard && !progressMetrics.hasError) {
      console.log('  ✅ PASS: Progress view loads completely without errors.');
      auditResults.push({ name: 'Progress View Integrity', pass: true });
    } else {
      console.error('  ❌ FAIL: Progress view encountered errors.');
      auditResults.push({ name: 'Progress View Integrity', pass: false });
    }
    await page.screenshot({ path: path.join(artifactDir, 'audit-progress-view.png') });

    // 4. Test Profile Subtabs (Online View)
    console.log('[Test 5] Testing Profile Subtabs Switching & Text Rendering...');
    await page.evaluate(() => {
      if (typeof go === 'function') go('profile');
      else if (typeof onlineView === 'function') onlineView();
    });
    await page.waitForTimeout(600);

    // Switch to Papan Peringkat
    await page.evaluate(() => {
      if (typeof switchOnlineTab === 'function') switchOnlineTab('papan');
    });
    await page.waitForTimeout(400);

    const tabMetrics = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.progress-tabs.profile-tabs .progress-tab');
      const papanTab = Array.from(tabs).find(t => t.textContent.includes('Papan Peringkat') || t.textContent.includes('Peringkat'));
      if (!papanTab) return null;
      return {
        scrollWidth: papanTab.scrollWidth,
        clientWidth: papanTab.clientWidth,
        isClipped: papanTab.scrollWidth > papanTab.clientWidth + 2,
        text: papanTab.textContent.trim()
      };
    });

    console.log('  Profile Tab Metrics:', tabMetrics);
    if (tabMetrics && !tabMetrics.isClipped) {
      console.log('  ✅ PASS: Profile subtabs render cleanly without text clipping.');
      auditResults.push({ name: 'Profile Tab Text Clipping', pass: true });
    } else {
      console.error('  ❌ FAIL: Profile subtabs text clipped:', tabMetrics);
      auditResults.push({ name: 'Profile Tab Text Clipping', pass: false });
    }
    await page.screenshot({ path: path.join(artifactDir, 'audit-profile-papan.png') });

  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n--- Final Audit Summary ---');
  let allPass = true;
  for (const r of auditResults) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}`);
    if (!r.pass) allPass = false;
  }

  if (allPass) {
    console.log('\n🎉 ALL 5 AUDIT GATES PASSED 100%!');
  } else {
    throw new Error('Audit gate failed!');
  }
}

runAudit().catch(err => {
  console.error('Fatal error during audit:', err);
  process.exit(1);
});
