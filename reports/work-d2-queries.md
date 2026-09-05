# D2q — kueri dashboard owner disesuaikan dengan skema D1 yang benar-benar ada

Branch: `work/d2q`. Tidak di-push. Tidak ada bump versi build.
Berkas yang disunting: `workers/owner/queries.js`, `workers/owner/index.js`,
`tests/owner-dashboard-test.js`, `tests/d1-schema-contract-test.js`, `tools/d2-queries-red-proof.js` (baru).
`workers/api/`, `features/`, `app.js`, `sw.js`, `core-config.js`, `coordination/` hanya DIBACA.

## 0. Ringkas: apa yang sebenarnya rusak

`queries.js` paket sebelumnya ditulis untuk skema yang tidak ada. Ia mengharapkan
`metrics_daily` bentuk LEBAR (satu kolom per metrik) plus tabel `retention_cohort` dan
`cost_daily`. Tidak satu pun dari itu ada. Cacatnya tidak terlihat karena setiap tabel masih
kosong, jadi setiap kueri mengembalikan nol baris tanpa pernah menyentuh kolom yang tidak ada.
Begitu event pertama masuk, D1 akan mulai melempar dan setiap panel berbunyi "pengukuran tidak
tersedia" — owner akan menyimpulkan analytics rusak padahal data masuk dengan baik.

Sekarang seluruh jalur baca berjalan di atas lima tabel yang nyata, dan ada gerbang tanpa
jaringan yang membuktikan itu dengan mem-parse DDL migrasi.

## 1. Bentuk NYATA tiap tabel (otoritas: berkas migrasi, bukan komentar di kode)

Otoritas: `workers/api/migrations/0001_quota.sql` dan `0002_analytics.sql`.
Bentuk di bawah bukan hasil pembacaan manual — ia diekstrak oleh parser DDL di
`tests/d1-schema-contract-test.js` dan tercetak di `D1-SCHEMA-CONTRACT-REPORT.json`
(check `owner_queries_kolom_ada_di_ddl` → `bentuk_tabel_menurut_ddl`).

Database analytics `fiezel-stats` (`c712000c-aab9-4a1d-b43d-e6d4c9b36ee8`, binding `ANALYTICS`) —
TEPAT lima tabel:

| Tabel | Kolom sebenarnya | Kunci | Dipakai dashboard |
|---|---|---|---|
| `metrics_daily` | `day TEXT`, `metric TEXT`, `value INTEGER` | PK(`day`,`metric`), WITHOUT ROWID | YA |
| `usage_daily` | `day TEXT`, `bucket TEXT`, `count INTEGER` | PK(`day`,`bucket`) | YA |
| `retention_daily` | `cohort_day TEXT`, `day_index INTEGER`, `count INTEGER` | PK(`cohort_day`,`day_index`) | YA |
| `dau_dedup` | `day TEXT`, `token TEXT` | — | TIDAK (token per-perangkat) |
| `pepper_state` | `id`, `rotated_at`, `current`, `previous` | — | TIDAK (bahan rahasia HMAC) |

Tiga konsekuensi yang mengubah seluruh isi `queries.js`:

1. **Bentuk PANJANG, bukan lebar.** `metrics_daily` tidak punya kolom `dau`, `answers`, dan
   seterusnya. Setiap agregasi butuh `WHERE metric = ?` atau `metric IN (...)` lalu diputar
   (pivot) menjadi objek di JavaScript. Kolom seperti `visitors`, `registered_total`, atau
   `retained_total` yang dirujuk versi lama tidak akan pernah ada.
2. **`retention_daily` tidak punya kolom ukuran kohor.** Tidak ada `cohort_size`, tidak ada
   `cohort_total`, tidak ada `day_offset`. Satu-satunya sumber n= adalah baris `day_index = 0`
   kohor yang sama, jadi kueri retensi WAJIB menyertakan offset 0 walaupun ia tidak dipajang
   sebagai baris tabel.
3. **`usage_daily.bucket` adalah enum tertutup `'dimensi:nilai'`.** Ia satu-satunya jalan untuk
   memecah error AI/TTS dan penolakan kuota. Nol identitas di dalamnya.

`retention_cohort` dan `cost_daily` **tidak ada, dan tidak diusulkan.**
`tests/analytics-privacy-test.js` mengunci database ini pada tepat lima tabel dan larangan itu benar:
tiap tabel tambahan adalah satu permukaan lagi yang bisa membocorkan identitas.

