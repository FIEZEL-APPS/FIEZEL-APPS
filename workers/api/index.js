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
 *   [M-1] gerbang jembatan edge: header `X-Fiezel-Edge`             (mw-edge)
 *        PALING LUAR, bahkan sebelum CORS. Alasannya: penyerang yang memanggil
 *        `https://fiezel-api.fitrajft.workers.dev` langsung TIDAK mengirim
 *        `Origin`, dan `originGate` sengaja meloloskan permintaan tanpa Origin
 *        (non-browser/same-origin). Jadi gerbang origin tidak pernah bisa
 *        menutup jalur itu, dan penolakannya harus terjadi sebelum satu byte
 *        D1/KV disentuh. Lihat `mw-edge.js` untuk seluruh alasan + kenapa
 *        keadaan `off` hanya sah selama masa transisi.
 *   [M0] cors + gerbang origin + cap byte via Content-Length   (mw-guard)
 *        Paling luar: respons GALAT pun butuh header CORS, kalau tidak browser
 *        menampilkan "network error" alih-alih pesan FIEZEL.
 *   [M1] identitas: verifikasi cookie fz_id ber-HMAC                (mw-identity)
 *        Semua lapisan sesudahnya butuh subjek, dan subjek TIDAK PERNAH datang
 *        dari body.
 *   [M2] handler rute
 *   [M3..M6] kuota -> rate limit -> breaker.
 *        TERPASANG, tetapi SENGAJA BUKAN sebagai middleware global. Alasannya
 *        bisa diperiksa: kuota hanya boleh ditagih untuk permintaan yang benar-
 *        benar akan memanggil provider, dan yang tahu hal itu cuma handler-nya
 *        (`route-tts.js` menjawab dari cache R2 pada LANGKAH 2, sebelum kuota;
 *        `route-ai.js` menjawab dari breaker OPEN tanpa kuota). Middleware
 *        global akan menagih keduanya — murid dihukum untuk replay audio yang
 *        gratis dan untuk provider yang mati.
 *        Yang dijaga tetap terjaga: penegakannya TIDAK ada di dalam handler,
 *        melainkan di `route-wiring.js` yang menyuntikkan `enforceQuota` asli
 *        dari `quota/route-quota.js` ke setiap rute berbiaya. Rute berbiaya yang
 *        lupa memanggilnya akan merah di `cf-wiring-test.js` butir (b)/(c),
 *        bukan lolos diam-diam.
 *        Urutan di dalam satu permintaan tetap seperti cf-b1 §4 dan tidak boleh
 *        ditukar: identitas -> gerbang payload -> breaker -> kuota -> provider.
 *        Validasi skema SESUDAH otorisasi karena `JSON.parse` adalah CPU dan CPU
 *        adalah anggaran paling langka di PLAN GRATIS.
 *
 * ==========================================================================
 * CRON (`scheduled`)
 * ==========================================================================
 * Dua job, keduanya idempoten, keduanya WAJIB ada supaya dua kontrak tidak
 * bohong:
 *   (a) sweep reservasi kuota kedaluwarsa — tanpa ini slot yang ditahan
 *       permintaan yang mati menghilang dari jatah murid sampai tengah malam;
 *   (b) rollup analytics harian + rotasi pepper — tanpa rotasi + purge token
 *       harian, klaim "server tidak bisa menghubungkan hari-1 ke hari-2" palsu.
 * Ekspresi cron ada di `wrangler.toml` `[triggers]`, pemetaannya di
 * `route-wiring.js` (`CRON_QUOTA_SWEEP`, `CRON_ANALYTICS_ROLLUP`).
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
import { edgeGuardMiddleware } from './mw-edge.js';
import { identityMiddleware } from './mw-identity.js';
import { routeHealth, routeHealthz } from './route-health.js';
import { routeAuthAnon, routeAuthClaim } from './route-auth.js';
import { routeUserMe } from './route-user.js';
import { routeConfig } from './route-config.js';
import { EXTRA_ROUTES } from './route-slots.js';
import { runScheduled } from './route-wiring.js';
import { notFound, methodNotAllowed, jsonError, ERR } from './errors.js';

