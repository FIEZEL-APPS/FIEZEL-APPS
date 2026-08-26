// FIEZEL — SQL dashboard owner. HANYA AGREGAT.
//
// KONTRAK PRIVASI (EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL", otoritas):
//   "Tabel server HANYA agregat ... Nol tabel per-user untuk analytics." — tiga tabel agregat:
//   metrik harian, pemakaian harian per-bucket, dan cohort retensi harian.
// Konsekuensinya untuk berkas ini, dan ini yang diassert owner-dashboard-test.js:
//   1. TIDAK ADA kolom identitas per-orang yang disebut di sini: tidak ada penunjuk perorangan,
//      tidak ada penunjuk instalasi, tidak ada surel, tidak ada label pribadi, tidak ada
//      pengenal acak milik akun penyedia.
//   2. TIDAK ADA tabel per-orang yang dibaca (tabel harian per-perangkat dan tabel identitas
//      dilarang muncul di berkas ini). DAU/WAU/MAU dibaca dari baris agregat harian yang sudah
//      dihitung job rollup — dashboard tidak pernah menghitung ulang dari baris per-perangkat.
//   3. TIDAK ADA pernyataan tulis. Semua di sini SELECT. Worker owner adalah pembaca.
//      D1 belum punya binding "read-only" sungguhan, jadi read-only ditegakkan di lapisan kode +
//      gerbang test — itu dinyatakan apa adanya di README, bukan disembunyikan.
//
// Semua rentang tanggal masuk sebagai parameter terikat (?1, ?2). Tidak ada string SQL yang
// disusun dari masukan permintaan.

'use strict';

// Kolom agregat harian yang dipakai seluruh panel. Satu baris = satu hari, nol perorangan.
const DAILY_COLUMNS = [
  'day', 'visitors', 'new_users', 'registered_total', 'dau', 'wau', 'mau', 'returning_users',
  'sessions', 'lessons_started', 'lessons_completed', 'answers',
  'ai_calls', 'ai_users', 'ai_tokens_out', 'ai_err_429', 'ai_err_timeout', 'ai_err_5xx',
  'tts_calls', 'tts_users', 'tts_chars_rendered', 'tts_cache_hits', 'tts_cache_misses',
  'tts_failures', 'quota_hit_users', 'breaker_trips', 'worker_requests',
  'r2_objects', 'r2_bytes', 'backend_errors', 'offline_late_events', 'collection_ok'
].join(', ');

// Kolom yang boleh dijumlahkan lintas hari (aliran), berbeda dari kolom stok (dau/wau/mau/registered_total).
const FLOW_COLUMNS = [
  'visitors', 'new_users', 'sessions', 'lessons_started', 'lessons_completed', 'answers',
  'ai_calls', 'ai_tokens_out', 'ai_err_429', 'ai_err_timeout', 'ai_err_5xx',
  'tts_calls', 'tts_chars_rendered', 'tts_cache_hits', 'tts_cache_misses', 'tts_failures',
  'quota_hit_users', 'breaker_trips', 'worker_requests', 'backend_errors', 'offline_late_events'
];

const SUM_LIST = FLOW_COLUMNS.map((c) => `COALESCE(SUM(${c}), 0) AS ${c}`).join(', ');

