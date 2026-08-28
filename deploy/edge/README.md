# `deploy/edge/` — JEMBATAN SEMENTARA `api.fiezel.my.id` + `owner.fiezel.my.id` → Worker Cloudflare

> **🔄 TEMUAN LAPANGAN 27 Agu 2026 — direktori ini BARU.** Ia mencatat satu artefak
> deployment yang sebelumnya hanya hidup di origin dan tidak bisa diaudit siapa pun.
> **Sifatnya SEMENTARA.** Bagian "PEMBONGKARAN" di bawah bukan lampiran — ia adalah
> alasan direktori ini boleh ada.

## 🔄 TEMUAN LAPANGAN 28 Agu 2026 — JEMBATAN `api` KINI **JALUR CADANGAN**, BUKAN JALUR UTAMA

STATUS BERUBAH. Yang sudah terverifikasi di DNS publik dan di Cloudflare:

- Nameserver `fiezel.my.id` **sudah pindah ke Cloudflare** (`dig NS` menjawab
  `sydney.ns.cloudflare.com` / `syeef.ns.cloudflare.com`, SOA `dns.cloudflare.com`).
- Worker `fiezel-api` **sudah terikat sebagai custom domain** ke `api.fiezel.my.id`
  (record `AAAA 100::` proxied + sertifikat edge terbit).
- Status zona di dashboard Cloudflare **masih `pending`** — verifikasi otomatisnya
  belum jalan, dan token yang tersedia bagi agen tidak punya izin memicunya. Jadi
  tanggal "aktif" **belum bisa diklaim dari sini**; yang bisa diklaim hanya bahwa
  pengikatannya sudah ada.

Konsekuensi yang harus dibaca sebelum menyentuh apa pun di direktori ini:

| | Sebelum 28 Agu 2026 | Sekarang |
|---|---|---|
| Jalur permintaan murid | browser → **PHP `api-index.php`** → `*.workers.dev` | browser → **Worker langsung** (custom domain) |
| Header `X-Fiezel-Edge` | ADA di setiap permintaan | **TIDAK ADA** di jalur utama |
| Peran `deploy/edge/` | JALUR UTAMA | **JALUR CADANGAN** (hanya dipakai permintaan yang masih memegang cache DNS lama) |
| Penjaga di Worker | header saja | **hostname tepercaya ATAU header**, hostname lain default-deny |

`workers/api/mw-edge.js` sudah menyesuaikan diri **tanpa mematikan pagarnya**: hostname
tepercaya (`TRUSTED_EDGE_HOSTS`, satu sumber kebenaran, wajib sama dengan
`custom_domain` di `workers/api/wrangler.toml`) lolos tanpa header; `*.workers.dev`
**tetap 403** tanpa header; hostname yang tidak dikenal **ditolak walau headernya sah**.
`/health` melaporkan jalur yang benar-benar dipakai lewat field baru
`edgeGuardPath`: `"custom-domain"` (utama), `"header"` (cadangan), `"off"` (transisi).
Field lama `edgeGuard` **tetap** `"on"`/`"off"` karena probe hidup
(`tools/fiezel-health-probe.mjs`, `staging-live-test.js`) menilai `!== "on"` sebagai
KRITIS.

Cara membaca keadaan nyata, bukan menebaknya:

```bash
curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuardPath":"[a-z-]*"'
# "custom-domain" = sudah lewat Cloudflare langsung (jembatan TIDAK dipakai)
# "header"        = masih lewat PHP di origin ArenHost (cache DNS lama)
```

**Jangan mencabut jembatan ini sampai jawaban di atas konsisten `custom-domain`**
untuk periode pengamatan penuh. Sisi `owner` **belum menjadi custom domain** sama
sekali — `owner.fiezel.my.id` masih 100% bergantung pada `owner-index.php`, dan
penjaga owner **sengaja tidak** punya jalur hostname-tepercaya
(`owner-edge-guard-test.js` butir (f) menjaga asimetri itu).

## Isi

| Berkas | Dipasang di | Keterangan |
|---|---|---|
| `api-index.php` | `~/public_html/api/index.php` (cPanel ArenHost) | Proxy penerus ke Worker `fiezel-api`. Nilai secret di repo adalah placeholder `__EDGE_SECRET__`. |
| `owner-index.php` | `~/public_html/owner/index.php` (cPanel ArenHost) | Proxy penerus ke Worker `fiezel-owner` (dashboard owner, **HTML**). Pola sama, allowlist berbeda. Placeholder yang sama. |

**Nilai `EDGE_SHARED_SECRET` yang sungguhan TIDAK ADA di repo ini dan tidak boleh
pernah masuk.** Yang tercatat hanya placeholder dan cara menyuntiknya saat
pemasangan. Gerbang `edge-guard-test.js` butir (g) memindai `api-index.php` dan
`owner-edge-guard-test.js` butir (d) memindai `owner-index.php` untuk memastikan itu
tetap benar.

**Dua proxy, dua nilai secret yang BERBEDA.** `fiezel-api` dan `fiezel-owner` adalah dua
Worker dengan penyimpanan Secret sendiri-sendiri. Memakai satu nilai untuk keduanya tidak
memberi kemudahan apa pun (keduanya di-`sed` saat pemasangan) tetapi menyatukan radius
ledakan: satu berkas PHP yang terbaca sebagai teks akan membuka **kedua** Worker. Jadi:
terbitkan dua nilai.

---

## 1. Kenapa jembatan ini ada

Rancangan aslinya: `api.fiezel.my.id` adalah **custom domain Worker** Cloudflare.
Itu mensyaratkan zona `fiezel.my.id` **Active** di Cloudflare. Zona itu masih
`pending` karena nameserver dipegang reseller (ArenHost → PT Digital Registra) dan
penggantiannya harus lewat tiket (`docs/CF-MIGRATION-RUNBOOK.md` Bagian 1(c)).
Jalur "zona subdomain" saja sudah diuji dan **tidak tersedia di plan Free** — ia
butuh Enterprise (Bagian 1(a1)).

Yang tidak bisa dikompromikan sementara menunggu: **cookie identitas `fz_id` harus
pihak pertama di `fiezel.my.id`.** Kalau aplikasi memanggil `*.workers.dev`
langsung, `workers.dev` ada di public suffix list ⇒ lintas situs ⇒ cookie
`SameSite=Lax` **tidak terkirim**, dan seluruh model identitas + kuota runtuh
menjadi token `localStorage` yang bisa direset murid dengan menghapus data
aplikasi. Itu tepat kelas kegagalan yang bab 8 mandatkan untuk dicegah.

Jadi: `api.fiezel.my.id` dibuat sebagai **subdomain cPanel di origin ArenHost yang
sama** (jadi cookie `Domain=fiezel.my.id` tetap pihak pertama), dan `index.php` di
dalamnya meneruskan ke `https://fiezel-api.fitrajft.workers.dev`.

Terbukti jalan, bukan diasumsikan: `/api/auth/anon` memasang cookie `fz_id`
`Domain=fiezel.my.id`, lalu `/api/user/me` dan `/api/quota` menjawab 200 dengan
cookie itu, dan `cf-live-contract-test.js` lulus **33 assert** melawan
`https://api.fiezel.my.id`.

## 2. Sifat yang disengaja

- **Hanya meneruskan. Nol logika bisnis.** Semua penegakan (identitas, kuota,
  breaker, cap byte) tetap di Worker. Kalau logika mulai tumbuh di PHP, ia menjadi
  Worker kedua yang tidak punya gerbang CI — itu garis yang tidak boleh dilewati.
