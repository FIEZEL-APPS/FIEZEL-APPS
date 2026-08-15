# FIEZEL m025 AI Handoff

Use this file before starting any new neural/Puter investigation.

## Baseline

Repo: `fitrajft-ux/FIEZEL-APPS`

Production baseline inspected: `708f3b4376b225b9fbe8f988d6c78844bb22f403` (`m024`)

App/cache version: `5.19.0`

Audit branch: `audit/m025-neural-puter-20260815`

Do not modify `main` until the proposed m025 candidate has behavioral tests.

## Facts already established

### Neural

- Model/assets can be fully prepared/cached while the runtime still reports `neural_tts_timeout`.
- m024 correctly moved initialization outside the neural timeout.
- m024 did **not** make the timeout generation-only: bootstrap still races the entire `local.speak()` promise.
- `local.speak()` includes `adapter.generate()`, audio start, and `await playback.done`.
- Therefore playback time currently consumes the neural timeout budget.
- The audibility patch writes to the same diagnostics key as bootstrap/core but truncates the combined list to 30 events, while the other writers retain 200.
- This can delete the exact m024 init/generate/playback events needed to identify the device stall.

Do not claim that the final device cause is definitely slow generation until m025 preserves the trace. The design defect is proven; the exact physical stall stage is not yet proven.

### Puter

- FIEZEL AI uses `puter.workers.exec()`.
- Current Puter.js authenticates automatically inside `workers.exec()` whenever `puter.authToken` is missing.
- On `crossOriginIsolated=false`, Puter sign-in relies on a cross-origin popup returning a validated `puter.token` message to the opener.
- FIEZEL m024 injects `Cross-Origin-Opener-Policy: same-origin` on the document.
- The target Apple PWA reports `crossOriginIsolated=false`.
- Under COOP `same-origin`, a cross-origin auxiliary context can appear closed to the opener. This is consistent with a popup that visibly completes login but fails to return/adopt the token in FIEZEL.
- The next AI request then sees an empty token and opens authentication again.

The first m025 candidate should use a WebKit popup-compatible opener policy (`same-origin-allow-popups`) while keeping the current `same-origin` isolation path for non-WebKit engines.

## Do not repeat these dead-end investigations first

Do not begin by:

- redownloading the 119 MB neural package;
- bumping `FIEZEL_VERSION` and invalidating the neural cache;
- changing model/voice assets;
- merging stale COI PR #6 or #7 wholesale;
- increasing the neural timeout again without separating playback;
- building a large new auth logging system before fixing the COOP/token-return transport;
- declaring success from Quality Gate alone.

Those actions do not address the currently proven defects.

## Required implementation order

1. Add/adjust behavioral tests so current m024 fails the new regressions.
2. Fix audibility diagnostics retention.
3. Move generation timeout into `fiezel-neural-voice.js` around `adapter.generate()` only.
4. Remove bootstrap's whole-`local.speak()` timeout race.
5. Add request correlation to neural stage diagnostics.
6. Add WebKit popup-compatible COOP policy in `sw.js`.
7. Add safe Puter auth state to Diagnostics; never expose token contents.
8. Bump `SW_REV` and `DIAG_BUILD`, keep app/cache version 5.19.0.
9. Run exact-head Quality Gate.
10. Validate one clean Puter login cycle and one clean neural test on the physical PWA, exporting diagnostics immediately after each.

## Files to read next

- `audit/m025/AUDIT-20260815.md`
- `audit/m025/M025-PATCH-SPEC.md`
- `audit/m025/M025-TEST-MATRIX.md`
- `sw.js`
- `features/neural-voice/fiezel-neural-voice-bootstrap.js`
- `features/neural-voice/fiezel-neural-voice.js`
- `features/neural-voice/fiezel-neural-voice-audibility-fix.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `.github/workflows/quality.yml`

## Exit criteria

Puter fixed:

- after one completed login, Diagnostics shows token presence/sign-in state true;
- a second AI call does not open login again.

Neural fixed:

- diagnostics survive long enough to show correlated `generate_*` and `playback_*` stages;
- playback longer than the generation timeout does not produce a generation timeout;
- a real generation stall reports `generate_timeout` / `neural_generation_timeout`;
- target PWA produces at least one audible neural success with `generate_ready -> playback_start -> playback_done`.

If these exit criteria are not met, do not rename another timeout value and call the issue solved.
