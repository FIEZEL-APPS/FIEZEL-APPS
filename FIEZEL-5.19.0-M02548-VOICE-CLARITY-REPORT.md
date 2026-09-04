# m025-48 — Neural Voice: the crackle, the delay, and a delivery that had never run

**Scope**: OWNER report — suara neural masih *cracking*, masih *delayed*, dan intonasi/ritme
bahasa Indonesia terdengar datar, bukan seperti manusia.

**Status**: machine-verified. 35 new assertions in `neural-voice-m02548-clarity-test.js`,
the full quality gate green (59 suites), device gate PENDING as always.

---

## 0. The finding that reframes the rest

`fiezel-sherpa-vits-adapter.js` resolved its prosody module like this:

```js
var prosody = opts.prosody || (typeof root !== 'undefined' && root && root.FiezelProsody) || null;
```

`root` is a parameter of the UMD **wrapper**. This factory is written as an *argument* to
that wrapper, so its scope chain skips the wrapper's parameters entirely — `root` was a
free global that nothing defines. `typeof` then swallowed the ReferenceError, and the
expression evaluated to `null`. No caller in the tree passed `opts.prosody`.

So `FiezelProsody.punctuate()` — the clause commas, the terminal mark, the entire reason
an Indonesian line gets any intonation at all — **has never executed on a device**. Every
prosody milestone since m025-37 shipped dead code. The test suites all passed because each
one injects the module explicitly.

Both engines now pass `prosody` outright, and the adapter's fallback reads `env`, which is
the real global object it is already given.

---

## 1. Crackle

| Cause | Mechanism | Fix |
|---|---|---|
| Main-thread starvation | `diag()` did `JSON.parse` → push → `JSON.stringify` → `localStorage.setItem` on a ~25 KB array, 12–20 times per utterance, and the burst lands *while a buffer is rendering* (the next sentence is generated during the current one by design). `localStorage` on iOS is a synchronous SQLite write. A stalled main thread starves the audio callback; a starved callback is a dropout. | New `fiezel-voice-diagnostics.js`: in-memory ring, and the player brackets every scheduled line with a critical window during which records only accumulate. Retention, key and entry shape unchanged; a flush re-reads storage first so the modules that still write directly are never clobbered. |
| Shallowest possible render buffer | The `AudioContext` was constructed with no options, i.e. `latencyHint: 'interactive'` — the smallest buffer the platform offers. There is no live input here to stay in sync with. | `latencyHint: 'playback'`. Costs ~200 ms of output latency, buys a buffer deep enough that a hiccup is no longer a dropout. |
| Rate conversion nobody asked for | The engine renders at 44.1 kHz; the context opened at whatever the device defaulted to, so every buffer went through a resampler. | The context now requests `sampleRate: 44100`. Constructor throws are caught and retried without options, so a device that refuses still gets audio. |
| int8 vocoder artefacts | `guardClipping` only ever reacted to a peak strictly above 1.0 — a blown buffer and nothing else. | `conditionSamples()` additionally repairs a sustained DC offset, interpolates isolated one-sample impulses (a single bad sample is a full-band transient and survives every fade), and restores headroom below 0.97 by one linear scale. **Audio with none of these is returned by identity** — a clean render is never copied, rescaled or dulled. |

The impulse detector is the part worth reading: "far from its neighbours" alone is not
enough, because at 6 kHz a full-amplitude waveform turns around in seven samples and the
sample at its own peak is legitimately far from the line between the two beside it. A click
is separated by standing far above *its own neighbourhood* and by being the peak of that
disturbance rather than one of the two samples it drags with it. Both properties are
asserted, including the negative case.

## 2. Delay

**Time-to-first-word.** `splitIntoChunks` packs up to 140 words into one chunk, and a chunk
is generated in full before a single sample plays. At the measured realtime factor of 0.25
that is ~12 seconds of silence before a long line starts. Opt-in `planStream` now emits one
**sentence** per chunk: sentence one starts as soon as it is rendered, the rest are rendered
while it plays. `splitIntoChunks` itself is untouched — the Apple slice policy and the fixed
device-probe evidence are defined in terms of it.

**The seam between sentences.** Previously each line waited for `onended`, then went back
through generate → start. The player now schedules a joined line at an exact context time —
previous end plus the pause prosody asked for — with the engine's own lead-in and tail-out
trimmed, so the gap is the only silence there. At most two lines sit in the schedule at
once, so a fast engine cannot buffer a whole chapter of PCM.

