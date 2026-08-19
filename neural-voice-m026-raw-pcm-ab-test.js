'use strict';
// m026-1 / T-026: prove the A/B diagnostic isolates raw vocoder PCM from the
// m025-48 conditioning path without changing normal playback when the diagnostic is off.
const assert = require('assert');
const player = require('./features/neural-voice/fiezel-web-audio-player.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok -', name); }
  catch (error) { failures++; console.error('FAIL -', name, '\n   ', error.message); }
}
async function asyncTest(name, fn) {
  try { await fn(); console.log('ok -', name); }
  catch (error) { failures++; console.error('FAIL -', name, '\n   ', error.message); }
}

function fakeEnv(mode, contextRate) {
  const records = [];
  const buffers = [];
  const ctx = {
    currentTime: 0,
    state: 'running',
    sampleRate: contextRate || 44100,
    destination: { id: 'destination' },
    createBuffer(channels, length, sampleRate) {
      const buffer = {
        channels, length, sampleRate, data: null,
        copyToChannel(data) { this.data = Float32Array.from(data); }
      };
      buffers.push(buffer);
      return buffer;
    },
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect() {},
        start() {},
        stop() {}
      };
    },
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          cancelScheduledValues() {}
        },
        connect() {}
      };
    },
    resume() { return Promise.resolve(); },
    close() { return Promise.resolve(); }
  };
  function FakeAudioContext(options) {
    if (options && options.sampleRate) ctx.sampleRate = contextRate || options.sampleRate;
    return ctx;
  }
  const search = mode ? `?${player.PCM_DIAGNOSTIC_PARAM}=${mode}` : '';
  const env = {
    AudioContext: FakeAudioContext,
    URLSearchParams,
    location: { search },
    FIEZEL_VERSION: '5.19.0',
    FiezelVoiceDiagnostics: {
      record(entry) { records.push(entry); return true; },
      begin() {},
      end() {}
    }
  };
  return { env, ctx, records, buffers };
}

const tone = (values, rate) => ({ data: Float32Array.from(values), sampling_rate: rate || 44100 });
function peak(samples) {
  let value = 0;
  for (const sample of samples || []) value = Math.max(value, Math.abs(Number(sample)));
  return value;
}

(async function () {
  test('diagnostic mode is off by default', () => {
    assert.strictEqual(player.pcmDiagnosticMode({ location: { search: '' }, URLSearchParams }, {}), '');
  });

  test('only raw and conditioned query modes are accepted', () => {
    assert.strictEqual(player.pcmDiagnosticMode({ location: { search: '?fiezelPcmMode=raw' }, URLSearchParams }, {}), 'raw');
    assert.strictEqual(player.pcmDiagnosticMode({ location: { search: '?fiezelPcmMode=conditioned' }, URLSearchParams }, {}), 'conditioned');
    assert.strictEqual(player.pcmDiagnosticMode({ location: { search: '?fiezelPcmMode=unsafe' }, URLSearchParams }, {}), '');
  });

  test('explicit player option wins over the URL', () => {
    const env = { location: { search: '?fiezelPcmMode=raw' }, URLSearchParams };
    assert.strictEqual(player.pcmDiagnosticMode(env, { pcmDiagnosticMode: 'conditioned' }), 'conditioned');
  });

  test('sample telemetry counts clipping and non-finite data without mutating input', () => {
    const input = Float32Array.from([0, 1.2, -1.4, Number.NaN, 0.25]);
    const stats = player.analyzeSamples(input);
    assert.strictEqual(stats.samples, 5);
    assert.strictEqual(stats.finite, 4);
    assert.strictEqual(stats.nonFinite, 1);
    assert.strictEqual(stats.clipped, 2);
    assert.ok(stats.peak >= 1.39 && stats.peak <= 1.41);
    assert.ok(Number.isFinite(stats.rms));
    assert.ok(Number.isFinite(stats.mean));
    assert.ok(Number.isNaN(input[3]), 'analysis must not repair or mutate the source');
  });

  await asyncTest('raw mode copies the post-trim vocoder PCM without conditionSamples', async () => {
    const { env, buffers, records } = fakeEnv('raw', 44100);
    const p = player.createPlayer(env);
    const handle = await p.play(tone([0, 2, -2, 0]));
    assert.strictEqual(handle.diagnosticMode, 'raw');
    assert.strictEqual(buffers.length, 1);
    assert.ok(peak(buffers[0].data) > 1.9, 'raw mode must preserve the over-unity PCM for diagnosis');
    const event = records.find((entry) => entry.phase === 'pcm_ab_playback');
    assert.ok(event, 'raw A/B run must emit one PCM diagnostic record');
    assert.strictEqual(event.diagnosticMode, 'raw');
    assert.ok(event.raw.peak > 1.9);
    assert.ok(event.rendered.peak > 1.9);
  });

  await asyncTest('conditioned mode runs the existing m025-48 repair path', async () => {
    const { env, buffers, records } = fakeEnv('conditioned', 44100);
    const p = player.createPlayer(env);
    const handle = await p.play(tone([0, 2, -2, 0]));
    assert.strictEqual(handle.diagnosticMode, 'conditioned');
    assert.ok(peak(buffers[0].data) <= player.PEAK_CEILING + 1e-6, 'conditioned mode must retain the headroom repair');
    const event = records.find((entry) => entry.phase === 'pcm_ab_playback');
    assert.ok(event && event.raw.peak > 1.9, 'telemetry must preserve raw metrics');
    assert.ok(event.rendered.peak <= player.PEAK_CEILING + 1e-6, 'telemetry must show the conditioned result separately');
  });

  await asyncTest('diagnostic records expose source/context sample-rate mismatch', async () => {
    const { env, records } = fakeEnv('conditioned', 48000);
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.1, -0.1, 0], 44100));
    const event = records.find((entry) => entry.phase === 'pcm_ab_playback');
    assert.strictEqual(event.sourceSampleRate, 44100);
    assert.strictEqual(event.contextSampleRate, 48000);
    assert.strictEqual(event.resamplingExpected, true);
  });

  await asyncTest('normal mode remains conditioned and emits no A/B telemetry', async () => {
    const { env, buffers, records } = fakeEnv('', 44100);
    const p = player.createPlayer(env);
    const handle = await p.play(tone([0, 2, -2, 0]));
    assert.strictEqual(handle.diagnosticMode, '');
    assert.ok(peak(buffers[0].data) <= player.PEAK_CEILING + 1e-6, 'default path must remain m025-48 conditioned playback');
    assert.ok(!records.some((entry) => entry.phase === 'pcm_ab_playback'), 'no diagnostic mode means no extra sample-scan record');
  });

  if (failures) {
    console.error(`\nFIEZEL m026 raw PCM A/B diagnostic: ${failures} FAILED`);
    process.exit(1);
  }
  console.log('\nFIEZEL m026 raw PCM A/B diagnostic: PASS');
})();
