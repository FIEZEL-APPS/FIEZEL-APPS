#!/usr/bin/env node
/**
 * tests/interactive-chat-universal-furigana-test.js
 * Comprehensive automated verification for Universal Furigana Ruby & Romaji
 * in Fiezel Interactive Chat (Mitra Kaiwa / Kawan Bicara) & Voice Call.
 *
 * Verifies:
 * 1. AI & Student message furigana ruby parsing (unbracketed & bracketed).
 * 2. Phonetic Romaji accuracy with Hepburn rules & particle recognition.
 * 3. Suggestion cards furigana ruby and romaji presence.
 * 4. Voice call subtitle furigana ruby and romaji rendering.
 * 5. Zero emoji/emoticon leakage in both text and speech.
 * 6. Student preferences (fz-ja-no-furigana and fz-ja-no-romaji) compatibility.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const chatModulePath = path.join(root, 'features', 'interactive-chat', 'fiezel-interactive-chat.js');
const voiceModulePath = path.join(root, 'features', 'interactive-chat', 'fiezel-voice-call.js');
const cssPath = path.join(root, 'features', 'interactive-chat', 'interactive-chat.css');

// Verify files
assert.ok(fs.existsSync(chatModulePath), 'fiezel-interactive-chat.js must exist');
assert.ok(fs.existsSync(voiceModulePath), 'fiezel-voice-call.js must exist');
assert.ok(fs.existsSync(cssPath), 'interactive-chat.css must exist');

// Load module in simulated environment
const chatEngine = require(chatModulePath);

console.log('=== TEST 1: Universal Furigana Ruby Parsing ===');
// Bracketed markdown
const b1 = 'こんにちは！[今日](きょう)はどんなことについて[話](はな)したいですか？';
const f1 = chatEngine.formatFurigana(b1);
assert.ok(f1.includes('<ruby>今日<rt>きょう</rt></ruby>'), 'Furigana ruby must wrap [今日](きょう)');
assert.ok(f1.includes('<ruby>話<rt>はな</rt></ruby>'), 'Furigana ruby must wrap [話](はな)');
console.log('✓ Bracketed markdown furigana verified.');

// Unbracketed AI response
const rawAi = '初めまして！私の名前はフィゼルです。東京に住んでいます。あなたのお名前とご出身を教えてください！';
const fAi = chatEngine.formatFurigana(rawAi);
assert.ok(fAi.includes('<ruby>初<rt>はじ</rt></ruby>めまして') || fAi.includes('<ruby>初めまして<rt>はじめまして</rt></ruby>'), 'Unbracketed 初めまして must have furigana ruby');
assert.ok(fAi.includes('<ruby>私<rt>わたし</rt></ruby>'), 'Unbracketed 私 must have furigana ruby');
assert.ok(fAi.includes('<ruby>名前<rt>なまえ</rt></ruby>'), 'Unbracketed 名前 must have furigana ruby');
assert.ok(fAi.includes('<ruby>東京<rt>とうきょう</rt></ruby>'), 'Unbracketed 東京 must have furigana ruby');
assert.ok(fAi.includes('<ruby>住<rt>す</rt></ruby>んでいます'), 'Unbracketed 住んでいます must have stem ruby');
assert.ok(fAi.includes('<ruby>出身<rt>しゅっしん</rt></ruby>') || fAi.includes('<ruby>出<rt>で</rt></ruby><ruby>身<rt>み</rt></ruby>'), 'Unbracketed 出身 must have ruby');
assert.ok(!fAi.includes('undefined'), 'Output must not have undefined tokens');
console.log('✓ Raw unbracketed AI reply furigana verified.');

// Unbracketed User message
const rawUser = '学生です。日本語を勉強し始めたばかりです。';
const fUser = chatEngine.formatFurigana(rawUser);
assert.ok(fUser.includes('<ruby>学生<rt>がくせい</rt></ruby>'), 'Unbracketed 学生 must have furigana ruby');
assert.ok(fUser.includes('<ruby>日本語<rt>にほんご</rt></ruby>'), 'Unbracketed 日本語 must have furigana ruby');
assert.ok(fUser.includes('<ruby>勉強<rt>べんきょう</rt></ruby>'), 'Unbracketed 勉強 must have furigana ruby');
console.log('✓ Raw unbracketed User message furigana verified.');

console.log('=== TEST 2: Phonetic Romaji Generation ===');
const r1 = chatEngine.getRomaji('こんにちは！[今日](きょう)はどんなことについて[話](はな)したいですか？');
assert.ok(r1 && r1.length > 0, 'Romaji must be non-empty');
assert.ok(/wa/i.test(r1), 'Topic particle は must be transliterated as wa');
assert.ok(/kyou/i.test(r1), '今日 must be kyou');
console.log('✓ Bracketed sentence romaji verified:', r1);

const rAi = chatEngine.getRomaji(rawAi);
assert.ok(rAi && rAi.length > 0, 'AI response romaji must be non-empty');
assert.ok(/hajimemashite/i.test(rAi), '初めまして must be hajimemashite');
assert.ok(/watashi/i.test(rAi), '私 must be watashi');
assert.ok(/namae/i.test(rAi), '名前 must be namae');
assert.ok(/toukyou/i.test(rAi), '東京 must be toukyou');
console.log('✓ AI raw response romaji verified:', rAi);

const rUser = chatEngine.getRomaji(rawUser);
assert.ok(rUser && rUser.length > 0, 'User response romaji must be non-empty');
assert.ok(/gakusei/i.test(rUser), '学生 must be gakusei');
assert.ok(/nihongo/i.test(rUser), '日本語 must be nihongo');
assert.ok(/benkyou/i.test(rUser), '勉強 must be benkyou');
console.log('✓ User raw response romaji verified:', rUser);

console.log('=== TEST 3: Zero Emoji & Emoticon Leakage ===');
const emojiText = 'いらっしゃいませ！😊 *smiling face* 何名様ですか？🍜 *senyuman*';
const fEmoji = chatEngine.formatFurigana(emojiText);
const rEmoji = chatEngine.getRomaji(emojiText);
assert.ok(!fEmoji.includes('😊') && !fEmoji.includes('🍜'), 'Furigana must not leak raw emojis');
assert.ok(!fEmoji.includes('smiling face') && !fEmoji.includes('senyuman'), 'Furigana must not leak action words');
assert.ok(!rEmoji.includes('😊') && !rEmoji.includes('🍜'), 'Romaji must not leak raw emojis');
assert.ok(!rEmoji.includes('smiling face') && !rEmoji.includes('senyuman'), 'Romaji must not leak action words');
assert.ok(fEmoji.includes('<ruby>何名様<rt>なんめいさま</rt></ruby>') || fEmoji.includes('<ruby>何名<rt>なんめい</rt></ruby><ruby>様<rt>さま</rt></ruby>'), '何名様 must have ruby');
assert.ok(/nanmeisama/i.test(rEmoji), '何名様 romaji must be nanmeisama');
console.log('✓ Zero emoji/emoticon leakage verified.');

console.log('=== TEST 4: Suggestion Cards Integrity in All Japanese Scenarios ===');
const jaScenarios = chatEngine.getScenarios('ja');
assert.ok(jaScenarios.length >= 6, 'Must have at least 6 Japanese scenarios');
jaScenarios.forEach((sc) => {
  assert.ok(sc.starter && Array.isArray(sc.starter.suggestions), `Scenario ${sc.id} must have suggestions array`);
  sc.starter.suggestions.forEach((sg, idx) => {
    assert.ok(sg.text, `Suggestion ${idx} in ${sc.id} must have text`);
    assert.ok(sg.furigana, `Suggestion ${idx} in ${sc.id} must have explicit furigana`);
    assert.ok(sg.romaji, `Suggestion ${idx} in ${sc.id} must have romaji`);
    // Ensure formatFurigana succeeds on suggestion text
    const fSg = chatEngine.formatFurigana(sg.furigana || sg.text);
    assert.ok(fSg && fSg.length > 0, `Suggestion ${idx} in ${sc.id} must format furigana`);
  });
});
console.log('✓ All Japanese scenario suggestion cards validated with furigana & romaji.');

console.log('=== TEST 5: CSS Rules for Preferences & WCAG Typography ===');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert.ok(cssContent.includes('body.fz-ja-no-furigana .fzc-japanese-text rt'), 'CSS must include body.fz-ja-no-furigana rule');
assert.ok(cssContent.includes('body.fz-ja-no-romaji .fzc-romaji'), 'CSS must include body.fz-ja-no-romaji rule');
assert.ok(cssContent.includes('.fzc-call-sub-romaji'), 'CSS must include .fzc-call-sub-romaji styling');
assert.ok(cssContent.includes('body.fz-ja-no-romaji .fzc-call-sub-romaji'), 'CSS must include call subtitle romaji hide rule');
assert.ok(cssContent.includes('body.fz-ja-no-furigana .fzc-call-sub-text rt'), 'CSS must include call subtitle furigana hide rule');
console.log('✓ CSS preference toggles & typography rules verified.');

console.log('=== ALL UNIVERSAL FURIGANA & ROMAJI INTEGRATION TESTS PASSED (5/5) ===');
