# S4 — Jembatan `owner.fiezel.my.id`: dashboard owner dapat hostname, dua lapis dijaga gerbang

Branch: `roll/s4owner` · basis `2b4b3eb` · **tidak di-push, tidak ada yang dipasang ke server,
tidak ada Worker yang di-deploy, tidak ada versi build yang di-bump.**

---

## 1. Masalah yang diselesaikan (dan yang TIDAK)

Worker `fiezel-owner` sudah ter-deploy tetapi **tidak bisa diakses sama sekali**: ia butuh
hostname, dan `owner.fiezel.my.id` tidak bisa jadi custom domain Cloudflare karena zona
`fiezel.my.id` belum ada di Cloudflare (nameserver di reseller ArenHost; zona subdomain butuh
Enterprise). Pola yang **sudah terbukti** untuk `api.fiezel.my.id` adalah jembatan PHP di origin,
jadi pola itu **disalin, bukan ditemukan ulang**.

Yang **tidak** diselesaikan, dan jangan dianggap selesai:

- Ini tetap **jalan pintas sementara**. Selama ia hidup, dashboard punya **dua alamat**
  (`owner.fiezel.my.id` dan `fiezel-owner.fitrajft.workers.dev`) dan alamat kedua **tidak bisa
  dimatikan** karena proxy memanggilnya.
- **Cloudflare Access tetap belum menjadi lapis nyata.** Access dipasang per hostname. Ia tidak
  berada di jalur origin ArenHost, dan tidak melindungi `*.workers.dev`. Klaim "lapis kedua" di
  `workers/owner/README.md` §2 baru benar sesudah pembongkaran. Selama masa jembatan, yang
  menutup `workers.dev` hanyalah `EDGE_SHARED_SECRET`.
- Latensi hop PHP tambahan berlaku juga di sini (`deploy/edge/README.md` §5 mengukur ~1-2 ms
  pada jembatan api). Untuk dashboard satu orang, ini tidak relevan.

---

## 2. Yang berubah di repo

| Berkas | Status | Isi |
|---|---|---|
| `deploy/edge/owner-index.php` | **BARU** | Proxy origin → `fiezel-owner.fitrajft.workers.dev`. Allowlist default-tolak, header `X-Fiezel-Edge` dengan placeholder `__EDGE_SECRET__`, cap byte 8 KiB, timeout 25 s / connect 8 s, cookie + `Set-Cookie` diteruskan, IP mentah TIDAK diteruskan, galat mentah hanya ke `error_log`. |
| `workers/owner/index.js` | diubah | Penjaga edge `edgeGuard()` disalin dari `workers/api/mw-edge.js` (alasan penyalinan ditulis di berkasnya), dipasang **paling luar** di `handle()`, fail-closed, tidak membocorkan status secret. |
| `owner-edge-guard-test.js` | **BARU** | 576 assert, butir (a)-(e) di bawah. |
| `.github/workflows/quality.yml` | diubah | `node owner-edge-guard-test.js` terdaftar tepat sesudah `owner-dashboard-test.js`, dengan alasan penempatan. |
| `deploy/edge/README.md` | diubah | §4A pemasangan `owner.fiezel.my.id` + langkah 3a pembongkaran + catatan "dua proxy, dua nilai secret berbeda". |
| `OWNER-EDGE-GUARD-REPORT.json` | **BARU** | Artefak bukti gerbang (pola `EDGE-GUARD-REPORT.json`). |

### Allowlist proxy — dari kode, bukan karangan

Sumbernya `OWNER_ROUTES` + `PUBLIC_ROUTES` di `workers/owner/index.js`:

```
'/'               GET
'/login'          GET, POST     <- satu-satunya yang boleh POST
'/logout'         GET
'/api/summary'    GET
'/api/series'     GET
'/api/retention'  GET
'/api/cost'       GET
```

Gerbang membandingkan dua daftar ini **dua arah**: rute Worker yang lupa didaftarkan memerahkan
CI (di origin ia akan 404), dan rute karangan di allowlist juga memerahkan CI. `/healthz` **tidak
ada** di sini: dashboard owner tidak dipantau monitor eksternal, jadi `EDGE_FREE_PATHS = []` —
nol permukaan terbuka, beda dari jembatan api yang membiarkan `/healthz` bebas header.

