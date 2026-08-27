# `deploy/edge/` — JEMBATAN SEMENTARA `api.fiezel.my.id` → Worker Cloudflare

> **🔄 TEMUAN LAPANGAN 27 Agu 2026 — direktori ini BARU.** Ia mencatat satu artefak
> deployment yang sebelumnya hanya hidup di origin dan tidak bisa diaudit siapa pun.
> **Sifatnya SEMENTARA.** Bagian "PEMBONGKARAN" di bawah bukan lampiran — ia adalah
> alasan direktori ini boleh ada.

## Isi

| Berkas | Dipasang di | Keterangan |
|---|---|---|
| `api-index.php` | `~/public_html/api/index.php` (cPanel ArenHost) | Proxy penerus. Nilai secret di repo adalah placeholder `__EDGE_SECRET__`. |

**Nilai `EDGE_SHARED_SECRET` yang sungguhan TIDAK ADA di repo ini dan tidak boleh
pernah masuk.** Yang tercatat hanya placeholder dan cara menyuntiknya saat
pemasangan. Gerbang `edge-guard-test.js` butir (g) memindai berkas ini untuk
memastikan itu tetap benar.

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

## 5. Harga yang dibayar — dicatat jujur, bukan disembunyikan

- **Latensi.** Hop PHP tambahan terukur pada `/health`: **2.214 ms** saat dingin,
  lalu **~1.051–1.163 ms** saat hangat. Kecil untuk JSON, tetapi ia **nyata dan
  selalu ada**.
- **Titik gagal tunggal.** Origin PHP ArenHost sekarang berada di jalur setiap
  panggilan API. Kalau hosting bersama itu mati atau kena batas proses, seluruh API
  mati **walaupun Worker Cloudflare sehat**. Sebelum jembatan, kegagalan origin
  tidak menyentuh API.
- **Karena itu aset audio TIDAK lewat jembatan.** Berkas audio berukuran ratusan kB
  sampai MB; melewatkannya lewat satu proses PHP di hosting bersama akan mengubah
  hop 1 ms menjadi leher botol yang mematikan pelajaran mendengarkan, dan itu
  memindahkan risiko dari JSON kecil ke jalur yang paling ditunggu murid. Audio
  tetap dari R2 / Worker audio langsung.

## 6. PEMBONGKARAN — begitu nameserver pindah ke Cloudflare

Jembatan ini **harus dibongkar**, bukan dibiarkan menua. Urutannya penting: setiap
langkah aman untuk dibatalkan sampai langkah 5.

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
   - hapus `EDGE_SHARED_SECRET`: `npx wrangler@3 secret delete EDGE_SHARED_SECRET`;
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
- `edge-guard-test.js` — gerbang CI yang menjaga semua klaim di atas.
- Cloudflare, custom domain Worker butuh zona di akun yang sama:
  https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- Public suffix list memuat `workers.dev` (karena itu cookie lintas situs):
  https://publicsuffix.org/list/public_suffix_list.dat
