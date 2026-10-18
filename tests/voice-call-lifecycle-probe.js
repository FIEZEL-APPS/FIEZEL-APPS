/**
 * tests/voice-call-lifecycle-probe.js
 * Empirical probe for Voice Call Mode lifecycle:
 * - Entering & exiting voice call mode (startVoiceCall, endVoiceCall, closeCallUI)
 * - Browser/OS Back button handling & anti-ghost audio
 * - Overlay elements cleanup (.fzc-call-screen, .fzc-call-overlay, .fzc-call-stage, .fzc-voice-orb)
 * - Web Audio stream & AudioContext recycling
 * - View switching cleanup
 */
'use strict';
const assert = require('assert');
const path = require('path');

console.log('=== VOICE CALL LIFECYCLE EMPIRICAL AUDIT PROBE ===\n');

// Mock DOM & Web Audio environment
class MockDOMElement {
  constructor(tag, id = '', className = '') {
    this.tagName = (tag || 'DIV').toUpperCase();
    this.id = id;
    this.classList = {
      _classes: new Set(className ? className.split(/\s+/).filter(Boolean) : []),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
        return this.classList._classes.has(c);
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.children = [];
    this.parentNode = null;
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      removeProperty: (k) => { delete this.style[k]; }
    };
    this.attributes = {};
    this._listeners = {};
    this.textContent = '';
    this._innerHTML = '';
  }

  get className() {
    return Array.from(this.classList._classes).join(' ');
  }

  set className(val) {
    this.classList._classes = new Set(String(val || '').split(/\s+/).filter(Boolean));
  }

  get innerHTML() {
    return this._innerHTML || '';
  }

  set innerHTML(html) {
    this._innerHTML = String(html || '');
    this.children = [];
    if (!html) return;
    const tagRegex = /<([a-zA-Z0-9]+)\s*([^>]*)>(?:([^<]*)(?:<\/\1>)?)?/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1];
      if (tag.startsWith('/')) continue;
      const attrs = match[2];
      const text = match[3] ? match[3].trim() : '';
      const idMatch = /id=["']([^"']+)["']/.exec(attrs);
      const classMatch = /class=["']([^"']+)["']/.exec(attrs);
      const el = new MockDOMElement(tag, idMatch ? idMatch[1] : '', classMatch ? classMatch[1] : '');
      if (text) el.textContent = text;
      el.parentNode = this;
      this.children.push(el);
    }
  }

  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  removeAttribute(k) { delete this.attributes[k]; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(sel) {
    const results = this.querySelectorAll(sel);
    return results.length ? results[0] : null;
  }

  querySelectorAll(sel) {
    const selectors = sel.split(',').map(s => s.trim());
    const res = [];
    const walk = (node) => {
      for (const ch of node.children) {
        for (const s of selectors) {
          if (s.startsWith('#') && ch.id === s.slice(1)) {
            if (!res.includes(ch)) res.push(ch);
          } else if (s.startsWith('.') && ch.classList.contains(s.slice(1))) {
            if (!res.includes(ch)) res.push(ch);
          } else if (s.toUpperCase() === ch.tagName) {
            if (!res.includes(ch)) res.push(ch);
          }
        }
        walk(ch);
      }
    };
    walk(this);
    return res;
  }

  addEventListener(ev, fn) {
    if (!this._listeners[ev]) this._listeners[ev] = [];
    this._listeners[ev].push(fn);
  }

  removeEventListener(ev, fn) {
    if (!this._listeners[ev]) return;
    this._listeners[ev] = this._listeners[ev].filter(f => f !== fn);
  }

  dispatchEvent(ev) {
    const fns = this._listeners[ev.type] || [];
    fns.forEach(fn => fn(ev));
  }

  getBoundingClientRect() {
    return { width: 320, height: 480, top: 0, left: 0, right: 320, bottom: 480 };
  }

  getContext() {
    return {
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {}
    };
  }
}

// Setup global mock DOM
global.document = new MockDOMElement('HTML');
global.document.body = new MockDOMElement('BODY');
global.document.documentElement = global.document;
global.document.body.parentNode = global.document;
global.document.createElement = (tag) => new MockDOMElement(tag);
global.document.getElementById = (id) => global.document.querySelector('#' + id);

// Web Audio mock
let audioContextCount = 0;
let lastCreatedAudioContext = null;

