# work-w2-live — gerbang runtime nyata untuk Worker `fiezel-api`

Branch `work/rt`, worktree `/home/user/workspace/wt-rt`. **Tidak di-push.** Invarian build tiga
titik (`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD`) **tidak** disentuh; `VERSION.json` tetap
`5.19.0`.

## 1. Masalah yang ditutup

`reports/exec-wiring.md` §6 menuliskan batasnya sendiri: seluruh gerbang CF berjalan di atas
`tools/cf-test-harness.js` (D1/KV/R2/AI palsu), jadi yang terbukti baru **logika**, bukan perilaku
runtime Cloudflare. Akibatnya sejumlah hal yang paling mudah salah di produksi tidak pernah diuji
satu pun gerbang:

- apakah rute benar-benar terpasang **di edge** (yang terbukti baru routernya saat di-import di Node);
- apakah `Set-Cookie fz_id` lolos utuh melewati Cloudflare (`HttpOnly`/`Secure`/`SameSite`/`Domain`/`Max-Age`);
- apakah `ALLOWED_ORIGINS` dan `COOKIE_DOMAIN` di `workers/api/wrangler.toml` sudah ter-deploy
  (keduanya masih ditulis owner secara manual — `COOKIE_DOMAIN` kosong = cookie host-only =
  identitas murid patah antara `fiezel.my.id` dan `api.fiezel.my.id`);
- apakah cap byte ditegakkan sebelum body dibaca;
- apakah endpoint tak dikenal menjawab 404, bukan 500.

## 2. Berkas baru

### `cf-live-contract-test.js` (gerbang, 33 assert saat semua rute hidup)

Menguji Worker HIDUP lewat HTTP nyata. Tanpa `FIEZEL_CF_LIVE_BASE` ia mencetak alasan jujur dan
**exit 0 (SKIP)**. SKIP sengaja **bukan** PASS: statusnya `SKIP` dengan `pass: null` di laporan, dan
pesan SKIP menyebut daftar hal yang **belum** terbukti selama ia SKIP — supaya tidak ada yang
mengutipnya sebagai bukti runtime.

Tidak ada URL bawaan. `|| 'https://api.fiezel.my.id'` di dalam kode akan membuat CI publik
menembak produksi pada setiap push; larangan itu bukan hanya komentar, ia ikut di-assert oleh
`no-network-test.js`.

`FIEZEL_CF_LIVE_BASE` yang diset **tapi tak sah** = MERAH, bukan SKIP: env yang diset berarti
seseorang memang meminta pengujian nyata, jadi typo harus terlihat.

Assert (id → isi):

| id | isi |
|---|---|
| `health-reachable`, `health-not-404`, `health-200`, `health-json`, `health-protocol` | `/health` terpasang di edge, `protocol:"1.7"`. "Bukan 404" adalah assert **tersendiri**: 404 (rute tidak terpasang) dan 500 (terpasang tapi rusak) adalah dua penyakit berbeda dan harus punya nama sendiri di laporan. |
| `config-not-404`, `config-200`, `config-flags-present`, `config-flags-false`, `config-killswitch-false`, `config-protocol` | `/api/config` mengembalikan `flags` **tidak kosong** dan semuanya `false`, plus kill switch semuanya `false`. `config-flags-present` ada supaya "semua false" tidak bisa benar secara hampa atas `{}`. |
| `quota-not-404`, `quota-401`, `me-not-404`, `me-401` | `/api/quota` dan `/api/user/me` menjawab 401 tanpa cookie (dan bukan 404 — 404 berarti rutenya hilang, bukan terlindungi) |
| `anon-200`, `cookie-present`, `cookie-httponly`, `cookie-secure`, `cookie-samesite-lax`, `cookie-domain`, `cookie-max-age` | `POST /api/auth/anon` 200 + `Set-Cookie fz_id` beratribut lengkap. Nilai cookie **tidak pernah** dicetak ke laporan (ia identitas bertanda HMAC); yang dicatat hanya bentuk atributnya. |
| `cors-allowed-origin`, `cors-vary-origin` | kontrol **positif** |
| `cors-foreign-no-acao`, `cors-foreign-not-wildcard`, `cors-foreign-rejected` | `https://evil.example` tidak mendapat `access-control-allow-origin`, tidak dapat `*`, ditolak 403 |
| `byte-cap-rejected`, `byte-cap-413` | body 2 KB ke `/api/auth/anon` (cap 512 B, `workers/api/schema.js`) ditolak 413 |
| `unknown-4xx`, `unknown-not-500` | endpoint tak dikenal 404/403, bukan 5xx |
| `no-5xx-anywhere`, `no-transport-error` | agregat seluruh percakapan |

