#!/usr/bin/env node
'use strict';

const assert = require('assert');
const Runtime = require('./braincore-runtime.js');
const Pipeline = require('./braincore-pipeline.js');
const Governance = require('./braincore-item-governance.js');

const T0 = 1_700_000_000_000;
const DAY = 86_400_000;
const Q = Object.freeze({
  id: 'runtime-past-simple-1', concept: 'past-simple', lesson: 'past-simple',
  level: 'A2', domain: 'grammar', mode: 'complete_sentence', stemLength: 40
});
const QG = Object.freeze({ ...Q, contentRevision: 'item-rev-a' });
const CLEAN_QA = Object.freeze({ schema: Governance.QA_SCHEMA, version: 'runtime-proof', blockingFindings: [], reviewQueue: [] });

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e.stack || e.message)); }
}

test('runtime punya identitas eksplisit dan mulai sehat', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  assert.strictEqual(r.schema, 'fiezel-braincore-runtime-v1');
  assert.strictEqual(Runtime.braincoreVersion, '3.0.0');
  assert.strictEqual(Runtime.stateSchema, 'fiezel-braincore-state-v1');
  assert.strictEqual(Runtime.itemGovernanceSchema, 'fiezel-braincore-item-governance-v1');
  assert.strictEqual(r.status().degraded, false);
  assert.strictEqual(r.status().guardErrorCount, 0);
  assert.strictEqual(r.status().itemGovernanceEnforced, false);
  assert.strictEqual(r.status().governedItems, 0);
});

test('front door runtime menghasilkan keputusan yang identik dengan pipeline pada input sama', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  const raw = Pipeline.createLearner({ level: 'A2', now: T0 });
  const evidence = { correct: false, ms: 6400, timing: 'normal', chosenMisconception: 'past-simple-vs-present-perfect' };
  const a = r.answer(Q, evidence, T0 + DAY);
  const b = Pipeline.answer(raw, Q, evidence, T0 + DAY);
  assert.strictEqual(JSON.stringify(a.trace), JSON.stringify(b.trace));
  assert.strictEqual(JSON.stringify(a.learner), JSON.stringify(b.learner));
  assert.deepStrictEqual(a.guardErrors, []);
  assert.strictEqual(a.status.degraded, false);
});

test('runtime memegang state lintas jawaban dan menaikkan revision tepat sekali per jawaban', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  for (let i = 1; i <= 6; i++) {
    r.answer(Q, { correct: i % 3 !== 0, ms: 5000 + i * 100, timing: 'normal' }, T0 + i * DAY);
    assert.strictEqual(r.status().stateRevision, i);
  }
  assert.strictEqual(r.learner().history.length, 6);
});

test('snapshot runtime bisa dipindah ke runtime baru tanpa mengubah keputusan berikutnya', () => {
  const a = Runtime.create({ level: 'A2', now: T0 });
  for (let i = 1; i <= 8; i++) {
    if (i === 5) a.newSession(T0 + i * DAY);
    a.answer(Q, { correct: i % 4 !== 0, ms: 6000, timing: 'normal' }, T0 + i * DAY);
  }
  const snap = a.snapshot(T0 + 8 * DAY);
  assert.strictEqual(snap.schema, 'fiezel-braincore-state-v1');
  assert.strictEqual(snap.braincoreVersion, Runtime.braincoreVersion);
  assert.strictEqual(snap.governance.schema, Runtime.itemGovernanceSchema);

  const b = Runtime.fromSnapshot(snap);
  const evidence = { correct: false, ms: 7200, timing: 'slow', chosenMisconception: 'past-simple-vs-present-perfect' };
  const nextA = a.answer(Q, evidence, T0 + 9 * DAY);
  const nextB = b.answer(Q, evidence, T0 + 9 * DAY);
  assert.strictEqual(JSON.stringify(nextB.trace), JSON.stringify(nextA.trace));
  assert.strictEqual(JSON.stringify(nextB.learner), JSON.stringify(nextA.learner));
});

test('learner() dan answer().learner adalah salinan — host tidak bisa memutasi state runtime diam-diam', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  const first = r.answer(Q, { correct: true, ms: 6000 }, T0 + DAY);
  const before = JSON.stringify(r.learner());
  first.learner.level = 'C2';
  first.learner.history.push({ poison: true });
  const exposed = r.learner();
  exposed.level = 'C1';
  exposed.memory['past-simple'].stabilityDays = 999999;
  assert.strictEqual(JSON.stringify(r.learner()), before);
});

test('importState mengganti state secara eksplisit dan mereset diagnostic sesi runtime', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  r.answer(Q, { correct: true, ms: 6000 }, T0 + DAY);
  const snap = r.snapshot();
  r.answer(Q, { correct: false, ms: 6000 }, T0 + 2 * DAY);
  assert.strictEqual(r.status().stateRevision, 2);
  r.importState(snap);
  assert.strictEqual(r.status().stateRevision, 1);
  assert.strictEqual(r.status().degraded, false);
  assert.strictEqual(r.status().lastDecision, '');
});

