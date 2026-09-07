/**
 * workers/api/route-auth-google.js — `POST /api/auth/google`.
 *
 * Menukar ID token Google dengan SESI FIEZEL. Dua kejadian, satu rute:
 *
 *   A. Akun Google ini SUDAH tertaut  -> MASUK. Cookie diterbitkan ulang untuk
 *      `sub` akun itu. Inilah gunanya login: murid yang ganti perangkat kembali
 *      ke akunnya sendiri, bukan memulai dari nol.
 *   B. Akun Google ini BELUM tertaut  -> TAUTKAN ke `sub` yang sedang dipakai.
 *
 * ==========================================================================
 * `sub` AKUN TIDAK PERNAH BERUBAH
 * ==========================================================================
 * Pada kasus A, `sub` sesi berpindah ke `sub` akun — tetapi `sub` AKUN itu
 * sendiri tidak disentuh. Itu perbedaan yang menentukan: `sub` adalah kunci di
 * 16 tabel (kelas, laporan guru, teman, notifikasi). Menerbitkan sub baru saat
 * login berarti murid menjadi orang asing bagi gurunya.
 *
 * Identitas anonim yang dipegang perangkat sebelum login memang ditinggalkan.
 * Itu benar dan tidak menghilangkan apa pun: progres belajar hidup di PERANGKAT
 * (bab 1), bukan di baris identitas.
 *
 * ==========================================================================
 * KENAPA EMAIL TIDAK PERNAH DIPAKAI MENCARI AKUN
 * ==========================================================================
 * Rute ini TIDAK PERNAH menjalankan `SELECT ... WHERE email = ?`. Pencarian
 * akun hanya lewat `provider_sub`.
 *
 * Kalau login boleh menemukan akun lewat email, maka siapa pun yang menguasai
 * alamat itu masuk ke akun FIEZEL orang lain tanpa tahu kata sandinya — dan
 * alamat sekolah yang dilepas lalu diberikan ke murid baru adalah kejadian
 * biasa. Murid yang sudah punya akun sandi dan ingin memakai Google harus masuk
 * dengan sandinya dulu, lalu menautkan dari Pengaturan. Merepotkan sekali, aman
 * selamanya.
 *
 * `email` DIPANTULKAN kembali ke pemanggil supaya layar bisa berbunyi "kamu
 * masuk sebagai <alamat>". Itu alamat MILIK PEMANGGIL SENDIRI, dari token yang
 * ia kirim sendiri di permintaan yang sama — nol informasi tentang orang lain.
 *
 * ==========================================================================
 * BIAYA: NOL SUBREQUEST PER LOGIN PADA JALUR PANAS
 * ==========================================================================
 * Kunci publik Google (JWKS) di-cache di Cache API — bukan KV. KV plan gratis
 * hanya 1.000 TULIS/hari, dan cache yang menulis tiap kali berputar akan
 * memakan jatah yang dibutuhkan fitur lain. Cache API gratis dan tidak dihitung.
 *
 * Kalau Google sedang tidak bisa dihubungi, salinan basi TETAP dipakai
 * (`stale-if-error`): kunci Google berumur hari, jadi salinan kemarin hampir
 * pasti masih sah — dan login yang mati total saat Google berkedip jauh lebih
 * buruk daripada verifikasi memakai kunci berumur beberapa jam.
 */
