# IP — Braincore Asset Inventory

**Purpose:** to state exactly what would be included in a sale of "FIEZEL Braincore", so that
a buyer knows precisely what they receive — and, just as importantly, what they do not.

**Classification used, as required by the brief:**

| Class | Meaning |
|---|---|
| **A** | FIEZEL-owned / custom technology candidate — created for this project |
| **B** | Third-party dependency (commercial or proprietary) |
| **C** | Open-source dependency |
| **D** | External service |
| **E** | Unknown / needs legal review |

---

## 1. The core asset — Class A

### 1.1 The Braincore engine

| Item | Detail |
|---|---|
| Location | `features/brain/` |
| Files | **21** JavaScript modules |
| Size | **8,899 lines / 440,086 bytes** |
| Third-party code contained | **None. Zero dependencies.** |
| Runtime requirement | A JavaScript engine. Nothing else. |
| Class | **A** |

The 21 modules:

`fiezel-core-brain.js` · `fiezel-tutor-brain.js` · `fiezel-misconception-ledger.js` ·
`fiezel-mastery-bkt.js` · `fiezel-item-prior.js` · `fiezel-item-calibration.js` ·
`fiezel-evidence-credibility.js` · `fiezel-affect.js` · `fiezel-srl-coach.js` ·
`fiezel-step-tutor.js` · `fiezel-production-grader.js` · `fiezel-confusion-matrix.js` ·
`fiezel-olm.js` · `fiezel-listening-adaptive.js` · `fiezel-speaking-adaptive.js` ·
`fiezel-learning-metrics.js` · `fiezel-metrics-digest.js` · `fiezel-stat-gate.js` ·
`fiezel-brain-config.js` · `fiezel-brain-manifest.js` · `fiezel-retention-probe.js`

### 1.2 The Braincore test suite

| Item | Detail |
|---|---|
| Files | 24 test files |
| Size | **6,522 lines** |
| Status | **24 / 24 pass** — executed and verified (AUDIT 05) |
| Class | **A** |

**Plain language:** the tests are roughly three-quarters the size of the engine itself. For a
buyer this is a large part of the value — it is what lets them change the engine without
breaking it, and it is what makes the engine's behaviour verifiable rather than merely
claimed.

### 1.3 The simulation harness

| Item | Detail |
|---|---|
| Files | `adaptivity-simulation-v3.js`, `-extended`, `adaptivity-simulation.js` |
| Size | **3,049 lines** |
| Purpose | Runs simulated learners through the engine; regression and adaptivity testing |
| Class | **A** |

### 1.4 Braincore documentation

| Item | Size | Class |
|---|---|---|
| `BRAINCORE-V3-REPORT.md` | 40,081 bytes | A |
| `BRAIN-LEARNING-ARCHITECTURE-AUDIT.md` | 24,381 bytes | A |
| `BRAIN-ACTIVATION-RUNBOOK.md` | 20,234 bytes | A |
| `BRAIN-EVOLUTION-DECISIONS.md` | 17,295 bytes | A |
| `BRAINCORE-V3-CONTRACTS.md` | 14,344 bytes | A |
| `BRAIN-DATA-PRIVACY.md` | 10,533 bytes | A |
| `BRAIN-TELEMETRY-SCHEMA.md` | 9,484 bytes | A |
| This audit: `AUDIT/`, `IP/`, `SECURITY/`, `SALE/`, `FINAL/` | — | A |

### 1.5 Supporting Class-A assets (needed to make the engine useful)

| Item | Location | Note |
|---|---|---|
| Misconception taxonomy | `misconception-taxonomy-v1.json` | The closed vocabulary the ledger uses |
| Prerequisite / curriculum graph | `grammar-curriculum-v1.json` | Feeds `setCurriculumGraph()` for root-cause analysis |
| Learning-telemetry schema and server lane | `workers/api/learning/` + `0007_learning.sql` | The privacy-locked foundation for future population learning |
| Telemetry client | `features/telemetry/` | Queue, transport, event builder |

---

## 2. What Braincore does NOT include — stated plainly

This section exists so that no buyer can reasonably say they were misled.

| Not included | Why it matters |
|---|---|
| **The orchestration layer** | The code that connects the 21 modules — storage read/write, session state, the single evidence door `record()`, `scheduleNext()`, `buildAdaptivePool()`, `tutorPick()` — lives inside `app.js`, a 9,584-line file that also contains the entire user interface. **A buyer must rebuild this.** Costed in `SALE/CORE_SEPARATION_ANALYSIS.md`. |
| **The user interface** | Not part of Braincore. |
| **The learning content** | 93,892 lines of vocabulary, 31,026 lines of reading, grammar templates, listening and cloze banks. Class E — provenance unverified. |
| **The speech engine** | `vendor/supertonic-3/` — Class C/E, and use-restricted (OpenRAIL-M). |
| **Login / identity** | Puter — Class D, terms unknown. |
| **The server API** | `workers/api/` is quota, identity and analytics. It does **not** run Braincore. |
| **Any proof that it improves learning** | No outcome data exists. See AUDIT 05 §6. |
| **A working Cloudflare deployment** | Database IDs in the repository are placeholders. |
| **Global Learning Intelligence** | Does not exist. See AUDIT 03 §4.2. |

