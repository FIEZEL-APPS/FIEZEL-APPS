# `fiezel-owner` — daftar periksa deploy (bisa dijalankan apa adanya)

Dokumen ini untuk **owner**, bukan untuk agen. Agen tidak punya kredensial Cloudflare dan tidak
punya nilai Secret; semua di bawah dijalankan owner dari mesin owner.

Keadaan hari ini, apa adanya:

| Fakta | Nilai |
|---|---|
| `https://fiezel-owner.fitrajft.workers.dev/` | **404** → Worker ini **belum pernah dideploy** |
| `https://owner.fiezel.my.id/` | belum resolve → custom domain belum dibuat |
| Zona `fiezel.my.id` di Cloudflare | **aktif** (pola `api.fiezel.my.id` sudah terbukti) |
| Tabel agregat di `fiezel-stats` | **ada** (`0002_analytics.sql` sudah jalan), **nol baris** |
| Pemancar analytics di klien | **belum ada**; `cfAnalyticsEnabled = false` (`workers/api/schema.js:113`) |

Artinya: langkah 1–8 di bawah membuat dashboard **hidup dan aman**. Ia **tidak** membuat dashboard
**berisi angka**. Baca §"Dashboard ini akan kosong, dan itu benar" sebelum menyimpulkan ada
kerusakan, dan §Blokir untuk yang memang belum bisa dikerjakan siapa pun.

---

## 1. Binding yang harus ada (sudah tertulis di `wrangler.toml`, tinggal diverifikasi)

| Binding | Jenis | Tujuan | Catatan |
|---|---|---|---|
| `ANALYTICS` | D1 | `fiezel-stats` · `c712000c-aab9-4a1d-b43d-e6d4c9b36ee8` | **hanya SELECT**. Ini database yang benar; nama `fiezel-analytics` di versi lama berkas ini SALAH dan tidak pernah ada. |
| `AE` | Analytics Engine | dataset `fiezel_ops` | opsional; kalau tidak ada, jejak audit akses owner dilewati, Worker tetap jalan. |

**Yang TIDAK boleh ada, dan alasannya:** nol binding ke `fiezel-core`
(`7bc356dc-8aff-41e1-b682-ae2039c58c55`). Di sanalah `identity`, `session`, `quota_daily` hidup —
data per-orang. Worker owner tidak punya alasan teknis apa pun untuk menyentuhnya, dan kontrak
analytics privasi-maksimal melarang JOIN kuota↔analytics. Kalau binding itu suatu hari muncul di
`wrangler.toml`, itu bukan fitur, itu insiden.

Verifikasi sebelum deploy:

```bash
cd FIEZEL-APPS/workers/owner
grep -n "database_name\|database_id\|binding" wrangler.toml     # harus HANYA fiezel-stats + AE
wrangler d1 info fiezel-stats                                    # cocokkan uuid-nya
```

## 2. Secret yang harus dipasang — nama PERSIS

Semua dengan `wrangler secret put <NAMA>` dari `workers/owner/`. Nilainya sudah ada di catatan
owner di luar repo. Repo tidak pernah memuat nilainya, dan tidak boleh.

| Nama Secret di Worker ini | Isinya | Kalau belum dipasang |
|---|---|---|
| `OWNER_TOKEN_HASH` | sha256 **HEX** dari token login owner (hash, bukan token) | **semua** rute 403, termasuk `/login` |
| `OWNER_SESSION_KEY` | kunci HMAC penanda cookie sesi `fz_owner` | **semua** rute 403 |
| `EDGE_SHARED_SECRET` | nilai header `X-Fiezel-Edge` dari jembatan | **semua** permintaan 403 (fail-closed) |

Tiga jebakan nama yang nyata:

1. **`EDGE_SECRET` ≠ `EDGE_SHARED_SECRET`.** Catatan owner menyebut rahasia itu `EDGE_SECRET`;
   kode di `index.js` membaca `env.EDGE_SHARED_SECRET` (nama yang sama dipakai `workers/api`).
   Pasang **nilainya** di bawah nama `EDGE_SHARED_SECRET`. Salah nama = Worker fail-closed dan
   gejalanya identik dengan "belum dipasang".
2. `OWNER_SUBJECT` dan `OWNER_LOGIN_TOKEN` **tidak dibaca** Worker ini. `OWNER_SUBJECT` dipakai
   `workers/api`; `OWNER_LOGIN_TOKEN` adalah token mentah yang owner ketik di halaman masuk —
   Worker hanya menyimpan **hash**-nya. Jangan pasang token mentah sebagai Secret.
