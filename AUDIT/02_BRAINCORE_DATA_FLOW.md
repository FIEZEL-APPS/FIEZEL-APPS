# AUDIT 02 — Braincore Data Flow

**What this document is:** a step-by-step trace of one real learning interaction, from the
moment a student sees a question to the moment their progress is saved. Every arrow below
names the actual file and line number where it happens, so a buyer's engineer can follow it
without guessing.

**Method:** read from `app.js` and `features/brain/*` directly. No step is inferred.

---

## 1. The path, at a glance

```
   STUDENT
      │
      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 1. PRESENT A QUESTION                                        │
   │    app.js:7640  q.__predicted = quizPredictedSuccess(q)      │
   │    → Core Brain predicts "how likely is this student to get   │
   │      this right?" BEFORE they answer. The prediction is       │
   │      stamped onto the question itself.                        │
   └──────────────────────────────────────────────────────────────┘
      │
      ▼  student answers
   ┌──────────────────────────────────────────────────────────────┐
   │ 2. GRADE                                                     │
   │    multiple choice → app.js:7839  answer()                    │
   │    typed (cloze)   → app.js:7936  answerCloze()               │
   │                       └─ app.js:7944 ProductionGrader.grade() │
   └──────────────────────────────────────────────────────────────┘
      │
      ▼
   ┌══════════════════════════════════════════════════════════════┐
   ║ 3. record()  —  app.js:1518   ★ THE SINGLE DOOR ★             ║
   ║    Every scored first attempt in the entire application       ║
   ║    passes through this one function.                          ║
   └══════════════════════════════════════════════════════════════┘
      │
      ├─→ 3a. Weigh the evidence   evidenceKappa()      app.js:2165
      ├─→ 3b. Write history row    state.history.push   app.js:1543
      ├─→ 3c. Mastery (BKT)        bktRecord()          app.js:2196
      ├─→ 3d. Confusion matrix     confusionMatrixRecord() app.js:2217
      ├─→ 3e. Item calibration     itemCalibrationObserve()
      ├─→ 3f. Telemetry (OFF)      learningTelemetryEmitAnswer()
      └─→ 3g. save()               app.js:1277 → localStorage
      │
      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 4. DIAGNOSE + DECIDE   tutorObserve()  app.js:2795           │
   │    TutorBrain.record()   → what misconception is this?        │
   │    TutorBrain.decideMove() → re-teach, hint, or advance?      │
   │    TutorBrain.escalate() app.js:7747 → raise the scaffold     │
   └──────────────────────────────────────────────────────────────┘
      │
      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 5. UPDATE MEMORY   scheduleNext()  app.js:1731               │
   │    CoreBrain.updateMemory() → new stability (half-life)       │
   │    CoreBrain.nextReviewGapDays() → the next review date       │
   │    ★ single-writer: only this model writes nextReview         │
   └──────────────────────────────────────────────────────────────┘
      │
      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 6. PICK THE NEXT QUESTION   tutorPick()  app.js:2782         │
   │    pool ← buildAdaptivePool()  app.js:2958                    │
   │      └ difficulty overridden by ItemPrior + ItemCalibration   │
   │    TutorBrain.selectNext(pool, session, {                     │
   │        predict:       ← CoreBrain.successProbability          │
   │        targetSuccess: ← affectTargetSuccess()  app.js:2255    │
   │    })                                                         │
   └──────────────────────────────────────────────────────────────┘
      │
      ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ 7. STORE   save() app.js:1277 → saveFlushWrite() app.js:1276  │
   │    localStorage['fiezel-v5-state:<account-uuid>']              │
   │    + 8 separate Braincore keys (see §5)                        │
   └──────────────────────────────────────────────────────────────┘
```

---

## 2. Where learner state is created

