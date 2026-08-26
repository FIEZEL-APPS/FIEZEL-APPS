/**
 * workers/api/errors.js — bentuk galat & respons JSON tunggal untuk fiezel-api.
 *
 * Kenapa satu berkas untuk ini: frontend FIEZEL hari ini hanya membaca `r.ok`,
 * `data.error`, dan `data.protocol` (cf-a1 §2.d). Kalau setiap handler merakit
 * galatnya sendiri, satu handler akan mengembalikan 400 di tempat yang menurut
 * kontrak Puter harus 413 — dan itu perubahan kontrak yang tidak terlihat di
 * review. Semua bentuk galat karena itu lahir dari SATU tabel di sini.
 *
 * Aturan keras (cf-b2 §5 "Sesi tidak sah"): jawaban 401 SELALU generik.
 * Tidak pernah membedakan "cookie tidak ada" vs "kedaluwarsa" vs "dicabut" vs
 * "tanda tangan salah" — perbedaan itu adalah oracle gratis untuk penyerang.
 *
 * Aturan keras kedua (bab 29 privasi): tidak ada satu pun pesan galat yang
 * memuat nilai masukan klien, isi cookie, uuid, IP, atau pesan galat provider
 * hulu. Detail teknis masuk ke log Worker (observability), bukan ke murid.
 */

// Kode galat kanonik. Nama dipakai apa adanya pada field `error`.
export const ERR = {
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN_ORIGIN: 'forbidden_origin',
  NOT_FOUND: 'not_found',
  METHOD_NOT_ALLOWED: 'method_not_allowed',
  PAYLOAD_TOO_LARGE: 'payload too large',
  BAD_REQUEST: 'bad_request',
  SCHEMA_INVALID: 'schema_invalid',
  CLAIM_INVALID: 'claim_invalid',
  RATE_LIMITED: 'rate_limited',
  UNAVAILABLE: 'unavailable',
  INTERNAL: 'internal_error'
};

/**
 * Respons JSON standar.
 * @param {object} body isi respons (WAJIB sudah bebas PII)
 * @param {{status?:number, headers?:Record<string,string>, cookies?:string[]}} opt
 */
export function jsonResponse(body, opt = {}) {
  const headers = new Headers(opt.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  // API berkredensial tidak boleh pernah tersimpan di cache bersama, dan
  // core-config.js sudah ter-precache service worker: satu respons /api/config
  // yang ter-cache akan membuat kill switch server tidak bisa dipakai.
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  for (const cookie of opt.cookies || []) headers.append('set-cookie', cookie);
  return new Response(JSON.stringify(body), { status: opt.status || 200, headers });
}

/**
 * Galat JSON standar. `extra` hanya boleh berisi field non-sensitif
 * (mis. `retryAfter`, `resetAt`, `fallback`).
 */
export function jsonError(status, error, extra = {}, opt = {}) {
  return jsonResponse({ error, ...extra }, { ...opt, status });
}

// Pintasan yang dipakai berulang; ada supaya status kode tidak pernah salah tulis.
export const unauthenticated = (opt) => jsonError(401, ERR.UNAUTHENTICATED, {}, opt);
export const notFound = (opt) => jsonError(404, ERR.NOT_FOUND, {}, opt);
export const methodNotAllowed = (allow, opt) =>
  jsonError(405, ERR.METHOD_NOT_ALLOWED, {}, {
    ...opt,
    headers: { ...(opt && opt.headers), allow: Array.isArray(allow) ? allow.join(', ') : String(allow) }
  });
// 413, bukan 400 — cermin `requestExceedsLimit` (fiezel-core-worker.js:446).
// Frontend bebas soal teks pesannya, TIDAK bebas soal statusnya (cf-b1 §1.a).
export const payloadTooLarge = (limit, opt) =>
  jsonError(413, ERR.PAYLOAD_TOO_LARGE, { limitBytes: limit }, opt);
export const badRequest = (reason, opt) =>
  jsonError(400, ERR.BAD_REQUEST, reason ? { reason } : {}, opt);
