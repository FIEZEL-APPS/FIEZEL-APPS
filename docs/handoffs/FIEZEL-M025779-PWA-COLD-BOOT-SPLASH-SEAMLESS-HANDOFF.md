# FIEZEL Handoff Dossier — `m025-779`: Eliminasi Cold-Boot CSS Blocking, Glitch Putih Bottom-Bar, & Layar Putih Kotak-Kotak 4,8 Detik Pasca-Splash

- **Build**: `m025-779`
- **Otoritas**: `OWNER` / `MASTER`
- **Status**: `READY FOR MERGE` (100% Lulus Gerbang Lokal & Probe Empiris Playwright + V8 CPU Profiler)
- **Cakupan Terproteksi**: `[ALLOW-PROTECTED: pwa, auth]` (sesuai permintaan eksplisit OWNER atas rekaman video cold-boot iOS Standalone PWA `"WhatsApp Video 2026-11-08 at 06.06.07.mp4"`)

---

## 1. Ringkasan Temuan Forensik Video & 4 Akar Masalah Nyata

Berdasarkan bedah frame-demi-frame video rekaman layar OWNER (`384×832`, 30 fps) serta pembuktian empiris peramban headless Chromium Playwright dan V8 CDP CPU Profiler:

1. **Detik `01.50 – 03.46` (~1,96 detik layar gelap tertahan sebelum splash tampil)**
   - **Akar Masalah**: Walaupun `style.css` sudah dibuat non-blocking pada `m025-199`, terdapat **21 tag `<link rel="stylesheet" href="...">` sinkron** (~1,2 MB tak terkompresi, termasuk `fiezel-tactile-clay.css` 350 KB dan `mobile-edge-fit.css` 220 KB) yang ditambahkan di bawahnya di `<head>` `index.html`. Browser menahan First Contentful Paint (`#fiezelBootSplash`) sampai ke-21 berkas CSS selesai diunduh dan diurai, serta `bootFiezel()` menahan `load()` selama hingga `2.000 ms` menunggu `maybeAutoDetectLocale()` (`ipwho.is`).
   - **Perbaikan**: Seluruh 21 `<link rel="stylesheet">` diubah menjadi pemuatan non-blocking terurut (`media="print" data-fz-shell-css onload="this.onload=null;this.media='all';this.dataset.fzShellReady='1'"` + fallback `<noscript>` + preload prioritas untuk lembar kritis), `shellCssSettled()` di `app.js` memverifikasi kesiapan `link[data-fz-shell-css]`, dan `maybeAutoDetectLocale()` diparalelkan bersama `load()` dengan batas race `600 ms`.

2. **Detik `03.89 – 03.93` (~40 ms kilatan pita kotak putih 24px di area bottom-bar `y=791..815`)**
   - **Akar Masalah**: `#fiezelBootSplash` di `<style id="fiezelBootCritical">` memakai `contain: layout style paint` dengan batas dinamis `top: calc(-1 * env(safe-area-inset-top, 0px))` / `bottom: calc(-1 * env(safe-area-inset-bottom, 0px))` dan hanya mengunci `background-color: #1B1418 !important` sementara `.fiezel-splash` di `style.css` mendefinisikan `--fz-bg: #FBF7F3; background: var(--fz-bg)`. Saat iOS WebKit menerapkan geometri safe-area / `style.css` ~430 ms sesudah FCP, layer `contain: paint` bergeser 1 frame sebelum dicat ulang sehingga membocorkan pita `#FBF7F3` (`#fcfaf4`) setinggi `24px` di bagian bawah.
   - **Perbaikan**: Menghapus `contain: layout style paint`, menggantinya dengan overscan vertikal penuh `top: -120px !important; bottom: -120px !important; padding-top: 120px !important; padding-bottom: 120px !important`, mengunci `--fz-bg: #1B1418 !important` dan `background: #1B1418 !important`, serta menyembunyikan `main.app, #app, header.topbar, .nav-scrim, #globalSky` selama `html.fz-booting`.

