/**
 * workers/api/route-social.js — SLOT 7: lapisan SOSIAL fiezel-api.
 * Desain: FIEZEL-ONLINE-SOCIAL-SFX-SPEC.md §2 (profil), §3 (teman/sorakan),
 * §4 (leaderboard Poin Bukti), §5.1-5.2 (penempatan SLOT + bentuk endpoint).
 *
 * ==========================================================================
 * KONTRAK YANG DIWARISI, BUKAN DITULIS ULANG
 * ==========================================================================
 *  - Identitas SELALU `ctx.identity.sub` dari cookie fz_id ber-HMAC
 *    (mw-identity). TIDAK PERNAH dari body/query/header — body yang mencoba
 *    menitipkan `sub`/`userId` ditolak 400 oleh validator deny-by-default.
 *  - Semua rute lewat [M-1] mw-edge + [M0] mw-guard (CORS allowlist + cap byte
 *    di `schema.js` BYTE_LIMITS) karena terdaftar lewat route-slots — tidak ada
 *    jalur samping.
 *  - Router literal-path: SEMUA endpoint POST body / GET tanpa parameter path
 *    (keputusan `index.js`; papan liga & teman = dua path literal).
 *  - Angka & enum beku di `social-config.js` (pola quota-config). Handler ini
 *    tidak memuat satu pun angka kebijakan.
 *  - Gerbang flag: tiga sakelar AND (FEATURE_SOCIAL + KV enabled.social +
 *    KV flags.cfSocialEnabled) lewat mesin `featureAllowedFrom` yang SAMA
 *    dengan AI/TTS. FAIL-CLOSED: flag tak terbaca = 403. Fitur lahir MATI.
 *  - Penyimpanan: CORE_DB (fiezel-core) SAJA. STATS_DB/analytics TIDAK PERNAH
 *    disentuh berkas ini — dinding privasi analytics<->sosial dipertahankan.
 *  - Skema dijamin `ensureSocialSchema()` (lihat social-schema.js: token CI
 *    tidak bisa menjalankan migrasi remote; berkas 0006_social.sql tetap
 *    sumber resmi).
 *
 * ==========================================================================
 * URUTAN PENOLAKAN (selaras wrapMetered: 401 sebelum 403)
 * ==========================================================================
 *   identitas (401) -> flag sosial (403, fail-closed) -> DB (503) ->
 *   skema dipastikan -> profil bila rute menuntutnya (404 profile_required) ->
 *   validasi body (400) -> logika.
 *
 * ==========================================================================
 * ANTI-CHEAT PB (spec §4.4) — semua ditegakkan DI SINI, di sisi server
 * ==========================================================================
 *   1. Tidak ada angka skor dari klien: klien mengirim event bukti enum+count;
 *      PB dihitung dari tabel beku PB_RULES.
 *   2. Cap harian/mingguan atomik: `UPDATE social_counter SET cnt = cnt + ?x
 *      WHERE ... AND cnt + ?x <= cap` (pola gerbang kuota `used + held < limit`).
 *      Pembacaan cnt sebelum UPDATE hanya menghitung sisa; balapan apa pun
 *      GAGAL KE ARAH LEBIH SEDIKIT PB, tidak pernah melampaui cap.
 *   3. Anti-replay: `jti` klien sekali pakai di tabel `rank_jti` PK(sub,jti) —
 *      pola jti tiket klaim, dipindah ke D1 karena jalur panas dilarang tulis KV.
 *   4. Jam & hari = SERVER WIB (studyDayWib); `day` klien hanya diterima dalam
 *      toleransi DAY_SKEW_DAYS dan hanya di pekan berjalan; selain itu batch
 *      DIBUANG DIAM-DIAM (200 accepted:0 — tanpa oracle).
 *   5. Plausibility: batch maks 20 event / 8KB (cap byte mw-guard), count
 *      di-clamp 20, maksimum 40 batch/hari (counter '_batches').
 *   6. Fail-closed: tanpa identitas/DB/flag = tolak, bukan izin-lolos.
 */

import { jsonResponse, jsonError, unauthenticated, notFound, ERR } from './errors.js';
import { readJsonFromCtx } from './mw-guard.js';
import { validateShape, studyDayWib } from './schema.js';
import { readServerFlags, featureAllowedFrom } from './feature-gate.js';
import { ensureSocialSchema } from './social-schema.js';
import {
  HANDLE_RULES, DISPLAY_RULES, AVATAR_MAX_ID, PROFILE_FLAGS, INVITE_RULES,
  FRIENDS_MAX, CHEER_STICKERS, CHEER_PER_FRIEND_PER_DAY, LEVEL_BANDS,
  PB_RULES, MILESTONE_KINDS, EVIDENCE_RULES, COHORT_RULES, SOCIAL_FEATURE_SPEC
} from './social-config.js';

/* ========================================================== waktu (hari/pekan WIB) == */

const DAY_MS = 86400000;

