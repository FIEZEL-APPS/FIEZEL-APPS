import { chromium } from 'playwright';
import assert from 'node:assert';

async function main() {
  console.log('[PROBE] Launching headless browser to verify Mochi 3D modal & lipsync perfection...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  // Inject user session & preferences
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
      localStorage.setItem('fz_tour_completed', '1');
      localStorage.setItem('fz_today_tour_done', '1');
      localStorage.setItem('fz_onboarding_tour_done', '1');
      localStorage.setItem('fz_tour_seen', '1');
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ menu: true, library: true, listening: true }));
    } catch (_) {}
  });

  console.log('[PROBE] Navigating to http://localhost:4173/...');
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  // Wait until boot splash is completely dismissed
  await page.waitForFunction(() => {
    const sp = document.getElementById('fiezelBootSplash');
    return !sp || sp.style.display === 'none' || sp.classList.contains('is-dismissed');
  }, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    if (window.state) {
      window.state.toursSeen = { menu: true, library: true, listening: true };
    }
    document.querySelectorAll('.fz-tour, #fzTour, [data-testid="fz-tour"], #fzRitual, .fz-onboarding-modal').forEach(e => e.remove());
  });

  // 1. Verify "Telepon aku sekarang" modal has 3D Mochi mounted!
  console.log('[PROBE] Testing openKawanBicaraCallModal()...');
  const modalMounted = await page.evaluate(async () => {
    document.querySelectorAll('.fz-tour, #fzTour, [data-testid="fz-tour"]').forEach(e => e.remove());
    if (typeof window.openKawanBicaraCallModal !== 'function') return { ok: false, err: 'no openKawanBicaraCallModal' };
    window.openKawanBicaraCallModal();
    // wait for dynamic import and mount
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 100));
      document.querySelectorAll('.fz-tour, #fzTour, [data-testid="fz-tour"]').forEach(e => e.remove());
      const modal = document.getElementById('fzKawanCallModal');
      if (modal && modal.__kawanMochi) break;
    }
    document.querySelectorAll('.fz-tour, #fzTour, [data-testid="fz-tour"]').forEach(e => e.remove());
    const modal = document.getElementById('fzKawanCallModal');
    if (!modal) return { ok: false, err: 'no modal found' };
    const stage3d = modal.querySelector('.fz-kawan-modal-3d-stage');
    const canvas = stage3d?.querySelector('canvas');
    const hasMochiInst = !!modal.__kawanMochi;
    const hasHeadset = modal.__kawanMochi?.currentAccessory === 'headset';

    let importError = null;
    if (!hasMochiInst) {
      try {
        const m = await import('./mochi-mascot/fiezel-mochi.js');
        if (m?.FiezelMochi) {
          window.FiezelMochi = m.FiezelMochi;
        }
      } catch (e) {
        importError = e?.message;
      }
    }

    return {
      ok: true,
      hasStage3d: !!stage3d,
      hasCanvas: !!canvas,
      hasMochiInst,
      hasHeadset,
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      importError,
      hasGlobalFM: !!window.FiezelMochi
    };
  });
  console.log('[PROBE] Modal 3D Mochi verification result:', modalMounted);
  assert.ok(modalMounted.ok, 'Modal opened successfully');
  assert.ok(modalMounted.hasStage3d, 'Modal has .fz-kawan-modal-3d-stage');
  assert.ok(modalMounted.hasMochiInst, 'Modal mounted authentic FiezelMochi instance');
  assert.strictEqual(modalMounted.hasHeadset, true, 'Mochi is wearing 3D headset');

  await page.screenshot({ path: 'C:/Users/hp/.gemini/antigravity/brain/8302ce77-5db8-4b7a-b9a7-bf0cd2527454/modal-3d-mochi-headset.png' });
  console.log('[PROBE] Captured screenshot: modal-3d-mochi-headset.png');

  // Close modal
  await page.evaluate(() => window.closeKawanBicaraCallModal());
  await page.waitForTimeout(300);

  // 2. Test Mochi Lipsync Phonetic Parser directly
  console.log('[PROBE] Testing Mochi phonetic sequencer with English, Japanese, and Indonesian...');
  const lipsyncTests = await page.evaluate(() => {
    const FM = window.FiezelMochi;
    if (!FM) return { ok: false, err: 'no FiezelMochi class' };
    const tempDiv = document.createElement('div');
    const mochi = new FM(tempDiv, { width: 100, height: 100 });

    // Test A: English phrase
    const enPhrase = "Hello, my name is Alex!";
    const enSeq = mochi.parseTextToPhoneticVisemes(enPhrase, 'en', 2.0);

    // Test B: Japanese phrase
    const jaPhrase = "こんにちは、もっちです！";
    const jaSeq = mochi.parseTextToPhoneticVisemes(jaPhrase, 'ja', 2.0);

    // Test C: Check bilabials (m, b, p) produce exact closures (open = 0.00, bi >= 0.90)
    const enHasBilabialClosure = enSeq.some(s => s.open === 0.00 && s.bi > 0.90);
    const jaHasBilabialClosure = jaSeq.some(s => s.open === 0.00 && s.bi > 0.90);

    // Test D: Check word spaces produce breath pause closures (open = 0.00, bi === 0)
    const enHasWordBoundaryPause = enSeq.some(s => s.open === 0.00 && s.bi === 0.00 && s.dur >= 0.08);

    // Test E: Check vowel differentiation in English
    const hasOpenA = enSeq.some(s => s.open > 0.70);
    const hasSmileI = enSeq.some(s => s.sm > 0.85 && s.w > 1.20);
    const hasRoundO = enSeq.some(s => s.rd > 0.90 && s.open > 0.70);

    mochi.destroy();
    return {
      ok: true,
      enSeqCount: enSeq.length,
      jaSeqCount: jaSeq.length,
      enHasBilabialClosure,
      jaHasBilabialClosure,
      enHasWordBoundaryPause,
      hasOpenA,
      hasSmileI,
      hasRoundO
    };
  });

  console.log('[PROBE] Lipsync phonetic sequencer result:', lipsyncTests);
  assert.ok(lipsyncTests.enHasBilabialClosure, 'English bilabial closures (M, B, P) work');
  assert.ok(lipsyncTests.jaHasBilabialClosure, 'Japanese bilabial closures (ん, ま, ぼ) work');
  assert.ok(lipsyncTests.enHasWordBoundaryPause, 'Word boundary closures work');
  assert.ok(lipsyncTests.hasOpenA, 'Open A vowel works');
  assert.ok(lipsyncTests.hasSmileI, 'Wide smile I vowel works');
  assert.ok(lipsyncTests.hasRoundO, 'Tall round O vowel works');

  // 3. Test Acoustic Formant Classifier in WawaLipsyncAnalyzer
  console.log('[PROBE] Testing WawaLipsyncAnalyzer acoustic classifier...');
  const acousticTests = await page.evaluate(() => {
    const FM = window.FiezelMochi;
    const tempDiv = document.createElement('div');
    const mochi = new FM(tempDiv, { width: 100, height: 100 });
    const analyzer = mochi.wawaLipsync;

    // Test 1: Sibilants (>3800Hz) MUST score viseme_SS or viseme_CH, NEVER viseme_PP!
    const sibilantCurrent = {
      volume: 0.15,
      centroid: 5500,
      bands: [0.05, 0.05, 0.05, 0.05, 0.10, 0.35, 0.50]
    };
    const sibilantAvg = { volume: 0.12, bands: [0.05, 0.05, 0.05, 0.05, 0.10, 0.30, 0.40] };
    const sibScores = analyzer.computeVisemeScores(sibilantCurrent, sibilantAvg, 0, 1000);

    // Test 2: Bilabials (low frequency burst, centroid < 900)
    const bilabialCurrent = {
      volume: 0.20,
      centroid: 650,
      bands: [0.35, 0.30, 0.10, 0.05, 0.02, 0.01, 0.00]
    };
    const bilabialAvg = { volume: 0.10, bands: [0.15, 0.10, 0.05, 0.02, 0.01, 0.00, 0.00] };
    const biScores = analyzer.computeVisemeScores(bilabialCurrent, bilabialAvg, 0.10, -500);

    // Test 3: Open 'A' vowel (b3 high)
    const vowelACurrent = {
      volume: 0.25,
      centroid: 1200,
      bands: [0.10, 0.08, 0.42, 0.20, 0.15, 0.05, 0.02]
    };
    const vowelAAvg = { volume: 0.20, bands: [0.10, 0.08, 0.40, 0.18, 0.12, 0.05, 0.02] };
    const aScores = analyzer.computeVisemeScores(vowelACurrent, vowelAAvg, 0, 0);

    mochi.destroy();
    return {
      sibPP: sibScores.viseme_PP,
      sibSS: sibScores.viseme_SS,
      biPP: biScores.viseme_PP,
      aScore: aScores.viseme_aa
    };
  });

  console.log('[PROBE] Acoustic classifier scores:', acousticTests);
  assert.strictEqual(acousticTests.sibPP, 0, 'Sibilants NEVER trigger viseme_PP');
  assert.ok(acousticTests.sibSS > 1.0, 'Sibilants correctly score viseme_SS');
  assert.ok(acousticTests.biPP > 1.0, 'Bilabial burst correctly scores viseme_PP');
  assert.ok(acousticTests.aScore > 1.0, 'High F1 correctly scores viseme_aa');

  await browser.close();
  console.log('[PROBE] ALL VERIFICATIONS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
