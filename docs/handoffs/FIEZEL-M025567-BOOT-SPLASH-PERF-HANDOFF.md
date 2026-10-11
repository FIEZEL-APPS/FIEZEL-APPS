# FIEZEL Handoff Dossier — m025-567: Perbaikan Performa Boot & Animasi Splash PWA (PR #595)

**Tanggal**: 2026-10-12  
**Versi Build**: `m025-567`  
**PR**: `#595` (`claude/pensive-brahmagupta-zp9fy3`)  
**Laporan Audit Rujukan**: `reports/AUDIT-PERFORMA-BOOT-SPLASH-2026-10-11.md`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan laporan audit performa boot & splash PWA (`reports/AUDIT-PERFORMA-BOOT-SPLASH-2026-10-11.md`) dan pengukuran empiris memakai `tools/dev/probe-boot-splash-perf.js`, ditemukan lima akar masalah utama yang membuat pembukaan PWA di Android/iPhone terasa berat dan animasi splash patah-patah:

1. **Bug Watchdog 15 Detik & Splash Ganda di Jaringan Lambat (P0)**:
   - Di `index.html`, pewaktu watchdog 15 detik memanggil `showRecovery(); dismiss();`, sementara `dismiss()` langsung memanggil `clearRecovery()` yang menghapus kartu pemulihan di baris yang sama.
   - Selain itu, ketika `load()` akhirnya selesai sesudah 15 detik, `FiezelSplash.show()` tidak menemukan `#fiezelBootSplash` (karena sudah dilepas watchdog) dan membuat elemen splash kedua yang memutar ulang koreografi 3.560 ms dari awal.
2. **Layar Splash Kosong Selama Fase Boot sebelum JS Mengambil Alih (P0)**:
   - Di `index.html`, `.fz-fgroup`, `.fz-barsgroup`, dan `.fiezel-splash-word` diatur `opacity: 0` dan baru diungkap saat `FiezelSplash.show()` berjalan di ujung `load()`, sehingga pengguna menatap latar gelap kosong selama 3,4–5,6 detik.
3. **Fetch JSON Ganda & Fetch Non-Boot Eager Saat Evaluasi Skrip (P0)**:
   - Tiga berkas JSON diunduh serta diurai dua kali saat boot: `grammar-templates.json` (2,1 MB, diunduh ulang oleh `fiezel-nujum.js`), `content/grammar-vocab-map-v1.json` (`grammar-vocab-bridge.js`), dan `content/video-grammar-bank-v1.json` (`app.js:13568`).
   - Tiga berkas JSON fitur spesifik (`bug-species.json`, `misconception-taxonomy-v1.json` di `fiezel-bug.js`, serta `jlpt-listening-bank-v1.json` di `fiezel-jlpt-listening.js`) diunduh di tengah proses boot sebelum splash selesai.
4. **Render Beranda Prematur di Balik Splash (P0)**:
   - Panggilan `.then()` dari `grammar-vocab-bridge.js` (`window.drawTopScreen()`) dan `fiezel-bug.js` (`call('renderInner')`) memicu `render()` beranda penuh dua kali (total ~859 ms Long Tasks) selagi layar splash masih menutupi viewport.
5. **Titik Panas Main-Thread Saat Animasi Splash & Mount Maskot (P1)**:
   - `features/mascot/fiezel-mascot.js` menyetel `this._state = "idle"` lalu memanggil `this.setState("idle")` di `connectedCallback()`, sehingga `reenter === true` dan memicu `_restartAnimations()` → `this.getAnimations({ subtree: true })` (147,2 ms style recalculation).
   - `detectedTimeZone()` di `app.js` menginstansiasi `Intl.DateTimeFormat()` berulang kali tanpa memo (90,6 ms).
   - `resetOverlay()` di `features/brand/fiezel-splash-pawstamp.js` memanggil `void o.offsetHeight` pada pemutaran pertama (64 ms forced synchronous layout).
   - `features/brand/fiezel-splash-particles.js` tetap membangun sprite + target partikel (`makeSprites()` + `build()`) walau splash diadopsi sesudah `T.DONE` (1.320 ms) dan memanggil `ctx.clearRect()` di setiap frame sesudah `T.DONE`.
   - `fiezel-lazy-loader.js` memulai gelombang 18 skrip lazy saat `#fiezelBootSplash` masih menjalankan animasi keluar `is-leaving` (320 ms).

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe — Sebelum vs Sesudah)

