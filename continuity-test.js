/**
 * FIEZEL R6 gate — backup terenkripsi, pratinjau restore, dan penggabungan progres.
 *
 * Kerugian di lane ini bersifat permanen: progres belajar yang tertimpa tidak bisa
 * dikembalikan, dan backup yang bocor membawa seluruh riwayat seseorang. Karena itu yang
 * diuji bukan hanya "bisa restore", melainkan apakah modul ini menolak hal-hal yang merusak.
 */
const assert = require('assert');
const continuity = require('./features/continuity/fiezel-continuity.js');

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

const NOW = Date.parse('2026-08-20T07:00:00Z'), DAY = 86400000;

function historyRow(i, over) {
  return Object.assign({
    id: 'h' + i, type: 'grammar', skill: 'present_perfect', target: 'present_perfect',
    ok: i % 3 !== 0, ms: 6000, confidence: 2, errorTag: 'present_perfect', at: NOW - i * 3600000
  }, over || {});
}

const stateLokal = {
  version: '5.22.0', view: 'progress', level: 3, placementDone: true, adaptiveReady: true,
  totalAnswered: 999, totalCorrect: 999, totalTimeMs: 1, streak: 4,
  history: [historyRow(1), historyRow(2), historyRow(3)],
  wrongAnswers: [{ id: 'w1', skill: 'present_perfect' }],
  confidenceHistory: [{ confidence: 2, ok: true, at: NOW - DAY }],
  sessionHistory: [{ at: new Date(NOW - DAY).toISOString(), completed: true, abandoned: false }],
  learningDays: ['2026-08-18', '2026-08-19'],
  vocab: { kata_a: { total: 4, correct: 3, mastery: 60, lastSeen: NOW - 2 * DAY } },
  grammar: { present_perfect: { total: 10, correct: 6, mastery: 55, lastSeen: NOW - DAY } },
  reading: {},
  activeSession: { id: 'live', startedAt: NOW - 60000 },
  reportMeta: { lastStatus: 'ready', endpoint: 'https://contoh.puter.work' },
  preferences: { reportEndpoint: 'https://contoh.puter.work' }
};

const stateLain = {
  version: '5.22.0', level: 2, placementDone: true, adaptiveReady: false, streak: 2,
  history: [historyRow(2), historyRow(9, { at: NOW - 9 * DAY }), historyRow(10, { at: NOW - 10 * DAY })],
  confidenceHistory: [{ confidence: 3, ok: false, at: NOW - 2 * DAY }],
  sessionHistory: [{ at: new Date(NOW - 3 * DAY).toISOString(), completed: false, abandoned: true }],
  learningDays: ['2026-08-19', '2026-08-15'],
  vocab: { kata_a: { total: 9, correct: 8, mastery: 88, lastSeen: NOW - 1000 }, kata_b: { total: 2, correct: 1, mastery: 30, lastSeen: NOW - 5 * DAY } },
  grammar: { past_simple: { total: 5, correct: 2, mastery: 25, lastSeen: NOW - 4 * DAY } },
  reading: {}
};

const payload = continuity.buildBackupPayload({ state: stateLokal, now: NOW });
const payloadLain = continuity.buildBackupPayload({ state: stateLain, now: NOW });

test('now wajib diisi', () => {
  assert.throws(() => continuity.buildBackupPayload({ state: stateLokal }), /now wajib diisi/);
});

test('backup membawa progres, bukan keadaan perangkat', () => {
  assert.strictEqual(payload.schema, continuity.BACKUP_SCHEMA);
  assert.strictEqual(payload.history.length, 3);
  assert.strictEqual(payload.grammar.present_perfect.mastery, 55);
  // Keadaan perangkat tidak ikut: memindahkannya hanya memindahkan kebingungan.
  assert.strictEqual(payload.view, undefined);
  assert.strictEqual(payload.activeSession, undefined);
  assert.strictEqual(payload.reportMeta, undefined);
  assert.strictEqual(payload.preferences, undefined);
  assert.strictEqual(payload.transferred.deviceState, false);
});

test('endpoint dan kredensial tidak pernah ikut ke berkas backup', () => {
  const dump = JSON.stringify(payload);
  assert.ok(!/puter\.work/.test(dump), 'endpoint laporan tidak boleh ikut');
  assert.ok(!/token|apiKey|password/i.test(dump));
  assert.strictEqual(payload.transferred.credentials, false);
});

