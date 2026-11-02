# FIEZEL Handoff Dossier — Pemulihan Total Progres & Pembersihan Cache Lintas-Generasi pada PWA Terpasang

- **Tanggal**: 2026-11-03
- **Worktree Rilis**: `fix/progress-legacy-state-m025-751` (akan disatukan bersama perbaikan agent rekan `5383d0ff-a591-4f55-9dfc-dfb9dfa955a4` pada bump build terpadu sebelum pembukaan PR)
- **Cakupan Terproteksi**: `[ALLOW-PROTECTED: pwa|ci]` (`sw.js` untuk `isUpdateNav` + kunci URL bersih, serta `.github/workflows/quality.yml` untuk pendaftaran gerbang baru `tests/progress-legacy-upgrade-gate-test.js`). Nol sentuhan ke permukaan `auth` maupun `onboarding`.

---

## 1. Ringkasan Akar Masalah (Mengapa PWA Baru Normal & Kursus Jepang Normal, tetapi Kursus Bahasa Inggris pada PWA Lama Tetap Kosong di `m025-750`)

Audit empiris menggunakan peramban headless Chromium Playwright mengungkap **5 mata rantai kegagalan simultan** yang hanya muncul pada **PWA lama yang sudah pernah login dan menyimpan data lintas-rilis**, sementara instalasi baru (`state.history = []`) langsung merender dashboard penuh sejak `m025-746`:

1. **`RangeError: Invalid time value` dari Baris Legacy `restoredFromSync: true` (`app.js`)**:
   - Pada build terdahulu, `brainSyncApplyRebuild()` menulis ulang `state.history` di kunci dasar Bahasa Inggris (`fiezel-v5-state:<uuid>`) dengan skema non-kanonikal `{ attemptId, timestamp, correct, type: 'practice', lesson, restoredFromSync: true }` **tanpa properti `at` dan `ok`**.
   - Setiap kali pengguna membuka tab **Progres** pada kursus Bahasa Inggris, `weeklyActivityChartMarkup() -> skillTimeline() -> dayKey(h.at)` memanggil `new Date(undefined).toISOString()` dan melempar `RangeError: Invalid time value`, menjatuhkan seluruh `progress()` ke blok `catch(err)` (`[progress render recovery]`) yang hanya menampilkan 1 kartu kosong.
   - Kursus Bahasa Jepang memakai kunci sidecar terpisah (`fiezel-v5-state:<uuid>@ja`) tanpa baris legacy `restoredFromSync`, sehingga Progres Jepang tetap tampil utuh pada perangkat yang sama.
2. **Ember Mastery Kosong Pasca-Rebuild & Entri `null` pada `confidenceHistory` (`app.js`)**:
   - Baris hasil sinkronisasi awan hanya menulis `state.history` tanpa menghidrasi ulang `state.grammar`, `state.vocab`, dan `state.reading`, serta `confidenceCalibration()` mengakses `x.confidence` tanpa filter elemen `null`.
3. **Desinkronisasi Kursus Boot `fz_target_course` vs `preferences.targetLang` (`app.js`)**:
   - Ketika `fz_target_course === 'en'` tetapi blob dasar lama masih memegang `preferences.targetLang === 'ja'`, `loadState()` mengembalikan progres Bahasa Inggris dengan `preferences.targetLang` yang masih `'ja'`. Akibatnya, `saveFlushWrite()` berikutnya membaca `state.preferences.targetLang` (`'ja'`) dan berisiko menimpa kunci `@ja` atau memuat kursus yang salah saat boot.
4. **Brankas IndexedDB `FiezelOfflineVault` Tanpa Stempel Build & Urutan Muat `index.html` (`features/security/fiezel-offline-vault.js`, `index.html`)**:
   - `fiezel-offline-vault.js` sebelumnya dimuat ber-`defer` **sesudah** `app.js` di `index.html` (sehingga `self.FiezelOfflineVault` belum tersedia saat `load()` dipanggil di awal `app.js`), dan rekaman di IndexedDB (`fiezel-vault-v1` / `encrypted_banks`) tidak menyimpan penanda `FIEZEL_PAGE_BUILD`, sehingga rekaman JSON bank dari build lama tidak pernah terinvalidasi otomatis saat upgrade.
