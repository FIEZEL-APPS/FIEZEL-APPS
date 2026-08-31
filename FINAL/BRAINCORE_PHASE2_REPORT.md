# FINAL — Braincore Phase 2 Report

**Date:** 2026-08-31
**Repository:** `FIEZEL-APPS/FIEZEL-APPS`, branch `claude/braincore-ip-audit-d3uk0o`
**Braincore version:** 3.0.0 · 23 modules · build `m025-217`
**Scope:** Phase 2 — *activate, measure, validate, prove*

---

## The question this phase was given

> *When a learner interacts with FIEZEL, does Braincore actually observe the learner, update its
> internal state, and make a different learning decision because of what it observed?*

**Answer: yes, and it is now demonstrable in one command.** `node braincore-demo.js` runs the real
engine and prints four contrasts in which the only thing that changes is what the learner did.

That is the whole of the answer. It is a claim about **mechanism**, not about **teaching**.
Sections 9 and 10 keep those two apart, because everything that follows depends on not confusing
them.

---

## 1. What we activated

Phase 1 ended with 23 pure modules that were known to *exist* and largely unknown to *run
together*. Phase 2 built the road that runs them.

| Built | What it is |
|---|---|
| `features/brain/fiezel-decision-trace.js` | A closed-vocabulary record of one decision: evidence in, state before, state after, decision out, reasons. Rejects malformed input by **throwing**, never by trimming. |
| `braincore-pipeline.js` | One learner answer through the whole decision path — credibility → mastery → memory → misconception → difficulty → next action — calling the real modules, runnable in Node with no DOM. |
| `braincore-runtime.js` | The standalone front door a buyer would integrate against. Owns learner state; owns no storage, network, DOM, telemetry or clock. |
| `braincore-benchmark.js` + 24 scenarios | A repeatable ruler for the per-answer decision path. |
| `braincore-baseline.js`, `braincore-comparison.js` | A non-adaptive control engine and a paired comparator. |
| `braincore-metrics.js` | Five learning-outcome metrics, defined as code. |
| `braincore-study.js` | 1,620 paired runs, 64,800 simulated interactions, bootstrap confidence intervals. |
| `features/brain/fiezel-braincore-evidence.js` | The real-learner evidence schema — shipped **off**. |
| `braincore-demo.js` | The buyer demonstration (Phase Q). |

Every one of these is registered in `quality.yml`. None of them is a mock of a Braincore module:
the only things the harnesses supply are the learner and the question.

**Authority today:** of 23 modules, **10 are `active`** (their output changes what the learner
sees), **6 are `shadow`** (they run, their decisions are discarded), **7 are `off`**. That split is
verified against `app.js` wiring by `brain-manifest-test.js` rather than asserted as a constant.

---

## 2. What was already working before we touched it

This section exists to keep Phase 2 from taking credit for the product.

- **The mathematics was sound.** BKT, the memory model, evidence credibility weighting, item
  calibration and the misconception ledger were all correct and already wired into production.
- **The safety gates were already there, and they are unusually good.** The misconception ledger's
  `MIN_SESSIONS = 2` / `MIN_EVIDENCE = 3` requirement — an accusation must survive a second
  session — was pre-existing. So was the guess-speed evidence discount, and the `evidence_mismatch`
  rule that discards evidence from a broken item entirely.
- **Purity was real, not aspirational.** No module touches the network, storage, DOM, `Math.random`
  or the clock. Phase L proved this by *executing* the whole bundle in a sandbox where those things
  do not exist at all.
- **The tutor already had eight distinct moves with named reasons.** Phase F did not invent the
  vocabulary; it stopped the recorder from throwing it away.

**The engine was in better shape than its instrumentation.** Most of what follows is measurement
catching up with code that was already correct.

---

## 3. What we fixed

Two categories, kept separate on purpose: defects in the **product**, and defects in **my own
measuring apparatus**. Confusing the two is how an audit ends up reporting a harness bug as a
product flaw.

