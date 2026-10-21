/**
 * FIEZEL — penyimpanan D1 lane KESULITAN SOAL GABUNGAN (fiezel-evidence, migrasi
 * 0015_item_pool.sql). Semua SQL hidup di konstanta `SQL` supaya
 * tests/d1-schema-contract-test.js bisa mencocokkannya dengan migrasi.
 *
 * Hanya tiga tabel yang boleh disebut di sini (ITEM_POOL_TABLES). Lane ini tidak pernah
 * membaca atau menulis tabel lane bukti lain di database yang sama — terutama bukan
 * `evidence_learner_day`, satu-satunya tabel di database ini yang memegang pengenal
 * (cohort). Menyambung jawaban per soal ke cohort akan mengubah penghitung anonim
 * menjadi profil, jadi larangannya dikunci tests/item-pool-test.js.
 */

import {
  aggregateItemRows,
  aggregateProbeRows,
  estimateItemDifficulty,
  buildDifficultyTable,
  validItemId,
  ITEM_POOL_LIMITS,
  ITEM_TABLE_SCHEMA,
  ESTIMATOR,
  PARAM_EPOCH_DAY
} from './item-pool-core.js';

export const ITEM_POOL_TABLES = Object.freeze(['item_pool_daily', 'item_pool_dedup', 'item_pool_table', 'item_pool_probe_daily']);

/** Tabel yang DILARANG disebut lane ini (pengenal lane bukti + seluruh lane lain). */
export const ITEM_POOL_FORBIDDEN_TABLES = Object.freeze([
  'evidence_learner_day', 'evidence_dedup', 'evidence_daily',
  'quota', 'quota_daily', 'identity', 'sessions', 'users', 'user_quota',
  'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'batch_dedup',
  'learning_daily', 'learning_dedup', 'learner_evidence'
]);

export const SQL = Object.freeze({
  insertItemPoolEventId:
    'INSERT OR IGNORE INTO item_pool_dedup (event_id, batch_id, day) VALUES (?1, ?2, ?3)',
  upsertItemPoolDaily:
    'INSERT INTO item_pool_daily (day, item_id, pb, n, k) VALUES (?1, ?2, ?3, ?4, ?5) ' +
    'ON CONFLICT(day, item_id, pb) DO UPDATE SET n = n + excluded.n, k = k + excluded.k',
  upsertItemPoolProbeDaily:
    'INSERT INTO item_pool_probe_daily (day, rb, n, k) VALUES (?1, ?2, ?3, ?4) ' +
    'ON CONFLICT(day, rb) DO UPDATE SET n = n + excluded.n, k = k + excluded.k',
  selectItemPoolWindow:
    'SELECT item_id, pb, SUM(n) AS n, SUM(k) AS k FROM item_pool_daily WHERE day >= ?1 GROUP BY item_id, pb',
  /* Penyetelan (langkah 3): validasi silang membagi hari genap/ganjil. Dijumlahkan di D1 per
   * lipatan supaya hasil kueri <= 2x jumlah sel jendela, bukan 56x. julianday tengah malam =
   * N + 0.5, jadi CAST ke bilangan bulat berselang-seling genap/ganjil tiap hari. */
  selectItemPoolWindowByFold:
    'SELECT CAST(julianday(day) AS INTEGER) % 2 AS fold, item_id, pb, SUM(n) AS n, SUM(k) AS k ' +
    'FROM item_pool_daily WHERE day >= ?1 GROUP BY fold, item_id, pb',
  selectItemPoolProbeWindow:
    'SELECT day, rb, n, k FROM item_pool_probe_daily WHERE day >= ?1',
  deleteItemPoolTableOlderThan:
    'DELETE FROM item_pool_table WHERE day < ?1',
  selectItemPoolTable:
    'SELECT item_id, delta_milli, n, day FROM item_pool_table',
  purgeItemPoolDedupOlderThan:
    'DELETE FROM item_pool_dedup WHERE day < ?1',
  purgeItemPoolDailyOlderThan:
    'DELETE FROM item_pool_daily WHERE day < ?1',
  purgeItemPoolProbeDailyOlderThan:
    'DELETE FROM item_pool_probe_daily WHERE day < ?1'
});

