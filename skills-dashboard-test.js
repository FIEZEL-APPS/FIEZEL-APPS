/**
 * FIEZEL R3 gate — dashboard Bukti Skill Terpadu.
 *
 * Roadmap R3 mensyaratkan dashboard yang MEMBEDAKAN tiga hal: skor latihan, cakupan target,
 * dan kemampuan yang belum dapat diukur. Gate ini menguji pembedaan itu pada markup yang
 * benar-benar sampai ke layar, karena di situlah ketiganya paling mudah tertukar.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __dirname, store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, onclick: null }); }
const document = {
  baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {}, style: {} }),
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } }
};
const localStorage = { getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };

const NOW = Date.parse('2026-08-20T05:00:00Z'), DAY = 86400000;
const history = [];
for (let i = 0; i < 12; i++) history.push({ id: 'h' + i, type: 'grammar', skill: 'present_perfect', target: 'present_perfect', ok: i % 3 !== 0, ms: 7000, confidence: 2, errorTag: 'present_perfect', at: NOW - (i % 6) * DAY });
localStorage.setItem('fiezel-v4-state', JSON.stringify({
  version: '5.10.0', userName: 'Jahran', view: 'progress', level: 3, placementDone: true, adaptiveReady: true,
  totalAnswered: history.length, totalCorrect: history.filter(x => x.ok).length, totalTimeMs: 84000, history, wrongAnswers: [],
  vocab: {}, grammar: { present_perfect: { total: 12, correct: 8, mastery: 66, nextReview: NOW + DAY, stability: 2, lastSeen: NOW - DAY, lapses: 1 } }, reading: {},
  daily: { date: '', attempts: 0, count: 0, meaningful: false }, streak: 3, confidenceHistory: [], learningDays: [], sessionHistory: [], activeSession: null, preferences: {}
}));

// Bukti latihan Speaking/Listening hidup di sidecar terpisah - persis situasi yang R3 ada
// untuk menjembataninya.
function slEvent(over) {
  return Object.assign({
    id: 'sl-1', at: NOW - 3600000, domain: 'listening', itemId: 'L-1', level: 'A2', mode: 'gist',
    score: 70, passed: true, responseMs: 8000, metric: 'keyword_coverage', rawAudioStored: false, rawTranscriptStored: false
  }, over || {});
}
localStorage.setItem('fiezel-sl-v1-state', JSON.stringify({
  schema: 'fiezel-sl-v1', version: 1, updatedAt: NOW - 1800000,
  events: [
    slEvent({ id: 'a', itemId: 'L-1', score: 80 }),
    slEvent({ id: 'b', itemId: 'L-2', score: 40, passed: false, responseMs: 14000 }),
    slEvent({ id: 'c', domain: 'speaking', itemId: 'S-1', score: 60, passed: true, responseMs: 11000, mode: 'response' })
  ],
  listening: { attempts: 2, passed: 1, scoreSum: 120 }, speaking: { attempts: 1, passed: 1, scoreSum: 60 }, capabilityEvents: {}
}));

const fetchMock = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = {
  console, document, localStorage, fetch: fetchMock, location: { href: 'http://localhost/' }, navigator: {},
  window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout,
  setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' },
  SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
};
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);
for (const file of [
  'features/speaking-listening/speaking-listening-config.js',
  'features/skills-evidence/fiezel-skills-evidence.js',
  'features/academic-readiness/fiezel-academic-readiness.js',
  'features/personal-journey/fiezel-personal-journey.js',
  'app.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

setTimeout(() => {
  const A = context.__fiezelAudit;
  const markup = A.unifiedSkillsMarkup(NOW);
  const evidence = A.buildLearnerEvidenceModel(NOW);

  test('bukti sidecar benar-benar sampai ke Learner Evidence', () => {
    assert.ok(evidence.skills.spoken, 'proyeksi R3 hadir di model bukti');
    assert.strictEqual(evidence.skills.spoken.listening.attempts, 2);
    assert.strictEqual(evidence.skills.spoken.speaking.attempts, 1);
    assert.strictEqual(evidence.skills.spoken.listening.practiceScore, 60, '(80+40)/2');
  });

  test('penggabungan tidak merusak bukti lama', () => {
    assert.strictEqual(evidence.schema, 'fiezel-learner-evidence-v1');
    assert.ok(evidence.behavior && typeof evidence.behavior.consistency14d === 'number');
    assert.ok(evidence.skills.measured >= 1, 'bukti skill dari state utama tetap ada');
    assert.ok(Array.isArray(evidence.skills.weakest));
  });

  test('proyeksi tidak diam-diam ikut terkirim ke Core Brain', () => {
    // Menambahkan bukti ke model lokal adalah satu keputusan; mengirimkannya keluar adalah
    // keputusan lain yang belum diambil. Snapshot remote menyusun field-nya secara eksplisit,
    // dan gate ini menjaga agar itu tetap begitu.
    const remote = A.remoteLearnerEvidenceSnapshot(NOW);
    assert.strictEqual(remote.skills.spoken, undefined, 'spoken tidak boleh ikut ke payload remote');
    assert.ok(!/practiceScore|targetCoverage/.test(JSON.stringify(remote)));
    assert.strictEqual(remote.privacy.rawAnswersIncluded, false);
  });

  test('dashboard memisahkan skor latihan dari cakupan target', () => {
    assert.ok(/skor latihan/i.test(markup));
    assert.ok(/Cakupan target/i.test(markup));
    // Keduanya harus muncul sebagai kolom sendiri-sendiri, bukan satu angka gabungan.
    assert.ok(markup.indexOf('60%') !== -1, 'skor latihan listening');
    assert.ok(/2 dari 36 materi/.test(markup), 'cakupan memakai penyebut bank soal');
  });

  test('yang belum dapat diukur disebut namanya, bukan disembunyikan', () => {
    assert.ok(/Belum dapat diukur/i.test(markup));
    assert.ok(/jumlah pengulangan audio/i.test(markup), 'replay count dinyatakan terbuka');
    assert.ok(!/replayCount/.test(markup), 'nama internal tidak bocor ke layar');
  });

  test('dashboard tidak pernah menyebut skor pengucapan', () => {
    assert.ok(!/pengucapan/i.test(markup.replace(/tidak menilai pengucapan/i, '')));
    assert.ok(/tidak menilai pengucapan/i.test(markup), 'penyangkalan eksplisit ada di layar');
    assert.ok(!/rekaman suara(?! atau transkrip)/i.test(markup.replace(/tidak menyimpan rekaman suara atau transkrip/i, '')));
  });

  test('tidak ada id item, metrik, atau transkrip yang bocor ke layar', () => {
    for (const leak of ['L-1', 'L-2', 'S-1', 'keyword_coverage', 'transcript']) {
      assert.ok(markup.indexOf(leak) === -1, `${leak} bocor ke dashboard`);
    }
  });

  test('skill tanpa latihan ditulis apa adanya', () => {
    store['fiezel-sl-v1-state'] = JSON.stringify({ schema: 'fiezel-sl-v1', version: 1, updatedAt: 0, events: [], listening: {}, speaking: {}, capabilityEvents: {} });
    const kosong = A.unifiedSkillsMarkup(NOW);
    assert.ok(/Belum ada latihan tercatat/.test(kosong));
    assert.ok(!/0%/.test(kosong), 'jangan menampilkan nol untuk latihan yang belum ada');
  });

  test('sidecar rusak tidak menjatuhkan halaman', () => {
    store['fiezel-sl-v1-state'] = 'bukan json';
    const rusak = A.unifiedSkillsMarkup(NOW);
    assert.ok(typeof rusak === 'string' && rusak.length > 0);
    assert.ok(/Belum ada latihan tercatat/.test(rusak));
  });

  test('kartu kesiapan akademik R4 tampil dari bukti nyata', () => {
    const markup = A.academicReadinessMarkup(NOW);
    assert.ok(/Prasyarat fondasi akademik/.test(markup));
    assert.ok(/Jalur reading akademik/.test(markup));
    assert.ok(/Lab komunikasi beasiswa/.test(markup));
    // State uji hanya punya bukti grammar, jadi sebagian besar prasyarat belum terukur -
    // dan itu harus tertulis sebagai "Belum terukur", bukan "Belum terpenuhi".
    assert.ok(/Belum terukur/.test(markup));
    assert.ok(/bacaan bertema sains/.test(markup), 'jalur reading memakai bank yang benar-benar ada');
  });

  test('kartu kesiapan tidak menjanjikan skor ujian', () => {
    const markup = A.academicReadinessMarkup(NOW);
    assert.ok(/tidak memprediksi skor/i.test(markup), 'penyangkalan tampil di layar');
    assert.ok(!/\bband\b|\b[4-9]\.[05]\b/i.test(markup));
    assert.ok(/tidak akan melabeli ulang/i.test(markup), 'jalur kosakata jujur soal konten yang belum ada');
  });

  test('halaman tetap hidup kalau modul R4 tidak termuat', () => {
    const backup = context.FiezelAcademicReadiness;
    context.FiezelAcademicReadiness = undefined;
    try {
      const markup = A.academicReadinessMarkup(NOW);
      assert.ok(/belum tersedia/i.test(markup), 'pesan jelas, bukan crash');
    } finally { context.FiezelAcademicReadiness = backup; }
  });

  console.log('');
  if (failures) { console.error('FIEZEL skills dashboard: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL skills dashboard: PASS');
}, 350);
