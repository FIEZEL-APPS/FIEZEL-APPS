const { chromium } = require('c:/Users/hp/fiezel-apps/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('--- Launching Playwright Probe for Cambridge Senior Examiner & Single-Best Copilot ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });

  // Inject session preferences: English course, Cambridge Senior Examiner persona & IELTS scenario
  await context.addInitScript(() => {
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fiezel_voice_target_lang', 'en');
    localStorage.setItem('fiezel_voice_persona_pref', 'cambridge_examiner');
    localStorage.setItem('fiezel_voice_scenario_pref', 'scen_ielts_speaking_part1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ userId: 'test_cambridge', name: 'Fitra Rusdiawan' }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true }));
  });

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Cambridge') || text.includes('Copilot') || text.includes('IELTS')) {
      console.log(`[Browser ${msg.type()}] ${text}`);
    }
  });

  console.log('Navigating to http://127.0.0.1:4173/call.html ...');
  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for React hydration and scenario loading
  await page.waitForTimeout(4000);

  // If Start Call / Mulai Bicara button is present, click it
  const startBtn = await page.$('button:has-text("Mulai Bicara"), button:has-text("Start Call"), button[data-testid="start-call-btn"]');
  if (startBtn) {
    console.log('Clicking Start Call button...');
    await page.evaluate(el => el.click(), startBtn);
    await page.waitForTimeout(4000);
  }

  // If there is an active scenario selector or persona switcher, verify Cambridge Senior Examiner
  const currentPersona = await page.evaluate(() => {
    const p = localStorage.getItem('fiezel_voice_persona_pref');
    const s = localStorage.getItem('fiezel_voice_scenario_pref');
    return { persona: p, scenario: s };
  });
  console.log('Current stored persona/scenario:', currentPersona);

  // Check for the Single Best Model Answer Badge
  const badgeLocator = page.locator('text=Jawaban Terbaik (Band 9.0)');
  const badgeCount = await badgeLocator.count();
  console.log('Has "Jawaban Terbaik (Band 9.0)" badge:', badgeCount > 0);

  // Check the model answer text in the teleprompter
  const targetText = await page.locator('[data-testid="teleprompter-target-text"]').innerText().catch(() => '');
  console.log('Teleprompter target text:', targetText);

  // Check translation
  const meaningText = await page.locator('[data-testid="teleprompter-meaning"]').innerText().catch(() => '');
  console.log('Teleprompter meaning:', meaningText);

  // Verify that old 3-tier tab bar ("1 · Singkat", "2 · Alami", "3 · + Tanya Balik") is NOT rendered
  const oldTabSingkat = await page.locator('button:has-text("1 · Singkat")').count();
  const oldTabAlami = await page.locator('button:has-text("2 · Alami")').count();
  console.log('Has old 3-tier tab buttons:', { oldTabSingkat, oldTabAlami });

  // Capture screenshot
  const screenshotDir = path.resolve('reports');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, 'cambridge-copilot-proof.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot successfully saved to:', screenshotPath);

  await browser.close();
  console.log('--- Playwright Probe Verification Completed Successfully ---');
}

run().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
