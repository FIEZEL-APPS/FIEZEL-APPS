-- ============================================================================
-- FIEZEL A3 — migrasi catatan hasil cron (D1: `fiezel-core`, binding `CORE_DB`)
--
-- KENAPA TABEL INI ADA
-- ----------------------------------------------------------------------------
-- Worker `fiezel-api` punya dua Cron Trigger dan keduanya memikul satu kontrak
-- masing-masing:
--   `*/5 * * * *`  sweep reservasi kuota  -> slot murid yang ditahan permintaan
--                                            mati harus kembali dalam menit,
--                                            bukan tengah malam;
--   `5 17 * * *`   rollup analytics       -> token harian DIHAPUS dan pepper
--                  (00:05 WIB)              DIROTASI. Kalau job ini gagal diam-
--                                            diam, klaim "server tidak bisa
--                                            menyambung hari-1 ke hari-2"
--                                            BOHONG, dan tidak ada satu pun
--                                            orang yang tahu.
-- Sebelum tabel ini, satu-satunya bukti bahwa cron jalan adalah `console.log`
-- yang hanya terlihat selama `wrangler tail` dibuka. Itu bukan bukti; itu
-- kebetulan. `cron_run` membuat "sudah berapa lama rollup tidak sukses?" bisa
-- DIJAWAB, bukan diperkirakan.
--
-- ############################################################################
-- #  APA YANG DILARANG MASUK TABEL INI                                        #
-- #                                                                          #
-- #  1. TIDAK ADA PESAN GALAT MENTAH. Kolomnya `error_class`, berenum          #
-- #     tertutup ('d1_error','timeout','binding_missing','type_error',         #
-- #     'unknown', ...  — lihat CRON_ERROR_CLASSES di ../cron-status.js).      #
-- #     Pesan galat hulu bisa memuat SQL, nama tabel, potongan parameter,      #
-- #     bahkan nilai secret. Menyimpannya di D1 berarti menyalin isi galat     #
-- #     ke penyimpanan permanen yang dibaca lewat HTTP.                        #
-- #  2. TIDAK ADA DATA MURID. Tidak ada `user_id`, tidak ada token, tidak ada  #
-- #     teks soal/jawaban, tidak ada nama, tidak ada IP. Tabel ini hanya       #
-- #     memuat: job mana, hari apa, jam berapa, berhasil atau tidak, berapa    #
-- #     baris tersentuh, dan KELAS galatnya.                                   #
-- #  3. TIDAK ADA KOLOM PENGHUBUNG ke tabel analytics. Tabel ini hidup di      #
-- #     `fiezel-core` bersama kuota/identitas, dan ia TIDAK boleh dipakai      #
-- #     sebagai jembatan: satu-satunya kolom bersamanya dengan dunia analytics #
-- #     adalah `day`, yaitu tanggal — bukan pengenal siapa pun.                #
-- #  Gerbang `cron-contract-test.js` butir (e) memindai isi tabel ini dan      #
-- #  MEMERAH kalau ada pesan galat mentah atau penanda data murid di dalamnya. #
-- ############################################################################
--
-- KENAPA `fiezel-core` DAN BUKAN `fiezel-stats`
-- ----------------------------------------------------------------------------
-- Ini catatan OPERASIONAL, bukan angka produk. Menaruhnya di database analytics
-- akan menambah tabel keenam di sana, dan `analytics-privacy-test.js` (benar)
-- menuntut database itu memuat TEPAT lima tabel yang terdaftar di
-- `analytics-tables.js`. Lebih penting: rollup yang GAGAL karena database
-- analytics tidak bisa ditulis tidak akan bisa mencatat kegagalannya sendiri di
-- database yang sama. Catatan kegagalan harus hidup di tempat lain daripada
-- yang bisa gagal bersamanya.
--
-- CARA MENERAPKAN (lihat MIGRATIONS.md untuk konteks lengkap)
--   cd workers/api
--   wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql
-- Idempoten: `IF NOT EXISTS`, aman dijalankan ulang.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cron_run (
  job           TEXT    NOT NULL,          -- 'quota_sweep' | 'analytics_rollup' (enum di cron-status.js)
  day           TEXT    NOT NULL,          -- 'YYYY-MM-DD' UTC saat job dimulai
  started_at    INTEGER NOT NULL,          -- epoch ms, dari jam yang DISUNTIKKAN (bukan Date.now() di jalur keputusan)
  finished_at   INTEGER NOT NULL DEFAULT 0,
  ok            INTEGER NOT NULL DEFAULT 0,-- 1 = job selesai tanpa melempar
  rows_affected INTEGER NOT NULL DEFAULT 0,-- baris yang benar-benar tersentuh (reaped, dau, ...)
  error_class   TEXT                       -- NULL saat ok=1; KELAS galat saat ok=0. BUKAN pesan.
);

-- Satu BARIS PER JALAN, bukan satu baris per hari: "berapa kali gagal hari ini"
-- adalah pertanyaan yang harus bisa dijawab, dan PRIMARY KEY (job, day) akan
-- menimpa kegagalan pertama dengan keberhasilan berikutnya — tepatnya bukti yang
-- paling ingin disembunyikan oleh bug yang sedang dicari.
CREATE INDEX IF NOT EXISTS idx_cron_run_job_day ON cron_run(job, day);
-- Jalur panas ringkasan: WHERE day >= ? ORDER BY started_at
CREATE INDEX IF NOT EXISTS idx_cron_run_day ON cron_run(day);
