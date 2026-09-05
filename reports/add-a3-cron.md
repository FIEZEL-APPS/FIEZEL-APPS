# A3 — Cron yang bisa DIBUKTIKAN (sweep kuota + rollup analytics)

Cabang: `add/a3cron`. Tidak ada bump versi build. Tidak ada push.

## Masalah yang ditutup

Worker `fiezel-api` sudah punya dua Cron Trigger di Cloudflare:

| Ekspresi | Job | Kontrak yang dipikul |
|---|---|---|
| tiap 5 menit (`*/5 * * * *`) | sweep reservasi kuota | slot yang ditahan permintaan yang mati kembali dalam menit, bukan tengah malam |
| `5 17 * * *` (00:05 WIB) | rollup analytics + rotasi pepper | `dau_dedup` DIHAPUS dan pepper DIROTASI |

Keduanya belum pernah terbukti berjalan benar di runtime. Buktinya berhenti di
`console.log`, dan `[observability]` sengaja tidak dinyalakan di plan gratis —
artinya "kapan rollup terakhir sukses?" tidak bisa dijawab. Kalau rollup gagal
diam-diam, klaim privasi "server tidak bisa menyambung hari-1 ke hari-2" bukan
janji lemah, tapi pernyataan palsu tentang data orang.

## Yang ditambahkan

### 1. Tabel bukti `cron_run` (BARU)

`workers/api/migrations/0003_cron.sql` → D1 **`fiezel-core`** (binding `CORE_DB`).

```
cron_run(job, day, started_at, finished_at, ok, rows_affected, error_class)
```

Satu **baris per jalan**, bukan per hari: kalau `PRIMARY KEY (job, day)` dipakai,
keberhasilan pukul 00:10 akan menimpa kegagalan pukul 00:05 — persis bukti yang
paling ingin disembunyikan bug yang dicari.

Kenapa di `fiezel-core` dan bukan `fiezel-stats`:

- `tests/analytics-privacy-test.js` menuntut database analytics memuat TEPAT lima tabel
  yang terdaftar di `analytics-tables.js`;
- rollup yang gagal karena database analytics tidak bisa ditulis **tidak akan
  bisa mencatat kegagalannya sendiri di database yang sama**. Catatan kegagalan
  harus hidup di tempat lain daripada yang bisa gagal bersamanya.

Yang DILARANG masuk tabel, dan ditegakkan gerbang: pesan galat mentah (hanya
`error_class` berenum tertutup) dan data murid apa pun (tidak ada `user_id`,
token, teks soal/jawaban, IP).

### 2. Modul `workers/api/cron-status.js` (BARU)

- `CRON_ERROR_CLASSES` — enum tertutup: `d1_error`, `timeout`, `aborted`,
  `type_error`, `crypto_error`, `binding_missing`, `flag_off`, `unknown`.
  `classifyError()` MEMBACA pesan galat untuk memilih kelas tapi tidak pernah
  mengembalikannya.
- `recordCronRun()` — **fail-soft, tidak pernah melempar**. Observabilitas yang
  bisa menjatuhkan job yang diobservasinya adalah kemunduran. Kalau
  `0003_cron.sql` belum diterapkan, INSERT gagal `D1_UNKNOWN_TABLE`, sweep/rollup
  TETAP JALAN, dan satu `console.warn` menyebut perintah migrasi yang kurang.
  Tabel TIDAK dibuat diam-diam oleh kode aplikasi.
- `withCronRun(db, job, now, fn)` — mencatat SUKSES dan GAGAL, lalu melempar
  ulang galat aslinya apa adanya.
- `skipped` BUKAN sukses: `flag_off` / `no_binding` dicatat `ok=0` dengan kelas
  `flag_off` / `binding_missing`. Menandainya sukses akan membuat dashboard
  menjawab "rollup sukses tadi malam" untuk malam di mana token harian tidak
  pernah dihapus.
- `summarizeCronRuns()` — fungsi MURNI, agregasi di JS (harness D1 tidak
  mendukung `GROUP BY`, dan fungsi murni bisa diuji tanpa D1 sama sekali).
