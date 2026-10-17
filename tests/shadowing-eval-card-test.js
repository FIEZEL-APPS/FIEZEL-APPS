#!/usr/bin/env node
/**
 * tests/shadowing-eval-card-test.js
 * Verification for Shadowing Evaluation Word-by-Word Breakdown & Token Comparison Card.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const chatModulePath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-interactive-chat.js');
const chatEngine = require(chatModulePath);

console.log('--- 1. Testing Word-by-Word Japanese Tokenization & Accuracy ---');
const jaTarget = 'いらっしゃいませ！ラーメン[屋](や)へようこそ。';
const jaHeardExact = 'いらっしゃいませ！ラーメン屋へようこそ。';
const evalJaExact = chatEngine.evaluatePronunciation(jaTarget, jaHeardExact, 'ja');

assert.strictEqual(evalJaExact.score, 100);
assert.strictEqual(evalJaExact.passed, true);
assert.ok(Array.isArray(evalJaExact.tokens), 'Should return tokens array');
assert.ok(evalJaExact.tokens.length > 0, 'Should have parsed tokens');
const allCorrect = evalJaExact.tokens.every(t => t.status === 'correct');
assert.ok(allCorrect, 'All tokens should be correct on exact match');
console.log('✓ Japanese exact match word-by-word comparison verified: all correct tokens marked.');

console.log('--- 2. Testing Japanese Partial Missed Token with Kana Guide ---');
const jaHeardPartial = 'いらっしゃいませ！ラーメン';
const evalJaPartial = chatEngine.evaluatePronunciation(jaTarget, jaHeardPartial, 'ja');
assert.ok(evalJaPartial.score < 100);
const missedTokens = evalJaPartial.tokens.filter(t => t.status === 'missed');
assert.ok(missedTokens.length > 0, 'Should have missed tokens');
const yaToken = evalJaPartial.tokens.find(t => t.surface === '屋');
assert.ok(yaToken, 'Should identify "屋" token');
assert.strictEqual(yaToken.status, 'missed', '"屋" should be marked missed');
assert.strictEqual(yaToken.guide, 'や', '"屋" should have kana guide "や"');
console.log('✓ Japanese missed token verified with kana guide:', yaToken.surface, '->', yaToken.guide);

console.log('--- 3. Testing English Word-by-Word Comparison & IPA Guide ---');
const enTarget = 'Welcome to Fiezel Cafe!';
const enHeardPartial = 'Welcome to Cafe';
const evalEnPartial = chatEngine.evaluatePronunciation(enTarget, enHeardPartial, 'en');

const fiezelToken = evalEnPartial.tokens.find(t => t.surface.toLowerCase() === 'fiezel');
assert.ok(fiezelToken, 'Should identify "Fiezel" token');
assert.strictEqual(fiezelToken.status, 'missed', '"Fiezel" was not in spoken text so should be missed');
assert.ok(fiezelToken.guide.includes('fiː.zəl'), 'Fiezel token should provide IPA guide /.../');

const welcomeToken = evalEnPartial.tokens.find(t => t.surface.toLowerCase() === 'welcome');
assert.ok(welcomeToken, 'Should identify "Welcome" token');
assert.strictEqual(welcomeToken.status, 'correct', '"Welcome" was spoken and should be correct');
console.log('✓ English token comparison verified with IPA guide for missed word:', fiezelToken.surface, '->', fiezelToken.guide);

console.log('ALL SHADOWING EVALUATION TOKEN TESTS PASSED (3/3).');
