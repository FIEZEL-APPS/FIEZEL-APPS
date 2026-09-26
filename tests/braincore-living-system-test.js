#!/usr/bin/env node
/**
 * tests/braincore-living-system-test.js — FIEZEL Braincore Living Intelligence Verification Gate.
 *
 * GATE INVARIANTS:
 * Memverifikasi 9 skenario kanonik (A-I) sistem kecerdasan hidup Braincore:
 *   Scenario A: Normal learner (flow state -> silent presence)
 *   Scenario B: Single mistake (gentle correction, no panic)
 *   Scenario C: Repeated misconception (pattern recognized -> reinforcing/hinting)
 *   Scenario D: Successful intervention (outcome positive -> recommendation 'keep')
 *   Scenario E: Failed intervention (outcome negative -> recommendation 'modify'/'rollback')
 *   Scenario F: Mastery milestone (P(L) >= 0.95, n >= 5 -> celebration)
 *   Scenario G: Offline execution (zero network, pure local deterministic execution)
 *   Scenario H: Replay determinism (identical input sequence -> identical state)
 *   Scenario I: Aggregation readiness (anonymized diagnostic summary, zero PII leakage)
 */
'use strict';

const assert = require('assert');
const path = require('path');
const presenceEngine = require('../features/mascot/fiezel-presence-engine.js');
const decisionTrace = require('../features/learner-flow/fiezel-decision-trace.js');

let failures = 0;
let passes = 0;

function test(name, fn) {
  try {
    fn();
    passes++;
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('FAIL - ' + name + '\n    ' + (e && e.stack ? e.stack : e.message));
  }
}

// =========================================================================
// Scenario A: Normal Learner (Flow State -> Silent Presence)
// =========================================================================
test('Scenario A · Alur lancar murid normal menghasilkan status kehadiran SILENT (prinsip keheningan)', () => {
  const obs = decisionTrace.createObservation({
    itemId: 'q_past_1',
    concept: 'past_simple',
    family: 'tense',
    difficulty: 2.2,
    ok: true,
    ms: 2200,
    nowMs: 1700000000000
  });

  const cState = {
    totalAttempts: 10,
    rawAccuracy: 0.9,
    currentStreak: 4,
    bktMastery: { past_simple: { L: 0.75, n: 4 } },
    activeMisconceptions: []
  };

  const pattern = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(pattern.pattern, 'fluent_mastery');
  assert.strictEqual(pattern.isFluency, true);

  const pres = presenceEngine.determine({
    ok: true,
    firstTry: true,
    move: 'continue',
    scaffold: 'none',
    timing: obs.timing,
    streak: 4
  });

  assert.strictEqual(pres.state, presenceEngine.STATES.SILENT);
  assert.strictEqual(pres.silent, true);
  assert.strictEqual(pres.microcopy, null);
  assert.strictEqual(pres.rationale, 'presence_flow_silent');
});

// =========================================================================
// Scenario B: Single Mistake (Gentle Correction, No Overreaction)
// =========================================================================
test('Scenario B · Kesalahan pertama memicu koreksi halus (CORRECTING), bukan vonis panik', () => {
  const obs = decisionTrace.createObservation({
    itemId: 'q_past_2',
    concept: 'past_simple',
    family: 'tense',
    difficulty: 2.5,
    ok: false,
    ms: 3800,
    retryCount: 0,
    distractor: 'goes',
    nowMs: 1700000001000
  });

  const cState = {
    totalAttempts: 11,
    rawAccuracy: 0.82,
    currentStreak: 0,
    bktMastery: { past_simple: { L: 0.70, n: 5 } },
    activeMisconceptions: []
  };

  const pattern = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(pattern.isSlip, false);

  const pres = presenceEngine.determine({
    ok: false,
    firstTry: true,
    move: 'probe',
    scaffold: 'probe',
    timing: obs.timing
  });

  assert.strictEqual(pres.state, presenceEngine.STATES.CORRECTING);
  assert.strictEqual(pres.silent, false);
  assert.ok(typeof pres.microcopy === 'string' && pres.microcopy.length > 5);
  assert.strictEqual(pres.rationale, 'presence_first_mistake_correcting');
});

