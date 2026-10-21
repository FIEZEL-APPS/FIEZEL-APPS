/**
 * FIEZEL — endpoint lane BUKTI BELAJAR Braincore (`fiezel-braincore-evidence-v1`).
 *
 *   POST /api/braincore/evidence        batch bukti belajar dari perangkat murid
 *   GET  /api/owner/braincore-evidence  ringkasan AGREGAT untuk Owner Dashboard
 *
 * Dua rute, dua gerbang yang sama sekali berbeda, dan itu disengaja:
 *   - jalur TULIS tidak menuntut identitas apa pun (payloadnya memang tidak
 *     boleh punya identitas) dan hanya menerima `EVIDENCE_DB`;
 *   - jalur BACA menuntut token owner (pola `cron-status.js`: sha256 hex di
 *     secret `OWNER_TOKEN_HASH`, banding waktu-konstan, fail-closed) dan HANYA
 *     boleh menyentuh `evidence_daily`. Tabel `evidence_learner_day` dan
 *     `evidence_dedup` TIDAK PERNAH disebut di jalur baca — larangan yang sama
 *     dengan `dau_dedup` di dashboard analytics, dan alasannya sama: satu-satunya
 *     kolom yang menunjuk perangkat tidak boleh punya pembaca lewat HTTP.
 *
 * PEMASANGAN: POST lewat `route-wiring.js` (registerEvidenceRoutes), GET lewat
 * `route-slots.js` (array ROUTES, pola cron-status.js). Jangan mengedit
 * `workers/api/index.js` dari paket kerja ini.
 */

import {
  EVIDENCE_LIMITS,
  EVIDENCE_EVENT_TYPES,
  normalizeEvidenceEnvelope
} from './evidence-core.js';
import {
  markEvidenceEventsSeen,
  markLearnerDay,
  applyEvidenceAggregate,
  LEARNERS_EVENT,
  LEARNERS_DIM,
  SQL
} from './evidence-store-d1.js';
import { ctEq } from '../mw-edge.js';

export const LIMITS = EVIDENCE_LIMITS;
export const EVIDENCE_PATH = '/api/braincore/evidence';
export const EVIDENCE_OWNER_PATH = '/api/owner/braincore-evidence';
export const OWNER_TOKEN_HEADER = 'x-fiezel-owner-token';
export const OWNER_DEFAULT_DAYS = 30;
export const OWNER_MAX_DAYS = 90;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function shiftDay(day, delta) {
  return dayKey(Date.parse(day + 'T00:00:00Z') + delta * 86400000);
}

/* -------------------------------------------------------------------------- */
/* Rate limit — pola route-events.js: kunci = 64 bit pertama SHA-256(salt:ip), */
/* hidup HANYA di memori isolate, tidak pernah ke D1. Ember SENDIRI: tiga lane */
/* tidak boleh saling memakan jatah rem satu sama lain.                        */
/* -------------------------------------------------------------------------- */
const memoryBuckets = new Map();

async function rateKey(request, salt) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const data = new TextEncoder().encode((salt || 'fz') + ':' + ip);
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
    if (memoryBuckets.size > 5000) memoryBuckets.clear();
    return true;
  }
  if (bucket.count >= LIMITS.RATE_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

/** Batas byte KERAS, dicek SEBELUM JSON.parse. */
export async function readBoundedJson(request, maxBytes = LIMITS.MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, reason: 'too_large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, reason: 'too_large' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'bad_json' };
  }
}

/* -------------------------------------------------------------------------- */
/* Inti pemrosesan (murni terhadap jaringan; diuji langsung oleh gerbang)      */
/* -------------------------------------------------------------------------- */

export function processEvidenceBatch(body, now = Date.now()) {
  const res = normalizeEvidenceEnvelope(body, now);
  if (!res.ok) {
    const status = res.reason === 'too_many_events' ? 413 : 400;
    const payload = { ok: false, error: res.reason };
    if (res.field !== undefined) payload.field = res.field;
    if (res.index !== undefined) payload.index = res.index;
    if (res.reason === 'too_many_events') payload.max = LIMITS.MAX_EVENTS;
    return { status, payload };
  }
  return { status: 202, payload: { ok: true, accepted: res.envelope.events.length }, envelope: res.envelope };
}

/* -------------------------------------------------------------------------- */
/* Handler TULIS                                                              */
/* -------------------------------------------------------------------------- */

function waitUntil(ctx, promise) {
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(promise);
  else promise.catch(() => {});
}

function evidenceDb(env) {
  // HANYA EVIDENCE_DB. Sengaja tanpa fallback: salah binding harus terlihat
  // sebagai "lane diam", bukan sebagai bukti belajar yang mendarat di database
  // kuota/analytics/learning.
  return (env && env.EVIDENCE_DB) || null;
}

