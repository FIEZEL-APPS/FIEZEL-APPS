/**
 * tests/audio-resource-leak-audit-test.js
 * Verification for zero resource leaks across audio streams, microphone tracks,
 * speech recognition, and neural voice synthesis in interactive-chat and voice-call.
 */
const assert = require('assert');
const path = require('path');

class MockElement {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this.children = [];
    const selfSet = new Set();
    this.classList = {
      add: (c) => selfSet.add(c),
      remove: (c) => selfSet.delete(c),
      contains: (c) => selfSet.has(c),
      toggle: (c, val) => {
        if (val === undefined) {
          if (selfSet.has(c)) selfSet.delete(c);
          else selfSet.add(c);
        } else if (val) {
          selfSet.add(c);
        } else {
          selfSet.delete(c);
        }
      }
    };
    this.attributes = {};
    this.innerHTML = '';
    this.style = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  appendChild(child) { this.children.push(child); }
  remove() {}
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
  addEventListener(event, fn) { this['on' + event] = fn; }
  removeEventListener(event, fn) { delete this['on' + event]; }
}

globalThis.window = globalThis;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.document = {
  documentElement: new MockElement('html'),
  body: new MockElement('body'),
  getElementById(id) {
    return new MockElement('div');
  },
  createElement(tag) {
    return new MockElement(tag);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {}
};

class MockAudioTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.enabled = true;
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
  }
}

class MockMediaStream {
  constructor() {
    this.tracks = [new MockAudioTrack()];
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter(t => t.kind === 'audio');
  }
}

function setMockNavigator(props) {
  const base = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    platform: 'Linux armv8l',
    mediaDevices: {
      getUserMedia: () => Promise.resolve(new MockMediaStream())
    }
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: Object.assign(base, props),
    configurable: true,
    writable: true
  });
}
setMockNavigator();

