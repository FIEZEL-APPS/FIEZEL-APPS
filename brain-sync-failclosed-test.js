#!/usr/bin/env node
/**
 * GERBANG SINKRON FAIL-CLOSED (brain-sync-failclosed-test.js)
 *
 * APA YANG DIJAGA, DAN KENAPA INI GERBANG TERPENTING DI LAPISAN SINKRON
 * --------------------------------------------------------------------
 * S5b adalah titik pertama dalam sejarah aplikasi ini di mana bukti belajar bisa
 * meninggalkan perangkat. Semua jaminan lain di lapisan ini — proyeksi ber-allowlist,
 * validasi ulang di worker, idempotensi — mengandaikan satu hal yang lebih dasar: jalur itu
 * TIDAK PERNAH menyala tanpa murid memilihnya.
 *
 * Jaminan seperti itu runtuh dengan cara yang membosankan: sebuah default berubah, state
 * korup dibaca sebagai "true", atau satu cabang baru lupa memeriksa syaratnya. Tidak satu pun
 * menghasilkan galat. Karena itu gerbang ini menjalankan kode SUNGGUHAN dari app.js dan
 * mencoba menyalakan sinkron lewat setiap celah yang bisa saya pikirkan.
 *
 * YANG DI-ASSERT
 *   F1  bawaan preferensi brainSync adalah false, tertulis di defaultPreferences;
 *   F2  ketiga syarat wajib terpenuhi SEKALIGUS — mati kalau salah satu absen;
 *   F3  sanitasi fail-closed: 'true', 1, {}, 'yes' TIDAK menyalakan apa pun;
 *   F4  saat mati, nol bukti disiapkan dan penyimpanan tidak disentuh sama sekali;
 *   F5  saat hidup, yang disiapkan adalah PROYEKSI dari riwayat, bukan baris mentah;
 *   F6  percobaan yang sudah terkirim tidak pernah disiapkan ulang;
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

/** Lingkungan mini berisi fungsi sinkron SUNGGUHAN dari app.js. */
function lingkungan({ pref, uuid, worker, modul, sent }) {
  // Konstanta ikut diambil. Tanpa ini, fungsi yang membacanya melempar ReferenceError yang
  // DITELAN `catch` di dalamnya, dan gerbang membaca "sinkron mati" padahal yang mati adalah
  // harness-nya sendiri — kegagalan yang menyamar jadi kelulusan. Itu benar-benar terjadi
  // pada versi pertama gerbang ini, dan F5/F6 yang menuntut jalur HIDUP juga terbukti-lah
  // yang menangkapnya.
  const konstanta = ['BRAIN_SYNC_KEY', 'BRAIN_SYNC_BATCH', 'BRAIN_SYNC_QUEUE_MAX']
    .map((n) => { const m = appSource.match(new RegExp('const ' + n + '=[^;]+;')); assert.ok(m, n + ' tidak ditemukan'); return m[0]; })
    .join('\n');
  const src = konstanta + '\n' + ['brainSyncModule', 'brainSyncEnabled', 'brainSyncRead', 'brainSyncWrite', 'brainSyncPending']
    .map((n) => { const f = ambilFungsi(appSource, n); assert.ok(f, n + '() tidak ditemukan — pola gerbang sudah basi'); return f; })
    .join('\n');

  const store = {};
  const kunci = uuid ? 'fiezel-brain-sync-v1:' + uuid : 'fiezel-brain-sync-v1';
  if (sent && sent.length) store[kunci] = JSON.stringify({ sent: sent });
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  // Baris riwayat sengaja dibentuk seperti keluaran record() SUNGGUHAN, termasuk field yang
  // TIDAK boleh ikut terkirim.
  const riwayat = [{
    attemptId: 'a1', at: 1700000000000, ok: true, type: 'grammar',
    skill: 'present_perfect', reviewKey: 'present_perfect', kappa: 0.7,
    selectedAnswer: 'she have gone', correctAnswer: 'she has gone'
  }];
  const self = modul ? { FiezelAttemptRecord: AR } : {};
  const api = new Function('state', 'activeAccountUuid', 'CORE_WORKER_URL', 'self', 'localStorage', 'sideStateKey',
    src + '; return {brainSyncEnabled, brainSyncPending, brainSyncRead};'
  )({ preferences: { brainSync: pref }, history: riwayat }, uuid, worker, self, localStorage,
    (base) => (uuid ? base + ':' + uuid : base));
  return { api, store };
}

const HIDUP = { pref: true, uuid: 'murid-1', worker: 'https://worker.example', modul: true };

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
  for (const racun of ['true', 1, {}, [], 'yes', 'on', ' true ']) {
    assert.strictEqual(lingkungan({ ...HIDUP, pref: racun }).api.brainSyncEnabled(), false,
      'nilai ' + JSON.stringify(racun) + ' menyalakan sinkron — hanya boolean true persis yang boleh');
  }
  assert.ok(/brainSync:rawPreferences\.brainSync===true/.test(appSource),
    'sanitizeState tidak memaksa brainSync jadi boolean ketat');
});

test('F4 · saat mati, nol bukti disiapkan dan penyimpanan tidak disentuh', () => {
  const { api, store } = lingkungan({ ...HIDUP, pref: false });
  assert.deepStrictEqual(api.brainSyncPending(), [], 'bukti disiapkan padahal sinkron mati');
  assert.deepStrictEqual(Object.keys(store), [],
    'penyimpanan disentuh padahal sinkron mati — "mati" harus berarti tidak pernah dimulai, bukan dicoba lalu gagal');
});

test('F5 · saat hidup, yang disiapkan adalah PROYEKSI riwayat, bukan baris mentah', () => {
  const tertunda = lingkungan(HIDUP).api.brainSyncPending();
  assert.strictEqual(tertunda.length, 1, 'bukti sah tidak muncul sebagai tertunda');
  assert.strictEqual(tertunda[0].attemptId, 'a1', 'identitas percobaan tidak terbawa');
  const teks = JSON.stringify(tertunda[0]);
  for (const jejak of ['reviewKey', 'selectedAnswer', 'correctAnswer', 'she have gone', 'she has gone']) {
    assert.ok(teks.indexOf(jejak) < 0, 'field/isi baris mentah ikut disiapkan untuk dikirim: ' + jejak);
  }
});

test('F6 · percobaan yang sudah terkirim tidak pernah disiapkan ulang', () => {
  // Tanpa ini, setiap flush mengirim ulang seluruh riwayat: boros, dan menutupi bug lain
  // karena server yang idempoten akan menelannya diam-diam.
  const { api } = lingkungan({ ...HIDUP, sent: ['a1'] });
  assert.deepStrictEqual(api.brainSyncPending(), [], 'percobaan yang sudah terkirim disiapkan ulang');
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
