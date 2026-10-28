# FIEZEL HANDOFF DOSSIER: DESKTOP ONBOARDING OVERLAP & GAP FIX (m025-695)

## 1. Ringkasan Temuan Audit & Akar Masalah
Pengguna memberikan koreksi visual langsung pada `mockups/japanese-onboarding-desktop.png`:
1. **Region 1 (Menimpa Teks Di Belakangnya)**: Tombol `< Kembali` di header onboarding menimpa teks `"LANGKAH 2 DARI 4"` di baris stepper di belakangnya.
   - *Akar Masalah*: File `features/ui/fiezel-tactile-clay.css` memiliki selektor global `button:not(...)` dengan spesifisitas tinggi (`0-40-1`) yang memaksakan gaya 3D clay (`background: #FFFFFF !important; border: 2px solid ...; box-shadow: 0 4px 0 ...; padding: 13px 18px !important;`). Akibatnya tombol `< Kembali` membesar menjadi tinggi 48px pada wadah `.fiezel-topbar` yang tingginya hanya 24px, sehingga meluap ke bawah (*overflow*) dan menutupi teks stepper.
2. **Region 0 (Celah Kosong / Dead Space)**: Celah kosong berlebih (*dead white void*) setinggi ~50px antara stepper dan panggung maskot `.fiezel-stage`.
   - *Akar Masalah*: Pada viewport desktop (1280x800) dan tablet (768x1024), elemen `.fiezel-stage` memiliki padding vertikal bawaan besar dan maskot `104px`, menyebabkan tinggi total tumpukan vertikal melampaui 800px dan menciptakan rongga kosong yang canggung di layar desktop.

---

## 2. Perubahan & Solusi Sistemik
1. **Isolasi `.fiezel-back` & `.fiezel-skip` dari Aturan Tombol Global**:
   - Di `features/ui/fiezel-tactile-clay.css`: Ditambahkan `:not(.fiezel-back):not(.fiezel-skip)` pada baris 182 dan 195 agar tidak terpengaruh gaya clay 3D.
   - Di `fiezel-2.css`: Ditambahkan reset eksplisit berdaya tuntas:
     ```css
     body button.fiezel-back,
     body button.fiezel-skip,
     body.fz-lux button.fiezel-back,
     body.fz-lux button.fiezel-skip {
       background: transparent !important;
       border: none !important;
       box-shadow: none !important;
       border-radius: 6px !important;
       padding: 4px 8px !important;
       min-height: 28px !important;
       height: 28px !important;
       min-width: auto !important;
       color: var(--fz-ink-muted, #64748B) !important;
       font-size: 13px !important;
       font-weight: 600 !important;
       display: inline-flex !important;
       align-items: center !important;
       gap: 4px !important;
     }
     body button.fiezel-back:hover,
     body button.fiezel-skip:hover {
       background: rgba(15, 23, 42, 0.05) !important;
       color: var(--fz-ink, #0F172A) !important;
     }
     body button.fiezel-back:focus-visible,
     body button.fiezel-skip:focus-visible {
       outline: 2px solid #2563EB !important;
       outline-offset: 2px !important;
     }
     ```
2. **Harmonisasi Hierarki Vertikal & Penataan Multi Universal Device**:
   - Di `style.css`:
     - `@media (min-width: 768px)` ditata ulang:
       * `.fiezel-ob`: `display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 16px 20px 20px;`
       * `.fiezel-topbar`: `min-height: 28px; padding: 2px 16px; margin: 0 auto;`
       * `.fiezel-stepper`: `padding: 4px 16px 2px; margin: 0 auto;`
       * `.fiezel-stage`: `padding: 4px 16px 2px;` dengan maskot 64px dan gelembung sapaan kompak 12px.
       * `.fiezel-sheet`: `margin: 6px auto 16px; max-width: 500px;`
     - Bounding rect Playwright membuktikan:
       * `back.bottom = 118px` vs `stepper.top = 124px` -> **NOL OVERLAP** (jarak bersih 6px).
       * Tinggi total onboarding stack di desktop: ~622px -> **Muat 100% pada layar 800px tanpa scroll** (`advBottom = 753px <= 800px`).

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright)
Jalankan pengujian empiris multi-device:
```bash
node tools/dev/probe-japanese-onboarding.mjs
```
Hasil audit empiris:
1. **Desktop 1280x800**:
   - `left: 390px, width: 500px, right: 890px` untuk seluruh komponen (rata tengah absolut).
   - `overlap: false` antara `< Kembali` dan `"LANGKAH 2 DARI 4"`.
   - `fitsInViewport: true` (seluruh kartu dan tombol CTA "Lanjut" tampil tanpa scrolling).
2. **Tablet 768x1024**:
   - Rata tengah sempurna, tinggi kartu 622px (60% layar), bebas scroll.
3. **Standar Mobile 390x844 (iPhone 15)**:
   - `advBottom: 753.9px <= 844px` (`fits: true`).
4. **Compact Mobile 375x667 (iPhone SE)**:
   - `advBottom: 521.9px <= 667px` (`fits: true`).

---

## 4. Status Gerbang Mutu Lokal (Hexa-Sync m025-695)
- `node tools/bump-build.mjs --check`: **PASS (Selaras)**
  - `coordination/BUILD-VERSION.json`: `m025-695`
  - `sw.js`: `m025-695`
  - `core-config.js`: `m025-695`
  - `features/neural-voice/fiezel-diag-panel.js`: `m025-695`
  - `kurikulum.html`: `m025-695`
  - `misi.html`: `m025-695`
  - `call.html`: `m025-695`
- `node tests/a11y-test.js`: **PASS**
- `node tests/onboarding-test.js`: **PASS**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS**
- `node tests/multi-device-comfort-test.js`: **PASS**
