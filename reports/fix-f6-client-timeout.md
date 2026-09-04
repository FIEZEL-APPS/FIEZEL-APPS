# F6 — batas waktu klien vs latensi jembatan

Cabang `fix/f6client`. Tidak ada bump versi build (`FIEZEL_PAGE_BUILD` tetap `m025-172`),
tidak ada push. Bukti mentah lengkap: `reports/fix-f6-data/f6-evidence.md`,
laporan E2E `reports/fix-f6-data/e2e-after-2.json` (+ tangkapan layar di `shots2/`).

**Hasil E2E terhadap `https://api.fiezel.my.id`: 18/22 sebelum → 21/22 sesudah.**
Bukan 22/22. Yang masih merah dan alasannya ada di §6, dan itu bukan kelalaian yang
saya tutup dengan kalimat manis.

---

## 1. Inventaris SETIAP batas waktu klien di jalur CF (sebelum → sesudah)

| Jalur | Nilai LAMA | Nilai BARU | Berkas | Yang terjadi saat lewat batas |
|---|---|---|---|---|
| `GET /api/config` (kill switch) | `2500` | `8000` | `core-config.js` `FIEZEL_CF_REMOTE.timeoutMs`, dibaca `app.js` `CF_REMOTE_TIMEOUT_MS`, dipakai `cfFetchServerConfig` | `controller.abort()` → `catch` memetakan `AbortError` → `cfConfigFailed('timeout')` → `cfRemoteState.status='unreachable'` → `cfServerAllows()` false → **SELURUH jalur CF mati sisa sesi**, aplikasi lanjut lewat Puter |
| transport CF: `health` | **tidak ada** | `8000` | `core-config.js` `FIEZEL_CF_TIMEOUTS`, dipakai `cfWorkerFetch`/`cfTimeoutFor` di `app.js` | `AbortError` dilempar ke pemanggil (`coreWorkerExec`), bukan gantung tanpa akhir |
| transport CF: `auth` (`/api/auth/*`) | **tidak ada** | `8000` | idem | idem |
| transport CF: `quota` (`/api/quota*`) | **tidak ada** | `8000` | idem | idem |
| transport CF: `usage` | **tidak ada** | `8000` | idem | idem |
| transport CF: `ai` | **tidak ada** | `30000` | idem | sama dengan `FIEZEL_AI_TIMEOUT_MS`; lapis atas tetap yang memutuskan pesan ke murid |
| transport CF: `tts` | **tidak ada** | `12000` | idem | sama dengan `RENDER_TIMEOUT_MS`; suara peramban tetap jadi jatuh-balik |
| path CF tak dikenal kelasnya | **tidak ada** | `8000` | `CF_TIMEOUT_FALLBACK_MS` di `app.js` | nilai asing/nol TIDAK boleh berarti "tanpa batas" |
| lomba AI di lapis atas | `30000` | `30000` (tidak diubah) | `app.js` `FIEZEL_AI_TIMEOUT_MS` | `Promise.race` → `TimeoutError` → kalimat untuk murid |
| render TTS CF | `12000` | `12000` (tidak diubah) | `features/neural-voice/fiezel-cf-tts-transport.js` `RENDER_TIMEOUT_MS` | `{source:'timeout'}` → suara peramban |
| TTS peramban / init neural | `12000` / `20000` / `20000` / `30000` | tidak diubah | `fiezel-neural-voice-bootstrap.js`, `fiezel-neural-voice-audibility-fix.js` | jalur non-CF, di luar lingkup paket ini |
| cermin flag | `mirrorTtlMs 300000`, min `30000`, cap klien `300000` | tidak diubah | `core-config.js` + `app.js` `CF_MIRROR_TTL_CAP_MS` | cermin kedaluwarsa → permintaan config baru |

