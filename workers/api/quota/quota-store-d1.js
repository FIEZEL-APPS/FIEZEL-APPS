/**
 * FIEZEL · workers/api/quota/quota-store-d1.js
 *
 * Penyimpanan kuota FREE-TIER-SAFE di D1. Ini jalur yang dipilih owner
 * (EXEC-BRIEF-CF.md butir 2: "PLAN GRATIS dulu"), yaitu jalur "bebas-Durable-Object"
 * dari cf-b3 §1.4 — bukan pemenang teknis di cf-b3 §1.1, tapi satu-satunya yang jalan
 * tanpa rencana berbayar.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────
 * KEJUJURAN TEKNIS YANG WAJIB DIBACA SEBELUM MENGUBAH BERKAS INI
 * ──────────────────────────────────────────────────────────────────────────────────────
 * D1 **BUKAN** serializable seketat Durable Object.
 *
 * Yang benar: satu database D1 "is inherently single-threaded, and processes queries one
 * at a time" (https://developers.cloudflare.com/d1/platform/limits/), sehingga SATU
 * pernyataan `UPDATE … WHERE used + held < limit RETURNING …` bersifat atomik: dua
 * permintaan bersamaan tidak bisa dua-duanya lolos gerbang yang sama. Pola read-then-write
 * **haram** di berkas ini justru karena itu.
 *
 * Yang TIDAK bisa dijanjikan D1 — dan konsekuensi race-nya:
 *
 *  R1. **Tidak ada transaksi multi-pernyataan lintas await.** Reserve TTS harus menahan
 *      dua hal sekaligus (ttsCalls DAN ttsChars). Satu `UPDATE` bisa menahan keduanya
 *      dalam satu baris (dilakukan di bawah), tapi begitu ada operasi yang butuh dua
 *      tabel (baris kuota + baris lease), keduanya adalah dua pernyataan. Race yang
 *      mungkin: `UPDATE quota_daily` sukses menahan slot, lalu `INSERT quota_reservation`
 *      gagal (D1 "overloaded", isolate dibunuh). Akibat: slot tertahan TANPA lease →
 *      tidak bisa dipanen sweep by-token. Mitigasi yang dipakai: `held` diturunkan ulang
 *      dari tabel lease oleh `reconcileHeld()` (di bawah), dijalankan cron; jadi
 *      kebocoran maksimal berumur satu periode cron.
 *      → `batch()` D1 menjalankan pernyataan dalam satu transaksi implisit; dipakai di
 *        `commit`/`rollback` supaya dua pernyataan itu tidak bisa terpisah separuh.
 *
 *  R2. **Tidak ada lease bawaan.** Kalau Worker mati antara reserve dan commit, `*_held`
 *      bocor dan murid kehilangan satu slot sampai tengah malam. Ditutup dengan tabel
 *      `quota_reservation(expires_at)` + Cron Trigger tiap
 *      `RESERVATION_SWEEP_INTERVAL_MS` (60 s) yang memanggil `sweepExpiredReservations()`.
 *      **Jendela kebocoran = periode cron.** Durable Object memanen otomatis; D1 tidak.
 *
 *  R3. **Concurrency (bab 13) hanya bisa didekati.** Di DO, `inflight` hidup di objek yang
 *      serial. Di D1, "inflight" = jumlah lease terbuka, dan akurasinya sebesar periode
 *      cron (lease yatim masih terhitung sampai dipanen). Jadi `FREE_AI_CONCURRENCY=1`
 *      di jalur ini adalah **pagar longgar**, bukan jaminan.
 *
 *  R4. **Satu titik serialisasi global.** Semua pengguna berbagi satu database. Pada jam
 *      sibuk, galat "overloaded" muncul lebih dulu di sini daripada di mana pun (cf-a11
 *      Risiko #5). Karena itu jalur panas WAJIB menghindari D1 saat cache hit: `R2.head()`
 *      dievaluasi sebelum reserve, dan cache hit tidak menyentuh berkas ini sama sekali.
 *
 *  R5. **Sweep sendiri bisa balapan dengan commit.** `DELETE … WHERE expires_at <= ?`
 *      bisa memanen lease yang detik itu sedang di-commit. Akibatnya commit menemukan
 *      lease hilang → dilaporkan `reservation_expired` dan **tidak menagih**. Itu arah
 *      salah yang disengaja: lebih baik satu permintaan gratis daripada satu murid
 *      ditagih untuk barang yang tidak jelas terkirim.
 *
 * KAPAN HARUS PINDAH KE DURABLE OBJECT: bila owner butuh (a) concurrency limit yang benar,
 * (b) nol jendela kebocoran slot, atau (c) tidak mau satu titik serialisasi global.
 * DO SQLite praktis menuntut **Workers Paid (US$5/bulan)**; biaya DO-nya sendiri hanya
 * ≈US$0,08/bulan pada 5.000 pengguna aktif (cf-a11 §2.2). Jadi ini upgrade BERBAYAR yang
 * murah, bukan penulisan ulang: `quota-core.js` sudah murni, dan method DO tinggal
 * memanggil fungsi yang sama. Laporkan angkanya ke owner, jangan diam-diam mengandaikan.
 *
 * Berkas ini tidak memakai `Date.now()`: `now` selalu parameter (kontrak cf-b3 §8).
 */

