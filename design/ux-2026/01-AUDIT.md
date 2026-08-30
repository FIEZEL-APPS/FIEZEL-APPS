# FIEZEL — UX Audit (m025-202)

**Method.** The app was served locally and driven with a real Chromium at **390×844
(mobile, DPR 2)** and inspected as a seeded A2 learner (`fiezel-v4-state` with
`placementDone`, `streak:4`, `activeLevel:A2`, onboarding + tour marked complete, Puter
SDK blocked so the auth gate does not hijack the run). Every one of the 15 routes in
`VALID_VIEWS` was visited, screenshotted full-page, and measured in the DOM: visible
element count, "boxed" containers (anything ≥100×44px carrying a border, background or
shadow), control count, visible character count, paragraphs >110 chars, computed
contrast for every text node, computed font-size for every text node, and the bounding
box of every control. Harness and raw output: `design/ux-2026/evidence/`.

Findings below are ordered by severity, not by screen. Each carries the evidence that
produced it, the root cause, and the fix. Items marked **[FIXED m025-202]** are
implemented in this change; the rest are sequenced in `09-IMPLEMENTATION.md`.

---

## 0. Density baseline (measured, before this change)

Viewport is 844px tall, so "screens" = `scrollHeight / 844`.

| Screen | Scroll height | Screens | Boxed containers | Controls | Visible chars | Paragraphs >110ch |
|---|---:|---:|---:|---:|---:|---:|
| **grammar** (hub) | 4118px | **4.9** | 4 | **62** | **3180** | 3 |
| **progress** (Peta Belajar) | 3260px | **3.9** | **36** | 13 | 2027 | 9 |
| library | 2147px | 2.5 | 9 | 9 | 1625 | 10 |
| skills | 1828px | 2.2 | 11 | 4 | 1045 | 4 |
| writing | 1553px | 1.8 | 7 | 3 | 1049 | **7** |
| test | 1534px | 1.8 | 15 | 8 | 586 | 1 |
| home | 1412px | 1.7 | 12 | 13 | 597 | 0 |
| classroom | 1219px | 1.4 | 9 | 8 | 631 | 2 |
| listening | 1068px | 1.3 | 12 | 7 | 475 | 1 |
| reading | 1065px | 1.3 | 7 | 4 | 661 | 3 |
| speaking | 908px | 1.1 | 6 | 3 | 568 | 2 |
| vocab | 844px | 1.0 | 6 | 4 | 307 | 2 |
| ask | 844px | 1.0 | 2 | 2 | 170 | 1 |
| online | 844px | 1.0 | 4 | 4 | 280 | 2 |

Two screens are outliers by a wide margin and they are the two a learner reaches most
often from the bottom nav: **Grammar Hub (4.9 screens, 62 controls)** and **Peta Belajar
(3.9 screens, 36 boxed containers)**.

The learning-session screen itself is **not** in this table because it is not a route —
and that is worth stating plainly: **the quiz screen was already the healthiest surface
in the product** (one card, one question, four options, no competing panels). The
crowding this audit was asked to solve does not live in the exercise. It lives in the
hubs, the dashboards and the pre-lesson pages that surround it.

---

## P0 — Blocks comprehension

### P0-1. Screen titles are invisible for 13 hours a day **[FIXED m025-202]**

**Evidence.** Computed style of `#app .section-head h1` at 20:30 local:
`color: rgb(248, 250, 255)` on a page ground of `#FFF9EE` — **contrast 1.00:1**.
At dusk the same rule measures **1.02:1** against `#FFF6EA`. Affected titles: *Grammar
Hub*, *Vocabulary Hub*, *Ruang Reading*, *Skills Lab*, *Tes Kemampuan Dasar*, *Peta
Belajar & Lab*, *Perpustakaan* — i.e. every hub the bottom nav leads to.

**Root cause.** `features/tutor-classroom/tutor-v3.css:76` pinned
`body.scene-dusk .section-head h1, body.scene-night .section-head h1 { color:#f8faff }`.
That was correct when night darkened the page ground. **m025-115 revoked the "night sky
becomes ground" rule** (the reasoning is still in `style.css`, block *"1. Tanah halaman
ikut fase langit"*) because the material stopped darkening — but only the ground half was
revoked. The light ink was orphaned and has been sitting on a cream ground ever since.