3. `ALLOW_NO_EDGE_SECRET` adalah **var**, bukan Secret, dan nilainya harus string persis `"true"`.
   Ia sengaja tidak ditulis di `[vars]` supaya membukanya butuh tindakan sadar.

### Pilih SATU dari dua bentuk penjaga edge

- **A. Custom domain + Cloudflare Access (disarankan sekarang).** Tidak ada jembatan PHP untuk
  hostname owner di cabang ini, jadi tidak ada yang menyuntikkan header `X-Fiezel-Edge`. Supaya
  Worker tidak menolak owner sendiri: pasang var `ALLOW_NO_EDGE_SECRET = "true"` **dan** pastikan
  `workers_dev = false` (sudah di `wrangler.toml`) **dan** pasang Access di
  `owner.fiezel.my.id`. Lapisan luar dikerjakan Access + gerbang token aplikasi, bukan header.
- **B. Jembatan PHP.** Kalau jembatan owner dibuat nanti, pasang `EDGE_SHARED_SECRET` dengan nilai
  identik di kedua sisi dan **hapus** var `ALLOW_NO_EDGE_SECRET`. Ini bentuk paling ketat.

Jangan pakai A tanpa Access. A tanpa Access = halaman masuk owner terbuka ke internet, dan yang
menahannya hanya token. Itu satu lapis, bukan dua.

## 3. Urutan langkah

```bash
# 0) pastikan berada di cabang yang benar dan gerbang hijau
cd FIEZEL-APPS
node owner-dashboard-test.js && node owner-edge-guard-test.js && node analytics-privacy-test.js

# 1) database: JANGAN buat yang baru. Hanya pastikan yang benar dipakai.
wrangler d1 info fiezel-stats

# 2) Secret (tiga, nama persis; lihat §2)
cd workers/owner
wrangler secret put OWNER_TOKEN_HASH
wrangler secret put OWNER_SESSION_KEY
wrangler secret put EDGE_SHARED_SECRET      # bentuk B; untuk bentuk A lewati langkah ini

# 3) bentuk A saja: buka penjaga edge secara sadar
wrangler deploy --var ALLOW_NO_EDGE_SECRET:true
#    bentuk B:
# wrangler deploy

# 4) custom domain owner.fiezel.my.id
#    `custom_domain = true` di wrangler.toml membuat record + sertifikatnya otomatis saat deploy.
#    Kalau deploy menolak karena hostname sudah dipakai record lain, hapus record lama dulu.
wrangler deployments list

# 5) Cloudflare Access (WAJIB untuk bentuk A)
#    Dashboard → Zero Trust → Access → Applications → Add → Self-hosted
#      hostname : owner.fiezel.my.id
#      policy   : Allow · Emails = surel owner · Require MFA
#    Access TIDAK menggantikan gerbang token aplikasi. Dua lapis, bukan satu.

# 6) migrasi yang belum jalan (tidak wajib untuk dashboard, tapi jangan dilupakan)
#    0003_cron.sql dan 0004_indexes.sql keduanya untuk fiezel-core, BUKAN fiezel-stats.
#    Perintah persisnya ada di workers/api/migrations/MIGRATIONS.md — pakai yang di sana.
```

## 4. Verifikasi pasca-deploy (jalankan semuanya; yang harus 403 sama pentingnya)

Ganti `$OWNER_TOKEN` dengan token login owner. Jangan simpan di riwayat shell (`export` di shell
sekali pakai, atau ketik lewat `read -s`).

