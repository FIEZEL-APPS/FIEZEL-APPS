/**
 * FIEZEL · workers/api/quota/route-quota.js
 *
 * `GET /api/quota` (skema `fiezel-quota-v1`, cf-b3 §4.1 + cf-b1 §1.b) dan helper
 * `enforceQuota(bucket, cost)` untuk dipakai rute AI/TTS.
 *
 * BERKAS INI TIDAK MENGUBAH `workers/api/index.js`. Ia mengekspor
 * `registerQuotaRoutes(router)` supaya agen Worker lain yang memiliki `index.js` bisa
 * memasangnya dengan satu baris. Instruksi pemasangan: reports/exec-e3-quota.md.
 *
 * TIGA ATURAN YANG DITEGAKKAN GERBANG:
 *
 *  1. **Tidak ada satu nilai kuota pun yang dibaca dari body/query/header klien.**
 *     `user_id` datang dari cookie sesi yang sudah diverifikasi middleware identitas;
 *     `plan` datang dari D1; jenis permintaan ditentukan RUTE. Body boleh berisi
 *     `plan:'plus'`, `used:0`, `quota:{remaining:99}`, `cacheHit:true`, `reservationId:…` —
 *     semuanya diabaikan tanpa galat (cf-b3 §7). Ini dijaga statis oleh
 *     `quota-manipulation-test.js`.
 *  2. **Server mengirim FAKTA + `copyKey`, bukan kalimat.** Tidak ada satu pun prosa
 *     Bahasa Indonesia di badan respons; naskah tinggal di `features/quota/quota-copy.js`
 *     (rekomendasi F7 cf-a12) supaya bisa diuji seperti `GEMS_COPY`.
 *  3. **`quotaCharged` wajib ada di SETIAP respons gagal.** Itu yang membuat janji
 *     "kegagalan provider tidak menagih kuota" bisa diperiksa mesin (cf-b3 §4.3).
 *
 * `GET /api/quota` SELALU 200 (kecuali identitas tidak sah) dan `Cache-Control:
 * private, no-store` — angka kuota basi lebih buruk daripada tidak ada angka.
 */

import { QUOTA_CONFIG, QUOTA_BUCKETS } from './quota-config.js';
import { DENY_SCOPE, chargesFor, planTtsCharge, resetAtForQuota, snapshot } from './quota-core.js';
import { commitD1, loadStateD1, reserveD1, rollbackD1 } from './quota-store-d1.js';

export const QUOTA_RESPONSE_SCHEMA = 'fiezel-quota-v1';

/** Kunci naskah per keadaan. KUNCI, bukan naskah (aturan 2 di atas). */
export const COPY_KEY = Object.freeze({
  ok: 'quota.ok',
  low: 'quota.low',
  exhausted: 'quota.exhausted',
  degraded: 'quota.degraded',
  ai_daily: 'quota.ai.exhausted',
  ai_translate_daily: 'quota.aiTranslate.exhausted',
  tts_daily_calls: 'quota.tts.exhausted',
  tts_daily_chars: 'quota.tts.exhausted',
  rate_limited: 'quota.rate.slowdown',
  concurrency_limited: 'quota.concurrency.wait',
  payload_too_large: 'quota.payload.tooLong',
  service_degraded: 'service.degraded',
  provider_error: 'service.providerError'
});

export const NO_STORE_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store'
});

/* ============================================================ badan respons ========= */

/**
 * Membangun badan `GET /api/quota`. FUNGSI MURNI: seluruh masukan adalah parameter, dan
 * `snap` sudah berasal dari `snapshot(state, now)` di quota-core.js.
 */
export function buildQuotaBody({ snap, plan, now, degraded }) {
  const buckets = {};
  for (const b of QUOTA_BUCKETS) {
    const s = snap.buckets[b];
    buckets[b] = {
      used: s.used,
      held: s.held,
      usedEffective: s.usedEffective,
      limit: s.limit,
      remaining: s.remaining,
      unit: s.unit,
      exhausted: s.exhausted
    };
    if (s.parent) buckets[b].parent = s.parent;
  }
  const isDegraded = !!(degraded && (degraded.ai || degraded.tts));
  const state = isDegraded ? 'degraded' : snap.state;
  return {
    schema: QUOTA_RESPONSE_SCHEMA,
    plan: plan === 'free' ? 'free' : 'free',    // ASSIGNABLE_PLANS=['free'] (bab 34)
    paymentEnabled: QUOTA_CONFIG.PAYMENT_ENABLED,
    serverTime: now,
    day: snap.day,
    resetAt: snap.resetAt,
    resetTimezone: snap.resetTimezone,
    state,
    buckets,
    limits: {
      maxPromptChars: QUOTA_CONFIG.plans.free.FREE_MAX_PROMPT_CHARS,
      maxInputTokens: QUOTA_CONFIG.plans.free.FREE_MAX_INPUT_TOKENS,
      maxOutputTokens: QUOTA_CONFIG.plans.free.FREE_MAX_OUTPUT_TOKENS
    },
    rate: {
      aiPerMinute: QUOTA_CONFIG.plans.free.FREE_AI_RATE_PER_MINUTE,
      ttsPerMinute: QUOTA_CONFIG.plans.free.FREE_TTS_RATE_PER_MINUTE,
      anyPerMinute: QUOTA_CONFIG.plans.free.FREE_ANY_RATE_PER_MINUTE,
      aiConcurrent: QUOTA_CONFIG.plans.free.FREE_AI_CONCURRENCY,
      ttsConcurrent: QUOTA_CONFIG.plans.free.FREE_TTS_CONCURRENCY
    },
    degraded: {
      ai: !!(degraded && degraded.ai),
      tts: !!(degraded && degraded.tts),
      reason: (degraded && degraded.reason) || null
    },
    copyKey: COPY_KEY[state] || COPY_KEY.ok
  };
}