test('total dihitung ulang dari riwayat, bukan dibawa dari state', () => {
  // State lokal sengaja berisi total yang mustahil (999 dari 3 jawaban).
  assert.strictEqual(payload.totals.answered, 3);
  assert.strictEqual(payload.totals.correct, 2);
  assert.notStrictEqual(payload.totals.answered, stateLokal.totalAnswered);
});

test('isi backup dibatasi supaya berkas dari perangkat lain tidak membuat state membengkak', () => {
  const banyak = { history: [], confidenceHistory: [] };
  for (let i = 0; i < 2000; i++) { banyak.history.push(historyRow(i)); banyak.confidenceHistory.push({ confidence: 2, ok: true, at: NOW - i }); }
  const besar = continuity.buildBackupPayload({ state: banyak, now: NOW });
  assert.strictEqual(besar.history.length, continuity.LIMITS.history);
  assert.strictEqual(besar.confidenceHistory.length, continuity.LIMITS.confidenceHistory);
});

test('backup terenkripsi dan bisa dibuka kembali dengan passphrase yang benar', async () => {
  const amplop = await continuity.encryptBackup(payload, 'passphrase-yang-cukup-panjang');
  assert.strictEqual(amplop.schema, continuity.ENVELOPE_SCHEMA);
  assert.strictEqual(amplop.kdf.iterations, continuity.KDF_ITERATIONS);
  // Isi belajar tidak boleh terbaca dari berkasnya.
  const teks = JSON.stringify(amplop);
  assert.ok(!/present_perfect|kata_a/.test(teks), 'materi belajar tidak boleh terlihat tanpa passphrase');
  const kembali = await continuity.decryptBackup(amplop, 'passphrase-yang-cukup-panjang');
  assert.strictEqual(JSON.stringify(kembali), JSON.stringify(payload));
});

test('passphrase salah ditolak jelas, bukan menghasilkan data setengah jadi', async () => {
  const amplop = await continuity.encryptBackup(payload, 'passphrase-yang-cukup-panjang');
  await assert.rejects(() => continuity.decryptBackup(amplop, 'passphrase-yang-salah'), /wrong_passphrase_or_corrupt/);
  const rusak = JSON.parse(JSON.stringify(amplop));
  rusak.payload = rusak.payload.slice(0, -8) + 'AAAAAAAA';
  await assert.rejects(() => continuity.decryptBackup(rusak, 'passphrase-yang-cukup-panjang'), /wrong_passphrase_or_corrupt/);
});

test('passphrase terlalu pendek ditolak di modul, bukan hanya di UI', async () => {
  await assert.rejects(() => continuity.encryptBackup(payload, 'pendek'), /passphrase_too_short/);
});

test('dua backup dari isi sama menghasilkan berkas berbeda', async () => {
  const a = await continuity.encryptBackup(payload, 'passphrase-yang-cukup-panjang');
  const b = await continuity.encryptBackup(payload, 'passphrase-yang-cukup-panjang');
  assert.notStrictEqual(a.payload, b.payload, 'salt dan IV harus baru setiap kali');
  assert.notStrictEqual(a.kdf.salt, b.kdf.salt);
});

test('metadata berkas cukup untuk mengenali, tidak cukup untuk mengintip', async () => {
  const amplop = await continuity.encryptBackup(payload, 'passphrase-yang-cukup-panjang');
  assert.deepStrictEqual(Object.keys(amplop.meta).sort(), ['appVersion', 'createdAt', 'schema']);
});

test('pratinjau restore menjelaskan perubahan tanpa mengubah apa pun', () => {
  const sebelum = JSON.stringify(stateLokal);
  const preview = continuity.previewRestore(payloadLain, stateLokal);
  assert.strictEqual(JSON.stringify(stateLokal), sebelum, 'pratinjau tidak boleh menyentuh state');
  assert.strictEqual(preview.kind, 'restore-preview');
  assert.strictEqual(preview.historyRowsInBackup, 3);
  assert.strictEqual(preview.historyRowsNew, 2, 'h2 sudah ada, h9 dan h10 baru');
  assert.strictEqual(preview.historyRowsAlreadyPresent, 1);
  assert.strictEqual(preview.buckets.vocab.shared, 1, 'kata_a ada di keduanya');
  assert.strictEqual(preview.buckets.vocab.onlyBackup, 1, 'kata_b hanya di backup');
  assert.strictEqual(preview.buckets.grammar.onlyLocal, 1, 'present_perfect hanya lokal');
  assert.strictEqual(preview.localProgressDiscarded, false);
  assert.strictEqual(preview.deviceStateRestored, false);
});