- **Allowlist endpoint, default TOLAK.** Path yang tidak terdaftar dijawab 404 di
  origin tanpa menyentuh Worker; metode yang salah dijawab 405. Rute baru **harus**
  didaftarkan sadar di `const ALLOW`, tidak lolos diam-diam.
- **Header rahasia `X-Fiezel-Edge`** dikirim pada setiap permintaan. Worker
  (`workers/api/mw-edge.js`) menolak 403 apa pun yang tidak membawanya. Tanpa ini,
  alamat `*.workers.dev` terbuka lebar (lihat §3).
- **Preflight `OPTIONS` dijawab di PHP**, tidak diteruskan — menghemat satu hop
  penuh untuk permintaan yang tidak membawa data.
- **IP mentah TIDAK diteruskan.** Worker hanya butuh pengenal ber-hash untuk
  anti-abuse; meneruskan IP memperbesar permukaan data pribadi tanpa manfaat.
- **Audio TIDAK lewat sini.** Aset suara dilayani langsung dari R2 / Worker audio.
  Alasannya di §5 (angka).
- **Cap byte 128 KB di PHP** hanya penjaga kasar supaya satu proses PHP di hosting
  bersama tidak menelan body raksasa; cap sesungguhnya (20000/12000/100000/8192)
  tetap ditegakkan Worker di `schema.js`.

## 3. Lubang yang ditutup header ini

Worker hidup di **dua** alamat selama jembatan ada. Alamat asal
`https://fiezel-api.fitrajft.workers.dev` tidak bisa dimatikan, karena proxy PHP
memanggilnya. Selama ia terbuka tanpa syarat:

- siapa pun bisa `POST /api/auth/anon` langsung ke sana, **melewati jembatan**;
- setiap penerbitan menulis baris ke D1 (`identity`, `anon_issue`);
- setiap identitas baru membawa **jatah gratisnya sendiri** (AI/TTS).

Artinya alamat terbuka = pintu untuk mengisi D1 plan gratis **dan** menguras kuota
gratis akun. Gerbang origin Worker tidak bisa menutupnya: pemanggil langsung tidak
mengirim `Origin` sama sekali, dan `originGate` sengaja meloloskan permintaan tanpa
`Origin` (non-browser / same-origin). Karena itu pemeriksaannya harus header
bersama, dan harus terjadi **sebelum** satu byte D1/KV disentuh.

Perbandingannya **waktu-konstan** (`ctEq()`, pola `workers/owner/index.js:65`).
Operator kesetaraan biasa berhenti pada byte pertama yang berbeda, jadi waktunya
membocorkan panjang prefiks yang cocok — dan header ini bisa dikirim tanpa batas.

Bila secret **belum** dipasang, Worker tetap jalan (deploy tidak mati mendadak),
mencatat peringatan, dan `/health` melaporkan `edgeGuard:"off"`. **`off` bukan mode
produksi:** selama `off`, lubang di atas MASIH ADA.

## 4. Cara memasang

Semua perintah dijalankan dari mesin owner. `<USER>` dan `<HOST>` sesuai akun
cPanel ArenHost.

```bash
# 0. Siapkan satu nilai secret. SATU nilai untuk dua tempat.
SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"

# 1. Pasang di Worker LEBIH DULU? TIDAK. Urutannya: PROXY dulu, Worker belakangan.
#    Alasannya konkret: begitu Worker punya secret, ia menolak 403 semua
#    permintaan tanpa header. Kalau proxy belum mengirim header, jendela antara
#    dua langkah itu = API murid mati total. Sebaliknya (proxy dulu) tidak
#    merugikan apa pun: Worker mengabaikan header yang tidak ia periksa.

# 2. Suntik secret ke salinan lokal, JANGAN ke berkas repo.
sed "s|__EDGE_SECRET__|$SECRET|" deploy/edge/api-index.php > /tmp/fz-api-index.php
grep -c '__EDGE_SECRET__' /tmp/fz-api-index.php   # HARUS: 0
git status --short deploy/edge/                   # HARUS: kosong (repo tak tersentuh)

# 3. Unggah ke subdomain `api.fiezel.my.id` (document root-nya ~/public_html/api).
scp /tmp/fz-api-index.php <USER>@<HOST>:~/public_html/api/index.php
shred -u /tmp/fz-api-index.php 2>/dev/null || rm -f /tmp/fz-api-index.php

# 4. Izin berkas. 644, BUKAN 664/666: berkas ini memuat secret, dan hosting
#    bersama berarti proses lain ada di mesin yang sama.
ssh <USER>@<HOST> 'chmod 644 ~/public_html/api/index.php && ls -l ~/public_html/api/index.php'
```

`.htaccess` di `~/public_html/api/.htaccess` — semua path dialihkan ke `index.php`
supaya `/api/auth/anon` sampai ke proxy, dan berkas apa pun selain `index.php`
tidak bisa dibaca lewat HTTP:

```apache
# api.fiezel.my.id — seluruh permintaan masuk ke satu proxy.
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Jangan pernah menyajikan berkas lain dari direktori ini (mis. index.php.bak
# yang dibuat editor cPanel — berkas .bak DISAJIKAN sebagai teks, dan itu
# membocorkan secret ke publik).
<FilesMatch "\.(bak|orig|save|swp|old|php~|dist)$">
  Require all denied
</FilesMatch>

# Header rahasia tidak boleh bisa disuntik dari luar ke proxy ini.
RequestHeader unset X-Fiezel-Edge
```

Lalu pasang secret yang **sama** di Worker, dan verifikasi:

```bash
cd workers/api && npx wrangler@3 secret put EDGE_SHARED_SECRET   # tempel $SECRET

# (a) Lewat jembatan: tetap 200, dan edgeGuard HARUS "on".
curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuard":"[a-z]*"'
# HARUS: "edgeGuard":"on"     <-- "off" = secret belum aktif, lubang masih terbuka

# (b) Langsung ke workers.dev tanpa header: HARUS 403.
curl -s -o /dev/null -w '%{http_code}\n' https://fiezel-api.fitrajft.workers.dev/health
# HARUS: 403

# (c) Langsung ke workers.dev dengan header salah: HARUS 403 (bukan 401/404).
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'X-Fiezel-Edge: salah' https://fiezel-api.fitrajft.workers.dev/health
# HARUS: 403

# (d) Penerbitan identitas langsung: HARUS 403, dan D1 TIDAK bertambah baris.
curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://fiezel-api.fitrajft.workers.dev/api/auth/anon
# HARUS: 403

# (e) Probe monitor tanpa header: 200, dan TANPA daftar capabilities.
curl -s https://fiezel-api.fitrajft.workers.dev/healthz
# HARUS PERSIS: {"ok":true,"protocol":"1.7"}
```

Monitor eksternal (UptimeRobot dsb.) **wajib** diarahkan ke `/healthz`, bukan
`/health`: `/health` ikut dilindungi gerbang justru karena ia mengumumkan
`capabilities`, dan daftar itu adalah peta permukaan serang.

**Rotasi secret:** pasang nilai baru di proxy lebih dulu (langkah 2-4), lalu
`wrangler secret put`. Urutan terbalik = jendela 403 untuk seluruh murid.

## 4A. Cara memasang jembatan `owner.fiezel.my.id`

Masalahnya persis sama, satu tingkat lebih parah: Worker `fiezel-owner` **sudah
ter-deploy** tetapi `owner.fiezel.my.id` **tidak bisa** dibuat sebagai custom domain
(zona `fiezel.my.id` belum di Cloudflare — §1), sehingga dashboard analytics owner
**tidak bisa diakses sama sekali**. Dashboard tanpa hostname sama dengan dashboard yang
tidak pernah dibangun.

