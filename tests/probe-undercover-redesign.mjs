import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

const OUT_DIR = path.resolve('reports/undercover-redesign');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function runRedesignAudit() {
  console.log('[PROBE REDESIGN] Memulai audit Playwright rancangan baru Undercover...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile phone portrait
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  const fileUrl = pathToFileURL(path.resolve('undercover.html')).href;
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // 1. Check Mobile Zero-Scroll Invariant
  const scrollCheck = await page.evaluate(() => ({
    winH: window.innerHeight,
    bodyH: document.body.scrollHeight,
    fit: document.body.scrollHeight <= window.innerHeight
  }));
  console.log('[PROBE REDESIGN] Zero-Scroll Invariant:', scrollCheck);
  if (!scrollCheck.fit) {
    throw new Error('Lobby viewport overflow detected!');
  }
  await page.screenshot({ path: path.join(OUT_DIR, '01-redesign-lobby.png') });

  // 2. Test "Cara Main" Modal
  console.log('[PROBE REDESIGN] Testing Cara Main Modal...');
  await page.click('button:has-text("Cara Main")');
  await page.waitForSelector('#modal-rules:not(.hidden)');
  await page.screenshot({ path: path.join(OUT_DIR, '02-redesign-rules-modal.png') });

  // Close rules modal
  await page.click('button:has-text("Saya Mengerti, Mulai Main")');
  await page.locator('#modal-rules').waitFor({ state: 'hidden' });

  // 3. Matchmaking
  console.log('[PROBE REDESIGN] Starting Matchmaking...');
  await page.click('button:has-text("Cari Pertandingan")');
  await page.waitForSelector('#modal-found:not(.hidden)', { timeout: 8000 });
  await page.screenshot({ path: path.join(OUT_DIR, '03-redesign-match-found.png') });

  // Accept Game
  await page.click('button:has-text("Masuk Arena")');
  await page.waitForSelector('#screen-game:not(.hidden)');

  // 4. Verify Arena Viewport Fit
  const arenaScrollCheck = await page.evaluate(() => ({
    winH: window.innerHeight,
    bodyH: document.body.scrollHeight,
    fit: document.body.scrollHeight <= window.innerHeight
  }));
  console.log('[PROBE REDESIGN] Arena Zero-Scroll Fit:', arenaScrollCheck);
  if (!arenaScrollCheck.fit) {
    throw new Error('Arena viewport overflow detected!');
  }

  // 5. Verify Turn Timeline
  const timelinePills = await page.locator('#turn-timeline > div').count();
  console.log(`[PROBE REDESIGN] Turn Timeline Pills Count: ${timelinePills}`);
  if (timelinePills !== 4) {
    throw new Error('Turn timeline should have exactly 4 player steps!');
  }
  await page.screenshot({ path: path.join(OUT_DIR, '04-redesign-arena-start.png') });

  // 6. Play through turns
  console.log('[PROBE REDESIGN] Executing Clue Round...');
  // Loop until phase 2 or when it's user turn
  let safetyLoop = 0;
  while (safetyLoop < 20) {
    safetyLoop++;
    const isPhase2 = await page.locator('#console-phase-2:not(.hidden)').isVisible().catch(() => false);
    if (isPhase2) break;

    const userCanAct = await page.locator('#console-phase-1:not(.opacity-30)').isVisible().catch(() => false);
    if (userCanAct) {
      console.log('[PROBE REDESIGN] User turn detected! Checking bilingual synthesizer...');
      const btnA = page.locator('#synth-group-a button').first();
      const txtA = await btnA.innerText();
      console.log(`[PROBE REDESIGN] Dimension A: "${txtA.replace('\n', ' ')}"`);
      await btnA.click();

      const btnB = page.locator('#synth-group-b button').first();
      const txtB = await btnB.innerText();
      console.log(`[PROBE REDESIGN] Dimension B: "${txtB.replace('\n', ' ')}"`);
      await btnB.click();

      await page.screenshot({ path: path.join(OUT_DIR, '05-redesign-user-synthesizing.png') });

      // Click submit
      await page.click('#btn-submit-clue');
      console.log('[PROBE REDESIGN] User clue submitted.');
    }

    await page.waitForTimeout(1000);
  }

  // 7. Verify Phase 2: Live Debate & Banter
  await page.waitForSelector('#console-phase-2:not(.hidden)', { timeout: 15000 });
  console.log('[PROBE REDESIGN] Entered Phase 2: Debate Meja & Tuduhan!');
  await page.screenshot({ path: path.join(OUT_DIR, '06-redesign-debate-phase.png') });

  // Test Debate action: Tuduh Anomali
  console.log('[PROBE REDESIGN] Triggering Debate Action: Tuduh Anomali...');
  await page.click('button:has-text("Tuduh Anomali")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '07-redesign-debate-result.png') });

  // 8. Go to Council Trial (Voting)
  await page.waitForSelector('#console-phase-3-trigger:not(.hidden)');
  await page.click('button:has-text("Masuk Sidang Eliminasi")');
  await page.waitForSelector('#screen-vote:not(.hidden)');
  console.log('[PROBE REDESIGN] Entered Council Trial (Voting)!');
  await page.screenshot({ path: path.join(OUT_DIR, '08-redesign-council-voting.png') });

  // Vote candidate
  const voteCards = page.locator('#vote-grid > div');
  await voteCards.nth(1).click();
  await page.click('#btn-confirm-vote');

  // 9. Showdown or Result
  const isShowdown = await page.locator('#screen-showdown:not(.hidden)').isVisible({ timeout: 5000 }).catch(() => false);
  if (isShowdown) {
    console.log('[PROBE REDESIGN] Showdown triggered!');
    await page.screenshot({ path: path.join(OUT_DIR, '09-redesign-showdown.png') });
    await page.waitForSelector('#screen-result:not(.hidden)', { timeout: 12000 });
  } else {
    await page.waitForSelector('#screen-result:not(.hidden)', { timeout: 8000 });
  }

  // 10. Result Screen
  const resultTitle = await page.innerText('#res-heading');
  console.log(`[PROBE REDESIGN] Result Screen: "${resultTitle}"`);
  await page.screenshot({ path: path.join(OUT_DIR, '10-redesign-final-result.png') });

  console.log('✅ [PROBE REDESIGN] SELURUH AUDIT BERHASIL 100%! Tidak ada regresi atau overflow.');
  await browser.close();
}

runRedesignAudit().catch(err => {
  console.error('[PROBE ERROR]', err);
  process.exit(1);
});
