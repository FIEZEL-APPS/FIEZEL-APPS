#!/usr/bin/env node
/**
 * tests/voice-call-ai-studio-port-test.js
 * Comprehensive automated verification for the newly ported AI Studio Voice Call architecture:
 * features/interactive-chat/fiezel-voice-scenarios.js <-> features/interactive-chat/fiezel-voice-pedagogy.js
 *
 * Verifies:
 * 1. Scenario & Persona bank integrity in fiezel-voice-scenarios.js:
 *    - All 5 canonical scenarios (scen_en_a2_cafe, scen_en_a2_past_trip, scen_en_b2_ielts_exam, scen_ja_n5_kissaten, scen_ja_n4_senpai).
 *    - All 4 personas (coach_alex, coach_sarah, nanami, keita) with edgeVoice and geminiVoice.
 * 2. Smart Prerequisite Bypass:
 *    - Check vocab_daily_a2 (initial seed >= 0.60) -> isReady is true.
 *    - Check vocab_travel_a2 (initial seed < 0.60) -> isReady is false.
 *    - Run recordVocabPrereqMastery('vocab_travel_a2') -> checkPrerequisiteStatus now returns isReady is true!
 * 3. Anti-Leak Exam Purity:
 *    - Check scen_en_b2_ielts_exam -> isMeasureExam === true.
 *    - Check practice scenarios -> isMeasureExam === false.
 * 4. Pedagogical Linguistic Analyzer (fiezel-voice-pedagogy.js):
 *    - English irregular verb overregularization: 'Last weekend I goed to Bandung'
 *      -> ok === false, misconceptionId: 'past_tense_irregular_goed', syntacticCorrection contains 'went',
 *         whyFailsId contains 'Overregularization', zero false praise.
 *    - English stative verb: 'I am want hot coffee' -> ok === false, misconceptionId: 'be_plus_stative_verb_want'.
 *    - English auxiliary agreement: 'I am agree with you' -> ok === false, misconceptionId: 'be_plus_base_verb_agree'.
 *    - Japanese tara conjugation: '来週テストあるから、勉強するたらいいですか。' -> ok === false, misconceptionId: 'ja_tara_conjugation_error'.
 *    - Japanese particle: 'ホットコーヒーにくだもの飲むです。' -> ok === false, misconceptionId: 'ja_particle_o_and_desu_verb'.
 *    - Accurate English turn: "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation."
 *      -> ok === true, accuracyScore >= 90, misconceptionId === null.
 *    - Accurate Japanese turn: "すみません、ホットコーヒーを一つとチーズケーキを一つください。" -> ok === true, accuracyScore >= 90.
 * 5. Braincore BKT & Misconception Ledger recording:
 *    - recordPedagogicalAttempt records into localStorage 'fiezel-mastery-bkt-v1' and 'fiezel-misconception-ledger-v1'.
 */
'use strict';
const assert = require('assert');
const path = require('path');

console.log('=== FIEZEL AI STUDIO VOICE CALL PORT INTEGRATION TEST ===\n');

// 1. Setup mock browser environment (localStorage & CustomEvent)
const store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
};

if (typeof global.CustomEvent !== 'function') {
  global.CustomEvent = class CustomEvent {
    constructor(type, eventInitDict = {}) {
      this.type = type;
      this.detail = eventInitDict.detail || null;
    }
  };
}
if (typeof global.dispatchEvent !== 'function') {
  global.dispatchEvent = () => true;
}
global.window = global;

// 2. Load modules
const scenariosPath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-scenarios.js');
const pedagogyPath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-pedagogy.js');

const Scenarios = require(scenariosPath);
const Pedagogy = require(pedagogyPath);

assert.ok(Scenarios, 'fiezel-voice-scenarios module must load');
assert.ok(Pedagogy, 'fiezel-voice-pedagogy module must load');

// =========================================================================
// SECTION 1: Scenario & Persona Bank Integrity
// =========================================================================
console.log('--- 1. Scenario & Persona bank integrity ---');

// Check scenarios
const allScenarios = Scenarios.getScenarios();
assert.strictEqual(Array.isArray(allScenarios), true, 'getScenarios() should return an array');
assert.strictEqual(allScenarios.length, 5, 'Must contain exactly 5 canonical scenarios');

