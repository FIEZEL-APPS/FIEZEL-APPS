# FIEZEL m025-657 Handoff: Prominent Wide Mochi Proportions and Expanded Hero Viewport

**Build:** `m025-657`
**Tanggal:** 24 Oktober 2026
**Status Mutu:** 100% HIJAU (Quality Gate: 395/395 Pass, 0 Fail)

---

## 1. Ringkasan Temuan Audit & Permintaan Pengguna

Pengguna meminta secara eksplisit:
*"DIMENSI MOCHINYA LEBARKAN LAGI UKURANNYA"*

### Analisis Teknis:
1. **Rasio Ukuran Maskot vs Kartu Beranda:**
   - Pada build sebelumnya, wrapper kontainer `.fz-vissol-mascot-wrap` hanya berukuran $122 \times 122\text{px}$, sementara kartu latar belakang Beranda memiliki lebar $\approx 396\text{px}$ dan tinggi $\approx 170\text{px}$.
   - Posisi kamera berada pada $Z = 5.80$ yang membuat tubuh Mochi hanya mencakup $\approx 58\%$ dari area kanvas kecil tersebut. Hal ini membuat Mochi terlihat kurang menonjol dan menyisakan banyak ruang kosong pasif di bagian kanan atas kartu.
2. **Proporsi Geometri Daifuku Mochi:**
   - Skala sumbu X dasar geometri daifuku di `createMochiMesh()` sebelumnya adalah $X \times 1.32$.
   - Agar Mochi terlihat lebih montok, bulat, empuk, dan menggemaskan (*chubby rice cake*), proporsi horizontal perlu dilebarkan secara organik menjadi $X \times 1.38$ dengan kurva daya G2 continuous yang lembut.

---

## 2. Solusi & Perubahan Arsitektur

1. **Pelebaran Dimensi Geometri Mochi (Plump & Chubby):**
   - Di `mochi-mascot/fiezel-mochi.js`, mengubah formula deformasi bola dasar menjadi $X \times 1.38, Y \times 1.04, Z \times 0.90$.
   - Menyelaraskan spline kurva bando headset (`headbandPoints`) dan posisi earcup ke $X = \pm 1.56$ agar melingkar presisi membingkai kepala Mochi yang lebih lebar tanpa tumpang tindih.
   - Menyesuaikan pangkal telinga ke $X = \pm 0.54$ agar duduk seimbang di mahkota kepala yang lebih lebar.
2. **Framing Kamera Lebih Dekat & Menonjol (Prominent Close-Up):**
   - Memajukan kamera Three.js ke $Z = 5.20$ (`this.camera.position.set(0, 0.06, 5.20)`).
   - Mochi kini mengisi $\approx 66\%$ dari area kanvas, menghasilkan peningkatan ukuran visual pada layar ponsel sekitar $+45\%$.
3. **Pelebaran Kontainer Wrapper Beranda:**
   - Di `features/ui/fiezel-tactile-clay.css`:
     - Mobile: `.fz-vissol-mascot-wrap` diperbesar dari $122 \times 122\text{px}$ menjadi **$154 \times 150\text{px}$** (awan latar belakang menjadi $172 \times 165\text{px}$).
     - Tablet: diperbesar menjadi **$160 \times 160\text{px}$**.
     - Desktop: diperbesar menjadi **$175 \times 175\text{px}$**.

---

## 3. Bukti Verifikasi Empiris

1. **Visual Headless Chromium Inspection:**
   - `mascot-crop.png`: Mochi tampil besar, montok, pipi bulat merona kemerahan, dan kedua cakar melambai utuh dengan bantalan pink yang jelas.
   - `mochi-3d-home-mobile.png`: Kartu Beranda tampak seimbang sempurna, di mana teks sapaan di sebelah kiri berdampingan harmonis dengan maskot 3D Mochi yang besar dan hidup di sebelah kanan.
2. **Quality Gate:**
   - `tests/id-golden-snapshot-test.js` $\to$ PASS
   - `tests/multi-device-comfort-test.js` $\to$ PASS (8/8 invarian)
   - `tests/th-ui-leak-test.js` $\to$ PASS
   - `tests/curriculum-cache-version-test.js` $\to$ PASS (33 penegasan)
   - `tests/gate-registry-test.js` $\to$ PASS (395 gerbang sah)
   - `tests/test-all-practices-mochi-wire.js` $\to$ PASS (5/5 sesi latihan terintegrasi)
