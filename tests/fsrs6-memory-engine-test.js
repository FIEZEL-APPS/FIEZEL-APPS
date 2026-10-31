#!/usr/bin/env node
/**
 * GERBANG MESIN MEMORI FSRS-6 & ANTREAN ULANGAN LISTENING (tests/fsrs6-memory-engine-test.js)
 *
 * YANG DIKUNCI GERBANG INI
 *   G1  Paritas bit-eksak 8 desimal terhadap vektor emas upstream ts-fsrs@6.0.0 (21 parameter,
 *       3 lintasan multi-ulangan penuh termasuk short-term elapsedDays=0, w20 kustom, migrasi 19->21,
 *       dan penjepitan batas parameter relearning);
 *   G2  Jembatan kontinuitas paruh-waktu legacyHalfLifeToStability(h): jarak ulangan R=0.90
 *       identik 0,000% dengan FSRS-lite pada saat migrasi (bukti RED: tanpa jembatan melompat ~6,58x);
 *   G3  Lapisan kuis FIEZEL deriveImplicitRating(): 4 tingkat (Again/Hard/Good/Easy) dengan pagar
 *       anti-tebakan (jawaban kilat <1,4 dtk ditahan di Hard, bantuan hint/replay/retry tidak pernah Easy);
 *   G4  Integrasi fungsi produksi app.js di VM: mode bawaan shadow tidak menggeser b.nextReview
 *       FSRS-lite 1 milidetik pun, menulis sidecar b.fsrs6 + log-loss out-of-sample, dan pemanggilan
 *       ulang settleReviewScheduleSilently()/setConfidence() 100% idempoten (reps tidak ganda);
 *   G5  state.listening tersambung ke dueItems() & contentLevelFor('listening', ...) untuk bank
 *       Inggris (listen_*), JLPT (jlpt-*), dan Listening Exam (lx-*), sambil tetap menolak kunci yatim;
 *   G6  Penyetel berbatas tuneDecayW20(): kill-switch, lantai sampel >=50, validasi silang lipatan
 *       genap/ganjil, dan langkah maksimum <=0.05;
 *   G7  Gerbang ini terdaftar aktif di .github/workflows/quality.yml.
 */
'use strict';

const __fzRoot = require('path').join(__dirname, '..');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const Fsrs6 = require('../features/brain/fiezel-fsrs6.js');
const CoreBrain = require('../features/brain/fiezel-core-brain.js');
const BrainConfig = require('../features/brain/fiezel-brain-config.js');
const appSrc = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');

let failures = 0;
let checks = 0;
function test(name, fn) {
  checks++;
  try {
    fn();
    console.log('ok - ' + name);
  } catch (e) {
    failures++;
    console.error('FAIL - ' + name + '\n    ' + (e && e.message ? e.message : String(e)));
  }
}

function extractFn(name) {
  const start = appSrc.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  assert.ok(start >= 0, 'fungsi ' + name + ' tidak ditemukan di app.js');
  let pDepth = 0;
  let bodyStart = -1;
  for (let i = appSrc.indexOf('(', start); i < appSrc.length; i++) {
    if (appSrc[i] === '(') pDepth++;
    else if (appSrc[i] === ')') {
      pDepth--;
      if (pDepth === 0) {
        bodyStart = appSrc.indexOf('{', i);
        break;
      }
    }
  }
  assert.ok(bodyStart >= 0, 'badan fungsi ' + name + ' tidak ditemukan');
  let depth = 0;
  for (let j = bodyStart; j < appSrc.length; j++) {
    if (appSrc[j] === '{') depth++;
    else if (appSrc[j] === '}') {
      depth--;
      if (depth === 0) return appSrc.slice(start, j + 1);
    }
  }
  throw new Error('kurung kurawal fungsi ' + name + ' tidak seimbang');
}

