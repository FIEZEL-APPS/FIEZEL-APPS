# SALE — Braincore Demonstration

*Four questions a buyer asks, answered by running the engine.*

---

## What this document is

Every number below was produced by executing Braincore. Reproduce it in one command, from a
clean checkout, with no build step and no network:

```
node braincore-demo.js
```

There are no screenshots here and no user interface. A screenshot proves that someone can draw.
The claim being made is about a decision engine, so the evidence is the engine's own output.

**The demonstration can fail.** Each scenario below carries explicit claims, checked against the
run as it happens. If Braincore stops doing what a claim says it does, `braincore-demo.js` exits
non-zero and the `braincore-demo-test.js` gate turns CI red. The claims are *relations* — "A is
promoted and B is not", "guessed evidence counts for less than considered evidence" — never
recorded constants, so they keep meaning something when the numbers legitimately move.

---

## How the scenarios are built, and why that shape

Each scenario is a **pair (or triple) of arms that differ in exactly one observable**, run
against the same engine from the same empty starting state.

This matters more than it might look. A single learner walking through the app only shows that
Braincore produced *an* output. The question a buyer is actually asking is narrower and harder:

> *Does it decide **differently because of what it observed**?*

Only a contrast can answer that. So in Q1 both learners answer the same seven questions and get
all seven right — they end at the **same mastery number** — and one is promoted while the other
is not. The difference cannot have come from the score, because the score is identical. It came
from how the answers arrived.

---

## What is proven, and what is not

**Proven by this demonstration:** Braincore observes the learner, updates internal state from
what it observed, and reaches a different decision as a result. Reasons are named, not inferred.

**Not proven by this demonstration, or by anything else in this repository:** that any of these
decisions teaches better than another approach. These are synthetic learners. No amount of
simulation can establish pedagogical effect; only real learners can, and the instrumentation
readiness for that is covered in `AUDIT/13`–`AUDIT/15` and the evidence schema
(`BRAINCORE-EVIDENCE-SCHEMA.md`), which is shipped **off** by default.

Where the demonstration reads as impressive, it is showing **mechanism**, not **outcome**.

---

## Reading the transcript

| Column | Meaning |
|---|---|
| `answer` | what the learner did |
| `ms` | how long they took |
| `weight` | how much this answer counted as evidence (`1` = full, `0` = discarded) |
| `mastery` | Braincore's confidence that the skill is known (0–1) |
| `review in` | how far out the next review of this item is scheduled |
| `decision` | the tutor move chosen |
| `reason` | why — Braincore's own word, not a label added afterwards |

---

<!-- BEGIN GENERATED TRANSCRIPT — node braincore-demo.js --write-doc -->