`getCelestialState()` (`app.js`) puts `scene-dusk` at 16:00–19:00 and `scene-night` at
19:00–05:00, so the defect is live **13 of every 24 hours** — including the entire
after-school window, which is when this product is actually used.

**Why no gate caught it.** `contrast-test.js` spells `.section-head h1` as
`var(--ambient-text)` — the *daytime* token — and never reads scene-scoped overrides.
The gate was checking a value the browser never used at night.

**Fix.** The orphaned half of the rule is removed; the title falls back to
`--ambient-text` (`#241A11`) in all four phases = **16.3:1**, verified in-browser at all four phases (dawn/day/dusk/night, clock stubbed). The
`.topbar` half of the same rule is kept — `--ui-chrome-dusk` really is a light cream, so
it was never wrong. A new invariant in `contrast-test.js` closes the class of bug rather
than the instance: *no rule scoped to a phase whose ground is light may pin `color` to a
light literal.* It reads each `.scene-*` block's own `--sky-bottom`, so if a phase is
ever deliberately darkened again the gate follows the ground instead of a hardcoded list.
Verified to go red on the original CSS (1.00:1 / 1.02:1 reported) and green after.

---

## P1 — Significantly increases cognitive load

### P1-1. The exercise leads with three lines of shouting metadata **[FIXED m025-202]**

**Evidence.** On the question card, `div.eyebrow` rendered
`KEBIASAAN ATAU SEDANG BERLANGSUNG: PRESENT SIMPLE DAN PRESENT CONTINUOUS · DASAR` —
uppercase, letter-spaced, **wrapping to three lines at 390px**, directly above `h2.question`.
The learner reads a 62-character all-caps banner before reaching a 52-character question.

**Root cause — and it is not "the eyebrow is ugly".** The eyebrow prints
`friendlySkillName(q.skill) · difficultyLabel(q.difficulty)` *unconditionally*, with no
regard for whether the session contains one skill or many. In a **mixed** session
(adaptive practice, placement, level exam) it is genuinely load-bearing: each question
comes from a different skill and the learner needs to know which. In a **single-lesson**
session it repeats the title the learner read on the lesson intro screen one tap earlier.
The bug is the missing condition, not the component.

**Fix.** `quizLoop` now derives the fact rather than the session type: if every question
in the pool shares one skill, the title is not repeated on screen and only the band
(`dasar` / `menengah` / `mahir`) prints. Dynamic pools grow mid-session and are never
treated as single-skill. **Nothing is lost to assistive tech** — the full label moves to
the eyebrow's `aria-label`, so screen readers still announce it in full. Mixed sessions
are untouched, verified: a multi-skill pool still renders the full label.

Result: three lines → one word, and the question rises ~60px up the card.

### P1-2. Wrong-answer feedback spends its second paragraph restating the lesson title **[FIXED m025-202]**

**Evidence.** After a wrong tap the coach panel read:

> Ini yang bikin pilihan tadi gagal – menandai tindakannya udah selesai, padahal masih berjalan sekarang.
>
> **Pegangan singkatnya: Inget fokus kebiasaan atau sedang berlangsung: present simple dan present continuous, ya. Cek kenapa tiap jebakan beda dari jawaban benar.** Sekarang coba lagi.

The first paragraph diagnoses the actual mistake — that is the valuable sentence. The
second names the lesson the learner is currently inside, which the eyebrow above it and
the intro screen before it have both already said.

**Root cause.** `grammar.inget-fokus-ya-cek-kenapa` is not authored per-lesson content —
it is a single generic template (`'Inget fokus {focus}, ya. Cek kenapa…'`) filled with the
lesson title for **every** grammar question (`app.js`, `memory:` field). So the redundancy
is code-generated, which makes it a code fix rather than a content decision.

**Fix.** The naming half is dropped; the actionable half survives:
`'Cek kenapa tiap jebakan beda dari jawaban benar.'` Thai kept in parity. 35 words → 14,
on the screen a struggling learner reads most often.

> ⚠️ **Owner review required.** This changes student-visible copy, so
> `id-golden-snapshot-test.js` was regenerated with `--write-baseline` in the same commit,
> as that gate instructs. The baseline delta is 7 insertions / 6 deletions and contains
> exactly **one** student-facing string change (the two other entries are code fragments
> the extractor captures around the edit). Please confirm the pedagogy call before merge.

