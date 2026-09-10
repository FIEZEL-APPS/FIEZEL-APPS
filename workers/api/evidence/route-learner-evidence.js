/**
 * FIEZEL — SLOT 9: endpoint lane BUKTI BELAJAR PER-MURID Braincore.
 *
 *   POST /api/braincore/learner-evidence          batch bukti, MILIK PEMANGGIL
 *   POST /api/braincore/learner-evidence/consent  {granted:boolean}
 *   GET  /api/owner/learners                      direktori murid (owner)
 *   GET  /api/owner/learner-evidence?sub=…        bukti SATU murid (owner)
 *
 * ==========================================================================
 * DUA GERBANG YANG BERBEDA, SEPERTI LANE AGREGAT — TETAPI KEBALIKANNYA
 * ==========================================================================
 * Di lane agregat, jalur TULIS tidak menuntut identitas apa pun (payloadnya
 * memang tidak boleh punya identitas). Di lane INI justru sebaliknya: jalur
 * tulis MENUNTUT identitas, karena tanpa identitas tidak ada yang bisa
 * ditulisi. Yang tidak berubah adalah dari mana identitas itu datang.
 *
 *   `sub` SELALU `ctx.identity.sub` dari cookie `fz_id` ber-HMAC (mw-identity).
 *   TIDAK PERNAH dari body, query, atau header.
 *
 * Body yang menitipkan `{"sub":"orang-lain"}` atau `{"userId":"…"}` tidak
 * "diabaikan": ia ditolak 400 `schema_invalid` oleh validator deny-by-default
 * di `learner-evidence-core.js` (allowedTop = eventId/type/payload). Perbedaan
 * itu penting — field yang diabaikan hari ini adalah field yang dibaca kode
 * baru besok.
 *
 * Jalur BACA menuntut token OWNER (pola `cron-status.js` / `route-evidence.js`:
 * sha256 hex di secret `OWNER_TOKEN_HASH`, banding waktu-konstan, fail-closed).
 * Cookie murid yang sah TIDAK PERNAH cukup untuk membuka rute owner, dan tidak
 * ada rute mana pun yang menerima `sub` dari pemanggil BUKAN-owner.
 *
 * ==========================================================================
 * PERSETUJUAN: DIHAPUS m025-235 ATAS KEPUTUSAN OWNER
 * ==========================================================================
 * Sampai m025-234, POST bukti menuntut baris aktif di `learner_evidence_consent`
 * dan menjawab 403 `consent_required` tanpanya. Owner menghapus syarat itu:
 * FIEZEL adalah aplikasi kelas, guru memberitahu muridnya sebelum mereka
 * memasang, dan bukti belajar ini memang data guru. Murid yang memasang
 * aplikasinya langsung tersinkron — termasuk yang sudah memasang lebih dulu,
 * begitu shell m025-235 sampai ke perangkatnya.
 *
 * TABELNYA TETAP ADA, dengan tugas yang lebih sempit: POST .../consent
 * {granted:false} MENGHAPUS bukti murid itu (revokeConsent). Sesudah sakelarnya
 * hilang, itu satu-satunya penghapusan atas permintaan yang tersisa selain
 * menunggu purge 180 hari — jadi ia dipertahankan, bukan ikut dibuang.
 *
 * PEMASANGAN: keempat rute lewat `route-slots.js` (array ROUTES). Lane ini
 * TIDAK lewat `route-wiring.js`: ia tidak memanggil provider berbayar, tidak
 * butuh jembatan kuota, dan — yang paling menentukan — ia memakai CORE_DB,
 * bukan EVIDENCE_DB. Handler di berkas ini tidak boleh pernah memegang
 * EVIDENCE_DB.
 */

import { jsonResponse, jsonError, unauthenticated, ERR } from '../errors.js';
import { readJsonFromCtx } from '../mw-guard.js';
import { validateShape, studyDayWib } from '../schema.js';
import { readServerFlags, featureAllowedFrom } from '../feature-gate.js';
import { LEARNER_EVIDENCE_FEATURE_SPEC } from '../learner-evidence-config.js';
import { ownerAllowed } from './route-evidence.js';
import {
  LEARNER_EVIDENCE_LIMITS,
  LEARNER_EVIDENCE_CONSENT_POLICY,
  LEARNER_EVIDENCE_SUMMARY_SCHEMA,
  LEARNER_DIRECTORY_SCHEMA,
  LEARNER_EVIDENCE_EVENT_TYPES,
  isValidSub,
  normalizeLearnerName,
  LEARNER_NAME_MAX,
  normalizeLearnerEvidenceEnvelope,
  summarizeLearnerRows
} from './learner-evidence-core.js';
import {
  ensureLearnerEvidenceSchema,
  grantConsent,
  revokeConsent,
  writeLearnerEvidence,
  writeLearnerName,
  readLearnerName,
  readLearnerDirectory,
  readLearnerProfile,
  readLearnerState,
  readLearnerEvidenceRows
} from './learner-evidence-store-d1.js';

