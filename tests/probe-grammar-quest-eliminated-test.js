#!/usr/bin/env node
/**
 * tests/probe-grammar-quest-eliminated-test.js
 *
 * EMPIRICAL AUDIT: Probe Chromium Playwright untuk membuktikan secara empiris bahwa
 * Fiezel Quest (mini-game matching/puzzle/prerequisite gate) saat memasuki sesi latihan baru di grammar
 * telah sepenuhnya dieliminasi, sehingga murid langsung masuk ke sesi kuis latihan grammar murni.
 */

'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');

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
  let file = path.join(root, rel.replace(/^\/+/, ''));
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

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`🚀 Local test server running on http://127.0.0.1:${port}`);

  console.log('🚀 Launching headless Chromium browser for empirical audit...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Dismiss boot splash & welcome if present
    await page.evaluate(() => {
      try {
        if (typeof dismissBootSplash === 'function') dismissBootSplash();
        if (typeof dismissWelcome === 'function') dismissWelcome();
        const splash = document.getElementById('fiezelBootSplash');
        if (splash) splash.remove();
        const auth = document.querySelector('.fz-auth');
        if (auth) auth.remove();
      } catch (_) {}
    });
    await page.waitForTimeout(500);

    console.log('1. Setting up fresh state and navigating to Grammar Hub...');
    await page.evaluate(() => {
      window.state = window.state || {};
      window.state.grammar = {}; // completely fresh grammar state
      window.state.level = 'A1';
      if (typeof openGrammarHub === 'function') openGrammarHub();
      else if (typeof setTab === 'function') setTab('grammar');
      else window.go('grammar');
    });
    await page.waitForTimeout(500);

    console.log('2. Entering grammar lesson via openGrammarLesson("subject_object_pronouns_and_possessives")...');
    await page.evaluate(() => {
      openGrammarLesson('subject_object_pronouns_and_possessives');
    });
    await page.waitForTimeout(1200);

    console.log('3. Verifying ZERO Fiezel Quest modal and instant entry into Quiz Shell...');
    const hasQuestSheet = await page.$('.modal-mini-game-sheet');
    const questBrand = await page.evaluate(() => {
      const el = document.querySelector('.game-brand');
      return el ? el.textContent.trim() : null;
    });

    const hasQuizShell = await page.$('.quiz-shell');
    const quizStem = await page.evaluate(() => {
      const el = document.getElementById('quizStem');
      return el ? el.textContent.trim() : null;
    });

    assert.strictEqual(hasQuestSheet, null, 'Fiezel Quest modal (.modal-mini-game-sheet) must NOT exist when entering grammar lesson');
    assert.strictEqual(questBrand, null, 'Fiezel Quest brand text must NOT exist when entering grammar lesson');
    assert.ok(hasQuizShell, 'Quiz shell (.quiz-shell) must be rendered immediately');
    assert.ok(quizStem && quizStem.length > 5, 'Quiz stem must be populated with a valid grammar practice question');

    console.log('✔ Verified: Fiezel Quest is 100% eliminated from grammar session entry.');
    console.log(`✔ Verified: Student enters quiz shell immediately with question: "${quizStem.substring(0, 60)}..."`);

    console.log('\n===============================================================');
    console.log('🎉 PROBE GRAMMAR QUEST ELIMINATED: ALL CHECKS PASSED EMPIRICALLY!');
    console.log('===============================================================\n');

  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => {
  console.error('❌ PROBE FAILED:', err);
  process.exit(1);
});
