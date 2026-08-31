# AUDIT 04 — Braincore Technical Assessment

**What this document answers:** is Braincore technically *good*, or just technically *present*?
It examines each subsystem's actual algorithm, its real parameters, and where it is weak.

**Method:** read from source. Every number below is copied from the file it lives in, with the
line number given, not recalled or approximated.

---

## 1. Overall verdict

Braincore is a **genuine, research-grounded adaptive learning engine**, not a marketing label
attached to a few `if` statements. The models it implements are the ones the education-research
literature actually uses — Item Response Theory, Bayesian Knowledge Tracing, spaced-repetition
memory decay, Zone of Proximal Development targeting, Bayesian belief updating with hysteresis.
They are implemented carefully, with explicit confidence reporting and explicit refusal to
guess on thin evidence.

**Its weaknesses are real but are not weaknesses of design.** They are:
1. every parameter is a **reasoned default, not a calibrated measurement** (§10);
2. the wiring that connects the modules lives in `app.js`, not in Braincore (AUDIT 02 §4);
3. nothing has been validated against real learners (AUDIT 05 §6).

**Plain language:** the engine is well-engineered and built on real science. What it has never
had is a road test.

---

## 2. Mastery

### What is implemented — `fiezel-mastery-bkt.js`

Standard **Bayesian Knowledge Tracing** (Corbett & Anderson), the same model used by Carnegie
Learning's Cognitive Tutor.

| Parameter | Value | Meaning |
|---|---|---|
| `L0` | 0.20 | Assumed chance the student already knows a skill before any evidence |
| `T` | 0.15 | Chance of learning it on each opportunity |
| `slip` | 0.10 | Chance of getting it wrong despite knowing it |
| `guess` | 0.25 | Chance of getting it right without knowing it (matches 4 options) |
| Mastery gate | `L ≥ 0.95` **and** `minN ≥ 5` | Both required |
| ZPD window | 0.55 – 0.90 | The "frontier" of what to teach next |
| Evidence weight cap | 1.5 | Typed production counts more than multiple choice |

*(`fiezel-mastery-bkt.js:70–82`)*

### Assessment

**Strong.** Three details raise this above a textbook implementation:

1. **The mastery gate has two conditions, not one.** A student cannot be declared to have
   mastered a skill on a lucky streak — 0.95 confidence is not enough without at least 5
   observations. Many implementations skip this and declare mastery after two lucky answers.
2. **Evidence is weighted, not counted.** A typed answer is worth 1.5; a sub-1.8-second guess
   is worth 0.3. Most BKT implementations treat all evidence as equal, which is known to be
   wrong.
3. **Numerical care.** `EPS = 1e-6` keeps `L` away from 0 and 1 because `logit(0)` and
   `logit(1)` are infinite — a real bug class, handled deliberately.

### Weaknesses (stated plainly)

- **The four parameters are literature defaults, not fitted to FIEZEL's learners.** Real BKT
  deployments fit `L0/T/slip/guess` *per skill* from data. Here one set is used for every
  skill. This is defensible with no data, but it is a known accuracy ceiling.
- **Calibration is unverified.** Nothing checks whether "0.95 mastery" corresponds to a real
  95% success rate. The tool to check it (`learning-metrics.js` Brier calibration) exists and
  is not wired up.
- **Persistence:** stored in `localStorage` under `fiezel-mastery-bkt-v1`. Survives sessions,
  is lost if the browser's storage is cleared.
- **It does not control unlocking.** Per AUDIT 01 this is still *shadow* for unlock decisions.

---

## 3. Memory

### What is implemented — `fiezel-core-brain.js`

An **FSRS-style half-life model** with three parts: `halfLife()`, `updateMemory()`,
`retrievability()`, plus `nextReviewGapDays()` driven by a retention target (default 0.9).

### Assessment

**The strongest subsystem in Braincore**, for a structural reason rather than a mathematical
one.

`app.js:1731` (`scheduleNext`) makes this model the **single writer** of `nextReview`, and
`app.js:1705` (`forgettingProbability`) makes the same model the reader of forgetting risk.
Before this change, two different formulas wrote and read the schedule. The source comment is
blunt about why that was fixed: *"two readers with two formulas slowly blame each other's
schedule."*

The old fields (`stability`, `lapses`, `interval`) are still computed and stored as a rollback
path — **only `nextReview` changed hands.** That is a careful, reversible migration, not a
rewrite-and-pray.

There is also a real distinction between `lapses` (ever forgotten — only increases) and
`lapseBurden` (currently fragile — decays on success). Without that split, one bad week
permanently freezes an item's interval. This is a subtle and correct piece of modelling.

### Weaknesses