Jadi pola yang sama dipakai — **disalin, bukan ditemukan ulang**: subdomain cPanel `owner`
di origin ArenHost yang sama + `owner-index.php` yang meneruskan ke
`https://fiezel-owner.fitrajft.workers.dev`.

**Beda yang perlu diketahui sebelum memasang:**

- **Jawabannya HTML, bukan JSON.** `Content-Type: text/html; charset=utf-8` harus lewat
  utuh, dan **header keamanan yang dipasang Worker wajib ikut lewat**:
  `Content-Security-Policy` (ketat: `default-src 'none'`), `X-Robots-Tag: noindex`,
  `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Proxy yang
  menjatuhkan CSP mengubah halaman ber-CSP ketat menjadi halaman tanpa CSP **tanpa satu
  pun tanda yang terlihat** — halamannya tetap tampil benar. Karena itu keempat header itu
  ada di `$passThrough`, dan `owner-edge-guard-test.js` butir (c) mengambil header dari
  respons Worker yang sungguhan lalu menuntut setiap satu di antaranya ada di daftar itu.
- **`Location` + `Set-Cookie` wajib lewat, redirect TIDAK diikuti proxy.** Login yang
  berhasil menjawab `303 → /` sambil memasang cookie `fz_owner`. Kalau curl mengikuti
  redirect sendiri (`CURLOPT_FOLLOWLOCATION = true`), cookie itu mati di proses PHP dan
  login yang berhasil terlihat seperti login yang gagal.
- **Nol header CORS.** Dashboard owner adalah HTML pihak pertama tanpa fetch lintas asal;
  menambahkan CORS hanya memperluas permukaan yang tidak dipakai siapa pun.
- **Allowlist-nya rute dashboard owner** (`/`, `/login` GET+POST, `/logout`,
  `/api/summary`, `/api/series`, `/api/retention`, `/api/cost`) — sumbernya `OWNER_ROUTES`
  + `PUBLIC_ROUTES` di `workers/owner/index.js`, dan gerbang membandingkan dua daftar itu.
  Rute Worker yang lupa didaftarkan akan 404 di origin; rute karangan di allowlist
  memerahkan CI.
- **`/healthz` TIDAK ada di sini.** Dashboard owner tidak dipantau monitor eksternal, jadi
  penjaga edge owner punya **nol** path bebas header (`EDGE_FREE_PATHS = []`).

```bash
# 0. Buat subdomain di cPanel: Domains → Create A New Domain
#    Domain: owner.fiezel.my.id
#    Document Root: public_html/owner        <-- DOCROOT TERPISAH, jangan di dalam public_html/api
#    Alasannya bukan kerapian: satu docroot berarti satu .htaccess dan satu allowlist untuk
#    dua permukaan yang sangat berbeda (API murid vs angka bisnis). Salah satu longgar =
#    keduanya longgar.

# 1. Terbitkan secret KHUSUS owner (jangan pakai ulang nilai jembatan api — lihat §2).
SECRET_OWNER="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"

# 2. URUTAN: PROXY dulu, Worker belakangan. Sama seperti §4, dan alasannya sama — begitu
#    Worker owner punya EDGE_SHARED_SECRET, ia menolak 403 SEMUA permintaan tanpa header,
#    termasuk halaman masuk. Kalau proxy belum mengirim header, jendela antara dua langkah
#    itu = dashboard mati total.

# 3. Suntik secret ke salinan lokal, JANGAN ke berkas repo.
sed "s|__EDGE_SECRET__|$SECRET_OWNER|" deploy/edge/owner-index.php > /tmp/fz-owner-index.php
grep -c '__EDGE_SECRET__' /tmp/fz-owner-index.php   # HARUS: 0
git status --short deploy/edge/                     # HARUS: kosong (repo tak tersentuh)

# 4. Unggah ke docroot subdomain owner.
scp /tmp/fz-owner-index.php <USER>@<HOST>:~/public_html/owner/index.php
shred -u /tmp/fz-owner-index.php 2>/dev/null || rm -f /tmp/fz-owner-index.php

# 5. Izin berkas. 644, BUKAN 664/666: berkas ini memuat secret di hosting bersama.
ssh <USER>@<HOST> 'chmod 644 ~/public_html/owner/index.php && ls -l ~/public_html/owner/index.php'
```

`.htaccess` di `~/public_html/owner/.htaccess` — sama polanya dengan `api`, dan blok
`FilesMatch` **bukan hiasan**: editor berkas cPanel membuat `index.php.bak`, dan berkas
`.bak` **DISAJIKAN sebagai teks** oleh Apache. Di jembatan owner, teks itu memuat secret
jembatan.

```apache
# owner.fiezel.my.id — seluruh permintaan masuk ke satu proxy.
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

# Jangan pernah menyajikan berkas lain dari direktori ini (mis. index.php.bak yang dibuat
# editor cPanel — berkas .bak DISAJIKAN sebagai teks, dan itu membocorkan secret ke publik).
<FilesMatch "\.(bak|orig|save|swp|old|php~|dist)$">
  Require all denied
</FilesMatch>

# Header rahasia tidak boleh bisa disuntikkan dari luar ke proxy ini.
RequestHeader unset X-Fiezel-Edge
```

Lalu pasang secret yang **sama dengan `$SECRET_OWNER`** di Worker owner, dan verifikasi:

```bash
cd workers/owner && npx wrangler@3 secret put EDGE_SHARED_SECRET   # tempel $SECRET_OWNER

# (a) Lewat jembatan: halaman masuk hidup, HTML, ber-CSP, dan noindex.
curl -si https://owner.fiezel.my.id/login | grep -iE 'HTTP/|content-type|content-security-policy|x-robots-tag'
# HARUS: 200 · text/html; charset=utf-8 · default-src 'none' · noindex

# (b) Langsung ke workers.dev tanpa header: HARUS 403 di SEMUA rute, termasuk /login.
for p in / /login /logout /api/summary /api/series /api/retention /api/cost; do
  curl -s -o /dev/null -w "$p %{http_code}\n" https://fiezel-owner.fitrajft.workers.dev$p
done
# HARUS: 403 semuanya

# (c) Login sungguhan lewat jembatan: 303 + cookie fz_owner pihak pertama.
curl -si -X POST https://owner.fiezel.my.id/login -d 't=<TOKEN_OWNER>' | grep -iE 'HTTP/|location|set-cookie'
# HARUS: 303 · location: / · set-cookie: fz_owner=...; HttpOnly; Secure; SameSite=Strict

# (d) Dan lapis kedua tetap berdiri: header edge benar TIDAK menggantikan sesi owner.
curl -s -o /dev/null -w '%{http_code}\n' -H "X-Fiezel-Edge: $SECRET_OWNER" \
  https://fiezel-owner.fitrajft.workers.dev/api/summary
