/**
 * FIEZEL Wave E1 — endpoint lane telemetri belajar.
 *
 *   POST /api/learning/events    batch event `fiezel-learning-event-v1` (klien)
 *
 * KENAPA BERKAS INI ADA. Branch `brain-learning-infra-v1` (PR #226) mengapalkan
 * SISI KLIEN lane telemetri belajar — features/telemetry/fiezel-learning-events.js
 * (builder/sanitizer) dan fiezel-learning-transport.js (pembentuk batch, yang
 * mem-POST ke '/api/learning/events') — tetapi TIDAK ada satu baris pun server
 * yang menjawab rute itu. Berkas ini adalah sisi servernya, ditulis BERDIRI
 * SENDIRI di atas main (bukan cherry-pick): kontraknya disalin dari dokumen
 * desain BRAIN-TELEMETRY-SCHEMA.md + BRAIN-DATA-PRIVACY.md dan dari BENTUK KAWAT
 * NYATA yang dihasilkan buildEvent()/makeBatches() di PR #226, sehingga endpoint
 * ini langsung kompatibel begitu PR itu merged tanpa menyentuh satu pun berkas
 * yang PR itu ubah (kecuali titik wiring bersama route-wiring.js).
 *
 * BENTUK KAWAT YANG DITERIMA (disalin dari fiezel-learning-transport.makeBatches
 * + fiezel-learning-events.buildEvent — SATU-SATUNYA produsen amplop ini):
 *
 *   { "schema": "fiezel-learning-event-v1",
 *     "batchId": "uuid-v4 (opsional; wajib UUID bila hadir)",
 *     "events": [
 *       { "schema": "fiezel-learning-event-v1",
 *         "eventId": "uuid-v4 (WAJIB — kunci idempotensi)",
 *         "eventType": "answer_outcome" | "session_summary",
 *         "studyDay": 14,
 *         "payload": { ... enum/bucket tertutup, lihat FIELD_SPECS ... },
 *         "brainBundle"?: "...", "contentVersion"?: "..." } ] }
 *
 * PRINSIP YANG TIDAK BISA DITAWAR (BRAIN-TELEMETRY-SCHEMA.md §1, §5, §7):
 *  1. Enum TERTUTUP TOTAL — nilai di luar daftar = 400, bukan dibuang diam-diam.
 *  2. TANPA ID stabil, TANPA timestamp presisi, TANPA PII: nama kunci berbau
 *     identitas/waktu-presisi/teks-bebas ditolak keras (FORBIDDEN_KEYS), di
 *     amplop, di event, di payload.
 *  3. Server TIDAK menyimpan baris event: hanya counter agregat per
 *     (hari-terima x tipe x dimensi x nilai). lessonId/itemId divalidasi
 *     BENTUKNYA (pola ID sempit = penegakan "bukan kalimat") lalu DIBUANG —
 *     keduanya bukan dimensi agregat (BRAIN-TELEMETRY-SCHEMA §7 melarang ID
 *     konten individual menyentuh penyimpanan; AGG_FIELDS adalah allowlist-nya).
 *  4. Idempoten dua lapis: dedup batchId (amplop utuh) + dedup eventId (per
 *     event, INSERT OR IGNORE) — replay TIDAK PERNAH menaikkan agregat dua kali.
 *  5. FAIL-CLOSED terhadap D1: binding hilang / D1 galat = 503, TANPA agregasi
 *     dan TANPA jawaban sukses palsu. Klien (transport PR #226) memperlakukan
 *     non-2xx sebagai "antre ulang, coba nanti dengan eventId sama" — jadi
 *     fail-closed di sini TIDAK menghilangkan data dan TIDAK memblokir murid
 *     (telemetri tetap fail-open di sisi murid; yang fail-closed adalah
 *     PENERIMAAN data ke penyimpanan, bukan jalur belajarnya).
 *     Ini SENGAJA berbeda dari route-events.js analytics (yang menelan galat
 *     dedup): di sana dedup lahir belakangan sebagai perbaikan aditif; di sini
 *     idempotensi adalah kontrak sejak byte pertama (BRAIN-TELEMETRY-SCHEMA §5
 *     "WAJIB sebelum emitter pertama"), jadi menelan galatnya berarti
 *     mengapalkan justru cacat hitung-ganda yang kontrak itu tutup.
 *  6. Rem laju anon selaras pola `anon_issue` (rate-anon.js + 0001_identity.sql):
 *     kunci = HMAC(IP) yang ikut menandatangani INDEKS HARI (tidak bisa melacak
 *     antar hari), penolakan = nol tulis, amplop 429 KONSTAN tanpa satu pun nilai
 *     yang bergantung riwayat (bukan oracle pemetaan IP).
 *
 * PEMASANGAN: route-wiring.js -> registerLearningRoutes(collector(...)).
 * CORS TIDAK ditempel di sini: index.js menempelkannya di satu titik luar untuk
 * SEMUA rute (lihat prasasti "CORS DITEMPELKAN DI SATU TITIK LUAR" di index.js;
 * gerbangnya cors-envelope-test.js + learning-events-endpoint-test.js §CORS).
 */

