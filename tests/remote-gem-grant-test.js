#!/usr/bin/env node
/**
 * tests/remote-gem-grant-test.js — Verifikasi Injeksi & Klaim Remote GEM.
 */

import assert from 'node:assert/strict';
import {
  routeGemsClaim,
  routeOwnerGrantGems,
  GEMS_CLAIM_PATH,
  OWNER_GRANT_GEMS_PATH,
  ROUTES
} from '../workers/api/route-gem-grant.js';
import { BYTE_LIMITS } from '../workers/api/schema.js';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    throw err;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    throw err;
  }
}

console.log('🧪 Menjalankan remote-gem-grant-test...');

test('Byte limits terdaftar di schema.js', () => {
  assert.equal(BYTE_LIMITS[GEMS_CLAIM_PATH], 2048);
  assert.equal(BYTE_LIMITS[OWNER_GRANT_GEMS_PATH], 4096);
});

test('Rute terdaftar di array ROUTES', () => {
  assert.equal(ROUTES.length, 2);
  assert.equal(ROUTES[0][0], 'POST');
  assert.equal(ROUTES[0][1], GEMS_CLAIM_PATH);
  assert.equal(ROUTES[1][0], 'POST');
  assert.equal(ROUTES[1][1], OWNER_GRANT_GEMS_PATH);
});

await asyncTest('Klaim tanpa autentikasi menghasilkan 401', async () => {
  const ctx = { identity: null, corsHeaders: {} };
  const res = await routeGemsClaim(ctx);
  assert.equal(res.status, 401);
});

await asyncTest('Klaim dengan database tidak tersedia menghasilkan 503', async () => {
  const ctx = {
    identity: { verified: true, sub: 'test-user-uuid' },
    env: {},
    corsHeaders: {}
  };
  const res = await routeGemsClaim(ctx);
  assert.equal(res.status, 503);
});

await asyncTest('Klaim berhasil mengambil & menandai unclaimed grants', async () => {
  const mockRows = [
    { id: 'grant-1', amount: 50, reason: 'Ulasan Belajar', created_at: 1000 },
    { id: 'grant-2', amount: 25, reason: 'Bonus Streak', created_at: 2000 }
  ];
  let updatedSub = null;
  let updateCalled = false;

  const mockDb = {
    prepare(sql) {
      if (sql.includes('SELECT id, amount, reason')) {
        return {
          bind(sub) {
            return {
              all: async () => ({ results: mockRows })
            };
          }
        };
      }
      if (sql.includes('UPDATE gem_grant SET claimed_at')) {
        return {
          bind(nowMs, sub) {
            updatedSub = sub;
            updateCalled = true;
            return {
              run: async () => ({ changes: 2 })
            };
          }
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  const ctx = {
    identity: { verified: true, sub: 'target-student-sub' },
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    now: 5000
  };

  const res = await routeGemsClaim(ctx);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.grants.length, 2);
  assert.equal(data.grants[0].amount, 50);
  assert.equal(data.grants[1].amount, 25);
  assert.equal(updateCalled, true);
  assert.equal(updatedSub, 'target-student-sub');
});

await asyncTest('Owner grant-gems berhasil menyuntikkan grant ke D1', async () => {
  let inserted = null;
  const mockDb = {
    prepare(sql) {
      if (sql.includes('SELECT sub FROM social_handle')) {
        return {
          bind(handle) {
            return {
              first: async () => ({ sub: 'resolved-zara-sub' })
            };
          }
        };
      }
      if (sql.includes('INSERT INTO gem_grant')) {
        return {
          bind(id, sub, amount, reason, grantedBy, nowMs) {
            inserted = { id, sub, amount, reason, grantedBy, nowMs };
            return {
              run: async () => ({ changes: 1 })
            };
          }
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };

  const ctx = {
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    now: 9999,
    request: new Request('http://localhost/api/owner/grant-gems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'zara',
        amount: 100,
        reason: 'Uji Coba Remote Inject GEM'
      })
    })
  };

  const res = await routeOwnerGrantGems(ctx);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.sub, 'resolved-zara-sub');
  assert.equal(data.amount, 100);
  assert.equal(inserted.amount, 100);
  assert.equal(inserted.sub, 'resolved-zara-sub');
  assert.equal(inserted.reason, 'Uji Coba Remote Inject GEM');
});

console.log(`\n🎉 Semua ${passed} tes remote-gem-grant-test LULUS!\n`);