- **"FSRS-lite" is not FSRS.** Real FSRS has 17+ optimised parameters fitted to review logs.
  This is a simplified half-life model with hand-chosen constants. It is honest that it is
  "lite" — the name says so — but a buyer should not read "FSRS" and assume the full model.
- **Retention target 0.9 is a choice, not a finding.** Never validated against actual recall.
- **No optimisation loop.** Real spaced-repetition systems re-fit parameters from the user's
  own review history. This one cannot, because review history never leaves the device and
  nothing on the device re-fits it.

---

## 4. Misconceptions

### What is implemented — `fiezel-misconception-ledger.js` + `fiezel-confusion-matrix.js`

Bayesian belief tracking per misconception, with a **closed taxonomy**
(`misconception-taxonomy-v1.json`), decay, and hysteresis.

| Parameter | Value | Meaning |
|---|---|---|
| `PRIOR_BELIEF` | 0.1 | Start sceptical — one slip is not an accusation |
| `ACTIVE_BELIEF` | 0.7 | Threshold to call a misconception *active* |
| `RESOLVED_BELIEF` | 0.3 | Threshold to call it *resolved* |
| `MIN_EVIDENCE` | 3 | Minimum distractor hits |
| `MIN_SESSIONS` | 2 | Must appear across ≥2 separate sessions |
| `DECAY_HALF_LIFE_DAYS` | 14 | Belief decays back toward the prior |
| `TIMING_WEIGHT` | guess 0.3 / struggled 1.0 | A rushed wrong answer is weaker evidence |

*(`fiezel-misconception-ledger.js:68–76`)*

### Assessment

**Strong, and the most thoughtfully guarded subsystem.** Four separate defences against
falsely accusing a student of holding a misconception:

1. A low prior (0.1) — the system does not start suspicious.
2. Two different thresholds for entering (0.7) and leaving (0.3) — **hysteresis**. Without
   this, a student hovering near a single threshold would flip between "has this
   misconception" and "doesn't" on every answer.
3. **Cross-session evidence required** (`MIN_SESSIONS = 2`). One bad afternoon cannot brand a
   student.
4. **Decay.** Beliefs fade over 14 days. An old misconception the student has since fixed does
   not haunt them forever.

**Plain language:** the system is deliberately slow to conclude "this child misunderstands X",
and quick to let go of it. That is the ethically correct direction for a tool that tells
children what they are bad at, and it is unusual to see it implemented this carefully.

### Weaknesses

- **The confusion matrix is recorded but never used.** `fiezel-confusion-matrix.js` computes
  `suggestPrerequisiteEdges()` — it can propose new links in the curriculum graph — and
  nothing reads them (AUDIT 01, status PARTIAL). This is arguably the single most
  under-exploited asset in Braincore.
- **The taxonomy is fixed and hand-authored.** New misconception types require a content edit.
- The 14-day half-life and both thresholds are, again, reasoned defaults.

---

## 5. Difficulty

### What is implemented — two layers

| Layer | File | Role |
|---|---|---|
| **Prior** | `fiezel-item-prior.js` | Estimates difficulty *before any student sees it*, from CEFR level, answer mode, and stem length |
| **Observed** | `fiezel-item-calibration.js` | Corrects that estimate from real outcomes, using Elo-style updating with shrinkage |

Selection targets a success probability, using a 1PL/Rasch model with
`DISCRIMINATION = 1.5` and `GUESS_FLOOR = 0.25` (`fiezel-core-brain.js:119–120`), and
`TARGET_SUCCESS = 0.8` (`:275`).

### Assessment

**Strong, and this two-layer design is the correct answer** to a real problem: a brand-new
question has no data, so it needs a prior; a well-used question has data, so it should
override the prior. `MIN_N_APPLY` and `SHRINKAGE` ensure a question with three answers does
not swing wildly.

The 0.8 target implements the **desirable-difficulty / 85% rule** from the learning-science
literature — hard enough to be worth doing, easy enough not to demoralise.

The affect system then **shifts this target**: 0.90 when frustrated, 0.75 when bored, 0.80
otherwise (`app.js:2255`). That is a genuinely sophisticated touch — the difficulty target is
not fixed, it responds to the student's emotional state.

### Weaknesses

- `GUESS_FLOOR = 0.25` hard-codes an assumption of exactly 4 options. Questions with 3 or 5
  options are mis-modelled. Minor, but real.
- `DISCRIMINATION = 1.5` is a single global value. Real IRT fits discrimination per item.
- Calibration is per-device. **Every student's device independently re-learns how hard each
  question is, from scratch, and none of them ever share what they learned.** This is the
  clearest concrete illustration of what the missing Global Learning Intelligence layer
  (AUDIT 03 §4.2) would actually be worth: with it, question difficulty would be known from
  thousands of learners on day one instead of guessed per child.