3. **Detik `07.10 – 11.89` (~4,79 detik layar putih kosong dengan "bordiran kotak-kotak" sebelum Home muncul)**
   - **Akar Masalah A — Tirai Splash Jatuh Prematur**: `FiezelSplash.close()` di `features/brand/fiezel-splash.js` mengabaikan opsi `opts.deferDispose === true` dan langsung mencopot `html.fz-booting` serta memasang `.is-leaving` (`display: none !important`) tepat saat animasi pawstamp selesai (`~7,00s`), padahal `proceed()` di `app.js` masih mengembalikan `null` sambil menunggu `bootAuthVerdictPromise` (`BOOT_AUTH_WAIT_MS = 1500 ms`).
   - **Akar Masalah B — Tiga Pita Warna Kotak-Kotak (`#fcfaf4` / `#f6f4f0` / `#fcfaf4`)**: Saat tirai jatuh prematur dan `#app` masih kosong, `body` berwarna `#FBF7F3 !important` (`index.html`), `#app` berwarna `#FAF8F5` (`fiezel-tactile-clay.css`), sedangkan `header.topbar` (`y=0..99`) dan `.nav-scrim` (`y=755..831`) hanya `visibility: hidden` — menciptakan tiga kotak persegi panjang putih-krem berbeda nada.
   - **Akar Masalah C — Beku Sinkron Main Thread ~5,87–6,33 Detik di Dalam `render()` Pertama**: Profil CPU V8 (`Profiler.start`) membuktikan bahwa saat `openApp()` memanggil `render()` dan menyisipkan `<fiezel-mascot>` ke Home, `MutationObserver` mikro-tugas di `fiezel-mochi-companion.js` langsung mengeksekusi `new FiezelMochi()` -> `createCurvedFaceShellAndFx()` (`mochi-mascot/fiezel-mochi.js:2036`), yang memanggil `raycaster.intersectObject(this.mochiMesh)` sebanyak `2.806` titik × `24.576` segitiga = **`68.960.256` uji perpotongan segitiga di CPU** sebelum browser sempat mengecat satu piksel pun!
   - **Perbaikan**:
     1. `FiezelSplash.close()` kini menghormati `opts.deferDispose === true`: bila permukaan tujuan (`fz-app-open`, `.fz-auth`, atau `.fiezel-ob`) belum terpasang saat durasi splash berakhir, tirai `#fiezelBootSplash` dan `html.fz-booting` tetap ditahan mulus sampai `dismissBootSplash()` / `disposeBootSplash()` dipanggil oleh `openApp()` / `showAuthGate()` / `showOnboarding()` (dilengkapi batas pengaman `3.500 ms`).
     2. Menyatukan latar pasca-boot ke `var(--bg-canvas, #FAF8F5) !important` dan membuat `#app:empty` transparan tanpa border/shadow.
     3. Mengganti raycast brute-force `68,96 juta` uji segitiga di `createCurvedFaceShellAndFx()` dengan **indeks spasial grid 2D (`32×24`)** pada segitiga belahan depan (`z > 0`) + cache modul `_cachedFaceShellPos` / `_cachedFaceShellNorm` (`Float32Array`), memangkas waktu proyeksi dari **`~5.900 ms` menjadi `24,7 ms` (dan `< 1 ms` pada instans berikutnya)** dengan kepresisian matematis identik (`maxDeltaZ = 5,92e-8` terhadap `THREE.Raycaster`).

---

## 2. Bukti Pengujian Empiris (Sebelum vs Sesudah)

Pengujian dijalankan pada peramban Chromium headless mobile (`384×832`, DPR 2, throttled CSS/JS/JSON/API) menggunakan probe Playwright & V8 CPU Profiler:

| Metrik Empiris | Sebelum (`m025-778`) | Sesudah (`m025-779`) | Perubahan |
| :--- | :---: | :---: | :---: |
| **First Contentful Paint (`fcpMs`)** | `1.284 – 2.680 ms` | **`288 – 364 ms`** (`splash_visible_dom`: `58–116 ms`) | **~80–89% lebih cepat** |
| **Kilatan Pita Putih Bottom-Bar (`splashLeakCount`)** | Terjadi di `3,89–3,93s` (`24px`, `#fcfaf4`) | **`0 frame`** | **100% tereliminasi** |
| **Frame Putih Kosong Berkisi Kotak (`blankFrameCount`)** | `90 frame` (`1.483 ms`) + freeze `5,87–6,33s` | **`0 frame` (`0 ms`)** di seluruh 4 skenario | **100% tereliminasi** |
| **Waktu Eksekusi `createCurvedFaceShellAndFx`** | `~5.894 ms` (`68,96 juta` uji segitiga) | **`24,72 ms`** (`maxDeltaZ = 5,92e-8`) | **238× lebih cepat** |
| **Durasi `render()` Pertama (`__fiezelLastRenderMs`)** | `5.870 – 6.331 ms` | **`341 ms`** (termasuk kompilasi shader WebGL) | **18× lebih cepat** |
| **Total Waktu Siap Skenario Video (`coldReturningCachedJson`)** | `14.371 ms` | **`7.946 ms`** (langsung mulus dari Splash ke Home) | **Hemat ~6,4 detik** |