const expectedScenarioIds = [
  'scen_en_a2_cafe',
  'scen_en_a2_past_trip',
  'scen_en_b2_ielts_exam',
  'scen_ja_n5_kissaten',
  'scen_ja_n4_senpai'
];

expectedScenarioIds.forEach((id) => {
  const scen = Scenarios.getScenario(id);
  assert.ok(scen, `Scenario "${id}" must exist in bank`);
  assert.strictEqual(scen.id, id, `Scenario ID must match ${id}`);
  assert.ok(scen.titleId && scen.titleTh, `Scenario "${id}" must have bilingual title (ID & TH)`);
  assert.ok(scen.targetLang === 'en' || scen.targetLang === 'ja', `Scenario "${id}" must have targetLang en or ja`);
  assert.ok(scen.competencyId, `Scenario "${id}" must define competencyId`);
  assert.ok(typeof scen.difficultyB === 'number', `Scenario "${id}" must define numeric difficultyB`);
  assert.ok(Array.isArray(scen.missionGoalsId) && scen.missionGoalsId.length > 0, `Scenario "${id}" must have missionGoalsId`);
  assert.ok(Array.isArray(scen.targetPatterns) && scen.targetPatterns.length > 0, `Scenario "${id}" must have targetPatterns`);
  assert.ok(Array.isArray(scen.vocabPrereqs) && scen.vocabPrereqs.length > 0, `Scenario "${id}" must have vocabPrereqs`);
  assert.ok(Array.isArray(scen.sampleUtterances) && scen.sampleUtterances.length > 0, `Scenario "${id}" must have sampleUtterances`);
});

const enScenarios = Scenarios.getScenarios('en');
assert.strictEqual(enScenarios.length, 3, 'English filter should return 3 scenarios');
const jaScenarios = Scenarios.getScenarios('ja');
assert.strictEqual(jaScenarios.length, 2, 'Japanese filter should return 2 scenarios');

// Check personas
const expectedPersonas = {
  coach_alex: { edgeVoice: 'en-US-GuyNeural', geminiVoice: 'Puck', targetLang: 'en' },
  coach_sarah: { edgeVoice: 'en-US-AriaNeural', geminiVoice: 'Kore', targetLang: 'en' },
  nanami: { edgeVoice: 'ja-JP-NanamiNeural', geminiVoice: 'Kore', targetLang: 'ja' },
  keita: { edgeVoice: 'ja-JP-KeitaNeural', geminiVoice: 'Charon', targetLang: 'ja' }
};

Object.entries(expectedPersonas).forEach(([pId, expected]) => {
  const persona = Scenarios.getPersona(pId);
  assert.ok(persona, `Persona "${pId}" must exist`);
  assert.strictEqual(persona.id, pId, `Persona ID must be ${pId}`);
  assert.strictEqual(persona.edgeVoice, expected.edgeVoice, `Persona "${pId}" edgeVoice mismatch`);
  assert.strictEqual(persona.geminiVoice, expected.geminiVoice, `Persona "${pId}" geminiVoice mismatch`);
  assert.strictEqual(persona.targetLang, expected.targetLang, `Persona "${pId}" targetLang mismatch`);
  assert.ok(persona.name, `Persona "${pId}" must have a name`);
  assert.ok(persona.avatarIcon || persona.avatarUrl, `Persona "${pId}" must have avatarIcon or avatarUrl`);
  assert.ok(persona.systemPrompt, `Persona "${pId}" must have systemPrompt`);
  assert.ok(persona.accentLabel, `Persona "${pId}" must have accentLabel`);
});

console.log('✓ All 5 scenarios and 4 personas validated with exact edgeVoice and geminiVoice configs.\n');

// =========================================================================
// SECTION 2: Smart Prerequisite Bypass
// =========================================================================
console.log('--- 2. Smart Prerequisite Bypass ---');
global.localStorage.clear();

// 1. vocab_daily_a2 (Cafe): initial seed 0.74 >= 0.60 -> isReady is true
const prereqCafe = Scenarios.checkPrerequisiteStatus(null, 'vocab_daily_a2');
assert.strictEqual(prereqCafe.isReady, true, 'vocab_daily_a2 should have isReady === true by default (seed >= 0.60)');
assert.ok(prereqCafe.pMastery >= 0.60, `vocab_daily_a2 pMastery (${prereqCafe.pMastery}) must be >= 0.60`);

