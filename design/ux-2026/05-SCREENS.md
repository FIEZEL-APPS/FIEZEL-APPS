# FIEZEL — Screen-by-Screen Redesign Plan

Each entry uses the brief's BEFORE / WHY / AFTER / IMPACT frame. Status is one of
**[DONE m025-202]**, **[PHASE 2]**, **[PHASE 3]**.

---

## Home — 1412px · 12 boxed · 13 controls

**BEFORE.** A full-viewport overlay (`#fzRitual`, z-index 95) covers the screen on every
load with the daily plan and its own `Mulai` / `Nanti dulu` pair. Behind it: a hero
printing `Level A2 · salah 0/10 · terverifikasi sampai A1 · detail`, a greeting, a
`KATA FIEZEL` coach card nested inside the hero, two skill cards reading `Belum diukur ·
mulai di sini` at 11.5px, then a `Pilih fokus hari ini` grid of four launch cards.

**WHY.** Two systems both try to answer "what now?" — the ritual sheet and the launch
grid — so neither wins, and the learner must dismiss one before reading the other. The
hero leads with internal bookkeeping (`salah 0/10`) instead of an action.

**AFTER.**
1. **[PHASE 2]** The ritual becomes the Home hero itself rather than an overlay: the plan
   renders inline as the single primary CTA (`Mulai · 10 soal, ±10 menit`). Nothing is
   removed — the same plan, the same copy, one less layer and one less dismissal. Keep
   the overlay only for its genuine first-run moment.
2. **[PHASE 3]** Hero copy: `Level A2 · salah 0/10 · terverifikasi sampai A1` →
   `Level A2 · lanjut dari Grammar` with the diagnostic detail behind `detail`
   (see `07-COPY-AUDIT.md`).
3. **[PHASE 3]** Skill-card meta to `--fs-caption` (12px floor).
4. **[PHASE 2]** Un-nest the coach card from the hero (containment depth 1).

**IMPACT.** One primary action visible at cold open; zero dismissals before the learner
can act.

---

## Grammar Hub — 4118px · 4.9 screens · 62 controls  **[PHASE 2 — largest remaining P1]**

**BEFORE.** All 29 lessons of the A2 path render expanded in one `<ol class="lesson-path">`.
Most are locked; each still carries a `Lewati materi` link, making that link the most
repeated control on the screen. Above them: a level control card, a `Jalur A2` note with a
three-line caveat, and a `Ujian Skip Level` chip.

**WHY.** A 29-item curriculum rendered as a catalogue instead of a position. The existing
`Tampilan daftar` toggle shows the problem was felt, but the dense view is the default and
the toggle is an 11px text link.

**AFTER.**
1. Open at **resume position**: the current lesson as a full card with the primary CTA,
   the next 2–3 upcoming lessons as compact rows.
2. Completed lessons collapse into one `.home-fold` row — `Selesai (6)`.
3. Locked lessons collapse into one `.home-fold` row — `Terkunci (17)`, opening to the
   full list with the unlock condition per row. `Lewati materi` lives inside that fold,
   where it is a deliberate choice rather than ambient noise.
4. `Jalur A2` caveat moves into the level control's own disclosure.

**IMPACT.** ~4.9 screens → ~1.5. Controls 62 → ~12. The learner's position becomes the
first thing on the screen instead of item 1 of 29.

**Risk.** Highest of any item here — touches `lesson-path` markup covered by
`grammar-unlock-test.js`, `prerequisite-graph-test.js` and `lesson-experience-test.js`.
Must be done as its own change with its own test pass.

---

## Grammar lesson intro — the "pre-lesson documentation page"  **[PHASE 2]**

**BEFORE.** Hero title in Instrument Serif; `A2 · urutan 23 · A2.1 · 25 mode latihan`; the
level control card; a `PAHAMI DULU · URUTAN 23` eyebrow; **the same title again** as an
h2; `Ini lesson fondasi pertama.`; a 45-word explanation; a nested `CONTOH` card; another
paragraph; a `25 mode latihan terfokus` card with its own 30-word paragraph; then
`Mulai 25 soal`; then `Kembali ke Grammar Hub`.

**WHY.** The brief's §11 case exactly. The title appears twice, the sequence number three
times, and the learner reads ~110 words before the button that starts the practice.

**AFTER.** Title once. One sentence of what this lesson is about. The `CONTOH` example
(it is the highest-value element — it shows rather than tells). `Mulai 25 soal` as the
single primary. The rule explanation and the practice-mode description fold into
`Pelajari dulu` — available, not mandatory. Back is the topbar's job.

**IMPACT.** ~110 words → ~25 before the primary action.

---

## Learning session (quiz) — the core surface  **[DONE m025-202]**

**BEFORE.** `div.eyebrow` printed the full lesson title in uppercase, wrapping to **three
lines** above the question. Wrong-answer feedback restated the same title in its second
paragraph.

