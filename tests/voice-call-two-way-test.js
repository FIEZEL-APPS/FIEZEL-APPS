#!/usr/bin/env node
/**
 * tests/voice-call-two-way-test.js
 * Comprehensive automated verification for Two-Way Voice Call Integration:
 * fiezel-voice-call.js <-> fiezel-voice-orb.js <-> fiezel-interactive-chat.js
 *
 * Verifies:
 * 1. #fzcBtnCall in chat header triggers FiezelVoiceCall.startCall() with partner parameters (partnerName, partnerAvatar, course, scenarioId).
 * 2. Visual integration with FiezelVoiceOrb (stage mounting, states, fluid canvas/orb, timer, volume reactivity, #fzcBtnEndCall).
 * 3. Hands-free conversational loop: after AI completes speaking (TTS), system autonomously returns to listening without manual clicks.
 * 4. VAD & silence timeout: detects silence after student speech and automatically triggers AI turn.
 * 5. Polite barge-in: student voice interruption during AI speech immediately stops TTS and switches back to listening.
 * 6. Zero-Loss State: ending call (#fzcBtnEndCall / hangup) synchronizes full transcript to chat state.messages.
 */
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('=== FIEZEL TWO-WAY VOICE CALL INTEGRATION TEST ===\n');

// 1. Setup simulated browser DOM and Audio environment
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

  addEventListener(evt, fn) {
    if (!this._listeners[evt]) this._listeners[evt] = [];
    this._listeners[evt].push(fn);
  }

  removeEventListener(evt, fn) {
    if (!this._listeners[evt]) return;
    this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
  }

  click() {
    if (typeof this.onclick === 'function') this.onclick();
    const handlers = this._listeners['click'] || [];
    handlers.forEach(h => h({ type: 'click', target: this }));
  }

  querySelector(sel) {
    if (sel.includes(',')) {
      const parts = sel.split(',').map(s => s.trim());
      for (const p of parts) {
        const found = this._findFirst(p);
        if (found) return found;
      }
      return null;
    }
    return this._findFirst(sel);
  }

  querySelectorAll(sel) {
    const res = [];
    this._findAll(sel, res);
    return res;
  }

  _matches(sel) {
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    if (sel.startsWith('.')) return this.classList.contains(sel.slice(1));
    return this.tagName.toLowerCase() === sel.toLowerCase();
  }

  _findFirst(sel) {
    if (this._matches(sel)) return this;
    for (const child of this.children) {
      if (child instanceof MockDOMElement) {
        const found = child._findFirst(sel);
        if (found) return found;
      }
    }
    return null;
  }

  _findAll(sel, res) {
    if (this._matches(sel)) res.push(this);
    for (const child of this.children) {
      if (child instanceof MockDOMElement) {
        child._findAll(sel, res);
      }
    }
  }

  getBoundingClientRect() {
    return { width: 300, height: 300, top: 0, left: 0 };
  }

  getContext(type) {
    if (type === '2d') {
      return {
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        fill: () => {},
        arc: () => {},
        save: () => {},
        restore: () => {},
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1
      };
    }
    return null;
  }
}

// Global browser mocks
global.document = {
  body: new MockDOMElement('BODY', '', 'fzc-body'),
  createElement: (tag) => new MockDOMElement(tag),
  getElementById: (id) => global.document.body.querySelector('#' + id),
  querySelector: (sel) => global.document.body.querySelector(sel),
  querySelectorAll: (sel) => global.document.body.querySelectorAll(sel),
  hidden: false
};

global.window = global;
global.self = global;
global.devicePixelRatio = 1;
global.addEventListener = (evt, fn) => {};
global.removeEventListener = (evt, fn) => {};

let rafCounter = 1;
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// m025-596: panggilan bersuara lewat pipeline Neural Voice resmi (FiezelChatVoice → Puter Voice
// untuk kursus Jepang). speechSynthesis SENGAJA tetap tersedia di sini supaya gerbang ini
// membuktikan ia TIDAK dipakai (kanon: TTS peramban mati total).
global.FIEZEL_SERVER_TTS_ENABLED = false;
let synthTouched = 0;
global.speechSynthesis = new Proxy({}, { get() { synthTouched++; return () => {}; } });
global.SpeechSynthesisUtterance = function () { synthTouched++; };