### 3a. In the product

| Fix | What was wrong | Evidence |
|---|---|---|
| **Over-re-teaching competent learners** (owner-requested) | Two misses from a learner the engine *already knew* was competent (mean mastery 0.93 on 21 answers) triggered a full re-teach. Above `MASTERY_NO_RETEACH = 0.8` this is now read as a slip and answered with a hint. | `AUDIT/13` |
| **False misconception labelling** | `persistent_misconception` was reported on items carrying no misconception data at all, where the honest diagnosis is "wrong twice on the same skill". Now a misconception may only be *named* when there is evidence for one. | `AUDIT/13` §2a |
| **Reason codes computed then discarded** | Five modules produced `brain3_*` reasons that never reached the trace. Ordinary correct and ordinary wrong answers — the two most common events in the product — recorded **no reason at all**. | `AUDIT/07` |
| **Manifest authority out of date** | `stepTutor` and `productionGrader` were recorded `off` on a stale rationale. Both are `active`; the gate now reads `app.js`. | `AUDIT/16` |
| **False "frozen exports" claim in sale documents** | Two documents claimed nothing could be monkey-patched at runtime. 4 of 23 modules freeze. Corrected and pinned to reality by a gate. | `AUDIT/16` |

The over-re-teaching fix has an important negative result attached: **struggling learners were not
touched.** After the fix, the engine still re-teaches a struggling learner **20.08 times per run**
versus **0.14** for a competent one — a **154× ratio**, asserted by a gate. The cheap way to fix
over-remediation is to remediate less; that is not what happened, and it is checked.

### 3b. In my own harness — reported because hiding them would corrupt everything above

| Defect | Consequence | Where |
|---|---|---|
| `estimateAbility` fed `correct` where the module reads `ok` | Every answer read as wrong. The estimate pinned at its floor (0.40) against true ability 2.3–3.7. **This invalidated a published "Braincore is proven worse" headline**, which is retracted. | `AUDIT/12` |
| `Calibration.observe()` called with invented field names | Item calibration was a silent no-op through Phases C–F. `app.js` calls it correctly, so this never affected a learner. | `AUDIT/09` §1 |
| `mode: 'mcq'` is not a real production mode | Three phases measured at the wrong difficulty. Conclusions re-verified after the fix. | `AUDIT/07` |
| Comparing BKT `L` against accuracy-based truth | Apples to oranges. Replaced; the wrong number was kept under a name that says it is not comparable. | `AUDIT/10` |
| My own coverage gate had a hole | A mutation that reverted the fix stayed green. | `AUDIT/07` §4b |
| Keyword assertions testing spelling, not meaning — **four times** | e.g. matching "cohort" that meant *item* cohort, not *learner* cohort. | `AUDIT/15`, `AUDIT/16` |
| A mutation test that silently did not mutate | Guessed the wrong signature; `String.replace` does not error on a miss. Mutations now assert they landed. | `AUDIT/15` |
| My Phase M gate injected `global.fetch`, turning `no-network-test.js` red | My defect, in CI, for several commits. The gate was removed — it broke a rule *and* proved nothing. | commit `336fb6b` |

**Eight harness defects against five product defects.** That ratio is the most honest single number
in this report: the instrument was less reliable than the thing it measured, and every finding
below survived only because the instrument was checked against itself.

---

## 4. What we measured

Five metrics, defined as code (`braincore-metrics.js`) so a buyer can argue with the ruler instead
of guessing at it. The governing rule: **"not measurable" returns `null`, never `0`**, and every
value carries `n`.

| metric | value | meaning |
|---|---|---|
| `masteryAccuracy` | **0.1802** (n=45) | mean \|predicted − empirical\| for P(correct). Lower is better. |
| `retention` (spacing monotonicity) | **1.0** (n=5 gap pairs) | longer gap ⇒ larger stability gain. **This one could have failed. It did not.** |
| `adaptationQuality` | **0.9743** (n=41, 4 unmeasurable) | proportion of difficulty steps whose direction makes sense |
| `interventionEfficiency` | **0.0333** (n=6, **39 unmeasurable**) | proportion of re-teaches aimed at learners who already know it. Lower is better. |
| `misconceptionRecovery` | **6** correct answers | evidence required before an active misconception resolves |
| `retention` (sign) | 1.0 (n=45) | **tautological** — a wiring check, and it says so |

