#!/usr/bin/env node
/**
 * tests/braincore-neural-fsrs6-upgrade-test.js
 *
 * Comprehensive deterministic regression & empirical verification gate for:
 *  - Task 2: Unified BKT ("Satu Otak, Satu Penggaris") & brainConfigAvailable + canonical ledger forwarding
 *  - Task 3A: Free-form Neural Sentence Diagnosis -> Canonical misconception-taxonomy-v1 + non-double-counting
 *  - Task 3B: Real DSP YIN F0 Pitch/Tone/Accent Contour Analyzer -> Braincore integration
 *  - Task 4: FiezelFsrsOracle (FSRS-6 21-weight) shadow execution + FiezelStatGate comparison + kill-switches + reset
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok - ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL - ' + name + '\n    ' + (err && err.stack ? err.stack : err));
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log('ok - ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL - ' + name + '\n    ' + (err && err.stack ? err.stack : err));
  }
}

async function importTsModule(relPath) {
  return import(pathToFileURL(path.join(ROOT, relPath)).href);
}

function makeRichElement(tag, id) {
  const attrs = {};
  const clsSet = new Set();
  return {
    tagName: String(tag || 'div').toUpperCase(),
    id: id || '',
    _innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    hidden: false,
    checked: false,
    width: 300,
    height: 150,
    offsetWidth: 300,
    offsetHeight: 42,
    children: [],
    style: { setProperty() {}, removeProperty() {}, getPropertyValue() { return ''; } },
    dataset: {},
    classList: {
      add(...xs) { xs.forEach((x) => clsSet.add(x)); },
      remove(...xs) { xs.forEach((x) => clsSet.delete(x)); },
      toggle(x, f) { if (f === undefined) { clsSet.has(x) ? clsSet.delete(x) : clsSet.add(x); } else if (f) clsSet.add(x); else clsSet.delete(x); },
      contains(x) { return clsSet.has(x); },
    },
    get className() { return [...clsSet].join(' '); },
    set className(v) { clsSet.clear(); String(v || '').split(/\s+/).filter(Boolean).forEach((x) => clsSet.add(x)); },
    get innerHTML() { return this._innerHTML; },
    set innerHTML(v) { this._innerHTML = String(v == null ? '' : v); },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'id') this.id = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
    removeAttribute(k) { delete attrs[k]; },
    addEventListener() {},
    removeEventListener() {},
    appendChild(child) { this.children.push(child); return child; },
    append() {},
    removeChild() {},
    remove() {},
    closest() { return null; },
    focus() {},
    scrollIntoView() {},
    click() {
      if (typeof this.onclick === 'function') {
        this.onclick({ target: this, currentTarget: this, preventDefault() {} });
      }
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getContext() {
      return {
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillRect() {}, arc() {}, fill() {}, save() {}, restore() {}, translate() {},
        scale() {}, rotate() {}, drawImage() {},
      };
    },
  };
}

function bootHostAppSandbox(customFetch) {
  const store = Object.create(null);
  const byId = new Map();
  const getEl = (id) => {
    const key = String(id || '');
    if (!byId.has(key)) byId.set(key, makeRichElement('div', key));
    return byId.get(key);
  };
  const bodyEl = makeRichElement('body', '');
  const headEl = makeRichElement('head', '');
  const docEl = makeRichElement('html', '');
  docEl.lang = 'id';

  const document = {
    baseURI: 'http://localhost/',
    readyState: 'complete',
    body: bodyEl,
    head: headEl,
    documentElement: docEl,
    getElementById: getEl,
    querySelector: (sel) => (sel && sel.startsWith('#') ? getEl(sel.slice(1)) : makeRichElement('div', '')),
    querySelectorAll: () => [],
    createElement: (tag) => makeRichElement(tag, ''),
    createTextNode: (t) => ({ textContent: String(t || '') }),
    addEventListener() {},
    removeEventListener() {},
  };

  const localStorage = {
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; },
  };

  const resolvedFetch = customFetch || (async () => ({ ok: false, status: 404, json: async () => null }));
  const context = {
    console,
    document,
    localStorage,
    sessionStorage: {
      _m: Object.create(null),
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
      setItem(k, v) { this._m[k] = String(v); },
      removeItem(k) { delete this._m[k]; },
    },
    fetch: resolvedFetch,
    location: { href: 'http://localhost/', protocol: 'http:', hostname: 'localhost', search: '' },
    navigator: { onLine: true, vibrate() {} },
    addEventListener() {},
    removeEventListener() {},
    window: null,
    self: null,
    Date,
    Intl,
    Math,
    URL,
    URLSearchParams,
    Error,
    Promise,
    JSON,
    Map,
    Set,
    RegExp,
    Array,
    Object,
    String,
    Number,
    Boolean,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    crypto: globalThis.crypto,
    TextEncoder,
    TextDecoder,
    Blob: function () {},
    Notification: { permission: 'denied' },
    SpeechSynthesisUtterance: function () {},
    speechSynthesis: { cancel() {}, speak() {} },
    Audio: function () { return { play: async () => {}, pause() {}, currentTime: 0, addEventListener() {} }; },
    queueMicrotask: (fn) => fn(),
  };
  context.window = context;
  context.self = context;
  context.globalThis = context;
  context.window.scrollTo = () => {};
  context.window.openModal = () => {};
  context.window.closeModal = () => {};
  vm.createContext(context);

  const i18nFiles = fs.readdirSync(path.join(ROOT, 'features/i18n'))
    .filter((n) => /^copy-id-.*\.js$/.test(n))
    .sort()
    .map((n) => 'features/i18n/' + n);

  const loadOrder = [
    'version.js',
    'core-config.js',
    'features/i18n/fiezel-i18n.js',
    ...i18nFiles,
    'features/mascot/fiezel-presence-engine.js',
    'features/brain/fiezel-target-language.js',
    'features/brain/fiezel-brain-config.js',
    'features/brain/fiezel-core-brain.js',
    'features/brain/fiezel-mastery-bkt.js',
    'features/brain/fiezel-misconception-ledger.js',
    'features/brain/fiezel-self-tune.js',
    'features/brain/fiezel-fsrs-bridge.js',
    'features/brain/fiezel-stat-gate.js',
    'features/brain/fiezel-brain-manifest.js',
    'app.js',
  ];

  for (const rel of loadOrder) {
    const abs = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(abs, 'utf8'), context, { filename: rel });
  }
  return { context, store, byId };
}

/**
 * Generates realistic multi-harmonic 16 kHz PCM glottal pulse audio following an F0 Hz(t) curve.
 */
