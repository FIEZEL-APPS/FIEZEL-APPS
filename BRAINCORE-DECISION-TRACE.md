# Braincore Decision Trace — contract v1

**Schema:** `fiezel-decision-trace-v1`
**Module:** `features/brain/fiezel-decision-trace.js`
**Gate:** `decision-trace-test.js` (registered in `quality.yml`)
**Status:** built, tested, **not yet wired** — `authorityMap.decisionTrace = 'off'`

---

## 1. What this is, in one sentence

A structured record answering: *when the student answered that question, what did Braincore
actually see, and why did it choose the next action?*

## 2. What it is NOT — and why that boundary is enforced, not just written

**It is not telemetry.** Nothing built here may be sent to a server as-is.

The learning-telemetry lane has its own contract (`BRAIN-TELEMETRY-SCHEMA.md`): closed
enumerations, coarse buckets, no timestamps finer than a day, no identity. The Decision Trace is
deliberately **richer** than that, because it exists for a human debugging a decision — not for a
database.

Two things that different make them easy to confuse, and confusing them is the cheapest way to
leak something nobody intended to publish. So the boundary is enforced in code:

```js
FORBIDDEN_KEYS = ['userId','uuid','ownerUuid','installId','deviceId','email','name',
                  'userName','learnerName','ip','token','cookie','answerText',
                  'typedAnswer','rawAnswer','script', ...]
```

`build()` walks the input **to any depth** and **throws** if it finds one of these. It does not
quietly strip them: a caller pushing identity into a trace is making a mistake they need to see.

The gate proves this by iterating `FORBIDDEN_KEYS` and asserting each one is rejected — so the
list is *demonstrated*, not merely declared.

## 3. Why it exists

Phase 1 found two problems with one root:

1. The Braincore manifest sat wrong for months, because nothing machine-readable recorded who
   was actually deciding what.
2. More expensive: `const say = self.FiezelVoiceSay?.say;` was deleted, and **the entire
   neural-voice ladder died silently.** No error, no log — just worse audio. `typeof` on an
   undeclared identifier returns `'undefined'` instead of throwing.

That defect class — *a path that stops working without making a sound* — is invisible to gates
that read source as text. It is only visible if the decisions actually taken can be read back.

## 4. The record

| Field | Source in the existing architecture | Why it's here |
|---|---|---|
| `schema` | constant | Lets a reader know what shape they hold |
| `braincoreVersion` | `FiezelBrainManifest.bundleVersion` | **Never compare traces across bundles without knowing this** (Phase P) |
| `sessionId` | `state.activeSession.startedAt` (`app.js:2227`) | Groups a session's decisions |
| `learnerStateVersion` | `state.stateRevision` (`app.js:1276`) | Rises per flush — orders traces without a clock |
| `conceptId` | `quizConcept(q)` | What was being tested |
| `evidence` | `{correct, kappa, timing, predicted}` — `record()` `app.js:1518` | What Braincore was given |
| `masteryBefore` / `masteryAfter` | `FiezelMasteryBKT.mastery()` → `{L,n}` | Did belief move? |
| `memoryBefore` / `memoryAfter` | `{stabilityDays, retrievability}` — `scheduleNext()` `app.js:1731` | Did the schedule move? |
| `misconceptionState` | `FiezelMisconceptionLedger.active()` → count + top code | What it thought was wrong |
| `difficultyState` | `{prior, effective, target}` — ItemPrior / ItemCalibration / `affectTargetSuccess()` | How hard it aimed |
| `decision` | closed enum (§5) | What it chose |
| `decisionRaw` | `decideMove().move`, verbatim | *(Phase F)* The word before the enum flattened it |
| `decisionReason` | `decideMove().reason`, verbatim | *(Phase F)* **Why**, in the decider's own vocabulary |
| `reasonCodes` | existing `brain3_*` vocabulary | **Why**, from the measuring modules |
| `confidence` | 0–1 | How sure it was |

**Nothing was invented.** Every field maps to a value that already exists. Fields that answer no
debugging question were left out — a fat trace stops being read, and an unread trace is as
useless as no trace.

### Two distinctions the type system enforces

- **`kappa: null` ≠ `kappa: 0`.** `null` means *not measured* (module absent). `0` means
  *evidence deliberately discarded* (`brain3_evidence_rejected_integrity`). Collapsing them
  would erase a real decision.
- **`correct: null` ≠ `correct: false`.** A caller that doesn't know is not silently recorded as
  the student getting it wrong.

## 5. Closed vocabularies

**`decision`** — `continue` · `hint` · `reteach` · `advance` · `review` · `stop` · `unknown`

Taken from what `fiezel-tutor-brain.js` actually returns (`decideMove`/`escalate`). Anything else
throws. `unknown` exists on purpose: a caller that doesn't know says so, rather than being
defaulted to `continue`. **The enum is not where the Phase F gap was** — see limit 6 in §8: the
vocabulary was fine, the *pipeline's map into it* covered 3 of 8 tutor moves.

