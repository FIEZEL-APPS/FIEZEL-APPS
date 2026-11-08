# FIEZEL-M025783 — Splash Zero-Jump, Mobile Onboarding Scroll, Mobile PWA Mic Unlock, & Instant Mochi SOS Parity Handoff

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Splash Screen Zero-Jump & Full-Screen Parity (`index.html`, `features/brand/fiezel-splash.js`, `tests/pwa-cold-boot-seamless-test.js`)**:
   - Memulihkan `#fiezelBootSplash` ke posisi full-screen (`inset:0 !important;top:0 !important;bottom:0 !important;width:100% !important;height:100% !important;height:100dvh !important;padding:0 !important;margin:0 !important`) tanpa menggeser ke `top:-80px` yang menyebabkan loncatan posisi logo saat `style.css` dimuat.
   - Memperbarui asersi `[G2]` di `tests/pwa-cold-boot-seamless-test.js` agar memvalidasi kontrak zero-jump `inset:0 !important; top:0 !important; bottom:0 !important`.
2. **Mobile Onboarding Scroll & Touch Comfort (`index.html`, `features/ui/fiezel-tactile-clay.css`)**:
   - Menambahkan pengecualian `html.fz-booting:has(.fiezel-ob) body, html.fz-booting body:has(.fiezel-ob) { overflow-y: auto !important; overscroll-behavior-y: contain !important }` di `index.html`.
   - Memulihkan `@media (max-width: 767px)` pada `.fiezel-ob` (`position: fixed !important; inset: 0 !important; max-height: 100vh !important; overflow-y: auto !important; touch-action: pan-y !important;`), `.fiezel-ob-reveal` (`height: 190px`), `.fiezel-ob-mascot` (`96px`), `.fz-auth-topo` (`pointer-events: none !important`), dan kartu pilihan bahasa horizontal `64px` tanpa melanggar larangan `100dvh` di Section 15 (`tests/multi-device-comfort-test.js`).
3. **Mobile PWA Audio & User Microphone Unlock di Kawan Bicara (`features/interactive-chat/fiezel-interactive-chat.js`, `app.js`, `features/voice-studio/src/App.tsx`, `features/voice-studio/src/lib/sileroVadGate.ts`)**:
   - Memulihkan `allow="microphone; camera; autoplay; display-capture; clipboard-write; microphone *; autoplay *; camera *"` pada `#fzMitraKaiwaStudioFrame` di `fiezel-interactive-chat.js`.
   - Membagikan `window.__fzSharedLiveAudioCtx` dan `window.__fzSharedMicStreamPromise` yang sudah di-unlock pada gesture klik parent (`app.js` / `fiezel-interactive-chat.js`) ke dalam iframe `call.html` yang se-origin.
   - Mengganti `await liveCtx.resume()` / `await ctx.resume()` yang memblokir tanpa batas waktu di `App.tsx` dengan `Promise.race` (`150ms`) agar `connectMicStreamToLiveProcessing` dan `startLiveCall` tidak pernah menggantung di mobile PWA.
   - Memperbaiki `SileroNeuralVadGate.isActive()` (`sileroVadGate.ts`) agar hanya mengembalikan `true` bila `onFrameProcessed` benar-benar aktif mengirim frame dalam `600ms` terakhir (`Date.now() - this.lastFrameAt < 600`), serta mengalirkan PCM 16kHz secara kontinu saat `!cb.isAiPlaying()`.
4. **Mochi Voice SOS Instant Activation & User Voice Capture (`features/mascot/fiezel-mochi-voice-sos.js`)**:
   - Menghidupkan `openHotSocket(activeQ)` dan pre-warm `AudioContext` + mikrofon pada gesture klik saat modal konfirmasi dibuka (`showConfirmationModal`), sehingga ketika murid menekan "Gunakan 10 Gem & Mulai", koneksi WebSocket + `setupComplete` sudah siap dan suara sapaan Mochi terdengar seketika.
   - Memperbaiki bug di `_startParallelSpeechRecognition` di mana `_lastUserSpeechAt = Date.now()` menyebabkan pengecekan `(Date.now() - _lastUserSpeechAt) < 2800` 520ms kemudian selalu membatalkan pengiriman transkrip suara murid.
   - Memperbaiki `_sileroVadActive` di `_wireMicrophoneStream` agar fallback `proc.onaudioprocess` tetap aktif bila Silero WASM tidak mengirim frame dalam `600ms`, mengalirkan PCM 16kHz secara kontinu saat `!mochiPlayingAudio`, dan memperpanjang jeda berpikir pasca-pertanyaan Mochi (`_onMochiSpeechEnded`) menjadi 10 detik agar Mochi tidak memotong giliran jawab murid setelah 2 detik.

## 2. Daftar Berkas yang Disentuh
- `index.html`
- `app.js`
- `features/brand/fiezel-splash.js`
- `features/ui/fiezel-tactile-clay.css`
- `features/interactive-chat/fiezel-interactive-chat.js`
- `features/mascot/fiezel-mochi-voice-sos.js`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/lib/sileroVadGate.ts`
- `features/voice-studio/dist/voice-studio.js`
- `tools/preview-server.mjs`
- `tests/pwa-cold-boot-seamless-test.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `id-golden-baseline.json`

## 3. Bukti Pengujian & Kelulusan Gerbang Mutu Lokal
- `node tests/pwa-cold-boot-seamless-test.js` — PASS (21 assertions)
- `node tests/multi-device-comfort-test.js` — PASS (8 invariants)
- `node tests/splash-first-paint-test.js` — PASS (32 assertions)
- `node tests/onboarding-test.js` — PASS
- `node tests/mochi-voice-sos-test.js` — PASS (27/27 suites)
- `node tests/voice-studio-ui-architecture-test.js` — PASS
- `node tests/critical-surface-protection-test.js` — PASS (9/9)
- `node tests/th-ui-leak-test.js` — PASS (4751 keys)
- `node tests/gate-registry-test.js` — PASS (10/10)
- `node tests/id-golden-snapshot-test.js` — PASS
- `node tests/curriculum-cache-version-test.js` — PASS (m025-783)
- `node tools/bump-build.mjs --check` — Selaras (`m025-783`)