Two of these six rows are deliberately unflattering. `interventionEfficiency` is unmeasurable for
**39 of 45** learners, because only 6 sit in the band where the question applies; publishing
`0.0333` without that denominator would be a far stronger claim than the evidence supports. And one
metric is labelled a tautology in its own output rather than counted as a pass.

No quality thresholds are asserted anywhere in the metric layer. A threshold invented today, with
no real learner behind it, would be a number pretending to be a standard.

---

## 5. Benchmark results

**24 deterministic scenarios, all matching, on Braincore 3.0.0** (`node braincore-benchmark.js`).

The eight required measurements each have at least one owning scenario, asserted by the gate:
mastery response, memory response, misconception persistence, difficulty adaptation, evidence
credibility, next-action selection, consistency, regression safety.

**What "24/24 matched" means, and it is narrower than it sounds.** The expectations were *recorded
from this engine*. They are not derived from learning theory and not validated against real
learners. The benchmark therefore proves **stability and comparability** — "this release decides
exactly as yesterday's did", and "two releases can be compared on identical scenarios" — and it
proves **nothing about correctness**. It cannot tell anyone that re-teaching after two misses is
pedagogically right.

Reading "24/24 matched" as "Braincore is correct" is the most likely misreading of that file, so
the sentence is printed in the runner, in the report, and inside the JSON itself.

The benchmark earned its place on its first run by finding a real defect: the silent item-calibration
no-op described in §3b.

---

## 6. Baseline comparison

Braincore was compared against `braincore-baseline.js` — a deliberately non-adaptive control that
answers the question "what would a competent engineer build without any of this?"

**The headline finding was retracted and reversed.** The first comparison reported Braincore as
*proven worse* on estimate accuracy. That result was produced by the `ok`/`correct` field defect in
my harness (§3b): the estimator had never been shown a single correct answer. `AUDIT/10` is marked
**RETRACTED IN PART**; the retraction and the re-measurement are in `AUDIT/12`.

The corrected comparison is reported in §7, because after the fix the comparison and the study are
the same measurement at different sample sizes.

The reason this reversal is stated so prominently: it is the clearest evidence in the whole audit
that a confident, well-formatted, internally consistent negative result can be entirely wrong. That
should temper how much weight anyone puts on the positive results too.

---

## 7. Simulation results

**1,620 paired runs · 64,800 simulated interactions · 3,000-iteration paired bootstrap (seed 20260830).**
Layer measured: the per-answer decision path (18 modules). **Item selection is not measured here** —
that layer belongs to `adaptivity-simulation-v3.js`, and the two must not be merged into one headline.

| metric | question | baseline | Braincore | mean diff | 95% CI | verdict |
|---|---|---|---|---|---|---|
| `trackingError` | how close is the estimate to empirical truth? | 0.1305 | **0.1071** | −0.0235 | [−0.0268, −0.0200] | **proven better** |
| `reteachSia2` | how often does it re-teach someone who already knows? | 0.3881 | **0.1095** | −0.2786 | [−0.3682, −0.1990] | **proven, below the practical margin** |
| `advanceLewat` | how often does it promote someone who is not ready? | 0 | 0 | 0 | [0, 0] | **inconclusive** |

### Read the split, not the total

| arm | `trackingError` verdict |
|---|---|
| learner static | **proven better** [−0.0328, −0.0204] |
| learner declining | **proven better** [−0.0424, −0.0347] |
| learner improving | **inconclusive** [−0.0123, +0.0016] |

