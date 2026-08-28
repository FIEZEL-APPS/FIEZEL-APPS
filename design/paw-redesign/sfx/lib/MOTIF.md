# FIEZEL Signature Motif — "Ascent & Crown" (LOCKED)

Owner: Foundation. This is the sonic DNA per brief §1/§3.3. All category
generators MUST derive motif appearances from `fzsynth.MOTIF` /
`fzsynth.render_motif(variant=...)` — never re-invent the pitches.

## The motif

| # | Note | Freq (Hz) | Interval from prev | Role |
|---|------|-----------|--------------------|------|
| 1 | F4   | 349.23    | —                  | root pickup |
| 2 | A4   | 440.00    | +M3                | rise |
| 3 | C5   | 523.25    | +m3                | rise |
| 4 | G5   | 783.99    | **+P5**            | the "crown" (add9), held |

- **Key:** F major (continuity with the current app pitch set F2/F3/C4/F4/A4/C5/G5 —
  every motif tone is already in the app's vocabulary).
- **Rhythm:** three even fast pickups + one held crown note
  (steps of one grid unit; crown rings ~3x a unit). Grid unit scales with the
  variant: 85 ms (mini) → 160 ms (standard) → 190 ms (fanfare).
- **Harmony rule:** the crown G5 is the **add9** of F major. Any chord bed under
  the crown must be **Fadd9 voicing without E or Bb** (e.g. F3–C4–F4–A4–G4).
  Never harmonize the crown with a plain F triad top F5 (semitone-free, but it
  buries the hook) and never add the 7th.

## Why this one (A/B/C prototype shoot-out, see qa/foundation/motif_protos/)

- **Distinctiveness:** a plain rising 1-3-5-8 arpeggio (candidate B's family) is
  the most generic app-fanfare cliché. Ascent & Crown breaks it at the last
  moment — instead of the tonic octave it leaps a P5 up to the add9. The widest
  interval lands on the color tone = recognizable fingerprint even at 300 ms.
- **Scalability:** verified renders at mini (~0.35 s gesture), standard (~1.2 s)
  and fanfare (~3 s). The crown sits inside Fadd9, so one harmony rule works at
  every scale; at mini scale the 4 onsets and rising centroid stay legible.
- **Non-fatigue:** the add9 ending is resolved-but-airy — it avoids the hard
  cadential "full stop" that grows tiresome over hundreds of repetitions, and it
  contains no semitone clash; top note 784 Hz fundamental keeps brightness
  below harshness territory.
- Candidate B (F4-C5-A4-F5 zigzag) muddied at mini scale and ends on the most
  conventional note possible; candidate C (C4-F4-A4 horn call) is warm but
  soft-spoken, weak as brand DNA, and only 3 notes limited its fanfare form.

## Variation rules per intensity (brief §1, §3.3)

| Use | `render_motif(variant=)` | Recipe |
|-----|--------------------------|--------|
| `notif_streak_reminder` (mini) | `"mini"` | glockenspiel only, 85 ms grid, light shimmer send, ≈0.35 s gesture. May be truncated to the first 3 notes if <300 ms is required. |
| `streak_10` (energetic mid) | `"streak"` | kalimba + xylophone doubling, 110 ms grid, dry-ish, snappy. `streak_5` should quote only notes 1-3 (no crown) so streak_10 "completes" it. |
| `lesson_complete` (standard) | `"standard"` | marimba lead + synth-bell layer + F3/C4 pad bed, 160 ms grid, small-room reverb + shimmer send. |
| `splash_intro` (reveal) | `"splash"` | whoosh + swell ≈0.55 s → celesta+bell motif reveal, wetter reverb. |
| `exam_complete` / `level_up` (fanfare) | `"fanfare"` | low swell build-up ≈0.8 s → marimba+bell+glock (octave-up) motif, Fadd9 marimba chord bed + shimmer sparkles under the crown, 190 ms grid. |

General intensity dials: more layers (bell/glock octave doubling), longer swell
build-up, wider chord bed, and more shimmer = more ceremonial. Fewer layers,
faster grid, drier = more micro/UI. Always crescendo into the crown
(`rhythm_weights` 0.8→1.0).

## Data & API

```python
import fzsynth as fz
fz.MOTIF                      # dict: notes/intervals/rhythm/chord_bed
y = fz.render_motif("fanfare")  # deterministic (seed=100 default)
```

Reference renders + viewed spectrograms: `qa/foundation/ref_motif_{mini,standard,fanfare,splash,streak}.{wav,png}`.
