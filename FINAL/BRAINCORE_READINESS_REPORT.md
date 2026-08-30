# FINAL — Braincore Readiness Report

**Date:** 2026-08-30
**Repository:** `FIEZEL-APPS/FIEZEL-APPS` @ `a5abe3b`
**Scope:** FIEZEL Braincore as a standalone technology asset

---

## 1. Executive Summary

*In plain language, for a reader who is not a software engineer.*

You asked whether the "brain" inside FIEZEL — the part that decides what a student should learn
next and how well they know it — could be understood, documented, and prepared to be sold on
its own. This audit read the code, ran the tests, checked the licences, and traced the history.
Here is the honest answer.

**The good news, and it is genuinely good.**

You have built something real. Braincore is 21 pieces of software, about 8,900 lines, that
implement the actual scientific models used in serious educational research — not a marketing
label. It comes with 6,500 lines of tests, and **every single one of those tests passes**.
Crucially, **it does not contain one line of anyone else's code**. That is unusual, and it
means selling it does not drag anyone else's licence along with it.

It also has a property that most software of this kind does not: it is **pure calculation**. It
cannot draw on the screen, cannot reach the internet, cannot save anything, and cannot even
look at the clock. You give it numbers, it gives you numbers back. Because of that it can be
lifted out of FIEZEL and dropped into somebody else's product — and it already runs unchanged
in three different environments, so that is demonstrated rather than hoped for.

**The honest news, which matters just as much.**

Three things are not what a buyer might assume:

1. **You can prove the machine is built correctly. You cannot yet prove it teaches better.**
   There has never been a test with real students comparing FIEZEL against something else. The
   tool to measure exactly that was built, and never switched on. This is the single most
   important limitation, and it must be said out loud in anything you show a buyer.

2. **The brain is clean, but the wiring is not part of it.** The 21 modules are separable. The
   roughly 800–1,000 lines that connect them to storage and to a screen live inside the main
   app file. A buyer gets a real engine and has to spend roughly one engineer-month plumbing it
   in. That is a fair price for what they get — but they must be told, not left to discover it.

3. **FIEZEL does not learn from all its students.** Each child's device learns only about that
   child. The pipework for population-wide learning was designed thoughtfully and half-built,
   then switched off — and there is no way for the data to come back even if it were switched
   on. It is a foundation, not a feature.

**Things you must find out before selling.** Four questions this audit could not answer, in
order of urgency:

1. **What are Puter's terms?** Their code loads into every student's browser, handles login, and
   is not version-locked. Nobody has read their terms.
2. **What was the "secret incident"** mentioned in one of your configuration files? No details
   exist anywhere. If a key was ever exposed, it must be rotated.
3. **What is the agreement with your second contributor?** *Pilna Refa* has 219 commits — the
   second-largest contribution to the project — and there is no written IP assignment on record.
   **This is probably a bigger risk than the AI question, and it is more easily fixed.**
4. **What terms did the AI tools operate under?** You will need these documents for a lawyer.

**On the AI question specifically.** Roughly one commit in five openly records that an AI
assistant helped write it, and the project even has a written rulebook for coordinating AI
agents. **Do not delete any of that.** It is not a weakness. A scrubbed history is exactly what
a careful buyer looks for and distrusts — and deleting it would also destroy the evidence of
*your* contribution, which is documented unusually well: 478 places in the code record your
decisions, many quoting your own words.

**Overall status: 🟡 YELLOW — technically presentable, important work remaining.**

Not RED: the asset is real, tested, documented, dependency-free and demonstrably portable.
Not GREEN: there is no evidence it improves learning, and four legal questions are open.

**And to be explicit: nothing here says this is legally cleared for sale. No lawyer has looked
at it. Only a lawyer can say that.**

---

## 2. What Braincore Currently Is

| | |
|---|---|
| Location | `features/brain/` |
| Modules | 21 |
| Engine code | 8,899 lines / 440,086 bytes |
| Tests | 6,522 lines, 24 files, **24/24 pass** |
| Simulation harness | 3,049 lines |
| Third-party code | **Zero** |
| Runtime requirement | A JavaScript engine |
| Bundle version | 3.0.0 |
| Created | 2026-08-22, 8 days of development |

It implements: Item Response Theory ability estimation, Bayesian Knowledge Tracing, an
FSRS-style memory model, Elo-style item calibration, Bayesian misconception tracking with
hysteresis and decay, evidence credibility weighting, affect detection, a tutoring ladder with
step decomposition, self-regulated-learning coaching, and a statistics toolkit.

---

## 3. What Has Improved

Traced from the code's own record:

