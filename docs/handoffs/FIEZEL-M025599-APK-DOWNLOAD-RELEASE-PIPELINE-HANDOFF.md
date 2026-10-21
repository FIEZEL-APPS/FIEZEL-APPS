# FIEZEL M025-599 HANDOFF DOSSIER: APK DOWNLOAD & RELEASE PIPELINE REPAIR

## 1. Ringkasan Eksekutif & Akar Masalah
- **Laporan Pengguna**: *"tidak bisa unduh di web"* saat mencoba mengunduh aplikasi Android dari `https://fiezel.my.id/install/` dan `https://fiezel.my.id/`.
- **Akar Masalah (Root Cause)**:
  1. Tautan tombol unduh mengarah ke `https://github.com/FIEZEL-APPS/FIEZEL-APPS/releases/latest/download/fiezel-app-release.apk`.
  2. Repositori GitHub `FIEZEL-APPS/FIEZEL-APPS` belum pernah memiliki satu pun rilis resmi (daftar rilis kosong). Akibatnya, tautan tersebut mengembalikan galat **HTTP 404 Not Found**.
  3. Alur kerja CI `.github/workflows/build-android-apk.yml` pada eksekusi sebelumnya (Run #39081628428) mengalami kegagalan pada langkah `Set up Android SDK` (`android-actions/setup-android@v3` gagal menjalankan `sdkmanager tools` karena paket `tools` telah didepresiasi dan dihapus oleh Google pada commandline-tools 16+).
  4. Alur kerja tersebut juga memiliki izin `permissions: contents: read` sehingga tidak memiliki hak akses untuk mempublikasikan aset APK ke GitHub Releases.

---

## 2. Solusi & Perbaikan Sistemik
1. **Perbaikan CI/CD Android SDK Environment**:
   - Menghapus ketergantungan pada action bermasalah `android-actions/setup-android@v3`.
   - Menggunakan Android SDK bawaan GitHub Actions runner `ubuntu-latest` yang terletak di `/usr/local/lib/android/sdk`.
   - Menyetujui lisensi SDK secara otomatis dengan mendeteksi direktori `cmdline-tools` secara dinamis.
2. **Penerbitan Otomatis GitHub Release**:
   - Memperbarui izin workflow menjadi `permissions: contents: write`.
   - Menambahkan langkah resmi `Create or Update GitHub Release` menggunakan CLI `gh release create v5.19.0 fiezel-app-release.apk fiezel-app-debug.apk --latest || gh release upload v5.19.0 ... --clobber`.
   - Memastikan `fiezel-app-release.apk` langsung terpasang pada endpoint publik `/releases/latest/download/fiezel-app-release.apk`.
3. **Peningkatan Permukaan Tautan di Web (`fiezel.my.id`)**:
   - Di `website/install/index.html`: Menyediakan tautan transparan ke halaman rilis GitHub resmi (`/releases`) tepat di bawah tombol utama, serta panduan langkah 1 dengan tautan alternatif.
   - Di `website/index.html`: Menambahkan tombol aksi langsung **"Unduh APK Android (.apk)"** di kartu instalasi beranda sehingga pengguna tidak harus berpindah halaman.
4. **Sinkronisasi Versi Hexa-Sync**:
   - Menaikkan nomor build arbiter dari `m025-598` menjadi `m025-599` via `node tools/bump-build.mjs`.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal
- **`node tests/android-app-integrity-test.js`**: 7/7 Check PASSED (100% Green).
- **`node tests/workflow-actor-gate-test.js`**: 42/42 Assertions PASSED (100% Green).
- **`python tests/test-build-android-workflow.py`**: 16/16 Steps PASSED (Workflow production-ready).
- **`node tests/id-golden-snapshot-test.js`**: Baseline emas bahasa Indonesia utuh (100% Green).
- **`node tests/th-ui-leak-test.js`**: 0 kebocoran UI (100% Green).
- **`node tests/curriculum-cache-version-test.js`**: 26 penegasan PASSED (build m025-599).
- **`node tests/gate-registry-test.js`**: 10 pass, 0 fail.

---

## 4. Berkas yang Diperbarui
1. `.github/workflows/build-android-apk.yml`:
   - Penambahan `permissions: contents: write`.
   - Perbaikan inisialisasi Android SDK runner.
   - Penambahan langkah penerbitan rilis GitHub resmi `v5.19.0`.
2. `tests/test-build-android-workflow.py`: Penyesuaian assertion runner SDK environment.
3. `website/install/index.html`: Penambahan tautan alternatif & catatan rilis GitHub.
4. `website/index.html`: Penambahan tombol Unduh APK Android di kartu instalasi beranda.
5. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump nomor build hexa-sync ke `m025-599`.
