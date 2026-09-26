# FIEZEL Braincore — Bounded Autonomy Rules & Guardrails
**Document Version:** 1.0.0 · **Authority:** Master-Only Governance Compatible

---

## 1. Principle of Bounded Autonomy

Braincore is an adaptive, self-evaluating learning intelligence. However, to guarantee absolute safety, pedagogical integrity, and stability for schools and learners, **autonomy is strictly bounded**.

Braincore is never granted arbitrary self-modifying execution authority. Every autonomous action is constrained to mathematically bounded domains, governed by immutable invariants, and equipped with deterministic rollback mechanisms.

---

## 2. Autonomous Action Boundaries

```
┌────────────────────────────────────────────────────────────────────────┐
│                      AUTONOMY AUTHORITY CLASSIFICATION                 │
├──────────────────────────────────┬─────────────────────────────────────┤
│   AUTONOMOUSLY PERMITTED         │       STRICTLY PROHIBITED           │
│   (Local Adaptive Decisions)     │       (Requires Master Authority)   │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Item selection matching ZPD    │ • Deploying code to production      │
│ • Desirable difficulty targets   │ • Overwriting question bank data    │
│ • Scaffolding ladder progression │ • Altering security/auth permissions│
│ • Spaced repetition scheduling   │ • Disabling privacy & anonymization │
│ • Session size reduction/length  │ • Bypassing statistical safeguards  │
│ • Hint & worked example triggers │ • Creating untracked parameters     │
│ • Non-verbal PAW presence state  │ • Modifying core evaluation formulas│
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 3. The 6 Mandatory Invariants of the Autonomous Loop

Whenever Braincore takes an autonomous action (e.g., shifts session difficulty, increases scaffolding, or adjusts pacing):

1. **Explicit Hypothesis:** Every intervention must be tied to a documented diagnostic rationale (e.g. `brain3_affect_frustrated`, `brain3_misconception_active`, `brain3_bkt_developing`).
2. **Deterministic Preconditions:** Interventions cannot trigger on raw random chance; they require verified evidence thresholds ($N \ge 3$ observations, confidence gates).
3. **Measurable Outcome:** Following the intervention, the subsequent attempt or session outcome must be explicitly recorded (`positive`, `neutral`, `negative`).
4. **Finite Lifetime:** Temporary scaffolding or difficulty reduction must have an expiration or fading rule (e.g., 2 consecutive independent successes restore standard difficulty).
5. **Fail-Safe Rollback:** If an intervention produces negative outcomes (e.g., student abandonment increases or error rates escalate), the policy rolls back to baseline immediately.
6. **Immutable Ledger:** Every parameter shift or policy adjustment must be logged in a tamper-evident audit record.
