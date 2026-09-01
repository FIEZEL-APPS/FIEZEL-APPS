/**
 * FIEZEL — inti lane BUKTI BELAJAR PER-MURID (`fiezel-braincore-learner-evidence-v1`).
 *
 * ==========================================================================
 * KENAPA LANE KEDUA, DAN KENAPA IA TIDAK MENYENTUH LANE AGREGAT
 * ==========================================================================
 * Lane agregat (`evidence-core.js` + database `fiezel-evidence`) menjawab
 * "bagaimana Braincore bekerja pada POPULASI". Ia sengaja tidak punya identitas,
 * dan kontrak itu TIDAK diubah oleh berkas ini: `evidence_daily`,
 * `evidence_dedup`, dan `evidence_learner_day` tidak disentuh, tidak dibaca,
 * dan tidak di-join dari sini.
 *
 * Berkas ini menjawab pertanyaan yang BERBEDA dan merupakan keputusan produk
 * owner yang eksplisit: "apa yang Braincore lakukan pada MURID INI". Karena itu
 * ia:
 *   - hidup di database `fiezel-core` (tempat `identity` dan `social_profile`
 *     sudah tinggal), bukan di `fiezel-evidence`. Menaruhnya di database bukti
 *     akan menempelkan `sub` di sebelah `cohort` dan menghapus satu-satunya
 *     jaminan yang membuat lane agregat anonim;
 *   - memakai `identity.sub` sebagai kunci — BUKAN nama murid. Nama hanya
 *     tampilan, dan tampilan tidak pernah menjadi kunci;
 *   - MEMBAWA ENUM YANG SAMA PERSIS dengan lane agregat (diimpor, bukan
 *     disalin). Dua lane dengan dua daftar enum adalah dua lane yang tidak
 *     akan pernah bisa dibandingkan lagi.
 *
 * ==========================================================================
 * SATU-SATUNYA PENGENAL: `sub`, DAN IA TIDAK PERNAH DATANG DARI KLIEN
 * ==========================================================================
 * `allowedTop` event lane ini adalah `['eventId','type','payload']`. TIDAK ADA
 * `sub`, TIDAK ADA `userId`, TIDAK ADA `cohort` — ketiganya ditolak 400
 * `foreign_field`. Server menurunkan `sub` dari cookie `fz_id` ber-HMAC
 * (mw-identity), jadi body yang mencoba menitipkan identitas orang lain gagal
 * pada validator, bukan pada niat baik handler.
 *
 * `cohort` ditolak untuk alasan kedua yang sama pentingnya: kalau satu event
 * membawa `cohort` DAN disimpan di sebelah `sub`, maka lane agregat yang anonim
 * bisa dipetakan ke akun lewat satu SELECT. Klien juga WAJIB memakai `eventId`
 * BARU untuk lane ini (lihat `toIdentityEvent` di
 * features/telemetry/fiezel-braincore-evidence.js): `eventId` bersama adalah
 * kunci join yang sama berbahayanya dengan kolom bersama.
 *
 * ==========================================================================
 * APA YANG TIDAK PERNAH MASUK KE SINI
 * ==========================================================================
 * Tidak ada jawaban murid, tidak ada teks soal, tidak ada transkrip AI, tidak
 * ada IP, tidak ada user-agent, tidak ada sidik perangkat, tidak ada token,
 * tidak ada isi localStorage. Yang tersimpan HANYA bucket berenum tertutup yang
 * sudah dihitung Brain di perangkat — persis daftar yang sama dengan lane
 * agregat — plus `day` dan jam terima server.
 */

import {
  EVIDENCE_EVENT_SPEC,
  EVIDENCE_EVENT_TYPES,
  EVIDENCE_UUID_PATTERN
} from './evidence-core.js';

export const LEARNER_EVIDENCE_SCHEMA_ID = 'fiezel-braincore-learner-evidence-v1';
export const LEARNER_EVIDENCE_SUMMARY_SCHEMA = 'fiezel-owner-learner-evidence-v1';
export const LEARNER_DIRECTORY_SCHEMA = 'fiezel-owner-learners-v1';

