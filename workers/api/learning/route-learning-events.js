/**
 * FIEZEL — endpoint lane telemetri belajar (fiezel-learning-event-v1).
 *
 *   POST /api/learning/events   batch kecil event belajar (answer_outcome,
 *                               session_summary) — HANYA agregat yang disimpan.
 *
 * PEMASANGAN (JANGAN mengedit workers/api/index.js dari paket kerja ini):
 *   import { registerLearningRoutes } from './learning/route-learning-events.js';
 *   registerLearningRoutes(router);
 * Pemasangan nyata ada di route-wiring.js (pola registerAnalyticsRoutes).
 *
 * Lane ini SENGAJA memakai pola route-events.js analytics (rate limit hash-IP
 * in-memory, batas byte keras sebelum JSON.parse, 400 untuk payload salah,
 * dedup SEBELUM agregasi dijadwalkan) tetapi dengan TIGA perbedaan sadar:
 *   1. `batchId` WAJIB — lane ini belum punya klien, jadi tidak ada
 *      kompatibilitas mundur yang membenarkan batch tanpa jaminan idempotensi.
 *   2. Dedup per-EVENT (learning_dedup, kunci eventId), bukan per-batch:
 *      BRAIN-TELEMETRY-SCHEMA.md §5.1 menuntut replay batch campuran
 *      lama+baru hanya menghitung yang baru.
 *   3. Database TERPISAH (LEARNING_DB / fiezel-learning) — bukan STATS_DB.
 *      Handler ini tidak pernah menerima binding identitas/kuota/analytics.
 */

import { LEARNING_LIMITS, normalizeLearningEnvelope } from './learning-core.js';
import { markLearningEventsSeen, applyLearningAggregate } from './learning-store-d1.js';

export const LIMITS = LEARNING_LIMITS;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/* -------------------------------------------------------------------------- */
/* Rate limit — pola route-events.js: kunci = 64 bit pertama SHA-256(salt:ip), */
/* hidup HANYA di memori isolate selama jendela 1 jam, tidak pernah ke D1.     */
/* Bucket SENDIRI (bukan berbagi dengan analytics): dua lane tidak boleh       */
/* saling memakan jatah rem satu sama lain.                                    */
/* -------------------------------------------------------------------------- */
const memoryBuckets = new Map();

async function rateKey(request, salt) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const data = new TextEncoder().encode(`${salt || 'fz'}:${ip}`);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
  let out = '';
  for (const b of digest.subarray(0, 8)) out += b.toString(16).padStart(2, '0');
  return out; // 64 bit: cukup untuk rem, tidak cukup untuk identifikasi
}

export async function checkRateLimit(request, env, now = Date.now()) {
  const key = await rateKey(request, env && env.RATE_SALT);
  const bucket = memoryBuckets.get(key);
  if (!bucket || now - bucket.start >= LIMITS.RATE_WINDOW_MS) {
    memoryBuckets.set(key, { start: now, count: 1 });
    if (memoryBuckets.size > 5000) memoryBuckets.clear(); // batas memori isolate
    return true;
  }
  if (bucket.count >= LIMITS.RATE_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

/* -------------------------------------------------------------------------- */
/* Pembacaan body dengan batas byte KERAS (dicek sebelum JSON.parse).          */
/* -------------------------------------------------------------------------- */
export async function readBoundedJson(request, maxBytes = LIMITS.MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, reason: 'too_large' };
  const text = await request.text();
  // Ukur byte sesungguhnya: content-length bisa bohong / tidak ada.
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, reason: 'too_large' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'bad_json' };
  }
}

/* -------------------------------------------------------------------------- */
/* Inti pemrosesan (murni terhadap jaringan; diuji langsung oleh gerbang).     */
/* -------------------------------------------------------------------------- */

/**
 * processLearningBatch(body, now) -> { status, payload, envelope? }
 *
 * Aturan yang tidak boleh dilemahkan (BRAIN-TELEMETRY-SCHEMA.md §5.5:
 * "4xx skema = payload salah, buang event" — server harus memberi tahu, bukan
 * menoleransi):
 *  - skema/versi tak dikenal      -> 400 bad_schema (fail-closed, §2)
 *  - batchId absen/salah bentuk   -> 400 bad_batch_id (WAJIB, lihat kepala berkas)
 *  - field asing di mana pun      -> 400 foreign_field (termasuk `at`,
 *                                    timestamp presisi, dan ID stabil apa pun)
 *  - nilai di luar enum tertutup  -> 400 invalid_field
 *  - `day` di luar ±2 hari        -> 400 day_out_of_range
 *  - > 20 event                   -> 413 too_many_events
 */
