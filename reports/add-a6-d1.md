# A6/D1 — Telaah skema D1: indeks, pertumbuhan, retensi, backup, gerbang

Cabang: `add/a6d1`. Tidak ada push. Tidak ada bump versi build.

## Ringkasan satu paragraf

Semua kueri panas di `quota-store-d1.js` dan `analytics-store-d1.js` **sudah**
punya indeks yang mendukungnya — termasuk dua yang secara khusus diminta
ditelaah. Jadi `0004_indexes.sql` bukan migrasi "menambah indeks yang kurang",
melainkan migrasi **menggabungkan indeks yang tumpang tindih**: tiga indeks di
`quota_reservation` jadi dua, dan `quota_daily(day)` jadi `(day, user_id)` supaya
kueri cron paling sering jadi COVERING. Hasil terukurnya: baris tertulis per
panggilan AI/TTS turun dari 10 ke 8, yang menggeser ambang plan gratis dari
± 588 ke ± 704 pengguna aktif harian tanpa mengubah satu baris kode. Retensi
sudah ditulis lengkap per tabel dengan `DELETE` batched, dan temuan paling
penting dari pekerjaan ini bukan soal indeks: **tiga pembersih retensi belum
terpasang sama sekali**, jadi `quota_daily`, `session`, dan `anon_issue` tumbuh
selamanya sampai itu dikerjakan.

## 1. Telaah indeks — bukti, bukan pendapat

Metode: skema nyata dari `workers/api/migrations/*.sql` dimuat ke SQLite,
lalu `EXPLAIN QUERY PLAN` dijalankan untuk setiap kueri yang benar-benar ada di
kode, sebelum dan sesudah `0004`. Skrip + hasil (regenerable):
`analysis/a6-d1-index-plans.py` → `analysis/a6-d1-index-plans.json`.

| Kueri panas | Rencana SEBELUM 0004 | Putusan |
|---|---|---|
| `UPDATE quota_daily … WHERE user_id=? AND day=?` (reserve/commit/rollback) | `SEARCH … USING INDEX sqlite_autoindex_quota_daily_1 (user_id=? AND day=?)` | **Sudah optimal lewat PRIMARY KEY. Tidak ada indeks yang kurang. Tidak ditambah apa pun.** |
| Sweep `quota_reservation WHERE expires_at <= ? ORDER BY expires_at` | `SEARCH … USING INDEX idx_quota_reservation_expires (expires_at<?)` | **Sudah optimal. Indeks dipertahankan apa adanya.** |
| `SELECT user_id FROM quota_daily WHERE day=?` (reconcileHeld, tiap 5 menit) | `SEARCH … USING INDEX idx_quota_daily_day` + ambil baris tabel per user | Diperbaiki: `(day, user_id)` → `USING COVERING INDEX` |
| `SELECT * FROM quota_reservation WHERE day=?` | `idx_quota_reservation_day` | Dilayani `(day, user_id)` |
| `SELECT * FROM quota_reservation WHERE user_id=? AND day=?` | `idx_quota_reservation_user_day` | Dilayani `(day, user_id)` juga (kesetaraan penuh, SQLite tidak peduli urutan di WHERE) |
| Semua kueri `metrics_daily` / `usage_daily` / `retention_daily` / `dau_dedup` / `pepper_state` | `SEARCH … USING (COVERING) INDEX sqlite_autoindex_*` | **Nol indeks ditambahkan di `fiezel-stats`.** |
| `UPDATE identity SET issue_ip_hmac=NULL WHERE …` (sekali sehari) | `SCAN identity` | **Sengaja dibiarkan memindai.** Sekali sehari, sebesar jumlah identitas; indeks di kolom yang ditulis tiap penerbitan identitas = pajak tulis di jalur panas. |

Yang **tidak** ditambahkan dan alasannya ada di kepala `0004_indexes.sql`:
`identity(created_at)`, `session(revoked_at)`, dan indeks apa pun di
`fiezel-stats`. Prinsipnya satu: indeks tanpa kueri = baris tertulis tambahan
setiap upsert, dan plan gratis membatasi tepat pada baris tertulis.

Biaya jujur `0004`: `quota_daily` 154,2 → **191,7 B/baris** (indeks lebih lebar);
`quota_reservation` 275,3 → **257,2 B/baris** (satu indeks lebih sedikit). Nol
tambahan baris tertulis untuk `quota_daily`, karena `day` dan `user_id` tidak
pernah di-UPDATE sesudah baris dibuat.