# HARUS: 403 (tidak ada cookie sesi)
```

**Rotasi secret owner:** sama seperti §4 — nilai baru di proxy lebih dulu (langkah 3-5),
lalu `wrangler secret put`. Urutan terbalik = jendela 403 untuk seluruh dashboard.

**Lapis kedua (Cloudflare Access) jujur soal batasnya:** Access dipasang **per hostname**.
Selama dashboard dijangkau lewat `owner.fiezel.my.id` di origin ArenHost, Access Cloudflare
**tidak** berada di jalur itu, dan alamat `*.workers.dev` juga tidak terlindung olehnya.
Yang menutup alamat `workers.dev` selama masa jembatan hanyalah `EDGE_SHARED_SECRET`.
Access baru menjadi lapis nyata sesudah pembongkaran (§6 langkah 3a).

## 5. Harga yang dibayar — dicatat jujur, bukan disembunyikan

- **Latensi.** Hop PHP tambahan terukur pada `/health`: **2.214 ms** saat dingin,
  lalu **~1.051–1.163 ms** saat hangat; pengukuran berikutnya melihat lantai yang
  lebih rendah, **847 ms**, jadi rentang hangat yang jujur adalah **847–1.163 ms**.
  `/healthz` dingin sempat **2.071 ms**. Kecil untuk JSON, tetapi ia **nyata dan
  selalu ada**. Uraian biaya dan apa yang sudah ditekan ada di §5b.
- **Titik gagal tunggal.** Origin PHP ArenHost sekarang berada di jalur setiap
  panggilan API. Kalau hosting bersama itu mati atau kena batas proses, seluruh API
  mati **walaupun Worker Cloudflare sehat**. Sebelum jembatan, kegagalan origin
  tidak menyentuh API.
- **Karena itu aset audio TIDAK lewat jembatan.** Berkas audio berukuran ratusan kB
  sampai MB; melewatkannya lewat satu proses PHP di hosting bersama akan mengubah
  hop 1 ms menjadi leher botol yang mematikan pelajaran mendengarkan, dan itu
  memindahkan risiko dari JSON kecil ke jalur yang paling ditunggu murid. Audio
  tetap dari R2 / Worker audio langsung.

## 5b. A7 — dari mana latensi itu datang, dan apa yang sudah ditekan

Bagian ini adalah **telaah lebih dulu, ukur belakangan**. Angka yang ada baru angka
**SEBELUM**; lihat §5d untuk pengakuan jujur soal itu.

### 5b.1 Uraian biaya per permintaan (urut dari yang terbesar)

| # | Sumber biaya | Bisa ditekan dari PHP? | Status sesudah A7 |
|---|---|---|---|
| 1 | **Handshake TLS baru ke upstream, setiap permintaan** | sebagian | TFO + h2 (lihat 5b.2) |
| 2 | Resolusi DNS berulang | sebagian | IPv4-only; DNS cache curl **tidak menolong** |
| 3 | Dekompresi lalu kompresi ulang badan | ya | **dihapus** |
| 4 | HTTP/1.1 ke upstream (tanpa HPACK, badan `chunked`) | ya | dipaksa `2TLS` |
| 5 | Startup PHP | tidak dari dalam berkas | urusan konfigurasi origin |

**(1) Tidak ada reuse koneksi antar proses — dan ini biaya terbesar.** Satu permintaan
HTTP ke `api.fiezel.my.id` = satu proses/worker PHP = satu handle curl baru = TCP +
TLS penuh ke `*.workers.dev`. Cache sesi TLS curl hidup **di dalam handle**
(`CURLOPT_SSL_SESSIONID_CACHE`), dan handle itu mati bersama proses. Jadi 1×RTT TCP +
1–2×RTT TLS terbayar **ulang, selalu**. Tidak ada `Connection: keep-alive` yang bisa
menolong, karena tidak ada proses yang hidup cukup lama untuk memegang koneksinya.
Ini **batas struktural jembatan**, bukan sesuatu yang kurang dioptimasi.

**(2) DNS.** Nasibnya sama: cache DNS curl juga hidup di handle/share handle, jadi ia
mati bersama proses. Karena itu **`CURLOPT_DNS_CACHE_TIMEOUT` SENGAJA TIDAK
DIPASANG** — nilai berapa pun tidak akan pernah kena hit di model
satu-permintaan-satu-proses, dan opsi yang menghemat 0 ms tetapi terlihat seperti
optimasi adalah komentar yang berbohong kepada pembaca berikutnya. Yang benar-benar
meredam biaya DNS adalah resolver OS origin (nscd/systemd-resolved) — di luar kendali
PHP — dan `CURLOPT_IPRESOLVE` di 5b.2.

**(3) `CURLOPT_ENCODING => ''` adalah kerja ganda tanpa manfaat.** Ia membuat curl
meminta gzip lalu **mendekompresi** badan di origin, padahal badan itu hanya
diteruskan apa adanya ke murid — dan lapisan web origin lalu berpeluang meng-gzip
**ULANG**. Dua kali kerja CPU untuk byte yang sama, di hosting bersama yang CPU-nya
adalah sumber daya paling langka. **Dihapus.**

**(4) HTTP/1.1 vs HTTP/2.** Tanpa dipaksa, curl bisa memakai 1.1 ke Cloudflare.
Setiap permintaan di sini membawa `Cookie` + `User-Agent`, dan pada 1.1 header itu
dikirim sebagai teks penuh (tanpa HPACK); responsnya datang ber-`chunked` dengan
overhead framing per potong. Bukan ratusan ms — puluhan-an ms, dan itu ditulis apa
adanya supaya tidak ada yang mengharapkan keajaiban.

**(5) Startup PHP.** Menyalakan interpreter + parse berkas proxy ada harganya
(puluhan ms bila **opcache** mati). Yang bisa dilakukan dari dalam repo sudah
dilakukan: berkas itu **nol dependency, nol autoloader, nol include**. Sisanya milik
konfigurasi origin: `opcache.enable=1`, `opcache.validate_timestamps` boleh tetap
hidup (satu berkas, jarang berubah), dan PHP-FPM lebih baik daripada CGI karena
CGI menyalakan interpreter dari nol pada setiap permintaan. Itu **saran untuk
master**, bukan klaim bahwa sudah beres.

### 5b.2 Sakelar yang dipasang — apa yang dihemat, apa risikonya

Setiap baris di bawah punya komentar padanannya di `api-index.php` (gerbang
`edge-proxy-contract-test.js` butir (g) menuntutnya, jadi ia tidak bisa hilang):

| Sakelar | Hemat | Risiko |
|---|---|---|
| `CURL_HTTP_VERSION_2TLS` | header ter-HPACK, respons tanpa framing `chunked` | ~nol; `2TLS` **jatuh otomatis** ke 1.1 |
| `CURLOPT_TCP_FASTOPEN` | sampai **satu RTT** pada pembuatan koneksi; cookie TFO ada di **kernel** sehingga bertahan antar proses | **nyata**: sebagian middlebox membuang SYN berisi data ⇒ pemulihan lewat retransmit bisa **menambah** ratusan ms. Karena itu ia punya sakelar sendiri `ENABLE_TCP_FASTOPEN` |
| `CURLOPT_TCP_KEEPALIVE` (+`KEEPIDLE`/`KEEPINTVL` 15 s) | 0 ms pada GET kecil — bukan itu gunanya. Ia untuk `/api/ai/task`: koneksi menganggur belasan detik, NAT/firewall membuang pemetaan **senyap**, dan hasilnya timeout 25 s dengan kuota sudah terbakar | beberapa paket kecil per permintaan panjang |
| `CURLOPT_IPRESOLVE = V4` | satu query DNS (AAAA) hilang, dan yang lebih mahal: tidak ada "happy eyeballs" mencoba IPv6 yang tidak benar-benar berfungsi di hosting bersama | kalau origin suatu hari IPv6-only, ini pemutus total — tetapi gejalanya 502 seragam, bukan halus |
| Pass-through gzip (tanpa `CURLOPT_ENCODING`) | nol dekompresi + nol kompresi ulang di origin | badan gzip diteruskan, jadi **hanya** bila klien mengiklankan gzip **dan** `zlib.output_compression` origin mati (kalau tidak, gzip ganda = sampah) |
| `CURLPROTO_HTTPS`, `SSL_VERIFYPEER/HOST` eksplisit | 0 ms | 0; ia ikat pinggang kedua supaya optimasi berikutnya tidak menggerus TLS |
| `CURLOPT_DNS_CACHE_TIMEOUT` | **tidak dipasang** — 0 ms (lihat 5b.1 poin 2) | — |

### 5b.3 Cache — kesimpulannya: **TIDAK ADA yang boleh di-cache**

Kandidat satu-satunya adalah `GET /healthz` dan `GET /api/config`; semua jalur lain
menyentuh identitas/kuota atau membawa `Set-Cookie`, jadi haram di-cache tanpa
diskusi. Setelah diperiksa ke sumbernya, **keduanya juga tidak boleh**:

- **`/api/config` mengirim `Cache-Control: no-store` eksplisit**
  (`workers/api/route-config.js`). Endpoint itu **adalah kill switch runtime**:
  men-cache-nya berarti "matikan AI sekarang" tertunda selama TTL cache — persis
  kelas kegagalan yang endpoint itu diciptakan untuk mencegah.
- **`/healthz` juga `no-store`**: `jsonResponse` (`workers/api/errors.js`) memasang
  `cache-control: no-store` bila rute tidak memasang sendiri. Dan men-cache probe
  kesehatan berarti monitor melaporkan "hidup" dari berkas cache saat Worker sudah
  mati. **Cache pada probe = monitor yang berbohong.**

Karena `Cache-Control` upstream dihormati **mutlak**, dan kedua kandidat berkata
`no-store`, hasil akhirnya **nol jalur yang boleh di-cache**. Jadi tidak ada mesin
cache yang dipasang: ia hanya akan menambah permukaan gagal (berkas cache di hosting
bersama, risiko keracunan, risiko ikut menyimpan `Set-Cookie`) demi 0 ms. Kalau suatu
hari Worker mengirim `Cache-Control: public, max-age=N` pada satu jalur bebas
identitas, keputusan ini boleh ditinjau ulang — dan gerbang butir (c) sudah menunggu
untuk menuntut penjaganya (denylist identitas/kuota + bypass `Set-Cookie` + hormati
`no-store`).

### 5b.4 Jalur gagal: `CURLOPT_CONNECTTIMEOUT` 8 s → 4 s

`CONNECT_S` **hanya** mengatur leg **origin (ArenHost) → tepi Cloudflare**, BUKAN leg
**murid → origin**. Ini yang paling sering dicampur: jaringan murid Indonesia yang
lambat (3G di kabupaten, paket data tersendat) memengaruhi leg pertama, dan leg itu
diatur timeout server web/browser — bukan konstanta ini. Leg yang diatur di sini
adalah datacenter → tepi Cloudflare terdekat (CGK/SIN), RTT puluhan ms, dan total
permintaan terburuk yang pernah terukur pun hanya 2.214 ms.

- **Angka: 4 s.** Masih memberi ruang untuk satu retry DNS (biasanya ~1 s + ~1 s)
  plus satu handshake.
- **Trade-off jujur:** bila resolver origin sedang sangat sakit (>4 s), permintaan
  yang dulu akhirnya berhasil pada detik ke-6 sekarang gagal 502. Itu pertukaran yang
  disengaja: **gagal cepat dan jujur** (murid melihat pesan jaringan dan bisa mencoba
  lagi) lebih baik daripada 8 detik layar menunggu yang berakhir sama gagalnya.
- **Jangan turunkan ke bawah ~3 s tanpa angka baru:** di bawah itu satu retry DNS
  saja sudah tidak kebagian waktu.

Selain itu batas **total** dipecah menjadi dua, karena dua kelas permintaan tidak
boleh berbagi kesabaran: `TIMEOUT_FAST_S = 8` untuk GET JSON kecil (`/health`,
`/healthz`, `/api/config`, `/api/tts/manifest`) dan `TIMEOUT_S = 25` untuk jalur model
(`/api/ai/task`, `/api/tts/render`) yang memang boleh berpikir lama. Default-nya
**sabar**: jalur yang tidak terdaftar di `FAST_TIMEOUT_PATHS` otomatis dapat 25 s,
jadi menambah rute baru tidak bisa diam-diam memotong jawaban model. Kegagalan pun
dibedakan: **504 `upstream_timeout`** (mencoba lagi masuk akal) vs **502
`upstream_unreachable`** (jalurnya rusak) — keduanya pesan generik, nol byte dari
`curl_error()`.

## 5c. Cara mengukur (`tools/edge-latency-probe.mjs`)

Node murni, nol dependency, **nol rahasia** (tidak membaca env secret, tidak mengirim
cookie, tidak mengirim `X-Fiezel-Edge`), target **dari argumen** supaya ia tidak bisa
tersangkut di CI dan menembak produksi pada setiap push. Ia melaporkan **p50/p95** atas
N permintaan untuk `/healthz`, `/health`, `/api/config`; permintaan pertama tiap jalur
dilaporkan tersendiri sebagai `cold` dan **tidak** masuk hitungan p50/p95 — mencampurnya
akan membuat p95 palsu yang sebenarnya hanya biaya penyalaan proses PHP pertama.

Kalau proxy versi baru sudah terpasang, ia juga merangkum header `Server-Timing` yang
dikirim jembatan (`edge_dns`, `edge_tcp`, `edge_tls`, `upstream_ttfb`, `edge_total`) —
di situlah pertanyaan "handshake TLS atau Worker yang mahal?" dijawab dengan angka.

```bash
# (1) SEBELUM — jalankan ini SEBELUM mengunggah versi baru proxy.
node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 --json=A7-SEBELUM.json