class MockSpeechRecognition {
  constructor() {
    this.lang = 'ja-JP';
    this.continuous = false;
    this.interimResults = false;
    this.started = false;
    this.aborted = false;
    this.stopped = false;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {
    this.started = true;
  }
  abort() {
    this.aborted = true;
    this.stopped = true;
  }
  stop() {
    this.stopped = true;
  }
}

globalThis.SpeechRecognition = MockSpeechRecognition;
globalThis.webkitSpeechRecognition = MockSpeechRecognition;

// Mock AudioContext
class MockAudioNode {
  constructor() {
    this.connected = null;
    this.disconnected = false;
  }
  connect(dest) {
    this.connected = dest;
  }
  disconnect() {
    this.disconnected = true;
    this.connected = null;
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
  }
  createAnalyser() {
    const a = new MockAudioNode();
    a.frequencyBinCount = 32;
    a.getByteFrequencyData = (arr) => arr.fill(10);
    a.getByteTimeDomainData = (arr) => arr.fill(128);
    return a;
  }
  createMediaStreamSource(stream) {
    const s = new MockAudioNode();
    s.stream = stream;
    return s;
  }
  createMediaStreamDestination() {
    return { stream: new MockMediaStream() };
  }
  createOscillator() {
    const osc = new MockAudioNode();
    osc.start = () => {};
    return osc;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
}

globalThis.AudioContext = MockAudioContext;
globalThis.webkitAudioContext = MockAudioContext;

// Mock Neural Voice Layers
let voiceSayStopped = false;
let puterVoiceStopped = false;
let neuralVoiceStopped = false;
let webAudioPlayerStopped = false;

globalThis.FiezelVoiceSay = {
  say: () => Promise.resolve(true),
  stop: () => { voiceSayStopped = true; return true; }
};

globalThis.FiezelPuterVoice = {
  speak: () => Promise.resolve(true),
  stop: () => { puterVoiceStopped = true; return true; }
};

globalThis.FiezelNeuralVoice = {
  stop: () => { neuralVoiceStopped = true; return true; }
};

globalThis.FiezelWebAudioPlayer = {
  stop: () => { webAudioPlayerStopped = true; return true; }
};

// Require modules
const chatVoice = require('../features/interactive-chat/fiezel-chat-voice.js');
const voiceCall = require('../features/interactive-chat/fiezel-voice-call.js');
const interactiveChat = require('../features/interactive-chat/fiezel-interactive-chat.js');

async function runAudit() {
  console.log('=== AUDIT TEST: AUDIO RESOURCE LEAK & TEARDOWN ===\n');

  // --- Test 1: FiezelChatVoice.stop() aborts all neural & player layers ---
  console.log('--- TEST 1: FiezelChatVoice.stop() aborts all audio playback layers ---');
  voiceSayStopped = false;
  puterVoiceStopped = false;
  neuralVoiceStopped = false;
  webAudioPlayerStopped = false;

  chatVoice.stop();
  assert.strictEqual(voiceSayStopped, true, 'FiezelVoiceSay must be stopped on chatVoice.stop()');
  assert.strictEqual(puterVoiceStopped, true, 'FiezelPuterVoice must be stopped on chatVoice.stop()');
  assert.strictEqual(neuralVoiceStopped, true, 'FiezelNeuralVoice must be stopped on chatVoice.stop()');
  assert.strictEqual(webAudioPlayerStopped, true, 'FiezelWebAudioPlayer must be stopped on chatVoice.stop()');
  console.log('✓ Test 1: All Neural Voice & WebAudio playback engines cleanly aborted.');

  // --- Test 2: Shadowing track cleanup on unmount() ---
  console.log('--- TEST 2: Shadowing audio stream tracks enabled=false and stop() on unmount ---');
  const mockStream = new MockMediaStream();
  setMockNavigator({
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    platform: 'Linux armv8l',
    mediaDevices: {
      getUserMedia: () => Promise.resolve(mockStream)
    }
  });

  // Mount chat and start shadowing
  interactiveChat.mount();
  interactiveChat.startShadowing('msg-test-1', 'こんにちは');

  // Allow promise to resolve and stream to attach
  await new Promise(r => setTimeout(r, 50));

  const track = mockStream.getTracks()[0];
  assert.strictEqual(track.stopped, false, 'Track should be active while shadowing');

  // Murid unmount / pindah layar
  interactiveChat.unmount();

  assert.strictEqual(track.enabled, false, 'track.enabled must be set to FALSE to release iOS/Android hardware mic indicator');
  assert.strictEqual(track.stopped, true, 'track.stop() must be invoked on unmount');
  assert.strictEqual(interactiveChat.getState().shadowingMsgId, null, 'shadowingMsgId must be reset to null');
  assert.strictEqual(interactiveChat.getState().recognition, null, 'recognition instance must be nullified');
  console.log('✓ Test 2: Shadowing tracks cleanly disabled and stopped on unmount.');

  // --- Test 3: In-flight getUserMedia race condition guard ---
  console.log('--- TEST 3: In-flight getUserMedia race condition when student navigates away before stream resolves ---');
  let delayedStream = new MockMediaStream();
  let resolveDelayedGUM = null;
  setMockNavigator({
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    platform: 'Linux armv8l',
    mediaDevices: {
      getUserMedia: () => new Promise(resolve => {
        resolveDelayedGUM = () => resolve(delayedStream);
      })
    }
  });

  interactiveChat.mount();
  interactiveChat.startShadowing('msg-test-2', 'ありがとう');

  // Murid langsung pindah halaman sebelum getUserMedia memberikan izin
  interactiveChat.unmount();

  // Sekarang izin diberikan setelah unmount terjadi
  resolveDelayedGUM();
  await new Promise(r => setTimeout(r, 20));

  const delayedTrack = delayedStream.getTracks()[0];
  assert.strictEqual(delayedTrack.enabled, false, 'Late-resolving stream track.enabled must be set to FALSE');
  assert.strictEqual(delayedTrack.stopped, true, 'Late-resolving stream track.stop() must be called to prevent ghost mic leak');
  console.log('✓ Test 3: Race condition handled: delayed getUserMedia stream aborted immediately without leaking.');

  // --- Test 4: Voice Call mediaStream, tracks and recognition teardown on end() ---
  console.log('--- TEST 4: Voice Call stream and speech recognition teardown ---');
  const callMockStream = new MockMediaStream();
  setMockNavigator({
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    platform: 'Linux armv8l',
    mediaDevices: {
      getUserMedia: () => Promise.resolve(callMockStream)
    }
  });

  await voiceCall.startCall({
    course: 'ja',
    partnerName: 'Sensei',
    scenarioId: 'free'
  });

  const callTrack = callMockStream.getTracks()[0];
  assert.strictEqual(callTrack.stopped, false, 'Call track must be active during call');

  // End call
  voiceCall.endCall();

  assert.strictEqual(callTrack.enabled, false, 'Call stream track.enabled must be FALSE on endCall()');
  assert.strictEqual(callTrack.stopped, true, 'Call stream track.stop() must be called on endCall()');
  assert.strictEqual(voiceCall.getState().status, 'idle', 'Voice call status must be IDLE');
  console.log('✓ Test 4: Voice Call tracks, audio source node, and recognition cleanly torn down.');

  // --- Test 5: Interactive Chat unmount cascades to end active VoiceCall ---
  console.log('--- TEST 5: Interactive Chat unmount cascades to terminate active VoiceCall ---');
  const callMockStream2 = new MockMediaStream();
  setMockNavigator({
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    platform: 'Linux armv8l',
    mediaDevices: {
      getUserMedia: () => Promise.resolve(callMockStream2)
    }
  });

  await voiceCall.startCall({
    course: 'en',
    partnerName: 'Alex',
    scenarioId: 'interview'
  });

  interactiveChat.mount();
  assert.notStrictEqual(voiceCall.getState().status, 'idle', 'Voice call should be active');

  // Unmount chat
  interactiveChat.unmount();

  assert.strictEqual(voiceCall.getState().status, 'idle', 'interactiveChat.unmount() must terminate active VoiceCall');
  const callTrack2 = callMockStream2.getTracks()[0];
  assert.strictEqual(callTrack2.enabled, false, 'Cascaded unmount must disable track.enabled');
  assert.strictEqual(callTrack2.stopped, true, 'Cascaded unmount must call track.stop()');
  console.log('✓ Test 5: Chat unmount cleanly cascaded to terminate voice call and free mic.');

  console.log('\n======================================================');
  console.log('ALL AUDIO & MIC RESOURCE LEAK TESTS PASSED (5/5)!');
  console.log('======================================================');
}

runAudit().catch(err => {
  console.error('AUDIT FAILED:', err);
  process.exit(1);
});