class MockAudioContext {
  constructor() {
    audioContextCount++;
    this.state = 'running';
    this.id = audioContextCount;
    lastCreatedAudioContext = this;
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
  createBuffer() { return {}; }
  createBufferSource() { return { connect: () => {}, start: () => {} }; }
  createAnalyser() {
    return {
      fftSize: 512,
      smoothingTimeConstant: 0.8,
      frequencyBinCount: 256,
      getByteTimeDomainData: (arr) => arr.fill(128),
      getByteFrequencyData: (arr) => arr.fill(0)
    };
  }
  createMediaStreamSource() {
    if (this.state === 'closed') {
      throw new Error('InvalidStateError: Cannot call createMediaStreamSource on a closed AudioContext');
    }
    return { connect: () => {}, disconnect: () => {} };
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock MediaStream
class MockMediaStreamTrack {
  constructor(kind = 'audio') {
    this.kind = kind;
    this.enabled = true;
    this.stopped = false;
  }
  stop() { this.stopped = true; }
}

class MockMediaStream {
  constructor() {
    this._tracks = [new MockMediaStreamTrack('audio')];
  }
  getTracks() { return this._tracks; }
  getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
}

try {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      mediaDevices: {
        getUserMedia: (constraints) => Promise.resolve(new MockMediaStream())
      }
    },
    writable: true,
    configurable: true
  });
} catch (_) {
  if (global.navigator) {
    global.navigator.mediaDevices = {
      getUserMedia: (constraints) => Promise.resolve(new MockMediaStream())
    };
  }
}

// Mock SpeechRecognition
let activeSpeechRec = null;
class MockSpeechRecognition {
  constructor() {
    activeSpeechRec = this;
    this.continuous = true;
    this.interimResults = true;
    this.running = false;
    this.aborted = false;
  }
  start() { this.running = true; }
  stop() { this.running = false; if (this.onend) this.onend(); }
  abort() { this.running = false; this.aborted = true; if (this.onend) this.onend(); }
}

global.SpeechRecognition = MockSpeechRecognition;

// Mock FiezelBackNav
const backNavStack = [];
global.FiezelBackNav = {
  pushLayer: (layer) => {
    backNavStack.push(layer);
    return true;
  },
  dismiss: (id) => {
    const idx = backNavStack.findIndex(l => l.id === id);
    if (idx >= 0) {
      const removed = backNavStack.splice(idx, 1)[0];
      return true;
    }
    return false;
  },
  triggerBack: () => {
    if (backNavStack.length > 0) {
      const top = backNavStack.pop();
      if (top && typeof top.close === 'function') {
        return top.close();
      }
    }
    return false;
  },
  _getStack: () => backNavStack
};

global.window = {
  addEventListener: (ev, fn) => {},
  removeEventListener: (ev, fn) => {},
  SpeechRecognition: MockSpeechRecognition,
  AudioContext: MockAudioContext
};
global.self = global.window;
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

