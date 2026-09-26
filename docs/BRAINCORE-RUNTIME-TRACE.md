# FIEZEL Braincore — Runtime Decision Trace Specification
**Document Version:** 1.0.0 · **Target Build:** FIEZEL 5.19.0

---

## 1. Purpose of the Decision Trace

The Braincore Decision Trace provides a machine-readable, auditable, and replayable execution log of every learning decision made by FIEZEL.

It allows developers, researchers, and automated test suites to inspect:
1. **What did Braincore observe?** (Item properties, user answer, latency, hint usage, retries).
2. **What did Braincore infer?** (BKT mastery delta, FSRS stability, affect classification, active misconceptions).
3. **What did Braincore decide?** (Action taken, next item difficulty, scaffolding level, presence state).
4. **Why?** (Pedagogical rationale code, evidence weight $\kappa$, confidence rating).
5. **What happened afterward?** (Learner's response on next attempt, breakthrough vs slip).
6. **Did the outcome validate the decision?** (Evaluation: positive, neutral, negative $\to$ keep vs rollback).

---

## 2. Canonical Trace Event Schema

```json
{
  "traceId": "trc_1727390000000_a8f9",
  "sessionId": "ses_grammar_a2_01",
  "timestamp": 1727390000000,
  "stage": "IN_SESSION",
  "step": 4,
  "observation": {
    "itemId": "TA-002",
    "concept": "past_simple_vs_present_perfect",
    "difficulty": 2.8,
    "correct": false,
    "latencyMs": 2100,
    "hintUsed": false,
    "distractorPicked": "has traveled",
    "timing": "fast"
  },
  "inference": {
    "kappa": 0.8,
    "bktMasteryBefore": 0.45,
    "bktMasteryAfter": 0.22,
    "misconceptionDetected": "present_perfect_past_time_marker",
    "affectState": "neutral",
    "cognitiveLoad": "normal"
  },
  "decision": {
    "action": "scaffold_hint",
    "scaffoldLevel": "worked",
    "targetDifficulty": 2.2,
    "presenceState": "hinting",
    "rationale": "brain3_tutor_misconception_scaffold",
    "confidence": 0.85
  },
  "execution": {
    "nextItemId": "TA-002_scaffold",
    "pawState": "hinting",
    "guidanceRendered": true
  },
  "outcome": {
    "nextAttemptCorrect": true,
    "nextAttemptMs": 6400,
    "status": "positive",
    "resolution": "breakthrough_observed"
  }
}
```

---

## 3. Privacy & Diagnostic Boundaries

* **Learner Protection:** Raw Decision Traces are **never exposed to normal learners** in the standard UI. Learners experience the natural consequences (personalized pacing, gentle hints, responsive PAW).
* **Owner/Teacher Diagnostics:** Traces are aggregated into anonymized metrics (decision counts, policy outcomes, misconception clusters) displayed on the Owner & Teacher Dashboards.
* **Storage Invariant:** In-memory traces are limited to the active session plus the 30 most recent session summaries to prevent unbounded local storage growth.