# (2) Pasang versi baru (langkah §4 tetap berlaku; secret disuntik ke salinan /tmp).
#     Simpan salinan lama lebih dulu supaya bisa dibalikkan tanpa mengarang ulang:
#     ssh <USER>@<HOST> 'cp ~/public_html/api/index.php ~/api-index.php.a7-sebelum'

# (3) SESUDAH — bandingkan langsung terhadap baseline.
node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 \
  --baseline=A7-SEBELUM.json --json=A7-SESUDAH.json
```

Cara membaca hasilnya, supaya tidak salah menyimpulkan:

- **Bandingkan p50 dan p95, bukan `cold`.** `cold` tunggal berisik; ia dilaporkan
  hanya supaya biaya proses pertama tidak hilang dari catatan.
- **Kalau p95 justru MEMBURUK**, tersangka pertamanya TCP Fast Open (middlebox
  membuang SYN berisi data). Matikan dengan mengubah **satu** konstanta
  `ENABLE_TCP_FASTOPEN = false` di proxy, unggah ulang, ukur lagi. Jangan menebak di
  blok curl.
- **Kalau `edge_tls` p50 mendominasi `edge_total`**, itu konfirmasi biaya nomor 1:
  tidak ada perbaikan PHP yang akan menghapusnya. Yang menghapusnya adalah §6.

## 5d. Angka SESUDAH: **belum ada** — dan itu bukan kelalaian

**Angka sesudah belum ada.** Pemasangan versi baru proxy membutuhkan SSH/cPanel ke
origin ArenHost, dan **hanya master yang memegangnya** (`MASTER-ONLY-GOVERNANCE.md`).
Agen ini tidak memasang apa pun ke server, jadi tidak ada satu pun pengukuran
"sesudah" yang boleh diklaim. Yang tersedia: analisis di §5b, kode yang sudah
diterapkan, gerbang CI yang menjaganya, dan **perintah siap-jalan** di §5c untuk
master. Sampai master menjalankan (1) dan (3), status yang benar adalah
**"diperkirakan membaik, belum terbukti"** — bukan "lebih cepat".

## 5e. F4 — CACAT PRODUKSI: **permintaan ke-3 menggantung di browser**

> **Ini bukan catatan latensi.** §5–§5d bicara soal milidetik. Bagian ini bicara soal
> permintaan yang **tidak pernah selesai**, dan itu pemblokir rollout.

### 5e.1 Apa yang terukur

Gerbang **E2E browser** (`tools/fiezel-e2e-bridge.mjs`, skenario `bridge-hop-stable`)
menembak `/api/quota` **beruntun** dari satu halaman kosong, pada **satu koneksi**:

```
#1 200 1853ms | #2 200 943ms | #3 TIMEOUT 8002ms
```

Sifat temuan, semuanya penting untuk diagnosisnya:

- **Reproducible** dari halaman kosong, pada **HTTP/2 maupun HTTP/1.1**.
- **TIDAK terlihat oleh `curl`** apa adanya: satu proses `curl` = satu koneksi baru,
  jadi ia tidak pernah menganyam beberapa permintaan di atas **satu** koneksi
  keep-alive seperti browser. Karena itu `cf-live-contract-test.js` (33 assert HIJAU)
  **tidak** menangkapnya, dan itu bukan kelemahan gerbang itu — ia menguji hal lain.
- Artinya: aplikasi murid yang menembak `/api/config` → `/api/user/me` → `/api/quota`
  berurutan **menggantung pada panggilan ketiga**. Yang dilihat murid bukan galat,
  tetapi layar menunggu tanpa akhir.
- `8002 ms` adalah **batas kesabaran klien** (`HOP_TIMEOUT` di gerbang E2E), bukan
  jawaban server. Server tidak menjawab apa pun.

### 5e.2 Lima hipotesis, dan mana yang benar-benar bisa dinilai dari kode

| # | Hipotesis | Bisa dinilai dari kode? | Putusan |
|---|---|---|---|
| 1 | Lock sesi PHP (`session_start()`) menyeriakan permintaan dari cookie yang sama | sebagian | Kedua proxy **tidak pernah** memanggil `session_start()`. **Tetapi** `session.auto_start=1` di `php.ini`/`.user.ini` origin memulai sesi **sebelum** baris pertama berkas berjalan, dan sesi = **lock berkas per cookie**: #2 menunggu #1, #3 menunggu dua-duanya — tepat pola yang terukur. **Ditutup:** `session_write_close()` tanpa syarat di baris pertama eksekusi `[F4-1]`. |
| 2 | cURL tanpa timeout / koneksi menggantung sampai batas atas | **ya** | `CURLOPT_TIMEOUT` + `CURLOPT_CONNECTTIMEOUT` **sudah** diset. Yang **salah** adalah angkanya: `/api/user/me` dan `/api/quota` mewarisi `TIMEOUT_S = 25 s`, sedangkan browser menyerah pada **8 s**. Proxy yang lebih sabar dari kliennya **memproduksi gantungan**: murid tidak pernah menerima galat. **Ditutup:** keduanya masuk `FAST_TIMEOUT_PATHS`, `TIMEOUT_FAST_S` **8 → 6 s**, plus klem `CLIENT_ABANDON_S` yang memaksa batas jalur cepat tetap di bawah batas klien `[F4-2]`. |
| 3 | Badan tidak di-flush / `Content-Length` diteruskan salah sehingga browser menunggu byte yang tidak akan datang | **ya** | `Content-Length` upstream **tidak** ada di `$passThrough`, tetapi ketiadaan itu hanya kebetulan daftar — tidak ada yang **melarangnya**. Dan buffer keluaran bawaan hosting (`output_buffering`) bisa menahan badan. **Ditutup:** `content-length` masuk daftar wajib-buang + `header_remove()` tanpa syarat `[F4-4]`; buffer nyasar dibuang di awal, badan di-`echo` **sekali**, lalu `flush()` + `fastcgi_finish_request()` `[F4-5]`. |
| 4 | Header hop-by-hop (`Connection`, `Keep-Alive`, `Upgrade`, …) diteruskan apa adanya ke klien | **ya** | Daftar `$passThrough` lama adalah allowlist, jadi hari ini nol hop-by-hop lolos — **tetapi tidak ada satu baris pun yang mencegah** `transfer-encoding` masuk daftar itu pada sunting berikutnya, dan tidak ada apa pun yang menyaring arah **naik**. **Ditutup:** satu daftar `HOP_BY_HOP` + `hopByHop()` dipakai **dua arah**, denylist **menang** atas allowlist `[F4-3]`. |
| 5 | Batas proses PHP per pengguna cPanel (`LSAPI_CHILDREN`/entry process) menghabiskan slot | **TIDAK** | Tidak bisa dinilai maupun dibuktikan dari repo ini: ia hidup di konfigurasi origin yang hanya master bisa lihat. Yang bisa dilakukan dari kode hanya **mempersempit**-nya — `fastcgi_finish_request()` melepas slot proses segera sesudah badan terkirim, alih-alih menahannya sampai proses mati `[F4-5]`. Sisanya harus dibaca dari cPanel (**Resource Usage → Faults / Entry Processes**) sesudah 5e.4 dijalankan. |

Dua sakelar transport A7 juga **dimatikan sementara**, dan alasannya bentuk cacatnya,
bukan selera:

- **`ENABLE_TCP_FASTOPEN = false`** `[F4-6]` — ia satu-satunya opsi di berkas itu yang
  bisa **menambah** detik (middlebox membuang SYN berisi data ⇒ pemulihan lewat
  retransmit) **dan** yang perilakunya **berubah sesudah beberapa koneksi**, karena
  cookie TFO baru ada di kernel setelah koneksi pertama berhasil. "Dua lolos, ketiga
  menggantung" adalah bentuk khas kelas itu. §5b.2 sudah menulis risikonya sejak awal.
- **`ENABLE_GZIP_PASSTHROUGH = false`** `[F4-7]` — badan gzip yang diteruskan mentah
  benar **hanya** bila lapisan web origin tidak meng-gzip ulang, dan itu **tidak bisa
  dibuktikan dari PHP** (`zlib.output_compression` hanya mengetahui kompresi PHP, bukan
  modul kompresi LiteSpeed). Kompresi ganda = badan yang gagal di-dekode browser,
  gejalanya **menggantung**, dan `curl` yang tidak mengiklankan gzip **tidak pernah
  melihatnya** — persis pola F4. Kodenya tetap ada; yang berubah satu konstanta, supaya
  ia bisa dinyalakan lagi dengan **bukti**, bukan dari ingatan.

Ini **menurunkan** target A7 (kedua sakelar itu penghematannya nyata). Pertukarannya
disengaja: **respons yang benar lebih penting daripada respons yang cepat.** Nyalakan
kembali satu per satu, masing-masing dengan satu jalannya gerbang E2E browser + satu
pengukuran `tools/edge-latency-probe.mjs`.

### 5e.3 Yang dijaga gerbang CI — dan yang TIDAK bisa dijaganya

`edge-proxy-hopbyhop-test.js` (node murni, **nol jaringan**) memuat **kedua** sumber PHP
sebagai teks dan meng-assert strukturnya: (a) daftar hop-by-hop dibuang dua arah;
(b) timeout cURL diset dan angkanya **lebih pendek** dari batas 8 s yang membuat browser
menyerah — angka itu dibaca dari `tools/fiezel-e2e-bridge.mjs`, bukan ditulis dua kali;
(c) nol `session_start()` tanpa `session_write_close()`; (d) `Content-Length` tidak
diteruskan mentah; (e) `__EDGE_SECRET__` tetap placeholder dan nol nilai berentropi tinggi
yang ter-commit. Setiap detektor **dibuktikan bisa merah** oleh matriks racun di dalam
berkas itu (pelanggaran disuntikkan ke salinan di memori; berkas repo tidak disentuh).

**Batasnya, ditulis supaya tidak ada yang salah paham:** gerbang itu mencegah kelas cacat
ini **kembali**. Ia **tidak** membuktikan cacat F4 **tertutup**. Assert atas teks tidak
pernah menutup cacat runtime.

### 5e.4 LANGKAH VERIFIKASI — wajib dijalankan pemilik SESUDAH berkas diunggah

Unggah dulu versi baru **kedua** berkas dengan langkah §4 (api) dan §4A (owner) — secret
tetap disuntik ke salinan `/tmp`, repo tidak disentuh. Simpan salinan lama supaya bisa
dibalikkan: `ssh <USER>@<HOST> 'cp ~/public_html/api/index.php ~/api-index.php.f4-sebelum'`.

**(1) Lima permintaan berurutan pada SATU koneksi.** Ini inti verifikasinya: `--next`
menyuruh satu proses `curl` mengirim permintaan berikutnya **di koneksi yang sama**,
sehingga ia meniru apa yang dilakukan browser. Lima `curl` terpisah **tidak** menguji hal
ini dan akan selalu terlihat hijau.

```bash
# Satu proses, satu koneksi, lima permintaan berurutan.
URL=https://api.fiezel.my.id/api/quota
FMT='#%{num_connects} http=%{http_code} total=%{time_total}s ttfb=%{time_starttransfer}s reused=%{num_connects}\n'
curl -s -o /dev/null -w "$FMT" "$URL" \
  --next -s -o /dev/null -w "$FMT" "$URL" \
  --next -s -o /dev/null -w "$FMT" "$URL" \
  --next -s -o /dev/null -w "$FMT" "$URL" \
  --next -s -o /dev/null -w "$FMT" "$URL"
