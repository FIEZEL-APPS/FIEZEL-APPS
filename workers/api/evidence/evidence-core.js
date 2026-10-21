/**
 * FIEZEL — inti lane BUKTI BELAJAR Braincore (`fiezel-braincore-evidence-v1`).
 * Fungsi MURNI: tanpa I/O, tanpa D1, tanpa jaringan, tanpa `env`.
 *
 * KENAPA LANE KETIGA, BUKAN MENUMPANG LANE YANG SUDAH ADA
 * -------------------------------------------------------
 * Sudah ada dua lane, dan keduanya menjawab pertanyaan LAIN:
 *   - analytics (`workers/api/analytics/*`, DB `fiezel-stats`) menghitung
 *     KEHADIRAN perangkat (visitor_token harian);
 *   - learning  (`workers/api/learning/*`,  DB `fiezel-learning`) menghitung
 *     HASIL SATU JAWABAN (answer_outcome / session_summary).
 * Lane ini menghitung KEADAAN BELAJAR SEORANG MURID pada satu hari — mastery,
 * miskonsepsi, kalibrasi kesulitan, keputusan Braincore, dan arah perbaikan —
 * yaitu satuan yang dibutuhkan untuk MENGEVALUASI Braincore, bukan satu jawaban.
 * Mencampurnya ke `learning_daily` akan menaruh dua satuan pengukuran berbeda
 * di satu tabel penghitung; angka `n` di sana akan berhenti punya arti tunggal.
 *
 * PERBEDAAN SADAR DARI LANE LEARNING: ADA `cohort`
 * ------------------------------------------------
 * Lane learning SENGAJA tidak punya identifier sama sekali. Lane ini WAJIB bisa
 * menjawab "berapa MURID yang terukur", dan pertanyaan itu mustahil dijawab
 * dari penghitung event. Maka ada SATU identifier, dan bentuknya dibatasi keras:
 *   - `cohort` = 16 hex (64 bit) ACAK yang dibuat DI PERANGKAT, BUKAN turunan
 *     dari nama/akun/installId/waktu apa pun (tidak ada yang bisa dibalik);
 *   - dirotasi perangkat tiap 14 hari (jendela bukti), jadi ia tidak pernah
 *     menjadi identitas seumur hidup;
 *   - di server ia HANYA hidup di `evidence_learner_day` untuk menghitung
 *     "distinct per hari", dan dipurge setelah 14 hari. Ia TIDAK PERNAH masuk
 *     `evidence_daily`, dan rute owner DILARANG membacanya (pola larangan
 *     `dau_dedup` di dashboard analytics).
 *
 * ATURAN YANG DITEGAKKAN DI KODE, BUKAN DI DOKUMEN
 *   1. DUA tipe event saja: `learner_evidence` + `braincore_decision`.
 *   2. ENUM TERTUTUP TOTAL. Tidak ada teks bebas, tidak ada angka kontinu —
 *      semua besaran sudah menjadi bucket di perangkat.
 *   3. TANPA timestamp presisi: satu-satunya waktu adalah `day` (YYYY-MM-DD)
 *      di amplop. Field `at`/`ts` apa pun = field asing = 400.
 *   4. Field asing DITOLAK (400), tidak dibuang diam-diam: klien yang salah
 *      harus tahu payloadnya salah.
 */

export const EVIDENCE_SCHEMA_ID = 'fiezel-braincore-evidence-v1';

/* ==========================================================================
 * 1. ENUM TERTUTUP
 * ========================================================================== */

export const EVIDENCE_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1']);

/** Sama persis dengan LEARNING_SKILL_BUCKETS — dua lane yang menyebut skill
 *  dengan nama berbeda tidak akan pernah bisa dibandingkan lagi. */
export const EVIDENCE_SKILL_BUCKETS = Object.freeze([
  'pronouns', 'articles', 'nouns-plural', 'possession', 'determiners-quantifiers',
  'prepositions-place', 'prepositions-time', 'prepositions-movement', 'prepositions-dependent',
  'tense-present', 'tense-past', 'tense-perfect', 'tense-future', 'aspect-contrast',
  'conditionals', 'modals-ability', 'modals-obligation', 'modals-deduction',
  'passive-voice', 'reported-speech', 'questions', 'comparison', 'adverbs',
  'verb-patterns', 'clauses-relative', 'clauses-subordinate', 'agreement',
  'negation', 'discourse', 'other'
]);