// 2. vocab_travel_a2 (Past trip): initial seed 0.42 < 0.60 -> isReady is false
const prereqTripBefore = Scenarios.checkPrerequisiteStatus(null, 'vocab_travel_a2');
assert.strictEqual(prereqTripBefore.isReady, false, 'vocab_travel_a2 should have isReady === false by default (seed < 0.60)');
assert.ok(prereqTripBefore.pMastery < 0.60, `vocab_travel_a2 pMastery (${prereqTripBefore.pMastery}) must be < 0.60`);

// 3. Run recordVocabPrereqMastery('vocab_travel_a2') -> checkPrerequisiteStatus now returns isReady is true!
Scenarios.recordVocabPrereqMastery('vocab_travel_a2');
const prereqTripAfter = Scenarios.checkPrerequisiteStatus(null, 'vocab_travel_a2');
assert.strictEqual(prereqTripAfter.isReady, true, 'vocab_travel_a2 should now have isReady === true after recording mastery');
assert.strictEqual(prereqTripAfter.pMastery, 0.75, 'vocab_travel_a2 pMastery should be updated to 0.75');

// Also verify with explicit brainState object
const explicitBypassState = {
  competencies: {
    vocab_travel_a2: { pMastery: 0.85, state: 'MASTERED' }
  }
};
const prereqExplicit = Scenarios.checkPrerequisiteStatus(explicitBypassState, 'vocab_travel_a2');
assert.strictEqual(prereqExplicit.isReady, true, 'Explicit high mastery state should grant isReady');
assert.strictEqual(prereqExplicit.pMastery, 0.85);

console.log('✓ Smart Prerequisite Bypass correctly respects P(L) >= 0.60 threshold and live mastery updates.\n');

// =========================================================================
// SECTION 3: Anti-Leak Exam Purity
// =========================================================================
console.log('--- 3. Anti-Leak Exam Purity ---');

// scen_en_b2_ielts_exam must have isMeasureExam === true
const ieltsExam = Scenarios.getScenario('scen_en_b2_ielts_exam');
assert.strictEqual(ieltsExam.isMeasureExam, true, 'scen_en_b2_ielts_exam must have isMeasureExam === true');

// Practice scenarios must have isMeasureExam === false
const practiceScenarioIds = [
  'scen_en_a2_cafe',
  'scen_en_a2_past_trip',
  'scen_ja_n5_kissaten',
  'scen_ja_n4_senpai'
];

practiceScenarioIds.forEach((id) => {
  const scen = Scenarios.getScenario(id);
  assert.strictEqual(scen.isMeasureExam, false, `Practice scenario "${id}" must have isMeasureExam === false`);
});

console.log('✓ Anti-Leak Exam Purity flag accurately isolates Measure Mode exams from practice sessions.\n');

// =========================================================================
// SECTION 4: Pedagogical Linguistic Analyzer (fiezel-voice-pedagogy.js)
// =========================================================================
console.log('--- 4. Pedagogical Linguistic Analyzer ---');

// Test Case 4.1: English irregular verb overregularization: 'Last weekend I goed to Bandung'
console.log('  [4.1] Testing English irregular verb overregularization...');
const goedAnalysis = Pedagogy.analyzeUtterancePedagogy(
  'Last weekend I goed to Bandung',
  'scen_en_a2_past_trip',
  'en'
);
assert.strictEqual(goedAnalysis.ok, false, 'goed should trigger ok === false');
assert.strictEqual(goedAnalysis.misconceptionId, 'past_tense_irregular_goed');
assert.ok(goedAnalysis.syntacticCorrection.includes('went'), 'syntacticCorrection must contain "went"');
assert.ok(
  goedAnalysis.whyFailsId.includes('Overregularization'),
  `whyFailsId must contain "Overregularization", got: ${goedAnalysis.whyFailsId}`
);
assert.ok(goedAnalysis.pedagogicalFeedbackId.includes('went'), 'Feedback must clearly point out "went"');
// Zero false praise verification: ensure no false congratulations or misleading praise in failure response
assert.ok(
  !goedAnalysis.pedagogicalFeedbackId.includes('Susunan kalimat sudah tepat') &&
  !goedAnalysis.pedagogicalFeedbackId.includes('sudah tepat'),
  'Zero false praise invariant: error feedback must never claim the structure is correct'
);

