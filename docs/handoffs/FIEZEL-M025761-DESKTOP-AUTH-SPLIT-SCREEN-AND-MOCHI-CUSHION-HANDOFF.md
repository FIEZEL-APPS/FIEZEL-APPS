# FIEZEL HANDOFF DOSSIER: M025-761 UNIVERSAL DESKTOP 50/50 SPLIT-SCREEN & MOCHI CLOUD CUSHION PARITY

## 1. Ringkasan Eksekutif & Temuan Audit
- **Nomor Build**: `m025-761`
- **Cakupan Rilis**: Perbaikan visual menyeluruh pada antarmuka desktop Welcome, Auth Login/Register, dan Onboarding 5-Langkah.
- **Penyebab Utama Cacat Sebelumnya**:
  - Di `features/ui/fiezel-tactile-clay.css` baris 9197, aturan `html body .fz-auth .fz-auth-hero.is-welcome` dipaksa `min-height: 46vh !important; max-height: 50vh !important;` secara global tanpa media query pembatas `@media (max-width: 767px)`.
  - Akibat spesifisitas `(0, 3, 2)` yang lebih tinggi daripada `style.css` `(0, 2, 2)` dan posisi muatnya di akhir `<head>`, aturan ini menimpa layout desktop split-screen 100vh, memotong kartu hitam di 50vh (400px dari 800px) dan meninggalkan kotak kosong putih/krem raksasa (50% void) di kiri bawah layar.
  - Hal serupa terjadi pada layar Masuk (24vh) dan Daftar (21vh).
  - Pada layar Onboarding desktop, elemen dialog tidak memiliki pembungkus berbatas (`.fiezel-ob-card`), menyebabkan header topografi tergulir keluar layar atas (`y: -153px`) dan tombol submit terpotong ke bawah layar (`y: 953px`).

## 2. Rincian Solusi & Transformasi Geometri DOM
1. **Pemisahan Media Query Bersih (`features/ui/fiezel-tactile-clay.css`)**:
   - Aturan `is-welcome (46-50vh)`, `is-masuk (21-24vh)`, dan `is-daftar (18-21vh)` dibungkus rapat di dalam `@media (max-width: 767px)`.
   - Pada `@media (min-width: 768px)`:
     - `.fz-auth` menggunakan `display: flex; flex-direction: row; height: 100vh; overflow: hidden;`.
     - Kolom kiri `.fz-auth-hero` memiliki proporsi Golden Ratio 48% (`flex: 0 0 48%; min-height: 100vh; height: 100vh; max-height: none; background: #1B1515 !important;`).
     - Kolom kanan `.fz-auth-body` memiliki proporsi 52% (`flex: 1 1 52%; min-height: 100vh; height: 100vh; overflow-y: auto;`).
     - Garis pemisah organik vertikal gelombang ganda (`.fz-auth-wave-v`) dengan kurva `#EBDDC8` dan `#F8F3E9`.
     - Tombol 3D tactile glossy Google button dengan pantulan kaca alami dan border lembut.
2. **Onboarding Cohesion & Mochi Cloud Cushion (`features/onboarding/fiezel-onboarding.js`)**:
   - Seluruh langkah perkenalan dibungkus rapi dalam kartu desktop terpusat (`.fiezel-ob-card`, lebar maksimal `412px`, terpusat simetris di tengah layar).
   - Karakter Mochi diletakkan di panggung dengan bantalan awan ganda dan gelembung dialog melayang, tidak lagi terlempar keluar layar.
   - Ornamen pasir gurun bawah (`.fz-ob-bottom-ornament`) mencegah layout melorot ke dasar browser.
3. **Penyelarasan Kamus Multibahasa (`features/i18n/`)**:
   - Seluruh 4.701 kunci teks Indonesia terpetakan 100% utuh ke kamus Thailand (`copy-th-feat-b.js`) tanpa kebocoran naskah.

## 3. Bukti Verifikasi Empiris Headless Playwright
- **Tinggi Hero Desktop (`.fz-auth-hero`)**: Berhasil dipulihkan dari `400px` (50vh) menjadi `800px` (100% penuh layar 100vh).
- **Void Putih Kiri Bawah**: 0px (Tertutup sempurna tanpa celah).
- **Tinggi Elemen Onboarding**: 100% pas di dalam batas 800px tanpa perlu scroll paksa.

## 4. Status Gerbang Mutu Lokal (Quality Gates)
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `tests/th-ui-leak-test.js`: **PASS (HIJAU, 4701/4701 KUNCI)**
- `tests/onboarding-test.js`: **PASS (HIJAU)**
- `tests/curriculum-cache-version-test.js`: **PASS (HIJAU, m025-761)**
- `tests/gate-registry-test.js`: **PASS (HIJAU, 10 PASS)**
- `tools/bump-build.mjs --check`: **PASS (SELARAS 6-TITIK m025-761)**
