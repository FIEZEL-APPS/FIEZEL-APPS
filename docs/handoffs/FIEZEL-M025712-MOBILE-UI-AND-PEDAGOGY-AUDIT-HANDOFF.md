# FIEZEL HANDOFF DOSSIER: COMPREHENSIVE MOBILE UI & PEDAGOGICAL AUDIT
**Build Canonical**: `m025-712`
**Branch**: `feat/mobile-ui-and-pedagogy-audit-m025-712`
**Date**: 2026-10-29
**Status**: VERIFIED & READY FOR MERGE

---

## 1. Ringkasan Eksekutif & Akar Masalah (Root Causes & Remediation)

Audit sistemik dan perbaikan menyeluruh atas seluruh tampilan antarmuka latihan, tes penempatan, onboarding, dan integritas pedagogis kursus Jepang & Inggris:

1. **Eliminasi Terpotongnya Layar & Overflow Mobile (Zero-Scroll Thumb Zone)**:
   - *Akar Masalah*: Pada viewport mobile iPhone SE ($375 \times 667\text{px}$) dan iPhone 14 ($390 \times 844\text{px}$), elemen maskot `.quiz-stage .fz-paw-above` memakan tinggi $140–175\text{px}$, dipadukan dengan 4 tombol pilihan `.option` setinggi $56\text{px}$ dan celah $12\text{px}$, mendorong kartu latihan ke bawah lipatan layar ($760.1\text{px}$ pada layar $667\text{px}$), memotong tombol aksi dan merusak onboarding.
   - *Solusi*: Mengatur skala `.quiz-stage .fz-paw-above` menjadi proporsional kompak ($64\text{px}$ aspect-ratio 1:1), tombol `.option` setinggi $44\text{px}$ padding $6\text{px}\ 12\text{px}$, dan lembar onboarding `.fiezel-ob` dipatok `height: 100dvh` dengan panggung maskot kompak ($44–50\text{px}$).
   - *Hasil Empiris*: Step 1 Nama (`bottom: 409.8px`), Step 2 Kursus (`bottom: 650.3px`), Step 3 Target (`bottom: 609.0px`), Step 4 Jalur Belajar (`bottom: 589.2px`), dan Kuis Quick-Win (`bottom: 615.5px`) 100% tampak di atas lipatan layar pertama (*above-the-fold* $\le 667\text{px}$).

2. **Stabilisasi Topbar Melayang & Anti-Drift (Universal Fixed Topbar)**:
   - *Akar Masalah*: Header topbar sebelumnya menggunakan `position: sticky !important` yang runtuh (*drift away*) saat scroll karena kontainer leluhur memiliki `overflow-x: clip` / `overflow-x: hidden`.
   - *Solusi*: Mengubah `.topbar` dan `header.topbar` menjadi `position: fixed !important; top: 0 !important; width: 100% !important; z-index: 100 !important;` dengan bantalan aman `#app` padding-top $58\text{px}$. Pada panggung kuis, topbar sesi kuis dipatok `position: fixed; top: 0; height: 50px; z-index: 500`.
   - *Hasil Empiris*: Probe Playwright mengonfirmasi pada seluruh 6 tampilan (`home`, `vocab`, `grammar`, `reading`, `writing`, `kana`) topbar tetap kokoh (`top: 0`, `height: 56px`, `pinned: true`, `pos: "fixed"`) saat digulir $200–250\text{px}$.

3. **Penyumbatan Total Kebocoran Kunci Jawaban & Romaji (Anti-Leak Exam Purity)**:
   - *Akar Masalah*: Pada kuis Hiragana pertama (`qw-ja-1` dan `qw-ja-2`), salinan string terjemahan di `features/i18n/copy-id-feat-b.js` dan `id-golden-baseline.json` membocorkan kunci jawaban secara eksplisit di stem dan tombol (`Dengarkan (a) ... [ あ (a) ]`). Selain itu, soal kosakata kanji di tes penempatan mencetak romaji mentah di bawah kanji via `jaPhonetic`.
   - *Solusi*: Memperbarui salinan terjemahan menjadi stem bersih (`"Dengarkan suara audio dan pilih huruf Hiragana yang tepat:"`) dengan token pilihan murni `['あ', 'い', 'う', 'え']`. Menekan tampilan romaji (`display: none !important`) saat mode ujian/penempatan di `draw()` dan CSS `.quiz-shell .ja-romaji`.