- Retensi: `DELETE FROM cron_run WHERE day < ?` (60 hari) hanya ditempel pada job
  HARIAN. Menempelkannya pada sweep = 288 tulis D1/hari untuk pekerjaan yang
  cukup sekali.

### 3. `GET /api/owner/cron-status` (BARU)

Ringkasan N hari (default 7, maks 60) per job: `lastSuccessAt`, `ok`, `failed`,
`rowsAffected`, `errorClasses` (kelas saja), `staleDays`, plus `expected`
(ekspresi cron + jumlah jalan per hari) dan catatan jujur bahwa `runs:0` berarti
tidak ada bukti cron berjalan, BUKAN tanda sehat. Tabel belum dimigrasi → `200`
dengan `migrated:false`, bukan `500`: owner harus bisa membedakan "cron tidak
jalan" dari "tabel buktinya belum dibuat".

**Gate owner tidak bisa diimpor, dan itu bukan kemalasan.** Gate yang sudah ada
hidup di `workers/owner/index.js` — Worker TERPISAH dengan graf modul sendiri.
Satu `import '../owner/index.js'` akan menarik dashboard HTML + `queries.js` ke
bundle API murid, yaitu bundle yang justru dijaga supaya nol byte owner. Jadi
POLA-nya yang dipakai ulang, sama seperti keputusan `mw-edge.js` untuk `ctEq`:

- secret **`OWNER_TOKEN_HASH`** (sha256 HEX token owner) — nama secret SAMA
  dengan Worker owner, jadi owner memasang satu nilai untuk dua Worker;
- token dikirim di `X-Fiezel-Owner-Token` atau `Authorization: Bearer …`;
- perbandingan **waktu-konstan** memakai `ctEq` yang diimpor dari `mw-edge.js`
  (Worker yang sama, jadi bukan salinan ketiga);
- **FAIL-CLOSED**: tanpa secret, endpoint 403 selamanya. Beda dari `edgeGuard`
  yang punya mode `off` transisi — dan bedanya disengaja: gerbang edge yang
  fail-closed pada deploy pertama mematikan seluruh API murid, endpoint status
  cron yang fail-closed hanya mematikan satu alat internal.
- Satu bentuk penolakan untuk semua sebab (tanpa header / token salah / secret
  belum ada), supaya tidak ada oracle.

### 4. Pagar kewarasan rollup: `collection_ok`

Nol yang jujur dan nol yang menyesatkan terlihat sama di dashboard:

- hari benar-benar sepi → 0 token DAN 0 baris `usage_daily` → `collection_ok=1`;
- pengumpulan rusak → 0 token TAPI `usage_daily` hari itu terisi →
  `collection_ok=0` (`metrics_daily`), dan `summary.collectionOk=false`.

Formula memakai nilai `dau` yang **sudah tersimpan**, bukan hasil hitung jalan
ini:

```js
collectionOk = !(dau === 0 && usageRowsForDay > 0 && storedDau === 0)
```

Alasannya idempotensi: pada jalan kedua `dau_dedup` sudah terhapus, jadi
hitungan pasti 0 sementara `usage_daily` masih terisi. Formula naif akan
membalik `collection_ok` 1 → 0 hanya karena rollup dijalankan dua kali, dan
pagar yang menuduh dirinya sendiri lebih buruk daripada tidak ada pagar. Nilai
`dau` tetap ditulis apa adanya (0); penandanya yang bicara, bukan angkanya yang
dipoles.

### 5. Idempotensi yang diverifikasi (bukan diasumsikan)

- **Rollup**: `setMetricMax` (`MAX(value, excluded.value)`) untuk `dau` masih
  terpasang dan sekarang di-assert gerbang: jalan kedua tidak menurunkan `dau`,
  `wau_lower`, maupun `mau_upper`.
