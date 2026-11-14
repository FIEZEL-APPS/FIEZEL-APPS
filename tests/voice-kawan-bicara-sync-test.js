/**
 * tests/voice-kawan-bicara-sync-test.js
 *
 * Verifies complete synchronization across all Kawan Bicara (Mitra Kaiwa)
 * reading guides (furigana, romaji, pinyin, English phonetic guide), live
 * translations, BeginnerAnswerAssistant, History cards, and InCallLearningWorkbenchModal
 * across English (EN), Japanese (JA), and Mandarin (ZH), and across learner locales
 * ID, TH, JA, and ZH.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toPhoneticRomaji } from '../features/voice-studio/src/lib/japanesePhonetics.js';
import { toPhoneticPinyin } from '../features/voice-studio/src/lib/mandarinPhonetics.ts';
import {
  approximateEnglishPhoneticId,
  resolveUnifiedPronunciation,
  getBeginnerReplyCards,
} from '../features/voice-studio/src/lib/liveCallHelper.ts';
import {
  buildContextualFallbackCards,
  detectAiIntent,
  evaluateUtteranceClientSide,
  extractFocalClause,
  synthesizeNaturalReformulation,
} from '../features/voice-studio/src/lib/liveTransport.ts';
import {
  HandyHumanVad,
  encodeFloat32At16kToWavBase64,
  hasDynamicSpeechModulation,
} from '../features/voice-studio/src/lib/handyVad.ts';
import { alignSpokenToTargetPassage } from '../features/voice-studio/src/lib/speechAlignment.ts';
import { diagnosePteCandidateSpeech } from '../features/voice-studio/src/lib/braincore.ts';
import {
  decodePcm16Base64ToFloat32,
  LivePcmStreamScheduler,
} from '../features/voice-studio/src/lib/liveTransport.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('=== FIEZEL KAWAN BICARA SYNC INVARIANT TEST ===');

// ---------------------------------------------------------------------------
// 1. Japanese Phonetics Dictionary & Particle / Guillemet Rules
// ---------------------------------------------------------------------------
test('JA Phonetics: verbs, compound particles, and guillemets stay synchronized', () => {
  assert.equal(toPhoneticRomaji('途切れました'), 'Togiremashita');
  assert.equal(toPhoneticRomaji('迷います'), 'Mayoimasu');
  assert.equal(toPhoneticRomaji('て形と過去形の使い分け'), 'Tekei to kakokei no tsukaiwake');
  assert.equal(toPhoneticRomaji('練習できますか？'), 'Renshuu dekimasuka?');
  assert.equal(toPhoneticRomaji('助詞「は」と「が」'), 'Joshi "wa" to "ga"');
  // Non-particle は words must never turn leading は into wa
  const hanashi = toPhoneticRomaji('はなします').toLowerCase();
  assert.ok(hanashi.startsWith('ha'), `Expected はなします to start with ha, got ${hanashi}`);
});

// ---------------------------------------------------------------------------
// 2. Mandarin Phonetics, Erhua & Multi-Word Spacing
// ---------------------------------------------------------------------------
test('ZH Phonetics: new lexicon entries & exact erhua (never gluing 还容易)', () => {
  assert.equal(toPhoneticPinyin('当场对你'), 'Dāngchǎng duì nǐ');
  assert.equal(toPhoneticPinyin('呃，这个嘛'), 'È, zhè gè ma');
  assert.equal(toPhoneticPinyin('和「了」的用法'), 'Hé "le" de yòngfǎ');
  assert.equal(
    toPhoneticPinyin('我每天练习说汉语，还容易吗？'),
    'Wǒ měi tiān liànxí shuō Hànyǔ, hái róngyì ma?'
  );
  const erhua = toPhoneticPinyin('我想去这儿玩一点儿');
  assert.ok(erhua.includes('zhèr') && erhua.includes('yìdiǎnr'), `Expected erhua in ${erhua}`);
  const erqie = toPhoneticPinyin('而且我觉得很好');
  assert.ok(erqie.startsWith('Érqiě'), `Expected Érqiě in ${erqie}`);
});

// ---------------------------------------------------------------------------
// 3. Unified Pronunciation SSoT Parity Across Copilot Cards
// ---------------------------------------------------------------------------
test('SSoT Cara Baca parity across EN, JA, and ZH beginner copilot cards', () => {
  const enSample = "I'd love to practice speaking conditional clauses at the library!";
  const unifiedEn = resolveUnifiedPronunciation(enSample, 'en');
  assert.equal(unifiedEn, approximateEnglishPhoneticId(enSample));
  assert.notEqual(unifiedEn.toLowerCase(), enSample.toLowerCase());
  assert.ok(unifiedEn.toLowerCase().includes('prek-tis') && unifiedEn.toLowerCase().includes('lai-bre-ri'), `Expected phonetic EN guide, got ${unifiedEn}`);

  for (const lang of ['en', 'ja', 'zh']) {
    const aiLastMessage =
      lang === 'ja'
        ? '今日はカフェで何を飲みたいですか？'
        : lang === 'zh'
          ? '你今天想在哪里学习汉语？'
          : 'What would you like to practice today?';
    const cards = getBeginnerReplyCards('free_talk', lang, undefined, aiLastMessage);
    assert.ok(cards.length >= 3, `Expected 3 cards for ${lang}`);
    for (const card of cards) {
      const expectedPron = resolveUnifiedPronunciation(card.text, lang);
      assert.equal(
        card.pronunciation,
        expectedPron,
        `Card pronunciation mismatch for ${lang} ("${card.text}"): "${card.pronunciation}" vs "${expectedPron}"`
      );
      // Zero CJK leaked inside non-CJK Indonesian hints
      assert.ok(
        !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(card.hintId),
        `Found CJK in hintId for ${lang}: ${card.hintId}`
      );
    }
  }
});

// ---------------------------------------------------------------------------
// 4. Natural Reformulation & Zero-Echo Broken Input in Repeat Mode
// ---------------------------------------------------------------------------
test('Reformulation & Echo Redemption never repeat broken user errors verbatim', () => {
  const jaFix = synthesizeNaturalReformulation('コーヒーに飲みますでした。', 'ja', '');
  assert.ok(
    jaFix.includes('コーヒーを') && jaFix.includes('飲みました'),
    `Expected JA particle+tense fix, got: ${jaFix}`
  );
  assert.ok(!jaFix.includes('飲みますでした'), `Broken tense remained in JA fix: ${jaFix}`);

  const zhFix = synthesizeNaturalReformulation('我学习汉语在家里。', 'zh', '');
  assert.equal(zhFix, '我在家里学习汉语。');

  const jaRepeatCards = buildContextualFallbackCards({
    aiText: 'もう一度言ってみて！',
    lastUserText: 'コーヒーに飲みますでした。',
    targetLang: 'ja',
    cefrLevel: 'B1',
    locale: 'id',
  });
  assert.ok(
    !jaRepeatCards[0].text.includes('飲みますでした'),
    `Echo Redemption repeated broken JA input: ${jaRepeatCards[0].text}`
  );
  assert.ok(
    !jaRepeatCards[0].hintId.includes('Ulangi:'),
    `Raw broken Ulangi prompt remained in hintId: ${jaRepeatCards[0].hintId}`
  );

  const zhRepeatCards = buildContextualFallbackCards({
    aiText: '请再说一遍！',
    lastUserText: '我学习汉语在家里。',
    targetLang: 'zh',
    cefrLevel: 'B1',
    locale: 'id',
  });
  assert.equal(zhRepeatCards[0].text, '我在家里学习汉语。');
  assert.equal(
    zhRepeatCards[0].pronunciation,
    resolveUnifiedPronunciation(zhRepeatCards[0].text, 'zh')
  );
});

// ---------------------------------------------------------------------------
// 5. Structural UI & Popup Synchronization Contracts
// ---------------------------------------------------------------------------
test('Components & App wires unified pronunciation, translations, and CJK workbench safety', () => {
  const workbenchSrc = fs.readFileSync(
    path.join(ROOT, 'features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx'),
    'utf8'
  );
  const assistantSrc = fs.readFileSync(
    path.join(ROOT, 'features/voice-studio/src/components/BeginnerAnswerAssistant.tsx'),
    'utf8'
  );
  const rubySrc = fs.readFileSync(
    path.join(ROOT, 'features/voice-studio/src/components/JapaneseRubyDisplay.tsx'),
    'utf8'
  );
  const appSrc = fs.readFileSync(
    path.join(ROOT, 'features/voice-studio/src/App.tsx'),
    'utf8'
  );
  const workerSrc = fs.readFileSync(
    path.join(ROOT, 'workers/api/voice/route-voice-live.js'),
    'utf8'
  );

  // Workbench: zero hardcoded English default leak into JA/ZH fallback branch & CJK block segmentation
  assert.ok(workbenchSrc.includes('tokenizeSentenceIntoBlocks'), 'Missing CJK block tokenizer in workbench');
  assert.ok(workbenchSrc.includes('resolveUnifiedPronunciation'), 'Workbench missing unified pronunciation');
  assert.ok(workbenchSrc.includes('<JapaneseRubyDisplay'), 'Workbench missing ruby display rendering');
  assert.ok(workbenchSrc.includes('wb-magic-character-canvas'), 'Workbench missing character canvas');
  assert.ok(workbenchSrc.includes('wb-tone-waveform-canvas'), 'Workbench missing tone waveform canvas');

  // BeginnerAnswerAssistant: uses SSoT & locale-aware hint sanitizer
  assert.ok(assistantSrc.includes('resolveUnifiedPronunciation'), 'Assistant must use SSoT pronunciation');
  assert.ok(assistantSrc.includes("locale === 'ja' || locale === 'zh'"), 'Assistant must preserve CJK hints for JA/ZH UI locales');

  // JapaneseRubyDisplay: exposes EN phonetic guide & test id hook
  assert.ok(rubySrc.includes('fz-en-phonetic-text'), 'JapaneseRubyDisplay missing EN phonetic class');
  assert.ok(rubySrc.includes('pronunciationTestId'), 'JapaneseRubyDisplay missing pronunciationTestId');

  // App.tsx: subscribes to live translation updates + renders user subtitle/pronunciation/translation + correction ruby
  assert.ok(appSrc.includes('subscribeLiveTranslationUpdates'), 'App.tsx missing live translation pub/sub');
  assert.ok(appSrc.includes('live-hud-user-pronunciation'), 'App.tsx missing user HUD pronunciation');
  assert.ok(appSrc.includes('history-correction-display'), 'App.tsx missing History correction JapaneseRubyDisplay');
  assert.ok(appSrc.includes('history-correction-pronunciation'), 'App.tsx missing History correction Cara Baca');

  // Worker: locale-aware copilot reply normalization & raw EN echo removal
  assert.ok(
    workerSrc.includes("if (locale !== 'ja')") && workerSrc.includes("if (locale !== 'zh')"),
    'Worker missing JA/ZH locale preservation in copilot hints'
  );
  assert.ok(
    workerSrc.includes('pronunciation.toLowerCase().replace(/[^a-z0-9]/g'),
    'Worker missing raw un-phoneticized EN echo removal'
  );
});

test('Coach Sarah coaching_advice alignment & fixed EN phonetics (no generic filler)', () => {
  const sarahLine =
    "Don't fret, darling. The best approach is to practice with daily sentences and read consistently-you'll pick them up faster than you think.";

  const focal = extractFocalClause(sarahLine, 'en');
  assert.ok(
    focal.adviceActionPhrase && /(?:practice|daily sentences|read consistently)/i.test(focal.adviceActionPhrase),
    `Expected adviceActionPhrase extracted from Sarah tip, got: ${JSON.stringify(focal)}`
  );
  assert.strictEqual(detectAiIntent(sarahLine, 'en'), 'coaching_advice');

  const cards = buildContextualFallbackCards({
    aiText: sarahLine,
    targetLang: 'en',
    locale: 'id',
    personaId: 'coach_sarah',
    cefrLevel: 'B1',
  });
  assert.strictEqual(cards.length, 3, 'Expected 3 copilot cards for Coach Sarah advice');
  cards.forEach((c) => {
    assert.ok(
      !c.text.toLowerCase().includes('makes a lot of sense'),
      `Copilot card must NEVER emit generic filler for coaching advice: ${c.text}`
    );
    assert.strictEqual(
      c.pronunciation,
      resolveUnifiedPronunciation(c.text, 'en'),
      `Copilot card Cara Baca out of sync with SSoT: ${c.text}`
    );
  });
  assert.ok(
    cards.some((c) => /(?:daily|sentence|read|consistent|practice|approach)/i.test(c.text)),
    `At least one card must anchor to Coach Sarah advice topic: ${JSON.stringify(cards)}`
  );

  const pronSarah = resolveUnifiedPronunciation(
    'The best approach is to practice them daily.',
    'en'
  );
  assert.ok(pronSarah.includes('e-prouc'), `Expected 'e-prouc' for approach, got: ${pronSarah}`);
  assert.ok(pronSarah.includes('dem'), `Expected 'dem' for them, got: ${pronSarah}`);
  assert.ok(!pronSarah.includes('aprok'), `Forbidden broken phonetic 'aprok' appeared: ${pronSarah}`);

  const pronMakes = resolveUnifiedPronunciation('That makes sense!', 'en');
  assert.ok(pronMakes.includes('meiks'), `Expected 'meiks' for makes, got: ${pronMakes}`);
  assert.ok(!/\bmakes\b/i.test(pronMakes), `Raw English 'makes' leaked into Cara Baca: ${pronMakes}`);
});

test('HandyHumanVad & barge-in DSP reject vehicles, horns, stationary noise, and knocks while allowing modulated speech', () => {
  const sr = 16000;
  const frameLen = 512;

  const evalSignal = (genSample, numFrames, isAiPlaying) => {
    const vad = new HandyHumanVad({
      threshold: 0.54,
      bargeInThreshold: 0.78,
      prefillFrames: 15,
      hangoverFrames: 11,
      onsetFrames: 3,
      bargeInOnsetFrames: 5,
    });
    let inSpeechFrames = 0;
    const rmsSeries = [];
    for (let f = 0; f < numFrames; f++) {
      const buf = new Float32Array(frameLen);
      let sq = 0;
      for (let i = 0; i < frameLen; i++) {
        const idx = f * frameLen + i;
        const t = idx / sr;
        const val = genSample(t, idx);
        buf[i] = val;
        sq += val * val;
      }
      rmsSeries.push(Math.sqrt(sq / frameLen));
      const res = vad.processSamples(buf, sr, isAiPlaying);
      if (res.inSpeech) inSpeechFrames += 1;
    }
    return { inSpeechFrames, rmsSeries };
  };

  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  // (a) Motorcycle / Diesel engine rumble (strong 45Hz + 88Hz + harmonics + exhaust noise)
  const motoAi = evalSignal(
    (t) =>
      0.16 * Math.sin(2 * Math.PI * 45 * t) +
      0.22 * Math.sin(2 * Math.PI * 88 * t) +
      0.12 * Math.sin(2 * Math.PI * 176 * t) +
      0.04 * nextRand(),
    28,
    true
  );
  assert.strictEqual(motoAi.inSpeechFrames, 0, `Motorcycle rumble triggered AI barge-in: ${motoAi.inSpeechFrames}`);

  const motoListen = evalSignal(
    (t) =>
      0.16 * Math.sin(2 * Math.PI * 45 * t) +
      0.22 * Math.sin(2 * Math.PI * 88 * t) +
      0.12 * Math.sin(2 * Math.PI * 176 * t) +
      0.04 * nextRand(),
    28,
    false
  );
  assert.strictEqual(motoListen.inSpeechFrames, 0, `Motorcycle rumble triggered listening VAD: ${motoListen.inSpeechFrames}`);

  // (b) Steady car horn (440Hz + 554Hz pure narrowband dual-tone)
  const hornAi = evalSignal(
    (t) => 0.18 * Math.sin(2 * Math.PI * 440 * t) + 0.13 * Math.sin(2 * Math.PI * 554 * t),
    28,
    true
  );
  assert.strictEqual(hornAi.inSpeechFrames, 0, `Steady car horn triggered AI barge-in: ${hornAi.inSpeechFrames}`);
  assert.strictEqual(
    hasDynamicSpeechModulation(hornAi.rmsSeries),
    false,
    'Steady horn must fail syllable envelope modulation check'
  );

  // (c) Stationary pink/fan/traffic broadband noise
  let pinkState = 0;
  const fanAi = evalSignal(() => {
    pinkState = pinkState * 0.72 + nextRand() * 0.28;
    return pinkState * 0.14;
  }, 28, true);
  assert.strictEqual(fanAi.inSpeechFrames, 0, `Stationary fan/road noise triggered AI barge-in: ${fanAi.inSpeechFrames}`);
  assert.strictEqual(
    hasDynamicSpeechModulation(fanAi.rmsSeries),
    false,
    'Stationary broadband noise must fail syllable envelope modulation check'
  );

  // (d) Short sharp impulse desk knock / door slam (3 frames loud burst)
  const knockAi = evalSignal(
    (t, idx) =>
      idx >= 512 && idx < 512 * 4
        ? 0.24 * Math.sin(2 * Math.PI * 950 * t) + 0.14 * Math.sin(2 * Math.PI * 2100 * t)
        : 0,
    20,
    true
  );
  assert.strictEqual(knockAi.inSpeechFrames, 0, `Short impulse knock triggered AI barge-in: ${knockAi.inSpeechFrames}`);

  // (e) Real modulated multi-formant human speech (~4Hz syllable cadence + vowel transitions)
  const speechSamples = new Float32Array(sr);
  const modHuman = evalSignal((t, idx) => {
    const env = 0.25 + 0.75 * Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * 3.8 * t), 0.7);
    const f1 = 560 + 180 * Math.sin(2 * Math.PI * 2.1 * t);
    const f2 = 1480 + 360 * Math.cos(2 * Math.PI * 1.7 * t);
    const sample =
      env *
      (0.20 * Math.sin(2 * Math.PI * 165 * t) +
        0.16 * Math.sin(2 * Math.PI * f1 * t) +
        0.10 * Math.sin(2 * Math.PI * f2 * t) +
        0.07 * Math.sin(2 * Math.PI * 2450 * t));
    if (idx < speechSamples.length) speechSamples[idx] = sample;
    return sample;
  }, 30, true);
  assert.ok(modHuman.inSpeechFrames >= 8, `Expected real loud speech to produce >=8 candidate barge frames, got ${modHuman.inSpeechFrames}`);
  assert.strictEqual(
    hasDynamicSpeechModulation(modHuman.rmsSeries),
    true,
    'Modulated human syllables must pass syllable envelope modulation check'
  );

  const wavB64 = encodeFloat32At16kToWavBase64(speechSamples.subarray(0, 8000));
  const wavBuf = Buffer.from(wavB64, 'base64');
  assert.strictEqual(wavBuf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.strictEqual(wavBuf.subarray(8, 12).toString('ascii'), 'WAVE');

  // Contract checks across App.tsx, liveTransport.ts, and Cloudflare worker
  const appPath = path.join(ROOT, 'features/voice-studio/src/App.tsx');
  const transportPath = path.join(ROOT, 'features/voice-studio/src/lib/liveTransport.ts');
  const workerPath = path.join(ROOT, 'workers/api/voice/route-voice-live.js');
  const appSrc = fs.readFileSync(appPath, 'utf8');
  const transportSrc = fs.readFileSync(transportPath, 'utf8');
  const workerSrc = fs.readFileSync(workerPath, 'utf8');

  assert.ok(appSrc.includes('runLanguageVerifiedBargeIn'), 'App.tsx missing language-verified barge-in');
  assert.ok(appSrc.includes('hasDynamicSpeechModulation'), 'App.tsx missing syllable modulation gate');
  assert.ok(appSrc.includes("startOfSpeechSensitivity: 'START_SENSITIVITY_LOW'"), 'App.tsx missing LOW server VAD start sensitivity');
  assert.ok(!appSrc.includes('(v.isHumanSpeech && v.rms >= 0.015)'), 'App.tsx must not bypass HandyHumanVad harmonic checks');
  assert.ok(appSrc.includes('wantsReadAloudPopup'), 'App.tsx missing Read Aloud popup voice intent router');
  assert.ok(appSrc.includes('syncWorkbenchToLiveAi'), 'App.tsx missing live screen-to-AI popup state sync');
  assert.ok(appSrc.includes('[SCREEN STATE SYNC:'), 'App.tsx missing SCREEN STATE SYNC marker');
  assert.ok(transportSrc.includes('/api/voice/verify-speech'), 'liveTransport.ts missing /api/voice/verify-speech verifier');
  assert.ok(workerSrc.includes('routeVoiceVerifySpeech'), 'route-voice-live.js missing routeVoiceVerifySpeech handler');
  assert.ok(
    /isRealtimeAi:\s*false,\s*isOfflineFallback:\s*true/.test(workerSrc),
    'route-voice-live.js must not disguise padded fallback bank replies as isRealtimeAi: true'
  );
});

test('Read Aloud & Pronunciation Alignment strictly reject mispronunciations, omissions, and off-script reading', () => {
  const targetEn = 'The proliferation of renewable technologies has transformed regional power grids.';
  const exactRes = alignSpokenToTargetPassage(targetEn, targetEn, 'en');
  assert.strictEqual(exactRes.passed, true, 'Exact Read Aloud reading should pass');
  assert.ok(exactRes.wordAccuracy >= 0.99, `Expected wordAccuracy 1.0, got ${exactRes.wordAccuracy}`);

  const badOmit = alignSpokenToTargetPassage(targetEn, 'The of technology transformed power', 'en');
  assert.strictEqual(badOmit.passed, false, 'Dropped plural -s and skipped words must strictly fail Read Aloud');
  assert.ok(badOmit.missedWords.length >= 3, 'Should identify missed target words');

  const jaAlign = alignSpokenToTargetPassage('図書館で本を読みました', '図書館でパンを食べました', 'ja');
  assert.strictEqual(jaAlign.passed, false, 'Wrong Japanese words during Read Aloud must fail strictly');

  const scenarioEn = {
    id: 'scen_pte_ra_level2',
    titleId: 'PTE Read Aloud',
    targetLang: 'en',
    competencyId: 'speak_pte_read_aloud',
    sampleUtterances: [],
  };
  const offScriptEval = evaluateUtteranceClientSide({
    text: 'I want to drink hot coffee today.',
    scenario: scenarioEn,
    targetLang: 'en',
    expectedTargetText: targetEn,
    activePopupMode: 'pte_read_aloud',
  });
  assert.strictEqual(offScriptEval.ok, false, 'Off-script fluent speech must NOT pass when Read Aloud target is on screen');
  assert.strictEqual(offScriptEval.misconceptionId, 'READ_ALOUD_PRONUNCIATION_MISMATCH');

  const onScriptEval = evaluateUtteranceClientSide({
    text: targetEn,
    scenario: scenarioEn,
    targetLang: 'en',
    expectedTargetText: targetEn,
    activePopupMode: 'pte_read_aloud',
  });
  assert.strictEqual(onScriptEval.ok, true, 'Accurate Read Aloud reading should pass');
  assert.strictEqual(onScriptEval.readAloudAlignment?.passed, true);

  const pteDiagFail = diagnosePteCandidateSpeech({
    spokenTranscript: 'The rapid technology power grid',
    expectedPassageText: targetEn,
    targetLang: 'en',
    durationSec: 4.5,
  });
  assert.strictEqual(pteDiagFail.scores.passedTarget, false, 'PTE Read Aloud diagnostic must fail mismatched reading');
  assert.ok(
    pteDiagFail.misconceptionsFound.some((m) => m.id === 'pte_read_aloud_pronunciation_mismatch'),
    'PTE Misconception Ledger must log Read Aloud mismatch'
  );
});

// ---------------------------------------------------------------------------
// 8. LivePcmStreamScheduler: Seamless Jitter-Buffered Gemini Live Playback
// ---------------------------------------------------------------------------
test('LivePcmStreamScheduler eliminates turn-start and bursty jitter cutouts with click-free recovery', () => {
  const makePcm16B64 = (samplesCount) => {
    const buf = Buffer.alloc(samplesCount * 2);
    for (let i = 0; i < samplesCount; i++) {
      buf.writeInt16LE(Math.round(Math.sin(i / 12) * 12000), i * 2);
    }
    return buf.toString('base64');
  };

  assert.strictEqual(decodePcm16Base64ToFloat32('').length, 0);
  assert.strictEqual(decodePcm16Base64ToFloat32(Buffer.from([42]).toString('base64')).length, 0);
  assert.strictEqual(decodePcm16Base64ToFloat32(makePcm16B64(1)).length, 1);

  const runSim = (events) => {
    let nowMs = 0;
    let nextTimerId = 1;
    const timers = new Map();
    const scheduled = [];
    const ramps = [];
    const activeSources = [];

    const fakeCtx = {
      sampleRate: 24000,
      state: 'running',
      get currentTime() {
        return nowMs / 1000;
      },
      createBuffer(_ch, len, sr) {
        const data = new Float32Array(len);
        return {
          duration: len / sr,
          getChannelData: () => data,
        };
      },
      createGain() {
        const node = {
          gain: {
            setValueAtTime: (value, startTime) => ramps.push({ type: 'set', value, startTime }),
            linearRampToValueAtTime: (value, endTime) => ramps.push({ type: 'linear', value, endTime }),
          },
          connect: () => {},
          disconnect: () => {},
        };
        return node;
      },
      createBufferSource() {
        const src = {
          buffer: null,
          onended: null,
          connect: () => {},
          start: (when = 0) => {
            src._startAt = when;
            src._endAt = when + (src.buffer?.duration || 0);
          },
          stop: () => {},
          disconnect: () => {},
        };
        return src;
      },
    };

    const scheduler = new LivePcmStreamScheduler({
      setTimer: (fn, ms) => {
        const id = nextTimerId++;
        timers.set(id, { fireAtMs: nowMs + ms, fn });
        return id;
      },
      clearTimer: (id) => {
        timers.delete(id);
      },
    });

    const params = {
      ctx: fakeCtx,
      getDestination: () => ({}),
      activeSources,
      onChunkScheduled: (evt) => scheduled.push(evt),
    };

    const advanceTo = (targetMs) => {
      while (true) {
        let earliestId = null;
        let earliestAt = Infinity;
        for (const [id, t] of timers.entries()) {
          if (t.fireAtMs <= targetMs && t.fireAtMs < earliestAt) {
            earliestAt = t.fireAtMs;
            earliestId = id;
          }
        }
        if (earliestId === null) break;
        const entry = timers.get(earliestId);
        timers.delete(earliestId);
        nowMs = entry.fireAtMs;
        entry.fn();
      }
      nowMs = targetMs;
    };

    for (const ev of events) {
      advanceTo(ev.atMs);
      if (ev.type === 'chunks') {
        scheduler.enqueueChunks(ev.chunks, params);
      } else if (ev.type === 'flush') {
        scheduler.flush(params);
      } else if (ev.type === 'reset') {
        scheduler.reset(fakeCtx, activeSources);
      }
    }
    advanceTo(nowMs + 1000);
    return { scheduled, ramps, activeSources, scheduler };
  };

  // Scenario A (task-4064 trace): 170ms Chunk 1 at 0ms + 400ms Chunk 2 at 190ms -> coalesces into 1 gapless 570ms buffer
  const simA = runSim([
    { atMs: 0, type: 'chunks', chunks: [makePcm16B64(Math.round(0.17 * 24000))] },
    { atMs: 190, type: 'chunks', chunks: [makePcm16B64(Math.round(0.4 * 24000))] },
  ]);
  assert.strictEqual(simA.scheduled.length, 1, '170ms + 400ms bursts within prebuffer must coalesce into 1 contiguous buffer');
  assert.ok(Math.abs(simA.scheduled[0].duration - 0.57) < 0.005, `Expected 0.57s coalesced duration, got ${simA.scheduled[0].duration}`);
  assert.ok(simA.ramps.some((r) => r.type === 'linear' && r.value === 1.0), 'Start edge must apply de-click ramp');

  // Scenario B (task-4051 trace): 120ms Chunk 1 at 0ms, 400ms Chunk 2 at 334ms -> 0ms cutout between Chunk 1 and Chunk 2
  const simB = runSim([
    { atMs: 0, type: 'chunks', chunks: [makePcm16B64(Math.round(0.12 * 24000))] },
    { atMs: 334, type: 'chunks', chunks: [makePcm16B64(Math.round(0.4 * 24000))] },
  ]);
  assert.strictEqual(simB.scheduled.length, 2);
  const gapBMs = Math.round((simB.scheduled[1].startAt - (simB.scheduled[0].startAt + simB.scheduled[0].duration)) * 1000);
  assert.strictEqual(gapBMs, 0, `task-4051 trace must have 0ms cutout gap (got ${gapBMs}ms)`);

  // Scenario C (task-4017 trace): 2-byte (1-sample) blip at 0ms + 200ms Chunk 2 at 379ms + 250ms Chunk 3 at 520ms -> 0ms cutout
  const simC = runSim([
    { atMs: 0, type: 'chunks', chunks: [makePcm16B64(1)] },
    { atMs: 379, type: 'chunks', chunks: [makePcm16B64(Math.round(0.2 * 24000))] },
    { atMs: 520, type: 'chunks', chunks: [makePcm16B64(Math.round(0.25 * 24000))] },
  ]);
  assert.ok(simC.scheduled.length >= 1 && simC.scheduled.length <= 2);
  if (simC.scheduled.length === 2) {
    const gapCMs = Math.round((simC.scheduled[1].startAt - (simC.scheduled[0].startAt + simC.scheduled[0].duration)) * 1000);
    assert.strictEqual(gapCMs, 0, `task-4017 trace must have 0ms cutout gap (got ${gapCMs}ms)`);
  }

  // Scenario D: Severe 1200ms mid-turn network stall triggers cushioned recovery (>=120ms lead + fade-in), flush, and reset
  const simD = runSim([
    { atMs: 0, type: 'chunks', chunks: [makePcm16B64(Math.round(0.3 * 24000))] },
    { atMs: 1200, type: 'chunks', chunks: [makePcm16B64(Math.round(0.08 * 24000))] },
    { atMs: 1260, type: 'flush' },
  ]);
  assert.strictEqual(simD.scheduled.length, 2);
  assert.strictEqual(simD.scheduled[1].wasRecovery, true, 'Post-stall buffer must enter cushioned underrun recovery');
  assert.ok(
    simD.scheduled[1].startAt - 1.26 >= 0.12,
    `Recovery cushion must be >=120ms ahead of currentTime (got ${(simD.scheduled[1].startAt - 1.26).toFixed(3)}s)`
  );
});

test('Strict Read Aloud alignment: th/t minimal pair, morph drop, JA Kanji<->Hiragana, and Worker Screen/Translate sync', () => {
  const thPair = alignSpokenToTargetPassage(
    'Three books are on the table.',
    'Tree books are on the table.',
    'en'
  );
  assert.strictEqual(thPair.passed, false, 'Three vs Tree minimal pair must fail strict Read Aloud');
  assert.strictEqual(thPair.tokens[0]?.status, 'wrong', 'Three vs Tree token must be marked wrong');

  const morphDrop = alignSpokenToTargetPassage(
    'Commercial kitchens maintain strict temperature logs daily.',
    'Commercial kitchen maintain strict temperature logs daily.',
    'en'
  );
  assert.strictEqual(morphDrop.passed, false, 'Dropped plural -s must fail strict Read Aloud even in longer sentences');

  const jaRubyMatch = alignSpokenToTargetPassage(
    '図書館で本を読みました。',
    'としょかんでほんをよみました。',
    'ja'
  );
  assert.strictEqual(jaRubyMatch.passed, true, 'Matching Hiragana reading for Kanji passage must pass');

  const jaWrong = alignSpokenToTargetPassage(
    '図書館で本を読みました。',
    'こうえんでぱんをたべました。',
    'ja'
  );
  assert.strictEqual(jaWrong.passed, false, 'Wrong Japanese words must strictly fail alignment');

  const workerSrc = fs.readFileSync(path.join(ROOT, 'workers/api/voice/route-voice-live.js'), 'utf8');
  assert.ok(workerSrc.includes('popupScreenDirective'), 'Worker must inject active popupScreenDirective');
  assert.ok(workerSrc.includes('activePopupTargetText'), 'Worker copilot/partner routes must read activePopupTargetText');
  assert.ok(
    workerSrc.indexOf('const keys = listGeminiKeys') < workerSrc.indexOf('fallbackGoogleTranslate'),
    'routeVoiceTranslate must prefer Gemini before fallback translators when keys exist'
  );
});

console.log('ALL KAWAN BICARA SYNC INVARIANT TESTS PASSED!');
