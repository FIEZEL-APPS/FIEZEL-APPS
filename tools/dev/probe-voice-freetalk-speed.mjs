import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const PORT = 8089;
const ROOT = path.resolve('C:/Users/hp/fiezel-freetalk-speed');

// Simple static server
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath === '/' ? 'call.html' : urlPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(PORT, resolve));
console.log(`Local test server running at http://localhost:${PORT}`);

try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    permissions: ['microphone'],
  });

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  console.log('\n--- 1. Testing Japanese Free Talk & UI Constraints ---');
  await page.goto(`http://localhost:${PORT}/call.html?tab=call&lang=ja`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#fiezel-voice-studio-root', { timeout: 10000 });

  // 1. Check Topic Select is gone
  const topicSelect = await page.locator('select[aria-label="Pilih skenario panggilan suara"]').count();
  console.log(`Topic select dropdown count: ${topicSelect} (expected: 0)`);
  if (topicSelect !== 0) throw new Error('Topic select dropdown was NOT removed!');

  // 2. Check Header Title
  const headerTitle = await page.locator('[data-testid="mitra-kaiwa-header-title"]').innerText();
  console.log(`Header title text: "${headerTitle}"`);
  if (!headerTitle.includes('Free Talk') && !headerTitle.includes('Mitra Kaiwa')) {
    throw new Error(`Unexpected header title: ${headerTitle}`);
  }

  // 3. Check Beginner Answer Assistant / Suggestion Cards are completely gone
  const assistCount = await page.locator('[data-testid="beginner-answer-assistant"]').count();
  const suggestionCards = await page.locator('[data-testid="beginner-reply-card"]').count();
  console.log(`BeginnerAnswerAssistant count: ${assistCount}, suggestionCards: ${suggestionCards} (expected: 0)`);
  if (assistCount !== 0 || suggestionCards !== 0) throw new Error('Suggestion cards were NOT removed!');

  // 4. Check Viewport layout bounds & fixed bottom dock
  const containerClass = await page.locator('#fiezel-voice-studio-root > div').first().getAttribute('class');
  console.log(`Root container classes: ${containerClass}`);
  if (!containerClass.includes('overflow-hidden') || !containerClass.includes('100dvh')) {
    throw new Error('Root container missing strict 100dvh overflow-hidden viewport constraint!');
  }

  const bottomDock = page.locator('[data-testid="mitra-kaiwa-bottom-dock"]');
  const dockVisible = await bottomDock.isVisible();
  const dockClass = await bottomDock.getAttribute('class');
  console.log(`Bottom dock visible: ${dockVisible}, classes: ${dockClass}`);
  if (!dockVisible || !dockClass.includes('sticky bottom-0')) {
    throw new Error('Bottom dock is not fixed/sticky at the bottom!');
  }

  // 5. Send a general Japanese conversation line ("こんにちは！お元気ですか？")
  console.log('\n--- 2. Testing Free Talk Japanese Conversation Answer ---');
  const inputEl = page.locator('[data-testid="voice-turn-input"]');
  await inputEl.fill('こんにちは！元気ですか？');
  await page.locator('[data-testid="send-turn-btn"]').click();

  // Wait for turn to be diagnosed & AI reply displayed
  await page.waitForTimeout(1500);

  const turns = page.locator('[data-testid="turn-diagnosis-card"]');
  const turnCount = await turns.count();
  console.log(`Diagnosed turn count: ${turnCount}`);
  if (turnCount > 0) {
    const isOk = await turns.first().getAttribute('data-ok');
    console.log(`Turn diagnosis ok: ${isOk}`);
  }

  const hudAiText = await page.locator('[data-testid="live-hud-ai-text"]').innerText();
  const hudAiTrans = await page.locator('[data-testid="live-hud-ai-translation"]').innerText();
  console.log(`AI Live Reply: "${hudAiText.replace(/\n+/g, ' ')}"`);
  console.log(`AI Translation: "${hudAiTrans}"`);

  // Verify it is NOT ordering coffee in a kissaten!
  if (hudAiText.includes('ホットコーヒー') || hudAiText.includes('かしこまりました！ホットコーヒー')) {
    throw new Error('AI reply is STILL giving the broken cafe order fallback!');
  }
  if (hudAiText.includes('注文するときは助詞の「を」')) {
    throw new Error('AI reply is STILL lecturing about particle を!');
  }

  console.log('\n--- 3. Testing English Free Talk ---');
  await page.goto(`http://localhost:${PORT}/call.html?tab=call&lang=en`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#fiezel-voice-studio-root', { timeout: 10000 });

  const enHeaderTitle = await page.locator('[data-testid="mitra-kaiwa-header-title"]').innerText();
  console.log(`EN Header title text: "${enHeaderTitle}"`);

  const enInputEl = page.locator('[data-testid="voice-turn-input"]');
  await enInputEl.fill('Hey Alex, how is your day going?');
  await page.locator('[data-testid="send-turn-btn"]').click();
  await page.waitForTimeout(1500);

  const enHudText = await page.locator('[data-testid="live-hud-ai-text"]').innerText();
  const enHudTrans = await page.locator('[data-testid="live-hud-ai-translation"]').innerText();
  console.log(`EN AI Live Reply: "${enHudText.replace(/\n+/g, ' ')}"`);
  console.log(`EN AI Translation: "${enHudTrans}"`);

  if (enHudText.includes('hybrid schedules') || enHudText.includes('library with your family')) {
    throw new Error('EN AI reply is STILL giving IELTS/cafe fallback!');
  }

  console.log('\n--- 4. Checking Page Errors ---');
  console.log(`Page errors: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    console.error('Errors:', pageErrors);
    throw new Error(`Probe found ${pageErrors.length} page errors!`);
  }

  console.log('\n=== ALL PROBE CHECKS PASSED WITH 100% SUCCESS! ===');
  await browser.close();
} finally {
  server.close();
}