| Event | Location |
|---|---|
| First ever load | `loadState()` — `app.js:1261`. Reads `localStorage`; if nothing is there, uses `defaultState`. |
| Per-account state | `app.js:874` — `activeStateStorageKey` starts as the legacy key `fiezel-v4-state`, then switches to `fiezel-v5-state:<uuid>` once a Puter account is known (`app.js:1303`). |
| Migration | The legacy key is read once and migrated. This exists because two Puter accounts on one phone used to overwrite each other's history, level and name. |

**Plain language:** the student's brain-state is created on their own device the first time
they open the app. There is no server-side account creation step for learning progress.

---

## 3. Where each kind of learner state changes

This is the heart of the question "what does Braincore actually do?", so each row names the
exact function that performs the write.

| What changes | Written by | Which Braincore module decides it |
|---|---|---|
| **Answer history** | `record()` `app.js:1518` | — (raw evidence) |
| **Evidence weight (kappa)** | `record()` via `evidenceKappa()` `app.js:2165` | `FiezelEvidenceCredibility.weigh()` |
| **Predicted success** | `draw()` `app.js:7640` via `quizPredictedSuccess()` `app.js:2158` | `FiezelCoreBrain.successProbability()` |
| **Mastery probability** | `bktRecord()` `app.js:2196` | `FiezelMasteryBKT.update()` |
| **Memory stability / next review** | `scheduleNext()` `app.js:1731` | `FiezelCoreBrain.updateMemory()` + `nextReviewGapDays()` |
| **Forgetting probability (read)** | `forgettingProbability()` `app.js:1705` | `FiezelCoreBrain.retrievability()` |
| **Misconception beliefs** | `app.js:2136` | `FiezelMisconceptionLedger.update()` |
| **Confusion pairs** | `confusionMatrixRecord()` `app.js:2217` | `FiezelConfusionMatrix.record()` |
| **Item difficulty (prior)** | `buildAdaptivePool()` `app.js:2958` | `FiezelItemPrior.difficultyFor()` — **overwrites `q.difficulty`** |
| **Item difficulty (observed)** | `itemCalibrationObserve()` | `FiezelItemCalibration.observe()` / `.effective()` |
| **Affect state** | `affectObserve()` `app.js:2234` | `FiezelAffect.assess()` |
| **Session plan** | `app.js:1984` | `FiezelSrlCoach.sessionPlan()` |
| **Adaptive policy** | `app.js:2923` | `FiezelCoreBrain.refinePolicy()` |

### The one design decision worth explaining to a buyer

Look at rows 5 and 6 together. `scheduleNext()` **writes** the next review date using
`CoreBrain.updateMemory()`, and `forgettingProbability()` **reads** the risk of forgetting
using `CoreBrain.retrievability()` — *the same model on both sides*.

The comment in the source explains why (`app.js:1706`): before this, two different formulas
wrote and read the schedule, and they "slowly blamed each other's schedule". The older
formula's fields (`stability`, `lapses`, `interval`) are still calculated and written, but
only as a rollback path — **only `nextReview` changed hands.**

**Plain language:** deciding *when* to show something again, and estimating *how likely the
student is to have forgotten it*, are now done by one model instead of two arguing ones.
This is a small change that removes a whole class of bug, and it is the kind of care that
distinguishes a real engine from a pile of formulas.

---

## 4. ⚠️ Where the Braincore boundary actually sits — and it is not where you'd hope

Follow the trace again and notice a pattern: **every Braincore module is pure, but the glue
that connects them all lives inside `app.js`.**

Concretely, `app.js` holds:

- The single evidence door `record()` (~50 lines)
- Every storage read/write helper (`bktRead`/`bktWrite`, `ledgerRead`/`ledgerWrite`,
  `misconceptionLedgerRead`, `itemCalibrationRead`, `confusionMatrixRead`, …)