- **Rotasi pepper**: `writePepper` menimpa `rotated_at`, `current`, DAN
  `previous` sekaligus; tidak ada tabel arsip pepper di skema. Gerbang menjalankan
  dua rotasi (jeda 25 jam) dan memindai SELURUH database analytics untuk
  memastikan pepper dua putaran lalu benar-benar lenyap.
- **Sweep**: aman saat kosong (0 lease → 0 tulis, hasil
  `{reaped:0, scanned:0, hasMore:false, malformed:0}`) dan aman dijalankan dua
  kali (`held` turun + baris lease dihapus dalam SATU `db.batch`). Tambahan:
  `charges_json` yang rusak tidak lagi melempar dan menyandera seluruh sweep —
  barisnya dihapus, dihitung di `malformed`, dan `held` diperbaiki
  `reconcileHeld`.

## Gerbang baru: `tests/cron-contract-test.js`

Node murni + `tools/cf-test-harness.js`, mengeksekusi Worker sungguhan lewat
jalur `scheduled()` (sisi yang tidak pernah disentuh gerbang lain). **60 assert,
exit 0**, laporan `CRON-CONTRACT-REPORT.json`. Terdaftar di
`.github/workflows/quality.yml` tepat sesudah `tests/edge-guard-test.js`.

| Butir | Yang dibuktikan |
|---|---|
| (a) | ekspresi 5-menit → sweep saja; ekspresi harian → rollup saja; cron tak dikenal → keduanya (kontrak lama dipertahankan) |
| (b) | rollup dua kali tidak menurunkan `dau`/`wau_lower`/`mau_upper`; jalan kedua tetap tercatat sukses |
| (c) | pepper lama hilang dari seluruh database analytics; hanya `current` + satu `previous`; tidak ada tabel arsip |
| (d) | `cron_run` tercatat untuk sukses DAN gagal (`d1_error`, `flag_off`); tanpa migrasi 0003 job tetap jalan dan tabel tidak dibuat diam-diam |
| (e) | tujuh kolom operasional saja; `error_class` selalu di enum; tidak ada jejak SQL/stack; `userId` identitas uji tidak muncul |
| (f) | `dau_dedup` kosong + `usage_daily` terisi → `collection_ok=0`; hari sepi tidak dituduh rusak; jalan kedua tidak membalik penanda |
| (g) | 403 tanpa kredensial, token salah, cookie murid, dan saat secret belum dipasang; 200 dengan token benar (header atau Bearer); `migrated:false` saat tabel belum ada |
| (h) | rute terdaftar di `route-slots.js`, migrasi + MIGRATIONS.md, gerbang terdaftar di CI, ringkasan murni menolak kelas galat bebas |

## Verifikasi (semua exit 0)

```
tests/cron-contract-test.js      60 assert PASS
tests/cf-wiring-test.js          fail 0
tests/cf-api-contract-test.js    exit 0
tests/analytics-aggregate-test.js fail 0
tests/analytics-privacy-test.js  fail 0
tests/quota-core-test.js         fail 0
tests/regression-test.js         exit 0
tests/install-health-test.js     exit 0
```
Tambahan yang juga dijalankan karena menyentuh berkas yang sama:
`tests/edge-guard-test.js`, `tests/owner-dashboard-test.js`, `tests/no-network-test.js`,
`tools/cf-test-harness.js` — semuanya exit 0. `node --check` bersih untuk semua
berkas yang diubah.

## Berkas yang diubah

BARU:
- `workers/api/migrations/0003_cron.sql`
- `workers/api/cron-status.js`
- `tests/cron-contract-test.js`
- `reports/add-a3-cron.md`

DIUBAH:
- `workers/api/analytics/rollup.js` — pagar `collection_ok`, catatan idempotensi
  dan penghapusan pepper.
- `workers/api/analytics/analytics-store-d1.js` — `SQL.countUsageRows` +
  `countUsageRows()`.
- `workers/api/quota/quota-store-d1.js` — sweep: jalur kosong eksplisit +
  `charges_json` rusak dilewati, bukan melempar.
- `workers/api/route-slots.js` — SLOT 6 mendaftarkan `ROUTES` dari
  `cron-status.js`.
