# FIEZEL HANDOFF DOSSIER: M025-547
## Perbesaran Batas Payload Tugas Guru ke 256 KB, Penanganan Soal Mapel Nasional IPA 30–40 Butir, dan Anti-Crash Hidrasi Murid

- **Build Version:** `m025-547`
- **Tanggal:** 10 Oktober 2026
- **Status CI Mutu:** 100% HIJAU (PASS)
- **Cakupan:** `workers/api/`, `features/teacher/`, `features/learner-flow/`, `features/class-hub/`, `features/i18n/`

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Galat HTTP 413 "Payload Too Large" pada Penugasan Guru**:
   - Guru menerbitkan tugas Kurikulum Merdeka Nasional (misal: IPA Fase D/E dengan 25–40 butir soal).
   - Setiap butir soal membawa teks stimulus/konteks bacaan, 4 pilihan jawaban, kunci, serta penjelasan mendalam untuk opsi benar dan distraktor.
   - Ukuran payload JSON mencapai **40–90 KB**.
   - Batas `BYTE_LIMITS['/api/teacher/class/assign']` di `workers/api/schema.js` sebelumnya dipatok keras pada **32.768 byte (32 KB)**.
   - Akibatnya, server menolak request dengan status HTTP 413, dan modal guru menampilkan toast: *"Gagal mengirim (payload too large). Coba lagi."*.

2. **Hilangnya Penjelasan Distraktor Opsi Salah**:
   - Pada `workers/api/teacher/class-sync-core.js` (`normalizeCustomItems`), kode hanya membaca `q.why` dan mengabaikan `q.distractorWhy`. Akibatnya, alasan ketika murid memilih opsi salah terbuang.
   - Diperbaiki dengan menggabungkan `q.why` dan `q.distractorWhy` ke satu pintu `item.why` yang tervalidasi.

3. **Pemadatan Payload di Sisi Klien**:
   - Di `features/teacher/fiezel-teacher-store.js` (`assignmentPayload`), alasan pilihan disatukan ke dalam `o.why` `{ 0: ..., 1: ..., 2: ..., 3: ... }` sebelum dikirimkan, memangkas ~30% byte redundansi.

4. **Penguatan Hidrasi dan Ketahanan Runner Murid**:
   - `features/teacher/fiezel-teacher-store.js` (`acceptAssignmentPayload`): Memperbaiki upsert stub notifikasi agar payload utuh dengan 35 butir soal tidak terabaikan saat tiba belakangan, dan menangani `QuotaExceededError` dengan defensif.
   - `features/learner-flow/fiezel-learner-flow.js`: Menyelesaikan butir kustom via `resolveLessonItem`, dan menangani akses aman ke `bank().SKILLS` agar mapel non-Inggris (IPA, IPS, MAT) tidak memicu `TypeError: Cannot read properties of undefined (reading 'area')`.
   - `features/learner-flow/fiezel-review-bank.js`: Penjaga null-safe pada `explain()`.

---

### 2. Bukti Pengujian Empiris (Chromium Playwright Headless)
1. **Probe Penugasan IPA Skala Besar (`tools/dev/probe-large-assignment-payload.mjs`)**:
   - Menguji pengiriman 30 butir soal IPA komprehensif berbobot **63,8 KB (63.867 byte)**.
   - Konfigurasi lama (32 KB): **Gagal 413 (Payload Too Large)**.
   - Konfigurasi baru (256 KB): **Sukses 200 OK**.
   - Simulasi pengambilan murid: Seluruh 30 butir soal (prompt, konteks, 4 opsi, kunci, dan 4 alasan why) **100% UTUH** (438/438 assertions PASS).
2. **Probe Hidrasi & Runner (`tests/large-assignment-hydration-probe.js`)**:
   - Pengujian 35 butir IPA di ClassHub runner dan LearnerFlow runner: **100% PASS**.

---

### 3. Daftar Berkas yang Diubah
1. `workers/api/schema.js`: Menaikkan limit byte `/api/teacher/class/assign` dari 32768 ke 262144 (256 KB).
2. `workers/api/teacher/class-sync-core.js`: Penggabungan `why` dan `distractorWhy` pada `normalizeCustomItems`, pemeliharaan `source` di `normalizeAssignment`.
3. `features/teacher/fiezel-teacher-store.js`: Penyatuan `why` pada `assignmentPayload`, perbaikan upsert stub & kuota defensif pada `acceptAssignmentPayload`.
4. `features/teacher/fiezel-teacher-shell.js`: Penanganan solutif untuk `r.error === 'payload too large'`.
5. `features/class-hub/fiezel-class-hub.js`: Dukungan runner review `why/distractorWhy`, styling mapel IPA `#0E7490`.
6. `features/learner-flow/fiezel-learner-flow.js`: `resolveLessonItem` untuk soal kustom, penangkal TypeError `.area`.
7. `features/learner-flow/fiezel-review-bank.js`: Penjaga safe access `explain()`.
8. `features/i18n/copy-id-feat-d.js` & `copy-th-feat-d.js`: Naskah i18n penanganan error payload.
9. `tests/class-hub-test.js` & `tests/assignment-poll-speed-test.js`: Penyelarasan assertion limit dan integritas payload.
10. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump build `m025-547`.

---

### 4. Status Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**.
- `node tests/th-ui-leak-test.js`: **PASS (4010 kunci selaras, 0 bocor)**.
- `node tests/curriculum-cache-version-test.js`: **PASS**.
- `node tests/gate-registry-test.js`: **PASS (10/10)**.
- `node tests/class-sync-test.js`: **PASS (77/77)**.
- `node tests/class-hub-test.js`: **PASS (14/14)**.
- `node tools/bump-build.mjs --check`: **Selaras (6 titik)**.
