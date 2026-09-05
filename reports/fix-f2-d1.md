# F2/D1 — `tests/d1-schema-contract-test.js` merah setelah merge: dua cacat, dua sebab berbeda

Branch: `fix/f2d1` · commit: lihat `git log fix/f2d1` · **tanpa bump versi build**, **tanpa push**.

Sebelum: `d1-schema-contract-test: GAGAL 2/27`.
Sesudah: `d1-schema-contract-test: LULUS 28/28` (satu pemeriksaan BARU ditambahkan).

Tabrakan dua paket kerja: gerbang skema (A6/D1) lahir sebelum migrasi cron (A3)
mendarat. Keduanya hijau sendiri-sendiri; yang tidak ada adalah satu pihak yang
memaksa keduanya melihat direktori migrasi yang SAMA.

---

## Kegagalan 1 — `setiap_tabel_yang_dipakai_kode_ada_di_migrasi`

### Sebabnya bukan `cron_run`, bukan `0003`, bukan pola `CREATE TABLE`

`workers/api/migrations/0003_cron.sql` memang ada dan memang memuat
`CREATE TABLE IF NOT EXISTS cron_run (...)`, dan pola itu **dikenali** parser
(`0001_identity.sql` memakai bentuk yang persis sama). Berkasnya juga masuk glob
`listFiles(MIG_DIR, '.sql')` yang dipakai bagian lain gerbang.

Yang salah: parser **tidak pernah membuka berkasnya**. Daftar berkas per database
ditulis TANGAN sebagai literal di dua tempat:

```js
// tests/d1-schema-contract-test.js (lama)  DAN  tools/d1-schema-check.mjs (lama)
const FILES_BY_DB = {
  core: ['0001_identity.sql', '0001_quota.sql', '0004_indexes.sql'],
  stats: ['0002_analytics.sql']
};
```

`0003_cron.sql` tidak ada di sana. Jadi "skema harapan" dibangun dari 4 berkas →
10 tabel, tanpa `cron_run`; lalu pemindai SQL kode menemukan `cron_run` dipakai
di `workers/api/cron-status.js` dan gerbang menuduh migrasinya tidak ada.
`tabel_migrasi` di laporan lama memuat 10 nama, bukan 11 — itu petunjuknya.

Arah kebalikannya jauh lebih berbahaya dan **tidak** memerahkan apa pun: berkas
migrasi yang lupa didaftarkan **tidak diperiksa sama sekali** — nol tabelnya, nol
indeksnya, nol pemeriksaan privasinya — dan gerbang tetap hijau. Gerbang hijau
untuk hal yang tidak pernah ia baca adalah kegagalan yang paling mahal.

### Perbaikan

1. **Peta berkas→database diturunkan, tidak ditulis tangan.** Sumber kebenarannya
   perintah penerapan resmi di `workers/api/migrations/MIGRATIONS.md`:
   `wrangler d1 execute <fiezel-core|fiezel-stats> --remote --file=migrations/<berkas>`.
   Dokumen itu sudah wajib benar (`tests/cron-contract-test.js` butir h dan
   `tests/cf-wiring-test.js` sudah memeriksa isinya), jadi memakainya sebagai sumber
   membuat "dokumentasi benar" dan "gerbang membaca semua migrasi" menjadi satu
   fakta, bukan dua disiplin terpisah.
2. **Pemeriksaan baru `semua_berkas_migrasi_terbaca`** (inilah cek ke-28). Merah bila:
   - `jumlah berkas terpetakan != jumlah berkas .sql di direktori`;
   - ada berkas `.sql` di direktori yang tidak terpetakan (`tidak_terpetakan`);
   - ada berkas terpetakan yang tidak ada di direktori;
   - ada berkas terpetakan ganda;
   - ada berkas yang terparsir **nol** pernyataan dikenali (parse mati diam-diam);
   - ada pernyataan DDL yang tidak dikenali parser (`pernyataan_tak_dikenali`) —
     jadi bentuk `CREATE TABLE` gaya baru pun tidak bisa lolos tanpa terlihat.
3. **Parser dikeraskan** untuk kutip identifier (`"x"`, `` `x` ``, `[x]`) supaya
   dugaan "bentuk kutip berbeda" tidak pernah menjadi sebab berikutnya. (Bukan
   sebab kegagalan kali ini; dibuktikan oleh butir 6 di atas yang sekarang akan
   melaporkannya alih-alih diam.)
