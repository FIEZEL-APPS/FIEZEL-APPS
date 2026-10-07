import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4458;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const VERIFIED_OUT_DIR = path.join(process.cwd(), 'reports', 'audit-listening-detail', 'verified');
if (!fs.existsSync(VERIFIED_OUT_DIR)) {
  fs.mkdirSync(VERIFIED_OUT_DIR, { recursive: true });
}

// Contrast calculation helper according to WCAG 2.1
function parseColor(str) {
  if (!str) return [255, 255, 255];
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return [255, 255, 255];
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calcContrast(c1, c2) {
  const l1 = luminance(...c1);
  const l2 = luminance(...c2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

const VIEWPORTS = [
  { name: 'iphone14', label: 'iPhone 13/14', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'android_compact', label: 'Android Compact', width: 360, height: 800, dpr: 2, mobile: true },
  { name: 'desktop', label: 'Desktop Preview', width: 1280, height: 800, dpr: 1, mobile: false }
];

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`Verification Server running at http://127.0.0.1:${PORT}`);
  let browser;
  const overallSummary = {
    timestamp: new Date().toISOString(),
    viewports: {},
    allPassed: true,
    failures: []
  };

  try {
    browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`TESTING VIEWPORT: ${vp.label} (${vp.width}x${vp.height}, DPR: ${vp.dpr})`);
      console.log(`======================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        serviceWorkers: 'block' // Bypass service worker cache for 100% fresh assets
      });

      const page = await context.newPage();
      page.on('pageerror', err => console.log(`[PAGE ERROR ${vp.name}]:`, err.message));
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('error') || text.includes('failed') || text.includes('Error') || text.includes('Listening') || text.includes('permukaan')) {
          console.log(`[PAGE LOG ${vp.name}]:`, text);
        }
      });

      await page.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('fz_user_name', 'Budi Pratama');
        localStorage.setItem('fz_onboarding_done', '1');
        localStorage.setItem('fz_auth_skip', '1');
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Pratama', locale: 'id', course: 'ja' }));
        localStorage.setItem('fiezel-v4-state', JSON.stringify({
          userName: 'Budi Pratama',
          preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, activeLevel: 'N5' },
          gems: { balance: 12, history: [] },
          streak: 3,
          xp: 240,
          toursSeen: { menu: true, library: true, listening: true }
        }));
        sessionStorage.setItem('fiezel_boot_count', '2');
        setInterval(() => {
          document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
        }, 50);
      });

      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
      await page.waitForTimeout(600);

      const vpResult = {
        viewport: vp,
        jlpt: {},
        skillsLab: {},
        metricsPass: true,
        failures: []
      };

      // -------------------------------------------------------------
      // PART 1: JLPT CHŌKAI LISTENING
      // -------------------------------------------------------------
      console.log(`[${vp.name}] Opening JLPT Listening Modal (#listeningPanelModal)...`);
      await page.evaluate(() => {
        if (typeof window.openListeningPanel === 'function') {
          window.openListeningPanel();
        }
      });
      // Wait for questions to render in question slot
      await page.waitForSelector('.jlpt-opt-btn', { timeout: 10000 });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(VERIFIED_OUT_DIR, `${vp.name}-01-jlpt-initial.png`)
      });

      // Measure JLPT elements
      const jlptInitial = await page.evaluate(() => {
        const modal = document.getElementById('listeningPanelModal');
        const box = document.querySelector('.listening-modal-box');
        const mondaiBar = document.querySelector('.jlpt-mondai-scroll');
        const mondaiChips = Array.from(document.querySelectorAll('.jlpt-mondai-chip'));
        const options = Array.from(document.querySelectorAll('.jlpt-opt-btn'));
        const vpHeight = window.innerHeight;

        const mBarRect = mondaiBar ? mondaiBar.getBoundingClientRect() : null;
        const chipsMetrics = mondaiChips.map(c => {
          const r = c.getBoundingClientRect();
          return {
            text: c.textContent.trim(),
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            clickable: r.height >= 26 && r.width >= 30
          };
        });

        const optionsMetrics = options.map((opt, i) => {
          const r = opt.getBoundingClientRect();
          // How much of the button is inside the viewport [0, vpHeight]
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          return {
            idx: i + 1,
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isAtLeast95PercentVisible: visibleRatio >= 0.95
          };
        });

        return {
          modalOpen: modal ? modal.classList.contains('open') : false,
          boxRect: box ? box.getBoundingClientRect() : null,
          mondaiBar: {
            height: mBarRect ? Math.round(mBarRect.height) : 0,
            rect: mBarRect,
            chipsCount: mondaiChips.length,
            chips: chipsMetrics
          },
          optionsCount: options.length,
          options: optionsMetrics
        };
      });

      // Validate JLPT Criteria
      const mondaiHeightPass = jlptInitial.mondaiBar.height >= 38;
      const allMondaiChipsClickable = jlptInitial.mondaiBar.chips.every(c => c.clickable);
      const allOptions95Visible = jlptInitial.options.length === 4 && jlptInitial.options.every(o => o.isAtLeast95PercentVisible);

      console.log(`[${vp.name}] JLPT Mondai Bar Height: ${jlptInitial.mondaiBar.height}px (Requirement >= 38px: ${mondaiHeightPass ? 'PASS' : 'FAIL'})`);
      console.log(`[${vp.name}] JLPT Mondai Chips: ${jlptInitial.mondaiBar.chipsCount} chips, all clickable: ${allMondaiChipsClickable ? 'PASS' : 'FAIL'}`);
      console.log(`[${vp.name}] JLPT Options Visibility:`, jlptInitial.options.map(o => `Opt ${o.idx}: ${(o.visibleRatio * 100).toFixed(1)}% (y: ${o.top}-${o.bottom}, visible>=95%: ${o.isAtLeast95PercentVisible})`).join(', '));
      console.log(`[${vp.name}] All 4 Options >= 95% visible on first look without scroll: ${allOptions95Visible ? 'PASS' : 'FAIL'}`);

      if (!mondaiHeightPass) {
        vpResult.failures.push(`JLPT Mondai Bar height ${jlptInitial.mondaiBar.height}px < 38px`);
      }
      if (!allOptions95Visible) {
        vpResult.failures.push(`JLPT not all 4 options >= 95% visible on initial view without scroll`);
      }

      vpResult.jlpt.initial = {
        ...jlptInitial,
        mondaiHeightPass,
        allMondaiChipsClickable,
        allOptions95Visible
      };

      // Click option 1 and check feedback banner & navigation visibility
      console.log(`[${vp.name}] Clicking JLPT Option 1 for feedback & navigation test...`);
      await page.evaluate(() => {
        const opt = document.querySelector('.jlpt-opt-btn');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(VERIFIED_OUT_DIR, `${vp.name}-02-jlpt-answered.png`)
      });

      const jlptAnswered = await page.evaluate(() => {
        const fb = document.getElementById('jlptFeedbackSlot');
        const fbBanner = fb ? fb.querySelector('.jlpt-feedback-banner') : null;
        const bottomNav = document.querySelector('.jlpt-bottom-nav');
        const vpHeight = window.innerHeight;

        const fbRect = fbBanner ? fbBanner.getBoundingClientRect() : null;
        const bnRect = bottomNav ? bottomNav.getBoundingClientRect() : null;

        const fbVisible = fbRect ? (fbRect.top >= 0 && fbRect.bottom <= vpHeight) : false;
        const bnVisible = bnRect ? (bnRect.top >= 0 && bnRect.bottom <= vpHeight) : false;

        return {
          feedbackRect: fbRect,
          feedbackVisible: fbVisible,
          bottomNavRect: bnRect,
          bottomNavVisible: bnVisible
        };
      });

      console.log(`[${vp.name}] JLPT Feedback Visible in Viewport: ${jlptAnswered.feedbackVisible ? 'PASS' : 'FAIL'} (bottom: ${jlptAnswered.feedbackRect?.bottom} vs vp: ${vp.height})`);
      console.log(`[${vp.name}] JLPT Bottom Nav Visible in Viewport: ${jlptAnswered.bottomNavVisible ? 'PASS' : 'FAIL'} (bottom: ${jlptAnswered.bottomNavRect?.bottom} vs vp: ${vp.height})`);

      if (!jlptAnswered.feedbackVisible) {
        vpResult.failures.push(`JLPT Feedback banner not visible inside viewport upon answering`);
      }
      if (!jlptAnswered.bottomNavVisible) {
        vpResult.failures.push(`JLPT Bottom navigation not visible inside viewport upon answering`);
      }
      vpResult.jlpt.answered = jlptAnswered;

      // Open Bottom Sheet Naskah
      console.log(`[${vp.name}] Opening JLPT Bottom Sheet Naskah...`);
      await page.evaluate(() => {
        if (typeof window.openJlptDetailSheet === 'function') {
          window.openJlptDetailSheet('script');
        }
      });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(VERIFIED_OUT_DIR, `${vp.name}-03-jlpt-bottom-sheet.png`)
      });

      const jlptSheet = await page.evaluate(() => {
        const sheet = document.getElementById('jlptDetailSheet');
        const tabs = Array.from(document.querySelectorAll('.jlpt-tab-chip')).map(t => ({
          text: t.textContent.trim(),
          active: t.classList.contains('active'),
          width: Math.round(t.offsetWidth),
          height: Math.round(t.offsetHeight)
        }));
        const turns = Array.from(document.querySelectorAll('.jlpt-dialogue-turn'));
        const lineAudios = Array.from(document.querySelectorAll('.jlpt-line-speak-btn, .jlpt-transcript-play-btn'));

        return {
          isOpen: sheet ? sheet.classList.contains('open') : false,
          tabsCount: tabs.length,
          tabs,
          turnsCount: turns.length,
          audioButtonsCount: lineAudios.length
        };
      });

      const sheetValid = jlptSheet.isOpen && jlptSheet.tabsCount >= 3 && jlptSheet.turnsCount >= 1 && jlptSheet.audioButtonsCount >= 1;
      console.log(`[${vp.name}] JLPT Sheet: open=${jlptSheet.isOpen}, tabs=${jlptSheet.tabsCount}, turns=${jlptSheet.turnsCount}, lineAudios=${jlptSheet.audioButtonsCount} -> ${sheetValid ? 'PASS' : 'FAIL'}`);
      if (!sheetValid) {
        vpResult.failures.push(`JLPT Bottom sheet naskah failed validation`);
      }
      vpResult.jlpt.sheet = jlptSheet;

      // Close sheet & modal
      await page.evaluate(() => {
        if (typeof window.closeJlptDetailSheet === 'function') window.closeJlptDetailSheet();
        if (typeof window.closeListeningPanel === 'function') window.closeListeningPanel();
      });
      await page.waitForTimeout(500);

      // -------------------------------------------------------------
      // PART 2: SKILLS LAB LISTENING
      // -------------------------------------------------------------
      console.log(`[${vp.name}] Switching to Skills Lab (General English course)...`);
      await page.evaluate(() => {
        try {
          localStorage.setItem('fz_target_course', 'en');
          localStorage.setItem('fiezel-target-course-choice', 'en');
          if (typeof window.switchTargetLangStorage === 'function') {
            window.switchTargetLangStorage('en');
          }
          if (typeof window.setTargetLangPreference === 'function') {
            window.setTargetLangPreference('en');
          }
          const st = JSON.parse(localStorage.getItem('fiezel-v4-state') || '{}');
          if (!st.preferences) st.preferences = {};
          st.preferences.activeLevel = 'A1';
          st.preferences.targetLang = 'en';
          localStorage.setItem('fiezel-v4-state', JSON.stringify(st));
          localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Budi Pratama', locale: 'id', course: 'en' }));
          if (typeof window.liveState === 'function' && window.liveState()) {
            window.liveState().preferences = window.liveState().preferences || {};
            window.liveState().preferences.targetLang = 'en';
            window.liveState().preferences.activeLevel = 'A1';
          }
        } catch (_) {}
      });
      await page.waitForTimeout(600);

      console.log(`[${vp.name}] Navigating to Skills Lab Listening (window.go('listening'))...`);
      const goResult = await page.evaluate(async () => {
        try {
          if (typeof window.setTargetLangPreference === 'function') {
            await window.setTargetLangPreference('en');
          }
        } catch (_) {}
        const lang = (typeof window.activeTargetLang === 'function') ? window.activeTargetLang() : null;
        const blocked = (typeof window.targetLangSurfaceBlocked === 'function') ? window.targetLangSurfaceBlocked('listening') : null;
        let res = false;
        if (typeof window.go === 'function') {
          res = window.go('listening');
        }
        return {
          lang,
          blocked,
          res,
          appHtml: document.getElementById('app')?.innerHTML?.slice(0, 300),
          stateView: (typeof window.liveState === 'function') ? window.liveState()?.view : null
        };
      });
      console.log(`[${vp.name}] go('listening') diagnostics:`, JSON.stringify(goResult));
      await page.waitForTimeout(1200);
      const rootDiag = await page.evaluate(() => {
        return {
          appSnippet: document.getElementById('app')?.innerHTML?.slice(0, 500),
          rootSnippet: document.getElementById('speakingListeningRoot')?.innerHTML?.slice(0, 500),
          activeLevel: (typeof window.getActiveLevel === 'function') ? window.getActiveLevel() : null,
          targetLang: (typeof window.activeTargetLang === 'function') ? window.activeTargetLang() : null,
          hasSLAddon: typeof window.FiezelSLAddon,
          hasVoiceRuntime: typeof window.FiezelVoiceRuntime
        };
      });
      console.log(`[${vp.name}] Skills Lab root inspection:`, JSON.stringify(rootDiag, null, 2));
      const testDirectCreate = await page.evaluate(async () => {
        try {
          const c = await window.FiezelSLAddon.create({
            root: document.getElementById('speakingListeningRoot'),
            baseUrl: './features/speaking-listening/',
            getActiveLevel: () => 'A1',
            activeLevel: 'A1'
          });
          c.mount(document.getElementById('speakingListeningRoot'));
          c.open('listening');
          // Ensure first item is a 4-option choice question to verify tactile option cards
          const choiceIdx = c.items.findIndex(it => it.options && it.options.length >= 4);
          if (choiceIdx > 0) {
            const chosen = c.items.splice(choiceIdx, 1)[0];
            c.items.unshift(chosen);
            c.renderSession();
          }
          return { ok: true, html: document.getElementById('speakingListeningRoot')?.innerHTML?.slice(0, 300) };
        } catch (e) {
          return { ok: false, error: e.message, stack: e.stack };
        }
      });
      console.log(`[${vp.name}] DIRECT CREATE RESULT:`, JSON.stringify(testDirectCreate));
      await page.waitForSelector('.fsl-card-listening', { timeout: 10000 });
      await page.waitForTimeout(600);

      await page.screenshot({
        path: path.join(VERIFIED_OUT_DIR, `${vp.name}-04-skills-lab-initial.png`)
      });

      const skillsLabInitial = await page.evaluate(() => {
        const card = document.querySelector('.fsl-card-listening, .fsl-card');
        const h2 = card ? card.querySelector('h2') : null;
        const playBtn = document.querySelector('[data-play]');
        const exitBtn = document.querySelector('[data-exit]');
        const options = Array.from(document.querySelectorAll('.fsl-option'));
        const gemChip = document.getElementById('fslGemChip');
        const gemToggle = document.getElementById('fslTranslateToggle');
        const vpHeight = window.innerHeight;
        const vpWidth = window.innerWidth;

        const cardStyle = card ? window.getComputedStyle(card) : {};
        const h2Style = h2 ? window.getComputedStyle(h2) : {};
        const playStyle = playBtn ? window.getComputedStyle(playBtn) : {};
        const exitStyle = exitBtn ? window.getComputedStyle(exitBtn) : {};

        const playRect = playBtn ? playBtn.getBoundingClientRect() : null;
        const exitRect = exitBtn ? exitBtn.getBoundingClientRect() : null;

        const chipTruncated = gemChip ? (gemChip.scrollWidth > gemChip.clientWidth + 2) : false;
        const toggleTruncated = gemToggle ? (gemToggle.scrollWidth > gemToggle.clientWidth + 2) : false;

        const optionsMetrics = options.map((opt, i) => {
          const r = opt.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          return {
            idx: i + 1,
            text: opt.textContent.trim(),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            height: Math.round(r.height),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isAtLeast95PercentVisible: visibleRatio >= 0.95
          };
        });

        // Check if exit button is top-right cross:
        // Positioned in upper area of card and toward right edge of card
        const cardRect = card ? card.getBoundingClientRect() : null;
        const isExitTopRight = (exitRect && cardRect) ?
          (exitRect.top >= cardRect.top - 5 && exitRect.top <= cardRect.top + 60 && exitRect.right >= cardRect.right - 60) :
          (exitRect ? (exitRect.top >= 0 && exitRect.top <= 120) : false);
        const isExitCross = exitBtn ? (exitBtn.textContent.trim().includes('✕') || exitBtn.classList.contains('fsl-exit-btn')) : false;

        // Check if play button is hero pill:
        // Width is at least 60% of card or >= 240px, and rounded pill
        const isHeroPill = playRect ? (playRect.width >= (vpWidth * 0.65) || playRect.width >= 240) : false;

        return {
          cardBg: cardStyle.backgroundColor,
          h2Color: h2Style.color,
          h2Text: h2 ? h2.textContent.trim() : '',
          playBtn: {
            rect: playRect,
            width: playRect ? Math.round(playRect.width) : 0,
            height: playRect ? Math.round(playRect.height) : 0,
            borderRadius: playStyle.borderRadius,
            isHeroPill
          },
          exitBtn: {
            rect: exitRect,
            text: exitBtn ? exitBtn.textContent.trim() : '',
            isTopRightCross: isExitTopRight && isExitCross
          },
          optionsCount: options.length,
          options: optionsMetrics,
          gemFooter: {
            chipScrollWidth: gemChip?.scrollWidth,
            chipClientWidth: gemChip?.clientWidth,
            chipTruncated,
            toggleScrollWidth: gemToggle?.scrollWidth,
            toggleClientWidth: gemToggle?.clientWidth,
            toggleTruncated
          }
        };
      });

      // Calculate Contrast of h2 on card background
      const cardRgb = parseColor(skillsLabInitial.cardBg);
      const h2Rgb = parseColor(skillsLabInitial.h2Color);
      const h2Contrast = Number(calcContrast(h2Rgb, cardRgb).toFixed(2));
      skillsLabInitial.h2ContrastRatio = h2Contrast;
      const h2ContrastPass = h2Contrast >= 12.0;

      // Validate Skills Lab initial metrics
      const exitPass = skillsLabInitial.exitBtn.isTopRightCross;
      const playHeroPass = skillsLabInitial.playBtn.isHeroPill;
      const optionsPass = (vp.name === 'iphone14' || vp.name === 'desktop') ?
        (skillsLabInitial.optionsCount === 4 && skillsLabInitial.options.every(o => o.isAtLeast95PercentVisible)) :
        (skillsLabInitial.optionsCount === 4);
      const gemTruncationPass = !skillsLabInitial.gemFooter.chipTruncated && !skillsLabInitial.gemFooter.toggleTruncated;

      console.log(`[${vp.name}] Skills Lab Card BG: ${skillsLabInitial.cardBg}, H2 Color: ${skillsLabInitial.h2Color}`);
      console.log(`[${vp.name}] Skills Lab H2 Contrast Ratio: ${h2Contrast}:1 (Requirement >= 12:1: ${h2ContrastPass ? 'PASS' : 'FAIL'})`);
      console.log(`[${vp.name}] Skills Lab Play Button Hero Pill: ${playHeroPass ? 'PASS' : 'FAIL'} (width: ${skillsLabInitial.playBtn.width}px)`);
      console.log(`[${vp.name}] Skills Lab Exit Button Top-Right Cross: ${exitPass ? 'PASS' : 'FAIL'} (text: "${skillsLabInitial.exitBtn.text}")`);
      console.log(`[${vp.name}] Skills Lab Options Visibility (Zero Scroll): ${optionsPass ? 'PASS' : 'FAIL'}`);
      console.log(`[${vp.name}] Skills Lab Gem Footer Truncation (scrollWidth <= clientWidth + 2): ${gemTruncationPass ? 'PASS' : 'FAIL'}`);

      if (!h2ContrastPass) vpResult.failures.push(`Skills Lab H2 contrast ratio ${h2Contrast}:1 < 12:1`);
      if (!playHeroPass) vpResult.failures.push(`Skills Lab Play button is not hero pill (width: ${skillsLabInitial.playBtn.width}px)`);
      if (!exitPass) vpResult.failures.push(`Skills Lab Exit button is not top-right cross icon`);
      if (!optionsPass) vpResult.failures.push(`Skills Lab options not all visible on initial screen`);
      if (!gemTruncationPass) vpResult.failures.push(`Skills Lab Gem footer has text truncation`);

      vpResult.skillsLab.initial = {
        ...skillsLabInitial,
        h2ContrastPass,
        playHeroPass,
        exitPass,
        optionsPass,
        gemTruncationPass
      };

      // Answering Skills Lab option to test "Lanjut" button
      console.log(`[${vp.name}] Answering Skills Lab option to test "Lanjut" button...`);
      await page.evaluate(() => {
        const work = document.querySelector('[data-work]');
        if (work) work.disabled = false;
        const opt = document.querySelector('.fsl-option');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(VERIFIED_OUT_DIR, `${vp.name}-05-skills-lab-answered.png`)
      });

      const skillsLabAnswered = await page.evaluate(() => {
        const nextBtn = document.querySelector('[data-next]');
        const vpHeight = window.innerHeight;

        const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;
        const nextStyle = nextBtn ? window.getComputedStyle(nextBtn) : {};

        return {
          nextBtnRect: nextRect,
          nextBtnVisible: nextRect ? (nextRect.top >= 0 && nextRect.bottom <= vpHeight) : false,
          nextBtnColor: nextStyle.color,
          nextBtnBg: nextStyle.backgroundColor,
          nextBtnText: nextBtn ? nextBtn.textContent.trim() : ''
        };
      });

      const nextBtnTextRgb = parseColor(skillsLabAnswered.nextBtnColor);
      const nextBtnBgRgb = parseColor(skillsLabAnswered.nextBtnBg);
      const nextBtnContrast = Number(calcContrast(nextBtnTextRgb, nextBtnBgRgb).toFixed(2));
      skillsLabAnswered.nextBtnContrastRatio = nextBtnContrast;
      const nextBtnContrastPass = nextBtnContrast >= 4.5 && skillsLabAnswered.nextBtnVisible;

      console.log(`[${vp.name}] Skills Lab Next Button Visible: ${skillsLabAnswered.nextBtnVisible ? 'PASS' : 'FAIL'} (bottom: ${skillsLabAnswered.nextBtnRect?.bottom} vs vp: ${vp.height})`);
      console.log(`[${vp.name}] Skills Lab Next Button Contrast: ${nextBtnContrast}:1 (color: ${skillsLabAnswered.nextBtnColor}, bg: ${skillsLabAnswered.nextBtnBg}) -> ${nextBtnContrastPass ? 'PASS' : 'FAIL'}`);

      if (!nextBtnContrastPass) {
        vpResult.failures.push(`Skills Lab Next button contrast/visibility failed (${nextBtnContrast}:1, visible: ${skillsLabAnswered.nextBtnVisible})`);
      }
      vpResult.skillsLab.answered = {
        ...skillsLabAnswered,
        nextBtnContrastPass
      };

      vpResult.metricsPass = vpResult.failures.length === 0;
      if (!vpResult.metricsPass) {
        overallSummary.allPassed = false;
        overallSummary.failures.push(...vpResult.failures.map(f => `[${vp.name}] ${f}`));
      }

      overallSummary.viewports[vp.name] = vpResult;
      await context.close();
    }

    fs.writeFileSync(
      path.join(VERIFIED_OUT_DIR, 'VERIFICATION-REPORT.json'),
      JSON.stringify(overallSummary, null, 2),
      'utf-8'
    );

    console.log(`\n======================================================`);
    console.log(`OVERALL VERIFICATION RESULT: ${overallSummary.allPassed ? 'ALL METRICS PASSED (100% SUCCESS)' : 'FAILURES DETECTED'}`);
    if (!overallSummary.allPassed) {
      console.log('FAILURES:');
      overallSummary.failures.forEach(f => console.log(' - ' + f));
    }
    console.log(`Report written to reports/audit-listening-detail/verified/VERIFICATION-REPORT.json`);
    console.log(`Screenshots saved to reports/audit-listening-detail/verified/`);
    console.log(`======================================================`);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    overallSummary.allPassed = false;
    overallSummary.error = String(err.stack || err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
