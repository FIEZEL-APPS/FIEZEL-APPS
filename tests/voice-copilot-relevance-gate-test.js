/**
 * tests/voice-copilot-relevance-gate-test.js
 *
 * Verifies the Precision Speech-Act & Focal-Clause Analyzer Engine for
 * Kawan Bicara / Voice Studio Copilot assistance (`1 · Singkat` / easy tier)
 * across English (EN), Japanese (JA), and Mandarin (ZH).
 *
 * Invariants tested:
 * 1. Focal clause isolation from conversational preamble/filler.
 * 2. Echo Redemption exact phrase reproduction.
 * 3. Zero evasion in Option 1 (never 'from Indonesia' to Where-study, never 'pretty good' to How-long,
 *    never 'Yes, I do' to invitations/proposals).
 * 4. Choice extraction (A or B) and direct selection.
 * 5. Concise spoken answer client-side grading purity (no false 'too short' errors on natural spoken turns).
 */

import assert from 'node:assert/strict';
import {
  extractFocalClause,
  detectAiIntent,
  buildContextualFallbackCards,
  evaluateUtteranceClientSide,
} from '../features/voice-studio/src/lib/liveTransport.ts';

console.log('🧪 Starting Voice Copilot Relevance & Multi-Language Gate Test...');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// --------------------------------------------------------------------------
// 1. Focal Clause Extraction & Intent Detection Tests
// --------------------------------------------------------------------------
test('Focal Clause EN: Isolates question from greeting and compliments', () => {
  const line = "Hey there! Awesome to meet you. You're doing great! By the way, what would you like to drink today?";
  const focal = extractFocalClause(line, 'en');
  assert.equal(focal.isEchoRedemption, false);
  assert.ok(focal.focalText.includes('what would you like to drink today?'));
  const intent = detectAiIntent(line, 'en');
  assert.equal(intent, 'wh_what_food');
});

test('Focal Clause EN: Echo Redemption captures exact quoted correction', () => {
  const line = 'Hold on! Drop the direct translation. Say it back to me cleanly: "I would like a hot latte, please."';
  const focal = extractFocalClause(line, 'en');
  assert.equal(focal.isEchoRedemption, true);
  assert.equal(focal.focalText, 'I would like a hot latte, please.');
});

test('Focal Clause EN: Invitation / Proposal intent detection', () => {
  const line = "That was a really great conversation. Why don't we grab some ramen together after class?";
  const focal = extractFocalClause(line, 'en');
  assert.ok(focal.focalText.includes("Why don't we grab some ramen"));
  const intent = detectAiIntent(line, 'en');
  assert.equal(intent, 'invitation');
});

test('Focal Clause EN: Choice extraction (A or B)', () => {
  const line = "We have both ready right now. Do you prefer coffee or tea?";
  const focal = extractFocalClause(line, 'en');
  assert.equal(focal.choiceOptionA?.toLowerCase(), 'coffee');
  assert.equal(focal.choiceOptionB?.toLowerCase(), 'tea');
  const intent = detectAiIntent(line, 'en');
  assert.equal(intent, 'choice');
});

test('Focal Clause EN: Action location (Where do you study / work)', () => {
  const line = "I love quiet spots. Where do you usually study when you have exams?";
  const intent = detectAiIntent(line, 'en');
  assert.equal(intent, 'wh_where_action');
});

test('Focal Clause EN: Duration (How long have you...)', () => {
  const line = "Your pronunciation sounds quite confident! How long have you been studying English?";
  const intent = detectAiIntent(line, 'en');
  assert.equal(intent, 'wh_how_long');
});

test('Focal Clause JA: Isolates question from Tokyo opening banter', () => {
  const line = 'こんにちは！今日もいい天気ですね。ところで、何が好きですか？';
  const focal = extractFocalClause(line, 'ja');
  assert.equal(focal.focalText, 'ところで、何が好きですか？');
  const intent = detectAiIntent(line, 'ja');
  assert.equal(intent, 'wh_what_general');
});

test('Focal Clause JA: Echo Redemption captures exact Japanese quote', () => {
  const line = 'ちょっと待って！『映画を見ます』と言ってみて！';
  const focal = extractFocalClause(line, 'ja');
  assert.equal(focal.isEchoRedemption, true);
  assert.equal(focal.focalText, '映画を見ます');
});

