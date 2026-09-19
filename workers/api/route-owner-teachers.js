/**
 * workers/api/route-owner-teachers.js — pencetakan dan pencabutan undangan guru
 * oleh OWNER, plus daftar guru aktif (§22, §34).
 *
 * ==========================================================================
 * DUA GERBANG, DAN KENAPA KEDUANYA
 * ==========================================================================
 * Rute di sini melewati `roleGate` (peran `owner` di `auth_account`) DAN
 * `ownerGate` dari `cron-status.js` (secret `OWNER_TOKEN_HASH`). Itu bukan
 * kelebihan: keduanya menjawab pertanyaan berbeda.
 *   - `roleGate` menjawab "akun yang login ini berperan owner?" — ia bisa gagal
 *     terbuka kalau ada baris `auth_account` yang salah tulis.
 *   - `ownerGate` menjawab "pemanggil memegang secret yang HANYA ada di
 *     wrangler owner?" — ia tidak bisa dipalsukan dari database mana pun.
 * Mencetak undangan guru adalah tindakan yang membuat AKUN BARU BERIZIN, dan
 * satu baris D1 yang keliru tidak boleh cukup untuk melakukannya. Untuk rute
 * BACA (daftar guru) satu gerbang peran sudah memadai.
 */

import { jsonResponse, jsonError } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';
import { roleGate, coreDb } from './auth/gate.js';
import { ownerGate } from './cron-status.js';
import { ensureAuthSchema } from './auth-schema.js';
import { mintInvite, publicInviteView, checkInviteInput, hashCode, codeWellFormed } from './auth/invite-core.js';

const MIGRATED_TEACHER_DBS = new WeakSet();

