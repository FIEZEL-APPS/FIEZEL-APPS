/**
 * Test verifikasi konkurensi outbox dan pemulihan sesi 401 di features/social/fiezel-social.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const socialSrc = fs.readFileSync(path.join(__dirname, '../features/social/fiezel-social.js'), 'utf8');

function createSandbox(overrides = {}) {
  const store = {};
  const mockFetch = overrides.fetch || (async () => ({ ok: false, status: 503, json: async () => ({}) }));
  const ctx = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    Number,
    String,
    Promise,
    isFinite,
    parseInt,
    parseFloat,
    setTimeout,
    clearTimeout,
    AbortController: overrides.AbortController !== undefined ? overrides.AbortController : global.AbortController,
    localStorage: {
      getItem: k => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    navigator: { onLine: overrides.onLine !== false },
    FIEZEL_CF_CONFIG: { base: 'https://api.test' },
    fetch: mockFetch,
    addEventListener() {},
    document: { addEventListener() {}, visibilityState: 'visible' }
  };
  ctx.self = ctx;
  ctx.crypto = { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2) };
  vm.createContext(ctx);
  vm.runInContext(socialSrc, ctx, { filename: 'fiezel-social.js' });
  return { core: ctx.FiezelSocial, ctx, store };
}

async function testOutboxConcurrency() {
  console.log('--- Test 1: Outbox Concurrency / Race Condition Merge ---');
  let delayedResolve = null;
  const { core, store } = createSandbox({
    fetch: async (url, opts) => {
      if (url.includes('/api/social/rank/evidence')) {
        // Simulasikan delay transmisi jaringan
        await new Promise(r => { delayedResolve = r; setTimeout(r, 50); });
        return { ok: true, status: 200, json: async () => ({ accepted: 1 }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }
  });

  // 1. Masukkan item A ke outbox
  const itemA = core.queueEvidence([{ kind: 'meaningful_day' }]);
  assert(itemA, 'item A gagal antre');
  assert.strictEqual(core.outboxPending(), 1);

  // 2. Mulai flushOutbox (akan menunggu jaringan)
  const flushPromise = core.flushOutbox();

  // 3. Selama flush berjalan, murid menyelesaikan lesson baru (item B masuk outbox)
  await new Promise(r => setTimeout(r, 10)); // pastikan flush sudah mulai
  const itemB = core.queueEvidence([{ kind: 'lesson_mastered' }]);
  assert(itemB, 'item B gagal antre saat transmisi');

  // 4. Tunggu flush selesai
  const flushResult = await flushPromise;
  assert.strictEqual(flushResult.sent, 1, 'item A harus terkirim');

  // 5. Verifikasi bahwa item B TIDAK terhapus dari localStorage
  const currentItems = JSON.parse(store[core._outboxKey]);
  assert.strictEqual(currentItems.length, 1, 'outbox harus tersisa 1 item (item B)');
  assert.strictEqual(currentItems[0].jti, itemB.jti, 'item yang tersisa harus item B');
  console.log('PASS: Item B tidak tertimpa oleh flushOutbox!');
}

async function test401RecoveryAndDeduplication() {
  console.log('--- Test 2: 401 Session Recovery & Inflight Deduplication ---');
  let anonFetchCount = 0;
  let callCount = 0;

  const { core } = createSandbox({
    fetch: async (url, opts) => {
      if (url.includes('/api/auth/anon')) {
        anonFetchCount++;
        await new Promise(r => setTimeout(r, 30));
        return { ok: true, status: 200, json: async () => ({}) };
      }
      if (url.includes('/api/social/profile/me')) {
        callCount++;
        // Pertama kali panggil, kembalikan 401 unauthorized
        if (anonFetchCount === 0) {
          return { ok: false, status: 401, json: async () => ({ error: 'unauthorized' }) };
        }
        // Setelah anon diterbitkan, kembalikan 200
        return { ok: true, status: 200, json: async () => ({ handle: 'budi' }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }
  });

  // Panggil 3 request serentak ke profileMe yang memicu 401
  const [res1, res2, res3] = await Promise.all([
    core.api.profileMe(),
    core.api.profileMe(),
    core.api.profileMe()
  ]);

  assert.strictEqual(res1.ok, true, 'res1 harus sukses setelah pemulihan 401');
  assert.strictEqual(res2.ok, true, 'res2 harus sukses setelah pemulihan 401');
  assert.strictEqual(res3.ok, true, 'res3 harus sukses setelah pemulihan 401');
  assert.strictEqual(anonFetchCount, 1, 'POST /api/auth/anon hanya boleh dipanggil 1 kali (deduplikasi in-flight)');
  console.log('PASS: 401 pulih dan ensureAnon dideduplikasi!');
}

async function testAbortControllerTimeout() {
  console.log('--- Test 3: AbortController Timeout Protection ---');
  let signalReceivedInCall = null;
  let signalReceivedInProbe = null;

  const { core } = createSandbox({
    fetch: async (url, opts) => {
      if (url.includes('/api/config')) {
        signalReceivedInProbe = opts && opts.signal;
        return { ok: true, status: 200, json: async () => ({ flags: { cfSocialEnabled: true } }) };
      }
      if (url.includes('/api/social/profile/me')) {
        signalReceivedInCall = opts && opts.signal;
        return { ok: true, status: 200, json: async () => ({ handle: 'andi' }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }
  });

  await core.probeFlag(true);
  assert(signalReceivedInProbe, 'probeFlag harus menyertakan AbortSignal');

  await core.api.profileMe();
  assert(signalReceivedInCall, 'call() harus menyertakan AbortSignal');

  console.log('PASS: AbortSignal terpasang di probeFlag dan call()!');
}

async function run() {
  await testOutboxConcurrency();
  await test401RecoveryAndDeduplication();
  await testAbortControllerTimeout();
  console.log('ALL CONCURRENCY TESTS PASSED!');
}

run().catch(err => {
  console.error('CONCURRENCY TEST FAILED:', err);
  process.exit(1);
});