Dua kontrol positif itu load-bearing, bukan hiasan:
- `cors-allowed-origin` — tanpanya, "origin asing tidak mendapat `access-control-allow-origin`"
  juga benar untuk Worker yang **tidak pernah** memasang header CORS untuk siapa pun, yaitu Worker
  yang patah bagi murid. Skenario `corsBlind` di self-test membuktikan assert ini menangkapnya.
- `anon-200` dengan body `{}` — tanpanya, 413 pada butir cap byte bisa datang dari "semua POST
  ditolak".

### `cf-live-selftest.js` (pembuktian bahwa gerbang di atas bisa MERAH)

Aku **tidak punya** akses ke Worker hidup, jadi tidak ada satu pun hasil uji nyata yang diklaim di
sini. Yang dibuktikan adalah hal lain: gerbangnya tidak vakum. Server HTTP loopback
(`127.0.0.1`, port 0 = dipilih kernel, tanpa DNS) meniru Worker `fiezel-api` — satu skenario benar
dan 20 skenario salah — lalu gerbang dijalankan sebagai proses anak dan **id assert yang gagal**
dicocokkan dengan cacat yang disuntikkan. Exit 1 karena alasan lain = gerbang yang beruntung,
bukan gerbang yang benar, jadi exit code saja tidak diterima sebagai bukti.

Laporan diarahkan ke berkas temporer lewat `FIEZEL_CF_LIVE_REPORT`, jadi self-test tidak pernah
mengotori working tree (ikut di-assert).

**Catatan implementasi yang load-bearing**: peluncur proses anak WAJIB asinkron. Versi pertama
memakai `spawnSync` dan seluruh matriks palsu — server tiruan hidup di proses yang sama, `spawnSync`
memblokir event loop-nya, jadi koneksi anak duduk di backlog TCP tanpa pernah dijawab dan **setiap**
skenario "gagal" karena timeout, termasuk skenario benar. Ditemukan karena skenario benar tidak
hijau; alasannya ditulis di komentar berkas supaya tidak diperbaiki balik.

## 3. Matriks hasil self-test (dijalankan, bukan diperkirakan)

`node cf-live-selftest.js` → **PASS (30 assert, 21 skenario loopback)**, exit 0.

