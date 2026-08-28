#!/usr/bin/env node
// FIEZEL NIGHT WATCH — continuous assessment-content quality monitor.
// DETECT -> CLASSIFY -> REPORT -> (never auto-fix). Alerts: NIGHT_WATCH_ALERT_P0..P3.
// State: fiezel-night-watch-state.json (repo root). Log: fiezel-night-watch.log (append-only).
// Usage: node tools/fiezel-night-watch.mjs [--init]
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE = path.join(root, 'fiezel-night-watch-state.json');
const LOG = path.join(root, 'fiezel-night-watch.log');
const now = () => new Date().toISOString();
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const J = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const alerts = [];
const alert = (sev, code, detail) => alerts.push({ level: `NIGHT_WATCH_ALERT_${sev}`, code, detail });

function snapshot() {
  const g = J('grammar-templates.json');
  const cz = J('cloze-bank-v1.json');
  const rd = J('reading-bank.json');
  const ls = J('features/speaking-listening/listening-bank-v1.json');
  const banks = {};
  for (const f of ['grammar-templates.json','grammar-explanations-id.json','grammar-misconception-id.json','misconception-taxonomy-v1.json','grammar-curriculum-v1.json','cloze-bank-v1.json','cloze-alternates-v1.json','vocabulary-master.json','reading-bank.json','reading-exam-v1.json','features/speaking-listening/listening-bank-v1.json','features/speaking-listening/listening-exam-v1.json','features/speaking-listening/speaking-exam-v1.json','audio/manifest.json'])
    if (fs.existsSync(path.join(root, f))) banks[f] = sha(path.join(root, f));
  const cefr = {}; for (const t of g.templates) cefr[t.cefr] = (cefr[t.cefr] || 0) + 1;
  return {
    at: now(), banks,
    grammar: { count: g.templates.length, declared: g.count, ids: g.templates.map(t => t.id).sort(),
      keys: Object.fromEntries(g.templates.map(t => [t.id, sha256s(t.stem + '||' + t.options[t.correctIndex])])), cefr },
    cloze: { items: cz.items.length, rejected: cz.rejected.length,
      answers: Object.fromEntries(cz.items.map(i => [i.id, sha256s(i.blank.answer + '|' + (i.blank.alternates || []).join('|'))])) },
    reading: { passages: rd.length, questions: rd.reduce((a, p) => a + p.qs.length, 0),
      keys: Object.fromEntries(rd.map(p => [p.id, sha256s(p.qs.map(q => q[2]).join(','))])) },
    listening: { count: ls.items.length, declared: ls.count },
  };
}
const sha256s = s => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 12);

function runGate(cmd, name) {
  try { execSync(cmd, { cwd: root, stdio: 'pipe', timeout: 300000 }); return { name, pass: true }; }
  catch (e) { alert('P0', 'GATE_FAIL', `${name} exited non-zero: ${String(e.stdout || e.message).slice(-300)}`); return { name, pass: false }; }
}

const init = process.argv.includes('--init');
const prev = !init && fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : null;
const cur = snapshot();

if (prev) {
  const p = prev.snapshot, c = cur;
  // Question-count regressions
  if (c.grammar.count < p.grammar.count) alert('P0', 'GRAMMAR_COUNT_DROP', `${p.grammar.count} -> ${c.grammar.count}`);
  if (c.grammar.count !== c.grammar.declared) alert('P0', 'GRAMMAR_DECLARED_MISMATCH', `declared ${c.grammar.declared} actual ${c.grammar.count}`);
  if (c.reading.questions !== p.reading.questions) alert('P1', 'READING_QUESTION_COUNT_CHANGE', `${p.reading.questions} -> ${c.reading.questions}`);
  if (c.listening.count < p.listening.count) alert('P1', 'LISTENING_COUNT_DROP', `${p.listening.count} -> ${c.listening.count}`);
  if (c.cloze.items < p.cloze.items) alert('P1', 'CLOZE_COUNT_DROP', `${p.cloze.items} -> ${c.cloze.items}`);
  // ID contract
  const removed = p.grammar.ids.filter(id => !c.grammar.ids.includes(id));
  if (removed.length) alert('P0', 'GRAMMAR_ID_REMOVED', removed.join(','));
  const dupes = c.grammar.ids.filter((id, i, a) => a.indexOf(id) !== i);
  if (dupes.length) alert('P0', 'DUPLICATE_ID', dupes.join(','));
  // Answer-key changes (legit only via reviewed release; always surface)
  for (const [id, h] of Object.entries(c.grammar.keys)) if (p.grammar.keys[id] && p.grammar.keys[id] !== h) alert('P1', 'GRAMMAR_KEY_OR_STEM_CHANGED', id);
  for (const [id, h] of Object.entries(c.cloze.answers)) if (p.cloze.answers[id] && p.cloze.answers[id] !== h) alert('P1', 'CLOZE_ANSWER_CHANGED', id);
  for (const [id, h] of Object.entries(c.reading.keys)) if (p.reading.keys[id] && p.reading.keys[id] !== h) alert('P1', 'READING_KEYS_CHANGED', id);
  // New content arriving outside a validated release
  const added = c.grammar.ids.filter(id => !p.grammar.ids.includes(id));
  if (added.length) alert('P2', 'NEW_TEMPLATES_DETECTED', `validate before adoption: ${added.join(',')}`);
  const bankChanges = Object.keys(c.banks).filter(f => p.banks[f] && p.banks[f] !== c.banks[f]);
  if (bankChanges.length) alert('P3', 'BANK_HASH_CHANGED', bankChanges.join(','));
}
// Gates run every watch cycle (validation layer)
const gates = [
  runGate('node grammar-quality-audit.js', 'grammar-quality-audit'),
  runGate('node content-integrity-audit.js', 'content-integrity-audit'),
  runGate('node cloze-bank-test.js', 'cloze-bank-test'),
  runGate('node validator.js', 'validator'),
  runGate('node regression-test.js', 'regression-test'),
  runGate('node bank-soal-audit-test.js', 'bank-soal-audit-test'),
];
const status = alerts.some(a => a.level.endsWith('P0')) ? 'ALERT_P0' : alerts.length ? 'ALERTS' : 'CLEAN';
const entry = { at: now(), status, alerts, gates, mode: prev ? 'watch' : 'baseline-init' };
fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
fs.writeFileSync(STATE, JSON.stringify({ updatedAt: now(), snapshot: cur, lastStatus: status }, null, 1));
console.log(`[NIGHT WATCH] ${entry.mode} status=${status} alerts=${alerts.length} gates=${gates.filter(g => g.pass).length}/${gates.length} pass`);
for (const a of alerts) console.log(` ${a.level} ${a.code}: ${a.detail}`);
process.exit(status === 'ALERT_P0' ? 2 : 0);
