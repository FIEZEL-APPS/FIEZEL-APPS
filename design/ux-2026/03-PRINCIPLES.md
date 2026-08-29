# FIEZEL — UX Principles

Six principles. Each is falsifiable: it can be pointed at a screen and settle an argument.
They are written to be *used in review*, not framed on a wall.

---

### 1. Simple surface, intelligent underneath

FIEZEL runs an adaptive engine, a misconception taxonomy, a spaced-repetition scheduler
and a diagnostic model. **None of that is the learner's problem.** The interface absorbs
the complexity; it does not display it.

- ✅ The engine picks the next item; the learner sees "Continue".
- ❌ `Level A2 · salah 0/10 · terverifikasi sampai A1` in the Home hero.
- ❌ `Core Brain belum tersambung dengan benar.` as a boot toast.

**Test:** if a label names an internal subsystem, a counter or a threshold, it fails.

---

### 2. One thing to understand, one thing to do

Every screen has exactly one visually dominant element and one obvious next step. Other
actions exist — they just do not compete.

- ✅ The question card: question, four options, nothing else.
- ❌ Home with the ritual sheet open: two primary paths, one covering the other.

**Test:** squint at the screen. If two things are equally loud, the hierarchy is broken.

---

### 3. Reveal on demand, not in advance

Information a learner needs *later* must not occupy space *now*. Default → contextual →
optional → advanced.

- ✅ The writing rubric, folded until the learner wants to edit against it.
- ✅ The wrong-answer explanation, which appears only after a wrong answer.
- ❌ A 120-word rubric above the compose box before a word is typed.

**Test:** ask "does the learner need this to take the next action?" If no, fold it.

---

### 4. Repetition is noise

The same fact stated twice costs twice and teaches once. The most expensive repetition is
the one closest to the task.

- ❌ The lesson title in the intro hero, again in the intro card heading, again in the
  question eyebrow, again in the feedback paragraph — four times in three taps.
- ✅ Say it once, where the learner chose it, and let context carry it.

**Test:** read every string on the path from hub to feedback in order. Delete the second
occurrence of anything.

---

### 5. Containers must earn their borders

A box is a claim that its contents are a separate thing. Most groupings are better made
with whitespace, alignment and type weight. Cards inside cards inside cards are a sign
that hierarchy was solved with borders instead of typography.

- ❌ Writing hero card → `Level belajar` card inside it.
- ❌ `Rencana kamu` card → ring card + `9 soal fokus` card + `1 soal campur` card.
- ✅ A section heading and spacing, with no border at all.

**Test:** remove the border. If nothing is confusing, the border was decoration.

---

### 6. Empty is a state to design, not a state to announce

A learner with no data is a learner at their most fragile. Empty sections should recede,
not stack up into a list of things they have not earned.

- ❌ Four consecutive cards each explaining that a feature has no content yet.
- ✅ Sections that render as a single folded row until they have something to say.

**Test:** seed a brand-new account and open the screen. Count how many times it says
"belum" before it says anything the learner can do.

---

## Applying them: the order of operations

When these principles disagree, resolve in this order:

1. **Accessibility is not traded away.** Minimal never means invisible, tiny, or below
   44px. Principle 2 does not license deleting a focus ring; principle 5 does not license
   dropping contrast. (P0-1 in the audit is what happens when this is forgotten.)
2. **Capability is preserved.** Hide, fold, relocate, rephrase — never remove. If a
   feature's UI is bad, its presentation is wrong, not its existence.
3. **Then** reduce.

## And the identity check

After every change, one last question: **does this still feel like FIEZEL?** The warm
cream ground, the solar yellow, Pau, the coach voice that talks like a person rather than
a system — those are the product's character, not clutter. The goal of this work is a
FIEZEL that feels *calmer*, not a FIEZEL that feels *generic*. A redesign that ends in
"this looks like every other language app" has failed even if every metric improved.
