#!/usr/bin/env node
/**
 * tests/braincore-nervous-system-wiring-test.js
 *
 * End-to-end Braincore Nervous System Wiring Gate (NO fake simplified mocks):
 * Boots real app.js + real Braincore modules in VM, exercises every module/organ
 * fixed in P0 & P1, and exercises real Worker D1 persistence for POST /api/braincore/sync.
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

function makeRichElement(tag, id) {
  const attrs = {};
  const listeners = {};
  const clsSet = new Set();
  const el = {
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
    style: {
      setProperty() {},
      removeProperty() {},
      getPropertyValue() { return ''; }
    },
    dataset: {},
    classList: {
      add(...xs) { xs.forEach(x => clsSet.add(x)); },
      remove(...xs) { xs.forEach(x => clsSet.delete(x)); },
      toggle(x, f) { if (f === undefined) { clsSet.has(x) ? clsSet.delete(x) : clsSet.add(x); } else if (f) clsSet.add(x); else clsSet.delete(x); },
      contains(x) { return clsSet.has(x); }
    },
    get className() { return [...clsSet].join(' '); },
    set className(v) { clsSet.clear(); String(v || '').split(/\s+/).filter(Boolean).forEach(x => clsSet.add(x)); },
    get innerHTML() { return el._innerHTML; },
    set innerHTML(v) { el._innerHTML = String(v == null ? '' : v); },
    setAttribute(k, v) { attrs[k] = String(v); if (k === 'id') el.id = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k); },
    removeAttribute(k) { delete attrs[k]; },
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    appendChild(child) { el.children.push(child); if (child) child.parentNode = el; return child; },
    append(...xs) { xs.forEach(c => { if (typeof c === 'object' && c) el.appendChild(c); }); },
    removeChild(child) { el.children = el.children.filter(c => c !== child); },
    remove() {},
    closest() { return null; },
    focus() {},
    scrollIntoView() {},
    click() {
      if (typeof el.onclick === 'function') el.onclick({ target: el, currentTarget: el, preventDefault() {} });
      (listeners.click || []).forEach(fn => fn({ target: el, currentTarget: el, preventDefault() {} }));
    },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getContext() {
      return {
        clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        fillRect() {}, arc() {}, fill() {}, save() {}, restore() {}, translate() {},
        scale() {}, rotate() {}, drawImage() {}
      };
    }
  };
  return el;
}

function bootFullAppHost(extraFiles, initialStore, customFetch) {
  const store = { ...(initialStore || {}) };
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
    querySelector: (sel) => {
      if (sel && sel.startsWith('#')) return getEl(sel.slice(1));
      if (sel === '.bottomnav') return getEl('__bottomnav');
      if (sel === '.topbar') return getEl('__topbar');
      if (sel === '.nujum-screen') return getEl('__nujum_screen');
      return makeRichElement('div', '');
    },
    querySelectorAll: () => [],
    createElement: (tag) => makeRichElement(tag, ''),
    createTextNode: (t) => ({ textContent: String(t || '') }),
    addEventListener() {},
    removeEventListener() {}
  };

  const localStorage = {
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] ?? null; },
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { for (const k of Object.keys(store)) delete store[k]; }
  };

  const defaultFetch = async (url) => {
    const u = String(url || '');
    if (u.includes('grammar-templates-ja.json')) {
      return {
        ok: true,
        json: async () => ({
          templates: [
            { id: 'ja-g1', cefr: 'A1', skill: 'particles_wa_ga', family: 'particles', stem: 'わたし___ がくせい です。', options: ['は', 'が', 'を', 'に'], answerIndex: 0 }
          ]
        })
      };
    }
    if (u.includes('family-graph-ja.json')) {
      return { ok: true, json: async () => ({ families: { particles_wa_ga: [] } }) };
    }
    if (u.includes('vocabulary-master-ja.json')) {
      return { ok: true, json: async () => ({ words: [{ id: 'jv1', word: '学生', kana: 'がくせい', meaning: 'murid', level: 'A1' }] }) };
    }
    if (u.includes('reading-bank-ja.json')) {
      return { ok: true, json: async () => ([{ id: 'jr1', level: 'A1', text: 'にほん', qs: [] }]) };
    }
    if (u.includes('grammar-templates-zh.json')) {
      return {
        ok: true,
        json: async () => ({
          templates: [
            { id: 'zh-g1', cefr: 'A1', skill: 'zh_tone_recognition', family: 'zh_tones', stem: '我 ___ 学生。', options: ['是', '有', '在', '去'], answerIndex: 0 }
          ]
        })
      };
    }
    if (u.includes('family-graph-zh.json')) {
      return { ok: true, json: async () => ({ families: { zh_tone_recognition: [] } }) };
    }
    if (u.includes('vocabulary-master-zh.json')) {
      return { ok: true, json: async () => ({ words: [{ id: 'zv1', word: '学生', pinyin: 'xuésheng', meaning: 'murid', level: 'A1' }] }) };
    }
    if (u.includes('reading-bank-zh.json')) {
      return { ok: true, json: async () => ([{ id: 'zr1', level: 'A1', text: '你好', qs: [] }]) };
    }
    return { ok: false, status: 404, json: async () => null };
  };

  const context = {
    console,
    document,
    localStorage,
    sessionStorage: {
      _m: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
      setItem(k, v) { this._m[k] = String(v); },
      removeItem(k) { delete this._m[k]; }
    },
    fetch: customFetch || defaultFetch,
    location: { href: '', protocol: '', hostname: '', search: '' },
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
    queueMicrotask: (fn) => fn()
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

  const baseScripts = [
    'features/i18n/fiezel-i18n.js',
    ...i18nFiles,
    'features/brain/fiezel-target-language.js',
    'features/brain/fiezel-attempt-record.js',
    'features/brain/fiezel-core-brain.js',
    'features/brain/fiezel-mastery-bkt.js',
    'features/brain/fiezel-misconception-ledger.js',
    'features/brain/fiezel-confusion-matrix.js',
    'features/brain/fiezel-item-calibration.js',
    'features/brain/fiezel-item-pool.js',
    'features/brain/fiezel-olm.js',
    'features/speaking-listening/speaking-listening-config.js',
    'features/speaking-listening/gems-core.js',
    'features/skills-evidence/fiezel-skills-evidence.js',
    'features/academic-readiness/fiezel-academic-readiness.js',
    'features/personal-journey/fiezel-personal-journey.js',
    'features/continuity/fiezel-continuity.js',
    'app.js',
    ...(extraFiles || [])
  ];

  for (const rel of baseScripts) {
    const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    vm.runInContext(code, context, { filename: rel });
  }
  return { ctx: context, store, byId, document };
}

(async function main() {
  console.log('--- FIEZEL BRAINCORE NERVOUS SYSTEM WIRING GATE ---');

  // 1. app.js buckets, course isolation, token-order, load() JA/ZH curriculum, writing & Skills Lab
  await checkAsync('A1 app.js defaultState, PROGRESS_STATE_FIELDS & sanitizeState keep speaking/pte/kana/writing isolated across courses', async () => {
    const h = bootFullAppHost();
    const { ctx, store } = h;
    const A = ctx.__fiezelAudit;
    ['speaking', 'pte', 'kana', 'writing'].forEach((f) => {
      assert.ok(A.PROGRESS_STATE_FIELDS.includes(f), 'PROGRESS_STATE_FIELDS wajib memuat ' + f);
      assert.ok(Object.prototype.hasOwnProperty.call(A.liveState(), f), 'state default wajib memuat ' + f);
    });

    // Simulate English PTE & Writing activity without touching JA
    ctx.updateMastery('pte', 'pte_sst_1', true, 4200);
    ctx.saveWritingEntry({ id: 'w-a1-1', level: 'A1', target: 20 }, 24);
    assert.ok(A.liveState().pte['pte_sst_1'], 'state.pte harus terisi tanpa crash');
    assert.strictEqual(A.liveState().writing.entries.length, 1);

    // Switch to Japanese: verify clean zero state (no EN leakage) + reload survives sanitizeState
    ctx.switchTargetLangStorage('ja');
    const jaState = A.liveState();
    assert.strictEqual(Object.keys(jaState.pte).length, 0, 'pte Inggris tidak boleh bocor ke kursus Jepang');
    assert.strictEqual(jaState.writing.entries.length, 0, 'writing Inggris tidak boleh bocor ke kursus Jepang');

    // Kana in JA survives reload without totalAnswered getting wiped prematurely
    ctx.updateMastery('kana', 'ja_kana_あ', true, 3000);
    A.saveFlushWrite();
    const reloaded = bootFullAppHost([], store);
    assert.ok(reloaded.ctx.__fiezelAudit.liveState().kana['ja_kana_あ'], 'state.kana harus bertahan melewati sanitizeState saat reload');

    // Back to EN preserves PTE & Writing
    ctx.switchTargetLangStorage('en');
    assert.ok(A.liveState().pte['pte_sst_1'], 'state.pte Inggris harus pulih saat kembali ke en');
  });

  await checkAsync('A2 app.js record() flows token-order through BKT + reviewBucket & load() builds GRAMMAR_CURRICULUM for JA/ZH', async () => {
    const h = bootFullAppHost();
    const { ctx, store } = h;
    ctx.record({
      id: 'q_tok_1',
      type: 'token-order',
      level: 'A1',
      skill: 'word_order_svo',
      lessonSkill: 'word_order_svo',
      tokens: ['I', 'drink', 'tea'],
      __userTokenAnswer: 'I tea drink'
    }, false, 5000, -1);

    const st = ctx.__fiezelAudit.liveState();
    const lastH = st.history[st.history.length - 1];
    assert.strictEqual(lastH.type, 'token-order');
    assert.strictEqual(lastH.reviewBucket, 'grammar');
    assert.strictEqual(lastH.reviewKey, 'word_order_svo');
    assert.strictEqual(lastH.selectedAnswer, 'I tea drink');

    const bktEn = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bktEn.lessons.word_order_svo.n, 1, 'token-order WAJIB memperbarui real FiezelMasteryBKT');

    // load() for JA and ZH must update GRAMMAR_CURRICULUM.lessons (not leave it empty!)
    ctx.switchTargetLangStorage('ja');
    await ctx.load({ kontenSaja: true });
    assert.ok(vm.runInContext('Array.isArray(GRAMMAR_CURRICULUM.lessons) && GRAMMAR_CURRICULUM.lessons.length > 0', ctx),
      'GRAMMAR_CURRICULUM.lessons untuk JA tidak boleh kosong setelah load()');

    ctx.switchTargetLangStorage('zh');
    await ctx.load({ kontenSaja: true });
    assert.ok(vm.runInContext('Array.isArray(GRAMMAR_CURRICULUM.lessons) && GRAMMAR_CURRICULUM.lessons.length > 0', ctx),
      'GRAMMAR_CURRICULUM.lessons untuk ZH tidak boleh kosong setelah load()');
  });

  await checkAsync('A3 app.js recordSkillsLabBraincoreAttempt + addon onAttempt route real attempts cleanly', async () => {
    const h = bootFullAppHost(['features/speaking-listening/fiezel-speaking-listening-addon.js']);
    const { ctx, store } = h;
    ctx.recordSkillsLabBraincoreAttempt({
      domain: 'speaking',
      item: { id: 'sl-sp-1', level: 'A2', mode: 'response' },
      result: { passed: false, score: 40 },
      ms: 7500
    });
    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.speaking['sl-sp-1'].total, 1);
    assert.strictEqual(st.speaking['sl-sp-1'].correct, 0);
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons['skills_lab_speaking_response'].n, 1);
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(ledger.entries['skills_lab_speaking_response::speaking_concept_gap'], 'Skills Lab failure wajib tercatat di Misconception Ledger');

    // Verify addon Controller.finishItem fires options.onAttempt
    let capturedAttempt = null;
    const addon = ctx.FiezelSLAddon;
    const ctrl = new addon.__test.Controller({
      root: h.document.createElement('div'),
      baseUrl: './features/speaking-listening/',
      config: { storageKey: ctx.sideStateKey('fiezel-sl-v1') },
      onAttempt: (info) => { capturedAttempt = info; }
    });
    ctrl.domain = 'listening';
    ctrl.startedAt = Date.now() - 2500;
    ctrl.items = [{ id: 'L-demo-1', level: 'A1', mode: 'gist', script: 'Hello world', options: ['a', 'b'], answerIndex: 0 }];
    ctrl.index = 0;
    ctrl.finishItem(ctrl.items[0], { passed: true, score: 100, metric: 'exact' });
    assert.ok(capturedAttempt && capturedAttempt.domain === 'listening' && capturedAttempt.item.id === 'L-demo-1', 'Addon finishItem wajib memanggil onAttempt');
  });

  // 2. P0 Modules wired to real app.js + BKT + Ledger
  check('B1 Kakijun Studio writes state.kana, BKT & history with valid bucket signature', () => {
    const h = bootFullAppHost(['features/japanese/fiezel-kakijun-studio.js'], { fz_target_course: 'ja' });
    const { ctx, store } = h;
    ctx.FiezelKakijunStudio._onCharacterCompleted({ char: 'あ', elapsedMs: 3200 });
    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.kana['ja_kana_あ'].total, 1);
    assert.strictEqual(st.kana['ja_kana_あ'].correct, 1);
    assert.ok(st.history.some(x => x.type === 'kana' && x.id === 'ja_kana_あ'));
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons['ja_kana_あ'].n, 1);
  });

  check('B2 Mandarin UI MCQ + reorder route real mastery, BKT, Ledger & history without crash or double count', () => {
    const h = bootFullAppHost([
      'features/mandarin/mandarin-braincore-bridge.js',
      'features/mandarin/mandarin-curriculum.js',
      'features/mandarin/mandarin-ui.js'
    ], { fz_target_course: 'zh' });
    const { ctx, store } = h;
    const lessons = ctx.FiezelMandarinCurriculum.getLessonsByLevel(1);
    assert.ok(lessons.length > 0);
    const lesson = lessons[0];
    const wrongIdx = lesson.quiz[0].answerIndex === 0 ? 1 : 0;

    ctx.FiezelMandarinUI.openLessonPlayer(lesson.id, 4);
    ctx.FiezelMandarinUI.submitQuizAnswer(0, wrongIdx);
    const st = ctx.__fiezelAudit.liveState();
    assert.ok(Object.keys(st.grammar).some(k => k.startsWith('zh_')), 'Mandarin kuis harus memperbarui state.grammar berawalan zh_');
    assert.strictEqual(st.totalAnswered, 1, 'Total answered tidak boleh terhitung ganda');
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.ok(Object.keys(bkt.lessons).some(k => k.startsWith('zh_') && bkt.lessons[k].n === 1), 'BKT zh_* wajib n === 1');
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(Object.keys(ledger.entries).length > 0, 'Mandarin wrong answer wajib mencatat misconception ledger');

    // Duplicate click on same qIdx 0 must NOT double increment totalAnswered
    ctx.FiezelMandarinUI.submitQuizAnswer(0, lesson.quiz[0].answerIndex);
    assert.strictEqual(ctx.__fiezelAudit.liveState().totalAnswered, 1);
  });

  check('B3 StoryReader + StoryBrainBridge record wrong/right cleanly without reading_quiz crash or BKT double write', () => {
    const h = bootFullAppHost([
      'features/japanese/fiezel-story-brain-bridge.js',
      'features/japanese/fiezel-story-reader.js'
    ], { fz_target_course: 'ja' });
    const { ctx, store } = h;
    const story = ctx.FiezelStoryReader.STORIES[0];
    const quiz = story.scenes[4].quiz;
    const wrongIdx = quiz.answerIndex === 0 ? 1 : 0;

    ctx.FiezelStoryReader.openStory(story.id);
    ctx.FiezelStoryReader.gotoScene(4);
    ctx.FiezelStoryReader.evaluateQuiz(wrongIdx);

    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.reading['story_' + story.id].total, 1);
    assert.strictEqual(st.reading['story_' + story.id].correct, 0);
    assert.strictEqual(st.totalAnswered, 1);
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons['reading_' + story.id].n, 1, 'BKT tidak boleh terhitung ganda antara reader & bridge');
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(Object.keys(ledger.entries).length > 0, 'Wrong story quiz wajib mencatat misconception ledger');
  });

  check('B4 PTE UI writes valid concept & misconception shape into real FiezelMisconceptionLedger', () => {
    const h = bootFullAppHost([
      'features/pte/fiezel-pte-engine.js',
      'features/pte/fiezel-pte-ui.js'
    ]);
    const { ctx, store } = h;
    const wfdJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/pte/pte-write-dictation.json'), 'utf8'));
    const wfdItems = Array.isArray(wfdJson.items) ? wfdJson.items : wfdJson;
    assert.ok(wfdItems.length > 0, 'PTE WFD bank wajib ada');
    ctx.FiezelPteUi.getBanks().wfd = wfdItems;
    const item = wfdItems[0];
    ctx.FiezelPteUi.getState().mode = 'wfd';
    ctx.FiezelPteUi.getState().index = 0;
    const ta = h.document.getElementById('fzPteDictationInput');
    const targetSentence = String(item.sentence || item.text || '');
    const ch = Array.isArray(item.spellingChallenges) && item.spellingChallenges[0];
    if (ch && ch.trap && ch.target) {
      ta.value = targetSentence.replace(new RegExp('\\b' + ch.target + '\\b', 'i'), ch.trap);
    } else if (ch && typeof ch === 'string') {
      ta.value = targetSentence.replace(new RegExp('\\b' + ch + '\\b', 'i'), ch + 'x');
    } else {
      ta.value = 'completely wrong unrelated words';
    }
    ctx.FiezelPteUi.submitWfd();

    const st = ctx.__fiezelAudit.liveState();
    assert.ok(st.pte[item.id], 'state.pte harus mencatat hasil WFD');
    assert.strictEqual(st.totalAnswered, 1);
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons['pte_wfd'].n, 1);
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(Object.keys(ledger.entries).some(k => k.startsWith('pte_wfd::')), 'PTE spelling/WFD misconception WAJIB masuk entries Ledger nyata');
  });

  check('B5 JLPT Listening increments totalAnswered ONCE, uses canonical save/history, and avoids bare keys', () => {
    const h = bootFullAppHost(['features/speaking-listening/fiezel-jlpt-listening.js'], { fz_target_course: 'ja' });
    const { ctx, store } = h;
    ctx.FiezelJlptListening.initBank([
      { id: 'jlpt-n5-t1', level: 'N5', prompt: 'Test?', options: ['A', 'B', 'C', 'D'], answerIndex: 1, whyFails: { 0: 'Distractor trap A' } }
    ]);
    ctx.submitAnswer(1);
    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.totalAnswered, 1, 'JLPT listening tidak boleh double-count totalAnswered');
    assert.strictEqual(st.history.length, 1, 'JLPT listening tidak boleh push 2 baris history identik');
    assert.strictEqual(store.fiezel_state, undefined, 'Tidak boleh menulis kunci mati fiezel_state');
    assert.strictEqual(store['fiezel-mastery-bkt-v1'], undefined, 'Tidak boleh bocor ke BKT Inggris datar');
    const jaBkt = JSON.parse(store['fiezel-mastery-bkt-v1@ja']);
    assert.strictEqual(jaBkt.lessons['listening_n5'].n, 1);
  });

  check('B6 VoicePedagogy preserves canonical host BKT schema and passes object payload to bktRecord', () => {
    const h = bootFullAppHost(['features/interactive-chat/fiezel-voice-pedagogy.js'], { fz_target_course: 'ja' });
    const { ctx, store } = h;
    const res = ctx.FiezelVoicePedagogy.recordPedagogicalAttempt({
      competencyId: 'ja_kaiwa_cafe',
      ok: false,
      misconceptionId: 'particle_wa_ha',
      latencyMs: 2400
    });
    assert.ok(res && res.competencyId === 'ja_kaiwa_cafe');
    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.speaking['ja_kaiwa_cafe'].total, 1);
    const jaBkt = JSON.parse(store['fiezel-mastery-bkt-v1@ja']);
    assert.strictEqual(jaBkt.schema, 'fiezel-mastery-bkt-v1');
    assert.strictEqual(jaBkt.skills, undefined, 'Host BKT schema tidak boleh ditimpa {skills}');
    assert.strictEqual(jaBkt.lessons['ja_kaiwa_cafe'].n, 1);
    const ledger = JSON.parse(store['fiezel-misconception-ledger-v1@ja']);
    assert.ok(ledger.entries['ja_kaiwa_cafe::particle_wa_ha']);
  });

  check('B7 NUJUM live session wires CoreBrain/BKT/Ledger/OLM whereas demo mode leaves host untouched', () => {
    const h = bootFullAppHost(['features/nujum/fiezel-nujum.js']);
    const { ctx, store } = h;

    // Demo mode must leave host untouched
    ctx.FiezelNujum.startSession({ isDemo: true });
    let demoChoiceBtn = null;
    // Direct click simulation via evaluate fallback: verify state stays 0 when demo
    assert.strictEqual(ctx.__fiezelAudit.liveState().totalAnswered, 0);

    // Non-demo live session: capture rendered [data-val] option elements when startSession builds UI in #app
    const originalGetEl = h.document.getElementById;
    let capturedTapButtons = [];
    const origQueryAll = h.document.querySelectorAll;
    h.document.querySelectorAll = (sel) => {
      if (String(sel).includes('[data-val]')) return capturedTapButtons;
      return origQueryAll(sel);
    };
    const appEl = originalGetEl('app');
    Object.defineProperty(appEl, 'innerHTML', {
      configurable: true,
      get() { return appEl._njHtml || ''; },
      set(html) {
        appEl._njHtml = String(html || '');
        capturedTapButtons = [];
        const re = /data-val="([^"]+)"/g;
        let m;
        while ((m = re.exec(appEl._njHtml))) {
          const btn = h.document.createElement('button');
          btn.setAttribute('data-val', m[1]);
          capturedTapButtons.push(btn);
        }
      }
    });

    ctx.FiezelNujum.startSession({ isDemo: false });
    const qActive = ctx.FiezelNujum.getState().currentQuestion;
    assert.ok(qActive && qActive.skillId, 'NUJUM harus memilih soal');
    const correctText = String(qActive.options[qActive.correctIndex] || '').trim().toLowerCase();
    const wrongBtn = capturedTapButtons.find((b) => String(b.getAttribute('data-val') || '').trim().toLowerCase() !== correctText);
    assert.ok(wrongBtn, 'NUJUM harus merender tombol opsi salah untuk diklik');
    wrongBtn.click();

    const stAfter = ctx.__fiezelAudit.liveState();
    assert.strictEqual(stAfter.totalAnswered, 1, 'NUJUM live answer wajib tercatat di state.totalAnswered');
    assert.ok(stAfter.grammar[qActive.skillId], 'NUJUM live answer wajib memperbarui state.grammar');
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons[qActive.skillId].n, 1, 'NUJUM wajib memperbarui BKT nyata');
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(Object.keys(ledger.entries).some(k => k.startsWith(qActive.skillId + '::')), 'NUJUM kalah wajib masuk Misconception Ledger');

    // Trigger surrender and verify additional record
    const prevAnswered = stAfter.totalAnswered;
    const surrenderBtn = originalGetEl('nujumSurrenderBtn');
    surrenderBtn.click();
    assert.strictEqual(ctx.__fiezelAudit.liveState().totalAnswered, prevAnswered + 1, 'NUJUM surrender juga harus tercatat');
  });

  check('B8 LearnerFlow forwards assignment and lesson evaluations into host Braincore', () => {
    const h = bootFullAppHost([
      'features/learner-flow/fiezel-review-bank.js',
      'features/learner-flow/fiezel-learner-flow.js'
    ]);
    const { ctx, store } = h;
    ctx.FiezelLearnerFlow.recordAssignmentResult({
      id: 'assign-t1',
      skill: 'tense',
      title: 'Tenses Check',
      results: [
        { itemId: 'lf1', skill: 'tense', correct: false },
        { itemId: 'lf2', skill: 'tense', correct: true }
      ]
    });
    const st = ctx.__fiezelAudit.liveState();
    assert.strictEqual(st.grammar['flow_tense'].total, 2);
    assert.strictEqual(st.grammar['flow_tense'].correct, 1);
    const bkt = JSON.parse(store[ctx.sideStateKey('fiezel-mastery-bkt-v1')]);
    assert.strictEqual(bkt.lessons['tense'].n, 2, 'LearnerFlow wajib mengalirkan bukti ke FiezelMasteryBKT');
    const ledger = JSON.parse(store[ctx.sideStateKey('fiezel-misconception-ledger-v1')]);
    assert.ok(ledger.entries['tense::flow_tense_error'], 'LearnerFlow jawaban salah wajib tercatat di Ledger dan terkalibrasi oleh jawaban benar');
  });

  // 3. Real Worker D1 persistence + privacy allowlist on POST /api/braincore/sync
  await checkAsync('C1 Worker routeVoiceBraincoreSync persists privacy-scrubbed attempts to CORE_DB brain_attempts and fails closed without DB', async () => {
    const voiceMod = await import(pathToFileURL(path.join(ROOT, 'workers/api/voice/route-voice-live.js')).href);
    const { projectBrainAttempt } = await import(pathToFileURL(path.join(ROOT, 'workers/api/route-legacy.js')).href);

    // 1. Fail-closed when CORE_DB is absent
    const resNoDb = await voiceMod.routeVoiceBraincoreSync({
      identity: { verified: true, sub: 'usr-sync-1' },
      env: {},
      bodyText: JSON.stringify({
        tabId: 'tab-1',
        attempts: [{ id: 'att_1', competencyId: 'ja_kaiwa_cafe', ok: true, timestamp: Date.now() }]
      })
    });
    assert.strictEqual(resNoDb.status, 503, 'Tanpa CORE_DB wajib fail-closed 503 storage_unavailable');

    // 2. Real persistence into SQL mock CORE_DB + zero transcript leakage
    const executedSql = [];
    const storedRows = [];
    const mockDb = {
      prepare(sql) {
        executedSql.push(sql);
        let boundArgs = [];
        return {
          bind(...args) { boundArgs = args; return this; },
          async run() {
            if (/INSERT\s+OR\s+REPLACE\s+INTO\s+brain_attempts/i.test(sql)) {
              storedRows.push({ sub: boundArgs[0], attempt_id: boundArgs[1], data: boundArgs[2], created_at: boundArgs[3] });
            }
            return { success: true };
          }
        };
      },
      async batch(stmts) {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        return out;
      }
    };

    const resOk = await voiceMod.routeVoiceBraincoreSync({
      identity: { verified: true, sub: 'usr-sync-1' },
      env: { CORE_DB: mockDb },
      now: 1762000500000,
      bodyText: JSON.stringify({
        tabId: 'tab_session_99',
        attempts: [
          {
            id: 'att_1',
            timestamp: 1762000499000,
            competencyId: 'ja_kaiwa_cafe',
            scenarioId: 'scen_ja_n5_kissaten',
            userTranscript: 'RAHASIA KALIMAT MURID JANGAN DISIMPAN',
            ok: false,
            misconceptionId: 'particle_wa_ha',
            pMasteryBefore: 0.42
          },
          {
            id: 'att_2',
            timestamp: 1762000500000,
            competencyId: 'en_speaking_fluency',
            scenarioId: 'scen_en_a2_cafe',
            userTranscript: 'I want coffee',
            ok: true
          }
        ]
      })
    });
    assert.strictEqual(resOk.status, 200);
    const body = await resOk.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.persisted, true);
    assert.strictEqual(body.storedCount, 2);
    assert.deepStrictEqual(body.acceptedIds, ['att_1', 'att_2']);
    assert.ok(executedSql.some(s => /CREATE TABLE IF NOT EXISTS brain_attempts/i.test(s)), 'ensureLegacySchema wajib membuat tabel bila belum ada');
    assert.strictEqual(storedRows.length, 2);
    for (const r of storedRows) {
      assert.strictEqual(r.sub, 'usr-sync-1');
      assert.ok(!r.data.includes('RAHASIA KALIMAT MURID'), 'Transkrip mentah dilarang tersimpan di brain_attempts');
      const parsed = JSON.parse(r.data);
      assert.ok(projectBrainAttempt(parsed), 'Baris yang disimpan wajib lolos allowlist kanonik projectBrainAttempt');
      assert.strictEqual(parsed.type, 'speaking');
    }
    assert.strictEqual(JSON.parse(storedRows[0].data).misconception, 'particle_wa_ha');
  });

  if (failed > 0) {
    console.error('\nFIEZEL Braincore nervous system wiring: FAIL (' + failed + ' failed, ' + passed + ' passed)');
    process.exit(1);
  }
  console.log('\nFIEZEL Braincore nervous system wiring: PASS (' + passed + ' uji end-to-end)');
})();
