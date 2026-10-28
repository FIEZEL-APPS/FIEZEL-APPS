#!/usr/bin/env node
/**
 * tests/japanese-phonetics-test.js
 * Verification of FIEZEL Japanese Phonetics & Furigana Engine:
 * 1. Particle は -> "wa" (Strict Rule)
 * 2. Particle を -> "o" (Never "wo") & へ -> "e" (Direction)
 * 3. International Standard Hepburn Phonetics (Yoon j: ja/ju/jo, sh: sha/shu/sho, ch: cha/chu/cho)
 * 4. Sokuon っ: before ch -> tch (chotto, matchi, kotchi, botchan), doubling consonant
 * 5. Long vowels: ー prolongs preceding vowel (koohii, beddo, paatii), おう/おお -> ou/oo
 * 6. Engine Parity: FiezelJaUi.kanaToRomaji === japanesePhonetics.kanaStringToRomaji
 * 7. Furigana Ruby HTML rendering & Emoji Stripping
 * 8. Zero Kanji Leakage on Conversational Sentences
 */

'use strict';
const assert = require('node:assert');
const path = require('node:path');

// Set up minimal globals required by FiezelJaUi
global.self = global;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.document = {
  body: { classList: { toggle: () => {} } },
  querySelectorAll: () => [],
  getElementById: () => null
};
global.FiezelJaDictionary = require('../features/japanese/fiezel-ja-dictionary.js');

