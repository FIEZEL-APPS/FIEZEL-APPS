# FIEZEL m025-807 — Audit & Perbaikan Menyeluruh Sistem Papan Tulis Kawan Bicara (Voice Studio)

- **Status**: READY_FOR_PR_MERGE (terverifikasi probe Playwright Chromium headless + seluruh gerbang mutu lokal)
- **Otorisasi**: MASTER / OWNER
- **Build Target**: `m025-807` (`coordination/BUILD-VERSION.json`)
- **Branch**: `fix/whiteboard-speed-and-pedagogical-perfection` (berbasis `origin/main` `0b7cdd30`)

---

## 1. Ringkasan Temuan Audit Empiris & Akar Masalah

Audit kode sumber menyeluruh plus pengujian probe Chromium Playwright (`tests/whiteboard-speed-quiz-probe.cjs`) membuktikan sejumlah cacat kritis yang menyebabkan Papan Tulis terasa sangat lambat, gagal menyambung di produksi, hingga membuat Voice Studio crash:

1. **Tirai Loading Terkunci oleh Gate Audio Awal (`InCallLearningWorkbenchModal.tsx`)**:
   - `isInitialAudioGateActive` + `safetyTimer` `11500ms` memblokir kanvas papan tulis meskipun data `boardState` sudah siap (`isReady === true`), sehingga murid dipaksa menatap layar loading jauh lebih lama menunggu fetch & decode audio TTS pertama.
2. **Gagal Autentikasi Cross-Origin `401 unauthenticated` (`whiteboardDirector.ts`)**:
   - `requestRealtimeWhiteboardStream` dan `requestRealtimeWhiteboardAction` memanggil `/api/voice/whiteboard-stream` dan `/api/voice/partner-turn` tanpa `ensureVoiceWorkerSession(base)` dan tanpa `credentials: 'include'`, `mode: 'cors'`. Akibatnya Worker (`aiSpendGate('aiChat')`) menolak permintaan dari produksi dengan `HTTP 401`, memicu fallback berantai yang lambat atau gagal offline.
   - Ketika jalur `stream` sudah ditolak Worker (`401`/`403`/`429`), klien tetap menembak ulang rute `partner-turn` yang sama. Selain itu, prompt fallback lokal di `whiteboardDirector.ts` mencontohkan `"whiteboardSteps": []`.
   - Di `App.tsx`, jalur Live WebSocket (`commitLiveUserTurn`) memanggil `requestRealtimeWhiteboardAction` (non-streaming) sehingga kehilangan pre-warm `opener`.
3. **Cache-Miss Audio Opener SSE (`boardSpeechText.ts`, `whiteboardDirector.ts`, `liveTransport.ts`, `App.tsx`, `route-voice-live.js`)**:
   - Teks Chunk-0 yang di-pre-warm saat event SSE `opener` tiba berbeda dengan hasil `buildWhiteboardScenePlan` -> `buildCohesiveBoardNarrationScript` -> `splitTtsIntoSentenceChunks(..., 145)[0]` (mis. penghapusan filler `"Simak baik-baik"`, penggantian `[•|]`, dan penulisan ulang saat `retryGen`), sehingga memicu permintaan TTS ganda (pada probe baseline: `boardToAudioMs: 2310ms` dengan 2 request TTS untuk opener).
   - Di `route-voice-live.js`, schema prompt langkah visual memuat seluruh array sibling secara bersamaan; prompt dirapikan agar mengisi satu arketipe visual terpilih dan menyertakan `drillDistractors`, serta mempertahankan `lockedOpener.headingStep` bila terjadi `retryGen`.
4. **Crash React Hooks Error `#300` Saat Minimize (`InCallLearningWorkbenchModal.tsx`)**:
   - `useEffect` untuk telemetri `board_completed` dipanggil *setelah* `if (isMinimized) return ...` dan `if (!isOpen) return null;`. Menekan tombol perkecil papan (`workbench-minimize-btn`) memicu `Minified React error #300` dan meruntuhkan seluruh antarmuka Voice Studio.
5. **Balapan / Race Saat Pertanyaan Lanjutan (`InCallLearningWorkbenchModal.tsx`)**:
   - Saat `isGeneratingTopic === true`, efek lockstep menjalankan `runSilentClock(...)` pada papan lama dan memiliki dependensi berlebih (`isLiveConnected`, `isPlayingPreview`, `forceManualTts`, `uiAction?.sourceLayer`) yang bisa me-restart narasi di tengah kalimat.
   - `currentVisualSteps` saat menyusun `followUpContext.currentVisualKinds` tidak mengikutsertakan `metaphor_scene`, `mind_map`, `timeline_track`, `formula_blocks`, dan `trap_vs_fix`.
   - Klik tombol **"Ganti Soal"** (`quizSeed` bertambah) tergabung di `currentKey`, sehingga menghapus cache audio (`trackCacheRef.current.clear()`) dan mereset narasi ke Langkah 0.
