# FIEZEL — Implementation Plan

Sequenced so that each phase is independently shippable, independently revertible, and
lands with the gates green. Ordered by **value ÷ risk**, not by screen.

---

## Phase 1 — Landed in m025-202 (this change)

Low risk, high value, no IA decisions required.

| # | Change | Files | Gate |
|---|---|---|---|
| 1 | **P0** — remove orphaned `#f8faff` heading ink for `scene-dusk`/`scene-night` | `features/tutor-classroom/tutor-v3.css` | `contrast-test.js` |
| 2 | **New invariant** — no light literal ink on a light-ground phase | `contrast-test.js` | self |
| 3 | Quiz eyebrow becomes session-aware; full label → `aria-label` | `app.js` | `lesson-experience-test.js`, `a11y-test.js` |
| 4 | Feedback cue drops the lesson-title restatement (ID + TH) | `features/i18n/copy-id-app-d.js`, `copy-th-app-d.js` | `id-golden-snapshot-test.js` (baseline regenerated), `th-coverage-test.js` |
| 5 | Writing rubric folds into `.home-fold` | `app.js`, `style.css` | `writing-rubric-test.js` |
| 6 | `foldCard()`; empty Peta Belajar sections fold | `app.js`, `style.css` | `personal-journey-ui-test.js` |
| 7 | `.journey-goal-chip` 36px → 44px | `style.css` | `a11y-test.js` |

**Measured result.** Writing 1553 → 1117px (−28%). Progress 3260 → 3110px. Quiz eyebrow
3 lines → 1 word. Feedback 35 → 14 words. Screen titles 1.00:1 → 16.3:1 for 13 hours a day.

**Verification.** Every number above was measured in a real browser at 390×844 before and
after; the P0 gate was proven to go red on the original CSS before being accepted.

---

## Phase 2 — Structural (one change per item, own test pass each)

Each carries an IA decision. **Do not batch these.**

### 2a. Home: ritual overlay → inline hero  *(highest learner-visible value)*
`#fzRitual` renders full-viewport over Home on every load. Move the plan into the hero as
the single primary CTA; keep the overlay for its genuine first-run moment only.
**Risk:** medium — `personal-journey-*` gates cover the ritual contract.
**Success:** zero dismissals between cold open and the first tappable action.

### 2b. Grammar Hub: resume-anchored path  *(largest remaining P1)*
Current lesson as a full card; next 2–3 as compact rows; `Selesai (n)` and `Terkunci (n)`
as two `.home-fold` rows.
**Risk:** highest — `grammar-unlock-test.js`, `prerequisite-graph-test.js`,
`lesson-experience-test.js` all read this markup. **Ship alone.**
**Success:** 4118px → ~1300px; 62 controls → ~12.

### 2c. Lesson intro: stop being a documentation page — **SHIPPED m025-202**
Rule explanation + memory tip folded into `.home-fold`, `CONTOH` kept visible, summary
reuses the existing `PAHAMI DULU · URUTAN n` label so **no new student-visible string**
was introduced (golden baseline stayed green).
**Measured:** 1300px → 1081px (−17%); primary CTA y=1051 → y=832, now above the fold.
**Left open:** the duplicated hero/card title — blocked on an IA decision, and on the
Fredoka-block gate regex that requires `.lesson-title` to stay in the CSS selector list.
Detail in `05-SCREENS.md`.

### 2d. Peta Belajar zero-state
Five zero tiles → one line for a learner with no data; un-nest `Rencana kamu`;
`0 materi A2 sudah punya bukti belajar` ×3 → one line. Social card needs care — it
live-refreshes its own body via `refreshSocialSummaryCard`.
**Risk:** medium. **Success:** ~3.9 → ~2.0 screens.

### 2e. `Level belajar · Ganti` consolidation
One home in Settings + one contextual affordance on Grammar Hub. Text elsewhere.
**Risk:** low, but touches 7 screens — verify each.

### 2f. Copy batch A (internal vocabulary)
Boot toast, lesson-intro metadata, Home hero line. ID + TH together; regenerate the golden
baseline in the same commit. **Owner review required** — this is student-visible copy.

### 2g. Boot chain audit
Six interruptions before the product. Decide which gates can move after the first exercise
— the notification gate is the obvious candidate, since its own copy already says learning
works without it.
**Risk:** medium — `onboarding-test.js`, `tour-test.js`, `puter-*` gates.

---

## Phase 3 — Polish (safe to batch, land after Phase 2)

| # | Change | Why after Phase 2 |
|---|---|---|
| 3a | 12px type floor — all 8 violation groups (`08-COMPONENTS.md` §5) | Each shifts layout on screens Phase 2 restructures |
| 3b | Library synopsis clamped to 2 lines | — |
| 3c | Skills Lab prose reduction | — |
| 3d | Classroom translation + type floor | — |
| 3e | Progress chip-row scroll affordance | — |
| 3f | Mascot peek slot minimum height at 390px | — |
| 3g | Un-nest remaining depth-2 containers | Phase 2 removes several already |

---

## Phase 4 — Outstanding accessibility debt

**In-app text-size control.** `index.html` records an owner decision to disable page zoom
(`user-scalable=no`), a knowing departure from WCAG 1.4.4 / 1.4.10, and names the
mitigation: *"pengatur ukuran teks DI DALAM aplikasi"*. That mitigation does not exist yet.
It is the only way to restore readability for low-vision learners without reversing the
owner's product decision — and it is carried here so it is not lost.

**Not a UI change to be slipped into another phase.** It needs a preference, persistence,
a scale that respects the type ramp, and gate coverage.

---

## Rules for every phase

1. **One concern per commit.** The P0 and the gate that catches it belong together; the
   Grammar Hub restructure belongs alone.
2. **Reproduce before fixing.** Every gate added in this work was proven red against the
   original defect before being accepted. Keep that discipline.
3. **Measure before and after** with the harness in `design/ux-2026/evidence/`. Density
   claims should be numbers, not impressions.
4. **Bump the build triple together** — `FIEZEL_PAGE_BUILD` (`core-config.js`),
   `DIAG_BUILD` (`features/neural-voice/fiezel-diag-panel.js`), `SW_REV` (`sw.js`) — per
   `install-health-test.js` / `pwa-release-coherence-test.js`.
5. **Student-visible copy is owner-gated.** Regenerate `id-golden-baseline.json` in the
   same commit and flag it in the PR.
6. **Hide, fold, relocate — never remove.** No FIEZEL capability leaves the product
   because its UI was crowded.