---

## 3. Third-party items — classes B, C, D, E

**None of these are part of Braincore.** They belong to the surrounding FIEZEL application and
are listed so that a buyer of the *whole application* knows what they inherit.

| Item | Class | Licence | Note |
|---|---|---|---|
| Lucide icons | **C** | ISC | Bundled, notice present |
| Noto Sans Thai Looped | **C** | SIL OFL 1.1 | Notice present |
| Instrument Serif | **C** | SIL OFL 1.1 | Notice **not** bundled |
| Plus Jakarta Sans | **C** | SIL OFL 1.1 | Notice **not** bundled |
| **Fredoka** | **E** | UNKNOWN in repo | 🔴 Ships, undocumented — `IP/DEPENDENCY_AUDIT.md` §4.1 |
| Supertonic 3 runtime | **C** | MIT | Notice present |
| **Supertonic 3 model weights** | **E** | OpenRAIL-M | ⚠️ Use-restricted, flow-down needs review |
| sherpa-onnx | **C** | Apache-2.0 | Compiled into the WASM |
| **Puter SDK** | **D / E** | UNKNOWN | 🔴 Live-loaded, unpinned, on the login path |
| web-push | **C** | MPL-2.0 | Server tooling only |
| @heyputer/cli | **C** | MIT | CI only |
| Wiktionary EN→ID dictionary | **C / E** | CC BY-SA 3.0 + GFDL | ⚠️ Share-alike |
| Cloudflare (Workers, D1, KV, R2, AI) | **D** | Commercial ToS | Free tier today |
| ElevenLabs | **D** | Commercial ToS | Build-time audio only |
| cPanel / ArenHost hosting | **D** | Commercial ToS | — |
| **All learning content** | **E** | UNKNOWN | Provenance not independently verified |
| **Braincore code ownership** given AI-assisted development | **E** | — | See `IP/AI_ASSISTED_DEVELOPMENT.md` |
| **Second contributor's 219 commits** | **E** | — | No assignment on record — see `IP/DEVELOPMENT_HISTORY.md` §6 |

---

## 4. Two possible transactions — and they are very different

### Option 1 — Sell Braincore alone

**Included:** 8,899 lines of engine, 6,522 lines of tests, 3,049 lines of simulation, the
taxonomy and curriculum graph, the telemetry schema, and the full documentation set.

| Property | Assessment |
|---|---|
| Third-party code | **None** |
| Licence obligations inherited | **None** |
| OpenRAIL-M exposure | **None** |
| Puter exposure | **None** |
| Content-provenance exposure | **None** |
| Remaining Class-E questions | AI-authorship ownership; second contributor's assignment |
| Buyer must build | The orchestration layer |

**Plain language:** this is by far the cleaner transaction. Almost every legal question in
this audit belongs to the application, not the engine. Selling the engine alone removes them.

### Option 2 — Sell the whole FIEZEL application

Everything in the table in §3 comes with it, including the two red items (Fredoka, Puter), the
use-restricted speech weights, share-alike dictionary exposure, and unverified content
provenance.

**Plain language:** this is a much bigger legal review, and several of the answers are not
currently known.

**Recommendation: Option 1.** It is what the owner asked for, it is the cleaner asset, and it
is the one this audit can support with evidence.

---

## 5. Answering the owner's own questions

| Question | Answer |
|---|---|
| **What exactly do I control?** | 8,899 lines of original, dependency-free adaptive-learning engine, plus 6,522 lines of passing tests, 3,049 lines of simulation, and a substantial documentation set. Subject to the two Class-E ownership questions in §3. |
| **What exactly is Braincore?** | 21 pure calculation modules that decide what a student should do next and how well they know it. See `SALE/BRAINCORE_OVERVIEW.md`. |
| **What does it actually do?** | 10 of 21 modules genuinely change a student's experience today; 6 observe; 5 are built but not connected. See AUDIT 01. |
| **What still needs improvement?** | Parameter calibration, outcome validation, and extracting the orchestration layer. |
| **What third-party software does it use?** | **Braincore: none.** The application: see §3. |
| **What happened during AI-assisted development?** | Documented openly. See `IP/AI_ASSISTED_DEVELOPMENT.md`. |
| **Can Braincore be separated from FIEZEL?** | Yes — the modules are already pure and dependency-free. The orchestration must be rebuilt. See `SALE/CORE_SEPARATION_ANALYSIS.md`. |
| **What would a buyer actually receive?** | §1 in full; §2 lists what they would not. |
| **What must a lawyer verify?** | `IP/DEPENDENCY_AUDIT.md` §6. |

---

*End of IP/BRAINCORE_ASSET_INVENTORY.md. Factual record only — not legal advice.*
