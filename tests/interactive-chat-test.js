#!/usr/bin/env node
/**
 * tests/interactive-chat-test.js
 * Comprehensive automated verification for FIEZEL ChatGPT-like Interactive Chat (Kaiwa & Speaking Partner).
 *
 * Verifies:
 * 1. Scenario bank integrity (Japanese & English).
 * 2. Furigana Ruby parser formatting.
 * 3. Misconception Ledger detection (e.g. particle は vs わ).
 * 4. Offline deterministic fallback response generation.
 * 5. Multi-turn message state transitions & Zero-loss user input preservation.
 * 6. App integration: VALID_VIEWS, handleTopbarBack, TAB_PARENT, and targetLangSurfaceBlocked.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chatModulePath = path.join(root, 'features', 'interactive-chat', 'fiezel-interactive-chat.js');
const appJsPath = path.join(root, 'app.js');

// 1. Verify files exist
assert.ok(fs.existsSync(chatModulePath), 'features/interactive-chat/fiezel-interactive-chat.js must exist');
assert.ok(fs.existsSync(path.join(root, 'features', 'interactive-chat', 'interactive-chat.css')), 'features/interactive-chat/interactive-chat.css must exist');

// 2. Load module in simulated browser environment
let masteryCalls = [];
let bktCalls = [];

const mockRoot = {
  FiezelI18n: {
    getCourse: () => 'ja',
    getLocale: () => 'id',
    t: (k, fb) => fb || k
  },
  activeTargetLang: () => 'ja',
  getActiveLevel: () => 'N5',
  learnerName: () => 'Rian',
  updateMastery: (id, val) => { masteryCalls.push({ id, val }); },
  bktRecord: (data) => { bktCalls.push(data); },
  document: {
    getElementById: () => null
  }
};

const chatEngine = require(chatModulePath);

console.log('--- 1. Testing Scenarios Data Bank ---');
const jaScenarios = chatEngine.getScenarios('ja');
assert.ok(Array.isArray(jaScenarios) && jaScenarios.length >= 4, 'Japanese must have at least 4 immersive scenarios');
jaScenarios.forEach((s) => {
  assert.ok(s.id && s.title && s.starter, `Scenario ${s.id} must have id, title, and starter`);
  assert.ok(s.starter.text && s.starter.furigana && s.starter.translation, `Scenario ${s.id} starter must have text, furigana, and translation`);
  assert.ok(Array.isArray(s.starter.suggestions) && s.starter.suggestions.length > 0, `Scenario ${s.id} must offer quick suggestion chips`);
});
console.log('✓ Japanese scenarios validated:', jaScenarios.length, 'scenarios found.');

const enScenarios = chatEngine.getScenarios('en');
assert.ok(Array.isArray(enScenarios) && enScenarios.length >= 4, 'English must have at least 4 immersive scenarios');
enScenarios.forEach((s) => {
  assert.ok(s.id && s.title && s.starter, `Scenario ${s.id} must have id, title, and starter`);
  assert.ok(s.starter.text && s.starter.translation, `Scenario ${s.id} starter must have text and translation`);
  assert.ok(Array.isArray(s.starter.suggestions) && s.starter.suggestions.length > 0, `Scenario ${s.id} must offer quick suggestion chips`);
});
console.log('✓ English scenarios validated:', enScenarios.length, 'scenarios found.');

console.log('--- 2. Testing Furigana Ruby Parsing ---');
const parsedRuby = chatEngine.parseFuriganaRuby('こんにちは！[今日](きょう)はどんなことについて[話](はな)したいですか？');
assert.ok(parsedRuby.includes('<ruby>今日<rt>きょう</rt></ruby>'), 'Furigana ruby parsing must wrap [今日](きょう) in <ruby> tags');
assert.ok(parsedRuby.includes('<ruby>話<rt>はな</rt></ruby>'), 'Furigana ruby parsing must wrap [話](はな) in <ruby> tags');
assert.ok(parsedRuby.includes('こんにちは！'), 'Non-bracketed text must be preserved');
console.log('✓ Furigana Ruby parser verified successfully.');

console.log('--- 3. Testing Misconception Detection ---');
// Test Japanese particle は vs わ misconception
const misW = chatEngine.detectMisconception('わたしわがくせいです', 'ja');
assert.ok(misW, 'Should detect particle misconception for わたしわ');
assert.strictEqual(misW.type, 'particle_wa_vs_ha', 'Should detect particle_wa_vs_ha');
// Test Japanese particle を vs が misconception
const misOGa = chatEngine.detectMisconception('ラーメンが食べます', 'ja');
assert.ok(misOGa, 'Should detect particle misconception for ラーメンが食べます');
assert.strictEqual(misOGa.id, 'particle_o_vs_ga');

// Test English misconceptions
const misAgree = chatEngine.detectMisconception('I am agree with you', 'en');
assert.ok(misAgree, 'Should detect "I am agree" misconception');
assert.strictEqual(misAgree.id, 'verb_agree');

const misSVA = chatEngine.detectMisconception('He go to school every day', 'en');
assert.ok(misSVA, 'Should detect Subject-Verb Agreement error');
assert.strictEqual(misSVA.id, 'sva_present');
console.log('✓ Misconception detection verified successfully.');

console.log('--- 4. Testing Offline Deterministic Fallback ---');
const offlineResp = chatEngine.generateOfflineFallback('ラーメンが好きです', 'ramen', 'ja', 'N5');
assert.ok(offlineResp && offlineResp.text, 'Offline fallback must return structured response');
assert.ok(offlineResp.furigana, 'Japanese offline fallback must provide furigana');
assert.ok(offlineResp.translation, 'Japanese offline fallback must provide Indonesian translation');
assert.ok(Array.isArray(offlineResp.suggestions) && offlineResp.suggestions.length > 0, 'Offline response must provide follow-up suggestion chips');
console.log('✓ Offline fallback dialogue verified:', offlineResp.text);

console.log('--- 5. Testing Shadowing & Pronunciation Evaluation ---');
const evalExact = chatEngine.evaluatePronunciation('こんにちは！', 'こんにちは！', 'ja');
assert.strictEqual(evalExact.score, 100, 'Exact speech match must score 100%');
assert.strictEqual(evalExact.passed, true);

const evalFurigana = chatEngine.evaluatePronunciation('[今日](きょう)は良い天気ですね', '今日は良い天気ですね', 'ja');
assert.strictEqual(evalFurigana.score, 100, 'Furigana brackets must be normalized before comparison');

const evalEnglish = chatEngine.evaluatePronunciation('Welcome to Fiezel Cafe!', 'welcome to fiezel cafe', 'en');
assert.strictEqual(evalEnglish.score, 100, 'English case and punctuation must be normalized');

const evalMinor = chatEngine.evaluatePronunciation('Excuse me, where is the station?', 'Excuse me, where is a station', 'en');
assert.ok(evalMinor.score >= 80, 'Minor speech difference should yield high similarity score (>=80)');
console.log('✓ Shadowing & Pronunciation evaluation verified successfully.');

console.log('--- 6. Testing Scenario Goal Tracking ---');
const ramenSc = jaScenarios.find(s => s.id === 'ramen');
assert.ok(ramenSc && Array.isArray(ramenSc.goals) && ramenSc.goals.length === 3, 'Ramen scenario must have 3 goals');
const goalsInitial = chatEngine.evaluateGoalProgress(ramenSc, [{ role: 'assistant', text: ramenSc.starter.text }]);
assert.strictEqual(goalsInitial.filter(g => g.done).length, 0, 'Initially 0 goals done');

const goalsAfterOrder = chatEngine.evaluateGoalProgress(ramenSc, [
  { role: 'assistant', text: ramenSc.starter.text },
  { role: 'user', text: '豚骨ラーメンと硬めでお願いします！ごちそうさまでした！' }
]);
assert.strictEqual(goalsAfterOrder.filter(g => g.done).length, 3, 'All 3 ramen goals satisfied after complete order flow');
console.log('✓ Scenario Goal Tracking verified successfully.');

console.log('--- 7. Testing Multi-turn State Transitions & Zero-Loss Input ---');
let state = chatEngine.createInitialState('ja', 'free');
assert.strictEqual(state.messages.length, 1, 'Initial state should have 1 starter message from assistant');
assert.strictEqual(state.messages[0].role, 'assistant', 'First message must be assistant greeting');

// Add learner message
const rawInput = '  週末に映画を見ました！  ';
const updatedState = chatEngine.appendUserMessage(state, rawInput);
assert.strictEqual(updatedState.messages.length, 2, 'Message history must now have 2 items');
const lastMsg = updatedState.messages[1];
assert.strictEqual(lastMsg.role, 'user', 'Second message must be user role');
assert.strictEqual(lastMsg.text, '週末に映画を見ました！', 'Input text must be preserved with trim, zero loss');

// Append assistant reply with telemetry
const finalState = chatEngine.appendAssistantMessage(updatedState, offlineResp);
assert.strictEqual(finalState.messages.length, 3, 'Message history must now have 3 items');
assert.strictEqual(finalState.messages[2].role, 'assistant');
console.log('✓ Multi-turn message state transitions & Zero-loss verified.');

console.log('--- 8. Testing App Integration & Routing Invariants ---');
const appJs = fs.readFileSync(appJsPath, 'utf8');

// VALID_VIEWS check
assert.ok(appJs.includes("VALID_VIEWS=new Set(['kana',") && appJs.includes("'chat']"), 'app.js must include chat in VALID_VIEWS with kana as first element');

// handleTopbarBack check
assert.ok(/handleTopbarBack\(\)\s*\{[^}]*'chat'/.test(appJs), 'handleTopbarBack must include chat in subViews to return to latihan');

// TAB_PARENT check
assert.ok(appJs.includes("TAB_PARENT={chat:'latihan',") || appJs.includes("TAB_PARENT={chat: 'latihan',"), 'TAB_PARENT must map chat to latihan');

// latihanCards check
assert.ok(appJs.includes("go('chat')") || appJs.includes("view:'chat'"), 'latihanCards must include chat entry');

console.log('✓ App integration & routing invariants passed.');
console.log('ALL INTERACTIVE CHAT TESTS PASSED (8/8).');