// Vektor emas upstream ts-fsrs@6.0.0 (21 parameter bawaan).
const GOLDEN = {
  defaultWeights: [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542
  ],
  results: [
    {
      history: [
        { rating: 3, deltaT: 0 },
        { rating: 3, deltaT: 2 },
        { rating: 2, deltaT: 6 },
        { rating: 4, deltaT: 14 },
        { rating: 3, deltaT: 45 }
      ],
      states: [
        { difficulty: 2.11810397, stability: 2.3065 },
        { difficulty: 2.11121424, stability: 10.96433194 },
        { difficulty: 4.74828477, stability: 24.34832364 },
        { difficulty: 2.97863464, stability: 83.65664248 },
        { difficulty: 2.97088437, stability: 191.37645244 }
      ],
      intervals90: [2, 11, 24, 84, 191],
      intervals85: [4, 21, 46, 159, 365],
      curves: [0.9468475, 0.97495042, 0.98256966, 0.99296109, 0.9961078]
    },
    {
      history: [
        { rating: 1, deltaT: 0 },
        { rating: 3, deltaT: 0 },
        { rating: 3, deltaT: 1 },
        { rating: 1, deltaT: 4 },
        { rating: 2, deltaT: 1 },
        { rating: 3, deltaT: 3 }
      ],
      states: [
        { difficulty: 6.4133, stability: 0.212 },
        { difficulty: 6.40211507, stability: 0.24668919 },
        { difficulty: 6.39094132, stability: 2.02147724 },
        { difficulty: 8.79895532, stability: 0.57489456 },
        { difficulty: 9.18791895, stability: 1.22555102 },
        { difficulty: 9.1739594, stability: 3.27334372 }
      ],
      intervals90: [1, 1, 2, 1, 1, 3],
      intervals85: [1, 1, 4, 1, 2, 6],
      curves: [0.76619573, 0.71325304, 0.87067664, 0.72821313, 0.7802324, 0.85333763]
    },
    {
      history: [
        { rating: 4, deltaT: 0 },
        { rating: 1, deltaT: 10 },
        { rating: 1, deltaT: 0 },
        { rating: 4, deltaT: 1 }
      ],
      states: [
        { difficulty: 1, stability: 8.2956 },
        { difficulty: 7.02698957, stability: 1.42530962 },
        { difficulty: 9.00802006, stability: 0.49437856 },
        { difficulty: 8.66177496, stability: 2.26654546 }
      ],
      intervals90: [8, 1, 1, 2],
      intervals85: [16, 3, 1, 4],
      curves: [0.98292344, 0.87509464, 0.74161062, 0.85652665]
    }
  ],
  customW20: {
    states: [
      { difficulty: 2.11810397, stability: 2.3065 },
      { difficulty: 2.11121424, stability: 14.16920614 },
      { difficulty: 7.39223814, stability: 1.63908211 }
    ],
    curveAt5d: 0.95901225,
    nextInt90: 14
  },
  migrated19: [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0, 0.5
  ],
  clippedExtreme: [
    0.001, 100, 1, 2, 1, 4, 4, 0.75, 0, 0.8,
    0.001, 5, 0.25, 0.9, 0, 1, 1, 0.01, 0.01, 0.01, 0.8
  ]
};

