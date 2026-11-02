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

// maxBuffer bawaan spawnSync adalah 1 MB. Diff yang lebih besar dari itu membuat anak
// prosesnya dibunuh, status menjadi null, dan gerbang melaporkannya sebagai "git diff
// failed" - yaitu KEGAGALAN ALAT yang terbaca seperti temuan keamanan. Satu perubahan
// konten besar (bank soal, dataset) cukup untuk memblokir A9 dan A10 selamanya tanpa ada
// yang salah di perubahannya. 64 MB memberi ruang untuk diff sebesar apa pun yang wajar.
const SH_MAX_BUFFER = 64 * 1024 * 1024;

function sh(command, commandArgs = [], opts = {}) {
  const r = spawnSync(command, commandArgs, { encoding: 'utf8', maxBuffer: SH_MAX_BUFFER, ...opts });
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
  if (env('FIEZEL_GUARD_FILES')) {
    return env('FIEZEL_GUARD_FILES').split('\n').map((s) => s.trim()).filter(Boolean);
  }
  const base = env('BASE_SHA');
  if (!base) throw new Error('BASE_SHA is required');
  return sh('git', ['diff', '--name-only', `${base}...HEAD`]).split('\n').filter(Boolean);
}

function addedDiff() {
  if (env('FIEZEL_GUARD_DIFF_FILE')) {
    return fs.readFileSync(env('FIEZEL_GUARD_DIFF_FILE'), 'utf8');
  }
  if (env('FIEZEL_GUARD_DIFF')) {
    return env('FIEZEL_GUARD_DIFF');
  }
  const base = env('BASE_SHA');
  return sh('git', ['diff', '--unified=0', `${base}...HEAD`]);
}

function commitSubjects() {
  if (env('FIEZEL_GUARD_COMMITS') || env('FIEZEL_GUARD_FILES')) {
    return env('FIEZEL_GUARD_COMMITS');
  }
  const base = env('BASE_SHA');
  if (!base) return '';
  const r = sh('git', ['log', '--format=%s', `${base}..HEAD`], { allowFailure: true });
  return r.status === 0 ? r.stdout : '';
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

/**
 * Memecah output `git diff --unified=0` menjadi peta per-berkas:
 *   path -> { hunks: string[], added: string[], removed: string[] }
 */
function parseDiffByFile(diffText) {
  const map = new Map();
  let current = null;
  for (const rawLine of String(diffText || '').split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const mPlus = line.match(/^\+\+\+\s+b\/(.+)$/);
    if (mPlus) {
      const p = mPlus[1].trim();
      if (!map.has(p)) map.set(p, { hunks: [], added: [], removed: [] });
      current = map.get(p);
      continue;
    }
    if (line.startsWith('diff --git ') || line.startsWith('--- ')) continue;
    if (!current) continue;
    if (line.startsWith('@@')) current.hunks.push(line);
    else if (line.startsWith('+')) current.added.push(line.slice(1));
    else if (line.startsWith('-')) current.removed.push(line.slice(1));
  }
  return map;
}

/**
 * Ekstraksi cakupan (scope) yang dideklarasikan secara EKSPLISIT:
 * 1) Header conventional commit `tipe(scope1-scope2): ...` pada PR_TITLE dan judul commit.
 * 2) Token izin eksplisit `[ALLOW-PROTECTED: auth, pwa, ci, onboarding, all]` pada PR_TITLE / PR_BODY / commit.
 * Sengaja TIDAK mencocokkan kata bebas di badan PR agar teks boilerplate tidak memberi izin palsu.
 */
function extractDeclaredScopes(prTitle, prBody, commitsText) {
  const scopes = new Set();
  const headers = [String(prTitle || ''), ...String(commitsText || '').split('\n')]
    .map((s) => s.trim())
    .filter(Boolean);

  for (const h of headers) {
    const m = h.match(/^[a-z]+\(([^)]+)\)!?:/i);
    if (m) {
      for (const tok of m[1].toLowerCase().split(/[-/,+&\s_]+/).filter(Boolean)) {
        scopes.add(tok);
      }
    }
  }

  const combined = [prTitle, prBody, commitsText].map((s) => String(s || '')).join('\n');
  for (const m of combined.matchAll(/\[ALLOW-PROTECTED:\s*([^\]]+)\]/gi)) {
    for (const tok of m[1].toLowerCase().split(/[,/\s+|]+/).filter(Boolean)) {
      scopes.add(tok);
    }
  }
  if (/\[ALLOW-MASS-DELETE\]/i.test(combined)) {
    scopes.add('allow_mass_delete');
  }
  return scopes;
}