export const LEARNER_EVIDENCE_PATH = '/api/braincore/learner-evidence';
export const LEARNER_CONSENT_PATH = '/api/braincore/learner-evidence/consent';
export const LEARNER_NAME_PATH = '/api/learner/name';
export const OWNER_LEARNERS_PATH = '/api/owner/learners';
export const OWNER_LEARNER_EVIDENCE_PATH = '/api/owner/learner-evidence';

export const LIMITS = LEARNER_EVIDENCE_LIMITS;

function corsOpt(ctx) {
  return { headers: (ctx && ctx.corsHeaders) || {} };
}

function learnerDb(env) {
  // HANYA database inti. Sengaja tanpa fallback ke EVIDENCE_DB: salah binding
  // harus terlihat sebagai "lane diam" (503), bukan sebagai bukti beridentitas
  // yang mendarat di database yang seluruh kontraknya menjanjikan anonimitas.
  return (env && (env.CORE_DB || env.DB)) || null;
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function shiftDay(day, delta) {
  return dayKey(Date.parse(day + 'T00:00:00Z') + delta * 86400000);
}

/* -------------------------------------------------------------------------- */
/* Rem laju PER-SUB, hanya di memori isolate. Ember SENDIRI: lane ini tidak     */
/* boleh memakan jatah rem lane agregat, dan sebaliknya.                       */
/* -------------------------------------------------------------------------- */
const subBuckets = new Map();

export function checkSubRateLimit(sub, now = Date.now()) {
  const bucket = subBuckets.get(sub);
  if (!bucket || now - bucket.start >= LIMITS.RATE_WINDOW_MS) {
    subBuckets.set(sub, { start: now, count: 1 });
    if (subBuckets.size > 5000) subBuckets.clear();
    return true;
  }
  if (bucket.count >= LIMITS.RATE_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

/* ============================================== gerbang murid (401/403/503) = */

/**
 * Urutan penolakan selaras `socialGate` (route-social.js):
 *   identitas (401) -> flag fitur (403, fail-closed) -> DB (503) -> skema.
 * m025-235: gerbang PERSETUJUAN dihapus atas keputusan OWNER. FIEZEL adalah aplikasi kelas —
 * guru memberitahu muridnya sebelum mereka memasang, dan bukti belajar ini memang data guru.
 * Yang TIDAK ikut dilonggarkan: identitas tetap dari cookie ber-HMAC (bukan dari body), tiga
 * sakelar server tetap harus sepakat dan tetap fail-closed, retensi tetap 180 hari, dan
 * `learner_evidence_consent` tetap ada sebagai jalur HAPUS (POST .../consent {granted:false}
 * menghapus bukti murid itu) — satu-satunya penghapusan atas permintaan yang tersisa.
 */
async function learnerGate(ctx) {
  const opt = corsOpt(ctx);
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return { deny: unauthenticated(opt) };
  }
  const sub = ctx.identity.sub;
  const snapshot = await readServerFlags(ctx.env);
  const verdict = featureAllowedFrom(ctx.env, snapshot, LEARNER_EVIDENCE_FEATURE_SPEC);
  if (!verdict.allowed) {
    // Satu bentuk 403 untuk semua sebab flag; sebab spesifik hanya untuk log.
    return { deny: jsonError(403, ERR.LEARNER_EVIDENCE_DISABLED, {}, opt) };
  }
  const db = learnerDb(ctx.env);
  if (!db) return { deny: jsonError(503, ERR.UNAVAILABLE, {}, opt) };
  try {
    await ensureLearnerEvidenceSchema(db);
  } catch {
    return { deny: jsonError(503, ERR.UNAVAILABLE, {}, opt) };
  }
  return { db, sub, day: studyDayWib(ctx.now), opt };
}

/* ================================================================ TULIS ==== */

export async function routeLearnerEvidence(ctx) {
  const gate = await learnerGate(ctx);
  if (gate.deny) return gate.deny;
  if (!checkSubRateLimit(gate.sub, ctx.now)) {
    return jsonError(429, ERR.RATE_LIMITED, {}, gate.opt);
  }
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;

  const result = normalizeLearnerEvidenceEnvelope(body.value, ctx.now);
  if (!result.ok) {
    const status = result.reason === 'too_many_events' ? 413 : 400;
    const extra = { reason: result.reason };
    if (result.reason === 'too_many_events') extra.max = LIMITS.MAX_EVENTS;
    return jsonError(status, ERR.SCHEMA_INVALID, extra, gate.opt);
  }

  // `envelope.day` sudah dibatasi +/-2 hari dari jam server oleh validator.
  // `gate.sub` — bukan apa pun dari amplop — adalah pemilik baris ini.
  let written;
  try {
    written = await writeLearnerEvidence(gate.db, gate.sub, result.envelope.day, result.envelope.events, ctx.now);
  } catch {
    // Kegagalan infrastruktur bukan salah klien: 503 supaya klien RETRY dengan
    // eventId yang sama (idempoten), bukan 500 yang membuatnya menyerah.
    return jsonError(503, ERR.UNAVAILABLE, {}, gate.opt);
  }
  return jsonResponse(
    { ok: true, accepted: written.stored, duplicate: written.duplicate },
    { ...gate.opt, status: written.stored > 0 ? 202 : 200 }
  );
}

/* ========================================================== PERSETUJUAN ==== */

const SCHEMA_CONSENT = { allow: { granted: { type: 'boolean', required: true } } };

export async function routeLearnerConsent(ctx) {
  const gate = await learnerGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_CONSENT);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  try {
    if (body.value.granted === true) {
      await grantConsent(gate.db, gate.sub, ctx.now, LEARNER_EVIDENCE_CONSENT_POLICY);
      return jsonResponse({ ok: true, granted: true, policy: LEARNER_EVIDENCE_CONSENT_POLICY }, gate.opt);
    }
    // Mencabut = menghapus. Lihat revokeConsent: "boleh berhenti dikumpulkan
    // tetapi yang lama tetap disimpan" bukan pencabutan.
    const res = await revokeConsent(gate.db, gate.sub, ctx.now);
    return jsonResponse({ ok: true, granted: false, deleted: res.deleted }, gate.opt);
  } catch {
    return jsonError(503, ERR.UNAVAILABLE, {}, gate.opt);
  }
}

/* ========================================================== NAMA LEARNER ==== */

/**
 * Skema body: HANYA `name`. Tidak ada `sub`, tidak ada `userId` — validator
 * deny-by-default menolak keduanya 400, jadi murid A secara struktur tidak punya
 * field untuk menimpa nama murid B. Pemiliknya adalah `gate.sub` dari cookie.
 */
const SCHEMA_LEARNER_NAME = {
  allow: { name: { type: 'string', max: 200, required: true } }
};

/**
 * POST /api/learner/name — simpan/ganti nama panggilan milik PEMANGGIL.
 *
 * SENGAJA TIDAK MENUNTUT PERSETUJUAN BUKTI. Nama adalah identitas tampilan yang
 * murid isi sendiri di langkah pertama perkenalan (wajib, tidak bisa dilewati),
 * dan naskah di layar itu yang memberitahunya ke mana namanya pergi. Persetujuan
 * di `learner_evidence_consent` mengatur hal yang berbeda: apakah KEADAAN
 * BELAJARNYA boleh disimpan per-orang. Menggabungkan keduanya akan membuat murid
 * yang menolak analitik kehilangan namanya juga — dan owner melihat daftar tanpa
 * nama untuk murid yang sebenarnya sudah memberikannya.
 *
 * `max: 200` di skema, `LEARNER_NAME_MAX` (24) sesudah normalisasi: batas skema
 * ada untuk menolak payload konyol lebih awal; batas nama ada untuk memotong.
 * Nama yang lebih panjang DIPOTONG, bukan ditolak — aturan yang sama dengan
 * klien, karena menolak masukan yang wajar di langkah WAJIB berarti mengurung
 * murid di layar perkenalan.
 */
export async function routeLearnerName(ctx) {
  const gate = await learnerGate(ctx);
  if (gate.deny) return gate.deny;
  if (!checkSubRateLimit(gate.sub, ctx.now)) {
    return jsonError(429, ERR.RATE_LIMITED, {}, gate.opt);
  }
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_LEARNER_NAME);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const name = normalizeLearnerName(body.value.name);
  // Kosong SESUDAH normalisasi (spasi saja, kurung sudut saja) = 400. Nama
  // kosong di server berarti dashboard owner menampilkan baris tanpa nama untuk
  // murid yang mengira sudah memberikannya.
  if (!name) return jsonError(400, ERR.SCHEMA_INVALID, { reason: 'empty_name' }, gate.opt);

  try {
    await writeLearnerName(gate.db, gate.sub, name, gate.day, ctx.now);
  } catch {
    return jsonError(503, ERR.UNAVAILABLE, {}, gate.opt);
  }
  // `name` dipantulkan kembali supaya klien tahu bentuk TERNORMALISASI yang
  // benar-benar tersimpan (mis. "  Andi   " -> "Andi"), bukan menebaknya.
  return jsonResponse({ ok: true, name, maxLength: LEARNER_NAME_MAX }, gate.opt);
}

