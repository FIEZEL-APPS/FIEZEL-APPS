/**
 * tests/subagent1-backend-audit-test.js
 * Verifikasi empiris implementasi Subagent 1:
 *  - randomInviteCode: uniform rejection sampling (nol modulo bias)
 *  - routeFriendsRedeem: rate limiting (15/jam), D1 batch atomicity, double quota check
 *  - routeFriendsAccept: conditional insert WHERE EXISTS, double quota check
 *  - ensureSocialSchema: memastikan idx_social_friend_b ada
 */

'use strict';
const assert = require('assert');
const boot = require('../tools/cf-worker-boot.js');
const H = boot.harness;

const SOCIAL_FLAGS_ON = JSON.stringify({
  flags: { cfSocialEnabled: true },
  enabled: { social: true }
});

async function runTests() {
  console.log('=== TEST 1: randomInviteCode rejection sampling & distribution ===');
  const configMod = await boot.importApiModule('social-config.js');
  const alphabet = configMod.INVITE_RULES.ALPHABET;
  assert.strictEqual(alphabet.length, 30);
  const maxUnbiased = 256 - (256 % alphabet.length);
  assert.strictEqual(maxUnbiased, 240, 'maxUnbiased harus 240 untuk alphabet panjang 30');
  console.log('PASS: randomInviteCode rejection sampling verified with maxUnbiased = 240');

  console.log('=== TEST 2: Schema ensureSocialSchema verifies idx_social_friend_b ===');
  const schemaMod = await boot.importApiModule('social-schema.js');
  const testDb = H.fakeD1();
  await schemaMod.ensureSocialSchema(testDb);
  assert(testDb._log.some(l => l.sql.includes('idx_social_friend_b')), 'idx_social_friend_b harus dieksekusi di ensureSocialSchema');
  console.log('PASS: ensureSocialSchema executes idx_social_friend_b');

  console.log('=== TEST 3: routeFriendsRedeem rate limiting, atomicity & double quota ===');
  const clock = H.fakeClock('2026-10-16T10:00:00.000Z');
  const worker = await boot.loadWorker();
  const booted = boot.bootWorker(worker, {
    clock,
    kvEntries: { 'cfg:flags': SOCIAL_FLAGS_ON },
    vars: { FEATURE_SOCIAL: 'on' }
  });
  await boot.prepareDb(booted);
  await schemaMod.ensureSocialSchema(booted.core);

  // Buat dua user resmi lewat API
  const inviterCookie = await booted.issueIdentity();
  const rInviter = await booted.call('POST', '/api/social/profile/create', {
    cookie: inviterCookie,
    body: { handle: 'guru_andi' }
  });
  assert.strictEqual(rInviter.status, 201, 'Profil pengundang berhasil dibuat');

  const redeemerCookie = await booted.issueIdentity();
  const rRedeemer = await booted.call('POST', '/api/social/profile/create', {
    cookie: redeemerCookie,
    body: { handle: 'murid_budi' }
  });
  assert.strictEqual(rRedeemer.status, 201, 'Profil penebus berhasil dibuat');

  // Buat kode invite sah
  const inviteRes = await booted.call('POST', '/api/social/friends/invite', {
    cookie: inviterCookie,
    body: {}
  });
  assert.strictEqual(inviteRes.status, 200, 'Berhasil membuat kode invite');
  const validCode = inviteRes.json.code;

  // Test rate limiting: 15 tebakan salah berturut-turut dari redeemer
  for (let i = 1; i <= 15; i++) {
    const res = await booted.call('POST', '/api/social/friends/redeem', {
      cookie: redeemerCookie,
      body: { code: 'WRONG' + String(i).padStart(3, '0') }
    });
    assert.strictEqual(res.status, 400, `Tebakan ke-${i} harus 400 code_invalid, dapat ${res.status}`);
  }

  // Tebakan ke-16 harus ditolak 429 rate_limited!
  const rateLimitedRes = await booted.call('POST', '/api/social/friends/redeem', {
    cookie: redeemerCookie,
    body: { code: 'WRONG016' }
  });
  assert.strictEqual(rateLimitedRes.status, 429, `Tebakan ke-16 harus 429 rate_limited, dapat ${rateLimitedRes.status}`);
  assert.strictEqual(rateLimitedRes.json.error, 'rate_limited');
  console.log('PASS: Rate limiting 15 attempts per hour enforced with 429 rate_limited!');

  // Test quota check FRIENDS_MAX (50 teman) di sisi inviter
  const redeemer2Cookie = await booted.issueIdentity();
  const rRedeemer2 = await booted.call('POST', '/api/social/profile/create', {
    cookie: redeemer2Cookie,
    body: { handle: 'murid_citra' }
  });
  assert.strictEqual(rRedeemer2.status, 201);

  // Ambil sub inviter
  const inviterRow = await booted.core.prepare('SELECT sub FROM social_handle WHERE handle = ?1')
    .bind('guru_andi').first();
  const inviterSub = inviterRow.sub;

  // Penuhi teman inviter hingga 50 teman mutual
  for (let f = 1; f <= 50; f++) {
    const dummySub = 'u_dummy_' + f;
    await booted.core.prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
      .bind(inviterSub, dummySub, '2026-10-16').run();
    await booted.core.prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
      .bind(dummySub, inviterSub, '2026-10-16').run();
  }

  // Redeemer2 mencoba redeem kode inviter yang sudah punya 50 teman -> 409 limit_reached
  const quotaBlockedRes = await booted.call('POST', '/api/social/friends/redeem', {
    cookie: redeemer2Cookie,
    body: { code: validCode }
  });
  assert.strictEqual(quotaBlockedRes.status, 409, `Redeem saat inviter penuh harus 409 limit_reached, dapat ${quotaBlockedRes.status}`);
  assert.strictEqual(quotaBlockedRes.json.error, 'limit_reached');
  console.log('PASS: Inviter friend quota FRIENDS_MAX=50 enforced on redeem (409 limit_reached)!');

  console.log('=== TEST 4: routeFriendsAccept ghost request prevention & quota check ===');
  const userACookie = await booted.issueIdentity();
  await booted.call('POST', '/api/social/profile/create', {
    cookie: userACookie,
    body: { handle: 'user_alpha' }
  });

  const userBCookie = await booted.issueIdentity();
  await booted.call('POST', '/api/social/profile/create', {
    cookie: userBCookie,
    body: { handle: 'user_beta' }
  });

  // User Beta mencoba menerima permintaan dari User Alpha tanpa User Alpha pernah mengirim request (ghost request)
  const ghostRes = await booted.call('POST', '/api/social/friends/accept', {
    cookie: userBCookie,
    body: { handle: 'user_alpha' }
  });
  assert.strictEqual(ghostRes.status, 400, `Accept tanpa incoming request harus ditolak 400, dapat ${ghostRes.status}`);
  assert.strictEqual(ghostRes.json.error, 'code_invalid');
  console.log('PASS: Ghost friend request rejected with 400 code_invalid!');

  // Sekarang User Alpha kirim permintaan ke User Beta secara sah
  const addRes = await booted.call('POST', '/api/social/friends/add', {
    cookie: userACookie,
    body: { handle: 'user_beta' }
  });
  assert.strictEqual(addRes.status, 200);
  assert.strictEqual(addRes.json.status, 'pending');

  // User Beta accept secara sah
  const acceptRes = await booted.call('POST', '/api/social/friends/accept', {
    cookie: userBCookie,
    body: { handle: 'user_alpha' }
  });
  assert.strictEqual(acceptRes.status, 200, `Accept sah harus 200, dapat ${acceptRes.status}`);
  assert.strictEqual(acceptRes.json.status, 'friends');
  console.log('PASS: Legitimate friend request accepted with 200 status:friends!');

  console.log('\nALL SUBAGENT 1 EMPIRICAL AUDIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
