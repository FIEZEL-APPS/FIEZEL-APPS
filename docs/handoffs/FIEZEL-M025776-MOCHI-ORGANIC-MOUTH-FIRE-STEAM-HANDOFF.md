# FIEZEL HANDOFF DOSSIER: M025-776
**Topik**: Continuous Organic Viscoelastic Mouth Morph Rig, Demon Inferno, Anime Steam Puffs, and Paws Cleanup
**Build**: `m025-776`
**Status**: HIJAU / Production Ready
**Tanggal**: 8 November 2026

---

## 1. Ringkasan Eksekutif & Permintaan Pengguna

Pengguna memberikan dua masukan utama terhadap maskot 3D Mochi:
1. **Mulut Berbicara**:
   - *Masalah*: Sebelumnya mulut Mochi berganti secara diskret antar sprite viseme statis (A, I, U, E, O, BMP) dan mesh 3D lawas (`mouthHappy`, `mouthW`, `mouthO`) berkedip dengan kecepatan tinggi (14Hz–22Hz), memberikan kesan patah-patah seperti flipbook/gambar video yang disambung.
   - *Solusi*: Mengimplementasikan sistem **Continuous Organic Viscoelastic 3D Mouth Morph Rig** (`this.mouthRig`: `open`, `width`, `roundness`, `tongueY`) yang digerakkan oleh pegas harmonik teredam (`stepSpring`, $\omega = 16.0, \zeta = 0.72$) pada frekuensi wicara alami (~3.4 suku kata/detik) dengan jeda nafas halus, rongga mulut maroon velvet berbayang 3D yang mendalam, lidah merah muda lembut, dan **100% tanpa gigi (toothless)**.
2. **Kobaran Api & Asap Telinga (Transformasi Kemarahan)**:
   - *Masalah*: Api kobaran inferno di belakang demon `Sangat Marah` sempat hilang/tertutup, dan asap telinga pada `Marah` sempat memunculkan gumpalan 3D putih di dalam lubang telinga.
   - *Solusi*:
     - Menghapus seluruh gumpalan putih di dalam lubang telinga; saluran telinga bagian dalam dijaga tetap bersih dan higienis.
     - Mengembalikan kobaran api demon inferno yang membubung tinggi di belakang tanduk dan kepala pada `auraBackCanvas` / `auraBackMesh` untuk `sangat_marah`.
     - Menambahkan aura api anime dan lidah api yang membubung melewati bahu dan telinga untuk `marah` (tahap 2).
     - Menempatkan anime steam puffs berwarna slate grey (`#64748B` / `#94A3B8`) dengan kilau sabit putih di atas puncak kepala yang mengapung di udara di belakang/atas telinga pada `auraBackMesh`, sehingga dahi dan wajah Mochi tetap 100% bersih dengan tanda urat kemarahan merah 💢 di pelipis kanan atas.
3. **Mandat Tangan Mochi**:
   - Mematuhi perintah pengguna untuk menyembunyikan tangan pada 12 ekspresi lainnya (`handPose: 'hidden'`), dan HANYA memunculkan tangan pada 3 ekspresi kanon:
     - `Gembira`: Dua tangan mengapung gembira (cheer).
     - `Senang`: Satu tangan melambai ramah (wave).
     - `Kaget`: Dua tangan terangkat kaget (surprised).

---

## 2. Berkas yang Dimodifikasi

1. `mochi-mascot/fiezel-mochi.js`:
   - Penambahan `this.mouthRig` (`open`, `width`, `roundness`, `tongueY`).
   - Implementasi `drawOrganicMochiMouth3D()` untuk render rongga mulut berkelanjutan 3D toothless.
   - Perbaikan `updateMouthMotion()` dengan pegas teredam $\omega = 16.0, \zeta = 0.72$ dan irama wicara ~3.4 suku kata/detik.
   - Perbaikan `renderBackAuraAndFire()` untuk render kobaran api inferno demon (`sangat_marah`) dan aura api + steam puffs melayang (`marah`).
   - Pembersihan saluran telinga di `createEarSteam()`.
2. `mochi-mascot/index.html` & `mochi-mascot/preview.html`:
   - Penyelarasan render storyboard ekspresi dan penambahan tombol "🎙️ Mulai Bicara Alami (Fluid Speech)" pada live studio.
   - Penyelarasan `captureSpeakingMochiDataUrl()` untuk menggerakkan morph rig mulut.
3. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Kenaikan nomor build sinkron ke `m025-776`.

---

## 3. Hasil Pengujian & Verifikasi Mutu

- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan)
- `node tests/id-golden-snapshot-test.js`: PASS (baseline emas utuh)
- `node tests/th-ui-leak-test.js`: PASS (4751 kunci utuh)
- `node tests/gate-registry-test.js`: PASS (429 gerbang terdaftar)
- `node tests/mochi-voice-sos-test.js`: PASS (27/27 assertions)
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync Selaras)
- Inspeksi visual tangkapan layar Playwright:
  - `mochi-15-expressions-storyboard.png`: Kobaran inferno demon dan api marah tampil sempurna; uap telinga mengapung anggun; tangan hanya ada pada gembira, senang, dan kaget.
  - `mochi-speaking-12-visemes.png`: 12 bentuk fonetik mulut toothless rapi dan proporsional.
  - `mochi-live-3d-studio.png`: Studio 3D interaktif berfungsi penuh.
