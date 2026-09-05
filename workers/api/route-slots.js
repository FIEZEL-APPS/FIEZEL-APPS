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
 * gerbang: `tests/cf-wiring-test.js`) dan berkas ini tetap menjadi apa yang
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
/* --- SLOT 7: SOSIAL (route-social.js) — /api/social/profile/*, /api/social/friends*,
 *             /api/social/cheer, /api/social/rank/*                  [TERPASANG]
 * Dipasang sebagai array `ROUTES` sungguhan (jalur yang dirancang berkas ini),
 * BUKAN lewat route-wiring.js: rute sosial tidak memanggil provider berbayar,
 * jadi tidak butuh jembatan kuota/neuron. Gerbangnya hidup di dalam modulnya:
 * identitas (mw-identity) -> flag FEATURE_SOCIAL+KV (fail-closed, mesin
 * featureAllowedFrom yang sama dengan AI/TTS) -> CORE_DB. Cap byte per path
 * terdaftar di schema.js BYTE_LIMITS seperti slot lain. */
import { ROUTES as SOCIAL_ROUTES } from './route-social.js';
/* --- SLOT 8: BUKTI BRAINCORE (evidence/route-evidence.js) - BACA owner saja:
 *             GET /api/owner/braincore-evidence                      [TERPASANG]
 * Rute TULIS lane ini (POST /api/braincore/evidence) TIDAK di sini: ia butuh
 * penyempitan env ke EVIDENCE_DB, jadi ia dipasang lewat route-wiring.js persis
 * seperti lane analytics dan learning. Yang ada di sini hanya jalur BACA
 * owner-gated, yang tidak butuh jembatan kuota maupun identitas murid - pola
 * yang sama dengan SLOT 6. */
import { ROUTES as EVIDENCE_OWNER_ROUTES } from './evidence/route-evidence.js';
/* --- SLOT 9: BUKTI BRAINCORE PER-MURID (evidence/route-learner-evidence.js)  [TERPASANG]
 *             POST /api/braincore/learner-evidence
 *             POST /api/braincore/learner-evidence/consent
 *             GET  /api/owner/learners
 *             GET  /api/owner/learner-evidence
 * KEEMPATNYA di sini, bukan di route-wiring.js, dan itu keputusan yang sama
 * dengan SLOT 7: lane ini tidak memanggil provider berbayar (nol jembatan
 * kuota/neuron) dan — yang menentukan — ia memakai CORE_DB, bukan EVIDENCE_DB.
 * route-wiring.js ada untuk MENYEMPITKAN env ke binding lane agregat; melewatkan
 * lane beridentitas ke sana akan menaruh handler ini di jalur yang memegang
 * database yang seluruh kontraknya menjanjikan anonimitas.
 *
 * Rute TULIS-nya menuntut identitas (kebalikan SLOT 8), jadi ia WAJIB lewat
 * jalur yang sudah dilewati [M1] mw-identity — yaitu jalur ini. */
import { ROUTES as LEARNER_EVIDENCE_ROUTES } from './evidence/route-learner-evidence.js';
/* --- SLOT 10: AKUN, PERAN, KONTEN GURU                               [TERPASANG]
 *             route-account.js         — /api/account/*, aktivasi guru
 *             route-owner-teachers.js  — /api/owner/teacher-invite*, /api/owner/teachers
 *             route-teacher.js         — /api/teacher/*
 * Dipasang sebagai array `ROUTES` sungguhan (jalur yang dirancang berkas ini),
 * BUKAN lewat route-wiring.js, dengan alasan yang SAMA dengan SLOT 7 dan SLOT 9:
 * tidak satu pun rute di sini memanggil provider berbayar, jadi tidak ada
 * jembatan kuota/neuron yang perlu disuntikkan — dan yang menentukan, lane ini
 * memakai CORE_DB. route-wiring.js ada untuk MENYEMPITKAN env ke binding lane
 * agregat; melewatkan lane beridentitas ke sana akan menaruh handler ini di
 * jalur yang memegang database yang seluruh kontraknya menjanjikan anonimitas.
 *
 * Gerbangnya hidup di dalam modulnya: identitas (mw-identity) -> `roleGate`
 * (peran otoritatif dari baris auth_account, DIBACA SETIAP PERMINTAAN) ->
 * penyaringan per-baris `teacher_sub` di dalam handler. Rute owner yang MENULIS
 * (cetak/cabut undangan) menambah gerbang KEDUA: secret `OWNER_TOKEN_HASH`,
 * karena satu baris D1 yang keliru tidak boleh cukup untuk mencetak akun berizin.
 * Cap byte per path terdaftar di schema.js BYTE_LIMITS seperti slot lain. */
import { ROUTES as ACCOUNT_ROUTES } from './route-account.js';
import { ROUTES as OWNER_TEACHER_ROUTES } from './route-owner-teachers.js';
import { ROUTES as TEACHER_ROUTES } from './route-teacher.js';
/* --- SLOT 11: SINKRON RUANG GURU (route-class-sync.js) — /api/learner/class-report,
   /api/teacher/class/claim|list|reports. Kode kelas diklaim guru, murid melapor agregat. [TERPASANG] */
import { ROUTES as CLASS_SYNC_ROUTES } from './route-class-sync.js';

export const EXTRA_ROUTES = [
  ...buildExtraRoutes(),  /* SLOT 1-4 */
  // ...LEGACY_ROUTES,    /* SLOT 5 */
  ...CRON_STATUS_ROUTES,  /* SLOT 6 */
  ...SOCIAL_ROUTES,       /* SLOT 7 */
  ...EVIDENCE_OWNER_ROUTES, /* SLOT 8 */
  ...LEARNER_EVIDENCE_ROUTES, /* SLOT 9 */
  ...ACCOUNT_ROUTES,          /* SLOT 10 */
  ...OWNER_TEACHER_ROUTES,    /* SLOT 10 */
  ...TEACHER_ROUTES,          /* SLOT 10 */
  ...CLASS_SYNC_ROUTES,       /* SLOT 11 */
];
