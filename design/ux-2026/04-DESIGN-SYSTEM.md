# FIEZEL — Design System

FIEZEL already has a token layer. This document **does not invent a new one** — it writes
down what exists, names the rules that were being applied inconsistently, and states which
gaps caused the audit findings. Token values below are read from `style.css`, not proposed.

---

## 1. Colour

### Ground and material

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FFF9EE` | Page ground (warm cream) |
| `--panel` | `#FFFFFF` | Card surface |
| `--panel-soft` | `#FFF3DC` | Recessed / secondary surface |
| `--line` | `#F0E4CF` | Borders |
| `--line-soft` | `#F7EFDF` | Hairlines, dividers |

### Ink

| Token | Value | Use |
|---|---|---|
| `--text` / `--ambient-text` | `#241A11` | Body and headings |
| `--muted` / `--ambient-muted` | `#6E5E47` | Secondary text |
| `--muted-soft` | `#7E6C4B` | ≥14px only |

### Energy and semantics

| Token | Value | Use |
|---|---|---|
| `--sun` | `#FFC700` | Primary CTA field |
| `--accent` / `--accent-strong` | `#C2402C` / `#A33422` | Accent, text links |
| `--green` | `#2E8B69` | Correct |
| `--info` | — | Neutral notice |

### The rule the audit was written to enforce

> **Ink and surface must come from the same token family, and any rule scoped to a time
> phase must be checked against that phase's own ground.**

Four `.scene-*` blocks exist (`dawn`, `day`, `dusk`, `night`). Since **m025-115 all four
have a light ground** (`--sky-bottom` = `#FFF9EE` / `#FFF6EA`). Therefore:

- ❌ No phase-scoped rule may pin `color` to a light literal. This is now enforced by the
  invariant *"tidak ada tinta terang yang dipaku pada blok fase bertanah terang"* in
  `contrast-test.js`, added in m025-202 after P0-1.
- The gate reads each scene's `--sky-bottom` at test time, so if a phase is ever
  deliberately darkened again, light ink for that phase passes automatically.

### Minimums

- Body text **≥4.5:1**; large text (≥24px, or ≥18.66px at weight ≥700) **≥3:1**.
- State is **never colour-only** — correct/incorrect carry an icon or a word as well.
- Focus ring: 2px `--focus-ring`, offset 2px, on every focusable element.

---

## 2. Type

| Token | Value |
|---|---|
| `--fs-display` | `clamp(1.75rem, 4vw, 2.125rem)` |
| `--fs-h1` | `1.5rem` (24px) |
| `--fs-h2` | `1.125rem` (18px) |
| `--fs-body` | `1rem` (16px) |
| `--fs-small` | `.875rem` (14px) |
| `--fs-caption` | `.75rem` (12px) |

**Families.** `--fz-display` (Instrument Serif) for screen titles only; `--fz-heading`
(Plus Jakarta Sans 700) for card and section titles; `--fz-body` (Plus Jakarta Sans
400–600) for everything else. Fredoka for brand display moments.

**Floor: 12px.** `--fs-caption` is the smallest step and nothing may go below it. The
audit found six violations sitting *under* the floor by using raw rem values instead of
the token (10.0–11.5px — see `01-AUDIT.md` P3-1). **The fix is to use the token**, not to
add a smaller one.

**Eyebrows.** Uppercase + letter-spacing is expensive: it costs roughly 30% more width and
resists fast reading. Rules: 12px, max **one line**, and never above the primary content
of a learning screen unless it is the only thing establishing context (see
`06-LEARNING-SESSION.md`).

---

## 3. Spacing

`--sp-1:4 · --sp-2:8 · --sp-3:12 · --sp-4:16 · --sp-5:20 · --sp-6:24 · --sp-7:32 · --sp-8:40`

- Inside a card: `--sp-4`.
- Between cards: `--sp-3`.
- Between sections: `--sp-6`.
- Around the primary action: `--sp-6` above, so nothing crowds it.

Whitespace is the primary grouping tool. Reach for spacing before reaching for a border.

---

## 4. Containment — when a box is allowed

`--radius-lg:24px` · `--radius-md:16px` · `--radius-sm:12px` · `--radius-pill:999px`

**A container is justified only if at least one is true:**

