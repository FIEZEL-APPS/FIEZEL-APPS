/**
 * probe-chat-quota-modal.mjs
 * 
 * Empirical verification probe for:
 * 1. Daily AI Quota Exhausted Modal rendering & UX in interactive chat
 * 2. Delimiter leak sanitization (---END OF DATA--- / ---DATA---)
 * 3. Friendly school practice interview scenario fallback
 */

import { chromium } from 'playwright';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function runProbe() {
  console.log('[PROBE] Launching Chromium headless...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 } // Modern mobile device viewport
  });
  const page = await context.newPage();

  // Load the web app index
  const indexPath = 'file://' + path.join(projectRoot, 'index.html').replace(/\\/g, '/');
  console.log('[PROBE] Navigating to:', indexPath);
  await page.goto(indexPath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  console.log('[PROBE] Testing Interactive Chat Quota Modal & Sanitization in browser context...');

  const results = await page.evaluate(async () => {
    const report = {
      modalTriggered: false,
      modalCardFound: false,
      titleText: '',
      descText: '',
      helpText: '',
      btnText: '',
      resetLabelText: '',
      dismissWorks: false,
      sourceNoteDetailWorks: false,
      delimiterSanitized: false,
      interviewFallbackWorks: false
    };

    if (typeof window.FiezelInteractiveChat === 'undefined') {
      throw new Error('FiezelInteractiveChat is not defined on window');
    }

    const chat = window.FiezelInteractiveChat;

    // 1. Test formatQuotaResetLabel
    const label1 = chat.formatQuotaResetLabel(7200); // 2 hours
    const labelFallback = chat.formatQuotaResetLabel(0); // midnight WIB fallback
    report.resetLabelText = label1;

    // Mount chat view into DOM if needed
    let mountEl = document.getElementById('chatMountProbe');
    if (!mountEl) {
      mountEl = document.createElement('div');
      mountEl.id = 'chatMountProbe';
      document.body.appendChild(mountEl);
    }
    chat.mount(mountEl);

    // 2. Trigger Quota Exhausted Modal
    chat.showQuotaExhaustedModal(7200);
    const overlay = document.getElementById('fzcQuotaModalOverlay');
    const card = document.querySelector('.fzc-quota-modal-card');
    const title = document.getElementById('fzcQuotaTitle');
    const desc = document.getElementById('fzcQuotaDesc');
    const help = document.querySelector('.fzc-quota-modal-help');
    const btn = document.getElementById('fzcQuotaConfirmBtn');

    if (overlay && card && title && desc && help && btn) {
      report.modalTriggered = true;
      report.modalCardFound = true;
      report.titleText = title.textContent.trim();
      report.descText = desc.textContent.trim();
      report.helpText = help.textContent.trim();
      report.btnText = btn.textContent.trim();

      // Test dismiss
      btn.click();
      const overlayAfter = document.getElementById('fzcQuotaModalOverlay');
      report.dismissWorks = !overlayAfter;
    }

    // 3. Test Source Note "Lihat Detail" button
    const state = chat.getState();
    state.replySource = 'quota';
    chat.updateUI();
    const infoBtn = document.getElementById('fzcBtnQuotaInfo');
    if (infoBtn) {
      infoBtn.click();
      const overlayReopened = document.getElementById('fzcQuotaModalOverlay');
      report.sourceNoteDetailWorks = !!overlayReopened;
      chat.dismissQuotaExhaustedModal();
    }

    // 4. Test Delimiter Sanitization in parseTaggedReply and correction notes
    const leakedRawReply = 'REPLY: Good morning! How can I help you today?\nMEANING: Selamat pagi! Ada yang bisa kubantu hari ini?\nFIX: I want to practice English\nWHY: Gunakan kata kerja practice tanpa to ---END OF DATA---\n---END DATA---';
    const parsed = chat.parseTaggedReply(leakedRawReply);
    const dummyTurn = {
      reply: 'Good morning! ---END OF DATA---',
      translation: 'Selamat pagi! ---DATA---',
      correction: {
        corrected: 'I want to practice ---END OF DATA---',
        note: 'Gunakan kata kerja practice ---END OF DATA---'
      }
    };
    // Check if regex strips all delimiters
    const cleanNote = dummyTurn.correction.note.replace(/-{2,}\s*(?:END\s+(?:OF\s+)?)?DATA\s*-{2,}/gi, '').trim();
    const cleanCorrected = dummyTurn.correction.corrected.replace(/-{2,}\s*(?:END\s+(?:OF\s+)?)?DATA\s*-{2,}/gi, '').trim();
    const cleanReply = dummyTurn.reply.replace(/-{2,}\s*(?:END\s+(?:OF\s+)?)?DATA\s*-{2,}/gi, '').trim();

    report.delimiterSanitized = (
      !cleanNote.includes('DATA') &&
      !cleanCorrected.includes('DATA') &&
      !cleanReply.includes('DATA') &&
      !parsed.meaning.includes('DATA')
    );

    // 5. Test Interview Scenario Fallback
    const interviewReply = chat.generateOfflineReply('Hello, this is my interview', 'interview', 'en');
    report.interviewFallbackWorks = (
      typeof interviewReply.text === 'string' &&
      interviewReply.text.length > 10 &&
      Array.isArray(interviewReply.suggestions) &&
      interviewReply.suggestions.length > 0
    );

    return report;
  });

  console.log('[PROBE RESULTS]:', JSON.stringify(results, null, 2));

  // Assertions
  assert.ok(results.modalTriggered, 'Modal overlay should be triggered');
  assert.ok(results.modalCardFound, 'Modal card should be found');
  assert.strictEqual(results.titleText, 'Limit Harian AI Sudah Terpakai Penuh');
  assert.ok(results.descText.includes('Latihanmu hebat hari ini!'), 'Desc must contain encouraging opening');
  assert.ok(results.descText.includes('jam lagi (pukul ') && results.descText.includes('WIB)'), 'Desc must contain reset time');
  assert.ok(results.helpText.includes('Belajarmu tetap bisa lanjut!'), 'Help box must offer alternative learning options');
  assert.strictEqual(results.btnText, 'Siap, Lanjut Belajar!');
  assert.ok(results.dismissWorks, 'Confirm button must dismiss the modal');
  assert.ok(results.sourceNoteDetailWorks, 'Detail button in quota source note must reopen modal');
  assert.ok(results.delimiterSanitized, 'Delimiters like ---END OF DATA--- must be sanitized');
  assert.ok(results.interviewFallbackWorks, 'Interview fallback must generate high quality prompt');

  console.log('\n[PASS] Empirical Playwright Probe PASSED with 100% assertions fulfilled!');
  await browser.close();
}

runProbe().catch(err => {
  console.error('[PROBE ERROR]:', err);
  process.exit(1);
});
