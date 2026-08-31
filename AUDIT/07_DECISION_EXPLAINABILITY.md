# 07 — Decision Explainability (Phase 2 / Phase F)

**Question this phase answers:** for every decision Braincore makes, can it say *why* — in a form
a debugger, a QA engineer, or a prospective buyer can read back and check?

**Answer before this phase: no, for the two most common cases in the entire product.**
**Answer after: yes, 10/10 decisions in a real run, with the invention route closed by a gate.**

Everything below was measured by executing code. No finding here is read off the source.

---

## 1. What was broken

### F-1 — Reasons were computed, then thrown away

`braincore-pipeline.js` gathered reason codes from four objects: `weighed`, `diagnosis`, `move`,
`prior`. Measured output of the pipeline before the fix:

| answer | `reasonCodes` |
|---|---|
| plain correct | `[]` |
| plain wrong | `[]` |
| fast guess | `["brain3_evidence_discounted_guess"]` |
| language-loaded | `["brain3_evidence_discounted_language"]` |

Only **discounted evidence** produced an explanation. Correct and wrong — the two things that
happen most in the product — recorded nothing.

The codes were not missing. They were being **calculated and dropped**, in five places:

| source | code it emits | fires | why it never arrived |
|---|---|---|---|
| `CoreBrain.updateMemory()` | `brain3_memory_gain_spacing` / `brain3_memory_lapse_partial` | every answer | result `updated` not passed to the collector |
| `Affect.assess()` | `brain3_affect_*` | every answer | result lived and died inside a `try` block |
| `Calibration.effective()` | `brain3_item_calibration_*` | every answer | only `.difficulty` read; the object discarded one line later |
| `ItemPrior` | `brain3_item_prior_*` | every answer | pipeline called `difficultyFor()` (a number) instead of `explain()` (number **+** rationale) |
| `Ledger.active()` | `brain3_misconception_active` | when active | rows never handed to the collector |

The `prior` entry in the collector list was `{ rationale: [] }` — a placeholder that never held
anything. The pipeline was asking "why?" of an object built not to know.

**The fix adds no intelligence.** It connects modules that were already speaking to a recorder
that was not listening.

### F-2 — Five of eight tutor moves recorded as `unknown`

`TutorBrain.decideMove()` publishes 8 moves. The pipeline's map into the trace enum covered 3.
Measured:

```
breathe -> unknown    consolidate -> unknown    celebrate -> unknown
stretch -> unknown    wrapup      -> unknown
continue -> continue  hint -> hint              reteach -> reteach
```

For most of the tutor's vocabulary the trace said *"I don't know what was decided"* while the
tutor was naming its decision plainly. That `unknown` is not honesty; it is blindness wearing
honesty's clothes.

### F-3 — The pipeline called the decider with a poorer context than production

`app.js:2808` passes `{remaining, fatigue, affect}`. The pipeline passed `{remaining: 10}` and
nothing else. Consequences, both measured:

- **Affect was computed at step 9 and never reached the decider.** The module ran, produced a
  state, and had no influence on the decision.
- **Four of the eight moves were unreachable by construction** — `wrapup` needs a real
  `remaining`, `breathe` needs fatigue or affect.

Measuring an engine on a narrower path than it actually runs, then reporting coverage, is one of
the quietest ways to mis-report. Fixed to the same context shape as `app.js:2808`; a gate
compares the two call sites.

### F-4 — The harness fed a question mode that does not exist

Found while writing the coverage test. The pipeline defaulted to `mode: 'mcq'`. `'mcq'` is not a
member of `ItemPrior.MODE_COST` at all; production uses `'complete_sentence'` (`app.js:2354`) or
a `GRAMMAR_PRACTICE_MODES` entry (`app.js:2974`). The prior therefore fell back to the level base
on every single answer, and every trace carried `brain3_item_prior_mode_unknown` — a code that
was correctly reporting the problem to nobody, because nobody was collecting it.

