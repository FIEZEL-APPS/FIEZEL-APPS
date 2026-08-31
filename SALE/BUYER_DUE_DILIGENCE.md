# SALE — Buyer Due Diligence Package

*Direct answers to the questions a buyer will ask. Every answer is traceable to a numbered
finding. Nothing here is projection or promise.*

---

## What is Braincore?

An adaptive learning engine: **21 self-contained JavaScript modules, 8,899 lines**, that decide
what a student should study next, estimate what they actually know, predict when they will
forget it, and identify the specific misunderstanding behind a wrong answer.

It ships with **6,522 lines of tests, all of which pass**, and a **3,049-line simulation
harness**.

---

## What does it actually do?

For each answer a student gives, it:

1. Predicts, before the answer, how likely they are to be right
2. Decides how much to trust the answer (a two-second guess counts for 0.3, not 1.0)
3. Updates a Bayesian estimate of what they know
4. Recalculates when they will forget it, and schedules the next review
5. Identifies and tracks the specific misconception behind the error
6. Detects frustration or boredom and shifts the difficulty target
7. Selects the next question at roughly an 80% success target
8. Decides whether to re-teach, hint, or advance

Every decision carries a reason code and a confidence value.

---

## What is unique about it?

| # | Property | Why it is rare |
|---|---|---|
| 1 | **Reading load is separated from subject difficulty** | When a beginner fails an English grammar question, you cannot tell whether they failed the grammar or failed to read it. Braincore weights that evidence at 0.45 instead of 1.0. Most systems ignore this confound entirely. |
| 2 | **Every module is pure** | No DOM, no network, no storage, no clock, no randomness — in all 21 files. Exactly testable, fully portable, structurally incapable of leaking data. |
| 3 | **Evidence is weighted, not counted** | Typed production 1.5; rushed guess 0.3; correct-after-three-replays 0.6. Most BKT implementations treat all evidence as equal, which is known to be wrong. |
| 4 | **It is careful about accusing students** | Low prior, two-session minimum, separate entry and exit thresholds, 14-day decay. |
| 5 | **Confidence is a first-class output** | *"A model that is confident on three answers is more dangerous than no model at all, because it sounds convincing."* — from the source. |
| 6 | **Shadow mode is built in** | New models can run alongside old ones, recording what they *would* have decided, risking nothing. |
| 7 | **It works fully offline** | A permanent server outage would not stop a single student learning. |
| 8 | **Privacy is structural, not policy** | Three separate databases that cannot be joined. There is nowhere to put identity next to learning results. |

---

## Which components are implemented?

| Status | Count | Modules |
|---|---|---|
| **Genuinely driving the student experience** | **10** | core-brain, tutor-brain, misconception-ledger, item-prior, item-calibration, evidence-credibility, affect, srl-coach, production-grader, step-tutor |
| **Running, but informing diagnostics only** | **6** | mastery-bkt (for unlock), confusion-matrix, olm, listening-adaptive, speaking-adaptive, brain-manifest |
| **Built and tested, not connected** | **4** | learning-metrics, metrics-digest, stat-gate, brain-config |
| **Not loaded** | **1** | retention-probe |

*Source: `AUDIT/01_BRAINCORE_COMPONENT_MAP.md`.*

**Plain language:** the five unconnected modules are **finished, passing code that is not
plugged in** — unconnected inventory, not broken parts.

---

## What is experimental?

The 5 modules above, plus 6 running in shadow mode. **None is broken; all 24 module tests
pass.**

The learning-telemetry lane is complete end to end and **switched off at both ends**.

---

## What has been tested?

**All 214 quality-gate steps were executed for this audit** — not read from a badge.

| | Count |
|---|---|
| PASS | **202** |
| FAIL | 8 |
| TIMEOUT (unmeasured) | 3 |
| Live-infrastructure (not applicable here) | 1 |

**Braincore specifically: 24 / 24 pass.**

Of the 8 failures: 1 is caused by test cross-contamination and passes in isolation; 2 require
live Cloudflare infrastructure; **5 are genuine pre-existing failures, and four of those five
are in the voice/audio subsystem — none is Braincore.**

*Source: `AUDIT/05_BRAINCORE_TEST_STATUS.md`.*

---

## ⚠️ Has it been proven to improve learning?

**No.**

There is no A/B test, no control group, no before-and-after study, and no field data. Every test
proves the code is correct. **None proves a student learns more.**

The instrument built to measure exactly this (`fiezel-learning-metrics.js` — learning gain,
retention at gap, Brier calibration, hint dependency, misconception persistence) is complete,
tested, and **connected to nothing.**

**This is stated plainly because it is the single most important limitation of the asset.**

---

## What dependencies exist?

**Braincore: none. Zero. No imports, no libraries, no bundled code.** Verified by reading all
21 files.

The surrounding FIEZEL application has: Lucide (ISC), three/four font families (SIL OFL),
Supertonic 3 speech engine (MIT code / **OpenRAIL-M weights**), sherpa-onnx (Apache-2.0),
web-push (MPL-2.0), and the **Puter SDK (licence UNKNOWN, live-loaded, unpinned)**.

*Source: `IP/DEPENDENCY_AUDIT.md`.*