**WHY.** The eyebrow rendered unconditionally regardless of whether the session was
single-skill or mixed; the coach cue was a generic template filled with the lesson title
for every question.

**AFTER.** Session-aware eyebrow: single-skill sessions print only the band (`dasar`) and
carry the full label in `aria-label`; mixed sessions are unchanged. Coach cue drops the
naming half. Full spec: `06-LEARNING-SESSION.md`.

**IMPACT.** Three lines → one word above the question; feedback 35 words → 14. Verified
in-browser on both single-skill and mixed pools.

---

## Writing — 1553px → **1117px** · 7 long paragraphs  **[DONE m025-202]**

**BEFORE.** Hero card containing a nested white `Level belajar` card; mascot floating
between cards; the task card; then a permanent `Yang dinilai` card — 5 criteria plus the
IELTS honesty disclaimer, ~120 words — below the compose box.

**WHY.** Reference material given the same permanent weight as the task. A rubric is for
editing, not for starting.

**AFTER.** Rubric folded into `.home-fold` (`Yang dinilai ⌄`), one 44px row, one tap from
full content. **[PHASE 3]** remaining: un-nest the `Level belajar` card from the hero;
give the mascot a defined slot rather than floating it between cards.

**IMPACT.** −28% height; the compose box moves decisively above the fold.

---

## Peta Belajar (progress) — 3260px → **3110px** · 36 boxed  **[PARTIAL m025-202]**

**BEFORE.** Five stat tiles reading `0%`, `0 hari`, `0 jawaban`, `0`, `0`; an overflowing
chip row cut mid-word; a `Rencana kamu` card containing three nested cards; then four
consecutive cards each announcing that a section is empty; then 8 dimmed Prasasti badges.

**WHY.** Every section renders at full card weight regardless of content. Laid out for the
mature state, degrading badly toward the empty one — the state a learner is in exactly
when they most need encouragement.

**AFTER.**
1. **[DONE]** `foldCard()` — *Ulangan Pintar* and *Laporan Diagnostik* fold to 44px rows
   when empty and become full cards automatically when they have content.
2. **[PHASE 2]** Stat tiles: for a learner with no data, one line ("Belum ada data —
   selesaikan satu sesi") replaces five zeros. With data, the tiles return.
3. **[PHASE 2]** Un-nest `Rencana kamu` (depth 2 → 1).
4. **[PHASE 2]** The social card needs care — it live-refreshes its own body via
   `refreshSocialSummaryCard`, so folding it must preserve that contract.
5. **[PHASE 3]** Chip row: scroll affordance (edge fade + peek).
6. **[PHASE 2]** Give `test` (placement) a permanent entry here — it currently has none.

**IMPACT (target).** ~3.9 screens → ~2.0, and a new learner's first view of their own
progress stops being a list of things they have not earned.

---

## Library — 2147px · **10 long paragraphs**  **[PHASE 3]**

**BEFORE.** Nine book cards, each with title, meta, and a full synopsis paragraph, plus a
`Ringkasan FIEZEL` label at **10.0px**.

**WHY.** A browse screen where every item is fully expanded is a reading task, not a
browse task.

**AFTER.** Synopsis clamps to two lines with the full text on the book's own screen.
`Ringkasan FIEZEL` to 12px. Nine paragraphs → nine scannable cards.

---

## Skills Lab — 1828px  **[PHASE 3]**

**BEFORE.** Four long paragraphs; eight sub-12px text nodes; `FIEZEL SKILLS LAB` eyebrow
at 11.2px.

**AFTER.** One sentence per skill; the format explanation folds; type to the 12px floor.

---

## Classroom — 14 sub-12px nodes, English labels  **[PHASE 3]**

`CHOOSE A SUBJECT` and `FIEZEL · ADAPTIVE HUMAN TUTOR` are untranslated English in an
Indonesian interface at 10.4px, on a screen Home marks *Coming Soon*. Translate and raise
to the floor.

---

## Listening / Speaking / Reading / Vocab / Test  **[PHASE 3]**

Healthy screens. Only the shared fixes apply: the `Level belajar · Ganti` repetition
(`08-COMPONENTS.md`), the 12px floor, and containment depth on Listening (measured 2).

---

## Boot / first-run  **[PHASE 2]**

**BEFORE.** Splash → onboarding (6 steps) → guided tour → notification gate → auth gate →
Home → ritual overlay. Six interruptions, four of them dismissible dialogs, before the
learner sees the product. Offline, a toast also announces
`Core Brain belum tersambung dengan benar.`

**WHY.** Each gate was added for a good local reason; nobody counted the sequence.

**AFTER.** Audit the chain as one flow and decide which gates can be deferred until after
the first exercise. The notification gate in particular already says *"Belajar tetap bisa
dimulai tanpa ini"* — which is an argument for showing it later, not first. Boot toast:
see `07-COPY-AUDIT.md`.
