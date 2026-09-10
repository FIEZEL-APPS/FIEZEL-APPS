/**
 * workers/api/route-class-sync.js — SINKRON RUANG GURU lewat kode kelas.
 *
 * Alur: guru MENGKLAIM kode kelas (POST /api/teacher/class/claim) -> murid yang
 * mengetik kode itu saat onboarding mengirim laporan agregat setiap selesai sesi
 * (POST /api/learner/class-report) -> guru MENARIK laporan yang berubah sejak
 * tarikan terakhir (GET /api/teacher/class/reports?code=&since=).
 *
 * Aturan yang sama dengan route-teacher.js: gerbang peran DAN penyaringan per baris.
 * Setiap kueri tc_class* di lane guru membawa `teacher_sub = ?`; guru B tidak
 * bisa menarik laporan kelas guru A hanya dengan menebak kodenya.
 *
 * Lane murid TIDAK berperan (murid FIEZEL lokal-dulu, sering tanpa akun) tetapi
 * WAJIB beridentitas cookie fz_id ber-HMAC (mw-identity) — itu pegangan pembatas
 * laju — dan kode kelas harus SUDAH diklaim guru. Kode yang tidak dikenal dan kode
 * yang ada menjawab sama (404) supaya kode tidak bisa dipindai.
 */

import { jsonResponse, jsonError, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';
import { roleGate, coreDb, unauthenticated } from './auth/gate.js';
import { ensureAuthSchema } from './auth-schema.js';
import { normalizeReport, normalizeClaim, normalizeClassCode, normalizeAssignment, rowToAssignment, learnerKey, makeRateLimiter, rowToReport, LIMITS, ASSIGN_LIMITS } from './teacher/class-sync-core.js';

const learnerAllowed = makeRateLimiter(LIMITS.LEARNER_MIN_INTERVAL_MS);
const learnerPollAllowed = makeRateLimiter(ASSIGN_LIMITS.LEARNER_POLL_MIN_INTERVAL_MS);
const teacherAllowed = makeRateLimiter(LIMITS.TEACHER_MIN_INTERVAL_MS);
const opt = (ctx) => ({ headers: ctx.corsHeaders });

/* ========================================================================== */
/* POST /api/learner/class-report                                              */
/* ========================================================================== */

export async function routeLearnerClassReport(ctx) {
  const o = opt(ctx);
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) return unauthenticated(ctx);
  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, {}, o);
  if (!learnerAllowed(ctx.identity.sub, ctx.now)) return jsonError(429, ERR.RATE_LIMITED, {}, o);

  const body = await readJsonFromCtx(ctx, o);
  if (!body.ok) return body.response;
  const r = normalizeReport(body.value, ctx.now);
  if (!r.ok) return jsonError(400, ERR.SCHEMA_INVALID, { reason: r.reason }, o);

  await ensureAuthSchema(db);
  const cls = await db.prepare('SELECT code FROM tc_class WHERE code = ?1').bind(r.code).first();
  if (!cls) return jsonError(404, ERR.NOT_FOUND, {}, o);

  await db.prepare(
    'INSERT INTO tc_class_report (class_code, learner_key, display_name, learner_sub, reported_at, report_json, updated_at) ' +
    'VALUES (?1,?2,?3,?4,?5,?6,?7) ' +
    'ON CONFLICT(class_code, learner_key) DO UPDATE SET display_name = excluded.display_name, learner_sub = excluded.learner_sub, ' +
    'reported_at = excluded.reported_at, report_json = excluded.report_json, updated_at = excluded.updated_at'
  ).bind(r.code, r.key, r.name, ctx.identity.sub, r.report.at, JSON.stringify(r.report), ctx.now).run();

  return jsonResponse({ ok: true, cls: r.code, name: r.name }, { ...o, status: 202 });
}

/* ========================================================================== */
/* POST /api/teacher/class/claim                                               */
/* ========================================================================== */

export async function routeClassClaim(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const c = normalizeClaim(body.value);
  if (!c.ok) return jsonError(400, ERR.SCHEMA_INVALID, { reason: c.reason }, gate.opt);

  const existing = await gate.db.prepare('SELECT code, teacher_sub FROM tc_class WHERE code = ?1').bind(c.code).first();
  if (existing && existing.teacher_sub !== gate.sub) {
    // Kode sudah milik guru lain: satu bentuk penolakan, sama dengan gate.denied.
    return jsonError(409, 'class_code_taken', {}, gate.opt);
  }
  if (existing) {
    await gate.db.prepare('UPDATE tc_class SET title = ?2, level = ?3, updated_at = ?4 WHERE code = ?1 AND teacher_sub = ?5')
      .bind(c.code, c.title, c.level, ctx.now, gate.sub).run();
  } else {
    await gate.db.prepare('INSERT INTO tc_class (code, teacher_sub, title, level, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?5)')
      .bind(c.code, gate.sub, c.title, c.level, ctx.now).run();
  }
  return jsonResponse({ ok: true, code: c.code, title: c.title, level: c.level, claimed: !existing }, gate.opt);
}

/* ========================================================================== */
/* GET /api/teacher/class/list                                                 */
/* ========================================================================== */

export async function routeClassList(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const rows = await gate.db.prepare(
    'SELECT c.code, c.title, c.level, c.created_at, c.updated_at, ' +
    '(SELECT COUNT(*) FROM tc_class_report r WHERE r.class_code = c.code) AS reports ' +
    'FROM tc_class c WHERE c.teacher_sub = ?1 ORDER BY c.created_at LIMIT 100'
  ).bind(gate.sub).all();
  return jsonResponse({ classes: ((rows && rows.results) || []).map((r) => ({ code: r.code, title: r.title, level: r.level, createdAt: r.created_at, reports: Number(r.reports) || 0 })) }, gate.opt);
}

