# SALE — Known Limitations

*Everything wrong with, missing from, or unproven about Braincore and FIEZEL, collected in one
place.*

**Why this document exists.** A buyer will find these anyway. Finding them in the seller's own
documentation builds trust; finding them after being told everything was fine destroys it.
Every item below is traceable to a specific finding elsewhere in the audit.

---

## Severity key

| | Meaning |
|---|---|
| 🔴 **Blocker** | Must be resolved before a sale can responsibly complete |
| 🟠 **Major** | Materially affects value or requires disclosure |
| 🟡 **Minor** | Should be fixed; does not block |
| ℹ️ **Note** | Informational; a buyer should simply know |

---

## 1. The big one: no evidence it improves learning

🔴 **BLOCKER for any claim about effectiveness — not a blocker for a technology sale.**

| Claim | Status |
|---|---|
| The code is correct | ✅ Proven — 24/24 module tests pass |
| The models are deterministic and pure | ✅ Proven |
| The simulation runs and behaves sensibly | ✅ Proven |
| **Real students master more** | ❌ **No evidence** |
| **Real students retain longer** | ❌ **No evidence** |
| **Misconceptions actually reduce** | ❌ **No evidence** |
| **Interventions change outcomes** | ❌ **No evidence** |

There has been no A/B test, no control group, no before-and-after study, and no field data —
because the telemetry that would collect it is switched off, and because there is no evidence
the app has had a body of real students to measure.

The measuring instrument (`fiezel-learning-metrics.js`) was **built, tested, and never
connected to anything.**

**What this means for the sale:** Braincore may honestly be sold as *a well-engineered,
research-grounded, fully-tested adaptive learning engine.* It may **not** be sold as *proven to
improve learning outcomes.* Any material that blurs this is a misrepresentation.

*Source: `AUDIT/05_BRAINCORE_TEST_STATUS.md` §6.*

---

## 2. Global Learning Intelligence does not exist

🟠 **Major — must be disclosed**

The system does not learn from a population of students. Each device learns only about its own
student.

| Component | Status |
|---|---|
| Event schema | ✅ Designed, privacy-reviewed |
| Database | ✅ Created, privacy-locked |
| Client queue | ✅ Built |
| Upload endpoint | ✅ Built |
| **Client emitter** | ⛔ **Default mode `off`** |
| **Server flag** | ⛔ **`LEARNING_ENABLED = "off"`** |
| **Aggregation job** | ❌ **Does not exist** |
| **Any way to read the data back** | ❌ **Does not exist — 0 endpoints** |

**Even if switched on tomorrow, nothing would come back.** The pipe runs one way and terminates
in a counter table.

**The concrete cost:** every student's device independently re-learns how difficult each
question is, from scratch, and none of them ever share what they learned.

**Honest positioning:** *a designed, privacy-reviewed, partly built foundation for population
learning* — not an existing capability.

*Source: `AUDIT/03_LOCAL_SERVER_DATA_MAP.md` §4.2.*

---

## 3. Braincore cannot be dropped in — ~800–1,000 lines must be rebuilt

🟠 **Major — must be disclosed**

The 21 modules are pure and portable. The orchestration that connects them — storage adapters,
session state, the evidence door, the selection logic — lives inside `app.js`, measured at
**70 functions / 784 lines**, realistically 800–1,000 with the diagnostic rendering.

**Buyer effort: roughly 4–6 weeks for one engineer.**

Also missing: **`exportState()` / `importState()`.** There is no single object representing a
learner's Braincore state; it is 8 separate storage keys stitched together by `app.js`.

*Source: `SALE/CORE_SEPARATION_ANALYSIS.md` §3, §5.*

---

## 4. No parameter has been calibrated against real learners

🟠 **Major**

Every constant is a reasoned default from the research literature, not a measurement:

| Model | Parameters | Calibrated? |
|---|---|---|
| BKT | `L0=0.2, T=0.15, slip=0.1, guess=0.25` | ❌ Literature defaults, one set for every skill |
| Memory | Retention target 0.9 | ❌ Never validated against actual recall |
| Difficulty | `DISCRIMINATION=1.5`, `TARGET_SUCCESS=0.8` | ❌ Single global values |
| Misconceptions | 0.7 / 0.3 thresholds, 14-day half-life | ❌ Chosen, not fitted |
| Evidence weights | 0.3 guess / 0.45 low-level English | ❌ Reasoned, not measured |
| Affect | State thresholds | ❌ Never checked against actual frustration |

