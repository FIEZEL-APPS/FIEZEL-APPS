# Migrasi D1 `fiezel-api` — urutan, database tujuan, cara pakai

Direktori ini adalah **katalog tunggal** semua migrasi Worker `fiezel-api`.
Sebelumnya migrasi tersebar di tiga tempat (`migrations/`, `quota/migrations/`,
`analytics/migrations/`) karena tiga paket kerja berjalan paralel; salinan di
sini yang menjadi urutan resmi.

## Urutan dan database tujuan

| Berkas | Database | Tabel yang dibuat |
|---|---|---|
| `0001_identity.sql` | `fiezel-core` (binding `CORE_DB`) | `identity`, `session`, `anon_issue` |
| `0001_quota.sql` | `fiezel-core` (binding `CORE_DB`) | `quota_daily`, `quota_reservation` |
| `0002_analytics.sql` | `fiezel-stats` (binding `STATS_DB`, dibaca kode sebagai `ANALYTICS_DB`) | `metrics_daily`, `usage_daily`, `retention_daily`, `dau_dedup`, `pepper_state` |
| `0003_cron.sql` | `fiezel-core` (binding `CORE_DB`) | `cron_run` |
| `0004_indexes.sql` | `fiezel-core` (binding `CORE_DB`) | *(nol tabel baru — hanya indeks)* |
| `0005_ai_account_budget.sql` | `fiezel-core` (binding `CORE_DB`) | `ai_account_day` |
| `0007_learning_events.sql` | `fiezel-stats` (binding `STATS_DB`, dibaca kode sebagai `ANALYTICS_DB`) | `learning_batch_dedup`, `learning_event_dedup`, `learning_daily`, `learning_rate` |

