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

/*
 * ==========================================================================
 * STATUS PEMASANGAN (diisi paket kerja "integrasi rute", 27 Agu 2026)
 * ==========================================================================
 * SLOT 1 (AI), SLOT 2 (TTS), SLOT 3 (KUOTA), dan SLOT 4 (ANALYTICS) sudah
 * TERPASANG, tetapi bukan sebagai empat baris `...X_ROUTES` seperti rancangan
 * awal. Alasannya konkret: keempat paket kerja itu tidak mengekspor array
 * `ROUTES` — mereka mengekspor fungsi pendaftar (`registerAiRoutes`,
 * `registerTtsRoutes`, `registerQuotaRoutes`, `registerAnalyticsRoutes`) dengan
 * TIGA konvensi argumen handler yang berbeda, dan dua di antaranya butuh
 * `deps.enforceQuota`. Menyalin adaptasi itu ke berkas slot akan menaruh logika
 * kuota di tempat yang tidak ada gerbangnya.
 *
 * Karena itu seluruh adaptasi tinggal di `route-wiring.js` (satu berkas, satu
 * gerbang: `cf-wiring-test.js`) dan berkas ini tetap menjadi apa yang
 * dijanjikannya: satu titik yang menentukan rute tambahan mana yang hidup.
 *
 * SLOT 5 (warisan Puter) BELUM ada dan itu bukan kelalaian: `/api/policy/*`,
 * `/api/activity`, `/api/feedback`, `/api/push/*` masih dilayani Worker Puter.
 * Memindahkannya adalah paket kerja tersendiri.
 *
 * SLOT 6 (STATUS CRON) TERPASANG sebagai array `ROUTES` sungguhan — jalur yang
 * dirancang berkas ini sejak awal. Ia TIDAK lewat `route-wiring.js` karena
 * `/api/owner/cron-status` tidak butuh jembatan kuota, tidak butuh identitas
 * murid, dan tidak boleh masuk daftar rute berbiaya; gerbangnya adalah gate
 * owner di dalam modulnya sendiri (`cron-status.js`).
 */
import { buildExtraRoutes } from './route-wiring.js';

/* --- SLOT 1: AI (ai/route-ai.js) — /api/ai/task                     [TERPASANG] */
/* --- SLOT 2: TTS (tts/route-tts.js) — /api/tts/render, /api/tts/manifest [TERPASANG] */
/* --- SLOT 3: KUOTA (quota/route-quota.js) — /api/quota              [TERPASANG] */
/* --- SLOT 4: ANALYTICS (analytics/route-events.js) — /api/usage/events,
 *             /api/usage/retention, /api/usage/pepper                [TERPASANG] */
/* --- SLOT 5: WARISAN PUTER (route-legacy.js) — /api/policy/*, /api/activity,
 *             /api/feedback, /api/push/*                             [BELUM] */
// import { ROUTES as LEGACY_ROUTES } from './route-legacy.js';
/* --- SLOT 6: STATUS CRON (cron-status.js) — /api/owner/cron-status   [TERPASANG] */
import { ROUTES as CRON_STATUS_ROUTES } from './cron-status.js';

export const EXTRA_ROUTES = [
  ...buildExtraRoutes(),  /* SLOT 1-4 */
  // ...LEGACY_ROUTES,    /* SLOT 5 */
  ...CRON_STATUS_ROUTES,  /* SLOT 6 */
];
