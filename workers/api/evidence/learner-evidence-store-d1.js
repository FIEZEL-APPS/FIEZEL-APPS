/**
 * FIEZEL — lapisan D1 lane BUKTI BELAJAR PER-MURID.
 *
 * ###########################################################################
 * #  DATABASE: `fiezel-core` (binding CORE_DB/DB) — database yang SAMA       #
 * #  dengan `identity` dan `social_profile`, dan itu memang alasannya:       #
 * #  lane ini beridentitas, jadi ia hidup di tempat identitas sudah hidup.   #
 * #                                                                          #
 * #  BERKAS INI TIDAK BOLEH PERNAH MENYENTUH `EVIDENCE_DB`. Lane agregat     #
 * #  (evidence_daily / evidence_dedup / evidence_learner_day) ada di         #
 * #  database LAIN dan tetap anonim; tidak ada satu pun kueri di sini yang   #
 * #  menyebut namanya, dan D1 tidak bisa join lintas database sekalipun ada  #
 * #  yang mencoba.                                                           #
 * ###########################################################################
 */

import {
  LEARNER_EVIDENCE_LIMITS,
  parseStoredDims,
  stateFromEvents
} from './learner-evidence-core.js';

export const LEARNER_EVIDENCE_TABLES = Object.freeze([
  'learner_evidence', 'learner_evidence_state', 'learner_evidence_consent'
]);

/**
 * Tabel yang DILARANG disebut berkas ini. Lane agregat ada di database lain;
 * daftar ini adalah pengingat yang bisa di-assert gerbang, bukan hiasan.
 */
export const FORBIDDEN_TABLES = Object.freeze([
  'evidence_daily', 'evidence_dedup', 'evidence_learner_day',
  'learning_daily', 'learning_dedup',
  'metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup', 'pepper_state'
]);