### HTML, bukan JSON — dan header keamanan yang mudah hilang tanpa jejak

Worker owner menjawab HTML dengan `Content-Type: text/html; charset=utf-8`, `Cache-Control:
no-store`, `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer`,
`X-Content-Type-Options: nosniff`, dan CSP ketat `default-src 'none'; style-src 'unsafe-inline';
img-src data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`.

Proxy yang menjatuhkan CSP mengubah halaman ber-CSP ketat menjadi halaman tanpa CSP **tanpa satu
pun tanda yang terlihat** — halamannya tetap tampil benar. Karena itu daftar `$passThrough`
memuat keenam header itu, dan butir (c) gerbang **mengambil nama header dari respons Worker yang
sungguhan** lalu menuntut setiap satu di antaranya ada di daftar. Menambah header keamanan baru di
Worker tanpa mendaftarkannya di proxy = CI merah, bukan kebocoran senyap.

`Location` dan `Set-Cookie` juga wajib lewat, dan `CURLOPT_FOLLOWLOCATION` **false**: login sukses
menjawab `303 → /` sambil memasang cookie `fz_owner`. Kalau curl mengikuti redirect sendiri,
cookie itu mati di proses PHP dan login yang berhasil terlihat seperti login yang gagal.

### Penjaga edge sisi owner — disalin, dengan alasan tertulis

Impor tidak bisa lintas Worker (`fiezel-api` dan `fiezel-owner` adalah dua bundel terpisah),
jadi logikanya disalin — cermin dari `ctEq` yang sudah disalin ke `mw-edge.js` sebelumnya. Alasan
itu ditulis di dalam `workers/owner/index.js`, bukan hanya di sini.

Perilakunya **identik** dengan `mw-edge.js`:

- Secret belum terpasang → `edgeGuard` pass-through, `console.warn` **sekali per isolate** dengan
  `edgeGuard=off` + nama secret + kata "masa transisi". Ini bukan kenyamanan: menjadikannya
  fail-closed tanpa secret akan mematikan Worker yang **sekarang sudah hidup**, dan menukar satu
  kegagalan dengan kegagalan lain.
- Secret terpasang → header dibandingkan `ctEq(presentedEdge, configuredEdge)` (waktu-konstan,
  iterasi panjang maksimum, akumulasi XOR, tanpa keluar dini).
- Ditolak → **`deny()` yang SAMA** dengan gate sesi owner. Jadi "header salah", "header tidak
  ada", dan "tidak ada sesi" menghasilkan respons **byte-identik**. Tidak ada oracle yang
  memberi tahu penyerang lapis mana yang gagal, dan tidak ada yang memberi tahu apakah
  `EDGE_SHARED_SECRET` sudah terpasang.
- Nama header tidak peka huruf besar/kecil (proxy mengirim `X-Fiezel-Edge`, HTTP/2 huruf kecil).
- Secret berisi spasi saja dianggap **tidak terpasang**, bukan gerbang yang mustahil dilewati.

---

## 3. Bukti — dan bukti bahwa gerbangnya bisa MERAH

Semua dijalankan lokal, nol jaringan:

| Gerbang | Exit | Hasil |
|---|---|---|
| `owner-edge-guard-test.js` | **0** | 576/576 assert PASS |
| `owner-dashboard-test.js` | **0** | LULUS |
| `edge-guard-test.js` | **0** | 119/119 assert PASS |
| `cf-api-contract-test.js` | **0** | 215/215 assert PASS |
| `regression-test.js` | **0** | PASS |
| `install-health-test.js` | **0** | PASS |

Gerbang hijau yang tidak pernah bisa merah adalah gerbang yang bohong. Tiga peracunan sengaja:

| Peracunan | Hasil |
|---|---|
| `edgeGuard()` tidak lagi dipanggil di `handle()` | **29 assert MERAH** (termasuk "penjaga edge dijalankan PALING LUAR") |
| `'content-security-policy'` dihapus dari `$passThrough` | **3 assert MERAH** ("hilang di jembatan", "CSP ketat yang sama") |
| Nilai secret sungguhan disuntikkan ke `owner-index.php` | **6 assert MERAH** (pemindai nilai acak menangkapnya) |

Sesudah pemulihan: 576/576 PASS kembali.

### Apa yang diassert butir (a)-(e)