Nomor `0006` SENGAJA dilewati: ia sudah diklaim `0006_analytics_batch_dedup.sql`
di branch `brain-learning-infra-v1` (PR #226) yang saat `0007` ditulis belum
merged. Memakai `0006` di sini berarti dua migrasi berbeda dengan nomor sama
begitu PR itu mendarat — persis kelas cacat "dua daftar yang tidak saling tahu"
yang didokumentasikan di bawah. Tidak ada tabrakan nama tabel: `0007` memprefiks
semua tabelnya dengan `learning_`.

Tabel di atas adalah **satu-satunya** daftar berkas→database yang ditulis manusia.
`tools/d1-schema-check.mjs` dan `d1-schema-contract-test.js` **menurunkan** peta itu
dari perintah `wrangler d1 execute … --file=migrations/<berkas>` di dokumen ini,
lalu MEMERAH kalau ada satu berkas `.sql` di direktori yang tidak punya perintah
penerapan di sini. Jadi migrasi baru tanpa dokumentasi = gerbang merah, bukan
migrasi yang tidak pernah diperiksa (lihat "Cacat yang pernah terjadi" di bawah).

`0003_cron.sql` masuk `fiezel-core` dan bukan `fiezel-stats` karena dua alasan
yang keduanya keras: (1) `analytics-privacy-test.js` menuntut database analytics
memuat **tepat lima tabel** yang terdaftar di `analytics-tables.js`; (2) rollup
yang gagal karena database analytics tidak bisa ditulis **tidak akan bisa
mencatat kegagalannya sendiri di database yang sama**. Catatan kegagalan harus
hidup di tempat lain daripada yang bisa gagal bersamanya. `cron_run` tidak punya
satu pun kolom penghubung ke dunia analytics selain `day` (tanggal), jadi ia
tidak membuka jalur JOIN yang dilarang.

Dua berkas bernomor `0001` bukan kelalaian: keduanya lahir di fase yang sama dan
tidak saling bergantung (`quota_daily` tidak punya foreign key ke `identity` —
lihat catatan di dalam `0001_quota.sql`). Tidak ada satu pun nama tabel yang
bertabrakan antar berkas, jadi urutan penerapan di dalam satu database bebas.

## KENAPA TIDAK `wrangler d1 migrations apply`

`migrations_dir` di `wrangler.toml` sudah **dihapus dengan sengaja**. Satu
direktori migrasi hanya bisa diterapkan ke satu database, sedangkan katalog ini
memuat dua database. Kalau `migrations_dir = "migrations"` dibiarkan menempel di
`CORE_DB`, maka `wrangler d1 migrations apply fiezel-core` akan menjalankan
`0002_analytics.sql` **di database kuota** — tabel agregat analytics berakhir
bersebelahan dengan `quota_daily(user_id, …)`, dan JOIN yang dilarang kontrak
privasi (`EXEC-BRIEF-CF.md`) mendadak menjadi mungkin dengan satu query.

Pemisahan database itu bukan pengerasan opsional; itu satu-satunya bagian dari
kontrak privasi yang ditegakkan oleh struktur, bukan oleh disiplin orang.

## Cara menerapkan (eksplisit, per berkas, per database)

```bash
cd workers/api

# sekali saja, kalau database belum ada
wrangler d1 create fiezel-core
wrangler d1 create fiezel-stats
# lalu tempelkan database_id yang keluar ke wrangler.toml

# --- fiezel-core: identitas + kuota ---
wrangler d1 execute fiezel-core --remote --file=migrations/0001_identity.sql
wrangler d1 execute fiezel-core --remote --file=migrations/0001_quota.sql

# --- fiezel-stats: analytics agregat ---
wrangler d1 execute fiezel-stats --remote --file=migrations/0002_analytics.sql

# --- fiezel-core: catatan hasil cron (A3) ---
wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql

# --- fiezel-core: pagar neuron tingkat AKUN (P3) ---
wrangler d1 execute fiezel-core --remote --file=migrations/0005_ai_account_budget.sql

# --- fiezel-stats: lane telemetri belajar (Wave E1) ---
wrangler d1 execute fiezel-stats --remote --file=migrations/0007_learning_events.sql
```

`0007_learning_events.sql` WAJIB diterapkan SEBELUM `LEARNING_ENABLED` dinyalakan.
Endpoint `/api/learning/events` (`learning/route-learning.js`) FAIL-CLOSED: tanpa
tabelnya, setiap batch dijawab `503` dan transport klien (PR #226) mengantre ulang
dengan `eventId` yang sama — tidak ada data hilang, tidak ada hitung ganda, dan
tidak ada jawaban sukses palsu. Selama flag masih `off`, endpoint menjawab `202
{disabled:true}` tanpa menyentuh D1, jadi urutan deploy kode vs migrasi bebas.

`0005_ai_account_budget.sql` WAJIB diterapkan SEBELUM `cfAiEnabled` dinyalakan.
Pagar neuron tingkat akun di `ai/ai-account-budget.js` FAIL-CLOSED: kalau tabel
`ai_account_day` belum ada, setiap permintaan AI ditolak dengan `degraded:true`
dan murid tetap mendapat jawaban dari materi. Itu disengaja — pipa biaya yang
tidak bisa diukur tidak boleh dibuka. Bandingkan dengan `0003_cron.sql` yang
fail-SOFT: yang di sana adalah observabilitas, yang di sini adalah dompet.

Sampai `0003_cron.sql` diterapkan, sweep dan rollup **tetap berjalan** tetapi
tidak meninggalkan bukti: `recordCronRun()` menelan `D1_UNKNOWN_TABLE` dengan
sengaja (observabilitas tidak boleh menjatuhkan job yang diobservasinya) dan
`GET /api/owner/cron-status` menjawab `200` dengan `migrated:false`. Jadi
`migrated:false` berarti "migrasi belum dijalankan", bukan "cron sehat".

Ganti `--remote` dengan `--local` untuk `wrangler dev`. Semua berkas memakai
`CREATE TABLE IF NOT EXISTS`, jadi menjalankannya ulang aman (idempoten).

## Verifikasi kontrak privasi setelah menerapkan

```bash
# HARUS kosong: tidak boleh ada tabel analytics di database kuota
wrangler d1 execute fiezel-core --remote \
  --command "SELECT name FROM sqlite_master WHERE name IN ('metrics_daily','usage_daily','retention_daily','dau_dedup','pepper_state')"

# HARUS kosong: tidak boleh ada tabel kuota/identitas di database analytics
wrangler d1 execute fiezel-stats --remote \
  --command "SELECT name FROM sqlite_master WHERE name IN ('quota_daily','quota_reservation','identity','session')"
```

Gerbang `cf-wiring-test.js` memeriksa hal yang sama di tingkat berkas: tidak ada
tabrakan nama tabel antar berkas, dan tidak ada satu pun kolom penghubung
(`user_id`, `sub`, `install_id`) di `0002_analytics.sql`.

## Salinan, bukan pindahan

`quota/migrations/0001_quota.sql` dan `analytics/migrations/0002_analytics.sql`
**tetap ada di tempat asalnya** karena gerbang paket kerja masing-masing membaca
path itu (mis. `analytics-privacy-test.js` membaca
`analytics/migrations/0002_analytics.sql`). Salinan di direktori ini wajib
**byte-identik** dengan aslinya, dan `cf-wiring-test.js` yang membuktikannya —
jadi tidak ada kemungkinan dua versi skema yang berbeda hidup berdampingan tanpa
ada yang tahu.

## 0004_indexes.sql — hanya `fiezel-core` (A6/D1)

`0004_indexes.sql` adalah migrasi **indeks saja**: nol tabel baru, nol kolom
baru, nol `DELETE`, nol `DROP TABLE`, nol `ALTER TABLE`. Ia menggabungkan indeks
yang tumpang tindih di `quota_daily` dan `quota_reservation`, dan **tidak**
menambah indeks untuk kueri yang sudah tertutup PRIMARY KEY (alasan lengkap +
hasil `EXPLAIN QUERY PLAN` ada di kepala berkasnya dan di
`analysis/a6-d1-index-plans.json`).

```bash
cd workers/api
wrangler d1 execute fiezel-core --remote --file=migrations/0004_indexes.sql
```

**JANGAN dijalankan di `fiezel-stats`.** Tidak ada pasangan `0004` untuk
database analytics: seluruh kueri panasnya sudah dilayani PRIMARY KEY tabel
masing-masing, dan setiap indeks tambahan di sana hanya menambah baris tertulis
(plan gratis = 100.000 baris tertulis/hari untuk seluruh akun,
https://developers.cloudflare.com/d1/platform/pricing/).

Nomor `0003` dipakai oleh `0003_cron.sql` (paket A3). Catatan lama di sini
berbunyi "tidak ada berkas `0003_*`" — itu benar saat A6/D1 ditulis dan **sudah
tidak benar** sejak A3 mendarat; keduanya lahir paralel. Nomor `0004` tetap milik
A6/D1, dan tidak ada tabrakan: `0003` hanya membuat `cron_run`, `0004` hanya
menyentuh indeks `quota_daily`/`quota_reservation`.

## Cacat yang pernah terjadi: `cron_run` "hilang" dari skema harapan

`0003_cron.sql` dan gerbang skema A6/D1 lahir di dua paket kerja paralel. Gerbang
(`d1-schema-contract-test.js`) dan pembanding (`tools/d1-schema-check.mjs`)
masing-masing memuat daftar berkas migrasi **yang ditulis tangan**, dan daftar itu
tidak ikut berubah saat `0003_cron.sql` mendarat. Akibatnya "skema harapan"
dibangun tanpa `cron_run`, lalu gerbang menuduh `cron-status.js` memakai tabel
tanpa migrasi — padahal migrasinya ada di direktori yang sama. Sisi sebaliknya
lebih berbahaya: berkas migrasi yang tidak terdaftar **tidak diperiksa sama
sekali** dan gerbang tetap hijau.

Sekarang kedua pihak menurunkan daftarnya dari dokumen ini dan **menghitung**
berkas: `jumlah berkas terpetakan == jumlah berkas .sql di direktori`, kalau tidak
sama → merah (gerbang) / keluar 2 (pembanding).

## `0003_cron.sql` hanya punya SATU indeks

Versi pertama `0003_cron.sql` membuat dua indeks: `idx_cron_run_day(day)` dan
`idx_cron_run_job_day(job, day)`. Yang kedua **dihapus dari berkas sebelum 0003
pernah dijalankan di database mana pun** (produksi baru menjalankan `0001*` dan
`0002`), karena tidak ada satu pun kueri di `cron-status.js` yang menyaring atau
mengurutkan dengan `job` — `CRON_SQL` cuma memuat satu `INSERT`, satu
`DELETE … WHERE day < ?1`, dan satu `SELECT … WHERE day >= ?1 AND day <= ?2 ORDER BY
started_at`; pemisahan per-job dilakukan di JS oleh `summarizeCronRuns()`. Indeks
tanpa kueri hanya menambah satu baris tertulis per INSERT
(https://developers.cloudflare.com/d1/platform/pricing/) di database yang
single-threaded (https://developers.cloudflare.com/d1/platform/limits/) dan juga
memikul jalur panas kuota. Alasan lengkap ada di kepala berkasnya.

Berkas ini **tidak** punya salinan di `quota/migrations/`. Salinan hanya wajib
untuk berkas yang dibaca gerbang paket kerja lain (lihat "Salinan, bukan
pindahan"); tidak ada gerbang yang membaca `0004`, jadi satu salinan saja —
dua salinan tanpa gerbang yang membandingkannya justru mengundang divergensi.

### Sesudah menerapkan: BUKTIKAN produksi cocok dengan repo

```bash
cd workers/api
wrangler d1 execute fiezel-core --remote --json \
  --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
  | node ../../tools/d1-schema-check.mjs --db core

wrangler d1 execute fiezel-stats --remote --json \
  --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
  | node ../../tools/d1-schema-check.mjs --db stats
```

Keluar 0 = skema nyata identik dengan berkas migrasi di repo (nama tabel, kolom,
nama indeks, kolom indeks, UNIQUE, dan klausa WHERE indeks partial). Keluar 1 =
ada beda, dan laporannya menyebut tabel/kolom/indeks mana. Skrip itu **nol
jaringan**: ia hanya membaca STDIN dan berkas migrasi, jadi CI bisa mengujinya
tanpa kredensial Cloudflare (`d1-schema-contract-test.js`).

Dokumen terkait: `docs/D1-CAPACITY.md` (batas plan gratis + ambang kapan owner
harus khawatir), `docs/D1-RETENTION.md` (kebijakan retensi per tabel),
`docs/D1-BACKUP-RESTORE.md` (ekspor + urutan pemulihan).
