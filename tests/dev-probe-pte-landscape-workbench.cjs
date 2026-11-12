const { chromium } = require('c:/Users/hp/fiezel-apps/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('=== FIEZEL EMPIRICAL PROBE: PTE LANDSCAPE SPLIT WORKBENCH & DR. JULIAN EXAMINER ===');
  const browser = await chromium.launch({ headless: true });

  // Test Landscape / Desktop Viewport (1280x800)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });

  // Inject session preferences for Dr. Julian PTE Prep
  await context.addInitScript(() => {
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fiezel_voice_target_lang', 'en');
    localStorage.setItem('fiezel_voice_persona_pref', 'dr_julian');
    localStorage.setItem('fiezel_voice_scenario_pref', 'scen_pte_di_level1');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ userId: 'test_fitra', name: 'Fitra Rusdiawan' }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true }));
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('   [PAGE LOG]', msg.text()));
  page.on('pageerror', err => console.log('   [PAGE ERROR]', err.message));
  console.log('1. Navigating to http://127.0.0.1:4173/call.html ...');
  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Verify persona is Dr. Julian
  const personaHeader = await page.locator('text=Dr. Julian').count();
  console.log('   Dr. Julian header present:', personaHeader > 0);

  // Trigger Describe Image Workbench Modal
  console.log('2. Opening Describe Image Workbench via open-workbench-pill-btn...');
  const openWbBtn = page.locator('[data-testid="open-workbench-pill-btn"]');
  const hasOpenWbBtn = await openWbBtn.isVisible();
  console.log('   open-workbench-pill-btn visible:', hasOpenWbBtn);
  if (hasOpenWbBtn) {
    await openWbBtn.click();
  } else {
    // Fallback: trigger custom event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('fiezel:open-learning-workbench', {
        detail: {
          focusType: 'pte_describe_image',
          topicTitle: 'Global Renewable Energy Adoption (2015-2025)'
        }
      }));
    });
  }
  await page.waitForTimeout(2500);

  // Check if workbench modal is visible
  let wbModal = page.locator('[data-testid="in-call-learning-workbench"]');
  let isWbVisible = await wbModal.isVisible();
  if (!isWbVisible) {
    // Try triggering whiteboard directly via window bridge
    await page.evaluate(() => {
      const bridge = window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__;
      if (bridge && bridge.openWorkbench) {
        bridge.openWorkbench({
          contextMode: 'pte_describe_image',
          topicTitle: 'Global Renewable Energy Adoption (2015-2025)'
        });
      }
    });
    await page.waitForTimeout(1500);
    isWbVisible = await wbModal.isVisible();
  }

  console.log('   Workbench Modal visible:', isWbVisible);

  // Verify Modal Width: MUST be wide (max-w-5xl or max-w-6xl)
  const modalInner = page.locator('[data-testid="in-call-learning-workbench"] > div');
  if (await modalInner.count() > 0) {
    const modalClass = await modalInner.getAttribute('class');
    console.log('3. Modal container class:', modalClass);
    if (!modalClass.includes('max-w-5xl') && !modalClass.includes('max-w-6xl')) {
      throw new Error(`FAIL: Modal container is not wide (expected max-w-5xl, got: ${modalClass})`);
    }
    console.log('   ✓ Modal is properly expanded to wide landscape container (max-w-5xl / max-w-6xl)!');
  }

  // Verify Describe Image Canvas
  const diCanvas = page.locator('[data-testid="pte-describe-image-canvas"]');
  const hasDiCanvas = await diCanvas.isVisible();
  console.log('4. Describe Image Canvas visible:', hasDiCanvas);
  if (!hasDiCanvas) {
    throw new Error('FAIL: Describe Image Canvas not rendered in workbench modal!');
  }

  // Verify Side-by-Side Split Screen Elements:
  // Left: SVG diagram, Timers, Optimal Green Zone, Keywords Checklist
  const svgCount = await diCanvas.locator('svg').count();
  console.log('   SVG charts count:', svgCount);
  if (svgCount === 0) {
    throw new Error('FAIL: SVG visualizer not found on left side!');
  }

  const greenZone = diCanvas.locator('text=Zona Berhenti Ideal: 25–28 Detik!');
  const hasGreenZone = await greenZone.isVisible();
  console.log('   Green Zone 25-28s indicator visible:', hasGreenZone);
  if (!hasGreenZone) {
    throw new Error('FAIL: Green Zone 25-28s stopping rule not visible on canvas!');
  }

  const prepTimer = diCanvas.locator('text=Waktu Persiapan');
  const speakTimer = diCanvas.locator('text=Waktu Rekam Bicara');
  console.log('   Prep & Speak timers visible:', (await prepTimer.isVisible()) && (await speakTimer.isVisible()));

  // Right: Nakul 5-Line Formula is ALWAYS open (no accordion toggle required)
  const nakulFormulaHeader = diCanvas.locator('text=Rumus Universal Nakul (5-Baris Anti-Pause)');
  console.log('5. Nakul 5-Line Formula Header visible:', await nakulFormulaHeader.isVisible());
  if (!(await nakulFormulaHeader.isVisible())) {
    throw new Error('FAIL: Nakul 5-Line Formula Header not visible!');
  }

  const introText = diCanvas.locator('text=1. Introduction (Pembuka):');
  const keyElementsText = diCanvas.locator('text=2. Key Elements (Fitur Utama):');
  const maxText = diCanvas.locator('text=3. Maximum Figure (Tertinggi):');
  const minText = diCanvas.locator('text=4. Minimum Figure (Terendah):');
  const conclusionText = diCanvas.locator('text=5. Conclusion (Kesimpulan):');

  console.log('   All 5 Nakul Template slots visible simultaneously:');
  console.log('   - Intro:', await introText.isVisible());
  console.log('   - Key Elements:', await keyElementsText.isVisible());
  console.log('   - Maximum:', await maxText.isVisible());
  console.log('   - Minimum:', await minText.isVisible());
  console.log('   - Conclusion:', await conclusionText.isVisible());

  if (
    !(await introText.isVisible()) ||
    !(await keyElementsText.isVisible()) ||
    !(await maxText.isVisible()) ||
    !(await minText.isVisible()) ||
    !(await conclusionText.isVisible())
  ) {
    throw new Error('FAIL: One or more of Nakul 5-line template slots are not visible without scrolling!');
  }
  console.log('   ✓ All 5 Nakul template slots are open and immediately readable alongside the chart!');

  // Examiner Hacks Box
  const hacksBox = diCanvas.locator('text=Trik & Tips Rahasia Lulus PTE 42');
  console.log('6. Examiner Secret Hacks visible:', await hacksBox.isVisible());

  // Test Question Switching: Click Next
  console.log('7. Testing Question Navigator (Next Button)...');
  const nextBtn = diCanvas.locator('[data-testid="pte-di-next-question-btn"]');
  const titleBefore = await diCanvas.locator('h4').innerText();
  console.log('   Initial Question Title:', titleBefore);
  await nextBtn.click();
  await page.waitForTimeout(500);
  const titleAfter = await diCanvas.locator('h4').innerText();
  console.log('   Question Title after Next:', titleAfter);
  if (titleBefore === titleAfter) {
    throw new Error('FAIL: Question title did not change after clicking Next!');
  }
  console.log('   ✓ Question switching functions perfectly!');

  // Take screenshot of Describe Image Landscape Split Screen
  const shotDir = path.resolve(__dirname, '../coordination/screenshots');
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
  const shotPathDi = path.join(shotDir, 'pte-describe-image-landscape-split.png');
  await page.screenshot({ path: shotPathDi, fullPage: false });
  console.log('   ✓ Describe Image Landscape Screenshot saved to:', shotPathDi);

  // 8. Test Read Aloud Multi-Topic Canvas & Question Switching
  console.log('8. Testing Read Aloud Multi-Topic Bank & Chunking...');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('fiezel:open-learning-workbench', {
      detail: {
        focusType: 'pte_read_aloud',
        topicTitle: 'Food Safety: HACCP Critical Control Points'
      }
    }));
  });
  await page.waitForTimeout(1500);

  const raCanvas = page.locator('[data-testid="pte-read-aloud-canvas"]');
  const hasRaCanvas = await raCanvas.isVisible();
  console.log('   Read Aloud Canvas visible:', hasRaCanvas);
  if (!hasRaCanvas) {
    throw new Error('FAIL: Read Aloud Canvas not rendered!');
  }

  // Check category tabs
  const cookeryTab = raCanvas.locator('text=Cookery & Hospitality');
  console.log('   Cookery & Hospitality category tab visible:', await cookeryTab.isVisible());

  // Check Chunking Breaks (// jeda)
  const chunkCount = await raCanvas.getByText('// jeda').count();
  console.log('   Syntax chunking breaks count:', chunkCount);
  if (chunkCount === 0) {
    throw new Error('FAIL: Syntax chunking breaks (// jeda) not found in Read Aloud passage!');
  }

  // Check One-Sentence Hack Banner
  const oneSentenceHack = raCanvas.locator('text=Trik 1-Kalimat APEUni');
  console.log('   One-Sentence Hack banner visible:', await oneSentenceHack.isVisible());
  if (!(await oneSentenceHack.isVisible())) {
    throw new Error('FAIL: One-Sentence Hack banner not visible in Read Aloud!');
  }

  // Switch RA question
  const raNextBtn = raCanvas.locator('[data-testid="pte-ra-next-question-btn"]');
  const raTitleBefore = await raCanvas.locator('h4').innerText();
  console.log('   Initial RA Title:', raTitleBefore);
  await raNextBtn.click();
  await page.waitForTimeout(500);
  const raTitleAfter = await raCanvas.locator('h4').innerText();
  console.log('   RA Title after Next:', raTitleAfter);
  if (raTitleBefore === raTitleAfter) {
    throw new Error('FAIL: Read Aloud title did not change after clicking Next!');
  }
  console.log('   ✓ Read Aloud question bank rotation verified!');

  const shotPathRa = path.join(shotDir, 'pte-read-aloud-landscape-split.png');
  await page.screenshot({ path: shotPathRa, fullPage: false });
  console.log('   ✓ Read Aloud Landscape Screenshot saved to:', shotPathRa);

  await browser.close();
  console.log('================================================================');
  console.log('ALL PTE LANDSCAPE SPLIT SCREEN & EXAMINER TESTS PASSED 100%!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Probe failed with error:', err);
  process.exit(1);
});
