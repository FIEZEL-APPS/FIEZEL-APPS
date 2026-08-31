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

> **⚠️ Two corrections to this table, both established in Phase 2 and both detailed below.**
> The real gate has **211** steps, not 214 — three of the entries above came from an
> extraction bug that swept up commented-out lines (§4.1). And one of the three timeouts
> (`content-adoption-test.js`) is a **PASS at 272 s**, not an unmeasured step (§4.4). The
> table is left as originally recorded so the correction is visible rather than quietly
> overwritten.

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

> ## ⚠️ CORRECTION (Phase 2, 30 Aug 2026) — this finding was half wrong, and the wrong half was mine
>
> The original text of this section claimed the Quality Gate itself rewrites
> `grammar-templates.json`, and recorded the writer as UNKNOWN. **Phase 2 traced it, and the
> cause was this audit's own harness, not the gate.**
>
> To run "every gate step", Phase 1 extracted commands from `quality.yml` with a `grep` for
> `node <file>`. That grep also matched **two commented-out remediation hints** — lines that
> tell a maintainer what to run *if* a gate goes red:
>
> ```yaml
> # Perbaikan bila merah: node tools/sync-grammar-explanations-id.js --write
> # && node audit/merge-grammar-id.js.
> ```
>
> `audit/merge-grammar-id.js:60` stamps `updatedAt: new Date()...` and rewrites
> `grammar-templates.json`. **CI never runs it.** This audit did, because of the extraction
> bug, and that is what changed the file and made `id-golden-snapshot-test.js` fail.
>
> A corrected extractor that ignores comment lines yields **211 real gate steps**, not 214.
>
> **What survives the correction, verified and reproducible:** `ai-account-cap-gate-test.js`
> genuinely did rewrite the tracked `AI-ACCOUNT-CAP-GATE.json` on every run. That is a real
> defect and it is **now fixed** — the report prints to stdout always and writes only under
> `FIEZEL_WRITE_GATE_REPORT=1`.
>
> **What does not survive:** the broader claim that "the test suite is not read-only." With
> that one gate fixed, the suite does not modify tracked files. All eight other gate proof
> artefacts (`CONTENT-ADOPTION-PROOF.json` and friends) were already gitignored — the repo's
> convention was right; one file had escaped it.
>
> **Plain language:** the audit accused the test suite of something the audit itself did. The
> accusation is withdrawn, the one genuine part of it is fixed, and the count of gate steps is
> corrected from 214 to 211.

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
| `regression-test.js` | `quiz renderer does not show passage with reading question` — **root-caused below; it is a stale test, not a product bug** |
| `listening-subtitle-suppression-test.js` | 4 of 8 assertions fail — `say() tidak pernah dipanggil` (say() is never called) across A, B and two C cases |
| `listening-exam-test.js` | 1 failure — `Failed audio keeps the questions locked` |
| `speaking-exam-test.js` | 1 failure — `Exam sessions are level-scoped like everything else` |
| `voice-fallback-chain-test.js` | `app.js: say() yang mengembalikan false MEMICU cadangan speechSynthesis :: say=0 speak=1` |

**Pattern worth naming:** four of the five cluster around **voice, audio and subtitles** —
`say()`, speech synthesis fallback, listening audio, subtitle suppression. That is one
subsystem, not five unrelated bugs, and it is **not Braincore**.

#### The fifth, `regression-test.js`, root-caused: the test is stale, the product is correct

This one was investigated further after CI reproduced it, and the finding is worth stating
carefully because it is the opposite of what the error message suggests.

The assertion (`regression-test.js:66`) accepts either of two forms:

1. `q.passage?card(...TEKS BACAAN` — the literal string in `app.js`; or
2. `q.passage?card(...FiezelI18n.t('quiz.teks-bacaan')` **and** `'quiz.teks-bacaan': 'TEKS BACAAN'`
   in the copy map.

What `app.js:7660` actually renders is:

```js
q.passage?card(`<div class="passage passage-reading"><div class="eyebrow">${FiezelI18n.t('quiz.reading-eyebrow')}</div>...
```

During the i18n migration the key was **renamed** from `quiz.teks-bacaan` to
`quiz.reading-eyebrow`. The test still pins the old name, so neither branch matches.

**The product is fine.** The new key is properly defined in both locales:

| Key | File | Value |
|---|---|---|
| `quiz.reading-eyebrow` | `features/i18n/copy-id-app-e.js:42` | `'TEKS BACAAN'` |
| `quiz.reading-eyebrow` | `features/i18n/copy-th-app-e.js:42` | `'บทอ่าน'` |

The passage card renders, with the correct eyebrow, in Indonesian and Thai. The old key
`quiz.teks-bacaan` survives in `copy-id-app-d.js:316` / `copy-th-app-d.js:316` as an **orphan**
— referenced by nothing in the codebase except the stale test's own comment.

**Plain language:** the test is looking for a label by its old name. The label was renamed and
still works correctly on screen. Nothing a student sees is broken. **This is test maintenance
left behind by a rename, not a defect in the app.**

**Why this matters for the count:** it means the five "genuine" failures are really **four
voice/audio product failures plus one stale test.** It also means the *product* health of this
repository is slightly better than the raw red/green count suggests.

**Proposed fix** (not applied here — this audit does not modify product or test files):
update the second branch of the assertion to the current key name, and delete the orphaned
`quiz.teks-bacaan` entries from `copy-id-app-d.js` and `copy-th-app-d.js`.

**A note on the CI gate's behaviour.** The Quality Gate runs its steps sequentially under
`bash -e`, so it **halts at `regression-test.js`** and never reaches the later steps. CI
therefore reports exactly one failure, and the other four are invisible to it. Anyone reading
CI alone would conclude there is a single problem. There are five.

**Plain language:** the adaptive engine — the thing being prepared for sale — is fully green.
The failures sit in the voice/audio layer of the surrounding application. For a Braincore sale
this is reassuring; for the FIEZEL product as a whole, these are open bugs that need owners.

### 4.4 Timeouts

| Step | Behaviour |
|---|---|
| `content-adoption-test.js` | Exceeded 180 s, then 200 s |
| `fiezel-evolution-loop-test.js` | Exceeded 120 s |
| `release-audit-gate-test.js` | Exceeded 120 s |

**Status at the time: UNKNOWN, not FAIL.** Correctly refused to claim a pass or a fail.

> ## ✅ RESOLVED (Phase 2) — `content-adoption-test.js` passes; the timeout was the harness
>
> Re-run with a 900-second allowance: **exit 0, `FIEZEL canonical adoption gate: PASS`, in
> 272 seconds.** It was never hanging. The audit's 150–180 s ceiling was simply below its
> real runtime.
>
> **Why it takes 4½ minutes**, traced rather than guessed: `content-canary-config-builder.js`
> calls `gate.validateCandidate()`, which re-runs the full content QA over a ~4.3 MB corpus —
> **18.4 s per call, measured**. The test calls it twice and runs a dozen further evaluations.
>
> So the honest classification is **EXPECTED (slow) / PASS**, not unmeasured. The remaining
> two are still genuinely **UNKNOWN** — they were not re-run to completion.

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
