/**
 * FIEZEL E4 — lapisan D1 untuk analytics. HANYA TABEL AGREGAT.
 *
 * OTORITAS: EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL".
 *
 * ###########################################################################
 * #  TABEL ANALYTICS DILARANG DI-JOIN DENGAN TABEL KUOTA.                    #
 * #  Kuota hidup di database D1 lain (`fiezel-quota`) dan memakai `user_id`.  #
 * #  Analytics hidup di `fiezel-analytics` dan memakai token harian yang      #
 * #  dibuang setiap malam. Tidak ada kolom penghubung, jadi JOIN-nya bukan    #
 * #  "dilarang oleh kebijakan" — ia tidak bisa ditulis. Jangan pernah         #
 * #  menambahkan binding kuota ke Worker yang membaca database ini.           #
 * ###########################################################################
 *
 * Bentuk `db` yang diharapkan: antarmuka D1 standar
 *   db.prepare(sql).bind(...args) -> { run(), all(), first() }
 *   db.batch([stmt, ...])
 * Semua penyusun pernyataan di bawah adalah fungsi murni yang mengembalikan
 * `{ sql, params }`, supaya bisa diuji dengan Node polos tanpa D1 asli.
 */

import { ANALYTICS_TABLES as _tables } from './analytics-tables.js';
import { initialPepperState, newPepper } from './analytics-core.js';

export const ANALYTICS_TABLES = _tables;

/** Tabel yang DILARANG disebut di dalam kueri analytics mana pun. */
export const FORBIDDEN_TABLES = Object.freeze(['quota', 'quota_daily', 'identity', 'sessions', 'users', 'user_quota']);

/* --------------------------------------------------------------------------
 * Penyusun pernyataan (murni)
 * -------------------------------------------------------------------------- */

export const SQL = Object.freeze({
  upsertMetric:
    'INSERT INTO metrics_daily (day, metric, value) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(day, metric) DO UPDATE SET value = value + excluded.value',
  setMetric:
    'INSERT INTO metrics_daily (day, metric, value) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(day, metric) DO UPDATE SET value = excluded.value',
  // Tulis monoton: nilai hanya boleh naik. Dipakai untuk `dau`, karena
  // sumbernya (`dau_dedup`) SENGAJA dihapus setiap malam. Tanpa ini, rollup
  // yang berjalan dua kali akan menimpa DAU 312 menjadi 0 — dan itu bukan
  // hipotesis, itu bug yang tertangkap gerbang idempotensi.
  setMetricMax:
    'INSERT INTO metrics_daily (day, metric, value) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(day, metric) DO UPDATE SET value = MAX(value, excluded.value)',
  upsertUsage:
    'INSERT INTO usage_daily (day, bucket, count) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(day, bucket) DO UPDATE SET count = count + excluded.count',
  upsertRetention:
    'INSERT INTO retention_daily (cohort_day, day_index, count) VALUES (?1, ?2, ?3) ' +
    'ON CONFLICT(cohort_day, day_index) DO UPDATE SET count = count + excluded.count',
  insertDauToken:
    'INSERT OR IGNORE INTO dau_dedup (day, token) VALUES (?1, ?2)',
  // Dedup batch (temuan council gpt_5_6_sol §4.3 / opus §1.3): pola yang sama
  // dengan dau_dedup — INSERT OR IGNORE, hidup pendek, dihapus rutin.
  insertBatchId:
    'INSERT OR IGNORE INTO batch_dedup (batch_id, day) VALUES (?1, ?2)',
  selectBatchId:
    'SELECT day FROM batch_dedup WHERE batch_id = ?1',
  purgeBatchDedupOlderThan:
    'DELETE FROM batch_dedup WHERE day < ?1',
  countDauTokens:
    'SELECT COUNT(*) AS n FROM dau_dedup WHERE day = ?1',
  // Pagar kewarasan rollup (A3): apakah hari itu ADA pemakaian yang tercatat?
  // Dipakai untuk membedakan "hari benar-benar sepi" (0 pemakaian, 0 token) dari
  // "pengumpulan token rusak" (ada pemakaian, 0 token). Menghitung BARIS bucket
  // agregat, bukan orang: `usage_daily` tidak memuat pengenal siapa pun.
  countUsageRows:
    'SELECT COUNT(*) AS n FROM usage_daily WHERE day = ?1',
  purgeDauDay:
    'DELETE FROM dau_dedup WHERE day = ?1',
  purgeDauOlderThan:
    'DELETE FROM dau_dedup WHERE day <= ?1',
  readMetricRange:
    'SELECT day, value FROM metrics_daily WHERE metric = ?1 AND day >= ?2 AND day <= ?3 ORDER BY day',
  purgeUsageOlderThan:
    'DELETE FROM usage_daily WHERE day < ?1',
  purgeRetentionOlderThan:
    'DELETE FROM retention_daily WHERE cohort_day < ?1',
  readPepper:
    'SELECT rotated_at, current, previous FROM pepper_state WHERE id = 1',
  // INISIALISASI MALAS. `DO NOTHING` adalah seluruh jaminannya: baris pepper
  // hanya bisa lahir SEKALI. Dua permintaan bersamaan yang keduanya melihat
  // tabel kosong akan sama-sama menjalankan pernyataan ini; SQLite/D1
  // menyelesaikannya satu per satu pada kunci utama `id = 1`, jadi yang kedua
  // TIDAK menulis apa pun dan TIDAK menyentuh `current`. Ini bukan
  // cek-lalu-tulis: tidak ada jendela antara "belum ada" dan "tulis" yang bisa
  // dibalap, karena keputusan menulis diambil oleh basis data, bukan oleh kode
  // Worker. `previous` sengaja NULL: putaran pertama belum punya pendahulu.
  initPepper:
    'INSERT INTO pepper_state (id, rotated_at, current, previous) VALUES (1, ?1, ?2, NULL) ' +
    'ON CONFLICT(id) DO NOTHING',
  writePepper:
    'INSERT INTO pepper_state (id, rotated_at, current, previous) VALUES (1, ?1, ?2, ?3) ' +
    'ON CONFLICT(id) DO UPDATE SET rotated_at = excluded.rotated_at, current = excluded.current, previous = excluded.previous'
});