```

Bentuk kedua, kalau `--next` tidak tersedia (curl tua) — ia **kurang kuat** karena setiap
baris bisa memakai koneksi baru, jadi pakai hanya sebagai cadangan:

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -H 'Connection: keep-alive' \
    -w "#$i http=%{http_code} total=%{time_total}s\n" \
    https://api.fiezel.my.id/api/quota
done
```

**Cara membaca hasilnya:**

- **HIJAU** = **lima** baris muncul, `http=200` (atau `401` bila tanpa cookie — yang
  penting **ada** kode statusnya), dan `total` setiap baris **di bawah ~3 s**.
- **`num_connects=1` pada baris pertama dan `0` pada baris berikutnya** = koneksi memang
  **dipakai ulang**. Kalau setiap baris menunjukkan koneksi baru, perintahnya belum
  menguji cacat ini — periksa versi curl.
- **MASIH RUSAK** = perintah berhenti mengeluarkan baris (menggantung), **atau** salah
  satu `total` melonjak ke ~6 s / ~25 s. Perhatikan baris **ke-3**.
- **`http=504` + `{"error":"upstream_timeout"}`** = **perbaikan bekerja sebagaimana
  dirancang**, meski upstream masih lambat: proxy sekarang **kalah lebih dulu** dari
  klien, jadi murid menerima galat yang bisa dicoba lagi, bukan gantungan. Yang harus
  dikejar selanjutnya adalah **kenapa** upstream lambat, dengan `Server-Timing` di (2).