/** 'YYYY-MM-DD' + n hari (aritmetika UTC atas tanggal polos — bebas DST by design). */
export function addDays(day, n) {
  return new Date(Date.parse(day + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10);
}

/** Selisih hari a-b (positif bila a sesudah b). */
export function diffDays(a, b) {
  return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / DAY_MS);
}

/** Senin pekan WIB dari 'YYYY-MM-DD' — kunci pekan liga (spec §4.2: Senin 00:00 WIB). */
export function weekMondayOf(day) {
  const t = Date.parse(day + 'T00:00:00Z');
  const idx = (new Date(t).getUTCDay() + 6) % 7; // Senin=0
  return new Date(t - idx * DAY_MS).toISOString().slice(0, 10);
}

/* ========================================================== validasi input ========= */

function digitRunTooLong(text, max) {
  let run = 0;
  for (const ch of String(text)) {
    run = ch >= '0' && ch <= '9' ? run + 1 : 0;
    if (run > max) return true;
  }
  return false;
}

/** Handle sah? Input di-lowercase oleh PEMANGGIL sebelum ke sini. */
export function handleProblem(handle) {
  if (typeof handle !== 'string') return 'type';
  if (!HANDLE_RULES.PATTERN.test(handle)) return 'pattern';
  if (handle.includes('__')) return 'double_underscore';
  if (handle.endsWith('_')) return 'trailing_underscore';
  if (digitRunTooLong(handle, HANDLE_RULES.MAX_DIGIT_RUN)) return 'digit_run';
  for (const bad of HANDLE_RULES.BLOCKLIST) if (handle.includes(bad)) return 'blocklist';
  return null;
}

/** Display name sah setelah dirapikan? Mengembalikan string bersih atau null. */
export function cleanDisplayName(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text || text.length > DISPLAY_RULES.MAX) return null;
  if (!DISPLAY_RULES.PATTERN.test(text)) return null;
  if (digitRunTooLong(text, DISPLAY_RULES.MAX_DIGIT_RUN)) return null;
  const lower = text.toLowerCase();
  if (lower.includes('http') || lower.includes('www.') || lower.includes('@')) return null;
  for (const bad of HANDLE_RULES.BLOCKLIST) if (lower.includes(bad)) return null;
  return text;
}

/* ========================================================== prelude bersama ======== */

function corsOpt(ctx) {
  return { headers: ctx.corsHeaders };
}

function socialDb(env) {
  return (env && (env.CORE_DB || env.DB)) || null;
}

/**
 * Gerbang berlapis untuk SEMUA rute sosial. Mengembalikan `{deny:Response}`
 * ATAU konteks siap pakai. Urutan 401 -> 403 -> 503 dijelaskan di kepala berkas.
 */
async function socialGate(ctx) {
  const opt = corsOpt(ctx);
  if (!ctx.identity || !ctx.identity.verified || !ctx.identity.sub) {
    return { deny: unauthenticated(opt) };
  }
  const snapshot = await readServerFlags(ctx.env);
  const verdict = featureAllowedFrom(ctx.env, snapshot, SOCIAL_FEATURE_SPEC);
  if (!verdict.allowed) {
    // Satu bentuk 403 untuk semua sebab flag; sebab spesifik hanya untuk log.
    return { deny: jsonError(403, ERR.SOCIAL_DISABLED, {}, opt) };
  }
  const db = socialDb(ctx.env);
  if (!db) return { deny: jsonError(503, ERR.UNAVAILABLE, {}, opt) };
  try {
    await ensureSocialSchema(db);
  } catch {
    return { deny: jsonError(503, ERR.UNAVAILABLE, {}, opt) };
  }
  const day = studyDayWib(ctx.now);
  return { db, sub: ctx.identity.sub, day, week: weekMondayOf(day), opt };
}

const PROFILE_COLUMNS =
  'sub, handle, display_name, avatar_id, flags, band, streak_days, last_meaningful_day, created_day';

async function readProfile(db, sub) {
  return db
    .prepare('SELECT ' + PROFILE_COLUMNS + ' FROM social_profile WHERE sub = ?1')
    .bind(sub)
    .first();
}

/** Streak untuk DITAMPILKAN: basi bila hari-bermakna terakhir < kemarin. */
function displayStreak(row, today) {
  if (!row || !row.last_meaningful_day) return 0;
  const gap = diffDays(today, row.last_meaningful_day);
  return gap <= 1 ? Number(row.streak_days) || 0 : 0;
}

function profileBody(row, today) {
  return {
    handle: row.handle,
    displayName: row.display_name || null,
    avatarId: Number(row.avatar_id) || 0,
    band: row.band || null,
    streakDays: displayStreak(row, today),
    createdDay: row.created_day,
    flags: {
      friendsVisible: (row.flags & PROFILE_FLAGS.FRIENDS_VISIBLE) !== 0,
      leagueOptIn: (row.flags & PROFILE_FLAGS.LEAGUE_OPT_IN) !== 0,
      boardHidden: (row.flags & PROFILE_FLAGS.BOARD_HIDDEN) !== 0
    }
  };
}

