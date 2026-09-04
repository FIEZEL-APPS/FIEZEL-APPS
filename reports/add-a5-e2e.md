# A5 — Uji E2E BROWSER untuk jembatan `api.fiezel.my.id`

Cabang: `add/a5e2e`. Tidak ada bump versi build. Tidak ada push.

Berkas baru:

- `tools/fiezel-e2e-bridge.mjs` — gerbang E2E browser (Playwright/Chromium), env-gated, TIDAK didaftarkan di CI.
- `e2e-bridge-selftest.js` — self-test 21 skenario loopback (1 benar, 20 salah) untuk gerbang di atas. Didaftarkan di CI.
- `reports/add-a5-data/` — bukti mentah: laporan JSON live, 4 tangkapan layar, log self-test.

Berkas yang disentuh: `.github/workflows/quality.yml` (satu langkah baru + alasan), `no-network-test.js` (allowlist + blok pemeriksaan baru).

---

## 1. Hasil apa adanya

### Self-test (loopback, tanpa jaringan keluar)

```
FIEZEL e2e-bridge selftest: PASS (32 assert, 21 skenario loopback)
```

21 skenario: 1 benar (gerbang HIJAU, 22 assert dijalankan) + 20 salah, dan setiap skenario salah dituntut GAGAL pada **id assert yang tepat** — bukan sekadar "merah". Log utuh: `reports/add-a5-data/e2e-bridge-selftest-2026-08-28.txt`. Durasi ~6 menit di sandbox ini.

Kesalahan yang dibuktikan bisa memerahkan gerbang:

| Kesalahan yang ditiru | assert yang harus gagal |
|---|---|
| cookie `fz_id` tanpa `Domain` (host-only) | `cookie-domain` |
| cookie `fz_id` dengan `Domain=evil.example` | `cookie-domain` |
| cookie tanpa `HttpOnly` | `cookie-httponly` |
| cookie `SameSite=None` | `cookie-samesite-lax` |
| tidak ada `Set-Cookie` sama sekali | `cookie-present` |
| `POST /api/auth/anon` menjawab 500 | `anon-200` |
| `/api/config` membawa `protocol: "1.6"` | `config-protocol` |
| `/api/config` mengirim `flags` kosong | `config-flags-present` |
| `/api/quota` menjawab 200 TANPA cookie | `quota-401-before-auth` |
| jembatan menggantung permintaan ke-3 di satu koneksi | `bridge-hop-stable` |
| aplikasi menembak jembatan walau semua flag `off` | `off-no-bridge-request` |
| aplikasi mengabaikan `enabled:false` | `disabled-no-bridge-request` |
| aplikasi tidak pernah / dua kali memanggil `/api/config` | `config-called-once` |
| aplikasi MENAHAN boot sampai `/api/config` datang | `config-non-blocking` |
| aplikasi mengabaikan flag server yang `false` | `server-flag-wins` |
| aplikasi menembak `*.workers.dev` langsung | `no-workers-dev` |
| aplikasi membuang `credentials:'include'` | `cookie-replayed` |
| aplikasi tidak me-render apa pun | `off-app-boots` |
| isi HANYA markup statis, nol render JS | `off-app-boots` |

Ditambah perilaku env: tanpa `FIEZEL_E2E_BRIDGE_BASE` gerbang exit 0 dengan label SKIP, `status:"SKIP"`, `pass:null`, dan daftar "yang BELUM terbukti"; base URL tak sah exit 1; `FIEZEL_E2E_ONLY` dengan nama skenario tak dikenal exit 1 (bukan diam-diam menguji nol skenario); laporan tidak pernah ditulis ke akar repo.

### Live terhadap `https://api.fiezel.my.id` (28 Agustus 2026, chromium 147.0.7727.15, durasi 72 s)

```
E2E jembatan: MERAH (6 dari 22 assert) terhadap https://api.fiezel.my.id
```