test('strict governance fail-closed sebelum Pipeline.answer dan QA bersih baru membuka item', () => {
  const r = Runtime.create({ level: 'A2', now: T0, enforceItemGovernance: true });
  assert.throws(() => r.answer(QG, { correct: true, ms: 6000 }, T0 + DAY), (e) => e.code === 'BRAINCORE_ITEM_INELIGIBLE');
  assert.strictEqual(r.status().stateRevision, 0, 'blocked item must not mutate learner state');
  const admitted = r.admitItem(QG, CLEAN_QA, T0 + 1);
  assert.strictEqual(admitted.status, Governance.STATUS.ACTIVE);
  const result = r.answer(QG, { correct: true, ms: 6000 }, T0 + DAY);
  assert.strictEqual(result.status.stateRevision, 1);
});

test('QA blocker langsung menahan item dan filterEligible tidak mengembalikannya', () => {
  const r = Runtime.create({ level: 'A2', now: T0, enforceItemGovernance: true });
  const bad = { ...QG, id: 'bad-question' };
  const report = { schema: Governance.QA_SCHEMA, version: 'runtime-proof', blockingFindings: [{ itemId: 'bad-question', category: 'ambiguity', severity: 'blocker' }], reviewQueue: [] };
  const state = r.admitItem(bad, report, T0 + 1);
  assert.strictEqual(state.status, Governance.STATUS.QUARANTINED);
  assert.strictEqual(r.isItemEligible(bad), false);
  r.admitItem(QG, CLEAN_QA, T0 + 2);
  assert.deepStrictEqual(r.filterEligible([bad, QG]).map((x) => x.id), [QG.id]);
  assert.throws(() => r.answer(bad, { correct: true, ms: 6000 }, T0 + DAY), (e) => e.code === 'BRAINCORE_ITEM_INELIGIBLE');
});

test('empirical quarantine butuh multi-learner evidence; satu learner tidak cukup', () => {
  const r = Runtime.create({ level: 'A2', now: T0, enforceItemGovernance: true });
  r.admitItem(QG, CLEAN_QA, T0 + 1);
  let state = r.observeItemHealth(QG.id, {
    schema: Governance.AGGREGATE_SCHEMA, contentRevision: QG.contentRevision,
    exposures: 200, independentLearners: 1, graderDisagreements: 100
  }, T0 + 2);
  assert.strictEqual(state.status, Governance.STATUS.ACTIVE);
  state = r.observeItemHealth(QG.id, {
    schema: Governance.AGGREGATE_SCHEMA, contentRevision: QG.contentRevision,
    exposures: 40, independentLearners: 12, graderDisagreements: 8
  }, T0 + 3);
  assert.strictEqual(state.status, Governance.STATUS.QUARANTINED);
  assert.throws(() => r.answer(QG, { correct: true, ms: 6000 }, T0 + DAY), (e) => e.code === 'BRAINCORE_ITEM_INELIGIBLE');
});

test('governance state ikut snapshot/import dan tetap memblokir setelah restart', () => {
  const a = Runtime.create({ level: 'A2', now: T0, enforceItemGovernance: true });
  const report = { schema: Governance.QA_SCHEMA, version: 'runtime-proof', blockingFindings: [{ itemId: QG.id, category: 'answer_integrity', severity: 'blocker' }], reviewQueue: [] };
  a.admitItem(QG, report, T0 + 1);
  const snap = a.snapshot(T0 + 2);
  assert.strictEqual(snap.governance.items[QG.id].status, Governance.STATUS.QUARANTINED);
  const b = Runtime.fromSnapshot(snap, { enforceItemGovernance: true });
  assert.strictEqual(b.itemStatus(QG).status, Governance.STATUS.QUARANTINED);
  assert.throws(() => b.answer(QG, { correct: true, ms: 6000 }, T0 + DAY), (e) => e.code === 'BRAINCORE_ITEM_INELIGIBLE');
});

test('governance() adalah salinan dan host tidak dapat membuka quarantine dengan mutasi luar', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  const report = { schema: Governance.QA_SCHEMA, version: 'runtime-proof', blockingFindings: [{ itemId: QG.id, category: 'ambiguity', severity: 'blocker' }], reviewQueue: [] };
  r.admitItem(QG, report, T0 + 1);
  const exposed = r.governance();
  exposed.items[QG.id].status = Governance.STATUS.ACTIVE;
  exposed.items[QG.id].eligible = true;
  assert.strictEqual(r.itemStatus(QG).status, Governance.STATUS.QUARANTINED);
});

test('runtime menolak waktu implisit/rusak — tidak ada Date.now tersembunyi', () => {
  const r = Runtime.create({ level: 'A2', now: T0 });
  assert.throws(() => r.answer(Q, { correct: true }, undefined), /answer now/);
  assert.throws(() => r.answer(Q, { correct: true }, NaN), /answer now/);
  assert.throws(() => r.newSession(-1), /session now/);
  assert.throws(() => r.admitItem(QG, CLEAN_QA, undefined), /admission now/);
});

test('runtime source tetap tanpa DOM, storage, network, random, dan jam internal', () => {
  const fs = require('fs');
  const src = fs.readFileSync(require.resolve('./braincore-runtime.js'), 'utf8');
  for (const banned of ['Date.now', 'Math.random', 'localStorage', 'sessionStorage', 'document.', 'window.', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
    assert.strictEqual(src.includes(banned), false, 'runtime menyentuh ' + banned);
  }
});

if (failures) {
  console.error('\nBraincoreRuntime: FAIL (' + failures + ' kegagalan)');
  process.exit(1);
}
console.log('BraincoreRuntime: PASS');
