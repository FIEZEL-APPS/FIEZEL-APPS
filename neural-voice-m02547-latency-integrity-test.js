'use strict';
// m025-47: reproduce the OWNER-observed 10-15s Library gap instead of merely checking
// source ordering. The real public runtime wraps the core service in async readiness
// layers, so speak(N) can yield before it reaches the engine while prefetch(N+1) starts
// in the same JS turn. These tests pin the temporal invariant, PCM integrity, and the
// Library work needed to keep navigation/narration responsive.
const assert = require('assert');
const fs = require('fs');
const Voice = require('./features/neural-voice/fiezel-neural-voice.js');
const Player = require('./features/neural-voice/fiezel-web-audio-player.js');

let pass = 0;
async function test(name, fn) {
  await fn();
  pass++;
  console.log('PASS', name);
}

function fakeService(generateMs = 4) {
  const calls = [];
  let inFlight = 0;
  let maxConcurrent = 0;
  const adapter = {
    kind: 'm02547-fake',
    generate(text, options) {
      calls.push({ text, options: Object.assign({}, options), at: Date.now() });
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      return new Promise(resolve => setTimeout(() => {
        inFlight--;
        resolve({ audio: new Float32Array(128).fill(0.2), sampling_rate: 44100 });
      }, generateMs));
    }
  };
  const service = Voice.createVoiceService({
    config: {
      voices: { fiezelPrimary: 'test_voice' },
      limits: { maxInputChars: 2000, targetChunkWords: 140, hardChunkWords: 190 },
      fallback: { browserSpeechSynthesis: false }
    },
    adapter,
    env: { localStorage: { getItem: () => null, setItem: () => {} } },
    playAudio: () => ({ done: Promise.resolve(), stop() {} })
  });
  return { service, calls, maxConcurrent: () => maxConcurrent };
}

function wrapperYield(service, text, options) {
  // Mirrors the readiness/audibility wrappers: an already-ready service is still reached
  // after at least one promise continuation in the public runtime.
  return Promise.resolve().then(() => service.speak(text, options));
}

function fakeAudioEnv() {
  const events = [];
  const ctx = {
    currentTime: 10,
    state: 'running',
    destination: { id: 'destination' },
    createBuffer(channels, length, sampleRate) {
      return { length, sampleRate, copyToChannel(data) { this.data = data; } };
    },
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect(node) { events.push({ type: 'connect', to: node && node.id }); },
        start() { events.push({ type: 'start' }); },
        stop() { events.push({ type: 'stop' }); }
      };
    },
    createGain() {
      return {
        id: 'gain',
        gain: {
          value: 1,
          cancelScheduledValues(at) { events.push({ type: 'cancel', at }); },
          setValueAtTime(value, at) { events.push({ type: 'set', value, at }); },
          linearRampToValueAtTime(value, at) { events.push({ type: 'ramp', value, at }); }
        },
        connect(node) { events.push({ type: 'gain-connect', to: node && node.id }); }
      };
    },
    resume() { return Promise.resolve(); }
  };
  function AudioContext() { return ctx; }
  return { env: { AudioContext }, events };
}

