# FIEZEL Handoff Dossier: Android Over-The-Air (OTA) Live Auto-Sync Architecture (m025-639)

**Tanggal:** 24 Oktober 2026
**Build:** `m025-639` (Hexa-Sync 100% Selaras)
**Cabang:** `feat/android-live-ota-auto-sync`

---

## 1. Ringkasan & Akar Masalah
Pengguna meminta: *"AKU INGIN SETIAP ADA PEMBAHARUAN SEKECIL APAPUN LANGSUN OTOMATIS BISA TERSINKRON DENGAN APK"* (Saya ingin setiap ada pembaruan sekecil apapun langsung otomatis bisa tersinkron dengan APK).

### Akar Masalah Sebelumnya:
1. **Pencegatan Statis Lokal di WebView (`FiezelAssetLoaderFactory`)**:
   - `FiezelAssetLoaderFactory.java` sebelumnya mencegat seluruh permintaan ke `https://fiezel.my.id/app/*` secara tanpa syarat (unconditional) dan menyajikan berkas statis dari `assets/public/` yang dibundel di dalam APK saat proses kompilasi.
   - Akibatnya, sekalipun server `https://fiezel.my.id/app/` telah diperbarui dengan kode JavaScript, CSS, HTML, bank soal, kosa kata, atau audio terbaru, aplikasi APK murid tetap menyajikan salinan beku (*frozen snapshot*) dari dalam APK.
   - `fetchRemoteVersion()` pada kartu pembaruan web (`features/ui/fiezel-update-prompt.js`) yang mengecek `coordination/BUILD-VERSION.json` juga dicegat oleh loader lokal, sehingga peramban mengira tidak pernah ada build baru di server.
2. **Penyempitan Pemicu Workflow CI/CD (`build-android-apk.yml`)**:
   - Workflow GitHub Actions hanya memantau perubahan pada `android/**` dan `tools/**`.
   - Perubahan pada `index.html`, `app.js`, `style.css`, `features/**`, `kurikulum.html`, atau berkas konten aplikasi lainnya tidak pernah memicu kompilasi APK baru di GitHub Releases.

---

## 2. Solusi & Arsitektur Sinkronisasi Otomatis Terpadu (Dual-Pillar Sync)

### Pilar 1: Sinkronisasi Runtime Live Over-The-Air (OTA) di APK
1. **Live Network-First Pass-Through**:
   - Di `android/app/src/main/java/id/my/fiezel/app/loader/FiezelAssetLoaderFactory.java`, logika `shouldInterceptRequest` diperbarui:
     - Saat perangkat **terhubung ke internet (`isNetworkConnected() == true`)**: Mengembalikan `null` untuk domain `fiezel.my.id`. WebKit memuat kode terbaru langsung dari server produksi `https://fiezel.my.id/app/` melalui protokol HTTPS.
     - Setiap pembaruan yang digabungkan ke `main` dan dideploy ke web otomatis langsung aktif di aplikasi murid saat dimuat atau di-refresh tanpa perlu memasang ulang APK.
     - Saat perangkat **luring (offline)**: Otomatis mencegat permintaan dan menyajikan aset cadangan lokal dari `assets/public/` sehingga aplikasi tetap tangguh dan dapat dibuka saat tidak ada sinyal.
     - Domain virtual khusus `appassets.androidplatform.net` tetap dilayani 100% dari aset APK lokal.
2. **Auto-Reconnect on Resume**:
   - Di `MainActivity.java`, siklus hidup `onResume()` kini memeriksa apakah layar luring sedang aktif dan perangkat telah mendapatkan kembali koneksi internet. Jika ya, koneksi ke server live otomatis diulang tanpa intervensi pengguna.
3. **Bridge Interaktif (`FiezelNativeBridge.reloadApp()`)**:
   - Menyediakan antarmuka JavaScript `window.FiezelNative.reloadApp()` agar pembaruan yang dideteksi oleh `FiezelUpdatePrompt` dapat memicu muat ulang instan di thread UI native.

### Pilar 2: Kompilasi & Rilis APK Otomatis di CI/CD
1. **Perluasan Jalur Pemicu Push (`build-android-apk.yml`)**:
   - Menambahkan pemantauan terhadap seluruh berkas aplikasi inti: `features/**`, `assets/**`, `coordination/**`, `index.html`, `kurikulum.html`, `misi.html`, `undercover.html`, `app.js`, `style.css`, `sw.js`, `core-config.js`, `manifest.json`, dan `VERSION.json`.
   - Setiap kali terjadi push/merge ke `main`, GitHub Actions otomatis menjalankan `node tools/sync-android-assets.mjs --clean`, mengompilasi APK debug & release, menandatanganinya, dan memperbarui aset rilis publik di `https://github.com/FIEZEL-APPS/FIEZEL-APPS/releases/tag/v5.19.0`.

---

## 3. Bukti Verifikasi Mutu & Hasil Pengujian
1. **Automated Quality Gate**: `node tests/android-app-integrity-test.js`
   - Check 1 (Manifest): PASS
   - Check 2 (Gradle configs): PASS
   - Check 3 (MainActivity WebView): PASS
   - Check 4 (Assets bundle): PASS
   - Check 5 (App launcher icons across densities): PASS
   - Check 6 (GitHub Actions workflow): PASS
   - Check 7 (Zero secrets & prohibited claims): PASS
   - Hasil: **7/7 CHECKS PASSED (100% Green)**.
2. **OTA Live Sync Empirical Probe**: `node tests/android-ota-sync-verification-test.js`
   - 38/38 penegasan PASSED (100% Green).
3. **Workflow Configuration Test**: `python tests/test-build-android-workflow.py`
   - 16/16 langkah konfigurasi PASSED (100% Green).
4. **Workflow Actor Gate Test**: `node tests/workflow-actor-gate-test.js`
   - 56/56 penegasan PASSED (100% Green).
5. **Workflow Timeout Gate Test**: `node tests/workflow-timeout-gate-test.js`
   - 31/31 job berbatas waktu <= 120 menit (100% Green).
6. **Hexa-Sync Invariant**:
   - `coordination/BUILD-VERSION.json`: `m025-639`
   - `sw.js`: `m025-639`
   - `core-config.js`: `m025-639`
   - `features/neural-voice/fiezel-diag-panel.js`: `m025-639`
   - `kurikulum.html`: `m025-639`
   - `misi.html`: `m025-639`
   - Status: **100% Selaras**.

---

## 4. Daftar Berkas yang Disentuh
1. `android/app/src/main/java/id/my/fiezel/app/loader/FiezelAssetLoaderFactory.java`:
   - Penambahan deteksi koneksi jaringan `isNetworkConnected()`.
   - Pass-through live network saat online dan fallback lokal saat offline.
2. `android/app/src/main/java/id/my/fiezel/app/bridge/FiezelNativeBridge.java`:
   - Penambahan metode `@JavascriptInterface reloadApp()`.
3. `android/app/src/main/java/id/my/fiezel/app/MainActivity.java`:
   - Auto-reconnect live server pada siklus hidup `onResume()`.
4. `.github/workflows/build-android-apk.yml`:
   - Pemantauan push paths komprehensif untuk seluruh aset web dan fitur aplikasi.
5. `tests/android-ota-sync-verification-test.js`:
   - Skrip audit empiris verifikasi OTA synchronization.
6. Berkas Hexa-Sync:
   - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.
