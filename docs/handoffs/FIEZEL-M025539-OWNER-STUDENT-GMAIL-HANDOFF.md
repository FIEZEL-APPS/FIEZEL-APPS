# FIEZEL Handoff Dossier: Sinkronisasi Akun Murid & Gmail ke Dashboard Owner (m025-539)

## 1. Ringkasan Eksekutif & Latar Belakang
- **Build Version**: `m025-539`
- **Tujuan**: Memenuhi kebutuhan pemilik (Owner) agar seluruh data akun murid terdaftar, khususnya alamat email resmi Google (Gmail) dari autentikasi `auth_email`, tampil secara transparan, akurat, dan real-time di Dashboard Owner (`https://owner.fiezel.my.id/`).
- **Invarian Privasi Terjaga**: Sesuai invarian arsitektur FIEZEL, data identitas per-murid diisolasi secara ketat pada tabel per-orang (`auth_email`, `learner_name`, `social_profile`) dalam database `fiezel-core` dan HANYA dapat diakses oleh Owner yang terautentikasi melalui secret token hash (`OWNER_TOKEN_HASH`). Seluruh kanal ringkasan agregat anonim publik dan ekspor CSV agregat tetap 100% bebas dari PII.

---

## 2. Rincian Perubahan Kode

### A. Lapisan Database D1 (`workers/api/evidence/learner-evidence-store-d1.js`)
1. **Inklusi Akun Google Sign-In**:
   - Menambahkan kueri terhadap tabel `auth_email` (`SELECT sub, email, updated_at FROM auth_email ORDER BY updated_at DESC LIMIT ?1`) untuk menyertakan murid yang sudah login menggunakan Google OAuth namun belum sempat memiliki telemetri aktivitas di `learner_evidence_state`.
   - Menghormati pencabutan persetujuan (`learner_evidence_consent.revoked_at`).
2. **Pengambilan Email Batch**:
   - Mengambil email terverifikasi untuk semua `sub` yang berada dalam direktori secara batch (`SELECT sub, email FROM auth_email WHERE sub IN (...)`).
   - Melampirkan atribut `email: emails.get(r.sub) || null` pada setiap baris direktori murid.

### B. Endpoint API Bukti Belajar (`workers/api/evidence/route-learner-evidence.js`)
1. **Endpoint Direktori (`handleOwnerLearners`)**:
   - Memetakan properti `email: r.email || null` ke dalam JSON respons direktori `/api/owner/learners`.
2. **Endpoint Detail Murid (`handleOwnerLearnerEvidence`)**:
   - Melakukan kueri langsung ke `auth_email` untuk `sub` yang sedang diperiksa oleh Owner.
   - Mengembalikan `email` dan status `emailVerified` ke dalam objek `learner`.

### C. Antarmuka Dashboard Owner (`workers/owner/index.js`)
1. **Sanitasi Data Murid (`sanitizeLearnerRow`)**:
   - Mengizinkan field `email` yang valid (string dengan format email) tanpa membuangnya ke kategori field asing.
2. **Tabel Direktori Murid (`renderLearnerDirectory`)**:
   - Menambahkan kolom `<th>email (gmail)</th>` di tabel direktori murid.
   - Merender badge visual `✉️ ${esc(x.email)}` berwarna indigo jika murid memiliki akun Google, atau badge abu-abu `belum terhubung` jika mendaftar secara anonim/offline.
3. **Detail Rekap Belajar Murid (`renderLearnerDetail`)**:
   - Menampilkan kartu identitas akun Google di header profil murid lengkap dengan badge status Gmail terverifikasi.

---

## 3. Bukti Verifikasi & Pengujian Empiris

Semua gerbang pengujian mutu lokal berhasil lulus 100%:
1. `tests/braincore-learner-identity-test.js`: **LULUS 181/181 assert**.
   - Teruji: Pengambilan email dari `auth_email`, sanitasi field `email` di owner dashboard, penampilan email di direktori murid, dan penampilan akun Gmail di halaman detail murid.
2. `tests/id-golden-snapshot-test.js`: **PASS (Semua snapshot emas ID utuh)**.
3. `tests/th-ui-leak-test.js`: **PASS (Zero leak)**.
4. `tests/curriculum-cache-version-test.js`: **PASS (Build m025-538 selaras)**.
5. `tests/gate-registry-test.js`: **PASS (10/10 pass)**.
6. `tests/owner-dashboard-test.js`: **LULUS (Kontrak keamanan & privasi owner utuh)**.
7. `tests/d1-schema-contract-test.js`: **LULUS 41/41**.
8. `tools/bump-build.mjs --check`: **Selaras Hexa-Sync (m025-538)**.

---

## 4. Daftar Berkas yang Disentuh
- `workers/api/evidence/learner-evidence-store-d1.js`
- `workers/api/evidence/route-learner-evidence.js`
- `workers/owner/index.js`
- `tests/braincore-learner-identity-test.js`
- `coordination/BUILD-VERSION.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `docs/handoffs/FIEZEL-M025538-OWNER-STUDENT-GMAIL-HANDOFF.md`
