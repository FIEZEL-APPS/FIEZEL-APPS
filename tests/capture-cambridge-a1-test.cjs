const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Testing Cambridge Senior Examiner at Level A1 ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Open Persona Modal and select Cambridge Senior Examiner
  await page.click('[data-testid="persona-picker-trigger"]');
  await page.waitForTimeout(400);

  const cambridgeCard = page.locator('[data-testid="persona-card-cambridge_examiner"]');
  if (await cambridgeCard.isVisible()) {
    await cambridgeCard.click();
    await page.waitForTimeout(1000);
  }

  // 2. Open CEFR selector and choose A1
  await page.click('[data-testid="cefr-level-selector-btn"]');
  await page.waitForTimeout(400);
  await page.click('[data-testid="cefr-option-a1"]');
  await page.waitForTimeout(800);

  // 3. Inspect button and UI
  const cefrText = await page.locator('[data-testid="cefr-level-selector-btn"]').textContent();
  console.log('Active CEFR text on stage:', cefrText.trim());

  const reportDir = path.resolve(__dirname, '../reports');
  const screenshotPath = path.join(reportDir, 'cambridge-a1-verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`[Screenshot Saved]: ${screenshotPath}`);

  await browser.close();
  console.log('--- Cambridge A1 Inspection Finished Successfully ---');
})();
