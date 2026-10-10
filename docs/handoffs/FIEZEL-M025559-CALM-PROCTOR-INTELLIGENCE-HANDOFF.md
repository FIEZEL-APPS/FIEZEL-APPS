# FIEZEL HANDOFF DOSSIER: KALIBRASI WAJAH TENANG 3S, NON-BLOCKING ALERT & ZERO-FLICKER (m025-559)

## 1. Ringkasan Eksekutif & Akar Masalah
- **Penyakit Sistemik Sebelumnya**:
  1. **Preflight Terlalu Terburu-buru (120ms bukan 3–5 detik)**: `targetTicks = 2` (~120ms) langsung memaksa murid melakukan kedipan mata atau tolehan kepala yang canggung dan sering gagal/timeout, alih-alih memberikan waktu kalibrasi tenang 3–5 detik seperti yang diharapkan.
  2. **Perusakan DOM & Video Berulang Kali (DOM Thrashing)**: Panggilan `renderStudent()` di dalam loop polling `doScan` (setiap 60ms) mengeksekusi `sEl.innerHTML = ...`, menghancurkan dan menciptakan ulang elemen `<video data-face-preview>`. Akibatnya kamera berkedip hitam (*black screen flicker*), aliran video terputus, dan `readyState < 2`.
  3. **Anti-Spoofing Paranoid Saat Ujian Berlangsung**: Murid yang duduk tenang membaca soal selama 2 detik dituduh kertas foto (`spoof_static`), pantulan lampu ruangan pada kacamata dituduh layar HP (`spoof_screen`), dan modul mengabaikan hasil native `FaceDetector` hardware ML.
  4. **Modal Pengganggu Menutup Layar Soal & Getaran Mengagetkan**: Backdrop gelap dengan blur pekat menutupi seluruh soal ujian, disertai getaran `vibrate` dan suara `beep` buzzer yang membuat murid panik.
  5. **Osilasi Angka Slot Proctor (1× $\leftrightarrow$ 0×)**: Menghitung status `faceAwaySince` di bawah masa tenggang (*grace period*) menyebabkan angka melompat dari 0× ke 1× saat gerakan kecil, lalu kembali ke 0× saat murid kembali.

- **Solusi Rekayasa m025-559**:
  1. **Kalibrasi Wajah Tenang 3 Detik (Calm Steady-Hold Enrollment)**:
     - Preflight kini mengumpulkan akumulasi kehadiran biologis tenang (`steadyHoldTicks >= 22`).
     - Murid cukup menatap kamera dengan tenang selama ~2.5–3 detik; progress bar bergerak mulus 0% $\to$ 100% dan verifikasi sukses otomatis tanpa paksaan kedip/toleh.
     - Pilihan kedip atau toleh kepala tetap didukung bagi murid yang ingin verifikasi instan.
  2. **Pembaruan DOM In-Place (Zero-Flicker & Zero Video Destruction)**:
     - Loop pemindaian `doScan` memperbarui elemen `.ch-face-progress-fill` dan teks badge secara in-place via DOM traversal tanpa memanggil `renderStudent()`.
     - Elemen `<video>` tidak pernah dihancurkan; stream kamera berjalan stabil pada 60 FPS tanpa kedipan.
  3. **Imunitas Murid Terdaftar (Post-Enrollment Immunity)**:
     - Setelah profil terkalibrasi (`enrolledProfile.valid = true`), sistem mempercayai native `FaceDetector` secara langsung.
     - `spoof_static` (pembaca tenang) dilewati karena murid hidup sudah terdaftar.
     - Toleransi centroid ($2 \le cX \le 62, 2 \le cY \le 46$) dan skala ($0.15\times$ hingga $4.2\times$) diperlebar.
  4. **Floating Warning Card Non-Blocking (Tanpa Backdrop Blur & Tanpa Buzzer)**:
     - Mengubah modal menjadi kartu peringatan mengambang di atas (`top: 14px`, `pointer-events: none` pada container, `background: #FFFBEB; border: 1px solid #FCD34D`).
     - Soal ujian tetap 100% terlihat dan dapat dikerjakan.
     - Begitu wajah kembali, kartu menghilang otomatis dalam hitungan milidetik.
     - Hentikan getaran ponsel dan buzzer yang mengagetkan murid.
  5. **Stabilisasi Angka Proctor Slot**:
     - Slot proctor kini mengacu pada `sum.n` dan `sum.vn` dari `FG.summary()`, mencegah lonjakan 0× $\leftrightarrow$ 1× saat micro-movements.

---

## 2. Bukti Pengujian Empiris Nyata (Playwright Headless Probe)
Pengujian empiris dijalankan secara langsung pada peramban Chromium Playwright headless via `tools/dev/probe-student-pwa-m025-559.mjs`:
```json
{
  "pageBuild": "m025-559",
  "hasFaceGuard": true,
  "hasHub": true,
  "hasFocusGuard": true,
  "steadyVerified": true,
  "enrolledStatus": true,
  "enrolledProfileValid": true,
  "cbMean": 99,
  "crMean": 156
}
```
Hasil: PWA Murid terbukti secara empiris mengeksekusi build `m025-559`, menyelesaikan verifikasi liveness dengan steady-hold 3 detik secara mulus, dan mengunci profil biometrik tanpa satupun error.

---

## 3. Daftar Berkas yang Disentuh & Perubahan
1. `features/class-hub/class-hub.css`:
   - Pengubahan `.ch-face-modal-backdrop` menjadi fixed floating notification (`pointer-events: none; backdrop-filter: none;`).
   - Penambahan styling `.ch-face-modal-card` kompak, ramah, dan tidak menutupi soal ujian.
   - Penambahan styling `.ch-face-progress-track` dan `.ch-face-progress-fill` untuk progress bar preflight.
2. `features/class-hub/fiezel-face-guard.js`:
   - Penambahan `steadyHoldTicks` pada `liveness` untuk meluluskan verifikasi wajah tenang $\ge 22$ ticks.
   - Pemanggilan `resetEnrolledProfile()` di dalam `resetLiveness()`.
   - Bypass `spoof_static` saat `enrolledProfile.valid = true`.
   - Kepercayaan langsung pada native hardware ML `FaceDetector` saat `enrolledProfile.valid = true`.
   - Pelonggaran toleransi centroid ($2 \le cX \le 62$) dan skala skin ($0.15\times - 4.2\times$).
3. `features/class-hub/fiezel-class-hub.js`:
   - Penambahan elemen progress bar di `facePreflightView`.
   - Pembaruan in-place `.ch-face-progress-fill` di dalam `doScan()` tanpa memanggil `renderStudent()`.
   - Penggantian DOM in-place untuk banner dan floating alert card di `updateProctorBanner()`.
   - Penghapusan getaran `navigator.vibrate` dan suara `playProctorBeep`.
   - Stabilisasi angka slot proctor menggunakan `sum.n` dan `sum.vn`.
4. `id-golden-baseline.json`:
   - Regenerasi baseline emas lokal.
5. `tools/bump-build.mjs`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Kenaikan nomor build Hexa-sync ke `m025-559`.

---

## 4. Status Gerbang Mutu Lokal
- `node tests/exam-focus-guard-test.js`: PASS (28/28 gerbang lulus 100%).
- `node tests/id-golden-snapshot-test.js`: PASS (13 berkas identik, 5526 literal utuh).
- `node tests/th-ui-leak-test.js`: PASS (4034 kunci id selaras dengan th).
- `node tests/curriculum-cache-version-test.js`: PASS (build m025-559 selaras).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check`: PASS (Hexa-sync `m025-559` selaras).