| skenario yang disuntikkan | diharapkan | hasil | assert yang gagal |
|---|---|---|---|
| benar (semua jawaban sesuai kontrak) | LULUS | **LULUS** | — (33 assert PASS) |
| `protocol: "1.6"` di `/health` | GAGAL@`health-protocol` | **GAGAL** | `health-protocol` |
| `/health` menjawab 404 | GAGAL@`health-not-404` | **GAGAL** | `health-not-404`, `health-200`, `health-protocol` |
| `/api/config` menyalakan `cfAiEnabled` | GAGAL@`config-flags-false` | **GAGAL** | `config-flags-false` |
| `/api/config` mengirim `flags: {}` | GAGAL@`config-flags-present` | **GAGAL** | `config-flags-present` |
| `/api/config` menyalakan kill switch `ai` | GAGAL@`config-killswitch-false` | **GAGAL** | `config-killswitch-false` |
| `/api/quota` 200 tanpa cookie | GAGAL@`quota-401` | **GAGAL** | `quota-401` |
| `/api/user/me` 200 tanpa cookie | GAGAL@`me-401` | **GAGAL** | `me-401` |
| cookie tanpa `HttpOnly` | GAGAL@`cookie-httponly` | **GAGAL** | `cookie-httponly` |
| cookie tanpa `Secure` | GAGAL@`cookie-secure` | **GAGAL** | `cookie-secure` |
| cookie `SameSite=None` | GAGAL@`cookie-samesite-lax` | **GAGAL** | `cookie-samesite-lax` |
| cookie tanpa `Domain` (host-only) | GAGAL@`cookie-domain` | **GAGAL** | `cookie-domain` |
| cookie `Domain=evil.example` | GAGAL@`cookie-domain` | **GAGAL** | `cookie-domain` |
| cookie tanpa `Max-Age` | GAGAL@`cookie-max-age` | **GAGAL** | `cookie-max-age` |
| tidak ada `Set-Cookie` sama sekali | GAGAL@`cookie-present` | **GAGAL** | `cookie-present` + 5 atribut |
| `POST /api/auth/anon` menjawab 500 | GAGAL@`anon-200` | **GAGAL** | `anon-200`, 6 assert cookie, `no-5xx-anywhere` |
| CORS memantulkan Origin asing | GAGAL@`cors-foreign-no-acao` | **GAGAL** | `cors-foreign-no-acao`, `cors-foreign-rejected` |
| CORS menjawab `*` untuk Origin asing | GAGAL@`cors-foreign-not-wildcard` | **GAGAL** | `cors-allowed-origin`, `cors-foreign-no-acao`, `cors-foreign-not-wildcard`, `cors-foreign-rejected` |
| CORS buta (origin sah pun tak dapat header) | GAGAL@`cors-allowed-origin` | **GAGAL** | `cors-allowed-origin` |
| cap byte diabaikan (2 KB diterima 200) | GAGAL@`byte-cap-rejected` | **GAGAL** | `byte-cap-rejected`, `byte-cap-413` |
| endpoint tak dikenal menjawab 500 | GAGAL@`unknown-not-500` | **GAGAL** | `unknown-4xx`, `unknown-not-500`, `no-5xx-anywhere` |

Ditambah tiga assert perilaku lingkungan: tanpa env → exit 0 + label `SKIP` + `pass:null` +
pesannya menyebut apa yang belum terbukti; base URL tak sah → exit 1; skenario benar menjalankan
≥20 assert (hijau-karena-kosong tertangkap).

## 4. `no-network-test.js` — kelonggaran yang ditambahkan, dan kenapa begitu

Dua perubahan, keduanya membuat kelonggaran **terlihat** alih-alih membiarkannya lolos:

**(a) `SOCKET_ALLOWLIST` 2 → 3 nama**, tambahan `cf-live-selftest.js`. Ia me-`require('node:http')`
dan `listen(0,'127.0.0.1')` karena server tiruan harus server HTTP sungguhan; kalau tidak, jalur
yang diuji bukan lagi jalur HTTP gerbang live. Loopback murni, tanpa DNS, tanpa keluar mesin —
kelas yang sama dengan `http-smoke-test.js`. Assert `SOCKET_ALLOWLIST.size === 2` dinaikkan ke `3`
dengan komentar alasannya; syarat existing tetap diperiksa (berkasnya harus benar-benar loopback
dan benar-benar masih butuh socket).

