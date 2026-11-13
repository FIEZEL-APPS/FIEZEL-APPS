# FIEZEL HANDOFF DOSSIER: M025-792
## Perbaikan Menyeluruh Zero-Loss Hybrid Speech Recognition & Dekoding WebSocket Live PTE

- **Build Version**: `m025-792`
- **Branch**: `feat/pte-asr-fix-m025-792`
- **Scope**: `fix(pte)`
- **Tanggal**: 13 November 2026
- **Status Mutu**: 100% HIJAU (31/31 PTE Academic Engine tests, 30/30 PTE Bank Integrity tests, 7/7 Handy VAD & Speech Recognition tests, 433/433 Quality Gates)

---

### 1. Ringkasan Temuan Audit & Masalah yang Dilaporkan
- **Gejala Masalah**: Murid melaporkan bahwa di seksi Read Aloud (dan seksi speaking lainnya), mikrofon aktif, indikator bar level audio bergerak mengikuti suara, namun saat murid menyelesaikan ucapan dan menekan submit (*Finish Speaking*), sistem memunculkan pesan peringatan:
  `"No speech detected, please check your microphone"` dan skor tidak bertambah (0 / 10).
- **Akar Masalah Teknis**:
  1. **Dekoding Blob WebSocket Gagal Total**: Di `features/pte/fiezel-pte-ui.js`, handler pesan `ws.onmessage` memanggil `JSON.parse(event.data)` secara sinkron. Pada browser modern (Chromium/Safari/Firefox), pesan WebSocket dari Gemini Live tiba dalam format `Blob`. `JSON.parse("[object Blob]")` memicu `SyntaxError` yang disenyapkan oleh blok `try-catch`. Akibatnya, `onTranscriptChunk` tidak pernah terpanggil.
  2. **SpeechRecognition Tidak Pernah Berjalan**: Logika sebelumnya menempatkan inisialisasi `SpeechRecognition` di dalam callback `onError` milik `connectGeminiLiveAsr`. Karena WebSocket berhasil membuka koneksi (`ws.onopen` memanggil `onReady`), callback `onError` tidak pernah terpicu. Akibatnya, `SpeechRecognition` lokal browser tidak pernah aktif sama sekali.
  3. **Kebocoran Stream Mikrofon**: `stopPteMicBridge()` tidak dipanggil saat perekaman selesai di `stopRecordingAndEvaluate()`.

---

### 2. Solusi & Perubahan Arsitektur

1. **Mesin ASR Hibrida Zero-Loss (Identik dengan Kawan Bicara PTT)**:
   - Mengimplementasikan `initPteSpeechRecognition()` yang dijalankan *seketika* begitu fase perekaman dimulai (`startRecordingPhase()`).
   - Mendengarkan event `onresult` secara terus-menerus (`continuous = true`, `interimResults = true`), memperbarui `state.speechTranscript`, menonaktifkan *silence watchdog*, dan langsung merender teks hidup ke `#fzPteLiveSpeechText` dengan latensi 0 ms.
2. **Dekoding Asinkron Toleran Blob/ArrayBuffer untuk Gemini Live WebSocket**:
   - `ws.onmessage` kini mendukung tiga tipe payload secara adaptif: `string`, `Blob` (via `await event.data.text()`), dan `ArrayBuffer` (via `TextDecoder`).
   - Bila teks transkripsi dari `msg.serverContent.inputTranscription.text` tiba, sistem memperkaya atau melengkapi `state.speechTranscript`.
3. **Pembersihan Siklus Hidup Mikrofon & Safeguard Manual Input**:
   - Menambahkan pemanggilan `stopPteMicBridge()` di dalam `stopRecordingAndEvaluate()` agar lampu indikator mikrofon peramban langsung mati begitu murid submit.
   - Menghentikan dan membersihkan objek `state.speechRecognizer` secara rapi tanpa kebocoran memori.
   - Menambahkan pengecekan input manual sebelum evaluasi dijalankan sehingga teks yang diketik murid tetap dievaluasi jika mikrofon peramban mengalami kendala izin.

---

### 3. Berkas yang Disentuh

1. `features/pte/fiezel-pte-ui.js` (initPteSpeechRecognition, async Blob decoding, mic lifecycle cleanup)
2. `tests/pte-handy-vad-test.js` (Uji unit 7 untuk inisialisasi SpeechRecognition & transkripsi)
3. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `index.html`, `call.html` (Bump build ke `m025-792`)
4. `docs/handoffs/FIEZEL-M025792-PTE-LIVE-ASR-ZERO-LOSS-HANDOFF.md` (Dokumentasi serah terima)

---

### 4. Hasil Verifikasi Mutu

- `node tests/curriculum-cache-version-test.js` -> PASS (33 assertions, build m025-792)
- `node tests/pte-academic-engine-test.js` -> PASS (31/31 unit tests)
- `node tests/pte-bank-integrity-test.js` -> PASS (30/30 assertions)
- `node tests/pte-handy-vad-test.js` -> PASS (7/7 assertions)
- `node tests/audio-locale-guard-test.js` -> PASS (0 speechSynthesis)
- `node tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `node tests/gate-registry-test.js` -> PASS (449 test files, 10/10 meta-checks)
- `node tools/fiezel-guardians.mjs a10` -> PASS_WITH_RISK_REPORT (0 errors, 0 warnings)
