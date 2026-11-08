import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/hp/.gemini/antigravity/brain/8302ce77-5db8-4b7a-b9a7-bf0cd2527454';

async function main() {
  console.log('[PROBE] Launching browser to test Mochi mouth articulation & closures...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Test 1: Load call.html
  console.log('[PROBE] Navigating to http://127.0.0.1:4173/call.html ...');
  await page.goto('http://127.0.0.1:4173/call.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check Mochi instance on page
  const mochiStatus = await page.evaluate(async () => {
    // Look for FiezelMochi or app instance
    const win = window;
    const mochiEl = document.getElementById('mochiFaceTimeCanvas') || document.querySelector('canvas');
    return {
      hasCanvas: !!mochiEl,
      canvasWidth: mochiEl?.width,
      canvasHeight: mochiEl?.height,
      hasFiezelMochi: typeof win.FiezelMochi !== 'undefined'
    };
  });
  console.log('[PROBE] Page Mochi DOM status:', mochiStatus);

  // Test 2: Unit test FiezelMochi phonetic sequencer directly in page context
  const testResults = await page.evaluate(async () => {
    const FM = window.FiezelMochi;
    if (!FM) {
      // Import directly
      const mod = await import('/mochi-mascot/fiezel-mochi.js');
      window.FiezelMochi = mod.FiezelMochi;
    }
    const container = document.createElement('div');
    container.style.width = '200px';
    container.style.height = '160px';
    document.body.appendChild(container);

    const mochi = new window.FiezelMochi(container, {
      size: 160,
      interactive: false,
      cameraZ: 4.70
    });

    // Test A: Japanese Phonetic Parsing
    const jaSeq = mochi.parseTextToPhoneticVisemes('こんにちは、はじめまして！', 'ja', 2.0);
    const jaHasClosureOnN = jaSeq.some(s => s.bi > 0.8 && s.open === 0.0);
    const jaHasClosureOnPunct = jaSeq.some(s => s.bi === 0.0 && s.open === 0.0);
    const jaHasOpenVowels = jaSeq.some(s => s.open > 0.6);

    // Test B: English / Indonesian Phonetic Parsing
    const idSeq = mochi.parseTextToPhoneticVisemes('Halo teman, mari belajar!', 'id', 2.2);
    const idHasWordClosures = idSeq.some(s => s.open === 0.0 && s.bi === 0.0);
    const idHasBilabials = idSeq.some(s => s.open === 0.0 && s.bi > 0.8);

    // Test C: Simulation of mouth motion over time during phrase
    mochi.speakPhrase('こんにちは、はじめまして！', 'ja', 1.8);

    const sampledFrames = [];
    const dt = 0.033; // ~30 fps
    for (let t = 0; t <= 2.2; t += dt) {
      mochi.updateMouthMotion(dt);
      sampledFrames.push({
        t: Math.round(t * 100) / 100,
        open: Math.round((mochi.mouthRig?.open || 0) * 1000) / 1000,
        bilabial: Math.round((mochi.mouthRig?.bilabial || 0) * 1000) / 1000,
        width: Math.round((mochi.mouthRig?.width || 0) * 1000) / 1000,
        isTalking: mochi.isTalking
      });
    }

    const minOpenWhileSpeaking = Math.min(...sampledFrames.filter(f => f.t < 1.6).map(f => f.open));
    const maxOpenWhileSpeaking = Math.max(...sampledFrames.filter(f => f.t < 1.6).map(f => f.open));
    const finalOpen = sampledFrames[sampledFrames.length - 1].open;
    const finalTalking = sampledFrames[sampledFrames.length - 1].isTalking;

    // Check if mouth closes completely (drops below 0.08) at word boundary / pause
    const reachedClosure = minOpenWhileSpeaking < 0.08;

    return {
      jaSeqLength: jaSeq.length,
      jaHasClosureOnN,
      jaHasClosureOnPunct,
      jaHasOpenVowels,
      idSeqLength: idSeq.length,
      idHasWordClosures,
      idHasBilabials,
      minOpenWhileSpeaking,
      maxOpenWhileSpeaking,
      reachedClosure,
      finalOpen,
      finalTalking,
      sampleSlice: sampledFrames.filter((_, idx) => idx % 6 === 0)
    };
  });

  console.log('[PROBE] Phonetic & mouth simulation results:');
  console.log(' - Japanese sequence length:', testResults.jaSeqLength);
  console.log(' - Japanese has bilabial closure on ん:', testResults.jaHasClosureOnN);
  console.log(' - Japanese has breath pause closure on 、/！:', testResults.jaHasClosureOnPunct);
  console.log(' - Japanese has expressive open vowels:', testResults.jaHasOpenVowels);
  console.log(' - Indonesian has word-boundary closures:', testResults.idHasWordClosures);
  console.log(' - Indonesian has bilabials (m, b, p):', testResults.idHasBilabials);
  console.log(' - Min mouth open while speaking:', testResults.minOpenWhileSpeaking, '(reached closure:', testResults.reachedClosure, ')');
  console.log(' - Max mouth open while speaking:', testResults.maxOpenWhileSpeaking);
  console.log(' - Final mouth open (settled to rest):', testResults.finalOpen);
  console.log(' - Final isTalking state:', testResults.finalTalking);
  console.log(' - Sampled frames over time:');
  console.table(testResults.sampleSlice);

  // Test 3: Capture visual screenshots of Mochi speaking on the actual stage
  console.log('[PROBE] Capturing visual snapshots of Mochi speaking on stage...');

  // Set Mochi on stage to pronounce:
  // Snapshot 1: Vowel 'A' (open)
  await page.evaluate(() => {
    const inst = window.__fzVoiceMochiInstance;
    if (inst) {
      inst.setViseme('A', 1.0, true);
    }
  });
  await page.waitForTimeout(200);
  const shotA = path.join(ARTIFACTS_DIR, 'mochi-speaking-mouth-open.png');
  await page.screenshot({ path: shotA });
  console.log('Captured open mouth snapshot ->', shotA);

  // Snapshot 2: Bilabial closure 'BMP' (mouth completely shut, lips touching)
  await page.evaluate(() => {
    const inst = window.__fzVoiceMochiInstance;
    if (inst) {
      inst.setViseme('BMP', 1.0, true);
    }
  });
  await page.waitForTimeout(200);
  const shotBMP = path.join(ARTIFACTS_DIR, 'mochi-speaking-mouth-closed-bmp.png');
  await page.screenshot({ path: shotBMP });
  console.log('Captured bilabial closure snapshot ->', shotBMP);

  // Snapshot 3: Round 'O'
  await page.evaluate(() => {
    const inst = window.__fzVoiceMochiInstance;
    if (inst) {
      inst.setViseme('O', 1.0, true);
    }
  });
  await page.waitForTimeout(200);
  const shotO = path.join(ARTIFACTS_DIR, 'mochi-speaking-mouth-round.png');
  await page.screenshot({ path: shotO });
  console.log('Captured round mouth snapshot ->', shotO);

  await browser.close();
  console.log('[PROBE] Browser closed. All empirical verification complete!');
}

main().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
