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
```

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

Tidak ada berkas `0003_*`. Nomor itu dilewati dengan sengaja supaya nomor migrasi
A6/D1 sama dengan nomor paket kerjanya; jangan "mengisi" 0003 di kemudian hari.

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
