/**
 * FIEZEL E4 — endpoint analytics klien.
 *
 *   POST /api/usage/events     batch kecil event 🟡 (klien)
 *   POST /api/usage/retention  retention_ping (cohort_day + day_index saja)
 *   GET  /api/usage/pepper     pepper hari ini, supaya token dihitung DI PERANGKAT
 *
 * PEMASANGAN (JANGAN mengedit workers/api/index.js dari paket kerja ini):
 *   import { registerAnalyticsRoutes } from './analytics/route-events.js';
 *   registerAnalyticsRoutes(router);
 * Instruksi lengkap + urutan middleware ada di `reports/exec-e4-analytics.md`.
 *
 * Kenapa `GET /api/usage/pepper` ada, dan kenapa itu justru yang paling privat:
 * kalau server yang menghitung HMAC, server harus menerima `installId` mentah —
 * dan brief melarangnya ("installId TIDAK pernah dikirim mentah"). Jadi pepper
 * hari ini dibagikan, klien yang menghitung, server hanya menerima token 128
 * bit. Pepper bukan rahasia terhadap murid; ia rahasia terhadap WAKTU. Begitu
 * dirotasi dan pepper lama dihapus, token kemarin tidak bisa dihitung ulang
 * oleh siapa pun. Menebak `installId` dari token juga tidak mungkin: installId
 * adalah UUIDv4 (122 bit acak), bukan nilai yang bisa dienumerasi.
 */

import { normalizeEvent, aggregate, isServerOnly, CLIENT_EVENTS } from './analytics-core.js';
import { applyAggregate, markBatchSeen } from './analytics-store-d1.js';

/* -------------------------------------------------------------------------- */
/* Batas keras. Semua angka konservatif supaya aman di Workers Free.          */
/* -------------------------------------------------------------------------- */
export const LIMITS = Object.freeze({
  MAX_BODY_BYTES: 8 * 1024,     // 8 KB per batch
  MAX_EVENTS: 20,               // per batch
  MAX_RETENTION_PINGS: 3,       // satu perangkat tidak butuh lebih
  RATE_PER_WINDOW: 60,          // batch per jendela
  RATE_WINDOW_MS: 60 * 60 * 1000,
  DAY_SKEW_DAYS: 2,             // toleransi zona waktu + backfill offline
  BATCH_ID_TTL_DAYS: 2          // umur kunci dedup batch = jendela retry klien (48 jam)
});

/**
 * Bentuk `batchId` yang diterima: UUID (36 karakter, hex + tanda hubung).
 * Klien membuatnya ACAK sekali per batch (crypto.randomUUID) — BUKAN turunan
 * identitas dan BUKAN turunan waktu. Server tidak bisa membuktikan keacakan,
 * tapi bentuknya dikunci ketat supaya tidak ada ruang menyelipkan ID stabil
 * atau teks bebas ke kolom ini. (Temuan council: gpt_5_6_sol §4.3, opus §1.3.)
 */
export const BATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * normalizeBatchId(raw) -> { ok, value }
 * `batchId` OPSIONAL: batch tanpa batchId tetap diterima (kompatibilitas mundur
 * dengan klien lama), hanya saja tanpa jaminan idempotensi. Bila hadir tapi
 * bentuknya salah, batch DITOLAK — klien harus tahu payload-nya salah, sama
 * seperti kebijakan foreign_field.
 */
export function normalizeBatchId(raw) {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false };
  const id = raw.toLowerCase();
  if (!BATCH_ID_PATTERN.test(id)) return { ok: false };
  return { ok: true, value: id };
}

export const SCHEMA_ID = 'fiezel-analytics-v1';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function daySkewOk(day, nowMs, maxDays = LIMITS.DAY_SKEW_DAYS) {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  return Math.abs(t - nowMs) <= (maxDays + 1) * 86400000;
}

/* -------------------------------------------------------------------------- */
/* Rate limit.                                                                */
/* Kunci rem = hash IP + pepper, TTL sependek jendela, dan TIDAK PERNAH        */
/* ditulis ke D1. Brief mengizinkan hash+pepper untuk anti-abuse dengan TTL    */
/* 24 jam; di sini bahkan hanya 1 jam dan hanya di memori/binding.             */
/* -------------------------------------------------------------------------- */
const memoryBuckets = new Map();

