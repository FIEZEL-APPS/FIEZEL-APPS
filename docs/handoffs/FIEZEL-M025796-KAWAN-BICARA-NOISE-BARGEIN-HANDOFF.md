# FIEZEL m025-796 — Kawan Bicara Noise-Immune Language Barge-In & Anchored Ide Bicara Handoff

## 1. Ringkasan Temuan Audit & Akar Masalah

Menindaklanjuti temuan live localhost pada percakapan **Coach Sarah** (`Level B1`, mode `Latihan · Mentor`, `FaceTime Live`):
1. **Anomali Ide Bicara & Fonetik Bahasa Inggris (`Cara Baca`)**:
   - Ketika Coach AI memberi saran pedagogis / tip belajar seperti `"Don't fret, darling. The best approach is to practice with daily sentences and read consistently-you'll pick them up faster than you think."`, lapisan `detectAiIntent()` belum memiliki intent `'coaching_advice'` sehingga kalimat jatuh ke template `'statement'` generik dan memunculkan jawaban tidak nyambung `"That makes a lot of sense!"` (terlebih saat streaming early trigger terpicu terlalu dini setelah kalimat pembuka pendek `"Don't fret, darling."`).
   - Kata kunci Inggris seperti `approach` (`aprok` -> seharusnya `e-prouc`), `makes` (`makes` -> `meiks`), dan `them` (`tem` -> `dem`) belum tersusun akurat pada `EXTRA_ENGLISH_WORD_PHONETICS` / aturan magic-e `-VCs`/`-VCes` di `liveCallHelper.ts`.
   - Pada `workers/api/voice/route-voice-live.js`, padding fallback bank sempat menandai balasan statis dengan `isRealtimeAi: true`, serta `App.tsx` sempat menandai `lastCopilotAiKeyRef` lebih awal dengan kartu fallback instan sehingga respons final real-time saat `turnComplete` dapat terlewati.
2. **Interupsi Bising Kendaraan & Engine VAD/Barge-In Terlalu Rentan**:
   - Di `App.tsx`, `handleMicPcmData` sebelumnya langsung memanggil `interruptAiAndStartListening()` begitu `bargeSpeechStreakRef >= 5` (~160 ms) tanpa memeriksa modulasi silabel maupun memverifikasi adanya bahasa lisan asli (`intelligible spoken words`).
   - Di `handyVad.ts`, spektrum kendaraan bermotor (`45Hz–180Hz`), klakson, suara kipas/angin stasioner, dan hentakan pendek belum dipisahkan secara ketat melalui penalti sub-bass mesin (`subBassEngineEnergy`), fluks spektral L1 (`fluxEma`), variasi amplop RMS (`rmsVarEma` & `hasDynamicSpeechModulation`), serta adaptasi noise floor ke atas saat bising berkelanjutan (`rejectedHighEnergyStreak >= 6`). Selain itu, `maxToneConc` (`0.62`) semula terlalu ketat untuk vokal manusia bernada dasar F0 kuat hingga diperbaiki ke `0.86`/`0.90` dengan `bargeInOnsetFrames = 5` agar ucapan manusia tetap responsif sementara noise/knock tetap nol.
   - Di Gemini Live WebSocket `realtimeInputConfig` (`App.tsx`), sensitivitas awal sebelumnya `START_SENSITIVITY_HIGH`, sedangkan `isListeningSpeech` sebelumnya memakai `v.isHumanSpeech || vadRes.inSpeech`.

## 2. Perubahan yang Diimplementasikan

1. **Sinkronisasi Ide Bicara & Fonetik EN (`liveCallHelper.ts`, `liveTransport.ts`, `App.tsx`, `route-voice-live.js`)**:
   - `features/voice-studio/src/lib/liveCallHelper.ts`: Memperbaiki aturan magic-e `-VCs`/`-VCes` pada `phoneticizeUnknownEnglishWord` dan melengkapi `EXTRA_ENGLISH_WORD_PHONETICS` (`approach: 'e-prouc'`, `approaches: 'e-prou-cis'`, `makes: 'meiks'`, `make: 'meik'`, `made: 'meid'`, `takes: 'teiks'`, `them: 'dem'`, `these: 'diz'`, `those: 'doz'`, `than: 'den'`, `then: 'den'`, `fret: 'fret'`, `darling: 'dar-ling'`, `faster: 'fas-ter'`, `consistently: 'kon-sis-tent-li'`, `pick: 'pik'`, `sense: 'sens'`, `daily: 'dei-li'`, `habit: 'he-bit'`).
   - `features/voice-studio/src/lib/liveTransport.ts`: Menambahkan Speech Act `'coaching_advice'`, `adviceActionPhrase`, `extractCoachingAdviceAction`, `buildIndonesianAdviceHint`, kartu kontekstual terjangkar saran untuk EN/JA/ZH pada `buildContextualFallbackCards`, serta penegakan SSoT `approximateEnglishPhoneticId(fallbackText)` di `sanitizePron`.
   - `features/voice-studio/src/App.tsx`: Memisahkan `lastRealtimeCopilotKeyRef` dari tampilan instan optimistik (`budgetMs: 4500` untuk final turn), serta memperketat pre-fetch spekulatif streaming agar kalimat pembuka pendek < 12 kata tanpa tanda tanya menunggu lanjutan kalimat/selesainya giliran AI.
   - `workers/api/voice/route-voice-live.js`: Melarang penyamaran padding fallback (`isRealtimeAi: false, isOfflineFallback: true`) dan mewajibkan balasan terjangkar pada prompt `routeVoiceCopilotAssist`.

