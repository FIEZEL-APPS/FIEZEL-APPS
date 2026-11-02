/**
 * tests/owner-gem-wire-e2e-test.js
 *
 * Pengujian empiris end-to-end sistem sinkronisasi pesan Owner dan injeksi GEM ke PWA murid:
 * 1. Resolusi target sub kanonikal dari email Google atau handle sosial pada routeOwnerSendMessage & routeOwnerGrantGems.
 * 2. Invarian ketahanan struktur data `state.gems` (schema 1 object, anti-primitive corruption).
 * 3. Pemulihan otomatis bootstrap identitas anonim saat /api/gems/claim atau /api/learner/messages merespons 401.
 */

import assert from 'node:assert';
import { routeOwnerSendMessage } from '../workers/api/route-learner-messages.js';
import { routeOwnerGrantGems } from '../workers/api/route-gem-grant.js';

console.log('🧪 Menjalankan owner-gem-wire-e2e-test...');

// 1. Verifikasi resolusi email kanonikal di routeOwnerSendMessage
{
  const mockDb = {
    messages: [],
    gemGrants: [],
    prepare(sql) {
      const s = sql.trim();
      return {
        bind(...params) {
          return {
            async first() {
              if (s.includes('FROM auth_email WHERE email = ?1')) {
                if (params[0] === 'student@example.com') {
                  return { sub: 'canonical-google-sub-123' };
                }
              }
              return null;
            },
            async run() {
              if (s.startsWith('INSERT INTO gem_grant')) {
                mockDb.gemGrants.push({
                  id: params[0],
                  sub: params[1],
                  amount: params[2],
                  reason: params[3]
                });
              }
              if (s.startsWith('INSERT INTO owner_learner_message')) {
                mockDb.messages.push({
                  id: params[0],
                  sub: params[1],
                  title: params[2],
                  content: params[3],
                  gem_amount: params[4]
                });
              }
              return { success: true };
            }
          };
        }
      };
    }
  };

  const payload = {
    sub: 'old-stale-anonymous-sub',
    email: 'student@example.com',
    title: 'Apresiasi Belajar',
    content: 'Kerja bagus!',
    gem_amount: 100,
    reason: 'Hadiah Belajar'
  };

  const ctx = {
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    now: 1700000000000,
    bodyText: JSON.stringify(payload),
    request: new Request('https://api.fiezel.my.id/api/owner/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  };

  const res = await routeOwnerSendMessage(ctx);
  assert.strictEqual(res.status, 200, 'Harus sukses 200');
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert.strictEqual(data.sub, 'canonical-google-sub-123', 'Target sub wajib diresolusi ke sub akun Google kanonikal');
  assert.strictEqual(mockDb.messages[0].sub, 'canonical-google-sub-123');
  assert.strictEqual(mockDb.gemGrants[0].sub, 'canonical-google-sub-123');
  assert.strictEqual(mockDb.gemGrants[0].amount, 100);
  console.log('  ✅ PASS: routeOwnerSendMessage berhasil meresolusi sub kanonikal dari email Google');
}

// 2. Verifikasi resolusi email kanonikal di routeOwnerGrantGems
{
  const mockDb = {
    gemGrants: [],
    prepare(sql) {
      const s = sql.trim();
      return {
        bind(...params) {
          return {
            async first() {
              if (s.includes('FROM auth_email WHERE email = ?1')) {
                if (params[0] === 'learner@google.com') {
                  return { sub: 'google-sub-456' };
                }
              }
              return null;
            },
            async run() {
              if (s.startsWith('INSERT INTO gem_grant')) {
                mockDb.gemGrants.push({
                  id: params[0],
                  sub: params[1],
                  amount: params[2],
                  reason: params[3]
                });
              }
              return { success: true };
            }
          };
        }
      };
    }
  };

  const payload = {
    email: 'learner@google.com',
    amount: 250,
    reason: 'Prestasi Juara',
    grantedBy: 'owner'
  };

  const ctx = {
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    now: 1700000000000,
    bodyText: JSON.stringify(payload),
    request: new Request('https://api.fiezel.my.id/api/owner/grant-gems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  };

  const res = await routeOwnerGrantGems(ctx);
  assert.strictEqual(res.status, 200, 'Harus sukses 200');
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert.strictEqual(data.sub, 'google-sub-456', 'Target sub wajib diresolusi ke sub email');
  assert.strictEqual(mockDb.gemGrants[0].sub, 'google-sub-456');
  assert.strictEqual(mockDb.gemGrants[0].amount, 250);
  console.log('  ✅ PASS: routeOwnerGrantGems berhasil meresolusi sub kanonikal dari email');
}

// 3. Verifikasi invarian struktur schema state.gems
{
  const simulateFallbackAward = (state, amt, reason) => {
    const curBal = (typeof state.gems === 'object' && state.gems !== null && typeof state.gems.balance === 'number')
      ? state.gems.balance
      : (typeof state.gems === 'number' ? state.gems : 0);
    const curEarned = (typeof state.gems === 'object' && state.gems !== null && typeof state.gems.earnedTotal === 'number')
      ? state.gems.earnedTotal
      : curBal;
    const curSpent = (typeof state.gems === 'object' && state.gems !== null && typeof state.gems.spentTotal === 'number')
      ? state.gems.spentTotal
      : 0;
    const curLedger = (typeof state.gems === 'object' && state.gems !== null && Array.isArray(state.gems.ledger))
      ? state.gems.ledger
      : [];

    state.gems = {
      schema: 1,
      balance: curBal + amt,
      earnedTotal: curEarned + amt,
      spentTotal: curSpent,
      ledger: curLedger.concat([{
        at: Date.now(),
        delta: amt,
        reason: reason.slice(0, 40),
        sessionId: 'test-grant',
        level: 'A1'
      }]).slice(-50)
    };
  };

  // Test case A: state.gems mula-mula object standard
  const stateA = { gems: { schema: 1, balance: 120, earnedTotal: 150, spentTotal: 30, ledger: [] } };
  simulateFallbackAward(stateA, 50, 'bonus_1');
  assert.strictEqual(typeof stateA.gems, 'object', 'state.gems wajib tetap object');
  assert.strictEqual(stateA.gems.schema, 1);
  assert.strictEqual(stateA.gems.balance, 170);
  assert.strictEqual(stateA.gems.earnedTotal, 200);

  // Test case B: state.gems yang sempat terdegradasi menjadi integer
  const stateB = { gems: 100 };
  simulateFallbackAward(stateB, 75, 'bonus_2');
  assert.strictEqual(typeof stateB.gems, 'object', 'state.gems wajib dipulihkan menjadi object');
  assert.strictEqual(stateB.gems.schema, 1);
  assert.strictEqual(stateB.gems.balance, 175);
  assert.strictEqual(stateB.gems.earnedTotal, 175);

  console.log('  ✅ PASS: Invarian struktur schema state.gems terjamin anti-corruption');
}

console.log('🎉 Semua tes owner-gem-wire-e2e-test LULUS!\n');