- **`http=502`** = jalur origin → Cloudflare rusak (DNS/keluar origin), bukan gantungan.

**(2) Di mana waktunya terbakar.** Jembatan mengirim `Server-Timing`; satu perintah
memberi uraiannya tanpa menebak:

```bash
curl -sI https://api.fiezel.my.id/api/config | grep -i 'server-timing\|x-fiezel-edge-hop'
# edge_tls besar  => biaya handshake per permintaan (§5b.1 poin 1; hanya §6 yang menghapusnya)
# upstream_ttfb besar => Worker/Cloudflare yang lambat, bukan hop PHP
```

**(3) Header hop-by-hop benar-benar hilang dari jawaban.** Harus **nol** keluaran:

```bash
curl -sI https://api.fiezel.my.id/api/config \
  | grep -iE '^(connection|keep-alive|transfer-encoding|te|trailer|upgrade|proxy-)'
# HARUS: kosong
```

**(4) Kalau (1) masih merah, hipotesis 5 baru masuk giliran.** Buka cPanel →
**Resource Usage** dan lihat **Entry Processes / Faults** pada jam pengujian. Angka
`nproc`/entry-process yang tersentuh berarti batas proses per pengguna, dan itu **tidak**
bisa diperbaiki dari repo — ia paket hosting atau `LSAPI_CHILDREN`. Lampirkan angkanya
saat melapor; tanpa itu, langkah berikutnya hanya bisa menebak.

**(5) Dan yang MENUTUP cacat ini, satu-satunya:** jalankan ulang gerbang E2E browser
terhadap jembatan yang **sudah diperbarui**.

```bash
FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id node tools/fiezel-e2e-bridge.mjs
# Yang dicari: skenario `bridge-hop-stable` -> semua 5 panggilan 200 di bawah 8.000 ms.
```

### 5e.5 Pernyataan jujur

**Cacat ini hanya terbukti tertutup sesudah gerbang E2E browser (langkah 5e.4 (5))
dijalankan ulang terhadap jembatan yang sudah diperbarui. Analisis kode saja TIDAK
menutupnya.** Yang ada di commit ini: diagnosis lima hipotesis, perbaikan atas semua yang
bisa dinilai dari kode (1, 2, 3, 4 — dan penyempitan untuk 5), gerbang struktural yang
mencegahnya kembali, serta perintah siap-jalan di atas. Agen tidak punya SSH/cPanel ke
origin ArenHost (`MASTER-ONLY-GOVERNANCE.md`), jadi **nol** pengukuran "sesudah" boleh
diklaim di sini. Status yang benar sampai master menjalankan 5e.4 adalah
**"penyebab yang bisa dinilai dari kode sudah ditutup; gantungan belum terbukti hilang"**
— bukan "sudah beres".

## 6. PEMBONGKARAN — begitu nameserver pindah ke Cloudflare

Jembatan ini **harus dibongkar**, bukan dibiarkan menua. Urutannya penting: setiap
langkah aman untuk dibatalkan sampai langkah 5.

