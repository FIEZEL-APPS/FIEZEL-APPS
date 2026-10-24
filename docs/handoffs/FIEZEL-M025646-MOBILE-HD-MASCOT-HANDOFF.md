# FIEZEL HANDOFF DOSSIER: BUILD M025-646

**Tanggal**: 24 Oktober 2026
**Cakupan**: Universal HD Retina Upgrade untuk Maskot 3D Mochi (Eliminasi Burik / Jagged di Mobile)
**Nomor Build**: `m025-646`
**Hexa-Sync**: Selaras (sw.js, core-config.js, fiezel-diag-panel.js, kurikulum.html, misi.html, call.html)

---

### 1. Latar Belakang & Masalah
Sebelum rilis ini, maskot 3D Mochi terlihat sangat tajam dan HD di desktop, namun tampak kabur, buram, dan bergerigi tajam ("burik") di perangkat mobile/smartphone.

Penyebab teknis:
1. **Anti-Aliasing Dimatikan di Mobile (`antialias: !IS_MOBILE`)**:
   Three.js `WebGLRenderer` mematikan hardware MSAA di mobile, menghasilkan tepi siluet Mochi dan aksesorisnya yang bergerigi tangga piksel (*jaggies*).
2. **Device Pixel Ratio (DPR) Dibatasi ke 1.5 (`setPixelRatio(1.5)`)**:
   Layar smartphone modern umumnya memiliki DPR 2.5x hingga 3.0x (Retina / AMOLED). Pembatasan ke 1.5 menyebabkan kanvas di-render pada resolusi rendah lalu di-stretch oleh peramban sehingga buram/pecah.
3. **Resolusi Tekstur Wajah Dipotong (`SKIN_RES: 512px` vs `1024px`)**:
   Tekstur kanvas 2D untuk mata, senyum, dan blush pipi di mobile hanya 512x512, memotong 75% detail piksel wajah.
4. **Kepadatan Poligon Dipotong 80% (`SphereGeometry: 56x42` vs `128x96`)**:
   Jumlah poligon bola Mochi di mobile dipotong dari 12.288 menjadi 2.352 segmen, membuat siluetnya kaku dan bersegi.
5. **Skala Badge Dipangkas (`BADGE_SCALE: 0.5`)**:
   Kanvas badge berpikir dirender hanya 256x160 di mobile.

---

### 2. Perubahan yang Dilakukan
Di `mochi-mascot/fiezel-mochi.js` dan aset Android yang disinkronkan:
1. **Universal Hardware MSAA Anti-Aliasing**:
   Mengaktifkan `antialias: true` pada `WebGLRenderer` untuk seluruh perangkat (desktop, tablet, dan mobile) sehingga siluet Mochi dan aksesorisnya halus mulus bebas jaggies.
2. **Universal Crisp Retina Pixel Ratio**:
   Menaikkan pixel ratio mobile ke `Math.min(window.devicePixelRatio || 1, 2.0)` sehingga tampilan di layar HP Retina/AMOLED sejernih desktop tanpa membebani termal GPU.
3. **Full 1024px Skin Texture**:
   Menyamakan resolusi kanvas wajah dan perona pipi ke `SKIN_RES = 1024` secara universal.
4. **Full 128x96 Sphere Geometry**:
   Menyamakan kepadatan poligon daifuku ke `128x96` secara universal untuk kelengkungan tubuh yang mulus sempurna.
5. **Full 1x Badge Resolution**:
   Menyetel `BADGE_SCALE = 1` agar gelembung berpikir dirender tajam pada 512x320.

---

### 3. Bukti Verifikasi Empiris (Playwright Visual Snapshot)
Diuji dengan probe headless Playwright pada viewport mobile (430x932 - iPhone 14/15 Pro Max):
- `tests/output/mochi_pencil_writing.png`: Tepi antialiased mulus, pensil heksagonal tajam, blush gradasi lembut.
- `tests/output/mochi_headset_listening.png`: Headband melengkung halus, earcup bercahaya cyan tajam, boom mic presisi.
- `tests/output/mochi_glasses_reading.png`: Frame kacamata bulat tipis anime mulus tanpa gerigi.
- `tests/output/mochi_thinking_badge.png`: Badge ungu berkilau tajam dengan 3 titik berpikir yang jernih.
- `tests/output/mochi_talking_mouth.png`: Mulut berartikulasi membuka-menutup dengan kontur halus.

---

### 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS (baseline emas Indonesia utuh)
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman)
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
- `node tests/build-number-uniqueness-test.js`: PASS (m025-646 naik monoton)
- `node tests/test-all-practices-mochi-wire.js`: PASS (5/5 skenario interaktif sukses)
- `node tests/android-asset-bundle-test.js`: PASS (4114 penegasan selaras)