/* ========================================================================== */
/* GET /api/teacher/class/reports?code=FZ-XXXXXX&since=<ms>                    */
/* ========================================================================== */

export async function routeClassReports(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  if (!teacherAllowed(gate.sub, ctx.now)) return jsonError(429, ERR.RATE_LIMITED, {}, gate.opt);
  const code = normalizeClassCode(ctx.url.searchParams.get('code'));
  if (!code) return jsonError(400, ERR.SCHEMA_INVALID, { reason: 'bad_class_code' }, gate.opt);
  const since = Math.max(0, Number(ctx.url.searchParams.get('since')) || 0);

  const owned = await gate.db.prepare('SELECT code FROM tc_class WHERE code = ?1 AND teacher_sub = ?2').bind(code, gate.sub).first();
  if (!owned) return jsonError(404, ERR.NOT_FOUND, {}, gate.opt);

  const rows = await gate.db.prepare(
    'SELECT r.learner_key, r.display_name, r.reported_at, r.report_json, r.updated_at FROM tc_class_report r ' +
    'JOIN tc_class c ON c.code = r.class_code AND c.teacher_sub = ?2 ' +
    'WHERE r.class_code = ?1 AND r.updated_at > ?3 ORDER BY r.updated_at LIMIT ?4'
  ).bind(code, gate.sub, since, LIMITS.REPORTS_PAGE).all();
  const reports = ((rows && rows.results) || []).map(rowToReport).filter(Boolean);
  const cursor = reports.length ? reports[reports.length - 1].updatedAt : since;
  return jsonResponse({ code, since, cursor, now: ctx.now, reports, more: reports.length >= LIMITS.REPORTS_PAGE }, gate.opt);
}

export const ROUTES = [
  ['POST', '/api/learner/class-report', routeLearnerClassReport],
  ['GET', '/api/learner/class-assignments', routeLearnerClassAssignments],
  ['POST', '/api/teacher/class/claim', routeClassClaim],
  ['GET', '/api/teacher/class/list', routeClassList],
  ['GET', '/api/teacher/class/reports', routeClassReports],
  ['POST', '/api/teacher/class/assign', routeClassAssign]
];

/* ========================================================================== */
/* POST /api/teacher/class/assign — guru MENGIRIM tugas ke murid (semua/terpilih) */
/* ========================================================================== */

export async function routeClassAssign(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const a = normalizeAssignment(body.value);
  if (!a.ok) return jsonError(400, ERR.SCHEMA_INVALID, { reason: a.reason }, gate.opt);

  const owned = await gate.db.prepare('SELECT code FROM tc_class WHERE code = ?1 AND teacher_sub = ?2').bind(a.code, gate.sub).first();
  if (!owned) return jsonError(404, ERR.NOT_FOUND, {}, gate.opt);

  await gate.db.prepare(
    'INSERT INTO tc_class_assignment (class_code, id, teacher_sub, payload_json, targets_json, created_at, updated_at) ' +
    'VALUES (?1,?2,?3,?4,?5,?6,?6) ' +
    'ON CONFLICT(class_code, id) DO UPDATE SET payload_json = excluded.payload_json, targets_json = excluded.targets_json, updated_at = excluded.updated_at'
  ).bind(a.code, a.id, gate.sub, JSON.stringify(a.payload), a.targets ? JSON.stringify(a.targets) : null, ctx.now).run();

  return jsonResponse({ ok: true, code: a.code, id: a.id, targets: a.targets ? a.targets.length : 'all', at: ctx.now }, gate.opt);
}

/* ========================================================================== */
/* GET /api/learner/class-assignments?cls=FZ-XXXXXX&name=Rina&since=<ms>       */
/* ========================================================================== */

export async function routeLearnerClassAssignments(ctx) {
  const o = opt(ctx);
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) return unauthenticated(ctx);
  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, {}, o);
  if (!learnerPollAllowed(ctx.identity.sub, ctx.now)) return jsonError(429, ERR.RATE_LIMITED, {}, o);
  const code = normalizeClassCode(ctx.url.searchParams.get('cls'));
  if (!code) return jsonError(400, ERR.SCHEMA_INVALID, { reason: 'bad_class_code' }, o);
  const key = learnerKey(ctx.url.searchParams.get('name'));
  if (!key) return jsonError(400, ERR.SCHEMA_INVALID, { reason: 'bad_name' }, o);
  const since = Math.max(0, Number(ctx.url.searchParams.get('since')) || 0);

  await ensureAuthSchema(db);
  const cls = await db.prepare('SELECT code FROM tc_class WHERE code = ?1').bind(code).first();
  if (!cls) return jsonError(404, ERR.NOT_FOUND, {}, o);

  const rows = await db.prepare(
    'SELECT id, payload_json, targets_json, updated_at FROM tc_class_assignment WHERE class_code = ?1 AND updated_at > ?2 ORDER BY updated_at LIMIT ?3'
  ).bind(code, since, ASSIGN_LIMITS.PAGE).all();
  const all = (rows && rows.results) || [];
  const cursor = all.length ? Number(all[all.length - 1].updated_at) || since : since;
  const assignments = all.map((r) => rowToAssignment(r, key)).filter(Boolean);
  return jsonResponse({ cls: code, since, cursor, now: ctx.now, assignments, more: all.length >= ASSIGN_LIMITS.PAGE }, o);
}
