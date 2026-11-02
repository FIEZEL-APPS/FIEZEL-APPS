import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const rootDir = process.cwd();

function startStaticServer(port = 8891) {
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
  console.log('=== RUNNING ADAPTIVE CAT & VOCAB CAPTURE EMPIRICAL PROBE ===\n');
  const server = await startStaticServer(8891);
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });

    await context.addInitScript(() => {
      localStorage.setItem('fiezel_test_mode', '1');
      localStorage.setItem('fz_target_course', 'ja');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        v: 1,
        signedIn: true,
        at: Date.now(),
        role: 'murid',
        name: 'Empirical Tester'
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
        done: true,
        name: 'Empirical Tester',
        course: 'ja',
        at: Date.now()
      }));
    });

    const page = await context.newPage();
    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('CAT') || txt.includes('placement') || txt.includes('Error')) {
        console.log('BROWSER LOG:', txt);
      }
    });

    await page.goto('http://127.0.0.1:8891/?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 1. Verify Adaptive CAT placement engine exposed on window
    const engineExposed = await page.evaluate(() => {
      return typeof window.FiezelAdaptiveCatEngine !== 'undefined' &&
             typeof window.startAdaptiveCatPlacement === 'function' &&
             typeof window.FiezelPlacementBankJa !== 'undefined' &&
             typeof window.FiezelPlacementBankEn !== 'undefined';
    });
    console.log('[PROBE 1] Engine & Banks exposed on window:', engineExposed ? 'PASS' : 'FAIL');
    if (!engineExposed) throw new Error('CAT engine or banks not exposed on window');

    // 2. Start Japanese CAT Placement
    console.log('[PROBE 2] Launching Japanese CAT Placement...');
    await page.evaluate(() => window.startAdaptiveCatPlacement('ja'));
    await page.waitForTimeout(500);

    const modalVisible = await page.evaluate(() => {
      const modal = document.getElementById('modal');
      return modal && !modal.classList.contains('hidden');
    });
    console.log('[PROBE 2.1] Modal visible:', modalVisible ? 'PASS' : 'FAIL');
    if (!modalVisible) throw new Error('CAT Modal failed to open');

    // Answer questions iteratively
    let step = 1;
    let completed = false;
    while (step <= 18 && !completed) {
      const qInfo = await page.evaluate(() => {
        const stepBadge = document.querySelector('.fz-cat-step');
        const questionText = document.querySelector('.fz-cat-question');
        const options = Array.from(document.querySelectorAll('.fz-cat-option'));
        const receipt = document.querySelector('.fz-cat-receipt');
        if (receipt) return { isReceipt: true };
        return {
          stepText: stepBadge ? stepBadge.textContent.trim() : '',
          questionText: questionText ? questionText.textContent.trim() : '',
          optionCount: options.length
        };
      });

      if (qInfo.isReceipt) {
        completed = true;
        console.log(`[PROBE 2.2] CAT Placement finished at step ${step - 1}!`);
        break;
      }

      // Check Anti-Leak: ensure no hint button or answer reveal button exists
      const hintExists = await page.evaluate(() => {
        return !!document.querySelector('.hint-btn, .answer-peek, [data-hint]');
      });
      if (hintExists) throw new Error('Anti-Leak Exam Purity violation: hint button detected!');

      // Click option 0
      await page.click('.fz-cat-option[data-opt-index="0"]');
      await page.waitForTimeout(150);
      step++;
    }

    if (!completed) {
      throw new Error('CAT Placement did not complete within 18 steps');
    }

    // 3. Inspect Receipt & Saved Result in localStorage
    const placementResult = await page.evaluate(() => {
      const raw = localStorage.getItem('fz_cat_placement_ja');
      return raw ? JSON.parse(raw) : null;
    });

    console.log('[PROBE 3] CAT Result saved in localStorage:', placementResult ? 'PASS' : 'FAIL');
    console.log('         Details:', JSON.stringify(placementResult));
    if (!placementResult || !placementResult.assignedLevel || typeof placementResult.calibratedTheta !== 'number') {
      throw new Error('Invalid CAT placement result in localStorage');
    }

    // 4. Test In-Call Vocabulary Capture Event Handling & Persistence
    console.log('[PROBE 4] Testing In-Call Real-Time Vocabulary Capture Event...');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('fz:vocab-harvested', {
        detail: {
          word: '素晴らしい',
          reading: 'すばらしい',
          meaning: 'Luar biasa / mengagumkan',
          course: 'ja',
          source: 'call-empirical-test'
        }
      }));
    });
    await page.waitForTimeout(300);

    const harvestedQueue = await page.evaluate(() => {
      const raw = localStorage.getItem('fz_fsrs_harvested_queue');
      return raw ? JSON.parse(raw) : [];
    });

    const hasHarvestedWord = harvestedQueue.some(item => item.word === '素晴らしい');
    console.log('[PROBE 4.1] Harvested vocabulary found in queue:', hasHarvestedWord ? 'PASS' : 'FAIL');
    if (!hasHarvestedWord) throw new Error('Harvested vocabulary was not queued in localStorage');

    // 5. English CAT Placement Quick Run
    console.log('[PROBE 5] Launching English CAT Placement...');
    await page.evaluate(() => window.startAdaptiveCatPlacement('en'));
    await page.waitForTimeout(500);

    let enStep = 1;
    let enCompleted = false;
    while (enStep <= 18 && !enCompleted) {
      const isReceipt = await page.evaluate(() => !!document.querySelector('.fz-cat-receipt'));
      if (isReceipt) {
        enCompleted = true;
        console.log(`[PROBE 5.1] English CAT Placement finished at step ${enStep - 1}!`);
        break;
      }
      await page.click('.fz-cat-option[data-opt-index="0"]');
      await page.waitForTimeout(150);
      enStep++;
    }

    const enResult = await page.evaluate(() => {
      const raw = localStorage.getItem('fz_cat_placement_en');
      return raw ? JSON.parse(raw) : null;
    });
    console.log('[PROBE 5.2] English CAT Result saved:', enResult ? 'PASS' : 'FAIL');
    console.log('           Details:', JSON.stringify(enResult));
    if (!enResult || !enResult.assignedLevel) {
      throw new Error('English CAT placement failed');
    }

    console.log('\n=== ALL PROBE CHECKS PASSED EMPIRICALLY (100% HIJAU) ===\n');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('\nPROBE ERROR:', err);
  process.exit(1);
});