import { hmacHex, truncate128 } from '../util-hmac.js';

/* -------------------------------------------------------------------------- */
/* Batas keras. MAX_BODY_BYTES/MAX_EVENTS disalin dari LIMITS transport klien   */
/* PR #226 (fiezel-learning-transport.js) yang sendiri menyalin route-events.js */
/* — satu angka, tiga tempat, satu sumber kebenaran historis.                   */
/* -------------------------------------------------------------------------- */
export const LIMITS = Object.freeze({
  MAX_BODY_BYTES: 8 * 1024,      // 8 KB per batch (== transport klien)
  MAX_EVENTS: 20,                // per batch (== transport klien)
  RATE_PER_WINDOW: 60,           // batch per jendela jam (== route-events.js)
  RATE_WINDOW_MS: 60 * 60 * 1000,
  RETRY_AFTER_S: 900,            // KONSTAN pada setiap 429 — bukan turunan riwayat
  DEDUP_TTL_DAYS: 7,             // jendela retry klien (BRAIN-TELEMETRY-SCHEMA §5.3)
  AGG_RETENTION_DAYS: 90         // umur agregat (BRAIN-DATA-PRIVACY §1)
});

export const SCHEMA_ID = 'fiezel-learning-event-v1';

/** UUID longgar-ketat ala route-events.js: 36 char hex+strip, huruf kecil. */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/* -------------------------------------------------------------------------- */
/* Enum tertutup — disalin APA ADANYA dari fiezel-learning-events.js PR #226.  */
/* Menambah/mengubah satu nilai pun = bump versi skema, bukan edit di sini     */
/* (BRAIN-TELEMETRY-SCHEMA §6).                                                */
/* -------------------------------------------------------------------------- */
const DOMAINS = Object.freeze(['grammar']);

const MODES = Object.freeze([
  'recognize_rule', 'recognize_objective', 'recall_memory_cue', 'choose_avoidance',
  'locate_decision_cue', 'contrast_distractor_1', 'contrast_distractor_2',
  'contrast_distractor_3', 'classify_family', 'complete_sentence',
  'diagnose_distractor_1', 'apply_form', 'diagnose_distractor_2',
  'diagnose_distractor_3', 'mastery_check', 'repair_distractor_1',
  'repair_distractor_2', 'repair_distractor_3', 'label_misconception_1',
  'label_misconception_2', 'identify_misconception', 'label_misconception_3',
  'justify_correct', 'sequence_reasoning', 'teach_back'
]);

const PREDICTED_BUCKETS = Object.freeze(['<0.55', '0.55-0.65', '0.65-0.75', '0.75-0.85', '0.85-0.95', '>=0.95']);
const RESPONSE_TIME_BUCKETS = Object.freeze(['<2s', '2-5s', '5-10s', '10-30s', '>=30s']);
const GAP_BUCKETS = Object.freeze(['<1d', '1-3d', '3-7d', '7-14d', '14-30d', '>=30d']);
const ATTEMPT_BUCKETS = Object.freeze(['1', '2-3', '4+']);
const CONFIDENCE_BUCKETS = Object.freeze(['low', 'medium', 'high']);
const DURATION_BUCKETS = Object.freeze(['<5m', '5-15m', '15-30m', '>=30m']);
const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1']);

