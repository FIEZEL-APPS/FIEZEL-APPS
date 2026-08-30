# AUDIT 05 — Test Reality Check

**What this document answers:** not "does the architecture exist?" but **"does it actually
work, and how do we know?"**

**Method:** every check step in `.github/workflows/quality.yml` was extracted (214 steps) and
**executed** on this machine with Node v22.22.2. Nothing below is copied from a badge, a
prior report, or a CI summary. Where a test was not run, it says so.

**Rule applied throughout: "untested" was never converted into "pass."**

---

## 1. Headline result

| | Count | Share |
|---|---|---|
| **PASS** | **202** | 94.4% |
| **FAIL** | 8 | 3.7% |
| **TIMEOUT** (exceeded 120–180 s) | 3 | 1.4% |
| Not applicable / live-infra | 1 | 0.5% |
| **Total steps executed** | **214** | |

**Plain language:** the great majority of this project's own checks genuinely pass when you
run them. That is a real and unusual strength — most projects this size cannot make that
claim. But it is **not** "all green", and the differences matter. They are itemised below,
honestly, one by one.

---

## 2. Braincore specifically — all 24 module tests pass

This is the part a buyer cares about most, so it was run separately and in isolation:

| Test | Result | Test | Result |
|---|---|---|---|
| `core-brain-test` | ✅ PASS | `olm-test` | ✅ PASS |
| `core-brain-v2-test` | ✅ PASS | `production-grader-test` | ✅ PASS |
| `core-brain-v3-upgrade-test` | ✅ PASS | `step-tutor-test` | ✅ PASS |
| `tutor-brain-v3-test` | ✅ PASS | `srl-coach-test` | ✅ PASS |
| `brain-manifest-test` | ✅ PASS ⚠️ | `listening-adaptive-test` | ✅ PASS |
| `brain-config-test` | ✅ PASS | `speaking-adaptive-test` | ✅ PASS |
| `brain-page-wiring-test` | ✅ PASS | `learning-metrics-test` | ✅ PASS |
| `mastery-bkt-test` | ✅ PASS | `metrics-digest-test` | ✅ PASS |
| `misconception-ledger-test` | ✅ PASS | `fiezel-stat-gate-test` | ✅ PASS |
| `item-prior-test` | ✅ PASS | `fiezel-post-test-test` | ✅ PASS |
| `item-calibration-test` | ✅ PASS | `evidence-credibility-test` | ✅ PASS |
| `affect-test` | ✅ PASS | `confusion-matrix-test` | ✅ PASS |

**24 / 24 pass.** Every Braincore module — including the five that are not currently wired
into the app — has a test file and that test passes.

**⚠️ The one asterisk:** `brain-manifest-test` passes, but one of its fourteen checks is
hollow — it asserts a hard-coded constant instead of reading `app.js` as its name promises.
See AUDIT 01 §5. The other thirteen checks in that file are genuine.

---

## 3. Subsystem status table

Exactly as the brief requires — implemented, tested, and result kept as separate columns.

| Subsystem | IMPLEMENTED? | TESTED? | RESULT |
|---|---|---|---|
| Ability estimation (Rasch/Elo) | Yes | Yes | **PASS** |
| Optimal difficulty (85% rule) | Yes | Yes | **PASS** |
| Memory model (FSRS-lite half-life) | Yes | Yes | **PASS** |
| Review scheduling (single-writer) | Yes | Yes | **PASS** |
| Trend / momentum | Yes | Yes | **PASS** |
| Prerequisite graph / root cause | Yes | Yes | **PASS** |
| Mastery (BKT) | Partial (shadow for unlock) | Yes | **PASS** |
| Misconception ledger | Yes | Yes | **PASS** |
| Misconception taxonomy | Yes | Yes | **PASS** |
| Item prior (pre-answer difficulty) | Yes | Yes | **PASS** |
| Item calibration (observed difficulty) | Yes | Yes | **PASS** |
| Evidence credibility (kappa) | Yes | Yes | **PASS** |
| Affect (frustration / boredom) | Yes | Yes | **PASS** |
| Tutor selection & scaffolding | Yes | Yes | **PASS** |
| Step tutor | Yes | Yes | **PASS** |
| Production grader (typed answers) | Yes | Yes | **PASS** |
| SRL coach | Yes | Yes | **PASS** |
| Confusion matrix | Shadow | Yes | **PASS** |
| OLM (open learner model) | Shadow | Yes | **PASS** |
| Listening adaptive | Shadow | Yes | **PASS** |
| Speaking adaptive | Shadow | Yes | **PASS** |
| Learning metrics | Not wired | Yes | **PASS** |
| Metrics digest | Not wired | Yes | **PASS** |
| Stat gate | Not wired in app | Yes | **PASS** |
| Retention probe | Not loaded | Yes | **PASS** |
| Adaptivity simulation (v3) | Yes | Yes | **PASS** |
| **Learning telemetry lane** | Yes, but **switched off** | Yes | **PASS** (tests the off-state contract too) |
| **Does the engine improve real learning?** | — | **NO** | **UNPROVEN — see §6** |

