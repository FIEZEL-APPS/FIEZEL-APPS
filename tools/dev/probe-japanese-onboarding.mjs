import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`[PROBE] Local test server running on port ${port}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Bersihkan data awal supaya onboarding mulai dari awal, hilangkan splash dan dialog yang menutupi
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('fz_user_registered', '1');
    localStorage.setItem('fz_auth_mode', 'guest');
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ locale: 'id' }));
    setInterval(() => {
      document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash').forEach(e => e.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('fz-booting', 'fz-auth-open');
    }, 50);
  });

  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForTimeout(1000);

  // Stub validateLearnerNameAvailability agar tidak terkena timeout jaringan
  await page.evaluate(() => {
    window.validateLearnerNameAvailability = async () => ({ ok: true });
    window.showOnboarding(window, { force: true });
  });
  console.log('[PROBE] Onboarding triggered');
  await page.waitForTimeout(600);

  // Langkah 1: Ketik Nama Murid
  const nameInput = await page.waitForSelector('[data-ob-name]', { timeout: 8000 });
  await nameInput.fill('Aoi');
  await page.waitForTimeout(200);
  const advBtn = await page.$('[data-ob-advance]');
  await advBtn.click();
  console.log('[PROBE] Step 1 Name submitted: Aoi');
  await page.waitForTimeout(600);

  // Langkah 2: Pilih Kursus Bahasa Jepang
  const jaBtn = await page.waitForSelector('[data-ob-course="ja"]', { timeout: 8000 });
  console.log('[PROBE] Course selector found, clicking Japanese course...');
  await jaBtn.click();
  await page.waitForTimeout(400);

  // Verifikasi panel onboarding jepang muncul
  const jaPanelVisible = await page.evaluate(() => {
    const p = document.querySelector('[data-ob-ja-panel]');
    if (!p) return false;
    const style = window.getComputedStyle(p);
    return style.display === 'flex';
  });
  console.log('[PROBE] Japanese Panel is visible (display: flex):', jaPanelVisible);

  // Verifikasi tombol kesiapan Kana (bebas emoticon murahan & teks terlihat jelas)
  const kanaOptionsInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-ob-kana]'));
    return btns.map(b => ({
      val: b.getAttribute('data-ob-kana'),
      text: b.querySelector('.fz-kana-btn-badge')?.textContent?.trim() || '',
      color: window.getComputedStyle(b.querySelector('.fz-kana-btn-badge') || b).color,
      bg: window.getComputedStyle(b).backgroundColor
    }));
  });
  console.log('[PROBE] Kana readiness options info:', JSON.stringify(kanaOptionsInfo, null, 2));

  // Verifikasi Interaksi Ruby Click: Klik kata "東京"
  await page.click('[data-ob-ruby][data-word="東京"]');
  await page.waitForTimeout(200);
  const chipWord1 = await page.evaluate(() => {
    const chip = document.querySelector('[data-ob-inspection-chip]');
    const word = chip ? chip.querySelector('[data-ob-chip-word]')?.textContent : '';
    const reading = chip ? chip.querySelector('[data-ob-chip-reading]')?.textContent : '';
    const meaning = chip ? chip.querySelector('[data-ob-chip-meaning]')?.textContent : '';
    const hasBkt = !!(chip && chip.querySelector('.fz-chip-bkt'));
    return { word, reading, meaning, hasBkt };
  });
  console.log('[PROBE] Tapped 東京 -> Chip inspection:', chipWord1);

  // Verifikasi Interaksi Ruby Click: Klik kata "行き"
  await page.click('[data-ob-ruby][data-word="行き"]');
  await page.waitForTimeout(200);
  const chipWord2 = await page.evaluate(() => {
    const chip = document.querySelector('[data-ob-inspection-chip]');
    const word = chip ? chip.querySelector('[data-ob-chip-word]')?.textContent : '';
    const reading = chip ? chip.querySelector('[data-ob-chip-reading]')?.textContent : '';
    const meaning = chip ? chip.querySelector('[data-ob-chip-meaning]')?.textContent : '';
    return { word, reading, meaning };
  });
  console.log('[PROBE] Tapped 行き -> Chip inspection:', chipWord2);

  // Verifikasi Furigana Toggle Pill: Klik toggle pill
  const furiStatusBefore = await page.evaluate(() => {
    return document.querySelector('[data-ob-furi-status]')?.textContent;
  });
  console.log('[PROBE] Furigana status before toggle:', furiStatusBefore);

  await page.click('[data-ob-toggle-furigana]');
  await page.waitForTimeout(200);

  const furiStatusAfter = await page.evaluate(() => {
    const status = document.querySelector('[data-ob-furi-status]')?.textContent;
    const card = document.querySelector('[data-ob-sentence-card]');
    const hasHideClass = card ? card.classList.contains('hide-furigana') : false;
    return { status, hasHideClass };
  });
  console.log('[PROBE] Furigana status after toggle:', furiStatusAfter);

  // Pilih opsi "Sudah Hafal Kana"
  await page.click('[data-ob-kana="fluent"]');
  await page.waitForTimeout(200);
  const kanaPrefSelected = await page.evaluate(() => {
    const btn = document.querySelector('[data-ob-kana="fluent"]');
    return btn ? btn.classList.contains('is-selected') : false;
  });
  console.log('[PROBE] "Sudah Hafal Kana" option is-selected:', kanaPrefSelected);

  // Verifikasi Zero-Scrolling: Analisis tinggi setiap elemen penyusun
  const layoutBreakdown = await page.evaluate(() => {
    const ob = document.querySelector('.fiezel-ob');
    const items = [
      '.fiezel-ob-reveal',
      '.fiezel-topbar',
      '.fiezel-stepper',
      '.fiezel-stage',
      '.fiezel-sheet',
      '.fiezel-title',
      '.fiezel-course-grid',
      '.fiezel-ja-onboarding-panel',
      '.fiezel-note',
      '[data-ob-advance]'
    ];
    const details = {};
    for (const sel of items) {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        details[sel] = {
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          height: Math.round(r.height),
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          paddingTop: cs.paddingTop,
          paddingBottom: cs.paddingBottom
        };
      }
    }
    const jaChildren = [
      '.fz-ja-compact-header',
      '.fiezel-ja-kana-options',
      '.fiezel-kana-btn',
      '.fiezel-ob-sentence-card',
      '.fz-ob-jp-row',
      '.fz-ob-jp-line',
      '.fz-ob-inspection-chip'
    ];
    for (const sel of jaChildren) {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        details[sel] = { height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) };
      }
    }
    const adv = document.querySelector('[data-ob-advance]');
    const advRect = adv ? adv.getBoundingClientRect() : null;
    return {
      windowHeight: window.innerHeight,
      scrollHeight: ob ? ob.scrollHeight : 0,
      clientHeight: ob ? ob.clientHeight : 0,
      advBottom: advRect ? advRect.bottom : 0,
      fitsInViewport: advRect && advRect.bottom <= window.innerHeight,
      details
    };
  });
  console.log('[PROBE] Layout Breakdown (390x844):', JSON.stringify(layoutBreakdown, null, 2));

  // Ambil screenshot panel untuk inspeksi visual
  if (!fs.existsSync('mockups')) fs.mkdirSync('mockups', { recursive: true });
  await page.screenshot({ path: 'mockups/japanese-onboarding-preview.png', fullPage: false });
  console.log('[PROBE] Screenshot saved to mockups/japanese-onboarding-preview.png');

  // Multi Universal Device Screenshots:
  // 1. Mobile SE (375x667)
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(200);
  const seCheck = await page.evaluate(() => {
    const adv = document.querySelector('[data-ob-advance]');
    const r = adv ? adv.getBoundingClientRect() : null;
    return { fits: r && r.bottom <= window.innerHeight, bottom: r ? r.bottom : 0, h: window.innerHeight };
  });
  console.log('[PROBE] Zero-Scroll on Mobile SE (375x667):', seCheck);
  await page.screenshot({ path: 'mockups/japanese-onboarding-se.png', fullPage: false });

  // 2. Tablet (768x1024)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'mockups/japanese-onboarding-tablet.png', fullPage: false });

  // 3. Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'mockups/japanese-onboarding-desktop.png', fullPage: false });

  // Kembalikan ke mobile viewport awal untuk kelanjutan flow
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);

  // Lanjutkan onboarding dan verifikasi persistensi
  const nextBtn = await page.$('[data-ob-advance]');
  await nextBtn.click();
  await page.waitForTimeout(500);

  // Lewati langkah tujuan dan penempatan untuk menyelesaikan onboarding
  const skipBtn = await page.$('[data-ob-skip], [data-ob-step-skip]');
  if (skipBtn) {
    await skipBtn.click();
    await page.waitForTimeout(500);
  }
  const skipBtn2 = await page.$('[data-ob-skip], [data-ob-step-skip]');
  if (skipBtn2) {
    await skipBtn2.click();
    await page.waitForTimeout(600);
  }

  const storedData = await page.evaluate(() => {
    return {
      onboarding: JSON.parse(localStorage.getItem('fiezel-onboarding-v1') || '{}'),
      jaDisplay: JSON.parse(localStorage.getItem('fiezel-ja-display-v1') || '{}'),
      bodyNoFurigana: document.body.classList.contains('fz-ja-no-furigana')
    };
  });
  console.log('[PROBE] Stored data in localStorage & DOM:', JSON.stringify(storedData, null, 2));

  // Evaluasi kelulusan
  const passed = jaPanelVisible
    && kanaOptionsInfo.length === 2
    && kanaOptionsInfo[0].text === 'Butuh Furigana'
    && kanaOptionsInfo[1].text === 'Sudah Hafal Kana'
    && chipWord1.word === '東京'
    && chipWord1.hasBkt === false
    && chipWord2.word === '行き'
    && furiStatusAfter.status === 'OFF'
    && furiStatusAfter.hasHideClass === true
    && kanaPrefSelected === true
    && seCheck.fits === true
    && storedData.onboarding.course === 'ja'
    && storedData.onboarding.kanaPreference === 'fluent'
    && storedData.onboarding.furigana === false
    && storedData.jaDisplay.furigana === false
    && storedData.bodyNoFurigana === true;

  console.log('----------------------------------------------------');
  if (passed) {
    console.log('>>> [SUCCESS] PROBE-DRIVEN EMPIRICAL AUDIT 100% PASS! <<<');
  } else {
    console.error('>>> [FAILURE] PROBE ASSERTION FAILED! <<<');
  }
  console.log('----------------------------------------------------');

  await browser.close();
  server.close();
  process.exit(passed ? 0 : 1);
});