test('penggabungan tidak membuang progres lokal', () => {
  const hasil = continuity.mergeProgress(stateLokal, payloadLain);
  assert.ok(hasil.grammar.present_perfect, 'materi yang hanya ada di lokal tetap ada');
  assert.ok(hasil.grammar.past_simple, 'materi dari backup ikut masuk');
  assert.ok(hasil.vocab.kata_b);
  assert.strictEqual(hasil.learningDays.length, 3, 'hari belajar digabung tanpa duplikat');
});

test('materi yang bentrok diambil yang paling maju, bukan yang terakhir dibaca', () => {
  const hasil = continuity.mergeProgress(stateLokal, payloadLain);
  // kata_a: lokal mastery 60 (lastSeen 2 hari lalu), backup mastery 88 (lastSeen baru saja).
  assert.strictEqual(hasil.vocab.kata_a.mastery, 88);
  const terbalik = continuity.mergeProgress(stateLain, payload);
  assert.strictEqual(terbalik.vocab.kata_a.mastery, 88, 'arah penggabungan tidak mengubah hasil');
});

test('riwayat digabung berdasarkan id, bukan disambung', () => {
  const hasil = continuity.mergeProgress(stateLokal, payloadLain);
  const ids = hasil.history.map(r => r.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'tidak ada baris ganda');
  assert.strictEqual(hasil.history.length, 5, 'h1,h2,h3 lokal + h9,h10 dari backup');
  // Total ikut hasil gabungan, bukan angka lama yang mustahil.
  assert.strictEqual(hasil.totalAnswered, 5);
  assert.notStrictEqual(hasil.totalAnswered, 999);
});

test('menggabungkan dua kali tidak menggandakan apa pun', () => {
  const sekali = continuity.mergeProgress(stateLokal, payloadLain);
  const duakali = continuity.mergeProgress(sekali, payloadLain);
  assert.strictEqual(duakali.totalAnswered, sekali.totalAnswered);
  assert.strictEqual(duakali.history.length, sekali.history.length);
  assert.strictEqual(duakali.learningDays.length, sekali.learningDays.length);
  assert.strictEqual(JSON.stringify(duakali.vocab), JSON.stringify(sekali.vocab));
});

test('streak diambil yang lebih besar, tidak dijumlahkan', () => {
  const hasil = continuity.mergeProgress(stateLokal, payloadLain);
  assert.strictEqual(hasil.streak, 4, 'dua perangkat di hari yang sama bukan dua hari belajar');
  assert.strictEqual(hasil.level, 3);
  assert.strictEqual(hasil.placementDone, true);
});

test('riwayat gabungan tetap dibatasi', () => {
  const banyakLokal = { history: [] }, banyakBackup = { history: [] };
  for (let i = 0; i < 400; i++) banyakLokal.history.push(historyRow(i, { id: 'L' + i }));
  for (let i = 0; i < 400; i++) banyakBackup.history.push(historyRow(i, { id: 'B' + i }));
  const hasil = continuity.mergeProgress(banyakLokal, banyakBackup);
  assert.strictEqual(hasil.history.length, continuity.LIMITS.history);
});

test('modul ini tidak punya kemampuan mengirim apa pun ke jaringan', () => {
  // Cloud sync tidak boleh aktif implisit. Cara paling jujur menjaminnya adalah modulnya
  // memang tidak memuat pemanggilan jaringan sama sekali.
  const source = require('fs').readFileSync('./features/continuity/fiezel-continuity.js', 'utf8');
  const kode = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const larangan of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'navigator.serviceWorker']) {
    assert.ok(kode.indexOf(larangan) === -1, `modul continuity tidak boleh memuat ${larangan}`);
  }
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL continuity: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL continuity: PASS');
})();
