# `fiezel-owner` — daftar periksa deploy (bisa dijalankan apa adanya)

Dokumen ini untuk **owner**. Yang berubah 28 Agu 2026: bagian yang menulis *"agen tidak punya
kredensial Cloudflare"* **sudah tidak benar** — Worker ini sudah dideploy dan custom domainnya
sudah dibuat dari sesi kerja, dengan kredensial Cloudflare yang tersedia di sesi itu. Yang
**tetap** milik owner sendiri adalah: **nilai Secret** (tidak pernah masuk repo dan tidak pernah
diminta) dan **Cloudflare Access/MFA** di depan hostname (keputusan identitas, lihat §5).

## Keadaan hari ini, apa adanya (28 Agu 2026 — diukur, bukan diperkirakan)

| Fakta | Nilai |
|---|---|
| Worker `fiezel-owner` | **sudah dideploy** · etag `9ad135402f65` · modul `index.js` + `queries.js` |
| Custom domain `owner.fiezel.my.id` | **aktif** · id `aa153ad81fbc2aee3855441900cc7bc9696f3d0c` · cert `767db56f-ee98-418d-b63b-20cad50dcd46` · `enabled: true` |
| `https://fiezel-owner.fitrajft.workers.dev/` | **mati** (`workers_dev = false`) — dan harus tetap mati |
| Secret terpasang | `OWNER_TOKEN_HASH`, `OWNER_SESSION_KEY`, `EDGE_SHARED_SECRET` (ketiganya) |
| Binding | **hanya** D1 `ANALYTICS` → `fiezel-stats` (`c712000c-aab9-4a1d-b43d-e6d4c9b36ee8`) · plus AE `fiezel_ops` |
| Binding ke `fiezel-core` | **NOL**, dan itu invarian privasi — lihat §1 |
| `https://owner.fiezel.my.id/` **sebelum** perbaikan ini | **403 `{"error":"forbidden"}`** pada tiga percobaan, ~75 ms |
| `https://owner.fiezel.my.id/` **sesudah** perbaikan ini | halaman masuk bisa diakses; token owner bisa dipakai |
| Tabel agregat di `fiezel-stats` | **ada** (`0002_analytics.sql` sudah jalan) — `metrics_daily`, `usage_daily`, `retention_daily` **nol baris** (diverifikasi lewat D1 langsung) |
| Pemancar analytics di klien | **belum ada**; `cfAnalyticsEnabled = false` (`workers/api/schema.js:113`) |

### Kenapa dashboard sempat 403 di semua rute, dan apa yang diperbaiki

Penjaga tepi di `workers/owner/index.js` menuntut **setiap** permintaan membawa header jembatan
`X-Fiezel-Edge`. Itu benar selama dashboard difrontkan proxy PHP. Sekarang tidak:
`owner.fiezel.my.id` adalah **custom domain Worker**, jadi permintaan datang langsung dari
peramban owner dan **tidak ada** yang menyuntikkan header itu. Penjaganya menilai keadaan yang
sudah tidak berlaku.

Perbaikannya **bukan** `ALLOW_NO_EDGE_SECRET="true"` — pembuka itu membuka gerbang untuk *semua*
hostname termasuk `*.workers.dev`, tempat Cloudflare Access (yang dipasang **per hostname**) tidak
berlaku; itu menukar 403 dengan lubang. Yang dipakai adalah **jalur sah kedua: hostname kanonik**,
sama seperti `workers/api/mw-edge.js`:

| Jalur | Kapan lolos | Catatan |
|---|---|---|
| `custom-domain` | hostname permintaan **persis** `owner.fiezel.my.id` | jalur UTAMA. Tidak membaca satu header pun. |
| `header` | hostname `*.workers.dev` **dan** `X-Fiezel-Edge` benar | jalur **CADANGAN** untuk jembatan PHP; dipertahankan sengaja |
| `off` | tidak ada secret **dan** `ALLOW_NO_EDGE_SECRET` persis `"true"` | bukan mode produksi; **tidak lagi diperlukan** |
| `denied` | semua sisanya | hostname asing, `*.workers.dev` tanpa secret, dsb. |

Hostname yang dipercaya diambil dari `new URL(request.url).hostname` — **bukan** dari
`request.headers.get('host')`, bukan dari `X-Forwarded-Host`. Alasannya ada di komentar
`workers/owner/index.js` bab "SINYAL HOSTNAME" dan diringkas di
`reports/work-d3-owner-guard.md`. Konsekuensi yang harus owner tahu: jalur hostname ini sah
**hanya bersama** tiga hal di luar kode — `workers_dev = false`, Preview URL mati, dan Cloudflare
Access di depan `owner.fiezel.my.id`. Dua yang pertama sudah benar; yang ketiga **masih pekerjaan
owner** (§5).

Artinya: langkah 1–8 di bawah membuat dashboard **hidup dan aman**. Ia **tidak** membuat dashboard
**berisi angka** — ketiga tabel agregat nol baris dan `cfAnalyticsEnabled=false`. Baca
§"Dashboard ini akan kosong, dan itu benar" sebelum menyimpulkan ada kerusakan, dan §Blokir untuk
yang memang belum bisa dikerjakan siapa pun.

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