/* ============================================================ amplop penolakan ====== */

/**
 * Amplop penolakan tunggal (cf-b3 §4.3). `error` = kode mesin, `scope` = sebab spesifik,
 * `copyKey` = penunjuk naskah. `quotaCharged` SELALU ada.
 *
 * Pemisahan kode HTTP adalah inti perbaikannya: kuota habis = 429, payload = 413,
 * anggaran akun/provider = 503, provider gagal = 502. Kegagalan kuota TIDAK BOLEH 5xx,
 * dan kegagalan provider TIDAK BOLEH 429.
 */
export function denyEnvelope({ error, scope, status, resetAt, retryAfterMs, remaining, limit, actual }) {
  const body = {
    ok: false,
    error,
    scope: scope || null,
    quotaCharged: false,
    plan: 'free',
    paymentEnabled: QUOTA_CONFIG.PAYMENT_ENABLED,
    copyKey: COPY_KEY[scope] || COPY_KEY[error] || 'service.unknown'
  };
  if (Number.isFinite(resetAt)) body.resetAt = resetAt;
  if (Number.isFinite(retryAfterMs)) body.retryAfterMs = retryAfterMs;
  if (Number.isFinite(remaining)) body.remaining = remaining;
  if (Number.isFinite(limit)) body.limit = limit;
  if (Number.isFinite(actual)) body.actual = actual;
  return { status, body };
}

export function quotaExhaustedEnvelope({ scope, now }) {
  const resetAt = resetAtForQuota(now);
  return denyEnvelope({
    error: 'quota_exhausted',
    scope,
    status: 429,
    resetAt,
    retryAfterMs: Math.max(0, resetAt - now),
    remaining: 0
  });
}

export function payloadTooLargeEnvelope({ scope, limit, actual }) {
  // Ditolak SEBELUM reserve → tidak menyentuh kuota sama sekali.
  return denyEnvelope({ error: 'payload_too_large', scope, status: 413, limit, actual });
}

export function serviceDegradedEnvelope({ scope, retryAfterMs }) {
  // Bukan salah murid ⇒ BUKAN 429 dan BUKAN naskah kuota.
  return denyEnvelope({
    error: 'service_degraded',
    scope,
    status: 503,
    retryAfterMs: Number.isFinite(retryAfterMs) ? retryAfterMs : 60000
  });
}

export function providerErrorEnvelope({ scope }) {
  return denyEnvelope({ error: 'provider_error', scope, status: 502 });
}

/* ============================================================ validasi ukuran ======= */

/**
 * Panjang diukur SERVER setelah normalisasi. Klaim `promptChars`/`charCount` dari klien
 * tidak dibaca sama sekali (cf-b3 §7 #8).
 */
export function checkPromptSize(normalisedText) {
  const actual = typeof normalisedText === 'string' ? normalisedText.length : 0;
  const limit = QUOTA_CONFIG.plans.free.FREE_MAX_PROMPT_CHARS;
  if (actual > limit) return payloadTooLargeEnvelope({ scope: 'max_prompt_chars', limit, actual });
  return null;
}

/* ============================================================ enforceQuota ========== */

/**
 * `enforceQuota(bucket, cost)` → middleware untuk rute AI/TTS.
 *
 * `bucket` DITENTUKAN DI TITIK PASANG (rute), bukan dari body: `/api/ai/chat` → 'ai',
 * `/api/ai/translate` → 'aiTranslate', `/api/tts/render` → 'tts'. `cost` boleh fungsi
 * `(ctx) => number` supaya TTS bisa memakai panjang teks ternormalisasi yang DIUKUR SERVER.
 *
 * Kontrak yang dijamin:
 *   - cache hit (ditentukan `ctx.serverCacheHit` dari `R2.head`) → provider dipanggil?
 *     tidak relevan: kuota TIDAK disentuh dan tidak ada reservasi dibuat.
 *   - `reserve` gagal → 429 `quota_exhausted` dengan `scope` yang benar, TANPA memanggil
 *     provider.
 *   - handler melempar → `rollback` dijalankan lalu 502/503, dengan `quotaCharged:false`.
 *   - handler sukses → `commit` dengan `actual` yang di-clamp; status kuota ditumpangkan
 *     pada respons supaya frontend TIDAK perlu polling `/api/quota`.
 */
