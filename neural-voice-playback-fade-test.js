'use strict';
// m025-45b: the parts of OWNER's "cracking" report that live below the engine.
// m02545-repair-test.js covers the engine side (pitch contour, denoising steps). This
// covers the playback side, plus the fatal the device diagnostic caught and the daily
// message bank.
const assert = require('assert');
const fs = require('fs');
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

function fakeAudioEnv() {
  const events = [];
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: { __id: 'destination' },
    createBuffer(channels, length, sampleRate) {
      return { length, sampleRate, copyToChannel(data) { this.__data = data; } };
    },
    createBufferSource() {
      return {
        __id: 'source', buffer: null, onended: null,
        connect(node) { events.push({ type: 'connect', from: 'source', to: node && node.__id }); },
        start() { events.push({ type: 'start' }); },
        stop() { events.push({ type: 'stop' }); }
      };
    },
    createGain() {
      return {
        __id: 'gain',
        gain: {
          value: 1,
          setValueAtTime(v) { events.push({ type: 'setValue', value: v }); },
          linearRampToValueAtTime(v, at) { events.push({ type: 'ramp', value: v, at }); },
          cancelScheduledValues() { events.push({ type: 'cancel' }); }
        },
        connect(node) { events.push({ type: 'connect', from: 'gain', to: node && node.__id }); }
      };
    },
    resume() { return Promise.resolve(); }
  };
  function FakeAudioContext() { return ctx; }
  return { env: { AudioContext: FakeAudioContext }, events };
}

const tone = (samples) => ({ data: Float32Array.from(samples), sampling_rate: 44100 });

(async function () {

  // A bare source.stop() mid-waveform is a step discontinuity, and a step
  // discontinuity is a click. The device diagnostic shows a 5.6s chunk stopped at
  // 631ms and another at 2787ms - two audible pops in one session.
  await asyncTest('a superseded line is faded out, not cut mid-waveform', async () => {
    const { env, events } = fakeAudioEnv();
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.4, -0.4, 0.2]));
    events.length = 0;
    await p.play(tone([0, 0.3]));
    assert.ok(events.some(e => e.type === 'ramp' && e.value === 0), 'superseding a playing line must ramp its gain to zero');
    assert.ok(!events.some(e => e.type === 'stop'), 'the stop must wait for the ramp; stopping immediately is the click');
  });

  await asyncTest('the fade is short enough to lose no speech', async () => {
    const { env, events } = fakeAudioEnv();
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.4]));
    events.length = 0;
    await p.play(tone([0, 0.4]));
    const ramp = events.find(e => e.type === 'ramp' && e.value === 0);
    assert.ok(ramp.at > 0 && ramp.at <= 0.05, `fade-out must stay under 50ms, got ${ramp.at * 1000}ms`);
  });

  await asyncTest('playback opens on a fade-in so the onset does not click', async () => {
    const { env, events } = fakeAudioEnv();
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.4]));
    assert.ok(events.some(e => e.type === 'setValue' && e.value === 0), 'gain must start at zero');
    assert.ok(events.some(e => e.type === 'ramp' && e.value === 1), 'gain must ramp up to unity');
  });

  await asyncTest('audio is routed through a gain stage, not straight at the speakers', async () => {
    const { env, events } = fakeAudioEnv();
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.4]));
    assert.ok(events.some(e => e.type === 'connect' && e.from === 'source' && e.to === 'gain'), 'source must reach the gain node');
    assert.ok(events.some(e => e.type === 'connect' && e.from === 'gain' && e.to === 'destination'), 'gain must reach the destination');
  });

  await asyncTest('stop() fades too, so cancelling a lesson does not pop', async () => {
    const { env, events } = fakeAudioEnv();
    const p = player.createPlayer(env);
    await p.play(tone([0, 0.4]));
    events.length = 0;
    p.stop();
    assert.ok(events.some(e => e.type === 'ramp' && e.value === 0), 'stop() must ramp before it stops');
  });

  // Samples past unity clip inside WebAudio, and clipping is heard as crackle.
  test('samples above unity are scaled back instead of clipping', () => {
    const out = player.guardClipping(Float32Array.from([0, 1.8, -2.4, 0.5]));
    let peak = 0;
    for (const v of out) peak = Math.max(peak, Math.abs(v));
    assert.ok(peak <= 1, `guard must bring the peak inside unity, got ${peak}`);
    assert.ok(Math.abs(out[1] / out[2] - 1.8 / -2.4) < 1e-6, 'the guard must scale, never reshape');
  });

  test('audio already inside range is passed through untouched', () => {
    const input = Float32Array.from([0, 0.9, -0.9]);
    assert.strictEqual(player.guardClipping(input), input, 'in-range audio must not be copied or altered');
  });

  // The one fatal in OWNER's diagnostic: ReferenceError: Can't find variable: musicCtx,
  // thrown by the visibility handler every time the app was hidden.
  test('the visibility handler no longer reaches an undeclared music context', () => {
    const app = fs.readFileSync('app.js', 'utf8');
    assert.ok(!/\bmusicCtx\b/.test(app), 'musicCtx was left behind when the soundtrack took ownership of its own context');
  });

  test('the daily message bank is large and free of duplicates', () => {
    const app = fs.readFileSync('app.js', 'utf8');
    const block = app.slice(app.indexOf('const LOGIN_MESSAGES=['));
    const bank = block.slice(0, block.indexOf('\n];'));
    const headlines = bank.match(/headline:'([^']*)'/g) || [];
    assert.ok(headlines.length >= 60, `the bank must stay varied, got ${headlines.length} messages`);
    assert.strictEqual(new Set(headlines).size, headlines.length, 'no two daily messages may be identical');
    // m025-80: Audit UX Bagian 6 melarang nama murid dipaku di kode. Bank pesan kini
    // menyimpan token {name} yang diganti di titik render dari state.userName, jadi
    // assertion dibalik: yang dijaga bukan lagi keberadaan satu nama tertentu, melainkan
    // bahwa banknya MEMANG dipersonalisasi dan tidak ada nama yang tertinggal dipaku.
    assert.ok(bank.includes('{name}'), 'the bank must personalise through the {name} token');
    assert.ok(!/Jahran/.test(bank), 'no learner name may remain hardcoded in the bank');
  });

  if (failures) { console.error(`\nFIEZEL playback fade + message bank: ${failures} FAILED`); process.exit(1); }
  console.log('\nFIEZEL playback fade + message bank: PASS');
})();
