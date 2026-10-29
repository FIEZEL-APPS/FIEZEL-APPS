# FIEZEL Release Handoff: M025-718
## In-Quiz Live Mochi Voice SOS Lifeline, Auth Login Restoration, Onboarding Mascot Scaling, and Luxury Quiz UI

**Release Build**: `m025-717`
**Date**: 30 Oktober 2026
**Status**: VERIFIED & READY FOR RELEASE

---

### 1. Executive Summary & Problems Resolved

This release resolves the critical issues reported by the user across multiple audit passes and completely takes over the Mochi Voice SOS integration from branch `feat/mochi-in-quiz-voice-sos-m025-720` (PR #778):

1. **Auth Login Restoration (Zero Guest Bypass)**:
   - Eliminated all bypass buttons (`Masuk sebagai Pengunjung / Tamu`) and associated `guest`/`local_bypass` handlers.
   - Restored standard authentication flow (Google Sign-In + Fiezel Account credentials) protecting user access and preserving data integrity.

2. **Onboarding Mochi Mascot Size Scaling**:
   - Replaced mobile clamp constraints that previously crushed Mochi down to `44px - 46px`.
   - Scaled Mochi to an ergonomic, vibrant, and delightful `114px × 108px` (and `98px × 92px` on compact screens), giving the mascot appropriate visual prominence without overflowing the viewport.

3. **KelasKu Task Card Removal**:
   - Removed `fz-stitch-kelasku` ("KelasKu • Tugas Aktif") card from the Home screen across both Japanese and English tracks as requested.

4. **Quiz Progress Counter Single-Line Alignment**:
   - Fixed `.quiz-progress-text` with `display: inline-flex !important; flex-direction: row !important; white-space: nowrap !important;` to ensure numbers like `1 / 10` never break into two vertical lines.

5. **Furigana / Romaji Toggle Daylight Harmonization**:
   - Removed the heavy dark black slab container on `.ja-display` and `.ja-toggle`, adopting a light daylight aesthetic matching the rest of the application.

6. **Tutor Hint Modal (`Petunjuk Guru`) Overhaul**:
   - Prevented header overlap by hiding `.quiz-topbar` when `body.has-tutor-modal` is active.
   - Cleaned up step instructions by stripping repetitive prefixes like `Langkah 1 :` so that clean step descriptions render cleanly beside the numbered step circle `(1)`.
   - Added `[Coba Lagi]` button allowing users to dismiss and attempt the question again.

7. **Zero Soft-Lock Feedback Bottom Sheet (`Intinya:`, Gestures, & Navigation)**:
   - Populated the `INTINYA:` takeaway card with an educational fallback cascade guaranteeing it is never blank.
   - Added native touch swipe-down gesture listener (`deltaY > 60px`) to dismiss the sheet and advance.
   - Bound `#quizSheetNext`, `#feedbackSheetClose` ('x'), and backdrop click to `advanceToNextQuestion()`, cleaning up DOM elements and reliably drawing the next item.
   - Raised `#modal.modal` to `z-index: 10002` so that exit confirmation appears above `#feedback` (`z-index: 10000`).
   - Hidden `<summary class="feedback-drawer-summary">` to eliminate the 18px horizontal sliver bar.
   - Enforced WCAG AAA contrast (`#7F1D1D` on `#FEE2E2` and `#064E3B` on `#D1FAE5`) on review badges.

8. **In-Quiz Live Mochi Voice SOS Lifeline Integration**:
   - Integrated full Gemini Live Duplex engine (`models/gemini-3.8-live`, `wss://generativelanguage.googleapis.com/...`, voice `'Puck'`).
   - Implemented Dual-Key protocol with localhost fallback and 16kHz Little-Endian PCM16 mic streaming.
   - Connected authentic topbar gem count (`#quizTopbarGemCount`) bound directly to `state.gems.balance`.
   - Mounted Thought Bubble ("Ketuk aku") with Socratic scaffolding and automatic exam lock (`cfg.placement` / `MEASURE`).

---

### 2. Quantitative Verification Table (Rule 2 DoD)

| Item / Feature | Target Specification | Actual Realized | Status |
| :--- | :--- | :--- | :--- |
| **Auth Screen Guest Bypass** | 0 guest buttons; authentic Google / Account login only | 0 guest buttons; standard auth restored | **PASS** |
| **Onboarding Mascot Size** | Mobile size $\ge 90\text{px}$, visible & prominent | $114\text{px} \times 108\text{px}$ (compact $98\text{px} \times 92\text{px}$) | **PASS** |
| **Home KelasKu Card** | Completely removed from Home view | `.fz-stitch-kelasku` absent from DOM | **PASS** |
| **Quiz Progress Counter** | Single horizontal line `1 / 10` on mobile | `1/5` inline flex, height $\le 26\text{px}$ | **PASS** |
| **Furigana / Romaji Toggle** | Daylight palette, no dark black slab | `#F8FAFC` light container, charcoal labels | **PASS** |
| **Tutor Hint Modal** | Centered pop up, clean numbered steps, zero header bleed | Pop up centered, topbar opacity 0, clean steps | **PASS** |
| **Feedback Takeaway Card** | Rich pedagogical text, 0 empty box | Populated with rule/target definition | **PASS** |
| **Feedback Exit / Advance** | Swipe-down, Lanjut, X, Keluar interactive | All triggers advance/confirm, zero soft-lock | **PASS** |
| **Feedback Badge Contrast** | WCAG AAA $\ge 7:1$ contrast | Burgundy `#7F1D1D` & Forest `#064E3B` | **PASS** |
| **Mochi Voice SOS Unit Tests** | 8/8 comprehensive tests passing | 8/8 PASS (`tests/mochi-voice-sos-test.js`) | **PASS** |
| **Content Integrity Gate** | 4/4 gates passing | 4/4 PASS (`tests/content-integrity-gate.js`) | **PASS** |
| **View Reachability Gate** | 67/67 routes reachability | 67/67 PASS (`tests/view-reachability-test.js`) | **PASS** |
| **Hexa / Octa Build Sync** | Synchronized across all 8 files | Verified `m025-717` (`--check` PASS) | **PASS** |
| **Indonesian Golden Baseline** | Validated baseline without drift | Verified 100% HIJAU | **PASS** |

---

### 3. File Inventory of Changes

- `app.js`: Removed `kelaskuStrip`, hardened watchdog/splash dismissal, improved tutor hint formatting, populated `finalTakeaway`, implemented direct `advanceToNextQuestion()`, wired Mochi Voice SOS lifecycle.
- `style.css`: Fixed progress counter flex, harmonized furigana toggle daylight styles, elevated modal z-index to 10002, updated badge contrast, scaled onboarding mascot to 114px, hidden global topbar during quiz.
- `features/auth/fiezel-auth-screen.js`: Eliminated all guest/tamu buttons and session overrides.
- `index.html`: Linked `mochi-voice-sos.css` and `fiezel-mochi-voice-sos.js`.
- `features/mascot/fiezel-mochi-voice-sos.js`: Gemini Live duplex voice engine with Puck voice.
- `features/mascot/mochi-voice-sos.css`: Wide desktop layout and voice soundwave visualizer.
- `tests/mochi-voice-sos-test.js`: Comprehensive 8-test unit suite.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Synchronized to `m025-717`.
