# FIEZEL Handoff Dossier — Perombakan Total Mesin I18N & 9 Bahasa End-to-End

## 1. Ringkasan Eksekutif & Akar Masalah yang Ditemukan
Audit menyeluruh pada sistem lokalisasi FIEZEL mengungkap 4 akar kerusakan struktural yang menyebabkan pengguna di luar Bahasa Indonesia melihat teks gado-gado, kunci mentah (`nav.hari-ini`), atau tertahan pada bahasa Indonesia:

1. **1.395 Kunci Runtime Hilang dari `features/i18n/locales/*/*.json`**:
   - Seluruh `copy-id-*.js` mendaftarkan **6.073+ kunci runtime** (total kanonik **6.095 kunci** setelah digabung dengan katalog JSON dan autonym pengaturan), sedangkan `locales/*/*.json` sebelumnya hanya memuat **4.694 kunci**.
   - Permukaan utama seperti `copy-id-redesign.js` (354 kunci: navigasi bawah, beranda `"Hari ini"`), `copy-id-app-d.js` (579 kunci), `copy-id-student.js` (260 kunci), `copy-id-grammar-labels.js` (68 kunci), dan `copy-id-settings-locale.js` belum pernah masuk ke katalog JSON.
2. **88%–90% Stub Inggris Mentah di 5 Bahasa (`ms`, `fil`, `vi`, `ru`, `km`) & Korupsi Placeholder Lama**:
   - Agen terdahulu hanya menerjemahkan ±445 kunci pertama lalu menyalin mentah bahasa Inggris pada ±4.200 kunci sisanya, serta meninggalkan bug lama pada `settings.title` (`"{name}'s Experience"` tanpa parameter `{name}`) dan korupsi placeholder HTML `{questions}`.
3. **Kabel Putus di `FiezelI18n.overrideCopy()` (`features/i18n/fiezel-i18n.js`)**:
   - `overrideCopy()` tidak menyelesaikan antrean `availabilityWaiters` (`whenAvailable()`), sehingga layar Welcome/Auth (`fiezel-auth-screen.js`) dan Onboarding tidak pernah mendapat sinyal saat katalog JSON selesai diunduh.
4. **Kabel Re-render Putus di `app.js`, Onboarding, Auth, dan Pengaturan**:
   - `FiezelI18n.onChange` di `app.js` belum memanggil `__fzRefreshI18nTables()` + `render()` ketika bahasa asinkron mendarat; `fiezel-auth-screen.js` kehilangan `km` & `ru`; `fiezel-onboarding.js` dan `#settingLearnerLocale` belum menyediakan seluruh 9 bahasa.

---

## 2. Daftar Berkas yang Disentuh & Perbaikan
- **`features/i18n/locales/{id,en,th,ja,ms,fil,vi,ru,km}/{vocab,grammar,quiz,ui}.json` (36 berkas)**:
  - Disinkronkan penuh ke **6.095 kunci kanonik per bahasa** (**54.855 entri total**) dengan **0 selisih `{placeholder}`** (`phDiff = 0`) dan **0 kebocoran Bahasa Indonesia**.
  - Cakupan aksara asli non-Latin: Thai (`99,7%`), Jepang (`99,6%`), Rusia (`99,4%`), Khmer (`99,0%`).
  - Cakupan terjemahan murni rumpun Latin non-EN: Vietnam (`98,6%`), Melayu Malaysia (`98,0%`), Filipino (`94,5%`).
- **`features/i18n/fiezel-i18n.js` & `features/i18n/fiezel-ja-loader.js`**:
  - `overrideCopy()` kini memanggil `resolveWaiters()` agar `whenAvailable()` langsung tuntas begitu JSON selesai dimuat.
  - `loadLocale()` mendeduplikasi unduhan via `loadingPromises`, memuat latar belakang Golden Pivot `en`, menyimpan cache offline di `CacheStorage` (`fiezel-locale-<loc>-v1`), dan memicu `onChange`.
- **`features/auth/fiezel-auth-screen.js`**:
  - Melengkapi `ALL_LANGS` dengan seluruh 9 bahasa (`id, en, th, ja, ms, vi, fil, km, ru`).
- **`features/onboarding/fiezel-onboarding.js`**:
  - Menambahkan bendera SVG tajam lintas platform (`FLAG_MS`, `FLAG_VI`, `FLAG_FIL`, `FLAG_KM`, `FLAG_RU`), menampilkan seluruh 9 tombol bahasa pada Step 0, catatan pemuatan dalam bahasa asli masing-masing, serta gerbang tunggu `whenAvailable` untuk seluruh bahasa non-ID agar bebas kilatan bahasa Indonesia di Step 1.
- **`app.js`, `features/i18n/copy-id-settings-locale.js`, `features/i18n/copy-th-settings-locale.js`**:
  - Menghubungkan `FiezelI18n.onChange` ke `__fzRefreshI18nTables()` + `render()`.
  - Menyediakan 9 opsi autonym pada `#settingLearnerLocale` dan menunggu `whenAvailable(value, 'settings.locale-toast')` sebelum menampilkan toast konfirmasi.
- **`tests/i18n-global-purity-test.js`, `tests/onboarding-test.js`, `tests/all-9-locales-e2e-probe.mjs`**:
  - Memperketat gerbang CI menjadi 11 pemeriksaan puritas global (paritas 6.095 kunci runtime, paritas `{placeholder}` 100%, aksara asli $\ge 95\%$, anti-stub Inggris $\ge 92\%$).
  - Menambahkan probe empiris Chromium Playwright 9 bahasa (`33/33 PASS`).

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal
- `node tests/all-9-locales-e2e-probe.mjs` -> **33 LULUS, 0 GAGAL** (Welcome/Auth 9 bahasa, Onboarding Step 0 -> Step 1 9 bahasa, Home + Bottom Nav + Settings `#settingLearnerLocale` 9 bahasa, 0 `pageerror`).
- `node tests/japanese-i18n-probe.mjs` -> **100% SUKSES**.
- `node tests/i18n-global-purity-test.js` -> **11/11 HIJAU (PASS)**.
- `node tests/i18n-leak-guard-test.js` -> **100% HIJAU (PASS)**.
- `node tests/i18n-param-collision-test.js` -> **PASS (202 berkas)**.
- `node tests/i18n-kunci-hantu-test.js` -> **PASS**.
- `node tests/th-coverage-test.js` & `node tests/th-ui-leak-test.js` -> **100% HIJAU (PASS)**.
- `node tests/onboarding-test.js` -> **PASS**.
- `node tests/id-golden-snapshot-test.js` -> **HIJAU**.
- `node tests/gate-registry-test.js` & `node tools/fiezel-guardians.mjs self-test` -> **PASS**.

## 4. Catatan Rilis (Menunggu Izin Deploy Owner)
Seluruh perubahan terisolasi di worktree `c:\Users\hp\fiezel-i18n-audit-2b81` pada cabang `feat/japanese-i18n-engine-m025-765` sesuai perintah untuk **tidak melakukan deploy terlebih dahulu** selama sesi audit koordinator berlangsung. Saat diizinkan rilis nanti, cukup lakukan rebase terhadap `origin/main` terbaru, jalankan `node tools/bump-build.mjs`, lalu buka PR ke `main`.
