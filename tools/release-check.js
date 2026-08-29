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
// Urutan sengaja: `release-audit.py` dijalankan SEBELUM `release-audit-gate-test.js`,
// lalu gerbang node itu diberi FIEZEL_RELEASE_AUDIT_REPORT_FRESH=1 supaya ia memakai ulang
// laporan yang baru ditulis (ia tetap memverifikasi sha256 app.js + version sendiri —
// lihat release-audit-gate-test.js §3). Tanpa ini audit ~6 menit berjalan dua kali.
//
// Nol dependency, nol jaringan. Gerbang live (cf-live-contract-test.js,
// staging-live-test.js) SKIP-by-design tanpa env live dan exit 0 — di sini itu dihitung
// lulus perintahnya, bukan bukti live (lihat gate-registry-test.js §6).
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');

/* =======================================================================================
 * DAFTAR GERBANG — sumber: tabel sweep D1 (169 baris), diurutkan alfabetis di sana.
 * ===================================================================================== */
const GATES = [
  'a11y-test.js',
  'academic-readiness-test.js',
  'adaptive-policy-test.js',
  'adaptivity-simulation-v3.js',
  'affect-test.js',
  'ai-integration-test.js',
  'ai-response-shape-test.js',
  'ai-task-contract-test.js',
  'ai-transport-switch-test.js',
  'alrs-behavior-test.js',
  'analytics-aggregate-test.js',
  'analytics-client-test.js',
  'analytics-privacy-test.js',
  'analytics-server-only-test.js',
  'app-report-control-path-test.js',
  'audio-asset-pipeline-test.js',
  'back-nav-test.js',
  'backup-ui-test.js',
  'bank-soal-audit-test.js',
  'boot-order-test.js',
  'breaker-test.js',
  'cf-api-contract-test.js',
  'cf-client-timeout-test.js',
  'cf-config-killswitch-test.js',
  'cf-live-contract-test.js',
  'cf-live-selftest.js',
  'cf-shadow-ledger-test.js',
  'cf-shadow-mode-test.js',
  'cf-transport-test.js',
  'cf-wiring-test.js',
  'classroom-test.js',
  'cloze-bank-test.js',
  'config-consistency-test.js',
  'confusion-matrix-test.js',
  'content-adoption-evidence-test.js',
  'content-adoption-receipt-test.js',
  'content-adoption-rehearsal-test.js',
  'content-adoption-test.js',
  'content-audit.js',
  'content-canary-test.js',
  'content-evidence-origin-test.js',
  'content-integrity-audit.js',
  'content-integrity-gate-test.js',
  'content-patch-gate-test.js',
  'content-promotion-test.js',
  'content-qa-agent-test.js',
  'continuity-test.js',
  'contrast-test.js',
  'core-brain-test.js',
  'core-brain-v2-test.js',
  'core-brain-v3-upgrade-test.js',
  'core-worker-contract-test.js',
  'cron-contract-test.js',
  'd1-schema-contract-test.js',
  'diag-panel-test.js',
  'diag-search-test.js',
  'diagnostic-scanner-test.js',
  'e2e-level-grammar-test.js',
  'edge-guard-test.js',
  'edge-proxy-contract-test.js',
  'edge-proxy-hopbyhop-test.js',
  'evidence-credibility-test.js',
  'experience-integration-test.js',
  'fiezel-autonomy-config-test.js',
  'fiezel-evolution-ledger-test.js',
  'fiezel-evolution-loop-test.js',
  'fiezel-meta-learning-test.js',
  'fiezel-prompt-library-test.js',
  'fiezel-self-refine-test.js',
  'gate-registry-test.js',
  'gems-test.js',
  'grammar-curriculum-test.js',
  'grammar-memory-scope-test.js',
  'grammar-quality-audit.js',
  'grammar-unlock-test.js',
  'health-probe-test.js',
  'http-smoke-test.js',
  'install-health-test.js',
  'item-calibration-test.js',
  'item-prior-test.js',
  'learner-evidence-test.js',
  'lesson-experience-test.js',
  'level-evidence-test.js',
  'level-grammar-contract-test.js',
  'level-guard-test.js',
  'library-integrity-test.js',
  'listening-adaptive-test.js',
  'listening-exam-test.js',
  'm02542-experience-test.js',
  'mastery-bkt-test.js',
  'misconception-diagnosis-test.js',
  'misconception-ledger-test.js',
  'misconception-taxonomy-test.js',
  'neural-cache-isolation-test.js',
  'neural-voice-m02592-puter-subtitle-test.js',
  'neural-voice-m02593-subtitle-translate-test.js',
  'no-network-test.js',
  'notification-reminder-test.js',
  'observability-privacy-test.js',
  'olm-test.js',
  'onboarding-test.js',
  'owner-dashboard-test.js',
  'owner-edge-guard-test.js',
  'p1-game-layer-smoke-test.js',
  'pastel-field-contrast-test.js',
  'paw-mascot-test.js',
  'personal-journey-test.js',
  'personal-journey-ui-test.js',
  'placement-accuracy-test.js',
  'policy-outcome-test.js',
  'prasasti-test.js',
  'prerender-dryrun-test.js',
  'prerender-plan-test.js',
  'prerequisite-graph-test.js',
  'product-audit.js',
  'production-grader-test.js',
  'prosody-test.js',
  'puter-auth-coop-test.js',
  'puter-auth-diagnostics-test.js',
  'puter-popup-once-test.js',
  'pwa-cache-test.js',
  'pwa-release-coherence-test.js',
  'pwa-startup-white-screen-recovery-test.js',
  'quota-core-test.js',
  'quota-manipulation-test.js',
  'quota-notice-a11y-test.js',
  'quota-reset-test.js',
  'r2-ux-overhaul-smoke-test.js',
  'reading-exam-test.js',
  'regression-test.js',
  // release-audit.py SEBELUM release-audit-gate-test.js — lihat catatan urutan di header.
  'release-audit.py',
  'release-audit-gate-test.js',
  'reminder-struggle-test.js',
  'remote-push-test.js',
  'rollout-plan-test.js',
  'runtime-stage8-test.js',
  'search-feedback-test.js',
  'secret-scan-test.js',
  'settings-cache-test.js',
  'skills-dashboard-test.js',
  'skills-evidence-test.js',
  'speaking-adaptive-test.js',
  'speaking-exam-test.js',
  'speaking-listening-test.js',
  'splash-choreography-test.js',
  'splash-first-paint-test.js',
  'srl-coach-test.js',
  'staging-live-test.js',
  'step-tutor-test.js',
  'sw-corp-test.js',
  'topbar-logo-contrast-test.js',
  'tour-test.js',
  'tours-test.js',
  'tts-key-test.js',
  'tts-provider-contract-test.js',
  'tts-transport-switch-test.js',
  'tutor-brain-v3-test.js',
  'tutor-classroom-regression-test.js',
  'tutor-reteach-card-test.js',
  'ui-structure-test.js',
  'validator.js',
  'voice-callsite-prefetch-test.js',
  'voice-chunker-test.js',
  'voice-fallback-chain-test.js',
  'voice-offline-fallback-test.js',
  'voice-pipeline-gap-test.js',
  'voice-prefetch-neural-test.js',
  'workflow-actor-gate-test.js',
  'writing-rubric-test.js'
];

