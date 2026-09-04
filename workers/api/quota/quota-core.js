/**
 * FIEZEL · workers/api/quota/quota-core.js
 *
 * FUNGSI MURNI penentu kuota. Desain: reports/cf-b3-quota.md §1.3, §3.2, §3.3.
 *
 * KEMURNIAN adalah kontraknya, bukan gaya:
 *   - tanpa DOM, tanpa jaringan, tanpa penyimpanan
 *   - TANPA `Date` dan TANPA `Date.now()` di dalam modul: **waktu selalu parameter**
 *     (`now` dalam epoch ms). Karena itu `dayKeyFor()` dihitung dengan aritmetika hari
 *     sipil (algoritma civil-from-days), bukan `new Date().toISOString()`.
 *   - tanpa `crypto.randomUUID()`: token reservasi dibuat dari penghitung urut di dalam
 *     state (`state.seq`), sehingga deterministik, bisa diuji, dan tetap SERVER-SIDE.
 *   Cetakan yang ditiru: `gems-core.js` dan `shouldPresentPuterPopup()` — dua fungsi yang
 *   cf-a12 tandai "pakai ulang, jangan kotori".
 *
 * INVARIAN PUSAT (dijaga `quota-core-test.js`):
 *     used_effective(bucket) = counters[bucket] + Σ reservasi terbuka untuk bucket itu
 *
 * POLA TAGIHAN JUJUR (cf-b3 §1.3), tiga janji yang bisa diperiksa mesin:
 *   1. Kuota TIDAK dipotong saat `reserve()` — hanya ditahan (held). Yang menagih adalah
 *      barang yang TERKIRIM (`commit()`), bukan permintaan yang dikirim.
 *   2. Cache hit TIDAK PERNAH menyentuh kuota. Cache diperiksa SEBELUM reserve, dan hanya
 *      server (`R2.head`) yang boleh memutuskan itu; bendera `cacheHit` dari klien diabaikan.
 *   3. Kegagalan provider = `rollback()`, BUKAN 429. Reservasi yang mati (Worker crash,
 *      isolate dibunuh) dipanen lewat `expiresAt` → default-nya rollback, bukan hangus.
 *      Kalau harus salah, salah ke arah murid.
 */

import {
  FIXED_ZONE_OFFSET_MINUTES,
  QUOTA_BUCKETS,
  QUOTA_BUCKET_PARENT,
  QUOTA_BUCKET_UNITS,
  QUOTA_CONFIG,
  FREE_BUCKET_LIMITS
} from './quota-config.js';

const MS_PER_DAY = 86400000;
const MS_PER_MINUTE = 60000;

/** Nama `scope` pada amplop penolakan 429 (cf-b3 §4.3). Kode mesin, bukan naskah. */
export const DENY_SCOPE = Object.freeze({
  ai: 'ai_daily',
  aiTranslate: 'ai_translate_daily',
  ttsCalls: 'tts_daily_calls',
  ttsChars: 'tts_daily_chars'
});

/* ============================================================ hari & reset =========== */

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/**
 * Tanggal sipil dari nomor hari epoch, tanpa objek `Date`.
 * Algoritma civil_from_days (Howard Hinnant), era-based, valid jauh di luar rentang pakai.
 */
function civilFromDays(z) {
  let day = z + 719468;
  const era = Math.floor(day / 146097);
  const doe = day - era * 146097;                                    // [0, 146096]
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  return { year: y + (m <= 2 ? 1 : 0), month: m, day: d };
}

/**
 * Offset menit untuk zona TETAP yang dikenal sistem.
 *
 * KEAMANAN: zona yang tidak dikenal TIDAK PERNAH menghasilkan offset pilihan pemanggil.
 * Ia jatuh ke `RESET_TZ` (Asia/Jakarta). Itulah yang membuat `preferences.timeZone` dari
 * klien tidak bisa menggeser tengah malam — lubang manipulasi termurah di seluruh sistem
 * kalau dibiarkan (cf-b3 §3.2 alasan 1, §7 baris 6).
 */
