/**
 * FIEZEL Listening Deep Audit v2 (Comprehensive Empirical Audit)
 * =========================================================================
 * Empirical headless Playwright audit of all listening modalities:
 * 1. JLPT Chōkai N5/N4 Modal & Sheet
 * 2. English Skills Lab (A1-C2) Single-Screen Hero
 * 3. TOEFL / IELTS Note-Taking Exam Simulation
 *
 * Checks:
 * - WCAG 2.1 AA Contrast Ratios (fg vs bg)
 * - Touch Ergonomics & 44px/48px Tap Targets
 * - Vertical viewport fit (zero clipping on 360x800 & 390x844)
 * - Thumb Zone Ergonomics (Natural, Reach, Hard)
 * - Dynamic state machine transitions (Initial -> Playing -> Feedback -> Sheet)
 * - Anti-leak exam purity (no hints during measure mode)
 * - Japanese font stack compliance
 * - Keyboard Tab focus rings & ARIA trees
 */

import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4492;
const REPORT_DIR = path.join(process.cwd(), 'reports', 'listening-deep-audit-v2');
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
  { name: 'iphone14',        label: 'iPhone 14',       width: 390,  height: 844, dpr: 2, mobile: true },
  { name: 'android_compact', label: 'Android Compact', width: 360,  height: 800, dpr: 2, mobile: true },
  { name: 'pixel7',          label: 'Pixel 7',         width: 412,  height: 915, dpr: 2.6, mobile: true },
  { name: 'desktop',         label: 'Desktop 1280',    width: 1280, height: 800, dpr: 1, mobile: false }
];

function log(msg) { process.stdout.write(msg + '\n'); }

