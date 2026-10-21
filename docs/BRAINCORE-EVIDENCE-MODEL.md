# FIEZEL Braincore — Evidence Model & Aggregation Pipeline
**Document Version:** 1.0.0 · **Target Build:** FIEZEL 5.19.0

---

## 1. Causal Learning Evidence Architecture

Rather than recording mere click events or static quiz grades, Braincore evidence captures complete **causal chains**:

$$\text{Observation} \longrightarrow \text{Inference} \longrightarrow \text{Intervention} \longrightarrow \text{Outcome}$$

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   OBSERVATION   │  ──▶  │    INFERENCE    │  ──▶  │  INTERVENTION   │  ──▶  │     OUTCOME     │
│ Error on aspect │       │ Misconception M │       │ Scaffold worked │       │ Success on V3   │
│ marker in 2019  │       │ belief = 0.78   │       │ example & hint  │       │ latency normal  │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 2. Evidence Record Structure

Each evidence point is structured into an audit envelope:

1. **Envelope Header:**
   * `evidenceId`: UUID v4 or deterministic sequence id.
   * `timestamp`: Epoch millisecond timestamp.
   * `learnerRef`: Pseudonymous rotating hash (never raw username/PII).
   * `course`: Target curriculum domain (`en` | `ja`).
2. **Pedagogical Dimensions:**
   * `concept`: Micro-skill or grammar family.
   * `level`: CEFR scale (`A1` through `C2`).
   * `difficultyPrior`: Continuous baseline difficulty $b \in [1, 6]$.
   * `effectiveDifficulty`: Calibrated item difficulty from Empirical Bayes ($b + \Delta$).
3. **Behavioral Metrics:**
   * `latencyMs`: Response time in ms.
   * `credibilityKappa`: Discount factor $\kappa \in (0, 1]$ based on timing, language load, and replay count.
   * `affect`: Baker sensor-free affect state (`neutral`, `frustrated`, `bored`, `gaming`, `fatigued`).
4. **Causal Outcome:**
   * `predictedSuccess`: Prior success probability $p^*$.
   * `actualOutcome`: Binary correct/incorrect ($y \in \{0, 1\}$).
   * `policyStatus`: Verdict of policy utility (`positive`, `neutral`, `negative`).

---

## 3. Global Aggregation & Federated Distribution

```
[Device A: Local Brain] ──┐
[Device B: Local Brain] ──┼──▶ [Anonymized Evidence Digits] ──▶ [Cloudflare D1 Cohort Ledger]
[Device C: Local Brain] ──┘                                                │
                                                                           ▼
                                                              [Empirical Bayes Pooling]
                                                              (Item Delta Kalibrasi)
                                                                           │
                                                                           ▼
                                                             [Versioned Bundle Release]
                                                                           │
                                  ┌────────────────────────────────────────┴────────┐
                                  ▼                                                 ▼
                      [Device A: Local Update]                          [Device B: Local Update]
```

* **No Personal Data Leaks:** Individual answer strings or user identities are never uploaded to the global evidence ledger.
* **$k$-Anonymity Gate:** Data from cohorts with fewer than 5 learners are suppressed from aggregate reports to prevent re-identification.
* **Bi-directional Integrity:** Calibrated parameters from global pooling undergo hard shrinkage clamps ($|\Delta| \le 0.6$) before being distributed to local devices.