| Before | Now |
|---|---|
| Decisions from averages and fixed thresholds | Several independent models, each reporting its own confidence |
| "Level ±1" as difficulty | Ability-based targeting at an ~80% success rate, shifted by affect |
| One slowly-rising "stability" number | A memory half-life model with retrievability, and a single writer for the schedule |
| Symptom-level remediation | A prerequisite graph and root-cause analysis |
| All answers weighted equally | Evidence weighted 0.3–1.5 by timing, language load and replays |
| Learning logic mixed into the app | 21 pure, testable, portable modules |
| No identity for the learning policy | An explicit brain bundle version, separate from the product version |

---

## 4. What Actually Works

**Verified by execution, not assumed.**

| | Count |
|---|---|
| Braincore module tests passing | **24 / 24** |
| Quality-gate steps passing | **202 / 214** |
| Modules genuinely driving the student experience | **10** |
| Modules running in shadow | 6 |
| Modules built but not connected | 5 |

Verified properties: purity (all 21), determinism, dependency-freedom, explainability
(`rationale` on every output), graceful degradation, and privacy enforced by database structure
rather than policy.

---

## 5. What Has NOT Been Proven

| Claim | Status |
|---|---|
| Real students master more | ❌ **No evidence** |
| Real students retain longer | ❌ **No evidence** |
| Misconceptions actually reduce | ❌ **No evidence** |
| Interventions change outcomes | ❌ **No evidence** |
| Parameters are correctly calibrated | ❌ **Never validated** |
| Mastery scores are well calibrated | ❌ **Never checked** |
| Affect detection matches real emotion | ❌ **Never validated** |
| Global Learning Intelligence exists | ❌ **It does not** |

> **The sentence that must appear in any buyer material:**
> *We can prove the machine is built correctly. We cannot yet prove it teaches better.*

---

## 6. Architecture

Braincore is pure calculation with the host application owning all state, storage and
presentation. Twenty-one modules in five groups: decision core, learner model, measurement,
intervention, and instrumentation. UMD format, frozen exports, `rationale` and `confidence` on
every output, and an explicit `active` / `shadow` / `off` authority level per module.

*Detail: `SALE/BRAINCORE_ARCHITECTURE.md`, `AUDIT/02_BRAINCORE_DATA_FLOW.md`.*

---

## 7. Dependencies

**Braincore: none.**

The surrounding application: Lucide (ISC), fonts (SIL OFL), Supertonic 3 (MIT code /
**OpenRAIL-M weights**), sherpa-onnx (Apache-2.0), web-push (MPL-2.0), and the **Puter SDK
(UNKNOWN, unpinned, on the login path)**.

Three documentation defects were found in the root licence file, including **Fredoka shipping
to every user while the file says it was removed, with no licence text bundled.**

*Detail: `IP/DEPENDENCY_AUDIT.md`, `IP/THIRD_PARTY_LICENSES.md`.*

---

## 8. AI-Assisted Development

| Measure | Value |
|---|---|
| Total commits | 1,328 |
| Commits with a Claude co-authorship trailer | **254 (19.1%)** |
| Author identities | 30, several of them agents |
| Written multi-agent governance protocol | `AGENTS-COORDINATION.md` v1.2 |
| Owner directives quoted in source | **478** |
| Design / decision documents | 103 |

AI assistance was extensive, open, and governed by written rules requiring tests and honest
status labels. Human direction is documented unusually well — including several places where
the owner **overruled** what had been built.

**No legal conclusion is drawn. Recommendation: do not rewrite history.**

*Detail: `IP/AI_ASSISTED_DEVELOPMENT.md`.*

---

## 9. Security

**No live secret was found**, by two independent methods. The project's own scanner
(46/46 assertions, 1,041 files, 0 findings) was itself tested to prove it cannot be fooled by
its own allowlist.

Strengths: secrets by binding rather than by key; key rotation built in; a 24-hour rotating
identity pepper; **fail-closed defaults** — a deploy that forgets a secret produces a silent
API, not an open one.

**One open item:** a configuration comment refers to a past *"secret incident"* with no details
recorded anywhere. **UNKNOWN — the owner must close this.**

*Detail: `SECURITY/SECRET_AUDIT.md`.*

---

## 10. Standalone Sale Potential

**Strong, with a stated integration cost.**

| Factor | Assessment |
|---|---|
| Technically separable | ✅ Yes — already runs in three environments unchanged |
| Third-party obligations | ✅ None |
| Test coverage transfers | ✅ 6,522 lines, all passing |
| Documentation transfers | ✅ Extensive |
| Integration work required | 🟠 ~800–1,000 lines, **4–6 weeks for one engineer** |
| Missing front door | 🟠 `exportState()` / `importState()` |
| Outcome evidence | 🔴 **None** |

