# FIEZEL HANDOFF DOSSIER: KAWAN BICARA (AI VOICE STUDIO) TOTAL UI/UX, MOBILE MIC, TRANSLATION, & IN-FLOW COPILOT OVERHAUL

- **Build Version**: `m025-777`
- **Topic**: `fix(voice): [ALLOW-PROTECTED: pwa] unblock mobile mic, elevate translation clarity, and dock copilot in-flow (m025-777)`
- **Target Surface**: `features/voice-studio/` (`call.html`), `features/interactive-chat/fiezel-interactive-chat.js`
- **CI / Gate Status**: 100% HIJAU (All 10 meta-gates, 8 UI architecture gates, 26 Copilot relevance gates, 8 AI Studio port tests, golden snapshot baseline)

---

## 1. Executive Summary & Problem Diagnosis

User reported persistent issues across all learning sessions with **Kawan Bicara** (Mitra Kaiwa / AI Voice Studio):
1. **Mobile Microphone Inactivity**: The microphone button could not be activated on mobile devices, while working seamlessly on desktop.
2. **Translation Invisibility**: Learners had extreme difficulty seeing Japanese/Mandarin Indonesian translations during spoken conversations.
3. **AI Copilot Unusable**: Beginners could not easily view or use contextual speaking suggestions.

### Root Causes Uncovered via Playwright Probe
1. **Physical Hitbox Interception on Mobile**:
   In `dd63e669` (m025-774), `BeginnerAnswerAssistant.tsx` was wrapped in `<div className="fixed inset-x-0 bottom-0 z-50 ...">` at `height: 58px`. On mobile screens (390px viewport), this invisible fixed drawer sat precisely over coordinates `y: 606px–664px`. The PTT / Hands-Free microphone button lives at `y: 611px–645px`. As a result, `document.elementFromPoint(micX, micY)` was intercepted by the assistant's collapse toggle, physically swallowing mobile touch events before they could reach the microphone button. On desktop (1280px), the drawer was restricted to `max-w-xl` and centered, leaving the mic button unblocked.
2. **Active Speech Translation Suppression**:
   In `App.tsx`, `resolvedActiveAiMeaning` contained:
   ```ts
   if (isStreamingAiLive || isPlayingAiAudio || isAiThinking) {
     return loadingTranslationText; // "Sedang memuat terjemahan..."
   }
   ```
   Even when the AI's opening line or turn had a pre-computed or memoized Indonesian translation, it was actively hidden and replaced with placeholder loading text during the entire playback!
3. **Visual Hierarchy & Fold Deficiency**:
   The translation was styled as a tiny 12px low-contrast text (`text-xs text-[#5C4E3C]`) at the very bottom of the card, often pushed below the mobile viewport fold by an oversized 150×130px Mochi container.

---

## 2. Engineering Changes & Architectural Solutions

### A. Non-Overlapping In-Flow Copilot (`BeginnerAnswerAssistant.tsx`)
- Completely eliminated `fixed inset-x-0 bottom-0 z-50` overlay.
- Re-architected Copilot into an in-flow docked component inside `docked-copilot-container` residing strictly above the composer dock (`y: 264px–560px` vs mic at `y: 611px–645px`).
- Default state set to expanded: learners immediately see the 3 response options (`1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik`), complete with target phrase, ruby furigana/pinyin, phonetic guide, Indonesian meaning, and quick action buttons (`[Dengar]`, `[Ucapkan]`, `[Pakai Jawaban]`).

### B. Instant Known-Translation Visibility & High-Contrast Card HUD (`App.tsx`)
- Updated `resolvedActiveAiMeaning` so known translations are displayed immediately, enabling learners to read along as Mochi speaks.
- Replaced the low-contrast 12px text with a prominent warm card HUD:
  - Background: `#FFF8EE` with `#F0DFCA` border and rounded-2xl padding.
  - Header badge: `🇮🇩 Arti / Terjemahan:` (`text-[11px] font-bold text-[#9C6119]`).
  - Text: `text-[13.5px] sm:text-[15px] font-semibold text-[#1C1611]` leading-relaxed.