**Pemutus sirkuit (circuit breaker) klien: TIDAK ADA, dan itu bukan kelalaian.** Field
`breaker` di `app.js` hanya MENYALIN keadaan breaker yang dilaporkan server; klien tidak
punya breaker sendiri. Yang berperilaku seperti breaker adalah kegagalan config: sekali
gagal, seluruh jalur CF mati sampai sesi berikutnya (tanpa retry, karena `cfConfigBootOnce`
punya latch sekali-boot). Itu fail-safe yang benar arahnya, tetapi ia juga berarti satu
pembatalan salah = seluruh sesi kehilangan CF — persis yang terjadi dengan angka 2500 ms.

## 2. Bukti kenapa jawaban `/api/config` tidak pernah sampai ke aplikasi

Instrumentasi sementara `tools/f6-client-timeout-probe.mjs` membungkus `window.fetch` DAN
`AbortController.prototype.abort` sebelum satu pun skrip aplikasi jalan, lalu mencatat
pemanggil setiap pembatalan beserta tumpukannya. Dengan jawaban `/api/config` ditunda:

```
fetch CF : /api/config mulai 397ms selesai 2898ms status 0
           galat "AbortError: signal is aborted without reason"
abort    : padaMs 2898  pemanggil "AbortController.abort <- https://fiezel.my.id/app.js:2211:56"
cfState  : status "unreachable"  source "error"  reason "timeout"  flags null
mode     : config "off"  quota "off"
```

Jadi penyebabnya PASTI di sisi aplikasi: `app.js:2211` membatalkan permintaannya sendiri
pada 2898 ms (2500 ms + jitter penjadwalan). Jembatan tidak pernah diberi kesempatan
menjawab. Tanpa penundaan, jalur yang sama hijau: 200 dalam 1320 ms, protokol 1.7, enam
flag lengkap — artinya sisa marginnya hanya ~1,2 s, dan itu sebabnya jalur ini pecah
begitu ada satu handshake ulang atau satu paket hilang.

## 3. Perbaikan sisi klien

`core-config.js` — `timeoutMs: 2500 → 8000`, plus tabel baru `FIEZEL_CF_TIMEOUTS` untuk
tujuh kelas endpoint. Angkanya ditulis dengan alasannya di komentar sumber:

- p95 terukur `GET /api/config` koneksi baru = **1410 ms** (10 sampel: 1,123 1,201 1,161
  1,193 1,137 1,361 1,405 1,405 1,161 1,153 s). Koneksi hangat 0,35–0,47 s. Dari dalam
  Chromium saat boot dingin 1,16–1,32 s. `/api/quota` terautentikasi terburuk 1,95 s.
- margin = **6590 ms** (8000 − 1410), yaitu >4× p95. Alasan konkretnya: satu handshake TLS
  penuh terukur 0,48–0,72 s, dan bentuk kegagalan nyata di seluler adalah paket hilang +
  koneksi ulang, bukan server mati.
- 8000 ms juga **lebih besar** dari `TIMEOUT_FAST_S = 6` di `deploy/edge/api-index.php`,
  jadi klien hidup lebih lama daripada proksinya sendiri dan MEMBACA 504-nya alih-alih
  membatalkan lebih dulu dan kehilangan diagnosis. Ia sama dengan `CLIENT_ABANDON_S = 8`
  yang sudah jadi kontrak F4.

`app.js` — `cfWorkerFetch` sekarang memasang `AbortController` + `setTimeout` per kelas
endpoint (sebelumnya jalur ini **tanpa batas waktu sama sekali**), dan meneruskan `signal`
milik pemanggil apa adanya kalau ada, supaya lapis atas (mis. lomba AI) tidak dirampok
haknya membatalkan.

