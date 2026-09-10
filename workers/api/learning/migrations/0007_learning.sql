-- ============================================================================
-- FIEZEL — migrasi lane telemetri belajar (D1: fiezel-learning, binding
-- LEARNING_DB). Otoritas: BRAIN-TELEMETRY-SCHEMA.md (kontrak desain v1) +
-- BRAIN-DATA-PRIVACY.md §7.
--
-- DATABASE TERPISAH, BUKAN TABEL BARU DI DATABASE LAMA. fiezel-core memegang
-- identitas, fiezel-stats memegang kehadiran perangkat (analytics), dan
-- fiezel-learning memegang HASIL KEBIJAKAN Brain. D1 tidak bisa JOIN lintas
-- database, jadi pemisahan ini membuat penggabungan domain "tidak bisa
-- ditulis", bukan sekadar "dilarang" — pola yang sama dengan 0002_analytics.
--
-- ############################################################################
-- #  KONTRAK PRIVASI TABEL-TABEL INI — BACA SEBELUM MENGUBAH APA PUN          #
-- #                                                                          #
-- #  1. learning_daily HANYA berisi penghitung (day, event, dim, n).          #
-- #     `dim` adalah string `dimensi:nilai` dari ENUM TERTUTUP di             #
-- #     learning-core.js — bukan teks bebas, bukan ID lesson, bukan skor      #
-- #     kontinu. TIDAK ADA baris per-event mentah di database ini; event      #
-- #     mentah mati di memori Worker setelah diagregasi.                      #
-- #                                                                          #
-- #  2. learning_dedup berisi `event_id`/`batch_id` yang keduanya UUID v4     #
-- #     ACAK sekali pakai dari klien (BRAIN-TELEMETRY-SCHEMA.md §5.1-§5.2).   #
-- #     Keduanya BUKAN turunan identitas dan BUKAN turunan waktu; dua batch   #
-- #     dari perangkat yang sama tidak bisa dihubungkan lewat kolom ini.      #
-- #                                                                          #
-- #  3. TTL PENDEK WAJIB untuk learning_dedup: baris hanya hidup selama       #
-- #     jendela retry klien (7 hari, §5.3 — lebih panjang dari 48 jam         #
-- #     analytics karena klien belajar bisa offline berhari-hari). Purge      #
-- #     memakai `purgeLearningDedup` di learning-store-d1.js.                 #
-- #                                                                          #
-- #  4. DILARANG menambah kolom apa pun: tidak ada user_id, install_id,       #
-- #     token, IP, ukuran payload, timestamp presisi. Satu-satunya waktu      #
-- #     adalah `day` (YYYY-MM-DD). Gerbang d1-schema-contract-test.js         #
-- #     memindai DDL ini terhadap daftar kolom penghubung terlarang.          #
-- #                                                                          #
-- #  5. DILARANG DI-JOIN dengan tabel identitas/kuota/analytics — dan memang  #
-- #     tidak bisa: mereka hidup di database lain.                            #
-- ############################################################################
-- ============================================================================

-- Penghitung harian: satu baris per (hari, tipe event, dimensi). Kunci utama
-- gabungan = idempotensi alami untuk upsert `n = n + excluded.n`; WITHOUT
-- ROWID karena seluruh baris memang hidup di dalam kuncinya (pola
-- metrics_daily di 0002_analytics).
CREATE TABLE IF NOT EXISTS learning_daily (
  day   TEXT    NOT NULL,           -- 'YYYY-MM-DD' dari amplop batch (satu-satunya waktu)
  event TEXT    NOT NULL,           -- 'answer_outcome' | 'session_summary' (enum tertutup)
  dim   TEXT    NOT NULL,           -- 'dimensi:nilai' dari enum tertutup, mis. 'level:A2'
  n     INTEGER NOT NULL DEFAULT 0, -- penghitung; hanya pernah naik lewat upsert
  PRIMARY KEY (day, event, dim)
) WITHOUT ROWID;

-- Dedup idempotency per-EVENT (§5.1): kunci utama = event_id sendiri, sehingga
-- replay tertangkap lintas hari di seluruh jendela retry — bukan hanya di satu
-- hari kalender. batch_id disimpan untuk forensik "batch mana yang membawa
-- event ini pertama kali" selama jendela retry, lalu ikut terpurge.
CREATE TABLE IF NOT EXISTS learning_dedup (
  event_id TEXT NOT NULL,           -- UUID v4 acak dari klien; kunci dedup, bukan identitas
  batch_id TEXT NOT NULL,           -- UUID v4 acak batch pembawa pertama; bukan identitas
  day      TEXT NOT NULL,           -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (event_id)
) WITHOUT ROWID;

-- Indeks hanya untuk purge TTL. Sengaja TIDAK ada indeks lain: satu-satunya
-- pola baca yang boleh nyaman di tabel dedup adalah "hapus yang kadaluarsa".
-- DIPAKAI oleh purge dedup lane learning (learning-store-d1.js purgeLearningDedup):
--   'DELETE FROM learning_dedup WHERE day < ?1'
CREATE INDEX IF NOT EXISTS idx_learning_dedup_day ON learning_dedup(day);