- **(a)** Untuk **11 path** (7 rute nyata + `/api/rute-baru-yang-lupa-dipagari`, `/admin`,
  `/healthz`, `/index.html`) × **6 keadaan header** (tidak ada, salah, kosong, prefiks benar,
  lebih panjang, dan **sesi owner SAH tanpa header edge**) → semuanya **403**, nol sentuhan D1,
  nol cookie diterbitkan, tidak ada nama secret / nama header / alamat `workers.dev` / status
  penjaga di badan respons, dan **semua badan respons identik** (satu bentuk saja, anti-oracle).
  Ditambah: POST `/login` dengan **token owner yang benar** tetapi tanpa header edge → 403 dan
  **tanpa** cookie sesi — bukti penjaga edge berdiri di DEPAN login, bukan di belakangnya.
- **(b)** Dua lapis, bukan satu. Untuk setiap rute owner × 5 keadaan sesi (tanpa cookie, cookie
  sampah, cookie ter-tamper, cookie kedaluwarsa, cookie ditandatangani kunci lain) **dengan header
  edge yang BENAR** → tetap 403, nol sentuhan D1. Lalu bukti lapis pertama benar-benar dilewati
  (bukan kebetulan meloloskan satu rute): header edge + sesi sah → **200** dan D1 memang dibaca;
  rute tak dikenal dengan dua lapis lulus → tetap 403.
- **(c)** Header diambil dari respons Worker **sungguhan** (dashboard 200 dan login 303), lalu
  dijalankan melalui tiruan filter `$passThrough` yang **dibaca dari berkas PHP** (bukan diketik
  ulang di test): `text/html` + `charset` bertahan, CSP masih CSP ketat yang sama, `noindex`
  bertahan, `no-store` bertahan, `Location: /` bertahan, cookie `HttpOnly` + `SameSite=Strict`
  bertahan. Plus bukti kejujuran: daftar tanpa CSP benar-benar **kehilangan** CSP di tiruan itu.
- **(d)** Pemindai **pola nilai acak panjang** (base64url/hex, ≥24 karakter, ≥3 kelas karakter,
  ≥12 karakter unik) — bukan pencarian string yang sudah diketahui, karena yang sudah diketahui
  tidak perlu dijaga. Disalin dari `edge-guard-test.js` butir (g) supaya dua artefak deployment
  dipindai dengan ukuran yang **sama**. Ditambah pola PEM / `sk-` / JWT / hex ≥40, dan bukti
  bahwa pemindai menangkap tiga bentuk nilai sungguhan yang disuntikkan.
- **(e)** `ctEq` dipakai untuk header edge, digest token owner, dan tanda tangan sesi; bentuk
  `ctEq` diperiksa (Math.max, `diff |=`, tanpa `break`); perilakunya diuji runtime (termasuk
  `ctEq('','') === true`, supaya ia tetap fungsi perbandingan dan bukan penolak buta); tidak ada
  operator kesetaraan langsung pada identifier edge secret (komentar dan string dilucuti dulu,
  karena komentar sengaja membahas operator itu untuk menjelaskan kenapa ia dilarang).

---

## 4. LANGKAH UNTUK MASTER — urutan tidak boleh dibalik

**Kenapa urutannya mengikat:** begitu `EDGE_SHARED_SECRET` terpasang di Worker owner, Worker
menolak **403 semua permintaan tanpa header**, termasuk halaman masuk. Kalau proxy belum
mengirim header, jendela antara dua langkah itu = **dashboard mati total**. Secret di proxy lebih
dulu tidak punya efek buruk apa pun (Worker masih mode `off`, header diabaikan), jadi biayanya
nol dan manfaatnya nol downtime.

**Pakai nilai secret yang BERBEDA dari jembatan api.** Bukan karena lebih repot atau lebih aman
secara kriptografi, tetapi karena satu berkas PHP yang terbaca sebagai teks di hosting bersama
tidak boleh membuka **dua** Worker.

### 4.1 Yang harus diputuskan SEBELUM langkah apa pun: `workers/owner/wrangler.toml`

Berkas itu masih memuat:

```toml
# Hostname khusus owner. Zona fiezel.my.id sudah di Cloudflare (plan GRATIS).
[[routes]]
pattern = "owner.fiezel.my.id"
custom_domain = true
```

