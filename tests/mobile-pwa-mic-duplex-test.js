/**
 * tests/mobile-pwa-mic-duplex-test.js
 *
 * Regression & contract test suite for Mobile PWA continuous microphone duplex capture
 * and AEC-compensated barge-in across Kawan Bicara (voice-studio), Host bridge (app.js),
 * UI SFX focus isolation (fiezel-ui-sfx.js, sfx.ts), Silero/Handy VAD, and Mochi Voice SOS.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { HandyHumanVad } from '../features/voice-studio/src/lib/handyVad.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('=== MOBILE PWA CONTINUOUS MIC DUPLEX & AEC BARGE-IN TEST ===');

// ---------------------------------------------------------------------------
// 1. FiezelUiSfx AudioSession Duplex Guard (no downgrade to 'playback' mid-call)
// ---------------------------------------------------------------------------
await runTest('FiezelUiSfx never downgrades navigator.audioSession away from play-and-record during active duplex calls', async () => {
  const sfxSrc = fs.readFileSync(path.join(ROOT, 'features/audio/fiezel-ui-sfx.js'), 'utf8');
  const audioSession = { type: 'auto' };
  const fakeWindow = {
    location: { protocol: 'https:', pathname: '/app/' },
    navigator: { audioSession, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)' },
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener() {},
      querySelectorAll() { return []; },
    },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout,
    AudioContext: function FakeAudioCtx() {
      return {
        state: 'running',
        currentTime: 0,
        destination: {},
        resume: async () => {},
        createBuffer: () => ({ getChannelData: () => new Float32Array(1) }),
        createBufferSource: () => ({ connect() {}, start() {}, buffer: null }),
        createGain: () => ({ gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
        createOscillator: () => ({ frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }),
      };
    },
  };
  fakeWindow.window = fakeWindow;
  fakeWindow.top = fakeWindow;
  fakeWindow.parent = fakeWindow;
  fakeWindow.globalThis = fakeWindow;

  vm.runInNewContext(sfxSrc, fakeWindow, { filename: 'fiezel-ui-sfx.js' });
  assert.equal(typeof fakeWindow.__fzSetAudioSessionMode, 'function', 'Expected __fzSetAudioSessionMode export');
  assert.ok(fakeWindow.FiezelUiSfx, 'Expected FiezelUiSfx global export');

  // Claim default playback before call
  fakeWindow.FiezelUiSfx.prepare?.('tap', fakeWindow);
  fakeWindow.FiezelUiSfx.play?.('tap', fakeWindow);
  assert.equal(audioSession.type, 'playback', 'Expected non-call UI SFX to claim playback session');

  // Enter duplex voice call
  fakeWindow.__fzDuplexAudioActive = true;
  fakeWindow.__fzSetAudioSessionMode('play-and-record', fakeWindow);
  assert.equal(audioSession.type, 'play-and-record', 'Expected active duplex call to claim play-and-record');

  // Play UI SFX mid-call -> MUST preserve play-and-record on iOS/Android WebKit
  fakeWindow.FiezelUiSfx.play?.('tap', fakeWindow);
  fakeWindow.FiezelUiSfx.prepare?.('tap', fakeWindow);
  assert.equal(
    audioSession.type,
    'play-and-record',
    'UI SFX during active duplex call must NEVER downgrade audioSession back to playback'
  );

  // Hang up -> cleanly restores playback
  fakeWindow.__fzDuplexAudioActive = false;
  fakeWindow.__fzSetAudioSessionMode('playback', fakeWindow);
  assert.equal(audioSession.type, 'playback', 'Ending duplex call should restore playback session');
});

// ---------------------------------------------------------------------------
// 2. Voice Studio sfx.ts avoids HTML5 new Audio() focus preemption mid-call
// ---------------------------------------------------------------------------
await runTest('Voice Studio playFiezelSfx avoids HTML5 new Audio focus stealing during active duplex call', async () => {
  let htmlAudioSpawnCount = 0;
  let decodeCalls = 0;
  let oscStartCalls = 0;
  let bufferStartCalls = 0;

  const prevWindow = globalThis.window;
  const prevAudio = globalThis.Audio;
  const prevFetch = globalThis.fetch;

  const mockHostCtx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: async () => {},
    decodeAudioData: async () => {
      decodeCalls += 1;
      return { duration: 0.25 };
    },
    createGain: () => ({
      gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    }),
    createOscillator: () => ({
      type: 'sine',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
      start() {
        oscStartCalls += 1;
      },
      stop() {},
    }),
    createBufferSource: () => ({
      buffer: null,
      connect() {},
      disconnect() {},
      start() {
        bufferStartCalls += 1;
      },
    }),
  };

  try {
    globalThis.Audio = function MockHtmlAudio() {
      htmlAudioSpawnCount += 1;
      return {
        volume: 1,
        currentTime: 0,
        play: () => Promise.resolve(),
      };
    };
    globalThis.fetch = async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    });
    if (!globalThis.window) {
      globalThis.window = globalThis;
    }
    globalThis.window.__fzDuplexAudioActive = true;
    if (!globalThis.window.location) {
      globalThis.window.location = { pathname: '/call.html', protocol: 'https:' };
    }

    const sfxMod = await import(`../features/voice-studio/src/lib/sfx.ts?t=${Date.now()}`);
    sfxMod.registerSfxHostAudioContext(mockHostCtx);
    sfxMod.playFiezelSfx('lesson_start');
    await new Promise((r) => setTimeout(r, 60));
    sfxMod.playFiezelSfx('lesson_start');
    await new Promise((r) => setTimeout(r, 20));

    assert.equal(htmlAudioSpawnCount, 0, 'Active duplex call must NOT spawn HTML5 new Audio() that steals OS mic focus');
    assert.ok(oscStartCalls >= 1, 'First uncached duplex SFX must synthesize via WebAudio');
    assert.ok(decodeCalls >= 1 && bufferStartCalls >= 1, 'Subsequent duplex SFX must play decoded WebAudio buffer without <audio>');
    sfxMod.registerSfxHostAudioContext(null);
    globalThis.window.__fzDuplexAudioActive = false;
  } finally {
    globalThis.window = prevWindow;
    globalThis.Audio = prevAudio;
    globalThis.fetch = prevFetch;
  }
});

// ---------------------------------------------------------------------------
// 3. HandyHumanVad Mobile AEC Calibration: Allows attenuated human speech, rejects noise
// ---------------------------------------------------------------------------
await runTest('HandyHumanVad mobile calibration detects OS-AEC attenuated speech while rejecting noise', async () => {
  const sr = 16000;
  const vad = new HandyHumanVad({
    threshold: 0.48,
    bargeInThreshold: 0.60,
    onsetFrames: 2,
    bargeInOnsetFrames: 5,
  });

  // OS hardware AEC attenuated multi-formant modulated human speech (RMS ~0.011)
  let voicedCount = 0;
  for (let f = 0; f < 30; f++) {
    const buf = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      const t = (f * 512 + i) / sr;
      const env = 0.25 + 0.75 * Math.pow(0.5 - 0.5 * Math.cos(2 * Math.PI * 3.8 * t), 0.7);
      const f1 = 560 + 180 * Math.sin(2 * Math.PI * 2.1 * t);
      const f2 = 1480 + 360 * Math.cos(2 * Math.PI * 1.7 * t);
      buf[i] =
        0.08 *
        env *
        (0.20 * Math.sin(2 * Math.PI * 165 * t) +
          0.16 * Math.sin(2 * Math.PI * f1 * t) +
          0.10 * Math.sin(2 * Math.PI * f2 * t) +
          0.07 * Math.sin(2 * Math.PI * 2450 * t));
    }
    const r = vad.processSamples(buf, sr, true);
    if (r.voicedFrames > 0) voicedCount += 1;
  }
  assert.ok(voicedCount >= 3, `Expected Mobile AEC speech (RMS ~0.011) to score >=3 voiced frames, got ${voicedCount}`);

  // Verify noise immunity remains intact at bargeInThreshold 0.60
  let seed = 4242;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  for (const [label, gen] of [
    ['fan', (t) => 0.015 * Math.sin(2 * Math.PI * 60 * t) + 0.012 * nextRand()],
    ['horn', (t) => 0.16 * Math.sin(2 * Math.PI * 440 * t) + 0.12 * Math.sin(2 * Math.PI * 554 * t)],
    ['moto', (t) => 0.15 * Math.sin(2 * Math.PI * 45 * t) + 0.20 * Math.sin(2 * Math.PI * 88 * t) + 0.03 * nextRand()],
  ]) {
    const noiseVad = new HandyHumanVad({ threshold: 0.48, bargeInThreshold: 0.60, onsetFrames: 2, bargeInOnsetFrames: 5 });
    let inSpeech = 0;
    for (let f = 0; f < 30; f++) {
      const buf = new Float32Array(512);
      for (let i = 0; i < 512; i++) buf[i] = gen((f * 512 + i) / sr);
      if (noiseVad.processSamples(buf, sr, true).inSpeech) inSpeech += 1;
    }
    assert.equal(inSpeech, 0, `${label} must NOT trigger mobile AEC barge-in`);
  }
});

// ---------------------------------------------------------------------------
// 4. Static & Production Bundle Parity (App.tsx, sileroVadGate.ts, app.js, dist)
// ---------------------------------------------------------------------------
await runTest('Source & dist/voice-studio.js enforce Mobile PWA continuous mic duplex & barge-in contracts', async () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'features/voice-studio/src/App.tsx'), 'utf8');
  const sileroTs = fs.readFileSync(path.join(ROOT, 'features/voice-studio/src/lib/sileroVadGate.ts'), 'utf8');
  const sosJs = fs.readFileSync(path.join(ROOT, 'features/mascot/fiezel-mochi-voice-sos.js'), 'utf8');
  const hostAppJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const distJs = fs.readFileSync(path.join(ROOT, 'features/voice-studio/dist/voice-studio.js'), 'utf8');

  assert.ok(appTsx.includes('setDuplexAudioSessionMode(true)'), 'App.tsx must activate play-and-record audioSession');
  assert.ok(appTsx.includes('setDuplexAudioSessionMode(false)'), 'App.tsx must restore playback audioSession on stop/unmount');
  assert.ok(appTsx.includes('{ preferScriptProcessor: isMobileOrIOSWebKit }'), 'App.tsx must pass preferScriptProcessor to Silero on mobile');
  assert.ok(appTsx.includes('!micCaptureHardFailedRef.current'), 'App.tsx must prevent SpeechRec flapping while ws-duplex mic is pending/recovering');
  assert.ok(appTsx.includes("Mochi Bicara · Mic Aktif") || appTsx.includes("ui.mochiSpeakMic"), 'App.tsx must keep active mic badge visible during Mochi speech on ws-duplex');
  assert.ok(appTsx.includes('bicara saja untuk menyela') || appTsx.includes('ui.coachInterruptHint'), 'App.tsx must keep mobile interrupt hint visible');

  assert.ok(sileroTs.includes("processorType: useScriptProcessor ? 'ScriptProcessor' : 'auto'"), 'sileroVadGate.ts must avoid unstable mobile AudioWorklet');
  assert.ok(sileroTs.includes('isMobileAecHumanBarge'), 'sileroVadGate.ts must include mobile AEC barge-in path');

  assert.ok(sosJs.includes("play-and-record") && sosJs.includes("closeCall"), 'Mochi SOS must manage play-and-record lifecycle');
  assert.ok(hostAppJs.includes("play-and-record") && hostAppJs.includes("stopSharedKawanMicBridge"), 'app.js host bridge must manage play-and-record lifecycle');

  assert.ok(distJs.includes('Mochi Bicara · Mic Aktif'), 'dist/voice-studio.js must be rebuilt with mobile duplex indicator');
  assert.ok(distJs.includes('play-and-record'), 'dist/voice-studio.js must include rebuilt play-and-record session guard');
});

console.log('ALL MOBILE PWA MIC DUPLEX & AEC BARGE-IN REGRESSION CHECKS PASSED!');