/** Rute fase ini. Bentuk: [metode, path literal, handler]. */
export const ROUTES = [
  ['GET', '/health', routeHealth],
  // `/healthz` = SATU-SATUNYA jalur yang boleh diakses tanpa header jembatan
  // (`mw-edge.EDGE_FREE_PATHS`). Sengaja terpisah dari `/health` karena
  // `/health` mengumumkan `capabilities` dan itu adalah peta permukaan serang
  // yang tidak boleh publik. Alasan lengkapnya di `mw-edge.js`.
  ['GET', '/healthz', routeHealthz],
  ['POST', '/api/auth/anon', routeAuthAnon],
  ['POST', '/api/auth/claim', routeAuthClaim],
  ['GET', '/api/user/me', routeUserMe],
  ['GET', '/api/config', routeConfig],
  ...EXTRA_ROUTES
];

/** Rantai middleware. Mengembalikan Response = short-circuit. */
const MIDDLEWARE = [
  edgeGuardMiddleware, // [M-1] header jembatan `X-Fiezel-Edge` (nol I/O, nol await)
  guardMiddleware,     // [M0] cors + origin + cap byte
  identityMiddleware   // [M1] cookie fz_id ber-HMAC -> ctx.identity.sub
  // [M3] plan/entitlement: TIDAK ADA. Hanya ada satu plan (free) dan batasnya
  //      hidup di quota/quota-config.js; lapisan kosong hanya menipu pembaca.
  // [M4] kuota      -> route-wiring.js (per-rute, lihat catatan urutan di atas)
  // [M5] rate limit -> quota/route-quota.js lewat jalur yang sama
  // [M6] breaker    -> di dalam handler AI/TTS, SEBELUM kuota (E5 LANGKAH 3)
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
    identity: { sub: null, kid: null, issued: false, verified: false },
    // Reservasi kuota yang dibuka permintaan ini. Diselesaikan (commit/rollback)
    // oleh `route-wiring.js` sesudah handler selesai; array-nya di ctx supaya
    // tidak ada state kuota per-permintaan yang hidup di variabel modul.
    quotaTickets: []
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
  const needCors = needsCorsHeaders(response, ctx);
  if (!ctx.cookies.length && !needCors) return response;
  const headers = new Headers(response.headers);
  for (const cookie of ctx.cookies) headers.append('set-cookie', cookie);
  if (needCors) for (const [k, v] of Object.entries(ctx.corsHeaders)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * CORS DITEMPELKAN DI SATU TITIK LUAR, UNTUK SEMUA RUTE.
 *
 * Sebelum ini setiap pembungkus rute bertanggung jawab menempelkan `ctx.corsHeaders`
 * sendiri, dan `wrapAnalytics` di `route-wiring.js` TIDAK melakukannya. Akibatnya
 * jawaban dari handler analytics keluar TANPA `Access-Control-Allow-Origin`, sehingga
 * peramban murid memblokir pembacaannya.
 *
 * Gejalanya menipu dan itulah sebab cacat ini mahal ditemukan: preflight `OPTIONS`
 * MENJAWAB dengan CORS lengkap (204 + allow-origin + allow-methods), `curl` melihat
 * 200/202 yang sehat karena curl tidak menegakkan CORS, dan modul klien melaporkan
 * dirinya `loaded:true` tanpa galat. Yang gagal hanya PEMBACAAN jawaban di peramban.
 * Terukur di produksi: GET /api/usage/pepper 200 tanpa allow-origin -> peramban
 * menolak dengan ERR_FAILED, klien tidak pernah dapat pepper, jadi NOL event terkirim
 * seumur sesi. Owner melihat nol data dan wajar menyimpulkan nol pengguna.
 *
 * Menambal `wrapAnalytics` saja akan memperbaiki gejala hari ini dan meninggalkan
 * kelas bugnya utuh: pembungkus BERIKUTNYA yang lupa akan mengulang cacat yang sama,
 * senyap. Jadi penempelan dipindah ke sini, tempat SEMUA respons handler lewat.
 *
 * Handler yang sudah menempelkan sendiri TIDAK ditimpa: kalau `access-control-allow-origin`
 * sudah ada, keputusan handler dihormati. Origin yang tidak diizinkan menghasilkan
 * `ctx.corsHeaders` kosong dari `mw-guard.corsHeaders()`, jadi baris ini tidak pernah
 * bisa membocorkan izin ke origin asing.
 */
function needsCorsHeaders(response, ctx) {
  if (!response || !ctx || !ctx.corsHeaders) return false;
  if (!Object.keys(ctx.corsHeaders).length) return false;
  return !response.headers.has('access-control-allow-origin');
}

export default {
  /**
   * Cron. Galat SATU job tidak boleh membatalkan job lain (`runScheduled`
   * sudah menangkapnya per job), dan hasilnya di-log supaya owner bisa melihat
   * bahwa sweep/rollup benar-benar jalan — bukan mengira jalan.
   */
  async scheduled(event, env, executionCtx) {
    const summary = await runScheduled(event, env, executionCtx, nowFrom(env));
    console.log('fiezel-api scheduled', JSON.stringify(summary));
    return summary;
  },

  async fetch(request, env, executionCtx) {
    try {
      return await handle(request, env, executionCtx);
    } catch (err) {
      // Galat internal TIDAK PERNAH membocorkan pesan hulu ke murid: pesan
      // provider bisa memuat kunci, prompt, atau nama model. Detail masuk log
      // Worker (observability), respons tetap generik + header CORS supaya
      // frontend bisa menampilkan naskah FIEZEL, bukan "network error".
      //
      // ======================================================================
      // KENAPA `message` DAN `stack` IKUT — DIBAYAR SATU SIKLUS DEPLOY
      // ======================================================================
      // Versi sebelumnya mencatat `err.name` SAJA, dan itu tidak menepati
      // kalimat "Detail masuk log Worker" di atas: yang sampai ke `wrangler
      // tail` cuma nama kelas DOMException. Ongkosnya terukur pada insiden
      // 3 Sep 2026 — setiap `POST /api/account/register` menjawab 500 dan log
      // produksi hanya berbunyi:
      //
      //     fiezel-api unhandled NotSupportedError
      //
      // Dari baris itu penyebabnya TIDAK dapat disimpulkan. Perbaikan pertama
      // yang diusulkan (PR #331) menebak bentuk parameter `hash` WebCrypto dan
      // keliru. Baru setelah `message` + `stack` ikut tercatat, penyebabnya
      // terbaca sekali lihat dan tanpa tebakan:
      //
      //     Pbkdf2 failed: iteration counts above 100000 are not supported
      //     (requested 210000).   at derive -> hashPassword -> routeAccountRegister
      //
      // Jadi satu siklus deploy terbuang untuk memulihkan informasi yang
      // seharusnya sudah ada di log sejak awal. Itu harga yang tidak perlu
      // dibayar dua kali.
      //
      // BATAS YANG TETAP BERLAKU, dan kenapa ini bukan pelonggaran keamanan:
      //   - yang berubah HANYA sisi log Worker, yang cuma bisa dibaca pemilik
      //     akun Cloudflare lewat `wrangler tail`/observability;
      //   - RESPONS ke murid tidak berubah sedikit pun — tetap `jsonError(500,
      //     ERR.INTERNAL, {})`, nol detail, sama seperti sebelumnya. Itulah
      //     invarian yang benar-benar menjaga kunci hulu, dan ia utuh;
      //   - peringatan "pesan provider bisa memuat kunci" tetap relevan untuk
      //     log: jangan pernah menyalin-tempel keluaran `tail` ke tempat publik
      //     (issue, PR, chat pihak ketiga) tanpa membacanya lebih dulu.
      console.error(
        'fiezel-api unhandled',
        err && err.name,
        err && err.message,
        err && err.stack
      );
      const cors = corsHeaders(env, request.headers.get('origin'));
      return jsonError(500, ERR.INTERNAL, {}, { headers: cors });
    }
  }
};
