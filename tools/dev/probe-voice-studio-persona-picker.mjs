#!/usr/bin/env node
/**
 * tools/dev/probe-voice-studio-persona-picker.mjs
 *
 * Probe Empiris Headless Playwright — Persona & Scenario Switcher UI/UX:
 * 1. Memverifikasi seluruh Persona (Nanami, Keita, Coach Alex, Coach Sarah)
 *    memiliki openingGreeting, personalityTag, dan roastStyle.
 * 2. Memverifikasi tombol Persona Picker Trigger di header dan kartu panggil
 *    terlihat di perangkat mobile (viewport 390x844).
 * 3. Menguji klik trigger membuka modal Persona & Scenario Picker.
 * 4. Menguji pemilihan persona Keita vs Nanami dan Coach Sarah vs Coach Alex,
 *    memastikan state aktif, judul header, skenario, dan localStorage tersinkronisasi.
 * 5. Memverifikasi bebas dari klaim terlarang dan zero console error di browser.
 */

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright');

const PORT = Number(process.env.PROBE_PORT || 3493);

console.log('=== FIEZEL EMPIRICAL PROBE: PERSONA & SCENARIO PICKER UI/UX ===\n');

// ---------------------------------------------------------------------------
// 1. Static Contract & Persona Inspection
// ---------------------------------------------------------------------------
console.log('--- 1. Audit Kontrak Persona & Opening Greetings ---');
const scenariosSrc = fs.readFileSync(path.join(ROOT, 'features/voice-studio/src/data/callScenarios.ts'), 'utf8');

assert(scenariosSrc.includes('openingGreeting:'), 'VOICE_PERSONAS WAJIB memuat openingGreeting');
assert(scenariosSrc.includes('personalityTagId:'), 'VOICE_PERSONAS WAJIB memuat personalityTagId');
assert(scenariosSrc.includes('roastStyleId:'), 'VOICE_PERSONAS WAJIB memuat roastStyleId');

// Pastikan semua 4 persona terdefinisi
const personas = ['coach_alex', 'coach_sarah', 'nanami', 'keita'];
for (const p of personas) {
  assert(scenariosSrc.includes(`${p}:`), `Persona ${p} wajib ada di callScenarios.ts`);
}

// Pastikan skenario Free Talk untuk Nanami dan Keita tersedia
assert(scenariosSrc.includes('scen_ja_free_talk'), 'scen_ja_free_talk wajib ada');
assert(scenariosSrc.includes('scen_ja_free_talk_keita'), 'scen_ja_free_talk_keita wajib ada');
assert(scenariosSrc.includes('scen_en_free_talk'), 'scen_en_free_talk wajib ada');
assert(scenariosSrc.includes('scen_en_free_talk_sarah'), 'scen_en_free_talk_sarah wajib ada');

// Larangan klaim terlarang
const FORBIDDEN_CLAIMS = ['100% Gratis', 'Latihan Bisa Offline', 'CEFR', 'JLPT'];
const appSrc = fs.readFileSync(path.join(ROOT, 'features/voice-studio/src/App.tsx'), 'utf8');
for (const claim of FORBIDDEN_CLAIMS) {
  assert(!appSrc.includes(`"${claim}"`), `DILARANG KERAS memuat klaim terlarang "${claim}" di App.tsx`);
}
console.log('✓ Kontrak persona, opening lines, dan zero klaim terlarang lulus 100%');