**Braincore's weakest case is a learner who is getting better** — precisely the case a learning
product most wants to get right. A residual negative bias remains: it tends to under-estimate, so
it is slowest to notice improvement. This is stated here rather than buried because the combined
row hides it.

`inconclusive` means the interval **embraces zero**. It does not mean "roughly equal", and it must
never be written up as "better".

### On the re-teaching margin

`reteachSia2` improved by 72% and is now well below the baseline. The study still reports it as
*below the practical margin*, because the margin (0.5) was declared **before** the fix, when the gap
ran the other way. **The margin was not lowered afterwards to claim a larger win.** Doing so would
have been easy, invisible, and exactly the failure this study was built to prevent.

### Bounds on all of it

1. Every learner is synthetic.
2. The simulated learner generates answers through **Core Brain's own success curve**. These numbers
   are therefore an **upper bound for Braincore**, not a neutral estimate.
3. Latent ability moves only as the arm dictates; nothing here measures whether Braincore *causes*
   learning.

---

## 8. Real learner evidence readiness

`features/brain/fiezel-braincore-evidence.js` + `BRAINCORE-EVIDENCE-SCHEMA.md`.

**Status: ready, and shipped off.** The evidence path is `'off'` in the manifest, enforced by
`braincore-version-safety-test.js`.

What the schema does, enforced by **throwing**, not by trimming:

- **No identity.** No learner id, no name, no device id, no free text.
- **No timestamps that could rejoin a session.** Raw milliseconds are rejected.
- **No synthetic misconception keys.** `unclassified:*` is refused, so "wrong twice on the same
  skill" can never be laundered into "has this misconception".
- **No transport.** The module has no way to send anything anywhere; Phase L proves this by running
  it where `fetch` does not exist.

Phase M established a further property nobody had checked: the same learning session was run in four
worlds — normal, offline, server returning 500, and no transport at all — and the decisions must be
**identical**. Not "still present": identical. Telemetry can never become a precondition for
learning.

**What is not ready:** no real learner has produced a single row. Consent, retention policy, and the
question of who owns the resulting data are owner and legal decisions, not engineering ones, and
none of them is answered here.

---

## 9. What Braincore can actually prove

Each line below is backed by a gate that fails if the claim stops being true.

1. **It observes more than right/wrong.** Two learners with identical scores (mastery 1.0, n=7)
   receive different decisions, separated only by how the answers arrived. — `braincore-demo.js` Q1
2. **It distinguishes a pattern from a pile of mistakes.** Four wrong answers with one repeated
   misunderstanding change the path; four scattered wrong answers do not. — Q2
3. **It withholds accusations.** A misconception requires evidence across two separate sessions.
   One bad afternoon is not enough. — Q2
4. **It schedules from evidence, not the calendar.** Same 30-day gap: 102 days out if the learner
   still knew it, 0.4 days if they had forgotten. — Q3
5. **It weighs evidence rather than counting it.** Considered = 1.0, guess-speed = 0.3, flagged
   item = 0.0 — and the guesser is not promoted, with the reason named
   (`streak_but_guessing`). — Q4
6. **It can explain every decision.** Reason coverage went 0/10 → 10/10 on a mixed session; all 8
   tutor moves both map into the trace enum and are reachable end-to-end.
7. **It runs entirely locally.** 23 modules load and run a full learning session in a sandbox with
   no `fetch`, `XMLHttpRequest`, `navigator`, `localStorage`, `document` or `Date` — not disabled,
   never present.
8. **It is deterministic and comparable.** Identical inputs give identical state *and* identical
   traces; 24 benchmark scenarios pin the decision path release-over-release.
9. **Its estimate is closer to the truth than a non-adaptive baseline** for static and declining
   learners, with confidence intervals — **and not for improving learners** (§7).
10. **It re-teaches competent learners far less than before**, without reducing support for
    struggling ones (154× ratio, gated).

---

## 10. What it still cannot prove

**The one that matters most: there is no evidence that Braincore helps anyone learn more.**