Komentar itu **salah** (zona belum di Cloudflare) dan blok `[[routes]]` itu akan **membuat
`wrangler deploy` gagal** — Cloudflare tidak bisa membuat custom domain untuk zona yang tidak ada
di akun. Artinya **langkah 4.4 (redeploy) akan gagal** sampai blok itu dinonaktifkan.

**Saya sengaja TIDAK mengubahnya**, karena mengubah route deployment adalah keputusan MASTER dan
efeknya menyentuh Worker yang sedang hidup. Pilihannya dua, keduanya sadar:

- **(i)** Komentari blok `[[routes]]`, tambahkan `workers_dev = true` (agar proxy tetap punya
  upstream), dan perbaiki komentarnya menjadi "zona belum di Cloudflare, hostname disediakan
  jembatan PHP — lihat `deploy/edge/README.md` §4A". Lalu deploy. Ini yang konsisten dengan
  keadaan nyata.
- **(ii)** Jangan redeploy sama sekali. `wrangler secret put` **tidak** butuh deploy: Secret
  langsung berlaku pada Worker yang sudah ada. Ini jalur paling aman kalau MASTER belum siap
  menyentuh konfigurasi route.

Kalau memilih **(ii)**, lewati redeploy di 4.4 — cukup `secret put`.

### 4.2 Terbitkan secret dan suntik ke SALINAN, bukan ke repo

```bash
cd /path/ke/FIEZEL-APPS   # branch yang memuat deploy/edge/owner-index.php
SECRET_OWNER="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"

sed "s|__EDGE_SECRET__|$SECRET_OWNER|" deploy/edge/owner-index.php > /tmp/fz-owner-index.php
grep -c '__EDGE_SECRET__' /tmp/fz-owner-index.php   # HARUS: 0
git status --short deploy/edge/                     # HARUS: kosong  <-- repo tak tersentuh
```

Kalau `git status` **tidak** kosong, berhenti. Itu berarti secret masuk ke repo.

### 4.3 Pasang proxy di origin — PROXY DULU

```bash
# (1) cPanel → Domains → Create A New Domain
#     Domain: owner.fiezel.my.id
#     Document Root: public_html/owner      <-- DOCROOT TERPISAH dari public_html/api.
#     Alasannya bukan kerapian: satu docroot = satu .htaccess dan satu allowlist untuk dua
#     permukaan yang sangat berbeda (API murid vs angka bisnis). Salah satu longgar = keduanya.

# (2) Unggah, lalu hapus jejak lokalnya.
scp /tmp/fz-owner-index.php <USER>@<HOST>:~/public_html/owner/index.php
shred -u /tmp/fz-owner-index.php 2>/dev/null || rm -f /tmp/fz-owner-index.php

# (3) Izin 644, BUKAN 664/666 — berkas ini memuat secret di hosting bersama.
ssh <USER>@<HOST> 'chmod 644 ~/public_html/owner/index.php && ls -l ~/public_html/owner/index.php'
```

`.htaccess` di `~/public_html/owner/.htaccess` (isinya persis seperti `deploy/edge/README.md`
§4A). Blok `FilesMatch` bukan hiasan: editor berkas cPanel membuat `index.php.bak`, dan Apache
**menyajikan `.bak` sebagai teks** — yaitu secret jembatan dalam bentuk telanjang.

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]

<FilesMatch "\.(bak|orig|save|swp|old|php~|dist)$">
  Require all denied
</FilesMatch>

RequestHeader unset X-Fiezel-Edge
```

**Verifikasi sebelum menyentuh Worker.** Pada titik ini Worker masih mode `off`, jadi jembatan
harus **sudah hidup**:

```bash
curl -si https://owner.fiezel.my.id/login | grep -iE 'HTTP/|content-type|content-security-policy|x-robots-tag'
# HARUS: 200 · text/html; charset=utf-8 · default-src 'none' · noindex
curl -s -o /dev/null -w '%{http_code}\n' https://owner.fiezel.my.id/berkas-tidak-ada
# HARUS: 404 (default TOLAK proxy, bukan diteruskan)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://owner.fiezel.my.id/api/summary
# HARUS: 405
```

Kalau salah satu gagal, **JANGAN lanjut ke 4.4.** Memasang secret di atas proxy yang belum benar
= dashboard mati tanpa jalan masuk.

### 4.4 BARU SETELAH ITU: Worker

```bash
cd workers/owner
npx wrangler@3 secret put EDGE_SHARED_SECRET     # tempel nilai $SECRET_OWNER yang SAMA
# npx wrangler@3 deploy                          # HANYA kalau memilih opsi (i) di §4.1
```

### 4.5 Verifikasi akhir — dua lapis, bukan satu

```bash
# (a) Jembatan hidup, HTML + CSP + noindex utuh.
curl -si https://owner.fiezel.my.id/login | grep -iE 'HTTP/|content-type|content-security-policy|x-robots-tag'

