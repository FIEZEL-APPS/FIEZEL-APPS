# E9 — Penjaga edge: menutup `*.workers.dev` yang terbuka

Branch `work/edge`, worktree `/home/user/workspace/wt-edge`. Tidak ada bump versi build.
Tidak ada push. Semua gerbang exit 0.

---

## 1. Masalah yang ditutup (keadaan nyata, bukan rencana)

`https://api.fiezel.my.id` **bukan** custom domain Cloudflare. Ia subdomain cPanel di
origin ArenHost yang menjalankan proxy PHP (`~/public_html/api/index.php`) dan
meneruskan ke `https://fiezel-api.fitrajft.workers.dev`. Itu jembatan yang menjaga
cookie `fz_id` tetap pihak pertama di `fiezel.my.id` selama zona DNS belum bisa
dipindah (nameserver di reseller; zona subdomain butuh Enterprise).

Konsekuensinya: Worker hidup di **dua** alamat, dan alamat asal `*.workers.dev`
menjawab 200 tanpa syarat. Siapa pun bisa `POST /api/auth/anon` langsung ke sana,
melewati jembatan, menulis baris ke D1 (`identity`, `anon_issue`) tanpa batas, dan
setiap identitas baru membawa jatah gratisnya sendiri (AI/TTS).

Gerbang origin Worker **tidak bisa** menutupnya, dan itu bukan bug: pemanggil langsung
tidak mengirim `Origin` sama sekali, dan `originGate` sengaja meloloskan permintaan
tanpa `Origin` (non-browser/same-origin). Jadi pemeriksaannya harus header bersama —
`X-Fiezel-Edge`, yang sudah dikirim proxy tetapi belum pernah diperiksa Worker.

## 2. Yang dikerjakan

### `workers/api/mw-edge.js` (BARU)

Modul terpisah, bukan tambahan ke `mw-guard.js`: `mw-guard.js` adalah CORS + cap byte
(kontrak browser), sedangkan ini kontrak *jembatan* dengan masa hidup yang sudah
ditentukan. Menggabungkannya akan membuat pembongkaran nanti menjadi bedah, bukan
penghapusan berkas.

- `ctEq()` — perbandingan waktu-konstan, cermin `workers/owner/index.js:65`. Disalin,
  bukan diimpor, karena `workers/owner` adalah Worker terpisah dengan graf modul
  sendiri; `workers/api` tidak boleh mengimpor lintas Worker. Loop atas panjang
  **maksimum**, akumulasi XOR, tanpa keluar dini.
- `edgeGuardMiddleware(ctx)` — dipasang **paling luar** di `index.js` (`[M-1]`,
  sebelum CORS dan identitas). Nol `await`, nol baca D1/KV: penolakan di plan gratis
  harus lebih murah daripada serangan yang memicunya.
- Penolakan **403 `forbidden_edge`** lewat `errors.js` `jsonError` (satu tabel bentuk
  galat, gerbang jembatan tidak jadi pengecualian). Bentuknya **identik** untuk header
  tidak ada / salah / kosong / prefiks-benar-terpotong, dan tidak menyebut nama secret,
  nama header, atau alamat jembatan — tidak ada oracle apakah secret terpasang.
- Header CORS tetap ditempelkan pada 403, supaya klien yang salah alamat melihat pesan
  FIEZEL, bukan "network error" (aturan bab 12 yang sama dengan `mw-guard.js`).

### Mode `off` — sah HANYA selama transisi

Tanpa `EDGE_SHARED_SECRET`, Worker berjalan seperti sebelumnya, mencatat peringatan
lewat jalur log Worker yang sudah ada (`console.warn` → `wrangler tail` /
Observability), dan `/health` melaporkan `edgeGuard:"off"`.

Peringatan dicatat **sekali per isolate**, bukan sekali per permintaan: satu baris log
per permintaan adalah cara tercepat membuat owner mematikan observability, dan owner
yang mematikan log tidak akan melihat peringatan apa pun lagi.

Batas `off` ditulis tegas di kode (bukan hanya di dokumen), dan gerbang meng-assert
ketiga kalimatnya ada: `off` **bukan mode produksi**; selama `off` lubang §1 **masih
ada**; `off` harus berakhir saat secret dipasang, dan **selamanya** saat
`workers_dev = false` sesudah custom domain hidup.

### KEPUTUSAN: `/health` TETAP DILINDUNGI, `/healthz` yang bebas header