## 2. Nama metrik: mana yang terbukti ditulis server, mana yang tidak

Ini bagian paling berbahaya dari bentuk panjang. `metrics_daily` menerima nama metrik APA PUN
sebagai string, jadi salah nama **tidak pernah menghasilkan galat SQL** — hanya panel yang
kosong selamanya. Tidak ada pemeriksaan skema yang bisa menangkap itu, jadi ada pemeriksaan
tersendiri untuknya (§4, check `setiap_metrik_owner_ditulis_jalur_server`).

### 2a. Metrik yang TERBUKTI ditulis (34 nama, semua dipakai dashboard)

`workers/api/analytics/analytics-core.js`, di dalam `aggregate()`:

| Metrik | Baris | Metrik | Baris |
|---|---|---|---|
| `events_total` | 333 | `answers` | 375 |
| `app_open` | 337 | `answers_ok` | 376 |
| `app_open_with_identity` | 339 | `new_users` | 388 |
| `day_active_reports` | 343 | `ai_calls` | 393 |
| `sessions` | 352 | `ai_tokens_in` | 396 |
| `sessions_ended` | 358 | `ai_success` | 400 |
| `sessions_completed` | 359 | `ai_tokens_out` | 401 |
| `session_answers` | 360 | `ai_failure` | 406 |
| `lessons_started` | 365 | `tts_calls` | 411 |
| `lessons_completed` | 370 | `tts_success` | 416 |
| `tts_cache_hits` | 417 | `tts_cache_misses` | 418 |
| `tts_chars_rendered` | 420 | `tts_failure` | 424 |
| `quota_exhausted` | 429 | `breaker_trips` | 434 |
| `breaker_recoveries` | 439 | | |

`workers/api/analytics/rollup.js`:

| Metrik | Baris | Catatan |
|---|---|---|
| `dau` | 159 | dari `dau_dedup`, tabel yang dashboard TIDAK boleh baca sendiri |
| `collection_ok` | 189 | penanda kesehatan pengumpulan; dasar panel Data quality |
| `wau_lower` | 195 | batas bawah |
| `wau_upper` | 196 | batas atas |
| `mau_lower` | 197 | batas bawah |
| `mau_upper` | 198 | batas atas |
| `wau_mau_is_estimate` | 201 | penanda bahwa WAU/MAU adalah rentang, bukan angka pasti |

SQL penulisnya di `workers/api/analytics/analytics-store-d1.js`: `upsertMetric` baris 35,
`setMetric` 38, `setMetricMax` 45, `upsertUsage` 48, `upsertRetention` 51.
Alasan rotasi pepper (yang membuat dedup lintas hari mustahil) ada di `rollup.js` baris 27–42.

**Konsekuensi yang tidak bisa dihindari:** WAU dan MAU tidak pernah ada sebagai satu angka.
Yang ditulis server adalah sepasang batas. Dashboard sekarang memajangnya sebagai rentang
`bawah–atas`, dan `tests/owner-dashboard-test.js` mengunci bentuk berpasangan itu supaya tidak ada
yang "merapikan" UI dengan satu angka yang mengarang presisi.

### 2b. Bucket `usage_daily` yang terbukti ditulis (14 bucket, 18 dimensi)

Semua di `analytics-core.js`: `platform:` 338/345, `attempts:` 344, `session_mode:` 353,
`session_level:` 354, `duration:` 361, `lesson_domain:` 366, `lesson_done_domain:` 371,
`answer_domain:` 377, `answer_level:` 378, `new_user_kind:` 389, `ai_task:` 394, `ai_model:` 395,
`ai_latency:` 402, `ai_err:` 407, `tts_engine:` 412, `tts_err:` 425, `quota:` 430,
`breaker_open:` 435, `breaker_recover:` 440.

Tiga dimensi terakhir yang penting (`ai_err`, `tts_err`, `quota`) ditulis dengan template
literal — `` bump(u, `ai_err:${e.code}`) `` — bukan string berkutip tunggal, jadi gerbangnya
mencocokkan AWALAN dimensi, bukan string lengkap.

### 2c. Metrik yang dirujuk versi lama dan TIDAK PERNAH ditulis siapa pun

Semua sudah dihapus dari `queries.js`. Masing-masing akan menjadi panel kosong permanen:

`visitors`, `registered_total`, `returning_users`, `wau` (angka tunggal), `mau` (angka tunggal),
`ai_users`, `tts_users`, `ai_err_429`, `ai_err_timeout`, `ai_err_5xx`, `tts_failures`,
`quota_hit_users`, `worker_requests`, `r2_objects`, `r2_bytes`, `backend_errors`,
`offline_late_events`, `tokens_are_estimated`, ditambah seluruh kolom `cost_daily` dan
`retention_cohort`.

Yang bisa dipulihkan, dipulihkan lewat jalan yang benar: pecahan error AI/TTS dan penolakan
kuota sekarang dibaca dari bucket `usage_daily` (`ai_err:*`, `tts_err:*`, `quota:*`), bukan dari
metrik karangan. Panel AI juga membandingkan `ai_failure` dengan jumlah bucket `ai_err:*`; kalau
berbeda, itu sinyal nyata dan bukan bug tampilan.

## 3. Panel yang dihapus atau ditandai tidak-terukur

Katalog lengkapnya ada sebagai konstanta beku `UNMEASURABLE` di `queries.js` dan ikut
dirender di halaman serta dikembalikan di `/api/summary` dan `/api/cost`, jadi batasnya terbaca
owner, bukan hanya terbaca reviewer. Kalimat penandanya persis:
**"tidak bisa diukur dari data yang kita simpan"** beserta sebabnya.

