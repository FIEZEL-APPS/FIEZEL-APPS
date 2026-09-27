#!/usr/bin/env node
/**
 * tests/policy-evidence-window-test.js — GERBANG: HASIL SESI DINILAI SETELAH BUKTINYA CUKUP.
 *
 * LUBANG YANG DITUTUP
 * -------------------
 * Audit braincore 2026-09-26 (A2): lengan kandidat verdict kebijakan adalah SATU sesi (sesi
 * adaptif dijepit 5..16 soal), sementara FiezelStatGate menolak memutus di bawah 25 per lengan.
 * Verdict selalu 'hold/underpowered', dan sejak sesi kedua pada satu sasaran semua sesi
 * berstatus 'mixed' — sesi skor 93 pun. tests/policy-outcome-test.js tidak pernah melihatnya
 * karena harness-nya tidak memuat fiezel-stat-gate.js / fiezel-policy-verdict.js.
 *
 * Gerbang ini MEMUAT keduanya, lalu menjalankan app.js yang sungguhan sesi demi sesi.
 *
 * KEPUTUSAN OWNER YANG DIKUNCI (2026-09-26, m025-375)
 * --------------------------------------------------
 *   W1  sesi pertama tidak dinilai: 'insufficient' + 'collect_more_evidence', jendela 'collecting';
 *   W2  panel Home memberi tahu berapa jawaban lagi (angka, materi, tombol lanjut);
 *   W3  jendela menutup begitu >= 25 jawaban sasaran: tanpa pembanding -> status deskriptif;
 *   W4  jendela berikutnya diputus verdict terhadap jendela sebelumnya (reject -> negative);
 *   W5  kebijakan tetap bertindak atas penilaian TERAKHIR selama jendela baru mengumpulkan;
 *   W6  verdict promote -> positive, jadi jalur naik tingkat tetap hidup;
 *   W7  sesi pendek ikut menyumbang jawaban tetapi tidak pernah menilai;
 *   W8  outcome lama tanpa field evidence dihitung sebagai pembanding, bukan jendela;
 *   W9  penyetel targetSuccess otomatis mati: affectTargetSuccess tidak membaca DecisionTrace.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const root = __fzRoot, store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} }); }
const document = { baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null, createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }), addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } } };
const localStorage = { getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const SKILL = 'past_simple_vs_present_perfect';
const T0 = Date.parse('2026-08-12T12:00:00Z');
const seeded = { version: '5.10.0', userName: 'Jahran', view: 'home', level: 3, placementDone: true, totalAnswered: 60, totalCorrect: 42, totalTimeMs: 300000, history: [], wrongAnswers: [], vocab: {}, grammar: { [SKILL]: { total: 12, correct: 8, mastery: 67, nextReview: 0, stability: 2, lastSeen: T0, lapses: 2 } }, reading: {}, daily: { date: '2026-08-12', attempts: 6, count: 5, meaningful: true }, streak: 3, adaptiveReady: true, confidenceHistory: [], learningDays: [], sessionHistory: [], adaptivePolicyMeta: { history: [] }, policyOutcomeMeta: { history: [], queue: [] } };
localStorage.setItem('fiezel-v4-state', JSON.stringify(seeded));
const fetch = async (u) => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = { console, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null, Date, Intl, Math, URL, Error, Promise, setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} } };
context.window = context; context.self = context; context.FIEZEL_VERSION = '5.18.0';
context.FIEZEL_CORE_CONFIG = { workerUrl: '', protocolVersion: '1.7', aiGateway: 'core-only', remotePushRequired: true };
context.window.scrollTo = () => {};
vm.createContext(context);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), context, { filename: rel });
run('features/i18n/fiezel-i18n.js');
for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort()) run('features/i18n/' + n);
// Inilah bedanya dengan tests/policy-outcome-test.js: modul statistik ikut dimuat, persis seperti index.html.
run('features/brain/fiezel-stat-gate.js');
run('features/brain/fiezel-policy-verdict.js');
run('app.js');

let failures = 0, checks = 0;
/** Objek dari konteks vm punya prototipe realm lain; bandingkan isinya, bukan identitas realm. */
const plain = (x) => JSON.parse(JSON.stringify(x));
function test(name, fn) { checks++; try { fn(); console.log('ok - ' + name); } catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + (e && e.message)); } }

