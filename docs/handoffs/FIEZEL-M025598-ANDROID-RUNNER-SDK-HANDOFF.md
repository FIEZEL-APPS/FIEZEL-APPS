# FIEZEL M025-598 HANDOFF DOSSIER: ANDROID CI RUNNER SDK ALIGNMENT

## 1. Ringkasan Eksekutif & Alasan Perubahan
- **Konteks**: Pada workflow CI/CD `build-android-apk.yml`, aksi `android-actions/setup-android@v3` memanggil perintah usang `sdkmanager tools` yang gagal di runner modern GitHub Actions karena paket `tools` telah digantikan oleh `cmdline-tools`.
- **Perbaikan**: Mengganti aksi pihak ketiga dengan konfigurasi langsung environment `ANDROID_HOME` yang telah terpasang bawaan di runner `ubuntu-latest` (`/usr/local/lib/android/sdk`) serta mengeksekusi penerimaan lisensi SDK via `cmdline-tools`.
- **Penyelarasan**: Menjaga integritas Check 6 `tests/android-app-integrity-test.js` (tetap memvalidasi `ANDROID_HOME`).

---

## 2. Bukti Pengujian Empiris & Gerbang Mutu Lokal
- **`node tests/android-app-integrity-test.js`**: 7/7 PASSED (100% Green).
- **`node tests/workflow-actor-gate-test.js`**: PASSED.
- **`node tests/workflow-timeout-gate-test.js`**: PASS.
- **`node tests/curriculum-cache-version-test.js`**: 26 penegasan PASSED (build m025-598).
- **`node tests/build-number-uniqueness-test.js`**: PASS (m025-598 belum pernah diklaim).
- **`node tools/bump-build.mjs --check`**: Selaras (m025-598).

---

## 3. Berkas yang Terlibat
1. `.github/workflows/build-android-apk.yml`: Menyelaraskan langkah SDK ke runner bawaan.
2. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump build arbiter m025-598.
3. `docs/handoffs/FIEZEL-M025598-ANDROID-RUNNER-SDK-HANDOFF.md`: Handoff dossier resmi.

---

## 4. Status & Kelayakan Rilis
- **Status**: Production Ready.
- **Otoritas**: OWNER / MASTER authority direction strictly enforced.

---

## 5. Langkah Selanjutnya (Next Steps / Roadmap)
1. Merge Pull Request ke branch `main`.
2. Jalankan workflow `Build Android APK` dan pastikan kompilasi APK hijau.
