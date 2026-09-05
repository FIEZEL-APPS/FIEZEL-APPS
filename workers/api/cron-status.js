/**
 * workers/api/cron-status.js — BUKTI bahwa cron benar-benar jalan (A3).
 *
 * ==========================================================================
 * MASALAH NYATA YANG DITUTUP BERKAS INI
 * ==========================================================================
 * Worker `fiezel-api` punya dua Cron Trigger di `wrangler.toml`:
 *
 *   tiap 5 menit   sweep reservasi kuota          (CRON_QUOTA_SWEEP)
 *   `5 17 * * *`   rollup analytics + rotasi pepper (00:05 WIB)
 *
 * Keduanya memikul kontrak yang bisa BOHONG tanpa suara:
 *   - sweep mati  -> slot kuota yang ditahan permintaan yang mati tidak pernah
 *                    kembali; murid kehilangan jatah sampai tengah malam;
 *   - rollup mati -> `dau_dedup` TIDAK dihapus dan pepper TIDAK dirotasi, jadi
 *                    klaim "server tidak bisa menyambung hari-1 ke hari-2"
 *                    menjadi klaim palsu, dan tidak ada satu pun orang tahu.
 *
 * Sebelum berkas ini, satu-satunya jejak cron adalah `console.log` di
 * `index.js`. Log Worker hanya bisa dibaca selama `wrangler tail` terbuka dan
 * `[observability]` SENGAJA tidak dinyalakan di plan gratis (lihat
 * `wrangler.toml`). Artinya: pertanyaan "kapan rollup terakhir sukses?" TIDAK
 * BISA DIJAWAB. Berkas ini membuatnya bisa dijawab dengan satu tabel D1
 * (`cron_run`, migrasi `migrations/0003_cron.sql`) dan satu endpoint owner.
 *
 * ==========================================================================
 * YANG SENGAJA TIDAK DISIMPAN
 * ==========================================================================
 *   - PESAN GALAT MENTAH. Hanya `error_class` berenum tertutup
 *     (`CRON_ERROR_CLASSES`). Pesan galat hulu bisa memuat SQL, nama tabel,
 *     potongan parameter, bahkan nilai secret; menyimpannya berarti menyalin
 *     isi galat ke penyimpanan permanen yang dibaca lewat HTTP.
 *   - DATA MURID. Tidak ada `user_id`, tidak ada token pengunjung, tidak ada
 *     teks apa pun milik murid. Bahkan JUMLAH baris yang tersentuh disimpan
 *     sebagai angka, bukan sebagai daftar.
 * `tests/cron-contract-test.js` butir (e) memindai isi tabel dan MEMERAH kalau salah
 * satu aturan ini dilanggar.
 *
 * ==========================================================================
 * GERBANG OWNER: KENAPA TIDAK MENGIMPOR GATE YANG SUDAH ADA
 * ==========================================================================
 * Gate owner yang sudah ada hidup di `workers/owner/index.js` — Worker TERPISAH
 * (`fiezel-owner`, `wrangler.toml` sendiri, graf modul sendiri, bahkan binding
 * D1 sendiri). `workers/api` TIDAK BOLEH mengimpor lintas Worker: satu `import
 * '../owner/index.js'` akan menarik seluruh dashboard HTML + `queries.js` ke
 * dalam bundle API murid, dan bundle itulah yang justru dijaga supaya nol byte
 * owner (alasan lengkap di kepala `workers/owner/index.js`).
 *
 * Jadi POLA-nya yang dipakai ulang, bukan modulnya — persis keputusan yang sudah
 * diambil `mw-edge.js` untuk `ctEq()`:
 *   - identitas owner datang dari SECRET, bukan dari "kebetulan pemilik Worker";
 *   - nama secret-nya SAMA (`OWNER_TOKEN_HASH` = sha256 HEX token owner), jadi
 *     owner memasang satu nilai untuk dua Worker dan tidak ada token kedua yang
 *     perlu diingat;
 *   - perbandingan WAKTU-KONSTAN (`ctEq` diimpor dari `mw-edge.js` — modul yang
 *     sama Worker, jadi ini impor yang sah dan bukan salinan ketiga);
 *   - FAIL-CLOSED: tanpa `OWNER_TOKEN_HASH`, endpoint ini 403 selalu. Ini
 *     BERBEDA dari `edgeGuard` yang punya mode `off` transisi, dan bedanya
 *     disengaja: gerbang edge yang fail-closed pada deploy pertama akan
 *     mematikan seluruh API murid; endpoint status cron yang fail-closed hanya
 *     mematikan satu alat internal.
 */