/** Versi teks persetujuan. Naik = persetujuan lama TIDAK berlaku lagi. */
export const LEARNER_EVIDENCE_CONSENT_POLICY = 'learner-evidence-consent-v1';

/**
 * `sub` = UUID yang diterbitkan server (`crypto.randomUUID()` di mw-identity).
 * Pola ini SENGAJA tidak mengunci versi UUID: identitas lama yang sudah beredar
 * di perangkat murid tidak boleh tiba-tiba menjadi "malformed" karena gerbang
 * baru lebih ketat daripada penerbitnya.
 */
export const SUB_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const LEARNER_EVIDENCE_LIMITS = Object.freeze({
  MAX_EVENTS: 20,
  MAX_BODY_BYTES: 8 * 1024,
  RATE_WINDOW_MS: 60 * 60 * 1000,
  RATE_PER_WINDOW: 120,
  DAY_SKEW_DAYS: 2,
  /**
   * RETENSI 180 HARI — ANGKA YANG DIPUTUSKAN, BUKAN "selamanya".
   *
   * Lane agregat memakai 14 hari karena `cohort` yang tidak dipurge adalah
   * identitas seumur hidup dengan nama lain. Lane ini SUDAH beridentitas atas
   * persetujuan murid, jadi 14 hari tidak berlaku di sini — tetapi "tak
   * terbatas" juga bukan default yang boleh lahir diam-diam. 180 hari = dua
   * semester sekolah: cukup untuk melihat perkembangan satu tahun ajaran,
   * dan tetap punya ujung. Menaikkannya = mengubah baris ini + dokumen
   * docs/D1-RETENTION.md, bukan menambah data diam-diam.
   */
  RETENTION_DAYS: 180,
  /** Baris mentah maksimum yang boleh dibaca satu permintaan owner. */
  MAX_ROWS_PER_READ: 400,
  /** Keputusan terakhir yang ditampilkan di panel owner. */
  MAX_RECENT_DECISIONS: 30,
  /** Murid maksimum di satu halaman direktori owner. */
  DIRECTORY_MAX: 200,
  OWNER_DEFAULT_DAYS: 30,
  OWNER_MAX_DAYS: 180
});

export const LEARNER_EVIDENCE_EVENT_TYPES = EVIDENCE_EVENT_TYPES;