export function processLearningBatch(body, now = Date.now()) {
  const res = normalizeLearningEnvelope(body, now);
  if (!res.ok) {
    const status = res.reason === 'too_many_events' ? 413 : 400;
    const payload = { ok: false, error: res.reason };
    if (res.field !== undefined) payload.field = res.field;
    if (res.index !== undefined) payload.index = res.index;
    if (res.reason === 'too_many_events') payload.max = LIMITS.MAX_EVENTS;
    return { status, payload };
  }
  return {
    status: 202,
    payload: { ok: true, accepted: res.envelope.events.length },
    envelope: res.envelope
  };
}

/* -------------------------------------------------------------------------- */
/* Handler HTTP                                                               */
/* -------------------------------------------------------------------------- */

function waitUntil(ctx, promise) {
  // Telemetri TIDAK BOLEH menambah latensi ke jalur belajar.
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(promise);
  else promise.catch(() => {});
}

function learningDb(env) {
  // HANYA LEARNING_DB. Sengaja tidak ada fallback ke STATS_DB/CORE_DB:
  // salah binding harus terlihat sebagai "lane diam", bukan sebagai data
  // learning yang diam-diam menempel di database domain lain.
  return (env && env.LEARNING_DB) || null;
}

function enabled(env) {
  // Default MATI. Fail-closed: flag yang tidak terbaca bukan izin.
  return String((env && env.LEARNING_ENABLED) || 'off') === 'on';
}

export async function handleLearningEvents(request, env, ctx, now = Date.now()) {
  // Flag mati -> 202 {disabled:true}, BUKAN 404: klien yang sudah telanjur
  // rilis tidak boleh melihat 404 lalu retry tanpa henti (pola analytics).
  if (!enabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);
  if (!(await checkRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);

  const body = await readBoundedJson(request);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processLearningBatch(body.value, now);
  if (result.status !== 202) return json(result.payload, result.status);

  const db = learningDb(env);
  if (!db) {
    // Binding belum dipasang / migrasi belum diterapkan: jawab sukses tanpa
    // menyimpan (fitur baru wajib aman saat prasyaratnya belum terpasang),
    // dan JANGAN 500 — kegagalan infrastruktur bukan salah klien.
    return json({ ok: true, accepted: 0, disabled: true }, 202);
  }

  // Dedup per-event SINKRON, SEBELUM agregasi dijadwalkan (pelajaran council
  // di lane analytics: dedup di dalam waitUntil = retry cepat terhitung dua
  // kali). Kalau tabel dedup belum ada, biarkan error terlihat sebagai 202
  // tanpa tulis — bukan 500 — lewat try/catch di bawah.
  let fresh;
  try {
    fresh = await markLearningEventsSeen(db, result.envelope.events, result.envelope.batchId, dayKey(now));
  } catch {
    return json({ ok: true, accepted: 0, disabled: true }, 202);
  }

  if (fresh.length === 0) {
    // Semua event sudah pernah diterima: balas sukses (klien boleh berhenti
    // retry) TANPA agregasi ulang. 200, bukan 202: tidak ada yang diproses.
    return json({ ok: true, accepted: result.envelope.events.length, duplicate: true }, 200);
  }

  // HANYA event segar yang diagregasi — replay parsial menghitung yang baru saja.
  waitUntil(ctx, applyLearningAggregate(db, result.envelope.day, fresh).catch(() => {}));
  return json({ ok: true, accepted: fresh.length }, 202);
}

/* -------------------------------------------------------------------------- */
/* Pendaftaran rute (pola registerAnalyticsRoutes — dua bentuk router)         */
/* -------------------------------------------------------------------------- */

export const ROUTES = Object.freeze([
  { method: 'POST', path: '/api/learning/events', handler: 'handleLearningEvents' }
]);

export function registerLearningRoutes(router) {
  if (!router) throw new Error('registerLearningRoutes: router wajib');

  const wrap = fn => async (...args) => {
    const a = args[0];
    if (a && a.req && typeof a.req.raw === 'object') {
      // Hono: c.req.raw = Request, c.env, c.executionCtx
      return fn(a.req.raw, a.env, a.executionCtx || a.ctx || null);
    }
    if (a instanceof Request || (a && typeof a.headers === 'object' && typeof a.text === 'function')) {
      return fn(a, args[1], args[2]);
    }
    // Konteks gaya objek: { request, env, ctx }
    return fn(a && a.request, (a && a.env) || args[1], (a && a.ctx) || args[2]);
  };

  const add = (method, path, fn) => {
    const lower = method.toLowerCase();
    if (typeof router[lower] === 'function') router[lower](path, wrap(fn));
    else if (typeof router.on === 'function') router.on(method, path, wrap(fn));
    else if (typeof router.add === 'function') router.add(method, path, wrap(fn));
    else throw new Error('registerLearningRoutes: bentuk router tidak dikenali');
  };

  add('POST', '/api/learning/events', handleLearningEvents);
  return router;
}

export default {
  registerLearningRoutes,
  handleLearningEvents,
  processLearningBatch,
  readBoundedJson,
  checkRateLimit,
  LIMITS,
  ROUTES
};