import { ctEq } from './mw-edge.js';
import { jsonResponse, jsonError } from './errors.js';

/* ========================================================================== */
/* Enum tertutup                                                              */
/* ========================================================================== */

/** Nama job. Nilai ini masuk kolom `cron_run.job` dan tidak boleh berubah diam-diam. */
export const CRON_JOBS = Object.freeze({
  QUOTA_SWEEP: 'quota_sweep',
  ANALYTICS_ROLLUP: 'analytics_rollup'
});

export const CRON_JOB_LIST = Object.freeze([CRON_JOBS.QUOTA_SWEEP, CRON_JOBS.ANALYTICS_ROLLUP]);

/**
 * KELAS galat — satu-satunya bentuk galat yang boleh masuk D1.
 * Daftar tertutup: apa pun yang tidak dikenali menjadi `unknown`, BUKAN menjadi
 * teks galat aslinya.
 */
export const CRON_ERROR_CLASSES = Object.freeze([
  'd1_error',        // penyimpanan menolak/tidak tersedia (termasuk tabel belum dimigrasi)
  'timeout',         // batas waktu isolate/subrequest
  'aborted',         // dibatalkan (AbortSignal)
  'type_error',      // bug programnya sendiri: bentuk data tidak seperti yang diandaikan
  'crypto_error',    // crypto tidak tersedia di runtime
  'binding_missing', // binding D1/KV belum terpasang -> job tidak pernah jalan
  'flag_off',        // fitur dimatikan owner -> kontrak TIDAK terpenuhi hari itu
  'unknown'
]);

/** Umur simpan catatan cron. Cukup untuk melihat pola dua bulan, tidak lebih. */
export const CRON_RUN_RETENTION_DAYS = 60;

/** Jendela default ringkasan `/api/owner/cron-status?days=N`. */
export const CRON_STATUS_DEFAULT_DAYS = 7;
export const CRON_STATUS_MAX_DAYS = 60;

export const CRON_STATUS_PATH = '/api/owner/cron-status';
export const OWNER_TOKEN_HEADER = 'x-fiezel-owner-token';

/* ========================================================================== */
/* SQL (satu tempat, supaya bisa dibaca gerbang tanpa menjalankan Worker)      */
/* ========================================================================== */

export const CRON_SQL = Object.freeze({
  insertRun:
    'INSERT INTO cron_run (job, day, started_at, finished_at, ok, rows_affected, error_class) ' +
    'VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
  purgeOlderThan:
    'DELETE FROM cron_run WHERE day < ?1',
  readRange:
    'SELECT job, day, started_at, finished_at, ok, rows_affected, error_class FROM cron_run ' +
    'WHERE day >= ?1 AND day <= ?2 ORDER BY started_at'
});

/* ========================================================================== */
/* Pembantu murni                                                             */
/* ========================================================================== */

const DAY_MS = 86400000;

export function cronDayKey(ms) {
  const t = Number(ms);
  return new Date(Number.isFinite(t) && t > 0 ? t : 0).toISOString().slice(0, 10);
}

export function shiftCronDay(day, deltaDays) {
  const t = Date.parse(`${day}T00:00:00Z`);
  return cronDayKey(t + deltaDays * DAY_MS);
}

/**
 * classifyError(err) -> satu nilai dari CRON_ERROR_CLASSES.
 *
 * Fungsi ini MEMBACA pesan galat (untuk memutuskan kelas) tetapi TIDAK PERNAH
 * MENGEMBALIKANNYA. Itu bedanya antara "melihat sekali di memori" dan "menyalin
 * ke penyimpanan permanen yang bisa dibaca lewat HTTP".
 */