- The session/affect state machines (`AFFECT_STATE`, `affectSessionSync`, `srlSessionSync`)
- The wrappers that call each module and swallow its errors (`try{...}catch{}`)
- `scheduleNext()`, `buildAdaptivePool()`, `deriveAdaptivePolicy()`, `tutorPick()`,
  `tutorObserve()`

`app.js` is **9,584 lines**, and it also contains all the screens, the quiz UI, settings,
onboarding, the mascot, the social layer and the diagnostics panel.

**Plain language — and this is the single biggest obstacle to selling Braincore separately:**
Braincore's twenty-one organs are clean, separable and well-made. But the *nervous system*
that wires them together is stitched into the body of the application. A buyer would receive
excellent organs and would have to build their own nervous system, using `app.js` as the
reference drawing.

This is quantified and costed in `SALE/CORE_SEPARATION_ANALYSIS.md`. It is not fatal — but a
buyer told "Braincore is a self-contained engine" without this caveat would feel misled on
day one of integration, so it is stated plainly here.

---

## 5. Where evidence is recorded (storage keys)

All of these are `localStorage` on the student's own device:

| Key | Holds |
|---|---|
| `fiezel-v5-state:<account-uuid>` | The main state: history, vocab/grammar/reading review buckets, levels, preferences |
| `fiezel-v4-state` | Legacy key, read once for migration |
| `fiezel-mastery-bkt-v1` | Mastery probabilities |
| `fiezel-misconception-ledger-v1` | Misconception beliefs |
| `fiezel-confusion-matrix-v1` | Confusion pairs |
| `fiezel-item-calibration-v1` | Observed item difficulty |
| `fiezel-olm-negotiation-v1` | Student's disputes with their own model |
| `fiezel-srl-coach-v1` | Self-regulated-learning coach state |
| `fiezel-sl-v1-state` | Speaking/listening state |
| `fiezel-learning-queue-v1` (IndexedDB) | Outbound telemetry queue |

Note that Braincore modules **never touch these keys themselves** — `app.js` reads the key,
hands the plain data to the pure module, gets plain data back, and writes it. That is why
the modules stay pure, and it is also exactly why the glue could not follow them out of the
door.

---

## 6. Guard behaviour: what happens when a module is missing

Every single Braincore call site in `app.js` follows the same pattern:

```js
function xxxAvailable(){ return !!self.FiezelXxx }        // is the module loaded?
try { ... self.FiezelXxx.method(...) } catch { /* silent */ }
```

Combined with the module-absent guards, this means: **if a Braincore module fails to load,
the app keeps working** and silently falls back to the older behaviour. There are explicit
fallbacks, e.g. `app.js:7945`:

```js
if(!res){res={ok:norm(graded)===norm(q.clozeAnswer),rationale:'fallback_exact_match'}}
```

**Plain language:** the app is built so a missing brain module degrades the lesson rather
than breaking it. A student never sees an error because the adaptive engine failed to load.

**The honest flip side, which a buyer's engineer will notice:** these are *silent* `catch{}`
blocks. If a Braincore module started throwing on every call, the app would keep running and
quietly stop being adaptive, and **nothing would report it**. There is a diagnostics panel
that can show module state, but there is no automatic alarm. This is listed in
`SALE/KNOWN_LIMITATIONS.md`.

---

## 7. What happens to the evidence after it is stored

```
   record()  →  localStorage (device)      ← this always happens
        │
        └─→  learningTelemetryEmitAnswer()  →  IndexedDB queue
                     │
                     ▼
             POST /api/learning/events
                     │
                     ▼
             ┌───────────────────────────┐
             │ LEARNING_ENABLED = "off"  │  ← current setting
             │ server replies 202        │
             │ {disabled:true}           │
             │ NOT ONE ROW IS WRITTEN    │
             └───────────────────────────┘
```

This is examined fully in AUDIT 03, but the headline belongs here: **the learning-evidence
lane exists end to end and is currently switched off.** Learning happens entirely on the
device regardless.

---

*End of AUDIT 02.*