/** Pola ID konten sempit (bukan kalimat, bukan teks bebas) — HANYA divalidasi,
 *  TIDAK PERNAH disimpan/diagregasi. */
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
/** Kode rationale/policy mesin: snake_case pendek berprefix brain/brain3. */
const REASON_RE = /^brain3?_[a-z0-9_]{1,48}$/;
/** Versi bundle/konten: token versi tanpa spasi. */
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+:-]{0,79}$/;

/**
 * Nama kunci TERLARANG di mana pun (amplop, event, payload) — lapisan kedua di
 * bawah allowlist, disalin dari FORBIDDEN_KEYS klien PR #226: ID stabil,
 * timestamp presisi, dan PII ditolak DENGAN NAMA, bukan sekadar "unknown".
 */
export const FORBIDDEN_KEYS = Object.freeze([
  'timestamp', 'timestampms', 'ts', 'time', 'date', 'datetime', 'now', 'nowms',
  'epoch', 'clienttime', 'servertime',
  'installid', 'userid', 'user', 'owneruuid', 'owner', 'deviceid', 'sessionid',
  'studyid', 'visitortoken', 'token', 'name', 'studentname', 'email', 'phone', 'ip',
  'answer', 'answertext', 'text', 'freetext', 'prompt', 'transcript', 'note', 'comment'
]);

/* Spesifikasi payload per tipe — identik dengan FIELD_SPECS klien PR #226. */
const FIELD_SPECS = Object.freeze({
  answer_outcome: Object.freeze({
    domain: { kind: 'enum', values: DOMAINS, required: true },
    lessonId: { kind: 'id', required: true },
    itemId: { kind: 'id', required: true },
    mode: { kind: 'enum', values: MODES, required: true },
    correct: { kind: 'bool', required: true },
    responseTimeBucket: { kind: 'enum', values: RESPONSE_TIME_BUCKETS, required: true },
    predictedBucket: { kind: 'enum', values: PREDICTED_BUCKETS, required: false },
    attemptBucket: { kind: 'enum', values: ATTEMPT_BUCKETS, required: false },
    reviewGapBucket: { kind: 'enum', values: GAP_BUCKETS, required: false },
    hint: { kind: 'bool', required: false },
    confidenceBucket: { kind: 'enum', values: CONFIDENCE_BUCKETS, required: false },
    decisionReason: { kind: 'reason', required: false }
  }),
  session_summary: Object.freeze({
    domain: { kind: 'enum', values: DOMAINS, required: true },
    level: { kind: 'enum', values: LEVELS, required: true },
    planned: { kind: 'count', required: true },
    answered: { kind: 'count', required: true },
    completed: { kind: 'bool', required: true },
    durationBucket: { kind: 'enum', values: DURATION_BUCKETS, required: true },
    policy: { kind: 'reason', required: false }
  })
});

export const EVENT_TYPES = Object.freeze(Object.keys(FIELD_SPECS));

/**
 * ALLOWLIST DIMENSI AGREGAT — inilah pagar §3 di kepala berkas. Field payload
 * yang TIDAK ada di sini (lessonId, itemId, planned/answered mentah) TIDAK
 * PUNYA JALAN ke penyimpanan: agregator membaca daftar ini, bukan payload-nya.
 * Semua nilai di sini enum/bool tertutup -> kardinalitas terukur dan k-anonimity
 * (BRAIN-DATA-PRIVACY §4) bisa ditegakkan di sisi baca.
 */
const AGG_FIELDS = Object.freeze({
  answer_outcome: Object.freeze([
    'domain', 'mode', 'correct', 'responseTimeBucket', 'predictedBucket',
    'attemptBucket', 'reviewGapBucket', 'hint', 'confidenceBucket', 'decisionReason'
  ]),
  session_summary: Object.freeze([
    'domain', 'level', 'completed', 'durationBucket', 'policy'
  ])
});

/* -------------------------------------------------------------------------- */
/* Util kecil.                                                                */
/* -------------------------------------------------------------------------- */

function json(body, status = 200, extraHeaders = null) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) headers[k] = v;
  return new Response(JSON.stringify(body), { status, headers });
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Jendela jam UTC untuk rem laju: 'YYYY-MM-DDTHH'. */
function hourKey(ms) {
  return new Date(ms).toISOString().slice(0, 13);
}