export const EVIDENCE_MASTERY_BUCKETS = Object.freeze(['m0-40', 'm40-60', 'm60-80', 'm80-100']);
export const EVIDENCE_TRENDS = Object.freeze(['up', 'flat', 'down']);
export const EVIDENCE_MISCONCEPTION_BUCKETS = Object.freeze(['none', 'mc1', 'mc2-3', 'mc4p']);
export const EVIDENCE_CALIBRATION = Object.freeze(['too_easy', 'calibrated', 'too_hard']);
export const EVIDENCE_CALIBRATION_ERROR = Object.freeze(['e0-10', 'e10-20', 'e20-40', 'e40p']);
export const EVIDENCE_CONSISTENCY_BUCKETS = Object.freeze(['c0-25', 'c25-50', 'c50-75', 'c75-100']);
export const EVIDENCE_RETENTION_RISK = Object.freeze(['r0-30', 'r30-60', 'r60-100']);
export const EVIDENCE_VOLUME_BUCKETS = Object.freeze(['n1-20', 'n21-100', 'n101p']);
export const EVIDENCE_IMPROVEMENT = Object.freeze(['improving', 'steady', 'declining']);
export const EVIDENCE_DECISIONS = Object.freeze(['due_review', 'weak_skill', 'target_difficulty', 'new_content', 'fallback']);
export const EVIDENCE_POLICY_IDS = Object.freeze(['core-brain-v3-default']);
export const EVIDENCE_OUTCOMES = Object.freeze(['positive', 'mixed', 'negative', 'insufficient']);
export const EVIDENCE_RECOMMENDATIONS = Object.freeze(['keep_or_progress', 'adjust', 'reduce_load', 'collect_more_evidence']);
export const EVIDENCE_DELTA_BUCKETS = Object.freeze(['d-neg', 'd0', 'd1-10', 'd10p']);
export const EVIDENCE_ADHERENCE_BUCKETS = Object.freeze(['a0-50', 'a50-80', 'a80-100']);

/* ==========================================================================
 * 2. POLA BENTUK
 * ========================================================================== */

export const EVIDENCE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** `cohort`: TEPAT 16 hex. Panjang dikunci supaya tidak ada ruang menyelipkan
 *  hash identitas yang lebih panjang atau string bermakna. */
export const EVIDENCE_COHORT_PATTERN = /^[0-9a-f]{16}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const EVIDENCE_LIMITS = Object.freeze({
  MAX_EVENTS: 20,
  MAX_BODY_BYTES: 8 * 1024,
  RATE_WINDOW_MS: 60 * 60 * 1000,
  RATE_PER_WINDOW: 120,
  DAY_SKEW_DAYS: 2,
  DEDUP_TTL_DAYS: 14,
  COHORT_TTL_DAYS: 14
});

/* ==========================================================================
 * 3. SPESIFIKASI EVENT
 * ========================================================================== */

const E = values => ({ kind: 'enum', values });

export const EVIDENCE_EVENT_SPEC = Object.freeze({
  learner_evidence: {
    fields: Object.freeze({
      level: { spec: E(EVIDENCE_LEVELS), required: true },
      masteryBucket: { spec: E(EVIDENCE_MASTERY_BUCKETS), required: true },
      masteryTrend: { spec: E(EVIDENCE_TRENDS), required: true },
      misconceptionBucket: { spec: E(EVIDENCE_MISCONCEPTION_BUCKETS), required: true },
      misconceptionSkill: { spec: E(EVIDENCE_SKILL_BUCKETS), required: false },
      difficultyCalibration: { spec: E(EVIDENCE_CALIBRATION), required: true },
      calibrationErrorBucket: { spec: E(EVIDENCE_CALIBRATION_ERROR), required: true },
      consistencyBucket: { spec: E(EVIDENCE_CONSISTENCY_BUCKETS), required: true },
      retentionRiskBucket: { spec: E(EVIDENCE_RETENTION_RISK), required: true },
      evidenceVolumeBucket: { spec: E(EVIDENCE_VOLUME_BUCKETS), required: true },
      improvementTrend: { spec: E(EVIDENCE_IMPROVEMENT), required: true }
    })
  },
  braincore_decision: {
    fields: Object.freeze({
      level: { spec: E(EVIDENCE_LEVELS), required: true },
      policyId: { spec: E(EVIDENCE_POLICY_IDS), required: true },
      decision: { spec: E(EVIDENCE_DECISIONS), required: true },
      outcome: { spec: E(EVIDENCE_OUTCOMES), required: true },
      recommendation: { spec: E(EVIDENCE_RECOMMENDATIONS), required: true },
      masteryDeltaBucket: { spec: E(EVIDENCE_DELTA_BUCKETS), required: true },
      adherenceBucket: { spec: E(EVIDENCE_ADHERENCE_BUCKETS), required: true }
    })
  }
});

export const EVIDENCE_EVENT_TYPES = Object.freeze(Object.keys(EVIDENCE_EVENT_SPEC));

/* ==========================================================================
 * 4. VALIDASI
 * ========================================================================== */

