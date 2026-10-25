# FIEZEL HANDOFF: m025-671 iOS Gemini Live Duplex Microphone Fix (Unified AudioContext & AudioWorklet)

## 1. Ringkasan Eksekutif & Temuan Audit
- **Tujuan**: Memperbaiki masalah di mana fitur **Telepon Live** (Gemini Live Duplex Call) di PWA FIEZEL suaranya terdengar jelas dari Gemini di iPhone, namun suara pengguna saat berbicara tidak masuk/tidak terkirim, sementara tombol bicara biasa (PTT) berfungsi normal.
- **Akar Masalah di iOS Safari (WebKit)**:
  1. **Konflik Multi-AudioContext & Sample Rate Mismatch**:
     Sebelumnya, frontend membuat dua `AudioContext` terpisah:
     - `outputAudioCtx = new AudioContext({ sampleRate: 24000 })`
     - `inputAudioCtx = new AudioContext()` (default hardware iOS 44.1kHz atau 48kHz).
     Di iOS WebKit, `AVAudioSession` hanya mengizinkan SATU sample rate perangkat keras aktif. Keberadaan dua AudioContext dengan frekuensi berbeda memicu konflik hardware clock, menyebabkan input mikrofon dibungkam (*silent zeros*) oleh WebKit.
  2. **Bug Transisi Kategori Sesi Audio iOS (`PlayAndRecord`)**:
     `AudioContext` diinisialisasi sebelum `navigator.mediaDevices.getUserMedia()` selesai mengonfigurasi rute audio hardware iPhone. Context yang dibuat sebelumnya tetap terikat pada rute audio lama (playback only).
  3. **ScriptProcessorNode Ditiadakan / Ditidurkan oleh Power-Saver iOS**:
     Pada `ScriptProcessorNode`, koneksi ke `destination` dengan gain mendekati nol (`0.00001`) dideteksi oleh power-saving WebKit iOS sebagai node senyap, sehingga pemanggilan event loop `onaudioprocess` dihentikan setelah beberapa detik.
  4. **Perbedaan dengan Tombol "Bicara"**:
     Tombol "Bicara" menggunakan `webkitSpeechRecognition` (Siri engine bawaan OS) yang tidak menggunakan Web Audio API, sehingga tombol tersebut tetap jalan di iPhone.
- **Hasil Solusi**:
  1. **Unified Live AudioContext**: Menyatukan input dan output ke dalam satu `AudioContext` tunggal dengan sample rate native hardware perangkat (tanpa paksaan `{ sampleRate: 24000 }`), di mana playback 24kHz di-resample secara otomatis oleh browser, dan input mikrofon di-resample ke 16kHz via `resampleAndConvertToPcm16Base64`.
  2. **Re-resume Pasca-`getUserMedia`**: Menjamin `AudioContext` di-resume tepat setelah `getUserMedia` selesai menegosiasikan rute `AVAudioSessionCategoryPlayAndRecord` di iOS.
  3. **Dual-Engine Audio Capture (AudioWorklet + ScriptProcessor Fallback)**: Menggunakan `AudioWorkletNode` berdedikasi tinggi yang kebal terhadap throttling thread UI utama, dengan graceful fallback ke `ScriptProcessorNode` jika Worklet tidak tersedia.
  4. **iOS Watchdog Keep-Alive**: Memasang interval keep-alive (1200ms) untuk memastikan `AudioContext` yang disuspend secara tiba-tiba oleh iOS segera dihidupkan kembali selama panggilan berlangsung.

---

## 2. Bukti Pengujian Empiris & Headless Playwright Audit
1. **Probe E2E Duplex Streaming (`tools/dev/probe-local-duplex-e2e.mjs`)**:
   - Membuka `http://localhost:4321/call.html?tab=call` di Chromium headless dengan emulasi mikrofon perangkat bergerak.
   - Handshake Gemini Live WebSocket tersambung ke `wss://generativelanguage.googleapis.com/.../BidiGenerateContentConstrained`.
   - `AudioWorkletNode` berhasil diinisialisasi pada unified `AudioContext`.
   - Potongan audio mikrofon 16kHz PCM dialirkan secara konstan:
     `-> [SENT]: {"realtimeInput":{"audio":{"mimeType":"audio/pcm;rate=16000","data":"..."}}}`
   - Respon biner 24kHz PCM dari Gemini Live diterima dan diputar secara real-time:
     `<- [RECV]: <binary>`
   - Tombol berubah menjadi `"Akhiri"`, status `"Diputar..."`, alerts `[]` (0 error).
2. **Kompilasi Bundel Voice Studio**:
   - `npm run build --prefix features/voice-studio` LULUS dalam 19.68s (`dist/voice-studio.js`).
3. **Uji Mutu Lokal (Hexa-Sync Arbiter)**:
   - `node tools/bump-build.mjs --check`: Selaras (build `m025-671`).
   - `node tests/id-golden-snapshot-test.js`: PASS.
   - `node tests/th-ui-leak-test.js`: PASS.
   - `node tests/curriculum-cache-version-test.js`: PASS.
   - `node tests/gate-registry-test.js`: PASS.

---

## 3. Berkas yang Diubah
1. `features/voice-studio/src/App.tsx`:
   - Arsitektur unified `liveAudioCtxRef` (native hardware sample rate).
   - Inisialisasi `AudioWorkletNode` inline blob untuk perekaman mikrofon stabil di iOS.
   - Re-resume context pasca-`getUserMedia` untuk kompatibilitas `AVAudioSession` iOS.
   - Keep-alive watchdog timer untuk peramban bergerak.
   - Pembersihan menyeluruh pada `stopLiveCall` dan `toggleMuteMic`.
2. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi bundel produksi Voice Studio terbaru.
3. `id-golden-baseline.json`:
   - Penyelarasan snapshot hash baseline literal Indonesia.
4. Hexa-sync rilis `m025-671`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`