6. **Cacat Kuis Interaktif (`InCallLearningWorkbenchModal.tsx`)**:
   - Pilihan ganda (`multiple_choice`) hanya menghasilkan 1–2 opsi (dan pada mode umum `read_aloud` kedua opsi memiliki teks yang persis sama).
   - Mode `cloze_gap` hanya menyediakan 1 chip bila `drillBlocks`/`drillDistractors` kosong.
   - Mode `sentence_blocks` memakai `.sort(() => (seedVariant % 2 === 0 ? 0.2 : -0.2))` yang membiarkan blok tersusun persis sesuai urutan jawaban atau kebalikan murni, serta `"Ganti Soal"` tidak mengacak tantangan baru.
7. **Sinkronisasi Scrubber, Pause/Resume, Kamera & Visual (`LiveWhiteboardCanvas.tsx`, `whiteboardDirector.ts`, `InCallLearningWorkbenchModal.tsx`)**:
   - Mengklik fase terakhir pada `wb-phase-scrubber` selalu melompat ke `totalSteps` (keluar dari langkah akhir), bukan ke langkah di fase akhir (`wb_checkpoint`).
   - Klik `onSelectStepIndex` tidak mereset `audioClock`, dan klik Resume/Play memicu kilatan `isAudioPreparing` secara sinkron meski audio sudah ada di cache.
   - `MutationObserver` kamera di `LiveWhiteboardCanvas.tsx` terpicu pada setiap mutasi `class` (termasuk kedipan caret), menahan debounce kamera; nib spidol `RoughFreeformSceneDiagram` memakai ambang `0.65` sementara `reachedCount` memakai `0.86`; `synthesizeAlternativeVisualStep` pada `cycle === 3` sering jatuh ke duplikat `contrast_scale`.
   - Beberapa string UI papan tulis masih memakai em-dash (`—`) yang dilarang panduan copy FIEZEL.

---

## 2. Perbandingan Empiris Probe Playwright (`tests/whiteboard-speed-quiz-probe.cjs`)

Kondisi simulasi probe: SSE `opener` tunda `300ms`, SSE `board` tunda `3200ms`, neural TTS tunda `2200ms`.

| Invarian Uji | Baseline (Sebelum Perbaikan) | Sesudah Perbaikan (Build `m025-807` / rebased `origin/main`) |
| --- | --- | --- |
| **A1** Kanvas terbuka cepat sebelum TTS selesai | **FAIL** (`3593ms`) | **PASS** (`439ms`) |
| **A2** Audio langkah 0 diputar | PASS (`3638ms`) | **PASS** (`3333ms`) |
| **B1/B2** Opsi MCQ `>= 3` & unik | **FAIL** (hanya 2 opsi) | **PASS** (4 opsi unik) |
| **B3** Tombol "Ganti Soal" mengacak urutan | **FAIL** (urutan identik) | **PASS** (berubah) |
| **B4** Isian Kata (`cloze_gap`) punya `>= 3` chip | **FAIL** (`["happy"]`) | **PASS** (`["She","happy","is","today"]`) |
| **B5** Susun Balok (`sentence_blocks`) teracak asli | **FAIL** (hanya terbalik) | **PASS** (`["today","She","is","happy"]`) |
| **B6–B9** Phase Scrubber, Pause, Resume, Fase Akhir | — | **PASS** (Phase 2 -> `s2`, Pause membekukan jam, Resume `3ms`, Fase 4 -> `wb_checkpoint`) |
| **C1** Minimize & Restore tanpa React error `#300` | **FAIL** (Crash `#300`) | **PASS** (`errors: []`) |
| **D1** Papan lama tidak balapan saat follow-up dimuat | PASS | **PASS** (1 caption & timer stabil, `playing: false`) |
| **D2** Jeda board lanjutan tiba ke audio mulai (cache hit) | **FAIL** (`2310ms`) | **PASS** (`30ms`) |
| **D3** Teks pre-warm `opener` === teks Chunk-0 (1x TTS) | **FAIL** (mismatch, double fetch) | **PASS** (identik 100%, 1 fetch untuk Chunk-0) |
| **D4** 1 request stream, nol fallback ganda | PASS | **PASS** (`stream: 1, partnerTurn: 0`) |
| **D5** Konteks follow-up melapor seluruh visual aktif | **FAIL** (`trap_vs_fix` hilang) | **PASS** (`["contrast_scale","table","trap_vs_fix"]`) |
| **E1** Mobile `390x844` tanpa overflow & bebas em-dash | — | **PASS** (`docOverflow: false, modalWidth: 366, emDashLeak: false`) |
| **Z0** Nol page error keseluruhan | **FAIL** (React error `#300`) | **PASS** (`[]`) |

