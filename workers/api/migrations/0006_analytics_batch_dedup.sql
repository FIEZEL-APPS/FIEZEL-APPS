-- ============================================================================
-- FIEZEL — migrasi dedup batch analytics (D1: fiezel-analytics / fiezel-stats)
-- MENUTUP temuan council: retry batch menduplikasi counter dan retention_ping
-- bisa di-replay (model-council-gpt_5_6_sol.md §4.3, model-council-
-- claude_opus_5_0.md §1.3). Aggregasi bersifat increment; tanpa kunci dedup,
-- satu batch yang dikirim ulang setelah timeout ambigu menaikkan SEMUA
-- penghitungnya dua kali.
--
-- ############################################################################
-- #  KONTRAK PRIVASI TABEL INI — BACA SEBELUM MENGUBAH APA PUN                #
-- #                                                                          #
-- #  1. `batch_id` adalah UUID ACAK yang dibuat klien SEKALI PER BATCH.       #
-- #     Ia BUKAN turunan identitas (installId, akun) dan BUKAN turunan        #
-- #     waktu. Dua batch dari perangkat yang sama TIDAK bisa dihubungkan      #
-- #     lewat kolom ini — itu fitur, bukan kelalaian.                         #
-- #                                                                          #
-- #  2. TTL PENDEK WAJIB. Baris hanya hidup selama jendela retry klien        #
-- #     (48 jam, lihat RETENTION_DAYS.BATCH_DEDUP di rollup.js). Rollup       #
-- #     harian menghapus baris yang lebih tua. Kalau purge berhenti jalan,    #
-- #     tabel ini tetap TIDAK menjadi arsip identitas (id-nya acak), tapi     #
-- #     ia melanggar janji "tidak menyimpan lebih lama dari perlu".           #
-- #                                                                          #
-- #  3. DILARANG menambah kolom apa pun ke tabel ini. Tidak ada isi batch,    #
-- #     tidak ada token, tidak ada IP, tidak ada ukuran payload. Dua kolom    #
-- #     ini cukup untuk menjawab satu-satunya pertanyaan yang boleh           #
-- #     dijawab: "apakah batch dengan id ini sudah pernah diterima?"          #
-- #     Gerbang `analytics-stable-id-guard-test.js` memindai DDL ini.         #
-- #                                                                          #
-- #  4. Seperti semua tabel analytics: DILARANG DI-JOIN dengan tabel kuota.   #
-- ############################################################################
-- ============================================================================

-- Kunci utama = batch_id sendiri: dedup berlaku lintas hari di seluruh jendela
-- retry (batch yang dikirim ulang 47 jam kemudian tetap tertangkap), bukan
-- hanya di dalam satu hari kalender.
CREATE TABLE IF NOT EXISTS batch_dedup (
  batch_id TEXT NOT NULL,           -- UUID acak dari klien; bukan identitas
  day      TEXT NOT NULL,           -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (batch_id)
) WITHOUT ROWID;

-- Indeks hanya untuk purge harian. Sengaja TIDAK ada indeks lain: satu-satunya
-- pola baca yang boleh nyaman adalah "hapus yang kadaluarsa".
-- DIPAKAI oleh purge harian rollup (analytics-store-d1.js purgeBatchDedupOlderThan):
--   'DELETE FROM batch_dedup WHERE day < ?1'
CREATE INDEX IF NOT EXISTS idx_batch_dedup_day ON batch_dedup(day);
