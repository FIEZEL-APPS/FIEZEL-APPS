#!/usr/bin/env node
/**
 * tests/chat-voice-neural-endpoint-test.js
 * Verification for Neural Voice Server (/api/tts/line) integration in FiezelChatVoice:
 * 1. Server Priority: When /api/tts/line is available, it takes priority over Puter / VoiceSay for both EN & JA.
 * 2. Multi-Persona: Supports persona options ({ persona: 'guy' | 'aria' | 'keita' | 'nanami' }).
 * 3. Latency & Prefetching: Sentence chunking with prefetching of subsequent sentences into prefetchCache.
 * 4. Barge-In Interruption: stop() silences audio and stops remaining sentences immediately.
 * 5. Graceful Fallback: When /api/tts/line fails or is unavailable, falls back to FiezelVoiceSay/Puter.
 * 6. Zero-Browser-TTS: speechSynthesis is never touched even when all neural sources fail (fail-quiet L5).
 */
'use strict';
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

// Strict guard: speechSynthesis MUST NOT be touched
let synthTouched = 0;
global.speechSynthesis = new Proxy({}, { get() { synthTouched++; return () => {}; } });
global.SpeechSynthesisUtterance = function () { synthTouched++; };

// Mocks for fallback layers
const fallbackLog = { say: [], puter: [], stops: 0 };
let fallbackSayOk = true;
let fallbackPuterOk = true;

global.FiezelVoiceSay = {
  say(text, opts) {
    fallbackLog.say.push({ text, opts });
    return tick(5).then(() => fallbackSayOk);
  },
  prefetch(text) { return Promise.resolve(true); },
  stop() { fallbackLog.stops++; return true; }
};

global.FiezelPuterVoice = {
  speak(text, opts) {
    fallbackLog.puter.push({ text, opts });
    return tick(5).then(() => fallbackPuterOk);
  },
  prefetch(text, opts) { return Promise.resolve(true); },
  stop() { fallbackLog.stops++; return true; }
};

// Track mock audio player invocations
const playedAudioClips = [];
global.__FIEZEL_TEST_AUDIO_PLAYER__ = {
  play(resultObj, token) {
    playedAudioClips.push(resultObj);
    return tick(10).then(() => true);
  }
};

const voice = require(path.join(root, 'features', 'interactive-chat', 'fiezel-chat-voice.js'));