/** Placeholder ?N berurutan mulai `start`, untuk daftar IN yang panjangnya dinamis. */
function placeholders(count, start) {
  const out = [];
  for (let i = 0; i < count; i += 1) out.push('?' + (start + i));
  return out.join(', ');
}

/**
 * Penghitung ber-cap atomik (pola gerbang kuota). Mengembalikan jumlah yang
 * BENAR-BENAR diberikan (0..want). Balapan gagal ke arah lebih sedikit.
 */
async function grantCapped(db, sub, period, kind, want, cap) {
  if (want <= 0) return 0;
  await db
    .prepare('INSERT OR IGNORE INTO social_counter (sub, period, kind, cnt) VALUES (?1, ?2, ?3, 0)')
    .bind(sub, period, kind)
    .run();
  const row = await db
    .prepare('SELECT cnt FROM social_counter WHERE sub = ?1 AND period = ?2 AND kind = ?3')
    .bind(sub, period, kind)
    .first();
  const used = row ? Number(row.cnt) || 0 : 0;
  const grant = Math.min(want, Math.max(0, cap - used));
  if (grant <= 0) return 0;
  const res = await db
    .prepare(
      'UPDATE social_counter SET cnt = cnt + ?4 ' +
      'WHERE sub = ?1 AND period = ?2 AND kind = ?3 AND cnt + ?4 <= ?5'
    )
    .bind(sub, period, kind, grant, cap)
    .run();
  return res && res.meta && res.meta.changes > 0 ? grant : 0;
}

/* ========================================================== profil ================= */

const SCHEMA_PROFILE_CREATE = {
  allow: {
    handle: { type: 'string', max: 64, required: true },
    displayName: { type: 'string', max: 64 },
    avatarId: { type: 'number' },
    friendsVisible: { type: 'boolean' },
    leagueOptIn: { type: 'boolean' }
  }
};

async function routeProfileCreate(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_PROFILE_CREATE);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  const existing = await readProfile(gate.db, gate.sub);
  if (existing) return jsonError(409, ERR.PROFILE_EXISTS, {}, gate.opt);

  const handle = String(body.value.handle).toLowerCase();
  if (handleProblem(handle)) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);

  let displayName = null;
  if (body.value.displayName !== undefined) {
    displayName = cleanDisplayName(body.value.displayName);
    if (displayName === null) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  }
  let avatarId = 0;
  if (body.value.avatarId !== undefined) {
    avatarId = Number(body.value.avatarId);
    if (!Number.isInteger(avatarId) || avatarId < 0 || avatarId > AVATAR_MAX_ID) {
      return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
    }
  }
  // Default AMAN (spec §2.4): friendsVisible=true, leagueOptIn=false, boardHidden=false.
  let flags = 0;
  if (body.value.friendsVisible !== false) flags |= PROFILE_FLAGS.FRIENDS_VISIBLE;
  if (body.value.leagueOptIn === true) flags |= PROFILE_FLAGS.LEAGUE_OPT_IN;

  // Klaim handle ATOMIK: PK social_handle. Duplikat = galat unik = 409, tanpa
  // read-then-write yang bisa balapan (pola gerbang kuota).
  try {
    await gate.db
      .prepare('INSERT INTO social_handle (handle, sub) VALUES (?1, ?2)')
      .bind(handle, gate.sub)
      .run();
  } catch {
    return jsonError(409, ERR.HANDLE_TAKEN, {}, gate.opt);
  }
  await gate.db
    .prepare(
      'INSERT INTO social_profile (sub, handle, display_name, avatar_id, flags, created_day) ' +
      'VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    )
    .bind(gate.sub, handle, displayName, avatarId, flags, gate.day)
    .run();

  const row = await readProfile(gate.db, gate.sub);
  return jsonResponse({ profile: profileBody(row, gate.day) }, { ...gate.opt, status: 201 });
}

const SCHEMA_PROFILE_CHECK = { allow: { handle: { type: 'string', max: 64, required: true } } };

async function routeProfileCheck(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_PROFILE_CHECK);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const handle = String(body.value.handle).toLowerCase();
  // Jawaban HANYA {available:bool} (spec §2.4: anti-oracle enumerasi — format
  // tidak sah dan handle terpakai dijawab SAMA: tidak tersedia).
  if (handleProblem(handle)) return jsonResponse({ available: false }, gate.opt);
  const taken = await gate.db
    .prepare('SELECT sub FROM social_handle WHERE handle = ?1')
    .bind(handle)
    .first();
  return jsonResponse({ available: !taken }, gate.opt);
}

async function routeProfileMe(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const row = await readProfile(gate.db, gate.sub);
  if (!row) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);
  return jsonResponse({ profile: profileBody(row, gate.day) }, gate.opt);
}

/* ========================================================== undangan teman ========= */

