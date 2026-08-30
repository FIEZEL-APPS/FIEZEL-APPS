# AUDIT 01 — Braincore Component Map

**What this document is:** the answer to "what exactly *is* Braincore, which files are it,
and which parts really work versus which parts merely exist?"

**Method — and why it matters.** The repository already contains its own self-description:
`features/brain/fiezel-brain-manifest.js` declares which modules are `active`, `shadow`, or
`off`. **This audit did not trust that file.** Every claim below was re-derived by reading
`app.js` and `index.html` directly and finding the actual call sites. That turned out to be
the right decision — see §5, which documents two places where the repository's own
self-description is now **out of date**.

---

## 1. Where Braincore lives

Braincore is the folder **`features/brain/`**: **21 JavaScript files, 8,899 lines.**

It is not a library that gets installed, and it is not a service that runs on a server. All
21 files are plain scripts loaded straight into the student's browser by `index.html`.

### The one structural property that makes Braincore a sellable asset

Every one of the 21 files was checked, line by line, for the following: reading or writing
the page (`document.`), calling the network (`fetch`), touching storage
(`localStorage`/`indexedDB`), or using anything unpredictable (`Math.random`, `Date.now()`).

**Result: zero occurrences across all 21 files.** Every mention of those words in the folder
is inside a comment explaining why they are forbidden.

**Plain language, because this is the single most commercially important fact in the audit:**
Braincore is *pure calculation*. You give it numbers, it gives you numbers back. It never
draws anything on screen, never talks to a server, never saves anything, and never uses a
random number or the clock. Give it the same input twice and you get the same answer twice.

Why a buyer should care:
- It can be tested exactly, as arithmetic, without a browser.
- It can be lifted out and run somewhere else (a server, a phone app, a different product)
  without dragging FIEZEL's screens along with it.
- It cannot silently leak a student's data, because it has no way to send anything anywhere.

This property is enforced by the test suite, not merely intended — `brain-manifest-test.js`
contains a check named "modul murni: tanpa DOM/jaringan/storage/Math.random/Date.now" which
passes.

---

## 2. Status vocabulary used below

| Status | Meaning |
|---|---|
| **IMPLEMENTED** | Code is complete, it is called on a real student path, and its output changes what the student experiences. |
| **PARTIAL** | Code is complete and called, but its output only feeds diagnostics/reporting — the student's experience does not change. (The repository calls this "shadow".) |
| **EXPERIMENTAL** | Code is complete and loaded into the browser, but nothing calls it on any student path. It runs nowhere. |
| **UNUSED** | Code is present in the repository but not even loaded into the app. |
| **UNKNOWN** | Could not be determined from the source. |

A file existing was never treated as evidence that it works.

---

## 3. The component map

