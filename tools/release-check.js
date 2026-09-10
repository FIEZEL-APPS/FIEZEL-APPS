#!/usr/bin/env node
// tools/release-check.js — SATU perintah menjalankan SEMUA gerbang rilis berurutan.
//
//   node tools/release-check.js          → seluruh 169 gerbang (daftar dari sweep D1,
//                                          /d-findings/D1-gate-sweep.md, branch audit-wave-d,
//                                          28 Agu 2026 — semua berkas root *-test.js, *audit*.js,
//                                          plus validator.js, release-audit.py,
//                                          adaptivity-simulation-v3.js).
//   node tools/release-check.js --fast   → subset inti: sama persis MINUS gerbang lambat
//                                          (>20 s di sweep D1; daftar + alasannya di
//                                          FAST_EXCLUDE di bawah). Untuk umpan balik cepat,
//                                          BUKAN pengganti jalur penuh sebelum rilis.
//
// Kontrak keluaran:
//   - satu baris status per gerbang saat berjalan,
//   - rekap PASS/FAIL di akhir (gerbang gagal disebut namanya),
//   - exit 0 hanya bila SEMUA gerbang yang dijalankan lulus; selain itu exit 1.
//
// Urutan sengaja: `release-audit.py` dijalankan SEBELUM `tests/release-audit-gate-test.js`,
// lalu gerbang node itu diberi FIEZEL_RELEASE_AUDIT_REPORT_FRESH=1 supaya ia memakai ulang
// laporan yang baru ditulis (ia tetap memverifikasi sha256 app.js + version sendiri —
// lihat tests/release-audit-gate-test.js §3). Tanpa ini audit ~6 menit berjalan dua kali.
//
// Nol dependency, nol jaringan. Gerbang live (tests/cf-live-contract-test.js,
// tests/staging-live-test.js) SKIP-by-design tanpa env live dan exit 0 — di sini itu dihitung
// lulus perintahnya, bukan bukti live (lihat tests/gate-registry-test.js §6).
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');

/* =======================================================================================
 * DAFTAR GERBANG — sumber: tabel sweep D1 (169 baris), diurutkan alfabetis di sana.
 * ===================================================================================== */