16 LULUS / 6 GAGAL. Laporan mentah: `reports/add-a5-data/e2e-bridge-live-2026-08-28.json`. Tangkapan layar per skenario: `e2e-bridge-a-semua-off.png`, `e2e-bridge-a2-enabled-false.png`, `e2e-bridge-b-config-on.png`, `e2e-bridge-c-auth-on.png`.

LULUS:

| assert | angka nyata |
|---|---|
| `browser-real` | chromium 147.0.7727.15 |
| `off-app-boots` | bootMs=3642, teks elemen terbesar 402 char, 385 node hasil render JS |
| `off-no-bridge-request` | **0** permintaan ke `api.fiezel.my.id` |
| `disabled-app-boots` | bootMs=3509, 402 char |
| `disabled-no-bridge-request` | **0** permintaan |
| `quota-401-before-auth` | 401 `{"error":"unauthenticated"}` dalam 1.506 ms |
| `anon-200` | 200, `plan:"free"`, `class:"visitor"`, `issued:true` |
| `cookie-present` | `fz_id@.fiezel.my.id` benar-benar ada di jar Chromium |
| `cookie-httponly` / `cookie-secure` / `cookie-samesite-lax` / `cookie-domain` | `httpOnly=true`, `secure=true`, `sameSite=Lax`, `domain=.fiezel.my.id` |
| `cookie-replayed` | header `Cookie: fz_id=eyJ2IjoxLCJraWQiOjIs…` terkirim di permintaan berikutnya |
| `quota-200-after-auth` | 200, `schema:"fiezel-quota-v1"`, `plan:"free"` |
| `no-workers-dev` | **0** permintaan ke `*.workers.dev` dari browser |
| `scenarios-complete` | 6/6 skenario selesai |

Inilah bagian yang curl tidak bisa membuktikan: cookie `fz_id` dengan `SameSite=Lax` yang dipasang `api.fiezel.my.id` benar-benar **disimpan** oleh Chromium dan **dikirim ulang** ke subdomain lain di bawah `Domain=.fiezel.my.id` dari halaman `https://fiezel.my.id`. curl hanya membuktikan servernya mengirim header; browser yang menentukan header itu berlaku.

GAGAL — dua temuan, keduanya nyata:

**Temuan 1 — aplikasi di cabang ini belum punya kill switch klien.** Gagal: `config-called-once` (0 permintaan `/api/config`), `config-protocol`, `config-flags-present`, `config-non-blocking`, `server-flag-wins`. Buktinya bukan tafsiran: dengan `config` dan `quota` di-`on` secara statis, aplikasi **tidak pernah** memanggil `/api/config`, lalu tetap mengirim `GET /api/quota` ke jembatan. Artinya kalau jembatan menyatakan `flags` semuanya `false`, aplikasi hari ini tidak akan mendengarnya — kill switch sisi server tidak punya pasangan di klien.

Kode kill switch itu ada, tetapi bukan di cabang ini: `app.js` di worktree `roll/s1cfg` punya blok `CF-KILLSWITCH-BEGIN` + `cfRemoteState` + cermin `sessionStorage`. Selama blok itu belum masuk, skenario B **sah** merah dan gerbang ini menjadi bukti mati/hidupnya penggabungan itu. Jangan melunakkan assert-nya supaya CI hijau.

**Temuan 2 — jembatan menggantung permintaan ke-3 pada satu koneksi.** `bridge-hop-stable`: `#1 200 1.853 ms | #2 200 943 ms | #3 TIMEOUT 8.002 ms`.

Diagnosis (lima spike terpisah, kontrol curl lengkap):

