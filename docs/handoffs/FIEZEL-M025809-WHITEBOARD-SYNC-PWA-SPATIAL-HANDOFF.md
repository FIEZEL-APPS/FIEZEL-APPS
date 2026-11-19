# Handoff Dossier - FIEZEL `m025-809`: Kawan Bicara & Whiteboard Full-Ecosystem Perfection, Mobile PWA Tactile Audio Launch, Socratic Quiz Loop, Universal Native Lock & Anti-503 Key Pool Hardening

- **Build Version**: `m025-809` (rebased cleanly atop `origin/main` `01d9bc33` / `m025-808`)
- **Branch / PR**: `fix/whiteboard-sync-camera-highlight` (PR `#887`)
- **Authority**: Disetujui langsung oleh **OWNER/MASTER authority** untuk rilis menyeluruh Kawan Bicara & Whiteboard (`m025-809`).
- **Scope**: `features/voice-studio/**`, `workers/api/voice/route-voice-live.js`, `server.js`, `call.html`, `tests/whiteboard-contract-test.js`, `tests/whiteboard-speed-quiz-probe.cjs`, build sync files (`m025-809`), `id-golden-baseline.json`

## 1. Ringkasan Temuan Audit Empiris & Akar Masalah

1. **Sinkronisasi Teks-Audio, 0ms Reveal Curtain & Jeda Antar-Chunk (Word-Clock & Gapless WebAudio)**:
   - Tokenisasi peta kata sebelumnya memakai kalimat mentah sementara `alignWordsToSpeech` memakai teks tersanitasi, sehingga word-clock sering meleset.
   - Transisi antar-chunk memicu `Promise.race` asinkron walau audio chunk berikutnya sudah siap di cache.
   - Tirai buffering papan tulis belum menutup tepat hingga audio benar-benar mulai berbunyi (`audioDeltaAfterRevealMs: 0ms`), dan `.fz-keyword-highlight` memakai `display: inline-block` yang merusak pemenggalan baris.
2. **Bug Fatal Mobile PWA (Macet Sampai Tekan Pause/Play & Skip Massal Langkah)**:
   - `AudioContext` dibuat di luar *user gesture*, sehingga di Mobile PWA/iOS Safari statusnya `'suspended'` dan `await ctx.resume()` macet selamanya.
   - Galat `NotAllowedError` di `HTMLAudioElement.play().catch()` langsung memanggil `advanceToNextOrDone()`, melompati seluruh penjelasan.
   - Perbaikan menghadirkan **Floating Tactile Studio Start Popup** (tombol tekan fisik pegas 3D anti-AI-slop dengan animasi *acoustic burst ring* + *spring launch*) yang menahan Step 0 dengan bersih dan langsung menyalakan suara + visual mulus dalam `<300ms` saat disentuh.
3. **Anomali Arah Visual (Kiri vs Kanan) & Penjelasan Tidak Lengkap**:
   - Pencocokan panel diagram belum memprioritaskan arahan spasial eksplisit (`sisi kiri` / `sisi kanan`) atau menyaring klausa negasi (`bukan kata kerja aksi`), dan `RoughFreeformSceneDiagram` mengikuti urutan JSON mentah.
   - `enforceSemanticVisualAlignment` menukar panel tanpa menghapus `spokenNarration` lama yang terbalik, dan guard `repaired = true` di `whiteboardDirector.ts` sempat menimpa narasi `metaphor_scene`.
4. **Socratic Mastery Loop Pasca-Kuis & Kunci Bahasa Penjelasan Native Universal**:
   - Sebelumnya AI berhenti merespons setelah murid menjawab kuis. Kini ditambahkan **Guided Socratic Mastery Coach** (`wb-quiz-coach-card`) bersuara: jawaban salah memicu diagnosis + hitungan mundur/tombol `[REMEDIATION_DIFFERENT_ANGLE]` (penjelasan ulang dengan sudut pandang & analogi berbeda); jawaban benar memicu pujian + pilihan lanjutan (`Latihan Soal Berikutnya`, `Pendalaman Materi`, `Lanjut Masalah Lain`).
   - Penjelasan di papan tulis kini dikunci mutlak ke bahasa native murid (20 bahasa: `id`, `en`, `th`, `ja`, `zh`, `ru`, `km`, `fil`, `vi`, `ko`, `ms`, `ar`, `es`, `fr`, `de`, `pt`, `hi`, `my`, `lo`, `it`) walau murid bertanya dalam bahasa kursus, kecuali murid meminta eksplisit dijelaskan dalam bahasa kursus.