```bash
BASE=https://owner.fiezel.my.id

# (1) HARUS 403 — halaman utama tanpa sesi owner.
curl -s -o /dev/null -w '%{http_code} / tanpa-sesi (harus 403)\n' $BASE/

# (2) HARUS 403 — rute JSON tanpa sesi. Ini yang paling penting: kalau salah satu 200,
#     angka bisnis terbuka. BERHENTI dan cabut deploy kalau ada yang bukan 403.
for p in /api/summary /api/series /api/retention /api/cost /logout; do
  curl -s -o /dev/null -w "%{http_code} $p tanpa-sesi (harus 403)\n" "$BASE$p"
done

# (3) HARUS 403 — rute yang tidak dikenal (default deny), termasuk yang menggoda.
for p in /admin /metrics /healthz /status /.env /queries.js /api/students /api/export; do
  curl -s -o /dev/null -w "%{http_code} $p (harus 403)\n" "$BASE$p"
done

# (4) HARUS 403 — cookie sesi palsu/sampah tidak boleh diterima.
curl -s -o /dev/null -w '%{http_code} / cookie-sampah (harus 403)\n' \
  -H 'cookie: fz_owner=bukan-sesi-yang-sah' $BASE/

# (5) HARUS 200 — halaman masuk (satu-satunya rute publik).
curl -s -o /dev/null -w '%{http_code} /login (harus 200)\n' $BASE/login

# (6) HARUS 401/403 — login dengan token salah, dan JANGAN menerbitkan cookie.
curl -si -X POST $BASE/login -H 'content-type: application/json' \
  -d '{"token":"token-yang-salah"}' | grep -Ei '^HTTP/|set-cookie'

# (7) HARUS 200 + Set-Cookie fz_owner — login benar.
curl -si -X POST $BASE/login -H 'content-type: application/json' \
  -d "{\"token\":\"$OWNER_TOKEN\"}" -c /tmp/owner.jar | grep -Ei '^HTTP/|set-cookie'

# (8) HARUS 200 — dashboard dengan sesi sah, dan HARUS memuat kalimat kejujuran.
curl -s -b /tmp/owner.jar "$BASE/?period=7d" | grep -o 'BELUM ADA PENGUKURAN' || \
  echo 'TIDAK ada spanduk kekosongan — periksa apakah data sudah masuk, atau apakah build lama'

# (9) HARUS 200 — JSON membawa keadaan pengukuran, bukan cuma angka.
curl -s -b /tmp/owner.jar "$BASE/api/summary?period=7d" | head -c 400
#     yang dicari: "measurement":{"state":"no-data" ... "zeroMeansMeasured":false

# (10) HARUS 403 — rute tak dikenal TETAP ditolak walau sesi sah (default deny sungguhan).
curl -s -o /dev/null -b /tmp/owner.jar -w '%{http_code} /api/debug ber-sesi (harus 403)\n' $BASE/api/debug

# (11) *.workers.dev harus MATI (workers_dev = false).
curl -s -o /dev/null -w '%{http_code} workers.dev (harus 404/000)\n' \
  https://fiezel-owner.fitrajft.workers.dev/

rm -f /tmp/owner.jar
```

Kalau (2), (3), (4), atau (10) menjawab selain 403 → **cabut**: `wrangler rollback` atau hapus
Secret `OWNER_SESSION_KEY` (Worker langsung fail-closed di semua rute) lalu selidiki.

---

## Dashboard ini akan kosong, dan itu benar

Setelah semua langkah di atas benar, halaman akan menampilkan spanduk **BELUM ADA PENGUKURAN** dan
setiap angka bertanda "belum ada pengukuran". Itu **bukan** bug deploy, dan **bukan** "nol
pengguna". Ini rantai sebabnya, urut:

1. `workers/api/schema.js:113` → `cfAnalyticsEnabled: false`, dan `:122` → `enabled.analytics:
   false`. Ditambah `ANALYTICS_ENABLED = "off"` di `workers/api/wrangler.toml`.
2. Karena itu, **tidak ada satu pun pemancar di klien**. Tidak ada kode di aplikasi murid yang
   memanggil `/api/usage/*`. Nol event dikirim, jadi nol event diterima.
3. `POST /api/usage/*` sendiri menjawab `202 {disabled:true}` saat flag mati — sengaja 202 dan
   bukan 404, supaya klien lama tidak mengulang tanpa henti. Nol baris ditulis.
4. Cron rollup harian (`5 17 * * *`, 00:05 WIB) keluar lewat `{skipped:'flag_off'}`. Rollup tidak
   berjalan, jadi tidak ada yang mengisi tabel harian maupun membuat token dedup dan pepper.

Keadaan tabel di `fiezel-stats` hari ini, dan apakah itu sah:

| Tabel | Isi | Sah? |
|---|---|---|
| `metrics_daily` | kosong | **sah** — hanya diisi rollup harian, dan rollup dilewati saat flag mati |
| `usage_daily` | kosong | **sah** — hanya diisi rollup dari event yang tidak pernah dikirim |
| `retention_daily` | kosong | **sah** — kohort butuh minimal 30 hari data; nol hari data = nol kohort |
| `dau_dedup` | kosong | **sah, dan penting** — token harian ber-pepper hanya lahir saat event masuk; kosong = nol jejak harian, bukan kerusakan |
| `pepper_state` | kosong | **sah** — pepper dibuat/dirotasi oleh cron rollup yang tidak pernah berjalan; kalau ia berisi tanpa event, itu justru aneh |

