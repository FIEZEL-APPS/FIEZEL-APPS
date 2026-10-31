# FIEZEL Release Handoff Dossier — `m025-731`
**Title**: `feat(mascot): instant sub-second Mochi Live duplex, user voice detection & compact soundwave visualizer`  
**Date**: 2026-10-31  
**Build Version**: `m025-731`  

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Eliminasi Latensi Sapaan Awal (`~6.0s` -> `<0.1s` / `79.8ms`)**:
   - Sebelumnya, saat murid baru memasuki sesi latihan (Grammar, Vocab, Listening, dll.), jabat tangan WebSocket Gemini Live (`models/gemini-3.8-live`) dan generasi giliran pembuka membutuhkan beberapa detik sehingga murid mengira perangkat atau koneksi internetnya bermasalah.
   - Solusi: Menambahkan *Background Greeting Audio Pre-Warmer* (`warmGreetingAudioInBackground`) yang menyimpan chunk PCM16 24kHz suara asli Gemini Live (`Puck`) ke `localStorage` (`fz_mochi_greet_pcm_v1_<locale>_<nama>`), dipadukan dengan *Hot WebSocket Handshake* (`_hotWs`). Begitu murid mengklik sesi latihan, audio sapaan langsung berbunyi dalam **`79.8 ms` (`0.08 detik`)** sementara petunjuk sokratik soal pertama mengalir mulus dari WebSocket live.
2. **Perbaikan Deteksi Suara Mikrofon Murid, Hybrid VAD & User Barge-In**:
   - Memperbaiki referensi `var self = this;` di `_wireMicrophoneStream()` yang sebelumnya menyebabkan `self._setVoiceVisualizerUserSpeaking(true)` mengacu ke `window.self` di peramban dan menghentikan pengiriman frame PCM16 (`realtimeInput.audio`).
   - Menghapus pemaksaan `sampleRate: 16000` pada `navigator.mediaDevices.getUserMedia` agar selaras dengan arsitektur Kawan Bicara (`features/voice-studio/src/App.tsx`), mengambil sample rate asli perangkat (`48kHz`/`44.1kHz`) lalu melakukan resampling bersih ke `16kHz PCM16`.
   - Menambahkan **Hybrid VAD** (`preRollFrames` 3-frame + sinyal `{ realtimeInput: { audioStreamEnd: true } }` saat jeda bicara `550ms`), **User Barge-In** (saat murid memotong pembicaraan Mochi, playback Mochi langsung berhenti dan mikrofon mengambil alih), serta **Parallel Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`).
3. **Kapsul Visualizer Gelombang Suara Kompak & Terpusat (`#fzMochiVoiceUnder`)**:
   - Merombak `#fzMochiVoiceUnder` menjadi kapsul putih gading kompak (`48px x 21px`, `border-radius: 999px`) tepat di bawah Mochi (`centerX` selaras tengah layar dengan jarak aman `13px` di atas kartu soal).
   - **Saat Mochi Berbicara (`.is-speaking`)**: Dua pasang busur sinyal di sisi kiri dan kanan (`(( ))`) bergema keluar secara berirama.
   - **Saat Murid Berbicara (`.is-user-speaking`)**: 7 garis gelombang suara di tengah kapsul (`.sw-bar`) langsung berubah warna menjadi **merah maroon gelap** (`linear-gradient(180deg, #9B2C3E 0%, #7F1D2D 50%, #58111E 100%)`).
4. **Pengingat Hening 2 Detik terpersonalisasi**:
   - Jika murid tidak terdeteksi bersuara selama `2000ms` setelah Mochi selesai bertanya, Mochi otomatis menyemangati murid dengan namanya: `"Segera buka suaramu, <Nama Murid>!"`.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probes)
1. **Probe Siklus Penuh Mochi Live Duplex (`probe-mochi-live-localhost.mjs`)**:
   - `isCallActiveImmediately: true`
   - `firstAudioLatencyMs: 79.8` (`0.08s`)
   - `receivedAudioChunks: 55` dari `models/gemini-3.8-live`
   - `lastSilencePrompt: "Segera buka suaramu, Fitra Pratama!"`
   - `beforeAnswerActive: true`, `afterAnswerActive: true`, `afterNextQuestionActive: true`
2. **Probe Deteksi Mikrofon Murid & Barge-In (`probe-user-voice-detection.mjs`)**:
   - `duringBargeIn`: `isSpeaking: false`, `isUserSpeaking: true`, `barBackground: "linear-gradient(rgb(155, 44, 62) 0%, rgb(127, 29, 45) 50%, rgb(88, 17, 30) 100%)"`, `sentRealtimeAudioFrames: 14`
   - `duringQuietSpeech`: `isUserSpeaking: true`, `sentRealtimeAudioFrames: 46`
   - `pageErrors`: `0` JS runtime errors.

---

## 3. Daftar Berkas yang Disentuh
- `features/mascot/fiezel-mochi-voice-sos.js`: Pre-warmed PCM16 greeting cache, hot WebSocket adoption, `_wireMicrophoneStream` fix, Hybrid VAD (`audioStreamEnd`), User Barge-In, parallel `SpeechRecognition`, dan SVG/DOM visualizer.
- `features/mascot/mochi-voice-sos.css`: Styling kapsul gelombang suara kompak `#fzMochiVoiceUnder`, busur gema `.echo-arc`, dan status `.is-user-speaking` merah maroon gelap.
- `tools/local-server.js`: Proxy lokal `/api/voice/*` ke `https://api.fiezel.my.id` untuk pengujian pengembangan lokal.
- `tests/mochi-voice-sos-test.js`: 15 cakupan unit test untuk invarians Gemini Live Duplex, Zero Browser TTS, dan 2s Silence Prompt.
- Berkas sinkronisasi nomor build (`m025-731`): `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal
- `node tests/mochi-voice-sos-test.js`: **PASS (15/15)**
- `node tools/bump-build.mjs --check`: **PASS (`Selaras` — `m025-731`)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 assertions)**
- `node tests/id-golden-snapshot-test.js`: **PASS**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS**
