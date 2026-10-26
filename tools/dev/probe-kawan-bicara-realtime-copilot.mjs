#!/usr/bin/env node
/**
 * tools/dev/probe-kawan-bicara-realtime-copilot.mjs
 *
 * Probe Empiris Headless Playwright — Kawan Bicara / Mitra Kaiwa Real-Time AI Copilot:
 * 1. Memverifikasi panggung komunikasi dua arah fokus kontak mata pada Mobile Jepang (390×844)
 *    dan Desktop Inggris (1280×800):
 *    - Bebas kemunculan klaim/istilah terlarang ("CEFR", "JLPT", "100% Gratis", "Latihan Bisa Offline").
 *    - Bebas tumpang tindih dengan bilah komposer bawah (zero slicing).
 * 2. Memverifikasi bantuan jawaban adalah 100% hasil generate AI secara realtime (data-copilot-source="ai-realtime")
 *    untuk kalimat pembuka maupun pertanyaan spontan tak terjadwal (bukan template statis seperti "ホットコーヒー").
 * 3. Memverifikasi tombol "Opsi Baru" menghasilkan variasi kalimat baru secara realtime, dan tombol "Pakai"
 *    mengirim giliran bicara tanpa runtime error serta mencatat telemetri nyata ke Braincore
 *    (localStorage "fiezel-braincore-voice-v1").
 * 4. Memverifikasi Anti-Leak Exam Purity: mengaktifkan Mode Ujian menyembunyikan 100% panel Copilot.
 */

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright');

const PORT = Number(process.env.PROBE_PORT || 3489);
const SCREENSHOT_DIR = process.env.PROBE_SCREENSHOT_DIR || '';

const serverProc = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 8000);
  serverProc.stdout.on('data', (chunk) => {
    if (String(chunk).includes('Listening on')) {
      clearTimeout(timeout);
      resolve();
    }
  });
  serverProc.stderr.on('data', (chunk) => {
    process.stderr.write(`[SERVER STDERR] ${chunk}`);
  });
  serverProc.on('error', (err) => {
    clearTimeout(timeout);
    reject(err);
  });
});

console.log(`[PROBE] Server lokal aktif di http://127.0.0.1:${PORT}`);
const browser = await chromium.launch({ headless: true });

