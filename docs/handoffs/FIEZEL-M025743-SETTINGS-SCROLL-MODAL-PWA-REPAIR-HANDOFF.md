# FIEZEL m025-743 Handoff Dossier: Settings Modal Lux Dark Architecture, Anti-Lock Scrolling, Double Splash Elimination, and Zero-Gap PWA Repairs

## 1. Executive Summary & Root Cause Analysis
Berdasarkan investigasi empiris video rekaman iPhone PWA (`rekaman 1.mp4`, `rekaman 2.mp4`) serta 7 titik tangkapan layar visual (`capture 2.jpeg`, `early_025.jpg`, `rest_014.jpg`, `early_016.jpg`, `rest_016.jpg`, `seq_025.jpg`, `end_015.jpg`), ditemukan lima anomali kritis pada antarmuka murid:
1. **Settings Modal Scrolling Jam / Lock ("scrolling macet")**:
   - **Akar Masalah**: Pada `style.css:8421-8423`, `#modalPanel` dipasangi `touch-action: pan-y !important` dan `overscroll-behavior-y: contain !important` di dalam container fixed/grid tanpa penguncian scroll pada `body`. Pada iOS Safari WebKit, kombinasi ini memicu deadlock arbitrasi gestur sentuh (touch gesture collision) antara viewport latar belakang dan container modal. Akibatnya, sentuhan jari membeku dan modal tidak bisa digulir naik-turun.
2. **Floating Action Bar & White Card Invariant Breach ("bottombar nya yang floating", "kartu pengaturan kesalahan bug terbesar")**:
   - **Akar Masalah**: `.modal-actions.settings-actions` memiliki `position: sticky; bottom: 0; z-index: 6;` dengan warna dasar `--glass-solid: rgba(255, 253, 248, .98)` (putih krem). Di dalam `#modalPanel` yang memiliki padding, footer ini mengambang canggung di tengah teks dengan celah di kiri-kanan, menutupi kartu pengaturan dan menangkap sentuhan gestur sehingga murid tidak bisa menggulir. Selain itu, selector `html body:not(.fz-teacher-mode) .card` di `fiezel-vivid.css:169` memaksakan `background: #FFFFFF !important` pada kartu-kartu di dalam fold pengaturan (seperti kartu `Akun FIEZEL` dan `Penyimpanan`), menciptakan benturan visual yang sangat kontras di atas modal gelap.
3. **Double Splash Layer & Bottom Bar White Flicker**:
   - **Akar Masalah**: Di `app.js:8304`, fungsi `openApp()` memanggil `showBrandSplash()` kedua kalinya setelah splash frame-pertama dari HTML statis (`#fiezelBootSplash`) telah berjalan, menciptakan efek tumpukan ganda (double-layer). Selain itu, `.bottomnav` belum disembunyikan saat fase boot awal (`html.fz-booting`), menyebabkan kilatan putih sekilas di bawah layar sebelum tema gelap aktif.
4. **Header Collision pada Modal "Pilih Ritme Belajarmu"**:
   - **Akar Masalah**: Di `features/grammar/grammar-vocab-bridge.js:750`, tombol silang (`.modal-close-icon`) diletakkan dengan `position: absolute; top: 10px; right: 10px;` di baris yang sama dengan judul `<h2>` bertaraf `font-size: 1.7rem` dengan padding horizontal terbatas. Pada layar ponsel sempit (390px), lingkaran tombol silang bertabrakan langsung dengan huruf terakhir judul ("Belajarmu").
5. **Profile Subtabs Latency & Text Truncation (`...gkat`)**:
   - **Akar Masalah**: Papan peringkat dan pertemanan menjalankan tiga request jaringan berurutan secara sekuensial tanpa kerangka pemuat instan, serta tab `Papan Peringkat` tidak memiliki `min-width: 0; flex: 1 1 0;` sehingga terpotong elipsis di tepi kanan layar.

---

## 2. Empirical Verification & Evidence
Pengujian empiris dilakukan menggunakan Chromium Playwright headless pada konfigurasi iPhone 15 nyata (viewport 390x844, DPR 2.0, touch enabled) melalui runner resmi `tools/dev/verify-settings-and-pwa-audit-probe.mjs`:
- **Test 1: Rhythm Modal Header Collision**:
  - `verticalGap: 20px`, `overlaps: false` — **PASS (100% Bebas Tabrakan)**.
  - Artefak visual: `audit-rhythm-modal.png`.
