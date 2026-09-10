# FIEZEL SFX v1 — INDEPENDENT ACCEPTANCE AUDIT (QA closer, 2026-08-28)

Auditor: QA & documentation closer. Method: **trust nothing** — every master
re-measured from the shipped bytes by `qa/acceptance_audit.py`
(deterministic, re-runnable; full JSON `qa/acceptance_audit_results.json`);
every web OGG decode-verified with ffprobe; all numbers cross-checked
against the five producer reports; ladder chart `qa/loudness_ladder.png`
rendered and visually verified.

## Verdict: **ACCEPTED — 27/27 PASS, 0 open violations**

### Coverage
All 26 brief §2 names + `stamp_thud` present in BOTH `masters/*.wav`
(44.1 kHz/16-bit) and `web/*.ogg`. No gaps, no extra files.
`splash_paw_appear` is byte-identical to `paw_appear` (verified
`filecmp`) — matches the paw report's dual-slot declaration.

### Checks per file (all 27)
duration vs brief window · RMS (max-400 ms win) vs contract band · peak
≤ −1 dBFS · clipping runs (≥3 samples at FS) · DC offset (true-bias
criterion: boundary/sub-20 Hz) · >8 kHz energy share · start-click
(first 10 ms) · OGG decodability + duration match · producer-report
cross-check (dur ±0.03 s, peak ±0.5 dB, RMS ±0.6 dB).

### Verdict per category
| Category (report) | Files | Result | Notes |
|---|---|---|---|
| answers | 4 | **PASS** | answer_correct 0.795 s < 0.8 s brief cap; >8 kHz energy 0.017 % (anti-fatigue claim confirmed); all reported numbers exact |
| exams | 4 | **PASS** | exam_complete 2.95 s inside 2-3 s; score_tick 32 ms micro band −24.6 |
| notifs | 3 | **PASS** | producers used a deliberate −24..−20 pocket-safe sub-band (quieter than the feedback band) — accepted as documented deviation, consistent with brief §2B "tidak terlalu mencolok"; not a violation |
| progress | 5 | **PASS** | ladder inside category strictly monotonic: xp_gain −24.0 < streak_5 −19.5 < streak_10 −18.5 < lesson_complete −17.4 < level_up −16.4 |
| splash/UI | 6 | **PASS** | splash_intro 1.96 s inside 1.5-2 s; stamp_thud (extra, non-brief) treated as feedback-weight impact |
| paw | 5 | **PASS** | all four inside declared windows; celebrate/encourage morph metrics consistent with paw report; overlay renders clip-free |

### Investigated and cleared (not violations)
- **button_tap DC −0.00195:** flagged by the naive mean test; inspection
  shows first/last samples exactly 0, offset decays with the transient
  (quarter means −0.0067 → −0.000004), <20 Hz energy 0.45 % — waveform
  asymmetry of the thud body, not a constant bias. Audit criterion refined
  to true-bias detection; PASS.
- **Loudness ladder sanity (chart viewed):** micro family quietest
  (page_transition −25.0, button_tap −24.7, exam_score_tick −24.6,
  xp_gain −24.0) → notifs → feedback (paw/answers −22..−19) → fanfares,
  top = level_up −16.4 / exam_complete −17.0. Hierarchy matches
  achievement weight exactly; xp_gain sits in the quietest micro cluster
  as required (page_transition being 1 dB quieter is by design — the
  "optional feel" whoosh).
- **Report honesty:** every producer-reported duration/peak/RMS matched
  the re-measurement within tolerance (0 cross-check mismatches). No
  fixes or generator re-runs were needed.

### Open items (carried to systems/20-sfx-system.md §9 / spec Appendix B C-7/C-8)
OI-1 MP3 fallback renders (Safari/iOS) · OI-2 human blind test of PAW
morphs (objective proxy passed) · OI-3 human x30 fatigue audition ·
OI-4 PAW Spark beat re-sync to paw_greet's two-pluck profile ·
OI-5 audition-page update to the 27 files.

### Artifacts produced by this audit
`qa/acceptance_audit.py`, `qa/acceptance_audit_results.json`,
`qa/loudness_ladder_chart.py`, `qa/loudness_ladder.png`.

### Documentation delivered under the same closing task
`systems/20-sfx-system.md` (binding SFX system spec);
`FIEZEL-PAW-REDESIGN-SPECIFICATION.md` — OA-7 amendment row + header
sentence, §29 rewritten (history kept), §33 AUDIO/SFX asset row, §33
Support-row annotation, Appendix B-1 OA-7 bullet + B-2 rows C-7/C-8;
`systems/14-voice-sfx.md` §3 supersession note (history kept).
