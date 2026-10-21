# HANDOFF DOSSIER: PENCATATAN INSTAN BUKTI KELUAR LAYAR & WAJAH TAK TERDETEKSI (m025-557)

**Build:** `m025-557`
**Tanggal:** 10 Oktober 2026
**Cakupan:** `features/class-hub/fiezel-focus-guard.js`, `features/class-hub/fiezel-face-guard.js`, `features/class-hub/fiezel-class-hub.js`, `tests/exam-focus-guard-test.js`, `id-golden-baseline.json`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

---

## 1. Ringkasan Kebutuhan & Akar Masalah (Root Cause)

1. **Ambang Batas Kepergian (Grace Period) Menahan Bukti 1 Detik**:
   - Sebelumnya, `GRACE_MS` diatur pada `1500ms` (1.5 detik) dan `FACE_GRACE_MS` diatur pada `10000ms` (10 detik).
   - Akibatnya, ketika murid keluar layar selama 1 detik (1000ms < 1500ms) atau wajah tidak terlihat selama 1-9 detik (1000-9000ms < 10000ms), `back()` dan `backFace()` mengembalikan `null` dan membuang episode kepergian tersebut seolah-olah tidak pernah terjadi.
   - **Perbaikan**:
     - `GRACE_MS` diturunkan menjadi `500ms` (0.5 detik). Kepergian manusia 1 detik (1000ms) kini 100% langsung tercatat dan dihitung (`n += 1`, `ms += span`), sementara fluktuasi sub-detik sistem OS tetap terhindar dari noise.
     - `FACE_GRACE_MS` diturunkan menjadi `1000ms` (1.0 detik). Hilangnya wajah dari kamera selama 1 detik ke atas kini 100% langsung tercatat dan dilaporkan (`faceN += 1`, `faceMs += span`), sementara kedipan mata alami (100-400ms) tetap terlindungi.

2. **Ambang Batas Peringatan & Episode Wajah (Face Guard Thresholds)**:
   - Sebelumnya, `WARN_THRESHOLD_MS` adalah 2500ms dan `ABSENT_THRESHOLD_MS` adalah 10000ms.
   - Akibatnya, modal peringatan ramah dan getaran baru muncul setelah 2.5 detik, dan pengiriman episode baru terpicu setelah 10 detik.
   - **Perbaikan**:
     - `WARN_THRESHOLD_MS` diturunkan menjadi `1000ms` (1 detik): modal peringatan ramah dan getar langsung aktif begitu wajah tidak terlihat selama 1 detik.
     - `ABSENT_THRESHOLD_MS` diturunkan menjadi `2000ms` (2 detik): pengiriman ke guru segera terpicu jika murid meninggalkan kamera.

3. **Sinkronisasi Instan Hitungan Slot Proctor Banner**:
   - Sebelumnya, perhitungan `leaveCount` dan `faceCount` memeriksa `(!sum || sum.n === 0)` yang menyebabkan kepergian kedua dan seterusnya tertahan pada angka lama hingga episode selesai.
   - **Perbaikan**: Perhitungan slot live memakai formula deterministik:
     - `leaveCount = (st ? (st.n || 0) : 0) + (isLeaveLive ? 1 : 0)`
     - `faceCount = (st ? (st.faceN || 0) : 0) + (isFaceLive ? 1 : 0)`
     - Angka langsung melompat seketika (1x, 2x, dst.) pada milidetik pertama kejadian tanpa desinkronisasi.

---

## 2. Bukti Pengujian Mutu (Quality Gates)

Semua gerbang mutu lokal 100% HIJAU:
- `node tests/exam-focus-guard-test.js` -> 27/27 PASS (termasuk uji pencatatan instan 1 detik dan kepergian berulang tanpa desinkronisasi).
- `node tests/id-golden-snapshot-test.js` -> PASS (baseline naskah Indonesia utuh).
- `node tests/th-ui-leak-test.js` -> PASS (nol kebocoran naskah).
- `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan pada build m025-557).
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check` -> Selaras (`m025-557`).
