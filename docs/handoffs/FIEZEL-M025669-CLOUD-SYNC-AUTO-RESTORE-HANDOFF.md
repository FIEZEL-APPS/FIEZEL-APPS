# FIEZEL HANDOFF DOSSIER: M025-669

**Release Revision**: `m025-669`
**Cakupan**: Otomatisasi Sinkronisasi Cloud & Pemulihan Progres Murid Multi-Perangkat saat Login Google / Puter
**Tanggal**: 2026-10-25

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Kondisi Awal (The Root Problem)
1. **Penyimpanan Lokal Eksklusif**: Secara default, progres belajar murid (`totalAnswered`, `history`, `vocab`, `grammar`, `BKT`) hanya tersimpan di `localStorage` peramban perangkat lokal.
2. **Sinkronisasi Server Mati Total Secara Bawaan**: Jalur `/api/brain/attempts` menuntut `preferences.progressSyncConsent` (bawaan: `false`/kosong) dan `preferences.brainSync`. Akibatnya, saat murid login menggunakan akun Google atau Puter, data riwayat belajar **TIDAK PERNAH dikirim ke server**.
3. **Data Hilang Setelah Update PWA / Pembersihan Cache**: Jika murid membuka perangkat baru, membersihkan penyimpanan peramban, atau berpindah HP, data murid tampak kembali ke 0 karena penampung akun lokal (`fiezel-v5-state:<uuid>`) kosong dan server belum pernah menerima data.
4. **Pemulihan Rekonstruksi yang Belum Tuntas**: `brainSyncApplyRebuild()` sebelumnya hanya menulis ulang model BKT dan Ledger miskonsepsi, namun **tidak merekonstruksi** `state.history`, `state.totalAnswered`, dan `state.totalCorrect` ke dalam state murid.

### B. Solusi yang Diterapkan pada Build `m025-669`
1. **Consent Otomatis Implisit saat Login (`murid-login`)**:
   - Di dalam `activateAccountState()` (Google) dan `activateAccountStateFromPuter()` (Puter), jika izin belum tercatat, sistem otomatis mencatat `progressSyncConsent: { at: Date.now(), by: 'murid-login' }`.
   - Menghapus pembatasan manual agar data murid langsung tersinkronkan ke server secara otomatis begitu terhubung dengan akun.
2. **Unggah Otomatis (`queueBrainSyncFlush`)**:
   - Begitu login selesai, sistem menjadwalkan `queueBrainSyncFlush(500)` untuk mengirimkan seluruh percobaan belajar lokal yang belum tersimpan ke `/api/brain/attempts`.
3. **Pemulihan Otomatis Multi-Perangkat (`brainSyncPull` & Rebuild)**:
   - Jika perangkat murid memiliki riwayat lokal yang kosong (`localLen === 0`) atau lebih sedikit dari yang tersimpan di server, sistem otomatis menarik catatan latihan dari server via `brainSyncPull()`.
   - Menjalankan `brainSyncRebuild(remote)` dan `brainSyncApplyRebuild(hasil)`.
4. **Rekonstruksi Penuh State Murid**:
   - `brainSyncApplyRebuild()` kini merekonstruksi array `state.history` dari aliran stream percobaan server, menghitung `totalAnswered` dan `totalCorrect`, menyimpan ke `localStorage` via `save()`, dan memanggil `render()`.
   - Murid langsung melihat progres aslinya kembali secara utuh tanpa perlu melakukan interaksi manual.
5. **Pencarian State Lokal Universal**:
   - `findBestStoredStudentState()` diperluas untuk memindai seluruh kunci di `localStorage` melalui `studentProgressEvidenceScore()`, memastikan tidak ada data lama murid yang terlewatkan.

---

## 2. Bukti Pengujian Empiris & Verifikasi Mutu

### Pengujian Lokal (100% Lulus)
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran naskah)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman selaras m025-669)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/reset-side-state-test.js`: **PASS (7 uji, 15 kunci bukti murid dijaga)**
- `node tests/i18n-kunci-hantu-test.js`: **PASS (5659 kunci id terdaftar)**
- `node tests/save-path-perf-test.js`: **PASS (koalesensi save <= 1 write)**
- `node tools/bump-build.mjs --check`: **PASS (Hexa-Sync 6 titik selaras m025-669)**

---

## 3. Daftar Berkas yang Diubah

1. `app.js`:
   - Penambahan auto-consent dan auto-flush pada `activateAccountState()` & `activateAccountStateFromPuter()`.
   - Auto-restore progres dari server saat riwayat lokal kosong / berpindah perangkat.
   - Peningkatan `brainSyncApplyRebuild()` untuk memulihkan `state.history`, `totalAnswered`, dan `totalCorrect`.
   - Perluasan pemindaian kandidat state lokal di `findBestStoredStudentState()`.
2. `id-golden-baseline.json`:
   - Pembaruan baseline teks Indonesia (5.937 literal).
3. `coordination/BUILD-VERSION.json`:
   - Versi build dinaikkan ke `m025-669`.
4. `core-config.js`:
   - `FIEZEL_PAGE_BUILD` disinkronkan ke `m025-669`.
5. `sw.js`:
   - `SW_REV` disinkronkan ke `m025-669-unified-grammar-20261002`.
6. `features/neural-voice/fiezel-diag-panel.js`:
   - `DIAG_BUILD` disinkronkan ke `m025-669`.
7. `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Parameter cachebuster disinkronkan ke `?v=m025-669`.