# (b) workers.dev tertutup di SEMUA rute, termasuk halaman masuk.
for p in / /login /logout /api/summary /api/series /api/retention /api/cost; do
  curl -s -o /dev/null -w "$p %{http_code}\n" https://fiezel-owner.fitrajft.workers.dev$p
done   # HARUS: 403 semuanya

# (c) Login sungguhan lewat jembatan: 303 + cookie pihak pertama.
curl -si -X POST https://owner.fiezel.my.id/login -d 't=<TOKEN_OWNER>' | grep -iE 'HTTP/|location|set-cookie'
# HARUS: 303 · location: / · set-cookie: fz_owner=...; HttpOnly; Secure; SameSite=Strict

# (d) Lapis kedua berdiri: header edge benar TIDAK menggantikan sesi owner.
curl -s -o /dev/null -w '%{http_code}\n' -H "X-Fiezel-Edge: $SECRET_OWNER" \
  https://fiezel-owner.fitrajft.workers.dev/api/summary   # HARUS: 403

# (e) Dashboard benar-benar terbaca dengan sesi (browser, bukan curl):
#     buka https://owner.fiezel.my.id/login, masuk, pastikan angka + label kejujuran tampil.
```

**Rollback kalau (a) gagal sesudah 4.4:** `cd workers/owner && npx wrangler@3 secret delete
EDGE_SHARED_SECRET`. Worker kembali ke mode `off` dan dashboard hidup lagi dalam hitungan detik —
dengan konsekuensi jujur: alamat `workers.dev` terbuka kembali sampai secret dipasang benar.

### 4.6 Rotasi

Nilai baru di proxy **lebih dulu** (§4.2-4.3), lalu `wrangler secret put`. Terbalik = jendela 403
untuk seluruh dashboard.

---

## 5. Batas kejujuran laporan ini

- **`owner-index.php` belum pernah dieksekusi PHP.** Tidak ada biner `php` di lingkungan ini,
  jadi `php -l` tidak bisa dijalankan dan **bukan** bagian dari bukti. Yang dijamin gerbang
  adalah **isi dan strukturnya** (allowlist, daftar pass-through, placeholder, cap, timeout,
  tidak ada IP mentah), bukan bahwa PHP mem-parse-nya. Sintaksnya menyalin `api-index.php` yang
  **sudah terbukti jalan di produksi**, tetapi MASTER wajib memperlakukan verifikasi 4.3 sebagai
  ujian pertama yang sesungguhnya.
- **Butir (c) menguji tiruan filter, bukan Apache + curl.** Ia membaca daftar `$passThrough`
  dari berkas PHP sungguhan dan menjalankan header Worker sungguhan melalui tiruannya. Itu
  menangkap kelas cacat yang paling mungkin (header lupa didaftarkan), **tidak** menangkap
  perilaku aneh `header()` di konfigurasi Apache tertentu. Yang menutup celah itu hanya
  `curl -si` di 4.3/4.5.
- **Mode `off` adalah utang, bukan fitur.** Selama `EDGE_SHARED_SECRET` belum terpasang, alamat
  `fiezel-owner.fitrajft.workers.dev` **terbuka**: halaman masuk owner bisa ditembak langsung,
  dan hanya token owner yang berdiri di antara publik dan angka bisnis. Worker mencatat itu di
  log tiap isolate baru.
- **Zona `fiezel.my.id` tetap masalah yang belum selesai.** Jembatan ini menunda konsekuensinya,
  tidak menghapusnya. `deploy/edge/README.md` §6 (termasuk langkah 3a yang baru) adalah rencana
  pembongkaran yang harus dijalankan, bukan lampiran.