Real deployments fit these per skill from data. That cannot happen here because there is no
data (§1, §2).

**One is self-flagged by the code itself.** `LANG_TH = 1` carries a source comment stating it
is *"an editorial transfer from the Indonesian calibration, NOT a measured number for Thai
students"*, explaining exactly why the transfer might be wrong and naming the condition for
fixing it. **That honesty is a credibility asset even though the number is a limitation.**

*Source: `AUDIT/04_BRAINCORE_TECHNICAL_ASSESSMENT.md` §10.*

---

## 5. The repository's own self-description is out of date

🟡 **Minor — but embarrassing if a buyer finds it first**

`fiezel-brain-manifest.js` declares `stepTutor` and `productionGrader` as `'off'` with the
comment *"zero references in app.js"*. **Both have live call sites.** The production grader in
particular decides whether a student's typed answer is right or wrong.

**Worse, the test that should have caught this is hollow.** `brain-manifest-test.js` contains a
test named *"modules with no reference in app.js are declared off"* whose entire body asserts
two hard-coded constants against two other hard-coded constants. **It passes. It always will.**

The error runs in the safe direction — the manifest *understates* what Braincore does — but a
reviewer who finds a green test guarding nothing will start doubting every other green check.

**Fix: half a day.** Correct the two entries; replace the test with one that actually reads
`app.js`.

*Source: `AUDIT/01_BRAINCORE_COMPONENT_MAP.md` §5.*

---

## 6. The test suite is not read-only

🟡 **Minor — but a buyer will hit it on day one**

Running the suite **modifies tracked files.** Confirmed and reproducible:
`ai-account-cap-gate-test.js` rewrites `AI-ACCOUNT-CAP-GATE.json` on every run. Something in
the run also rewrites `grammar-templates.json`'s `updatedAt` (exact writer **UNKNOWN**).

**The consequence is worse than the cause:** `id-golden-snapshot-test.js` then fails because the
file's hash no longer matches. It **passes in isolation on a clean tree** — verified both ways.

**Plain language:** one test's mess makes a different test fail. A buyer running the suite will
see a red failure that is not a real bug and will not know that.

**Fix: about a day.** Gates should write reports outside the tracked tree.

*Source: `AUDIT/05_BRAINCORE_TEST_STATUS.md` §4.1.*

---

## 7. Five genuine pre-existing test failures

🟡 **Minor for a Braincore sale — 🟠 Major for an application sale**

All verified as failing on a clean, unmodified tree, and confirmed pre-existing against `main`.

| Test | Failure |
|---|---|
| `regression-test.js` | `quiz renderer does not show passage with reading question` — **stale test, not a product bug; see below** |
| `listening-subtitle-suppression-test.js` | 4 of 8 assertions — `say() never called` |
| `listening-exam-test.js` | `Failed audio keeps the questions locked` |
| `speaking-exam-test.js` | `Exam sessions are level-scoped like everything else` |
| `voice-fallback-chain-test.js` | `say() returning false triggers speechSynthesis fallback` |

**Four of five cluster in the voice/audio subsystem.** That is one broken area, not five
unrelated bugs — **and none of them is Braincore.** All 24 Braincore tests pass.

**The fifth is not a product bug at all.** `regression-test.js` fails because an i18n key was
renamed from `quiz.teks-bacaan` to `quiz.reading-eyebrow` and the test still pins the old name.
The reading-passage card renders correctly in both Indonesian (`copy-id-app-e.js:42` →
`'TEKS BACAAN'`) and Thai (`copy-th-app-e.js:42` → `'บทอ่าน'`). Nothing a student sees is
broken. The old key survives as an orphan in `copy-id-app-d.js:316` / `copy-th-app-d.js:316`,
referenced by nothing but the stale test. **Fix: update the assertion to the current key name
and delete the two orphaned entries.** *(Detail: `AUDIT/05_BRAINCORE_TEST_STATUS.md` §4.3.)*

⚠️ **The Quality Gate halts at the first failure.** It runs sequentially under `bash -e`, so it
stops at `regression-test.js` and never reaches the later steps. **CI reports one failure; there
are five.** A buyer reading the CI badge alone would materially understate the open bug count —
which is exactly why this audit ran all 214 steps directly instead of trusting the gate.

Additionally, **three steps time out** and are therefore **unmeasured, not passing**:
`content-adoption-test.js`, `fiezel-evolution-loop-test.js`, `release-audit-gate-test.js`.

*Source: `AUDIT/05_BRAINCORE_TEST_STATUS.md` §4.3, §4.4.*

