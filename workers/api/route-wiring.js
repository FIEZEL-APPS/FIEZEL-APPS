/**
 * workers/api/route-wiring.js — PEMASANGAN NYATA rute paket kerja E3 (kuota),
 * E4 (analytics), dan E5 (AI/TTS) ke router manual `index.js`.
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Delapan paket kerja Worker sengaja TIDAK menyentuh `index.js` supaya tidak
 * bertabrakan saat merge. Akibatnya rute kuota/analytics/AI/TTS ada tapi tidak
 * terpasang: setiap permintaan ke `/api/ai/task` menjawab 404. Berkas ini yang
 * menyambungnya, dan ia sengaja SATU berkas supaya alasan pemasangan (terutama
 * jembatan kuota di bawah) bisa dibaca di satu tempat, bukan tersebar.
 *
 * ==========================================================================
 * TIGA KONVENSI HANDLER YANG BERBEDA — DIPETAKAN EKSPLISIT, BUKAN DITEBAK
 * ==========================================================================
 *   E3 kuota      : handler(quotaCtx)                 -> Response
 *   E4 analytics  : handler({request, env, ctx})       -> Response
 *   E5 AI/TTS     : handler(request, env, executionCtx)-> Response
 * Ketiganya dikumpulkan lewat "collector router" yang tahu konvensi miliknya,
 * jadi tidak ada handler yang dipanggil dengan bentuk argumen orang lain. Kalau
 * satu paket kerja mengubah konvensinya, yang merah adalah `tests/cf-wiring-test.js`,
 * bukan produksi.
 *
 * ==========================================================================
 * JEMBATAN KUOTA — INI YANG MEMATIKAN FAIL-OPEN
 * ==========================================================================
 * `route-quota.js` mengekspor `enforceQuota(bucket, cost)` yang bentuknya
 * MIDDLEWARE: `(ctx, next)`. Ia menahan slot (reserve) sebelum `next()`, lalu
 * `commit` kalau `next()` sukses dan `rollback` kalau `next()` melempar.
 * `route-ai.js` / `route-tts.js` justru memanggil `enforceQuota({kind,...})`
 * sekali dan hanya membaca `{allowed, retryAfter}` — dua kontrak yang tidak
 * bertemu, dan itulah sebabnya E5 mendokumentasikannya sebagai resolver
 * OPSIONAL (artinya: fail-open, kuota tidak pernah ditagih).
 *
 * Jembatan di bawah TIDAK menyalin ulang logika kuota (satu-satunya sumber
 * kebenaran tetap `route-quota.js` + `quota-store-d1.js`). Ia memanggil
 * middleware yang asli dengan `next()` yang DITUNDA:
 *
 *   1. `gate(qctx, next)` dijalankan tanpa di-await.
 *   2. Begitu `next()` dipanggil, artinya reservasi BERHASIL -> `{allowed:true}`
 *      dikembalikan ke handler E5, yang lalu memanggil provider.
 *   3. Kalau reservasi GAGAL, `gate` selesai lebih dulu tanpa memanggil `next()`
 *      -> `{allowed:false, retryAfter}` -> handler E5 menjawab 429.
 *   4. Sesudah handler selesai, `settleQuota()` menyelesaikan `next()`:
 *      sukses -> commit (kuota benar-benar terpakai);
 *      provider gagal/degraded -> reject -> rollback (murid tidak dihukum atas
 *      kegagalan provider).
 * Reservasi yang tidak pernah diselesaikan (worker mati di tengah) bukan
 * kebocoran permanen: TTL 30 s + cron sweep di `scheduled()` yang memanennya.
 *
 * Konsekuensi yang diterima sadar: satu permintaan AI = satu reservasi D1 +
 * satu commit. Itu 2 tulis D1 per permintaan berbayar-kuota di PLAN GRATIS,
 * dan angka itu yang membuat batas 25/hari per pengguna aman (25 pengguna
 * aktif x 25 = 1.250 reservasi/hari, jauh di bawah plafon D1 gratis).
 *
 * TTS cache hit TIDAK PERNAH lewat sini: `route-tts.js` menjawab dari R2
 * (LANGKAH 2) sebelum menyentuh kuota, jadi replay tetap nol kuota. Itu
 * dibuktikan `tests/cf-wiring-test.js` butir (c), bukan dipercaya.
 */

import { FREE_BUCKET_LIMITS } from './quota/quota-config.js';
// P3 - penegakan flag server DI JALUR PERMINTAAN, bukan sekadar dilaporkan ke klien.
import { checkAiEnabled, checkTtsEnabled } from './feature-gate.js';
// P3 - pagar neuron tingkat AKUN (jatah vendor), berbeda dari kuota per-murid.
import { reserveAccountNeurons, releaseAccountNeurons } from './ai/ai-account-budget.js';
import { QUOTA_CONFIG } from './quota/quota-config.js';
import { registerQuotaRoutes, enforceQuota, NO_STORE_HEADERS } from './quota/route-quota.js';
import { sweepExpiredReservations, reconcileHeld } from './quota/quota-store-d1.js';
import { registerAnalyticsRoutes } from './analytics/route-events.js';
import { scheduledAnalytics } from './analytics/rollup.js';
// Lane telemetri BELAJAR (docs/BRAIN-TELEMETRY-SCHEMA.md) — SENGAJA modul terpisah
// dari analytics: skema lain, database lain (LEARNING_DB), kill switch lain.
import { registerLearningRoutes } from './learning/route-learning-events.js';
// Lane KETIGA (bukti belajar Braincore): schema lain, database lain
// (EVIDENCE_DB), kill switch lain (EVIDENCE_ENABLED).
import { registerEvidenceRoutes } from './evidence/route-evidence.js';
import { purgeEvidence } from './evidence/evidence-store-d1.js';
import { purgeLearnerEvidence } from './evidence/learner-evidence-store-d1.js';
import { jsonResponse, jsonError, unauthenticated, ERR } from './errors.js';
// A3: pencatat hasil cron. Satu-satunya alasan berkas ini diubah paket kerja A3.
import { withCronRun, CRON_JOBS } from './cron-status.js';

