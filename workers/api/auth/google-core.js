/**
 * workers/api/auth/google-core.js — VERIFIKASI ID TOKEN GOOGLE.
 *
 * ==========================================================================
 * KENAPA SELURUHNYA DIVERIFIKASI DI SERVER
 * ==========================================================================
 * Klien mengirim satu string: ID token dari Google Identity Services. Ia TIDAK
 * mengirim email, tidak mengirim nama, tidak mengirim id akun. Semua itu dibaca
 * server DARI TOKEN yang tanda tangannya sudah diperiksa.
 *
 * Kalau klien boleh mengirim `{sub}` atau `{email}` mentah, siapa pun bisa
 * mengklaim akun orang lain hanya dengan mengetik alamatnya. Ini kelas
 * kerentanan yang sama dengan yang sudah ditulis panjang di kepala
 * route-auth.js untuk jalur Puter — dan alasan jalur itu memakai tiket HMAC,
 * bukan uuid. Google memberi kita sesuatu yang lebih baik daripada tiket buatan
 * sendiri: token bertanda tangan RS256 yang kuncinya publik dan bisa diperiksa
 * siapa saja. Jadi kita periksa.
 *
 * ==========================================================================
 * ENAM PEMERIKSAAN, SEMUANYA WAJIB
 * ==========================================================================
 *   1. Bentuk: tiga bagian base64url, header+payload JSON objek.
 *   2. alg === 'RS256'. Token ber-`alg:none` atau HS256 DITOLAK sebelum
 *      menyentuh kunci — "algorithm confusion" adalah cara klasik memalsukan
 *      JWT terhadap verifier yang mempercayai header.
 *   3. Tanda tangan sah terhadap kunci publik Google yang `kid`-nya cocok.
 *   4. `iss` ∈ {accounts.google.com, https://accounts.google.com} — Google
 *      menerbitkan keduanya, keduanya sah, selain itu tidak.
 *   5. `aud` === GOOGLE_CLIENT_ID milik kita. Tanpa ini, token yang sah untuk
 *      aplikasi ORANG LAIN bisa dipakai masuk ke FIEZEL.
 *   6. `exp` belum lewat dan `iat` tidak di masa depan (toleransi jam 60 s).
 *
 * Plus `nonce` bila pemanggil memintanya: pengikat satu token ke satu percobaan
 * login, supaya token yang tercuri dari log tidak bisa diputar ulang.
 *
 * ==========================================================================
 * YANG SENGAJA TIDAK DIAMBIL DARI TOKEN
 * ==========================================================================
 * `name`, `picture`, `given_name`, `family_name`, `locale` ADA di dalam token
 * dan sengaja TIDAK dibaca. FIEZEL dipakai anak-anak; yang tidak dibutuhkan
 * tidak dikumpulkan. Yang dipakai hanya `sub` (kunci tautan) dan `email`
 * (keputusan owner 6 Sep 2026: menghubungi orang tua/sekolah).
 *
 * `email` TIDAK PERNAH menjadi kunci identitas — lihat kepala migrasi 0013.
 */

/** Penerbit yang sah. Google memakai keduanya. */
export const GOOGLE_ISSUERS = Object.freeze(['accounts.google.com', 'https://accounts.google.com']);

/** Alamat kunci publik Google. */
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/** Toleransi jam (detik) untuk `iat` di masa depan. */
export const CLOCK_SKEW_S = 60;

/** Umur token terpanjang yang diterima (detik). Google menerbitkan 1 jam. */
export const MAX_TOKEN_AGE_S = 3600;

export const GOOGLE_ERR = Object.freeze({
  MALFORMED: 'google_token_malformed',
  ALG: 'google_token_alg',
  KEY: 'google_token_key_unknown',
  SIGNATURE: 'google_token_signature',
  ISSUER: 'google_token_issuer',
  AUDIENCE: 'google_token_audience',
  EXPIRED: 'google_token_expired',
  NOT_YET: 'google_token_not_yet_valid',
  TOO_OLD: 'google_token_too_old',
  NONCE: 'google_token_nonce',
  NO_SUB: 'google_token_no_sub',
  EMAIL_UNVERIFIED: 'google_email_unverified'
});

const dec = new TextDecoder();

