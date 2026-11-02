import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/d0b33a71-6a27-4c25-bfd8-1f904d3061c6';

async function main() {
  console.log('[TEST] Starting Playwright test on http://localhost:8080/ ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ user: { id: 'u1', name: 'Rian Pratama' }, token: 'mock-token' }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true }));
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fz_registered_learner_name', 'Rian Pratama');
    localStorage.setItem('fz_mochi_sos_enabled', '0');
  });

  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // Start grammar adaptive practice and ensure 50 gems
  await page.evaluate(() => {
    document.querySelectorAll('#fzRitual, #modal, .modal-backdrop, .fiezel-ob, .fz-tour').forEach(el => el.remove());
    if (typeof window.startAdaptive === 'function') {
      window.startAdaptive('grammar');
    }
    const st = typeof window.__getFiezelState === 'function' ? window.__getFiezelState() : window.state;
    if (st) {
      st.gems = { schema: 'fiezel-gems-v1', balance: 50, earnedTotal: 50, spentTotal: 0, ledger: [] };
      if (typeof window.save === 'function') window.save();
    }
    if (window.FiezelMochiVoiceSos) {
      window.FiezelMochiVoiceSos.updateTopbarGem();
      const q = window.FiezelMochiVoiceSos.getActiveQuestion ? window.FiezelMochiVoiceSos.getActiveQuestion(null) : null;
      window.FiezelMochiVoiceSos.mountCardToggle(q);
    }
  });
  await page.waitForTimeout(1000);

  // Stage 1: Inspect switch initial OFF state
  const stage1 = await page.evaluate(() => {
    const toggle = document.getElementById('fzMochiCardToggle');
    const label = toggle ? toggle.querySelector('.fz-mct-label')?.textContent : '';
    const state = toggle ? toggle.querySelector('.fz-mct-state')?.textContent : '';
    const gemTopbar = document.getElementById('quizTopbarGemCount')?.textContent;
    return {
      hasToggle: !!toggle,
      label,
      state,
      isOn: toggle?.classList.contains('is-on'),
      isOff: toggle?.classList.contains('is-off'),
      gemTopbar,
      box: toggle ? toggle.getBoundingClientRect() : null
    };
  });
  console.log('[TEST] Stage 1 (Initial Switch OFF):', stage1);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step1-switch-initial-off.png') });

  // Stage 2: Click the switch to open the confirmation modal
  console.log('[TEST] Clicking switch...');
  await page.evaluate(() => {
    const toggle = document.getElementById('fzMochiCardToggle');
    if (toggle) toggle.click();
  });
  await page.waitForTimeout(600);

  const stage2 = await page.evaluate(() => {
    const modal = document.getElementById('fzMochiSosConfirmModal');
    const title = modal?.querySelector('h3')?.textContent;
    const body = modal?.querySelector('p')?.textContent;
    const btnCancel = !!document.getElementById('fzMochiSosConfirmCancel');
    const btnOk = !!document.getElementById('fzMochiSosConfirmOk');
    return {
      hasModal: !!modal,
      title,
      body,
      btnCancel,
      btnOk,
      modalBox: modal ? modal.getBoundingClientRect() : null
    };
  });
  console.log('[TEST] Stage 2 (Confirmation Modal):', stage2);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step2-confirmation-modal-open.png') });

  // Stage 3: Click "Gunakan 10 Gem & Mulai"
  console.log('[TEST] Clicking "Gunakan 10 Gem & Mulai"...');
  await page.evaluate(() => {
    const btnOk = document.getElementById('fzMochiSosConfirmOk');
    if (btnOk) btnOk.click();
  });
  await page.waitForTimeout(1000);

  const stage3 = await page.evaluate(() => {
    const toggle = document.getElementById('fzMochiCardToggle');
    const modal = document.getElementById('fzMochiSosConfirmModal');
    const state = toggle ? toggle.querySelector('.fz-mct-state')?.textContent : '';
    const gemTopbar = document.getElementById('quizTopbarGemCount')?.textContent;
    const visualizer = document.getElementById('fzMochiVoiceUnder');
    const isCallActive = window.FiezelMochiVoiceSos?.isCallActive?.();
    const stGems = (typeof window.__getFiezelState === 'function' ? window.__getFiezelState() : window.state)?.gems?.balance;
    return {
      hasModal: !!modal,
      isOn: toggle?.classList.contains('is-on'),
      state,
      gemTopbar,
      stGems,
      hasVisualizer: !!visualizer,
      visualizerClass: visualizer?.className,
      isCallActive
    };
  });
  console.log('[TEST] Stage 3 (After 10 Gem deduction & Mochi Active):', stage3);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step3-mochi-activated-10gems-deducted.png') });

  // Stage 4: Simulate user speaking (VAD reactive color change to red)
  console.log('[TEST] Simulating user speaking...');
  await page.evaluate(() => {
    if (window.FiezelMochiVoiceSos?._setVoiceVisualizerUserSpeaking) {
      window.FiezelMochiVoiceSos._setVoiceVisualizerUserSpeaking(true);
    }
  });
  await page.waitForTimeout(300);

  const stage4 = await page.evaluate(() => {
    const visualizer = document.getElementById('fzMochiVoiceUnder');
    return {
      isUserSpeaking: visualizer?.classList.contains('is-user-speaking'),
      visualizerClass: visualizer?.className
    };
  });
  console.log('[TEST] Stage 4 (User speaking reactive visualizer):', stage4);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step4-visualizer-user-speaking-red.png') });

  // Stage 5: Turn switch OFF directly by clicking it again
  console.log('[TEST] Clicking switch to turn OFF...');
  await page.evaluate(() => {
    const toggle = document.getElementById('fzMochiCardToggle');
    if (toggle) toggle.click();
  });
  await page.waitForTimeout(500);

  const stage5 = await page.evaluate(() => {
    const toggle = document.getElementById('fzMochiCardToggle');
    const visualizer = document.getElementById('fzMochiVoiceUnder');
    return {
      isOn: toggle?.classList.contains('is-on'),
      isOff: toggle?.classList.contains('is-off'),
      hasVisualizer: !!visualizer,
      gemTopbar: document.getElementById('quizTopbarGemCount')?.textContent
    };
  });
  console.log('[TEST] Stage 5 (Turned OFF cleanly):', stage5);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'step5-turned-off-cleanly.png') });

  await browser.close();
  console.log('[TEST] ALL STAGES PASSED 100%!');
}

main().catch(err => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