- `workers/api/migrations/MIGRATIONS.md` — baris `0003_cron.sql`, alasan
  pemilihan database, perintah penerapan.
- `.github/workflows/quality.yml` — `node tests/cron-contract-test.js`.
- `tests/analytics-aggregate-test.js` — tiruan D1 di gerbang itu **melempar untuk SQL
  yang tidak dikenalnya**, jadi `SQL.countUsageRows` harus ditambahkan sebagai
  satu `case`. Ini perubahan pada TIRUAN, bukan pada assert: tidak ada satu pun
  assert yang dilonggarkan.

### Dua berkas yang instruksi meminta jangan disentuh

- `workers/api/index.js` — **TIDAK disentuh sama sekali.**
- `workers/api/route-wiring.js` — **disentuh minimal**: satu baris `import
  { withCronRun, CRON_JOBS }` dan dua pemanggilan job di `runScheduled` dibungkus
  `withCronRun(quotaDb(env), …)`. Tidak bisa dihindari: `runScheduled` adalah
  satu-satunya tempat yang tahu job mana yang dijalankan cron mana. Pembungkusnya
  tidak mengubah nilai balik job dan tidak menelan galat (mencatat lalu melempar
  ulang), jadi `try/catch` per job tetap satu-satunya penentu bentuk hasil —
  `tests/cf-wiring-test.js` bab D tetap hijau tanpa perubahan.

## MIGRASI UNTUK MASTER — perintah yang harus dijalankan owner

Satu perintah, satu database. Jalankan dari `workers/api`:

```bash
cd workers/api

# WAJIB: tabel bukti cron di database inti
wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql
```

- Database: **`fiezel-core`** (binding `CORE_DB`). BUKAN `fiezel-stats`.
- Idempoten (`CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`), aman
  dijalankan ulang. Ganti `--remote` dengan `--local` untuk `wrangler dev`.
- `wrangler d1 migrations apply` TIDAK dipakai (`migrations_dir` sengaja tidak
  ada; alasannya di `migrations/MIGRATIONS.md`).

Secret yang harus dipasang supaya endpoint status bisa dibuka:

```bash
# sha256 HEX dari token owner — HASH, bukan token
printf '%s' 'TOKEN-OWNER-ANDA' | sha256sum        # ambil kolom pertama
wrangler secret put OWNER_TOKEN_HASH              # tempel hash-nya
```

Tanpa secret ini endpoint tetap 403 (fail-closed) dan sisa sistem tidak
terpengaruh.

Verifikasi setelah deploy:

```bash
# tabel ada
wrangler d1 execute fiezel-core --remote --command "SELECT name FROM sqlite_master WHERE name='cron_run'"

# sesudah menunggu satu siklus 5 menit: harus ada baris quota_sweep
wrangler d1 execute fiezel-core --remote --command "SELECT job, day, ok, rows_affected, error_class FROM cron_run ORDER BY started_at DESC LIMIT 10"

# ringkasan lewat HTTP
curl -H "X-Fiezel-Owner-Token: TOKEN-OWNER-ANDA" https://api.fiezel.my.id/api/owner/cron-status
```

Yang harus dicurigai saat membaca hasilnya: `runs:0` (cron mungkin dicabut di
dashboard Cloudflare), `failed` yang tidak pernah naik sama sekali (curigai
pencatatannya, bukan kesehatan job), dan `rowsAffected` rollup yang nol
terus-menerus (berarti tidak ada token harian yang pernah dihapus).

## Yang JUJUR belum dibuktikan

Gerbang ini membuktikan kontrak cron di runtime PALSU (harness D1 in-memory,
jam disuntik). Ia **tidak** membuktikan bahwa Cloudflare benar-benar memicu kedua
cron di produksi — itu hanya bisa dibuktikan oleh baris `cron_run` sungguhan
setelah `0003_cron.sql` diterapkan dan Worker dideploy. Sampai baris itu ada,
status yang benar adalah "belum terbukti", bukan "sehat".
