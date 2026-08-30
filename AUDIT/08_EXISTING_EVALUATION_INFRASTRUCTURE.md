# 08 — What already exists before Phases G–K are built

**Why this document exists.** Phase G asks for a benchmark, Phase H for a baseline comparison,
Phase J for a simulated learner study, Phase K for a learner-evidence schema. Before building any
of them I looked for what the repository already has. **Three of those four already exist in some
form**, built by other sessions, some of them running in CI right now.

Building parallel versions would be exactly the "new architecture" the phase brief forbids — and
worse than wasteful: two independent stacks measuring the same thing will eventually disagree,
and then nobody knows which number to believe.

---

## 1. `adaptivity-simulation-v3.js` — a seeded baseline-vs-Braincore simulator, already in CI

1,951 lines. Registered in `quality.yml` as "Gerbang simulasi adaptivitas v3". Its own header
records why it replaced `adaptivity-simulation.js`: the older simulator used unseeded
`Math.random()` (irreproducible) and its answer generator **ignored the difficulty presented**,
so the learning curve was written into the generator and then "discovered" by the model. Its
words: *demonstrasi, bukan evaluasi* — a demonstration, not an evaluation.

v3 fixes both. Seeded `mulberry32`; synthetic learners with **latent** state (per-family theta,
learning rate, per-item memory stability, slip/guess) that the policy never reads; answers
generated from `successProbability(latent theta, difficulty actually presented)`. Two policies are
compared on the **same** latent learner: `v1` (a mirror of `deriveAdaptivePolicy` — coarse level
±1 from an observed accuracy band, no ability model) versus `v2` (v1 + `CoreBrain.refinePolicy`).

**That is Phase H's baseline comparison, for the policy layer, already built** — including the
deliberately simple baseline Phase H describes.

`adaptivity-simulation-v3-extended.js` (798 lines) adds multi-seed runs and bootstrap confidence
intervals on top, without editing v3.

## 2. It has already answered "is Braincore better?" — and the answer is a trade, not a win

From the extended file's own forensics (50 seeds × 9 profiles, reproduced 2026-08-29):

| measure | result |
|---|---|
| false decline | **−0.0415, CI [−0.0463, −0.0371] — proven better** |
| accuracy / retention / Brier | proven better |
| item-calibration RMSE | −0.0028, CI [−0.012, **+0.0064**] — **embraces zero, inconclusive** |
| residual oscillation | +0.167 per 10 sessions, CI [0.054, 0.275] — statistically significant but **below its own practical threshold**, and it did not generalise: 3 profiles improved 4.22→3.43, 9 jittered profiles went the other way |
| **time to mastery** | **v2 censored in 89.8% of runs vs baseline v1's 55.6%** (CI of difference [0.298, 0.387], against a 0.05 margin). Mastery reached within 35 days: **10.2% vs 44.4%** |

The last row is the one that matters commercially, and the file states it plainly as a fact about
Braincore, not a bug: **`refinePolicy` trades speed-to-mastery for accuracy, retention and
calibration.** It confirms a pre-rebase finding from PR #226 (11.8% vs 56.6%) on a new basis.

**This must not be quietly re-litigated.** Any Phase H/J number I produce that reads as a cleaner
win than this needs to explain why it disagrees with an existing CI-gated measurement — not
replace it.

## 3. What v3 does **not** cover — and this is the real Phase G gap

v3 requires exactly **three** of the twenty-one Braincore modules:

```
fiezel-core-brain.js   fiezel-item-calibration.js   fiezel-stat-gate.js
```

It benchmarks the **item-selection policy**. It does not touch BKT mastery, memory scheduling as
a decision, the misconception ledger, evidence credibility, affect, the item prior, or the tutor's
move selection — the eighteen modules on the **per-answer decision path** that
`braincore-pipeline.js` (Phase C) runs.

So the two are complementary, not competing:

| layer | what decides | measured by |
|---|---|---|
| item-selection policy | which question comes next | `adaptivity-simulation-v3.js` (in CI) |
| per-answer decision path | what to believe, and what to do about it | `braincore-pipeline.js` + Phases C–F gates |

**Phase G should benchmark the second layer and say so, naming the first as already owned.**
A benchmark that silently overlaps v3 would produce a second set of policy numbers with no
statistical machinery behind them.

## 4. `fiezel-learner-evidence-v1` already exists — Phase K is partly built

`app.js` exposes `buildLearnerEvidenceModel()` and `remoteLearnerEvidenceSnapshot()`, gated by
`learner-evidence-test.js` in CI. The schema already carries skill evidence, recurring-error
skills, median response time, 14-day consistency, abandonment rate, forgetting risk and preferred
study window — and the gate already asserts the privacy properties Phase K asks for:
`rawAnswersIncluded === false`, `rawHistoryIncluded === false`, and that the serialised snapshot
contains no `selectedAnswer`.

Phase K should therefore start by **diffing its proposed fields against this schema**, not by
designing one from scratch.

---

## 5. Consequence for the remaining plan

| phase | revised approach |
|---|---|
| **G** | Benchmark the per-answer decision path only. State in the file which layer v3 owns. |
| **H** | The policy-layer baseline comparison **exists**; report its findings rather than rebuild them. Build a baseline only for the decision path (e.g. "correct → harder, wrong → easier", no BKT, no ledger, no credibility). |
| **I** | Metrics must be computable from both the pipeline trace and, where they overlap, v3's outputs. |
| **J** | Reuse v3/extended for the policy layer; simulate the decision path separately. Do not merge the two into one headline number. |
| **K** | Diff against `fiezel-learner-evidence-v1`; extend it if needed, do not replace it. |

**Nothing in this document is a measurement I made.** It is a survey of what is already in the
repository, with the numbers quoted from the files that produced them. I have not re-run the
50-seed study; the figures in §2 are what `adaptivity-simulation-v3-extended.js` records about
its own reproduction on 2026-08-29 against `main` 42a5e89, and they should be re-verified before
being quoted to a buyer.
