# cf-live-runner — cara menjalankan gerbang runtime nyata

`tests/cf-live-contract-test.js` adalah satu-satunya gerbang di repo ini yang menguji Worker
`fiezel-api` **yang hidup** lewat HTTP nyata. Semua gerbang CF lain (`tests/cf-api-contract-test.js`,
`tests/cf-wiring-test.js`, `quota-*`, `analytics-*`, `tests/tts-key-test.js`) berjalan di atas binding palsu
`tools/cf-test-harness.js` — batas kejujuran yang sudah dicatat sendiri di
`reports/exec-wiring.md` §6.

## 1. Menjalankannya

```bash
# produksi (setelah rute api.fiezel.my.id dibuka)
FIEZEL_CF_LIVE_BASE=https://api.fiezel.my.id node tests/cf-live-contract-test.js --report

# deploy sementara di *.workers.dev
FIEZEL_CF_LIVE_BASE=https://fiezel-api.<akun>.workers.dev node tests/cf-live-contract-test.js --report
```

Tanpa `FIEZEL_CF_LIVE_BASE` gerbang mencetak alasan jujur lalu **exit 0 (SKIP)**. SKIP bukan
PASS: statusnya `SKIP` dan `pass: null` di laporan, jadi ia tidak boleh dikutip sebagai bukti
runtime.

`--report` menulis `CF-LIVE-REPORT.json` (hasil per assert + daftar permintaan yang benar-benar
ditembakkan). Berkas itu **gitignored**: isinya bergantung lingkungan.

## 2. Variabel lingkungan

| Variabel | Wajib | Bawaan | Guna |
|---|---|---|---|
| `FIEZEL_CF_LIVE_BASE` | ya | *(tidak ada)* | base URL Worker. Tanpa ini → SKIP. Sengaja tanpa bawaan: satu URL bawaan akan membuat CI publik menembak produksi pada setiap push. |
| `FIEZEL_CF_LIVE_ORIGIN` | tidak | `https://fiezel.my.id` | Origin yang **harus** mendapat `access-control-allow-origin`. Harus salah satu isi `ALLOWED_ORIGINS` di `workers/api/wrangler.toml`. |
| `FIEZEL_CF_LIVE_COOKIE_DOMAIN` | tidak | `fiezel.my.id` | Nilai `Domain` yang diharapkan pada cookie `fz_id` = `COOKIE_DOMAIN` di `wrangler.toml`. |
| `FIEZEL_CF_LIVE_REPORT` | tidak | `./CF-LIVE-REPORT.json` | Alihkan laporan ke berkas lain (dipakai `tests/cf-live-selftest.js` agar tidak mengotori working tree). |

### Menjalankan terhadap *.workers.dev

Pada `*.workers.dev`, dua nilai bawaan di atas kemungkinan **tidak** cocok dengan `vars` yang
ter-deploy. Jangan melunakkan gerbangnya — sesuaikan yang diharapkan:

```bash
FIEZEL_CF_LIVE_BASE=https://fiezel-api.<akun>.workers.dev \
FIEZEL_CF_LIVE_ORIGIN=https://fiezel.my.id \
FIEZEL_CF_LIVE_COOKIE_DOMAIN=fiezel.my.id \
node tests/cf-live-contract-test.js --report
```

Kalau `COOKIE_DOMAIN` memang belum diisi di deployment itu, assert `cookie-domain` akan **merah**
— dan itu temuan yang benar, bukan gangguan: cookie tanpa `Domain` menjadi host-only, sehingga
identitas murid patah antara `fiezel.my.id` dan `api.fiezel.my.id`.

## 3. Yang diuji (semuanya lewat HTTP nyata)

| id assert | Isi |
|---|---|
| `health-not-404`, `health-200`, `health-protocol` | `/health` terpasang di edge dan mengembalikan `protocol:"1.7"` |
| `config-flags-present`, `config-flags-false`, `config-killswitch-false` | `/api/config` mengirim objek `flags` yang **tidak kosong** dan semuanya `false` selama `FEATURE_*` off |
| `quota-401`, `me-401` | `/api/quota` dan `/api/user/me` menjawab 401 tanpa cookie |
| `anon-200`, `cookie-present`, `cookie-httponly`, `cookie-secure`, `cookie-samesite-lax`, `cookie-domain`, `cookie-max-age` | `POST /api/auth/anon` 200 + `Set-Cookie fz_id` dengan atribut lengkap |
| `cors-allowed-origin`, `cors-vary-origin` | kontrol **positif**: origin sah memang mendapat header CORS |
| `cors-foreign-no-acao`, `cors-foreign-not-wildcard`, `cors-foreign-rejected` | Origin asing (`https://evil.example`) tidak mendapat `access-control-allow-origin`, tidak dapat `*`, dan ditolak 403 |
| `byte-cap-rejected`, `byte-cap-413` | body 2 KB ke `/api/auth/anon` (cap 512 B) ditolak 413 |
| `unknown-4xx`, `unknown-not-500` | endpoint tak dikenal 404/403, bukan 500 |
| `no-5xx-anywhere`, `no-transport-error` | agregat: nol 5xx dan nol galat transport di seluruh percakapan |

Prasyarat deployment agar hijau: secret `SESSION_HMAC_KEY_CURRENT` sudah terpasang (tanpa itu
`/api/auth/anon` menjawab 500 dan `anon-200` merah — itu memang cacat deploy, bukan cacat
gerbang), `ALLOWED_ORIGINS` + `COOKIE_DOMAIN` terisi, dan migrasi D1 di
`workers/api/migrations/MIGRATIONS.md` sudah dijalankan.

## 4. Yang **tidak** diuji, dan kenapa

Gerbang ini **tidak** menguji kuota 25/26, cache TTS, maupun cron. Ketiganya menulis state nyata
di `fiezel-core`/`fiezel-stats` — menjalankannya terhadap produksi berarti menghabiskan jatah
harian murid dan mengotori tabel agregat. Buktinya tetap ada di `tests/cf-wiring-test.js` **di atas
stub**, dan itu batas kejujuran yang **masih terbuka** sampai owner menyediakan lingkungan
staging terpisah (D1 + KV + R2 sendiri). Jangan menambahkannya ke gerbang ini tanpa staging.

## 5. Menjalankan di CI

Langkah `node tests/cf-live-contract-test.js` sudah ada di `.github/workflows/quality.yml` dan **SKIP**
sampai owner menyetel base URL. Untuk mengaktifkannya, tambahkan `env:` pada step *Core
validation* (atau pecah menjadi step sendiri):

```yaml
        env:
          FIEZEL_CF_LIVE_BASE: ${{ vars.FIEZEL_CF_LIVE_BASE }}
```

Base URL Worker bukan rahasia, jadi *repository variable* cukup — `secrets` tidak perlu.

## 6. Membuktikan gerbangnya sendiri

```bash
node tests/cf-live-selftest.js
```

`tests/cf-live-selftest.js` menyalakan Worker tiruan di `127.0.0.1` (port dipilih kernel) dan
menjalankan gerbang terhadap 21 skenario: satu jawaban benar (harus LULUS) dan 20 jawaban salah
(harus GAGAL, **pada id assert yang tepat** — bukan sekadar exit 1). Ia juga membuktikan SKIP
bersih tanpa env dan MERAH untuk base URL yang tidak sah. Jalankan ini setiap kali assert di
gerbang live diubah; kalau tidak, tidak ada yang tahu gerbangnya masih bisa merah.