test('Focal Clause JA: Proposal / Invitation intent detection', () => {
  const line = '今週の金曜日に、一緒にカフェに行きませんか？';
  const intent = detectAiIntent(line, 'ja');
  assert.equal(intent, 'invitation');
});

test('Focal Clause JA: Choice extraction', () => {
  const line = '店内ですか、それともお持ち帰りですか？';
  const intent = detectAiIntent(line, 'ja');
  assert.equal(intent, 'choice');
});

test('Focal Clause ZH: Echo Redemption captures exact Chinese quote', () => {
  const line = '停一下！跟我读：“我想喝冰美式咖啡。”';
  const focal = extractFocalClause(line, 'zh');
  assert.equal(focal.isEchoRedemption, true);
  assert.equal(focal.focalText, '我想喝冰美式咖啡。');
});

test('Focal Clause ZH: Question and Choice intent detection', () => {
  const line = '你想喝热咖啡还是冰茶？';
  const focal = extractFocalClause(line, 'zh');
  assert.equal(focal.choiceOptionA, '热咖啡');
  assert.equal(focal.choiceOptionB, '冰茶');
  const intent = detectAiIntent(line, 'zh');
  assert.equal(intent, 'choice');
});

// --------------------------------------------------------------------------
// 2. Option 1 (`1 · Singkat` / easy tier) Contextual Relevance Invariants
// --------------------------------------------------------------------------
test('Option 1 EN: Echo Redemption returns exact target quote without fluff', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'Say it back to me cleanly: "I would like a hot latte, please."',
    targetLang: 'en',
    locale: 'id',
  });
  assert.equal(cards.length, 3);
  const easy = cards[0];
  assert.equal(easy.tier, 'easy');
  assert.equal(easy.text, 'I would like a hot latte, please.');
});

test('Option 1 EN: Cafe order question gives concrete drink, never generic evasion', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'Welcome to Blue Bottle Coffee! What can I get started for you today?',
    targetLang: 'en',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/latte|coffee|tea|cappuccino/i.test(easy.text), `Expected concrete drink in "${easy.text}"`);
  assert.ok(!/yes,?\s*i\s*do|from\s*indonesia|pretty\s*good/i.test(easy.text));
});

test('Option 1 EN: Study location question names place, never origin country', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'Where do you usually study on weekends?',
    targetLang: 'en',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/library|home|cafe|desk/i.test(easy.text), `Expected study spot in "${easy.text}"`);
  assert.ok(!/from\s*indonesia/i.test(easy.text), `Did not expect country origin in "${easy.text}"`);
});

test('Option 1 EN: Duration question answers duration, never "pretty good"', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'How long have you been learning English?',
    targetLang: 'en',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/year|month|while|started/i.test(easy.text), `Expected duration in "${easy.text}"`);
  assert.ok(!/pretty\s*good/i.test(easy.text), `Did not expect "pretty good" in "${easy.text}"`);
});

test('Option 1 EN: Invitation accepts proposal, never answers "Yes, I do"', () => {
  const cards = buildContextualFallbackCards({
    aiText: "Why don't we practice together tomorrow afternoon?",
    targetLang: 'en',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/sounds\s*great|love\s*to|let's\s*do\s*it|sure/i.test(easy.text), `Expected acceptance in "${easy.text}"`);
  assert.ok(!/yes,?\s*i\s*do/i.test(easy.text), `Did not expect "Yes, I do" in "${easy.text}"`);
});

test('Option 1 EN: Choice A or B picks specific option', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'Do you prefer coffee or tea?',
    targetLang: 'en',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/coffee|tea/i.test(easy.text), `Expected choice picked in "${easy.text}"`);
});

test('Option 1 JA: Echo Redemption returns exact Japanese quote', () => {
  const cards = buildContextualFallbackCards({
    aiText: 'もう一度言ってごらん：『アイスラテをお願いします』',
    targetLang: 'ja',
    locale: 'id',
  });
  const easy = cards[0];
  assert.equal(easy.text, 'アイスラテをお願いします');
});

