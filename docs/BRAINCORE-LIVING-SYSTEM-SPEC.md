# FIEZEL Braincore — Living Intelligence Master Specification
**Document Version:** 1.0.0 · **Target Build:** FIEZEL 5.19.0 · **Bundle:** Braincore Living System v4.0

---

## 1. System Vision & Architecture Separation

The FIEZEL learning ecosystem is strictly separated into three architectural layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                FIEZEL                                  │
│                          The Learning World                            │
│  (Course, Lessons, Curriculum DAG, PWA Shell, Audio, UI, Gamification) │
├────────────────────────────────────────────────────────────────────────┤
│                              BRAINCORE                                 │
│                        The Intelligence Layer                          │
│  (Observation, Learner State, Pattern Inference, Decision, Trace,      │
│   Bounded Autonomy, Outcome Evaluation, Evidence Aggregation)          │
├────────────────────────────────────────────────────────────────────────┤
│                                 PAW                                    │
│                    The Visible Presence Layer                          │
│  (Mascot Vector Rig, Non-Verbal Gestures, Attentive Companion,         │
│   Presence States: Silent, Observing, Encouraging, Hinting, Celebrating)│
└────────────────────────────────────────────────────────────────────────┘
```

### The Cardinal Rule
* **Braincore is NOT PAW.** Braincore is pure intelligence, mathematical reasoning, cognitive modeling, and pedagogical policy. It has 0 DOM, 0 SVG, and 0 network code.
* **PAW is NOT Braincore.** PAW is the visible personality, emotional feedback vehicle, and companion presence. PAW does not compute IRT 3PL, BKT, or FSRS decay; it expresses the presence state that Braincore decides.
* **FIEZEL is the World.** The curriculum, practice modes, audio recordings, and visual themes where learning occurs.

---

## 2. Canonical Runtime Lifecycle

Every significant learner interaction flows through a closed-loop, deterministic 10-phase lifecycle:

```
                  ┌──────────────┐
                  │ 1. OBSERVE   │ (Answer correctness, latency, hint, retry,
                  └──────┬───────┘  concept, distractor chosen, CEFR level)
                         ▼
           ┌───────────────────────────┐
           │ 2. UPDATE LEARNER MODEL   │ (BKT posterior, FSRS stability,
           └─────────────┬─────────────┘  IRT ability estimate, Misconception ledger)
                         ▼
                 ┌───────────────┐
                 │ 3. UNDERSTAND │ (Error cluster vs slip, gaming vs fluency,
                 └───────┬───────┘  Baker 4-state affect, fatigue vs difficulty)
                         ▼
                  ┌──────────────┐
                  │  4. DECIDE   │ (Next item, difficulty shift, scaffold ladder,
                  └──────┬───────┘  hint trigger, reteach card, presence state)
                         ▼
                   ┌────────────┐
                   │   5. ACT   │ (Present item/intervention, express PAW presence,
                   └─────┬──────┘  scaffold worked-example, or remain silent)
                         ▼
             ┌────────────────────────┐
             │  6. OBSERVE OUTCOME    │ (Learner response to action, second attempt,
             └───────────┬────────────┘  follow-up latency, breakthrough vs lapse)
                         ▼
                 ┌───────────────┐
                 │  7. EVALUATE  │ (Policy verdict: positive, neutral, negative;
                 └───────┬───────┘  compare outcome with predicted success P*)
                         ▼
           ┌───────────────────────────┐
           │ 8. KEEP / MODIFY / ROLLBACK│ (Retain adaptive difficulty, fade scaffold,
           └─────────────┬─────────────┘  or rollback ineffective intervention)
                         ▼
               ┌────────────────────┐
               │ 9. STORE EVIDENCE  │ (Machine-readable Decision Trace,
               └─────────┬──────────┘  cryptographic param ledger, local evidence)
                         ▼
                 ┌───────────────┐
                 │  10. REPEAT   │ (Next item in session or cross-session FSRS)
                 └───────────────┘