// URUTAN IMPOR INI BERMAKNA. `ai-tasks.js`, `breaker.js`, dan `tts-key.js`
// berformat UMD: di bawah ESM murni mereka menaruh dirinya di
// `globalThis.Fiezel*` dan `route-ai.js`/`route-tts.js` mencarinya DI SANA
// (karena `require` tidak ada). Modul ESM dieksekusi menurut urutan deklarasi
// impor, jadi dependensi harus disebut LEBIH DULU daripada yang memakainya.
// Membalik urutan dua blok di bawah = `AiTasks is undefined` saat runtime.
import './ai/ai-tasks.js';
import './breaker/breaker.js';
import './tts/tts-key.js';
// A12/1: registry nama parameter provider TTS (`speaker`) + voice bawaan korpus. Sama-sama UMD
// dan sama-sama dipakai `route-tts.js` lewat `globalThis`, jadi ia WAJIB disebut sebelum rutenya.
import './tts/tts-provider-params.js';
// S2 - CHOKEPOINT MODEL. Sama-sama UMD dan dipakai `route-ai.js` + `route-tts.js`
// lewat `globalThis`, jadi ia WAJIB disebut SEBELUM kedua rute itu. Membalik urutan
// ini = `ModelCallGate is undefined` di jalur permintaan, dan itu berarti setiap
// panggilan model melempar - berisik, bukan senyap. Itu memang arah yang benar.
import * as modelGateNs from './ai/model-call-gate.js';
import * as routeAiNs from './ai/route-ai.js';
import * as routeTtsNs from './tts/route-tts.js';

/**
 * Ambil ekspor modul UMD baik saat ia di-bundle sebagai CJS (esbuild memberi
 * `module`, hasilnya jadi `default`) maupun saat dieksekusi sebagai ESM murni
 * (hasilnya hanya ada di `globalThis`).
 */
function umd(ns, globalName) {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (ns && ns.default && typeof ns.default === 'object') return ns.default;
  if (g[globalName]) return g[globalName];
  return ns || null;
}

const ModelCallGate = umd(modelGateNs, 'FiezelModelCallGate');
const RouteAi = umd(routeAiNs, 'FiezelRouteAi');
const RouteTts = umd(routeTtsNs, 'FiezelRouteTts');

/* ============================================================ binding resolver ===== */

/**
 * D1 kuota+identitas. `CORE_DB` adalah nama binding di `wrangler.toml`; `DB`
 * adalah nama yang dipakai harness uji (`tools/cf-test-harness.js`). Keduanya
 * diterima supaya gerbang menguji jalur produksi yang sama, bukan cabang lain.
 */
export function quotaDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * D1 analytics. Modul E4 membaca `env.ANALYTICS_DB || env.DB_ANALYTICS`,
 * sedangkan `wrangler.toml` (dan runbook + worker owner) menamainya `STATS_DB`.
 * Aliasnya dibuat DI SINI, bukan dengan menambah binding kedua ke database yang
 * sama di wrangler: dua binding ke satu database membuat orang berikutnya
 * mengira ada dua database.
 *
 * PENTING: database ini SENGAJA berbeda dari `quotaDb`. Kontrak privasi
 * (EXEC-BRIEF-CF.md) melarang tabel kuota dan tabel analytics bisa di-join;
 * memisahkan database membuat JOIN itu tidak mungkin secara fisik, bukan hanya
 * dilarang secara konvensi.
 */
export function analyticsEnv(env) {
  const db = env && (env.ANALYTICS_DB || env.DB_ANALYTICS || env.STATS_DB || env.ANALYTICS);
  if (!env) return { ANALYTICS_DB: null };
  if (env.ANALYTICS_DB === db) return env;
  return Object.assign(Object.create(null), env, { ANALYTICS_DB: db || null });
}

/**
 * D1 lane telemetri belajar. Berbeda sadar dari `analyticsEnv`: TIDAK ADA
 * daftar alias/fallback. `route-learning-events.js` membaca `env.LEARNING_DB`
 * persis seperti nama binding di `wrangler.toml`, jadi env diteruskan apa
 * adanya. Salah pasang binding harus terlihat sebagai "lane diam" (202 tanpa
 * tulis), bukan sebagai data learning yang diam-diam mendarat di database
 * kuota atau analytics — fallback lintas binding adalah cara pemisahan fisik
 * tiga database dikhianati satu typo.
 */
export function learningEnv(env) {
  return env || { LEARNING_DB: null };
}

/**
 * D1 lane bukti belajar Braincore. Aturan yang sama dengan `learningEnv`:
 * TIDAK ADA alias/fallback. `route-evidence.js` membaca `env.EVIDENCE_DB`
 * persis seperti nama bindingnya, sehingga satu typo binding berakhir sebagai
 * lane diam (202 tanpa tulis) dan BUKAN sebagai bukti belajar yang mendarat di
 * database kuota, analytics, atau learning.
 */
