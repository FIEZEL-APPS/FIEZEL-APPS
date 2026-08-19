#!/usr/bin/env node

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2] || '';
const args = Object.fromEntries(process.argv.slice(3).map((arg) => {
  const i = arg.indexOf('=');
  return i === -1 ? [arg.replace(/^--/, ''), 'true'] : [arg.slice(2, i), arg.slice(i + 1)];
}));

const state = { errors: [], warnings: [], notes: [] };
const error = (m) => state.errors.push(m);
const warn = (m) => state.warnings.push(m);
const note = (m) => state.notes.push(m);

function sh(command, commandArgs = [], opts = {}) {
  const r = spawnSync(command, commandArgs, { encoding: 'utf8', ...opts });
  if (opts.allowFailure) return r;
  if (r.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed (${r.status}): ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function changedFiles() {
  const base = env('BASE_SHA');
  if (!base) throw new Error('BASE_SHA is required');
  return sh('git', ['diff', '--name-only', `${base}...HEAD`]).split('\n').filter(Boolean);
}

function addedDiff() {
  const base = env('BASE_SHA');
  return sh('git', ['diff', '--unified=0', `${base}...HEAD`]);
}

function fileText(path, ref = 'HEAD') {
  const r = sh('git', ['show', `${ref}:${path}`], { allowFailure: true });
  return r.status === 0 ? r.stdout : '';
}

function parseDiag(text) {
  const m = text.match(/DIAG_BUILD\s*=\s*['"]m025-(\d+)['"]/);
  return m ? Number(m[1]) : null;
}

function parseSw(text) {
  const m = text.match(/SW_REV\s*=\s*['"]m025-(\d+)-/);
  return m ? Number(m[1]) : null;
}

function isProductFile(path) {
  return /^(index\.html|style\.css|app\.js|sw\.js|version\.js|manifest\.json|core-config\.js|report-config\.js|content-.*\.js|features\/)/.test(path);
}

function isVoiceSensitive(path) {
  return /^(features\/(neural-voice|tutor-classroom)\/|neural-voice-|speaking-listening-|sw\.js$|app\.js$)/.test(path);
}

function report(title, classification = '') {
  console.log(`# ${title}`);
  if (classification) console.log(`classification: ${classification}`);
  for (const m of state.notes) console.log(`NOTE: ${m}`);
  for (const m of state.warnings) console.log(`WARN: ${m}`);
  for (const m of state.errors) console.log(`ERROR: ${m}`);
  console.log(`summary: errors=${state.errors.length} warnings=${state.warnings.length} notes=${state.notes.length}`);
  if (state.errors.length) process.exitCode = 1;
}

function selfTest() {
  const secretSamples = [
    '+const key="' + 'gh' + 'p_' + 'abcdefghijklmnopqrstuvwxyz1234567890' + '";',
    '+-----BEGIN ' + 'PRIVATE KEY-----',
  ];
  const patterns = secretPatterns();
  if (!secretSamples.every((s) => patterns.some((p) => p.test(s)))) throw new Error('secret pattern self-test failed');
  if (parseDiag("var DIAG_BUILD = 'm025-49';") !== 49) throw new Error('DIAG parser self-test failed');
  if (parseSw("const SW_REV='m025-49-test';") !== 49) throw new Error('SW parser self-test failed');
  console.log('FIEZEL guardian self-test PASS');
}

function secretPatterns() {
  return [
    /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
    /\bghp_[A-Za-z0-9]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
  ];
}

function runA9() {
  const files = changedFiles();
  const diff = addedDiff();
  sh('git', ['diff', '--check', `${env('BASE_SHA')}...HEAD`]);

  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  for (const line of added) {
    for (const pattern of secretPatterns()) {
      if (pattern.test(line)) error(`possible committed secret detected: ${pattern}`);
    }
  }

  for (const path of files.filter((p) => p.startsWith('.github/workflows/'))) {
    const text = fileText(path);
    if (/\bpull_request_target\s*:/.test(text)) error(`${path}: pull_request_target is forbidden without a dedicated OWNER security review`);
    if (/permissions\s*:\s*write-all/.test(text)) error(`${path}: permissions: write-all is forbidden`);
    if (/persist-credentials\s*:\s*true/.test(text)) warn(`${path}: checkout persists credentials; verify this is necessary`);
  }

  if (files.some((p) => /puter|auth|sw\.js|workflow/.test(p))) note('auth/SW/workflow-sensitive change detected; existing auth and CORP regressions should run in CI');
  note(`inspected ${files.length} changed files and added-line secret signatures`);
  report('A9 Security Sentinel', state.errors.length ? 'BLOCK' : 'PASS');
}

function runA10() {
  const files = changedFiles();
  sh('git', ['diff', '--check', `${env('BASE_SHA')}...HEAD`]);
  const sensitive = files.filter(isVoiceSensitive);
  const tests = files.filter((p) => /(^|\/)(.*test.*\.(?:js|mjs)|.*\.spec\.(?:js|mjs))$/.test(p) || p.startsWith('.github/workflows/'));

  if (sensitive.length && tests.length === 0) warn(`sensitive runtime changed without a companion test/workflow diff: ${sensitive.join(', ')}`);

  const diff = addedDiff();
  const deletedAssertions = diff.split('\n').filter((l) => /^-(?!-)/.test(l) && /(assert|jq -e|grep -F|throw new Error)/.test(l)).length;
  const addedAssertions = diff.split('\n').filter((l) => /^\+(?!\+)/.test(l) && /(assert|jq -e|grep -F|throw new Error)/.test(l)).length;
  if (deletedAssertions > addedAssertions + 5) warn(`assertion surface shrank materially (removed=${deletedAssertions}, added=${addedAssertions}); MASTER should confirm property changes are intentional`);

  note(`sensitive_files=${sensitive.length}; companion_test_or_workflow_files=${tests.length}`);
  report('A10 Regression Watcher', 'PASS_WITH_RISK_REPORT');
}

function runA11() {
  const files = changedFiles();
  sh('git', ['fetch', 'origin', 'main', '--no-tags']);
  const fresh = sh('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { allowFailure: true });
  if (fresh.status !== 0) error('candidate does not contain current origin/main');

  const mergeTree = sh('git', ['merge-tree', '--write-tree', 'origin/main', 'HEAD'], { allowFailure: true });
  if (mergeTree.status !== 0 || !mergeTree.stdout.trim()) error('candidate does not produce a clean merge-tree against current main');

  if (files.some(isProductFile)) {
    const baseDiag = parseDiag(fileText('features/neural-voice/fiezel-diag-panel.js', env('BASE_SHA')));
    const headDiag = parseDiag(fileText('features/neural-voice/fiezel-diag-panel.js'));
    const headSw = parseSw(fileText('sw.js'));
    if (baseDiag == null || headDiag == null || headSw == null) error('unable to parse DIAG_BUILD/SW_REV release boundary');
    else {
      if (headDiag !== baseDiag + 1) error(`product release must advance DIAG_BUILD exactly +1 (base=${baseDiag}, head=${headDiag})`);
      if (headSw !== headDiag) error(`SW_REV build (${headSw}) must match DIAG_BUILD (${headDiag})`);
    }
  } else {
    note('governance-only change; product build increment is not required');
  }

  report('A11 Release Readiness Auditor', state.errors.length ? 'BLOCK' : 'MACHINE_BOUNDARY_OK');
}

function runA12() {
  const files = changedFiles();
  const body = env('PR_BODY');
  const draft = env('PR_DRAFT', 'false') === 'true';
  const requiresPhysical = files.some((p) => /features\/(neural-voice|tutor-classroom)|neural-voice-|m025.*safari|audio|voice/i.test(p));
  const accepted = /<!--\s*FIEZEL_PHYSICAL_ACCEPTANCE:\s*(ACCEPTED|WAIVED_BY_OWNER)\s*-->/i.test(body);
  const ownerRelease = /<!--\s*FIEZEL_OWNER_RELEASE:\s*AUTHORIZED\s*-->/i.test(body);

  if (!requiresPhysical) {
    note('no voice/audio/classroom change requiring physical acceptance was detected');
    report('A12 Evidence Gatekeeper', 'NOT_REQUIRED');
    return;
  }

  if (accepted) note('machine-readable physical acceptance/OWNER waiver marker found');
  else if (draft) warn('physical evidence is still pending, but PR is draft; release remains on hold');
  else error('release-sensitive PR is not draft and lacks <!-- FIEZEL_PHYSICAL_ACCEPTANCE: ACCEPTED --> or WAIVED_BY_OWNER');

  if (!ownerRelease) warn('OWNER release authorization marker is absent; A12 never grants merge/deploy authority itself');
  report('A12 Evidence Gatekeeper', accepted ? 'EVIDENCE_RECORDED' : draft ? 'HOLD_DRAFT' : 'BLOCK');
}

function runA13() {
  const files = changedFiles();
  const major = files.some((p) => /features\/(neural-voice|tutor-classroom)\//.test(p));
  const handoffs = files.filter((p) => /HANDOFF\.md$/i.test(p));
  const bodyMentionsHandoff = /handoff/i.test(env('PR_BODY'));

  if (major && handoffs.length === 0 && !bodyMentionsHandoff) error('major neural/classroom change has no changed handoff file and PR body does not identify a handoff');
  if (handoffs.length) {
    for (const path of handoffs) {
      const text = fileText(path);
      if (!/OWNER|MASTER/i.test(text)) warn(`${path}: OWNER/MASTER authority is not explicit`);
      if (!/status/i.test(text)) warn(`${path}: status field/section not found`);
      if (!/(next|lanjut|berikut|roadmap)/i.test(text)) warn(`${path}: next-step/roadmap language not found`);
    }
  }
  if (!major) note('no major neural/classroom implementation change; handoff requirement is advisory');
  note(`handoff_files_changed=${handoffs.length}`);
  report('A13 Handoff Keeper', state.errors.length ? 'BLOCK' : 'PASS');
}

function runA8() {
  const logPath = args.log || '/tmp/failed.log';
  const workflow = args.workflow || env('FAILED_WORKFLOW', 'unknown workflow');
  const runUrl = args.url || env('FAILED_RUN_URL', '');
  const text = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
  const signatures = [
    ['branch freshness / merge boundary', /(does not contain current main|merge-base|merge-tree|behind)/i],
    ['release marker coherence', /(DIAG_BUILD|SW_REV|release boundary|pwa-release-coherence)/i],
    ['assertion / regression', /(AssertionError|assertion|expected .* actual|jq: error|FAIL:)/i],
    ['timeout / latency', /(timeout|timed out|latency|RTF)/i],
    ['Puter/auth', /(puter|auth|signed.?in|coop|coep)/i],
    ['service worker/cache', /(service worker|sw\.js|cache|corp)/i],
    ['dependency/setup', /(npm ERR|module not found|ENOENT|setup-node|setup-python)/i],
  ].filter(([, re]) => re.test(text)).map(([name]) => name);

  console.log('<!-- FIEZEL_A8_CI_FAILURE_ANALYST -->');
  console.log('## A8 CI Failure Analyst');
  console.log(`Workflow: **${workflow}**`);
  if (runUrl) console.log(`Run: ${runUrl}`);
  console.log(`Likely failure domains: ${signatures.length ? signatures.join(', ') : 'unclassified — inspect failed-step excerpt below'}`);
  console.log('');
  console.log('This report is deterministic triage, not an AI-generated root-cause claim. MASTER/repair agent should confirm the first causal error before patching.');
  console.log('');
  const lines = text.split('\n').filter(Boolean);
  const interesting = lines.filter((l) => /(error|fail|assert|timeout|expected|actual|fatal|not found|denied)/i.test(l)).slice(-25);
  if (interesting.length) {
    console.log('<details><summary>Failed-log signal excerpt</summary>');
    console.log('');
    console.log('```text');
    for (const l of interesting) console.log(l.slice(0, 500));
    console.log('```');
    console.log('</details>');
  }
}

if (mode === '--self-test' || mode === 'self-test') selfTest();
else if (mode === 'a8') runA8();
else if (mode === 'a9') runA9();
else if (mode === 'a10') runA10();
else if (mode === 'a11') runA11();
else if (mode === 'a12') runA12();
else if (mode === 'a13') runA13();
else {
  console.error('Usage: node tools/fiezel-guardians.mjs <self-test|a8|a9|a10|a11|a12|a13>');
  process.exit(2);
}