function randomInviteCode() {
  const alphabet = INVITE_RULES.ALPHABET;
  const bytes = new Uint8Array(INVITE_RULES.CODE_LEN);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return code;
}

async function requireProfile(gate) {
  const row = await readProfile(gate.db, gate.sub);
  return row || null;
}

async function routeFriendsInvite(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, { allow: {} });
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const active = await gate.db
    .prepare(
      'SELECT COUNT(*) AS n FROM social_invite ' +
      'WHERE sub = ?1 AND used_by IS NULL AND expires_day >= ?2'
    )
    .bind(gate.sub, gate.day)
    .first();
  if (active && Number(active.n) >= INVITE_RULES.MAX_ACTIVE_PER_USER) {
    return jsonError(409, ERR.LIMIT_REACHED, {}, gate.opt);
  }

  const expiresDay = addDays(gate.day, INVITE_RULES.TTL_DAYS);
  // Tabrakan kode acak 30^8 praktis nol; tetap dicoba ulang terbatas supaya
  // galat unik yang sangat langka tidak menjadi 500.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = randomInviteCode();
    try {
      /* eslint-disable no-await-in-loop */
      await gate.db
        .prepare(
          'INSERT INTO social_invite (code, sub, created_day, expires_day) VALUES (?1, ?2, ?3, ?4)'
        )
        .bind(code, gate.sub, gate.day, expiresDay)
        .run();
      return jsonResponse({ code, expiresDay, singleUse: true }, gate.opt);
    } catch {
      // kode bentrok: coba kode lain
    }
  }
  return jsonError(503, ERR.UNAVAILABLE, {}, gate.opt);
}

const SCHEMA_REDEEM = { allow: { code: { type: 'string', max: 32, required: true } } };

async function routeFriendsRedeem(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_REDEEM);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  // SATU bentuk galat untuk SEMUA sebab kode (salah bentuk / tidak ada /
  // kedaluwarsa / sudah terpakai / kode sendiri) — anti-oracle, pola claim_invalid.
  const invalid = () => jsonError(400, ERR.CODE_INVALID, {}, gate.opt);
  const code = String(body.value.code).toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) return invalid();

  const friendCount = await gate.db
    .prepare('SELECT COUNT(*) AS n FROM social_friend WHERE a = ?1')
    .bind(gate.sub)
    .first();
  if (friendCount && Number(friendCount.n) >= FRIENDS_MAX) {
    return jsonError(409, ERR.LIMIT_REACHED, {}, gate.opt);
  }

  // Klaim SINGLE-USE atomik: satu pernyataan, satu pemenang. Replay kode yang
  // sama menemukan used_by terisi dan jatuh ke galat generik yang sama.
  const claimed = await gate.db
    .prepare(
      'UPDATE social_invite SET used_by = ?2, used_day = ?3 ' +
      'WHERE code = ?1 AND used_by IS NULL AND expires_day >= ?3 AND sub <> ?2 RETURNING sub'
    )
    .bind(code, gate.sub, gate.day)
    .first();
  if (!claimed || !claimed.sub) return invalid();

  const inviter = await readProfile(gate.db, claimed.sub);
  if (!inviter) return invalid(); // profil pengundang sudah lenyap: kode mati sunyi

  // Pertemanan DUA ARAH, idempoten (sudah berteman = no-op ramah, spec §3.2).
  await gate.db
    .prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
    .bind(gate.sub, claimed.sub, gate.day)
    .run();
  await gate.db
    .prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
    .bind(claimed.sub, gate.sub, gate.day)
    .run();

  return jsonResponse(
    {
      friend: {
        handle: inviter.handle,
        displayName: inviter.display_name || null,
        avatarId: Number(inviter.avatar_id) || 0
      }
    },
    gate.opt
  );
}

/* ================================================= tambah teman lewat ID (@handle) ====== */

const SCHEMA_ADD = { allow: { handle: { type: 'string', max: 24, required: true } } };

async function routeFriendsAdd(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_ADD);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const invalid = () => jsonError(400, ERR.CODE_INVALID, {}, gate.opt);
  const handle = String(body.value.handle).trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle) || handle === String(me.handle || '').toLowerCase()) return invalid();

  const friendCount = await gate.db
    .prepare('SELECT COUNT(*) AS n FROM social_friend WHERE a = ?1')
    .bind(gate.sub)
    .first();
  if (friendCount && Number(friendCount.n) >= FRIENDS_MAX) {
    return jsonError(409, ERR.LIMIT_REACHED, {}, gate.opt);
  }

  const target = await gate.db.prepare('SELECT sub FROM social_handle WHERE handle = ?1').bind(handle).first();
  if (!target || !target.sub || target.sub === gate.sub) return invalid();
  const friend = await readProfile(gate.db, target.sub);
  if (!friend) return invalid();

  await gate.db
    .prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
    .bind(gate.sub, target.sub, gate.day)
    .run();
  await gate.db
    .prepare('INSERT OR IGNORE INTO social_friend (a, b, since_day) VALUES (?1, ?2, ?3)')
    .bind(target.sub, gate.sub, gate.day)
    .run();

  return jsonResponse(
    { friend: { handle: friend.handle, displayName: friend.display_name || null, avatarId: Number(friend.avatar_id) || 0 } },
    gate.opt
  );
}

