# FIEZEL HANDOFF DOSSIER: M025-555
**Judul**: Slot Mandiri Minimalis Keluar Layar & Wajah Tak Terdeteksi Kamera Instan Otomatis (Zero-Collision Proctoring)
**Tanggal**: 2026-10-10
**Build Target**: `m025-555`
**Otoritas**: OWNER / MASTER Release Authority
**Status**: READY FOR PRODUCTION DEPLOYMENT
**Penulis**: Antigravity AI Engine Pair Programmer

---

## 1. Ringkasan Temuan Audit & Akar Masalah (Root Cause Analysis)

### Keluhan Pengguna:
*"keterangan tulisan warna merah yang memberitahukan murid kalau dia telah keluar layar dan wajahnya tidak terlihat kamera belum instan keluar pemberitahuannya, tidak otomatis, dan seharusnya tulisan pemberitahuannya tidak tertimpa pada masing masing pemberitahuan harus ada slot masing masing yang minimalis dan simpel aja tida perlu teks yang panjang. contoh terdeteksi : keluar layar 1x (5s) wajah tidak terdeteksi kamera : 1x (10s)"*

### Temuan Akar Masalah Teknis (Deep Technical RCA):
1. **Pemberitahuan Wajah Tidak Instan (Delay 2.5s & 10s)**:
   - Pada `fiezel-face-guard.js`, `onWarning` dipagari oleh `WARN_THRESHOLD_MS = 2500` (2.5 detik).
   - Di `fiezel-focus-guard.js`, metrik `vn` (visual absent count) baru dihitung saat durasi kepergian melebihi `FACE_GRACE_MS = 10000` (10 detik).
   - Akibatnya, pada detik 0 s.d. 2.5 saat murid menoleh atau menjauh dari kamera, proctor banner masih menampilkan `Mode ujian aktif` tanpa indikator merah apapun!
2. **Pemberitahuan Keluar Layar Tidak Otomatis Saat Sedang Terjadi**:
   - Di `focusBanner()`, kondisi kemunculan slot keluar layar hanya mengevaluasi `hasLeave = (sum && sum.n > 0)`.
   - Pada saat murid pertama kali meninggalkan tab/aplikasi (`st.awaySince > 0`), nilai `sum.n` masih `0` karena belum ada episode tertutup yang melewati `GRACE_MS` (1.5s).
   - Akibatnya, saat murid sedang berada di luar layar, proctor banner tidak menampilkan slot merah real-time apapun!
3. **Pemberitahuan Tertimpa & Teks Panjang Bertele-tele**:
   - Sebelumnya, saat peringatan wajah terjadi, ada dua badge terpisah yang saling menempel (`Wajah di luar kamera!` dan `Wajah tak terlihat: 1x (10d)`), ditambah popup modal besar (`faceAlertModal`) yang menutupi layar ujian murid.
   - Tidak ada pemisahan slot yang terstruktur antara peristiwa keluar layar dan peristiwa wajah tak terdeteksi kamera.

---

## 2. Solusi Rekayasa Proctoring & Dual Dedicated Slots (m025-555)

1. **Dua Slot Terdedikasi Mandiri (Dual Dedicated Slots)**:
   - **Slot 1 (Keluar Layar)**:
     - Evaluasi real-time `isLeaveLive = !!(st && st.awaySince)`.
     - Saat murid sedang di luar layar: **Instan detik ke-0** berubah menjadi **MERAH ALERT (`is-alert`)** dengan durasi live: `⚠️ Keluar layar: 1x (1s)` $\to$ `(2s)` $\to$ `(3s)`...
     - Saat sudah kembali (riwayat): `⚠️ Keluar layar: 1x (5s)` (`is-warn`).
     - Saat bersih: `🛡️ Keluar layar: 0×` (`is-clean`).
   - **Slot 2 (Wajah Tidak Terdeteksi Kamera)**:
     - Evaluasi real-time `isFaceLive = !!(st && st.faceAwaySince) || isFaceWarn`.
     - Saat wajah tidak terlihat kamera: **Instan detik ke-0 (frame pertama $\le 250\text{ms}$)** berubah menjadi **MERAH ALERT (`is-alert`)** dengan durasi live: `⚠️ Wajah tak terlihat: 1x (1s)` $\to$ `(2s)` $\to$ `(3s)`...
     - Saat wajah kembali terlihat (riwayat): `⚠️ Wajah tak terlihat: 1x (10s)` (`is-warn`).
     - Saat bersih: `📷 Wajah tak terlihat: 0×` (`is-clean`).
   - **Slot 3 (Kamera PIP Video)**:
     - Kamera miniatur live feed tetap tampil di ujung kanan: `<video data-face-pip>` + dot hijau `● Kamera aktif`.

2. **Nol Tabrakan / Anti-Collision**:
   - Kedua slot berada berdampingan di dalam `.ch-proctor-slots` secara independen. Tidak ada teks yang menimpa atau menumpuk.
   - Format teks ringkas, minimalis, dan padat:
     `Keluar layar: 1x (5s)`
     `Wajah tak terlihat: 1x (10s)`

3. **Getaran Taktil Instan (`navigator.vibrate`)**:
   - Di callback `onAbsent`, saat frame pertama wajah menghilang, getaran taktil halus (80ms) langsung dipicu di perangkat murid agar murid sadar seketika tanpa mengganggu konsentrasi ujian.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal

- `node tests/exam-focus-guard-test.js`: **PASS** (Semua 26 pengujian fokus & proctoring lulus 100%).
- `node tests/id-golden-snapshot-test.js`: **PASS** (Baseline emas naskah Indonesia utuh).
- `node tests/th-ui-leak-test.js`: **PASS** (Nol kebocoran naskah).
- `node tests/curriculum-cache-version-test.js`: **PASS** (Terkonfirmasi build `m025-555`).
- `node tests/gate-registry-test.js`: **PASS** (374 berkas uji terdaftar, 0 fail).
- `git diff --check`: **BERSIH** (Tanpa trailing whitespace).

---

## 4. Daftar Berkas yang Disentuh (Hexa-Sync Invariant)

1. `features/class-hub/fiezel-class-hub.js`:
   - Implementasi dual dedicated slots pada `focusBanner()` dengan evaluasi live real-time detik instan untuk keluar layar dan wajah tidak terdeteksi.
2. `features/class-hub/class-hub.css`:
   - Penyesuaian styling `.ch-proctor-slot.is-clean` sebagai subtle pill badge yang seragam.
3. `coordination/BUILD-VERSION.json`: Dinaikkan ke `m025-555`.
4. `sw.js`: `SW_REV` dinaikkan ke `m025-555`.
5. `core-config.js`: `self.FIEZEL_PAGE_BUILD` dinaikkan ke `m025-555`.
6. `features/neural-voice/fiezel-diag-panel.js`: `var DIAG_BUILD` dinaikkan ke `m025-555`.
7. `kurikulum.html`: Cache query dinaikkan ke `?v=m025-555`.
8. `misi.html`: Cache query dinaikkan ke `?v=m025-555`.
