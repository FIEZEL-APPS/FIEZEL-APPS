/**
 * workers/api/mw-guard.js — CORS ketat + cap byte + parsing terbatas.
 *
 * Dua lapisan berbeda yang tinggal di satu berkas karena keduanya adalah
 * "penjaga pintu" dan urutannya saling terkait:
 *
 * [0] CORS  — paling luar. Respons GALAT pun butuh header CORS; tanpa itu
 *             browser menampilkan "network error" alih-alih pesan FIEZEL yang
 *             sudah dirancang (bab 12: jangan pernah galat mentah ke murid).
 * [7] cap byte + parse — sesudah identitas. `JSON.parse` 100 KB adalah CPU, dan
 *             CPU adalah anggaran paling langka di PLAN GRATIS (10 ms/request).
 *             Cek `Content-Length` murah dilakukan lebih dulu, TANPA membaca body.
 *
 * CORS di sini SENGAJA berbeda dari `workers/fiezel-audio-worker.js` yang
 * memakai `*`. `*` benar untuk aset audio publik dan ILEGAL bersama
 * `Access-Control-Allow-Credentials: true`. API berkredensial wajib allowlist
 * eksplisit + `Vary: Origin`, bukan pantulan `Origin` apa pun.
 */

import { byteLimitFor } from './schema.js';
import { jsonError, payloadTooLarge, badRequest, ERR } from './errors.js';

export function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(env, origin) {
  if (!origin) return true; // permintaan non-browser / same-origin tanpa Origin
  return allowedOrigins(env).includes(origin);
}

/**
 * Header CORS untuk origin yang sudah lolos allowlist.
 * `Vary: Origin` wajib: tanpa itu, cache bersama bisa menyajikan header
 * `Access-Control-Allow-Origin` milik origin lain.
 */
export function corsHeaders(env, origin) {
  const headers = { vary: 'Origin' };
  if (origin && isAllowedOrigin(env, origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
  }
  return headers;
}

/** Preflight. Dijawab cepat, tanpa menyentuh D1/KV/AI. */
export function preflightResponse(env, request) {
  const origin = request.headers.get('origin');
  if (!isAllowedOrigin(env, origin)) {
    return jsonError(403, ERR.FORBIDDEN_ORIGIN, {}, { headers: { vary: 'Origin' } });
  }
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(env, origin),
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400'
    }
  });
}

/**
 * Gerbang origin untuk request sungguhan (bukan preflight).
 * Origin asing ditolak 403 SEBELUM identitas dibaca, sebelum body disentuh:
 * situs pihak ketiga tidak boleh bisa memancing penerbitan identitas atas nama
 * murid, dan tidak boleh bisa membakar CPU kita.
 */
export function originGate(env, request) {
  const origin = request.headers.get('origin');
  if (isAllowedOrigin(env, origin)) return null;
  return jsonError(403, ERR.FORBIDDEN_ORIGIN, {}, { headers: { vary: 'Origin' } });
}

/**
 * Cap byte berdasarkan `Content-Length`, TANPA membaca body.
 * Cermin `requestExceedsLimit` Worker Puter (fiezel-core-worker.js:446):
 * 413, bukan 400.
 */
export function contentLengthGate(request, limit, opt) {
  const raw = request.headers.get('content-length');
  if (raw === null) return null;
  const len = Number(raw);
  if (!Number.isFinite(len) || len < 0) return badRequest('bad_content_length', opt);
  if (len > limit) return payloadTooLarge(limit, opt);
  return null;
}

/** Metode yang boleh membawa body. GET/HEAD/OPTIONS tidak pernah dibaca. */
export function mayHaveBody(method) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

/**
 * Baca body sebagai teks dengan cap byte yang ditegakkan SAMBIL membaca.
 *
 * Kenapa streaming, bukan `await request.text()` lalu diukur: `.text()` menarik
 * SELURUH body ke memori dulu. Body 50 MB tetap 50 MB CPU + memori sebelum kita
 * sempat menolaknya, dan itu tepat serangan yang paling murah bagi penyerang di
 * PLAN GRATIS. Dengan membaca per-chunk dan membatalkan stream begitu ambang
 * lewat, biaya penolakan tetap sebesar cap-nya.
 *
 * `Content-Length` diperiksa lebih dulu karena gratis, tapi TIDAK dipercaya:
 * header itu boleh tidak ada (chunked) dan boleh bohong.
 *
 * Batas diukur pada byte UTF-8 nyata, bukan `String.length` — satu emoji 4 byte
 * akan lolos kalau diukur dengan panjang string.
 */
export async function readTextLimited(request, limit, opt) {
  const early = contentLengthGate(request, limit, opt);
  if (early) return { ok: false, response: early };
  if (!request.body) return { ok: true, text: '', bytes: 0 };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    /* eslint-disable no-await-in-loop */
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      try { await reader.cancel(); } catch { /* stream sudah tertutup: tidak penting */ }
      return { ok: false, response: payloadTooLarge(limit, opt) };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return { ok: true, text: new TextDecoder().decode(merged), bytes: total };
}

/** Body JSON terbatas. Body kosong dianggap `{}` (kontrak `POST {}` di cf-b1 §1.b). */
export async function readJsonLimited(request, limit, opt) {
  const read = await readTextLimited(request, limit, opt);
  if (!read.ok) return read;
  if (!read.text) return { ok: true, value: {} };
  try {
    return { ok: true, value: JSON.parse(read.text) };
  } catch {
    return { ok: false, response: badRequest('invalid_json', opt) };
  }
}

/**
 * Versi sadar-konteks. WAJIB dipakai handler, bukan `readJsonLimited(ctx.request…)`
 * langsung: kalau `Content-Length` tidak ada, `guardMiddleware` sudah menghabiskan
 * stream body untuk menegakkan cap, dan membaca ulang `request` akan memberi
 * string kosong (bug yang sangat sulit dilihat, karena hanya muncul pada klien
 * yang mengirim chunked).
 */
export async function readJsonFromCtx(ctx, opt) {
  if (typeof ctx.bodyText === 'string') {
    if (!ctx.bodyText) return { ok: true, value: {} };
    try {
      return { ok: true, value: JSON.parse(ctx.bodyText) };
    } catch {
      return { ok: false, response: badRequest('invalid_json', opt) };
    }
  }
  return readJsonLimited(ctx.request, ctx.byteLimit, opt);
}

/**
 * Middleware gerbang: dijalankan untuk SEMUA path, termasuk path yang belum
 * punya handler. Konsekuensi yang disengaja: `POST /api/ai/chat` dengan 21 KB
 * mendapat 413 walau rute AI belum didaftarkan agen lain — capnya melekat pada
 * kontrak, bukan pada handler.
 */
export async function guardMiddleware(ctx) {
  const forbidden = originGate(ctx.env, ctx.request);
  if (forbidden) return forbidden;
  const limit = byteLimitFor(ctx.pathname);
  ctx.byteLimit = limit;
  if (!mayHaveBody(ctx.request.method)) return null;

  const early = contentLengthGate(ctx.request, limit, { headers: ctx.corsHeaders });
  if (early) return early;

  // Tanpa `Content-Length`, satu-satunya cara menegakkan cap adalah membaca
  // dengan ambang. Hasilnya disimpan di `ctx.bodyText` supaya handler tidak
  // membaca stream yang sudah habis.
  if (ctx.request.headers.get('content-length') === null) {
    const read = await readTextLimited(ctx.request, limit, { headers: ctx.corsHeaders });
    if (!read.ok) return read.response;
    ctx.bodyText = read.text;
  }
  return null;
}
