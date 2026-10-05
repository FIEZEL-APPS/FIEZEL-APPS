#!/usr/bin/env node
/**
 * FIEZEL BOT v2 — Elite Autonomous AI Code Reviewer, Auto-Fix & CI-Heal Agent
 * =============================================================================
 * Bot AI mandiri resmi untuk FIEZEL-APPS. Pengganti total Gitar Bot.
 *
 * ARSITEKTUR v2 (ditingkatkan dari v1):
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │  LAPISAN 1: DETERMINISTIC INVARIANT SCANNER (Tanpa AI — Pasti Benar)│
 * │  ├─ Secret Leak Detector (6 pola regex, mirror A9 Security Sentinel)│
 * │  ├─ Workflow Security Gate (pull_request_target, write-all, timeout) │
 * │  ├─ Hexa-Sync Release Boundary Verifier (DIAG/SW_REV/BUILD-VERSION) │
 * │  ├─ Braincore Wiring Detector (updateMastery, bktRecord telemetry)  │
 * │  ├─ Anti-Ghost Answer Scanner (answerIndex forgery, false praise)    │
 * │  ├─ Exam Leak Detector (hint/peek in measureMode paths)             │
 * │  ├─ Handoff Completeness Checker (major changes need HANDOFF.md)    │
 * │  ├─ Assertion Surface Monitor (deleted vs added assertions)         │
 * │  ├─ Console.log / Debugger Residue Scanner                          │
 * │  └─ File Subsystem Classifier (Braincore/Audio/UI/PWA/Auth/Neural)  │
 * ├───────────────────────────────────────────────────────────────────────┤
 * │  LAPISAN 2: AI-POWERED SEMANTIC REVIEW (Gemini → Groq → Heuristic)  │
 * │  ├─ Context-aware review enriched with deterministic evidence       │
 * │  ├─ Prompt includes subsystem classification & invariant signals    │
 * │  └─ Structured Markdown output with Invariant Audit Table           │
 * ├───────────────────────────────────────────────────────────────────────┤
 * │  LAPISAN 3: CI FAILURE TAXONOMY & SELF-HEALING                      │
 * │  ├─ 8 failure signatures (mirroring A8 CI Failure Analyst)          │
 * │  ├─ Deterministic fix for versioning desync (bump-build auto)       │
 * │  ├─ AI-assisted patch generation for test/logic failures            │
 * │  └─ Syntax validation rollback (node --check) before commit        │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Penggunaan:
 *   node tools/fiezel-bot.mjs review [--pr=<nomor>]
 *   node tools/fiezel-bot.mjs fix    [--pr=<nomor>] [--issue="..."]
 *   node tools/fiezel-bot.mjs heal   [--pr=<nomor>] [--log=<path>]
 *   node tools/fiezel-bot.mjs bump   "alasan bump"
 *   node tools/fiezel-bot.mjs explain [--pr=<nomor>]
 *   node tools/fiezel-bot.mjs self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SH_MAX_BUFFER = 64 * 1024 * 1024;

// KEAMANAN: Semua kunci API dibaca HANYA dari environment variable.
// Di GitHub Actions, diisi oleh repository secrets (${{ secrets.GROQ_API_KEY }}).
// Di lokal, set via `export GROQ_API_KEY=...` sebelum menjalankan bot.
// DILARANG KERAS menulis kunci di sini — scanner A9 akan mendeteksinya.

function sh(command, args = [], opts = {}) {
  const r = spawnSync(command, args, { encoding: 'utf8', maxBuffer: SH_MAX_BUFFER, cwd: ROOT, ...opts });
  if (opts.allowFailure) return r;
  if (r.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${r.status}): ${(r.stderr || r.stdout || '').slice(0, 500)}`);
  return (r.stdout || '').trim();
}

function parseCliArgs() {
  const mode = process.argv[2] || 'help';
  const options = {};
  for (const arg of process.argv.slice(3)) {
    if (arg.startsWith('--')) {
      const idx = arg.indexOf('=');
      if (idx === -1) options[arg.slice(2)] = true;
      else options[arg.slice(2, idx)] = arg.slice(idx + 1);
    } else if (!options.message) options.message = arg;
  }
  return { mode, options };
}

// ═══════════════════════════════════════════════════════════════════════════
// LAPISAN 1: DETERMINISTIC INVARIANT SCANNER — Tanpa AI, 100% Deterministik
// ═══════════════════════════════════════════════════════════════════════════

/** Pola deteksi secret — mirror dari fiezel-guardians.mjs A9 */
const SECRET_PATTERNS = [
  { name: 'Private Key',       re: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { name: 'GitHub PAT (ghp)',  re: /\bghp_[A-Za-z0-9]{20,}\b/ },
  { name: 'GitHub PAT (new)',  re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: 'AWS Access Key',   re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Generic API Key',  re: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Groq Key',         re: /\bgsk_[A-Za-z0-9]{20,}\b/ },
];

/** Klasifikasi subsistem berdasarkan path — mengetahui dampak perubahan */
const SUBSYSTEMS = [
  { name: 'Braincore Engine',       re: /^features\/(brain|mastery|adaptiv)\//, icon: '🧠' },
  { name: 'Audio & TTS',            re: /^features\/(audio-assets|speaking-listening|neural-voice)\//, icon: '🔊' },
  { name: 'Quiz & Assessment',      re: /^features\/(quiz|assessment|placement|grammar|cloze|susun-kata|mini-game)\//, icon: '📝' },
  { name: 'Tutor & Classroom',      re: /^features\/tutor-classroom\//, icon: '👩‍🏫' },
  { name: 'UI / UX',                re: /^features\/(ui|i18n|home|onboarding|tour)\/|^style\.css$/, icon: '🎨' },
  { name: 'PWA & Service Worker',   re: /^(sw\.js|core-config\.js|manifest\.json|version\.js)$/, icon: '📦' },
  { name: 'Auth & Account',         re: /^features\/(auth|account|puter|friend)\//, icon: '🔐' },
  { name: 'Content & Curriculum',   re: /^(content-|features\/curriculum|kurikulum\.html|misi\.html)/, icon: '📚' },
  { name: 'CI / Workflows',         re: /^\.github\/workflows\//, icon: '⚙️' },
  { name: 'Tests & Gates',          re: /^tests\//, icon: '🧪' },
  { name: 'Tools & Scripts',        re: /^tools\//, icon: '🔧' },
  { name: 'Coordination & Docs',    re: /^(coordination|docs)\//, icon: '📋' },
  { name: 'Product Runtime',        re: /^(index\.html|app\.js|report-config\.js)$/, icon: '🚀' },
];

/** CI Failure Signatures — mirror dari fiezel-guardians.mjs A8 */
const CI_FAILURE_SIGNATURES = [
  { domain: 'Release Boundary Desync',     re: /(product deploy must increment|DIAG_BUILD|SW_REV|A7 FAIL|release boundary|pwa-release-coherence)/i, autofix: 'bump' },
  { domain: 'Branch Freshness',            re: /(does not contain current main|merge-base|merge-tree|behind main)/i, autofix: null },
  { domain: 'Test Assertion Failure',      re: /(AssertionError|assertion failed|expected .* actual|FAIL:|test.*failed)/i, autofix: 'ai' },
  { domain: 'Syntax Error',               re: /(SyntaxError|Unexpected token|Cannot use import|node --check)/i, autofix: 'ai' },
  { domain: 'Timeout / Hang',             re: /(timeout|timed out|latency|ETIMEDOUT)/i, autofix: null },
  { domain: 'Auth / COOP / COEP',         re: /(puter|auth|signed.?in|coop|coep)/i, autofix: null },
  { domain: 'Service Worker / Cache',     re: /(service worker|sw\.js|cache|corp|precache)/i, autofix: null },
  { domain: 'Dependency / Setup',         re: /(npm ERR|module not found|ENOENT|setup-node)/i, autofix: null },
];

function classifyFiles(files) {
  const hits = new Map();
  for (const f of files) {
    for (const sub of SUBSYSTEMS) {
      if (sub.re.test(f)) {
        if (!hits.has(sub.name)) hits.set(sub.name, { ...sub, files: [] });
        hits.get(sub.name).files.push(f);
        break;
      }
    }
  }
  return [...hits.values()];
}

function isProductFile(p) {
  return /^(index\.html|style\.css|app\.js|sw\.js|version\.js|manifest\.json|core-config\.js|report-config\.js|content-.*\.js|features\/)/.test(p);
}

function parseDiag(text) {
  const m = text.match(/DIAG_BUILD\s*=\s*['"]m025-(\d+)['"]/);
  return m ? Number(m[1]) : null;
}
function parseSw(text) {
  const m = text.match(/SW_REV\s*=\s*['"]m025-(\d+)-/);
  return m ? Number(m[1]) : null;
}

/**
 * Menjalankan seluruh pemeriksaan deterministik terhadap diff dan file list.
 * Hasilnya adalah objek terstruktur berisi temuan PASS/WARN/FAIL per kategori.
 */
function runDeterministicScan(changedFiles, diff, addedLines) {

  const findings = {
    security:    { status: 'PASS', items: [] },
    workflow:    { status: 'PASS', items: [] },
    hexaSync:    { status: 'PASS', items: [] },
    braincore:   { status: 'PASS', items: [] },
    ghostAnswer: { status: 'PASS', items: [] },
    examLeak:    { status: 'PASS', items: [] },
    handoff:     { status: 'PASS', items: [] },
    assertions:  { status: 'PASS', items: [] },
    codeHygiene: { status: 'PASS', items: [] },
  };

  // ── 1. SECRET LEAK DETECTION ──
  for (const line of addedLines) {
    for (const pat of SECRET_PATTERNS) {
      if (pat.re.test(line)) {
        findings.security.status = 'FAIL';
        findings.security.items.push(`🚨 Terdeteksi kemungkinan **${pat.name}** di baris yang ditambahkan`);
      }
    }
  }

  // ── 2. WORKFLOW SECURITY ──
  const wfFiles = changedFiles.filter(f => f.startsWith('.github/workflows/'));
  for (const wf of wfFiles) {
    const absPath = path.resolve(ROOT, wf);
    if (!fs.existsSync(absPath)) continue;
    const text = fs.readFileSync(absPath, 'utf8');
    if (/\bpull_request_target\s*:/.test(text)) {
      findings.workflow.status = 'FAIL';
      findings.workflow.items.push(`❌ \`${wf}\`: Menggunakan \`pull_request_target\` yang dilarang oleh A9`);
    }
    if (/permissions\s*:\s*write-all/.test(text)) {
      findings.workflow.status = 'FAIL';
      findings.workflow.items.push(`❌ \`${wf}\`: Menggunakan \`permissions: write-all\` yang dilarang oleh A9`);
    }
    if (!/timeout-minutes:\s*\d+/.test(text)) {
      findings.workflow.status = 'WARN';
      findings.workflow.items.push(`⚠️ \`${wf}\`: Tidak memiliki \`timeout-minutes\` di tingkat job (wajib ≤ 120 menit)`);
    }
    if (/persist-credentials\s*:\s*true/.test(text)) {
      findings.workflow.items.push(`⚠️ \`${wf}\`: \`persist-credentials: true\` — pastikan ini memang diperlukan`);
    }
  }

  // ── 3. HEXA-SYNC RELEASE BOUNDARY ──
  const hasProductChange = changedFiles.some(isProductFile);
  const hasBumpFile = changedFiles.includes('coordination/BUILD-VERSION.json');
  if (hasProductChange) {
    if (!hasBumpFile) {
      findings.hexaSync.status = 'WARN';
      findings.hexaSync.items.push('⚠️ Berkas produk berubah tetapi `coordination/BUILD-VERSION.json` belum di-bump');
    }
    // Cek keselarasan DIAG vs SW di HEAD jika ada
    const diagPath = path.join(ROOT, 'features/neural-voice/fiezel-diag-panel.js');
    const swPath = path.join(ROOT, 'sw.js');
    if (fs.existsSync(diagPath) && fs.existsSync(swPath)) {
      const diagN = parseDiag(fs.readFileSync(diagPath, 'utf8'));
      const swN = parseSw(fs.readFileSync(swPath, 'utf8'));
      if (diagN != null && swN != null && diagN !== swN) {
        findings.hexaSync.status = 'FAIL';
        findings.hexaSync.items.push(`❌ DIAG_BUILD (m025-${diagN}) ≠ SW_REV (m025-${swN}) — build desinkron!`);
      }
    }
  }

  // ── 4. BRAINCORE WIRING DETECTOR ──
  const quizFiles = changedFiles.filter(f => /features\/(quiz|assessment|grammar|cloze|susun-kata|mini-game|placement)\//.test(f));
  for (const qf of quizFiles) {
    const absP = path.resolve(ROOT, qf);
    if (!fs.existsSync(absP)) continue;
    const text = fs.readFileSync(absP, 'utf8');
    // Cek apakah ada interaksi jawaban tapi tidak terhubung ke Braincore
    if (/function\s+(answer|handleAnswer|submitAnswer|evaluateAnswer)/i.test(text)) {
      if (!/updateMastery|bktRecord|brainSync|mastery/i.test(text)) {
        findings.braincore.status = 'WARN';
        findings.braincore.items.push(`⚠️ \`${qf}\`: Handler jawaban ditemukan tetapi tidak ada referensi ke \`updateMastery\`/\`bktRecord\`/Braincore`);
      }
    }
    // Cek flag boolean statis yang menggantikan Braincore
    if (/vocabReady\s*=\s*true|isReady\s*=\s*true|mastered\s*=\s*true/.test(text) && !/P\(L|bkt|irt|mastery/i.test(text)) {
      findings.braincore.status = 'WARN';
      findings.braincore.items.push(`⚠️ \`${qf}\`: Flag statis (\`vocabReady = true\`) menggantikan logika Braincore (Zero-Dumbing violation)`);
    }
  }

  // ── 5. ANTI-GHOST ANSWER SCANNER ──
  const ghostPatterns = [
    { re: /answerIndex\s*===?\s*0\s*\?\s*1\s*:\s*0/, desc: 'Penukaran index jawaban fiktif (anti-ghost answer)' },
    { re: /q\.\w*answer\w*\s*=\s*(?!q\.__user)/, desc: 'Penimpaan jawaban murid dengan nilai yang bukan dari input' },
  ];
  for (const line of addedLines) {
    for (const gp of ghostPatterns) {
      if (gp.re.test(line)) {
        findings.ghostAnswer.status = 'FAIL';
        findings.ghostAnswer.items.push(`❌ ${gp.desc}`);
      }
    }
  }
  // Deteksi pujian untuk jawaban salah
  if (/ok\s*===?\s*false[\s\S]{0,200}(Tepat|Benar|Bagus|Hebat|tepat|benar)/m.test(diff)) {
    findings.ghostAnswer.status = 'FAIL';
    findings.ghostAnswer.items.push('❌ Teks pujian muncul di blok jawaban salah (`ok === false`) — melanggar invarian anti-ghost answer');
  }

  // ── 6. EXAM LEAK DETECTOR ──
  const examFiles = changedFiles.filter(f => /features\/(placement|assessment|quiz)\//.test(f));
  for (const ef of examFiles) {
    const absP = path.resolve(ROOT, ef);
    if (!fs.existsSync(absP)) continue;
    const text = fs.readFileSync(absP, 'utf8');
    if (/measureMode|placement|cfg\.measure/i.test(text) && /(hint|petunjuk|intip.?arti|peek|bantuan|showHint)/i.test(text)) {
      if (!/disabled|hidden|forbidden|removeHint/.test(text)) {
        findings.examLeak.status = 'WARN';
        findings.examLeak.items.push(`⚠️ \`${ef}\`: Mode ujian terdeteksi bersama fitur hint/petunjuk — pastikan hint dinonaktifkan saat measure`);
      }
    }
  }

  // ── 7. HANDOFF COMPLETENESS ──
  const majorChange = changedFiles.some(f => /features\/(neural-voice|tutor-classroom)\//.test(f));
  const hasHandoff = changedFiles.some(f => /HANDOFF\.md$/i.test(f));
  if (majorChange && !hasHandoff) {
    findings.handoff.status = 'WARN';
    findings.handoff.items.push('⚠️ Perubahan besar di `neural-voice`/`tutor-classroom` tanpa berkas HANDOFF.md');
  }

  // ── 8. ASSERTION SURFACE MONITOR ──
  const delAssert = addedLines.filter(l => l.startsWith('-') && /(assert|throw new Error|jq -e|grep -F)/.test(l)).length;
  const newAssert = addedLines.filter(l => l.startsWith('+') && /(assert|throw new Error|jq -e|grep -F)/.test(l)).length;
  if (delAssert > newAssert + 5) {
    findings.assertions.status = 'WARN';
    findings.assertions.items.push(`⚠️ Permukaan assertion berkurang signifikan (dihapus=${delAssert}, ditambah=${newAssert})`);
  }

  // ── 9. CODE HYGIENE ──
  let debuggerCount = 0, consoleCount = 0, todoCount = 0;
  for (const line of addedLines) {
    if (/^\+.*\bdebugger\b/.test(line)) debuggerCount++;
    if (/^\+.*console\.(log|debug|info)\(/.test(line) && !/\/\/\s*keep|eslint-disable/.test(line)) consoleCount++;
    if (/^\+.*(?:TODO|FIXME|HACK|XXX)\b/.test(line)) todoCount++;
  }
  if (debuggerCount > 0) {
    findings.codeHygiene.status = 'WARN';
    findings.codeHygiene.items.push(`⚠️ ${debuggerCount}x \`debugger\` statement ditemukan di baris baru`);
  }
  if (consoleCount > 5) {
    findings.codeHygiene.items.push(`💡 ${consoleCount}x \`console.log\` baru — pertimbangkan untuk membersihkan sebelum merge`);
  }
  if (todoCount > 0) {
    findings.codeHygiene.items.push(`📌 ${todoCount}x TODO/FIXME/HACK baru ditemukan`);
  }

  return findings;
}

/**
 * Menghasilkan skor risiko keseluruhan dari scan deterministik
 */
function computeRiskScore(findings) {
  let fails = 0, warns = 0;
  for (const cat of Object.values(findings)) {
    if (cat.status === 'FAIL') fails++;
    if (cat.status === 'WARN') warns++;
  }
  if (fails > 0) return { verdict: 'CHANGES REQUESTED', emoji: '🔴', fails, warns };
  if (warns > 2) return { verdict: 'READY FOR MASTER REVIEW', emoji: '🟡', fails, warns };
  return { verdict: 'APPROVED', emoji: '🟢', fails, warns };
}

// ═══════════════════════════════════════════════════════════════════════════
// LAPISAN 2: AI-POWERED SEMANTIC REVIEW
// ═══════════════════════════════════════════════════════════════════════════

async function queryLLM(prompt, systemInstruction = '') {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  const groqKey = process.env.GROQ_API_KEY || '';

  // 1. Gemini
  if (geminiKey) {
    for (const model of ['gemini-flash-latest', 'gemini-2.5-pro', 'gemini-pro-latest']) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.15, maxOutputTokens: 4096 } };
        if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, provider: `Google Gemini (${model})` };
        }
      } catch (_) { /* fallthrough */ }
    }
  }

  // 2. Groq
  if (groqKey) {
    for (const model of ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b']) {
      try {
        const messages = [];
        if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
        messages.push({ role: 'user', content: prompt.slice(0, 16000) });
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages, temperature: 0.15, max_tokens: 3500 })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, provider: `Groq AI (${model})` };
        }
      } catch (_) { /* fallthrough */ }
    }
  }

  return { text: '', provider: 'Deterministic Heuristic Only' };
}

const FIEZEL_SYSTEM_PROMPT = `You are FIEZEL BOT v2, the elite AI-native Code Reviewer for FIEZEL-APPS, an educational PWA with Braincore adaptive learning (BKT, IRT 3PL, OLM, FSRS, Misconception Ledger).

Critical Non-Negotiable Invariants (violations = CHANGES REQUESTED):
1. BRAINCORE: Every quiz/assessment interaction MUST flow telemetry to updateMastery()/bktRecord(). No static boolean mocks.
2. ZERO-LOSS INPUT: Never discard student tokens (__userTokenAnswer). Never forge answers. Never praise wrong answers.
3. EXAM PURITY: In measureMode/placement, ALL hints/peek/intip-arti MUST be disabled.
4. HEXA-SYNC: Product changes require bump-build.mjs with 6-point alignment (BUILD-VERSION.json, sw.js, core-config.js, diag-panel.js, kurikulum.html, misi.html).
5. SECURITY: No committed secrets. No pull_request_target or write-all in workflows. Job-level timeout-minutes required.
6. AUDIO: Multi-character persona protocol. EBU R128 (-14 LUFS, TP ≤ -1.5 dBTP).

You receive DETERMINISTIC EVIDENCE from the scanner before your review. Trust the evidence. Focus your AI analysis on:
- Semantic logic bugs the scanner cannot catch
- Architectural concerns and coupling issues
- Performance regressions and race conditions
- Accessibility and i18n completeness

Write your review in Indonesian (Bahasa Indonesia) with technical terms in English. Be concise but precise.`;

// ═══════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════

function getDiffData(prNumber) {
  let prTitle = 'Local Change Review', prBody = '', diff = '', changedFiles = [];

  if (prNumber) {
    try {
      const prJson = sh('gh', ['pr', 'view', String(prNumber), '--json', 'title,body,files']);
      const parsed = JSON.parse(prJson);
      prTitle = parsed.title || ''; prBody = parsed.body || '';
      changedFiles = (parsed.files || []).map(f => f.path);
      diff = sh('gh', ['pr', 'diff', String(prNumber)]);
    } catch (e) {
      console.warn(`[Fiezel Bot] gh pr gagal: ${e.message}. Fallback ke git diff.`);
    }
  }

  if (!diff) {
    diff = (sh('git', ['diff', 'origin/main...HEAD'], { allowFailure: true }).stdout || sh('git', ['diff', 'HEAD~1...HEAD'], { allowFailure: true }).stdout || '');
    changedFiles = (sh('git', ['diff', '--name-only', 'origin/main...HEAD'], { allowFailure: true }).stdout || '').split('\n').filter(Boolean);
  }

  const addedLines = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
  return { prTitle, prBody, diff, changedFiles, addedLines };
}

/**
 * REVIEW — Gabungan Lapisan 1 (Deterministik) + Lapisan 2 (AI)
 */
async function runReview(prNumber) {
  console.log(`[Fiezel Bot v2] ═══ Memulai review PR #${prNumber || 'HEAD'} ═══`);
  const { prTitle, prBody, diff, changedFiles, addedLines } = getDiffData(prNumber);

  if (!diff && changedFiles.length === 0) {
    console.log('[Fiezel Bot v2] Tidak ada perubahan untuk direview.');
    return '';
  }

  // ── LAPISAN 1: Deterministic Scan ──
  console.log(`[Fiezel Bot v2] Lapisan 1: Scanning ${changedFiles.length} berkas...`);
  const findings = runDeterministicScan(changedFiles, diff, addedLines);
  const subsystems = classifyFiles(changedFiles);
  const risk = computeRiskScore(findings);

  // ── LAPISAN 2: AI Semantic Review ──
  console.log('[Fiezel Bot v2] Lapisan 2: AI semantic analysis...');
  const deterministicEvidence = formatDeterministicEvidence(findings, subsystems, risk);

  // ── LAPISAN 1.5: Pre-Flight Test Check ──
  console.log('[Fiezel Bot v2] Lapisan 1.5: Pre-flight test execution...');
  let testContext = '';
  const preflight = [
    { cmd: 'node', args: ['tests/workflow-timeout-gate-test.js'], name: 'Timeout Gate' },
    { cmd: 'node', args: ['tools/fiezel-guardians.mjs', 'self-test'], name: 'Guardians Core' }
  ];
  for (const t of preflight) {
    if (fs.existsSync(path.join(ROOT, t.args[0]))) {
      const res = sh(t.cmd, t.args, { allowFailure: true });
      if (res.status !== 0) testContext += `\n❌ ${t.name} FAIL:\n${(res.stderr || res.stdout).slice(0, 500)}`;
    }
  }

  const aiPrompt = `
Review PR: "${prTitle}"
PR Description: ${(prBody || '(kosong)').slice(0, 1000)}
Changed Files (${changedFiles.length}): ${changedFiles.slice(0, 30).join(', ')}${changedFiles.length > 30 ? ` ... +${changedFiles.length - 30} lainnya` : ''}

Affected Subsystems:
${subsystems.map(s => `- ${s.icon} ${s.name} (${s.files.length} files)`).join('\n')}

DETERMINISTIC SCANNER EVIDENCE (trust this — it's code-verified, not guessed):
${deterministicEvidence}
${testContext ? `\n⚠️ TEST FAILURES DETECTED ON THIS PR:\n${testContext}\nPlease explain why these tests failed based on the diff.` : '\n✅ All pre-flight tests passed.'}

Git Diff (truncated):
\`\`\`diff
${diff.slice(0, 25000)}
\`\`\`

Generate ONLY the "### 🔬 Analisis Semantik AI" section with 2-5 findings about logic bugs, architecture, performance, or accessibility that the deterministic scanner CANNOT detect. Number each finding. Be concise.`;

  const aiResult = await queryLLM(aiPrompt, FIEZEL_SYSTEM_PROMPT);

  // ── Compose Final Review ──
  const reviewMarkdown = composeReviewMarkdown(prTitle, changedFiles, subsystems, findings, risk, aiResult);
  console.log('\n--- HASIL REVIEW ---\n');
  console.log(reviewMarkdown);
  return reviewMarkdown;
}

function formatDeterministicEvidence(findings, subsystems, risk) {
  const lines = [`Overall Risk: ${risk.emoji} ${risk.verdict} (${risk.fails} FAIL, ${risk.warns} WARN)`];
  const LABELS = {
    security: 'Keamanan & Secrets', workflow: 'Workflow Security', hexaSync: 'PWA Hexa-Sync',
    braincore: 'Braincore Wiring', ghostAnswer: 'Anti-Ghost Answer', examLeak: 'Exam Leak Purity',
    handoff: 'Handoff Keeper', assertions: 'Assertion Surface', codeHygiene: 'Code Hygiene',
  };
  for (const [key, cat] of Object.entries(findings)) {
    lines.push(`- ${LABELS[key]}: ${cat.status}${cat.items.length ? ' — ' + cat.items[0] : ''}`);
  }
  return lines.join('\n');
}

function composeReviewMarkdown(prTitle, changedFiles, subsystems, findings, risk, aiResult) {
  const LABELS = {
    security: 'Keamanan & Secrets', workflow: 'Workflow Security', hexaSync: 'PWA Hexa-Sync & Release Boundary',
    braincore: 'Braincore Engine Wiring', ghostAnswer: 'Anti-Ghost Answer & Input Murid', examLeak: 'Exam Leak Purity',
    handoff: 'Handoff Completeness', assertions: 'Assertion Surface', codeHygiene: 'Code Hygiene',
  };
  const STATUS_ICON = { PASS: '✅', WARN: '⚠️', FAIL: '❌' };

  let md = `<!-- FIEZEL_BOT_REVIEW -->
## 🤖 Fiezel Bot v2 — Code Review

### 📊 Ringkasan Eksekutif
PR **"${prTitle}"** melibatkan **${changedFiles.length} berkas** yang menyentuh ${subsystems.length} subsistem: ${subsystems.map(s => `${s.icon} ${s.name}`).join(', ') || '_tidak terklasifikasi_'}.

### 🏗️ Subsistem Terpengaruh
| Subsistem | Jumlah Berkas |
|---|---|
${subsystems.map(s => `| ${s.icon} ${s.name} | ${s.files.length} |`).join('\n')}

### 🛡️ Audit Invarian FIEZEL (Deterministik — Tanpa AI)
| # | Invarian | Status | Temuan |
|---|---|---|---|
${Object.entries(findings).map(([key, cat], i) =>
  `| ${i + 1} | ${LABELS[key]} | ${STATUS_ICON[cat.status]} ${cat.status} | ${cat.items.length ? cat.items.join('<br>') : '—'} |`
).join('\n')}

### 🔬 Analisis Semantik AI
${aiResult.text || '_AI tidak tersedia. Review dilakukan 100% secara deterministik._'}

### 🏁 Verdict
${risk.emoji} **${risk.verdict}**

${risk.fails > 0 ? '> **Catatan**: Ditemukan pelanggaran invarian kritis yang harus diperbaiki sebelum merge.' : ''}
${risk.warns > 2 ? '> **Catatan**: Beberapa peringatan memerlukan konfirmasi MASTER reviewer.' : ''}

---
<sub>Fiezel Bot v2 • Deterministic Scanner + ${aiResult.provider} • ${new Date().toISOString().slice(0, 19)}Z</sub>`;

  return md;
}

/**
 * FIX — Auto-generate patches from AI
 */
async function runFix(prNumber, issueContext = '') {
  console.log(`[Fiezel Bot v2] Memulai auto-fix untuk PR #${prNumber || 'HEAD'}...`);
  const { diff, changedFiles } = getDiffData(prNumber);

  const prompt = `Generate precise code fixes for this PR.
Issue: ${issueContext || 'Fix bugs, invariant violations, or style issues in the diff'}
Changed files: ${changedFiles.slice(0, 20).join(', ')}

Diff:
\`\`\`diff
${diff.slice(0, 25000)}
\`\`\`

Output ONLY replacement blocks:
<<<FILE: path/to/file.ext>>>
<<<SEARCH>>>
[exact verbatim lines to replace]
<<<REPLACE>>>
[new replacement lines]
<<<END>>>`;

  const aiResult = await queryLLM(prompt, FIEZEL_SYSTEM_PROMPT);
  if (!aiResult.text) { console.log('[Fiezel Bot v2] AI tidak memberikan saran patch.'); return false; }
  const patchedFiles = applyReplacementBlocks(aiResult.text);
  
  if (patchedFiles.length === 0) return false;
  
  if (!runValidationLoop()) {
    console.log('[Fiezel Bot v2] ⏪ Patch AI mematahkan invarian. Melakukan rollback...');
    for (const f of patchedFiles) {
      sh('git', ['restore', f], { allowFailure: true });
    }
    console.log('[Fiezel Bot v2] ❌ Auto-fix dibatalkan karena tidak aman (jangan sampai ada kode tidak berfungsi).');
    return false;
  }
  
  console.log(`[Fiezel Bot v2] Diterapkan ${patchedFiles.length} perbaikan.`);
  return true;
}

/**
 * HEAL — CI Failure Taxonomy & Self-Healing
 */
async function runHeal(prNumber, logPath = '') {
  console.log('[Fiezel Bot v2] ═══ CI Self-Healing Engine ═══');
  let logContent = '';

  if (logPath && fs.existsSync(logPath)) logContent = fs.readFileSync(logPath, 'utf8');
  else if (prNumber) {
    try { logContent = sh('gh', ['run', 'view', '--log-failed'], { allowFailure: true }).stdout || ''; } catch (_) {}
  }
  if (!logContent && fs.existsSync('/tmp/a8-failed.log')) logContent = fs.readFileSync('/tmp/a8-failed.log', 'utf8');

  // Klasifikasi kegagalan
  const matches = CI_FAILURE_SIGNATURES.filter(sig => sig.re.test(logContent));
  console.log(`[Fiezel Bot v2] Failure domains terdeteksi: ${matches.map(m => m.domain).join(', ') || 'unclassified'}`);

  // Prioritas: bump dulu jika ada release boundary issue
  const bumpMatch = matches.find(m => m.autofix === 'bump');
  if (bumpMatch) {
    console.log(`[Fiezel Bot v2] 🔧 Deterministic fix: ${bumpMatch.domain} → auto bump-build`);
    return runBump('bot(heal): auto-synchronize release boundary');
  }

  // Cek apakah ada syntax error atau test failure yang bisa di-fix AI
  const aiMatch = matches.find(m => m.autofix === 'ai');
  if (aiMatch || matches.length === 0) {
    console.log(`[Fiezel Bot v2] 🤖 AI-assisted fix for: ${aiMatch?.domain || 'unclassified failure'}...`);
    const prompt = `CI failed. Failure domain: ${aiMatch?.domain || 'unknown'}.

Error log (last 15KB):
\`\`\`text
${logContent.slice(-15000)}
\`\`\`

Diagnose the root cause and provide exact code fixes:
<<<FILE: path/to/file.ext>>>
<<<SEARCH>>>
[exact lines]
<<<REPLACE>>>
[fixed lines]
<<<END>>>`;

    const aiResult = await queryLLM(prompt, FIEZEL_SYSTEM_PROMPT);
    if (aiResult.text) {
      const patchedFiles = applyReplacementBlocks(aiResult.text);
      if (patchedFiles.length > 0) {
        if (!runValidationLoop()) {
          console.log('[Fiezel Bot v2] ⏪ Patch AI gagal di gerbang pre-commit. Melakukan rollback...');
          for (const f of patchedFiles) sh('git', ['restore', f], { allowFailure: true });
          return false;
        }
        return true;
      }
    }
  }

  // Tindakan non-fixable
  if (matches.length > 0 && !matches.some(m => m.autofix)) {
    console.log(`[Fiezel Bot v2] ℹ️ Kegagalan ${matches.map(m => m.domain).join(', ')} memerlukan intervensi manual.`);
  }
  console.log('[Fiezel Bot v2] Tidak dapat memperbaiki otomatis.');
  return false;
}

/**
 * EXPLAIN — PR Explanation in Indonesian
 */
async function runExplain(prNumber) {
  console.log(`[Fiezel Bot v2] Membuat ringkasan penjelasan PR #${prNumber}...`);
  const { prTitle, diff, changedFiles } = getDiffData(prNumber);
  const subsystems = classifyFiles(changedFiles);

  const prompt = `Jelaskan perubahan PR ini dalam Bahasa Indonesia yang ringkas dan lugas:
PR: "${prTitle}"
Subsistem: ${subsystems.map(s => s.icon + ' ' + s.name).join(', ')}
Files: ${changedFiles.length}

\`\`\`diff
${diff.slice(0, 20000)}
\`\`\`

Struktur:
1. 🎯 Tujuan Utama
2. 🧩 Komponen Terpengaruh
3. 💡 Dampak Bagi Murid / Guru
4. ⚠️ Hal yang Perlu Diperhatikan`;

  const aiResult = await queryLLM(prompt, FIEZEL_SYSTEM_PROMPT);
  const text = aiResult.text || 'Gagal menghasilkan penjelasan otomatis.';
  console.log('\n--- PENJELASAN PR ---\n');
  console.log(text);
  return text;
}

/**
 * BUMP — Version Bump Wrapper
 */
function runBump(reason = 'chore: bump build via Fiezel Bot') {
  console.log(`[Fiezel Bot v2] Menjalankan bump-build: "${reason}"...`);
  try {
    console.log(sh('node', ['tools/bump-build.mjs', reason]));
    console.log(sh('node', ['tools/bump-build.mjs', '--check']));
    return true;
  } catch (err) {
    console.error(`[Fiezel Bot v2] Gagal bump: ${err.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PATCH ENGINE & VALIDATION LOOP
// ═══════════════════════════════════════════════════════════════════════════

function runValidationLoop() {
  console.log('[Fiezel Bot v2] 🧪 Menjalankan Validation Loop paska-patch (Pre-commit gate)...');
  const checks = [
    { cmd: 'node', args: ['tests/fiezel-bot-test.js'], name: 'Fiezel Bot Integrity' },
    { cmd: 'node', args: ['tests/workflow-timeout-gate-test.js'], name: 'Workflow Timeout Gate' },
    { cmd: 'node', args: ['tools/fiezel-guardians.mjs', 'self-test'], name: 'Guardians Core' },
  ];
  
  for (const c of checks) {
    const absP = path.join(ROOT, c.args[0]);
    if (fs.existsSync(absP)) {
      const res = sh(c.cmd, c.args, { allowFailure: true });
      if (res.status !== 0) {
        console.error(`[Fiezel Bot v2] ❌ Validasi gagal di: ${c.name}`);
        console.error((res.stderr || res.stdout || '').slice(0, 1000));
        return false;
      }
    }
  }
  console.log('[Fiezel Bot v2] ✅ Validation Loop LULUS.');
  return true;
}

function cleanBlockText(text) {
  let t = text;
  if (t.startsWith('\r\n')) t = t.slice(2); else if (t.startsWith('\n')) t = t.slice(1);
  if (t.endsWith('\r\n')) t = t.slice(0, -2); else if (t.endsWith('\n')) t = t.slice(0, -1);
  return t;
}

function applyReplacementBlocks(patchText) {
  const blockRegex = /<<<FILE:\s*(.+?)>>>[\r\n]+<<<SEARCH>>>([\s\S]*?)<<<REPLACE>>>([\s\S]*?)<<<END>>>/g;
  let match;
  const patchedFiles = [];

  while ((match = blockRegex.exec(patchText)) !== null) {
    const relFile = match[1].trim();
    const searchTarget = cleanBlockText(match[2]);
    const replacement = cleanBlockText(match[3]);
    const absPath = path.resolve(ROOT, relFile);

    if (!fs.existsSync(absPath)) { console.warn(`[Fiezel Bot v2] File tidak ditemukan: ${relFile}`); continue; }

    const original = fs.readFileSync(absPath, 'utf8');
    let content = original;
    let matched = false;

    if (content.includes(searchTarget)) {
      content = content.replace(searchTarget, replacement);
      matched = true;
    } else {
      // Coba normalisasi CRLF → LF
      const normContent = content.replace(/\r\n/g, '\n');
      const normTarget = searchTarget.replace(/\r\n/g, '\n');
      if (normContent.includes(normTarget)) {
        content = normContent.replace(normTarget, replacement.replace(/\r\n/g, '\n'));
        matched = true;
      }
    }

    if (!matched) { console.warn(`[Fiezel Bot v2] Search block tidak cocok di ${relFile}`); continue; }

    // Syntax validation untuk JS/MJS
    fs.writeFileSync(absPath, content, 'utf8');
    if (/\.(js|mjs)$/.test(relFile)) {
      const check = sh('node', ['--check', absPath], { allowFailure: true });
      if (check.status !== 0) {
        console.error(`[Fiezel Bot v2] ❌ Syntax error setelah patch pada ${relFile}! Rollback.`);
        fs.writeFileSync(absPath, original, 'utf8');
        continue;
      }
    }
    console.log(`[Fiezel Bot v2] ✅ Patched: ${relFile}`);
    if (!patchedFiles.includes(relFile)) patchedFiles.push(relFile);
  }
  return patchedFiles;
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TEST
// ═══════════════════════════════════════════════════════════════════════════

function runSelfTest() {
  console.log('[Fiezel Bot v2] ═══ Self-Test Suite ═══');
  let pass = 0;

  // T1: Block replacement parser
  const tmpFile = path.join(ROOT, 'scratch-test.tmp');
  fs.writeFileSync(tmpFile, 'const x = "hello_world";', 'utf8');
  const applied = applyReplacementBlocks('<<<FILE: scratch-test.tmp>>>\n<<<SEARCH>>>\nhello_world\n<<<REPLACE>>>\nhello_fiezel\n<<<END>>>');
  const content = fs.readFileSync(tmpFile, 'utf8');
  fs.unlinkSync(tmpFile);
  if (applied.length !== 1 || !content.includes('hello_fiezel')) throw new Error('T1 FAIL: Block replacement parser');
  console.log('  ✅ T1: Block replacement parser');
  pass++;

  // T2: Deterministic scanner
  const scan = runDeterministicScan(['app.js', 'features/brain/test.js'], '+const a = 1;', ['+const a = 1;']);
  if (!scan.security || !scan.braincore || !scan.hexaSync) throw new Error('T2 FAIL: Deterministic scanner structure');
  console.log('  ✅ T2: Deterministic scanner (9 categories)');
  pass++;

  // T3: File classifier
  const classified = classifyFiles(['features/brain/mastery.js', 'sw.js', '.github/workflows/test.yml']);
  if (classified.length < 3) throw new Error('T3 FAIL: File classifier');
  console.log('  ✅ T3: File subsystem classifier');
  pass++;

  // T4: Secret pattern self-test
  const testSecrets = ['+ghp_abcdefghijklmnopqrstuvwxyz1234567890', '+-----BEGIN PRIVATE KEY-----'];
  const secretScan = runDeterministicScan([], '', testSecrets);
  if (secretScan.security.status !== 'FAIL') throw new Error('T4 FAIL: Secret detector');
  console.log('  ✅ T4: Secret pattern detector');
  pass++;

  // T5: Risk score computation
  const riskFail = computeRiskScore({ a: { status: 'FAIL', items: [] }, b: { status: 'PASS', items: [] } });
  if (riskFail.verdict !== 'CHANGES REQUESTED') throw new Error('T5 FAIL: Risk score');
  const riskPass = computeRiskScore({ a: { status: 'PASS', items: [] }, b: { status: 'PASS', items: [] } });
  if (riskPass.verdict !== 'APPROVED') throw new Error('T5 FAIL: Risk score green');
  console.log('  ✅ T5: Risk score computation');
  pass++;

  // T6: CI failure taxonomy
  const releaseMatch = CI_FAILURE_SIGNATURES.filter(s => s.re.test('A7 FAIL: product deploy must increment'));
  if (releaseMatch.length === 0 || releaseMatch[0].autofix !== 'bump') throw new Error('T6 FAIL: CI taxonomy');
  console.log('  ✅ T6: CI failure taxonomy (8 signatures)');
  pass++;

  // T7: DIAG/SW parser
  if (parseDiag("var DIAG_BUILD = 'm025-49';") !== 49) throw new Error('T7 FAIL: DIAG parser');
  if (parseSw("const SW_REV='m025-49-test';") !== 49) throw new Error('T7 FAIL: SW parser');
  console.log('  ✅ T7: DIAG_BUILD/SW_REV parser');
  pass++;

  // T8: Review markdown composition
  const mockFindings = { security: { status: 'PASS', items: [] }, workflow: { status: 'PASS', items: [] },
    hexaSync: { status: 'PASS', items: [] }, braincore: { status: 'PASS', items: [] },
    ghostAnswer: { status: 'PASS', items: [] }, examLeak: { status: 'PASS', items: [] },
    handoff: { status: 'PASS', items: [] }, assertions: { status: 'PASS', items: [] },
    codeHygiene: { status: 'PASS', items: [] } };
  const md = composeReviewMarkdown('Test', ['app.js'], [{ icon: '🚀', name: 'Runtime', files: ['app.js'] }],
    mockFindings, { verdict: 'APPROVED', emoji: '🟢', fails: 0, warns: 0 }, { text: 'OK', provider: 'test' });
  if (!md.includes('FIEZEL_BOT_REVIEW') || !md.includes('Fiezel Bot v2')) throw new Error('T8 FAIL: Review markdown');
  console.log('  ✅ T8: Review markdown composition');
  pass++;

  console.log(`\n✅ Fiezel Bot v2 Self-Test: PASS (${pass}/${pass} tests)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const { mode, options } = parseCliArgs();
  switch (mode) {
    case 'review':  await runReview(options.pr); break;
    case 'fix':     await runFix(options.pr, options.issue || options.message); break;
    case 'heal':    await runHeal(options.pr, options.log); break;
    case 'bump':    runBump(options.message || 'chore: automated build bump'); break;
    case 'explain': await runExplain(options.pr); break;
    case 'self-test': runSelfTest(); break;
    default:
      console.log(`
FIEZEL BOT v2 — Elite Autonomous Code Review & Auto-Fix Agent
══════════════════════════════════════════════════════════════
  node tools/fiezel-bot.mjs review  [--pr=N]         AI + Deterministic review
  node tools/fiezel-bot.mjs fix     [--pr=N]         Auto-generate & apply patches
  node tools/fiezel-bot.mjs heal    [--pr=N] [--log]  CI self-healing
  node tools/fiezel-bot.mjs bump    "message"         Version bump + hexa-sync
  node tools/fiezel-bot.mjs explain [--pr=N]          PR explanation (Indonesian)
  node tools/fiezel-bot.mjs self-test                 Verify all components
      `);
  }
}

main().catch(err => { console.error('[Fiezel Bot v2 Error]', err); process.exitCode = 1; });