// Test Case 4.2: English stative verb: 'I am want hot coffee'
console.log('  [4.2] Testing English stative verb error...');
const stativeAnalysis = Pedagogy.analyzeUtterancePedagogy(
  'I am want hot coffee',
  'scen_en_a2_cafe',
  'en'
);
assert.strictEqual(stativeAnalysis.ok, false, 'I am want should trigger ok === false');
assert.strictEqual(stativeAnalysis.misconceptionId, 'be_plus_stative_verb_want');
assert.ok(stativeAnalysis.whyFailsId.includes('want'), 'whyFailsId should explain stative verb want');

// Test Case 4.3: English auxiliary agreement: 'I am agree with you'
console.log('  [4.3] Testing English auxiliary agreement error...');
const agreeAnalysis = Pedagogy.analyzeUtterancePedagogy(
  'I am agree with you',
  'scen_en_b2_ielts_exam',
  'en'
);
assert.strictEqual(agreeAnalysis.ok, false, 'I am agree should trigger ok === false');
assert.strictEqual(agreeAnalysis.misconceptionId, 'be_plus_base_verb_agree');
assert.ok(agreeAnalysis.syntacticCorrection.includes('I agree'), 'syntacticCorrection should contain "I agree"');

// Test Case 4.4: Japanese tara conjugation: '来週テストあるから、勉強するたらいいですか。'
console.log('  [4.4] Testing Japanese tara conjugation error...');
const taraAnalysis = Pedagogy.analyzeUtterancePedagogy(
  '来週テストあるから、勉強するたらいいですか。',
  'scen_ja_n4_senpai',
  'ja'
);
assert.strictEqual(taraAnalysis.ok, false, 'するたら should trigger ok === false');
assert.strictEqual(taraAnalysis.misconceptionId, 'ja_tara_conjugation_error');
assert.ok(
  taraAnalysis.whyFailsId.includes('～たら') || taraAnalysis.whyFailsId.includes('勉強したら'),
  'whyFailsId must identify tara conjugation rule'
);
assert.ok(taraAnalysis.syntacticCorrection.includes('勉強したら'), 'syntacticCorrection must provide 勉強したら');

// Test Case 4.5: Japanese particle: 'ホットコーヒーにくだもの飲むです。'
console.log('  [4.5] Testing Japanese particle error...');
const particleAnalysis = Pedagogy.analyzeUtterancePedagogy(
  'ホットコーヒーにくだもの飲むです。',
  'scen_ja_n5_kissaten',
  'ja'
);
assert.strictEqual(particleAnalysis.ok, false, 'ホットコーヒーにくだもの飲むです should trigger ok === false');
assert.strictEqual(particleAnalysis.misconceptionId, 'ja_particle_o_and_desu_verb');
assert.ok(
  particleAnalysis.whyFailsId.includes('partikel を') || particleAnalysis.whyFailsId.includes('を'),
  'whyFailsId should explain particle を error'
);

// Test Case 4.6: Accurate English turn: "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation."
console.log('  [4.6] Testing accurate English turn...');
const accurateEnAnalysis = Pedagogy.analyzeUtterancePedagogy(
  "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation.",
  'scen_en_a2_cafe',
  'en'
);
assert.strictEqual(accurateEnAnalysis.ok, true, 'Accurate turn must be ok === true');
assert.ok(accurateEnAnalysis.accuracyScore >= 90, `accuracyScore (${accurateEnAnalysis.accuracyScore}) must be >= 90`);
assert.strictEqual(accurateEnAnalysis.misconceptionId, null, 'misconceptionId must be null for accurate utterance');
assert.strictEqual(accurateEnAnalysis.whyFailsId, null, 'whyFailsId must be null for accurate utterance');

