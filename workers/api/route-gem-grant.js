/**
 * workers/api/route-gem-grant.js — Injeksi & klaim reward GEM per-murid dari server.
 *
 * Rute:
 *   POST /api/gems/claim         — Diambil otomatis oleh aplikasi murid saat boot / aktif
 *   POST /api/owner/grant-gems   — Dipanggil oleh admin / owner untuk memberikan GEM
 */

import { jsonResponse, jsonError, unauthenticated, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';

export const GEMS_CLAIM_PATH = '/api/gems/claim';
export const OWNER_GRANT_GEMS_PATH = '/api/owner/grant-gems';

function getCoreDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * POST /api/gems/claim
 * Klien murid memanggil ini untuk mengambil seluruh reward GEM yang belum diklaim.
 */
export async function routeGemsClaim(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return unauthenticated(opt);
  }
  const sub = ctx.identity.sub;
  const db = getCoreDb(ctx.env);
  if (!db) {
    return jsonError(503, ERR.UNAVAILABLE, opt);
  }

  // 1. Ambil seluruh grant yang belum diklaim untuk sub ini
  const rows = await db.prepare(
    'SELECT id, amount, reason, created_at FROM gem_grant WHERE sub = ?1 AND claimed_at IS NULL ORDER BY created_at ASC'
  ).bind(sub).all();

  const results = (rows && rows.results) || [];
  if (!results.length) {
    return jsonResponse({ ok: true, grants: [] }, opt);
  }

  // 2. Tandai sudah diklaim secara atomik
  const nowMs = Number(ctx.now) || Date.now();
  await db.prepare(
    'UPDATE gem_grant SET claimed_at = ?1 WHERE sub = ?2 AND claimed_at IS NULL'
  ).bind(nowMs, sub).run();

  const grants = results.map(r => ({
    id: String(r.id),
    amount: Math.max(0, Math.floor(Number(r.amount) || 0)),
    reason: String(r.reason || 'reward')
  })).filter(g => g.amount > 0);

  return jsonResponse({ ok: true, grants }, opt);
}

/**
 * POST /api/owner/grant-gems
 * Endpoint khusus Owner / Admin untuk menyuntikkan GEM ke akun murid (berdasarkan sub, email, atau handle).
 */
export async function routeOwnerGrantGems(ctx) {
  const opt = { headers: ctx.corsHeaders || {} };
  const db = getCoreDb(ctx.env);
  if (!db) {
    return jsonError(503, ERR.UNAVAILABLE, opt);
  }

  const parsed = await readJsonFromCtx(ctx, 4096);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value || {};

  const amount = Math.max(1, Math.floor(Number(body.amount) || 0));
  if (!amount) {
    return jsonError(400, ERR.BAD_REQUEST, opt);
  }
  const reason = String(body.reason || 'Apresiasi Tim Pengembang Fiezel').trim().slice(0, 160);
  const grantedBy = String(body.grantedBy || 'admin').trim().slice(0, 40);

  let targetSub = String(body.sub || '').trim();

  // Resolusi kanonikal dari email bila tersedia (misal akun Google resmi)
  if (body.email) {
    const emailNorm = String(body.email).trim().toLowerCase();
    const row = await db.prepare(
      'SELECT sub FROM auth_email WHERE email = ?1 LIMIT 1'
    ).bind(emailNorm).first();
    if (row && row.sub) targetSub = String(row.sub);
  }

  // Resolusi dari handle sosial (misal: 'zara') bila sub belum ditemukan
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

  const grantId = crypto.randomUUID();
  const nowMs = Number(ctx.now) || Date.now();

  await db.prepare(
    'INSERT INTO gem_grant (id, sub, amount, reason, granted_by, created_at, claimed_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)'
  ).bind(grantId, targetSub, amount, reason, grantedBy, nowMs).run();

  return jsonResponse({
    ok: true,
    grantId,
    sub: targetSub,
    amount,
    reason,
    grantedBy
  }, opt);
}

export const ROUTES = [
  ['POST', GEMS_CLAIM_PATH, routeGemsClaim],
  ['POST', OWNER_GRANT_GEMS_PATH, routeOwnerGrantGems]
];