Pengukuran dilakukan dengan skrip probe `node tools/dev/probe-boot-splash-perf.js` (Chromium headless, emulasi viewport mobile `412x915`, DPR 2.625, CDP CPU throttling `4x` dan `6x`, serta `cold 4 slow4g`):

| Skenario & Metrik | Sebelum (`m025-564`) | Sesudah (`m025-567`) | Delta |
|---|---:|---:|---:|
| **Warm, CPU 4x**: FCP | 864 ms | **320 ms** | **-63%** |
| **Warm, CPU 4x**: `dcl` (`DOMContentLoaded`) | 2.812 ms | **2.583 ms** | **-229 ms** |
| **Warm, CPU 4x**: `splashShow` | 4.274 ms | **3.538 ms** | **-736 ms** |
| **Warm, CPU 4x**: `splashGone` (total waktu splash) | 5.320 ms | **4.533 ms** | **-787 ms** |
| **Warm, CPU 4x**: Long task selama boot (`staticSplash.longtaskMs`) | 1.863 ms | **1.004 ms** | **-46%** |
| **Warm, CPU 4x**: Long task tunggal terpanjang | 429 ms | **143 ms** | **-67%** |
| **Warm, CPU 4x**: FPS selama boot (`staticSplash.fps`) | 24,2 fps | **37,3 fps** | **+54%** |
| **Warm, CPU 4x**: FPS animasi cap PAW (`animation.fps`) | 25,7 fps | **36,0 fps** | **+40%** |
| **Warm, CPU 4x**: Waktu beku animasi (`animation.frozenMs`) | 384 ms | **200 ms** | **-48%** |
| **Warm, CPU 6x**: `splashShow` | 5.654 ms | **2.640 ms** | **-53%** |
| **Warm, CPU 6x**: `splashGone` (total waktu splash) | 6.846 ms | **3.699 ms** | **-46%** |
| **Warm, CPU 6x**: Long task selama boot (`staticSplash.longtaskMs`) | 2.752 ms | **648 ms** | **-76%** |
| **Warm**: Jumlah fetch JSON saat boot | 17 (3 duplikat) | **11 (0 duplikat)** | **-6 fetch** |
| **Cold, CPU 4x + Slow 4G**: Bug `secondSplash` (>15 dtk) | Muncul di 25.356 ms | **0 (Teratasi)** | **100% hilang** |

---

## 3. Daftar Seluruh Berkas yang Disentuh

