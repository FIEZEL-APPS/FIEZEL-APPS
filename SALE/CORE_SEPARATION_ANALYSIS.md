# SALE — Braincore Separation Analysis

**The question this answers:** can Braincore realistically be sold and used as a standalone
piece of technology, separate from the FIEZEL app? And if so, what would a buyer actually have
to do?

---

## 1. The verdict

> **Yes — and it is more separable than almost any comparable engine.**
> **But it is not "lift and drop". A buyer must rebuild roughly 800–1,000 lines of connecting
> code, and that work is genuinely theirs to do.**

The engine is already clean. The wiring is not part of the engine.

**An analogy the owner may find useful:** imagine selling a car engine. The engine itself is
complete, tested, and bolted to nothing — it can come off the mount in one piece. What does
*not* come with it is the wiring loom, the fuel lines and the dashboard, because those were
built into the car's body rather than the engine. The buyer gets a real engine and has to
plumb it in.

---

## 2. Why Braincore separates so well

This is the good news, and it is genuinely unusual.

| Property | Verified how | Why it matters for separation |
|---|---|---|
| **No third-party dependencies** | All 21 files read; no `import`, no `require`, no bundled library | Nothing else has to come along |
| **No DOM access** | Source scan across all 21 files: zero occurrences outside comments | Does not need a browser |
| **No network calls** | Same scan: zero `fetch` | Does not need a server |
| **No storage access** | Same scan: zero `localStorage` / `indexedDB` | Does not need FIEZEL's data format |
| **No clock** | Same scan: zero `Date.now()` — time is always passed in | Deterministic and testable |
| **No randomness** | Same scan: zero `Math.random` | Same input → same output, always |
| **UMD module format** | Every file wraps in the same pattern | Works in a browser, in Node.js, or as a module, unchanged |
| **6,522 lines of passing tests** | Executed: 24/24 pass | The buyer can prove it still works after they move it |

**Plain language:** these seven properties are exactly the list an engineer would write down if
asked "what would make this engine portable?" They are all already true. Whoever built
Braincore was clearly thinking about this boundary, whether or not a sale was in mind.

The modules run today, unchanged, in three different places: the browser (via `index.html`),
Node.js (via the test suite), and the simulation harness. **The portability is not theoretical
— it is already demonstrated three times over.**

---

## 3. The obstacle: the orchestration lives in `app.js`

### What is missing, precisely

Braincore's 21 modules are organs. The nervous system that connects them is inside `app.js` —
a 9,584-line file that also contains the entire user interface, onboarding, settings, the
mascot, and the social layer.

**Measured, not estimated:** this audit located and measured the connecting functions.

| Measure | Value |
|---|---|
| Braincore glue functions identified in `app.js` | **70** |
| Total lines of that glue | **784** |
| Plus diagnostic-panel rendering for Braincore | ~100–200 more |
| **Realistic total a buyer must rebuild** | **~800–1,000 lines** |
| As a share of `app.js` | ~8–10% |

### What that glue actually does

| Category | Examples | Count |
|---|---|---|
| **Availability guards** | `coreBrainAvailable`, `tutorAvailable`, `bktAvailable`, `clozeAvailable`, `srlAvailable`, … | ~12 |
| **Storage read/write adapters** | `bktRead`/`bktWrite`, `misconceptionLedgerRead`/`Write`, `itemCalibrationRead`/`Write`, `confusionMatrixRead`/`Write`, `olmNegotiationRead`/`Write`, `srlRead`/`Write` | ~14 |
| **Evidence intake** | `record()` — **the single door every scored answer passes through** | 1 (~50 lines) |
| **Session state machines** | `affectSessionSync`, `srlSessionSync`, `tutorSession` | ~4 |
| **Decision orchestration** | `scheduleNext`, `buildAdaptivePool`, `deriveAdaptivePolicy`, `tutorPick`, `tutorObserve`, `quizPredictedSuccess`, `forgettingProbability` | ~10 |
| **Presentation adapters** | `tutorIndonesian`, `stepTutorThai`, `tutorConceptCard`, panel markup | ~15 |

### The honest framing

**This is not hidden technical debt and it is not a defect.** In the FIEZEL application it is
exactly the right design: the pure modules stay pure precisely *because* something impure has
to read storage and manage sessions on their behalf. The purity that makes Braincore sellable
is a direct consequence of pushing this glue out into `app.js`.

**But a buyer must be told about it in plain terms**, because "Braincore is a self-contained
engine" is true of the engine and misleading about the integration. A buyer who discovers this
on day one after being told otherwise will lose trust in everything else they were told.

**Recommended sentence for buyer materials:**
> *"Braincore is 21 dependency-free calculation modules with 6,522 lines of passing tests. The
> integration layer that connects them to storage and a user interface — about 800–1,000 lines
> — is part of the FIEZEL application, and `app.js` is supplied as the reference
> implementation."*