function isPlainObject(x) {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function findForbiddenKey(obj) {
  for (const k of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.indexOf(k.toLowerCase()) !== -1) return k;
  }
  return null;
}

/** studyDay -> bucket kasar. Nilai mentah (0..100000) terlalu halus untuk jadi
 *  dimensi agregat pada populasi kecil; tiga bucket cukup untuk membedakan
 *  murid baru / berjalan / lama. */
export function bucketStudyDay(d) {
  if (d <= 7) return 'sd0-7';
  if (d <= 30) return 'sd8-30';
  return 'sd31p';
}

/** planned/answered (0..500) -> bucket q* (BRAIN-TELEMETRY-SCHEMA §4). Angka
 *  mentahnya TIDAK PERNAH disimpan. */
export function bucketCount(n) {
  if (n === 0) return 'q0';
  if (n <= 5) return 'q1-5';
  if (n <= 12) return 'q6-12';
  return 'q13p';
}

function validateField(kind, values, v) {
  switch (kind) {
    case 'enum': return typeof v === 'string' && values.indexOf(v) !== -1;
    case 'bool': return v === true || v === false;
    case 'id': return typeof v === 'string' && ID_RE.test(v);
    case 'reason': return typeof v === 'string' && REASON_RE.test(v);
    case 'count': return typeof v === 'number' && Number.isFinite(v) && Math.floor(v) === v && v >= 0 && v <= 500;
    default: return false;
  }
}

/**
 * normalizeBatchId(raw) -> { ok, value } — kebijakan identik route-events.js:
 * batchId OPSIONAL (transport PR #226 belum mengirimnya; batch tanpa batchId
 * tetap idempoten lewat dedup eventId), tetapi bila hadir dan bentuknya bukan
 * UUID -> batch DITOLAK. Tidak ada ruang menyelipkan ID stabil ke kolom ini.
 */
export function normalizeBatchId(raw) {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false };
  const id = raw.toLowerCase();
  if (!UUID_PATTERN.test(id)) return { ok: false };
  return { ok: true, value: id };
}

/* -------------------------------------------------------------------------- */
/* Pembacaan body dengan batas byte KERAS (dicek sebelum JSON.parse) — pola     */
/* yang sama dengan route-events.js: content-length bisa bohong, byte diukur.  */
/* -------------------------------------------------------------------------- */
export async function readBoundedJson(request, maxBytes = LIMITS.MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return { ok: false, reason: 'too_large' };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) return { ok: false, reason: 'too_large' };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, reason: 'bad_json' };
  }
}

/* -------------------------------------------------------------------------- */
/* Inti pemrosesan — MURNI (tanpa jaringan/D1/jam internal), diuji langsung.   */
/* -------------------------------------------------------------------------- */

const ENVELOPE_KEYS = Object.freeze(['schema', 'batchId', 'events']);
const EVENT_KEYS = Object.freeze(['schema', 'eventId', 'eventType', 'type', 'studyDay', 'payload', 'brainBundle', 'contentVersion']);

/**
 * processLearningBatch(body) -> { status, payload, batchId?, clean? }
 *
 * Aturan yang tidak boleh dilemahkan:
 *  - schema bukan versi dikenal      -> 400 bad_schema (fail-closed pada versi asing)
 *  - kunci terlarang di mana pun     -> 400 forbidden_field + nama kuncinya
 *  - kunci asing di mana pun         -> 400 foreign_field (klien harus tahu salah)
 *  - eventId bukan UUID              -> 400 bad_event_id (kunci idempotensi wajib sehat)
 *  - nilai di luar enum tertutup     -> 400 invalid_field + nama field + index
 *  - > MAX_EVENTS                    -> 413 too_many_events
 */
