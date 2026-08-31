/**
 * FIEZEL gerbang — SKEMA BUKTI BRAINCORE (Fase 2 / Phase K).
 *
 * Yang dijaga: bahwa skema ini mengumpulkan bukti MINIMUM untuk menilai mesin, dan bahwa
 * pagarnya menolak dengan MELEMPAR, bukan membersihkan diam-diam. Pembersihan senyap membuat
 * kebocoran terlihat seperti keberhasilan; lemparan membuatnya terlihat seperti kebocoran.
 *
 * Dan satu hal yang mudah lupa diuji: modul ini TIDAK BOLEH tahu cara mengirim apa pun.
 * Skema bukti yang bisa mengirim sendiri adalah setengah jalan menuju telemetri yang tidak
 * pernah diminta siapa pun.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const E = require('./features/brain/fiezel-braincore-evidence.js');
const Trace = require('./features/brain/fiezel-decision-trace.js');
const Manifest = require('./features/brain/fiezel-brain-manifest.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const SRC = fs.readFileSync(path.join(__dirname, 'features', 'brain', 'fiezel-braincore-evidence.js'), 'utf8');

/* ========================================================================================
 * §1 — MURNI, DAN TIDAK TAHU CARA MENGIRIM
 * ===================================================================================== */
test('§1 tanpa DOM, jaringan, storage, jam, atau acak di sumbernya', () => {
  const badan = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const t of ['document', 'window.', 'localStorage', 'fetch(', 'XMLHttpRequest',
                   'navigator', 'Math.random', 'Date.now', 'new Date(']) {
    assert.ok(badan.indexOf(t) === -1, 'modul memakai ' + t + ' — ia tidak lagi murni');
  }
});

test('§1 modul TIDAK punya satu pun jalan untuk mengirim bukti ke mana pun', () => {
  const badan = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const t of ['sendBeacon', 'WebSocket', 'postMessage', 'http', 'upload', 'queue', 'flush']) {
    assert.ok(badan.toLowerCase().indexOf(t.toLowerCase()) === -1,
      'modul menyebut "' + t + '" — skema bukti yang bisa mengirim sendiri adalah setengah jalan menuju telemetri');
  }
});

/* ========================================================================================
 * §2 — PAGAR PRIVASI MENOLAK DENGAN MELEMPAR
 * ===================================================================================== */
test('§2 setiap kunci identitas terlarang membuat build() melempar', () => {
  for (const k of E.FORBIDDEN_KEYS) {
    const input = { conceptId: 'c', attemptNumber: 1 };
    input[k] = 'apa pun';
    assert.throws(() => E.build(input), new RegExp(k),
      'kunci "' + k + '" lolos tanpa dilempar');
  }
});

test('§2 kunci terlarang di KEDALAMAN mana pun ikut tertangkap', () => {
  assert.throws(() => E.build({ conceptId: 'c', attemptNumber: 1, meta: { nested: { email: 'a@b' } } }),
    /email/, 'kunci identitas bersarang lolos');
});

test('§2 WAKTU adalah pemaut, jadi ia ikut dilarang', () => {
  // Bukan sekadar kerapian: stempel waktu berketelitian milidetik mengubah kumpulan catatan
  // menjadi sidik jari sesi yang bisa dipautkan lintas berkas. Urutan cukup dibawa ordinal.
  for (const k of ['at', 'timestamp', 'startedAt', 'sessionId']) {
    assert.ok(E.FORBIDDEN_KEYS.indexOf(k) !== -1, '"' + k + '" tidak dilarang — pemaut sesi terbuka');
  }
  const rec = E.build({ conceptId: 'c', attemptNumber: 1 });
  assert.ok(!('at' in rec) && !('generatedAt' in rec), 'catatan membawa waktu');
});

test('§2 waktu jawab hanya sebagai EMBER, tidak pernah milidetik mentah', () => {
  const rec = E.build({ conceptId: 'c', attemptNumber: 1, responseTimeBucket: 'guess' });
  assert.strictEqual(rec.responseTimeBucket, 'guess');
  assert.ok(!('responseMs' in rec) && !('ms' in rec), 'milidetik mentah ikut terkumpul');
  assert.throws(() => E.build({ conceptId: 'c', attemptNumber: 1, responseTimeBucket: '7000' }),
    /di luar kosakata tertutup/, 'angka mentah lolos sebagai ember');
});

/* ========================================================================================
 * §3 — BUKTI MINIMUM: SETIAP FIELD HARUS MENJAWAB SEBUAH PERTANYAAN EVALUASI
 * ===================================================================================== */
test('§3 catatan hanya membawa field yang diminta brief Fase K, tidak lebih', () => {
  const rec = E.build({ conceptId: 'c', questionId: 'q1', attemptNumber: 1, outcome: 'correct',
                        difficulty: 2.35, intervention: 'hint', postInterventionOutcome: 'correct',
                        responseTimeBucket: 'reasoned', braincoreVersion: '3.0.0' });
  const DIIZINKAN = ['schema', 'braincoreVersion', 'conceptId', 'questionId', 'attemptNumber',
                     'difficulty', 'responseTimeBucket', 'outcome', 'intervention',
                     'postInterventionOutcome', 'misconceptionCode'];
  const asing = Object.keys(rec).filter((k) => DIIZINKAN.indexOf(k) === -1);
  assert.deepStrictEqual(asing, [], 'field yang tidak diminta ikut terkumpul: ' + asing.join(', '));
});

