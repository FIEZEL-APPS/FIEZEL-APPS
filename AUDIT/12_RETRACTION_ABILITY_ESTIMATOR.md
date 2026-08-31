# 12 — Retraction: the Phase J verdict was measured through a broken ability estimator

**This document retracts the headline finding of `AUDIT/10` and `simulations/summary.md`.**

Both previously reported that Braincore's learner estimate was **proven worse** than a ten-line
baseline. That conclusion was wrong. The cause was a defect in `braincore-pipeline.js` — my
harness — not in Braincore.

---

## 1. The defect

`ability()` built history rows like this:

```js
{ correct: h.correct, difficulty: h.difficulty, level: learner.level, credibility: ... }
```

`FiezelCoreBrain.estimateAbility` reads a different field (`fiezel-core-brain.js:206`):

```js
var actual = row.ok ? 1 : 0;
```

`row.ok` was **always `undefined`**, so `actual` was **always 0**. The estimator was told the
learner got every single question wrong, forever.

Measured — a learner whose true ability is 2.30, over 40 answers:

| day | true θ | estimate | error |
|---|---|---|---|
| 1 | 2.30 | 1.24 | −1.06 |
| 5 | 2.30 | 0.77 | −1.53 |
| 10 | 2.30 | **0.40** | −1.90 |
| 40 | 2.30 | **0.40** | −1.90 |

**0.40 is the estimator's lower clamp.** It was not converging slowly — it ran to the floor and
pinned there. For an *improving* learner it was worse still: true ability reached 3.70 while the
estimate stayed at 0.40, an error of −3.30.

`trace.evidence.predicted` is computed from that estimate, and `predicted` is the quantity the
entire Phase H comparison and Phase J study rest on. **Every tracking-error number I published
was measured through an estimator that had never been shown a correct answer.**

`app.js:1974` passes `ok:!!h?.ok` correctly. This never affected production.

## 2. Why no gate caught it

The same reason as the calibration defect in `AUDIT/09`: **nothing threw.** A row without `ok` is
valid input meaning "wrong answer", so the pipeline's `guard()` — built in Phase C precisely to
catch silent degradation — stayed empty. This is now the **third** defect of one shape:

| phase | module | wrong field | symptom |
|---|---|---|---|
| F | `ItemPrior` | `mode: 'mcq'` (not in `MODE_COST`) | prior silently fell back to base |
| G | `Calibration.observe` | `{correct, weight, prior}` vs `{ok, kappa, priorDifficulty, ability}` | calibration was a no-op |
| **J/12** | `CoreBrain.estimateAbility` | `correct` vs `ok` | estimate pinned to its floor |

Three times, a pure module accepted a malformed record, degraded exactly as designed, and returned
a plausible value. **A module that degrades gracefully on bad input cannot tell you the input was
bad.** The lesson is not "be more careful" — it is that a harness must assert its modules are
*storing and moving*, not merely *returning*.

## 3. The corrected result

1,620 paired runs · 64,800 simulated interactions · three ability-movement arms · 3,000-iteration
paired bootstrap.

| metric | before fix | **after fix** |
|---|---|---|
| `trackingError` | proven **worse** (0.1302 → 0.1853) | **proven better** (0.1305 → 0.1071), CI [−0.0268, −0.0200] |
| `reteachSia2` | proven worse | **proven worse — unchanged** (0.3881 → 0.9552), CI [0.4677, 0.6716] |
| `advanceLewat` | inconclusive | inconclusive |

Per arm:

| arm | `trackingError` | verdict |
|---|---|---|
| static | 0.1302 → 0.1036, CI [−0.0328, −0.0204] | **proven better** |
| declining | 0.1345 → 0.0960, CI [−0.0424, −0.0347] | **proven better** |
| **improving** | 0.1269 → 0.1216, CI [−0.0123, **+0.0016**] | **inconclusive** |

**Braincore's estimate is proven better for a learner who is static or declining, and
inconclusive for one who is improving** — its weakest case, and the one a learning product most
wants to get right. A residual negative bias remains (it under-estimates learners), so it is
slowest to notice someone getting better. That is a real, specific, open finding.

## 4. What does NOT change

**The over-reteaching finding stands.** Braincore re-teaches learners who already know the
material far more than the baseline (0.39 → 0.96 combined; 0.56 → 1.37 on static learners). It
never depended on the ability estimate, and it survives every arm where it can be measured.
`AUDIT/10` §4 — `persistent_misconception` claimed without misconception evidence — also stands,
and re-testing confirmed the proposed fix changes the reason string, not the action.

## 5. What this episode says about the earlier reports

The Phase H and Phase J write-ups were careful about statistics, caveats and vocabulary, and they
were **confidently wrong** — because all of that care sat on top of an input defect none of it
could see. Rigour in the reporting layer does not compensate for a broken measurement layer, and
the honest reading of this episode is that a confident negative finding deserves exactly as much
suspicion as a confident positive one. I published the negative one because it was unflattering
and therefore felt safe. That was not a good reason.

## 6. Still not proven

Nothing here is evidence about real learners. Every number remains synthetic, the latent learner
still shares Core Brain's curve family (so these remain an **upper bound** for Braincore), and
none of it says whether any learner learns more.