const QUERIES = {
  // Kartu "hari terakhir yang sudah dirollup". Satu baris agregat.
  LATEST_DAY: `SELECT ${DAILY_COLUMNS} FROM metrics_daily ORDER BY day DESC LIMIT 1`,

  // ACTIVE USERS: DAU/WAU/MAU dibaca dari baris agregat harian (bab 32 #22).
  // WAU/MAU sudah dibekukan job rollup; dashboard tidak pernah memindai baris per-perangkat.
  ACTIVE_AGGREGATE: `SELECT day, dau, wau, mau, returning_users, sessions, collection_ok
                       FROM metrics_daily
                      WHERE day BETWEEN ?1 AND ?2
                      ORDER BY day ASC`,

  // Puncak DAU/WAU/MAU dalam rentang — tetap dari agregat, bukan hitung-ulang distinct.
  ACTIVE_PEAK: `SELECT MAX(dau) AS dau_peak, MAX(wau) AS wau_peak, MAX(mau) AS mau_peak,
                       AVG(dau) AS dau_avg
                  FROM metrics_daily WHERE day BETWEEN ?1 AND ?2`,

  // USER GROWTH + LEARNING ACTIVITY + AI + TTS + INFRA + QUOTA: satu baris total per rentang.
  PERIOD_TOTALS: `SELECT COUNT(*) AS days_counted, MIN(day) AS day_from, MAX(day) AS day_to,
                         ${SUM_LIST},
                         SUM(CASE WHEN collection_ok = 0 THEN 1 ELSE 0 END) AS days_broken
                    FROM metrics_daily WHERE day BETWEEN ?1 AND ?2`,

  // Stok terakhir (kumulatif) untuk panel USER GROWTH.
  GROWTH_STOCK: `SELECT day, registered_total, dau, mau
                   FROM metrics_daily WHERE day <= ?2 ORDER BY day DESC LIMIT 1`,

  // Seri untuk sparkline. collection_ok ikut supaya hari rusak digambar PUTUS, bukan diinterpolasi.
  SERIES: `SELECT day, dau, wau, mau, new_users, answers, ai_calls, tts_calls, collection_ok
             FROM metrics_daily WHERE day BETWEEN ?1 AND ?2 ORDER BY day ASC`,

  // RETENTION: tabel cohort agregat. cohort_size WAJIB ikut supaya n= bisa dicetak.
  RETENTION: `SELECT cohort_day, day_offset, cohort_size, retained
                FROM retention_cohort
               WHERE cohort_day BETWEEN ?1 AND ?2 AND day_offset IN (1, 7, 30)
               ORDER BY cohort_day DESC, day_offset ASC`,

  // Rata-rata retensi berbobot cohort dalam rentang (tetap agregat).
  RETENTION_ROLLUP: `SELECT day_offset,
                            COALESCE(SUM(cohort_size), 0) AS cohort_total,
                            COALESCE(SUM(retained), 0) AS retained_total
                       FROM retention_cohort
                      WHERE cohort_day BETWEEN ?1 AND ?2 AND day_offset IN (1, 7, 30)
                      GROUP BY day_offset ORDER BY day_offset ASC`,

  // COST ESTIMATION: tarif yang DIPAKAI hari itu ikut tersimpan → angka lama tetap bisa diaudit.
  COST_PERIOD: `SELECT COUNT(*) AS days_counted,
                       COALESCE(SUM(tts_chars_rendered), 0) AS tts_chars_rendered,
                       COALESCE(SUM(ai_tokens_in), 0) AS ai_tokens_in,
                       COALESCE(SUM(ai_tokens_out), 0) AS ai_tokens_out,
                       COALESCE(SUM(infra_usd), 0) AS infra_usd,
                       COALESCE(SUM(tts_usd), 0) AS tts_usd,
                       COALESCE(SUM(llm_usd), 0) AS llm_usd,
                       COALESCE(SUM(total_usd), 0) AS total_usd,
                       MAX(tokens_are_estimated) AS tokens_are_estimated
                  FROM cost_daily WHERE day BETWEEN ?1 AND ?2`,

  // Asumsi tarif yang sedang berlaku — dicetak DI KARTU, bukan di tooltip.
  COST_RATES: `SELECT day, tts_provider, tts_usd_per_1m_chars, llm_model,
                      llm_usd_per_1m_in, llm_usd_per_1m_out, dau_at_calc, tokens_are_estimated
                 FROM cost_daily WHERE day <= ?2 ORDER BY day DESC LIMIT 1`,

  // DATA QUALITY: panel yang mencegah owner menipu diri sendiri.
  COLLECTION_START: `SELECT MIN(day) AS day_first_collected, COUNT(*) AS days_total
                       FROM metrics_daily`,
};

// Penjaga di dalam berkas: setiap SQL di sini wajib SELECT-saja.
const WRITE_WORDS = /\b(insert|update|delete|drop|alter|create|replace|attach|pragma)\b/i;
for (const [key, sql] of Object.entries(QUERIES)) {
  if (WRITE_WORDS.test(sql)) throw new Error('SQL owner harus baca-saja: ' + key);
}

export { QUERIES, DAILY_COLUMNS, FLOW_COLUMNS };
