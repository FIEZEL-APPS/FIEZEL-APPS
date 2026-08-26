/**
 * workers/api/route-slots.js — SLOT PENDAFTARAN RUTE UNTUK PAKET KERJA LAIN.
 *
 * Berkas ini ada supaya `index.js` TIDAK perlu diubah setiap kali satu domain
 * baru ditambahkan. Tiap agen/paket kerja mengisi SATU blok yang sudah bernomor
 * di bawah, di baris miliknya sendiri, sehingga dua paket kerja yang berjalan
 * paralel tidak menghasilkan konflik merge pada baris yang sama.
 *
 * Cara memakai slot:
 *   1. Buat berkas rute sendiri, mis. `route-ai.js`, yang mengekspor
 *      `export const ROUTES = [['POST', '/api/ai/chat', handler], ...];`
 *   2. Aktifkan blok slot Anda di bawah: buang komentar pada baris `import` dan
 *      pada baris `...` di dalam `EXTRA_ROUTES`.
 *   3. JANGAN menyentuh slot orang lain, JANGAN menambah baris di luar blok Anda.
 *
 * Kontrak handler (sama dengan rute fase 1):
 *   handler(ctx) -> Response | Promise<Response>
 *   ctx = { request, env, executionCtx, url, pathname, method, now,
 *           corsHeaders, cookies, byteLimit, identity }
 *   - `ctx.identity.sub` sudah terverifikasi HMAC bila `ctx.identity.verified`.
 *   - Cap byte sudah ditegakkan mw-guard SEBELUM handler dipanggil; angkanya
 *     ada di `schema.js` (`BYTE_LIMITS`) — tambahkan path Anda DI SANA, jangan
 *     menulis angka baru di handler.
 *   - Lapisan kuota / breaker / rate limit / analytics BELUM ada di fase ini;
 *     pasang sebagai middleware di `index.js` `MIDDLEWARE` (slot [M3]-[M6]),
 *     bukan di dalam handler, supaya tidak ada rute yang lupa memeriksanya.
 */

/* --- SLOT 1: AI (route-ai.js) — /api/ai/chat, /api/ai/translate, /api/coach/context */
// import { ROUTES as AI_ROUTES } from './route-ai.js';

/* --- SLOT 2: TTS (route-tts.js) — /api/tts/resolve, /api/tts/render */
// import { ROUTES as TTS_ROUTES } from './route-tts.js';

/* --- SLOT 3: KUOTA (route-quota.js) — /api/quota, /api/quota/preflight */
// import { ROUTES as QUOTA_ROUTES } from './route-quota.js';

/* --- SLOT 4: ANALYTICS (route-usage.js) — /api/usage/event, /api/usage/summary */
// import { ROUTES as USAGE_ROUTES } from './route-usage.js';

/* --- SLOT 5: WARISAN PUTER (route-legacy.js) — /api/policy/*, /api/activity, /api/feedback, /api/push/* */
// import { ROUTES as LEGACY_ROUTES } from './route-legacy.js';

export const EXTRA_ROUTES = [
  // ...AI_ROUTES,      /* SLOT 1 */
  // ...TTS_ROUTES,     /* SLOT 2 */
  // ...QUOTA_ROUTES,   /* SLOT 3 */
  // ...USAGE_ROUTES,   /* SLOT 4 */
  // ...LEGACY_ROUTES,  /* SLOT 5 */
];
