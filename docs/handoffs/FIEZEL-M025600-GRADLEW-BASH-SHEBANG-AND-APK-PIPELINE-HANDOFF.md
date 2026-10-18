# FIEZEL M025-600 HANDOFF DOSSIER: GRADLEW BASH INVOCATION & APK COMPILATION PIPELINE

## 1. Ringkasan Eksekutif & Temuan Empiris
- **Temuan Run #39085999048**: Pada alur kerja GitHub Actions `Build Android APK`, proses kompilasi gagal pada langkah `Build Debug APK` dengan pesan galat:
  `./gradlew: 129: Syntax error: "(" unexpected`
- **Akar Masalah (Root Cause)**:
  - Berkas `android/gradlew` sebelumnya memiliki shebang `#!/bin/sh`.
  - Pada runner Ubuntu (GitHub Actions `ubuntu-latest`), `/bin/sh` terhubung secara bawaan ke `dash` (Debian Almquist Shell), bukan `bash`.
  - Sintaks deklarasi array bash seperti `APP_ARGS=()`, penugasan indeks `APP_ARGS[$APP_ARGS_INDEX]=...`, fungsi `function splitJvmOpts()`, dan ekspansi array `"${APP_ARGS[@]}"` pada baris 129–143 tidak valid dalam `dash`.
  - Akibatnya shell berhenti seketika dengan kode keluar 2 (*Process completed with exit code 2*).

---

## 2. Solusi & Perbaikan Sistemik
1. **Perbaikan Shebang `android/gradlew`**:
   - Mengubah baris 1 dari `#!/bin/sh` menjadi `#!/usr/bin/env bash` agar peramban eksekusi Linux selalu menggunakan bash interpreter.
2. **Eksplisit Invokasi Bash di CI**:
   - Memperbarui langkah `Build Debug APK` dan `Build Release APK` di `.github/workflows/build-android-apk.yml` menjadi:
     `run: bash ./gradlew assembleDebug --stacktrace`
     `run: bash ./gradlew assembleRelease --stacktrace`
3. **Penyelarasan Hexa-Sync**:
   - Menaikkan nomor build arbiter dari `m025-599` ke `m025-600` via `node tools/bump-build.mjs`.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal
- **`node tests/android-app-integrity-test.js`**: 7/7 Check PASSED (100% Green).
- **`node tests/workflow-actor-gate-test.js`**: 42/42 Assertions PASSED (100% Green).
- **`python tests/test-build-android-workflow.py`**: 16/16 Steps PASSED (Workflow production-ready).
- **`node tests/id-golden-snapshot-test.js`**: Baseline emas bahasa Indonesia utuh (100% Green).
- **`node tests/th-ui-leak-test.js`**: 0 kebocoran UI (100% Green).
- **`node tests/curriculum-cache-version-test.js`**: 26 penegasan PASSED (build m025-600).
- **`node tests/gate-registry-test.js`**: 10 pass, 0 fail.

---

## 4. Berkas yang Diperbarui
1. `android/gradlew`: Shebang diperbarui ke `#!/usr/bin/env bash`.
2. `.github/workflows/build-android-apk.yml`: Invokasi bash eksplisit untuk `assembleDebug` dan `assembleRelease`.
3. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump versi build ke `m025-600`.
4. `docs/handoffs/FIEZEL-M025600-GRADLEW-BASH-SHEBANG-AND-APK-PIPELINE-HANDOFF.md`: Dokumen serah terima rilis.
