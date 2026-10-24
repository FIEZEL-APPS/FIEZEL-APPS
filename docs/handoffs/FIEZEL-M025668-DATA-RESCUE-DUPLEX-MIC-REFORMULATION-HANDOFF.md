# FIEZEL HANDOFF DOSSIER: DATA RESCUE, DUPLEX MIC & NATURAL REFORMULATION (m025-668)

**Otoritas Rilis**: OWNER / MASTER Authority Mandate (FIEZEL Release Arbiter)

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Ketahanan Data Murid (Zero Data Loss Invariant)**:
   - *Masalah*: Saat beralih sesi atau login ulang akun (email/handle/Google), status murid tampak ter-reset ke 0 karena `activateAccountState()` membuat wadah baru tanpa migrasi otomatis dari jejak progres sebelumnya di perangkat (`LEGACY_STATE_KEY` atau snapshot).
   - *Solusi*: Mengimplementasikan algoritma audit bukti progres `studentProgressEvidenceScore(blob)` dan `findBestStoredStudentState()`. Boot auto-rescue secara otomatis mendeteksi dan mengadopsi progres tertinggi ke kunci aktif. Disertai pencadangan kontinu ke `SAFETY_SNAPSHOT_KEY` (`fiezel-safety-snapshot-v1`).
2. **Duplex Mic Streaming & AudioContext Handsfree di Voice Studio**:
   - *Masalah*: Suara murid tidak terkirim atau terputus di Chrome/Safari saat mode handsfree karena Chrome power-saving menghentikan `ScriptProcessorNode` ketika output `GainNode` bernilai 0 mutlak, serta `AudioContext` tertahan dalam status `suspended`.
   - *Solusi*: Mengatur micro-gain anti-throttling `0.00001`, memasang auto-resume pada event buffer audio, menyertakan `inputAudioTranscription: {}` pada konfigurasi Gemini Live, dan menjamin stream mic terhubung tanpa henti.
3. **Natural Reformulation & Terjemahan Langsung di Bawah Balon Ucapan**:
   - *Masalah*: Balon ucapan murid tidak menampilkan saran perbaikan natural kalimat yang diucapkan secara langsung dan terjemahan dwibahasa belum serasi.
   - *Solusi*: Menambahkan kartu "Naturalnya begini:" tepat di bawah giliran murid dengan tombol "Gunakan", serta terjemahan bahasa Indonesia di bawah ucapan AI maupun murid.
4. **Tombol Masuk Google Native Fixed-Stay & Keselarasan CSS**:
   - *Masalah*: Tombol Google bergantung pada pemuatan script eksternal GSI sehingga timbul jeda render dan pergeseran tata letak (layout shift).
   - *Solusi*: Menyajikan tombol native `.fz-btn-google-native` berbasis token Warm Paper seketika pada frame pertama (44px, SVG Google resmi, dwibahasa ID/TH tanpa kebocoran naskah) dengan overlay transparan.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)
Skrip probe komprehensif dijalankan di `tools/dev/probe-verifikasi-3-langkah.mjs`:
- **Langkah 1 (Ketahanan Data & Auto-Rescue)**:
  - Disimulasikan data murid terisolasi di `fiezel-learning-state-v5` dan `fiezel-safety-snapshot-v1` (Ahmad Budi, 42 jawaban, streak aktif, 5 riwayat, 2 vocab).
  - Status aktif dikosongkan.
  - Saat `index.html` dimuat, auto-rescue berhasil memulihkan 100% data murid (`userName: 'Ahmad Budi'`, `totalAnswered: 42`, `streak: 1`, `history: 5`, `vocab: 2`). **Status: PASS ✓**.
- **Langkah 2 (Mic Handsfree & Duplex Streaming)**:
  - `call.html` dimuat dengan Chromium fake media stream.
  - Komponen Voice Studio terpasang, AudioContext aktif berjalan (`canResume: true`), avatar Mochi bereaksi, micro-gain terhubung. **Status: PASS ✓**.
- **Langkah 3 (Natural Reformulation & Google Native Fixed-Stay)**:
  - Kartu "Naturalnya begini:" dan translasi terverifikasi di bundle Voice Studio.
  - Tombol `.fz-btn-google-native` dirender stabil pada 44px dengan layout flex dan SVG Google tanpa layout shift. **Status: PASS ✓**.

---

## 3. Daftar Berkas yang Disentuh & Perubahan
1. `app.js`: Implementasi `SAFETY_SNAPSHOT_KEY`, `studentProgressEvidenceScore()`, `findBestStoredStudentState()`, boot auto-rescue, dan auto-migrasi pada `activateAccountState()`.
2. `features/voice-studio/src/App.tsx`: Auto-resume `inputCtx`, micro-gain `0.00001`, `inputAudioTranscription: {}`, kartu UI "Naturalnya begini: ...", dan terjemahan Indonesia di bawah balon user.
3. `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Hasil kompilasi Vite terbaru dari `App.tsx`.
4. `features/auth/fiezel-auth-screen.js`: Penyajian tombol `.fz-btn-google-native` native fixed-stay dengan i18n dwibahasa `auth.layar.google-daftar` dan `auth.layar.google-masuk`.
5. `features/i18n/copy-id-google.js` & `features/i18n/copy-th-google.js`: Entri dwibahasa untuk tombol Google.
6. `style.css`: Token gaya Warm Paper untuk `.fz-btn-google-native` (tinggi 44px, border #E4D9CC, hover/active elevation).
7. `tools/bump-build.mjs`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`: Hexa-sync m025-668.
8. `id-golden-baseline.json`: Pembaruan baseline snapshot teks murid Indonesia setelah re-bundle Voice Studio.
9. `tools/dev/probe-verifikasi-3-langkah.mjs`: Skrip verifikasi 3-langkah otomatis.

---

## 4. Status Gerbang Mutu Lokal & Catatan Utang Teknis
- `node tests/voice-studio-ui-architecture-test.js`: 5/5 PASS ✓
- `node tests/auth-screen-test.js`: 11/11 PASS ✓
- `node tests/id-golden-snapshot-test.js`: HIJAU PASS ✓
- `node tests/th-ui-leak-test.js`: 0 kebocoran, PASS ✓
- `node tests/curriculum-cache-version-test.js`: 33 penegasan PASS ✓
- `node tests/gate-registry-test.js`: 10/10 PASS ✓
- `node tests/regression-test.js`: PASS ✓
- `node tools/dev/probe-verifikasi-3-langkah.mjs`: SEMUA 3 LANGKAH 100% PASS ✓
- Utang teknis tersisa: Tidak ada utang baru yang dibuka.

---

## 5. Rencana Langkah Berikutnya (Roadmap / Next Steps)
- Pantau live socket latency wss://fiezel.my.id/api/live-call saat beban percakapan duplex meningkat.
- Observasi adopsi otomatis data snapshot di lapangan pada sesi peramban mobile multi-tab.
- Verifikasi telemetri BKT & IRT 3PL murid pada giliran latihan berbicara di Voice Studio.
