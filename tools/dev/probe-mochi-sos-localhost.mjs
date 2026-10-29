import { chromium } from 'file:///C:/Users/hp/fiezel-apps/node_modules/playwright/index.mjs';

async function run() {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Context (390x844)
  console.log('--- MOBILE PROBE (390x844) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await mobileContext.newPage();

  console.log('Navigating to http://localhost:3000 on mobile...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Clear state so intro modal triggers freshly (seenCount: 0)
  await page.evaluate(() => {
    try {
      localStorage.clear();
      const s = window.__getFiezelState ? window.__getFiezelState() : null;
      if (s) {
        s.mochiIntroSeenCount = 0;
        s.placementDone = false;
        s.placementVoicePassUsed = false;
      }
    } catch (_) {}
    if (typeof window.dismissWelcome === 'function') window.dismissWelcome();
    const ob = document.querySelector('.fiezel-ob');
    if (ob) ob.remove();
    const splash = document.querySelector('.fiezel-splash');
    if (splash) splash.remove();
  });
  await page.waitForTimeout(400);

  // Start placement test
  console.log('Starting placement test via startPlacement()...');
  await page.evaluate(() => {
    window.startPlacement();
  });

  await page.waitForSelector('.quiz-shell, #fzMochiIntroModal', { timeout: 8000 });
  await page.waitForTimeout(500);

  // Capture Intro Modal
  const introModalPresent = await page.evaluate(() => {
    const modal = document.getElementById('fzMochiIntroModal');
    return !!modal;
  });
  console.log('Intro Modal Present:', introModalPresent);

  if (introModalPresent) {
    await page.screenshot({ path: 'C:/Users/hp/fiezel-mochi-voice-sos-714/mochi-sos-intro-modal-mobile.png' });
    console.log('Screenshot saved: mochi-sos-intro-modal-mobile.png');

    // Dismiss modal cleanly via DOM click
    await page.evaluate(() => {
      const btn = document.getElementById('fzMochiIntroDismissBtn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(400);
  }

  // Verify Badge beside Mochi
  const badgeInfo = await page.evaluate(() => {
    const badge = document.getElementById('fzMochiTapBadge');
    return {
      hasBadge: !!badge,
      badgeText: badge ? badge.textContent : null
    };
  });
  console.log('Mochi Badge Info:', badgeInfo);

  // Save screenshot of quiz with badge
  await page.screenshot({ path: 'C:/Users/hp/fiezel-mochi-voice-sos-714/mochi-sos-badge-mobile.png' });
  console.log('Screenshot saved: mochi-sos-badge-mobile.png');

  // Trigger Mochi SOS via Badge Tap (DOM click)
  console.log('Clicking Mochi Tap Badge to trigger SOS...');
  await page.evaluate(() => {
    const b = document.getElementById('fzMochiTapBadge');
    if (b) b.click();
    else if (window.FiezelMochiVoiceSos) window.FiezelMochiVoiceSos.startCall();
  });
  await page.waitForTimeout(600);

  // Verify Zero-Text Pod
  const podInfo = await page.evaluate(() => {
    const pod = document.getElementById('fzMochiSosPod');
    const speech = document.querySelector('.fz-mochi-pod-speech');
    const liveStatus = document.getElementById('fzMochiSosLiveStatus');
    const waveBars = document.querySelectorAll('.fz-mochi-pod-wave-stage .wave-bar');
    return {
      hasPod: !!pod,
      isZeroText: !speech,
      liveStatus: liveStatus ? liveStatus.textContent : null,
      waveBarCount: waveBars.length,
      isActive: window.FiezelMochiVoiceSos ? window.FiezelMochiVoiceSos.isCallActive() : false
    };
  });
  console.log('Zero-Text Pod Info:', podInfo);

  // Save screenshot of active zero-text pod on mobile
  await page.screenshot({ path: 'C:/Users/hp/fiezel-mochi-voice-sos-714/mochi-sos-in-placement-mobile.png' });
  console.log('Screenshot saved: mochi-sos-in-placement-mobile.png');

  await mobileContext.close();

  // 2. Desktop Context (1280x800)
  console.log('\n--- DESKTOP PROBE (1280x800) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });
  const desktopPage = await desktopContext.newPage();

  console.log('Navigating to http://localhost:3000 on desktop...');
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(600);

  await desktopPage.evaluate(() => {
    if (typeof window.dismissWelcome === 'function') window.dismissWelcome();
    const ob = document.querySelector('.fiezel-ob');
    if (ob) ob.remove();
    const splash = document.querySelector('.fiezel-splash');
    if (splash) splash.remove();
    window.startPlacement();
  });
  await desktopPage.waitForTimeout(500);

  // Dismiss intro modal on desktop if present
  await desktopPage.evaluate(() => {
    const btn = document.getElementById('fzMochiIntroDismissBtn');
    if (btn) btn.click();
  });
  await desktopPage.waitForTimeout(300);

  // Trigger call on desktop
  console.log('Triggering Mochi SOS on desktop...');
  await desktopPage.evaluate(() => {
    if (window.FiezelMochiVoiceSos) window.FiezelMochiVoiceSos.startCall();
  });
  await desktopPage.waitForTimeout(600);

  await desktopPage.screenshot({ path: 'C:/Users/hp/fiezel-mochi-voice-sos-714/mochi-sos-in-placement-desktop.png' });
  console.log('Screenshot saved: mochi-sos-in-placement-desktop.png');

  await desktopContext.close();
  await browser.close();
  console.log('\nAll empirical screenshots successfully captured!');
}

run().catch(err => {
  console.error('Probe Error:', err);
  process.exit(1);
});
