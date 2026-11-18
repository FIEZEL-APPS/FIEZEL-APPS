#!/usr/bin/env node
/**
 * tests/account-cloud-sync-test.js — SINKRONISASI PROGRES AKUN LINTAS PERANGKAT.
 *
 * Memastikan tidak ada progres belajar yang hilang atau tertimpa kosong saat
 * murid masuk ke akunnya di perangkat baru (Google OAuth / akun FIEZEL):
 *   1. Worker /api/brain/state memaksa cookie identitas terverifikasi (401 tanpa cookie)
 *      dan mengisolasi state antar `sub`.
 *   2. Login di HP baru dengan state lokal kosong TIDAK PERNAH menimpa progres
 *      server (nama, GEM + ledger + spentTotal, level, streak, en/ja/zh, BKT,
 *      confidenceHistory, sessionHistory, retentionProbe, fsrs6Shadow).
 *   3. Merge GEM menangani irisan ledger maupun snapshot disjoin / legacy tanpa
 *      penggandaan.
 *   4. Runtime nyata `app.js` di `vm`:
 *      - HP A belajar (en + ja + GEM + BKT) -> sync ke server
 *      - HP B kosong total -> login -> awaitAccountCloudSyncReady() -> seluruh
 *        progres, GEM, multi-bahasa, dan BKT langsung terpulihkan
 *      - Pergantian akun di HP bersama: `deactivateAccountState()` membersihkan
 *        `fz_last_account` & `SAFETY_SNAPSHOT_KEY`, dan `findBestStoredStudentState('bob')`
 *        menolak mewarisi progres Alice.
 *      - Daily login bonus ditunda selama tarikan awal awan berjalan agar tidak
 *        menggandakan +5 GEM harian.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { webcrypto } = require('crypto');

const ROOT = path.join(__dirname, '..');
const HMAC_SECRET = 'kunci-rahasia-uji-cloud-state-m025-806-min-32-bytes!!';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

let pass = 0;
const failures = [];
const asyncQueue = [];

function test(name, fn) {
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      failures.push(`${name} — fungsi async didaftarkan di test(), gunakan testAsync()`);
      res.catch(() => {});
      return;
    }
    pass++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failures.push(`${name} — ${err && err.stack ? err.stack : err}`);
  }
}

function testAsync(name, fn) {
  asyncQueue.push([name, fn]);
}

function makeCloudD1() {
  const cloudStates = new Map(); // sub -> { sub, snapshot_json, revision, updated_at }
  const attempts = new Map(); // "sub|attempt_id" -> row
  const identities = new Map(); // sub -> row

  function runSql(rawSql, args) {
    const t = String(rawSql || '').replace(/\s+/g, ' ').trim();
    if (/^CREATE /i.test(t) || /^PRAGMA /i.test(t) || /^ALTER /i.test(t)) {
      return { first: null, results: [], meta: { changes: 0 } };
    }
    if (/^SELECT sub, created_at, last_seen_day, class, plan, revoked_at FROM identity WHERE sub = \?1/i.test(t)) {
      const hit = identities.get(args[0]) || null;
      return { first: hit, results: hit ? [hit] : [], meta: {} };
    }
    if (/^INSERT OR IGNORE INTO identity/i.test(t)) {
      if (!identities.has(args[0])) {
        identities.set(args[0], { sub: args[0], created_at: args[1], last_seen_day: args[2], class: null, plan: 'free', revoked_at: null });
      }
      return { first: null, results: [], meta: { changes: 1 } };
    }
    if (/^UPDATE identity SET last_seen_day/i.test(t)) {
      const cur = identities.get(args[0]);
      if (cur && cur.last_seen_day !== args[1]) cur.last_seen_day = args[1];
      return { first: null, results: [], meta: { changes: 1 } };
    }
    if (/^SELECT snapshot_json, revision, updated_at FROM account_cloud_state WHERE sub = \? LIMIT 1/i.test(t)) {
      const row = cloudStates.get(args[0]) || null;
      return { first: row ? { ...row } : null, results: row ? [{ ...row }] : [], meta: {} };
    }
    if (/^INSERT OR REPLACE INTO account_cloud_state \(sub, snapshot_json, revision, updated_at\) VALUES \(\?, \?, \?, \?\)/i.test(t)) {
      cloudStates.set(args[0], {
        sub: args[0],
        snapshot_json: args[1],
        revision: Number(args[2]) || 1,
        updated_at: Number(args[3]) || Date.now()
      });
      return { first: null, results: [], meta: { changes: 1 } };
    }
    if (/^DELETE FROM account_cloud_state WHERE sub = \?/i.test(t)) {
      const existed = cloudStates.delete(args[0]);
      return { first: null, results: [], meta: { changes: existed ? 1 : 0 } };
    }
    if (/^INSERT OR REPLACE INTO brain_attempts/i.test(t)) {
      attempts.set(`${args[0]}|${args[1]}`, { sub: args[0], attempt_id: args[1], data: args[2], created_at: args[3] });
      return { first: null, results: [], meta: { changes: 1 } };
    }
    if (/^SELECT data FROM brain_attempts WHERE sub = \?/i.test(t)) {
      const results = [];
      for (const row of attempts.values()) {
        if (row.sub === args[0]) results.push({ data: row.data });
      }
      return { first: results[0] || null, results, meta: {} };
    }
    if (/^DELETE FROM brain_attempts WHERE sub = \?/i.test(t)) {
      let changes = 0;
      for (const [k, row] of attempts.entries()) {
        if (row.sub === args[0]) {
          attempts.delete(k);
          changes++;
        }
      }
      return { first: null, results: [], meta: { changes } };
    }
    return { first: null, results: [], meta: { changes: 0 } };
  }

  return {
    cloudStates,
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind(...args) {
          bound = args;
          return stmt;
        },
        async first() {
          return runSql(sql, bound).first;
        },
        async all() {
          const r = runSql(sql, bound);
          return { results: r.results || [], meta: r.meta || {} };
        },
        async run() {
          const r = runSql(sql, bound);
          return { success: true, meta: r.meta || { changes: 0 } };
        }
      };
      return stmt;
    },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    }
  };
}

function makeWorkerEnv(db) {
  return {
    CORE_DB: db,
    SESSION_HMAC_KEY_CURRENT: HMAC_SECRET,
    ALLOWED_ORIGINS: 'https://fiezel.my.id,http://localhost,http://127.0.0.1:4173'
  };
}

const SUB_ALICE = '11111111-1111-4111-8111-111111111111';
const SUB_BOB = '22222222-2222-4222-8222-222222222222';
const SUB_E2E = '33333333-3333-4333-8333-333333333333';
const SUB_DAILY = '44444444-4444-4444-8444-444444444444';
const SUB_LANG = '55555555-5555-4555-8555-555555555555';

function loadAppVm({ worker, env, cookieSub = '', mwIdentity, preSeed = {} }) {
  const store = { ...preSeed };
  const els = {};
  const el = (id) => els[id] || (els[id] = {
    id, innerHTML: '', textContent: '', value: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {}, click() {}, onclick: null
  });
  const docListeners = {};
  const winListeners = {};
  const document = {
    baseURI: 'http://127.0.0.1:4173/',
    visibilityState: 'visible',
    getElementById: el,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => ({
      classList: { add() {}, remove() {} }, style: {}, append() {}, appendChild() {},
      addEventListener() {}, remove() {}, click() {}
    }),
    addEventListener: (evt, fn) => { (docListeners[evt] ||= []).push(fn); },
    body: { classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {} }
  };
  const localStorage = {
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  let activeSub = cookieSub;

  const mockFetch = async (url, init = {}) => {
    const rawUrl = String(url || '');
    const u = rawUrl.startsWith('http') ? new URL(rawUrl) : new URL(rawUrl, 'http://127.0.0.1:4173');
    if (u.pathname.startsWith('/api/')) {
      const headers = new Headers(init.headers || {});
      headers.set('Origin', 'https://fiezel.my.id');
      if (activeSub) {
        const signed = await mwIdentity.signIdentity(env, activeSub, Date.now());
        headers.set('Cookie', `fz_id=${signed.value}`);
      }
      const req = new Request(`https://api.fiezel.my.id${u.pathname}${u.search}`, {
        method: init.method || 'GET',
        headers,
        body: init.body
      });
      return worker.fetch(req, env, { waitUntil() {} });
    }
    return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  const context = {
    console,
    document,
    localStorage,
    fetch: mockFetch,
    location: { href: 'http://localhost/' },
    navigator: { onLine: true },
    window: null,
    self: null,
    Date,
    Intl,
    Math,
    URL,
    Error,
    Promise,
    JSON,
    Request,
    Response,
    Headers,
    AbortController: globalThis.AbortController,
    setTimeout,
    clearTimeout,
    crypto: globalThis.crypto,
    TextEncoder,
    TextDecoder,
    Blob: function () {},
    setInterval: () => ({ unref() {} }),
    clearInterval() {},
    Notification: { permission: 'denied' },
    SpeechSynthesisUtterance: function () {},
    speechSynthesis: { cancel() {}, speak() {} },
    addEventListener: (evt, fn) => { (winListeners[evt] ||= []).push(fn); },
    queueMicrotask: (fn) => fn()
  };
  context.window = context;
  context.self = context;
  context.window.scrollTo = () => {};
  vm.createContext(context);

  const bootFiles = [
    'core-config.js',
    'features/i18n/fiezel-i18n.js',
    ...fs.readdirSync(path.join(ROOT, 'features/i18n')).filter((n) => /^copy-id-.*\.js$/.test(n)).sort().map((n) => `features/i18n/${n}`),
    'features/brain/fiezel-target-language.js',
    'features/brain/fiezel-attempt-record.js',
    'features/brain/fiezel-mastery-bkt.js',
    'features/speaking-listening/speaking-listening-config.js',
    'features/speaking-listening/gems-core.js',
    'features/skills-evidence/fiezel-skills-evidence.js',
    'features/academic-readiness/fiezel-academic-readiness.js',
    'features/personal-journey/fiezel-personal-journey.js',
    'features/continuity/fiezel-continuity.js',
    'features/auth/fiezel-auth-screen.js',
    'app.js'
  ];
  for (const file of bootFiles) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }

  return {
    ctx: context,
    store,
    A: context.__fiezelAudit,
    setSub(nextSub) { activeSub = nextSub; }
  };
}

async function runAll() {
  const { pathToFileURL } = require('url');
  const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
  const workerMod = await imp('workers/api/index.js');
  const legacyMod = await imp('workers/api/route-legacy.js');
  const mwIdentity = await imp('workers/api/mw-identity.js');
  const schemaMod = await imp('workers/api/schema.js');
  const worker = workerMod.default;

  test('byteLimitFor mengizinkan payload snapshot /api/brain/state 1 MiB', () => {
    assert.strictEqual(schemaMod.byteLimitFor('/api/brain/state'), 1048576);
  });

  testAsync('A1-A2: GET dan POST /api/brain/state menolak permintaan tanpa cookie atau identity unverified (401)', async () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const getRes = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'GET',
      headers: { Origin: 'https://fiezel.my.id' }
    }), env, { waitUntil() {} });
    assert.strictEqual(getRes.status, 401);

    const postRes = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'POST',
      headers: { Origin: 'https://fiezel.my.id', 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: { userName: 'Penyusup' } })
    }), env, { waitUntil() {} });
    assert.strictEqual(postRes.status, 401);

    const unverifiedGet = await legacyMod.ROUTES.find((r) => r[0] === 'GET' && r[1] === '/api/brain/state')[2]({
      env,
      corsHeaders: {},
      identity: { sub: SUB_ALICE, verified: false }
    });
    assert.strictEqual(unverifiedGet.status, 401);
  });

  testAsync('A3-A5: Isolasi sub + HP baru kosong tidak menimpa progres server (nama, GEM, level, streak, en/ja/zh, BKT, history, shadow)', async () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const aliceCookie = (await mwIdentity.signIdentity(env, SUB_ALICE, Date.now())).value;
    const bobCookie = (await mwIdentity.signIdentity(env, SUB_BOB, Date.now())).value;

    const fullSnapshot = {
      schema: 'fiezel-account-cloud-state-v1',
      updatedAt: 1795000100000,
      userName: 'Alice Putri',
      level: 3,
      placementDone: true,
      streak: 7,
      learningDays: ['2026-11-17', '2026-11-18'],
      gems: {
        schema: 'fiezel-gems-v1',
        balance: 155,
        earnedTotal: 185,
        spentTotal: 30,
        ledger: [
          { at: 1795000010000, delta: 185, reason: 'study', sessionId: 's1', level: 'B1' },
          { at: 1795000020000, delta: -30, reason: 'hint', sessionId: 's2', level: 'B1' }
        ]
      },
      preferences: { targetLang: 'ja', learnerLocale: 'id', learningIntensity: 'rajin' },
      courses: {
        en: {
          level: 3,
          placementDone: true,
          totalAnswered: 18,
          totalCorrect: 15,
          vocab: { apple: { correct: 3, total: 3, mastery: 95, lastSeen: 1795000030000 } },
          grammar: { past_tense: { correct: 5, total: 6, mastery: 88, lastSeen: 1795000040000 } },
          history: [{ attemptId: 'att-en-1', at: 1795000040000, ok: true, type: 'grammar', skill: 'past_tense', target: 'went' }],
          confidenceHistory: [
            { confidence: 3, ok: true, at: 1795000040000, level: 'B1', skill: 'past_tense', type: 'grammar' },
            { confidence: 2, ok: false, at: 1795000050000, level: 'B1', skill: 'modal', type: 'grammar' }
          ],
          sessionHistory: [{ id: 'sess-1', at: '2026-11-18T10:00:00.000Z', completed: true, total: 10, correct: 9 }]
        },
        ja: {
          level: 2,
          placementDone: true,
          totalAnswered: 14,
          totalCorrect: 12,
          vocab: { arigatou: { correct: 4, total: 4, mastery: 96, lastSeen: 1795000060000 } },
          kana: { ka: { correct: 2, total: 2, mastery: 90, lastSeen: 1795000065000 } }
        },
        zh: {
          level: 2,
          placementDone: false,
          totalAnswered: 4,
          vocab: { nihao: { correct: 2, total: 2, mastery: 80, lastSeen: 1795000070000 } }
        }
      },
      sideStateByLang: {
        en: {
          bkt: { schema: 'fiezel-mastery-bkt-v1', lessons: { past_tense: { L: 0.89, n: 6, lastAt: 1795000040000 } } },
          misconceptionLedger: { schema: 'v1', entries: { past_tense_v2: { count: 1, resolved: true } } },
          retentionProbe: { userSeed: 'alice', probes: { p1: { dueAt: 1795090000000, status: 'pending' } } },
          fsrs6Shadow: [
            { attemptId: 'fs-1', at: 1795000040000, lesson: 'past_tense', ok: true },
            { attemptId: 'fs-2', at: 1795000050000, lesson: 'modal', ok: false }
          ]
        },
        ja: {
          bkt: { schema: 'fiezel-mastery-bkt-v1', lessons: { 'ja-hiragana': { L: 0.81, n: 5, lastAt: 1795000065000 } } }
        }
      }
    };

    const pushA = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'POST',
      headers: { Origin: 'https://fiezel.my.id', 'Content-Type': 'application/json', Cookie: `fz_id=${aliceCookie}` },
      body: JSON.stringify({ snapshot: fullSnapshot })
    }), env, { waitUntil() {} });
    assert.strictEqual(pushA.status, 200);
    const bodyA = await pushA.json();
    assert.strictEqual(bodyA.revision, 1);
    assert.strictEqual(bodyA.snapshot.userName, 'Alice Putri');

    // Bob tidak boleh melihat snapshot milik Alice
    const bobGet = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'GET',
      headers: { Origin: 'https://fiezel.my.id', Cookie: `fz_id=${bobCookie}` }
    }), env, { waitUntil() {} });
    const bobJson = await bobGet.json();
    assert.strictEqual(bobJson.hasSnapshot, false);
    assert.strictEqual(bobJson.snapshot, null);

    // HP B kosong mendorong state bawaan kosong -> server wajib mempertahankan progres Alice
    const emptyPush = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'POST',
      headers: { Origin: 'https://fiezel.my.id', 'Content-Type': 'application/json', Cookie: `fz_id=${aliceCookie}` },
      body: JSON.stringify({
        snapshot: {
          userName: 'Murid',
          level: 1,
          placementDone: false,
          streak: 0,
          gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] },
          preferences: { targetLang: 'en' },
          courses: { en: { level: 1, totalAnswered: 0, history: [] }, ja: { level: 1, totalAnswered: 0 } }
        }
      })
    }), env, { waitUntil() {} });
    const emptyJson = await emptyPush.json();
    assert.strictEqual(emptyJson.snapshot.userName, 'Alice Putri');
    assert.strictEqual(emptyJson.snapshot.gems.balance, 155);
    assert.strictEqual(emptyJson.snapshot.gems.earnedTotal, 185);
    assert.strictEqual(emptyJson.snapshot.gems.spentTotal, 30);
    assert.strictEqual(emptyJson.snapshot.streak, 7);
    assert.strictEqual(emptyJson.snapshot.courses.en.level, 3);
    assert.strictEqual(emptyJson.snapshot.courses.en.confidenceHistory.length, 2);
    assert.strictEqual(emptyJson.snapshot.courses.en.sessionHistory.length, 1);
    assert.strictEqual(emptyJson.snapshot.courses.ja.level, 2);
    assert.strictEqual(emptyJson.snapshot.courses.ja.totalAnswered, 14);
    assert.strictEqual(emptyJson.snapshot.courses.zh.level, 2);
    assert.strictEqual(emptyJson.snapshot.sideStateByLang.en.retentionProbe.probes.p1.status, 'pending');
    assert.strictEqual(emptyJson.snapshot.sideStateByLang.en.fsrs6Shadow.length, 2);
    assert.strictEqual(emptyJson.snapshot.sideStateByLang.ja.bkt.lessons['ja-hiragana'].n, 5);
  });

  testAsync('A6-A7: Union ledger GEM multi-device, kasus sharedCount===0, dan hapus total via /api/brain/attempts/delete', async () => {
    // 1. Legacy un-ledgered (120) + HP baru (+15 berledger) -> 135
    const gLegacy = legacyMod.mergeCloudGems(
      { schema: 'fiezel-gems-v1', balance: 120, earnedTotal: 120, spentTotal: 0, ledger: [] },
      { schema: 'fiezel-gems-v1', balance: 15, earnedTotal: 15, spentTotal: 0, ledger: [{ at: 5000, delta: 15, reason: 'daily', sessionId: 'd1' }] }
    );
    assert.strictEqual(gLegacy.balance, 135);
    assert.strictEqual(gLegacy.earnedTotal, 135);

    // 2. Disjoin tidak terpotong (50 dan 20) -> 70
    const gDisjoint = legacyMod.mergeCloudGems(
      { schema: 'fiezel-gems-v1', balance: 50, earnedTotal: 50, spentTotal: 0, ledger: [{ at: 1000, delta: 50, reason: 'a', sessionId: 'a1' }] },
      { schema: 'fiezel-gems-v1', balance: 20, earnedTotal: 20, spentTotal: 0, ledger: [{ at: 2000, delta: 20, reason: 'b', sessionId: 'b1' }] }
    );
    assert.strictEqual(gDisjoint.balance, 70);

    // 3. Delete membersihkan cloud state akun sendiri tanpa mengganggu akun lain
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const nowStamp = Date.now();
    const aliceCookie = (await mwIdentity.signIdentity(env, SUB_ALICE, nowStamp)).value;
    const bobCookie = (await mwIdentity.signIdentity(env, SUB_BOB, nowStamp)).value;

    for (const [cookie, name] of [[aliceCookie, 'Alice'], [bobCookie, 'Bob']]) {
      await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
        method: 'POST',
        headers: { Origin: 'https://fiezel.my.id', 'Content-Type': 'application/json', Cookie: `fz_id=${cookie}` },
        body: JSON.stringify({ snapshot: { userName: name, level: 2, gems: { schema: 'fiezel-gems-v1', balance: 40, earnedTotal: 40, spentTotal: 0, ledger: [] } } })
      }), env, { waitUntil() {} });
    }

    const delRes = await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/attempts/delete', {
      method: 'POST',
      headers: { Origin: 'https://fiezel.my.id', 'Content-Type': 'application/json', Cookie: `fz_id=${aliceCookie}` },
      body: '{}'
    }), env, { waitUntil() {} });
    assert.strictEqual(delRes.status, 200);

    const aliceAfter = await (await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'GET',
      headers: { Origin: 'https://fiezel.my.id', Cookie: `fz_id=${aliceCookie}` }
    }), env, { waitUntil() {} })).json();
    assert.strictEqual(aliceAfter.hasSnapshot, false);

    const bobAfter = await (await worker.fetch(new Request('https://api.fiezel.my.id/api/brain/state', {
      method: 'GET',
      headers: { Origin: 'https://fiezel.my.id', Cookie: `fz_id=${bobCookie}` }
    }), env, { waitUntil() {} })).json();
    assert.strictEqual(bobAfter.hasSnapshot, true);
    assert.strictEqual(bobAfter.snapshot.userName, 'Bob');
  });

  testAsync('B1: E2E runtime nyata app.js VM: HP A belajar (en + ja + GEM + BKT) -> HP B kosong login & pulih utuh', async () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);

    // HP A: login akun Google/FIEZEL
    const vmA = loadAppVm({ worker, env, cookieSub: SUB_E2E, mwIdentity });
    vmA.A.activateAccountState('alice_e2e');
    const stA = vmA.A.liveState();
    stA.userName = 'Alice Nusantara';
    stA.level = 3;
    stA.placementDone = true;
    stA.gems = vmA.ctx.FiezelGems.gemsEarn(stA.gems, 120, 'reward_test', 1795001000000, 's-a1', 'B1');
    stA.gems = vmA.ctx.FiezelGems.gemsSpend(stA.gems, 25, 'translation', 1795001005000, 's-a2').gems;
    stA.grammar.present_perfect = { correct: 6, total: 6, mastery: 94, lastSeen: 1795001010000, nextReview: 1795090000000, stability: 4 };
    const nowBase = Date.now();
    for (let dayOff = 0; dayOff < 3; dayOff++) {
      for (let i = 0; i < 6; i++) {
        stA.history.push({
          attemptId: `e2e-en-d${dayOff}-${i}`,
          at: nowBase - (dayOff * 86400000) - (i * 1000),
          ok: true,
          type: 'grammar',
          skill: 'present_perfect',
          target: 'have been'
        });
      }
    }
    stA.totalAnswered = stA.history.length;
    stA.totalCorrect = stA.history.length;
    stA.confidenceHistory.push({ confidence: 3, ok: true, at: nowBase, level: 'B1', skill: 'present_perfect', type: 'grammar' });
    vmA.A.bktRecord({ skill: 'present_perfect' }, true, 1);
    vmA.A.setGoalProfile('general');
    vmA.A.saveFlushWrite();
    const expectedStreakA = vmA.A.liveState().streak;
    assert.ok(expectedStreakA >= 1, 'streak HP A harus >= 1 dari aktivitas belajar nyata');

    // Belajar Jepang juga di HP A
    vmA.ctx.switchTargetLangStorage('ja');
    const stAJa = vmA.A.liveState();
    stAJa.level = 2;
    stAJa.placementDone = true;
    stAJa.vocab.sakura = { correct: 4, total: 4, mastery: 92, lastSeen: 1795001020000, nextReview: 1795090000000, stability: 3 };
    stAJa.history.push({ attemptId: 'e2e-ja-1', at: 1795001020000, ok: true, type: 'vocab', skill: 'sakura', target: 'sakura' });
    stAJa.totalAnswered = 1;
    stAJa.totalCorrect = 1;
    vmA.A.bktRecord({ skill: 'ja-vocab-1' }, true, 1);
    vmA.A.saveFlushWrite();

    // Kembali ke Inggris & sync penuh ke server
    vmA.ctx.switchTargetLangStorage('en');
    await vmA.A.awaitAccountCloudSyncReady(2000);
    await vmA.A.accountCloudStateSync({ pullFirst: false });

    const serverRow = db.cloudStates.get(SUB_E2E);
    assert.ok(serverRow && serverRow.snapshot_json, 'server harus menyimpan snapshot HP A');
    const savedOnServer = JSON.parse(serverRow.snapshot_json);
    assert.strictEqual(savedOnServer.userName, 'Alice Nusantara');
    assert.strictEqual(savedOnServer.gems.balance, 95);
    assert.strictEqual(savedOnServer.courses.ja.vocab.sakura.mastery, 92);

    // HP B: localStorage KOSONG TOTAL, lalu masuk akun yang sama
    const vmB = loadAppVm({ worker, env, cookieSub: SUB_E2E, mwIdentity });
    vmB.ctx.FiezelAuthScreen.saveSession(vmB.ctx, { role: 'murid', via: 'akun', name: 'alice_e2e' });
    vmB.A.activateAccountState('alice_e2e');
    const synced = await vmB.A.awaitAccountCloudSyncReady(2000);
    assert.strictEqual(synced, true);

    // Catatan: switchTargetLangStorage memanggil save() di bawah, tetapi di atas 'en' sudah tersinkron.
    // Verifikasi semua bidang HP B identik dengan HP A!
    const stB = vmB.A.liveState();
    assert.strictEqual(stB.userName, 'Alice Nusantara');
    assert.strictEqual(stB.gems.schema, 'fiezel-gems-v1');
    assert.strictEqual(stB.gems.balance, 95);
    assert.strictEqual(stB.gems.spentTotal, 25);
    assert.strictEqual(stB.level, 3);
    assert.ok(stB.streak >= 1, 'streak di HP B harus pulih (>= 1)');
    assert.strictEqual(stB.grammar.present_perfect.mastery, 94);
    assert.strictEqual(stB.confidenceHistory.length, 1);

    // Progres Jepang di HP B ikut terpulihkan
    vmB.ctx.switchTargetLangStorage('ja');
    const stBJa = vmB.A.liveState();
    assert.strictEqual(stBJa.level, 2);
    assert.strictEqual(stBJa.vocab.sakura.mastery, 92);
    const jaBktB = vmB.A.bktRead();
    assert.ok(jaBktB?.lessons?.['ja-vocab-1'], 'BKT Jepang harus pulih di HP B');
  });

  test('B2: Isolasi HP bersama: logout hapus SAFETY_SNAPSHOT_KEY/fz_last_account & Bob menolak progres Alice', () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const vmShared = loadAppVm({ worker, env, cookieSub: SUB_ALICE, mwIdentity });

    vmShared.A.activateAccountState('alice_shared');
    const st = vmShared.A.liveState();
    st.userName = 'Alice Lama';
    st.totalAnswered = 30;
    st.level = 4;
    st.placementDone = true;
    vmShared.A.saveFlushWrite();
    vmShared.store['fiezel-safety-snapshot-v1'] = JSON.stringify({ ownerUuid: 'alice_shared', totalAnswered: 30, userName: 'Alice Lama' });
    vmShared.store['fiezel-safety-snapshot-v1@ja'] = JSON.stringify({ totalAnswered: 12 });

    // Alice keluar akun -> fz_last_account & safety snapshot dibersihkan, tetapi kunci fiezel-v5-state:alice_shared tetap aman
    vmShared.A.deactivateAccountState();
    assert.strictEqual(vmShared.store['fz_last_account'], undefined, 'fz_last_account wajib dihapus saat logout');
    assert.strictEqual(vmShared.store['fiezel-safety-snapshot-v1'], undefined, 'safety snapshot EN wajib dihapus saat logout');
    assert.strictEqual(vmShared.store['fiezel-safety-snapshot-v1@ja'], undefined, 'safety snapshot JA wajib dihapus saat logout');
    assert.ok(vmShared.store['fiezel-v5-state:alice_shared'], 'data akun Alice tidak terhapus dari perangkat');

    // Legacy snapshot yang tidak bertuan bila sudah ada pemilik lain di LEGACY_STATE_OWNER_KEY tetap ditolak untuk Bob
    vmShared.store['fiezel-v5-legacy-owner'] = 'alice_shared';
    vmShared.store['fiezel-v4-state'] = JSON.stringify({ totalAnswered: 25, userName: 'Anon Milik Alice' });
    assert.strictEqual(vmShared.A.findBestStoredStudentState('bob_shared'), null, 'Bob tidak boleh mewarisi progres Alice');
  });

  test('B3: Daily login bonus +5 GEM ditunda saat pull awal awan aktif (anti-duplikat antar perangkat)', () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const vmB = loadAppVm({ worker, env, cookieSub: SUB_DAILY, mwIdentity });
    vmB.ctx.FiezelAuthScreen.saveSession(vmB.ctx, { role: 'murid', via: 'akun', name: 'daily_user' });
    vmB.A.activateAccountState('daily_user');
    // ensureAccountCloudSyncOnSession menyalakan progressSyncConsent dan menjadwalkan accountCloudSyncTimer
    // sehingga tarikan awal awan aktif sebelum selesai: checkDailyGemRewards tidak boleh langsung mencetak +5.
    const awardedBeforePull = vmB.ctx.checkDailyGemRewards(true);
    assert.strictEqual(awardedBeforePull, false, 'bonus login harian tidak boleh dicetak sebelum pull awan selesai');
    assert.strictEqual(vmB.A.liveState().gems.balance, 0);
  });

  testAsync('B4: applyAccountCloudSnapshot tidak menimpa targetLang jika HP B punya progres bahasa aktif', async () => {
    const db = makeCloudD1();
    const env = makeWorkerEnv(db);
    const vmB = loadAppVm({ worker, env, cookieSub: SUB_LANG, mwIdentity });
    vmB.A.activateAccountState('lang_user');
    vmB.ctx.switchTargetLangStorage('zh');
    const stZh = vmB.A.liveState();
    stZh.totalAnswered = 3;
    stZh.vocab.xie = { correct: 3, total: 3, mastery: 90, lastSeen: 1795002000000 };
    vmB.A.saveFlushWrite();

    const applied = vmB.A.applyAccountCloudSnapshot({
      schema: 'fiezel-account-cloud-state-v1',
      updatedAt: 1795002050000,
      userName: 'Lang Keeper',
      streak: 3,
      gems: { schema: 'fiezel-gems-v1', balance: 45, earnedTotal: 45, spentTotal: 0, ledger: [] },
      preferences: { targetLang: 'en' },
      courses: { en: { level: 2, placementDone: true, totalAnswered: 5, grammar: { noun: { correct: 5, total: 5, mastery: 95, lastSeen: 1795001900000 } } } }
    });
    assert.strictEqual(applied, true);
    assert.strictEqual(vmB.A.liveState().preferences.targetLang, 'zh', 'kursus aktif zh di HP B tidak boleh dipaksa pindah ke en');
    assert.strictEqual(vmB.A.liveState().gems.balance, 45);
    vmB.ctx.switchTargetLangStorage('en');
    assert.strictEqual(vmB.A.liveState().grammar.noun.mastery, 95);
  });

  for (const [name, fn] of asyncQueue) {
    try {
      await fn();
      pass++;
      console.log(`PASS ${name}`);
    } catch (err) {
      failures.push(`${name} — ${err && err.stack ? err.stack : err}`);
    }
  }

  console.log(`\naccount-cloud-sync-test: ${pass} lulus, ${failures.length} gagal`);
  if (failures.length) {
    for (const f of failures) console.error('FAIL:', f);
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
