# FIEZEL HANDOFF DOSSIER: ACTIVE LIVENESS CHALLENGE (m025-550)

- **Build Target**: `m025-550`
- **Branch**: `feat/active-liveness-challenge-m025-550`
- **Feature / Area**: Active Liveness Detection & Anti-Spoofing Pre-Exam Face Verification (Class Hub & Face Guard)
- **Status**: Siap Rilis (100% Quality Gates Passed, Hexa-Sync Validated, Empirical Playwright Tested)

---

## 1. Ringkasan Eksekutif & Akar Masalah

### 1.1 Temuan & Permintaan Pengguna
Pengguna mendapati bahwa sistem verifikasi pra-ujian sebelumnya belum dapat membedakan wajah manusia nyata dari foto statis (kertas print, foto HP, atau poster diam). Jika pengguna meletakkan foto atau meninggalkan kamera dengan foto di depan lensa, sistem sebelumnya belum memiliki mekanisme interaktif untuk membuktikan keaktifan biologis (*liveness*).

Pengguna memberikan arahan:
> *"BUKANKAH HARUS TES VERIVIKASI SEPERTI KEDIP MATA, HADAP KIRI, HADAP KANAN, DAN LAIN LAIN?"*

### 1.2 Solusi Teknis: Active Liveness Challenge Tanpa Dependensi Berat
Kami mengimplementasikan **Active Liveness Challenge** langsung di `features/class-hub/fiezel-face-guard.js` berbasis telemetri spasio-temporal murni (64x48 fast canvas pipeline) tanpa membebani browser dengan library neural 50MB:
1. **Biological Eye-Blink Dynamics (Kedip Mata)**:
   - Mengukur luminance ratio antara pita dahi, pita mata, dan pipi:
     $$\text{eyeDip} = (L_{\text{forehead}} - L_{\text{eyes}}) + (L_{\text{cheeks}} - L_{\text{eyes}})$$
   - Saat mata terbuka, pupil gelap menghasilkan $\text{eyeDip}$ tinggi (baseline ~50–80).
   - Saat mata berkedip menutup, kelopak kulit menutup pupil dan $\text{eyeDip}$ anjlok drastis ($\le 45\%$ baseline).
   - Saat mata membuka kembali dalam rentang waktu biologis manusia (60ms–900ms), kedipan terverifikasi (`blinkCount++`).
2. **Skin Centroid Shift Dynamics (Toleh Kepala)**:
   - Menghitung titik berat massa piksel kulit ($\bar{X} = \sum X_{\text{skin}} / N_{\text{skin}}$).
   - Saat murid menolehkan kepala ke kiri atau kanan, pusat massa kulit bergeser ($|\Delta \bar{X}| \ge 4.0\text{px}$).
   - Memungkinkan murid berkacamata hitam/lensa gelap untuk tetap lolos verifikasi melalui gerakan menoleh.
3. **Anti-Spoofing Invariant**:
   - Foto statis/kertas cetak memiliki $\text{eyeDip}$ dan centroid konstan dari waktu ke waktu $\to$ **TETAP tertahan di stage `challenge` dan TIDAK PERNAH terverifikasi**.

---

## 2. Alur Antarmuka Pengguna (UI/UX)

1. **Langkah 1: Penyelarasan Wajah (`align`)**:
   - Murid memposisikan wajah di dalam lingkaran oval.
   - Sistem mengkalibrasi baseline luminance mata dan centroid wajah (2 frame ~400ms).
2. **Langkah 2: Uji Liveness Aktif (`challenge`)**:
   - Banner status menampilkan instruksi dinamis dwibahasa:
     * ID: *"Langkah 2/2: Kedipkan matamu perlahan atau tolehkan kepalamu"*
     * TH: *"ขั้นตอนที่ 2/2: กรุณากะพริบตาช้าๆ หรือเอียงศีรษะเล็กน้อย"*
   - Tombol aksi beralih ke indikator aktif berkedip dengan ikon mata (`icon('eye')`).
3. **Langkah 3: Terverifikasi Biologis (`verified`)**:
   - Kotak kamera berpendar hijau stabil (`is-verified`), stempel centang muncul.
   - Status: *"Wajah Terverifikasi! Wajah Hidup Terverifikasi"*.
   - Tombol *"Mulai Kerjakan Ujian"* aktif untuk memulai pengerjaan dan timer ujian.

---

## 3. Bukti Pengujian Empiris (Empirical Playwright Probe)

Pengujian dilakukan melalui probe browser Chromium tanpa asumsi teoretis:
- **Skrip Probe**: `tools/dev/probe-active-liveness.mjs`
- **Hasil Eksekusi**:
```json
{
  "ok": true,
  "hasLivenessFns": true,
  "hasPreflight": true,
  "hasBtnVerify": true,
  "staticCheckStage": "challenge",
  "staticVerified": false,
  "challengeStage": "challenge",
  "reopenStage": "verified",
  "blinkVerified": true,
  "panduanId": "Langkah 2/2: Kedipkan matamu perlahan atau tolehkan kepalamu",
  "suksesId": "Wajah Hidup Terverifikasi"
}
```
**Kesimpulan Empiris**:
- Foto statis diam terbukti `staticVerified: false` (tertahan di `challenge`).
- Gerakan kedip biologis terbukti `blinkVerified: true` (lolos ke `verified`).

---

## 4. Berkas yang Diubah

1. `features/class-hub/fiezel-face-guard.js`:
   - Penambahan `checkLiveness(video, canvas, ctx)`, `resetLiveness()`, `isLivenessVerified()`.
   - Kalibrasi baseline 2-fase, tracking durasi kedipan mata (60-900ms), tracking pergeseran centroid $\ge 4.0\text{px}$.
2. `features/class-hub/fiezel-class-hub.js`:
   - Integrasi `facePreflightView` untuk mendukung stage `challenge`.
   - Pemanggilan `face.resetLiveness()` di awal dan `face.checkLiveness()` di dalam scan interval loop.
3. `features/class-hub/class-hub.css`:
   - Styling `.ch-face-verify-box.is-challenge`, `.ch-preflight-status-badge.is-challenge`, animasi `chFacePulseBlue`.
4. `features/i18n/copy-id-proctor.js` & `features/i18n/copy-th-proctor.js`:
   - Penambahan kunci selaras: `proctor.verifikasi-liveness-panduan` dan `proctor.verifikasi-liveness-sukses`.
5. `lucide.min.js`:
   - Penambahan subset resmi SVG icon `"eye"`.
6. `tests/exam-focus-guard-test.js`:
   - Penambahan unit test liveness anti-spoofing (foto statis vs kedip vs toleh kepala).
7. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Baseline emas diperbarui secara sah sesuai protokol.
8. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Bump versi build serentak ke `m025-550` via `tools/bump-build.mjs`.

---

## 5. Status Gerbang Mutu Lokal (Hexa-Sync & Gates)

- `node tools/bump-build.mjs --check`: **Selaras (m025-550)**
- `node tests/curriculum-cache-version-test.js`: **PASS (m025-550)**
- `node tests/exam-focus-guard-test.js`: **PASS (Semua gerbang lulus)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (4025 kunci selaras)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/lucide-icon-coverage-test.js`: **PASS (130 glyph)**