// Test Case 4.7: Accurate Japanese turn: "すみません、ホットコーヒーを一つとチーズケーキを一つください。"
console.log('  [4.7] Testing accurate Japanese turn...');
const accurateJaAnalysis = Pedagogy.analyzeUtterancePedagogy(
  'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
  'scen_ja_n5_kissaten',
  'ja'
);
assert.strictEqual(accurateJaAnalysis.ok, true, 'Accurate Japanese turn must be ok === true');
assert.ok(accurateJaAnalysis.accuracyScore >= 90, `accuracyScore (${accurateJaAnalysis.accuracyScore}) must be >= 90`);
assert.strictEqual(accurateJaAnalysis.misconceptionId, null, 'misconceptionId must be null for accurate utterance');

console.log('✓ Pedagogical Linguistic Analyzer verified for English and Japanese morphology & syntax.\n');

// =========================================================================
// SECTION 5: Braincore BKT & Misconception Ledger Recording
// =========================================================================
console.log('--- 5. Braincore BKT & Misconception Ledger recording ---');
global.localStorage.clear();

// Attempt 1: Error attempt with misconception
const attempt1Result = Pedagogy.recordPedagogicalAttempt({
  competencyId: 'speak_en_a2_past_trip',
  ok: false,
  misconceptionId: 'past_tense_irregular_goed',
  userExactTranscript: 'Last weekend I goed to Bandung'
});

assert.ok(attempt1Result, 'recordPedagogicalAttempt must return attempt result');
assert.strictEqual(attempt1Result.competencyId, 'speak_en_a2_past_trip');
assert.strictEqual(attempt1Result.bktBefore, Pedagogy.BRAINCORE_PARAMS.P_INIT);
assert.ok(attempt1Result.bktAfter <= attempt1Result.bktBefore, 'bktAfter should decrease or stay constrained on failure');

// Check localStorage BKT store
const rawBkt1 = global.localStorage.getItem('fiezel-mastery-bkt-v1');
assert.ok(rawBkt1, 'fiezel-mastery-bkt-v1 should be saved in localStorage');
const bktData1 = JSON.parse(rawBkt1);
assert.ok(bktData1.skills && bktData1.skills['speak_en_a2_past_trip'], 'speak_en_a2_past_trip must be recorded');
assert.strictEqual(bktData1.skills['speak_en_a2_past_trip'].attempts, 1);
assert.strictEqual(bktData1.skills['speak_en_a2_past_trip'].correct, 0);

// Check localStorage Misconception Ledger
const rawLedger1 = global.localStorage.getItem('fiezel-misconception-ledger-v1');
assert.ok(rawLedger1, 'fiezel-misconception-ledger-v1 should be saved in localStorage');
const ledgerData1 = JSON.parse(rawLedger1);
assert.ok(
  ledgerData1.concepts &&
  ledgerData1.concepts['speak_en_a2_past_trip'] &&
  ledgerData1.concepts['speak_en_a2_past_trip'].misconceptions['past_tense_irregular_goed'],
  'Misconception past_tense_irregular_goed must be logged'
);
const mEntry = ledgerData1.concepts['speak_en_a2_past_trip'].misconceptions['past_tense_irregular_goed'];
assert.strictEqual(mEntry.count, 1);
assert.strictEqual(mEntry.resolved, false);
assert.strictEqual(mEntry.lastUtterance, 'Last weekend I goed to Bandung');

// Attempt 2: Successful attempt on the same competency
const attempt2Result = Pedagogy.recordPedagogicalAttempt({
  competencyId: 'speak_en_a2_past_trip',
  ok: true,
  userExactTranscript: 'Last weekend I went to Bandung'
});

assert.ok(attempt2Result.bktAfter > attempt1Result.bktAfter, 'bktAfter should increase upon correct attempt');

const rawBkt2 = global.localStorage.getItem('fiezel-mastery-bkt-v1');
const bktData2 = JSON.parse(rawBkt2);
assert.strictEqual(bktData2.skills['speak_en_a2_past_trip'].attempts, 2);
assert.strictEqual(bktData2.skills['speak_en_a2_past_trip'].correct, 1);

console.log('✓ Braincore BKT & Misconception Ledger successfully persist attempts and errors.\n');

console.log('=========================================================================');
console.log('ALL AI STUDIO VOICE CALL PORT VERIFICATIONS PASSED (100% SUCCESS)');
console.log('=========================================================================');
process.exit(0);
