'use strict';
// m025-37 prosody regression: words must stop running together, without swinging into
// a chopped, over-punctuated delivery instead.
const assert = require('assert');
const fs = require('fs');

const P = require('./features/neural-voice/fiezel-prosody.js');
const adapterSrc = fs.readFileSync('features/neural-voice/fiezel-sherpa-vits-adapter.js', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

(async () => {
  test('pause timings sit in the natural speech range', () => {
    assert.ok(P.PAUSE_MS.clause >= 120 && P.PAUSE_MS.clause <= 280, 'clause pause is a beat, not a gap');
    assert.ok(P.PAUSE_MS.sentence >= 350 && P.PAUSE_MS.sentence <= 700, 'sentence pause is a breath');
    assert.ok(P.PAUSE_MS.sentence > P.PAUSE_MS.clause, 'a sentence end must outlast a clause break');
  });

  test('a clause boundary gains the punctuation the model needs', () => {
    const out = P.punctuate('A word family is one root in different forms but knowing the family helps');
    assert.ok(/forms, but/.test(out), 'comma inserted before the contrast marker');
  });

  test('restrictive clauses are left alone', () => {
    // These were the over-punctuation cases: forcing a pause here sounds chopped.
    const out = P.punctuate('You can use it when the time is not important so the result matters');
    assert.ok(!/it, when/.test(out), 'no comma before a restrictive when-clause');
    assert.ok(!/important, so/.test(out), 'no comma before a bare so-clause');
  });

  test('short phrases are never chopped', () => {
    assert.strictEqual(P.punctuate('I have gone but'), 'I have gone but.',
      'too few preceding words to justify a break');
  });

  test('existing punctuation is respected and the pass is idempotent', () => {
    const already = 'A word family is one root, but knowing it helps.';
    assert.strictEqual(P.punctuate(already), already, 'no double punctuation');
    const once = P.punctuate('Decide is the verb decision is the noun although decisive is the adjective');
    assert.strictEqual(P.punctuate(once), once, 're-running must not keep adding commas');
    assert.ok(!/,,|, ,/.test(once), 'no doubled commas');
  });

  test('a terminal mark is always present for the final fall in intonation', () => {
    assert.ok(/[.!?…]$/.test(P.punctuate('Halo Jahran ini suara neural')), 'sentence mark added');
    assert.strictEqual(P.punctuate('Sudah selesai!'), 'Sudah selesai!', 'existing mark preserved');
  });

  test('words are never altered, only separated', () => {
    const input = 'Decide is the verb decision is the noun although decisive is the adjective';
    const words = s => s.replace(/[.,;:!?…]/g, '').split(/\s+/).filter(Boolean);
    assert.deepStrictEqual(words(P.punctuate(input)), words(input), 'no word added, dropped or changed');
  });

  test('splitting happens at phrase boundaries, never mid-phrase', () => {
    const long = 'This is the first sentence of the lesson. This is the second sentence which is here to make the text longer.';
    const parts = P.phrases(long, 80);
    assert.ok(parts.length >= 2, 'split into speakable units');
    parts.forEach(part => {
      assert.ok(/[.,;:!?…]$/.test(part), `unit must end on punctuation so it gets a pause: "${part}"`);
    });
  });

  test('empty and whitespace input degrade quietly', () => {
    assert.strictEqual(P.punctuate(''), '');
    assert.strictEqual(P.punctuate(null), '');
    assert.deepStrictEqual(P.phrases('   ', 80), []);
  });

  test('silence padding adds exactly the requested duration', () => {
    const samples = new Float32Array([0.5, -0.5, 0.5]);
    const padded = P.padSilence(samples, 1000, 200);
    assert.strictEqual(padded.length, samples.length + 200, '200ms at 1000Hz is 200 samples');
    assert.strictEqual(padded[0], 0.5, 'original audio preserved at the head');
    assert.strictEqual(padded[padded.length - 1], 0, 'tail is silence');
    assert.strictEqual(P.padSilence(samples, 1000, 0).length, samples.length, 'zero pause changes nothing');
    assert.strictEqual(P.padSilence(null, 1000, 200), null, 'no audio, nothing to pad');
  });

  test('sentence ends get the longer pause, clause ends the shorter', () => {
    assert.strictEqual(P.pauseAfter('This is done.'), P.PAUSE_MS.sentence);
    assert.strictEqual(P.pauseAfter('one root,'), P.PAUSE_MS.clause);
  });

  test('the adapter punctuates before synthesis and pads after it', () => {
    assert.ok(/prosody\.punctuate\(text\)/.test(adapterSrc), 'text is shaped before it reaches the worker');
    assert.ok(/prosody\.padSilence\(samples/.test(adapterSrc), 'audio is padded after generation');
    // Shaping must happen before postMessage, or the model never sees the punctuation.
    const shapeAt = adapterSrc.indexOf('prosody.punctuate(text)');
    const sendAt = adapterSrc.indexOf("worker.postMessage({ type: 'generate'");
    assert.ok(shapeAt > -1 && sendAt > -1 && shapeAt < sendAt, 'punctuation must precede dispatch');
    // Prosody is optional so the engine still runs if the module is absent.
    assert.ok(/opts\.prosody \|\|/.test(adapterSrc), 'prosody is injectable and optional');
  });

  console.log(`FIEZEL prosody: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