import { QUOTA_CONFIG } from './quota-config.js';
import { DENY_SCOPE, chargesFor, dayKeyForQuota, resetAtForQuota } from './quota-core.js';

/** Kolom D1 per bucket. Nama kolom terpusat supaya tidak ada string SQL yang menyebar. */
export const COLUMN = Object.freeze({
  ai: { used: 'ai_used', held: 'ai_held' },
  aiTranslate: { used: 'ai_translate_used', held: 'ai_translate_held' },
  ttsCalls: { used: 'tts_calls_used', held: 'tts_calls_held' },
  ttsChars: { used: 'tts_chars_used', held: 'tts_chars_held' }
});

export const SQL_ENSURE_DAY =
  'INSERT OR IGNORE INTO quota_daily(user_id, day) VALUES (?1, ?2)';

/**
 * RESERVE atomik. Satu pernyataan, satu gerbang per bucket yang terlibat, `RETURNING`
 * sebagai bukti. Nol baris kembali = DENIED. Tidak ada read-then-write di mana pun.
 */
export function buildReserveSql(charges) {
  const sets = [];
  const guards = [];
  const returning = [];
  for (const bucket of Object.keys(charges)) {
    const c = COLUMN[bucket];
    if (!c) return null;
    sets.push(`${c.held} = ${c.held} + :amt_${bucket}`);
    guards.push(`${c.used} + ${c.held} + :amt_${bucket} <= :lim_${bucket}`);
    returning.push(c.used, c.held);
  }
  return (
    'UPDATE quota_daily SET ' + sets.join(', ') + ', touched_at = :now' +
    ' WHERE user_id = :user_id AND day = :day AND ' + guards.join(' AND ') +
    ' RETURNING ' + returning.join(', ')
  );
}

function namedToPositional(sql, params) {
  // D1 mendukung parameter bernomor (?1) tetapi tidak parameter bernama gaya `:x` pada
  // semua jalur; kita jadikan positional supaya bentuk yang dikirim selalu sama.
  const order = [];
  const out = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_m, name) => {
    order.push(params[name]);
    return '?' + order.length;
  });
  return { sql: out, values: order };
}

/**
 * `reserveD1` — FASE 1. Menahan slot lalu mencatat lease.
 * Urutan sengaja: gerbang dulu (satu pernyataan atomik), lease sesudahnya. Kalau lease
 * gagal ditulis, slot langsung dikembalikan di jalur `catch` — dan kalau bahkan itu gagal,
 * `reconcileHeld()` yang membersihkan (R1 di atas).
 */
export async function reserveD1(db, { userId, bucket, amount, limits, now, token, ttlMs }) {
  const day = dayKeyForQuota(now);
  const charges = chargesFor(bucket, amount);
  if (!charges) return { ok: false, error: 'unknown_bucket', scope: null, resetAt: resetAtForQuota(now) };

  const params = { user_id: userId, day, now };
  for (const b of Object.keys(charges)) {
    params['amt_' + b] = charges[b];
    params['lim_' + b] = limits[b];
  }
  const built = namedToPositional(buildReserveSql(charges), params);

  await db.prepare(SQL_ENSURE_DAY).bind(userId, day).run();
  const gate = await db.prepare(built.sql).bind(...built.values).all();
  const rows = (gate && gate.results) || [];
  if (rows.length === 0) {
    // Bucket mana yang penuh ditentukan oleh pembacaan TERPISAH (baca-saja, tidak
    // menentukan izin) semata-mata untuk mengisi `scope` pada amplop 429.
    const scope = await denyScopeFor(db, { userId, day, charges, limits });
    return { ok: false, error: 'quota_exhausted', scope, resetAt: resetAtForQuota(now), quotaCharged: false };
  }

  const ttl = Number.isFinite(ttlMs) ? ttlMs : QUOTA_CONFIG.RESERVATION_TTL_MS;
  try {
    await db
      .prepare(
        'INSERT INTO quota_reservation(id, user_id, day, bucket, charges_json, created_at, expires_at)' +
        ' VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
      )
      .bind(token, userId, day, bucket, JSON.stringify(charges), now, now + ttl)
      .run();
  } catch (e) {
    await releaseHeld(db, { userId, day, charges, now });
    return { ok: false, error: 'store_unavailable', scope: null, resetAt: resetAtForQuota(now), quotaCharged: false };
  }

  return { ok: true, token, day, charges, resetAt: resetAtForQuota(now), quotaCharged: false };
}