import { jsonResponse, jsonError, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';
import { validateShape } from './schema.js';
import { coreDb } from './auth/gate.js';
import { ensureAuthSchema } from './auth-schema.js';
import { attachIdentityCookie, issueAnonIdentity, ensureIdentityRow } from './mw-identity.js';
import {
  verifyGoogleIdToken, GOOGLE_JWKS_URL, GOOGLE_ERR
} from './auth/google-core.js';

export const PROVIDER = 'google';

/** Skema badan. Klien mengirim TOKEN saja — bukan email, bukan sub. */
export const SCHEMA_AUTH_GOOGLE = {
  allow: {
    credential: { type: 'string', max: 4096, required: true },
    nonce: { type: 'string', max: 128 }
  }
};

/* JWKS: 6 jam segar, 7 hari boleh dipakai basi bila Google tak terjangkau. */
const JWKS_FRESH_S = 21600;
const JWKS_STALE_S = 604800;
const JWKS_CACHE_KEY = 'https://fiezel.internal/jwks/google';

/** Salinan dalam-isolate: login beruntun di isolate yang sama tidak menyentuh cache sama sekali. */
let memo = { at: 0, keys: null };

async function fetchJwks(nowMs) {
  if (memo.keys && nowMs - memo.at < JWKS_FRESH_S * 1000) return memo.keys;

  let cache = null;
  try { cache = caches.default; } catch (_) { cache = null; }

  if (cache) {
    try {
      const hit = await cache.match(JWKS_CACHE_KEY);
      if (hit) {
        const body = await hit.json();
        const age = nowMs - Number(body.at || 0);
        if (Array.isArray(body.keys) && age < JWKS_FRESH_S * 1000) {
          memo = { at: nowMs, keys: body.keys };
          return body.keys;
        }
        /* Basi tapi ada: dipakai HANYA kalau pengambilan baru gagal. */
        if (Array.isArray(body.keys) && age < JWKS_STALE_S * 1000) memo = { at: 0, keys: body.keys };
      }
    } catch (_) { /* cache rusak bukan alasan menolak login */ }
  }

  try {
    const res = await fetch(GOOGLE_JWKS_URL, { cf: { cacheTtl: JWKS_FRESH_S } });
    if (res && res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.keys) && data.keys.length) {
        memo = { at: nowMs, keys: data.keys };
        if (cache) {
          try {
            await cache.put(JWKS_CACHE_KEY, new Response(
              JSON.stringify({ at: nowMs, keys: data.keys }),
              { headers: { 'content-type': 'application/json', 'cache-control': 'max-age=' + JWKS_STALE_S } }
            ));
          } catch (_) {}
        }
        return data.keys;
      }
    }
  } catch (_) { /* jatuh ke salinan basi di bawah */ }

  return memo.keys; // bisa null -> penanganan di handler
}

/**
 * Rem laju per identitas, dalam memori isolate. Ada untuk melindungi KUOTA
 * OWNER: satu perangkat yang melempar token berulang tidak boleh menghabiskan
 * subrequest dan tulis D1. Pola dan biayanya sama dengan makeRateLimiter di
 * teacher/class-sync-core.js.
 */
const MIN_INTERVAL_MS = 2000;
const seen = new Map();
function tooFast(key, nowMs) {
  const prev = seen.get(key) || 0;
  if (nowMs - prev < MIN_INTERVAL_MS) return true;
  if (seen.size >= 4000) seen.clear();
  seen.set(key, nowMs);
  return false;
}

