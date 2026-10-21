# FIEZEL HANDOFF DOSSIER: MID-EXAM CONTINUOUS FACE MONITORING (m025-551)

- **Build Target**: `m025-551`
- **Branch**: `fix/mid-exam-face-guard-m025-551`
- **Feature / Area**: Continuous Face Guard Monitoring & Anti-Falsing Room Backgrounds during Exam Session (Class Hub & Face Guard)
- **Status**: Siap Rilis (100% Quality Gates Passed, Hexa-Sync Validated, Empirical Playwright Tested)

---

## 1. Ringkasan Eksekutif & Akar Masalah

### 1.1 Temuan & Keluhan Pengguna
Setelah verifikasi pra-ujian (*preflight active liveness challenge*) sukses di rilis sebelumnya, pengguna menguji alur di sesi ujian berjalan (*exam runner*):
> *"TETAP SAJA TIDAK BERFUNGSI, SAAT MASUK KE SESI UJIAN, AKU SENGAJA TIDAK MELIHAT KE KAMERA DAN MENJAUHKAN MUKA KU LEBIH DARI 5 MENIT, TAPI SISTEM TIDAK TAHU APA APA DAN TIDAK ADA NOTIF SAMA SEKALI, TOLOL BANGET"*

### 1.2 Investigasi Mendalam & Akar Masalah (Root Cause Analysis)
Audit empiris membuktikan ada 4 faktor penyebab kegagalan pengawasan mid-exam:
1. **False Positive Kromatisitas pada Latar Belakang Ruangan (*Furniture / Wall False Positives*)**:
   - Algoritma YCbCr lama hanya mengecek `cb: 75..130`, `cr: 133..175`, `r > g > b && (r - g) >= 8`.
   - Dari uji empiris (`tools/dev/test-skin-bounds.mjs`), tembok krem/kuning dengan lampu hangat, meja kayu jati, pintu cokelat, lemari pakaian, dan lantai kayu laminasi SEMUANYA terdeteksi sebagai "kulit manusia".
   - Persyaratan piksel tengah hanya 14% (`centerSkinRatio < 0.14`). Saat pengguna menjauhkan wajah selama 5 menit, kamera menatap meja kayu atau tembok ruangan, dan sistem menganggap ada wajah di layar!
2. **Ketiadaan Validasi Arah Tatapan Wajah (*Head Gaze & Bilateral Symmetry*)**:
   - Algoritma Haar lama hanya mengukur satu blok gabungan $x \in [22, 42]$ vertikal tanpa memisahkan mata kiri dan mata kanan.
   - Saat murid menoleh ke samping (90° profile) atau menunduk melihat contekan/HP lain, profil samping pipi/leher tetap menghasilkan gradien dan eye dip positif.
3. **Penimpaan Keliru pada Detektor Bawaan (*Native Detector Override Bug*)**:
   - Jika peramban memiliki `window.FaceDetector` bawaan (seperti Android Chromium), saat pengguna menjauh dan detektor mendeteksi 0 wajah, kode lama masuk ke blok `else` dan menjalankan `fallbackCheck` yang kemudian tertipu oleh perabot kayu/tembok ruangan, membatalkan putusan detektor bawaan!
4. **Pencegahan Pemutusan Aliran Video (*Video Decoder Throttling Prevention*)**:
   - Elemen `<video>` latar belakang lama disetel `4px x 4px` dengan `opacity: 0.05`. Pada beberapa browser WebView/Chromium, video berukuran mikro mengalami penangguhan decoding frame (*throttling*) untuk penghematan daya.

---

## 2. Solusi Teknis & Arsitektur (m025-551)

1. **Bilateral Dual-Eye Haar Cascade & Spatial Clustering**:
   - Mengukur secara independen cekungan mata kiri ($Dip_{\text{left}}$) dan mata kanan ($Dip_{\text{right}}$) terhadap dahi dan pipi:
     $$Dip_{\text{left}} = (L_{\text{forehead}} - L_{\text{eye\_left}}) + (L_{\text{cheek\_left}} - L_{\text{eye\_left}})$$
     $$Dip_{\text{right}} = (L_{\text{forehead}} - L_{\text{eye\_right}}) + (L_{\text{cheek\_right}} - L_{\text{eye\_right}})$$
   - Mengharuskan KEDUA mata memiliki cekungan nyata ($Dip_{\text{left}} \ge 1.4$ dan $Dip_{\text{right}} \ge 1.4$) serta keseimbangan iluminasi horizontal ($|\Delta L_{\text{eyes}}| \le 28$). Jika murid menoleh ke samping, salah satu cekungan mata tertutup/hilang dan sistem langsung mendeteksi absen.