---

## What licences apply?

**To Braincore: none inherited.** A Braincore-only purchase carries no third-party licence
obligations.

To the application: see the table in `IP/THIRD_PARTY_LICENSES.md`. Three items need attention —
Fredoka ships undocumented; the speech model weights are use-restricted (OpenRAIL-M); Puter's
terms are unknown.

---

## What infrastructure does it require?

**Braincore: a JavaScript engine. Nothing else.**

The application: a Cloudflare account (free tier is sufficient), a domain in Cloudflare DNS, a
static HTTPS host, a Puter account, and an ElevenLabs key for build-time audio.

---

## Can it operate independently?

**Yes — with a stated cost.**

The engine is already portable (proven: it runs unchanged in a browser, in Node.js, and in the
simulation harness). What is **not** included is the orchestration layer — **measured at 70
functions / 784 lines in `app.js`**, realistically 800–1,000 lines to rebuild.

**Estimated buyer effort: 4–6 weeks for one engineer.** `app.js` is supplied as the reference
implementation.

One genuinely missing piece: `exportState()` / `importState()`.

*Source: `SALE/CORE_SEPARATION_ANALYSIS.md`.*

---

## How can a buyer deploy it?

See `SALE/DEPLOYMENT_GUIDE.md`. In short: Braincore needs nothing but a JS runtime; the
application needs a one-time Cloudflare setup because the repository ships **placeholder**
database IDs.

---

## What technical risks remain?

| # | Risk | Severity |
|---|---|---|
| 1 | **No proof of learning effectiveness** | 🔴 |
| 2 | **Puter: licence, terms and data handling all UNKNOWN**; unpinned and on the login path | 🔴 |
| 3 | **Second contributor (219 commits) with no IP assignment on record** | 🔴 |
| 4 | AI tool terms of service not on file | 🔴 |
| 5 | No parameter calibrated against real learners | 🟠 |
| 6 | ~800–1,000 lines of integration work required | 🟠 |
| 7 | Global Learning Intelligence does not exist | 🟠 |
| 8 | Fredoka ships with no licence text | 🟠 |
| 9 | OpenRAIL-M flow-down on the speech weights | 🟠 |
| 10 | Learning-content provenance unverified | 🟠 |
| 11 | The manifest is stale on 2 entries; its guarding test is hollow | 🟡 |
| 12 | The test suite writes to tracked files | 🟡 |
| 13 | Five pre-existing failures in voice/audio | 🟡 |
| 14 | Silent `catch{}` — a failing module degrades with no alarm | 🟠 |
| 15 | Undocumented past "secret incident" | 🟠 |

Full detail: `SALE/KNOWN_LIMITATIONS.md`.

---

## What documentation is included?

| Category | Volume |
|---|---|
| Braincore-specific design documents | 7 files, ~136 KB |
| This audit set | 15 documents across `AUDIT/`, `IP/`, `SECURITY/`, `SALE/`, `FINAL/` |
| Project-wide documentation | 244 markdown files |
| Cloudflare runbooks | `docs/` — migration, rollout, D1 backup/capacity/retention |
| Inline documentation | Extensive — including recorded reversals and the owner's own words |

**Worth noting:** the source comments record *why* decisions were made, including several where
review caught an earlier mistake and said so. For a buyer inheriting the code, this is unusually
valuable.

---

## What is NOT included?

| Not included | |
|---|---|
| The orchestration layer | ~800–1,000 lines in `app.js` — reference only |
| The user interface | Not part of Braincore |
| Learning content | Provenance unverified; not part of the Braincore asset |
| The speech engine | Third-party, use-restricted |
| Login / identity | Puter, third party |
| The server API | Quota and identity only — it does not run Braincore |
| **Any proof of learning effectiveness** | Does not exist |
| A working Cloudflare deployment | Placeholder IDs |
| Global Learning Intelligence | Does not exist |
| Legal clearance | **No lawyer has reviewed this** |

---

## Questions the seller must answer before signing

1. **Puter's terms of service and data-processing terms** — *highest priority*
2. **AI tool terms of service** at the times they were used
3. **The second contributor's IP assignment** (219 commits)
4. **Details of the past "secret incident"**, and confirmation of rotation
5. **Learning-content provenance**
6. **What exists from before 2026-08-13**, where the git history begins
7. **Legal review** of everything above

---

## How to verify these claims yourself

```bash
git clone <repo> && cd FIEZEL-APPS
git fetch --unshallow          # ⚠️ REQUIRED — default clone shows 285 of 1,328 commits

# Braincore is dependency-free — check for yourself:
grep -rE "require\(|^import |from ['\"]" features/brain/    # → no results

# Braincore is pure — check for yourself:
grep -rE "document\.|fetch\(|localStorage|Math\.random|Date\.now\(" features/brain/
# → results appear only inside comments explaining why they are forbidden

# Run the Braincore tests:
node core-brain-test.js && node tutor-brain-v3-test.js && node mastery-bkt-test.js

# ⚠️ After running the full gate, restore the tree:
git checkout -- grammar-templates.json AI-ACCOUNT-CAP-GATE.json
```

---

*End of SALE/BUYER_DUE_DILIGENCE.md.*