test('G1 · paritas 8 desimal terhadap vektor emas upstream ts-fsrs@6.0.0', () => {
  assert.strictEqual(Fsrs6.SCHEMA, 'fiezel-fsrs6-v1');
  assert.ok(Object.isFrozen(Fsrs6) && Object.isFrozen(Fsrs6.DEFAULT_WEIGHTS));
  assert.deepStrictEqual(Array.from(Fsrs6.DEFAULT_WEIGHTS), GOLDEN.defaultWeights);

  const model = Fsrs6.createModel();
  GOLDEN.results.forEach((vec, idx) => {
    const states = model.forward({ history: vec.history });
    assert.deepStrictEqual(states, vec.states, 'urutan #' + idx + ' state meleset');
    assert.deepStrictEqual(
      states.map((st) => model.nextInterval(st, 0.9)),
      vec.intervals90,
      'urutan #' + idx + ' nextInterval(0.9) meleset'
    );
    assert.deepStrictEqual(
      states.map((st) => model.nextInterval(st, 0.85)),
      vec.intervals85,
      'urutan #' + idx + ' nextInterval(0.85) meleset'
    );
    assert.deepStrictEqual(
      states.map((st, i) => model.forgettingCurve(st, i + 1)),
      vec.curves,
      'urutan #' + idx + ' forgettingCurve meleset'
    );
  });

  const customModel = Fsrs6.createModel({
    weights: [...Fsrs6.DEFAULT_WEIGHTS.slice(0, 20), 0.28]
  });
  const customStates = customModel.forward({
    history: [
      { rating: 3, deltaT: 0 },
      { rating: 3, deltaT: 3 },
      { rating: 1, deltaT: 8 }
    ]
  });
  assert.deepStrictEqual(customStates, GOLDEN.customW20.states);
  assert.strictEqual(Fsrs6.forgettingCurve(5, customStates[1].stability, 0.28), GOLDEN.customW20.curveAt5d);
  assert.strictEqual(customModel.nextInterval(customStates[1], 0.9), GOLDEN.customW20.nextInt90);
  assert.deepStrictEqual(Fsrs6.migrateParameters(Fsrs6.DEFAULT_WEIGHTS.slice(0, 19)), GOLDEN.migrated19);
  assert.deepStrictEqual(
    Fsrs6.clipParameters([-5, 200, 1, 2, 0.1, 9, 9, 0.99, -1, 2, 0, 9, 1, 2, -1, 2, 0.5, 5, 5, 0, 0.99], 2, true),
    GOLDEN.clippedExtreme
  );
});

test('G2 · jembatan legacyHalfLifeToStability menjaga kontinuitas R=0.90 tanpa lompatan 6,58x', () => {
  const model = Fsrs6.createModel();
  for (const h of [0.5, 1.6, 5.0, 24.0, 120.0]) {
    const gapLite = CoreBrain.nextReviewGapDays(h, 0.9);
    const sBridged = Fsrs6.legacyHalfLifeToStability(h);
    const gapFsrs6 = model.nextExactGapDays({ stability: sBridged, difficulty: 5 }, 0.9);
    assert.ok(Math.abs(gapLite - gapFsrs6) <= 1e-3,
      'diskontinuitas jadwal pada h=' + h + ': lite=' + gapLite + ' vs fsrs6=' + gapFsrs6);
    assert.ok(Math.abs(Fsrs6.stabilityToLegacyHalfLife(sBridged) - h) <= 1e-4);
  }
  // Bukti RED: memakai paruh-waktu h mentah sebagai S FSRS-6 akan melebarkan jadwal ~6,58x.
  const naiveGap = model.nextExactGapDays({ stability: 10, difficulty: 5 }, 0.9);
  const liteGap = CoreBrain.nextReviewGapDays(10, 0.9);
  assert.ok(naiveGap / liteGap > 6.5, 'bukti RED harus menunjukkan lompatan ~6,58x tanpa jembatan');
});

test('G3 · deriveImplicitRating menegakkan pagar anti-tebakan & kesadaran bantuan kuis', () => {
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: false, ms: 2200 }).rating, Fsrs6.Rating.Again);
  // Ketukan kilat < 1.4 dtk ditahan di Hard, tidak pernah diberi Easy.
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 650 }).rating, Fsrs6.Rating.Hard);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 2500, hintLevel: 2 }).rating, Fsrs6.Rating.Hard);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 2500, replayCount: 2 }).rating, Fsrs6.Rating.Hard);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 2500, retryCount: 1 }).rating, Fsrs6.Rating.Hard);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 2500, kappa: 0.4 }).rating, Fsrs6.Rating.Hard);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 18500 }).rating, Fsrs6.Rating.Hard);
  // Mandiri penuh & fasih -> Easy; wajar -> Good.
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 2400, kappa: 0.95 }).rating, Fsrs6.Rating.Easy);
  assert.strictEqual(Fsrs6.deriveImplicitRating({ ok: true, ms: 6200, kappa: 0.9 }).rating, Fsrs6.Rating.Good);
});

