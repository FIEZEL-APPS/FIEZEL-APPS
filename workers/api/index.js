/**
 * workers/api/index.js — titik masuk Worker `fiezel-api` (router + middleware berlapis).
 *
 * ==========================================================================
 * KENAPA ROUTER MANUAL, BUKAN HONO
 * ==========================================================================
 * cf-b1 §2.2 merekomendasikan Hono. Rekomendasi itu DITOLAK di sini, dengan
 * alasan yang bisa diperiksa:
 *   1. Repo FIEZEL nol dependency runtime untuk PWA dan tidak punya build step.
 *      `npm install` di jalur produksi DILARANG oleh aturan operasi repo ini,
 *      jadi satu `import { Hono } from 'hono'` memindahkan deploy Worker ke
 *      jalur yang tidak boleh dipakai.
 *   2. `quality.yml` langkah "Syntax" menjalankan `node --check` atas SEMUA
 *      `*.js`/`*.mjs` dengan pengecualian hanya `./node_modules/*` dan
 *      `./vendor/*` — BUKAN pola node_modules di kedalaman mana pun. Satu
 *      `workers/api/node_modules/`
 *      yang ikut ter-commit langsung membuat gerbang merah tanpa sebab yang
 *      jelas bagi orang berikutnya. Ini jebakan nyata, bukan hipotesis (cf-b1 §2.2).
 *   3. Yang sebenarnya dibutuhkan dari Hono hanyalah rantai middleware dengan
 *      short-circuit. Itu ±40 baris, ada di bawah, dan tidak punya biaya
 *      pemeliharaan pihak ketiga.
 * Konsekuensi yang diterima dengan sadar: tidak ada param path dinamis
 * (`/x/:id`) — semua rute fase ini adalah path literal, dan kalau nanti butuh
 * param, tambahkan pencocokan prefiks di `matchRoute`, jangan tambahkan paket.
 *
 * ==========================================================================
 * URUTAN MIDDLEWARE (mengikuti cf-b1 §4, dipangkas ke fase ini)
 * ==========================================================================
 *   [M0] cors + gerbang origin + cap byte via Content-Length   (mw-guard)
 *        Paling luar: respons GALAT pun butuh header CORS, kalau tidak browser
 *        menampilkan "network error" alih-alih pesan FIEZEL.
 *   [M1] identitas: verifikasi cookie fz_id ber-HMAC                (mw-identity)
 *        Semua lapisan sesudahnya butuh subjek, dan subjek TIDAK PERNAH datang
 *        dari body.
 *   [M2] handler rute
 *   [M3..M6] SLOT: plan/entitlement -> kuota -> rate limit -> breaker.
 *        BELUM ADA di fase ini; dikerjakan paket kerja lain. Urutannya sudah
 *        ditetapkan cf-b1 §4 dan tidak boleh ditukar: kuota (akuntansi akurat)
 *        SEBELUM rate limit (perlindungan permisif), validasi skema SESUDAH
 *        otorisasi karena `JSON.parse` adalah CPU dan CPU adalah anggaran
 *        paling langka di PLAN GRATIS.
 *
 * ==========================================================================
 * PLAN GRATIS (keputusan owner 27 Agu 2026)
 * ==========================================================================
 * Tidak ada Durable Object di Worker ini: DO butuh Workers Paid. Jalur yang
 * secara alami ingin DO (kuota, anti-replay tiket) memakai D1 `UPDATE ... WHERE
 * used < limit RETURNING` atau KV ber-TTL, dan batasnya dicatat di README.
 * Kalau kuota terbukti butuh atomisitas lebih ketat dari yang bisa diberikan D1,
 * DO adalah UPGRADE BERBAYAR dan itu WAJIB dilaporkan ke owner dengan angka —
 * jangan diselundupkan ke dalam konfigurasi.
 */

import { guardMiddleware, corsHeaders, preflightResponse } from './mw-guard.js';
import { identityMiddleware } from './mw-identity.js';
import { routeHealth } from './route-health.js';
import { routeAuthAnon, routeAuthClaim } from './route-auth.js';
import { routeUserMe } from './route-user.js';
import { routeConfig } from './route-config.js';
import { EXTRA_ROUTES } from './route-slots.js';
import { notFound, methodNotAllowed, jsonError, ERR } from './errors.js';

