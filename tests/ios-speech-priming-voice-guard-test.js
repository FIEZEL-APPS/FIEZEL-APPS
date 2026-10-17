/**
 * tests/ios-speech-priming-voice-guard-test.js
 *
 * Verifies:
 * 1. Japanese voice selection guard: When isJa is true, selectVoice never falls back
 *    to an English or Indonesian voice (which causes silent failure on WebKit).
 * 2. Japanese voice priority: Highest scoring Japanese voice (Google / Kyoko / Nanami) is selected when present.
 * 3. English voice priority: Highest scoring English voice is selected for English courses.
 * 4. Silent priming: unlockAudioContext / unlockAudio primes SpeechSynthesis on gesture without duplicate queuing.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');

// Setup mock DOM & Web Speech environment
global.window = global;
global.document = {
  getElementById: function () { return null; },
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  createElement: function () {
    return {
      classList: { add: function () {}, remove: function () {}, contains: function () { return false; } },
      setAttribute: function () {},
      getAttribute: function () { return null; },
      appendChild: function () {},
      addEventListener: function () {}
    };
  },
  body: {
    classList: { contains: function () { return false; }, add: function () {}, remove: function () {} },
    appendChild: function () {},
    contains: function () { return false; }
  }
};

var spokenUtterances = [];
var synthState = { paused: false, speaking: false, pending: false };

global.SpeechSynthesisUtterance = function (text) {
  this.text = text;
  this.lang = '';
  this.voice = null;
  this.volume = 1;
  this.rate = 1;
  this.pitch = 1;
};

global.speechSynthesis = {
  paused: false,
  speaking: false,
  pending: false,
  resume: function () { synthState.paused = false; },
  pause: function () { synthState.paused = true; },
  cancel: function () { synthState.speaking = false; synthState.pending = false; },
  speak: function (u) {
    spokenUtterances.push(u);
    synthState.speaking = true;
  },
  getVoices: function () { return mockVoices; }
};

var mockVoices = [];

// Load the modules
var chatCode = fs.readFileSync(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-interactive-chat.js'), 'utf8');
var voiceCallCode = fs.readFileSync(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-call.js'), 'utf8');

eval(chatCode);
eval(voiceCallCode);

console.log('=== TEST SUITE: iOS Speech Priming & Voice Guard ===\n');

// TEST 1: Japanese Voice Guard in speakViaSynth
console.log('--- TEST 1: Japanese Voice Guard in speakViaSynth ---');
mockVoices = [
  { name: 'Damayanti', lang: 'id-ID', default: true },
  { name: 'Samantha', lang: 'en-US', default: false }
];

var voiceCallInstance = global.FiezelVoiceCall.createEngine();
spokenUtterances = [];
voiceCallInstance.speakViaSynth('こんにちは', true, function () {});
assert.strictEqual(spokenUtterances.length, 1, 'Utterance should be queued');
assert.strictEqual(spokenUtterances[0].voice, null, 'utter.voice must remain null (unset) when device only has non-Japanese voices');
console.log('✓ Test 1 Passed: utter.voice remained null to avoid silent WebKit abort on non-Japanese voice.');

// TEST 2: SelectVoice selects Japanese voice when present
console.log('\n--- TEST 2: Japanese Voice Selection Priority ---');
mockVoices = [
  { name: 'Damayanti', lang: 'id-ID', default: true },
  { name: 'Samantha', lang: 'en-US', default: false },
  { name: 'Kyoko', lang: 'ja-JP', default: false },
  { name: 'Otoya', lang: 'ja-JP', default: false }
];

var jaSelected = voiceCallInstance.selectVoice(global.speechSynthesis, true);
assert.notStrictEqual(jaSelected, null, 'Must find Japanese voice');
assert.strictEqual(jaSelected.name, 'Kyoko', 'Must prioritize Kyoko voice on iOS/macOS');
console.log('✓ Test 2 Passed: Correctly prioritized Japanese voice: ' + jaSelected.name);

// TEST 3: SelectVoice selects English voice for English course
console.log('\n--- TEST 3: English Voice Selection ---');
var enSelected = voiceCallInstance.selectVoice(global.speechSynthesis, false);
assert.notStrictEqual(enSelected, null, 'Must find English voice');
assert.strictEqual(enSelected.name, 'Samantha', 'Must prioritize Samantha voice for English');
console.log('✓ Test 3 Passed: Correctly prioritized English voice: ' + enSelected.name);

// TEST 4: Speech Synthesis Silent Priming on User Interaction
console.log('\n--- TEST 4: Speech Synthesis Silent Priming on Gesture ---');
spokenUtterances = [];
voiceCallInstance.unlockAudio();
assert.strictEqual(spokenUtterances.length, 1, 'unlockAudio must prime speechSynthesis with exactly 1 utterance');
assert.strictEqual(spokenUtterances[0].text, ' ', 'Priming utterance must be silent whitespace');
assert.strictEqual(spokenUtterances[0].volume, 0.01, 'Priming utterance must have minimal volume');

// Verify latch: subsequent unlockAudio calls do not duplicate prime
voiceCallInstance.unlockAudio();
voiceCallInstance.unlockAudio();
assert.strictEqual(spokenUtterances.length, 1, 'Subsequent unlockAudio calls must not spam the speech queue');
console.log('✓ Test 4 Passed: Speech priming successfully queued exactly once on user gesture.');

// TEST 5: English Voice Guard in speakViaSynth
console.log('\n--- TEST 5: English Voice Guard in speakViaSynth ---');
mockVoices = [
  { name: 'Damayanti', lang: 'id-ID', default: true },
  { name: 'Kyoko', lang: 'ja-JP', default: false }
];
spokenUtterances = [];
voiceCallInstance.speakViaSynth('Hello, how are you?', false, function () {});
assert.strictEqual(spokenUtterances.length, 1, 'Utterance should be queued');
assert.strictEqual(spokenUtterances[0].voice, null, 'utter.voice must remain null (unset) when device only has non-English voices');
console.log('✓ Test 5 Passed: utter.voice remained null to avoid silent WebKit abort on non-English voice.');

// TEST 6: English Voice Assignment in speakViaSynth when English voice present
console.log('\n--- TEST 6: English Voice Assignment in speakViaSynth ---');
mockVoices = [
  { name: 'Damayanti', lang: 'id-ID', default: true },
  { name: 'Samantha', lang: 'en-US', default: false },
  { name: 'Kyoko', lang: 'ja-JP', default: false }
];
spokenUtterances = [];
voiceCallInstance.speakViaSynth('Hello, how are you?', false, function () {});
assert.strictEqual(spokenUtterances.length, 1, 'Utterance should be queued');
assert.notStrictEqual(spokenUtterances[0].voice, null, 'utter.voice should be assigned an English voice');
assert.strictEqual(spokenUtterances[0].voice.name, 'Samantha', 'utter.voice must be Samantha');
console.log('✓ Test 6 Passed: utter.voice correctly assigned Samantha for English utterance.');

console.log('\n======================================================');
console.log('ALL iOS SPEECH PRIMING & VOICE GUARD TESTS PASSED (6/6)!');
console.log('======================================================\n');

process.exit(0);
