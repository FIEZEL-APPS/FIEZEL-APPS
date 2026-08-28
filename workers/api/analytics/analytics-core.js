/**
 * FIEZEL E4 — inti analytics privasi-maksimal (fungsi murni, tanpa I/O).
 *
 * OTORITAS: `EXEC-BRIEF-CF.md` bagian "KONTRAK ANALYTICS PRIVASI-MAKSIMAL".
 * Bila `reports/cf-b5-analytics.md` berbeda, brief eksekusi MENANG. Perbedaan yang
 * disengaja (dan alasannya) dicatat di `reports/exec-e4-analytics.md`:
 *   - cf-b5 memakai tabel per-orang (`identity`, `daily_active(day,user_id)`,
 *     `usage_daily(user_id,day)`). Di sini TIDAK ADA satu pun tabel per-orang.
 *     Yang ada hanya agregat + satu tabel token harian yang dihapus setiap malam.
 *   - cf-b5 memakai `analytics_id` ber-epoch 100 hari. Di sini pepper dirotasi
 *     24 jam dan pepper lama DIHAPUS, sehingga token hari-1 tidak bisa
 *     disambungkan ke token hari-2 oleh siapa pun, termasuk oleh kita sendiri.
 *
 * Prinsip tunggal: HITUNG ORANG TANPA MENGENALI ORANG.
 *
 * Alur identitas (satu-satunya yang diizinkan):
 *   installId (UUID acak, HANYA hidup di perangkat, tidak pernah dikirim)
 *     -> visitor_token = HMAC-SHA256(pepper_hari_ini, installId) dipotong 128 bit
 *     -> server dedup token per hari => DAU
 *   pepper dirotasi tiap 24 jam; pepper N-2 dihapus permanen saat rotasi.
 *
 * Konsekuensi jujur yang WAJIB ikut ke dokumentasi (lihat PRIVACY.md):
 * DAU/retention adalah estimasi PERANGKAT, bukan orang.
 *
 * Berkas ini murni: tidak menyentuh D1, KV, jaringan, atau `env`. Bisa diuji
 * dengan Node polos (WebCrypto tersedia di Node 18+ dan di Workers).
 */

/* ==========================================================================
 * 1. TOKEN PENGUNJUNG
 * ========================================================================== */

const TOKEN_BITS = 128;
const TOKEN_HEX_LEN = TOKEN_BITS / 4; // 32 karakter hex
export const VISITOR_TOKEN_PATTERN = /^[0-9a-f]{32}$/;

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