export async function routeAuthGoogle(ctx) {
  const opt = { headers: ctx.corsHeaders };

  const body = await readJsonFromCtx(ctx, opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_AUTH_GOOGLE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, opt);

  const clientId = String(ctx.env.GOOGLE_CLIENT_ID || '');
  if (!clientId) return jsonError(503, ERR.UNAVAILABLE, { reason: 'google_not_configured' }, opt);

  const db = coreDb(ctx.env);
  if (!db) return jsonError(503, ERR.UNAVAILABLE, {}, opt);

  if (tooFast(ctx.identity && ctx.identity.sub ? ctx.identity.sub : 'anon', ctx.now)) {
    return jsonError(429, ERR.RATE_LIMITED, {}, opt);
  }

  const keys = await fetchJwks(ctx.now);
  if (!keys) return jsonError(503, ERR.UNAVAILABLE, { reason: 'google_keys_unavailable' }, opt);

  const check = await verifyGoogleIdToken(body.value.credential, {
    clientId, nowMs: ctx.now, keys,
    nonce: body.value.nonce == null ? undefined : body.value.nonce
  });
  if (!check.ok) {
    /* Alasan penolakan DIPANTULKAN apa adanya: seluruhnya tentang token yang
       dikirim klien sendiri, nol informasi tentang akun orang lain. Klien butuh
       tahu bedanya "token kedaluwarsa, coba lagi" dan "aplikasi salah konfigurasi". */
    return jsonError(401, check.error, {}, opt);
  }

  await ensureAuthSchema(db);

  /* Kasus A: akun Google ini sudah tertaut -> MASUK ke akun itu. */
  const link = await db
    .prepare('SELECT sub FROM auth_oauth_identity WHERE provider = ?1 AND provider_sub = ?2')
    .bind(PROVIDER, check.sub)
    .first();

  if (link && link.sub) {
    await ensureIdentityRow(ctx.env, link.sub, ctx.now);
    await attachIdentityCookie(ctx, link.sub);
    await upsertEmail(db, link.sub, check, ctx.now);
    return jsonResponse({
      ok: true, linked: false, signedIn: true, userId: link.sub, email: check.email || null
    }, opt);
  }

  /* Kasus B: menautkan ke identitas yang SEDANG dipakai. Kalau perangkat ini
     belum punya identitas sama sekali, terbitkan dulu — menautkan ke ketiadaan
     akan membuat akun yatim tanpa cookie. */
  if (!(ctx.identity && ctx.identity.verified && ctx.identity.sub)) {
    await issueAnonIdentity(ctx);
  }
  const mySub = ctx.identity.sub;

  /* Satu akun FIEZEL tidak boleh menumpuk dua akun Google. Indeks UNIQUE untuk
     ini ditambahkan bersama rute ini (INDEX_PROOF mengutip kueri di bawah);
     pemeriksaan eksplisit tetap ada supaya jawabannya pesan yang bisa dibaca
     murid, bukan galat batasan basis data. */
  const mine = await db
    .prepare('SELECT provider_sub FROM auth_oauth_identity WHERE sub = ?1 AND provider = ?2')
    .bind(mySub, PROVIDER)
    .first();
  if (mine && mine.provider_sub && mine.provider_sub !== check.sub) {
    return jsonError(409, 'google_account_already_linked', {}, opt);
  }

  await db
    .prepare(
      'INSERT INTO auth_oauth_identity (provider, provider_sub, sub, linked_at) VALUES (?1, ?2, ?3, ?4) ' +
      'ON CONFLICT(provider, provider_sub) DO NOTHING'
    )
    .bind(PROVIDER, check.sub, mySub, ctx.now)
    .run();

  /* Lomba: dua permintaan serentak untuk akun Google yang sama. INSERT kedua
     tidak menulis apa pun, jadi kita baca ulang siapa PEMENANGNYA dan ikuti dia
     — bukan mengira tautan kita berhasil. */
  const after = await db
    .prepare('SELECT sub FROM auth_oauth_identity WHERE provider = ?1 AND provider_sub = ?2')
    .bind(PROVIDER, check.sub)
    .first();
  const ownerSub = (after && after.sub) || mySub;
  if (ownerSub !== mySub) {
    await ensureIdentityRow(ctx.env, ownerSub, ctx.now);
    await attachIdentityCookie(ctx, ownerSub);
  }

  await upsertEmail(db, ownerSub, check, ctx.now);
  return jsonResponse({
    ok: true, linked: ownerSub === mySub, signedIn: true, userId: ownerSub, email: check.email || null
  }, opt);
}

/** Email hanya ditulis kalau Google memberikannya DAN sudah terverifikasi. */
async function upsertEmail(db, sub, check, nowMs) {
  if (!check.email) return;
  await db
    .prepare(
      'INSERT INTO auth_email (sub, email, verified, source, updated_at) VALUES (?1, ?2, 1, ?3, ?4) ' +
      'ON CONFLICT(sub) DO UPDATE SET email = excluded.email, verified = 1, ' +
      'source = excluded.source, updated_at = excluded.updated_at'
    )
    .bind(sub, check.email, PROVIDER, nowMs)
    .run();
}

export const ROUTES = [['POST', '/api/auth/google', routeAuthGoogle]];
export const GOOGLE_ROUTE_ERR = GOOGLE_ERR;
