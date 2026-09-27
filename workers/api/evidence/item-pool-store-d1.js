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
  estimateItemDifficulty,
  buildDifficultyTable,
  ITEM_POOL_LIMITS,
  ITEM_TABLE_SCHEMA,
  ESTIMATOR
} from './item-pool-core.js';

export const ITEM_POOL_TABLES = Object.freeze(['item_pool_daily', 'item_pool_dedup', 'item_pool_table']);

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
  selectItemPoolWindow:
    'SELECT item_id, pb, SUM(n) AS n, SUM(k) AS k FROM item_pool_daily WHERE day >= ?1 GROUP BY item_id, pb',
  deleteItemPoolTable:
    'DELETE FROM item_pool_table',
  insertItemPoolTableRow:
    'INSERT INTO item_pool_table (item_id, delta_milli, n, day) VALUES (?1, ?2, ?3, ?4)',
  selectItemPoolTable:
    'SELECT item_id, delta_milli, n, day FROM item_pool_table',
  purgeItemPoolDedupOlderThan:
    'DELETE FROM item_pool_dedup WHERE day < ?1',
  purgeItemPoolDailyOlderThan:
    'DELETE FROM item_pool_daily WHERE day < ?1'
});

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

/** Event segar -> penghitung harian. */
export async function applyItemPoolAggregate(db, events) {
  const rows = aggregateItemRows(events);
  const stmts = rows.map((r) => db.prepare(SQL.upsertItemPoolDaily).bind(r.day, r.item_id, r.pb, r.n, r.k));
  if (!stmts.length) return 0;
  if (typeof db.batch === 'function') await db.batch(stmts);
  else for (const s of stmts) await s.run();
  return rows.length;
}

/**
 * Bangun ulang item_pool_table dari jendela ESTIMATOR.WINDOW_DAYS. Dipanggil cron harian.
 * Tabel diganti UTUH (hapus lalu isi) dalam satu batch: soal yang koreksinya kini masuk
 * dead zone harus HILANG dari tabel, bukan tertinggal dengan angka lama.
 */
export async function rebuildItemPoolTable(db, today) {
  const since = shiftDay(today, -ESTIMATOR.WINDOW_DAYS);
  if (!since) return { items: 0, answers: 0 };
  const res = await db.prepare(SQL.selectItemPoolWindow).bind(since).all();
  const rows = (res && res.results) || [];
  const estimate = estimateItemDifficulty(rows);
  const table = buildDifficultyTable(estimate, today);
  const stmts = [db.prepare(SQL.deleteItemPoolTable)];
  for (const [itemId, e] of Object.entries(table.items)) {
    stmts.push(db.prepare(SQL.insertItemPoolTableRow).bind(itemId, Math.round(e.d * 1000), e.n, today));
  }
  if (typeof db.batch === 'function') await db.batch(stmts);
  else for (const s of stmts) await s.run();
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

/** Purge dedup (60 hari) + penghitung harian (120 hari). */
export async function purgeItemPool(db, today) {
  const dedupBefore = shiftDay(today, -ITEM_POOL_LIMITS.DEDUP_TTL_DAYS);
  const dailyBefore = shiftDay(today, -ITEM_POOL_LIMITS.RETENTION_DAYS);
  if (!dedupBefore || !dailyBefore) return { dedup: 0, daily: 0 };
  const a = await db.prepare(SQL.purgeItemPoolDedupOlderThan).bind(dedupBefore).run();
  const b = await db.prepare(SQL.purgeItemPoolDailyOlderThan).bind(dailyBefore).run();
  return {
    dedup: (a && a.meta && a.meta.changes) || 0,
    daily: (b && b.meta && b.meta.changes) || 0
  };
}

export default {
  ITEM_POOL_TABLES,
  ITEM_POOL_FORBIDDEN_TABLES,
  SQL,
  markItemPoolEventsSeen,
  applyItemPoolAggregate,
  rebuildItemPoolTable,
  readItemPoolTable,
  purgeItemPool
};