```

---

## 3. Structural Layers of Braincore

### 3.1 Observation Layer (`BraincoreObservation`)
Captures raw learning signals into an immutable, sanitized observation record:
* `itemId`: Unique stem/template identifier.
* `skill` / `family`: Pedagogical domain and micro-skill.
* `difficulty`: Calibrated continuous difficulty ($b \in [1.0, 6.0]$).
* `correct`: Boolean accuracy on first attempt.
* `ms`: Latency in milliseconds.
* `hintUsed`: Boolean indicator of scaffold request.
* `retryCount`: Number of retries on current question.
* `confidence`: Metacognitive self-prediction (when prompted).
* `distractor`: Matched distractor metadata and tagged misconception.

### 3.2 Canonical Learner Model (`BraincoreLearnerModel`)
The single authoritative state of learner knowledge:
1. **Mastery Dimension (BKT):** $P(L) \in [0, 1]$ per skill with credibility-weighted steps ($\kappa$).
2. **Memory Dimension (FSRS-Lite):** Stability $S$ in days, retrievability $R = e^{-t / S}$, half-life decay.
3. **Continuous Ability (IRT 3PL):** Latent ability $\theta \pm \text{sd}$ (Glicko-style rating deviation bounded by Fisher Information).
4. **Misconception Ledger:** Belief probability $P(M) \in [0, 1]$ per tagged misconception, tracking persistent error patterns across sessions with exponential decay (half-life 14 days).
5. **Affective Profile:** Baker 4-state sensor-free detector (`neutral`, `frustrated`, `bored`, `gaming`, `fatigued`) with hysteresis locks.

### 3.3 Neural Understanding Engine (`BraincoreNeuralUnderstanding`)
Deterministically categorizes patterns without black-box hallucination:
* **Slip vs Misconception:** Single error with normal timing $\to$ slip. Repeated error choosing the same pedagogical distractor across $\ge 2$ sessions $\to$ active misconception.
* **Fluency vs Gaming:** Fast correct answers ($< 2.5\text{s}$) $\to$ fluency ($w = 1.0$). Fast wrong answers ($< 1.8\text{s}$) $\to$ gaming ($\kappa = 0.3$, discount evidence).
* **Fatigue vs Cognitive Challenge:** Slowdown $> 1.5\times$ accompanied by accuracy drop $> 15\text{pp}$ in the second half of the session $\to$ fatigue (trigger `breathe` offer). Slowdown with high accuracy $\to$ deep reflection (no interruption).

### 3.4 Decision Engine (`BraincoreDecisionEngine`)
Produces explicit, auditable decisions with machine-readable rationale:
```json
{
  "decision": "reinforce_concept",
  "policy": "core-brain-v4-adaptive",
  "reasons": ["persistent_misconception", "bkt_developing"],
  "evidenceStrength": "strong",
  "previousDifficulty": 2.8,
  "nextDifficulty": 2.2,
  "presenceState": "hinting",
  "scaffold": "worked"
}
```

### 3.5 Bounded Autonomy & Self-Evaluation (`BraincoreAutonomy`)
Enforces strict guardrails on adaptive decisions:
* **Autonomous Authority Granted:** Item selection, desirable difficulty target ($p^* \approx 0.80$), scaffold ladder escalation (probe $\to$ hint $\to$ worked $\to$ tell), session size adjustment ($\pm 2$ items), review scheduling.
* **Autonomous Authority Prohibited:** No runtime code modification, no unverified content publishing, no modification of core safety thresholds, no bypass of $k$-anonymity privacy gates.

### 3.6 Presence Engine (`BraincorePresenceEngine`)
Translates Braincore cognitive state into non-intrusive learner-facing behavior and PAW actions:
* `SILENT`: Normal successful flow. PAW remains attentive, no speech bubbles.
* `OBSERVING`: Evaluating complex item / listening audio playback. PAW listening/reading pose.
* `THINKING`: Computing next adaptive pool. Brief focus expression.
* `ENCOURAGING`: Learner recovers from an error. Subtle warm reaction.
* `HINTING`: Scaffold triggered. PAW gestures toward clue without blocking options.
* `CORRECTING`: First mistake. Gentle expression, option disabled, second chance given.
* `REINFORCING`: Reteach concept card presented after repeated error.
* `CHALLENGING`: High streak & high mastery. Increased difficulty, playful focus pose.
* `CELEBRATING`: Mastery milestone ($P(L) \ge 0.95, n \ge 5$). Confetti burst, level-up badge.
* `CONCERNED` / `FATIGUE`: Cognitive fatigue detected. Gentle offer to pause session.

---

## 4. Privacy & Offline-First Guarantees

1. **Zero External LLM Dependency:** All 31+ Braincore intelligence modules execute 100% deterministically on-device in vanilla JavaScript with 0 network latency and 0 server inference cost.
2. **Data Minimization:** No learner audio, transcripts, or PII are transmitted. Evidence records use pseudonymous identifiers with daily rotating salts.
3. **Full Offline Continuity:** In flight/offline mode, Braincore reads local IndexedDB/localStorage state, selects adaptive questions, updates BKT/FSRS memory, and queues anonymized sync digests for eventual reconnection.
