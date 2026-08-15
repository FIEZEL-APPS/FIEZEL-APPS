# M025 Implementation Status

Date: 2026-08-15
Branch: `agent/m025-neural-puter`
Base: `main@708f3b4376b225b9fbe8f988d6c78844bb22f403`
App/cache version: **5.19.0 unchanged**

## Implemented

### Neural voice

- The neural speech timeout now applies only to `adapter.generate()`.
- Playback and `playback.done` are no longer raced against the generation timeout.
- Bootstrap passes `generationTimeoutMs` into the voice service and no longer wraps the complete `local.speak()` call in a timeout race.
- Generation timeout is explicit as `neural_generation_timeout` with a `generate_timeout` diagnostic event.
- Generation/playback diagnostics now carry a per-request `requestId` and `chunkIndex`.
- Existing initialization timeout remains separate and keeps the single backend initialization promise behavior.
- The audibility patch now retains the same 200-entry shared diagnostic history as the other neural writers instead of truncating it to 30.

### Puter authentication / PWA

- WebKit navigation responses receive `Cross-Origin-Opener-Policy: same-origin-allow-popups` so the Puter popup/postMessage authentication path can retain its opener relationship.
- Chromium-family navigation responses keep `Cross-Origin-Opener-Policy: same-origin`.
- `Cross-Origin-Embedder-Policy: credentialless` is retained.
- Third-party Puter SDK/API requests remain outside the service-worker response pipeline.
- Diagnostics build is `m025-1` and exports only safe Puter auth state: token presence booleans and non-secret origins. Token values are never exported.

### Permanent regressions

Added:

- `neural-voice-generation-timeout-test.js`
- `neural-voice-diagnostics-retention-test.js`
- `puter-auth-coop-test.js`
- `puter-auth-diagnostics-test.js`

Updated the existing m024 timeout/device/SW/product gates to assert the m025 contract. `quality.yml` now runs the new regressions and recursively syntax-checks project JS/MJS while excluding `node_modules` and vendored code.

## Deliberately unchanged

- `version.js` remains `5.19.0`.
- `VERSION.json` remains `5.19.0`.
- Neural model, voices, vendor Kokoro/ONNX bundle, and source lock are unchanged.
- No explicit app-side Puter sign-in loop was added.
- No second/single-thread WASM binary was added.

## Promotion gates

CI is necessary but not sufficient. Do not declare production success until the target standalone Apple PWA passes both physical-device gates:

1. Puter: authenticate once, make an AI request, then make a second AI request without another login popup.
2. Neural: run the neural-only voice test and hear audio; immediately export Diagnostics. Expected trace for a successful request includes `generate_ready -> playback_start -> playback_done` with the same `requestId`.

Expected diagnostics after deployment: `diagBuild: m025-1`. The auth snapshot should show token-presence state but must contain no token value.

## Rollback boundaries

- Puter compatibility can be rolled back independently in `sw.js`.
- Neural timeout/trace changes are isolated to the neural core/bootstrap/audibility files.
- App version/cache key must not be bumped merely to roll back this patch.
