# FIEZEL M025-808 — Cross-Device Account Cloud Sync & Multi-Device State Preservation Handoff

- **Status**: READY FOR MERGE & PRODUCTION VERIFICATION (All local tests + 2-device Chromium E2E + guardians passed)
- **Authority**: MASTER / OWNER Approved Directive (Persistent Cross-Device Account Progress & GEM Preservation)
- **Build**: `m025-808`

## 1. Root-Cause Audit Summary
When a learner logged in on a new device (via Google OAuth or FIEZEL account handle/password) or switched accounts on a shared device, account progress, GEMs, courses, and Braincore state could be lost or misattributed due to six interacting gaps:
1. **No full multi-language account cloud snapshot endpoint/table**: `/api/brain/attempts` only stored allowlisted attempt telemetry, while GEMs (`state.gems`), `userName`, `level`, `streak`, `placementDone`, `learningDays`, `dailyRewards`, `prasasti`, multi-course buckets (`en`, `ja`, `zh`), and Braincore side-states (`bkt`, `misconceptionLedger`, `itemCalibration`, `confusionMatrix`, `olmNegotiation`, `srlCoach`, `slState`, `retentionProbe`, `fsrs6Shadow`) had no server persistence keyed by `sub`.
2. **Consent & `brainSync` reset across reloads/new devices**: `sanitizeState()` initialized `brainSync: rawPreferences.brainSync === true`, while `ensureAccountCloudSyncOnSession()` checked `state?.preferences?.brainSync !== false` and `progressSyncGiveConsent()` deleted `prefs.brainSync`, causing `brainSync` to fall back to `false` on every `loadState()` and preventing automatic sync on new devices while still needing fail-closed defaults before sign-in/opt-out.
3. **Synchronous login handlers rendered empty defaults and invented fake GEMs before pull**: `showAuthGate`, `openFiezelAuthModal`, and `accountSubmit` opened the app before waiting for server pull, risked minting a duplicate `+5` daily login bonus while initial pull was inflight, or initialized `{ balance: 120 }` without `schema: 'fiezel-gems-v1'` (which `sanitizeGems` wiped to `0`).
4. **Cross-course `_integrity` hash corruption**: `saveFlushWrite()` copied `state._integrity` onto the base `en` blob when saving `ja`/`zh` and `loadState()` inherited `en`'s `_integrity` when loading `ja`/`zh`, tripping tamper downgrades on `level`.
5. **Cross-account local leakage on shared devices**: `findBestStoredStudentState()` scanned all `localStorage` keys including other users' `fiezel-v5-state:*` and unclaimed `SAFETY_SNAPSHOT_KEY`, and `deactivateAccountState()` left `fz_last_account` and `SAFETY_SNAPSHOT_KEY` (`en`/`ja`/`zh`) behind.
6. **Async logout vs `accountBootRefresh` race**: An in-flight boot `/api/account/me` refresh resolving right after `deactivateAccountState()` could see `!activeAccountUuid` and re-activate the logged-out handle.

## 2. Summary of Changes
- **Server / D1 (`workers/api/`)**:
  - `workers/api/legacy-schema.js` & `workers/api/migrations/0014_legacy_puter.sql`: Added `account_cloud_state (sub PRIMARY KEY, snapshot_json, revision, updated_at)`.
  - `workers/api/schema.js`: Set `'/api/brain/state': 1048576` byte limit.
  - `workers/api/route-legacy.js`: Implemented `GET /api/brain/state` and `POST /api/brain/state` (requiring `ctx.identity?.sub && ctx.identity?.verified`), monotonic `mergeAccountCloudSnapshots` / `mergeCloudGems` (240-entry ledger union + `spentTotal` + `sharedCount === 0` strictly-newer/legacy deltas), multi-language sanitize/merge including `confidenceHistory` (100), `sessionHistory` (40), `retentionProbe`, and `fsrs6Shadow` (80), and cloud-state cleanup in `POST /api/brain/attempts/delete`.
- **Client Runtime (`app.js`)**:
  - Added full snapshot builder (`buildAccountCloudSnapshot` with 850 KB size clamp), client merge (`mergeAccountCloudSnapshotsClient`), hydration (`applyAccountCloudSnapshot` recomputing `_integrity` and preserving active `brainSync`), pull/push orchestration (`accountCloudStateSync`, `awaitAccountCloudSyncReady`, `pushPendingCloudStateOnHide` on `visibilitychange === 'hidden'` and `pagehide` with `< 60 KB` `keepalive` guard).
  - Fixed fail-closed-yet-persistent `brainSync: true` + `brainSyncOptOut` tracking in `ensureAccountCloudSyncOnSession`, `progressSyncGiveConsent`, `progressSyncSetOn`, `progressSyncDeleteServer`, and `setBrainSyncPreference`.
  - Scoped `findBestStoredStudentState(targetUuid)` to strictly reject other accounts' data, cleared timers/`fz_last_account`/`SAFETY_SNAPSHOT_KEY` in `deactivateAccountState()`, and added `accountSessionEpoch` to block stale `accountBootRefresh` / async sync callbacks across logout/switch.
  - Fixed `_integrity` handling across `en`/`ja`/`zh` in `loadState()` and `saveFlushWrite()`.
  - Deferred `checkDailyGemRewards()` login bonus while initial cloud pull is active, awaited `awaitAccountCloudSyncReady(2000)` on `showAuthGate`, `openFiezelAuthModal`, and `accountSubmit` (without inventing fake `{ balance: 120 }` gems), and cleared cloud snapshot on `resetProgress()`.
- **Local Dev Server & Build Alignment**:
  - Added `/api/brain/state` GET/POST dev handler in `server.js`.
  - Updated `id-golden-baseline.json` (comment/lexer offset span shift only; zero student copy modified) and bumped build to `m025-808` via `node tools/bump-build.mjs`.
- **Verification Coverage**:
  - `tests/account-cloud-sync-test.js` (registered in `.github/workflows/quality.yml`).
  - `tools/dev/account-cloud-sync-probe.mjs` (Headless Chromium Playwright 2-device `?fz_real_auth=1` + SQLite D1 migrations `0001..0020` E2E).

## 3. Files Touched
- `app.js`
- `workers/api/legacy-schema.js`
- `workers/api/migrations/0014_legacy_puter.sql`
- `workers/api/route-legacy.js`
- `workers/api/schema.js`
- `server.js`
- `tests/account-cloud-sync-test.js`
- `tools/dev/account-cloud-sync-probe.mjs`
- `.github/workflows/quality.yml`
- `id-golden-baseline.json`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html` (via `bump-build.mjs`)
- `docs/handoffs/FIEZEL-M025808-ACCOUNT-CLOUD-SYNC-HANDOFF.md`

## 4. Next Steps / Roadmap & Verification
- Verify CI (`FIEZEL Quality Gate` + all guardian checks) passes 100% green before merge to `main`.
- Trigger/monitor `FIEZEL API Worker Deploy` (`deploy-api-worker.yml`) and `FIEZEL Deploy Site` (`deploy-site.yml`) after merge, then probe live `https://api.fiezel.my.id/api/brain/state` and `https://fiezel.my.id/app/` (`m025-808`).
- `ensureLegacySchema(ctx.env.CORE_DB)` automatically creates `account_cloud_state` on first cold Worker request, matching `migrations/0014_legacy_puter.sql`.
