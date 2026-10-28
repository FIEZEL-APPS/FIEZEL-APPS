import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'file:///c:/Users/hp/fiezel-apps/node_modules/playwright/index.mjs';

const ROOT = 'C:/Users/hp/fiezel-mobile-audit-m025-712';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  const browser = await chromium.launch({ headless: true });
  // Audit on 390x844 (standard iPhone) AND 375x667 (small iPhone SE)
  const viewports = [
    { name: 'iPhone-14', w: 390, h: 844 },
    { name: 'iPhone-SE', w: 375, h: 667 }
  ];

  for (const vp of viewports) {
    console.log(`\n================ AUDITING ${vp.name} (${vp.w}x${vp.h}) ================`);
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();

    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('fz_user_registered', '1');
      localStorage.setItem('fz_auth_mode', 'guest');
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ locale: 'id' }));
      setInterval(() => {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting', 'fz-auth-open');
      }, 50);
    });

    await page.goto(`http://127.0.0.1:${port}/index.html`);
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
      window.validateLearnerNameAvailability = async () => ({ ok: true });
      window.showOnboarding(window, { force: true });
    });
    await page.waitForTimeout(600);

    // Check Step 1 (Name) fit
    const s1Fit = await page.evaluate(() => {
      const sheet = document.querySelector('.fiezel-sheet');
      const adv = document.querySelector('[data-ob-advance]');
      const r = adv ? adv.getBoundingClientRect() : null;
      return {
        bottom: r ? r.bottom : null,
        windowH: window.innerHeight,
        fits: r ? r.bottom <= window.innerHeight : false,
        overflow: document.documentElement.scrollHeight > window.innerHeight
      };
    });
    console.log(`Step 1 Fit on ${vp.name}:`, s1Fit);

    // Progress to Step 2
    await page.fill('[data-ob-name]', 'Kenji');
    await page.click('[data-ob-advance]');
    await page.waitForTimeout(400);

    // Select Japanese course
    await page.click('[data-ob-course="ja"]');
    await page.waitForTimeout(400);
    const s2Fit = await page.evaluate(() => {
      const adv = document.querySelector('[data-ob-advance]');
      const r = adv ? adv.getBoundingClientRect() : null;
      return {
        bottom: r ? r.bottom : null,
        windowH: window.innerHeight,
        fits: r ? r.bottom <= window.innerHeight : false,
        overflow: document.documentElement.scrollHeight > window.innerHeight
      };
    });
    console.log(`Step 2 (Course) Fit on ${vp.name}:`, s2Fit);

    await page.click('[data-ob-advance]');
    await page.waitForTimeout(400);

    // Step 3 Goal
    await page.click('[data-ob-goal]:first-child');
    await page.waitForTimeout(400);
    const s3Fit = await page.evaluate(() => {
      const adv = document.querySelector('[data-ob-advance]');
      const r = adv ? adv.getBoundingClientRect() : null;
      return {
        bottom: r ? r.bottom : null,
        windowH: window.innerHeight,
        fits: r ? r.bottom <= window.innerHeight : false,
        overflow: document.documentElement.scrollHeight > window.innerHeight
      };
    });
    console.log(`Step 3 (Goal) Fit on ${vp.name}:`, s3Fit);

    await page.click('[data-ob-advance]');
    await page.waitForTimeout(600);

    // Step 4 Placement Path
    const s4Fit = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.fiezel-path-card')).map(c => {
        const r = c.getBoundingClientRect();
        return { class: c.className, top: r.top, bottom: r.bottom, height: r.height, fits: r.bottom <= window.innerHeight };
      });
      return {
        windowH: window.innerHeight,
        overflow: document.documentElement.scrollHeight > window.innerHeight,
        cards
      };
    });
    console.log(`Step 4 (Path Choice) Fit on ${vp.name}:`, s4Fit);

    // Audit Path Beginner (Quick Win)
    console.log('\n--- Auditing Quick-Win Lesson (Path Beginner) ---');
    await page.click('.fiezel-path-card.is-beginner [data-ob-beginner]');
    await page.waitForTimeout(1500);

    const qwAudit = await page.evaluate(() => {
      const stem = document.getElementById('quizStem')?.innerText || '';
      const options = Array.from(document.querySelectorAll('#options .option')).map(b => b.innerText);
      const card = document.querySelector('.quiz-shell .card');
      const cardRect = card ? card.getBoundingClientRect() : null;
      const topbar = document.querySelector('.quiz-topbar');
      const topbarPos = topbar ? window.getComputedStyle(topbar).position : null;
      return {
        stem,
        options,
        topbarPos,
        cardRect,
        windowH: window.innerHeight,
        cardFits: cardRect ? cardRect.bottom <= window.innerHeight : false
      };
    });
    console.log(`Quick-Win Lesson Q1 on ${vp.name}:`, qwAudit);

    // Now test Topbar scrolling on quiz
    await page.evaluate(() => window.scrollBy(0, 150));
    await page.waitForTimeout(300);
    const scrollAudit = await page.evaluate(() => {
      const topbar = document.querySelector('.quiz-topbar');
      const r = topbar ? topbar.getBoundingClientRect() : null;
      return {
        scrollY: window.scrollY,
        topbarTop: r ? r.top : null,
        topbarPos: topbar ? window.getComputedStyle(topbar).position : null
      };
    });
    console.log(`Scroll Audit on Quiz Topbar (${vp.name}):`, scrollAudit);

    await page.screenshot({ path: `C:/Users/hp/.gemini/antigravity/brain/d3f56d3b-9b20-4aed-abe2-a5d2b1e722f5/audit-${vp.name}-qw-q1.png` });

    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log('\n>>> AUDIT SCRIPT FINISHED <<<');
});
