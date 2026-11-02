# FIEZEL Security Hardening (Target Skor 85+) — Handoff Dossier

**Nomor Build**: `m025-748`  
**Tanggal**: 2 November 2026  
**Cakupan**: `fix(security): [ALLOW-PROTECTED: auth|pwa|ci] pre-encryption, dynamic session vault key, exam cryptographic receipt & csp hardening`

---

## 1. Ringkasan Eksekutif & Roadmap Keamanan
Berdasarkan audit empiris yang memberikan rating keamanan awal 63/100, pekerjaan ini menerapkan 4 pilar teknis mutlak untuk mendongkrak rating keamanan FIEZEL ke **85+**:

1. **Pillar 1 — Pre-Encryption di Hulu (Build-Time Encryption Tool)**:
   - Berkas bank materi (`grammar-templates.json`, `vocabulary-master.json`, `reading-bank.json`, `grammar-curriculum-v1.json`, `cloze-bank-v1.json`) dienkripsi secara otomatis menggunakan AES-256-GCM (`_fz_vault: 1`) saat proses deploy di GitHub Actions (`.github/workflows/deploy-site.yml`) sebelum diunggah ke hosting publik cPanel.
   - Bank materi publik di server cPanel tidak lagi tersaji sebagai teks JSON mentah. `curl` dengan referer palsu hanya akan menerima ciphertext terenkripsi, sementara runtime PWA mendekripsinya secara transparan langsung ke RAM memori perangkat murid.
   - Berkas di git repository lokal tetap berformat JSON mentah agar 100% dari 30+ unit test CI (`quality.yml`) tetap berjalan normal.

2. **Pillar 2 — Dynamic Ephemeral Session Key Exchange & Device-Bound Salt**:
   - `features/security/fiezel-offline-vault.js` diperkaya dengan manajemen kunci dinamis memori (`setDynamicSessionKey`, `getDynamicSessionKey`, `clearDynamicSessionKey`).
   - Kunci sesi volatil disimpan murni di RAM memori, tidak pernah ditulis ke disk.
   - Derivasi salt kriptografis terikat pada `state.ownerUuid` (`getDeviceBoundSalt`), mengisolasi vault per perangkat murid.

3. **Pillar 3 — Server-Side Cryptographic Receipt & Reconciliation (Exam Verifier)**:
   - Modul baru `features/security/fiezel-exam-verifier.js` mengamankan Ujian Kenaikan Level (Placement & Skip Exams).
   - Latihan harian tetap lokal & instan demi kenyamanan belajar tanpa kuota.
   - Ujian kenaikan level menghasilkan tanda terima kriptografis (`_fz_receipt: 1`).
   - Mode Online: diverifikasi dan ditandatangani kriptografis (`verified_server`).
   - Mode Offline: dicatat sebagai `provisional_offline` dan otomatis direkonsiliasi dengan server begitu online via `brainSyncFlush()`.

4. **Pillar 4 — Header Content Security Policy (CSP), HSTS & Permissions Policy**:
   - `website/.htaccess` dipersenjatai dengan `Content-Security-Policy` ketat (membatasi eksekusi skrip hanya dari origin sah, melarang object/plugin), `Strict-Transport-Security` (max-age 1 tahun), dan `Permissions-Policy`.

---

## 2. Berkas yang Disentuh & Dibuat

1. `tools/security/pre-encrypt-banks.mjs` (BARU) — Perkakas pra-enkripsi bank materi saat build/deploy.
2. `features/security/fiezel-exam-verifier.js` (BARU) — Mesin tanda terima kriptografis & rekonsiliasi ujian kenaikan level.
3. `tests/security-hardening-85-test.js` (BARU) — 8/8 uji mutu komprehensif mencakup 4 pilar keamanan.
4. `features/security/fiezel-offline-vault.js` — Penambahan dynamic ephemeral session key & device-bound salt.
5. `app.js` — Integrasi `FiezelExamVerifier` pada `recordSkipExamPass` dan rekonsiliasi otomatis di `brainSyncFlush`.
6. `.github/workflows/deploy-site.yml` — Penambahan langkah pra-enkripsi sebelum rsync ke server publik.
7. `.github/workflows/quality.yml` — Pendaftaran `tests/security-hardening-85-test.js`.
8. `website/.htaccess` — Pemasangan header CSP, HSTS, dan Permissions-Policy.
9. `index.html` & `sw.js` — Pendaftaran `fiezel-exam-verifier.js` dan precaching di Service Worker shell.

---

## 3. Bukti Verifikasi Mutu
- `tests/security-hardening-85-test.js` $\rightarrow$ **PASS 8/8 assertions (100% HIJAU)**.
- `tests/deploy-site-gate-test.js` $\rightarrow$ **PASS 33/33 assertions**.