export function processLearningBatch(body) {
  if (!isPlainObject(body)) {
    return { status: 400, payload: { ok: false, error: 'bad_body' } };
  }
  const badEnvKey = findForbiddenKey(body);
  if (badEnvKey) {
    return { status: 400, payload: { ok: false, error: 'forbidden_field', field: badEnvKey } };
  }
  const foreignEnv = Object.keys(body).filter((k) => ENVELOPE_KEYS.indexOf(k) === -1);
  if (foreignEnv.length > 0) {
    return { status: 400, payload: { ok: false, error: 'foreign_field', fields: foreignEnv } };
  }
  if (body.schema !== SCHEMA_ID) {
    return { status: 400, payload: { ok: false, error: 'bad_schema' } };
  }
  const batch = normalizeBatchId(body.batchId);
  if (!batch.ok) {
    return { status: 400, payload: { ok: false, error: 'bad_batch_id' } };
  }
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length === 0) {
    return { status: 400, payload: { ok: false, error: 'no_events' } };
  }
  if (events.length > LIMITS.MAX_EVENTS) {
    return { status: 413, payload: { ok: false, error: 'too_many_events', max: LIMITS.MAX_EVENTS } };
  }

  const clean = [];
  const seenIds = new Set();
  for (let i = 0; i < events.length; i++) {
    const raw = events[i];
    if (!isPlainObject(raw)) {
      return { status: 400, payload: { ok: false, error: 'bad_event', index: i } };
    }
    const badKey = findForbiddenKey(raw) || (isPlainObject(raw.payload) ? findForbiddenKey(raw.payload) : null);
    if (badKey) {
      return { status: 400, payload: { ok: false, error: 'forbidden_field', field: badKey, index: i } };
    }
    const foreign = Object.keys(raw).filter((k) => EVENT_KEYS.indexOf(k) === -1);
    if (foreign.length > 0) {
      return { status: 400, payload: { ok: false, error: 'foreign_field', fields: foreign, index: i } };
    }
    if (raw.schema !== undefined && raw.schema !== SCHEMA_ID) {
      return { status: 400, payload: { ok: false, error: 'bad_schema', index: i } };
    }
    // `eventType` (bentuk buildEvent PR #226) atau `type` (bentuk contoh dokumen
    // skema) — salah satunya, tidak dua-duanya.
    if (raw.eventType !== undefined && raw.type !== undefined) {
      return { status: 400, payload: { ok: false, error: 'foreign_field', fields: ['type'], index: i } };
    }
    const type = raw.eventType !== undefined ? raw.eventType : raw.type;
    if (typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(FIELD_SPECS, type)) {
      return { status: 400, payload: { ok: false, error: 'unknown_event', index: i } };
    }
    // eventId: UUID WAJIB. Kunci idempotensi yang cacat lebih berbahaya daripada
    // yang absen — ia diam-diam mematikan dedup — jadi absen ATAU cacat = tolak.
    const eventId = typeof raw.eventId === 'string' ? raw.eventId.toLowerCase() : null;
    if (!eventId || !UUID_PATTERN.test(eventId)) {
      return { status: 400, payload: { ok: false, error: 'bad_event_id', index: i } };
    }
    if (seenIds.has(eventId)) {
      // Duplikat DI DALAM satu batch adalah bug klien, bukan retry sah.
      return { status: 400, payload: { ok: false, error: 'duplicate_event_id', index: i } };
    }
    seenIds.add(eventId);
    const studyDay = raw.studyDay;
    if (typeof studyDay !== 'number' || !Number.isFinite(studyDay) || Math.floor(studyDay) !== studyDay || studyDay < 0 || studyDay > 100000) {
      return { status: 400, payload: { ok: false, error: 'invalid_field', field: 'studyDay', index: i } };
    }
    if (raw.brainBundle !== undefined && (typeof raw.brainBundle !== 'string' || !VERSION_RE.test(raw.brainBundle))) {
      return { status: 400, payload: { ok: false, error: 'invalid_field', field: 'brainBundle', index: i } };
    }
    if (raw.contentVersion !== undefined && (typeof raw.contentVersion !== 'string' || !VERSION_RE.test(raw.contentVersion))) {
      return { status: 400, payload: { ok: false, error: 'invalid_field', field: 'contentVersion', index: i } };
    }
    if (!isPlainObject(raw.payload)) {
      return { status: 400, payload: { ok: false, error: 'bad_payload', index: i } };
    }

    const spec = FIELD_SPECS[type];
    const pKeys = Object.keys(raw.payload);
    for (const k of pKeys) {
      if (!Object.prototype.hasOwnProperty.call(spec, k)) {
        return { status: 400, payload: { ok: false, error: 'foreign_field', fields: [k], index: i } };
      }
    }
    const payload = {};
    for (const k of Object.keys(spec)) {
      const fs = spec[k];
      const has = Object.prototype.hasOwnProperty.call(raw.payload, k) && raw.payload[k] !== undefined;
      if (!has) {
        if (fs.required) return { status: 400, payload: { ok: false, error: 'missing_field', field: k, index: i } };
        continue;
      }
      if (!validateField(fs.kind, fs.values, raw.payload[k])) {
        return { status: 400, payload: { ok: false, error: 'invalid_field', field: k, index: i } };
      }
      payload[k] = raw.payload[k];
    }

    clean.push({ eventId, type, studyDay, payload });
  }

  return { status: 202, payload: { ok: true, accepted: clean.length }, batchId: batch.value, clean };
}

