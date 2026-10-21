import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
  if (reqPath.startsWith('/app/')) reqPath = reqPath.replace('/app/', '/');

  const filePath = path.join(root, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.mp3': 'audio/mpeg',
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4173, async () => {
  console.log('Static server listening on http://localhost:4173');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    }
  });

  try {
    console.log('--- 1. Navigating to /call.html (default) ---');
    await page.goto('http://localhost:4173/call.html', { waitUntil: 'networkidle' });

    // Assert that default tab is 'home' (Google AI Studio Beranda)
    await page.waitForSelector('text=Google AI Studio', { timeout: 5000 }).catch(() => {});

    // Check Beranda tab is active
    const berandaBtn = await page.locator('nav button:has-text("Beranda")').first();
    const berandaClass = await berandaBtn.getAttribute('class');
    console.log('Beranda button class:', berandaClass);
    if (!berandaClass.includes('bg-[#FFC700]')) {
      throw new Error('Expected Beranda to be the default active tab!');
    }
    console.log('✓ Default tab is Beranda (HomeRedesignView)');

    // Check PWA back button
    const pwaBtn = await page.locator('header a[href="./index.html"]').first();
    if (!await pwaBtn.isVisible()) {
      throw new Error('Expected PWA back button to be visible!');
    }
    console.log('✓ PWA Back Button visible and links to ./index.html');

    // Check Gemini Live Key modal trigger
    const keyBtn = await page.locator('header button[title*="Gemini"]').first();
    await keyBtn.click();
    await page.waitForSelector('text=Google AI Studio Gemini Live');
    console.log('✓ Gemini Live Key modal opens successfully');

    // Enter test key and save
    const keyInput = await page.locator('input[placeholder="AIzaSy..."]');
    await keyInput.fill('AIzaSyTestMockKey1234567890');
    const saveBtn = await page.locator('button:has-text("Simpan & Gunakan")');
    await saveBtn.click();

    // Check localStorage
    const savedKey = await page.evaluate(() => localStorage.getItem('fz_gemini_api_key'));
    console.log('Saved key in localStorage:', savedKey);
    if (savedKey !== 'AIzaSyTestMockKey1234567890') {
      throw new Error('Key was not saved properly in localStorage!');
    }
    console.log('✓ Gemini API Key successfully saved in localStorage');

    // Switch to Panggilan AI tab
    const callTabBtn = await page.locator('nav button:has-text("Panggilan AI")').first();
    await callTabBtn.click();
    await page.waitForTimeout(500);

    const currentUrl = page.url();
    console.log('Current URL after switching to Call:', currentUrl);
    if (!currentUrl.includes('tab=call')) {
      throw new Error('URL did not update with ?tab=call');
    }
    console.log('✓ URL successfully synchronized with ?tab=call');

    console.log('\nALL VOICE STUDIO PLAYWRIGHT PROBE AUDITS PASSED 100%!');
  } catch (err) {
    console.error('PROBE FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
});
