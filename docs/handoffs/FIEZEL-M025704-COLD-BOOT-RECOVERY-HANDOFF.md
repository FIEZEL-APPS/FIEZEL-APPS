# DOKUMEN SERAH TERIMA TEKNIS (HANDOFF DOSSIER)
# FIEZEL RELEASE BUILD m025-704: PWA COLD-BOOT ZERO-BLOCKER & DUOLINGO-PARITY QUICK-WIN LESSON

**Tanggal Rilis**: 28 Oktober 2026
**Nomor Versi Build**: `m025-704`
**Branch Fitur**: `feat/pwa-recovery-epic`
**Worktree Terisolasi**: `c:\Users\hp\fiezel-pwa-recovery-53c29b7d`
**Baseline Hulu**: `origin/main` commit `62ad7eb7` (`m025-703`)
**Penulis/Agen**: Antigravity Assistant (Session `53c29b7d-5d4c-4f0d-80c6-971cc3705aa0`)

---

## 1. Ringkasan Eksekutif & Latar Belakang Masalah

Pada versi produksi sebelumnya (`https://fiezel.my.id/app/`), terdapat regresi katastropik saat pengguna baru membuka aplikasi (*zero-storage cold-boot*):
1. **The Hostile Auth Ambush**: `app.js` memanggil `authGateNeeded()` sebelum `showOnboarding()`. Karena pengguna baru tidak memiliki token sesi, antarmuka langsung membeku dan memasang kelas body `fz-auth-open` serta `auth-locked`, mengurung murid baru di balik dinding login sebelum sempat mencoba aplikasi.
2. **Handle Validation Freeze**: Fungsi `validateLearnerNameAvailability` memanggil round-trip jaringan ke `api.fiezel.my.id` tanpa perlindungan batas waktu (timeout), menyebabkan tombol "Lanjut" membeku pada label `"Memeriksa..."` selama 10–30 detik ketika jaringan lambat atau terhalang CORS.
3. **Mochi Mascot Asset 404**: Referensi `./mochi-mascot/fiezel-mochi.js` melempar HTTP 404 pada sub-path browser.
4. **Quick-Win Question Schema Contract**: Soal latihan kilat pemula (`startQuickWinLesson`) ditolak oleh `validateQuestion(q)` karena tidak menyertakan objek `explain: { why, rule, distractor, memory }`, sehingga `quizLoop` langsung keluar tanpa menyajikan soal pertama.
5. **Missing Multi-Device Responsive Verification**: Kontainer desktop dan mobile belum diaudit secara visual di dua resolusi target (`390x844` mobile & `1280x800` desktop).

Rilis `m025-704` ini secara tuntas memulihkan 100% alur pengguna baru tanpa hambatan, mengaktifkan jalur Dual-Gate ("Mulai dari Nol" vs "Cari Level Saya"), menyajikan Quick-Win lesson Duolingo-parity (`あ` + `い` = `あい`), dan menyinkronkan 6 titik versi Hexa-Sync tanpa tabrakan build.

---

## 2. Tabel Verifikasi Kuantitatif (Zero-Potemkin Invariant)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Cold-Boot Zero Storage** | `#app` tidak kosong, tanpa auth-lock, onboarding tampil seketika | Body class `fz-lux scene-day`, zero auth-locked, dialog onboarding muncul <1.5s | **PASS (100%)** |
| **Mochi Companion Asset** | Zero 404 error pada konsol browser | URL resolusi absolut `new URL(..., window.location.href)`, 0 file 404 | **PASS (100%)** |
| **Handle Network Fallback** | Maksimal 1200ms saat offline / CORS issue | `Promise.race` 1200ms graceful fallback to `{ok: true}` | **PASS (100%)** |
| **Dual-Gate Onboarding** | Pilihan cabang Step 4: "Mulai dari Nol" & "Cari Level Saya" | `[data-ob-beginner]` & `[data-ob-placement]` tampil nyata | **PASS (100%)** |
| **Quick-Win Lesson Content** | $\ge 3$ soal valid dengan schema pedagogis lengkap | 3 soal Jepang (`qw-ja-1`, `qw-ja-2`, `qw-ja-3`) + 3 soal Inggris lengkap dengan `explain` `{why, rule, distractor, memory}` | **PASS (100%)** |
| **Lesson Sequencing** | Soal terurut stabil (`あ` $\rightarrow$ `い` $\rightarrow$ `あい`) | `allowCrossLevel: true` & `preserveOrder: true` dipatuhi `quizLoop` | **PASS (100%)** |
| **First-Session Reward** | Murid naik ke Level 1 dengan minimal 15 gems | Stage Victory tampil, `state.level = 1`, `state.gems = 30`, `placementDone = true` | **PASS (100%)** |
| **Mobile Thumb Zone** | CTA tombol aksi utama 100% *above the fold* (<844px) | Mobile beginner button y=498px (dalam 844px viewport) | **PASS (100%)** |
| **Desktop Split / Responsive** | Kontainer tidak void melompong, split/centered adaptif | Desktop container 1280px dengan kartu sentral 500px, topografi emas, background `#F8F9FA` | **PASS (100%)** |
| **Hexa-Sync Build** | 6 titik versi selaras | `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html` = `m025-704` | **PASS (100%)** |

