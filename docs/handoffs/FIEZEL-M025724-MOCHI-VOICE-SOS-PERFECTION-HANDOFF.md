# Mochi Voice SOS (In-Quiz Socratic Lifeline) — Audit Mendalam & Penyempurnaan Sistemik

**Build Target**: `m025-724`
**Otoritas**: Pedagogical & Audio Core FIEZEL APPS
**Status**: 100% HIJAU (Unit Tests 13/13, Headless Playwright Probe 6/6, Local Gates Hexa/Octa Sync)

---

## 1. Ringkasan Eksekutif & Temuan Audit Mendalam

Audit mendalam terhadap fitur **Mochi Voice SOS** (`features/mascot/fiezel-mochi-voice-sos.js`, `mochi-voice-sos.css`, `app.js`, dan `workers/api/voice/route-voice-live.js`) menemukan 5 akar masalah struktural:

1. **Direct Mascot Tap-to-Voice Rusak**:
   - Canvas 3D WebGL (`mochi-mascot/fiezel-mochi.js:2197-2283`) mengeksekusi `e.stopPropagation()` pada `pointerdown`/`pointerup` dan `preventDefault()` pada `touchstart`, sehingga event click sintetis pada mobile tertahan.
   - Pemicu suara sebelumnya hanya terikat pada thought bubble kecil (`#fzMochiThoughtBubble`), mengabaikan tap langsung pada tubuh maskot (`<fiezel-mascot>`, `.fz-paw-slot`, `.quiz-mascot`, `.coach-strip-face.has-mascot`).
2. **Ketiadaan Sapaan Proaktif**:
   - Sesi kuis dimulai tanpa ada greeting audio/bubble proaktif; Mochi hanya diam menunggu murid mengklik bubble bantuan.
3. **Konteks Kuis Dangkal & Bug Wiping**:
   - `buildMochiSystemPrompt` sebelumnya hanya membaca stem dan options sederhana tanpa passage bacaan, script listening, konteks set, atau riwayat salah murid.
   - `setActiveQuestion()` sebelumnya menimpa `_currentQ` saat dipanggil sebelum sesi dimulai karena `onQuizSessionStart()` mereset `_currentQ = null`.
4. **Zero-Spoiling Hanya Teoretis**:
   - Tidak ada guard runtime yang mengintersep pembocoran kunci jawaban dari model Gemini (`outputTranscription`).
5. **Rantai Latensi Serial 1.5–3.0 Detik**:
   - `fetchLiveSessionToken()`, `AudioContext` startup, dan WebSocket handshake baru dimulai secara berurutan setelah murid mengetuk maskot.

---

## 2. Solusi & 5 Mandat Inti yang Diimplementasikan

### Mandat 1: Direct Mascot Tap-to-Voice (<30ms Feedback)
- **Capture-Phase Pointer Listener**: Memasang capture-phase listener di `document` (`addEventListener('pointerdown', ..., true)`) yang membaca intent ketukan sebelum canvas 3D sempat memanggil `stopPropagation()`.
- **Event Plumbing Ganda**: Mendengarkan event resmi `mochi-tap` (`bubbles: true`) yang dipancarkan oleh `fiezel-mochi.js:2244` dengan jendela deduplikasi 450ms (`TAP_DEDUPE_MS`) agar tidak memicu toggle ganda saat `pointerup` tiba di momen yang sama.
- **Haptic & Visual Feedback Seketika**: Memanggil `warmAudioContext()`, `playChime('tap')`, `hapticTap(12)`, dan `.fz-mochi-tap-bounce` seketika (<30ms) sebelum operasi asinkronus jaringan berjalan.

### Mandat 2: Proactive Entry Greeting
- **Lifecycle Hook `onQuizSessionStart()`**: Dihubungkan ke pembukaan `quizLoop()` di `app.js:16853`.
- **Greeting Speech Bubble (`greetOnEntry`)**: Pada soal pembuka (`asked === 0`), Mochi memunculkan thought bubble varian `.is-greeting` dengan sapaan hangat dan kontekstual terhadap tipe soal (Grammar, Listening, Reading, Kanji, Vocab, Sentence Building), disertai SFX chime tanpa membuka koneksi audio Gemini Live (hemat token & baterai).

### Mandat 3: Deep Quiz-Context Awareness
- **Structured Snapshot Engine (`buildQuizContextSnapshot`)**:
  - Mengekstrak jenis latihan kanonis (`grammar`, `listening`, `reading`, `vocab`, `kanji`, `build`).
  - Mengalirkan naskah audio dialog listening (`q.script` / `transcript`), situasi percakapan (`q.scenario`), teks bacaan acuan (`q.passage`), kata fokus/bacaan (`q.focus`), konsep target (`q.concept`), aturan inti (`explain.rule`), penjelasan guru (`explain.why`), dan jembatan ingatan (`explain.memory`).
  - Mencatat riwayat salah murid (`_attempts`) sehingga Mochi membongkar kenapa opsi yang salah itu tidak cocok tanpa menunjuk jawaban benar.
