# DOKUMEN SERAH TERIMA RESMI (HANDOFF DOSSIER)
## FIEZEL Build m025-548: Tahapan Verifikasi Wajah Pra-Ujian (Pre-Exam Face Verification Screen)

- **Nomor Build**: `m025-548`
- **Tanggal Rilis**: 2026-10-10
- **Cabang Git**: `feat/pre-exam-face-verification-m025-548`
- **Tipe Perubahan**: `feat(proctor)`

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Kebijakan Izin Peramban Seluler (Browser Permission Policy Invariant)**:
   - Pada peramban seluler (Chrome Android, iOS Safari), pemanggilan `navigator.mediaDevices.getUserMedia()` yang dipicu secara latar belakang saat soal dimuat sering kali diblokir atau gagal meminta izin kamera karena ketiadaan interaksi langsung pengguna (*user gesture*).
   - Pengguna mengusulkan solusi arsitektural yang tepat: *"saat masuk kedalam tugas baru, ada tahapan verivikasi wajah terlebih dahulu"*.
2. **Tahapan Verifikasi Wajah Pra-Ujian (Pre-Flight Face Verification Screen)**:
   - Sebelum butir soal pertama terbuka, antarmuka murid kini menampilkan kartu verifikasi wajah (`[data-testid="class-face-preflight"]`).
   - Murid secara eksplisit mengetuk tombol *"Aktifkan Kamera & Pindai Wajah"* (`[data-testid="btn-verify-face"]`), yang secara langsung memicu izin kamera via user gesture.
   - Tampil pratinjau cermin selfie langsung di bingkai lingkaran (`.ch-face-verify-box`) dengan status pemindaian.
   - Setelah wajah terverifikasi secara valid (`.is-verified`), muncul tombol *"Mulai Kerjakan Ujian"* (`[data-testid="btn-proceed-exam"]`).
   - Aliran kamera dipertahankan aktif (*stream reuse*) saat beralih ke soal nomor 1, sehingga pengawasan fokus dan timer ujian berjalan mulus tanpa meminta ulang izin kamera.
   - Tersedia opsi fallback *"Lanjut Tanpa Kamera (Dilaporkan ke Guru)"* bila kamera perangkat bermasalah/rusak, yang mencatat flag `noCamera = true` ke telemetri guru.
3. **Penyelarasan Form Pembuatan Tugas Guru**:
   - Penugasan mode ujian kini secara otomatis menyalakan toggle pengawasan wajah (`faceGuard: true`).
   - Modul `tBuat` dan modal penugasan `tg-assign` di cangkang guru menyertakan opsi pengawasan wajah dan menyimpannya ke payload penugasan.

---

### 2. Bukti Pengujian Empiris (Probe-Driven Empirical Audit)
Pengujian dilakukan menggunakan Chromium Playwright (`tools/dev/probe-face-verify-flow.mjs`) dengan simulasi perangkat kamera virtual (`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`):

```json
{
  "ok": true,
  "faceGuardSupported": true,
  "step1PreflightVisible": true,
  "step1BtnVerifyVisible": true,
  "step1QuestionLeaked": false,
  "preflightStatus": "verified",
  "step2BtnProceedVisible": true,
  "step3QuestionVisible": true,
  "step3CameraPillVisible": true,
  "step3TimerRunning": true,
  "step3FaceActive": true
}
```
Hasil:
- Soal ujian terbukti **TIDAK BOCOR** sebelum murid lulus verifikasi wajah (`step1QuestionLeaked: false`).
- Alur dari verifikasi wajah ke soal 1, aktivasi pil kamera pengawas, dan timer berjalan 100% mulus.

---

### 3. Berkas yang Disentuh & Ringkasan Perubahan
1. `features/class-hub/fiezel-face-guard.js`:
   - Penambahan `getStream()`, `attachPreview(vidEl)`, `verifyPresence()`, dan dukungan penggunaan ulang aliran kamera (*stream reuse*).
2. `features/class-hub/fiezel-class-hub.js`:
   - Integrasi tahapan preflight verifikasi wajah (`facePreflightView`) sebelum runner soal.
   - Penundaan timer ujian hingga murid mengetuk *"Mulai Kerjakan Ujian"*.
   - Dukungan toggle dan sinkronisasi `faceGuard` pada form pembuatan tugas guru.
3. `features/class-hub/class-hub.css`:
   - Penambahan tata letak dan animasi untuk `.ch-face-preflight-card`, `.ch-face-verify-box`, `.ch-face-preview-video`, `.ch-face-oval-guide`, `.ch-face-verified-stamp`, status row, dan tombol aksi.
4. `features/teacher/fiezel-teacher-store.js`:
   - Mempertahankan properti `faceGuard` di seluruh pipeline pembentukan tugas.
5. `features/teacher/fiezel-teacher-shell.js`:
   - Opsi `face_guard` di formulir penugasan guru.
6. `features/i18n/copy-id-proctor.js` & `features/i18n/copy-th-proctor.js`:
   - Penambahan 11 kunci terjemahan dwibahasa untuk alur verifikasi wajah pra-ujian.
7. `tests/exam-focus-guard-test.js`:
   - Unit test untuk alur tahapan verifikasi wajah pra-ujian.
8. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Pembaruan baseline terjemahan terverifikasi.
9. 6 Titik Hexa-Sync (`m025-548`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

### 4. Status Kelulusan Gerbang Mutu Lokal
- `tests/exam-focus-guard-test.js`: PASS (15 skenario lulus).
- `tests/th-ui-leak-test.js`: PASS (4023 kunci selaras, 0 kebocoran).
- `tests/id-golden-snapshot-test.js`: PASS (baseline emas utuh).
- `tests/curriculum-cache-version-test.js`: PASS (26 penegasan selaras `m025-548`).
- `tests/gate-registry-test.js`: PASS (10 lulus, 0 gagal).
- `tools/bump-build.mjs --check`: PASS (Selaras 6 titik).
- `tools/dev/probe-face-verify-flow.mjs`: PASS (Chromium Playwright).