| # | Component | File (`features/brain/`) | Purpose (plain language) | Input | Output | Status |
|---|---|---|---|---|---|---|
| 1 | **Core Brain** | `fiezel-core-brain.js` (1,463 lines) | The main reasoning engine: how good is this student, how hard should the next question be, when will they forget this, are they improving, what is the root cause of their errors | Answer history, level, timestamps, curriculum graph | Ability estimate, optimal difficulty, memory half-life, next-review date, trend, root cause, session plan | **IMPLEMENTED** |
| 2 | **Tutor Brain** | `fiezel-tutor-brain.js` (835 lines) | Runs the tutoring conversation: diagnoses a wrong answer, decides whether to re-teach or move on, picks the next question | Question pool, session state, prior misconceptions | Diagnosis, next question, scaffold level, tutor turn | **IMPLEMENTED** |
| 3 | **Misconception Ledger** | `fiezel-misconception-ledger.js` | Remembers *specific wrong ideas* a student holds, and how strongly, with decay over time | Wrong answers, timing, sessions | Active/resolved misconception list with belief scores | **IMPLEMENTED** |
| 4 | **Item Prior** | `fiezel-item-prior.js` | Estimates how hard a question is *before* anyone answers it, from its shape | Question level, mode, stem length | Difficulty number + explanation | **IMPLEMENTED** |
| 5 | **Item Calibration** | `fiezel-item-calibration.js` | Corrects that estimate using how real students actually performed | Answer outcomes per item | Calibrated difficulty (`effective()`) | **IMPLEMENTED** |
| 6 | **Evidence Credibility** | `fiezel-evidence-credibility.js` | Decides how much to trust a single answer — a lucky 1-second guess is weaker evidence than a considered answer | Answer, time taken, replays, language load | Weight (kappa) 0–1 | **IMPLEMENTED** |
| 7 | **Affect** | `fiezel-affect.js` | Detects frustration or boredom from answer patterns and timing | Recent answers with timings | State (`frustrated`/`bored`/`neutral`/`curious`) + confidence + suggestion | **IMPLEMENTED** |
| 8 | **SRL Coach** | `fiezel-srl-coach.js` | Self-regulated-learning coaching: plans the session, asks the student to predict their own performance, fades support as they improve | Session history, predictions vs outcomes | Session plan, prediction prompt, reflection | **IMPLEMENTED** |
| 9 | **Production Grader** | `fiezel-production-grader.js` | Grades *typed* answers: exact match, near-typo tolerance, distractor detection, wrong-word-form detection | Typed text, correct answer, alternates, distractors | Correct/incorrect + reason + matched misconception | **IMPLEMENTED** ⚠️ *(manifest says `off` — see §5)* |
| 10 | **Step Tutor** | `fiezel-step-tutor.js` | Breaks a hard question into 2–3 guided steps | Question stem, reasoning operation | Step list + final question | **IMPLEMENTED** ⚠️ *(manifest says `off` — see §5)* |
| 11 | **Mastery BKT** | `fiezel-mastery-bkt.js` | Bayesian Knowledge Tracing — probability the student has actually learned a skill | Answer outcomes + credibility weight | Mastery probability per lesson, gate, frontier | **PARTIAL** — evidence is recorded and read for one gate, but unlocking is still decided by the older engine |
| 12 | **Confusion Matrix** | `fiezel-confusion-matrix.js` | Records *which* wrong option was chosen, to find systematically confused pairs | Wrong answers with the selected option | Confusion cells, suggested prerequisite edges | **PARTIAL** — written and displayed, never used for a decision |
| 13 | **OLM (Open Learner Model)** | `fiezel-olm.js` | Produces a student-readable summary of their own model, and lets them dispute it | Mastery, calibration, retrievability | Summary, negotiation record | **PARTIAL** — diagnostic panel only |
| 14 | **Listening Adaptive** | `fiezel-listening-adaptive.js` | Chooses audio speed, clip length and replay allowance | Listening answer history | Playback policy | **PARTIAL** — policy computed and attached to the question, but nothing reads it back to change playback |
| 15 | **Speaking Adaptive** | `fiezel-speaking-adaptive.js` | Chooses speaking task complexity and scaffolding | Speaking evidence, latency, noise | Speaking policy | **PARTIAL** — read by the Speaking Lab hook; the decision path is not proven |
| 16 | **Brain Manifest** | `fiezel-brain-manifest.js` | Declares the bundle's identity and which modules have authority | (static) | Bundle version, module list, authority map | **PARTIAL** — descriptive only; and **currently inaccurate**, see §5 |
| 17 | **Learning Metrics** | `fiezel-learning-metrics.js` | Longitudinal measures: learning gain, retention at gap, Brier calibration, hint dependency, misconception persistence | Long-run history | Metric set with confidence | **EXPERIMENTAL** — loaded, zero callers |
| 18 | **Metrics Digest** | `fiezel-metrics-digest.js` | Buckets metrics into privacy-safe bands for reporting | Metric values | Bucketed digest | **EXPERIMENTAL** — loaded, zero callers |
| 19 | **Stat Gate** | `fiezel-stat-gate.js` | Statistics toolkit: Wilson intervals, two-proportion tests, paired bootstrap, sample-size/MDE calculations | Counts and samples | Test statistics | **EXPERIMENTAL** in the app — loaded, zero callers in `app.js`. **Used** by `adaptivity-simulation-v3.js`, `content-promotion.js`, `fiezel-autonomy-config.js` |
| 20 | **Brain Config** | `fiezel-brain-config.js` | Central registry of tuning constants with bounds and sanitisation | Config object | Sanitised config + rejections | **EXPERIMENTAL** — loaded, zero callers; the modules hold their own constants |
| 21 | **Retention Probe** | `fiezel-retention-probe.js` | Schedules delayed retention checks to find fragile knowledge | Lesson state, mastery | Probe schedule (advisory) | **UNUSED** — the only Braincore file **not** loaded by `index.html` or `sw.js` |

### Score