---

## 8. Licence documentation defects

🟠 **Major for an application sale — not applicable to a Braincore-only sale**

| # | Defect | Severity |
|---|---|---|
| 1 | **Fredoka ships to every user** (29,704 bytes, precached in `sw.js`, used in `style.css`) while `THIRD-PARTY-LICENSES.md` says it was removed. **No licence text is bundled.** | 🔴 Fix before sale |
| 2 | **Kokoro entries** describe code as "bundled" that no longer exists in the tree | 🟡 |
| 3 | **Retired sherpa-vits directories** described as still present; both are gone | 🟡 |
| 4 | Instrument Serif and Plus Jakarta Sans: OFL declared, licence text **not bundled** | 🟡 |

**Braincore itself has zero third-party content**, so none of this travels with a
Braincore-only sale.

*Source: `IP/THIRD_PARTY_LICENSES.md` §4.*

---

## 9. Unknowns that only the owner or a lawyer can close

🔴 **Blockers until answered**

| # | Unknown | Who must answer |
|---|---|---|
| 1 | **Puter's licence, terms of service, and data-processing terms.** Live-loaded, unpinned, on the login path, in an app used by learners who may be minors. **Highest-priority unknown in the audit.** | Owner → lawyer |
| 2 | **AI tool terms of service** at the times they were used. Central to the ownership question. | Owner → lawyer |
| 3 | **The second contributor's IP position.** `Pilna Refa` has 219 commits — the second-largest contribution — with no assignment on record. **Probably more pressing than the AI question.** | Owner → lawyer |
| 4 | **The past "secret incident"** referred to in `wrangler.toml` with no details recorded. What was exposed, when, and was it rotated? | Owner |
| 5 | **Learning content provenance.** 93,892 lines of vocabulary and 31,026 of reading; origin not independently verified. | Owner |
| 6 | **OpenRAIL-M flow-down** on the speech model weights. | Lawyer |
| 7 | **Whether share-alike dictionary data leaked** into the bundled content. | Owner / technical check |
| 8 | **Development before 2026-08-13.** Git history begins mid-project. | Owner |

---

## 10. Smaller technical notes

| # | Item | Severity |
|---|---|---|
| 1 | **Silent `catch{}` everywhere.** If a Braincore module started failing, the app would keep running, quietly stop being adaptive, and **nothing would report it.** No alarm exists. | 🟠 |
| 2 | **`GUESS_FLOOR = 0.25` assumes exactly 4 options.** 3- or 5-option questions are mis-modelled. | 🟡 |
| 3 | **Confusion matrix computes `suggestPrerequisiteEdges()` and nothing reads it.** Built, tested, ignored — arguably the most under-exploited asset in Braincore. | 🟡 |
| 4 | **Indonesian strings frozen inside pure modules.** `app.js` reassembles Thai externally. A buyer in another language must externalise these. | 🟡 |
| 5 | **Cloudflare database IDs are placeholders.** The repository alone cannot deploy the API without a setup step. | ℹ️ |
| 6 | **No `package-lock.json`.** Low practical risk (one dependency, server-side only) but reviewers ask. | ℹ️ |
| 7 | **ES5-style modules** (UMD, `var`, no `class`). Deliberate, for compatibility. Some buyers will want TypeScript types. | ℹ️ |
| 8 | **`app.js` is 9,584 lines** and mixes UI, Braincore glue, onboarding, settings, social and diagnostics. | 🟠 for an application sale |
| 9 | **Shallow clones hide the history.** A reviewer cloning with default depth may see 285 commits instead of 1,328 and badly underestimate the work. **Tell them to fetch full history.** | ℹ️ |

---

## 11. What is genuinely good

For balance — these are verified, not claimed:

- ✅ **21/21 modules are provably pure** — no DOM, network, storage, randomness or clock
- ✅ **24/24 Braincore tests pass**
- ✅ **Zero third-party code in the sellable asset**
- ✅ **Privacy enforced by structure**, not policy — three separate databases that cannot be joined
- ✅ **A thorough secret scanner** that was itself tested to prove it cannot be fooled by its own allowlist
- ✅ **Fail-closed security defaults** — a deploy that forgets a secret produces a silent API, not an open one
- ✅ **Self-checking deployment** that proves the live site serves the new build
- ✅ **Documented reasoning throughout**, including recorded reversals where review caught earlier mistakes
- ✅ **Works fully offline** — a permanent server outage would not stop a single student learning

---

*End of SALE/KNOWN_LIMITATIONS.md.*