Setuju dengan rekomendasi owner, dan alasannya dipertahankan di dua tempat
(`mw-edge.js`, `route-health.js`) supaya tidak "disederhanakan" nanti:

- Monitor eksternal memang berguna, dan memang tidak bisa mengirim header rahasia —
  jadi harus ada **satu** jalur bebas header.
- Tetapi `/health` mengumumkan `capabilities`, `aiGateway`, `version`, `service`,
  `plan`. Itu peta permukaan serang: ia memberi tahu penyerang fitur mana yang hidup
  (`context-coach-v1`, `alrs`, …) tanpa ia perlu menebak. Membebaskannya =
  membocorkan peta itu ke publik selamanya.
- Monitor tidak butuh peta itu. Ia butuh satu bit: hidup atau mati.

Jadi **`GET /healthz`** baru: persis `{"ok":true,"protocol":"1.7"}`. Nol kapabilitas,
nol nama layanan, nol versi, nol mode gateway, nol status `edgeGuard` (itu sendiri
oracle), nol waktu server, nol baca D1/KV. `protocol` tetap ada karena monitor yang
berguna harus bisa melihat protokol yang salah, dan '1.7' sudah publik di klien.

`EDGE_FREE_PATHS` berisi **tepat satu** path, dan gerbang meng-assert itu di kode —
jadi path bebas-header kedua tidak bisa menyelinap tanpa seseorang memerahkan CI.

Preflight `OPTIONS` juga tidak lewat gerbang (dijawab `index.js` sebelum rantai
middleware). Itu tidak melemahkan apa pun: proxy PHP menjawab preflight sendiri, dan
permintaan sungguhannya tetap kena 403.

### `deploy/edge/` (BARU) — artefak deployment yang bisa diaudit

- `api-index.php` — salinan proxy dari `/home/user/workspace/edge-proxy.php`, nilai
  secret tetap placeholder `__EDGE_SECRET__` (muncul **tepat sekali**).
- `README.md` — kenapa jembatan ada (public suffix list ⇒ cookie lintas situs ⇒ model
  identitas runtuh), sifat sementaranya, cara memasang (`sed` ke salinan lokal → `scp`
  → `chmod 644` → `.htaccess` dengan rewrite + blokir `*.bak` + `RequestHeader unset
  X-Fiezel-Edge`), allowlist endpoint, urutan pemasangan yang tidak boleh dibalik
  (**proxy dulu, Worker belakangan** — terbalik = 403 untuk seluruh murid), dan
  **LANGKAH PEMBONGKARAN** 6 tahap.

Satu hal yang ditambahkan di luar permintaan, karena ia lubang nyata: `.htaccess`
memblokir `*.bak|orig|save|swp|old|php~|dist`. Editor berkas cPanel membuat
`index.php.bak`, dan berkas `.bak` **disajikan sebagai teks** — itu membocorkan secret
ke publik lewat pintu yang tidak ada hubungannya dengan Worker.

### `docs/CF-MIGRATION-RUNBOOK.md` — Bagian 2A (BARU)

Penanda temuan lapangan yang sama dengan bagian lain
(`🔄 TEMUAN LAPANGAN 27 Agu 2026 — BAGIAN INI BARU`), diletakkan tepat sesudah Bagian 2
(custom domain yang masih terblokir) dan sebelum Bagian 3. Isinya: apa yang dipasang,
kenapa bukan `*.workers.dev` langsung, bukti lapangan (33 assert
`cf-live-contract-test.js` melawan `https://api.fiezel.my.id`), lubang yang dibuka +
penutupnya, curl verifikasi, keputusan `/health` vs `/healthz`, allowlist, dan
pembongkaran ringkas. `EDGE_SHARED_SECRET` juga masuk tabel Secret §3.1 dan blok
`wrangler secret put`.

**Angka latensi, dicatat sebagai harga yang dibayar:**

| Yang diukur | Angka |
|---|---|
| Hop PHP tambahan pada `/health`, **dingin** | **2.214 ms** |
| Hop PHP tambahan pada `/health`, **hangat** | **~1.051 – 1.163 ms** |

