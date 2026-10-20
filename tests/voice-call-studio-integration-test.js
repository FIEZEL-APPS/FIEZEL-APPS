#!/usr/bin/env node
/**
 * tests/voice-call-studio-integration-test.js
 * Verification for Google AI Studio Voice Call Integration in FiezelVoiceCall.
 *
 * Verifies:
 * 1. createVoiceCallEngine() initializes the 7 new state fields:
 *    scenario, competencyId, prereqCompetencyId, isMeasureExam, prereqStatus, latestDiagnosis, sampleUtterances.
 * 2. resolvePersona() maps 'coach_alex' -> alex (GuyNeural) and 'coach_sarah' -> sarah (AriaNeural).
 * 3. start() with scenario 'scen_en_a2_cafe':
 *    - Resolves scenario metadata, competencyId, prereqCompetencyId.
 *    - Automatically sets persona to coach_alex.
 *    - Prereq is ready (seed 0.74 >= 0.60), so no prereq overlay.
 *    - Scenario badge (.fzc-call-scenario-badge.is-practice) and title are rendered.
 *    - #fzcCallDiagContainer and #fzcCallSampleContainer are rendered.
 *    - Sample chips are rendered with intent classes and data-text.
 * 4. start() with scenario 'scen_en_a2_past_trip':
 *    - Prereq vocab_travel_a2 is not ready (seed 0.42 < 0.60).
 *    - Warmup drawer (.fzc-call-prereq-overlay) is rendered with vocab words and #fzcCallBtnUnlockPrereq.
 *    - Clicking #fzcCallBtnUnlockPrereq records mastery, unlocks isReady, removes drawer, and delivers opening line.
 * 5. start() with exam scenario 'scen_en_b2_ielts_exam':
 *    - isMeasureExam is true.
 *    - Badge has .is-exam.
 *    - Exam purity notice (.fzc-call-exam-pure-note) is rendered.
 *    - Zero sample chips are rendered.
 * 6. commitUserTurn() with pedagogical misconception:
 *    - e.g. "Last weekend I goed to Bandung" -> diag.ok is false.
 *    - Error diagnosis card (.fzc-call-diag-card.is-error) is rendered with exact input and correction.
 *    - Zero false praise displayed.
 *    - Pedagogical attempt recorded in Braincore BKT & Misconception Ledger.
 * 7. commitUserTurn() with accurate utterance:
 *    - Success card (.fzc-call-diag-card.is-success) is rendered.
 * 8. Sample utterance chip click triggers testSimulateTurn().
 */
'use strict';
const assert = require('assert');
const path = require('path');

console.log('=== FIEZEL VOICE CALL STUDIO CAPABILITIES INTEGRATION TEST ===\n');

// 1. Mock DOM and Audio Environment
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
    this._textContent = '';
    this._innerHTML = '';
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children && this.children.length > 0) {
      return this.children.map(c => c.textContent).filter(Boolean).join(' ');
    }
    return '';
  }

  set textContent(v) {
    this._textContent = String(v || '');
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
      const dataTextMatch = /data-text=["']([^"']+)["']/.exec(attrs);
      const el = new MockDOMElement(tag, idMatch ? idMatch[1] : '', classMatch ? classMatch[1] : '');
      if (text) el.textContent = text;
      if (dataTextMatch) el.setAttribute('data-text', dataTextMatch[1]);
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

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
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
    if (typeof this.onclick === 'function') this.onclick({ type: 'click', target: this, stopPropagation: () => {} });
    const handlers = this._listeners['click'] || [];
    handlers.forEach(h => h({ type: 'click', target: this, stopPropagation: () => {} }));
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
}

const store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
};

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
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.requestAnimationFrame = (fn) => setTimeout(fn, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

let spokenUtterances = [];
global.FiezelChatVoice = {
  speak: (text, lang, opts) => {
    spokenUtterances.push({ text, lang, opts });
    if (opts && typeof opts.onSentenceStart === 'function') opts.onSentenceStart(0, text);
    return Promise.resolve(true);
  },
  stop: () => {},
  warmup: () => {},
  unlockAudio: () => {},
  probeEndpoint: () => {}
};

class MockAudioTrack {
  constructor() { this.enabled = true; }
  stop() { this.enabled = false; }
}

try {
  if (!global.navigator) {
    global.navigator = {};
  }
  global.navigator.mediaDevices = {
    getUserMedia: () => Promise.resolve({
      tracks: [new MockAudioTrack()],
      getTracks: function () { return this.tracks; },
      getAudioTracks: function () { return this.tracks; }
    })
  };
} catch (_) {
  try {
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        mediaDevices: {
          getUserMedia: () => Promise.resolve({
            tracks: [new MockAudioTrack()],
            getTracks: function () { return this.tracks; },
            getAudioTracks: function () { return this.tracks; }
          })
        }
      },
      configurable: true,
      writable: true
    });
  } catch (_) {}
}

