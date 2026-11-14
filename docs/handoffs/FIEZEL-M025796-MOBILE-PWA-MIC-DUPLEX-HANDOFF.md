# FIEZEL m025-796 — Mobile PWA Continuous Mic Duplex & AEC Barge-In Handoff

- **Build**: `m025-796` (incremented cleanly via `node tools/bump-build.mjs` from `origin/main` `m025-795`)
- **Branch**: `fix/mobile-pwa-mic-duplex-m025`
- **Authority**: OWNER / MASTER (strictly isolated scope inside Kawan Bicara / Voice Studio & shared duplex audio session; zero collateral edits to auth, onboarding, landing, or CSS themes)
- **Status**: `READY_FOR_CI_AND_DEPLOY`

---

## 1. Executive Summary & Audit Findings

Pada PWA mobile (`Android` & `iOS`), pengguna melaporkan mikrofon terasa "hidup-mati" saat mengobrol dengan Mochi: mikrofon terputus/hening ketika Mochi mulai berbicara, lalu aktif kembali setelah Mochi selesai berbicara (berbeda dari Desktop yang menyala terus-menerus), sehingga pengguna mobile gagal menyela (*barge-in*) AI di tengah kalimat.

Audit empiris menggunakan headless Playwright multi-profil serta isolasi DSP Node mengidentifikasi **5 akar masalah nyata**:

1. **OS Audio Session Downgrade & Per-Turn Focus Steal (`fiezel-ui-sfx.js`, `app.js`, `App.tsx`, `sfx.ts`, `fiezel-mochi-voice-sos.js`)**:
   - `navigator.audioSession.type` berpindah ke `'playback'` atau mode lain oleh pemutar efek suara / siklus UI selama panggilan dupleks berlangsung, dan efek suara `playFiezelSfx()` memanggil HTML5 `new Audio().play()` yang mencuri fokus mikrofon perangkat keras mobile.
   - `App.tsx` juga ikut melakukan priming elemen `<audio>` saat sesi live aktif, sedangkan penutupan panggilan (`stopLiveCall`, `stopSharedKawanMicBridge`, `closeCall`) perlu memulihkan `'playback'` secara deterministik hanya sesudah panggilan berakhir.
2. **AudioWorklet Instability on Mobile WebKit / Chrome PWA (`sileroVadGate.ts`, `App.tsx`)**:
   - Mobile PWA / iOS Safari / Android Standalone WebView tidak selalu menstabilkan pemrosesan `AudioWorkletNode` silang-realm saat `outputAudioCtx` aktif memutar audio AI (`ws-duplex`). Jalur mobile PWA diarahkan memakai `ScriptProcessor` (`preferScriptProcessor: isMobileOrIOSWebKit`) yang menjaga aliran 16 kHz tetap hidup secara deterministik, disertai pemulihan otomatis saat track mengalami `mute`/`unmute`/`ended` maupun saat `AudioContext` berada dalam status `'suspended'` / `'interrupted'`.
3. **Mobile Hardware-AEC Speech Over-Rejection (`handyVad.ts`, `sileroVadGate.ts`, `App.tsx`)**:
   - Peredam gema perangkat keras (*hardware AEC*) ponsel sering meredam suara pengguna saat mencoba menyela Mochi menjadi `RMS ~0.008–0.015`.
   - Sebelumnya `handyVad.ts` membuang seluruh frame dengan `minRms = 0.014` selama `aiPlaying === true` sebelum analisis pitch/formant dijalankan (`voiced = 0`), dan ambang `minAiVocalSnrDb = 7.5` tetap menolak ucapan harmonis AEC (`RMS ~0.011`) ketika tingkat noise floor awal `-65 dB` menghasilkan `vocalSnrDb = 5.4–7.4 dB` walaupun `pitchCorr` `0.90–0.98`, `vocalToRumble > 40`, dan `score > 0.78`.
   - Kalibrasi ulang khusus mode Mobile PWA AEC (`bargeInThreshold: 0.60`, `minRms = 0.006`, `minAiVocalSnrDb = 2.8` hanya jika `pitchCorr >= 0.60` dan `vocalToRumble >= 2.5` serta semua penjaga kebisingan lulus, `minBargeRms = 0.008`, `requiredBargeStreak = 5`, serta `requiredSileroBargeStreak = 6`) membuat selahan AEC terdeteksi cepat tanpa meloloskan dengung kipas, klakson, knalpot motor, maupun ketukan meja.
4. **Slow `getUserMedia` / Unmount Cleanup Race (`App.tsx`)**:
   - Jika `parentWin.__fzSharedMicStreamPromise` baru selesai sesudah batas tunggu awal >4s atau gagal keras, maupun saat pengguna keluar di tengah panggilan (`unmount` / `stopLiveCall`), pembersih listener track/konteks dan pengembalian `navigator.audioSession` kini terjaga penuh tanpa kebocoran.
5. **Indikator Status UI Dupleks**:
   - Label status saat AI berbicara kini eksplisit menunjukkan `"Mochi Bicara · Mic Aktif"` / `"bicara saja untuk menyela"` agar jelas bahwa mikrofon tetap aktif dan siap menerima selahan.

---

## 2. Empirical Verification & Regression Gates

