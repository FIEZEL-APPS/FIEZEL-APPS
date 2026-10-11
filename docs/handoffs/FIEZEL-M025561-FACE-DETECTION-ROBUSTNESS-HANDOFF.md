# FIEZEL HANDOFF: KALIBRASI KOKOH PENDETEKSI WAJAH & ANTI-SPOOFING (m025-561)

## 1. Ringkasan Masalah & Diagnosa Empiris

Pada versi m025-560, pengguna melaporkan: *"aduh deteksi wajahnya masih belum bisa, dan masih salah"*.
Hasil audit empiris di perangkat nyata dan skrip diagnosis Playwright mengungkap 3 akar penyebab utama:

1. **Deadlock Anti-Spoofing & Diam Tenang (Steady Hold Reset Loop)**:
   - Pada `checkLiveness()`, diam tenang diuji selama $\ge 3000\text{ms}$ (`STEADY_HOLD_MS = 3000`).
   - Namun di `analyzeFrame()`, sebelum enrollment (`!enrolledProfile.valid`), `checkTemporalLiveness()` dipanggil setiap frame setelah $2000\text{ms}$ (`TEMPORAL_MIN_SPAN_MS = 2000`).
   - Kamera modern (iPhone, Samsung Galaxy, iPad, webcam de-noising chip) memiliki de-noising temporal ISP perangkat keras yang sangat halus. Saat murid hidup duduk tenang menghadap layar, `avgMae` berkisar $0,15 - 0,25$ dan `dipVar < 0,035`.
   - Ambang lama `avgMae < 0,28 && dipVar < 0,035` menuduh murid hidup yang duduk tenang membaca/memandang kamera sebagai `spoof_static` tepat pada detik ke-2!
   - Di `checkLiveness()`, `frameRes.isSpoof` mereset `liveness.steadySince = 0` dan progres kembali ke 0%. Akibatnya progres naik ke ~65%, terbanting ke 0%, dan mengulang siklus hingga timeout 20 detik dengan kegagalan palsu: *"wajah belum terdeteksi"*.
2. **Model Kromatisitas Kulit Terlalu Sempit & Rigid**:
   - Model universal pra-kalibrasi menuntut `normB <= 0.33` dan `cr - cb >= 4`.
   - Di bawah lampu LED putih/daylight (6000-6500K) atau pencahayaan ruangan biasa, kulit sawo matang/kuning langsat memiliki komponen blue normalisasi $0,335 - 0,350$, sehingga ditolak dengan alasan `skin_count_out_of_range`.
   - Ruangan terang ($avgBr > 110$) dengan bayangan mata lembut langsung ditolak sebagai `flat_light_or_surface` jika $eyeDip < 0,4$.
3. **Penyambungan Elemen Video Preview yang Hilang**:
   - `doScan` di `fiezel-class-hub.js` memanggil `face.checkLiveness()` tanpa argumen elemen video, sehingga defaulting ke hidden video DOM (24×24px, opacity 0.005) alih-alih elemen pratinjau visual aktif yang sedang dilihat murid.

---

## 2. Perbaikan Sistemik (m025-561)

| Area | Sebelum (m025-560) | Sesudah (m025-561) |
|---|---|---|
| **Evaluasi Anti-Spoofing Temporal** | Dipanggil per-frame di `analyzeFrame()` sebelum enrollment, mematikan kehadiran di $t=2000\text{ms}$. | Dihapus dari `analyzeFrame()`. Evaluasi temporal ditempatkan di gerbang batas $t \ge 3000\text{ms}$ pada `checkLiveness()`. |
| **Ambang `isStatic`** | `avgMae < 0.28 && dipVar < 0.035` (terlalu luas, menuduh murid hidup). | `avgMae < 0.05 && dipVar < 0.001` (hanya mendeteksi foto sintetis 0 derau / video beku murni). |
| **Deadlock Progres Bar** | Reset `steadySince = 0` memantulkan bar dari 65% ke 0%. | Progres bar naik mulus hingga 95% di challenge, lalu melompat ke 100% saat steady hold tuntas, kedip, atau toleh 3D. Tidak ada reset kasar. |
| **Kromatisitas Kulit Universal** | `cb[70..145], cr[125..185], normB <= 0.33, cr-cb >= 4` | `cb[70..148], cr[122..188], normB <= 0.35 (<=0.36 redup), normR >= 0.30, cr-cb >= 2 (>=1 redup)`. Inklusif untuk kulit sawo matang & lampu LED. |
| **Toleransi Posisi & Cahaya Terang** | `minCenter: 0.30, cX[8..56], cY[6..42], avgBr>110 => rejected` | `minCenter: 0.20, cX[5..59], cY[4..44]`. Permukaan datar ditolak bila dominan tengah (>75%) & $eyeDip < 0,25$. |
| **Koneksi Elemen Video Pratinjau** | `face.checkLiveness()` defaulting ke hidden video. | `face.checkLiveness(pVidNow)` memprioritaskan video pratinjau aktif murid. |

---

## 3. Bukti Pengujian Empiris (Playwright & Probe)

1. **Probe Diagnostik Sensor Kamera (`tools/dev/diagnose-real-face-failure.mjs`)**:
   - `Test 1 (Webcam biasa derau 0.8)`: Lolos liveness 3060ms (`verified`, `progress: 100`).
   - `Test 2 (HP modern de-noised derau 0.3)`: Lolos liveness 3060ms (`verified`, `progress: 100`).
   - `Test 3 (Lampu LED Putih / Dingin)`: `present: true, isSpoof: false`.
   - `Test 4 (Ruangan Terang Siang Hari)`: `present: true, isSpoof: false`.
   - `Test 5 (Sawo Matang / Redup)`: `present: true, isSpoof: false`.
   - `Test 6 (Sudut HP agak tinggi cY=18)`: `present: true, isSpoof: false`.

2. **Probe Chromium Headless Playwright (`tools/dev/probe-real-face-verification.mjs`)**:
   - Klik `btn-verify-face` layaknya murid di peramban Chromium headless.
   - Progres bar liveness bergerak mulus: `0% -> 2% -> 10% -> 87% -> 93% -> 100%`.
   - Status beralih ke `verified`, tombol `btn-proceed-exam` terbuka.
   - Klik `btn-proceed-exam`: ujian berjalan dengan `faceVerified: true` dan profil biometrik tersimpan di `runner.faceProfile`.

3. **Gerbang Mutu Lokal**:
   - `tests/exam-focus-guard-test.js`: 37/37 LULUS (100% PASS).
   - `tests/id-golden-snapshot-test.js`: HIJAU (baseline emas utuh).
   - `tests/th-ui-leak-test.js`: PASS (nol kebocoran).
   - `tests/curriculum-cache-version-test.js`: OK (build m025-561).
   - `tests/gate-registry-test.js`: PASS (10 pass, 0 fail).

---

## 4. Berkas yang Diubah

- `features/class-hub/fiezel-face-guard.js`: Rekalibrasi ambang temporal liveness, perluasan model kromatisitas kulit, toleransi posisi wajah, pencegahan deadlock progres.
- `features/class-hub/fiezel-class-hub.js`: Mengirimkan video pratinjau aktif `pVidNow` ke `checkLiveness`.
- `id-golden-baseline.json` & `reports/th-ui-leak-report.json`: Pembaruan snapshot baseline emas teks Indonesia.
- `tools/dev/probe-real-face-verification.mjs`: Skrip probe otomatis Chromium Playwright ujung ke ujung.
- Hexa-Sync rilis build `m025-561`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.
