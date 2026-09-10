-- ============================================================================
-- FIEZEL — migrasi lane BUKTI BELAJAR Braincore (D1: fiezel-evidence, binding
-- EVIDENCE_DB). Otoritas: reports/BRAINCORE_LEARNER_EVIDENCE_PIPELINE.md +
-- BRAIN-DATA-PRIVACY.md.
--
-- DATABASE TERPISAH, BUKAN TABEL BARU DI DATABASE LAMA. fiezel-core memegang
-- identitas, fiezel-stats memegang kehadiran perangkat, fiezel-learning
-- memegang hasil satu jawaban, dan fiezel-evidence memegang KEADAAN BELAJAR
-- terbucket. D1 tidak bisa JOIN lintas database, jadi pemisahan ini membuat
-- penggabungan domain "tidak bisa ditulis", bukan sekadar "dilarang" — pola
-- yang sama dengan 0002_analytics.sql dan 0007_learning.sql.
--
-- ############################################################################
-- #  KONTRAK PRIVASI TABEL-TABEL INI — BACA SEBELUM MENGUBAH APA PUN          #
-- #                                                                          #
-- #  1. evidence_daily HANYA berisi penghitung (day, event, dim, n). `dim`    #
-- #     adalah string `dimensi:nilai` dari ENUM TERTUTUP di evidence-core.js  #
-- #     — bukan teks bebas, bukan nama murid, bukan skor kontinu. TIDAK ADA   #
-- #     kolom cohort di tabel ini, dan itu disengaja: begitu cohort duduk     #
-- #     bersebelahan dengan dimensi belajar, ia berhenti menjadi penghitung   #
-- #     dan menjadi profil.                                                    #
-- #                                                                          #
-- #  2. evidence_dedup berisi `event_id`/`batch_id` yang keduanya UUID v4     #
-- #     ACAK sekali pakai dari klien. Bukan turunan identitas, bukan turunan  #
-- #     waktu.                                                                #
-- #                                                                          #
-- #  3. evidence_learner_day adalah SATU-SATUNYA tabel yang menyimpan         #
-- #     `cohort`, dan HANYA berpasangan dengan `day`. Tidak ada satu pun      #
-- #     dimensi belajar di baris ini, sehingga isinya adalah "seseorang       #
-- #     mengirim bukti hari itu" dan bukan "seseorang lemah di tense-past".   #
-- #     `cohort` sendiri = 16 hex ACAK yang dibuat perangkat dan dirotasi     #
-- #     tiap 14 hari; TTL tabel ini 14 hari (purgeEvidence di                  #
-- #     evidence-store-d1.js). Cohort yang tidak pernah dipurge adalah        #
-- #     identitas seumur hidup dengan nama lain.                              #
-- #                                                                          #
-- #  4. DILARANG menambah kolom apa pun: tidak ada user_id, install_id,       #
-- #     token, IP, nama murid, ukuran payload, timestamp presisi. Satu-satunya #
-- #     waktu adalah `day` (YYYY-MM-DD).                                       #
-- #                                                                          #
-- #  5. DILARANG DI-JOIN dengan tabel identitas/kuota/analytics/learning —    #
-- #     dan memang tidak bisa: mereka hidup di database lain.                  #
-- ############################################################################
-- ============================================================================

-- Penghitung harian: satu baris per (hari, tipe event, dimensi). Kunci utama
-- gabungan = idempotensi alami untuk upsert `n = n + excluded.n`.
CREATE TABLE IF NOT EXISTS evidence_daily (
  day   TEXT    NOT NULL,           -- 'YYYY-MM-DD' dari amplop batch (satu-satunya waktu)
  event TEXT    NOT NULL,           -- 'learner_evidence' | 'braincore_decision' | 'learners'
  dim   TEXT    NOT NULL,           -- 'dimensi:nilai' dari enum tertutup, mis. 'masteryTrend:up'
  n     INTEGER NOT NULL DEFAULT 0, -- penghitung; hanya pernah naik lewat upsert
  PRIMARY KEY (day, event, dim)
) WITHOUT ROWID;

-- Dedup idempotency per-EVENT: kunci utama = event_id sendiri, sehingga replay
-- tertangkap lintas hari di seluruh jendela retry (14 hari — klien bukti bisa
-- offline lebih lama daripada klien analytics).
CREATE TABLE IF NOT EXISTS evidence_dedup (
  event_id TEXT NOT NULL,           -- UUID v4 acak dari klien; kunci dedup, bukan identitas
  batch_id TEXT NOT NULL,           -- UUID v4 acak batch pembawa pertama; bukan identitas
  day      TEXT NOT NULL,           -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (event_id)
) WITHOUT ROWID;

-- Penghitung murid distinct per hari. DUA kolom, keduanya kunci: tidak ada
-- ruang untuk menempelkan atribut belajar apa pun ke sebuah cohort.
CREATE TABLE IF NOT EXISTS evidence_learner_day (
  day    TEXT NOT NULL,             -- 'YYYY-MM-DD'
  cohort TEXT NOT NULL,             -- 16 hex acak dari perangkat, dirotasi 14 hari
  PRIMARY KEY (day, cohort)
) WITHOUT ROWID;

-- Indeks hanya untuk purge TTL. Sengaja TIDAK ada indeks lain: satu-satunya
-- pola baca yang boleh nyaman di dua tabel non-agregat adalah "hapus yang
-- kadaluarsa".
-- DIPAKAI purgeEvidence (evidence-store-d1.js):
--   'DELETE FROM evidence_dedup WHERE day < ?1'
CREATE INDEX IF NOT EXISTS idx_evidence_dedup_day ON evidence_dedup(day);
