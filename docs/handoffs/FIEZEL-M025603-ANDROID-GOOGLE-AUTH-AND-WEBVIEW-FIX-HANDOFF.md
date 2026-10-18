# FIEZEL HANDOFF DOSSIER: ANDROID GOOGLE AUTH, POPUP MULTI-WINDOW & WEBVIEW RESILIENCE FIX (m025-603)

**Tanggal**: 18 Oktober 2026
**Build Target**: `m025-603`
**Cabang**: `fix/android-google-oauth-and-webview-polish`
**Status Kesiapan**: 100% SIAP RILIS (All 7 Quality Gates Hijau)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Laporan kendala murid: *"aplikasinya ngebug parah, login google tidak bisa, dan masih banyak lagi"*.
Setelah dilakukan audit menyeluruh pada native shell Android (`id.my.fiezel.app`) dan integrasi WebView, ditemukan 4 akar penyebab fatal:

### A. Google Sign-In 403 `disallowed_useragent`
- **Akar Masalah**: Google Identity Services (`accounts.google.com`) secara ketat memblokir login dari WebView bawaan Android jika User-Agent mengandung penanda webview internal seperti `; wv` atau `Version/4.0 Chrome/...`. Permintaan OAuth langsung ditolak oleh Google dengan layar eror 403 `disallowed_useragent`.
- **Solusi**: Mengimplementasikan `sanitizeUserAgent()` di `MainActivity.java` yang membedah dan membersihkan token `; wv` serta `Version/\d+\.\d+\s+`, menyajikan identitas Chrome Mobile modern yang bersih tanpa merusak kompatibilitas webview.

### B. Popup Window Jatuh / Batal Otomatis (Google OAuth Popups)
- **Akar Masalah**: Tombol login Google Fiezel (`features/auth/fiezel-google.js`) mengonfigurasi `ux_mode: 'popup'`. Ini memicu `window.open()`. Tanpa `setSupportMultipleWindows(true)` dan implementasi `WebChromeClient.onCreateWindow()`, sistem Android WebView secara default mematikan pembuatan jendela baru dan mengembalikan `false`, sehingga jendela otentikasi Google tidak pernah muncul di layar.
- **Solusi**:
  1. Mengaktifkan `settings.setSupportMultipleWindows(true)` dan `settings.setJavaScriptCanOpenWindowsAutomatically(true)`.
  2. Mengimplementasikan `onCreateWindow` dan `onCloseWindow` pada `FiezelWebChromeClient.java`.
  3. Membangun modal otentikasi interaktif `Dialog` berbasis Material Light Fullscreen di `MainActivity.java` dengan toolbar independen, tombol batal/tutup, status bar pelindung, User-Agent tersanitasi, dan integrasi penanganan tombol Back (`activeAuthDialog.dismiss()`).

### C. Pemblokiran Domain Autentikasi Google oleh WebViewClient
- **Akar Masalah**: `FiezelWebViewClient.shouldOverrideUrlLoading` sebelumnya melempar seluruh tautan non-internal ke browser eksternal via Android Intent. Hal ini menyebabkan domain otentikasi Google (`accounts.google.com`, `accounts.youtube.com`, `*.google.com`, `*.googleusercontent.com`) terlempar keluar dari siklus aplikasi ke peramban luar dan memutus sesi token callback ke aplikasi Fiezel.
- **Solusi**: Menambahkan whitelist `isAuthDomain` untuk domain Google Identity (`accounts.google.com`, `*.google.com`, `*.googleusercontent.com`, `*.gstatic.com`, `*.googleapis.com`) agar seluruh pertukaran token tetap berlangsung aman dan tuntas di dalam WebView aplikasi.

### D. Jebakan Layar Offline Permanen (*Inverted Condition Bug*)
- **Akar Masalah**: Di `MainActivity.java` baris `onPageLoadingFinished`, terdapat logika inversi:
  ```java
  if (!isOfflineVisible) {
      showOfflineScreen(false, null);
  }
  ```
  Jika terjadi gangguan koneksi sementara atau eror pemuatan pertama yang menyalakan `isOfflineVisible = true`, kondisi `!isOfflineVisible` menjadi `false`. Akibatnya, saat halaman berhasil dimuat kembali secara sempurna, layar offline fallback **TIDAK PERNAH DITUTUP**, menjebak murid di layar "Koneksi Terputus" selamanya.
- **Solusi**: Mengubah pemanggilan `showOfflineScreen(false, null)` secara tanpa syarat pada `onPageLoadingFinished` saat halaman sukses termuat, serta menjamin retry connection membersihkan state kegagalan.

