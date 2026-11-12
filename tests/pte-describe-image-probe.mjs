import pkg from 'file:///C:/Users/hp/fiezel-apps/node_modules/playwright/index.js';
const { chromium } = pkg;

async function runProbe() {
  console.log('[PROBE] Launching Chromium to test PTE Describe Image & Dr. Julian Workbench...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // mobile view
    locale: 'id-ID',
  });
  const page = await context.newPage();

  const consoleLogs = [];
  page.on('response', (res) => {
    if (res.status() >= 400) {
      consoleLogs.push(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  page.on('console', (msg) => {
    consoleLogs.push(`[PAGE CONSOLE ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (err) => {
    consoleLogs.push(`[PAGE CRASH] ${err.message}`);
  });

  console.log('[PROBE] Setting up candidate session for Dr. Julian & Describe Image...');
  await page.addInitScript(() => {
    localStorage.setItem('fiezel_voice_persona_pref', 'dr_julian');
    localStorage.setItem('fz_voice_persona_id', 'dr_julian');
    localStorage.setItem('fz_voice_scenario_id', 'scen_pte_di_prep');
    localStorage.setItem('fz_target_lang', 'en');
  });

  console.log('[PROBE] Navigating to http://127.0.0.1:4173/call.html?v=m025-790 ...');
  await page.goto('http://127.0.0.1:4173/call.html?v=m025-790', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check if root element mounted
  const rootExists = await page.$('#fiezel-voice-studio-root');
  console.log(`[PROBE] #fiezel-voice-studio-root element exists: ${Boolean(rootExists)}`);

  // Evaluate bank inside the browser context
  const bankEval = await page.evaluate(async () => {
    try {
      const root = document.getElementById('fiezel-voice-studio-root');
      const text = root ? root.innerText : '';
      const buttons = Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).filter(Boolean);
      const modals = Array.from(document.querySelectorAll('[role="dialog"], .fixed, .modal')).map((m) => m.innerText.slice(0, 100));
      return {
        hasRoot: Boolean(root),
        buttonCount: buttons.length,
        buttonsSample: buttons.slice(0, 15),
        hasDrJulian: text.includes('Dr. Julian') || buttons.some((b) => b.includes('Julian')),
        hasWorkbenchOrDescribeImage: text.includes('Describe Image') || text.includes('Universal Formula') || text.includes('Pearson') || text.includes('Global Renewable Energy'),
        modalTexts: modals.slice(0, 5),
      };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('[PROBE] Browser state evaluation with Dr. Julian:', JSON.stringify(bankEval, null, 2));

  await page.screenshot({ path: 'tests/pte-describe-image-workbench.png' });
  console.log('[PROBE] Screenshot 1 saved to tests/pte-describe-image-workbench.png');

  console.log('[PROBE] Testing Category Filter click: Line Graphs...');
  const lineSwitched = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-testid="in-call-learning-workbench"] button'));
    const lineBtn = btns.find((b) => b.innerText.includes('Line'));
    if (lineBtn) {
      lineBtn.click();
      return true;
    }
    return false;
  });
  console.log('[PROBE] Line filter clicked via DOM dispatch:', lineSwitched);
  await page.waitForTimeout(1000);

  const lineTitle = await page.evaluate(() => {
    return document.querySelector('[data-testid="in-call-learning-workbench"] h4')?.innerText || '';
  });
  console.log('[PROBE] Active question after Line filter click:', lineTitle);

  console.log('[PROBE] Testing Next button click...');
  const nextClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-testid="in-call-learning-workbench"] button'));
    const nextBtn = btns.find((b) => b.innerText.includes('Next'));
    if (nextBtn) {
      nextBtn.click();
      return true;
    }
    return false;
  });
  console.log('[PROBE] Next button clicked:', nextClicked);
  await page.waitForTimeout(1000);

  const nextTitle = await page.evaluate(() => {
    return document.querySelector('[data-testid="in-call-learning-workbench"] h4')?.innerText || '';
  });
  console.log('[PROBE] Active question after Next click:', nextTitle);

  console.log('[PROBE] Testing Acak Soal button click...');
  const randomClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('[data-testid="in-call-learning-workbench"] button'));
    const randomBtn = btns.find((b) => b.innerText.includes('Acak Soal'));
    if (randomBtn) {
      randomBtn.click();
      return true;
    }
    return false;
  });
  console.log('[PROBE] Random button clicked:', randomClicked);
  await page.waitForTimeout(1000);

  const randomTitle = await page.evaluate(() => {
    return document.querySelector('[data-testid="in-call-learning-workbench"] h4')?.innerText || '';
  });
  console.log('[PROBE] Active question after Acak Soal click:', randomTitle);

  if (consoleLogs.length > 0) {
    console.error('[PROBE] Found console errors during load:');
    consoleLogs.forEach((l) => console.error(l));
  } else {
    console.log('[PROBE] Clean console! Zero errors detected.');
  }

  await browser.close();
  console.log('[PROBE] Completed successfully.');
}

runProbe().catch((err) => {
  console.error('[PROBE FAILED]', err);
  process.exit(1);
});
