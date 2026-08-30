# Braincore — Overview

*A plain-language description of what FIEZEL Braincore is, for someone evaluating it as a
technology asset.*

---

## What it is, in one paragraph

Braincore is an **adaptive learning engine**: the part of a learning app that decides what a
student should do next, how well they actually know each thing, when they are about to forget
it, and what specific misunderstanding is causing their mistakes. It is 21 self-contained
JavaScript modules — 8,899 lines — with **no dependencies on any other software whatsoever**,
accompanied by 6,522 lines of tests that all pass.

---

## What it actually does

When a student answers a question, Braincore does the following:

1. **Predicts, before they answer,** how likely this student is to get this question right.
2. **Decides how much to trust the answer.** A correct answer given in under two seconds on a
   four-option question is treated as weak evidence, not strong. A beginner failing a question
   written entirely in English may have failed to *read* it rather than failed the grammar —
   Braincore discounts that evidence by more than half.
3. **Updates its estimate of what the student knows**, using Bayesian Knowledge Tracing — and
   refuses to declare mastery on a lucky streak, requiring both high confidence *and* at least
   five observations.
4. **Works out when they will forget it**, using a memory half-life model, and schedules the
   next review from that.
5. **Identifies the specific misunderstanding** behind a wrong answer, and tracks how strongly
   it believes the student holds it — slowly building belief, quickly letting it go, and
   requiring evidence from more than one session before it will accuse a student of anything.
6. **Notices frustration or boredom** from patterns in timing and accuracy, and shifts the
   difficulty target accordingly — easier when frustrated, harder when bored.
7. **Picks the next question** at the difficulty where the student has roughly an 80% chance of
   success — hard enough to be worth doing, easy enough not to demoralise.
8. **Decides whether to re-teach, hint, or move on**, and can break a hard question into two or
   three guided steps.

Every one of those decisions comes with a **reason code** and a **confidence value**. There
are no unexplainable decisions.

---

## What makes it unusual

### 1. It is pure calculation

None of the 21 modules can draw on the screen, call the internet, save anything, use a random
number, or look at the clock. They take numbers in and give numbers back.

**Why that matters:** it can be tested exactly, it produces the same answer every time, it
cannot leak a student's data because it has no way to send anything anywhere, and it can be
moved into a completely different product without dragging FIEZEL's screens along with it.

### 2. It knows how confident it is, and says so

The design principle is written into the source code:

> *"A model that is confident on three answers is more dangerous than no model at all, because
> it sounds convincing."*

Every model returns a `confidence` value and an evidence count, and callers are explicitly
allowed to ignore it when the evidence is thin.

### 3. It is careful about accusing students

The misconception tracker starts sceptical, needs evidence from at least two separate sessions,
uses different thresholds for deciding a misunderstanding is present versus resolved (so a
student does not flicker between the two), and lets old beliefs fade over two weeks.

**Plain language:** the system is deliberately slow to conclude "this child misunderstands
this", and quick to let go of it. For a tool that tells children what they are bad at, that is
the right way round.

### 4. It separates reading difficulty from subject difficulty

Most language-learning systems miss this entirely. If a beginner fails an English-language
grammar question, you cannot tell whether they failed the grammar or failed to read the
question. Braincore weights that evidence at 0.45 instead of 1.0 — a quantified correction for
a confound that usually goes unhandled.

### 5. It works with no internet at all

The whole engine runs on the student's device. If the server disappeared permanently, every
student could keep learning, with full adaptivity, indefinitely.

---

## What it is honestly *not*

This section is here because a buyer will find these out anyway, and it is better that they
read them here first.

| Not true | Reality |
|---|---|
| "It learns from all students and gets smarter" | **No.** Each device learns only about its own student. The pipework for population learning was designed and partly built, but is switched off and has no return path. |
| "It is proven to improve learning" | **No.** Every test proves the *code* is correct. **No test, and no data, shows a student learns more because of it.** No A/B test has been run. |
| "It's a drop-in library" | **No.** The engine is clean, but the wiring that connects it to storage and a screen lives in the FIEZEL app. A buyer must rebuild about 800–1,000 lines — roughly one engineer for a month. |
| "It's a general-purpose tutoring engine" | **Partly.** The mastery, memory, difficulty, evidence and tutoring models are subject-neutral. The CEFR level scale, the language-load model and the misconception taxonomy are specific to English learning. |
| "It's finished" | **10 of 21 modules genuinely drive the student's experience. 6 run and observe. 5 are built, tested, and not connected to anything.** |

---

## The numbers

| | |
|---|---|
| Modules | 21 |
| Lines of engine code | 8,899 |
| Lines of tests | 6,522 |
| Test result | **24 / 24 pass** (executed and verified) |
| Lines of simulation harness | 3,049 |
| Third-party dependencies | **0** |
| Licence obligations inherited | **None** |
| Modules driving the student experience today | 10 |
| Modules observing only | 6 |
| Modules built but not connected | 5 |
| Estimated integration effort for a buyer | 4–6 weeks, one engineer |

---

## Who this is worth something to

- A language-learning product that wants real adaptivity without spending a year building the
  research groundwork.
- An education company that needs an adaptive engine that provably cannot exfiltrate student
  data — because it structurally cannot.
- A team building for low-connectivity markets, where an engine that works fully offline is
  worth more than one that needs a server.
- A buyer who wants the *skeleton* of an adaptive engine for a different subject and is willing
  to replace the level scale and the taxonomy.

---

## Where to read more

| Question | Document |
|---|---|
| What are all 21 modules, and which really work? | `AUDIT/01_BRAINCORE_COMPONENT_MAP.md` |
| How does one learning interaction actually flow? | `AUDIT/02_BRAINCORE_DATA_FLOW.md` |
| What is stored where, and is it private? | `AUDIT/03_LOCAL_SERVER_DATA_MAP.md` |
| Are the algorithms any good? | `AUDIT/04_BRAINCORE_TECHNICAL_ASSESSMENT.md` |
| Do the tests actually pass? | `AUDIT/05_BRAINCORE_TEST_STATUS.md` |
| What licences apply? | `IP/THIRD_PARTY_LICENSES.md` |
| Can it really be separated? | `SALE/CORE_SEPARATION_ANALYSIS.md` |
| What is wrong with it? | `SALE/KNOWN_LIMITATIONS.md` |
| Overall verdict | `FINAL/BRAINCORE_READINESS_REPORT.md` |

---

*Every claim in this document is traceable to a numbered finding in the audit set. Nothing here
is a projection.*
