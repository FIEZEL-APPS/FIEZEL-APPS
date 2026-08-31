#!/usr/bin/env node
/**
 * GERBANG SINKRON FAIL-CLOSED (brain-sync-failclosed-test.js)
 *
 * APA YANG DIJAGA, DAN KENAPA INI GERBANG TERPENTING DI LAPISAN SINKRON
 * --------------------------------------------------------------------
 * S5b adalah titik pertama dalam sejarah aplikasi ini di mana bukti belajar bisa
 * meninggalkan perangkat. Semua jaminan lain di lapisan ini (proyeksi ber-allowlist,
 * validasi ulang di worker, idempotensi) mengandaikan satu hal yang lebih dasar: bahwa
 * jalur itu TIDAK PERNAH menyala tanpa murid memilihnya.
 *
 * Jaminan seperti itu runtuh dengan cara yang membosankan: sebuah default berubah, sebuah
 * state korup dibaca sebagai "true", atau satu cabang baru lupa memeriksa syaratnya. Tidak
 * satu pun dari ketiganya menghasilkan galat. Karena itu gerbang ini menjalankan kode
 * SUNGGUHAN dari app.js dan mencoba menyalakan sinkron lewat setiap celah yang saya bisa
 * pikirkan.
 *
 * YANG DI-ASSERT
 *   F1  bawaan preferensi brainSync adalah false, tertulis di defaultPreferences;
 *   F2  ketiga syarat wajib terpenuhi SEKALIGUS — mati kalau salah satu absen;
 *   F3  sanitasi fail-closed: 'true', 1, {}, 'yes' TIDAK menyalakan apa pun;
 *   F4  saat mati, mengantre bukti tidak menyentuh penyimpanan sama sekali;
 *   F5  saat hidup, antrean memakai kunci BERAKUN dan mendedup attemptId;
 *   RED detektor terbukti merah bila bawaannya dibalik jadi true.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = __dirname;
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const AR = require('./features/brain/fiezel-attempt-record.js');

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

/** Rakit lingkungan mini berisi fungsi sinkron SUNGGUHAN dari app.js. */
function lingkungan({ pref, uuid, worker, modul }) {
  // Konstanta ikut diambil dari sumber. Tanpa ini, fungsi yang membacanya melempar
  // ReferenceError yang DITELAN `catch` di dalamnya, dan gerbang membaca "sinkron mati"
  // padahal yang mati adalah harness-nya sendiri — kegagalan yang menyamar jadi kelulusan.
  const konstanta = ['BRAIN_SYNC_KEY', 'BRAIN_SYNC_BATCH', 'BRAIN_SYNC_QUEUE_MAX']
    .map((n) => { const m = appSource.match(new RegExp('const ' + n + '=[^;]+;')); assert.ok(m, n + ' tidak ditemukan'); return m[0]; })
    .join('\n');
  const src = konstanta + '\n' + ['brainSyncModule', 'brainSyncEnabled', 'brainSyncRead', 'brainSyncWrite', 'brainSyncQueue']
    .map((n) => { const f = ambilFungsi(appSource, n); assert.ok(f, n + '() tidak ditemukan — pola gerbang sudah basi'); return f; })
    .join('\n');
  const store = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const self = modul ? { FiezelAttemptRecord: AR } : {};
  const api = new Function('state', 'activeAccountUuid', 'CORE_WORKER_URL', 'self', 'localStorage', 'sideStateKey',
    src + '; return {brainSyncEnabled, brainSyncQueue, brainSyncRead};'
  )({ preferences: { brainSync: pref } }, uuid, worker, self, localStorage,
    (base) => (uuid ? base + ':' + uuid : base));
  return { api, store };
}

const HIDUP = { pref: true, uuid: 'murid-1', worker: 'https://worker.example', modul: true };
const baris = { attemptId: 'a1', at: 1700000000000, ok: true, type: 'grammar', skill: 'present_perfect', reviewKey: 'present_perfect', kappa: 0.7 };