---

## 4. The 8 failures and 3 timeouts, each explained

### 4.1 A failure that is an artefact of the test run itself

**`id-golden-snapshot-test.js`** — FAIL in the batch run, **PASS in isolation.**

- Error: `FILE grammar-templates.json — baseline 3401d97f8511… ≠ sekarang 5456fa9b6f41…`
- Cause: an **earlier step in the same run rewrote `grammar-templates.json`**, changing its
  `updatedAt` field from `2026-08-29` to today's date. The golden-snapshot test then
  correctly reported that the file no longer matches its recorded hash.
- **Verified both ways:** the file was restored to its committed state and the test re-run
  alone → `HIJAU: baseline emas Indonesia utuh` (green, baseline intact).

**This is a real defect, and it is a process defect rather than a product defect.**

> **⚠️ Finding: the test suite is not read-only. Running it modifies tracked files.**
>
> Confirmed and reproducible: `ai-account-cap-gate-test.js` rewrites
> `AI-ACCOUNT-CAP-GATE.json` (its own report artefact) every time it runs, updating embedded
> timestamps. Something in the run also rewrites `grammar-templates.json`'s `updatedAt` — the
> exact writer was **not isolated** and is recorded here as **UNKNOWN** rather than guessed.
>
> **Plain language:** running the tests leaves fingerprints on the project's own files. One
> test's fingerprints then make a *different* test fail. That second failure is not a real
> bug — it is the first test's mess. A buyer's engineer running the suite on day one will
> hit exactly this and will not know it is harmless. It should be fixed before any technical
> demonstration, and it is cheap to fix: gates should write their reports outside the tracked
> tree, or the reports should be untracked.

### 4.2 Failures that need live infrastructure (expected in this environment)

| Step | Why it fails here |
|---|---|
| `cf-wiring-test.js` | Needs real Cloudflare D1. Output literally instructs: `jalankan: wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql`, and reports `D1_UNKNOWN_TABLE: batch_dedup`. Consistent with AUDIT 00 §6 — the database IDs in the repo are placeholders. |
| `tools/fiezel-health-probe.mjs` | Probes the live production site. No live site reachable from this audit environment. |

**These are not product defects.** They are checks that require infrastructure this audit
deliberately did not touch. They are marked **UNKNOWN**, not PASS.

### 4.3 Genuine pre-existing failures

All five were re-run individually on a clean, unmodified tree, and all five still fail.
**None of them are caused by this audit** — verified with `git diff main` showing every one of
these test files and their subjects is byte-identical to `main`.

| Step | Failing assertion |
|---|---|
| `regression-test.js` | `quiz renderer does not show passage with reading question` |
| `listening-subtitle-suppression-test.js` | 4 of 8 assertions fail — `say() tidak pernah dipanggil` (say() is never called) across A, B and two C cases |
| `listening-exam-test.js` | 1 failure — `Failed audio keeps the questions locked` |
| `speaking-exam-test.js` | 1 failure — `Exam sessions are level-scoped like everything else` |
| `voice-fallback-chain-test.js` | `app.js: say() yang mengembalikan false MEMICU cadangan speechSynthesis :: say=0 speak=1` |

**Pattern worth naming:** four of the five cluster around **voice, audio and subtitles** —
`say()`, speech synthesis fallback, listening audio, subtitle suppression. That is one
subsystem, not five unrelated bugs, and it is **not Braincore**. The fifth (`regression-test`)
is a reading-passage rendering issue in the quiz UI.