export function offsetMinutesFor(tz) {
  if (typeof tz === 'string' && Object.prototype.hasOwnProperty.call(FIXED_ZONE_OFFSET_MINUTES, tz)) {
    return FIXED_ZONE_OFFSET_MINUTES[tz];
  }
  return FIXED_ZONE_OFFSET_MINUTES[QUOTA_CONFIG.RESET_TZ];
}

/**
 * `dayKeyFor(now, tz)` → 'YYYY-MM-DD'.
 *
 * KEPUTUSAN (cf-b3 §3.2): kuota per-pengguna memakai `Asia/Jakarta` untuk SEMUA murid.
 * ALASAN: `preferences.timeZone` berasal dari klien (app.js:153) dan bisa dipalsukan satu
 * baris dari devtools; kalau batas hari mengikutinya, mengganti tz = mereset kuota sesuka
 * hati. UTC ditolak bukan karena salah teknis tapi karena 00:00 UTC = 07:00 WIB, tepat di
 * jam belajar pagi — reset di tengah sesi membuat naskah "AI balik besok" bohong 2× sehari.
 * Indonesia tanpa DST ⇒ offset tetap +07:00 tidak pernah menghasilkan hari 23/25 jam.
 */
export function dayKeyFor(now, tz) {
  const offset = offsetMinutesFor(tz) * MS_PER_MINUTE;
  const dayNumber = Math.floor((now + offset) / MS_PER_DAY);
  const c = civilFromDays(dayNumber);
  return c.year + '-' + pad2(c.month) + '-' + pad2(c.day);
}

/** Batas hari kuota murid. Argumen `tz` sengaja TIDAK ADA: tidak ada yang bisa menggesernya. */
export function dayKeyForQuota(now) {
  return dayKeyFor(now, QUOTA_CONFIG.RESET_TZ);
}

/**
 * Satu-satunya pengecualian yang jujur (cf-b3 §3.2): anggaran neuron TINGKAT AKUN wajib
 * memakai hari UTC karena Cloudflare mereset jatah gratisnya "daily at 00:00 UTC"
 * (cf-a10 §2). Dua jam, dua tujuan, masing-masing dinamai supaya tidak tertukar.
 */
export function dayKeyForAccountBudget(now) {
  return dayKeyFor(now, QUOTA_CONFIG.ACCOUNT_BUDGET_TZ);
}

/** Epoch ms 00:00 berikutnya di zona kuota. Selalu `> now` dan `<= now + 86.400.000`. */
export function resetAtFor(now, tz) {
  const offset = offsetMinutesFor(tz) * MS_PER_MINUTE;
  const dayNumber = Math.floor((now + offset) / MS_PER_DAY);
  return (dayNumber + 1) * MS_PER_DAY - offset;
}

export function resetAtForQuota(now) {
  return resetAtFor(now, QUOTA_CONFIG.RESET_TZ);
}

/* ============================================================ state ================= */

function zeroCounters() {
  const c = {};
  for (const b of QUOTA_BUCKETS) c[b] = 0;
  return c;
}

function normaliseLimits(limits) {
  const out = {};
  for (const b of QUOTA_BUCKETS) {
    const v = limits && Number.isFinite(limits[b]) ? Math.floor(limits[b]) : FREE_BUCKET_LIMITS[b];
    out[b] = v < 0 ? 0 : v;
  }
  return out;
}

/**
 * State kuota satu pengguna untuk satu hari. Dibuat server; klien tidak pernah mengirim
 * bentuk ini (lihat `quota-manipulation-test.js`).
 */
export function createState(now, limits) {
  return {
    schema: 'fiezel-quota-state-v1',
    day: dayKeyForQuota(now),
    limits: normaliseLimits(limits),
    counters: zeroCounters(),
    reservations: [],
    seq: 0,
    denied: 0,
    committed: 0,
    rolledBack: 0,
    reaped: 0
  };
}