- Compacted mobile Mochi 3D container to `w-[95px] h-[80px]` (from `w-[150px] h-[130px]`), recovering over 70px of vertical space to ensure subtitles and translations stay well above the mobile fold.

### C. Touch-Gesture AudioContext Auto-Resume & Canonical Permissions Policy
- Added `touchstart` and `click` capture listeners to proactively resume suspended `liveAudioCtxRef` and `ttsAudioCtxRef` on any mobile interaction.
- Formatted iframe permissions policy in `fiezel-interactive-chat.js` to canonical W3C standard:
  `allow="microphone *; camera *; autoplay *; clipboard-write *; display-capture *"`.

---

## 3. Empirical Playwright Verification Evidence

Run via `node tools/dev/probe-voice-audit-total.mjs`:
- **Mobile Initial Audit**:
  - `isMicOverlappedByCopilot`: `false`
  - `elementOnTopOfMic`: `{ "tag": "SPAN" }` (child of mic button)
  - `micButtonBox`: `{ "x": 19, "y": 613, "width": 84.68, "height": 32 }`
  - `copilotPeekBox`: `{ "x": 12, "y": 300.42, "width": 366, "height": 295.57, "bottom": 596 }` (strictly above y: 613)
  - `aiTranslationContent`: "Akhirnya nongol juga kamu! Awas ya kalau ngomong bahasa Jepang kaku kayak robot buku teks..." (Visible during playback)
- **Mobile In-Call Active Audit**:
  - `statusText`: "Mochi berbicara... (00:02)"
  - `micButtonText`: "Hands-Free" (Active duplex microphone)
  - `micButtonBox`: `{ "x": 19, "y": 611, "bottom": 645 }`
  - `copilotPeekBox`: `{ "bottom": 560 }` (zero overlap with mic)
- **Desktop Audit**:
  - `micButtonBox`: `{ "y": 749, "bottom": 781 }`
  - `copilotPeekBox`: `{ "y": 498, "bottom": 732 }`

---

## 4. Test Suite Gate Matrix (All 100% Green)

| Test Suite | Pass Count | Status |
| :--- | :--- | :--- |
| `id-golden-snapshot-test.js` | 8,222 Indonesian literals | PASS |
| `voice-studio-ui-architecture-test.js` | 8 / 8 assertions | PASS |
| `voice-copilot-relevance-gate-test.js` | 26 / 26 relevance gates | PASS |
| `voice-call-studio-integration-test.js` | 8 / 8 capability suites | PASS |
| `voice-call-ai-studio-port-test.js` | 5 / 5 port gates | PASS |
| `gate-registry-test.js` | 10 / 10 CI invariants | PASS |
| `th-ui-leak-test.js` | 4,751 keys checked | PASS |
| `curriculum-cache-version-test.js` | 33 / 33 assertions (m025-777) | PASS |
| `bump-build.mjs --check` | Hexa-Sync 6 points | SELARAS |

---

## 5. Modified Files Inventory

- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`: Removed fixed bottom drawer, docked in normal document flow.
- `features/voice-studio/src/App.tsx`: Known translation auto-display, warm card HUD, proactive AudioContext resume, compact mobile stage.
- `features/interactive-chat/fiezel-interactive-chat.js`: Canonical W3C iframe permissions policy.
- `features/voice-studio/dist/voice-studio.js` & `dist/voice-studio.css`: Recompiled production bundle.
- `id-golden-baseline.json`: Synchronized golden baseline hash.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`: Build bumped to `m025-777`.
- `docs/handoffs/FIEZEL-M025777-VOICE-STUDIO-MOBILE-MIC-TRANSLATION-COPILOT-OVERHAUL-HANDOFF.md`: Handoff documentation.