export function classifyError(err) {
  if (!err) return 'unknown';
  const name = String((err && err.name) || '');
  const text = String((err && err.message) || '');
  if (name === 'AbortError') return 'aborted';
  if (name === 'TimeoutError' || /\btimed?\s?out\b|deadline|exceeded time/i.test(text)) return 'timeout';
  if (/^D1_|D1_UNKNOWN_TABLE|D1_UNSUPPORTED_SQL|D1_CONSTRAINT|no such table|constraint failed|database is locked|storage/i.test(text)) return 'd1_error';
  if (/crypto_unavailable|SubtleCrypto/i.test(text)) return 'crypto_error';
  if (/no_binding|binding|not bound/i.test(text)) return 'binding_missing';
  if (name === 'TypeError') return 'type_error';
  return 'unknown';
}

/**
 * Hasil job -> angka `rows_affected`. Kalau job "sukses tapi tidak menyentuh
 * apa pun", angkanya 0 dan itu jawaban yang sah (sweep tanpa reservasi = 0).
 *
 * `skipped` BUKAN sukses: job yang tidak jalan karena flag mati atau binding
 * hilang tidak memenuhi kontraknya, jadi ia dicatat sebagai GAGAL dengan kelas
 * `flag_off` / `binding_missing`. Menandainya sukses akan membuat dashboard
 * menjawab "rollup sukses tadi malam" untuk malam di mana token harian TIDAK
 * dihapus — kebohongan paling mahal yang bisa dihasilkan berkas ini.
 */
export function outcomeOf(job, result) {
  if (result && typeof result === 'object' && result.skipped) {
    const cls = result.skipped === 'flag_off' ? 'flag_off'
      : result.skipped === 'no_binding' ? 'binding_missing'
        : 'unknown';
    return { ok: 0, errorClass: cls, rows: 0 };
  }
  return { ok: 1, errorClass: null, rows: rowsAffectedFrom(job, result) };
}

export function rowsAffectedFrom(job, result) {
  const int = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);
  if (!result || typeof result !== 'object') return 0;
  if (job === CRON_JOBS.QUOTA_SWEEP) {
    const reaped = int(result.swept && result.swept.reaped);
    const users = int(result.reconciled && result.reconciled.users);
    return reaped + users;
  }
  if (job === CRON_JOBS.ANALYTICS_ROLLUP) {
    // Baris yang benar-benar tersentuh yang paling berarti bagi kontrak privasi:
    // jumlah token harian yang dihitung lalu DIHAPUS.
    return int(result.dau);
  }
  return int(result.rows_affected || result.rowsAffected);
}

/* ========================================================================== */
/* Pencatatan                                                                 */
/* ========================================================================== */

/**
 * Tulis satu baris `cron_run`. TIDAK PERNAH MELEMPAR.
 *
 * Alasan keras: pencatatan adalah observabilitas, dan observabilitas yang bisa
 * menjatuhkan job yang diobservasinya adalah kemunduran. Kalau migrasi
 * `0003_cron.sql` belum dijalankan owner, INSERT ini gagal `D1_UNKNOWN_TABLE` —
 * dan yang benar terjadi adalah sweep/rollup TETAP JALAN, dengan satu baris
 * `console.warn` yang menyebut migrasi mana yang belum diterapkan.
 */