export const SQL = Object.freeze({
  ensureEvidenceTable:
    'CREATE TABLE IF NOT EXISTS learner_evidence (sub TEXT NOT NULL, event_id TEXT NOT NULL, day TEXT NOT NULL, received_at INTEGER NOT NULL, event TEXT NOT NULL, dims TEXT NOT NULL, PRIMARY KEY (sub, event_id))',
  ensureEvidenceSubDayIndex:
    'CREATE INDEX IF NOT EXISTS idx_learner_evidence_sub_day ON learner_evidence(sub, day)',
  ensureEvidenceDayIndex:
    'CREATE INDEX IF NOT EXISTS idx_learner_evidence_day ON learner_evidence(day)',
  ensureStateTable:
    'CREATE TABLE IF NOT EXISTS learner_evidence_state (sub TEXT PRIMARY KEY, first_day TEXT NOT NULL, last_day TEXT NOT NULL, updated_at INTEGER NOT NULL, evidence_n INTEGER NOT NULL DEFAULT 0, decision_n INTEGER NOT NULL DEFAULT 0, last_level TEXT, last_mastery TEXT, last_trend TEXT, last_misconception TEXT, last_calibration TEXT, last_improvement TEXT, last_decision TEXT, last_outcome TEXT, last_recommendation TEXT)',
  ensureStateLastDayIndex:
    'CREATE INDEX IF NOT EXISTS idx_learner_evidence_state_last_day ON learner_evidence_state(last_day)',
  ensureConsentTable:
    'CREATE TABLE IF NOT EXISTS learner_evidence_consent (sub TEXT PRIMARY KEY, granted_at INTEGER NOT NULL, revoked_at INTEGER, policy TEXT NOT NULL)',

  // --- persetujuan ---------------------------------------------------------
  selectConsent:
    'SELECT sub, granted_at, revoked_at, policy FROM learner_evidence_consent WHERE sub = ?1',
  grantConsent:
    'INSERT INTO learner_evidence_consent (sub, granted_at, revoked_at, policy) VALUES (?1, ?2, NULL, ?3) ON CONFLICT(sub) DO UPDATE SET granted_at = excluded.granted_at, revoked_at = NULL, policy = excluded.policy',
  revokeConsent:
    'UPDATE learner_evidence_consent SET revoked_at = ?2 WHERE sub = ?1',

  // --- tulis bukti ---------------------------------------------------------
  // INSERT OR IGNORE, bukan REPLACE: kiriman ULANG event yang sama tidak boleh
  // pernah menimpa jam terima aslinya, dan `meta.changes` yang dikembalikannya
  // adalah cara kita tahu event mana yang benar-benar BARU (untuk penghitung
  // state). REPLACE akan melaporkan setiap replay sebagai event baru.
  insertEvidence:
    'INSERT OR IGNORE INTO learner_evidence (sub, event_id, day, received_at, event, dims) VALUES (?1, ?2, ?3, ?4, ?5, ?6)',

  selectState:
    'SELECT sub, first_day, last_day, updated_at, evidence_n, decision_n, last_level, last_mastery, last_trend, last_misconception, last_calibration, last_improvement, last_decision, last_outcome, last_recommendation FROM learner_evidence_state WHERE sub = ?1',
  upsertState:
    'INSERT INTO learner_evidence_state (sub, first_day, last_day, updated_at, evidence_n, decision_n, last_level, last_mastery, last_trend, last_misconception, last_calibration, last_improvement, last_decision, last_outcome, last_recommendation) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15) ON CONFLICT(sub) DO UPDATE SET first_day = excluded.first_day, last_day = excluded.last_day, updated_at = excluded.updated_at, evidence_n = excluded.evidence_n, decision_n = excluded.decision_n, last_level = excluded.last_level, last_mastery = excluded.last_mastery, last_trend = excluded.last_trend, last_misconception = excluded.last_misconception, last_calibration = excluded.last_calibration, last_improvement = excluded.last_improvement, last_decision = excluded.last_decision, last_outcome = excluded.last_outcome, last_recommendation = excluded.last_recommendation',

  // --- baca owner ----------------------------------------------------------
  // DUA kueri, bukan satu JOIN, dan itu keputusan: nama murid tinggal di
  // `social_profile` (lane sosial) sedangkan penghitung tinggal di lane ini.
  // Membacanya terpisah membuat kegagalan lane sosial (tabel belum dimigrasi,
  // fitur sosial mati) berakhir sebagai "murid tanpa nama" alih-alih sebagai
  // direktori yang gagal total — dan menyembunyikan murid tanpa nama akan
  // membuat owner mengira dia tidak ada.
  readLearnerDirectory:
    'SELECT sub, first_day, last_day, evidence_n, decision_n, last_level, last_mastery, last_trend, last_outcome FROM learner_evidence_state WHERE last_day >= ?1 ORDER BY last_day DESC LIMIT ?2',
  readLearnerProfile:
    'SELECT handle, display_name FROM social_profile WHERE sub = ?1',
  readLearnerEvidenceRows:
    'SELECT day, received_at, event, dims FROM learner_evidence WHERE sub = ?1 AND day >= ?2 AND day <= ?3 ORDER BY day ASC LIMIT ?4',

  // --- retensi -------------------------------------------------------------
  purgeLearnerEvidence:
    'DELETE FROM learner_evidence WHERE day < ?1',
  purgeLearnerEvidenceState:
    'DELETE FROM learner_evidence_state WHERE last_day < ?1',
  // Pencabutan persetujuan menghapus bukti murid ITU, bukan seluruh tabel.
  deleteEvidenceForSub:
    'DELETE FROM learner_evidence WHERE sub = ?1',
  deleteStateForSub:
    'DELETE FROM learner_evidence_state WHERE sub = ?1'
});

const ENSURED = new WeakMap();

/**
 * `CREATE TABLE IF NOT EXISTS` sekali per handle D1 per isolate — pola
 * `ensureSocialSchema` (social-schema.js). Berkas migrasi 0009 tetap sumber
 * resmi; ini hanya jaring supaya lane tidak diam-diam mati kalau migrasi remote
 * belum dijalankan (token CI tidak bisa menjalankannya).
 */
export async function ensureLearnerEvidenceSchema(db) {
  if (!db || typeof db.prepare !== 'function') return false;
  if (ENSURED.get(db)) return true;
  const ddl = [
    SQL.ensureEvidenceTable,
    SQL.ensureEvidenceSubDayIndex,
    SQL.ensureEvidenceDayIndex,
    SQL.ensureStateTable,
    SQL.ensureStateLastDayIndex,
    SQL.ensureConsentTable
  ];
  for (const statement of ddl) await db.prepare(statement).run();
  ENSURED.set(db, true);
  return true;
}

