# Paket kerja D1-owner — dashboard pemantauan siswa: jawaban tegas

Cabang: `work/d1own`. Tidak di-push, versi build tidak dinaikkan.
Tidak menyentuh `app.js`, `sw.js`, `core-config.js`, `features/`, `workers/api/`, `coordination/`.

## Jawaban langsung untuk pertanyaan owner

**"Apakah dashboard untuk memonitor siswa sudah selesai dibangun?" — Belum.**

Yang berubah setelah paket ini: dashboard **siap dideploy** dan **jujur saat kosong**. Yang tidak
berubah: ia masih **tidak punya satu angka pun**, dan itu tidak bisa diperbaiki dari sisi
dashboard. Tambahan penting yang ditemukan paket ini: bahkan **kalau** data nanti masuk,
`queries.js` masih akan gagal, karena ia ditulis untuk skema yang tidak ada di produksi.

## Yang sudah siap

1. **Konfigurasi deploy diperbaiki, dua cacat fatal.**
   - `wrangler.toml` mengikat D1 ke `database_name = "fiezel-analytics"` **tanpa `database_id`**.
     Database itu tidak pernah ada. Diperbaiki ke `fiezel-stats` /
     `c712000c-aab9-4a1d-b43d-e6d4c9b36ee8`, yaitu database tempat `0002_analytics.sql` benar-benar
     dijalankan. Kalau ini lolos, `wrangler` bisa membuat database kosong baru dan dashboard akan
     melaporkan "belum ada data" selamanya, tanpa ada yang salah terlihat.
   - `README.md` §2 menyuruh owner menjalankan `wrangler d1 create fiezel-analytics` — perintah
     yang justru menciptakan cacat di atas. Diganti dengan `wrangler d1 info fiezel-stats`.
2. **`workers_dev = false`.** Cloudflare Access dipasang per hostname. Selama
   `fiezel-owner.<akun>.workers.dev` hidup, ia pintu kedua ke dashboard yang tidak dilewati Access.
   Satu hostname, satu tempat memasang MFA.
3. **Lapisan kejujuran pengukuran di `index.js`.** Empat keadaan yang sekarang dibedakan, di HTML
   dan di JSON: `measured`, `no-data`, `no-data-in-period`, `unavailable`.
   - Keadaan ditentukan dari **jumlah hari yang terrollup**, bukan dari nilai metrik. Ini bukan
     detail: SQL-nya memakai `COALESCE(...,0)`, jadi "tidak ada baris" dan "nilainya nol" tiba di
     kode sebagai angka yang sama persis. Menyimpulkan keadaan dari nilai = mustahil benar.
   - Nol yang terukur dicetak `0 (nol terukur)`. Kekosongan dicetak `belum ada pengukuran`.
   - Kegagalan baca D1 tidak lagi hilang di `catch`: halaman tetap 200 tetapi menampilkan
     "pengukuran tidak tersedia" **beserta nama query yang gagal**. Sebelumnya satu query gagal
     berarti seluruh route 500 `{"error":"internal"}` tanpa keterangan.
   - Sparkline dengan nol titik tidak menggambar garis datar di nol.
   - Panel kuota memuat peringatan eksplisit agar keputusan kuota tidak diambil di atas keadaan
     kosong (bab 28).
4. **Penyaringan field di sisi pembaca (`sanitizeRow`).** Setiap baris dari D1 dilewatkan daftar
   putih field agregat. Kolom di luar daftar dibuang sebelum masuk render atau JSON, dan **nama**
   kolom yang dibuang tidak diulang keluar (hanya jumlahnya). Sebelumnya jaminan "tidak ada data
   per-orang" bertumpu sepenuhnya pada sisi penulis; sekarang pembaca juga menolak.
5. **`workers/owner/DEPLOY.md`** — daftar periksa yang bisa dijalankan apa adanya: binding yang
   harus ada dan yang **dilarang** ada (nol binding ke `fiezel-core`), tiga Secret dengan nama
   persis, urutan langkah, dan 11 perintah `curl` verifikasi termasuk yang **harus 403**. Plus dua
   bentuk penjaga edge (custom domain + Access, atau jembatan PHP) dengan konsekuensi masing-masing.
6. **Jebakan nama Secret ditemukan:** catatan owner menyebut `EDGE_SECRET`; kode membaca
   `env.EDGE_SHARED_SECRET`. Salah nama menghasilkan gejala yang identik dengan "belum dipasang"
   (semua rute 403). Tertulis eksplisit di DEPLOY.md §2.
7. **`tests/owner-dashboard-test.js` diperluas** dengan empat keluarga assert: (f) kosong ≠ nol terukur ≠
   tidak tersedia, (g) default deny untuk 31 jalur tak dikenal × 7 metode HTTP, (h) nol rute owner
   yang bisa diakses tanpa gerbang (termasuk: `/login` tidak menyentuh D1), (i) nol identitas murid
   perorangan di HTML maupun keempat rute JSON. Fixture D1 barunya meniru perilaku SQL sungguhan
   pada nol baris (`COUNT` → 0, `SUM` → NULL, `MAX` → NULL).

## Bukti merah (bukan klaim, matriks)

`tools/owner-dashboard-red-proof.js` merusak satu invarian pada satu waktu di `index.js`,
menjalankan gerbang, lalu memulihkan berkas dan mencocokkan sha256-nya. Hasil lengkap:
[`reports/owner-dashboard-red-proof.md`](owner-dashboard-red-proof.md).

