# Braincore Evidence Schema v1 (Phase 2 / Phase K)

**Schema:** `fiezel-braincore-evidence-v1`
**Module:** `features/brain/fiezel-braincore-evidence.js`
**Gate:** `braincore-evidence-test.js` (registered in `quality.yml`)
**Status:** designed, tested, **nothing collects it and nothing sends it** — `authorityMap.braincoreEvidence = 'off'`

---

## 1. Why a new schema when `fiezel-learner-evidence-v1` already exists

`fiezel-learner-evidence-v1` lives in `app.js`, has its own CI gate, and already enforces the
privacy properties this phase asks for. Per `AUDIT/08`, the first step was to diff against it
rather than design from scratch. The diff produced a clear answer: **the two answer different
questions and both are needed.**

| | `fiezel-learner-evidence-v1` (exists) | `fiezel-braincore-evidence-v1` (this) |
|---|---|---|
| describes | **the learner** | **the engine's decision** |
| shape | 30-day aggregate | one record per interaction |
| asks | "how is this student doing?" | "did that decision help?" |
| audience | the learner's own coaching UI | evaluation and due diligence |
| key field | `maxForgettingRisk`, `weakest[]` | **`postInterventionOutcome`** |

**One field separates them, and the old schema has no equivalent:**

```
postInterventionOutcome — after the engine chose hint/reteach, what happened next?
```

Without it, all the evidence in the world can only say the learner is struggling. With it, the
data can say whether **the engine's touch changed anything** — the one question no synthetic
learner in Phases C–J can answer, and the reason real evidence is worth collecting at all.

Neither schema replaces the other.

## 2. The record

| field | why it earns its place |
|---|---|
| `conceptId` | what was being tested |
| `questionId` | identifies an **item**, never a person |
| `attemptNumber` | ordering, without a clock |
| `difficulty` | what the engine aimed at |
| `responseTimeBucket` | `guess` / `retrieved` / `reasoned` / `struggled` / `unknown` |
| `outcome` | `correct` / `incorrect` / `unknown` |
| `intervention` | `none` / `hint` / `reteach` / `review` / `advance` / `stop` |
| **`postInterventionOutcome`** | **the causal link — §1** |
| `misconceptionCode` | only when misconception evidence genuinely exists |
| `braincoreVersion` | without it, evidence from two releases cannot be separated |

The gate asserts the record carries **nothing else**. Every field collected without need is a
privacy debt the learner pays.

## 3. What is deliberately absent

- **No timestamps at all.** Ordering rides on `attemptNumber`. `at`, `timestamp`, `startedAt` and
  `sessionId` are in `FORBIDDEN_KEYS` alongside the identity fields, because millisecond time
  turns a pile of records into a session fingerprint that can be joined across files.
- **No raw response time.** Buckets only. Raw milliseconds are more precise than any evaluation
  needs and precise enough to re-identify a person.
- **No answer text, no question text.**
- **No identity, at any depth.** `FORBIDDEN_KEYS` is enforced by **throwing**, not scrubbing.
  Silent scrubbing makes a leak look like a success; a thrown error makes it look like a leak.
- **No way to send anything.** The module has no network, storage, or queue code, and the gate
  asserts the words `sendBeacon`, `WebSocket`, `postMessage`, `http`, `upload`, `queue` and
  `flush` do not appear in it. An evidence schema that can transmit itself is halfway to
  telemetry nobody asked for.

## 4. Two distinctions the type system enforces

- **`postInterventionOutcome: null` ≠ `'incorrect'`.** `null` means the learner has not come back
  to this concept yet. Counting "not yet answered" as failure would make every intervention look
  wasted and punish the engine for data that does not exist. This is the same distinction as
  `kappa: null ≠ kappa: 0` in the Decision Trace, and it has bitten this project before.
- **`intervention: 'none'` for `continue`.** Doing nothing is the base state. Counting it as an
  action would make every session look full of interventions and dilute any metric built on top.

## 5. One rejection worth calling out

`misconceptionCode` **refuses** any value starting `unclassified:`. `AUDIT/10` §4 found that the
tutor synthesises that key when an item carries no misconception map, and then reports
`persistent_misconception`. Collecting it would write "wrong twice" into the dataset as
"misconception" — permanently, and invisibly to anyone analysing it later. **A defect in a
decision is recoverable; the same defect frozen into evidence is not.**

## 6. Honest limits

1. **Nothing collects this.** `braincoreEvidence: 'off'` is the truthful classification today.
   The gate asserts `app.js` and `index.html` do not reference it — so if anyone wires it up, the
   manifest entry must change in the same commit or the Phase A wiring gate turns red.
2. **Designing a schema is not consent to collect.** The phase brief says *"Do NOT immediately
   upload everything to the server."* Whether any of this is ever gathered is the owner's
   decision, and — for a product used by learners — plausibly a legal one too.
3. **A record is only meaningful as a pair.** `fromTraces(trace, next)` requires both to be the
   same concept and rejects mismatches: crediting an intervention with an outcome from a
   different concept is false evidence, not incomplete evidence.
4. **It has never held a real record.** Every test uses fabricated input.