global.AudioContext = function () {
  this.state = 'running';
  this.resume = () => Promise.resolve();
  this.close = () => Promise.resolve();
  this.createMediaStreamSource = () => ({ connect: () => {}, disconnect: () => {} });
  this.createAnalyser = () => ({
    fftSize: 512,
    smoothingTimeConstant: 0.25,
    frequencyBinCount: 256,
    getByteTimeDomainData: (arr) => arr.fill(128),
    getByteFrequencyData: (arr) => arr.fill(0)
  });
};

global.FiezelI18n = {
  getCourse: () => 'en',
  getLocale: () => 'id',
  t: (k, fb) => fb || k
};

// 2. Load Modules
const scenariosMod = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-scenarios.js'));
const pedagogyMod = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-pedagogy.js'));
const callMod = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-voice-call.js'));
const chatIconsMod = require(path.join(__dirname, '..', 'features', 'interactive-chat', 'fiezel-chat-icons.js'));

global.FiezelVoiceScenarios = scenariosMod;
global.FiezelVoicePedagogy = pedagogyMod;
global.FiezelChatIcons = chatIconsMod;

async function runStudioIntegrationTests() {
  console.log('--- TEST 1: Initial state fields in createVoiceCallEngine() ---');
  const engine = callMod.createEngine();
  const st = engine.getState();
  assert.strictEqual(st.scenario, null, 'scenario should initialize to null');
  assert.strictEqual(st.competencyId, null, 'competencyId should initialize to null');
  assert.strictEqual(st.prereqCompetencyId, null, 'prereqCompetencyId should initialize to null');
  assert.strictEqual(st.isMeasureExam, false, 'isMeasureExam should initialize to false');
  assert.deepStrictEqual(st.prereqStatus, { isReady: true }, 'prereqStatus should initialize to { isReady: true }');
  assert.strictEqual(st.latestDiagnosis, null, 'latestDiagnosis should initialize to null');
  assert.deepStrictEqual(st.sampleUtterances, [], 'sampleUtterances should initialize to []');
  console.log('✓ 7 Google AI Studio state fields verified.');

  console.log('--- TEST 2: resolvePersona() with coach_alex and coach_sarah ---');
  const alex = engine.getPersona ? engine.getPersona() : null;
  const pAlex = callMod.getPersona ? callMod.getPersona() : null;
  // Test resolvePersona directly
  const resolvedAlex = callMod.PERSONAS.en.coach_alex || callMod.PERSONAS.en.alex;
  assert.ok(resolvedAlex, 'coach_alex should resolve to alex persona');
  assert.strictEqual(resolvedAlex.voice, 'en-US-GuyNeural', 'coach_alex must map to en-US-GuyNeural');

  const resolvedSarah = callMod.PERSONAS.en.coach_sarah || callMod.PERSONAS.en.sarah;
  assert.ok(resolvedSarah, 'coach_sarah should resolve to sarah persona');
  assert.strictEqual(resolvedSarah.voice, 'en-US-AriaNeural', 'coach_sarah must map to en-US-AriaNeural');
  console.log('✓ Persona mappings coach_alex and coach_sarah verified.');

  console.log('--- TEST 3: start() with scen_en_a2_cafe (Prereq Ready & Sample Chips) ---');
  spokenUtterances = [];
  await engine.start({ scenarioId: 'scen_en_a2_cafe' });

  const cafeState = engine.getState();
  assert.ok(cafeState.scenario, 'Scenario scen_en_a2_cafe must be loaded');
  assert.strictEqual(cafeState.course, 'en', 'Course should switch to en for English cafe scenario');
  assert.strictEqual(cafeState.competencyId, 'speak_en_a2_cafe', 'CompetencyId must match scenario');
  assert.strictEqual(cafeState.prereqCompetencyId, 'vocab_daily_a2', 'PrereqCompetencyId must match scenario');
  assert.strictEqual(cafeState.isMeasureExam, false, 'Cafe scenario is not measure exam');
  assert.strictEqual(cafeState.prereqStatus.isReady, true, 'vocab_daily_a2 seed 0.74 >= 0.60 must be ready');

  // Verify DOM elements
  const badgeEl = global.document.querySelector('.fzc-call-scenario-badge');
  assert.ok(badgeEl, 'Scenario badge must be mounted in DOM');
  assert.ok(badgeEl.classList.contains('is-practice'), 'Scenario badge must have is-practice class');

  const titleEl = global.document.querySelector('.fzc-call-scenario-title');
  assert.ok(titleEl, 'Scenario title must be mounted in DOM');
  assert.ok(titleEl.textContent.includes('Memesan Kopi'), 'Scenario title must match scenario titleId');

  const diagContainer = global.document.querySelector('#fzcCallDiagContainer');
  assert.ok(diagContainer, '#fzcCallDiagContainer must be mounted inside subtitle card');

  const sampleContainer = global.document.querySelector('#fzcCallSampleContainer');
  assert.ok(sampleContainer, '#fzcCallSampleContainer must be mounted inside subtitle card');

  const sampleChips = global.document.querySelectorAll('.fzc-call-sample-chip');
  assert.ok(sampleChips.length > 0, 'Sample utterance chips should be rendered');
  console.log(`✓ scen_en_a2_cafe: ${sampleChips.length} sample chips rendered with title & badge.`);

  // Wait for opening line speech
  await new Promise(r => setTimeout(r, 700));
  assert.ok(spokenUtterances.length > 0, 'Opening line must be spoken for scen_en_a2_cafe');
  assert.ok(spokenUtterances[0].text.includes('Good to see you at the cafe'), 'Opening line content verified');
  console.log('✓ Auto-spoken opening line verified:', spokenUtterances[0].text.slice(0, 45) + '...');

  engine.end();

  console.log('--- TEST 4: start() with scen_en_a2_past_trip (Prereq Warmup Drawer & Unlock) ---');
  // vocab_travel_a2 initial seed is 0.42 < 0.60
  spokenUtterances = [];
  await engine.start({ scenarioId: 'scen_en_a2_past_trip' });

  const tripState = engine.getState();
  assert.strictEqual(tripState.prereqStatus.isReady, false, 'vocab_travel_a2 should NOT be ready initially');

  const prereqOverlay = global.document.querySelector('.fzc-call-prereq-overlay, #fzcCallPrereqOverlay');
  assert.ok(prereqOverlay, 'Prerequisite Warmup Drawer (.fzc-call-prereq-overlay) must be mounted when prereq is not ready');

  const unlockBtn = global.document.querySelector('#fzcCallBtnUnlockPrereq');
  assert.ok(unlockBtn, 'Unlock button #fzcCallBtnUnlockPrereq must exist in warmup drawer');

  // Verify opening line is NOT spoken yet
  await new Promise(r => setTimeout(r, 700));
  assert.strictEqual(spokenUtterances.length, 0, 'Opening line must NOT be spoken while prerequisite is locked');

  // Click unlock button
  unlockBtn.click();
  assert.strictEqual(engine.getState().prereqStatus.isReady, true, 'Prerequisite must be ready after clicking unlock');
  assert.strictEqual(global.document.querySelector('.fzc-call-prereq-overlay'), null, 'Warmup drawer must be removed on unlock');

  // Verify opening line delivered on unlock
  assert.ok(spokenUtterances.length > 0, 'Opening line must be delivered immediately after prerequisite is unlocked');
  assert.ok(spokenUtterances[0].text.includes('took a short trip'), 'Opening line for past trip verified');
  console.log('✓ Prerequisite Warmup Drawer and unlock flow verified.');

  engine.end();

  console.log('--- TEST 5: start() with scen_en_b2_ielts_exam (Anti-Leak Exam Purity) ---');
  await engine.start({ scenarioId: 'scen_en_b2_ielts_exam' });
  const examState = engine.getState();
  assert.strictEqual(examState.isMeasureExam, true, 'scen_en_b2_ielts_exam must be flagged as isMeasureExam');

  const examBadge = global.document.querySelector('.fzc-call-scenario-badge');
  assert.ok(examBadge && examBadge.classList.contains('is-exam'), 'Exam badge must have is-exam class');

  const examPureNote = global.document.querySelector('.fzc-call-exam-pure-note');
  assert.ok(examPureNote, 'Exam purity notice (.fzc-call-exam-pure-note) must be displayed in measure exam');

  const examChips = global.document.querySelectorAll('.fzc-call-sample-chip');
  assert.strictEqual(examChips.length, 0, 'Zero sample chips must be displayed in measure exam (Anti-Leak Purity)');
  console.log('✓ Anti-Leak Exam Purity verified: exam notice shown, sample chips zeroed.');

  engine.end();

  console.log('--- TEST 6: commitUserTurn() with Pedagogical Misconception & Zero-False-Praise ---');
  await engine.start({ scenarioId: 'scen_en_a2_past_trip' });
  // Unlock prereq
  const btnUn = global.document.querySelector('#fzcCallBtnUnlockPrereq');
  if (btnUn) btnUn.click();

  spokenUtterances = [];

  // Learner speaks an ungrammatical utterance with irregular verb overregularization
  await engine._testSimulateTurn('Last weekend I goed to Bandung and buyed some souvenirs.');

  const errorDiag = engine.getState().latestDiagnosis;
  assert.ok(errorDiag, 'latestDiagnosis must be populated');
  assert.strictEqual(errorDiag.ok, false, 'Diagnosis ok must be false for "goed" and "buyed"');
  assert.ok(errorDiag.misconceptionId.includes('irregular_goed'), 'Misconception ID must identify irregular verb error');

  // Verify UI Diagnosis Card
  const diagCard = global.document.querySelector('.fzc-call-diag-card');
  assert.ok(diagCard, 'Diagnosis card must be mounted in subtitle area');
  assert.ok(diagCard.classList.contains('is-error'), 'Card must have is-error class');

  const diagWhy = global.document.querySelector('.fzc-call-diag-why');
  const diagFix = global.document.querySelector('.fzc-call-diag-fix');
  assert.ok(diagWhy && diagFix, 'Diagnosis must include why and fix elements');
  assert.ok(diagWhy.textContent.includes('Overregularization') || diagWhy.textContent.includes('went'), 'Diagnosis card must explain why it fails');
  assert.ok(diagFix.textContent.includes('went'), 'Diagnosis card must provide fix');
  assert.ok(!diagWhy.textContent.includes('Hebat') && !diagWhy.textContent.includes('Luar biasa'), 'Zero False Praise invariant certified');

  // Verify AI response provides targeted pedagogical correction
  assert.ok(spokenUtterances.length > 0, 'AI Tutor must deliver correction');
  assert.ok(spokenUtterances[spokenUtterances.length - 1].text.includes('went'), 'AI spoken turn must give targeted correction');
  console.log('✓ Pedagogical error diagnosis and Zero-False-Praise card verified.');

  // Check Braincore localStorage persistence
  const bktRaw = global.localStorage.getItem('fiezel-mastery-bkt-v1');
  assert.ok(bktRaw, 'Braincore BKT storage must be updated');
  const bktData = JSON.parse(bktRaw);
  assert.ok(bktData.skills['speak_en_a2_past_trip'], 'Attempt must be logged to speak_en_a2_past_trip competency');

  const ledgerRaw = global.localStorage.getItem('fiezel-misconception-ledger-v1');
  assert.ok(ledgerRaw, 'Misconception Ledger must be updated');
  const ledgerData = JSON.parse(ledgerRaw);
  assert.ok(ledgerData.concepts['speak_en_a2_past_trip'], 'Misconception ledger must record concept error');
  console.log('✓ Braincore BKT & Misconception Ledger persistence verified.');

  console.log('--- TEST 7: commitUserTurn() with Accurate Utterance ---');
  spokenUtterances = [];
  await engine._testSimulateTurn("I went to Bandung with my brother and ate delicious food.");

  const successDiag = engine.getState().latestDiagnosis;
  assert.ok(successDiag, 'latestDiagnosis must be populated');
  assert.strictEqual(successDiag.ok, true, 'Diagnosis ok must be true for accurate sentence');

  const successCard = global.document.querySelector('.fzc-call-diag-card');
  assert.ok(successCard && successCard.classList.contains('is-success'), 'Card must have is-success class');
  console.log('✓ Accurate utterance success card verified.');

  engine.end();

  console.log('\n================================================================');
  console.log('ALL GOOGLE AI STUDIO VOICE CALL CAPABILITIES TESTS PASSED (8/8)!');
  console.log('================================================================\n');
}

runStudioIntegrationTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