**(b) Cakupan pemindaian diperluas ke `*-selftest.js`.** Ini yang paling penting untuk kejujuran:
pola lama `/-(test|audit)\.js$/` **tidak** mencocokkan `cf-live-selftest.js`, jadi berkas itu akan
lolos hanya karena namanya — "lolos karena nama berkas" adalah kebalikan dari daftar yang
disengaja. Setelah diperluas, ia terpindai, tertangkap sebagai pengguna socket, lalu dimaafkan
**lewat allowlist**. Cakupan itu ikut di-assert supaya tidak bisa dipersempit balik diam-diam.

**(c) Kelas ketiga baru: `ENV_GATED_LIVE_ALLOWLIST` = {`cf-live-contract-test.js`}.**
`cf-live-contract-test.js` sebenarnya **tidak** perlu allowlist apa pun: ia tidak me-`require`
modul socket dan URL-nya datang dari `process.env`, bukan literal — jadi pemindai teks tidak
melihatnya sama sekali. Justru itu masalahnya. Gerbang yang lolos diam-diam membuat
`no-network-test.js` **tampak** melindungi sesuatu yang sudah bocor. Jadi namanya didaftarkan
eksplisit, dengan syarat yang diperiksa (bukan dipercaya):

- harus membaca `FIEZEL_CF_LIVE_BASE`;
- **tidak boleh** punya URL remote sebagai nilai bawaan (`|| 'https://…'`) — dipindai atas sumber
  yang komentarnya sudah dibuang;
- tidak boleh berada di dua kelas allowlist sekaligus;
- harus benar-benar exit 0 dan mencetak `SKIP` tanpa env — diperiksa dengan **menjalankannya**
  sebagai proses anak, bukan dengan membaca janji di komentarnya.

Plus tiga assert bahwa kedua berkas baru terdaftar di `quality.yml` dan bahwa komentar "SKIP
sampai owner menyetel base URL" benar-benar ada di sana.

**Batas kejujuran yang tetap terbuka** (ditulis sebagai `notes`, bukan assert): pemindai teks tidak
bisa membedakan `fetch(<variabel>)` yang menembak produksi dari yang menembak loopback. Kelas (c)
menutup celah itu dengan pendaftaran + probe SKIP, **bukan** dengan deteksi. Deteksi sungguhan
tetap menunggu lapis 3 (`tools/no-net-preload.js` lewat `NODE_OPTIONS`, cf-b7 §5.3) yang masih
belum dipasang — status itu sudah dilaporkan berkas tersebut sejak sebelum paket kerja ini.

## 5. Berkas lain yang disunting

| Berkas | Perubahan |
|---|---|
| `.github/workflows/quality.yml` | `node cf-live-selftest.js` lalu `node cf-live-contract-test.js` sesudah `node no-network-test.js`, dengan komentar bahwa langkah live **SKIP sampai owner menyetel base URL** + cara meneruskan `vars.FIEZEL_CF_LIVE_BASE`. Self-test diletakkan sesudah `no-network-test.js` karena ia membuka socket loopback. |
| `.gitignore` | `CF-LIVE-REPORT.json` + alasan: isinya bergantung lingkungan (base URL, hasil per assert, daftar permintaan), jadi men-commit-nya hanya menghasilkan konflik dan bukti menyesatkan ("hijau di repo" padahal hijaunya milik lingkungan orang lain). |
| `tools/cf-live-runner.md` | cara menjalankan (produksi + `*.workers.dev`), tabel env, tabel assert, prasyarat deployment, apa yang **tidak** diuji, cara mengaktifkan di CI, cara menjalankan self-test. |

## 6. Hasil gerbang (dijalankan di worktree ini)

```
cf-live-contract-test  exit=0   SKIP bersih tanpa env (33 assert saat base URL diberikan)
cf-live-selftest       exit=0   PASS 30 assert, 21 skenario loopback
no-network-test        exit=0   PASS 35 assert, 120 gerbang dipindai (naik dari 30/118)
regression-test        exit=0
install-health-test    exit=0
cf-transport-test      exit=0
cf-wiring-test         exit=0
cf-api-contract-test   exit=0
ai-task-contract-test  exit=0
analytics-server-only  exit=0
quota-core-test        exit=0
quota-manipulation     exit=0
quota-reset-test       exit=0
core-brain-v2-test     exit=0
onboarding-test        exit=0
placement-accuracy     exit=0
tour-test / tours-test exit=0
```