function hex(bytes) {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function webcrypto() {
  const c = globalThis.crypto;
  if (!c || !c.subtle) throw new Error('WebCrypto tidak tersedia');
  return c;
}

/**
 * visitorToken(pepper, installId) -> Promise<string> (32 hex = 128 bit).
 *
 * Dipotong 128 bit dengan sengaja: cukup untuk dedup harian (ruang 2^128 jauh
 * melebihi jumlah perangkat), dan pemotongan membuang separuh keluaran HMAC
 * sehingga tidak ada sisa struktur yang bisa dipakai untuk serangan panjang.
 *
 * SATU-SATUNYA tempat `installId` boleh muncul di seluruh kode analytics adalah
 * argumen fungsi ini, dan nilainya tidak pernah dikembalikan, dicatat, atau
 * disimpan. Fungsi ini dijalankan DI KLIEN; server hanya menerima hasilnya.
 * Server tidak pernah memegang `installId`, jadi server tidak bisa membalik
 * token walaupun mau (lihat PRIVACY.md §"Kenapa token tidak bisa dibalik").
 */
export async function visitorToken(pepper, installId) {
  if (typeof pepper !== 'string' || pepper.length < 32) {
    throw new Error('pepper tidak sah: minimal 32 karakter');
  }
  if (typeof installId !== 'string' || installId.length < 8) {
    throw new Error('argumen kedua tidak sah');
  }
  const c = webcrypto();
  const key = await c.subtle.importKey('raw', utf8(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await c.subtle.sign('HMAC', key, utf8(installId)));
  return hex(mac.subarray(0, TOKEN_BITS / 8)).slice(0, TOKEN_HEX_LEN);
}

/** Pepper baru: 32 byte acak, dikodekan hex (64 karakter). */
export function newPepper() {
  const bytes = new Uint8Array(32);
  webcrypto().getRandomValues(bytes);
  return hex(bytes);
}

export const PEPPER_ROTATION_MS = 24 * 60 * 60 * 1000;

/**
 * rotatePepperDue(now, lastRotatedAt) -> boolean.
 * Rotasi jatuh tempo bila belum pernah dirotasi atau sudah >= 24 jam.
 * Jam yang belum sampai TIDAK boleh memaksa rotasi: rotasi terlalu sering
 * membunuh dedup DAU di tengah hari (satu perangkat terhitung dua kali).
 */
export function rotatePepperDue(now, lastRotatedAt) {
  const t = Number(now);
  if (!Number.isFinite(t)) return false;
  const last = Number(lastRotatedAt);
  if (!Number.isFinite(last) || last <= 0) return true;
  if (last > t) return true; // jam mundur / state rusak => amankan dengan rotasi
  return t - last >= PEPPER_ROTATION_MS;
}

/**
 * rotatePepper(state, now, pepper?) -> state baru.
 *
 * `previous` hanya jendela toleransi satu putaran, untuk event yang tertahan
 * offline melewati tengah malam. Pepper dua putaran lalu HILANG PERMANEN di
 * sini — inilah yang membuat "hari-1 tidak bisa disambung ke hari-2" jadi sifat
 * sistem, bukan janji. Gerbang `analytics-privacy-test.js` menguji tepat ini.
 */
export function rotatePepper(state, now, pepper) {
  const current = typeof pepper === 'string' && pepper.length >= 32 ? pepper : newPepper();
  const prior = state && typeof state.current === 'string' ? state.current : null;
  return { rotated_at: Number(now) || 0, current, previous: prior };
}

/* --------------------------------------------------------------------------
 * INISIALISASI MALAS (COLD START) — pepper putaran PERTAMA
 * --------------------------------------------------------------------------
 * Cacat yang ditutup di sini: pepper HANYA pernah dibuat oleh rollup harian
 * (cron `5 17 * * *`). Basis data analytics yang baru karena itu selalu buta di
 * hari pertama: `pepper_state` nol baris -> `GET /api/usage/pepper` 503 ->
 * klien tidak bisa menurunkan `visitor_token` -> `dau_dedup` kosong -> DAU 0.
 * Bukan "belum ada data"; benar-benar tidak ada jalan mengumpulkan data sampai
 * cron pertama lewat.
 *
 * Tiga bahaya yang HARUS tidak terjadi saat inisialisasi, dan bagaimana bentuk
 * fungsi ini menutupnya:
 *
 * (a) DUA pepper berbeda dari dua permintaan bersamaan. Fungsi ini murni: ia
 *     hanya MENYUSUN calon. Yang menjamin ketunggalan adalah penulisan
 *     idempoten di lapisan D1 (`SQL.initPepper` = `INSERT ... ON CONFLICT(id)
 *     DO NOTHING`) plus baca-ulang setelah tulis, sehingga pemanggil yang kalah
 *     balapan memakai pepper pemenang, bukan calonnya sendiri. Lihat
 *     `ensurePepperState()` di analytics-store-d1.js.
 *
 * (b) Inisialisasi TIDAK boleh berubah menjadi rotasi tengah hari. Rotasi
 *     tengah hari membuat satu perangkat menghitung dua token pada `day` yang
 *     sama -> DAU menggelembung. Karena itu `rotated_at` TIDAK diisi `now`,
 *     melainkan AWAL JENDELA rotasi yang sedang berjalan
 *     (`pepperWindowStart(now)`, yaitu batas cron terakhir yang sudah lewat).
 *     Dua akibatnya keduanya benar:
 *       - jam berikutnya (rollup manual, retry cron di jendela yang sama)
 *         melihat umur < 24 jam -> TIDAK merotasi;
 *       - cron BERIKUTNYA melihat umur tepat 24 jam -> merotasi tepat waktu.
 *     Kalau `rotated_at` diisi `now`, pepper yang dibuat pukul 08:00 baru boleh
 *     dirotasi 08:00 esok — cron 17:05 melewatkannya, dan pepper itu hidup
 *     sampai ~48 jam. Token hari-1 lalu bisa disambungkan ke hari-2, yaitu
 *     tepat janji privasi yang ditulis dashboard ke owner.
 *
 * (c) `previous` = null. Belum ada pepper sebelumnya; mengisinya dengan
 *     `current` (atau nilai karangan) akan membuat jendela toleransi berbohong
 *     dan membuat gerbang "rotasi pertama tidak menyimpan previous palsu"
 *     kehilangan artinya.
 */

/**
 * Menit UTC tempat cron rollup berjalan: `5 17 * * *` = 17:05 UTC = 00:05 WIB.
 * Angka ini WAJIB sama dengan cron di `wrangler.toml`; kalau cron digeser,
 * geser juga di sini, karena inilah batas jendela pepper.
 */
export const PEPPER_WINDOW_ANCHOR_UTC_MINUTES = 17 * 60 + 5;

/**
 * pepperWindowStart(now) -> epoch ms batas cron TERAKHIR yang sudah lewat.
 * Fungsi murni, tanpa zona waktu lokal: dihitung dari epoch UTC saja.
 */
export function pepperWindowStart(now, anchorMinutes = PEPPER_WINDOW_ANCHOR_UTC_MINUTES) {
  const t = Number(now);
  if (!Number.isFinite(t)) return 0;
  const dayStart = Math.floor(t / PEPPER_ROTATION_MS) * PEPPER_ROTATION_MS; // tengah malam UTC
  const candidate = dayStart + Math.trunc(anchorMinutes) * 60000;
  return candidate <= t ? candidate : candidate - PEPPER_ROTATION_MS;
}

/**
 * initialPepperState(now, pepper?) -> state putaran pertama.
 * Bentuk kembaliannya SAMA dengan `rotatePepper()` (tiga kolom, tidak lebih),
 * supaya `writePepperState()` tidak perlu tahu bedanya. Yang membedakan
 * "inisialisasi" dari "rotasi" bukan bentuk state, melainkan: `previous` null,
 * `rotated_at` di awal jendela (bukan `now`), dan tidak ada satu pun pemanggil
 * yang melaporkannya sebagai `pepperRotated`.
 */
export function initialPepperState(now, pepper) {
  const current = typeof pepper === 'string' && pepper.length >= 32 ? pepper : newPepper();
  return { rotated_at: pepperWindowStart(now), current, previous: null };
}

/* ==========================================================================
 * 2. DAFTAR EVENT + ALLOWLIST FIELD (KETAT)
 * ========================================================================== */

/**
 * `server` = event yang HANYA boleh diterbitkan Worker. Kalau klien yang jadi
 * sumbernya, angkanya tidak bernilai apa pun: satu skrip bisa mengarang ribuan
 * pengguna baru, menyembunyikan kegagalan AI, atau memalsukan biaya TTS.
 * Sesuai brief: semua jalur AI/TTS/kuota/breaker + `user_created`.
 *
 * `client` = event yang secara fisik tidak terlihat Worker (sesi, pelajaran,
 * jawaban, kehadiran harian). Dilabeli SELF-REPORTED di dashboard, dan
 * kejujuran itu ikut ditulis di PRIVACY.md.
 */
export const SERVER_ONLY_EVENTS = Object.freeze([
  'user_created',
  'ai_request', 'ai_success', 'ai_failure',
  'tts_request', 'tts_success', 'tts_failure',
  'quota_exhausted',
  'circuit_opened', 'circuit_recovered'
]);

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DOMAINS = ['vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing'];
const MODES = ['adaptive', 'lesson', 'exam', 'practice', 'listening', 'library'];
const PLATFORMS = ['android', 'ios', 'desktop']; // kasar, sengaja. Bukan User-Agent.
const LATENCY = ['<1s', '1-3s', '3-10s', '10s+'];
const AI_TASKS = ['explain', 'feedback', 'reteach', 'translate', 'hint', 'other'];
const AI_MODELS = ['granite-micro', 'llama-3b', 'fallback', 'other'];
const ERR_CODES = ['429', 'timeout', '4xx', '5xx', 'other'];
const ENGINES = ['workers-ai', 'r2-cache', 'melotts', 'aura-2-en', 'neural-local', 'speech-synthesis'];
const QUOTA_KINDS = ['ai', 'tts', 'translate', 'gem'];
const MODULES = ['ai', 'tts', 'worker', 'neural-voice'];
const BREAKER_REASONS = ['timeout', 'rate-limit', 'upstream-5xx', 'quota', 'unknown'];
const ACCOUNT_KINDS = ['anon_learner', 'authenticated'];
const ATTEMPT_BUCKETS = ['5-9', '10-29', '30+'];
const DURATION_BUCKETS = ['<2m', '2-10m', '10-30m', '30m+'];
const CHAR_BUCKETS = ['<200', '200-1k', '1k-5k', '5k+'];

const T = {
  bool: () => ({ kind: 'bool' }),
  int: (min, max) => ({ kind: 'int', min, max }),
  enum: values => ({ kind: 'enum', values }),
  day: () => ({ kind: 'day' }),
  token: () => ({ kind: 'token' }),
  version: () => ({ kind: 'version' })
};

/**
 * TIDAK ADA satu pun field bertipe teks bebas di seluruh tabel ini, dan itu
 * disengaja: teks bebas adalah pintu masuk nama, email, isi soal, dan
 * transkrip. Semua string berenum tertutup. Nilai di luar enum dibuang.
 */
export const EVENT_SPEC = Object.freeze({
  app_open: { origin: 'client', fields: { visitor_token: T.token(), has_identity: T.bool(), platform: T.enum(PLATFORMS), app_version: T.version() } },
  day_active: { origin: 'client', fields: { visitor_token: T.token(), attempts_bucket: T.enum(ATTEMPT_BUCKETS), platform: T.enum(PLATFORMS) } },
  session_started: { origin: 'client', fields: { mode: T.enum(MODES), level: T.enum(LEVELS) } },
  session_ended: { origin: 'client', fields: { mode: T.enum(MODES), level: T.enum(LEVELS), completed: T.bool(), answered: T.int(0, 200), duration_bucket: T.enum(DURATION_BUCKETS) } },
  lesson_started: { origin: 'client', fields: { domain: T.enum(DOMAINS), level: T.enum(LEVELS) } },
  lesson_completed: { origin: 'client', fields: { domain: T.enum(DOMAINS), level: T.enum(LEVELS) } },
  question_answered: { origin: 'client', fields: { domain: T.enum(DOMAINS), level: T.enum(LEVELS), ok: T.bool() } },
  retention_ping: { origin: 'client', fields: { cohort_day: T.day(), day_index: T.int(0, 400) } },

  // --- MULAI BLOK SERVER-ONLY (klien ditolak 400) ---------------------------
  user_created: { origin: 'server', fields: { kind: T.enum(ACCOUNT_KINDS), platform: T.enum(PLATFORMS) } },
  ai_request: { origin: 'server', fields: { task: T.enum(AI_TASKS), model: T.enum(AI_MODELS), prompt_tokens_est: T.int(0, 100000) } },
  ai_success: { origin: 'server', fields: { task: T.enum(AI_TASKS), model: T.enum(AI_MODELS), out_tokens: T.int(0, 100000), latency_bucket: T.enum(LATENCY) } },
  ai_failure: { origin: 'server', fields: { task: T.enum(AI_TASKS), code: T.enum(ERR_CODES), latency_bucket: T.enum(LATENCY) } },
  tts_request: { origin: 'server', fields: { engine: T.enum(ENGINES), chars_bucket: T.enum(CHAR_BUCKETS) } },
  tts_success: { origin: 'server', fields: { engine: T.enum(ENGINES), cache: T.enum(['hit', 'miss']), chars_rendered: T.int(0, 200000), latency_bucket: T.enum(LATENCY) } },
  tts_failure: { origin: 'server', fields: { engine: T.enum(ENGINES), code: T.enum(ERR_CODES) } },
  quota_exhausted: { origin: 'server', fields: { kind: T.enum(QUOTA_KINDS) } },
  circuit_opened: { origin: 'server', fields: { module: T.enum(MODULES), reason: T.enum(BREAKER_REASONS), failures: T.int(0, 10000) } },
  circuit_recovered: { origin: 'server', fields: { module: T.enum(MODULES), open_duration_bucket: T.enum(DURATION_BUCKETS) } }
  // --- SELESAI BLOK SERVER-ONLY --------------------------------------------
});

export const KNOWN_EVENTS = Object.freeze(Object.keys(EVENT_SPEC));
export const CLIENT_EVENTS = Object.freeze(KNOWN_EVENTS.filter(n => EVENT_SPEC[n].origin === 'client'));

/** Kunci selubung yang dikenal. `at` diterima tapi TIDAK PERNAH disimpan. */
const ENVELOPE_KEYS = Object.freeze(['name', 'day', 'at']);

export function isServerOnly(name) {
  return SERVER_ONLY_EVENTS.includes(name);
}

/* ==========================================================================
 * 3. NORMALISASI (allowlist ketat)
 * ========================================================================== */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_PATTERN = /^[0-9]{1,3}(\.[0-9]{1,4}){0,3}$/;

export function dayKeyFromMs(ms) {
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function coerce(spec, value) {
  switch (spec.kind) {
    case 'bool':
      return typeof value === 'boolean' ? value : null;
    case 'int': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const n = Math.trunc(value);
      if (n < spec.min || n > spec.max) return null;
      return n;
    }
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value) ? value : null;
    case 'day':
      return typeof value === 'string' && DAY_PATTERN.test(value) ? value : null;
    case 'token':
      return typeof value === 'string' && VISITOR_TOKEN_PATTERN.test(value) ? value : null;
    case 'version':
      return typeof value === 'string' && VERSION_PATTERN.test(value) ? value : null;
    default:
      return null;
  }
}

/**
 * normalizeEvent(raw, opts) -> hasil normalisasi.
 *
 * Kontrak yang tidak boleh dilemahkan:
 *  1. Nama event tidak dikenal  -> ditolak (`unknown_event`).
 *  2. Field asing               -> DIBUANG, dan namanya dilaporkan di `dropped`.
 *     Tidak ada satu pun field di luar allowlist yang bisa lolos ke `event`.
 *  3. Field dikenal tapi nilainya di luar tipe/enum -> DIBUANG (`invalid`).
 *  4. `at` dipakai hanya untuk menurunkan `day` bila `day` tidak ada, lalu
 *     dibuang. Timestamp presisi ms adalah pola kehadiran; ia tidak disimpan.
 *  5. Event bertanda server-only ditolak bila `opts.origin !== 'server'`.
 *
 * @returns {{ok:boolean, reason?:string, event?:object, dropped:string[], invalid:string[]}}
 */
export function normalizeEvent(raw, opts = {}) {
  const origin = opts.origin === 'server' ? 'server' : 'client';
  const dropped = [];
  const invalid = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'not_an_object', dropped, invalid };
  }

  const name = typeof raw.name === 'string' ? raw.name : '';
  const spec = Object.prototype.hasOwnProperty.call(EVENT_SPEC, name) ? EVENT_SPEC[name] : null;
  if (!spec) return { ok: false, reason: 'unknown_event', dropped, invalid };

  if (spec.origin === 'server' && origin !== 'server') {
    return { ok: false, reason: 'server_only', dropped, invalid };
  }

  // Selubung: `day` wajib ada, atau diturunkan dari `at`.
  let day = coerce(T.day(), raw.day);
  if (!day && raw.at !== undefined) day = dayKeyFromMs(raw.at);
  if (!day) return { ok: false, reason: 'bad_day', dropped, invalid };

  const event = { name, day };
  for (const [key, value] of Object.entries(raw)) {
    if (ENVELOPE_KEYS.includes(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(spec.fields, key)) {
      dropped.push(key); // field asing: dibuang, TIDAK diteruskan
      continue;
    }
    const clean = coerce(spec.fields[key], value);
    if (clean === null) { invalid.push(key); continue; }
    event[key] = clean;
  }

  // Field wajib per event: token untuk event yang menyumbang DAU, cohort untuk retensi.
  if ((name === 'app_open' || name === 'day_active') && !event.visitor_token) {
    return { ok: false, reason: 'missing_visitor_token', dropped, invalid };
  }
  if (name === 'retention_ping' && (!event.cohort_day || typeof event.day_index !== 'number')) {
    return { ok: false, reason: 'missing_retention_fields', dropped, invalid };
  }

  return { ok: true, event, dropped, invalid };
}