Dua kejujuran yang menyertainya, tertulis di runbook dan di `deploy/edge/README.md`:
hop ini **menambah latensi** pada setiap panggilan API (custom domain tidak punya hop
ini sama sekali), dan **origin PHP kini titik gagal tunggal** — kalau hosting bersama
mati, seluruh API mati walaupun Worker Cloudflare sehat. Justru karena itu **aset audio
TIDAK lewat jembatan**: berkas ratusan kB–MB lewat satu proses PHP di hosting bersama
mengubah hop 1 ms menjadi leher botol yang mematikan pelajaran mendengarkan. Audio
tetap dari R2 / Worker `fiezel-audio`, dan `const ALLOW` proxy tidak boleh menerimanya.

## 3. Gerbang baru: `edge-guard-test.js` — **119/119 assert PASS**

Node murni, nol dependency, nol jaringan, nol berkas temporer. Memakai
`tools/cf-test-harness.js` (`makeEnv`, `fakeClock`, `loadWorkerSource`) dan
**menjalankan Worker `workers/api/` yang sungguhan** (graf ESM dirakit ke data: URL),
bukan salinan logika. Laporan mesin: `EDGE-GUARD-REPORT.json`.

| Butir | Yang dibuktikan |
|---|---|
| (a) | Secret terpasang + tanpa header ⇒ **403** pada `/health`, `/api/auth/anon`, `/api/config`, `/api/user/me`, `/api/quota`, `/api/auth/claim`, `/api/ai/task`, `/api/tts/render`, `/api/tts/manifest`, `/api/usage/events`. Dan yang paling penting: **nol tulis D1, nol tulis KV, nol `Set-Cookie`** pada penolakan — itu inti kerugian yang dicegah, dibuktikan lewat D1/KV palsu yang mencatat panggilannya. |
| (b) | Header salah / kosong / **prefiks benar tapi terpotong** / lebih panjang dari secret ⇒ 403, dan **badan respons IDENTIK** dengan kasus tanpa header (anti-oracle). |
| (c) | Header benar diteruskan: `/health` 200, `protocol:'1.7'`, `edgeGuard:"on"`. Bukti gerbang benar-benar **dilewati**: path tak dikenal ⇒ **404** (bukan 403), metode salah ⇒ **405**. Gerbang jembatan **tidak menggantikan** gerbang origin: origin asing tetap `forbidden_origin`. Nama header tidak peka huruf besar/kecil (HTTP/2). |
| (d) | Pindai kode: `ctEq()` ada, dipakai sebagai `ctEq(presented, …)`, dan **tidak ada** operator kesetaraan langsung pada identifier rahasia (`presented`/`configured`/`edgeSecret`/`EDGE_SHARED_SECRET`/`EDGE_HEADER`) maupun pada hasil `headers.get(...)`. Komentar dan string dibuang lebih dulu, karena komentar **sengaja** menyebut `===` untuk menjelaskan kenapa ia dilarang. Bentuk `ctEq` diperiksa (`Math.max`, akumulasi XOR/OR, tanpa keluar dini) **dan** perilakunya diuji langsung, karena perbandingan yang aman tapi salah lebih buruk daripada tidak ada. |
| (e) | Tanpa secret: `/health` 200 + `edgeGuard:"off"`, rute lain tidak 403, peringatan tercatat lewat jalur log yang ada dan menyebut nama secret + kata "transisi", ≤2 baris log (bukan banjir per permintaan). `EDGE_SHARED_SECRET` berisi **spasi saja** diperlakukan sebagai tidak terpasang — kalau tidak, satu salah-tempel `wrangler secret put` mengunci semua murid di balik secret yang tak seorang pun tahu. Komentar tegas soal sifat sementara juga di-assert ada di kode. |
| (f) | `/healthz` 200 tanpa header, kuncinya **persis** `ok,protocol`, tanpa `capabilities` / nama layanan / versi / mode gateway / plan / `edgeGuard`, dan **nol baca-tulis D1/KV** (dipanggil monitor tiap menit, selamanya). `/health` **tetap 403** tanpa header — keputusan §2 dijaga, bukan dipercaya. `EDGE_FREE_PATHS` tetap satu path. |
| (g) | `deploy/edge/api-index.php` memakai placeholder (tepat sekali), mengirim `X-Fiezel-Edge`, memakai allowlist default-tolak, menyatakan sifat sementaranya. Pemindai nilai acak (base64url/hex/base64 ber-padding, entropi kasar) menemukan **0 kandidat** — dan **membuktikan dirinya bisa merah**: tiga bentuk secret sungguhan disuntikkan ke salinan **di memori** dan ketiganya tertangkap. Pemindai yang tidak pernah bisa merah adalah pemindai yang bohong. Ditambah pola PEM/`sk-`/JWT/hex-panjang, dan `deploy/edge/README.md` diperiksa memuat 13 hal wajib (scp, chmod 644, .htaccess, allowlist, PEMBONGKARAN, `workers_dev = false`, hapus secret, angka latensi, titik gagal tunggal, audio, …). |
| + | Runbook Bagian 2A ada dengan penanda temuan lapangan, angka 2.214 / 1.051 / 1.163, kejujuran titik gagal tunggal, audio tidak lewat jembatan. Pemasangan di `index.js` diperiksa: `edgeGuardMiddleware` ada di rantai dan **posisinya paling luar** (indeksnya sebelum `guardMiddleware` dan `identityMiddleware`). Dan gerbang ini meng-assert **dirinya sendiri terdaftar** di `quality.yml` (temuan K13: gerbang yang tidak dijalankan workflow apa pun = gerbang yang tidak ada). |