2. **Centroid & Bounding Box Face Geometry**:
   - Menghitung titik berat $\bar{X}, \bar{Y}$ dan rasio aspek wajah ($H/W \in [0.65, 2.8]$). Meja kayu horizontal atau tembok lebar mendatar otomatis ditolak.
   - Centroid wajib berada di rentang tengah aktif ($\bar{X} \in [18, 46]$ dan $\bar{Y} \in [10, 38]$ dari frame 64x48).
3. **Penyelarasan Native Detector**:
   - Jika detektor hardware mendeteksi 0 wajah, sistem langsung menetapkan wajah tidak hadir tanpa tertipu oleh perabot ruangan.
4. **Perlindungan Pemutaran Video & Audio Chime Peringatan**:
   - Elemen video latar belakang diperbarui ke dimensi standar (320x240) dengan posisi off-screen aman agar compositor peramban tidak menangguhkan pemutaran frame.
   - Panggilan `checkFrame()` memastikan pemutaran berlanjut jika sempat dijeda oleh OS.
   - Menambahkan nada peringatan audio lembut (`playProctorBeep()`) via Web Audio API saat modal peringatan muncul, agar murid yang sedang tidak menatap layar HP segera tersadar.

---

## 3. Bukti Pengujian Empiris (Empirical Testing)

### 3.1 Evaluasi Pola Sintetis Ruangan vs Wajah Asli
Hasil eksekusi `tools/dev/eval-combined.mjs`:
- Kamera tertutup (gelap): `false` (PASS)
- Langit-langit / tembok abu: `false` (PASS)
- Wajah frontal menghadap layar: `true` (PASS)
- Meja kayu / perabot warna hangat: `false` (PASS)
- Telapak tangan menutup lensa: `false` (PASS)
- Murid menoleh / meninggalkan kamera: `false` (PASS)
- Ruangan kosong (tembok krem + meja jati): `false` (PASS)
- Menoleh 90 derajat ke samping: `false` (PASS)

### 3.2 Uji Ragam Warna Kulit Manusia
Hasil eksekusi `tools/dev/test-skin-tones.mjs`:
- Fair / Pale Skin: `true` (PASS)
- Tan / Indonesian Skin: `true` (PASS)
- Deep Brown Skin: `true` (PASS)

### 3.3 Uji Siklus Monitoring Headless Playwright
Hasil eksekusi `tools/dev/probe-face-guard-loop.mjs`:
```json
{
  "active": true,
  "faceWarn": true,
  "modalInDom": true,
  "hasFaceAlertClass": true,
  "innerHTMLSnippet": "<div class=\"ch-face-modal-backdrop\" data-testid=\"class-face-alert-modal\">..."
}
```

---

## 4. Berkas yang Diubah

1. `features/class-hub/fiezel-face-guard.js`:
   - Algoritma `fallbackCheck` diperbarui dengan bilateral dual-eye Haar cascade, validasi centroid, dan penolakan perabot.
   - `checkFrame` diperbarui dengan deteksi orientasi native detector dan auto-play recovery.
   - `start` diperbarui dengan ukuran unthrottled (320x240) dan auto-play.
2. `features/class-hub/fiezel-class-hub.js`:
   - Ditambahkan fungsi `playProctorBeep()` berbasis Web Audio API.
   - Panggilan `playProctorBeep()` dihubungkan ke `onWarning(true)`.
3. `tests/exam-focus-guard-test.js`:
   - Ditambahkan unit test siklus deteksi mid-exam (`face-guard: pengawasan mid-exam mendeteksi saat murid menoleh / menjauh dan auto-dismiss saat kembali`).
4. Hexa-sync build version:
   - `sw.js` (`m025-551`)
   - `core-config.js` (`m025-551`)
   - `features/neural-voice/fiezel-diag-panel.js` (`m025-551`)
   - `coordination/BUILD-VERSION.json` (`m025-551`)
   - `kurikulum.html` (`?v=m025-551`)
   - `misi.html` (`?v=m025-551`)
5. Baseline:
   - `id-golden-baseline.json`

---

## 5. Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` $\to$ **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` $\to$ **PASS**
- `node tests/curriculum-cache-version-test.js` $\to$ **PASS**
- `node tests/gate-registry-test.js` $\to$ **PASS (365 gerbang terdaftar)**
- `node tests/exam-focus-guard-test.js` $\to$ **PASS (Semua gerbang lulus)**
- `node tests/lucide-icon-coverage-test.js` $\to$ **PASS**
- `node tools/bump-build.mjs --check` $\to$ **PASS (Selaras m025-551)**
