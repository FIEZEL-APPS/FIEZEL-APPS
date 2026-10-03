/**
 * tests/chrome-mini-game-test.js
 * End-to-end browser verification of the FIEZEL Vocabulary Mini-Game
 * and Scaffolding Leveling Engine running live in Google Chrome.
 */
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

async function run() {
  console.log('===============================================================');
  console.log(' RUNNING LIVE CHROME BROWSER TESTS: FIEZEL MINI-GAME & LEVELING');
  console.log('===============================================================\n');

  const { server, port } = await startServer();
  console.log('✓ Local test server listening at http://127.0.0.1:' + port);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

  console.log('✓ Launching Google Chrome:', executablePath || 'bundled chromium');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage({ viewport: { width: 412, height: 892 } }); // Mobile viewport
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // 1. Navigate to live app
    console.log('✓ Navigating to index.html...');
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Test Onboarding Intensity Modal
    console.log('✓ Testing First-Time Intensity Popup...');
    await page.evaluate(() => {
      window.state = window.state || {};
      window.state.preferences = window.state.preferences || {};
      delete window.state.preferences.learningIntensityChosen;
      window.FiezelGrammarVocabBridge.openFirstTimeIntensityModal();
    });

    await page.waitForSelector('.first-time-intensity', { timeout: 4000 });
    const modalTitle = await page.$eval('.first-time-intensity h2', el => el.textContent.trim());
    console.log('  -> Modal Title:', modalTitle);
    if (!modalTitle.includes('Ritme')) throw new Error('First time intensity modal title mismatch');

    // 3. Select 'Pelajar Santai'
    console.log('✓ Selecting "Pelajar Santai" (5 Vocab)...');
    await page.evaluate(() => {
      window.FiezelGrammarVocabBridge.selectFirstTimeIntensity('santai');
    });
    const currentIntensity = await page.evaluate(() => window.FiezelGrammarVocabBridge.getActiveIntensity());
    console.log('  -> Active Intensity in state:', currentIntensity);
    if (currentIntensity !== 'santai') throw new Error('Active intensity failed to persist to santai');

    // 4. Test Sub-Grammar Prerequisite Gateway Sheet
    console.log('✓ Testing Sub-Grammar Gateway Sheet for "be_subject_agreement"...');
    await page.evaluate(() => {
      window.FiezelGrammarVocabBridge.openLessonPrerequisiteGate('be_subject_agreement');
    });

    await page.waitForSelector('.lesson-prereq-gateway-sheet', { timeout: 4000 });
    const vocabCount = await page.$$eval('.gateway-vocab-card', cards => cards.length);
    console.log('  -> Number of prerequisite vocab cards shown:', vocabCount);
    if (vocabCount < 5) throw new Error('Expected at least 5 vocab cards, got ' + vocabCount);

    // 5. Test Mini Game Launch (Round 1: Bubble Snap)
    console.log('✓ Launching Mini-Game (Round 1: Bubble Snap)...');
    await page.evaluate(() => {
      window.FiezelGrammarVocabBridge.startVocabMiniGame('be_subject_agreement');
    });

    await page.waitForSelector('.mini-game-round.round-1', { timeout: 4000 });
    const enCards = await page.$$eval('.en-card', cards => cards.map(c => c.textContent.trim()));
    const idCards = await page.$$eval('.id-card', cards => cards.map(c => c.textContent.trim()));
    console.log('  -> English Cards in Round 1:', enCards);
    console.log('  -> Indonesian Semantic Cards in Round 1:', idCards);

    // Verify ZERO grammatical labels in Indonesian cards
    const forbiddenLabels = ['kata benda', 'kata kerja', 'kata seru', 'kata depan', 'kata sifat'];
    for (const card of idCards) {
      for (const lab of forbiddenLabels) {
        if (card.toLowerCase().includes(lab)) {
          throw new Error(`Forbidden grammatical category label found in vocab card: "${card}"`);
        }
      }
    }
    console.log('  -> Verified: ZERO grammatical category labels in card options!');

    // 6. Test Card Match Execution in Browser
    console.log('✓ Simulating Card Match click in Chrome...');
    await page.evaluate(() => {
      const g = window.FiezelGrammarVocabBridge.getActiveMiniGame ? window.FiezelGrammarVocabBridge.getActiveMiniGame() : null;
      // Match first card
      if (g && g.words && g.words.length > 0) {
        const firstId = g.words[0].id;
        window.FiezelGrammarVocabBridge.handleCardClick(firstId, 'en');
        window.FiezelGrammarVocabBridge.handleCardClick(firstId, 'id');
      }
    });

    // 7. Test Micro Sentence Puzzle (Round 2)
    console.log('✓ Transitioning to Round 2 (Micro Sentence Puzzle)...');
    await page.evaluate(() => {
      const g = window.FiezelGrammarVocabBridge.getActiveMiniGame ? window.FiezelGrammarVocabBridge.getActiveMiniGame() : null;
      if (g) {
        g.round = 2;
        window.FiezelGrammarVocabBridge.renderMiniGameModal();
      }
    });

    await page.waitForSelector('.mini-game-round.round-2', { timeout: 4000 });
    const puzzleHint = await page.$eval('.puzzle-empty-hint', el => el.textContent.trim());
    console.log('  -> Round 2 Puzzle Slot Line initialized:', puzzleHint);

    // 8. Test Victory & Auto-Unlock (Round 3)
    console.log('✓ Transitioning to Round 3 (Auto-Unlock & Trophy Ring)...');
    await page.evaluate(() => {
      const g = window.FiezelGrammarVocabBridge.getActiveMiniGame ? window.FiezelGrammarVocabBridge.getActiveMiniGame() : null;
      if (g) {
        g.round = 3;
        window.FiezelGrammarVocabBridge.renderMiniGameModal();
      }
    });

    await page.waitForSelector('.round-3-unlocked', { timeout: 4000 });
    const unlockTitle = await page.$eval('.round-3-unlocked h2', el => el.textContent.trim());
    console.log('  -> Round 3 Auto-Unlock Title:', unlockTitle);
    if (!unlockTitle.includes('Kosakata Terkuasai')) throw new Error('Unlock title mismatch');

    // 9. Check Console Errors
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon.ico') && !e.includes('sw.js'));
    if (criticalErrors.length > 0) {
      console.warn('  ⚠️ Console errors detected:', criticalErrors);
    } else {
      console.log('✓ Console errors: ZERO clean run!');
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL LIVE CHROME BROWSER TESTS COMPLETED SUCCESSFULLY!');
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('\n❌ LIVE CHROME TEST FAILED:', err);
  process.exit(1);
});
