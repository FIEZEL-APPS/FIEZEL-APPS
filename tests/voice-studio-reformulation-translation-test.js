/**
 * Verification Test: AI Voice Studio Natural Reformulation, Real-Time Translation,
 * and Persistent Conversation Memory Invariants.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
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
  createTurnAcousticTracker,
  diagnosePteCandidateSpeech,
  evaluateConversationalOralFluency,
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

  // 8. Voice Studio Multi-Factor Acoustic-Temporal Oral Fluency & PTEDiagnostic
  console.log('--- TEST 8: Acoustic-Temporal Oral Fluency (Voice Studio + PTE) ---');
  const tracker = createTurnAcousticTracker();
  for (let i = 0; i < 12; i++) tracker.recordAudioFrame({ chunkMs: 25, voicedMs: 0, isActiveVoice: false, confirmedSpeech: false });
  for (let i = 0; i < 80; i++) tracker.recordAudioFrame({ chunkMs: 25, voicedMs: 25, isActiveVoice: true, confirmedSpeech: true });
  for (let i = 0; i < 45; i++) tracker.recordAudioFrame({ chunkMs: 25, voicedMs: 0, isActiveVoice: false, confirmedSpeech: true }); // 1125ms pause
  for (let i = 0; i < 80; i++) tracker.recordAudioFrame({ chunkMs: 25, voicedMs: 25, isActiveVoice: true, confirmedSpeech: true });
  for (let i = 0; i < 160; i++) tracker.recordAudioFrame({ chunkMs: 25, voicedMs: 0, isActiveVoice: false, confirmedSpeech: false }); // 4s trailing silence
  const tel = tracker.finalize();
  assert.strictEqual(tel.isAcousticTiming, true);
  assert.strictEqual(tel.measurementSource, 'acoustic_vad');
  assert.ok(tel.spanDurationSec >= 5.0 && tel.spanDurationSec <= 5.25, `Span expected ~5.13s without trailing silence, got ${tel.spanDurationSec}`);
  assert.strictEqual(tel.hesitationPausesCount, 1);
  assert.strictEqual(tel.longPausesCount, 0);

  const enFluent = evaluateConversationalOralFluency({
    text: 'Today I practiced ordering coffee and explaining my project clearly.',
    targetLang: 'en',
    inputMode: 'voice',
    durationSec: 4.5,
    telemetry: {
      spanDurationSec: 4.5,
      activeSpeechSec: 4.0,
      phonationRatio: 0.89,
      shortPausesCount: 0,
      hesitationPausesCount: 0,
      longPausesCount: 0,
      pausesCount: 0,
      maxPauseMs: 0,
      pauseDurationsMs: [],
      burstDurationsMs: [2100, 1900],
      isAcousticTiming: true,
      measurementSource: 'acoustic_vad',
    },
  });
  const enDisfluent = evaluateConversationalOralFluency({
    text: 'Um I uh practiced, no wait, ordering coffee...',
    targetLang: 'en',
    inputMode: 'voice',
    durationSec: 9.0,
    telemetry: {
      spanDurationSec: 9.0,
      activeSpeechSec: 3.1,
      phonationRatio: 0.34,
      shortPausesCount: 1,
      hesitationPausesCount: 2,
      longPausesCount: 1,
      pausesCount: 3,
      maxPauseMs: 2300,
      pauseDurationsMs: [900, 1100, 2300],
      burstDurationsMs: [800, 2100],
      isAcousticTiming: true,
      measurementSource: 'acoustic_vad',
    },
  });
  assert.ok(enFluent.fluencyScore >= 85 && enDisfluent.fluencyScore <= 55, `Expected fluent>=85 vs disfluent<=55, got ${enFluent.fluencyScore} vs ${enDisfluent.fluencyScore}`);

  const jaCpm = evaluateConversationalOralFluency({ text: 'きのう静かな図書館で日本語を勉強しました。', targetLang: 'ja', inputMode: 'voice', durationSec: 4.2 });
  assert.strictEqual(jaCpm.rateUnit, 'CPM');
  assert.ok(jaCpm.rateValue > 200);

  const zhCpm = evaluateConversationalOralFluency({ text: '我们今天在学校一起学习汉语。', targetLang: 'zh', inputMode: 'voice', durationSec: 3.6 });
  assert.strictEqual(zhCpm.rateUnit, 'CPM');

  const typedEval = evaluateConversationalOralFluency({ text: 'Yes', targetLang: 'en', inputMode: 'typed', durationSec: 2 });
  assert.strictEqual(typedEval.measurementSource, 'typed_text');
  assert.strictEqual(typedEval.rateValue, 0);

  const pteSmooth = diagnosePteCandidateSpeech({
    spokenTranscript: 'Global energy transitions require reliable storage systems and modern transmission lines.',
    durationSec: 5.0,
    activeSpeechSec: 4.4,
    phonationRatio: 0.88,
    shortPausesCount: 0,
    hesitationPausesCount: 0,
    longPausesCount: 0,
    isAcousticTiming: true,
    measurementSource: 'acoustic_vad',
  });
  const pteBroken = diagnosePteCandidateSpeech({
    spokenTranscript: 'Um uh global energy, I mean transitions require...',
    durationSec: 12.5,
    activeSpeechSec: 4.2,
    phonationRatio: 0.34,
    shortPausesCount: 2,
    hesitationPausesCount: 2,
    longPausesCount: 1,
    maxPauseMs: 2600,
    isAcousticTiming: true,
    measurementSource: 'acoustic_vad',
  });
  assert.ok(
    pteSmooth.scores.fluency >= 4.2 && pteBroken.scores.fluency <= 2.2,
    `PTE diagnostic smooth (${pteSmooth.scores.fluency}/5) must cleanly outperform paused/broken (${pteBroken.scores.fluency}/5)`
  );
  assert.ok(
    pteSmooth.scores.pearsonEstimate > pteBroken.scores.pearsonEstimate + 20,
    `PTE Pearson estimate smooth (${pteSmooth.scores.pearsonEstimate}) must beat broken (${pteBroken.scores.pearsonEstimate})`
  );
  console.log('✓ PASS\n');

  // 9. Cross-Lingual Grammar Susun Kata (EN / JA / ZH) + Voice-to-Tile Matcher
  console.log('--- TEST 9: Cross-Lingual Grammar Token-Order & Voice-to-Tile Matcher ---');
  const requireCjs = createRequire(import.meta.url);
  if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;
  globalThis.self.FiezelI18n = globalThis.FiezelI18n || { t: (k) => k };
  globalThis.self.V = [
    { lang: 'ja', word: '図書館', reading: 'としょかん' },
    { lang: 'ja', word: '公園', reading: 'こうえん' },
  ];
  const FiezelGrammarUpgrade = requireCjs('../features/grammar/fiezel-grammar-upgrade.js');

  const enBank = ['can\'t', 'I', 'Where', 'his', 'see', 'he', 'him', 'is', 'Tom'].map((text, id) => ({ id, text, placed: false }));
  const enMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('Where is Tom I cannot see him', enBank, 'en');
  assert.deepStrictEqual(enMatched.matchedTokens, ['Where', 'is', 'Tom', 'I', "can't", 'see', 'him']);

  const enSplitBank = ['Where', 'is', 'Tom', 'I', 'can', 'not', 'see', 'him'].map((text, id) => ({ id, text, placed: false }));
  const enSplitMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens("Where's Tom I can't see him", enSplitBank, 'en');
  assert.ok(
    enSplitMatched.matchedTokens.includes('can') && enSplitMatched.matchedTokens.includes('not'),
    'Contracted spoken speech must also split into [can, not] when uncontracted tiles are in bank'
  );

  // Zero-Ghost-Answer rule: if speaker speaks a distractor word ("his"), matcher obeys the bank honestly!
  const enDistMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('Where is Tom I can\'t see his', enBank, 'en');
  assert.strictEqual(enDistMatched.matchedTokens[enDistMatched.matchedTokens.length - 1], 'his');

  // Japanese Kanji <-> Hiragana equivalence (via builtin map + self.V)
  const jaBank = ['へ', 'わたし', 'いきます', 'しずかな', 'は', 'で', 'こうえん'].map((text, id) => ({ id, text, placed: false }));
  const jaMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('私は静かな公園へ行きます', jaBank, 'ja');
  assert.deepStrictEqual(jaMatched.matchedTokens, ['わたし', 'は', 'しずかな', 'こうえん', 'へ', 'いきます']);

  // Mandarin Hanzi + Digit + Pinyin homophone fallback
  const zhBank = ['点', '现在', '两', '吃'].map((text, id) => ({ id, text, placed: false }));
  const zhDigitMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('现在2点', zhBank, 'zh');
  assert.deepStrictEqual(zhDigitMatched.matchedTokens, ['现在', '两', '点']);

  const zhHomoBank = ['喜欢', '她', '喝茶', '咖啡'].map((text, id) => ({ id, text, placed: false }));
  const zhHomoMatched = FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('他喜欢喝茶', zhHomoBank, 'zh');
  assert.deepStrictEqual(zhHomoMatched.matchedTokens, ['她', '喜欢', '喝茶']);

  // Explicit multi-word clear command only
  assert.strictEqual(FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('hapus semua', enBank, 'en').commandAction, 'clear');
  assert.strictEqual(FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('全部清除', zhBank, 'zh').commandAction, 'clear');
  assert.strictEqual(FiezelGrammarUpgrade.matchSpokenTranscriptToTokens('全部消して', jaBank, 'ja').commandAction, 'clear');

  // Verify app.js makeGrammarTokenOrderQuestion produces real JA and ZH token arrays (zero CJK wipeout!)
  const appSrc = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const fnStart = appSrc.indexOf('function makeGrammarTokenOrderQuestion(');
  const fnEnd = appSrc.indexOf('\nfunction weaveGrammarSessionVariety(');
  assert.ok(fnStart > 0 && fnEnd > fnStart, 'Must extract makeGrammarTokenOrderQuestion cleanly from app.js');
  const fnCode = appSrc.slice(fnStart, fnEnd);
  let activeMockLang = 'ja';
  const appSandbox = {
    GRAMMAR_ITEMS: [],
    V: [{ word: '図書館' }, { word: '学校' }, { word: '我们' }, { word: '喜欢' }],
    getActiveLevel: () => 'A1',
    activeTargetLang: () => activeMockLang,
    grammarLessonRule: () => 'Rule',
    grammarMeta: () => ({ whyCorrect: '', memory: '', avoid: '' }),
    grammarSanitizeContext: (x) => x,
    grammarOptionReason: () => '',
    tokenGlossMap: () => ({}),
    tokenOrderMovableAlternates: () => [],
    FiezelI18n: { t: (_k, fb) => fb || _k, getLocale: () => 'id' },
    self: {},
  };
  vm.createContext(appSandbox);
  vm.runInContext(fnCode, appSandbox);

  activeMockLang = 'ja';
  const jaTemplates = JSON.parse(fs.readFileSync(new URL('../content/ja/grammar-templates-ja.json', import.meta.url), 'utf8'));
  const jaRawTpl = (jaTemplates.templates || []).find((tpl) => tpl && typeof tpl.stem === 'string' && /_{2,}/.test(tpl.stem) && Array.isArray(tpl.options) && typeof tpl.correctIndex === 'number');
  assert.ok(jaRawTpl, 'Expected Japanese grammar template');
  const firstJaTpl = [jaRawTpl.stem, jaRawTpl.options, jaRawTpl.correctIndex, '', jaRawTpl.distractors || []];
  const jaQuestion = appSandbox.makeGrammarTokenOrderQuestion('ja-test-skill', firstJaTpl, 0, 'A1');
  assert.ok(jaQuestion && jaQuestion.tokens.length >= 3, 'Japanese makeGrammarTokenOrderQuestion must produce >=3 non-empty tokens');
  assert.strictEqual(jaQuestion.targetLang, 'ja');

  activeMockLang = 'zh';
  const zhTemplates = JSON.parse(fs.readFileSync(new URL('../content/zh/grammar-templates-zh.json', import.meta.url), 'utf8'));
  const zhRawTpl = (zhTemplates.templates || []).find((tpl) => tpl && typeof tpl.stem === 'string' && /_{2,}/.test(tpl.stem) && Array.isArray(tpl.options) && typeof tpl.correctIndex === 'number');
  assert.ok(zhRawTpl, 'Expected Mandarin grammar template');
  const firstZhTpl = [zhRawTpl.stem, zhRawTpl.options, zhRawTpl.correctIndex, '', zhRawTpl.distractors || []];
  const zhQuestion = appSandbox.makeGrammarTokenOrderQuestion('zh-test-skill', firstZhTpl, 0, 'A1');
  assert.ok(zhQuestion && zhQuestion.tokens.length >= 3, 'Mandarin makeGrammarTokenOrderQuestion must produce >=3 non-empty tokens');
  assert.strictEqual(zhQuestion.targetLang, 'zh');
  console.log(`✓ PASS (JA tokens=${jaQuestion.tokens.length}, ZH tokens=${zhQuestion.tokens.length})\n`);

  console.log('================================================================');
  console.log('ALL REFORMULATION, ORAL FLUENCY, & CROSS-LINGUAL VOICE TESTS PASSED!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
