-- ============================================================================
-- FIEZEL — migrasi lane telemetri belajar (D1: fiezel-stats, binding STATS_DB)
-- Endpoint: POST /api/learning/events (workers/api/learning/route-learning.js)
-- Kontrak: BRAIN-TELEMETRY-SCHEMA.md + BRAIN-DATA-PRIVACY.md (branch
-- brain-learning-infra-v1, PR #226). Migrasi ini SENGAJA berdiri sendiri:
-- ia TIDAK menyentuh tabel analytics eksisting dan TIDAK bergantung pada
-- 0006_analytics_batch_dedup.sql (yang saat migrasi ini ditulis masih hidup
-- di PR #226, belum di main) — nama tabelnya diprefiks `learning_` supaya
-- kedua migrasi bisa hidup berdampingan tanpa tabrakan apa pun.
--
-- ############################################################################
-- #  KONTRAK PRIVASI — BACA SEBELUM MENGUBAH APA PUN                          #
-- #                                                                          #
-- #  1. TIDAK ADA BARIS EVENT. Server hanya menaikkan counter agregat        #
-- #     (learning_daily). Payload event tidak pernah disimpan; lessonId/     #
-- #     itemId divalidasi bentuknya lalu DIBUANG (bukan dimensi agregat).    #
-- #  2. `batch_id` / `event_id` adalah UUID ACAK sekali-pakai dari klien —   #
-- #     kunci idempotensi, BUKAN identitas. Dua batch dari perangkat yang    #
-- #     sama tidak bisa dihubungkan lewat kolom ini.                         #
-- #  3. TTL PENDEK WAJIB pada tabel dedup dan tabel rem: baris dedup hanya   #
-- #     hidup selama jendela retry klien (7 hari, BRAIN-TELEMETRY-SCHEMA §5),#
-- #     baris rem hanya selama jendela laju (purge opportunistik di jalur    #
-- #     tulis route-learning.js — lihat PURGE_SQL di sana).                  #
-- #  4. `ip_hmac` di learning_rate mengikuti pola anon_issue                 #
-- #     (0001_identity.sql): HMAC berkunci rahasia + INDEKS HARI ikut        #
-- #     ditandatangani, jadi hash hari ini != hash besok untuk IP yang sama —#
-- #     tabel ini tidak bisa dipakai melacak orang antar hari.               #
-- #  5. DILARANG menambah kolom identitas/penghubung apa pun (user_id, sub,  #
-- #     install_id, ...): dijaga `d1-schema-contract-test.js`                #
-- #     (ddl_analytics_tanpa_kolom_penghubung).                              #
-- #  6. Seperti semua tabel fiezel-stats: DILARANG DI-JOIN dengan tabel      #
-- #     kuota/identitas di fiezel-core.                                      #
-- ############################################################################
-- ============================================================================

-- Dedup level-BATCH: replay satu amplop utuh (retry setelah timeout ambigu)
-- berhenti di sini tanpa menyentuh satu counter pun.
CREATE TABLE IF NOT EXISTS learning_batch_dedup (
  batch_id TEXT NOT NULL,           -- UUID acak dari klien; bukan identitas
  day      TEXT NOT NULL,           -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (batch_id)
) WITHOUT ROWID;

-- DIPAKAI oleh purge TTL opportunistik di jalur tulis route-learning.js (SQL.purgeBatchDedup):
-- 'DELETE FROM learning_batch_dedup WHERE day < ?1'
-- Tanpa indeks ini purge memindai seluruh tabel pada setiap batch masuk.
CREATE INDEX IF NOT EXISTS idx_learning_batch_dedup_day ON learning_batch_dedup(day);

-- Dedup level-EVENT (kontrak BRAIN-TELEMETRY-SCHEMA §5.2): hanya event_id yang
-- benar-benar BARU yang boleh menaikkan agregat. Ini yang membuat replay aman
-- bahkan ketika klien lama mengirim tanpa batchId, atau ketika dua batch
-- berbeda mengulang event yang sama.
CREATE TABLE IF NOT EXISTS learning_event_dedup (
  event_id TEXT NOT NULL,           -- UUID acak dari klien; bukan identitas
  day      TEXT NOT NULL,           -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (event_id)
) WITHOUT ROWID;

-- DIPAKAI oleh purge TTL opportunistik di jalur tulis route-learning.js (SQL.purgeEventDedup):
-- 'DELETE FROM learning_event_dedup WHERE day < ?1'
-- Tanpa indeks ini purge memindai seluruh tabel pada setiap batch masuk.
CREATE INDEX IF NOT EXISTS idx_learning_event_dedup_day ON learning_event_dedup(day);

-- SATU-SATUNYA tempat data telemetri belajar hidup di server: counter agregat
-- per (hari-terima x tipe-event x dimensi x nilai). Semua nilai `val` berasal
-- dari enum/bucket TERTUTUP yang divalidasi route-learning.js; tidak ada teks
-- bebas, tidak ada ID konten, tidak ada individu.
CREATE TABLE IF NOT EXISTS learning_daily (
  day        TEXT    NOT NULL,      -- 'YYYY-MM-DD' hari DITERIMA server
  event_type TEXT    NOT NULL,      -- 'answer_outcome' | 'session_summary'
  dim        TEXT    NOT NULL,      -- nama dimensi (allowlist AGG_FIELDS)
  val        TEXT    NOT NULL,      -- nilai enum/bucket tertutup
  n          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event_type, dim, val)
) WITHOUT ROWID;

-- Rem laju anon per jam, selaras pola anon_issue (0001_identity.sql):
-- kunci = jendela jam + HMAC(IP) berscope-hari, nilai = hitungan batch.
-- Penolakan = nol tulis; baris berumur satu jendela lalu dipurge.
CREATE TABLE IF NOT EXISTS learning_rate (
  win     TEXT    NOT NULL,         -- 'YYYY-MM-DDTHH' jendela jam UTC
  ip_hmac TEXT    NOT NULL,         -- HMAC(rahasia, indeks-hari|IP), 128 bit
  batches INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (win, ip_hmac)
) WITHOUT ROWID;