> **🔄 28 Agu 2026 — langkah 1 dan 2 sudah SEBAGIAN dijalankan.** Nameserver sudah di
> Cloudflare dan custom domain `api.fiezel.my.id` sudah terikat ke Worker, tetapi zona
> masih `pending` sehingga langkah 3 dan sesudahnya **BELUM boleh** dijalankan. Urutan
> yang masih berlaku ada di bawah; yang berubah hanya titik mulainya.
>
> **Daftar periksa penghapusan jalur header `X-Fiezel-Edge` (semua wajib benar):**
> 1. zona `fiezel.my.id` berstatus **Active**;
> 2. `dig +short A api.fiezel.my.id` hanya menjawab IP Cloudflare (bukan
>    `195.88.211.212`) lebih lama dari TTL record lama;
> 3. `curl -s https://api.fiezel.my.id/health` melaporkan
>    `"edgeGuardPath":"custom-domain"` secara konsisten, **nol** `"header"`;
> 4. `workers_dev = false` sudah ter-deploy (`*.workers.dev` mati secara struktural);
> 5. `deploy/edge/api-index.php` sudah dicabut dari origin.
>
> Sesudah kelimanya benar: hapus jalur header di `workers/api/mw-edge.js`
> (`EDGE_HEADER`, `ctEq`, `edgeSecret`, mode `off`) **dan** hapus var
> `ALLOW_NO_EDGE_SECRET` dari konfigurasi — **dihapus, bukan disetel `"false"`**;
> var yang masih ada akan dianggap sah oleh gerbang berikutnya. Lalu hapus Secret
> `EDGE_SHARED_SECRET` di kedua Worker. Yang **tetap tinggal**: penegakan hostname
> (`TRUSTED_EDGE_HOSTS`) dan `EDGE_FREE_PATHS = ['/healthz']`.
>
> **KEPUTUSANNYA MILIK OWNER**, dieksekusi MASTER (`MASTER-ONLY-GOVERNANCE.md`) —
> bukan oleh paket kerja yang kebetulan sedang menyentuh berkas ini.

1. **Tunggu zona `fiezel.my.id` berstatus `Active`** di Cloudflare (bukan
   `pending`), dan semua curl verifikasi `docs/CF-MIGRATION-RUNBOOK.md` Bagian 1(f)
   hijau. Jangan mulai sebelum ini.
2. **Pasang custom domain** untuk Worker: di `workers/api/wrangler.toml`,
   `routes = [{ pattern = "api.fiezel.my.id", custom_domain = true }]`, lalu
   `npx wrangler@3 deploy` (Runbook Bagian 2). **PRASYARAT:** subdomain cPanel
   `api.fiezel.my.id` harus dihapus lebih dulu (langkah 3), karena record DNS-nya
   akan bertabrakan dengan record proxied yang dibuat Wrangler.
3. **Hapus subdomain proxy di cPanel:** cPanel → Domains → `api.fiezel.my.id` →
   Remove, lalu hapus direktorinya:
   `ssh <USER>@<HOST> 'rm -rf ~/public_html/api'`. Berkas itu memuat secret; jangan
   ditinggalkan sebagai `index.php.bak`.
3a. **Jembatan owner dibongkar terpisah, urutannya sama:** hapus subdomain cPanel
   `owner.fiezel.my.id` (cPanel → Domains → Remove) dan jalankan
   `ssh <USER>@<HOST> 'rm -rf ~/public_html/owner'` **lebih dulu**, baru aktifkan kembali
   `[[routes]] pattern = "owner.fiezel.my.id", custom_domain = true` di
   `workers/owner/wrangler.toml` lalu `cd workers/owner && npx wrangler@3 deploy` — record
   DNS lama bertabrakan dengan record proxied yang dibuat Wrangler, persis seperti kasus
   `api`. Verifikasi sebelum lanjut: `dig +short A owner.fiezel.my.id` menunjuk IP
   Cloudflare, `curl -si https://owner.fiezel.my.id/login` tetap 200 + `text/html` + CSP
   ketat + `noindex`, dan login masih memasang cookie `fz_owner`. Sesudah hostname resmi
   berdiri, barulah Cloudflare Access di `owner.fiezel.my.id` menjadi lapis yang nyata.
4. **Verifikasi jalur baru** sebelum menutup pintu lama:
   ```bash
   dig +short A api.fiezel.my.id     # HARUS IP Cloudflare, bukan 195.88.211.212
   curl -s https://api.fiezel.my.id/health | grep -o '"protocol":"1.7"'
   curl -si https://api.fiezel.my.id/api/auth/anon -X POST -H 'Origin: https://fiezel.my.id' \
     | grep -i 'set-cookie'          # HARUS Domain=fiezel.my.id (pihak pertama, tetap)
   node cf-live-contract-test.js     # dengan FIEZEL_CF_LIVE_BASE=https://api.fiezel.my.id
   ```
   Kalau TLS masih error, tunggu 2-5 menit (sertifikat sedang diterbitkan) —
   **jangan** lanjut ke langkah 5.
5. **Matikan `workers.dev`:** `workers_dev = false` di `workers/api/wrangler.toml`,
   lalu deploy. Sesudah ini `https://fiezel-api.fitrajft.workers.dev` mati, dan
   lubang yang dijelaskan §3 hilang **secara struktural**, bukan karena header.
6. **Bersihkan sisa-sisanya:**
   - hapus `EDGE_SHARED_SECRET` di **kedua** Worker:
     `cd workers/api && npx wrangler@3 secret delete EDGE_SHARED_SECRET` lalu
     `cd workers/owner && npx wrangler@3 secret delete EDGE_SHARED_SECRET`;
   - `workers/owner/index.js`: penjaga edge yang disalin ke sana (`edgeGuard`,
     `EDGE_FREE_PATHS`, mode `off`) kehilangan alasan hidupnya bersamaan dengan
     `mw-edge.js` — hapus, satu keputusan sadar untuk kedua Worker;
   - hapus `deploy/edge/owner-index.php` bersama `api-index.php`, dan setel
     `workers_dev = false` untuk `fiezel-owner` juga;
   - arahkan monitor eksternal dari `/healthz` ke `/healthz` di hostname baru
     (rutenya tetap berguna, dan tetap boleh publik);
   - `workers/api/mw-edge.js`: sesudah langkah 5, mode `off` **tidak punya alasan
     hidup lagi**. Pilihannya sadar — hapus modulnya beserta `EDGE_FREE_PATHS`, atau
     ubah `off` menjadi penolakan tanpa syarat. Jangan tinggalkan mode `off` yang
     tidak lagi punya masa transisi untuk dibenarkan;
   - hapus direktori `deploy/edge/` ini dan bagiannya di
     `docs/CF-MIGRATION-RUNBOOK.md` — atau tandai keduanya **HISTORIS** dengan
     tanggal pembongkaran. Artefak deployment yang sudah tidak dipasang di mana pun
     adalah petunjuk yang menyesatkan orang berikutnya.

## Sumber

- `docs/CF-MIGRATION-RUNBOOK.md` — Bagian 1(a1) (zona subdomain butuh Enterprise),
  Bagian 1(c) (nameserver lewat tiket), Bagian 2 (custom domain), Bagian 7
  (jembatan ini).
- `workers/api/mw-edge.js` — penegakan header + alasan mode `off`.
- `workers/api/route-health.js` — kenapa `/health` dilindungi dan `/healthz` tidak.
- `edge-guard-test.js` — gerbang CI yang menjaga semua klaim jembatan `api` di atas.
- `owner-edge-guard-test.js` — gerbang CI jembatan `owner`: semua rute 403 tanpa header
  edge, 403 tanpa sesi owner walau header benar (dua lapis), header keamanan HTML lolos
  daftar pass-through, `owner-index.php` bebas nilai secret, perbandingan waktu-konstan.
- `workers/owner/index.js` — penjaga edge sisi owner (disalin dari `mw-edge.js`, alasan
  penyalinannya ditulis di berkasnya) + gate sesi owner.
- `workers/owner/README.md` — Secret gate owner, cara login, dan batas kejujuran metrik.
- Cloudflare, custom domain Worker butuh zona di akun yang sama:
  https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Public suffix list memuat `workers.dev` (karena itu cookie lintas situs):
  https://publicsuffix.org/list/public_suffix_list.dat
