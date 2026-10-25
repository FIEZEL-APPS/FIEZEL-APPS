# FIEZEL HANDOFF: m025-670 Gemini Live Duplex Voice Fix & Gemini TTS Priority

## 1. Ringkasan Eksekutif & Temuan Audit
- **Tujuan**: Memperbaiki mode **Live Duplex Call** di fitur Kawan Bicara PWA FIEZEL agar menghasilkan suara asli **Gemini Live Voice** (Puck, Aoede, Charon, Kore) tanpa terlempar ke fallback Edge TTS, serta memprioritaskan Google Gemini TTS pada sintesis suara regular `/api/tts/line`.
- **Akar Masalah #1 (Fatal Disconnect di Gemini Live WebSocket)**:
  Pada `features/voice-studio/src/App.tsx` (commit `87e05d31`), payload `setup` WebSocket Gemini Live menyertakan kolom yang tidak dikenali:
  - `generationConfig.inputAudioTranscription: {}`
  - `generationConfig.outputAudioTranscription: {}`
  - `setup.inputAudioTranscription: {}`
  - `setup.outputAudioTranscription: {}`
  Endpoint Google Generative Language v1alpha Bidi WebSocket (`BidiGenerateContentConstrained`) menolak payload tersebut seketika dengan status **1007**:
  `Invalid JSON payload received. Unknown name "inputAudioTranscription" at 'setup.generation_config': Cannot find field.`
  Akibatnya, koneksi ditutup secara paksa oleh Google, dan setelah 2x percobaan rekoneksi, sistem secara otomatis beralih ke `activateTurnByTurnLiveFallback()`.
- **Akar Masalah #2 (Prioritas Edge TTS di `server.js`)**:
  Pada `server.js` (`/api/tts/line`), fungsi `synthesizeNeuralLine` mengeksekusi `tryMsEdgeTts` sebelum `tryGeminiTts`. Karena Edge TTS selalu berhasil, Gemini TTS tidak pernah dijalankan sekalipun 16 pool key tersedia.
- **Hasil Solusi**:
  1. Membersihkan setup payload `setup` di `App.tsx` sehingga koneksi WebSocket ke `wss://generativelanguage.googleapis.com/.../BidiGenerateContentConstrained` tersambung 100% mulus dengan pesan `setupComplete`.
  2. Suara Gemini Live (24kHz PCM) ter-stream dan terdengar secara real-time langsung melalui Web Audio API.
  3. Membalik prioritas di `server.js`: `tryGeminiTts` dipanggil terlebih dahulu menggunakan rotasi pool kunci Google AI Studio, dan hanya jatuh ke `tryMsEdgeTts` bila kuota Gemini habis (429) atau terjadi galat jaringan.
  4. Menambahkan in-memory WAV packaging (`pcmToWavBuffer`) di `server.js` sebagai peredam benturan jika `ffmpeg` tidak tersedia di lingkungan server Render.

---

## 2. Bukti Pengujian Empiris & Headless Playwright Audit
1. **Probe WebSocket Gemini Live Browser (`tools/dev/probe-local-duplex-e2e.mjs`)**:
   - Membuka halaman `http://localhost:4321/call.html?tab=call` di Chromium headless dengan mikrofon aktif.
   - Menekan tombol `"Telepon Live"`.
   - Hasil Handshake:
     - `>>> [PLAYWRIGHT WS OPENED]: wss://generativelanguage.googleapis.com/.../BidiGenerateContentConstrained`
     - `<- [RECV]: setupComplete`
     - `-> [SENT]: clientContent (greeting scenario)`
     - `-> [SENT]: realtimeInput.audio (16kHz PCM chunks)`
     - `<- [RECV]: binary audio parts (24kHz PCM Gemini Live Voice)`
     - Status UI: Tombol `"Akhiri"` aktif, banner status `"Diputar..."` (Mochi berbicara dengan suara Gemini), status alerts: `[]` (0 error, 0 fallback).
2. **Uji Sintesis Server Lokal (`tools/dev/test-server-gemini-tts.mjs` & `test-server-gemini-tts-ja.mjs`)**:
   - Bahasa Inggris (`coach_alex`): `engine: "gemini-tts-24khz"`, `voiceName: "Puck"`, Status 200.
   - Bahasa Jepang (`sensei_nanami`): `engine: "gemini-tts-24khz"`, `voiceName: "Aoede"`, Status 200.

---

## 3. Berkas yang Diubah / Ditambahkan
1. `features/voice-studio/src/App.tsx`:
   - Menghapus kolom `inputAudioTranscription` dan `outputAudioTranscription` dari `setup` payload WebSocket.
2. `server.js`:
   - Memprioritaskan `tryGeminiTts` sebelum `tryMsEdgeTts` di `synthesizeNeuralLine`.
   - Menambahkan dukungan pembacaan `GEMINI_LIVE_KEYS` / `GEMINI_API_KEYS` dari environment variables.
   - Menambahkan pembungkus WAV mandiri `pcmToWavBuffer` tanpa dependensi eksternal.
3. `features/voice-studio/dist/voice-studio.js`:
   - Hasil kompilasi bundel produksi Voice Studio.
4. `tools/dev/probe-local-duplex-e2e.mjs`:
   - Skrip probe otomatis pengujian end-to-end Gemini Live duplex streaming.
5. Hexa-sync build bump `m025-670`:
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `coordination/BUILD-VERSION.json`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`

---

## 4. Status Mutu & Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS (baseline emas Indonesia utuh).
- `node tests/th-ui-leak-test.js`: PASS (0 kebocoran UI Thai).
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, m025-670).
- `node tests/gate-registry-test.js`: PASS (10 pass, 0 fail).
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras m025-670).
