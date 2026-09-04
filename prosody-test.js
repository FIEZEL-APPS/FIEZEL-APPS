'use strict';
// m025-37 prosody regression: words must stop running together, without swinging into
// a chopped, over-punctuated delivery instead.
const assert = require('assert');
const fs = require('fs');

const P = require('./features/neural-voice/fiezel-prosody.js');

// A stand-in for the sherpa worker: it records what the adapter asked it to speak and
// answers with one second of audio, so prosody can be asserted on behaviour rather than
// on the shape of the source file.
// m025-100: mesin lokal dan adapternya dihapus, jadi tiruan pekerjanya ikut pergi.
// Yang tersisa di berkas ini menguji FiezelProsody itu sendiri - modul yang tetap
// hidup karena subtitle memakainya untuk memecah kalimat dan menghitung jeda.


let pass = 0;
const test = async (name, fn) => { await fn(); pass++; console.log('PASS', name); };

(async () => {
  await test('pause timings sit in the natural speech range', () => {
    assert.ok(P.PAUSE_MS.clause >= 120 && P.PAUSE_MS.clause <= 280, 'clause pause is a beat, not a gap');
    assert.ok(P.PAUSE_MS.sentence >= 350 && P.PAUSE_MS.sentence <= 700, 'sentence pause is a breath');
    assert.ok(P.PAUSE_MS.sentence > P.PAUSE_MS.clause, 'a sentence end must outlast a clause break');
  });

  await test('a clause boundary gains the punctuation the model needs', () => {
    const out = P.punctuate('A word family is one root in different forms but knowing the family helps');
    assert.ok(/forms, but/.test(out), 'comma inserted before the contrast marker');
  });

  await test('restrictive clauses are left alone', () => {
    // These were the over-punctuation cases: forcing a pause here sounds chopped.
    const out = P.punctuate('You can use it when the time is not important so the result matters');
    assert.ok(!/it, when/.test(out), 'no comma before a restrictive when-clause');
    assert.ok(!/important, so/.test(out), 'no comma before a bare so-clause');
  });

  await test('short phrases are never chopped', () => {
    assert.strictEqual(P.punctuate('I have gone but'), 'I have gone but.',
      'too few preceding words to justify a break');
  });

  await test('existing punctuation is respected and the pass is idempotent', () => {
    const already = 'A word family is one root, but knowing it helps.';
    assert.strictEqual(P.punctuate(already), already, 'no double punctuation');
    const once = P.punctuate('Decide is the verb decision is the noun although decisive is the adjective');
    assert.strictEqual(P.punctuate(once), once, 're-running must not keep adding commas');
    assert.ok(!/,,|, ,/.test(once), 'no doubled commas');
  });

  await test('a terminal mark is always present for the final fall in intonation', () => {
    assert.ok(/[.!?…]$/.test(P.punctuate('Halo Jahran ini suara neural')), 'sentence mark added');
    assert.strictEqual(P.punctuate('Sudah selesai!'), 'Sudah selesai!', 'existing mark preserved');
  });

  await test('words are never altered, only separated', () => {
    const input = 'Decide is the verb decision is the noun although decisive is the adjective';
    const words = s => s.replace(/[.,;:!?…]/g, '').split(/\s+/).filter(Boolean);
    assert.deepStrictEqual(words(P.punctuate(input)), words(input), 'no word added, dropped or changed');
  });

  await test('splitting happens at phrase boundaries, never mid-phrase', () => {
    const long = 'This is the first sentence of the lesson. This is the second sentence which is here to make the text longer.';
    const parts = P.phrases(long, 80);
    assert.ok(parts.length >= 2, 'split into speakable units');
    parts.forEach(part => {
      assert.ok(/[.,;:!?…]$/.test(part), `unit must end on punctuation so it gets a pause: "${part}"`);
    });
  });

  await test('empty and whitespace input degrade quietly', () => {
    assert.strictEqual(P.punctuate(''), '');
    assert.strictEqual(P.punctuate(null), '');
    assert.deepStrictEqual(P.phrases('   ', 80), []);
  });

  await test('silence padding adds exactly the requested duration', () => {
    const samples = new Float32Array([0.5, -0.5, 0.5]);
    const padded = P.padSilence(samples, 1000, 200);
    assert.strictEqual(padded.length, samples.length + 200, '200ms at 1000Hz is 200 samples');
    assert.strictEqual(padded[0], 0.5, 'original audio preserved at the head');
    assert.strictEqual(padded[padded.length - 1], 0, 'tail is silence');
    assert.strictEqual(P.padSilence(samples, 1000, 0).length, samples.length, 'zero pause changes nothing');
    assert.strictEqual(P.padSilence(null, 1000, 200), null, 'no audio, nothing to pad');
  });

  await test('sentence ends get the longer pause, clause ends the shorter', () => {
    assert.strictEqual(P.pauseAfter('This is done.'), P.PAUSE_MS.sentence);
    assert.strictEqual(P.pauseAfter('one root,'), P.PAUSE_MS.clause);
  });


  // ---- m025-41: Indonesian rhythm and intonation, asserted through the adapter ------

  await test('an Indonesian line gets Indonesian clause punctuation, not English', () => {
    const line = 'Kita memakai pola ini karena hasilnya masih terasa sekarang';
    assert.ok(/ini, karena/.test(P.punctuate(line, 'id-ID')), 'id profile breaks before karena');
    assert.strictEqual(P.punctuate(line, 'en-US'), line + '.', 'en profile leaves the same line alone');
    assert.ok(/^Namun, /.test(P.punctuate('Namun bentuk ketiga tetap dipakai', 'id-ID')),
      'an Indonesian discourse marker pauses after itself');
    // The restrictive bar is the same as English: no comma where speech runs straight on.
    assert.ok(!/, kalau|, yang|, saat/.test(P.punctuate('Pakai bentuk ini kalau hasilnya yang penting saat ini', 'id-ID')),
      'restrictive Indonesian clauses are left alone');
  });

  await test('intonation moves across an utterance instead of staying level', () => {
    const units = ['Mari kita lihat polanya,', 'lalu kita coba contohnya,', 'dan sekarang selesai.'];
    const shapes = units.map((u, i) => P.contour(u, i, units.length));
    assert.ok(shapes.every(s => s.pitch >= P.CONTOUR_MIN && s.pitch <= P.CONTOUR_MAX), 'contour stays inside its bounds');
    assert.ok(new Set(shapes.map(s => s.pitch)).size > 1, 'pitch must not be identical across the utterance');
    const last = shapes[shapes.length - 1];
    assert.ok(last.pitch < 1 && last.speed < 1, 'the closing phrase falls and slows');
    assert.ok(P.contour('Apa maksudnya?', 0, 2).pitch > 1, 'a question rises');
    assert.ok(P.contour('lalu bentuk ketiga,', 0, 3).pitch > 1, 'a continuing phrase stays up');
  });

  await test('resampling shifts a phrase without changing its content', () => {
    const samples = new Float32Array(1000).fill(0.5);
    const higher = P.resample(samples, 1.05);
    const lower = P.resample(samples, 0.95);
    assert.ok(higher.length < samples.length, 'a higher register is a shorter phrase');
    assert.ok(lower.length > samples.length, 'a lower register is a longer phrase');
    assert.ok(higher.every(v => Math.abs(v - 0.5) < 1e-6), 'interpolation must not distort the signal');
    assert.strictEqual(P.resample(samples, 1), samples, 'no shift is a no-op');
    assert.strictEqual(P.resample(null, 1.05), null, 'no audio, nothing to shift');
  });



  console.log(`FIEZEL prosody: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