Migrasi ini idempoten (`CREATE INDEX IF NOT EXISTS` + `DROP INDEX IF EXISTS`),
urutannya sengaja "buat pengganti dulu, buang yang lama sesudahnya", dan blok
ROLLBACK-nya ada di dalam berkas. Nol data hilang di kedua arah — indeks bukan
data.

## 2. Pertumbuhan dengan angka → `docs/D1-CAPACITY.md`

Batas plan gratis diverifikasi dari dokumentasi Cloudflare, dengan URL di dalam
dokumen: 100.000 baris ditulis/hari dan 5 juta baris dibaca/hari per **akun**
([pricing](https://developers.cloudflare.com/d1/platform/pricing/)), 500 MB per
database, Time Travel 7 hari, dan "each individual D1 database is inherently
single-threaded" ([limits](https://developers.cloudflare.com/d1/platform/limits/)).

Sesudah `0004`: **142 baris ditulis per pengguna aktif per hari** (120 core + 22
stats), dari 170 sebelumnya.

| Pengguna aktif/hari | Baris ditulis/hari | % batas gratis |
|---:|---:|---:|
| 100 | 14.200 | 14% |
| 1.000 | 142.000 | **142% — lewat** |
| 5.000 | 710.000 | 710% |

- Ambang tulis: **± 704 pengguna aktif/hari** (sebelum 0004: ± 588).
- Ambang baca: ± 13.400 pengguna. **Batas tulis mengikat ± 19× lebih dulu.**
- Penyimpanan dengan retensi pada 5.000 pengguna: `fiezel-core` ± 118 MB dari
  500 MB; `fiezel-stats` ± 1,8 MB/tahun.
- Tanpa retensi: +1,94 MB/hari → 500 MB dalam **± 8 bulan**.
- Kapan khawatir: **300** pengguna aktif (pantau harian), **420** (siapkan
  Workers Paid US$5/bulan), **704** (mati). Reset kuota 00:00 UTC = **07:00 WIB**,
  jadi kalau batas tembus pukul 21:00 WIB matinya menutup jam belajar malam DAN
  pagi. Sesudah upgrade, tagihan D1 tambahan pada 5.000 pengguna = **US$0**;
  yang dibayar hanya langganan US$5.

Angka 14 operasi/pengguna/hari adalah **asumsi**, dan seluruh tabel linear
terhadapnya. Itu dinyatakan eksplisit di §6 dokumen kapasitas, bukan disembunyikan.

## 3. Retensi → `docs/D1-RETENTION.md`

| Tabel | Retensi | Sudah jalan? |
|---|---|---|
| `quota_reservation` | TTL 30 detik, sweep tiap 5 menit | **YA** (cron `*/5`) |
| `dau_dedup` | 0 hari (dihapus sesudah rollup) | **YA** (cron `5 17`) |
| `quota_daily` | **90 hari** (`day < cutoff`, tidak pernah `<=`) | **TIDAK** |
| `session` | kedaluwarsa + 1 hari; dicabut + 7 hari | **TIDAK** |
| `anon_issue` | 2 hari | **TIDAK** |
| `identity.issue_ip_hmac` | di-NULL-kan ≤ 24 jam (baris tidak dihapus) | **TIDAK** |
| `identity` (baris) | permanen — dihapus hanya atas permintaan | n/a |
| `metrics_daily`/`usage_daily`/`retention_daily` | permanen (agregat, ± 1,8 MB/tahun) | n/a |

Empat baris `TIDAK` itu adalah temuan paling penting dari paket ini dan sudah
ditandai P0 di dokumennya. Pelaksananya cron yang **sudah ada** (`5 17 * * *` =
00:05 WIB) memakai binding `CORE_DB` langsung; tidak perlu trigger baru.

Aturan yang ditegakkan gerbang: setiap `DELETE` memakai bentuk
`WHERE rowid IN (SELECT rowid … LIMIT n)` supaya tidak bergantung pada
`SQLITE_ENABLE_UPDATE_DELETE_LIMIT`, maksimum 20 batch per eksekusi cron, dan
**tidak boleh** ada `ATTACH`/join antar dua database.

Benturan yang dinyatakan terbuka, bukan disembunyikan:
`quota_daily` **tidak boleh** dipangkas sampai hari ini (`<` bukan `<=`) karena
menghapus baris hari berjalan = mengembalikan kuota gratis; retensi `session`
memakai `expires_at`, bukan aktivitas, karena tidak ada kolom aktivitas; dan
menghapus baris `identity` bukan bagian retensi otomatis karena `sub` adalah
satu-satunya pengait entitlement.

## 4. Backup & pemulihan → `docs/D1-BACKUP-RESTORE.md`

Dinyatakan tegas di paling atas dokumen, dan digerbangi supaya tidak bisa hilang
diam-diam: **progres belajar murid TIDAK ada di D1** (sumber kebenarannya
`localStorage` murid; buktinya bucket `USERDATA` tidak dipasang di
`wrangler.toml` dan tidak ada satu tabel pun yang menyimpan jawaban/level).
Kehilangan D1 = kehilangan identitas, kuota, dan statistik.

Konsekuensi nyata per murid ditabelkan: cookie `fz_id` jadi pengunjung baru
(progres utuh), kuota kembali penuh (rugi owner, bukan murid), klaim akun Puter
harus diulang dan akan **membuat identitas baru** karena `ux_identity_legacy`
ikut hilang, semua perangkat "logout". Satu-satunya kerugian yang benar-benar
tak tergantikan adalah **agregat analytics** — tidak ada satu murid pun yang
menyimpan angka DAU.

Isi prosedurnya: dua lapis (Time Travel 7 hari — bukan backup portabel, tidak
melindungi database yang dihapus; plus ekspor `.sql` manual), `wrangler d1 export`
untuk core **harian** dan stats **mingguan** pada 03:30–03:45 WIB karena ekspor
memblokir permintaan lain ke database itu, **dua berkas terpisah selamanya**
(menggabungkan ekspor = satu perintah dari melahirkan database gabungan tempat
join terlarang jadi mungkin), tidak pernah masuk Git (berisi HMAC identitas dan
`sid`), rotasi 14 harian + 8 mingguan + checksum, dan urutan pemulihan:

```
0 hentikan tulis → 1 pilih jalur (Time Travel vs ekspor) → 2 core diimpor
→ 3 skema+privasi DIBUKTIKAN (tools/d1-schema-check.mjs) → 4 binding & deploy
→ 5 bersihkan lease yatim → 6 stats diimpor + SEGERA purge dau_dedup
→ 7 nyalakan fitur & cron
```

Langkah 6 bukan kerapian: ekspor lama memuat token dedup harian, jadi memulihkan
`fiezel-stats` menghidupkan kembali token perangkat yang seharusnya sudah dihapus
tiap malam — kontrak privasi bocor lewat pintu belakang bernama "backup" kalau
langkah itu dilewatkan. Latihan pemulihan kuartalan ada di §5 dokumen.

## 5. `tools/d1-schema-check.mjs`

Nol jaringan (digerbangi: tidak ada `fetch`, tidak ada `node:net/http/https/tls`).
Ia membaca STDIN dari `wrangler d1 execute … --json --command "SELECT type, name,
tbl_name, sql FROM sqlite_master"` dan membandingkannya dengan skema harapan yang
dibangun dengan **menerapkan** berkas migrasi berurutan — jadi `DROP INDEX` di
`0004` ikut diperhitungkan, dan indeks lama yang masih hidup di produksi
terdeteksi sebagai `indeks_berlebih`.

Yang dibandingkan: nama tabel, kolom per tabel, nama indeks, kolom indeks,
UNIQUE, klausa WHERE indeks partial, plus kontrak privasi per database. Keluar
0 = cocok, 1 = ada beda (disebut satu per satu), 2 = masukan tidak terbaca.
Bentuk keluaran wrangler yang berbeda-beda ditangani. Diverifikasi terhadap
skema nyata hasil eksekusi ketiga berkas migrasi core (5 tabel, 8 indeks) dan
migrasi stats (5 tabel, 2 indeks): keduanya `COCOK`.

Yang **tidak** dibandingkan, dan itu batas yang dinyatakan di kepala berkas: tipe
kolom, DEFAULT, urutan kolom, dan trigger.

## 6. Gerbang `d1-schema-contract-test.js` — 27/27 LULUS

Terdaftar di `.github/workflows/quality.yml` tepat sesudah `node cf-wiring-test.js`.
Node murni, nol dependensi, nol jaringan, laporan ke `D1-SCHEMA-CONTRACT-REPORT.json`.
Parser DDL-nya sengaja ditulis ulang terpisah dari parser di
`tools/d1-schema-check.mjs`; kalau keduanya berbagi kode, bug parser lolos di
kedua sisi sekaligus.

Yang dijaga: setiap tabel yang dipakai kode ada di migrasi; dua database tidak
punya tabel bersama; nol kolom penghubung di DDL analytics dan nol kolom
analytics di DDL kuota; nol `REFERENCES` lintas domain dan nol `ATTACH DATABASE`
di mana pun; setiap indeks baru punya kueri nyata yang menyentuh tabelnya dan
menyaring dengan kolom pertamanya; nol `DELETE`/`DROP TABLE`/`TRUNCATE` liar di
migrasi baru maupun di blok SQL dokumen retensi; `DROP INDEX` hanya boleh dengan
baris `-- REDUNDANT-BY:` yang menunjuk indeks pengganti di berkas yang sama, di
tabel yang sama, dengan kolom SUPERSET; dan sepuluh uji fixture yang membuktikan
pembanding skema bisa **MERAH** (tabel hilang, kolom hilang, indeks hilang,
kolom indeks beda, indeks berlebih, tabel analytics di database kuota, kolom
penghubung di database analytics, masukan rusak → keluar 2).

`breaker_events` ditangani terbuka: kode `breaker.js` memuat `INSERT` ke tabel
itu, tetapi tidak ada migrasi yang membuatnya. Tabelnya **tidak** dibuat (bayar
baris tertulis untuk fitur yang belum hidup), dan gerbang mencatatnya sebagai
DORMAN **serta akan MERAH** begitu ada pemanggil yang mengoper handle D1 ke
`createStore()` tanpa migrasi. `session` dan `anon_issue` sebaliknya: DDL-nya
sudah jalan di produksi tetapi belum ada kode yang menulisnya — diinventarisasi
eksplisit, dan retensinya tetap wajib karena tabelnya sudah ada.

Uji mutasi (dijalankan lalu dibatalkan): menyuntikkan indeks tanpa kueri,
`DELETE FROM session;` tanpa WHERE, dan `DROP INDEX` tanpa `REDUNDANT-BY` →
gerbang MERAH pada tiga pemeriksaan yang tepat. Gerbang yang belum pernah merah
tidak membuktikan apa pun.

## 7. Verifikasi

| Gerbang | Exit |
|---|---|
| `d1-schema-contract-test.js` (baru, 27/27) | **0** |
| `cf-wiring-test.js` | **0** |
| `quota-core-test.js` | **0** |
| `analytics-privacy-test.js` | **0** |
| `regression-test.js` | **0** |
| `install-health-test.js` | **0** |

Versi build **tidak** diubah. `CF-WIRING-REPORT.json` dikembalikan ke keadaan
semula karena satu-satunya perbedaannya adalah UUID dan pepper acak per
eksekusi — bukan perubahan bermakna.

## 8. Yang TIDAK dikerjakan paket ini

1. **Pembersih retensi belum ditulis sebagai kode.** Kebijakan + SQL sudah
   final di `docs/D1-RETENTION.md`, tetapi menempelkannya ke handler cron
   `5 17 * * *` adalah perubahan `workers/api/index.js` di luar lingkup "analisis
   + migrasi baru". Selama itu belum dikerjakan, tiga tabel tumbuh selamanya.
2. **`0004_indexes.sql` belum diterapkan ke produksi.** Perintahnya ada di
   `MIGRATIONS.md`; yang menjalankannya owner, dan hasilnya harus dibuktikan
   dengan `tools/d1-schema-check.mjs`.
3. **Belum ada satu pun angka produksi.** Semua estimasi baris/byte berasal dari
   pengukuran SQLite lokal dan asumsi pemakaian. Angka "rows written" sungguhan
   hanya ada di dasbor D1.
4. **Ekspor backup masih manual.** Otomatisasi ke R2 lewat REST API + Workflows
   disebut sebagai jalur, bukan dikerjakan.
5. **Tidak ada uji pemulihan nyata.** Prosedurnya tertulis dan bisa dijalankan,
   tetapi belum pernah dijalankan terhadap database Cloudflare sungguhan. Backup
   yang belum pernah dipulihkan belum terbukti sebagai backup.

## Berkas

| Berkas | Status |
|---|---|
| `workers/api/migrations/0004_indexes.sql` | baru (hanya `fiezel-core`) |
| `workers/api/migrations/MIGRATIONS.md` | ditambah bagian 0004 + verifikasi skema |
| `docs/D1-CAPACITY.md` | baru |
| `docs/D1-RETENTION.md` | baru |
| `docs/D1-BACKUP-RESTORE.md` | baru |
| `tools/d1-schema-check.mjs` | baru |
| `d1-schema-contract-test.js` | baru (gerbang) |
| `D1-SCHEMA-CONTRACT-REPORT.json` | baru (keluaran gerbang) |
| `analysis/a6-d1-index-plans.py` / `.json` | baru (bukti EXPLAIN QUERY PLAN, regenerable) |
| `.github/workflows/quality.yml` | gerbang didaftarkan |