/* ========================================================== daftar teman =========== */

async function routeFriendsList(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const edges = await gate.db
    .prepare('SELECT b, since_day FROM social_friend WHERE a = ?1 LIMIT 50')
    .bind(gate.sub)
    .all();
  const rows = (edges && edges.results) || [];
  const subs = rows.map((r) => r.b);

  let profiles = new Map();
  let marks = [];
  if (subs.length) {
    const profileRows = await gate.db
      .prepare(
        'SELECT ' + PROFILE_COLUMNS + ' FROM social_profile WHERE sub IN (' +
        placeholders(subs.length, 1) + ')'
      )
      .bind(...subs)
      .all();
    profiles = new Map(((profileRows && profileRows.results) || []).map((p) => [p.sub, p]));
    const since = addDays(gate.day, -7);
    const markRows = await gate.db
      .prepare(
        'SELECT sub, day, kind FROM milestone_feed WHERE day >= ?1 AND sub IN (' +
        placeholders(subs.length, 2) + ')'
      )
      .bind(since, ...subs)
      .all();
    marks = (markRows && markRows.results) || [];
  }

  const friends = [];
  for (const edge of rows) {
    const p = profiles.get(edge.b);
    if (!p) continue; // profil teman sudah lenyap: baris hilang sunyi (spec §3 edge case)
    const base = {
      handle: p.handle,
      displayName: p.display_name || null,
      avatarId: Number(p.avatar_id) || 0,
      sinceDay: edge.since_day
    };
    // Anti-pattern §5.5.7: progres teman yang TIDAK opt-in tidak ditampilkan —
    // bahkan kepada teman. Presence granularitas HARI, tanpa jam.
    if ((p.flags & PROFILE_FLAGS.FRIENDS_VISIBLE) !== 0) {
      const milestones = marks
        .filter((m) => m.sub === p.sub)
        .map((m) => ({ kind: m.kind, day: m.day }));
      friends.push({
        ...base,
        visible: true,
        band: p.band || null,
        streakDays: displayStreak(p, gate.day),
        studiedToday: p.last_meaningful_day === gate.day,
        milestones
      });
    } else {
      friends.push({ ...base, visible: false });
    }
  }

  // Sorakan yang KUterima hari ini (penerima yang mendengar `nudge`, spec §3.3).
  const cheerRows = await gate.db
    .prepare('SELECT sub_from, sticker, cnt FROM cheer_feed WHERE sub_to = ?1 AND day = ?2')
    .bind(gate.sub, gate.day)
    .all();
  const cheersToday = [];
  for (const c of (cheerRows && cheerRows.results) || []) {
    const from = profiles.get(c.sub_from);
    if (!from) continue; // hanya sorakan dari teman yang masih ada yang tampil
    cheersToday.push({ handle: from.handle, sticker: c.sticker, cnt: Number(c.cnt) || 0 });
  }

  return jsonResponse({ friends, cheersToday, day: gate.day }, gate.opt);
}

/* ========================================================== sorakan ================ */

const SCHEMA_CHEER = {
  allow: {
    handle: { type: 'string', max: 64, required: true },
    sticker: { type: 'string', max: 16, required: true }
  }
};

async function routeCheer(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_CHEER);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  // Stiker = ENUM TERTUTUP. Teks bebas tidak punya jalur masuk (spec §3.1).
  if (!CHEER_STICKERS.includes(body.value.sticker)) {
    return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  }
  const target = await gate.db
    .prepare('SELECT sub FROM social_handle WHERE handle = ?1')
    .bind(String(body.value.handle).toLowerCase())
    .first();
  // "tidak ada" dan "bukan teman" dijawab SAMA (anti-oracle keanggotaan).
  if (!target || target.sub === gate.sub) return notFound(gate.opt);
  const edge = await gate.db
    .prepare('SELECT since_day FROM social_friend WHERE a = ?1 AND b = ?2')
    .bind(gate.sub, target.sub)
    .first();
  if (!edge) return notFound(gate.opt);

  const granted = await grantCapped(
    gate.db, gate.sub, gate.day, 'cheer:' + target.sub, 1, CHEER_PER_FRIEND_PER_DAY
  );
  if (!granted) {
    return jsonError(429, ERR.RATE_LIMITED, { retryAfter: 3600 }, gate.opt);
  }
  await gate.db
    .prepare(
      'INSERT INTO cheer_feed (sub_to, day, sub_from, sticker, cnt) VALUES (?1, ?2, ?3, ?4, 1) ' +
      'ON CONFLICT(sub_to, day, sub_from, sticker) DO UPDATE SET cnt = cnt + 1'
    )
    .bind(target.sub, gate.day, gate.sub, body.value.sticker)
    .run();
  // Sorakan TIDAK bernilai PB/gem apa pun (spec §3.4) — respons tidak membawa poin.
  return jsonResponse({ sent: true }, gate.opt);
}

