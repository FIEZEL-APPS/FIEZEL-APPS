import { chromium } from 'playwright';

async function main() {
  console.log('[PROBE] Testing Kawan Bicara FaceTime stage in call.html...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  await page.addInitScript(() => {
    try {
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({
        user: { id: 'u_test', email: 'test@fiezel.app', name: 'Budi' },
        token: 'mock_token',
        expiresAt: Date.now() + 86400000
      }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
        done: true,
        userName: 'Budi',
        targetLanguage: 'en',
        nativeLanguage: 'id',
        goal: 'career'
      }));
      localStorage.setItem('fz_target_course', 'en');
    } catch (_) {}
  });

  console.log('[PROBE] Opening call.html?lang=en directly...');
  await page.goto('http://localhost:4173/call.html?lang=en', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const stageInfo = await page.evaluate(() => {
    const mochiStage = document.querySelector('[data-testid="mochi-3d-stage"], [data-testid="mochi-stage"]');
    const canvas = mochiStage?.querySelector('canvas');
    const mochiInst = (window).__fzVoiceMochiInstance;
    return {
      hasStage: !!mochiStage,
      hasCanvas: !!canvas,
      stageRect: mochiStage ? mochiStage.getBoundingClientRect() : null,
      canvasRect: canvas ? canvas.getBoundingClientRect() : null,
      hasMochiInst: !!mochiInst
    };
  });
  console.log('[PROBE] Kawan Bicara stage info:', stageInfo);

  // Capture screenshot of the full mobile FaceTime view
  await page.screenshot({ path: 'C:/Users/hp/.gemini/antigravity/brain/8302ce77-5db8-4b7a-b9a7-bf0cd2527454/kawan-bicara-live-facetime.png' });
  console.log('[PROBE] Captured screenshot: kawan-bicara-live-facetime.png');

  await browser.close();
  console.log('[PROBE] Kawan Bicara check completed!');
}

main().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