Sepuluh gerbang terakhir dijalankan karena semuanya membaca `.github/workflows/quality.yml`, yang
disunting paket kerja ini. `node --check` bersih untuk kedua berkas baru.
`*-REPORT.json` yang berubah (`NO-NETWORK-REPORT.json`, `CF-WIRING-REPORT.json`,
`PLACEMENT-ACCURACY-REPORT.json`) di-restore sebelum commit.

## 7. Batas kejujuran paket kerja ini

1. **Nol hasil uji nyata.** Worker hidup tidak bisa dijangkau dari lingkungan ini (alamatnya
   ditutup), jadi tidak ada satu pun angka runtime Cloudflare yang diklaim di sini. Yang terbukti
   adalah gerbangnya **hijau pada jawaban benar dan merah pada 20 jawaban salah** — terhadap
   server loopback yang aku tulis sendiri, bukan terhadap Cloudflare.
2. **Server tiruan itu tiruan.** Ia meniru bentuk respons `workers/api/**` (dibaca dari
   `route-health.js`, `route-config.js`, `route-auth.js`, `mw-guard.js`, `mw-identity.js`,
   `schema.js`), bukan perilaku edge. Kalau Cloudflare memodifikasi header di jalan (mis. menyunting
   `Set-Cookie`, menambah `access-control-allow-origin` sendiri, atau meng-cache `/api/config`),
   hanya jalan sungguhan yang akan menunjukkannya. Itu memang gunanya gerbang ini.
3. **Kuota 25/26, cache TTS, dan cron tidak diuji** oleh gerbang live: ketiganya menulis state
   nyata di `fiezel-core`/`fiezel-stats` dan menjalankannya terhadap produksi akan menghabiskan
   jatah murid serta mengotori tabel agregat. Buktinya tetap di `cf-wiring-test.js` **di atas
   stub**. Batas `reports/exec-wiring.md` §6 karena itu **menyempit, tidak hilang**: ia sekarang
   berlaku untuk kuota/TTS/cron saja, bukan untuk seluruh permukaan HTTP. Penutupan penuh butuh
   lingkungan staging terpisah (D1 + KV + R2 sendiri) — itu keputusan owner, bukan pekerjaan agen.
4. **Selama langkah CI-nya SKIP, tidak ada perlindungan runtime yang aktif.** SKIP menuliskan itu
   apa adanya di stdout. Yang menutupnya bukan kode, tapi satu tindakan owner: menyetel
   `FIEZEL_CF_LIVE_BASE`.

## 8. Yang perlu owner lakukan

1. Setel *repository variable* `FIEZEL_CF_LIVE_BASE` = `https://api.fiezel.my.id` (atau alamat
   `*.workers.dev` sementara) dan teruskan lewat `env:` pada step *Core validation*. Base URL bukan
   rahasia — `vars` cukup, `secrets` tidak perlu.
2. Pastikan prasyarat deploy sudah ada, kalau tidak gerbang akan merah **dengan benar**:
   `SESSION_HMAC_KEY_CURRENT` (tanpa itu `/api/auth/anon` 500), `ALLOWED_ORIGINS`, `COOKIE_DOMAIN`,
   dan migrasi D1 di `workers/api/migrations/MIGRATIONS.md`.
3. Tinjau kelonggaran `no-network-test.js` di §4. Kalau argumennya tidak diterima, yang benar adalah
   mengembalikan assert-nya dan mendiskusikan ulang cakupan gerbang live — bukan mempertahankan
   hijaunya.
4. Bump invarian build tiga titik saat merge (bukan wewenang paket kerja ini).
