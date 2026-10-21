# m025-492 — Sinyal Kartu Pembaruan: Build Halaman, Bukan `VERSION.json` yang Beku

## 1. Ringkasan Temuan & Alasan Perubahan

### Gejala

Kartu **"Versi baru FIEZEL tersedia"** (`#updateBanner`) dan tombol **"Cek Pembaruan"** di
Pengaturan bisa mengatakan *"Aplikasi sudah versi terbaru"* padahal server sudah menyajikan
build lebih baru. Pada PWA yang **sudah terpasang**, build baru berhenti sampai tanpa satu
pun tanda di layar.

### Diagnosis empiris (bukan asumsi)

`features/ui/fiezel-update-prompt.js` menentukan "ada versi lebih baru?" dengan:

1. mengambil `./VERSION.json`, lalu
2. `isNewerVersion(remote, APP_VERSION)`.

`VERSION.json` berisi versi **semver pedagogi** (`5.19.0`) yang hanya berubah saat konten
berubah. Di produksi berkas itu **tidak pernah ditulis ulang**: `content-adoption.js:84`
adalah satu-satunya penulisnya, dan tujuannya adalah direktori **staging**, bukan
`public_html/app`. Bukti:

```
$ node -e "fetch VERSION.json produksi"      -> {"version":"5.19.0"}
$ node -e "fetch core-config.js produksi"    -> FIEZEL_PAGE_BUILD='m025-491'
$ node -e "fetch BUILD-VERSION.json produksi"-> {"version":"m025-491"}
```

Karena `VERSION.json` beku dan sama dengan `APP_VERSION` murid, `isNewerVersion()` selalu
`false`, sehingga **satu-satunya** jalan kartu muncul adalah cabang `reg.waiting`. Saat tidak
ada service worker yang benar-benar menunggu (kasus umum karena update diambil terlalu dini,
atau karena sinyal remote tidak terbaca), kartu tidak pernah tampil dan `check()` menjawab
`false` — persis jawaban yang membuat tombol manual berbohong.

### Akar masalah

Penanda yang dipakai sebagai sinyal **tidak maju setiap rilis**. Yang benar-benar maju
adalah **nomor build halaman `m025-N`**, dan ia sudah tersedia di dua tempat yang
se-ruang sehingga bisa dibandingkan tanpa menyentuh apa pun.

## 2. Solusi Perbaikan

### 2a. `features/ui/fiezel-update-prompt.js` — sinyal utama = build halaman

- `APP_BUILD = self.FIEZEL_PAGE_BUILD` (dari `core-config.js`, di-precache) dibandingkan
  dengan `coordination/BUILD-VERSION.json` yang **live**.
- `parseBuild()` mengubah `m025-491` menjadi bilangan bulat, sehingga `m025-1000` benar
  dinilai lebih baru daripada `m025-999` (perbandingan string akan salah).
- `VERSION.json` **tetap** dibaca sebagai pensinyal **cadangan**. Bila semver benar-benar
  maju, perilaku kartu identik seperti sebelumnya. Versi semver tidak dibuat menyerupai
  build — keduanya tidak pernah dibandingkan silang, dan nama cache neural
  `fiezel-v${FIEZEL_VERSION}` tidak tersentuh.
- **Jaring pengaman (failsafe)**: bila ada kandidat service worker (`reg.waiting` /
  `reg.installing`) tetapi sinyal remote tidak terbaca (luring, `BUILD-VERSION.json`
  tak terjangkau), kartu **tetap** muncul. Membandingkan penanda remote dengan penanda
  **lokal** yang basi adalah tepat bug yang membuat PWA terpasang membeku.
- Jaring pengaman terakhir: revisi shell worker aktif (`FIEZEL_HEALTH_PING`) dibandingkan
  dengan build halaman — bukti langsung tanpa jaringan.
- Jalur muat ulang tetap **satu** dan dijaga penanda persetujuan murid (tidak berubah).

### 2b. `sw.js` — penanda build live wajib jaringan-dulu

Jalur aset cangkang bersifat **cache-first + `ignoreSearch:true`**. Tanpa cabang khusus,
`coordination/BUILD-VERSION.json` akan **dibekukan** di `SHELL_CACHE` generasi lama dan
pemeriksa pembaruan membaca ajakan basi **selamanya** — mengembalikan bug yang baru saja
ditutup. Cabang baru:

- selalu menempuh **jaringan**;
- **tidak** menulis salinan ke cache mana pun;
- luring menjawab **503**, bukan nilai basi — sehingga modul memperlakukannya sebagai
  "sinyal tidak ada" dan jatuh ke jaring pengaman kandidat-worker (yang benar saat luring).

### 2c. Perkakas

- `tools/dev/check-live-update-path.js` kini mencetak & membandingkan
  `coordination/BUILD-VERSION.json` + `core-config.js` (dulu hanya `VERSION.json`).

## 3. Bukti Verifikasi Empiris