/** Rute fase ini. Bentuk: [metode, path literal, handler]. */
export const ROUTES = [
  ['GET', '/health', routeHealth],
  ['POST', '/api/auth/anon', routeAuthAnon],
  ['POST', '/api/auth/claim', routeAuthClaim],
  ['GET', '/api/user/me', routeUserMe],
  ['GET', '/api/config', routeConfig],
  ...EXTRA_ROUTES
];

/** Rantai middleware. Mengembalikan Response = short-circuit. */
const MIDDLEWARE = [
  guardMiddleware,     // [M0]
  identityMiddleware   // [M1]
  // [M3] planMiddleware,        <- SLOT paket kerja kuota
  // [M4] quotaMiddleware,       <- SLOT paket kerja kuota
  // [M5] rateLimitMiddleware,   <- SLOT paket kerja kuota
  // [M6] breakerMiddleware      <- SLOT paket kerja AI/TTS
];

function matchRoute(method, pathname) {
  let pathExists = false;
  const allow = [];
  for (const [routeMethod, routePath, handler] of ROUTES) {
    if (routePath !== pathname) continue;
    pathExists = true;
    allow.push(routeMethod);
    if (routeMethod === method) return { handler, pathExists: true, allow };
  }
  return { handler: null, pathExists, allow };
}

/**
 * Jam masuk sebagai PARAMETER, tidak dibaca dari `Date.now()` di dalam handler.
 * Disiplin ini yang membuat gerbang bisa menguji kedaluwarsa tiket dan reset
 * harian tanpa menunggu sehari (cf-b7 §2.1 "jam palsu").
 *
 * `TEST_CLOCK_MS` hanya dihormati kalau ada di env, dan env hanya bisa diisi
 * OWNER lewat wrangler — bukan klien. `wrangler.toml` produksi TIDAK memuatnya,
 * dan gerbang `cf-api-contract-test.js` meng-assert itu.
 */
function nowFrom(env) {
  const injected = Number(env && env.TEST_CLOCK_MS);
  return Number.isFinite(injected) && injected > 0 ? injected : Date.now();
}

async function handle(request, env, executionCtx) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const cors = corsHeaders(env, origin);

  if (request.method === 'OPTIONS') return preflightResponse(env, request);

  const ctx = {
    request,
    env,
    executionCtx,
    url,
    pathname: url.pathname,
    method: request.method,
    now: nowFrom(env),
    corsHeaders: cors,
    cookies: [],
    byteLimit: 0,
    // Diisi `guardMiddleware` HANYA kalau `Content-Length` tidak ada; handler
    // wajib membacanya lewat `readJsonFromCtx`, bukan dari `request` langsung.
    bodyText: undefined,
    identity: { sub: null, kid: null, issued: false, verified: false }
  };

  for (const mw of MIDDLEWARE) {
    /* eslint-disable no-await-in-loop */
    const short = await mw(ctx);
    if (short) return withCookies(short, ctx);
  }

  const match = matchRoute(ctx.method, ctx.pathname);
  if (!match.handler) {
    const response = match.pathExists
      ? methodNotAllowed(match.allow, { headers: cors })
      : notFound({ headers: cors });
    return withCookies(response, ctx);
  }

  const response = await match.handler(ctx);
  return withCookies(response, ctx);
}

/**
 * Tempelkan Set-Cookie yang dikumpulkan middleware/handler.
 * Dilakukan di satu tempat supaya tidak ada handler yang merakit atribut cookie
 * sendiri — atribut cookie (`HttpOnly`, `Secure`, `SameSite`, `Max-Age`) adalah
 * bagian kontrak keamanan dan hanya boleh lahir dari `mw-identity.buildCookie`.
 */
function withCookies(response, ctx) {
  if (!ctx.cookies.length) return response;
  const headers = new Headers(response.headers);
  for (const cookie of ctx.cookies) headers.append('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, executionCtx) {
    try {
      return await handle(request, env, executionCtx);
    } catch (err) {
      // Galat internal TIDAK PERNAH membocorkan pesan hulu ke murid: pesan
      // provider bisa memuat kunci, prompt, atau nama model. Detail masuk log
      // Worker (observability), respons tetap generik + header CORS supaya
      // frontend bisa menampilkan naskah FIEZEL, bukan "network error".
      console.error('fiezel-api unhandled', err && err.name);
      const cors = corsHeaders(env, request.headers.get('origin'));
      return jsonError(500, ERR.INTERNAL, {}, { headers: cors });
    }
  }
};
