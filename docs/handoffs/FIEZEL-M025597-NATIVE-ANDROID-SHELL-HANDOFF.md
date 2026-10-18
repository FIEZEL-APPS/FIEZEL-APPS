# FIEZEL M025-596 HANDOFF DOSSIER: NATIVE ANDROID SHELL & APK DISTRIBUTION

## 1. Ringkasan Eksekutif & Alasan Perubahan
- **Konteks**: Permintaan eksplisit pengguna untuk membuat aplikasi FIEZEL dapat diinstal di Android sebagai aplikasi native murni (.apk), bukan hanya sekadar shortcut PWA, serta menyediakan berkas/tautan unduhan langsung di situs resmi `fiezel.my.id`.
- **Eksekusi 10 Subagent**: 10 subagent dikerahkan secara paralel dan terorkestrasi untuk merancang arsitektur, mengaudit kapabilitas web (WASM Sherpa-ONNX 158 MB, WebRTC proctoring, IndexedDB), menyusun scaffold Gradle 8.3 / Java 17, mengonfigurasi manifest & permission, membuat adaptive icons 5 densitas, mengimplementasikan `MainActivity.java` dengan `WebViewAssetLoader`, memaketkan 713 berkas runtime (47.99 MB) ke `assets/public/`, membangun workflow CI/CD GitHub Actions APK builder, menyusun skrip build lokal Windows 1-klik, dan memverifikasi kualitas dengan 3.802 assertions test gate.

---

## 2. Arsitektur & Komponen Android
- **Package ID**: `id.my.fiezel.app`
- **Application Name**: `FIEZEL`
- **SDK Targets**: `compileSdk 34`, `targetSdk 34` (Android 14), `minSdk 24` (Android 7.0 Nougat).
- **Core Technology**: AndroidX WebKit + `WebViewAssetLoader` memetakan aset lokal APK ke domain HTTPS virtual (`https://fiezel.my.id/app/` dan `https://appassets.androidplatform.net/assets/public/`). Hal ini menyelesaikan CORS, Web Audio Worklet, dan penyimpanan IndexedDB secara aman.
- **Hardware Integrations**:
  - Kamera & Mikrofon: Ditangani via `WebChromeClient.onPermissionRequest` untuk proctoring kehadiran wajah dan latihan speaking.
  - HTML5 File Chooser: Ditangani via `WebChromeClient.onShowFileChooser`.
  - Predictive Back Navigation: Menggunakan AndroidX `OnBackPressedCallback` dengan penanganan kiosk proctoring saat ujian aktif dan konfirmasi keluar ganda (*double-tap to exit*).
  - External Routing: Tautan eksternal (WhatsApp, panggilan telepon, email) dibuka lewat Intent aplikasi Android bawaan.

---

## 3. Integrasi Permukaan Web (`fiezel.my.id`)
- **`website/install/index.html`**:
  - Ditambahkan banner & tombol utama **"Unduh APK Android (.apk)"** yang menunjuk langsung ke rilis APK terbaru.
  - Ditambahkan panduan instalasi langkah demi langkah untuk Android (izinkan sumber tidak dikenal, instal, dan jalankan).
  - Pilihan alternatif pasang lewat browser Chrome (PWA) tetap dipertahankan.
- **`website/index.html`**:
  - Bagian `#pasang` (Pemasangan) diperbarui untuk menyertakan opsi aplikasi native APK Android di samping opsi PWA.

---

## 4. Bukti Pengujian Empiris & Gerbang Mutu Lokal
- **`node tests/android-app-integrity-test.js`**: 7/7 Check PASSED (100% Green).
- **`node tests/android-asset-bundle-test.js`**: 3,802 Assertions PASSED (713 berkas, 47.99 MB terverifikasi).
- **`node tools/dev/test-local-android-packaging.js`**: PASSED (100% Green).
- **`node tests/curriculum-cache-version-test.js`**: 26 penegasan PASSED (build m025-596).
- **`node tests/seo-surface-gate-test.js`**: 21/21 PASSED.
- **`node tests/th-ui-leak-test.js`**: PASSED.
- **`node tests/id-golden-snapshot-test.js`**: PASSED (baseline emas Indonesia utuh).
- **`node tests/secret-scan-test.js`**: 46/46 Assertions PASSED (0 temuan, .jar & mochi-mascot allowlist selaras).
- **`node tests/gate-registry-test.js`**: 10 pass, 0 fail.

---

## 5. Berkas yang Terlibat
1. `android/`: Seluruh proyek native Android (Gradle, Java source, drawables, mipmap icons, XML configs, assets).
2. `.github/workflows/build-android-apk.yml`: CI/CD APK builder (Debug & Release).
3. `tools/build-android-apk.bat` & `tools/build-android-apk.ps1`: Skrip build Windows 1-klik.
4. `tools/sync-android-assets.mjs`: Pengepak aset offline lokal Android.
5. `website/install/index.html`: Penambahan tombol & panduan unduh APK.
6. `website/index.html`: Pembaruan kartu pemasangan dengan opsi APK.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump build arbiter m025-596.
8. `tests/palette-gate-test.js`: Pengecualian direktori `android/` dari pemindaian inventaris SVG maskot mentah.
9. `tests/secret-scan-test.js`: Pendaftaran ekstensi biner `.jar` resmi (`gradle-wrapper.jar`).
10. `.gitignore`: Allowlist `!android/**/*.png` untuk ikon launcher, serta pengabaian bundle offline ter-generate `android/app/src/main/assets/public/`.
11. `tests/android-app-integrity-test.js`: Verifikasi integritas native shell & auto-sync bundle on-demand.

---

## 6. Status & Kelayakan Rilis
- **Status**: Production Ready / Siap Rilis ke Main.
- **Otoritas**: OWNER / MASTER authority direction strictly enforced. Zero breaking changes on existing PWA.

---

## 7. Langkah Selanjutnya (Next Steps / Roadmap)
1. Merge Pull Request #637 ke branch `main`.
2. Pantau workflow `FIEZEL Deploy Site` dan `build-android-apk.yml` hingga selesai.
3. Rilis binary APK resmi (`fiezel-app-release.apk`) ke GitHub Releases tag `v5.19.0-m025-596`.
4. Verifikasi unduhan APK di `https://fiezel.my.id/install/` berfungsi sempurna pada perangkat Android fisik.
