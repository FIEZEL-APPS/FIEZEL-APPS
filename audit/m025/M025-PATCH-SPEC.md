# FIEZEL m025 Minimal Patch Specification

Baseline: `708f3b4376b225b9fbe8f988d6c78844bb22f403`

Purpose: fix the Puter re-login loop and correct neural timeout/diagnostic semantics without invalidating the 5.19.0 neural cache.

This file is a proposal. Production files are intentionally not modified by the audit branch yet.

## 1. `sw.js`

### Goal

Preserve Puter popup authentication on WebKit while retaining current cross-origin-isolation behavior on non-WebKit engines.

### Required change

Add a WebKit-aware document opener policy.

Proposed logic:

```js
const ua=String(self.navigator?.userAgent||'');
const WEBKIT_POPUP_COMPAT=/AppleWebKit/i.test(ua);
const openerPolicy=WEBKIT_POPUP_COMPAT?'same-origin-allow-popups':'same-origin';
const COOP_COEP_HEADERS={
  'Cross-Origin-Opener-Policy':openerPolicy,
  'Cross-Origin-Embedder-Policy':'credentialless'
};
```

The important contract is:

- Apple/WebKit document response -> `COOP: same-origin-allow-popups`
- non-WebKit document response -> keep `COOP: same-origin`
- keep third-party Puter SDK/API requests outside the service-worker interception path
- keep `COEP: credentialless` for the current non-WebKit isolation path

### Why

The affected Apple PWA reports `crossOriginIsolated=false`; Puter therefore uses popup + `postMessage` token return. COOP `same-origin` can make the cross-origin popup appear closed to the opener. `same-origin-allow-popups` is the compatible opener policy for this auth mode.

### Version/cache rule

Bump only `SW_REV`, for example:

```js
const SW_REV='m025-neural-puter-observability-20260815-1';
```

Do **not** bump `FIEZEL_VERSION`; m025 should preserve cache `fiezel-v5.19.0`.

## 2. `features/neural-voice/fiezel-diag-panel.js`

### Goal

Verify Puter authentication state and m025 deployment without exposing credentials.

### Required change

Set:

```js
var DIAG_BUILD = 'm025-1';
```

Add an auth snapshot to `collectSync()`:

```js
puterAuth: safe(function(){
  var p=root.puter;
  return {
    loaded:!!p,
    workersLoaded:!!(p&&p.workers),
    env:p&&p.env||null,
    authTokenPresent:!!(p&&p.authToken),
    isSignedIn:!!(p&&p.auth&&p.auth.isSignedIn&&p.auth.isSignedIn()),
    storedTokenV2Present:!!root.localStorage.getItem('puter.auth.token.v2'),
    storedTokenOrigin:root.localStorage.getItem('puter.auth.token.origin.v2'),
    apiOrigin:p&&p.APIOrigin||null,
    defaultGuiOrigin:p&&p.defaultGUIOrigin||null
  };
}, null),
```

Rules:

- boolean presence only for token values;
- never export `puter.authToken` contents;
- never export `puter.auth.token.v2` contents.

### Existing test update

Extend `diag-panel-test.js` with a fake Puter object and assert:

- `authTokenPresent === true` when a dummy token exists;
- `storedTokenV2Present === true` when localStorage key exists;
- serialized diagnostics do **not** contain the dummy token text.

## 3. `features/neural-voice/fiezel-neural-voice-audibility-fix.js`

### Goal

Stop destroying stage-level diagnostics.

### Required change

Replace the local retention behavior:

```js
list.slice(-30)
```

with a shared/full retention target:

```js
const DIAG_LIMIT=200;
...
list.slice(-DIAG_LIMIT)
```

No other audibility behavior should change in the first m025 candidate.

## 4. `features/neural-voice/fiezel-neural-voice.js`

### Goal

Make the timeout truly generation-only.

### Required change

Read one service-level timeout from create options:

```js
const generationTimeoutMs=Math.max(0,Number(options.generationTimeoutMs)||0);
```

Add a helper which races **only** `adapter.generate()`:

```js
async function generateWithTimeout(chunk,voice,speed,requestId){
  const startedAt=Date.now();
  const generation=adapter.generate(chunk,{voice,speed});
  if(!generationTimeoutMs)return generation;

  const timedOut=Symbol('neural-generation-timeout');
  let timer=null;
  const timeout=new Promise(resolve=>{
    timer=setTimeout(()=>resolve(timedOut),generationTimeoutMs);
  });
  const result=await Promise.race([generation,timeout]);
  if(timer)clearTimeout(timer);
  if(result===timedOut){
    diag({
      phase:'generate_timeout',requestId,voice,
      elapsedMs:Date.now()-startedAt,
      timeoutMs:generationTimeoutMs
    });
    throw new Error('neural_generation_timeout');
  }
  return result;
}
```

Use it instead of the direct generate call:

```js
const audio=await generateWithTimeout(
  chunk,voice,speakOptions.speed||1,requestId
);
```

### Add trace correlation

Inside `createVoiceService`:

```js
let requestSeq=0;
```

At `speak()` start:

```js
const requestId=++requestSeq;
```

Attach `requestId` to:

- `generate_start`
- `generate_ready`
- `generate_timeout`
- `playback_start`
- `playback_done`
- `voice_service_error`

This is intentionally local to neural diagnostics and does not require a new schema/key.

### Playback contract

`await playback.done` remains unchanged and has **no generation timeout** around it.

If playback fails, report the actual playback/service error. Do not translate it into `neural_tts_timeout`.