| Pengujian / Probe | Perintah | Hasil |
|---|---|---|
| **Probe peramban Playwright (wajib)** | `node tools/dev/probe-update-card.js` | **PROBE PASS** |
| Gerbang sinyal kartu (sandbox, vm) | `node tests/update-prompt-signal-test.js` | PASS (7/7) |
| Gerbang bentuk kartu (regresi) | `node tests/update-prompt-test.js` | PASS (12/12) |
| Freshness penanda build (SW vm) | `node tests/sw-build-marker-freshness-test.js` | PASS |
| PWA cache | `node tests/pwa-cache-test.js` | PASS |
| PWA release coherence | `node tests/pwa-release-coherence-test.js` | PASS |
| SW navigasi shell-first | `node tests/sw-nav-shell-first-test.js` | PASS (17/17) |
| Precache covers shell | `node tests/precache-covers-shell-test.js` | PASS (5/5) |
| Install health | `node tests/install-health-test.js` | PASS |
| Koordinasi build | `node tests/coordination-guard-test.js` | PASS (24/24) |
| Keunikan nomor build | `node tests/build-number-uniqueness-test.js` | PASS |
| Golden snapshot ID | `node tests/id-golden-snapshot-test.js` | PASS |
| Kebocoran UI Thai | `node tests/th-ui-leak-test.js` | PASS |
| Versi cache kurikulum | `node tests/curriculum-cache-version-test.js` | PASS (build m025-492) |
| Registri gerbang | `node tests/gate-registry-test.js` | PASS (10 pass, 0 fail) |
| Audit rilis | `node tests/release-audit-gate-test.js` | PASS (0 blocker) |

### Detail probe peramban (bukti dua arah)

`node tools/dev/probe-update-card.js` memuat `index.html` sungguhan di Chromium, memalsukan
`core-config.js` (build halaman) dan menyajikan `coordination/BUILD-VERSION.json` dari
server uji, dengan `VERSION.json` **beku `5.19.0` di KEDUA sisi** — persis produksi.

```json
"konteks1_perangkatLama": {
  "pageBuild": "m025-491", "liveBuild": "m025-492", "hasilCheck": true,
  "banner": { "visible": true, "opacity": "1", "display": "flex", "width": 390, "height": 245,
              "versionText": "Versi m025-492 · kamu sekarang memakai m025-491" }
},
"konteks2_perangkatMutakhir": {
  "pageBuild": "m025-492", "liveBuild": "m025-492", "hasilCheck": false,
  "banner": { "visible": false, "opacity": "0", "display": "none", "width": 0, "height": 0 }
},
"P1_kartu_muncul_saat_build_live_baru": true,
"P2_kartu_senyap_saat_sudah_mutakhir": true
```

Karena `VERSION.json` identik di kedua konteks, perbedaan hasil **hanya** dapat berasal dari
sinyal build halaman yang baru. Tangkapan layar:
`.audit-tmp/probe-m025-492-perangkat-lama.png` (kartu tampak) dan
`.audit-tmp/probe-m025-492-perangkat-mutakhir.png` (senyap).

> Catatan: `tools/dev/serve-static.js` adalah server statis uji minimal (tanpa dependensi)
> yang ditambahkan bersama probe ini, agar probe dapat memuat halaman repo langsung.

## 4. Berkas yang Berubah

| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-update-prompt.js` | Sinyal utama build halaman; `parseBuild`/`isNewerBuild`/`newerKind`; `fetchRemoteVersion` mengambil dua berkas; jaring pengaman kandidat-worker + revisi shell; label versi kartu memakai build |
| `sw.js` | Cabang `coordination/BUILD-VERSION.json`: jaringan-dulu, tanpa salinan cache, luring 503. `SW_REV` -> `m025-492` (arbiter) |
| `core-config.js` | `FIEZEL_PAGE_BUILD` -> `m025-492` (arbiter) |
| `features/neural-voice/fiezel-diag-panel.js` | `DIAG_BUILD` -> `m025-492` (arbiter) |
| `kurikulum.html`, `misi.html` | `?v=` -> `m025-492` (arbiter) |
| `coordination/BUILD-VERSION.json` | `version` -> `m025-492` + alasan klaim |
| `.github/workflows/quality.yml` | Daftarkan `tests/sw-build-marker-freshness-test.js` dan `tests/update-prompt-signal-test.js` |
| `tools/dev/check-live-update-path.js` | Cetak/bandingkan penanda build live |
| `tools/dev/serve-static.js` (baru) | Server statis uji untuk probe |
| `tools/dev/probe-update-card.js` (baru) | Probe Playwright bukti dua arah |
| `tests/update-prompt-signal-test.js` (baru) | Gerbang sinyal (sandbox vm), 7 asersi |
| `tests/sw-build-marker-freshness-test.js` (baru) | Gerbang freshness penanda build, 3 ciri |

## 5. Status Gerbang & Catatan Utang Teknis

- Sepuluh gerbang lokal wajib **HIJAU** (bagian 3). Arbiter `node tools/bump-build.mjs
  --check` -> **Selaras** (6 titik hexa-sync).
- Kartu tetap tidak muncul di tengah pelajaran (`FiezelStage.lessonMode()`), dan muat ulang
  tetap hanya lewat tombol murid — perilaku m025-212/m025-246 tidak berubah.
- Utang: berkas draf `features/ui/fiezel-update-prompt.js` semula menulis jalan keluar
  alternatif bila `BUILD-VERSION.json` gagal — kini perilaku itu dipegang jaring pengaman
  kandidat-worker + revisi shell (diuji), bukan asumsi bahwa berkas selalu tersedia.
- Sisa: `features/speaking-listening/panggung-suara.css` dan `remotion/src/Root.jsx` sudah
  berubah sebelum sesi ini dan **tidak** disentuh; keduanya tidak termasuk rilis ini.