let neuralStopped = false;
let spokenUtterances = [];
global.FiezelPuterVoice = {
  speak: (text, opts) => {
    spokenUtterances.push({ text, lang: opts && opts.lang });
    return new Promise((r) => setTimeout(() => r(true), 50));
  },
  prefetch: () => Promise.resolve(true),
  stop: () => { neuralStopped = true; }
};

let activeRecognition = null;
global.SpeechRecognition = function () {
  this.continuous = true;
  this.interimResults = true;
  this.lang = 'ja-JP';
  this.started = false;
  this.start = () => {
    this.started = true;
    activeRecognition = this;
  };
  this.stop = () => {
    this.started = false;
    if (typeof this.onend === 'function') this.onend();
  };
};

class MockAudioTrack {
  constructor() {
    this.enabled = true;
  }
  stop() { this.enabled = false; }
}

global.__FIEZEL_TEST_MOCK_STREAM__ = true;
try {
  global.navigator.mediaDevices = {
    getUserMedia: (constraints) => Promise.resolve({
      tracks: [new MockAudioTrack()],
      getTracks: function () { return this.tracks; },
      getAudioTracks: function () { return this.tracks; }
    })
  };
} catch (_) {}

global.AudioContext = function () {
  this.state = 'running';
  this.resume = () => Promise.resolve();
  this.close = () => Promise.resolve();
  this.createMediaStreamSource = () => ({
    connect: () => {},
    disconnect: () => {}
  });
  this.createAnalyser = () => ({
    fftSize: 512,
    smoothingTimeConstant: 0.25,
    frequencyBinCount: 256,
    getByteTimeDomainData: (arr) => arr.fill(128),
    getByteFrequencyData: (arr) => arr.fill(0)
  });
};

global.FiezelI18n = {
  getCourse: () => 'ja',
  getLocale: () => 'id',
  t: (k, fb) => fb || k
};

// 2. Load Modules
const iconsModulePath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-chat-icons.js');
const orbModulePath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-orb.js');
const callModulePath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-call.js');
const chatModulePath = path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-interactive-chat.js');

const FiezelChatIcons = require(iconsModulePath);
global.FiezelChatIcons = FiezelChatIcons;

global.FiezelChatVoice = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-chat-voice.js'));

const FiezelVoiceOrb = require(orbModulePath);
global.FiezelVoiceOrb = FiezelVoiceOrb;

const FiezelVoiceCall = require(callModulePath);
global.FiezelVoiceCall = FiezelVoiceCall;

const FiezelInteractiveChat = require(chatModulePath);
global.FiezelInteractiveChat = FiezelInteractiveChat;