- Dari Chromium, permintaan **ke-3 dan sesudahnya** ke `api.fiezel.my.id` pada satu koneksi menggantung ~30 s, lalu `net::ERR_CONNECTION_CLOSED`; semua yang tergantung dijawab serentak di ~+30 s. Koneksi baru cepat lagi.
- Tidak bergantung pada aplikasi FIEZEL (terulang di halaman kosong), tidak bergantung HTTP/2 vs HTTP/1.1 (`--disable-http2`), dan tidak bergantung pada `POST /api/auth/anon` (terulang dengan cookie yang sudah disemai lebih dulu).
- **curl tidak mereproduksinya**: 5 permintaan pada satu koneksi HTTP/2 yang sama semuanya ~0,9 s, bahkan dengan header lengkap gaya browser (`Accept-Encoding: gzip, deflate, br, zstd`, `Sec-Fetch-*`, `Referer`, UA iPhone).

Kesimpulan: ini cacat interop Chromium ↔ jembatan di sisi origin (kemungkinan proxy PHP ArenHost), bukan cacat Worker dan bukan cacat aplikasi. Ia **tidak terlihat** oleh `cf-live-contract-test.js` yang lulus 33 assert lewat curl. Persis kelas cacat yang membuat gerbang browser layak ada. Untuk pengguna nyata artinya: sesi ke-3 dan seterusnya dalam satu koneksi hangat bisa menggantung sampai ~30 s sebelum gagal.

Karena cacat ini akan meracuni assert lain (panggilan yang menggantung tampak seperti "aplikasi tidak memanggil"), ia dijadikan assert kelas satu (`bridge-hop-stable`, skenario `D-hop-stabil`) dengan browser terpisah per skenario — bukan dibiarkan mengotori skenario cookie.

---

## 2. Yang dibuktikan gerbangnya (dan bagaimana)

Enam skenario, satu browser per skenario (kolam socket Chromium dipakai bersama antar konteks, jadi cacat hop di atas akan menular kalau browsernya dipakai ulang):

| skenario | isi |
|---|---|
| `A-semua-off` | semua flag `off` ⇒ **nol** permintaan ke jembatan, aplikasi tetap boot |
| `A2-enabled-false` | `enabled:false` walau endpoint `on` ⇒ **nol** permintaan |
| `B-config-on` | `config` `on` ⇒ `/api/config` sekali per boot, tidak memblokir boot, flag server `false` MENANG atas statis `on` |
| `C0-pra-auth` | `/api/quota` tanpa cookie ⇒ 401 (anti-vakum: kalau 200, uji cookie di bawah tidak membuktikan apa pun) |
| `C-auth-on` | `auth` `on` ⇒ cookie `fz_id` tersimpan di jar browser dengan atribut benar dan **terkirim ulang** |
| `D-hop-stabil` | 3 panggilan berurutan pada satu koneksi harus semuanya dijawab |

Cara kerjanya, dan mengapa begitu:

- `FIEZEL_CF_CONFIG` di-override lewat `addInitScript` dengan `Object.defineProperty` yang **menelan** tulisan dari `core-config.js`. Nol perubahan berkas repo.
- Worktree diserve lokal lewat **HTTPS** dengan sertifikat self-signed, dan Chromium dijalankan dengan `--host-resolver-rules=MAP fiezel.my.id:443 127.0.0.1:<port>`. Alasannya bukan kosmetik: hanya dengan cara ini `Origin` tetap `https://fiezel.my.id` (ada di `ALLOWED_ORIGINS` jembatan) dan cookie `Domain=.fiezel.my.id` menjadi first-party seperti di produksi. `http://localhost` akan menguji jalur CORS yang berbeda, dan cookie `Secure` tidak akan tersimpan.
- Panggilan uji **selalu** lewat `window.coreWorkerExec` milik aplikasi, bukan `fetch` sendiri, dengan batas waktu di dalam halaman.
- Cookie `HttpOnly` mustahil dibaca dari JavaScript halaman (dan memang harus mustahil), jadi buktinya diambil dari `context.cookies()` + header `Cookie` yang benar-benar dikirim di kabel (`request.allHeaders()`).
- Semua permintaan keluar dicatat per skenario; `no-workers-dev` menuntut **nol** permintaan ke `*.workers.dev` dari browser.

Batas kejujuran yang perlu dicatat:

1. **Service worker tidak teruji.** Sertifikat self-signed membuat pendaftaran SW gagal, jadi jalur cache SW tidak masuk gerbang ini. Itu ditutup `pwa-cache-test.js` dan `sw-corp-test.js`, bukan di sini.
2. **Probe boot mengukur "ada isi ter-render", bukan "aplikasi benar".** Ia menuntut ≥200 karakter `innerText` dari elemen yang benar-benar tercat, disisipkan **sesudah** `DOMContentLoaded`, di luar splash statis. Aturan "sesudah DOMContentLoaded" itu bukan hiasan: tanpanya markup statis panjang membuat probe mengaku "boot" tanpa satu byte pun render JS.
3. Gerbang ini menguji satu aplikasi di satu viewport ponsel (390×844, dsf 3, UA iPhone). Ia bukan uji lintas-browser.

---

## 3. Dua cacat harness yang ditangkap self-test sendiri

Ini alasan kontrol negatif wajib ada. Kedua cacat di bawah membuat gerbang melaporkan **cacat produk yang tidak ada**, dan keduanya ketahuan hanya karena skenario BENAR dituntut HIJAU dan skenario salah dituntut merah **pada id yang tepat**:

1. `route.fetch()` + `route.fulfill()` untuk menunda `/api/config` gagal terhadap jembatan tiruan bersertifikat self-signed (APIRequestContext menolak sertifikatnya) ⇒ permintaan di-abort ⇒ gerbang bilang "aplikasi tidak pernah menerima jawaban `/api/config`". Diganti: tunda **di depan** lalu `route.continue()`, jadi jawabannya tetap jawaban jembatan sungguhan.
2. Pendengar `response` menunggu `response.text()` **sebelum** mendaftarkan entri ⇒ jawaban yang badannya tidak selesai dibaca hilang total dari daftar ⇒ gerbang kembali bilang "tidak pernah menerima jawaban" untuk jawaban yang jelas diterima. Diganti: daftarkan entri dulu, isi badan belakangan.
3. `config-non-blocking` semula membandingkan `Date.now()` di Node saat peristiwa `response` tiba. CDP mengantar peristiwa beberapa milidetik terlambat, jadi aplikasi yang **jelas menahan boot** sampai config datang tetap dinilai lulus. Diganti: cap waktu dari timing browser (`startTime + responseStart`) dengan margin 100 ms, dan penundaan bawaan dinaikkan ke 8.000 ms supaya uji ini bukan lomba antara boot lambat (~3,5 s) dan jawaban cepat.

4. Jalur SKIP menulis `E2E-BRIDGE-REPORT.json` ke akar repo setiap kali `no-network-test.js` menjalankannya untuk membuktikan SKIP-nya bersih — artefak yang mengotori working tree hanya karena ada uji lain yang memeriksanya. Sekarang SKIP menulis laporan **hanya** kalau `FIEZEL_E2E_REPORT` diset eksplisit, dan self-test punya probe khusus tanpa env itu yang menuntut akar repo tetap bersih.

Sebelum perbaikan ini, gerbang "live" akan tetap merah dan laporannya akan menuduh produk. Tanpa self-test, tuduhan itu akan saya tulis sebagai temuan.

---

## 4. Pendaftaran CI dan `no-network-test.js`

