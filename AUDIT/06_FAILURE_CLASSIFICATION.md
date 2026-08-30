# AUDIT 06 — Failure Classification (Phase 2 / A4)

**What this answers:** for every failing or unmeasured gate step, *what kind* of problem is it?
A red gate caused by a renamed variable and a red gate caused by a broken feature demand
completely different responses, and lumping them together is how a team learns to ignore red.

**Rule applied throughout: no assertion was weakened to make anything green.** Every fix below
was proven to still catch the defect it names.

---

## Classification vocabulary

| Class | Meaning |
|---|---|
| **REAL PRODUCT BUG** | The student's experience is genuinely broken or degraded |
| **STALE TEST** | The product is correct; the test pins something that legitimately changed |
| **TEST INFRASTRUCTURE BUG** | The harness itself is wrong — it never gave the code a fair chance |
| **EXPECTED FAILURE** | Requires infrastructure this environment deliberately does not have |
| **UNKNOWN** | Not established. Recorded as unknown rather than guessed |

---

## The table

| # | Step | Class | Root cause | Status |
|---|---|---|---|---|
| 1 | `regression-test.js` | **STALE TEST** | i18n key renamed `quiz.teks-bacaan` → `quiz.reading-eyebrow`; the assertion still pinned the old name. The reading card rendered correctly in both locales throughout. | ✅ **Fixed on `main`** (PR #253). This audit fixed it independently; `main`'s version is better and was taken in the merge — see §3. |
| 2 | `listening-exam-test.js` | **STALE TEST** | Regex demanded `{const` with no whitespace; the i18n waves reformatted the method onto separate lines. `normalizeLevel(level)` never moved. | ✅ **Fixed on `main`** (PR #253), independently reproduced here. |
| 3 | `speaking-exam-test.js` | **STALE TEST** | Identical to #2 — **the same assertion**, so this was one defect reported twice, not two. | ✅ **Fixed on `main`** (PR #253). |
| 4 | `listening-subtitle-suppression-test.js` | **REAL PRODUCT BUG** | `const say=self.FiezelVoiceSay?.say;` was deleted from `AudioService` in `ec2b119`. See §2 — this is the most serious finding of Phase A. | ✅ **Fixed on `main`** (PR #264). |
| 5 | `voice-fallback-chain-test.js` | **REAL PRODUCT BUG** (same root cause as #4) | Same missing binding. Two of its assertions reported `say=0`. | ✅ **Fixed on `main`** (PR #264). |
| 6 | `cf-wiring-test.js` | **EXPECTED FAILURE** | Needs live Cloudflare D1. Its own output says so: `jalankan: wrangler d1 execute fiezel-core --remote --file=migrations/0003_cron.sql`, plus `D1_UNKNOWN_TABLE: batch_dedup`. Consistent with the placeholder database IDs (AUDIT 00 §6). | Not a defect. Unmeasurable without live infrastructure. |
| 7 | `tools/fiezel-health-probe.mjs` | **EXPECTED FAILURE** | Probes the live production site; unreachable from this environment. | Not a defect. |
| 8 | `id-golden-snapshot-test.js` | **TEST INFRASTRUCTURE BUG — and it was the audit's own** | Not the suite's fault. Phase 1's gate-list extraction swept up two **commented-out** remediation hints, one of which (`audit/merge-grammar-id.js`) stamps today's date into `grammar-templates.json`. CI never runs it. | ✅ **Fixed** — corrected extractor; 211 real gate steps, not 214. |
| 9 | `ai-account-cap-gate-test.js` | **TEST INFRASTRUCTURE BUG** | Rewrote the tracked `AI-ACCOUNT-CAP-GATE.json` on every run, timestamps included. | ✅ **Fixed here** — writes only under `FIEZEL_WRITE_GATE_REPORT=1`. |
| 10 | `content-adoption-test.js` | **EXPECTED (slow) — PASSES** | Not a hang. **Exit 0 in 272 s.** `validateCandidate()` re-runs the full content QA over a ~4.3 MB corpus at **18.4 s per call (measured)**, and the test calls it twice plus a dozen evaluations. | ✅ Reclassified from "unmeasured" to **PASS**. |
| 11 | `fiezel-evolution-loop-test.js` | **UNKNOWN** | Exceeded the audit's ceiling; not re-run to completion. | ⚠️ Neither pass nor fail is claimed. |
| 12 | `release-audit-gate-test.js` | **UNKNOWN** | As above. | ⚠️ Neither pass nor fail is claimed. |

### Tally

| Class | Count |
|---|---|
| STALE TEST | 3 |
| REAL PRODUCT BUG | 2 (one root cause) |
| TEST INFRASTRUCTURE BUG | 2 (one of them the audit's own) |
| EXPECTED FAILURE (infrastructure) | 2 |
| EXPECTED (slow) — passes | 1 |
| UNKNOWN | 2 |

---

## 2. The one genuine product bug — and why nothing looked broken

**This is the most important finding in Phase A**, and it is worth reading even if the rest is
skipped.

One line was deleted from `AudioService` in commit `ec2b119`:

```js
const say = self.FiezelVoiceSay?.say;
```

The code that uses it stayed:

```js
const viaDoor = typeof say === 'function' ? ... : Promise.resolve(false);
```

**Why this produced no error at all.** In JavaScript, `typeof` applied to an identifier that was
never declared returns the string `'undefined'` — it does **not** throw, unlike almost every
other use of an undeclared name. So `typeof say === 'function'` simply evaluated to `false`,
`viaDoor` resolved to `false`, and **the entire neural-voice ladder was skipped silently.**

**What a student experienced.** They still heard a voice — the device's built-in
speech synthesis — so nothing appeared broken. Only the *quality* changed. The
`provider:'fiezel-voice-say'` branch became unreachable dead code.

**Plain language:** the wire that connects the good voice to the app was cut, and because of a
quirk of the language, nothing complained. Everyone kept hearing *a* voice, just the cheaper
one. This is the hardest class of bug to notice, and it is exactly the class that text-matching
tests cannot catch — the pattern was still in the file; only the binding was gone.

**What caught it:** `listening-subtitle-suppression-test.js`, which *executes* `AudioService`
against a stubbed `FiezelVoiceSay` rather than grepping the source. Its four assertions failed
with "say() was never called."

**Status: fixed on `main` by PR #264** — verified present in the merged tree.

---

## 3. Two sessions, same three diagnoses — and theirs were better

While this audit was diagnosing the three stale tests, PR #253 (*"five gates red with no product
bug"*) landed the same three fixes on `main`. The merge produced conflicts in all three files.

**Each conflict was resolved in favour of `main`, because `main`'s version is genuinely better:**

| File | This audit's fix | `main`'s fix | Taken |
|---|---|---|---|
| `regression-test.js` | Hardcoded the *new* key name | **Reads the key out of the renderer**, then verifies its value in the copy map — so a future rename passes automatically while a missing card still fails | **`main`** |
| `listening-exam-test.js` | `\s*\{\s*const target=` | `\s*\{\s*const\s+target\s*=\s*` — tolerant of spacing around `=` too | **`main`** |
| `speaking-exam-test.js` | as above | as above | **`main`** |

The independent agreement on all three diagnoses is a useful cross-check. On the first file
`main`'s approach is meaningfully more durable: mine would have gone stale again at the next
rename, theirs would not.

---

## 4. The pattern worth naming

Three of the four test-side failures share one shape: **an assertion pinned to exact source
text rather than to behaviour.** They went red when the source was reformatted or a key was
renamed, with no defect behind them.

The repository already knows the complementary failure mode. From `sw-nav-budget-test.js`:

> *"Yang diuji PERILAKU-nya, bukan ada-tidaknya kata 'timeout' di dalam berkas: assert berbasis
> pola teks sudah dua kali dalam sesi ini hijau sementara cacat yang ia namai masih berdiri."*
>
> (Behaviour is tested, not whether the word 'timeout' appears in the file: text-pattern
> assertions have twice this session stayed **green while the defect they name still stood**.)

So text-pattern assertions fail in **both** directions:

- **False red** — they break on reformatting (findings #1, #2, #3 here).
- **False green** — they pass while the defect stands (the `say` binding, #4/#5: the pattern was
  still in the file; only the binding had gone).

**Plain language, and this is the lesson worth keeping:** a test that checks *what the code looks
like* is guessing. A test that *runs the code* and checks what it does is knowing. The gates in
this repository that caught real bugs — `listening-subtitle-suppression-test.js`,
`sw-nav-budget-test.js` — are the ones that execute. The ones that produced false alarms are the
ones that read source as text.

That is the direction Phase A's manifest gate was rebuilt in (AUDIT 01 §5), and it is the
recommendation carried into Phase B.

---

## 5. Result

On the merged tree, all seven previously-failing gates in scope pass:

```
PASS  regression-test.js
PASS  listening-exam-test.js
PASS  speaking-exam-test.js
PASS  listening-subtitle-suppression-test.js
PASS  voice-fallback-chain-test.js
PASS  id-golden-snapshot-test.js
PASS  brain-manifest-test.js
```

Still not green, and honestly so: `cf-wiring-test.js` and `tools/fiezel-health-probe.mjs`
(both need live infrastructure), and two steps that remain **UNKNOWN**.

---

*End of AUDIT 06.*