/**
 * Susun semua pernyataan tulis untuk satu hasil aggregate().
 * Satu batch D1 per permintaan — bukan satu subrequest per event.
 */
export function aggregateStatements(agg) {
  const out = [];
  if (!agg) return out;

  for (const [day, metrics] of Object.entries(agg.metrics || {})) {
    for (const [metric, value] of Object.entries(metrics)) {
      if (!Number.isFinite(value) || value === 0) continue;
      out.push({ sql: SQL.upsertMetric, params: [day, metric, value] });
    }
  }
  for (const [day, buckets] of Object.entries(agg.usage || {})) {
    for (const [bucket, count] of Object.entries(buckets)) {
      if (!Number.isFinite(count) || count === 0) continue;
      out.push({ sql: SQL.upsertUsage, params: [day, bucket, count] });
    }
  }
  for (const [cohort, offsets] of Object.entries(agg.retention || {})) {
    for (const [dayIndex, count] of Object.entries(offsets)) {
      if (!Number.isFinite(count) || count === 0) continue;
      out.push({ sql: SQL.upsertRetention, params: [cohort, Number(dayIndex), count] });
    }
  }
  // Token harian: INSERT OR IGNORE => dedup di level basis data, idempoten.
  for (const row of agg.dau || []) {
    if (!row || !row.day || !row.token) continue;
    out.push({ sql: SQL.insertDauToken, params: [row.day, row.token] });
  }
  return out;
}

/** Jalankan daftar pernyataan sebagai satu batch D1. */
export async function runStatements(db, statements) {
  if (!statements || statements.length === 0) return { applied: 0 };
  const prepared = statements.map(s => db.prepare(s.sql).bind(...s.params));
  if (typeof db.batch === 'function') await db.batch(prepared);
  else for (const p of prepared) await p.run();
  return { applied: statements.length };
}

export async function applyAggregate(db, agg) {
  return runStatements(db, aggregateStatements(agg));
}

/* --------------------------------------------------------------------------
 * DAU / metrik
 * -------------------------------------------------------------------------- */

export async function countDauTokens(db, day) {
  const row = await db.prepare(SQL.countDauTokens).bind(day).first();
  return Number((row && (row.n ?? row.N)) || 0);
}