const GATES = [
  'tests/a11y-test.js',
  'tests/academic-readiness-test.js',
  'tests/adaptive-policy-test.js',
  'adaptivity-simulation-v3.js',
  'tests/affect-test.js',
  'tests/ai-integration-test.js',
  'tests/ai-response-shape-test.js',
  'tests/ai-task-contract-test.js',
  'tests/ai-transport-switch-test.js',
  'tests/alrs-behavior-test.js',
  'tests/analytics-aggregate-test.js',
  'tests/analytics-client-test.js',
  'tests/analytics-privacy-test.js',
  'tests/analytics-server-only-test.js',
  'tests/app-report-control-path-test.js',
  'tests/audio-asset-pipeline-test.js',
  'tests/back-nav-test.js',
  'tests/backup-ui-test.js',
  'tests/bank-soal-audit-test.js',
  'tests/boot-order-test.js',
  'tests/breaker-test.js',
  'tests/cf-api-contract-test.js',
  'tests/cf-client-timeout-test.js',
  'tests/cf-config-killswitch-test.js',
  'tests/cf-live-contract-test.js',
  'tests/cf-live-selftest.js',
  'tests/cf-shadow-ledger-test.js',
  'tests/cf-shadow-mode-test.js',
  'tests/cf-transport-test.js',
  'tests/cf-wiring-test.js',
  'tests/classroom-test.js',
  'tests/cloze-bank-test.js',
  'tests/config-consistency-test.js',
  'tests/confusion-matrix-test.js',
  'tests/content-adoption-evidence-test.js',
  'tests/content-adoption-receipt-test.js',
  'tests/content-adoption-rehearsal-test.js',
  'tests/content-adoption-test.js',
  'content-audit.js',
  'tests/content-canary-test.js',
  'tests/content-evidence-origin-test.js',
  'content-integrity-audit.js',
  'tests/content-integrity-gate-test.js',
  'tests/content-patch-gate-test.js',
  'tests/content-promotion-test.js',
  'tests/content-qa-agent-test.js',
  'tests/continuity-test.js',
  'tests/contrast-test.js',
  'tests/core-brain-test.js',
  'tests/core-brain-v2-test.js',
  'tests/core-brain-v3-upgrade-test.js',
  'tests/core-worker-contract-test.js',
  'tests/cron-contract-test.js',
  'tests/d1-schema-contract-test.js',
  'tests/diag-panel-test.js',
  'tests/diag-search-test.js',
  'tests/diagnostic-scanner-test.js',
  'tests/e2e-level-grammar-test.js',
  'tests/edge-guard-test.js',
  'tests/edge-proxy-contract-test.js',
  'tests/edge-proxy-hopbyhop-test.js',
  'tests/evidence-credibility-test.js',
  'tests/experience-integration-test.js',
  'tests/fiezel-autonomy-config-test.js',
  'tests/fiezel-evolution-ledger-test.js',
  'tests/fiezel-evolution-loop-test.js',
  'tests/fiezel-meta-learning-test.js',
  'tests/fiezel-prompt-library-test.js',
  'tests/fiezel-self-refine-test.js',
  'tests/gate-registry-test.js',
  'tests/gems-test.js',
  'tests/grammar-curriculum-test.js',
  'tests/grammar-memory-scope-test.js',
  'grammar-quality-audit.js',
  'tests/grammar-unlock-test.js',
  'tests/health-probe-test.js',
  'tests/http-smoke-test.js',
  'tests/install-health-test.js',
  'tests/item-calibration-test.js',
  'tests/item-prior-test.js',
  'tests/learner-evidence-test.js',
  'tests/lesson-experience-test.js',
  'tests/level-evidence-test.js',
  'tests/level-grammar-contract-test.js',
  'tests/level-guard-test.js',
  'tests/library-integrity-test.js',
  'tests/listening-adaptive-test.js',
  'tests/listening-exam-test.js',
  'tests/m02542-experience-test.js',
  'tests/mastery-bkt-test.js',
  'tests/misconception-diagnosis-test.js',
  'tests/misconception-ledger-test.js',
  'tests/misconception-taxonomy-test.js',
  'tests/neural-cache-isolation-test.js',
  'tests/neural-voice-m02592-puter-subtitle-test.js',
  'tests/neural-voice-m02593-subtitle-translate-test.js',
  'tests/no-network-test.js',
  'tests/notification-reminder-test.js',
  'tests/observability-privacy-test.js',
  'tests/olm-test.js',
  'tests/onboarding-test.js',
  'tests/owner-dashboard-test.js',
  'tests/owner-edge-guard-test.js',
  'tests/p1-game-layer-smoke-test.js',
  'tests/pastel-field-contrast-test.js',
  'tests/paw-mascot-test.js',
  'tests/personal-journey-test.js',
  'tests/personal-journey-ui-test.js',
  'tests/placement-accuracy-test.js',
  'tests/policy-outcome-test.js',
  'tests/prasasti-test.js',
  'tests/prerender-dryrun-test.js',
  'tests/prerender-plan-test.js',
  'tests/prerequisite-graph-test.js',
  'product-audit.js',
  'tests/production-grader-test.js',
  'tests/prosody-test.js',
  'tests/puter-auth-coop-test.js',
  'tests/puter-auth-diagnostics-test.js',
  'tests/puter-popup-once-test.js',
  'tests/pwa-cache-test.js',
  'tests/pwa-release-coherence-test.js',
  'tests/pwa-startup-white-screen-recovery-test.js',
  'tests/quota-core-test.js',
  'tests/quota-manipulation-test.js',
  'tests/quota-notice-a11y-test.js',
  'tests/quota-reset-test.js',
  'tests/r2-ux-overhaul-smoke-test.js',
  'tests/reading-exam-test.js',
  'tests/regression-test.js',
  // release-audit.py SEBELUM tests/release-audit-gate-test.js — lihat catatan urutan di header.
  'release-audit.py',
  'tests/release-audit-gate-test.js',
  'tests/reminder-struggle-test.js',
  'tests/remote-push-test.js',
  'tests/rollout-plan-test.js',
  'tests/runtime-stage8-test.js',
  'tests/search-feedback-test.js',
  'tests/secret-scan-test.js',
  'tests/settings-cache-test.js',
  'tests/skills-dashboard-test.js',
  'tests/skills-evidence-test.js',
  'tests/speaking-adaptive-test.js',
  'tests/speaking-exam-test.js',
  'tests/speaking-listening-test.js',
  'tests/splash-choreography-test.js',
  'tests/splash-first-paint-test.js',
  'tests/srl-coach-test.js',
  'tests/staging-live-test.js',
  'tests/step-tutor-test.js',
  'tests/sw-corp-test.js',
  'tests/topbar-logo-contrast-test.js',
  'tests/tour-test.js',
  'tests/tours-test.js',
  'tests/tts-key-test.js',
  'tests/tts-provider-contract-test.js',
  'tests/tts-transport-switch-test.js',
  'tests/tutor-brain-v3-test.js',
  'tests/tutor-classroom-regression-test.js',
  'tests/tutor-reteach-card-test.js',
  'tests/ui-structure-test.js',
  'validator.js',
  'tests/voice-callsite-prefetch-test.js',
  'tests/voice-chunker-test.js',
  'tests/voice-fallback-chain-test.js',
  'tests/voice-offline-fallback-test.js',
  'tests/voice-pipeline-gap-test.js',
  'tests/voice-prefetch-neural-test.js',
  'tests/workflow-actor-gate-test.js',
  'tests/writing-rubric-test.js'
];