Total: **4/14 PASS** (baseline) meningkat menjadi **19/19 PASS** (`node tests/whiteboard-speed-quiz-probe.cjs --strict`).

---

## 3. Daftar Berkas yang Disentuh

- `features/voice-studio/src/lib/boardSpeechText.ts` (baru: SSOT pembersih teks & ekstraksi Chunk-0 `openerSpokenText` antara pre-warm dan papan).
- `features/voice-studio/src/lib/whiteboardDirector.ts` (`postWorkerJson` dengan `ensureVoiceWorkerSession` + `credentials: 'include'`, retry 401/403 satu kali, `skipBackend` anti-dobel, `extractOpenerFirstTtsChunk`, contoh schema non-kosong untuk kunci lokal, perbaikan `synthesizeAlternativeVisualStep` cycle 3/6 & heading narration, pembersihan em-dash).
- `features/voice-studio/src/lib/liveTransport.ts` (samakan pre-warm SSE `opener` memakai SSOT `openerSpokenText` + impor ekstensi `.ts` agar kompatibel Node ESM).
- `features/voice-studio/src/App.tsx` (upgrade jalur Live WS `commitLiveUserTurn` ke `requestRealtimeWhiteboardStream` + SSOT `extractOpenerFirstTtsChunk` pada seluruh panggilan stream).
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx` (pindahkan hook ke atas early return, hapus lock tirai audio 11,5s, bekukan papan lama saat `isGeneratingTopic`, pangkas dependensi pemicu restart audio, pisahkan `topicKey` vs `currentKey`, tunda pill `isAudioPreparing` 60ms saat resume, reset `audioClock` saat seek, `seededShuffle` + `synthesizeSentenceDistractors` dwibahasa `wbPick` + `buildClozeDistractorChips`, perluas `currentVisualSteps`, ganti ikon minimize `−`).
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx` (throttle `MutationObserver` kamera berdasarkan perubahan fokus sub-elemen nyata, selaraskan ambang nib `0.86`, perbaikan `jumpToPhase` fase akhir, hilangkan em-dash dengan `wbPick`).
- `workers/api/voice/route-voice-live.js` (perampingan arahan schema `step[2]` untuk kurangi token keluaran, sertakan `drillDistractors`, serta sinkronkan ulang `lockedOpener.headingStep` setelah `retryGen` bila masih topik yang sama).
- `features/voice-studio/dist/voice-studio.js` (hasil build Vite `npm run build` terbaru).
- `tests/whiteboard-speed-quiz-probe.cjs` (probe empiris Playwright Chromium 19 invarian + verifikasi tangkapan layar desktop & mobile).
- Penyelarasan build rilis `m025-807` melalui `node tools/bump-build.mjs` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`, `index.html`) dan regenerasi `id-golden-baseline.json`.

---

## 4. Status Gerbang Mutu Lokal & Rencana Lanjutan (Next / Roadmap)

- **Gerbang lulus setelah edit akhir & bump build**:
  - `node tools/bump-build.mjs --check` (`Selaras`, `m025-807`)
  - `node tests/whiteboard-speed-quiz-probe.cjs --strict` (`19/19` PASS)
  - `node tests/id-golden-snapshot-test.js` (PASS / HIJAU)
  - `node tests/th-ui-leak-test.js` (PASS)
  - `node tests/i18n-english-first-and-purity-test.js` (14 checks PASS)
  - `node tests/curriculum-cache-version-test.js` (OK, 33 assertions)
  - `node tests/gate-registry-test.js` (10 pass, 0 fail)
  - `node tests/voice-copilot-relevance-gate-test.js` (28/28 PASS)
  - `node tests/voice-studio-ui-architecture-test.js` (8/8 PASS)
  - `node tests/braincore-nervous-system-wiring-test.js` (13/13 PASS)
  - `node tests/ai-account-cap-gate-test.js` (81/81 PASS)
  - `node tests/anti-tamper-and-watermark-test.js` (11/11 PASS)
  - `node tests/tri-core-invariants-gate-test.js` (25/25 PASS)
- **Next / Roadmap**:
  1. Verifikasi CI GitHub Actions (`FIEZEL Quality Gate`, `A9-A14 Guardians`, `Deploy Site`) hingga hijau 100% dan merge PR ke `main`.
  2. Utang lanjutan (di luar cakupan perbaikan inti ini): streaming progresif kartu Step-1..Step-5 satu per satu via SSE agar papan panjang tetap muncul bertahap bahkan sebelum seluruh JSON 6 langkah rampung.
