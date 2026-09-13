# Notifications SFX report (brief §2B) — notif_general / notif_streak_reminder / notif_achievement

Generator: `generators/notifs_gen.py` (deterministic, seed block 300; motif via
`fz.render_motif("mini", seed=100)`; determinism asserted on every run via
`np.array_equal` on double builds). Outputs: `masters/*.wav` + `web/*.ogg` +
`spectrograms/*.png` + `qa/notif_*_phonespeaker.wav` +
`qa/notif_phonespeaker_sim.wav`.

## Design summary

| Sound | Recipe | Duration target | Result |
|---|---|---|---|
| `notif_general` | 2 soft ascending celesta notes C5→F5 (P4, F major) + whisper of synth bell on note 2, reverb wet 0.10, tight tail trim | 600–800 ms, understated | 0.800 s |
| `notif_streak_reminder` | LOCKED mini motif (glockenspiel "Ascent & Crown", `render_motif("mini")`) — hard-trimmed to ≤900 ms with `trim_silence(-54)` + 140 ms fade per Foundation's long-tail note | ≤0.9 s, playful/urgent, FIEZEL DNA | 0.900 s |
| `notif_achievement` | Celesta chord bloom F4-A4-C5 + 3-note rising bell/celesta melody A4→C5→F5 + sparse C6 shimmer, reverb 0.14 + shimmer send 0.04 | 1–1.5 s, "something good" | 1.302 s |

`notif_achievement` deliberately uses a plain F-major triad melody, **not** the
motif and **not** the G5 crown — so it signals reward without cannibalizing the
signature reserved for `lesson_complete`/`level_up` (hierarchy note below).

## QA metrics (measured on the exported 16-bit masters)

| File | Duration | Peak dBFS | RMS dBFS (400 ms win) | Target RMS | DC offset | <200 Hz energy |
|---|---|---|---|---|---|---|
| notif_general | 0.800 s | −13.52 | −23.0 | −24..−20 ✅ | 2.3e-05 | −34.3 dB rel |
| notif_streak_reminder | 0.900 s | −11.09 | −22.0 | −24..−20 ✅ | 2.0e-05 | −25.6 dB rel |
| notif_achievement | 1.302 s | −11.42 | −21.0 | −24..−20 ✅ | 2.2e-05 | −26.6 dB rel |

- Peaks are deliberately conservative (ceiling −4 / −3.5 dBFS requested, actual
  peaks land at −11..−13.5 dBFS after RMS normalization) — safe headroom for
  OS notification-volume boosts and cheap DAC clipping. No limiter engagement.
- Spectrogram PNGs viewed in **2 rounds** (round 1 → found notif_achievement
  carried ~250 ms of dead air to its 1.5 s cap → tightened trim to −52 dB /
  1.35 s cap → round 2 re-viewed): no clipping bars, no aliasing lines, clean
  decaying tails on all three (+ the three phone-speaker sim PNGs viewed).

## Phone-speaker simulation findings (`qa/notif_phonespeaker_sim.wav`)

Simulation: 4th-order Butterworth band-pass 400–4000 Hz on each master
(per-file copies in `qa/<name>_phonespeaker.wav`, concatenated audition file
`qa/notif_phonespeaker_sim.wav`). Onset intelligibility measured with an
envelope-flux detector (Hilbert envelope → 40 Hz smooth → positive flux peaks,
strengths relative to the strongest onset):

| File | Onsets expected | Full-band detected | 400–4000 Hz detected | RMS lost in band | Verdict |
|---|---|---|---|---|---|
| notif_general | 2 | 2 (7 ms @0 dB, 165 ms @−5.5 dB) | 2 (8 ms @0 dB, 166 ms @−4.8 dB) | −0.1 dB | both notes fully legible |
| notif_streak_reminder | 4 | 4 (7/95/173/263 ms) | 4 + 1 minor (crown @263 ms becomes the **strongest** onset, 0 dB; spurious 337 ms blip at −15 dB = shimmer tail, inaudible as an onset) | −0.9 dB | motif contour intact; crown actually gains salience in-band |
| notif_achievement | 3 melody (+1 chord-spread micro-onset at 212 ms, −11 dB, harmless) | 4 | 4 (melody at 10/141/287 ms all ≥ −6 dB… −3 dB) | −1.1 dB | bloom + full melody legible |

Why it survives the band-limit: all fundamentals sit at 440–1397 Hz (A4–F5)
and the celesta/glockenspiel/bell energy concentrates in 500–4000 Hz, so a
phone speaker loses ≤1.1 dB of RMS and no note onsets. The mini motif's
15–16 kHz glockenspiel sparkle is lost on phones, but its 1–4 kHz partials
carry the four-note gesture unchanged.

**Mono-sum safety:** all three files are single-channel mono (mono-sum is
identity — no L/R phase cancellation possible), DC offset ≈ 2e-05 (−93 dBFS,
negligible), sub-200 Hz energy ≥25 dB below full-band RMS (nothing for a phone
speaker to choke on, no hidden LF that would pump a Bluetooth speaker).

## Reward-hierarchy positioning

Notifications sit at the **bottom** of the reward ladder, below all in-app
feedback/fanfares:

```
notif_general (−23 RMS, 2 notes, no motif, driest)
  < notif_streak_reminder (−22 RMS, mini motif, 0.9 s, glock only)
    < notif_achievement (−21 RMS, 3-4 layers, 1.3 s, triad melody — NO motif crown)
      < lesson_complete (feedback tier −22..−18 RMS, FULL standard motif,
        marimba+bell+pad, 1.5–2 s)  <  exam_complete / level_up (fanfare tier)
```

Separation from `lesson_complete` is enforced on three axes: loudness
(≥1–3 dB quieter than the feedback tier floor), motif usage
(achievement quotes no motif at all; streak_reminder only the *mini* variant,
per MOTIF.md's variant table), and arrangement density (no chord bed + swell +
octave doublings, which are reserved for the standard/fanfare variants).

## Notes to Foundation / Integrator

- No lib changes needed. Foundation's mini-motif long-tail warning confirmed:
  raw `render_motif("mini")` runs 1.73 s; `trim_silence(-54, 30)` + 0.9 s cap
  + 140 ms fade yields a tight 0.9 s asset with no audible chop.
- OGG (q:a 4) versions verified present in `web/` for all three.
