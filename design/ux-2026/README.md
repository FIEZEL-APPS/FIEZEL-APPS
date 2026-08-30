# FIEZEL UX 2026 — audit, system, and plan

Produced for the senior UI/UX product design review, m025-202.

| # | Document | What it answers |
|---|---|---|
| 0 | [`00-BENCHMARKS.md`](00-BENCHMARKS.md) | What comparable products do well, and which principles FIEZEL should take |
| 1 | [`01-AUDIT.md`](01-AUDIT.md) | What is wrong, how severe, with measured evidence and root causes |
| 2 | [`02-IA.md`](02-IA.md) | How the product is structured, and how it should be |
| 3 | [`03-PRINCIPLES.md`](03-PRINCIPLES.md) | Six falsifiable rules for settling design arguments |
| 4 | [`04-DESIGN-SYSTEM.md`](04-DESIGN-SYSTEM.md) | The token, containment, button and disclosure contract |
| 5 | [`05-SCREENS.md`](05-SCREENS.md) | Screen-by-screen BEFORE / WHY / AFTER / IMPACT |
| 6 | [`06-LEARNING-SESSION.md`](06-LEARNING-SESSION.md) | The canonical FIEZEL exercise experience |
| 7 | [`07-COPY-AUDIT.md`](07-COPY-AUDIT.md) | Text to remove, shorten, move, or protect |
| 8 | [`08-COMPONENTS.md`](08-COMPONENTS.md) | Container, control and disclosure inventory |
| 9 | [`09-IMPLEMENTATION.md`](09-IMPLEMENTATION.md) | Safe, phased build sequence |
| 10 | [`10-QA.md`](10-QA.md) | Pre-merge checklist |

`evidence/` holds the capture harness and the raw measurements every number here is
drawn from.

---

## The one-paragraph version

FIEZEL's exercise screen is already good — one card, one question, four options. The
crowding lives in the surfaces *around* it: hubs that render entire curricula flat
(Grammar Hub is 4.9 screens and 62 controls), a dashboard that announces emptiness in four
consecutive cards, and reference text placed at the moment of action rather than the moment
of need. Underneath all of it sat a genuine P0: **for 13 hours of every day, every hub's
screen title was rendering at 1.00:1 contrast — invisible** — because a `scene-night` ink
override outlived the dark background it was written for, and the contrast gate was
checking the daytime token instead of the value the browser actually used.

This change fixes that P0 and closes the class of bug in the gate, then makes four
contained reductions on the highest-traffic surfaces. It invents **no new components** —
every reduction reuses the `.home-fold` disclosure that already existed — and it removes
**no capability**: every word folded away is one tap from where it was.
