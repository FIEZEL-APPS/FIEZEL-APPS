/**
 * FIEZEL — inti lane telemetri belajar `fiezel-learning-event-v1` (fungsi murni,
 * tanpa I/O, tanpa D1, tanpa jaringan, tanpa `env`).
 *
 * OTORITAS: `docs/BRAIN-TELEMETRY-SCHEMA.md` (kontrak DESAIN yang mengikat) +
 * `docs/BRAIN-DATA-PRIVACY.md` §7. Lane ini SENGAJA TERPISAH TOTAL dari lane
 * analytics (`workers/api/analytics/*`): skema berbeda, database berbeda
 * (`LEARNING_DB` / `fiezel-learning`), rute berbeda (`/api/learning/events`).
 * Memisahkan lane bukan estetika — analytics menghitung KEHADIRAN perangkat
 * (visitor_token harian), lane belajar menghitung HASIL KEBIJAKAN Brain, dan
 * mencampur keduanya di satu tabel adalah jalan tol re-identifikasi.
 *
 * Prinsip yang ditegakkan DI KODE, bukan hanya ditulis di dokumen:
 *  1. DUA tipe event saja: `answer_outcome` + `session_summary`
 *     (docs/BRAIN-TELEMETRY-SCHEMA.md §1.1). Tipe lain = bump versi skema.
 *  2. ENUM TERTUTUP TOTAL: setiap field string harus persis salah satu nilai
 *     di daftar bawah. Tidak ada teks bebas, tidak ada float presisi.
 *  3. TANPA timestamp presisi: satu-satunya penanda waktu adalah `day`
 *     (YYYY-MM-DD, di amplop) + `studyDay` (integer hari sejak instal).
 *     Field `at`/`ts`/timestamp apa pun DITOLAK sebagai field asing.
 *  4. TANPA identifier stabil: `eventId`/`batchId` wajib berbentuk UUID v4
 *     acak (dedup sekali pakai, retensi 7 hari), dan TIDAK ADA field
 *     user/device/install di allowlist mana pun — field asing = 400, bukan
 *     dibuang diam-diam (klien harus tahu payload-nya salah, kebijakan yang
 *     sama dengan `foreign_field` di route-events.js analytics).
 *  5. Grammar-only: `domain` hanya punya satu nilai sah (`grammar`),
 *     docs/BRAIN-TELEMETRY-SCHEMA.md §1.4.
 */

export const LEARNING_SCHEMA_ID = 'fiezel-learning-event-v1';

/* ==========================================================================
 * 1. ENUM TERTUTUP (docs/BRAIN-TELEMETRY-SCHEMA.md §3–§4 — jangan tambah nilai
 *    tanpa bump versi skema; "cuma nambah satu nilai" adalah cara kardinalitas
 *    mati pelan-pelan, §6)
 * ========================================================================== */

// §1.4: HANYA grammar. Listening/reading menunggu QA konten selesai.
export const LEARNING_DOMAINS = Object.freeze(['grammar']);
// Mengikuti LEVELS klien untuk grammar; C2 SENGAJA tidak ada (§3: `A1 A2 B1 B2 C1`).
export const LEARNING_LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1']);
export const LEARNING_MODES = Object.freeze(['lesson', 'adaptive', 'review', 'exam']);

/**
 * Famili skill kurikulum — daftar TERTUTUP (≤ ~30 nilai), diturunkan dari graf
 * lesson `grammar-curriculum-v1.json` (153 lesson). ID lesson individual TIDAK
 * pernah dikirim: 153 nilai × dimensi lain = sel kecil yang menunjuk orang;
 * famili skill cukup untuk mengevaluasi kebijakan Brain (§3, baris skillBucket).
 */
export const LEARNING_SKILL_BUCKETS = Object.freeze([
  'pronouns', 'articles', 'nouns-plural', 'possession', 'determiners-quantifiers',
  'prepositions-place', 'prepositions-time', 'prepositions-movement', 'prepositions-dependent',
  'tense-present', 'tense-past', 'tense-perfect', 'tense-future', 'aspect-contrast',
  'conditionals', 'modals-ability', 'modals-obligation', 'modals-deduction',
  'passive-voice', 'reported-speech', 'questions', 'comparison', 'adverbs',
  'verb-patterns', 'clauses-relative', 'clauses-subordinate', 'agreement',
  'negation', 'discourse', 'other'
]);

