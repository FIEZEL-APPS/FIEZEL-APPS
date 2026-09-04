'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function testVoiceSayOwnershipAndStop() {
  const voicePath = path.resolve(__dirname, 'features/neural-voice/fiezel-voice-say.js');
  delete require.cache[voicePath];

  const original = {};
  const keys = [
    'FiezelAudioResolver', 'FiezelPuterVoice', 'FiezelSubtitleTranslate', 'FiezelSubtitle',
    'FiezelVoiceRuntime', 'FiezelCfTtsTransport', 'FiezelBrowserSpeak', 'speechSynthesis',
    'SpeechSynthesisUtterance', 'document', 'CustomEvent'
  ];
  keys.forEach((key) => { original[key] = global[key]; });

  const translations = new Map();
  const speaks = [];
  const events = [];
  const begun = [];
  let localStops = 0;

  global.CustomEvent = class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init && init.detail; }
  };
  global.document = {
    dispatchEvent(ev) { events.push(ev.detail); return true; }
  };
  global.FiezelSubtitle = {
    create() {
      return {
        begin(line) { begun.push(line); },
        update() {},
        end() {}
      };
    }
  };
  global.FiezelSubtitleTranslate = {
    translate(text) {
      const d = deferred();
      translations.set(text, d);
      return d.promise;
    }
  };
  global.FiezelVoiceRuntime = {
    status() { return { prepared: true, ready: true }; },
    speak(text) {
      const d = deferred();
      speaks.push({ text, d });
      return d.promise;
    },
    stop() { localStops += 1; }
  };
  delete global.FiezelAudioResolver;
  delete global.FiezelPuterVoice;
  delete global.FiezelCfTtsTransport;
  delete global.FiezelBrowserSpeak;
  delete global.speechSynthesis;
  delete global.SpeechSynthesisUtterance;

  try {
    const voice = require(voicePath);

    const oldTurn = voice.say('old turn');
    const newTurn = voice.say('new turn');
    assert.strictEqual(speaks.length, 2, 'both local turns should have entered L3');

    translations.get('new turn').resolve('subtitle baru');
    await Promise.resolve();
    translations.get('old turn').resolve('subtitle lama');
    await Promise.resolve();
    assert.deepStrictEqual(begun, ['subtitle baru'], 'stale subtitle must not repaint the newer turn');

    speaks[0].d.resolve(true);
    await oldTurn;
    const staleEnd = events.filter((ev) => ev.phase === 'end' && ev.generation === 1);
    assert.strictEqual(staleEnd.length, 0, 'stale completion must not emit end for an obsolete turn');

    speaks[1].d.resolve(true);
    assert.strictEqual(await newTurn, true);
    const currentEnd = events.filter((ev) => ev.phase === 'end' && ev.generation === 2);
    assert.strictEqual(currentEnd.length, 1, 'current turn must retain normal completion semantics');

    /* m025-232: say() kini MENDAHULUI dirinya sendiri - ia membungkam semua pemutar sebelum
       membuka giliran baru, supaya pemanggil yang lupa stop() (adaptor Skills Lab memanggil
       say() langsung) tidak bisa menumpuk dua suara. Konsekuensinya say() ikut memanggil
       FiezelVoiceRuntime.stop(), jadi menghitung TOTAL panggilan tidak lagi mengukur apa pun.
       Yang diuji tetap sama - stop() bersama meneruskan ke L3 - hanya diukur sebagai DELTA. */
    const stopsBeforeSay = localStops;
    const stoppedTurn = voice.say('stopped turn');
    assert.strictEqual(localStops - stopsBeforeSay, 1,
      'say() must preempt L3 so a forgetful caller cannot stack two voices');
    const stopsBeforeStop = localStops;
    assert.strictEqual(voice.stop(), true);
    assert.strictEqual(localStops - stopsBeforeStop, 1,
      'shared stop() must forward to FiezelVoiceRuntime.stop()');
    translations.get('stopped turn').resolve('subtitle terlambat');
    await Promise.resolve();
    assert.deepStrictEqual(begun, ['subtitle baru'], 'translation settling after stop must stay inert');
    speaks[2].d.resolve(true);
    await stoppedTurn;
    const lateEnd = events.filter((ev) => ev.phase === 'end' && ev.generation === 3);
    assert.strictEqual(lateEnd.length, 0, 'turn settling after stop must not emit a stale end');

    const interrupt = events.find((ev) => ev.phase === 'interrupt');
    assert.ok(interrupt && interrupt.generation === 4, 'stop must invalidate ownership with a newer generation');
  } finally {
    delete require.cache[voicePath];
    keys.forEach((key) => {
      if (original[key] === undefined) delete global[key];
      else global[key] = original[key];
    });
  }
}

function testBridgeRejectsStaleEvents() {
  const bridgePath = path.resolve(__dirname, 'features/neural-voice/fiezel-speech-bridge.js');
  const source = fs.readFileSync(bridgePath, 'utf8');
  let speechHandler = null;
  const reactions = [];

  const doc = {
    body: { classList: { contains() { return false; } } },
    addEventListener(type, fn) { if (type === 'fiezel-speech') speechHandler = fn; },
    getElementById() { return null; },
    querySelectorAll() { return []; }
  };
  const root = {
    document: doc,
    performance: { now() { return 100; } },
    matchMedia() { return { matches: false }; },
    requestAnimationFrame() { return 1; },
    setTimeout() { return 1; },
    clearTimeout() {},
    addEventListener() {},
    pawReact(evt) { reactions.push(evt); return true; },
    FiezelPaw: { setViseme() { return true; } }
  };
  const context = {
    self: root,
    window: root,
    console,
    Math,
    Date,
    Array,
    Number,
    String,
    Object
  };
  vm.runInNewContext(source, context, { filename: bridgePath });
  assert.ok(speechHandler, 'bridge must subscribe to fiezel-speech');

  speechHandler({ detail: { phase: 'progress', layer: 1, currentTime: 1, generation: 1 } });
  assert.strictEqual(root.FiezelSpeechBridge.speaking(), true);
  speechHandler({ detail: { phase: 'progress', layer: 1, currentTime: 1, generation: 2 } });
  assert.strictEqual(root.FiezelSpeechBridge.speaking(), true);

  speechHandler({ detail: { phase: 'end', layer: 0, generation: 1 } });
  assert.strictEqual(root.FiezelSpeechBridge.speaking(), true, 'stale end must not close the newer turn');
  const reactionCount = reactions.length;
  speechHandler({ detail: { phase: 'progress', layer: 1, currentTime: 2, generation: 1 } });
  assert.strictEqual(reactions.length, reactionCount, 'stale progress must be ignored');

  speechHandler({ detail: { phase: 'end', layer: 0, generation: 2 } });
  assert.strictEqual(root.FiezelSpeechBridge.speaking(), false, 'current end must still close the current turn');
}

(async function main() {
  await testVoiceSayOwnershipAndStop();
  testBridgeRejectsStaleEvents();
  console.log('voice-turn-ownership-regression: PASS (NV-08/NV-09)');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