/* ========================================================== evidence -> PB ========= */

function evidenceProblem(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'body';
  const keys = Object.keys(value);
  const allow = ['jti', 'day', 'events'];
  if (keys.length !== allow.length || keys.some((k) => !allow.includes(k))) return 'keys';
  if (typeof value.jti !== 'string' || !EVIDENCE_RULES.JTI_PATTERN.test(value.jti)) return 'jti';
  if (typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day)) return 'day';
  if (!Array.isArray(value.events) || value.events.length < 1 ||
    value.events.length > EVIDENCE_RULES.MAX_EVENTS_PER_BATCH) return 'events';
  for (const ev of value.events) {
    if (ev === null || typeof ev !== 'object' || Array.isArray(ev)) return 'event';
    for (const k of Object.keys(ev)) if (!['kind', 'count', 'band'].includes(k)) return 'event_keys';
    if (typeof ev.kind !== 'string') return 'kind';
    if (ev.count !== undefined && typeof ev.count !== 'number') return 'count';
    if (ev.band !== undefined && typeof ev.band !== 'string') return 'band';
  }
  return null;
}

async function pbWeekOf(db, sub, week) {
  const row = await db
    .prepare('SELECT pb FROM rank_week WHERE sub = ?1 AND week = ?2')
    .bind(sub, week)
    .first();
  return row ? Number(row.pb) || 0 : 0;
}

async function routeRankEvidence(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  if (evidenceProblem(body.value)) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  // Jawaban "dibuang diam-diam": bentuk SAMA dengan batch yang tidak menambah
  // apa pun — tanpa oracle sebab (spec §4.4.2).
  const silent = async () =>
    jsonResponse(
      { accepted: 0, pbWeek: await pbWeekOf(gate.db, gate.sub, gate.week), week: gate.week },
      gate.opt
    );

  // 1. Anti-replay jti (idempoten untuk outbox offline): PK(sub, jti).
  try {
    await gate.db
      .prepare('INSERT INTO rank_jti (sub, jti, day) VALUES (?1, ?2, ?3)')
      .bind(gate.sub, body.value.jti, gate.day)
      .run();
  } catch {
    return silent();
  }

  // 2. Hari klaim: jam SERVER WIB yang menang. Masa depan / lebih tua dari
  //    DAY_SKEW_DAYS / pekan lain = buang (spec §4.4.4 + edge case §5.7 S4).
  const claimedDay = body.value.day;
  const age = diffDays(gate.day, claimedDay);
  if (age < 0 || age > EVIDENCE_RULES.DAY_SKEW_DAYS) return silent();
  if (weekMondayOf(claimedDay) !== gate.week) return silent();

  // 3. Plausibility batch/hari (skrip, bukan murid): counter '_batches'.
  const batchOk = await grantCapped(
    gate.db, gate.sub, gate.day, '_batches', 1, EVIDENCE_RULES.MAX_BATCHES_PER_DAY
  );
  if (!batchOk) return silent();

  // 4. Hitung PB per event dari tabel BEKU, cap atomik per period.
  let gained = 0;
  let meaningfulGranted = false;
  const milestones = [];
  let bandUpdate = null;
  for (const ev of body.value.events) {
    const rule = PB_RULES[ev.kind];
    if (!rule) continue; // kind di luar enum = diabaikan sunyi
    const want = Math.min(
      Math.max(1, Math.floor(Number(ev.count) || 1)),
      EVIDENCE_RULES.MAX_COUNT_PER_EVENT
    );
    const period = rule.period === 'week' ? gate.week : claimedDay;
    /* eslint-disable no-await-in-loop */
    const granted = await grantCapped(gate.db, gate.sub, period, ev.kind, want, rule.cap);
    if (!granted) continue;
    gained += granted * rule.pb;
    if (ev.kind === 'meaningful_day') meaningfulGranted = true;
    if (MILESTONE_KINDS.includes(ev.kind)) milestones.push(ev.kind);
    if (ev.kind === 'exam_passed' && LEVEL_BANDS.includes(ev.band)) bandUpdate = ev.band;
  }

  // 5. Efek samping yang DIHITUNG SERVER dari event yang DITERIMA saja.
  if (meaningfulGranted) {
    const last = me.last_meaningful_day || null;
    let streak = Number(me.streak_days) || 0;
    if (last !== claimedDay) {
      streak = last && diffDays(claimedDay, last) === 1 ? streak + 1 : 1;
      await gate.db
        .prepare(
          'UPDATE social_profile SET streak_days = ?2, last_meaningful_day = ?3 WHERE sub = ?1'
        )
        .bind(gate.sub, streak, claimedDay)
        .run();
    }
  }
  if (bandUpdate) {
    await gate.db
      .prepare('UPDATE social_profile SET band = ?2 WHERE sub = ?1')
      .bind(gate.sub, bandUpdate)
      .run();
  }
  for (const kind of milestones) {
    await gate.db
      .prepare('INSERT OR IGNORE INTO milestone_feed (sub, day, kind) VALUES (?1, ?2, ?3)')
      .bind(gate.sub, claimedDay, kind)
      .run();
  }

  // 6. Buku PB mingguan. hidden diturunkan dari flag profil saat baris lahir.
  const hiddenNow = (me.flags & PROFILE_FLAGS.BOARD_HIDDEN) !== 0 ? 1 : 0;
  await gate.db
    .prepare('INSERT OR IGNORE INTO rank_week (sub, week, pb, hidden) VALUES (?1, ?2, 0, ?3)')
    .bind(gate.sub, gate.week, hiddenNow)
    .run();
  let pbWeek = 0;
  if (gained > 0) {
    const updated = await gate.db
      .prepare('UPDATE rank_week SET pb = pb + ?3 WHERE sub = ?1 AND week = ?2 RETURNING pb')
      .bind(gate.sub, gate.week, gained)
      .first();
    pbWeek = updated ? Number(updated.pb) || 0 : 0;
  } else {
    pbWeek = await pbWeekOf(gate.db, gate.sub, gate.week);
  }
  return jsonResponse({ accepted: gained, pbWeek, week: gate.week }, gate.opt);
}