export function evidenceEnv(env) {
  return env || { EVIDENCE_DB: null };
}

/* ============================================================ ctx adapters ========= */

function requireIdentity(ctx) {
  if (ctx.identity && ctx.identity.verified && ctx.identity.sub) return null;
  return unauthenticated({ headers: ctx.corsHeaders });
}

/**
 * Body sudah dihabiskan `guardMiddleware` bila `Content-Length` tidak ada
 * (permintaan chunked). Handler E4/E5 membaca `request` langsung, jadi mereka
 * harus menerima Request yang bodynya masih utuh — kalau tidak, klien chunked
 * mendapat `bad_json` yang tidak bisa dijelaskan.
 */
function requestFor(ctx) {
  if (typeof ctx.bodyText !== 'string') return ctx.request;
  if (ctx.method === 'GET' || ctx.method === 'HEAD') return ctx.request;
  return new Request(ctx.request.url, {
    method: ctx.method,
    headers: ctx.request.headers,
    body: ctx.bodyText
  });
}

function randomToken() {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  }
  // Tidak ada jalur `Math.random()` untuk id kuota: id yang bisa ditebak =
  // reservasi orang lain yang bisa dicommit. Lebih baik gagal keras.
  throw new Error('crypto_unavailable');
}

/**
 * ctx untuk modul kuota. `userId` HANYA dari identitas terverifikasi HMAC —
 * tidak pernah dari body, query, atau header (kelas kerentanan yang
 * `tests/quota-manipulation-test.js` jaga).
 */
function quotaCtxFor(ctx, extra) {
  const base = {
    db: quotaDb(ctx.env),
    userId: ctx.identity.sub,
    limits: FREE_BUCKET_LIMITS,
    now: ctx.now,
    nowAfter: () => ctx.now,
    newToken: randomToken,
    serverCacheHit: false,
    degraded: false,
    json: (body, status, headers) =>
      jsonResponse(body, {
        status: status || 200,
        headers: Object.assign({}, ctx.corsHeaders, headers || {})
      })
  };
  return Object.assign(base, extra || {});
}

/* ============================================================ jembatan kuota ======== */

const PASS = Object.freeze({ __wiring: 'pass' });

/**
 * Peta jenis permintaan -> bucket kuota. Ditentukan RUTE + task yang sudah
 * DIVALIDASI server, bukan field bebas dari body (cf-b3 §7 #8).
 */
export function bucketFor(req) {
  if (req && req.kind === 'tts') return 'tts';
  if (req && req.task === 'translate_subtitle') return 'aiTranslate';
  return 'ai';
}

function costFor(bucket, req) {
  if (bucket !== 'tts') return 1;
  const chars = Number(req && req.chars);
  return Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 1;
}

/**
 * ctx permintaan dicari lewat OBJEK REQUEST, bukan lewat variabel modul.
 *
 * Kenapa WeakMap dan bukan `let currentCtx`: `resolveEnforceQuota(deps)` dipanggil
 * di TENGAH handler E5, sesudah beberapa `await` (baca body, breaker). Variabel
 * modul yang di-set sebelum handler dipanggil sudah tidak bisa dipercaya di titik
 * itu — dua permintaan yang tumpang-tindih akan saling menimpa, dan bentuk bug
 * itu tepat "kuota pengguna A ditagih ke pengguna B". `route-ai.js`/`route-tts.js`
 * meneruskan `request: a.request` apa adanya ke `enforceQuota`, jadi objek Request
 * adalah kunci identitas permintaan yang tidak bisa tertukar. Entri hilang sendiri
 * saat Request di-GC.
 */
const CTX_BY_REQUEST = new WeakMap();

function enforceQuotaBridgeFactory() {
  return async function enforceQuotaBridge(req) {
    const ctx = req && req.request ? CTX_BY_REQUEST.get(req.request) : null;
    // Tidak ada ctx = tidak ada identitas terverifikasi = tidak ada yang bisa
    // ditagih. Fail-CLOSED, bukan izin-lolos.
    if (!ctx) return { allowed: false, reason: 'quota_context_missing', retryAfter: 60 };
    if (!quotaDb(ctx.env)) return { allowed: false, reason: 'quota_store_missing', retryAfter: 60 };
    if (requireIdentity(ctx)) return { allowed: false, reason: 'unauthenticated', retryAfter: 60 };

    const bucket = bucketFor(req);
    const cost = costFor(bucket, req);
    let deny = null;
    const qctx = quotaCtxFor(ctx, {
      json: (body, status) => {
        deny = { body, status };
        return { __wiring: 'deny' };
      }
    });

    let releaseNext = null;
    const pending = new Promise((resolve, reject) => {
      releaseNext = { resolve, reject };
    });
    let markReserved = null;
    const reserved = new Promise((resolve) => {
      markReserved = resolve;
    });

    const gate = enforceQuota(bucket, cost);
    const gatePromise = gate(qctx, async () => {
      markReserved();
      return pending;
    });
    // Jangan biarkan penolakan `gatePromise` menjadi unhandled rejection: ia
    // sengaja diselesaikan belakangan oleh `settleQuota`.
    gatePromise.catch(() => {});

    const outcome = await Promise.race([
      gatePromise.then(() => 'gate'),
      reserved.then(() => 'reserved')
    ]);

    if (outcome === 'reserved') {
      ctx.quotaTickets.push({ release: releaseNext, gatePromise, qctx, bucket, cost });
      return { allowed: true, bucket, charged: true, quotaChecked: true };
    }

    if (deny) {
      const ms = Number(deny.body && deny.body.retryAfterMs);
      return {
        allowed: false,
        reason: (deny.body && (deny.body.scope || deny.body.error)) || 'quota_exhausted',
        retryAfter: Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.ceil(ms / 1000)) : 3600
      };
    }
    // Gate selesai tanpa memanggil `next()` dan tanpa amplop: tidak dikenal ->
    // tolak. Fail-CLOSED, karena inilah cacat yang tugas ini perbaiki.
    return { allowed: false, reason: 'quota_unknown', retryAfter: 60 };
  };
}

