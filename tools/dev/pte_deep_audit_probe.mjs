import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const rootDir = process.cwd();
const req = createRequire(import.meta.url);
let pwPkg = null;
for (const cand of [
  'playwright',
  path.join(rootDir, 'node_modules/playwright'),
  path.resolve(rootDir, '../fiezel-apps/node_modules/playwright')
]) {
  try { pwPkg = req(cand); break; } catch (_) {}
}
if (!pwPkg) throw new Error('playwright module not found');
const { chromium } = pwPkg;

// Start local static server
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(rootDir, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(r => server.listen(4199, '127.0.0.1', r));
console.log('Local test server running on http://127.0.0.1:4199');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  permissions: ['microphone']
});

const page = await context.newPage();
page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
page.on('pageerror', err => console.error('[BROWSER ERROR]', err));

// Inject auth and remove blockers
await page.addInitScript(() => {
  localStorage.setItem('fiezel-auth-v1', JSON.stringify({ userId: 'audit-user', displayName: 'Fitra Candidate', enrolled: true }));
  localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Candidate' }));
  localStorage.setItem('fz_tour_done', 'true');
  localStorage.setItem('fz_auth_guest', 'true');
  localStorage.setItem('fz_target_course', 'en');
});

console.log('Navigating to http://127.0.0.1:4199/?fz_real_auth=0 ...');
await page.goto('http://127.0.0.1:4199/?fz_real_auth=0', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

// Strip all splash and modal blockers
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = '.fiezel-ob, .ob-onboarding-layer, #onboardingHost, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour, #fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal, .toast, #toast, .toast-container, .toast-box { display: none !important; pointer-events: none !important; }';
  document.head.appendChild(style);
  document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel, .toast, #toast, .toast-container, .toast-box').forEach(el => el.remove());
  document.documentElement.classList.remove('fz-booting');
  document.body.classList.remove('fz-auth-open');
  document.documentElement.classList.add('fz-app-open');
});

// Open PTE view
const pteOpenResult = await page.evaluate(async () => {
  if (typeof window.FiezelPteUi !== 'undefined' && typeof window.FiezelPteUi.mount === 'function') {
    const appEl = document.getElementById('app');
    window.FiezelPteUi.mount(appEl);
    return { mounted: true };
  }
  return { mounted: false };
});
console.log('PTE mount result:', pteOpenResult);
await page.waitForTimeout(500);

const shotDir = path.join(rootDir, 'reports', 'audit-shots');
fs.mkdirSync(shotDir, { recursive: true });

// 1. Screenshot 30-Day Guided Plan
await page.screenshot({ path: path.join(shotDir, '1-pte-hub-plan.png'), fullPage: true });
console.log('Saved 1-pte-hub-plan.png');

// 2. Inspect Speaking -> Read Aloud
await page.evaluate(() => {
  FiezelPteUi.switchSection('speaking');
  FiezelPteUi.switchMode('ra');
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(shotDir, '2-read-aloud.png'), fullPage: true });
console.log('Saved 2-read-aloud.png');

// 3. Test Speaking Evaluation without speech (Must give 10, NOT 65!)
const raSilenceTest = await page.evaluate(async () => {
  const btn = document.querySelector('.fz-pte-btn-primary');
  // Click Start Preparation
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 200));

  // Click Record Now
  const btn2 = document.querySelector('.fz-pte-btn-primary');
  if (btn2) btn2.click();
  await new Promise(r => setTimeout(r, 300));

  // Click Finish Speaking without speaking
  const btn3 = document.querySelector('.fz-pte-btn-primary');
  if (btn3) btn3.click();
  await new Promise(r => setTimeout(r, 400));

  const scoreNum = document.querySelector('.fz-pte-score-num');
  const lastRes = FiezelPteUi.getState().lastResult;
  return {
    scoreNum: scoreNum ? scoreNum.innerText : 'NO_SCORE',
    noSpeechDetected: lastRes ? lastRes.noSpeechDetected : null,
    pearsonScore: lastRes ? lastRes.pearsonScore : null
  };
});
console.log('RA Silence Test (Should be 10, not 65):', raSilenceTest);
await page.screenshot({ path: path.join(shotDir, '3-read-aloud-silence-result.png'), fullPage: true });
console.log('Saved 3-read-aloud-silence-result.png');

// 4. Inspect Describe Image (Verify green zone marker is confined to rail)
await page.evaluate(() => {
  FiezelPteUi.switchSection('speaking');
  FiezelPteUi.switchMode('di');
});
await page.waitForTimeout(500);
const diMarkerInspect = await page.evaluate(() => {
  const marker = document.querySelector('.fz-pte-green-zone-marker');
  const rail = document.querySelector('.fz-pte-progress-rail');
  if (!marker || !rail) return { found: false };
  const mRect = marker.getBoundingClientRect();
  const rRect = rail.getBoundingClientRect();
  return {
    found: true,
    markerHeight: mRect.height,
    railHeight: rRect.height,
    isConfined: mRect.height <= rRect.height + 4
  };
});
console.log('Describe Image Marker Confinement:', diMarkerInspect);
await page.screenshot({ path: path.join(shotDir, '4-describe-image.png'), fullPage: true });
console.log('Saved 4-describe-image.png');