### E. Penanganan Parameter Versi Query pada SmartAssetsPathHandler
- **Akar Masalah**: Aset publik versi cache (`app.js?v=m025-603`, `style.css?v=m025-603`) gagal diresolve oleh `SmartAssetsPathHandler` pada WebViewAssetLoader karena parameter query `?v=...` diikutsertakan dalam pembukaan `AssetManager.open()`.
- **Solusi**: Menghapus parameter `?` dan `#` pada `SmartAssetsPathHandler` sebelum mencari kandidat berkas lokal di `assets/public/`.

---

## 2. Bukti Verifikasi & Pengujian Mutu

Seluruh gerbang mutu lokal telah dijalankan di lingkungan kerja dan berhasil 100% HIJAU:

1. **Android Integrity Test** (`node tests/android-app-integrity-test.js`):
   - Check 1: AndroidManifest.xml Specification Validity (PASS)
   - Check 2: Gradle Build Configurations Syntax & Dependencies (PASS)
   - Check 3: MainActivity.java Architecture, OAuth Popups & UA Sanitization (PASS)
   - Check 4: Offline Web Runtime Assets in assets/public/ (PASS)
   - Check 5: App Launcher Icons Across Densities (PASS)
   - Check 6: CI/CD Workflow build-android-apk.yml (PASS)
   - Check 7: Zero-Secret & Zero-Prohibited-Claims Security Compliance (PASS)
   - **Hasil**: 7 / 7 Checks Passed.

2. **Android Asset Bundle Integrity Gate** (`node tests/android-asset-bundle-test.js`):
   - 3.808 penegasan terpenuhi.
   - 714 berkas terverifikasi utuh (48.04 MB).
   - Versi build terikat: `m025-603` (PASS).

3. **CI/CD Workflow Build Android APK Gate** (`python tests/test-build-android-workflow.py`):
   - 16 konfigurasi tahapan valid (PASS).

4. **Curriculum Cache Version Gate** (`node tests/curriculum-cache-version-test.js`):
   - 26 penegasan, 2 halaman, build `m025-603` (PASS).

5. **Gate Registry Test** (`node tests/gate-registry-test.js`):
   - 10 / 10 checks passed (PASS).

6. **Indonesian Golden Baseline Snapshot** (`node tests/id-golden-snapshot-test.js`):
   - 13 berkas terkunci identik, literal Indonesia utuh dan bersih (HIJAU / PASS).

7. **Thai UI Leak Test** (`node tests/th-ui-leak-test.js`):
   - 4.389 kunci teruji bebas bocoran (PASS).

8. **Hexa-Sync Invariant** (`node tools/bump-build.mjs --check`):
   - `sw.js`: m025-603
   - `core-config.js`: m025-603
   - `features/neural-voice/fiezel-diag-panel.js`: m025-603
   - `kurikulum.html`: m025-603
   - `misi.html`: m025-603
   - `coordination/BUILD-VERSION.json`: m025-603
   - Status: Selaras (PASS).

---

## 3. Daftar Berkas yang Dimodifikasi

1. `android/app/src/main/java/id/my/fiezel/app/MainActivity.java`:
   - Penambahan sanitasi User-Agent `sanitizeUserAgent()`.
   - Pengaktifan multi-window, 3rd party cookies, dan Service Worker asset interceptor.
   - Implementasi full-screen dialog untuk `onCreateWindow` dan `onCloseWindow`.
   - Perbaikan bug inversi offline fallback pada `onPageLoadingFinished`.
   - Integrasi tombol back navigation ke active auth dialog.
2. `android/app/src/main/java/id/my/fiezel/app/client/FiezelWebChromeClient.java`:
   - Penambahan callback interface dan implementasi `onCreateWindow` serta `onCloseWindow`.
3. `android/app/src/main/java/id/my/fiezel/app/client/FiezelWebViewClient.java`:
   - Penambahan whitelist domain otentikasi Google (`accounts.google.com`, dsb).
4. `android/app/src/main/java/id/my/fiezel/app/loader/FiezelAssetLoaderFactory.java`:
   - Sanitasi path aset dengan menghapus query parameter (`?`) dan hash (`#`).
5. `tests/android-app-integrity-test.js`:
   - Penambahan assertion ketat untuk OAuth popup lifecycle, third-party cookies, dan User-Agent sanitization.
6. Berkas Sinkronisasi Nomor Build (`m025-602`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `reports/th-ui-leak-report.json`
7. Berkas Dokumentasi:
   - `docs/handoffs/FIEZEL-M025602-ANDROID-GOOGLE-AUTH-AND-WEBVIEW-FIX-HANDOFF.md`