```text
FIEZEL BRAINCORE — DEMONSTRATION
Braincore 3.0.0 · every number below was produced by running the engine
==============================================================================================

Q1. The learner is doing well. Does Braincore raise the challenge?
----------------------------------------------------------------------------------------------
Two learners answer the SAME seven questions and get ALL seven right. One recalls the answers
fluently; the other gets there, but has to work for it every time. Does Braincore treat them
the same?

  ARM A — Fluent recall
  differs only by: last three answers arrive in 5.0 s
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct    12000       1    0.553    2.637 d  continue   on_track
  2    correct    12000       1    0.844   12.856 d  continue   on_track
  3    correct    12000       1    0.958   20.403 d  continue   on_track
  4    correct    12000       1     0.99    27.39 d  continue   on_track
  5    correct     5000       1    0.998   34.056 d  stretch    too_easy
  6    correct     5000       1    0.999   40.477 d  stretch    too_easy
  7    correct     5000       1        1   46.749 d  stretch    too_easy

  ARM B — Correct, but laboured
  differs only by: last three answers still take 12.0 s
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct    12000       1    0.553    2.637 d  continue   on_track
  2    correct    12000       1    0.844   12.856 d  continue   on_track
  3    correct    12000       1    0.958   20.403 d  continue   on_track
  4    correct    12000       1     0.99    27.39 d  continue   on_track
  5    correct    12000       1    0.998   34.056 d  continue   on_track
  6    correct    12000       1    0.999   40.477 d  continue   on_track
  7    correct    12000       1        1   46.749 d  continue   on_track

  WHAT THIS SHOWS
   [holds]    The fluent learner is moved UP a level (move "stretch", reason "too_easy")
              evidence: arm A ends on move=stretch reason=too_easy
   [holds]    The laboured learner is NOT moved up — the same seven correct answers do not earn it
              evidence: arm B ends on move=continue reason=on_track
   [holds]    Both learners reach the SAME mastery number — so the different decision came from HOW
               the answers arrived, not from the score
              evidence: A mastery=1 n=7 | B mastery=1 n=7

Q2. The learner keeps struggling. Does Braincore detect it and change the path?
----------------------------------------------------------------------------------------------
Two learners each get FOUR questions wrong across two sessions. One is wrong the same way
every time — the same underlying misunderstanding. The other is wrong on four different
things, with correct answers in between. Does Braincore tell those two apart?

  ARM A — Wrong the same way, four times, across two sessions
  differs only by: one repeated misconception (m_ed_ending) on one concept
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    WRONG       7000       1    0.177    0.149 d  hint       first_miss
  2    WRONG       7000       1    0.174     0.05 d  reteach    persistent_misconception
  3    WRONG       7000       1    0.173     0.05 d  hint       first_miss
  4    WRONG       7000       1    0.173     0.05 d  reteach    persistent_misconception

  ARM B — Four scattered mistakes, different things each time
  differs only by: four different concepts, four different misconceptions, correct answers between
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    WRONG       7000       1    0.177    0.149 d  hint       first_miss
  1    correct     7000       1    0.522    0.149 d  celebrate  misconception_resolved
  2    WRONG       7000       1    0.177    0.149 d  hint       first_miss
  2    correct     7000       1    0.522    0.149 d  celebrate  misconception_resolved
  3    WRONG       7000       1    0.177    0.149 d  hint       first_miss
  3    correct     7000       1    0.522    0.149 d  celebrate  misconception_resolved
  4    WRONG       7000       1    0.177    0.149 d  hint       first_miss
  4    correct     7000       1    0.522    0.149 d  celebrate  misconception_resolved

  WHAT THIS SHOWS
   [holds]    The repeated misunderstanding is NAMED, not just counted as "four wrong answers"
              evidence: arm A active=1 top="m_ed_ending"
   [holds]    The path changes: Braincore stops testing and re-teaches, citing the misconception
              evidence: arm A re-teaches on 2 of 4 turns, reason="persistent_misconception"
   [holds]    The scattered learner is NOT accused — same number of wrong answers, no pattern claimed
              evidence: arm B active=0, persistent_misconception turns=0
   [holds]    The accusation needs TWO sessions, not one bad afternoon — it is withheld on the first
              evidence: arm A session 0 ends with active=0; it only becomes active in session 1

Q3. The learner goes away and forgets. Does the review schedule change?
----------------------------------------------------------------------------------------------
A learner gets something right, disappears, and comes back. Does Braincore schedule the next
review differently depending on how long they were away — and on whether they still remembered
when they came back?

  ARM A — Away 30 days, still remembered
  differs only by: 30-day gap, answer correct
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct     7000       1    0.553    2.637 d  continue   on_track
  31   correct     7000       1    0.844  102.579 d  continue   on_track

  ARM B — Away 1 day, remembered
  differs only by: 1-day gap, answer correct
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct     7000       1    0.553    2.637 d  continue   on_track
  2    correct     7000       1    0.844   12.856 d  continue   on_track

  ARM C — Away 30 days, had forgotten
  differs only by: 30-day gap, answer wrong
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct     7000       1    0.553    2.637 d  continue   on_track
  31   WRONG       7000       1     0.27    0.387 d  hint       first_miss

  WHAT THIS SHOWS
   [holds]    Recalling something after a LONG gap buys a much longer next interval than recalling it
               after a short one (the spacing effect, not a fixed +1 day)
              evidence: 30-day gap -> 102.579 days of stability; 1-day gap -> 12.856
   [holds]    Braincore knew the memory had decayed BEFORE the answer arrived — it expects recall
               after one day and expects none after thirty
              evidence: expected recall at the moment of review: after 1 day = 0.769, after 30 days = 0 (1.0 = certain recall)
   [holds]    Forgetting COLLAPSES the interval — it is not merely "a bit shorter"
              evidence: remembered -> 102.579 days; forgotten -> 0.387 days
   [holds]    Same 30-day gap, opposite outcomes: the schedule follows the EVIDENCE, not the calendar
              evidence: both returned on day 31; stability 102.579 vs 0.387

Q4. The evidence is unreliable. Does Braincore lower its confidence?
----------------------------------------------------------------------------------------------
Three learners all answer CORRECTLY. One thinks about it. One is clicking too fast to have
read the question. One answered an item the content pipeline has flagged as broken. Are all
three "correct" worth the same to Braincore?

  ARM A — Considered answers
  differs only by: 12.0 s then 5.0 s per answer, nothing flagged
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct    12000       1    0.553    2.637 d  continue   on_track
  2    correct    12000       1    0.844   12.856 d  continue   on_track
  3    correct    12000       1    0.958   20.403 d  continue   on_track
  4    correct    12000       1     0.99    27.39 d  continue   on_track
  5    correct     5000       1    0.998   34.056 d  stretch    too_easy
  6    correct     5000       1    0.999   40.477 d  stretch    too_easy
  7    correct     5000       1        1   46.749 d  stretch    too_easy

  ARM B — Guess-speed answers
  differs only by: 0.9 s per answer — below the reading floor
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct      900     0.3    0.288    2.637 d  continue   on_track
  2    correct      900     0.3    0.391   12.856 d  continue   on_track
  3    correct      900     0.3    0.502   20.403 d  continue   on_track
  4    correct      900     0.3    0.611    27.39 d  continue   streak_but_guessing
  5    correct      900     0.3     0.71   34.056 d  continue   streak_but_guessing
  6    correct      900     0.3    0.791   40.477 d  continue   streak_but_guessing
  7    correct      900     0.3    0.854   46.749 d  continue   streak_but_guessing

  ARM C — Answer on a broken item
  differs only by: integrity = evidence_mismatch
  day  answer        ms  weight  mastery  review in  decision   reason
  ------------------------------------------------------------------------------------------
  1    correct     7000       0      0.2    2.637 d  continue   on_track

  WHAT THIS SHOWS
   [holds]    Guess-speed correct answers are worth LESS as evidence than considered ones
              evidence: evidence weight: considered=1, guess-speed=0.3
   [holds]    Because the evidence is worth less, the confidence it buys is lower — seven correct
               answers do NOT produce the same mastery
              evidence: mastery after 7 correct: considered=1, guess-speed=0.854
   [holds]    And the guesser is NOT promoted: Braincore names the reason rather than rewarding the
               streak
              evidence: arm B ends on move=continue reason="streak_but_guessing"; arm A ends on move=stretch
   [holds]    Evidence from an item flagged as broken is DISCARDED, not merely discounted
              evidence: evidence weight on the flagged item = 0 (0 = counts for nothing)
```

