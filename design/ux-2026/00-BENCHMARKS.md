# FIEZEL — Benchmark Analysis

Per the brief: **extract principles, do not copy execution.** Each entry names what the
product does well, what FIEZEL can learn, what FIEZEL should *not* take, and what the
FIEZEL-native interpretation is.

A note on method, stated plainly: this is a **principle-based analysis drawn from
established interaction-design practice and the patterns these products are widely known
for.** It is not a fresh competitive teardown with screenshots, and it carries no cited
sources — where a claim would need one, it is written as a design argument that stands or
falls on its own reasoning, not as an appeal to authority.

---

## Duolingo

**Does well.** Ruthless single-task framing — the exercise screen holds a prompt, an input,
and one button. Session state (progress, hearts, exit) lives in a thin chrome bar and never
competes. The learner is never asked to choose while inside a lesson.

**FIEZEL learns.** The chrome/content split. FIEZEL's quiz already does this — `Keluar`,
`n/25`, `Lanjut` in a bar, everything else in one card. **Keep it and defend it**; the
pressure to add "just one more" affordance to that screen should be refused.

**Do not copy.** The mascot's guilt-driven retention loop, the streak-loss anxiety framing,
the gem/heart economy as a gate on learning. FIEZEL's Prasasti explicitly says *"tidak
dijual, tidak bisa dipalsukan"* — that is a deliberately different value position and it is
the better one.

**FIEZEL's version.** Pau reacts to *learning states* (hinting, encouraging, celebrating),
not to *loss*. Encouragement is tied to what the learner did, never to what they will lose.

---

## Khan Academy

**Does well.** Explanation is layered — a hint, then a step, then a full worked solution.
The learner controls how much scaffolding they take, and taking more is never framed as
failure.

**FIEZEL learns.** This is the strongest available match for FIEZEL's existing feedback
chain: misconception line → `Aku masih belum paham` → tutor turn → reteach card. That
chain is already right; the audit's fix (P1-2) was simply to stop the *first* layer from
padding itself with a restatement.

**Do not copy.** The dense course-tree dashboard. Khan's mastery grid works for a
multi-year curriculum browsed on a laptop; it is close to what makes FIEZEL's Grammar Hub
4.9 screens long on a phone.

**FIEZEL's version.** Layer 1 diagnoses in one sentence. Layers 2 and 3 exist and are
always one tap away, never automatic.

---

## Brilliant

**Does well.** One idea per screen, with generous whitespace and almost no chrome. Progress
is felt through movement, not through a stat panel. Interaction *is* the explanation.

**FIEZEL learns.** Directly applicable to the lesson intro page (§05-SCREENS): FIEZEL
currently explains a rule in ~110 words *before* the practice that would teach it better.
The `CONTOH` example block is the highest-value element on that screen precisely because it
shows rather than tells — which is why the plan keeps it visible and folds the prose.

**Do not copy.** The near-total absence of navigation. FIEZEL learners need to get to
Vocabulary or the Library directly; a purely linear spine would remove that.

**FIEZEL's version.** Lesson intro: one sentence, one example, one button.

---

## Quizlet

**Does well.** Instant start — the content is the interface, and a set is practisable
within a tap of opening it. Study modes are switchable without leaving the material.

**FIEZEL learns.** Time-to-first-question is the metric that matters. FIEZEL's is currently
3–4 taps (nav → hub → lesson intro → start), and on Home a full-screen ritual overlay must
be dismissed before anything else. That is the argument behind IA rule **R2** (the exercise
is at most two taps from cold open) and Phase 2a.

**Do not copy.** The undifferentiated wall of study-mode buttons — five equally weighted
CTAs is the exact anti-pattern §18 of the brief warns about.

**FIEZEL's version.** Home's primary CTA resumes the current lesson. Other modes exist as
secondary, visually quieter paths.

---

## Memrise

**Does well.** Short sessions with a clear, honest end. The learner always knows how much
is left and what finishing means.

**FIEZEL learns.** FIEZEL already does this well — `1/25` plus a progress bar, and the
plan sheet states `10 soal, kira-kira 10 menit`. **Keep the time estimate**; it is one of
the most respectful things in the interface and it should survive the Home rework in
Phase 2a rather than being dropped as "extra text".

**Do not copy.** The user-generated video overlays and the visual density that comes with
mixed-provenance content.

---

## Busuu / Babbel

**Does well.** Adult-appropriate register. No infantilising, no cartoon rewards; content is
framed around real situations the learner will actually be in.

**FIEZEL learns.** FIEZEL's voice is already its own thing — casual Indonesian that reads
like a person ("Tulis dulu apa adanya. Rapihnya urusan nanti"). It is warmer than Babbel
and less childish than Duolingo, and that middle position is genuinely FIEZEL's. The copy
audit protects it explicitly (§07-COPY-AUDIT D1): the target is removing *internal
vocabulary* and *repetition*, never the personality.

**Do not copy.** The subscription-gate interstitials woven through the lesson flow.

---

## What the benchmarks agree on

Four things every one of these products does that FIEZEL's *surrounding* screens do not:

1. **One primary action per screen**, always visually unambiguous.
2. **Curricula are entered at a position, never rendered as a catalogue.** No competent
   mobile learning product shows 29 items expanded at once. This is FIEZEL's single
   largest remaining P1.
3. **Explanation is layered and opt-in**, never front-loaded.
4. **Empty states are designed**, not announced. None of them opens a progress screen with
   four consecutive cards explaining that nothing has happened yet.

## What FIEZEL already does better than all of them

Worth stating, because a redesign brief creates pressure to change things that are working:

- **Misconception-level feedback.** `Ini yang bikin pilihan tadi gagal – menandai
  tindakannya udah selesai, padahal masih berjalan sekarang.` names *why the learner's
  specific wrong choice was tempting*. Most of these products would have shown a green tick
  on the right answer and moved on.
- **Retry instead of reveal.** Withholding the key and inviting another attempt is
  pedagogically stronger than the industry default.
- **Honesty about measurement.** `FIEZEL tidak memprediksi skor IELTS atau TOEFL` and
  `Prasasti … tidak dijual, tidak bisa dipalsukan` are integrity commitments most
  competitors do not make.

**These are the parts of FIEZEL worth protecting while the interface around them gets
quieter.** The goal is a calmer FIEZEL, not a more conventional one.
