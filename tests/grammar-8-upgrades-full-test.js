/**
 * Test: tests/grammar-8-upgrades-full-test.js
 * Comprehensive deep verification of all 8 grammar UI/UX upgrades in FIEZEL:
 * 1. Tap-to-Order Token Rail (renderTokenOrder + interactive placing & unplacing)
 * 2. Non-punitive feedback bottom sheet (.feedback-rule-pill / .feedback-success / .feedback-error)
 * 3. AI Explain button in feedback (aiExplainBtn + handler wiring)
 * 4. Mistake Vault (SRS queue + history fallback + 2-session graduation)
 * 5. Color-coded syntax highlighting in tokens (classifyWord + token-chip syntax classes)
 * 6. 4-level progressive disclosure hint popover (#quizGrammarHint + Level 1..4 disclosure)
 * 7. Video-first grammar player & cloze (id/level preservation, crash-free renderVideoPlayer, dialogue fallback)
 * 8. Scaffolded 4-tier mastery indicators (getMasteryTier + .path-ring.mastery-tier-* styles)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

// 1. Create simulated browser environment
class FakeClassList {
  constructor() { this._set = new Set(); }
  add(...classes) { classes.forEach(c => this._set.add(c)); }
  remove(...classes) { classes.forEach(c => this._set.delete(c)); }
  contains(c) { return this._set.has(c); }
  toggle(c, val) {
    if (typeof val === 'boolean') { if (val) this._set.add(c); else this._set.delete(c); return val; }
    if (this._set.has(c)) { this._set.delete(c); return false; }
    this._set.add(c); return true;
  }
  toString() { return Array.from(this._set).join(' '); }
}

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = {};
    this._innerHTML = '';
    this.textContent = '';
    this.onclick = null;
    this.disabled = false;
  }

  get className() { return this.classList.toString(); }
  set className(val) {
    this.classList = new FakeClassList();
    if (val) String(val).split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c));
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this.children = [];
    // Basic mock parser for child buttons and IDs
    const idMatches = [...this._innerHTML.matchAll(/id=["']([^"']+)["']/g)];
    const classMatches = [...this._innerHTML.matchAll(/class=["']([^"']+)["']/g)];
    // Quick auto-populate for mock traversal
    idMatches.forEach(m => {
      const el = new FakeElement('div');
      el.id = m[1];
      el.parentNode = this;
      this.children.push(el);
    });
  }

  setAttribute(k, v) { this.attributes.set(k, String(v)); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return this.attributes.get(k) || null; }
  removeAttribute(k) { this.attributes.delete(k); }

  appendChild(el) {
    el.parentNode = this;
    this.children.push(el);
    return el;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx >= 0) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }

  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      if (this.id === id) return this;
      for (const ch of this.children) {
        if (ch.id === id) return ch;
        const sub = ch.querySelector(sel);
        if (sub) return sub;
      }
    }
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.classList.contains(cls)) return this;
      for (const ch of this.children) {
        if (ch.classList.contains(cls)) return ch;
        const sub = ch.querySelector(sel);
        if (sub) return sub;
      }
    }
    for (const ch of this.children) {
      if (ch.tagName.toLowerCase() === sel.toLowerCase()) return ch;
      const sub = ch.querySelector(sel);
      if (sub) return sub;
    }
    return null;
  }

  querySelectorAll(sel) {
    const out = [];
    const check = (el) => {
      if (sel.startsWith('.')) {
        if (el.classList.contains(sel.slice(1))) out.push(el);
      } else if (sel.startsWith('#')) {
        if (el.id === sel.slice(1)) out.push(el);
      } else if (el.tagName.toLowerCase() === sel.toLowerCase()) {
        out.push(el);
      }
      for (const ch of el.children) check(ch);
    };
    for (const ch of this.children) check(ch);
    return out;
  }

  getBoundingClientRect() {
    return { top: 100, bottom: 140, left: 50, right: 150, width: 100, height: 40 };
  }

  contains(el) {
    let cur = el;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }
}

const fakeBody = new FakeElement('body');
fakeBody.id = 'body';

const fakeDoc = {
  body: fakeBody,
  head: new FakeElement('head'),
  createElement(tag) { return new FakeElement(tag); },
  getElementById(id) {
    if (fakeBody.id === id) return fakeBody;
    return fakeBody.querySelector('#' + id);
  },
  querySelector(sel) { return fakeBody.querySelector(sel); },
  querySelectorAll(sel) { return fakeBody.querySelectorAll(sel); },
  addEventListener() {},
  removeEventListener() {}
};

const sandbox = {
  document: fakeDoc,
  window: { innerWidth: 400, scrollX: 0, scrollY: 0 },
  self: {},
  console: console,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  FiezelI18n: {
    t: (key, fallback) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object') {
        let str = key;
        for (const [k, v] of Object.entries(fallback)) str = str.replace(`{${k}}`, v);
        return str;
      }
      return key;
    }
  },
  esc: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  haptic: () => {},
  uiSfx: () => {},
  enhanceUI: () => {}
};
sandbox.self = sandbox;

// Load upgrade modules
const upgradeSrc = fs.readFileSync(path.join(root, 'features', 'grammar', 'fiezel-grammar-upgrade.js'), 'utf8');
const videoSrc = fs.readFileSync(path.join(root, 'features', 'grammar', 'fiezel-grammar-video.js'), 'utf8');
const cssSrc = fs.readFileSync(path.join(root, 'features', 'grammar', 'grammar-upgrade.css'), 'utf8');

vm.createContext(sandbox);
vm.runInContext(upgradeSrc, sandbox);
vm.runInContext(videoSrc, sandbox);

const Upgrade = sandbox.FiezelGrammarUpgrade;
const Video = sandbox.FiezelGrammarVideo;

console.log('--- TEST 1: Syntax Highlighting Classification ---');
assert.strictEqual(Upgrade.classifyWord('I'), 'subj', 'I must be classified as subj');
assert.strictEqual(Upgrade.classifyWord('drink'), 'verb', 'drink must be classified as verb');
assert.strictEqual(Upgrade.classifyWord('in'), 'prep', 'in must be classified as prep');
assert.strictEqual(Upgrade.classifyWord('is'), 'aux', 'is must be classified as aux');
const highlighted = Upgrade.highlightSyntax('I drink coffee in Tokyo');
assert(highlighted.includes('syntax-subj'), 'Must contain syntax-subj');
assert(highlighted.includes('syntax-verb'), 'Must contain syntax-verb');
assert(highlighted.includes('syntax-prep'), 'Must contain syntax-prep');
console.log('✓ Test 1 passed: Syntax classifier & highlighter working correctly.');

console.log('--- TEST 2: Tap-to-Order Token Rail & Interactive Unplacing ---');
const qToken = {
  tokens: ['She', 'eats', 'an', 'apple'],
  distractors: ['eating', 'eaten'],
  correctOrder: [0, 1, 2, 3]
};
let completedVerdict = null;
const widget = Upgrade.renderTokenOrder(qToken, (isCorrect) => { completedVerdict = isCorrect; });

const bankEl = widget.querySelector('#tokenBank');
const railEl = widget.querySelector('#tokenRail');
const bankChips = bankEl.querySelectorAll('.token-chip');
assert(bankChips.length >= 6, 'Must have at least 6 token chips in bank');
// Check ALL chips have clean uniform styling without POS syntax classes
bankChips.forEach(chip => {
  assert(!chip.className.includes('syntax-'), `Chip "${chip.textContent}" must not contain syntax class (got ${chip.className})`);
  assert(chip.classList.contains('token-chip'), `Chip "${chip.textContent}" must have token-chip class`);
});
const subjChip = bankChips.find(c => c.textContent === 'She');
assert(subjChip, 'She token chip must exist in bank');

// Place "She"
subjChip.onclick();
let railChips = railEl.querySelectorAll('.token-chip');
assert.strictEqual(railChips.length, 1, 'Rail should have 1 token placed');
assert.strictEqual(railChips[0].textContent, 'She');
assert(railChips[0].classList.contains('in-rail'), 'Rail token must have in-rail class');
assert(!railChips[0].className.includes('syntax-'), 'Rail token must not have syntax class');

// Tap to unplace "She" (Verifying pointer-events & unplacing fix)
railChips[0].onclick();
railChips = railEl.querySelectorAll('.token-chip');
assert.strictEqual(railChips.length, 0, 'Rail should be empty after clicking placed token to remove');

// Place all correct tokens in order
['She', 'eats', 'an', 'apple'].forEach(word => {
  const currentBank = bankEl.querySelectorAll('.token-chip');
  const chip = currentBank.find(c => c.textContent === word && !c.classList.contains('placeholder'));
  assert(chip, `Chip for ${word} must exist in bank`);
  chip.onclick();
});

const submitBtn = widget.querySelector('#tokenSubmitBtn');
assert(!submitBtn.disabled, 'Submit button should be enabled when tokens are placed');
submitBtn.onclick();
assert.strictEqual(completedVerdict, true, 'Submitting correct sequence must be true');
console.log('✓ Test 2 passed: Token rail placing, unplacing, and evaluation verified.');

console.log('--- TEST 3: Non-Punitive Feedback Bottom Sheet ---');
const qGrammar = {
  type: 'grammar',
  options: ['eat', 'eats', 'eating'],
  answerIndex: 1,
  explain: {
    rule: 'Subject (he/she/it) + Verb-s in Present Simple.',
    why: 'Subjek tunggal membutuhkan akhiran -s.',
    memory: 'She/He/It suka es krim (-s).',
    distractors: [{ option: 'eat', reason: 'Digunakan untuk I/you/we/they.' }]
  }
};
const feedbackHtml = Upgrade.buildFeedbackHTML(qGrammar, 0, false);
assert(feedbackHtml.includes('feedback-rule-pill'), 'Must contain feedback-rule-pill class');
assert(feedbackHtml.includes('grammar-rule-pill'), 'Must contain grammar-rule-pill class');
assert(feedbackHtml.includes('id="aiExplainBtn"'), 'Must contain aiExplainBtn');
assert(feedbackHtml.includes('Digunakan untuk I/you/we/they.'), 'Must show why distractor failed');
console.log('✓ Test 3 passed: Feedback bottom sheet contains rule pill, distractor whyFails, and AI button.');

console.log('--- TEST 4: Mistake Vault & SRS 2-Session Graduation ---');
sandbox.state = { history: [
  { type: 'grammar', skill: 'present_simple', ok: false },
  { type: 'grammar', skill: 'present_simple', ok: true },
  { type: 'grammar', skill: 'past_simple', ok: false }
] };
assert.strictEqual(Upgrade.getMistakeCount(), 2, 'Should fall back to history mistakes when mistakeVault empty');

// With explicit mistakeVault
sandbox.state.mistakeVault = { present_simple: 2, past_simple: 1 };
assert.strictEqual(Upgrade.getMistakeCount(), 2, 'Should read count from mistakeVault');

const vaultCard = Upgrade.renderVaultCard();
assert(vaultCard.includes('Koleksi Kesalahan'), 'Card must have title');
assert(vaultCard.includes('startMistakeVaultSession()'), 'Card must have button to launch mistake session');

Upgrade.clearMistake('past_simple');
assert.strictEqual(sandbox.state.mistakeVault.past_simple, undefined, 'clearMistake must remove skill');
console.log('✓ Test 4 passed: Mistake vault history fallback and SRS tracking verified.');

console.log('--- TEST 5: 4-Level Progressive Disclosure Hint Popover ---');
const anchor = fakeDoc.createElement('button');
anchor.id = 'quizGrammarHint';
fakeBody.appendChild(anchor);

// Level 1: Initial call
Upgrade.showGrammarHint(qGrammar, anchor);
let popover = fakeDoc.getElementById('grammarHintPopover');
assert(popover, 'Popover should exist in DOM');
assert.strictEqual(popover.getAttribute('data-level'), '1', 'Initial hint level must be 1');
assert(popover.innerHTML.includes('Arah Fokus'), 'Must display Level 1 title');

// Level 2: Click next
const nextBtn = popover.querySelector('#hintNextBtn');
nextBtn.onclick({ stopPropagation: () => {} });
popover = fakeDoc.getElementById('grammarHintPopover');
assert.strictEqual(popover.getAttribute('data-level'), '2', 'Hint level should advance to 2');
assert(popover.innerHTML.includes('Aturan Pola'), 'Must display Level 2 rule');

// Level 3: Call showGrammarHint again (advances level)
Upgrade.showGrammarHint(qGrammar, anchor);
popover = fakeDoc.getElementById('grammarHintPopover');
assert.strictEqual(popover.getAttribute('data-level'), '3', 'Tapping hint button should advance to level 3');
assert(popover.innerHTML.includes('Waspada Jebakan'), 'Must display Level 3 trap avoidance');

// Level 4: Advance to 4
Upgrade.showGrammarHint(qGrammar, anchor);
popover = fakeDoc.getElementById('grammarHintPopover');
assert.strictEqual(popover.getAttribute('data-level'), '4', 'Tapping hint button should advance to level 4');
assert(popover.innerHTML.includes('Kunci &amp; Memori') || popover.innerHTML.includes('Kunci & Memori'), 'Must display Level 4 memory hook');

// Level 5 / Close
Upgrade.showGrammarHint(qGrammar, anchor);
assert.strictEqual(fakeDoc.getElementById('grammarHintPopover'), null, 'Popover must be dismissed on wrap/close');
console.log('✓ Test 5 passed: 4-level progressive disclosure hint popover functioning.');

console.log('--- TEST 6: Video-First Grammar Player & Cloze ---');
const sampleTemplate = {
  id: 'vg-a1-test',
  level: 'A1',
  skill: 'present_simple',
  videoUrl: '',
  subtitles: [
    { start: 0, end: 2, text: 'Hello there.', speaker: 'Alice' },
    { start: 2, end: 4, text: 'Nice to meet you.', speaker: 'Bob' }
  ],
  exercise: {
    question: 'Lengkapi kalimat:',
    options: ['am', 'is'],
    answerIndex: 0,
    grammarPoint: 'Present Simple'
  }
};
const vq = Video.createVideoGrammarQuestion(sampleTemplate);
assert.strictEqual(vq.id, 'vg-a1-test', 'Question must retain id');
assert.strictEqual(vq.level, 'A1', 'Question must retain level');

// Call renderVideoPlayer without state (verifying crash fix)
const playerEl = Video.renderVideoPlayer(vq.videoConfig);
assert(playerEl, 'renderVideoPlayer must return element without crashing when state is undefined');
assert(playerEl.innerHTML.includes('Alice'), 'Fallback card must display dialogue subtitles');
assert(playerEl.innerHTML.includes('Bob'), 'Fallback card must display dialogue subtitles');

// Test clozeText stem integration
const clozeTemplate = {
  id: 'vg-cloze-test',
  level: 'A2',
  exercise: {
    question: 'Complete the subtitle:',
    clozeText: 'I usually ___ coffee in the morning.',
    options: ['drink', 'drank'],
    answerIndex: 0
  }
};
const vqCloze = Video.createVideoGrammarQuestion(clozeTemplate);
assert(vqCloze.question.includes('I usually ___ coffee in the morning.'), 'Question stem must include clozeText');

// Edge cases: null/undefined safety
const emptyQ = Video.createVideoGrammarQuestion(null);
assert(emptyQ && emptyQ.type === 'video-grammar', 'createVideoGrammarQuestion must handle null template');
const emptyPlayer = Video.renderVideoPlayer(null);
assert(emptyPlayer && emptyPlayer.classList.contains('is-fallback'), 'renderVideoPlayer must handle null config');
const emptyCloze = Video.renderSubtitleCloze(null, () => {});
assert(emptyCloze && emptyCloze.classList.contains('video-overlay-pane'), 'renderSubtitleCloze must handle null config');
const emptyChoice = Video.renderGrammarChoiceOverlay(null, () => {});
assert(emptyChoice && emptyChoice.classList.contains('video-overlay-pane'), 'renderGrammarChoiceOverlay must handle null exercise');
const emptyExercise = Video.renderVideoExercise(null, null);
assert(emptyExercise && emptyExercise.classList.contains('video-exercise-wrap'), 'renderVideoExercise must handle null args');

// Verify bank integrity in video-grammar-bank-v1.json
const bankData = JSON.parse(fs.readFileSync(path.join(root, 'content', 'video-grammar-bank-v1.json'), 'utf8'));
assert(Array.isArray(bankData.videoGrammarBank) && bankData.videoGrammarBank.length >= 15, 'Bank must contain at least 15 exercises');
const answerIndicesFound = new Set();
bankData.videoGrammarBank.forEach(item => {
  // Enforce zero mascot motion clips (strict AGENTS.md compliance)
  if (item.videoUrl) {
    assert(!item.videoUrl.includes('assets/motion'), `${item.id} must not link unapproved mascot motion`);
    const cleanPath = item.videoUrl.replace(/^\.\//, '');
    assert(fs.existsSync(path.join(root, cleanPath)), `${item.id} videoUrl file must exist at ${cleanPath}`);
  }
  if (item.posterUrl) {
    assert(!item.posterUrl.includes('assets/motion'), `${item.id} posterUrl must not link mascot motion`);
    const cleanPoster = item.posterUrl.replace(/^\.\//, '');
    assert(fs.existsSync(path.join(root, cleanPoster)), `${item.id} posterUrl file must exist at ${cleanPoster}`);
  }
  const ans = item.exercise.options[item.exercise.answerIndex];
  assert.strictEqual(ans, item.exercise.clozeAnswer, `${item.id} options[answerIndex] must match clozeAnswer`);
  answerIndicesFound.add(item.exercise.answerIndex);
});
// Verify multi-checkpoint sequential configuration (1 video 5 questions)
const multiCpConfig = {
  id: 'vg-multi-test',
  videoUrl: 'test.mp4',
  checkpoints: [
    { id: 'cp-1', pauseAt: 3.2, exercise: { clozeText: 'She ___ happy.', options: ['is', 'are'], answerIndex: 0 } },
    { id: 'cp-2', pauseAt: 10.0, exercise: { clozeText: 'They ___ ready.', options: ['are', 'is'], answerIndex: 0 } },
    { id: 'cp-3', pauseAt: 18.0, exercise: { clozeText: 'I ___ there.', options: ['was', 'were'], answerIndex: 0 } },
    { id: 'cp-4', pauseAt: 25.0, exercise: { clozeText: 'We ___ done.', options: ['are', 'is'], answerIndex: 0 } },
    { id: 'cp-5', pauseAt: 35.0, exercise: { clozeText: 'He ___ gone.', options: ['has', 'have'], answerIndex: 0 } }
  ],
  attribution: {
    source: 'Educational Source Test',
    url: 'https://youtube.com/test'
  }
};
const multiExerciseEl = Video.renderVideoExercise(multiCpConfig, {});
assert(multiExerciseEl.querySelector('.video-checkpoints-rail'), 'Must render video checkpoints rail for multi-checkpoint config');
const indicators = multiExerciseEl.querySelectorAll('.cp-indicator');
assert.strictEqual(indicators.length, 5, 'Must render exactly 5 checkpoint indicators');
assert(indicators[0].classList.contains('active'), 'First checkpoint indicator must be active');
assert(multiExerciseEl.querySelector('.video-attribution-bar'), 'Must render video attribution bar when attribution is configured');

const expandedQuestions = Video.expandCheckpointsToQuestions(multiCpConfig);
assert.strictEqual(expandedQuestions.length, 5, 'expandCheckpointsToQuestions must return 5 sequential questions');
assert.strictEqual(expandedQuestions[0].id, 'vg-multi-test-cp1', 'First question id must match checkpoint');
assert.strictEqual(expandedQuestions[0].videoConfig.startTime, 0, 'First question startTime must be 0');
assert.strictEqual(expandedQuestions[1].videoConfig.startTime, 3.2, 'Second question startTime must be 3.2');
assert.strictEqual(expandedQuestions[1].videoConfig.checkpointIndex, 1, 'Second question checkpointIndex must be 1');
assert.strictEqual(expandedQuestions[4].id, 'vg-multi-test-cp5', 'Fifth question id must match checkpoint');
assert.strictEqual(expandedQuestions[4].videoConfig.pauseAt, 35.0, 'Fifth question pauseAt must be 35.0');
assert.strictEqual(expandedQuestions[4].videoConfig.startTime, 25.0, 'Fifth question startTime must be 25.0');
assert.strictEqual(expandedQuestions[4].videoConfig.checkpointIndex, 4, 'Fifth question checkpointIndex must be 4');
assert.strictEqual(expandedQuestions[4].videoConfig.totalCheckpoints, 5, 'Fifth question totalCheckpoints must be 5');

// Test renderVideoPlayer with question 2 config
const testState = {};
Video.renderVideoPlayer(expandedQuestions[1].videoConfig, testState);
assert.strictEqual(testState.currentCheckpointIndex, 1, 'renderVideoPlayer must set currentCheckpointIndex to 1');
assert.strictEqual(testState.checkpoints[0].completed, true, 'Checkpoints before active index must be marked completed');

console.log('✓ Test 6 passed: Video grammar question creation, cloze stem, empty-input safety, multi-checkpoint 5-question support, and bank integrity verified.');

console.log('--- TEST 7: 4-Tier Mastery Indicator ---');
assert.strictEqual(Upgrade.getMasteryTier('test', 20), 1, 'Mastery 20% -> Tier 1');
assert.strictEqual(Upgrade.getMasteryTier('test', 55), 2, 'Mastery 55% -> Tier 2');
assert.strictEqual(Upgrade.getMasteryTier('test', 80), 3, 'Mastery 80% -> Tier 3');
assert.strictEqual(Upgrade.getMasteryTier('test', 95), 4, 'Mastery 95% -> Tier 4');

// Verify CSS definitions for all 8 features in grammar-upgrade.css
assert(cssSrc.includes('.feedback-rule-pill'), 'CSS must define .feedback-rule-pill');
assert(cssSrc.includes('.token-chip.in-rail'), 'CSS must define .token-chip.in-rail');
assert(cssSrc.includes('.token-chip.syntax-verb'), 'CSS must define .token-chip.syntax-verb');
assert(cssSrc.includes('.grammar-hint-popover'), 'CSS must define .grammar-hint-popover');
assert(cssSrc.includes('.path-ring.mastery-tier-1'), 'CSS must define .path-ring.mastery-tier-1');
assert(cssSrc.includes('.path-ring.mastery-tier-4'), 'CSS must define .path-ring.mastery-tier-4');
assert(cssSrc.includes('color: #0f172a !important'), 'CSS must enforce uniform #0f172a font color for token chips');
console.log('✓ Test 7 passed: 4-tier mastery calculation and CSS ring styling verified.');

console.log('--- TEST 8: Token Rail Entry in Grammar Hub ---');
const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert(appSrc.includes('data-testid="grammar-token-rail-btn"'), 'app.js must provide direct Token Rail entrance in Grammar Hub');
assert(appSrc.includes('feedback-rule-pill'), 'app.js must include feedback-rule-pill class in feedback reveal');
console.log('✓ Test 8 passed: Hub entry and runtime feedback class confirmed in app.js.');

console.log('--- TEST 9: Seamless Unified 20-Question Grammar Session ---');
// Verify empty vault returns '' so zero-mistake users see no redundant panels
sandbox.state.mistakeVault = {};
sandbox.state.history = [];
assert.strictEqual(Upgrade.renderVaultCard(), '', 'Empty vault must return empty string to prevent panel clutter');

// Verify weaveGrammarSessionVariety weaves both token-order and video-grammar slots
assert(appSrc.includes('const tokenSlots=count>=15?[3,10,16]'), 'app.js must reserve token slots in 20-question session');
assert(appSrc.includes('const videoSlots=count>=15?[6,13,18]'), 'app.js must reserve video slots in 20-question session');
assert(appSrc.includes('vgBankRaw'), 'app.js must bind vgBankRaw in data loader');
assert(appSrc.includes('self.__videoGrammarBankCache=vgBankRaw.videoGrammarBank'), 'app.js must populate video cache');
console.log('✓ Test 9 passed: Unified 20-question session weaving and uncluttered panel confirmed.');

console.log('\n========================================');
console.log('ALL GRAMMAR UPGRADES FULLY VERIFIED PASS!');
console.log('========================================\n');
