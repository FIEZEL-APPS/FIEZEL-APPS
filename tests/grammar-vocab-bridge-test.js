/**
 * FIEZEL BRAINCORE INVARIANT TEST: Grammar-Vocab Bridge & Smart Prerequisite Bypass
 * Tests Braincore Rule 5: Automatic bypass if learner already masters prerequisite vocab (P(L_t) >= 0.60).
 */
const assert = require('assert');
const path = require('path');

const bridge = require('../features/brain/fiezel-grammar-vocab-bridge.js');

console.log('--- TEST 1: Empty lesson vocab words returns isReady: true ---');
bridge.setGrammarVocabMap({
  lessons: {
    'unit_01': { skill: 'unit_01', vocabWords: [] }
  }
});
const statusEmpty = bridge.getLessonVocabStatus('unit_01', {});
assert.strictEqual(statusEmpty.isReady, true, 'Empty vocab words must be ready');
assert.strictEqual(statusEmpty.masteredRatio, 1, 'Mastered ratio should be 1');
console.log('PASS: Empty vocab words returns isReady: true');

console.log('--- TEST 2: Learner with BKT mastery < 0.60 is NOT bypassed ---');
bridge.setGrammarVocabMap({
  lessons: {
    'unit_02': { skill: 'unit_02', vocabWords: ['taberu', 'nomu'] }
  }
});
const mockBktLow = {
  mastery: (state, lesson) => ({ L: 0.35 })
};
const statusLow = bridge.getLessonVocabStatus('unit_02', {}, mockBktLow, {});
assert.strictEqual(statusLow.isReady, false, 'Low mastery (< 0.60) must not bypass');
assert.strictEqual(statusLow.masteredRatio, 0, 'Mastered ratio should be 0');
console.log('PASS: Low mastery (< 0.60) correctly gated');

console.log('--- TEST 3: Smart Prerequisite Bypass fires when BKT mastery >= 0.60 ---');
const mockBktHigh = {
  mastery: (state, lesson) => ({ L: 0.75 })
};
const statusHigh = bridge.getLessonVocabStatus('unit_02', {}, mockBktHigh, {});
assert.strictEqual(statusHigh.isReady, true, 'High mastery (>= 0.60) MUST trigger Smart Prerequisite Bypass');
assert.strictEqual(statusHigh.masteredRatio, 1, 'Mastered ratio should be 1');
console.log('PASS: Smart Prerequisite Bypass (>= 0.60) verified');

console.log('--- TEST 4: openLessonPrerequisiteGate strictly checks isReady ---');
let saved = false;
let practiced = null;
global.self = {
  state: { grammar: {} },
  save: () => { saved = true; },
  practiceSkill: (s) => { practiced = s; }
};
// unit_01 has isReady: true -> should bypass
bridge.openLessonPrerequisiteGate('unit_01');
assert.strictEqual(global.self.state.grammar['unit_01'].vocabReady, true, 'vocabReady must be set to true for unit_01');
assert.strictEqual(saved, true, 'State must be saved');
assert.strictEqual(practiced, 'unit_01', 'practiceSkill must be invoked with skill');

// Reset spies
saved = false;
practiced = null;
// unit_02 with no BKT mastery -> isReady is false, MUST NOT bypass
bridge.openLessonPrerequisiteGate('unit_02');
assert.strictEqual(global.self.state.grammar['unit_02'], undefined, 'unit_02 must NOT be unlocked when isReady is false');
assert.strictEqual(saved, false, 'State must NOT be saved when not ready');
assert.strictEqual(practiced, null, 'practiceSkill must NOT be called when not ready');
console.log('PASS: openLessonPrerequisiteGate strictly enforces isReady guard');

console.log('\nSEMUA PENGUJIAN GRAMMAR-VOCAB BRIDGE HIJAU (PASS 4/4).');
