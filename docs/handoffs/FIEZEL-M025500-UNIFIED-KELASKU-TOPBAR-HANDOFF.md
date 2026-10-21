# FIEZEL Handoff Dossier: m025-500 Unified Topbar Format Across All Panels

- **Versi Build**: `m025-500`
- **Branch**: `feat/m025-499-dashboard-uiux-polish`
- **Target**: `main`
- **Tanggal**: 2026-10-07

---

## 1. Ringkasan Eksekutif & Permintaan Pengguna

Menindaklanjuti arahan tegas pengguna:
> *"ini floating, formatnya ikuti topbar kelasku"*
> *"untuk topbar seluruh panel, ikuti topbar kelasku, samakan semua, jangan beda beda, kalau beda beda seperti itu, sangat terlihat seperti aplikasi murahan"*

Pengguna mengidentifikasi dua kelemahan fatal pada antarmuka topbar sebelumnya:
1. **Efek Floating / Shelf Tebal**: Topbar sebelumnya memiliki bayangan tebal `box-shadow: 0 4px 0 #CBD5E1` yang membuatnya melayang kaku seperti rak di atas layar peramban.
2. **Inkonsistensi Format Antar-Panel**:
   - Di panel **KelasKu**: Sisi kiri menampilkan tipografi wordmark `KelasKu` + badge tag `AKTIF`, sisi kanan menampilkan tombol selektor kelas tunggal `[ 👥 X IPA 2 ▾ ]`. Tampilannya bersih, elegan, dan setara aplikasi natif.
   - Di panel lainnya (**Home, Latihan, Game, Progres, Profil**): Sisi kiri menampilkan logo SVG lama dengan spark, sisi kanan dijejali 5 tombol kecil berserakan (Streak pill `🔥 3`, XP pill `⚡ 120`, Switch kursus bendera, Lonceng notifikasi, Pengaturan sliders). Perbedaan format yang mencolok ini membuat aplikasi terasa tidak konsisten ("terlihat seperti aplikasi murahan").

---

## 2. Solusi Desain & Implementasi Teknis

1. **Zero Floating / Seamless Top Docking**:
   - Menghapus bayangan tebal pada `header.topbar` (`box-shadow: none !important;`).
   - Menerapkan docking bersih setara iOS `UINavigationBar` / Android `TopAppBar` dengan garis batas halus `border-bottom: 1px solid #E2E8F0 !important;` dan latar belakang daylight travertine hangat `rgba(253, 250, 243, 0.96) !important;`.
   - Mengatur padding dan tinggi min 52px untuk kenyamanan sentuhan jari dan integrasi rapi dengan safe area.

2. **Penyelarasan Format 100% Identik Mengikuti KelasKu**:
   - **Sisi Kiri (Wordmark + Tag Status)**:
     - Di KelasKu: `<span class="kelasku-wordmark">KelasKu</span><span class="kelasku-brand-tag">AKTIF</span>` (Emerald `#1F7A63` / `#D1FAE5`).
     - Di seluruh panel lain (Home, Latihan, Game, Progres, Profil): `<span class="fiezel-wordmark-text">FIEZEL</span><span class="fiezel-brand-tag">AKTIF</span>` (Slate `#0F172A` / Amber `#FEF3C7` border `#FDE68A`).
     - Tipografi, font weight (`800`), font size (`23px`), letter spacing, dan geometri tag dibuat 100% simetris.
   - **Sisi Kanan (Tactile Selector Pill Tunggal)**:
     - Di KelasKu: `btn-class-selector` berwujud pil putih tactile `[ 👥 X IPA 2 ▾ ]`.
     - Di seluruh panel lain: `btn-course-selector` berwujud pil putih tactile `[ 🇬🇧 English ▾ ]` atau `[ 🇯🇵 日本語 ▾ ]` (tinggi 36px, radius 9999px, bevel 3D tactile, font 13px weight 800, bendera SVG + nama bahasa + chevron `▾`).
     - Kluster 5 tombol acak dihapus dari topbar; indikator streak & XP tetap tersaji megah di kartu hero Home & profil murid, sedangkan pengaturan terakses langsung di tab Profil.
     - Elemen DOM penting (`#topbarStreakVal`, `#topbarXpVal`, `#fzNotifBtn`, `#fzNotifBadge`, `#fzTopMark`) tetap dipelihara di slot tersembunyi agar integrasi skrip & tes regresi tetap hijau tanpa galat.