async function denyScopeFor(db, { userId, day, charges, limits }) {
  const row = await db.prepare('SELECT * FROM quota_daily WHERE user_id = ?1 AND day = ?2').bind(userId, day).first();
  if (!row) return DENY_SCOPE[Object.keys(charges)[0]] || null;
  for (const b of Object.keys(charges)) {
    const c = COLUMN[b];
    if ((row[c.used] || 0) + (row[c.held] || 0) + charges[b] > limits[b]) return DENY_SCOPE[b];
  }
  return DENY_SCOPE[Object.keys(charges)[0]] || null;
}

function heldDeltaSql(charges, sign) {
  return Object.keys(charges)
    .map((b) => {
      const c = COLUMN[b];
      return sign < 0
        ? `${c.held} = MAX(0, ${c.held} - :amt_${b})`   // MAX(0,…) supaya held tidak pernah negatif
        : `${c.held} = ${c.held} + :amt_${b}`;
    })
    .join(', ');
}

async function releaseHeld(db, { userId, day, charges, now }) {
  const params = { user_id: userId, day, now };
  for (const b of Object.keys(charges)) params['amt_' + b] = charges[b];
  const built = namedToPositional(
    'UPDATE quota_daily SET ' + heldDeltaSql(charges, -1) + ', touched_at = :now WHERE user_id = :user_id AND day = :day',
    params
  );
  await db.prepare(built.sql).bind(...built.values).run();
}

/**
 * `commitD1` — FASE 2a. Menagih HANYA kalau lease-nya masih ada; kalau sudah dipanen,
 * jawabannya `reservation_expired` dan **tidak ada** counter yang naik (R5 di atas).
 * `actual` di-clamp ke yang direservasi.
 */
export async function commitD1(db, { userId, token, now, actual }) {
  const lease = await db.prepare('SELECT * FROM quota_reservation WHERE id = ?1 AND user_id = ?2').bind(token, userId).first();
  if (!lease) return { ok: false, reason: 'reservation_expired', quotaCharged: false };
  const charges = JSON.parse(lease.charges_json);

  const sets = [];
  const params = { user_id: userId, day: lease.day, now };
  for (const b of Object.keys(charges)) {
    const c = COLUMN[b];
    let charge = charges[b];
    if (actual && Number.isFinite(actual[b])) charge = Math.min(charges[b], Math.max(0, Math.floor(actual[b])));
    params['amt_' + b] = charges[b];
    params['chg_' + b] = charge;
    sets.push(`${c.used} = ${c.used} + :chg_${b}`, `${c.held} = MAX(0, ${c.held} - :amt_${b})`);
  }
  const built = namedToPositional(
    'UPDATE quota_daily SET ' + sets.join(', ') + ', committed = committed + 1, touched_at = :now' +
    ' WHERE user_id = :user_id AND day = :day',
    params
  );

  // batch() = satu transaksi implisit: menagih dan menghapus lease tidak boleh terpisah.
  await db.batch([
    db.prepare(built.sql).bind(...built.values),
    db.prepare('DELETE FROM quota_reservation WHERE id = ?1').bind(token)
  ]);
  return { ok: true, reason: null, quotaCharged: true };
}

/**
 * `rollbackD1` — FASE 2b. Provider gagal / timeout / senyap. Counter tidak pernah naik.
 * Dipanggil di jalur `catch`, dan hasilnya yang membuat `quotaCharged:false` benar.
 */
export async function rollbackD1(db, { userId, token, now, reason }) {
  const lease = await db.prepare('SELECT * FROM quota_reservation WHERE id = ?1 AND user_id = ?2').bind(token, userId).first();
  if (!lease) return { ok: false, reason: 'already_reaped', quotaCharged: false };
  const charges = JSON.parse(lease.charges_json);
  const params = { user_id: userId, day: lease.day, now };
  for (const b of Object.keys(charges)) params['amt_' + b] = charges[b];
  const built = namedToPositional(
    'UPDATE quota_daily SET ' + heldDeltaSql(charges, -1) + ', rolled_back = rolled_back + 1, touched_at = :now' +
    ' WHERE user_id = :user_id AND day = :day',
    params
  );
  await db.batch([
    db.prepare(built.sql).bind(...built.values),
    db.prepare('DELETE FROM quota_reservation WHERE id = ?1').bind(token)
  ]);
  return { ok: true, reason: reason || 'provider_error', quotaCharged: false };
}

