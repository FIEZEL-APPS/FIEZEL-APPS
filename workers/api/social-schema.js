/**
 * workers/api/social-schema.js — DDL runtime lapisan sosial + penerap idempoten.
 *
 * KENAPA BERKAS INI ADA (kejujuran operasional): token CI yang men-deploy Worker
 * TIDAK bisa menjalankan `wrangler d1 create` maupun `wrangler d1 execute
 * --remote`. Jadi migrasi `migrations/0006_social.sql` tidak bisa dijamin sudah
 * terpasang saat kode ini tiba di produksi. Dua pilihannya: (a) fitur sosial
 * melempar `D1_UNKNOWN_TABLE` sampai owner sempat menjalankan migrasi, atau
 * (b) runtime menerapkan DDL YANG SAMA secara idempoten (semua
 * `CREATE TABLE IF NOT EXISTS`) pada permintaan sosial pertama per isolate.
 * Dipilih (b), dengan dua pagar supaya ini tidak menjadi migrasi bayangan:
 *   1. `migrations/0006_social.sql` TETAP sumber resmi skema, dan gerbang
 *      `social-schema-contract-test.js` MEMERAH kalau daftar `SOCIAL_DDL` di
 *      bawah tidak setara pernyataan-per-pernyataan dengan berkas migrasi itu.
 *   2. Penerapan di-cache per handle DB (WeakMap): biaya nyatanya satu rangkaian
 *      `CREATE TABLE IF NOT EXISTS` per isolate dingin, bukan per permintaan;
 *      di D1 pernyataan itu no-op murah bila tabel sudah ada.
 *
 * ATURAN PRIVASI: seluruh larangan di kepala `0006_social.sql` (warisan
 * `0001_identity.sql`) berlaku untuk DDL di bawah — tanpa nama asli/email/IP/UA,
 * tanpa teks bebas, tanpa kolom penghubung analytics. Mengubah DDL di sini TANPA
 * mengubah berkas migrasi (atau sebaliknya) = gerbang merah.
 */

/** Nama tabel sosial. Dipakai gerbang untuk mengunci cakupan skema. */
export const SOCIAL_TABLES = Object.freeze([
  'social_profile', 'social_handle', 'social_invite', 'social_friend',
  'social_counter', 'rank_week', 'social_cohort', 'milestone_feed',
  'cheer_feed', 'rank_jti'
]);

/**
 * DDL — WAJIB setara (ternormalisasi spasi) dengan `migrations/0006_social.sql`.
 * Komentar alasan hidup di berkas migrasi; di sini hanya pernyataannya.
 */
export const SOCIAL_DDL = Object.freeze([
  'CREATE TABLE IF NOT EXISTS social_profile (' +
    ' sub TEXT PRIMARY KEY,' +
    ' handle TEXT NOT NULL,' +
    ' display_name TEXT,' +
    ' avatar_id INTEGER NOT NULL DEFAULT 0,' +
    ' flags INTEGER NOT NULL DEFAULT 1,' +
    ' band TEXT,' +
    ' streak_days INTEGER NOT NULL DEFAULT 0,' +
    ' last_meaningful_day TEXT,' +
    ' created_day TEXT NOT NULL' +
    ' )',
  'CREATE TABLE IF NOT EXISTS social_handle (' +
    ' handle TEXT PRIMARY KEY,' +
    ' sub TEXT NOT NULL' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS social_invite (' +
    ' code TEXT PRIMARY KEY,' +
    ' sub TEXT NOT NULL,' +
    ' created_day TEXT NOT NULL,' +
    ' expires_day TEXT NOT NULL,' +
    ' used_by TEXT,' +
    ' used_day TEXT' +
    ' )',
  'CREATE TABLE IF NOT EXISTS social_friend (' +
    ' a TEXT NOT NULL,' +
    ' b TEXT NOT NULL,' +
    ' since_day TEXT NOT NULL,' +
    ' PRIMARY KEY (a, b)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS social_counter (' +
    ' sub TEXT NOT NULL,' +
    ' period TEXT NOT NULL,' +
    ' kind TEXT NOT NULL,' +
    ' cnt INTEGER NOT NULL DEFAULT 0,' +
    ' PRIMARY KEY (sub, period, kind)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS rank_week (' +
    ' sub TEXT NOT NULL,' +
    ' week TEXT NOT NULL,' +
    ' pb INTEGER NOT NULL DEFAULT 0,' +
    ' hidden INTEGER NOT NULL DEFAULT 0,' +
    ' cohort_id TEXT,' +
    ' PRIMARY KEY (sub, week)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS social_cohort (' +
    ' id TEXT PRIMARY KEY,' +
    ' week TEXT NOT NULL,' +
    ' cnt INTEGER NOT NULL DEFAULT 0' +
    ' )',
  'CREATE TABLE IF NOT EXISTS milestone_feed (' +
    ' sub TEXT NOT NULL,' +
    ' day TEXT NOT NULL,' +
    ' kind TEXT NOT NULL,' +
    ' PRIMARY KEY (sub, day, kind)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS cheer_feed (' +
    ' sub_to TEXT NOT NULL,' +
    ' day TEXT NOT NULL,' +
    ' sub_from TEXT NOT NULL,' +
    ' sticker TEXT NOT NULL,' +
    ' cnt INTEGER NOT NULL DEFAULT 1,' +
    ' PRIMARY KEY (sub_to, day, sub_from, sticker)' +
    ' ) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS rank_jti (' +
    ' sub TEXT NOT NULL,' +
    ' jti TEXT NOT NULL,' +
    ' day TEXT NOT NULL,' +
    ' PRIMARY KEY (sub, jti)' +
    ' ) WITHOUT ROWID'
]);

/** Cache penerapan per handle DB. WeakMap: entri hilang bersama handle-nya. */
const ENSURED = new WeakMap();

/**
 * Terapkan DDL sosial secara idempoten. FAIL-CLOSED bagi pemanggil: tanpa DB
 * fungsi ini melempar, dan rute sosial menjawab 503 — bukan diam-diam jalan
 * tanpa penyimpanan. Kegagalan TIDAK di-cache (retry pada permintaan berikut).
 */
export function ensureSocialSchema(db) {
  if (!db || typeof db.prepare !== 'function') {
    return Promise.reject(new Error('social_store_missing'));
  }
  let pending = ENSURED.get(db);
  if (!pending) {
    pending = (async () => {
      for (const statement of SOCIAL_DDL) {
        /* eslint-disable no-await-in-loop */
        await db.prepare(statement).run();
      }
      return true;
    })();
    ENSURED.set(db, pending);
    pending.catch(() => ENSURED.delete(db));
  }
  return pending;
}
