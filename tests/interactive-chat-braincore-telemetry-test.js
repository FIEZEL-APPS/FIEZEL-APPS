/**
 * tests/interactive-chat-braincore-telemetry-test.js
 *
 * Verifies Braincore Engine Authority & Zero-Dumbing Invariant for:
 * 1. updateMastery() called with real speaking bucket, actual ok, and latency.
 * 2. bktRecord() called with Bayesian Knowledge Tracing credibility kappa and production boost.
 * 3. misconceptionLedgerRecord() called with actual diagnosis or clean response.
 * 4. Phone call duration, turn count, words spoken, and fluency pace calculated and saved to 'fzc_chat_history_v1'.
 * 5. Zero-Loss State: student utterance preserved without mock data.
 */
'use strict';

const assert = require('assert');

// Mock localStorage
const storage = {};
global.localStorage = {
  getItem: function (k) { return storage[k] !== undefined ? storage[k] : null; },
  setItem: function (k, v) { storage[k] = String(v); },
  removeItem: function (k) { delete storage[k]; },
  clear: function () { for (var k in storage) delete storage[k]; }
};

// Mock DOM
global.document = {
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  documentElement: { classList: { add: function () {}, remove: function () {} } },
  body: { classList: { add: function () {}, remove: function () {} } }
};

// Mock Braincore Telemetry Spies
const telemetrySpy = {
  masteryCalls: [],
  bktCalls: [],
  misconceptionCalls: [],
  xpUpdates: []
};

const mockAppState = {
  xp: 100,
  speaking: {},
  grammar: {}
};

global.updateMastery = function (bucket, key, ok, ms, confidence, attemptAt) {
  telemetrySpy.masteryCalls.push({ bucket, key, ok, ms, confidence, attemptAt });
  if (!mockAppState[bucket]) mockAppState[bucket] = {};
  mockAppState[bucket][key] = {
    mastery: ok ? 80 : 20,
    total: 1,
    correct: ok ? 1 : 0
  };
};

global.bktRecord = function (q, ok, kappa, boost) {
  telemetrySpy.bktCalls.push({ q, ok, kappa, boost });
};

global.misconceptionLedgerRecord = function (session, q, diagnosis, ok) {
  telemetrySpy.misconceptionCalls.push({ session, q, diagnosis, ok });
};

global.__getFiezelState = function () {
  return mockAppState;
};

global.save = function () {
  telemetrySpy.xpUpdates.push(mockAppState.xp);
};

// Load FiezelInteractiveChat
const chatModule = require('../features/interactive-chat/fiezel-interactive-chat.js');
const chat = global.FiezelInteractiveChat || chatModule;

console.log('--- TEST 1: Initial State & Chat History Setup ---');
assert(chat, 'FiezelInteractiveChat must be defined');
assert.strictEqual(typeof chat.getChatHistory, 'function', 'getChatHistory must be exported');
assert.strictEqual(typeof chat.recordCallSession, 'function', 'recordCallSession must be exported');
assert.strictEqual(typeof chat.getFluencyStats, 'function', 'getFluencyStats must be exported');
assert.strictEqual(typeof chat.dispatchSpeakingTurnTelemetry, 'function', 'dispatchSpeakingTurnTelemetry must be exported');
assert.strictEqual(typeof chat.dispatchShadowingTelemetry, 'function', 'dispatchShadowingTelemetry must be exported');
console.log('✓ Public API exports verified');

console.log('--- TEST 2: Chat Speaking Turn with Misconception (Particle wa vs ha in Japanese) ---');
telemetrySpy.masteryCalls = [];
telemetrySpy.bktCalls = [];
telemetrySpy.misconceptionCalls = [];
global.localStorage.clear();

var studentText1 = 'わたしわ学生です'; // has misconception: particle_wa_ha
var detectedMisc = chat.checkMisconception(studentText1, 'ja');
assert(detectedMisc, 'Misconception must be detected for わたしわ');
assert.strictEqual(detectedMisc.id, 'particle_wa_ha');

chat.dispatchSpeakingTurnTelemetry(studentText1, 'free', detectedMisc, false);

assert.strictEqual(telemetrySpy.masteryCalls.length, 2, 'updateMastery should be called for scenario and fluency');
assert.strictEqual(telemetrySpy.masteryCalls[0].bucket, 'speaking');
assert.strictEqual(telemetrySpy.masteryCalls[0].key, 'ja_kaiwa_free');
assert.strictEqual(telemetrySpy.masteryCalls[0].ok, false, 'Must be false due to misconception');

assert.strictEqual(telemetrySpy.bktCalls.length, 2, 'bktRecord should be called for scenario and fluency');
assert.strictEqual(telemetrySpy.bktCalls[0].ok, false);
assert.strictEqual(telemetrySpy.bktCalls[0].kappa, 0.35, 'Weak credibility for incorrect turn');

