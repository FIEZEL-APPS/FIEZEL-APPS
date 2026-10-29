# FIEZEL HANDOFF: M025-726 FEEDBACK SIDE-EFFECT ISOLATION & SECURITY HARDENING

## 1. Identitas Rilis & Konkurensi
- **Nomor Build**: `m025-726` (Hexa-Sync & Octa-Sync selaras)
- **Branch**: `feat/feedback-slide-sheet-m025-719`
- **Pull Request**: [#777](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/777)
- **Worktree**: `C:\Users\hp\fiezel-feedback-m025-716`
- **Root Workspace**: `C:\Users\hp\fiezel-apps` (steril)

## 2. Ringkasan Perbaikan & Invarian yang Diperketat
1. **Eliminasi Total Celah Bypass Otentikasi**:
   - Menghapus disjungsi `bypass_auth` / `dev=1` dari `app.js` dan banner `isLocalHost` dev bypass dari `features/auth/fiezel-auth-screen.js`.
   - Menggantikannya dengan tombol resmi "Masuk sebagai Pengunjung / Tamu" (`auth.layar.tamu`) yang terdaftar dwibahasa di `copy-id-google.js` dan `copy-th-google.js`. Sesi produksi pengguna aktif tidak akan pernah tertimpa atau hilang.
2. **Pemisahan Aksi Keluar Feedback Sheet vs Memajukan Kuis (`closeFeedbackSheet(advance)`)**:
   - Menambahkan parameter boolean `advance = true` pada `closeFeedbackSheet()`.
   - Menekan tombol `[✕ Keluar]` (`#quizSheetExit`) atau `[✕]` (`#feedbackSheetClose`) memanggil `closeFeedbackSheet(false)`, sehingga event `quizNext.click()` TIDAK PERNAH terpanggil secara tidak sengaja. State kuis tetap berada di soal yang sama saat membuka dialog konfirmasi keluar.
3. **Penyelarasan Naskah i18n & Eliminasi Kebocoran Thai**:
   - Menambahkan kunci `quiz.clean-correct-takeaway` di `copy-id-app-e.js` dan `copy-th-app-e.js` untuk sintesis kesimpulan takeaway tanpa menyisakan string literal Indonesia yang membocorkan naskah di mode Thai.
   - Gerbang `tests/th-ui-leak-test.js` lulus 100% (26 berkas, 4585 kunci, 0 kebocoran).
4. **Pembersihan Regex Anti-Ghost Answer di Probe Verifikasi**:
   - Menyelaraskan pengambilan index distraktor di `tools/dev/verify-5-user-issues-probe.mjs` menggunakan `findIndex` dinamis untuk memilih opsi distraktor valid tanpa hardcoding.

## 3. Quantitative Verification Table (Rule 2 Invariant)

| Item / Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Auth Security Purity** | Zero bypass di URL query param | `isLocalHostDev` & `bypass_auth` dihapus total | **PASS** |
| **PWA Active State Safety** | State pengguna aktif di PWA 100% terjaga | Zero localStorage wipe, preserve session | **PASS** |
| **Exit Side Effect Isolation** | Tombol Keluar tidak memajukan soal | `closeFeedbackSheet(false)` tanpa `quizNext.click()` | **PASS** |
| **Thai Leak Gate** | `app.js` $\le 3$ literal, `auth` $= 0$ | `app.js: 3/3`, `auth: 0/0`, 4585 kunci matched | **PASS** |
| **Content Integrity Gate** | 4 dari 4 gerbang konten lulus | `node tests/content-integrity-gate.js` PASS (100% HIJAU) | **PASS** |
| **Curriculum Cache Version** | 8 titik query string selaras | `m025-726` di seluruh berkas HTML turunan | **PASS** |
| **Regression Test Suite** | 100% lulus tanpa kegagalan mock DOM | `node tests/regression-test.js` PASS | **PASS** |
| **View Reachability Gate** | Seluruh 67 penegasan rute lulus | `node tests/view-reachability-test.js` PASS | **PASS** |