/* ==========================================================================
 * 4. AGREGASI
 * ========================================================================== */

function bump(map, key, by = 1) {
  map[key] = (map[key] || 0) + by;
}

/**
 * aggregate(events) -> increment agregat siap tulis.
 *
 * Keluarannya HANYA penghitung. Tidak ada satu baris per-orang di mana pun.
 * `dau` berisi pasangan (day, token) untuk `dau_dedup` — satu-satunya tempat
 * token pernah menyentuh penyimpanan, dan tabel itu dihapus setiap malam
 * setelah rollup (lihat rollup.js `purgeDauDedup`).
 *
 * @param {object[]} events event yang SUDAH lewat normalizeEvent
 * @returns {{metrics:Object, usage:Object, retention:Object, dau:Array}}
 */
export function aggregate(events) {
  const metrics = {};   // { day: { metric: value } }
  const usage = {};     // { day: { bucket: count } }
  const retention = {}; // { cohort_day: { day_index: count } }
  const dauSeen = new Set();
  const dau = [];       // [{ day, token }]

  const M = day => (metrics[day] || (metrics[day] = {}));
  const U = day => (usage[day] || (usage[day] = {}));

  /** Catat satu token DAU, tepat sekali per (hari, token). */
  const noteDau = (day, token) => {
    if (!token) return;
    const key = `${day}|${token}`;
    if (dauSeen.has(key)) return;
    dauSeen.add(key);
    dau.push({ day, token });
  };

  for (const e of Array.isArray(events) ? events : []) {
    if (!e || typeof e !== 'object' || !e.name || !e.day) continue;
    const day = e.day;
    const m = M(day);
    const u = U(day);
    bump(m, 'events_total');

    switch (e.name) {
      // `app_open` DAN `day_active` sama-sama menyumbang DAU.
      //
      // Sebelumnya hanya `day_active` yang dicatat, padahal `app_open` tetap
      // MEWAJIBKAN dan MENGIRIM `visitor_token` (lihat normalizeEvent:
      // `missing_visitor_token`). Token yang dikumpulkan tapi tidak pernah
      // dipakai adalah biaya privasi tanpa manfaat — dan lebih buruk: angkanya
      // salah nama. `day_active` hanya dikirim klien setelah jawaban ke-5 hari
      // itu, jadi "DAU" lama sebenarnya berarti "perangkat yang menjawab >= 5
      // soal" — sebuah angka KETERLIBATAN, bukan kehadiran. Dashboard dan
      // PRIVACY.md menyebutnya "perangkat aktif harian". Yang diperbaiki di
      // sini adalah maknanya: DAU = perangkat yang MEMBUKA aplikasi hari itu
      // (app_open ∪ day_active), sementara angka keterlibatan tetap utuh dan
      // terpisah sebagai `day_active_reports`. Tidak ada angka yang hilang;
      // satu angka berhenti salah nama.
      //
      // Menggabung dua sumber TIDAK menggandakan siapa pun: dedup terjadi di
      // sini per (day, token) dan sekali lagi di basis data (`dau_dedup`
      // PRIMARY KEY (day, token) + `INSERT OR IGNORE`).
      case 'app_open':
        bump(m, 'app_open');
        if (e.platform) bump(u, `platform:${e.platform}`);
        if (e.has_identity === true) bump(m, 'app_open_with_identity');
        noteDau(day, e.visitor_token);
        break;

      case 'day_active': {
        bump(m, 'day_active_reports');
        if (e.attempts_bucket) bump(u, `attempts:${e.attempts_bucket}`);
        if (e.platform) bump(u, `platform:${e.platform}`);
        noteDau(day, e.visitor_token);
        break;
      }

      case 'session_started':
        bump(m, 'sessions');
        if (e.mode) bump(u, `session_mode:${e.mode}`);
        if (e.level) bump(u, `session_level:${e.level}`);
        break;

      case 'session_ended':
        bump(m, 'sessions_ended');
        if (e.completed === true) bump(m, 'sessions_completed');
        if (typeof e.answered === 'number') bump(m, 'session_answers', e.answered);
        if (e.duration_bucket) bump(u, `duration:${e.duration_bucket}`);
        break;

      case 'lesson_started':
        bump(m, 'lessons_started');
        if (e.domain) bump(u, `lesson_domain:${e.domain}`);
        break;

      case 'lesson_completed':
        bump(m, 'lessons_completed');
        if (e.domain) bump(u, `lesson_done_domain:${e.domain}`);
        break;

      case 'question_answered':
        bump(m, 'answers');
        if (e.ok === true) bump(m, 'answers_ok');
        if (e.domain) bump(u, `answer_domain:${e.domain}`);
        if (e.level) bump(u, `answer_level:${e.level}`);
        break;

      case 'retention_ping': {
        const cohort = retention[e.cohort_day] || (retention[e.cohort_day] = {});
        bump(cohort, String(e.day_index));
        break;
      }

      case 'user_created':
        bump(m, 'new_users');
        if (e.kind) bump(u, `new_user_kind:${e.kind}`);
        break;

      case 'ai_request':
        bump(m, 'ai_calls');
        if (e.task) bump(u, `ai_task:${e.task}`);
        if (e.model) bump(u, `ai_model:${e.model}`);
        if (typeof e.prompt_tokens_est === 'number') bump(m, 'ai_tokens_in', e.prompt_tokens_est);
        break;

      case 'ai_success':
        bump(m, 'ai_success');
        if (typeof e.out_tokens === 'number') bump(m, 'ai_tokens_out', e.out_tokens);
        if (e.latency_bucket) bump(u, `ai_latency:${e.latency_bucket}`);
        break;

      case 'ai_failure':
        bump(m, 'ai_failure');
        if (e.code) bump(u, `ai_err:${e.code}`);
        break;

      case 'tts_request':
        bump(m, 'tts_calls');
        if (e.engine) bump(u, `tts_engine:${e.engine}`);
        break;

      case 'tts_success':
        bump(m, 'tts_success');
        if (e.cache === 'hit') bump(m, 'tts_cache_hits');
        if (e.cache === 'miss') bump(m, 'tts_cache_misses');
        // chars_rendered = SATU-SATUNYA angka yang boleh masuk rumus biaya TTS.
        if (typeof e.chars_rendered === 'number') bump(m, 'tts_chars_rendered', e.chars_rendered);
        break;

      case 'tts_failure':
        bump(m, 'tts_failure');
        if (e.code) bump(u, `tts_err:${e.code}`);
        break;

      case 'quota_exhausted':
        bump(m, 'quota_exhausted');
        if (e.kind) bump(u, `quota:${e.kind}`);
        break;

      case 'circuit_opened':
        bump(m, 'breaker_trips');
        if (e.module) bump(u, `breaker_open:${e.module}`);
        break;

      case 'circuit_recovered':
        bump(m, 'breaker_recoveries');
        if (e.module) bump(u, `breaker_recover:${e.module}`);
        break;

      default:
        break;
    }
  }

  return { metrics, usage, retention, dau };
}

