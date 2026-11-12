import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);
let pwPkg = null;
for (const cand of [
  'playwright',
  path.resolve(process.cwd(), 'node_modules/playwright'),
  'C:/Users/hp/fiezel-apps/node_modules/playwright'
]) {
  try { pwPkg = req(cand); break; } catch (_) {}
}
if (!pwPkg) throw new Error('playwright module not found');
const { chromium } = pwPkg;

const ARTIFACT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/a91b3a79-13cf-443d-8f8f-d3a0860668c8';
const PORT = 4173;

async function runAudit() {
  console.log('--- Starting PTE Academic Hub Visual & Functional Audit ---');
  const browser = await chromium.launch({ headless: true });
  
  // Mobile context (iPhone 13 / modern phone: 390x844)
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });

  const page = await mobileCtx.newPage();

  // Route mock audio and disable heavy analytics
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('puter.com') || url.includes('google-analytics') || url.includes('clarity.ms') || url.endsWith('.onnx')) {
      return route.abort();
    }
    return route.continue();
  });

  // Inject session
  await page.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ token: 'mock-token', user: { id: 'u1', name: 'Fitra Rusdiawan' } }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Fitra Rusdiawan', locale: 'en', course: 'en' }));
    localStorage.setItem('fz_tour_done', 'true');
    localStorage.setItem('fz_auth_guest', 'true');
    localStorage.setItem('fiezel_lang_chosen', 'en');
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fz_target_lang', 'en');
    localStorage.setItem('fz_state_v1@en', JSON.stringify({
      level: 1, view: 'pte', ritualMeta: { lastDay: today }
    }));
    localStorage.setItem('fz_state_v1', JSON.stringify({
      level: 1, view: 'pte', ritualMeta: { lastDay: today }
    }));
  });

  console.log(`Navigating to http://127.0.0.1:${PORT}/?pte=1 ...`);
  await page.goto(`http://127.0.0.1:${PORT}/?pte=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Clean overlays & modals
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .ob-onboarding-layer, #onboardingHost, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour, #fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal, .toast, #toast, .toast-container, .toast-box { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel, .toast, #toast').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    document.documentElement.classList.add('fz-app-open');
    if (window.go) {
      window.go('pte');
    } else if (window.FiezelPteUi) {
      const app = document.getElementById('app');
      if (app) window.FiezelPteUi.mount(app);
    }
  });

  await page.waitForTimeout(600);

  // Helper to take screenshot
  async function snap(name, fullPage = false) {
    const filePath = path.join(ARTIFACT_DIR, name);
    await page.screenshot({ path: filePath, fullPage });
    console.log(`[SNAPSHOT] Saved: ${name}`);
    return filePath;
  }

  // 1. Snapshot initial Roadmap
  await snap('audit-01-roadmap-mobile.png');

  // Check for horizontal overflow / leaking cards
  const overflowIssues = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const issues = [];
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1) {
        issues.push({
          tag: el.tagName,
          className: (el.className || '').toString().slice(0, 50),
          id: el.id,
          right: Math.round(rect.right),
          docWidth,
          overflowPx: Math.round(rect.right - docWidth)
        });
      }
    }
    return issues.slice(0, 20);
  });
  console.log('Overflow issues on Roadmap:', JSON.stringify(overflowIssues, null, 2));

  // 2. Switch to Speaking
  console.log('Switching to Speaking section...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchSection('speaking'));
  await page.waitForTimeout(500);
  await snap('audit-02-speaking-ra-mobile.png');

  // Switch to Repeat Sentence
  console.log('Switching to Speaking: Repeat Sentence...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('rs'));
  await page.waitForTimeout(500);
  await snap('audit-03-speaking-rs-mobile.png');

  // Switch to Describe Image
  console.log('Switching to Speaking: Describe Image...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('di'));
  await page.waitForTimeout(500);
  await snap('audit-04-speaking-di-mobile.png');

  // 3. Switch to Writing
  console.log('Switching to Writing section...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchSection('writing'));
  await page.waitForTimeout(500);
  await snap('audit-05-writing-swt-mobile.png');

  // Switch to Essay
  console.log('Switching to Writing: Essay...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('we'));
  await page.waitForTimeout(500);
  await snap('audit-06-writing-essay-mobile.png');

  // 4. Switch to Reading
  console.log('Switching to Reading section (rwFib)...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchSection('reading'));
  await page.waitForTimeout(500);
  await snap('audit-07-reading-rwfib-mobile.png');

  // Test selecting a dropdown option in Reading FIB
  console.log('Selecting options in Reading FIB and checking answer...');
  const selectResult = await page.evaluate(() => {
    const selects = document.querySelectorAll('.fz-pte-fib-select');
    if (selects.length > 0) {
      selects[0].value = selects[0].options[1] ? selects[0].options[1].value : '';
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      return { found: selects.length, val: selects[0].value };
    }
    return { found: 0 };
  });
  console.log('Select dropdown result:', selectResult);
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).checkRwFib());
  await page.waitForTimeout(600);
  await snap('audit-08-reading-rwfib-feedback-mobile.png');

  // Switch to Reading Drag and Drop
  console.log('Switching to Reading: Drag & Drop...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('rDd'));
  await page.waitForTimeout(500);
  await snap('audit-09-reading-rdd-mobile.png');

  // 5. Switch to Listening
  console.log('Switching to Listening section...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchSection('listening'));
  await page.waitForTimeout(500);
  await snap('audit-10-listening-sst-mobile.png');

  // Switch to Listening Fill in Blanks
  console.log('Switching to Listening: Fill in Blanks...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('lf'));
  await page.waitForTimeout(500);
  await snap('audit-11-listening-lf-mobile.png');

  // Switch to Write From Dictation in Listening
  console.log('Switching to Listening: Write From Dictation...');
  await page.evaluate(() => (window.FiezelPteUi || window.FiezelPteUI).switchMode('wfd'));
  await page.waitForTimeout(500);
  await snap('audit-12-listening-wfd-mobile.png');

  // Test submitting Write From Dictation to check feedback card
  console.log('Submitting WFD test answer to inspect feedback card...');
  await page.evaluate(() => {
    const ta = document.getElementById('fzPteDictationInput') || document.getElementById('fzPteWfdInput');
    if (ta) {
      ta.value = 'The library has quiet study areas for students.';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
    (window.FiezelPteUi || window.FiezelPteUI).submitWfd();
  });
  await page.waitForTimeout(600);
  await snap('audit-13-listening-wfd-feedback-mobile.png');

  await browser.close();
  console.log('--- PTE Academic Hub Visual & Functional Audit Completed Successfully ---');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
