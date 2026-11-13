# FIEZEL HANDOFF DOSSIER: M025-793
## Perbaikan Real-Time VAD, Eliminasi Latensi Pasca-Bicara, Isolasi Voice-vs-Noise, & Penilaian Empiris PTE Academic + Kawan Bicara

- **Build Version**: `m025-793`
- **Branch**: `fix/voice-pte-vad-realtime`
- **Base Commit**: `6e77901a` (`m025-792`)
- **Scope**: `fix(voice,pte)`
- **Otoritas**: `OWNER` / `MASTER`
- **Tanggal**: 13 November 2026
- **Status Mutu**: **HIJAU 100%** (seluruh unit test PTE, kontrak voice duplex, baseline Indonesia/Thai, proteksi permukaan kritis, serta 2 suite E2E Chromium Playwright lulus penuh pasca-bump `m025-793`)

---

### 1. Ringkasan Temuan Audit & Akar Masalah

1. **Kawan Bicara (`features/voice-studio/`)**:
   - **Silero VAD & Idle Noise**: `SileroVadGate` (`src/lib/sileroVadGate.ts`) menggunakan `minSpeechMs` dan `redemptionMs` yang terlalu longgar serta masih memungkinkan jalur fallback mengirim frame PCM saat idle atau noise ringan (`|| v.rms >= 0.005` di `App.tsx`).
   - **Latensi Akhiran Giliran (Phantom Cooldown Bug)**: Di `features/voice-studio/src/App.tsx`, `setAiAudioPlaying(false, 350)` sebelumnya selalu menjadwalkan timer penutup 350 ms + pembaruan `lastAiPlayoutEndedAtRef` meskipun AI tidak sedang memutar audio sama sekali (`!isPlayingAiAudioRef.current && activeSourcesRef.current.length === 0`). Hal ini memicu zona mati `aiActuallyPlaying` (350 ms + 260 ms) tepat ketika `turnComplete` tiba, sehingga `scheduleUserBurstEnd()` dibatalkan (`clearUserBurstEndTimer()`) dan sinyal `audioStreamEnd: true` tertahan atau tidak terkirim.
   - **Pre-Roll & Burst Flush**: Tidak adanya buffer pre-roll terdedikasi menyebabkan awal suku kata pengguna rawan terpotong, sementara ujung ucapan menunggu terlalu lama sebelum mengirim `realtimeInput.audioStreamEnd: true`.

2. **PTE Academic Practice (`features/pte/fiezel-pte-ui.js` & `features/pte/fiezel-pte-engine.js`)**:
   - **Kontensi Mikrofon & WebSocket**: Pemanggilan `SpeechRecognition` secara bersamaan dengan Gemini Live WebSocket di perangkat mobile menimbulkan kontensi akses mikrofon, sedangkan kalibrasi `noiseFloor` pada `HandyHumanVad` belum memanfaatkan fase persiapan (`preparing`) sebelum bunyi beep dimulai.
   - **Audio Graph & Filter Voice-vs-Noise**: Jalur tangkap mikrofon PTE belum memfilter pita formant vokal manusia (300–3300 Hz) secara konsisten di atas `AudioWorkletNode` + fallback `ScriptProcessorNode(2048)` dan belum mengalirkan keheningan ujung bicara secara instan via `audioStreamEnd: true` maupun penutupan otomatis ala Pearson.
   - **Dekoding Delta Transkrip & Skor PTE Hardcoded/Bias**: Akumulasi transkrip inkremental rawan duplikasi/kehilangan fragmen kata, keyakinan pengucapan belum dihitung secara empiris dari rasio/disfluensi/akustik ketika Gemini Live tidak mengirim skor per-kata, `evaluatePronunciation` memaksa `confidenceAvg = 0` menjadi nilai positif, `evaluateOralFluency` mengabaikan disfluensi (`um`, `uh`, `er`, jeda), dan `evaluateRetellLecture` mematok skor fluency/pronunciation statis.

---

### 2. Arsitektur Solusi yang Diimplementasikan

1. **Kawan Bicara (`features/voice-studio/src/lib/sileroVadGate.ts`, `features/voice-studio/src/App.tsx`, `features/voice-studio/dist/voice-studio.js`)**:
   - Mengalibrasi `SileroVadGate`: `minSpeechMs: 160`, `redemptionMs: 380`, `preSpeechPadMs: 256`, `endSilenceFrames = isMobile ? 14 : 15`, tanpa mengirim PCM noise saat kondisi idle.
   - Menghapus bypass `|| v.rms >= 0.005`, menambahkan ring buffer pre-roll 7 frame (`preRollFramesRef`), penanda `sentAudioSinceEndRef`, `flushUserAudioStreamEnd()`, dan `scheduleUserBurstEnd()` (520 ms + flush seketika pada `vadRes.speechEnded` atau non-speech `>= 420ms`).
   - Menyuntikkan `realtimeInputConfig.automaticActivityDetection` pada payload `setup` Gemini Live serta payload standar `realtimeInput.audio` + `audioStreamEnd: true`.
   - Memperbaiki `setAiAudioPlaying` agar `tailDelayMs` dan `lastAiPlayoutEndedAtRef` hanya berlaku bila AI benar-benar memiliki audio aktif yang sedang diputar.
   - Membangun ulang bundle produksi `features/voice-studio/dist/voice-studio.js`.