/* =======================================================================================
 * SUBSET --fast: gerbang lambat (>20 s pada sweep D1) DIKECUALIKAN; sisanya berjalan.
 * Durasi rujukan dari D1-gate-sweep.md supaya keputusan bisa diperiksa, bukan dipercaya.
 * ===================================================================================== */
const FAST_EXCLUDE = new Map([
  ['release-audit.py', '361 s (D1) — audit rilis penuh, jalankan di jalur penuh/CI'],
  ['tests/release-audit-gate-test.js', '~6 menit tanpa laporan segar — pembungkus release-audit.py'],
  ['tests/content-adoption-test.js', '159 s (D1)'],
  ['tests/fiezel-evolution-loop-test.js', '108 s (D1)'],
  ['tests/fiezel-self-refine-test.js', '43 s (D1)'],
  ['tests/content-adoption-rehearsal-test.js', '43 s (D1)'],
  ['tests/content-patch-gate-test.js', '32 s (D1)'],
  ['tests/voice-fallback-chain-test.js', '25 s (D1)']
]);

/* Batas waktu per gerbang. Bawaan 300 s (longgar terhadap 240 s sweep D1, yang sudah
 * cukup untuk semua gerbang cepat); yang terbukti lebih lambat diberi anggaran sendiri. */
const DEFAULT_TIMEOUT_MS = 300 * 1000;
const TIMEOUT_MS = new Map([
  ['release-audit.py', 1200 * 1000], // 361 s di D1 + ruang untuk mesin CI lambat
  ['tests/release-audit-gate-test.js', 1900 * 1000], // anggaran internalnya sendiri 30 menit
  ['tests/content-adoption-test.js', 600 * 1000],
  ['tests/fiezel-evolution-loop-test.js', 600 * 1000],
  ['content-integrity-audit.js', 600 * 1000],
  ['tests/content-promotion-test.js', 600 * 1000]
]);