function enabled(env) {
  // Default MATI. Fail-closed: flag yang tidak terbaca bukan izin.
  return String((env && env.EVIDENCE_ENABLED) || 'off') === 'on';
}

export async function handleEvidenceEvents(request, env, ctx, now = Date.now()) {
  // Flag mati -> 202 {disabled:true}, BUKAN 404: klien yang sudah telanjur
  // rilis tidak boleh melihat 404 lalu retry tanpa henti (pola analytics).
  if (!enabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);
  if (!(await checkRateLimit(request, env, now))) return json({ ok: false, error: 'rate_limited' }, 429);

  const body = await readBoundedJson(request);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processEvidenceBatch(body.value, now);
  if (result.status !== 202) return json(result.payload, result.status);

  const db = evidenceDb(env);
  if (!db) return json({ ok: true, accepted: 0, disabled: true }, 202);

  // Dedup per-event SINKRON, SEBELUM agregasi dijadwalkan: dedup di dalam
  // waitUntil = jendela balapan di mana retry cepat terhitung dua kali.
  let fresh;
  try {
    fresh = await markEvidenceEventsSeen(db, result.envelope.events, result.envelope.batchId, dayKey(now));
  } catch {
    // Tabel belum dimigrasi / D1 sakit: 202 tanpa tulis, bukan 500 — kegagalan
    // infrastruktur bukan salah klien, dan klien yang melihat 5xx akan retry.
    return json({ ok: true, accepted: 0, disabled: true }, 202);
  }

  if (fresh.length === 0) {
    // Semua event sudah pernah diterima: balas sukses (klien boleh berhenti
    // retry) TANPA agregasi ulang. 200, bukan 202: tidak ada yang diproses.
    return json({ ok: true, accepted: result.envelope.events.length, duplicate: true }, 200);
  }

  const day = result.envelope.day;
  const cohorts = fresh.map(e => e.cohort);
  waitUntil(ctx, (async () => {
    let newLearners = 0;
    try { newLearners = await markLearnerDay(db, day, cohorts); } catch { newLearners = 0; }
    await applyEvidenceAggregate(db, day, fresh, newLearners);
  })().catch(() => {}));

  return json({ ok: true, accepted: fresh.length }, 202);
}

/* -------------------------------------------------------------------------- */
/* Gerbang owner (pola cron-status.js — SATU bentuk penolakan untuk semua sebab)*/
/* -------------------------------------------------------------------------- */

async function sha256Hex(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  let out = '';
  for (const b of new Uint8Array(buf)) out += b.toString(16).padStart(2, '0');
  return out;
}

function bearer(value) {
  const m = /^Bearer\s+(.+)$/i.exec(String(value || ''));
  return m ? m[1].trim() : '';
}

export function ownerConfigured(env) {
  const raw = env && env.OWNER_TOKEN_HASH;
  return typeof raw === 'string' && raw.trim().length >= 32;
}

export async function ownerAllowed(request, env) {
  if (!ownerConfigured(env)) return false;
  const headers = request && request.headers;
  const presented = (headers && (headers.get(OWNER_TOKEN_HEADER) || bearer(headers.get('authorization')))) || '';
  if (!presented) return false;
  let digest = '';
  try { digest = await sha256Hex(presented); } catch { return false; }
  return ctEq(digest, String(env.OWNER_TOKEN_HASH).trim().toLowerCase());
}

/* -------------------------------------------------------------------------- */
/* Ringkasan Owner Dashboard (murni: diuji tanpa Worker)                       */
/* -------------------------------------------------------------------------- */

/**
 * summarizeEvidenceRows(rows, {from,to}) -> model dashboard.
 *
 * Tidak ada nilai bawaan NOL. Dimensi yang tidak punya baris tetap absen, dan
 * UI mencetak "belum ada pengukuran" — pola kejujuran yang sama dengan
 * `workers/owner/index.js`: "nol" adalah klaim, dan klaim butuh pengukuran.
 */