function synthesizeHarmonicContour(durationSec, f0AtProgress, opts = {}) {
  const sampleRate = opts.sampleRate || 16000;
  const amp = opts.amp != null ? opts.amp : 0.25;
  const totalSamples = Math.round(durationSec * sampleRate);
  const out = new Float32Array(totalSamples);
  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const progress = totalSamples > 1 ? i / (totalSamples - 1) : 0;
    const f0 = f0AtProgress(progress);
    const localAmp = typeof opts.ampAt === 'function' ? opts.ampAt(progress) : amp;
    if (f0 <= 0) {
      out[i] = 0;
      continue;
    }
    phase += (2 * Math.PI * f0) / sampleRate;
    out[i] = localAmp * (0.65 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase));
  }
  return out;
}

(async () => {
  console.log('--- FIEZEL BRAINCORE UNIFIED NEURAL + FSRS-6 SHADOW UPGRADE GATE ---');
  const taxonomyDoc = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'misconception-taxonomy-v1.json'), 'utf8')
  );
  const canonicalTaxKeys = Object.keys(taxonomyDoc.codes || {});
  assert.strictEqual(canonicalTaxKeys.length, 49, 'taxonomy must hold 49 canonical keys');

  // ── 1. TASK 2: Unified BKT & brainConfigAvailable & Canonical Ledger Forwarding ──
  const brainConfigMod = require(path.join(ROOT, 'features/brain/fiezel-brain-config.js'));
  const masteryBktMod = require(path.join(ROOT, 'features/brain/fiezel-mastery-bkt.js'));
  const ledgerMod = require(path.join(ROOT, 'features/brain/fiezel-misconception-ledger.js'));

  const memLsStore = Object.create(null);
  const memLs = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(memLsStore, k) ? memLsStore[k] : null; },
    setItem(k, v) { memLsStore[k] = String(v); },
    removeItem(k) { delete memLsStore[k]; },
    clear() { for (const k of Object.keys(memLsStore)) delete memLsStore[k]; },
  };
  globalThis.localStorage = memLs;
  globalThis.window = {
    location: { hostname: 'localhost', href: 'http://localhost/call.html' },
    localStorage: memLs,
    navigator: { onLine: false },
    dispatchEvent: () => true,
    parent: {
      FiezelBrainConfig: brainConfigMod,
      FiezelMasteryBKT: masteryBktMod,
      FiezelMisconceptionLedger: ledgerMod,
    },
  };
  const voiceBrain = await importTsModule('features/voice-studio/src/lib/braincore.ts');

  check('T2.1 Voice Studio BRAINCORE_PARAMS unifies dynamically to canonical 0.20/0.15/0.10/0.25/0.95/minN=5/ZPD=0.55', () => {
    const resolved = voiceBrain.resolveCanonicalBktConfig();
    assert.strictEqual(resolved.P_INIT, 0.20);
    assert.strictEqual(resolved.P_LEARN, 0.15);
    assert.strictEqual(resolved.P_SLIP, 0.10);
    assert.strictEqual(resolved.P_GUESS, 0.25);
    assert.strictEqual(resolved.MASTERY_T, 0.95);
    assert.strictEqual(resolved.MIN_CORRECT_FOR_MASTERY, 5);
    assert.strictEqual(resolved.DEVELOPING_T, 0.55);

    // Must NOT mark mastered after only 3 attempts even with high accuracy
    let st = voiceBrain.loadBraincoreState();
    for (let i = 0; i < 3; i++) {
      const r = voiceBrain.recordSpeakingAttempt(st, {
        competencyId: 'unified_bkt_comp',
        scenarioId: 'sc_1',
        targetLang: 'en',
        userExactTranscript: 'I worked yesterday.',
        ok: true,
        accuracyScore: 95,
        grammarScore: 95,
        fluencyScore: 95,
        vocabUsageScore: 95,
      });
      st = r.nextState;
    }
    const comp3 = st.competencies.unified_bkt_comp;
    assert.strictEqual(comp3.attempts, 3);
    assert.notStrictEqual(comp3.state, 'MASTERED', '3 attempts must NEVER premature-unlock MASTERED under minN=5');

    for (let i = 0; i < 4; i++) {
      const r = voiceBrain.recordSpeakingAttempt(st, {
        competencyId: 'unified_bkt_comp',
        scenarioId: 'sc_1',
        targetLang: 'en',
        userExactTranscript: 'She walked home yesterday.',
        ok: true,
        accuracyScore: 98,
        grammarScore: 98,
        fluencyScore: 98,
        vocabUsageScore: 98,
      });
      st = r.nextState;
    }
    const comp7 = st.competencies.unified_bkt_comp;
    assert.ok(comp7.pMastery >= 0.95, 'expected pMastery >= 0.95, got ' + comp7.pMastery);
    assert.strictEqual(comp7.state, 'MASTERED');
  });

  check('T2.2 Interactive Chat fiezel-voice-pedagogy.js matches canonical BKT and full 49-code taxonomy', () => {
    const vp = require(path.join(ROOT, 'features/interactive-chat/fiezel-voice-pedagogy.js'));
    assert.strictEqual(vp.BRAINCORE_PARAMS.P_INIT, 0.20);
    assert.strictEqual(vp.BRAINCORE_PARAMS.P_LEARN, 0.15);
    assert.strictEqual(vp.BRAINCORE_PARAMS.P_SLIP, 0.10);
    assert.strictEqual(vp.BRAINCORE_PARAMS.P_GUESS, 0.25);
    assert.strictEqual(vp.BRAINCORE_PARAMS.MASTERY_T, 0.95);
    assert.strictEqual(vp.BRAINCORE_PARAMS.MIN_CORRECT_FOR_MASTERY, 5);
    assert.strictEqual(vp.BRAINCORE_PARAMS.DEVELOPING_T, 0.55);
    assert.ok(Array.isArray(vp.CANONICAL_TAXONOMY_CODES));
    for (const k of canonicalTaxKeys) {
      assert.ok(vp.CANONICAL_TAXONOMY_CODES.includes(k), 'missing taxonomy key in pedagogy module: ' + k);
    }
  });

  check('T2.3 Host app.js brainConfigAvailable() === true & misconceptionLedgerRecord forwards canonical code', () => {
    const { context } = bootHostAppSandbox();
    assert.strictEqual(context.window.__fiezelAudit.brainConfigAvailable(), true);
    assert.strictEqual(context.window.__fiezelAudit.misconceptionLedgerRead(), null);
    context.window.misconceptionLedgerRecord(
      { startedAt: '2026-10-01T08:00:00Z' },
      { skill: 'past_tense_probe', lessonSkill: 'past_tense_probe', concept: 'past_tense_probe', target: 'went' },
      { misconception: 'tense_mismatch', canonical: 'tense_aspect.timeline_mismatch', timing: 'wrong' },
      false
    );
    const afterLedger = context.window.__fiezelAudit.misconceptionLedgerRead();
    assert.ok(afterLedger && typeof afterLedger === 'object', 'ledger must be written to localStorage');
    const entries = Object.values((afterLedger && afterLedger.entries) || {});
    assert.ok(entries.length >= 1, 'ledger entry must be persisted via FiezelMisconceptionLedger');
    assert.strictEqual(entries[0].canonical, 'tense_aspect.timeline_mismatch');
  });

  // ── 2. TASK 3A: Free-Form Neural Diagnosis + Non-Double-Counting Reconciliation ──
  await checkAsync('T3A.1 Workers AI conversation_correct parses valid 49 canonical taxonomy codes and strips invalid ones', async () => {
    const AiTasks = require(path.join(ROOT, 'workers/api/ai/ai-tasks.js'));
    const convInput = {
      course: 'en',
      level: 'B1',
      message: 'Yesterday I go to the office and buy coffee.',
      history: [],
    };
    const promptText = JSON.stringify(AiTasks.buildPrompt('conversation_correct', convInput, 'id'));
    assert.ok(promptText.includes('CODE:'), 'prompt must instruct CODE output');
    assert.ok(promptText.includes('tense_aspect.timeline_mismatch'), 'prompt must list canonical taxonomy codes');

    const shapedValid = AiTasks.shapeOutput(
      'conversation_correct',
      [
        'REPLY: Sounds like a busy morning!',
        'MEANING: Kedengarannya pagimu sibuk sekali!',
        'FIX: Yesterday I went to the office and bought coffee.',
        'WHY: Untuk kejadian kemarin (Yesterday), gunakan verb lampau went dan bought.',
        'CODE: tense_aspect.timeline_mismatch',
      ].join('\n'),
      { input: convInput, locale: 'id', model: AiTasks.MODELS.reasoning }
    );
    assert.ok(shapedValid.turn && shapedValid.turn.correction, 'expected turn.correction');
    assert.strictEqual(shapedValid.turn.correction.canonicalCode, 'tense_aspect.timeline_mismatch');
    assert.strictEqual(shapedValid.turn.canonicalCode, 'tense_aspect.timeline_mismatch');
    assert.ok(!shapedValid.turn.reply.includes('CODE:'), 'reply displayed to learner must strip structured tags');

    const shapedHallucinated = AiTasks.shapeOutput(
      'conversation_correct',
      [
        'REPLY: Got it!',
        'MEANING: Mengerti!',
        'FIX: He works at the cafe daily.',
        'WHY: Kata kerja tunggal pihak ketiga memerlukan akhiran s pada kalimat pernyataan ini.',
        'CODE: completely.fake_nonexistent_code',
      ].join('\n'),
      {
        input: { course: 'en', level: 'B1', message: 'He work at the cafe daily.', history: [] },
        locale: 'id',
        model: AiTasks.MODELS.reasoning,
      }
    );
    assert.notStrictEqual(shapedHallucinated.turn.correction.canonicalCode, 'completely.fake_nonexistent_code', 'must reject non-canonical code');
    assert.strictEqual(shapedHallucinated.turn.correction.canonicalCode, 'agreement.number_mismatch', 'should fall back deterministically to closed canonical taxonomy');

    const shapedNeutral = AiTasks.shapeOutput(
      'conversation_correct',
      [
        'REPLY: I understand your idea!',
        'MEANING: Saya mengerti idemu!',
        'FIX: Please write the complete detail clearly for readers today.',
        'WHY: Susunan ungkapan akan terdengar lebih jelas untuk pembaca.',
        'CODE: completely.fake_nonexistent_code',
      ].join('\n'),
      {
        input: { course: 'en', level: 'B1', message: 'Please write clear detail for reader today.', history: [] },
        locale: 'id',
        model: AiTasks.MODELS.reasoning,
      }
    );
    assert.strictEqual(
      canonicalTaxKeys.includes(shapedNeutral.turn.correction.canonicalCode),
      true,
      'hallucinated CODE must always normalize to a closed canonical taxonomy code'
    );
    assert.strictEqual(shapedNeutral.turn.correction.canonicalCode, 'lexical.form_confusion');

    const shapedCleanTurn = AiTasks.shapeOutput(
      'conversation_correct',
      [
        'REPLY: Your sentence is natural!',
        'MEANING: Kalimatmu sudah alami!',
        'FIX: NONE',
        'WHY: NONE',
        'CODE: NONE',
      ].join('\n'),
      {
        input: { course: 'en', level: 'B1', message: 'I enjoyed walking in the park.', history: [] },
        locale: 'id',
        model: AiTasks.MODELS.reasoning,
      }
    );
    assert.strictEqual(shapedCleanTurn.turn.correction, null);
    assert.strictEqual(shapedCleanTurn.turn.canonicalCode, null);
  });

  check('T3A.2 Worker route-voice-live.js partner-turn includes closed 49-code taxonomy set', () => {
    const liveSrc = fs.readFileSync(path.join(ROOT, 'workers/api/voice/route-voice-live.js'), 'utf8');
    assert.ok(liveSrc.includes('CANONICAL_TAXONOMY_SET'), 'must define closed taxonomy set');
    for (const k of canonicalTaxKeys) {
      assert.ok(liveSrc.includes(`'${k}'`), 'route-voice-live.js missing canonical code: ' + k);
    }
    assert.ok(liveSrc.includes('diagnosis:'), 'partner-turn payload must expose diagnosis field');
  });

  check('T3A.3 braincore.ts reconcileNeuralDiagnosis adjusts BKT downward without double-counting and matches ChronicGrammarWeakness schema', () => {
    let st = voiceBrain.loadBraincoreState();
    const initial = voiceBrain.recordSpeakingAttempt(st, {
      competencyId: 'past_narrative',
      scenarioId: 'sc_freeform',
      targetLang: 'en',
      userExactTranscript: 'Yesterday I go to Jakarta with my friend.',
      ok: true,
      accuracyScore: 85,
      grammarScore: 85,
      fluencyScore: 85,
      vocabUsageScore: 85,
    });
    st = initial.nextState;
    assert.strictEqual(st.competencies.past_narrative.attempts, 1);

    const rec = voiceBrain.reconcileNeuralDiagnosis(st, {
      competencyId: 'past_narrative',
      scenarioId: 'sc_freeform',
      targetLang: 'en',
      userExactTranscript: 'Yesterday I go to Jakarta with my friend.',
      priorBktBefore: initial.bktBefore,
      neuralOk: false,
      misconceptionCode: 'tense_aspect.present_vs_past',
      whyFailsId: 'Pemakaian kata kerja dasar "go" pada konteks lampau "Yesterday".',
      correctionPattern: 'Yesterday I went to Jakarta with my friend.',
    });
    assert.strictEqual(rec.nextState.competencies.past_narrative.attempts, 1, 'reconciliation must NOT double-count attempts');
    assert.ok(rec.bktAfter < initial.bktAfter, 'neural failure must lower posterior vs false ok=true');

    const ledgerKey = 'past_narrative::tense_aspect.present_vs_past';
    const chronic = rec.nextState.dualBrainMemory.userBrain.chronicWeaknesses[ledgerKey];
    assert.ok(chronic, 'chronicWeaknesses entry must exist');
    assert.strictEqual(chronic.misconceptionId, 'tense_aspect.present_vs_past');
    assert.strictEqual(chronic.hits, 1);
    assert.strictEqual(chronic.active, true);
    assert.strictEqual(chronic.targetFixPattern, 'Yesterday I went to Jakarta with my friend.');
    assert.strictEqual(chronic.lastBrokenUtterance, 'Yesterday I go to Jakarta with my friend.');
  });

  // ── 3. TASK 3B: Real DSP Acoustic YIN Pitch/Tone/Accent Contour Analyzer ──
  const acousticMod = await importTsModule('features/voice-studio/src/lib/acousticProsodyAnalyzer.ts');

  check('T3B.1 YIN F0 estimator accurately tracks 140Hz, 220Hz, 310Hz harmonic glottal waveforms', () => {
    for (const freq of [140, 220, 310]) {
      const buf = synthesizeHarmonicContour(0.04, () => freq);
      const frame = buf.slice(0, 512);
      const res = acousticMod.estimateFramePitchYIN(frame, 16000);
      assert.strictEqual(res.voiced, true, `expected voiced frame at ${freq}Hz`);
      assert.ok(Math.abs(res.f0Hz - freq) <= 6, `F0 error too high at ${freq}Hz: got ${res.f0Hz}`);
    }
  });

  check('T3B.2 Mandarin 4 tones + 3+3 sandhi recognition & tone mismatch penalizes BKT + ledger', () => {
    const sandhiTones = acousticMod.extractExpectedMandarinTones('你好', 'nǐ hǎo');
    assert.deepStrictEqual(sandhiTones, [2, 3], 'Tone 3+3 sandhi must map nǐ hǎo -> [2, 3]');

    // Mismatch case: learner speaks flat Tone 1 (240 Hz) when Tone 4 falling ('mà') is expected
    const flatBuf = synthesizeHarmonicContour(0.7, () => 240);
    const tracker = acousticMod.createAcousticProsodyTracker(16000);
    tracker.pushSamples(flatBuf);
    const wrongToneAnalysis = tracker.analyzeTurn({
      targetLang: 'zh',
      expectedText: '骂 (mà)',
      transcript: '骂',
    });
    assert.strictEqual(wrongToneAnalysis.hasSufficientAudio, true);
    assert.ok((wrongToneAnalysis.toneAccuracy ?? 1) < 0.65, 'flat Tone 1 must fail expected falling Tone 4');
    assert.strictEqual(wrongToneAnalysis.acousticMisconceptionId, 'pronunciation.mandarin_tone_mismatch');
    assert.strictEqual(wrongToneAnalysis.canonicalTaxonomyCode, 'lexical.form_confusion');

    // Feed right into Braincore even when surface text matched (ok: true -> overridden/penalized)
    let st = voiceBrain.loadBraincoreState();
    const first = voiceBrain.recordSpeakingAttempt(st, {
      competencyId: 'zh_tones',
      scenarioId: 'sc_zh_tone',
      targetLang: 'zh',
      userExactTranscript: '骂',
      ok: false,
      misconceptionId: wrongToneAnalysis.acousticMisconceptionId,
      canonicalCode: wrongToneAnalysis.canonicalTaxonomyCode,
      acousticMetrics: wrongToneAnalysis,
    });
    assert.ok(first.nextState.misconceptionLedger['zh_tones::pronunciation.mandarin_tone_mismatch'], 'tone mismatch must enter ledger');

    // Positive Tone 4 case: crisp high-to-low fall 295 Hz -> 145 Hz
    const fallBuf = synthesizeHarmonicContour(0.7, (p) => 295 - 150 * p);
    const trackerOk = acousticMod.createAcousticProsodyTracker(16000);
    trackerOk.pushSamples(fallBuf);
    const okToneAnalysis = trackerOk.analyzeTurn({
      targetLang: 'zh',
      expectedText: '骂 (mà)',
      transcript: '骂',
    });
    assert.ok((okToneAnalysis.toneAccuracy ?? 0) >= 0.70, 'falling Tone 4 contour should score >= 0.70, got ' + okToneAnalysis.toneAccuracy);
    assert.strictEqual(okToneAnalysis.acousticMisconceptionId, null);
  });

  check('T3B.3 Japanese Atamadaka H->L vs inverted L->H & English monotone prosody detection', () => {
    const atamaFailBuf = synthesizeHarmonicContour(0.65, (p) => 150 + 110 * p); // inverted rising L->H
    const jaTracker = acousticMod.createAcousticProsodyTracker(16000);
    jaTracker.pushSamples(atamaFailBuf);
    const jaRes = jaTracker.analyzeTurn({
      targetLang: 'ja',
      expectedAccentPattern: 'atamadaka',
      transcript: 'ねこ',
    });
    assert.strictEqual(jaRes.acousticMisconceptionId, 'pronunciation.japanese_pitch_accent_mismatch');

    const enFlatBuf = synthesizeHarmonicContour(0.7, () => 160, { amp: 0.25 });
    const enTracker = acousticMod.createAcousticProsodyTracker(16000);
    enTracker.pushSamples(enFlatBuf);
    const enRes = enTracker.analyzeTurn({
      targetLang: 'en',
      transcript: 'Important technology is evolving everywhere today.',
    });
    assert.strictEqual(enRes.acousticMisconceptionId, 'pronunciation.english_prosody_drop');
  });

  // ── 4. TASK 4: FiezelFsrsOracle (FSRS-6 21-Weight) Shadow + FiezelStatGate + Kill-Switches ──
  await checkAsync('T4.1 FSRS-6 21-weight shadow records paired predictions alongside legacy FSRS-lite & evaluates with FiezelStatGate', async () => {
    const { context, store } = bootHostAppSandbox();
    assert.strictEqual(context.FiezelBrainManifest.authorityMap.fsrsOracle, 'shadow');
    assert.strictEqual(context.FiezelBrainManifest.authorityMap.statGate, 'shadow');

    const audit = context.window.__fiezelAudit;
    assert.strictEqual(audit.fsrsShadowAllowed().allowed, true);

    const baseTime = Date.UTC(2026, 9, 1, 8, 0, 0);
    const dayMs = 86400000;

    // Seed initial + 30 cross-day repeat observations across 6 vocab items
    for (let i = 0; i < 6; i++) {
      const key = `shadow_word_${i}`;
      context.window.updateMastery('vocab', key, true, 3200, 3, baseTime);
    }

    // Check legacy primary behavior: scheduleNext still writes FSRS-lite b.stabilityDays and b.nextReview
    const stateObj = context.window.__getFiezelState();
    assert.ok(stateObj.vocab.shadow_word_0.stabilityDays > 0, 'legacy FSRS-lite stabilityDays remains authoritative');
    assert.ok(stateObj.vocab.shadow_word_0.fsrs6 && stateObj.vocab.shadow_word_0.fsrs6.stability > 0, 'shadow fsrs6 state attached alongside legacy');

    for (let round = 1; round <= 5; round++) {
      for (let i = 0; i < 6; i++) {
        const key = `shadow_word_${i}`;
        const ts = baseTime + (round * 2 + i * 0.2) * dayMs;
        const ok = (round + i) % 4 !== 0; // realistic mix of recall & forgetting
        context.window.updateMastery('vocab', key, ok, ok ? 3800 : 14500, ok ? 3 : 1, ts);
      }
    }

    const shadowRowsBeforeDup = audit.fsrsShadowRead();
    assert.strictEqual(shadowRowsBeforeDup.length, 30, '6 items x 5 repeat reviews = 30 paired shadow rows');

    // Idempotency check: calling scheduleNext again for exact same item+timestamp must NOT duplicate row
    const bSample = stateObj.vocab.shadow_word_0;
    const sameTs = baseTime + (5 * 2) * dayMs;
    audit.scheduleNext(bSample, true, 3800, 3, {
      now: sameTs,
      bucket: 'vocab',
      itemKey: 'shadow_word_0',
    });
    assert.strictEqual(audit.fsrsShadowRead().length, 30, 'idempotent scheduleNext must not double-record shadow sample');

    const cmp = audit.fsrsShadowCompareSnapshot();
    assert.strictEqual(cmp.schema, 'fiezel-fsrs6-shadow-compare-v1');
    assert.strictEqual(cmp.mode, 'shadow');
    assert.strictEqual(cmp.n, 30);
    assert.strictEqual(cmp.crossDayN, 30);
    assert.ok(cmp.statGateAvailable, 'FiezelStatGate must be available');
    assert.ok(!cmp.bootstrapLogLoss.insufficient && cmp.bootstrapLogLoss.iters >= 1000, 'pairedBootstrap LogLoss must compute');
    assert.ok(!cmp.bootstrapBrier.insufficient && Number.isFinite(cmp.bootstrapBrier.meanDiff), 'pairedBootstrap Brier must compute');
    assert.ok(cmp.proportionTest && Number.isFinite(cmp.proportionTest.pValue), 'twoProportionTest must compute');
    assert.ok(['hold', 'promote', 'reject'].includes(cmp.verdict.decision), 'StatGate verdict must return valid decision');

    // Kill-switch #1: selfTune halt:true stops FSRS-6 shadow immediately
    store[audit.SELF_TUNE_KEY] = JSON.stringify({ halt: true });
    assert.strictEqual(audit.fsrsShadowAllowed().allowed, false);
    assert.strictEqual(audit.fsrsShadowAllowed().reason, 'self_tune_halt');
    delete store[audit.SELF_TUNE_KEY];
    assert.strictEqual(audit.fsrsShadowAllowed().allowed, true);

    // Kill-switch #2: Remote GET /api/config coach=false kills FSRS-6 shadow immediately
    const { context: killedCtx } = bootHostAppSandbox(async (url) => {
      if (String(url).includes('/api/config')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            protocol: '1.7',
            flags: { cfApiEnabled: true, cfAiEnabled: true, cfTtsEnabled: true, cfQuotaEnabled: true, cfAnalyticsEnabled: true, cfIdentityEnabled: true },
            enabled: { ai: true, tts: true, coach: false, analytics: true },
            ttlSeconds: 60,
          }),
        };
      }
      return { ok: false, status: 404, json: async () => null };
    });
    await killedCtx.FiezelCfKillSwitch.refresh();
    const remoteGate = killedCtx.window.__fiezelAudit.fsrsShadowAllowed();
    assert.strictEqual(remoteGate.allowed, false, 'GET /api/config coach:false must halt FSRS-6 shadow');
    assert.strictEqual(remoteGate.reason, 'server_coach_killed');
  });

  check('T4.2 resetProgress() wipes FSRS6_SHADOW_KEY completely from localStorage', () => {
    const { context, store, byId } = bootHostAppSandbox();
    const audit = context.window.__fiezelAudit;
    const baseTime = Date.UTC(2026, 9, 1, 8, 0, 0);
    context.window.updateMastery('vocab', 'reset_item', true, 3000, 3, baseTime);
    context.window.updateMastery('vocab', 'reset_item', true, 3000, 3, baseTime + 86400000 * 2);
    assert.strictEqual(audit.fsrsShadowRead().length, 1);
    assert.ok(Object.prototype.hasOwnProperty.call(store, audit.FSRS6_SHADOW_KEY));

    context.window.resetProgress();
    byId.get('modalOk').click();
    assert.strictEqual(audit.fsrsShadowRead().length, 0);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(store, audit.FSRS6_SHADOW_KEY), false);
  });

  console.log(`\nFIEZEL Braincore Neural + FSRS-6 Upgrade: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('BraincoreNeuralFsrs6Upgrade: PASS');
})();
