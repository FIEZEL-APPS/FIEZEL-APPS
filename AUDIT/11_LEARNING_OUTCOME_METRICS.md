# 11 — Learning Outcome Metrics (Phase 2 / Phase I)

Five metrics, defined **as code** rather than as prose, so two releases can be judged on the same
ruler and a buyer can *argue with* the ruler instead of guessing at it.

| metric | measured | what it means |
|---|---|---|
| `masteryAccuracy` | **0.1802** (n=45) | mean \|predicted − empirical truth\| for P(correct). **Lower is better.** |
| `retention` (sign) | 1.0 (n=45) | **tautological — see §2.** A wiring check, not a quality result. |
| `retention` (spacing monotonicity) | **1.0** (n=5 gap pairs) | longer gap ⇒ larger stability gain. **This one could fail. It did not.** |
| `adaptationQuality` | **0.9743** (n=41, 4 unmeasurable) | proportion of difficulty steps whose direction makes sense |
| `interventionEfficiency` | **0.0333** (n=6, **39 unmeasurable**) | proportion of reteach decisions aimed at learners who already know it. **Lower is better.** |
| `misconceptionRecovery` | **6** correct answers | evidence needed before an active misconception resolves |

---

## 1. The rule that governs all five

**"Not measurable" returns `null`, never `0`** — and every value carries `n`, the number of
observations behind it.

This is not style. The defect is real and it happened here: in Phase B, `Number(null) === 0`
turned *not measured* into *zero*, and the first trace ever built reported `predicted: 0` — "this
learner is certain to fail" — when the truth was "there is no evidence to predict from yet." A
metric that reports 0 for *untested* makes an unexercised release look bad, or worse, look good.

The run above shows the rule doing real work: `interventionEfficiency` is **unmeasurable for 39
of 45 learners**, because only 6 sit in the "already competent" band where the question even
applies. Reporting 0.0333 without that denominator would be a much stronger claim than the
evidence supports. `§1` of the gate asserts unmeasurable cases return `null` *and* that
`measured + unmeasurable` equals the learner count, so nothing goes missing quietly.

## 2. One metric is a tautology, and it says so

`retention` (sign) returns **1.0 for all 45 learners**. That is not an achievement — it is
unfalsifiable. `CoreBrain.updateMemory` is *defined* to raise stability on success and collapse it
on lapse, so the metric cannot fail unless the module is wired backwards.

That makes it a useful **mis-wiring detector** and a useless **quality measure**. Publishing
"retention: 1.0" as a result would overstate the engine. This is the same defect class as the
degenerate remediation metric in `AUDIT/10` §3, and it is labelled rather than quietly kept.

So a second retention measure was added that **can** fail: the spacing effect must be **monotone
in gap length**. Measured stability gains:

```
gap:   1d      3d      7d      14d     30d     60d
gain:  10.219  33.072  70.235  94.714  99.942  100.029
```

Monotone, saturating near 100 days — the shape an FSRS-style curve should have. A wrong memory
model could pass the sign test and fail this one. `§3` of the gate also proves the monotonicity
arithmetic itself can fail, by feeding it a decreasing series.

## 3. What the numbers say, plainly

- **`masteryAccuracy` 0.18 is not good.** Braincore's estimate of "will this learner answer
  correctly" is off by ~18 percentage points on average. Consistent with `AUDIT/10`, where it
  beat a ten-line baseline in 70 of 135 paired runs and was *further* from truth on average.
- **`adaptationQuality` 0.97 is high but narrow.** It measures whether the *item-difficulty
  estimate* moves sensibly — not whether the learner gets the right question. Question selection
  belongs to `adaptivity-simulation-v3.js` (`AUDIT/08`). Conflating the two would overstate this
  by a wide margin.
- **`interventionEfficiency` 0.033 rests on 6 learners.** Treat it as a direction, not a figure.
  The `AUDIT/10` comparison is the stronger evidence on this axis, and it was unflattering:
  24 reteach decisions on competent learners against the baseline's 9.
- **`misconceptionRecovery` 6** correct answers across sessions to clear an active misconception.
  Read it together with the Phase G scenario `misconception-04`, which locks recovery as
  deliberately *slow* — an accusation that a single right answer erases protects nobody.

## 4. No quality thresholds are asserted, on purpose

The gate checks that the ruler is honest; it does **not** demand any metric reach a value. Nobody
is entitled to set a pass mark for `masteryAccuracy` without real learners, and a gate that
demanded one would force whoever ran it to invent the pass mark. Results are printed, not
asserted — the same rule as `AUDIT/10`.

## 5. What this does NOT prove

1. **Every number comes from synthetic learners.** No real learner has been through this path, so
   none of these figures speaks to learning outcomes. The title of this document names an
   *aspiration* the metrics are built to eventually measure — not something measured yet.
2. **The latent learner shares Braincore's curve family** (`AUDIT/10` §5). These are an upper
   bound for Braincore, not neutral estimates.
3. **Static ability.** Latent ability does not move during a run, so nothing here measures whether
   Braincore *causes* learning. That needs Phase J and, ultimately, real evidence (Phase K).
4. **`n` is small.** 45 learners, 5 gap pairs, one recovery scenario. Enough to catch defects,
   not enough to support a marketing claim.