function isPlainObject(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function bad(reason, extra) { return Object.assign({ ok: false, reason }, extra || {}); }

function dayDrift(day, nowMs) {
  const t = Date.parse(day + 'T00:00:00Z');
  if (Number.isNaN(t)) return Infinity;
  const today = Date.parse(new Date(nowMs).toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(Math.round((t - today) / 86400000));
}

export function isValidSub(value) {
  return typeof value === 'string' && SUB_PATTERN.test(value);
}

/**
 * normalizeLearnerEvidenceEvent(raw) -> {ok, event} | {ok:false, reason, field?}
 *
 * Deny-by-default, sama kerasnya dengan lane agregat. Perbedaan yang disengaja:
 * `cohort` DITOLAK di sini (lihat kepala berkas), dan tidak ada satu pun field
 * identitas yang diterima.
 */
export function normalizeLearnerEvidenceEvent(raw) {
  if (!isPlainObject(raw)) return bad('bad_event');
  const allowedTop = ['eventId', 'type', 'payload'];
  for (const k of Object.keys(raw)) {
    if (!allowedTop.includes(k)) return bad('foreign_field', { field: k });
  }
  if (typeof raw.eventId !== 'string' || !EVIDENCE_UUID_PATTERN.test(raw.eventId)) return bad('bad_event_id');
  const spec = EVIDENCE_EVENT_SPEC[raw.type];
  if (!spec) return bad('bad_type', { field: 'type' });
  if (!isPlainObject(raw.payload)) return bad('bad_payload');

  const out = {};
  for (const k of Object.keys(raw.payload)) {
    if (!spec.fields[k]) return bad('foreign_field', { field: k });
  }
  for (const name of Object.keys(spec.fields)) {
    const def = spec.fields[name];
    const v = raw.payload[name];
    if (v === undefined) {
      if (def.required) return bad('missing_field', { field: name });
      continue;
    }
    if (typeof v !== 'string' || def.spec.values.indexOf(v) === -1) return bad('invalid_field', { field: name });
    out[name] = v;
  }
  return { ok: true, event: { eventId: raw.eventId, type: raw.type, payload: out } };
}

/**
 * normalizeLearnerEvidenceEnvelope(body, now) -> {ok, envelope} | {ok:false, reason}
 * Bentuk amplop IDENTIK dengan lane agregat kecuali `schema`-nya sendiri —
 * transport klien yang sama dipakai ulang, jadi bentuknya tidak boleh berbeda.
 */
export function normalizeLearnerEvidenceEnvelope(body, nowMs = Date.now()) {
  if (!isPlainObject(body)) return bad('bad_body');
  const allowed = ['schema', 'batchId', 'day', 'events'];
  for (const k of Object.keys(body)) {
    if (!allowed.includes(k)) return bad('foreign_field', { field: k });
  }
  if (body.schema !== LEARNER_EVIDENCE_SCHEMA_ID) return bad('bad_schema');
  if (typeof body.batchId !== 'string' || !EVIDENCE_UUID_PATTERN.test(body.batchId)) return bad('bad_batch_id');
  if (typeof body.day !== 'string' || !DAY_PATTERN.test(body.day)) return bad('bad_day');
  if (dayDrift(body.day, nowMs) > LEARNER_EVIDENCE_LIMITS.DAY_SKEW_DAYS) return bad('day_out_of_range');
  if (!Array.isArray(body.events) || body.events.length === 0) return bad('no_events');
  if (body.events.length > LEARNER_EVIDENCE_LIMITS.MAX_EVENTS) return bad('too_many_events');

  const events = [];
  const seen = new Set();
  for (let i = 0; i < body.events.length; i += 1) {
    const res = normalizeLearnerEvidenceEvent(body.events[i]);
    if (!res.ok) return Object.assign(res, { index: i });
    if (seen.has(res.event.eventId)) return bad('duplicate_event_id', { index: i });
    seen.add(res.event.eventId);
    events.push(res.event);
  }
  return { ok: true, envelope: { schema: LEARNER_EVIDENCE_SCHEMA_ID, batchId: body.batchId, day: body.day, events } };
}

/**
 * Baris yang DIBACA KEMBALI dari D1 divalidasi ULANG terhadap enum yang sama.
 * Bukan paranoia berlebihan: kolom `dims` adalah TEXT, dan satu-satunya cara
 * memastikan bahwa yang keluar ke dashboard tetap enum tertutup adalah
 * memeriksanya di pintu keluar juga, bukan hanya di pintu masuk.
 */
export function parseStoredDims(type, text) {
  const spec = EVIDENCE_EVENT_SPEC[type];
  if (!spec) return null;
  let raw = null;
  try { raw = JSON.parse(String(text || 'null')); } catch { return null; }
  if (!isPlainObject(raw)) return null;
  const out = {};
  for (const name of Object.keys(spec.fields)) {
    const v = raw[name];
    if (typeof v === 'string' && spec.fields[name].spec.values.indexOf(v) !== -1) out[name] = v;
  }
  return out;
}

/* ==========================================================================
 * KEADAAN RINGKAS PER MURID (satu baris `learner_evidence_state`)
 * ==========================================================================
 * Alasan tabel ini ada BUKAN denormalisasi demi kecepatan semata: direktori
 * owner harus bisa menjawab "siapa saja yang ada" tanpa memindai baris bukti
 * seluruh murid. Memindai baris bukti untuk membuat daftar nama adalah cara
 * paling mudah membuat satu halaman dashboard membaca seluruh riwayat belajar
 * semua orang sekaligus.
 */

const STATE_FIELDS = Object.freeze({
  last_level: 'level',
  last_mastery: 'masteryBucket',
  last_trend: 'masteryTrend',
  last_misconception: 'misconceptionBucket',
  last_calibration: 'difficultyCalibration',
  last_improvement: 'improvementTrend'
});
const DECISION_FIELDS = Object.freeze({
  last_decision: 'decision',
  last_outcome: 'outcome',
  last_recommendation: 'recommendation'
});

/**
 * stateFromEvents(prev, day, events, nowMs) -> baris state berikutnya.
 * Murni: tidak menyentuh D1, sehingga bisa diuji langsung.
 */
export function stateFromEvents(prev, day, events, nowMs) {
  const base = prev && typeof prev === 'object' ? prev : null;
  const next = {
    first_day: base && base.first_day && base.first_day < day ? base.first_day : (base && base.first_day) || day,
    last_day: base && base.last_day && base.last_day > day ? base.last_day : day,
    updated_at: Number(nowMs) || 0,
    evidence_n: (base && Number(base.evidence_n)) || 0,
    decision_n: (base && Number(base.decision_n)) || 0,
    last_level: (base && base.last_level) || null,
    last_mastery: (base && base.last_mastery) || null,
    last_trend: (base && base.last_trend) || null,
    last_misconception: (base && base.last_misconception) || null,
    last_calibration: (base && base.last_calibration) || null,
    last_improvement: (base && base.last_improvement) || null,
    last_decision: (base && base.last_decision) || null,
    last_outcome: (base && base.last_outcome) || null,
    last_recommendation: (base && base.last_recommendation) || null
  };
  // `first_day` harus benar-benar yang PALING AWAL, termasuk saat batch lama
  // menyusul (klien bukti boleh offline berhari-hari).
  if (!base || !base.first_day || day < base.first_day) next.first_day = day;

  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !e.payload) continue;
    if (e.type === 'learner_evidence') {
      next.evidence_n += 1;
      for (const [col, field] of Object.entries(STATE_FIELDS)) {
        if (e.payload[field] !== undefined) next[col] = e.payload[field];
      }
    } else if (e.type === 'braincore_decision') {
      next.decision_n += 1;
      if (e.payload.level !== undefined) next.last_level = e.payload.level;
      for (const [col, field] of Object.entries(DECISION_FIELDS)) {
        if (e.payload[field] !== undefined) next[col] = e.payload[field];
      }
    }
  }
  return next;
}

