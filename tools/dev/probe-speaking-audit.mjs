import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml',
      '.png': 'image/png', '.woff2': 'font/woff2'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(4531, '127.0.0.1', async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of [{ name: 'iphone14', w: 390, h: 844 }, { name: 'desktop', w: 1280, h: 800 }, { name: 'pixel7', w: 412, h: 915 }]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.addInitScript(() => {
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', via: 'akun', at: Date.now() }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Murid Test', at: Date.now() }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      localStorage.setItem('fiezel-v4-state', JSON.stringify({
        preferences: { activeLevel: 'A1', targetLang: 'en' },
        toursSeen: { menu: true, library: true, listening: true }
      }));
    });
    await page.goto('http://127.0.0.1:4531/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .fz-tour-card, #fzTourCard, .fz-tour-backdrop, #fiezelBootSplash').forEach(el => el.remove());
      if (typeof window.go === 'function') window.go('speaking');
    });
    try {
      await page.waitForSelector('.fsl-card-speaking', { timeout: 3500 });
    } catch (_) {
      await page.evaluate(async () => {
        const root = document.getElementById('speakingListeningRoot') || document.getElementById('app');
        const c = await window.FiezelSLAddon.create({
          root: root,
          baseUrl: './features/speaking-listening/',
          getActiveLevel: () => 'A1',
          activeLevel: 'A1',
          tts: { play: async () => ({ provider: 'mock', ok: true }), stop: () => {}, prefetch: () => {} },
          gems: { balance: () => 12, spend: () => true }
        });
        window.speakingListeningController = c;
        c.mount(root);
        c.open('speaking', 'A1');
      });
      await page.waitForSelector('.fsl-card-speaking', { timeout: 4000 });
    }
    await page.waitForTimeout(400);

    const initialMetrics = await page.evaluate(() => {
      const card = document.querySelector('.fsl-card-speaking');
      const cardR = card ? card.getBoundingClientRect() : null;
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      return {
        cardTop: cardR ? Math.round(cardR.top) : 0,
        cardBottom: cardR ? Math.round(cardR.bottom) : 0,
        cardHeight: cardR ? Math.round(cardR.height) : 0,
        spaceBelow: cardR ? Math.round(vh - cardR.bottom) : 0,
        overflowY: docH > vh + 1
      };
    });
    console.log(`[${vp.name}] Speaking Initial Metrics:`, initialMetrics);
    await page.screenshot({ path: `reports/english-listening-ux-audit/${vp.name}-speaking-initial.png` });

    // Mock speech recognition result to trigger feedback
    await page.evaluate(() => {
      const c = window.speakingListeningController;
      if (c && c.current()) {
        const item = c.current();
        c.finishItem(item, { passed: true, score: 85, conceptsMatched: 4, conceptsTotal: 5 }, '<div class="fsl-transcript">I am going to the station today</div>');
      }
    });
    await page.waitForTimeout(400);

    const answeredMetrics = await page.evaluate(() => {
      const card = document.querySelector('.fsl-card-speaking');
      const cardR = card ? card.getBoundingClientRect() : null;
      const nextBtn = document.querySelector('.fsl-feedback button[data-next]');
      const nextR = nextBtn ? nextBtn.getBoundingClientRect() : null;
      const transcript = document.querySelector('.fsl-transcript');
      const transR = transcript ? transcript.getBoundingClientRect() : null;
      const vh = window.innerHeight;
      const docH = document.documentElement.scrollHeight;
      return {
        cardTop: cardR ? Math.round(cardR.top) : 0,
        cardBottom: cardR ? Math.round(cardR.bottom) : 0,
        overflowY: docH > vh + 1,
        nextBtnOverlapsTranscript: Boolean(nextR && transR && nextR.top < transR.bottom)
      };
    });
    console.log(`[${vp.name}] Speaking Answered Metrics:`, answeredMetrics);
    await page.screenshot({ path: `reports/english-listening-ux-audit/${vp.name}-speaking-answered.png` });
    await page.close();
  }
  console.log('Speaking screenshots captured successfully!');
  await browser.close();
  server.close();
});
