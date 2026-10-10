# HANDOFF DOSSIER: PERBAIKAN AKAR LIVENESS KEDIP MATA PERLAHAN & KETAHANAN TEMPORAL ANTI-SPOOFING (m025-556)

**Build:** `m025-556`
**Tanggal:** 10 Oktober 2026
**Cakupan:** `features/class-hub/fiezel-face-guard.js`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

---

## 1. Ringkasan Audit & Akar Masalah (Root Cause)

1. **Jendela Durasi Kedipan Terbatas pada 800ms**:
   - Panduan antarmuka secara eksplisit meminta murid *"Kedipkan matamu perlahan..."*. Murid yang patuh berkedip perlahan membutuhkan waktu 800–1200ms untuk menutup dan membuka kembali mata. Namun kode lama memotong batas atas durasi kedipan pada `800ms`. Setiap kedipan perlahan di atas 800ms diabaikan oleh sistem.
   - **Perbaikan**: Diperluas menjadi `dur >= 40 && dur <= 1600` agar mencakup kedipan refleks cepat maupun kedipan sengaja perlahan.

2. **Buffer Temporal Terpotong Sehingga Anti-Spoofing Temporal Tidak Pernah Aktif**:
   - Buffer `temporalHistory` lama dibatasi hanya 8 frame. Pada pemindaian 60ms pra-ujian, 8 frame hanya mencakup 480ms. Akibatnya, syarat `timeSpan >= 4500` tidak pernah tercapai secara matematis. Pengecekan foto diam di kertas (`isStatic`) dan kertas digoyang (`isRigidWobble`) tidak pernah bisa menolak objek karena frame lama selalu dibuang sebelum mencapai 4500ms.
   - **Perbaikan**: Ditambahkan pembatas laju sampel minimum 100ms untuk mencegah buffer flooding, kapasitas buffer diperbesar hingga 24 frame (mencakup 4000ms), dan ambang evaluasi disesuaikan ke `timeSpan >= 2000` dengan toleransi MAE `< 0.28`.

3. **Kebocoran State Temporal Antar Sesi**:
   - `start()` dan `stop()` tidak membersihkan `temporalHistory = []` dan `resetLiveness()`. Jika murid berpindah tugas atau memulai ulang ujian, riwayat frame sesi sebelumnya berpotensi bocor ke sesi baru.
   - **Perbaikan**: Pembersihan eksplisit `temporalHistory = []; resetLiveness();` di `start()` dan `stop()`.

4. **Pencegahan Kedipan Video Stream pada iOS Safari**:
   - Fungsi `attachPreview(vidEl)` sebelumnya selalu menetapkan ulang `vidEl.srcObject = state.stream` pada setiap render siklus UI, yang menyebabkan kedipan video hitam sesaat di browser WebKit iOS.
   - **Perbaikan**: Penjaga `if (vidEl.srcObject !== state.stream)` memastikan stream hanya dipasang bila belum terpasang.

---

## 2. Bukti Pengujian Mutu Lokal (Quality Gates)

Semua gerbang pengujian mutu lokal lulus 100%:
- `node tests/exam-focus-guard-test.js` $\to$ 26/26 PASS (lulus seluruh pengujian biometrik, liveness, modal, dedicated slots, runner, dan anti-spoofing).
- `node tests/id-golden-snapshot-test.js` $\to$ PASS (baseline emas naskah Indonesia utuh).
- `node tests/th-ui-leak-test.js` $\to$ PASS (nol kebocoran naskah).
- `node tests/curriculum-cache-version-test.js` $\to$ PASS (26 penegasan pada build m025-556).
- `node tests/gate-registry-test.js` $\to$ PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check` $\to$ Selaras (`m025-556`).