- **Realtime Context Push (`sendContextUpdate`)**: Mengirim pembaruan konteks via client-content turn saat murid berpindah soal di tengah sesi panggilan suara yang masih aktif.

### Mandat 4: Anti-Leak Exam Invariant & Runtime Zero-Spoiling Guard
- **Strict Exam Mode Suppression**:
  - `isExamLocked()` memeriksa `examLockActive()`, `state.quizType` (`placement`, `level-exam`, `grammar-skip`), `cfg.measure`, `cfg.placement`, `cfg.noHints`, dan `cfg.examKind`.
  - Thought bubble dan sesi suara 100% terkunci saat mode ujian aktif untuk menjaga objektivitas kalibrasi IRT 3PL / BKT.
- **Runtime Leak Guard (`transcriptLeaks` & `enforceLeakGuard`)**:
  - Memeriksa `serverContent.outputTranscription.text` secara streaming real-time terhadap opsi jawaban dan huruf pilihan (A, B, C, D).
  - Jika model Gemini mencoba membocorkan kunci jawaban, sistem seketika memotong audio buffer (`stopAudioPlayback()`) dan mengirimkan injeksi instruksi lokal tegas via text turn untuk mengoreksi respons model ke jalur sokratik murni.

### Mandat 5: Sub-Second Latency & Pre-Warming Engine
- **Token Pre-Fetch & Refresh Timer**: `prewarmLiveSession()` mengambil ephemeral session token di latar belakang saat kuis dimulai dan menjadwalkan rotasi token setiap 95 detik (sebelum batas 120s worker).
- **Hot WebSocket Pre-Handshake**: Saat `pointerdown` intent terdeteksi pada tubuh Mochi, `openHotSocket()` segera membuka koneksi WebSocket TLS sehingga saat `pointerup` terjadi, socket telah berstatus OPEN (`readyState === 1`).
- **Adaptive Jitter Lead**: Audio buffer playback scheduling dikurangi menjadi 30ms untuk chunk pertama (respons instan) dan 60ms untuk streaming kontinu.
- **Box-Average PCM16 Resampler**: Pengambilan mikrofon 16kHz menggunakan downsampling box-average terfilter untuk kualitas suara jernih tanpa artefak aliasing.

---

## 3. Bukti Verifikasi Empiris (100% Lolos)

### A. Headless Chromium E2E Probe (`tools/dev/probe-mochi-voice-sos-e2e.mjs`)
Dijalankan via Playwright terhadap runtime PWA asli:
```json
{
  "t1_directMascotTap": true,
  "t2_mochiTapCustomEvent": true,
  "t3_proactiveGreeting": true,
  "t4_deepContextAwareness": true,
  "t5_zeroSpoilingLeakGuard": true,
  "t6_examLockStrict": true
}
>>> ALL 6 E2E AUDIT CHECKS PASSED EMPIRICALLY! <<<
```

### B. Unit Test Suite (`tests/mochi-voice-sos-test.js`)
13/13 tes lulus tanpa regresi:
- API Contract verification (15 metode)
- canCall localhost & gem balance enforcement
- Anti-Leak Exam Invariant (Placement & Measure Mode)
- Socratic Scaffolding & Zero-Spoiling Prompts
- Gem Economy (Spend 20 & Cashback +5)
- Gemini Live Duplex & Puck Voice protocol
- Lifecycle & Tap API plumbing (8 metode baru)
- Deep Context & Zero-Answer-Key Prompt integrity
- Exam lock via `examLockActive()` / `state.quizType`
- Session lifecycle lock semantics

### C. Gerbang Mutu Lokal FIEZEL
- `tests/id-golden-snapshot-test.js`: PASS (100% HIJAU)
- `tests/th-ui-leak-test.js`: PASS (0 kebocoran, 100% HIJAU)
- `tests/curriculum-cache-version-test.js`: PASS (33 penegasan, build `m025-724`)
- `tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
- `tests/view-reachability-test.js`: PASS (67/67 lulus)
- `tests/content-integrity-gate.js`: PASS (4/4 gerbang lulus)

---

## 4. Daftar Berkas yang Dimodifikasi

1. `features/mascot/fiezel-mochi-voice-sos.js`: Core engine perbaikan 5 mandat Mochi Voice SOS.
2. `features/mascot/mochi-voice-sos.css`: Styling direct hit cursor, bounce animation, dan greeting bubble.
3. `app.js`: Integrasi 5 lifecycle kuis (`quizLoop`, `draw`, `answer`, `confirmQuizExit`, `finishQuiz`).
4. `workers/api/voice/route-voice-live.js`: Edge worker endpoint ephemeral token session dengan header anti-cache dan timestamp kedaluwarsa presisi.
5. `tests/mochi-voice-sos-test.js`: Harness pengujian unit komprehensif 13/13.
6. `id-golden-baseline.json`: Pembaruan baseline emas literal naskah Indonesia resmi.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Sinkronisasi Hexa/Octa build canonical `m025-724`.
