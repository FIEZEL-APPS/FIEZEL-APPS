/**
 * workers/api/auth/gate.js — GERBANG OTORISASI BERSAMA untuk seluruh rute paket
 * akun/peran/konten guru.
 *
 * ==========================================================================
 * KENAPA SATU GERBANG, DAN KENAPA IA MEMBACA PERAN DARI D1 SETIAP KALI
 * ==========================================================================
 * Peran adalah fakta server (lihat auth/role-core.js). Satu-satunya cara
 * menjaganya begitu adalah membacanya dari baris `auth_account` yang dikunci
 * `ctx.identity.sub` — cookie fz_id ber-HMAC yang sudah diverifikasi
 * `mw-identity` — pada SETIAP permintaan berdata. Tidak ada cache peran di sini,
 * dan itu disengaja: peran yang di-cache berarti guru yang dicabut owner tetap
 * memegang izinnya sampai cache kedaluwarsa, dan "sampai kapan" adalah jawaban
 * yang tidak boleh ada dalam pencabutan akses.
 *
 * Harganya satu SELECT ber-PRIMARY-KEY per permintaan berdata. Itu adalah kueri
 * termurah yang bisa dilakukan D1, dan rute paket ini bukan jalur panas
 * (bukan TTS, bukan AI) — jadi harga itu terjangkau di plan gratis.
 *
 * ==========================================================================
 * DUA LAPIS, KEDUANYA WAJIB
 * ==========================================================================
 *   1. `authorizeRoute` (matriks peran <-> kapabilitas) — apakah PERAN ini boleh
 *      menyentuh JENIS data ini sama sekali;
 *   2. penyaringan per-baris di dalam handler (`teacher_sub === sub`) — apakah
 *      BARIS ini miliknya.
 * Lapis 1 tanpa lapis 2 adalah IDOR: setiap guru berperan sah dan bisa membaca
 * konten guru mana pun hanya dengan menebak ID. Lapis 2 tanpa lapis 1 berarti
 * murid mencapai handler guru dan bergantung pada handler itu tidak lupa. Karena
 * itu keduanya ada, dan `tests/role-security-test.js` menguji keduanya terpisah.
 */

import { jsonError, ERR } from '../errors.js';
import { authorizeRoute, normalizeRole, ROLE } from './role-core.js';
import { ensureAuthSchema } from '../auth-schema.js';

/** Binding D1 fiezel-core. Pola yang sama dengan route-social.js. */
export function coreDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * Satu bentuk penolakan untuk SEMUA kegagalan otorisasi paket ini.
 *
 * Membedakan "rute tidak ada" dari "peran salah" dari "baris bukan milikmu" di
 * respons memberi penyerang peta: 404 vs 403 atas ID yang sama memberitahunya ID
 * mana yang benar-benar ada. Jadi ketiganya menjawab 403 `forbidden_role` yang
 * identik, dan detailnya hanya masuk log Worker.
 */
export function denied(ctx) {
  return jsonError(403, 'forbidden_role', {}, { headers: ctx.corsHeaders });
}

export function unauthenticated(ctx) {
  return jsonError(401, ERR.UNAUTHENTICATED, {}, { headers: ctx.corsHeaders });
}

/**
 * roleGate(ctx) -> { ok:true, sub, role, account, db } | { ok:false, response }
 *
 * Urutan pemeriksaannya penting dan tidak boleh ditukar:
 *   identitas -> database -> skema -> akun -> peran -> kapabilitas rute.
 * Identitas lebih dulu karena tanpa subjek tidak ada yang bisa dicari, dan
 * menyentuh D1 untuk permintaan tanpa cookie adalah kerja gratis yang diberikan
 * ke penyerang.
 */
export async function roleGate(ctx) {
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return { ok: false, response: unauthenticated(ctx) };
  }
  const db = coreDb(ctx.env);
  if (!db) return { ok: false, response: denied(ctx) };
  await ensureAuthSchema(db);

  const account = await db
    .prepare('SELECT sub, role, login_handle, status, institution_id FROM auth_account WHERE sub = ?1')
    .bind(ctx.identity.sub)
    .first();

  // Identitas anonim yang belum pernah mendaftar TIDAK diperlakukan sebagai
  // murid. Tanpa baris akun tidak ada peran, dan tanpa peran tidak ada izin —
  // default-ke-learner di titik ini adalah cara paling umum akun hantu lahir.
  if (!account) return { ok: false, response: denied(ctx) };
  if (account.status !== 'active') return { ok: false, response: denied(ctx) };

  const role = normalizeRole(account.role);
  if (!role) return { ok: false, response: denied(ctx) };

  const verdict = authorizeRoute({ role, pathname: ctx.pathname });
  if (!verdict.ok) return { ok: false, response: denied(ctx) };

  return {
    ok: true,
    db,
    sub: account.sub,
    role,
    institutionId: account.institution_id || null,
    account,
    capability: verdict.capability,
    opt: { headers: ctx.corsHeaders }
  };
}

/** Pintasan baca untuk handler guru: pemanggil selalu butuh `viewer`. */
export function viewerOf(gate) {
  return { sub: gate.sub, institutionId: gate.institutionId, role: gate.role };
}

export { ROLE };
