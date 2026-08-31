# Simulated Learner Study — Braincore vs baseline (Phase 2 / Phase J)

**Braincore 3.0.0** · 1620 paired runs · 64800 simulated interactions · 3000-iteration paired bootstrap (seed 20260830)

Layer measured: jalur keputusan per-jawaban (18 modul) — pemilihan soal BUKAN di sini, lihat AUDIT/08.

## Verdicts

| metric | question | baseline | Braincore | mean diff | 95% CI | verdict |
|---|---|---|---|---|---|---|
| `trackingError` | Seberapa dekat taksiran P(benar) pada kebenaran empiris? | 0.1305 | 0.1071 | -0.0235 | [-0.0268, -0.02] | **terbukti_lebih_baik** |
| `reteachSia2` | Seberapa sering mesin mengajar ULANG murid yang sudah bisa? | 0.3881 | 0.9552 | 0.5672 | [0.4677, 0.6716] | **terbukti_lebih_buruk** |
| `advanceLewat` | Seberapa sering mesin menaikkan murid yang belum bisa? | 0 | 0 | 0 | [0, 0] | **inconclusive** |

Pairs used per metric: trackingError 1620 · reteachSia2 201 · advanceLewat 738.

## Per arm: does the learner move?

The combined row above hides the most interesting split, so it is broken out. `diam` =
ability static, `menurun` = declining 0.035 theta/day, `membaik` = improving at the same
rate (the units are v3's own; its `menurun` profile declares -0.035/day).

| arm | metric | baseline | Braincore | 95% CI | verdict |
|---|---|---|---|---|---|
| `diam` | `trackingError` | 0.1302 | 0.1036 | [-0.0328, -0.0204] | **terbukti_lebih_baik** |
| `diam` | `reteachSia2` | 0.5556 | 1.3704 | [0.6543, 0.963] | **terbukti_lebih_buruk** |
| `diam` | `advanceLewat` | 0 | 0 | [0, 0] | **inconclusive** |
| `menurun` | `trackingError` | 0.1345 | 0.096 | [-0.0424, -0.0347] | **terbukti_lebih_baik** |
| `menurun` | `reteachSia2` | — | — | — | **insufficient** (no runs in band) |
| `menurun` | `advanceLewat` | 0 | 0 | [0, 0] | **inconclusive** |
| `membaik` | `trackingError` | 0.1269 | 0.1216 | [-0.0123, 0.0016] | **inconclusive** |
| `membaik` | `reteachSia2` | 0.275 | 0.675 | [0.2667, 0.5333] | **terbukti_remeh** |
| `membaik` | `advanceLewat` | 0 | 0 | [0, 0] | **inconclusive** |

**Read the split, not just the total.** Braincore's estimate is *proven better* for a
learner who is static or declining, and **inconclusive for a learner who is improving** —
its weakest case, and the one a learning product most wants to get right. A residual
negative bias remains: it still tends to under-estimate the learner, so it is slowest to
notice someone getting better.

The over-reteaching finding survives every arm where it can be measured.

## Direction and proof status, stated separately

These lines come from `pesanArahFaktual`, reused verbatim from
`adaptivity-simulation-v3-extended.js`. It exists because an earlier report printed
*"RMSE did NOT fall (0.2694 → 0.2622)"* for a number that plainly fell. It always states
the factual direction first and the proof status separately.

- trackingError turun 0.0234 (0.1305 → 0.1071); CI selisih 95% [-0.0268, -0.02] — terbukti membaik melewati margin praktis 0.02
- reteachSia2 naik 0.5671 (0.3881 → 0.9552); CI selisih 95% [0.4677, 0.6716] — terbukti memburuk melewati margin praktis 0.5
- advanceLewat tidak berubah (0 → 0); CI selisih 95% [0, 0] memeluk nol — efek belum terbukti

## How to read `inconclusive`

`inconclusive` means the confidence interval **embraces zero**: on this evidence the
difference is not established in either direction. It does **not** mean "roughly equal",
and it must never be written up as "better". A metric marked `inconclusive` is an open
question, not a result.

## This study previously reported the opposite, and the cause was a defect in the harness

An earlier version of this study concluded that Braincore was **proven worse** than the
baseline on `trackingError`. That conclusion was wrong, and the reason was a bug in
`braincore-pipeline.js`, not in Braincore: the ability estimator was fed rows carrying
`correct`, while `FiezelCoreBrain.estimateAbility` reads `ok`. Every row therefore read
as a wrong answer. The estimate ran to its floor (0.40) and stayed pinned there while
true ability was 2.3-3.7 — and `predicted`, the quantity this whole comparison rests on,
is derived from that estimate. See `AUDIT/12`.

## The over-reteaching is a design property, not the labelling defect

`AUDIT/10` §4 found that `persistent_misconception` is reported without any misconception
evidence. The obvious question is whether `reteachSia2` is merely measuring that defect.
**It is not.** Applying the proposed fix to a copy of the tree and re-running this study
produced **byte-identical numbers**: the fix changes the reason *string*, not the *action*.
So there are two separate problems — a truthfulness problem in what the engine says, and
a behavioural one in what it does — and fixing the first will not move this metric.

## What this study does NOT establish

1. **Every learner is synthetic.** No real learner has been through this. Nothing here
   is evidence about learning outcomes.
2. **The latent learner shares Braincore's curve family** — it generates answers through
   Core Brain's `successProbability`. These numbers are an **upper bound for Braincore**,
   not a neutral estimate.
3. **Latent ability is static.** Nothing here measures whether Braincore *causes* learning.
4. **One layer.** Item selection is measured by `adaptivity-simulation-v3.js`, whose own
   verdict is a different trade-off (`AUDIT/08`). Do not merge the two into one headline.
