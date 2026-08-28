# 12 — PAW CHARACTER UI LAYER (Lesson / Panel Layer)

Designer: Lesson Character-Layer Designer · Date: 2026-08-27
Basis: **Direction C (Expressive)** per `directions/selected-direction.md` (binding) + `directions/direction-c-expressive.md` rig; constraints from `audit/02-brand-system.md` (§4–5), usage map from `audit/03-usage-and-motion.md`; master prompt §16–18, §28–29, §32. Repo evidence from `/home/user/workspace/fiezel-repo` (paths relative to repo root). **Design spec only — no repo files modified.**

Canonical-source rule (binding, E5): this layer never draws PAW. It **mounts the one runtime rig** — the `<fiezel-mascot>` custom element from `features/mascot/fiezel-mascot.js` — and positions it. All state/reaction traffic goes through the existing `pawReact` / `pawSetState` / `pawFaceMarkup` wrappers in `app.js:2697-2709` (never direct element calls, per `features/mascot/README.md:26-27`).

---

## 1. Anatomy — what the layer is

The PAW CHARACTER UI LAYER is three small things, not a framework:

1. **A slot element** — `.fz-paw-slot` with one modifier class per anchor (§2). It is a *space-reserving, pointer-transparent* box rendered **in the same `setApp()` paint as the panel it belongs to**. Inside it sits exactly one `<fiezel-mascot>` (or nothing, decided before paint — never toggled after).
2. **A markup helper** — `pawPanelMarkup(slot, tier)` (sibling of the existing `pawFaceMarkup()`, `app.js:2707-2709`): returns the slot + mascot markup when `FiezelPaw.ready()`, or an **empty string** when the component failed to register (the slot simply doesn't exist that render — no fallback paw icon at panel scale; the paw-print stamp is a mark, not the character, per `audit/02-brand-system.md` §3).
3. **A wiring shim** — ~15 lines of event delegation in the quiz `draw()` that finally emit the three orphaned lesson events (`question-shown`, `hover-answer`, `answer-picked` — supported since `fiezel-mascot.js:322-332`, zero callers today per `audit/03-usage-and-motion.md` Task D). No new mascot API, no new states.

What the layer explicitly is **not**:

- Not a second floating PAW. The bottom-right float is already owned by the coach bubble (`fiezel-coach-bubble.js`, 58px → 46px on `fz-stage-quiz`, `style.css:2379/3286`) and the `--mascot-dock: 88px` token (`design/redesign-v1/tokens/tokens.css:105`). The "floating near panel" position of master prompt §17 **maps to that existing dock**; the layer adds only *panel-anchored* slots.
- Not a new copy of the rig (multi-copy drift guard, `selected-direction.md` binding note E5).
- Not interactive. Every slot is `pointer-events:none` + `aria-hidden="true"` — same mandatory rule as the head-crop containers (`fiezel-motion.css:361-365`). PAW enhances communication, never carries it alone (master prompt §33).

Surfaces the layer serves (the six panel families of master prompt §28): question card (`.card` with `h2.question` + `#options`, `app.js:4738`), vocabulary card (`.flashcard`, `style.css:352`), grammar teach-pause card (`.tutor-card`, `app.js:4721`), reading panel (`.passage`, `style.css:542`), progress panels (`.map-note`, journey panel), and the coach speech bubble (existing, untouched).

---

## 2. Positioning system (master prompt §17)

### 2a. Anchor slots

Six anchors. All share the invariants of §2c; they differ only in where the reserved box sits.

| Anchor | Class | What it looks like | Render | Tier (§2e) |
|---|---|---|---|---|
| **A — Above panel** | `.fz-paw-above` | Full-body PAW standing centered (or start-aligned) above the panel's top edge, gaze down at the content (`lookAt` the stem). The §16 hero composition. | Block-flow sibling *before* the card, reserved height | medium 88 / large 120–148 |
| **U-L — Upper-left** | `.fz-paw-corner.is-l` | Head-and-shoulders at the panel's top-left, sitting *on* the edge like a paperweight; body below the edge line. | Absolute inside a `position:relative` card wrapper; card gets reserved `margin-top` | small 48–58 |
| **U-R — Upper-right** | `.fz-paw-corner.is-r` | Mirror position (NOT mirrored art — the body is never mirrored, E4; gaze direction comes from `lookAt`). Default corner, because card eyebrows/titles are left-aligned (`app.js:4738`). | same | small 48–58 |
| **S — Side** | `.fz-paw-side` | Full-body PAW in a dedicated column beside the panel, leaning toward it (head translate, Direction C §6). Desktop/tablet-landscape only. | Grid column reserved at render | large 148 |
| **F — Floating** | *(existing coach bubble)* | The fixed bottom-right dock. Not created by this layer; treated as an occupied zone (§2d) and as the *default* PAW on dense screens. | `position:fixed` (existing) | 58/46 head-crop |
| **P — Peek (partial decorative overlap)** | `.fz-paw-peek` | Only the top of PAW's head + ears rising from **behind** the panel's top border (z-index below the card), overlapping nothing inside the card. Decorative overlap per §17 without ever sitting on content. | Absolute, `top` negative, z below card surface; reserved `margin-top` on the card | small 48–56 (head crop not needed — the card itself crops the body) |

Head-crop rule carries over from the brand ladder (`audit/02-brand-system.md` §5.6): tiers ≤58px use the head-first read (corner/peek naturally show mostly head; the 178%/−8% circle-crop pattern of `fiezel-motion.css:327-369` stays reserved for round containers); full body from 88px up.

### 2b. Slot selection rules per surface

One decision per screen, made at render time:

1. **Density first.** If the panel's interactive area fills >70% of the visual viewport height (typical phone-portrait quiz), only **P (peek)** or **F (bubble only)** are allowed. A/S need real free space, never manufactured by shrinking content.
2. **Teaching beats decorating.** Surfaces where PAW *is the speaker* (teach-pause tutor card, result screen, empty states, level-entry) prefer **A** — PAW above, addressing the student. Surfaces where PAW *observes* (live question) prefer **P/U-R** — present, not center-stage.
3. **Reading is sacred.** Never anchor to a `.passage` block; anchor to the question card below it. Nothing animated beside running text.
4. **One panel-PAW per screen, maximum** (§4). If a screen already shows a PAW face ≥42px (coach strip, result ring-row face, level-modal face), the layer adds nothing.
5. **Corner side selection:** use **U-R** by default (eyebrow + title are top-left); use **U-L** only when the panel's top-right holds a control or badge (e.g. the `A1` level chip on lesson cards — visible in `assets/brand/screenshot-grammar.png`).

### 2c. Collision rules (hard invariants)

PAW must never cover text, cover buttons, block interaction, reduce readability, or create layout instability (master prompt §17). Concretely:

- **C1 — Pointer transparency.** Every slot and its mascot: `pointer-events:none` (the lesson learned at `fiezel-motion.css:361-365`). A tap through PAW always reaches the UI.
- **C2 — Protected content box.** Inside any panel, the rectangle from the first text node to the last interactive element (padding box minus 12px inset) is off-limits to any PAW pixel. Corner and peek anchors live **on or behind the border**, never inside this box. Minimum clearance to any ≥44px tap target (`--tap-min`): 12px visual, ∞ interactive (C1).
- **C3 — Zero CLS.** The slot's box is fixed at render: explicit `height` (A), `margin-top` reservation (U-L/U-R/P), or grid column (S). State changes, reactions, enter/exit never resize it. PAW-present-or-absent is decided **before paint** in the same template string; the layer never inserts or removes a slot on a live screen. Exit = animate to `opacity:0` inside the box; the box stays until the next `setApp()`.
- **C4 — Reaction headroom.** Reactions stay inside the reserved box: slot height = mascot height + `--fz-paw-headroom` (12px at small, 20px at medium, 32px at large). Celebration jump amplitude is scale-relative and clamped so lv3 (`fzJumpBig`, −58px at full size, `fiezel-motion.css`) never escapes the box at panel tiers; confetti renders in the mascot's own overlay layer and is hidden at tiers <88px (same rule as `.has-mascot` crops, `fiezel-motion.css:374-375`).
- **C5 — Fixed-UI avoid zones.** Slots never approach: the sticky `.quiz-topbar` (top strip, holds `#quizNext` — the quiz "Lanjut" button lives top-right, `style.css:3305` comment); the coach bubble lane (right 16px, bottom 88–150px on quiz stage, `style.css:3286`); the bottom dock/nav (`.app` reserves 118–126px bottom padding, `style.css:168/782`); `#fiezelSubtitle` band (z70), voice pill (z60), `.fsl-actions` (z55). Slot z-index ≤ 5 — below everything fixed (bubble z41, toast z80).
- **C6 — Feedback never obscured.** During reveal, PAW may not overlap `.feedback`, `.tutor-turn`, or the `#answerBurst` banner. All anchors are above/beside the card top, feedback grows at the card bottom — satisfied by geometry, stated as a rule so future anchors keep it.
- **C7 — Yellow-on-yellow.** On `--sun` hero-family surfaces, panel anchors are disallowed (body yellow #FFD94F disappears); only cream/white/`--core` surfaces qualify (`audit/02-brand-system.md` §1c constraint).

### 2d. Responsive behavior (master prompt §32)

Breakpoints follow the repo's existing cut lines (640px and 860px media queries in `style.css`; `.app` max-width 800px, 1120px on desktop, `style.css:168/782`).

| Context | Above (A) | Corner (U-L/U-R) | Side (S) | Peek (P) | Notes |
|---|---|---|---|---|---|
| Narrow phone ≤420w, portrait | ✗ | ✗ | ✗ | ✓ 48px | Peek or bubble only |
| Phone 421–640w, portrait | ✓ 88px, non-dense screens only (rule 2b-1) | ✓ 48px | ✗ | ✓ 56px (default for question card) | |
| Tablet 641–979w, portrait | ✓ 88–120px | ✓ 58px | ✗ | ✓ 56px | A becomes default for teach/result |
| ≥980w (desktop, tablet landscape) | ✓ 120px | ✓ 58px | ✓ 148px (default for question card) | ✓ | S uses a reserved grid column beside the 640–800px content column |
| Any landscape with height <480px | ✗ | ✓ 48px | ✗ | ✓ 48px | Vertical space is the scarce axis; nothing above the panel |
| Orientation change / resize | Re-anchor only on the next render (quiz `draw()` runs per question). Between renders the slot keeps its box; a mid-question rotate at worst shows a suboptimal anchor for one question — never a layout jump. | | | | |

### 2e. Scale tiers (master prompt §29, aligned to the existing size ladder)

| Tier | Px | Render | Existing precedent | Layer usage |
|---|---|---|---|---|
| Tiny | 28px | head crop (circle pattern) | map-note face 28px (`style.css:3396`) | progress captions only — never a panel anchor |
| Small | 42–58px | head-first (crop or peek) | coach avatar 42, listen row 38, result 52, modal 56, bubble 58 | corner, peek |
| Medium | 88px | full body | `--mascot-dock` 88px | above (phone/tablet) |
| Large | 120–148px | full body | onboarding `--fz-ob-paw:148px` (`style.css:1414`) | above (desktop), side |
| Full | ≥200px | full body | component pin ~200px, marketing/512 exports | celebrations, marketing — outside this layer's scope |

Direction C caveat honored: expressive detail (lid slivers, brow tilt, sp1/sp2 mouths) is invisible below ~42px (`direction-c-expressive.md` §7 scalability). At tiny/small tiers the layer relies on coarse reads (ears, whole-eye, mouth swap) — same information, lower resolution; nothing depends on fine detail (accessibility, master prompt §33).

---

## 3. Behavior in lessons (master prompt §16)

All behavior = existing states + the Direction C rig; the layer only supplies **triggers** and **gaze targets**. Reactions live entirely in transform/opacity inside the reserved slot box (C3/C4) — nothing ever re-enters layout flow.

### 3a. The question lifecycle

| Moment | Trigger (existing API) | PAW (Direction C read) |
|---|---|---|
| Question rendered | `pawReact('question-shown',{target: stemEl})` — supported at `fiezel-mascot.js:322`, currently only called by the level-guard warning (`app.js:2941`) | `curious` 1400ms with `lookAt(stem)`: gaze drops to the question (pupils + `--lx/--ly`, near-side ear perk, head translate toward the panel — the "looking down at it" composition). Then idle. |
| Student hovers/focuses an answer | `pawReact('hover-answer',{target: optionBtn})` — throttled ≥250ms, only while unanswered | glance: `lookAt(option)`; `curious` 900ms only if idle (`fiezel-mascot.js:326-329`) — a glance, not a scene |
| Answer picked | `pawReact('answer-picked',{target: btn})` | `lookAt(btn)` + `thinking` 700ms — PAW considers with the student |
| AI evaluation / "ANALYZING" | `pawSetState('thinking',{hold:900})` — already wired, `app.js:1779` | half-lids + pupils up-corner + paw-to-chin (rig tuple §3.5 of Direction C) |
| Reveal correct | `answerFeedbackSignal(true)` → `correct` — already wired, `app.js:1737` | `celebrating` lv1–3 by streak; jump clamped to headroom (C4); confetti only ≥88px |
| Reveal wrong | → `wrong` — already wired | 1st: `confused`; ≥2 in a row: `encouraging` (guide-not-referee) |
| Teach pause opens | `pawReact('question-shown',{target: tutorCard})` on the A-anchored tutor PAW | PAW addresses the card: gaze down, `encouraging` on "Oke, aku siap" press |
| Next question | lifecycle restarts with the new `draw()` | `lookAt` auto-recenters after 2200ms anyway (`fiezel-mascot.js:388-392`) |
| Session complete | `lesson-complete` — already wired, `app.js:4957` | `completion` hold 3200ms in the result-screen A slot |

**Lean toward UI:** leaning is the rig's job, not the slot's — `fz-head` translate ±6/±4 + gaze (Direction C §6, rotation-free). The slot contributes only the *direction*: because `lookAt()` computes from real element rects (`fiezel-mascot.js:373-386`), an above-anchored PAW given the stem element automatically leans down; a side-anchored PAW leans sideways. No per-anchor pose CSS needed.

**Return to idle** is automatic: transient states auto-revert (`TRANSIENT`, `fiezel-mascot.js:208-210`); the layer never parks PAW in a persistent state except `thinking` during evaluation (which the existing code already releases).

### 3b. Rules of restraint

- Hover glances are throttled and idle-gated so rapid pointer sweeps don't make PAW frantic (clamped-calm principle, Direction C §4).
- No reaction may fire while `answer.locked` teardown is running; the wiring checks the same lock the quiz uses (`app.js:4761`).
- Listening questions: while audio plays, PAW is in `listening` (already wired for Skills Lab); the panel PAW in a quiz listening item stays idle — one groove per screen.
- Reduced motion (all three layers, `audit/03-usage-and-motion.md` B.6): the wrappers already no-op reactions; the slot then renders PAW with a **pre-applied static pose class** (`st-curious` for question surfaces, `st-encouraging` for teach/empty — the onboarding pattern, `fiezel-onboarding.js:393-397`). Static-safe by design (checklist D3).

### 3c. Enter / exit within the slot (master prompt §18, minimal cut)

- Enter: 240ms rise-and-settle (`translateY(8px)→0` + opacity), the `fzm-ob-paw-in` recipe (`style.css:1431`), spring easing `--fz-spring`. Peek enters by translating up from behind the card edge (the card masks it — free "peek" motion).
- Exit: fade + settle down 180ms; box retained (C3).
- Never `display:none` mid-screen; only the next render removes the slot.

---

## 4. Panel relationship — when PAW is present vs absent (master prompt §28)

Principle: **PAW appears where a companion helps, and is absent where he'd be wallpaper.** Not on every card (explicit §28 rule); never twice at panel scale on one screen (rule 2b-4). The coach bubble is the ambient floor of presence on every screen — panel anchors are the exception, not the rule.

### Decision table per screen type

| Screen / surface | Panel PAW? | Anchor · tier | Rationale |
|---|---|---|---|
| Home | **No new** | — (existing 42px coach-strip face) | Already has a PAW face in KATA FIEZEL; hero card is sun-yellow (C7) |
| Grammar/Vocab/Reading hubs (lesson lists) | **Absent** | bubble only | Repeated list cards — PAW on each is wallpaper; on one is arbitrary |
| Quiz — question card (grammar/vocab/reading/adaptive) | **Present** | phone: P 56 upper-right · tablet: P 56 or A 88 · desktop: S 148 | The §16 core composition; peek keeps dense portrait screens clean |
| Quiz — reading passage block | **Absent** on passage | anchor on the question card below | Rule 2b-3; nothing beside running text |
| Quiz — teach pause (`.tutor-card`) | **Present** | A · 88 (120 desktop) | PAW *is* the tutor re-explaining; low density, one CTA |
| Quiz — listening item | **Present** | P 56 | Same as question card; groove stays with the audio, not the panel PAW |
| Vocabulary flashcard (`.flashcard`) | **Absent** | bubble reacts (`favorite`→`love`, mastered→`proud` — backlog wiring) | The whole card is a flip button; any overlap muddies the tap affordance; 3D flip + character motion compete |
| Skills Lab player rows | **No new** | — (existing 38px `.fsl-mascot` slot) | Already integrated |
| Progress / learning map | **Absent** at panel scale | existing 28px map-note face only | Data screen; PAW annotates, never decorates charts |
| Session result / completion | **Present** | A · 88 (120 desktop), replaces the 52px ring-row face at ≥641w | Celebration is PAW's biggest moment (§21); no dense interaction |
| Level-guard modals | **No new** | — (existing 56px face) | Already integrated |
| Empty states (no lesson yet, empty review deck) | **Present** | A · 88, `st-encouraging` | Today mascot-free (`audit/03` A.2) — highest-value new placement: warmth where the screen would otherwise be a dead end |
| Error states / toasts | **Absent** | copy only | Errors need clarity, not character; gentle tone lives in copy |
| Onboarding | **No new** | — (existing 148px layer) | Already the large-tier reference implementation |
| Splash | **Absent** | — | OWNER decision m025-80 stands; reintroduction needs sign-off |

Tie-breaker when in doubt: **absent.** A rarer PAW is a stronger PAW.

---

## 5. ASCII layouts — key compositions

**5a. Phone portrait (≤640w) — question card with PEEK (default)**

```
┌──────────────────────────────────┐
│ [x Keluar]   3 / 10   [Lanjut →] │  .quiz-topbar (sticky — avoid zone C5)
├──────────────────────────────────┤
│                      (^,,^)      │  ← peek: head+ears only, 56px tier,
│ ┌────────────────────▄▄▄▄▄▄────┐ │    z BELOW card ⇒ body hidden by card;
│ │ GRAMMAR · adaptif            │ │    card margin-top reserves the ears
│ │ She ___ to school every day. │ │  ← h2.question  (lookAt target)
│ │ ┌──────────────────────────┐ │ │
│ │ │ goes                     │ │ │  ← .option (hover ⇒ glance)
│ │ ├──────────────────────────┤ │ │
│ │ │ go                       │ │ │
│ │ ├──────────────────────────┤ │ │
│ │ │ going                    │ │ │
│ │ └──────────────────────────┘ │ │
│ │ [feedback grows here]        │ │  ← C6: never overlapped
│ └──────────────────────────────┘ │
│                        ( 46px )  │  ← coach bubble lane (existing, C5)
├──────────────────────────────────┤
│  Home  Vocab  Grammar  Read  Peta│
└──────────────────────────────────┘
```

**5b. Tablet portrait / teach pause — ABOVE anchor**

```
│            ∧ ∧                   │
│          ( o.o )                 │  .fz-paw-above · 88–120px full body
│           /|▼|\  ← gaze down     │  slot height = size + headroom (C4)
│ ┌──────────────────────────────┐ │
│ │ AJAR ULANG                   │ │  .tutor-card
│ │ Simple present: subject +    │ │
│ │ verb-s …                     │ │
│ │ [ Oke, aku siap coba lagi → ]│ │
│ └──────────────────────────────┘ │
```

**5c. Desktop ≥980w — SIDE anchor (reserved grid column)**

```
┌────────────────────────────────────────────────────┐
│ [x]              5 / 10                  [Lanjut →]│
│ ┌───────────────────────────────┐  ┌ ─ ─ ─ ─ ─ ┐   │
│ │ READING · adaptif             │      ∧ ∧          │
│ │ Why did Maya take the bus?    │  │ ( o.o )  │    │
│ │ ┌───────────────────────────┐ │     /|=|\  ←lean │
│ │ │ Because it was raining    │ │  │   |_|    │    │
│ │ ├───────────────────────────┤ │    148px          │
│ │ │ Because she was late      │ │  └ ─ ─ ─ ─ ─ ┘   │
│ │ └───────────────────────────┘ │  grid col, fixed  │
│ └───────────────────────────────┘  width ⇒ no CLS  │
└────────────────────────────────────────────────────┘
```

**5d. Corner anchor + protected content box (C2)**

```
        ┌── U-L slot          U-R slot ──┐
   (^,,^)                              [A1]   ← chip present ⇒ use U-L
┌──▀▀▀▀▀▀──────────────────────────────────┐
│ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│    PROTECTED CONTENT BOX (C2):            │
│ │  first text … last interactive      │   │  ← no PAW pixel ever inside
│ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
└───────────────────────────────────────────┘
```

---

## 6. CSS / JS integration sketch (spec, matching repo conventions)

### 6a. CSS — appended to `features/mascot/fiezel-motion.css` (mascot-scoped, tokens never on `:root`)

```css
/* ============================================================
   [ADAPTASI 5] PAW PANEL SLOTS — lapisan penempatan, bukan gambar baru.
   Aturan keras: pointer-events none, ruang dipesan saat render (nol CLS),
   reaksi tinggal di transform/opacity di dalam kotak slot.
   ============================================================ */
.fz-paw-slot{ position:relative; pointer-events:none; z-index:1;
  display:flex; justify-content:center; align-items:flex-end;
  --fz-paw-size:88px; --fz-paw-headroom:20px; }
.fz-paw-slot fiezel-mascot{ width:var(--fz-paw-size); height:auto;
  pointer-events:none; }

/* A — di atas panel: tinggi dipesan eksplisit (C3/C4) */
.fz-paw-above{ height:calc(var(--fz-paw-size)*.94 + var(--fz-paw-headroom));
  margin-bottom:-4px; }                    /* kaki "berdiri" di tepi kartu */

/* U-L / U-R — duduk di tepi atas kartu; induk kartu wajib .has-paw-corner
   (position:relative + margin-top pesanan, di-set di template render) */
.fz-paw-corner{ position:absolute; top:calc(var(--fz-paw-size)*-.52);
  --fz-paw-size:56px; --fz-paw-headroom:12px; }
.fz-paw-corner.is-r{ right:16px } .fz-paw-corner.is-l{ left:16px }

/* P — peek: z DI BAWAH permukaan kartu; kartu memotong badannya sendiri */
.fz-paw-peek{ position:absolute; top:calc(var(--fz-paw-size)*-.42);
  right:18px; z-index:0; --fz-paw-size:56px; }
.has-paw-peek{ position:relative; z-index:1;
  margin-top:calc(56px*.42 + 6px); }       /* ruang telinga: dipesan, bukan didorong */

/* S — kolom samping (desktop): grid yang memesan kolomnya */
@media (min-width:980px){
  .quiz-shell.has-paw-side{ display:grid; grid-template-columns:minmax(0,1fr) 164px;
    column-gap:16px; align-items:start; }
  .fz-paw-side{ position:sticky; top:96px; --fz-paw-size:148px;
    --fz-paw-headroom:32px; }
}

/* Masuk/keluar — selalu di dalam kotak (C3) */
.fz-paw-slot fiezel-mascot{ animation:fzPawSlotIn .24s var(--fz-spring) both }
@keyframes fzPawSlotIn{ from{opacity:0; transform:translateY(8px)} to{opacity:1} }
.fz-paw-slot.is-leaving fiezel-mascot{ animation:fzPawSlotOut .18s var(--fz-out) both }
@keyframes fzPawSlotOut{ to{opacity:0; transform:translateY(6px)} }

/* Tiga lapis reduced-motion yang sudah ada tetap berlaku; slot hanya statis */
@media (prefers-reduced-motion:reduce){ .fz-paw-slot fiezel-mascot{ animation:none } }
body.reduce-motion .fz-paw-slot fiezel-mascot{ animation:none }

/* Bayangan lantai & confetti tidak berarti di tier kecil (aturan lama diperluas) */
.fz-paw-corner fiezel-mascot .fz-shadow, .fz-paw-peek fiezel-mascot .fz-shadow,
.fz-paw-corner fiezel-mascot .fz-confetti-layer,
.fz-paw-peek fiezel-mascot .fz-confetti-layer{ display:none }
```

### 6b. JS — markup helper (sibling of `pawFaceMarkup`, `app.js`)

```js
// Slot PAW untuk panel. Keputusan hadir/absen dibuat DI SINI, sebelum paint —
// kalau komponen belum siap, slotnya tidak pernah ada (nol CLS, tanpa fallback ikon).
const PAW_SLOTS={above:'fz-paw-above', cornerL:'fz-paw-corner is-l',
  cornerR:'fz-paw-corner is-r', side:'fz-paw-side', peek:'fz-paw-peek'};
function pawPanelMarkup(slot,size,pose){
  try{ if(!self.FiezelPaw?.ready?.()) return '';
    const still=!pawMotionAllowed()&&pose?` st-${pose}`:'';
    return `<div class="fz-paw-slot ${PAW_SLOTS[slot]}" aria-hidden="true"`+
      (size?` style="--fz-paw-size:${size}px"`:'')+
      `><fiezel-mascot class="fz-paw-panel${still}"></fiezel-mascot></div>`;
  }catch(_){ return '' } }
```

Template usage (quiz `draw()`, `app.js:4738` — peek on phone, side on desktop; the media query owns the side column, the template just adds both hooks):

```js
${card(`${pawPanelMarkup('peek',56,'curious')}<div class="eyebrow">…</div>
  <h2 class="question" id="quizStem">…</h2>…`,'has-paw-peek')}
```

### 6c. JS — wiring the orphaned lesson events (quiz `draw()`, after options mount)

```js
// m-audit-03 Task D: tiga event yang didukung maskot tapi tak pernah dipanggil.
pawReact('question-shown',{target:$('quizStem')});          // tatap soal saat muncul
const opts=$('options'); let lastHover=0;
opts.addEventListener('pointerover',e=>{                     // lirik jawaban di-hover
  const b=e.target.closest('.option');
  if(!b||b.disabled||answer.locked)return;
  const now=Date.now(); if(now-lastHover<250)return; lastHover=now;
  pawReact('hover-answer',{target:b});
});
opts.addEventListener('focusin',e=>{                         // paritas keyboard (a11y)
  const b=e.target.closest('.option');
  if(b&&!b.disabled&&!answer.locked)pawReact('hover-answer',{target:b});
});
// di dalam answer(q,j,b), baris pertama sebelum evaluasi:
pawReact('answer-picked',{target:b});                        // mikir bareng murid
```

Notes: `pawReact` already gates on reduced motion and never throws (`app.js:2697-2699`); `lookAt` accepts the element directly and clamps to ±7/±5px (`fiezel-mascot.js:373-386`). No mascot-side change is required for any of §3 — this layer ships against the current 14-state API and inherits Direction C's richer reads for free once the rig lands.

### 6d. Backlog handles adjacent to this layer (not in scope, recorded)

- Fix dead `pawReact('correct-streak')`: call site → `pawReact('reward', {kind:'gems'})`; new `reward` event per 13 §1.3 / 17 R-1 (`app.js:3836`, audit 03 #14).
- Wire `favorite`/mastered on vocab (bubble-only per §4 table).
- Result-screen A-slot replaces the 52px ring-row face at ≥641w (one PAW per screen).
- Empty-state A-slot with `st-encouraging` static pose (audit 03 A.2 gap).

---

## 7. Acceptance checklist

- [ ] Every slot `pointer-events:none` + `aria-hidden`; tap-through verified over every anchor (C1).
- [ ] No PAW pixel inside any protected content box at any breakpoint/orientation (C2).
- [ ] CLS = 0 on question advance, reveal, teach pause, orientation change (C3; Lighthouse on 390×844 and 844×390).
- [ ] Celebration lv3 stays inside the slot box at 56/88/148px (C4).
- [ ] No overlap with quiz-topbar, coach bubble lane, subtitle band, voice pill, bottom nav (C5); `#quizNext` reachable at all times.
- [ ] Max one panel PAW per screen; hub/list screens show none (§4).
- [ ] Reduced motion: static pose renders, zero reactions, layer still communicates (three layers, audit 03 B.6).
- [ ] `paw-mascot-test.js` suite still green; no new copy of the rig anywhere (E5).
