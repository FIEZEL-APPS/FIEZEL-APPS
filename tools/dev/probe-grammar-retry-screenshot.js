'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..', '..');
const ORIGIN = 'http://localhost:4173';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function loadPlaywright() {
  try { return require('playwright'); } catch (_) {}
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const local = path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', 'playwright');
  try { return require(local); } catch (_) { return null; }
}

function findChromium(pw) {
  try { return pw.chromium.executablePath(); } catch (_) {}
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const root = path.join(home, 'AppData', 'Local', 'ms-playwright');
  if (!fs.existsSync(root)) return null;
  const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+/.test(d));
  for (const d of dirs) {
    const cand = path.join(root, d, 'chrome-win', 'chrome.exe');
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

(async () => {
  const pw = loadPlaywright();
  const exe = pw && findChromium(pw);
  if (!pw || !exe) {
    console.log('SKIP: Playwright/Chromium not found');
    process.exit(0);
  }

  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });

  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(target)] || 'application/octet-stream', body: fs.readFileSync(target) });
  });

  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  });

  await page.goto(ORIGIN + '/');
  await page.waitForFunction(() => typeof window.quizLoop === 'function' && typeof window.makeGrammarQuestion === 'function' && window.getGrammarItems, null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Directly test the exact screenshot question A1-336 in a real quiz session
  const result = await page.evaluate(async () => {
    const items = window.getGrammarItems();
    const a1_336_item = items.find(x => x.item && x.item[8] === 'A1-336');
    if (!a1_336_item) return { error: 'A1-336 not found' };

    const q = window.makeGrammarQuestion(a1_336_item.skill, a1_336_item.item, 0);

    // Test 1: First wrong pick (hint ladder)
    window.quizLoop({ pool: [q], count: 1, title: 'Test A1-336', type: 'quick' });
    await new Promise(r => setTimeout(r, 600));

    const optionBtns = [...document.querySelectorAll('#options .option')];
    const onBtn = optionBtns.find(b => b.innerText.trim().toLowerCase().includes('on'));
    onBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const clue1 = document.querySelector('.tutor-diagnostic-clue')?.innerText || '';
    const ladder1 = document.querySelector('.tutor-ladder')?.innerText || '';

    // Test 2: Directly inspect what worked ladder renders for this question
    const workedTurn = window.tutorCompose(q, q.options.indexOf('on'), false, 'worked', 'hint', '');
    const exSimilar = window.grammarSimilarExample(q);

    return {
      clue1,
      ladder1,
      workedTurn,
      exSimilar,
      options: q.options,
      qStem: q.question
    };
  });

  console.log('--- EMPIRICAL PROBE RESULT FOR SCREENSHOT A1-336 ---');
  console.log('Question Stem:', result.qStem);
  console.log('Options:', result.options);
  console.log('Diagnostic Clue on "on":', result.clue1);
  console.log('Ladder on First Retry:', result.ladder1);
  console.log('Similar Example found for prepositions?:', result.exSimilar);
  console.log('Worked Turn Output:', result.workedTurn);

  assert.ok(result.clue1.includes('on') && result.clue1.includes('lantai'), 'Clue should explain why on is wrong');
  assert.strictEqual(result.exSimilar, null, 'Preposition questions must NOT return mismatched similar examples');
  assert.ok(!String(result.workedTurn?.ask || '').includes('next to'), 'Worked turn must NEVER include irrelevant "next to"');

  console.log('PROBE SUCCESS: All assertions for screenshot A1-336 PASSED!');
  await browser.close();
})();