export function enforceQuota(bucket, cost) {
  return async function quotaGate(ctx, next) {
    const { db, userId, limits, now, newToken } = ctx;

    if (bucket === 'tts') {
      const plan = planTtsCharge({ serverCacheHit: ctx.serverCacheHit === true, chars: resolveCost(cost, ctx) });
      if (!plan.charge) {
        ctx.quota = { charged: false, reason: 'cache_hit' };
        return next();                       // cache hit = gratis, tak terbatas
      }
    }

    const amount = resolveCost(cost, ctx);
    if (!chargesFor(bucket, amount)) {
      return jsonResponse(providerErrorEnvelope({ scope: bucket }), ctx);
    }

    const token = newToken();               // id dibuat SERVER, tidak pernah dari klien
    const reserved = await reserveD1(db, {
      userId, bucket, amount, limits, now, token, ttlMs: QUOTA_CONFIG.RESERVATION_TTL_MS
    });
    if (!reserved.ok) {
      if (reserved.error === 'quota_exhausted') {
        return jsonResponse(quotaExhaustedEnvelope({ scope: reserved.scope || DENY_SCOPE[bucket], now }), ctx);
      }
      return jsonResponse(serviceDegradedEnvelope({ scope: 'quota_store' }), ctx);
    }

    try {
      const result = await next();
      await commitD1(db, { userId, token, now: ctx.nowAfter(), actual: result && result.actual });
      ctx.quota = { charged: true, token };
      return result;
    } catch (error) {
      await rollbackD1(db, { userId, token, now: ctx.nowAfter(), reason: classifyFailure(error) });
      ctx.quota = { charged: false, token, reason: classifyFailure(error) };
      const reason = classifyFailure(error);
      if (reason === 'provider_rate_limit' || reason === 'account_budget') {
        return jsonResponse(serviceDegradedEnvelope({ scope: reason }), ctx);
      }
      return jsonResponse(providerErrorEnvelope({ scope: bucket === 'tts' ? 'tts' : 'ai' }), ctx);
    }
  };
}

function resolveCost(cost, ctx) {
  if (typeof cost === 'function') return cost(ctx);
  return Number.isFinite(cost) ? cost : 1;
}

/** Klasifikasi kegagalan provider → sebab mesin. Tidak pernah menghasilkan 429. */
export function classifyFailure(error) {
  const message = String((error && error.message) || error || '');
  if (/timeout|aborted/i.test(message)) return 'provider_timeout';
  if (/\b429\b|rate.?limit/i.test(message)) return 'provider_rate_limit';
  if (/neuron|budget/i.test(message)) return 'account_budget';
  if (/empty|silent/i.test(message)) return 'provider_empty';
  return 'provider_error';
}

function jsonResponse(envelope, ctx) {
  const headers = Object.assign({}, NO_STORE_HEADERS);
  if (Number.isFinite(envelope.body.retryAfterMs)) {
    headers['retry-after'] = String(Math.ceil(envelope.body.retryAfterMs / 1000));
  }
  return ctx.json(envelope.body, envelope.status, headers);
}

/* ============================================================ registrasi rute ======= */

/**
 * TITIK PASANG TUNGGAL. `index.js` TIDAK diubah oleh paket kerja ini; master memasang
 * satu baris `registerQuotaRoutes(router)` (lihat reports/exec-e3-quota.md).
 *
 * `router` diharapkan punya `.get(path, handler)`. Handler menerima `ctx` yang sudah
 * melewati middleware identitas: `ctx.userId`, `ctx.db`, `ctx.limits`, `ctx.now`,
 * `ctx.json(body, status, headers)`.
 */
export function registerQuotaRoutes(router) {
  router.get('/api/quota', handleGetQuota);
  return router;
}

export async function handleGetQuota(ctx) {
  const now = ctx.now;
  // Tidak ada satu pun nilai yang diambil dari query/body/header klien di sini.
  const state = await loadStateD1(ctx.db, { userId: ctx.userId, now, limits: ctx.limits });
  const snap = snapshot(state, now);
  const body = buildQuotaBody({ snap, plan: 'free', now, degraded: ctx.degraded });
  return ctx.json(body, 200, NO_STORE_HEADERS);
}

export default {
  COPY_KEY,
  NO_STORE_HEADERS,
  QUOTA_RESPONSE_SCHEMA,
  buildQuotaBody,
  checkPromptSize,
  classifyFailure,
  denyEnvelope,
  enforceQuota,
  handleGetQuota,
  payloadTooLargeEnvelope,
  providerErrorEnvelope,
  quotaExhaustedEnvelope,
  registerQuotaRoutes,
  serviceDegradedEnvelope
};