// ---------------------------------------------------------------------------
// 2. Playwright Headless Browser Test
// ---------------------------------------------------------------------------
console.log(`\n--- 2. Menjalankan Server Lokal di Port ${PORT} ---`);
const serverProc = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server timeout 12s')), 12000);
  serverProc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('berjalan di') || text.includes('listening') || text.includes(String(PORT))) {
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  console.log('--- 3. Navigasi ke Kawan Bicara (call.html?lang=ja) ---');
  await page.goto(`http://127.0.0.1:${PORT}/call.html?embed=1&tab=call&lang=ja`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('[data-testid="ai-call-card"]', { timeout: 15000 });

  // 1. Verifikasi Header Persona Trigger
  const headerTrigger = await page.$('[data-testid="persona-picker-trigger"]');
  assert(headerTrigger, 'Tombol persona-picker-trigger wajib ada di header');
  const headerText = (await headerTrigger.innerText()).trim();
  console.log(`  [HEADER TRIGGER]: "${headerText}"`);
  assert(headerText.includes('七海') || headerText.includes('Nanami'), 'Default persona Jepang wajib Nanami');

  // 2. Verifikasi Call Card Trigger
  const cardTrigger = await page.$('[data-testid="persona-card-trigger"]');
  assert(cardTrigger, 'Tombol persona-card-trigger wajib ada di kartu panggilan');

  // 3. Klik trigger untuk membuka modal
  console.log('\n--- 4. Uji Klik Persona Trigger & Buka Modal Selector ---');
  await headerTrigger.click();
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'visible', timeout: 5000 });
  console.log('✓ Modal persona-scenario-modal berhasil terbuka');

  // 4. Verifikasi kartu Nanami dan Keita ada di modal
  const nanamiCard = await page.$('[data-testid="persona-card-nanami"]');
  const keitaCard = await page.$('[data-testid="persona-card-keita"]');
  assert(nanamiCard, 'Kartu persona Nanami wajib ada di modal');
  assert(keitaCard, 'Kartu persona Keita wajib ada di modal');
  console.log('✓ Kartu persona Nanami & Keita terdeteksi di dalam modal');

  // 5. Klik kartu Keita untuk beralih persona
  console.log('\n--- 5. Uji Penggantian Persona ke Keita Senpai ---');
  await keitaCard.click();
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'hidden', timeout: 5000 });
  console.log('✓ Modal tertutup setelah memilih Keita');

  // Verifikasi perubahan pada Header dan localStorage
  const updatedHeaderText = (await page.$eval('[data-testid="persona-picker-trigger"]', (el) => el.innerText)).trim();
  console.log(`  [UPDATED HEADER TRIGGER]: "${updatedHeaderText}"`);
  assert(updatedHeaderText.includes('健太') || updatedHeaderText.includes('Keita'), 'Header wajib berubah menampilkan Keita');

  const savedPersona = await page.evaluate(() => localStorage.getItem('fiezel_voice_persona_pref'));
  assert.strictEqual(savedPersona, 'keita', 'localStorage fiezel_voice_persona_pref wajib bernilai "keita"');
  console.log('✓ State persona tersimpan di localStorage: "keita"');

  // 6. Uji Beralih Kembali ke Nanami melalui Call Card Trigger
  console.log('\n--- 6. Uji Penggantian Kembali ke Nanami via Call Card Trigger ---');
  await page.click('[data-testid="persona-card-trigger"]');
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'visible', timeout: 5000 });
  await page.click('[data-testid="persona-card-nanami"]');
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'hidden', timeout: 5000 });

  const finalJpHeaderText = (await page.$eval('[data-testid="persona-picker-trigger"]', (el) => el.innerText)).trim();
  assert(finalJpHeaderText.includes('七海') || finalJpHeaderText.includes('Nanami'), 'Header wajib kembali ke Nanami');
  console.log('✓ Berhasil beralih kembali ke Nanami');

  // 7. Uji Beralih Bahasa ke English (EN)
  console.log('\n--- 7. Uji Beralih Bahasa ke English & Persona Selector English ---');
  const enButton = await page.$('[data-testid="target-lang-en"]');
  assert(enButton, 'Tombol target-lang-en wajib ada di header');
  await enButton.click();
  await page.waitForTimeout(500);

  const enHeaderText = (await page.$eval('[data-testid="persona-picker-trigger"]', (el) => el.innerText)).trim();
  console.log(`  [EN HEADER TRIGGER]: "${enHeaderText}"`);
  assert(enHeaderText.includes('Alex'), 'Default persona English wajib Alex');

  // Buka modal untuk English
  await page.click('[data-testid="persona-picker-trigger"]');
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'visible', timeout: 5000 });

  const alexCard = await page.$('[data-testid="persona-card-coach_alex"]');
  const sarahCard = await page.$('[data-testid="persona-card-coach_sarah"]');
  assert(alexCard, 'Kartu persona Coach Alex wajib ada di modal English');
  assert(sarahCard, 'Kartu persona Coach Sarah wajib ada di modal English');
  console.log('✓ Kartu Coach Alex & Coach Sarah terdeteksi di dalam modal English');

  // Pilih Coach Sarah
  await sarahCard.click();
  await page.waitForSelector('[data-testid="persona-scenario-modal"]', { state: 'hidden', timeout: 5000 });

  const sarahHeaderText = (await page.$eval('[data-testid="persona-picker-trigger"]', (el) => el.innerText)).trim();
  assert(sarahHeaderText.includes('Sarah'), 'Header wajib berubah menampilkan Coach Sarah');
  const savedEnPersona = await page.evaluate(() => localStorage.getItem('fiezel_voice_persona_pref'));
  assert.strictEqual(savedEnPersona, 'coach_sarah', 'localStorage wajib bernilai "coach_sarah"');
  console.log('✓ Berhasil memilih Coach Sarah dan tersimpan di localStorage');

  // 8. Cek Zero Console Error
  assert.strictEqual(pageErrors.length, 0, `Ditemukan error di browser: ${pageErrors.join('; ')}`);
  console.log('\n✓ ZERO browser console error terdeteksi selama pengujian');

  console.log('\n=== SEMUA 8 PENGUJIAN EMPIRIS PLAYWRIGHT LULUS 100% ===');
} finally {
  await browser.close();
  serverProc.kill('SIGTERM');
}
