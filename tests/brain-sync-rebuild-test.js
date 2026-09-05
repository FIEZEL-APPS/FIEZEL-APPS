#!/usr/bin/env node
/**
 * GERBANG HITUNG-ULANG SINKRON (tests/brain-sync-rebuild-test.js)
 *
 * INI PANEN DARI BUKTI S4, DAN GERBANG YANG MENJAGANYA TETAP BENAR
 * ----------------------------------------------------------------
 * tests/brain-replay-equivalence-test.js membuktikan sifat matematisnya: model otak adalah fungsi
 * deterministik dari aliran percobaan, jadi menggabungkan ALIRAN lalu memutar ulang
 * menghasilkan model yang sama, tak peduli perangkat mana yang menyetor duluan.
 *
 * Gerbang ini menguji hal yang berbeda dan sama pentingnya: bahwa KODE APLIKASI benar-benar
 * melakukan itu. Sifat yang benar di atas kertas tidak menolong kalau jalur nyatanya
 * menggabungkan dengan cara lain, mengurutkan dengan cara lain, atau menulis lebih awal.
 *
 * YANG DI-ASSERT
 *   B1  aliran gabungan = union berdasarkan attemptId, urut waktu lalu id;
 *   B2  bukti lokal yang sama dengan bukti remote tidak dihitung dua kali;
 *   B3  hasil hitung-ulang IDENTIK dengan putar-ulang manual atas aliran gabungan
 *       (jembatan langsung ke bukti S4);
 *   B4  hitung-ulang TIDAK menulis apa pun — penerapan adalah panggilan terpisah, supaya
 *       murid bisa melihat dulu sebelum modelnya ditimpa;
 *   B5  saat sinkron mati, hitung-ulang tidak berjalan sama sekali;
 *   RED detektor terbukti merah bila urutan aliran dirusak.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = __fzRoot;
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const AR = require('../features/brain/fiezel-attempt-record.js');
const BKT = require('../features/brain/fiezel-mastery-bkt.js');
const LEDGER = require('../features/brain/fiezel-misconception-ledger.js');

let failures = 0, checks = 0;
function test(name, fn) {
  checks++;
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function ambilFungsi(source, nama) {
  const mulai = source.indexOf('function ' + nama + '(');
  if (mulai < 0) return '';
  let depth = 0;
  for (let j = source.indexOf('{', mulai); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; if (depth === 0) return source.slice(mulai, j + 1); }
  }
  return '';
}

function lingkungan({ pref = true, riwayat = [] } = {}) {
  const konstanta = ['BRAIN_SYNC_KEY', 'BRAIN_SYNC_BATCH', 'BRAIN_SYNC_QUEUE_MAX']
    .map((n) => { const m = appSource.match(new RegExp('const ' + n + '=[^;]+;')); assert.ok(m, n + ' tidak ditemukan'); return m[0]; })
    .join('\n');
  const src = konstanta + '\n' + ['brainSyncModule', 'brainSyncEnabled', 'brainSyncRead', 'brainSyncWrite', 'brainSyncMergedStream', 'brainSyncRebuild']
    .map((n) => { const f = ambilFungsi(appSource, n); assert.ok(f, n + '() tidak ditemukan — pola gerbang sudah basi'); return f; })
    .join('\n');
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const self = { FiezelAttemptRecord: AR, FiezelMasteryBKT: BKT, FiezelMisconceptionLedger: LEDGER };
  const api = new Function('state', 'activeAccountUuid', 'CORE_WORKER_URL', 'self', 'localStorage', 'sideStateKey',
    src + '; return {brainSyncMergedStream, brainSyncRebuild, brainSyncEnabled};'
  )({ preferences: { brainSync: pref }, history: riwayat }, 'murid-1', 'https://worker.example', self, localStorage,
    (base) => base + ':murid-1');
  return { api, store };
}

const barisLokal = (i) => ({
  attemptId: 'lokal-' + i, at: 1700000000000 + i * 60000, ok: i % 2 === 0,
  type: 'grammar', skill: 'present_perfect', reviewKey: 'present_perfect', kappa: 0.6,
  selectedAnswer: 'rahasia murid'
});
const recRemote = (i, at) => ({
  schema: 'fiezel-attempt-record-v1', attemptId: 'remote-' + i, at,
  ok: i % 3 === 0, type: 'grammar', skill: 'past_simple', lesson: 'past_simple', kappa: 0.8
});

test('B1 · aliran gabungan = union attemptId, urut waktu lalu id', () => {
  const riwayat = [barisLokal(3), barisLokal(1)];
  const remote = [recRemote(2, 1700000000000 + 2 * 60000)];
  const stream = lingkungan({ riwayat }).api.brainSyncMergedStream(remote);
  assert.strictEqual(stream.length, 3, 'jumlah aliran gabungan salah');
  assert.deepStrictEqual(stream.map((x) => x.at), stream.map((x) => x.at).slice().sort((a, b) => a - b),
    'aliran gabungan tidak urut waktu');
  assert.ok(JSON.stringify(stream).indexOf('rahasia murid') < 0,
    'isi jawaban murid ikut masuk aliran gabungan — proyeksi dilewati');
});

test('B2 · bukti yang sama dari dua sisi tidak dihitung dua kali', () => {
  const riwayat = [barisLokal(1)];
  const kembar = AR.project(barisLokal(1));
  const stream = lingkungan({ riwayat }).api.brainSyncMergedStream([kembar]);
  assert.strictEqual(stream.length, 1, 'bukti yang sama tergandakan di aliran gabungan');
});

test('B3 · hasil hitung-ulang IDENTIK dengan putar-ulang manual atas aliran gabungan', () => {
  const riwayat = [barisLokal(1), barisLokal(2), barisLokal(4)];
  const remote = [recRemote(1, 1700000000000 + 90000), recRemote(2, 1700000000000 + 30000)];
  const { api } = lingkungan({ riwayat });
  const hasil = api.brainSyncRebuild(remote, 1700000999999);
  assert.ok(hasil && hasil.bkt, 'hitung-ulang tidak menghasilkan model');

  // Putar ulang manual di sini, memakai aliran yang sama.
  const manual = api.brainSyncMergedStream(remote).reduce((st, rec) => {
    const lesson = rec.lesson || rec.skill || '';
    return lesson ? BKT.update(st, { lesson, correct: rec.ok === true, weight: Number.isFinite(rec.kappa) ? rec.kappa : 1 }, rec.at) : st;
  }, null);
  assert.strictEqual(JSON.stringify(hasil.bkt), JSON.stringify(manual),
    'kode aplikasi tidak melakukan putar-ulang yang sama dengan yang dibuktikan S4');
});

test('B4 · hitung-ulang TIDAK menulis apa pun', () => {
  // Penerapan adalah panggilan terpisah: menimpa model belajar seseorang tanpa ia melihat
  // dulu adalah kehilangan yang tidak bisa dibatalkan.
  const { api, store } = lingkungan({ riwayat: [barisLokal(1), barisLokal(2)] });
  api.brainSyncRebuild([recRemote(1, 1700000000000 + 30000)], 1700000999999);
  assert.deepStrictEqual(Object.keys(store), [], 'hitung-ulang menulis ke penyimpanan: ' + JSON.stringify(Object.keys(store)));
});

test('B5 · saat sinkron mati, hitung-ulang tidak berjalan', () => {
  const { api } = lingkungan({ pref: false, riwayat: [barisLokal(1)] });
  assert.strictEqual(api.brainSyncRebuild([recRemote(1, 1700000000000)], 1), null,
    'hitung-ulang berjalan padahal sinkron mati');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
test('RED · detektor merah bila urutan aliran dirusak', () => {
  const riwayat = [barisLokal(1), barisLokal(2), barisLokal(4)];
  const remote = [recRemote(1, 1700000000000 + 90000)];
  const { api } = lingkungan({ riwayat });
  const benar = JSON.stringify(api.brainSyncRebuild(remote, 1).bkt);
  const terbalik = api.brainSyncMergedStream(remote).reverse().reduce((st, rec) => {
    const lesson = rec.lesson || rec.skill || '';
    return lesson ? BKT.update(st, { lesson, correct: rec.ok === true, weight: Number.isFinite(rec.kappa) ? rec.kappa : 1 }, rec.at) : st;
  }, null);
  assert.notStrictEqual(JSON.stringify(terbalik), benar,
    'membalik urutan tidak mengubah model — B3 tidak membuktikan apa pun tentang urutan');
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node tests/brain-sync-rebuild-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL brain sync rebuild: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL brain sync rebuild: PASS (' + checks + ' uji · gabungkan aliran, hitung ulang, jangan timpa diam-diam)');
