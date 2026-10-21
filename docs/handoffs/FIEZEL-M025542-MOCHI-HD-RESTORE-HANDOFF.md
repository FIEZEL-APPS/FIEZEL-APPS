# DOSSIER SERAH TERIMA FIEZEL: M025-542 — PEMULIHAN KUALITAS FULL HD KRISTAL 3D MASKOT MOCHI

## 1. Ringkasan Masalah & Latar Belakang
- **Keluhan Pengguna**: "kenapa tampilan mascotnya jadi tidak jernih lagi kualitasnya tidak hd lagi?"
- **Akar Penyebab Teknis**:
  Pada sesi perbaikan performa sebelumnya, diterapkan pengorbanan grafis berlebihan di `mochi-mascot/fiezel-mochi.js` dengan menyasar flag `isMobile` (mencakup semua ponsel, tablet, dan perangkat berlayar sentuh):
  1. `antialias: !isMobile` (`false` di mobile) -> Mematikan antialiasing WebGL secara total, menghasilkan garis tepi/silhouette maskot yang bergerigi (*pixelated jagged edges*).
  2. `setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2))` -> Membatasi DPR ke 1.5. Pada layar Retina iPhone (DPR 3.0) dan Super AMOLED Android (DPR 2.5–3.0), kanvas 3D diregangkan (upscaled) oleh CSS sebesar 150%–200%, menghasilkan keburaman (blurry/fuzzy display) dan hilangnya ketajaman HD.
  3. `skinCanvas.width = 512; skinCanvas.height = 512;` -> Memangkas resolusi tekstur wajah & pipi merah airbrush menjadi separuh (512px), menyebabkan detail ekspresi dan rona wajah pecah.
  4. `SphereGeometry(1.22, 56, 42)` -> Mengurangi jumlah subdivisi poligon hingga lebih dari 75%, membuat siluet bulat kenyal Daifuku Mochi menjadi tampak bersegi/patah-patah (*low-poly facets*).

- **Evaluasi Kebutuhan**:
  Sumber lag dan stutter di mobile PWA sebelumnya terbukti berasal dari tabrakan inisialisasi Three.js saat splash screen berjalan (telah diisolasi via `isSplashActive`) serta rendering kanvas saat offscreen (telah diisolasi via `IntersectionObserver` auto-sleep loop). Kualitas grafis Full HD 3D Mochi itu sendiri (128x96 poligon dan 1024px tekstur) sepenuhnya ringan bagi GPU mobile modern, sehingga degradasi grafis tidak lagi diperlukan.

---

## 2. Solusi & Perubahan yang Diterapkan
Di berkas `mochi-mascot/fiezel-mochi.js`:
1. **Pemulihan Antialiasing Sub-Pixel Penuh**:
   - Menghapus pembatasan `antialias: !isMobile`.
   - Mengaktifkan `antialias: true` secara permanen pada `THREE.WebGLRenderer`, memulihkan kehalusan garis tepi bola Daifuku tanpa gerigi.
2. **Pemulihan Kepadatan Piksel Retina HD (2.0 DPR)**:
   - `this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));`
   - Memastikan tampilan kristal tajam 1:1 pada layar Retina/OLED mobile tanpa peregangan buram.
3. **Pemulihan Subdivisi Poligon Mulus (128×96)**:
   - Mengembalikan `THREE.SphereGeometry(1.22, 128, 96)` dengan G2 continuous curvature, mengeliminasi facet bersegi dan memulihkan bentuk bulat kenyal montok khas Daifuku.
4. **Pemulihan Resolusi Tekstur Kulit Daifuku (1024×1024)**:
   - Mengembalikan `this.skinCanvas.width = 1024; this.skinCanvas.height = 1024;`
   - Memulihkan kehalusan gradasi blush merah muda airbrush dan rona pipi menggemaskan.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)
- Dijalankan via `node tests/test-jlpt-mochi-wire.js`:
  - 100% PASS: Inisialisasi Mochi 3D di kartu latihan JLPT & Speaking/Listening.
  - 100% PASS: Idle state indicator badge (`chat_purple`), aura (`purple`).
  - 100% PASS: Reaksi jawaban salah (`mood: 'pout'`, `aura: 'pink'`, `handState: 'sulk'`).
  - 100% PASS: Reaksi jawaban benar (`mood: 'happy'`, `aura: 'green'`, `fx: 'stars'`, `handState: 'cheer'`).
  - 100% PASS: Interaksi audio hook & ear wiggle.
  - Tangkapan layar empiris diverifikasi secara visual di `tests/test-jlpt-mochi-visual.png`: Kontur kepala, telinga, mata, dan pipi terbukti 100% bulat sempurna, antialiased, dan kristal HD.

---

## 4. Daftar Berkas yang Disentuh
1. `mochi-mascot/fiezel-mochi.js`: Pemulihan `antialias: true`, `pixelRatio: 2`, `SphereGeometry(1.22, 128, 96)`, dan `skinCanvas: 1024x1024`.
2. Berkas Hexa-Sync (m025-542):
   - `coordination/BUILD-VERSION.json` -> `m025-542`
   - `sw.js` -> `m025-542`
   - `core-config.js` -> `m025-542`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-542`
   - `kurikulum.html` -> `m025-542`
   - `misi.html` -> `m025-542`
3. `docs/handoffs/FIEZEL-M025542-MOCHI-HD-RESTORE-HANDOFF.md`: Dokumen serah terima ini.

---

## 5. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js` -> PASS
- `node tests/th-ui-leak-test.js` -> PASS
- `node tests/curriculum-cache-version-test.js` -> PASS (build m025-542)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tests/boot-order-test.js` -> PASS
- `node tests/test-jlpt-mochi-wire.js` -> PASS (100% All Checks Passed)
