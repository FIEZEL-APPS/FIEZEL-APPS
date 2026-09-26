# FIEZEL Braincore — Capability Matrix & Runtime Audit
**Audit Date:** 2026-09-27 · **Build:** FIEZEL 5.19.0 · **Bundle Version:** 3.11.0

---

## 1. Classification Taxonomy

Each capability is rigorously classified by verified runtime behavior (never by file existence alone):

* **`ACTIVE_AND_PROVEN`**: Code exists, imported, initialized, called on live learner interactions, modifies learning path/UI, persisted, tested, and verified via end-to-end tests.
* **`ACTIVE`**: Called on live interactions and affects runtime state, but without complete multi-device proof.
* **`BOUNDED`**: Active within strictly constrained thresholds (e.g. self-tuning within $\pm 0.6$ clamps).
* **`SHADOW`**: Computes models in the background; outputs are logged or inspected in diagnostics without altering the learner's active learning path.
* **`CANDIDATE_ONLY`**: Module exists and has unit tests, but runtime caller in client app is deliberately fenced or awaiting pilot authorization.
* **`OFF`**: Module exists in codebase but has 0 callers in client runtime by design (e.g. server-only tools or unreleased features).
* **`NOT_IMPLEMENTED`**: Concept discussed in architecture roadmap but no code exists yet.

---

## 2. Complete Capability Inventory (31 Core Modules + Subsystems)

