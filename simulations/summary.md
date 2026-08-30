# Simulated Learner Study — Braincore vs baseline (Phase 2 / Phase J)

**Braincore 3.0.0** · 540 paired runs · 21600 simulated interactions · 3000-iteration paired bootstrap (seed 20260830)

Layer measured: jalur keputusan per-jawaban (18 modul) — pemilihan soal BUKAN di sini, lihat AUDIT/08.

## Verdicts

| metric | question | baseline | Braincore | mean diff | 95% CI | verdict |
|---|---|---|---|---|---|---|
| `trackingError` | Seberapa dekat taksiran P(benar) pada kebenaran empiris? | 0.1302 | 0.1853 | 0.0551 | [0.0396, 0.0715] | **terbukti_lebih_buruk** |
| `reteachSia2` | Seberapa sering mesin mengajar ULANG murid yang sudah bisa? | 0.5556 | 1.3704 | 0.8148 | [0.6543, 0.963] | **terbukti_lebih_buruk** |
| `advanceLewat` | Seberapa sering mesin menaikkan murid yang belum bisa? | 0 | 0 | 0 | [0, 0] | **inconclusive** |

Pairs used per metric: trackingError 540 · reteachSia2 81 · advanceLewat 258.

## Direction and proof status, stated separately

These lines come from `pesanArahFaktual`, reused verbatim from
`adaptivity-simulation-v3-extended.js`. It exists because an earlier report printed
*"RMSE did NOT fall (0.2694 → 0.2622)"* for a number that plainly fell. It always states
the factual direction first and the proof status separately.

- trackingError naik 0.0551 (0.1302 → 0.1853); CI selisih 95% [0.0396, 0.0715] — terbukti memburuk melewati margin praktis 0.02
- reteachSia2 naik 0.8148 (0.5556 → 1.3704); CI selisih 95% [0.6543, 0.963] — terbukti memburuk melewati margin praktis 0.5
- advanceLewat tidak berubah (0 → 0); CI selisih 95% [0, 0] memeluk nol — efek belum terbukti

## How to read `inconclusive`

`inconclusive` means the confidence interval **embraces zero**: on this evidence the
difference is not established in either direction. It does **not** mean "roughly equal",
and it must never be written up as "better". A metric marked `inconclusive` is an open
question, not a result.

## The single most important caveat: the learner does not move

Latent ability is **static** for the whole run. That is the best possible case for a
rolling average and the worst possible showcase for an adaptive model: BKT, evidence
credibility and the memory model all exist to track a learner who *changes*, and this
study holds the learner still. The `trackingError` verdict should be read with that
firmly in mind — it is a real result about a narrow condition, not a general one.

This is a limitation of the study, not an excuse for the engine. The honest next step is
a second arm with moving ability (v3 profiles already declare `driftHarian`, and
`menurun` carries -0.035/day), which is **not built here** and is named as open work.

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
