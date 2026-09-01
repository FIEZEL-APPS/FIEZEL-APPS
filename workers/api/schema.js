/**
 * workers/api/schema.js — konstanta kontrak + validator payload.
 *
 * SUMBER ANGKA (jangan diubah tanpa mengubah frontend serentak):
 *  - `PROTOCOL` = '1.7'. Tiga jalur frontend melempar `*_protocol_mismatch`
 *    (app.js:1589, :2038, :5276), jadi versi protokol adalah bagian kontrak.
 *    Menaikkannya adalah perubahan breaking yang butuh bump FIEZEL_PAGE_BUILD.
 *  - Batas byte diambil PERSIS dari Worker Puter yang sedang jalan:
 *    20000 (`/api/ai/chat`), 12000 (`/api/ai/translate`),
 *    100000 (`/api/coach/context`, `/api/policy/*`, `/api/activity`),
 *    8192 (`/api/push/subscribe`, `/api/feedback`).
 *    Rujukan: cf-a1 §2.d, cf-b1 §1.a (fiezel-core-worker.js:446,462,609,621,626,497).
 *  - Batas byte endpoint BARU (auth/user/config) dibuat jauh lebih kecil:
 *    payload kecil = CPU kecil, dan CPU adalah anggaran paling langka di PLAN
 *    GRATIS (10 ms/request).
 */

export const PROTOCOL = '1.7';

/**
 * Batas byte per path. Ditegakkan oleh mw-guard SEBELUM routing, sehingga
 * endpoint yang belum ada pun sudah dilindungi capnya dan agen lain yang
 * mendaftarkan `/api/ai/*`, `/api/tts/*`, `/api/quota/*` tidak perlu (dan tidak
 * boleh) menulis ulang angka-angka ini.
 */
export const BYTE_LIMITS = Object.freeze({
  '/api/ai/chat': 20000,
  '/api/ai/translate': 12000,
  '/api/coach/context': 100000,
  '/api/policy/next': 100000,
  '/api/policy/outcome': 100000,
  '/api/activity': 100000,
  '/api/push/subscribe': 8192,
  '/api/feedback': 8192,
  // --- endpoint fase ini -----------------------------------------------------
  '/api/auth/anon': 512,
  '/api/auth/claim': 2048,
  '/api/user/me': 512,
  '/api/config': 512,
  // --- slot untuk agen lain (nilai sudah ditetapkan cf-b1 §1.b) --------------
  '/api/tts/resolve': 4096,
  '/api/tts/render': 4096,
  '/api/quota/preflight': 512,
  '/api/usage/event': 16384,
  // --- path NYATA yang didaftarkan paket kerja E3/E4/E5 ----------------------
  // Angka di sini, bukan di handler: cap harus melekat pada kontrak, dan
  // `mw-guard` menegakkannya SEBELUM routing (path tak terdaftar jatuh ke
  // DEFAULT_BYTE_LIMIT 4096 — terlalu kecil untuk /api/ai/task, yang prompt
  // ternormalisasinya saja boleh 4.000 char).
  '/api/ai/task': 20000,        // = cap /api/ai/chat Worker Puter; FREE_MAX_PROMPT_CHARS 4.000 + amplop task
  '/api/tts/manifest': 512,     // GET, tanpa body
  '/api/quota': 512,            // GET, tanpa body
  '/api/usage/events': 16384,   // batch event klien; sama dengan /api/usage/event (tunggal) yang digantikannya
  '/api/usage/retention': 2048, // {cohort_day, day_index} + amplop
  '/api/usage/pepper': 512,     // GET, tanpa body
  // --- SLOT 7: lapisan sosial (route-social.js). Payload kecil = CPU kecil;
  // satu-satunya yang besar adalah evidence batch (maks 20 event, pola LIMITS
  // analytics 8KB — spec sosial §4.4.2).
  '/api/social/profile/create': 1024,
  '/api/social/profile/check': 512,
  '/api/social/profile/me': 512,        // GET, tanpa body
  '/api/social/friends/invite': 512,
  '/api/social/friends/redeem': 512,
  '/api/social/friends': 512,           // GET, tanpa body
  '/api/social/cheer': 512,
  '/api/social/rank/evidence': 8192,
  '/api/social/rank/board/friends': 512, // GET, tanpa body
  '/api/social/rank/board/league': 512,  // GET, tanpa body
  '/api/social/rank/optout': 512,
  // --- SLOT 8: lane bukti belajar Braincore (evidence/route-evidence.js).
  // 8192 = LIMITS.MAX_BODY_BYTES di evidence-core.js, angka yang sama dengan
  // batas batch analytics/learning. Cap di sini, bukan di handler: mw-guard
  // menegakkannya SEBELUM routing, dan DEFAULT_BYTE_LIMIT 4096 akan memotong
  // batch sah 20 event menjadi 413 yang tidak bisa dijelaskan ke klien.
  '/api/braincore/evidence': 8192,
  '/api/owner/braincore-evidence': 512,  // GET, tanpa body
  // --- SLOT 9: lane bukti belajar PER-MURID (evidence/route-learner-evidence.js).
  // 8192 = LEARNER_EVIDENCE_LIMITS.MAX_BODY_BYTES, angka yang SAMA dengan lane
  // agregat: dua lane yang memakai transport klien yang sama tidak boleh punya
  // dua batas batch, karena klien membentuk batch SEBELUM tahu ke mana ia pergi.
  '/api/braincore/learner-evidence': 8192,
  '/api/braincore/learner-evidence/consent': 512,
  '/api/owner/learners': 512,          // GET, tanpa body
  '/api/owner/learner-evidence': 512   // GET, tanpa body
});

