import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pw = require('C:/Users/hp/fiezel-apps/node_modules/playwright');
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'http://localhost:4173';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4'
};

async function routeRepo(page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: MIME[path.extname(target)] || 'application/octet-stream',
      body: fs.readFileSync(target)
    });
  });
}

async function boot(browser, isMobile) {
  const page = await browser.newPage({
    viewport: isMobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    deviceScaleFactor: isMobile ? 2 : 1,
    serviceWorkers: 'block'
  });
  await routeRepo(page);
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  });

  await page.goto(ORIGIN + '/');
  await page.waitForFunction(() => typeof window.startTokenOrderSession === 'function' && self.FiezelGrammarUpgrade && self.FiezelTutorBrain, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove();
  });
  await page.evaluate(() => {
    window.__gt = { q: null };
    const U = self.FiezelGrammarUpgrade;
    U.showGrammarHint = function (q) { window.__gt.q = q; };
  });
  return page;
}

const pick = async (page, j) => {
  await page.evaluate(k => document.querySelectorAll('#options .option')[k]?.click(), j);
  await page.waitForTimeout(700);
};

async function mcQ(page) {
  await page.evaluate(() => window.startGrammarQuickSession());
  await page.waitForTimeout(2000);
  for (let retry = 0; retry < 15; retry++) {
    await page.evaluate(() => {
      window.__gt.q = null;
      document.getElementById('quizGrammarHint')?.click();
    });
    await page.waitForTimeout(400);
    const q = await page.evaluate(() => {
      const q = window.__gt.q;
      return q && q.options && { type: q.type, options: q.options.slice(), answerIndex: q.answerIndex, skill: q.lessonSkill || q.skill };
    });
    if (q) return q;
    await page.waitForTimeout(600);
  }
  return null;
}

(async () => {
  const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    for (const isMobile of [true, false]) {
      const mode = isMobile ? 'mobile' : 'desktop';
      console.log(`\n=== RUNNING ${mode.toUpperCase()} ===`);
      const page = await boot(browser, isMobile);

      const q = await mcQ(page);
      console.log('mcQ question:', q);
      if (!q || !q.options) {
        console.error(`Failed to get question on ${mode}`);
        await page.close();
        continue;
      }

      const wrongIdx = q.options.findIndex((_, i) => i !== q.answerIndex);
      console.log(`Picking wrong option index ${wrongIdx}: ${q.options[wrongIdx]}`);
      await pick(page, wrongIdx);
      await page.waitForTimeout(1200);

      // Inspect tutorHintModal and tutorTurn
      const modalData = await page.evaluate(() => {
        const modal = document.getElementById('tutorHintModal');
        const backdrop = document.getElementById('tutorHintModalBackdrop');
        const tutorTurn = document.getElementById('tutorTurn');

        const getStyles = el => {
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            display: cs.display,
            position: cs.position,
            zIndex: cs.zIndex,
            opacity: cs.opacity,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            text: el.innerText.trim()
          };
        };

        return {
          hasModal: !!modal,
          hasBackdrop: !!backdrop,
          modal: getStyles(modal),
          backdrop: getStyles(backdrop),
          tutorTurn: getStyles(tutorTurn),
          hasRetryBtn: !!document.getElementById('tutorModalRetryBtn'),
          hasGiveUpBtn: !!document.getElementById('tutorModalGiveUpBtn'),
          hasCloseX: !!document.getElementById('tutorModalCloseX'),
          modalCalloutText: document.querySelector('.tutor-modal-callout-text')?.innerText || '',
          badgeText: document.querySelector('.tutor-modal-badge')?.innerText || ''
        };
      });

      console.log(`Modal telemetry for ${mode}:`, JSON.stringify(modalData, null, 2));

      const shotName = isMobile ? 'tutor-hint-popup-mobile-verified.png' : 'tutor-hint-popup-desktop-verified.png';
      const shotPath = path.resolve('C:/Users/hp/.gemini/antigravity/brain/69d6f9b4-672c-43a0-aacc-bb80ef33145a', shotName);
      await page.screenshot({ path: shotPath });
      console.log(`Saved screenshot to ${shotPath}`);

      // Now test clicking #tutorModalRetryBtn
      console.log(`Testing #tutorModalRetryBtn click on ${mode}...`);
      await page.evaluate(() => {
        document.getElementById('tutorModalRetryBtn')?.click();
      });
      await page.waitForTimeout(500);

      const postDismiss = await page.evaluate(() => {
        return {
          hasModal: !!document.getElementById('tutorHintModal'),
          hasBackdrop: !!document.getElementById('tutorHintModalBackdrop'),
          optionsReady: [...document.querySelectorAll('#options .option:not(:disabled)')].length
        };
      });
      console.log(`Post dismiss telemetry for ${mode}:`, postDismiss);

      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log('\nAll tests finished successfully.');
})().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
