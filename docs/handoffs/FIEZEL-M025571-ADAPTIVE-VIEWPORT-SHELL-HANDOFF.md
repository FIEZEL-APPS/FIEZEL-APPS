# FIEZEL-M025571 — Adaptive Multi-Form-Factor Layout & 100dvh Fixed-Stay Viewport Shell

## 1. Ringkasan Temuan Audit & Alasan Perubahan
Pengguna mengeluhkan dua masalah struktural utama pada tampilan UI/UX PWA FIEZEL:
1. **Tampilan seragam di semua perangkat (*Stretched Mobile Container Anti-Pattern*)**:
   - Seluruh halaman dipaku pada satu kolom sempit (`max-width: 460px`–`680px`) dan bilah navigasi bawah (`nav.bottomnav`) dipaksa melintang di dasar layar dari iPhone hingga iPad dan monitor Desktop `1440px`.
2. **Banyak tampilan tidak pas layar (*Unbounded Vertical Page Scroll*)**:
   - Aturan lama di `index.html` dan CSS memaksa `html { overflow-y: auto !important }` dan `body, #app, main.app { overflow-y: visible !important }`, sehingga layar utama (*Home Cockpit*, *Latihan Hub*, *KelasKu*, *Progres*, *Profil*, dan *Quiz*) meluber hingga `1.016px`–`2.627px` (`overflowPx` mencapai `1.783px`) dan mengharuskan pengguna melakukan *scrolling* halaman.

## 2. Solusi Arsitektural yang Diterapkan
1. **Viewport-Locked `100dvh` App Shell (*Fixed-Stay Zero-Scroll Fit-to-Viewport*)**:
   - Mengunci `html:not(.fz-booting)`, `body`, dan `main.app` tepat setinggi `100dvh` (`overflow: hidden`) dengan struktur Flex/Grid bertingkat (`header.topbar` + `#app` + `nav.bottomnav`).
   - Layar utama (*Home Cockpit*, *Latihan Hub*, *Quiz Shell*) dipadatkan secara proporsional agar **100% pas satu layar (`overflow: 0px`) tanpa *scroll***, sementara layar berdaftar panjang (*Progres*, *Profil*, *Grammar*) hanya menggulirkan **panel konten dalam** (`#progressTabPane`, `#onlineRoot`, `ol.lesson-path`) tanpa menggeser cangkang aplikasi.
2. **Adaptive Multi-Form-Factor UI (3 Tier Perangkat Berbeda)**:
   - **Tier 1 — Mobile / iPhone (`< 768px`)**: Bottom `UITabBar` dock (`flex-direction: row`), *Home Cockpit* satu layar penuh tanpa *scroll*, serta *Latihan Hub* dalam *2-Column Bento Grid* kompak.
   - **Tier 2 — Tablet / iPad Portrait (`768px – 1023px`)**: Bilah navigasi bertransformasi menjadi **Left Navigation Rail** vertikal (`width: 88px`, `flex-direction: column`), area kerja melebar penuh (`calc(100vw - 88px)`), *Home Cockpit* dan *Progres* menjadi **2-Column Split-View**.
   - **Tier 3 — Desktop / iPad Landscape (`>= 1024px`)**: Bilah navigasi bertransformasi menjadi **Full Left Sidebar** (`width: 232px`, berlabel `"FIEZEL · MENU UTAMA"` dengan tombol horizontal ikon + teks), *Home Cockpit* 2 kolom penuh, *Latihan Hub* **3-Column Bento Grid**, dan *Progres* **Master-Detail Split-View**.
3. **2D Active Navigation Pill (`syncNavActivePill` di `app.js`)**:
   - Memperbarui fungsi `syncNavActivePill()` agar menghitung koordinat 2 dimensi (`translate3d(left, top, 0)` + `width` & `height`) saat berada pada mode *Navigation Rail* / *Left Sidebar* (`window.innerWidth >= 768`), sambil mempertahankan animasi horizontal di Mobile (`< 768px`).

## 3. Bukti Pengujian Empiris (Playwright Headless Multi-Device Probe)
Skrip probe: `tools/dev/adaptive-viewport-probe.mjs`
Menguji **40 kombinasi** (5 ukuran perangkat × 8 tampilan utama: `home`, `classroom`, `latihan`, `game`, `progress`, `online`, `vocab`, `quiz-vocab`):

| Perangkat | Viewport | Sebelum (`fitsViewport`) | Sesudah (`fitsViewport`) | `overflowPx` Sesudah | Lebar Area `#app` (`appW`) | Pola Navigasi (`nav.bottomnav`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **iPhone SE** | `375×667` | 0 / 8 | **8 / 8 (100%)** | `0 px` | `375 px` | Bottom Dock (`w:375, h:58, dir:row`) |
| **iPhone 14** | `390×844` | 1 / 8 | **8 / 8 (100%)** | `0 px` | `390 px` | Bottom Dock (`w:390, h:58, dir:row`) |
| **iPad Portrait** | `820×1180` | 2 / 8 | **8 / 8 (100%)** | `0 px` | `732 px` | Left Navigation Rail (`w:88, h:1180, dir:column`) |
| **iPad Landscape** | `1180×820` | 2 / 8 | **8 / 8 (100%)** | `0 px` | `948 px` | Left Sidebar (`w:232, h:820, dir:column`) |
| **Desktop** | `1440×900` | 2 / 8 | **8 / 8 (100%)** | `0 px` | `1208 px` | Full Left Sidebar (`w:232, h:900, dir:column`) |

## 4. Daftar Berkas yang Disentuh
- `index.html`: Menghapus paksaan `overflow-y: auto/visible !important` pada `<style id="fz-contrast-guard">` yang merusak kunci *viewport*.
- `app.js`: Memperbarui `syncNavActivePill()` agar mendukung *Left Navigation Rail* & *Full Sidebar* (2D pill tracking) serta menyinkronkan posisi saat `window.resize`.
- `features/ui/fiezel-tactile-clay.css`: Menambahkan **Section 14 (`14.1`–`14.5`)** untuk *100dvh Fixed-Stay App Shell* dan *Adaptive Multi-Form-Factor Layout* (Mobile, iPad Rail, Desktop Sidebar, dan Multi-Column Split-View).
- `tools/dev/adaptive-viewport-probe.mjs`: Skrip probe empiris Playwright multi-perangkat.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump build ke `m025-571` via `node tools/bump-build.mjs`.

## 5. Status Kelulusan Gerbang Mutu Lokal
- `node tests/anti-flicker-uiux-invariant-test.js`: **PASS (14/14)**
- `node tests/home-honesty-test.js`: **PASS (9/9)**
- `node tests/app-interaction-policy-test.js`: **PASS (34/34)**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS (`m025-571`)**
- `node tests/gate-registry-test.js`: **PASS (10/10)**
- `node tools/bump-build.mjs --check`: **Selaras (`m025-571`)**