/** Baris tabel per pernyataan INSERT berganda. Nilai ditulis LITERAL (bukan parameter) karena
 *  API D1 HTTP membatasi 100 parameter per pernyataan; aman karena setiap nilai divalidasi
 *  ketat di tableWritePlan (ID lolos validItemId, angka bulat). */
export const TABLE_ROWS_PER_STATEMENT = 400;

function shiftDay(day, delta) {
  const t = Date.parse(day + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return new Date(t + delta * 86400000).toISOString().slice(0, 10);
}

/** Tandai eventId; kembalikan HANYA event yang baru pertama kali terlihat. */
export async function markItemPoolEventsSeen(db, events, batchId, day) {
  const fresh = [];
  for (const e of events) {
    const res = await db.prepare(SQL.insertItemPoolEventId).bind(e.eventId, batchId, day).run();
    if (res && res.meta && res.meta.changes === 1) fresh.push(e);
  }
  return fresh;
}

/**
 * Event segar -> penghitung harian (soal + probe), DUA batch terpisah. Tabel probe datang dari
 * migrasi 0016 yang boleh tertinggal dari 0015 (owner menerapkannya terpisah): kalau keduanya
 * satu batch, satu tabel probe yang belum ada menggagalkan seluruh batch dan hitungan SOAL ikut
 * hilang. Jadi soal ditulis dulu, probe menyusul dan gagalnya ditelan sendiri.
 */
export async function applyItemPoolAggregate(db, events) {
  const rows = aggregateItemRows(events);
  const probes = aggregateProbeRows(events);
  const run = async (stmts) => {
    if (!stmts.length) return;
    if (typeof db.batch === 'function') await db.batch(stmts);
    else for (const s of stmts) await s.run();
  };
  await run(rows.map((r) => db.prepare(SQL.upsertItemPoolDaily).bind(r.day, r.item_id, r.pb, r.n, r.k)));
  let probeRows = 0;
  try {
    await run(probes.map((r) => db.prepare(SQL.upsertItemPoolProbeDaily).bind(r.day, r.rb, r.n, r.k)));
    probeRows = probes.length;
  } catch { probeRows = 0; }
  return rows.length + probeRows;
}

/** Hari pertama yang ikut ditaksir: jendela 56 hari, tetapi tidak sebelum PARAM_EPOCH_DAY
 *  (penghitung sebelum itu dibentuk dengan konstanta lain). */
export function estimatorSince(today) {
  const since = shiftDay(today, -ESTIMATOR.WINDOW_DAYS);
  if (!since) return null;
  return since > PARAM_EPOCH_DAY ? since : PARAM_EPOCH_DAY;
}

/**
 * Tabel terbit -> daftar pernyataan SQL yang menulisnya: upsert per soal (INSERT OR REPLACE,
 * baris lama tertimpa di tempat, jadi pembaca tidak pernah melihat tabel kosong di tengah
 * pembangunan), lalu hapus soal yang tidak diterbitkan lagi (day < hari ini). Dipakai
 * binding D1 (gerbang) dan API D1 HTTP (tools/item-pool-job.mjs) — satu rencana, dua pelaksana.
 */
export function tableWritePlan(table, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(today || ''))) throw new Error('tableWritePlan: hari tidak sah');
  const values = [];
  for (const [itemId, e] of Object.entries((table && table.items) || {})) {
    const milli = Math.round(Number(e.d) * 1000), n = Math.floor(Number(e.n));
    if (!validItemId(itemId) || !Number.isInteger(milli) || Math.abs(milli) > 5000 || !Number.isInteger(n) || n < 0) {
      throw new Error('tableWritePlan: baris tidak sah untuk ' + JSON.stringify(itemId));
    }
    values.push("('" + itemId + "'," + milli + ',' + n + ",'" + today + "')");
  }
  const plan = [];
  for (let i = 0; i < values.length; i += TABLE_ROWS_PER_STATEMENT) {
    plan.push({ sql: 'INSERT OR REPLACE INTO item_pool_table (item_id, delta_milli, n, day) VALUES ' + values.slice(i, i + TABLE_ROWS_PER_STATEMENT).join(','), params: [] });
  }
  plan.push({ sql: SQL.deleteItemPoolTableOlderThan, params: [today] });
  return plan;
}

