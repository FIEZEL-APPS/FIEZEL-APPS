/**
 * FIEZEL E4 — daftar tabel analytics yang diizinkan ada.
 *
 * Berkas ini sengaja dipisah supaya gerbang bisa membacanya sebagai satu
 * sumber kebenaran: kalau ada tabel baru di migrasi tapi tidak terdaftar di
 * sini (atau sebaliknya), `tests/analytics-privacy-test.js` merah.
 *
 * Semua tabel di bawah adalah AGREGAT, kecuali `dau_dedup` yang berisi token
 * harian dan dihapus setiap malam. NOL tabel per-orang.
 */
export const ANALYTICS_TABLES = Object.freeze([
  'metrics_daily',
  'usage_daily',
  'retention_daily',
  'dau_dedup',
  'pepper_state'
]);

/** Tabel yang isinya boleh disimpan permanen (tidak ada individu di dalamnya). */
export const PERMANENT_TABLES = Object.freeze(['metrics_daily', 'usage_daily', 'retention_daily']);

/** Tabel yang WAJIB dihapus berkala oleh rollup harian. */
export const EPHEMERAL_TABLES = Object.freeze(['dau_dedup', 'batch_dedup']);

/**
 * Tabel dedup idempotensi (migrasi 0003, DI LUAR ANALYTICS_TABLES karena
 * daftar itu memotret migrasi 0002 dan dipindai gerbang privasi apa adanya).
 * `batch_dedup` berisi UUID acak per-batch — bukan identitas — dan barisnya
 * dihapus rollup setelah jendela retry 48 jam (RETENTION_DAYS.BATCH_DEDUP).
 */
export const DEDUP_TABLES = Object.freeze(['batch_dedup']);

export default { ANALYTICS_TABLES, PERMANENT_TABLES, EPHEMERAL_TABLES, DEDUP_TABLES };