/**
 * P3 - JEMBATAN PEMBATAL KUOTA.
 *
 * CACAT YANG DIPERBAIKI: `route-ai.js` melaporkan `quotaRolledBack` dengan memanggil
 * `deps.rollbackQuota`, tetapi wiring ini NGGAK pernah menyuntikkannya. Jadi di jalur
 * nyata amplop selalu mengatakan `quotaRolledBack:false` sementara reservasinya SUNGGUH
 * dibatalkan oleh `settleQuota()` di bawah. Laporan yang tidak cocok dengan kenyataan
 * membuat sisa kuota di klien salah dan membuat audit percaya murid kehilangan jatah
 * yang sebenarnya kembali.
 *
 * KENAPA JEMBATAN, BUKAN ROLLBACK LANGSUNG: pembatalan sebenarnya harus tetap terjadi
 * di satu tempat (`settleQuota`, di `finally`), karena hanya di sana ia dijamin jalan
 * walau handler melempar. Jembatan ini TIDAK membatalkan apa pun sendiri - ia menandai
 * niat, dan mengembalikan `true` HANYA kalau memang ada reservasi nyata yang akan
 * dibatalkan. Tanpa tiket, ia jujur mengembalikan `false`.
 */
function rollbackQuotaBridgeFactory() {
  return function rollbackQuotaBridge(info) {
    const request = info && info.request ? info.request : null;
    const ctx = request ? CTX_BY_REQUEST.get(request) : null;
    if (!ctx) return false;
    const tickets = ctx.quotaTickets;
    if (!tickets || !tickets.length) return false;
    ctx.quotaRollbackRequested = true;
    ctx.quotaRollbackReason = String((info && info.reason) || '');
    return true;
  };
}

/**
 * P3/S2 - JEMBATAN PAGAR NEURON AKUN: SATU-SATUNYA TEMPAT PERAKITAN.
 *
 * Fail-CLOSED di setiap cabang: tanpa ctx, tanpa D1, atau saat modul anggaran
 * melempar, jawabannya TOLAK. Pipa biaya yang tidak bisa diukur tidak boleh dibuka -
 * murid tetap menerima jawaban deterministik dari materi.
 *
 * S2 - TIGA HAL BARU, dan ketiganya ada supaya plafon tidak bisa hilang diam-diam:
 *
 * 1. Yang dikembalikan bukan `{allowed:true}` biasa lagi, tetapi TANDA TERIMA dari
 *    `ModelCallGate.makeReservation()`. `runReservedModel()` MENOLAK dipanggil tanpa
 *    tanda terima yang sah, jadi rute yang lupa memesan tidak bisa memanggil model
 *    sama sekali - ia melempar. Perakitan yang lupa = merah, bukan gratis.
 * 2. Tanda terima membawa `release()`: kalau panggilan model gagal SEBELUM model
 *    bekerja, neuronnya dikembalikan ke jatah hari ini. Tanpa ini, plafon 8.000 bisa
 *    habis oleh permintaan yang nol biaya dan mematikan AI tanpa satu neuron terpakai.
 * 3. Biaya TTS diturunkan DI SINI, bukan di `route-tts.js`. `route-tts.js` hanya
 *    melaporkan `chars` + `freeCharsPerDay` mesinnya; konversi ke neuron memakai
 *    `QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET` (10.000 neuron = jatah gratis akun),
 *    yaitu angka yang SUDAH menjadi dasar `freeCharsPerDay` tiap mesin. Jadi tidak ada
 *    konstanta harga baru yang dikarang: aura-1 = 10000/7333 = 1,364 neuron/karakter,
 *    melotts = 10000/500000 = 0,02 neuron/karakter.
 *
 * CATATAN YANG DIKOREKSI DARI P3: komentar lama di sini menulis "TTS tidak memakai
 * neuron Workers AI (ia memanggil penyedia suara terpisah)". Itu SALAH, dan salahnya
 * mahal: `route-tts.js` memanggil `env.AI.run('@cf/deepgram/aura-1', ...)` - binding
 * Workers AI yang sama, kolam neuron yang sama. Berkas itu bahkan mencatat sendiri
 * "jatah gratis 10.000 neuron/hari ≈ 7.333 karakter/hari untuk SELURUH akun". Jadi
 * plafon akun sekarang mengikat DI KEDUA jalur.
 */
function accountBudgetBridgeFactory() {
  return async function accountBudgetBridge(args) {
    const a = args || {};
    const ctx = a.request ? CTX_BY_REQUEST.get(a.request) : null;
    const env = (ctx && ctx.env) || a.env || {};
    if (!ctx) return { allowed: false, reason: 'ai_budget_context_missing', usedBefore: 0 };
    const db = quotaDb(env);
    const neurons = accountNeuronsFor(a);
    const out = await reserveAccountNeurons({ db, env, neurons, now: a.now });
    if (!out || out.allowed !== true) return out || { allowed: false, reason: 'ai_budget_unreadable', usedBefore: 0 };
    return ModelCallGate.makeReservation({
      neurons,
      cap: out.cap,
      usedBefore: out.usedBefore,
      release: () => releaseAccountNeurons({ db, env, neurons, now: a.now })
    });
  };
}

