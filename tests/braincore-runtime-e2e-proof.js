#!/usr/bin/env node
/**
 * tests/braincore-runtime-e2e-proof.js — Runtime Integration & End-to-End Proof Gate.
 *
 * GATE CONTRACT:
 * Memverifikasi 10 invarian lingkaran penuh alur belajar produksi FIEZEL:
 *   1. normal correct answer -> Braincore stays quiet (SILENT)
 *   2. single mistake -> gentle correction (CORRECTING, no reveal, retry enabled)
 *   3. repeated misconception -> strategy changes (reteach card, forceConcept, REINFORCING)
 *   4. intervention -> learner improves (subsequent success -> evaluateOutcome: 'keep')
 *   5. intervention fails -> rollback recommended in the trace, parameters untouched (tuner off, OWNER 2026-09-26), CONCERNED
 *   6. mastery -> intervention fades and challenge increases (mastery_milestone -> CELEBRATING, avoidConcept)
 *   7. identical event stream -> identical Braincore result (replay determinism)
 *   8. offline execution -> core loop still works (zero network dependencies)
 *   9. decision -> evidence trace (tamper-evident 64-bit cryptographic chaining & verifyLedger)
 *  10. evidence -> subsequent Braincore behavior (evidence raises ability; same 0.80 target picks a harder next item)
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');

// Muat modul-modul produksi inti
const coreBrain = require(path.join(root, 'features/brain/fiezel-core-brain.js'));
const tutorBrain = require(path.join(root, 'features/brain/fiezel-tutor-brain.js'));
const presenceEngine = require(path.join(root, 'features/mascot/fiezel-presence-engine.js'));
const decisionTrace = require(path.join(root, 'features/learner-flow/fiezel-decision-trace.js'));

let passes = 0;
let failures = 0;

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
// SIKLUS ALUR BELAJAR PRODUKSI LENGKAP
// learner answer -> observation -> learner state update -> neural understanding ->
// Braincore decision -> learning action -> Presence Engine -> PAW ->
// outcome -> evaluation -> keep/modify/rollback -> evidence
// =========================================================================

console.log('======================================================================');
console.log(' FIEZEL BRAINCORE RUNTIME INTEGRATION & END-TO-END PROOF AUDIT');
console.log('======================================================================\n');

// -------------------------------------------------------------------------
// Invariant 1: Normal Correct Answer -> Braincore Stays Quiet (SILENT in Flow)
// -------------------------------------------------------------------------
test('Invariant 1 · Normal correct answer -> Braincore stays quiet (prinsip keheningan flow)', () => {
  decisionTrace.clear();

  const q = {
    id: 'item_past_01',
    concept: 'past_simple',
    family: 'tense',
    difficulty: 2.2,
    answerIndex: 0,
    options: ['walked', 'walks', 'walking', 'walk']
  };

  // 1. Learner Answer
  const j = 0; // Murid memilih 'walked' (benar)
  const ok = (j === q.answerIndex);
  const ms = 2100;
  const firstTry = true;

  // 2. Observation
  const obs = decisionTrace.createObservation({
    itemId: q.id,
    concept: q.concept,
    family: q.family,
    difficulty: q.difficulty,
    ok: ok,
    ms: ms,
    nowMs: 1710000000000
  });
  assert.strictEqual(obs.timing, 'fluent');
  assert.strictEqual(obs.correct, true);

  // 3. Learner State Update
  const cState = {
    totalAttempts: 5,
    rawAccuracy: 1.0,
    currentStreak: 3,
    bktMastery: { past_simple: { L: 0.70, n: 3 } },
    activeMisconceptions: []
  };

  // 4. Neural Understanding
  const understanding = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(understanding.pattern, 'fluent_mastery');
  assert.strictEqual(understanding.isFluency, true);

  // 5. Braincore Decision
  const pAction = 'continue_practice';
  const dec = decisionTrace.recordDecision({
    action: pAction,
    targetSkill: q.concept,
    targetDifficulty: q.difficulty,
    scaffold: 'none',
    presenceState: 'silent',
    rationale: 'presence_flow_silent',
    observation: obs,
    understanding: understanding,
    nowMs: obs.timestamp
  });
  assert.strictEqual(dec.action, 'continue_practice');
  assert.strictEqual(dec.status, 'pending_outcome');

  // 6. Presence Engine & PAW Face
  const pres = presenceEngine.determine({
    ok: ok,
    firstTry: firstTry,
    move: 'continue',
    scaffold: 'none',
    timing: obs.timing,
    streak: 3
  });
  assert.strictEqual(pres.state, presenceEngine.STATES.SILENT);
  assert.strictEqual(pres.silent, true);
  assert.strictEqual(pres.microcopy, null);
  assert.strictEqual(pres.pawPose, 'studying');
});

// -------------------------------------------------------------------------
// Invariant 2: Single Mistake -> Gentle Correction (No Panic, Retry Enabled)
// -------------------------------------------------------------------------
test('Invariant 2 · Single mistake -> Gentle correction (CORRECTING, no reveal, retry enabled)', () => {
  const q = {
    id: 'item_past_02',
    concept: 'past_simple',
    family: 'tense',
    difficulty: 2.4,
    answerIndex: 0,
    options: ['went', 'goes', 'gone', 'going']
  };

  // 1. Learner Answer
  const j = 1; // Salah ('goes')
  const ok = (j === q.answerIndex);
  const ms = 3400;
  const firstTry = true;

  // 2. Observation
  const obs = decisionTrace.createObservation({
    itemId: q.id,
    concept: q.concept,
    difficulty: q.difficulty,
    ok: ok,
    ms: ms,
    distractor: 'goes',
    retryCount: 0,
    nowMs: 1710000010000
  });

  // 3. Neural Understanding
  const understanding = decisionTrace.analyzePattern(obs, {
    totalAttempts: 6,
    bktMastery: { past_simple: { L: 0.65, n: 4 } },
    activeMisconceptions: []
  });
  assert.strictEqual(understanding.pattern, 'cognitive_struggle');

  // 4. Braincore Learning Action: Ladder starts at probe/hint, NOT tell
  const ladderLevel = tutorBrain.scaffoldLevel({ priorMisses: 0, mastery: 70, misconceptionRepeats: 0 });
  assert.strictEqual(ladderLevel, 'probe');

  // 5. Presence Engine: Gentle correction without panic
  const pres = presenceEngine.determine({
    ok: false,
    firstTry: true,
    move: 'probe',
    scaffold: ladderLevel,
    timing: obs.timing
  });
  assert.strictEqual(pres.state, presenceEngine.STATES.CORRECTING);
  assert.strictEqual(pres.silent, false);
  assert.strictEqual(pres.microcopy, 'Hampir tepat. Coba periksa lagi pilihan lainnya.');
});

// -------------------------------------------------------------------------
// Invariant 3: Repeated Misconception -> Strategy Changes (Reteach Card & forceConcept)
// -------------------------------------------------------------------------
test('Invariant 3 · Repeated misconception -> Strategy changes (REINFORCING, teach card, forceConcept)', () => {
  const session = tutorBrain.createSession({ now: 1710000020000, baselineMs: 5000 });
  const map = { 'goed': 'irregular_ed_overgeneralization' };

  // Kesalahan pertama
  tutorBrain.record(session, {
    correct: false,
    chosenOption: 'goed',
    optionMisconceptions: map,
    concept: 'past_irregular',
    ms: 4500,
    now: 1710000020000
  });

  // Kesalahan kedua pada miskonsepsi yang sama
  const diag2 = tutorBrain.record(session, {
    correct: false,
    chosenOption: 'goed',
    optionMisconceptions: map,
    concept: 'past_irregular',
    ms: 5100,
    now: 1710000025000
  });
  assert.strictEqual(diag2.repeats, 2);

  // Keputusan tutor: HARUS 'reteach'
  const decision = tutorBrain.decideMove(session, diag2, { remaining: 5 });
  assert.strictEqual(decision.move, 'reteach', 'Miskonsepsi berulang WAJIB memicu tindakan ajar-ulang');

  // Presence Engine: REINFORCING dengan pose membaca
  const pres = presenceEngine.determine({
    ok: false,
    firstTry: false,
    move: decision.move,
    scaffold: 'worked'
  });
  assert.strictEqual(pres.state, presenceEngine.STATES.REINFORCING);
  assert.strictEqual(pres.pawPose, 'reading');
  assert.strictEqual(pres.microcopy, 'Yuk kita cermati polanya bersama sebelum mencoba lagi.');

  // PROOF OF CHANGED NEXT LEARNING ACTION:
  // forceConcept disetel ke konsep yang baru diajar-ulang, dan item berikutnya HARUS konsep itu
  const candidatePool = [
    { id: 'q_other', concept: 'present_perfect', difficulty: 2.5 },
    { id: 'q_irregular_followup', concept: 'past_irregular', difficulty: 2.4 }
  ];
  const nextItem = tutorBrain.selectNext(candidatePool, session, { forceConcept: 'past_irregular' });
  assert.strictEqual(nextItem.id, 'q_irregular_followup', 'Soal berikutnya WAJIB dipaksa konsep yang barusan diajar-ulang');
});

// -------------------------------------------------------------------------
// Invariant 4: Intervention -> Learner Improves (Evaluate Outcome -> Keep)
// -------------------------------------------------------------------------
test('Invariant 4 · Intervention -> Learner improves (evaluateOutcome: POSITIVE, KEEP)', () => {
  decisionTrace.clear();

  // Rekam intervensi perancah
  const interventionDec = decisionTrace.recordDecision({
    action: 'reinforce_concept',
    targetSkill: 'past_irregular',
    targetDifficulty: 2.4,
    scaffold: 'worked',
    presenceState: 'reinforcing',
    nowMs: 1710000030000
  });

  // Soal berikutnya sesudah intervensi dijawab BENAR
  const followUpObs = decisionTrace.createObservation({
    itemId: 'q_irregular_followup',
    concept: 'past_irregular',
    ok: true,
    ms: 3200,
    nowMs: 1710000040000
  });

  // Evaluasi lingkaran tertutup
  const evalResult = decisionTrace.evaluateOutcome(interventionDec.traceId, followUpObs);
  assert.strictEqual(evalResult.status, 'evaluated');
  assert.strictEqual(evalResult.outcome.status, 'positive');
  assert.strictEqual(evalResult.outcome.recommendation, 'keep');
  assert.strictEqual(evalResult.outcome.nextCorrect, true);
});

// -------------------------------------------------------------------------
// Invariant 5: Intervention Fails -> Strategy Changes / Rollback
// -------------------------------------------------------------------------
test('Invariant 5 · Intervention fails -> rollback recommended, parameters untouched & CONCERNED presence', () => {
  decisionTrace.clear();

  // OWNER 2026-09-26 (m025-375): penyetelan targetSuccess otomatis dimatikan (audit braincore
  // A1). Kegagalan intervensi tetap dievaluasi dan rekomendasinya ('rollback') tetap tercatat
  // di jejak, tetapi tidak ada parameter yang bergeser - dulu invarian ini membuktikan rollback
  // 0.82 -> 0.80, yang hanya ada karena penyetel tanpa pagar lebih dulu menaikkannya.
  assert.strictEqual(decisionTrace.readParams()['difficulty.targetSuccess'], 0.80);

  // Keputusan peningkatan tantangan
  const challengeDec = decisionTrace.recordDecision({
    action: 'increase_challenge',
    targetSkill: 'advanced_inversion',
    targetDifficulty: 3.6,
    nowMs: 1710000050000
  });

  // Murid gagal dengan latensi lambat (kelelahan kognitif)
  const fatigueObs = decisionTrace.createObservation({
    itemId: 'q_adv_1',
    concept: 'advanced_inversion',
    difficulty: 3.6,
    ok: false,
    ms: 12800,
    nowMs: 1710000065000
  });

  // Evaluasi hasil intervensi yang gagal
  const evalResult = decisionTrace.evaluateOutcome(challengeDec.traceId, fatigueObs);
  assert.strictEqual(evalResult.outcome.recommendation, 'rollback');

  // Parameter tidak disentuh: tetap bawaan, tanpa perubahan aktif.
  const postParams = decisionTrace.readParams();
  assert.strictEqual(postParams['difficulty.targetSuccess'], 0.80);
  assert.strictEqual(postParams.activeChange, null);

  // Presence Engine merespons kelelahan murid
  const pres = presenceEngine.determine({
    ok: false,
    firstTry: true,
    isFatigued: true,
    move: 'breathe',
    timing: fatigueObs.timing
  });
  assert.strictEqual(pres.state, presenceEngine.STATES.CONCERNED);
  assert.strictEqual(pres.microcopy, 'Fokusmu sudah luar biasa. Istirahat sejenak bila mulai lelah.');
});

// -------------------------------------------------------------------------
// Invariant 6: Mastery -> Intervention Fades and Challenge Increases
// -------------------------------------------------------------------------
test('Invariant 6 · Mastery milestone -> Intervention fades, CELEBRATING, avoid newly mastered concept', () => {
  const obs = decisionTrace.createObservation({
    itemId: 'q_mastery_01',
    concept: 'passive_voice',
    difficulty: 2.8,
    ok: true,
    ms: 2200,
    nowMs: 1710000070000
  });

  const cState = {
    totalAttempts: 20,
    rawAccuracy: 0.95,
    currentStreak: 6,
    bktMastery: { passive_voice: { L: 0.965, n: 7 } },
    activeMisconceptions: []
  };

  const pattern = decisionTrace.analyzePattern(obs, cState);
  assert.strictEqual(pattern.isMasteryMilestone, true);
  assert.strictEqual(pattern.pattern, 'mastery_milestone');

  // Kehadiran: CELEBRATING
  const pres = presenceEngine.determine({
    ok: true,
    firstTry: true,
    isMilestone: true,
    move: 'celebrate',
    streak: 6
  });
  assert.strictEqual(pres.state, presenceEngine.STATES.CELEBRATING);
  assert.strictEqual(pres.pawPose, 'cheering');

  // PROOF OF CHANGED NEXT LEARNING ACTION:
  // Konsep yang baru saja dikuasai diberi avoidConcept agar tidak membuang giliran murid
  const pool = [
    { id: 'q_passive_dup', concept: 'passive_voice', difficulty: 2.8 },
    { id: 'q_new_challenge', concept: 'relative_clauses', difficulty: 3.0 }
  ];
  const chosen = tutorBrain.selectNext(pool, {}, { avoidConcept: 'passive_voice' });
  assert.strictEqual(chosen.id, 'q_new_challenge', 'Soal berikutnya WAJIB menghindari konsep yang barusan dikuasai');
});

// -------------------------------------------------------------------------
// Invariant 7: Identical Event Stream -> Identical Braincore Result (Replay Determinism)
// -------------------------------------------------------------------------
test('Invariant 7 · Identical event stream -> Identical Braincore result (replay determinism)', () => {
  const runStream = () => {
    decisionTrace.clear();
    const results = [];
    const timestamps = [1710000100000, 1710000110000, 1710000120000];
    for (let i = 0; i < 3; i++) {
      const obs = decisionTrace.createObservation({
        itemId: 'q_stream_' + i,
        concept: 'articles',
        ok: (i !== 1),
        ms: 2200 + (i * 200),
        nowMs: timestamps[i]
      });
      const dec = decisionTrace.recordDecision({
        action: obs.correct ? 'continue' : 'hint',
        targetSkill: 'articles',
        observation: obs,
        nowMs: obs.timestamp,
        seed: (i + 1) * 7919
      });
      results.push({ obs, dec });
    }
    const audit = decisionTrace.verifyLedger();
    return { results, audit };
  };

  const run1 = runStream();
  const run2 = runStream();

  assert.deepStrictEqual(run1.results, run2.results);
  assert.deepStrictEqual(run1.audit.latestHash, run2.audit.latestHash);
  assert.strictEqual(run1.audit.ok, true);
});

// -------------------------------------------------------------------------
// Invariant 8: Offline Execution -> Core Loop Still Works (Zero Network)
// -------------------------------------------------------------------------
test('Invariant 8 · Offline execution -> Core loop works 100% locally with zero network calls', () => {
  // Matikan akses fetch/network global jika ada
  const origFetch = global.fetch;
  global.fetch = () => { throw new Error('NETWORK CALL DETECTED IN OFFLINE RUNTIME'); };

  try {
    const obs = decisionTrace.createObservation({ itemId: 'off_01', ok: true, ms: 2400 });
    const dec = decisionTrace.recordDecision({ action: 'practice', observation: obs });
    const ev = decisionTrace.evaluateOutcome(dec.traceId, { correct: true, latencyMs: 2300 });
    const audit = decisionTrace.verifyLedger();

    assert.ok(obs && dec && ev);
    assert.strictEqual(audit.ok, true);
  } finally {
    global.fetch = origFetch;
  }
});

// -------------------------------------------------------------------------
// Invariant 9: Decision -> Evidence Trace (Tamper-Evident Ledger Integrity)
// -------------------------------------------------------------------------
test('Invariant 9 · Decision -> Evidence trace (cryptographic chain & tamper detection)', () => {
  decisionTrace.clear();

  const d1 = decisionTrace.recordDecision({ action: 'a1', targetSkill: 's1', targetDifficulty: 2.0, nowMs: 1710000200000 });
  const d2 = decisionTrace.recordDecision({ action: 'a2', targetSkill: 's2', targetDifficulty: 2.5, nowMs: 1710000210000 });
  const d3 = decisionTrace.recordDecision({ action: 'a3', targetSkill: 's3', targetDifficulty: 3.0, nowMs: 1710000220000 });

  // 1. Verifikasi rantai murni
  const checkClean = decisionTrace.verifyLedger();
  assert.strictEqual(checkClean.ok, true);
  assert.strictEqual(checkClean.length, 3);
  assert.strictEqual(checkClean.brokenAt, null);
  assert.strictEqual(d2.prevHash, d1.hash);
  assert.strictEqual(d3.prevHash, d2.hash);

  // 2. Manipulasi data ilegal di simpul 1
  const store = decisionTrace.getRecent(10);
  store[1].targetDifficulty = 99.9; // data dipalsukan!

  const checkTamper = decisionTrace.verifyLedger();
  assert.strictEqual(checkTamper.ok, false);
  assert.strictEqual(checkTamper.brokenAt, 1);
  assert.strictEqual(checkTamper.error, 'tampered_data_hash_mismatch');

  decisionTrace.clear();
});

// -------------------------------------------------------------------------
// Invariant 10: Evidence -> Subsequent Braincore Behavior (Changes NEXT Learning Action)
// -------------------------------------------------------------------------
test('Invariant 10 · Evidence -> Subsequent Braincore behavior (PROVE Braincore decision changes NEXT learning item)', () => {
  decisionTrace.clear();

  // OWNER 2026-09-26 (m025-375): invarian ini dulu dibuktikan lewat penyetel targetSuccess
  // otomatis (0.80 -> 0.84 membuat soal MUDAH terpilih). Penyetel itu dimatikan (audit
  // braincore A1). Jalur yang sah - dan yang memang dimaksud "bukti mengubah langkah
  // berikutnya" - adalah bukti menggeser TAKSIRAN KEMAMPUAN, sementara target tetap 0.80.
  const NOW = 1710000000000;
  const pool = [
    { id: 'item_foundation', concept: 'grammar_basics', difficulty: 1.33 },
    { id: 'item_stretch', concept: 'grammar_advanced', difficulty: 2.33 }
  ];
  const pick = (ability) => tutorBrain.selectNext(pool, {}, {
    predict: (item) => coreBrain.successProbability(ability, item.difficulty),
    targetSuccess: 0.80
  });

  // Kasus A: belum ada bukti -> kemampuan = prior 2.0 -> soal dasar (p ~ 0.80) yang dipilih.
  const before = coreBrain.estimateAbility([], { now: NOW, prior: 2.0 });
  const selectedBefore = pick(before.ability);
  assert.strictEqual(selectedBefore.id, 'item_foundation', 'Tanpa bukti, soal setingkat kemampuan awal yang dipilih');

  // Kasus B: dua belas jawaban benar pada soal tingkat 3 dicatat sebagai bukti.
  const evidence = [];
  for (let i = 0; i < 12; i++) {
    evidence.push({ at: NOW - (12 - i) * 60000, ok: true, difficulty: 3 });
    const d = decisionTrace.recordDecision({ action: 'practice', nowMs: NOW - (12 - i) * 60000 });
    decisionTrace.evaluateOutcome(d.traceId, { correct: true });
  }
  const after = coreBrain.estimateAbility(evidence, { now: NOW, prior: 2.0 });
  assert.ok(after.ability > before.ability + 1, 'Bukti benar pada soal sulit menaikkan taksiran kemampuan');

  // Target TIDAK bergeser oleh bukti yang sama - tidak ada lagi penyetel yang memudahkan soal.
  assert.strictEqual(decisionTrace.readParams()['difficulty.targetSuccess'], 0.80);

  // Kasus C: dengan kemampuan baru dan target yang sama, soal berikutnya BERUBAH ke yang lebih menantang.
  const selectedAfter = pick(after.ability);
  assert.strictEqual(selectedAfter.id, 'item_stretch', 'Kemampuan naik -> soal yang lebih menantang dipilih');
  assert.notStrictEqual(selectedBefore.id, selectedAfter.id, 'Keputusan Braincore TERBUKTI mengubah soal belajar berikutnya');

  decisionTrace.clear();
});

console.log('\n======================================================');
console.log(`Runtime E2E Proof Gate: ${passes}/${passes + failures} PASS`);
console.log('======================================================\n');

if (failures > 0) {
  process.exit(1);
}