**A Braincore-only sale is markedly cleaner than an application sale.** Almost every legal
question in this audit belongs to the application — the speech weights, Puter, the fonts, the
content — and none of them travels with the engine.

*Detail: `SALE/CORE_SEPARATION_ANALYSIS.md`.*

---

## 11. Major Risks

| # | Risk | Severity | Owner |
|---|---|---|---|
| 1 | **No evidence the engine improves learning** | 🔴 | Owner — requires a study |
| 2 | **Puter: licence, terms, data handling all UNKNOWN** | 🔴 | Owner → lawyer |
| 3 | **Second contributor, 219 commits, no IP assignment** | 🔴 | Owner → lawyer |
| 4 | **AI tool terms not on file** | 🔴 | Owner → lawyer |
| 5 | No parameter calibrated against real learners | 🟠 | Requires data |
| 6 | ~800–1,000 lines of integration work | 🟠 | Disclose, or pre-build |
| 7 | Global Learning Intelligence does not exist | 🟠 | Disclose |
| 8 | Fredoka ships with no licence text | 🟠 | Half a day to fix |
| 9 | OpenRAIL-M flow-down on speech weights | 🟠 | Lawyer |
| 10 | Content provenance unverified | 🟠 | Owner |
| 11 | Undocumented past secret incident | 🟠 | Owner |
| 12 | Silent `catch{}` — failures degrade with no alarm | 🟠 | Engineering |
| 13 | Manifest stale; its guarding test is hollow | 🟡 | Half a day to fix |
| 14 | Test suite writes to tracked files | 🟡 | ~1 day to fix |
| 15 | 5 pre-existing failures, 4 in voice/audio | 🟡 | Not Braincore |

---

## 12. Recommended Next Steps

### Do first — 1.5 days total, removes three findings a buyer would otherwise find

| # | Action | Effort |
|---|---|---|
| 1 | Fix the stale manifest (`stepTutor`, `productionGrader` → `active`) and replace the hollow test with one that actually reads `app.js` | 0.5 day |
| 2 | Fix the licence documentation — Fredoka, retired Kokoro entries, missing OFL texts | 0.5 day |
| 3 | Make the test suite read-only | 1 day |

### Do next — the legal file, in parallel and costing no engineering time

| # | Action |
|---|---|
| 4 | Obtain Puter's terms of service and data-processing terms |
| 5 | Obtain the AI tools' terms as they stood when used |
| 6 | **Put the second contributor's IP position in writing** |
| 7 | Document the past secret incident and confirm rotation |
| 8 | Establish content provenance |
| 9 | **Give all of the above to a qualified lawyer** |

### Then — engineering that raises the asset's value

| # | Action | Effort | Why |
|---|---|---|---|
| 10 | Build `exportState()` / `importState()` | 2–3 days | Turns modules into an engine |
| 11 | Extract `braincore-runtime.js` — move the glue out of `app.js` | 5–8 days | Cuts buyer integration from a month to a week, **and improves FIEZEL** |
| 12 | Package a standalone demo with no FIEZEL UI | 3–5 days | The most persuasive artefact you can hand a buyer |
| 13 | Add an alarm for silent module failure | 1–2 days | Closes risk 12 |
| 14 | Fix the five voice/audio failures | 3–5 days | Needed for an application sale |

### The one that changes the price

| # | Action | Effort | Why |
|---|---|---|---|
| 15 | **Run a real learning study.** Switch on the telemetry lane, connect `learning-metrics.js`, recruit a cohort, run an A/B test | **2–3 months** | This is the difference between *"a well-built engine"* and *"an engine proven to teach better."* It is the largest single increase in value available, and everything needed to do it is already built. |

---

## 13. Estimated Engineering Effort

| Package | Effort |
|---|---|
| Credibility fixes (steps 1–3) | **1.5 days** |
| Sale-readiness engineering (steps 10–12) | **10–16 days** |
| Application health (steps 13–14) | **4–7 days** |
| **Subtotal to a strong technical package** | **≈ 16–25 working days (3–5 weeks)** |
| Legal file (steps 4–9) | Owner time + lawyer fees, no engineering |
| **Learning-outcome study (step 15)** | **2–3 months** |
| *Buyer's own integration, for reference* | *4–6 weeks* |

---

## 14. Final Readiness Status

# 🟡 YELLOW — TECHNICALLY PRESENTABLE

**The asset can be demonstrated honestly today. Important validation and documentation remain.**

