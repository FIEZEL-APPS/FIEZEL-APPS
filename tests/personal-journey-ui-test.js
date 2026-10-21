const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * FIEZEL R2 gate — Personal Learning Journey di Home.
 *
 * Gate ini menjaga satu hal yang tidak kelihatan dari test engine: apa yang benar-benar
 * SAMPAI ke layar. Rencana boleh benar di dalam modul, tetapi kalau Home menampilkan angka
 * untuk skill yang belum pernah diukur, atau menjanjikan skor ujian, produknya tetap salah.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __fzRoot, store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, onclick: null }); }
const document = {
  baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {}, style: {} }),
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } }
};
const localStorage = { getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };

const now = Date.parse('2026-08-19T05:00:00Z'), day = 86400000, h = [];
for (let i = 0; i < 30; i++) {
  const type = i % 3 === 0 ? 'grammar' : i % 3 === 1 ? 'reading' : 'vocab';
  const skill = type === 'grammar' ? 'present_perfect' : type === 'reading' ? 'reading_inference' : 'academic_vocab';
  h.push({ id: 'h' + i, type, skill, target: skill, ok: type !== 'grammar', ms: 7000, confidence: 2, errorTag: skill, at: now - (i % 9) * day });
}
const seeded = {
  version: '5.10.0', userName: 'Jahran', view: 'home', level: 3, placementDone: true, adaptiveReady: true,
  totalAnswered: h.length, totalCorrect: h.filter(x => x.ok).length, totalTimeMs: h.length * 7000, history: h, wrongAnswers: [],
  vocab: { academic_vocab: { total: 8, correct: 5, mastery: 63, nextReview: now - day, stability: 1, lastSeen: now - 4 * day, lapses: 2 } },
  grammar: { present_perfect: { total: 12, correct: 4, mastery: 33, nextReview: now - day, stability: 1, lastSeen: now - 5 * day, lapses: 4 } },
  reading: { r1: { total: 6, correct: 3, mastery: 50, nextReview: now - day, stability: 1, lastSeen: now - 6 * day, lapses: 2 } },
  daily: { date: '', attempts: 0, count: 0, meaningful: false }, streak: 2,
  confidenceHistory: h.map(x => ({ confidence: x.confidence, ok: x.ok, at: x.at, skill: x.skill, type: x.type })),
  learningDays: [], sessionHistory: [{ at: new Date(now - day).toISOString(), completed: true, abandoned: false }], activeSession: null,
  preferences: {}
};
localStorage.setItem('fiezel-v4-state', JSON.stringify(seeded));