export async function recordCronRun(db, entry) {
  if (!db || typeof db.prepare !== 'function') return { recorded: false, reason: 'no_binding' };
  const job = String((entry && entry.job) || '');
  if (!CRON_JOB_LIST.includes(job)) return { recorded: false, reason: 'unknown_job' };

  const startedAt = Math.trunc(Number(entry.startedAt) || 0);
  const finishedAt = Math.trunc(Number(entry.finishedAt) || startedAt);
  const day = entry.day || cronDayKey(startedAt);
  const ok = entry.ok ? 1 : 0;
  const rows = Math.max(0, Math.trunc(Number(entry.rowsAffected) || 0));
  // Kelas galat dipaksa masuk enum. Nilai di luar daftar TIDAK ditulis apa
  // adanya (itulah cara pesan galat mentah menyelinap ke tabel).
  const errorClass = ok ? null
    : (CRON_ERROR_CLASSES.includes(entry.errorClass) ? entry.errorClass : 'unknown');

  try {
    await db.prepare(CRON_SQL.insertRun).bind(job, day, startedAt, finishedAt, ok, rows, errorClass).run();
  } catch (err) {
    console.warn('fiezel-api cron_run tidak tercatat', classifyError(err),
      '— jalankan: wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql');
    return { recorded: false, reason: classifyError(err) };
  }

  // Purge retensi HANYA pada job harian. Sweep berjalan 288x sehari; menempelkan
  // satu DELETE pada tiap sweep adalah 288 tulis D1 per hari yang dibayar untuk
  // pekerjaan yang cukup dilakukan sekali.
  if (job === CRON_JOBS.ANALYTICS_ROLLUP) {
    try {
      await db.prepare(CRON_SQL.purgeOlderThan).bind(shiftCronDay(day, -CRON_RUN_RETENTION_DAYS)).run();
    } catch (_) { /* purge yang gagal bukan alasan menjatuhkan rollup */ }
  }
  return { recorded: true, job, day, ok };
}

/**
 * Jalankan satu job cron dan CATAT hasilnya, sukses maupun gagal.
 *
 * Galat job diteruskan APA ADANYA ke pemanggil (`route-wiring.runScheduled`
 * sudah menangkapnya per job supaya kegagalan satu job tidak membatalkan job
 * lain). Yang ditambahkan di sini cuma: satu baris bukti sebelum galat itu
 * hilang.
 *
 * `now` masuk sebagai PARAMETER (disiplin jam palsu repo ini). `Date.now()`
 * dipakai HANYA untuk selisih durasi bila jam tidak diberikan.
 */
export async function withCronRun(db, job, now, fn) {
  const startedAt = Number.isFinite(Number(now)) && Number(now) > 0 ? Math.trunc(Number(now)) : Date.now();
  const day = cronDayKey(startedAt);
  try {
    const result = await fn();
    const outcome = outcomeOf(job, result);
    await recordCronRun(db, {
      job, day, startedAt, finishedAt: startedAt,
      ok: outcome.ok, rowsAffected: outcome.rows, errorClass: outcome.errorClass
    });
    return result;
  } catch (err) {
    await recordCronRun(db, {
      job, day, startedAt, finishedAt: startedAt,
      ok: 0, rowsAffected: 0, errorClass: classifyError(err)
    });
    throw err;
  }
}

/* ========================================================================== */
/* Pembacaan + ringkasan                                                      */
/* ========================================================================== */

export async function readCronRuns(db, fromDay, toDay) {
  if (!db || typeof db.prepare !== 'function') return [];
  const res = await db.prepare(CRON_SQL.readRange).bind(fromDay, toDay).all();
  return (res && res.results) || [];
}

/**
 * Ringkasan N hari per job. FUNGSI MURNI: agregasi dilakukan di JS, bukan lewat
 * `GROUP BY`, karena jumlah barisnya kecil (2 job x <=289 jalan/hari x 60 hari)
 * dan karena fungsi murni bisa diuji tanpa D1 sama sekali.
 *
 * Yang dikembalikan per job, dan kenapa masing-masing ada:
 *   lastSuccessAt   kapan kontraknya terakhir benar-benar dipenuhi;
 *   failed          berapa kali gagal (kalau 0 selamanya, curigai pencatatannya);
 *   rowsAffected    total baris tersentuh — nol terus-menerus untuk rollup
 *                   berarti tidak ada token yang pernah dihapus;
 *   errorClasses    peta KELAS galat -> jumlah. Tidak ada pesan, tidak ada stack;
 *   staleDays       berapa hari sejak sukses terakhir (null = belum pernah).
 */