**Jalur config tetap tidak menahan render, dan itu diukur, bukan diklaim.**
`cfConfigBootOnce()` mengembalikan string secara sinkron (<50 ms), nol permintaan jaringan
terjadi saat boot, pengambilnya hanya DIJADWALKAN lewat `requestIdleCallback(…,{timeout})`
atau `setTimeout`, dan selama jawaban belum tiba semua kelas endpoint berstatus `off`.
Setiap bentuk kegagalan (batas waktu, HTTP 500, jaringan mati, protokol bukan 1.7) jatuh ke
semua-off tanpa pernah melempar. Keempatnya diuji dengan menjalankan kodenya, bukan dengan
mencocokkan teks (§5). E2E hidup mengonfirmasi: `config-non-blocking` hijau dengan render
mendahului jawaban config **2756 ms**.

## 4. Perbaikan sisi jembatan — dan satu premis tugas yang saya tolak dengan angka

### 4a. Yang saya perbaiki: jawaban galat proksi tidak punya header CORS

`fail()` di `deploy/edge/api-index.php` mengirim 400/404/405/502/504 **tanpa**
`Access-Control-Allow-Origin`. Akibatnya browser menolak jawaban itu sebelum kode aplikasi
melihatnya, dan yang muncul adalah `TypeError: Failed to fetch`. Ini bukan teori: hop
pertama pada satu putaran E2E berbunyi `Failed to fetch 6057ms` — 6057 ms ≈ `TIMEOUT_FAST_S
= 6` s, yaitu 504 jujur dari hop ini yang dibuang CORS. Seluruh kerja F4 membuat proksi
"gagal cepat dan jujur" jadi sia-sia di sisi klien. Sekarang `fail()` mengirim
`Access-Control-Allow-Origin: https://fiezel.my.id`, `Access-Control-Allow-Credentials: true`,
dan `Vary: Origin`, sama dengan cabang OPTIONS di berkas yang sama.

**Kamu yang harus mengunggahnya.** Saya tidak punya SSH. Berkas yang perlu diunggah:
`deploy/edge/api-index.php` (placeholder `__EDGE_SECRET__` tetap utuh dan harus diganti
saat unggah, sesuai `deploy/edge/README.md`). Sebelum unggah, perilaku ini TIDAK aktif di
produksi; angka E2E di laporan ini dicapai tanpanya.

### 4b. Yang saya TOLAK: menyalakan ulang gzip pass-through dan TCP Fast Open

Premis tugas ("F4 memperlambat jembatan jadi 1,4–1,7 s dari 847–1163 ms") tidak lolos ukur:

| Jalur | Sekarang | Pra-F4 (A7) |
|---|---|---|
| `/api/config` hangat | 0,349–0,472 s | 847–1163 ms |
| `/api/config` koneksi baru | 1,123–1,405 s (TLS 0,48–0,72 s di dalamnya) | — |

Angka 1,4–1,7 s yang terlihat adalah **koneksi dingin termasuk handshake TLS**, bukan
regresi proksi. Selain itu jawaban asal sudah datang dengan `content-encoding: br` — artinya
LiteSpeed memang memampatkan sendiri badan identity dari PHP. Menyalakan
`ENABLE_GZIP_PASSTHROUGH` hanya memindahkan kompresi dari br ke gzip di hop klien (nol
keuntungan terukur) sambil menambah permukaan encoding ganda. `ENABLE_TCP_FASTOPEN` juga
tetap `false`: langitnya satu RTT pada hop yang didominasi TLS, sedangkan mode gagalnya
berharga detik, dan dari sandbox ini klaimnya tidak bisa dijatuhkan maupun dibuktikan.
Kalau kamu tetap mau keduanya, minta paket terpisah dengan pengukuran dari jaringan
produksi — jangan dari sini, karena di sini angkanya tidak mendukung perubahannya.

## 5. Gerbang baru `cf-client-timeout-test.js` (72/72, nol jaringan)