/** Jumlah baris bucket `usage_daily` pada satu hari (0 = tidak ada pemakaian). */
export async function countUsageRows(db, day) {
  const row = await db.prepare(SQL.countUsageRows).bind(day).first();
  return Math.max(0, Math.trunc(Number(row && row.n) || 0));
}

/** Tulis nilai metrik apa adanya (bukan increment) — dipakai rollup agar idempoten. */
export async function setMetric(db, day, metric, value) {
  await db.prepare(SQL.setMetric).bind(day, metric, Math.trunc(Number(value) || 0)).run();
}

/**
 * Tulis nilai hanya bila lebih besar dari yang tersimpan. Ini yang membuat
 * rollup idempoten DAN tetap benar untuk event yang datang terlambat (offline
 * backfill): angka boleh bertambah, tidak boleh mundur.
 */
export async function setMetricAtLeast(db, day, metric, value) {
  await db.prepare(SQL.setMetricMax).bind(day, metric, Math.trunc(Number(value) || 0)).run();
}

export async function readMetricRange(db, metric, fromDay, toDay) {
  const res = await db.prepare(SQL.readMetricRange).bind(metric, fromDay, toDay).all();
  const rows = (res && res.results) || [];
  return rows.map(r => ({ day: r.day, value: Number(r.value) || 0 }));
}

/**
 * HAPUS token harian. Wajib dipanggil rollup. Ini bukan optimasi ruang; ini
 * bagian dari kontrak: tanpa purge, `dau_dedup` menjadi arsip perangkat.
 */
export async function purgeDauDedup(db, day) {
  await db.prepare(SQL.purgeDauDay).bind(day).run();
}

/** Jaring pengaman: kalau satu hari terlewat purge-nya, hari-hari lama tetap dibersihkan. */
export async function purgeDauDedupOlderThan(db, day) {
  await db.prepare(SQL.purgeDauOlderThan).bind(day).run();
}

export async function purgeUsageOlderThan(db, day) {
  await db.prepare(SQL.purgeUsageOlderThan).bind(day).run();
}

export async function purgeRetentionOlderThan(db, day) {
  await db.prepare(SQL.purgeRetentionOlderThan).bind(day).run();
}

/* --------------------------------------------------------------------------
 * Dedup batch — kunci idempotensi berumur pendek
 * -------------------------------------------------------------------------- */

/**
 * markBatchSeen(db, batchId, day) -> true bila batch BARU (boleh diagregasi),
 * false bila sudah pernah terlihat (retry klien: JANGAN agregasi ulang).
 *
 * Kenapa SELECT dulu baru INSERT OR IGNORE, bukan INSERT saja:
 * beberapa driver/tiruan D1 tidak melaporkan `meta.changes`, dan tanpa angka
 * itu INSERT OR IGNORE tunggal tidak bisa membedakan "baru" dari "diabaikan".
 * SELECT-dulu benar untuk semua driver; `meta.changes` (bila ada) tetap
 * dipakai sebagai penutup balapan dua retry paralel: yang kalah balapan
 * mendapat changes = 0 dan diperlakukan sebagai duplikat.
 */
export async function markBatchSeen(db, batchId, day) {
  const id = String(batchId);
  const seen = await db.prepare(SQL.selectBatchId).bind(id).first();
  if (seen) return false;
  const res = await db.prepare(SQL.insertBatchId).bind(id, String(day)).run();
  const changes = res && res.meta ? Number(res.meta.changes) : NaN;
  if (Number.isFinite(changes)) return changes > 0;
  return true;
}

/**
 * HAPUS kunci dedup yang jendela retry-nya sudah lewat. Ini bagian dari
 * kontrak privasi: batch_id memang acak (bukan identitas), tetapi janji
 * "tidak menyimpan lebih lama dari jendela retry" tetap harus ditepati.
 */
export async function purgeBatchDedupOlderThan(db, day) {
  await db.prepare(SQL.purgeBatchDedupOlderThan).bind(day).run();
}

/* --------------------------------------------------------------------------
 * Pepper
 * -------------------------------------------------------------------------- */

export async function readPepperState(db) {
  const row = await db.prepare(SQL.readPepper).first();
  if (!row) return null;
  return {
    rotated_at: Number(row.rotated_at) || 0,
    current: row.current || null,
    previous: row.previous || null
  };
}