---

## 3. Daftar Berkas yang Disentuh

1. `index.html`:
   - Mengganti `contain: layout style paint` pada `#fiezelBootSplash` dengan overscan vertikal `-120px`, mengunci `--fz-bg: #1B1418 !important`, dan menyembunyikan kontainer shell selama `html.fz-booting`.
   - Mengubah 21 `<link rel="stylesheet">` di `<head>` menjadi non-blocking `media="print" data-fz-shell-css` beserta preload lembar kritis dan fallback `<noscript>`.
   - Menyatukan warna kanvas pasca-boot ke `var(--bg-canvas, #FAF8F5)` dan meniadakan latar/kotak pada `#app:empty`.
2. `features/brand/fiezel-splash.js`:
   - Menahan pencopotan tirai di `close()` saat `opts.deferDispose === true` hingga permukaan tujuan benar-benar siap (dengan pengaman `3.500 ms`), serta memastikan `disposeBootSplash()` juga melepas elemen boot splash yang telah diklaim (`shown`).
3. `app.js`:
   - Memperbarui `shellCssSettled()` agar mengecek seluruh `link[data-fz-shell-css]` dan menjalankan `maybeAutoDetectLocale()` secara paralel bersama `load()` di `bootFiezel()`.
4. `mochi-mascot/fiezel-mochi.js`:
   - Mengoptimalkan `createCurvedFaceShellAndFx()` dengan indeks spasial grid 2D `32×24` dan cache `Float32Array` tingkat modul (`_cachedFaceShellPos`, `_cachedFaceShellNorm`).
5. `tests/pwa-cold-boot-seamless-test.js` & `.github/workflows/quality.yml`:
   - Menambahkan dan mendaftarkan gerbang regresi deterministik `(G1)–(G5)` untuk menjaga seluruh invarian cold-boot dan proyeksi spasial Mochi di CI.
6. Berkas sinkronisasi versi build (`m025-779` via `tools/bump-build.mjs`):
   - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.

---

## 4. Kelulusan Gerbang Mutu Lokal & Langkah Berikutnya (Roadmap)

- **Gerbang Lokal Lulus 100%**:
  - `node tests/pwa-cold-boot-seamless-test.js` (PASS)
  - `node tests/splash-first-paint-test.js` (PASS)
  - `node tests/splash-choreography-test.js` (PASS)
  - `node tests/boot-first-paint-nonblocking-test.js` (PASS)
  - `node tests/boot-order-test.js` (PASS)
  - `node tests/boot-auth-verdict-test.js` (PASS)
  - `node tests/critical-surface-protection-test.js` (PASS)
  - `node tests/topbar-status-bar-seam-test.js` (PASS)
  - `node tests/notification-reminder-test.js` (PASS)
  - `node tests/paw-mascot-test.js` (PASS)
  - `node tests/id-golden-snapshot-test.js` (PASS)
  - `node tests/th-ui-leak-test.js` (PASS)
  - `node tests/curriculum-cache-version-test.js` (PASS)
  - `node tests/gate-registry-test.js` (PASS)
  - `node tests/precache-covers-shell-test.js` (PASS)
- **Langkah Berikutnya (Roadmap)**:
  - Pantau metrik First Contentful Paint dan waktu transisi splash pada perangkat iOS Safari Standalone setelah Service Worker `m025-779` aktif penuh di produksi (`https://fiezel.my.id/app/`).
  - Evaluasi pemisahan unduhan kamus/bank kurikulum sekunder secara malas (*on-demand per-course*) pada rilis mendatang untuk mempercepat cold-boot pertama saat cache JSON belum terisi.
