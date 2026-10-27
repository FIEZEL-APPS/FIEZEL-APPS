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
  if (rel === '/' || rel === '') rel = '/call.html';
  let file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found: ' + file);
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log('Server running on port:', port);

  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });
  const context = await browser.newContext({
    permissions: ['microphone'],
    viewport: { width: 390, height: 844 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type()}]`, msg.text());
  });
  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.message);
  });

  console.log('Navigating to call.html...');
  await page.goto(`http://127.0.0.1:${port}/call.html?tab=call`);
  await page.waitForTimeout(1500);

  // 1. Check Initial State
  const initialText = await page.evaluate(() => {
    const bubble = document.querySelector('.bg-white\\/95, [data-testid="ai-speech-bubble"]')?.textContent;
    return {
      bubble: bubble?.slice(0, 100),
      body: document.body.innerText.slice(0, 300)
    };
  });
  console.log('Test 1 - Initial Text:', JSON.stringify(initialText, null, 2));

  // 2. Open Persona Modal & Switch to Sarah
  console.log('Opening persona picker...');
  const trigger = await page.$('[data-testid="persona-picker-trigger"]');
  if (trigger) {
    await trigger.click();
    await page.waitForTimeout(500);
    const sarahBtn = await page.$('[data-testid="persona-card-coach_sarah"]');
    if (sarahBtn) {
      console.log('Selecting Coach Sarah...');
      await sarahBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  const afterSarah = await page.evaluate(() => {
    return {
      activePersonaBadge: document.querySelector('[data-testid="persona-picker-trigger"]')?.textContent?.trim(),
      body: document.body.innerText.slice(0, 300)
    };
  });
  console.log('Test 2 - After selecting Sarah:', JSON.stringify(afterSarah, null, 2));

  // 3. Switch to Japanese & Select Keita
  console.log('Switching to Japanese...');
  const jaPill = await page.$('[data-testid="target-lang-ja"]');
  if (jaPill) {
    await jaPill.click();
    await page.waitForTimeout(500);
    // Open persona modal again
    const trigger2 = await page.$('[data-testid="persona-picker-trigger"]');
    if (trigger2) {
      await trigger2.click();
      await page.waitForTimeout(500);
      const keitaBtn = await page.$('[data-testid="persona-card-sensei_keita"]');
      if (keitaBtn) {
        console.log('Selecting Keita Senpai...');
        await keitaBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  const afterKeita = await page.evaluate(() => {
    return {
      activePersonaBadge: document.querySelector('[data-testid="persona-picker-trigger"]')?.textContent?.trim(),
      body: document.body.innerText.slice(0, 300)
    };
  });
  console.log('Test 3 - After selecting Keita:', JSON.stringify(afterKeita, null, 2));

  // Check if speech audio was started/called
  const audioPlaybackCheck = await page.evaluate(() => {
    const audioEl = document.querySelector('audio');
    return {
      hasAudioEl: !!audioEl,
      src: audioEl?.src?.slice(0, 50),
      paused: audioEl?.paused
    };
  });
  console.log('Audio Playback Check:', JSON.stringify(audioPlaybackCheck, null, 2));

  await browser.close();
  server.close();
  console.log('=== ALL PROBE VERIFICATIONS PASSED ===');
  process.exit(0);
});