1. It is **interactive as a whole** (a tappable card).
2. It carries a **different surface for a reason** (a coach turn, an example, an error).
3. It **scrolls or collapses** independently.

**Maximum nesting depth: 1.** A card may contain a bordered child (an example block, a
coach panel). That child may not contain another. The audit measured depth 2 on Home,
Listening and Progress — every instance is a hierarchy problem solved with a border.

**Empty sections do not get cards.** They render as a folded row (§6).

---

## 5. Buttons

| Level | Treatment | Per screen |
|---|---|---|
| **Primary** | `--sun` field, ink text, full width, ≥52px | **exactly one** |
| **Secondary** | white surface, `--line` border, ≥44px | 0–2 |
| **Tertiary** | text button, accent colour, ≥44px hit area | as needed |
| **Destructive** | accent-strong, confirmation required | rare |

**Minimum touch target: 44×44px** — as a *hit area*, which may be larger than the painted
box. `.lesson-skip-link` is the correct pattern: a 24px painted link with a transparent
`::before` extending the hit area to 44px. `.journey-goal-chip` was the incorrect pattern
(36px painted, no extension) and was raised to 44px in m025-202.

**Disabled** communicates with a lock icon and ≥4.5:1 text, never with low opacity alone.

---

## 6. Progressive disclosure — one component

`.home-fold` is **the** disclosure component. `<details>` + `<summary>`, 44px summary,
rotating chevron, content padded `14px 16px 16px`.

```html
<details class="home-fold">
  <summary><span>Title</span><i data-lucide="chevron-down"></i></summary>
  <div class="…-body">…</div>
</details>
```

Used by: Peta Belajar folds, the Writing rubric (m025-202), and `foldCard()` for empty
sections (m025-202). **Do not add a second disclosure pattern.** If a new surface needs
one, it uses this.

`foldCard(title, body, empty, cls)` is the section-level wrapper: a full card when the
section has content, a `.home-fold` row when it does not.

---

## 7. Feedback

| State | Treatment |
|---|---|
| Correct | Green mark + short affirmation. Continue is the only action. |
| Incorrect | The chosen option is marked; a coach panel names the **misconception**, not the answer; retry is invited. |
| Deeper | An optional control ("Aku masih belum paham") escalates. |

**Layering:** Layer 1 is one sentence that diagnoses. Layer 2 is optional and requested.
Layer 3 (full rule, comparison of distractors) is behind a further control. No learner is
ever forced through Layer 3.

---

## 8. Motion

Durations 160–420ms, `--ease` for movement, `--ease-spring` for arrival. Motion must
communicate a state change; decorative animation on educational content is prohibited.
`prefers-reduced-motion` is honoured everywhere, and `state.preferences.motion` gates
view transitions independently.

---

## 9. Responsive

Breakpoints in use: 560 / 620 / 640 / 760 / 860 / 900 / 1000 / 1120px.

Mobile (390px) is the design target, not the fallback. Specifically:
- Bottom nav is fixed and ~88px tall — **every screen must reserve that space**. The audit
  found the nav overlapping content on Writing and Grammar in full-page capture.
- Options and primary CTAs are full-width.
- Long content (chip rows, tables, code) scrolls inside its own container; the page body
  never scrolls horizontally.
- ≥1000px the nav becomes a vertical rail (already implemented in `tutor-v3.css`).

---

## 10. Accessibility contract

Non-negotiable, and checked by gates:

- Contrast minimums (§1) — `contrast-test.js`, including the phase invariant.
- 44px targets, `button,.nav{min-height:44px}` — `a11y-test.js`.
- 12px type floor.
- Focus-visible on every interactive element.
- State never colour-only.
- Visual simplification **may not** remove screen-reader content. When text is hidden from
  sight for redundancy, it moves to `aria-label` — the pattern used for the quiz eyebrow
  in m025-202.

> **Known, owner-accepted deviation:** page zoom is disabled
> (`user-scalable=no`, `maximum-scale=1`), a documented departure from WCAG 1.4.4 / 1.4.10
> recorded in `index.html` and enforced by `app-interaction-policy-test.js`. The mitigation
> named there — an **in-app text-size control** — is still outstanding and is the honest
> way to close that cost. It is carried in `09-IMPLEMENTATION.md` as Phase 4.
