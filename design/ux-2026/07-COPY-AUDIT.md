# FIEZEL — UX Copy Audit

FIEZEL's writing voice is one of its real assets — warm, casual Indonesian that talks to a
learner like a person ("Tulis dulu apa adanya. Rapihnya urusan nanti"). **This audit is not
about making the voice more formal or shorter for its own sake.** It targets three specific
failures: internal vocabulary leaking to the surface, the same fact said more than once,
and reference text placed at the moment of action.

Status: **[DONE m025-202]**, **[PHASE 2]**, **[PHASE 3]**.

---

## A. Internal vocabulary on the surface

The learner has no model for FIEZEL's subsystems. When a subsystem name reaches the
screen, the learner cannot act on it.

| Where | Now | Proposed | Why | Status |
|---|---|---|---|---|
| Boot toast (offline) | `Core Brain belum tersambung dengan benar.` | `Lagi offline — semua latihan tetap jalan. Tutor AI nyusul kalau ada jaringan.` | "Core Brain" is an internal module. Nothing is broken for the learner; every offline path works. The message reports a condition they cannot act on, in a word they have never seen. | **[PHASE 2]** |
| Home hero | `Level A2 · salah 0/10 · terverifikasi sampai A1` | `Level A2 · lanjut dari Grammar`, with the evidence detail behind the existing `detail` control | `salah 0/10` and `terverifikasi sampai A1` are evidence-engine bookkeeping. The first number a learner meets each day should not be a count of their mistakes. | **[PHASE 3]** |
| Lesson intro | `A2 · urutan 23 · A2.1 · 25 mode latihan` | `A2 · 25 soal` | `urutan 23` and `A2.1` are curriculum indices. `25 mode latihan` is an internal generator concept the learner reads as "25 questions" anyway. | **[PHASE 2]** |
| Classroom | `CHOOSE A SUBJECT`, `FIEZEL · ADAPTIVE HUMAN TUTOR` | `Pilih mata pelajaran`, remove the second | Untranslated English in an Indonesian interface, at 10.4px. | **[PHASE 3]** |

---

## B. Repetition — the same fact more than once

Reading the path *hub → lesson intro → question → feedback* in order, the lesson title
appears **four times in three taps**:

1. Grammar Hub row: `Present simple vs present continuous: kebiasaan atau sekarang`
2. Lesson intro hero + card heading: the same string, **twice on one screen**
3. Question eyebrow: the same string in uppercase, three lines
4. Wrong-answer feedback: `Inget fokus kebiasaan atau sedang berlangsung: present simple dan present continuous, ya`

| Occurrence | Action | Status |
|---|---|---|
| 4 — feedback | Dropped. Cue is now `Cek kenapa tiap jebakan beda dari jawaban benar.` (35 words → 14) | **[DONE m025-202]** |
| 3 — eyebrow | Suppressed in single-skill sessions; band only; full text kept in `aria-label` | **[DONE m025-202]** |
| 2 — intro duplicate | Title once per screen | **[PHASE 2]** |
| 1 — hub row | Keep. This is where the learner chooses; it earns its place. | — |

Other repetitions:

| Where | Now | Proposed | Status |
|---|---|---|---|
| Peta Belajar, skill rows | `0 materi A2 sudah punya bukti belajar` **×3** (Kosakata, Grammar, Reading) | One line under the group: `Belum ada bukti belajar di level A2.` | **[PHASE 2]** |
| 7 hub screens | `Level belajar · A2 · Ganti` as a full card on each | One home in Settings + one contextual affordance (`08-COMPONENTS.md`) | **[PHASE 2]** |

---

## C. Reference text at the moment of action

| Where | Now | Proposed | Status |
|---|---|---|---|
| Writing | `Yang dinilai` — 5 criteria + IELTS honesty disclaimer, ~120 words, permanently open below the compose box | Folded into `.home-fold`. Text unchanged — only its moment changed. | **[DONE m025-202]** |
| Grammar Hub | `Soal pilihan boleh bervariasi, tetapi urutan lesson mengikuti kurikulum dan prasyarat.` (11.1px, always visible) | Move into the level control's disclosure | **[PHASE 2]** |
| Lesson intro | 45-word rule explanation + 30-word `25 mode latihan terfokus` paragraph before the CTA | Fold both under `Pelajari dulu`; keep the `CONTOH` example visible — it is the highest-value element | **[PHASE 2]** |
| Notification gate | 2 paragraphs + a status line + a help line before two buttons | The gate already says *"Belajar tetap bisa dimulai tanpa ini"* — which argues for showing it after the first exercise, not before | **[PHASE 2]** |

---

## D. What must not change

Recorded so a future pass does not "tidy" them away:

1. **The coach voice.** `Rara, Pagi, Rara. Otak lagi paling murah dipakai jam segini.`
   is doing real motivational work in a register the learner recognises. Not corporate,
   not formal — and it should stay that way.
2. **The honesty disclaimer.** `FIEZEL tidak memprediksi skor IELTS atau TOEFL. Rubrik ini
   alat latihan dan umpan balik; band resmi hanya keluar dari ujian resmi.` This is an
   integrity statement, not clutter. It was **folded, not shortened, and not removed**.
3. **The Prasasti honesty line.** `Prasasti hanya terukir dari hal yang benar-benar kamu
   kerjakan — tidak dijual, tidak bisa dipalsukan.` Keep verbatim.
4. **`Belajar tetap bisa dimulai tanpa ini.`** on the notification gate — it lowers the
   stakes of declining, which is exactly right.
5. **Misconception-naming feedback.** `Ini yang bikin pilihan tadi gagal – menandai
   tindakannya udah selesai, padahal masih berjalan sekarang.` This is the single most
   valuable sentence in the product. It is per-item authored content and must not be
   genericised.

---

## E. Process note — the golden baseline

`id-golden-snapshot-test.js` freezes the set of Indonesian strings a student can see and
goes red when any of them changes. That is the correct guard and it worked: the one copy
change in m025-202 (B4, the feedback cue) turned it red, and the baseline was regenerated
with `--write-baseline` in the same commit as the gate instructs.

**Any Phase 2/3 copy change above will do the same.** The gate's own wording asks that such
changes be *deliberate and reviewed* — so each batch should be a separate, reviewable
commit, and the Thai side (`copy-th-*`) must move with it to keep `th-coverage-test.js`
green.
