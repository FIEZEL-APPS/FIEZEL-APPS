# FIEZEL m025-800 Handoff Dossier: Restore Full Splash Sparkle Particle Convergence

- **Status**: COMPLETE — Verified locally via Chromium Playwright sparkle frame sequence captures (`mobile` & `desktop`), unit suites, release audit, and Guardian gates; ready for PR merge & immediate deployment (`m025-800`).
- **Authority**: MASTER / OWNER urgent directive (`animasi sparkle splashnya itu kenapa jadi hilang`) restoring full particle convergence immediately after `m025-799`.

## 1. Root Cause & Fix Summary
1. **Why Sparkles Disappeared in `m025-799`**:
   - `m025-799` introduced a `220ms` CSS static SVG `F ||` fallback in `#fiezelBootCritical` alongside `resumeOffset = bootElapsed >= 220 ? Math.max(1320, ...) : 0` in `features/brand/fiezel-splash.js`.
   - Because browser script/JSON hydration almost always exceeds `220ms`, `ctl.startOffset` jumped past `particles.T.DONE` (`1320ms`), setting `skipBuild: true` and skipping all galaxy sparkle particles (`particlesN = 0`).
2. **Fixes Applied in `m025-800`**:
   - **`features/brand/fiezel-splash.js`**: Removed the `bootElapsed >= 220` timeline jump (`resumeOffset` / `postRevealFloor`) so cold motion launches always start cleanly at `startOffset: 0` with `skipBuild: false`, running the full 0–1320ms golden/cream sparkle convergence, equalizer bars, synced footer reveal, and paw stamp finale.
   - **`index.html` & `style.css`**: Removed the `#fiezelBootSplash` `220ms` static SVG `F ||` / `@keyframes fz-boot-bar-breathe` fallback so Frame 0 stays clean dark contours prior to the sparkle galaxy swirl.
   - **Retained from `m025-799`**: Synced high-contrast `KelasKu untuk Guru` footer reveal (`.is-word-shown`, `11.5px`, `rgba(253,250,243,.90)`, no blur), smooth `.is-leaving` `0.32s` fade-out transition (`mobile-edge-fit.css`, `app.js`), and HD Retina 3D Mochi (`mochi-mascot/fiezel-mochi.js`).

## 2. Empirical Verification (Observed Before PR)
- Playwright Chromium verification on `m025-800` before bump:
  - **Mobile (`390x844` DPR 3)**: `ctlStartOffset = 0`, `adoptedRevealed = false`, `maxParticlesN = 514`, `hadStaticLogoBeforeClaim = false`, `sawPaw = true`, `footerSyncSample` (`kwOpacity = 0.96876`, `ktOpacity = 0.902836`), visually inspected `mobile-01-scatter.png`, `mobile-02-converge.png`, `mobile-03-footer.png`, `mobile-04-paw.png`.
  - **Desktop (`1440x900` DPR 1)**: `ctlStartOffset = 0`, `adoptedRevealed = false`, `maxParticlesN = 1721`, `hadStaticLogoBeforeClaim = false`, `sawPaw = true`, `footerSyncSample` (`kwOpacity = 0.968742`, `ktOpacity = 0.902777`), visually inspected `desktop-01-scatter.png` .. `desktop-04-paw.png`.

## 3. Touched Files (`m025-800`)
- `features/brand/fiezel-splash.js`, `index.html`, `style.css`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`
- `docs/handoffs/FIEZEL-M025800-SPLASH-SPARKLE-RESTORE-HANDOFF.md`

## 4. Next Steps & Post-Merge Verification Roadmap
1. Open PR against `main` with `[ALLOW-PROTECTED: pwa]`, wait for all required CI checks to turn 100% green, merge sequentially, and watch `FIEZEL Deploy Site` complete.
2. Verify `https://fiezel.my.id/app/` serves `m025-800` cleanly with live Chromium Playwright confirming `ctlStartOffset === 0` and `particlesN >= 480` on cold load plus HD Mochi clarity.
