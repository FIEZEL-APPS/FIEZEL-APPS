-- ============================================================================
-- FIEZEL E4 — migrasi analytics (D1: fiezel-analytics)
-- OTORITAS: EXEC-BRIEF-CF.md "KONTRAK ANALYTICS PRIVASI-MAKSIMAL".
--
-- ############################################################################
-- #  PERINGATAN KERAS — BACA SEBELUM MENAMBAH SATU KOLOM PUN                  #
-- #                                                                          #
-- #  1. TABEL DI BERKAS INI DILARANG DI-JOIN DENGAN TABEL KUOTA.              #
-- #     Kuota memakai `user_id` (identitas nyata, memang perlu). Analytics     #
-- #     memakai token harian yang dibuang tiap malam. TIDAK ADA KOLOM          #
-- #     PENGHUBUNG di antara keduanya, dan ketiadaan itu adalah FITUR.         #
-- #     Kalau suatu hari ada yang menambahkan `user_id` ke salah satu tabel    #
-- #     di bawah, seluruh jaminan privasi produk ini runtuh dalam satu baris.  #
-- #     Gerbang `analytics-privacy-test.js` memindai DDL ini dan akan MERAH.   #
-- #                                                                          #
-- #  2. NOL TABEL PER-ORANG. Tidak ada `identity`, tidak ada                   #
-- #     `daily_active(day, user_id)`, tidak ada `usage_daily(user_id, day)`.   #
-- #     (cf-b5-analytics.md §2.1 memuat tabel-tabel itu; brief eksekusi        #
-- #     MENANG dan tabel-tabel itu SENGAJA TIDAK DIBUAT.)                      #
-- #                                                                          #
-- #  3. DILARANG ada kolom: nama, email, uuid penyedia, IP, user-agent,        #
-- #     lokasi, teks soal, teks jawaban, transkrip, isi prompt/respons AI.     #
-- #     Semua dimensi disimpan sebagai `bucket` berenum tertutup.              #
-- #                                                                          #
-- #  4. Satu-satunya tabel yang menyentuh nilai per-perangkat adalah           #
-- #     `dau_dedup`, isinya token HMAC harian, dan ia DIHAPUS setiap malam     #
-- #     setelah rollup (lihat rollup.js). Ia bukan tabel per-orang: tidak      #
-- #     bisa dihubungkan ke akun, dan tidak bisa dihubungkan ke hari lain.     #
-- ############################################################################
-- ============================================================================

-- 1) AGREGAT HARIAN. Nilai apa pun boleh disimpan permanen: tidak ada individu
--    di dalamnya. `metric` adalah nama penghitung berenum (lihat analytics-core.js).
CREATE TABLE IF NOT EXISTS metrics_daily (
  day    TEXT    NOT NULL,          -- 'YYYY-MM-DD'
  metric TEXT    NOT NULL,          -- 'dau' | 'answers' | 'ai_calls' | ...
  value  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
) WITHOUT ROWID;

-- 2) DIMENSI PEMAKAIAN. `bucket` = 'dimensi:nilai' dengan nilai berenum
--    tertutup ('lesson_domain:grammar', 'ai_err:timeout', 'platform:android').
--    Karena berenum, tidak ada teks bebas yang bisa menyelinap ke sini.
CREATE TABLE IF NOT EXISTS usage_daily (
  day    TEXT    NOT NULL,
  bucket TEXT    NOT NULL,
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bucket)
) WITHOUT ROWID;

-- 3) RETENSI KOHOR. Klien tahu tanggal pasangnya sendiri dan mengirim
--    (cohort_day, day_index); server hanya menaikkan penghitung. Server TIDAK
--    PERNAH menyimpan baris per-orang untuk retensi.
CREATE TABLE IF NOT EXISTS retention_daily (
  cohort_day TEXT    NOT NULL,      -- 'YYYY-MM-DD' hari pasang di perangkat
  day_index  INTEGER NOT NULL,      -- 0 = hari pasang, 1 = D1, 7 = D7, 30 = D30
  count      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cohort_day, day_index)
) WITHOUT ROWID;

-- 4) DEDUP DAU — SEMENTARA, HIDUP MAKSIMAL SATU HARI.
--    `token` = HMAC-SHA256(pepper_hari_ini, installId) dipotong 128 bit,
--    dihitung DI PERANGKAT. Server tidak pernah memegang installId, jadi
--    server tidak bisa membalik token ini.
--    WAJIB: rollup harian menghapus seluruh baris hari itu setelah DAU dihitung
--    (rollup.js -> purgeDauDedup). Kalau purge tidak jalan, tabel ini berubah
--    jadi arsip perangkat harian — persis yang kontrak ini larang.
CREATE TABLE IF NOT EXISTS dau_dedup (
  day   TEXT NOT NULL,
  token TEXT NOT NULL,              -- 32 hex, HMAC terpotong. Bukan id akun.
  PRIMARY KEY (day, token)
) WITHOUT ROWID;

-- 5) STATE PEPPER. Satu baris saja (id = 1).
--    `previous` hanya jendela toleransi satu putaran untuk event yang tertahan
--    offline melewati tengah malam. Saat rotasi berikutnya, pepper dua putaran
--    lalu HILANG PERMANEN — tidak diarsipkan ke mana pun. Itulah sebabnya
--    token hari-1 tidak bisa disambungkan ke token hari-2 oleh siapa pun.
CREATE TABLE IF NOT EXISTS pepper_state (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  rotated_at INTEGER NOT NULL DEFAULT 0,   -- epoch ms
  current    TEXT    NOT NULL,
  previous   TEXT                          -- NULL setelah rotasi pertama
);

-- Indeks: hanya untuk purge dan pembacaan rentang. Tidak ada indeks yang
-- memudahkan pencarian "semua hari untuk satu token" — pencarian itu memang
-- tidak boleh nyaman, dan setelah purge harian ia juga tidak mungkin.
CREATE INDEX IF NOT EXISTS idx_metrics_metric   ON metrics_daily(metric, day);
CREATE INDEX IF NOT EXISTS idx_retention_cohort ON retention_daily(day_index, cohort_day);