5. **Kunci Cache Navigasi Tercemar Query Update & Balapan Promosi Service Worker (`sw.js`, `features/ui/fiezel-update-prompt.js`, `features/ui/fiezel-boot-tail.js`)**:
   - Navigasi pembaruan (`?fz_upd=...`, `?fz_healed=...`, `?__fz_fresh=...`) sebelumnya tidak selalu dipaksa network-first di `sw.js` dan menyimpan respons HTML di bawah `e.request` ber-query alih-alih kunci bersih `./index.html`.
   - `fiezel-update-prompt.js` bisa melakukan reload sebelum worker `installing` mencapai `installed`/`activated`, serta `fiezel-boot-tail.js` belum mempromosikan worker baru saat terjadi split-brain `activeNum < pageNum`.

---

## 2. Solusi Arsitektural & Perbaikan Tanpa Kehilangan Data (Zero Data Loss)

1. **Penyembuhan Non-Destruktif Riwayat & Hidrasi Braincore FSRS/BKT (`app.js`)**:
   - Menambahkan `parseHistoryTimestamp(v)` dan `normalizeHistoryRow(h)` (baris kanonikal dikembalikan dengan referensi `===` tanpa overhead; baris legacy `restoredFromSync` dilengkapi `at`, `ok`, `skill`, `reviewKey`, dan `target`).
   - Memperkuat `sanitizeState(raw)`, `dayKey(ts)`, `recomputeMeaningfulDays(s)`, `skillTimeline()`, `confidenceCalibration()`, `prasastiGalleryMarkup()`, serta membungkus seluruh sub-panel `progress()` dengan `safePart()`.
   - Memperbaiki `brainSyncApplyRebuild(hasil)` agar memproyeksikan balik seluruh field kanonikal (`at`, `timestamp`, `ok`, `correct`, `type`, `skill`, `lesson`, `reviewKey`, `target`) yang lolos round-trip `FiezelAttemptRecord.project()`.
   - Menambahkan `reconcileStateAfterBankLoad()` tepat setelah bank konten termuat di `load()` untuk memutar ulang riwayat valid ke ember `state.grammar` / `state.vocab` / `state.reading` yang masih kosong melalui jadwal FSRS `scheduleNext()` dan Braincore BKT `bktRead()` tanpa pernah menimpa statistik ember yang sudah ada.
   - Menyelaraskan `loadState()`, blok boot `FIEZEL_TARGET_COURSE_KEY`, dan `saveFlushWrite()` agar `fz_target_course` dan `state.preferences.targetLang` selalu sinkron 100% tanpa kebocoran antar-kursus (`en` <-> `ja`).
2. **Invalidasi Berstempel Build pada `FiezelOfflineVault` & Urutan Boot (`features/security/fiezel-offline-vault.js`, `index.html`)**:
   - Memindahkan `<script defer src="./features/security/fiezel-offline-vault.js"></script>` tepat sebelum `app.js` di `index.html`.
   - Menambahkan stempel `build: currentPageBuild()` pada `saveBank()`, invalidasi otomatis rekaman beda-build pada `getBank()`, serta metode `purgeStaleBuilds(keepBuild)` yang menyapu rekaman build usang di IndexedDB tanpa menghapus bank yang baru saja disimpan pada boot build aktif.
3. **Jalur Pembaruan PWA Anti-Basi Lintas-Generasi (`sw.js`, `features/ui/fiezel-update-prompt.js`, `features/ui/fiezel-boot-tail.js`)**:
   - `sw.js`: Memperlakukan `fz_upd`, `fz_healed`, dan `__fz_fresh` sebagai `isUpdateNav` (network-first `cache: 'no-store'`), menulis salinan HTML segar ke kunci URL bersih (`cleanNavUrl` & `./index.html`), dan memicu `ensureShellCoherence()`. Tetap mematuhi kontrak 0 `clients.claim` dan 1 `skipWaiting` berpintu pesan.
   - `fiezel-update-prompt.js`: Membersihkan parameter update lama sebelum reload, memanggil `FiezelOfflineVault.clearVault()` saat `purgeStaleCaches()`, menunggu transisi `installing -> installed` sebelum mengirim `FIEZEL_SKIP_WAITING`, dan menjaga cangkang aktif agar tidak dihapus sebelum worker baru benar-benar `activated`.
   - `fiezel-boot-tail.js`: Membersihkan parameter `?fz_upd`/`?fz_healed`/`?__fz_fresh` dari bilah alamat pasca-boot, menyapu runtime non-`/vendor/` + `FiezelOfflineVault.purgeStaleBuilds(pageBuild)` sekali per build baru, memeriksa koherensi `./core-config.js` & `./features/neural-voice/fiezel-diag-panel.js`, serta memulihkan split-brain dua arah (`activeNum > pageNum` maupun `activeNum < pageNum`).

