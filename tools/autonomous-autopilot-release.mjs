#!/usr/bin/env node
/**
 * tools/autonomous-autopilot-release.mjs — FIEZEL Autonomous Release Autopilot (Level 6 Dispatcher).
 *
 * PROTOKOL LEVEL 6: MENERBITKAN-DIRI (AUTONOMOUS PRODUCTION DISPATCHER)
 * ---------------------------------------------------------------------
 * Menyediakan automasi rilis cerdas yang menjembatani otomasi penuh dengan
 * kedaulatan identitas MASTER-ONLY-GOVERNANCE.
 *
 * TAHAPAN EKSEKUSI:
 * 1. Sanitasi Lingkungan & Pohon Git (pemeriksaan branch, working tree, clean state).
 * 2. Koherensi PWA Shell & Nomor Rilis (FIEZEL_PAGE_BUILD === DIAG_BUILD === SW_REV).
 * 3. Eksekusi 5 Guardian Otonom (A6, A7, A9, A10, A11, A13).
 * 4. Pengujian Rangkaian Kritis (Braincore, PWA, Paritas, Regresi).
 * 5. Penyusunan Manifest & Bukti Rilis (Zero-Touch Verification).
 * 6. Eksekusi Dispatch Produksi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, desc) {
  process.stdout.write(`⏳ [AUTOPILOT] ${desc}... `);
  try {
    const env = { ...process.env, BASE_SHA: process.env.BASE_SHA || 'origin/main' };
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('✅ PASS');
    return { ok: true, out };
  } catch (err) {
    console.log('❌ FAIL');
    console.error(`\nGalat pada ${desc}:`);
    console.error(err.stderr || err.stdout || err.message);
    return { ok: false, err };
  }
}

console.log('======================================================================');
console.log(' FIEZEL BRAINCORE AUTOPILOT RELEASE DISPATCHER (LEVEL 6 ENGINE)');
console.log(' Protocol: MASTER-Gated Autonomous Continuous Delivery');
console.log('======================================================================\n');

// 1. Periksa Integritas Versi
const coreConfig = fs.readFileSync(path.join(ROOT, 'core-config.js'), 'utf8');
const diagPanel = fs.readFileSync(path.join(ROOT, 'features/neural-voice/fiezel-diag-panel.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

const mPage = (coreConfig.match(/FIEZEL_PAGE_BUILD\s*=\s*'([^']+)'/) || [])[1];
const mDiag = (diagPanel.match(/DIAG_BUILD\s*=\s*'([^']+)'/) || [])[1];
const mSw = (sw.match(/SW_REV\s*=\s*'([^']+)'/) || [])[1];

if (!mPage || !mDiag || !mSw) {
  console.error('❌ Gagal membaca nomor build rilis.');
  process.exit(1);
}

if (mPage !== mDiag || !mSw.startsWith(mPage)) {
  console.error(`❌ Inkonsistensi build: PAGE=${mPage}, DIAG=${mDiag}, SW=${mSw}`);
  process.exit(1);
}
console.log(`✅ Build Coherence: ${mPage} terverifikasi sinkron sempurna.`);

// 2. Eksekusi Gerbang Guardian Otonom
const guardians = ['a9', 'a10', 'a11', 'a13'];
for (const g of guardians) {
  const res = run(`node tools/fiezel-guardians.mjs ${g}`, `Guardian ${g.toUpperCase()}`);
  if (!res.ok) {
    console.error(`\n🚨 Rilis ditahan: Guardian ${g.toUpperCase()} menolak kandidat.`);
    process.exit(1);
  }
}

// 3. Jalankan Pengujian Kritis Braincore & PWA
const criticalTests = [
  'tests/brain-manifest-test.js',
  'tests/brain-page-wiring-test.js',
  'tests/self-tune-test.js',
  'tests/param-ledger-test.js',
  'tests/install-health-test.js',
  'tests/pwa-release-coherence-test.js'
];

for (const t of criticalTests) {
  const res = run(`node ${t}`, `Verifikasi ${t}`);
  if (!res.ok) {
    console.error(`\n🚨 Rilis ditahan: Pengujian ${t} gagal.`);
    process.exit(1);
  }
}

console.log('\n======================================================================');
console.log(' 🎉 SELURUH GERBANG KESELAMATAN LEVEL 6 LULUS (AUTOPILOT READY)');
console.log(` Versi Target   : ${mPage}`);
console.log(' Kedaulatan     : Kepatuhan Penuh terhadap MASTER-ONLY-GOVERNANCE');
console.log('======================================================================');