2. **PTE Academic UI & ASR (`features/pte/fiezel-pte-ui.js`)**:
   - Menambahkan & mengekspor `analyzePteHumanVoiceBand` (bandpass formant 300–3300 Hz bebas-sample-rate), `appendIncrementalTranscript` (penghitungan delta subword, spasi, penggantian awalan, & deduplikasi overlap), serta `computePteEmpiricalConfidence` (skor keyakinan empiris atau mempertahankan `alt.confidence` asli dari `SpeechRecognition`).
   - Memperbarui `initPteMicBridge()` dengan `GainNode(0.00001)` + inline `AudioWorkletNode` (`pte-vad-capture-worklet`) + fallback `ScriptProcessorNode(2048)` serta `prewarmPteCapturePipeline()` saat fase `preparing` (`preserveNoiseFloor: true` saat beep).
   - Memperbarui `connectGeminiLiveAsr()` dengan gerbang kesiapan `setupComplete`, antrean PCM terbatas 64 item, `realtimeInputConfig.automaticActivityDetection`, `realtimeInput.audio` + `audioStreamEnd: true`, fallback non-kompetitif `SpeechRecognition` (`1200ms` / `onError`), penyetelan `pteHandyVad` (`hangoverFrames: 10`), penutupan otomatis ala Pearson (`2200ms` RS / `3000ms` RA/DI/RL), dan stop-flush non-blocking `<= 380ms` (0 ms bila WebSocket tidak terbuka).

3. **PTE Academic Scoring Engine (`features/pte/fiezel-pte-engine.js`)**:
   - Menambahkan & mengekspor `countSpeechDisfluencies` serta mengintegrasikan penalti disfluensi ke `evaluateOralFluency`.
   - Memperbaiki `evaluatePronunciation` agar `confidenceAvg = 0` menghasilkan `score: 0` (`Unintelligible`).
   - Menghubungkan evaluasi fluency/pronunciation dinamis + gerbang nol-konten Pearson ke `evaluateRetellLecture`, RA, RS, dan DI.

4. **Verifikasi Empiris & Pengujian (`tests/voice-pte-realtime-probe.js`, unit tests)**:
   - Menambahkan probe Playwright Chromium headless 4-skenario (`tests/voice-pte-realtime-probe.js`) serta memperluas `tests/pte-handy-vad-test.js` (11 pemeriksaan) dan `tests/pte-academic-engine-test.js` (33 pemeriksaan).

---

### 3. Berkas yang Disentuh

- `features/voice-studio/src/lib/sileroVadGate.ts`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js`
- `features/pte/fiezel-pte-ui.js`
- `features/pte/fiezel-pte-engine.js`
- `tests/pte-handy-vad-test.js`
- `tests/pte-academic-engine-test.js`
- `tests/voice-duplex-fullphone-contract-test.js`
- `tests/voice-pte-realtime-probe.js` (baru)
- `id-golden-baseline.json` (pembaruan baseline akibat minifikasi identifier baru di `dist/voice-studio.js` dan penyesuaian AST/komentar engine, 0 teks UI Indonesia berubah tak sengaja)
- Berkas bump build `m025-793`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `index.html`
- `docs/handoffs/FIEZEL-M025793-VOICE-PTE-VAD-REALTIME-HANDOFF.md`

---

### 4. Hasil Verifikasi Mutu (Build `m025-793`)

- `node tools/bump-build.mjs --check` -> **Selaras** (6 titik build `m025-793`)
- `node tests/curriculum-cache-version-test.js` -> **PASS** (`33 penegasan, 3 halaman, build m025-793`)
- `node tests/id-golden-snapshot-test.js` -> **PASS** (`HIJAU: baseline emas Indonesia utuh`)
- `node tests/th-ui-leak-test.js` -> **PASS** (`4751 kunci id, semuanya punya padanan th`)
- `node tests/gate-registry-test.js` -> **PASS** (`10 pass, 0 fail`)
- `node tests/critical-surface-protection-test.js` -> **PASS** (`9 PASS, 0 FAIL`)
- `node tests/pte-handy-vad-test.js` -> **PASS** (`11/11`)
- `node tests/pte-academic-engine-test.js` -> **PASS** (`33/33`)
- `node tests/pte-bank-integrity-test.js` -> **PASS** (`30/30`)
- `node tests/voice-duplex-fullphone-contract-test.js` -> **PASS** (`13/13`)
- `node tests/voice-studio-ui-architecture-test.js` -> **PASS** (`8/8`)
- `node tests/voice-call-two-way-test.js` -> **PASS** (`6/6`)
- `node tests/voice-pipeline-gap-test.js` -> **PASS** (`36/36`)
- `node tests/kawan-bicara-neural-voice-test.js` -> **PASS** (`100%`)
- `node tests/mochi-voice-sos-test.js` -> **PASS** (`27/27` + sub-suite FSRS-6 & Grammar)
- `node tests/voice-pte-realtime-probe.js` -> **PASS** (Playwright Chromium headless: Kawan Bicara `audioStreamEnd 684ms`, `0 PCM` noise, `SpeechRec=0`; PTE Primary `125ms` flush, `conf=0.823`; Fallback `conf=0.74`, dynamic RL fluency `0`; Auto-Close `67ms` turn flush & `3072ms` Pearson close)
- `node tests/voice-duplex-e2e-probe.js` -> **PASS** (`100%`)

---

### 5. Langkah Selanjutnya (Next Steps)

- Pantau seluruh 10 gerbang wajib GitHub Actions (`quality`, `A6`, `A7`, `A9`, `A10`, `A11`, `A13`, `A14`, `Auto PR Review & Invariant Audit`, `MASTER-only authority`) hingga 100% hijau sebelum merge ke `main`.
- Pastikan tidak ada workflow deploy lain di `main` yang sedang berjalan, gabungkan PR ke `main`, pantau `FIEZEL Deploy Site` hingga selesai, lalu verifikasi `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` menyajikan `m025-793`.
