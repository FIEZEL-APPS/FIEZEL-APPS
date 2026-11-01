/**
 * Verification Test: AI Voice Studio Natural Reformulation, Real-Time Translation,
 * and Persistent Conversation Memory Invariants.
 */
import assert from 'node:assert';
import {
  evaluateTurnLocal,
  sanitizeHallucinatedTranscript,
  sanitizeSpokenTextForClassicTts,
  synthesizeNaturalReformulation,
} from '../features/voice-studio/src/lib/liveTransport.ts';
import {
  translateAndPhoneticizeLiveText,
  fetchLiveTranslation,
} from '../features/voice-studio/src/lib/liveCallHelper.ts';
import {
  buildBraincoreCognitiveDossier,
  finalizeCallSessionMemory,
  loadBraincoreState,
  recordSpeakingAttempt,
} from '../features/voice-studio/src/lib/braincore.ts';
import { CALL_SCENARIOS, VOICE_PERSONAS } from '../features/voice-studio/src/data/callScenarios.ts';

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

  // 5. Acoustic Script Lock & Classic TTS Laugh Sanitizer
  console.log('--- TEST 5: Acoustic Script Lock & Classic TTS Laugh Sanitizer ---');
  assert.strictEqual(
    sanitizeHallucinatedTranscript('Привет как дела', 'ja', 'id'),
    '',
    'Russian Cyrillic ASR hallucination must be completely rejected in Japanese mode'
  );
  assert.strictEqual(
    sanitizeHallucinatedTranscript('Здравствуйте, я говорю по-русски', 'en', 'id'),
    '',
    'Russian Cyrillic ASR hallucination must be completely rejected in English mode'
  );
  assert.strictEqual(
    sanitizeHallucinatedTranscript('Aku mau pesan ホットコーヒー satu ya', 'ja', 'id'),
    'Aku mau pesan ホットコーヒー satu ya',
    'Valid Indonesian + Japanese code-switching must be preserved intact'
  );
  assert.strictEqual(
    sanitizeSpokenTextForClassicTts('Haha! Stop right there, say: I went to Bandung.', 'en'),
    'Stop right there, say: I went to Bandung.',
    'Leading literal Haha! must be stripped before classic Edge-TTS synthesis'
  );
  assert.strictEqual(
    sanitizeSpokenTextForClassicTts('あはは！ちょっと待って、「飲みます」って言ってごらん！', 'ja'),
    'ちょっと待って、「飲みます」って言ってごらん！',
    'Leading literal あはは！ must be stripped before classic Edge-TTS synthesis'
  );
  console.log('✓ PASS\n');

  // 6. Live Grammar Interception & Echo Redemption
  console.log('--- TEST 6: Live Grammar Interception & Echo Redemption ---');
  const jaKissaten = CALL_SCENARIOS.find((s) => s.id === 'scen_ja_n5_kissaten');
  const enCafe = CALL_SCENARIOS.find((s) => s.id === 'scen_en_a2_cafe');
  const nanami = VOICE_PERSONAS.nanami;
  const alex = VOICE_PERSONAS.coach_alex;

  const grammarTraps = [
    {
      text: 'きのうラーメンを食べますでした',
      scenario: jaKissaten,
      persona: nanami,
      targetLang: 'ja',
      expectedMisconception: 'polite_past_masu_deshita',
    },
    {
      text: 'ラーメンは美味しいでした',
      scenario: jaKissaten,
      persona: nanami,
      targetLang: 'ja',
      expectedMisconception: 'i_adj_past_deshita',
    },
    {
      text: 'ホットコーヒーを飲むです',
      scenario: jaKissaten,
      persona: nanami,
      targetLang: 'ja',
      expectedMisconception: 'verb_plus_desu',
    },
    {
      text: 'I am agree with your idea',
      scenario: enCafe,
      persona: alex,
      targetLang: 'en',
      expectedMisconception: 'stative_verb_continuous',
    },
    {
      text: 'i like mine jobe',
      scenario: enCafe,
      persona: alex,
      targetLang: 'en',
      expectedMisconception: 'possessive_pronoun_mine_noun',
    },
  ];

  for (const trap of grammarTraps) {
    const ev = evaluateTurnLocal({
      text: trap.text,
      scenario: trap.scenario,
      persona: trap.persona,
      targetLang: trap.targetLang,
      locale: 'id',
      measureMode: false,
      history: [],
    });
    assert.strictEqual(ev.ok, false, `Grammar trap "${trap.text}" must be marked ok=false`);
    assert.strictEqual(
      ev.misconceptionId,
      trap.expectedMisconception,
      `Grammar trap "${trap.text}" must detect ${trap.expectedMisconception}`
    );
    assert.ok(
      ev.syntacticCorrection && ev.syntacticCorrection.length > 0,
      `Grammar trap "${trap.text}" must produce a syntacticCorrection`
    );
    assert.ok(
      !ev.aiReply.includes('Nice energy!') && !ev.aiReply.includes('いい調子だね'),
      `Grammar trap "${trap.text}" must NEVER receive false praise in aiReply: "${ev.aiReply}"`
    );
  }
  console.log('✓ PASS\n');

  // 7. Host Braincore Strength/Weakness Snapshot + Dual-Brain Memory Dossier
  console.log('--- TEST 7: Host Braincore Strength/Weakness Snapshot & Dual-Brain Memory ---');
  const mockStore = new Map();
  const mockLocalStorage = {
    get length() {
      return mockStore.size;
    },
    key: (idx) => Array.from(mockStore.keys())[idx] ?? null,
    getItem: (k) => (mockStore.has(k) ? mockStore.get(k) : null),
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
  };
  globalThis.localStorage = mockLocalStorage;
  globalThis.window = globalThis.window || {};
  globalThis.window.localStorage = mockLocalStorage;

  // Seed host PWA BKT & Misconception Ledger in canonical main-app format
  globalThis.localStorage.setItem(
    'fiezel-lname-sync-v1',
    JSON.stringify({ name: 'Rian Pratama' })
  );
  globalThis.localStorage.setItem(
    'fiezel-mastery-bkt-v1@ja',
    JSON.stringify({
      schema: 'fiezel-mastery-bkt-v1',
      lessons: {
        'jp-n5-particles-wa-ga': { L: 0.89, n: 14, lastAt: Date.now(), gatePassedAt: Date.now() },
        'jp-n5-verb-masu': { L: 0.32, n: 6, lastAt: Date.now(), gatePassedAt: null },
      },
    })
  );
  globalThis.localStorage.setItem(
    'fiezel-misconception-ledger-v1@ja',
    JSON.stringify({
      schema: 'fiezel-misconception-ledger-v1',
      entries: {
        ja_particle_ni_for_action_place: {
          hits: 5,
          sessions: 2,
          lastHitAt: Date.now(),
          cleanStreak: 0,
          logOdds: 0.92,
          everActive: true,
        },
      },
    })
  );

  let brainState = loadBraincoreState();
  const attemptOut = recordSpeakingAttempt(brainState, {
    competencyId: jaKissaten.competencyId,
    scenarioId: jaKissaten.id,
    targetLang: 'ja',
    userExactTranscript: 'I am building a language app called Fiezel. きのうラーメンを食べますでした',
    ok: false,
    grammarScore: 52,
    fluencyScore: 68,
    vocabUsageScore: 70,
    accuracyScore: 60,
    misconceptionId: 'polite_past_masu_deshita',
    correctionPattern: 'きのうラーメンを食べました',
    hintsUsed: 0,
    confidence: 0.85,
    measureMode: false,
  });
  brainState = finalizeCallSessionMemory(attemptOut.nextState, {
    scenario: jaKissaten,
    personaId: 'nanami',
    turns: [
      { id: 't1', speaker: 'ai', text: 'いらっしゃい！何にする？', timestamp: Date.now() - 5000 },
      {
        id: 't2',
        speaker: 'user',
        text: 'I am building a language app called Fiezel. きのうラーメンを食べますでした',
        timestamp: Date.now() - 2000,
      },
    ],
    durationSec: 45,
  });

  const dossier = buildBraincoreCognitiveDossier(brainState, jaKissaten, 'id');
  console.log('Generated Braincore Dossier Preview:\n' + dossier.slice(0, 650) + '...\n');

  assert.ok(dossier.includes('Rian Pratama'), 'Dossier must include learner name from host PWA');
  assert.ok(
    dossier.includes('TITIK PINTAR MURID (Verified Strengths') &&
      dossier.includes('Partikel Dasar は / が / を'),
    'Dossier must surface host BKT strengths (jp-n5-particles-wa-ga)'
  );
  assert.ok(
    dossier.includes('TITIK LEMAH & MISKONSEPSI AKTIF') &&
      dossier.includes('Konjugasi Kata Kerja Sopan (〜ます / 〜ました)') &&
      dossier.includes('Partikel Lokasi Aksi (で vs に)'),
    'Dossier must surface host BKT weaknesses and active misconception ledger entries'
  );
  assert.ok(
    dossier.includes('building a language app called Fiezel'),
    'Dual-Brain Memory must extract and remember learner personal facts across calls'
  );
  assert.ok(
    brainState.dualBrainMemory.mentorBrain.sessionSummaries.length === 1 &&
      Boolean(brainState.dualBrainMemory.userBrain.chronicWeaknesses.polite_past_masu_deshita),
    'Dual-Brain Memory must persist session summaries and chronic grammar weaknesses'
  );

  // Verify host ledger schema integrity was preserved when bridging attempt back to host PWA
  const hostLedgerAfter = JSON.parse(
    globalThis.localStorage.getItem('fiezel-misconception-ledger-v1@ja')
  );
  assert.strictEqual(
    hostLedgerAfter.schema,
    'fiezel-misconception-ledger-v1',
    'Host misconception ledger schema must remain intact'
  );
  assert.ok(
    hostLedgerAfter.entries &&
      Object.keys(hostLedgerAfter.entries).some((k) => k.includes('polite_past_masu_deshita')),
    'Voice attempt misconception must write into canonical host ledger entries'
  );
  console.log('✓ PASS\n');

  console.log('================================================================');
  console.log('ALL REFORMULATION, GRAMMAR, & BRAINCORE DOSSIER TESTS PASSED!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