async function rateKey(request, salt) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const data = new TextEncoder().encode(`${salt || 'fz'}:${ip}`);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data));
  let out = '';
  for (const b of digest.subarray(0, 8)) out += b.toString(16).padStart(2, '0');
  return out; // 64 bit, cukup untuk rem, tidak cukup untuk identifikasi
}

export async function checkRateLimit(request, env, now = Date.now()) {
  // Jalur utama: binding Rate Limiting Cloudflare (anti-burst, tidak menyimpan apa pun).
  if (env && env.ANALYTICS_RATE_LIMITER && typeof env.ANALYTICS_RATE_LIMITER.limit === 'function') {
    const key = await rateKey(request, env.RATE_SALT);
    const res = await env.ANALYTICS_RATE_LIMITER.limit({ key });
    if (res && res.success === false) return false;
  }
  // Rem cadangan per isolate: mencegah satu klien membanjiri dalam satu jendela.
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
 * processClientBatch(body, now) -> { status, payload, agg? }
 *
 * Aturan yang tidak boleh dilemahkan:
 *  - event tak dikenal            -> 400 unknown_event
 *  - event server-only dari klien  -> 400 server_only
 *  - ada field asing               -> 400 foreign_field (bukan "diam-diam dibuang":
 *                                     klien harus tahu payload-nya salah)
 *  - `day` di luar ±2 hari         -> 400 day_out_of_range
 */
export function processClientBatch(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, payload: { ok: false, error: 'bad_body' } };
  }
  if (body.schema !== SCHEMA_ID) {
    return { status: 400, payload: { ok: false, error: 'bad_schema' } };
  }
  const batch = normalizeBatchId(body.batchId);
  if (!batch.ok) {
    return { status: 400, payload: { ok: false, error: 'bad_batch_id' } };
  }
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length === 0) {
    return { status: 400, payload: { ok: false, error: 'no_events' } };
  }
  if (events.length > LIMITS.MAX_EVENTS) {
    return { status: 413, payload: { ok: false, error: 'too_many_events', max: LIMITS.MAX_EVENTS } };
  }

  const clean = [];
  for (let i = 0; i < events.length; i++) {
    const raw = events[i];
    // Nama server-only ditolak lebih awal dengan pesan yang jelas.
    if (raw && typeof raw === 'object' && isServerOnly(raw.name)) {
      return { status: 400, payload: { ok: false, error: 'server_only', event: raw.name, index: i } };
    }
    const res = normalizeEvent(raw, { origin: 'client' });
    if (!res.ok) {
      return { status: 400, payload: { ok: false, error: res.reason, index: i } };
    }
    if (res.dropped.length > 0) {
      return { status: 400, payload: { ok: false, error: 'foreign_field', fields: res.dropped, index: i } };
    }
    if (res.invalid.length > 0) {
      return { status: 400, payload: { ok: false, error: 'invalid_field', fields: res.invalid, index: i } };
    }
    if (!daySkewOk(res.event.day, now)) {
      return { status: 400, payload: { ok: false, error: 'day_out_of_range', index: i } };
    }
    clean.push(res.event);
  }

  return { status: 202, payload: { ok: true, accepted: clean.length }, agg: aggregate(clean), batchId: batch.value };
}

/**
 * processRetentionPing(body, now) -> { status, payload, agg? }
 * HANYA `cohort_day` + `day_index`. Tidak ada token, tidak ada identitas —
 * server benar-benar hanya menaikkan satu penghitung agregat.
 */
