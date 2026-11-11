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

await new Promise(r => server.listen(4205, '127.0.0.1', r));
console.log('Test probe server listening on http://127.0.0.1:4205');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  permissions: ['microphone']
});

const page = await context.newPage();
page.on('console', msg => {
  const t = msg.text();
  if (t.includes('[PTE') || t.includes('Error')) console.log('[BROWSER]', t);
});

// Inject auth and remove blockers
await page.addInitScript(() => {
  localStorage.setItem('fiezel-auth-v1', JSON.stringify({ userId: 'audit-user', displayName: 'Fitra Candidate', enrolled: true }));
  localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Candidate' }));
  localStorage.setItem('fz_tour_done', 'true');
  localStorage.setItem('fz_auth_guest', 'true');
  localStorage.setItem('fz_target_course', 'en');
});

try {
  // Navigate with ?pte=1
  await page.goto('http://127.0.0.1:4205/?pte=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Strip splash and blockers if any remain
  await page.evaluate(() => {
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel, .toast, #toast, .toast-container, .toast-box').forEach(el => el.remove());
    if (window.go) window.go('pte');
  });
  await page.waitForTimeout(600);

  // 1. Verify PTE Hub mounted and Neural Voice available
  const pteHubPresent = await page.evaluate(() => {
    return {
      hubExists: !!document.querySelector('.fz-pte-hub'),
      hasVoice: typeof window.FiezelChatVoice !== 'undefined',
      banksLoaded: window.FiezelPteUi && !!window.FiezelPteUi.getBanks(),
      rwFibCount: window.FiezelPteUi ? (window.FiezelPteUi.getBanks().rwFib || []).length : 0,
      rDdCount: window.FiezelPteUi ? (window.FiezelPteUi.getBanks().rDd || []).length : 0,
      lfCount: window.FiezelPteUi ? (window.FiezelPteUi.getBanks().lf || []).length : 0,
      rsCount: window.FiezelPteUi ? (window.FiezelPteUi.getBanks().rs || []).length : 0,
      wfdCount: window.FiezelPteUi ? (window.FiezelPteUi.getBanks().wfd || []).length : 0
    };
  });
  console.log('1. Bank counts & voice check:', pteHubPresent);

  if (!pteHubPresent.hubExists) throw new Error('PTE Hub did not mount');
  if (!pteHubPresent.hasVoice) throw new Error('FiezelChatVoice is not available on window');
  if (pteHubPresent.rwFibCount < 15) throw new Error('rwFibCount insufficient (<15)');
  if (pteHubPresent.rDdCount < 15) throw new Error('rDdCount insufficient (<15)');
  if (pteHubPresent.lfCount < 15) throw new Error('lfCount insufficient (<15)');
  if (pteHubPresent.rsCount < 20) throw new Error('rsCount insufficient (<20)');
  if (pteHubPresent.wfdCount < 20) throw new Error('wfdCount insufficient (<20)');

  // 2. Test Repeat Sentence UI & Mic Bridge
  await page.evaluate(() => {
    window.FiezelPteUi.switchSection('speaking');
    window.FiezelPteUi.switchMode('rs');
  });
  await page.waitForTimeout(500);

  const rsCard = await page.evaluate(() => {
    const title = document.querySelector('.fz-pte-audio-player-box');
    const st = window.FiezelPteUi.getState();
    const appSnippet = document.getElementById('app')?.innerHTML?.slice(0, 250) || '';
    return {
      hasAudioBox: !!title,
      html: title ? title.innerText : '',
      state: st,
      appSnippet
    };
  });
  console.log('2. Repeat Sentence card loaded:', rsCard);
  if (!rsCard.hasAudioBox) throw new Error('Repeat Sentence audio player box missing');

  // Trigger play audio prompt and listen
  const audioTriggerResult = await page.evaluate(() => {
    window.FiezelPteUi.playRsAudioAndListen();
    const st = window.FiezelPteUi.getState();
    return {
      isAudioPlaying: st.isAudioPlaying,
      timerState: st.timerState
    };
  });
  console.log('3. RS Audio play trigger state:', audioTriggerResult);

  // 3. Test Reading Dropdown FIB and Deep Feedback
  await page.evaluate(() => {
    window.FiezelPteUi.switchSection('reading');
    window.FiezelPteUi.switchMode('rwFib');
  });
  await page.waitForTimeout(500);

  const rwFibInfo = await page.evaluate(() => {
    const selects = document.querySelectorAll('.fz-pte-fib-select');
    const st = window.FiezelPteUi.getState();
    const appHtml = document.getElementById('app')?.innerHTML || '';
    return {
      selectCount: selects.length,
      stState: st,
      itemTitle: document.querySelector('.fz-pte-prompt-box')?.innerText?.slice(0, 60),
      appHtmlSnippet: appHtml.slice(0, 400)
    };
  });
  console.log('4. Reading FIB Dropdowns rendered:', rwFibInfo);
  if (rwFibInfo.selectCount < 2) throw new Error('FIB dropdown selects not rendered');

  // Simulate selecting and checking answer
  const feedbackResult = await page.evaluate(() => {
    const selects = document.querySelectorAll('.fz-pte-fib-select');
    if (selects.length > 0) {
      selects[0].value = selects[0].options[1].value;
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
    window.FiezelPteUi.checkRwFib();
    const fb = document.querySelector('.fz-pte-deep-feedback-card');
    return {
      feedbackRendered: !!fb,
      feedbackText: fb ? fb.innerText.slice(0, 150) : ''
    };
  });
  console.log('5. Deep Feedback Drawer render:', feedbackResult);
  if (!feedbackResult.feedbackRendered) throw new Error('Deep Feedback Drawer did not render');

  console.log('\n--- ALL BROWSER PLAYWRIGHT PROBE AUDITS PASSED SUCCESSFULLY! ---');
} finally {
  await browser.close();
  server.close();
}
