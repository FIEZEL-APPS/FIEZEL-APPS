# Berkas Serah Terima: FIEZEL-M025533-FLASHCARD-3D-CLEANUP-HANDOFF

## 1. Ringkasan Temuan Audit & Solusi
Rilis build **m025-533** menuntaskan perbaikan visual dan komputasi 3D pada flashcard kosa kata di PWA seluler:

1. **Eliminasi Cacat Tumpukan Kartu Statis (Pseudo-Element Stacking & Clipping)**:
   - **Akar Masalah**: Pada PR sebelumnya (`#537` / commit `0da186cd`), ditambahkan pseudo-element `.flashcard::before` (`translateY(7px) scale(0.965)`) dan `.flashcard::after` (`translateY(14px) scale(0.93)`) untuk menciptakan efek dekoratif tumpukan kartu fisik (*card deck layering*).
   - **Cacat Visual 3D**: Karena pseudo-element ini melekat pada kontainer induk `.flashcard` (bukan `.flash-inner`), pseudo-element ini **tidak ikut berputar** ketika kartu berotasi (`transform: rotateY(180deg)`).
   - Saat kartu berputar di kuadran $45^\circ - 135^\circ$ (terutama tegak lurus pada $90^\circ$), sebagian bidang kartu berayun ke ruang koordinat Z negatif ($Z < 0$). Akibatnya, pseudo-element statis pada bidang $Z = 0$ menembus, menimpa, dan memotong kartu yang sedang berotasi, menciptakan ilusi kartu menumpuk kaku yang berantakan dan merusak pengalaman pengguna di HP.
   - **Solusi**: Menghapus dan menonaktifkan total kedua pseudo-element dengan `display: none !important; content: none !important;` pada `style.css` dan `features/ui/mobile-edge-fit.css`.

2. **Penyempurnaan Rotasi GPU Hardware Backface Culling (Zero Abrupt Opacity)**:
   - **Akar Masalah**: Sebelumnya terdapat aturan `.flashcard.flipped .flash-front { opacity: 0 !important; }` dan sebaliknya yang mematikan opasitas wajah kartu secara mendadak saat kartu baru mulai dibalik, mengakibatkan wajah kartu memudar menjadi transparan sebelum rotasi selesai.
   - **Solusi**: Mengandalkan kemampuan bawaan GPU mobile melalui `backface-visibility: hidden` dan `-webkit-backface-visibility: hidden;` dengan pemisahan bidang `translateZ(1px)`.
   - Mengganti aturan opasitas dengan isolasi interaksi pointer murni:
     ```css
     .flashcard:not(.flipped) .flash-back { pointer-events: none !important; }
     .flashcard.flipped .flash-front { pointer-events: none !important; }
     ```
     sehingga kedua muka kartu tetap memiliki `opacity: 1` penuh sepanjang lintasan rotasi 3D dan hanya bertukar muka secara alami di sudut $90^\circ$.

---

## 2. Bukti Pengujian Empiris (Playwright Headless)
1. **Pengujian Milestone 3D Flip & Diagnostik Tumpukan**:
   ```bash
   node tests/test-flashcard-compare.mjs
   ```
   *Hasil Tangkapan Layar*:
   - `01-current-resting.png`: Tampilan awal kartu.
   - `02-current-flip-45deg-defect.png`: Terbukti kartu statis di belakang memotong kartu yang sedang berputar.
   - `03-current-flip-90deg-penetration.png`: Terbukti kartu statis raksasa tertinggal di belakang saat kartu berposisi tegak lurus ($90^\circ$).
   - `06-clean-flip-45deg.png`: Rotasi $45^\circ$ bersih tanpa ada bayangan kartu kaku di belakang.
   - `07-clean-flip-90deg.png`: Sudut $90^\circ$ murni satu bidang tipis tanpa tumpukan mengganjal.
   - `08-clean-flipped-180deg.png`: Pendaratan sempurna di sisi belakang.

2. **Pengujian Alur Murid Sungguhan (Touch Emulation 390x844)**:
   ```bash
   node tests/test-real-user-flashcard-flow.mjs
   ```
   *Hasil Telemetri*:
   - `pseudoBefore`: `display: none`, `content: none`, `boxShadow: none`, `background: none`.
   - `pseudoAfter`: `display: none`, `content: none`, `boxShadow: none`, `background: none`.
   - `frontOpacity`: `1` konstan sepanjang putaran (0ms - 600ms).
   - `backOpacity`: `1` konstan sepanjang putaran (0ms - 600ms).
   - `innerTransformStyle`: `preserve-3d`.
   - `frontBackface` & `backBackface`: `hidden`.

---

## 3. Berkas yang Dimodifikasi
1. `style.css`:
   - Penonaktifan `.flashcard::before, .flashcard::after` (`display: none !important; content: none !important;`).
   - Penyelarasan pointer-events tanpa pemaksaan opasitas 0 pada `.flash-front` dan `.flash-back`.
2. `features/ui/mobile-edge-fit.css`:
   - Penonaktifan `.flashcard::before, .flashcard::after` (`display: none !important; content: none !important;`).
   - Penyelarasan pointer-events tanpa pemaksaan opasitas 0 pada `.flash-front` dan `.flash-back`.
3. Hexa-Sync Rilis Arbiter:
   - `coordination/BUILD-VERSION.json` (`m025-533`)
   - `sw.js` (`SW_REV='m025-533-...'`)
   - `core-config.js` (`self.FIEZEL_PAGE_BUILD='m025-533'`)
   - `features/neural-voice/fiezel-diag-panel.js` (`var DIAG_BUILD = 'm025-533'`)
   - `kurikulum.html` (`?v=m025-533`)
   - `misi.html` (`?v=m025-533`)

---

## 4. Verifikasi Gerbang Mutu Lokal & Hexa-Sync
- Hexa-Sync Arbiter (`node tools/bump-build.mjs --check`):
  ```json
  {
    "sumber": "m025-533",
    "terpasang": {
      "sw.js": "m025-533",
      "core-config.js": "m025-533",
      "features/neural-voice/fiezel-diag-panel.js": "m025-533"
    },
    "selaras": true
  }
  ```
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (Zero leak)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, 2 halaman, build m025-533)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `git diff --check`: **PASS (0 trailing whitespace)**

---

## 5. Otoritas OWNER/MASTER & Status Rilis
- **Status Mutu**: READY FOR MERGE (Semua gerbang hijau, hexa-sync m025-533 valid).
- **Otoritas**: MASTER & OWNER compliance verified.
- **Git Protection Rule**: Perubahan diajukan melalui Pull Request resmi ke branch `main`.
- **Zero-Dumbing Invariant**: Seluruh telemetri Braincore (BKT, IRT, OLM) tetap terjaga tanpa bypass.
- **PWA Hexa-Sync Arbiter**: Seluruh 6 titik versi tersinkronisasi murni via `tools/bump-build.mjs`.
- **Langkah Berikut (Next Steps)**: Buka PR ke `main`, pantau CI 100% hijau, lakukan squash merge, dan verifikasi deployment situs di `https://fiezel.my.id/app/`.