export function processRetentionPing(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, payload: { ok: false, error: 'bad_body' } };
  }
  if (body.schema !== SCHEMA_ID) {
    return { status: 400, payload: { ok: false, error: 'bad_schema' } };
  }
  const batch = normalizeBatchId(body.batchId);
  if (!batch.ok) {
    return { status: 400, payload: { ok: false, error: 'bad_batch_id' } };
  }
  const list = Array.isArray(body.pings) ? body.pings : [body];
  if (list.length > LIMITS.MAX_RETENTION_PINGS) {
    return { status: 413, payload: { ok: false, error: 'too_many_pings', max: LIMITS.MAX_RETENTION_PINGS } };
  }

  const clean = [];
  for (let i = 0; i < list.length; i++) {
    const src = list[i] || {};
    // Selubung dibangun ulang dari nol: apa pun yang klien kirim di luar dua
    // field ini tidak punya jalan masuk sama sekali.
    const raw = { name: 'retention_ping', day: src.day || dayKey(now), cohort_day: src.cohort_day, day_index: src.day_index };
    // `schema`/`pings`/`batchId` adalah kunci selubung; sisanya harus tepat dua field.
    const extras = Object.keys(src).filter(k => !['day', 'cohort_day', 'day_index', 'schema', 'pings', 'batchId'].includes(k));
    if (extras.length > 0) {
      return { status: 400, payload: { ok: false, error: 'foreign_field', fields: extras, index: i } };
    }
    const res = normalizeEvent(raw, { origin: 'client' });
    if (!res.ok) return { status: 400, payload: { ok: false, error: res.reason, index: i } };
    if (res.invalid.length > 0) return { status: 400, payload: { ok: false, error: 'invalid_field', fields: res.invalid, index: i } };
    if (!daySkewOk(res.event.day, now)) return { status: 400, payload: { ok: false, error: 'day_out_of_range', index: i } };
    // cohort_day tidak boleh di masa depan.
    if (Date.parse(`${res.event.cohort_day}T00:00:00Z`) > now + 2 * 86400000) {
      return { status: 400, payload: { ok: false, error: 'cohort_in_future', index: i } };
    }
    clean.push(res.event);
  }

  return { status: 202, payload: { ok: true, accepted: clean.length }, agg: aggregate(clean), batchId: batch.value };
}

/* -------------------------------------------------------------------------- */
/* Handler HTTP                                                               */
/* -------------------------------------------------------------------------- */

function waitUntil(ctx, promise) {
  // Analytics TIDAK BOLEH menambah latensi ke jalur belajar.
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(promise);
  else promise.catch(() => {});
}

function analyticsDb(env) {
  // Sengaja binding TERPISAH dari database kuota. Kalau binding ini tidak ada,
  // analytics diam saja — fitur baru wajib aman saat flag-nya mati.
  return (env && (env.ANALYTICS_DB || env.DB_ANALYTICS)) || null;
}

function enabled(env) {
  return String((env && env.ANALYTICS_ENABLED) || 'off') === 'on';
}

/**
 * dedupBatch(db, batchId, now) -> true bila batch BARU, false bila duplikat.
 *
 * Dedup HARUS selesai SEBELUM applyAggregate dijadwalkan — kalau tidak, retry
 * setelah timeout ambigu menaikkan semua penghitung dua kali (temuan council).
 * Satu SELECT + satu INSERT kecil; latensinya jauh lebih murah daripada angka
 * dashboard yang bohong.
 *
 * Bila tabel dedup belum ada (migrasi 0003 belum diterapkan), kegagalan
 * ditelan dan batch diperlakukan BARU: perilaku persis seperti sebelum fitur
 * ini ada. Fitur baru wajib aman saat prasyaratnya belum terpasang.
 */
async function dedupBatch(db, batchId, now) {
  if (!db || !batchId) return true;
  try {
    return await markBatchSeen(db, batchId, dayKey(now));
  } catch {
    return true;
  }
}

