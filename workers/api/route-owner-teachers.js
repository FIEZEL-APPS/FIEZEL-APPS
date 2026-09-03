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
import { roleGate } from './auth/gate.js';
import { ownerGate } from './cron-status.js';
import { mintInvite, publicInviteView, checkInviteInput, hashCode, codeWellFormed } from './auth/invite-core.js';

/* ========================================================================== */
/* POST /api/owner/teacher-invite                                              */
/* ========================================================================== */

export async function routeTeacherInviteCreate(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const secretGate = await ownerGate(ctx);
  if (secretGate) return secretGate;

  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const problem = checkInviteInput(body.value);
  if (problem) return jsonError(400, problem.problem, {}, gate.opt);

  const minted = await mintInvite({ ...body.value, ownerSub: gate.sub }, ctx.now);
  const r = minted.record;
  await gate.db.prepare(
    'INSERT INTO teacher_invite (code_hash, teacher_name, institution, institution_type, '
    + 'created_at, expires_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
  ).bind(r.code_hash, r.teacher_name, r.institution, r.institution_type,
    r.created_at, r.expires_at, r.created_by).run();

  // Teks token muncul DI SINI DAN HANYA DI SINI, dalam satu respons yang owner
  // lihat sekali. Tidak ada endpoint yang bisa menampilkannya lagi, karena D1
  // hanya memegang hash-nya. Owner yang kehilangan token mencetak yang baru.
  return jsonResponse({
    code: minted.code,
    invite: publicInviteView(r, ctx.now),
    notice: 'once_only'
  }, gate.opt);
}

/* ========================================================================== */
/* POST /api/owner/teacher-invite/revoke                                       */
/* ========================================================================== */

export async function routeTeacherInviteRevoke(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  const secretGate = await ownerGate(ctx);
  if (secretGate) return secretGate;

  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  // Owner mencabut dengan MENGETIK ULANG token dari catatannya, karena itulah
  // satu-satunya pengenal yang ia punya (kita tidak menyimpan teksnya). Alternatif
  // "cabut berdasarkan nama guru" akan salah sasaran saat satu nama punya dua token.
  if (!codeWellFormed(body.value.code)) return jsonError(400, 'invite_code_malformed', {}, gate.opt);
  const codeHash = await hashCode(body.value.code);

  const result = await gate.db.prepare(
    'UPDATE teacher_invite SET revoked_at = ?2 WHERE code_hash = ?1 AND revoked_at IS NULL'
  ).bind(codeHash, ctx.now).run();

  // Token yang tidak ada dan token yang sudah dicabut menjawab sama: owner tidak
  // butuh membedakannya, dan endpoint yang membedakannya bisa dipakai menguji
  // keberadaan token oleh siapa pun yang berhasil melewati kedua gerbang.
  const changed = Boolean(result && result.meta && result.meta.changes === 1);
  return jsonResponse({ ok: true, revoked: changed }, gate.opt);
}

/* ========================================================================== */
/* GET /api/owner/teachers                                                     */
/* ========================================================================== */

/**
 * Daftar guru + undangan. Yang TIDAK keluar: `code_hash` (bahan uji tebakan
 * offline) dan seluruh konten milik guru. Owner mengelola GURU, bukan membaca
 * bank soal mereka — itulah sebabnya peran owner tidak memegang kapabilitas
 * `teacher:*` (lihat "kenapa tidak ada hierarki" di auth/role-core.js).
 */
export async function routeOwnerTeachers(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;

  const invites = await gate.db.prepare(
    'SELECT code_hash, teacher_name, institution, institution_type, created_at, expires_at, '
    + 'used_at, revoked_at FROM teacher_invite ORDER BY created_at DESC LIMIT 200'
  ).all();

  const teachers = await gate.db.prepare(
    'SELECT p.teacher_name, p.institution, p.institution_type, p.activated_at, a.login_handle, a.status '
    + 'FROM teacher_profile p JOIN auth_account a ON a.sub = p.sub ORDER BY p.activated_at DESC LIMIT 200'
  ).all();

  return jsonResponse({
    invites: ((invites && invites.results) || []).map((row) => publicInviteView(row, ctx.now)),
    teachers: ((teachers && teachers.results) || []).map((row) => ({
      handle: row.login_handle,
      teacherName: row.teacher_name,
      institution: row.institution,
      institutionType: row.institution_type,
      status: row.status,
      activatedAt: Number(row.activated_at) || 0
    }))
  }, gate.opt);
}

export const ROUTES = [
  ['POST', '/api/owner/teacher-invite', routeTeacherInviteCreate],
  ['POST', '/api/owner/teacher-invite/revoke', routeTeacherInviteRevoke],
  ['GET', '/api/owner/teachers', routeOwnerTeachers]
];
