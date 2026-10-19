# FIEZEL Handoff Dossier: Pemulihan Ikon Resmi OG FIEZEL pada Launcher Android (m025-612)

**Tanggal:** 20 Oktober 2026
**Build:** `m025-612` (Hexa-Sync 100% Selaras)
**Cabang:** `fix/android-restore-og-brand-launcher-icon`

---

## 1. Ringkasan & Akar Masalah
Pengguna melaporkan bahwa ikon aplikasi Android saat ini "sangat jelek sekali" dan secara eksplisit meminta pengembalian ke **Ikon Resmi OG (Huruf F Gading + 2 Batang Suara Emas)**.

### Analisis Akar Masalah:
1. **Penyusutan Skala Berlebihan**: Pada implementasi sebelumnya, layer foreground di `ic_launcher_foreground.xml` diberikan transformasi `scaleX="0.82" scaleY="0.82"`. Padahal, logo asli pada `fiezel-icon-512.png` telah dihitung presisi untuk masuk dalam radius zona aman maskable (radius 161.4px dari batas 204.8px). Penyusutan 0.82x membuat logo tampak mengecil (hanya 52% dari radius) dan tenggelam di tengah ruang kosong.
2. **Kehilangan Gradasi & Pencahayaan (Flat Muddy Colors)**:
   - Warna latar belakang diubah menjadi persegi polos `@color/fz_splash_bg` (`#1B1418`) tanpa gradasi radial maupun kilau atas (*specular sheen*).
   - Warna huruf F dan batang gelombang suara dibuat warna mati (`@color/fz_cream` dan `@color/fz_gold`) tanpa gradasi metalik gading dan emas cair 24K.
3. **Hasil pada Perangkat Murid**: Di layar utama (*home screen*) Android murid, ikon tampak seperti titik kecil kusam di dalam lingkaran hitam/cokelat mati.

---

## 2. Solusi & Perbaikan Arsitektur Ikon
1. **Pemulihan Otentik SVG OG via Headless Chromium**:
   - Menggunakan aset resmi `assets/brand/fiezel-icon.svg` dan merendernya dengan Playwright Chromium ke resolusi tinggi tanpa kompresi kehilangan detail.
   - **Background Layer**: Memulihkan gradasi radial mewah `#241A1D` -> `#140E10` -> `#070405` dengan kilau atas lembut (*top specular sheen* opacity 18%).
   - **Foreground Layer**: Memulihkan gradasi linier gading otentik (`#FFFBF3` ke `#EBDBC0`) untuk huruf F, dan gradasi emas metalik (`#F7E3AE` -> `#DDB55F` -> `#B0812A`) untuk batang gelombang suara.
2. **Skalasi & Pembingkaian Optimal (Safe Zone Calibration)**:
   - Menggunakan skala proporsional 1.04x yang berpusat sempurna di (256, 256), sehingga logo tampil tegas, jelas, dan percaya diri tanpa terpotong (*zero clipping*) di seluruh jenis launcher Android (lingkaran Pixel/Motorola, squircle Samsung One UI/Xiaomi).
3. **Dukungan Penuh Seluruh Kepadatan Layar (Multi-Density Coverage)**:
   - Menghasilkan layer adaptive icon (`ic_launcher_background.png` dan `ic_launcher_foreground.png`) dan ikon legacy (`ic_launcher.png` dan `ic_launcher_round.png`) untuk seluruh kepadatan layar Android standar:
     - `mdpi` (48x48 legacy, 108x108 adaptive)
     - `hdpi` (72x72 legacy, 162x162 adaptive)
     - `xhdpi` (96x96 legacy, 216x216 adaptive)
     - `xxhdpi` (144x144 legacy, 324x324 adaptive)
     - `xxxhdpi` (192x192 legacy, 432x432 adaptive)

---

## 3. Bukti Verifikasi Mutu & Hasil Pengujian
1. **Automated Quality Gate**: `node tests/android-app-integrity-test.js`
   - Check 1 (Manifest): PASS
   - Check 2 (Gradle configs): PASS
   - Check 3 (MainActivity WebView): PASS
   - Check 4 (Assets bundle): PASS
   - Check 5 (App launcher icons across densities): PASS
   - Check 6 (GitHub Actions workflow): PASS
   - Check 7 (Zero secrets & prohibited claims): PASS
2. **Hexa-Sync Invariant**:
   - `coordination/BUILD-VERSION.json`: `m025-612`
   - `sw.js`: `m025-612`
   - `core-config.js`: `m025-612`
   - `features/neural-voice/fiezel-diag-panel.js`: `m025-612`
   - `kurikulum.html`: `m025-612`
   - `misi.html`: `m025-612`
   - Status: **100% Selaras**.
