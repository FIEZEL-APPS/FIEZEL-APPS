/**
 * workers/api/route-learner-messages.js — Sistem pesan 2-arah antara Owner dan Murid + lampiran GEM.
 *
 * Rute:
 *   GET  /api/learner/messages              — Daftar pesan milik murid (untuk PWA)
 *   GET  /api/learner/messages/unread-count — Hitungan pesan belum dibaca dari owner
 *   POST /api/learner/messages/reply        — Murid membalas pesan dari PWA
 *   POST /api/learner/messages/read         — Tandai pesan dari owner sudah dibaca
 *   POST /api/owner/send-message            — Owner mengirim pesan + suntik GEM ke murid
 *   GET  /api/owner/learner-messages        — Owner membaca riwayat percakapan thread murid
 */

import { jsonResponse, jsonError, unauthenticated, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';

export const LEARNER_MESSAGES_PATH = '/api/learner/messages';
export const LEARNER_MESSAGES_UNREAD_PATH = '/api/learner/messages/unread-count';
export const LEARNER_MESSAGES_REPLY_PATH = '/api/learner/messages/reply';
export const LEARNER_MESSAGES_READ_PATH = '/api/learner/messages/read';
export const OWNER_SEND_MESSAGE_PATH = '/api/owner/send-message';
export const OWNER_LEARNER_MESSAGES_PATH = '/api/owner/learner-messages';

function getCoreDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * Kueri D1 untuk mengambil daftar pesan murid.
 * Menggunakan indeks `ix_owner_msg_sub_created`.
 */
export async function getLearnerMessages(db, sub) {
  const q = 'SELECT id, sub, sender, title, content, gem_amount, is_read, reply_to_id, created_at FROM owner_learner_message WHERE sub = ?1 ORDER BY created_at ASC';
  const r = await db.prepare(q).bind(sub).all();
  return (r && r.results) || [];
}

/**
 * Kueri D1 untuk menghitung pesan unread dari owner.
 * Menggunakan indeks `ix_owner_msg_unread`.
 */
export async function getUnreadOwnerMessageCount(db, sub) {
  const q = 'SELECT COUNT(*) AS c FROM owner_learner_message WHERE sub = ?1 AND is_read = 0 AND sender = ?2';
  const r = await db.prepare(q).bind(sub, 'owner').first();
  return (r && Number(r.c)) || 0;
}

/**
 * GET /api/learner/messages
 */
export async function routeLearnerMessages(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return unauthenticated(opt);
  }
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const messages = await getLearnerMessages(db, ctx.identity.sub);
  return jsonResponse({ ok: true, messages }, opt);
}

/**
 * GET /api/learner/messages/unread-count
 */
export async function routeLearnerMessagesUnread(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return unauthenticated(opt);
  }
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const unread = await getUnreadOwnerMessageCount(db, ctx.identity.sub);
  return jsonResponse({ ok: true, unread }, opt);
}

/**
 * POST /api/learner/messages/reply
 */
export async function routeLearnerMessagesReply(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return unauthenticated(opt);
  }
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const parsed = await readJsonFromCtx(ctx, 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value || {};

  const content = String(body.content || '').trim().slice(0, 1000);
  if (!content) {
    return jsonError(400, ERR.BAD_REQUEST, opt);
  }
  const replyToId = body.reply_to_id ? String(body.reply_to_id).trim() : null;
  const title = String(body.title || 'Balasan Murid').trim().slice(0, 120);

  const id = crypto.randomUUID();
  const nowMs = Number(ctx.now) || Date.now();

  const insertSql = 'INSERT INTO owner_learner_message (id, sub, sender, title, content, gem_amount, gem_grant_id, is_read, reply_to_id, created_at) VALUES (?1, ?2, \'learner\', ?3, ?4, 0, NULL, 0, ?5, ?6)';
  await db.prepare(insertSql).bind(id, ctx.identity.sub, title, content, replyToId, nowMs).run();

  return jsonResponse({ ok: true, id, created_at: nowMs }, opt);
}

/**
 * POST /api/learner/messages/read
 */
