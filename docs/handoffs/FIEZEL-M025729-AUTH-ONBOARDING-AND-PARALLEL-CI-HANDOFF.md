# FIEZEL M025-729 Handoff Dossier: Auth-First Cold Boot, New-vs-Returning Onboarding Routing, Mobile Daylight UI, Mochi Asset Cleanup, & 5-Way Parallel CI

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Urutan Cold-Boot Auth Terbalik (`app.js`)**:
   - Pada `m025-704`, pengecekan `!FiezelOnboarding.completed(self)` disisipkan di dalam `authGateNeeded()`, sehingga di perangkat/PWA baru layar Login (`FiezelAuthScreen`) tidak pernah muncul lebih dulu. Akibatnya murid lama & guru di HP baru tidak bisa login (tidak ada tombol masuk/pemilih peran di Onboarding), sedangkan murid baru masuk tanpa akun lalu ditabrak tembok login pada muat ulang berikutnya.
   - **Perbaikan**: Mengembalikan invarian Auth-First (`m025-367` & `tests/auth-screen-test.js` `C1–C4`) di `authGateNeeded()`, sementara server uji lokal tetap melewati login kecuali diminta eksplisit lewat `?fz_real_auth=1`.
2. **Pemisahan Murid Baru vs Murid Lama & Inisialisasi Rule 16 (`app.js`)**:
   - Sebelumnya `action === 'masuk'` selalu bernilai `true` pada layar masuk bawaan bahkan ketika pengguna Google baru pertama kali mendaftar (`via: 'google'`, `isNew: true`), sehingga murid baru Google dipaksa melompati Onboarding tanpa memilih kursus. Selain itu `afterOnboardingExit()` menulis `state.gems = (Number(state.gems)||0) + 15` yang merusak bentuk objek `{ balance }` menjadi `NaN -> 15`.
   - **Perbaikan**: Membedakan tegas `via === 'google'` (`isNew === false || hasLocalProgress`) dan `via === 'akun'` (`action === 'masuk' || isNew === false || hasLocalProgress`), menyegarkan `onboardingDone` di dalam `proceed()`, serta menjamin inisialisasi penuh Rule 16 (`state.level`, `state.placementDone`, `state.streak`, `state.gems = { balance }`, `save()`).
3. **Kartu Hitam `#14141E` di Layar Onboarding Mobile, Teks Kursus Terpotong, & Fallback Mochi (`features/ui/mobile-edge-fit.css`, `style.css`, `sw.js`)**:
   - Menyeleraskan `.fiezel-sheet`, `.fiezel-field input`, `.fiezel-carousel-item`, dan `.fiezel-goal-choice` di mobile ke palet terang Daylight Porcelain (`#FFFFFF` / `#F8FAFC` dengan teks `#0F172A` kontras tinggi AAA).
   - Menumpuk `.fiezel-course-grid` menjadi 1 kolom di mobile agar subjudul kursus Bahasa Inggris & Bahasa Jepang terbaca utuh tanpa terpotong `...`, serta merapikan padding kanan `.fiezel-goal-card.is-selected` agar ikon centang tidak menabrak teks.
   - Menambahkan fallback CSS instan 0ms maskot Daifuku Mochi resmi (`assets/brand/mochi-mascot-headset.png`, diprecache di `sw.js`) pada `.fiezel-ob-mascot:not(:has(.fz-mochi-viewport canvas))` untuk mode `prefers-reduced-motion` dan sebelum kanvas 3D Three.js selesai dimuat.
   - Menghapus 100% berkas `assets/brand/mochi-mascot-happy.png` dari repositori sesuai instruksi eksplisit Owner.
4. **Lokalisasi Tujuan Belajar Kursus Jepang (`features/onboarding/fiezel-onboarding.js`, `features/i18n/copy-id-bahasa.js`, `features/i18n/copy-th-bahasa.js`)**:
   - Saat murid memilih kursus Bahasa Jepang (`ja`), Langkah 3 menampilkan `Ujian Bahasa Jepang` dan `Bahasa Jepang harian` (beserta padanan Thai) alih-alih `Fondasi IELTS/TOEFL` dan `Bahasa Inggris harian`.
5. **Arsitektur 5 Meja Pemeriksa Paralel CI (`.github/workflows/quality.yml`)**:
   - Membagi seluruh 411 invokasi gerbang mutu di `quality.yml` ke 5 runner paralel (`quality-shard-1` s/d `quality-shard-5`) dengan job penutup `quality` (`needs: [quality-shard-1..5]`, `if: always()`) untuk memangkas waktu tunggu wall-clock CI dari ~9,5 menit menjadi ~2,5–3,5 menit per run **tanpa menghapus, men-skip, atau melunakkan satu pun tes**.

## 2. Bukti Pengujian Empiris (Playwright Headless & Unit Gates)
- `node tests/auth-screen-test.js`: **11/11 Node gates + C1–C4 Chromium Browser gates PASS** (termasuk cold boot `https://fiezel.uji` -> `welcome`, validasi kode KelasKu, daftar murid -> Onboarding, reload tetap masuk, `?teacher=preview` bypass).
- `node tests/onboarding-test.js`: **57/57 assert PASS**.
- `node tests/boot-auth-verdict-test.js`: **5/5 invarian boot PASS**.
- Probe Playwright empiris end-to-end (`?fz_real_auth=1`):
  - Cold boot -> `Selamat datang` -> `Masuk` -> `Daftar` -> Onboarding Langkah 1 (`Nama` dengan Mochi & kartu terang) -> Langkah 2 (`Kursus` tanpa teks terpotong) -> Langkah 3 (`Tujuan` khusus Jepang tanpa bocoran IELTS/Inggris & tanpa tabrakan ikon centang) -> Langkah 4 (`Mulai dari Nol` / `Tes Penempatan`), `0` pageerror.
  - Login murid lama (`Masuk`) -> langsung ke Beranda tanpa mengulang Onboarding dengan `state.level: 1`, `placementDone: true`, `gems: { balance: 120 }`.

## 3. Daftar Berkas yang Disentuh
- `app.js`
- `features/onboarding/fiezel-onboarding.js`
- `features/i18n/copy-id-bahasa.js`
- `features/i18n/copy-th-bahasa.js`
- `id-golden-baseline.json`
- `features/ui/mobile-edge-fit.css`
- `style.css`
- `sw.js`
- `assets/brand/mochi-mascot-happy.png` *(dihapus 100% dari repo)*
- `tests/auth-screen-test.js`
- `tools/dev/quick-screenshot.mjs`
- `.github/workflows/quality.yml`
- `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` *(via `bump-build.mjs`)*

## 4. Status Kelulusan Gerbang Mutu Lokal
- `gate-registry-test.js` (411/411 invokasi utuh), `workflow-timeout-gate-test.js`, `workflow-actor-gate-test.js`, `deploy-site-gate-test.js`: **PASS**
- `id-golden-snapshot-test.js`, `th-ui-leak-test.js`, `contrast-test.js`, `pastel-field-contrast-test.js`: **PASS**
- `precache-covers-shell-test.js`, `pwa-cache-test.js`, `pwa-standalone-ecosystem-test.js`, `critical-surface-protection-test.js`, `collateral-scope-guard-test.js`, `curriculum-cache-version-test.js`: **PASS**