3. **Perbaikan Kontras Kartu Pintasan Bahasa (Target Lang Chip)**:
   - Mengubah kartu pintasan bahasa di Home ("Coba Bahasa Jepang") dari latar hitam pekat kontras rendah menjadi kartu Daylight Tactile berlatar putih bersih dengan badge lavender `あ` dan teks berbobot kontras tinggi ($>7:1$).

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright)

- Pengujian visual dijalankan melalui:
  - `tools/dev/comprehensive-dashboard-audit.mjs` (layar 01-15)
- Stills diverifikasi frame-by-frame via `view_file`:
  - `01-home-dashboard.png`: Topbar `FIEZEL [AKTIF]` + `[ 🇬🇧 English ▾ ]`, docked flush, kartu pintasan Jepang berlatar putih bersih.
  - `02-latihan-dashboard.png`: Topbar `FIEZEL [AKTIF]` + `[ 🇬🇧 English ▾ ]` seragam di atas grid modul latihan.
  - `03-kelasku-dashboard.png`: Topbar `KelasKu [AKTIF]` + `[ 👥 X IPA 2 ▾ ]` menjadi standar format acuan.
  - `04-game-dashboard.png`: Topbar `FIEZEL [AKTIF]` + `[ 🇬🇧 English ▾ ]` seragam di atas FIEZEL ARENA.
  - `05-progress-dashboard.png`: Topbar `FIEZEL [AKTIF]` + `[ 🇬🇧 English ▾ ]` seragam di atas dashboard OLM Braincore.
  - `06-profile-dashboard.png`: Topbar `FIEZEL [AKTIF]` + `[ 🇬🇧 English ▾ ]` seragam di atas lembar akun Rian Pratama.

---

## 4. Daftar Berkas yang Dimodifikasi

1. `index.html`:
   - Memperbarui markup `#topBrandWrap` menjadi format tipografi `FIEZEL` + `AKTIF`.
   - Mengubah `#topGamifyCluster` menjadi tombol selektor kursus tunggal `.btn-course-selector` (`#fzCourseSwitchBtn`) dengan bendera dan label ber-chevron `▾`.
   - Menyimpan penanda statis dalam slot tersembunyi untuk kompatibilitas skrip dan unit test.
2. `features/ui/fiezel-tactile-clay.css`:
   - Mengubah `header.topbar` menjadi `box-shadow: none !important; border-bottom: 1px solid #E2E8F0 !important; background: rgba(253, 250, 243, 0.96) !important;`.
   - Menambahkan aturan gaya `.topbar-brand-fiezel`, `.fiezel-wordmark-text`, dan `.fiezel-brand-tag`.
   - Menambahkan aturan gaya `.btn-course-selector` identik dengan `.btn-class-selector`.
3. `features/ui/mobile-edge-fit.css`:
   - Menghapus aturan `box-shadow` gelap dan background gelap pada topbar.
   - Menyelaraskan `.target-lang-chip` ke tema Daylight Tactile bersih.
4. `style.css`:
   - Menghapus `box-shadow: 0 4px 0 #CBD5E1` pada `header.topbar`.
   - Menyelaraskan aturan `.topbar-brand-fiezel` dan `.btn-course-selector`.
5. `app.js`:
   - Memperbarui `renderInner()` agar menyetel `display: flex` pada brand dan actions saat keluar dari KelasKu.
   - Memperbarui `updateTopbarCourseButton()` agar memperbarui label teks selektor (`English ▾` / `日本語 ▾`) secara dinamis.
6. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Ditingkatkan ke build `m025-500` via arbiter resmi `tools/bump-build.mjs`.

---

## 5. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS (m025-500)**
- `node tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail)**
- `node tests/course-persistence-and-jlpt-mobile-test.js` -> **PASS**
- `node tests/paw-mascot-test.js` -> **PASS (35/35)**
- `node tests/pastel-field-contrast-test.js` -> **PASS (9/0)**
- `node tests/boot-order-test.js` -> **PASS**
- `node tools/bump-build.mjs --check` -> **Selaras (6/6 titik)**
