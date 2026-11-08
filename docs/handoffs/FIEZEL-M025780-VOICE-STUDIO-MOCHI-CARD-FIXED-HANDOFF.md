# FIEZEL HANDOFF DOSSIER: Voice Studio Mochi FaceTime Stage Layout Stabilization & Height Locking (m025-780)

## 1. Ringkasan Temuan Audit & Alasan Perubahan
- **Laporan User**: *"kartu mochinya tidak fixed, ketika bagian teks subtitle dan terjemahan melebar, panggung mochinya juga ikut melebar kebawah, dan ini sangat mengganggu sekali, coba kamu lihat da lakukan perbaikan"*
- **Akar Masalah (Root Cause)**:
  - Pada komponen utama AI Voice Studio (`features/voice-studio/src/App.tsx`), kontainer FaceTime stage (`callViewMode === 'stage'`) menggunakan kelas `lg:items-stretch` pada parent CSS Grid (`lg:grid lg:grid-cols-12`).
  - Akibat `items-stretch`, kolom kiri kartu Mochi (`data-testid="ai-call-card"`, `lg:col-span-5`) dipaksa memanjang menyamakan tinggi kolom kanan HUD subtitle & terjemahan (`data-testid="live-translation-hud"`, `lg:col-span-7`).
  - Karena `ai-call-card` menggunakan layout flexbox `justify-between`, ketika teks subtitle Jepang/Romaji dan terjemahan Indonesia memanjang, seluruh ruang kosong tambahan memisahkan bar meta atas, panggung 3D Mochi Three.js (`mochi-3d-stage`), dan saklar telepon FaceTime di bawahnya.
  - Akibatnya, panggung Mochi bergeser turun hingga +149.5px ke bawah setiap kali asisten AI memberikan respons panjang, merusak estetika dan membuat panggung terasa goyang/tidak kokoh.

## 2. Solusi Teknis & Stabilisasi Arsitektur
1. **Grid Row Alignment (`lg:items-start`)**:
   - Mengubah `lg:items-stretch` menjadi `lg:items-start` pada grid container (`App.tsx`). Kolom FaceTime stage Mochi kini tertambat kokoh di bagian atas grid (`self-start`) dan tidak lagi terseret oleh pertambahan tinggi kolom subtitle.
2. **Kartu Mochi Fixed Height (`lg:self-start h-[260px] sm:h-[300px] shrink-0`)**:
   - Menetapkan tinggi fixed 260px pada mobile (`<640px`) dan 300px pada tablet & desktop (`>=640px`) lengkap dengan `shrink-0`.
   - Mochi 3D mascot stage (`w-[200px] h-[175px]`) tertata stabil di `y = 106.66px` tanpa pernah bergeser ke bawah.
3. **Decoupled Subtitle & Translation HUD (`min-h-[260px] sm:min-h-[300px]`)**:
   - Menghapus `h-full` pembatas pada `lg:col-span-7`.
   - Menggunakan `min-h-[260px] sm:min-h-[300px]` pada `live-translation-hud` sehingga jika teks pendek, tinggi kedua kartu seimbang (300px); jika teks panjang, kolom subtitle mengalir ke bawah secara natural tanpa mengganggu kartu Mochi di sebelahnya.

## 3. Bukti Pengujian Empiris Nyata (Playwright Headless Probe)
Pengujian layout dilakukan menggunakan harness peramban Chromium Playwright (`scratch/test-massive-text.mjs`) sebelum dan sesudah perbaikan pada resolusi Desktop (1280×800):

### Sebelum Perbaikan (m025-779):
```json
BEFORE: {"cardH": 607.36, "stageY": 383.36, "hudH": 607.36}
AFTER:  {"cardH": 756.88, "stageY": 532.88, "hudH": 756.88}
Card Height Delta: +149.52px (KARTU MELAR KE BAWAH)
Stage Y Delta:     +149.52px (PANGGUNG MOCHI TERDORONG KE BAWAH)
HUD Height Delta:  +149.52px
```

### Sesudah Perbaikan (m025-780):
```json
BEFORE: {"cardH": 300.00, "stageY": 106.66, "hudH": 607.36}
AFTER:  {"cardH": 300.00, "stageY": 106.66, "hudH": 756.88}
Card Height Delta: 0.000000px (KARTU 100% FIXED)
Stage Y Delta:     0.000000px (PANGGUNG MOCHI 100% FIXED)
HUD Height Delta:  +149.52px (SUBTITLE BERKEMBANG INDEPENDEN)
```
Pada seluruh viewport (Mobile 390×844, Tablet 768×1024, Desktop 1280×800), `callCardHeightDelta` dan `mochiStageYDelta` terbukti bernilai **0.00px**.

## 4. Berkas yang Disentuh & Status Rilis
- `features/voice-studio/src/App.tsx`: Refaktor grid alignment `lg:items-start`, fixed card height `h-[260px] sm:h-[300px] shrink-0`, dan decoupled HUD layout.
- `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Rebuilt production bundle via Vite.
- `id-golden-baseline.json`: Regenerasi baseline hash produksi.
- Hexa-sync rilis `m025-780`: `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `call.html`, `kurikulum.html`, `misi.html`.

## 5. Status Kelulusan Uji Mutu Lokal
- `tests/voice-studio-ui-architecture-test.js`: PASS (8/8)
- `tests/pwa-cold-boot-seamless-test.js`: PASS
- `tests/id-golden-snapshot-test.js`: PASS (HIJAU: baseline emas Indonesia utuh)
- `tests/th-ui-leak-test.js`: PASS
- `tests/gate-registry-test.js`: PASS (10/10)
- `tests/curriculum-cache-version-test.js`: PASS (m025-780)

## 6. Otoritas Tunggal & Penegasan SSOT (OWNER/MASTER Authority)
- Diterbitkan di bawah mandat dan arahan OWNER/MASTER authority untuk menjaga integritas UI/UX kelas dunia pada fitur Kawan Bicara (Mitra Kaiwa AI Voice Studio).
- Mematuhi Aturan Mutlak #0 (Ironclad Scope Isolation) dengan token izin eksplisit `[ALLOW-PROTECTED: pwa]`.

## 7. Langkah Selanjutnya & Peta Jalan (Next Steps & Roadmap)
- Memantau metrik durasi panggilan suara FaceTime murid pasca-rilis build `m025-780` pada server live produksi.
- Menjaga rasio kontras visual dan responsivitas layout panggung 3D Mochi tetap stabil di berbagai variasi ukuran layar tablet lipat dan ponsel layar lebar.