function hasAnyScope(declared, allowedList) {
  if (declared.has('all') || declared.has('*')) return true;
  return allowedList.some((s) => declared.has(s));
}

function isSwDiffOnlyBumpOrAssets(entry) {
  if (!entry) return false;
  const changed = [...entry.added, ...entry.removed].map((s) => s.trim()).filter(Boolean);
  if (changed.length === 0) return true;
  return changed.every((line) => (
    /^const\s+SW_REV\s*=/.test(line) ||
    /^['"]\.\/[^'"]+['"]\s*,?$/.test(line) ||
    /^\/\*/.test(line) ||
    /^\/\//.test(line)
  ));
}

function isQualityYmlAdditiveTestRegistration(entry) {
  if (!entry) return false;
  const removedGates = entry.removed.filter((l) => /\bnode\s+(?:tests\/|[A-Za-z0-9_./-]+(?:test|audit|selftest|simulation))/.test(l));
  if (removedGates.length > 0) return false;
  const allChanged = [...entry.added, ...entry.removed].map((s) => s.trim()).filter(Boolean);
  if (allChanged.length === 0) return true;
  return allChanged.every((line) => (
    /^#/.test(line) ||
    /^-\s*name:/.test(line) ||
    /^run:\s*\|?$/.test(line) ||
    /^(?:run:\s*)?node\s+tests\/[A-Za-z0-9_.-]+\.(?:js|mjs)$/.test(line)
  ));
}

/**
 * A10 Cross-Domain Collateral Damage Guard:
 * Menolak PR yang diam-diam menyentuh permukaan kritis (Auth/Boot, Onboarding,
 * PWA Standalone/Landing, CI Workflows/Guardians) di luar cakupan tugasnya.
 */