async function runTests() {
  console.log('=== TESTING JAPANESE PHONETICS & FURIGANA ENGINE (HEPBURN ARBITER) ===\n');

  const {
    tokenizeJapaneseToRuby,
    renderFuriganaHtml,
    toPhoneticRomaji,
    kanaStringToRomaji,
    stripEmojisAndEmotWords,
  } = await import('../features/voice-studio/src/lib/japanesePhonetics.js');

  const FiezelJaUi = require('../features/japanese/fiezel-ja-ui.js');

  // =========================================================================
  // 1. Particle は -> "wa" Tests (Kanji, Kana, Pronouns, Greetings, Negative)
  // =========================================================================
  console.log('--- Test Suite 1: Particle は -> "wa" (Strict Rule) ---');

  const topicCases = [
    { in: '私は毎日日本語を勉強します。', match: /\bWatashi wa\b/i, label: '私 + は' },
    { in: 'わたしはがくせいです。', match: /\bWatashi wa\b/i, label: 'わたし + は (kana)' },
    { in: '僕はお腹が空きました。', match: /\bBoku wa\b/i, label: '僕 + は' },
    { in: 'ぼくはがくせいです。', match: /\bBoku wa\b/i, label: 'ぼく + は (kana)' },
    { in: '俺は行くぜ。', match: /\bOre wa\b/i, label: '俺 + は' },
    { in: '君は優しいね。', match: /\bKimi wa\b/i, label: '君 + は' },
    { in: 'あなたは先生ですか？', match: /\bAnata wa\b/i, label: 'あなた + は' },
    { in: '彼は友達です。', match: /\bKare wa\b/i, label: '彼 + は' },
    { in: '彼女は親切です。', match: /\bKanojo wa\b/i, label: '彼女 + は' },
    { in: '今日はいい天気ですね！', match: /\bKyou wa\b/i, label: '今日 + は' },
    { in: 'きょうはいい天気ですね！', match: /\bKyou wa\b/i, label: 'きょう + は (kana)' },
    { in: '昨日は雨でした。', match: /\bKinou wa\b/i, label: '昨日 + は' },
    { in: 'きのうはいきました。', match: /\bKinou wa\b/i, label: 'きのう + は (kana)' },
    { in: '明日は休みです。', match: /\bAshita wa\b/i, label: '明日 + は' },
    { in: 'あしたはいきません。', match: /\bAshita wa\b/i, label: 'あした + は (kana)' },
    { in: '今は忙しい。', match: /\bIma wa\b/i, label: '今 + は' },
    { in: 'これは田中さんの本です。', match: /\bKore wa\b/i, label: 'これ + は' },
    { in: '画面は無事だったから良かった！', match: /\bGamen wa\b/i, label: '画面 + は' },
    { in: 'がめんはきれい。', match: /\bGamen wa\b/i, label: 'がめん + は (kana)' },
    { in: 'こんにちは、七海先生！', match: /\bKonnichiwa\b/i, label: 'こんにちは greeting' },
    { in: 'こんばんは、健太先輩！', match: /\bKonbanwa\b/i, label: 'こんばんは greeting' },
    { in: '学生ではありません。', match: /\bdewa arimasen\b/i, label: 'ではありません negative' },
    { in: '日本人じゃありません。', match: /\bja arimasen\b/i, label: 'じゃありません negative' },
    { in: '母はははと笑いました。', match: /\bHaha wa haha/i, label: '母は (wa) + はは (haha noun/laughter)' },
  ];

  for (const tc of topicCases) {
    const res = toPhoneticRomaji(tc.in);
    console.log(`  [Pass] ${tc.label}: "${tc.in}" -> "${res}"`);
    assert.match(res, tc.match, `${tc.label} must match ${tc.match}, got "${res}"`);
    // Ensure no unseparated "ha" leakage
    assert.doesNotMatch(res, /\b(watashi|boku|ore|kimi|anata|kare|kanojo|kyou|kinou|ashita|ima|kore|gamen)ha\b/i,
      `No unseparated '...ha' in "${res}"`);
  }

  // =========================================================================
  // 2. Particle を -> "o" & Particle へ -> "e"
  // =========================================================================
  console.log('\n--- Test Suite 2: Particle を -> "o" & Particle へ -> "e" ---');

  const particleOE = [
    { in: '学校へ行きます。コーヒーをください。', matchO: /\bkoohii o\b/i, matchE: /\bGakkou e\b/i },
    { in: 'がっこうへいく。ほんをよむ。', matchO: /\bhon o\b/i, matchE: /\bGakkou e\b/i },
    { in: '日本へ来ました。魚料理を食べます。', matchO: /\bsakana\s*ryouri o\b/i, matchE: /\bNihon e\b/i },
    { in: '駅へ急ぎます。', matchO: null, matchE: /\bEki e\b/i },
    { in: '部屋へ入ります。', matchO: null, matchE: /\bHeya e\b/i },
  ];

  for (const tc of particleOE) {
    const res = toPhoneticRomaji(tc.in);
    console.log(`  [Pass] "${tc.in}" -> "${res}"`);
    if (tc.matchO) assert.match(res, tc.matchO, `Object particle を must be 'o': "${res}"`);
    if (tc.matchE) assert.match(res, tc.matchE, `Direction particle へ must be 'e': "${res}"`);
    assert.doesNotMatch(res, /\bwo\b/i, `Particle を must never be 'wo' in "${res}"`);
  }

  // Ensure word roots starting with "he" are preserved
  const heyaRes = toPhoneticRomaji('部屋の返事');
  assert.match(heyaRes, /\bHeya no henji\b/i, `Word roots 'heya' and 'henji' must preserve 'he': "${heyaRes}"`);

  // =========================================================================
  // 3. International Standard Hepburn Phonetics: Yoon (j: ja/ju/jo, sh, ch)
  // =========================================================================
  console.log('\n--- Test Suite 3: Pure Hepburn Phonetics (Yoon j, sh, ch) ---');

  const yoonTests = [
    // Yoon with j: MUST BE ja, ju, jo (NEVER jya, jyu, jyo)
    { in: 'じゃあ、準備をしましょう。', match: /\bJaa, junbi o shimashou\b/i, label: 'じゃあ / 準備' },
    { in: '日本語が上手ですね。', match: /\bjouzu desu ne\b/i, label: '上手 (jouzu)' },
    { in: 'オレンジジュースを飲みます。', match: /\borenji\s*juusu\b/i, label: 'ジュース (juusu)' },
    { in: '上司と神社へ行きました。', match: /\bJoushi to jinja e\b/i, label: '上司 (joushi) / 神社 (jinja)' },
    { in: '邪魔しないでください。', match: /\bJama\b/i, label: '邪魔 (jama)' },
    { in: '写真を撮ります。', match: /\bShashin\b/i, label: '写真 (shashin)' },
    { in: '趣味は読書です。', match: /\bShumi\b/i, label: '趣味 (shumi)' },
    { in: 'お茶をどうぞ。', match: /\bO-cha\b/i, label: 'お茶 (o-cha)' },
    { in: '教室で勉強します。', match: /\bKyoushitsu\b/i, label: '教室 (kyoushitsu)' },
  ];

  for (const tc of yoonTests) {
    const res = toPhoneticRomaji(tc.in);
    console.log(`  [Pass] ${tc.label}: "${tc.in}" -> "${res}"`);
    assert.match(res, tc.match, `${tc.label} output "${res}" does not match ${tc.match}`);
    // Strict elimination check: ZERO jya, jyu, jyo allowed
    assert.doesNotMatch(res, /jy[auo]/i, `Hepburn violation! Found anomalous jy[auo] in "${res}"`);
  }

  // =========================================================================
  // 4. Sokuon っ: Before ch -> tch, Consonant Doubling
  // =========================================================================
  console.log('\n--- Test Suite 4: Sokuon っ (tch before ch & Doubling) ---');

  const sokuonTests = [
    { in: 'ちょっと待ってください。', match: /\bChotto matte kudasai\b/i, label: 'ちょっと (chotto)' },
    { in: 'マッチ箱とスイッチ', match: /\bMatchi.*suitchi\b/i, label: 'マッチ (matchi) / スイッチ (suitchi)' },
    { in: 'こっちに来てください。', match: /\bKotchi ni kite kudasai\b/i, label: 'こっち (kotchi)' },
    { in: '坊ちゃん、お茶をどうぞ。', match: /\bBotchan, o-cha\b/i, label: '坊ちゃん (botchan)' },
    { in: '画面は無事だったから良かった！', match: /\byokatta\b/i, label: '良かった (yokatta)' },
    { in: '学校へ一緒に行きます。', match: /\bGakkou e issho ni\b/i, label: '学校 (gakkou) / 一緒 (issho)' },
    { in: 'スマホをベッドから落としちゃった！', match: /\bbeddo kara otoshichatta\b/i, label: 'ベッド (beddo) / 落としちゃった' },
  ];

  for (const tc of sokuonTests) {
    const res = toPhoneticRomaji(tc.in);
    console.log(`  [Pass] ${tc.label}: "${tc.in}" -> "${res}"`);
    assert.match(res, tc.match, `${tc.label} output "${res}" does not match ${tc.match}`);
    // Sokuon before ch must be 'tch', never 'cch' or 'ctotto'
    assert.doesNotMatch(res, /cch/i, `Hepburn violation! Found 'cch' instead of 'tch' in "${res}"`);
    assert.doesNotMatch(res, /ctotto/i, `Corrupted romaji found in "${res}"`);
  }

  // =========================================================================
  // 5. Long Vowels: Chōonpu ー & おう/おお -> ou/oo
  // =========================================================================
  console.log('\n--- Test Suite 5: Long Vowels (ー & おう/おお) ---');

  const longVowelTests = [
    { in: 'コーヒー', match: /\bKoohii\b/i, label: 'コーヒー (koohii)' },
    { in: 'ベッド', match: /\bBeddo\b/i, label: 'ベッド (beddo)' },
    { in: 'パーティー', match: /\bPaatii\b/i, label: 'パーティー (paatii)' },
    { in: 'ジュース', match: /\bJuusu\b/i, label: 'ジュース (juusu)' },
    { in: '今日', match: /\bKyou\b/i, label: '今日 (kyou)' },
    { in: '学校', match: /\bGakkou\b/i, label: '学校 (gakkou)' },
    { in: '大きい', match: /\bOokii\b/i, label: '大きい (ookii)' },
    { in: '遠い', match: /\bTooi\b/i, label: '遠い (tooi)' },
    { in: 'お父さん', match: /\bOtousan\b/i, label: 'お父さん (otousan)' },
  ];

  for (const tc of longVowelTests) {
    const res = toPhoneticRomaji(tc.in);
    console.log(`  [Pass] ${tc.label}: "${tc.in}" -> "${res}"`);
    assert.match(res, tc.match, `${tc.label} output "${res}" does not match ${tc.match}`);
  }

  // =========================================================================
  // 6. Engine Parity: FiezelJaUi.kanaToRomaji === japanesePhonetics.kanaStringToRomaji
  // =========================================================================
  console.log('\n--- Test Suite 6: Engine Parity (FiezelJaUi vs japanesePhonetics) ---');

  const parityPairs = [
    'きょうしつ',
    'がっこう',
    'じゃあ',
    'じゅんび',
    'じょうず',
    'ちょっと',
    'まっち',
    'こっち',
    'ぼっちゃん',
    'こーひー',
    'べっど',
    'ぱーてぃー',
    'じゅーす',
    'しゃしん',
    'おちゃ',
    'れんあい',
    'ほんや',
    'すいっち',
    'いっしょ',
    'おとうさん',
    'おおきい',
    'とおい',
    'しんぶん',
    'たいせつ',
    'ともだち',
    'せんせい',
    'がくせい',
    'すまほ',
  ];

  let parityCount = 0;
  for (const kana of parityPairs) {
    const romajiUi = FiezelJaUi.kanaToRomaji(kana);
    const romajiVoice = kanaStringToRomaji(kana);
    console.log(`  [Parity] "${kana}" -> UI: "${romajiUi}", Voice: "${romajiVoice}"`);
    assert.strictEqual(
      romajiUi,
      romajiVoice,
      `Engine mismatch for kana "${kana}"! UI returned "${romajiUi}" but Voice returned "${romajiVoice}"`
    );
    // Neither may have jya/jyu/jyo or cch
    assert.doesNotMatch(romajiUi, /jy[auo]/i, `UI returned anomalous jy in "${romajiUi}"`);
    assert.doesNotMatch(romajiVoice, /jy[auo]/i, `Voice returned anomalous jy in "${romajiVoice}"`);
    assert.doesNotMatch(romajiUi, /cch/i, `UI returned cch instead of tch in "${romajiUi}"`);
    assert.doesNotMatch(romajiVoice, /cch/i, `Voice returned cch instead of tch in "${romajiVoice}"`);
    parityCount++;
  }
  console.log(`Verified ${parityCount}/${parityPairs.length} kana words: 100% IDENTICAL PARITY.`);

  // =========================================================================
  // 7. Furigana Ruby HTML & Emoji Stripping
  // =========================================================================
  console.log('\n--- Test Suite 7: Furigana Ruby HTML & Emoji Stripping ---');

  const rubyHtml = renderFuriganaHtml('私は毎日日本語を勉強します。');
  console.log('Furigana HTML:', rubyHtml);
  assert.ok(rubyHtml.includes('<ruby class="fz-ja-ruby">私<rt class="fz-ja-rt">わたし</rt></ruby>'), 'Furigana ruby for 私');
  assert.ok(rubyHtml.includes('<ruby class="fz-ja-ruby">毎日<rt class="fz-ja-rt">まいにち</rt></ruby>'), 'Furigana ruby for 毎日');
  assert.ok(rubyHtml.includes('<ruby class="fz-ja-ruby">日本語<rt class="fz-ja-rt">にほんご</rt></ruby>'), 'Furigana ruby for 日本語');
  assert.ok(rubyHtml.includes('<ruby class="fz-ja-ruby">勉強<rt class="fz-ja-rt">べんきょう</rt></ruby>'), 'Furigana ruby for 勉強');

  const rawWithEmots = 'あはは！やばいね！ 😂 😊 (smiling face) *laughs*';
  const cleaned = stripEmojisAndEmotWords(rawWithEmots);
  console.log('Raw with emots:  ', rawWithEmots);
  console.log('Cleaned text:    ', cleaned);
  assert.strictEqual(cleaned, 'あはは！やばいね！', 'All emojis and emoticon text must be completely removed');

  // =========================================================================
  // 8. Strict Zero-Kanji Leakage on Conversational Dialogue
  // =========================================================================
  console.log('\n--- Test Suite 8: Strict Zero-Kanji Leakage on Conversational Sentences ---');

  const conversationalSentences = [
    'ヤッホー！今日はお話しできてめっちゃ嬉しい！最近ハマってることでも、今日あった面白いことでも、何でも気軽に話そ！最近どう？',
    'ヤッホー！お返事ありがとう！今日はどんな一日だった？何か楽しいことあった？',
    'あはは、そういう日もあるよね！じゃあ、今日食べた美味しいものでも教えてくれる？',
    'あはは、めっちゃ嫌なことあったんだね。話せる範囲でいいから、愚痴でも何でも聞くよ！',
    'まあ、そういう時もあるよね！じゃあ、今週末は何か楽しみな予定ある？',
    'あらら、お仕事かな？お疲れ様！無理しすぎないで、しっかり休んでね！',
    'こんばんは！夜のお喋りも楽しいよね。今日もう一日お疲れ様、何かいいことあった？',
    '塩気があってご飯が進むやつだね！私も大好き！他に好きなご飯のお供ってある？',
    '魚料理は美味しいよね！特にどんな魚や料理法が好き？',
    'あはは、鮭だね！お刺身も焼き魚も美味しいよね！ちなみに、どっちの料理法が一番好き？',
    '「気にしないで」は、インドネシア語で「Jangan dipikirkan」だよ。他に知りたい言葉はある？',
    'あはは！全然そんなことないよ！一生懸命日本語を話そうとしていて、とっても素敵だよ！',
    'あはは！もう、意地悪なんだから！でも、そんな冗談も言えるようになって、日本語が上手になってる証拠ね！',
  ];
  const KANJI_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3005]/;
  for (const s of conversationalSentences) {
    const res = toPhoneticRomaji(s);
    assert.strictEqual(
      KANJI_RE.test(res),
      false,
      `ZERO Kanji leakage violation! Kanji found in Romaji output for "${s}": "${res}"`
    );
    assert.doesNotMatch(res, /jy[auo]/i, `Hepburn violation in conversational sentence: "${res}"`);
    assert.doesNotMatch(res, /cch/i, `Sokuon violation in conversational sentence: "${res}"`);
  }
  console.log(`Validated ${conversationalSentences.length} complex conversational sentences: ZERO Kanji leaks detected.`);

  console.log('\n🎉 ALL JAPANESE PHONETICS & FURIGANA TESTS PASSED WITH 100% ACCURACY!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