2. **Engine Barge-In Anti-Kendaraan Berbasis Verifikasi Bahasa (`handyVad.ts`, `sileroVadGate.ts`, `liveTransport.ts`, `App.tsx`, `route-voice-live.js`)**:
   - `features/voice-studio/src/lib/handyVad.ts`: Menambahkan `fluxEma`, `rmsVarEma`, `subBassEngineEnergy`, `singleToneConcentration` (`maxToneConc = 0.86 / 0.90`), adaptasi noise floor naik pada ambient stasioner (`rejectedHighEnergyStreak >= 6`), `bargeInThreshold: 0.78`, `bargeInOnsetFrames: 5`, `onsetFrames: 3`, `threshold: 0.54`, peluruhan halus `Math.max(0, this.onsetCounter - 2)`, serta helper `resampleFloat32To16k`, `hasDynamicSpeechModulation`, dan `encodeFloat32At16kToWavBase64`.
   - `features/voice-studio/src/lib/sileroVadGate.ts`: Menaikkan ambang barge-in (`pSpeech >= 0.88 && rms >= 0.028`, fallback `speechStreak >= 18`) dan menambahkan callback `onBargeCandidateAudio`.
   - `features/voice-studio/src/lib/liveTransport.ts` & `workers/api/voice/route-voice-live.js`: Menambahkan endpoint `POST /api/voice/verify-speech` (`routeVoiceVerifySpeech`) dan klien `verifySpokenLanguageAudio` untuk memverifikasi apakah kandidat audio >= 480 ms mengandung kata bahasa lisan asli (`hasLanguage: true && !isEchoOnly`).
   - `features/voice-studio/src/App.tsx`: Mengganti interupsi instan 5-frame dengan `runLanguageVerifiedBargeIn` + `isSelfEchoOrNonLexical` + `commitVerifiedSpeechInterrupt` (AI tetap berbicara mulus selama kandidat dikumpulkan dan diverifikasi; jika `reached === false`/luring hanya menerima fallback ekstrem >= 750 ms dengan `avgRms >= 0.055`, `avgPitchCorr >= 0.62`, >= 15 frame vokal, dan modulasi silabel dinamis), mengunci `isListeningSpeech` ke `vadRes.inSpeech && v.voiceBandRms >= 0.003`, menyaring `preRollFramesRef` bebas noise rendah, serta menyetel `startOfSpeechSensitivity: 'START_SENSITIVITY_LOW'`.

## 3. Pengujian & Verifikasi Empiris

1. **Pengujian Unit DSP & Kontrak (`tests/voice-kawan-bicara-sync-test.js`)**:
   - Menambahkan uji Coach Sarah `coaching_advice` (`extractFocalClause`, `detectAiIntent`, `buildContextualFallbackCards`, `resolveUnifiedPronunciation` untuk `e-prouc`, `dem`, `meiks`) serta simulasi sinyal 16 kHz `HandyHumanVad` & `hasDynamicSpeechModulation` terhadap deru motor (`45Hz+88Hz+176Hz`), klakson (`440Hz+554Hz`), bising stasioner kipas/jalan, hentakan knock 3-frame, versus ucapan silabel manusia termodulasi + header WAV `RIFF/WAVE`.
2. **Pembaruan Kontrak (`tests/voice-duplex-fullphone-contract-test.js`)**:
   - Menyelaraskan `[Test 7]` dan `[Test 10]` dengan ambang ketat anti-bising baru (`pSpeech >= 0.88 && rms >= 0.028`, `onBargeCandidateAudio`, `const isListeningSpeech = vadRes.inSpeech && v.voiceBandRms >= 0.003;`).
3. **Probe Playwright Real-Time & Coach Sarah (`http://127.0.0.1:8080/call.html`)**:
   - `tests/voice-pte-realtime-probe.js`: memverifikasi penolakan rumble/hiss (`0 PCM`), aliran vokal Speech (`19 PCM`), `audioStreamEnd` cepat, dan PTE E2E.
   - Verifikasi interaktif Playwright terhadap ucapan Coach Sarah pada `call.html?lang=en&theme=light` membuktikan `e-prouc` tampil, nol `"That makes a lot of sense!"`, Ide Bicara terjangkar `"Okay, I will practice with daily sentences and read consistently!"`, deru kendaraan/klakson/kipas maupun kandidat dengan `/api/voice/verify-speech` `hasLanguage: false` tidak menghentikan AI (`pcm=0`), sementara kandidat bahasa terverifikasi `hasLanguage: true` menginterupsi AI dengan bersih.

## 4. Berkas yang Disentuh

- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/handyVad.ts`
- `features/voice-studio/src/lib/sileroVadGate.ts`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `workers/api/voice/route-voice-live.js`
- `tests/voice-kawan-bicara-sync-test.js`
- `tests/voice-duplex-fullphone-contract-test.js`
- `id-golden-baseline.json`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html` (`m025-796`)
- `docs/handoffs/FIEZEL-M025796-KAWAN-BICARA-NOISE-BARGEIN-HANDOFF.md`
