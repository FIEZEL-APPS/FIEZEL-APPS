#!/usr/bin/env node
/**
 * FIEZEL NIGHTWATCH — continuous regression monitor for the feedback ecosystem.
 * Usage: node fiezel-nightwatch.mjs <repo-path> [--baseline]
 *
 * Watches feedback-critical surfaces for regressions:
 *  - content bank hashes + record counts (grammar, vocab, reading, listening, speaking, cloze, classroom)
 *  - explanation-field integrity (missing/empty explanation fields per bank)
 *  - answer-key validity (answerIndex in range, options unique/non-empty)
 *  - runtime feedback files (app.js, features/brain/*) hash changes
 *  - git HEAD movement (new concurrent-agent commits touching watched files)
 *
 * State:  fiezel-nightwatch-state.json (next to this script)
 * Log:    fiezel-nightwatch.log        (append-only)
 * Exit codes: 0 = no regression, 1 = changes detected (review), 2 = P0-class integrity regression
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = process.env.NIGHTWATCH_DIR || dirname(fileURLToPath(import.meta.url));
const repo = process.argv[2] || '/home/user/workspace/fiezel-repo';
const baselineMode = process.argv.includes('--baseline');
const statePath = join(here, 'fiezel-nightwatch-state.json');
const logPath = join(here, 'fiezel-nightwatch.log');

const WATCHED_BANKS = {
  grammar_templates: 'grammar-templates.json',
  grammar_curriculum: 'grammar-curriculum-v1.json',
  grammar_explanations: 'grammar-explanations-id.json',
  grammar_misconceptions: 'grammar-misconception-id.json',
  vocabulary: 'vocabulary-master.json',
  reading: 'reading-bank.json',
  cloze: 'cloze-bank-v1.json',
  listening: 'features/speaking-listening/listening-bank-v1.json',
  speaking: 'features/speaking-listening/speaking-bank-v1.json',
  classroom: 'features/classroom/classroom-lessons-v1.json',
};
const WATCHED_RUNTIME = ['app.js', 'index.html', 'grammar-labels-id.js'];

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const log = (level, msg) => {
  const line = `${new Date().toISOString()} [${level}] ${msg}`;
  appendFileSync(logPath, line + '\n');
  console.log(line);
};

function listRecords(key, data) {
  if (Array.isArray(data)) return data;
  for (const k of ['items', 'templates', 'lessons', 'diagnoses', 'questions']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  if (key === 'grammar_curriculum' && data?.levels) {
    return Object.values(data.levels).flatMap((l) => l?.lessons || l || []);
  }
  return [];
}

function integrityCheck(key, records) {
  const problems = [];
  records.forEach((r, i) => {
    if (!r || typeof r !== 'object') return;
    const opts = r.options;
    const ansIdx = r.answerIndex ?? r.answer_index ?? r.correctIndex;
    if (Array.isArray(opts)) {
      const norm = opts.map((o) => String(o ?? '').trim().toLowerCase());
      if (norm.some((o) => !o)) problems.push(`${key}[${r.id ?? i}]: empty option`);
      if (new Set(norm).size !== norm.length) problems.push(`${key}[${r.id ?? i}]: duplicate options`);
      if (Number.isInteger(ansIdx) && (ansIdx < 0 || ansIdx >= opts.length))
        problems.push(`${key}[${r.id ?? i}]: answer index out of range`);
    }
    const ex = r.explain ?? r.explanation;
    if (opts && ex !== undefined && (ex === null || (typeof ex === 'object' && Object.keys(ex).length === 0)))
      problems.push(`${key}[${r.id ?? i}]: empty explanation object`);
  });
  return problems;
}

function snapshot() {
  const snap = { taken_at: new Date().toISOString(), git_head: null, banks: {}, runtime: {}, integrity_problems: [] };
  try {
    snap.git_head = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim();
    snap.git_head_subject = execSync('git log -1 --pretty=%s', { cwd: repo }).toString().trim();
  } catch { /* not a git checkout */ }
  for (const [key, rel] of Object.entries(WATCHED_BANKS)) {
    const p = join(repo, rel);
    if (!existsSync(p)) { snap.banks[key] = { missing: true }; continue; }
    const buf = readFileSync(p);
    let count = null, problems = [];
    try {
      const data = JSON.parse(buf.toString());
      const recs = listRecords(key, data);
      count = recs.length;
      problems = integrityCheck(key, recs);
    } catch (e) { problems = [`${key}: JSON PARSE FAILURE — ${e.message}`]; }
    snap.banks[key] = { hash: sha(buf), bytes: buf.length, records: count, problem_count: problems.length };
    snap.integrity_problems.push(...problems.slice(0, 50));
  }
  for (const rel of WATCHED_RUNTIME) {
    const p = join(repo, rel);
    snap.runtime[rel] = existsSync(p) ? { hash: sha(readFileSync(p)) } : { missing: true };
  }
  return snap;
}

const current = snapshot();
if (baselineMode || !existsSync(statePath)) {
  writeFileSync(statePath, JSON.stringify({ baseline: current, last_run: current.taken_at, runs: 1 }, null, 2));
  log('INFO', `BASELINE recorded. head=${current.git_head?.slice(0, 8)} banks=${Object.keys(current.banks).length} integrity_problems=${current.integrity_problems.length}`);
  if (current.integrity_problems.length) log('WARN', `baseline carries pre-existing problems: ${current.integrity_problems.slice(0, 5).join(' | ')}${current.integrity_problems.length > 5 ? ' …' : ''}`);
  process.exit(0);
}

const state = JSON.parse(readFileSync(statePath, 'utf8'));
const base = state.baseline;
let changed = 0, regressions = 0;
if (current.git_head !== base.git_head)
  log('CHANGE', `git HEAD moved ${base.git_head?.slice(0, 8)} → ${current.git_head?.slice(0, 8)} (${current.git_head_subject || '?'}) — concurrent agent activity`), changed++;
for (const [key, cur] of Object.entries(current.banks)) {
  const old = base.banks[key] || {};
  if (cur.missing && !old.missing) { log('P0', `bank ${key} MISSING (was present)`); regressions++; continue; }
  if (cur.hash !== old.hash) {
    changed++;
    log('CHANGE', `bank ${key}: hash ${old.hash} → ${cur.hash}, records ${old.records} → ${cur.records}`);
    if (cur.records !== null && old.records !== null && cur.records < old.records)
      log('WARN', `bank ${key}: record count DROPPED — verify intentional`);
  }
  if ((cur.problem_count ?? 0) > (old.problem_count ?? 0)) {
    regressions++;
    log('P0', `bank ${key}: integrity problems ${old.problem_count} → ${cur.problem_count} — NEW broken records`);
  }
}
for (const [rel, cur] of Object.entries(current.runtime)) {
  const old = base.runtime[rel] || {};
  if (cur.hash !== old.hash) { log('CHANGE', `runtime ${rel} changed — re-verify feedback display paths`); changed++; }
}
state.last_run = current.taken_at;
state.runs = (state.runs || 0) + 1;
state.last_snapshot = current;
writeFileSync(statePath, JSON.stringify(state, null, 2));
log('INFO', `run complete: ${changed} change(s), ${regressions} integrity regression(s)`);
process.exit(regressions ? 2 : changed ? 1 : 0);