Terdaftar di `.github/workflows/quality.yml` sesudah `cf-config-killswitch-test.js`.
Empat kebenaran yang dijaganya persis kontrak paket: (1) setiap batas waktu klien di jalur
CF punya nilai eksplisit; (2) nilainya ≥ p95 terukur (1410 ms) + margin minimum 3000 ms,
margin itu DISEBUT di komentar sumber, dan untuk config harus > `TIMEOUT_FAST_S` proksi;
(3) jalur config tidak pernah menahan render; (4) kegagalan config jatuh ke semua-off.

Dua lapis pembuktian: **matriks racun 19 baris** (setiap detektor dijalankan atas sumber
asli — harus hijau — dan atas sumber yang dirusak di memori — harus merah; berkas di disk
tidak pernah disentuh), plus **eksekusi** blok `CF-KILLSWITCH` + `CF-TRANSPORT` di `vm`
dengan `fetch` mock lokal: pembatalan benar-benar terjadi pada anggaran tabel, `signal`
pemanggil benar-benar diteruskan, `cfConfigBootOnce()` benar-benar kembali sinkron dengan
nol fetch, dan empat bentuk kegagalan benar-benar berujung semua-off tanpa melempar.
Baris racun mencakup, antara lain: `timeoutMs` dikembalikan ke 2500, dipangkas ke bawah
`TIMEOUT_FAST_S`, satu kelas endpoint hilang dari tabel, tabel tidak lagi dibekukan,
`ai`/`tts` memangkas lomba di lapis atasnya, alasan p95 dihapus dari komentar,
`cfWorkerFetch` kembali tanpa batas waktu, fallback jadi 0, transport merebut `signal`
pemanggil, boot menunggu config, dan `AbortError` tidak lagi dipetakan ke kegagalan.

## 6. E2E hidup: sebelum vs sesudah, dan yang masih merah

| | Sebelum | Sesudah |
|---|---|---|
| Total | **18/22** | **21/22** |
| `config-protocol` | MERAH ("aplikasi tidak pernah menerima jawaban /api/config") | HIJAU `protocol=1.7` |
| `config-flags-present` | MERAH "(tidak ada flags)" | HIJAU, enam flag |
| `config-non-blocking` | MERAH `configTiba=(tidak pernah)` | HIJAU, render 2756 ms lebih dulu |
| `bridge-hop-stable` | MERAH `#1 TIMEOUT 8003ms #2 TIMEOUT 8000ms #3 Failed to fetch 7495ms` | HIJAU `200 1664ms / 200 894ms / 200 870ms` (dan 12/12 dua kali pada putaran C+D terpisah) |
| `server-flag-wins` | HIJAU **secara semu** | **MERAH** |

Dua catatan yang harus kamu baca, bukan lewati:

**`bridge-hop-stable` merah BUKAN karena batas waktu klien, dan bukan karena jembatan.**
Penyebabnya HTTP/3. Jawaban asal mengiklankan `alt-svc: h3=":443"`, jadi Chromium memindahkan
permintaan kedua dan seterusnya ke QUIC, sementara UDP/443 dari sandbox ini adalah lubang
hitam. Eksperimen terkontrol (`tools/f6-hop-isolate.mjs`, satu variabel): tanpa
`--disable-quic` tiga hop `/api/quota` tidak pernah dijawab (>24 s, 2 dari 2 putaran);
dengan `--disable-quic` ketiganya 200 dalam 0,9–1,7 s (2 dari 2 putaran). Kontrol
tambahannya bukan jembatan kita: host lain yang h3-nya sehat pun menggantung 39 s dari
sandbox ini sebelum jatuh balik ke h2, sementara UDP/53 keluar normal. Karena itu gerbang
E2E sekarang menjalankan Chromium dengan `--disable-quic`, dengan alasannya ditulis di
tempatnya. Ini bukan melunakkan assert: tanpa flag itu assert tersebut mengukur UDP
lingkungan uji, bukan kestabilan hop jembatan. Yang belum diuji siapa pun: apakah h3 ke
`api.fiezel.my.id` sehat dari perangkat murid sungguhan. Kalau tidak, `alt-svc` di asal
harus dimatikan — dan itu keputusanmu, dengan data dari produksi.