### P1-3. The assessment rubric is a wall in front of the writing task **[FIXED m025-202]**

**Evidence.** Writing measured **7 paragraphs over 110 characters** — the most of any
screen. The `Yang dinilai` card (5 criteria, each with a label and a question, plus the
IELTS/TOEFL honesty disclaimer, ~120 words) rendered open and permanent *below the
compose box*, before the learner had written a single character.

**Root cause.** Useful reference material given the same permanent visual weight as the
task itself. It is the right content at the wrong moment: a rubric is for *editing*, not
for *starting*.

**Fix.** Folded into the existing `.home-fold` disclosure — the same component Peta
Belajar already uses — so it is one 44px row with a chevron, one tap from full content.
No new disclosure component was invented for one screen. Writing dropped **1553px →
1117px (−28%)** and the compose box moved decisively above the fold.

### P1-4. Peta Belajar opens with a stack of announcements about emptiness **[PARTIALLY FIXED m025-202]**

**Evidence.** 3260px, **36 boxed containers**, 9 long paragraphs. For a new or light
learner the sequence below the fold is four consecutive full cards whose entire content
is that there is nothing yet: *Online & Teman* ("Fitur online belum aktif"), *Ulangan
Pintar* ("Belum ada materi yang perlu diulang sekarang"), *Laporan Diagnostik* ("FIEZEL
belum punya cukup bukti…"), and a *Prasasti* gallery of 8 dimmed badges. Above them, five
stat tiles reading `0%`, `0 hari`, `0 jawaban`, `0`, `0`.

**Root cause.** Every section renders at full card weight regardless of whether it has
content. The screen is laid out for the mature state and degrades badly toward the empty
one — which is exactly the state a learner is in when they most need encouragement.

**Fix (this change).** A `foldCard()` helper renders a section as a normal card when it
has content and as a 44px `.home-fold` row when it does not. Applied to *Ulangan Pintar*
and *Laporan Diagnostik*. The moment either has content it becomes a full card again on
its own. −150px, and more importantly the empty sections now read as "available later"
rather than "you have nothing".

**Deferred (Phase 2, see `09-IMPLEMENTATION.md`).** The stat tiles, the nested
`Rencana kamu` card stack, the social card (it live-refreshes its own body, so folding it
needs care) and the Prasasti gallery. These need an IA decision, not a CSS tweak.

### P1-5. Grammar Hub is a 4.9-screen wall with 62 controls

**Evidence.** 4118px, **62 controls**, 3180 visible characters, 29 lesson rows rendered
expanded. Most rows are locked (padlock node, disabled) yet each still carries its own
`Lewati materi` link, so the dominant repeated element on the screen is a secondary escape
hatch attached to content the learner cannot open.

**Root cause.** A 29-item curriculum rendered as a flat, fully-expanded list. There is
already a `Tampilan daftar` toggle, which proves the team felt the problem — but the dense
view is the default and the toggle is a 24px text link.

**Not fixed here** — this is the largest remaining P1 and it is a genuine IA decision
(where does the learner resume? how much of the path should be visible?). Specified in
`05-SCREENS.md` §Grammar Hub and sequenced as Phase 2.

**Note on a false positive.** The sweep initially flagged 29 sub-44px touch targets on
this screen (`.lesson-skip-link`, 24px tall). Reading the CSS shows an intentional
`::before` hit-area extension of 10px top and bottom → 44px effective. **This is already
correct and must not be "fixed".** The measurement was of the box, not the hit area. The
font size (11.2px) is a separate, minor issue (P3-1).

### P1-6. Home is covered by an overlay before it can be read

**Evidence.** On every load of `home`, `#fzRitual` (`.fz-ritual`, `position:fixed`,
`z-index:95`, full-viewport) renders the daily plan sheet over the screen. Behind it the
hero, the coach strip and the skill cards are all inert. The sheet's own `Mulai` and the
home content's CTAs are two competing primary paths, and the learner must dismiss
something before they can look at anything.

**Not fixed here.** The ritual sheet is a deliberate product mechanic (it is how the
adaptive plan is delivered) and removing or deferring it is an owner-level call, not a
styling fix. Options are laid out in `05-SCREENS.md` §Home.

### P1-7. Internal telemetry is printed in the Home hero

**Evidence.** The hero prints `Level A2 · salah 0/10 · terverifikasi sampai A1` above the
greeting. "salah 0/10" and "terverifikasi sampai A1" are the evidence engine's internal
bookkeeping. A learner does not have a mental model in which "verified up to A1" means
anything, and the first number they meet each day being a count of their *mistakes* is a
poor opening move.

**Not fixed here** — it is a copy and IA decision. Rewrite proposed in `07-COPY-AUDIT.md`.

### P1-8. A technical error toast greets the learner at boot

**Evidence.** With no network, the first thing rendered after splash is a toast:
**"Core Brain belum tersambung dengan benar."** (`sys.core-belum-tersambung`). "Core
Brain" is an internal subsystem name. The learner can still study — every offline path
works — so the message names a component they have never heard of to report a condition
that does not block them.

**Not fixed here** — needs a decision about which failures are worth telling a learner
about at all. Proposed rewrite in `07-COPY-AUDIT.md`.

---

## P2 — Noticeable inconsistency or inefficiency

### P2-1. Goal chips were below the touch-target floor **[FIXED m025-202]**

`.journey-goal-chip` pinned `min-height:36px`, overriding the global
`button{min-height:44px}`, and — unlike `.lesson-skip-link` — had **no** hit-area
extension to compensate. Five chips on Peta Belajar. Raised to 44px; the row already
wraps, so nothing overflows.

### P2-2. `Level belajar · A2 · Ganti` is repeated on seven screens

The same control renders on Grammar, Vocab, Reading, Skills, Writing, Test and Progress,
each time as a full-width bordered card. It is a global setting shown seven times.
Proposal in `08-COMPONENTS.md`: one home for it, plus an inline affordance where changing
level is actually plausible.

### P2-3. Nested cards (card-in-card-in-card)

Measured `maxBoxDepth = 2` on Home, Listening and Progress. Concrete instances: the
Writing hero card contains a white `Level belajar` card; the Home hero contains the
`KATA FIEZEL` coach card which itself contains a bubble; `Rencana kamu` on Progress
contains a `0/5` ring card plus a `9 soal fokus` card plus a `1 soal campur` card. See
`08-COMPONENTS.md` for the containment rules that resolve this.

### P2-4. Chip row overflows with no affordance

The Progress filter row (`Ringkasan / Analisis / Adaptive Engine / K…`) scrolls
horizontally and is cut mid-word at 390px with no gradient, arrow or peek to signal it.

---

## P3 — Polish

### P3-1. Text below the 12px floor

`design/redesign-v1/DIRECTION.md` sets a 12px floor. Measured violations:
`Ganti` at **10.6px** on 7 hub screens; `Ringkasan FIEZEL` at **10.0px** ×3 in Library;
`FIEZEL · ADAPTIVE HUMAN TUTOR` and `CHOOSE A SUBJECT` at **10.4px** in Classroom (14
sub-12px nodes on that screen); `Lewati materi` at 11.2px ×29; `Belum diukur · mulai di
sini` at 11.5px ×4 on Home. None of these were changed in this pass because each shifts
layout on a screen with other pending work; they are batched into Phase 3.

### P3-2. Untranslated interface keys in Classroom

`CHOOSE A SUBJECT` and `FIEZEL · ADAPTIVE HUMAN TUTOR` are English labels in an
Indonesian interface, on a screen the Home grid marks *Coming Soon*.

### P3-3. Mascot placement in the quiz header

At 390px the peeking Pau is clipped by the card edge to a ~30px sliver at the top-right.
It reads as a rendering artifact rather than a character. See `06-LEARNING-SESSION.md`
§Mascot for the slot rules.

---

## What is deliberately **not** a finding

Called out because a redesign brief invites over-correction, and three things here are
already right:

1. **The question card.** One card, a question, four full-width options, no decoration.
   It already satisfies the one-primary-action principle. It needed the eyebrow fixed and
   nothing else.
2. **The retry-instead-of-reveal feedback model.** Wrong answers explain the *misconception*
   and invite another attempt rather than exposing the key. That is a deliberate and good
   pedagogical choice; it should not be "simplified" into a reveal.
3. **`.lesson-skip-link`'s 24px box.** Already carries a `::before` hit-area extension to
   44px, with a comment explaining why. Correct as-is.
