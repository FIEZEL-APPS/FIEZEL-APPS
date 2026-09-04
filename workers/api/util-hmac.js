/**
 * workers/api/util-hmac.js — HMAC-SHA256 + base64url di atas WebCrypto.
 *
 * TANPA dependency: `crypto.subtle` sudah ada di runtime Workers
 * (https://developers.cloudflare.com/workers/runtime-apis/web-crypto/), dan
 * `btoa`/`atob` juga global. Menambah paket npm untuk ini akan menambah build
 * step ke jalur deploy repo yang hari ini nol-dependency.
 *
 * CATATAN PLAN GRATIS (keputusan owner 27 Agu 2026): CPU 10 ms/request.
 * Satu verifikasi HMAC-SHA256 atas payload ~120 byte jauh di bawah 1 ms, TAPI
 * `crypto.subtle.importKey` yang diulang tiap request adalah pemborosan nyata.
 * Karena itu kunci di-cache pada level modul (per-isolate, hidup selama isolate
 * hidup, tidak pernah dipersistensi). Kalau nanti profil CPU menunjukkan
 * verifikasi ini yang menembus 10 ms, itu WAJIB dilaporkan ke owner dengan
 * angka — bukan diselesaikan dengan diam-diam mengandaikan Workers Paid.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

// Cache kunci per-isolate. Kunci peta adalah string secret; nilainya CryptoKey
// non-extractable. Tidak ada secret yang keluar dari modul ini.
const keyCache = new Map();

export function b64urlFromBytes(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function bytesFromB64url(text) {
  const padded = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export const b64urlFromString = (text) => b64urlFromBytes(enc.encode(text));
export const stringFromB64url = (text) => dec.decode(bytesFromB64url(text));

async function hmacKey(secret) {
  if (!secret || typeof secret !== 'string') throw new Error('hmac_secret_missing');
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  keyCache.set(secret, key);
  return key;
}

/** Tanda tangan base64url atas `message`. */
export async function hmacSign(secret, message) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return b64urlFromBytes(new Uint8Array(sig));
}

/**
 * Verifikasi tanda tangan base64url.
 * Memakai `crypto.subtle.verify`, BUKAN perbandingan string: perbandingan string
 * biasa membocorkan panjang prefiks yang cocok lewat waktu eksekusi.
 * Tanda tangan yang rusak/bukan base64 mengembalikan false, tidak melempar —
 * cookie rusak adalah kejadian normal (rotasi secret, cookie potong), bukan bug.
 */
export async function hmacVerify(secret, message, signatureB64url) {
  try {
    const key = await hmacKey(secret);
    return await crypto.subtle.verify('HMAC', key, bytesFromB64url(signatureB64url), enc.encode(message));
  } catch {
    return false;
  }
}

/** Hash heksadesimal ber-pepper — dipakai untuk `legacy_ref_hmac`, `ip_hmac`. */
export async function hmacHex(secret, message) {
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  let hex = '';
  for (let i = 0; i < sig.length; i += 1) hex += sig[i].toString(16).padStart(2, '0');
  return hex;
}

/** Potong hash jadi 128 bit — bentuk yang dipakai kontrak analytics privasi-maksimal. */
export const truncate128 = (hex) => String(hex).slice(0, 32);

/**
 * Pemilih secret berdasarkan `kid`. Dua secret aktif (current + previous) supaya
 * rotasi secret TIDAK melogout semua murid (cf-b2 §1.2). `kid` yang tidak
 * dikenal ditolak — bukan di-fallback ke current, karena itu akan membuat
 * cookie palsu ber-`kid` acak diperiksa dengan secret yang sah.
 */
export function secretForKid(env, kid) {
  if (kid === 2) return env.SESSION_HMAC_KEY_CURRENT || null;
  if (kid === 1) return env.SESSION_HMAC_KEY_PREVIOUS || null;
  return null;
}

export const CURRENT_KID = 2;
