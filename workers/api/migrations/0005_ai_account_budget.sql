-- ============================================================================
-- FIEZEL P3 — pagar neuron TINGKAT AKUN (D1: `fiezel-core`, binding `CORE_DB`)
--
-- KENAPA TABEL INI ADA
-- ----------------------------------------------------------------------------
-- `GLOBAL_NEURON_CAP = "8000"` sudah ada di `wrangler.toml` sejak fase CF dan
-- TIDAK PERNAH mengikat apa pun: `grep -rn GLOBAL_NEURON_CAP workers/` hanya
-- menemukannya di wrangler.toml dan di dokumen. `pickModel()` di `ai-tasks.js`
-- memang menerima `neuronsUsedToday` dan menurunkan model di atas
-- `NEURONS.softLimit=8000`, tetapi `route-ai.js` mengisinya dengan
-- `Number(deps.neuronsUsedToday || 0)` dan TIDAK ADA satu pun pemanggil yang
-- menyuntikkan dep itu. Jadi nilainya selalu 0, degradasinya mati, dan plafon
-- akunnya hanya prosa.
--
-- Kuota per-pengguna (`quota_daily`) tidak bisa menggantikannya. Jatah neuron
-- Workers AI 10.000/hari adalah KOLAM SATU AKUN, bukan per murid: 250 murid x
-- 25 permintaan `tutor_turn` x 60 neuron = 375.000 neuron, 37x plafon. Pagar
-- per-pengguna yang benar pun tidak menahan tagihan akun, dan penyerang yang
-- menerbitkan banyak sesi anon melewatinya sepenuhnya. Yang menahan tagihan
-- harus dihitung DI TINGKAT AKUN — dan satu-satunya tempat hitungan itu bisa
-- dipercaya adalah penyimpanan bersama, bukan variabel isolate (setiap kota
-- punya isolate sendiri; penghitung di memori berarti plafonnya dikalikan
-- jumlah isolate yang hidup).
--
-- ############################################################################
-- #  APA YANG DILARANG MASUK TABEL INI                                       #
-- #  1. TIDAK ADA `user_id`, sub, install_id, atau apa pun milik murid. Tabel #
-- #     ini menjawab SATU pertanyaan: berapa neuron yang sudah dibelanjakan   #
-- #     AKUN hari ini. Menambah kolom per-murid akan menjadikannya jembatan   #
-- #     antara jalur biaya dan identitas, dan menduplikasi `quota_daily`.     #
-- #  2. TIDAK ADA teks prompt/jawaban. Ini penghitung, bukan log.             #
-- ############################################################################
--
-- BENTUK BARIS: SATU BARIS PER HARI (UTC), bukan per permintaan.
-- Alasannya biaya tulis: satu baris per permintaan berarti tabel yang tumbuh
-- selamanya + purge berkala, sedangkan yang dibutuhkan penegakan hanya
-- jumlahnya. Satu baris/hari = 365 baris/tahun, jadi tidak ada purge dan tidak
-- ada tulis tambahan untuk retensi.
--
-- KENAPA HARINYA UTC, BUKAN Asia/Jakarta
-- ----------------------------------------------------------------------------
-- Jatah neuron Cloudflare berganti menurut UTC, dan yang dijaga tabel ini
-- adalah jatah ITU. Reset jatah MURID tetap `Asia/Jakarta` (`quota-config.js`
-- ACCOUNT_BUDGET_TZ vs zona murid) — dua jam yang berbeda karena dua hal yang
-- berbeda: satu mengikuti tagihan vendor, satu mengikuti hidup murid. Kalau
-- keduanya dipaksa sama, salah satunya jadi bohong.
--
-- CARA MENERAPKAN (lihat MIGRATIONS.md untuk konteks lengkap)
--   cd workers/api
--   wrangler d1 execute fiezel-core --remote --file=migrations/0005_ai_account_budget.sql
-- Idempoten: `IF NOT EXISTS`, aman dijalankan ulang.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_account_day (
  day        TEXT    NOT NULL PRIMARY KEY, -- 'YYYY-MM-DD' UTC (jam jatah vendor, bukan jam murid)
  neurons    INTEGER NOT NULL DEFAULT 0,   -- perkiraan neuron yang SUDAH dipesan hari ini
  requests   INTEGER NOT NULL DEFAULT 0,   -- jumlah permintaan AI yang lolos pagar ini
  touched_at INTEGER NOT NULL DEFAULT 0    -- epoch ms, dari jam yang DISUNTIKKAN (bukan Date.now())
);

-- PRIMARY KEY (day) SUDAH menjadi indeks yang dipakai kedua kueri di
-- `ai/ai-account-budget.js` (`ACCOUNT_SQL.ensureDay` dan `ACCOUNT_SQL.reserve`,
-- keduanya `WHERE day = ?1`). Karena itu TIDAK ADA `CREATE INDEX` di berkas ini:
-- indeks kedua atas satu-satunya kolom kunci hanya menambah satu baris tertulis
-- per permintaan tanpa satu pun kueri yang membacanya
-- (https://developers.cloudflare.com/d1/platform/pricing/).