**Effect on Phases C, D and E:** they ran with difficulty `2.00` where production would have
computed `2.35`. Their conclusions survive — the offset was constant across every branch, and
BKT mastery does not read item difficulty, so Phase D's final numbers are byte-identical after
the fix (`{"A_kuat":1,"B_kesulitan":0.173,"D_penebak":0.901,"E_bahasa":0.174}`). But the absolute
difficulty figures in those phases were not production-faithful, and that is stated here rather
than quietly corrected.

*(Independently, `main` at m025-207 connected `ItemPrior` to `makeLevelSource()` after finding
the same class of defect from the other end — the module was right, the wiring was not. Two
different routes to "the prior exists but is not really applied.")*

---

## 2. The invention that was refused

`decideMove()` **always** returns a reason: `on_track`, `first_miss`, `miss_streak`,
`persistent_misconception`, `too_easy`, `cognitive_load_high`, `correct_but_slow`,
`misconception_resolved`, `streak_but_guessing`, `answered_too_fast`, `pool_exhausted`,
`affect_frustrated`, `affect_bored`, `affect_gaming`, `affect_fatigued`. Fifteen reasons, total
coverage — but not in the `brain3_*` namespace, so the filter dropped every one.

The one-line route to 100% coverage was to prefix them: `on_track` → `brain3_tutor_on_track`.

**That was not done.** A `brain3_*` code asserts *the deciding module published this code*. A
prefixed code is indistinguishable from a native one inside the trace, and no outside reviewer
could tell them apart — which is precisely the property that makes the trace worth anything to a
buyer. The Decision Trace contract said so before this phase existed: *"the trace records
reasons; it does not invent them."*

Instead the tutor's reason is recorded **verbatim** in a new field, `decisionReason` — no
mapping, no prefix, nothing lost. The trace now carries two layers with deliberately different
provenance:

- **`reasonCodes`** — `brain3_*` codes from the **measuring** modules. Locked vocabulary, countable.
- **`decisionReason`** — one verbatim reason from the **deciding** module. Always present.

`braincore-explainability-test.js` §0 enforces this mechanically: every emitted code must be
findable as a **literal** in `features/brain/` source, and no code may equal
`brain3_tutor_<any tutor reason>`. A fabricated code fails the build.

### One reason source deliberately left uncollected

`BKT.rootCause()` publishes `brain3_bkt_root_cause` and would add a good mastery-level reason
here. It is **not** called — because `app.js` does not call it on this path either. Its only call
site (`app.js:8338`) sits in the progress-panel **reading** path, not the per-answer **deciding**
path this pipeline mirrors. Adding it would raise the coverage number while making the harness
less faithful to the path it claims to measure — exactly the trade this phase refused. Recorded
here so its absence reads as a decision rather than an oversight.

---

## 3. What changed

| file | change |
|---|---|
| `features/brain/fiezel-decision-trace.js` | `decisionRaw` + `decisionReason`, both locked to `^[a-z][a-z0-9_]{0,63}$` — free text **throws**, it is not trimmed to fit |
| `braincore-pipeline.js` | `ItemPrior.explain()`; `eff` and `affectAssessment` hoisted out of their `try` blocks; collector reads all seven real carriers; `MOVE_TO_DECISION` complete over all 8 moves; `decideMove` context matches `app.js:2808`; default mode is a real production mode |
| `braincore-explainability-test.js` | **new** — 19 assertions, §0–§7 |
| `braincore-{pipeline,learner-profiles,counterfactual}-test.js` | fixture mode `'mcq'` → `'complete_sentence'` |
| `BRAINCORE-DECISION-TRACE.md` | new fields, the refused-invention rationale, two new honest limits |
| `.github/workflows/quality.yml` | gate registered |

`decisionRaw` exists because the enum mapping is a **claim**: `stretch → advance` is arguable and
`celebrate → continue` genuinely loses meaning. Keeping the original word makes the mapping
checkable — the gate asserts `normalizeDecision(decisionRaw) === decision` on every trace.