(async () => {
  await test('prefetch cannot overtake speak through an async wrapper', async () => {
    const probe = fakeService(8);
    const opts = { voice: 'test_voice', lang: 'en-US', allowFallback: false };
    const speaking = wrapperYield(probe.service, 'Current sentence.', opts);
    const warming = probe.service.prefetch('Next sentence.', opts);
    await Promise.all([speaking, warming]);
    assert.deepStrictEqual(probe.calls.map(x => x.text), ['Current sentence.', 'Next sentence.'],
      'the line the learner requested must reserve the single-flight engine before speculative work');
    assert.strictEqual(probe.maxConcurrent(), 1, 'the worker remains single-flight');
  });

  await test('a ready warm entry survives the next-line prefetch and is consumed once', async () => {
    const probe = fakeService(5);
    const opts = { voice: 'test_voice', lang: 'en-US', allowFallback: false };
    assert.strictEqual(await probe.service.prefetch('Sentence two.', opts), true);
    assert.deepStrictEqual(probe.calls.map(x => x.text), ['Sentence two.']);

    const speaking = wrapperYield(probe.service, 'Sentence two.', opts);
    const warming = probe.service.prefetch('Sentence three.', opts);
    await Promise.all([speaking, warming]);
    assert.deepStrictEqual(probe.calls.map(x => x.text), ['Sentence two.', 'Sentence three.'],
      'sentence two must use its warm PCM instead of regenerating while sentence three warms');
  });

  await test('stop cancels a deferred speculative generation before it reaches the worker', async () => {
    const probe = fakeService(5);
    const opts = { voice: 'test_voice', lang: 'en-US', allowFallback: false };
    const warming = probe.service.prefetch('Cancelled sentence.', opts);
    probe.service.stop();
    assert.strictEqual(await warming, false);
    assert.strictEqual(probe.calls.length, 0, 'cancelled warm work must consume zero inference time');
  });

  await test('warm identity includes intent so persona audio cannot cross semantic requests', async () => {
    const probe = fakeService(4);
    const base = { voice: 'test_voice', lang: 'en-US', allowFallback: false };
    await probe.service.prefetch('Well done.', Object.assign({}, base, { intent: 'praise' }));
    await probe.service.speak('Well done.', Object.assign({}, base, { intent: 'explain' }));
    assert.strictEqual(probe.calls.length, 2, 'different persona intent must regenerate');
    assert.strictEqual(probe.calls[0].options.intent, 'praise');
    assert.strictEqual(probe.calls[1].options.intent, 'explain');
  });

  await test('Supertonic stays one continuous render unless an engine explicitly asks for segmentation', () => {
    const src = fs.readFileSync('features/neural-voice/fiezel-sherpa-vits-adapter.js', 'utf8');
    assert.match(src, /var segmentPhrases = Object\.prototype\.hasOwnProperty\.call\(opts, 'segmentPhrases'\)/);
    assert.match(src, /!\(generationLang && padBetweenPhrases === false && usePitchContour === false\)/,
      'native-prosody Supertonic capability combination must default to continuous synthesis');
    assert.match(src, /var units = segmentPhrases && prosody && prosody\.phrases/,
      'phrase splitting is opt-in at the engine capability boundary');
    assert.match(src, /0\.006/, 'fallback concatenation uses a short seam crossfade');
    assert.match(src, /smoothBoundary/, 'raw no-padding joins are not allowed');
  });

  await test('PCM guard sanitizes non-finite samples as well as clipping', () => {
    const bad = Float32Array.from([0, NaN, Infinity, -Infinity, 0.25, 2]);
    const out = Player.guardClipping(bad);
    assert.notStrictEqual(out, bad, 'damaged PCM must be copied before conditioning');
    for (const value of out) assert.ok(Number.isFinite(value), 'every sample reaching WebAudio must be finite');
    assert.strictEqual(out[1], 0);
    assert.strictEqual(out[2], 0);
    assert.strictEqual(out[3], 0);
    assert.ok(Math.max(...Array.from(out, Math.abs)) <= 1, 'conditioned PCM stays inside unity');
  });

  await test('normal buffer completion has its own end fade, not only explicit stop', async () => {
    const { env, events } = fakeAudioEnv();
    const player = Player.createPlayer(env);
    const samples = new Float32Array(4410).fill(0.3); // 100ms at 44.1kHz
    await player.play({ audio: samples, sampling_rate: 44100 });
    const endRamp = events.filter(e => e.type === 'ramp' && e.value === 0).pop();
    assert.ok(endRamp, 'a natural end ramp must be scheduled');
    assert.ok(endRamp.at > 10.09 && endRamp.at <= 10.101,
      `end fade must finish at the buffer boundary, got ${endRamp.at}`);
    assert.ok(!events.some(e => e.type === 'stop'), 'normal playback must not be cut with source.stop()');
  });

  await test('Library preloads its small pack and narration highlighting is constant-work', () => {
    const src = fs.readFileSync('features/library/fiezel-library-ui.js', 'utf8');
    assert.match(src, /var packPromise = null;/, 'concurrent Library opens share one load');
    assert.match(src, /requestIdleCallback\(run, \{ timeout: 1800 \}\)/, 'the authored pack warms while launcher is idle');
    assert.match(src, /function warmNext\(token\)[\s\S]*?setTimeout\(function \(\)/,
      'next-sentence warming is deferred past public runtime wrappers');
    const start = src.indexOf('function highlight(index, scroll)');
    const end = src.indexOf('\n  function updatePlayButton', start);
    const highlight = src.slice(start, end);
    assert.ok(!/querySelectorAll/.test(highlight), 'one narration tick must not scan the entire book');
    assert.match(highlight, /\[data-sentence="' \+ wanted \+ '\"\]/, 'the target line is addressed directly');
    assert.match(highlight, /behavior: 'auto'/, 'sentence changes do not stack smooth-scroll animations');
  });

  console.log(`FIEZEL m025-47 latency + audio integrity: PASS ${pass}/${pass}`);
})().catch(error => {
  console.error('FAIL m025-47 latency + audio integrity');
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