/**
 * SWEEP — dipanggil Cron Trigger tiap `RESERVATION_SWEEP_INTERVAL_MS`.
 * Ini pengganti lease Durable Object yang ditulis dengan tangan (cf-b3 §1.4). Tanpa ini,
 * setiap Worker yang mati di tengah jalan mencuri satu slot murid sampai tengah malam.
 * WAJIB terpasang di HARI YANG SAMA dengan jalur D1 — bukan "nanti".
 */
export async function sweepExpiredReservations(db, now, limit) {
  const cap = Number.isFinite(limit) ? limit : 500;
  const expired = await db
    .prepare('SELECT * FROM quota_reservation WHERE expires_at <= ?1 ORDER BY expires_at LIMIT ?2')
    .bind(now, cap)
    .all();
  const rows = (expired && expired.results) || [];
  let reaped = 0;
  for (const lease of rows) {
    const charges = JSON.parse(lease.charges_json);
    const params = { user_id: lease.user_id, day: lease.day, now };
    for (const b of Object.keys(charges)) params['amt_' + b] = charges[b];
    const built = namedToPositional(
      'UPDATE quota_daily SET ' + heldDeltaSql(charges, -1) + ', reaped = reaped + 1, touched_at = :now' +
      ' WHERE user_id = :user_id AND day = :day',
      params
    );
    await db.batch([
      db.prepare(built.sql).bind(...built.values),
      db.prepare('DELETE FROM quota_reservation WHERE id = ?1').bind(lease.id)
    ]);
    reaped += 1;
  }
  return { reaped, scanned: rows.length, hasMore: rows.length >= cap };
}

/**
 * REKONSILIASI — jaring pengaman untuk R1: `held` diturunkan ULANG dari tabel lease.
 * Menutup slot yatim (held naik, lease tidak pernah tercatat). Dipanggil cron dengan
 * frekuensi lebih rendah dari sweep (mis. tiap 10 menit) karena ia memindai per hari.
 */
export async function reconcileHeld(db, now) {
  const day = dayKeyForQuota(now);
  const leases = await db.prepare('SELECT * FROM quota_reservation WHERE day = ?1').bind(day).all();
  const perUser = new Map();
  for (const lease of (leases && leases.results) || []) {
    const charges = JSON.parse(lease.charges_json);
    const acc = perUser.get(lease.user_id) || { ai: 0, aiTranslate: 0, ttsCalls: 0, ttsChars: 0 };
    for (const b of Object.keys(charges)) acc[b] += charges[b];
    perUser.set(lease.user_id, acc);
  }
  const rows = await db.prepare('SELECT user_id FROM quota_daily WHERE day = ?1').bind(day).all();
  let fixed = 0;
  for (const row of (rows && rows.results) || []) {
    const acc = perUser.get(row.user_id) || { ai: 0, aiTranslate: 0, ttsCalls: 0, ttsChars: 0 };
    await db
      .prepare(
        'UPDATE quota_daily SET ai_held = ?1, ai_translate_held = ?2, tts_calls_held = ?3, tts_chars_held = ?4,' +
        ' touched_at = ?5 WHERE user_id = ?6 AND day = ?7'
      )
      .bind(acc.ai, acc.aiTranslate, acc.ttsCalls, acc.ttsChars, now, row.user_id, day)
      .run();
    fixed += 1;
  }
  return { day, users: fixed };
}

/**
 * Baca-saja untuk `GET /api/quota`. Tidak pernah menulis, tidak pernah menagih.
 * Menghasilkan bentuk state yang dipahami `snapshot()` di quota-core.js.
 */
export async function loadStateD1(db, { userId, now, limits }) {
  const day = dayKeyForQuota(now);
  const row = await db.prepare('SELECT * FROM quota_daily WHERE user_id = ?1 AND day = ?2').bind(userId, day).first();
  const leases = await db.prepare('SELECT * FROM quota_reservation WHERE user_id = ?1 AND day = ?2').bind(userId, day).all();
  const counters = { ai: 0, aiTranslate: 0, ttsCalls: 0, ttsChars: 0 };
  if (row) for (const b of Object.keys(COLUMN)) counters[b] = row[COLUMN[b].used] || 0;
  return {
    schema: 'fiezel-quota-state-v1',
    day,
    limits: Object.assign({}, limits),
    counters,
    reservations: ((leases && leases.results) || []).map((l) => ({
      token: l.id,
      bucket: l.bucket,
      charges: JSON.parse(l.charges_json),
      createdAt: l.created_at,
      expiresAt: l.expires_at
    })),
    seq: row ? row.seq || 0 : 0,
    denied: row ? row.denied || 0 : 0,
    committed: row ? row.committed || 0 : 0,
    rolledBack: row ? row.rolled_back || 0 : 0,
    reaped: row ? row.reaped || 0 : 0
  };
}

export default {
  COLUMN,
  buildReserveSql,
  commitD1,
  loadStateD1,
  reconcileHeld,
  reserveD1,
  rollbackD1,
  sweepExpiredReservations
};
