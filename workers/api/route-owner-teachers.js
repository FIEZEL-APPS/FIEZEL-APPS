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
    ['teacher_invite', 'school_id', 'TEXT'],
    ['teacher_profile', 'class_code', 'TEXT'],
    ['teacher_profile', 'subject_id', 'TEXT'],
    ['teacher_profile', 'grade_id', 'TEXT'],
    ['teacher_profile', 'school_id', 'TEXT'],
    ['tc_assignment', 'class_code', 'TEXT'],
    ['tc_class', 'school_id', 'TEXT']
  ];
  for (const [tbl, col, typ] of cols) {
    try {
      await db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${typ}`).run();
    } catch (_) {
      // Kolom sudah ada
    }
  }
  try {
    await db.prepare('CREATE TABLE IF NOT EXISTS tc_school (' +
      ' id TEXT PRIMARY KEY,' +
      ' name TEXT NOT NULL,' +
      ' npsn TEXT,' +
      ' level TEXT NOT NULL DEFAULT \'SMP\',' +
      ' type TEXT NOT NULL DEFAULT \'school\',' +
      ' city TEXT,' +
      ' address TEXT,' +
      ' principal_name TEXT,' +
      ' contact TEXT,' +
      ' created_at INTEGER NOT NULL,' +
      ' updated_at INTEGER NOT NULL' +
      ' )').run();
  } catch (_) {}
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
      'SELECT p.sub, p.teacher_name, p.institution, p.institution_type, p.activated_at, p.subject_id, p.grade_id, p.class_code, a.login_handle, a.status ' +
      'FROM teacher_profile p JOIN auth_account a ON a.sub = p.sub ORDER BY p.activated_at DESC LIMIT 200'
    ).all();
  } catch (_) {
    teachers = await db.prepare(
      'SELECT p.sub, p.teacher_name, p.institution, p.institution_type, p.activated_at, p.subject_id, p.grade_id, a.login_handle, a.status ' +
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
      sub: row.sub,
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

  const { codeHash, subject_id, grade_id, teacherName, institution, institutionType, class_code, school_id, extend_days } = body.value || {};
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
    'institution_type = COALESCE(?6, institution_type), ' +
    'class_code = COALESCE(?7, class_code), ' +
    'school_id = COALESCE(?8, school_id) ' +
    'WHERE code_hash = ?1'
  ).bind(codeHash, subject_id || null, grade_id || null, teacherName || null, institution || null, institutionType || null, class_code || null, school_id || null).run();

  if (Number(extend_days) > 0) {
    const addMs = Number(extend_days) * 86400000;
    await db.prepare('UPDATE teacher_invite SET expires_at = expires_at + ?2 WHERE code_hash = ?1').bind(codeHash, addMs).run();
  }

  if (existing.used_by) {
    await db.prepare(
      'UPDATE teacher_profile SET ' +
      'subject_id = COALESCE(?2, subject_id), ' +
      'grade_id = COALESCE(?3, grade_id), ' +
      'teacher_name = COALESCE(?4, teacher_name), ' +
      'institution = COALESCE(?5, institution), ' +
      'institution_type = COALESCE(?6, institution_type), ' +
      'class_code = COALESCE(?7, class_code), ' +
      'school_id = COALESCE(?8, school_id) ' +
      'WHERE sub = ?1'
    ).bind(existing.used_by, subject_id || null, grade_id || null, teacherName || null, institution || null, institutionType || null, class_code || null, school_id || null).run();
  }

  return jsonResponse({ ok: true, updated: true }, opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite/regenerate                                   */
/* ========================================================================== */

export async function routeTeacherInviteRegenerate(ctx) {
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

  const { codeHash } = body.value || {};
  if (!codeHash || typeof codeHash !== 'string') {
    return jsonError(400, 'code_hash_required', {}, opt);
  }

  const old = await db.prepare('SELECT teacher_name, institution, institution_type, subject_id, grade_id, class_code, school_id FROM teacher_invite WHERE code_hash = ?1').bind(codeHash).first();
  if (!old) {
    return jsonError(404, 'invite_not_found', {}, opt);
  }

  await db.prepare('UPDATE teacher_invite SET revoked_at = ?2 WHERE code_hash = ?1').bind(codeHash, ctx.now).run();

  const minted = await mintInvite({
    teacherName: old.teacher_name,
    institution: old.institution,
    institutionType: old.institution_type,
    days: 90,
    subject_id: old.subject_id,
    grade_id: old.grade_id,
    class_code: old.class_code,
    ownerSub: 'owner'
  }, ctx.now);

  const r = minted.record;
  try {
    await db.prepare(
      'INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, ' +
      'created_at, expires_at, created_by, subject_id, grade_id, raw_code, class_code, school_id) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)'
    ).bind(r.code_hash, r.teacher_name, r.institution, r.institution_type,
      r.created_at, r.expires_at, r.created_by, r.subject_id || null, r.grade_id || null, minted.code, r.class_code || null, old.school_id || null).run();
  } catch (_) {
    await db.prepare(
      'INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, ' +
      'created_at, expires_at, created_by, subject_id, grade_id, raw_code, class_code) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
    ).bind(r.code_hash, r.teacher_name, r.institution, r.institution_type,
      r.created_at, r.expires_at, r.created_by, r.subject_id || null, r.grade_id || null, minted.code, r.class_code || null).run();
  }

  return jsonResponse({
    ok: true,
    code: minted.code,
    invite: publicInviteView(r, ctx.now),
    notice: 'regenerated'
  }, opt);
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

/* ========================================================================== */
/* GET /api/owner/schools                                                      */
/* ========================================================================== */

export async function routeOwnerSchools(ctx) {
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

  let schools = [];
  try {
    const res = await db.prepare(
      'SELECT id, name, npsn, level, type, city, address, principal_name, contact, created_at, updated_at ' +
      'FROM tc_school ORDER BY created_at DESC LIMIT 200'
    ).all();
    schools = (res && res.results) || [];
  } catch (_) {}

  return jsonResponse({ ok: true, schools }, opt);
}

/* ========================================================================== */
/* POST /api/owner/school                                                      */
/* ========================================================================== */

export async function routeOwnerSchoolCreate(ctx) {
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
  const { name, npsn, level, type, city, address, principal_name, contact } = body.value || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonError(400, 'school_name_required', {}, opt);
  }
  const id = 'SCH-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const cleanName = name.trim().slice(0, 100);
  const cleanNpsn = (npsn || '').toString().trim().slice(0, 20);
  const cleanLevel = (level || 'SMP').trim().slice(0, 20);
  const cleanType = (type || 'school').trim().slice(0, 20);
  const cleanCity = (city || '').trim().slice(0, 50);
  const cleanAddress = (address || '').trim().slice(0, 150);
  const cleanPrincipal = (principal_name || '').trim().slice(0, 80);
  const cleanContact = (contact || '').trim().slice(0, 50);

  await db.prepare(
    'INSERT INTO tc_school (id, name, npsn, level, type, city, address, principal_name, contact, created_at, updated_at) ' +
    'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
  ).bind(id, cleanName, cleanNpsn, cleanLevel, cleanType, cleanCity, cleanAddress, cleanPrincipal, cleanContact, ctx.now, ctx.now).run();

  return jsonResponse({ ok: true, id, name: cleanName }, opt);
}

/* ========================================================================== */
/* POST /api/owner/school/update                                               */
/* ========================================================================== */

export async function routeOwnerSchoolUpdate(ctx) {
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
  const { id, name, npsn, level, type, city, address, principal_name, contact } = body.value || {};
  if (!id || typeof id !== 'string') return jsonError(400, 'school_id_required', {}, opt);

  await db.prepare(
    'UPDATE tc_school SET ' +
    'name = COALESCE(?2, name), ' +
    'npsn = COALESCE(?3, npsn), ' +
    'level = COALESCE(?4, level), ' +
    'type = COALESCE(?5, type), ' +
    'city = COALESCE(?6, city), ' +
    'address = COALESCE(?7, address), ' +
    'principal_name = COALESCE(?8, principal_name), ' +
    'contact = COALESCE(?9, contact), ' +
    'updated_at = ?10 ' +
    'WHERE id = ?1'
  ).bind(id, name || null, npsn || null, level || null, type || null, city || null, address || null, principal_name || null, contact || null, ctx.now).run();

  return jsonResponse({ ok: true, updated: true }, opt);
}

/* ========================================================================== */
/* POST /api/owner/school/delete                                               */
/* ========================================================================== */

export async function routeOwnerSchoolDelete(ctx) {
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
  const { id } = body.value || {};
  if (!id || typeof id !== 'string') return jsonError(400, 'school_id_required', {}, opt);

  const res = await db.prepare('DELETE FROM tc_school WHERE id = ?1').bind(id).run();
  return jsonResponse({ ok: true, deleted: Boolean(res && res.meta && res.meta.changes === 1) }, opt);
}

/* ========================================================================== */
/* GET /api/owner/classes                                                      */
/* ========================================================================== */

export async function routeOwnerClasses(ctx) {
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

  let classes = [];
  try {
    const res = await db.prepare(
      'SELECT c.code, c.title, c.level, c.school_id, c.created_at, s.name AS school_name ' +
      'FROM tc_class c LEFT JOIN tc_school s ON s.id = c.school_id ORDER BY c.created_at DESC LIMIT 200'
    ).all();
    classes = (res && res.results) || [];
  } catch (_) {
    try {
      const res = await db.prepare('SELECT code, title, level, created_at FROM tc_class ORDER BY created_at DESC LIMIT 200').all();
      classes = (res && res.results) || [];
    } catch (_) {}
  }

  return jsonResponse({ ok: true, classes }, opt);
}

/* ========================================================================== */
/* POST /api/owner/class                                                       */
/* ========================================================================== */

export async function routeOwnerClassCreate(ctx) {
  const secretGate = await ownerGate(ctx);
  let ownerSub = 'owner';
  let db = coreDb(ctx.env);
  if (secretGate) {
    const gate = await roleGate(ctx);
    if (!gate.ok) return gate.response;
    ownerSub = gate.sub;
    db = gate.db;
  }
  if (!db) return jsonError(503, 'internal_error', {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);
  await ensureTeacherInviteColumns(db);
  const opt = { headers: ctx.corsHeaders };

  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;
  const { title, level, school_id, code } = body.value || {};
  let classCode = (code || '').toUpperCase().trim();
  if (!classCode || !/^FZ-[A-Z0-9]{4,10}$/.test(classCode)) {
    const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    classCode = `FZ-${rand}`;
  }
  const cleanTitle = (title || 'Kelas').trim().slice(0, 80);
  const cleanLevel = (level || 'SMP').trim().slice(0, 20);
  const cleanSchoolId = (school_id || '').trim().slice(0, 50);

  try {
    await db.prepare(
      'INSERT INTO tc_class (code, teacher_sub, title, level, school_id, created_at, updated_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    ).bind(classCode, ownerSub, cleanTitle, cleanLevel, cleanSchoolId || null, ctx.now, ctx.now).run();
  } catch (_) {
    await db.prepare(
      'INSERT INTO tc_class (code, teacher_sub, title, level, created_at, updated_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(classCode, ownerSub, cleanTitle, cleanLevel, ctx.now, ctx.now).run();
  }

  return jsonResponse({ ok: true, code: classCode, title: cleanTitle, level: cleanLevel, schoolId: cleanSchoolId }, opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher/delete                                              */
/* ========================================================================== */

export async function routeOwnerTeacherDelete(ctx) {
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

  const { sub, handle, mode } = body.value || {};

  if (mode === 'all') {
    // Bersihkan semua akun guru terdaftar (role = 'teacher')
    const tRows = await db.prepare("SELECT sub, login_handle FROM auth_account WHERE role = 'teacher'").all();
    const list = (tRows && tRows.results) || [];
    let deletedCount = 0;
    for (const tc of list) {
      const tcSub = tc.sub;
      const tcHandle = tc.login_handle;
      await db.prepare('DELETE FROM auth_credential WHERE sub = ?1').bind(tcSub).run().catch(() => null);
      if (tcHandle) {
        await db.prepare('DELETE FROM auth_login_handle WHERE sub = ?1 OR handle = ?2').bind(tcSub, tcHandle).run().catch(() => null);
      } else {
        await db.prepare('DELETE FROM auth_login_handle WHERE sub = ?1').bind(tcSub).run().catch(() => null);
      }
      await db.prepare('DELETE FROM teacher_profile WHERE sub = ?1').bind(tcSub).run().catch(() => null);
      await db.prepare('DELETE FROM tc_class_teacher WHERE teacher_sub = ?1').bind(tcSub).run().catch(() => null);
      await db.prepare('DELETE FROM teacher_invite WHERE used_by = ?1').bind(tcSub).run().catch(() => null);
      await db.prepare("UPDATE tc_class SET teacher_sub = 'owner' WHERE teacher_sub = ?1").bind(tcSub).run().catch(() => null);
      await db.prepare('DELETE FROM auth_account WHERE sub = ?1').bind(tcSub).run().catch(() => null);
      deletedCount++;
    }
    return jsonResponse({ ok: true, deletedCount }, opt);
  }

  if (!sub && !handle) {
    return jsonError(400, 'sub_or_handle_required', {}, opt);
  }

  let targetSub = sub || '';
  let targetHandle = handle || '';

  if (!targetSub && targetHandle) {
    const acc = await db.prepare('SELECT sub FROM auth_login_handle WHERE handle = ?1').bind(targetHandle).first();
    if (acc) targetSub = acc.sub;
  }
  if (!targetSub && targetHandle) {
    const acc2 = await db.prepare('SELECT sub FROM auth_account WHERE login_handle = ?1').bind(targetHandle).first();
    if (acc2) targetSub = acc2.sub;
  }
  if (targetSub && !targetHandle) {
    const acc3 = await db.prepare('SELECT login_handle FROM auth_account WHERE sub = ?1').bind(targetSub).first();
    if (acc3) targetHandle = acc3.login_handle;
  }

  if (!targetSub) {
    const pRow = await db.prepare('SELECT sub FROM teacher_profile WHERE sub = ?1').bind(sub).first();
    if (pRow) targetSub = pRow.sub;
  }

  if (!targetSub) {
    return jsonError(404, 'teacher_not_found', {}, opt);
  }

  await db.prepare('DELETE FROM auth_credential WHERE sub = ?1').bind(targetSub).run().catch(() => null);
  if (targetHandle) {
    await db.prepare('DELETE FROM auth_login_handle WHERE sub = ?1 OR handle = ?2').bind(targetSub, targetHandle).run().catch(() => null);
  } else {
    await db.prepare('DELETE FROM auth_login_handle WHERE sub = ?1').bind(targetSub).run().catch(() => null);
  }
  await db.prepare('DELETE FROM teacher_profile WHERE sub = ?1').bind(targetSub).run().catch(() => null);
  await db.prepare('DELETE FROM tc_class_teacher WHERE teacher_sub = ?1').bind(targetSub).run().catch(() => null);
  await db.prepare('DELETE FROM teacher_invite WHERE used_by = ?1').bind(targetSub).run().catch(() => null);
  await db.prepare("UPDATE tc_class SET teacher_sub = 'owner' WHERE teacher_sub = ?1").bind(targetSub).run().catch(() => null);
  await db.prepare('DELETE FROM auth_account WHERE sub = ?1').bind(targetSub).run().catch(() => null);

  return jsonResponse({ ok: true, deleted: true, sub: targetSub, handle: targetHandle }, opt);
}

export const ROUTES = [
  ['POST', '/api/owner/teacher-invite', routeTeacherInviteCreate],
  ['POST', '/api/owner/teacher-invite/revoke', routeTeacherInviteRevoke],
  ['POST', '/api/owner/teacher-invite/update', routeTeacherInviteUpdate],
  ['POST', '/api/owner/teacher-invite/regenerate', routeTeacherInviteRegenerate],
  ['POST', '/api/owner/teacher-invite/delete', routeTeacherInviteDelete],
  ['GET', '/api/owner/teachers', routeOwnerTeachers],
  ['POST', '/api/owner/teacher/delete', routeOwnerTeacherDelete],
  ['GET', '/api/owner/schools', routeOwnerSchools],
  ['POST', '/api/owner/school', routeOwnerSchoolCreate],
  ['POST', '/api/owner/school/update', routeOwnerSchoolUpdate],
  ['POST', '/api/owner/school/delete', routeOwnerSchoolDelete],
  ['GET', '/api/owner/classes', routeOwnerClasses],
  ['POST', '/api/owner/class', routeOwnerClassCreate]
];
