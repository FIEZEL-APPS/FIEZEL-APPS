import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import fs from 'fs';

const PORT = 8149;
const ARTIFACT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/c9a6576d-c69e-48da-8341-c3d930b69b09';

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webp': 'image/webp'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[PROBE] Server running at http://127.0.0.1:${PORT}`);
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2
    });

    await context.addInitScript(() => {
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, role: 'murid', at: Date.now() }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Learner', at: Date.now() }));
      localStorage.setItem('fz_today_vocab_visit', '1');
      localStorage.setItem('fz_welcome_dismissed', 'true');
    });

    const page = await context.newPage();
    const playedSfxList = [];

    // Instrument audio spy in page
    await page.addInitScript(() => {
      window._playedSfx = [];
      const origPlay = window.FiezelUiSfx?.play;
      window._recordSfx = (name, opts) => {
        window._playedSfx.push({ name, opts, time: Date.now() });
      };
    });

    console.log('[PROBE] Navigating to Home...');
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Clean scrims and splashes if any
    await page.addStyleTag({
      content: `
        #fiezelBootSplash, .fiezel-splash, .fz-tour, .fz-tour-scrim, [data-tour-card], .fz-ritual-sheet, #fzRitual, .welcome, #authGate, [data-auth-host], #fzAuthHost, .fz-auth-host, #authModal, .modal-backdrop, .auth-screen {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `
    });
    await page.waitForTimeout(1000);

    // Hook spy after scripts loaded
    await page.evaluate(() => {
      if (window.FiezelUiSfx) {
        const orig = window.FiezelUiSfx.play;
        window.FiezelUiSfx.play = function(name, env, opts) {
          window._recordSfx(name, opts);
          return orig.call(this, name, env, opts);
        };
      }
    });

    // Wait for Mochi companion instance
    console.log('[PROBE] Waiting for Mochi Companion initialization...');
    await page.waitForFunction(() => {
      return window.FiezelMochiCompanion && typeof window.FiezelMochiCompanion.getInstance === 'function' && window.FiezelMochiCompanion.getInstance();
    }, { timeout: 10000 });

    const mochiStatus = await page.evaluate(() => {
      const companion = window.FiezelMochiCompanion;
      const mochi = companion.getInstance();
      return {
        hasCompanion: !!companion,
        hasInteract: typeof companion.interact === 'function',
        hasSequence: typeof companion.getVoiceSequence === 'function',
        sequence: companion.getVoiceSequence ? companion.getVoiceSequence() : null,
        initialIndex: companion.getCurrentStepIndex ? companion.getCurrentStepIndex() : null,
        mochiProps: mochi ? {
          mood: mochi.mood,
          currentMood: mochi.currentMood,
          aura: mochi.aura,
          talking: mochi.talking
        } : null
      };
    });
    console.log('[PROBE] Mochi Status:', JSON.stringify(mochiStatus, null, 2));

    const mascotWrap = page.locator('.fz-vissol-mascot-wrap');
    await mascotWrap.waitFor({ state: 'visible', timeout: 5000 });

    const results = [];
    const stepNames = ['greet', 'appear', 'encourage', 'celebrate', 'greet-cycle'];

    for (let i = 0; i < 5; i++) {
      console.log(`\n--- [PROBE] Step ${i + 1}: Clicking Mochi Mascot ---`);
      const sfxCountBefore = await page.evaluate(() => window._playedSfx.length);

      // Physical click on the mascot container/canvas
      await mascotWrap.click();
      await page.waitForTimeout(400);

      const stateAfter = await page.evaluate(() => {
        const m = window.FiezelMochiCompanion.getInstance();
        const sfx = window._playedSfx;
        const lastSfx = sfx[sfx.length - 1];
        return {
          mood: m.mood || m.currentMood,
          aura: m.aura,
          talking: m.talking,
          gesture: m.handGesture,
          fx: m.fx,
          lastSfx: lastSfx,
          currentIndex: window.FiezelMochiCompanion.getCurrentStepIndex()
        };
      });

      console.log(`[PROBE] State after tap ${i + 1}:`, stateAfter);
      results.push({ tap: i + 1, ...stateAfter });

      // Save screenshot for each distinct state
      if (i < 4) {
        const screenshotPath = path.join(ARTIFACT_DIR, `mochi-voice-${i + 1}-${stepNames[i]}.png`);
        await mascotWrap.screenshot({ path: screenshotPath });
        console.log(`[PROBE] Saved mascot visual artifact: ${screenshotPath}`);
      }

      await page.waitForTimeout(600);
    }

    // Assertions
    console.log('\n================ AUDIT SUMMARY ================');
    const assert1 = results[0].lastSfx?.name === 'paw_greet' && results[0].mood === 'wink' && results[0].aura === 'gold';
    const assert2 = results[1].lastSfx?.name === 'paw_appear' && results[1].mood === 'dots' && results[1].aura === 'blue';
    const assert3 = results[2].lastSfx?.name === 'paw_encourage' && results[2].mood === 'hearts' && results[2].aura === 'pink';
    const assert4 = results[3].lastSfx?.name === 'paw_celebrate' && results[3].mood === 'happy' && results[3].aura === 'green';
    const assert5 = results[4].lastSfx?.name === 'paw_greet' && results[4].mood === 'wink'; // cycled back

    console.log(`[CHECK 1] Tap 1 -> paw_greet (Chirp), wink, gold: ${assert1 ? 'PASS' : 'FAIL'}`);
    console.log(`[CHECK 2] Tap 2 -> paw_appear (Trill), dots, blue: ${assert2 ? 'PASS' : 'FAIL'}`);
    console.log(`[CHECK 3] Tap 3 -> paw_encourage (Purr), hearts, pink: ${assert3 ? 'PASS' : 'FAIL'}`);
    console.log(`[CHECK 4] Tap 4 -> paw_celebrate (Meow), happy, green: ${assert4 ? 'PASS' : 'FAIL'}`);
    console.log(`[CHECK 5] Tap 5 -> cycles back to paw_greet: ${assert5 ? 'PASS' : 'FAIL'}`);

    const allPassed = assert1 && assert2 && assert3 && assert4 && assert5;
    console.log(`\nOVERALL TEST RESULT: ${allPassed ? '100% GREEN - ALL 4 VOICES & CHOREOGRAPHY VERIFIED' : 'FAILED CHECKS'}`);

    if (!allPassed) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[PROBE] Error during execution:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
