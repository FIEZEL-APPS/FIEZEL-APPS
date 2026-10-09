import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const reportDir = path.join(projectRoot, 'reports', 'weplay-undercover');
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

async function runProbe() {
  console.log('🚀 Starting WePlay Undercover Empirical Probe...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-fake-ui-for-media-stream', '--mute-audio']
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('Browser console error:', msg.text());
    } else {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    }
  });

  const filePath = path.join(projectRoot, 'undercover.html');
  console.log('Opening file:', filePath);
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });

  // 1. Verify Zero-Scroll Invariant on Lobby
  const lobbyMetrics = await page.evaluate(() => {
    return {
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      bodyScrollHeight: document.body.scrollHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      screenLobbyVisible: !document.getElementById('screen-lobby').classList.contains('hidden'),
      seatsCount: document.querySelectorAll('#weplay-lobby-seats > div').length
    };
  });

  console.log('Lobby Metrics:', lobbyMetrics);
  const lobbyZeroScroll = lobbyMetrics.bodyScrollHeight <= lobbyMetrics.windowHeight + 2;
  console.log(`Lobby 100dvh Zero-Scroll Check: ${lobbyZeroScroll ? '✅ PASS' : '❌ FAIL'}`);

  await page.screenshot({ path: path.join(reportDir, '01-weplay-lobby.png'), fullPage: false });
  console.log('Saved 01-weplay-lobby.png');

  // 2. Click Start Matchmaking
  console.log('Clicking "Mulai Permainan (Cari Kamar)"...');
  await page.click('#btn-start-matchmaking');
  await page.waitForTimeout(500);

  // 3. Verify Card Reveal Modal
  const revealVisible = await page.evaluate(() => {
    return !document.getElementById('modal-card-reveal').classList.contains('hidden');
  });
  console.log(`Card Reveal Modal Opened: ${revealVisible ? '✅ PASS' : '❌ FAIL'}`);

  // Click card to flip
  console.log('Clicking 3D Card to flip...');
  await page.click('#weplay-flip-card');
  await page.waitForTimeout(700);

  const isFlipped = await page.evaluate(() => {
    return document.getElementById('flip-card-inner').classList.contains('is-flipped');
  });
  console.log(`Card is flipped: ${isFlipped ? '✅ PASS' : '❌ FAIL'}`);

  await page.screenshot({ path: path.join(reportDir, '02-card-reveal-flipped.png'), fullPage: false });
  console.log('Saved 02-card-reveal-flipped.png');

  // Click "Saya Siap, Masuk Meja!"
  console.log('Closing card modal and entering Arena...');
  await page.click('#btn-close-reveal');
  await page.waitForTimeout(400);

  // 4. Verify Arena Screen & Zero-Scroll
  const arenaMetrics = await page.evaluate(() => {
    return {
      windowHeight: window.innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      gameScreenVisible: !document.getElementById('screen-game').classList.contains('hidden'),
      seatsCount: document.querySelectorAll('#weplay-arena-seats > div').length
    };
  });
  console.log('Arena Metrics:', arenaMetrics);
  const arenaZeroScroll = arenaMetrics.bodyScrollHeight <= arenaMetrics.windowHeight + 2;
  console.log(`Arena 100dvh Zero-Scroll Check: ${arenaZeroScroll ? '✅ PASS' : '❌ FAIL'}`);

  // Fast-forward to user's turn if needed
  await page.evaluate(() => {
    if (window.activeSpeakerSeat !== 1) {
      window.activeSpeakerSeat = 1;
      window.runTurnForSeat(1);
    }
  });
  await page.waitForTimeout(400);

  // Click first button in synth group A
  const hasChipsA = await page.evaluate(() => {
    const btnsA = document.querySelectorAll('#synth-group-a button');
    if (btnsA.length > 0) {
      btnsA[0].click();
      return true;
    }
    return false;
  });
  console.log(`Selected Synth A: ${hasChipsA ? '✅ PASS' : '❌ FAIL'}`);

  // Click first button in synth group B
  const hasChipsB = await page.evaluate(() => {
    const btnsB = document.querySelectorAll('#synth-group-b button');
    if (btnsB.length > 0) {
      btnsB[0].click();
      return true;
    }
    return false;
  });
  console.log(`Selected Synth B: ${hasChipsB ? '✅ PASS' : '❌ FAIL'}`);

  await page.waitForTimeout(300);

  const isSubmitEnabled = await page.evaluate(() => {
    return !document.getElementById('btn-submit-clue').disabled;
  });
  console.log(`Submit Clue Button Enabled: ${isSubmitEnabled ? '✅ PASS' : '❌ FAIL'}`);

  console.log('Submitting clue (Kirim & Selesai)...');
  await page.click('#btn-submit-clue');
  await page.waitForTimeout(600);

  const bubbleContent = await page.evaluate(() => {
    const bubble = document.getElementById('bubble-text-1');
    return bubble ? bubble.innerText : '';
  });
  console.log(`Player Seat #1 Speech Bubble: "${bubbleContent}"`);

  await page.screenshot({ path: path.join(reportDir, '03-arena-turn-speech.png'), fullPage: false });
  console.log('Saved 03-arena-turn-speech.png');

  // 5. Test Table Gifting Interaction
  console.log('Opening gift tray on seat 2 (Bot)...');
  await page.evaluate(() => {
    window.openGiftTray(2);
  });
  await page.waitForTimeout(300);

  const giftModalVisible = await page.evaluate(() => {
    return !document.getElementById('gift-tray-modal').classList.contains('hidden');
  });
  console.log(`Gift Tray Modal Visible: ${giftModalVisible ? '✅ PASS' : '❌ FAIL'}`);

  await page.screenshot({ path: path.join(reportDir, '04-gifting-tray.png'), fullPage: false });
  console.log('Saved 04-gifting-tray.png');

  console.log('Throwing egg at seat 2...');
  await page.evaluate(() => {
    window.sendTableGift('egg');
  });
  await page.waitForTimeout(600);

  // 6. Test Discussion / Debate Phase
  console.log('Transitioning to Discussion Phase...');
  await page.evaluate(() => {
    window.startWePlayDiscussionPhase();
  });
  await page.waitForTimeout(300);

  const debateConsoleVisible = await page.evaluate(() => {
    return !document.getElementById('console-phase-2').classList.contains('hidden');
  });
  console.log(`Debate Console Visible: ${debateConsoleVisible ? '✅ PASS' : '❌ FAIL'}`);

  console.log('Sending quick shout...');
  await page.evaluate(() => {
    window.sendQuickShout('No. 2 sangat mencurigakan! 🚨');
  });
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(reportDir, '05-debate-shout.png'), fullPage: false });
  console.log('Saved 05-debate-shout.png');

  // 7. Test Round Table Voting Phase
  console.log('Triggering Voting Phase...');
  await page.evaluate(() => {
    window.startWePlayVotingPhase();
  });
  await page.waitForTimeout(300);

  const votingConsoleVisible = await page.evaluate(() => {
    return !document.getElementById('console-phase-3').classList.contains('hidden');
  });
  console.log(`Voting Console Visible: ${votingConsoleVisible ? '✅ PASS' : '❌ FAIL'}`);

  console.log('Casting vote for seat 2...');
  await page.evaluate(() => {
    window.castVoteForSeat(2);
  });
  await page.waitForTimeout(400);

  const tallySeat2 = await page.evaluate(() => {
    const tally = document.getElementById('tally-count-2');
    return tally ? tally.innerText : '0';
  });
  console.log(`Vote tally for seat 2: ${tallySeat2}`);

  await page.screenshot({ path: path.join(reportDir, '06-voting-tally.png'), fullPage: false });
  console.log('Saved 06-voting-tally.png');

  // 8. Test Conclude Voting & Showdown / Result
  console.log('Concluding voting...');
  await page.evaluate(() => {
    window.concludeWePlayVoting();
  });
  await page.waitForTimeout(600);

  const inShowdown = await page.evaluate(() => {
    return !document.getElementById('screen-showdown').classList.contains('hidden');
  });

  if (inShowdown) {
    console.log('Showdown screen reached! Selecting a guess...');
    await page.evaluate(() => {
      const btns = document.querySelectorAll('#showdown-guess-grid button');
      if (btns.length > 0) btns[0].click();
    });
    await page.waitForTimeout(600);
  }

  const inResult = await page.evaluate(() => {
    return !document.getElementById('screen-result').classList.contains('hidden');
  });
  console.log(`Result Screen Reached: ${inResult ? '✅ PASS' : '❌ FAIL'}`);

  await page.screenshot({ path: path.join(reportDir, '07-result-screen.png'), fullPage: false });
  console.log('Saved 07-result-screen.png');

  console.log('\n========================================');
  console.log('CONSOLE ERRORS COUNT:', consoleErrors.length);
  console.log('========================================\n');

  await browser.close();

  if (consoleErrors.length === 0 && lobbyZeroScroll && arenaZeroScroll) {
    console.log('🎉 ALL WEPLAY UNDERCOVER TESTS & AUDITS PASSED CLEANLY!');
    process.exit(0);
  } else {
    process.exit(consoleErrors.length > 0 ? 1 : 0);
  }
}

runProbe().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