/**
 * buildAggregate(events, day) -> Map('type|dim|val' -> n).
 * HANYA membaca AGG_FIELDS (allowlist) + bucket turunan; payload lain — termasuk
 * lessonId/itemId yang sudah tervalidasi — tidak pernah menyentuh Map ini.
 */
export function buildAggregate(events, day) {
  const agg = new Map();
  const bump = (type, dim, val) => {
    const key = `${type}|${dim}|${val}`;
    agg.set(key, (agg.get(key) || 0) + 1);
  };
  for (const ev of events) {
    bump(ev.type, '_events', 'all');
    bump(ev.type, 'studyDayBucket', bucketStudyDay(ev.studyDay));
    for (const dim of AGG_FIELDS[ev.type]) {
      if (!Object.prototype.hasOwnProperty.call(ev.payload, dim)) continue;
      const v = ev.payload[dim];
      bump(ev.type, dim, typeof v === 'boolean' ? String(v) : v);
    }
    if (ev.type === 'session_summary') {
      bump(ev.type, 'plannedBucket', bucketCount(ev.payload.planned));
      bump(ev.type, 'answeredBucket', bucketCount(ev.payload.answered));
    }
  }
  return { day, entries: agg };
}

/* -------------------------------------------------------------------------- */
/* Rem laju anon — selaras pola anon_issue (rate-anon.js).                     */
/* -------------------------------------------------------------------------- */

function clientIpOf(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '';
  return ip.trim() || 'noip';
}

function rateSaltOf(env) {
  // Nilai fallback bukan rahasia keamanan: kunci ini hanya menyamarkan IP di
  // tabel rem berumur-jam; indeks hari di pesan yang membuatnya tak bisa
  // dipakai melacak antar hari, bukan kerahasiaan salt-nya.
  return String((env && (env.RATE_SALT || env.ANON_IP_SALT)) || 'fiezel-learning-rate-v1');
}

async function ipHmacOf(env, ip, nowMs) {
  // Indeks hari ikut ditandatangani — hash hari ini != hash besok untuk IP yang
  // sama (pola anon_issue, 0001_identity.sql).
  return truncate128(await hmacHex(rateSaltOf(env), Math.floor(nowMs / 86400000) + '|' + ip));
}

export const SQL = Object.freeze({
  rateRead: 'SELECT batches FROM learning_rate WHERE win = ?1 AND ip_hmac = ?2',
  rateBump:
    'INSERT INTO learning_rate (win, ip_hmac, batches) VALUES (?1, ?2, 1) ' +
    'ON CONFLICT(win, ip_hmac) DO UPDATE SET batches = batches + 1',
  batchSeen: 'SELECT batch_id FROM learning_batch_dedup WHERE batch_id = ?1',
  batchInsert: 'INSERT OR IGNORE INTO learning_batch_dedup (batch_id, day) VALUES (?1, ?2)',
  eventInsert: 'INSERT OR IGNORE INTO learning_event_dedup (event_id, day) VALUES (?1, ?2)',
  aggUpsert:
    'INSERT INTO learning_daily (day, event_type, dim, val, n) VALUES (?1, ?2, ?3, ?4, ?5) ' +
    'ON CONFLICT(day, event_type, dim, val) DO UPDATE SET n = n + ?5',
  // Purge OPPORTUNISTIK di jalur tulis (bukan cron): tabel-tabel ini kecil dan
  // janji retensi (dedup 7 hari, agregat 90 hari, rem 2 hari) harus ditepati
  // tanpa menyentuh rollup.js analytics yang sedang diubah PR #226.
  purgeEventDedup: 'DELETE FROM learning_event_dedup WHERE day < ?1',
  purgeBatchDedup: 'DELETE FROM learning_batch_dedup WHERE day < ?1',
  purgeRate: 'DELETE FROM learning_rate WHERE win < ?1',
  purgeAgg: 'DELETE FROM learning_daily WHERE day < ?1'
});

