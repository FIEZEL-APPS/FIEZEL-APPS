# SALE — Braincore Architecture

*How Braincore is put together, for a buyer's technical evaluator.*

---

## 1. The shape of the thing

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HOST APPLICATION  (in FIEZEL today: app.js — supplied as reference)      │
│                                                                          │
│  Owns: storage · session state · the screen · content · identity          │
│  Provides Braincore with plain data. Receives plain data back.            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  plain objects and numbers only
                                │  (no DOM handles, no promises, no I/O)
┌───────────────────────────────▼──────────────────────────────────────────┐
│  BRAINCORE  —  features/brain/  ·  21 modules  ·  8,899 lines            │
│  Pure calculation. No DOM · no network · no storage · no clock · no RNG   │
│                                                                          │
│  ┌── DECISION CORE ────────────────────────────────────────────────────┐ │
│  │  fiezel-core-brain.js        ability · difficulty · memory · trend  │ │
│  │                              · prerequisites · root cause · plan    │ │
│  │  fiezel-tutor-brain.js       diagnose · decide · select · escalate  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌── LEARNER MODEL ────────────────────────────────────────────────────┐ │
│  │  mastery-bkt  ·  misconception-ledger  ·  confusion-matrix  ·  olm  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌── MEASUREMENT ──────────────────────────────────────────────────────┐ │
│  │  item-prior  ·  item-calibration  ·  evidence-credibility           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌── INTERVENTION ─────────────────────────────────────────────────────┐ │
│  │  step-tutor  ·  production-grader  ·  srl-coach  ·  affect          │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌── MODALITY ─────────────────────────────────────────────────────────┐ │
│  │  listening-adaptive  ·  speaking-adaptive                           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌── INSTRUMENTATION (built, not yet connected) ───────────────────────┐ │
│  │  learning-metrics · metrics-digest · stat-gate · retention-probe    │ │
│  │  brain-config · brain-manifest                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The contract every module keeps

All 21 modules follow the same five rules. They are enforced by a passing test, not merely
intended.

| Rule | Meaning |
|---|---|
| **Pure** | No DOM, no network, no storage, no `Math.random`, no `Date.now()` |
| **Time is injected** | Any function needing "now" takes it as a parameter. If omitted, it falls back to the newest timestamp in its own data — never the wall clock |
| **Deterministic** | Same input → same output, forever |
| **Explained** | Every output carries a `rationale` code (`brain3_*`) |
| **Honest about confidence** | Every output carries a `confidence`, and callers may ignore thin evidence |

### Module format

```js
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelXxx = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var SCHEMA = 'fiezel-xxx-v1';
  // ... pure functions ...
  return Object.freeze({ SCHEMA, method1, method2 });
});
```

**UMD.** Works as a browser global, a CommonJS module, or a bundler import — unchanged. Exports
are frozen, so nothing can be monkey-patched at runtime.

**Already proven portable:** these files run today in the browser (`index.html`), in Node.js
(the test suite), and in the simulation harness. Three environments, no modification.

---

## 3. Public API by module

| Module | Exports |
|---|---|
| `core-brain` | `successProbability` `estimateAbility` `optimalDifficulty` `challengeWindow` `difficultyBand` `halfLife` `updateMemory` `retrievability` `nextReviewGapDays` `reviewPriority` `trend` `momentum` `prerequisiteChain` `setCurriculumGraph` `lessonNode` `rootCause` `studyWindows` `fatigue` `planSession` `analyze` |
| `tutor-brain` | `diagnose` `classifyTiming` `median` `scaffoldLevel` `createSession` `record` `decideMove` `composeTurn` `escalate` `selectNext` `summarize` `LADDER` |
| `mastery-bkt` | `update` `mastery` `masteryGate` `frontier` `PARAMS` `GATE` `ZPD` |
| `misconception-ledger` | `update` `active` |
| `confusion-matrix` | `record` `topConfusions` `suggestPrerequisiteEdges` `decayFactor` `sanitize` |
| `item-prior` | `difficultyFor` `explain` |
| `item-calibration` | `observe` `effective` `recenter` `successProbability` |
| `evidence-credibility` | `weigh` `classifyLangLoad` `KAPPA` |
| `affect` | `assess` `suggestionFor` `STATES` |
| `srl-coach` | `sessionPlan` `predictPrompt` `reflect` |
| `step-tutor` | `decompose` `parseOps` `stepsFor` `coverage` |
| `production-grader` | `grade` `normalize` `levenshtein` |
| `olm` | `summarize` `negotiate` |
| `listening-adaptive` | `policy` `explain` `stepUp` `stepDown` `windowStats` |
| `speaking-adaptive` | `policy` `evidence` `explain` `stepUp` `stepDown` `windowStats` |
| `learning-metrics` | `learningGain` `retentionAtGap` `brierCalibration` `hintDependency` `misconceptionPersistence` |
| `metrics-digest` | `bucketInterval` `bucketRetention` `bucketN` `bucketGain` `bucketBrier` `validateDigest` |
| `stat-gate` | `wilsonInterval` `twoProportionTest` `pairedBootstrap` `sampleSizeForProportion` `mdeForProportion` `normalCdf` `normalQuantile` `mulberry32` |
| `retention-probe` | `schedule` |
| `brain-config` | `sanitize` `DEFAULTS` `BOUNDS` |
| `brain-manifest` | `describe` `modules` `authorityMap` `contentCompatibility` |