| Panel | Yang dihapus/ditandai | Sebab |
|---|---|---|
| User growth | Perangkat terdaftar (kumulatif) | Hanya ada di tabel identitas `fiezel-core`; dashboard dilarang membacanya (0002 peringatan #1). Yang bisa: jumlah peran `app_open_with_identity` per hari. |
| User growth | Pengunjung unik (dedup lintas hari) | Token perangkat dirotasi tiap 24 jam dan pepper lama dihapus. Dedup lintas hari mustahil secara desain, bukan karena kelalaian. |
| Active users | WAU/MAU sebagai satu angka pasti | Alasan yang sama. Yang tersimpan adalah `wau_lower/upper` dan `mau_lower/upper`. Dipajang sebagai rentang. |
| Retention | Kohor lebih rinci dari `retention_daily` | `retention_daily` hanya menyimpan (cohort_day, day_index, count). Kurva per perangkat atau per segmen butuh menyimpan jejak per-perangkat lintas hari — tepat yang sengaja tidak dilakukan. |
| Infrastructure | Permintaan Worker, objek/byte R2, error backend | Angka ini hidup di Cloudflare GraphQL Analytics API (butuh jaringan + token akun), tidak di D1. Panel disempitkan jadi hanya `breaker_trips`, `breaker_recoveries`, `events_total`. |
| Cost estimation | Biaya per hari yang bisa diaudit | Tidak ada tabel biaya, dan `tests/analytics-privacy-test.js` mengunci database pada lima tabel. Volume penggerak biaya ADA (`tts_chars_rendered`, `ai_tokens_in/out`), jadi biaya dihitung ulang dari tarif in-repo tiap render. Konsekuensi jujur: mengubah tarif ikut mengubah angka historis. Ini estimasi, bukan tagihan. |
| Cost estimation | Biaya infrastruktur, langganan, kredit gratis | Nilainya tidak pernah masuk D1. Baris Infrastruktur, Kredit gratis, dan Biaya-per-perangkat-terdaftar DIHAPUS, tidak dinolkan diam-diam. |
| Quota exhaustion | Jumlah PERANGKAT yang kena batas | Yang dicatat adalah PERISTIWA (`quota_exhausted`) dan jenisnya (`quota:*`), bukan siapa. Satu perangkat yang kena batas 10 kali terhitung 10. |
| AI usage | Penanda token nyata vs proksi (chars ÷ 4) | Penanda per-hari itu tidak ditulis ke `metrics_daily`. Rumus biaya tetap membawa `tokensAreEstimated` sebagai asumsi eksplisit. |
| Data quality | Event terlambat (>24 jam) | Tidak ada metrik yang mencatatnya. Yang bisa: jumlah hari dengan `collection_ok = 0`. |

Yang **tidak** dilakukan: tidak ada tabel baru, tidak ada usulan `cost_daily`, dan tidak ada
satu pun kueri yang berpura-pura bisa menjawab panel di atas.

## 4. Gerbang: mana yang diperluas dan mengapa bukan gerbang baru

Diperluas: **`tests/d1-schema-contract-test.js`** (37 → 38 check).

Alasannya bukan selera. Berkas itu SUDAH memegang tanggung jawab "SQL di kode vs DDL migrasi"
dan sudah punya parser DDL independen (`schemaFromMigrations`, `statements`, `splitTop`,
`closingParen`, `unquoteIdents`). Yang hilang hanyalah CAKUPANNYA: pemindaiannya berhenti di
`workers/api/`, sehingga `workers/owner/` bisa memuat kueri untuk skema yang tidak pernah ada
dan seluruh suite tetap hijau. Itu persis yang terjadi. Menaruh pemeriksaan ini di
`tests/owner-dashboard-test.js` akan memaksa parser DDL KEDUA di repo yang sama, dan dua parser yang
boleh berbeda pendapat tentang bentuk tabel adalah cara paling rapi untuk kehilangan kepercayaan
pada keduanya. Cakupan pemindaian `API_DIR` yang lama tidak diubah; bagian D2q murni tambahan.

Check baru:

| Check | Yang dibuktikan |
|---|---|
| `owner_queries_terbaca` | Pemindai benar-benar membaca ≥10 kueri. Nol kueri terbaca berarti pemindainya buta, bukan berarti kuerinya benar. |
| `owner_queries_tanpa_sambung_string` | Tiap SQL adalah satu literal utuh. SQL yang dirakit dari potongan string hanya terbaca sebagai pecahan, dan gerbang bisa mengaku hijau atas kueri yang tidak pernah ia baca. |
| `skema_stats_tepat_lima_tabel` | Parser DDL melihat tepat lima tabel. Kalau tidak, semua kesimpulan di bawahnya dibangun dari skema yang tidak lengkap. |
| `owner_queries_nol_tabel_di_luar_tiga_agregat` | NOL rujukan ke tabel selain `metrics_daily`, `usage_daily`, `retention_daily`. |
| `owner_queries_tabel_ada_di_ddl` | Tiap tabel yang dirujuk ada di DDL — inilah yang menangkap `retention_cohort`/`cost_daily`. |
| `owner_queries_kolom_ada_di_ddl` | Tiap token pengenal di SQL adalah kolom nyata, alias, atau nama tabel. Ini yang menangkap bentuk LEBAR. |
| `daftar_metrik_owner_terbaca` | Daftar metrik dan bucket benar-benar terekstrak dari `queries.js`. |
| `setiap_metrik_owner_ditulis_jalur_server` | Tiap nama metrik ada sebagai literal di `analytics-core.js`/`rollup.js`. Satu-satunya cara menangkap panel kosong permanen tanpa jaringan. |
| `setiap_dimensi_bucket_owner_ditulis_jalur_server` | Sama, untuk dimensi bucket `usage_daily`. |
| `indeks_stats_berasal_dari_migrasi_yang_sudah_jalan` | Semua indeks yang dipakai berasal dari `0001`/`0002`, bukan dari `0004` yang belum diterapkan. |

Semuanya tanpa jaringan: DDL dari berkas migrasi, kueri dari berkas sumber.

### Perubahan cakupan di `tests/owner-dashboard-test.js` yang perlu dibenarkan

`usage_daily` DIKELUARKAN dari daftar "tabel per-orang yang dilarang". Ini bukan pelemahan.
Larangan lama berdiri di atas `reports/cf-b5-analytics.md` §2.1, yang memuat varian PER-ORANG
bertabel nama sama. Varian itu sengaja tidak pernah dibuat (`0002_analytics.sql` peringatan #2).
Yang ada di produksi adalah `(day, bucket, count)` dengan bucket berenum tertutup — nol
identitas. Gantinya, dua tabel yang MEMANG berbahaya dimasukkan eksplisit ke daftar larangan:
`dau_dedup` (token per-perangkat) dan `pepper_state` (bahan rahasia HMAC). Keduanya ada di
database yang sama, jadi tanpa baris itu tidak ada apa pun yang mencegah dashboard membacanya.
Cakupan lima-tabel yang lengkap ditegakkan di `tests/d1-schema-contract-test.js` langsung terhadap DDL.

Fixture D1 di gerbang itu juga ditulis ulang ke bentuk PANJANG dan dua pabrik stub yang dulu
terpisah disatukan (`makeD1`). Fixture LEBAR yang lama bukan sekadar usang — ia MENGUNCI skema
yang tidak ada, sehingga gerbangnya hijau sementara produksi akan gagal total. Fixture sekarang
juga diassert tidak boleh mengarang metrik: tiap nama metriknya wajib ada di `ALL_METRICS`, dan
`ALL_METRICS` sendiri diassert punya penulis nyata oleh gerbang skema.

## 5. Empat keadaan: satu di antaranya ternyata mustahil terjadi

Pembedaan `measured` / `no-data` / `no-data-in-period` / `unavailable` dipertahankan, dan
diputuskan dari JUMLAH HARI TERROLLUP (`COLLECTION_START.days_total` dan
`PERIOD_DAYS.days_counted`), bukan dari nilai metrik. Alasannya tetap: `COALESCE(SUM(...), 0)`
membuat "tidak ada baris" dan "nilainya nol" tiba sebagai angka yang identik. Metrik yang tidak
punya baris sekarang tetap `undefined` di model dan dicetak sebagai "belum ada pengukuran",
tidak pernah dinolkan.

Tetapi satu temuan harus dinyatakan terang-terangan: **`no-data-in-period` tidak pernah bisa
terjadi di paket sebelumnya.** Rentang periode dijangkarkan pada hari rollup TERAKHIR, jadi
`to` selalu berisi baris dan `days_counted ≥ 1` selama ada data sama sekali. Assert yang
menjaganya juga permisif (`MEASURED || NO_DATA_IN_PERIOD`), sehingga selalu hijau lewat cabang
`MEASURED`. Keadaan yang tidak bisa terjadi bukan pembeda, hanya hiasan.

Dua perbaikan:

1. Rentang periode sekarang dijangkarkan pada **hari WIB sekarang**, bukan pada hari rollup
   terakhir. Nilai kartu "hari terakhir" tetap dijangkarkan pada hari rollup terakhir, karena itu
   memang angka terukur terbaru yang ada. Efek sampingnya justru yang dicari: cron rollup yang
   mati sebulan lalu tidak lagi merender halaman yang tampak mutakhir dan penuh.
2. Spanduk **DATA BASI n HARI** ditambahkan, terpisah dari spanduk keadaan. Halaman bisa
   "terukur" dan tetap basi, dan itu keadaan paling berbahaya: angkanya nyata, hanya saja bukan
   angka hari ini.

Assert-nya diperketat jadi `=== STATE_NO_DATA_IN_PERIOD` plus pemeriksaan bahwa keputusannya
berasal dari `daysTotal > 0` dan `daysCounted === 0`.

Perbaikan kejujuran ketiga, di luar mandat langsung tetapi satu paket dengan retensi: rata-rata
retensi TIDAK dihitung dengan `SUM(count) GROUP BY day_index` di SQL. Cara itu memakai jumlah
SELURUH kohor dalam rentang sebagai penyebut, padahal kohor berumur 3 hari belum mungkin punya
baris D30 — penyebutnya jadi terlalu besar dan retensi tampak lebih buruk daripada kenyataan.
Persentase sekarang dirakit di kode dari baris per-kohor, dengan penyebut hanya kohor yang
benar-benar punya pengamatan di offset itu. Satu kueri lebih sedikit (`RETENTION_ROLLUP`
dihapus), dan angkanya tidak menipu.

## 6. Prasyarat indeks

**NOL prasyarat indeks baru.**

Indeks yang dipakai kueri owner sudah ada di produksi lewat `0002_analytics.sql`:

- `idx_metrics_metric(metric, day)` — dipakai `PERIOD_TOTALS`, `METRIC_PEAK`, `BROKEN_DAYS`, `SERIES`
- `idx_retention_cohort(day_index, cohort_day)` — dipakai `RETENTION`

`0004_indexes.sql` **tidak** dipakai dan tidak boleh diasumsikan ada. Ia juga bukan migrasi
database ini: berkasnya berisi peringatan "JANGAN dijalankan di fiezel-stats" dan seluruh isinya
menyasar `fiezel-core`. Check `indeks_stats_berasal_dari_migrasi_yang_sudah_jalan` menegakkan
bahwa tiap indeks yang dipakai berasal dari `0001`/`0002`, jadi ketergantungan pada migrasi yang
belum diterapkan akan memerahkan gerbang, bukan lolos sebagai asumsi.

`usage_daily` tidak punya indeks tambahan. Kuerinya adalah `WHERE day BETWEEN ? AND ? AND bucket
IN (...)` di atas PK(`day`,`bucket`), jadi ia sudah memakai awalan kunci utama. Kalau nanti ada
kueri yang menyaring `bucket` TANPA `day`, indeks `(bucket, day)` baru menjadi prasyarat — dan
itu harus dinyatakan di paket yang menambahkan kuerinya, bukan diantisipasi sekarang.

## 7. Matriks bukti merah

`node tools/d2-queries-red-proof.js` → **PASS 7/7**, laporan lengkap di
`reports/d2-queries-red-proof.json`. Setiap kasus: suntik cacat ke berkas nyata → jalankan
gerbang → wajib exit ≠ 0 DAN nama check yang benar muncul → pulihkan berkas → verifikasi sha256
kembali identik. Setelah semua pemulihan, kedua gerbang dijalankan ulang dan wajib hijau.

| Kasus | Suntikan | Gerbang | Exit | Check yang memerah |
|---|---|---|---|---|
| `tabel_tidak_ada` | `FROM retention_daily` → `FROM retention_cohort` | d1-schema-contract | 1 | `owner_queries_tabel_ada_di_ddl` |
| `kolom_tidak_ada` | tambah `metric_name` ke SELECT | d1-schema-contract | 1 | `owner_queries_kolom_ada_di_ddl` |
| `tabel_terlarang` | `FROM usage_daily` → `FROM dau_dedup` | d1-schema-contract | 1 | `owner_queries_nol_tabel_di_luar_tiga_agregat` |
| `metrik_tanpa_penulis` | tambah `'visitors'` ke `SERIES_METRICS` | d1-schema-contract | 1 | `setiap_metrik_owner_ditulis_jalur_server` |
| `sql_disambung` | pecah `LATEST_DAY` jadi dua literal | d1-schema-contract | 1 | `owner_queries_tanpa_sambung_string` |
| `keadaan_dari_nilai` | keadaan diputuskan dari `events_total`, bukan `days_total` | owner-dashboard | 1 | assert keadaan kosong |
| `empat_keadaan_jadi_tiga` | `daysCounted <= 0` → `daysCounted < 0` | owner-dashboard | 1 | assert `no-data-in-period` |

Dua kasus pertama adalah cacat ASLI paket sebelumnya, bukan cacat karangan yang mudah ditangkap.
Kasus `metrik_tanpa_penulis` memakai `visitors`, metrik yang benar-benar dirujuk `queries.js`
versi lama dan tidak pernah ditulis siapa pun.

Selama menyusun matriks ini, dua kasus awalnya TIDAK memerah dan itu mengungkap lubang nyata di
gerbang, bukan kesalahan skrip: (a) `tests/owner-dashboard-test.js` menerima `STATE_MEASURED` sebagai
jawaban sah untuk periode di luar rentang, dan (b) keadaan `no-data-in-period` mustahil terjadi
secara struktural. Keduanya ditutup di §5. Ini juga alasan matriks bukti merah dijalankan
sebelum laporan ditulis, bukan sesudah.

## 8. Verifikasi

Semua exit 0:

```
tests/owner-dashboard-test.js        0
tests/owner-edge-guard-test.js       0
tests/analytics-privacy-test.js      0
tests/d1-schema-contract-test.js     0   (38/38)
tests/no-network-test.js             0
tests/secret-scan-test.js            0
tests/gate-registry-test.js          0
tests/coordination-guard-test.js     0
tests/regression-test.js             0
tests/install-health-test.js         0
tools/d2-queries-red-proof.js  0   (PASS 7/7)
```

## 9. Yang masih terbuka

- Belum ada pemancar analytics di klien. Seluruh perbaikan ini baru terbukti benar terhadap
  DDL dan terhadap fixture, belum terhadap data produksi. Yang bisa dijamin: kueri tidak lagi
  akan melempar begitu data masuk. Yang tidak bisa dijamin dari sini: angkanya masuk akal.
- Tarif biaya masih in-repo dan dipakai ulang untuk seluruh periode historis. Selama tidak ada
  tabel biaya (dan tidak boleh ada), angka historis akan ikut berubah bila tarif diubah. Ini
  sudah ditandai eksplisit di halaman dan di `/api/cost`, bukan disembunyikan.
- `wau_mau_is_estimate` dibaca tetapi belum dipakai untuk mengubah tampilan. Nilainya selalu 1
  di jalur penulis saat ini, jadi menambah cabang UI untuknya sekarang hanya akan menambah kode
  mati.