---

## 4. Dependency classification

As the brief requires: for each thing Braincore touches, how tightly is it bound?

| Dependency | Classification | Notes |
|---|---|---|
| **FIEZEL UI** | ✅ **REMOVABLE** | Zero DOM access. The engine never draws anything. |
| **FIEZEL server / Workers** | ✅ **REMOVABLE** | Zero network calls. Braincore has never run on the server. |
| **FIEZEL auth (Puter)** | ✅ **REMOVABLE** | Braincore has no concept of a user identity. |
| **The speech engine** | ✅ **REMOVABLE** | Braincore does not touch audio. OpenRAIL-M does not follow it. |
| **Fonts, icons, mascot** | ✅ **REMOVABLE** | Presentation only. |
| **`localStorage` / data format** | 🟡 **REPLACEABLE** | Braincore never touches storage; the *glue* does. A buyer supplies their own persistence. |
| **The `state.history` row shape** | 🟡 **REPLACEABLE** | Modules expect a documented row shape (`{ok, ms, concept, timing, …}`). A buyer maps their own data to it. |
| **Misconception taxonomy** (`misconception-taxonomy-v1.json`) | 🟠 **REQUIRED** | The ledger's closed vocabulary. Ships with the asset — small, and Class A. |
| **Curriculum / prerequisite graph** (`grammar-curriculum-v1.json`) | 🟠 **REQUIRED for root-cause analysis** | Injected via `setCurriculumGraph()`. A buyer can supply their own graph for their own subject. |
| **The orchestration layer in `app.js`** | 🔴 **TIGHTLY COUPLED — must be rebuilt** | The 800–1,000 lines above. **This is the whole cost.** |
| **Indonesian/Thai wording inside modules** | 🔴 **TIGHTLY COUPLED (minor)** | Some tutor and step-tutor sentences are frozen in Indonesian inside the pure modules; `app.js` reassembles Thai externally (`stepTutorThai`). A buyer working in another language must externalise these strings. |
| **English-language teaching assumptions** | 🟠 **REQUIRED to understand** | CEFR levels A1–C2 are baked into `LEVELS`. Some modules assume language learning (e.g. `classifyLangLoad`). See §6. |

---

## 5. Can a clean interface be exposed? (Phase 12)

**Yes.** And — this is the important part — **it maps onto functions that already exist.** No
invention is required, and the brief's instruction not to invent unnecessary abstractions can
be honoured.

| Proposed API | Maps to what exists today | Ready? |
|---|---|---|
| `initialize()` | `FiezelCoreBrain.setCurriculumGraph()` + `FiezelTutorBrain.createSession()` | ✅ Exists |
| `ingestEvidence()` | `FiezelEvidenceCredibility.weigh()` + `FiezelTutorBrain.record()` + `FiezelMasteryBKT.update()` | ✅ Exists — currently spread across `record()` in `app.js` |
| `updateLearnerState()` | `FiezelCoreBrain.updateMemory()` + `FiezelMisconceptionLedger.update()` + `FiezelItemCalibration.observe()` | ✅ Exists |
| `diagnose()` | `FiezelTutorBrain.diagnose()` | ✅ Exists |
| `estimateMastery()` | `FiezelMasteryBKT.mastery()` / `.masteryGate()` / `.frontier()` | ✅ Exists |
| `estimateMemory()` | `FiezelCoreBrain.retrievability()` / `.halfLife()` / `.nextReviewGapDays()` | ✅ Exists |
| `assessDifficulty()` | `FiezelItemPrior.difficultyFor()` + `FiezelItemCalibration.effective()` | ✅ Exists |
| `selectNextAction()` | `FiezelTutorBrain.selectNext()` + `.decideMove()` | ✅ Exists |
| `generateIntervention()` | `FiezelTutorBrain.composeTurn()` / `.escalate()` + `FiezelStepTutor.decompose()` | ✅ Exists |
| `exportState()` | ⚠️ **Does not exist** — state is assembled by `app.js` from 8 separate storage keys | 🔴 **Must be built** |

**One genuine gap: `exportState()` / `importState()`.** There is no single object representing
"this learner's Braincore state". It is currently 8 separate `localStorage` keys stitched
together by `app.js`. A standalone product needs one state object in and one state object out.

**This is the highest-value single piece of work** in making Braincore sellable: it is small,
it is well-defined, and it converts "a set of modules" into "an engine with a front door."

---

## 6. Honest limits on what "standalone" means

Two constraints a buyer must understand, stated plainly:

### It is an English-language-learning engine, not a general tutoring engine

- `LEVELS = ['A1','A2','B1','B2','C1','C2']` is CEFR — the European framework for **language**
  proficiency (`fiezel-core-brain.js:60`).