/**
 * GET /api/learner/name — nama milik PEMANGGIL SENDIRI, bukan milik orang lain.
 * Tidak menerima `?sub=`: satu-satunya nama yang bisa dibaca rute ini adalah
 * nama pemilik cookie yang menyertainya.
 */
export async function routeLearnerNameRead(ctx) {
  const gate = await learnerGate(ctx);
  if (gate.deny) return gate.deny;
  let row = null;
  try { row = await readLearnerName(gate.db, gate.sub); } catch { row = null; }
  return jsonResponse({ ok: true, name: (row && row.name) || null, maxLength: LEARNER_NAME_MAX }, gate.opt);
}

/* ============================================================ BACA OWNER === */

function ownerDeny() {
  // Bentuk penolakan TUNGGAL untuk semua sebab (token salah, secret belum
  // dipasang, header absen) — pola route-evidence.js: tidak ada oracle.
  return jsonResponse({ ok: false, error: 'forbidden_owner' }, { status: 403 });
}

function ownerDays(url) {
  let days = Number(url.searchParams.get('days') || LIMITS.OWNER_DEFAULT_DAYS);
  if (!Number.isFinite(days) || days <= 0) days = LIMITS.OWNER_DEFAULT_DAYS;
  return Math.min(LIMITS.OWNER_MAX_DAYS, Math.trunc(days));
}

