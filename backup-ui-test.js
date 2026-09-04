/**
 * FIEZEL R6 gate — jembatan backup/pemulihan di aplikasi.
 *
 * Modul continuity sudah diuji terpisah. Yang diuji di sini adalah lapisan yang menyentuh
 * state nyata: apakah pemulihan benar-benar menggabungkan, apakah ia menolak berkas asing,
 * dan apakah ia menyentuh hal yang seharusnya tidak disentuh - preferensi, endpoint laporan,
 * dan sesi yang sedang berjalan di perangkat ini.
 */
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = __dirname, store = {}, els = {};
function el(id) { return els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, click() {}, onclick: null }); }
const document = {
  baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
  createElement: () => ({ classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, remove() {}, click() {} }),
  addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }
};
const localStorage = { getItem: k => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] };

const NOW = Date.parse('2026-08-20T08:00:00Z'), DAY = 86400000;
function row(i, over) {
  return Object.assign({ id: 'h' + i, type: 'grammar', skill: 'present_perfect', target: 'present_perfect', ok: i % 2 === 0, ms: 6000, confidence: 2, errorTag: 'present_perfect', at: NOW - i * 3600000 }, over || {});
}
const seeded = {
  version: '5.23.0', userName: 'Jahran', view: 'progress', level: 2, placementDone: true, adaptiveReady: true,
  totalAnswered: 4, totalCorrect: 2, totalTimeMs: 24000,
  history: [row(1), row(2), row(3), row(4)], wrongAnswers: [],
  vocab: { kata_a: { total: 4, correct: 2, mastery: 50, nextReview: NOW + DAY, stability: 1, lastSeen: NOW - 3 * DAY, lapses: 1 } },
  grammar: { present_perfect: { total: 8, correct: 5, mastery: 62, nextReview: NOW + DAY, stability: 2, lastSeen: NOW - DAY, lapses: 1 } },
  reading: {}, daily: { date: '', attempts: 0, count: 0, meaningful: false }, streak: 5,
  confidenceHistory: [], learningDays: ['2026-08-19'], sessionHistory: [], activeSession: { id: 'sesi-berjalan', startedAt: NOW - 60000 },
  preferences: { haptics: true, reportEndpoint: 'https://milik-saya.puter.work', reportConsent: true }
};
localStorage.setItem('fiezel-v4-state', JSON.stringify(seeded));

const fetchMock = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
const context = {
  console, document, localStorage, fetch: fetchMock, location: { href: 'http://localhost/' }, navigator: {},
  window: null, self: null, Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout, crypto: globalThis.crypto,
  TextEncoder, TextDecoder, Blob: function () {}, setInterval: () => ({ unref() {} }), clearInterval() {},
  Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
};
context.window = context; context.self = context; context.window.scrollTo = () => {};
vm.createContext(context);
/* Harness i18n (hotfix CI pasca-#242): runtime i18n + copy-id dimuat sebelum modul features/app.js. */
const __i18nRt=path.join(root,'features','i18n','fiezel-i18n.js');
if(fs.existsSync(__i18nRt)){vm.runInContext(fs.readFileSync(__i18nRt,'utf8'),context,{filename:'fiezel-i18n.js'});
for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){
vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),context,{filename:__n});}}