/* ============================================================ persetujuan == */

/** `{granted:boolean, policy:string|null, grantedAt:number|null}`. Fail-closed. */
export async function readConsent(db, sub) {
  const row = await db.prepare(SQL.selectConsent).bind(sub).first();
  if (!row) return { granted: false, policy: null, grantedAt: null };
  return {
    granted: row.revoked_at === null || row.revoked_at === undefined,
    policy: row.policy || null,
    grantedAt: Number(row.granted_at) || null
  };
}

export async function grantConsent(db, sub, nowMs, policy) {
  await db.prepare(SQL.grantConsent).bind(sub, Number(nowMs) || 0, String(policy)).run();
  return true;
}

/**
 * Mencabut persetujuan MENGHAPUS bukti murid itu. Bukan sekadar menandai:
 * "boleh berhenti dikumpulkan tetapi yang lama tetap disimpan" bukan pencabutan,
 * dan owner tidak boleh bisa membuka murid yang sudah menarik izinnya.
 */
export async function revokeConsent(db, sub, nowMs) {
  await db.prepare(SQL.revokeConsent).bind(sub, Number(nowMs) || 0).run();
  const a = await db.prepare(SQL.deleteEvidenceForSub).bind(sub).run();
  await db.prepare(SQL.deleteStateForSub).bind(sub).run();
  return { deleted: (a && a.meta && a.meta.changes) || 0 };
}

/* ================================================================= tulis === */

/**
 * Tulis batch bukti untuk SATU `sub` yang SUDAH diautentikasi pemanggil.
 * `sub` adalah argumen fungsi, bukan field payload — tidak ada jalan bagi body
 * klien untuk mencapainya.
 *
 * Mengembalikan `{stored, duplicate}`. Hanya event yang BENAR-BENAR baru
 * (meta.changes === 1) yang menaikkan penghitung state; replay tidak menambah
 * apa pun, sehingga angka di dashboard tetap jujur walau klien retry sepuluh kali.
 */
export async function writeLearnerEvidence(db, sub, day, events, nowMs) {
  const fresh = [];
  for (const e of Array.isArray(events) ? events : []) {
    const res = await db
      .prepare(SQL.insertEvidence)
      .bind(sub, e.eventId, day, Number(nowMs) || 0, e.type, JSON.stringify(e.payload))
      .run();
    // Runtime tanpa meta.changes: fail-closed, anggap duplikat (pola
    // markEvidenceEventsSeen). Bukti yang tidak terhitung lebih baik daripada
    // bukti yang terhitung dua kali.
    if (res && res.meta && res.meta.changes === 1) fresh.push(e);
  }
  const total = Array.isArray(events) ? events.length : 0;
  if (!fresh.length) return { stored: 0, duplicate: total };

  const prev = await db.prepare(SQL.selectState).bind(sub).first();
  const next = stateFromEvents(prev, day, fresh, nowMs);
  await db
    .prepare(SQL.upsertState)
    .bind(
      sub, next.first_day, next.last_day, next.updated_at, next.evidence_n, next.decision_n,
      next.last_level, next.last_mastery, next.last_trend, next.last_misconception,
      next.last_calibration, next.last_improvement, next.last_decision, next.last_outcome,
      next.last_recommendation
    )
    .run();
  return { stored: fresh.length, duplicate: total - fresh.length };
}

/* ============================================================== baca owner = */

/** Placeholder ?N berurutan (pola `placeholders()` di route-social.js). */
function placeholders(count, start) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push('?' + (start + i));
  return out.join(', ');
}

/**
 * Direktori murid + nama tampilannya. Nama dibaca dari `social_profile` dalam
 * SATU kueri tambahan (bukan N kueri, dan bukan JOIN — lihat SQL di atas).
 * Kegagalan pembacaan nama SENGAJA ditelan: direktori tanpa nama tetap berguna,
 * direktori yang hilang tidak.
 */