<!-- END GENERATED TRANSCRIPT -->

---

## Notes on individual results, for a technical evaluator

**Q1 — the same score, a different decision.** Both arms end at mastery `1.0` after seven correct
answers, and only the fluent arm is promoted. The gate is `streak >= 4 AND timing == 'retrieved'`
in `features/brain/fiezel-tutor-brain.js`; `retrieved` is relative to a *rolling median* of the
learner's own response times in that session, not a fixed threshold, so "fast" means fast for
this learner today.

**Q2 — an accusation costs more than a mistake.** The misconception ledger requires evidence from
at least two separate sessions (`MIN_SESSIONS = 2`) and three observations (`MIN_EVIDENCE = 3`)
before it will name a misunderstanding. That is why arm A's first session ends with nothing
active even though the learner was already wrong the same way twice. One bad afternoon is not
enough to tell a learner what they misunderstand.

**Q3 — the schedule follows the evidence, not the calendar.** Both arm A and arm C return on day
31. One is scheduled 102 days out, the other 0.4 days. The input that separates them is whether
the learner still knew the answer.

**Q4 — three "correct" answers worth three different amounts.** Full credibility (1.0),
guess-speed discount (0.3), and discarded (0.0) for an item the content pipeline flagged as
broken. Note the second-order effect: because the guesser's evidence is worth less, seven correct
answers buy mastery `0.854` rather than `1.0`, which is why the promotion gate never opens for
them. Braincore also *names* this — `streak_but_guessing` — rather than silently declining.

**Non-reactions are deliberate.** Q1 arm B, Q2 arm B and Q4 arm B are all cases where Braincore
is asked to react and correctly does not. An engine that responds to everything is not adaptive,
it is twitchy, and the cost lands on the learner.

---

## Verifying this yourself

| To check | Command |
|---|---|
| The transcript above is what the engine prints today | `node braincore-demo.js` |
| Every claim still holds, and *can* fail | `node braincore-demo-test.js` |
| The demo's numbers match the audited decision path | included in the gate above |
| Braincore touches no network, storage, DOM or clock | `node braincore-local-first-test.js` |
| Decisions are stable release-over-release | `node braincore-benchmark.js` |

The gate re-runs one arm through `braincore-pipeline.js` directly and requires an exact match
with what the demonstration printed, so the demonstration cannot quietly acquire a friendlier
code path of its own. It also mutates the scenarios four ways and requires the claims to go red,
so a claim that has stopped checking anything is itself caught.

---

*Regenerate the transcript block after any engine change:* `node braincore-demo.js --write-doc`
