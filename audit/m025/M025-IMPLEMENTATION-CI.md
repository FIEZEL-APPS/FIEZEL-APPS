# M025 Implementation + CI Evidence

Date: 2026-08-15
Audit branch: `audit/m025-neural-puter-20260815`
Implementation branch: `agent/m025-neural-puter`
Draft PR: #11 `Fix m025 neural generation timeout and Puter PWA auth`
Base production commit: `708f3b4376b225b9fbe8f988d6c78844bb22f403`
Final candidate commit: `2e9336b6558b0226dcabc3a0138c791a11bc6acc`
App/cache version: **5.19.0 unchanged**

## Final CI result

The final candidate passed both exact-head Quality Gate executions:

- Push run `31876572653`, job `94993089849`: **SUCCESS**
  - recursive project JS/MJS syntax: PASS
  - full Core validation: PASS
- Pull-request run `31876576107`, job `94993097644`: **SUCCESS**
  - recursive project JS/MJS syntax: PASS
  - full Core validation: PASS

The successful push log explicitly executed and passed the new m025 regressions:

- `FIEZEL neural generation timeout regression: PASS`
- `FIEZEL neural diagnostics retention regression: PASS`
- `FIEZEL Puter auth/COOP regression: PASS`
- `FIEZEL Puter auth diagnostics secrecy regression: PASS`

Existing neural gates also remained green, including the 39/0 neural suite, iOS WASM regression, iOS CacheStorage compatibility, neural HTTP, audibility, SW policy, product-repair, device-hotfix, and timeout-phase gates.

## First candidate CI failure and disposition

The earlier candidate head `725f1d1ed9fe98e83b771a559935f72e76bd3665` failed Quality Gate in `neural-voice-fix-test.js` after all preceding neural functional tests had passed.

The two failing checks were stale source-string assertions from m024:

1. an exact formatting assumption for `lastFallbackReason` inside `status()`;
2. an assumption that bootstrap itself still owned the speech timeout path.

They did **not** represent a runtime failure. The test was updated to verify the m025 contract instead:

- `lastFallbackReason` remains declared, surfaced, and set in neural failures;
- `neural_generation_timeout` and `generate_timeout` are owned by the neural voice service around `adapter.generate()`;
- bootstrap routes that service error into the existing circuit/fallback path without reinstating a whole-speech timeout.

The final exact-head runs then passed.

## Final candidate scope relative to m024 main

The implementation branch is ahead of base by 16 commits and changes 16 files. Scope is limited to:

- neural core/bootstrap/audibility diagnostics;
- diagnostics panel safe Puter auth snapshot;
- service-worker COOP/COEP handling;
- Quality Gate;
- existing neural/SW compatibility tests;
- four new m025 regression tests;
- implementation status documentation.

No `version.js`, `VERSION.json`, Kokoro/ONNX vendor files, model, voice binaries, or source lock changes are part of the candidate.

## Remaining production boundary

PR #11 remains **draft, open, mergeable, and unmerged**. CI proves repository-level behavior only. It does not prove the two physical Apple standalone PWA outcomes.

Do not declare m025 production-success until, after an authorized merge/deploy, the target device passes:

1. **Puter auth:** complete one login, perform an AI request, then perform a second AI request without another login popup.
2. **Neural voice:** run the neural-only voice test and hear audio. Export Diagnostics immediately and confirm `diagBuild: m025-1` plus a correlated `generate_ready -> playback_start -> playback_done` sequence using the same `requestId`.

If Puter still loops, use the safe `puterAuth` snapshot to distinguish token return/adoption from worker/auth failures. If neural still fails, use the preserved 200-entry trace and request correlation to identify whether the remaining device problem is generation or playback. Do not restart diagnosis from model download unless the cache evidence actually changes.

## Known non-blocking CI warning

GitHub Actions reports that `actions/checkout@v4`, `actions/setup-node@v4`, and `actions/setup-python@v5` target deprecated Node.js 20 action runtimes and are currently forced to Node.js 24 by the runner. This warning did not fail m025 and is not the neural/Puter root cause; action-major upgrades should be handled separately from this production repair.
