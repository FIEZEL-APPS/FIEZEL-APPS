/**
 * tests/pte-handy-vad-test.js
 *
 * Empirical verification of Handy Human-VAD and Speech Recognition Engine in PTE Hub.
 */
const assert = require('assert');
const path = require('path');

console.log('--- Testing FIEZEL PTE Handy VAD & Speech Recognition ---');

const FiezelPteUi = require('../features/pte/fiezel-pte-ui.js');

// 1. Verify HandyHumanVad export
assert.ok(FiezelPteUi.HandyHumanVad, 'HandyHumanVad must be exported from FiezelPteUi');
const vad = new FiezelPteUi.HandyHumanVad({ threshold: 0.45, prefillFrames: 15, hangoverFrames: 12 });
assert.strictEqual(vad.isInSpeech ? vad.isInSpeech() : false, false, 'Initial VAD state must be not in speech');
console.log('  ✓ HandyHumanVad instantiation and initial state verified');

// 2. Silence / ambient low noise rejection
const silenceFrame = new Float32Array(512); // All zeros
const silenceScore = vad.scoreFrame512(silenceFrame);
assert.strictEqual(silenceScore.isVoice, false, 'Pure silence must not be classified as voice');
assert.strictEqual(silenceScore.score, 0, 'Silence score must be 0');
console.log('  ✓ Pure silence rejection verified');

// 3. Synthetic click / non-vocal transient rejection (crestFactor > 6.8)
const clickFrame = new Float32Array(512);
clickFrame[10] = 0.95; // Sharp transient impulse
const clickScore = vad.scoreFrame512(clickFrame);
assert.strictEqual(clickScore.isVoice, false, 'Sharp transient click must be rejected');
console.log('  ✓ Non-vocal impulse transient rejection verified');

// 4. Synthetic human vocal formant simulation (F0 ~ 150 Hz + F1 ~ 600 Hz)
const vocalFrame = new Float32Array(512);
for (let i = 0; i < 512; i++) {
  const t = i / 16000;
  // Fundamental 150 Hz (human chest voice) + Formant 600 Hz (vowel /a/) + Formant 1200 Hz
  vocalFrame[i] = 0.35 * Math.sin(2 * Math.PI * 150 * t) +
                 0.25 * Math.sin(2 * Math.PI * 600 * t) +
                 0.15 * Math.sin(2 * Math.PI * 1200 * t);
}
const vocalScore = vad.scoreFrame512(vocalFrame);
assert.ok(vocalScore.vocalSnrDb > 5, 'Synthetic human vocal frame must produce high vocal SNR');
assert.ok(vocalScore.pitchCorr > 0.5, 'Synthetic voice must have high pitch autocorrelation');
console.log(`  ✓ Synthetic human voice formant detected (SNR: ${vocalScore.vocalSnrDb.toFixed(1)}dB, PitchCorr: ${vocalScore.pitchCorr.toFixed(2)})`);

// 5. Test continuous multi-frame processing with processSamples
const sample48k = new Float32Array(4800); // 100ms at 48kHz
for (let i = 0; i < sample48k.length; i++) {
  const t = i / 48000;
  sample48k[i] = 0.3 * Math.sin(2 * Math.PI * 160 * t) + 0.2 * Math.sin(2 * Math.PI * 650 * t);
}
const res = vad.processSamples(sample48k, 48000);
assert.ok(res, 'processSamples must return process result');
assert.strictEqual(typeof res.inSpeech, 'boolean');
assert.strictEqual(typeof res.speechStarted, 'boolean');
console.log('  ✓ Hardware 48kHz to 16kHz resampling and processSamples verified');

// 6. Verify PTE UI internal VAD instance
const uiVad = FiezelPteUi.getHandyVad();
assert.ok(uiVad, 'FiezelPteUi.getHandyVad() must return active instance');
console.log('  ✓ FiezelPteUi internal Handy VAD singleton verified');

// 7. Verify PTE Speech Recognition initialization & live transcription handling
function MockSpeechRecognition() {
  this.continuous = false;
  this.interimResults = false;
  this.lang = '';
  this.onresult = null;
  this.start = function () {};
  this.stop = function () {};
}
global.window = global.window || {};
global.window.webkitSpeechRecognition = MockSpeechRecognition;
global.navigator = global.navigator || { userAgent: 'Chrome/120.0' };

FiezelPteUi.initPteSpeechRecognition();
const pteState = FiezelPteUi.getState();
assert.ok(pteState.speechRecognizer, 'speechRecognizer must be instantiated');
pteState.speechRecognizer.onresult({
  results: [
    [{ transcript: 'The development of artificial intelligence' }],
    [{ transcript: ' has significantly transformed modern education.' }]
  ]
});
assert.strictEqual(
  pteState.speechTranscript,
  'The development of artificial intelligence has significantly transformed modern education.',
  'speechTranscript must accurately reflect spoken interim/final tokens'
);
console.log('  ✓ Browser SpeechRecognition initialization and live transcript capture verified');

// 8. Verify 300-3300 Hz band-pass formant filter rejects rumble & hiss across sample rates
assert.ok(typeof FiezelPteUi.analyzePteHumanVoiceBand === 'function', 'analyzePteHumanVoiceBand must be exported');
const rumble16k = new Float32Array(1024);
for (let i = 0; i < rumble16k.length; i++) {
  rumble16k[i] = 0.25 * Math.sin((2 * Math.PI * 75 * i) / 16000);
}
const rumbleAnalysis = FiezelPteUi.analyzePteHumanVoiceBand(rumble16k, 16000);
assert.strictEqual(rumbleAnalysis.isHumanSpeech, false, 'Low-frequency 75Hz traffic rumble must be rejected');

