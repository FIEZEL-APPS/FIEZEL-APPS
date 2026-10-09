# FIEZEL · Handoff Dossier: Face Presence Guard & Proctor Telemetry (m025-540)

Dokumen serah terima resmi untuk subsistem **Detektor Kehadiran Wajah di Kamera & Telemetri Pengawas Ujian KelasKu**.

## 1. Ringkasan & Alasan Perubahan
- **Latar Belakang**: Ujian mini dan tugas resmi dari guru (`assignment.mode === 'ujian'`) di KelasKu sebelumnya hanya memantau keluar-aplikasi (`visibilitychange`, `blur`, `pagehide`). Namun, murid dapat meletakkan HP di meja dan melihat sumber lain tanpa meminimalkan browser.
- **Keputusan Desain & Pedagogis**:
  - Dilarang membuat sistem eksekutor kaku ("langsung eliminasi otomatis 10 detik") karena rentan *false positive* (membaca kanji/teks panjang di bawah layar HP, sudut kamera bezel atas, kedipan kognitif wajar, HP entry-level lag).
  - Mengimplementasikan sistem **Asisten Pengawas / Flagging Alert & Face Presence Guard** yang hemat daya, aman bagi privasi, dan memberikan peringatan visual bertahap.
  - **Masa Tenggang Bertahap**:
    - Detik 1–4: Gerakan wajar / menunduk membaca (tidak ada penalti).
    - Detik 5: Banner peringatan visual mengambang di layar murid: *"Wajah tidak terdeteksi di kamera depan. Harap menghadap layar HP agar ujian tidak ditandai pengawas."*
    - Detik 10: Episode ketidakhadiran dicatat secara resmi ke mesin status (`vn`, `vs`, `vx`) dan dikirim ke guru.
  - **Otoritas Akhir**: Guru tetap memegang otoritas penuh di dashboard guru KelasKu. Sistem melaporkan fakta objektif tanpa menuduh.

---

## 2. Arsitektur Teknis & Optimasi Hemat Daya
1. **Ultra-Lightweight Sampling (0.67 FPS / 1.5 detik per snapshot)**:
   - Tidak menggunakan stream 30/60 FPS yang menguras baterai dan membuat ponsel panas.
   - Snapshot diambil ke offscreen canvas mini (64×48 px) tiap 1.500 ms.
2. **Dual-Tier Detector**:
   - Tier 1: Native Chromium OS `window.FaceDetector` (Shape Detection API - 0 KB download, hardware-accelerated).
   - Tier 2: Algoritma variasi kontras & warna kulit universal pada offscreen canvas untuk lingkungan tanpa native API.
3. **Clean Teardown**:
   - Stream kamera dan seluruh tracks dihentikan seketika saat ujian selesai (`finishRunner` / `closeRunner`) sehingga lampu/titik indikator privasi kamera HP murid langsung padam.
4. **Graceful Fallback**:
   - Jika kamera tidak tersedia atau murid menolak izin kamera, ujian tidak crash dan tidak memblokir murid; status ditandai secara objektif.

---

## 3. Kontrak Data & Payload (`assign.f`)
Data yang dikirim ke guru melalui jalur upsert laporan kelas diperluas tanpa merusak kompatibilitas lama:
- `n`: Kali keluar aplikasi (integer)
- `s`: Total detik keluar aplikasi (integer)
- `x`: Durasi terlama keluar aplikasi (integer)
- `vn` (opsional): Kali wajah tidak terlihat $\ge 10$ detik (integer)
- `vs` (opsional): Total detik wajah tidak terlihat (integer)
- `vx` (opsional): Durasi terlama wajah tidak terlihat (integer)

---

## 4. Berkas yang Diubah / Ditambahkan
1. `features/class-hub/fiezel-face-guard.js` (Baru):
   - Modul deteksi kamera & presence analyzer throttled 1.5s dengan lifecycle `start()`, `stop()`, `isActive()`, `isWarning()`.
2. `features/class-hub/fiezel-focus-guard.js`:
   - Penambahan `leaveFace()`, `backFace()`, `FACE_GRACE_MS = 10000`, metrik visual `vn, vs, vx` pada `summary()` dan `payload()`.
   - Modul tetap 100% murni fungsional tanpa DOM/jaringan/jam internal.
3. `features/class-hub/fiezel-class-hub.js`:
   - Pengikatan lifecycle kamera ke `bindFocus()` dan `unbindFocus()`.
   - Rendering badge kamera (`● Kamera ujian aktif`) dan banner peringatan wajah `ch-proctor-face`.
   - Pembaruan `focusChip()` dan `focusCount()` untuk memperhitungkan `f.vn`.
4. `features/class-hub/class-hub.css`:
   - Penambahan styling `.ch-camera-pill` dan animasi `.ch-proctor-face`.
5. `workers/api/teacher/class-sync-core.js`:
   - Normalisasi dan validasi server untuk `vn, vs, vx` dengan pembatas `FOCUS_N_MAX` dan `FOCUS_SEC_MAX`.
6. `features/teacher/fiezel-teacher-store.js` & `fiezel-teacher-shell.js`:
   - Pembaruan `normalizeFocus()`, `focusGrew()`, `focusLabel()`, `focusLevel()`, dan `inboxText()`.
   - Tampilan detail di laci murid dan kotak masuk guru saat terjadi kepergian wajah.
7. `features/i18n/copy-id-proctor.js` & `copy-th-proctor.js`:
   - Kunci lokalisasi dua bahasa: `proctor.kamera-aktif`, `proctor.wajah-peringatan`, `proctor.wajah-tercatat`.
8. `index.html` & `sw.js`:
   - Pendaftaran `<script defer src="./features/class-hub/fiezel-face-guard.js"></script>` dan precache di `ASSETS`.
9. `tests/exam-focus-guard-test.js`:
   - Uji batas toleransi 10 detik, server normalization, dan teacher store notification.
10. `tools/dev/probe-face-guard.js` (Baru):
    - Headless Chromium Playwright probe untuk pengujian empiris.

---

## 5. Bukti Pengujian Empiris & Gerbang Mutu
- **Playwright Headless Probe (`tools/dev/probe-face-guard.js`)**:
  - `faceGuardLoaded`: `true`
  - `focusGuardLoaded`: `true`
  - `classHubLoaded`: `true`
  - `faceGuardSupported`: `true`
  - `startOk`: `true`, `activeBefore`: `true`, `activeAfter`: `false` (clean stop)
  - `epBatalIsNull`: `true` (4 detik dibuang)
  - `epSahMs`: `15000` (15 detik dicatat)
  - `payload`: `{ n: 0, s: 0, x: 0, vn: 1, vs: 15, vx: 15 }`
- **Uji Gerbang Lokal**:
  - `node tests/exam-focus-guard-test.js` -> 14/14 PASS
  - `node tests/id-golden-snapshot-test.js` -> HIJAU (baseline emas utuh)
  - `node tests/th-ui-leak-test.js` -> PASS (3996 kunci paritas)
  - `node tests/curriculum-cache-version-test.js` -> PASS (build m025-540)
  - `node tests/gate-registry-test.js` -> PASS (10/10 meta-gates)
- **Status Hexa-Sync**:
  - Versi rilis: `m025-540` (Selaras di 6 titik).