export function summarizeCronRuns(rows, options = {}) {
  const days = clampDays(options.days);
  const today = options.today || cronDayKey(options.now || 0);
  const from = shiftCronDay(today, -(days - 1));
  const jobs = Array.isArray(options.jobs) && options.jobs.length ? options.jobs : CRON_JOB_LIST;

  const summary = {};
  for (const job of jobs) {
    summary[job] = {
      job, runs: 0, ok: 0, failed: 0, rowsAffected: 0,
      lastRunAt: null, lastSuccessAt: null, lastSuccessDay: null,
      staleDays: null, errorClasses: {}, everSucceeded: false
    };
  }

  for (const row of Array.isArray(rows) ? rows : []) {
    const job = row && String(row.job || '');
    if (!summary[job]) continue;
    const day = String(row.day || '');
    if (day < from || day > today) continue;
    const entry = summary[job];
    const startedAt = Math.trunc(Number(row.started_at) || 0);
    entry.runs += 1;
    entry.rowsAffected += Math.max(0, Math.trunc(Number(row.rows_affected) || 0));
    if (entry.lastRunAt === null || startedAt > entry.lastRunAt) entry.lastRunAt = startedAt;
    if (Number(row.ok) === 1) {
      entry.ok += 1;
      entry.everSucceeded = true;
      if (entry.lastSuccessAt === null || startedAt > entry.lastSuccessAt) {
        entry.lastSuccessAt = startedAt;
        entry.lastSuccessDay = day;
      }
    } else {
      entry.failed += 1;
      // Kelas di luar enum dihitung sebagai `unknown`: baris lama dari versi
      // sebelumnya tidak boleh menyuntikkan label bebas ke respons owner.
      const cls = CRON_ERROR_CLASSES.includes(row.error_class) ? row.error_class : 'unknown';
      entry.errorClasses[cls] = (entry.errorClasses[cls] || 0) + 1;
    }
  }

  for (const entry of Object.values(summary)) {
    if (entry.lastSuccessDay) {
      entry.staleDays = Math.max(0, Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${entry.lastSuccessDay}T00:00:00Z`)) / DAY_MS
      ));
    }
  }

  return { days, from, to: today, jobs: jobs.map((j) => summary[j]) };
}

function clampDays(value) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n <= 0) return CRON_STATUS_DEFAULT_DAYS;
  return Math.min(CRON_STATUS_MAX_DAYS, n);
}

/* ========================================================================== */
/* Gerbang owner + rute                                                       */
/* ========================================================================== */

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Repo tidak pernah menyimpan token owner, hanya HASH-nya (pola workers/owner). */
export function ownerConfigured(env) {
  const raw = env && env.OWNER_TOKEN_HASH;
  return typeof raw === 'string' && raw.trim().length >= 32;
}

/**
 * ownerGate(ctx) -> null (lolos) | Response 403.
 *
 * SATU bentuk penolakan untuk semua sebab (tidak ada header, header salah,
 * secret belum dipasang): penyerang tidak boleh bisa membedakan "tokenmu salah"
 * dari "belum ada owner sama sekali" — aturan anti-oracle `errors.js` yang sama
 * dipakai `mw-edge.js`.
 */
export async function ownerGate(ctx) {
  const denied = jsonError(403, 'forbidden_owner', {}, {
    headers: Object.assign({ 'cache-control': 'no-store', vary: 'Origin' }, (ctx && ctx.corsHeaders) || {})
  });
  if (!ownerConfigured(ctx && ctx.env)) return denied;

  const headers = ctx.request && ctx.request.headers;
  const presented = (headers && (headers.get(OWNER_TOKEN_HEADER) || bearer(headers.get('authorization')))) || '';
  if (!presented) return denied;

  let digest = '';
  try { digest = await sha256Hex(presented); } catch (_) { return denied; }
  // Perbandingan waktu-konstan atas DIGEST, bukan atas token. `ctEq` diimpor
  // dari `mw-edge.js` (Worker yang sama) supaya tidak ada salinan ketiga.
  if (!ctEq(digest, String(ctx.env.OWNER_TOKEN_HASH).trim().toLowerCase())) return denied;
  return null;
}

function bearer(value) {
  const m = /^Bearer\s+(.+)$/i.exec(String(value || ''));
  return m ? m[1].trim() : '';
}

/** D1 tempat `cron_run` hidup: `fiezel-core` (`CORE_DB`; `DB` dipakai harness uji). */
export function cronDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * GET /api/owner/cron-status[?days=N]
 *
 * Hanya AGREGAT operasional. Tidak ada satu pun baris murid, tidak ada satu pun
 * pesan galat. Kalau tabel belum dimigrasi, jawabannya 200 dengan
 * `migrated:false` — bukan 500: owner harus bisa membedakan "cron tidak jalan"
 * dari "tabel buktinya belum dibuat", dan dua kegagalan itu punya perbaikan yang
 * sama sekali berbeda.
 */
export async function routeCronStatus(ctx) {
  const gate = await ownerGate(ctx);
  if (gate) return gate;

  const headers = Object.assign({ 'cache-control': 'no-store' }, ctx.corsHeaders || {});
  const days = clampDays(ctx.url && ctx.url.searchParams && ctx.url.searchParams.get('days'));
  const today = cronDayKey(ctx.now);
  const from = shiftCronDay(today, -(days - 1));
  const db = cronDb(ctx.env);

  let rows = [];
  let migrated = true;
  let readError = null;
  if (!db) {
    migrated = false;
    readError = 'binding_missing';
  } else {
    try {
      rows = await readCronRuns(db, from, today);
    } catch (err) {
      migrated = false;
      readError = classifyError(err);
      rows = [];
    }
  }

  const summary = summarizeCronRuns(rows, { days, today });
  return jsonResponse({
    schema: 'fiezel-cron-status-v1',
    protocol: '1.7',
    generatedAt: ctx.now,
    window: { days: summary.days, from: summary.from, to: summary.to },
    migrated,
    readError,                  // KELAS galat saja, sama aturannya dengan tabel
    expected: {
      [CRON_JOBS.QUOTA_SWEEP]: { cron: '*/5 * * * *', runsPerDay: 288 },
      [CRON_JOBS.ANALYTICS_ROLLUP]: { cron: '5 17 * * *', runsPerDay: 1 }
    },
    jobs: summary.jobs,
    // Kejujuran yang wajib ikut: catatan ini dibuat OLEH job yang diamati. Kalau
    // Worker tidak pernah dijalankan sama sekali (cron dicabut di dashboard
    // Cloudflare), tabelnya kosong dan `runs:0` — itu tanda cron mati, BUKAN
    // tanda tidak ada masalah.
    note: 'runs:0 berarti tidak ada bukti cron berjalan pada jendela ini — bukan berarti cron sehat.'
  }, { status: 200, headers });
}

/**
 * Rute untuk `route-slots.js` (SLOT 6). Bentuk `[metode, path, handler(ctx)]`
 * sama dengan rute fase 1 — sengaja TIDAK lewat `route-wiring.js` karena rute
 * ini tidak butuh jembatan kuota, tidak butuh identitas murid, dan tidak boleh
 * ikut ke dalam daftar rute berbiaya.
 */
export const ROUTES = Object.freeze([['GET', CRON_STATUS_PATH, routeCronStatus]]);

export default {
  CRON_JOBS, CRON_JOB_LIST, CRON_ERROR_CLASSES, CRON_SQL, CRON_STATUS_PATH,
  CRON_RUN_RETENTION_DAYS, CRON_STATUS_DEFAULT_DAYS, CRON_STATUS_MAX_DAYS,
  cronDayKey, shiftCronDay, classifyError, outcomeOf, rowsAffectedFrom,
  recordCronRun, withCronRun, readCronRuns, summarizeCronRuns,
  ownerConfigured, ownerGate, cronDb, routeCronStatus, ROUTES
};