function isPlainObject(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function bad(reason, extra) { return Object.assign({ ok: false, reason }, extra || {}); }

/** Selisih hari kalender UTC antara `day` dan `now` (untuk cek skew). */
function dayDrift(day, nowMs) {
  const t = Date.parse(day + 'T00:00:00Z');
  if (Number.isNaN(t)) return Infinity;
  const today = Date.parse(new Date(nowMs).toISOString().slice(0, 10) + 'T00:00:00Z');
  return Math.abs(Math.round((t - today) / 86400000));
}

/**
 * normalizeEvidenceEvent(raw) -> { ok, event } | { ok:false, reason, field? }
 * Field asing = 400. Nilai di luar enum = 400. Tidak ada perbaikan diam-diam.
 */
export function normalizeEvidenceEvent(raw) {
  if (!isPlainObject(raw)) return bad('bad_event');
  const allowedTop = ['eventId', 'type', 'cohort', 'payload'];
  for (const k of Object.keys(raw)) {
    if (!allowedTop.includes(k)) return bad('foreign_field', { field: k });
  }
  if (typeof raw.eventId !== 'string' || !EVIDENCE_UUID_PATTERN.test(raw.eventId)) return bad('bad_event_id');
  if (typeof raw.cohort !== 'string' || !EVIDENCE_COHORT_PATTERN.test(raw.cohort)) return bad('bad_cohort');
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
  return { ok: true, event: { eventId: raw.eventId, type: raw.type, cohort: raw.cohort, payload: out } };
}

/**
 * normalizeEvidenceEnvelope(body, now) -> { ok, envelope } | { ok:false, reason }
 * `batchId` WAJIB (idempotensi retry bukan opsi tambahan), `day` wajib dan
 * harus berada dalam +/-2 hari dari jam server (klien offline lama tetap muat;
 * tanggal ngawur tidak).
 */
export function normalizeEvidenceEnvelope(body, nowMs = Date.now()) {
  if (!isPlainObject(body)) return bad('bad_body');
  const allowed = ['schema', 'batchId', 'day', 'events'];
  for (const k of Object.keys(body)) {
    if (!allowed.includes(k)) return bad('foreign_field', { field: k });
  }
  if (body.schema !== EVIDENCE_SCHEMA_ID) return bad('bad_schema');
  if (typeof body.batchId !== 'string' || !EVIDENCE_UUID_PATTERN.test(body.batchId)) return bad('bad_batch_id');
  if (typeof body.day !== 'string' || !DAY_PATTERN.test(body.day)) return bad('bad_day');
  if (dayDrift(body.day, nowMs) > EVIDENCE_LIMITS.DAY_SKEW_DAYS) return bad('day_out_of_range');
  if (!Array.isArray(body.events) || body.events.length === 0) return bad('no_events');
  if (body.events.length > EVIDENCE_LIMITS.MAX_EVENTS) return bad('too_many_events');

  const events = [];
  const seen = new Set();
  for (let i = 0; i < body.events.length; i++) {
    const res = normalizeEvidenceEvent(body.events[i]);
    if (!res.ok) return Object.assign(res, { index: i });
    // Duplikat DI DALAM satu batch: ditolak, bukan didiamkan. Server tidak boleh
    // menebak apakah klien bermaksud mengirim dua kali.
    if (seen.has(res.event.eventId)) return bad('duplicate_event_id', { index: i });
    seen.add(res.event.eventId);
    events.push(res.event);
  }
  return { ok: true, envelope: { schema: EVIDENCE_SCHEMA_ID, batchId: body.batchId, day: body.day, events } };
}

/* ==========================================================================
 * 5. AGREGASI
 * ========================================================================== */

/**
 * aggregateEvidence(day, events) -> [{ day, event, dim, n }]
 *
 * Satu baris per (hari, tipe event, `field:nilai`), plus satu baris `_:total`
 * per tipe supaya penyebut ("berapa bukti terukur") tidak perlu dijumlahkan
 * dari dimensi mana pun — menjumlahkan dimensi akan salah begitu ada field
 * opsional (misconceptionSkill).
 *
 * `cohort` TIDAK PERNAH menjadi dimensi. Hitungan murid distinct lahir di
 * lapisan D1 (`evidence_learner_day`), bukan di sini.
 */
export function aggregateEvidence(day, events) {
  const counts = new Map();
  const bump = (event, dim) => {
    const key = event + ' ' + dim;
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (const e of Array.isArray(events) ? events : []) {
    if (!e || !EVIDENCE_EVENT_SPEC[e.type] || !isPlainObject(e.payload)) continue;
    bump(e.type, '_:total');
    for (const k of Object.keys(e.payload)) bump(e.type, k + ':' + e.payload[k]);
  }
  const rows = [];
  for (const entry of counts) {
    const key = entry[0];
    const idx = key.indexOf(' ');
    rows.push({ day, event: key.slice(0, idx), dim: key.slice(idx + 1), n: entry[1] });
  }
  // Urutan stabil: test agregasi membandingkan array, bukan set.
  rows.sort((a, b) => (a.event === b.event ? (a.dim < b.dim ? -1 : 1) : (a.event < b.event ? -1 : 1)));
  return rows;
}

export default {
  EVIDENCE_SCHEMA_ID,
  EVIDENCE_LIMITS,
  EVIDENCE_EVENT_SPEC,
  EVIDENCE_EVENT_TYPES,
  normalizeEvidenceEvent,
  normalizeEvidenceEnvelope,
  aggregateEvidence
};