**`server-flag-wins` merah karena premisnya tidak ada, dan hijaunya yang lama adalah
hijau bohong.** Assert itu menuntut jembatan menjawab flag SEMUANYA false, lalu memeriksa
nol permintaan `/api/quota`. KV `cfg:flags` sekarang berisi `cfApiEnabled`,
`cfIdentityEnabled`, `cfQuotaEnabled = true` (kamu yang menyalakannya), jadi
`serverFlagsSemuaFalse=false` dan aturan yang mau diuji tidak pernah kena batu ujinya.
Sebelum perbaikan ini ia hijau justru karena jawaban config tidak pernah tiba: `flags`
null → premis dianggap terpenuhi → nol permintaan CF karena semuanya sudah mati. Itu
kehijauan yang datang dari kerusakan, dan saya tidak mau menambalnya dengan melunakkan
assert. Dua jalan jujur, pilih satu: (a) set `cfg:flags` ke semua-false sebentar dan
jalankan ulang gerbang untuk membuktikan arah "server bisa mematikan"; atau (b) paket
terpisah yang menulis ulang skenario itu supaya ia memaksa premisnya sendiri (mis.
`page.route` menulis ulang `flags` jawaban jembatan jadi false) — dan itu perubahan makna
gerbang, jadi bukan wewenang saya di paket ini.

Jadi: **21/22, bukan 22/22.** Satu assert masih merah dan penyebabnya keadaan KV yang kamu
atur, bukan kode di cabang ini.

## 7. Verifikasi (semua exit 0)

| Gerbang | Hasil |
|---|---|
| `cf-client-timeout-test.js` (baru) | PASS 72/72, matriks racun 19 baris |
| `edge-proxy-hopbyhop-test.js` | PASS 133/133 |
| `edge-proxy-contract-test.js` | PASS 120/120 |
| `cf-transport-test.js` | PASS 25 assert |
| `cf-config-killswitch-test.js` | PASS 58 assert |
| `cf-shadow-ledger-test.js` | PASS 94 assert |
| `ai-transport-switch-test.js` | PASS 113 assert |
| `e2e-bridge-selftest.js` | PASS 32 assert / 21 skenario loopback |
| `no-network-test.js` | PASS 39 assert, 148 gerbang dipindai |
| `secret-scan-test.js` | PASS 46/46, 0 temuan |
| `regression-test.js` | PASS |
| `install-health-test.js` | PASS |
| `gate-registry-test.js` | PASS 10/0 |

## 8. Berkas yang berubah

- `core-config.js` — `timeoutMs` 2500→8000 + tabel `FIEZEL_CF_TIMEOUTS` (tujuh kelas).
- `app.js` — `cfWorkerFetch` punya batas waktu + `cfTimeoutFor` + `CF_TIMEOUT_FALLBACK_MS`.
- `deploy/edge/api-index.php` — header CORS pada `fail()`. **Perlu diunggah olehmu.**
- `tools/fiezel-e2e-bridge.mjs` — `--disable-quic`, `CONFIG_DELAY` bawaan 8000→4500 ms
  (harus di bawah anggaran klien 8000 ms, tetap di atas boot ~3,5 s + margin 100 ms).
- `cf-client-timeout-test.js` — gerbang baru; terdaftar di `.github/workflows/quality.yml`.
- `tools/f6-*.mjs` — instrumentasi bukti (probe abort, isolasi hop, matriks cookie,
  aplikasi-vs-fetch-mentah, cek h3). Bukan gerbang, tidak dipanggil CI, tidak dipindai
  `no-network-test.js` (ia hanya memindai `*-test.js` di akar). Sengaja disimpan supaya
  klaim di laporan ini bisa dijalankan ulang orang lain, bukan dipercaya.
- `reports/fix-f6-data/` — bukti mentah, laporan E2E, tangkapan layar.
