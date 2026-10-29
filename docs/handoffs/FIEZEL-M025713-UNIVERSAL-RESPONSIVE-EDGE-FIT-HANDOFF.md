# FIEZEL-M025713: Universal Multi-Device Edge-Fit, Widened Ergonomic Practice Cards & Thumb-Docked Next Button Handoff

## 1. Ringkasan Eksekutif
Rilis build kanonikal `m025-713` menuntaskan audit sistemik menyeluruh terhadap antarmuka latihan (Japanese & English practice sessions) berdasarkan arahan pengguna dan invarian `AGENTS.md`:
1. **Widened Ergonomic Practice Cards & Mobile Thumb Ergonomics**: Melebarkan kontainer kartu latihan (`.jlpt-mobile-card`, dll.) dari lebar sempit 362px menjadi 378px (97% lebar layar ponsel 390px) dengan target sentuh opsi pilihan ganda selebar 354–360px yang ergonomis tepat di jangkauan jempol tangan pengguna saat memegang ponsel.
2. **Eliminasi Total Text Stacking & Rogue Closing Brace Bug**: Memperbaiki kurung kurawal penutup nakal (`}`) di `features/speaking-listening/jlpt-listening.css` baris 2030 yang sebelumnya menyebabkan media query desktop 2-kolom bocor ke mobile dan memeras teks kalimat Jepang menjadi kolom sempit 80px vertikal satu karakter per baris.
3. **Japanese Chokai Listening Fullscreen Native PWA & Canonical Palette**: Mengubah sesi listening Jepang dari kartu popup mengambang yang terpotong menjadi tampilan layar penuh 100% Daylight `#FBF7F3` (kertas hangat netral kanonikal brief) setara dengan sesi listening Bahasa Inggris, mematuhi 100% `tests/pastel-field-contrast-test.js`.
4. **Universal Thumb-Zone Floating Next Bar**: Menata ulang bilah tombol "Lanjut" / "Next" / "Maju →" ke posisi paten `position: fixed !important; bottom: 0 !important; z-index: 9999 !important;` tepat di lipatan layar terbawah ($y=726\text{px}$) yang mudah dijangkau jempol pengguna tanpa perlu overscrolling ke dasar konten.
5. **Sub-Topbar Segmented Controls Ergonomics**: Mengeluarkan tombol sub-topbar (`.jlpt-mode-btn`, `.jlpt-exam-mode-btn`, `.listening-filter-btn`, `.jlpt-sheet-tab-btn`) dari selektor clay sekunder tebal di `fiezel-tactile-clay.css`, menghasilkan segmented pill ramping dan proporsional (tinggi 26–28px) alih-alih balok clay 48px yang membengkak.
6. **Multi-Device Responsiveness (Mobile, Tablet, Desktop)**:
   - **Mobile (390 × 844 px)**: Fullscreen native PWA, margin tepi tipis 6px, kartu lebar 378px (97%), opsi 360px × 52px tactile clay.
   - **Tablet (820 × 1180 px)**: Kartu terpusat proporsional selebar 660px di dalam modal 720px, opsi sentuh 54px.
   - **Desktop (1280 × 800 px / 1440 × 900 px)**: Split-screen dua kolom (Panggung kiri 320px untuk maskot Mochi + audio pill + situasi; Kolom kanan 640px untuk teks soal dan 4 kartu opsi) selebar 998px–1040px, mematuhi invarian Anti-Void Desktop AGENTS.md.
7. **Mochi Mascot Proportion & Zero-Overlap Option Badges**: Maskot 3D Mochi companion diperbesar secara proporsional (140×110px) dan lencana opsi (A/B/C/D atau 1/2/3/4) diikat dengan layout flex horizontal tanpa overlap.

---

## 2. Tabel Verifikasi Kuantitatif (Quantitative Reporting Table)
Mematuhi aturan AGENTS.md Section 2 (Numeric Definition of Done):

| Item / Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Lebar Kartu Mobile (`.jlpt-mobile-card`)** | $\ge 370\text{px}$ pada layar 390px | $378\text{px}$ (97% viewport) | **LULUS** |
| **Lebar Hit-Target Opsi Jempol** | $\ge 350\text{px}$ pada layar 390px | $354\text{px} - 360\text{px}$ | **LULUS** |
| **Arah Teks Kalimat Jepang Chokai** | Horizontal alami 100% | `writing-mode: horizontal-tb` ($340\text{px}$ lebar) | **LULUS** |
| **Tinggi Sub-Bar Segmented Controls** | $\le 32\text{px}$ (ramping, non-bloated) | $26\text{px}$ tombol, $38\text{px}$ baris | **LULUS** |
| **Posisi Tombol Next Pasca-Jawab** | Fixed di Thumb-Zone ($y \ge 720\text{px}$) | `bottom: 0`, $y=726\text{px}$, tombol 48-52px | **LULUS** |
| **Desktop Anti-Void Width** | $\ge 960\text{px}$ atau Split-Screen | $998\text{px}$ Split-Screen ($320\text{px} + 640\text{px}$) | **LULUS** |
| **Tablet Card Center Width** | $600\text{px} - 720\text{px}$ | $660\text{px}$ kartu, $720\text{px}$ modal | **LULUS** |
| **Pastel Field Contrast Gate** | 9/9 tes lulus, zero obsolete colors | 9/9 PASS (`pastel-field-contrast-test.js`) | **LULUS** |
| **Hexa-Sync Arbiter (`bump-build.mjs`)** | 6 titik kanonikal selaras | Selaras sempurna pada build `m025-713` | **LULUS** |
| **Curriculum Cache Version Gate** | 33 penegasan lulus | 33 penegasan lulus, build `m025-713` | **LULUS** |
| **Content Integrity & Anti-Stub Gate** | 4 dari 4 gerbang lulus | 4/4 gerbang (100% hijau) | **LULUS** |
| **Rollout Plan Gate (`rollout-plan-test.js`)** | 142 penegasan lulus | 142/142 PASS (100% hijau) | **LULUS** |

---

## 3. Berkas yang Diperbarui
- `coordination/BUILD-VERSION.json`: Versi `m025-713`.
- `sw.js`: Versi cache rev `m025-713`.
- `core-config.js`: `self.FIEZEL_PAGE_BUILD = 'm025-713'`.
- `features/neural-voice/fiezel-diag-panel.js`: `DIAG_BUILD = 'm025-713'`.
- `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Versi query string diselaraskan ke `m025-713`.
- `features/speaking-listening/jlpt-listening.css`: Perbaikan media query responsive mobile/tablet/desktop, widened card 378px, opsi 360px, perbaikan syntax closing brace desktop split screen.
- `features/speaking-listening/fiezel-jlpt-listening.js`: Slot feedback banner dipindahkan ke root wrapper untuk fixed thumb dock.
- `features/ui/mobile-edge-fit.css`: Invarian universal margin tipis 6px mobile, pelebaran kartu 100%, tata letak jempol.
- `features/ui/fiezel-tactile-clay.css`: Pemulihan fixed bottom dock tombol next di seluruh sesi latihan.
- `index.html`: Penyelarasan style inline, zero-popup listening cutoff, perbaikan padding `.listening-body`.