Not "weak evidence". None. Every learner in every measurement above is synthetic, and the simulated
learner answers through Braincore's own success curve — which makes the simulation an upper bound
for Braincore rather than a fair test.

Also not proven:

- **That any decision is pedagogically right.** The benchmark proves stability, not correctness. No
  data here can tell you that re-teaching after two misses is the right thing to do.
- **That the thresholds are right.** `MASTERY_NO_RETEACH = 0.8`, `MIN_SESSIONS = 2`,
  `MIN_EVIDENCE = 3`, the BKT priors, the credibility weights — **none has been calibrated against a
  real learner.** They are defensible judgements written where they can be argued with.
- **That the improving-learner case is handled well.** It is the one arm where the estimate is
  *inconclusive*, and the residual bias runs in the least helpful direction.
- **That the item-selection layer behaves as the per-answer layer does.** Different layer, different
  harness, different verdict. Do not merge them.
- **That Braincore is "superior".** That sentence does not appear in this report, and the evidence
  does not support it. What the evidence supports is narrower and worth stating precisely: *on one
  measured layer, against one non-adaptive baseline, on synthetic learners, its estimate tracks
  truth more closely for static and declining learners.*
- **That it is legally cleared for sale.** No qualified legal professional has reviewed it. Phase 1
  left licence questions marked UNKNOWN rather than guessed, and they remain UNKNOWN.

---

## 11. Remaining bugs

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | `fiezel-evolution-loop-test.js` — exceeded the audit's time ceiling | UNKNOWN | Neither pass nor fail is claimed. Never converted to "pass". |
| 2 | `release-audit-gate-test.js` — same, measured at 461 s | UNKNOWN → slow-pass | Passes when given time; still not treated as verified. |
| 3 | `vendor/kokoro-js/kokoro.web.js` hash-lock tests | Pre-existing | Fail on a clean `main` checkout in this environment; confirmed untouched by this branch. |
| 4 | `cf-wiring-test.js`, `tools/fiezel-health-probe.mjs` | Expected | Require live Cloudflare D1 / the live site. Not defects. |
| 5 | `analytics-client-test.js` flaked under CPU load | Fixed | Reported by this audit; fixed in `f445e49` by another session (waits for the condition instead of a fixed settle). |

**Nothing in this table is a Braincore defect.** Every open item is infrastructure, vendor, or a
timing ceiling. That is a real result, and it is also a narrow one: it means no *known* Braincore
bug is open, not that none exists.

---

## 12. Remaining architectural risks

1. **Braincore cannot be dropped in.** ~800–1,000 lines of host wiring live in `app.js` and would
   have to be rebuilt by a buyer. `braincore-runtime.js` narrows this but does not close it.
2. **Six modules are `shadow`.** They run and their decisions are discarded. A buyer reading "23
   modules" is entitled to know that 10 are `active`, 6 shadow, 7 off.
3. **Silent `catch {}` in the host.** The pattern that hid three of my own harness defects also
   exists in `app.js`: a module that stops working degrades quietly. The Braincore harnesses now
   record and surface every caught error; the host does not.
4. **`app.js` and the pipeline can drift.** `braincore-pipeline.js` mirrors the production order and
   parameters but *is not* `app.js`. The line-number pins and their gate reduce this risk; they do
   not remove it. A measuring instrument that quietly starts measuring something else is more
   dangerous than no instrument.
5. **Only 4 of 23 modules freeze their exports.** Runtime monkey-patching is possible. Documented
   accurately now, but unchanged.
6. **Every parameter is uncalibrated.** See §10. This is the single largest technical risk to a
   buyer, and it cannot be closed without real learners.
7. **Benchmark expectations can be blessed away.** `--write-expectations` will happily record a
   regression as the new truth. The warning is loud and the command is deliberate, but the door
   exists.

---

## 13. Recommended Phase 3

In priority order. The first item is worth more than all the others combined.

