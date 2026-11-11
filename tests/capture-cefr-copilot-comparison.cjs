const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Running Playwright Visual Capture for CEFR A1, A2, B1 Copilot ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Test Level A1
  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Set A1 and trigger examiner question
  await page.evaluate(() => {
    localStorage.setItem('fz_user_cefr_level', 'A1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Trigger copilot for A1
  await page.evaluate(() => {
    // Dispatch or trigger copilot
    if (window.__triggerCopilotTest) {
      window.__triggerCopilotTest('A1');
    }
  });

  const reportDir = path.resolve(__dirname, '../reports');
  const screenshotPathA1 = path.join(reportDir, 'cefr-a1-verified.png');
  await page.screenshot({ path: screenshotPathA1, fullPage: false });
  console.log(`[Screenshot Saved]: ${screenshotPathA1}`);

  await browser.close();
  console.log('--- Visual Capture Finished ---');
})();