export const LEARNING_PREDICTED_BUCKETS = Object.freeze(['p0-40', 'p40-60', 'p60-80', 'p80-100']);
export const LEARNING_RT_BUCKETS = Object.freeze(['s0-2', 's2-5', 's5-15', 's15p']);
export const LEARNING_ATTEMPT_BUCKETS = Object.freeze(['a1', 'a2-3', 'a4p']);
export const LEARNING_GAP_BUCKETS = Object.freeze(['d0', 'd1-3', 'd4-14', 'd15p', 'none']);
export const LEARNING_DECISION_REASONS = Object.freeze(['due_review', 'weak_skill', 'target_difficulty', 'new_content', 'fallback']);
export const LEARNING_CONFIDENCE_BUCKETS = Object.freeze(['c-low', 'c-mid', 'c-high']);
// §4: daftar tertutup kebijakan terdaftar di manifest bundle Brain. Hari ini
// SATU. Kebijakan baru masuk lewat manifest + bump daftar ini, bukan runtime.
export const LEARNING_POLICY_IDS = Object.freeze(['core-brain-v3-default']);
export const LEARNING_Q_BUCKETS = Object.freeze(['q1-5', 'q6-12', 'q13p']);
export const LEARNING_ACCURACY_BUCKETS = Object.freeze(['p0-40', 'p40-60', 'p60-80', 'p80-100']);
export const LEARNING_DURATION_BUCKETS = Object.freeze(['m0-5', 'm5-15', 'm15p']);

/* ==========================================================================
 * 2. POLA BENTUK (bukan enum, tapi tetap dikunci ketat — "enum
 *    terbuka-terkontrol" §2: bentuknya dikunci supaya tidak ada ruang
 *    menyelipkan ID stabil atau teks bebas)
 * ========================================================================== */

/** UUID v4 lowercase — sama persis dengan BATCH_ID_PATTERN analytics. */
export const LEARNING_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// `appBuild`: nilai FIEZEL_PAGE_BUILD (`core-config.js`), mis. "m025-186".
const APP_BUILD_PATTERN = /^m\d{3,4}-\d{1,4}$/;
// `brainBundle`: identitas bundle Brain dari manifest, mis. "brain-v3".
const BRAIN_BUNDLE_PATTERN = /^brain-v\d{1,3}$/;
// `contentVersion`: mis. "grammar-templates@2026-08".
const CONTENT_VERSION_PATTERN = /^[a-z][a-z0-9-]{0,40}@\d{4}-\d{2}$/;

/* ==========================================================================
 * 3. SPESIFIKASI EVENT
 * ========================================================================== */

const T = {
  bool: () => ({ kind: 'bool' }),
  enum: values => ({ kind: 'enum', values })
};

/**
 * Payload per tipe. `required:false` HANYA untuk confidenceBucket
 * (§3: "absen ≠ c-low"). Semua field lain wajib — payload yang setengah terisi
 * bukan data yang buruk, ia data yang TIDAK BISA dievaluasi, dan menerima
 * sebagian berarti menoleransi klien yang salah tanpa memberitahunya.
 */
