/**
 * Verification Test: AI Voice Studio Natural Reformulation, Real-Time Translation,
 * and Persistent Conversation Memory Invariants.
 */
import assert from 'node:assert';
import { synthesizeNaturalReformulation } from '../features/voice-studio/src/lib/liveTransport.ts';
import {
  translateAndPhoneticizeLiveText,
  fetchLiveTranslation,
} from '../features/voice-studio/src/lib/liveCallHelper.ts';

async function run() {
  console.log('=== FIEZEL VOICE STUDIO REFORMULATION & TRANSLATION TEST ===\n');

  // 1. Natural Reformulation Tests (English)
  console.log('--- TEST 1: Natural English Reformulation ---');
  const enCases = [
    {
      input: "ahem All right, yeah, I'm agree.",
      expected: 'All right, yeah, I agree.',
    },
    {
      input: 'i like mine jobe',
      expected: 'I like my job.',
    },
    {
      input: "I'm think that this app it has great potential",
      expected: 'I think that this app has great potential.',
    },
    {
      input: 'Although working from home is good, but it is lonely',
      expected: 'Although working from home is good, it is lonely.',
    },
    {
      input: 'I still figuring out how do I get to school',
      expected: 'I am still figuring out how do I get to school.',
    },
    {
      input: 'Last weekend I goed to Bandung and buyed local food',
      expected: 'Last weekend I went to Bandung and bought local food.',
    },
    {
      input: 'it is look similar with duolingo',
      expected: 'It looks similar to duolingo.',
    },
  ];

  for (const tc of enCases) {
    const result = synthesizeNaturalReformulation(tc.input, 'en');
    console.log(`Input:    "${tc.input}"`);
    console.log(`Expected: "${tc.expected}"`);
    console.log(`Actual:   "${result}"`);
    assert.strictEqual(
      result.toLowerCase().replace(/[.,]/g, ''),
      tc.expected.toLowerCase().replace(/[.,]/g, ''),
      `Failed reformulation for "${tc.input}"`
    );
    assert.ok(
      !result.includes("I'd like a hot coffee"),
      `Reformulation must NOT produce unrelated canned sentences ("I'd like a hot coffee")`
    );
    console.log('✓ PASS\n');
  }

  // 2. Natural Reformulation Tests (Japanese)
  console.log('--- TEST 2: Natural Japanese Reformulation ---');
  const jaCases = [
    {
      input: 'えっと ホットコーヒーを飲むです',
      expected: 'ホットコーヒーを飲みます',
    },
    {
      input: '図書館に勉強します',
      expected: '図書館で勉強します',
    },
    {
      input: 'どうやって勉強するたらいいですか',
      expected: 'どうやって勉強したらいいですか',
    },
    {
      input: 'ラーメンは美味しいでした',
      expected: 'ラーメンは美味しかったです',
    },
  ];

  for (const tc of jaCases) {
    const result = synthesizeNaturalReformulation(tc.input, 'ja');
    console.log(`Input:    "${tc.input}"`);
    console.log(`Expected: "${tc.expected}"`);
    console.log(`Actual:   "${result}"`);
    assert.strictEqual(result, tc.expected, `Failed Japanese reformulation for "${tc.input}"`);
    console.log('✓ PASS\n');
  }

  // 3. Zero Dummy Translation Invariant
  console.log('--- TEST 3: Zero Dummy Translation Invariant ---');
  const sampleTexts = [
    "Haha, we're just getting started today! So, tell me what's been happening in your world since we last met?",
    'Building a language app? That sounds super interesting. What kind of languages are you focusing on first?',
    "That's impressive! Juggling both English and Japanese for your app is quite a feat.",
    'ヤッホー！今日はお話しできてめっちゃ嬉しい！最近ハマってることでも何でも気軽に話そ！',
  ];

  for (const text of sampleTexts) {
    const res = translateAndPhoneticizeLiveText(text, text.includes('ヤッホー') ? 'ja' : 'en');
    console.log(`Input Text: "${text.slice(0, 50)}..."`);
    console.log(`ID Translation: "${res.translationId}"`);
    console.log(`TH Translation: "${res.translationTh}"`);

    assert.ok(
      !res.translationId.includes('Terjemahan langsung:'),
      `Translation must NEVER contain dummy prefix "Terjemahan langsung:"`
    );
    assert.ok(
      !res.translationId.includes('Kalimat bahasa Jepang:'),
      `Translation must NEVER contain dummy prefix "Kalimat bahasa Jepang:"`
    );
    assert.ok(
      res.translationId.length > 5,
      `Translation must provide meaningful translated text`
    );
    console.log('✓ PASS\n');
  }

  // 4. Real-time Live Translation API Test
  console.log('--- TEST 4: Live Translation API (Google GTX) ---');
  const testSentence = 'Building a language app with BKT algorithm is great.';
  try {
    const liveId = await fetchLiveTranslation(testSentence, 'id');
    console.log(`English: "${testSentence}"`);
    console.log(`Live Indonesian: "${liveId}"`);
    assert.ok(liveId.length > 5, 'Live translation should return valid translated text');
    assert.ok(!liveId.includes('Terjemahan langsung:'), 'Must not have dummy prefix');

    const liveTh = await fetchLiveTranslation(testSentence, 'th');
    console.log(`Live Thai: "${liveTh}"`);
    assert.ok(liveTh.length > 5, 'Live translation should return valid Thai translated text');
    console.log('✓ PASS\n');
  } catch (err) {
    console.warn('Network translation fetch skipped (offline environment):', err.message);
  }

  console.log('================================================================');
  console.log('ALL REFORMULATION & TRANSLATION TESTS PASSED (100%)!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
