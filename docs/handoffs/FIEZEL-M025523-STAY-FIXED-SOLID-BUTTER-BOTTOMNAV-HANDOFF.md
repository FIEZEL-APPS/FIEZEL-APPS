# FIEZEL Handoff Dossier: Stay-Fixed Solid Butter Yellow Bottom Navigation Bar

- **Build Version**: `m025-523`
- **Tanggal**: 2026-10-08
- **Tipe Perubahan**: `fix(ui): stay-fixed solid butter yellow bottom navigation bar`

---

## 1. Ringkasan Permintaan Pengguna

Pengguna memberikan arahan perbaikan desain:
> *"bottom nya terlihat floating, dan terlihat layar bawahnya tembus pandang, aku ingin dibuatkan stay fixed"*

Artinya:
1. **Bukan Floating**: Menghapus margin melayang di bawah dan samping (`bottom: calc(14px + ...)`, `left: 50%`). Menjadikannya **stay fixed** menempel di dasar layar (`bottom: 0`, `left: 0`, `right: 0`, `width: 100%`).
2. **Tidak Tembus Pandang**: Latar dock dibuat **solid kuning mentega** 100% kedap (*opaque* `linear-gradient(180deg, #FFFDF0 0%, #FEF08A 100%)`), tanpa transparansi atau efek tembus pandang konten di bawahnya.
3. **Tetap Kuning Mentega Glossy**: Mempertahankan gradien kuning mentega yang hangat, border atas glossy (`border-top: 1.5px solid rgba(255, 255, 255, 0.95)`), dan inner specular bevel.
4. **Liquid Sliding Active Pill Tetap Bergerak Mulus**: Kapsul indikator aktif (`#navActivePill`) tetap meluncur mulus dengan spring physics antar-tab tanpa kedip (*zero-flicker*).

---

## 2. Berkas yang Diperbarui

1. `features/ui/mobile-edge-fit.css`:
   - `.bottomnav`: `bottom: 0 !important; left: 0 !important; width: 100% !important; border-radius: 0 !important;`
   - Background diubah menjadi solid non-transparan: `linear-gradient(180deg, #FFFDF0 0%, #FEF08A 100%) !important;`
   - Border atas kaca: `border-top: 1.5px solid rgba(255, 255, 255, 0.95) !important;`
   - Padding aman: `padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px)) !important;`
   - Height: `calc(62px + env(safe-area-inset-bottom, 0px)) !important;`
2. `features/ui/fiezel-tactile-clay.css`:
   - Selaras dengan styling stay-fixed solid di `mobile-edge-fit.css`.
3. `style.css`:
   - Selaras dengan styling stay-fixed solid.
4. `tools/dev/probe-nav-butter.js`:
   - Diperbarui untuk menguji kondisi `bottomGap: 0` dan `width: 390px` (full width).
5. Build Arbiter 6-titik:
   - `m025-523` dinaikkan dan disinkronkan.

---

## 3. Bukti Verifikasi Empiris Playwright

- `tools/dev/probe-nav-butter.js` dijalankan di Playwright Chromium (iPhone 14, 390x844):
  - `Bottomnav bottomGap`: `0px` (stay-fixed menempel dasar layar)
  - `Bottomnav width`: `390px` (lebar penuh 100%)
  - `Bottomnav borderRadius`: `0px` (docked flat bar)
  - `Sliding Pill Width`: `61.3px`
  - `Sliding Pill Coordinate X`:
    - Home: `6.0px`
    - KelasKu: `69.3px`
    - Latihan: `132.7px`
    - Game: `196.0px`
    - Progres: `259.3px`
    - Profil: `322.7px`
    - Home (kembali): `6.0px`
- **Screenshots Bukti**:
  - `tools/dev/screenshots/butter_01_home.png`
  - `tools/dev/screenshots/butter_02_kelasku.png`
  - `tools/dev/screenshots/butter_03_latihan.png`
  - `tools/dev/screenshots/butter_04_game.png`
  - `tools/dev/screenshots/butter_05_progres.png`
  - `tools/dev/screenshots/butter_06_profil.png`

---

## 4. Hasil Gerbang Mutu Lokal

- `node tests/anti-flicker-uiux-invariant-test.js`: **PASS (14/14)**
- `node tests/ui-structure-test.js`: **PASS**
- `node tests/contrast-test.js`: **PASS**
- `node tests/id-golden-snapshot-test.js`: **PASS (20/20)**
- `node tests/curriculum-cache-version-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS (364 gerbang)**
- `node tools/bump-build.mjs --check`: **PASS (m025-523 Selaras)**