1. `index.html` — Menambahkan CSS containment (`contain: layout style paint` pada `#fiezelBootSplash`, `content-visibility: hidden; contain: strict` pada `html.fz-booting main.app, html.fz-booting #globalSky`), animasi compositor `fz-fade-in` frame pertama untuk `.fz-fgroup`, `.fz-barsgroup`, dan `.fiezel-splash-word`, serta memperbaiki bug `showRecovery()` + `dismiss()` dan penanda `__fiezelBootWatchdogFired` pada watchdog 15 detik.
2. `features/brand/fiezel-splash.js` — Menangani `__fiezelBootWatchdogFired` di `show()` agar tidak memutar splash kedua sesudah 15 detik, menyetel `__fiezelBootSplashDismissed` + event `fiezel:splash-dismissed` di `disposeBootSplash()`, menyinkronkan opasitas awal `adoptedRevealed` di `startMotion()`, dan meneruskan `skipBuild` ke `particles.init` saat `startOffset >= T.DONE`.
3. `features/brand/fiezel-splash-particles.js` — Mendukung `opts.skipBuild` di `init()` dan menghentikan panggilan `ctx.clearRect()` berulang di setiap frame sesudah `t >= T.DONE`.
4. `features/brand/fiezel-splash-pawstamp.js` — Hanya menjalankan `void o.offsetHeight` di `resetOverlay()` saat replay (`wasPlaying`).
5. `features/grammar/grammar-vocab-bridge.js` — Menghindari fetch ganda `content/grammar-vocab-map-v1.json` di peramban saat evaluasi skrip dan menjaga `window.drawTopScreen()` agar hanya dipanggil sesudah splash ditutup.
6. `features/nujum/fiezel-nujum.js` — Memakai kembali `root.__grammarTemplatesCache` dari `app.js` `load()` dan menghapus `loadGrammarTemplatesAsync()` eager saat evaluasi skrip.
7. `features/bug/fiezel-bug.js` — Menunda `load()` sampai `homeMarkup()` / `view()` dipanggil dan menjaga `renderInner` dengan `root.__fiezelBootSplashDismissed`.
8. `features/speaking-listening/fiezel-jlpt-listening.js` — Menunda prefetch bank JLPT sampai `fiezel:splash-dismissed` dan hanya ketika kursus aktif adalah `'ja'`.
9. `features/mascot/fiezel-mascot.js`, `website/assets/mascot/fiezel-mascot.js`, & `assets/brand/mascot-checksums.json` — Menginisialisasi `this._state = ""` sebelum `this.setState("idle")` di `connectedCallback()` agar mount pertama tidak memicu `_restartAnimations()` / `getAnimations({subtree:true})`, serta memperbarui kembar & manifest E5 lewat `node tools/export-mascot.mjs`.
10. `fiezel-lazy-loader.js` — Menahan peluncuran gelombang skrip lazy sampai elemen `#fiezelBootSplash` benar-benar lepas dari DOM.
11. `app.js` — Mememoisasi `detectedTimeZone()`, mengisi `self.__grammarTemplatesCache` di `load()`, menghapus fetch browser duplikat `content/video-grammar-bank-v1.json` di tingkat atas, dan menjaga `drawTopScreen()` serta `repaintQuietly()` selama boot splash masih aktif sebelum `openApp()`.
12. `reports/AUDIT-PERFORMA-BOOT-SPLASH-2026-10-11.md` — Menambahkan §7 berisi rincian realisasi perbaikan dan tabel perbandingan metrik empiris sebelum vs sesudah.
13. `id-golden-baseline.json`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` — Sinkronisasi baseline snapshot dan kenaikan versi build resmi ke `m025-567`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal & Catatan Utang Teknis

- **Gerbang Mutu Lokal**:
  - `node tools/bump-build.mjs --check` → **PASS (`Selaras` 6 titik: `m025-567`)**
  - `node tests/splash-first-paint-test.js` → **PASS**
  - `node tests/splash-choreography-test.js` → **PASS**
  - `node tests/boot-first-paint-nonblocking-test.js` → **PASS (13/13)**
  - `node tests/boot-order-test.js` → **PASS**
  - `node tests/e5-checksum-gate-test.js` → **PASS**
  - `node tests/paw-mascot-test.js` → **PASS**
  - `node tests/auth-screen-test.js` → **PASS (11/11)**
  - `node tests/teacher-instant-boot-test.js` → **PASS (6/6)**
  - `node tests/back-nav-test.js` → **PASS**
  - `node tests/id-golden-snapshot-test.js` → **PASS**
  - `node tests/th-ui-leak-test.js` → **PASS**
  - `node tests/curriculum-cache-version-test.js` → **PASS**
  - `node tests/gate-registry-test.js` → **PASS (10/10)**
- **Catatan Utang Teknis (Tindak Lanjut P1 Arsitektural)**:
  - Pemisahan precache Service Worker berbasis hash per berkas (agar kenaikan `SW_REV` tidak mengunduh ulang seluruh ~26 MB precache sekaligus) dan pemecahan `app.js` / bank JSON per level tetap menjadi agenda struktural fase berikutnya.