// 5. Inspect Repeat Sentence (Verify prompt text is HIDDEN, waveform present)
await page.evaluate(() => {
  FiezelPteUi.switchSection('speaking');
  FiezelPteUi.switchMode('rs');
});
await page.waitForTimeout(500);
const rsInspect = await page.evaluate(() => {
  const playBtn = document.querySelector('.fz-pte-play-btn');
  const waveBars = document.querySelectorAll('.fz-pte-wave-bar');
  const hiddenPromptBox = document.querySelector('.fz-pte-prompt-box');
  const state = FiezelPteUi.getState();
  const item = FiezelPteUi.getBanks().rs[state.itemIndex];
  const isSentenceTextExposed = hiddenPromptBox ? hiddenPromptBox.innerText.includes(item.sentence) : false;
  return {
    hasPlayBtn: !!playBtn,
    waveBarsCount: waveBars.length,
    isSentenceTextExposed: isSentenceTextExposed
  };
});
console.log('Repeat Sentence Inspect (Sentence text must NOT be exposed):', rsInspect);
await page.screenshot({ path: path.join(shotDir, '5-repeat-sentence.png'), fullPage: true });
console.log('Saved 5-repeat-sentence.png');

// 6. Inspect Reading FIB Dropdowns & 6 Rumus Grammar 3 Detik Guide
await page.evaluate(() => {
  FiezelPteUi.switchSection('reading');
  FiezelPteUi.switchMode('rwFib');
});
await page.waitForTimeout(500);
const rwFibInspect = await page.evaluate(() => {
  const selects = document.querySelectorAll('.fz-pte-fib-select');
  const guideBtn = document.querySelector('.fz-pte-guide-toggle-btn');
  return {
    selectCount: selects.length,
    hasGuideBtn: !!guideBtn
  };
});
console.log('R&W FIB Inspect (Must have selects and guide button):', rwFibInspect);

// Click guide button to toggle 6 Rumus Grammar 3 Detik
await page.evaluate(() => {
  FiezelPteUi.toggleGrammarGuide();
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shotDir, '6-rw-fib-with-grammar-guide.png'), fullPage: true });
console.log('Saved 6-rw-fib-with-grammar-guide.png');

// Select options and check answers
const fibEvalTest = await page.evaluate(() => {
  const selects = document.querySelectorAll('.fz-pte-fib-select');
  if (selects.length > 0) {
    selects[0].value = selects[0].options[1].value;
    selects[0].dispatchEvent(new Event('change'));
  }
  const checkBtn = document.querySelector('.fz-pte-btn-primary');
  if (checkBtn) checkBtn.click();
  const deepDrawer = document.querySelector('.fz-pte-deep-feedback-card');
  return {
    feedbackRendered: !!deepDrawer
  };
});
console.log('FIB Evaluation Test:', fibEvalTest);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shotDir, '7-rw-fib-evaluated.png'), fullPage: true });
console.log('Saved 7-rw-fib-evaluated.png');

// 7. Inspect Write from Dictation & Nakul Extra Words Hack
await page.evaluate(() => {
  FiezelPteUi.switchSection('writing');
  FiezelPteUi.switchMode('wfd');
});
await page.waitForTimeout(500);

const wfdHackTest = await page.evaluate(() => {
  const state = FiezelPteUi.getState();
  const item = FiezelPteUi.getBanks().wfd[state.itemIndex];
  const textarea = document.getElementById('fzPteDictationInput');
  // Type with singular and plural variants (Nakul Hack)
  if (textarea) {
    textarea.value = item.sentence + ' approach approaches method methods';
    textarea.dispatchEvent(new Event('input'));
  }
  const checkBtn = document.querySelector('.fz-pte-btn-primary');
  if (checkBtn) checkBtn.click();

  const lastRes = FiezelPteUi.getState().lastResult;
  const hackBadge = document.querySelector('.fz-pte-hack-badge');
  return {
    score: lastRes ? lastRes.content.score : 0,
    max: lastRes ? lastRes.content.max : 0,
    extraWordsHackDetected: lastRes ? lastRes.extraWordsHackDetected : false,
    hasHackBadge: !!hackBadge
  };
});
console.log('WFD Extra Words Hack Test:', wfdHackTest);
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(shotDir, '8-wfd-hack-result.png'), fullPage: true });
console.log('Saved 8-wfd-hack-result.png');

await browser.close();
server.close();
console.log('ALL AUDIT PROBES COMPLETED SUCCESSFULLY.');