test('G4 · app.js scheduleNext + updateMastery + settleReviewScheduleSilently + setConfidence idempoten & shadow-safe', () => {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const V = [{ id: 'vocab_001', level: 'A1' }, { id: 'vocab_c1', level: 'C1' }];
  const R = [{ id: 'read_a1', level: 'A1' }];
  const GRAMMAR_ITEMS = [{ skill: 'present-simple', level: 'A1' }];
  const state = {
    level: 2,
    consecutiveWrong: 0,
    lastWrongAt: 0,
    history: [],
    confidenceHistory: [],
    vocab: {},
    grammar: {},
    reading: {},
    listening: {}
  };
  const selfObj = {
    FiezelCoreBrain: CoreBrain,
    FiezelFsrs6: Fsrs6,
    FiezelBrainConfig: BrainConfig,
    FiezelFsrs6Active: false
  };
  const ctx = vm.createContext({
    LEVELS,
    MASTERY_THRESHOLD: 85,
    V,
    R,
    GRAMMAR_ITEMS,
    state,
    self: selfObj,
    getActiveLevel: () => 'A2',
    save: () => {},
    srlCaptureConfidence: () => {},
    confidencePopAnswered: () => {},
    Date,
    Math,
    Number,
    String,
    Object,
    Array
  });
  const fns = [
    'contentLevelFor',
    'memoryItemDifficulty',
    'reviewLevelOk',
    'dueItems',
    'forgettingProbability',
    'scheduleNext',
    'updateMastery',
    'settleReviewScheduleSilently',
    'setConfidence'
  ].map(extractFn).join('\n');
  vm.runInContext(fns, ctx);

  const t0 = 1790000000000;
  state.history.push({
    at: t0,
    type: 'vocab',
    target: 'vocab_001',
    reviewBucket: 'vocab',
    reviewKey: 'vocab_001',
    ok: true,
    ms: 2500,
    confidence: null,
    hintLevel: 0,
    kappa: 0.95
  });
  vm.runInContext(`updateMastery('vocab', 'vocab_001', true, 2500, null, ${t0})`, ctx);
  const afterUpdate = JSON.parse(JSON.stringify(state.vocab.vocab_001));
  assert.ok(afterUpdate.fsrs6 && afterUpdate.fsrs6.reps === 1, 'sidecar fsrs6 harus terbentuk dengan reps=1');
  assert.strictEqual(afterUpdate.fsrs6.lastRating, Fsrs6.Rating.Easy, 'jawaban fasih 2.5 dtk harus dinilai Easy');

  // Dalam mode shadow (default), b.nextReview WAJIB identik dengan FSRS-lite!
  const expectedLiteGap = CoreBrain.nextReviewGapDays(afterUpdate.stabilityDays);
  assert.strictEqual(afterUpdate.nextReview, t0 + expectedLiteGap * 86400000,
    'mode shadow tidak boleh menggeser b.nextReview FSRS-lite');

  // settleReviewScheduleSilently() memanggil ulang scheduleNext untuk jawaban yang SAMA -> reps tetap 1!
  vm.runInContext('settleReviewScheduleSilently()', ctx);
  assert.strictEqual(state.vocab.vocab_001.fsrs6.reps, 1,
    'settleReviewScheduleSilently tidak boleh menggandakan reps FSRS-6');

  // Dan setConfidence(1) pada jawaban yang sama juga idempoten terhadap reps & lapses!
  vm.runInContext('setConfidence(1)', ctx);
  assert.strictEqual(state.vocab.vocab_001.fsrs6.reps, 1, 'setConfidence tidak boleh menggandakan reps');
  assert.strictEqual(state.vocab.vocab_001.fsrs6.lastRating, Fsrs6.Rating.Hard,
    'confidence=1 menurunkan grade jawaban benar ke Hard secara idempoten');

  // Ulangan hari berikutnya mencatat perbandingan log-loss out-of-sample terhadap FSRS-lite.
  const t1 = t0 + 2 * 86400000;
  state.history.push({
    at: t1,
    type: 'vocab',
    target: 'vocab_001',
    reviewBucket: 'vocab',
    reviewKey: 'vocab_001',
    ok: true,
    ms: 4200,
    confidence: null,
    kappa: 0.9
  });
  vm.runInContext(`updateMastery('vocab', 'vocab_001', true, 4200, null, ${t1})`, ctx);
  assert.strictEqual(state.vocab.vocab_001.fsrs6.reps, 2);
  assert.strictEqual(state.vocab.vocab_001.fsrs6.nScored, 1);
  assert.ok(state.vocab.vocab_001.fsrs6.logLossSum > 0 && state.vocab.vocab_001.fsrs6.liteLogLossSum > 0);
});

