/**
 * FIEZEL — lapisan D1 lane bukti belajar Braincore. HANYA TABEL AGREGAT
 * (plus SATU tabel penghitung murid-per-hari yang berumur pendek).
 *
 * ###########################################################################
 * #  DATABASE INI (`fiezel-evidence`, binding EVIDENCE_DB) TERPISAH DARI     #
 * #  fiezel-core, fiezel-quota, fiezel-stats (analytics), DAN                #
 * #  fiezel-learning. Pemisahan fisik = JOIN lintas domain BUKAN "dilarang   #
 * #  kebijakan", melainkan TIDAK BISA DITULIS: D1 tidak bisa join lintas     #
 * #  database. Jangan pernah menambahkan binding identity/kuota/analytics    #
 * #  ke handler yang memegang EVIDENCE_DB.                                   #
 * ###########################################################################
 *
 * Tiga tabel (migrasi 0008_evidence.sql):
 *   evidence_daily       — penghitung harian (day, event, dim, n). NOL kolom
 *                          identitas; `cohort` DILARANG muncul di sini.
 *   evidence_dedup       — eventId sekali-pakai untuk idempotensi retry.
 *   evidence_learner_day — (day, cohort) untuk menghitung murid DISTINCT per
 *                          hari. Ini satu-satunya tempat `cohort` disimpan,
 *                          umurnya 14 hari, dan rute owner DILARANG membacanya
 *                          baris-per-baris — dashboard membaca angka yang sudah
 *                          dibekukan ke `evidence_daily` sebagai
 *                          `learners_measured`.
 */

import { aggregateEvidence, EVIDENCE_LIMITS } from './evidence-core.js';

export const EVIDENCE_TABLES = Object.freeze(['evidence_daily', 'evidence_dedup', 'evidence_learner_day']);

/** Tabel yang DILARANG disebut di kueri lane bukti mana pun. */
export const FORBIDDEN_TABLES = Object.freeze([
  'quota', 'quota_daily', 'identity', 'sessions', 'users', 'user_quota',
  'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'batch_dedup',
  'learning_daily', 'learning_dedup'
]);

/** Tabel yang DILARANG dibaca rute owner (pola larangan `dau_dedup`). */
export const OWNER_FORBIDDEN_TABLES = Object.freeze(['evidence_dedup', 'evidence_learner_day']);

export const SQL = Object.freeze({
  upsertEvidenceDaily:
    'INSERT INTO evidence_daily (day, event, dim, n) VALUES (?1, ?2, ?3, ?4) ' +
    'ON CONFLICT(day, event, dim) DO UPDATE SET n = n + excluded.n',
  insertEvidenceEventId:
    'INSERT OR IGNORE INTO evidence_dedup (event_id, batch_id, day) VALUES (?1, ?2, ?3)',
  insertLearnerDay:
    'INSERT OR IGNORE INTO evidence_learner_day (day, cohort) VALUES (?1, ?2)',
  purgeEvidenceDedupOlderThan:
    'DELETE FROM evidence_dedup WHERE day < ?1',
  purgeLearnerDayOlderThan:
    'DELETE FROM evidence_learner_day WHERE day < ?1',
  // Baca dashboard owner: HANYA evidence_daily, HANYA SELECT, rentang terikat.
  selectEvidenceRange:
    'SELECT day, event, dim, n FROM evidence_daily WHERE day >= ?1 AND day <= ?2 ORDER BY day ASC',
  selectEvidenceTotals:
    'SELECT event, dim, SUM(n) AS n FROM evidence_daily WHERE day >= ?1 AND day <= ?2 GROUP BY event, dim'
});

/** Dimensi khusus tempat hitungan murid distinct dibekukan. */
export const LEARNERS_EVENT = 'learners';
export const LEARNERS_DIM = 'measured:distinct';

/**
 * Tandai event sebagai "sudah dilihat" dan kembalikan HANYA yang segar.
 * WAJIB dipanggil SINKRON sebelum agregasi dijadwalkan (pelajaran lane
 * analytics: dedup di dalam waitUntil = retry cepat terhitung dua kali).
 */
export async function markEvidenceEventsSeen(db, events, batchId, day) {
  const fresh = [];
  for (const e of events) {
    const res = await db.prepare(SQL.insertEvidenceEventId).bind(e.eventId, batchId, day).run();
    // Runtime tanpa meta.changes: fail-closed, anggap duplikat.
    if (res && res.meta && res.meta.changes === 1) fresh.push(e);
  }
  return fresh;
}

/**
 * Catat (hari, cohort) dan kembalikan berapa murid BARU pada hari itu.
 * INSERT OR IGNORE: murid yang mengirim sepuluh batch sehari tetap dihitung
 * satu. Kegagalan di sini TIDAK boleh membatalkan agregasi dimensi — hitungan
 * murid yang meleset lebih baik daripada seluruh bukti hari itu hilang.
 */
export async function markLearnerDay(db, day, cohorts) {
  let fresh = 0;
  const unique = Array.from(new Set(Array.isArray(cohorts) ? cohorts : []));
  for (const cohort of unique) {
    try {
      const res = await db.prepare(SQL.insertLearnerDay).bind(day, cohort).run();
      if (res && res.meta && res.meta.changes === 1) fresh += 1;
    } catch { /* satu cohort gagal != seluruh batch gagal */ }
  }
  return fresh;
}

/**
 * Agregasi + tulis penghitung harian untuk event yang SUDAH lolos dedup,
 * termasuk membekukan pertambahan murid distinct ke baris
 * `learners / measured:distinct` supaya dashboard tidak pernah perlu menyentuh
 * tabel yang memuat cohort.
 */
export async function applyEvidenceAggregate(db, day, events, newLearners = 0) {
  const rows = aggregateEvidence(day, events);
  if (newLearners > 0) rows.push({ day, event: LEARNERS_EVENT, dim: LEARNERS_DIM, n: newLearners });
  for (const r of rows) {
    await db.prepare(SQL.upsertEvidenceDaily).bind(r.day, r.event, r.dim, r.n).run();
  }
  return rows.length;
}

function cutoff(today, ttlDays) {
  const t = Date.parse(today + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return new Date(t - ttlDays * 86400000).toISOString().slice(0, 10);
}

/** Purge dedup + cohort. `cohort` yang tidak pernah dipurge adalah identitas. */
export async function purgeEvidence(db, today, ttlDays = EVIDENCE_LIMITS.DEDUP_TTL_DAYS) {
  const before = cutoff(today, ttlDays);
  if (!before) return { dedup: 0, learnerDay: 0 };
  const a = await db.prepare(SQL.purgeEvidenceDedupOlderThan).bind(before).run();
  const b = await db.prepare(SQL.purgeLearnerDayOlderThan).bind(before).run();
  return {
    dedup: (a && a.meta && a.meta.changes) || 0,
    learnerDay: (b && b.meta && b.meta.changes) || 0
  };
}

export default {
  EVIDENCE_TABLES,
  FORBIDDEN_TABLES,
  OWNER_FORBIDDEN_TABLES,
  SQL,
  LEARNERS_EVENT,
  LEARNERS_DIM,
  markEvidenceEventsSeen,
  markLearnerDay,
  applyEvidenceAggregate,
  purgeEvidence
};
