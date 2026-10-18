# FIEZEL Handoff: Native Android Shell & Eliminasi Total Layar Putih Boot / Reload (m025-598)

## 1. Ringkasan Eksekutif & Alasan Perubahan
1. **Rilis Native Android Shell & Distribusi APK**:
   - Memenuhi kebutuhan pengguna untuk instalasi aplikasi FIEZEL di Android sebagai aplikasi native murni (.apk) dengan integrasi penuh WebAssembly, Web Audio Worklet, dan proctoring kamera/mikrofon.
   - Pintu gerbang keamanan workflow `build-android-apk.yml` diperkuat dengan job-level actor gate `if: github.actor == 'FIEZEL-APPS'` untuk mematuhi standar keamanan kredensial.
   - Tautan unduh APK dan panduan resmi terintegrasi di `website/install/index.html` dan `website/index.html`.

2. **Eliminasi Total Layar Putih & Hang pada Boot / Warm Reload**:
   - Menjawab keluhan pengguna: *"coba cek, kenapa seluruh layar putih, aku tidak mau seperti ini, hilangkan sepenuhnya bug ini"* dan *"audit lagi, aku tidak ingin layar putih itu masih ada, hilangkan total layar putih atau hang itu"*.
   - **Akar Masalah #1**: Premature inline fast-bypass di `index.html` (baris 508–522) yang memaksa `#fiezelBootSplash` disembunyikan (`display: none`) di frame pertama sebelum skrip dan `#app` sempat dirender.
   - **Akar Masalah #2**: Pemanggilan `dismissBootSplash()` secara sinkron di `app.js` dan `features/brand/fiezel-splash.js` ketika `seenToday()` bernilai true, padahal `proceed()` masih menunggu `bootAuthVerdictPromise` (hingga 1500 ms).
   - **Solusi**: Mencabut paksaan bypass frame-pertama di `index.html`, menambahkan opsi `deferDispose: true` pada `fiezel-splash.js`, serta mengalihkan kewenangan pelepasan tirai splash sepenuhnya ke `openApp()` dan `showAuthGate()` setelah `#app` berhasil dirender ke DOM.

---

## 2. Bukti Pengujian Empiris Nyata (Sebelum vs Sesudah)

Pengujian empiris Playwright headless Chromium (`tools/dev/probe-test-hang.mjs`):
- **Sebelum Perbaikan**:
  - First Splash Hidden: t = 230 ms (splashVisible = false, appChildren = 0)
  - First App Rendered: t = 2489 ms (splashVisible = false, appChildren = 1)
  - **Durasi Layar Putih Kosong**: **2.259 ms** (>2 detik pengguna disajikan kanvas kosong!)
- **Sesudah Perbaikan**:
  - First Splash Hidden: t = 4076 ms (splashVisible = false, appChildren = 1)
  - First App Rendered: t = 4076 ms (splashVisible = false, appChildren = 1)
  - **Durasi Layar Putih Kosong**: **PERSIS 0 ms** (Zero blank screen! Transisi atomik dan mulus langsung ke antarmuka Home).

---

## 3. Status Gerbang Mutu Lokal & Build Arbiter
- `node tests/id-golden-snapshot-test.js` -> **PASS (100% Hijau)**
- `node tests/th-ui-leak-test.js` -> **PASS (4.377 kunci id punya padanan th)**
- `node tests/curriculum-cache-version-test.js` -> **PASS (m025-598)**
- `node tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail)**
- `node tests/splash-first-paint-test.js` -> **PASS (32/32)**
- `node tests/splash-choreography-test.js` -> **PASS (28/28)**
- `node tests/boot-order-test.js` -> **PASS**
- `node tests/boot-auth-verdict-test.js` -> **PASS (5/5)**
- `node tests/workflow-actor-gate-test.js` -> **PASS (gate di baris 33)**
- `node tests/build-number-uniqueness-test.js` -> **PASS (m025-598 belum pernah diklaim)**
- `node tools/bump-build.mjs --check` -> **PASS (Hexa-Sync Selaras m025-598)**

---

## 4. Daftar Berkas yang Disentuh
1. `index.html`: Pencabutan premature fast bypass tirai splash pada warm reload.
2. `features/brand/fiezel-splash.js`: Penambahan dukungan `opts.deferDispose`.
3. `app.js`: Pengiriman `deferDispose: hasHandoff` dan perlindungan handoff tirai splash hingga `render()`.
4. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Kenaikan nomor build m025-598 terkoordinasi.
5. `.github/workflows/build-android-apk.yml`: Penambahan penjaga aktor tingkat job `if: github.actor == 'FIEZEL-APPS'`.
6. `docs/handoffs/FIEZEL-M025598-ANDROID-SHELL-DAN-ELIMINASI-LAYAR-PUTIH-HANDOFF.md`: Dokumen serah terima resmi.
