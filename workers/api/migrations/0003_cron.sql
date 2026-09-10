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
-- paling ingin disembunyikan oleh bug yang sedang dicari. Karena itu tabel ini
-- SENGAJA tanpa PRIMARY KEY.
--
-- ----------------------------------------------------------------------------
-- INDEKS YANG SENGAJA TIDAK DIBUAT: idx_cron_run_job_day(job, day)
-- ----------------------------------------------------------------------------
-- Versi pertama berkas ini membuat `idx_cron_run_job_day ON cron_run(job, day)`.
-- Indeks itu DIHAPUS sebelum 0003 pernah dijalankan di produksi, karena TIDAK
-- ADA SATU PUN KUERI yang menyaring atau mengurutkan dengan `job`. Seluruh SQL
-- terhadap tabel ini hidup di satu tempat, `CRON_SQL` di ../cron-status.js, dan
-- isinya cuma tiga: satu INSERT, satu `DELETE ... WHERE day < ?1`, dan satu
-- `SELECT ... WHERE day >= ?1 AND day <= ?2 ORDER BY started_at`. Pemisahan
-- per-job dilakukan di JS oleh `summarizeCronRuns()` — disengaja, karena barisnya
-- sedikit (2 job x <=289 jalan/hari x 60 hari) dan fungsi murni bisa diuji tanpa
-- D1. Jadi `job` tidak pernah menjadi kolom penyaring, dan indeks berkepala `job`
-- tidak pernah terpakai.
-- Indeks tak terpakai bukan netral: setiap INSERT ke tabel ini akan menulis SATU
-- BARIS TAMBAHAN untuk indeks itu ("Indexes add an additional written row when
-- writes include the indexed column" —
-- https://developers.cloudflare.com/d1/platform/pricing/), dan sweep kuota jalan
-- tiap 5 menit = 288 INSERT/hari + 1 rollup, di atas plan gratis 100.000 baris
-- tertulis/hari untuk SELURUH akun. Lebih penting daripada kuota: D1
-- single-threaded per database ("processes queries one at a time" —
-- https://developers.cloudflare.com/d1/platform/limits/), jadi tulis adalah
-- sumber daya paling langka di `fiezel-core` — database yang sama yang memikul
-- jalur panas kuota. Membayar tulis untuk indeks yang tidak dibaca siapa pun
-- berarti memperlambat reserve/commit murid demi nol manfaat.
-- KALAU nanti ada kueri nyata berkepala `job` (mis. `WHERE job = ?1 AND day >= ?2`),
-- tambahkan indeksnya di migrasi BARU bersama kuerinya — jangan di sini.

-- Jalur panas ringkasan owner + purge retensi, keduanya berkepala `day`.
-- DIPAKAI OLEH: cron-status.js CRON_SQL.readRange (GET /api/owner/cron-status)
--   'SELECT job, day, started_at, finished_at, ok, rows_affected, error_class FROM cron_run WHERE day >= ?1 AND day <= ?2 ORDER BY started_at'
-- DIPAKAI OLEH: cron-status.js CRON_SQL.purgeOlderThan (retensi 60 hari)
--   'DELETE FROM cron_run WHERE day < ?1'
CREATE INDEX IF NOT EXISTS idx_cron_run_day ON cron_run(day);
