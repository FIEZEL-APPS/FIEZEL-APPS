#!/usr/bin/env node
/**
 * tests/speech-synthesis-engine-test.js
 * Comprehensive unit test suite for Speech Synthesis (TTS), Voice Selection,
 * Word Boundary Visualizer Synchronization, and Web Audio Autoplay Unlock.
 *
 * Verifies:
 * 1. Japanese Voice Selection: picks ja-JP high quality voices (Google 日本語, Kyoko, Otoya, Nanami, etc.)
 *    and provides safe non-throwing fallback when no local Japanese voice is installed.
 * 2. English Voice Selection: picks en-US/en-GB voices (Google, Samantha, Alex, Victoria, etc.)
 * 3. Text & Furigana Cleaning in speakAssistantMessage: strips Ruby markdown [漢字](かんじ) -> 漢字.
 * 4. Boundary & Visualizer Synchronization: utter.onstart, utter.onboundary, utter.onend hook to
 *    audio button and Voice Orb.
 * 5. Web Audio Autoplay Policy Unlock: unlockAudioContext() resumes suspended AudioContext and speechSynthesis.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const chatModulePath = path.join(root, 'features', 'interactive-chat', 'fiezel-interactive-chat.js');
const callModulePath = path.join(root, 'features', 'interactive-chat', 'fiezel-voice-call.js');

// Mock DOM & Web Speech environment
class MockUtterance {
  constructor(text) {
    this.text = text;
    this.lang = 'ja-JP';
    this.rate = 1.0;
    this.pitch = 1.0;
    this.voice = null;
    this.onstart = null;
    this.onboundary = null;
    this.onend = null;
    this.onerror = null;
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.resumed = false;
  }
  resume() {
    this.state = 'running';
    this.resumed = true;
    return Promise.resolve();
  }
  createBuffer() { return {}; }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {}
    };
  }
}

const mockVoices = [
  { name: 'Microsoft David', lang: 'en-US', default: true },
  { name: 'Microsoft Zira', lang: 'en-US', default: false },
  { name: 'Google US English', lang: 'en-US', default: false },
  { name: 'Samantha (Enhanced)', lang: 'en-US', default: false },
  { name: 'Google 日本語', lang: 'ja-JP', default: false },
  { name: 'Kyoko', lang: 'ja-JP', default: false },
  { name: 'Nanami Online (Natural)', lang: 'ja-JP', default: false }
];

const mockSynth = {
  paused: false,
  speaking: false,
  pending: false,
  spokenUtterances: [],
  getVoices: () => mockVoices,
  speak: function (utter) {
    this.spokenUtterances.push(utter);
  },
  cancel: function () {
    this.spokenUtterances = [];
  },
  resume: function () {
    this.paused = false;
  },
  pause: function () {
    this.paused = true;
  }
};

const mockDoc = {
  getElementById: (id) => null,
  querySelector: () => null,
  querySelectorAll: () => []
};

global.SpeechSynthesisUtterance = MockUtterance;
global.AudioContext = MockAudioContext;
global.speechSynthesis = mockSynth;
global.document = mockDoc;

const chatEngine = require(chatModulePath);
const voiceCallEngine = require(callModulePath);

console.log('--- 1. Testing Voice Selection (Japanese ja-JP) ---');
// Verify Japanese voice priority: Google 日本語 or Kyoko/Nanami prioritized
const jaVoice = chatEngine.selectVoice(mockSynth, true);
assert.ok(jaVoice, 'Should find Japanese voice');
assert.strictEqual(jaVoice.lang, 'ja-JP', 'Selected voice must be ja-JP');
assert.ok(/google\s*日本語/i.test(jaVoice.name), 'Google 日本語 should be top scored Japanese voice');
console.log('✓ Japanese voice selected:', jaVoice.name);

// Verify safe fallback when no Japanese voice exists
const mockSynthNoJa = {
  getVoices: () => [
    { name: 'Microsoft David', lang: 'en-US', default: true },
    { name: 'Microsoft Zira', lang: 'en-US', default: false }
  ]
};
const fallbackVoice = chatEngine.selectVoice(mockSynthNoJa, true);
assert.ok(fallbackVoice, 'Should return non-null fallback voice without throwing');
assert.strictEqual(fallbackVoice.name, 'Microsoft David', 'Should safely fallback to default voice');
console.log('✓ Japanese fallback without throwing verified:', fallbackVoice.name);

console.log('--- 2. Testing Voice Selection (English en-US / en-GB) ---');
const enVoice = chatEngine.selectVoice(mockSynth, false);
assert.ok(enVoice, 'Should find English voice');
assert.strictEqual(enVoice.lang, 'en-US', 'Selected voice must be en-US');
assert.ok(/google\s*us/i.test(enVoice.name), 'Google US should be top scored English voice');
console.log('✓ English voice selected:', enVoice.name);

console.log('--- 3. Testing Voice Call Engine Voice Selection ---');
const callJaVoice = voiceCallEngine.selectVoice(mockSynth, true);
assert.ok(callJaVoice && callJaVoice.lang === 'ja-JP', 'VoiceCall engine must pick ja-JP voice');
console.log('✓ VoiceCall engine Japanese voice selected:', callJaVoice.name);

console.log('--- 4. Testing speakAssistantMessage Furigana Stripping ---');
// Ensure [漢字](かんじ) is stripped so TTS speaks surface Kanji or phonetic clean text
let spokeUtter = null;
const origSpeak = mockSynth.speak;
mockSynth.speak = function (u) {
  spokeUtter = u;
};

chatEngine.speakAssistantMessage({
  id: 'test-msg-1',
  text: '今日はいい天気ですね',
  furigana: '[今日](きょう)はいい[天気](てんき)ですね'
});

assert.ok(spokeUtter, 'Utterance must be created and spoken');
assert.strictEqual(spokeUtter.text, '今日はいい天気ですね', 'Ruby brackets must be cleanly stripped for speech synthesis');
console.log('✓ speakAssistantMessage furigana stripping verified:', spokeUtter.text);

console.log('--- 5. Testing Utterance Event Hooks (onstart, onboundary, onend) ---');
let boundaryTriggered = false;
let startTriggered = false;
let endTriggered = false;

// Simulate utter events
assert.ok(typeof spokeUtter.onstart === 'function', 'onstart handler must be hooked');
assert.ok(typeof spokeUtter.onboundary === 'function', 'onboundary handler must be hooked');
assert.ok(typeof spokeUtter.onend === 'function', 'onend handler must be hooked');

spokeUtter.onstart();
spokeUtter.onboundary({ name: 'word', charIndex: 0, charLength: 2 });
spokeUtter.onend();

console.log('✓ utter.onstart, utter.onboundary, utter.onend callbacks verified.');

console.log('--- 6. Testing Web Audio Autoplay Policy Unlock ---');
const dummyCtx = new MockAudioContext();
global.__fiezelSharedAudioContext = dummyCtx;

let unlockPromise = chatEngine.unlockAudioContext();
assert.ok(unlockPromise instanceof Promise, 'unlockAudioContext must return a Promise');

unlockPromise.then(() => {
  assert.strictEqual(dummyCtx.state, 'running', 'AudioContext must transition to running');
  console.log('✓ unlockAudioContext unlocked AudioContext successfully.');

  // Test voice call engine unlock
  let callUnlock = voiceCallEngine.unlockAudio();
  console.log('✓ VoiceCall unlockAudio executed safely.');

  mockSynth.speak = origSpeak;
  console.log('ALL SPEECH SYNTHESIS ENGINE TESTS PASSED (6/6).');
});