### Bentuk penjaga edge: tidak ada lagi yang harus dipilih

Sejak custom domain aktif, **tidak ada var yang perlu dipasang** untuk membuat dashboard bisa
diakses. Penjaga meloloskan hostname kanonik sendiri.

- **`ALLOW_NO_EDGE_SECRET` JANGAN dipasang.** Ia membuka gerbang untuk *semua* hostname, termasuk
  `*.workers.dev`. Kalau ia pernah dipasang di deploy sebelumnya, **hapus var-nya** dan deploy
  ulang. Nilainya juga kini harus string **persis** `"true"` — `"TRUE"` tidak lagi diterima
  (versi lama kode diam-diam menerimanya; itu ditutup 28 Agu 2026).
- **`EDGE_SHARED_SECRET` tetap dipasang** dan tetap berguna: ia satu-satunya pembuka jalur
  **cadangan** (`*.workers.dev` + `X-Fiezel-Edge`) kalau owner suatu hari harus mengembalikan
  jembatan PHP. Menghapusnya **tidak** akan mematikan dashboard di hostname kanonik — jalur
  hostname diperiksa sebelum secret.
- **Cloudflare Access di `owner.fiezel.my.id` tetap WAJIB** (§5). Tanpa Access, halaman masuk
  owner terbuka ke internet dan yang menahannya hanya token: itu satu lapis, bukan dua. Kode
  tidak bisa memaksakan Access, jadi kode tidak berpura-pura bisa.

## 3. Urutan langkah

```bash
# 0) pastikan berada di cabang yang benar dan gerbang hijau
cd FIEZEL-APPS
node owner-dashboard-test.js && node owner-edge-guard-test.js && node analytics-privacy-test.js

# 1) database: JANGAN buat yang baru. Hanya pastikan yang benar dipakai.
wrangler d1 info fiezel-stats

# 2) Secret (tiga, nama persis; lihat §2). Ketiganya SUDAH terpasang hari ini —
#    perintah ini hanya untuk memutar nilainya atau memasang ulang di Worker baru.
cd workers/owner
# wrangler secret put OWNER_TOKEN_HASH
# wrangler secret put OWNER_SESSION_KEY
# wrangler secret put EDGE_SHARED_SECRET     # pembuka jalur CADANGAN saja
wrangler secret list                          # harus memuat tepat ketiga nama di atas

# 3) deploy. TANPA var pembuka apa pun — jalur hostname kanonik sudah cukup.
wrangler deploy
#    JANGAN: wrangler deploy dengan var ALLOW_NO_EDGE_SECRET. Itu membuka *.workers.dev.

# 4) custom domain owner.fiezel.my.id — SUDAH ADA dan aktif (enabled: true).
#    `custom_domain = true` di wrangler.toml yang membuat record + sertifikatnya.
#    Ini hanya verifikasi; jangan hapus/buat ulang tanpa alasan.
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

# (11) *.workers.dev harus MATI (workers_dev = false). Kalau ia menjawab 200 di /login,
#      BERHENTI: itu pintu kedua yang TIDAK dilewati Cloudflare Access.
curl -s -o /dev/null -w '%{http_code} workers.dev (harus 404/000)\n' \
  https://fiezel-owner.fitrajft.workers.dev/
curl -s -o /dev/null -w '%{http_code} workers.dev /login (harus 404/000/403)\n' \
  https://fiezel-owner.fitrajft.workers.dev/login

# (12) HARUS 403 — hostname asing yang menumpang IP Cloudflare tidak boleh dilayani.
curl -s -o /dev/null -w '%{http_code} host-asing (harus 403/000)\n' \
  --resolve owner.fiezel.my.id.penyerang.com:443:1.1.1.1 \
  https://owner.fiezel.my.id.penyerang.com/login || true

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
5. **Yang masih pekerjaan owner sendiri, dan alasannya.** Deploy, DNS, dan custom domain
   **sudah selesai** (lihat tabel keadaan di atas) — klaim lama bahwa agen tidak punya kredensial
   Cloudflare sudah tidak benar dan sudah dicabut. Yang tetap tidak bisa dikerjakan dari sini:
   - **Cloudflare Access + MFA di depan `owner.fiezel.my.id`.** Ini keputusan **identitas**
     (surel mana, faktor kedua apa, perangkat siapa) dan hidup di Zero Trust, bukan di kode
     Worker. Ia juga lapis yang membuat jalur hostname baru itu sah: tanpa Access, siapa pun bisa
     memuat halaman masuk dan yang menahannya hanya token owner.
   - **Nilai Secret.** Repo tidak pernah memuatnya dan tidak boleh; agen tidak boleh memintanya.
   - **Menyalakan `cfAnalyticsEnabled`** dan menjalankan rollup: itu ada di `workers/api/`, di
     luar wilayah paket kerja ini.
