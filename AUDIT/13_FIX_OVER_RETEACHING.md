# 13 — Fix: Braincore no longer re-teaches learners who already know the material

**Requested by the owner.** Earlier phases found this and deliberately did *not* fix it, because
changing what the tutor says to learners is the owner's call, not an audit's. The owner made the
call.

---

## 1. What was wrong

`decideMove` escalated to **reteach** after two wrong answers on the same concept — looking only
at session-local misses. It never asked whether the learner actually knows the material.

Measured across the 39 occasions it re-taught a genuinely competent learner:

| what the engine knew at that moment | value |
|---|---|
| that learner's own accuracy so far | **0.745** |
| BKT mastery | **0.931** |
| answers of evidence behind that mastery | **21** |
| of those 39 events, how many had mastery ≥ 0.80 | **33 (85%)** |

**Braincore already knew.** Mastery 0.93, twenty-one answers of evidence — and it re-taught them
anyway, because the decision was never given the number. The information existed one module away.

Re-teaching someone who already knows is not merely wasteful. It burns a learning session, and it
tells the learner the machine is not paying attention.

## 2. The fix

Two conditions now guard the escalation, and both came from measurement rather than opinion:

**(a) "Misconception" may only be claimed when there is evidence for it.** When an item carries no
`optionMisconceptions` map — vocabulary and reading items do not; `app.js:2799` sends `null` —
`diagnose()` synthesises `unclassified:<skill>` and its repeats were counted here. What is actually
known is "wrong twice on the same skill", and the diagnosis already says so via `precision: 'skill'`.
The branch used to discard that field and claim precision it did not have. *(This is the finding
from `AUDIT/10` §4, now applied rather than proposed.)*

**(b) Two misses from a demonstrably competent learner is a slip, not a misconception.**
`ctx.mastery` is now passed in; above `MASTERY_NO_RETEACH = 0.8` the response is a hint.

```js
if (!d.correct && num(d.repeats) >= 2) {
  var berbukti = d.precision === 'misconception';
  if (berbukti) return { move:'reteach', reason:'persistent_misconception', ... };
  var mastery = num(ctx.mastery, -1);
  if (mastery >= MASTERY_NO_RETEACH) return { move:'hint', reason:'likely_slip_high_mastery', ... };
  return { move:'reteach', reason:'repeated_miss_same_skill', ... };
}
```

`ctx.mastery` is **optional**: without it, behaviour is byte-identical to before, so no existing
caller changes meaning. `app.js` now supplies it from BKT at the `tutorObserve` call site, guarded
so that a missing BKT module sends no field at all.

**Why 0.8 and not the mastery gate (L ≥ 0.95 AND n ≥ 5):** a learner should not have to *graduate*
a concept to earn the right not to be re-taught over two slips. A threshold as strict as the
mastery gate would leave this fence almost never lit.

## 3. What it changed — and what it deliberately did not

| | before | after |
|---|---|---|
| reteach on **competent** learners (static arm) | **1.37 / run** | **0.14 / run** |
| reteach on **competent** learners (improving arm) | 0.28 / run | **0.09 / run** |
| **reteach on struggling learners** | — | **20.08 / run — untouched** |
| tracking error | proven better | **unchanged** |

The struggling-learner row is the one that matters most. The easiest way to "fix"
over-remediation is to stop remediating; the gate now asserts that did not happen, and a
**154× ratio** separates how often the engine re-teaches a struggling learner versus a competent
one.

All four pre-existing tutor test suites still pass — `tutor-brain-v3-test.js`,
`tutor-classroom-regression-test.js`, `tutor-reteach-card-test.js`, `step-tutor-test.js` — because
a *named* misconception is still re-taught at any mastery. A capable learner can hold one wrong
belief, and that is exactly the case most worth touching.

## 4. The verdict moved, but not as far as it looks — and I left the goalposts alone

`reteachSia2` went from **proven worse** to **proven better**: 0.3881 → 0.1095, CI
[−0.3682, −0.1990]. That is a 72% reduction and it is now *below* the baseline's 0.39.

But the study reports it as **`terbukti_remeh`** — proven, yet below the practical margin. The
margin (0.5) was declared **before** the fix, when the gap ran the other way. The effect is real
and its magnitude is smaller than the threshold I had already called meaningful.

**I did not lower the margin to claim a bigger win.** Moving a threshold after seeing the result
is precisely the failure this whole study was built to avoid, and it would have been easy and
invisible.

## 5. Still not proven

1. **Synthetic learners only.** Nobody real has been through this. The fix is measured, not validated.
2. **The threshold 0.8 is a judgement**, not a derived constant. It is written where it can be
   argued with, and it is the first thing to revisit against real evidence.
3. **This does not make Braincore a better teacher.** It removes one specific, measured harm. The
   central question from Phase 1 — does any learner learn more — remains untouched by this change.