**`reasonCodes`** — must match `^brain3_[a-z0-9_]+$`. There are already **142 distinct
`brain3_*` codes** across `features/brain/`. The trace **records** reasons; it does not invent
them. A new code must be born in the module that makes the decision.

**`decisionRaw` / `decisionReason`** *(added in Phase F; additive, so a v1 reader that ignores
unknown fields is unaffected — and nothing had consumed v1 outside this branch)* — both are
locked to `^[a-z][a-z0-9_]{0,63}$`. A value that isn't a short slug **throws**; it is not
trimmed to fit. These fields take strings from another module, which makes them exactly the kind
of channel a learner's name eventually slips through, so the shape is enforced rather than
sanitised.

### Why the tutor's reasons were not promoted into `brain3_*`

`TutorBrain.decideMove()` always gives a reason — `on_track`, `miss_streak`,
`persistent_misconception`, `too_easy`, `cognitive_load_high`, and nine more. None of them are
`brain3_*` codes, so the `reasonCodes` filter drops all of them. The one-line fix is obvious:
prefix them, and reason coverage jumps to 100%.

That was not done. A `brain3_*` code is a claim that *the deciding module published this code*.
A prefixed code looks **identical** in the trace, and no outside reviewer could tell the two
apart. So the tutor's reason is recorded **verbatim** in `decisionReason` instead — no mapping,
no prefix, nothing lost. The trace therefore carries two layers of explanation with deliberately
different provenance:

- `reasonCodes` — `brain3_*` codes from the **measuring** modules (evidence, memory, affect,
  calibration, prior, misconception ledger). Locked vocabulary, countable across releases.
- `decisionReason` — one verbatim reason from the **deciding** module. Always present, untranslated.

`braincore-explainability-test.js` §0 enforces this mechanically: every code the pipeline emits
must be findable as a literal inside `features/brain/` source, and no code may equal
`brain3_tutor_<any tutor reason>`.

### Why `decisionRaw` exists

The enum is deliberately coarse so two Braincore releases can be compared on one vocabulary. But
mapping `stretch` → `advance` is a **claim**, and `celebrate` → `continue` genuinely loses
information (they are not the same pedagogically). `decisionRaw` keeps the original word, so the
mapping can be *checked* rather than trusted — the gate asserts
`normalizeDecision(decisionRaw) === decision` on every trace.

## 6. `movedState()` — the question Phase C and E will ask

```js
FiezelDecisionTrace.movedState(trace) // → boolean
```

True when mastery or memory differs before vs after. A trace where nothing moved is **a finding,
not a tool failure**: it is evidence that Braincore did not react to that evidence. Phases C and E
are built on exactly this.

## 7. Properties, all gate-enforced

| Property | How it's proven |
|---|---|
| **Pure** | Source scanned for DOM/network/storage/`Math.random`/`Date.now` — none |
| **Deterministic** | Same input built twice → byte-identical JSON |
| **Immutable** | Deep-frozen; mutation attempt leaves the value unchanged |
| **Privacy-guarded** | Every `FORBIDDEN_KEYS` entry proven to throw |
| **Closed enums** | Out-of-vocabulary decision and reason codes proven to throw |
| **Registered** | In `quality.yml`; removing the line turns `gate-registry-test.js` red (verified) |

## 8. Honest limits

1. **Nothing calls it yet.** `decisionTrace: 'off'` is the truthful classification today: built,
   tested, unwired. Phase C wires it, and **the manifest entry must change in that same commit** —
   the wiring gate from Phase A will otherwise turn red, by design.
2. **It records what a caller passes.** It cannot detect a caller that lies or omits. It reduces
   the silent-failure class; it does not eliminate it.
3. **It holds no clock.** Ordering comes from `learnerStateVersion`, not time. Deliberate: a
   module that reads the clock is not deterministic and cannot be compared across runs.
4. **It is not a store.** Retention, capping and where traces live are Phase C's decisions, not
   this contract's.
5. **Coverage is not the same as informativeness** *(measured in Phase F, worth saying plainly)*.
   Every decision now carries reason codes, but in a short run most of those codes report
   *insufficient data* — `brain3_item_calibration_prior_only` and
   `brain3_affect_insufficient_evidence` fire on nearly every answer, because calibration needs
   `MIN_N_APPLY` observations and affect needs a filled window. Those codes are accurate, not
   filler: "I do not have enough evidence yet" is a real reason. But a buyer reading "10/10
   decisions explained" should know that a large share of the explanation, early in a learner's
   life, is the engine correctly saying it does not know enough yet.
6. **The enum mapping lived outside this module and was incomplete until Phase F.** The closed
   vocabulary in §5 was never wrong; the *pipeline's* map into it covered only 3 of the tutor's
   8 moves, so `breathe`, `consolidate`, `celebrate`, `stretch` and `wrapup` were recorded as
   `unknown`. That is now total, and read from tutor source by the gate so a ninth move turns it
   red instead of quietly becoming `unknown` again.

---

*End of contract v1. Fields `decisionRaw` and `decisionReason` added in Phase F (additive).*