/**
 * Berapa neuron yang dipesan satu permintaan. Dua jalur, satu tempat:
 *   - AI  : `neurons` dari `spec.model.neuronsPerRequest` (angka terukur cf-a10 §2).
 *   - TTS : diturunkan dari `chars` + `freeCharsPerDay` mesin yang benar-benar dipakai.
 * Nilai yang tidak bisa dibaca menjadi PLAFON PERMINTAAN (`ACCOUNT_DAILY_NEURON_BUDGET`),
 * bukan 1: permintaan yang biayanya tidak diketahui harus terasa mahal, bukan gratis.
 */
function accountNeuronsFor(a) {
  const direct = Number(a && a.neurons);
  if (Number.isFinite(direct) && direct > 0) return Math.ceil(direct);
  const chars = Number(a && a.chars);
  const freeChars = Number(a && a.freeCharsPerDay);
  if (Number.isFinite(chars) && chars > 0 && Number.isFinite(freeChars) && freeChars > 0) {
    return Math.max(1, Math.ceil((chars * QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET) / freeChars));
  }
  return QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET;
}

/**
 * Tanda kegagalan provider di respons E5. Keduanya menjawab 200 dengan teks
 * cadangan (bab 12: jangan pernah galat mentah ke murid), jadi status HTTP
 * tidak bisa dipakai — yang dipakai adalah `source`/`degraded` miliknya.
 */
export function providerFailed(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.source === 'deterministic-fallback') return true;
  if (body.source === 'unavailable') return true;
  return body.degraded === true && body.source !== 'cache';
}

/**
 * S3 - PUTUSAN PENYELESAIAN, DIEKSPOR SUPAYA GERBANG TIDAK MENYALINNYA.
 *
 * `quotaCharged` di amplop TTS/AI hanya jujur kalau ia setuju dengan fungsi INI, karena
 * fungsi inilah yang benar-benar menggerakkan (atau membatalkan) buku jatah. Gerbang
 * `tests/tts-provider-contract-test.js` mengimpornya untuk menjalankan buku jatah palsu, jadi
 * tidak ada versi kedua dari aturan ini yang bisa hanyut dari yang dipakai produksi.
 */
export function quotaSettlementFailed(response, body, rollbackRequested) {
  return response === null || providerFailed(body) || rollbackRequested === true;
}

/**
 * Selesaikan semua reservasi yang dibuka permintaan ini. Dipanggil di `finally`
 * supaya handler yang melempar pun tidak meninggalkan slot tertahan sampai TTL.
 */
async function settleQuota(ctx, response) {
  const tickets = ctx.quotaTickets;
  if (!tickets || !tickets.length) return response;
  ctx.quotaTickets = [];

  let body = null;
  if (response && typeof response.clone === 'function') {
    try { body = await response.clone().json(); } catch (_) { body = null; }
  }
  // P3 - tiga sebab pembatalan, dan yang ketiga BARU: permintaan rollback eksplisit dari
  // `route-ai.js` lewat `rollbackQuotaBridge`. Menambahkannya di sini (bukan membatalkan
  // di jembatan) menjaga pembatalan tetap idempoten: satu tiket dibatalkan satu kali,
  // di satu tempat, walau handler melempar.
  const failed = quotaSettlementFailed(response, body, ctx.quotaRollbackRequested === true);
  ctx.quotaRollbackRequested = false;

  for (const ticket of tickets) {
    if (failed) ticket.release.reject(new Error('provider_error'));
    else ticket.release.resolve(PASS);
    try { await ticket.gatePromise; } catch (_) { /* rollback sudah dijalankan gate */ }
  }
  return response;
}

/* ============================================================ collector router ====== */

function collector(sink, wrap) {
  const add = (method, path, handler) => {
    sink.push([String(method).toUpperCase(), path, wrap(handler)]);
  };
  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    on: (m, p, h) => add(m, p, h),
    add: (m, p, h) => add(m, p, h)
  };
}

function wrapQuota(handler) {
  return async (ctx) => {
    const guard = requireIdentity(ctx);
    if (guard) return guard;
    if (!quotaDb(ctx.env)) {
      return jsonError(503, ERR.UNAVAILABLE, {}, { headers: Object.assign({}, ctx.corsHeaders, NO_STORE_HEADERS) });
    }
    return handler(quotaCtxFor(ctx));
  };
}

function wrapAnalytics(handler) {
  return async (ctx) =>
    handler({ request: requestFor(ctx), env: analyticsEnv(ctx.env), ctx: ctx.executionCtx });
}

// Konvensi handler lane learning = konvensi analytics ({request, env, ctx});
// adapter `wrap` di dalam registerLearningRoutes yang membongkarnya.
function wrapLearning(handler) {
  return async (ctx) =>
    handler({ request: requestFor(ctx), env: learningEnv(ctx.env), ctx: ctx.executionCtx });
}

// Konvensi handler lane bukti = konvensi learning ({request, env, ctx}).
function wrapEvidence(handler) {
  return async (ctx) =>
    handler({ request: requestFor(ctx), env: evidenceEnv(ctx.env), ctx: ctx.executionCtx });
}

