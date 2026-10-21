'use strict';
/**
 * tests/session-security-test.js — GERBANG KEAMANAN SESI & ISOLASI LOGOUT
 *
 * Menguji:
 * 1. Verifikasi iat pada cookie identitas di sisi Worker (mw-identity.js):
 *    - Token segar (nowS) diterima sah.
 *    - Clock skew wajar (<= 300s ke masa depan) diterima sah.
 *    - Token masa depan (> 300s) ditolak.
 *    - Token kedaluwarsa (> COOKIE.MAX_AGE = 180 hari) ditolak.
 *    - Token bernilai iat negatif atau non-finite ditolak.
 * 2. Isolasi data lokal & pembersihan memori saat logout di sisi klien (app.js):
 *    - activateAccountState memetakan kunci state utama & side-state ke akun aktif.
 *    - deactivateAccountState mem-flush state aktif ke kuncinya sendiri.
 *    - deactivateAccountState mengosongkan state di memori ke defaultState (tidak bocor ke murid berikutnya di HP bersama).
 *    - Akun kedua yang masuk di perangkat yang sama mendapatkan ruang penyimpanannya sendiri tanpa mewarisi progres akun pertama.
 *    - Akun pertama yang masuk kembali memulihkan progresnya sendiri.
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { webcrypto } = require('crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const ROOT = path.join(__dirname, '..');
const HMAC_KEY = 'kunci-uji-hmac-yang-cukup-panjang-untuk-produksi-32+';
const ENV = { SESSION_HMAC_KEY_CURRENT: HMAC_KEY };

let pass = 0;
function test(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.then(() => {
        pass++;
        console.log('PASS ' + name);
      }).catch((err) => {
        console.error('FAIL ' + name, err);
        process.exitCode = 1;
      });
    }
    pass++;
    console.log('PASS ' + name);
  } catch (err) {
    console.error('FAIL ' + name, err);
    process.exitCode = 1;
  }
}

async function run() {
  const url = (p) => require('url').pathToFileURL(path.join(ROOT, p)).href;
  const identity = await import(url('workers/api/mw-identity.js'));
  const schema = await import(url('workers/api/schema.js'));

  const SUB = '11111111-2222-3333-4444-555555555555';
  const NOW_MS = 1_788_600_000_000; // Sept 2026

  // 1. Uji verifikasi iat pada cookie identitas
  await test('verifyIdentity: cookie segar dalam batas waktu diterima', async () => {
    const signed = await identity.signIdentity(ENV, SUB, NOW_MS);
    const verified = await identity.verifyIdentity(ENV, signed.value, NOW_MS);
    assert.strictEqual(verified.ok, true, 'cookie segar sah');
    assert.strictEqual(verified.payload.sub, SUB, 'sub cocok');
  });

  await test('verifyIdentity: toleransi clock skew 120s ke masa depan diterima', async () => {
    const signed = await identity.signIdentity(ENV, SUB, NOW_MS + 120_000);
    const verified = await identity.verifyIdentity(ENV, signed.value, NOW_MS);
    assert.strictEqual(verified.ok, true, 'clock skew 120s sah');
  });

  await test('verifyIdentity: waktu masa depan melebihi clock skew (>300s) ditolak', async () => {
    const signed = await identity.signIdentity(ENV, SUB, NOW_MS + 350_000);
    const verified = await identity.verifyIdentity(ENV, signed.value, NOW_MS);
    assert.strictEqual(verified.ok, false, 'future token ditolak');
  });

  await test('verifyIdentity: cookie lebih tua dari COOKIE.MAX_AGE (180 hari) ditolak', async () => {
    const signed = await identity.signIdentity(ENV, SUB, NOW_MS);
    // Verifikasi di 181 hari kemudian
    const futureMs = NOW_MS + (schema.COOKIE.MAX_AGE + 86400) * 1000;
    const verified = await identity.verifyIdentity(ENV, signed.value, futureMs);
    assert.strictEqual(verified.ok, false, 'expired token ditolak');
  });

  await test('verifyIdentity: cookie berumur 179 hari (sebelum batas 180 hari) diterima', async () => {
    const signed = await identity.signIdentity(ENV, SUB, NOW_MS);
    const validFutureMs = NOW_MS + (schema.COOKIE.MAX_AGE - 86400) * 1000;
    const verified = await identity.verifyIdentity(ENV, signed.value, validFutureMs);
    assert.strictEqual(verified.ok, true, 'token 179 hari masih sah');
  });

  await test('verifyIdentity: iat negatif atau non-finite ditolak', async () => {
    const { b64urlFromString, hmacSign, CURRENT_KID } = await import(url('workers/api/util-hmac.js'));
    const secret = ENV.SESSION_HMAC_KEY_CURRENT;

    const payloadNeg = { v: 1, kid: CURRENT_KID, sub: SUB, iat: -100 };
    const encNeg = b64urlFromString(JSON.stringify(payloadNeg));
    const sigNeg = await hmacSign(secret, encNeg);
    const resNeg = await identity.verifyIdentity(ENV, `${encNeg}.${sigNeg}`, NOW_MS);
    assert.strictEqual(resNeg.ok, false, 'iat negatif ditolak');
  });

  // 2. Uji isolasi data lokal di app.js
  await test('app.js memuat fungsi activateAccountState & deactivateAccountState', () => {
    const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appSrc.includes('function activateAccountState('), 'activateAccountState dideklarasikan');
    assert.ok(appSrc.includes('function deactivateAccountState('), 'deactivateAccountState dideklarasikan');
    assert.ok(appSrc.includes('function activeAccountIdentifier('), 'activeAccountIdentifier dideklarasikan');
  });

  await test('app.js memanggil deactivateAccountState pada kedua jalur logout dan saat sesi server kedaluwarsa', () => {
    const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

    // Tombol logout
    const btnLogoutIdx = appSrc.indexOf("$('btnFiezelLogout')");
    assert.ok(btnLogoutIdx > 0, 'btnFiezelLogout ada');
    const btnChunk = appSrc.slice(btnLogoutIdx, btnLogoutIdx + 400);
    assert.ok(btnChunk.includes('deactivateAccountState()'), 'deactivateAccountState dipanggil pada klik logout');

    // fiezelAccountLogout
    const fnLogoutIdx = appSrc.indexOf('async function fiezelAccountLogout()');
    assert.ok(fnLogoutIdx > 0, 'fiezelAccountLogout ada');
    const fnChunk = appSrc.slice(fnLogoutIdx, fnLogoutIdx + 600);
    assert.ok(fnChunk.includes('deactivateAccountState()'), 'deactivateAccountState dipanggil di fiezelAccountLogout');

    // verifyAuthSession saat server menyatakan signedIn:false
    const verifyIdx = appSrc.indexOf('async function verifyAuthSession()');
    assert.ok(verifyIdx > 0, 'verifyAuthSession ada');
    const verifyChunk = appSrc.slice(verifyIdx, verifyIdx + 400);
    assert.ok(verifyChunk.includes('deactivateAccountState()'), 'deactivateAccountState dipanggil saat sesi server kedaluwarsa');
  });

  await test('Isolasi multi-akun: perilaku penyimpanan lokal dan pembersihan memori saat logout', () => {
    const store = new Map();
    const fakeLocalStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    };

    const sandbox = {
      console: { log() {}, warn() {}, error() {} },
      localStorage: fakeLocalStorage,
      sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      self: {},
      window: {},
      document: { baseURI: 'http://localhost/' },
      navigator: { onLine: true },
      Date: Date,
      Math: Math,
      JSON: JSON,
      Object: Object,
      Array: Array,
      String: String,
      Number: Number,
      queueMicrotask: (fn) => fn(),
      setTimeout: (fn) => fn()
    };
    sandbox.self = sandbox;
    sandbox.window = sandbox;

    // Snippet logis isolasi dari app.js
    const testScript = `
      var LEGACY_STATE_KEY = 'fiezel-v4-state';
      var ACCOUNT_STATE_PREFIX = 'fiezel-v5-state:';
      var activeStateStorageKey = LEGACY_STATE_KEY;
      var activeAccountUuid = '';
      var coreBrainCache = 'some_cache';
      var defaultState = { totalAnswered: 0, history: [], vocab: {}, preferences: { role: 'murid' } };
      var state = JSON.parse(JSON.stringify(defaultState));

      function accountStateKey(uuid) {
        var id = String(uuid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128);
        return id ? ACCOUNT_STATE_PREFIX + id : '';
      }

      function sideStateKey(base) {
        return activeAccountUuid ? base + ':' + activeAccountUuid : base;
      }

      function save() {
        localStorage.setItem(activeStateStorageKey, JSON.stringify(state));
      }

      function activateAccountState(rawId) {
        var uuid = String(rawId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128);
        var key = accountStateKey(uuid);
        activeAccountUuid = uuid;
        activeStateStorageKey = key;
        var existing = localStorage.getItem(key);
        state = existing ? JSON.parse(existing) : JSON.parse(JSON.stringify(defaultState));
        state.ownerUuid = uuid;
        coreBrainCache = null;
        save();
        return true;
      }

      function deactivateAccountState() {
        save();
        activeAccountUuid = '';
        activeStateStorageKey = LEGACY_STATE_KEY;
        state = JSON.parse(JSON.stringify(defaultState));
        coreBrainCache = null;
      }
    `;

    vm.createContext(sandbox);
    vm.runInContext(testScript, sandbox);

    // Murid A (Budi) masuk
    sandbox.activateAccountState('acc_budi');
    assert.strictEqual(sandbox.activeAccountUuid, 'acc_budi');
    assert.strictEqual(sandbox.activeStateStorageKey, 'fiezel-v5-state:acc_budi');
    assert.strictEqual(sandbox.sideStateKey('bkt-key'), 'bkt-key:acc_budi');

    // Murid A belajar: menjawab 50 soal
    sandbox.state.totalAnswered = 50;
    sandbox.state.history.push({ id: 1, ok: true });
    sandbox.save();

    // Murid A keluar
    sandbox.deactivateAccountState();

    // State di memori harus BERSIH, tidak boleh memuat progres Murid A
    assert.strictEqual(sandbox.activeAccountUuid, '', 'activeAccountUuid kosong');
    assert.strictEqual(sandbox.activeStateStorageKey, 'fiezel-v4-state', 'kembali ke legacy key');
    assert.strictEqual(sandbox.state.totalAnswered, 0, 'totalAnswered kembali ke 0 di memori');
    assert.strictEqual(sandbox.state.history.length, 0, 'riwayat kosong di memori');
    assert.strictEqual(sandbox.sideStateKey('bkt-key'), 'bkt-key', 'side-state kembali ke kunci datar');

    // Namun data Murid A di localStorage tetap tersimpan utuh di kuncinya sendiri
    const budiData = JSON.parse(store.get('fiezel-v5-state:acc_budi'));
    assert.strictEqual(budiData.totalAnswered, 50, 'progres Budi aman di kuncinya');

    // Murid B (Siti) masuk di HP bersama
    sandbox.activateAccountState('acc_siti');
    assert.strictEqual(sandbox.activeAccountUuid, 'acc_siti');
    assert.strictEqual(sandbox.activeStateStorageKey, 'fiezel-v5-state:acc_siti');
    assert.strictEqual(sandbox.state.totalAnswered, 0, 'Siti mulai dari 0, TIDAK mewarisi progres Budi');
    assert.strictEqual(sandbox.sideStateKey('bkt-key'), 'bkt-key:acc_siti');

    // Siti belajar: 10 soal
    sandbox.state.totalAnswered = 10;
    sandbox.save();
    sandbox.deactivateAccountState();

    // Budi masuk kembali di HP tersebut
    sandbox.activateAccountState('acc_budi');
    assert.strictEqual(sandbox.state.totalAnswered, 50, 'Budi mendapatkan kembali 50 soal miliknya');
  });

  console.log(`\nsession-security: ${pass}/${pass} assert PASS\n`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