/**
 * Nama yang dilihat owner, dan DARI MANA ia datang.
 *
 * Urutan (keputusan OWNER 2 Sep 2026): nama perkenalan lebih dulu, profil sosial
 * hanya cadangan untuk murid lama. `nameSource` ikut dikembalikan supaya owner
 * (dan gerbang) bisa membedakan "murid ini memang belum punya nama di server"
 * dari "namanya kebetulan sama dengan handle-nya" — dua keadaan yang terlihat
 * identik kalau yang dikirim hanya string.
 */
function displayFrom(nameRow, profileRow) {
  const learnerName = (nameRow && nameRow.name) || null;
  const displayName = (profileRow && profileRow.display_name) || null;
  const handle = (profileRow && profileRow.handle) || null;
  const name = learnerName || displayName || handle || null;
  const nameSource = learnerName ? 'onboarding' : displayName ? 'social_display' : handle ? 'social_handle' : 'none';
  return { name, nameSource, displayName, handle };
}

/**
 * GET /api/owner/learners[?days=N&limit=M]
 * Direktori murid yang PUNYA bukti per-murid pada rentang itu. Membaca
 * `learner_evidence_state` + LEFT JOIN `social_profile` — tidak satu pun baris
 * bukti mentah dibaca di sini.
 */
export async function handleOwnerLearners(ctx) {
  const request = ctx && ctx.request;
  const env = (ctx && ctx.env) || {};
  if (!request) return ownerDeny();
  if (!(await ownerAllowed(request, env))) return ownerDeny();

  const url = new URL(request.url);
  const days = ownerDays(url);
  const now = typeof ctx.now === 'number' ? ctx.now : Date.now();
  const to = studyDayWib(now);
  const from = shiftDay(to, -(days - 1));

  const db = learnerDb(env);
  if (!db) {
    // "Belum terpasang" BUKAN "nol murid" — dibedakan supaya owner tidak
    // membaca dashboard kosong sebagai kabar tentang murid.
    return jsonResponse({ ok: true, migrated: false, schema: LEARNER_DIRECTORY_SCHEMA, range: { from, to }, learners: null });
  }
  let rows = [];
  try {
    rows = await readLearnerDirectory(db, from, LIMITS.DIRECTORY_MAX);
  } catch {
    return jsonResponse({ ok: true, migrated: false, schema: LEARNER_DIRECTORY_SCHEMA, range: { from, to }, learners: null });
  }
  return jsonResponse({
    ok: true,
    migrated: true,
    schema: LEARNER_DIRECTORY_SCHEMA,
    range: { from, to },
    learners: rows.map((r) => ({
      sub: r.sub,
      ...displayFrom({ name: r.learner_name }, r),
      firstDay: r.first_day || null,
      lastDay: r.last_day || null,
      evidenceCount: Number(r.evidence_n) || 0,
      decisionCount: Number(r.decision_n) || 0,
      lastLevel: r.last_level || null,
      lastMastery: r.last_mastery || null,
      lastTrend: r.last_trend || null,
      lastOutcome: r.last_outcome || null
    }))
  });
}

