import assert from 'node:assert';
import {
  tokenizeJapaneseToRuby,
  renderFuriganaHtml,
  toPhoneticRomaji,
  stripEmojisAndEmotWords,
} from '../features/voice-studio/src/lib/japanesePhonetics.ts';

console.log('=== TESTING JAPANESE PHONETICS & FURIGANA ENGINE ===\n');

// 1. Particle は -> "wa" Tests
console.log('--- Test Suite 1: Particle は -> "wa" (Strict Rule) ---');

const t1 = toPhoneticRomaji('私は毎日日本語を勉強します。');
console.log('Input:  "私は毎日日本語を勉強します。"');
console.log('Romaji:', t1);
assert.match(t1, /\bWatashi wa\b/i, '私 + は must be "watashi wa", never "watashi ha"');
assert.match(t1, /\bnihongo o\b/i, '日本語 + を must be "nihongo o", never "nihongo wo"');

const t2 = toPhoneticRomaji('今日はいい天気ですね！');
console.log('Input:  "今日はいい天気ですね！"');
console.log('Romaji:', t2);
assert.match(t2, /\bKyou wa\b/i, '今日 + は must be "kyou wa", never "kyou ha"');

const t3 = toPhoneticRomaji('こんにちは、七海先生！');
console.log('Input:  "こんにちは、七海先生！"');
console.log('Romaji:', t3);
assert.match(t3, /\bKonnichiwa\b/i, 'こんにちは must be "konnichiwa", never "konnichiha"');

const t4 = toPhoneticRomaji('これは田中さんの本です。');
console.log('Input:  "これは田中さんの本です。"');
console.log('Romaji:', t4);
assert.match(t4, /\bKore wa\b/i, 'これ + は must be "kore wa"');
assert.match(t4, /\bTanaka-san no hon desu\b/i, '田中さんの本です must be "Tanaka-san no hon desu"');

const t5 = toPhoneticRomaji('画面は無事だったから良かった！');
console.log('Input:  "画面は無事だったから良かった！"');
console.log('Romaji:', t5);
assert.match(t5, /\bGamen wa\b/i, '画面 + は must be "gamen wa"');
assert.match(t5, /\byokatta\b/i, '良かった must be "yokatta"');

// 2. Particle を -> "o" & へ -> "e"
console.log('\n--- Test Suite 2: Particle を -> "o" & へ -> "e" ---');
const t6 = toPhoneticRomaji('学校へ行きます。コーヒーをください。');
console.log('Input:  "学校へ行きます。コーヒーをください。"');
console.log('Romaji:', t6);
assert.match(t6, /\bGakkou e\b/i, '学校 + へ must be "gakkou e"');
assert.match(t6, /\bkoohii o\b/i, 'コーヒー + を must be "koohii o"');

// 3. Sokuon & Yoon
console.log('\n--- Test Suite 3: Sokuon っ & Yoon ---');
const t7 = toPhoneticRomaji('目覚まし時計を止めようとしてスマホをベッドから落としちゃった！');
console.log('Input:  "目覚まし時計を止めようとしてスマホをベッドから落としちゃった！"');
console.log('Romaji:', t7);
assert.match(t7, /\botoshichatta\b/i, '落としちゃった must be "otoshichatta"');
assert.match(t7, /\bbeddo\b/i, 'ベッド must be "beddo"');

// 4. Furigana HTML Generation
console.log('\n--- Test Suite 4: Furigana Ruby HTML ---');
const f1 = renderFuriganaHtml('私は毎日日本語を勉強します。');
console.log('Furigana HTML:', f1);
assert.ok(f1.includes('<ruby class="fz-ja-ruby">私<rt class="fz-ja-rt">わたし</rt></ruby>'), '私 must have ruby わたし');
assert.ok(f1.includes('<ruby class="fz-ja-ruby">毎日<rt class="fz-ja-rt">まいにち</rt></ruby>'), '毎日 must have ruby まいにち');
assert.ok(f1.includes('<ruby class="fz-ja-ruby">日本語<rt class="fz-ja-rt">にほんご</rt></ruby>'), '日本語 must have ruby にほんご');
assert.ok(f1.includes('<ruby class="fz-ja-ruby">勉強<rt class="fz-ja-rt">べんきょう</rt></ruby>'), '勉強 must have ruby べんきょう');

// 5. Emoji & Emoticon Stripping
console.log('\n--- Test Suite 5: Emoji & Emoticon Stripping ---');
const rawWithEmots = 'あはは！やばいね！ 😂 😊 (smiling face) *laughs*';
const cleaned = stripEmojisAndEmotWords(rawWithEmots);
console.log('Raw with emots:  ', rawWithEmots);
console.log('Cleaned text:    ', cleaned);
assert.strictEqual(cleaned, 'あはは！やばいね！', 'All emojis and emoticon text must be completely removed');

console.log('\n🎉 ALL JAPANESE PHONETICS & FURIGANA TESTS PASSED WITH 100% ACCURACY!');
