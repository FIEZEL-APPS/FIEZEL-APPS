/**
 * workers/api/route-account.js — pendaftaran murid, login, logout, profil akun,
 * dan AKTIVASI GURU lewat token undangan owner (§21, §22, §27).
 *
 * ==========================================================================
 * IDENTITAS vs AKUN — DUA LAPIS YANG SUDAH ADA DAN YANG DITAMBAH
 * ==========================================================================
 * FIEZEL sudah punya identitas anonim (`identity`, cookie fz_id ber-HMAC) yang
 * membawa progres murid tanpa pendaftaran. Paket ini TIDAK menggantikannya —
 * ia menambahkan lapis AKUN di atasnya (`auth_account` + `auth_credential`),
 * dikunci `sub` yang SAMA.
 *
 * Akibat yang disengaja dan berharga: murid yang sudah belajar berminggu-minggu
 * secara anonim lalu mendaftar TIDAK kehilangan apa pun, karena `sub`-nya tidak
 * berubah. Membuat sub baru saat pendaftaran akan membuang seluruh bukti
 * belajarnya, dan itu kegagalan migrasi yang paling mahal dan paling tidak
 * terlihat sampai murid pertama mengeluh.
 *
 * ==========================================================================
 * ANTI-ORACLE ENUMERASI AKUN
 * ==========================================================================
 * Login yang gagal SELALU menjawab galat yang sama (`invalid_credentials`),
 * apakah handle-nya tidak ada atau kata sandinya salah. Membedakan keduanya
 * mengubah endpoint login menjadi mesin pencari daftar pengguna.
 *
 * Yang TIDAK bisa disamarkan hanya waktu: handle yang tidak ada menjawab tanpa
 * PBKDF2, handle yang ada menjawab sesudah 210.000 iterasi. Karena itu jalur
 * "tidak ada" tetap menjalankan verifikasi terhadap hash boneka — biayanya sama,
 * jadi selisih waktunya tidak lagi memberi tahu apa pun.
 */