| # | Capability / Subsystem | Runtime Module | Runtime Entry Point | Authority | Status | Offline? | Test Suite |
|:--|:-----------------------|:---------------|:--------------------|:---------:|:------:|:--------:|:-----------|
| 1 | **IRT 3PL & Latent Ability** | `fiezel-core-brain.js` | `FiezelCoreBrain.analyze()` / `estimateAbility()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/core-brain-v2-test.js` |
| 2 | **FSRS Memory & Spaced Repetition** | `fiezel-core-brain.js` | `FiezelCoreBrain.updateMemory()` / `scheduleNext()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/core-brain-v2-test.js` |
| 3 | **Prerequisite Knowledge DAG** | `fiezel-core-brain.js` | `FiezelCoreBrain.rootCause()` / `setFamilyGraph()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/prerequisite-graph-test.js` |
| 4 | **BKT Knowledge Tracing** | `fiezel-mastery-bkt.js` | `FiezelMasteryBKT.update()` / `bktRecord()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/mastery-bkt-test.js` |
| 5 | **BKT Lesson Unlocking** | `fiezel-mastery-bkt.js` | `bktMasteredSkills()` / `lessonUnlockState()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/grammar-unlock-test.js` |
| 6 | **ZPD Frontier Selection** | `fiezel-mastery-bkt.js` | `FiezelMasteryBKT.frontier()` / `zpdFrontierPick()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/mastery-bkt-test.js` |
| 7 | **Tutor Scaffolding FSM** | `fiezel-tutor-brain.js` | `FiezelTutorBrain.observe()` / `decideMove()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/tutor-brain-v3-test.js` |
| 8 | **Scaffold Ladder Escalation** | `fiezel-tutor-brain.js` | `FiezelTutorBrain.escalate()` (probe $\to$ hint $\to$ worked $\to$ tell) | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/tutor-brain-v3-test.js` |
| 9 | **Worked Example Decomposition**| `fiezel-step-tutor.js` | `stepTutorGuidanceMarkup()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/step-tutor-test.js` |
| 10 | **Cloze Production Grading** | `fiezel-production-grader.js` | `FiezelProductionGrader.grade()` / `answerCloze()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/production-grader-test.js` |
| 11 | **Misconception Ledger** | `fiezel-misconception-ledger.js`| `FiezelMisconceptionLedger.update()` / `active()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/misconception-ledger-test.js` |
| 12 | **Continuous Item Prior** | `fiezel-item-prior.js` | `FiezelItemPrior.difficultyFor()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/item-prior-test.js` |
| 13 | **Evidence Credibility ($\kappa$)** | `fiezel-evidence-credibility.js`| `FiezelEvidenceCredibility.weigh()` / `evidenceKappa()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/evidence-credibility-test.js`|
| 14 | **Baker 4-State Affect Detection**| `fiezel-affect.js` | `FiezelAffect.assess()` / `affectObserve()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/affect-test.js` |
| 15 | **Empirical Bayes Item Calibration**| `fiezel-item-calibration.js`| `FiezelItemCalibration.observe()` / `effective()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/item-calibration-test.js` |
| 16 | **Listening Adaptive Pacing** | `fiezel-listening-adaptive.js` | `listeningAdaptivePolicy()` (playback rate & replays)| `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/listening-adaptive-test.js`|
| 17 | **Retention Probe Scheduling** | `fiezel-retention-probe.js` | `FiezelPostTest.schedule()` / review pool recycle | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/retention-probe-test.js` |
| 18 | **SRL Metacognitive Coach** | `fiezel-srl-coach.js` | `srlSessionPlan()` / `srlPredictPrompt()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/srl-coach-test.js` |
| 19 | **Confusion Matrix AI Booster** | `fiezel-confusion-matrix.js` | `topConfusions()` / `aiBoosterCard()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/confusion-matrix-test.js` |
| 20 | **Open Learner Model (OLM)** | `fiezel-olm.js` | `FiezelOLM.summarize()` / `olmCalibrationNudge()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/olm-test.js` |
| 21 | **OLM Sanggahan / Dispute** | `fiezel-olm.js` | `FiezelOLM.negotiate()` / `olmDispute()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/olm-test.js` |
| 22 | **Target Language Axis (EN/JA)** | `fiezel-target-language.js` | `FiezelTargetLanguage.setCourse()` / `activeTargetLang()` | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/target-language-axis-test.js`|
| 23 | **Bankor Question Allocator** | `fiezel-question-allocator.js` | `FiezelQuestionAllocator.allocate()` in learner flow | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/bankor-latihan-test.js` |
| 24 | **Bankor Item Memory** | `fiezel-question-memory.js` | `FiezelQuestionMemory.record()` in learner flow | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/bankor-latihan-test.js` |
| 25 | **Statistical Policy Verdict** | `fiezel-policy-verdict.js` | `FiezelPolicyVerdict.evaluate()` / `recordPolicyOutcome()`| `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/policy-verdict-test.js` |
| 26 | **Longitudinal Learning Metrics** | `fiezel-learning-metrics.js` | `brierEvidenceBump()` / BKT evidence barrier | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/learning-metrics-test.js`|
| 27 | **PvE Arena Bot Engine** | `fiezel-arena-bot.js` | `FiezelArenaBot.decideStep()` in paw-arena.js | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/arena-bot-test.js` |
| 28 | **Attempt Sanitization Projection**| `fiezel-attempt-record.js` | `FiezelAttemptRecord.project()` | `shadow` | `IMPLEMENTED_SHADOW` | ✅ Yes | `tests/attempt-record-test.js` |
| 29 | **Brain Bundle Manifest** | `fiezel-brain-manifest.js` | `FiezelBrainManifest.describe()` | `shadow` | `IMPLEMENTED_SHADOW` | ✅ Yes | `tests/brain-manifest-test.js` |
| 30 | **Speaking Adaptive Evidence** | `fiezel-speaking-adaptive.js` | `speakingAdaptiveEvidence()` in Speaking Lab | `shadow` | `IMPLEMENTED_SHADOW` | ✅ Yes | `tests/speaking-adaptive-test.js` |
| 31 | **N-of-1 Micro-Experiments** | `fiezel-nof1.js` | `FiezelNof1.assign()` | `off` | `CANDIDATE_ONLY` | ✅ Yes | `tests/nof1-test.js` |
| 32 | **Cryptographic Param Ledger** | `fiezel-param-ledger.js` | `FiezelParamLedger.append()` | `off` | `CANDIDATE_ONLY` | ✅ Yes | `tests/param-ledger-test.js` |
| 33 | **Fenced Self-Tuning Engine** | `fiezel-self-tune.js` | `FiezelSelfTune.propose()` | `off` | `BOUNDED / OFF` | ✅ Yes | `tests/self-tune-test.js` |
| 34 | **Content Chain Canary Reporter**| `fiezel-content-chain.js` | `FiezelContentChain.report()` | `off` | `CANDIDATE_ONLY` | ✅ Yes | `tests/content-chain-test.js` |
| 35 | **Stat Gate CI Promotion** | `fiezel-stat-gate.js` | `FiezelStatGate.verdict()` in content-promotion.js | `off (client)` | `ACTIVE_AND_PROVEN (CI)` | ✅ Yes | `tests/stat-gate-test.js` |
| 36 | **Brain Config Reference** | `fiezel-brain-config.js` | Reference constants | `off` | `IMPLEMENTED_BUT_UNUSED` | ✅ Yes | `tests/brain-config-test.js` |
| 37 | **Telemetry Privacy Digest** | `fiezel-metrics-digest.js` | Client digest generator | `off` | `BOUNDED / OFF` | ✅ Yes | `tests/metrics-digest-test.js` |
| 38 | **Presence Engine (Brain $\to$ PAW)**| `fiezel-presence-engine.js`| `FiezelPresence.determine()` & `FiezelPaw` dispatch | `active` | `ACTIVE_AND_PROVEN` | ✅ Yes | `tests/brain-presence-test.js` |
| 39 | **Global Evidence Aggregation** | `workers/api/learner-evidence/`| Cloudflare Worker + D1 cohort aggregation | `server` | `INFRASTRUCTURE READY` | ❌ No | `tests/analytics-server-only-test.js` |
| 40 | **Global Brain Autonomous Learning**| Federated distributed model| Pattern mining across anonymous cohorts | `unproven`| `INFRASTRUCTURE / NOT PROVEN` | ❌ No | Not proven with live cohorts |

---

## 3. Explicit Authority Boundaries

* **Autonomous Client Authority Permitted:**
  1. Target success calibration within Bjork bounds ($p^* \in [0.70, 0.90]$).
  2. Dynamic session size adjustments ($\pm 2$ questions within $6 \le N \le 12$).
  3. Scaffold ladder transitions (probe $\to$ hint $\to$ worked $\to$ tell) based on error clusters.
  4. Spaced repetition review intervals via FSRS formula ($S' = S \times (1 + \dots)$).
  5. PAW non-verbal presence state selection (`silent`, `observing`, `encouraging`, etc.).
* **Autonomous Authority Strictly Prohibited:**
  1. No autonomous modification or overwriting of curriculum content in production without teacher/owner review.
  2. No client-side modification of security roles, authentication tokens, or school permissions.
  3. No transmission of raw unhashed learner identity or freeform interaction transcripts.