export async function readLearnerDirectory(db, sinceDay, limit) {
  const cap = Math.min(LEARNER_EVIDENCE_LIMITS.DIRECTORY_MAX, Math.max(1, Math.trunc(Number(limit) || 0) || LEARNER_EVIDENCE_LIMITS.DIRECTORY_MAX));
  const res = await db.prepare(SQL.readLearnerDirectory).bind(sinceDay, cap).all();
  const rows = (res && res.results) || [];
  if (!rows.length) return rows;
  const names = new Map();
  try {
    const subs = rows.map((r) => r.sub);
    const sql = 'SELECT sub, handle, display_name FROM social_profile WHERE sub IN (' + placeholders(subs.length, 1) + ')';
    const got = await db.prepare(sql).bind(...subs).all();
    for (const p of (got && got.results) || []) names.set(p.sub, p);
  } catch { /* lane sosial belum ada = murid tanpa nama, bukan direktori gagal */ }
  return rows.map((r) => {
    const p = names.get(r.sub);
    return Object.assign({}, r, { handle: (p && p.handle) || null, display_name: (p && p.display_name) || null });
  });
}

export async function readLearnerProfile(db, sub) {
  return db.prepare(SQL.readLearnerProfile).bind(sub).first();
}

export async function readLearnerState(db, sub) {
  return db.prepare(SQL.selectState).bind(sub).first();
}

/**
 * Baris bukti satu murid dalam rentang hari. `dims` sudah diurai DAN divalidasi
 * ulang terhadap enum (`parseStoredDims`) sebelum meninggalkan lapisan ini —
 * baris yang tidak bisa dipercaya dibuang, bukan diteruskan mentah ke HTML.
 */
export async function readLearnerEvidenceRows(db, sub, from, to, limit) {
  const cap = Math.min(LEARNER_EVIDENCE_LIMITS.MAX_ROWS_PER_READ, Math.max(1, Math.trunc(Number(limit) || 0) || LEARNER_EVIDENCE_LIMITS.MAX_ROWS_PER_READ));
  const res = await db.prepare(SQL.readLearnerEvidenceRows).bind(sub, from, to, cap).all();
  const rows = (res && res.results) || [];
  const out = [];
  for (const r of rows) {
    const dims = parseStoredDims(r.event, r.dims);
    if (!dims) continue;
    out.push({ day: String(r.day), receivedAt: Number(r.received_at) || 0, event: String(r.event), dims });
  }
  // Urutan DALAM satu hari diselesaikan di sini, bukan di SQL: `ORDER BY day, received_at`
  // memaksa pengurutan dua kolom yang tidak dilayani indeks (sub, day), dan jumlah baris di
  // sini sudah dibatasi MAX_ROWS_PER_READ. Urutan ini menentukan `masteryFirst`/`masteryLast`,
  // jadi ia harus pasti — bukan bergantung pada urutan kembali mesin.
  out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.receivedAt - b.receivedAt));
  return out;
}

/* ================================================================ retensi == */

function cutoff(today, ttlDays) {
  const t = Date.parse(String(today) + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return new Date(t - ttlDays * 86400000).toISOString().slice(0, 10);
}

/**
 * Purge retensi. TTL default = LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS (180),
 * dan tempat kedua yang WAJIB ikut berubah kalau angka itu berubah adalah
 * docs/D1-RETENTION.md. Data yang tidak pernah dipurge adalah arsip, bukan bukti.
 */
export async function purgeLearnerEvidence(db, today, ttlDays = LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS) {
  const before = cutoff(today, ttlDays);
  if (!before) return { rows: 0, state: 0 };
  const a = await db.prepare(SQL.purgeLearnerEvidence).bind(before).run();
  const b = await db.prepare(SQL.purgeLearnerEvidenceState).bind(before).run();
  return {
    rows: (a && a.meta && a.meta.changes) || 0,
    state: (b && b.meta && b.meta.changes) || 0
  };
}

export default {
  LEARNER_EVIDENCE_TABLES,
  FORBIDDEN_TABLES,
  SQL,
  ensureLearnerEvidenceSchema,
  readConsent,
  grantConsent,
  revokeConsent,
  writeLearnerEvidence,
  readLearnerDirectory,
  readLearnerProfile,
  readLearnerState,
  readLearnerEvidenceRows,
  purgeLearnerEvidence
};