## 5. `features/neural-voice/fiezel-neural-voice-bootstrap.js`

### Goal

Remove the whole-speak timeout and delegate generation timeout to the voice service.

### Required change at service creation

```js
service=root.FiezelNeuralVoice.createVoiceService({
  config:root.FiezelNeuralVoiceConfig,
  adapter,
  env:root,
  playAudio:player.play,
  generationTimeoutMs:NEURAL_TTS_TIMEOUT_MS
});
```

### Required change in `speak()`

Keep initialization separate exactly as m024 already does.

Remove the outer block based on:

```js
const timeout=Symbol('fiezel-tts-timeout');
Promise.race([neural(),delay(NEURAL_TTS_TIMEOUT_MS)...])
```

Replace with a normal await:

```js
const neuralStartedAt=Date.now();
diag({
  phase:'speak_neural_start',
  voice:String(voice),
  generationTimeoutMs:NEURAL_TTS_TIMEOUT_MS
});
try{
  const result=await local.speak(text,{
    voice,
    speed:options.speed||options.rate||1,
    lang:options.lang||'en-US',
    allowFallback:false
  });
  circuitOpen=false;
  audibleVerified=true;
  lastError='';
  lastFallbackReason='';
  phase='ready';
  diag({
    phase:'speak_neural_success',
    provider:String(result?.provider||'neural'),
    voice:String(result?.voice||voice||''),
    elapsedMs:Date.now()-neuralStartedAt
  });
  return result;
}catch(error){
  lastError=errorText(error);
  lastFallbackReason=lastError;
  const shouldOpenCircuit=!!service;
  circuitOpen=shouldOpenCircuit;
  audibleVerified=false;
  if(circuitOpen)phase='error';
  diag({
    phase:'speak_fallback',
    reason:lastError,
    circuitOpen:shouldOpenCircuit,
    elapsedMs:Date.now()-neuralStartedAt,
    voice:String(voice)
  });
  try{service?.stop?.()}catch{}
  return fallbackOrThrow(error);
}
```

### Compatibility note

The public status field `timeoutMs` may remain for UI compatibility, but its documented meaning must become "generation timeout" rather than "whole speak timeout". If preserving semantics is important, add `generationTimeoutMs` alongside it and deprecate `timeoutMs` later.

## 6. Tests

Add these behavioral regressions.

### `neural-voice-generation-timeout-test.js`

Must prove both:

1. adapter generation resolves before timeout, playback takes longer than timeout -> neural `speak()` still succeeds;
2. adapter generation never resolves -> reject/fallback with `neural_generation_timeout` within the configured generation deadline.

This is the test m024 is missing.

### `neural-voice-diagnostics-retention-test.js`

Seed at least 80 existing records in `fiezel-neural-voice-diagnostics-v1`, load the audibility patch, trigger a diagnostic write, and assert the result remains >80 records rather than falling to 30.

### `puter-auth-coop-test.js`

Use a service-worker VM harness similar to `sw-corp-test.js`.

Assert:

- WebKit UA + same-origin navigation -> response header `Cross-Origin-Opener-Policy` equals `same-origin-allow-popups`;
- non-WebKit UA + same-origin navigation -> `same-origin`;
- cross-origin `https://js.puter.com/v2/` is still not intercepted/reconstructed;
- SW revision contains m025 marker.

### Update `diag-panel-test.js`

Assert safe Puter auth snapshot and token redaction.

### Update `neural-voice-timeout-phase-test.js`

Stop treating mere source ordering as sufficient. It may keep structural assertions, but it must additionally assert there is no outer `Promise.race([neural()` wrapping `local.speak()`.

## 7. `.github/workflows/quality.yml`

Add:

```sh
node neural-voice-generation-timeout-test.js
node neural-voice-diagnostics-retention-test.js
node puter-auth-coop-test.js
```

Also make syntax checking recursive for production JS/MJS, excluding vendored/generated dependencies if needed. Example direction:

```sh
find . -type f \( -name '*.js' -o -name '*.mjs' \) \
  -not -path './node_modules/*' \
  -not -path './vendor/*' \
  -print0 | xargs -0 -n1 node --check
```

## 8. Files explicitly unchanged in first candidate

- `version.js`
- `VERSION.json`
- `NEURAL-VOICE-SOURCE-LOCK.json`
- `vendor/kokoro-*`
- `features/neural-voice/fiezel-kokoro-adapter.js`
- model/voice assets

Reason: m025 is a control-flow/auth/diagnostics repair, not a model or cache migration.

## 9. Device validation sequence

After exact-head CI passes and m025 is deployed:

1. Fully close PWA.
2. Reopen and confirm Diagnostics says `m025-1`.
3. Ask AI once; complete Puter login if requested.
4. Immediately open Diagnostics and record `puterAuth` booleans/origins.
5. Ask AI a second time. Passing condition: no new login popup and Core AI returns a response.
6. Open Skills Lab, run exactly one neural test.
7. Immediately export diagnostics before repeatedly triggering browser TTS.
8. Inspect one correlated neural request for `generate_start` -> `generate_ready` -> `playback_start` -> `playback_done`.
9. If generation times out, require `generate_timeout` / `neural_generation_timeout`; do not accept ambiguous `neural_tts_timeout` as final evidence.

## 10. Rollback boundaries

If Puter auth works but neural regresses, revert only neural control-flow commits; retain the WebKit COOP/auth fix.

If neural works but Puter popup behavior regresses on another engine, keep the generation/diagnostics changes and revert/refine only the service-worker opener-policy branch.

This separation is deliberate so m025 does not become another all-or-nothing hotfix.