function auditCollateralScope(files, diffText) {
  const declared = extractDeclaredScopes(env('PR_TITLE'), env('PR_BODY'), commitSubjects());
  const byFile = parseDiffByFile(diffText);
  const violations = [];

  // 1. Auth & Boot Gate Protection
  const authScopes = ['auth', 'login', 'boot', 'security', 'account', 'session', 'stabilize', 'guardrails', 'guardrail'];
  const authFiles = files.filter((p) => /^features\/auth\//.test(p));
  const appEntry = byFile.get('app.js');
  const authFnRe = /\b(isLocalTestServer|authGateNeeded|showAuthGate|bootAuthVerdict|primeBootAuthVerdict|followUpAuthCheck|forgetLocalAuth|verifyAuthSession)\b/;
  const appTouchesAuth = appEntry
    ? [...appEntry.hunks, ...appEntry.added, ...appEntry.removed].some((l) => authFnRe.test(l))
    : false;

  if ((authFiles.length > 0 || appTouchesAuth) && !hasAnyScope(declared, authScopes)) {
    const touched = [...authFiles, ...(appTouchesAuth ? ['app.js (auth/boot gate functions)'] : [])].join(', ');
    violations.push(
      `COLLATERAL_AUTH_TOUCH: PR menyentuh permukaan kritis Auth/Boot [${touched}] padahal scope PR (${[...declared].join(',') || 'none'}) bukan auth/boot. ` +
      'Dilarang mengubah kode login/boot saat mengerjakan fitur lain (gunakan ?fz_real_auth=1 untuk uji auth lokal, atau tambahkan [ALLOW-PROTECTED: auth] bila memang diminta).'
    );
  }

  // 2. Onboarding Gate Protection
  const obScopes = ['onboarding', 'onboard', 'welcome', 'auth', 'boot', 'stabilize', 'guardrails', 'guardrail'];
  const obFiles = files.filter((p) => /^features\/onboarding\//.test(p));
  const obFnRe = /\b(showOnboarding|askLearnerNameIfMissing)\b/;
  const appTouchesOb = appEntry
    ? [...appEntry.hunks, ...appEntry.added, ...appEntry.removed].some((l) => obFnRe.test(l))
    : false;

  if ((obFiles.length > 0 || appTouchesOb) && !hasAnyScope(declared, obScopes)) {
    const touched = [...obFiles, ...(appTouchesOb ? ['app.js (showOnboarding/askLearnerNameIfMissing)'] : [])].join(', ');
    violations.push(
      `COLLATERAL_ONBOARDING_TOUCH: PR menyentuh permukaan kritis Onboarding [${touched}] di luar scope (${[...declared].join(',') || 'none'}). ` +
      'Tambahkan scope onboarding atau [ALLOW-PROTECTED: onboarding] bila memang diminta.'
    );
  }

  // 3. PWA Standalone, Manifest, Service Worker Logic, & Landing Surface Protection
  const pwaScopes = ['pwa', 'manifest', 'sw', 'cache', 'offline', 'website', 'landing', 'seo', 'install', 'stabilize', 'guardrails', 'guardrail'];
  const pwaDirectFiles = files.filter((p) => p === 'manifest.json' || /^website\//.test(p));
  const swTouchedLogic = files.includes('sw.js') && !isSwDiffOnlyBumpOrAssets(byFile.get('sw.js'));

  if ((pwaDirectFiles.length > 0 || swTouchedLogic) && !hasAnyScope(declared, pwaScopes)) {
    const touched = [...pwaDirectFiles, ...(swTouchedLogic ? ['sw.js (runtime logic beyond SW_REV/ASSETS)'] : [])].join(', ');
    violations.push(
      `COLLATERAL_PWA_TOUCH: PR menyentuh permukaan PWA Standalone / Landing [${touched}] di luar scope (${[...declared].join(',') || 'none'}). ` +
      'Tambahkan scope pwa/website atau [ALLOW-PROTECTED: pwa] bila memang diminta.'
    );
  }

  // 4. CI Workflows & Release Governance Protection
  const ciScopes = ['ci', 'workflow', 'workflows', 'gate', 'gates', 'guardian', 'guardians', 'governance', 'bot', 'stabilize', 'guardrails', 'guardrail'];
  const ciFiles = files.filter((p) => {
    if (p === '.github/workflows/quality.yml') {
      return !isQualityYmlAdditiveTestRegistration(byFile.get(p));
    }
    return /^\.github\/workflows\//.test(p) || p === 'tools/fiezel-guardians.mjs' || p === 'tools/bump-build.mjs' || p === 'release-audit.py';
  });

  if (ciFiles.length > 0 && !hasAnyScope(declared, ciScopes)) {
    violations.push(
      `COLLATERAL_CI_GOVERNANCE_TOUCH: PR memodifikasi penjaga CI/rilis [${ciFiles.join(', ')}] di luar scope (${[...declared].join(',') || 'none'}). ` +
      'Mendaftarkan tes baru di quality.yml diizinkan, namun menghapus gerbang atau mengubah workflow wajib ber-scope ci atau [ALLOW-PROTECTED: ci].'
    );
  }

  // 5. Mass Runtime Deletion Guard (> 500 baris dihapus pada runtime inti tanpa deklarasi)
  let runtimeDeletedLines = 0;
  for (const [f, entry] of byFile.entries()) {
    if (/^(app\.js|style\.css|fiezel-2\.css|index\.html|features\/)/.test(f)) {
      runtimeDeletedLines += entry.removed.length;
    }
  }
  const massDeleteScopes = ['refactor', 'cleanup', 'remove', 'deprecate', 'allow_mass_delete', 'stabilize'];
  if (runtimeDeletedLines > 500 && !hasAnyScope(declared, massDeleteScopes)) {
    violations.push(
      `MASS_RUNTIME_DELETION: PR menghapus ${runtimeDeletedLines} baris pada berkas runtime inti tanpa scope refactor/cleanup atau token [ALLOW-MASS-DELETE].`
    );
  }

  // 6. Tri-Core Invariants Protection (Owner Wire, Zero-Stale-Shell, Auth CSP Superset)
  // Mandat OWNER (m025-752): Tiga masalah krusial ini DILARANG KERAS terulang kembali:
  // (a) Auth CSP Superset (Login Google & API Registrasi bebas blokir)
  if (files.includes('website/.htaccess')) {
    const ht = fileText('website/.htaccess');
    if (!/script-src[^;]*accounts\.google\.com/.test(ht) || !/connect-src[^;]*(https:|api\.fiezel\.my\.id)/.test(ht)) {
      violations.push('TRI_CORE_AUTH_CSP_BROKEN: website/.htaccess membuang accounts.google.com atau connect-src https: (mematikan login Google & registrasi). Dilarang merusak CSP superset.');
    }
  }
  // (b) Zero-Stale-Shell & Offline Vault (PWA anti-tersangkut saat update)
  if (files.includes('sw.js')) {
    const sw = fileText('sw.js');
    if (!/\bisUpdateNav\b/.test(sw) || !/\bfz_upd\b/.test(sw)) {
      violations.push('TRI_CORE_SHELL_COHERENCE_BROKEN: sw.js membuang logika isUpdateNav / fz_upd (membuat shell PWA murid tersangkut di versi lama). Dilarang menghapus navigasi update.');
    }
  }
  if (files.includes('features/security/fiezel-offline-vault.js')) {
    const vt = fileText('features/security/fiezel-offline-vault.js');
    if (!/\bpurgeStaleBuilds\b/.test(vt)) {
      violations.push('TRI_CORE_VAULT_EVICTION_BROKEN: fiezel-offline-vault.js membuang purgeStaleBuilds (membuat bank offline tersangkut di build lama).');
    }
  }
  // (c) Owner Dashboard <-> Learner Wire (Kirim permata & pesan ke sub/email Google)
  if (files.includes('workers/api/route-gem-grant.js') || files.includes('workers/api/route-learner-messages.js')) {
    const rg = fileText('workers/api/route-gem-grant.js');
    const rm = fileText('workers/api/route-learner-messages.js');
    if (!/SELECT sub FROM auth_email/.test(rg) || !/SELECT sub FROM auth_email/.test(rm)) {
      violations.push('TRI_CORE_OWNER_WIRE_BROKEN: API owner membuang resolusi sub dari auth_email (memutus kirim permata/pesan ke email Google murid).');
    }
  }

  return { declared: [...declared], violations, runtimeDeletedLines };
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

  const sampleScopes = extractDeclaredScopes('fix(grammar-quiz): polish hint', 'body with auth word', '');
  if (!sampleScopes.has('grammar') || sampleScopes.has('auth')) {
    throw new Error('scope extractor self-test failed: prose must not grant auth scope');
  }
  const overrideScopes = extractDeclaredScopes('fix(grammar): touch gate', '[ALLOW-PROTECTED: auth]', '');
  if (!overrideScopes.has('auth')) {
    throw new Error('scope extractor self-test failed: ALLOW-PROTECTED token must grant scope');
  }
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
  if (!env('FIEZEL_GUARD_FILES')) {
    sh('git', ['diff', '--check', `${env('BASE_SHA')}...HEAD`]);
  }

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
  if (!env('FIEZEL_GUARD_FILES')) {
    sh('git', ['diff', '--check', `${env('BASE_SHA')}...HEAD`]);
  }
  const sensitive = files.filter(isVoiceSensitive);
  const tests = files.filter((p) => /(^|\/)(.*test.*\.(?:js|mjs)|.*\.spec\.(?:js|mjs))$/.test(p) || p.startsWith('.github/workflows/'));

  if (sensitive.length && tests.length === 0) warn(`sensitive runtime changed without a companion test/workflow diff: ${sensitive.join(', ')}`);

  const diff = addedDiff();
  const deletedAssertions = diff.split('\n').filter((l) => /^-(?!-)/.test(l) && /(assert|jq -e|grep -F|throw new Error)/.test(l)).length;
  const addedAssertions = diff.split('\n').filter((l) => /^\+(?!\+)/.test(l) && /(assert|jq -e|grep -F|throw new Error)/.test(l)).length;
  if (deletedAssertions > addedAssertions + 5) warn(`assertion surface shrank materially (removed=${deletedAssertions}, added=${addedAssertions}); MASTER should confirm property changes are intentional`);

  const scopeAudit = auditCollateralScope(files, diff);
  note(`declared_scopes=${scopeAudit.declared.join(',') || 'none'}; runtime_deleted_lines=${scopeAudit.runtimeDeletedLines}`);
  for (const v of scopeAudit.violations) {
    error(v);
  }

  note(`sensitive_files=${sensitive.length}; companion_test_or_workflow_files=${tests.length}`);
  report('A10 Regression Watcher', state.errors.length ? 'BLOCK' : 'PASS_WITH_RISK_REPORT');
}

function runA11() {
  const files = changedFiles();
  sh('git', ['fetch', 'origin', 'main', '--no-tags']);
  const fresh = sh('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { allowFailure: true });
  if (fresh.status !== 0) error('candidate does not contain current origin/main');

  const mergeTree = sh('git', ['merge-tree', '--write-tree', 'origin/main', 'HEAD'], { allowFailure: true });
  if (mergeTree.status !== 0 || !mergeTree.stdout.trim()) error('candidate does not produce a clean merge-tree against current main');

  if (files.some(isProductFile)) {
    // Pembanding rilis adalah TIP main SEKARANG, bukan BASE_SHA. GitHub membekukan
    // pull_request.base.sha pada saat PR dibuka dan tidak pernah menyegarkannya; kalau
    // PR lain merge duluan, base.sha tertinggal dan +1 yang benar terbaca sebagai +2.
    // origin/main sudah di-fetch di atas dan sudah dipastikan menjadi leluhur HEAD.
    const baseDiag = parseDiag(fileText('features/neural-voice/fiezel-diag-panel.js', 'origin/main'));
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

/* A12 Evidence Gatekeeper DIHAPUS TOTAL atas perintah OWNER (2026-08-29):
   gerbang penerimaan uji fisik tidak lagi menahan rilis. Keputusan rilis kembali
   sepenuhnya ke OWNER + gerbang otomatis lain (A6-A11, A13, quality). */
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
    ['collateral scope violation (unauthorized auth/PWA/CI touch)', /(COLLATERAL_AUTH_TOUCH|COLLATERAL_ONBOARDING_TOUCH|COLLATERAL_PWA_TOUCH|COLLATERAL_CI_GOVERNANCE_TOUCH|MASS_RUNTIME_DELETION)/i],
    ['branch freshness / merge boundary', /(does not contain current main|does not contain current origin\/main|merge-base|merge-tree|behind)/i],
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
  const interesting = lines.filter((l) => /(error|fail|assert|timeout|expected|actual|fatal|not found|denied|COLLATERAL_)/i.test(l)).slice(-25);
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
else if (mode === 'a13') runA13();
else {
  console.error('Usage: node tools/fiezel-guardians.mjs <self-test|a8|a9|a10|a11|a13>');
  process.exit(2);
}
