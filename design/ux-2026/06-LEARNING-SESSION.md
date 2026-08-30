# FIEZEL — Canonical Learning Session Specification

The exercise is the product. Every mode — Grammar, Vocabulary, Reading, Listening,
Speaking, Writing, Placement — shares this interaction contract. Modes differ in their
*mechanic*; they do not differ in their *shape*.

**Starting point:** the question card was already the healthiest surface in FIEZEL. This
spec mostly writes down what it already does right, and fixes the one thing it did wrong.

---

## 1. Anatomy

```
┌──────────────────────────────────────────┐
│  ✕ Keluar        3 / 25         Lanjut → │   session chrome
├──────────────────────────────────────────┤
│                                    (Pau) │   mascot slot
│  DASAR                                   │   band — one line, max
│                                          │
│  Look! The chef ___ a new dish right     │   the question — dominant
│  now — you can smell it.                 │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ has prepared                       │  │   options — full width, ≥52px
│  ├────────────────────────────────────┤  │
│  │ prepare                            │  │
│  ├────────────────────────────────────┤  │
│  │ is preparing                       │  │
│  ├────────────────────────────────────┤  │
│  │ prepares                           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ feedback — hidden until answered ]    │
│  [ tutor turn — hidden until escalated ] │
└──────────────────────────────────────────┘
```

**Exactly one card.** No surrounding panels, no sibling notes, no persistent instruction
strip. Anything that is not question, options or feedback does not belong on this screen.

---

## 2. The context line (eyebrow)

The rule that P1-1 established:

> **Context is printed only when it varies.**

| Session | Pool | Eyebrow shows | `aria-label` |
|---|---|---|---|
| Single-lesson (grammar, grammar-skip) | one skill | band only — `DASAR` | full `skill · band` |
| Mixed (adaptive, placement, level exam) | many skills | `skill · band` | — (text is complete) |
| Dynamic pool | grows mid-session | `skill · band` | — |

Determined from the **data**, not the session type: if every question in the pool shares
one skill, the title is not repeated. Dynamic pools are never treated as single-skill
because they can gain a second skill after the first render.

**Constraints.** One line. 12px. Never wraps to two. Never above `--fs-caption`. The full
label always remains available to assistive technology.

---

## 3. Session chrome

- **Exit** (`✕ Keluar`) — left. Confirms before discarding progress.
- **Progress** (`3 / 25` + bar) — centre. The only always-visible metric.
- **Next** (`Lanjut →`) — right. **Disabled until the question is resolved**, with a lock
  icon rather than reduced opacity, so its state is readable and not just dim.

No other chrome. No level control, no settings, no share, no streak counter.

---

## 4. Answering

- Options are full-width, ≥52px, `--radius-md`, one per row.
- Tap → immediate visual commitment on the chosen option.
- Confidence prompt (where enabled) is a popup, not an inline block, so it does not push
  the question off screen.
- **MEASURE mode** (`cfg.noHints`: placement, skip-level exam, unlock gate) suppresses
  verdicts, keys and explanations per question — they move to the results screen. This is
  correct and must be preserved: revealing per-question in a measurement leaks the key
  into the retry.

---

## 5. Feedback

### Correct
Green mark, one short affirmation, `Lanjut` becomes primary. Nothing else appears. The
learner is in flow; do not interrupt it with a lesson.

### Incorrect
```
┌─ FIEZEL ───────────────────────────────┐
│ Ini yang bikin pilihan tadi gagal –     │   Layer 1: names the misconception
│ menandai tindakannya udah selesai,      │   1 sentence, always shown
│ padahal masih berjalan sekarang.        │
│                                         │
│ Pegangan singkatnya: Cek kenapa tiap    │   Layer 1b: one actionable line
│ jebakan beda dari jawaban benar.        │
│ Sekarang coba lagi.                     │
│                                         │
│ [ Aku masih belum paham ]               │   Layer 2: opt-in escalation
└─────────────────────────────────────────┘
```

**The key is not revealed.** FIEZEL diagnoses the misconception and invites another
attempt. This is a deliberate pedagogical choice and it is a good one — it must not be
"simplified" into showing the answer.

**Layer 1 says what went wrong. It does not restate what the lesson is about.** That
restatement was P1-2 and is removed: the learner is inside the lesson; the eyebrow and the
intro screen have already said its name. 35 words → 14.

### Escalation
`Aku masih belum paham` → the tutor turn (`#tutorTurn`, rendered **below** feedback so a
stale turn cannot stack above the current explanation) → and beyond that the reteach card.
Layer 3 is reachable and never forced.

### Comparison
`Bandingkan pilihan lain` is a `<details class="acc">` — already correct, already the
disclosure pattern. It stays folded by default.

---

## 6. Mascot (Pau)

Pau is part of the interaction language, not decoration. But **the question is always the
primary object**.

**Rules.**
1. Pau occupies a **defined slot** (`FiezelPawSlot.plan()`), never a free-floating overlay
   above interactive content.
2. Pau **never covers** an option, the feedback panel, or a CTA. The existing
   `fz-stage-*` body flags exist precisely to suppress the floating bubble on screens with
   controls near the bottom — that mechanism is correct and should be extended, not
   bypassed.
3. Reactions map to **real states**: `correct`, `encouraging`, `hinting`, `listening`,
   `celebrating`, `thinking`. No idle animation during reading or composing.
4. **[PHASE 3]** At 390px the peek pose is clipped by the card edge to a ~30px sliver. The
   slot needs a minimum visible height or the peek should be suppressed at that width —
   a partially cropped character reads as a bug, not a personality.

---

## 7. Completion

Answer, in order: **what you did · what you learned · what is next.**

One primary (`Lanjut ke lesson berikutnya`). The per-item review — required in MEASURE
mode, where it is the only place explanations appear — is a `<details>`, folded by default.

---

## 8. Mode variations

Only where the mechanic genuinely differs:

| Mode | Difference |
|---|---|
| **Reading** | Passage above the question, in its own scroll container. |
| **Listening** | Play control above the stem (`quiz-listen-hero`), in the hear→question→answer order. Subtitles suppressed where the point is comprehension. |
| **Speaking** | Record replaces the option list; feedback compares to a target. |
| **Writing** | Compose box replaces options; rubric is folded (m025-202); feedback is criterion-based. |
| **Vocabulary** | The word leads (`q.focus`) instead of a stem. |

Everything else — chrome, progress, feedback layering, mascot rules, disclosure component
— is identical across all modes. That sameness is what makes it one product.

---

## 9. Acceptance

A session screen is correct when:

- [ ] Exactly one card holds the exercise.
- [ ] The context line is one line, or absent.
- [ ] The question is the largest text on screen.
- [ ] Every option is ≥52px and full width.
- [ ] Exactly one control looks primary at any moment.
- [ ] Feedback appears in place, below the options, without scrolling the question away.
- [ ] The first feedback sentence diagnoses; it does not restate the topic.
- [ ] Deeper explanation is reachable in one tap and required in zero.
- [ ] Pau is fully visible or fully absent — never clipped.
- [ ] Nothing repeats a fact already established earlier in the same flow.