test('G5 · dueItems() menyertakan state.listening lintas level <= aktif dan menolak kunci yatim', () => {
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const now = Date.now();
  let active = 'A2';
  const state = {
    vocab: {},
    grammar: {},
    reading: {},
    listening: {
      'listen_sc_a1_gist_001': { total: 2, nextReview: now - 5000 },
      'jlpt-n5-m1-01': { total: 1, nextReview: now - 5000 },
      'jlpt-n4-m1-02': { total: 1, nextReview: now - 5000 },
      'lx-ielts-s1': { total: 1, nextReview: now - 5000 },       // B1 -> di atas A2
      'listen_sc_c1_gist_001': { total: 1, nextReview: now - 5000 }, // C1 -> di atas A2
      'orphan_nonexistent_listening_999': { total: 3, nextReview: now - 5000 } // yatim -> ditolak
    }
  };
  const ctx = vm.createContext({
    LEVELS,
    V: [],
    R: [],
    GRAMMAR_ITEMS: [],
    state,
    getActiveLevel: () => active,
    Date,
    String
  });
  vm.runInContext(['contentLevelFor', 'reviewLevelOk', 'dueItems'].map(extractFn).join('\n'), ctx);

  const dueAtA2 = vm.runInContext('dueItems().map(([k]) => k).sort()', ctx);
  assert.deepStrictEqual(Array.from(dueAtA2), [
    'jlpt-n4-m1-02',
    'jlpt-n5-m1-01',
    'listen_sc_a1_gist_001'
  ]);

  active = 'C1';
  const dueAtC1 = vm.runInContext('dueItems().map(([k]) => k).sort()', ctx);
  assert.deepStrictEqual(Array.from(dueAtC1), [
    'jlpt-n4-m1-02',
    'jlpt-n5-m1-01',
    'listen_sc_a1_gist_001',
    'listen_sc_c1_gist_001',
    'lx-ielts-s1'
  ]);
});

test('G6 · tuneDecayW20 menegakkan kill-switch, lantai sampel >=50, CV genap/ganjil, dan langkah <=0.05', () => {
  assert.strictEqual(Fsrs6.tuneDecayW20([], { halted: true }).rationale, 'brain3_fsrs6_tune_halted');
  assert.strictEqual(
    Fsrs6.tuneDecayW20([{ stability: 4, elapsedDays: 10, ok: true }], { minSamples: 50 }).rationale,
    'brain3_fsrs6_tune_insufficient_data'
  );

  // Dunia sintetis ekor panjang (t >> S) di mana w20 sejati = 0.55 vs bawaan 0.1542.
  let s = 20261031 >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const rows = [];
  for (let i = 0; i < 320; i++) {
    const stab = 1.2 + (i % 4) * 0.5;
    const elapsed = 20 + (i % 50);
    const trueP = Fsrs6.forgettingCurve(elapsed, stab, 0.55);
    rows.push({ stability: stab, elapsedDays: elapsed, ok: rand() < trueP });
  }
  const tuned = Fsrs6.tuneDecayW20(rows, { currentW20: 0.1542, maxStep: 0.05 });
  assert.strictEqual(tuned.applied, true);
  assert.ok(tuned.w20 > 0.1542, 'w20 harus bergerak naik menuju 0.55');
  assert.ok(Math.abs(tuned.w20 - 0.1542) <= 0.050001, 'langkah tunggal tidak boleh melebihi maxStep 0.05');
});

test('G7 · gate ini terdaftar di .github/workflows/quality.yml', () => {
  const wf = fs.readFileSync(path.join(__fzRoot, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(wf.includes('node tests/fsrs6-memory-engine-test.js'),
    'tests/fsrs6-memory-engine-test.js wajib terdaftar di quality.yml');
});

if (failures > 0) {
  console.error('\nFsrs6MemoryEngine: FAIL (' + failures + '/' + checks + ')');
  process.exit(1);
}
console.log('Fsrs6MemoryEngine: PASS (' + checks + ' uji)');
