# 09 — Braincore Benchmark (Phase 2 / Phase G)

**What was built:** `benchmarks/braincore-benchmark-v1.json` (24 deterministic scenarios),
`braincore-benchmark.js` (runner), `braincore-benchmark-test.js` (16-assertion gate, registered
in `quality.yml`).

**What it measures:** the **per-answer decision path** — the eighteen Braincore modules that
`adaptivity-simulation-v3.js` does not touch. That existing simulator owns the item-selection
policy layer and has real statistical machinery behind it (seeded, multi-seed, bootstrap CIs).
Building a second benchmark over the same layer would eventually produce two sets of numbers that
disagree, with nothing to arbitrate. See `AUDIT/08`.

---

## 1. The defect it found on its first run

**`Calibration.observe()` had been called with invented field names since Phase C.**

The pipeline passed `{correct, weight, prior}`. The module requires
`{ok, kappa, priorDifficulty, ability}`. `observe()` validates its input and — by deliberate
design — **returns the state untouched** when a required field is missing, rather than throwing:

```js
if (!isFiniteNumber(evidence.priorDifficulty) || !isFiniteNumber(evidence.ability)) return next;
if (typeof evidence.ok !== 'boolean') return next;
```

So it was called on every answer, returned a plausible-looking object, and **never recorded a
single piece of evidence**. `items` stayed `{}` forever. Item calibration was a **no-op through
Phases C, D, E and F.**

Measured, before and after the fix — 14 answers on one item:

| item behaviour | effective difficulty, before | after |
|---|---|---|
| consistently failed | 2.35 (= prior, unchanged) | **2.95** |
| consistently correct | 2.35 (= prior, unchanged) | **1.75** |
| alternating | 2.35 (= prior, unchanged) | 1.874 |

**Three things must be said precisely about this.**

1. **It is my defect, not the product's.** `app.js:2315` calls the module **correctly**:
   `{itemId, priorDifficulty: prior, ability, ok: !!ok, kappa: k}`. This must not be reported as
   "item calibration is broken."
2. **No gate could have seen it.** Nothing threw, so the pipeline's `guard()` — built in Phase C
   precisely to stop silent degradation — stayed empty. Every gate before this one asked whether
   the pipeline *runs*; none asked whether each module inside it actually *stores* anything.
   The reason code `brain3_item_calibration_prior_only` appearing in every trace was **honest** —
   it correctly reported "no calibration data yet" — but the cause was this file, not a cold start.
3. **The earlier phases' conclusions survive, and I checked rather than assumed.** All five brain
   gates still pass, and Phase D's final mastery is byte-identical
   (`{"A_kuat":1,"B_kesulitan":0.173,"D_penebak":0.901,"E_bahasa":0.174}`) — BKT mastery does not
   read item difficulty. What was weaker than stated is the Phase C claim that the pipeline "runs
   the real modules in production order": for this one module, it ran it and threw the result away.

Two scenario inputs of mine were also wrong and were caught the same way: `integrity: 'rejected'`
(the module's value is `'evidence_mismatch'`, so kappa stayed 1 instead of dropping to 0), and a
calibration scenario using 50%-accuracy evidence, whose delta correctly fell inside `DEAD_ZONE`.
Both are now fixed and both directions are locked as scenarios.

---

## 2. The eight required measurements, and where each lives

| # | measurement | held by |
|---|---|---|
| 1 | mastery response | 3 scenarios — rise, fall, and the gate that one answer must not open |
| 2 | memory response | 3 — long gap (102.6 d), short gap (12.9 d), lapse (0.387 d) |
| 3 | misconception persistence | 4 — becomes active cross-session; **not** within one session; recovers; recovery is deliberately slow |
| 4 | difficulty adaptation | 5 — mode, level, calibration up, calibration down, thin-evidence non-reaction |
| 5 | evidence credibility | 4 — guess 0.3, reliable 1.0, language load 0.45, integrity **0** |
| 6 | next-action selection | 5 — reteach, breathe, stretch, wrapup, and guessing that must **not** stretch |
| 7 | consistency | the gate: the whole benchmark runs twice and must be identical |
| 8 | regression safety | the gate: comparison against recorded expectations |

`§1` of the gate asserts every one of the eight is genuinely held — a benchmark that promises
eight measurements and quietly skips one claims to be broader than it is.

## 3. Why this is not just a golden file

A golden file asks only *"are the numbers the same?"* If someone runs `--write-expectations` after
a regression, a golden file goes green forever over broken behaviour.

`§4` therefore asserts **relationships that must hold whatever the numbers are**, written from
each scenario's stated question rather than from its output: correct evidence must end higher than
wrong; spacing must beat cramming; the `MIN_SESSIONS` fence must hold; calibration must move in
**both** directions; a discount must reach mastery rather than decorate the trace; a streak of
guesses must **not** raise the level.

**Proven, not asserted.** The original calibration defect was re-introduced into a copy of the
tree, then `--write-expectations` was run to bless it:

```
ok   - §2 SELURUH skenario cocok dengan nilai yang direkam      ← golden comparison satisfied
FAIL - §4 kesulitan: kalibrasi menggeser DUA ARAH ...
       "item yang konsisten gagal tidak menjadi lebih sulit — kalibrasi mati lagi"
```

Regenerating the expectations silenced §2 and **did not** silence §4.

---

## 4. What this does NOT prove

1. **The `expect` values are recorded from this engine.** They are not derived from learning
   theory and not validated against real learners. This benchmark proves **stability** and
   **comparability across releases** — it does **not** prove **correctness**. It cannot tell
   anyone that reteaching after two misses is pedagogically right.
2. **"24/24 scenarios match" means "this release decides exactly as it did when recorded."** It
   does not mean the engine teaches well. That misreading is the single biggest risk this file
   carries, which is why the warning is in the JSON, in the runner, in the gate, and here.
3. **Synthetic input only.** No real learner has been through any of these scenarios.
4. **One layer only.** Item selection is not measured here and must not be inferred from here.