export const LEARNING_EVENT_SPEC = Object.freeze({
  answer_outcome: {
    fields: Object.freeze({
      domain: { spec: T.enum(LEARNING_DOMAINS), required: true },
      level: { spec: T.enum(LEARNING_LEVELS), required: true },
      mode: { spec: T.enum(LEARNING_MODES), required: true },
      skillBucket: { spec: T.enum(LEARNING_SKILL_BUCKETS), required: true },
      correct: { spec: T.bool(), required: true },
      predictedBucket: { spec: T.enum(LEARNING_PREDICTED_BUCKETS), required: true },
      responseTimeBucket: { spec: T.enum(LEARNING_RT_BUCKETS), required: true },
      attemptBucket: { spec: T.enum(LEARNING_ATTEMPT_BUCKETS), required: true },
      reviewGapBucket: { spec: T.enum(LEARNING_GAP_BUCKETS), required: true },
      hintUsed: { spec: T.bool(), required: true },
      decisionReason: { spec: T.enum(LEARNING_DECISION_REASONS), required: true },
      confidenceBucket: { spec: T.enum(LEARNING_CONFIDENCE_BUCKETS), required: false }
    })
  },
  session_summary: {
    fields: Object.freeze({
      domain: { spec: T.enum(LEARNING_DOMAINS), required: true },
      level: { spec: T.enum(LEARNING_LEVELS), required: true },
      policyId: { spec: T.enum(LEARNING_POLICY_IDS), required: true },
      plannedBucket: { spec: T.enum(LEARNING_Q_BUCKETS), required: true },
      answeredBucket: { spec: T.enum(LEARNING_Q_BUCKETS), required: true },
      completed: { spec: T.bool(), required: true },
      accuracyBucket: { spec: T.enum(LEARNING_ACCURACY_BUCKETS), required: true },
      durationBucket: { spec: T.enum(LEARNING_DURATION_BUCKETS), required: true }
    })
  }
});

export const LEARNING_EVENT_TYPES = Object.freeze(Object.keys(LEARNING_EVENT_SPEC));

/** Kunci amplop event. Perhatikan yang TIDAK ada: `at` — analytics menerima
 *  `at` lalu membuangnya (klien lama sudah mengirimnya), tapi lane ini belum
 *  punya satu emitter pun (grep `usage/events` = 0 hit di app.js), jadi tidak
 *  ada kompatibilitas untuk dilindungi. Timestamp presisi ditolak keras. */
const EVENT_KEYS = Object.freeze(['eventId', 'type', 'studyDay', 'payload']);

/** `studyDay`: hari sejak instal. 0..4000 ≈ 11 tahun; nilai di luar itu bukan
 *  murid, ia bug atau injeksi. */
const STUDY_DAY_MIN = 0;
const STUDY_DAY_MAX = 4000;

function coerce(spec, value) {
  switch (spec.kind) {
    case 'bool':
      return typeof value === 'boolean' ? value : null;
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value) ? value : null;
    default:
      return null;
  }
}

/* ==========================================================================
 * 4. NORMALISASI EVENT (allowlist ketat, tolak — bukan buang)
 * ========================================================================== */

/**
 * normalizeLearningEvent(raw) -> { ok, reason?, field?, event? }
 *
 * Berbeda sadar dari normalizeEvent analytics: field asing dan field tidak
 * sah membuat event DITOLAK (bukan dibuang lalu diterima), karena kontrak §5.5
 * berkata "4xx skema = buang event" di sisi klien — server yang diam-diam
 * menerima payload salah membuat emitter yang salah tidak pernah ketahuan.
 */
export function normalizeLearningEvent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'not_an_object' };
  }

  // Kunci di luar amplop event = ditolak. Ini juga yang menolak `at`,
  // `timestamp`, `userId`, `deviceId`, dan kawan-kawannya tanpa perlu daftar
  // hitam: allowlist tidak bisa dilewati dengan nama kreatif.
  for (const key of Object.keys(raw)) {
    if (!EVENT_KEYS.includes(key)) return { ok: false, reason: 'foreign_field', field: key };
  }

  const type = typeof raw.type === 'string' ? raw.type : '';
  const spec = Object.prototype.hasOwnProperty.call(LEARNING_EVENT_SPEC, type) ? LEARNING_EVENT_SPEC[type] : null;
  if (!spec) return { ok: false, reason: 'unknown_type' };

  // eventId: UUID v4 acak sekali pakai — kunci dedup, BUKAN identitas (§5.1).
  const eventId = typeof raw.eventId === 'string' ? raw.eventId.toLowerCase() : '';
  if (!LEARNING_UUID_PATTERN.test(eventId)) return { ok: false, reason: 'bad_event_id' };

  // studyDay: integer hari sejak instal. Float / string / negatif = tolak.
  const studyDay = raw.studyDay;
  if (typeof studyDay !== 'number' || !Number.isInteger(studyDay) ||
      studyDay < STUDY_DAY_MIN || studyDay > STUDY_DAY_MAX) {
    return { ok: false, reason: 'bad_study_day' };
  }

  const payload = raw.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, reason: 'bad_payload' };
  }

  const clean = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!Object.prototype.hasOwnProperty.call(spec.fields, key)) {
      return { ok: false, reason: 'foreign_field', field: key };
    }
    const v = coerce(spec.fields[key].spec, value);
    if (v === null) return { ok: false, reason: 'invalid_field', field: key };
    clean[key] = v;
  }
  for (const [key, def] of Object.entries(spec.fields)) {
    if (def.required && !(key in clean)) return { ok: false, reason: 'missing_field', field: key };
  }

  return { ok: true, event: { eventId, type, studyDay, payload: clean } };
}

