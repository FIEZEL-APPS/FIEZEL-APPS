# 🚀 Staging Deployment — Core Brain v2 Real User Test

**Date:** 2026-08-24  
**Version:** m025-148 (merged m025-125 + main)  
**Status:** Ready for staging deployment  
**Duration:** 2-3 weeks (collect 500+ student attempts)

---

## 📋 Pre-Deployment Checklist

- [x] Core Brain v2 unit tests: **PASS** (31 tests)
- [x] Core Worker contract tests: **PASS** (contract 1.7 verified)
- [x] Adaptivity simulation: **PASS** (3 student profiles differentiated)
- [x] PR #195 merged to main: **✅ MERGED**
- [x] Build versions coherent: **m025-148** (all 3 synced)
- [x] Language audit: **77% complete** (grammar 100%, vocab context added, reading stems unique)
- [ ] Staging infrastructure ready
- [ ] Test users created
- [ ] A/B test tracking enabled
- [ ] Monitoring dashboard set up

---

## 🧪 A/B Test Design

### **Treatment Groups**

```
Group A (Control): Core Brain v2 ON (adaptive)
  - Difficulty auto-adjusts per ability
  - Session size varies per momentum
  - Confidence-gated decisions
  - N = 5-7 users, ~400-500 attempts over 14 days

Group B (Placebo): Core Brain v1 only (static)
  - Level ± 1 difficulty
  - Fixed session size 12
  - No momentum detection
  - N = 5-7 users, ~400-500 attempts over 14 days
```

### **Measurement Plan**

| Metric | Baseline | Target | Why It Matters |
|--------|----------|--------|----------------|
| **Ability Gain** | +0.8/week | +1.2/week (A>B) | Learning speed |
| **Accuracy Trend** | Flat/random | Increasing slope | Progress signal |
| **Session Completion** | 85% | 92% (A>B) | Engagement |
| **Time-to-Mastery** | 60 days | 40 days (A<B) | Efficiency |
| **Confidence at Day 7** | 0.40 | 0.70+ (A>B) | Model reliability |
| **Momentum Detection** | N/A | Improving 3+x | Adaptivity working |

---

## 👥 Test User Setup

### **User Account Template**

```javascript
{
  userId: "test_adaptive_A_001",
  name: "Test Learner A1",
  email: "test.adaptive.a.001@fiezel.dev",
  group: "A",  // A = Core Brain v2, B = v1 only
  testStartedAt: "2026-08-24T10:00:00Z",
  targetAbility: 3.0,  // B1 level
  learningCurve: 1.0,  // normal
  tags: ["staging", "adaptivity-test", "group_A"]
}
```

### **Account Creation Script**

```bash
# Create 5 users per group (10 total)
for i in {1..5}; do
  # Group A (Core Brain v2)
  curl -X POST https://staging.fiezel.app/api/admin/users \
    -d "{\"userId\":\"test_adaptive_A_00${i}\",\"group\":\"A\"}"
  
  # Group B (Core Brain v1 only)
  curl -X POST https://staging.fiezel.app/api/admin/users \
    -d "{\"userId\":\"test_adaptive_B_00${i}\",\"group\":\"B\"}"
done
```

---

## 🔍 Monitoring & Metrics

### **Real-time Dashboard** (check daily)

```javascript
// Endpoint: /api/admin/ab-test-metrics?group=A&range=24h

Response: {
  "metrics": {
    "activeUsers": 5,
    "totalAttempts": 187,
    "avgAccuracy": 0.82,
    "abilityGainPerDay": 0.14,
    "momentumDetectionRate": 0.68,  // how often momentum detected vs unknown
    "confidenceAvg": 0.78,
    "sessionSizeAvg": 12.4,
    "completionRate": 0.91
  },
  "comparison": {
    "A_vs_B_abilityGain": "+0.04/day advantage for A",
    "A_vs_B_accuracy": "-0.02 (B slightly higher, still ok)",
    "A_vs_B_engagement": "+0.06 completion rate for A"
  }
}
```

### **Weekly Report (every Monday)**

```markdown
## Week 1 (Aug 24-30)

### Group A (Core Brain v2)
- Users: 5 active
- Attempts: 187
- Avg Ability Gain: +0.14/day (+0.98/week)
- Momentum Detected: 68%
- Session Size Range: 8-16 (adaptive)
- Completion: 91%

### Group B (Core Brain v1)
- Users: 5 active
- Attempts: 193
- Avg Ability Gain: +0.10/day (+0.70/week)
- Fixed Session Size: 12
- Completion: 85%

### Analysis
✓ A showing higher learning velocity (+28% faster)
✓ A engagement higher (completion +6%)
⚠ Both groups within normal variance (small N=5)
```

---

## 🛠️ Deployment Steps

### **Step 1: Staging Environment Setup**

```bash
# 1. Ensure staging uses m025-148
git checkout main
git log --oneline -1

# 2. Build & package
npm run build
npm run test:grammar-curriculum
npm run test:level-contract

# 3. Deploy to staging
npm run core:preflight  # pre-flight checks
npm run core:activate   # activate on staging
```

### **Step 2: Test User Provisioning**

```bash
# Create admin account for test management
curl -X POST https://staging.fiezel.app/api/admin/register \
  -d '{
    "email": "staging@fiezel.dev",
    "password": "...",
    "role": "test_admin"
  }'

# Enable Core Brain v2 for Group A
curl -X PATCH https://staging.fiezel.app/api/admin/feature-flags \
  -d '{
    "feature": "core_brain_v2",
    "groups": ["test_adaptive_A_*"],
    "enabled": true
  }'

# Disable Core Brain v2 for Group B (use v1 only)
curl -X PATCH https://staging.fiezel.app/api/admin/feature-flags \
  -d '{
    "feature": "core_brain_v2",
    "groups": ["test_adaptive_B_*"],
    "enabled": false
  }'
```