Terdaftar di `.github/workflows/quality.yml` tepat sesudah `cf-wiring-test.js`, dengan
komentar kenapa posisinya di situ.

## 4. Verifikasi

| Gerbang | Hasil |
|---|---|
| `edge-guard-test.js` | **119/119 assert PASS**, exit 0 |
| `cf-api-contract-test.js` | 215/215 assert PASS, exit 0 |
| `cf-wiring-test.js` | PASS, exit 0 |
| `cf-live-contract-test.js` | **SKIP bersih tanpa env** (`pass:null`), exit 0 |
| `quota-core-test.js` | PASS, exit 0 |
| `analytics-privacy-test.js` | PASS, exit 0 |
| `no-network-test.js` | PASS (35 assert, **127** gerbang dipindai), exit 0 |
| `regression-test.js` | PASS, exit 0 |
| `install-health-test.js` | PASS, exit 0 |

`node --check` bersih pada semua berkas JS yang disentuh. **Tidak ada bump versi
build** (`VERSION.json`, `version.js` tidak tersentuh). Tidak ada push.

Catatan: `cf-api-contract-test.js` sekarang mencetak satu baris peringatan
`edgeGuard=off` saat berjalan. Itu **benar dan diinginkan** — env gerbang itu memang
tidak memasang `EDGE_SHARED_SECRET`, jadi Worker melaporkan keadaan sebenarnya alih-alih
diam. Gerbangnya tetap 215/215.

## 5. Berkas

**Baru:** `workers/api/mw-edge.js`, `edge-guard-test.js`, `deploy/edge/api-index.php`,
`deploy/edge/README.md`, `EDGE-GUARD-REPORT.json`, `reports/work-e9-edge.md`.

**Diubah:** `workers/api/index.js` (impor + `[M-1]` paling luar + rute `/healthz`),
`workers/api/route-health.js` (`edgeGuard` di `/health` + `routeHealthz`),
`workers/api/wrangler.toml` + `workers/api/README.md` (`EDGE_SHARED_SECRET`),
`docs/CF-MIGRATION-RUNBOOK.md` (Bagian 2A + tabel Secret),
`.github/workflows/quality.yml` (gerbang baru). `CF-WIRING-REPORT.json` dan
`NO-NETWORK-REPORT.json` diregenerasi oleh gerbangnya sendiri saat verifikasi.

## 6. Yang MASIH harus dilakukan owner (tidak bisa dikerjakan dari repo)

1. `sed` placeholder → nilai acak, `scp` ke `~/public_html/api/index.php`, `chmod 644`,
   pasang `.htaccess`. **Ini dulu.**
2. `cd workers/api && npx wrangler@3 secret put EDGE_SHARED_SECRET` dengan nilai
   **identik**. Urutan terbalik = 403 untuk seluruh murid.
3. `curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuard":"[a-z]*"'` ⇒ harus
   `"on"`. Selama masih `"off"`, lubang §1 **masih terbuka**.
4. `curl -o /dev/null -w '%{http_code}' https://fiezel-api.fitrajft.workers.dev/health`
   ⇒ harus **403**.
5. Arahkan monitor eksternal ke **`/healthz`**, bukan `/health`.

Kalau `/health` masih `edgeGuard:"off"` seminggu setelah deploy: itu **temuan**, bukan
konfigurasi.
