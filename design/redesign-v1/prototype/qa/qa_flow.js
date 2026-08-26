/* QA Playwright — klik seluruh alur 6 langkah + screenshot per state */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 1200 }, deviceScaleFactor: 2 });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  const URL = 'http://127.0.0.1:4173/index.html';
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const dev = page.locator('.device');
  const shot = async (n) => {
    await page.waitForTimeout(420); // biar transisi 240ms + rise settle
    await dev.screenshot({ path: path.join(__dirname, `flow-0${n}.png`) });
    console.log(`shot flow-0${n}.png ok`);
  };

  // ---- 01 HOME
  await page.waitForSelector('#scr-home.active');
  await shot(1);

  // Keyboard check: fokus & Enter pada tombol mulai
  await page.locator('#btnStart').focus();
  const focusedOk = await page.evaluate(() => document.activeElement.id === 'btnStart');
  console.log('keyboard focus btnStart:', focusedOk);
  await page.keyboard.press('Enter');

  // ---- 02 LESSON SELECT
  await page.waitForSelector('#scr-lessons.active');
  await shot(2);

  // ---- 03 QUIZ — jawab benar (keyboard: Enter di opsi)
  await page.click('#lesson1');
  await page.waitForSelector('#scr-quiz.active');
  await page.waitForSelector('.opt[data-k="1"]');
  await page.locator('.opt[data-k="1"]').focus();
  await page.keyboard.press('Enter'); // "walked" benar
  await page.waitForSelector('.verdict.good');
  await page.waitForSelector('.why-card');
  await shot(3);

  // ---- 04 QUIZ — jawab salah + hint bertahap
  await page.click('#btnNext');
  await page.waitForSelector('.opt[data-k="0"]:not([disabled])');
  await page.click('.opt[data-k="0"]'); // "eat" salah
  await page.waitForSelector('.verdict.bad');
  await page.click('#btnHint'); // petunjuk 1
  await page.waitForSelector('#hintZone .hint-card');
  await page.click('#btnHint'); // petunjuk 2
  await page.waitForFunction(() => document.querySelectorAll('#hintZone .hint-card').length === 2);
  await shot(4);

  // jawab benar setelah hint → lanjut listening
  await page.click('.opt[data-k="2"]'); // "ate"
  await page.waitForSelector('.verdict.good');
  await page.click('#btnNext');

  // ---- 05 LISTENING — player baru
  await page.waitForSelector('#scr-listen.active');
  const finishDisabledFirst = await page.locator('#btnFinish').isDisabled();
  console.log('finish disabled sebelum audio:', finishDisabledFirst);
  await page.click('#btnPlay');
  await page.waitForFunction(() => !document.querySelector('#btnFinish').disabled, null, { timeout: 10000 });
  await page.waitForSelector('#transcript.show');
  await shot(5);

  // ---- 06 COMPLETION
  await page.click('#btnFinish');
  await page.waitForSelector('#scr-done.active');
  await page.waitForFunction(() => document.querySelector('#ringPct').textContent === '100%', null, { timeout: 5000 });
  const acc = await page.textContent('#statAcc');
  console.log('akurasi tampil:', acc);
  await shot(6); // confetti masih jatuh + ring sudah 100%

  // ---- Reset flow (tombol di completion) → kembali ke home dgn state bersih
  await page.click('#btnRestart');
  await page.waitForSelector('#scr-home.active');
  const stateAfter = await page.evaluate(() => JSON.stringify(window.__fz.state));
  console.log('state setelah reset:', stateAfter);

  // ---- Reset global + tombol back
  await page.click('#btnStart');
  await page.waitForSelector('#scr-lessons.active');
  await page.click('[data-back="home"]');
  await page.waitForSelector('#scr-home.active');
  console.log('tombol back ok');
  await page.click('#globalReset');
  await page.waitForSelector('#scr-home.active');
  console.log('reset global ok');

  // ---- prefers-reduced-motion: jalankan alur singkat tanpa error
  const rmCtx = await browser.newContext({ viewport: { width: 1100, height: 1200 }, reducedMotion: 'reduce' });
  const rmPage = await rmCtx.newPage();
  const rmErrors = [];
  rmPage.on('pageerror', e => rmErrors.push(String(e)));
  await rmPage.goto(URL, { waitUntil: 'networkidle' });
  await rmPage.click('#btnStart');
  await rmPage.waitForSelector('#scr-lessons.active');
  await rmPage.click('#lesson1');
  await rmPage.waitForSelector('.opt[data-k="1"]');
  await rmPage.click('.opt[data-k="1"]');
  await rmPage.waitForSelector('.verdict.good');
  const animCount = await rmPage.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 50).length);
  console.log('reduced-motion: animasi berjalan >50ms =', animCount, '| errors:', rmErrors.length);
  await rmCtx.close();

  // ---- overflow / clipping check
  const fit = await page.evaluate(() => {
    const v = document.querySelector('.viewport');
    return { vw: v.clientWidth, vh: v.clientHeight, scrollX: v.scrollWidth > v.clientWidth };
  });
  console.log('viewport fit:', JSON.stringify(fit));

  console.log('PAGEERRORS:', pageErrors.length, pageErrors);
  console.log('CONSOLE ERRORS:', consoleErrors.length, consoleErrors);
  await browser.close();
  if (pageErrors.length) process.exit(2);
})().catch(e => { console.error('QA FAILED:', e); process.exit(1); });