/**
 * AI/TTS: identitas WAJIB (tanpa subjek tidak ada kuota yang bisa ditagih, dan
 * tanpa kuota jalur ini adalah pintu biaya terbuka), lalu handler dipanggil
 * dengan konvensi posisional, lalu reservasi kuota diselesaikan.
 */
function wrapMetered(handler, requiresIdentity) {
  return async (ctx) => {
    if (requiresIdentity) {
      const guard = requireIdentity(ctx);
      if (guard) return guard;
    }
    const request = requestFor(ctx);
    CTX_BY_REQUEST.set(request, ctx);
    let response = null;
    try {
      response = await handler(request, ctx.env, ctx.executionCtx);
      return response;
    } finally {
      await settleQuota(ctx, response);
      CTX_BY_REQUEST.delete(request);
    }
  };
}

/* ============================================================ pemasangan =========== */

/**
 * Bangun daftar rute tambahan. Dipanggil sekali per isolate dari
 * `route-slots.js`. `deps.enforceQuota` adalah SATU fungsi stabil yang mencari
 * ctx permintaan lewat WeakMap objek Request — `globalThis.FIEZEL_ENFORCE_QUOTA`
 * (jalur yang ditawarkan E5) SENGAJA tidak dipakai: state per-permintaan di
 * global adalah cara paling mudah membocorkan kuota pengguna A ke pengguna B.
 */