for (const file of [
  /* m025-186 merge-fix: kontrak index.html FIEZEL_I18N_BEGIN — i18n + copy-id sebelum modul features/app. */
  'features/i18n/fiezel-i18n.js',
  ...fs.readdirSync(path.join(root, 'features/i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort().map((n) => 'features/i18n/' + n),
  'features/speaking-listening/speaking-listening-config.js',
  'features/skills-evidence/fiezel-skills-evidence.js',
  'features/academic-readiness/fiezel-academic-readiness.js',
  'features/personal-journey/fiezel-personal-journey.js',
  'features/continuity/fiezel-continuity.js',
  'app.js'
]) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

setTimeout(async () => {
  const A = context.__fiezelAudit;
  const continuity = context.FiezelContinuity;

  test('berkas backup dibuat dari state nyata dengan nama yang jelas', () => {
    const file = A.buildBackupFile(NOW);
    assert.ok(file && file.payload);
    assert.strictEqual(file.payload.schema, continuity.BACKUP_SCHEMA);
    assert.strictEqual(file.payload.history.length, 4);
    assert.ok(/^fiezel-backup-2026-08-20\.json$/.test(file.filename));
  });

  test('endpoint, preferensi, dan sesi hidup tidak ikut ke berkas', () => {
    const payload = A.buildBackupFile(NOW).payload;
    const dump = JSON.stringify(payload);
    assert.ok(!/milik-saya\.puter\.work/.test(dump), 'endpoint laporan bocor ke backup');
    assert.ok(!/haptics/.test(dump), 'preferensi perangkat bocor ke backup');
    // Sesi yang SEDANG berjalan adalah keadaan perangkat dan tidak ikut. Sesi yang sudah
    // berakhir - termasuk yang terputus lalu dicatat aplikasi - adalah bukti belajar dan
    // memang harus ikut, karena dari situlah tingkat sesi-tak-selesai dihitung.
    assert.strictEqual(payload.activeSession, undefined, 'sesi hidup bukan progres');
    assert.strictEqual(payload.view, undefined);
    assert.ok(payload.sessionHistory.some(s => s.abandoned === true), 'riwayat sesi ikut sebagai bukti');
  });

  test('pratinjau membaca state sekarang tanpa mengubahnya', () => {
    const lain = continuity.buildBackupPayload({
      state: { history: [row(3), row(9, { at: NOW - 9 * DAY }), row(10, { at: NOW - 10 * DAY })], vocab: { kata_b: { total: 3, correct: 2, mastery: 40, lastSeen: NOW - 2 * DAY } }, grammar: {}, reading: {}, level: 1, streak: 1 },
      now: NOW
    });
    const sebelum = localStorage.getItem('fiezel-v4-state');
    const preview = A.previewRestoreForState(lain);
    assert.strictEqual(preview.historyRowsNew, 2);
    assert.strictEqual(preview.historyRowsAlreadyPresent, 1);
    assert.strictEqual(preview.itemsOnlyBackup, 1);
    assert.strictEqual(localStorage.getItem('fiezel-v4-state'), sebelum, 'pratinjau tidak boleh menyimpan apa pun');
  });

  test('berkas asing ditolak, state tidak tersentuh', () => {
    const sebelum = localStorage.getItem('fiezel-v4-state');
    for (const bad of [null, {}, { schema: 'lain' }, { schema: 'fiezel-continuity-backup-v0' }]) {
      const hasil = A.applyRestore(bad);
      assert.strictEqual(hasil.ok, false);
      assert.strictEqual(hasil.reason, 'invalid_payload');
    }
    assert.strictEqual(localStorage.getItem('fiezel-v4-state'), sebelum);
  });

  test('pemulihan menggabungkan, bukan menimpa', () => {
    const lain = continuity.buildBackupPayload({
      state: {
        history: [row(9, { at: NOW - 9 * DAY }), row(10, { at: NOW - 10 * DAY })],
        vocab: { kata_a: { total: 9, correct: 8, mastery: 90, lastSeen: NOW - 1000, stability: 3, lapses: 0 }, kata_b: { total: 3, correct: 2, mastery: 40, lastSeen: NOW - 2 * DAY } },
        grammar: {}, reading: {}, level: 4, streak: 2, learningDays: ['2026-08-17']
      }, now: NOW
    });
    const hasil = A.applyRestore(lain);
    assert.strictEqual(hasil.ok, true);
    const disimpan = JSON.parse(localStorage.getItem('fiezel-v4-state'));
    assert.strictEqual(disimpan.history.length, 6, '4 lokal + 2 dari backup');
    assert.strictEqual(disimpan.totalAnswered, 6, 'total dihitung ulang dari riwayat gabungan');
    assert.ok(disimpan.grammar.present_perfect, 'materi lokal tetap ada');
    assert.strictEqual(disimpan.vocab.kata_a.mastery, 90, 'materi bentrok diambil yang paling maju');
    assert.ok(disimpan.vocab.kata_b, 'materi dari backup masuk');
    assert.strictEqual(disimpan.level, 4);
    // Streak TIDAK dijumlahkan. Aplikasi menghitungnya ulang dari hari belajar yang benar-benar
    // bermakna (`recomputeMeaningfulDays` di save()), jadi yang dijamin di sini adalah batas
    // atasnya: pemulihan tidak boleh menaikkan streak melebihi angka tertinggi dari kedua sisi.
    assert.ok(disimpan.streak <= 5, `streak ${disimpan.streak} melebihi nilai tertinggi kedua sisi`);
    assert.notStrictEqual(disimpan.streak, 7, 'streak tidak boleh hasil penjumlahan');
  });

  test('pemulihan tidak menyentuh preferensi dan endpoint perangkat ini', () => {
    const disimpan = JSON.parse(localStorage.getItem('fiezel-v4-state'));
    assert.strictEqual(disimpan.preferences.reportEndpoint, 'https://milik-saya.puter.work');
    assert.strictEqual(disimpan.preferences.haptics, true);
    // Sesi yang terputus ditangani oleh pemulihan sesi milik aplikasi sendiri saat memuat state,
    // bukan oleh restore: ia tercatat sebagai sesi terputus, bukan dibawa dari berkas backup.
    assert.strictEqual(disimpan.activeSession, null);
    assert.ok(disimpan.sessionHistory.some(s => s.abandonReason === 'interrupted'),
      'sesi berjalan yang terputus tercatat, bukan hilang diam-diam');
  });

  test('memulihkan berkas yang sama dua kali tidak menggandakan apa pun', () => {
    const lain = continuity.buildBackupPayload({
      state: { history: [row(11, { at: NOW - 11 * DAY })], vocab: {}, grammar: {}, reading: {} }, now: NOW
    });
    const pertama = A.applyRestore(lain);
    const jumlah = JSON.parse(localStorage.getItem('fiezel-v4-state')).history.length;
    const kedua = A.applyRestore(lain);
    assert.strictEqual(pertama.ok && kedua.ok, true);
    assert.strictEqual(JSON.parse(localStorage.getItem('fiezel-v4-state')).history.length, jumlah);
  });

  test('bagian Pengaturan menyebut konsekuensinya, bukan hanya tombolnya', () => {
    const markup = A.continuitySettingsMarkup();
    assert.ok(/Backup dan pemulihan/.test(markup));
    assert.ok(/tidak mengirimnya ke mana pun/i.test(markup), 'harus jelas ini bukan cloud sync');
    assert.ok(/kata sandi ini hilang/i.test(markup), 'konsekuensi kehilangan kata sandi harus tertulis');
    assert.ok(/minimal 8 karakter/i.test(markup));
    assert.ok(/type="password"/.test(markup), 'kata sandi tidak boleh tampil terbuka');
  });

  test('tanpa modul continuity, Pengaturan tetap terbuka tanpa bagian backup', () => {
    const backup = context.FiezelContinuity;
    context.FiezelContinuity = undefined;
    try {
      assert.strictEqual(A.continuitySettingsMarkup(), '');
      assert.strictEqual(A.buildBackupFile(NOW), null);
      assert.strictEqual(A.applyRestore({}).reason, 'module_unavailable');
    } finally { context.FiezelContinuity = backup; }
  });

  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL backup UI: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL backup UI: PASS');
}, 350);