---

## 6. Evidence credibility

### What is implemented — `fiezel-evidence-credibility.js`

A weight (kappa, 0–1) attached to every single answer:

| Situation | Weight |
|---|---|
| Answer in under 1,800 ms on 4 options | **0.30** — near-zero information |
| A1/A2 learner, full-English question | **0.45** — over half the failure is reading failure, not grammar failure |
| B1+ learner, full-English question | 0.85 |
| Mixed English with Indonesian support | 0.80 |
| Thai-supported item | **1.0** ⚠️ |
| Listening correct after ≥3 replays | 0.60 |
| Evidence mismatch | **0** — discarded, not discounted |

*(`fiezel-evidence-credibility.js:73–86`)*

### Assessment

**This is the most intellectually impressive module in Braincore, and it is the one a buyer
should be shown first.**

The insight it encodes is one that most adaptive-learning products miss entirely: *when a
beginner fails an English-language grammar question, you cannot tell whether they failed the
grammar or failed to read the question.* Counting that as strong evidence of a grammar gap is
simply wrong, and it will send the student to re-learn something they already knew.

The 0.45 weight for A1/A2 learners on full-English items is a direct, quantified correction
for that confound. Very few systems do this at all.

### ⚠️ Weakness the source itself flags — and this is exemplary

`LANG_TH = 1` carries this comment in the source (`:78–82`):

> *"PERHATIAN: ini TRANSFER EDITORIAL dari kalibrasi Indonesia, BUKAN angka terukur untuk
> murid Thai — jarak Thai↔Inggris (aksara, nol kognat, urutan kata) bisa membuat transfer ini
> salah; WAJIB direkalibrasi begitu data pilot Thai ada."*
>
> (This is an **editorial transfer** from the Indonesian calibration, **not a measured number**
> for Thai students. The Thai↔English distance — different script, zero cognates, different
> word order — could make this transfer wrong; it **must** be recalibrated once Thai pilot
> data exists.)

**Plain language:** the code knows one of its own numbers is a guess, says so in writing,
explains exactly why it might be wrong, and names the condition for fixing it. That is a
higher standard of honesty than most commercial software, and a buyer's technical reviewer
will notice it favourably. It is a genuine limitation and a genuine credibility signal at the
same time.

---

## 7. Affect

### What is implemented — `fiezel-affect.js`

Detects `frustrated` / `bored` / `curious` / `neutral` from a rolling window of the last 64
answers (outcome, time taken, time since last miss), with a minimum-evidence gate, a
confidence value, and **hysteresis** (`app.js:2244` — once a state changes within a session,
the module resists flipping again).

### Assessment

**Present, wired, and genuinely influencing the student's experience** — it moves the
difficulty target (§5). That is more than most "affect detection" features, which typically
show a face icon and change nothing.

### Weaknesses

- **It infers emotion purely from timing and correctness.** No camera, no self-report, no
  interaction telemetry. A student who is slow because they are being careful looks identical
  to one who is slow because they are stuck.
- **The state thresholds are unvalidated.** Nobody has checked whether the module's
  "frustrated" corresponds to an actually frustrated child.
- Its influence is deliberately bounded (0.75–0.90 target range), which is the right choice —
  a wrong affect reading can only nudge, not derail.

---

## 8. Tutor

### What is implemented — `fiezel-tutor-brain.js` (835 lines, largest module after core)

`diagnose`, `classifyTiming`, `scaffoldLevel`, `createSession`, `record`, `decideMove`,
`composeTurn`, `escalate`, `selectNext`, plus a `LADDER` of scaffold levels and a
`MISS_STREAK_STOP`.

Supported by `fiezel-step-tutor.js` (breaks a question into 2–3 guided steps) and
`fiezel-production-grader.js` (grades typed answers with typo tolerance, distractor detection
and wrong-morpheme detection).

### Assessment

**Strong, and architecturally correct.** Two points stand out:

1. **Escalation is the tutor's decision, not the UI's.** `app.js:7745` explicitly delegates to
   `TutorBrain.escalate()`. The source comment records that this used to be decided in
   `app.js` and was moved *into* the module. That is the right direction of travel, and it is
   exactly what makes Braincore separable.
2. **The production grader is subtle in the right way.** It distinguishes a *typo* (edit
   distance 1 → still correct) from a *wrong word form* (`arrives`/`arrived` → **wrong**, and
   recorded as a misconception) from a *distractor hit* (typing the exact text of a known
   wrong option → wrong, and recorded against that specific misconception). Getting this
   distinction right is the difference between "you typed it wrong" and "you don't understand
   the past tense."