/* -------------------------------------------------------------------------- */
/* Handler HTTP.                                                              */
/* -------------------------------------------------------------------------- */

function learningDb(env) {
  // Database yang SAMA dengan zona analytics (fiezel-stats) — terpisah dari
  // kuota/identitas by construction. route-wiring.analyticsEnv() sudah
  // meng-alias STATS_DB -> ANALYTICS_DB.
  return (env && (env.LEARNING_DB || env.ANALYTICS_DB || env.DB_ANALYTICS)) || null;
}

function enabled(env) {
  // Default MATI, seperti ANALYTICS_ENABLED. Saat mati, jawab 202 disabled —
  // bukan 404 — supaya klien lama tidak retry tanpa henti (pola route-events.js).
  return String((env && env.LEARNING_ENABLED) || 'off') === 'on';
}

/** Amplop 429 KONSTAN (pola rejectIssue rate-anon.js): tanpa issued/remaining/
 *  limit/resetAt — 429 tidak boleh menjadi alat pemetaan riwayat IP. */
function rateLimited() {
  return json(
    { ok: false, error: 'rate_limited', retryAfter: LIMITS.RETRY_AFTER_S },
    429,
    { 'retry-after': String(LIMITS.RETRY_AFTER_S) }
  );
}

/** FAIL-CLOSED: satu amplop 503 untuk SEMUA galat D1 — binding hilang, tabel
 *  belum termigrasi, D1 tersendat. Tidak membocorkan sebab. */
function unavailable() {
  return json({ ok: false, error: 'unavailable' }, 503);
}

/** Jam sebagai PARAMETER (pola index.js nowFrom): argumen `now` menang, lalu
 *  TEST_CLOCK_MS (jam suntik harness uji), baru jam dinding. */
function clockOf(env, now) {
  if (Number.isFinite(now) && now > 0) return now;
  const injected = Number(env && env.TEST_CLOCK_MS);
  return Number.isFinite(injected) && injected > 0 ? injected : Date.now();
}

