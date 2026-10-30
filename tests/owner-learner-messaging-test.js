/**
 * tests/owner-learner-messaging-test.js — Pengujian kontrak sistem pesan 2-arah Owner-Murid & Reward.
 */

import assert from 'node:assert';
import {
  LEARNER_MESSAGES_PATH,
  LEARNER_MESSAGES_UNREAD_PATH,
  LEARNER_MESSAGES_REPLY_PATH,
  LEARNER_MESSAGES_READ_PATH,
  OWNER_SEND_MESSAGE_PATH,
  OWNER_LEARNER_MESSAGES_PATH,
  ROUTES,
  routeLearnerMessages,
  routeLearnerMessagesUnread,
  routeLearnerMessagesReply,
  routeLearnerMessagesRead,
  routeOwnerSendMessage,
  routeOwnerLearnerMessages
} from '../workers/api/route-learner-messages.js';
import { BYTE_LIMITS } from '../workers/api/schema.js';

console.log('🧪 Menjalankan owner-learner-messaging-test...');

// 1. Verifikasi BYTE_LIMITS terdaftar di schema.js
assert(BYTE_LIMITS[LEARNER_MESSAGES_REPLY_PATH] === 4096, 'Limit /api/learner/messages/reply harus 4096');
assert(BYTE_LIMITS[LEARNER_MESSAGES_READ_PATH] === 1024, 'Limit /api/learner/messages/read harus 1024');
assert(BYTE_LIMITS[OWNER_SEND_MESSAGE_PATH] === 8192, 'Limit /api/owner/send-message harus 8192');
console.log('  ✅ PASS: Byte limits terdaftar di schema.js');

// 2. Verifikasi ROUTES terdaftar dengan method yang benar
assert(Array.isArray(ROUTES), 'ROUTES harus array');
assert(ROUTES.some(r => r[0] === 'GET' && r[1] === LEARNER_MESSAGES_PATH), 'GET /api/learner/messages terdaftar');
assert(ROUTES.some(r => r[0] === 'GET' && r[1] === LEARNER_MESSAGES_UNREAD_PATH), 'GET /api/learner/messages/unread-count terdaftar');
assert(ROUTES.some(r => r[0] === 'POST' && r[1] === LEARNER_MESSAGES_REPLY_PATH), 'POST /api/learner/messages/reply terdaftar');
assert(ROUTES.some(r => r[0] === 'POST' && r[1] === LEARNER_MESSAGES_READ_PATH), 'POST /api/learner/messages/read terdaftar');
assert(ROUTES.some(r => r[0] === 'POST' && r[1] === OWNER_SEND_MESSAGE_PATH), 'POST /api/owner/send-message terdaftar');
assert(ROUTES.some(r => r[0] === 'GET' && r[1] === OWNER_LEARNER_MESSAGES_PATH), 'GET /api/owner/learner-messages terdaftar');
console.log('  ✅ PASS: Rute terdaftar di array ROUTES');

// Mock in-memory SQLite table
const mockDb = {
  messages: [],
  gemGrants: [],
  prepare(sql) {
    const s = sql.trim();
    return {
      bind(...params) {
        return {
          async run() {
            if (s.startsWith('INSERT INTO owner_learner_message')) {
              mockDb.messages.push({
                id: params[0],
                sub: params[1],
                sender: s.includes("'owner'") ? 'owner' : 'learner',
                title: params[2],
                content: params[3],
                gem_amount: s.includes("'owner'") ? params[4] : 0,
                gem_grant_id: s.includes("'owner'") ? params[5] : null,
                is_read: 0,
                reply_to_id: s.includes("'owner'") ? null : params[4],
                created_at: s.includes("'owner'") ? params[6] : params[5]
              });
              return { success: true };
            }
            if (s.startsWith('INSERT INTO gem_grant')) {
              mockDb.gemGrants.push({
                id: params[0],
                sub: params[1],
                amount: params[2],
                reason: params[3],
                granted_by: params[4],
                created_at: params[5],
                claimed_at: null
              });
              return { success: true };
            }
            if (s.startsWith('UPDATE owner_learner_message SET is_read = 1')) {
              for (const m of mockDb.messages) {
                if (m.sub === params[0] && m.sender === 'owner') {
                  m.is_read = 1;
                }
              }
              return { success: true };
            }
            return { success: true };
          },
          async first() {
            if (s.includes('COUNT(*) AS c')) {
              const count = mockDb.messages.filter(m => m.sub === params[0] && m.is_read === 0 && m.sender === params[1]).length;
              return { c: count };
            }
            return null;
          },
          async all() {
            if (s.includes('FROM owner_learner_message WHERE sub = ?1')) {
              const matched = mockDb.messages.filter(m => m.sub === params[0]);
              return { results: matched };
            }
            return { results: [] };
          }
        };
      }
    };
  }
};

