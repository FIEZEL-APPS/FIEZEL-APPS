/**
 * FIEZEL — rute lane KESULITAN SOAL GABUNGAN (Braincore langkah 2).
 *
 *   POST /api/braincore/item-evidence    jawaban-pertama per soal dari perangkat (anonim)
 *   GET  /api/braincore/item-difficulty  tabel koreksi kesulitan gabungan (publik, di-cache)
 *
 * SAKLAR `ITEM_POOL_ENABLED` (default 'off', fail-closed). Saat mati:
 *   - POST menjawab 202 { accepted: 0, disabled: true } — perangkat MENYIMPAN catatannya
 *     dan mencoba lagi nanti (FiezelItemPool.defer), jadi jawaban-pertama yang terkumpul
 *     sebelum owner menyalakan lane ini tidak hilang (sampai 56 hari).
 *   - GET menjawab tabel kosong — perangkat memakai prior + kalibrasi lokal, persis
 *     perilaku sebelum langkah 2.
 * Rute tetap terdaftar walau mati (alasan yang sama dengan lane bukti): 404 membuat klien
 * mengulang tanpa henti, 202 membuatnya berhenti sopan.
 *
 * Identitas SENGAJA tidak dituntut dan tidak dibaca: payload-nya memang tidak boleh punya
 * identitas. Cookie tidak dikirim perangkat (credentials:'omit').
 */

import {
  ITEM_POOL_LIMITS,
  ITEM_TABLE_SCHEMA,
  normalizeItemEnvelope
} from './item-pool-core.js';
import {
  markItemPoolEventsSeen,
  applyItemPoolAggregate,
  readItemPoolTable
} from './item-pool-store-d1.js';

export const ITEM_EVIDENCE_PATH = '/api/braincore/item-evidence';
export const ITEM_DIFFICULTY_PATH = '/api/braincore/item-difficulty';
export const LIMITS = ITEM_POOL_LIMITS;
/** Tabel berubah sekali sehari (cron); satu jam cache edge memotong beban D1 tanpa basi. */
export const TABLE_CACHE_SECONDS = 3600;

function json(body, status = 200, cacheControl = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cacheControl }
  });
}

function dayKey(ms) { return new Date(ms).toISOString().slice(0, 10); }

export function itemPoolEnabled(env) {
  return String((env && env.ITEM_POOL_ENABLED) || 'off') === 'on';
}

function itemPoolDb(env) { return (env && env.EVIDENCE_DB) || null; }

/* Rate limit — ember SENDIRI di memori isolate (pola route-evidence.js): kunci = 64 bit
 * SHA-256(salt:ip), tidak pernah ke D1. Lane ini tidak boleh memakan jatah lane lain. */
const memoryBuckets = new Map();

async function rateKey(request, salt) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const data = new TextEncoder().encode((salt || 'fz') + ':item-pool:' + ip);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
  let out = '';
  for (const b of digest.subarray(0, 8)) out += b.toString(16).padStart(2, '0');
  return out;
}

export async function checkItemPoolRateLimit(request, env, now = Date.now()) {
  const key = await rateKey(request, env && env.RATE_SALT);
  const bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.start >= LIMITS.RATE_WINDOW_MS) {
    memoryBuckets.set(key, { start: now, count: 1 });
    if (memoryBuckets.size > 5000) memoryBuckets.clear();
    return true;
  }
  if (bucket.count >= LIMITS.RATE_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

async function readBoundedJson(request, maxBytes = LIMITS.MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, reason: 'too_large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, reason: 'too_large' };
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false, reason: 'bad_json' }; }
}

/** Inti tulis yang murni terhadap jaringan (diuji langsung oleh gerbang). */
export function processItemEvidenceBatch(body, now = Date.now()) {
  const res = normalizeItemEnvelope(body, now);
  if (!res.ok) {
    const status = res.reason === 'too_many_events' ? 413 : 400;
    const payload = { ok: false, error: res.reason };
    if (res.field !== undefined) payload.field = res.field;
    if (res.index !== undefined) payload.index = res.index;
    return { status, payload };
  }
  return { status: 202, payload: { ok: true, accepted: res.envelope.events.length, dropped: res.dropped }, envelope: res.envelope };
}

function waitUntil(ctx, promise) {
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(promise);
  else promise.catch(() => {});
}

export async function handleItemEvidence(request, env, ctx, now = Date.now()) {
  if (!itemPoolEnabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);
  const db = itemPoolDb(env);
  if (!db) return json({ ok: true, accepted: 0, disabled: true }, 202);
  if (!(await checkItemPoolRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);

  const body = await readBoundedJson(request);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processItemEvidenceBatch(body.value, now);
  if (result.status !== 202) return json(result.payload, result.status);

  let fresh;
  try {
    fresh = await markItemPoolEventsSeen(db, result.envelope.events, result.envelope.batchId, dayKey(now));
  } catch {
    // D1 bermasalah: JANGAN mengaku diterima — perangkat harus mencoba lagi nanti.
    return json({ ok: false, error: 'storage_unavailable' }, 503);
  }
  if (fresh.length === 0) {
    return json({ ok: true, accepted: result.envelope.events.length, duplicate: true }, 200);
  }
  waitUntil(ctx, applyItemPoolAggregate(db, fresh).catch(() => {}));
  return json({ ok: true, accepted: fresh.length, dropped: result.payload.dropped }, 202);
}

export async function handleItemDifficulty(request, env) {
  const cache = 'public, max-age=' + TABLE_CACHE_SECONDS;
  const empty = { schema: ITEM_TABLE_SCHEMA, day: null, items: {} };
  if (!itemPoolEnabled(env)) return json({ ...empty, disabled: true }, 200, cache);
  const db = itemPoolDb(env);
  if (!db) return json({ ...empty, disabled: true }, 200, cache);
  try {
    return json(await readItemPoolTable(db), 200, cache);
  } catch {
    // Tabel belum ada (migrasi 0015 belum diterapkan) = tabel kosong, bukan 500.
    return json(empty, 200, 'no-store');
  }
}

/** Rute — dipasang lewat route-wiring.js (pola registerEvidenceRoutes). */
export function registerItemPoolRoutes(router) {
  if (!router) throw new Error('registerItemPoolRoutes: router wajib');
  const wrap = (fn) => async (...args) => {
    const a = args[0];
    if (a && a.req && typeof a.req.raw === 'object') return fn(a.req.raw, a.env, a.executionCtx || a.ctx || null);
    if (a instanceof Request || (a && typeof a.headers === 'object' && typeof a.text === 'function')) {
      return fn(a, args[1], args[2]);
    }
    return fn(a && a.request, (a && a.env) || args[1], (a && a.ctx) || args[2]);
  };
  const add = (method, path, fn) => {
    const lower = method.toLowerCase();
    if (typeof router[lower] === 'function') router[lower](path, wrap(fn));
    else if (typeof router.on === 'function') router.on(method, path, wrap(fn));
    else if (typeof router.add === 'function') router.add(method, path, wrap(fn));
    else throw new Error('registerItemPoolRoutes: bentuk router tidak dikenali');
  };
  add('POST', ITEM_EVIDENCE_PATH, handleItemEvidence);
  add('GET', ITEM_DIFFICULTY_PATH, handleItemDifficulty);
  return router;
}

export default {
  registerItemPoolRoutes,
  handleItemEvidence,
  handleItemDifficulty,
  processItemEvidenceBatch,
  checkItemPoolRateLimit,
  itemPoolEnabled,
  LIMITS,
  ITEM_EVIDENCE_PATH,
  ITEM_DIFFICULTY_PATH
};