- `fiezel-evidence-credibility.js` reasons explicitly about English reading load for
  Indonesian and Thai speakers.
- The misconception taxonomy is grammar-specific.

**What generalises:** BKT, the memory model, item calibration, evidence weighting, affect,
difficulty targeting, the tutor ladder, the statistics toolkit. These are subject-neutral.

**What does not:** the CEFR level scale, the language-load model, the misconception taxonomy.

**Plain language:** a buyer wanting an English-learning engine gets one that fits immediately.
A buyer wanting a maths tutor gets an excellent skeleton and must replace the level scale and
the taxonomy. Both are real offers — but they are different offers and should be priced and
described differently.

### The modules are ES5-style, not modern JavaScript

UMD wrappers, `var`, no `class`, no `async`. This is **deliberate** — maximum compatibility,
runs anywhere. Some buyers will see robustness; others will want TypeScript types. Neither is a
defect, but it will come up.

---

## 7. What a buyer must build — with effort estimates

Estimates assume one competent JavaScript engineer. They are **engineering estimates, not
quotes**, and are given as ranges because they depend on the buyer's existing platform.

| # | Work item | Effort | Notes |
|---|---|---|---|
| 1 | **Persistence adapter** — read/write learner state in the buyer's own store | **3–5 days** | Replaces ~14 storage helpers |
| 2 | **`exportState()` / `importState()`** — one state object | **2–3 days** | The missing front door (§5) |
| 3 | **Evidence intake** — their equivalent of `record()` | **2–3 days** | `app.js:1518` is the reference |
| 4 | **Orchestration** — `scheduleNext`, `buildAdaptivePool`, `tutorPick`, `tutorObserve` | **5–8 days** | The real integration work |
| 5 | **Session state machines** — affect, SRL, tutor sessions | **2–3 days** | |
| 6 | **Externalise the Indonesian strings** | **2–4 days** | Only if targeting another language |
| 7 | **Their own content and taxonomy** | **Varies hugely** | Not included in the sale |
| 8 | **Integration tests** on their platform | **3–5 days** | The 24 unit tests come with the asset and still pass |
| | **Total integration effort** | **≈ 19–31 working days (4–6 weeks)** | Excluding content |

**Plain language:** a buyer needs roughly **one engineer for about a month** to have Braincore
running inside their own product. That is a genuinely attractive number for an engine of this
sophistication — building this from scratch, including the research, would be many months.
**The month of integration is the honest price of admission, and stating it up front is far
better than letting a buyer discover it.**

---

## 8. Recommended sequence for the owner

**Do not rewrite Braincore.** It does not need it, and rewriting would destroy the test
coverage that makes it credible.

Do this instead, in order:

| Step | Work | Effort | Why |
|---|---|---|---|
| 1 | **Fix the stale manifest** — set `stepTutor` and `productionGrader` to `active`, and replace the hollow test with one that reads `app.js` | **Half a day** | AUDIT 01 §5. Cheapest credibility fix available. |
| 2 | **Fix the licence documentation** — Fredoka, the retired Kokoro entries, the missing OFL texts | **Half a day** | `IP/THIRD_PARTY_LICENSES.md` §4 |
| 3 | **Make the test suite read-only** — stop gates writing to tracked files | **1 day** | AUDIT 05 §4.1. A buyer will run the suite on day one. |
| 4 | **Build `exportState()` / `importState()`** | **2–3 days** | Converts modules into an engine |
| 5 | **Extract a `braincore-runtime.js`** — move the glue out of `app.js` into one file, still used by FIEZEL | **5–8 days** | Turns a month of buyer work into a week, and improves FIEZEL at the same time |
| 6 | **Package a standalone demo** — Braincore running with no FIEZEL UI | **3–5 days** | The single most persuasive thing a buyer can be shown |

**Steps 1–3 total one and a half days and remove three findings a buyer's reviewer would
otherwise find themselves.** They are the highest return on effort in this entire audit.

**Step 5 is the strategic one.** It costs about a week and it is not throwaway work — FIEZEL
gets a cleaner architecture out of it, *and* the asset becomes dramatically easier to sell.

---

## 9. Summary

| Question | Answer |
|---|---|
| Can Braincore be separated? | **Yes.** |
| Is it already separate? | **The engine yes; the wiring no.** |
| What must be rebuilt? | ~800–1,000 lines of orchestration |
| How long for a buyer? | ~4–6 weeks for one engineer |
| Does anything block separation? | **No.** No third-party code, no licence obligations, no server dependency. |
| Biggest single missing piece | `exportState()` / `importState()` |
| Biggest risk to the sale | Not the separation — it is the **absence of outcome evidence** (AUDIT 05 §6) |

---

*End of SALE/CORE_SEPARATION_ANALYSIS.md.*