async function runTests() {
  console.log('--- TEST 1: FiezelVoiceCall & FiezelVoiceOrb Initialization ---');
  assert.ok(FiezelVoiceCall, 'FiezelVoiceCall must be exported');
  assert.strictEqual(typeof FiezelVoiceCall.startCall, 'function', 'FiezelVoiceCall must provide startCall()');
  assert.strictEqual(typeof FiezelVoiceCall.start, 'function', 'FiezelVoiceCall must provide start()');
  assert.strictEqual(typeof FiezelVoiceCall.end, 'function', 'FiezelVoiceCall must provide end()');
  assert.strictEqual(typeof FiezelVoiceCall.interrupt, 'function', 'FiezelVoiceCall must provide interrupt()');
  assert.strictEqual(typeof FiezelVoiceCall.toggleMute, 'function', 'FiezelVoiceCall must provide toggleMute()');
  console.log('✓ FiezelVoiceCall API methods verified.');

  assert.ok(FiezelVoiceOrb, 'FiezelVoiceOrb must be exported');
  assert.strictEqual(typeof FiezelVoiceOrb.create, 'function', 'FiezelVoiceOrb must provide create()');
  console.log('✓ FiezelVoiceOrb API verified.');

  console.log('--- TEST 2: Header #fzcBtnCall triggers FiezelVoiceCall.startCall() ---');
  const chatState = FiezelInteractiveChat.getState();
  assert.ok(chatState, 'Interactive chat state must exist');
  const initialMsgsCount = chatState.messages.length;

  // Mount chat container to simulate DOM
  const chatContainer = new MockDOMElement('DIV', 'fzcChatApp');
  chatContainer.innerHTML = FiezelInteractiveChat.renderMarkup();
  global.document.body.appendChild(chatContainer);
  FiezelInteractiveChat.bindEvents(chatContainer);

  const callBtn = chatContainer.querySelector('#fzcBtnCall');
  assert.ok(callBtn, '#fzcBtnCall must exist in chat container');

  let callStartedWith = null;
  const originalStartCall = FiezelVoiceCall.startCall;
  FiezelVoiceCall.startCall = function (opts) {
    callStartedWith = opts;
    return originalStartCall.call(FiezelVoiceCall, opts);
  };

  // Click #fzcBtnCall and await start promise
  const startPromise = callBtn.onclick();
  assert.ok(callStartedWith, 'Clicking #fzcBtnCall must trigger FiezelVoiceCall.startCall()');
  assert.strictEqual(callStartedWith.course, 'ja', 'Parameter course must be passed correctly');
  assert.strictEqual(callStartedWith.partnerName, 'フィゼル先生', 'Parameter partnerName must be passed correctly');
  assert.ok(callStartedWith.partnerAvatar && (callStartedWith.partnerAvatar.includes('fzc-icon-sensei') || callStartedWith.partnerAvatar === '🌸'), 'Parameter partnerAvatar must be passed correctly (SVG sensei icon or avatar string)');
  assert.ok(callStartedWith.scenarioId, 'Parameter scenarioId must be passed');
  console.log('✓ #fzcBtnCall successfully triggered FiezelVoiceCall.startCall with params:', callStartedWith);

  console.log('--- TEST 3: Visual Stage & FiezelVoiceOrb Integration ---');
  await startPromise;

  const callStage = global.document.body.querySelector('.fzc-call-stage');
  console.log('DEBUG callStage:', callStage ? { id: callStage.id, className: callStage.className, parent: callStage.parentNode ? (callStage.parentNode.id || callStage.parentNode.className) : null } : null);
  assert.ok(callStage, 'FiezelVoiceOrb stage (.fzc-call-stage) must be mounted in DOM');
  assert.ok(callStage.classList.contains('is-active'), 'Voice call stage must be active');

  const hangupBtn = global.document.body.querySelector('#fzcCallBtnEnd, #fzcBtnEndCall');
  assert.ok(hangupBtn, 'Hangup button with id #fzcCallBtnEnd / #fzcBtnEndCall must exist in voice call stage');

  const partnerNameEl = global.document.body.querySelector('.fzc-call-partner-name');
  assert.ok(partnerNameEl && partnerNameEl.textContent === 'フィゼル先生', 'Partner name must display in VoiceOrb stage');

  const timerEl = global.document.body.querySelector('#fzcCallTimer');
  assert.ok(timerEl, 'Timer element #fzcCallTimer must be mounted in VoiceOrb header');
  console.log('✓ Visual stage and FiezelVoiceOrb integrated successfully.');

  console.log('--- TEST 4: Hands-free Conversational Turn Taking & VAD Silence Timeout ---');
  const engineState = FiezelVoiceCall.getState();
  assert.strictEqual(engineState.status, 'listening', 'Engine must be in listening state after connecting');

  // Simulate student speaking
  engineState.status = 'listening';
  assert.ok(activeRecognition, 'Speech recognition must be active during call');

  // Trigger speech result from student
  const mockResultEvent = {
    resultIndex: 0,
    results: [
      Object.assign([{ transcript: 'こんにちは、元気ですか？' }], { isFinal: true })
    ]
  };

  activeRecognition.onresult(mockResultEvent);

  // Check subtitle update
  const transcriptEl = global.document.body.querySelector('.fzc-call-transcript-text, #fzcCallSubText');
  assert.ok(transcriptEl && transcriptEl.textContent.includes('こんにちは、元気ですか？'), 'Live transcript must update with student speech');

  // Wait for silence timeout (1350ms in CONFIG, or test trigger)
  console.log('Waiting for VAD silence timeout...');
  await new Promise(r => setTimeout(r, 1500));

  // Should have transitioned through thinking to speaking
  assert.ok(spokenUtterances.length > 0, 'AI Tutor must have spoken an utterance');
  assert.ok(spokenUtterances.every((u) => u.lang === 'ja-JP'), 'Japanese call must speak through the neural ja-JP voice');
  console.log('✓ AI responded autonomously with spoken utterance:', spokenUtterances[spokenUtterances.length - 1].text);

  // Wait for speech synthesis to end and natural pause (hands-free return to listening)
  let pollAttempts = 0;
  while (FiezelVoiceCall.getState().status !== 'listening' && pollAttempts < 25) {
    await new Promise(r => setTimeout(r, 100));
    pollAttempts++;
  }

  const currentSt = FiezelVoiceCall.getState().status;
  assert.strictEqual(currentSt, 'listening', 'Hands-free loop: AI must autonomously return to listening without user interaction');
  console.log('✓ Hands-free conversational loop successfully completed turn and returned to listening.');

  console.log('--- TEST 5: Polite Barge-In (Interruption) ---');
  // Transition to speaking to test barge-in
  FiezelVoiceCall._testSetStatus('speaking');
  neuralStopped = false;

  // Student interrupts AI by speaking
  FiezelVoiceCall.interrupt('user_acoustic_barge_in');
  assert.strictEqual(neuralStopped, true, 'Neural voice playback must be stopped on barge-in');
  assert.strictEqual(FiezelVoiceCall.getState().status, 'listening', 'Status must immediately switch to listening on barge-in');
  console.log('✓ Polite barge-in successfully interrupted AI playback and switched to listening.');

  console.log('--- TEST 6: Zero-Loss State & Call Hangup Synchronization (#fzcBtnEndCall) ---');
  // Ensure we have completed turns
  assert.ok(hangupBtn, 'Hangup button #fzcBtnEndCall must be available');

  const beforeMsgsCount = FiezelInteractiveChat.getState().messages.length;

  // Click #fzcBtnEndCall
  hangupBtn.click();
  await new Promise(r => setTimeout(r, 300));

  assert.strictEqual(FiezelVoiceCall.getState().status, 'idle', 'Call status must be idle after hangup');

  // Verify that the conversation transcript is synchronized to FiezelInteractiveChat
  const afterMsgs = FiezelInteractiveChat.getState().messages;
  assert.ok(afterMsgs.length > initialMsgsCount, 'Voice call transcript must be synchronized to chat state.messages (Zero-Loss)');

  const voiceUserMsg = afterMsgs.find(m => m.text && m.text.includes('こんにちは、元気ですか？'));
  assert.ok(voiceUserMsg, 'Student spoken sentence must be preserved in text chat messages');
  assert.strictEqual(voiceUserMsg.isVoice, true, 'Voice message must be flagged with isVoice: true');

  const voiceAssistantMsg = afterMsgs.find(m => m.role === 'assistant' && m.isVoice);
  assert.ok(voiceAssistantMsg, 'AI voice response must be preserved in text chat messages');

  console.log('✓ Zero-loss state verified: Spoken messages preserved in text chat feed:', voiceUserMsg.text, '->', voiceAssistantMsg.text);

  assert.strictEqual(synthTouched, 0, 'Browser speechSynthesis must never be touched during a call');

  console.log('\n======================================================');
  console.log('ALL TWO-WAY VOICE CALL INTEGRATION TESTS PASSED (6/6)!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
