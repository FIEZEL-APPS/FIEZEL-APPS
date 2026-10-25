import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4519;
const REPORT_DIR = path.join(process.cwd(), 'reports', 'english-listening-ux-audit');
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
      '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

const VIEWPORTS = [
  { name: 'android_compact', label: 'Android Compact (360x780)', width: 360, height: 780, dpr: 2 },
  { name: 'iphone14',        label: 'iPhone 14 (390x844)',       width: 390, height: 844, dpr: 2 },
  { name: 'pixel7',          label: 'Pixel 7 (412x915)',         width: 412, height: 915, dpr: 2.6 },
  { name: 'desktop_1280',    label: 'Desktop (1280x800)',        width: 1280, height: 800, dpr: 1 }
];

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Probe server running at http://127.0.0.1:${PORT}`);
  const results = {};

  try {
    const browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`AUDITING VIEWPORT: ${vp.label}`);
      console.log(`======================================================`);
      results[vp.name] = {};

      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr
      });
      const page = await ctx.newPage();

      await page.addInitScript(() => {
        try {
          localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', via: 'akun', at: Date.now() }));
          localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Murid Test', at: Date.now() }));
          localStorage.setItem('fiezel-tour-v1', 'finish');
          localStorage.setItem('fiezel_auth_user', JSON.stringify({ name: 'Test Student', email: 'student@fiezel.com' }));
          localStorage.setItem(
            'fiezel-v4-state',
            JSON.stringify({
              preferences: { activeLevel: 'A1', targetLang: 'en', learnerLocale: 'id' },
              gems: { balance: 15, streak: 3 },
              streak: 3,
              xp: 150,
              toursSeen: { menu: true, library: true, listening: true }
            })
          );
        } catch (_) {}
      });

      // Load app
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Dismiss boot overlays and seed complete auth and onboarding
      await page.evaluate(() => {
        try {
          const splash = document.getElementById('bootSplash') || document.getElementById('fiezelBootSplash');
          if (splash) splash.remove();
          document.documentElement.classList.remove('fz-booting');
          window.__fiezelBootSplashDismissed = true;
          localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', via: 'akun', at: Date.now() }));
          localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Murid Test', at: Date.now() }));
          localStorage.setItem('fiezel-tour-v1', 'finish');
          localStorage.setItem('fiezel_auth_user', JSON.stringify({ name: 'Test Student', email: 'student@fiezel.com' }));
          localStorage.setItem('fiezel-tour-v1', 'finish');
          const st = JSON.parse(localStorage.getItem('fiezel-v4-state') || '{}');
          if (!st.preferences) st.preferences = {};
          st.preferences.activeLevel = 'A1';
          st.preferences.targetLang = 'en';
          st.toursSeen = { menu: true, library: true, listening: true };
          localStorage.setItem('fiezel-v4-state', JSON.stringify(st));
          document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .fz-tour-card, #fzTourCard, .fz-tour-backdrop, .welcome-modal, #welcomeModal').forEach(el => el.remove());
        } catch (_) {}
      });
      await page.waitForTimeout(300);

      // --- 1. AUDIT SKILLS LAB HUB ---
      await page.evaluate(() => {
        if (typeof window.go === 'function') window.go('skills');
      });
      await page.waitForSelector('.fsl-shell, .skills-page', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(500);

      const hubShot = path.join(REPORT_DIR, `${vp.name}-01-skills-hub.png`);
      await page.screenshot({ path: hubShot });
      console.log(`  Saved screenshot: ${vp.name}-01-skills-hub.png`);

      results[vp.name].hub = await page.evaluate(() => {
        const shell = document.querySelector('.fsl-shell');
        const grid = document.querySelector('.fsl-grid');
        const cards = Array.from(document.querySelectorAll('.fsl-card'));
        const bodyHeight = document.body.scrollHeight;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const shellRect = shell ? shell.getBoundingClientRect() : null;

        return {
          windowWidth: vw,
          windowHeight: vh,
          bodyScrollHeight: bodyHeight,
          overflowY: bodyHeight > vh,
          cardCount: cards.length,
          shellRect: shellRect ? { top: shellRect.top, bottom: shellRect.bottom, width: shellRect.width, height: shellRect.height } : null
        };
      });

      // --- 2. AUDIT ENGLISH LISTENING (INITIAL) ---
      await page.evaluate(async () => {
        try {
          if (typeof window.go === 'function') window.go('listening');
        } catch (_) {}
      });
      try {
        await page.waitForSelector('.fsl-card-listening', { timeout: 3500 });
      } catch (_) {
        await page.evaluate(async () => {
          const root = document.getElementById('speakingListeningRoot') || document.getElementById('app');
          const c = await window.FiezelSLAddon.create({
            root: root,
            baseUrl: './features/speaking-listening/',
            getActiveLevel: () => 'A1',
            activeLevel: 'A1',
            tts: {
              play: async () => ({ provider: 'mock', ok: true }),
              stop: () => {},
              prefetch: () => {}
            },
            gems: { balance: () => 12, spend: () => true }
          });
          window.speakingListeningController = c;
          c.mount(root);
          c.open('listening', 'A1');
        });
        await page.waitForSelector('.fsl-card-listening', { timeout: 4000 });
      }

      // Ensure tour card is dismissed and deterministic 4-choice question is picked
      await page.evaluate(() => {
        document.querySelectorAll('.fz-tour-card, #fzTourCard, .fz-tour-backdrop').forEach(el => el.remove());
        const c = window.speakingListeningController;
        if (c && Array.isArray(c.items)) {
          const idx = c.items.findIndex(it => it.options && it.options.length >= 4);
          if (idx > 0) {
            const item = c.items.splice(idx, 1)[0];
            c.items.unshift(item);
            c.renderSession();
          }
        }
      });
      await page.waitForTimeout(400);

      const listenInitialShot = path.join(REPORT_DIR, `${vp.name}-02-listening-initial.png`);
      await page.screenshot({ path: listenInitialShot });
      console.log(`  Saved screenshot: ${vp.name}-02-listening-initial.png`);

      results[vp.name].listeningInitial = await page.evaluate(() => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const docH = document.documentElement.scrollHeight;
        const card = document.querySelector('.fsl-card-listening');
        const topbar = document.querySelector('.topbar') || document.querySelector('.skill-page-topbar');
        const h2 = card ? card.querySelector('h2') : null;
        const player = card ? card.querySelector('.fsl-player') : null;
        const mascot = card ? card.querySelector('.fsl-mascot-slot') : null;
        const playBtn = card ? card.querySelector('.fsl-play-hero') : null;
        const work = card ? card.querySelector('.fsl-work') : null;
        const options = Array.from(card ? card.querySelectorAll('.fsl-option') : []);
        const gemFooter = card ? card.querySelector('.fsl-gem-footer') : null;
        const bottomnav = document.querySelector('.bottomnav');

        const cardR = card ? card.getBoundingClientRect() : null;
        const playR = playBtn ? playBtn.getBoundingClientRect() : null;
        const playerR = player ? player.getBoundingClientRect() : null;
        const mascotR = mascot ? mascot.getBoundingClientRect() : null;
        const gemR = gemFooter ? gemFooter.getBoundingClientRect() : null;
        const topbarR = topbar ? topbar.getBoundingClientRect() : null;

        const spaceAboveCard = cardR ? cardR.top : 0;
        const spaceBelowCard = cardR ? (vh - cardR.bottom) : 0;
        const cardFitsViewport = cardR ? (cardR.top >= 0 && cardR.bottom <= vh) : false;

        return {
          windowWidth: vw,
          windowHeight: vh,
          docScrollHeight: docH,
          overflowY: docH > vh + 1,
          cardFitsViewport,
          spaceAboveCard: Math.round(spaceAboveCard),
          spaceBelowCard: Math.round(spaceBelowCard),
          cardHeight: cardR ? Math.round(cardR.height) : 0,
          cardWidth: cardR ? Math.round(cardR.width) : 0,
          topbarHeight: topbarR ? Math.round(topbarR.height) : 0,
          playerHeight: playerR ? Math.round(playerR.height) : 0,
          mascotSlotHeight: mascotR ? Math.round(mascotR.height) : 0,
          mascotSlotWidth: mascotR ? Math.round(mascotR.width) : 0,
          playHeroHeight: playR ? Math.round(playR.height) : 0,
          optionsCount: options.length,
          optionsHeight: work ? Math.round(work.getBoundingClientRect().height) : 0,
          gemFooterHeight: gemR ? Math.round(gemR.height) : 0,
          bottomnavVisible: bottomnav ? window.getComputedStyle(bottomnav).display !== 'none' : false
        };
      });

      // --- 3. AUDIT PLAYING AUDIO ---
      await page.evaluate(() => {
        const pBtn = document.querySelector('[data-play]');
        if (pBtn) pBtn.click();
      });
      await page.waitForTimeout(400);

      const listenPlayingShot = path.join(REPORT_DIR, `${vp.name}-03-listening-playing.png`);
      await page.screenshot({ path: listenPlayingShot });
      console.log(`  Saved screenshot: ${vp.name}-03-listening-playing.png`);

      // --- 4. AUDIT ANSWERED STATE & FLOATING BUTTON COLLISION ---
      await page.evaluate(() => {
        // Unlock work if still disabled
        const work = document.querySelector('[data-work]');
        if (work) work.removeAttribute('disabled');
        const opt = document.querySelector('.fsl-option');
        if (opt) opt.click();
      });
      await page.waitForTimeout(500);

      const listenAnsweredShot = path.join(REPORT_DIR, `${vp.name}-04-listening-answered.png`);
      await page.screenshot({ path: listenAnsweredShot });
      console.log(`  Saved screenshot: ${vp.name}-04-listening-answered.png`);

      results[vp.name].listeningAnswered = await page.evaluate(() => {
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const docH = document.documentElement.scrollHeight;
        const card = document.querySelector('.fsl-card-listening');
        const feedback = document.querySelector('.fsl-feedback');
        const nextBtn = document.querySelector('button[data-next]');
        const nextActions = document.querySelector('.fsl-feedback .fsl-actions') || (nextBtn ? nextBtn.parentElement : null);
        const gemFooter = document.querySelector('.fsl-gem-footer');

        const cardR = card ? card.getBoundingClientRect() : null;
        const fbR = feedback ? feedback.getBoundingClientRect() : null;
        const nextR = nextBtn ? nextBtn.getBoundingClientRect() : null;
        const gemR = gemFooter ? gemFooter.getBoundingClientRect() : null;

        let nextBtnOverlapsFeedbackText = false;
        let nextBtnOverlapsGemFooter = false;

        if (nextR && fbR) {
          const fbTextP = feedback.querySelector('p');
          if (fbTextP) {
            const pR = fbTextP.getBoundingClientRect();
            if (nextR.top < pR.bottom && nextR.bottom > pR.top) {
              nextBtnOverlapsFeedbackText = true;
            }
          }
        }
        if (nextR && gemR) {
          if (nextR.top < gemR.bottom && nextR.bottom > gemR.top) {
            nextBtnOverlapsGemFooter = true;
          }
        }

        return {
          docScrollHeight: docH,
          overflowY: docH > vh + 1,
          overflowAmountPx: Math.max(0, docH - vh),
          cardBottom: cardR ? Math.round(cardR.bottom) : 0,
          feedbackBottom: fbR ? Math.round(fbR.bottom) : 0,
          nextBtnTop: nextR ? Math.round(nextR.top) : 0,
          nextBtnBottom: nextR ? Math.round(nextR.bottom) : 0,
          nextBtnOverlapsFeedbackText,
          nextBtnOverlapsGemFooter,
          nextBtnIsFixed: nextActions ? window.getComputedStyle(nextActions).position === 'fixed' : false
        };
      });

      // --- 5. AUDIT LISTENING DICTATION MODE ---
      await page.evaluate(() => {
        const c = window.speakingListeningController;
        if (c && Array.isArray(c.items)) {
          const dictIdx = c.items.findIndex(it => it.mode === 'dictation');
          if (dictIdx >= 0) {
            const item = c.items.splice(dictIdx, 1)[0];
            c.items.unshift(item);
            c.renderSession();
          }
        }
      });
      await page.waitForTimeout(400);

      const dictationShot = path.join(REPORT_DIR, `${vp.name}-05-listening-dictation.png`);
      await page.screenshot({ path: dictationShot });
      console.log(`  Saved screenshot: ${vp.name}-05-listening-dictation.png`);

      results[vp.name].listeningDictation = await page.evaluate(() => {
        const vh = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const input = document.querySelector('.fsl-input[data-dictation]');
        const submitBtn = document.querySelector('button[data-submit]');
        const card = document.querySelector('.fsl-card-listening');
        const cardR = card ? card.getBoundingClientRect() : null;

        return {
          hasDictationInput: !!input,
          hasSubmitBtn: !!submitBtn,
          docScrollHeight: docH,
          overflowY: docH > vh + 1,
          cardHeight: cardR ? Math.round(cardR.height) : 0,
          cardFitsViewport: cardR ? (cardR.top >= 0 && cardR.bottom <= vh) : false
        };
      });

      // --- 6. AUDIT LISTENING EXAM (TOEFL/IELTS NOTE-TAKING SIMULATION in B1) ---
      await page.evaluate(async () => {
        try {
          const c = window.speakingListeningController;
          if (c) {
            c.open('listening_exam', 'B1');
          }
        } catch (_) {}
      });
      await page.waitForTimeout(600);

      const examShot = path.join(REPORT_DIR, `${vp.name}-06-listening-exam.png`);
      await page.screenshot({ path: examShot });
      console.log(`  Saved screenshot: ${vp.name}-06-listening-exam.png`);

      results[vp.name].listeningExam = await page.evaluate(() => {
        const vh = window.innerHeight;
        const docH = document.documentElement.scrollHeight;
        const card = document.querySelector('.fsl-card');
        const notes = document.querySelector('.fsl-notes');
        const examList = document.querySelector('.fsl-exam-list');
        const questions = Array.from(document.querySelectorAll('.fsl-exam-q'));
        const submitBtn = document.querySelector('[data-submit-exam]');
        const source = document.querySelector('.fsl-source');

        return {
          windowHeight: vh,
          docScrollHeight: docH,
          overflowY: docH > vh + 1,
          overflowAmountPx: Math.max(0, docH - vh),
          hasNotes: !!notes,
          notesHeight: notes ? Math.round(notes.getBoundingClientRect().height) : 0,
          hasSourceText: !!source,
          questionCount: questions.length,
          submitVisible: submitBtn ? (submitBtn.getBoundingClientRect().bottom <= vh) : false
        };
      });

      await ctx.close();
    }

    fs.writeFileSync(path.join(REPORT_DIR, 'AUDIT_SUMMARY.json'), JSON.stringify(results, null, 2));
    console.log(`\nAudit completed successfully. Results saved to:`);
    console.log(path.join(REPORT_DIR, 'AUDIT_SUMMARY.json'));

    await browser.close();
  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    server.close();
  }
});
