# FIEZEL HANDOFF DOSSIER: SHINOBI-GRADE UNIVERSAL ZERO-SCROLL ONBOARDING
- **Nomor Build**: `m025-696`
- **Branch**: `feat/shinobi-minimalist-universal-onboarding-m025-698`
- **Tanggal**: 2026-10-28
- **Status Gate**: 100% HIJAU (Hexa-Sync verified, 6 local quality gates pass, 4 device form factors pass)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Menindaklanjuti instruksi eksplisit dan umpan balik pengguna:
- *"OI TOLOL INGAT UI DAN UX NYA HARUS SIMPEL SEPERTI SHINOBI ITU, JANGAN SAMPAI HARUS SCROLLLING, HARUS PAS DI LAYAR MOBILE, DAN DESIGNNYA HARUS MENYESUAIKAN MULTI UNIVERSAL DEVICE, PAHAM TIDAK TOLOL"*
- *"ADA TEKS YANG TIDAK TERLIHAT, DAN JANGAN PAKE EMOTICON MURAHAN"*
- *"INTINYA BUATKAN SEMINIMALIS MUNGKIN DAN RAPI DAN EKSLUSIF"*

Ditemukan dan diperbaiki 4 akar masalah sistemik:
1. **Regresi Teks Putih di Atas Putih (Zero Contrast Failure)**:
   - Pada `features/ui/mobile-edge-fit.css`, selector `.fiezel-sheet:not(.fiezel-language-sheet) .fiezel-title` memaksakan warna teks `#FFFFFF !important` tanpa batasan media query, sehingga di layar desktop/tablet yang menggunakan kartu putih (`background: #FFFFFF`), judul dan teks di Langkah 1 (Nama), Langkah 2 (Kursus), Langkah 3 (Tujuan & Level), serta Langkah 4 (Jalur Belajar) menjadi **100% tidak terlihat / kasat mata**.
   - **Perbaikan**: Mengurung aturan sheet gelap di dalam `@media (max-width: 767px)` dan menambahkan penegasan kontras tinggi `#0F172A` (charcoal), `#475569` (slate), dan `#64748B` di `@media (min-width: 768px)`.
2. **Eliminasi Total Emoticon Murahan (100% Emoji-Free Onboarding)**:
   - Menghapus emoji `🌱` ("Mulai dari Nol") dan `🎯` ("Tes Penempatan") di Langkah 4 (`placementMarkup`).
   - Menggantinya dengan kartu taktil minimalis berstandar *Shinobi / Apple Design*:
     * Badge judul tipografi bersih (`font-weight: 700`).
     * Count pill mikro yang elegan (`12 soal` dengan wadah amber halus `#FEF08A` di desktop).
     * Tombol aksi taktil berukuran kompak (`min-height: 40px`).
3. **Penyelarasan Multi Universal Device & Zero-Scrolling Across All 4 Steps**:
   - **Mobile SE (375x667)**: Semua langkah (1, 2, 3, 4) muat 100% di dalam layar tanpa scrolling sama sekali:
     * Step 1: `advBottom = 291.5px <= 667px` (`fits: true`)
     * Step 2: `advBottom = 519.9px <= 667px` (`fits: true`)
     * Step 3: `advBottom = 521.5px <= 667px` (`fits: true`)
     * Step 4: `skipBottom = 586.2px <= 667px` (`fits: true`)
   - **Mobile Standard (390x844)**:
     * Step 1: `advBottom = 450.5px <= 844px` (`fits: true`)
     * Step 2: `advBottom = 751.9px <= 844px` (`fits: true`)
     * Step 3: `advBottom = 720.0px <= 844px` (`fits: true`)
     * Step 4: `skipBottom = 760.2px <= 844px` (`fits: true`)
   - **Tablet (768x1024)**:
     * Step 1: `advBottom = 752.2px <= 1024px` (`fits: true`)
     * Step 2: `advBottom = 899.9px <= 1024px` (`fits: true`)
     * Step 3: `advBottom = 833.0px <= 1024px` (`fits: true`)
     * Step 4: `skipBottom = 849.2px <= 1024px` (`fits: true`)
   - **Desktop (1280x800)**:
     * Step 1: `advBottom = 615.8px <= 800px` (`fits: true`)
     * Step 2: `advBottom = 753.5px <= 800px` (`fits: true`)
     * Step 3: `advBottom = 691.0px <= 800px` (`fits: true`)
     * Step 4: `skipBottom = 712.8px <= 800px` (`fits: true`)
4. **Pemisahan Total Tombol Kembali & Stepper (Zero Overlap)**:
   - Tombol `.fiezel-back` di Langkah 2, 3, dan 4 dikecualikan dari tombol clay 3D 48px dan direset menjadi link teks transparan (`height: 28px`), duduk rapi di atas `LANGKAH X DARI 4` dengan buffer 6px tanpa pernah menimpa teks.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Multi-Device Probe)

