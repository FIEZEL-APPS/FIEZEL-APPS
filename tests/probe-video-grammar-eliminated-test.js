#!/usr/bin/env node
/**
 * tests/probe-video-grammar-eliminated-test.js
 *
 * EMPIRICAL AUDIT: Probe Chromium Playwright untuk membuktikan secara empiris bahwa
 * seluruh kode dan jejak soal Video Grammar dan Video Lab Grammar telah dihapus
 * dari antarmuka aplikasi FIEZEL dan sesi-sesi kuis.
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
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to local server index.html
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof GRAMMAR_ITEMS !== 'undefined' && GRAMMAR_ITEMS.length > 0 && typeof G !== 'undefined' && Object.keys(G).length > 0, { timeout: 10000 });
  await page.waitForTimeout(500);

  console.log('1. Verifying global runtime scope...');
  const runtimeCheck = await page.evaluate(() => {
    return {
      hasFiezelGrammarVideo: typeof window.FiezelGrammarVideo !== 'undefined',
      hasStartVideoGrammarSession: typeof window.startVideoGrammarSession !== 'undefined',
      hasVideoGrammarBankCache: typeof window.__videoGrammarBankCache !== 'undefined'
    };
  });

  assert.strictEqual(runtimeCheck.hasFiezelGrammarVideo, false, 'window.FiezelGrammarVideo must be undefined');
  assert.strictEqual(runtimeCheck.hasStartVideoGrammarSession, false, 'window.startVideoGrammarSession must be undefined');
  assert.strictEqual(runtimeCheck.hasVideoGrammarBankCache, false, 'window.__videoGrammarBankCache must be undefined');
  console.log('✔ window.FiezelGrammarVideo, startVideoGrammarSession, and __videoGrammarBankCache are completely absent.');

  console.log('2. Verifying Grammar Hub UI...');
  await page.evaluate(() => {
    if (typeof openGrammarHub === 'function') openGrammarHub();
    else if (typeof setTab === 'function') setTab('grammar');
  });
  await page.waitForTimeout(500);

  const videoLabBtn = await page.$('[data-testid="grammar-video-lab-btn"]');
  assert.strictEqual(videoLabBtn, null, 'Video Lab button [data-testid="grammar-video-lab-btn"] must not exist in Grammar Hub DOM');
  console.log('✔ Video Lab button is absent from Grammar Hub DOM.');

  console.log('3. Verifying Lesson Session generation (20-question session)...');
  const sessionCheck = await page.evaluate(() => {
    if (typeof buildGrammarSessionQuestions !== 'function') return { error: 'buildGrammarSessionQuestions missing' };
    const lvl = typeof getActiveLevel === 'function' ? getActiveLevel() : 'A1';
    const items = typeof GRAMMAR_ITEMS !== 'undefined' ? GRAMMAR_ITEMS : [];
    const item = items.find(x => x.level === lvl && typeof G !== 'undefined' && G[x.skill]?.length > 0);
    if (!item) return { error: 'No matching item for level ' + lvl };
    const questions = buildGrammarSessionQuestions(item.skill, 20);
    const types = questions.map(q => q.type);
    const videoQuestions = questions.filter(q => q.type === 'video-grammar' || q.videoConfig);
    return {
      skill: item.skill,
      count: questions.length,
      types: [...new Set(types)],
      videoCount: videoQuestions.length
    };
  });

  assert.ok(sessionCheck.count > 0, `20-question session should generate questions, got: ${JSON.stringify(sessionCheck)}`);
  assert.strictEqual(sessionCheck.videoCount, 0, 'No video-grammar questions allowed in 20-question lesson session');
  console.log(`✔ 20-question session for skill "${sessionCheck.skill}" generated ${sessionCheck.count} questions of types: [${sessionCheck.types.join(', ')}], zero video questions.`);

  console.log('4. Verifying Quick Grammar Session generation...');
  const quickSessionCheck = await page.evaluate(() => {
    if (typeof buildGrammarQuickQuestions !== 'function') return { error: 'buildGrammarQuickQuestions missing' };
    const level = typeof getActiveLevel === 'function' ? getActiveLevel() : 'A1';
    const questions = buildGrammarQuickQuestions(level);
    const types = questions.map(q => q.type);
    const videoQuestions = questions.filter(q => q.type === 'video-grammar' || q.videoConfig);
    return {
      count: questions.length,
      types: [...new Set(types)],
      videoCount: videoQuestions.length
    };
  });

  assert.ok(quickSessionCheck.count > 0, `Quick session should generate questions, got: ${JSON.stringify(quickSessionCheck)}`);
  assert.strictEqual(quickSessionCheck.videoCount, 0, 'No video-grammar questions allowed in quick session');
  console.log(`✔ Quick session generated ${quickSessionCheck.count} questions of types: [${quickSessionCheck.types.join(', ')}], zero video questions.`);

  console.log('5. Verifying absence of obsolete script tag in DOM...');
  const scriptTag = await page.$('script[src*="fiezel-grammar-video"]');
  assert.strictEqual(scriptTag, null, 'Script tag for fiezel-grammar-video.js must not exist in DOM');
  console.log('✔ No script tag for fiezel-grammar-video.js in DOM.');

  await browser.close();
  server.close();
  console.log('\n🎉 ALL EMPIRICAL BROWSER AUDIT PROBES PASSED (100% GREEN)!');
  process.exit(0);
})().catch(err => {
  console.error('❌ Probe failed:', err);
  try { server.close(); } catch (_) {}
  process.exit(1);
});
