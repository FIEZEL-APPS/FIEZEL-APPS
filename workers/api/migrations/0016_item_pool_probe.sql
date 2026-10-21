-- ============================================================================
-- FIEZEL — migrasi PROBE RETENSI untuk penyetelan paruh-waktu ingatan (Braincore
-- langkah 3). D1: fiezel-evidence (binding EVIDENCE_DB), database yang sama dengan
-- 0008 dan 0015. Kode: workers/api/evidence/item-pool-*.js; perangkat:
-- features/brain/fiezel-item-pool.js (observeProbe); penaksir:
-- tools/brain-param-tune.mjs (GitHub Actions, bukan Worker).
--
-- ############################################################################
-- #  KONTRAK PRIVASI — BACA SEBELUM MENGUBAH APA PUN                         #
-- #                                                                          #
-- #  item_pool_probe_daily HANYA berisi penghitung (day, rb, n, k):          #
-- #  rb = bucket 0..19 retrievability yang DIPREDIKSI perangkat saat soal    #
-- #  probe disajikan; n = jawaban probe di bucket itu; k = yang benar.       #
-- #  TIDAK ADA ID soal, ID lesson, pengenal murid, cohort, atau waktu        #
-- #  presisi. Satu-satunya waktu adalah `day`. Retensi 120 hari, dipurge     #
-- #  cron harian Worker (purgeItemPool) walau saklar lane dimatikan.         #
-- ############################################################################
-- ============================================================================

CREATE TABLE IF NOT EXISTS item_pool_probe_daily (
  day TEXT    NOT NULL,           -- 'YYYY-MM-DD' hari jawaban probe
  rb  INTEGER NOT NULL,           -- bucket 0..19 retrievability prediksi perangkat
  n   INTEGER NOT NULL DEFAULT 0, -- jawaban probe di bucket ini
  k   INTEGER NOT NULL DEFAULT 0, -- yang benar di antaranya
  PRIMARY KEY (day, rb)
) WITHOUT ROWID;