/** Cap terakhir untuk path yang tidak terdaftar: kecil, sengaja. */
export const DEFAULT_BYTE_LIMIT = 4096;

export function byteLimitFor(pathname) {
  return Object.prototype.hasOwnProperty.call(BYTE_LIMITS, pathname)
    ? BYTE_LIMITS[pathname]
    : DEFAULT_BYTE_LIMIT;
}

/**
 * Bentuk cookie identitas (cf-b2 §1.2 — final).
 * `Max-Age` 15552000 s = 180 hari. `SameSite=Lax` cukup karena fiezel.my.id dan
 * api.fiezel.my.id satu registrable domain (same-site, lintas-origin).
 * `HttpOnly` adalah SYARAT MANDAT, bukan pengerasan opsional: bab 8 menuntut
 * identitas bertahan terhadap `localStorage.clear()`, dan hanya cookie HttpOnly
 * yang tidak punya API JS untuk dihapus.
 */
export const COOKIE = Object.freeze({
  IDENTITY: 'fz_id',
  SESSION: 'fz_s',
  MAX_AGE: 15552000,
  SESSION_MAX_AGE: 2592000,
  PATH: '/',
  SAME_SITE: 'Lax'
});

/** Kunci yang SAH ada di payload cookie. Apa pun di luar ini = bug. */
export const COOKIE_PAYLOAD_KEYS = Object.freeze(['v', 'kid', 'sub', 'iat']);

/**
 * Nama field yang DILARANG muncul di payload cookie maupun di body respons apa
 * pun. Daftar ini bukan hiasan: gerbang `cf-api-contract-test.js` memakainya
 * untuk memindai setiap respons Worker.
 */
export const PII_FORBIDDEN_KEYS = Object.freeze([
  'name', 'learnerName', 'userName', 'username', 'email', 'ip', 'ipAddress',
  'userAgent', 'ua', 'lat', 'lon', 'location', 'timeZonePrecise',
  'puterUuid', 'uuid', 'password', 'token', 'secret', 'answer', 'answers',
  'transcript', 'prompt', 'ref', 'legacyRef'
]);

/**
 * Kill switch server-side untuk flag klien (`GET /api/config`).
 * SEMUA default `false`/off — main auto-deploy ke fiezel.my.id tiap 5 menit,
 * jadi fitur baru wajib mati sampai owner menyalakannya. Ini juga jawaban untuk
 * masalah `core-config.js` yang ter-precache service worker: nilai di berkas itu
 * hanya default pemasangan, sedangkan KEBENARAN runtime datang dari sini dengan
 * `Cache-Control: no-store`, sehingga owner bisa mematikan fitur tanpa menunggu
 * SW_REV baru menyebar ke perangkat murid.
 */