/* ==========================================================================
 * RINGKASAN UNTUK OWNER (murni; diuji tanpa Worker)
 * ========================================================================== */

const MASTERY_ORDER = Object.freeze(['m0-40', 'm40-60', 'm60-80', 'm80-100']);

/**
 * summarizeLearnerRows(rows, range) -> model panel owner satu murid.
 *
 * `rows` = baris `learner_evidence` DIURUTKAN hari menaik. Setiap distribusi
 * dibiarkan KOSONG kalau tidak ada pengukuran — pola kejujuran yang sama dengan
 * summarizeEvidenceRows: nol adalah klaim, dan klaim butuh pengukuran.
 */
export function summarizeLearnerRows(rows, range) {
  const list = Array.isArray(rows) ? rows : [];
  const out = {
    range: { from: (range && range.from) || null, to: (range && range.to) || null },
    measured: false,
    evidenceCount: 0,
    decisionCount: 0,
    activeDays: 0,
    firstDay: null,
    lastDay: null,
    level: {},
    mastery: {},
    masteryTrend: {},
    misconception: {},
    misconceptionSkill: {},
    difficultyCalibration: {},
    calibrationError: {},
    improvementTrend: {},
    decision: {},
    outcome: {},
    recommendation: {},
    masteryDelta: {},
    masteryFirst: null,
    masteryLast: null,
    calibratedShare: null,
    recentDecisions: [],
    days: []
  };
  if (!list.length) return out;

  const put = (bag, key) => { if (key) bag[key] = (bag[key] || 0) + 1; };
  const dayMap = new Map();
  const decisions = [];

  for (const r of list) {
    if (!r || typeof r.event !== 'string' || typeof r.day !== 'string') continue;
    const dims = r.dims && typeof r.dims === 'object' ? r.dims : parseStoredDims(r.event, r.dims);
    if (!dims) continue;
    if (!dayMap.has(r.day)) dayMap.set(r.day, { day: r.day, evidence: 0, decisions: 0 });
    const bucket = dayMap.get(r.day);
    if (!out.firstDay || r.day < out.firstDay) out.firstDay = r.day;
    if (!out.lastDay || r.day > out.lastDay) out.lastDay = r.day;

    if (r.event === 'learner_evidence') {
      out.evidenceCount += 1;
      bucket.evidence += 1;
      put(out.level, dims.level);
      put(out.mastery, dims.masteryBucket);
      put(out.masteryTrend, dims.masteryTrend);
      put(out.misconception, dims.misconceptionBucket);
      put(out.misconceptionSkill, dims.misconceptionSkill);
      put(out.difficultyCalibration, dims.difficultyCalibration);
      put(out.calibrationError, dims.calibrationErrorBucket);
      put(out.improvementTrend, dims.improvementTrend);
      if (dims.masteryBucket) {
        if (out.masteryFirst === null) out.masteryFirst = dims.masteryBucket;
        out.masteryLast = dims.masteryBucket;
      }
    } else if (r.event === 'braincore_decision') {
      out.decisionCount += 1;
      bucket.decisions += 1;
      put(out.level, dims.level);
      put(out.decision, dims.decision);
      put(out.outcome, dims.outcome);
      put(out.recommendation, dims.recommendation);
      put(out.masteryDelta, dims.masteryDeltaBucket);
      decisions.push({
        day: r.day,
        level: dims.level || null,
        decision: dims.decision || null,
        outcome: dims.outcome || null,
        recommendation: dims.recommendation || null,
        masteryDelta: dims.masteryDeltaBucket || null,
        adherence: dims.adherenceBucket || null
      });
    }
  }

  out.measured = out.evidenceCount > 0 || out.decisionCount > 0;
  out.days = Array.from(dayMap.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
  out.activeDays = out.days.length;
  // Keputusan TERBARU lebih dulu; daftar dipotong supaya satu murid yang sangat
  // aktif tidak pernah bisa membuat satu halaman owner tak terbatas besarnya.
  out.recentDecisions = decisions.reverse().slice(0, LEARNER_EVIDENCE_LIMITS.MAX_RECENT_DECISIONS);

  const calTotal = Object.values(out.difficultyCalibration).reduce((n, v) => n + v, 0);
  // `calibratedShare` HANYA ada kalau ada penyebutnya. Tanpa pengukuran, ia
  // tetap null dan UI mencetak "belum ada pengukuran", bukan "0%".
  if (calTotal > 0) {
    out.calibratedShare = Math.round(((out.difficultyCalibration.calibrated || 0) / calTotal) * 100);
  }
  return out;
}

/** Urutan bermakna bucket mastery — dipakai UI, bukan urutan alfabetis. */
export const LEARNER_MASTERY_ORDER = MASTERY_ORDER;

export default {
  LEARNER_EVIDENCE_SCHEMA_ID,
  LEARNER_EVIDENCE_SUMMARY_SCHEMA,
  LEARNER_DIRECTORY_SCHEMA,
  LEARNER_EVIDENCE_CONSENT_POLICY,
  LEARNER_EVIDENCE_LIMITS,
  LEARNER_EVIDENCE_EVENT_TYPES,
  SUB_PATTERN,
  isValidSub,
  normalizeLearnerEvidenceEvent,
  normalizeLearnerEvidenceEnvelope,
  parseStoredDims,
  stateFromEvents,
  summarizeLearnerRows
};
