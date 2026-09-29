-- ============================================================================
-- FIEZEL — migrasi lane KESULITAN SOAL GABUNGAN (D1: fiezel-evidence, binding
-- EVIDENCE_DB). Braincore langkah 2: kesulitan soal dihitung dari SEMUA murid,
-- bukan per HP. Kode: workers/api/evidence/item-pool-*.js; perangkat:
-- features/brain/fiezel-item-pool.js.
--
-- KENAPA DI fiezel-evidence, BUKAN DATABASE BARU: database ini sudah hidup
-- (lane bukti agregat, 0008) dan kontraknya sama — penghitung tanpa identitas
-- + dedup ber-TTL. Owner cukup menjalankan SATU berkas ini, bukan membuat
-- database dan binding baru.
--
-- ############################################################################
-- #  KONTRAK PRIVASI TABEL-TABEL INI — BACA SEBELUM MENGUBAH APA PUN          #
-- #                                                                          #
-- #  1. item_pool_daily HANYA berisi penghitung (day, item_id, pb, n, k).     #
-- #     item_id adalah ID TEMPLAT KONTEN yang lolos pola ketat + mode dari    #
-- #     daftar tertutup (item-pool-core.js validItemId) — bukan teks bebas.   #
-- #     pb = bucket 0..19 peluang benar yang diprediksi perangkat. TIDAK ADA  #
-- #     baris per-murid atau per-event; event mentah mati di memori Worker.  #
-- #                                                                          #
-- #  2. item_pool_dedup berisi event_id/batch_id UUID v4 ACAK sekali pakai.  #
-- #     TTL 60 hari (ITEM_POOL_LIMITS.DEDUP_TTL_DAYS) — lebih lama dari       #
-- #     jendela kirim ulang perangkat (56 hari). Dipurge cron harian.        #
-- #                                                                          #
-- #  3. item_pool_table adalah HASIL yang dibaca publik lewat                 #
-- #     GET /api/braincore/item-difficulty: satu baris per soal (koreksi,    #
-- #     jumlah jawaban). Dibangun ulang utuh setiap hari dari 56 hari        #
-- #     terakhir item_pool_daily.                                            #
-- #                                                                          #
-- #  4. DILARANG menambah kolom apa pun yang menghubungkan ke murid: tidak    #
-- #     ada cohort, user_id, install_id, token, IP, timestamp presisi.       #
-- #     Satu-satunya waktu adalah `day` (YYYY-MM-DD). Retensi                 #
-- #     item_pool_daily 120 hari (docs/D1-RETENTION.md).                     #
-- ############################################################################
-- ============================================================================

CREATE TABLE IF NOT EXISTS item_pool_daily (
  day     TEXT    NOT NULL,           -- 'YYYY-MM-DD' hari jawaban (satu-satunya waktu)
  item_id TEXT    NOT NULL,           -- '<templat>:<mode>', mis. 'PR-101:apply_form'
  pb      INTEGER NOT NULL,           -- bucket 0..19 peluang benar prediksi perangkat
  n       INTEGER NOT NULL DEFAULT 0, -- jawaban-pertama yang jatuh di bucket ini
  k       INTEGER NOT NULL DEFAULT 0, -- yang benar di antaranya
  PRIMARY KEY (day, item_id, pb)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS item_pool_dedup (
  event_id TEXT NOT NULL,             -- UUID v4 acak dari perangkat; kunci dedup, bukan identitas
  batch_id TEXT NOT NULL,             -- UUID v4 acak batch pembawa pertama; bukan identitas
  day      TEXT NOT NULL,             -- 'YYYY-MM-DD' hari DITERIMA server (untuk purge)
  PRIMARY KEY (event_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS item_pool_table (
  item_id     TEXT    NOT NULL,       -- soal yang diterbitkan
  delta_milli INTEGER NOT NULL,       -- koreksi kesulitan x1000 (positif = lebih sulit)
  n           INTEGER NOT NULL,       -- jawaban-pertama di jendela 56 hari
  day         TEXT    NOT NULL,       -- hari tabel dibangun
  PRIMARY KEY (item_id)
) WITHOUT ROWID;

-- DIPAKAI oleh purge dedup (item-pool-store-d1.js):
--   'DELETE FROM item_pool_dedup WHERE day < ?1'
-- item_pool_daily TIDAK butuh indeks sendiri: kunci utamanya sudah diawali `day`, jadi
-- purge dan baca-jendela memakai kunci itu.
CREATE INDEX IF NOT EXISTS idx_item_pool_dedup_day ON item_pool_dedup(day);
