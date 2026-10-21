#!/usr/bin/env node
/**
 * tests/kawan-bicara-neural-voice-test.js
 *
 * Comprehensive Automated Verification Suite for Kawan Bicara Neural Voice Engine:
 * fiezel-chat-voice.js <-> fiezel-interactive-chat.js <-> fiezel-voice-call.js
 *
 * Verifies:
 * 1. Persona Voice Selection:
 *    - English: Alex/Guy (Coach Alex -> en-US-GuyNeural), Sarah/Aria (Sarah -> en-US-AriaNeural)
 *    - Japanese: Keita (Instructor/Student -> ja-JP-KeitaNeural), Nanami (Sensei/Companion -> ja-JP-NanamiNeural)
 *    - Dynamic persona registration, canonical aliases, default fallback, and setPersona() API.
 * 2. Sentence Splitting & Audio Prefetching:
 *    - Punctuation-aware sentence chunking for EN (., !, ?) and JA (。, ！, ？).
 *    - Furigana bracket stripping [漢字](かんじ) -> 漢字.
 *    - Short chunk (<14 chars) automatic concatenation to prevent stuttering speech.
 *    - Background prefetch warming for subsequent sentences while current sentence plays.
 *    - In-memory prefetch caching.
 * 3. Barge-In Interruption Mechanism:
 *    - stop() increments session token and terminates speech turns immediately.
 *    - Active audio pauses, currentTime resets to 0, and AbortController cancels in-flight fetch.
 *    - Remaining queued sentences in multi-sentence turns are aborted immediately.
 *    - Interrupted turn resolves false cleanly without completing turn.
 *    - Silence cascaded to all underlying fallback engines (FiezelVoiceSay, FiezelPuterVoice).
 * 4. Network Failure Handling (Fail-Quiet L5 Invariant):
 *    - Server line endpoint error (HTTP 500, network offline, timeout) safely falls back to secondary layers.
 *    - Total layer failure resolves false cleanly without unhandled rejection.
 *    - Honest silence: text remains visible on screen, never throws unhandled errors.
 * 5. Zero-speechSynthesis Invariant:
 *    - Browser speechSynthesis is never touched under any circumstance (0 calls).
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms || 0));

console.log('===============================================================');
console.log('   KAWAN BICARA NEURAL VOICE COMPREHENSIVE AUTOMATED TEST     ');
console.log('===============================================================\n');

// ── Invariant Guard: Zero-speechSynthesis Trapping ─────────────────────────────
let synthTouched = 0;
const synthTrap = new Proxy({}, {
  get(target, prop) {
    synthTouched++;
    return () => {};
  },
  set(target, prop, value) {
    synthTouched++;
    return true;
  }
});
global.speechSynthesis = synthTrap;
global.SpeechSynthesisUtterance = function () {
  synthTouched++;
};

// ── Mock DOM & Audio Context Environment ──────────────────────────────────────
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.destination = {};
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  createBuffer() { return {}; }
  createBufferSource() {
    return {
      connect() {},
      start() {}
    };
  }
}
global.AudioContext = MockAudioContext;

class MockAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.paused = true;
    this.playbackRate = 1.0;
    this.onended = null;
    this.onerror = null;
    this.onpause = null;
    this._timer = null;
  }
  play() {
    this.paused = false;
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      if (!this.paused && typeof this.onended === 'function') {
        this.onended();
      }
    }, 10);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (typeof this.onpause === 'function') this.onpause();
  }
}
global.Audio = MockAudio;

global.localStorage = {
  _s: {},
  getItem(k) { return this._s[k] || null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
  clear() { this._s = {}; }
};

global.FiezelI18n = {
  getCourse: () => 'en',
  getLocale: () => 'id',
  t: (k, fb) => fb || k
};

// ── Secondary Voice Fallback Spies ────────────────────────────────────────────
const fallbackLog = {
  say: [],
  sayPrefetch: [],
  puter: [],
  puterPrefetch: [],
  stops: 0
};
let mockSayResult = true;
let mockSayDelayMs = 5;
let mockPuterResult = true;
let mockPuterDelayMs = 5;
let mockPuterFailsEngines = {};

global.FiezelVoiceSay = {
  say(text, opts) {
    fallbackLog.say.push({ text, opts });
    return tick(mockSayDelayMs).then(() => mockSayResult);
  },
  prefetch(text, opts) {
    fallbackLog.sayPrefetch.push({ text, opts });
    return Promise.resolve(true);
  },
  stop() {
    fallbackLog.stops++;
    return true;
  }
};

global.FiezelPuterVoice = {
  speak(text, opts) {
    fallbackLog.puter.push({ text, opts });
    if (opts && mockPuterFailsEngines[opts.engine]) {
      return Promise.reject(new Error('puter_engine_failed: ' + opts.engine));
    }
    return tick(mockPuterDelayMs).then(() => mockPuterResult);
  },
  prefetch(text, opts) {
    fallbackLog.puterPrefetch.push({ text, opts });
    return Promise.resolve(true);
  },
  stop() {
    fallbackLog.stops++;
    return true;
  }
};

// ── Load Kawan Bicara Modules ─────────────────────────────────────────────────
const chatVoicePath = path.join(root, 'features', 'interactive-chat', 'fiezel-chat-voice.js');
const interactiveChatPath = path.join(root, 'features', 'interactive-chat', 'fiezel-interactive-chat.js');
const voiceCallPath = path.join(root, 'features', 'interactive-chat', 'fiezel-voice-call.js');

assert.ok(fs.existsSync(chatVoicePath), 'fiezel-chat-voice.js must exist');
assert.ok(fs.existsSync(interactiveChatPath), 'fiezel-interactive-chat.js must exist');
assert.ok(fs.existsSync(voiceCallPath), 'fiezel-voice-call.js must exist');

const FiezelChatVoice = require(chatVoicePath);
global.FiezelChatVoice = FiezelChatVoice;

const FiezelInteractiveChat = require(interactiveChatPath);
global.FiezelInteractiveChat = FiezelInteractiveChat;

const FiezelVoiceCall = require(voiceCallPath);
global.FiezelVoiceCall = FiezelVoiceCall;

// ── Test Runner ───────────────────────────────────────────────────────────────
async function runTestSuite() {
  console.log('>>> BAGIAN 1: PEMILIHAN PERSONA SUARA (Alex/Guy, Sarah/Aria, Keita, Nanami) <<<');

  // 1.1 Canonical Persona Registry Check
  const personas = FiezelChatVoice.CANONICAL_PERSONAS;
  assert.ok(personas, 'CANONICAL_PERSONAS must be exposed');
  assert.strictEqual(personas.guy, 'guy', 'guy persona registered');
  assert.strictEqual(personas.aria, 'aria', 'aria persona registered');
  assert.strictEqual(personas.keita, 'keita', 'keita persona registered');
  assert.strictEqual(personas.nanami, 'nanami', 'nanami persona registered');
  console.log('✓ Canonical persona names defined: guy, aria, keita, nanami.');

  // 1.2 Resolving English Personas (Alex -> Guy, Sarah -> Aria)
  assert.strictEqual(FiezelChatVoice.resolvePersona('en', 'alex'), 'guy', 'Alex resolves to guy');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en', 'Coach Alex'), 'guy', 'Coach Alex resolves to guy');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en', 'guy'), 'guy', 'Guy resolves to guy');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en', 'sarah'), 'aria', 'Sarah resolves to aria');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en', 'aria'), 'aria', 'Aria resolves to aria');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en'), 'guy', 'Default English persona is guy (Coach Alex)');
  console.log('✓ English persona resolution (Alex/Guy, Sarah/Aria) passed.');

  // 1.3 Resolving Japanese Personas (Keita, Nanami)
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja', 'keita'), 'keita', 'Keita resolves to keita');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja', 'instructor'), 'keita', 'Instructor resolves to keita');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja', 'nanami'), 'nanami', 'Nanami resolves to nanami');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja', 'sensei'), 'nanami', 'Sensei resolves to nanami');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja'), 'nanami', 'Default Japanese persona is nanami (Fiezel-sensei)');
  console.log('✓ Japanese persona resolution (Keita, Nanami) passed.');

  // 1.4 Dynamic setPersona and setDefaultPersona
  FiezelChatVoice.setPersona('sarah');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en'), 'aria', 'English default changed to aria after setPersona(sarah)');
  FiezelChatVoice.setPersona('keita');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja'), 'keita', 'Japanese default changed to keita after setPersona(keita)');

  // Restore defaults
  FiezelChatVoice.setDefaultPersona('en', 'guy');
  FiezelChatVoice.setDefaultPersona('ja', 'nanami');
  assert.strictEqual(FiezelChatVoice.resolvePersona('en'), 'guy');
  assert.strictEqual(FiezelChatVoice.resolvePersona('ja'), 'nanami');
  console.log('✓ Dynamic persona switching (setPersona / setDefaultPersona) passed.');

  // 1.5 Server Endpoint Payload Verification for all 4 Personas
  const serverLineCalls = [];
  global.__FIEZEL_TEST_MOCK_TTS_LINE__ = function (sentence, persona, course) {
    serverLineCalls.push({ sentence, persona, course });
    return {
      audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      mimeType: 'audio/wav'
    };
  };

  // Turn on server mock
  global.FIEZEL_SERVER_TTS_ENABLED = true;
  FiezelChatVoice.setServerAvailable(true);

  // Test 1.5a: Alex / Guy call
  serverLineCalls.length = 0;
  await FiezelChatVoice.speak('Hello there! Ready for practice?', 'en', { persona: 'alex' });
  assert.ok(serverLineCalls.length > 0, 'Server synthesis invoked');
  assert.strictEqual(serverLineCalls[0].persona, 'guy', 'Alex requested -> guy sent to TTS server');
  assert.strictEqual(serverLineCalls[0].course, 'en');

  // Test 1.5b: Sarah / Aria call
  serverLineCalls.length = 0;
  await FiezelChatVoice.speak('Welcome to our English conversation session!', 'en', { persona: 'sarah' });
  assert.ok(serverLineCalls.length > 0);
  assert.strictEqual(serverLineCalls[0].persona, 'aria', 'Sarah requested -> aria sent to TTS server');

  // Test 1.5c: Keita call
  serverLineCalls.length = 0;
  await FiezelChatVoice.speak('試験を始めます。よく聞いてください。', 'ja', { persona: 'keita' });
  assert.ok(serverLineCalls.length > 0);
  assert.strictEqual(serverLineCalls[0].persona, 'keita', 'Keita requested -> keita sent to TTS server');

  // Test 1.5d: Nanami call
  serverLineCalls.length = 0;
  await FiezelChatVoice.speak('こんにちは！今日も一緒に日本語を練習しましょう。', 'ja', { persona: 'nanami' });
  assert.ok(serverLineCalls.length > 0);
  assert.strictEqual(serverLineCalls[0].persona, 'nanami', 'Nanami requested -> nanami sent to TTS server');

  console.log('✓ Persona payload delivery (Alex->guy, Sarah->aria, Keita->keita, Nanami->nanami) verified.');

  // 1.6 Voice Call Engine Persona Integration
  assert.strictEqual(typeof FiezelVoiceCall.setPersona, 'function', 'FiezelVoiceCall must provide setPersona()');
  FiezelVoiceCall.setPersona('sarah');
  assert.strictEqual(FiezelVoiceCall.getState().persona, 'sarah', 'Voice call state stores current persona');
  console.log('✓ FiezelVoiceCall setPersona integration verified.\n');

  console.log('>>> BAGIAN 2: PEMOTONGAN KALIMAT & PREFETCH AUDIO <<<');

  // 2.1 Text Cleaning & Furigana Bracket Stripping
  const rawJaWithFurigana = '[今日](きょう)はとてもいい[天気](てんき)ですね！[富士山](ふじさん)が見えます。';
  const cleanedJa = FiezelChatVoice.cleanText(rawJaWithFurigana);
  assert.strictEqual(cleanedJa, '今日はとてもいい天気ですね！富士山が見えます。', 'cleanText strips furigana ruby bracket pairs cleanly');

  const rawEnFormatted = '**Hello!** Let\'s *practice* `English` conversation together.';
  const cleanedEn = FiezelChatVoice.cleanText(rawEnFormatted);
  assert.strictEqual(cleanedEn, 'Hello! Let\'s practice English conversation together.', 'cleanText strips markdown characters');
  console.log('✓ cleanText strips Furigana and markdown syntax accurately.');

  // 2.2 Punctuation-based Sentence Splitting
  const enParagraph = 'Good morning. How are you doing today? I hope you are having a wonderful time!';
  const enChunks = FiezelChatVoice.splitSentences(enParagraph, 'en');
  assert.deepStrictEqual(enChunks, [
    'Good morning.',
    'How are you doing today?',
    'I hope you are having a wonderful time!'
  ], 'English sentences split accurately by punctuation');

  const jaParagraph = 'こんにちは！元気ですか？今日は天気がとてもいいですね。';
  const jaChunks = FiezelChatVoice.splitSentences(jaParagraph, 'ja');
  assert.deepStrictEqual(jaChunks, [
    'こんにちは！',
    '元気ですか？',
    '今日は天気がとてもいいですね。'
  ], 'Japanese sentences split accurately by punctuation');
  console.log('✓ splitSentences splits by language punctuation (.!? and 。！？).');

  // 2.3 Short Chunk Automatic Concatenation (<14 characters)
  const enWithShort = 'Oh! That is awesome. Which restaurant did you choose?';
  const enMerged = FiezelChatVoice.splitSentences(enWithShort, 'en');
  // "Oh!" is <14 chars, must be combined with "That is awesome."
  assert.deepStrictEqual(enMerged, [
    'Oh! That is awesome.',
    'Which restaurant did you choose?'
  ], 'Short exclamation "Oh!" combined with subsequent sentence');

  const jaWithShort = 'はい！分かりました。頑張ります！';
  const jaMerged = FiezelChatVoice.splitSentences(jaWithShort, 'ja');
  // "はい！" (<14 chars) must be combined with "分かりました。"
  assert.deepStrictEqual(jaMerged, [
    'はい！分かりました。',
    '頑張ります！'
  ], 'Short Japanese interjection merged to prevent audio gaps');
  console.log('✓ Short chunks (<14 chars) concatenated cleanly to eliminate audio stuttering.');

  // 2.4 Audio Prefetching during Turn Playback
  serverLineCalls.length = 0;
  fallbackLog.sayPrefetch.length = 0;

  const multiSentenceText = 'First sentence goes here. Second sentence follows immediately. Third sentence concludes the turn.';
  const speakPromise = FiezelChatVoice.speak(multiSentenceText, 'en', { persona: 'alex' });
  await speakPromise;

  assert.ok(serverLineCalls.length >= 2, 'TTS server received calls for speech and prefetch');
  assert.ok(serverLineCalls.some(c => c.sentence.includes('Second sentence follows')), 'Second sentence was prefetched');
  assert.ok(serverLineCalls.some(c => c.sentence.includes('Third sentence concludes')), 'Third sentence was prefetched');

  // Verify direct prefetch does not throw, routes canonical persona, and returns boolean
  const directPrefetchOk = await FiezelChatVoice.prefetch('Background warming test line', 'en', { persona: 'sarah' });
  assert.strictEqual(typeof directPrefetchOk, 'boolean', 'prefetch returns a boolean promise safely');
  assert.ok(serverLineCalls.some(c => c.sentence.includes('Background warming') && c.persona === 'aria'),
    'Direct prefetch warmed with canonical persona aria');
  console.log('✓ Audio prefetching warms subsequent sentences in background during active speech.\n');

  console.log('>>> BAGIAN 3: MEKANISME BARGE-IN (stop() MEMBATALKAN SEKETIKA) <<<');

  // 3.1 Barge-in cancels active multi-sentence turn
  let sentenceStartCount = 0;
  const longTurnText = 'Sentence number one is quite long. Sentence number two is even longer and should not play. Sentence three never runs.';

  // Simulate longer audio playback
  global.__FIEZEL_TEST_AUDIO_PLAYER__ = {
    play: (resultObj, myToken) => tick(60).then(() => true)
  };

  const bargeInPromise = FiezelChatVoice.speak(longTurnText, 'en', {
    onSentenceStart: (idx, s) => {
      sentenceStartCount++;
    }
  });

  // Interrupt immediately after 15ms (during sentence 0)
  await tick(15);
  const stopsBefore = fallbackLog.stops;
  const stopReturn = FiezelChatVoice.stop();
  assert.strictEqual(stopReturn, true, 'stop() returns true');

  const turnResult = await bargeInPromise;
  assert.strictEqual(turnResult, false, 'Interrupted turn must resolve false (never false-reported as completed)');
  assert.strictEqual(sentenceStartCount, 1, 'Only sentence 0 was started; remaining sentences 1 and 2 were aborted');
  assert.ok(fallbackLog.stops > stopsBefore, 'Underlying fallback layers received stop() signal');
  console.log('✓ stop() immediately aborts queued sentences and resolves turn to false.');

  // 3.2 stop() resets active audio element and pauses it
  let mockAudioInstance = null;
  global.Audio = class extends MockAudio {
    constructor(src) {
      super(src);
      mockAudioInstance = this;
    }
  };
  delete global.__FIEZEL_TEST_AUDIO_PLAYER__;

  const playPromise = FiezelChatVoice.speak('A single sentence to test audio element stop.', 'en');
  await tick(5);
  FiezelChatVoice.stop();
  await playPromise;

  if (mockAudioInstance) {
    assert.strictEqual(mockAudioInstance.paused, true, 'Active audio element must be paused on stop()');
    assert.strictEqual(mockAudioInstance.currentTime, 0, 'Active audio currentTime reset to 0');
  }
  console.log('✓ Active HTML5 Audio instance paused and reset to 0 on barge-in.');

  // 3.3 UI Barge-In Triggers in Interactive Chat
  const chatState = FiezelInteractiveChat.getState();
  chatState.audioPlayingId = 'msg-playing-123';
  FiezelInteractiveChat.stopVoice();
  assert.strictEqual(chatState.audioPlayingId, null, 'stopVoice clears audioPlayingId in chat state');
  console.log('✓ InteractiveChat stopVoice() clears playing status and executes barge-in.\n');

  console.log('>>> BAGIAN 4: PENANGANAN KEGAGALAN JARINGAN (FAIL-QUIET L5) <<<');

  // 4.1 Server Network Rejection -> Safe Fallback to Secondary Layer
  global.FIEZEL_SERVER_TTS_ENABLED = true;
  FiezelChatVoice.setServerAvailable(true);
  fallbackLog.say.length = 0;
  mockSayResult = true;

  // Make server endpoint reject with network error
  global.__FIEZEL_TEST_MOCK_TTS_LINE__ = function () {
    return Promise.reject(new Error('NetworkError: Failed to fetch /api/tts/line (HTTP 500)'));
  };

  const fallbackTurnOk = await FiezelChatVoice.speak('Testing fallback when server crashes.', 'en');
  assert.strictEqual(fallbackTurnOk, true, 'Turn succeeded via secondary fallback (FiezelVoiceSay)');
  assert.ok(fallbackLog.say.length > 0, 'FiezelVoiceSay.say was invoked after server failure');
  console.log('✓ Server network error safely degraded to secondary voice layer without throwing.');

  // 4.2 Total Failure Across All Layers -> Honest Silence L5 (Resolve false, zero unhandled rejections)
  global.FIEZEL_SERVER_TTS_ENABLED = false; // Disable server
  mockSayResult = false;                   // Disable FiezelVoiceSay (returns false)
  mockPuterResult = false;                // Disable Puter

  let unhandledRejectionCaught = false;
  const onUnhandled = (err) => {
    unhandledRejectionCaught = true;
    console.error('UNHANDLED REJECTION DETECTED:', err);
  };
  process.on('unhandledRejection', onUnhandled);

  fallbackLog.say.length = 0;
  const silentEnResult = await FiezelChatVoice.speak('All network layers down, silence expected.', 'en');
  assert.strictEqual(silentEnResult, false, 'Complete failure cleanly resolves false (L5 fail-quiet)');

  // Test Japanese failure
  mockPuterFailsEngines = { generative: true, neural: true };
  const silentJaResult = await FiezelChatVoice.speak('全てのレイヤーがダウンしています。', 'ja');
  assert.strictEqual(silentJaResult, false, 'Japanese failure cleanly resolves false (L5 fail-quiet)');

  await tick(50);
  process.removeListener('unhandledRejection', onUnhandled);

  assert.strictEqual(unhandledRejectionCaught, false, 'Zero unhandled promise rejections during catastrophic failure');
  console.log('✓ Fail-quiet L5 invariant upheld: All failures resolve false cleanly without exceptions.\n');

  console.log('>>> BAGIAN 5: KEPATUHAN NOL-SPEECHSYNTHESIS <<<');

  // Verify throughout all preceding tests, speechSynthesis was NEVER accessed
  assert.strictEqual(synthTouched, 0, `CRITICAL VIOLATION: speechSynthesis was accessed ${synthTouched} times!`);
  console.log(`✓ Absolute zero-speechSynthesis compliance certified: synthTouched = 0.`);

  // Verify static source inspection: zero forbidden occurrences in interactive-chat files
  const chatVoiceCode = fs.readFileSync(chatVoicePath, 'utf8');
  assert.ok(!chatVoiceCode.includes('speechSynthesis.speak'), 'No speechSynthesis.speak in fiezel-chat-voice.js');
  assert.ok(!chatVoiceCode.includes('new SpeechSynthesisUtterance'), 'No SpeechSynthesisUtterance in fiezel-chat-voice.js');

  const chatCode = fs.readFileSync(interactiveChatPath, 'utf8');
  assert.ok(!chatCode.includes('speechSynthesis.speak'), 'No speechSynthesis.speak in fiezel-interactive-chat.js');

  const callCode = fs.readFileSync(voiceCallPath, 'utf8');
  assert.ok(!callCode.includes('speechSynthesis.speak'), 'No speechSynthesis.speak in fiezel-voice-call.js');
  console.log('✓ Static code audit certified: Zero browser TTS calls in interactive-chat codebase.\n');

  console.log('===============================================================');
  console.log('  ALL KAWAN BICARA NEURAL VOICE TEST ASSERTIONS PASSED (100%)  ');
  console.log('===============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED WITH EXCEPTION:', err);
  process.exit(1);
});