4. **Eliminasi Crash Blueprint Penempatan Jepang (C2 Grammar Shortfall Resolution)**:
   - *Akar Masalah*: `PLACEMENT_LITE_BLUEPRINT` menuntut butir grammar C2, padahal kursus Jepang hanya mencakup N5–N1 (A1–C1). Panggilan `buildPlacement()` gagal dengan pesan error `Placement blueprint shortfall C2/grammar: 0/1`.
   - *Solusi*: Menambahkan fallback otomatis pada `buildPlacement()` dan `startLevelPlacement()` agar kursus Jepang memetakan C2 ke C1, menghapus kegagalan pembuatan blueprint.

---

## 2. Quantitative Verification Reporting Table (Zero-Potemkin Invariant)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :---: |
| **Mobile Above-The-Fold (iPhone SE 375x667)** | Seluruh soal & tombol aksi $\le 667\text{px}$ | Bottom kuis Q1 = $615.5\text{px}$ ($\le 667\text{px}$) | **LULUS** (100%) |
| **Mobile Above-The-Fold (iPhone 14 390x844)** | Seluruh soal & tombol aksi $\le 844\text{px}$ | Bottom kuis Q1 = $616.2\text{px}$ ($\le 844\text{px}$) | **LULUS** (100%) |
| **Onboarding Step 1-4 Screen Fit** | Nol elemen keluar layar pada iPhone SE | Step 1: 409px, Step 2: 650px, Step 3: 609px, Step 4: 589px | **LULUS** (100%) |
| **Topbar Scroll Drift Elimination** | Topbar tetap `pinned: true`, `top: 0`, `pos: fixed` | 6/6 tampilan (`home`,`vocab`,`grammar`,`reading`,`writing`,`kana`) `top: 0`, `h: 56px` | **LULUS** (100%) |
| **Penyumbatan Bocoran Kunci Hiragana** | Nol label `(a)`/`(i)` di stem dan opsi | Stem & opsi 100% token aksara Hiragana murni | **LULUS** (100%) |
| **Penyumbatan Bocoran Romaji Ujian** | Nol romaji di bawah kanji saat tes/ujian | `jaPhonetic` ditekan saat `MEASURE || cfg.placement` | **LULUS** (100%) |
| **Jepang C2 Blueprint Shortfall Fix** | Tes penempatan Jepang berjalan tanpa shortfall | Fallback C2 -> C1 aktif & teruji tanpa crash | **LULUS** (100%) |
| **Content Integrity Gate** | 4/4 gerbang integritas konten lulus | `node tests/content-integrity-gate.js` 100% HIJAU | **LULUS** (100%) |
| **Onboarding Suite** | 56 assertions onboarding valid | `node tests/onboarding-test.js` PASS | **LULUS** (100%) |
| **Placement Accuracy Suite** | Kurva IRT & penempatan akurat | `node tests/placement-accuracy-test.js` PASS | **LULUS** (100%) |
| **Back Nav & Exam Lock Gates** | Navigasi mundur & kunci ujian konsisten | `tests/back-nav-test.js` & `tests/exam-lock-test.js` PASS | **LULUS** (100%) |
| **Hexa-Sync Arbiter** | 6 titik build kanonikal selaras | `tools/bump-build.mjs --check` `m025-712` SELARAS | **LULUS** (100%) |
| **Cache Version Sync** | 33 penegasan lulus di seluruh HTML & skrip | `node tests/curriculum-cache-version-test.js` 33/33 LULUS | **LULUS** (100%) |
| **Golden Baseline Indonesia** | Literal Indonesia utuh tanpa regresi | `node tests/id-golden-snapshot-test.js` HIJAU | **LULUS** (100%) |
| **Gate Registry Invariant** | 403 gerbang valid tanpa gerbang hantu | `node tests/gate-registry-test.js` PASS (10/10) | **LULUS** (100%) |

---

## 3. Visual Verification Artifacts

- Mobile Home Screenshot: `m025-712-home-mobile.png` (390 × 844 px)
- Desktop Home Screenshot: `m025-712-home-desktop.png` (1280 × 800 px)
- Mobile Vocab Hub: `m025-712-vocab-mobile.png` (390 × 844 px)
- Mobile Grammar Hub: `m025-712-grammar-mobile.png` (390 × 844 px)
- Mobile Kana Hub: `m025-712-kana-mobile.png` (390 × 844 px)
- iPhone SE Quick-Win Lesson: `audit-iPhone-SE-qw-q1.png` (375 × 667 px)
- iPhone 14 Quick-Win Lesson: `audit-iPhone-14-qw-q1.png` (390 × 844 px)
- Topbar Scroll Fixed Verification: `audit-scroll-home.png`, `audit-scroll-vocab.png`, `audit-scroll-grammar.png`