assert.strictEqual(telemetrySpy.misconceptionCalls.length, 1);
assert.strictEqual(telemetrySpy.misconceptionCalls[0].diagnosis.misconception, 'particle_wa_ha');
assert.strictEqual(telemetrySpy.misconceptionCalls[0].ok, false);

var hist = chat.getChatHistory();
assert.strictEqual(hist.length, 1);
assert.strictEqual(hist[0].userText, studentText1, 'Zero-Loss: student text must be preserved');
assert.strictEqual(hist[0].misconception, 'particle_wa_ha');
console.log('✓ Speaking turn with misconception correctly routed to Braincore & history');

console.log('--- TEST 3: Clean Speaking Turn (English Fluency) ---');
telemetrySpy.masteryCalls = [];
telemetrySpy.bktCalls = [];
telemetrySpy.misconceptionCalls = [];
var chatState = chat.getState();
chatState.course = 'en';

var studentText2 = 'I would like to order a warm latte please.';
var noMisc = chat.checkMisconception(studentText2, 'en');
assert.strictEqual(noMisc, null, 'No misconception should be detected');

chat.dispatchSpeakingTurnTelemetry(studentText2, 'cafe', noMisc, true);

assert.strictEqual(telemetrySpy.masteryCalls.length, 2);
assert.strictEqual(telemetrySpy.masteryCalls[0].bucket, 'speaking');
assert.strictEqual(telemetrySpy.masteryCalls[0].key, 'en_kaiwa_cafe');
assert.strictEqual(telemetrySpy.masteryCalls[0].ok, true, 'Clean turn must report ok=true');

assert.strictEqual(telemetrySpy.bktCalls.length, 2);
assert.strictEqual(telemetrySpy.bktCalls[0].ok, true);
assert.strictEqual(telemetrySpy.bktCalls[0].kappa, 0.60, 'Strong credibility kappa=0.60 for correct turn');
assert.strictEqual(telemetrySpy.bktCalls[0].boost, 1.2, 'Production boost applied');

assert.strictEqual(telemetrySpy.misconceptionCalls.length, 1);
assert.strictEqual(telemetrySpy.misconceptionCalls[0].ok, true, 'Negative evidence to reduce misconception belief');

var hist2 = chat.getChatHistory();
assert.strictEqual(hist2.length, 2);
assert.strictEqual(hist2[1].userText, studentText2);
assert.strictEqual(hist2[1].isVoice, true);
assert.strictEqual(hist2[1].wordsSpoken, 9);
console.log('✓ Clean spoken turn correctly routed to Braincore with production boost');

console.log('--- TEST 4: Shadowing Exercise Telemetry ---');
telemetrySpy.masteryCalls = [];
telemetrySpy.bktCalls = [];
telemetrySpy.misconceptionCalls = [];

var shadowEval = {
  score: 92,
  heard: 'I would like to order a warm latte please.',
  passed: true
};

chat.dispatchShadowingTelemetry(shadowEval, 15, 'I would like to order a warm latte please.', 'msg-101');

assert.strictEqual(telemetrySpy.masteryCalls.length, 1);
assert.strictEqual(telemetrySpy.masteryCalls[0].bucket, 'speaking');
assert.strictEqual(telemetrySpy.masteryCalls[0].key, 'en_speaking_shadowing');
assert.strictEqual(telemetrySpy.masteryCalls[0].ok, true);

assert.strictEqual(telemetrySpy.bktCalls.length, 1);
assert.strictEqual(telemetrySpy.bktCalls[0].ok, true);
assert.strictEqual(telemetrySpy.bktCalls[0].kappa, 0.60);

var hist3 = chat.getChatHistory();
assert.strictEqual(hist3.length, 3);
var shadowRec = hist3[2];
assert.strictEqual(shadowRec.type, 'shadowing');
assert.strictEqual(shadowRec.score, 92);
assert.strictEqual(shadowRec.heardText, 'I would like to order a warm latte please.', 'Zero-Loss: exact recognized text');
assert.strictEqual(shadowRec.passed, true);
console.log('✓ Shadowing practice telemetry and Zero-Loss history verified');

console.log('--- TEST 5: Phone Call Mode Duration, Turn Count, and Fluency Pace ---');
telemetrySpy.masteryCalls = [];
telemetrySpy.bktCalls = [];

var callSummary = {
  course: 'en',
  scenarioId: 'phone_friend',
  durationSeconds: 40,
  turns: 4,
  wordsSpoken: 60,
  interruptedCount: 1,
  userUtterances: [
    { text: 'Hey Alex! How are you doing today?', at: Date.now() - 35000 },
    { text: 'I was thinking about hanging out this weekend.', at: Date.now() - 25000 },
    { text: 'Sounds awesome, let us meet up at the cafe.', at: Date.now() - 15000 },
    { text: 'Catch you later, talk soon!', at: Date.now() - 5000 }
  ]
};

