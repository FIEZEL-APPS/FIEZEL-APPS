import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/call.html';
  const filePath = path.join(ROOT, urlPath.replace(/^\//, ''));

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
console.log(`Test server running on port ${port}`);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox'],
});

const page = await browser.newPage({
  viewport: { width: 390, height: 844 }, // Mobile phone iPhone 14
  deviceScaleFactor: 2,
});

try {
  console.log('Navigating to call.html?tab=call&lang=ja...');
  await page.goto(`http://localhost:${port}/call.html?tab=call&lang=ja`, { waitUntil: 'networkidle' });

  // 1. Verify Topbar has NO API Key button
  const apiKeyBtn = await page.$('button[title*="API Key"]');
  const keyIcons = await page.$$('svg.lucide-key');
  console.log(`API Key buttons found in topbar: ${apiKeyBtn ? 'YES (FAIL)' : 'NO (PASS)'}`);
  console.log(`Lucide Key icons found: ${keyIcons.length} (PASS if 0)`);
  if (apiKeyBtn || keyIcons.length > 0) {
    throw new Error('FAIL: Topbar must NOT contain an API key button!');
  }

  // 2. Check initial window scroll position
  const initialScrollY = await page.evaluate(() => window.scrollY);
  console.log(`Initial window.scrollY: ${initialScrollY}`);
  if (initialScrollY !== 0) {
    throw new Error(`FAIL: Initial window.scrollY is not 0 (got ${initialScrollY})`);
  }

  // 3. Check bottom dock position
  const dock = await page.$('[data-testid="mitra-kaiwa-bottom-dock"]');
  if (!dock) {
    throw new Error('FAIL: Bottom dock not found!');
  }
  const dockBoxBefore = await dock.boundingBox();
  console.log(`Dock bounding box before turn: y=${dockBoxBefore.y}, height=${dockBoxBefore.height}`);

  // 4. Send a text turn from user
  const input = await page.$('[data-testid="voice-turn-input"]');
  if (!input) {
    throw new Error('FAIL: Voice turn input not found!');
  }
  await input.fill('こんにちは、元気ですか？');
  const sendBtn = await page.$('[data-testid="send-turn-btn"]');
  await sendBtn.click();

  // Wait 1.5 seconds for UI update
  await page.waitForTimeout(1500);

  // 5. Verify window.scrollY is STILL 0 (never scrolled into empty void)
  const afterScrollY = await page.evaluate(() => window.scrollY);
  console.log(`After turn window.scrollY: ${afterScrollY}`);
  if (afterScrollY !== 0) {
    throw new Error(`FAIL: window.scrollY scrolled to ${afterScrollY}! Must remain 0.`);
  }

  // 6. Verify dock bounding box is still anchored at bottom of viewport
  const dockBoxAfter = await dock.boundingBox();
  console.log(`Dock bounding box after turn: y=${dockBoxAfter.y}, height=${dockBoxAfter.height}`);
  const viewportHeight = 844;
  const dockBottomDistance = viewportHeight - (dockBoxAfter.y + dockBoxAfter.height);
  console.log(`Dock distance from bottom of viewport: ${dockBottomDistance}px`);
  if (dockBottomDistance > 5) {
    throw new Error(`FAIL: Bottom dock moved away from bottom by ${dockBottomDistance}px!`);
  }

  // 7. Verify no "naruhodo" / filler displayed or queued
  const bodyText = await page.innerText('body');
  const hasUnwantedFiller = bodyText.includes('なるほど！') || bodyText.includes('naruhodo');
  console.log(`Has unwanted "naruhodo" text: ${hasUnwantedFiller ? 'YES (FAIL)' : 'NO (PASS)'}`);
  if (hasUnwantedFiller) {
    throw new Error('FAIL: Unwanted "naruhodo" filler detected in page text!');
  }

  console.log('\n========================================');
  console.log('ALL EMPIRICAL AUDIT CHECKS PASSED (7/7)!');
  console.log('========================================');
} finally {
  await browser.close();
  server.close();
}