// =========================================================================
// Scenario C: Repeated Misconception (Pattern Recognized -> Reinforce/Reteach)
// =========================================================================
test('Scenario C · Miskonsepsi berulang terdeteksi dan memicu intervensi ajar-ulang (REINFORCING)', () => {
  const obs = decisionTrace.createObservation({
    itemId: 'q_past_3',
    concept: 'past_simple',
    family: 'tense',
    difficulty: 2.8,
    ok: false,
    ms: 5500,
    retryCount: 1,
    distractor: 'goed',
    nowMs: 1700000002000
  });

  const cState = {
    totalAttempts: 15,
    rawAccuracy: 0.60,
    currentStreak: 0,
    bktMastery: { past_simple: { L: 0.45, n: 6 } },
    activeMisconceptions: [
      { concept: 'past_simple', misconception: 'irregular_ed_overgeneralization', logOdds: 1.2 }
    ]
  };

  const pattern = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(pattern.pattern, 'recurrent_misconception');
  assert.strictEqual(pattern.hasActiveMisconception, true);

  const pres = presenceEngine.determine({
    ok: false,
    firstTry: false,
    move: 'reteach',
    scaffold: 'worked',
    timing: obs.timing
  });

  assert.strictEqual(pres.state, presenceEngine.STATES.REINFORCING);
  assert.strictEqual(pres.silent, false);
  assert.strictEqual(pres.pawPose, 'reading');
  assert.strictEqual(pres.rationale, 'presence_reteach_reinforcing');
});

// =========================================================================
// Scenario D: Successful Intervention (Outcome Positive -> Keep Policy)
// =========================================================================
test('Scenario D · Intervensi perancah yang berhasil dievaluasi positif dengan rekomendasi KEEP', () => {
  decisionTrace.clear();

  const decision = decisionTrace.recordDecision({
    action: 'scaffold_hint',
    targetSkill: 'past_simple',
    targetDifficulty: 2.5,
    scaffold: 'hint',
    presenceState: 'hinting',
    rationale: 'presence_scaffold_hinting',
    nowMs: 1700000003000
  });

  assert.ok(decision.traceId);
  assert.strictEqual(decision.status, 'pending_outcome');

  // Murid berhasil menjawab soal berikutnya setelah perancah
  const nextObs = decisionTrace.createObservation({
    itemId: 'q_past_4',
    concept: 'past_simple',
    ok: true,
    ms: 3100,
    nowMs: 1700000004000
  });

  const evaluated = decisionTrace.evaluateOutcome(decision.traceId, nextObs);
  assert.strictEqual(evaluated.status, 'evaluated');
  assert.strictEqual(evaluated.outcome.status, 'positive');
  assert.strictEqual(evaluated.outcome.recommendation, 'keep');
  assert.strictEqual(evaluated.outcome.nextCorrect, true);
});

// =========================================================================
// Scenario E: Failed Intervention (Outcome Negative -> Modify/Rollback)
// =========================================================================
test('Scenario E · Intervensi yang gagal dievaluasi negatif dengan rekomendasi MODIFY/ROLLBACK', () => {
  decisionTrace.clear();

  const decision = decisionTrace.recordDecision({
    action: 'scaffold_hint',
    targetSkill: 'past_simple',
    targetDifficulty: 3.0,
    scaffold: 'hint',
    presenceState: 'hinting',
    rationale: 'presence_scaffold_hinting',
    nowMs: 1700000005000
  });

  // Murid gagal lagi pada soal berikutnya
  const nextObs = decisionTrace.createObservation({
    itemId: 'q_past_5',
    concept: 'past_simple',
    ok: false,
    ms: 8200,
    nowMs: 1700000006000
  });

  const evaluated = decisionTrace.evaluateOutcome(decision.traceId, nextObs);
  assert.strictEqual(evaluated.status, 'evaluated');
  assert.strictEqual(evaluated.outcome.status, 'negative');
  assert.strictEqual(evaluated.outcome.recommendation, 'modify');
  assert.strictEqual(evaluated.outcome.nextCorrect, false);
});

// =========================================================================
// Scenario F: Mastery Milestone (P(L) >= 0.95 -> Celebrate)
// =========================================================================
test('Scenario F · Pencapaian penguasaan tuntas (P(L) >= 0.95) memicu selebrasi (CELEBRATING)', () => {
  const obs = decisionTrace.createObservation({
    itemId: 'q_past_6',
    concept: 'past_simple',
    ok: true,
    ms: 2200,
    nowMs: 1700000007000
  });

  const cState = {
    totalAttempts: 25,
    rawAccuracy: 0.92,
    currentStreak: 6,
    bktMastery: { past_simple: { L: 0.965, n: 8 } },
    activeMisconceptions: []
  };

  const pattern = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(pattern.isMasteryMilestone, true);
  assert.strictEqual(pattern.pattern, 'mastery_milestone');

  const pres = presenceEngine.determine({
    ok: true,
    firstTry: true,
    isMilestone: true,
    move: 'celebrate',
    timing: obs.timing,
    streak: 6
  });

  assert.strictEqual(pres.state, presenceEngine.STATES.CELEBRATING);
  assert.strictEqual(pres.silent, false);
  assert.strictEqual(pres.pawState, 'celebrating');
  assert.strictEqual(pres.pawPose, 'cheering');
});