var recorded = chat.recordCallSession(callSummary);
assert(recorded, 'Call record must be returned');
assert.strictEqual(recorded.type, 'voice_call');
assert.strictEqual(recorded.durationSeconds, 40);
assert.strictEqual(recorded.turns, 4);
assert.strictEqual(recorded.wordsSpoken, 60);

// Fluency pace: 60 words in 40 seconds = (60 / 40) * 60 = 90 WPM
assert.strictEqual(recorded.fluencyPace, 90, 'Fluency pace must be 90 WPM');
assert(recorded.transcriptSnippet.includes('Hey Alex!'), 'Transcript snippet must contain student words');

// Verify session telemetry in Braincore
assert.strictEqual(telemetrySpy.masteryCalls.length, 1);
assert.strictEqual(telemetrySpy.masteryCalls[0].bucket, 'speaking');
assert.strictEqual(telemetrySpy.masteryCalls[0].key, 'en_kaiwa_call_phone_friend');
assert.strictEqual(telemetrySpy.masteryCalls[0].ok, true);

var stats = chat.getFluencyStats();
assert.strictEqual(stats.callCount, 1);
assert.strictEqual(stats.totalDurationSeconds, 40);
assert.strictEqual(stats.totalTurns, 4);
assert.strictEqual(stats.totalWordsSpoken, 60);
assert.strictEqual(stats.averageFluencyPace, 90);
console.log('✓ Phone call duration, turns, fluency pace (90 WPM), and stats verified');

console.log('--- TEST 6: Zero-Loss State & Anti-Ghost Answer ---');
// Verify that no mock index or fake text was inserted anywhere in localStorage
var rawHistory = global.localStorage.getItem('fzc_chat_history_v1');
assert(rawHistory, 'fzc_chat_history_v1 must exist in localStorage');
var historyArray = JSON.parse(rawHistory);
assert.strictEqual(historyArray.length, 4, 'Must have 4 records (2 turns, 1 shadow, 1 call)');

historyArray.forEach(function (rec, idx) {
  if (rec.type === 'turn') {
    assert(typeof rec.userText === 'string' && rec.userText.length > 0, 'Turn ' + idx + ' must have real userText');
  } else if (rec.type === 'shadowing') {
    assert(typeof rec.heardText === 'string' && rec.heardText.length > 0, 'Shadowing ' + idx + ' must have real heardText');
  } else if (rec.type === 'voice_call') {
    assert(typeof rec.transcriptSnippet === 'string' && rec.transcriptSnippet.length > 0, 'Call ' + idx + ' must have real transcript');
  }
});
console.log('--- TEST 7: FiezelVoiceCall Engine End Integration ---');
const voiceCall = require('../features/interactive-chat/fiezel-voice-call.js');
const voiceEngine = voiceCall.createEngine();

// Prepare call turns
var engineState = voiceEngine.getState();
assert(engineState, 'Voice engine state must be accessible');

// Simulate a call session on the engine
voiceEngine.on('end', function (summary) {
  assert(summary, 'End event must provide summary');
  assert.strictEqual(summary.turns, 2, 'Summary must have 2 turns');
  assert(summary.durationSeconds >= 1, 'Duration must be at least 1 second');
  assert(summary.fluencyPace >= 0, 'Fluency pace must be calculated');
});

// Seed mock turns
voiceEngine._testSetState({
  status: voiceCall.STATE.LISTENING,
  course: 'ja',
  scenarioId: 'phone_delivery',
  callStartTime: Date.now() - 30000,
  durationSeconds: 30,
  callTurns: [
    { userText: 'マルゲリータピザを1枚注文したいです。', timestamp: Date.now() - 20000 },
    { userText: '住所は新宿区1丁目です。どのくらいかかりますか？', timestamp: Date.now() - 10000 }
  ]
});

// Call end() on engine
voiceEngine.end();

var updatedHistory = chat.getChatHistory();
var lastCall = updatedHistory[updatedHistory.length - 1];
assert.strictEqual(lastCall.type, 'voice_call');
assert.strictEqual(lastCall.scenarioId, 'phone_delivery');
assert.strictEqual(lastCall.turns, 2);
assert(lastCall.fluencyPace > 0, 'Fluency pace should be > 0 for spoken Japanese turns');
console.log('✓ FiezelVoiceCall end event computed duration, turns, fluency pace, and persisted to fzc_chat_history_v1');

console.log('\nALL TESTS PASSED SUCCESSFULLY! (7/7)');