async function runProbe() {
  console.log('--- AUDIT 1: Loading Modules ---');
  const VoiceCall = require('../features/interactive-chat/fiezel-voice-call.js');
  const VoiceOrb = require('../features/interactive-chat/fiezel-voice-orb.js');
  const InteractiveChat = require('../features/interactive-chat/fiezel-interactive-chat.js');

  console.log('VoiceCall exported functions:', Object.keys(VoiceCall));
  console.log('VoiceOrb exported functions:', Object.keys(VoiceOrb));
  console.log('InteractiveChat has startVoiceCall:', typeof InteractiveChat.startVoiceCall);
  console.log('InteractiveChat has endVoiceCall:', typeof InteractiveChat.endVoiceCall);
  console.log('InteractiveChat has closeCallUI:', typeof InteractiveChat.closeCallUI);
  console.log('VoiceCall has endVoiceCall:', typeof VoiceCall.endVoiceCall);
  console.log('VoiceCall has closeCallUI:', typeof VoiceCall.closeCallUI);

  assert.strictEqual(typeof InteractiveChat.startVoiceCall, 'function', 'InteractiveChat must have startVoiceCall');
  assert.strictEqual(typeof InteractiveChat.endVoiceCall, 'function', 'InteractiveChat must have endVoiceCall');
  assert.strictEqual(typeof InteractiveChat.closeCallUI, 'function', 'InteractiveChat must have closeCallUI');
  assert.strictEqual(typeof VoiceCall.endVoiceCall, 'function', 'VoiceCall must have endVoiceCall');
  assert.strictEqual(typeof VoiceCall.closeCallUI, 'function', 'VoiceCall must have closeCallUI');

  console.log('\n--- AUDIT 2: Start Call & Check BackNav Layer Registration ---');
  await VoiceCall.startCall({ course: 'ja', partnerName: 'フィゼル先生' });
  console.log('VoiceCall state:', VoiceCall.getState().status);
  console.log('BackNav stack length:', backNavStack.length);
  console.log('BackNav stack entries:', backNavStack.map(e => e.id));
  const overlayInDOM = global.document.body.querySelector('#fzcCallOverlay, .fzc-call-stage');
  console.log('Overlay present in DOM after start:', !!overlayInDOM);
  assert.strictEqual(VoiceCall.getState().status, 'listening');
  assert.strictEqual(backNavStack.length, 1);
  assert.strictEqual(backNavStack[0].id, 'fzc-voice-call');
  assert.ok(overlayInDOM, 'Overlay must be present in DOM when call is active');

  console.log('\n--- AUDIT 3: Simulating Back Button during Active Call ---');
  const backHandled = global.FiezelBackNav.triggerBack();
  console.log('Back button handled by layer:', backHandled);
  console.log('VoiceCall state after back button:', VoiceCall.getState().status);
  assert.strictEqual(backHandled, true, 'Back button must be handled by voice call layer');
  assert.strictEqual(VoiceCall.getState().status, 'idle', 'VoiceCall must transition to idle on back press');

  console.log('\n--- AUDIT 4: Check DOM Cleanup after End ---');
  const overlayAfterEnd = global.document.body.querySelectorAll('#fzcCallOverlay, .fzc-call-overlay, .fzc-call-stage, .fzc-voice-orb');
  console.log('Overlay elements count in DOM after call end:', overlayAfterEnd.length);
  assert.strictEqual(overlayAfterEnd.length, 0, 'No overlay elements should linger in DOM after end');

  console.log('\n--- AUDIT 5: Check Shared AudioContext Lifecycle ---');
  console.log('Shared AudioContext state:', global.__fiezelSharedAudioContext ? global.__fiezelSharedAudioContext.state : 'null');
  await VoiceCall.startCall({ course: 'ja' });
  console.log('Second startCall succeeded! State:', VoiceCall.getState().status);
  assert.strictEqual(VoiceCall.getState().status, 'listening');
  VoiceCall.endCall();
  assert.strictEqual(VoiceCall.getState().status, 'idle');

  console.log('\n--- AUDIT 6: Check VoiceOrb RAF Loop on Close ---');
  const orb = VoiceOrb.create({ container: global.document.body });
  console.log('Orb created, rafId:', !!orb.rafId);
  assert.ok(orb.rafId, 'VoiceOrb should start RAF loop on creation');
  orb.close();
  console.log('Orb closed, rafId:', orb.rafId);
  assert.strictEqual(orb.rafId, null, 'VoiceOrb must cancel RAF loop on close');
  orb.destroy();

  console.log('\n--- AUDIT 7: View Switching & InteractiveChat unmount ---');
  await InteractiveChat.startVoiceCall({ course: 'ja' });
  console.log('Call started via InteractiveChat, status:', VoiceCall.getState().status);
  assert.strictEqual(VoiceCall.getState().status, 'listening');
  console.log('Unmounting InteractiveChat (simulating navigating to another view)...');
  InteractiveChat.unmount();
  console.log('VoiceCall status after chat unmount:', VoiceCall.getState().status);
  assert.strictEqual(VoiceCall.getState().status, 'idle', 'Voice call must end when chat unmounts');
  const leftoverOverlays = global.document.body.querySelectorAll('#fzcCallOverlay, .fzc-call-overlay, .fzc-call-stage, .fzc-call-screen, .fzc-voice-orb');
  console.log('Leftover overlay elements after unmount:', leftoverOverlays.length);
  assert.strictEqual(leftoverOverlays.length, 0, 'Zero leftover overlay elements on unmount');

  console.log('\n======================================================');
  console.log('ALL VOICE CALL LIFECYCLE AUDIT CHECKS PASSED (7/7)!');
  console.log('======================================================\n');
}

runProbe().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