function cloneState(state) {
  return {
    schema: state.schema,
    day: state.day,
    limits: Object.assign({}, state.limits),
    counters: Object.assign({}, state.counters),
    reservations: state.reservations.map((r) => Object.assign({}, r, { charges: Object.assign({}, r.charges) })),
    seq: state.seq,
    denied: state.denied,
    committed: state.committed,
    rolledBack: state.rolledBack,
    reaped: state.reaped
  };
}

/**
 * Reset harian LAZY (cf-b3 §3.2): tidak ada `setAlarm()` per pengguna (1 row tulis/
 * pengguna/hari yang bisa dihindari). Baris hari baru lahir pada permintaan pertama hari
 * itu; pengguna yang tidak datang tidak menghasilkan tulisan apa pun. Dua permintaan di
 * hari yang sama TIDAK mereset dua kali karena kuncinya string hari, bukan penanda waktu.
 */
export function rolloverIfNeeded(state, now) {
  const day = dayKeyForQuota(now);
  if (state.day === day) return state;
  const next = cloneState(state);
  next.day = day;
  next.counters = zeroCounters();
  next.reservations = [];              // reservasi lintas-hari mati bersama harinya
  next.denied = 0;
  next.committed = 0;
  next.rolledBack = 0;
  next.reaped = 0;
  return next;
}

/**
 * Memanen reservasi kedaluwarsa. Ini pengganti lease Durable Object di jalur D1
 * (cf-b3 §1.4): kalau Worker mati antara reserve dan commit, slotnya kembali sendiri.
 * ROLLBACK adalah kegagalan default — kuota tidak hangus karena sistem yang rusak.
 */
export function sweepExpired(state, now) {
  const expired = state.reservations.filter((r) => r.expiresAt <= now);
  if (expired.length === 0) return { state, reaped: [] };
  const next = cloneState(state);
  next.reservations = next.reservations.filter((r) => r.expiresAt > now);
  next.reaped += expired.length;
  return { state: next, reaped: expired.map((r) => r.token) };
}

/* ============================================================ tagihan =============== */

/**
 * Bucket mana yang naik untuk satu jenis permintaan.
 * `aiTranslate` menaikkan `ai` JUGA — sub-kuota di dalam kuota, bukan tambahan (cf-b3 §3.3).
 * `tts` adalah komposit: satu render menaikkan `ttsCalls` 1 dan `ttsChars` sebanyak
 * karakter ternormalisasi yang DIUKUR SERVER (klaim panjang dari klien diabaikan).
 *
 * PENTING: jenis ditentukan RUTE, bukan body (cf-b3 §7 #8, uji (e) quota-manipulation-test).
 */
export function chargesFor(bucket, amount) {
  const n = Number.isFinite(amount) ? Math.floor(amount) : 0;
  if (n < 0) return null;
  if (bucket === 'ai') return { ai: n };
  if (bucket === 'aiTranslate') return { ai: n, aiTranslate: n };
  if (bucket === 'ttsCalls') return { ttsCalls: n };
  if (bucket === 'ttsChars') return { ttsChars: n };
  if (bucket === 'tts') return { ttsCalls: 1, ttsChars: n };
  return null;
}

/** Σ reservasi terbuka untuk satu bucket. */
export function heldFor(state, bucket) {
  let sum = 0;
  for (const r of state.reservations) sum += r.charges[bucket] || 0;
  return sum;
}

/** INVARIAN PUSAT: counter + Σ reservasi terbuka. */
export function usedEffective(state, bucket) {
  return (state.counters[bucket] || 0) + heldFor(state, bucket);
}

function remainingView(state) {
  const out = {};
  for (const b of QUOTA_BUCKETS) {
    const eff = usedEffective(state, b);
    out[b] = Math.max(0, state.limits[b] - eff);
  }
  return out;
}