test('F1 · bawaan preferensi brainSync adalah false di defaultPreferences', () => {
  const m = appSource.match(/const defaultPreferences=\{[\s\S]*?\};/);
  assert.ok(m, 'defaultPreferences tidak ditemukan — pola gerbang sudah basi');
  assert.ok(/brainSync:false/.test(m[0].replace(/\s+/g, '')),
    'bawaan brainSync bukan false — sinkron akan menyala karena pembaruan mendarat, bukan karena murid memilih');
});

test('F2 · ketiga syarat wajib terpenuhi sekaligus', () => {
  assert.strictEqual(lingkungan(HIDUP).api.brainSyncEnabled(), true, 'sinkron tidak menyala walau semua syarat ada');
  const mati = [
    ['preferensi mati', { ...HIDUP, pref: false }],
    ['tanpa akun', { ...HIDUP, uuid: '' }],
    ['tanpa worker', { ...HIDUP, worker: '' }],
    ['modul proyeksi absen', { ...HIDUP, modul: false }]
  ];
  for (const [label, cfg] of mati) {
    assert.strictEqual(lingkungan(cfg).api.brainSyncEnabled(), false, 'sinkron menyala padahal ' + label);
  }
});

test('F3 · sanitasi fail-closed: nilai yang "kelihatan benar" tidak menyalakan apa pun', () => {
  // Jalur klasik: state korup atau backup lama membawa string/angka alih-alih boolean.
  for (const racun of ['true', 1, {}, [], 'yes', 'on', ' true ']) {
    assert.strictEqual(lingkungan({ ...HIDUP, pref: racun }).api.brainSyncEnabled(), false,
      'nilai ' + JSON.stringify(racun) + ' menyalakan sinkron — hanya boolean true persis yang boleh');
  }
  // Dan sanitizeState sendiri harus menegakkan itu, bukan hanya pembacanya.
  assert.ok(/brainSync:rawPreferences\.brainSync===true/.test(appSource),
    'sanitizeState tidak memaksa brainSync jadi boolean ketat');
});

test('F4 · saat mati, mengantre bukti tidak menyentuh penyimpanan sama sekali', () => {
  const { api, store } = lingkungan({ ...HIDUP, pref: false });
  assert.strictEqual(api.brainSyncQueue(baris), false, 'antrean menerima bukti padahal sinkron mati');
  assert.deepStrictEqual(Object.keys(store), [],
    'penyimpanan disentuh padahal sinkron mati — "mati" harus berarti tidak pernah dimulai, bukan dicoba lalu gagal');
});

test('F5 · saat hidup, antrean memakai kunci berakun dan mendedup attemptId', () => {
  const { api, store } = lingkungan(HIDUP);
  assert.strictEqual(api.brainSyncQueue(baris), true, 'bukti sah tidak masuk antrean');
  const kunci = Object.keys(store);
  assert.strictEqual(kunci.length, 1, 'jumlah kunci penyimpanan tak terduga: ' + JSON.stringify(kunci));
  assert.ok(kunci[0].endsWith(':murid-1'), 'antrean sinkron tidak berada di ruang akun: ' + kunci[0]);
  assert.strictEqual(api.brainSyncQueue(baris), false, 'percobaan yang sama masuk antrean dua kali');
  assert.strictEqual(api.brainSyncRead().queue.length, 1, 'antrean menggandakan bukti');
  // Dan yang tersimpan tetap proyeksi, bukan baris mentah.
  assert.ok(store[kunci[0]].indexOf('reviewKey') < 0, 'field baris mentah ikut masuk antrean');
});

// ==========================================================================
// BUKTI-BISA-MERAH
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}

test('RED · detektor merah bila bawaan dibalik jadi true', () => {
  const racun = appSource.replace('brainSync:false}', 'brainSync:true}');
  assert.notStrictEqual(racun, appSource, 'racun tidak menempel — pola gerbang sudah basi');
  expectRed('bawaan brainSync dibalik jadi true', () => {
    const m = racun.match(/const defaultPreferences=\{[\s\S]*?\};/);
    assert.ok(/brainSync:false/.test(m[0].replace(/\s+/g, '')));
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node brain-sync-failclosed-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL brain sync fail-closed: FAIL (' + failures + '/' + checks + ')'); process.exit(1); }
console.log('FIEZEL brain sync fail-closed: PASS (' + checks + ' uji · sinkron tidak bisa menyalakan dirinya sendiri)');