/**
 * GET /api/owner/learner-evidence?sub=<uuid>[&days=N]
 *
 * Path LITERAL + `sub` di query, bukan `/api/owner/learners/:sub`: router
 * `index.js` mencocokkan path literal (keputusan yang sama yang membuat papan
 * liga & teman menjadi dua path terpisah). Membuat pengecualian router untuk
 * satu rute owner berarti menambah mesin pencocokan kedua di jalur yang juga
 * melayani murid.
 */
export async function handleOwnerLearnerEvidence(ctx) {
  const request = ctx && ctx.request;
  const env = (ctx && ctx.env) || {};
  if (!request) return ownerDeny();
  if (!(await ownerAllowed(request, env))) return ownerDeny();

  const url = new URL(request.url);
  const sub = String(url.searchParams.get('sub') || '');
  // `sub` cacat dijawab 400, BUKAN 404: 404 di sini akan menjadi oracle
  // "identitas ini ada / tidak ada" untuk siapa pun yang sudah memegang token
  // owner — kecil, tapi gratis untuk ditutup.
  if (!isValidSub(sub)) return jsonError(400, ERR.SCHEMA_INVALID, { reason: 'bad_sub' }, {});

  const days = ownerDays(url);
  const now = typeof ctx.now === 'number' ? ctx.now : Date.now();
  const to = studyDayWib(now);
  const from = shiftDay(to, -(days - 1));

  const db = learnerDb(env);
  if (!db) {
    return jsonResponse({ ok: true, migrated: false, schema: LEARNER_EVIDENCE_SUMMARY_SCHEMA, range: { from, to }, learner: null, summary: null });
  }
  let rows = [];
  let profile = null;
  let state = null;
  let nameRow = null;
  try {
    rows = await readLearnerEvidenceRows(db, sub, from, to, LIMITS.MAX_ROWS_PER_READ);
    nameRow = await readLearnerName(db, sub);
    // Profil sosial hanya CADANGAN nama; kegagalannya (lane sosial belum ada)
    // tidak boleh menjatuhkan halaman murid yang namanya sudah ada di server.
    try { profile = await readLearnerProfile(db, sub); } catch { profile = null; }
    state = await readLearnerState(db, sub);
  } catch {
    return jsonResponse({ ok: true, migrated: false, schema: LEARNER_EVIDENCE_SUMMARY_SCHEMA, range: { from, to }, learner: null, summary: null });
  }
  return jsonResponse({
    ok: true,
    migrated: true,
    schema: LEARNER_EVIDENCE_SUMMARY_SCHEMA,
    eventTypes: LEARNER_EVIDENCE_EVENT_TYPES,
    range: { from, to },
    learner: {
      sub,
      ...displayFrom(nameRow, profile),
      firstDay: (state && state.first_day) || null,
      lastDay: (state && state.last_day) || null,
      evidenceCountAllTime: (state && Number(state.evidence_n)) || 0,
      decisionCountAllTime: (state && Number(state.decision_n)) || 0
    },
    summary: summarizeLearnerRows(rows, { from, to })
  });
}

/* =========================================================== pendaftaran === */

export const ROUTES = Object.freeze([
  ['POST', LEARNER_EVIDENCE_PATH, routeLearnerEvidence],
  ['POST', LEARNER_CONSENT_PATH, routeLearnerConsent],
  ['POST', LEARNER_NAME_PATH, routeLearnerName],
  ['GET', LEARNER_NAME_PATH, routeLearnerNameRead],
  ['GET', OWNER_LEARNERS_PATH, handleOwnerLearners],
  ['GET', OWNER_LEARNER_EVIDENCE_PATH, handleOwnerLearnerEvidence]
]);

export default { ROUTES };