function main(argv) {
  const args = argv.slice(2);
  const fast = args.includes('--fast');
  const unknown = args.filter(a => a !== '--fast');
  if (unknown.length) {
    console.error(`Argumen tidak dikenal: ${unknown.join(' ')}\nPakai: node tools/release-check.js [--fast]`);
    return 2;
  }

  const gates = fast ? GATES.filter(g => !FAST_EXCLUDE.has(g)) : GATES;
  const results = [];
  const startedAll = Date.now();

  console.log(`FIEZEL release-check — mode ${fast ? 'FAST (subset inti)' : 'PENUH'}: ${gates.length} gerbang`);
  if (fast) {
    console.log(`Dikecualikan di mode FAST (${FAST_EXCLUDE.size}): ${[...FAST_EXCLUDE.keys()].join(', ')}`);
    console.log('PERINGATAN: --fast bukan bukti kesiapan rilis; jalankan jalur penuh sebelum rilis.');
  }
  console.log('');

  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    const abs = path.join(ROOT, gate);
    const label = `[${String(i + 1).padStart(3)}/${gates.length}]`;

    if (!fs.existsSync(abs)) {
      results.push({ gate, status: 'FAIL', detail: 'berkas tidak ada', ms: 0 });
      console.log(`${label} FAIL ${gate} — berkas tidak ada`);
      continue;
    }

    const isPython = gate.endsWith('.py');
    const bin = isPython ? 'python3' : process.execPath;
    const env = { ...process.env };
    if (isPython) env.PYTHONIOENCODING = 'utf-8';
    // Pakai ulang laporan audit yang baru ditulis release-audit.py di run yang sama;
    // gerbangnya tetap memverifikasi sha256 app.js + version sebelum percaya.
    if (gate === 'tests/release-audit-gate-test.js') env.FIEZEL_RELEASE_AUDIT_REPORT_FRESH = '1';

    const t0 = Date.now();
    const run = cp.spawnSync(bin, [abs], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: TIMEOUT_MS.get(gate) || DEFAULT_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
      env
    });
    const ms = Date.now() - t0;

    let status = 'PASS';
    let detail = `exit=0, ${(ms / 1000).toFixed(1)} s`;
    if (run.error && run.error.code === 'ETIMEDOUT') {
      status = 'FAIL';
      detail = `TIMEOUT setelah ${(ms / 1000).toFixed(0)} s — habisnya waktu = GAGAL, bukan SKIP`;
    } else if (run.error) {
      status = 'FAIL';
      detail = `tidak bisa dijalankan: ${run.error.message}`;
    } else if (run.status !== 0) {
      status = 'FAIL';
      const tail = (String(run.stdout || '') + String(run.stderr || '')).trim().split('\n').slice(-3).join(' | ');
      detail = `exit=${run.status}${tail ? ' — ' + tail.slice(0, 400) : ''}`;
    }
    results.push({ gate, status, detail, ms });
    console.log(`${label} ${status} ${gate} (${(ms / 1000).toFixed(1)} s)${status === 'FAIL' ? ' — ' + detail : ''}`);
  }

  /* ------------------------------- REKAP ------------------------------- */
  const failsList = results.filter(r => r.status === 'FAIL');
  const totalS = Math.round((Date.now() - startedAll) / 1000);
  console.log('');
  console.log('================================ REKAP ================================');
  console.log(`Mode      : ${fast ? 'FAST (subset inti)' : 'PENUH'}`);
  console.log(`Gerbang   : ${results.length} dijalankan — PASS ${results.length - failsList.length}, FAIL ${failsList.length}`);
  console.log(`Durasi    : ${totalS} s`);
  if (failsList.length) {
    console.log('Gagal     :');
    for (const r of failsList) console.log(`  FAIL ${r.gate} — ${r.detail}`);
  }
  console.log(`HASIL     : ${failsList.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log('=======================================================================');
  return failsList.length === 0 ? 0 : 1;
}

process.exit(main(process.argv));