/* ==========================================================================
 * 5. NORMALISASI AMPLOP BATCH (§2)
 * ========================================================================== */

export const LEARNING_LIMITS = Object.freeze({
  MAX_BODY_BYTES: 8 * 1024,   // 8 KB per batch — mewarisi route-events.js:29–33
  MAX_EVENTS: 20,             // per batch
  RATE_PER_WINDOW: 60,        // batch per jendela
  RATE_WINDOW_MS: 60 * 60 * 1000,
  DAY_SKEW_DAYS: 2,           // toleransi zona waktu + backfill offline
  DEDUP_TTL_DAYS: 7           // §5.3: jendela retry eventId = 7 hari
});

const ENVELOPE_KEYS = Object.freeze(['schema', 'batchId', 'appBuild', 'brainBundle', 'contentVersion', 'day', 'events']);

/**
 * normalizeLearningEnvelope(body, nowMs) -> { ok, reason?, field?, envelope? }
 *
 * `batchId` WAJIB (bukan opsional seperti analytics): lane ini lahir SETELAH
 * kontrak idempotency ditulis (§5 "WAJIB sebelum emitter pertama") dan belum
 * punya satu klien pun — tidak ada kompatibilitas mundur untuk dibayar, jadi
 * jaminan dedup dibuat tak bisa di-opt-out sejak byte pertama.
 */
export function normalizeLearningEnvelope(body, nowMs) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'bad_body' };
  }
  // Versi tak dikenal = fail-closed (§2).
  if (body.schema !== LEARNING_SCHEMA_ID) return { ok: false, reason: 'bad_schema' };

  for (const key of Object.keys(body)) {
    if (!ENVELOPE_KEYS.includes(key)) return { ok: false, reason: 'foreign_field', field: key };
  }

  const batchId = typeof body.batchId === 'string' ? body.batchId.toLowerCase() : '';
  if (!LEARNING_UUID_PATTERN.test(batchId)) return { ok: false, reason: 'bad_batch_id' };

  if (typeof body.appBuild !== 'string' || !APP_BUILD_PATTERN.test(body.appBuild)) {
    return { ok: false, reason: 'bad_app_build' };
  }
  if (typeof body.brainBundle !== 'string' || !BRAIN_BUNDLE_PATTERN.test(body.brainBundle)) {
    return { ok: false, reason: 'bad_brain_bundle' };
  }
  if (typeof body.contentVersion !== 'string' || !CONTENT_VERSION_PATTERN.test(body.contentVersion)) {
    return { ok: false, reason: 'bad_content_version' };
  }

  const day = typeof body.day === 'string' && DAY_PATTERN.test(body.day) ? body.day : null;
  if (!day) return { ok: false, reason: 'bad_day' };
  // `day` di luar ±2 hari dari jam server = tolak (pola daySkewOk analytics).
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t) || Math.abs(t - Number(nowMs)) > (LEARNING_LIMITS.DAY_SKEW_DAYS + 1) * 86400000) {
    return { ok: false, reason: 'day_out_of_range' };
  }

  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length === 0) return { ok: false, reason: 'no_events' };
  if (events.length > LEARNING_LIMITS.MAX_EVENTS) return { ok: false, reason: 'too_many_events' };

  const clean = [];
  const seenIds = new Set();
  for (let i = 0; i < events.length; i++) {
    const res = normalizeLearningEvent(events[i]);
    if (!res.ok) return { ok: false, reason: res.reason, field: res.field, index: i };
    // Dua event dengan eventId sama DI DALAM satu batch adalah bug klien,
    // bukan retry — tolak supaya bugnya terlihat, bukan terhitung sekali.
    if (seenIds.has(res.event.eventId)) return { ok: false, reason: 'duplicate_event_id', index: i };
    seenIds.add(res.event.eventId);
    clean.push(res.event);
  }

  return {
    ok: true,
    envelope: {
      batchId,
      appBuild: body.appBuild,
      brainBundle: body.brainBundle,
      contentVersion: body.contentVersion,
      day,
      events: clean
    }
  };
}