- **Test 2: Settings Modal Lux Dark Architecture**:
  - `isModalOpen: true`, `isBodyLocked: true`, `isNavHidden: true`.
  - `actionsBg: 'rgb(22, 22, 34)'`, `actionsPos: 'relative'`, `cardBg: 'rgb(30, 30, 44)'`.
  - Artefak visual: `audit-settings-top.png`.
- **Test 3: Settings Modal Fluid Scrolling**:
  - `initialScroll: 0`, `finalScroll: 350`, `scrolled: true` — **PASS (Scroll lancar tanpa macet)**.
  - Artefak visual: `audit-settings-scrolled.png`.
- **Test 4: Progress View Integrity**:
  - `hasProgressCard: true`, `hasError: false` — **PASS (Bebas error runtime)**.
  - Artefak visual: `audit-progress-view.png`.
- **Test 5: Profile Subtabs Rendering**:
  - `scrollWidth: 148px`, `clientWidth: 148px`, `isClipped: false`, `text: 'Papan Peringkat'` — **PASS (Teks utuh)**.
  - Artefak visual: `audit-profile-papan.png`.

---

## 3. Berkas yang Dimodifikasi
1. `app.js`:
   - Menghapus panggilan splash ganda di `openApp()`.
   - Mengunci `html` dan `body` dengan kelas `.fz-modal-open` saat modal terbuka di `openModal()`, dan membersihkannya di `closeModalNow()`.
   - Menata ulang arsitektur `openSettings()` ke dalam komponen terstruktur `.settings-modal-wrapper`: `.settings-head` (dengan tombol silang mandiri), `.settings-scroll-body` (khusus scrolling), dan footer aksi `.modal-actions.settings-actions`.
   - Memasang jaring pengaman defensif di `progress()`.
2. `style.css`:
   - Menghapus aturan `touch-action: pan-y` dan `overscroll-behavior-y: contain` yang menyebabkan deadlock di modal.
   - Mengubah `.modal-actions.settings-actions` dari `position: sticky; bottom: 0` menjadi flex footer `position: relative` bertema gelap `#161622` dengan `border-top: 1px solid rgba(255,255,255,0.1)`.
   - Menyembunyikan `.bottomnav` secara mutlak saat modal terbuka (`html.fz-modal-open .bottomnav`).
   - Menerapkan pewarnaan kartu gelap `#1E1E2C` dan tipografi kontras tinggi pada seluruh isi lipatan pengaturan.
3. `features/ui/fiezel-vivid.css`:
   - Mengecualikan kartu modal dan lipatan pengaturan (`:not(.modal-panel *):not(#modalPanel *):not(.settings-fold *)`) dari aturan pemaksaan kartu putih `html body:not(.fz-teacher-mode) .card`.
   - Menegaskan pewarnaan kartu modal gelap `#1E1E2C` berdaya spesifisitas tinggi.
4. `features/brand/fiezel-splash.js`:
   - Memasang mutex guard `target.__fiezelSplashActive` untuk menjamin tidak ada dua splash layer yang aktif bersamaan.
5. `features/grammar/grammar-vocab-bridge.js`:
   - Memisahkan baris tombol tutup modal `Pilih Ritme Belajarmu` ke dalam header bar atas tersendiri, mencegah benturan geometri dengan judul `h2`.
6. `index.html`:
   - Mengunci aturan CSS kritis boot agar `.bottomnav` tersembunyi total selama status `html.fz-booting`.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`:
   - Bump versi build kanonikal dari `m025-742` ke `m025-743` (Hexa-Sync / Octa-Sync compliant).

---

## 4. Status Gerbang Mutu
- `node tests/splash-first-paint-test.js` : **PASS (32/32 tests)**
- `node tests/id-golden-snapshot-test.js`  : **PASS (100% Identik)**
- `node tests/th-ui-leak-test.js`         : **PASS (0 kebocoran)**
- `node tests/curriculum-cache-version-test.js` : **PASS (m025-743)**
- `node tests/gate-registry-test.js`      : **PASS (10/10)**
- `node tools/bump-build.mjs --check`     : **PASS (Selaras)**
- `tools/dev/verify-settings-and-pwa-audit-probe.mjs` : **PASS (5/5 Audit Gates)**