---

## 4. Measured result

Reason coverage across a 10-answer wavy session: **0/10 → 10/10.**

```
#0 continue(continue) :on_track      -> prior_mode, calibration_prior_only, memory_gain_spacing, affect_insufficient_evidence
#2 hint(hint)         :first_miss    -> prior_mode, calibration_prior_only, memory_lapse_partial, affect_insufficient_evidence
#4 reteach(reteach)   :persistent_misconception
                                     -> … memory_lapse_partial, affect_insufficient_evidence, misconception_active
#5 continue(celebrate):misconception_resolved
                                     -> … evidence_discounted_guess, memory_gain_spacing, misconception_active
```
*(`brain3_` prefixes elided for width.)*

All **8** tutor moves now both map into the enum **and** are reached end-to-end through
`answer()` in the gate — §2 proves the map is total, §7 proves the road is passable, because a
complete map to an unreachable road measures nothing.

---

## 4b. The gate was tested, not trusted — and it had a hole

A gate is a claim about what it would catch. That claim is worth nothing until it is checked, so
each defect this phase fixed was re-introduced into a copy of the tree and the gate re-run:

| mutation | caught by |
|---|---|
| M1 — collector reverted to the Phase C four-object list | *(initially only §3, by accident)* |
| M2 — move map emptied back to 3 of 8 | §2, naming all five unmapped moves |
| M3 — tutor reasons prefixed into `brain3_tutor_*` | §0, naming each fabricated code |
| M4 — `decideMove` context reduced to `{remaining: 10}` | §7, naming `breathe` and `wrapup` as unreachable |
| M5 — fake `'mcq'` mode restored | §4, both assertions |

**M1 exposed a real hole in this gate, and it is worth stating plainly.** Re-introducing the
*exact defect this phase exists to fix* did **not** turn the coverage assertion red. Because
`brain3_item_prior_*` fires on every answer, "every decision carries at least one reason code"
was satisfied by a single always-on source while memory, affect and calibration reasons were
being discarded again. **Coverage met by one source guards nothing** — the same trap as the
hollow manifest test from Phase A, in a new costume.

Fixed by asserting **per-source** coverage: reasons must arrive from each measuring family
(`item_prior`, `item_calibration`, `memory`, `affect`) across the session, plus `misconception`
and `evidence` on the answers that trigger them. That list is written by hand rather than derived
from the collector's own source — a gate that reads its expectations out of the code it tests
disappears together with that code. M1 re-run now fails on the assertion that names it:
*"tidak ada satu pun alasan dari keluarga ini sepanjang sesi — modulnya dihitung lalu dibuang
lagi: brain3_item_calibration_, brain3_memory_, brain3_affect_"*.

---

## 5. What is NOT proven

1. **Coverage is not informativeness.** Early in a learner's life most codes report *insufficient
   data*: `brain3_item_calibration_prior_only` (needs `MIN_N_APPLY` observations) and
   `brain3_affect_insufficient_evidence` (needs a filled window) fire on nearly every answer.
   Those codes are accurate — "I do not have enough evidence yet" is a real reason, not filler —
   but a reader of "10/10 explained" should know a large share of that explanation is the engine
   correctly saying it does not know enough yet.
2. **Nothing in production writes a trace.** `decisionTrace` remains `'off'` in the manifest.
   This is explainability of the decision path **as exercised by the pipeline**, which mirrors
   `app.js` but is not `app.js`.
3. **No learner ever saw these explanations.** They are for debugging, QA, evaluation and buyer
   demonstration — never surfaced to a learner, exactly as the phase brief requires.
4. **This says nothing about whether the decisions are *good*.** Phase F proves the engine can
   state its reasons and that those reasons change with evidence. Whether reteaching after two
   misses is pedagogically right is a Phase I/J/K question, and remains open.