const hiss16k = new Float32Array(1024);
for (let i = 0; i < hiss16k.length; i++) {
  hiss16k[i] = 0.2 * Math.sin((2 * Math.PI * 6200 * i) / 16000);
}
const hissAnalysis = FiezelPteUi.analyzePteHumanVoiceBand(hiss16k, 16000);
assert.strictEqual(hissAnalysis.isHumanSpeech, false, 'High-frequency 6.2kHz hiss must be rejected');

const speech48k = new Float32Array(2048);
for (let i = 0; i < speech48k.length; i++) {
  const t = i / 48000;
  speech48k[i] = 0.12 * Math.sin(2 * Math.PI * 550 * t) +
                 0.09 * Math.sin(2 * Math.PI * 1450 * t) +
                 0.06 * Math.sin(2 * Math.PI * 2400 * t);
}
const speechBandRes = FiezelPteUi.analyzePteHumanVoiceBand(speech48k, 48000);
assert.strictEqual(speechBandRes.isHumanSpeech, true, '48kHz human vocal formants must pass band-pass check');
console.log('  ✓ 300-3300 Hz bandpass formant filter noise/rumble/hiss immunity verified');

// 9. Verify HandyHumanVad preserveNoiseFloor reset
const calVad = new FiezelPteUi.HandyHumanVad({ threshold: 0.45 });
const quietRoomFrame = new Float32Array(512);
for (let i = 0; i < 512; i++) quietRoomFrame[i] = 0.008 * Math.sin((2 * Math.PI * 900 * i) / 16000);
for (let rep = 0; rep < 20; rep++) calVad.scoreFrame512(quietRoomFrame);
const trainedFloor0 = calVad.noiseFloor[0];
calVad.inSpeech = true;
calVad.reset({ preserveNoiseFloor: true });
assert.strictEqual(calVad.inSpeech, false, 'reset({preserveNoiseFloor:true}) must reset speech state');
assert.strictEqual(calVad.noiseFloor[0], trainedFloor0, 'reset({preserveNoiseFloor:true}) must keep calibrated noiseFloor');
console.log('  ✓ HandyHumanVad prep noiseFloor preservation verified');

// 10. Verify incremental Gemini Live transcript delta accumulation
assert.strictEqual(FiezelPteUi.appendIncrementalTranscript('educa', 'tion'), 'education', 'Subword join preserved');
let inc = FiezelPteUi.appendIncrementalTranscript('', 'Global ');
inc = FiezelPteUi.appendIncrementalTranscript(inc, 'warm');
inc = FiezelPteUi.appendIncrementalTranscript(inc, 'ing ');
inc = FiezelPteUi.appendIncrementalTranscript(inc, 'affects us all.');
assert.strictEqual(inc.trim(), 'Global warming affects us all.', 'Mixed subword + spaced delta chain preserved');
assert.strictEqual(
  FiezelPteUi.appendIncrementalTranscript('The quick', 'The quick brown fox'),
  'The quick brown fox',
  'Cumulative prefix update handled without duplication'
);
assert.strictEqual(
  FiezelPteUi.appendIncrementalTranscript('The quick brown fox', 'fox jumps high'),
  'The quick brown fox jumps high',
  'Word boundary overlap deduplicated cleanly'
);
console.log('  ✓ Incremental Gemini Live transcript delta accumulation verified');

// 11. Verify real SpeechRecognition confidence extraction & empirical confidence calculation
pteState.speechConfidences = [];
const rec2 = new MockSpeechRecognition();
pteState.speechRecognizer = rec2;
FiezelPteUi.initPteSpeechRecognition();
const isFinalRes = [{ transcript: 'Academic lectures require focused listening.', confidence: 0.87 }];
isFinalRes.isFinal = true;
pteState.speechRecognizer.onresult({ results: [isFinalRes] });
assert.ok(pteState.speechConfidences.length === 1 && Math.abs(pteState.speechConfidences[0] - 0.87) < 0.001, 'Real SpeechRecognition confidence must be recorded');

assert.strictEqual(FiezelPteUi.computePteEmpiricalConfidence({ isEmpty: true, transcript: '' }), 0);
assert.strictEqual(
  FiezelPteUi.computePteEmpiricalConfidence({ transcript: 'hello', speechConfidences: [0.80, 0.90] }),
  0.85,
  'Empirical confidence averages real SpeechRecognition confidences when present'
);
const fluentConf = FiezelPteUi.computePteEmpiricalConfidence({
  transcript: 'Urban infrastructure investments strengthen sustainable economic development across regions.',
  durationSec: 4.5,
  pausesCount: 0,
  vadMaxScore: 0.9
});
const hesitantConf = FiezelPteUi.computePteEmpiricalConfidence({
  transcript: 'Um uh infrastructure er... yes.',
  durationSec: 8.5,
  pausesCount: 4,
  vadMaxScore: 0.48
});
assert.ok(fluentConf > hesitantConf + 0.15, `Fluent confidence (${fluentConf}) must significantly exceed hesitant (${hesitantConf})`);
console.log(`  ✓ Empirical confidence scoring verified (fluent=${fluentConf}, hesitant=${hesitantConf})`);

console.log('\nAll Handy VAD unit tests PASSED successfully!\n');