/**
 * Tulis state pepper. Hanya `current` + satu `previous` yang pernah ada di
 * baris ini; pepper yang lebih tua tertimpa dan tidak disalin ke mana pun.
 */
export async function writePepperState(db, state) {
  await db.prepare(SQL.writePepper)
    .bind(Math.trunc(Number(state.rotated_at) || 0), String(state.current), state.previous ? String(state.previous) : null)
    .run();
}

/**
 * ensurePepperState(db, now, opts) -> { state, created }
 *
 * Satu-satunya jalan yang boleh dipakai jalur permintaan untuk MEMBACA pepper.
 * Kalau `pepper_state` masih kosong (basis data baru), pepper putaran pertama
 * dibuat di sini — supaya hari pertama tidak buta menunggu cron 00:05 WIB.
 *
 * KENAPA INI TIDAK BISA BALAPAN (urutan ini yang penting):
 *   1. baca. Ada `current`? Kembalikan apa adanya. Tidak ada tulis sama sekali,
 *      jadi jalur normal (99,99% permintaan) tidak bisa merusak apa pun.
 *   2. susun calon (murni, `initialPepperState`).
 *   3. `INSERT ... ON CONFLICT(id) DO NOTHING`. Baris hanya lahir sekali; kalau
 *      sudah ada, pernyataan ini TIDAK menimpa — jadi ia juga tidak bisa
 *      berubah menjadi rotasi tengah hari, bahkan kalau dipanggil ribuan kali.
 *   4. BACA ULANG, dan kembalikan hasil bacaan itu — bukan calon langkah 2.
 *      Inilah yang membuat pemanggil yang KALAH balapan tetap menyajikan pepper
 *      PEMENANG. Kalau langkah ini dilewati dan calon sendiri dikembalikan, dua
 *      perangkat bisa memakai dua pepper berbeda pada hari yang sama, satu
 *      perangkat menghasilkan dua token, dan DAU menggelembung.
 *
 * `created` hanya penanda diagnostik untuk gerbang ("siapa yang menang"); ia
 * TIDAK dipakai untuk melaporkan rotasi. Inisialisasi bukan rotasi.
 *
 * Baris rusak (ada, tapi `current` kosong) SENGAJA tidak diperbaiki di sini:
 * DDL menyatakan `current TEXT NOT NULL`, dan satu-satunya penyembuhan yang
 * aman adalah rotasi terjadwal (`rotatePepperDue` mengembalikan true untuk
 * state rusak). Menulis paksa di jalur permintaan berarti membuka kembali
 * kemungkinan menimpa pepper yang masih dipakai perangkat lain hari itu.
 */
export async function ensurePepperState(db, now = Date.now(), opts = {}) {
  const existing = await readPepperState(db);
  if (existing && existing.current) return { state: existing, created: false };

  const candidate = initialPepperState(now, opts.pepper || newPepper());
  await db.prepare(SQL.initPepper).bind(candidate.rotated_at, candidate.current).run();

  const state = await readPepperState(db);
  if (!state || !state.current) return { state: null, created: false };
  return { state, created: state.current === candidate.current };
}

/**
 * Penjaga kontrak yang bisa dipanggil di runtime maupun di gerbang: kueri
 * analytics tidak boleh menyebut tabel kuota/identitas sama sekali.
 */
export function assertNoQuotaJoin(sql) {
  const lowered = String(sql).toLowerCase();
  for (const table of FORBIDDEN_TABLES) {
    if (new RegExp(`\\b${table}\\b`).test(lowered)) {
      throw new Error(`kueri analytics menyebut tabel terlarang: ${table}`);
    }
  }
  return true;
}

export default {
  ANALYTICS_TABLES, FORBIDDEN_TABLES, SQL,
  aggregateStatements, runStatements, applyAggregate,
  countDauTokens, countUsageRows, setMetric, setMetricAtLeast, readMetricRange,
  purgeDauDedup, purgeDauDedupOlderThan, purgeUsageOlderThan, purgeRetentionOlderThan,
  markBatchSeen, purgeBatchDedupOlderThan,
  readPepperState, writePepperState, ensurePepperState, assertNoQuotaJoin
};