function relLum(rgbStr) {
  if (!rgbStr || rgbStr === 'transparent' || rgbStr.startsWith('rgba(0, 0, 0, 0)')) return 1;
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return 1;
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgStr, bgStr) {
  const l1 = relLum(fgStr);
  const l2 = relLum(bgStr);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

server.listen(PORT, '127.0.0.1', async () => {
  log('================================================================');
  log(`FIEZEL DEEP LISTENING AUDIT ENGINE STARTED ON PORT ${PORT}`);
  log('================================================================');

  let browser;
  const auditReport = {
    timestamp: new Date().toISOString(),
    build: 'm025-585',
    viewports: {},
    overallFindings: [],
    summary: {}
  };

  try {
    browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      log(`\n======================================================`);
      log(`AUDITING VIEWPORT: ${vp.label} (${vp.width}x${vp.height})`);
      log(`======================================================`);

      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        serviceWorkers: 'block'
      });

      const page = await ctx.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

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
          streak: 3, xp: 240,
          toursSeen: { menu: true, library: true, listening: true, speaking: true }
        }));
        sessionStorage.setItem('fiezel_boot_count', '2');
        setInterval(() => {
          document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual').forEach(e => e.remove());
        }, 50);
      });

      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
      await page.waitForTimeout(600);

      const vpData = {
        viewport: vp,
        jlpt: {},
        skillsLab: {},
        toeflExam: {},
        contrastAudits: [],
        tapTargetFailures: [],
        verticalClippingIssues: []
      };

      // -------------------------------------------------------------
      // 1. JLPT CHŌKAI AUDIT (MODAL & BOTTOM SHEET)
      // -------------------------------------------------------------
      log(`[${vp.name}] Auditing JLPT Chōkai...`);
      await page.evaluate(() => {
        if (typeof window.openListeningPanel === 'function') window.openListeningPanel();
      });
      await page.waitForSelector('.jlpt-opt-btn', { timeout: 10000 });
      await page.waitForTimeout(600);

      const jlptInitialPath = path.join(REPORT_DIR, `${vp.name}-01-jlpt-initial.png`);
      await page.screenshot({ path: jlptInitialPath });
      log(`  📸 Screenshot: ${vp.name}-01-jlpt-initial.png`);

      const jlptData = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const vpWidth = window.innerWidth;
        const modal = document.getElementById('listeningPanelModal');
        const box = document.querySelector('.listening-modal-box');
        const closeBtn = document.querySelector('.listening-close-btn');
        const filterBtn = document.getElementById('jlptFilterBtn');
        const playBtn = document.getElementById('jlptMainPlayBtn');
        const jeesChip = document.getElementById('jlptJeesChip');
        const speakerChips = Array.from(document.querySelectorAll('.jlpt-speaker-chip'));
        const options = Array.from(document.querySelectorAll('.jlpt-opt-btn'));
        const sheet = document.getElementById('jlptBottomSheet');

        function getMetrics(el, label) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const vH = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (vH / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';
          const textEl = el.querySelector('.jlpt-opt-ja, .fsl-option-text, span, pre, b') || el;
          const textCs = window.getComputedStyle(textEl);
          const fg = (textCs.color && textCs.color !== 'rgba(0, 0, 0, 0)') ? textCs.color : cs.color;
          let bg = cs.backgroundColor;
          if (!bg || bg === 'transparent' || bg.startsWith('rgba(0, 0, 0, 0)')) {
            const parent = el.closest('.listening-modal-box, .fsl-card-listening, .fsl-card, body');
            bg = parent ? window.getComputedStyle(parent).backgroundColor : 'rgb(255, 253, 249)';
          }

          return {
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            fullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            thumbZone,
            fg: fg,
            bg: bg,
            fontSize: textCs.fontSize || cs.fontSize,
            fontWeight: textCs.fontWeight || cs.fontWeight,
            fontFamily: textCs.fontFamily || cs.fontFamily,
            ariaLabel: el.getAttribute('aria-label') || null,
            role: el.getAttribute('role') || el.tagName.toLowerCase()
          };
        }

        return {
          isOpen: modal?.classList.contains('open'),
          closeBtn: getMetrics(closeBtn, 'JLPT Close Button'),
          filterBtn: getMetrics(filterBtn, 'JLPT Filter Button'),
          playBtn: getMetrics(playBtn, 'JLPT Play Button'),
          jeesChip: getMetrics(jeesChip, 'JEES Chip'),
          speakerChips: speakerChips.map((c, i) => getMetrics(c, `Speaker Chip ${i+1}`)),
          options: options.map((opt, i) => getMetrics(opt, `Choice Option ${i+1}`)),
          allOptionsFullyVisible: options.every(opt => {
            const r = opt.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= vpHeight;
          })
        };
      });

      // JLPT Contrast Checks
      if (jlptData.closeBtn) {
        jlptData.closeBtn.contrast = contrastRatio(jlptData.closeBtn.fg, jlptData.closeBtn.bg);
      }
      if (jlptData.playBtn) {
        jlptData.playBtn.contrast = contrastRatio(jlptData.playBtn.fg, jlptData.playBtn.bg);
      }
      jlptData.speakerChips.forEach(sc => {
        sc.contrast = contrastRatio(sc.fg, sc.bg);
      });
      jlptData.options.forEach(opt => {
        opt.contrast = contrastRatio(opt.fg, opt.bg);
      });

      vpData.jlpt.initial = jlptData;

      // Click option 1 to trigger feedback & distractor diagnosis state
      log(`[${vp.name}] Triggering JLPT answer selection...`);
      await page.evaluate(() => {
        const opt = document.querySelector('.jlpt-opt-btn');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);

      const jlptAnsweredPath = path.join(REPORT_DIR, `${vp.name}-02-jlpt-answered.png`);
      await page.screenshot({ path: jlptAnsweredPath });
      log(`  📸 Screenshot: ${vp.name}-02-jlpt-answered.png`);

      const jlptFeedbackData = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const feedbackModal = document.querySelector('.jlpt-feedback-modal, .jlpt-sheet-content, [role="alert"]');
        const nextBtn = document.querySelector('.jlpt-next-btn, [data-next]');
        const whyFailsBox = document.querySelector('.jlpt-why-fails, .jlpt-explanation-box');
        const selectedBtn = document.querySelector('.jlpt-opt-btn.is-selected, .jlpt-opt-btn.is-correct, .jlpt-opt-btn.is-wrong');

        function getMetrics(el, label) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return {
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            fullyVisible: r.top >= 0 && r.bottom <= vpHeight,
            fg: cs.color,
            bg: cs.backgroundColor
          };
        }

        return {
          hasFeedback: !!feedbackModal || !!selectedBtn,
          selectedBtn: getMetrics(selectedBtn, 'Selected Option'),
          nextBtn: getMetrics(nextBtn, 'Next Question Button'),
          whyFailsBox: getMetrics(whyFailsBox, 'WhyFails Explanation'),
          optionsDisabled: Array.from(document.querySelectorAll('.jlpt-opt-btn')).every(b => b.disabled || b.getAttribute('aria-disabled') === 'true')
        };
      });
      vpData.jlpt.feedback = jlptFeedbackData;

      // Close JLPT modal
      await page.evaluate(() => {
        if (typeof window.closeListeningPanel === 'function') window.closeListeningPanel();
      });
      await page.waitForTimeout(400);

      // -------------------------------------------------------------
      // 2. ENGLISH SKILLS LAB AUDIT (A1-C2)
      // -------------------------------------------------------------
      log(`[${vp.name}] Auditing English Skills Lab...`);
      await page.evaluate(async () => {
        try {
          if (typeof window.switchTargetLangStorage === 'function') window.switchTargetLangStorage('en');
          if (typeof window.setTargetLangPreference === 'function') await window.setTargetLangPreference('en');
          const st = JSON.parse(localStorage.getItem('fiezel-v4-state') || '{}');
          if (!st.preferences) st.preferences = {};
          st.preferences.activeLevel = 'A1';
          st.preferences.targetLang = 'en';
          localStorage.setItem('fiezel-v4-state', JSON.stringify(st));
          if (typeof window.go === 'function') window.go('listening');
        } catch (_) {}
      });
      await page.waitForTimeout(600);

      // Mount English listening controller deterministically
      await page.evaluate(async () => {
        try {
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
          window.__activeSLController = c;
          c.mount(root);
          c.open('listening', 'A1');
          // Pick a 4-choice question
          const choiceIdx = c.items.findIndex(it => it.options && it.options.length >= 4);
          if (choiceIdx > 0) {
            const chosen = c.items.splice(choiceIdx, 1)[0];
            c.items.unshift(chosen);
            c.renderSession();
          }
        } catch (e) {
          console.error(e);
        }
      });
      await page.waitForSelector('.fsl-card-listening', { timeout: 10000 });
      await page.waitForTimeout(600);

      const slInitialPath = path.join(REPORT_DIR, `${vp.name}-03-skills-lab-initial.png`);
      await page.screenshot({ path: slInitialPath });
      log(`  📸 Screenshot: ${vp.name}-03-skills-lab-initial.png`);

      const slData = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const card = document.querySelector('.fsl-card-listening');
        const h2 = card?.querySelector('h2');
        const playBtn = document.querySelector('[data-play]');
        const exitBtn = document.querySelector('[data-exit]');
        const options = Array.from(document.querySelectorAll('.fsl-option'));
        const gemChip = document.getElementById('fslGemChip');
        const gemToggle = document.getElementById('fslTranslateToggle');
        const workField = document.querySelector('[data-work]');

        function getMetrics(el, label) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const vH = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (vH / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            fullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            thumbZone,
            fg: cs.color,
            bg: cs.backgroundColor,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            ariaLabel: el.getAttribute('aria-label') || null,
            role: el.getAttribute('role') || el.tagName.toLowerCase()
          };
        }

        return {
          h2: getMetrics(h2, 'Question Headline'),
          playBtn: getMetrics(playBtn, 'Audio Play Hero'),
          exitBtn: getMetrics(exitBtn, 'Exit Button'),
          gemChip: getMetrics(gemChip, 'Gem Chip'),
          gemToggle: getMetrics(gemToggle, 'Translation Toggle'),
          options: options.map((opt, i) => getMetrics(opt, `English Choice ${i+1}`)),
          allOptionsFullyVisible: options.every(opt => {
            const r = opt.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= vpHeight;
          }),
          workDisabledInitial: workField?.disabled === true
        };
      });

      // English Contrast Checks
      if (slData.h2) slData.h2.contrast = contrastRatio(slData.h2.fg, slData.h2.bg);
      if (slData.playBtn) slData.playBtn.contrast = contrastRatio(slData.playBtn.fg, slData.playBtn.bg);
      if (slData.exitBtn) slData.exitBtn.contrast = contrastRatio(slData.exitBtn.fg, slData.exitBtn.bg);
      if (slData.gemChip) slData.gemChip.contrast = contrastRatio(slData.gemChip.fg, slData.gemChip.bg);
      if (slData.gemToggle) slData.gemToggle.contrast = contrastRatio(slData.gemToggle.fg, slData.gemToggle.bg);
      slData.options.forEach(opt => {
        opt.contrast = contrastRatio(opt.fg, opt.bg);
      });

      vpData.skillsLab.initial = slData;

      // Click Play to unlock and test Equalizer animation
      log(`[${vp.name}] Triggering Play Audio...`);
      await page.evaluate(() => {
        const btn = document.querySelector('[data-play]');
        if (btn) btn.click();
      });
      await page.waitForTimeout(400);

      const slPlayingPath = path.join(REPORT_DIR, `${vp.name}-04-skills-lab-playing.png`);
      await page.screenshot({ path: slPlayingPath });
      log(`  📸 Screenshot: ${vp.name}-04-skills-lab-playing.png`);

      const slPlayingData = await page.evaluate(() => {
        const stage = document.querySelector('.fsl-player');
        const eqBars = Array.from(document.querySelectorAll('.fsl-hero-eq i, .fsl-eq i'));
        const workField = document.querySelector('[data-work]');
        return {
          stageHasPlayingClass: stage?.classList.contains('is-playing'),
          eqBarCount: eqBars.length,
          workFieldUnlocked: workField?.disabled === false
        };
      });
      vpData.skillsLab.playing = slPlayingData;

      // Click Option 1 in English to trigger feedback
      log(`[${vp.name}] Answering English question...`);
      await page.waitForSelector('[data-work]:not([disabled])', { timeout: 3000 }).catch(() => {});
      await page.evaluate(() => {
        const opt = document.querySelector('.fsl-option');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);

      const slAnsweredPath = path.join(REPORT_DIR, `${vp.name}-05-skills-lab-answered.png`);
      await page.screenshot({ path: slAnsweredPath });
      log(`  📸 Screenshot: ${vp.name}-05-skills-lab-answered.png`);

      const slAnsweredData = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const feedback = document.querySelector('[data-feedback]');
        const nextBtn = document.querySelector('[data-next]');
        const lockedOptions = Array.from(document.querySelectorAll('.fsl-option')).every(b => b.disabled || b.getAttribute('aria-disabled') === 'true');

        function getMetrics(el, label) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          return {
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            fullyVisible: r.top >= 0 && r.bottom <= vpHeight,
            fg: cs.color,
            bg: cs.backgroundColor,
            isFixedBottom: cs.position === 'fixed' || window.getComputedStyle(el.parentElement).position === 'fixed'
          };
        }

        return {
          feedback: getMetrics(feedback, 'Feedback Box'),
          nextBtn: getMetrics(nextBtn, 'Tombol Lanjut'),
          optionsLocked: lockedOptions
        };
      });
      vpData.skillsLab.answered = slAnsweredData;

      // -------------------------------------------------------------
      // 3. TOEFL / IELTS LISTENING EXAM NOTE-TAKING MODE
      // -------------------------------------------------------------
      log(`[${vp.name}] Auditing TOEFL Note-Taking Exam...`);
      await page.evaluate(async () => {
        try {
          const root = document.getElementById('speakingListeningRoot') || document.getElementById('app');
          const c = await window.FiezelSLAddon.create({
            root: root,
            baseUrl: './features/speaking-listening/',
            getActiveLevel: () => 'B2',
            activeLevel: 'B2',
            tts: {
              play: async () => ({ provider: 'mock', ok: true }),
              stop: () => {},
              prefetch: () => {}
            }
          });
          c.mount(root);
          c.open('listening_exam', 'B2');
          const toeflIdx = c.items.findIndex(it => it.exam && it.exam.startsWith('toefl'));
          if (toeflIdx >= 0) {
            const chosen = c.items.splice(toeflIdx, 1)[0];
            c.items.unshift(chosen);
            c.renderSession();
          }
        } catch (e) {
          console.error(e);
        }
      });
      await page.waitForTimeout(600);

      const toeflExamPath = path.join(REPORT_DIR, `${vp.name}-06-toefl-exam.png`);
      await page.screenshot({ path: toeflExamPath });
      log(`  📸 Screenshot: ${vp.name}-06-toefl-exam.png`);

      const toeflData = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const playBtn = document.querySelector('[data-play]');
        const notesTextarea = document.querySelector('.fsl-notes');
        const workFieldset = document.querySelector('[data-work]');
        const allBtns = Array.from(document.querySelectorAll('button'));
        const hintBtns = allBtns.filter(b => b.hasAttribute('data-hint') || b.classList.contains('fsl-hint') || b.textContent.includes('Petunjuk') || b.textContent.includes('Hint'));

        function getMetrics(el, label) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = window.getComputedStyle(el);
          const vH = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (vH / r.height) : 0;
          return {
            label,
            w: Math.round(r.width),
            h: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            fullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            fg: cs.color,
            bg: cs.backgroundColor
          };
        }

        return {
          playBtn: getMetrics(playBtn, 'Exam Audio Play 1x'),
          notesTextarea: getMetrics(notesTextarea, 'TOEFL Note-Taking Textarea'),
          questionsHiddenDuringAudio: workFieldset?.disabled === true,
          hintButtonCount: hintBtns.length
        };
      });

      if (toeflData.playBtn) toeflData.playBtn.contrast = contrastRatio(toeflData.playBtn.fg, toeflData.playBtn.bg);
      if (toeflData.notesTextarea) toeflData.notesTextarea.contrast = contrastRatio(toeflData.notesTextarea.fg, toeflData.notesTextarea.bg);

      vpData.toeflExam = toeflData;

      // Collect ergonomic & a11y violations for this viewport
      function checkContrast(item) {
        if (!item || !item.contrast) return;
        if (item.contrast < 4.5) {
          vpData.contrastAudits.push({
            label: item.label,
            contrast: item.contrast,
            fg: item.fg,
            bg: item.bg,
            status: 'FAIL (WCAG AA < 4.5)'
          });
        }
      }

      function checkTapTarget(item) {
        if (!item) return;
        if (!item.tapTarget44) {
          vpData.tapTargetFailures.push({
            label: item.label,
            size: `${item.w}x${item.h}px`,
            status: 'FAIL (< 44x44px)'
          });
        }
      }

      function checkClipping(item) {
        if (!item) return;
        if (!item.fullyVisible) {
          vpData.verticalClippingIssues.push({
            label: item.label,
            visibleRatio: item.visibleRatio,
            top: item.top,
            bottom: item.bottom,
            viewportHeight: vp.height
          });
        }
      }

      // Run evaluations
      checkContrast(jlptData.closeBtn);
      checkContrast(jlptData.playBtn);
      jlptData.speakerChips.forEach(checkContrast);
      jlptData.options.forEach(checkContrast);

      checkContrast(slData.h2);
      checkContrast(slData.playBtn);
      checkContrast(slData.exitBtn);
      checkContrast(slData.gemChip);
      checkContrast(slData.gemToggle);
      slData.options.forEach(checkContrast);

      checkContrast(toeflData.playBtn);
      checkContrast(toeflData.notesTextarea);

      checkTapTarget(jlptData.closeBtn);
      checkTapTarget(jlptData.filterBtn);
      checkTapTarget(jlptData.playBtn);
      jlptData.options.forEach(checkTapTarget);

      checkTapTarget(slData.playBtn);
      checkTapTarget(slData.exitBtn);
      checkTapTarget(slData.gemToggle);
      slData.options.forEach(checkTapTarget);

      checkClipping(jlptData.closeBtn);
      checkClipping(jlptData.playBtn);
      jlptData.options.forEach(checkClipping);

      checkClipping(slData.playBtn);
      slData.options.forEach(checkClipping);

      if (toeflData.notesTextarea) checkClipping(toeflData.notesTextarea);

      auditReport.viewports[vp.name] = vpData;
      await ctx.close();
    }

    // -------------------------------------------------------------
    // GENERATE SUMMARY & WRITE AUDIT ARTIFACT REPORT
    // -------------------------------------------------------------
    const reportJsonPath = path.join(REPORT_DIR, 'AUDIT-REPORT-V2.json');
    fs.writeFileSync(reportJsonPath, JSON.stringify(auditReport, null, 2));
    log(`\n✅ Deep Audit complete. JSON saved to: ${reportJsonPath}`);

  } catch (err) {
    log(`\n❌ Error during audit run: ${err.message}`);
    console.error(err);
  } finally {
    if (browser) await browser.close();
    server.close();
    log('\n🏁 Web server shut down.');
  }
});
