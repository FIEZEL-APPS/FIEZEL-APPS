# FIEZEL HANDOFF DOSSIER: KALIBRASI PROFIL BIOMETRIK WAJAH AWAL (m025-558)

## 1. Ringkasan Eksekutif & Akar Masalah
- **Masalah**: Pengawasan kamera mid-exam pada mode ujian (`FiezelFaceGuard` & `FiezelFocusGuard`) sebelumnya terlalu kaku dan hipersensitif terhadap variasi alami optik kamera depan ponsel murid. Getaran mikro genggaman tangan (*handheld tremor*), perubahan postur duduk maju-mundur (*leaning in/out*), kedipan mata manusia (*natural blinking* ~200-400ms), atau murid menunduk membaca soal ujian memicu false-positive peringatan curang padahal murid tidak pernah berniat menyontek.
- **Solusi Rekayasa**:
  1. **Perekaman Profil Wajah Awal (Face Enrollment & Environmental Calibration)**: Pada tahap verifikasi pra-ujian (*face preflight*), sistem merekam dan mengunci profil kromatisitas warna kulit murid (`cbMean`, `crMean`, `normRMean`, `normBMean`) serta dimensi wajah (`boxWMean`, `boxHMean`, `skinCountMean`, `eyeDipMean`).
  2. **Computer Vision Mid-Exam Adaptif Berbasis Profil Acuan**: Mid-exam tidak lagi menggunakan ambang batas statis mentah, melainkan mencocokkan wajah relatif terhadap profil murid yang terkunci, dengan toleransi skala maju/mundur luas ($0.20\times$ hingga $3.5\times$ dari mean) dan centroid jangkauan luas ($4 \le cX \le 60, 4 \le cY \le 44$).
  3. **Penghalus Temporal & Anti-Tremor Debounce**:
     - Ditambahkan `ABSENT_DEBOUNCE_FRAMES = 8` (2.0 detik hilang secara berurutan pada 250ms interval) sebelum `absentSince` diaktifkan. Kedipan mata (1 frame) atau guncangan sesaat (1-2 frame) otomatis diserap tanpa tuduhan.
     - `WARN_THRESHOLD_MS` ditingkatkan dari 1000ms menjadi 3000ms.
     - `ABSENT_THRESHOLD_MS` ditingkatkan dari 2000ms menjadi 4500ms.
     - `FACE_GRACE_MS` pada `FiezelFocusGuard` diselaraskan ke 3000ms (membedakan kepastian digital OS keluar tab 500ms vs fluktuasi optik biometrik manusia 3000ms).

---

## 2. Bukti Pengujian Empiris Nyata (Playwright Headless Probe)
Pengujian empiris dijalankan secara langsung pada peramban Chromium Playwright headless via `tools/dev/probe-student-pwa-m025-558.mjs`:
```json
{
  "pageBuild": "m025-558",
  "hasFaceGuard": true,
  "faceGuardWarnThreshold": 3000,
  "faceGuardAbsentThreshold": 4500,
  "focusGuardFaceGrace": 3000,
  "enrolledStatus": true,
  "enrolledProfileValid": true,
  "cbMean": 99,
  "crMean": 156
}
```
Hasil: PWA Murid terbukti secara empiris mengeksekusi build `m025-558`, mengunci kalibrasi profil biometrik wajah, dan menerapkan jendela toleransi `FACE_GRACE_MS = 3000ms`.

---

## 3. Daftar Berkas yang Disentuh & Perubahan
1. `features/class-hub/fiezel-face-guard.js`:
   - Penambahan state `enrolledProfile`, `resetEnrolledProfile()`, `absentStreak`, dan `ABSENT_DEBOUNCE_FRAMES = 8`.
   - Modifikasi `analyzeFrame()` dengan model kromatisitas kulit adaptif berbasis profil terkalibrasi, toleransi skala maju-mundur, batas centroid longgar, dan penghindaran false-positive `flat_light_or_surface` saat profil valid.
   - Peningkatan `WARN_THRESHOLD_MS = 3000ms` dan `ABSENT_THRESHOLD_MS = 4500ms`.
   - Implementasi debounce temporal pada `handleResult()`.
   - Akumulasi profil biometrik pada `checkLiveness()`.
   - Ekspor fungsi `getEnrolledProfile`, `setEnrolledProfile`, `isEnrolled`, `resetEnrolledProfile`, dan `analyzeFrame`.
2. `features/class-hub/fiezel-focus-guard.js`:
   - Penyelarasan `FACE_GRACE_MS = 3000ms` untuk toleransi biometrik manusia, mempertahankan `GRACE_MS = 500ms` untuk perpindahan layar/tab digital.
3. `features/class-hub/fiezel-class-hub.js`:
   - Pembaruan `onAbsentEpisode()` dengan fallback 3000ms.
   - Penambahan tampilan persentase kalibrasi `{pct}%` pada badge scanning `facePreflightView`.
   - Penanganan stage `aligning`/`enrolling` pada loop `doScan()`.
4. `tests/exam-focus-guard-test.js`:
   - Penyesuaian konfirmasi threshold `WARN_THRESHOLD_MS = 3000` dan `ABSENT_THRESHOLD_MS = 4500`.
   - Pembaruan pengujian test 27 untuk memverifikasi toleransi micro-movement (< 3000ms diabaikan) dan pencatatan episode nyata ($\ge 3000$ms).
   - Penambahan test 28 yang memverifikasi kunci profil enrollment biometrik awal serta toleransi maju-mundur dan kemiringan HP.
5. `tools/bump-build.mjs`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Kenaikan nomor build Hexa-sync ke `m025-558`.
6. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Regenerasi baseline emas lokal.

---

## 4. Status Gerbang Mutu Lokal
- `node tests/exam-focus-guard-test.js`: PASS (28/28 gerbang lulus 100%).
- `node tests/id-golden-snapshot-test.js`: PASS (13 berkas identik, 5525 literal utuh).
- `node tests/th-ui-leak-test.js`: PASS (4034 kunci id selaras dengan th).
- `node tests/curriculum-cache-version-test.js`: PASS (build m025-558 selaras).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check`: PASS (Hexa-sync `m025-558` selaras).