// 3. Test unauthenticated request
{
  const res = await routeLearnerMessages({ identity: null, corsHeaders: {} });
  assert.strictEqual(res.status, 401, 'Request tanpa identitas harus 401');
  console.log('  ✅ PASS: Akses tanpa autentikasi menghasilkan 401');
}

// 4. Test database unavailable
{
  const ctx = {
    identity: { verified: true, sub: 'test-learner-1' },
    env: {},
    corsHeaders: {}
  };
  const res = await routeLearnerMessages(ctx);
  assert.strictEqual(res.status, 503, 'Tanpa DB harus 503');
  console.log('  ✅ PASS: Akses dengan database tidak tersedia menghasilkan 503');
}

// 5. Test Owner mengirim pesan + suntik GEM
{
  const payload = {
    sub: 'test-learner-1',
    title: 'Umpan Balik AI',
    content: 'Terima kasih atas partisipasinya dalam mencoba fitur AI!',
    gem_amount: 75,
    reason: 'Bonus Ulasan AI'
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
  assert.strictEqual(res.status, 200, 'Owner kirim pesan harus 200');
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert.strictEqual(data.gemAmount, 75);
  assert(data.gemGrantId, 'Harus menghasilkan gemGrantId');
  assert(mockDb.messages.length === 1, 'Pesan harus tersimpan di DB');
  assert(mockDb.gemGrants.length === 1, 'Grant GEM harus tersimpan di DB');
  console.log('  ✅ PASS: Owner send-message berhasil menyimpan pesan & lampiran GEM');
}

// 6. Test Murid membaca pesan & unread count
{
  const ctx = {
    identity: { verified: true, sub: 'test-learner-1' },
    env: { CORE_DB: mockDb },
    corsHeaders: {}
  };
  const resUnread = await routeLearnerMessagesUnread(ctx);
  const dataUnread = await resUnread.json();
  assert.strictEqual(dataUnread.unread, 1, 'Unread count harus 1');

  const resMessages = await routeLearnerMessages(ctx);
  const dataMessages = await resMessages.json();
  assert.strictEqual(dataMessages.messages.length, 1, 'Jumlah pesan harus 1');
  assert.strictEqual(dataMessages.messages[0].title, 'Umpan Balik AI');
  console.log('  ✅ PASS: Murid berhasil membaca pesan & mendeteksi unread count');
}

// 7. Test Murid membalas pesan
{
  const replyPayload = {
    reply_to_id: mockDb.messages[0].id,
    content: 'Sangat suka fitur latihan ngobrolnya, tolong tambah soal N3 ya!'
  };
  const ctx = {
    identity: { verified: true, sub: 'test-learner-1' },
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    now: 1700000001000,
    bodyText: JSON.stringify(replyPayload),
    request: new Request('https://api.fiezel.my.id/api/learner/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyPayload)
    })
  };
  const res = await routeLearnerMessagesReply(ctx);
  assert.strictEqual(res.status, 200, 'Murid reply harus 200');
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert(data.id, 'Balasan harus memiliki ID');
  assert.strictEqual(mockDb.messages.length, 2, 'Total pesan dalam thread sekarang 2');
  console.log('  ✅ PASS: Murid berhasil membalas pesan (two-way thread tersambung)');
}

// 8. Test Murid menandai sudah dibaca
{
  const ctx = {
    identity: { verified: true, sub: 'test-learner-1' },
    env: { CORE_DB: mockDb },
    corsHeaders: {}
  };
  const res = await routeLearnerMessagesRead(ctx);
  assert.strictEqual(res.status, 200, 'Mark read harus 200');

  const resUnreadAfter = await routeLearnerMessagesUnread(ctx);
  const dataUnreadAfter = await resUnreadAfter.json();
  assert.strictEqual(dataUnreadAfter.unread, 0, 'Unread count setelah mark read harus 0');
  console.log('  ✅ PASS: Murid berhasil menandai pesan sudah dibaca');
}

// 9. Test Owner mengambil thread lengkap murid
{
  const ctx = {
    env: { CORE_DB: mockDb },
    corsHeaders: {},
    request: {
      url: 'https://api.fiezel.my.id/api/owner/learner-messages?sub=test-learner-1'
    }
  };
  const res = await routeOwnerLearnerMessages(ctx);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.messages.length, 2, 'Owner harus melihat 2 pesan dalam thread');
  assert.strictEqual(data.messages[0].sender, 'owner');
  assert.strictEqual(data.messages[1].sender, 'learner');
  console.log('  ✅ PASS: Owner berhasil mengambil riwayat obrolan lengkap thread murid');
}

console.log('\n🎉 Semua 9 tes owner-learner-messaging-test LULUS!\n');
