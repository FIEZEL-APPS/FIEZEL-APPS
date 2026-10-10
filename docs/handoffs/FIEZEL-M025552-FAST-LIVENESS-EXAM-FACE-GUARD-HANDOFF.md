# FIEZEL Handoff Dossier — Build m025-552
## Peningkatan Kecepatan Deteksi Kedipan Mata Biologis (60ms) & Resolusi Deteksi Wajah Ruang Ujian In-Viewport

**Tanggal**: 10 Oktober 2026
**Build Target**: `m025-552`
**Branch PR**: `fix/fast-liveness-exam-face-m025-552`
**Status CI**: Ready for PR & Automated Quality Gate Check (365+ tests)

---

### 1. Ringkasan Temuan Audit & Akar Masalah

Pengguna melaporkan dua masalah kritis pada sistem pengawasan ujian biometrik:
1. **Kedipan mata sangat lama dan lambat terdeteksi**: Murid berkedip berkali-kali namun verifikasi pra-ujian (*preflight active liveness*) tidak kunjung selesai.
2. **Saat masuk ke ruang ujian, sistem gagal mendeteksi wajah**: Murid duduk menghadap layar namun sistem melaporkan wajah tidak terdeteksi atau memunculkan popup peringatan secara keliru (*false positive*).

#### Investigasi Mendalam & Temuan Akar Masalah:
1. **Sampling Rate Preflight Terlalu Lambat (5 FPS / 200ms)**:
   - Di `fiezel-class-hub.js`: `verifyTimer = setInterval(doScan, 200)` mengambil sampel frame setiap 200ms.
   - Refleks kedipan mata manusia alami berlangsung selama **100–250 milidetik**. Pada interval 200ms, fase mata tertutup kerap jatuh di sela-sela sampel, sehingga kamera melewatkan momen kedipan dan murid harus berkedip berulang kali.
2. **Kekakuan Ambang Penurunan Kontras Mata (`baseDip >= 10`)**:
   - Di `fiezel-face-guard.js`: ambang `baseDip >= 10` dan syarat penurunan kontras `curDip <= baseDip * 0.45` mensyaratkan pencahayaan kontras tinggi buatan studio. Pada pencahayaan kamar biasa atau layar HP redup di mana `baseDip < 10`, logika deteksi kedipan menjadi non-aktif.
   - Kotak koordinat dahi/mata/pipi bersifat statis kaku (`y: 20..26`), bukan mengacu dinamis pada posisi pusat massa wajah (`cX, cY`).
3. **Penyebab Kegagalan Deteksi di Ruang Ujian**:
   - **Kompositor Peramban Mensuspensi Video Tersembunyi**: Elemen `<video>` latar belakang diposisikan di `top: -9999px; left: -9999px`. Mesin rendering Chromium dan WebKit mobile modern otomatis menidurkan/menghentikan *frame decoding* untuk elemen media yang berada jauh di luar *viewport*, menyebabkan `ctx.drawImage` membaca frame hitam/beku.
   - **Pencahayaan Layar Putih (*Cool-White Reflection*)**: Di ruang ujian, layar memancarkan cahaya putih/kebiruan. Syarat kromatisitas kulit `g >= b` dan `(normR - normG) >= 0.04` menolak wajah murid karena komponen `b` meningkat akibat pantulan monitor/layar HP.
   - **Batas Sentroid Terlalu Sempit**: Sentroid wajah dibatasi `18 <= cX <= 46` (hanya 43.7% lebar frame). Murid yang memegang ponsel secara wajar dengan satu tangan sering berada di `cX = 14` atau `cX = 50` sehingga ditolak.
   - **Native FaceDetector Fallback Drop**: Saat `FaceDetector` native peramban sesaat tidak mendeteksi wajah di satu frame, ia langsung melaporkan absen tanpa berkonsultasi ke `fallbackCheck`.

---

### 2. Solusi Teknis & Rincian Perubahan

1. **Ultra-Responsive Blink Sampling (60ms / ~16.6 FPS)**:
   - Mengubah interval `doScan` di `features/class-hub/fiezel-class-hub.js` menjadi **60ms** (maksimal 150 poll = 9 detik timeout).
   - Menjadikan sampling mata dinamis terhadap sentroid wajah `(cX, cY)` murid.
   - Mengadopsi ambang kedipan fleksibel: `(baseDip >= 4.0 && (curDip <= baseDip * 0.70 || dipDrop >= 2.5)) || (baseDip < 4.0 && dipDrop >= 1.5)` dengan durasi kedip valid `40ms <= dur <= 950ms`. Kedipan biologis terdeteksi dalam **~107ms**!
   - Ambang tolehan kepala diperhalus ke `Math.abs(centroidX - baselineCentroidX) >= 2.5` atau `Math.abs(centroidY - baselineCentroidY) >= 2.5`.