4. **`tools/d1-schema-check.mjs` diperbaiki dengan cacat yang sama**, memakai
   implementasi TERPISAH (disiplin repo: dua parser independen supaya satu bug
   tidak lolos di kedua sisi). Bila ada `.sql` tak terpetakan, ia **keluar 2**
   ("masukan tidak bisa dipercaya") alih-alih membandingkan skema separuh dan
   melaporkan "cocok".
5. Gerbang tidak lagi **meledak** ketika pembanding keluar 2: `bedaOf()`/`kindsOf()`
   membuat pemeriksaan fixture tetap MERAH tetapi dengan sebab yang terbaca
   (sebelumnya `TypeError: Cannot read properties of undefined (reading 'map')`).

---

## Kegagalan 2 — `setiap_indeks_baru_punya_kueri_yang_memakainya`

### Jawaban dari membaca `workers/api/cron-status.js`: SATU indeks dipakai, SATU tidak

Seluruh SQL terhadap `cron_run` hidup di satu objek beku, `CRON_SQL`, dan isinya
cuma tiga pernyataan:

| kueri | penyaring | indeks yang relevan |
|---|---|---|
| `INSERT INTO cron_run (job, day, started_at, finished_at, ok, rows_affected, error_class) VALUES (?1..?7)` | — (tulis) | tidak butuh indeks; setiap indeks = tulis tambahan |
| `DELETE FROM cron_run WHERE day < ?1` (retensi 60 hari) | `day` | `idx_cron_run_day(day)` ✔ |
| `SELECT job, day, started_at, finished_at, ok, rows_affected, error_class FROM cron_run WHERE day >= ?1 AND day <= ?2 ORDER BY started_at` (`GET /api/owner/cron-status`) | `day` | `idx_cron_run_day(day)` ✔ |

**Tidak ada satu pun kueri yang menyaring atau mengurutkan dengan `job`.**
Pemisahan per-job dilakukan di JS oleh `summarizeCronRuns()` — disengaja dan
didokumentasikan di fungsinya ("agregasi dilakukan di JS, bukan lewat `GROUP BY`",
2 job × ≤289 jalan/hari × 60 hari). Jadi `idx_cron_run_job_day(job, day)` adalah
indeks berkepala kolom yang tidak pernah menjadi penyaring: SQLite tidak akan
memakainya untuk `WHERE day …`, dan `idx_cron_run_day` sudah melayani keduanya.

### Keputusan: `idx_cron_run_job_day` DIHAPUS dari `0003_cron.sql`