(async () => {
  console.log('=== TEST SUITE: Neural Voice Server (/api/tts/line) in FiezelChatVoice ===\n');

  console.log('--- 1. Persona Resolution and Canonical Names ---');
  assert.strictEqual(voice.resolvePersona('en', 'guy'), 'guy');
  assert.strictEqual(voice.resolvePersona('en', 'aria'), 'aria');
  assert.strictEqual(voice.resolvePersona('en', 'male_student'), 'guy');
  assert.strictEqual(voice.resolvePersona('en', 'female_student'), 'aria');
  assert.strictEqual(voice.resolvePersona('en'), 'guy', 'Default EN persona is guy');

  assert.strictEqual(voice.resolvePersona('ja', 'keita'), 'keita');
  assert.strictEqual(voice.resolvePersona('ja', 'nanami'), 'nanami');
  assert.strictEqual(voice.resolvePersona('ja', 'instructor'), 'keita');
  assert.strictEqual(voice.resolvePersona('ja', 'sensei'), 'nanami');
  assert.strictEqual(voice.resolvePersona('ja'), 'nanami', 'Default JA persona is nanami');
  console.log('✓ Persona resolution correctly maps canonical personas and default voices.');

  console.log('--- 2. Priority Routing to /api/tts/line for English & Japanese ---');
  const serverCalls = [];
  global.__FIEZEL_TEST_MOCK_TTS_LINE__ = function (sentence, persona, course) {
    serverCalls.push({ sentence, persona, course });
    return {
      audioBase64: 'bW9ja19tcDM=',
      mimeType: 'audio/mpeg',
      voiceName: persona,
      engine: 'edge-neural-24khz'
    };
  };

  voice.setServerAvailable(true);

  // Test English with persona 'aria'
  const okEn = await voice.speak('Welcome to FIEZEL. Let us practice English conversation today!', 'en', {
    persona: 'aria'
  });
  assert.strictEqual(okEn, true, 'EN speech must resolve true');
  assert.strictEqual(serverCalls.length, 2, 'Two sentences should be sent to server');
  assert.strictEqual(serverCalls[0].persona, 'aria', 'Sentence 1 must use requested persona aria');
  assert.strictEqual(serverCalls[1].persona, 'aria', 'Sentence 2 must use requested persona aria');
  assert.strictEqual(fallbackLog.say.length, 0, 'FiezelVoiceSay should NOT be called when server succeeds');
  console.log('✓ English route prioritized /api/tts/line with persona aria.');

  // Test Japanese with persona 'keita'
  serverCalls.length = 0;
  const okJa = await voice.speak('こんにちは！今日の調子はどうですか？楽しく話しましょう。', 'ja', {
    persona: 'keita'
  });
  assert.strictEqual(okJa, true, 'JA speech must resolve true');
  assert.strictEqual(serverCalls.length, 3, 'Three sentences should be sent to server');
  assert.strictEqual(serverCalls[0].persona, 'keita', 'Persona keita must be sent to server');
  assert.strictEqual(serverCalls[1].persona, 'keita');
  assert.strictEqual(serverCalls[2].persona, 'keita');
  assert.strictEqual(fallbackLog.puter.length, 0, 'FiezelPuterVoice should NOT be called when server succeeds');
  console.log('✓ Japanese route prioritized /api/tts/line with persona keita.');

  console.log('--- 3. Prefetching of subsequent sentence chunks ---');
  serverCalls.length = 0;
  // Prefetch sentence 2 explicitly
  await voice.prefetch('I will see you at the station tomorrow afternoon.', 'en', { persona: 'guy' });
  assert.ok(serverCalls.length >= 1, 'Prefetch should trigger background request to server');
  assert.strictEqual(serverCalls[0].persona, 'guy');
  console.log('✓ Subsequent sentence prefetch warms up cache in the background.');

  console.log('--- 4. Barge-In (stop()) interrupts playback immediately ---');
  let playbackDelay = 50;
  global.__FIEZEL_TEST_AUDIO_PLAYER__.play = function () {
    return tick(playbackDelay).then(() => true);
  };

  const longTurn = voice.speak('First sentence is speaking. Second sentence should never play. Third sentence is cancelled.', 'en');
  await tick(15); // Interrupt during first sentence
  voice.stop();
  const interruptedResult = await longTurn;
  assert.strictEqual(interruptedResult, false, 'Interrupted turn must resolve false');
  console.log('✓ Barge-in stop() interrupted playback immediately.');

  console.log('--- 5. Graceful Fallback when /api/tts/line fails or is unavailable ---');
  global.__FIEZEL_TEST_MOCK_TTS_LINE__ = function () {
    // Simulate server 503 / network drop
    return null;
  };
  voice.setServerAvailable(false);
  fallbackLog.say = [];
  fallbackLog.puter = [];

  // English fallback -> FiezelVoiceSay
  const fallbackEnResult = await voice.speak('Hello! We are testing fallback to VoiceSay now.', 'en');
  assert.strictEqual(fallbackEnResult, true, 'Fallback should succeed via FiezelVoiceSay');
  assert.ok(fallbackLog.say.length > 0, 'FiezelVoiceSay was called when server was unavailable');
  console.log('✓ English gracefully fell back to FiezelVoiceSay.');

  // Japanese fallback -> FiezelPuterVoice
  const fallbackJaResult = await voice.speak('はい、フォールバックのテストです。', 'ja');
  assert.strictEqual(fallbackJaResult, true, 'Fallback should succeed via FiezelPuterVoice');
  assert.ok(fallbackLog.puter.length > 0, 'FiezelPuterVoice was called when server was unavailable');
  console.log('✓ Japanese gracefully fell back to FiezelPuterVoice.');

  console.log('--- 6. Fail-quiet L5 when all layers fail (Zero-Browser-TTS) ---');
  fallbackSayOk = false;
  fallbackPuterOk = false;
  const silentResult = await voice.speak('All voice layers are offline.', 'en');
  assert.strictEqual(silentResult, false, 'Fail-quiet L5 must resolve false without error');
  assert.strictEqual(synthTouched, 0, 'Browser speechSynthesis must NEVER be called (0 touches)');
  console.log('✓ Fail-quiet L5 preserved with zero browser TTS touches.');

  console.log('\n========================================================================');
  console.log('ALL NEURAL VOICE SERVER INTEGRATION TESTS PASSED (6/6)!');
  console.log('========================================================================\n');
})().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
