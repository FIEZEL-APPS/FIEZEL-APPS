# FIEZEL m025 Behavioral Test Matrix

Baseline: `708f3b4376b225b9fbe8f988d6c78844bb22f403`

The purpose of this matrix is to prevent another green CI result that does not represent the physical-device failure.

| ID | Area | Setup | Action | PASS | FAIL signal |
|---|---|---|---|---|---|
| A-01 | Puter auth / WebKit | Service-worker harness with AppleWebKit UA | Serve a same-origin navigation | `COOP` is `same-origin-allow-popups` | `same-origin` on WebKit navigation |
| A-02 | Puter auth / non-WebKit | Chromium-like UA | Serve a same-origin navigation | `COOP` remains `same-origin` | popup-compatible policy applied globally and isolation path lost |
| A-03 | Puter SDK transport | Any UA | Fetch `https://js.puter.com/v2/` | SW does not call `respondWith` and does not synthesize body | cross-origin Puter request intercepted/reconstructed |
| A-04 | Auth diagnostics safety | Fake Puter with dummy token `SECRET_TOKEN_SHOULD_NOT_LEAK` | Open Diagnostics | booleans show auth present; serialized dump does not include dummy token | raw token appears anywhere in export |
| A-05 | Physical Puter login | m025 PWA, logged out initially | Ask AI, finish Puter login, ask AI again | second request does not open login and returns Core AI response | login popup repeats |
| A-06 | Physical auth persistence | Immediately after successful login | Export Diagnostics | `authTokenPresent=true`, `isSignedIn=true`, stored v2 token presence true | popup says success but token booleans remain false |
| N-01 | Generation timeout boundary | fake adapter generate=5ms; timeout=20ms; playback=80ms | `service.speak(... allowFallback:false)` | neural speak succeeds after playback; no generation timeout | service fails around 20ms because playback consumed timeout |
| N-02 | True generation stall | fake adapter generate never settles; timeout=20ms | `service.speak(... allowFallback:false)` | rejects `neural_generation_timeout` near configured limit | hangs indefinitely or returns ambiguous `neural_tts_timeout` |
| N-03 | Playback failure semantics | generate succeeds; playback throws explicit error | speak | playback/service error preserved | translated to generation timeout |
| N-04 | Diagnostics retention | seed 80 common neural events | trigger audibility diagnostic write | record count remains >=81 (bounded only at shared ~200 limit) | list is truncated to 30 |
| N-05 | Trace correlation | service emits one request | generate + playback | same `requestId` appears on generate/playback/error events | stages cannot be tied to one request |
| N-06 | Init timeout separation | backend initialize exceeds init caller timeout then eventually resolves | retry/observe late completion | no duplicate model session; late init can be adopted | second initialization starts while first still running |
| N-07 | Physical neural success | prepared m025 PWA | run exactly one neural test | trace contains `generate_start`, `generate_ready`, `playback_start`, `playback_done`; audible output | trace ends in fallback before stage can be identified |
| N-08 | Physical true generation timeout | only if device reproduces >limit generation | run one neural test and immediately export | explicit `generate_timeout` with elapsedMs/timeoutMs | generic timeout with no phase evidence |
| D-01 | Build identity | deployed m025 | open Diagnostics | `diagBuild=m025-1`, SW controller active, app remains 5.19.0 | old m024 panel or old SW still controlling |
| D-02 | Cache preservation | device already has 5.19.0 neural assets | deploy m025 JS/SW only | neural cache remains present; no forced 119MB redownload | version bump or activation deletes cache |
| Q-01 | Recursive syntax | repo checkout | quality Syntax step | all non-vendor production `.js/.mjs` checked | nested neural file can contain syntax error without Syntax job failing |
| Q-02 | Exact-head CI | candidate commit | run FIEZEL Quality Gate | all existing tests + new m025 behavioral tests pass | structural tests only or skipped new tests |

## Required new tests

### `puter-auth-coop-test.js`

Must exercise response headers, not only source strings.

Minimum assertions:

```text
WebKit navigation  -> same-origin-allow-popups
non-WebKit nav     -> same-origin
Puter cross-origin -> not intercepted
m025 SW_REV        -> present
```

### `neural-voice-generation-timeout-test.js`

Must use actual `createVoiceService()` with fake adapter/player. No source-string-only substitute is acceptable.

Case 1 must deliberately make playback longer than the generation timeout. This is the regression that m024 currently misses.

### `neural-voice-diagnostics-retention-test.js`

Must pre-seed more than 30 events before loading the audibility patch. A test starting from an empty diagnostics list cannot detect the truncation bug.

### `diag-panel-test.js` extension

Must use a sentinel token and assert it is absent from the exported JSON.

## Physical-device evidence packet

Every m025 device report should contain, in this order:

1. `diagBuild`
2. `appVersion`
3. `capturedAt`
4. `userAgent`
5. `standalone`
6. `crossOriginIsolated`
7. `puterAuth` safe snapshot
8. `runtimeStatus`
9. `swController`
10. `runtimeDiagnostics`
11. cache inventory summary
12. storage estimate

Do not ask the owner to repeatedly trigger the failing action before exporting diagnostics. One clean reproduction followed immediately by export is more useful than many attempts that overwrite the trace.

## Promotion decision

m025 is **not promotable** if either Puter or neural passes only in CI but has no physical-device evidence.

m025 is **promotable for Puter only** if A-05/A-06 pass but neural remains unresolved. Keep the auth fix separable from neural commits.

m025 is **promotable as full repair candidate** only after A-05/A-06 and N-07 pass on the target PWA.