export async function handleEvents(request, env, ctx, now = Date.now()) {
  if (!enabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);
  if (!(await checkRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);

  const body = await readBoundedJson(request);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processClientBatch(body.value, now);
  if (result.status !== 202) return json(result.payload, result.status);

  const db = analyticsDb(env);
  if (!(await dedupBatch(db, result.batchId, now))) {
    // Batch ini sudah pernah diterima: balas sukses (klien boleh berhenti
    // retry) TANPA agregasi ulang. 200, bukan 202: tidak ada yang diproses.
    return json({ ok: true, accepted: result.payload.accepted, duplicate: true }, 200);
  }
  if (db) waitUntil(ctx, applyAggregate(db, result.agg));
  return json(result.payload, 202);
}

export async function handleRetention(request, env, ctx, now = Date.now()) {
  if (!enabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);
  if (!(await checkRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);

  const body = await readBoundedJson(request, 1024);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processRetentionPing(body.value, now);
  if (result.status !== 202) return json(result.payload, result.status);

  const db = analyticsDb(env);
  if (!(await dedupBatch(db, result.batchId, now))) {
    // retention_ping tanpa batchId dapat di-replay (temuan council §4.3);
    // dengan batchId, replay berhenti di sini tanpa menyentuh penghitung kohor.
    return json({ ok: true, accepted: result.payload.accepted, duplicate: true }, 200);
  }
  if (db) waitUntil(ctx, applyAggregate(db, result.agg));
  return json(result.payload, 202);
}

export async function handlePepper(request, env, ctx, now = Date.now()) {
  if (!enabled(env)) return json({ ok: false, error: 'disabled' }, 404);
  if (!(await checkRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);
  const db = analyticsDb(env);
  if (!db) return json({ ok: false, error: 'unavailable' }, 503);
  const store = await import('./analytics-store-d1.js');
  // COLD START: `ensurePepperState` membuat pepper putaran pertama bila
  // `pepper_state` masih kosong. Tanpa ini, basis data analytics yang baru
  // menjawab 503 sampai cron 00:05 WIB pertama lewat — dan karena klien butuh
  // pepper untuk menurunkan `visitor_token`, hari pertama SELALU nol DAU.
  // Penulisannya idempoten di level D1 (`ON CONFLICT(id) DO NOTHING`) dan hasil
  // yang disajikan adalah hasil BACA ULANG, jadi dua permintaan bersamaan tidak
  // mungkin menyajikan dua pepper berbeda. Lihat catatan panjang di
  // analytics-store-d1.js.
  const ensured = await store.ensurePepperState(db, now);
  const state = ensured && ensured.state;
  if (!state || !state.current) return json({ ok: false, error: 'unavailable' }, 503);
  return json({
    ok: true,
    day: dayKey(now),
    pepper: state.current,
    rotatesAtMs: state.rotated_at + 24 * 60 * 60 * 1000,
    note: 'hitung visitor_token di perangkat; identitas pemasangan tidak pernah dikirim'
  }, 200);
}

/* -------------------------------------------------------------------------- */
/* Pendaftaran rute                                                            */
/* -------------------------------------------------------------------------- */

export const ROUTES = Object.freeze([
  { method: 'POST', path: '/api/usage/events', handler: 'handleEvents' },
  { method: 'POST', path: '/api/usage/retention', handler: 'handleRetention' },
  { method: 'GET', path: '/api/usage/pepper', handler: 'handlePepper' }
]);

/**
 * registerAnalyticsRoutes(router)
 *
 * Mendukung dua bentuk router yang mungkin dipakai `workers/api/index.js`:
 *   - gaya Hono/manual: router.post(path, handler) / router.get(...)
 *   - gaya tabel:       router.on('POST', path, handler)
 * Handler menerima (request, env, ctx) — bila router memberi satu objek konteks
 * gaya Hono, adapter di bawah membongkarnya.
 */
export function registerAnalyticsRoutes(router) {
  if (!router) throw new Error('registerAnalyticsRoutes: router wajib');

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
    else throw new Error('registerAnalyticsRoutes: bentuk router tidak dikenali');
  };

  add('POST', '/api/usage/events', handleEvents);
  add('POST', '/api/usage/retention', handleRetention);
  add('GET', '/api/usage/pepper', handlePepper);
  return router;
}

export { CLIENT_EVENTS };

export default { registerAnalyticsRoutes, handleEvents, handleRetention, handlePepper, processClientBatch, processRetentionPing, normalizeBatchId, BATCH_ID_PATTERN, LIMITS, SCHEMA_ID, ROUTES };
