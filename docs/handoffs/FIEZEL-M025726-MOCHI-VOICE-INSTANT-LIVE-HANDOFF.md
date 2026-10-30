# FIEZEL HANDOFF: MOCHI VOICE SOS (INSTANT AI LIVE & CLEAN INTERACTION) — m025-726

Dokumen serah terima resmi untuk arsitektur Mochi Voice SOS (In-Quiz Socratic Lifeline) pada build kanonikal `m025-726`.

---

## 1. Ringkasan Eksekutif & Pemenuhan Mandat Pengguna

Fitur **Mochi Voice SOS** dirombak total untuk memberikan pendampingan sokratik berbasis kecerdasan buatan langsung (*live voice tutor*) yang responsif, alami, dan tanpa kompromi visual maupun audio:

1. **Wajah Bersih Tanpa Balon Teks (Clean Face Invariant)**:
   - Dihilangkan seluruh elemen balon teks bacaan (*thought bubble*) yang menutupi wajah Mochi saat pertama kali murid masuk ke sesi latihan soal.
   - Wajah maskot 3D Mochi tetap steril, manis, dan ekspresif tanpa gangguan visual statis.

2. **Eliminasi Total Suara Robot Browser TTS (Zero Browser TTS Invariant)**:
   - Menghapus 100% ketergantungan pada `speechSynthesis` / `SpeechSynthesisUtterance` peramban lokal yang kaku.
   - 100% suara adalah **Gemini Multimodal Live Duplex API** (`models/gemini-3.8-live`, persona suara *Puck*, 24kHz PCM16 output) langsung melalui WebSocket dua arah.

3. **Respons Kilat Sepersekian Milidetik (Instant AI Live Kickoff)**:
   - Mekanisme *pre-warm session token* dan koneksi WebSocket hangat disiapkan di latar belakang saat kuis dimulai.
   - Saat murid mengetuk maskot Mochi, giliran suara pertama (*kickoff turn*) terkirim seketika ke edge server relay tanpa jeda inisialisasi yang lambat.

4. **Deteksi Hening & Pengingat Proaktif (Silence Prompt Lifeline)**:
   - Jika Mochi selesai berbicara atau panggilan sedang aktif namun murid belum bersuara selama jeda tertentu ($\ge 5.5$ detik), Mochi secara proaktif menyapa lewat suara AI Live:
     - Bahasa Indonesia: *"Silakan bicara jika ingin bantuan dari aku"*
     - Bahasa Thai: *"พูดคุยได้เลยนะถ้าต้องการให้โมจิช่วย"*
   - Audio input dianalisis secara real-time via VAD RMS ($\text{RMS} > 0.02$) untuk mereset pewaktu hening begitu murid mulai berbicara.

5. **Ketuk Langsung Tubuh Maskot (Direct Mascot Tap Plumbing)**:
   - Event delegasi global capture-phase dan penangkap CustomEvent `mochi-tap` dari canvas WebGL 3D (`mochi-mascot/fiezel-mochi.js`) disambungkan langsung ke `FiezelMochiVoiceSos.toggleCall()`.
   - Debounce terkalibrasi (450ms) mencegah klik ganda atau *accidental close*.

6. **Pencegahan Kebocoran Jawaban & Kunci Ujian (Anti-Leak & Exam Lock)**:
   - Filter runtime (*leak guard*) menyaring respons AI jika terdeteksi menyebut pilihan kunci jawaban secara langsung, mengoreksinya kembali ke panduan sokratik.
   - Kunci ujian ketat (`examLockActive()`, mode ukur `measureMode`, dan placement test) mematikan fitur bantuan suara secara mutlak agar kalibrasi IRT 3PL tetap murni.

---

## 2. Bukti Pengujian Empiris (Headless Playwright & Unit Tests)

Seluruh fungsionalitas diuji secara empiris menggunakan browser Chromium headless Playwright dan rangkaian unit test lokal:

### A. Headless E2E Probe (`tools/dev/probe-mochi-voice-sos-e2e.mjs`)
```json
================ E2E AUDIT RESULTS ================
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
- 14/14 Pengujian LULUS:
  - API Contract verification (15 methods).
  - canCall localhost non-destructive dev mode.
  - Gem wallet balance enforcement (20 gem spend, 5 cashback).
  - Anti-Leak Exam Invariant (Placement & Measure Mode).
  - Socratic Scaffolding (Indonesian & Thai) without spoiling.
  - Gemini Live Duplex Protocol & Puck Voice Invariants.
  - Lifecycle & tap API.
  - Deep context & zero-answer-key prompt.
  - Exam lock via `examLockActive()` / `state.quizType`.
  - Zero Browser TTS & Silence Prompt Invariant.

### C. Gerbang Mutu Lokal (Quality Gate Invariants)
- `tests/id-golden-snapshot-test.js`: HIJAU (baseline emas Indonesia utuh).
- `tests/th-ui-leak-test.js`: PASS (0 kebocoran di mode Thai).
- `tests/i18n-kunci-hantu-test.js`: PASS (semua kunci terdaftar di `copy-id` & `copy-th`).
- `tests/curriculum-cache-version-test.js`: PASS (selaras m025-726).
- `tests/gate-registry-test.js`: PASS (10/10).
- `tests/exam-lock-test.js`: PASS (10/10).

---

## 3. Daftar Berkas yang Disentuh

1. `features/mascot/fiezel-mochi-voice-sos.js`:
   - Menghapus semua referensi `speechSynthesis` / `SpeechSynthesisUtterance`.
   - Menambahkan pelacak hening (`_silenceTimer`, `_lastUserSpeechAt`, `_checkSilenceAndPrompt`, `SILENCE_PROMPT_MS`).
   - Membersihkan tampilan wajah Mochi pada `greetOnEntry` tanpa balon teks menutupi wajah.
   - Memasang penangkap tap capture-phase dan `mochi-tap`.
   - Mengintegrasikan pengingat suara saat hening via AI Live turn.

2. `features/mascot/mochi-voice-sos.css`:
   - Menghapus selector animasi balon teks `.is-greeting` yang mengambang di atas wajah maskot.

3. `features/i18n/copy-id-core.js` & `features/i18n/copy-th-core.js`:
   - Mendaftarkan kunci i18n `mochi-sos.silence-prompt`.

4. `id-golden-baseline.json`:
   - Memperbarui baseline snapshot emas kalimat murid.

5. `tools/dev/probe-mochi-voice-sos-e2e.mjs`:
   - Mengembangkan skrip probe E2E headless 6 dimensi untuk pengujian otomatis.

6. `tests/mochi-voice-sos-test.js`:
   - Menambahkan penegasan unit test untuk Zero Browser TTS dan Silence Prompt.

7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Bump versi resmi ke `m025-726` (Hexa-Sync & Octa-Sync).

---

## 4. Status Serah Terima

- **Nomor Build**: `m025-726`
- **Branch**: `feat/mochi-voice-sos-instant-live-m025-726`
- **Worktree**: `C:/Users/hp/fiezel-mochi-voice-live-m025-726`
- **Kondisi**: Siap rilis via Pull Request ke branch `main`.
