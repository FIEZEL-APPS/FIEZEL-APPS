/**
 * FIEZEL — lapisan D1 untuk lane telemetri belajar. HANYA TABEL AGREGAT.
 *
 * OTORITAS: BRAIN-TELEMETRY-SCHEMA.md §5 (idempotency + dedup) dan
 * BRAIN-DATA-PRIVACY.md §7 (aggregate-only, tanpa baris per murid).
 *
 * ###########################################################################
 * #  DATABASE INI (`fiezel-learning`, binding LEARNING_DB) TERPISAH DARI     #
 * #  fiezel-core, fiezel-quota, DAN fiezel-analytics. Pemisahan fisik =      #
 * #  JOIN lintas domain BUKAN "dilarang kebijakan", melainkan TIDAK BISA     #
 * #  DITULIS: D1 tidak bisa join lintas database. Jangan pernah menambahkan  #
 * #  binding identity/kuota/analytics ke handler yang memegang LEARNING_DB.  #
 * ###########################################################################
 *
 * Dua tabel saja (migrasi 0007_learning.sql):
 *   learning_daily  — penghitung harian (day, event, dim, n). TANPA baris
 *                     per-event mentah; raw store menunggu lane consent
 *                     pseudonim yang belum ada.
 *   learning_dedup  — eventId sekali-pakai untuk idempotency retry (§5.1),
 *                     retensi 7 hari lalu dipurge; bukan identitas apa pun.
 *
 * Bentuk `db` yang diharapkan: antarmuka D1 standar
 *   db.prepare(sql).bind(...args) -> { run(), all(), first() }
 * Semua fungsi menerima `db` eksplisit supaya bisa diuji dengan D1 palsu
 * di learning-lane-test.js (pola analytics-dedup-test.js).
 */

import { aggregateLearning, LEARNING_LIMITS } from './learning-core.js';

export const LEARNING_TABLES = Object.freeze(['learning_daily', 'learning_dedup']);

/** Tabel yang DILARANG disebut di kueri lane learning mana pun. */
export const FORBIDDEN_TABLES = Object.freeze([
  'quota', 'quota_daily', 'identity', 'sessions', 'users', 'user_quota',
  'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'batch_dedup'
]);

/* --------------------------------------------------------------------------
 * Pernyataan SQL (literal tunggal — klaim DIPAKAI di 0007_learning.sql
 * mengutipnya verbatim; jangan pecah string ini tanpa memperbarui klaimnya)
 * -------------------------------------------------------------------------- */

export const SQL = Object.freeze({
  // Penghitung idempoten-per-baris: replay batch yang sudah lolos dedup tidak
  // pernah sampai ke sini, jadi `n = n + excluded.n` aman dari hitung ganda.
  upsertLearningDaily:
    'INSERT INTO learning_daily (day, event, dim, n) VALUES (?1, ?2, ?3, ?4) ' +
    'ON CONFLICT(day, event, dim) DO UPDATE SET n = n + excluded.n',
  // Dedup per-EVENT (bukan per-batch seperti analytics): §5.1 mensyaratkan
  // replay batch yang berisi campuran event lama+baru hanya menghitung yang
  // baru. INSERT OR IGNORE + meta.changes memberi tahu mana yang segar.
  insertLearningEventId:
    'INSERT OR IGNORE INTO learning_dedup (event_id, batch_id, day) VALUES (?1, ?2, ?3)',
  // Purge dedup — SATU-SATUNYA DELETE di lane ini, jendela 7 hari (§5.3).
  purgeLearningDedupOlderThan:
    'DELETE FROM learning_dedup WHERE day < ?1'
});

/* --------------------------------------------------------------------------
 * Operasi
 * -------------------------------------------------------------------------- */

/**
 * Tandai event sebagai "sudah dilihat" dan kembalikan HANYA yang segar.
 *
 * WAJIB dipanggil SINKRON sebelum agregasi dijadwalkan (pelajaran dari
 * route-events.js analytics: dedup di dalam waitUntil = jendela balapan di
 * mana retry cepat terhitung dua kali).
 *
 * @returns {Promise<Array>} subset `events` yang eventId-nya baru pertama
 *   kali terlihat (meta.changes === 1). Replay penuh => array kosong.
 */
export async function markLearningEventsSeen(db, events, batchId, day) {
  const fresh = [];
  for (const e of events) {
    const res = await db.prepare(SQL.insertLearningEventId).bind(e.eventId, batchId, day).run();
    // D1 mengisi meta.changes; kalau runtime tidak memberi meta (tak pernah
    // terjadi di D1 asli), fail-closed: anggap duplikat, JANGAN hitung ganda.
    if (res && res.meta && res.meta.changes === 1) fresh.push(e);
  }
  return fresh;
}

/**
 * Agregasi + tulis penghitung harian untuk event yang SUDAH lolos dedup.
 * Baris ditulis satu-satu (≤ ~40 dim per batch 20 event) — sederhana dan
 * cukup; db.batch bisa menyusul kalau volume menuntut.
 */
export async function applyLearningAggregate(db, day, events) {
  const rows = aggregateLearning(day, events);
  for (const r of rows) {
    await db.prepare(SQL.upsertLearningDaily).bind(r.day, r.event, r.dim, r.n).run();
  }
  return rows.length;
}

/**
 * Purge dedup yang lebih tua dari jendela retry (default 7 hari, §5.3).
 * `today` = 'YYYY-MM-DD'. Dipanggil dari jalur pemeliharaan; tabelnya kecil
 * (maks ≈ 20 event × 60 batch/jam × 7 hari per klien aktif) sehingga DELETE
 * ber-WHERE pada indeks `idx_learning_dedup_day` selesai dalam satu langkah.
 */
export async function purgeLearningDedup(db, today, ttlDays = LEARNING_LIMITS.DEDUP_TTL_DAYS) {
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(t)) return 0;
  const cutoff = new Date(t - ttlDays * 86400000).toISOString().slice(0, 10);
  const res = await db.prepare(SQL.purgeLearningDedupOlderThan).bind(cutoff).run();
  return res && res.meta ? res.meta.changes || 0 : 0;
}

export default {
  LEARNING_TABLES,
  FORBIDDEN_TABLES,
  SQL,
  markLearningEventsSeen,
  applyLearningAggregate,
  purgeLearningDedup
};