| Mutasi | Invarian | exit | assert gugur |
|---|---|---|---|
| M1 | keadaan selalu "measured" | 1 | 4 |
| M2 | spanduk keadaan dihapus | 1 | 3 |
| M3 | "tidak tersedia" dilabeli "nol terukur" | 1 | 2 |
| M4 | `fmtCount()` kembali jadi angka biasa | 1 | 1 |
| M5 | rute tak dikenal dijawab 200 | 1 | 1 |
| M6 | `/api/summary` dipindah ke daftar publik | 1 | 8 |
| M7 | `sanitizeRow()` meloloskan semua kolom | 1 | 65 |
| M8 | nama kolom asing dikirim balik di JSON | 1 | 37 |

Baseline sebelum mutasi: exit 0. Setelah seluruh pemulihan: exit 0. Delapan dari delapan mutasi
benar-benar memerahkan gerbang — tidak ada assert baru yang dekoratif.

Catatan jujur soal M1 dan M2: keduanya memerahkan gerbang lewat assert spanduk lebih dulu, bukan
lewat assert pembeda keadaan yang paling inti. Artinya assert-assert itu saling menopang; tidak ada
satu assert tunggal yang menjadi satu-satunya penjaga.

## Yang belum, dan tidak bisa diselesaikan dari sini

1. **`queries.js` menargetkan skema yang tidak ada — ini blokir paling keras.** Ia mengharapkan
   `metrics_daily` bentuk lebar (30+ kolom: `visitors`, `dau`, `wau`, `mau`, `tts_cache_hits`, …)
   plus tabel `retention_cohort` dan `cost_daily`. Produksi punya bentuk panjang:
   `metrics_daily(day, metric, value)`, `usage_daily(day, bucket, count)`,
   `retention_daily(cohort_day, day_index, count)`, `dau_dedup`, `pepper_state`.
   Sekarang gejalanya tidak terlihat karena tabel kosong. Begitu data masuk, setiap panel akan
   berbunyi "pengukuran tidak tersedia" — jujur, tetapi tetap tanpa angka.
   Yang memperkeras: `tests/analytics-privacy-test.js` mengunci database analytics pada **tepat lima
   tabel**, jadi `cost_daily` dan `retention_cohort` tidak boleh dibuat di sana. Perbaikannya
   adaptor pembaca bentuk panjang, bukan migrasi tabel baru — dan penulisnya hidup di
   `workers/api/`, yang terlarang di paket ini. **Paket kerja tersendiri.**
2. **Nol event, dan itu sah.** `cfAnalyticsEnabled=false` (`workers/api/schema.js:113`),
   `enabled.analytics=false` (`:122`), `ANALYTICS_ENABLED="off"`. Tidak ada pemancar di klien.
   `metrics_daily`, `usage_daily`, `retention_daily`, `dau_dedup`, `pepper_state` semuanya kosong;
   `dau_dedup` dan `pepper_state` kosong karena rollup dilewati saat flag mati — sah, bukan
   kerusakan. Membangun pemancar berarti menyentuh klien dan `workers/api/`: **di luar paket ini.**
3. **Belum pernah dideploy.** 404 di `fiezel-owner.fitrajft.workers.dev` bukan misteri, itu
   konsekuensi. `owner.fiezel.my.id` juga belum dibuat. Deploy, DNS, Access, dan pemasangan Secret
   adalah pekerjaan owner; agen tidak punya kredensial dan tidak meminta nilai Secret apa pun.
4. **`EXEC-BRIEF-CF.md` tidak ada di repo** walau dirujuk sebagai otoritas privasi di banyak
   berkas. Kontraknya sendiri ditegakkan gerbang, jadi ini utang dokumen, bukan celah penegakan.
5. **Gerbang lama mengunci skema yang salah.** `tests/owner-dashboard-test.js` memakai fixture bentuk
   lebar, sehingga hijau ≠ bisa dideploy — cacat #1 di atas lolos justru karena fixture-nya cocok
   dengan `queries.js`, bukan dengan produksi. Saya **tidak** memperbaiki ini di paket ini:
   menulis ulang fixture ke bentuk panjang berarti memerahkan gerbang tanpa bisa memperbaiki
   `queries.js` (pembacanya harus ditulis bersama penulisnya di `workers/api/`). Dicatat sebagai
   utang eksplisit, bukan dibereskan setengah.
6. Migrasi `0003_cron.sql` dan `0004_indexes.sql` masih belum jalan di produksi. Keduanya untuk
   `fiezel-core`, tidak diperlukan dashboard, tetapi tetap utang. Perintahnya ada di
   `workers/api/migrations/MIGRATIONS.md`.

## Verifikasi

Sebelas gerbang, semuanya exit 0 setelah seluruh perubahan:

`tests/owner-dashboard-test.js`, `tests/owner-edge-guard-test.js`, `tests/analytics-privacy-test.js`,
`tests/analytics-aggregate-test.js`, `tests/d1-schema-contract-test.js`, `tests/no-network-test.js`,
`tests/secret-scan-test.js`, `tests/gate-registry-test.js`, `tests/coordination-guard-test.js`,
`tests/regression-test.js`, `tests/install-health-test.js`.

Berkas yang disentuh: `workers/owner/index.js`, `workers/owner/wrangler.toml`,
`workers/owner/README.md`, `workers/owner/DEPLOY.md` (baru), `tests/owner-dashboard-test.js`,
`tools/owner-dashboard-red-proof.js` (baru), `reports/owner-dashboard-red-proof.md` (baru),
berkas ini.

## Satu kalimat untuk owner

Dashboard sekarang aman dideploy dan tidak akan membohongi Anda saat kosong; ia belum bisa
menunjukkan apa pun tentang siswa, dan yang menghalangi bukan dashboard-nya, melainkan pemancar
analytics yang belum ada dan `queries.js` yang menargetkan skema yang salah.