export async function ensureTeacherInviteColumns(db) {
  if (!db || typeof db.prepare !== 'function' || MIGRATED_TEACHER_DBS.has(db)) return;
  const cols = [
    ['teacher_invite', 'class_code', 'TEXT'],
    ['teacher_invite', 'raw_code', 'TEXT'],
    ['teacher_invite', 'subject_id', 'TEXT'],
    ['teacher_invite', 'grade_id', 'TEXT'],
    ['teacher_profile', 'class_code', 'TEXT'],
    ['teacher_profile', 'subject_id', 'TEXT'],
    ['teacher_profile', 'grade_id', 'TEXT'],
    ['tc_assignment', 'class_code', 'TEXT']
  ];
  for (const [tbl, col, typ] of cols) {
    try {
      await db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${typ}`).run();
    } catch (_) {
      // Kolom sudah ada
    }
  }
  MIGRATED_TEACHER_DBS.add(db);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite                                              */
/* ========================================================================== */

export async function routeTeacherInviteCreate(ctx) {
  const secretGate = await ownerGate(ctx);
  let ownerSub = 'owner';
  let db = coreDb(ctx.env);

  if (secretGate) {
    // Tanpa header secret token owner: wajib lolos roleGate (sesi browser owner)
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    ownerSub = gate.sub;
    db = gate.db;
  } else if (ctx.identity && ctx.identity.verified && ctx.identity.sub) {
    ownerSub = ctx.identity.sub;
  }

  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const problem = checkInviteInput(body.value);
  if (problem) return jsonError(400, problem.problem, {}, opt);

  const minted = await mintInvite({ ...body.value, ownerSub }, ctx.now);
  const r = minted.record;
  try {
    await db.prepare(
      'INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, ' +
      'created_at, expires_at, created_by, subject_id, grade_id, raw_code, class_code) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
    ).bind(r.code_hash, r.teacher_name, r.institution, r.institution_type,
      r.created_at, r.expires_at, r.created_by, r.subject_id || null, r.grade_id || null, minted.code, r.class_code || null).run();
  } catch (err) {
    try {
      await db.prepare(
        'INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, ' +
        'created_at, expires_at, created_by, subject_id, grade_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)'
      ).bind(r.code_hash, r.teacher_name, r.institution, r.institution_type,
        r.created_at, r.expires_at, r.created_by, r.subject_id || null, r.grade_id || null).run();
    } catch (fallbackErr) {
      return jsonError(500, 'internal_error', { reason: fallbackErr && fallbackErr.message }, opt);
    }
  }

  return jsonResponse({
    code: minted.code,
    invite: publicInviteView(r, ctx.now),
    notice: 'created'
  }, opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite/revoke                                       */
/* ========================================================================== */

export async function routeTeacherInviteRevoke(ctx) {
  const secretGate = await ownerGate(ctx);
  let db = coreDb(ctx.env);

  if (secretGate) {
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    db = gate.db;
  }

  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  // Owner mencabut dengan MENGETIK ULANG token atau memilih tombol Cabut dari daftar.
  const rawCode = body.value && body.value.code;
  const rawHash = body.value && body.value.codeHash;
  let codeHash = null;

  if (typeof rawHash === 'string' && /^[a-f0-9]{64}$/i.test(rawHash.trim())) {
    codeHash = rawHash.trim().toLowerCase();
  } else if (typeof rawCode === 'string' && codeWellFormed(rawCode)) {
    codeHash = await hashCode(rawCode);
  } else {
    return jsonError(400, 'invite_code_malformed', {}, opt);
  }

  const result = await db.prepare(
    'UPDATE teacher_invite SET revoked_at = ?2 WHERE code_hash = ?1 AND revoked_at IS NULL'
  ).bind(codeHash, ctx.now).run();

  // Token yang tidak ada dan token yang sudah dicabut menjawab sama: owner tidak
  // butuh membedakannya, dan endpoint yang membedakannya bisa dipakai menguji
  // keberadaan token oleh siapa pun yang berhasil melewati kedua gerbang.
  const changed = Boolean(result && result.meta && result.meta.changes === 1);
  return jsonResponse({ ok: true, revoked: changed }, opt);
}

/* ========================================================================== */
/* GET /api/owner/teachers                                                     */
/* ========================================================================== */

/**
 * Daftar guru + undangan. Owner mengelola GURU, bukan membaca bank soal mereka.
 */
export async function routeOwnerTeachers(ctx) {
  const secretGate = await ownerGate(ctx);
  let db = coreDb(ctx.env);

  if (secretGate) {
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    db = gate.db;
  }

  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);
  const opt = { headers: ctx.corsHeaders };

  let invites;
  try {
    invites = await db.prepare(
      'SELECT code_hash, teacher_name, institution, institution_type, created_at, expires_at, ' +
      'used_at, revoked_at, subject_id, grade_id, raw_code, class_code FROM teacher_invite ORDER BY created_at DESC LIMIT 200'
    ).all();
  } catch (_) {
    invites = await db.prepare(
      'SELECT code_hash, teacher_name, institution, institution_type, created_at, expires_at, ' +
      'used_at, revoked_at, subject_id, grade_id FROM teacher_invite ORDER BY created_at DESC LIMIT 200'
    ).all();
  }

  let teachers;
  try {
    teachers = await db.prepare(
      'SELECT p.teacher_name, p.institution, p.institution_type, p.activated_at, p.subject_id, p.grade_id, p.class_code, a.login_handle, a.status ' +
      'FROM teacher_profile p JOIN auth_account a ON a.sub = p.sub ORDER BY p.activated_at DESC LIMIT 200'
    ).all();
  } catch (_) {
    teachers = await db.prepare(
      'SELECT p.teacher_name, p.institution, p.institution_type, p.activated_at, p.subject_id, p.grade_id, a.login_handle, a.status ' +
      'FROM teacher_profile p JOIN auth_account a ON a.sub = p.sub ORDER BY p.activated_at DESC LIMIT 200'
    ).all();
  }

  return jsonResponse({
    invites: ((invites && invites.results) || []).map((row) => ({
      ...publicInviteView(row, ctx.now),
      subjectId: row.subject_id || null,
      gradeId: row.grade_id || null,
      classCode: row.class_code || null,
      codeHash: row.code_hash,
      rawCode: row.raw_code || null
    })),
    teachers: ((teachers && teachers.results) || []).map((row) => ({
      handle: row.login_handle,
      teacherName: row.teacher_name,
      institution: row.institution,
      institutionType: row.institution_type,
      subjectId: row.subject_id || null,
      gradeId: row.grade_id || null,
      classCode: row.class_code || null,
      status: row.status,
      activatedAt: Number(row.activated_at) || 0
    }))
  }, opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite/update                                       */
/* ========================================================================== */

export async function routeTeacherInviteUpdate(ctx) {
  const secretGate = await ownerGate(ctx);
  let db = coreDb(ctx.env);

  if (secretGate) {
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    db = gate.db;
  }

  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const { codeHash, subject_id, grade_id, teacherName, institution, class_code } = body.value || {};
  if (!codeHash || typeof codeHash !== 'string') {
    return jsonError(400, 'code_hash_required', {}, opt);
  }

  const existing = await db.prepare('SELECT used_by FROM teacher_invite WHERE code_hash = ?1').bind(codeHash).first();
  if (!existing) {
    return jsonError(404, 'invite_not_found', {}, opt);
  }

  await db.prepare(
    'UPDATE teacher_invite SET ' +
    'subject_id = COALESCE(?2, subject_id), ' +
    'grade_id = COALESCE(?3, grade_id), ' +
    'teacher_name = COALESCE(?4, teacher_name), ' +
    'institution = COALESCE(?5, institution), ' +
    'class_code = COALESCE(?6, class_code) ' +
    'WHERE code_hash = ?1'
  ).bind(codeHash, subject_id || null, grade_id || null, teacherName || null, institution || null, class_code || null).run();

  if (existing.used_by) {
    await db.prepare(
      'UPDATE teacher_profile SET ' +
      'subject_id = COALESCE(?2, subject_id), ' +
      'grade_id = COALESCE(?3, grade_id), ' +
      'teacher_name = COALESCE(?4, teacher_name), ' +
      'institution = COALESCE(?5, institution), ' +
      'class_code = COALESCE(?6, class_code) ' +
      'WHERE sub = ?1'
    ).bind(existing.used_by, subject_id || null, grade_id || null, teacherName || null, institution || null, class_code || null).run();
  }

  return jsonResponse({ ok: true, updated: true }, opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite/delete                                       */
/* ========================================================================== */

export async function routeTeacherInviteDelete(ctx) {
  const secretGate = await ownerGate(ctx);
  let db = coreDb(ctx.env);

  if (secretGate) {
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    db = gate.db;
  }

  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const { codeHash, mode } = body.value || {};

  if (mode === 'revoked') {
    const res = await db.prepare('DELETE FROM teacher_invite WHERE revoked_at IS NOT NULL OR expires_at < ?1').bind(ctx.now).run();
    return jsonResponse({ ok: true, deletedCount: (res && res.meta && res.meta.changes) || 0 }, opt);
  }

  if (mode === 'all') {
    const res = await db.prepare('DELETE FROM teacher_invite').run();
    return jsonResponse({ ok: true, deletedCount: (res && res.meta && res.meta.changes) || 0 }, opt);
  }

  if (!codeHash || typeof codeHash !== 'string') {
    return jsonError(400, 'code_hash_or_mode_required', {}, opt);
  }

  const res = await db.prepare('DELETE FROM teacher_invite WHERE code_hash = ?1').bind(codeHash).run();
  return jsonResponse({ ok: true, deleted: Boolean(res && res.meta && res.meta.changes === 1) }, opt);
}

export const ROUTES = [
  ['POST', '/api/owner/teacher-invite', routeTeacherInviteCreate],
  ['POST', '/api/owner/teacher-invite/revoke', routeTeacherInviteRevoke],
  ['POST', '/api/owner/teacher-invite/update', routeTeacherInviteUpdate],
  ['POST', '/api/owner/teacher-invite/delete', routeTeacherInviteDelete],
  ['GET', '/api/owner/teachers', routeOwnerTeachers]
];