---

## 3. Bukti Pengujian Empiris (Node VM + Headless Chromium Playwright E2E)

Gerbang permanen baru `tests/progress-legacy-upgrade-gate-test.js` (terdaftar di `.github/workflows/quality.yml`) menguji dua lapisan sekaligus (**19/19 PASS**):
- **Bagian A (`A1`–`A5c`, Node VM)**: Membuktikan idempotensi `normalizeHistoryRow`, ketahanan `dayKey` terhadap nilai rusak, round-trip `brainSyncApplyRebuild` <-> `FiezelAttemptRecord.project()`, hidrasi `reconcileStateAfterBankLoad` tanpa menimpa bucket lama, invalidasi build `FiezelOfflineVault` (`m025-750` -> `m025-751`), serta kontrak statis `sw.js`, `fiezel-update-prompt.js`, dan `fiezel-boot-tail.js`.
- **Bagian B (`B1`–`B7`, Headless Chromium Playwright via `page.route` bebas-soket)**: Menyuntikkan profil PWA lama berakun (`acc_legacy_pwa`) dengan riwayat `restoredFromSync: true` tanpa `at`/`ok`, bucket grammar kosong, `confidenceHistory` bernilai `null`, desinkronisasi `preferences.targetLang: 'ja'` vs `fz_target_course: 'en'`, progres terpisah di `@ja`, serta rekaman beracun `m025-745` di IndexedDB `fiezel-vault-v1`, lalu membuka `/?fz_upd=...` dan memverifikasi:
  * Nol `[progress render recovery]`,
  * 6 riwayat Inggris pulih utuh (`totalCorrect: 5`) + bucket `present_simple_basics` & `be_subject_agreement` terhidrasi,
  * Keempat tab Progres (`overview`, `readiness`, `analysis`, `adaptive`) merender seluruh kartu dengan bersih,
  * Rekaman `m025-745` di IndexedDB digantikan oleh build aktif dan query `?fz_upd` dibersihkan,
  * Perpindahan `EN -> JA -> EN` menjaga isolasi penuh kedua kursus (6 riwayat Inggris vs 2 riwayat Jepang).

### Hasil Uji Regresi Lokal (21 Suite — 100% HIJAU)
- `node tests/progress-legacy-upgrade-gate-test.js` — **19/19 PASS**
- `node tests/target-lang-progress-isolation-test.js` — **15/15 PASS**
- `node tests/boot-order-test.js` — **PASS**
- `node tests/offline-vault-and-lease-test.js` — **8/8 PASS**
- `node tests/id-golden-snapshot-test.js` — **PASS**
- `node tests/th-ui-leak-test.js` — **PASS**
- `node tests/curriculum-cache-version-test.js` — **33/33 PASS**
- `node tests/gate-registry-test.js` — **10/10 PASS**
- `node tests/precache-covers-shell-test.js` — **5/5 PASS**
- `node tests/pwa-cache-test.js` — **PASS**
- `node tests/pwa-release-coherence-test.js` — **PASS**
- `node tests/sw-nav-shell-first-test.js` — **17/17 PASS**
- `node tests/sw-build-marker-freshness-test.js` — **PASS**
- `node tests/update-prompt-test.js` — **13/13 PASS**
- `node tests/update-prompt-signal-test.js` — **7/7 PASS**
- `node tests/settings-cache-test.js` — **21/21 PASS**
- `node tests/security-hardening-85-test.js` — **8/8 PASS**
- `node tests/cf-config-killswitch-test.js` — **86/86 PASS**
- `node tests/brain-sync-rebuild-test.js` — **7/7 PASS**
- `node tests/side-state-scope-test.js` — **12/12 PASS**
- `node tests/global-name-collision-test.js` — **22/22 PASS**
- `node tests/a11y-test.js` — **PASS**

---

## 4. Daftar Berkas yang Disentuh (Bagian Progres & Cache PWA)

- `app.js`
- `index.html`
- `sw.js`
- `features/security/fiezel-offline-vault.js`
- `features/ui/fiezel-update-prompt.js`
- `features/ui/fiezel-boot-tail.js`
- `id-golden-baseline.json`
- `reports/th-ui-leak-report.json`
- `tests/progress-legacy-upgrade-gate-test.js`
- `.github/workflows/quality.yml`