import { jsonResponse, jsonError, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';
import { ensureAuthSchema } from './auth-schema.js';
import { coreDb, roleGate, denied, unauthenticated } from './auth/gate.js';
import { hashPassword, verifyPassword, needsRehash, checkPasswordPolicy } from './auth/password-core.js';
import { ROLE, shellForRole, navigationFor } from './auth/role-core.js';
import { codeWellFormed, hashCode, checkRedeemable, INVITE_PROBLEM } from './auth/invite-core.js';

/**
 * Hash boneka untuk menyamakan biaya jalur "handle tidak ada". Nilainya adalah
 * hash sah atas kata sandi acak yang tidak pernah dipakai siapa pun; ia hanya
 * perlu MEMBUAT PBKDF2 berjalan, bukan menjadi rahasia.
 */
const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Aturan handle: bebas huruf, angka, underscore, titik, spasi, hubung (1-50 karakter). */
const HANDLE_RE = /^[a-z0-9_.\s-]{1,50}$/;

function normalizeHandle(raw) {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').toLowerCase() : '';
}

/**
 * Penahan tebak kata sandi. Kunci sementara per AKUN, bukan per IP: FIEZEL
 * dipakai di warnet dan sekolah tempat puluhan murid berbagi satu IP, dan
 * mengunci per IP di sana akan mengunci seluruh kelas karena satu orang salah
 * ketik. Konsekuensinya jujur: penyerang yang menyasar banyak akun sekaligus
 * tidak tertahan lapisan ini — yang menahannya adalah `rate-anon.js` yang sudah
 * ada di depan seluruh Worker.
 */
const LOCK = Object.freeze({ MAX_FAILED: 8, WINDOW_MS: 15 * 60 * 1000 });

function accountView(account, role) {
  const view = {
    handle: account.login_handle,
    role,
    shell: shellForRole(role),
    navigation: navigationFor(role),
    institutionId: account.institution_id || null
  };
  if (account.teacher_name) view.teacherName = account.teacher_name;
  if (account.institution) view.institution = account.institution;
  if (account.institution_type) view.institutionType = account.institution_type;
  return view;
}

/* ========================================================================== */
/* POST /api/account/register — MURID SAJA                                     */
/* ========================================================================== */

/**
 * Peran hasil pendaftaran publik DIPAKU ke `learner` (§22: tidak ada pendaftaran
 * guru publik). Body TIDAK dibaca untuk peran, dan tidak ada cabang di sini yang
 * bisa menghasilkan peran lain — itulah bentuk penegakan yang tidak bisa
 * dilupakan pembaca berikutnya.
 */
export async function routeAccountRegister(ctx) {
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) return unauthenticated(ctx);
  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.INTERNAL, {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const handle = normalizeHandle(body.value.handle);
  if (!HANDLE_RE.test(handle)) return jsonError(400, 'handle_invalid', {}, opt);

  const problem = checkPasswordPolicy(body.value.password);
  if (problem) return jsonError(400, problem.problem, { min: problem.min || undefined }, opt);

  // Satu identitas = satu akun. Tanpa ini, satu perangkat bisa mencetak akun
  // tanpa batas dan setiap akun membawa jatah kuota AI sendiri.
  const already = await db.prepare('SELECT sub FROM auth_account WHERE sub = ?1').bind(ctx.identity.sub).first();
  if (already) return jsonError(409, 'account_exists', {}, opt);

  const passHash = await hashPassword(body.value.password);
  const now = ctx.now;

  // Klaim handle lewat PRIMARY KEY, bukan read-then-write: dua pendaftaran
  // serentak atas handle yang sama harus kalah satu, dan hanya UNIQUE yang bisa
  // menjaminnya tanpa transaksi lintas pernyataan.
  try {
    await db.prepare('INSERT INTO auth_login_handle (handle, sub) VALUES (?1, ?2)')
      .bind(handle, ctx.identity.sub).run();
  } catch {
    return jsonError(409, 'handle_taken', {}, opt);
  }

  await db.batch([
    db.prepare('INSERT INTO auth_account (sub, role, login_handle, status, created_at) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(ctx.identity.sub, ROLE.LEARNER, handle, 'active', now),
    db.prepare('INSERT INTO auth_credential (sub, pass_hash, updated_at, failed_count) VALUES (?1, ?2, ?3, 0)')
      .bind(ctx.identity.sub, passHash, now)
  ]);

  return jsonResponse({
    ok: true,
    account: accountView({ login_handle: handle, institution_id: null }, ROLE.LEARNER)
  }, opt);
}

/* ========================================================================== */
/* POST /api/account/login                                                     */
/* ========================================================================== */

export async function routeAccountLogin(ctx) {
  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.INTERNAL, {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const handle = normalizeHandle(body.value.handle);
  const password = typeof body.value.password === 'string' ? body.value.password : '';
  const invalid = () => jsonError(401, 'invalid_credentials', {}, opt);

  const account = HANDLE_RE.test(handle)
    ? await db.prepare('SELECT sub, role, login_handle, status, institution_id FROM auth_account ' +
      'WHERE login_handle = ?1').bind(handle).first()
    : null;

  if (!account) {
    // Biaya disamakan dengan jalur akun-ada supaya waktu respons tidak
    // memberitahu penyerang handle mana yang terdaftar.
    await verifyPassword(password || 'x', DUMMY_HASH);
    return invalid();
  }

  const credential = await db
    .prepare('SELECT pass_hash, failed_count, locked_until FROM auth_credential WHERE sub = ?1')
    .bind(account.sub).first();
  if (!credential) { await verifyPassword(password || 'x', DUMMY_HASH); return invalid(); }

  if (credential.locked_until && Number(credential.locked_until) > ctx.now) {
    return jsonError(429, 'account_locked', { retryAfter: Math.ceil((credential.locked_until - ctx.now) / 1000) }, opt);
  }

  const good = await verifyPassword(password, credential.pass_hash);
  if (!good) {
    const failed = (Number(credential.failed_count) || 0) + 1;
    await db.prepare('UPDATE auth_credential SET failed_count = ?2, locked_until = ?3 WHERE sub = ?1')
      .bind(account.sub, failed, failed >= LOCK.MAX_FAILED ? ctx.now + LOCK.WINDOW_MS : null)
      .run();
    return invalid();
  }
  if (account.status !== 'active') return denied(ctx);

  // Hitungan gagal direset, dan hash di-upgrade kalau parameternya sudah usang.
  // Titik ini adalah SATU-SATUNYA saat kata sandi mentah ada di memori, jadi
  // ia juga satu-satunya saat rehash bisa dilakukan tanpa mengganggu murid.
  const writes = [db.prepare('UPDATE auth_credential SET failed_count = 0, locked_until = NULL WHERE sub = ?1')
    .bind(account.sub)];
  if (needsRehash(credential.pass_hash)) {
    writes.push(db.prepare('UPDATE auth_credential SET pass_hash = ?2, updated_at = ?3 WHERE sub = ?1')
      .bind(account.sub, await hashPassword(password), ctx.now));
  }
  writes.push(db.prepare('UPDATE auth_account SET last_login_at = ?2 WHERE sub = ?1')
    .bind(account.sub, ctx.now));
  await db.batch(writes);

  // Tujuan sesudah login DITENTUKAN SERVER dari peran (§27). Klien tidak
  // mengirim "mau ke mana", jadi tidak ada yang bisa meminta dasbor guru.
  return jsonResponse({ ok: true, account: accountView(account, account.role) }, opt);
}

/* ========================================================================== */
/* POST /api/account/logout                                                    */
/* ========================================================================== */

/**
 * Logout MENGAKHIRI SESI, bukan identitas. Cookie fz_id sengaja dipertahankan:
 * ia adalah pembawa progres anonim (bab 8 menuntutnya bertahan terhadap
 * `localStorage.clear()`), dan membuangnya di sini akan membuat "keluar akun"
 * diam-diam berarti "buang seluruh riwayat belajar".
 */
export async function routeAccountLogout(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  await gate.db.prepare('UPDATE session SET revoked_at = ?2 WHERE sub = ?1 AND revoked_at IS NULL')
    .bind(gate.sub, ctx.now).run()
    .catch(() => null); // tabel session milik paket identitas; ketiadaannya bukan galat logout
  return jsonResponse({ ok: true }, gate.opt);
}

/* ========================================================================== */
/* GET /api/account/me                                                         */
/* ========================================================================== */

export async function routeAccountMe(ctx) {
  const gate = await roleGate(ctx);
  if (!gate.ok) return gate.response;
  let accountData = gate.account;
  if (gate.role === 'teacher') {
    const tp = await gate.db
      .prepare('SELECT teacher_name, institution, institution_type FROM teacher_profile WHERE sub = ?1')
      .bind(gate.sub)
      .first()
      .catch(() => null);
    if (tp) {
      accountData = {
        ...gate.account,
        teacher_name: tp.teacher_name,
        institution: tp.institution,
        institution_type: tp.institution_type
      };
    }
  }
  return jsonResponse({ account: accountView(accountData, gate.role) }, gate.opt);
}

/* ========================================================================== */
/* POST /api/account/teacher-activate                                          */
/* ========================================================================== */

/**
 * SATU-SATUNYA jalur di seluruh Worker yang bisa menghasilkan akun berperan
 * `teacher` (§22). Kalau pembaca berikutnya menambahkan jalur kedua, gerbang
 * `role-security-test.js` akan merah — ia menghitung berapa tempat yang menulis
 * peran guru ke D1.
 *
 * Pemakaian token adalah UPDATE ATOMIK ber-`WHERE used_at IS NULL`. Bukan
 * baca-lalu-tulis: dua aktivasi serentak dengan token yang sama harus menyisakan
 * tepat satu pemenang, dan hanya gerbang atomik di dalam satu pernyataan yang
 * bisa menjaminnya di D1 (pola yang sama dengan reservasi kuota).
 */
export async function routeTeacherActivate(ctx) {
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) return unauthenticated(ctx);
  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.INTERNAL, {}, { headers: ctx.corsHeaders });
  await ensureAuthSchema(db);

  const opt = { headers: ctx.corsHeaders };
  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;

  const code = body.value.code;
  // Bentuk diperiksa SEBELUM menyentuh D1: token asal-asalan tidak boleh
  // membelanjakan satu baca pun dari anggaran plan gratis.
  if (!codeWellFormed(code)) return jsonError(400, INVITE_PROBLEM.CODE_MALFORMED, {}, opt);

  const codeHash = await hashCode(code);
  const invite = await db.prepare(
    'SELECT code_hash, teacher_name, institution, institution_type, expires_at, used_at, revoked_at ' +
    'FROM teacher_invite WHERE code_hash = ?1'
  ).bind(codeHash).first();

  const verdict = checkRedeemable(invite, ctx.now, codeHash);
  // Token tak ada, kedaluwarsa, terpakai, dan dicabut menjawab hal yang SAMA:
  // membedakannya memberi tahu penyerang bahwa tebakannya "hampir benar".
  if (verdict) return jsonError(403, 'invite_unusable', {}, opt);

  const institutionId = codeHash.slice(0, 16);
  const existingAccount = await db.prepare(
    'SELECT sub, role, login_handle, status, institution_id FROM auth_account WHERE sub = ?1'
  ).bind(ctx.identity.sub).first();

  if (existingAccount) {
    if (existingAccount.role === ROLE.TEACHER) {
      return jsonError(409, 'already_teacher', {}, opt);
    }
    // Murid aktif mengaktifkan token guru: pemakaian token atomik, peran di-upgrade.
    const claimed = await db.prepare(
      'UPDATE teacher_invite SET used_at = ?2, used_by = ?3 WHERE code_hash = ?1 AND used_at IS NULL ' +
      'AND revoked_at IS NULL AND expires_at > ?2'
    ).bind(codeHash, ctx.now, ctx.identity.sub).run();

    if (!claimed || !claimed.meta || claimed.meta.changes !== 1) {
      return jsonError(403, 'invite_unusable', {}, opt);
    }

    await db.batch([
      db.prepare('UPDATE auth_account SET role = ?2, institution_id = ?3 WHERE sub = ?1 AND role = ?4')
        .bind(ctx.identity.sub, ROLE.TEACHER, institutionId, ROLE.LEARNER),
      db.prepare('INSERT INTO teacher_profile (sub, teacher_name, institution, institution_type, ' +
        'institution_id, activated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(ctx.identity.sub, invite.teacher_name, invite.institution, invite.institution_type,
          institutionId, ctx.now)
    ]);

    return jsonResponse({
      ok: true,
      account: accountView({
        login_handle: existingAccount.login_handle,
        institution_id: institutionId,
        teacher_name: invite.teacher_name,
        institution: invite.institution,
        institution_type: invite.institution_type
      }, ROLE.TEACHER)
    }, { headers: ctx.corsHeaders });
  }

  // Belum punya akun: jika handle/password tidak disertakan, otomatis diturunkan dari token guru
  let handle = normalizeHandle(body.value && body.value.handle);
  let rawPassword = body.value && body.value.password;

  if (!handle && !rawPassword) {
    const rawName = typeof invite.teacher_name === 'string' ? invite.teacher_name.trim().toLowerCase() : '';
    const cleanName = rawName.replace(/[^a-z0-9_]/g, '').slice(0, 14);
    const prefix = cleanName.length >= 2 ? cleanName : 'guru';
    handle = `${prefix}_${codeHash.slice(0, 6)}`;
    rawPassword = `fz_teacher_${codeHash.slice(0, 20)}`;
  } else {
    if (!HANDLE_RE.test(handle)) return jsonError(400, 'handle_invalid', {}, opt);
    const problem = checkPasswordPolicy(rawPassword);
    if (problem) return jsonError(400, problem.problem, {}, opt);
  }

  const claimed = await db.prepare(
    'UPDATE teacher_invite SET used_at = ?2, used_by = ?3 WHERE code_hash = ?1 AND used_at IS NULL ' +
    'AND revoked_at IS NULL AND expires_at > ?2'
  ).bind(codeHash, ctx.now, ctx.identity.sub).run();

  // `meta.changes === 0` berarti token dipakai orang lain di antara baca dan
  // tulis. Ini BUKAN kondisi mustahil — ia persis yang terjadi kalau token
  // dibagikan ke dua orang — dan menjawabnya sebagai sukses akan mencetak dua guru.
  if (!claimed || !claimed.meta || claimed.meta.changes !== 1) {
    return jsonError(403, 'invite_unusable', {}, opt);
  }

  try {
    await db.prepare('INSERT INTO auth_login_handle (handle, sub) VALUES (?1, ?2)')
      .bind(handle, ctx.identity.sub).run();
  } catch {
    // Token sudah terbakar tetapi handle bentrok. Token DIKEMBALIKAN supaya guru
    // bisa mencoba lagi dengan handle lain — token sekali pakai yang hangus
    // karena bentrok nama adalah kegagalan yang menimpakan biaya ke owner.
    await db.prepare('UPDATE teacher_invite SET used_at = NULL, used_by = NULL WHERE code_hash = ?1 AND used_by = ?2')
      .bind(codeHash, ctx.identity.sub).run();
    return jsonError(409, 'handle_taken', {}, opt);
  }

  const passHash = await hashPassword(rawPassword);

  await db.batch([
    db.prepare('INSERT INTO auth_account (sub, role, login_handle, status, created_at, institution_id) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(ctx.identity.sub, ROLE.TEACHER, handle, 'active', ctx.now, institutionId),
    db.prepare('INSERT INTO auth_credential (sub, pass_hash, updated_at, failed_count) VALUES (?1, ?2, ?3, 0)')
      .bind(ctx.identity.sub, passHash, ctx.now),
    db.prepare('INSERT INTO teacher_profile (sub, teacher_name, institution, institution_type, ' +
      'institution_id, activated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(ctx.identity.sub, invite.teacher_name, invite.institution, invite.institution_type,
        institutionId, ctx.now)
  ]);

  return jsonResponse({
    ok: true,
    account: accountView({
      login_handle: handle,
      institution_id: institutionId,
      teacher_name: invite.teacher_name,
      institution: invite.institution,
      institution_type: invite.institution_type
    }, ROLE.TEACHER)
  }, { headers: ctx.corsHeaders });
}

export const ROUTES = [
  ['POST', '/api/account/register', routeAccountRegister],
  ['POST', '/api/account/login', routeAccountLogin],
  ['POST', '/api/account/logout', routeAccountLogout],
  ['GET', '/api/account/me', routeAccountMe],
  ['POST', '/api/account/teacher-activate', routeTeacherActivate]
];
