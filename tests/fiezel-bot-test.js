#!/usr/bin/env node
/**
 * GERBANG INTEGRITAS FIEZEL BOT v2 (tests/fiezel-bot-test.js)
 * ------------------------------------------------------------
 * Memverifikasi integritas sistem Fiezel Bot v2:
 * T1. Skrip CLI valid sintaksis.
 * T2. Self-test internal lulus (8 sub-test).
 * T3. Workflow .github/workflows/fiezel-bot.yml mematuhi standar A9.
 * T4. Tidak mengganggu gerbang timeout workflow keseluruhan.
 * T5. Berkas engine fiezel-bot.mjs mengandung komponen kunci v2.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;

function sh(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} gagal (${r.status}): ${(r.stderr || r.stdout || '').slice(0, 500)}`);
  return r.stdout.trim();
}

console.log('[T1] Validasi sintaksis tools/fiezel-bot.mjs...');
sh('node', ['--check', 'tools/fiezel-bot.mjs']);
console.log('  ok');
pass++;

console.log('[T2] Menjalankan self-test tools/fiezel-bot.mjs...');
const selfTestOut = sh('node', ['tools/fiezel-bot.mjs', 'self-test']);
assert(selfTestOut.includes('Self-Test: PASS'), 'Self-test harus mencetak PASS');
console.log('  ok');
pass++;

console.log('[T3] Memeriksa kepatuhan workflow fiezel-bot.yml...');
const wfPath = path.join(ROOT, '.github/workflows/fiezel-bot.yml');
assert(fs.existsSync(wfPath), 'Berkas workflow fiezel-bot.yml wajib ada');
const wfContent = fs.readFileSync(wfPath, 'utf8');
assert(!wfContent.includes('pull_request_target'), 'A9: DILARANG pull_request_target');
assert(!wfContent.includes('permissions: write-all'), 'A9: DILARANG write-all');
assert(/timeout-minutes:\s*\d+/.test(wfContent), 'Harus memiliki timeout-minutes');
console.log('  ok');
pass++;

console.log('[T4] Menjalankan gerbang batas waktu workflow...');
sh('node', ['tests/workflow-timeout-gate-test.js']);
console.log('  ok');
pass++;

console.log('[T5] Memeriksa komponen kunci v2 di engine...');
const engine = fs.readFileSync(path.join(ROOT, 'tools/fiezel-bot.mjs'), 'utf8');
const requiredComponents = [
  'runDeterministicScan',
  'classifyFiles',
  'computeRiskScore',
  'CI_FAILURE_SIGNATURES',
  'SECRET_PATTERNS',
  'SUBSYSTEMS',
  'composeReviewMarkdown',
  'FIEZEL_SYSTEM_PROMPT',
];
for (const comp of requiredComponents) {
  assert(engine.includes(comp), `Komponen kunci v2 "${comp}" tidak ditemukan di engine`);
}
console.log('  ok');
pass++;

console.log(`\n✅ SEMUA PENGUJIAN FIEZEL BOT v2 LULUS (${pass}/${pass} PASS).`);