export async function routeLearnerMessagesRead(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return unauthenticated(opt);
  }
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const updateSql = 'UPDATE owner_learner_message SET is_read = 1 WHERE sub = ?1 AND sender = \'owner\' AND is_read = 0';
  await db.prepare(updateSql).bind(ctx.identity.sub).run();

  return jsonResponse({ ok: true }, opt);
}

/**
 * POST /api/owner/send-message
 * Dipanggil oleh Owner Dashboard untuk mengirim pesan + opsi lampiran GEM.
 */
export async function routeOwnerSendMessage(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const parsed = await readJsonFromCtx(ctx, 8192);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value || {};

  let targetSub = String(body.sub || '').trim();

  // Resolusi dari email bila sub tidak disertakan langsung
  if (!targetSub && body.email) {
    const emailNorm = String(body.email).trim().toLowerCase();
    const row = await db.prepare(
      'SELECT sub FROM auth_email WHERE email = ?1 LIMIT 1'
    ).bind(emailNorm).first();
    if (row && row.sub) targetSub = String(row.sub);
  }

  // Resolusi dari handle sosial (misal: 'zara')
  if (!targetSub && body.handle) {
    const handleNorm = String(body.handle).trim().replace(/^@/, '').toLowerCase();
    const row = await db.prepare(
      'SELECT sub FROM social_handle WHERE handle = ?1 LIMIT 1'
    ).bind(handleNorm).first();
    if (row && row.sub) targetSub = String(row.sub);
  }

  if (!targetSub) {
    return jsonError(404, ERR.NOT_FOUND, opt);
  }

  const title = String(body.title || 'Pesan dari Tim Fiezel').trim().slice(0, 120);
  const content = String(body.content || '').trim().slice(0, 2000);
  if (!content) {
    return jsonError(400, ERR.BAD_REQUEST, opt);
  }

  const gemAmount = Math.max(0, Math.floor(Number(body.gem_amount) || 0));
  const reason = String(body.reason || title || 'Reward Tim Fiezel').trim().slice(0, 160);

  const nowMs = Number(ctx.now) || Date.now();
  let gemGrantId = null;

  // Jika melampirkan GEM, buat entri di gem_grant agar bisa diklaim instan di PWA
  if (gemAmount > 0) {
    gemGrantId = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO gem_grant (id, sub, amount, reason, granted_by, created_at, claimed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)'
    ).bind(gemGrantId, targetSub, gemAmount, reason, 'owner', nowMs).run();
  }

  const msgId = crypto.randomUUID();
  const insertMsgSql = 'INSERT INTO owner_learner_message (id, sub, sender, title, content, gem_amount, gem_grant_id, is_read, reply_to_id, created_at) VALUES (?1, ?2, \'owner\', ?3, ?4, ?5, ?6, 0, NULL, ?7)';
  await db.prepare(insertMsgSql).bind(msgId, targetSub, title, content, gemAmount, gemGrantId, nowMs).run();

  return jsonResponse({
    ok: true,
    messageId: msgId,
    sub: targetSub,
    gemAmount,
    gemGrantId,
    createdAt: nowMs
  }, opt);
}

/**
 * GET /api/owner/learner-messages?sub=<sub_id>
 * Mengambil riwayat obrolan lengkap antara Owner dan Murid.
 */
export async function routeOwnerLearnerMessages(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  const db = getCoreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, opt);

  const url = new URL(ctx.request.url);
  const sub = url.searchParams.get('sub');
  if (!sub) {
    return jsonError(400, ERR.BAD_REQUEST, opt);
  }

  const messages = await getLearnerMessages(db, sub);
  return jsonResponse({ ok: true, sub, messages }, opt);
}

export const ROUTES = [
  ['GET', LEARNER_MESSAGES_PATH, routeLearnerMessages],
  ['GET', LEARNER_MESSAGES_UNREAD_PATH, routeLearnerMessagesUnread],
  ['POST', LEARNER_MESSAGES_REPLY_PATH, routeLearnerMessagesReply],
  ['POST', LEARNER_MESSAGES_READ_PATH, routeLearnerMessagesRead],
  ['POST', OWNER_SEND_MESSAGE_PATH, routeOwnerSendMessage],
  ['GET', OWNER_LEARNER_MESSAGES_PATH, routeOwnerLearnerMessages]
];
