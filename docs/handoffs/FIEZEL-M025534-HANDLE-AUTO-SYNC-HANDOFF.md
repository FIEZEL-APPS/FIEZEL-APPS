# DOSSIER SERAH TERIMA FIEZEL: M025-534 — AUTO-SYNC MIGRASI HANDLE PROFIL SERVER & ENDPOINT RENAME

## 1. Ringkasan Temuan & Latar Belakang Perubahan
- **Masalah**: Pengguna lama yang telah masuk (login), terutama via autentikasi Google atau registrasi awal, mendapati ID sosial mereka tertahan pada awalan email (misalnya `@fitrah` dari `fitrah@gmail.com`) atau fallback generik `@murid*`, padahal nama profil resmi mereka adalah nama lengkap yang sah (misalnya `kargasasa`).
- **Keluhan Pengguna**: "bagaimana dengan user yang sudah login? contohnya nama profilnya kargasasa tapi ID nya @fitrah , apakah setelah di lakukan update ini akan otomatis menyesuaikan dengan nama profilnya?" — Disetujui untuk otomatis disesuaikan secara server-authoritative dan instan di frontend.
- **Solusi**:
  1. **Server Worker Endpoint (`POST /api/social/profile/rename`)**:
     - Ditambahkan ke `workers/api/route-social.js` dan didaftarkan pada `ROUTES` serta `BYTE_LIMITS` (1024 byte).
     - Memvalidasi kepemilikan profil (`gate.sub`), sanitasi pola handle `handleProblem(newHandle)`, dan opsional pembaruan `displayName`.
     - Melakukan swap atomik pada database Cloudflare D1: menghapus entri lama di `social_handle`, memasukkan entri baru di `social_handle`, dan memperbarui `social_profile.handle`.
     - Relasi sosial (`social_friend`), feed sorakan, bukti PB, dan cohort liga 100% utuh karena seluruhnya terikat pada `sub` identitas permanen, bukan string `handle`.
     - Mengembalikan 409 `ERR.HANDLE_TAKEN` jika handle sudah diklaim pengguna lain, menjaga integritas keunikan global.
  2. **Klien Wrapper API (`features/social/fiezel-social.js`)**:
     - Ditambahkan `profileRename(handle, displayName)` pada objek `FiezelSocial.api`.
  3. **Auto-Sync & Effective Handle Resolver (`app.js`)**:
     - Fungsi `effectiveLearnerSocialHandle()`: Segera menyajikan handle yang diturunkan dari nama profil sah (`@kargasasa`) di Cockpit Hero Card, ID Kamu, QR modal, dan kartu pengaturan tanpa pernah lagi membocorkan prefix email (`@fitrah`).
     - Fungsi `maybeSyncLearnerSocialHandle({ force, onNameChange })`: Berjalan di latar belakang saat boot, saat render cockpit, dan saat edit nama profil. Memanggil `core.api.profileRename()` secara senyap untuk memperbarui catatan di server D1.
     - Penyesuaian `editProfileName`: Saat pengguna mengubah nama lengkap via dialog profil, handle di server otomatis diperbarui serentak via `profileRename`.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Chromium)
Dijalankan melalui skrip probe Playwright: `tools/dev/probe-handle-auto-sync.mjs`.

**Skenario Uji**:
- Profil murid disimulasikan sebagai pengguna lama dengan Google email `fitrah@gmail.com`, nama profil `kargasasa`, dan database server awalnya menyimpan `handle: 'fitrah'`.
- Hasil eksekusi:
  ```
  [PROBE] Memulai verifikasi otomatis Playwright untuk auto-sync handle...
  [PROBE] Memeriksa teks Cockpit Profil...
  [PROBE PASS] Cockpit langsung menampilkan @kargasasa tanpa bocoran @fitrah.
  [PROBE] Memeriksa panggilan auto-sync ke server...
  [PROBE PASS] Server endpoint /api/social/profile/rename berhasil dipanggil dengan handle: kargasasa
  [PROBE] Membuka QR modal...
  [PROBE PASS] QR modal menampilkan: @kargasasa
  [PROBE PASS] effectiveLearnerSocialHandle() mengembalikan: kargasasa
  [PROBE SUKSES] Seluruh pemeriksaan Playwright untuk migrasi handle otomatis LULUS!
  ```

---

## 3. Daftar Berkas yang Disentuh & Perubahan
1. `workers/api/schema.js`: Menambahkan `'/api/social/profile/rename': 1024` pada `BYTE_LIMITS`.
2. `workers/api/route-social.js`: Menambahkan `SCHEMA_PROFILE_RENAME`, handler `routeProfileRename`, dan registrasi di `ROUTES`.
3. `features/social/fiezel-social.js`: Menambahkan `profileRename` di `API_PATHS` dan objek `api`.
4. `app.js`:
   - Implementasi `effectiveLearnerSocialHandle()` dan `maybeSyncLearnerSocialHandle()`.
   - Sinkronisasi di `setLearnerName()`, `editProfileName()`, `tactileProfileCockpitMarkup()`, `studentRegistrationMarkup()`, `socialProfilMarkup()`, `socialCopyId()`, `openProfileQr()`, dan `syncLearnerAccountOnBoot()`.
5. `tests/social-api-contract-test.js`: Menambahkan 7 pengujian kontrak untuk `POST /api/social/profile/rename` (114/114 assertions pass).
6. `tests/social-frontend-test.js`: Menambahkan pengujian keberadaan `core.api.profileRename`, `effectiveLearnerSocialHandle`, dan `maybeSyncLearnerSocialHandle` (71/71 assertions pass).
7. `tools/dev/probe-handle-auto-sync.mjs`: Skrip probe Playwright pengujian empiris.
8. Berkas Hexa-Sync: `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json` dinaikkan ke `m025-534`.

---

## 4. Status Gerbang Mutu Lokal
- `node tests/social-api-contract-test.js` -> 114/114 PASS
- `node tests/social-frontend-test.js` -> 71/71 PASS
- `node tests/id-golden-snapshot-test.js` -> PASS
- `node tests/th-ui-leak-test.js` -> PASS
- `node tests/curriculum-cache-version-test.js` -> PASS (m025-534)
- `node tests/gate-registry-test.js` -> PASS
- `node tools/bump-build.mjs --check` -> Selaras (`m025-534`)