export const CLIENT_FLAG_DEFAULTS = Object.freeze({
  cfApiEnabled: false,     // pakai gateway CF untuk /api/*
  cfAiEnabled: false,      // AI lewat gateway CF
  cfTtsEnabled: false,     // TTS lewat gateway CF
  cfQuotaEnabled: false,   // tampilkan/patuhi kuota server
  cfAnalyticsEnabled: false,
  cfIdentityEnabled: false, // terbitkan identitas cookie
  cfSocialEnabled: false,   // lapisan sosial (profil/teman/leaderboard) — SLOT 7
  // SLOT 9. Lane bukti belajar PER-MURID (beridentitas, atas persetujuan murid).
  // Default false seperti semua yang lain, dan di sini default itu bukan formalitas:
  // lane ini menyimpan bukti yang terikat `identity.sub`, jadi ia lahir MATI dan
  // hanya menyala kalau owner benar-benar menuliskannya di KV.
  cfLearnerEvidenceEnabled: false
});

/** Kill switch tingkat server (bukan flag klien): mematikan jalur mahal. */
export const KILL_SWITCH_DEFAULTS = Object.freeze({
  ai: false,
  tts: false,
  coach: false,
  analytics: false,
  social: false,
  learnerEvidence: false   // SLOT 9 — kill switch lane bukti per-murid
});

/* --------------------------------------------------------------------------
 * Validator payload — deny-by-default.
 * Field asing DITOLAK, bukan diabaikan: field asing yang diabaikan adalah cara
 * klasik klien "menitipkan" klaim entitlement (`{class:'auth'}`, `{plan:'plus'}`,
 * `{quotaRemaining:999}`) yang suatu hari akan terbaca oleh kode baru.
 * ------------------------------------------------------------------------ */

/**
 * @param {any} value
 * @param {{allow:Record<string,{type:string,max?:number,required?:boolean}>}} spec
 * @returns {{ok:true,value:object}|{ok:false,reason:string}}
 */
export function validateShape(value, spec) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'body_must_be_object' };
  }
  const allow = spec.allow || {};
  for (const key of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(allow, key)) {
      // Nama field yang ditolak TIDAK dipantulkan kembali ke klien di handler;
      // alasan hanya dipakai untuk log/observability.
      return { ok: false, reason: 'unknown_field' };
    }
  }
  for (const [key, rule] of Object.entries(allow)) {
    const present = Object.prototype.hasOwnProperty.call(value, key);
    if (!present) {
      if (rule.required) return { ok: false, reason: 'missing_field' };
      continue;
    }
    const v = value[key];
    if (rule.type === 'string') {
      if (typeof v !== 'string') return { ok: false, reason: 'type_mismatch' };
      if (rule.max && v.length > rule.max) return { ok: false, reason: 'string_too_long' };
      if (rule.pattern && !rule.pattern.test(v)) return { ok: false, reason: 'pattern_mismatch' };
    } else if (rule.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, reason: 'type_mismatch' };
    } else if (rule.type === 'boolean') {
      if (typeof v !== 'boolean') return { ok: false, reason: 'type_mismatch' };
    } else {
      return { ok: false, reason: 'unsupported_rule' };
    }
  }
  return { ok: true, value };
}

/** Skema `POST /api/auth/anon` — sengaja KOSONG: tidak menerima userId apa pun. */
export const SCHEMA_AUTH_ANON = { allow: {} };

/**
 * Skema `POST /api/auth/claim`. Hanya `ticket`; klien TIDAK PERNAH menyebut uuid.
 * Menerima `{uuid}` di sini akan menjadi cara mengambil alih identitas (dan
 * kuota) orang lain — kelas kerentanan yang bab 30 suruh cegah.
 */
export const SCHEMA_AUTH_CLAIM = {
  allow: { ticket: { type: 'string', max: 1024, required: true } }
};

/** Umur maksimum tiket klaim (detik) — cf-b2 §6.2. */
export const CLAIM_TICKET_MAX_AGE_S = 120;
export const CLAIM_AUDIENCE = 'fiezel-api';
export const CLAIM_REPLAY_TTL_S = 300;

/** Kapabilitas yang diumumkan `/health`. Nama-nama ini dibaca frontend lama. */
export const CAPABILITIES = Object.freeze([
  'identity-cookie-v1',
  'server-config-v1',
  'learner-evidence-v1',
  'adaptive-policy-v1',
  'policy-outcome-v1',
  'context-coach-v1',
  'alrs'
]);

/** Hari 'YYYY-MM-DD' dari epoch ms, zona tetap +07:00 (WIB) — cf-c1 K15. */
export function studyDayWib(nowMs) {
  return new Date(Number(nowMs) + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
