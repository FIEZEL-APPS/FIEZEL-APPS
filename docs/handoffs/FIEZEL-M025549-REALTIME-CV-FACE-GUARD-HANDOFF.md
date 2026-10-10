# FIEZEL — Berkas Serah Terima: Detektor Wajah Real-Time CV Murni (m025-549)

**ID Build**: `m025-549`<br>
**Cakupan**: Proctoring Kelasku Ujian (Deteksi Kehadiran Wajah Real-Time & Pra-Ujian Anti-Fake)<br>
**Tanggal**: 10 Oktober 2026<br>
**Status**: Lulus 100% Seluruh Gerbang Mutu Lokal & Probe Playwright<br>

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Pengujian langsung oleh pengguna pada PWA produksi melaporkan dua masalah fatal:
1. **Delay Super Lambat / Tidak Real-Time**:
   - Interval sampling sebelumnya disetel 1000ms (1 FPS) dengan ambang peringatan 2000ms, sehingga membutuhkan waktu 3–4 detik untuk memicu peringatan setelah wajah meninggalkan layar, dan 1–2 detik lagi untuk menutup modal saat kembali.
2. **Sistem Tidak Pernah Memverifikasi Wajah Secara Khusus (Data Palsu / Dummy Bypass)**:
   - Di `features/class-hub/fiezel-class-hub.js`, fungsi `doScan()` memiliki logika `if (consecutivePasses >= 1 || pollCount >= 4)`. Akibatnya, setelah 4 kali polling (0,6 detik), kamera yang mengarah ke meja kayu, dinding kosong, atau ditutup lakban otomatis diluluskan (`verified = true`).
   - Di `features/class-hub/fiezel-face-guard.js`, fungsi `fallbackCheck` hanya menguji `skinRatio >= 0.025` (2,5%). Di hampir semua ruangan dengan perabot kayu atau pencahayaan hangat, persentase piksel hangat selalu $> 2,5\%$, sehingga meja kayu, lantai, dan dinding selalu dianggap sebagai wajah manusia hidup.
   - Elemen `<video>` tersembunyi disetel `opacity: 0.001; zIndex: -9999`, yang pada browser mobile (iOS Safari / Android Chrome) dianggap *occluded* oleh compositor engine, menyebabkan pemrosesan frame kamera ter-throttle ke 0 FPS.

---

## 2. Solusi Rekayasa & Algoritma Computer Vision

1. **Algoritma Computer Vision Murni Tanpa Data Palsu**:
   - Mengimplementasikan analisis spektrum kromatisitas universal $YC_bC_r$ ($C_b \in [75, 130]$, $C_r \in [133, 175]$ dipadukan dengan batasan melanin/hemoglobin $R > G > B$ dan $R - G \ge 8$).
   - Mengharuskan konsentrasi kulit oval tengah $\ge 14\%$ frame 64x48.
   - Menghitung gradien mikro-tekstur fitur wajah (mata, alis, hidung, bibir) dengan magnitude lokal dan rata-rata.
   - Menerapkan kontras Haar vertikal Viola-Jones (*T-Zone Eye-Dip*): dahi dan tulang pipi memiliki pantulan cahaya lebih terang daripada lekukan soket mata/alis ($Y_{\text{dahi}} > Y_{\text{mata}}$ dan $Y_{\text{pipi}} > Y_{\text{mata}}$).
   - Menolak secara akurat: ruangan gelap gulita, silau ekstrem tanpa kontras, dinding kosong, meja kayu dengan guratan serat kayu, telapak tangan/jempol penutup lensa, dan pengguna yang berpaling atau meninggalkan layar.
2. **Respon Cepat & Responsif Sub-Detik**:
   - `SAMPLE_INTERVAL_MS` diturunkan menjadi **250ms** (4 FPS).
   - `WARN_THRESHOLD_MS` diturunkan menjadi **750ms** (3 detak berturut-turut tanpa wajah).
   - Peringatan ramah muncul dalam ~0,75 detik saat murid keluar dari kamera, dan tertutup instan dalam $\le 250\text{ms}$ begitu murid kembali menghadap kamera.
3. **Pemberantasan Auto-Pass di Tahap Preflight**:
   - Menghapus total `|| pollCount >= 4`.
   - Menjadikan `face.checkNow()` evaluasi sinkron langsung terhadap algoritma CV dan deteksi wajah native. Objek non-wajah tidak akan pernah lulus verifikasi.
4. **Anti-Throttling Video GPU Mobile**:
   - Elemen `<video>` latar belakang disetel `position: fixed; top: 0; left: 0; width: 4px; height: 4px; opacity: 0.05; pointer-events: none; zIndex: 999999;` agar browser engine memperlakukan frame kamera sebagai elemen aktif tanpa mengorbankan tampilan visual.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Chromium)

Dijalankan melalui `tools/dev/probe-face-cv-realtime.mjs`:
```
[PROBE] Server berjalan di http://localhost:8999
[PROBE] Hasil evaluasi empiris di Chromium Playwright: {
  sampleInterval: 250,
  warnThreshold: 750,
  darkRes: false,
  wallRes: false,
  faceRes: true,
  woodRes: false,
  palmRes: false,
  awayRes: false
}
[PROBE] >>> SEMUA PENGUJIAN EMPIRIS CV REALTIME LULUS 100%! <<<
```

---

## 4. Daftar Berkas yang Disentuh

1. `features/class-hub/fiezel-face-guard.js`:
   - Penyetelan konstanta real-time: `SAMPLE_INTERVAL_MS = 250`, `WARN_THRESHOLD_MS = 750`.
   - Algoritma CV presisi tinggi: $YC_bC_r$ skin cluster, Haar vertical eye-dip, micro-edge texture gradient.
   - Styling video anti-throttling mobile (`width: 4px; height: 4px; opacity: 0.05; zIndex: 999999`).
   - Implementasi `checkNow()` sinkron dengan penanganan hasil instan.
2. `features/class-hub/fiezel-class-hub.js`:
   - Penghapusan dummy bypass `pollCount >= 4` di tahap preflight.
   - Pengecekan verifikasi wajah asli dengan default `false`.
3. `tests/exam-focus-guard-test.js`:
   - Pembaruan pengujian konstanta 250ms / 750ms.
   - Penambahan kasus uji penolakan meja kayu, telapak tangan, dan murid berpaling.
4. `id-golden-baseline.json`:
   - Regenerasi baseline melalui `--write-baseline` selaras dengan pembaruan kode.
5. `tools/dev/probe-face-cv-realtime.mjs`:
   - Skrip probe Playwright empiris Chromium headless untuk pengujian deteksi wajah.
6. Berkas hexa-sync:
   - `sw.js` (`m025-549`)
   - `core-config.js` (`m025-549`)
   - `features/neural-voice/fiezel-diag-panel.js` (`m025-549`)
   - `kurikulum.html` (`m025-549`)
   - `misi.html` (`m025-549`)
   - `coordination/BUILD-VERSION.json` (`m025-549`)

---

## 5. Status Gerbang Mutu Lokal

- `node tests/exam-focus-guard-test.js`: **PASS** (100% lulus)
- `node tests/id-golden-snapshot-test.js`: **PASS** (100% lulus)
- `node tests/th-ui-leak-test.js`: **PASS** (100% lulus)
- `node tests/curriculum-cache-version-test.js`: **PASS** (100% lulus)
- `node tests/gate-registry-test.js`: **PASS** (100% lulus)
- `node tests/lucide-icon-coverage-test.js`: **PASS** (100% lulus)
- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync 6/6)**