**Cold start.** `app.js` released the engine the instant the tab hid: a 143 MB model, its
worker and the shared `AudioContext`, torn down because the learner glanced at a
notification. The next tap paid the whole re-initialisation. The teardown is now deferred
90 s and cancelled by coming back; stopping is still immediate, because a hidden tab must
not keep talking. A prepared-but-uninitialised engine is also built during idle time,
through a new `prewarm()` rather than `ensureReady()`: `initialize()` latches failure state
that `speak()` reads, so a speculative attempt that fails restores exactly the state it
found — a background warm-up must never be able to send the learner's own first tap to
browser TTS. It also warms no audio gesture, because it runs outside one.

## 3. Intonation, rhythm, emotion (Indonesian)

- **Questions rise.** Every unmarked line used to get a full stop, so `Gimana kabarmu`
  was delivered as a flat declarative. Indonesian marks questions by opening word
  (`apa`, `kenapa`, `gimana`, `berapa`, …) or by tag (`kan`, `nggak`, `bukan`), and both
  are now detected. `boleh` and `mau` are deliberately absent — they open statements as
  often as questions, and a wrongly rising statement is worse than a flat question.
- **Praise lifts.** A short interjection-led line (`Wih keren banget`) takes `!`.
- **Greetings breathe.** `Halo Jahran` → `Halo, Jahran` — without the comma that is one
  four-syllable word to the duration predictor.
- **Softeners get their beat.** `Kita mulai sekarang ya` → `…sekarang, ya.`
- **Silence at punctuation.** The generation config has always carried `silence_scale`, and
  this adapter never set one — so every render used the vendored glue's fallback of **0.2**,
  spending each inserted comma at a fifth of its length. That is the mechanism behind
  "kata-katanya nyambung terus". Now **0.4**, stated once in `FiezelNeuralVoiceConfig.speech`
  so the two engines cannot drift. It governs silence *inside* a line only; the space
  between sentences belongs to the player.
- **Delivery has an arc.** Turning the pitch resampler off in m025-45 removed the
  interpolation noise but also the only thing distinguishing one sentence from the next —
  with `usePitchContour: false` the persona's `pitch` is never read. Rate is the cue that
  survives, because it is the engine's own timing rather than an effect on its output. Each
  sentence now carries its position in the utterance, and delivery moves with it: an opening
  lifts, mid-utterance sentences alternate by a hair, praise quickens, the closing sentence
  slows. A line spoken **alone** is left exactly as before — shaping a single sentence would
  only make every Library sentence slower than last release, which is not intonation.
- **Registers switch per sentence.** One utterance is now rendered sentence by sentence, so
  the persona is resolved per sentence: a praise line inside an explanation finally gets the
  praise voice.
- **Numbers are spoken.** The engine is a character model with no rule FSTs, so a digit is
  read on whatever the training data suggests. `50.000` → *lima puluh ribu*, `07:15` →
  *tujuh lewat lima belas*, `ke-3` → *ketiga*, `3,5` → *tiga koma lima*, and a leading-zero
  run stays digit-by-digit because a phone number is not a quantity. Indonesian lines only;
  English is untouched, and the written lesson text never changes.

## 4. What was deliberately not changed

- `splitIntoChunks`, the Apple char-slice policy, and the 160-word device probe: the
  evidence contract depends on their exact output.
- `generationSteps: 4` — measured as both faster and more expressive than the default.
- The two auditioned personas (sid 2 / sid 5) and their speed/pitch ceilings.
- `guardClipping`'s existing contract, including identity for in-range audio.

## 5. Tunables, in one place

`features/neural-voice/fiezel-neural-voice-config.js` → `speech`:
`streamSentences`, `streamMaxWords` (26), `silenceScale` (0.4).
Breath-group spacing: `FiezelProsody.GAP_MS`. Release delay: `FIEZEL_NEURAL_RELEASE_DELAY_MS`.

`silenceScale` is the one dial to turn if OWNER wants more or less air inside a sentence;
`GAP_MS.sentence` is the dial for the space between two of them.

## 6. Verification

```
node neural-voice-m02548-clarity-test.js      # 35 assertions, this milestone
```
Full quality gate: 59 suites, all green, plus `node --check` across every non-vendor JS file.
The Safari audiobook gate now loads `fiezel-prosody.js` and `fiezel-voice-diagnostics.js` in
its probe, so it proves the configuration the shell actually ships rather than a subset.

Physical listening on the device remains the acceptance gate for the tuning values.