| Status | Count |
|---|---|
| IMPLEMENTED (really changes the student's experience) | **10** |
| PARTIAL (runs, but only informs diagnostics) | **6** |
| EXPERIMENTAL (loaded, never called) | **4** |
| UNUSED (not even loaded) | **1** |
| **Total** | **21** |

**Plain language:** just under half of Braincore is genuinely doing work for the student
today. About a third runs and watches but does not yet get a vote. Five modules are finished
code sitting on the shelf. **None of them are broken — they are simply not plugged in.**
That is a meaningful distinction for a buyer: this is unconnected inventory, not debt.

---

## 4. What is NOT Braincore (but is often mistaken for it)

These carry brain-like names and must not be sold as part of the Braincore asset without
being described accurately:

| File | What it actually is |
|---|---|
| `fiezel-core-worker.js` | A Puter Worker, server-side. Contains a *duplicate* copy of the older adaptive-policy logic. Not part of `features/brain/`. |
| `app.js` (9,584 lines) | The application. It *calls* Braincore. It also contains a large amount of learning logic that has **not** been extracted into `features/brain/` — see AUDIT 02 §4 and the separation analysis. |
| `features/telemetry/*` | Sends learning events out. Not decision-making. |
| `workers/api/learning/*` | The server side of the telemetry lane. Aggregates counters only. |
| `adaptivity-simulation-v3.js` | A simulator that exercises Braincore. Valuable, but it is test equipment, not the engine. |

---

## 5. ⚠️ Finding: the repository's own self-description is out of date

This is the most important defect Phase 1 found, and it is worth reading carefully because
the *type* of defect matters more than its size.

### What the repository says

`features/brain/fiezel-brain-manifest.js` declares:

```
stepTutor: 'off',          // "dimuat index.html tetapi NOL referensi di app.js"
productionGrader: 'off',   // (loaded by index.html but ZERO references in app.js)
```

### What the code actually does

| Module | Real call sites found in `app.js` |
|---|---|
| `FiezelProductionGrader` | `app.js:2330` (`clozeAvailable()` — gates whether typed questions appear at all), `app.js:7944` (`.grade()` — **decides whether the student's typed answer is right or wrong**), `app.js:7954` (`.normalize()` used in the distractor/morpheme guard) |
| `FiezelStepTutor` | `app.js:2712` (`stepTutorGuidance()` calls `.decompose()` to render 2–3 guidance steps to the student before they answer again) |

Both are therefore **IMPLEMENTED**, not `off`. The production grader in particular is about
as "active" as a module can get: its verdict becomes the student's score, and that score
then feeds Mastery BKT (at weight 1.5), item calibration, and the misconception ledger.

### Why the test suite did not catch it — the part that actually matters

`brain-manifest-test.js` contains a test named:

> *"modul tanpa satu pun referensi di app.js dinyatakan off, bukan diaku-aku aktif"*
> (modules with no reference in app.js are declared off, not falsely claimed active)

That name promises the test reads `app.js` and verifies the claim. It does not. The whole
body of the test is:

```js
assert.strictEqual(manifest.authorityMap.stepTutor, 'off');
assert.strictEqual(manifest.authorityMap.productionGrader, 'off');
```

It asserts a hard-coded constant against another hard-coded constant. Both sides are frozen
copies of the same stale belief, so the test agrees with itself forever. **It passes today**
(verified — the whole file reports `BrainManifest: PASS`) while the fact it claims to
protect is false.

**Plain language:** imagine a smoke alarm whose test button, when pressed, plays a recording
of a beep instead of testing the sensor. It passes its test every time, and it would not
save you. This test is that alarm. The other thirteen tests in the same file are real — they
read the source files and compare — which is exactly why this one is easy to miss.

### Honest framing of the risk

- **This is not fraud, and it is not dangerous today.** The manifest *understates* what
  Braincore does. Nobody was misled into thinking a module works when it does not; the error
  runs in the safer direction.
- **But for a sale it is exactly backwards.** A buyer reading the manifest would conclude
  the asset is *less* capable than it is, and a buyer's technical reviewer who finds the
  hollow test will — reasonably — start doubting every other green check in the repository.
- The manifest itself predicted this. Its own comment says authority classification "is the
  result of inspecting `app.js` wiring at one point in time — wiring can change without this
  file changing", and it self-reports `confidence: 0.9` rather than 1.0. **The design was
  honest; the maintenance lapsed.**

### Recommendation (not performed in this audit pass — audit before modify)

1. Correct `authorityMap`: `stepTutor` and `productionGrader` → `'active'`.
2. Replace the hollow test with one that actually reads `app.js` and greps for each module's
   global, so the manifest can never drift silently again.

These are small, low-risk changes. They are recorded here rather than applied because Phase 0
of this engagement forbids modifying the repository before the audit is complete.

---

## 6. What Phase 1 could not determine

- **Whether `speakingPolicy` genuinely influences the Speaking Lab.** The module is called and
  its `evidence()`/`policy()` are read, but the decision path runs through an add-on. Left as
  **PARTIAL** rather than upgraded on an assumption.
- **Whether the 4 EXPERIMENTAL modules were deliberately parked or simply forgotten.** The code
  is complete and tested; the intent is not recorded anywhere this audit could find. Marked
  **UNKNOWN** as to intent, **EXPERIMENTAL** as to fact.

---

*End of AUDIT 01.*