export function buildExtraRoutes() {
  const routes = [];

  // [E3] KUOTA — GET /api/quota
  registerQuotaRoutes(collector(routes, wrapQuota));

  // [E4] ANALYTICS — POST /api/usage/events, POST /api/usage/retention,
  //      GET /api/usage/pepper. Tetap terdaftar walau `ANALYTICS_ENABLED=off`:
  //      modul E4 sendiri yang menjawab 202 `{disabled:true}`, dan itu penting
  //      supaya klien lama tidak melihat 404 lalu mengulang tanpa henti.
  registerAnalyticsRoutes(collector(routes, wrapAnalytics));

  // [BRAIN] LANE TELEMETRI BELAJAR — POST /api/learning/events. Tetap
  //      terdaftar walau `LEARNING_ENABLED=off` (default): modul learning
  //      sendiri yang menjawab 202 `{disabled:true}`, alasan yang sama dengan
  //      analytics — 404 membuat klien retry tanpa henti, 202 membuatnya
  //      berhenti sopan. Identitas SENGAJA tidak dituntut: payload-nya memang
  //      tidak boleh punya identitas (docs/BRAIN-TELEMETRY-SCHEMA.md §1.3).
  registerLearningRoutes(collector(routes, wrapLearning));

  // [BRAIN] LANE BUKTI BELAJAR BRAINCORE - POST /api/braincore/evidence.
  //      Alasan pendaftaran-selalu identik dengan dua lane di atas: modulnya
  //      sendiri yang menjawab 202 `{disabled:true}` saat `EVIDENCE_ENABLED`
  //      mati (default), supaya klien berhenti sopan alih-alih retry atas 404.
  //      Identitas SENGAJA tidak dituntut: payloadnya memang tidak boleh punya
  //      identitas - satu-satunya pengenal adalah `cohort` acak berotasi yang
  //      dibuat perangkat.
  registerEvidenceRoutes(collector(routes, wrapEvidence));

  // [E5] AI + TTS. `deps.enforceQuota` diselesaikan PER PERMINTAAN.
  const aiSink = [];
  const ttsSink = [];
  const bridge = enforceQuotaBridgeFactory();
  const rollbackBridge = rollbackQuotaBridgeFactory();
  const accountBudget = accountBudgetBridgeFactory();
  // P3/S2 - `rollbackQuota` dan `accountBudget` disuntikkan ke KEDUA jalur. P3 hanya
  // menyuntikkan `accountBudget` ke AI dengan alasan "TTS tidak memakai neuron Workers
  // AI" - alasan itu terbukti salah (lihat `accountBudgetBridgeFactory`): `route-tts.js`
  // memanggil binding `env.AI` yang sama dan menghabiskan kolam neuron yang sama.
  // Keduanya kini WAJIB: rutenya menolak jalan (503) kalau dep ini absen, jadi
  // perakitan yang lupa terlihat seketika alih-alih membuka plafon diam-diam.
  const aiDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge, accountBudget };
  const ttsDeps = { enforceQuota: bridge, rollbackQuota: rollbackBridge, accountBudget };
  RouteAi.registerAiRoutes(collector(aiSink, (h) => h), aiDeps);
  RouteTts.registerTtsRoutes(collector(ttsSink, (h) => h), ttsDeps);

  for (const [method, path, handler] of aiSink) {
    routes.push([method, path, wrapMetered(
      /**
       * P3 - GERBANG FLAG SERVER. INI LUBANG BIAYA YANG DITUTUP.
       *
       * Sebelum ini `cfAiEnabled` NOL kali dirujuk di jalur permintaan: ia hanya
       * DILAPORKAN ke klien oleh `route-config.js`. Artinya "AI mati" hanya berlaku bagi
       * klien yang sopan. Siapa pun di internet bisa `POST /api/auth/anon` (berhasil
       * tanpa syarat), lalu memanggil `/api/ai/task` dan membelanjakan jatah neuron akun
       * owner. Kuota per-pengguna tidak menolongnya: penyerang cukup menerbitkan banyak
       * sesi anon, karena kuota mengikat SESI, bukan biaya akun.
       *
       * Diletakkan DI SINI, di dalam `wrapMetered` tetapi SEBELUM handler, dengan sengaja:
       *   - sesudah identitas diperiksa (`requiresIdentity=true`), jadi urutan penolakan
       *     tetap 401 sebelum 403 - keadaan otentikasi tidak boleh terbaca dari perbedaan
       *     ini;
       *   - SEBELUM satu byte badan permintaan dibaca dan sebelum reservasi kuota apa pun,
       *     jadi penolakan ini murah dan `quotaCharged:false`-nya benar secara struktur,
       *     bukan sekadar dieja;
       *   - hanya membungkus rute AI. TTS punya flag dan biayanya sendiri.
       *
       * FAIL-CLOSED: `checkAiEnabled()` menolak juga ketika flag TIDAK TERBACA (KV galat,
       * binding hilang, kunci absen). Flag yang tidak bisa dibaca bukan izin.
       */
      async (request, env, executionCtx) => {
        const gate = await checkAiEnabled(env);
        if (!gate.allowed) {
          const ctx = CTX_BY_REQUEST.get(request);
          return RouteAi.aiDisabledResponse({
            reason: gate.reason,
            headers: (ctx && ctx.corsHeaders) || null
          });
        }
        return handler(request, env, executionCtx);
      },
      true
    )]);
  }
  for (const [method, path, handler] of ttsSink) {
    // `GET /api/tts/manifest` adalah katalog publik (tidak menyentuh kuota dan
    // tidak memuat apa pun milik pengguna), jadi ia tidak menuntut identitas.
    const metered = path === '/api/tts/render';
    routes.push([method, path, wrapMetered(
      /**
       * S3 - GERBANG FLAG TTS. LUBANG BIAYA KEDUA, DITEMUKAN DENGAN MENEMBAK PRODUKSI
       * HIDUP SESUDAH DEPLOY P3 (28 Agu 2026):
       *
       *   KV `cfg:flags` = { flags:{cfTtsEnabled:false}, enabled:{tts:false} }
       *   POST https://api.fiezel.my.id/api/ai/task   -> 403 `ai_disabled`, 141 ms, nol token
       *   POST https://api.fiezel.my.id/api/tts/render -> 200, DAN amplopnya memuat
       *      `accountNeuronsReleased` - artinya jalur render benar-benar berjalan: ia
       *      MEMESAN neuron akun lalu melepasnya.
       *
       * Jadi pagar P3 dipasang di jalur AI dan TIDAK di jalur TTS, padahal keduanya
       * membelanjakan kolam neuron yang SAMA lewat binding `env.AI` yang sama. "TTS mati"
       * hanya berlaku bagi klien yang sopan; siapa pun bisa `POST /api/auth/anon` lalu
       * membelanjakan jatah akun owner lewat `/api/tts/render`.
       *
       * DITUTUP DENGAN POLA YANG SAMA, BUKAN POLA BARU: `checkTtsEnabled()` adalah
       * `checkAiEnabled()` dengan satu baris tabel berbeda (`PAID_FEATURES` di
       * `feature-gate.js`). Dua mekanisme untuk satu maksud adalah cara celah berikutnya
       * lahir.
       *
       * URUTANNYA PENTING, dan bisa dibaca dari posisinya di sini: gerbang ini dipanggil
       * di dalam `wrapMetered` (jadi identitas sudah diperiksa - 401 tetap mendahului 403)
       * tetapi SEBELUM `handler`. Karena `route-tts.js` baru membaca badan permintaan,
       * memanggil `deps.enforceQuota`, memesan neuron akun, lalu menyentuh `env.AI` DI
       * DALAM handler, penolakan ini terjadi sebelum keempatnya. `quotaCharged:false`-nya
       * benar secara STRUKTUR, bukan karena dieja begitu.
       *
       * `GET /api/tts/manifest` SENGAJA tidak digerbangi: katalog suara tidak memanggil
       * model, tidak menyentuh kuota, dan tidak memesan neuron. Menutupnya hanya membuat
       * klien tidak bisa tahu suara apa yang ADA saat flag mati, tanpa menghemat sepeser
       * pun. Yang digerbangi adalah yang berbiaya.
       */
      async (request, env, executionCtx) => {
        if (metered) {
          const gate = await checkTtsEnabled(env);
          if (!gate.allowed) {
            const ctx = CTX_BY_REQUEST.get(request);
            return RouteTts.ttsDisabledResponse({
              reason: gate.reason,
              headers: (ctx && ctx.corsHeaders) || null
            });
          }
        }
        return handler(request, env, executionCtx);
      },
      metered
    )]);
  }

  return routes;
}

/* ============================================================ cron ================ */

/**
 * (a) Sweep reservasi kuota kedaluwarsa. Reservasi yang tidak pernah di-commit
 *     (worker mati, klien putus) menahan slot murid sampai dipanen. TTL-nya 30 s,
 *     jadi cron menit-an sudah jauh lebih cepat dari yang dibutuhkan.
 */
export async function runQuotaSweep(env, now) {
  const db = quotaDb(env);
  if (!db) return { skipped: 'no_binding' };
  const swept = await sweepExpiredReservations(db, now);
  const reconciled = await reconcileHeld(db, now);
  return { swept, reconciled };
}

/** (b) Rollup analytics harian + rotasi pepper. */
export async function runAnalyticsRollup(event, env, executionCtx) {
  return scheduledAnalytics(event, analyticsEnv(env), executionCtx);
}