/**
 * Keputusan "boleh menagih kuota atau tidak" untuk TTS.
 * Hanya `serverCacheHit` yang dihormati — nilainya WAJIB berasal dari `env.R2.head(key)`
 * di server. `clientClaim` diterima sebagai parameter semata-mata supaya bisa DIBUKTIKAN
 * diabaikan oleh gerbang; ia tidak pernah dibaca (cf-b3 §7 #9).
 */
export function planTtsCharge({ serverCacheHit, chars }) {
  if (serverCacheHit === true) {
    return { charge: false, reason: 'cache_hit', bucket: null, amount: 0 };
  }
  const n = Number.isFinite(chars) && chars > 0 ? Math.floor(chars) : 0;
  return { charge: true, reason: 'cache_miss', bucket: 'tts', amount: n };
}

/* ============================================================ reserve/commit/rollback */

/**
 * FASE 1 — `reserve(state, bucket, amount, now)`.
 * Tidak satu pun counter naik di sini. Yang naik hanya reservasi (held).
 * Semua gerbang dievaluasi SEBELUM state berubah, dan penolakan mengembalikan `scope`
 * yang tepat supaya klien bisa memilih naskah yang benar (cf-b3 §4.3).
 */
export function reserve(state, bucket, amount, now, options) {
  const ttl = options && Number.isFinite(options.ttlMs) ? options.ttlMs : QUOTA_CONFIG.RESERVATION_TTL_MS;
  let s = rolloverIfNeeded(state, now);
  s = sweepExpired(s, now).state;

  const charges = chargesFor(bucket, amount);
  if (!charges) {
    // Bucket tak dikenal bukan "boleh": ia ditolak, dan bukan sebagai kuota habis.
    return { ok: false, state: s, error: 'unknown_bucket', scope: null, resetAt: resetAtForQuota(now) };
  }

  for (const b of QUOTA_BUCKETS) {
    const want = charges[b] || 0;
    if (want <= 0) continue;
    if (usedEffective(s, b) + want > s.limits[b]) {
      const denied = cloneState(s);
      denied.denied += 1;
      return {
        ok: false,
        state: denied,
        error: 'quota_exhausted',
        scope: DENY_SCOPE[b],
        resetAt: resetAtForQuota(now),
        remaining: remainingView(denied),
        quotaCharged: false
      };
    }
  }

  const next = cloneState(s);
  next.seq += 1;
  // Token dibuat SERVER dan tidak pernah dibaca dari klien. `options.token` HANYA boleh
  // diisi oleh pemanggil sisi server (rute memakai `ctx.newToken()`), supaya satu id yang
  // sama dipakai di D1 dan di state in-memory — kalau dua lapis mencetak id berbeda,
  // `commit` tidak akan pernah menemukan reservasinya dan kuota jadi gratis diam-diam.
  // Tanpa `options.token`, id dicetak deterministik dari state server (butuh `seq`, jadi
  // tetap tidak bisa dikarang dari luar).
  const token = options && typeof options.token === 'string' && options.token
    ? options.token
    : 'rsv-' + next.day + '-' + next.seq;
  next.reservations.push({
    token,
    bucket,
    charges,
    createdAt: now,
    expiresAt: now + ttl
  });
  return {
    ok: true,
    state: next,
    token,
    resetAt: resetAtForQuota(now),
    remaining: remainingView(next),
    quotaCharged: false            // belum. Menagih terjadi di commit, bukan di sini.
  };
}

/**
 * FASE 2a — `commit(state, token)`. Dipanggil HANYA setelah barang benar-benar terkirim.
 * `actual` opsional; nilainya DI-CLAMP ke yang direservasi supaya provider (atau bug)
 * tidak bisa menagih lebih dari yang pernah disetujui.
 * Reservasi yang sudah dipanen → `reservation_expired` dan counter TIDAK naik: commit
 * ganda tidak bisa menagih dua kali.
 */
