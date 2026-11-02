# FIEZEL m025-749 Handoff Dossier: Multi-Course Progress Parity & iOS PWA Update Cache Fix

## 1. Executive Summary
- **Build Version**: `m025-749`
- **Authority**: MASTER
- **Status**: READY FOR MERGE
- **Scope & Topics**:
  - Fix iOS WebKit Standalone PWA update stale cache lock (`sw.js`, `features/ui/fiezel-update-prompt.js`).
  - Multi-course data parity for Home Kemajuan widget and Progress (`kemajuan`) screen (`app.js`).
  - Mobile bottom navigation active pill (`#navActivePill`) z-index layering and retry geometry guard (`app.js`, `features/ui/fiezel-tactile-clay.css`).
  - Local audit server reverse proxying for neural voice studio (`tools/dev/serve-local-audit.mjs`).

---

## 2. Root Cause Analysis & Technical Solutions

### A. iOS WebKit Standalone PWA Update Stale Cache Lock
- **Problem**: When a new version is released, iOS Safari / WebKit Standalone PWA mode holds active documents in WebKit's in-memory page cache. A standard `window.location.reload()` often restored the old document from cache, failing to activate the new shell. In addition, `sw.js` handled navigation requests by serving the precached `SHELL_CACHE` even if the navigation URL carried cache-busting query parameters (`?fz_upd=...`).
- **Solution**:
  - `sw.js`: Added `try{await self.clients.claim()}catch{}` to the `activate` event so the new service worker immediately controls all clients. In the `fetch` navigation handler, detected update navigations (`requestUrl.searchParams.has('fz_upd') || requestUrl.searchParams.has('__fz_fresh')`) and enforced a network-first strategy (`responsePromise = segarkan.catch(() => cangkang()).then(c => c || halamanLuring())`).
  - `features/ui/fiezel-update-prompt.js`: Replaced unreliable `location.replace` with `window.location.href = targetUrl` with a 300ms fallback `reload()`, ensuring WebKit tears down its page cache and requests fresh HTML. Added post-update success toast notification (`"FIEZEL berhasil diperbarui ke build m025-749!"`).

### B. Multi-Course Home Kemajuan & Progress Parity
- **Problem**: The Home Kemajuan widget used `(rhythmPct || 67)` and `(rhythmShown || 4)`. When a learner switched to English (or a new course with 0 progress), JavaScript's truthy check evaluated `0 || 67` to `67%`, showing fake data or incorrect progress numbers.
- **Solution**:
  - `app.js`: Replaced `(rhythmPct || 67)` with `(Number(rhythmPct) || 0)`, and `(rhythmShown || 4)` with `(Number(rhythmShown) || 0)`.
  - Verified multi-course metrics computation for Japanese, English, and all supported courses.

### C. Bottom Navigation Active Pill Indicator
- **Problem**: On mobile viewports, the active sliding pill (`#navActivePill`) could disappear or be covered due to `.nav` elements lacking explicit positioning/z-index relative to `.bottomnav`, or when zero-width measurements occurred during DOM paint.
- **Solution**:
  - `features/ui/fiezel-tactile-clay.css`: Enforced `.bottomnav .nav { position: relative !important; z-index: 2 !important; }` and ensured `#navActivePill` sits at `z-index: 1`.
  - `app.js`: Added retry guard `requestAnimationFrame(() => syncNavActivePill(activeEl))` when `navRect.width === 0`.

---

## 3. Empirical Verification & Quality Gate Evidence
- `node tests/id-golden-snapshot-test.js`: **PASS** (baseline updated cleanly).
- `node tests/curriculum-cache-version-test.js`: **PASS** (33 assertions across all HTML entrypoints, version `m025-749`).
- `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail; 416 gates verified).
- `node tests/th-ui-leak-test.js`: **PASS** (zero leaks).
- Voice Call Studio E2E Probe (`tools/dev/probe-voice-call-e2e.mjs`): **PASS** (WebSocket token, personas, and TTS 200 OK).

---

## 4. Touched Files
- `app.js`
- `features/ui/fiezel-update-prompt.js`
- `features/ui/fiezel-tactile-clay.css`
- `sw.js`
- `core-config.js`
- `coordination/BUILD-VERSION.json`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `call.html`
- `features/voice-studio/call.html`
- `id-golden-baseline.json`
- `docs/handoffs/FIEZEL-M025749-MULTI-COURSE-PROGRESS-AND-IOS-PWA-CACHE-HANDOFF.md`

---

## 5. Next Steps & Roadmap
- Merge to `main` upon 100% green CI verification across all 10 gates.
- Monitor production CDN at `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` ensuring `m025-749` is live.
- Post-merge verification on mobile devices.