function bytesFromB64url(text) {
  const pad = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function jsonFromB64url(text) {
  try {
    const value = JSON.parse(dec.decode(bytesFromB64url(text)));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch (_) { return null; }
}

/**
 * Pisahkan token tanpa memverifikasi apa pun. Dipakai verifier di bawah DAN
 * gerbang; ia TIDAK BOLEH dipakai rute untuk membaca klaim — klaim yang belum
 * diverifikasi adalah masukan penyerang.
 */
export function decodeGoogleToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const header = jsonFromB64url(parts[0]);
  const payload = jsonFromB64url(parts[1]);
  if (!header || !payload) return null;
  return { header, payload, signingInput: parts[0] + '.' + parts[1], signature: parts[2] };
}

/** Normalisasi email: potong spasi, huruf kecil. Google sudah menormalkannya, ini sabuk kedua. */
export function normalizeEmail(raw) {
  const value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (value.length < 3 || value.length > 254) return null;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value)) return null;
  return value;
}

/**
 * verifyGoogleIdToken(token, opts) -> { ok:true, sub, email, emailVerified }
 *                                   | { ok:false, error }
 *
 * opts = { clientId, nowMs, keys, nonce? }
 *   keys  = daftar JWK dari GOOGLE_JWKS_URL (dipasok pemanggil, supaya fungsi
 *           ini tidak pernah menyentuh jaringan dan bisa diuji penuh).
 *   nonce = bila diberikan, klaim `nonce` token WAJIB sama persis.
 */
export async function verifyGoogleIdToken(token, opts) {
  const o = opts || {};
  const decoded = decodeGoogleToken(token);
  if (!decoded) return { ok: false, error: GOOGLE_ERR.MALFORMED };

  const { header, payload, signingInput, signature } = decoded;

  // (2) alg diperiksa SEBELUM kunci disentuh.
  if (header.alg !== 'RS256') return { ok: false, error: GOOGLE_ERR.ALG };

  // (3) kunci publik yang kid-nya cocok.
  const keys = Array.isArray(o.keys) ? o.keys : [];
  const jwk = keys.filter((k) => k && k.kid === header.kid && k.kty === 'RSA')[0];
  if (!jwk) return { ok: false, error: GOOGLE_ERR.KEY };

  let valid = false;
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      bytesFromB64url(signature),
      new TextEncoder().encode(signingInput)
    );
  } catch (_) { valid = false; }
  if (!valid) return { ok: false, error: GOOGLE_ERR.SIGNATURE };

  // (4) penerbit.
  if (GOOGLE_ISSUERS.indexOf(String(payload.iss)) === -1) {
    return { ok: false, error: GOOGLE_ERR.ISSUER };
  }

  // (5) audiens = aplikasi KITA. Token untuk aplikasi lain tidak berlaku di sini.
  if (!o.clientId || String(payload.aud) !== String(o.clientId)) {
    return { ok: false, error: GOOGLE_ERR.AUDIENCE };
  }

  // (6) umur.
  const nowS = Math.floor(Number(o.nowMs || Date.now()) / 1000);
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  if (!Number.isFinite(exp) || exp <= nowS) return { ok: false, error: GOOGLE_ERR.EXPIRED };
  if (!Number.isFinite(iat) || iat > nowS + CLOCK_SKEW_S) {
    return { ok: false, error: GOOGLE_ERR.NOT_YET };
  }
  /* Token bertanda tangan sah TAPI berumur panjang tetap ditolak: satu token
     yang bocor tidak boleh menjadi kunci permanen. Pola yang sama dipakai
     jalur klaim Puter (CLAIM_TICKET_MAX_AGE_S). */
  if (nowS - iat > MAX_TOKEN_AGE_S) return { ok: false, error: GOOGLE_ERR.TOO_OLD };

  // nonce, bila pemanggil mengikat percobaan login.
  if (o.nonce != null && String(payload.nonce || '') !== String(o.nonce)) {
    return { ok: false, error: GOOGLE_ERR.NONCE };
  }

  const sub = String(payload.sub || '');
  if (!sub || sub.length > 64) return { ok: false, error: GOOGLE_ERR.NO_SUB };

  /* Email yang BELUM diverifikasi Google ditolak. Alamat yang belum terbukti
     milik pemegang akun tidak berguna untuk menghubungi orang tua, dan berbahaya
     kalau dipercaya. */
  const email = normalizeEmail(payload.email);
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (email && !emailVerified) return { ok: false, error: GOOGLE_ERR.EMAIL_UNVERIFIED };

  return { ok: true, sub, email: email || null, emailVerified: !!email };
}