Alasan tertulis lengkap ada di kepala `0003_cron.sql` (blok "INDEKS YANG SENGAJA
TIDAK DIBUAT") dan ringkasnya di `MIGRATIONS.md`. Intinya angka, bukan selera:

- Indeks menambah **satu baris tertulis** per tulis yang menyentuh kolomnya —
  "Indexes add an additional written row when writes include the indexed column"
  ([Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/));
  plan gratis = 100.000 baris tertulis/hari untuk SELURUH akun. `cron_run` menerima
  288 INSERT/hari dari sweep tiap 5 menit + 1 dari rollup.
- Lebih menentukan daripada kuota: D1 "is inherently single-threaded, and processes
  queries one at a time" ([D1 limits](https://developers.cloudflare.com/d1/platform/limits/)),
  dan `cron_run` hidup di `fiezel-core` — database yang **sama** dengan jalur panas
  kuota (`quota_daily`, `quota_reservation`). Tulis adalah sumber daya paling
  langka di sana; membayar tulis untuk indeks yang tidak dibaca siapa pun berarti
  menyerialisasi reserve/commit murid demi nol manfaat.
- Kalau nanti ada kueri nyata berkepala `job` (mis. `WHERE job = ?1 AND day >= ?2`),
  indeksnya ditambahkan di **migrasi baru bersama kuerinya** — bukan disiapkan
  lebih dulu "kalau-kalau".

`idx_cron_run_day(day)` **DIPERTAHANKAN**, dan sekarang membawa bukti dalam bentuk
yang diminta gerbang: blok `-- DIPAKAI OLEH:` persis di atas `CREATE INDEX`, dengan
string kueri yang dikutip **apa adanya** dari `CRON_SQL`.

### Gerbang tidak mempercayai komentar — dan itu harus dibuktikan, bukan dijanjikan

Klaim komentar hanya menjadi bukti kalau ketiganya benar:

1. string kueri yang dikutip **benar-benar ada** sebagai SQL di kode Worker (atau
   di blok SQL `docs/D1-RETENTION.md`);
2. kueri itu menyentuh tabel indeks lewat `FROM|INTO|UPDATE|JOIN <tabel>` —
   sebelumnya cukup "nama tabel muncul di string", yang bisa dipenuhi teks bebas;
3. kolom **pertama** indeks muncul di bagian **penyaring** (`WHERE`/`ORDER BY`/
   `GROUP BY`), bukan sekadar di daftar `SELECT` — kolom yang hanya dibaca tidak
   membuat indeks terpakai.

Klaim yang gugur dicatat di laporan sebagai `klaim_ditolak` dengan alasan per
butir, jadi kegagalan bisa dibaca tanpa menebak.

**Cacat parser yang ikut terungkap di sini:** `CRON_SQL` menyusun kueri dengan
`'... FROM cron_run ' + 'WHERE day >= ?1 ...'`. Pemindai lama mengambil literal
satu per satu, jadi kueri utuh tidak akan **pernah** cocok dengan klaim mana pun —
gerbang akan menuduh indeks yang benar-benar dipakai sebagai indeks mati.
`joinConcatenatedLiterals()` menggabungkan sambungan `+` antar literal sejenis
lebih dulu. Efeknya terukur: literal SQL yang terbaca dari kode naik, dan bukti
`idx_cron_run_day` sekarang bersumber `"kode"`, bukan komentar.

Bukti di `D1-SCHEMA-CONTRACT-REPORT.json`:

```json
{ "indeks": "idx_cron_run_day", "tabel": "cron_run", "kolom": ["day"],
  "bukti": [
    { "kueri": "select job, day, started_at, finished_at, ok, rows_affected, error_class from cron_run where day >= ?1 and day <= ?2 order by started_at", "sumber": "kode" },
    { "kueri": "delete from cron_run where day < ?1", "sumber": "kode" }
  ], "klaim_ditolak": [] }
```

---

## Keamanan mengubah `0003_cron.sql`

**Aman.** Di direktori itu ada 0001–0004, tetapi produksi baru menjalankan
`0001_identity.sql`, `0001_quota.sql`, dan `0002_analytics.sql`. `0003` dan `0004`
**belum pernah diterapkan** di database mana pun. Karena itu:

- menghapus `CREATE INDEX idx_cron_run_job_day` dari `0003` **bukan** perubahan
  skema produksi: indeks itu tidak pernah lahir, jadi tidak ada `DROP INDEX` yang
  perlu ditulis dan nol data tersentuh;
- `0001_identity.sql`, `0001_quota.sql`, `0002_analytics.sql` **TIDAK DISENTUH**
  (dan tidak boleh: keduanya sudah dijalankan, dan salinannya di
  `quota/migrations/` + `analytics/migrations/` wajib byte-identik — dijaga
  `tests/cf-wiring-test.js`);
- konsekuensi operasional saat penerapan: jalankan `0003` seperti tertulis di
  `MIGRATIONS.md`; hasilnya `cron_run` + satu indeks. Sampai itu dijalankan,
  `recordCronRun()` tetap menelan `D1_UNKNOWN_TABLE` dan
  `GET /api/owner/cron-status` menjawab `200 migrated:false` — perilaku itu tidak
  berubah sama sekali oleh perbaikan ini.
- catatan untuk penerapan berikutnya: `tools/d1-schema-check.mjs` sekarang
  mengharapkan `cron_run` + `idx_cron_run_day` **dan** indeks hasil `0004`. Jadi
  membandingkan skema produksi SEKARANG (0003/0004 belum jalan) akan keluar 1
  dengan `tabel_hilang: cron_run` dan indeks `0004` hilang — itu **benar** dan
  memang laporan yang diinginkan: "repo di depan produksi". Ia keluar 0 setelah
  `0003` dan `0004` diterapkan.

---

## Verifikasi

Semua exit 0 (dijalankan di `wt-f2d1`, branch `fix/f2d1`):

| gerbang | exit |
|---|---|
| `tests/d1-schema-contract-test.js` | 0 — `LULUS 28/28` |
| `tests/cron-contract-test.js` | 0 |
| `tests/cf-wiring-test.js` | 0 |
| `tests/quota-core-test.js` | 0 |
| `tests/analytics-privacy-test.js` | 0 |
| `tests/regression-test.js` | 0 |
| `tests/install-health-test.js` | 0 |

`VERSION.json`, `version.js`, `package.json`: **tidak disentuh** (nol bump versi
build). Tidak ada `git push`.

### Bukti gerbang masih bisa MERAH

Skrip yang bisa dijalankan ulang: `analysis/f2d1-red-proof.sh` (menyuntik, menunjukkan
merah, lalu memulihkan sendiri). Transkrip:

```
=== 0. BASELINE (harus LULUS) ===
exit=0
d1-schema-contract-test: LULUS 28/28

=== 1. TABEL PALSU: kode memakai tabel yang tidak punya migrasi (harus MERAH) ===
exit=1
d1-schema-contract-test: GAGAL 1/28
  - setiap_tabel_yang_dipakai_kode_ada_di_migrasi
cek: ok=false [{"tabel":"ghost_table","dirujuk_di":"workers/api/red-proof-fake-table.js"}]

=== 2. MIGRASI TIDAK TERDAFTAR: berkas .sql baru tanpa perintah di MIGRATIONS.md (harus MERAH) ===
exit=1
cek: semua_berkas_migrasi_terbaca ok=false tidak_terpetakan=["0005_red_proof.sql"]
checker exit=2
GALAT: berkas migrasi tanpa database tujuan di MIGRATIONS.md: 0005_red_proof.sql

=== 3. INDEKS TANPA KUERI: kembalikan idx_cron_run_job_day + klaim komentar BOHONG (harus MERAH) ===
exit=1
d1-schema-contract-test: GAGAL 1/28
  - setiap_indeks_baru_punya_kueri_yang_memakainya
  indeks idx_cron_run_job_day, klaim_ditolak: ada_di_kode=false

=== 4. PULIH: repo kembali bersih (harus LULUS lagi) ===
exit=0
d1-schema-contract-test: LULUS 28/28
```

Butir 1 adalah suntikan yang diminta (tabel dipakai kode tanpa migrasi). Butir 2
membuktikan pemeriksaan baru benar-benar menangkap kegagalan diam-diam yang
menyebabkan bug ini. Butir 3 membuktikan gerbang **menolak klaim komentar** yang
tidak punya kueri nyata di kode — persis mekanisme yang membenarkan penghapusan
`idx_cron_run_job_day`.

---

## Berkas yang diubah

| berkas | perubahan |
|---|---|
| `tests/d1-schema-contract-test.js` | peta migrasi diturunkan dari `MIGRATIONS.md`; cek `semua_berkas_migrasi_terbaca`; parser toleran kutip identifier + catat pernyataan tak dikenali; gabung literal SQL bersambung; verifikasi klaim indeks terhadap kode; laporan pembanding dibaca tanpa meledak |
| `tools/d1-schema-check.mjs` | `filesByDbFromDoc()` (implementasi terpisah), keluar 2 untuk `.sql` tak terpetakan; `FILES_BY_DB` literal dihapus dari ekspor |
| `workers/api/migrations/0003_cron.sql` | `idx_cron_run_job_day` DIHAPUS + alasan tertulis; klaim `DIPAKAI OLEH` untuk `idx_cron_run_day` mengutip kueri nyata |
| `workers/api/migrations/MIGRATIONS.md` | baris `0004` di tabel; catatan cacat "`cron_run` hilang"; koreksi klaim usang "tidak ada berkas `0003_*`"; catatan satu indeks di 0003 |
| `analysis/f2d1-red-proof.sh` | skrip bukti merah yang memulihkan dirinya |
| `D1-SCHEMA-CONTRACT-REPORT.json` | artefak hasil jalan terakhir (28/28) |

Tidak disentuh: `0001_identity.sql`, `0001_quota.sql`, `0002_analytics.sql`,
`0004_indexes.sql`, `workers/api/cron-status.js` (kodenya sudah benar — yang salah
gerbangnya), `VERSION.json`.

## Satu pengamatan yang dibiarkan (bukan regresi)

Di `0004_indexes.sql`, klaim retensi
`'DELETE FROM quota_daily WHERE rowid IN (SELECT rowid FROM quota_daily WHERE day < ? LIMIT 500)'`
kini tercatat sebagai `klaim_ditolak` (`ada_di_kode=false`,
`ada_di_dokumen_retensi=false`) karena teks di `docs/D1-RETENTION.md` tidak identik
kata-per-kata dengan klaim itu. Indeks `idx_quota_daily_day_user` tetap terbukti
oleh klaim keduanya (`SELECT user_id FROM quota_daily WHERE day = ?1`, sumber
`kode`), jadi gerbang hijau dengan benar. Perbaikan yang tepat adalah
menyelaraskan kutipan di `0004` dengan blok SQL dokumen retensi; itu di luar
lingkup F2/D1 dan tidak menutupi apa pun karena sekarang **terlihat** di laporan.