**Why not RED:** the asset is real and verified. 8,899 lines of original, dependency-free code;
24/24 tests passing; purity and portability proven by execution in three environments; no
secrets exposed; privacy enforced structurally; extensive documentation; separation
demonstrated and its cost measured rather than guessed.

**Why not GREEN:** no evidence it improves learning; no parameter calibrated against real
learners; four open legal questions; ~800–1,000 lines of integration work a buyer must do; and
three small defects a reviewer would find in their first hour.

**Path to GREEN (technical):** complete steps 1–3 and 10–12 — roughly 3–4 weeks — and the
technical package becomes organised, reproducible, documented and genuinely ready for buyer
due diligence.

**But note carefully:** even after that, *"proven to improve learning"* remains unavailable
until step 15 is done. GREEN as a **technical** package and GREEN as an **effectiveness** claim
are different things, and only the first is within reach in weeks.

### ⚖️ Legal status

> **NOT LEGALLY CLEARED.**
>
> No qualified legal professional has reviewed this repository, its dependencies, its
> AI-assisted development record, or its contributor arrangements.
>
> **This audit is a factual record prepared so that a lawyer can do that work efficiently. It
> is not legal advice and must not be relied on as such.**

---

## 15. The Owner's Questions, Answered

| Question | Answer |
|---|---|
| **What exactly do I own/control?** | 8,899 lines of original, dependency-free adaptive-learning engine, 6,522 lines of passing tests, a 3,049-line simulator, and substantial documentation. Two ownership questions remain open (AI tool terms; second contributor). |
| **What exactly is Braincore?** | 21 pure calculation modules that decide what a student studies next and how well they know it. |
| **What does it actually do?** | 10 modules genuinely drive the student's experience; 6 observe; 5 are built but unconnected. |
| **What still needs improvement?** | Outcome validation, parameter calibration, extracting the wiring layer. |
| **What third-party software does it use?** | **Braincore: none.** The application: Lucide, fonts, Supertonic 3, sherpa-onnx, web-push, Puter. |
| **What happened during AI-assisted development?** | Extensive, open, governed by written rules. 19.1% of commits record it. Do not delete it. |
| **Can Braincore be separated from FIEZEL?** | **Yes.** The engine is already portable; ~800–1,000 lines of wiring must be rebuilt. |
| **What would a buyer actually receive?** | `IP/BRAINCORE_ASSET_INVENTORY.md` §1, and §2 lists what they would not. |
| **What must a lawyer verify before the sale?** | Puter's terms; AI tool terms; the second contributor's assignment; OpenRAIL-M flow-down; content provenance; font notices. |

---

## Document index

| Document | Answers |
|---|---|
| `AUDIT/00_REPOSITORY_SNAPSHOT.md` | What is in the repository |
| `AUDIT/01_BRAINCORE_COMPONENT_MAP.md` | What Braincore is, module by module |
| `AUDIT/02_BRAINCORE_DATA_FLOW.md` | How one learning interaction flows |
| `AUDIT/03_LOCAL_SERVER_DATA_MAP.md` | What is stored where; the Global Intelligence question |
| `AUDIT/04_BRAINCORE_TECHNICAL_ASSESSMENT.md` | Whether the algorithms are good |
| `AUDIT/05_BRAINCORE_TEST_STATUS.md` | Whether it actually works |
| `IP/DEPENDENCY_AUDIT.md` | What is borrowed and under what terms |
| `IP/THIRD_PARTY_LICENSES.md` | Corrected licence list |
| `IP/AI_ASSISTED_DEVELOPMENT.md` | How AI was used |
| `IP/DEVELOPMENT_HISTORY.md` | Who built it and when |
| `IP/BRAINCORE_ASSET_INVENTORY.md` | What is included in a sale |
| `SECURITY/SECRET_AUDIT.md` | Whether anything is exposed |
| `SALE/BRAINCORE_OVERVIEW.md` | Buyer-facing introduction |
| `SALE/BRAINCORE_ARCHITECTURE.md` | Technical architecture |
| `SALE/CORE_SEPARATION_ANALYSIS.md` | Whether it can stand alone |
| `SALE/KNOWN_LIMITATIONS.md` | Everything wrong with it |
| `SALE/DEPLOYMENT_GUIDE.md` | How to run it |
| `SALE/BUYER_DUE_DILIGENCE.md` | Direct answers for a buyer |
| `FINAL/BRAINCORE_READINESS_REPORT.md` | This document |

---

*Every claim is traceable to a numbered finding. Where something could not be determined, it is
marked UNKNOWN rather than guessed. No test result was assumed; all 214 gate steps were
executed. The repository's product code was not modified to produce this audit.*
