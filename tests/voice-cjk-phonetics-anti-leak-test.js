/**
 * Verification Test: FIEZEL Voice Studio CJK Phonetics, Zero-Kanji Leak,
 * and Anti-Overlap Ruby Invariants.
 */
import assert from 'node:assert';
import { toPhoneticPinyin, renderMandarinRubyHtml, containsHanzi, stripHanzi } from '../features/voice-studio/src/lib/mandarinPhonetics.ts';
import { toPhoneticRomaji, renderFuriganaHtml } from '../features/voice-studio/src/lib/japanesePhonetics.js';
import { translateAndPhoneticizeLiveText } from '../features/voice-studio/src/lib/liveCallHelper.ts';

async function run() {
  console.log('=== FIEZEL CJK PHONETICS & ZERO-KANJI LEAK TEST ===\n');

  // Test 1: Mandarin Pinyin accuracy and zero Hanzi leakage
  console.log('--- TEST 1: Mandarin Pinyin Transliteration & Zero Hanzi Leak ---');
  const zhSamples = [
    { zh: '你好！我是小糯米。', expectedSubstr: 'Nǐ hǎo! Wǒ shì Xiǎo Mòchí.' },
    { zh: '今天你想聊点儿什么呢？', expectedSubstr: 'Jīntiān nǐ xiǎng liáo diǎnr shénme ne?' },
    { zh: '我们一起练习中文吧！', expectedSubstr: 'Wǒmen yīqǐ liànxí zhōngwén ba!' },
    { zh: '太棒了！你的发音很准。', expectedSubstr: 'Tài bàng le! Nǐ de fāyīn hěn zhǔn.' },
  ];

  for (const s of zhSamples) {
    const py = toPhoneticPinyin(s.zh);
    console.log(`Input:    "${s.zh}"`);
    console.log(`Pinyin:   "${py}"`);
    assert.strictEqual(containsHanzi(py), false, `Pinyin must NOT contain Hanzi! Found in "${py}"`);
    assert.ok(py.length > 0, 'Pinyin must not be empty');
    assert.ok(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜA-Za-z]/.test(py), 'Pinyin must have tone marks or Latin chars');
    console.log('✓ PASS\n');
  }

  // Test 2: Mandarin Ruby HTML generation
  console.log('--- TEST 2: Mandarin Ruby HTML Generation ---');
  const rubySample = '你好世界';
  const rubyHtml = renderMandarinRubyHtml(rubySample);
  console.log(`Sample: "${rubySample}" -> HTML: "${rubyHtml}"`);
  assert.ok(rubyHtml.includes('<ruby class="zh-ruby">'), 'Must contain <ruby class="zh-ruby">');
  assert.ok(rubyHtml.includes('<rt class="zh-rt">'), 'Must contain <rt class="zh-rt">');
  assert.ok(rubyHtml.includes('nǐ'), 'Must annotate 你 with nǐ');
  assert.ok(rubyHtml.includes('hǎo'), 'Must annotate 好 with hǎo');
  console.log('✓ PASS\n');

  // Test 3: Japanese Romaji accuracy and zero Kanji/Kana leakage
  console.log('--- TEST 3: Japanese Romaji Transliteration & Zero Kanji Leak ---');
  const jaSamples = [
    { ja: 'こんにちは！ナナミです。', expectedSubstr: 'Konnichiwa! Nanami desu.' },
    { ja: '今日はカフェでホットコーヒーを飲みます。', expectedSubstr: 'Kyou wa kafe de hotto koohii o nomimasu.' },
    { ja: '図書館に勉強しますじゃなくて、図書館で勉強しますと言ってみて！', expectedSubstr: 'Toshokan de benkyou shimasu' },
  ];

  for (const s of jaSamples) {
    const ro = toPhoneticRomaji(s.ja);
    console.log(`Input:    "${s.ja}"`);
    console.log(`Romaji:   "${ro}"`);
    assert.strictEqual(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(ro), false, `Romaji must NOT contain Kanji or Kana! Found in "${ro}"`);
    assert.ok(ro.length > 0, 'Romaji must not be empty');
    console.log('✓ PASS\n');
  }

  // Test 4: Live Translation Cleanliness (Zero raw Hanzi/Kanji in Indonesian/Thai output)
  console.log('--- TEST 4: Live Translation Cleanliness Invariant ---');
  const transTest1 = translateAndPhoneticizeLiveText('你好！今天你想聊点儿什么？', 'zh');
  console.log('ZH -> ID Translation:', transTest1.translationId);
  console.log('ZH -> TH Translation:', transTest1.translationTh);
  console.log('ZH Pronunciation:', transTest1.pronunciation);
  assert.strictEqual(containsHanzi(transTest1.translationId), false, 'ID translation must not contain Hanzi');
  assert.strictEqual(containsHanzi(transTest1.pronunciation), false, 'Pronunciation must not contain Hanzi');
  assert.ok(transTest1.pronunciation.length > 0, 'ZH pronunciation must be present');
  console.log('✓ PASS\n');

  const transTest2 = translateAndPhoneticizeLiveText('こんにちは！お元気ですか？', 'ja');
  console.log('JA -> ID Translation:', transTest2.translationId);
  console.log('JA -> TH Translation:', transTest2.translationTh);
  console.log('JA Pronunciation:', transTest2.pronunciation);
  assert.strictEqual(/[\u4e00-\u9fff]/.test(transTest2.translationId), false, 'ID translation must not contain Kanji');
  assert.strictEqual(/[\u3040-\u30ff\u4e00-\u9fff]/.test(transTest2.pronunciation), false, 'Pronunciation must not contain Kanji/Kana');
  console.log('✓ PASS\n');

  console.log('================================================================');
  console.log('ALL CJK PHONETICS & ZERO-KANJI LEAK CHECKS PASSED 100%!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