/* ========================================================== papan ================== */

async function boardRowsFor(gate, subs, includeHiddenSelf) {
  if (!subs.length) return [];
  const rankRows = await gate.db
    .prepare(
      'SELECT sub, pb, hidden FROM rank_week WHERE week = ?1 AND sub IN (' +
      placeholders(subs.length, 2) + ')'
    )
    .bind(gate.week, ...subs)
    .all();
  const ranks = new Map(((rankRows && rankRows.results) || []).map((r) => [r.sub, r]));
  const profileRows = await gate.db
    .prepare(
      'SELECT ' + PROFILE_COLUMNS + ' FROM social_profile WHERE sub IN (' +
      placeholders(subs.length, 1) + ')'
    )
    .bind(...subs)
    .all();
  const out = [];
  for (const p of (profileRows && profileRows.results) || []) {
    const rank = ranks.get(p.sub);
    const hiddenByFlag = (p.flags & PROFILE_FLAGS.BOARD_HIDDEN) !== 0;
    const hiddenByWeek = rank ? Number(rank.hidden) === 1 : false;
    const isSelf = p.sub === gate.sub;
    if ((hiddenByFlag || hiddenByWeek) && !(includeHiddenSelf && isSelf)) continue;
    out.push({
      self: isSelf,
      handle: p.handle,
      avatarId: Number(p.avatar_id) || 0,
      band: p.band || null,
      pb: rank ? Number(rank.pb) || 0 : 0
    });
  }
  out.sort((a, b) => (b.pb - a.pb) || (a.handle < b.handle ? -1 : 1));
  return out;
}

function meFrom(rows) {
  const idx = rows.findIndex((r) => r.self);
  return idx < 0 ? null : { rank: idx + 1, pb: rows[idx].pb };
}

function stripSelf(rows) {
  return rows.map(({ self, ...rest }) => ({ ...rest, me: self }));
}

async function routeBoardFriends(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const edges = await gate.db
    .prepare('SELECT b, since_day FROM social_friend WHERE a = ?1 LIMIT 50')
    .bind(gate.sub)
    .all();
  const subs = [gate.sub, ...((edges && edges.results) || []).map((r) => r.b)];
  // Baris "aku" selalu terlihat OLEH DIRIKU walau Mode privat (PB pribadi tetap
  // terlihat sendiri, spec §4.3); teman yang hidden tersaring di boardRowsFor.
  const rows = await boardRowsFor(gate, subs, true);
  return jsonResponse(
    { week: gate.week, rows: stripSelf(rows), me: meFrom(rows) },
    gate.opt
  );
}

async function assignCohort(gate) {
  const existing = await gate.db
    .prepare('SELECT cohort_id FROM rank_week WHERE sub = ?1 AND week = ?2')
    .bind(gate.sub, gate.week)
    .first();
  if (existing && existing.cohort_id) return existing.cohort_id;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    /* eslint-disable no-await-in-loop */
    const open = await gate.db
      .prepare('SELECT id FROM social_cohort WHERE week = ?1 AND cnt < ?2 LIMIT 1')
      .bind(gate.week, COHORT_RULES.MAX_MEMBERS)
      .first();
    let cohortId = open && open.id;
    if (!cohortId) {
      cohortId = crypto.randomUUID();
      await gate.db
        .prepare('INSERT INTO social_cohort (id, week, cnt) VALUES (?1, ?2, 0)')
        .bind(cohortId, gate.week)
        .run();
    }
    // Kursi diklaim ATOMIK (pola gerbang kuota): kohor penuh = changes 0 = coba lagi.
    const seat = await gate.db
      .prepare('UPDATE social_cohort SET cnt = cnt + 1 WHERE id = ?1 AND cnt < ?2')
      .bind(cohortId, COHORT_RULES.MAX_MEMBERS)
      .run();
    if (seat && seat.meta && seat.meta.changes > 0) {
      await gate.db
        .prepare('UPDATE rank_week SET cohort_id = ?3 WHERE sub = ?1 AND week = ?2')
        .bind(gate.sub, gate.week, cohortId)
        .run();
      return cohortId;
    }
  }
  return null;
}