---

## 3. Hasil Pengujian Otomatis

Semua pengujian dijalankan di dalam worktree `c:\Users\hp\fiezel-pwa-recovery-53c29b7d`:

1. **`node tests/cold-boot-zero-blocker-test.js`**:
   - `[PROBE 1]` Cold-boot navigation with clean storage: PASS (No auth lock, onboarding active, zero 404s).
   - `[PROBE 2]` Step 0 (Language: id) $\rightarrow$ Step 1 (Name) $\rightarrow$ Step 2 (Course: ja) $\rightarrow$ Step 3 (Goal): PASS.
   - `[PROBE 3]` Dual-Gate fork validation: PASS (`data-ob-beginner` & `data-ob-placement` visible).
   - `[PROBE 4]` Clicking "Mulai dari Nol": PASS (Quiz shell rendered via DOM native without iframe).
   - `[PROBE 5]` Answering 3 Quick-Win questions: PASS.
   - `[PROBE 6]` Victory Stage & State Transition: PASS (`state.level = 1`, `state.gems = 30`, `placementDone = true`).
   - **Hasil Akhir**: `>>> ALL COLD-BOOT & DUOLINGO-PARITY CHECKS PASSED 100%! <<<`

2. **`node tests/responsive-visual-audit.js`**:
   - `[AUDIT 1]` Mobile Viewport (`390 x 844`): Button box `{ x: 38, y: 498, width: 314, height: 40 }` $\rightarrow$ Above the fold!
   - `[AUDIT 2]` Desktop Viewport (`1280 x 800`): Full width 1280px container, centered card max-width 500px, background `#F8F9FA`, topographic accents $\rightarrow$ PASS.
   - **Hasil Akhir**: `>>> RESPONSIVE AUDIT COMPLETED SUCCESSFULLY! <<<`

3. **`node tests/content-integrity-gate-test.js`**:
   - **Hasil**: `18 PASS / 0 FAIL`

4. **`node tests/onboarding-test.js`**:
   - **Hasil**: `55 PASS / 0 FAIL`

5. **`node tests/coordination-guard-test.js`**:
   - **Hasil**: `24/24 assert PASS`

---

## 4. Berkas yang Diubah

1. `app.js`:
   - Mengubah urutan eksekusi di `startWelcomeExperience()` agar `showOnboarding()` dipanggil sebelum `authGateNeeded()`.
   - Menambahkan pembersihan kelas body `fz-auth-open` dan `auth-locked` pada `afterOnboardingExit()`.
   - Menambahkan `Promise.race` 1200ms fallback pada `validateLearnerNameAvailability`.
   - Mengonfigurasi `startQuickWinLesson()` dengan schema `explain: { why, rule, distractor, memory }`, `allowCrossLevel: true`, dan `preserveOrder: true`.
   - Mengarahkan `onFinish: () => afterOnboardingExit('home')` yang otomatis mengecek `obRecord.via === 'beginner'`.
2. `features/mascot/fiezel-mochi-companion.js`:
   - Memperbaiki path URL resolusi modul maskot agar tidak memicu HTTP 404.
3. `tools/bump-build.mjs`:
   - Menambahkan `versiYangDiklaimDiOpenPR()` via `gh pr list` dan dukungan `FIEZEL_MIN_BUILD` untuk mencegah tabrakan nomor build multi-agent secara otomatis.
4. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Ditingkatkan ke versi build resmi `m025-704`.
5. `tests/cold-boot-zero-blocker-test.js` & `tests/responsive-visual-audit.js`:
   - Test suite permanen untuk mengunci integritas cold-boot dan tampilan multi-device.
