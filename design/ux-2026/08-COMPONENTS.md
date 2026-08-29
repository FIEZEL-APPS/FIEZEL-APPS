# FIEZEL — Component Audit

Inventory of containers, controls and disclosure patterns, with a verdict per item.
Verdicts: **KEEP** · **FOLD** (exists, wrong moment) · **MERGE** (duplicate) ·
**FIX** (broken against the system) · **UN-NEST** (containment depth).

---

## 1. Containers

| Component | Where | Instances | Verdict | Note |
|---|---|---|---|---|
| `.card` | everywhere | ~120 | KEEP | The base surface. Justified. |
| `.home-fold` | Peta Belajar, Writing, empty sections | 6+ | **KEEP — the one disclosure component** | Now used by the rubric and `foldCard()`. Do not add a second pattern. |
| `foldCard()` | Peta Belajar | 2 | **NEW m025-202** | Full card when the section has content; 44px fold when empty. |
| `.launch-card` | Home grid | 4 | KEEP | Tappable as a whole — a justified container. |
| `.path-step` | Grammar Hub | **29** | **FIX (Phase 2)** | 29 expanded rows = 4.9 screens. Resume-anchored + two folds. |
| `.journey-*` panels | Peta Belajar | ~12 | UN-NEST | `Rencana kamu` reaches containment depth 2. |
| `.writing-rubric` | Writing | 1 | **FOLD — done m025-202** | Content unchanged; moment changed. |
| `.core-panel` | Peta Belajar | 1 | KEEP | Dark "intelligence" surface, used sparingly, per brand direction. |
| `.hero` (Writing/Skills) | 4 screens | 4 | UN-NEST | Contains a nested white `Level belajar` card. |
| `.prasasti-gallery` | Peta Belajar | 1 (8 badges) | KEEP, restyle (Phase 3) | Motivational; but 8 dimmed badges as a first impression needs a zero-state. |
| `.coach-strip` | Home | 1 | UN-NEST | Card inside the hero card. |
| `#fzRitual` overlay | Home | 1 | **FIX (Phase 2)** | Full-viewport overlay on every Home load. Should be inline. |

**Containment rule:** maximum nesting depth **1**. Measured depth 2 on Home, Listening and
Progress — every instance is hierarchy solved with a border instead of typography.

---

## 2. Duplicated components

### `.active-level-control` — `Level belajar · A2 · Ganti`

Rendered as a full-width bordered card on **seven** screens: Grammar, Vocab, Reading,
Skills, Writing, Test, Progress. Its `Ganti` label measures **10.6px** — below the type
floor — on all seven.

**Verdict: MERGE.** It is a global preference shown seven times.

**Proposal (Phase 2).** One canonical home in the Settings modal, plus one contextual
affordance where changing level is genuinely plausible — the Grammar Hub header, since
that is where the path is level-scoped. Elsewhere the current level is stated as text in
the section header (`Grammar · A2`), not as a control. Nothing is removed: `openLevelPanel()`
stays reachable from Settings and from the hub.

### `skills` route vs `listening` / `speaking` / `writing` routes

Three destinations, two entry paths each. **Verdict: KEEP** — the duplication is cheap,
causes no confusion, and removing an entry point would cost a learner a shortcut.

### `ask` and `search`

Two routes, one view (`askView()`). **Verdict: KEEP** — two entry points to one place is
normal.

---

## 3. Controls

| Component | Verdict | Note |
|---|---|---|
| `.primary` | KEEP | Sun field, ink text, ≥52px. Correct. |
| `.option` | KEEP | Full width, ≥52px, clear states. **The best component in the product.** |
| `.lesson-skip-link` | **KEEP AS-IS** | 24px painted box with a `::before` hit-area extension to 44px. Correct pattern — the audit's initial flag was a false positive. Only its 11.2px font is a (Phase 3) floor issue. |
| `.journey-goal-chip` | **FIXED m025-202** | Was `min-height:36px` with no hit-area extension, overriding `button{min-height:44px}`. Now 44px. |
| `.quiz-next` (`Lanjut`) | KEEP | Correctly disabled with a lock icon rather than opacity alone. |
| `.exam-entry-chip` | KEEP | Sub-label at 10.6px → Phase 3. |
| `.path-view-toggle` | **FIX (Phase 2)** | `Tampilan daftar` is an 11px text link controlling the screen's single most impactful setting. It is evidence the density problem was already felt. |
| `.text-button` | KEEP | Correct tertiary treatment. |
| `.confidence-*` popup | KEEP | Correctly a popup, not an inline block — it does not push the question off screen. |
| Chip row (Progress tabs) | **FIX (Phase 3)** | Overflows and is cut mid-word at 390px with no scroll affordance. |

---

## 4. Disclosure patterns — consolidate to one

| Pattern | Where | Verdict |
|---|---|---|
| `<details class="home-fold">` | Peta Belajar, Writing, empty sections | **CANONICAL** |
| `<details class="acc">` | `Bandingkan pilihan lain`, MEASURE review | KEEP — same primitive, session-scoped skin |
| `#fzRitual` overlay | Home | Not disclosure — a modal doing a hero's job |
| Settings modal | topbar | KEEP — genuinely modal |
| `openLevelPanel()` | 7 screens | See §2 |

**Rule:** new progressive disclosure uses `.home-fold`. No third pattern.

---

## 5. Type-floor violations (Phase 3 batch)

All are raw rem values that should be `--fs-caption` (12px):

| Element | Size | Instances |
|---|---|---|
| `.active-level-control small` (`Ganti`) | 10.6px | 7 screens |
| Library `Ringkasan FIEZEL` | 10.0px | 3 |
| Classroom eyebrows | 10.4px | 14 nodes on that screen |
| `.exam-entry-chip small` | 10.6px | 1 |
| `.lesson-skip-link` | 11.2px | 29 |
| Grammar `Jalur A2` caveat | 11.1px | 1 |
| Home skill-card meta | 11.5px | 4 |
| `.journey-skill small` | 10.6px | 3 |

Batched deliberately: each shifts layout on a screen with other pending work, so they
should land **after** the Phase 2 structural changes, not before.

---

## 6. Net component change in m025-202

- **Added:** `foldCard()` (one helper, ~5 lines) and its two CSS rules.
- **Changed:** `.journey-goal-chip` height; `.writing-rubric` moment; quiz eyebrow logic.
- **Removed:** one orphaned CSS rule (the P0).
- **New components invented:** **zero.** Every change reuses `.home-fold`, which already
  existed. That is the point — a design system earns its keep by making the next change
  smaller, not by growing.
