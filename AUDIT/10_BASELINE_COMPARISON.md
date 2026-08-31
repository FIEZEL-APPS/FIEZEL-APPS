# 10 — Baseline Comparison (Phase 2 / Phase H)

> ## ⚠️ RETRACTED IN PART — see `AUDIT/12`
>
> The tracking-error half of this document's headline was **wrong**. It was measured through a
> defect in my own harness: the ability estimator was fed `correct` where it reads `ok`, so it
> saw every answer as wrong and pinned at its floor. Corrected across 1,620 paired runs,
> `trackingError` is **proven better**, not worse.
>
> **The over-reteaching finding below stands** — it never depended on the ability estimate.
>
> The original text is kept unaltered, because deleting a wrong conclusion also deletes the
> evidence that it was reached and how.

**The headline, stated before the caveats so it cannot be missed:**

> On the decision path, against a ten-line baseline, **Braincore is not better on these
> measures.** It tracks the learner marginally more often but is on average *further* from the
> truth, and it re-teaches learners who already know the material **2.7× more often** than the
> naive engine.

The brief for this phase said: *"Do NOT claim that Braincore is 'better' unless the benchmark
actually demonstrates it. The purpose is to discover where Braincore makes better decisions and
where it does not."* This is the "does not" half, and it is reported first.

---

## 1. Method

`braincore-baseline.js` — a deliberately naive engine, ~90 lines. Rolling accuracy over the last
10 answers as its only belief. Correct → difficulty +0.25, wrong → −0.25. Two misses in a row →
reteach, one miss → hint, ≥85% over ≥5 → advance. **No memory model, no misconception ledger, no
evidence credibility, no BKT.** The gate asserts it `require`s nothing from `features/brain/` — a
"baseline" that secretly calls the engine under test makes every gap look small, and the smallness
is fake.

`braincore-comparison.js` — the latent learners, the PRNG and the answer generator are **reused
from `adaptivity-simulation-v3.js`** rather than re-implemented (per `AUDIT/08`). One evidence
stream is generated per learner and fed to **both** engines, so the comparison is paired: no
difference can come from sample luck.

**Ground truth is an outcome, not a formula.** For each latent learner it is the empirical
proportion correct over 200 held-out questions at the reference difficulty, drawn from a separate
random stream. Using the IRT formula as truth would be tidier and would tilt the board: it is the
same family the Braincore ability estimator uses.

135 runs — 3 profiles × 5 seeds × 3 answering styles × 3 reference difficulties (1.5 / 3 / 4.5).

## 2. Results

| measure | baseline | Braincore |
|---|---|---|
| runs with smaller tracking error | 65 | **70** |
| mean tracking-error difference | — | **+0.0628** *(positive = Braincore further from truth)* |
| **reteach on a learner who already knows it** | **9** | **24** |
| advance on a learner who does not know it | 0 | 0 |
| decisions that differ | 1074 of 5400 (20%) | |

Braincore wins the head-to-head count by a hair and loses on average magnitude: it is right more
often and wrong by more when it is wrong. On this evidence, at this layer, **the sophistication
is not paying for itself.**

The `advance` row is 0–0 because *neither* engine ever promotes in this design — a fixed
difficulty schedule never produces the `retrieved` streak Braincore's `stretch` needs. That is an
untested metric, not a tie, and it is labelled as such rather than presented as agreement.

## 3. Two of my own measurement errors, kept in the record

**Error 1 — I compared different quantities and nearly published it.** The first version used
BKT's `L` as Braincore's belief and reported the baseline winning **40 of 45 runs**, mean
difference +0.105. Arithmetically right, comparatively meaningless: `L` is *P(the learner has
mastered the skill)*; the baseline's rolling accuracy estimates *P(the learner answers
correctly)*; and ground truth here measures the second. The baseline was being scored on the
quantity it estimates by definition. Braincore's comparable quantity already exists in the trace —
`evidence.predicted` — and switching to it moved the result from 5–40 to 70–65. **The wrong
number is still computed**, under the field name `trackingErrorMasteryTIDAKSEBANDING`, because
deleting it would delete the only evidence that this comparison was once wrong.

**Error 2 — a metric that could not distinguish anything.** "Wasted remediation" first counted all
hint+reteach decisions, and returned **114 vs 114** and **786 vs 786**. Not agreement: both
engines remediate exactly when the answer is wrong, and the number of wrong answers is identical
*because the evidence is shared*. The metric was measuring how often the learner erred. Replaced
by the choice *between* available actions — reteach (the heavy intervention) and advance (the
promotion) — which can differ on identical evidence. `§3` of the gate now asserts the two engines'
counts are **not** equal, so a degenerate metric fails instead of reassuring.

## 4. Product finding: `persistent_misconception` claims precision it does not have

Reproduced directly in `features/brain/fiezel-tutor-brain.js`, with no harness involved:

```
salah #1  precision=skill  misconception="unclassified:vocab_x"  repeats=1  -> hint:first_miss
salah #2  precision=skill  misconception="unclassified:vocab_x"  repeats=2  -> reteach:persistent_misconception
```

**All 361 Braincore reteach decisions across the comparison came from this branch**, and not one
of them had any misconception evidence at all.

When an item carries no `optionMisconceptions` map, `diagnose()` synthesises the key
`unclassified:<skill>`; `decideMove()` counts repeats of that synthetic key and, at two, returns
`reason: 'persistent_misconception'`. **The diagnosis is honest** — it reports `precision: 'skill'`.
The *decision reason* is not: it drops that field and asserts a specificity the evidence does not
support.

**This is live in production, not hypothetical.** `app.js:2799` passes
`optionMisconceptions: q?.optionMisconceptions || null`, and `app.js:7159` supplies `item?.[15] || null`
— vocabulary and reading items have no map, so every learner who gets the same vocabulary skill
wrong twice is recorded as having a persistent misconception.

**Proposed fix (not applied).** In `decideMove`, gate the claim on the diagnosis' own precision:

```js
if (!d.correct && num(d.repeats) >= 2) {
  return d.precision === 'misconception'
    ? { move: 'reteach', reason: 'persistent_misconception', urgency: 'high', misconception: d.misconception }
    : { move: 'reteach', reason: 'repeated_miss_same_skill',  urgency: 'high' };
}
```

Same action, honest reason. It is **not applied here**: it changes what the tutor says to learners
in production, which is the owner's call, not an audit's. `§4` of the gate locks the current
behaviour as a characterization test so it cannot drift silently — and so that fixing it turns the
gate red and forces this document to be updated with it.

## 5. What this does NOT prove

1. **The latent learner is a model.** It is `adaptivity-simulation-v3.js`'s model, which generates
   answers through Core Brain's `successProbability`. Even with outcome-based ground truth,
   Braincore is being tested in a world whose curve shape it knows. **These numbers are an upper
   bound for Braincore, not a neutral estimate.** A real learner grants no such advantage — so the
   real-world result is unlikely to be *better* than the near-tie measured here.
2. **One layer only.** Item selection is not compared here; `adaptivity-simulation-v3.js` owns
   that, and its answer is a different trade-off (`AUDIT/08`).
3. **Static learners.** `belajar()` is not exported by v3 and was not re-implemented, so latent
   ability does not move during a run. This isolates *measurement accuracy* cleanly and says
   nothing about teaching effectiveness over time.
4. **135 runs, no significance testing.** The brief says not to manufacture significance, and a
   near-tie across 135 paired runs does not need a p-value to be read correctly: **no demonstrated
   advantage.**