- `quality.yml`: **hanya** `node e2e-bridge-selftest.js` yang didaftarkan, sesudah `node no-network-test.js`, dengan komentar yang menyebut alasannya.
- `tools/fiezel-e2e-bridge.mjs` **sengaja tidak** didaftarkan. Mendaftarkannya berarti setiap push memaksa produksi melayani sesi anon baru dengan browser sungguhan, dan membuat CI merah karena jaringan, bukan karena kode. Pilihan ini di-assert **dua arah** di `no-network-test.js`: self-test wajib ada di `quality.yml`, gerbang live-nya wajib TIDAK ada. Jadi kalau seseorang memasukkannya "supaya lebih aman", gerbangnya bicara.
- `SOCKET_ALLOWLIST` naik dari 3 ke 4 nama (`e2e-bridge-selftest.js`), assert jumlahnya diikutkan, dan alasannya ditulis di header berkas: self-test itu butuh server **HTTPS sungguhan** karena browser hanya menyimpan cookie `Secure` dari konteks aman, dan seluruh bukti gerbangnya adalah soal cookie. Semua nama host uji dipetakan ke `127.0.0.1` lewat `--host-resolver-rules`: tanpa DNS, tanpa egress. Pemindainya **tidak** dilonggarkan.
- Blok baru §2c di `no-network-test.js`: `tools/fiezel-e2e-bridge.mjs` lolos pemindaian hanya karena kebetulan lokasi (`tools/`) dan ekstensi (`.mjs`). Itu justru yang tidak boleh dibiarkan, jadi perilakunya **dijalankan**: harus membaca `FIEZEL_E2E_BRIDGE_BASE`, tidak boleh punya URL remote bawaan (satu `|| 'https://…'` cukup untuk membuat CI publik menembak produksi), dan harus exit 0 + mencetak `SKIP` tanpa env itu.

Cara menjalankan gerbang live secara sadar:

```
FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id \
FIEZEL_E2E_REPORT=/tmp/e2e-live.json \
FIEZEL_E2E_SHOT_DIR=/tmp/e2e-shots \
node tools/fiezel-e2e-bridge.mjs
```

Env lain: `FIEZEL_E2E_ONLY` (nama skenario, mempercepat iterasi), `FIEZEL_E2E_CONFIG_DELAY`, `FIEZEL_E2E_BOOT_TIMEOUT`, `FIEZEL_E2E_APP_DIR`, `FIEZEL_E2E_APP_HOST`, `FIEZEL_E2E_HOST_MAP`, `FIEZEL_E2E_PROTOCOL`, `FIEZEL_E2E_COOKIE_DOMAIN`.

Catatan lingkungan: `playwright` **tidak** dimasukkan ke `package.json` repo. Kalau modul atau biner Chromium tidak ada, self-test mencetak SKIP + daftar "yang BELUM terbukti" lalu exit 0. Deteksinya dilakukan dengan **menyalakan** browsernya, bukan menebak nama berkas biner — versi pertama membaca `chromium.executablePath()` dan melaporkan SKIP palsu padahal gerbangnya jalan mulus (Playwright headless memakai paket `chromium-headless-shell`). SKIP palsu lebih berbahaya daripada merah.

## 5. Verifikasi

Semua dijalankan di worktree ini:

| gerbang | hasil |
|---|---|
| `node e2e-bridge-selftest.js` | exit 0 — PASS (32 assert, 21 skenario) |
| `node no-network-test.js` | exit 0 |
| `node regression-test.js` | exit 0 |
| `node install-health-test.js` | exit 0 |
| `node ui-structure-test.js` | exit 0 |
| `node tools/fiezel-e2e-bridge.mjs` (live, opsional) | exit 1 — MERAH 6/22, dua temuan di §1 |

Versi build tidak dinaikkan. Tidak ada push.

## 6. Yang harus dikerjakan berikutnya (bukan di paket ini)

1. Gabungkan blok kill switch klien dari `roll/s1cfg` lalu jalankan ulang skenario `B-config-on`. Lima assert merah di §1 Temuan 1 adalah daftar terima-kerjanya.
2. Bawa cacat hop ke-3 ke sisi origin (proxy PHP ArenHost): keep-alive/`Connection` handling untuk klien HTTP/2 browser. `bridge-hop-stable` adalah uji terimanya.
3. Kalau SW ikut mau diuji E2E, sediakan sertifikat yang dipercaya (mkcert) alih-alih self-signed, atau jalankan Chromium dengan `--unsafely-treat-insecure-origin-as-secure`; keduanya menambah asumsi, jadi putuskan sadar-sadar.
