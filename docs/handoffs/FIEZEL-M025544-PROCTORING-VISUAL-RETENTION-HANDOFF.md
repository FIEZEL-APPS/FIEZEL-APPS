# Penyempurnaan Sistemik: Pelestarian Telemetri Visual Face Guard & Sinkronisasi Proctoring Ujian

**Build:** `m025-544`
**Otoritas:** User Request / Anti-Ghost-Deploy Invariant
**Tanggal:** 2026-10-10
**Metodologi:** Probe-Driven Empirical Audit (Chromium Headless Playwright) + End-to-End Proctoring Verification

---

## 1. Ringkasan Eksekutif & Latar Belakang

Setelah penggelaran transmisi penugasan dan notifikasi *real-time* di build `m025-543`, dilakukan audit ketat menyeluruh terhadap sistem proctoring ujian dan deteksi kecurangan dual-layer (*Focus Guard* keluar layar & *Face Guard* deteksi wajah via kamera depan).

Ditemukan peluang penyempurnaan kritis pada rantai penanganan telemetri visual:
- Saat murid mengerjakan ujian dan tidak berpindah tab (`n = 0`), namun memalingkan wajah atau menutupi kamera depan (`vn > 0`, `vs > 0`), data telemetri visual tersebut sempat terabaikan di `learner-flow.js` karena pemotongan ke hanya tiga bilangan standar `{ n, s, x }`.
- Begitu pula pada saat ujian selesai (`recordAssignmentResult`) atau ujian non-tugas (`recordExamFocus`), metrik visual ketiadaan wajah tidak terawetkan ke payload server `fx` dan `assign.f`.

Perbaikan di build `m025-544` memastikan rantai telemetri visual utuh dari sensor peranti murid hingga layar dan kotak masuk guru.

---

## 2. Rincian Perubahan yang Diterapkan

### A. Pelestarian Telemetri di Murid (`features/learner-flow/fiezel-learner-flow.js`)
1. **`recordAssignmentFocus(id, focus)`**:
   - Melestarikan ruas `vn` (frekuensi wajah hilang), `vs` (total detik wajah hilang), dan `vx` (durasi terlama wajah hilang) ke dalam objek `f` lokal dan antrean laporan `pushToClass()`.
2. **`recordAssignmentResult(res)`**:
   - Memperbarui gerbang kondisi penyimpanan fokus agar aktif tidak hanya saat `Number(res.focus.n) > 0`, melainkan juga saat `Number(res.focus.vn) > 0`.
   - Mengawetkan `{ vn, vs, vx }` ke dalam `entry.f` pada hasil akhir ujian.
3. **`recordExamFocus(kind, focus)` & `tutorCode()`**:
   - Memungkinkan pencatatan `s.examFocus` jika `vn > 0` meskipun `n === 0`.
   - Mengirimkan `payload.fx` lengkap dengan metrik `{ vn, vs, vx }` ke server.

### B. Validasi Gerbang Server (`workers/api/teacher/class-sync-core.js`)
1. **`body.fx` (Non-Assignment Exam Focus)**:
   - Menambahkan validasi `intIn` terhadap `fx.vn`, `fx.vs`, dan `fx.vx` dengan batas tertutup (`FOCUS_N_MAX` dan `FOCUS_SEC_MAX`), sejajar dengan `assign.f`.

### C. Pengolahan Data di Dasbor Guru (`features/teacher/fiezel-teacher-store.js`)
1. **`parseLearnerPayload`**:
   - Mengurai `p.fx.vn`, `p.fx.vs`, dan `p.fx.vx` ke dalam `parsed.examFocus`.
2. **`ingest`**:
   - Mengizinkan penciptaan event `focus_exit` saat `parsed.examFocus.vn > 0`.
   - Meneruskan metrik visual ke payload event agar guru langsung membaca:
     `⚠ [Nama Murid] keluar dari layar saat mengerjakan ujian “[Judul]” — 1× wajah tak terlihat · 15 dtk`.

### D. Penyesuaian Uji Empiris & Snapshot Baseline
1. **`tests/exam-focus-guard-test.js`**:
   - Menambahkan verifikasi penerimaan `vn, vs, vx` pada gerbang server `class-sync-core`.
   - Menambahkan verifikasi penciptaan notifikasi `focus_exit` di sisi guru saat terjadi pelanggaran visual proctoring.
2. **`tools/dev/probe-kelasku-assignment-delivery.mjs`**:
   - Memasukkan selector `.fz-tour` ke dalam `dismissOverlays()` dan menginisialisasi status tour agar pengujian otomatis stabil di seluruh varian A/B.
3. **Baseline Snapshot**:
   - Memperbarui `id-golden-baseline.json` via `--write-baseline` untuk menjaga integritas literal Indonesia.

---

## 3. Bukti Pengujian Empiris

| Komponen Pengujian | Perintah Eksekusi | Status |
| :--- | :--- | :--- |
| **Playwright Empirical Probe** | `node tools/dev/probe-kelasku-assignment-delivery.mjs` | **10/10 PASS (100% HIJAU)** |
| **Exam Focus Guard Test** | `node tests/exam-focus-guard-test.js` | **100% OK** |
| **Assignment Poll Speed Test** | `node tests/assignment-poll-speed-test.js` | **8/8 PASS** |
| **Curriculum Cache Version** | `node tests/curriculum-cache-version-test.js` | **26 assertions PASS** |
| **Indonesian Golden Baseline** | `node tests/id-golden-snapshot-test.js` | **HIJAU / IDENTIK** |
| **Hexa-Sync Arbiter Check** | `node tools/bump-build.mjs --check` | **Selaras (6/6 Titik)** |

---

## 4. Daftar Berkas yang Dimodifikasi

1. `features/learner-flow/fiezel-learner-flow.js`
2. `workers/api/teacher/class-sync-core.js`
3. `features/teacher/fiezel-teacher-store.js`
4. `tests/exam-focus-guard-test.js`
5. `tools/dev/probe-kelasku-assignment-delivery.mjs`
6. `id-golden-baseline.json`
7. `coordination/BUILD-VERSION.json`
8. `sw.js`
9. `core-config.js`
10. `features/neural-voice/fiezel-diag-panel.js`
11. `kurikulum.html`
12. `misi.html`
13. `docs/handoffs/FIEZEL-M025544-PROCTORING-VISUAL-RETENTION-HANDOFF.md`