async function routeBoardLeague(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const optedIn = (me.flags & PROFILE_FLAGS.LEAGUE_OPT_IN) !== 0 &&
    (me.flags & PROFILE_FLAGS.BOARD_HIDDEN) === 0;
  if (!optedIn) {
    // Papan liga hanya untuk yang opt-in (spec §4.3); bukan galat — keadaan.
    return jsonResponse(
      { week: gate.week, optedIn: false, leagueOpen: false, rows: [], me: null },
      gate.opt
    );
  }
  const hiddenNow = 0;
  await gate.db
    .prepare('INSERT OR IGNORE INTO rank_week (sub, week, pb, hidden) VALUES (?1, ?2, 0, ?3)')
    .bind(gate.sub, gate.week, hiddenNow)
    .run();
  const cohortId = await assignCohort(gate);
  if (!cohortId) {
    return jsonResponse(
      { week: gate.week, optedIn: true, leagueOpen: false, rows: [], me: null },
      gate.opt
    );
  }
  const memberRows = await gate.db
    .prepare(
      'SELECT sub FROM rank_week WHERE week = ?1 AND cohort_id = ?2 AND hidden = 0 ORDER BY pb DESC LIMIT 20'
    )
    .bind(gate.week, cohortId)
    .all();
  const subs = ((memberRows && memberRows.results) || []).map((r) => r.sub);
  // Kohor terlalu sepi = papan disembunyikan, JUJUR tanpa bot/ghost (spec §5.4.3).
  if (subs.length < COHORT_RULES.MIN_VISIBLE) {
    return jsonResponse(
      { week: gate.week, optedIn: true, leagueOpen: false, rows: [], me: null },
      gate.opt
    );
  }
  const rows = await boardRowsFor(gate, subs, false);
  return jsonResponse(
    { week: gate.week, optedIn: true, leagueOpen: true, rows: stripSelf(rows), me: meFrom(rows) },
    gate.opt
  );
}

/* ========================================================== opt-out ================ */

const SCHEMA_OPTOUT = { allow: { hidden: { type: 'boolean', required: true } } };

async function routeRankOptout(ctx) {
  const gate = await socialGate(ctx);
  if (gate.deny) return gate.deny;
  const body = await readJsonFromCtx(ctx, gate.opt);
  if (!body.ok) return body.response;
  const shape = validateShape(body.value, SCHEMA_OPTOUT);
  if (!shape.ok) return jsonError(400, ERR.SCHEMA_INVALID, {}, gate.opt);
  const me = await requireProfile(gate);
  if (!me) return jsonError(404, ERR.PROFILE_REQUIRED, {}, gate.opt);

  const hidden = body.value.hidden === true;
  const flags = hidden
    ? (me.flags | PROFILE_FLAGS.BOARD_HIDDEN)
    : (me.flags & ~PROFILE_FLAGS.BOARD_HIDDEN);
  await gate.db
    .prepare('UPDATE social_profile SET flags = ?2 WHERE sub = ?1')
    .bind(gate.sub, flags)
    .run();
  // Hilang dari papan SEKETIKA untuk pekan berjalan; pekan berikut mewarisi flag.
  await gate.db
    .prepare('UPDATE rank_week SET hidden = ?3 WHERE sub = ?1 AND week = ?2')
    .bind(gate.sub, gate.week, hidden ? 1 : 0)
    .run();
  return jsonResponse({ hidden }, gate.opt);
}

/* ========================================================== pendaftaran rute ======= */

export const ROUTES = [
  ['POST', '/api/social/profile/create', routeProfileCreate],
  ['POST', '/api/social/profile/check', routeProfileCheck],
  ['GET', '/api/social/profile/me', routeProfileMe],
  ['POST', '/api/social/friends/invite', routeFriendsInvite],
  ['POST', '/api/social/friends/redeem', routeFriendsRedeem],
  ['POST', '/api/social/friends/add', routeFriendsAdd],
  ['GET', '/api/social/friends', routeFriendsList],
  ['POST', '/api/social/cheer', routeCheer],
  ['POST', '/api/social/rank/evidence', routeRankEvidence],
  ['GET', '/api/social/rank/board/friends', routeBoardFriends],
  ['GET', '/api/social/rank/board/league', routeBoardLeague],
  ['POST', '/api/social/rank/optout', routeRankOptout]
];