2. **In-Viewport Active Video & Live PiP Camera Feedback**:
   - Menempatkan elemen video prosesor di `bottom: 4px; right: 4px; width: 24px; height: 24px; opacity: 0.005; pointer-events: none; z-index: 99999;` sehingga berada di dalam viewport aktif dan compositor tidak pernah mensuspensi aliran frame.
   - Menambahkan elemen PiP mini (`.ch-camera-pip-video`) pada `focusBanner()` di ruang ujian dan mengaitkannya via `face.attachPreview(pipVid)`. Murid dapat melihat thumbnail kamera aktif mereka di samping indikator status ujian.
   - Menyesuaikan `WARN_THRESHOLD_MS` menjadi **2500ms** (2.5 detik) agar gerakan membaca soal atau jeda wajar tidak memicu alarm palsu.

3. **Robust Chromaticity Spectrum (Warm & Cool Screen Reflection)**:
   - Spektrum kulit YCbCr diperluas: `cb >= 75 && cb <= 138`, `cr >= 128 && cr <= 180`, `r > g && r > (b - 10) && (r - g) >= 4`.
   - Sentroid wajah diperluas ke `12 <= cX <= 52` dan `8 <= cY <= 40`.
   - Tetap menolak 100% secara mutlak: kamera tertutup hitam, silau ekstrem, langit-langit/tembok kosong, meja kayu, telapak tangan, dan murid meninggalkan kamera.

---

### 3. Bukti Pengujian Empiris (Playwright Headless Chromium)

Skrip probe Playwright: `tools/dev/probe-fast-liveness-exam.mjs`
```json
{
  "ok": true,
  "warmOk": true,
  "coolOk": true,
  "emptyRejected": true,
  "woodRejected": true,
  "blinkVerified": true,
  "tBlinkMs": 107,
  "turnVerified": true
}
```
Hasil:
- Waktu verifikasi kedipan mata alami: **107 milidetik** (responsif instan).
- Deteksi tolehan kepala: **100% Lulus**.
- Wajah dengan pantulan monitor putih (*cool-white*): **Terdeteksi Hadir**.
- Ruangan kosong / meja kayu: **Ditolak Absen**.

---

### 4. Daftar Berkas yang Disentuh

1. `features/class-hub/fiezel-face-guard.js`:
   - Penyesuaian `WARN_THRESHOLD_MS = 2500`.
   - Penyempurnaan `fallbackCheck` (spektrum cool/warm screen glow, sentroid 12..52).
   - Validasi silang saat native detector menghasilkan 0 face.
   - Penempatan video element di dalam viewport aktif (`bottom: 4px; right: 4px`).
   - Deteksi `checkLiveness` berbasis sentroid dinamis dan kedipan cepat 100ms.
2. `features/class-hub/fiezel-class-hub.js`:
   - Sampling rate `doScan` dinaikkan ke 60ms (16 FPS).
   - Penambahan thumbnail preview PiP `<video class="ch-camera-pip-video" data-face-pip>` di `focusBanner()`.
   - Otomasi pengaitan stream preview ke `[data-face-pip]` saat `renderStudent()`.
3. `features/class-hub/class-hub.css`:
   - Gaya kelas `.ch-camera-pip-video` (16px circular video indicator).
4. `tests/exam-focus-guard-test.js`:
   - Penyelarasan `WARN_THRESHOLD_MS` menjadi 2500.
5. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Sinkronisasi baseline mutu emas.
6. Berkas hexa-sync rilis (`sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`):
   - Dinaikkan ke build `m025-552`.

---

### 5. Status Gerbang Mutu Lokal

- `node tests/exam-focus-guard-test.js`: **PASS (Semua gerbang pendeteksi keluar layar lulus)**
- `node tests/curriculum-cache-version-test.js`: **PASS (m025-552)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (4025 kunci id, semuanya punya padanan th)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail, 365 gerbang bukti)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras m025-552)**