**1. Get real learners in front of it — the smallest honest study, not the biggest one.**
Everything in §10 turns on this and nothing else can substitute. The evidence schema is built,
privacy-preserving, and off; turning it on for a consenting cohort is now a *decision*, not a
project. Suggested first question, deliberately narrow: **does the over-re-teaching fix reduce
re-teaching for real competent learners, without reducing support for real struggling ones?** It is
already measurable, already gated, and it is the one change Phase 2 made to production behaviour.

**2. Calibrate the thresholds against that cohort.** `MASTERY_NO_RETEACH`, the BKT priors, the
credibility weights, `MIN_EVIDENCE`. Today they are judgements. After a cohort, they can be
evidence. This is the difference between a plausible engine and a defensible one.

**3. Fix the improving-learner bias.** The one arm where the estimate is *inconclusive* and the bias
runs the wrong way. It is also the most commercially awkward gap in the story, and the fix is
measurable with machinery that already exists.

**4. Close the host-wiring gap.** Every line moved from `app.js` into `braincore-runtime.js` is a
line a buyer does not have to rebuild, and it directly raises what Braincore is worth on its own.

**5. Make the shadow modules earn their place.** Six modules run and are ignored. Each should be
promoted to `active` with evidence, or turned `off`. "Shadow" is a reasonable state to pass through
and a poor one to sell.

**6. Legal review.** Licence questions from Phase 1 remain UNKNOWN. **Braincore must not be
described as cleared for sale until a qualified legal professional has reviewed it.** Nothing in
this audit changes that, and nothing in it should be quoted as if it did.

**Explicitly not recommended for Phase 3: Global Learning Intelligence.** The interface is
documented (`AUDIT/16`); the implementation is out of scope and the prohibition is enforced by a
gate. Braincore must never rewrite its own production code because of learner data.

---

## For the owner, in plain language

You asked whether the brain inside FIEZEL really pays attention to a student, or only looks like it
does. The answer is that it really does, and now anyone can watch it happen: one command, four
stories, real numbers from the real engine.

The most useful thing to understand is what that does and does not settle.

**It settles that the machine is paying attention.** Two students with identical scores are treated
differently, because one of them recalled the answers and the other had to work for them. A student
who is wrong the same way four times gets the lesson re-taught; a student who is wrong about four
different things does not get accused of a pattern that is not there — and even the first student
has to show the pattern in two separate sessions before the machine will say what they misunderstand.
Someone who clicks too fast to have read the question is not promoted, and the machine says why.

**It does not settle that the machine teaches better.** Every student in every test was simulated.
That is the honest boundary, and it is the one thing worth spending Phase 3 on.

One more thing worth saying plainly, because it affects how much to trust the rest. During this
phase I found **eight defects in my own measuring tools against five in your product** — including
one that made me report, confidently and with statistics attached, that your engine was *worse* than
a simple one. It was not; my instrument had never shown it a single correct answer. That result is
retracted and the corrected measurement is in this report. Your engine came out of this audit in
better shape than the tools I was checking it with, and the reason you can trust the good news above
is that the bad news is in here too.

---

## Document index

| Document | Covers |
|---|---|
| `AUDIT/07`–`AUDIT/17` | Phases F through Q, one per phase |
| `AUDIT/12` | The retraction, in full |
| `AUDIT/13` | The over-re-teaching fix the owner asked for |
| `SALE/BRAINCORE_DEMONSTRATION.md` | The buyer demonstration, transcript generated from the live run |
| `SALE/KNOWN_LIMITATIONS.md` | Limitations, severity-ranked |
| `FINAL/BRAINCORE_READINESS_REPORT.md` | Phase 1 readiness report |
| `simulations/summary.md` | The full study, per-arm |
| `BRAINCORE-EVIDENCE-SCHEMA.md` | Real-learner evidence contract |

**Reproduce everything in this report:**

```
node braincore-demo.js          # the four demonstrations
node braincore-benchmark.js     # 24 scenarios
node braincore-study.js         # the full paired study
node braincore-demo-test.js     # the demonstration's own gate
```
