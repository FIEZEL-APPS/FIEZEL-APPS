#!/usr/bin/env node
/**
 * tools/dev/braincore-audit-2026-09-26-probe.js — bukti yang bisa diulang untuk
 * reports/BRAINCORE-AUDIT-2026-09-26.md. BUKAN gerbang: mencetak angka, selalu exit 0.
 *
 *   node tools/dev/braincore-audit-2026-09-26-probe.js
 *
 * P1  FiezelDecisionTrace menaikkan difficulty.targetSuccess hidup ke 0.90 dalam puluhan
 *     jawaban (pola panggil app.js: jawaban pertama -> evaluateOutcome jejak sebelumnya ->
 *     recordDecision; salah pertama diikuti percobaan ulang).
 * P2  FiezelPolicyVerdict untuk lengan kandidat SATU sesi (<=16 soal) selalu 'hold'
 *     (stat-gate minNPerArm=25), apa pun hasilnya.
 * P3  reviewPriority: materi runtuh (r<=0.1) tetap di bawah materi yang baru dilihat.
 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

// ---- P1 ------------------------------------------------------------------------------
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const DT = require(path.join(ROOT, 'features', 'learner-flow', 'fiezel-decision-trace.js'));
function lcg(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function ratchet(pFirst, pRetry, n, seed) {
  for (const k of Object.keys(store)) delete store[k];
  const rnd = lcg(seed);
  let last = null, cap = -1, tail = 0;
  const step = (i, ok, retry) => {
    const obs = DT.createObservation({ itemId: 'q' + i, concept: 'c', ok, ms: 3000 + rnd() * 4000, retryCount: retry ? 1 : 0, nowMs: 1e12 + i * 1e4 });
    if (last) { DT.evaluateOutcome(last, obs); last = null; }
    last = DT.recordDecision({ action: ok ? 'continue_practice' : 'scaffold_hint', observation: obs, nowMs: 1e12 + i * 1e4, seed: i }).traceId;
  };
  for (let i = 0; i < n; i++) {
    const ok = rnd() < pFirst;
    step(i, ok, false);
    if (!ok) step(i, rnd() < pRetry, true);
    const t = DT.readParams()['difficulty.targetSuccess'];
    if (cap < 0 && t >= 0.9) cap = i + 1;
    if (i >= n / 2) tail += t / (n / 2);
  }
  return { cap, tail };
}
console.log('P1 · targetSuccess hidup (bawaan 0.80, batas 0.90), 200 run x 100 jawaban per profil');
for (const [pf, pr] of [[0.85, 0.8], [0.8, 0.75], [0.7, 0.65], [0.6, 0.6], [0.45, 0.5]]) {
  const runs = [];
  for (let s = 1; s <= 200; s++) runs.push(ratchet(pf, pr, 100, s * 7919));
  const hit = runs.map((r) => r.cap).filter((c) => c > 0).sort((a, b) => a - b);
  const tail = runs.reduce((a, r) => a + r.tail, 0) / runs.length;
  console.log('  akurasi percobaan pertama ' + pf + ': mentok 0.90 pada ' + Math.round(100 * hit.length / runs.length) +
    '% run, median jawaban #' + (hit.length ? hit[Math.floor(hit.length / 2)] : '-') +
    '; rerata targetSuccess jawaban 51-100 = ' + tail.toFixed(3));
}

// ---- P2 ------------------------------------------------------------------------------
const V = require(path.join(ROOT, 'features', 'brain', 'fiezel-policy-verdict.js'));
console.log('\nP2 · verdict kebijakan dengan kandidat satu sesi');
for (const [c, k] of [[{ n: 200, ok: 150 }, { n: 16, ok: 16 }], [{ n: 200, ok: 150 }, { n: 16, ok: 3 }], [{ n: 40, ok: 28 }, { n: 12, ok: 12 }]]) {
  const v = V.verdict({ control: c, candidate: k });
  console.log('  kontrol ' + c.ok + '/' + c.n + ' vs kandidat ' + k.ok + '/' + k.n + ' -> ' + v.decision + ' (' + v.basis + ')');
}

// ---- P3 ------------------------------------------------------------------------------
const B = require(path.join(ROOT, 'features', 'brain', 'fiezel-core-brain.js'));
const NOW = 1e12, DAY = 86400000;
console.log('\nP3 · reviewPriority (halfLife 10 hari)');
const ranked = B.reviewPriority([
  { id: 'baru-dilihat', halfLifeDays: 10, lastSeenAt: NOW - 0.2 * DAY },
  { id: 'kemarin', halfLifeDays: 10, lastSeenAt: NOW - 1 * DAY },
  { id: 'ambang-lupa', halfLifeDays: 10, lastSeenAt: NOW - 4.15 * DAY },
  { id: 'runtuh-r0.10', halfLifeDays: 10, lastSeenAt: NOW - 33 * DAY },
  { id: 'runtuh-r0.03', halfLifeDays: 10, lastSeenAt: NOW - 50.6 * DAY }
], { now: NOW });
ranked.forEach((r, i) => console.log('  #' + (i + 1) + ' ' + r.id + '  r=' + r.retrievability + '  skor=' + r.score));
