/**
 * tests/voice-sync-keys-test.js
 * Unit test for Gemini Live Key Dynamic Pool & Sentinel Auto-Sync Endpoint (/api/voice/sync-keys).
 */
import assert from 'node:assert';
import crypto from 'node:crypto';
import { parseKeys, resolvePoolKeys, routeVoiceSyncKeys } from '../workers/api/voice/route-voice-live.js';

console.log('[TEST] Starting Voice Live Sync & Dynamic Pool Unit Tests...');

class MockKV {
  constructor() {
    this.store = new Map();
  }
  async get(key, _opts) {
    return this.store.get(key) || null;
  }
  async put(key, value) {
    this.store.set(key, String(value));
  }
}

// 1. Fallback to static env keys when KV is empty
{
  const mockEnv = {
    GEMINI_LIVE_KEYS: 'AIzaSyA11111111111111111111111111111111,AIzaSyB22222222222222222222222222222222',
    CFG: new MockKV()
  };
  const ctx = { env: mockEnv };
  const keys = await resolvePoolKeys(ctx);
  assert.strictEqual(keys.length, 2, 'Should return 2 keys from static env');
  assert.strictEqual(keys[0], 'AIzaSyA11111111111111111111111111111111');
  console.log('  ✓ Fallback to static env keys when KV empty passed');
}

// 2. Dynamic KV keys priority over static env
{
  const mockKV = new MockKV();
  await mockKV.put('cfg:gemini_live_keys', 'AQ.Ab8DynamicKey1111111111111111,AQ.Ab8DynamicKey2222222222222222,AQ.Ab8DynamicKey3333333333333333');
  const mockEnv = {
    GEMINI_LIVE_KEYS: 'AIzaSyOldKeyStatic1111111111111111111111',
    CFG: mockKV
  };
  const ctx = { env: mockEnv };
  const keys = await resolvePoolKeys(ctx);
  assert.strictEqual(keys.length, 3, 'Should prioritize 3 dynamic keys from KV');
  assert.strictEqual(keys[0], 'AQ.Ab8DynamicKey1111111111111111');
  assert.strictEqual(keys[2], 'AQ.Ab8DynamicKey3333333333333333');
  console.log('  ✓ Dynamic KV keys priority over static env passed');
}

// 3. routeVoiceSyncKeys rejection on unauthorized access
{
  const secretOwnerToken = 'my_super_secret_owner_token_12345';
  const ownerHash = crypto.createHash('sha256').update(secretOwnerToken).digest('hex');

  const mockKV = new MockKV();
  const mockEnv = {
    OWNER_TOKEN_HASH: ownerHash,
    CFG: mockKV
  };
  const req = new Request('https://api.fiezel.my.id/api/voice/sync-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fiezel-owner-token': 'wrong_token'
    },
    body: JSON.stringify({ keys: ['AIzaSyTestKey11111111111111111111111'] })
  });
  const ctx = {
    request: req,
    env: mockEnv
  };

  const res = await routeVoiceSyncKeys(ctx);
  assert.strictEqual(res.status, 403, 'Should return 403 Forbidden for wrong token');
  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, 'forbidden_sync');
  console.log('  ✓ routeVoiceSyncKeys rejection on unauthorized access passed');
}

// 4. routeVoiceSyncKeys validation for empty or malformed keys
{
  const secretOwnerToken = 'my_super_secret_owner_token_12345';
  const ownerHash = crypto.createHash('sha256').update(secretOwnerToken).digest('hex');

  const mockKV = new MockKV();
  const mockEnv = {
    OWNER_TOKEN_HASH: ownerHash,
    CFG: mockKV
  };
  const req = new Request('https://api.fiezel.my.id/api/voice/sync-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fiezel-owner-token': secretOwnerToken
    },
    body: JSON.stringify({ keys: ['short', 'invalid_format'] })
  });
  const ctx = {
    request: req,
    env: mockEnv
  };

  const res = await routeVoiceSyncKeys(ctx);
  assert.strictEqual(res.status, 400, 'Should return 400 for invalid keys');
  const body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.error, 'no_valid_keys');
  console.log('  ✓ routeVoiceSyncKeys validation for invalid keys passed');
}

// 5. routeVoiceSyncKeys success & seamless propagation to resolvePoolKeys
{
  const secretOwnerToken = 'my_super_secret_owner_token_12345';
  const ownerHash = crypto.createHash('sha256').update(secretOwnerToken).digest('hex');

  const mockKV = new MockKV();
  const mockEnv = {
    OWNER_TOKEN_HASH: ownerHash,
    GEMINI_LIVE_KEYS: 'AIzaSyOldFallbackKey1111111111111111111',
    CFG: mockKV
  };

  const newSentinelKeys = [
    'AQ.Ab8FreshKeyAlpha111111111111111111',
    'AQ.Ab8FreshKeyBeta2222222222222222222',
    'AIzaSyFreshKeyGamma3333333333333333333'
  ];

  const req = new Request('https://api.fiezel.my.id/api/voice/sync-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-fiezel-owner-token': secretOwnerToken
    },
    body: JSON.stringify({ keys: newSentinelKeys })
  });
  const ctx = {
    request: req,
    env: mockEnv
  };

  const res = await routeVoiceSyncKeys(ctx);
  assert.strictEqual(res.status, 200, 'Should return 200 OK on successful sync');
  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.synchronized, true);
  assert.strictEqual(body.activeCount, 3);

  // Now verify that resolvePoolKeys immediately reads the newly synced keys
  const livePool = await resolvePoolKeys(ctx);
  assert.strictEqual(livePool.length, 3, 'Live pool must have 3 synced keys');
  assert.deepStrictEqual(livePool, newSentinelKeys, 'Live pool must match synced keys exactly');
  console.log('  ✓ routeVoiceSyncKeys success & seamless propagation to live pool passed');
}

console.log('>>> ALL VOICE LIVE SYNC TESTS PASSED! <<<');
