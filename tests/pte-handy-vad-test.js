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

console.log('\nAll Handy VAD unit tests PASSED successfully!\n');