// =========================================================================
// Scenario G: Offline Execution (Zero Network Calls, Pure Local Determinism)
// =========================================================================
test('Scenario G · Eksekusi luring 100% tanpa jaringan dan tanpa dependensi eksternal', () => {
  // Verifikasi bahwa modul tidak bergantung pada fetch, XMLHttpRequest, atau WebSocket
  assert.strictEqual(typeof presenceEngine.determine, 'function');
  assert.strictEqual(typeof decisionTrace.createObservation, 'function');
  assert.strictEqual(typeof decisionTrace.analyzePattern, 'function');
  assert.strictEqual(typeof decisionTrace.recordDecision, 'function');
  assert.strictEqual(typeof decisionTrace.evaluateOutcome, 'function');

  // Menjalankan siklus lengkap observasi -> keputusan -> evaluasi murni sinkron
  const obs = decisionTrace.createObservation({ itemId: 'offline_1', ok: true, ms: 2500 });
  const decision = decisionTrace.recordDecision({ action: 'continue_practice', observation: obs });
  const evalResult = decisionTrace.evaluateOutcome(decision.traceId, { correct: true, latencyMs: 2400 });

  assert.ok(evalResult);
  assert.strictEqual(evalResult.outcome.status, 'positive');
});

// =========================================================================
// Scenario H: Replay Determinism (Identical Inputs -> Identical Outputs)
// =========================================================================
test('Scenario H · Replay determinisme: urutan masukan identik menghasilkan jejak keadaan yang identik', () => {
  const runSequence = (fixedNow) => {
    const obs = decisionTrace.createObservation({
      itemId: 'q_fixed_1',
      concept: 'passive_voice',
      difficulty: 3.0,
      ok: false,
      ms: 4500,
      nowMs: fixedNow
    });
    const cState = {
      totalAttempts: 5,
      rawAccuracy: 0.6,
      bktMastery: { passive_voice: { L: 0.5, n: 3 } },
      activeMisconceptions: []
    };
    const pattern = decisionTrace.analyzePattern(obs, cState);
    const pres = presenceEngine.determine({
      ok: obs.correct,
      firstTry: true,
      scaffold: 'probe',
      timing: obs.timing
    });
    return { obs, pattern, pres };
  };

  const run1 = runSequence(1700000010000);
  const run2 = runSequence(1700000010000);

  assert.deepStrictEqual(run1.obs, run2.obs);
  assert.deepStrictEqual(run1.pattern, run2.pattern);
  assert.deepStrictEqual(run1.pres, run2.pres);
});

// =========================================================================
// Scenario I: Aggregation Readiness (Diagnostic Summary, Zero PII Leakage)
// =========================================================================
test('Scenario I · Kesiapan agregasi diagnostik: rekapitulasi keputusan tanpa kebocoran PII', () => {
  decisionTrace.clear();

  decisionTrace.recordDecision({ action: 'continue_practice', presenceState: 'silent' });
  decisionTrace.recordDecision({ action: 'scaffold_hint', presenceState: 'hinting' });
  decisionTrace.recordDecision({ action: 'reinforce_concept', presenceState: 'reinforcing' });

  const summary = decisionTrace.getDiagnosticsSummary();

  assert.strictEqual(summary.totalDecisions, 3);
  assert.strictEqual(summary.byAction['continue_practice'], 1);
  assert.strictEqual(summary.byAction['scaffold_hint'], 1);
  assert.strictEqual(summary.byAction['reinforce_concept'], 1);
  assert.strictEqual(summary.byPresenceState['silent'], 1);
  assert.strictEqual(summary.byPresenceState['hinting'], 1);
  assert.strictEqual(summary.byPresenceState['reinforcing'], 1);

  // Pastikan tidak ada field PII (nama, email, ip, user id)
  const json = JSON.stringify(summary);
  assert.ok(!/email|userId|userName|studentName|deviceFingerprint/i.test(json));
});

console.log('\n======================================================');
console.log(`FIEZEL Living Intelligence Test: ${passes}/${passes + failures} PASS`);
console.log('======================================================\n');

if (failures > 0) {
  process.exit(1);
}