export async function handleLearningEvents(request, env, executionCtx, now = null) {
  if (!enabled(env)) return json({ ok: true, accepted: 0, disabled: true }, 202);

  const body = await readBoundedJson(request);
  if (!body.ok) return json({ ok: false, error: body.reason }, body.reason === 'too_large' ? 413 : 400);

  const result = processLearningBatch(body.value);
  if (result.status !== 202) return json(result.payload, result.status);

  const db = learningDb(env);
  if (!db) return unavailable(); // fail-closed: tanpa D1 tidak ada penerimaan

  const nowMs = clockOf(env, now);
  const day = dayKey(nowMs);
  const win = hourKey(nowMs);

  try {
    // 1. Rem laju. Penolakan = nol tulis (bump ikut db.batch di langkah 4).
    const hashed = await ipHmacOf(env, clientIpOf(request), nowMs);
    const rateRow = await db.prepare(SQL.rateRead).bind(win, hashed).first();
    if (rateRow && Number(rateRow.batches) >= LIMITS.RATE_PER_WINDOW) return rateLimited();

    // 2. Dedup level-batch: amplop yang sudah pernah diterima berhenti di sini.
    //    200 (bukan 202): tidak ada yang diproses; klien boleh berhenti retry.
    if (result.batchId) {
      const seen = await db.prepare(SQL.batchSeen).bind(result.batchId).first();
      if (seen) return json({ ok: true, accepted: 0, duplicate: true }, 200);
    }

    // 3. Dedup level-event: hanya eventId BARU yang boleh menaikkan agregat.
    const ids = result.clean.map((e) => e.eventId);
    const placeholders = ids.map((_, i) => '?' + (i + 1)).join(', ');
    const dupRead = await db
      .prepare('SELECT event_id FROM learning_event_dedup WHERE event_id IN (' + placeholders + ')')
      .bind(...ids)
      .all();
    const already = new Set(((dupRead && dupRead.results) || []).map((r) => String(r.event_id)));
    const fresh = result.clean.filter((e) => !already.has(e.eventId));

    if (fresh.length === 0) {
      // Seluruh isi batch adalah replay — balas sukses TANPA satu tulis pun.
      return json({ ok: true, accepted: 0, duplicate: true }, 200);
    }

    // 4. SATU db.batch transaksional: kunci dedup + agregat + rem + purge TTL.
    //    Kalau satu pernyataan gagal, D1 membatalkan semuanya — tidak ada
    //    keadaan "kunci tertulis tapi agregat hilang" yang membuat retry bohong.
    const agg = buildAggregate(fresh, day);
    const stmts = [];
    if (result.batchId) stmts.push(db.prepare(SQL.batchInsert).bind(result.batchId, day));
    for (const ev of fresh) stmts.push(db.prepare(SQL.eventInsert).bind(ev.eventId, day));
    for (const [key, n] of agg.entries) {
      const [type, dim, val] = key.split('|');
      stmts.push(db.prepare(SQL.aggUpsert).bind(day, type, dim, val, n));
    }
    stmts.push(db.prepare(SQL.rateBump).bind(win, hashed));
    const dedupCutoff = dayKey(nowMs - LIMITS.DEDUP_TTL_DAYS * 86400000);
    stmts.push(db.prepare(SQL.purgeEventDedup).bind(dedupCutoff));
    stmts.push(db.prepare(SQL.purgeBatchDedup).bind(dayKey(nowMs - LIMITS.DEDUP_TTL_DAYS * 86400000)));
    stmts.push(db.prepare(SQL.purgeRate).bind(hourKey(nowMs - 2 * LIMITS.RATE_WINDOW_MS)));
    stmts.push(db.prepare(SQL.purgeAgg).bind(dayKey(nowMs - LIMITS.AGG_RETENTION_DAYS * 86400000)));
    await db.batch(stmts);

    const payload = { ok: true, accepted: fresh.length };
    if (fresh.length < result.clean.length) payload.deduped = result.clean.length - fresh.length;
    return json(payload, 202);
  } catch (_) {
    // FAIL-CLOSED (kontrak §5 kepala berkas): D1 galat = 503, bukan "anggap
    // baru lalu agregasi" (yang menggandakan hitungan saat retry) dan bukan
    // 2xx bohong (yang membuat klien meng-ack event yang tidak pernah dihitung).
    return unavailable();
  }
}

/* -------------------------------------------------------------------------- */
/* Pendaftaran rute — bentuk router yang sama dengan registerAnalyticsRoutes.  */
/* -------------------------------------------------------------------------- */

export const ROUTES = Object.freeze([
  { method: 'POST', path: '/api/learning/events', handler: 'handleLearningEvents' }
]);

export function registerLearningRoutes(router) {
  if (!router) throw new Error('registerLearningRoutes: router wajib');

  const wrap = (fn) => async (...args) => {
    const a = args[0];
    if (a && a.req && typeof a.req.raw === 'object') {
      // Hono: c.req.raw = Request, c.env, c.executionCtx
      return fn(a.req.raw, a.env, a.executionCtx || a.ctx || null, args[3]);
    }
    if (a instanceof Request || (a && typeof a.headers === 'object' && typeof a.text === 'function')) {
      return fn(a, args[1], args[2], args[3]);
    }
    // Konteks gaya objek: { request, env, ctx, now }
    return fn(a && a.request, (a && a.env) || args[1], (a && a.ctx) || args[2], (a && a.now) || args[3]);
  };

  const add = (method, path, fn) => {
    const lower = method.toLowerCase();
    if (typeof router[lower] === 'function') router[lower](path, wrap(fn));
    else if (typeof router.on === 'function') router.on(method, path, wrap(fn));
    else if (typeof router.add === 'function') router.add(method, path, wrap(fn));
    else throw new Error('registerLearningRoutes: bentuk router tidak dikenali');
  };

  add('POST', '/api/learning/events', handleLearningEvents);
  return router;
}

export default {
  registerLearningRoutes, handleLearningEvents, processLearningBatch, buildAggregate,
  normalizeBatchId, readBoundedJson, bucketStudyDay, bucketCount,
  LIMITS, SCHEMA_ID, UUID_PATTERN, EVENT_TYPES, FORBIDDEN_KEYS, SQL, ROUTES
};
