# FIEZEL m025-799 Handoff Dossier: Splash Screen Synchronization & HD 3D Mochi Restoration

- **Status**: COMPLETE — Verified locally via unit suites, Guardian A9–A13 gates, and Chromium Playwright visual + performance captures; ready for PR merge & production release (`m025-799`).
- **Authority**: MASTER / OWNER direct instruction (`kerjakan dan langsung deploy`) following completed splash + HD Mochi visual audit.

## 1. Summary of Root Causes & Changes

### A. Splash Screen Footer, Dual-Splash Seam, and Exit Fade
1. **Footer Reveal Desynchronization & Readability (`index.html`, `style.css`, `features/brand/fiezel-splash.js`)**:
   - Previously, `.kelasku-wordmark` and `.kelasku-tag` ran hardcoded `1.4s` / `1.52s` CSS delays from initial mount behind `.fiezel-splash-word` (`opacity: 0`), while `.kelasku-tag` multiplied `rgba(253,250,243,.65)` with `opacity: .65` (~42% effective opacity) inside a narrow `min(52vw,238px)` box and `filter: blur(4px)`.
   - Synced footer reveals to `.fiezel-splash-word.is-word-shown` (and `.is-word-settled` for settled/adopted boots) in `applyVisualState(t)` and `startMotion()`, raised `.kelasku-tag` contrast and size (`11.5px`, `rgba(253,250,243,.90)` at full `opacity: 1` without `blur`), and widened `.fiezel-splash-word` (`min(84vw,292px)` with safe bottom clearance).
2. **Elimination of Static-vs-Animated Splash Collision (`index.html`, `style.css`, `features/brand/fiezel-splash.js`)**:
   - Previously, after the OS/PWA static icon splash handed off to HTML, `#fiezelBootSplash` kept `.fz-fgroup` and `.fz-barsgroup` at `opacity: 0` until JS woke up (2.2s–4.5s on cold load), and then forced particle restart from `t=0` (totaling 5.6s–8.9s).
   - Added a `220ms`-delayed CSS bridge (`#fiezelBootSplash:not([data-fiezel-boot-claimed="shown"]):not(.fiezel-splash-still):not(.is-leaving)`) displaying the `F ||` mark, subtle equalizer breathing (`@keyframes fz-boot-bar-breathe`), and footer during slow JS loads, while preserving pure `t=0` particle assembly when JS wakes under `220ms`.
   - In `features/brand/fiezel-splash.js` (`show()`), when an adopted boot splash wakes at `bootElapsed >= 220ms`, `ctl.startOffset` advances directly to the post-reveal sequence (`>= 1320ms`, `adoptedRevealed: true`) so `F ||` stays visible seamlessly without flashing off or restarting particles from `t=0`.
3. **Smooth `.is-leaving` Crossfade Exit (`features/ui/mobile-edge-fit.css`, `style.css`, `index.html`, `app.js`)**:
   - Removed `#fiezelBootSplash.is-leaving` and `#fiezelBootSplash.is-leaving .fz-splash-canvas` from the `display: none !important` rules in `features/ui/mobile-edge-fit.css`, scoping hiding rules to `:not(.is-leaving)` and keeping `pointer-events: none !important`.
   - Added `.fiezel-splash.fiezel-splash-dark.is-leaving` `fz-splash-fade-out` (`0.32s`) in `style.css` and `index.html` (`#fiezelBootCritical`).
   - Updated `dismissBootSplash()` in `app.js` to respect an ongoing `.is-leaving` fade and apply `.is-leaving` before removing `#fiezelBootSplash` in interactive browser boots, while keeping watchdog / Node unit-test paths synchronous.

### B. HD 3D Mochi Restoration Without Mobile Lag (`mochi-mascot/fiezel-mochi.js`)
1. Added `_computeTargetPixelRatio()` to render compact cards (`<= 180px`, e.g., `136x126` mobile onboarding) at `2.0..3.0x` Retina density (`408x378` on DPR 3) and larger stages at `1.5..2.25x`, wired into `initScene()` and `updateSize()`.
2. Extracted `_configureCrispTexture(tex)` (`generateMipmaps = true`, `THREE.LinearMipmapLinearFilter`, `anisotropy` up to `4`) for `mochiSkinTexture`, `faceTexture`, `fxTexture`, and `badgeTex`.
3. Restored full 8-light studio rig and `MeshPhysicalMaterial` (clearcoat + peach silhouette sheen `#FFD2DE` / `#FFC4D6`) on body, demon horns, and empati paws across compact cards.
4. Retained all `m025-797` CPU/battery safeguards: `_faceRenderSig`, `_fxRenderSig`, `_auraBackEmpty`, visibility pause, WebGL context-loss recovery, spatial-grid face-shell projection, and idle frame pacing (`48ms` compact / `30ms` stage; instant 60fps on talk/hover/burst).

## 2. Empirical Verification & Visual Audit
- Executed headless Chromium Playwright verification (Mobile `390x844` DPR 3 + Desktop `1440x900` DPR 1):
  - **Mobile Simulated Slow Boot (`1100ms` delayed `app.js`)**: At `t=655ms`, `#fiezelBootSplash` displayed `F ||`, breathing bars (`transform: matrix(1, 0, 0, 1.14636, 0, 0)`), and `KelasKu untuk Guru` (`opacity: 1`, `font-size: 11.5px`, `rgba(253, 250, 243, 0.9)`); upon JS claim, `ctlStartOffset = 1920`, `adoptedRevealed = true`, zero particle restart, and clean `.is-leaving` handoff (`spDisplay: "flex"`, `spPointer: "none"`).
  - **Mobile Warm Reload**: Entered `.is-leaving` with `spDisplay: "flex"` and `spPointer: "none"` (`fzBooting: false`) fading cleanly into Home.
  - **Mobile Onboarding Step 1 Compact Mochi (`136x126`)**: Verified `408x378` backing buffer (`dprX: 3`), `MeshPhysicalMaterial` (`sheenColor: ffc4d6`), `faceMipmaps: true`, `faceMinFilter: 1008`, `anisotropy: 4`, steady software SwiftShader frame average `7.31 ms`, and visually inspected `mobile-ob-step1-hd.png`, `mobile-ob-mochi-hd-closeup.png`, and `mobile-home-mochi-closeup.png`.
  - **Build Alignment**: `node tools/bump-build.mjs --check` confirmed `m025-799` across all synced surfaces (`sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `index.html`, `coordination/BUILD-VERSION.json`).

## 3. Touched Release Files
- `style.css`, `index.html`, `features/brand/fiezel-splash.js`, `features/ui/mobile-edge-fit.css`, `app.js`
- `mochi-mascot/fiezel-mochi.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`
- `reports/th-ui-leak-report.json`
- `docs/handoffs/FIEZEL-M025799-SPLASH-MOCHI-HD-HANDOFF.md`

## 4. Next Steps & Post-Merge Verification Roadmap
1. Open Pull Request against `main` with `[ALLOW-PROTECTED: pwa]` and wait until all 10 mandatory checks (`quality`, `A6`, `A7`, `A9`, `A10`, `A11`, `A13`, `A14`, `Auto PR Review & Invariant Audit`, `MASTER-only authority`) finish 100% green.
2. Confirm no active `FIEZEL Deploy Site` workflow is running on `main`, merge cleanly, and watch `FIEZEL Deploy Site` complete.
3. Verify `https://fiezel.my.id/app/` serves build `m025-799` cleanly across mobile & desktop views and inspect live production captures.