/**
 * Bangun ulang item_pool_table lewat BINDING D1 (gerbang dan cadangan manual). Di produksi
 * pekerjaan ini dijalankan tools/item-pool-job.mjs di GitHub Actions, BUKAN cron Worker:
 * penaksirnya melewati batas 10 ms CPU Worker gratis begitu soalnya ribuan.
 */
export async function rebuildItemPoolTable(db, today) {
  const since = estimatorSince(today);
  if (!since) return { items: 0, answers: 0 };
  const res = await db.prepare(SQL.selectItemPoolWindow).bind(since).all();
  const rows = (res && res.results) || [];
  const estimate = estimateItemDifficulty(rows);
  const table = buildDifficultyTable(estimate, today);
  for (const step of tableWritePlan(table, today)) await db.prepare(step.sql).bind(...step.params).run();
  const answers = rows.reduce((sum, r) => sum + (Number(r.n) || 0), 0);
  return { items: Object.keys(table.items).length, answers, median: estimate.median, tau: estimate.tau, cohort: estimate.cohort };
}

/** Tabel yang diterbitkan, dalam bentuk yang dibaca perangkat (FiezelItemPool.healTable). */
export async function readItemPoolTable(db) {
  const res = await db.prepare(SQL.selectItemPoolTable).all();
  const rows = (res && res.results) || [];
  const items = {};
  let day = null;
  for (const r of rows) {
    items[r.item_id] = { d: Math.round(Number(r.delta_milli)) / 1000, n: Number(r.n) || 0 };
    if (!day || String(r.day) > day) day = String(r.day);
  }
  return { schema: ITEM_TABLE_SCHEMA, day, items };
}

/** Purge dedup (60 hari) + penghitung harian soal & probe (120 hari). Tabel probe yang belum
 *  ada (migrasi 0016 belum diterapkan) tidak menggagalkan purge dua tabel lainnya. */
export async function purgeItemPool(db, today) {
  const dedupBefore = shiftDay(today, -ITEM_POOL_LIMITS.DEDUP_TTL_DAYS);
  const dailyBefore = shiftDay(today, -ITEM_POOL_LIMITS.RETENTION_DAYS);
  if (!dedupBefore || !dailyBefore) return { dedup: 0, daily: 0, probe: 0 };
  const a = await db.prepare(SQL.purgeItemPoolDedupOlderThan).bind(dedupBefore).run();
  const b = await db.prepare(SQL.purgeItemPoolDailyOlderThan).bind(dailyBefore).run();
  let probe = 0;
  try {
    const c = await db.prepare(SQL.purgeItemPoolProbeDailyOlderThan).bind(dailyBefore).run();
    probe = (c && c.meta && c.meta.changes) || 0;
  } catch { probe = null; }
  return {
    dedup: (a && a.meta && a.meta.changes) || 0,
    daily: (b && b.meta && b.meta.changes) || 0,
    probe
  };
}

export default {
  ITEM_POOL_TABLES,
  ITEM_POOL_FORBIDDEN_TABLES,
  SQL,
  markItemPoolEventsSeen,
  applyItemPoolAggregate,
  estimatorSince,
  tableWritePlan,
  rebuildItemPoolTable,
  readItemPoolTable,
  purgeItemPool
};