export function commit(state, token, actual) {
  const idx = state.reservations.findIndex((r) => r.token === token);
  if (idx < 0) return { ok: false, state, reason: 'reservation_expired', quotaCharged: false };
  const r = state.reservations[idx];
  const next = cloneState(state);
  next.reservations.splice(idx, 1);
  for (const b of QUOTA_BUCKETS) {
    const reserved = r.charges[b] || 0;
    if (reserved <= 0) continue;
    let charge = reserved;
    if (actual && Number.isFinite(actual[b])) {
      charge = Math.min(reserved, Math.max(0, Math.floor(actual[b])));
    }
    next.counters[b] += charge;
  }
  next.committed += 1;
  return { ok: true, state: next, reason: null, quotaCharged: true };
}

/**
 * FASE 2b — `rollback(state, token)`. Provider gagal / timeout / 5xx / 429 provider /
 * respons senyap. Counter TIDAK PERNAH naik; kuota kembali UTUH.
 * Ini yang membuat `quotaCharged:false` pada respons galat menjadi kontrak, bukan harapan.
 */
export function rollback(state, token, reason) {
  const idx = state.reservations.findIndex((r) => r.token === token);
  if (idx < 0) return { ok: false, state, reason: 'already_reaped', quotaCharged: false };
  const next = cloneState(state);
  next.reservations.splice(idx, 1);
  next.rolledBack += 1;
  return { ok: true, state: next, reason: reason || 'provider_error', quotaCharged: false };
}

/* ============================================================ snapshot ============== */

/**
 * `snapshot(state, now)` — bentuk baca-saja untuk `GET /api/quota` (skema §4.1 cf-b3).
 *
 * `used` = COUNTER saja (angka setelah-commit). Ini keputusan sadar dari cf-b3 Risiko #3:
 * menampilkan angka termasuk-hold membuat sisa terlihat lebih kecil dari kenyataan selama
 * permintaan berjalan. `usedEffective` dan `held` tetap disertakan supaya invarian bisa
 * diperiksa mesin, dan `exhausted` memakai angka EFEKTIF supaya tidak pernah over-grant.
 */
export function snapshot(state, now) {
  let s = rolloverIfNeeded(state, now);
  s = sweepExpired(s, now).state;

  const buckets = {};
  let anyExhausted = false;
  let anyLow = false;
  for (const b of QUOTA_BUCKETS) {
    const limit = s.limits[b];
    const used = s.counters[b] || 0;
    const held = heldFor(s, b);
    const effective = used + held;
    const exhausted = effective >= limit;
    if (exhausted) anyExhausted = true;
    if (!exhausted && limit > 0 && (limit - effective) / limit <= QUOTA_CONFIG.LOW_REMAINING_RATIO) anyLow = true;
    const entry = {
      used,
      held,
      usedEffective: effective,
      limit,
      remaining: Math.max(0, limit - used),
      unit: QUOTA_BUCKET_UNITS[b],
      exhausted
    };
    if (QUOTA_BUCKET_PARENT[b]) entry.parent = QUOTA_BUCKET_PARENT[b];
    buckets[b] = entry;
  }

  return {
    day: s.day,
    resetAt: resetAtForQuota(now),
    resetTimezone: QUOTA_CONFIG.RESET_TZ,
    state: anyExhausted ? 'exhausted' : anyLow ? 'low' : 'ok',
    buckets,
    open: s.reservations.length,
    counters: { committed: s.committed, denied: s.denied, rolledBack: s.rolledBack, reaped: s.reaped }
  };
}

export default {
  DENY_SCOPE,
  chargesFor,
  commit,
  createState,
  dayKeyFor,
  dayKeyForAccountBudget,
  dayKeyForQuota,
  heldFor,
  offsetMinutesFor,
  planTtsCharge,
  reserve,
  resetAtFor,
  resetAtForQuota,
  rollback,
  rolloverIfNeeded,
  snapshot,
  sweepExpired,
  usedEffective
};
