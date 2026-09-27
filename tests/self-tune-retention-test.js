#!/usr/bin/env node
/**
 * tests/self-tune-retention-test.js — GERBANG: PENYETEL RESMI DIUKUR RETENSI, BUKAN AKURASI.
 *
 * LUBANG YANG DITUTUP (audit braincore A3, keputusan OWNER 2026-09-27: "ganti ukuran dulu")
 * --------------------------------------------------------------------------------------
 * FiezelSelfTune.propose() menaikkan difficulty.targetSuccess (soal lebih mudah) setiap
 * verdict 'promote' atas AKURASI sesi — angka yang langsung dinaikkan oleh perubahan itu
 * sendiri. Menyambungkannya apa adanya ke pemilihan soal berarti mengulang penyetel tanpa
 * pagar yang baru dimatikan (A1), hanya lebih lambat. Yang disambung adalah experiment():
 * lesson dibagi ke dua lengan (FiezelNof1.assign), dan pemutusnya RETENSI TERTUNDA dari probe
 * 3/7/21 hari (FiezelPostTest) pada lesson yang dikuasai SESUDAH percobaan dimulai.
 *
 * YANG DIKUNCI
 * ------------
 *   M1  percobaan pertama mencoba LEBIH SULIT (0.80 -> 0.78), di dalam batas TUNABLE;
 *   M2  tanpa bukti / verdict hold -> tetap mengumpulkan, tidak ada yang bergeser;
 *   M3  promote -> nilai berlaku pindah, arah dipertahankan;
 *   M4  reject -> nilai berlaku tetap, arah dibalik (percobaan berikut mencoba lebih mudah);
 *   M5  penjaga prediksi: retensi lolos tetapi Brier kandidat naik > 0.05 -> ditolak;
 *   M6  percobaan > 120 hari tanpa putusan kadaluwarsa tanpa perubahan;
 *   M7  halt mengalahkan segalanya; M8 di batas bawah arahnya dibalik;
 *   M9  arah MUDAH butuh superioritas: retensi setara yang cukup untuk menerima arah sulit
 *       TIDAK cukup untuk menerima arah mudah (verdict FiezelPolicyVerdict sungguhan);
 *   A1  app.js: percobaan dimulai sesudah outcome sesi, state disimpan per murid (sideStateKey),
 *       ledger mencatat experiment_started;
 *   A2  affectTargetSuccess memakai nilai kandidat hanya untuk lesson lengan kandidat;
 *   A3  lengan retensi hanya menghitung lesson yang dikuasai sesudah percobaan dimulai;
 *   A4  bukti retensi cukup -> diputus, ledger berantai tetap sah (verify ok);
 *   A5  akurasi sesi setinggi apa pun TIDAK pernah memindahkan nilai berlaku.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __fzRoot;
const T = require(path.join(root, 'features', 'brain', 'fiezel-self-tune.js'));
const V = require(path.join(root, 'features', 'brain', 'fiezel-policy-verdict.js'));
const DAY = 86400000, T0 = Date.parse('2026-09-01T08:00:00Z');

let failures = 0, checks = 0;
function test(name, fn) { checks++; try { fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); } }
const plain = (x) => JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------------ modul murni
test('M1 · percobaan pertama mencoba lebih sulit, di dalam batas', () => {
  const r = T.experiment({}, {}, T0);
  assert.strictEqual(r.decision, 'start');
  assert.deepStrictEqual(r.change, { path: 'difficulty.targetSuccess', from: 0.8, to: 0.78, direction: -1 });
  assert.strictEqual(r.state.experiment.id, 'tune-difficulty.targetSuccess-' + T0, 'id deterministik dari waktu mulai');
});

test('M2 · tanpa bukti atau verdict hold: tetap mengumpulkan', () => {
  const s = T.experiment({}, {}, T0).state;
  assert.strictEqual(T.experiment(s, {}, T0 + DAY).decision, 'hold');
  assert.strictEqual(T.experiment(s, { verdict: { decision: 'hold' } }, T0 + DAY).rationale, 'brain4_tune_hold_verdict_hold');
  assert.strictEqual(T.baselineOf(s, 'difficulty.targetSuccess'), 0.8);
});

test('M3 · promote: nilai berlaku pindah, arah dipertahankan', () => {
  const s = T.experiment({}, {}, T0).state;
  const r = T.experiment(s, { verdict: { decision: 'promote' } }, T0 + 30 * DAY);
  assert.strictEqual(r.decision, 'promote');
  assert.strictEqual(r.state.baseline['difficulty.targetSuccess'], 0.78);
  assert.strictEqual(r.state.experiment, null);
  assert.strictEqual(T.experiment(r.state, {}, T0 + 31 * DAY).change.to, 0.76, 'percobaan berikut melanjutkan arah yang berhasil');
});

test('M4 · reject: nilai berlaku tetap, arah dibalik', () => {
  const s = T.experiment({}, {}, T0).state;
  const r = T.experiment(s, { verdict: { decision: 'reject' } }, T0 + 30 * DAY);
  assert.strictEqual(r.decision, 'reject');
  assert.strictEqual(T.baselineOf(r.state, 'difficulty.targetSuccess'), 0.8);
  assert.strictEqual(T.experiment(r.state, {}, T0 + 31 * DAY).change.to, 0.82, 'setelah arah sulit ditolak, arah mudah dicoba');
});

test('M5 · penjaga prediksi: retensi lolos tetapi tebakan jelas lebih meleset -> ditolak', () => {
  const s = T.experiment({}, {}, T0).state;
  const r = T.experiment(s, { verdict: { decision: 'promote' }, brier: { control: 0.12, candidate: 0.2 } }, T0 + 30 * DAY);
  assert.strictEqual(r.decision, 'reject');
  assert.strictEqual(r.rationale, 'brain4_tune_reject_prediction_worse');
  assert.strictEqual(T.baselineOf(r.state, 'difficulty.targetSuccess'), 0.8);
});

test('M6 · percobaan tanpa putusan > 120 hari kadaluwarsa tanpa perubahan', () => {
  const s = T.experiment({}, {}, T0).state;
  assert.strictEqual(T.experiment(s, {}, T0 + 119 * DAY).decision, 'hold');
  const r = T.experiment(s, {}, T0 + 121 * DAY);
  assert.strictEqual(r.decision, 'expire');
  assert.strictEqual(T.baselineOf(r.state, 'difficulty.targetSuccess'), 0.8);
});

test('M7 · halt mengalahkan segalanya, termasuk promote', () => {
  const s = Object.assign(T.experiment({}, {}, T0).state, { halt: true });
  const r = T.experiment(s, { verdict: { decision: 'promote' } }, T0 + 30 * DAY);
  assert.strictEqual(r.decision, 'hold');
  assert.strictEqual(r.rationale, 'brain4_tune_halted');
});

test('M8 · di batas bawah arah sulit mustahil -> arah dibalik, tidak pernah keluar batas', () => {
  const r = T.experiment({ baseline: { 'difficulty.targetSuccess': 0.7 } }, {}, T0);
  assert.strictEqual(r.change.to, 0.72);
  const junk = T.experiment({ baseline: { 'difficulty.targetSuccess': 5 } }, {}, T0);
  assert.ok(junk.change.to <= 0.9 && junk.change.to >= 0.7, 'nilai korup dijepit ke batas: ' + junk.change.to);
});

test('M9 · arah mudah butuh superioritas: retensi setara cukup untuk arah sulit, TIDAK untuk arah mudah', () => {
  const setara = { control: { n: 1000, ok: 900 }, candidate: { n: 1000, ok: 900 } };
  assert.strictEqual(V.verdict(Object.assign({ margin: T.marginFor(-1) }, setara)).decision, 'promote', 'arah sulit: tidak lebih buruk = diterima');
  assert.notStrictEqual(V.verdict(Object.assign({ margin: T.marginFor(1) }, setara)).decision, 'promote', 'arah mudah: setara belum cukup');
});

// ------------------------------------------------------------------ app.js sungguhan
const store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} }); }
const document = { baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } } };
const localStorage = { getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const SKILL = 'past_simple_vs_present_perfect';
localStorage.setItem('fiezel-v4-state', JSON.stringify({ version: '5.10.0', userName: 'Jahran', view: 'home', level: 3, placementDone: true, totalAnswered: 60, totalCorrect: 42, totalTimeMs: 300000, history: [], wrongAnswers: [], vocab: {}, grammar: {}, reading: {}, daily: { date: '2026-09-01', attempts: 0, count: 0 }, streak: 1, adaptiveReady: true, confidenceHistory: [], learningDays: [], sessionHistory: [], adaptivePolicyMeta: { history: [] }, policyOutcomeMeta: { history: [], queue: [] } }));
const fetch = async (u) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = { console, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null, Date, Intl, Math, URL, Error, Promise, setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} } };
context.window = context; context.self = context; context.FIEZEL_VERSION = '5.18.0';
context.FIEZEL_CORE_CONFIG = { workerUrl: '', protocolVersion: '1.7', aiGateway: 'core-only', remotePushRequired: true };
context.window.scrollTo = () => {};
vm.createContext(context);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
run('features/i18n/fiezel-i18n.js');
for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort()) run('features/i18n/' + n);
for (const m of ['fiezel-stat-gate.js', 'fiezel-policy-verdict.js', 'fiezel-nof1.js', 'fiezel-param-ledger.js', 'fiezel-self-tune.js', 'fiezel-retention-probe.js']) run('features/brain/' + m);
run('app.js');

setTimeout(() => {
  const A = context.__fiezelAudit, live = () => A.liveState();
  const selfTuneKey = A.sideStateKey(A.SELF_TUNE_KEY), probeKey = A.sideStateKey(A.RETENTION_PROBE_KEY);
  const outcome = { schema: 'fiezel-policy-outcome-v1', status: 'positive', recommendation: 'keep_or_progress' };
  let exp;

  test('A1 · outcome sesi memulai percobaan; state per murid; ledger mencatat experiment_started', () => {
    const r = A.selfTuneAfterOutcome(outcome, T0);
    assert.strictEqual(r && r.decision, 'start');
    const st = A.loadSelfTuneState();
    exp = st.experiment;
    assert.strictEqual(exp.candidate, 0.78);
    assert.ok(store[selfTuneKey], 'state disimpan lewat sideStateKey(SELF_TUNE_KEY)');
    assert.ok(context.FiezelParamLedger.verify(st.ledger).ok, 'ledger berantai sah');
    assert.ok(st.ledger.entries.some((e) => e.event === 'experiment_started' && e.to === 0.78));
  });

  const lessons = Array.from({ length: 90 }, (_, i) => 'lesson-' + i);
  const armOf = (l) => context.FiezelNof1.assign(l, exp.id);

  test('A2 · affectTargetSuccess memakai nilai kandidat hanya untuk lesson lengan kandidat', () => {
    const cand = lessons.find((l) => armOf(l) === 'candidate'), ctrl = lessons.find((l) => armOf(l) === 'control');
    live().activeSession = { id: 'x', startedAt: T0, targetSkill: cand };
    assert.strictEqual(A.affectTargetSuccess(), 0.78);
    live().activeSession = { id: 'x', startedAt: T0, targetSkill: ctrl };
    assert.strictEqual(A.affectTargetSuccess(), 0.8);
    live().activeSession = null;
    assert.strictEqual(A.affectTargetSuccess(), 0.8, 'tanpa sesi: nilai berlaku');
  });

  function seedProbes(list) {
    const probes = {};
    for (const p of list) {
      probes[p.lesson] = { masteredAt: p.masteredAt, probes: [{ offsetDays: 3, jitterDays: 0, dueAt: p.masteredAt + 3 * DAY }] };
      live().history.push({ id: 'p-' + p.lesson, type: 'grammar', skill: p.lesson, ok: p.ok, ms: 4000, predicted: p.predicted, at: p.masteredAt + 3 * DAY + 60000 });
    }
    store[probeKey] = JSON.stringify({ schema: 'fiezel-post-test-v1', userSeed: 1, probes });
  }

  test('A3 · lengan retensi hanya menghitung lesson yang dikuasai sesudah percobaan dimulai', () => {
    const before = lessons.slice(0, 10).map((l) => ({ lesson: l, masteredAt: T0 - 5 * DAY, ok: true, predicted: 0.9 }));
    const after = lessons.slice(10, 20).map((l) => ({ lesson: l, masteredAt: T0 + DAY, ok: true, predicted: 0.9 }));
    seedProbes(before.concat(after));
    const arms = plain(A.selfTuneRetentionArms(exp, T0 + 10 * DAY));
    assert.strictEqual(arms.control.n + arms.candidate.n, 10, 'lesson yang dikuasai sebelum percobaan ikut terhitung: ' + JSON.stringify(arms));
  });

  test('A4 · retensi lengan sulit tidak lebih buruk (jelas) -> diterima; ledger mencatat dan tetap sah', () => {
    live().history = [];
    // Lengan kandidat (lebih sulit) mengingat semua; lengan kontrol 80% - non-inferioritas pasti lolos.
    let c = 0;
    seedProbes(lessons.map((l, i) => {
      const cand = armOf(l) === 'candidate';
      const ok = cand ? true : (c++ % 5 !== 0);
      return { lesson: l, masteredAt: T0 + DAY + i * 60000, ok, predicted: ok ? 0.85 : 0.6 };
    }));
    const arms = plain(A.selfTuneRetentionArms(exp, T0 + 20 * DAY));
    assert.ok(arms.control.n >= 25 && arms.candidate.n >= 25, 'prasyarat: kedua lengan >= 25: ' + JSON.stringify(arms));
    const r = A.selfTuneAfterOutcome(outcome, T0 + 20 * DAY);
    assert.strictEqual(r && r.decision, 'promote', 'keputusan: ' + (r && r.decision) + ' ' + (r && r.rationale));
    const st = A.loadSelfTuneState();
    assert.strictEqual(context.FiezelSelfTune.baselineOf(st, 'difficulty.targetSuccess'), 0.78);
    assert.ok(context.FiezelParamLedger.verify(st.ledger).ok, 'ledger berantai tetap sah');
    assert.ok(st.ledger.entries.some((e) => e.event === 'param_applied' && e.to === 0.78), 'penerimaan tidak tercatat di ledger');
    assert.ok(st.ledger.entries.some((e) => e.event === 'experiment_ended'), 'akhir percobaan tidak tercatat');
    live().activeSession = null;
    assert.strictEqual(A.affectTargetSuccess(), 0.78, 'nilai berlaku baru dipakai pemilihan soal');
  });

  test('A5 · akurasi sesi setinggi apa pun tidak pernah memindahkan nilai berlaku tanpa bukti retensi', () => {
    for (const k of Object.keys(store)) if (k.indexOf('fiezel-self-tune') === 0 || k.indexOf('fiezel-post-test') === 0) delete store[k];
    live().history = [];
    for (let i = 0; i < 40; i++) A.selfTuneAfterOutcome({ ...outcome, accuracy: 100, score: 100 }, T0 + i * DAY);
    const st = A.loadSelfTuneState();
    assert.strictEqual(context.FiezelSelfTune.baselineOf(st, 'difficulty.targetSuccess'), 0.8, 'nilai berlaku bergeser tanpa satu pun probe retensi');
  });

  test('gate ini terdaftar di CI', () => {
    const wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
    assert.ok(wf.includes('node tests/self-tune-retention-test.js'), 'gate yang tidak berjalan di CI bukan gate');
  });

  console.log('');
  if (failures) { console.error('FIEZEL self-tune retention: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
  console.log('FIEZEL self-tune retention: PASS (' + checks + ' uji · penyetel resmi diukur retensi tertunda, dua arah, berpagar)');
}, 350);