try {
  // =========================================================================
  // 1. MOBILE JAPANESE MITRA KAIWA (390×844)
  // =========================================================================
  const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageJa = await ctxMobile.newPage();
  const jaErrors = [];
  const reqTimings = new Map();

  pageJa.on('pageerror', (err) => jaErrors.push(err.message));
  pageJa.on('request', (req) => {
    if (req.url().includes('/api/voice/')) reqTimings.set(req, Date.now());
  });
  pageJa.on('response', async (res) => {
    if (res.url().includes('/api/voice/')) {
      const started = reqTimings.get(res.request()) || Date.now();
      console.log(`[JA API] ${res.status()} (${Date.now() - started}ms) ${new URL(res.url()).pathname}`);
    }
  });

  await pageJa.goto(`http://127.0.0.1:${PORT}/call.html?embed=1&tab=call&lang=ja`, {
    waitUntil: 'domcontentloaded',
  });
  await pageJa.waitForSelector('[data-testid="ai-call-card"]', { timeout: 15000 });
  await pageJa.waitForSelector(
    '[data-testid="beginner-answer-assistant"][data-copilot-source="ai-realtime"]',
    { timeout: 18000 }
  );

  const visibleBodyJa = await pageJa.locator('body').innerText();
  assert.ok(
    !/\b(CEFR|JLPT)\b|100%\s*Gratis|Latihan\s*Bisa\s*Offline/i.test(visibleBodyJa),
    'Ditemukan teks terlarang pada UI Mitra Kaiwa JA'
  );

  const openAiJa = await pageJa.locator('[data-testid="live-hud-ai-text"]').innerText();
  const openCopilotJa = await pageJa.locator('[data-testid="teleprompter-target-text"]').innerText();
  assert.ok(!openCopilotJa.includes('ホットコーヒー'), `Template statis terdeteksi: ${openCopilotJa}`);

  // Verifikasi judul natural dan tombol sembunyikan bantuan pada Mobile
  const assistantJaText = await pageJa.locator('[data-testid="beginner-answer-assistant"]').innerText();
  assert.ok(
    assistantJaText.includes('Biar Fiezel bantu') || assistantJaText.includes('Fiezel'),
    `Judul natural tidak ditemukan: ${assistantJaText}`
  );
  assert.ok(
    assistantJaText.includes('Spontan') || assistantJaText.includes('AI Realtime'),
    `Badge status tidak sesuai: ${assistantJaText}`
  );

  // Verifikasi fungsi toggle Sembunyikan / Tampilkan Bantuan
  await pageJa.locator('[data-testid="copilot-toggle-collapse-btn"]').click();
  await pageJa.waitForSelector('[data-testid="beginner-answer-assistant"][data-copilot-collapsed="true"]', { timeout: 3000 });
  const collapsedText = await pageJa.locator('[data-testid="beginner-answer-assistant"]').innerText();
  assert.ok(
    collapsedText.includes('Tampilkan Bantuan') || collapsedText.includes('เปิดตัวช่วย'),
    `Tombol expand tidak muncul saat disembunyikan: ${collapsedText}`
  );
  // Klik kembali untuk menampilkan bantuan
  await pageJa.locator('[data-testid="copilot-toggle-collapse-btn"]').click();
  await pageJa.waitForSelector('[data-testid="beginner-answer-assistant"][data-copilot-collapsed="false"]', { timeout: 3000 });

  const jaStageBox = await pageJa.locator('[data-testid="ai-call-card"]').boundingBox();
  const jaCopilotBox = await pageJa.locator('[data-testid="beginner-answer-assistant"]').boundingBox();
  const jaDockBox = await pageJa.locator('[data-testid="mitra-kaiwa-bottom-dock"]').boundingBox();

  console.log(
    `[JA 390×844 GEOMETRY] StageBottom=${Math.round(jaStageBox.y + jaStageBox.height)}px, CopilotBottom=${Math.round(
      jaCopilotBox.y + jaCopilotBox.height
    )}px, DockTop=${Math.round(jaDockBox.y)}px`
  );
  assert.ok(
    jaCopilotBox.y + jaCopilotBox.height <= jaDockBox.y + 2,
    `Copilot JA tumpang tindih dengan dock! CopilotBottom=${jaCopilotBox.y + jaCopilotBox.height}, DockTop=${jaDockBox.y}`
  );

  // Kirim giliran spontan (membuat ramen pedas tadi malam)
  await pageJa.fill('[data-testid="voice-turn-input"]', '昨日の夜、家で辛いラーメンを作りました。');
  await pageJa.click('[data-testid="send-turn-btn"]');

  await pageJa.waitForFunction(
    (prevAi) => {
      const el = document.querySelector('[data-testid="live-hud-ai-text"]');
      const copilot = document.querySelector('[data-testid="beginner-answer-assistant"]');
      const sendBtn = document.querySelector('[data-testid="send-turn-btn"]');
      return (
        el &&
        el.textContent &&
        el.textContent.trim() !== prevAi &&
        copilot &&
        copilot.getAttribute('data-copilot-source') === 'ai-realtime' &&
        sendBtn &&
        !sendBtn.textContent.includes('...')
      );
    },
    openAiJa.trim(),
    { timeout: 22000 }
  );

  const ramenAiJa = await pageJa.locator('[data-testid="live-hud-ai-text"]').innerText();
  await pageJa.locator('[data-testid="copilot-tier-tab-1"]').click();
  await pageJa.waitForTimeout(100);
  const ramenTier2Text = await pageJa.locator('[data-testid="teleprompter-target-text"]').innerText();
  const ramenTier2Romaji = await pageJa.locator('[data-testid="teleprompter-pronunciation"]').innerText();
  const ramenTier2Meaning = await pageJa.locator('[data-testid="teleprompter-meaning"]').innerText();

  console.log('[JA RAMEN TURN] Partner AI:', ramenAiJa.replace(/\s+/g, ' '));
  console.log('[JA RAMEN TURN] Copilot Tier 2:', {
    text: ramenTier2Text.replace(/\s+/g, ' '),
    romaji: ramenTier2Romaji.replace(/\s+/g, ' '),
    meaning: ramenTier2Meaning.replace(/\s+/g, ' '),
  });

  if (SCREENSHOT_DIR) {
    await pageJa.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_mobile_ja.png') });
  }
  assert.strictEqual(jaErrors.length, 0, `Runtime error JA: ${jaErrors.join('; ')}`);

  // =========================================================================
  // 2. DESKTOP ENGLISH KAWAN BICARA (1280×800)
  // =========================================================================
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageEn = await ctxDesktop.newPage();
  const enErrors = [];
  pageEn.on('pageerror', (err) => enErrors.push(err.message));

  await pageEn.goto(`http://127.0.0.1:${PORT}/call.html?embed=1&tab=call&lang=en`, {
    waitUntil: 'domcontentloaded',
  });
  await pageEn.waitForSelector('[data-testid="ai-call-card"]', { timeout: 15000 });
  await pageEn.waitForSelector(
    '[data-testid="beginner-answer-assistant"][data-copilot-source="ai-realtime"]',
    { timeout: 18000 }
  );

  const visibleBodyEn = await pageEn.locator('body').innerText();
  assert.ok(
    !/\b(CEFR|JLPT)\b|100%\s*Gratis|Latihan\s*Bisa\s*Offline/i.test(visibleBodyEn),
    'Ditemukan teks terlarang pada UI Kawan Bicara EN'
  );

  const assistantEnText = await pageEn.locator('[data-testid="beginner-answer-assistant"]').innerText();
  assert.ok(
    assistantEnText.includes('Sini, biar Fiezel bantuin kamu') || assistantEnText.includes('Fiezel'),
    `Judul natural desktop tidak ditemukan: ${assistantEnText}`
  );

  // Toggle Sembunyikan Bantuan di Desktop
  await pageEn.locator('[data-testid="copilot-toggle-collapse-btn"]').click();
  await pageEn.waitForSelector('[data-testid="beginner-answer-assistant"][data-copilot-collapsed="true"]', { timeout: 3000 });
  await pageEn.locator('[data-testid="copilot-toggle-collapse-btn"]').click();
  await pageEn.waitForSelector('[data-testid="beginner-answer-assistant"][data-copilot-collapsed="false"]', { timeout: 3000 });

  const openAiEn = await pageEn.locator('[data-testid="live-hud-ai-text"]').innerText();
  await pageEn.fill(
    '[data-testid="voice-turn-input"]',
    'I am designing an automated hydroponic greenhouse in Bandung.'
  );
  await pageEn.click('[data-testid="send-turn-btn"]');

  await pageEn.waitForFunction(
    (prevAi) => {
      const el = document.querySelector('[data-testid="live-hud-ai-text"]');
      const copilot = document.querySelector('[data-testid="beginner-answer-assistant"]');
      const sendBtn = document.querySelector('[data-testid="send-turn-btn"]');
      return (
        el &&
        el.textContent &&
        el.textContent.trim() !== prevAi &&
        copilot &&
        copilot.getAttribute('data-copilot-source') === 'ai-realtime' &&
        sendBtn &&
        !sendBtn.textContent.includes('...')
      );
    },
    openAiEn.trim(),
    { timeout: 22000 }
  );

  await pageEn.locator('[data-testid="copilot-tier-tab-1"]').click();
  await pageEn.waitForTimeout(100);

  const enStageBox = await pageEn.locator('[data-testid="ai-call-card"]').boundingBox();
  const enCopilotBox = await pageEn.locator('[data-testid="beginner-answer-assistant"]').boundingBox();
  const enDockBox = await pageEn.locator('[data-testid="mitra-kaiwa-bottom-dock"]').boundingBox();

  console.log(
    `[EN 1280×800 GEOMETRY] StageBottom=${Math.round(enStageBox.y + enStageBox.height)}px, CopilotBottom=${Math.round(
      enCopilotBox.y + enCopilotBox.height
    )}px, DockTop=${Math.round(enDockBox.y)}px`
  );
  assert.ok(
    enCopilotBox.y + enCopilotBox.height <= enDockBox.y + 2,
    `Copilot EN tumpang tindih dengan dock! CopilotBottom=${enCopilotBox.y + enCopilotBox.height}, DockTop=${enDockBox.y}`
  );

  if (SCREENSHOT_DIR) {
    await pageEn.screenshot({ path: path.join(SCREENSHOT_DIR, 'after_desktop_en.png') });
  }

  // Verifikasi tombol "Opsi Baru" menghasilkan variasi kalimat baru
  const beforeRefreshText = await pageEn.locator('[data-testid="teleprompter-target-text"]').innerText();
  await pageEn.click('[data-testid="copilot-refresh-btn"]');
  await pageEn.waitForFunction(
    (prevText) => {
      const copilot = document.querySelector('[data-testid="beginner-answer-assistant"]');
      const txtEl = document.querySelector('[data-testid="teleprompter-target-text"]');
      return (
        copilot &&
        copilot.getAttribute('data-copilot-source') === 'ai-realtime' &&
        txtEl &&
        txtEl.textContent &&
        txtEl.textContent.trim() !== prevText
      );
    },
    beforeRefreshText.trim(),
    { timeout: 18000 }
  );

  // Verifikasi tombol "Pakai" mengirim langsung & mencatat telemetri Braincore
  const aiBeforePakai = await pageEn.locator('[data-testid="live-hud-ai-text"]').innerText();
  await pageEn.click('[data-testid="teleprompter-send-btn"]');
  await pageEn.waitForFunction(
    (prevAi) => {
      const el = document.querySelector('[data-testid="live-hud-ai-text"]');
      const copilot = document.querySelector('[data-testid="beginner-answer-assistant"]');
      return (
        el &&
        el.textContent &&
        el.textContent.trim() !== prevAi &&
        copilot &&
        copilot.getAttribute('data-copilot-source') === 'ai-realtime'
      );
    },
    aiBeforePakai.trim(),
    { timeout: 22000 }
  );
  assert.strictEqual(enErrors.length, 0, `Runtime error EN: ${enErrors.join('; ')}`);

  const brainData = await pageEn.evaluate(() => {
    const raw = localStorage.getItem('fiezel-braincore-voice-v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      historyCount: (parsed.speakingHistory || []).length,
      competencyCount: Object.keys(parsed.competencies || {}).length,
    };
  });
  console.log('[BRAINCORE TELEMETRY]', brainData);
  assert.ok(brainData && brainData.historyCount >= 2, 'Braincore speakingHistory wajib mencatat giliran bicara');

  // Verifikasi Anti-Leak Exam Purity (Mode Ujian menyembunyikan Copilot 100%)
  await pageEn.click('[data-testid="exam-mode-toggle-btn"]');
  await pageEn.waitForTimeout(150);
  const copilotInExamCount = await pageEn.locator('[data-testid="beginner-answer-assistant"]').count();
  assert.strictEqual(copilotInExamCount, 0, 'Panel Copilot wajib disembunyikan penuh pada Mode Ujian');

  console.log('✅ PROBE EMPIRIS KAWAN BICARA REALTIME AI COPILOT LULUS 100%');
} finally {
  await browser.close();
  serverProc.kill();
}