5. **Audit Empiris Menyeluruh Ekosistem Kawan Bicara & Whiteboard (Temuan Tambahan yang Diperbaiki)**:
   - **CRITICAL Anti-503 TTS Key Pool (`route-voice-live.js`, `liveTransport.ts`, `server.js`)**: 10 dari 18 kunci lokal mati kuota (`429 RESOURCE_EXHAUSTED`); `invokeTtsCandidate` & `invokeGeminiLiveWavTts` tidak menandai kunci mati ke `_quotaDeadKeys`, baris `4900` salah menghapus dari `_copilotCooldownMap` alih-alih `_ttsCooldownMap`, `runLiveWavRace` hanya mencoba 6 kunci, dan `invokeGeminiLiveWavTts` hanya memetakan 5 bahasa. Seluruh 10 kunci mati telah dibersihkan dari `config/gemini-keys.json` lokal dan logika Worker kini mengkarantina kunci `429`/WS `1011`, menyapu seluruh pool, mendukung 20 bahasa penuh di Live WAV TTS, dan mempercepat fallback `/api/tts/line`.
   - **HIGH Race Condition Pindah Bahasa `EN/JA/ZH` (`App.tsx`)**: `handleSelectTargetLang`, `handleSelectPersona`, dan `handleSelectScenario` kini membatalkan `copilotAbortRef`, menaikkan `copilotSeqRef`, dan memvalidasi `activeScenarioRef.current.targetLang === scen.targetLang` sehingga kartu *Ide Bicara* Mandarin tidak lagi menimpa layar Coach Alex EN.
   - **HIGH Duplikasi Opsi Kuis (`InCallLearningWorkbenchModal.tsx`)**: Normalisasi tanda baca akhir (`normQuizKey`) mencegah opsi duplikat seperti `"I am agree."` dan `"I am agree"`.
   - **HIGH Invarian Copy & 16 Error `tsc --noEmit`**: Membersihkan 60 baris em-dash/en-dash (`callScenarios.ts`, `call.html`, `App.tsx`, `InCallLearningWorkbenchModal.tsx`, `i18n.ts`, dll.), menghapus label terlarang `"Target Level CEFR"`, mengganti 100 `font-black` (900 faux-bold) menjadi `font-extrabold` (800), melengkapi overload `wbPick`, `FlexibleTurnEvaluationResult.pedagogicalFeedbackEn`, dan `activeAiSubtitle.translationEn` hingga `tsc --noEmit` nol error (`0`).
   - **MEDIUM Polish Visual Desktop & Mobile 390px**: Pil `Coach Alex` / `Sensei Nanami` / `Level B1` memakai `whitespace-nowrap`, kerning `<rt>` Furigana dirapatkan (`0.48em`, `leading-[2.2]`) agar kartu terjemahan tidak terpotong lipatan bawah, dan kartu Coach Kuis otomatis `scrollIntoView` dengan opasitas penuh saat berinteraksi.

## 2. Daftar Berkas yang Disentuh

- `features/voice-studio/src/lib/boardAudioUnlock.ts` *(baru)*
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx`
- `features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx`
- `features/voice-studio/src/components/JapaneseRubyDisplay.tsx`
- `features/voice-studio/src/components/SswSenseiWorkbenchPanel.tsx`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/whiteboardDirector.ts`
- `features/voice-studio/src/lib/i18n.ts`
- `features/voice-studio/src/lib/braincore.ts`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/data/callScenarios.ts`, `kakijunStrokeBank.ts`, `pteCallScenarios.ts`, `pteReadAloudBank.ts`
- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/src/index.css`
- `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`
- `workers/api/voice/route-voice-live.js`
- `server.js`
- `call.html`
- `tests/whiteboard-contract-test.js` & `tests/whiteboard-speed-quiz-probe.cjs`
- Berkas sinkronisasi rilis `m025-809` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `features/voice-studio/call.html`, `index.html`, `id-golden-baseline.json`).

## 3. Bukti Pengujian Empiris (Sebelum & Sesudah Perbaikan)

- **TypeScript Full Check (`tsc --noEmit`)**: **0 errors** (turun dari 16 errors).
- **Production Build (`npm run build` di `features/voice-studio`)**: **EXIT 0** (2.048 modul).
- **Contract Test (`node tests/whiteboard-contract-test.js`)**: **12/12 PASS**.
- **Strict Playwright Whiteboard Probe (`node tests/whiteboard-speed-quiz-probe.cjs --strict`)**: **31/31 PASS** (`0` page errors, `interChunkGapsMs: [1]`, `boardToAudioMs: 130ms`, `pwaUnmutedMs: 283ms`, `V0/V1/P1/P2/Q1/Q2/L1: PASS`).
- **Full Ecosystem Live Audit (`kawan-bicara-full-audit.mjs` terhadap `http://127.0.0.1:3000`)**:
  - **11/11 live API/SSE/TTS endpoints `200 OK`** (`gemini-tts id` `3.333ms` 314KB WAV, `ru` `4.344ms`, `km` `3.708ms`, `live-session` `990ms`, `whiteboard-stream` ID/RU/EN override lulus semua).
  - **`Page errors: 0`**, **`Console errors: 0`**, **`Network 4xx/5xx: 0`**.
  - Inspeksi visual ulang 6 tangkapan layar (`audit-02`..`audit-07`): pil header 1 baris rapi, Furigana Jepang tanpa celah intra-kata + kartu terjemahan terlihat utuh, nol bocor kartu Mandarin di layar Coach Alex EN, 3 opsi kuis unik tanpa duplikat, kartu Coach Kuis tergulir penuh dengan kedua tombol CTA terlihat jelas, nol overflow Mobile 390px.
- **Suite Kualitas Host & Voice**: **22/22 suite unit test voice/whiteboard PASS**, `id-golden-snapshot-test.js` PASS, `th-ui-leak-test.js` PASS, `curriculum-cache-version-test.js` PASS (`m025-809`), `gate-registry-test.js` PASS (10/10), `node tools/bump-build.mjs --check` **Selaras (6 titik)**.

## 4. Catatan Utang Teknis

- Aset `assets/brand/paw-mochi-idle.svg` (maskot Mochi resmi) membungkus PNG 512x512 berukuran ~308 KB; dapat dioptimasi ke WebP ringan pada rilis optimasi aset tersendiri tanpa mengubah fitur belajar.
- Pembaruan kunci aktif di Cloudflare Worker production secret/KV (`GEMINI_LIVE_KEYS` / `cfg:gemini_live_keys`) dilakukan melalui panel/Sentinel Cloudflare dengan 8 kunci sehat yang tersisa.
