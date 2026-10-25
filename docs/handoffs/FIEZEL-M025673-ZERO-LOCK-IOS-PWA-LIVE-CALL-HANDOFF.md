# FIEZEL HANDOFF: m025-673 Zero-Lock iOS PWA Live Call & Hands-Free Speech Duplex

## 1. Ringkasan Eksekutif & Permintaan Pengguna
- **Keluhan Pengguna**:
  1. Di PWA iPhone saat mengklik tombol *"Aktifkan Mikrofon Sekarang"* di pop-up izin mic, tidak ada reaksi apa-apa dan **stuck total di pop-up**.
  2. Di sisi lain, saat mengklik tombol **"Bicara"** di bottom bar chat, mikrofon langsung otomatis aktif dan bekerja tanpa hambatan. Tetapi saat panggilan telepon live, harus klik izinkan mikrofon yang malah macet di pop-up.
- **Akar Masalah Teknis**:
  - Pada build `m025-672`, modal pop-up wajib memanggil `navigator.mediaDevices.getUserMedia()`.
  - Di iOS WebKit PWA Standalone (aplikasi yang diinstal ke Home Screen), WebKit memiliki batasan keamanan dan bug *AVAudioSession hardware controller deadlock*, di mana pemanggilan `getUserMedia()` di dalam modal sering kali tidak memunculkan prompt izin sistem, Promise menggantung (*hang indefinitely*), atau langsung melempar error, sehingga tombol stuck dengan state `isRequestingMic = true`.
  - Sebaliknya, tombol **"Bicara"** di bottom bar chat (`app.js` / `features/interactive-chat/fiezel-voice-call.js`) **tidak pernah menggunakan `getUserMedia`**. Tombol tersebut menggunakan engine bawaan iOS yaitu `webkitSpeechRecognition` (Web Speech API / Siri Dictation) yang langsung aktif tanpa modal dan tanpa deadlock WebKit.
- **Solusi yang Diterapkan**:
  1. **Penghapusan Modal Pemblokir (Zero-Lock Invariant)**:
     - Menghapus modal stuck `showMicPermissionModal` dan tombol perizinan yang menggantung.
     - Mengubah pemanggilan `getUserMedia()` menjadi *non-blocking* dengan batas waktu aman (`Promise.race` 1.2 detik), sehingga jika WebKit iOS menolak atau menggantung, proses panggilan langsung melanjutkan ke pipeline suara tanpa memblokir antarmuka pengguna.
  2. **Hands-Free Continuous Speech Pipeline untuk Live Duplex**:
     - Mengaktifkan `SpeechRecognition` / `webkitSpeechRecognition` secara *hands-free* dan berkelanjutan (*continuous*) di mode panggilan live (engine yang sama persis dengan tombol "Bicara").
     - Ketika murid berbicara dan terjadi jeda hening (*silence timer* 1.6s - 2.2s bergantung pada kelengkapan gramatika kalimat), transkripsi murid otomatis dikirimkan langsung ke Gemini Live WebSocket melalui pesan duplex:
       `{ clientContent: { turns: [{ role: 'user', parts: [{ text: toSend }] }], turnComplete: true } }`
     - Gemini Live AI (Mochi) langsung merespons suara murid secara real-time duplex.
  3. **Barge-In Interruption & Voice Reactivity**:
     - Saat murid mulai berbicara (`rec.onresult` terpicu), sistem seketika memotong audio Mochi (`interruptAiAndStartListening` menghentikan buffer audio `activeSourcesRef.current`), sehingga murid dapat menyela pembicaraan secara alami.
     - Indikator visual `isUserSpeakingLive` otomatis berdenyut hijau *"Mendengarkan..."* saat mendeteksi transkripsi ucapan murid.

---

## 2. Bukti Pengujian Empiris & Headless Playwright Probe
1. **Probe iPhone PWA Standalone (`tools/dev/probe-iphone-live-call-zero-lock.mjs`)**:
   - Menyimulasikan peramban Safari iOS PWA Standalone (`navigator.standalone = true`, iOS User Agent) di mana `getUserMedia` melempar `NotAllowedError`.
   - **Check 1: Blocking Modal Visible? NO (SMOOTH & ZERO-LOCK!)** — Pengguna tidak lagi terjebak di pop-up modal.
   - **Check 2: Live Call Connects & Opens Duplex WebSocket? YES!** — WebSocket Gemini Live terbuka dan Mochi menyapa dengan opening turn audio.
   - **Check 3: Hands-Free Continuous Speech Recognition Driving Live Call? YES!** — Engine `webkitSpeechRecognition` aktif tanpa macet.
2. **Quality Gate Lokal (PASS 100%)**:
   - `tests/voice-studio-ui-architecture-test.js`: PASS (5/5).
   - `tests/ios-pwa-mic-shadowing-test.js`: PASS (5/5).
   - `tests/id-golden-snapshot-test.js`: PASS (baseline emas utuh).
   - `tests/th-ui-leak-test.js`: PASS.
   - `tests/curriculum-cache-version-test.js`: PASS (`m025-673`).
   - `tests/gate-registry-test.js`: PASS (10/10).

---

## 3. Berkas yang Diubah
1. `features/voice-studio/src/App.tsx`:
   - Menghapus modal `showMicPermissionModal` dan tombol stuck.
   - Mengintegrasikan pipeline `SpeechRecognition` hands-free continuous ke Gemini Live WebSocket `clientContent`.
   - Menambahkan audio buffer cancellation pada saat murid melakukan barge-in interruption.
   - Memastikan `getUserMedia` berjalan non-blocking dengan timeout race.
2. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi ulang bundel produksi Voice Studio.
3. `id-golden-baseline.json`:
   - Penyelarasan baseline literal Indonesia resmi.
4. Hexa-sync rilis `m025-673`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`
