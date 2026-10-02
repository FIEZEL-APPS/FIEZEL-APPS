const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

const server = http.createServer((req, res) => {
  const cleanUrl = (req.url || '/').split('?')[0];
  const rel = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  const p = path.join(root, rel);
  fs.readFile(p, (err, d) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' });
    res.end(d);
  });
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Fitra' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true, at: Date.now() }));
      localStorage.setItem('fz-tour-done', '1');
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-active-level-v1', 'A1');
      localStorage.setItem('fiezel-daily-ritual-v1', JSON.stringify({ lastDate: new Date().toISOString().slice(0, 10), streak: 1 }));
    } catch (_) {}
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:' + port + '/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  // Dismiss modals & unlock auth & ritual
  await page.evaluate(() => {
    try {
      if (typeof skipPuterSignIn === 'function') skipPuterSignIn();
      if (typeof dismissDailyRitual === 'function') dismissDailyRitual();
      document.querySelectorAll('.fz-auth, #welcome, #authGate, #fiezelBootSplash, #fzRitual, .fz-ritual, .fz-ritual-sheet, .modal-backdrop, .modal-panel, .fz-tour, .modal-scrim').forEach(el => el.remove());
      document.documentElement.classList.remove('fz-booting');
      document.body.classList.remove('auth-locked');
      if (typeof state !== 'undefined' && state) {
        state.ritualMeta = { lastDay: '2026-10-02' };
      }
    } catch (_) {}
  });

  // Wait for data load
  await page.waitForFunction(() => typeof buildGrammarSessionQuestions === 'function' && typeof G !== 'undefined' && G['can_ability'] && G['can_ability'].length > 0, { timeout: 15000 });
  await page.waitForTimeout(500);

  // Check question types from buildGrammarSessionQuestions
  const qTypes = await page.evaluate(() => {
    const qs = buildGrammarSessionQuestions('can_ability', 5);
    return qs.map((q, i) => ({ i, type: q.type, question: q.question, tokens: q.tokens }));
  });
  console.log('Session questions:', JSON.stringify(qTypes, null, 2));

  // Launch the token-order question directly into quizLoop
  await page.evaluate(() => {
    document.querySelectorAll('#welcome, #authGate, #fzRitual, .fz-ritual, .modal-backdrop, .modal-panel').forEach(el => el.remove());
    document.body.classList.remove('auth-locked');
    const qs = buildGrammarSessionQuestions('can_ability', 5);
    const tokenQ = qs.find(q => q.type === 'token-order') || qs[2];
    quizLoop({
      type: 'grammar',
      count: 1,
      pool: [tokenQ],
      factory: item => item,
      preserveOrder: true
    });
  });

  await page.waitForSelector('.token-bank .token-chip:not(.placeholder)', { timeout: 10000 });
  await page.waitForTimeout(400);

  // Verify initial chip computed font color is uniform #0F172A (rgb(15, 23, 42))
  const initialChips = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.token-bank .token-chip:not(.placeholder)'));
    return chips.map(c => ({
      text: c.textContent.trim(),
      color: getComputedStyle(c).color,
      className: c.className
    }));
  });
  console.log(`Verified ${initialChips.length} initial chips in bank:`);
  initialChips.forEach(c => {
    if (c.color !== 'rgb(15, 23, 42)') {
      throw new Error(`Chip "${c.text}" has non-uniform color: ${c.color}`);
    }
  });

  await page.screenshot({ path: path.join(root, 'test_qa_4_token_rail.png') });
  console.log('Saved test_qa_4_token_rail.png');

  // Click first 3 chips into the answer rail
  const chipButtons = await page.$$('.token-bank .token-chip:not(.placeholder)');
  await chipButtons[0].click();
  await page.waitForTimeout(200);
  const chipButtons2 = await page.$$('.token-bank .token-chip:not(.placeholder)');
  await chipButtons2[0].click();
  await page.waitForTimeout(200);
  const chipButtons3 = await page.$$('.token-bank .token-chip:not(.placeholder)');
  await chipButtons3[0].click();
  await page.waitForTimeout(300);

  // Verify rail chips have uniform font color
  const railChips = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.token-rail .token-chip'));
    return chips.map(c => ({
      text: c.textContent.trim(),
      color: getComputedStyle(c).color,
      className: c.className
    }));
  });
  console.log(`Verified ${railChips.length} placed chips in rail:`);
  railChips.forEach(c => {
    if (c.color !== 'rgb(15, 23, 42)') {
      throw new Error(`Rail chip "${c.text}" has non-uniform color: ${c.color}`);
    }
  });

  await page.screenshot({ path: path.join(root, 'test_qa_5_tokens_placed.png') });
  console.log('Saved test_qa_5_tokens_placed.png');

  // Click Reset button ("Hapus")
  await page.click('#tokenResetBtn');
  await page.waitForTimeout(300);

  // Verify reset chips in bank have uniform font color
  const resetChips = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.token-bank .token-chip:not(.placeholder)'));
    return chips.map(c => ({
      text: c.textContent.trim(),
      color: getComputedStyle(c).color,
      className: c.className
    }));
  });
  console.log(`Verified ${resetChips.length} reset chips in bank:`);
  resetChips.forEach(c => {
    if (c.color !== 'rgb(15, 23, 42)') {
      throw new Error(`Reset chip "${c.text}" has non-uniform color: ${c.color}`);
    }
  });

  await page.screenshot({ path: path.join(root, 'test_qa_6_tokens_reset.png') });
  console.log('Saved test_qa_6_tokens_reset.png');

  await browser.close();
  server.close();
  console.log('Susun Kata token rail tests fully completed!');
});