### **Step 3: Seed Initial Attempts** (optional)

```bash
# Give all users 5 initial attempts to bootstrap confidence
node scripts/seed-staging-users.js \
  --group A --group B \
  --count 5 \
  --difficulty 2
```

### **Step 4: Enable Monitoring**

```bash
# Start collecting metrics
curl -X POST https://staging.fiezel.app/api/admin/experiments/start \
  -d '{
    "experimentId": "adaptivity_v2_ab_test",
    "groups": ["A", "B"],
    "startedAt": "2026-08-24T10:00:00Z",
    "duration": "14d"
  }'
```

---

## 📊 Data Collection

### **Events Tracked**

```javascript
{
  "event": "attempt_submitted",
  "userId": "test_adaptive_A_001",
  "group": "A",
  "timestamp": "2026-08-24T10:30:00Z",
  "data": {
    "attemptId": "uuid",
    "difficulty": 3,
    "isCorrect": true,
    "responseTimeMs": 4200,
    "sessionSize": 12,
    "sessionNumber": 1,
    "skillType": "grammar",
    "skill": "past_simple",
    "family": "tense_aspect"
  }
}
```

### **Derived Metrics (computed hourly)**

```javascript
{
  "userId": "test_adaptive_A_001",
  "period": "2026-08-24T10:00:00Z",
  "metrics": {
    "ability": 1.87,
    "confidence": 0.52,
    "momentum": "improving",
    "momentumSlope": 0.08,
    "accuracyLast10": 0.80,
    "responseTimeAvg": 4100,
    "challengeWindow": { "floor": 2, "target": 2, "ceiling": 3 },
    "sessionSizeRecommended": 13,
    "fatigue": "fresh"
  }
}
```

---

## ✅ Success Criteria

**Go/No-Go Decision at Day 7:**

| Condition | Status | Action |
|-----------|--------|--------|
| No crashes or errors | Required | Monitor logs |
| Group A accuracy ≥ 70% | Required | Check data quality |
| Group B accuracy ≥ 70% | Required | Baseline ok |
| Group A ability gain > Group B | Desired | Adapt if trend unclear |
| Group A completion rate ≥ 85% | Desired | Check engagement |
| Core Brain v2 confidence ≥ 0.5 | Desired | Need ~30+ attempts/user |

**Decision at Day 14:**

- **👍 Ship to production IF:** Group A shows +20% better learning gain + no regressions
- **🔄 Extend test IF:** Promising but need more data (small N=5)
- **❌ Revert IF:** Group A performs worse OR crashes

---

## 🐛 Troubleshooting

### **If Group A accuracy < 60%**
```
Possible causes:
1. Core Brain making wrong difficulty jumps
   → Check: ability updates after each attempt
   → Fix: Lower confidence threshold temporarily
   
2. Question quality issue (language/ambiguity)
   → Check: Are listening/reading still English-heavy?
   → Fix: Use grammar-only questions for first week
   
3. Test users not engaged
   → Check: Session completion rate
   → Fix: Gamify or add incentive
```

### **If Core Brain confidence stuck at 0.25**
```
Possible causes:
1. Ability not updating (Elo weights wrong)
   → Check: estimateAbility() output per attempt
   → Fix: Review ABILITY_HALF_LIFE_DAYS (currently 21)
   
2. Evidence weighted too conservatively
   → Check: weighted calculation in estimateAbility()
   → Fix: Increase K factor or lower half-life
```

### **If momentum never detects "improving"**
```
Possible causes:
1. Block size too large (MOMENTUM_BLOCK=5)
   → Check: trend() on small blocks
   → Fix: Temporarily lower to 3 for testing
   
2. Noise in data (random correct/wrong)
   → Check: accuracy trend in UI
   → Fix: Need 20+ attempts minimum for r² to stabilize
```

---

## 📝 Daily Log Template

```markdown
# Staging Test Log — Week 1

## Day 1 (Aug 24)
- [ ] Deployment successful
- [ ] All test users created
- [ ] Monitoring dashboard live
- Observations: ___________

## Day 2 (Aug 25)
- Group A attempts: 45
- Group B attempts: 48
- Avg accuracy A: 78%
- Avg accuracy B: 75%
- Issues: ___________

## Day 3-7
...

## Weekly Summary
- Total attempts: 500
- Ability gain A: +0.12/day
- Ability gain B: +0.09/day
- Decision: Continue / Adjust / Revert
```

---

## 🎯 Next Phase (Post-Staging)

If Day 14 metrics favorable:

1. **Production Rollout:**
   - Phase 1: 10% of users → Core Brain v2
   - Phase 2: 50% of users → if Phase 1 ok
   - Phase 3: 100% of users → if Phase 2 stable

2. **Collect 30-day data:**
   - Learning gain vs pre-Core Brain
   - User retention curve
   - Support ticket volume (drop = good)

3. **Final decision:** Ship v2 as default or keep legacy fallback

---

## 📞 Contact & Escalation

- **Technical Issues:** Check logs at `/staging/logs/fiezel-*.log`
- **Data Questions:** Query `/api/admin/metrics` endpoint
- **User Complaints:** Monitor `/staging/feedback` queue
- **Emergency Rollback:** `git revert 9c990b7 && npm run core:activate`

---

**Status: Ready to Deploy ✅**

Waiting for: Staging infrastructure confirmation + test user setup.