export function summarizeEvidenceRows(rows, range) {
  const list = Array.isArray(rows) ? rows : [];
  const out = {
    range: { from: (range && range.from) || null, to: (range && range.to) || null },
    learnersMeasured: 0,
    evidenceCount: 0,
    decisionCount: 0,
    days: [],
    mastery: {},
    masteryTrend: {},
    misconception: {},
    misconceptionSkill: {},
    difficultyCalibration: {},
    calibrationError: {},
    decision: {},
    outcome: {},
    recommendation: {},
    improvementTrend: {},
    level: {}
  };
  const dayMap = new Map();
  const put = (bag, key, n) => { bag[key] = (bag[key] || 0) + n; };

  for (const r of list) {
    if (!r || typeof r.dim !== 'string') continue;
    const n = Number(r.n) || 0;
    const idx = r.dim.indexOf(':');
    const field = idx === -1 ? r.dim : r.dim.slice(0, idx);
    const value = idx === -1 ? '' : r.dim.slice(idx + 1);
    if (r.day && !dayMap.has(r.day)) dayMap.set(r.day, { day: r.day, learners: 0, evidence: 0, decisions: 0 });
    const bucket = r.day ? dayMap.get(r.day) : null;

    if (r.event === LEARNERS_EVENT) {
      if (r.dim === LEARNERS_DIM) {
        out.learnersMeasured += n;
        if (bucket) bucket.learners += n;
      }
      continue;
    }
    if (field === '_') {
      if (r.event === 'learner_evidence') { out.evidenceCount += n; if (bucket) bucket.evidence += n; }
      if (r.event === 'braincore_decision') { out.decisionCount += n; if (bucket) bucket.decisions += n; }
      continue;
    }
    if (r.event === 'learner_evidence') {
      if (field === 'masteryBucket') put(out.mastery, value, n);
      else if (field === 'masteryTrend') put(out.masteryTrend, value, n);
      else if (field === 'misconceptionBucket') put(out.misconception, value, n);
      else if (field === 'misconceptionSkill') put(out.misconceptionSkill, value, n);
      else if (field === 'difficultyCalibration') put(out.difficultyCalibration, value, n);
      else if (field === 'calibrationErrorBucket') put(out.calibrationError, value, n);
      else if (field === 'improvementTrend') put(out.improvementTrend, value, n);
      else if (field === 'level') put(out.level, value, n);
    } else if (r.event === 'braincore_decision') {
      if (field === 'decision') put(out.decision, value, n);
      else if (field === 'outcome') put(out.outcome, value, n);
      else if (field === 'recommendation') put(out.recommendation, value, n);
    }
  }
  out.days = Array.from(dayMap.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  // `measured:false` kalau memang tidak ada satu pun baris: UI wajib bisa
  // membedakan "nol murid" dari "belum ada pengukuran sama sekali".
  out.measured = list.length > 0;
  return out;
}

/**
 * GET /api/owner/braincore-evidence[?days=N]
 * Owner-gated, HANYA SELECT, HANYA `evidence_daily`.
 */
export async function handleOwnerEvidence(ctx) {
  const request = ctx && ctx.request;
  const env = (ctx && ctx.env) || {};
  const denied = json({ ok: false, error: 'forbidden_owner' }, 403);
  if (!request) return denied;
  if (!(await ownerAllowed(request, env))) return denied;

  const url = new URL(request.url);
  let days = Number(url.searchParams.get('days') || OWNER_DEFAULT_DAYS);
  if (!Number.isFinite(days) || days <= 0) days = OWNER_DEFAULT_DAYS;
  days = Math.min(OWNER_MAX_DAYS, Math.trunc(days));

  const now = typeof ctx.now === 'number' ? ctx.now : Date.now();
  const to = dayKey(now);
  const from = shiftDay(to, -(days - 1));

  const db = evidenceDb(env);
  if (!db || typeof db.prepare !== 'function') {
    // "Belum terpasang" BUKAN "nol murid". Dibedakan supaya owner tidak
    // membaca dashboard kosong sebagai kabar tentang murid.
    return json({ ok: true, migrated: false, schema: 'fiezel-braincore-evidence-summary-v1', range: { from, to }, summary: null });
  }
  let rows = [];
  try {
    const res = await db.prepare(SQL.selectEvidenceRange).bind(from, to).all();
    rows = (res && res.results) || [];
  } catch {
    return json({ ok: true, migrated: false, schema: 'fiezel-braincore-evidence-summary-v1', range: { from, to }, summary: null });
  }
  return json({
    ok: true,
    migrated: true,
    schema: 'fiezel-braincore-evidence-summary-v1',
    eventTypes: EVIDENCE_EVENT_TYPES,
    range: { from, to },
    summary: summarizeEvidenceRows(rows, { from, to })
  });
}

/* -------------------------------------------------------------------------- */
/* Pendaftaran rute                                                           */
/* -------------------------------------------------------------------------- */

/** Rute BACA owner — dipasang lewat route-slots.js (pola cron-status.js). */
export const ROUTES = Object.freeze([
  ['GET', EVIDENCE_OWNER_PATH, handleOwnerEvidence]
]);

/** Rute TULIS — dipasang lewat route-wiring.js (pola registerLearningRoutes). */
export function registerEvidenceRoutes(router) {
  if (!router) throw new Error('registerEvidenceRoutes: router wajib');

  const wrap = fn => async (...args) => {
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
    else throw new Error('registerEvidenceRoutes: bentuk router tidak dikenali');
  };

  add('POST', EVIDENCE_PATH, handleEvidenceEvents);
  return router;
}

export default {
  registerEvidenceRoutes,
  handleEvidenceEvents,
  handleOwnerEvidence,
  processEvidenceBatch,
  summarizeEvidenceRows,
  readBoundedJson,
  checkRateLimit,
  ownerAllowed,
  LIMITS,
  ROUTES
};
