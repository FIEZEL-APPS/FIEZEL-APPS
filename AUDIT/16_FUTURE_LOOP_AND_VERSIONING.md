# 16 — The future loop, self-learning safety, and versioning (Phases N, O, P)

The brief calls Phases N and O "documentation only". **A prohibition that lives only in prose is
one that gets broken the day someone forgets to read it.** So the prohibitions here are written
down *and* enforced by `braincore-version-safety-test.js`.

---

## Phase N — Global Learning Intelligence: the interface, not the implementation

**It must not be built yet.** The brief is explicit, and Phase 1 confirmed it does not exist:
switched off at both ends, no aggregation job, and zero endpoints that return learning data.

The intended future architecture, recorded so it can be built correctly later:

```
PERSONAL BRAIN
   ↓  minimal learning evidence  (fiezel-braincore-evidence-v1 — designed, Phase K)
SERVER AGGREGATION
   ↓  global patterns
HYPOTHESES
   ↓  offline validation         (braincore-benchmark + braincore-study — built, Phases G/J)
SHADOW TEST
   ↓
HUMAN APPROVAL                   ← the step that must never be automated
   ↓
NEW BRAINCORE VERSION            (braincoreVersion — Phase P)
```

Two links of that chain already exist and are guarded: the evidence schema (Phase K) and the
offline validation machinery (Phases G and J). Everything from **server aggregation** onward is
deliberately absent.

**Enforced:** no Braincore module accepts a multi-learner argument, and the evidence module's
authority stays `off`. If either changes, the gate goes red.

## Phase O — Braincore must never rewrite its own production code

This is the most important prohibition in Phase 2 and the only one whose damage cannot be undone:
an engine that edits its own production code from learner data becomes something nobody reviewed,
without anyone noticing.

**Enforced, three ways:**

| property | how |
|---|---|
| nothing writes into `features/brain/` | every `.js` in the repo scanned for a file-write whose path argument names that directory |
| no code is born at runtime | no `eval(`, no `new Function(` in any Braincore module |
| **Human approval** is a required step | the loop above, recorded here, with that step named |

The required future loop, unchanged from the brief:

```
Observe → Analyze → Detect pattern → Generate hypothesis → Benchmark → Simulate
→ Shadow → Human approval → Version → Deploy → Monitor
```

## Phase P — versioning

`braincoreVersion` is carried by the Decision Trace, the evidence record, the benchmark spec and
the study results, and the gate asserts each matches `Manifest.bundleVersion`. A trace with **no**
version records `null` rather than being silently stamped with today's — a trace without a version
must *look* like one, so it is never quietly compared against another release.

---

## A documentation defect this phase caught

`SALE/BRAINCORE_ARCHITECTURE.md` claimed:

> *"Exports are frozen, so nothing can be monkey-patched at runtime."*

**That was false.** Measured: **4 of 23** modules freeze their exports. The other 19 return a plain
object and can be patched at runtime.

It was written for a prospective buyer. A buyer's engineer checks one claim, finds it false, and
then reasonably doubts everything else in the pack — which is why this matters more than the
technical impact, which is modest (in a browser, any script on the page can patch anything;
freezing is hardening, not a boundary).

Both `SALE/BRAINCORE_ARCHITECTURE.md` and `FINAL/BRAINCORE_READINESS_REPORT.md` now carry the
measured number, and the gate **pins the documented count against reality** — so the document
cannot drift away from the code again without a red build. Freezing the other 19 is a product
decision, not an audit's, and is left open.

## Three false accusations my own gate made first

Worth recording, because they are all the same mistake:

| assertion | flagged | reality |
|---|---|---|
| "nothing writes to `features/brain/`" | 6 files incl. this gate | naming the folder in a `require()` is not writing to it |
| "no population aggregation" | `fiezel-item-calibration.js` | `recenter()` takes a median over one learner's **items**, not over **learners** |
| (Phase M) "no queue/upload words" | 4 modules | `queue` is a breadth-first-search queue; `retryCount` is *the learner* retrying |

Every one was a keyword search standing in for a meaning check — the same defect this audit has
criticised in other people's tests. All three now test structure or argument shape instead.

## Honest limits

1. **These gates constrain this repository.** They cannot stop a future author adding a build step,
   a server job, or a dependency that does any of it elsewhere.
2. **`eval`/`Function` absence is not a sandbox.** It raises the cost of self-modification; it does
   not make it impossible.
3. **Phase N is unbuilt on purpose.** Nothing here says the future architecture is *correct* — only
   that it is written down, and that the human-approval step is named as non-optional.
