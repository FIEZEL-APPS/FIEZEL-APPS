/**
 * FIEZEL R6 gate — observability tanpa riwayat jawaban mentah.
 *
 * Roadmap R6 mensyaratkan observability yang tidak membawa riwayat jawaban. Aplikasi ini
 * sudah punya banyak penghasil laporan: creator report, snapshot Learner Evidence, payload
 * adaptive policy, ringkasan policy outcome, laporan diagnostik, proyeksi skill, health
 * check, dan modul roadmap. Masing-masing sudah menyatakan dirinya aman.
 *
 * Yang belum ada adalah pemeriksaan yang MELIHAT SEMUANYA SEKALIGUS. Jaminan privasi runtuh
 * bukan karena satu modul ceroboh, melainkan karena satu field baru ditambahkan di satu
 * tempat dan tidak ada yang memeriksa gabungannya lagi. Gate ini menanam kalimat soal,
 * jawaban yang dipilih, transkrip, dan endpoint ke dalam state, lalu menuntut tidak satu pun
 * muncul di keluaran yang bisa keluar dari perangkat atau ditempel ke chat.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __dirname, store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, click() {} }); }
const document = {
  baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, remove() {}, click() {} }),
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }
};
const localStorage = { getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };

const NOW = Date.parse('2026-08-20T10:00:00Z'), DAY = 86400000;

// Penanda yang sengaja mencolok. Kalau salah satu muncul di laporan mana pun, kebocorannya
// pasti nyata dan bukan kebetulan kata umum.
const RAHASIA = {
  pertanyaan: 'KALIMAT-SOAL-RAHASIA-XYZ',
  jawabanDipilih: 'JAWABAN-DIPILIH-RAHASIA-XYZ',
  jawabanBenar: 'JAWABAN-BENAR-RAHASIA-XYZ',
  transkrip: 'TRANSKRIP-SUARA-RAHASIA-XYZ',
  endpoint: 'https://rahasia-endpoint-xyz.puter.work'
};

const history = [];
for (let i = 0; i < 30; i++) {
  history.push({
    id: 'h' + i, type: i % 3 === 0 ? 'grammar' : i % 3 === 1 ? 'reading' : 'vocab',
    skill: i % 3 === 0 ? 'present_perfect' : 'reading_inference', target: 'present_perfect',
    ok: i % 4 !== 0, ms: 7000, confidence: 2, errorTag: 'present_perfect', at: NOW - (i % 10) * DAY
  });
}
localStorage.setItem('fiezel-v4-state', JSON.stringify({
  version: '5.23.0', userName: 'Jahran', view: 'home', level: 3, placementDone: true, adaptiveReady: true,
  totalAnswered: history.length, totalCorrect: history.filter(x => x.ok).length, totalTimeMs: 210000,
  history,
  wrongAnswers: [{ question: RAHASIA.pertanyaan, selectedAnswer: RAHASIA.jawabanDipilih, correct: RAHASIA.jawabanBenar, skill: 'present_perfect', target: 'present_perfect', type: 'grammar', errorTag: 'present_perfect', at: NOW - DAY }],
  vocab: { academic_vocab: { total: 8, correct: 5, mastery: 63, nextReview: NOW - DAY, stability: 1, lastSeen: NOW - 4 * DAY, lapses: 2 } },
  grammar: { present_perfect: { total: 12, correct: 6, mastery: 50, nextReview: NOW - DAY, stability: 1, lastSeen: NOW - DAY, lapses: 3 } },
  reading: { r1: { total: 6, correct: 3, mastery: 50, nextReview: NOW - DAY, stability: 1, lastSeen: NOW - 6 * DAY, lapses: 2 } },
  daily: { date: '', attempts: 2, count: 2, meaningful: false }, streak: 3,
  confidenceHistory: history.map(x => ({ confidence: x.confidence, ok: x.ok, at: x.at, skill: x.skill, type: x.type })),
  learningDays: ['2026-08-19'], sessionHistory: [{ id: 's1', at: new Date(NOW - DAY).toISOString(), completed: true, abandoned: false, policyId: 'p1', planned: 10, answered: 10, accuracy: 70 }],
  activeSession: null,
  preferences: { reportEndpoint: RAHASIA.endpoint, reportConsent: true }
}));
// Sidecar Speaking/Listening: transkrip TIDAK pernah disimpan produk, tetapi ditanam di sini
// supaya gate membuktikan proyeksi R3 tidak meneruskan field asing sekalipun ada.
localStorage.setItem('fiezel-sl-v1-state', JSON.stringify({
  schema: 'fiezel-sl-v1', version: 1, updatedAt: NOW - 3600000,
  events: [{ id: 'sl-1', at: NOW - 3600000, domain: 'speaking', itemId: 'S-1', level: 'A2', mode: 'response', score: 62, passed: true, responseMs: 9000, metric: 'keyword_coverage', transcript: RAHASIA.transkrip, rawAudioStored: false, rawTranscriptStored: false }],
  listening: {}, speaking: { attempts: 1, passed: 1, scoreSum: 62 }, capabilityEvents: {}
}));

const fetchMock = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = {
  console, document, localStorage, fetch: fetchMock, location: { href: 'http://localhost/' }, navigator: {},
  window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout, crypto: globalThis.crypto,
  TextEncoder, TextDecoder, Blob: function () {}, setInterval: () => ({ unref() {} }), clearInterval() {},
  Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
};
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);
for (const file of [
  'core-config.js',
  'features/speaking-listening/speaking-listening-config.js',
  'features/skills-evidence/fiezel-skills-evidence.js',
  'features/academic-readiness/fiezel-academic-readiness.js',
  'features/personal-journey/fiezel-personal-journey.js',
  'features/continuity/fiezel-continuity.js',
  'features/health/fiezel-install-health.js',
  'app.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

function assertBersih(nama, value, { izinkanEndpoint = false } = {}) {
  const dump = JSON.stringify(value ?? null);
  for (const [kunci, penanda] of Object.entries(RAHASIA)) {
    if (izinkanEndpoint && kunci === 'endpoint') continue;
    assert.ok(dump.indexOf(penanda) === -1, `${nama} membocorkan ${kunci}`);
  }
}

setTimeout(async () => {
  const A = context.__fiezelAudit;

  test('penanda rahasia benar-benar ada di state, supaya gate ini tidak lulus kosong', () => {
    // Tanpa pemeriksaan ini, seluruh gate bisa lulus hanya karena datanya tidak pernah masuk.
    const state = JSON.parse(localStorage.getItem('fiezel-v4-state'));
    assert.strictEqual(state.wrongAnswers[0].question, RAHASIA.pertanyaan);
    assert.strictEqual(state.preferences.reportEndpoint, RAHASIA.endpoint);
    const sl = JSON.parse(localStorage.getItem('fiezel-sl-v1-state'));
    assert.strictEqual(sl.events[0].transcript, RAHASIA.transkrip);
  });

  test('payload yang dikirim keluar perangkat tidak membawa jawaban mentah', () => {
    assertBersih('remoteLearnerEvidenceSnapshot', A.remoteLearnerEvidenceSnapshot(NOW));
    assertBersih('adaptivePolicyRequestPayload', A.adaptivePolicyRequestPayload(NOW));
    assertBersih('policyOutcomeSummary', A.policyOutcomeSummary());
    // Creator report memang boleh membawa endpoint tujuannya sendiri; yang dilarang adalah
    // isi jawaban.
    assertBersih('buildCreatorReport', A.buildCreatorReport('manual'), { izinkanEndpoint: true });
  });

  test('model bukti lokal pun tidak menyalin teks soal', () => {
    // Model ini tidak dikirim keluar, tetapi ia sumber dari yang dikirim. Kalau teks soal
    // masuk ke sini, kebocorannya tinggal menunggu satu field baru diteruskan.
    assertBersih('buildLearnerEvidenceModel', A.buildLearnerEvidenceModel(NOW));
    assertBersih('buildLearningSnapshot', A.buildLearningSnapshot());
    assertBersih('diagnosticReport', A.diagnosticReport());
  });

  test('proyeksi Speaking/Listening tidak meneruskan field asing dari sidecar', () => {
    const projector = context.FiezelSkillsEvidence;
    const projeksi = projector.projectSkillsEvidence({ state: projector.readSidecarState(context), now: NOW });
    assertBersih('projectSkillsEvidence', projeksi);
    assert.strictEqual(projeksi.domains.speaking.attempts, 1, 'buktinya tetap terbaca, hanya isinya yang tidak ikut');
  });

  test('modul roadmap tidak menyentuh isi jawaban', () => {
    const journey = context.FiezelPersonalJourney, academic = context.FiezelAcademicReadiness;
    const evidence = A.buildLearnerEvidenceModel(NOW), snapshot = A.buildLearningSnapshot();
    const policy = A.buildAdaptivePolicy(NOW);
    const mission = journey.buildWeeklyMission({ evidence, policy, snapshot, now: NOW });
    assertBersih('buildWeeklyMission', mission);
    assertBersih('buildTodayPlan', journey.buildTodayPlan({ mission, evidence, policy, now: NOW }));
    assertBersih('buildFoundationMap', academic.buildFoundationMap({ snapshot, evidence, now: NOW }));
    assertBersih('buildScholarshipLab', academic.buildScholarshipLab({ snapshot, now: NOW }));
  });

  test('laporan kesehatan instalasi hanya soal pemasangan', async () => {
    const report = await A.readInstallHealth(NOW);
    assertBersih('readInstallHealth', report);
    assert.strictEqual(report.privacy.learningContentIncluded, false);
  });

  test('markup yang tampil di layar diagnostik juga bersih', () => {
    assertBersih('unifiedSkillsMarkup', A.unifiedSkillsMarkup(NOW));
    assertBersih('academicReadinessMarkup', A.academicReadinessMarkup(NOW));
    assertBersih('installHealthReportMarkup', A.installHealthReportMarkup({ schema: 'fiezel-install-health-v1', status: 'healthy', findings: [], privacy: {} }));
  });

  test('backup adalah pengecualian yang disengaja, dan tetap tidak membawa endpoint', () => {
    // Backup memang berisi progres milik pengguna sendiri - itu gunanya. Yang tetap dilarang
    // adalah kredensial dan endpoint pengiriman.
    const file = A.buildBackupFile(NOW);
    const dump = JSON.stringify(file.payload);
    assert.ok(dump.indexOf(RAHASIA.endpoint) === -1, 'endpoint laporan tidak boleh ikut ke backup');
    assert.ok(dump.indexOf(RAHASIA.pertanyaan) !== -1, 'backup memang menyimpan progres pengguna, termasuk soal yang salah');
  });

  test('setiap payload keluar menyatakan jaminan privasinya sendiri', () => {
    const remote = A.remoteLearnerEvidenceSnapshot(NOW);
    assert.strictEqual(remote.privacy.rawAnswersIncluded, false);
    assert.strictEqual(remote.privacy.rawHistoryIncluded, false);
    const outcome = A.policyOutcomeSummary();
    assert.ok(outcome.rows.every(r => r.privacy.rawAnswersIncluded === false));
  });

  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL observability privacy: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL observability privacy: PASS');
}, 400);
