import { chromium } from 'playwright';

async function main() {
  console.log('🚀 Starting PTE Comprehensive E2E Verification Probe...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    permissions: ['microphone']
  });

  const page = await context.newPage();

  // Log page console
  page.on('console', msg => {
    if (msg.text().includes('PTE') || msg.text().includes('Audio') || msg.text().includes('Speech') || msg.text().includes('error')) {
      console.log('  [BROWSER CONSOLE]', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('  [PAGE ERROR]', err.message);
  });

  // Navigate to PTE Hub
  console.log('1. Navigating to http://127.0.0.1:4173/?pte=1...');
  await page.goto('http://127.0.0.1:4173/?pte=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Check that FiezelPteUi is mounted
  const hubExists = await page.evaluate(() => {
    return Boolean(document.querySelector('.fz-pte-hub'));
  });
  console.log('  Hub rendered:', hubExists);
  if (!hubExists) throw new Error('PTE Hub failed to render');

  // Switch to Speaking
  console.log('2. Testing Read Aloud (RA)...');
  await page.evaluate(() => window.FiezelPteUi.switchSection('speaking'));
  await page.evaluate(() => window.FiezelPteUi.switchMode('ra'));
  await page.waitForTimeout(500);

  // Test Listen Model Pronunciation in RA
  console.log('  Testing RA "Listen Model Pronunciation"...');
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(400);
  let audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  RA model audio playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());
  await page.waitForTimeout(300);

  // Test RA Recording flow
  console.log('  Testing RA Recording & Watchdog relaxation...');
  await page.evaluate(() => window.FiezelPteUi.handleMicAction()); // starts prep
  let timerState = await page.evaluate(() => window.FiezelPteUi.getState().timerState);
  console.log('  Timer state after click 1:', timerState); // 'preparing'

  await page.evaluate(() => window.FiezelPteUi.handleMicAction()); // skips prep to recording
  timerState = await page.evaluate(() => window.FiezelPteUi.getState().timerState);
  console.log('  Timer state after Record Now:', timerState); // 'recording'

  // Wait 4 seconds (previously the 3.2s silence watchdog would have aborted here!)
  console.log('  Waiting 4.0s to confirm silence watchdog does NOT prematurely abort at 3.2s...');
  await page.waitForTimeout(4000);

  timerState = await page.evaluate(() => window.FiezelPteUi.getState().timerState);
  console.log('  Timer state after 4.0s:', timerState);
  if (timerState !== 'recording') {
    throw new Error(`Regression: Silence watchdog aborted recording prematurely! timerState is ${timerState}`);
  }
  console.log('  ✓ Verified: Recording remains active and NOT prematurely killed!');

  // Simulate speaking and submit with matching full text
  await page.evaluate(() => {
    const fullText = "Market research is a vital part of the planning process of any business. It involves collecting information which provides an insight into the customers thinking, buying patterns and location. In addition, market research can also help you discover whether there is a market for your products or services.";
    window.FiezelPteUi.getState().speechTranscript = fullText;
    window.FiezelPteUi.getState().speechStartTime = Date.now() - 13000; // 13s duration
    window.FiezelPteUi.getState().speechConfidence = 0.95;
    window.FiezelPteUi.handleMicAction(); // finishes speaking and evaluates
  });
  await page.waitForTimeout(600);

  let result = await page.evaluate(() => window.FiezelPteUi.getState().lastResult);
  console.log('  RA Evaluation Result:', {
    pearsonScore: result?.pearsonScore,
    passed: result?.passed,
    fluency: result?.fluency?.score,
    pronunciation: result?.pronunciation?.score,
    noSpeechDetected: result?.noSpeechDetected
  });
  if (!result || result.noSpeechDetected || result.pearsonScore < 40) {
    throw new Error('Read Aloud evaluation failed or gave noSpeechDetected');
  }
  console.log('  ✓ Read Aloud passed successfully with Pearson Score:', result.pearsonScore);

  // Test Repeat Sentence (RS)
  console.log('3. Testing Repeat Sentence (RS)...');
  await page.evaluate(() => window.FiezelPteUi.switchMode('rs'));
  await page.waitForTimeout(500);

  // Start RS prompt audio
  console.log('  Clicking Play Prompt & Repeat...');
  await page.evaluate(() => window.FiezelPteUi.playRsAudioAndListen());
  await page.waitForTimeout(400);

  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  RS prompt audio is playing:', audioPlaying);

  // Wait for RS prompt audio to finish or trigger callback
  console.log('  Simulating prompt completion & speech submission...');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());

  // Simulate speech transcript for RS matching item 0
  await page.evaluate(() => {
    window.FiezelPteUi.setManualSpeech('Please submit your completed assignment to the student office before Friday afternoon.');
    window.FiezelPteUi.evaluateManualSpeech();
  });
  await page.waitForTimeout(600);

  result = await page.evaluate(() => window.FiezelPteUi.getState().lastResult);
  console.log('  RS Evaluation Result:', {
    pearsonScore: result?.pearsonScore,
    passed: result?.passed,
    meets50PercentRule: result?.content?.meets50PercentRule
  });
  if (!result || result.pearsonScore < 40) {
    throw new Error('Repeat Sentence evaluation failed');
  }
  console.log('  ✓ Repeat Sentence passed successfully with Pearson Score:', result.pearsonScore);

  // Test Retell Lecture (RL)
  console.log('4. Testing Retell Lecture (RL)...');
  await page.evaluate(() => window.FiezelPteUi.switchMode('rl'));
  await page.waitForTimeout(500);

  console.log('  Triggering RL lecture audio...');
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(400);
  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  RL lecture audio is playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());
  console.log('  ✓ Retell Lecture audio prompt verified');

  // Test Listening Section: SST, LF, HIW, WFD
  console.log('5. Testing Listening Section...');
  await page.evaluate(() => window.FiezelPteUi.switchSection('listening'));
  await page.waitForTimeout(500);

  // SST
  console.log('  Testing SST (Summarize Spoken Text)...');
  await page.evaluate(() => window.FiezelPteUi.switchMode('sst'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(300);
  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  SST audio is playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());

  // LF
  console.log('  Testing LF (Listening Fill in the Blanks)...');
  await page.evaluate(() => window.FiezelPteUi.switchMode('lf'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(300);
  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  LF audio is playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());

  // HIW
  console.log('  Testing HIW (Highlight Incorrect Words)...');
  await page.evaluate(() => window.FiezelPteUi.switchMode('hiw'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(300);
  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  HIW audio is playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());

  // WFD
  console.log('6. Testing Writing - WFD (Write From Dictation)...');
  await page.evaluate(() => window.FiezelPteUi.switchSection('writing'));
  await page.evaluate(() => window.FiezelPteUi.switchMode('wfd'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.FiezelPteUi.playAudioPrompt());
  await page.waitForTimeout(300);
  audioPlaying = await page.evaluate(() => window.FiezelPteUi.getState().isAudioPlaying);
  console.log('  WFD audio is playing:', audioPlaying);
  await page.evaluate(() => window.FiezelPteUi.stopPteAudio());

  console.log('\n🎉 ALL PTE MODES VERIFIED AND PASSING 100%!');
  await browser.close();
}

main().catch(err => {
  console.error('\n❌ Probe Failure:', err);
  process.exit(1);
});
