const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function verify() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 440, height: 960 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const targetUrl = 'file:///' + path.resolve(__dirname, '../../mockups/preview-video-grammar-pilot.html').replace(/\\/g, '/');
  console.log('Opening:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  // 1. Screenshot Klip 1 (5 Soal)
  const pathKlip1 = path.resolve(__dirname, 'render_klip1_5q.png');
  await page.screenshot({ path: pathKlip1 });
  console.log('Saved Klip 1:', pathKlip1);

  // 2. Click Klip 2 (5 Soal)
  await page.click('#tab5Q2');
  await page.waitForTimeout(500);
  const pathKlip2 = path.resolve(__dirname, 'render_klip2_5q.png');
  await page.screenshot({ path: pathKlip2 });
  console.log('Saved Klip 2:', pathKlip2);

  // 3. Click 1 Soal Cepat
  await page.click('#tabReal');
  await page.waitForTimeout(500);
  const pathReal = path.resolve(__dirname, 'render_quick_1q.png');
  await page.screenshot({ path: pathReal });
  console.log('Saved Quick 1Q:', pathReal);

  await browser.close();

  if (errors.length) {
    console.error('Browser errors detected:', errors);
    process.exit(1);
  } else {
    console.log('[SUCCESS] All 3 views rendered cleanly with 0 errors!');
  }
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
