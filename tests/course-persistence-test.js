/**
 * tests/course-persistence-test.js — Course Persistence & Japanese Target Language Verification
 *
 * Menguji bahwa:
 * 1. FIEZEL_TARGET_COURSE_KEY = 'fz_target_course' didefinisikan dan digunakan.
 * 2. activeTargetLang() membaca localStorage.getItem('fz_target_course') dengan fallback ke state.preferences.targetLang.
 * 3. switchTargetLangStorage() dan setTargetLangPreference() menulis ke 'fz_target_course'.
 * 4. Saat startup (cold boot / reload):
 *    - Bila fz_target_course === 'ja' dan user pernah login/migrasi (fiezel-v5-legacy-owner atau fz_last_account disetel,
 *      dan LEGACY_STATE_KEY dihapus), activeStateStorageKey diselaraskan ke kunci akun, state memuat progres Jepang,
 *      dan targetLang TETAP 'ja'.
 *    - Untuk user anonim, reload tetap menjaga targetLang 'ja'.
 * 5. Di load(), jika jaBank gagal atau null, targetLang TIDAK di-reset ke 'en' jika fz_target_course bernilai 'ja'.
 * 6. Beralih kembali ke 'en' memperbarui fz_target_course ke 'en' dan bertahan saat reload.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');

let pass = 0;
const failures = [];
const antrian = [];
function test(name, fn) {
  antrian.push([name, fn]);
}

function createEnv(initialStore = {}, fetchMock = null) {
  const store = { ...initialStore };
  const els = {};
  const el = (id) => els[id] || (els[id] = {
    id, innerHTML: '', textContent: '', value: '',
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, append() {}, appendChild() {}, addEventListener() {},
    focus() {}, click() {}, onclick: null, setAttribute() {}, getAttribute() { return ''; }
  });
  const document = {
    baseURI: 'http://localhost/',
    getElementById: el,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({
      classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {},
      addEventListener() {}, remove() {}, click() {}, setAttribute() {}, getAttribute() { return ''; }
    }),
    addEventListener() {},
    body: { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} },
    documentElement: { lang: 'id' }
  };
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const defaultFetch = async () => ({ ok: false, json: async () => null });
  const context = {
    console, document, localStorage, fetch: fetchMock || defaultFetch,
    location: { href: 'http://localhost/', protocol: 'http:' }, navigator: { onLine: true },
    window: null, self: null,
    Date, Intl, Math, URL, Error, Promise, JSON, setTimeout, clearTimeout,
    crypto: globalThis.crypto, TextEncoder, TextDecoder,
    Blob: function () {}, setInterval: () => ({ unref() {} }), clearInterval() {},
    Notification: { permission: 'denied' },
    SpeechSynthesisUtterance: function () {},
    speechSynthesis: { cancel() {}, speak() {} },
    queueMicrotask: (fn) => fn()
  };
  context.window = context;
  context.self = context;
  context.window.scrollTo = () => {};
  vm.createContext(context);

  for (const file of [
    'features/i18n/fiezel-i18n.js',
    ...fs.readdirSync(path.join(root, 'features/i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort().map((n) => 'features/i18n/' + n),
    'features/brain/fiezel-target-language.js',
    'features/speaking-listening/speaking-listening-config.js',
    'features/speaking-listening/gems-core.js',
    'features/skills-evidence/fiezel-skills-evidence.js',
    'features/academic-readiness/fiezel-academic-readiness.js',
    'features/personal-journey/fiezel-personal-journey.js',
    'features/continuity/fiezel-continuity.js',
    'app.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }

  return { ctx: context, store, A: context.__fiezelAudit };
}

// 1. Konstanta FIEZEL_TARGET_COURSE_KEY
test('Konstanta FIEZEL_TARGET_COURSE_KEY bernilai "fz_target_course"', () => {
  const env = createEnv();
  assert.strictEqual(env.ctx.FIEZEL_TARGET_COURSE_KEY, 'fz_target_course', 'FIEZEL_TARGET_COURSE_KEY tidak cocok');
});

// 2. switchTargetLangStorage('ja') menyimpan ke localStorage['fz_target_course']
test('switchTargetLangStorage("ja") menulis ke "fz_target_course" dan memperbarui activeTargetLang()', () => {
  const env = createEnv();
  assert.strictEqual(env.ctx.activeTargetLang(), 'en', 'bawaan awal harus en');
  env.ctx.switchTargetLangStorage('ja');
  assert.strictEqual(env.store['fz_target_course'], 'ja', 'fz_target_course tidak ditulis ke localStorage');
  assert.strictEqual(env.ctx.activeTargetLang(), 'ja', 'activeTargetLang() tidak mengembalikan ja');
  assert.strictEqual(env.A.liveState().preferences.targetLang, 'ja', 'state.preferences.targetLang bukan ja');
});

// 3. activeTargetLang() memprioritaskan localStorage['fz_target_course']
test('activeTargetLang() membaca langsung dari localStorage fz_target_course', () => {
  const env = createEnv({ 'fz_target_course': 'ja' });
  assert.strictEqual(env.ctx.activeTargetLang(), 'ja', 'activeTargetLang() harus membaca fz_target_course');
});

// 4. Cold boot reload untuk user dengan Puter / akun yang sudah migrasi
test('Cold boot reload mempertahankan kursus Jepang untuk user akun bermigrasi', () => {
  const uuid = 'user-test-uuid-99';
  const accountKey = 'fiezel-v5-state:' + uuid;
  const jaProgressKey = accountKey + '@ja';

  const baseAccountState = {
    version: '5.23.0',
    ownerUuid: uuid,
    userName: 'Akiko',
    totalAnswered: 5,
    preferences: { activeLevel: 'A1', targetLang: 'ja' }
  };
  const jaProgress = {
    grammar: { 'i_adjective_before_noun_no_na': { total: 3, correct: 3, mastery: 100 } },
    totalAnswered: 3,
    preferences: { activeLevel: 'A1' }
  };

  const initialStore = {
    'fiezel-v5-legacy-owner': uuid,
    [accountKey]: JSON.stringify(baseAccountState),
    [jaProgressKey]: JSON.stringify(jaProgress),
    'fz_target_course': 'ja'
    // LEGACY_STATE_KEY ('fiezel-v4-state') sengaja TIDAK ADA (sudah dihapus saat migrasi)
  };

  // Simulasikan cold boot baru
  const booted = createEnv(initialStore);
  assert.strictEqual(booted.ctx.activeTargetLang(), 'ja', 'activeTargetLang() pasca boot bukan ja');
  const live = booted.A.liveState();
  assert.strictEqual(live.preferences.targetLang, 'ja', 'liveState preferences targetLang bukan ja');
  assert.ok(live.grammar['i_adjective_before_noun_no_na'], 'progres tata bahasa Jepang tidak terhidrasi');
  assert.strictEqual(live.grammar['i_adjective_before_noun_no_na'].mastery, 100, 'mastery Jepang tidak cocok');
});

// 5. Cold boot reload dengan fz_last_account jika legacy-owner kosong
test('Cold boot reload menyelaraskan akun dari fz_last_account jika legacy-owner kosong', () => {
  const uuid = 'user-fz-last-88';
  const accountKey = 'fiezel-v5-state:' + uuid;
  const jaProgressKey = accountKey + '@ja';

  const baseAccountState = {
    version: '5.23.0',
    ownerUuid: uuid,
    userName: 'Kenji',
    totalAnswered: 4,
    preferences: { activeLevel: 'A1', targetLang: 'ja' }
  };
  const jaProgress = {
    grammar: { 'particles_wa_ga': { total: 5, correct: 5, mastery: 100 } },
    totalAnswered: 5,
    preferences: { activeLevel: 'A1' }
  };

  const initialStore = {
    'fz_last_account': JSON.stringify({ uuid: uuid }),
    [accountKey]: JSON.stringify(baseAccountState),
    [jaProgressKey]: JSON.stringify(jaProgress),
    'fz_target_course': 'ja'
  };

  const booted = createEnv(initialStore);
  assert.strictEqual(booted.ctx.activeTargetLang(), 'ja', 'activeTargetLang() bukan ja');
  const live = booted.A.liveState();
  assert.strictEqual(live.preferences.targetLang, 'ja', 'state targetLang bukan ja');
  assert.ok(live.grammar['particles_wa_ga'], 'progres tata bahasa Jepang particles_wa_ga tidak terhidrasi');
});

// 6. Cold boot reload untuk user anonim (tanpa akun) yang memilih Jepang
test('Cold boot reload mempertahankan kursus Jepang untuk user anonim', () => {
  const baseAnonState = {
    version: '5.23.0',
    totalAnswered: 2,
    preferences: { activeLevel: 'A1', targetLang: 'ja' }
  };
  const jaProgress = {
    grammar: { 'verb_masu_form': { total: 2, correct: 2, mastery: 100 } },
    totalAnswered: 2,
    preferences: { activeLevel: 'A1' }
  };

  const initialStore = {
    'fiezel-v4-state': JSON.stringify(baseAnonState),
    'fiezel-v4-state@ja': JSON.stringify(jaProgress),
    'fz_target_course': 'ja'
  };

  const booted = createEnv(initialStore);
  assert.strictEqual(booted.ctx.activeTargetLang(), 'ja', 'activeTargetLang() untuk user anonim bukan ja');
  const live = booted.A.liveState();
  assert.strictEqual(live.preferences.targetLang, 'ja', 'liveState targetLang bukan ja');
  assert.ok(live.grammar['verb_masu_form'], 'progres grammar Jepang verb_masu_form tidak terhidrasi');
});

// 7. load() tidak mereset targetLang ke 'en' saat template Jepang gagal jika fz_target_course bernilai 'ja'
test('load() tidak mereset targetLang ke en saat template ja gagal jika fz_target_course bernilai ja', async () => {
  // Mock fetch yang gagal memuat semua berkas
  const failFetch = async () => ({ ok: false, json: async () => null });
  const env = createEnv({ 'fz_target_course': 'ja' }, failFetch);
  assert.strictEqual(env.ctx.activeTargetLang(), 'ja');

  // Jalankan load(): meskipun template Jepang gagal (optional mengembalikan fallback null),
  // targetLang TIDAK boleh direset ke 'en'.
  try {
    await env.ctx.load();
  } catch (_) {
    // load() mungkin melempar karena DATA fetch gagal
  }

  assert.strictEqual(env.store['fz_target_course'], 'ja', 'fz_target_course terhapus atau berubah');
  assert.strictEqual(env.ctx.activeTargetLang(), 'ja', 'activeTargetLang() berubah menjadi bukan ja');
  assert.strictEqual(env.A.liveState().preferences.targetLang, 'ja', 'state.preferences.targetLang tereset ke en');
});

// 8. Beralih kembali ke 'en' bekerja dan bertahan saat reload
test('Beralih kembali ke en memperbarui fz_target_course dan bertahan saat reload', () => {
  const env = createEnv({ 'fz_target_course': 'ja' });
  assert.strictEqual(env.ctx.activeTargetLang(), 'ja');

  env.ctx.switchTargetLangStorage('en');
  assert.strictEqual(env.store['fz_target_course'], 'en', 'fz_target_course harus en setelah switch');
  assert.strictEqual(env.ctx.activeTargetLang(), 'en', 'activeTargetLang() harus en');

  // Reload
  const reloaded = createEnv(env.store);
  assert.strictEqual(reloaded.ctx.activeTargetLang(), 'en', 'reload harus tetap di en');
  assert.strictEqual(reloaded.A.liveState().preferences.targetLang, 'en', 'state targetLang setelah reload harus en');
});

(async () => {
  for (const [name, fn] of antrian) {
    try {
      await fn();
      pass++;
    } catch (err) {
      failures.push(name + ' — ' + err.message);
    }
  }
  const total = pass + failures.length;
  if (failures.length) {
    failures.forEach((f) => console.error('FAIL: ' + f));
    console.error('course-persistence-test GAGAL: ' + failures.length + ' assert merah');
    process.exit(1);
  }
  console.log('course-persistence-test: ' + pass + '/' + total + ' assert PASS');
})();