/* ==========================================================================
 * 6. AGREGASI — HANYA penghitung harian dimensi-enum (filosofi aggregate-only)
 * ========================================================================== */

function bump(map, key, by = 1) {
  map.set(key, (map.get(key) || 0) + by);
}

/**
 * aggregateLearning(day, events) -> [{ day, event, dim, n }]
 *
 * Keluarannya HANYA baris penghitung untuk tabel `learning_daily`
 * (day, event, dim, n). TIDAK ADA baris per-event mentah: raw store menyusul
 * HANYA bila lane consent pseudonim ada (keputusan wave ini). Dimensi adalah
 * `dimensi:nilai` dari enum tertutup — kardinalitas per hari dibatasi oleh
 * ukuran daftar enum, bukan oleh jumlah murid.
 *
 * Dua dimensi GABUNGAN yang disengaja (dan hanya dua, karena keduanya adalah
 * pertanyaan yang boleh dijawab server — §4 akhir):
 *   - `predicted_hit:<bucket>`  : kalibrasi Brain (Brier per bucket butuh
 *     benar-per-bucket, bukan hanya total per bucket). 4 sel.
 *   - `policy_completed:<id>` + `policy_accuracy:<id>:<bucket>` : "apakah
 *     kebijakan X menghasilkan sesi selesai dan akurasi di jendela target?".
 *     1 kebijakan × (1 + 4) sel.
 * Gabungan lain (mis. skill × level × correct) SENGAJA tidak dibuat: sel kecil
 * adalah cara agregat berubah menjadi cerita satu murid.
 */
export function aggregateLearning(day, events) {
  const counters = new Map(); // 'event|dim' -> n

  for (const e of Array.isArray(events) ? events : []) {
    if (!e || typeof e !== 'object' || !e.type || !e.payload) continue;
    const p = e.payload;
    const B = dim => bump(counters, `${e.type}|${dim}`);

    B('total');
    if (e.type === 'answer_outcome') {
      B(`outcome:${p.correct ? 'correct' : 'wrong'}`);
      B(`level:${p.level}`);
      B(`mode:${p.mode}`);
      B(`skill:${p.skillBucket}`);
      B(`predicted:${p.predictedBucket}`);
      if (p.correct) B(`predicted_hit:${p.predictedBucket}`);
      B(`rt:${p.responseTimeBucket}`);
      B(`attempt:${p.attemptBucket}`);
      B(`gap:${p.reviewGapBucket}`);
      B(`hint:${p.hintUsed ? 'true' : 'false'}`);
      B(`reason:${p.decisionReason}`);
      if (p.confidenceBucket) B(`confidence:${p.confidenceBucket}`);
    } else if (e.type === 'session_summary') {
      B(`level:${p.level}`);
      B(`policy:${p.policyId}`);
      B(`planned:${p.plannedBucket}`);
      B(`answered:${p.answeredBucket}`);
      B(`completed:${p.completed ? 'true' : 'false'}`);
      B(`accuracy:${p.accuracyBucket}`);
      B(`duration:${p.durationBucket}`);
      if (p.completed) B(`policy_completed:${p.policyId}`);
      B(`policy_accuracy:${p.policyId}:${p.accuracyBucket}`);
    }
  }

  const rows = [];
  for (const [key, n] of counters) {
    const sep = key.indexOf('|');
    rows.push({ day, event: key.slice(0, sep), dim: key.slice(sep + 1), n });
  }
  return rows;
}

export default {
  LEARNING_SCHEMA_ID,
  LEARNING_EVENT_SPEC,
  LEARNING_EVENT_TYPES,
  LEARNING_LIMITS,
  LEARNING_UUID_PATTERN,
  normalizeLearningEvent,
  normalizeLearningEnvelope,
  aggregateLearning
};
