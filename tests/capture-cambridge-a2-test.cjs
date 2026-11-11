const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Testing Cambridge Senior Examiner at Level A2 ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Select Cambridge Senior Examiner
  await page.click('[data-testid="persona-picker-trigger"]');
  await page.waitForTimeout(400);
  const cambridgeCard = page.locator('[data-testid="persona-card-cambridge_examiner"]');
  if (await cambridgeCard.isVisible()) {
    await cambridgeCard.click();
    await page.waitForTimeout(800);
  }

  // 2. Select Level A2
  await page.click('[data-testid="cefr-level-selector-btn"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="cefr-option-a2"]');
  await page.waitForTimeout(800);

  const reportDir = path.resolve(__dirname, '../reports');
  const screenshotPath = path.join(reportDir, 'cambridge-a2-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[Screenshot Saved]: ${screenshotPath}`);

  await browser.close();
  console.log('--- Cambridge A2 Inspection Finished Successfully ---');
})();