test('§3 postInterventionOutcome null berarti BELUM DIKETAHUI, bukan gagal', () => {
  // Kalau "murid belum kembali ke konsep ini" dihitung sebagai 'incorrect', setiap intervensi
  // akan terlihat sia-sia dan mesinnya akan dihukum karena data yang belum ada.
  const rec = E.build({ conceptId: 'c', attemptNumber: 1, intervention: 'reteach' });
  assert.strictEqual(rec.postInterventionOutcome, null);
  assert.notStrictEqual(rec.postInterventionOutcome, 'incorrect');
});

test('§3 kunci miskonsepsi SINTETIS ditolak — AUDIT/10 §4 tidak boleh masuk ke data', () => {
  assert.throws(() => E.build({ conceptId: 'c', attemptNumber: 1, misconceptionCode: 'unclassified:vocab_x' }),
    /kunci sintetis/,
    'kunci unclassified:* lolos — "salah dua kali" akan tersimpan sebagai "miskonsepsi"');
  const sah = E.build({ conceptId: 'c', attemptNumber: 1, misconceptionCode: 'm_ed_ending' });
  assert.strictEqual(sah.misconceptionCode, 'm_ed_ending', 'kode miskonsepsi yang sah ikut ditolak');
});

/* ========================================================================================
 * §4 — PASANGAN TRACE: INILAH YANG MEMBUATNYA EVALUATIF
 * ===================================================================================== */
test('§4 fromTraces menyusun pasangan keputusan -> hasil berikutnya', () => {
  const t1 = Trace.build({ decision: 'hint', decisionRaw: 'hint', decisionReason: 'first_miss',
    conceptId: 'past-simple', braincoreVersion: '3.0.0',
    evidence: { correct: false, timing: 'reasoned' }, difficultyState: { effective: 2.35 } });
  const t2 = Trace.build({ decision: 'continue', conceptId: 'past-simple',
    evidence: { correct: true, timing: 'reasoned' } });
  const rec = E.fromTraces(t1, t2, { attemptNumber: 2, questionId: 'g-1' });
  assert.strictEqual(rec.outcome, 'incorrect');
  assert.strictEqual(rec.intervention, 'hint');
  assert.strictEqual(rec.postInterventionOutcome, 'correct', 'hasil sesudah intervensi tidak terbawa');
});

test('§4 pasangan dari KONSEP BERBEDA ditolak — pasangan palsu adalah bukti palsu', () => {
  const t1 = Trace.build({ decision: 'hint', conceptId: 'past-simple', evidence: { correct: false } });
  const t2 = Trace.build({ decision: 'continue', conceptId: 'articles', evidence: { correct: true } });
  assert.throws(() => E.fromTraces(t1, t2, { attemptNumber: 2 }), /konsep lain/,
    'pasangan lintas konsep lolos — intervensi akan dikreditkan atas hasil yang bukan miliknya');
});

test('§4 "continue" BUKAN intervensi', () => {
  // Tidak melakukan apa-apa adalah keadaan dasar. Menghitungnya sebagai tindakan membuat
  // setiap sesi terlihat penuh intervensi dan mengencerkan metrik apa pun di atasnya.
  assert.strictEqual(E.mapIntervention('continue'), 'none');
  assert.strictEqual(E.mapIntervention('hint'), 'hint');
  assert.strictEqual(E.mapIntervention('entah-apa'), 'none');
});

/* ========================================================================================
 * §5 — TERDAFTAR, DAN KLASIFIKASINYA JUJUR
 * ===================================================================================== */
test('§5 terdaftar di manifest Brain dengan schema yang sama persis', () => {
  const row = Manifest.modules.find((m) => m.file === 'fiezel-braincore-evidence.js');
  assert.ok(row, 'modul tidak terdaftar di manifest');
  assert.strictEqual(row.schema, E.SCHEMA, 'schema di manifest berbeda dari schema modul');
  assert.strictEqual(Manifest.authorityMap[row.authorityKey], 'off',
    'otoritasnya bukan "off" — kalau ada yang MEMANGGILNYA di produksi, entri ini harus berubah '
    + 'di commit yang sama, dan gerbang wiring Fase A yang menegakkannya');
});

test('§5 tidak ada satu pun pemanggil di produksi (dan itu memang klasifikasinya)', () => {
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const idx = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(app.indexOf('FiezelBraincoreEvidence') === -1,
    'app.js memanggilnya — manifest harus berubah dari off di commit yang sama');
  assert.ok(idx.indexOf('fiezel-braincore-evidence.js') === -1,
    'index.html memuatnya — manifest harus berubah dari off di commit yang sama');
});

test('§5 terdaftar di quality.yml', () => {
  const yml = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(yml.indexOf('node braincore-evidence-test.js') !== -1, 'gerbang ini tidak terdaftar');
});

console.log(failures === 0 ? 'BraincoreEvidence: PASS' : 'BraincoreEvidence: FAIL (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