Yang **membedakan** dashboard ini dari dashboard nol-palsu:

- "**belum ada pengukuran**" = tidak ada satu pun hari yang terrollup. Tidak boleh dipakai untuk
  keputusan apa pun.
- "**0 (nol terukur)**" = harinya ADA di tabel, angkanya benar-benar nol. Ini fakta.
- "**pengukuran tidak tersedia**" = pembacaan D1 gagal (nama query yang gagal dicetak di halaman).
  Kegagalan tidak pernah digambar sebagai nol.

Tiga keadaan itu dirender berbeda di HTML **dan** di JSON (`measurement.state`,
`measurement.zeroMeansMeasured`, `measurement.daysTotal`). Perbedaan itu diassert
`owner-dashboard-test.js` bagian (f), dan tiap assert-nya sudah dibuktikan bisa merah
(`reports/owner-dashboard-red-proof.md`).

Alasannya bukan estetika: **keputusan kuota** diambil dari halaman ini. Dashboard yang menulis
"0 perangkat aktif" padahal yang benar "belum diukur" akan membuat kuota dipotong berdasarkan
asumsi. Bab 28 melarang itu.

**Kapan angka mulai muncul:** setelah (a) pemancar analytics di klien ada, (b)
`cfAnalyticsEnabled` dan `enabled.analytics` dinyalakan beserta `ANALYTICS_ENABLED="on"`, (c) cron
rollup berjalan sekali (00:05 WIB). Panel harian terisi H+1, bukan seketika. Retensi butuh ≥30 hari.

---

## §Blokir — yang TIDAK bisa diselesaikan oleh deploy ini

1. **`queries.js` ditulis untuk skema yang tidak ada.** Ia mengharapkan `metrics_daily` gaya lebar
   (`visitors`, `dau`, `wau`, `mau`, `tts_cache_hits`, …) plus tabel `retention_cohort` dan
   `cost_daily`. Produksi (`workers/api/migrations/0002_analytics.sql`, sudah jalan) memberi bentuk
   panjang `metrics_daily(day, metric, value)`, `usage_daily(day, bucket, count)`,
   `retention_daily(cohort_day, day_index, count)`, `dau_dedup`, `pepper_state`. Konsekuensi
   praktis: begitu tabel benar-benar berisi, setiap query gagal dan halaman akan menampilkan
   "pengukuran tidak tersedia" beserta nama query — **jujur, tetapi tetap tanpa angka**.
   Hari ini gejalanya tersembunyi karena tabel kosong.
   Yang memperkeras: `analytics-privacy-test.js` mengunci database analytics pada **tepat lima
   tabel** (`workers/api/analytics/analytics-tables.js`), jadi `cost_daily` dan `retention_cohort`
   **tidak boleh** dibuat di sana. Perbaikannya adalah adaptor pembaca bentuk panjang di
   `queries.js` (dan tempat lain untuk data biaya), bukan migrasi tabel baru.
2. **Penulisnya ada di `workers/api/`**, yang di paket kerja ini terlarang disentuh. Menyelaraskan
   pembaca dan penulis harus jadi paket kerja sendiri, dengan gerbang skema yang membandingkan SQL
   `queries.js` terhadap `0002_analytics.sql` — bukan terhadap fixture buatan sendiri.
3. **`EXEC-BRIEF-CF.md` tidak ada di repo** padahal dirujuk sebagai otoritas privasi di banyak
   berkas (termasuk `wrangler.toml` ini). Kontraknya sendiri ditegakkan gerbang, jadi ini celah
   dokumen, bukan celah penegakan — tetapi rujukan ke berkas yang tidak ada tetap utang.
4. **Panel Analytics Engine tidak dibangun.** Membaca AE butuh SQL API + token akun (bukan
   binding). Ketiadaannya disengaja dan tertulis, bukan disembunyikan.
5. **Deploy, DNS, Access, dan pemasangan Secret adalah pekerjaan owner.** Agen tidak punya
   kredensial, tidak punya nilai Secret, dan tidak boleh memintanya.
