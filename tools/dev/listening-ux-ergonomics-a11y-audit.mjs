import { chromium } from 'playwright';
import path from 'path';
import http from 'http';
import fs from 'fs';

const PORT = 4489;
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

const REPORT_DIR = path.join(process.cwd(), 'reports', 'ux-listening-audit');
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'iphone14', label: 'iPhone 13/14', width: 390, height: 844, dpr: 2, mobile: true },
  { name: 'android_compact', label: 'Android Compact', width: 360, height: 800, dpr: 2, mobile: true },
  { name: 'desktop', label: 'Desktop Preview', width: 1280, height: 800, dpr: 1, mobile: false }
];

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`UX Ergonomics Audit Server running at http://127.0.0.1:${PORT}`);
  let browser;
  const auditResults = {
    timestamp: new Date().toISOString(),
    viewports: {},
    tapTargetSummary: {},
    thumbZoneSummary: {},
    cognitiveLoadFindings: {},
    a11yFindings: {}
  };

  try {
    browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`TESTING UX ERGONOMICS & A11Y: ${vp.label} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dpr,
        isMobile: vp.mobile,
        hasTouch: vp.mobile,
        serviceWorkers: 'block'
      });

      const page = await context.newPage();
      page.on('pageerror', err => console.log(`[PAGE ERROR ${vp.name}]:`, err.message));

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

      const vpReport = {
        viewport: vp,
        jlpt: {},
        skillsLab: {},
        examToefl: {}
      };

      // ==============================================================
      // 1. JLPT CHŌKAI AUDIT
      // ==============================================================
      console.log(`[${vp.name}] Opening JLPT Listening...`);
      await page.evaluate(() => {
        if (typeof window.openListeningPanel === 'function') window.openListeningPanel();
      });
      await page.waitForSelector('.jlpt-opt-btn', { timeout: 10000 });
      await page.waitForTimeout(600);

      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-jlpt-initial.png`) });

      // Measure JLPT Elements
      const jlptAudit = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const vpWidth = window.innerWidth;
        const modal = document.getElementById('listeningPanelModal');
        const box = document.querySelector('.listening-modal-box');
        const closeBtn = document.querySelector('.listening-close-btn');
        const filterBtn = document.getElementById('jlptFilterBtn');
        const playBtn = document.getElementById('jlptMainPlayBtn');
        const jeesChip = document.getElementById('jlptJeesChip');
        const questionBlock = document.querySelector('.jlpt-question-block');
        const options = Array.from(document.querySelectorAll('.jlpt-opt-btn'));

        function measureEl(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            name,
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isFullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            tapTarget48: r.width >= 48 && r.height >= 48,
            thumbZone,
            ariaLabel: el.getAttribute('aria-label') || el.getAttribute('data-i18n-aria-label') || null,
            role: el.getAttribute('role') || el.tagName.toLowerCase()
          };
        }

        return {
          modal: {
            role: modal?.getAttribute('role'),
            ariaModal: modal?.getAttribute('aria-modal'),
            ariaLabel: modal?.getAttribute('aria-label'),
            isOpen: modal?.classList.contains('open')
          },
          closeBtn: measureEl(closeBtn, 'Tutup (Close)'),
          filterBtn: measureEl(filterBtn, 'Filter Level & Mondai'),
          playBtn: measureEl(playBtn, 'Putar Audio Utama'),
          jeesChip: measureEl(jeesChip, 'JEES Chip'),
          questionText: questionBlock?.textContent.trim(),
          options: options.map((opt, i) => measureEl(opt, `Opsi ${i+1}`)),
          allOptionsVisible: options.every(opt => {
            const r = opt.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= vpHeight;
          })
        };
      });

      // Answering Option 1 in JLPT to test feedback & bottom sheet trigger
      await page.evaluate(() => {
        const opt = document.querySelector('.jlpt-opt-btn');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-jlpt-answered.png`) });

      const jlptAnsweredAudit = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const banner = document.querySelector('.jlpt-feedback-banner');
        const nextBtn = document.querySelector('.jlpt-fb-next-btn');
        const keyBtn = document.querySelector('.jlpt-fb-key-btn');

        function measureEl(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            name,
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isFullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            thumbZone,
            ariaLabel: el.getAttribute('aria-label') || null
          };
        }

        return {
          bannerVisible: banner ? (banner.getBoundingClientRect().bottom <= vpHeight) : false,
          nextBtn: measureEl(nextBtn, 'Tombol Lanjut'),
          keyBtn: measureEl(keyBtn, 'Lihat Pembahasan')
        };
      });

      // Open JLPT Detail Sheet
      await page.evaluate(() => {
        if (typeof window.openJlptDetailSheet === 'function') window.openJlptDetailSheet('script');
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-jlpt-sheet-script.png`) });

      // Measure Sheet tabs & personas
      const sheetAudit = await page.evaluate(() => {
        const sheet = document.getElementById('jlptDetailSheet');
        const container = document.getElementById('jlptSheetContainer');
        const closeBtn = sheet?.querySelector('.jlpt-sheet-close');
        const handleZone = document.getElementById('jlptSheetHandleZone');
        const tabs = Array.from(document.querySelectorAll('.jlpt-tab-chip')).map(t => ({
          text: t.textContent.trim(),
          width: Math.round(t.getBoundingClientRect().width),
          height: Math.round(t.getBoundingClientRect().height),
          tapTarget44: t.getBoundingClientRect().height >= 44 || t.getBoundingClientRect().width >= 44,
          role: t.getAttribute('role')
        }));

        const personas = Array.from(document.querySelectorAll('.jlpt-dialogue-turn')).map(turn => {
          const chip = turn.querySelector('.jlpt-speaker-chip');
          const speakBtn = turn.querySelector('.jlpt-line-speak-btn');
          const name = chip?.querySelector('.jlpt-speaker-name')?.textContent.trim();
          const r = speakBtn?.getBoundingClientRect();
          return {
            speaker: name,
            type: turn.className,
            hasLineAudio: !!speakBtn,
            speakBtnTapTarget: r ? (r.width >= 44 && r.height >= 44) : false,
            speakBtnSize: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
            speakBtnAria: speakBtn?.getAttribute('aria-label')
          };
        });

        return {
          sheetOpen: sheet?.classList.contains('open'),
          role: sheet?.getAttribute('role'),
          ariaModal: sheet?.getAttribute('aria-modal'),
          ariaLabel: sheet?.getAttribute('aria-label'),
          sheetCloseBtn: {
            size: closeBtn ? `${Math.round(closeBtn.getBoundingClientRect().width)}x${Math.round(closeBtn.getBoundingClientRect().height)}` : null,
            tapTarget44: closeBtn ? (closeBtn.getBoundingClientRect().height >= 44 && closeBtn.getBoundingClientRect().width >= 44) : false,
            ariaLabel: closeBtn?.getAttribute('aria-label')
          },
          handleZoneAria: handleZone?.getAttribute('aria-label'),
          tabs,
          personas
        };
      });

      // Close Sheet and Modal
      await page.evaluate(() => {
        if (typeof window.closeJlptDetailSheet === 'function') window.closeJlptDetailSheet();
        if (typeof window.closeListeningPanel === 'function') window.closeListeningPanel();
      });
      await page.waitForTimeout(500);

      vpReport.jlpt = {
        initial: jlptAudit,
        answered: jlptAnsweredAudit,
        sheet: sheetAudit
      };

      // ==============================================================
      // 2. SKILLS LAB DAILY LISTENING (A1) AUDIT
      // ==============================================================
      console.log(`[${vp.name}] Opening Skills Lab Daily Listening...`);
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
      await page.waitForTimeout(1200);

      await page.evaluate(async () => {
        try {
          const root = document.getElementById('speakingListeningRoot') || document.getElementById('app');
          const c = await window.FiezelSLAddon.create({
            root: root,
            baseUrl: './features/speaking-listening/',
            getActiveLevel: () => 'A1',
            activeLevel: 'A1'
          });
          window.__activeSLController = c;
          c.mount(root);
          c.open('listening');
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
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-skills-lab-initial.png`) });

      const skillsLabAudit = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const card = document.querySelector('.fsl-card-listening');
        const h2 = card?.querySelector('h2');
        const playBtn = document.querySelector('[data-play]');
        const exitBtn = document.querySelector('[data-exit]');
        const options = Array.from(document.querySelectorAll('.fsl-option'));
        const gemChip = document.getElementById('fslGemChip');
        const gemToggle = document.getElementById('fslTranslateToggle');

        function measureEl(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            name,
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isFullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            tapTarget48: r.width >= 48 && r.height >= 48,
            thumbZone,
            ariaLabel: el.getAttribute('aria-label') || null,
            ariaPressed: el.getAttribute('aria-pressed') || null
          };
        }

        return {
          questionText: h2?.textContent.trim(),
          playBtn: measureEl(playBtn, 'Hero Play Button'),
          exitBtn: measureEl(exitBtn, 'Exit Cross Button'),
          gemChip: measureEl(gemChip, 'Gem Chip'),
          gemToggle: measureEl(gemToggle, 'Translate Toggle'),
          options: options.map((opt, i) => measureEl(opt, `Option ${String.fromCharCode(65+i)}`)),
          allOptionsVisible: options.every(opt => {
            const r = opt.getBoundingClientRect();
            return r.top >= 0 && r.bottom <= vpHeight;
          })
        };
      });

      // Answering Skills Lab option
      await page.evaluate(() => {
        const work = document.querySelector('[data-work]');
        if (work) work.disabled = false;
        const opt = document.querySelector('.fsl-option');
        if (opt) opt.click();
      });
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-skills-lab-answered.png`) });

      const skillsLabAnsweredAudit = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const nextBtn = document.querySelector('[data-next]');
        const feedback = document.querySelector('.fsl-feedback');

        function measureEl(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            name,
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isFullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            thumbZone,
            isFixedBottom: window.getComputedStyle(el.parentElement).position === 'fixed'
          };
        }

        return {
          feedbackVisible: feedback ? (feedback.getBoundingClientRect().top < vpHeight) : false,
          nextBtn: measureEl(nextBtn, 'Tombol Lanjut')
        };
      });

      vpReport.skillsLab = {
        initial: skillsLabAudit,
        answered: skillsLabAnsweredAudit
      };

      // ==============================================================
      // 3. SKILLS LAB LISTENING EXAM: TOEFL NOTE-TAKING MODE AUDIT
      // ==============================================================
      console.log(`[${vp.name}] Opening Skills Lab Listening Exam (TOEFL Note-Taking Mode)...`);
      await page.evaluate(async () => {
        try {
          const root = document.getElementById('speakingListeningRoot') || document.getElementById('app');
          const c = await window.FiezelSLAddon.create({
            root: root,
            baseUrl: './features/speaking-listening/',
            getActiveLevel: () => 'B2',
            activeLevel: 'B2'
          });
          c.mount(root);
          c.open('listening_exam', 'B2');
          // Find TOEFL conversation or lecture set
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
      await page.screenshot({ path: path.join(REPORT_DIR, `${vp.name}-skills-lab-toefl-exam.png`) });

      const toeflExamAudit = await page.evaluate(() => {
        const vpHeight = window.innerHeight;
        const playBtn = document.querySelector('[data-play]');
        const notesLabel = document.querySelector('.fsl-notes-label');
        const notesTextarea = document.querySelector('.fsl-notes');
        const examQuestionsList = document.querySelector('.fsl-exam-list');
        const questionsHidden = examQuestionsList?.classList.contains('hidden') || examQuestionsList?.hidden;
        const workFieldset = document.querySelector('[data-work]');

        function measureEl(el, name) {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(r.bottom, vpHeight) - Math.max(r.top, 0));
          const visibleRatio = r.height > 0 ? (visibleHeight / r.height) : 0;
          const centerY = (r.top + r.bottom) / 2;
          const thumbZone = (centerY >= vpHeight * 0.35 && centerY <= vpHeight * 0.75) ? 'Natural'
            : (centerY >= vpHeight * 0.20 && centerY < vpHeight * 0.35) ? 'Reach'
            : (centerY > vpHeight * 0.75 && centerY <= vpHeight * 0.95) ? 'Bottom-Reach'
            : 'Hard (Top)';

          return {
            name,
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            centerY: Math.round(centerY),
            visibleRatio: Number(visibleRatio.toFixed(3)),
            isFullyVisible: visibleRatio >= 0.99,
            tapTarget44: r.width >= 44 && r.height >= 44,
            thumbZone
          };
        }

        return {
          hasNotesArea: !!notesTextarea,
          notesVisible: notesTextarea ? (notesTextarea.getBoundingClientRect().bottom <= vpHeight) : false,
          notesMeasurements: measureEl(notesTextarea, 'Textarea Catatan TOEFL'),
          playBtn: measureEl(playBtn, 'Tombol Putar Audio TOEFL (1x)'),
          questionsHiddenDuringAudio: questionsHidden || (workFieldset?.hidden === true),
          workDisabled: workFieldset?.disabled === true
        };
      });

      vpReport.examToefl = toeflExamAudit;

      // ==============================================================
      // 4. ACCESSIBILITY TREE & KEYBOARD NAVIGATION CHECK
      // ==============================================================
      console.log(`[${vp.name}] Checking Keyboard Navigation & Focus Ring...`);
      const a11yAudit = await page.evaluate(() => {
        // Test focus visibility
        const testBtn = document.querySelector('[data-play]');
        let focusRingStyle = null;
        if (testBtn) {
          testBtn.focus();
          const s = window.getComputedStyle(testBtn);
          focusRingStyle = {
            outline: s.outline,
            outlineColor: s.outlineColor,
            outlineWidth: s.outlineWidth,
            boxShadow: s.boxShadow
          };
        }

        // Live regions
        const liveRegions = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')).map(el => ({
          tag: el.tagName.toLowerCase(),
          id: el.id,
          role: el.getAttribute('role'),
          ariaLive: el.getAttribute('aria-live'),
          text: el.textContent.trim().slice(0, 50)
        }));

        return {
          focusRingStyle,
          liveRegions
        };
      });

      vpReport.a11y = a11yAudit;

      auditResults.viewports[vp.name] = vpReport;
      await context.close();
    }

    // Write full audit JSON
    fs.writeFileSync(
      path.join(REPORT_DIR, 'AUDIT-REPORT.json'),
      JSON.stringify(auditResults, null, 2),
      'utf-8'
    );

    console.log(`\n======================================================`);
    console.log(`AUDIT COMPLETED SUCCESSFULLY`);
    console.log(`Report: reports/ux-listening-audit/AUDIT-REPORT.json`);
    console.log(`======================================================`);
  } catch (err) {
    console.error('AUDIT ERROR:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