Dieksekusi via `tools/dev/probe-onboarding-full-journey.mjs`:
```
[PROBE] Server running on port 14483

========================================
[AUDIT] Starting Audit for Mobile-SE (375x667)
========================================
[STEP 1 Mobile-SE]: { step: 1, title: 'Halo! Aku Mochi. Nama kamu siapa?', fits: true, advBottom: 291.5, h: 667 }
[STEP 2 Mobile-SE]: { step: 2, title: 'Mau belajar bahasa apa?', fits: true, advBottom: 519.9, h: 667 }
[STEP 3 Mobile-SE]: { step: 3, title: 'Apa tujuan kamu belajar?', fits: true, advBottom: 521.5, h: 667 }
[STEP 4 Mobile-SE]: {
  step: 4,
  title: 'Pilih Jalur Belajarmu',
  titleColor: 'rgb(255, 255, 255)',
  badges: [ { text: 'Mulai dari Nol', color: 'rgb(255, 255, 255)' }, { text: 'Tes Penempatan', color: 'rgb(255, 255, 255)' } ],
  fits: true,
  skipBottom: 586.2,
  h: 667
}

========================================
[AUDIT] Starting Audit for Mobile-Std (390x844)
========================================
[STEP 1 Mobile-Std]: { step: 1, fits: true, advBottom: 450.5, h: 844 }
[STEP 2 Mobile-Std]: { step: 2, fits: true, advBottom: 751.9, h: 844 }
[STEP 3 Mobile-Std]: { step: 3, fits: true, advBottom: 720.0, h: 844 }
[STEP 4 Mobile-Std]: { step: 4, fits: true, skipBottom: 760.2, h: 844 }

========================================
[AUDIT] Starting Audit for Tablet (768x1024)
========================================
[STEP 1 Tablet]: { step: 1, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 752.2, h: 1024 }
[STEP 2 Tablet]: { step: 2, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 899.9, h: 1024 }
[STEP 3 Tablet]: { step: 3, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 833.0, h: 1024 }
[STEP 4 Tablet]: { step: 4, titleColor: 'rgb(15, 23, 42)', bodyColor: 'rgb(71, 85, 105)', fits: true, skipBottom: 849.2, h: 1024 }

========================================
[AUDIT] Starting Audit for Desktop (1280x800)
========================================
[STEP 1 Desktop]: { step: 1, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 615.8, h: 800 }
[STEP 2 Desktop]: { step: 2, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 753.5, h: 800 }
[STEP 3 Desktop]: { step: 3, titleColor: 'rgb(15, 23, 42)', fits: true, advBottom: 691.0, h: 800 }
[STEP 4 Desktop]: {
  step: 4,
  title: 'Pilih Jalur Belajarmu',
  titleColor: 'rgb(15, 23, 42)',
  bodyColor: 'rgb(71, 85, 105)',
  badges: [ { text: 'Mulai dari Nol', color: 'rgb(15, 23, 42)' }, { text: 'Tes Penempatan', color: 'rgb(15, 23, 42)' } ],
  fits: true,
  skipBottom: 712.8,
  h: 800
}

>>> ALL MULTI UNIVERSAL DEVICE AUDITS FINISHED SUCCESSFULLY! <<<
```

---

## 3. Daftar Seluruh Berkas yang Disentuh & Perubahannya

1. `features/onboarding/fiezel-onboarding.js`:
   - Menghapus emoji `🌱` dan `🎯` di kartu pemilihan jalur belajar langkah 4.
2. `android/app/src/main/assets/public/features/onboarding/fiezel-onboarding.js`:
   - Penyelarasan aset Android identik.
3. `features/ui/mobile-edge-fit.css`:
   - Mengisolasi warna tema gelap `.fiezel-sheet` di `@media (max-width: 767px)` agar tidak membocorkan teks putih ke kartu desktop terang.
4. `android/app/src/main/assets/public/features/ui/mobile-edge-fit.css`:
   - Penyelarasan aset Android identik.
5. `style.css`:
   - Menambahkan aturan kontras tinggi charcoal `#0F172A` & slate `#475569` untuk semua judul, teks body, note, dan input di `@media (min-width: 768px)`.
   - Mengimplementasikan CSS grid 2-kolom taktil `.fiezel-placement-path-grid` dan `.fiezel-path-card` untuk langkah 4 (desktop/tablet 2 kolom berdampingan, mobile tumpuk vertikal berbingkai halus).
6. `android/app/src/main/assets/public/style.css`:
   - Penyelarasan aset Android identik.
7. Hexa-Sync Build Artifacts (`m025-696`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/onboarding-test.js`: PASS (57/57)
- `node tests/curriculum-cache-version-test.js`: PASS (build m025-696)
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
- `node tests/multi-device-comfort-test.js`: PASS (8 invarian terjaga)
- `node tools/bump-build.mjs --check`: PASS (`selaras: true`)

---

## 5. Otoritas MASTER / OWNER & Rencana Lanjut (Next Steps)

- **Otoritas**: MASTER / OWNER explicit authority for Shinobi universal onboarding release.
- **Rencana Lanjut**: Verifikasi CI GitHub Actions hingga 100% hijau, lakukan penggabungan (merge) PR ke branch `main`, dan konfirmasi deployment PWA live di CDN `https://fiezel.my.id/app/`.