### A. Headless Playwright 5-Profile Live Stream Probe (`probe-mobile-mic-duplex.js`)
Dijalankan melawan bundle produksi terbaru (`dist/voice-studio.js`):
- `Mobile-Android-HostModal-AECBarge` (aliran `MediaStream` nyata dengan ucapan harmonis teredam AEC `RMS ~0.011`):
  - Saat AI bicara (`midSpeech`): `audioSessionTop: "play-and-record"`, `audioSessionFrame: "play-and-record"`, `parentStreamLive: true`, `parentCtxState: "running"`, label `["Mochi Bicara · Mic Aktif", "bicara saja untuk menyela"]`.
  - Setelah selahan pengguna disuntikkan saat Mochi berbicara (`afterBargeAttempt`): langsung memotong AI (`labels: ["Kamu Bicara..."]`) dan mengirim PCM (`pcmByPhase.during_ai_aec_barge: 2`).
  - `AudioWorkletNode`: `0` (memakai `ScriptProcessor` `[2048,1,1]` dan `[4096,1,1]`); `SpeechRec` flapping: `0`; `HTMLAudio.play` di tengah panggilan: `0`; `postHangupAudioSession.top: "playback"`.
- `Mobile-Android-HostModal-FanNoiseIgnored` (kipas 60 Hz + noise pita lebar selama Mochi bicara):
  - `afterBargeAttempt`: tetap `["Mochi Bicara · Mic Aktif", "bicara saja untuk menyela"]` dengan `pcmByPhase: {}` (kebisingan diabaikan 100%, kemudian kembali ke `["Mic Aktif"]` setelah Mochi selesai).
- `Desktop-HostModal-AECBarge`: tetap memakai `AudioWorkletNode` dan ambang desktop ketat (`minBargeRms = 0.018`, `bargeInThreshold = 0.68`) serta menjaga `audioSessionTop: "play-and-record"`.
- `Mobile-iOS-PWA-DirectCall` & `Mobile-Android-SlowGUM-DirectCall`: `audioSession: "play-and-record"` aktif konsisten tanpa *flapping* atau error WebAudio.

### B. Automated Tests & Validators
- `node tests/mobile-pwa-mic-duplex-test.js` — PASS (4/4 assertions + registered in `.github/workflows/quality.yml`)
- `node tests/voice-duplex-fullphone-contract-test.js` — PASS (14/14)
- `node tests/kawan-bicara-lock-in-gate-test.js` — PASS (36 invariants)
- `node tests/voice-kawan-bicara-sync-test.js` — PASS (100% incl. `HandyHumanVad` speech & noise immunity)
- `node tests/audio-latency-barge-in-test.js` — PASS
- `node tests/audio-resource-leak-audit-test.js` — PASS
- `node tests/kawan-bicara-neural-voice-test.js` — PASS
- `node tests/curriculum-cache-version-test.js` — PASS (`m025-796`)
- `node tests/id-golden-snapshot-test.js` — PASS (`id-golden-baseline.json` updated intentionally for rebuilt `dist/voice-studio.js` + duplex status copy)
- `node tests/th-ui-leak-test.js` — PASS
- `node tests/gate-registry-test.js` — PASS (10/10 checks, 438 node invocations registered)
- `node validator.js` & `python release-audit.py` — PASS (`1538 pass / 0 fail`)
- `node tools/bump-build.mjs --check` — `Selaras` (`m025-796`)

---

## 3. Files Modified / Added

- `features/audio/fiezel-ui-sfx.js` — guard sesi audio `'play-and-record'` aktif (`hasActiveDuplexMic`, `setAudioSessionMode`, `claimAudioSession`)
- `features/mascot/fiezel-mochi-voice-sos.js` — set/restore `'play-and-record'` / `'playback'` dan flag `__fzDuplexAudioActive`
- `app.js` — sinkronisasi `navigator.audioSession.type` pada `warmKawanAudioAndMic` dan `stopSharedKawanMicBridge`
- `features/voice-studio/src/lib/sfx.ts` — `registerSfxHostAudioContext` + jalur WebAudio murni bebas `<audio>` focus steal saat panggilan aktif
- `features/voice-studio/src/lib/sileroVadGate.ts` — opsi `preferScriptProcessor`, threshold AEC `0.60`, auto-resume konteks, `isMobileAecHumanBarge`, dan streak mobile `6`
- `features/voice-studio/src/lib/handyVad.ts` — kalibrasi `minRms = aiPlaying ? 0.006 : 0.0025` dan `minAiVocalSnrDb` berjenjang untuk suara harmonis teredam AEC
- `features/voice-studio/src/App.tsx` — orkestrasi penuh sesi dupleks mobile, recovery listener track/AudioContext, zero `<audio>` priming saat live, `setDuplexAudioSessionMode`, dan sinkronisasi SlowGUM/unmount
- `features/voice-studio/dist/voice-studio.js` — bundle produksi terkompilasi ulang via Vite
- `tests/mobile-pwa-mic-duplex-test.js` & `.github/workflows/quality.yml` — gerbang regresi permanen terdaftar di CI
- `id-golden-baseline.json` — baseline literal diperbarui setelah build ulang `dist/voice-studio.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `index.html` — keselarasan build `m025-796`

---

## 4. Next Steps & Roadmap

1. **CI Gate Verification**: Buka PR ke `main` dan pantau seluruh shard `quality`, `A6`–`A14`, serta `Auto PR Review & Invariant Audit` hingga 100% hijau.
2. **Merge & Live Production Audit**: Setelah tidak ada deployment berjalan di `main`, gabungkan PR, pantau `FIEZEL Deploy Site`, dan verifikasi live URL (`https://fiezel.my.id/app/sw.js`, `call.html`, `coordination/BUILD-VERSION.json`) menyajikan `m025-796`.
3. **Physical Device Telemetry Watch (Future)**: Setelah rilis di produksi, pantau feedback pengguna nyata Android PWA & iOS Safari PWA terkait kenyamanan sensitivitas selahan di lingkungan berisik vs tenang.