const fetchMock = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = {
  console, document, localStorage, fetch: fetchMock, location: { href: 'http://localhost/' }, navigator: {},
  window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout,
  setInterval: () => ({ unref() {} }), clearInterval() {}, Notification: { permission: 'denied' },
  SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
};
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);
// AI-20 F06 (W1-TESTPLAN 2b): harness i18n KONDISIONAL — index.html memuat fiezel-i18n.js +
// copy-id-*.js SEBELUM modul fitur dan app.js. Begitu naskah home/journey pindah ke copy-map,
// render memanggil FiezelI18n.t(); tanpa preload ini vm meledak. existsSync = hijau dua arah.
// Asersi teks id di bawah TIDAK berubah (byte-identik, dijaga tests/id-golden-snapshot-test.js).
const i18nDir = path.join(root, 'features', 'i18n');
if (fs.existsSync(path.join(i18nDir, 'fiezel-i18n.js'))) {
  vm.runInContext(fs.readFileSync(path.join(i18nDir, 'fiezel-i18n.js'), 'utf8'), context, { filename: 'fiezel-i18n.js' });
  for (const f of fs.readdirSync(i18nDir).filter(n => /^copy-id-.*\.js$/.test(n)).sort())
    vm.runInContext(fs.readFileSync(path.join(i18nDir, f), 'utf8'), context, { filename: f });
}
// Urutan pemuatan sama dengan index.html: modul journey lebih dulu tersedia sebagai global,
// lalu app.js memakainya. Kalau urutannya terbalik, Home harus tetap hidup - diuji di bawah.
vm.runInContext(fs.readFileSync(path.join(root, 'features/personal-journey/fiezel-personal-journey.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context);

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

setTimeout(() => {
  const A = context.__fiezelAudit;
  const markup = A.journeyMarkup(now);
  const built = A.buildPersonalJourney(now);

  test('Home merender panel perjalanan belajar', () => {
    assert.ok(markup.length > 0, 'markup tidak boleh kosong saat modul tersedia');
    // m025-131: judulnya "Rencana kamu", bukan "Perjalanan belajar minggu ini". OWNER
    // meminta bahasa yang lebih pendek dan langsung untuk murid kelas 1 SMA; yang dijaga
    // pemeriksaan ini tetap sama - panelnya benar-benar dirender.
    assert.ok(/Rencana kamu|Rencana minggu ini/.test(markup));
    assert.ok(/journey-panel/.test(markup) && /journey-today/.test(markup));
    assert.ok(/2026-08-17/.test(markup) && /2026-08-23/.test(markup), 'rentang minggu WIB tampil');
  });

  test('rencana yang tampil sama dengan rencana yang dihitung mesin', () => {
    assert.ok(built && built.mission && built.plan);
    assert.ok(markup.indexOf(String(built.plan.questionsTarget) + ' soal') !== -1);
    assert.ok(markup.indexOf(built.mission.rationale.explanation) !== -1,
      'alasan yang ditampilkan harus alasan dari rationale code, bukan teks lain');
  });

  test('setiap blok rencana punya jumlah soal dan alasannya', () => {
    for (const block of built.plan.blocks) {
      assert.ok(markup.indexOf(block.questions + ' soal') !== -1, 'jumlah soal blok tampil');
      assert.ok(markup.indexOf(block.why) !== -1, 'alasan blok tampil');
    }
  });

  test('skill tanpa angka ditulis apa adanya, bukan 0%', () => {
    assert.ok(/Listening/.test(markup) && /Speaking/.test(markup), 'lima skill tampil');
    const unmeasured = markup.match(/is-unmeasured/g) || [];
    assert.strictEqual(unmeasured.length, 2, 'listening dan speaking belum masuk peta di R2');
    // "Belum terhubung", bukan "Belum diukur": latihan Speaking/Listening memang sudah
    // tercatat di fiezel-sl-v1-state, hanya belum diproyeksikan (itu pekerjaan R3).
    assert.ok(/Belum terhubung/.test(markup));
    assert.ok(!/Listening<\/b><span>0%/.test(markup), 'skill tanpa bukti tidak boleh tampil 0%');
    for (const row of built.mission.skillMap) {
      if (row.status === 'measured') continue;
      assert.ok(markup.indexOf(row.label) !== -1);
    }
  });

  test('tidak ada klaim skor ujian di layar', () => {
    // Catatan non-prediksi milik goal yang sedang aktif harus benar-benar tampil di layar,
    // bukan hanya ada di dalam objek.
    assert.ok(markup.indexOf(built.mission.goalProfile.note) !== -1, 'catatan non-prediksi harus terlihat');
    // m025-131: kalimatnya ditulis ulang jadi "bukan tebakan nilai ujian". Yang dijaga
    // bukan kata "prediksi", melainkan bahwa penyangkalannya BENAR-BENAR tampil - jadi
    // pemeriksaannya menyebut keduanya.
    assert.ok(/bukan (prediksi|tebakan)/i.test(markup));
    assert.ok(!/band\s*\d|skor\s*[0-9]|score\s*[0-9]|\b[5-9]\.[05]\b/i.test(markup), 'tidak boleh ada angka berbentuk skor ujian');
    // Goal fondasi ujian adalah tempat klaim skor paling mungkin menyelinap masuk.
    context.__fiezelAudit.setGoalProfile('exam_foundation');
    const examMarkup = context.__fiezelAudit.journeyMarkup(now);
    // m025-131: kalimatnya kini "FIEZEL nggak menebak skor IELTS/TOEFL kamu". Yang dijaga
    // tetap sama dan tetap keras: goal ini WAJIB menyatakan tidak ada tebakan skor, karena
    // di sinilah klaim skor paling mungkin menyelinap masuk.
    assert.ok(/(tidak memprediksi|nggak menebak) skor/i.test(examMarkup), 'goal fondasi ujian wajib menyatakan tidak ada tebakan skor');
    assert.ok(!/band\s*\d|skor\s*[0-9]|score\s*[0-9]|\b[5-9]\.[05]\b/i.test(examMarkup));
    context.__fiezelAudit.setGoalProfile('school');
  });

  test('tujuan belajar bisa diganti dan tersimpan', () => {
    A.setGoalProfile('it');
    const saved = JSON.parse(localStorage.getItem('fiezel-v4-state'));
    assert.strictEqual(saved.preferences.goalProfile, 'it');
    assert.ok(/journey-goal-chip is-active">IT/.test(A.journeyMarkup(now)) || /is-active[^>]*>IT/.test(A.journeyMarkup(now)));
    // Nilai asing tidak boleh tersimpan mentah.
    A.setGoalProfile('ngawur');
    assert.strictEqual(JSON.parse(localStorage.getItem('fiezel-v4-state')).preferences.goalProfile, 'school');
  });

  test('Home tetap hidup kalau modul journey tidak termuat', () => {
    const backup = context.FiezelPersonalJourney;
    context.FiezelPersonalJourney = undefined;
    try {
      assert.strictEqual(A.journeyMarkup(now), '', 'markup kosong, bukan crash');
      assert.strictEqual(A.buildPersonalJourney(now), null);
    } finally { context.FiezelPersonalJourney = backup; }
  });

  test('cakupan target tampil terpisah dari nilai, dan hanya kalau terukur', () => {
    // Home tanpa bukti Speaking/Listening: tidak boleh ada baris cakupan sama sekali.
    assert.ok(!/cakupan/.test(markup), 'jangan tampilkan cakupan yang penyebutnya tidak diketahui');
    const spoken = {
      schema: 'fiezel-skills-evidence-v1', version: 1,
      listening: { status: 'measured', attempts: 4, practiceScore: 68, completionRate: 75, targetCoverage: { measured: true, percent: 11, itemsAttempted: 4, itemsAvailable: 36 } },
      speaking: { status: 'not_measured', attempts: 0, practiceScore: null, completionRate: null, targetCoverage: { measured: false, percent: null } }
    };
    const journey = context.FiezelPersonalJourney;
    const m = journey.buildWeeklyMission({
      evidence: { skills: { spoken } }, policy: {}, snapshot: {}, now
    });
    const row = m.skillMap.find(r => r.skill === 'listening');
    assert.strictEqual(row.status, 'measured');
    assert.strictEqual(row.accuracy, 68, 'skor latihan');
    assert.strictEqual(row.targetCoverage.percent, 11, 'cakupan berdiri sendiri, bukan nilai');
    assert.notStrictEqual(row.accuracy, row.targetCoverage.percent);
  });

  test('markup panel tidak membocorkan jawaban atau riwayat mentah', () => {
    assert.ok(!/selectedAnswer|wrongAnswers|transcript/i.test(markup));
  });

  console.log('');
  if (failures) { console.error('FIEZEL personal journey UI: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL personal journey UI: PASS');
}, 350);