/** Gabungkan dua hasil aggregate() — dipakai rollup dan batch besar. */
export function mergeAggregate(a, b) {
  const out = { metrics: {}, usage: {}, retention: {}, dau: [] };
  for (const src of [a, b]) {
    if (!src) continue;
    for (const [day, m] of Object.entries(src.metrics || {})) {
      const t = out.metrics[day] || (out.metrics[day] = {});
      for (const [k, v] of Object.entries(m)) bump(t, k, v);
    }
    for (const [day, u] of Object.entries(src.usage || {})) {
      const t = out.usage[day] || (out.usage[day] = {});
      for (const [k, v] of Object.entries(u)) bump(t, k, v);
    }
    for (const [cohort, r] of Object.entries(src.retention || {})) {
      const t = out.retention[cohort] || (out.retention[cohort] = {});
      for (const [k, v] of Object.entries(r)) bump(t, k, v);
    }
    for (const d of src.dau || []) out.dau.push(d);
  }
  const seen = new Set();
  out.dau = out.dau.filter(d => {
    const k = `${d.day}|${d.token}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return out;
}

export default {
  visitorToken, newPepper, rotatePepperDue, rotatePepper, PEPPER_ROTATION_MS,
  pepperWindowStart, initialPepperState, PEPPER_WINDOW_ANCHOR_UTC_MINUTES,
  normalizeEvent, aggregate, mergeAggregate, dayKeyFromMs,
  EVENT_SPEC, KNOWN_EVENTS, CLIENT_EVENTS, SERVER_ONLY_EVENTS, isServerOnly,
  VISITOR_TOKEN_PATTERN
};
