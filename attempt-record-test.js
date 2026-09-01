#!/usr/bin/env node
/**
 * GERBANG PROYEKSI BUKTI SINKRON (attempt-record-test.js)
 *
 * DUA KLAIM YANG HARUS BENAR SEKALIGUS, dan gerbang ini menolak salah satunya dikorbankan:
 *
 *   (a) CUKUP — catatan yang dikirim masih memungkinkan putar-ulang menghasilkan model otak
 *       yang SAMA PERSIS dengan yang dihitung dari baris riwayat penuh. Kalau tidak, sinkron
 *       kehilangan bukti, dan seluruh gagasan "gabungkan alirannya" runtuh.
 *   (b) AMAN — tidak ada riwayat jawaban mentah yang bisa ikut. observability-privacy-test.js
 *       sudah menegakkan kontrak itu untuk seluruh keluaran aplikasi; catatan sinkron adalah
 *       permukaan BARU yang bisa keluar dari perangkat, jadi ia butuh gerbangnya sendiri.
 *
 * Mudah membuat salah satunya hijau sendirian: kirim semuanya (cukup, tidak aman) atau kirim
 * nyaris tidak ada (aman, tidak cukup). Yang sulit adalah keduanya, dan itu yang diuji.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const AR = require('./features/brain/fiezel-attempt-record.js');
const BKT = require('./features/brain/fiezel-mastery-bkt.js');
const LEDGER = require('./features/brain/fiezel-misconception-ledger.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/* Baris riwayat penuh, persis bentuk yang ditulis record() di app.js — termasuk field
   yang TIDAK boleh ikut. */
function barisPenuh(over) {
  return Object.assign({
    attemptId: '1a2b3c-hp001-5',
    id: 'soal-42',
    type: 'grammar',
    level: 'B1',
    skill: 'present_perfect',
    target: 'soal-42',
    reviewBucket: 'grammar',
    reviewKey: 'present_perfect',
    difficulty: 3.4,
    ok: false,
    ms: 5200,
    confidence: 2,
    selectedIndex: 1,
    selectedAnswer: 'she have gone to school',
    correctAnswer: 'she has gone to school',
    errorTag: 'present_perfect',
    at: 1700000000000,
    kappa: 0.65,
    predicted: 0.72,
    concept: 'tense_choice',
    misconception: 'aux.have_for_third_person',
    sessionId: 'sesi-9'
  }, over);
}

test('P1 · keluaran hanya berisi field dari allowlist', () => {
  const rec = AR.project(barisPenuh());
  assert.ok(rec, 'baris sah ditolak');
  const asing = Object.keys(rec).filter((k) => AR.ALLOWED.indexOf(k) < 0);
  assert.deepStrictEqual(asing, [], 'field di luar allowlist ikut terkirim: ' + asing.join(', '));
});

test('P2 · racun: kalimat soal, jawaban murid, transkrip, email, endpoint TIDAK pernah muncul', () => {
  const racun = barisPenuh({
    question: 'Pilih bentuk kata kerja yang benar untuk kalimat ini',
    transcript: 'saya kira jawabannya she have gone',
    userName: 'Budi Santoso',
    email: 'budi@contoh.co.id',
    reportEndpoint: 'https://contoh.co.id/laporan',
    note: 'catatan bebas apa saja'
  });
  const teks = JSON.stringify(AR.project(racun));
  for (const jejak of ['Pilih bentuk', 'she have gone', 'she has gone', 'Budi', 'budi@', 'https://', 'catatan bebas']) {
    assert.ok(teks.indexOf(jejak) < 0, 'jejak data mentah lolos ke catatan sinkron: ' + jejak);
  }
});

test('P3 · pengenal berisi spasi ditolak — kalimat tidak bisa menyamar jadi pengenal', () => {
  // Seluruh kelas kebocoran ditutup satu aturan: kalimat selalu punya spasi, pengenal tidak.
  const rec = AR.project(barisPenuh({ skill: 'ini kalimat panjang yang menyamar', reviewKey: 'juga kalimat' }));
  assert.ok(rec, 'baris ditolak seluruhnya, padahal hanya sebagian field yang cacat');
  assert.strictEqual(rec.skill, undefined, 'kalimat lolos lewat field skill');
  assert.strictEqual(rec.lesson, undefined, 'kalimat lolos lewat field lesson');
});

test('P4 · validate MENOLAK field asing, bukan membuangnya diam-diam', () => {
  const rec = AR.project(barisPenuh());
  assert.strictEqual(AR.validate(rec), true, 'catatan sah ditolak validate');
  assert.strictEqual(AR.validate(Object.assign({}, rec, { bocor: 'x' })), false,
    'validate meloloskan field asing — satu field liar berarti kebocoran');
  assert.strictEqual(AR.validate(Object.assign({}, rec, { schema: 'lain' })), false, 'schema asing lolos');
});