setTimeout(() => {
  const A = context.__fiezelAudit;
  const live = () => A.liveState();
  let clock = T0;
  let seq = 0;
  /** Satu sesi adaptif sungguhan: baris riwayat + recordPolicyOutcomeFromSession. */
  function sesi(benar, total, opts) {
    const o = opts || {};
    seq++;
    const start = clock + 60000, end = start + (total + 1) * 60000;
    for (let i = 0; i < total; i++) {
      live().history.push({ id: 'h' + seq + '-' + i, type: 'grammar', skill: SKILL, target: SKILL, ok: i < benar, ms: 5000, at: start + (i + 1) * 60000 });
    }
    clock = end + 3600000;
    const answered = o.answered == null ? total : o.answered;
    return A.recordPolicyOutcomeFromSession({
      id: 'sesi-' + seq, at: new Date(end).toISOString(), startedAt: new Date(start).toISOString(), type: 'adaptive',
      planned: o.planned || total, answered, total, score: benar, accuracy: Math.round(benar / Math.max(1, total) * 100),
      completed: !o.abandoned, abandoned: !!o.abandoned, durationMs: 600000, policyId: 'p' + seq, policyMode: 'balance',
      targetSkill: SKILL, primaryDomain: 'grammar', policySource: 'local', baselineTargetMastery: 60, baselineTargetAccuracy: 60
    }, end);
  }
  const MIN = A.policyEvidenceMin();

  test('prasyarat: lantai bukti = lantai FiezelStatGate (25), modul verdict termuat', () => {
    assert.strictEqual(MIN, context.FiezelStatGate.DEFAULTS.minNPerArm);
    assert.strictEqual(MIN, 25);
    assert.ok(context.FiezelPolicyVerdict && typeof context.FiezelPolicyVerdict.verdict === 'function');
  });

  let s1;
  test('W1 · sesi kuat pertama belum dinilai: insufficient + collect_more_evidence, jendela collecting', () => {
    s1 = sesi(8, 8);
    assert.ok(s1, 'outcome tercatat');
    assert.strictEqual(s1.status, 'insufficient');
    assert.strictEqual(s1.recommendation, 'collect_more_evidence');
    assert.deepStrictEqual({ state: s1.evidence.state, n: s1.evidence.n, needed: s1.evidence.needed, basis: s1.evidence.basis },
      { state: 'collecting', n: 8, needed: MIN, basis: 'window' });
    assert.ok(s1.score >= 70, 'skor deskriptif tetap dihitung dan dilaporkan: ' + s1.score);
  });

  test('W2 · panel Home menyebut sisa jawaban, materi, dan tombol lanjut', () => {
    const p = A.policyEvidenceProgress();
    assert.deepStrictEqual({ n: p.n, needed: p.needed, remaining: p.remaining }, { n: 8, needed: MIN, remaining: MIN - 8 });
    const html = A.evidenceProgressPanelMarkup();
    assert.ok(html.includes('fz-evidence-panel'), 'panel tidak tergambar');
    assert.ok(html.includes(context.FiezelI18n.t('home.bukti-judul')), 'judul panel hilang');
    assert.ok(html.includes('Kerjakan ' + (MIN - 8) + ' soal lagi'), 'sisa soal tidak disebut: ' + html);
    assert.ok(html.includes('8/' + MIN), 'hitungan terkumpul tidak disebut');
    assert.ok(/onclick="startAdaptive\(\)"/.test(html), 'tombol lanjut latihan hilang');
    assert.ok(/role="progressbar"[^>]*aria-valuenow="8"/.test(html), 'bilah kemajuan tanpa semantik aksesibel');
    const home = A.todayHomeMarkup();
    assert.ok(home.indexOf('fz-evidence-panel') > -1, 'panel tidak dipasang di Home');
  });

  test('W3 · jendela pertama menutup pada >= 25 jawaban: tanpa pembanding -> status deskriptif', () => {
    const s2 = sesi(8, 8), s3 = sesi(8, 8);
    assert.strictEqual(s2.evidence.n, 16); assert.strictEqual(s3.evidence.n, 24);
    assert.strictEqual(s3.status, 'insufficient', 'masih 24 < 25');
    const s4 = sesi(8, 8);
    assert.strictEqual(s4.evidence.state, 'judged');
    assert.strictEqual(s4.evidence.n, 32);
    assert.strictEqual(s4.evidence.basis, 'descriptive');
    assert.strictEqual(s4.status, 'positive', 'jendela kuat tanpa pembanding dinilai positif seperti fase awal');
    assert.strictEqual(A.evidenceProgressPanelMarkup(), '', 'panel hilang begitu penilaian keluar');
  });

  let s8;
  test('W4 · jendela kedua diputus verdict terhadap jendela pertama: jauh lebih buruk -> negative', () => {
    const arms = A.policyEvidenceArms(SKILL, 'grammar', '');
    assert.deepStrictEqual(plain(arms.control), { n: 32, ok: 32 }, 'jendela yang sudah dinilai menjadi pembanding');
    assert.deepStrictEqual(plain(arms.window), { n: 0, ok: 0 });
    sesi(3, 8); sesi(3, 8); sesi(3, 8);
    s8 = sesi(3, 8);
    assert.strictEqual(s8.evidence.state, 'judged');
    assert.strictEqual(s8.evidence.basis, 'verdict');
    // Verdict mentahnya sengaja TIDAK ikut tersimpan (sanitizePolicyOutcome membuangnya): itulah
    // yang menjaga FiezelSelfTune tetap diam sampai penyambungannya diputuskan (audit A3).
    assert.strictEqual(s8.verdict, undefined, 'verdict mentah bocor ke riwayat -> FiezelSelfTune akan mulai menyetel');
    assert.strictEqual(s8.status, 'negative');
    assert.strictEqual(s8.recommendation, 'reduce_load');
  });

  test('W5 · selama jendela baru mengumpulkan, kebijakan tetap bertindak atas penilaian terakhir', () => {
    const s9 = sesi(6, 8);
    assert.strictEqual(s9.recommendation, 'collect_more_evidence');
    const input = { now: clock, snapshot: { adaptiveReady: true, totalAttempts: 120, estimatedLevel: 'B1', dueReviews: 0, domains: { grammar: { attempts: 60, accuracy: 60, recentAccuracy: 60 }, vocabulary: { attempts: 20, accuracy: 80 }, reading: { attempts: 20, accuracy: 78 } } }, evidence: { behavior: { consistency14d: 60, abandonmentRate: 10, medianResponseMs: 6000 }, confidence: { evidence: 20, gap: 10 }, memory: { dueReviews: 0, maxForgettingRisk: 20 }, skills: { weakest: [{ skill: SKILL, type: 'grammar', attempts: 10, accuracy: 45, errorRate: 55, recurringErrors: 3 }] } }, outcomes: A.recentPolicyOutcomes(10) };
    const policy = A.deriveAdaptivePolicy(input);
    assert.ok(policy.rationaleCodes.includes('recent_policy_outcome_negative'), 'penilaian negatif terakhir hilang begitu sesi berikutnya masih mengumpulkan: ' + policy.rationaleCodes.join(','));
    assert.ok(!policy.rationaleCodes.includes('recent_policy_outcome_mixed'), 'sesi yang mengumpulkan tidak boleh terbaca sebagai mixed');
  });

  test('W6 · verdict promote -> positive: jalur naik tingkat tetap hidup', () => {
    // Jendela ketiga sudah berisi 6/8 dari W5; tambah tiga sesi sempurna -> 30/32 vs pembanding 44/64.
    sesi(8, 8); sesi(8, 8);
    const last = sesi(8, 8);
    assert.strictEqual(last.evidence.state, 'judged');
    assert.strictEqual(last.evidence.basis, 'verdict');
    assert.strictEqual(last.status, 'positive');
  });

  test('W7 · sesi pendek menyumbang jawaban ke jendela tetapi tidak menilai', () => {
    const pendek = sesi(2, 2, { planned: 8, answered: 2 });
    assert.strictEqual(pendek.status, 'insufficient');
    assert.strictEqual(pendek.evidence.basis, 'short');
    assert.strictEqual(pendek.evidence.n, 2);
    const berikut = sesi(8, 8);
    assert.strictEqual(berikut.evidence.n, 10, 'jawaban sesi pendek ikut terhitung di jendela');
  });

  test('W8 · outcome lama tanpa field evidence dihitung sebagai pembanding', () => {
    const h = live().policyOutcomeMeta.history;
    const legacyOnly = [{ schema: 'fiezel-policy-outcome-v1', sessionId: 'legacy-1', targetSkill: 'legacy_skill', primaryDomain: 'grammar', targetAttempts: 10, targetAccuracy: 70, status: 'mixed', recommendation: 'adjust' }];
    const saved = h.splice(0, h.length, ...legacyOnly);
    try {
      const arms = A.policyEvidenceArms('legacy_skill', 'grammar', '');
      assert.deepStrictEqual(plain(arms.control), { n: 10, ok: 7 });
      assert.deepStrictEqual(plain(arms.window), { n: 0, ok: 0 });
    } finally { h.splice(0, h.length, ...saved); }
  });

  test('W9 · penyetel targetSuccess otomatis mati: affectTargetSuccess tidak membaca parameter DecisionTrace', () => {
    const prev = context.FiezelDecisionTrace;
    context.FiezelDecisionTrace = { readParams: () => ({ 'difficulty.targetSuccess': 0.9 }) };
    try { assert.strictEqual(A.affectTargetSuccess(), 0.8, 'setelan 0.90 sisa penyetel lama masih dibaca'); }
    finally { context.FiezelDecisionTrace = prev; }
  });

  test('gate ini terdaftar di CI', () => {
    const wf = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
    assert.ok(wf.includes('node tests/policy-evidence-window-test.js'), 'gate yang tidak berjalan di CI bukan gate');
  });

  console.log('');
  if (failures) { console.error('FIEZEL policy evidence window: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
  console.log('FIEZEL policy evidence window: PASS (' + checks + ' uji · bukti dikumpulkan sampai ' + MIN + ' jawaban sebelum dinilai)');
}, 350);
