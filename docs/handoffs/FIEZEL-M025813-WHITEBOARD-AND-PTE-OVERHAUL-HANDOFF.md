# Handoff Dossier â€” FIEZEL m025-813: Perombakan UI/UX PTE Academic, Papan Tulis Kawan Bicara, Keamanan Kredensial Owner, & Sinkronisasi Audio-Visual 1:1

- **Build**: `m025-813` (meloncat dari `origin/main` `m025-812`, melewati `m025-813` yang diklaim PR #891)
- **Cabang**: `feat/wb-pte-overhaul-m025-813`
- **Cakupan**: PTE Academic UI/UX + Kawan Bicara Whiteboard (`features/voice-studio/**`) + Worker Voice Live (`workers/api/voice/route-voice-live.js`)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

1. **Perombakan Total UI/UX PTE Academic (Anti-AI-Slop)**:
   - Menyelaraskan kartu latihan PTE Academic (`features/pte/pte-tactile.css`, `features/pte/fiezel-pte-ui.js`, `content/pte/pte-describe-image.json`) ke estetika studio akademik yang bersih tanpa emoji kartun mentah, hierarki tipografi tegas, bar audio terpadu, serta grafik SVG proporsional berbasis data.
2. **Keamanan Kredensial Owner 100% Steril di PWA User**:
   - Menghapus seluruh tampilan UI API key, modal input kunci, dan pembacaan kunci Gemini dari `localStorage` (`fz_gemini_api_key` / `generativelanguage.googleapis.com?key=...`) pada sisi peramban (`liveTransport.ts`, `whiteboardDirector.ts`, `InCallLearningWorkbenchModal.tsx`).
   - Memperketat `workers/api/voice/route-voice-live.js` agar seluruh panggilan Gemini menggunakan header `x-goog-api-key`, menyaring seluruh kebocoran kunci lewat `redactOwnerSecrets()`, dan memulihkan kunci kuota via TTL otomatis.
3. **Papan Tulis Kawan Bicara, Mikrofon Papan, & Sinkronisasi Audio-Visual 1:1 (`Word-Clock Lockstep`)**:
   - Menambahkan tombol mikrofon dikte langsung di dalam papan tulis (`wb-voice-question-mic-btn`) tanpa menutup papan tulis.
   - Mengunci `isPlaying` kanvas saat `isAudioPreparing` / `isGeneratingTopic` aktif sehingga pena tutor, sorotan stabilo, dan kamera tidak pernah bergerak mendahului audio.
   - Menormalkan bahasa target pre-warm SSE Chunk-0 di `App.tsx`, menyelaraskan sorotan kata kunci (`<HighlightText>`), goresan RoughJS bertahap, urutan 3-bagian `trap_vs_fix`, dan fokus kiri-kanan pada 7 tema ilustrasi SVG (`WhiteboardVisualDiagrams.tsx`).
   - Memperbaiki contoh panel `FOTO KONDISI` (`whiteboardDirector.ts`) agar tidak lagi menampilkan kalimat salah sebagai contoh valid.
4. **Popup Buffering Adaptif 2-Tahap Anti-Slop & Sanitasi Prompt**:
   - **Tier 1 (`< 2.2s`, `compact`)**: Kapsul dinamis Double-Bezel melayang satu baris tenang dengan avatar bundar dan 3 bar gelombang satu aksen `#15803D`.
   - **Tier 2 (`>= 2.2s`, `elevated`)**: Lembar Studio Double-Bezel putih murni dengan pratinjau miniatur papan *dot-grid* arsitektural, pena monokrom live, cincin progres radial SVG (`tabular-nums %`), dan daftar 4 tahap bersih tanpa kotak warna-warni.
   - Menambahkan `sanitizeVisibleBoardPrompt()` agar tag internal (`[REMEDIATION_DIFFERENT_ANGLE]`, `[WHITEBOARD_REQUEST]`) dan prefiks debug tidak pernah muncul di antarmuka murid.

---

## 2. Bukti Pengujian Empiris (Playwright Chromium Headless)

Diujikan secara empiris di peramban Chromium headless (`390Ã—844` mobile & `1280Ã—860` desktop) pada `call.html?locale=id&lang=en`:
- `hasApiKeyLeak: false`, `leakedGoogleApiCalls: []`, `hasDebugTagLeak: false`, `consoleErrors: []`
- `docOverflowX: false`, `modalOverflowX: false`, `emojisSample: "âœ• âœ“"`
- `voiceMicStayedOpen: true`
- `tier1Observed: "compact"` -> `tier2Observed: "elevated"` -> `bufferingDismissedCleanly: true`
- `mode: "webaudio"`, `silentChunksCount: 0`, `wordClockMatchedCount: 1` (karaoke kata & jam audio bergerak selaras)

---

## 3. Daftar Berkas yang Disentuh

- `content/pte/pte-describe-image.json`
- `features/pte/fiezel-pte-ui.js`
- `features/pte/pte-tactile.css`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx`
- `features/voice-studio/src/components/WhiteboardErrorBoundary.tsx`
- `features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx`
- `features/voice-studio/src/index.css`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/whiteboardDirector.ts`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `workers/api/voice/route-voice-live.js`
- `id-golden-baseline.json`
- Penanda Hexa-Sync `m025-813`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`

---

## 4. Status Gerbang Mutu Lokal & Catatan Utang Teknis

- Seluruh gerbang mutu lokal (`whiteboard-contract-test.js`, `kawan-bicara-lock-in-gate-test.js`, `id-golden-snapshot-test.js`, `th-ui-leak-test.js`, `curriculum-cache-version-test.js`, `gate-registry-test.js`, `pte-academic-engine-test.js`, dan `node tools/bump-build.mjs --check`) diverifikasi 100% lulus sebelum PR dibuat.
- Utang teknis: Tidak ada permukaan terproteksi (`features/auth/**`, `features/onboarding/**`, `manifest.json`, `website/**`, `.github/workflows/**`) yang disentuh.