/**
 * (c) Purge TTL lane bukti: dedup + `evidence_learner_day` yang lebih tua dari 14
 *     hari. BUKAN pemeliharaan opsional — `cohort` yang tidak pernah dipurge adalah
 *     identitas seumur hidup dengan nama lain, dan seluruh klaim privasi lane ini
 *     berdiri di atas jendela 14 hari itu.
 *
 * CATATAN JUJUR SOAL OBSERVABILITAS: job ini SENGAJA belum dibungkus `withCronRun`.
 * Daftar job cron (`CRON_JOBS` di cron-status.js) adalah enum tertutup yang dikunci
 * `tests/cron-contract-test.js` sampai ke JUMLAH baris yang ditinggalkan satu putaran cron;
 * menambah job ketiga adalah perubahan kontrak tersendiri. Sampai itu dikerjakan,
 * hasil purge hanya muncul di nilai balik `runScheduled` — artinya purge yang gagal
 * TIDAK akan terlihat di `/api/owner/cron-status`. Itu lubang yang diketahui, bukan
 * yang tersembunyi, dan tercatat di reports/BRAINCORE_LEARNER_EVIDENCE_PIPELINE.md.
 */
export async function runEvidencePurge(env, now) {
  const db = (env && env.EVIDENCE_DB) || null;
  if (!db) return { skipped: 'no_binding' };
  const today = new Date(Number.isFinite(now) ? now : Date.now()).toISOString().slice(0, 10);
  return purgeEvidence(db, today);
}

/**
 * Pemetaan cron -> job. Cron yang tidak dikenal (atau kosong, seperti saat
 * dipanggil gerbang) menjalankan KEDUANYA: lebih baik satu job jalan dua kali
 * (keduanya idempoten) daripada tidak jalan karena ekspresi cron diubah di
 * `wrangler.toml` tanpa mengubah berkas ini.
 */
/**
 * Purge lane bukti PER-MURID (SLOT 9). Database BERBEDA dari purge di atas —
 * `fiezel-core`, bukan `fiezel-evidence` — jadi ia job sendiri, bukan cabang di
 * dalam `runEvidencePurge`. TTL default 180 hari (LEARNER_EVIDENCE_LIMITS
 * .RETENTION_DAYS); menaikkannya berarti mengubah konstanta itu DAN
 * docs/D1-RETENTION.md §2.7, bukan menambah data diam-diam.
 *
 * Tanpa binding = `skipped`, bukan galat: lane ini boleh belum dipasang.
 */
export async function runLearnerEvidencePurge(env, now) {
  const db = quotaDb(env);
  if (!db) return { skipped: 'no_binding' };
  const today = new Date(Number.isFinite(now) ? now : Date.now()).toISOString().slice(0, 10);
  return purgeLearnerEvidence(db, today);
}

export const CRON_QUOTA_SWEEP = '*/5 * * * *';
export const CRON_ANALYTICS_ROLLUP = '5 17 * * *';

export async function runScheduled(event, env, executionCtx, now) {
  const cron = String((event && event.cron) || '');
  const at = Number.isFinite(now) ? now : Number((event && event.scheduledTime)) || Date.now();
  const out = { cron, quotaSweep: null, analyticsRollup: null, evidencePurge: null, learnerEvidencePurge: null };

  const wantSweep = cron === CRON_QUOTA_SWEEP || cron !== CRON_ANALYTICS_ROLLUP;
  const wantRollup = cron === CRON_ANALYTICS_ROLLUP || cron !== CRON_QUOTA_SWEEP;

  // A3: tiap job dibungkus `withCronRun` supaya SUKSES DAN GAGAL meninggalkan
  // satu baris `cron_run` di `fiezel-core`. Pembungkusnya tidak mengubah nilai
  // balik job dan tidak menelan galat (ia mencatat lalu melempar ulang), jadi
  // `try/catch` per job di bawah tetap satu-satunya penentu bentuk `out`.
  // Pencatatannya sendiri fail-soft: kalau `migrations/0003_cron.sql` belum
  // diterapkan, job tetap jalan. Rincian di `cron-status.js`.
  if (wantSweep) {
    try {
      out.quotaSweep = await withCronRun(quotaDb(env), CRON_JOBS.QUOTA_SWEEP, at, () => runQuotaSweep(env, at));
    } catch (e) { out.quotaSweep = { error: e && e.name }; }
  }
  if (wantRollup) {
    try {
      out.analyticsRollup = await withCronRun(quotaDb(env), CRON_JOBS.ANALYTICS_ROLLUP, at,
        () => runAnalyticsRollup(event, env, executionCtx));
    } catch (e) { out.analyticsRollup = { error: e && e.name }; }
    // Purge bukti mengikuti irama HARIAN yang sama dengan rollup, tetapi berdiri di
    // luar `withCronRun` rollup: kegagalan purge tidak boleh menandai rollup analytics
    // gagal, dan sebaliknya. Dua lane, dua kegagalan yang berbeda artinya.
    try {
      out.evidencePurge = await runEvidencePurge(env, at);
    } catch (e) { out.evidencePurge = { error: e && e.name }; }
    // Purge lane per-murid: database lain, retensi lain (180 hari), kegagalan lain.
    // Berdiri sendiri untuk alasan yang sama dengan purge di atas — bukti yang tidak
    // pernah dipurge adalah arsip, dan arsip yang gagal diam-diam adalah arsip permanen.
    try {
      out.learnerEvidencePurge = await runLearnerEvidencePurge(env, at);
    } catch (e) { out.learnerEvidencePurge = { error: e && e.name }; }
  }
  return out;
}