**Plain language:** the adaptive engine — the thing being prepared for sale — is fully green.
The failures sit in the voice/audio layer of the surrounding application. For a Braincore sale
this is reassuring; for the FIEZEL product as a whole, these are open bugs that need owners.

### 4.4 Timeouts

| Step | Behaviour |
|---|---|
| `content-adoption-test.js` | Exceeded 180 s, then exceeded 200 s on a second isolated attempt |
| `fiezel-evolution-loop-test.js` | Exceeded 120 s |
| `release-audit-gate-test.js` | Exceeded 120 s |

**Status: UNKNOWN, not FAIL.** These may be genuinely long-running (heavy simulations) or
they may hang. This audit did not run them to completion and therefore **does not claim they
pass and does not claim they fail.** A buyer should be told they are unmeasured.

---

## 5. What the test suite genuinely proves

Read positively, and this is worth saying because it is uncommon:

1. **All 21 Braincore modules are provably pure.** `brain-manifest-test.js` checks every file
   for DOM, network, storage, `Math.random` and `Date.now` — and passes. This audit
   independently re-verified it with a direct source scan. **Zero occurrences outside
   comments.**
2. **Braincore is deterministic.** No clock, no randomness. Same input → same output, forever.
   That is what makes the other 23 tests meaningful rather than flaky.
3. **The privacy contracts are enforced by tests, not by discipline.**
   `d1-schema-contract-test.js` scans the SQL for forbidden linking columns;
   `analytics-privacy-test.js`, `observability-privacy-test.js` and `learning-lane-test.js`
   all pass.
4. **The secret scanner is real.** `secret-scan-test.js` — `46/46 assert PASS, 1041 text files
   scanned, 295 binaries skipped, 0 findings, 8 justified exceptions`.
5. **A simulation harness exists** (`adaptivity-simulation-v3.js`, 1,951 lines) and its
   self-tests pass.

---

## 6. ⚠️ The most important thing the tests do NOT prove

Every test above verifies that **the code does what the code intends to do**. Not one of them
verifies that **a student learns more because of it.**

| Claim | Proven? |
|---|---|
| The BKT formula computes correct probabilities | ✅ Yes |
| The memory model schedules reviews as designed | ✅ Yes |
| The tutor picks the question the algorithm says it should | ✅ Yes |
| The engine is deterministic and pure | ✅ Yes |
| The simulation runs and simulated learners behave sensibly | ✅ Yes |
| **Real students master more with it than without it** | ❌ **NO EVIDENCE** |
| **Real students retain longer with it than without it** | ❌ **NO EVIDENCE** |
| **Misconceptions actually reduce over time in real use** | ❌ **NO EVIDENCE** |
| **Interventions actually change outcomes in real use** | ❌ **NO EVIDENCE** |

**Plain language — and this is the single most important honest sentence in the whole audit:**

> We can prove the machine is built correctly. We cannot yet prove it teaches better.

There is no A/B test, no control group, no before-and-after study, and no field data — because
the learning-telemetry lane that would collect the data is switched off (AUDIT 03 §4.2), and
because there is no evidence that the app has had a body of real students to measure.

`fiezel-learning-metrics.js` was clearly **built to answer exactly these questions** — it
computes learning gain, retention at gap, Brier calibration, hint dependency and misconception
persistence. It is complete, it is tested, and **nothing calls it.** The measuring instrument
was built and never switched on.

**What this means for a sale.** Braincore can honestly be described as *a well-engineered,
research-grounded, fully-tested adaptive learning engine*. It **cannot** honestly be described
as *proven to improve learning outcomes*. Any buyer materials that blur that line would be
making a claim the evidence does not support. Phase 18 of the brief demands this distinction,
and it is the right demand.

---

## 7. Reproducing this result

```bash
node --version            # v22.22.2 used here
node core-brain-test.js   # and the other 23 Braincore tests
# Full gate list is extractable from .github/workflows/quality.yml:
grep -oE 'node [a-zA-Z0-9._/-]+\.(js|mjs)' .github/workflows/quality.yml | sed 's/^node //' | sort -u
```

⚠️ Restore the tree afterwards — the run dirties tracked files (§4.1):
```bash
git checkout -- grammar-templates.json AI-ACCOUNT-CAP-GATE.json
```

---

*End of AUDIT 05.*