`MISS_STREAK_STOP` is a safety valve — the tutor stops rather than grinding a struggling
student through an unwinnable streak.

### Weaknesses

- `composeTurn()` produces **template-driven** text, not generated language. Tutoring
  *decisions* are Braincore's; tutoring *prose* is templates (plus an optional AI coach that
  is a separate, server-side, flag-gated feature).
- Indonesian and Thai wording is partly reassembled in `app.js` (`stepTutorThai`,
  `app.js:2730`) because the pure module freezes its Indonesian sentences and does not export
  `askFor`. The source explains this trade-off honestly. It is nonetheless **application code
  doing Braincore's job**, and it is one of the concrete separation costs in
  `SALE/CORE_SEPARATION_ANALYSIS.md`.

---

## 9. Simulation

### What is implemented

`adaptivity-simulation-v3.js` (1,951 lines) plus `-extended` and `-hardened` variants, and
`fiezel-stat-gate.js` — a real statistics toolkit (Wilson intervals, two-proportion tests,
paired bootstrap, sample-size and minimum-detectable-effect calculators, seeded `mulberry32`
RNG for reproducibility).

### Assessment

**This is a serious piece of test equipment, and it is a genuine asset in its own right.** The
presence of `pairedBootstrap` and `mdeForProportion` means whoever built this understood that
"the new version feels better" is not evidence, and built the tools to do it properly.

### ⚠️ The gap that matters

The statistics toolkit is wired into `content-promotion.js` and `fiezel-autonomy-config.js` —
it gates **content** promotion. It is **not** wired into any pipeline that evaluates
**Braincore policy changes** against real learners, because no such pipeline exists (there is
no A/B framework, no shadow-comparison harness on live traffic).

**Plain language:** the project owns a good measuring instrument and has never pointed it at
the main question — *does this engine teach better?* Everything needed to answer it is present
except the data and the last few connections.

---

## 10. Cross-cutting assessment

### What is genuinely good

| Property | Evidence |
|---|---|
| **Purity** | All 21 modules: no DOM, no network, no storage, no randomness, no clock. Verified by direct scan and by a passing test. |
| **Determinism** | No `Date.now()`; time is always passed in. Same input → same output. |
| **Explainability** | Every output carries a `rationale` code (`brain3_*`) and a `confidence`. There is no unexplainable decision. |
| **Refusal to over-claim** | Every model returns `confidence` and `evidence` counts, and callers are permitted to ignore thin evidence. The head comment of `fiezel-core-brain.js` states the principle: *"a model that is confident on three answers is more dangerous than no model at all, because it sounds convincing."* |
| **Graceful degradation** | Every call site guards for a missing module and falls back to older behaviour. |
| **Documented reasoning** | The source comments record *why* decisions were made, including reversals and the owner's own corrections. This is unusually valuable for a buyer inheriting the code. |

### What is genuinely weak

| Weakness | Severity | Note |
|---|---|---|
| **No parameter is calibrated against real learners** | **High** | Every constant in §2–§7 is a reasoned default. |
| **No outcome validation whatsoever** | **High** | See AUDIT 05 §6. |
| **The orchestration lives in `app.js`, not Braincore** | **High** | The main obstacle to a clean sale. See AUDIT 02 §4. |
| Silent `catch{}` blocks hide module failure | Medium | A failing module degrades silently with no alarm. |
| 6 modules run in shadow, 5 are not wired at all | Medium | Unconnected inventory, not broken code. |
| Confusion matrix's `suggestPrerequisiteEdges` unused | Medium | Built, tested, ignored. |
| `GUESS_FLOOR` assumes 4 options | Low | Mis-models 3- or 5-option items. |
| `LANG_TH = 1` is an untested transfer | Low, self-flagged | The source says so itself. |

---

## 11. Is Braincore "smart"?

Answering the owner's original instruction — *"make FIEZEL's core brain smarter and more
brilliant than before"* — as honestly as the evidence allows:

**Yes, in the sense that matters technically.** Braincore reasons about a learner with several
independent, well-chosen models that each know how confident they are, and it combines them
with explicit weighting rather than averaging everything together. Compared with the
"averages and fixed thresholds" system its own documentation says it replaced, this is a large
and real advance. The four problems it set out to solve — averages have no direction, level ±1
is not the right difficulty, a weak skill is not the root cause, forgetting is not linear —
are each addressed with a specific, appropriate model.

**But "smart" has two meanings, and only one is proven.** Braincore is demonstrably
*sophisticated*. Whether it is *effective* — whether children learn more because of it — is
**not known**, has never been measured, and cannot be measured until the telemetry lane is
switched on and a study is run.

Both halves of that sentence must appear in anything shown to a buyer.

---

*End of AUDIT 04.*
