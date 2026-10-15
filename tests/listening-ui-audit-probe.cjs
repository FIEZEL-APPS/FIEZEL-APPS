const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm'
};

function startServer() {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const target = path.resolve(root, rel);
    if (!target.startsWith(root)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found: ' + rel);
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

async function audit() {
  const { server, port } = await startServer();
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const auditResults = {
    jlptModal: {},
    audioPill: {},
    options: {},
    feedback: {},
    bottomSheet: {},
    fslSession: {},
    fontViolations: []
  };

  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Dismiss splash, tour, auth modal if needed
    await page.evaluate(() => {
      try {
        const splash = document.getElementById('bootSplash');
        if (splash) splash.remove();
        document.documentElement.classList.remove('fz-booting');
        window.__fiezelBootSplashDismissed = true;
        localStorage.setItem('fiezel_auth_user', JSON.stringify({ name: 'Murid Test', email: 'test@fiezel.com' }));
        document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .fz-tour-card, #fzTourCard, .fz-tour-backdrop').forEach(el => el.remove());
      } catch (_) {}
    });
    await page.waitForTimeout(400);

    // 1. OPEN JLPT LISTENING PANEL
    await page.evaluate(() => {
      if (window.FiezelJlptListening && window.FiezelJlptListening.open) {
        window.FiezelJlptListening.open();
      } else if (window.openListeningPanel) {
        window.openListeningPanel();
      }
    });

    await page.waitForSelector('#listeningQuestionSlot .jlpt-mobile-card', { timeout: 8000 });
    await page.waitForTimeout(500);

    // Screenshot 1: Idle Listening Modal
    await page.screenshot({ path: path.join(root, 'tests/listening-audit-idle.png') });

    // Inspect JLPT Modal Box & Card styles
    auditResults.jlptModal = await page.evaluate(() => {
      const modalBox = document.querySelector('.listening-modal-box');
      const card = document.querySelector('.jlpt-mobile-card');
      const closeBtn = document.querySelector('.listening-close-btn');
      const topbar = document.querySelector('.listening-topbar');
      const topCounter = document.querySelector('.listening-top-counter');
      const filterBtn = document.querySelector('.listening-filter-btn');
      const mascotSlot = document.querySelector('.jlpt-mascot-slot');

      const csBox = modalBox ? window.getComputedStyle(modalBox) : {};
      const csCard = card ? window.getComputedStyle(card) : {};
      const csClose = closeBtn ? window.getComputedStyle(closeBtn) : {};
      const csTop = topbar ? window.getComputedStyle(topbar) : {};
      const csCounter = topCounter ? window.getComputedStyle(topCounter) : {};
      const csFilter = filterBtn ? window.getComputedStyle(filterBtn) : {};
      const csMascot = mascotSlot ? window.getComputedStyle(mascotSlot) : {};

      const rClose = closeBtn ? closeBtn.getBoundingClientRect() : {};

      return {
        boxBg: csBox.backgroundColor,
        boxBorder: csBox.border,
        boxRadius: csBox.borderRadius,
        cardBg: csCard.backgroundColor,
        cardBorder: csCard.border,
        cardShadow: csCard.boxShadow,
        cardRadius: csCard.borderRadius,
        cardPadding: csCard.padding,
        closeSize: `${rClose.width}x${rClose.height}`,
        closeBg: csClose.backgroundColor,
        closeBorder: csClose.border,
        closeColor: csClose.color,
        topbarBg: csTop.backgroundColor,
        topbarBorderBottom: csTop.borderBottom,
        counterColor: csCounter.color,
        counterWeight: csCounter.fontWeight,
        filterBg: csFilter.backgroundColor,
        filterColor: csFilter.color,
        mascotSlotDisplay: csMascot.display,
        mascotSlotVisibility: csMascot.visibility
      };
    });

    // Inspect Audio Row & Primary Play Button
    auditResults.audioPill = await page.evaluate(() => {
      const audioRow = document.querySelector('.jlpt-audio-row');
      const playBtn = document.querySelector('.jlpt-primary-play-btn');
      const miniWave = document.querySelector('.jlpt-mini-wave');
      const jeesChip = document.querySelector('.jlpt-jees-chip');
      const qJa = document.querySelector('.jlpt-question-ja');
      const qId = document.querySelector('.jlpt-question-id');

      const csRow = audioRow ? window.getComputedStyle(audioRow) : {};
      const csBtn = playBtn ? window.getComputedStyle(playBtn) : {};
      const csJees = jeesChip ? window.getComputedStyle(jeesChip) : {};
      const csJa = qJa ? window.getComputedStyle(qJa) : {};
      const csId = qId ? window.getComputedStyle(qId) : {};

      const rBtn = playBtn ? playBtn.getBoundingClientRect() : {};

      return {
        rowHeight: csRow.height,
        btnHeight: `${rBtn.height}px (computed: ${csBtn.height})`,
        btnBg: csBtn.backgroundColor,
        btnBorder: csBtn.border,
        btnShadow: csBtn.boxShadow,
        btnRadius: csBtn.borderRadius,
        btnColor: csBtn.color,
        btnFont: `${csBtn.fontSize} weight:${csBtn.fontWeight} family:${csBtn.fontFamily}`,
        hasMiniWave: !!miniWave,
        hasJeesChip: !!jeesChip,
        jeesBg: csJees.backgroundColor,
        jeesColor: csJees.color,
        qJaFont: `${csJa.fontSize} weight:${csJa.fontWeight} color:${csJa.color}`,
        qIdFont: `${csId.fontSize} weight:${csId.fontWeight} color:${csId.color}`
      };
    });

    // Inspect Option Buttons (idle)
    auditResults.options = await page.evaluate(() => {
      const opts = document.querySelectorAll('.jlpt-opt-btn');
      if (!opts.length) return { count: 0 };
      const o0 = opts[0];
      const cs0 = window.getComputedStyle(o0);
      const badge = o0.querySelector('.jlpt-opt-badge');
      const csBadge = badge ? window.getComputedStyle(badge) : {};
      const ja = o0.querySelector('.jlpt-opt-ja');
      const csJa = ja ? window.getComputedStyle(ja) : {};
      const id = o0.querySelector('.jlpt-opt-id');
      const csId = id ? window.getComputedStyle(id) : {};
      const r0 = o0.getBoundingClientRect();

      return {
        count: opts.length,
        rect: `${r0.width}x${r0.height}`,
        bg: cs0.backgroundColor,
        border: cs0.border,
        shadow: cs0.boxShadow,
        radius: cs0.borderRadius,
        badgeSize: badge ? `${badge.getBoundingClientRect().width}x${badge.getBoundingClientRect().height}` : '',
        badgeBg: csBadge.backgroundColor,
        badgeColor: csBadge.color,
        badgeWeight: csBadge.fontWeight,
        jaColor: csJa.color,
        jaWeight: csJa.fontWeight,
        idColor: csId.color,
        idWeight: csId.fontWeight
      };
    });

    // 2. CLICK AN OPTION -> INSPECT FEEDBACK & STATES
    await page.evaluate(() => {
      document.querySelectorAll('.fz-auth, #authModal, .modal-backdrop, .fz-tour-card, #fzTourCard, .fz-tour-backdrop').forEach(el => el.remove());
    });
    await page.click('.jlpt-opt-btn:first-child', { force: true });
    await page.waitForTimeout(400);

    // Screenshot 2: Answered Listening Modal
    await page.screenshot({ path: path.join(root, 'tests/listening-audit-answered.png') });

    auditResults.feedback = await page.evaluate(() => {
      const banner = document.querySelector('.jlpt-feedback-banner');
      const correctOpt = document.querySelector('.jlpt-opt-btn.correct');
      const wrongOpt = document.querySelector('.jlpt-opt-btn.wrong');
      const keyBtn = document.querySelector('.jlpt-fb-key-btn');
      const nextBtn = document.querySelector('.jlpt-fb-next-btn');

      const csBanner = banner ? window.getComputedStyle(banner) : {};
      const csCorrect = correctOpt ? window.getComputedStyle(correctOpt) : {};
      const csWrong = wrongOpt ? window.getComputedStyle(wrongOpt) : {};
      const csKey = keyBtn ? window.getComputedStyle(keyBtn) : {};
      const csNext = nextBtn ? window.getComputedStyle(nextBtn) : {};

      const correctBadge = correctOpt ? correctOpt.querySelector('.jlpt-opt-badge') : null;
      const csCorrectBadge = correctBadge ? window.getComputedStyle(correctBadge) : {};
      const wrongBadge = wrongOpt ? wrongOpt.querySelector('.jlpt-opt-badge') : null;
      const csWrongBadge = wrongBadge ? window.getComputedStyle(wrongBadge) : {};

      return {
        bannerBg: csBanner.backgroundColor,
        bannerBorder: csBanner.border,
        bannerColor: csBanner.color,
        keyBtnBg: csKey.backgroundColor,
        keyBtnColor: csKey.color,
        nextBtnBg: csNext.backgroundColor,
        nextBtnColor: csNext.color,
        correctOptBg: csCorrect.backgroundColor,
        correctOptBorder: csCorrect.border,
        correctOptShadow: csCorrect.boxShadow,
        correctBadgeBg: csCorrectBadge.backgroundColor,
        correctBadgeColor: csCorrectBadge.color,
        wrongOptBg: csWrong.backgroundColor,
        wrongOptBorder: csWrong.border,
        wrongOptShadow: csWrong.boxShadow,
        wrongBadgeBg: csWrongBadge.backgroundColor,
        wrongBadgeColor: csWrongBadge.color
      };
    });

    // 3. OPEN BOTTOM SHEET DRAWER
    await page.evaluate(() => {
      if (window.openJlptDetailSheet) {
        window.openJlptDetailSheet('script');
      }
    });
    await page.waitForTimeout(500);

    // Screenshot 3: Bottom Sheet (Script)
    await page.screenshot({ path: path.join(root, 'tests/listening-audit-sheet-script.png') });

    auditResults.bottomSheet = await page.evaluate(() => {
      const sheet = document.getElementById('jlptDetailSheet');
      const container = document.getElementById('jlptSheetContainer');
      const backdrop = document.getElementById('jlptSheetBackdrop');
      const handleBar = document.querySelector('.jlpt-sheet-handle-bar');
      const header = document.querySelector('.jlpt-sheet-header');
      const title = document.querySelector('.jlpt-sheet-title');
      const subtitle = document.querySelector('.jlpt-sheet-subtitle');
      const tabs = document.querySelector('.jlpt-sheet-tabs');
      const activeTab = document.querySelector('.jlpt-tab-chip.active');
      const inactiveTab = document.querySelector('.jlpt-tab-chip:not(.active)');
      const instructorChip = document.querySelector('.jlpt-speaker-chip.speaker-instructor');
      const maleChip = document.querySelector('.jlpt-speaker-chip.speaker-male');
      const femaleChip = document.querySelector('.jlpt-speaker-chip.speaker-female');
      const bubbleJa = document.querySelector('.jlpt-bubble-ja');
      const bubbleId = document.querySelector('.jlpt-bubble-id');

      const csContainer = container ? window.getComputedStyle(container) : {};
      const csBackdrop = backdrop ? window.getComputedStyle(backdrop) : {};
      const csHandle = handleBar ? window.getComputedStyle(handleBar) : {};
      const csTabs = tabs ? window.getComputedStyle(tabs) : {};
      const csActiveTab = activeTab ? window.getComputedStyle(activeTab) : {};
      const csInactiveTab = inactiveTab ? window.getComputedStyle(inactiveTab) : {};
      const csInst = instructorChip ? window.getComputedStyle(instructorChip) : {};
      const csMale = maleChip ? window.getComputedStyle(maleChip) : {};
      const csFemale = femaleChip ? window.getComputedStyle(femaleChip) : {};
      const csBja = bubbleJa ? window.getComputedStyle(bubbleJa) : {};
      const csBid = bubbleId ? window.getComputedStyle(bubbleId) : {};

      return {
        isOpen: sheet ? sheet.classList.contains('open') : false,
        containerBg: csContainer.backgroundColor,
        containerBorder: csContainer.border,
        containerShadow: csContainer.boxShadow,
        containerColor: csContainer.color,
        backdropBg: csBackdrop.backgroundColor,
        handleBarSize: handleBar ? `${handleBar.getBoundingClientRect().width}x${handleBar.getBoundingClientRect().height}` : '',
        handleBarBg: csHandle.backgroundColor,
        tabsBg: csTabs.backgroundColor,
        activeTabBg: csActiveTab.backgroundColor,
        activeTabColor: csActiveTab.color,
        activeTabWeight: csActiveTab.fontWeight,
        inactiveTabBg: csInactiveTab.backgroundColor,
        inactiveTabColor: csInactiveTab.color,
        instructorChipBg: csInst.backgroundColor,
        instructorChipColor: csInst.color,
        maleChipBg: csMale.backgroundColor,
        maleChipColor: csMale.color,
        femaleChipBg: csFemale.backgroundColor,
        femaleChipColor: csFemale.color,
        bubbleJaColor: csBja.color,
        bubbleIdColor: csBid.color,
        bubbleIdBg: csBid.backgroundColor
      };
    });

    // Switch to Explain tab and screenshot
    await page.evaluate(() => {
      if (window.switchJlptSheetTab) window.switchJlptSheetTab('explain');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(root, 'tests/listening-audit-sheet-explain.png') });

    // 3B. OPEN FILTER MODAL & SCREENSHOT
    await page.evaluate(() => {
      if (window.closeJlptDetailSheet) window.closeJlptDetailSheet();
      if (window.openJlptFilterModal) window.openJlptFilterModal();
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(root, 'tests/listening-audit-filter.png') });
    await page.evaluate(() => {
      if (window.closeJlptFilterModal) window.closeJlptFilterModal();
    });
    await page.waitForTimeout(300);

    // 4. CHECK FONT WEIGHT 900 VIOLATIONS ACROSS DOM
    auditResults.fontViolations = await page.evaluate(() => {
      const violations = [];
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        const cs = window.getComputedStyle(el);
        if (cs.fontWeight === '900') {
          violations.push({
            tag: el.tagName,
            className: el.className,
            id: el.id,
            textSnippet: (el.textContent || '').trim().slice(0, 30),
            fontFamily: cs.fontFamily
          });
        }
      }
      return violations;
    });

    // 5. TEST SKILLS LAB LISTENING CARD (.fsl-card-listening)
    // Close JLPT modal first
    await page.evaluate(() => {
      if (window.closeListeningPanel) window.closeListeningPanel();
    });
    await page.waitForTimeout(300);

    // Render an .fsl-card-listening mock in the DOM to measure its styles
    auditResults.fslSession = await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'testFslRoot';
      container.innerHTML = `
        <article class="fsl-card fsl-card-listening">
          <button type="button" class="fsl-exit-btn">✕</button>
          <h2>Sesi Listening Harian</h2>
          <div class="fsl-player">
            <span class="fsl-mascot-slot"></span>
          </div>
          <div class="fsl-actions fsl-audio-actions">
            <button type="button" class="fsl-primary fsl-play-hero">
              <span class="fsl-play-icon">▶</span>
              <span>Dengarkan</span>
              <span class="fsl-hero-eq"><i></i><i></i><i></i><i></i></span>
              <span class="fsl-hero-replays">2x</span>
            </button>
          </div>
          <fieldset class="fsl-work">
            <div class="fsl-options">
              <button type="button" class="fsl-option">
                <span class="fsl-option-badge">A</span>
                <span class="fsl-option-text">Pilihan jawaban latihan harian A</span>
              </button>
              <button type="button" class="fsl-option is-correct">
                <span class="fsl-option-badge">B</span>
                <span class="fsl-option-text">Pilihan jawaban benar B</span>
              </button>
              <button type="button" class="fsl-option is-wrong">
                <span class="fsl-option-badge">C</span>
                <span class="fsl-option-text">Pilihan jawaban salah C</span>
              </button>
            </div>
          </fieldset>
        </article>
      `;
      document.body.appendChild(container);

      const card = container.querySelector('.fsl-card-listening');
      const exitBtn = container.querySelector('.fsl-exit-btn');
      const playHero = container.querySelector('.fsl-play-hero');
      const opt = container.querySelector('.fsl-option');
      const optCorrect = container.querySelector('.fsl-option.is-correct');
      const optWrong = container.querySelector('.fsl-option.is-wrong');

      const csCard = card ? window.getComputedStyle(card) : {};
      const csExit = exitBtn ? window.getComputedStyle(exitBtn) : {};
      const csPlay = playHero ? window.getComputedStyle(playHero) : {};
      const csOpt = opt ? window.getComputedStyle(opt) : {};
      const csCorrect = optCorrect ? window.getComputedStyle(optCorrect) : {};
      const csWrong = optWrong ? window.getComputedStyle(optWrong) : {};

      const rExit = exitBtn ? exitBtn.getBoundingClientRect() : {};
      const rPlay = playHero ? playHero.getBoundingClientRect() : {};

      return {
        cardBg: csCard.backgroundColor,
        cardBorder: csCard.border,
        cardShadow: csCard.boxShadow,
        cardRadius: csCard.borderRadius,
        exitSize: `${rExit.width}x${rExit.height}`,
        exitBg: csExit.backgroundColor,
        exitColor: csExit.color,
        exitBorder: csExit.border,
        playHeroHeight: `${rPlay.height}px (computed: ${csPlay.height})`,
        playHeroBg: csPlay.backgroundColor,
        playHeroColor: csPlay.color,
        playHeroRadius: csPlay.borderRadius,
        optBg: csOpt.backgroundColor,
        optBorder: csOpt.border,
        optShadow: csOpt.boxShadow,
        optColor: csOpt.color,
        optCorrectBg: csCorrect.backgroundColor,
        optCorrectBorder: csCorrect.border,
        optCorrectShadow: csCorrect.boxShadow,
        optWrongBg: csWrong.backgroundColor,
        optWrongBorder: csWrong.border,
        optWrongShadow: csWrong.boxShadow
      };
    });

    console.log(JSON.stringify(auditResults, null, 2));

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

audit();