---

## 4. The models, named

Braincore does not invent its own learning theory. It implements established models — which is
the right choice, and it means a buyer's own experts can evaluate the approach.

| Subsystem | Model | Origin |
|---|---|---|
| Ability | Rasch / 1PL Item Response Theory, with Elo-style online updating | Psychometrics |
| Mastery | Bayesian Knowledge Tracing | Corbett & Anderson |
| Memory | FSRS-style half-life with retrievability | Modern spaced repetition |
| Difficulty targeting | Desirable difficulty / the 85% rule | Learning science |
| Item difficulty | Elo-style calibration with shrinkage | Adaptive testing |
| Misconceptions | Bayesian belief with hysteresis and decay | Diagnostic assessment |
| Tutoring | Step granularity and scaffold ladder | VanLehn |
| Self-regulation | Predict → perform → reflect, with fading support | SRL research |
| Statistics | Wilson intervals, two-proportion tests, paired bootstrap | Standard inference |

---

## 5. Two design decisions worth understanding

### Single-writer memory

Before this change, two different formulas wrote and read the review schedule. The source
comment is blunt: *"two readers with two formulas slowly blame each other's schedule."*

Now `CoreBrain.updateMemory()` is the only writer of `nextReview`, and
`CoreBrain.retrievability()` is the reader of forgetting risk — one model on both sides. The
older fields are still computed and stored as a rollback path; **only `nextReview` changed
hands.** A careful, reversible migration rather than a rewrite.

### Authority levels

Every module is classified `active`, `shadow`, or `off` in `fiezel-brain-manifest.js`:

- **active** — its output really changes the student's experience
- **shadow** — it runs and records, but its decision is discarded or shown only in diagnostics
- **off** — loaded, never called

**Plain language:** this lets a new model run alongside the old one, recording what it *would*
have decided, without risking a single student's lesson. That is exactly how a responsible team
ships a change to a learning algorithm.

⚠️ **The map is currently stale on two entries** — see `SALE/KNOWN_LIMITATIONS.md` §5. The
mechanism is right; its maintenance lapsed.

---

## 6. State model

Braincore holds **no state**. The host owns all of it and passes it in on every call.

| State | Shape | Held today in |
|---|---|---|
| Answer history | array of `{ok, ms, concept, timing, kappa, predicted, at}` | `fiezel-v5-state:<uuid>` |
| Mastery | per-lesson `{L, n}` | `fiezel-mastery-bkt-v1` |
| Memory | per-item `{stabilityDays, lastSeen, nextReview, lapses, lapseBurden}` | inside main state |
| Misconceptions | per-code `{belief, evidence, sessions, lastAt}` | `fiezel-misconception-ledger-v1` |
| Confusion pairs | cells | `fiezel-confusion-matrix-v1` |
| Item calibration | per-item `{b, n}` | `fiezel-item-calibration-v1` |
| SRL | predictions and fade counters | `fiezel-srl-coach-v1` |
| OLM disputes | negotiation records | `fiezel-olm-negotiation-v1` |
| Affect | rolling 64-answer window | in memory, per session |

⚠️ **There is no single "learner state" object.** It is eight keys stitched together by the
host. A standalone product needs `exportState()` / `importState()` — the one genuinely missing
piece. See `SALE/CORE_SEPARATION_ANALYSIS.md` §5.

---

## 7. What the host must provide

A buyer's integration must supply six things:

1. **Persistence** — load and save the state above
2. **Evidence intake** — one function every scored answer passes through (`app.js:1518` is the
   reference)
3. **Session state** — affect window, SRL session, tutor session
4. **A question pool** with `{id, difficulty, concept, skill, options, …}`
5. **A curriculum graph** — for root-cause analysis, via `setCurriculumGraph()`
6. **A misconception taxonomy** — the closed vocabulary the ledger uses

Items 5 and 6 ship with the asset for English grammar. A buyer in another subject supplies their
own.

---

## 8. Versioning

| Layer | Marker | Example |
|---|---|---|
| Product | `version.js` | `5.19.0` |
| Page build | `core-config.js` | `m025-202` |
| **Brain bundle** | `fiezel-brain-manifest.js` | **`3.0.0`** |
| Per-module schema | each file's `SCHEMA` | `fiezel-core-brain-v2` |

**The brain bundle version is deliberately separate from the product version** — a learning
policy change and a UI change are different kinds of change and must be traceable
independently. Telemetry carries `brainBundle` so a decision can always be attributed to the
exact policy bundle that made it.

This satisfies the Phase 17 requirement that every Braincore change be versioned.

---

*End of SALE/BRAINCORE_ARCHITECTURE.md.*