test('Option 1 JA: Invitation answers with natural acceptance', () => {
  const cards = buildContextualFallbackCards({
    aiText: '今週末、一緒にラーメンを食べに行きませんか？',
    targetLang: 'ja',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/ぜひ|行きましょう|いいですね/u.test(easy.text), `Expected acceptance in "${easy.text}"`);
});

test('Option 1 ZH: Food / Drink ordering gives concrete item', () => {
  const cards = buildContextualFallbackCards({
    aiText: '您好，请问你想喝什么？',
    targetLang: 'zh',
    locale: 'id',
  });
  const easy = cards[0];
  assert.ok(/咖啡|茶|拿铁/u.test(easy.text), `Expected Chinese drink in "${easy.text}"`);
});

// --------------------------------------------------------------------------
// 3. Client-Side Evaluation Purity (Zero False "Too Short" Flags)
// --------------------------------------------------------------------------
const dummyScenario = {
  id: 'cafe_order_en',
  titleId: 'Pesan Kopi di Kafe',
  targetLang: 'en',
  sampleUtterances: [{ text: "I'd like a hot coffee, please." }],
};

test('Evaluation EN: Short polite affirmative answers pass with ok: true', () => {
  const res1 = evaluateUtteranceClientSide({
    text: 'Yes, please.',
    scenario: dummyScenario,
    targetLang: 'en',
    history: [{ speaker: 'ai', text: 'Would you like some sugar?' }],
  });
  assert.equal(res1.ok, true, 'Expected "Yes, please." to be accepted');

  const res2 = evaluateUtteranceClientSide({
    text: 'Hot coffee, please.',
    scenario: dummyScenario,
    targetLang: 'en',
    history: [{ speaker: 'ai', text: 'What can I get for you?' }],
  });
  assert.equal(res2.ok, true, 'Expected "Hot coffee, please." to be accepted');

  const res3 = evaluateUtteranceClientSide({
    text: 'Sounds great!',
    scenario: dummyScenario,
    targetLang: 'en',
    history: [{ speaker: 'ai', text: 'Shall we meet at noon?' }],
  });
  assert.equal(res3.ok, true, 'Expected "Sounds great!" to be accepted');
});

test('Evaluation EN: Real grammar errors are correctly flagged with pedagogical feedback', () => {
  const res = evaluateUtteranceClientSide({
    text: 'I am want coffee because is delicious.',
    scenario: dummyScenario,
    targetLang: 'en',
  });
  assert.equal(res.ok, false);
  assert.ok(res.whyFailsId.includes('am/is/are') || res.whyFailsId.includes('To Be'));
});

const dummyScenarioJa = {
  id: 'cafe_order_ja',
  titleId: 'Pesan di Kafe',
  targetLang: 'ja',
  sampleUtterances: [{ text: 'ホットコーヒーをお願いします。' }],
};

test('Evaluation JA: Short polite Japanese spoken answers pass with ok: true', () => {
  const res1 = evaluateUtteranceClientSide({
    text: 'はい、お願いします。',
    scenario: dummyScenarioJa,
    targetLang: 'ja',
    history: [{ speaker: 'ai', text: '温めますか？' }],
  });
  assert.equal(res1.ok, true, 'Expected "はい、お願いします。" to pass');

  const res2 = evaluateUtteranceClientSide({
    text: 'ホットで。',
    scenario: dummyScenarioJa,
    targetLang: 'ja',
    history: [{ speaker: 'ai', text: 'ホットですか、アイスですか？' }],
  });
  assert.equal(res2.ok, true, 'Expected "ホットで。" to pass');
});

test('Evaluation JA: Real Japanese conjugation errors are flagged', () => {
  const res = evaluateUtteranceClientSide({
    text: '昨日、ラーメンを食べますでした。',
    scenario: dummyScenarioJa,
    targetLang: 'ja',
  });
  assert.equal(res.ok, false);
  assert.ok(res.misconceptionId === 'polite_past_masu_deshita' || res.whyFailsId.includes('でした'));
});

console.log(`\n🎉 ALL ${passed} VOICE COPILOT RELEVANCE TESTS PASSED 100%!`);