/* =======================================================================================
 * SUBSET --fast: gerbang lambat (>20 s pada sweep D1) DIKECUALIKAN; sisanya berjalan.
 * Durasi rujukan dari D1-gate-sweep.md supaya keputusan bisa diperiksa, bukan dipercaya.
 * ===================================================================================== */
const FAST_EXCLUDE = new Map([
  ['release-audit.py', '361 s (D1) — audit rilis penuh, jalankan di jalur penuh/CI'],
  ['release-audit-gate-test.js', '~6 menit tanpa laporan segar — pembungkus release-audit.py'],
  ['content-adoption-test.js', '159 s (D1)'],
  ['fiezel-evolution-loop-test.js', '108 s (D1)'],
  ['fiezel-self-refine-test.js', '43 s (D1)'],
  ['content-adoption-rehearsal-test.js', '43 s (D1)'],
  ['content-patch-gate-test.js', '32 s (D1)'],
  ['voice-fallback-chain-test.js', '25 s (D1)']
]);

/* Batas waktu per gerbang. Bawaan 300 s (longgar terhadap 240 s sweep D1, yang sudah
 * cukup untuk semua gerbang cepat); yang terbukti lebih lambat diberi anggaran sendiri. */
const DEFAULT_TIMEOUT_MS = 300 * 1000;
const TIMEOUT_MS = new Map([
  ['release-audit.py', 1200 * 1000], // 361 s di D1 + ruang untuk mesin CI lambat
  ['release-audit-gate-test.js', 1900 * 1000], // anggaran internalnya sendiri 30 menit
  ['content-adoption-test.js', 600 * 1000],
  ['fiezel-evolution-loop-test.js', 600 * 1000],
  ['content-integrity-audit.js', 600 * 1000],
  ['content-promotion-test.js', 600 * 1000]
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
    if (gate === 'release-audit-gate-test.js') env.FIEZEL_RELEASE_AUDIT_REPORT_FRESH = '1';

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