test('P5 · CUKUP: putar-ulang dari catatan == putar-ulang dari baris penuh', () => {
  // Klaim (a). Kalau proyeksi membuang sesuatu yang dipakai modul, dua model ini berbeda.
  const rows = [];
  for (let i = 0; i < 40; i++) {
    rows.push(barisPenuh({
      attemptId: 'att-' + i,
      at: 1700000000000 + i * 3600000,
      ok: i % 3 !== 0,
      skill: ['present_perfect', 'past_simple'][i % 2],
      reviewKey: ['present_perfect', 'past_simple'][i % 2],
      kappa: 0.4 + (i % 6) / 10,
      concept: ['tense_choice', 'aux_agreement'][i % 2],
      misconception: 'm' + (i % 3),
      sessionId: 'sesi-' + Math.floor(i / 6)
    }));
  }
  const dariBaris = rows.reduce((st, r) => ({
    bkt: BKT.update(st.bkt, { lesson: r.reviewKey, correct: r.ok, weight: r.kappa }, r.at),
    ledger: LEDGER.update(st.ledger, { concept: r.concept, family: 'grammar', misconception: r.misconception, correct: r.ok, timing: 'normal', sessionId: r.sessionId }, r.at)
  }), { bkt: null, ledger: null });

  const catatan = AR.projectAll(rows);
  assert.strictEqual(catatan.length, rows.length, 'sebagian percobaan hilang saat diproyeksikan');
  const dariCatatan = catatan.reduce((st, r) => ({
    bkt: BKT.update(st.bkt, { lesson: r.lesson, correct: r.ok, weight: r.kappa }, r.at),
    ledger: LEDGER.update(st.ledger, { concept: r.concept, family: 'grammar', misconception: r.misconception, correct: r.ok, timing: 'normal', sessionId: r.sessionId }, r.at)
  }), { bkt: null, ledger: null });

  assert.strictEqual(JSON.stringify(dariCatatan.bkt), JSON.stringify(dariBaris.bkt),
    'BKT dari catatan sinkron berbeda — proyeksi membuang bukti yang dipakai model');
  assert.strictEqual(JSON.stringify(dariCatatan.ledger), JSON.stringify(dariBaris.ledger),
    'ledger dari catatan sinkron berbeda — proyeksi membuang bukti yang dipakai model');
});

test('P6 · baris tanpa identitas percobaan atau waktu DITOLAK', () => {
  assert.strictEqual(AR.project(barisPenuh({ attemptId: '' })), null, 'catatan tanpa attemptId lolos — tidak bisa di-dedup');
  assert.strictEqual(AR.project(barisPenuh({ at: 0 })), null, 'catatan tanpa waktu lolos — tidak bisa diurutkan');
  assert.strictEqual(AR.project(barisPenuh({ ok: 'ya' })), null, 'hasil non-boolean lolos');
  for (const rusak of [null, undefined, [], 7, 'x', {}]) {
    assert.strictEqual(AR.project(rusak), null, 'masukan rusak tidak ditolak: ' + JSON.stringify(rusak));
  }
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}

test('RED · detektor racun dan detektor kecukupan sama-sama terbukti bisa merah', () => {
  // (P2) proyeksi bocor: kalau selectedAnswer ikut, detektor racun WAJIB merah.
  const bocor = Object.assign({}, AR.project(barisPenuh()), { selectedAnswer: 'she have gone to school' });
  expectRed('jawaban murid ikut terkirim', () => {
    const teks = JSON.stringify(bocor);
    assert.ok(teks.indexOf('she have gone') < 0);
  });

  // (P5) proyeksi kekurangan: kalau kappa dibuang, model hasil putar-ulang WAJIB berbeda.
  const rows = [];
  for (let i = 0; i < 12; i++) rows.push({ reviewKey: 'present_perfect', ok: i % 2 === 0, kappa: 0.3, at: 1700000000000 + i * 1000 });
  const penuh = rows.reduce((st, r) => BKT.update(st, { lesson: r.reviewKey, correct: r.ok, weight: r.kappa }, r.at), null);
  const tanpaKappa = rows.reduce((st, r) => BKT.update(st, { lesson: r.reviewKey, correct: r.ok }, r.at), null);
  assert.notStrictEqual(JSON.stringify(tanpaKappa), JSON.stringify(penuh),
    'membuang kappa tidak mengubah BKT — P5 tidak akan pernah menangkap proyeksi yang kekurangan');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(__dirname, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node attempt-record-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL attempt record: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL attempt record: PASS (' + checks + ' uji · ' + AR.ALLOWED.length + ' field diizinkan, sisanya tidak punya jalan masuk)');
