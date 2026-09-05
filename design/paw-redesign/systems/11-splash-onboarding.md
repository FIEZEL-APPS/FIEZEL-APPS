# 11 — Splash & Onboarding Character Experience (PAW)

Designer: Splash & Onboarding Character Designer · Date: 2026-08-27
Base: `directions/selected-direction.md` (Direction C rig, binding), `directions/direction-c-expressive.md` (expression/state tuples §3, rig params §4), audit `02-brand-system.md`, `03-usage-and-motion.md`; master prompt §14–15, §26, §33.
Repo evidence: `features/brand/fiezel-splash.js`, `features/brand/fiezel-choreography.js`, `index.html:35-95` (first-frame boot splash), `features/onboarding/fiezel-onboarding.js`, `app.js:2483-2511, 3495-3560`, `style.css:1400-1438, 1701-1706`. **Design spec only — no repo files were modified.**

---

## 0. Governance — RESOLVED BY OWNER RULING 2026-08-28

> **OWNER RULING v4 (2026-08-28, latest, binding — recorded as OA-6 in the master spec): "AUTO-FLOW — REMOVE MULAI".** The **Mulai button and the welcome card are REMOVED ENTIRELY**; the splash flows automatically into onboarding. The §1S-v3 design below stays binding for everything EXCEPT its Mulai gating: its welcome-card rest state (§1S-v3.1 item 4, §1S-v3.2 rows "SETTLE/WELCOME" + "user press", §1S-v3.3 P4–P5's card/button clauses, §1S-v3.7's "rests on the welcome card", gate V3-G3) is **SUPERSEDED** — kept verbatim as history. New flow: particle F formation → bars equalizer → wordmark (all unchanged) → settle (done 2140) → the **PAW slam-to-stamp plays AUTOMATICALLY at 2200** (≤60+ms gap, no dead beat) as the closing transition → straight into onboarding (~3030; motion ends and onboarding legible ≤3600ms from t0). No stop, no button, no user gesture; tap/Enter = skip forward. Binding spec: **§1S-v4** below; module contract: `splash-prototype/CONTRACT.md` (v4 banner).
>
> **OWNER RULING v3 (2026-08-28, earlier the same day, binding — recorded as OA-5 in the master spec): "PARTICLE FORMATION + PAW STAMP ON MULAI".** The §1S "PAW STAMP" auto-slam splash below is **SUPERSEDED** (kept as history). Binding deltas: (1) the **gold sheen/halo/glow after the F and bars is DELETED** entirely (`fz-logo-sheen`, halo flare, hero glow — "bayangan emas" gone); (2) the F + two gold bars now **form from a futuristic particle point-cloud** — the F completes first while the bars are still particles, and the instant the bars solidify they hand off to a dedicated **equalizer animation** synced to the existing motif; (3) the paw slam-to-stamp **no longer auto-plays in the splash** — it plays when the user presses **Mulai** on the welcome card and transitions directly into onboarding (same animation + same SFX identity); (4) the wordmark stays **small at the bottom** per v2. Binding spec: **§1S-v3** below; module contract: `splash-prototype/CONTRACT.md`.
>
> **OWNER RULING (2026-08-28, binding — recorded as OA-4 in the master spec):** the §1 "PAW lights the logo" proposal **and its storyboard are REJECTED**. **m025-80 (no mascot on the splash) STANDS permanently** — this also retires the §1.6 splash-lite peek (any mascot on the splash violates m025-80). The OWNER's replacement design is binding and specified in **§1S "PAW STAMP"** below: (1) the F logo with its two gold bars appears first (existing motif); (2) the FIEZEL wordmark sits at the **bottom** of the screen at a **reduced size** (OWNER: the current wordmark is too big); (3) the closer is the **real paw glyph** (`assets/brand/fiezel-paw.svg` — the paw-print mark, *not* the cat mascot) slamming down like a stamp/seal and settling — the beat that hands off into onboarding. Animation quality bar: **maximum** — this is the user's first impression. §1 below is kept as history only; §2–§4 (onboarding companion) are unaffected by the ruling except where marked.

### 0.1 Historical governance note (pre-ruling, kept verbatim)

The current splash **deliberately contains no mascot**. OWNER decision **m025-80** ("undo pemakaian maskot saat splash, animasikan aja logo yang aku pilih") removed PAW from the splash and is recorded three times in `fiezel-splash.js` (lines 62, 200, 269) and confirmed in audit 03 (A.1 #1, takeaway 3). Two further OWNER decisions shape the current splash and would also be touched:

- **m025-88**: "animasinya terlalu cepat dan singkat" → choreography stretched to 2180 ms motion + 3400 ms visible (`fiezel-splash.js:43-46`).
- **m025-84/86**: one clock for motion + sound (`FiezelChoreography`), first-frame static markup, chime `windowMs` discipline.

~~**Therefore: Section 1 (PAW splash) is a proposal that reverses m025-80 and compresses the m025-88 dwell to fit the ≤ 2000 ms budget. It must not be implemented without explicit OWNER sign-off.** Section 1b (splash-lite) is the fallback that keeps the logo as the hero and adds only a minimal PAW moment; it still technically touches m025-80 (any PAW on the splash does) but respects its spirit — offer it to OWNER as the low-risk middle option. If OWNER declines both, the splash stays exactly as it is today and everything else in this document still stands.~~ *(Status struck 2026-08-28: OWNER declined both variants and issued the binding PAW STAMP design — see the ruling banner above and §1S.)*

Non-negotiables — carried unchanged into the binding §1S design:

- **Never delays app readiness.** The app boots behind the splash exactly as today: first-frame static markup in `index.html`, adoption by `FiezelSplash.show()`, elapsed-time subtraction, `MIN_TAIL_MS` floor, every exit through `dismissBootSplash()` (`app.js:3490-3500`). PAW is an overlay on that mechanism, never a precondition — see §1.4 degradation ladder.
- **Skippable.** Tap anywhere closes immediately (existing `host.addEventListener('click', close)`, `fiezel-splash.js:335`). PAW's sequence has no "must finish" phase.
- **One clock.** All PAW beats are rows in the same `FiezelChoreography` beats table that drives CSS delays and the chime — no second timing source (m025-86 rule).
- **Reduced motion = static composition** (§1.5), per the three-layer gates in audit 03 B.6 and master prompt §33.
- Rotation-free body language, closed palette, `fz-*` rig contract, transform/opacity only (selected-direction binding notes).

---

## 1. Splash sequence — "PAW lights the logo" — **REJECTED BY OWNER 2026-08-28**

> **STATUS: REJECTED.** The OWNER rejected this proposal and its storyboard (`storyboard-splash.svg/.png`, `storyboard-splash-lite.svg/.png` — both **superseded** by `storyboard-splash-v2.svg/.png`). m025-80 stands permanently. Nothing in §1.1–§1.6 may be implemented. Kept verbatim as design history; the binding replacement is §1S.

### 1.1 Concept

The current splash is a dark `#1B1418` "Bright Mind" field where the F-logo assembles to an F-major-add9 arpeggio. The proposal keeps that entire spine — same field, same logo beats, same chime notes — and adds PAW as the *witness who reacts to the brand being built*: PAW pops in first, looks toward where the logo will appear, and at the gold-bar beat (the A4 "colour tone", already the choreography's emotional peak per `fiezel-choreography.js` comments) throws the **welcoming spark** pose from Direction C. PAW doesn't replace the logo; PAW *reacts to* it. That preserves what OWNER liked about m025-80 (the logo is the event) while giving the app a character-first opening (master prompt §14).

Stage layout (dark field, portrait): PAW full-body at ~200 px (clamp `clamp(160px, 44vw, 220px)`), centered horizontally, vertically at ~30% height; logo stage at ~52%; wordmark + tagline below, unchanged. PAW's `#FFD94F` body pops maximally on `#1B1418` (audit 02 §1c) and the existing yellow halo (`fz-splash-halo`, `index.html:53`) now reads as PAW's ambient glow.

### 1.2 Timeline (hard budget: total ≤ 2000 ms, then exit) — ~~PROPOSAL~~ **REJECTED BY OWNER 2026-08-28**

All PAW motion is on the Direction C rig (params P1–P20, `direction-c-expressive.md` §4); expressions are the numbered tuples from its §3 table. Beats `b1–b8` are the existing choreography IDs with **compressed timings** (existing 2180 ms motion end → 1560 ms; ratio ≈ 0.72). New PAW beats are `p1–p4` and share the same clock/table. Pitches unchanged (F2 F3 C4 F4 A4 C5 G5).

| t (ms) | Beat | PAW (rig params) | Logo / type | SFX (same table) | Notes |
|---|---|---|---|---|---|
| −∞ → 0 | — | absent | Dark field + halo painted from frame 1 (static `index.html` markup) | — | App keeps booting behind; nothing here waits for JS |
| 0–300 | **p1 entrance** | Pop-up entrance: `fz-all` translateY 26→0 + scale 0.90→1.03→1 (spring `--fz-spring`), shadow opacity 0→.08. Expression **1 Neutral**, ears settling −4→0 | — | **F2 @ 0** (the low "weight" anchor doubles as PAW's landing thud — no new sound) | PAW enters *on* the bass note: character and sub-anchor are one event |
| 300–520 | **p2 idle beat** | One abbreviated breath (P1, single 220 ms cycle); ears at rest; tail slow sway ±4 | — | F3 @ 300 | The "alive before anything happens" beat — master prompt §14 "subtle idle" |
| 520–640 | **p3 blink + look** | Fast blink (P20, 70 ms) @ 520; then `lookAt` gaze P9 (+6, −3) toward the logo stage; near ear perk −8° (asym → expression **4 Curious** lite) | — | C4 @ 520 | PAW notices where the logo is about to appear; directs the viewer's eye |
| 640–1030 | b1–b3 | Holds Curious-lite; pupils (P8) track the F strokes as they draw (+4→+6 x) | F stem grows (b1 @ 640, dur 500), upper arm (b2 @ 780), lower arm (b3 @ 850) | F4 @ 640 | Logo beats compressed ~0.72×; PAW only *watches* — no competing motion |
| 1030–1330 | **p4 reaction** = b4–b5 | **Welcoming spark** (expression **13 Welcoming**): L arm P16 → +105° with pads (P18 on), ears −8/+4 asym, brows raised +4, mouth `open`, tail-tip P15 → +18 flick, head translate +2,−2 | Gold bar 1 rises (b4 @ 1030), gold bar 2 (b5 @ 1120) | **A4 @ 1030** — the colour tone | **The FIEZEL Character Signature slot (§26): gold bars + major-third + PAW's raised paw land on the same frame.** See §1.3 |
| 1330–1560 | b6–b7 | Settles to expression **2 Happy**: arm returns to rest (−105°→0 over 260 ms), lid-low 6 squint, mouth `smile`, tail-tip +8 hold | Gold shimmer sweeps (b6 @ 1330), wordmark rises (b7 @ 1400) | C5 @ 1330, G5 @ 1400 | PAW proud-calm while the name appears — character presents the brand, then yields to it |
| 1560–1700 | b8 | Still: breath only; one optional second blink @ ~1620 | Tagline rises (b8 @ 1560) | — (b8 has no pitch, as today) | The "expensive silence" beat, shortened from m025-88's full second |
| 1700–2000 | **exit** | `is-leaving`: whole splash fades 300 ms (`fzm-page-out`, existing). PAW exits *with* the field — no separate PAW exit animation (a second exit would double the read) | Everything fades | G5 tail rings through the fade | `endBootBackground()` fires at close start so cream app colors are revealed (existing behavior). Close timer at 2000 ms; tap closes earlier at any t |

**Timing accounting:** motion ends 1560 ms + 140 ms still + 300 ms exit = 2000 ms total. `VISIBLE_MS` proposal: **2000** (was 3400). `MIN_TAIL_MS` stays 900. Adopted-splash elapsed subtraction unchanged — on a slow boot the sequence is already mid-flight when `show()` adopts, exactly as today, and PAW's insertion is skipped if too little window remains (§1.4).

**OWNER flag:** this halves the m025-88 dwell. If OWNER prefers the longer dwell, the identical beat table stretches back (ratio 1.0 → motion end 2180, VISIBLE 3400) with zero design changes — the ≤ 2000 ms budget in this spec is the redesign brief's constraint, and the conflict between the two is OWNER's call to make, not ours to hide.

### 1.3 The signature moment (master prompt §26)

**FIEZEL Character Signature = the "PAW Spark" (canonical definition: 14 §4 as amended by 17 R-4):** raised open paw with pads + asymmetric ear perk + tail-tip flick, landing on the A4 major-third **at the same frame the gold accent enters the screen** — the Spark's splash instance. Colour in the chord, colour on the screen, and the character's gesture — three channels, one instant. Reuse policy (§26 "use this selectively", full allowlist in 17 R-4): splash (here), first greeting of a session, LEVEL_UP, and MILESTONE. Never on routine correct answers, never in onboarding steps 1–5; onboarding completion is OWNER-gated, default excluded — scarcity is what makes it a signature. No new audio asset: the signature *is* the existing motif's b4/b5 beats plus the pose; `FiezelUiSfx` stays the single engine (audit 03 C.4).

### 1.4 Never delays readiness — degradation ladder

PAW on the splash depends on `fiezel-mascot.js` (a `defer` script), while the splash's first frame is static HTML painted before any JS. PAW therefore joins **late by design**, and the design defines what happens at every readiness level:

1. **Mascot ready when `FiezelSplash.show()` adopts, and remaining window ≥ 1400 ms** → full sequence above; PAW's p1 starts at adoption, logo beats already in flight are *not* restarted (existing adoption rule) — PAW entrance simply syncs to the next un-played beat.
2. **Mascot ready but remaining window < 1400 ms** (slow boot ate the splash) → **splash-lite** (§1.6) — the peek fits in the `MIN_TAIL_MS` 900 ms floor.
3. **Mascot not ready** (cache miss, registration failure) → today's logo-only splash, unchanged. **No paw-icon fallback on the splash** — a static stamp where a character was promised reads as breakage; absence reads as intent.
4. **`seenToday` / non-forced call paths** → unchanged dispose logic (`disposeBootSplash`).

The splash never queries or waits on app data, content JSON, or the voice runtime. Close timer and tap-to-skip are independent of PAW entirely.

### 1.5 Reduced motion (master prompt §33; audit 03 B.6)

`fiezel-splash-still` (OS `prefers-reduced-motion`) → **static composition**: PAW standing full-body in the **static Welcoming pose** (the Direction C concept pose — readable with zero motion, checklist D3), logo fully assembled, wordmark + tagline in place; everything fades in via the existing `fz-fade-in` override (`index.html:74-78`), halo and shimmer off (existing rules). No blink loop, no confetti, no gaze. Chime: keep current behavior (audio is not motion; m025-81 chime already plays under still splash) — if OWNER wants sound tied to the motion setting, that's a one-line gate, noted as open question. App-level `body.reduce-motion` cannot apply yet (preferences load after boot) — OS query is the only gate at splash time, same as today.

### 1.6 Splash-lite variant (fallback honoring the spirit of m025-80) — **REJECTED BY OWNER 2026-08-28** (m025-80 permanent: no mascot on splash, however small)

**Logo-first, minimal PAW moment.** The entire current splash is untouched — same beats, same 3400 ms or compressed dwell, same everything. One addition:

- **The Peek:** at beat b7 (wordmark rise), a **head-crop PAW, 72 px** (head-crop placement pattern, `fiezel-motion.css:327-343`, shadow/confetti hidden) rises 14 px from behind the tagline baseline (translateY 14→0 + opacity 0→1, 260 ms `--fz-out`), expression **2 Happy** (lid-low 6, smile). One blink at b8. Exits with the field.
- Rules: ≤ 88 px, below the wordmark (logo remains the hero), **no added SFX**, no gesture, no pose change. Under reduced motion the head is simply present, static. Under degradation ladder step 3, it's absent.
- Cost: one `<fiezel-mascot>` (or generated static head export) inside the splash body + ~6 lines of CSS; no choreography change, no `VISIBLE_MS` change.

~~Splash-lite is what to ship if OWNER wants PAW back only quietly; the full §1.2 sequence is what to ship if OWNER wants the character-first opening of master prompt §14.~~ *(Struck 2026-08-28 — neither ships. §1S ships.)*

---

## 1S. Splash sequence — "PAW STAMP" (auto-slam) — **SUPERSEDED BY OWNER v3 (2026-08-28)**

> **STATUS: SUPERSEDED BY OWNER RULING v3 (2026-08-28, "PARTICLE FORMATION + PAW STAMP ON MULAI") — kept verbatim as history; do not implement.** What changed: the b1–b7 CSS letterform build is replaced by a particle point-cloud formation (§1S-v3.3 P1–P2); the b6 gold sheen sweep is **deleted outright** (no replacement); the s1–s4 auto-slam beats are removed from the splash timeline — the slam now fires on the user's **Mulai** press (§1S-v3.3 P5) and transitions straight into onboarding. Still carried forward from this section unchanged: the small bottom wordmark (§1S.1/§1S.3 P2 sizing), the paw glyph geometry + splash gold recolor (§1S.7), the slam choreography itself (squash 1.12/0.84, rings, ≤3px Y shake — now Mulai-triggered), and the thud SFX identity (§1S.4, retuned per §1S-v3.5). The binding replacement is **§1S-v3**.

### 1S.1 Concept & stage layout

The splash stays a character-free brand opening (m025-80 permanent) with **three acts and one closer**: the F logo builds to the F-major-add9 motif exactly as today; the FIEZEL wordmark rises **small, at the bottom** of the screen; then the **real paw glyph** — the four toe-bars + heel pad of `assets/brand/fiezel-paw.svg`, the same geometry as `ICONS.paw` — drops into the open center of the field and **slams down like a stamp**, the seal on the brand plate. The metaphor is a document being stamped: logo = the mark, wordmark = the signature, paw = the seal. The stamp is the closing beat; its settle is what hands off into onboarding.

Stage layout (dark `#1B1418` "Bright Mind" field, portrait, existing radial gradient + halo unchanged):

| Element | Position | Size |
|---|---|---|
| F logo (`logoMarkup()`, unchanged geometry) | upper-center, existing grid row (`1fr` row centers it ~38–40% height) | `min(46vw,190px)` — **unchanged** |
| Paw glyph (new, `§1S.7`) | centered horizontally; glyph center at **~58% viewport height** — the visual midpoint of the gap between the logo stage and the wordmark block | `clamp(96px, 24vw, 120px)` |
| FIEZEL wordmark | bottom block; grid padding-bottom **`17vh` → `max(6vh, 44px)` + safe-area inset** — genuinely at the bottom, per OWNER | **`min(30vw, 132px)`** (was `min(52vw, 238px)` — see §1S.3 P2 for the quantified reduction) |
| Tagline `ADAPTIVE ENGLISH` | 10px under the wordmark (was 14px) | font-size **9px** (was 12px), letter-spacing `.34em` (was `.30em`) |

### 1S.2 Timeline (hard budget: total ≤ 2000 ms; skippable at any t; app boots behind)

One clock (m025-86): beats `b1–b8` keep their IDs; `b1–b7` are the shipped `FiezelChoreography` rows **compressed ≈0.62×** (shipped b7 @1060 → 660) to buy the tail for the stamp; `b8` (tagline) is retimed to ride b7's window (tagline rises 120 ms after the wordmark, same bottom block). New stamp beats are `s1–s4`, rows in the **same** BEATS table (`--fz-s1..s4` custom properties; `pitch: null` except s2). Pitches unchanged: F2 F3 C4 F4 A4 C5 G5 — plus one new **thud** slot (§1S.4).

| t (ms) | Beat | dur | Visual | SFX | Notes |
|---|---|---|---|---|---|
| −∞ → 0 | — | — | Dark field + halo painted from frame 1 (static `index.html` markup; paw glyph markup present but opacity 0) | — | App keeps booting behind; nothing waits for JS |
| 0 | b1 | 460 | F stem grows down (`fz-logo-stem`) | **F2** | the low "weight" anchor |
| 120 | b2 | 380 | F upper arm extends (`fz-logo-arm`) | F3 | |
| 180 | b3 | 380 | F lower arm extends | C4 | |
| 270 | b4 | 500 | Gold bar 1 rises (`fz-logo-bar`) | F4 | |
| 330 | b5 | 500 | Gold bar 2 rises | **A4** — the colour tone | gold + major third on the same frame (kept) |
| 520 | b6 | 760 | Gold sheen sweeps the logo once | C5 | |
| 660 | b7 | 420 | **Small wordmark settles at the bottom** (`fz-splash-settle`, travel 15px→9px) | **G5** — add9, rings long | seated at 1080 — 150 ms before contact; b8 tagline fades up at 780 (b7+120), no own pitch |
| 900 | **s1** | 240 | **Anticipation:** paw glyph fades in 0→.92 **raised 44px above its seat**, scale 1.16 — hangs there ~90 ms after the fade (the inhale) | — (deliberate silence before impact) | eye is pulled to the hovering seal |
| 1230 | **s2** | 350 | **SLAM (contact = the beat):** drop leads the beat by exactly 90 ms (`animation-delay: calc(var(--fz-s2) − 90ms)`), travel 44px, ease-in accelerate; **at contact:** squash scaleX 1.12 / scaleY 0.84, shockwave ring, micro screen-shake, halo flare (§1S.3 P4) | **STAMP THUD** (new slot, §1S.4) | the audible event and the visible landing share the frame |
| 1320 | **s3** | 260 | **Settle:** spring recovery 1.12/0.84 → 1.02 → 1.00 (`--fz-spring`); ring finishes fading by 1650 | — | thud tail decays under the settle |
| 1580 | **s4** | 120 | **Still.** Complete composition: logo + seated seal + small wordmark. Nothing moves | — | the "expensive silence" beat (m025-88's dwell, compressed — see accounting note) |
| 1700–2000 | exit | 300 | `is-leaving` fade (`fzm-page-out`, existing); `endBootBackground()` at close start; boots into onboarding | G5 + thud tails ring through the fade | close timer 2000; tap closes earlier at any t |

**Timing accounting:** last motion (s3 settle) ends 1580; ring opacity fade ends 1650; still to 1700; exit to 2000. `VISIBLE_MS`: **2000** (was 3400). `MIN_TAIL_MS` stays **900**. Adopted-splash elapsed subtraction unchanged. **m025-88 note:** the OWNER's 2026-08-28 ruling accepts this timeline inside the ≤ 2000 ms brief; the table is ratio-parametric — if OWNER later wants the longer dwell back, all `at`/`dur` values stretch uniformly with zero design changes.

### 1S.3 Per-phase motion spec (quality bar: maximum — transform/opacity only, no filters, no rotation)

**P1 — F logo entrance + gold bars (0–830 ms).** Unchanged mechanics, retimed: stem `fz-logo-stem` scaleY 0→1 (origin top-center), arms `fz-logo-arm` scaleX 0→1 (origin left-center), all on `cubic-bezier(.22,.8,.28,1)`; gold bars `fz-logo-bar` scaleY .08→1.035→1 (origin center-bottom) on `cubic-bezier(.2,.9,.3,1)`; sheen `fz-logo-sheen` translateX −130%→130% on `cubic-bezier(.3,.7,.3,1)`. Durations scale with the 0.62 table (§1S.2 dur column).

**P2 — Small bottom wordmark reveal (660–1080 ms).** OWNER: current wordmark is too big. Quantified: current `.fiezel-splash-brand .fiezel-splash-word` is `width:min(52vw,238px)` → at a 390px reference viewport it renders **202.8px**; the binding size is **`width:min(30vw,132px)`** → **117px** at the same viewport — a **42% reduction** (cap reduced 45%: 238→132). Vertical: grid padding-bottom `17vh` → **`calc(max(6vh,44px) + env(safe-area-inset-bottom))`** so the wordmark block genuinely hugs the bottom. Entrance keeps `fz-splash-settle` (opacity 0→1 + translateY + scaleX 1.045→1) with travel reduced 15px→**9px** — smaller mass, smaller travel — `.42s cubic-bezier(.22,.8,.28,1)` at `var(--fz-b7)`. Tagline: `fz-splash-rise` travel 13px→8px at b7+120 ms, 9px/.34em (§1S.1). Overlap discipline: the wordmark is at full opacity and sub-2px residual motion by 900 ms (when s1 begins) and **fully seated at 1080 ms — 150 ms before the slam contact** — so the stamp never lands against a moving background.

**P3 — Paw anticipation (s1, 900–1140 ms).** The glyph appears already aligned over its seat: opacity 0→.92 and translateY(−44px) scale(1.16), fading in over 240 ms `--fz-out` (`cubic-bezier(.22,.8,.28,1)`), then hangs ~90 ms. No approach path, no arc — a stamp is lifted, not thrown. Halo continues its ambient pulse beneath it.

**P4 — Slam + impact (contact at 1230 ms).** Drop: translateY −44px→0 with scale 1.16→1.00 over **90 ms** on `cubic-bezier(.6,.04,.98,.34)` (pure acceleration; arrival is the frame of contact). On contact, four synchronized effects, all keyed to `var(--fz-s2)`:
1. **Squash:** scaleX 1.12 / scaleY 0.84, transform-origin center; held ~50 ms, then released into the s3 spring. Opacity snaps .92→1 at contact (the seal "takes").
2. **Shockwave ring:** one circle, stroke `#FFC700` 2px, no fill, centered on the glyph; scale .35→1.55 (final diameter `min(60vw,320px)`) + opacity .55→0 over **420 ms** `cubic-bezier(.17,.84,.44,1)`; `pointer-events:none`; single fire, never loops.
3. **Micro screen-shake (within taste):** on `.fiezel-splash-body` (never the host — the host owns safe-area padding): translateY keyframes 0 → +3px (20%) → −2px (45%) → +1px (70%) → 0, total **180 ms**, linear steps eased by the keyframe spacing. Vertical-dominant (a stamp pushes *down*), amplitude ≤3px, one fire. No horizontal jitter — that reads as error, not weight.
4. **Halo flare:** one 240 ms opacity pulse of the existing `::before` halo (.22→.50→.22), same radial gradient — the field itself registers the impact.

**P5 — Stamp settle (s3, 1320–1580 ms).** Squash releases through `--fz-spring` `cubic-bezier(.34,1.56,.64,1)`: 1.12/0.84 → 1.02 uniform → 1.00 over 260 ms (the overshoot is the spring's, not a second keyframe). The glyph ends bit-perfect at rest scale 1, opacity 1, its center on the §1S.1 seat. Nothing else moves during the settle — one hero channel.

**P6 — Transition to onboarding (1700–2000 ms).** Existing exit exactly: `is-leaving` → `fzm-page-out` 300 ms; `endBootBackground()` fires at close start so cream app colors are revealed under the fade; `opts.onClose` sequences onboarding as today. The settled seal is the last thing the eye holds — the stamp closes the splash, onboarding opens the app.

**Easing summary:** build = `cubic-bezier(.22,.8,.28,1)` / bars `cubic-bezier(.2,.9,.3,1)` (existing); anticipation fade = `cubic-bezier(.22,.8,.28,1)`; drop = `cubic-bezier(.6,.04,.98,.34)`; ring = `cubic-bezier(.17,.84,.44,1)`; settle = `cubic-bezier(.34,1.56,.64,1)`; exit = `ease-in` (existing `fzm-page-out`).

### 1S.4 SFX mapping (one engine, one clock)

The existing F-major-add9 motif is reused beat-for-beat on b1–b7 (F2 F3 C4 F4 A4 C5 G5 — same `role` values `sub/strike/strike/strike/colour/shimmer/add9`). One new slot:

- **STAMP THUD (s2, role `thud`)** — synthesized inside `FiezelUiSfx` (single-engine rule, audit 03 C.4), scheduled from the same BEATS table row as s2 (`at: 1230`). Recipe: (a) sine **F2 87.31 Hz gliding down to ~49 Hz over 120 ms** (the existing anchor voiced as percussion — no new pitch class enters the chord world) + (b) a band-limited noise transient, ~12 ms attack / 90 ms decay, low-passed ~900 Hz. Peak level −6 dB under the motif master; everything decayed by ≤300 ms so the G5 add9 tail stays the harmonic ceiling. `windowMs` discipline unchanged: if audio never unlocks during the splash, the thud is **discarded, never queued** (m025-84).
- s1 and s4 are deliberately silent — the inhale before the impact and the stillness after it are part of the sound design.
- Skip/close: `cancelChime()` already kills pending motif notes; the thud rides the same cancellation.

### 1S.5 Reduced motion (master prompt §33; audit 03 B.6)

`fiezel-splash-still` → **static composition**: logo fully assembled, small wordmark + tagline seated at the bottom, paw glyph **already stamped** — at rest scale 1, full opacity, on its seat. Everything fades in via the existing `fz-fade-in` override **on the same beats** (assembly reads without one pixel moving, per the m025-88 lesson). No drop, no squash, **no ring, no screen-shake, no halo flare** (all four are motion-only nodes; ring/flare additionally match the existing "halo & sheen off" rule). Audio unchanged (audio is not motion — m025-81 precedent; the motif and the thud both play, the thud simply lands on an already-seated seal). The chime-under-reduced-motion open question stays open, unchanged by this ruling.

### 1S.6 Degradation ladder (never delays readiness)

Radically simpler than the rejected mascot design: the paw glyph is **~5 inline SVG rects/paths in the static `index.html` markup** — no JS module, no component registration, no readiness dependency at all. The full sequence is CSS-only from first paint.

1. **Normal boot:** static first-frame markup carries logo + wordmark + paw glyph (opacity 0); `--fz-b*`/`--fz-s*` defaults live in the critical CSS, so every beat — including the slam — runs before any JavaScript executes. `FiezelSplash.show()` adopts, never restarts beats in flight.
2. **Slow boot (adoption late):** elapsed subtraction + `MIN_TAIL_MS` 900 floor unchanged. If the remaining window closes before contact (~1230 ms), the close simply fades whatever state the CSS clock reached — acceptable by design, because the reduced-motion end-state (§1S.5) proves the static composition reads on its own. Beats are never re-run or re-timed to "fit".
3. **`FiezelUiSfx` missing / audio locked:** silent splash, visuals unchanged (existing behavior; thud discarded per windowMs).
4. **`seenToday` / non-forced paths:** `disposeBootSplash()` unchanged.
5. **Tap-skip at any t** — including mid-slam: `close()` immediately; `cancelChime()` discards the unplayed thud. The stamp has no "must finish" phase.

### 1S.7 Paw glyph: geometry and splash recolor

**Geometry is `assets/brand/fiezel-paw.svg`, exact and untouched** (the paw-print mark, single shape source with `ICONS.paw`, guarded by `tests/paw-mascot-test.js`): viewBox `0 0 24 24`, four toe bars `(4.6,7.5,3.1,4.6) (8.9,5.1,3.1,7) (13.2,3.4,3.1,8.7) (17.5,6.2,3.1,5.9)` all rx 1.55, plus the heel-pad path. **Recolor for the splash field (binding):** the source fill `#2B2118` is invisible on `#1B1418` (≈1.1:1); on the splash the glyph is filled with the **existing splash gold gradient** `fzsGold` (`#FFDE59 → 45% #FFC700 → #E6A800`, vertical) — the seal echoes the two gold bars, and gold-on-dark is the field's established accent pair (audit 02 §1c). Ivory is reserved for letterforms; the paw is an accent event. No stroke, no shadow, no third color. Everywhere else in the product the glyph keeps its themed `ICONS.paw` fill — this recolor is splash-scoped only.

### 1S.8 Assets, wiring & gates (supersedes §4.1 rows A1–A5/A9 and §4.2 E7 for the splash)

| # | Item | Notes |
|---|---|---|
| S-A1 | Paw-glyph markup in `markup()` + static twin in `index.html` first-frame block | Inline SVG, gold-gradient fill (§1S.7), `aria-hidden` (decorative — the logo already carries the FIEZEL label) |
| S-A2 | Keyframes: `fz-stamp-in` (anticipation fade), `fz-stamp-drop`, `fz-stamp-squash`, `fz-stamp-ring`, `fz-stamp-shake`, `fz-halo-flare` | Transform/opacity only; drop delay = `calc(var(--fz-s2) − 90ms)` |
| S-A3 | `FiezelChoreography` BEATS: b1–b7 retimed (≈0.62×), b8 retimed to b7+120, new rows s1–s4 (`--fz-s1..s4`; s2 `role:'thud'`) | One-clock rule; `index.html` CSS defaults updated identically |
| S-A4 | `FiezelUiSfx`: `thud` voice (§1S.4) scheduled from the beats table | Single-engine rule |
| S-A5 | `VISIBLE_MS` 3400 → 2000 in `fiezel-splash.js` | m025-88 note in §1S.2 |
| S-A6 | Reduced-motion overrides for the six new keyframes (§1S.5) | Extends the existing `.fiezel-splash-still` block |
| S-G1 | `tests/splash-choreography-test.js` updated in the same change (beat table ↔ index.html identity, incl. s-rows) | |
| S-G2 | `tests/splash-first-paint-test.js`: assert paw markup present in static block | |
| S-G3 | `tests/paw-mascot-test.js` glyph-coordinate gate now also covers the splash instance (same rect set) | |
| S-G4 | No `<fiezel-mascot>` anywhere in splash markup — a greppable m025-80 guard | |

The former OWNER-approval flag (§4.2 E7, `splash: 'paw'|'lite'|'logo'`) is **retired** — there is exactly one splash ~~and it is this one~~ *(v3 note: and it is §1S-v3; the S-A/S-G rows above are superseded by §1S-v3.9 except S-G3/S-G4, which carry forward)*.

---

## 1S-v3. Splash sequence — "PARTICLE FORMATION + PAW STAMP ON MULAI" (OWNER ruling 2026-08-28, OA-5) — **MULAI GATING SUPERSEDED BY v4 (OA-6, same day)**

> **STATUS (v4, 2026-08-28):** §1S-v3.1–§1S-v3.6 remain the binding design for the formation/equalizer/wordmark acts and the slam grammar; but every clause that stops the splash on a **welcome card / Mulai press** is **SUPERSEDED by §1S-v4** (kept verbatim as history): the §1S-v3.1 layout rows "Welcome card + Mulai" and "Paw glyph (Mulai-armed)", the §1S-v3.2 rows "1900–2100 SETTLE/WELCOME" (card clause only) and "user press MULAI → STAMP", §1S-v3.3 P4's card crossfade + P5's `arm(mulaiButton)` trigger, §1S-v3.7's rest-state skip target, and gate **V3-G3 (no-autoplay)** — v4 *requires* the auto-play at 2200. The ≤1400ms press→onboarding budget becomes the stamp-duration budget (start→onboarding-enter 830ms, unchanged choreography).
>
> Normative companion: `splash-prototype/CONTRACT.md` (module contract — shared `window.FZSplash` API, file ownership, master timeline). Where this section and the CONTRACT state the same value, the CONTRACT is the implementation-facing source; this section is the design record. Both were issued together and do not conflict.

### 1S-v3.1 Concept & stage layout

A character-free brand opening (m025-80 permanent) in **three acts and one user-triggered closer**: (1) a futuristic **particle point-cloud** — scattered gold/cream dots — converges into the F letterform, the F locking crisp while the two gold bars are still loose particles; (2) the instant the bars solidify they **become an equalizer**, bouncing to the motif beats — the logo literally plays its own chime; (3) the equalizer settles back to the exact logo proportions as the splash crossfades to the **welcome card** (logo persists above it, small wordmark at the bottom); (4) the **paw slam-to-stamp is now the user's act**: pressing **Mulai** fires the v2 slam sequence and the expanding stamp IS the transition into onboarding — no dead time, no auto-play. The metaphor upgrades from "a document being stamped" to "the user stamps the document": the brand assembles itself, the learner seals the deal.

Stage layout (dark `#1B1418` "Bright Mind" field, portrait — **no halo, no sheen, no glow layers of any kind**, deleted by OWNER):

| Element | Position | Size |
|---|---|---|
| Particle canvas (`js/particles.js`) | full-viewport layer under the logo stage | ~1400–2200 points, 1–2.5px, adaptive to devicePixelRatio/mobile |
| F logo + two gold bars (exact `assets/fiezel-icon.svg` geometry; crisp SVG layer crossfaded in at lock) | upper-center, existing grid row (~38–40% height) | `min(46vw,190px)` — unchanged |
| Equalizer takeover (`js/equalizer.js`) | in place of the two bars, same rects, pivot bottom | scaleY-only; at rest = exact logo proportions |
| Welcome card + **Mulai** button | center-lower, crossfades in at 1900–2100 | existing welcome-card sizing |
| FIEZEL wordmark | bottom block, per v2: padding-bottom `calc(max(6vh,44px) + env(safe-area-inset-bottom))` | **`min(30vw,132px)` — unchanged from v2** (§1S.3 P2 quantification still binding) |
| Paw glyph (Mulai-armed, hidden until press) | slam seat over the welcome card region | `clamp(96px, 24vw, 120px)`; geometry + gold recolor per §1S.7 (unchanged) |

### 1S-v3.2 Timeline (binding — one clock, `FZSplash.clock`; splash rests on the welcome card until Mulai)

Phases SCATTER → CONVERGE_F → F_LOCKED → CONVERGE_BARS → HANDOFF(`bars-solid`) → EQUALIZER → SETTLE/WELCOME are the particle-engine states from the CONTRACT. The splash no longer has a fixed exit timer: after 2100ms it **rests** on the welcome card; the closer is user-triggered.

| t (ms) | Phase | Visual | SFX (`FZSplash.sfx`) | Notes |
|---|---|---|---|---|
| −∞ → 0 | — | Dark field painted from frame 1 (static first-frame markup; canvas mounts over it) | — | app boots behind; nothing waits on JS |
| 0 | SCATTER | Full point-cloud visible: gold `#F0C241`/`#FFD94F` + cream `#FFF4DA` dots, 1–2.5px, slight curl-noise swirl; **no glow/bloom** | **F2 @0** (the low "weight" anchor — ignition) | the swirl is ambient, not directional yet |
| 0–950 | CONVERGE_F | Particles converge onto F target points (sampled from the real SVG rects); **stem biased earlier than arms**; F visually complete ~950 — particles snap to targets + crossfade to the crisp SVG F layer (orchestrator swaps opacity) | F3 @300 · C4 @520 ride the convergence | the F is readable in silhouette from ~700 |
| 700–1150 | CONVERGE_BARS | While the F finishes, **bar particles gather** into the two bar rects — the bars are recognizably "becoming" while the F is already solid (the OWNER's ordering: F first, bars still particles) | F4 @950 as the F locks | overlap 700–950 is deliberate: no dead air between acts |
| 1150 | HANDOFF | Bars solidify → `FZSplash.events.emit('bars-solid')` → `equalizer.start(t)` takes the two rects over on the same frame | **A4 @1150 — the colour tone**: gold bars turn solid + major third on the same frame (signature kept, relocated) | particles layer fades/retires ≤150ms after handoff |
| 1150–1900 | EQUALIZER | Two bars bounce as an audio equalizer — scaleY-only, pivot bottom, choreographed to the `FZSplash.sfx.beats` table (motif-synced, `eq-tick` accents); optional ghost bar default OFF | C5 @~1400 · `eq-tick` accents on beat rows | wordmark reveals bottom **1200–1500** (small, per v2 sizing) |
| 1900–2100 | SETTLE / WELCOME | `equalizer.settle()` eases bars to the **exact logo proportions**; splash crossfades to the **welcome card** (logo persists above the card) | **G5 @1900** — add9, rings under the welcome card | last autonomous motion ends 2100; splash rests here |
| user press | **MULAI → STAMP** | `pawstamp.play()`: v2 slam sequence (anticipation 240ms → slam contact: squash 1.12/0.84, double shockwave rings, ≤3px Y shake, 3 debris dots → seal settle −6° ink-spread → **stamp expands as the transition**) → `onboarding-enter` | **STAMP THUD** at contact (§1S-v3.5) | **press → onboarding visible ≤ 1400ms**, no dead time |

**Timing accounting:** F complete 950 · bars solid 1150 · equalizer 750ms window · settle+welcome 200ms → autonomous motion ends **2100ms**. The v2 `VISIBLE_MS`/close-timer model is **retired**: the splash surface persists as the welcome surface and exits only through the Mulai stamp (or reduced-motion equivalent). 60fps quality bar; transform/opacity/canvas only; single clock (`FZSplash.clock` in the prototype; the one-clock rule m025-86 carries to the `fiezel-splash.js` port).

### 1S-v3.3 Per-phase motion spec (quality bar: first impression — 60fps, transform/opacity/canvas only)

**P1 — Particle scatter → F formation (0–950ms, canvas).** ~1400–2200 points (adaptive: devicePixelRatio and mobile tiers, §1S-v3.8), sizes 1–2.5px, palette strictly gold `#F0C241`/`#FFD94F` + cream `#FFF4DA` on the `#1B1418` field — no new colors, **no glow/bloom/shadowBlur** (deleted-sheen rule extends to canvas effects). Targets are Point[] sets sampled from the real SVG geometry (`{f, bar1, bar2}` — offscreen alpha sampling or hardcoded rect sampling of the `fiezel-icon.svg` logo rects). Motion: curl-noise swirl during convergence (organic, futuristic — not linear tweens); per-particle eased approach with **stem-target particles arriving earlier than arm-target particles** so the F builds stem-first like the original b1–b3 read. Completion: particles snap to targets, then a ≤120ms opacity crossfade swaps in the crisp SVG F layer — the eye never sees a soft F.

**P2 — Bar gathering (700–1150ms, canvas).** Bar-target particles begin converging at 700 while the F is finishing — at ~950 the composition reads "solid F + two bars still made of dots." Gathering tightens through 1150; the moment both bar rects reach solidity threshold, `bars-solid` fires. This ordering (F first, bars still particles) is the OWNER's explicit beat and is gate-checked (§1S-v3.9).

**P3 — Equalizer takeover (1150–1900ms, DOM/SVG).** On `bars-solid`, `FZSplash.equalizer` owns the two bar rects: **scaleY-only** transforms, transform-origin bottom (bars grow up from their baseline like meter bars), choreographed to the `FZSplash.sfx.beats` table so every visible bounce lands on a motif beat or an `eq-tick` accent — the bars "continue the F's stem into a sound wave" made literal. Amplitude envelope: rises through 1150–1500, eases 1500–1900. Two bars only (a ghost third bar is default OFF and legal only if it still reads as the two-bar mark). Wordmark reveals at the bottom 1200–1500 with the v2 `fz-splash-settle` treatment (travel 9px, small size — all §1S.3 P2 values carry unchanged).

**P4 — Settle + welcome (1900–2100ms).** `equalizer.settle()` eases both bars to the exact logo proportions (bit-perfect rest = the brand mark); the welcome card crossfades in beneath the persisting logo. Nothing else moves during the settle — one hero channel. The splash now **rests**: logo + wordmark + welcome card + Mulai, indefinitely, zero ambient animation (no halo pulse — deleted).

**P5 — Mulai → paw slam-to-stamp (user-triggered, ≤1400ms press→onboarding).** `pawstamp.arm(mulaiButton)`; on press: the v2 slam choreography, unchanged in identity, relocated and retargeted over the welcome card — anticipation 240ms (glyph fades in raised, scale 1.16, welcome card dims); drop ~90ms pure acceleration; **contact**: squash scaleX 1.12 / scaleY 0.84, **double shockwave rings** (staggered ~80ms), micro screen-shake ≤3px Y-only, **3 debris dots** (gold, ballistic, ≤300ms life); seal settle with **−6° ink-spread** rotation-settle into the stamped pose. All easings per §1S.3 P4/P5 (drop `cubic-bezier(.6,.04,.98,.34)`, spring `cubic-bezier(.34,1.56,.64,1)`).

**P6 — Stamp expand → onboarding (inside the same ≤1400ms).** The settled stamp **expands as the transition itself** (scale+opacity mask into the onboarding surface — no separate fade beat), `FZSplash.events.emit('onboarding-enter')`, onboarding step 1 renders. Press → onboarding fully visible ≤ **1400ms**, no dead time between settle and expand.

### 1S-v3.4 Deleted sheen (binding negative spec)

The **gold sheen/halo/glow after the F and bars is DELETED by OWNER** ("bayangan emas"): the `fz-logo-sheen` sweep (v2 beat b6), the halo flare on slam contact (v2 P4-4), the ambient halo pulse, and any hero-glow/bloom layer — including canvas `shadowBlur`/composite-glow on particles — are **gone entirely, with no replacement beat**. The C5 pitch that rode b6 is reassigned into the equalizer window (§1S-v3.2). Greppable guard: no `fz-logo-sheen`, `fz-halo-flare`, or glow/bloom node may exist in splash markup/CSS/canvas code (gate §1S-v3.9).

### 1S-v3.5 SFX mapping (one engine, one clock — identity unchanged)

The F-major-add9 motif is kept, remapped to the v3 events: **F2 @0** (scatter ignition) · F3 @300 · C4 @520 (convergence) · **F4 @950** (F locks) · **A4 @1150** (bars-solid — the colour tone lands on the gold event, signature preserved) · C5 @~1400 (equalizer peak) · **G5 @1900** (add9 under the settle/welcome). New: **`eq-tick`** — short, low-level equalizer accents on beat-table rows between 1150–1900, ≥−12dB under the motif. **STAMP THUD identity unchanged from v2** in role and recipe family, retuned per the CONTRACT: sine **F2 sub 110→48Hz** + band-limited noise transient, fired at slam contact inside the Mulai sequence; −6dB under motif master, tail ≤300ms. Voice names: `f2,f3,c4,f4,a4,c5,g5,thud,eq-tick` (`FZSplash.sfx.play(name)`, beats table `FZSplash.sfx.beats`); WebAudio only, no assets, muted-by-default toggle hook. Silence discipline: the settle (P4) and the anticipation before contact stay silent — unchanged sound-design principle. Skip/close cancels pending notes; a thud is never queued if audio is locked (m025-84 carries over).

### 1S-v3.6 Reduced motion (master prompt §33; audit 03 B.6)

`prefers-reduced-motion` → **static formed composition**: crisp F + solid bars at exact logo proportions + small bottom wordmark + welcome card, all faded in — **no particles, no equalizer, no swirl** (canvas never mounts). **Mulai still works** and triggers a **reduced paw appearance: the stamped glyph fades in already-seated — no slam, no drop, no rings, no shake, no debris** — then a plain crossfade into onboarding (≤1400ms budget still holds). Audio unchanged (audio is not motion — m025-81 precedent; the motif may play over the static comp, thud plays on the reduced stamp). The chime-under-reduced-motion open question (§4.4-3) stays open.

### 1S-v3.7 Skip behavior

**Tap anywhere pre-welcome jumps to the welcome card** — skip no longer exits the splash (there is no auto-exit to race); it fast-forwards to the resting state: particles retired, F + bars solid at logo proportions, wordmark seated, welcome card up. Pending motif notes are cancelled (the G5 settle note may still voice the arrival). From the welcome card onward the only affordance is Mulai (plus any existing secondary card actions); the stamp sequence itself has **no skip** — at ≤1400ms it is below the skip-worthiness threshold, and a tap during it is swallowed (no double-fire, no restart).

### 1S-v3.8 Degradation ladder (never delays readiness)

1. **Normal:** full sequence; canvas particle count adaptive ~1400–2200 by devicePixelRatio/viewport.
2. **Low-end tier 1 (fewer particles):** weak devices (low `hardwareConcurrency`/`deviceMemory`, or a first-100ms frame-time probe > budget) → particle count drops to **~500–700**, curl-noise simplified to one octave; same timeline, same targets — the formation reads identically at arm's length.
3. **Low-end tier 2 (static formation fallback):** canvas unavailable, WebGL/2D context failure, or tier-1 still missing frame budget → **skip the particle phase entirely**: crisp F + bars fade in on the 0–950 window (the reduced-motion formation path reused), equalizer still runs (DOM scaleY is cheap); everything downstream unchanged.
4. **JS dead / boot race:** static first-frame markup shows field + formed logo + wordmark; the welcome card renders on boot completion; Mulai falls back to a plain crossfade into onboarding. The splash never blocks or delays app readiness — boot continues behind at every tier (existing adoption/`MIN_TAIL_MS` mechanics carry over to the port).
5. **Audio locked/missing:** silent splash, visuals unchanged; thud discarded, never queued.

### 1S-v3.9 Modules, wiring & gates (supersedes §1S.8 rows for the splash)

| # | Item | Notes |
|---|---|---|
| V3-A1 | `js/particles.js` — engine + F formation + bar gathering (phases SCATTER→CONVERGE_F→F_LOCKED→CONVERGE_BARS→HANDOFF) | canvas-only layer; emits `bars-solid`; targets sampled from real SVG geometry |
| V3-A2 | `js/equalizer.js` — bar takeover: `init/start/update/settle`, scaleY-only, beat-table-driven | settle = exact logo proportions |
| V3-A3 | `js/pawstamp.js` — `arm(mulaiButton)` → v2 slam → stamp-expand → `onboarding-enter` | ≤1400ms press→onboarding |
| V3-A4 | `js/sfx.js` — beats table + `f2…g5,thud,eq-tick` voices, muted-by-default hook | WebAudio only, single engine |
| V3-A5 | Orchestrator (integrator-owned): `FZSplash.clock`, layer crossfades (particle→SVG F), welcome card, skip handling | phase-2 integration; subagents ship dev harnesses |
| V3-G1 | **No-sheen gate:** grep-level assert — no `fz-logo-sheen`/halo-flare/glow/bloom/`shadowBlur` in splash code | §1S-v3.4 |
| V3-G2 | **Ordering gate:** at t=950± the F layer is crisp while bar rects are below solidity threshold; `bars-solid` fires 1150± | the OWNER's F-first beat |
| V3-G3 | **No-autoplay gate:** `pawstamp.play()` unreachable except via the armed Mulai handler | ruling item 3 |
| V3-G4 | **Budget gate:** press→`onboarding-enter` ≤ 1400ms in integration test | |
| V3-G5 | §1S gates S-G3 (glyph geometry) and S-G4 (no `<fiezel-mascot>` in splash markup) carry forward unchanged | m025-80 guard stays greppable |

---

## 1S-v4. Splash sequence — "AUTO-FLOW: PARTICLE FORMATION → PAW STAMP → ONBOARDING" (BINDING, OWNER ruling 2026-08-28, OA-6)

> Normative companion: `splash-prototype/CONTRACT.md` (v4 banner + v4 master timeline). Implementation reference: `splash-prototype/` (js/splash.js orchestrator, js/pawstamp.js `arm(null)`/`play()`/`skip()`), QA evidence `splash-prototype/dev/qa-v4/`.

### 1S-v4.1 Concept

The brand assembles itself **and seals itself**: the point-cloud forms the F, the bars play the motif as an equalizer, the composition settles to the exact mark — and then the paw stamp slams down **on its own** as the closing beat, the expanding stamp carrying the user straight into onboarding. The v3 metaphor ("the user stamps the document") is retired with the button; v4 reads as "the brand stamps itself, then hands you the pen." Everything the user could previously do with Mulai now happens for them; everything they could skip they can still skip (tap/Enter at any time fast-forwards).

### 1S-v4.2 Timeline (binding — one clock, `FZSplash.clock`; no rest state, no user gate)

| t (ms) | Phase | Visual / event | Notes |
|---|---|---|---|
| 0–950 | CONVERGE_F | unchanged from §1S-v3.2 | crisp SVG F crossfade 820–944 |
| 700–1150 | CONVERGE_BARS → HANDOFF | unchanged; `bars-solid` @1150 → equalizer | |
| 1150–1900 | EQUALIZER | unchanged; wordmark reveals 1200–1500 | |
| 1900–2140 | SETTLE | `equalizer.settle()` — bars ease to exact logo proportions; **no welcome card** — the centered logo + wordmark composition simply holds | logo is never lifted (v3 card-lift retired) |
| **2200** | **AUTO STAMP** | `pawstamp.play()` fires from the orchestrator schedule — **60ms after settle completes (≤120ms max gap, no dead beat)**. Slam lands **center-stage** over the logo composition (no button target); two-stage scrim keeps the composition readable under the slam, then goes opaque before exit | choreography identical to v3/v2: ANTIC 60 · SLAM 300 (thud) · rings/shake/debris · INK 400 · EXIT 830 |
| ~3030 | ONBOARDING-ENTER | `onboarding-enter` emitted at stamp EXIT (2200+830); splash surface released behind the opaque scrim — zero dead frames | |
| ≤3600 | DONE | stamp overlay expands/fades out and is removed (~3560); **motion ends and onboarding step 1 is legible ≤3600ms from t0** | measured budget gate V4-G2 |

### 1S-v4.3 Skip semantics (tap/click/Enter/Space anywhere, any time pre-onboarding)

- **t < 1900 (formation/equalizer):** jump to 1900 — the settle plays, then the stamp auto-fires at 2200. One tap never skips past the stamp; the closer is always seen (at most ~1.1s remains).
- **1900 ≤ t < 2200 (settle):** jump to 2200 — the stamp starts immediately.
- **During the stamp:** `pawstamp.skip()` completes it instantly — pending beats cancelled, exit phase + `onboarding-enter` fire now (still behind the scrim: no dead frame).
- After `onboarding-enter`: taps are onboarding's business. Keyboard parity: `#splash` is focusable; there are **no other focusable elements inside the splash** (card + button removed), and the onboarding mock stays `inert` until entry — focus containment is structural.

### 1S-v4.4 Reduced motion (master prompt §33)

Static formed composition (crisp F + bars at logo proportions + wordmark, no particles/equalizer), then after ~180ms the **reduced stamp plays automatically**: the seated glyph fades in (no slam/rings/shake/debris), soft thud, plain crossfade — `onboarding-enter` ≈740–810ms from boot (≈800ms target). No user gesture required, matching the sighted-motion flow.

### 1S-v4.5 Gates (replace/extend §1S-v3.9 rows)

| # | Gate | Notes |
|---|---|---|
| V4-G1 | **No-Mulai gate:** no welcome card, no `Mulai` string, no `.fz-welcome`/`.fz-mulai` node in splash markup/CSS/JS | replaces V3-G3, inverted intent |
| V4-G2 | **Budget gate:** t0→`onboarding-enter` ≤ 3100ms; t0→motion-end/legible onboarding ≤ 3600ms (auto run, no input) | measured in-page |
| V4-G3 | **No-dead-beat gate:** settle completion (2140) → stamp start (2200) gap ≤ 120ms; frames 2140–2260 show a live composition (no empty hold) | |
| V4-G4 | V3-G1 (no sheen), V3-G2 (ordering), V3-G5 (glyph geometry / no mascot) carry forward unchanged | |
| V4-G5 | **Skip gates:** skip during stamp → onboarding ≤ ~600ms; skip pre-settle never bypasses the stamp | §1S-v4.3 |

---

## 2. Onboarding companion design

### 2.1 What exists (from code — the contract this design fills)

`fiezel-onboarding.js` renders 6 steps, one mascot per step at **148 px** (`--fz-ob-paw`, clamped `clamp(120px, 34vw, 148px)`, `style.css:1414-1415`), pose pre-applied as `st-<pose>` class + direct `el.setState(state, {hold: 0})` (deliberately not the `FiezelPaw` fan-out, so onboarding poses never drag the coach-bubble face along — `fiezel-onboarding.js:677-697`). Step change = one state morph + 240 ms entrance (`fzm-ob-paw-in`, `is-entering`); `MASCOT_CHAIN` maps intended poses to states the component actually has (`observing → thinking`); reduced motion freezes via `.fiezel-ob-still` with the correct static pose from markup. Current per-step map (file header, lines 37-43): 1 greeting · 2 curious/listening · 3 curious→observing · 4 encouraging · 5 sleepy · 6 celebrating→proud (settle at 1900 ms). `onName → pawReact('onboard')` (`app.js:3537`).

This design keeps every one of those mechanisms and upgrades the *content*: PAW stops being a per-step portrait and becomes a companion that looks at what the learner looks at, reacts to what the learner does, and hands off into the app. All expressions/states below are master-prompt library names, realized as Direction C tuples (`direction-c-expressive.md` §3); every new intent goes through `MASCOT_CHAIN` with a fallback to a shipped state, so nothing can silently fail (existing rule, lines 314-333).

**Micro-react rules (all steps):** direct-element `setState` only; throttle ≥ 600 ms between micro-reacts (a form is not a drum kit); every micro-react returns to the step's base state via `then`/timer; **zero reactions under reduced motion** (`.fiezel-ob-still` + the `pose()` path already covers this — static `st-` pose only); reactions are `hold`-bounded so a step never ends on a transient face.

### 2.2 Per-step spec

Legend: **State** = master prompt §11 state (existing component state in parens) · **Expr** = §8 expression number/name · gaze via `lookAt` (P9) + pupils (P8).

| Step | Base state / Expr | Pose & gaze | Reacts to learner | Points toward UI | Transition out |
|---|---|---|---|---|---|
| **1 · Nama** (mandatory, no skip) | GREETING (`greeting`), settling to **13 Welcoming → 1 Neutral** with soft smile | Wave once (existing greeting), then rest; gaze **down toward the name field** (P9 0,+4; P2 head 0,+2) — PAW attends to the learner's task, not the camera | First typed character: near-ear perk −6° + brow raise 120 ms (Curious micro, once per focus session, throttled). Enter/Lanjut: **2 Happy** beat 700 ms (lid-low 6, tail +8) — the existing `pawReact('onboard')` greeting then fires on the *app's* faces as the name commits (m026-01: the greeting is a reply, keep it) | — | Happy beat carries into step 2's entrance morph |
| **2 · Kenalan, slide 1** (vocab/grammar) | LESSON_START intro (`curious`) / **4 Curious** | Asym ears −10/+4, head translate +4 toward the item list, gaze at the first carousel item | Arrow next/prev: gaze leads the direction of travel 100 ms before the slide moves (pupils ±6 x), head translate follows — PAW "turns the page" with you | Right arm P17 −70° open-palm sweep toward the item list on slide entry, 600 ms, then rest (present, not jab) | Cross-slide: single morph curious→listening (in-betweens: lids/ears ease, D-C §3 argument) |
| **2 · slide 2** (reading/neural voice) | LISTENING (`listening`) / groove | Headphones acc on, notes, groove as shipped (head-translate groove per D-C §6, not body-rotate) | Arrow interactions as slide 1 | Notes accessory floats toward the listening item (existing acc position suffices) | Morph listening→curious on Lanjut |
| **3 · Tujuan** (goal + CEFR self-report) | pre-select: THINKING-adjacent (`curious`) / **4 Curious**; post-select: (`thinking` via `observing` chain) / **5 Thinking** | Pre: gaze sweeps the goal grid (lookAt recenter loop is native). Post: pupils up-corner +6,−5, half-lids 10, R paw toward chin — PAW *weighs your answer* (existing intent, now with the real Thinking tuple) | Goal card tap: **acknowledgment nod** — head translateY 0→+3→0 twice (D-C §6 encouragement nod) + brows up 300 ms + `lookAt` the selected card, *then* settle into Thinking as the level chips appear. Level chip tap: single nod + mouth `soft`; chip deselect: back to Curious. Never celebrate a selection — celebration inflation kills step 6 | Gaze itself is the pointer here (a grid has too many targets for an arm point) | Thinking→encouraging morph |
| **4 · Level / placement test** | ENCOURAGING (`encouraging`) / **7 Encouraging** | Brows raised +3, open mouth, tail +10; gaze to the primary button | "Mulai tes penempatan": **3 Excited** burst 500 ms (ears −8/−8, arms −60°) as the layer finishes — PAW is excited *for* you, then the whole onboarding exits to the quiz (existing `finish('placement')`). "Lewati langkah ini": **11 Calm** nod, mouth `soft` — explicitly NOT sad/concern; skipping is a sanctioned path and PAW is a guide, not a referee (audit 02 §2 tone; checklist E1) | Right arm P17 −90° point **with pads** toward "Mulai tes penempatan", held 900 ms after step entrance, then rest with gaze staying on the button | Encouraging→calm morph |
| **5 · Pengingat** (reminders) | IDLE-calm (`sleepy` today; **propose intent `calm` with chain `['calm','sleepy']`**) / **11 Calm** | Half-lids 14, mouth `soft`, slow tail ±3, gaze soft toward the sheet — restful, matching the step's subject (rest & coming back). Direction C's Calm reads "at ease"; current `sleepy` (lids 26, Zz) reads "bored by this step" — the chain keeps sleepy as the shipped fallback until the rig lands | Lanjut: gentle blink + Neutral | — | Calm→celebrating morph (the one big contrast jump of the flow — intentional) |
| **6 · Selesai** (summary) | CELEBRATING (`celebrating` lv2) → settles ACHIEVEMENT (`proud`) / **10 Celebrating → 8 Proud** | Existing: jump + confetti, settle to proud at 1900 ms (`applyMascot`, lines 714-728 — keep exactly). Proud: chest puff P19 1.06, tail +12 hold, gaze to the summary card *then* to the "Mulai Belajar" button | "Mulai Belajar": **handoff moment** — see §2.3. "Lewati": plain finish, proud face stays through the fade | Gaze lands on "Mulai Belajar" after the proud settle — the pose itself points at the door | Exit continuity §2.3 |

Reduced motion per step: markup `st-` classes already carry the correct static face — with the §2.2 map they become: greeting · curious · listening · curious/thinking · encouraging · calm(sleepy) · **proud** (step 6 renders proud directly, existing `reduceMotion ? 'proud' : 'celebrating'` branch — keep).

### 2.3 Completion → app handoff (continuity, master prompt §27)

Today onboarding removes itself (260 ms fade) and the coach bubble later "births" with `is-paw-born` pop (`fiezel-coach-bubble.js:207-211`) — two unrelated PAWs. Proposal, zero new mechanics: on `finish('finish')` from step 6, sequence the two existing animations so they read as one move — (1) onboarding PAW does a quick scale-down-toward-bottom-right (translate toward the coach-bubble dock corner + scale 1→0.2, 320 ms, `--fz-out`, opacity fade in last 100 ms) *as* `is-leaving` runs; (2) `afterOnboardingExit → go('home')` renders home; (3) coach bubble's existing birth pop is triggered with a ~120 ms delay. Perceptually: **PAW shrinks into the corner and pops out of the bubble** — the onboarding companion becomes the everyday coach. Implementation: one new keyframe (`fzm-ob-paw-handoff`) + a delay parameter on the bubble birth; skipped entirely under reduced motion and on the `placement` exit (the quiz takes the whole screen; a corner move would point at nothing).

---

## 3. First-run vs returning user (WELCOME_BACK)

> **2026-08-28 update (amended same day for v3, re-amended for v4):** the splash rows below referenced the rejected §1.2 mascot sequence. Under the binding ~~§1S · §1S-v3~~ **§1S-v4** design the splash is **identical for first-run and returning users** (the particle-formation sequence + automatic closing stamp, no mascot, no WELCOME_BACK splash variant — SB-7 is thereby moot). WELCOME_BACK remains a valid **in-app** state (coach bubble / wake path) exactly as specified; only its splash trigger row is void.

Boot facts (`app.js:2493-2511, 3502-3519`): the boot path **forces** the splash every launch (m025-80 note in `showBrandSplash`); onboarding shows only while not `completed()`; legacy users missing a name get the single `nameOnly` step; everyone else lands directly. The mascot component already tiers greetings internally (`_mem.greets`: 1900 ms first, 1600 ms after) and supports `idle-timeout`/`wake` with **zero callers** (audit 03 Task D).

| Aspect | First run | Returning user |
|---|---|---|
| Splash sequence | ~~Full §1.2 (or splash-lite)~~ ~~§1S PAW STAMP~~ **§1S-v3 PARTICLE FORMATION + PAW STAMP ON MULAI** (identical both columns) | ~~Same beats, but PAW enters in **WELCOME_BACK** flavor: expression 13 with **bigger tail flick (tip +20) and both-ear −8** (Direction C's WELCOME_BACK recipe), and the p2 idle + p3 look beats are trimmed (−250 ms; a returning user doesn't need PAW to discover the logo) → returning splash motion ends ~1310 ms, total ~1750 ms. Splash-lite: identical peek, no differentiation (too small to carry it)~~ *(void 2026-08-28 — §1S for everyone)* |
| After splash | Onboarding 6 steps (§2) → notification invitation | Straight to notification/home. Legacy no-name users: `nameOnly` step with GREETING base per §2.2 step 1 |
| New state needed | — | **WELCOME_BACK** added to the state library: greeting variant, params = greeting + tail-tip +20 + ears −8/−8, duration 2200 ms transient → idle per 09 §2.10 (binding, 17 R-2b); blink allowed. Triggers: (a) ~~returning-user splash~~ *(void 2026-08-28)*, (b) the currently-orphaned `wake` event path — wiring an app idle-timer to `idle-timeout`/`wake` finally gives the shipped sleepy→wake pair a caller (flagged gap, audit 03 D) |
| Persistence key | `fiezel-onboarding-v1` `done` (existing) | Returning = `completed() === true`; splash `seenToday` continues to gate only the non-forced daily-greeting path — no new storage |

---

## 4. Asset & event requirements for implementation

### 4.1 Assets (no new artwork — Direction C rig parameters only; canonical source `features/mascot/fiezel-mascot.js`, static twins are generated exports per selected-direction E5 rule)

> **2026-08-28:** splash rows A1–A5 and A9's splash clauses are **superseded by §1S.8 (S-A1…S-G4)**; A9's "distinct PAW-pop" contingency is resolved by the §1S.4 thud slot. Onboarding rows A6–A8 stand unchanged. *(v3, same day: §1S.8's splash rows are in turn superseded by **§1S-v3.9 (V3-A1…V3-G5)**; the thud slot survives as the Mulai-stamp thud, §1S-v3.5.)*

| # | Asset | For | Notes |
|---|---|---|---|
| A1 | Splash PAW layer markup: one `<fiezel-mascot class="fz-splash-paw">` slot in `markup()` + adopted-splash injection path | §1.2 | Sized `clamp(160px,44vw,220px)`; full body; shadow on (dark field) |
| A2 | CSS keyframes `fz-splash-paw-in` (pop entrance), `fzm-ob-paw-handoff` (corner shrink) | §1.2 p1, §2.3 | Transform/opacity only; `--fz-spring` / `--fz-out` |
| A3 | Choreography extension: PAW beats **p1–p4** as rows in the `FiezelChoreography` BEATS table (css vars `--fz-p1..p4`, `pitch: null` — they borrow the existing notes) + the compressed b1–b8 timings behind an OWNER-gated flag | §1.2 | One clock rule (m025-86); `tests/splash-choreography-test.js` must be updated in the same change |
| A4 | Splash-lite head-crop: reuse head-crop placement pattern classes; optional static head export 72 px for the still variant | §1.6, §1.5 | Generated from canonical rig; no hand-drawn twin |
| A5 | Static Welcoming-pose composition for `fiezel-splash-still` (PAW `st-greeting`/Welcoming static + assembled logo) | §1.5 | Must communicate with zero motion (checklist D3) |
| A6 | `MASCOT_CHAIN` additions: `calm: ['calm','sleepy']`, `welcoming: ['welcoming','greeting']`, `welcome-back: ['welcome-back','greeting']` | §2.2, §3 | Chain pattern already exists; intents stay honest in DOM attrs |
| A7 | New rig states in the component (once Direction C rig lands): `calm`, `welcome-back` (+ the pointing variant of `encouraging` with pads-on arm hold) | §2.2, §3 | All are D-C §3 tuples — no new drawings |
| A8 | Onboarding micro-react module: throttled direct-element `setState` helper (nod, ear-perk, gaze-lead) inside `fiezel-onboarding.js` | §2.2 | Direct calls stay sanctioned here (existing exception to the FiezelPaw-only rule, documented at lines 677-682) |
| A9 | SFX: **none new**. Splash uses the existing motif; entrance "thud" = F2; signature = b4/b5 A4 beat. If OWNER later wants a distinct PAW-pop, it must be added inside `FiezelUiSfx` (single-engine rule, audit 03 C.4) | §1.2, §1.3 | |

### 4.2 Events & wiring

| # | Event / hook | Status | Use |
|---|---|---|---|
| E1 | `opts.onClose` on `FiezelSplash.show` | exists | unchanged app-flow sequencing |
| E2 | `fz-state` DOM event on state change (`fiezel-mascot.js:302`) | exists, unconsumed | QA hook for splash/onboarding pose assertions; analytics-free |
| E3 | `pawReact('onboard')` on name commit | exists | keep (m026-01: greeting as a reply) |
| E4 | **New** `welcome-back` entry in `react()` → WELCOME_BACK state | new | returning-user splash + wake path |
| E5 | App idle-timer → `pawReact('idle-timeout')` / `pawReact('wake')` | events exist, **no caller** (audit 03 D) | gives sleepy/wake a caller; prerequisite for in-app WELCOME_BACK moments |
| E6 | Coach-bubble birth delay parameter (`is-paw-born` trigger accepts `delayMs`) | new, tiny | §2.3 handoff |
| E7 | ~~OWNER-approval flag for the splash variant (`splash: 'paw' \| 'lite' \| 'logo'` config constant)~~ **RETIRED 2026-08-28** — one splash only (§1S) | ~~new~~ retired | ~~m025-80 governance — default **`logo`** until sign-off~~ |

### 4.3 Gates that must keep passing / be updated

`tests/splash-choreography-test.js` (beat table ↔ index.html defaults identity — must be updated with any timing change), `tests/onboarding-test.js`, `tests/paw-mascot-test.js` (single shape source, controlled amplitude), `tests/topbar-logo-contrast-test.js` (untouched), the three reduced-motion layers (audit 03 B.6), and the two-copy sync duty (`features/mascot/` + `website/assets/mascot/`) if any rig state is added.

### 4.4 Open decisions for OWNER

1. ~~Approve full PAW splash (§1.2), splash-lite (§1.6), or keep logo-only (reverses/respects **m025-80**).~~ **DECIDED 2026-08-28: both PAW variants REJECTED; m025-80 permanent; PAW STAMP (§1S) is the binding splash.** *(v3, same day: §1S superseded by **§1S-v3** — particle formation + equalizer, stamp moved to the Mulai press.)*
2. ~~Accept the ≤ 2000 ms budget vs the m025-88 "slower, more expensive" dwell (3400 ms) — beat table supports either.~~ **DECIDED 2026-08-28: ≤ 2000 ms accepted with the §1S timeline (ratio-parametric fallback noted in §1S.2).** *(v3: autonomous motion now ends 2100 ms and the splash rests on the welcome card — the fixed close timer is retired, §1S-v3.2; the m025-88 dwell question is closed by the resting welcome state itself.)*
3. Chime under reduced motion: keep (current behavior) or gate with motion. *(Still open — unchanged by the 2026-08-28 ruling.)*
4. Step 5 intent upgrade `sleepy → calm` (ships as chain fallback either way). *(Still open.)*

## Storyboard v1 — splash sheets SUPERSEDED 2026-08-28

> **`storyboard-splash.svg/.png` and `storyboard-splash-lite.svg/.png` are SUPERSEDED** (they board the rejected §1.2 / §1.6 mascot designs — kept on disk as history, do not implement from them). The binding splash storyboard is **Storyboard v2** below. `storyboard-onboarding.svg/.png` remains current.

Storyboard Artist · Date: 2026-08-27 · PAW figures generated from the Direction C rig (`directions/direction-c.svg` geometry via `systems/gen_poses_sheet.py::pau`), closed palette, exact `fz-pawprint` chest emblem. Generator: `systems/gen_storyboards.py` (design-doc artifact only; repo untouched).

**Files**

| File | Contents |
|---|---|
| `systems/storyboard-splash.svg` / `.png` | 8 frames, §1.2 full sequence: p1 entrance (F2 @0) · p2 idle breath (F3) · p3 blink+look (C4) · b1–b3 F-strokes with pupil tracking (F4) · p4+b4/b5 **PAW Spark** on the A4 gold-bar beat · b6–b7 Happy settle + wordmark rise (C5/G5) · b8 still + tagline · 1700–2000 exit fade. Timestamp + beat + SFX under every frame. |
| `systems/storyboard-splash-lite.svg` / `.png` | 4 frames, §1.6 fallback: logo hero (b1–b3, b4–b5 untouched) · **The Peek** — 72 px head-crop rising 14 px behind the tagline at b7, Expr 2 Happy, no added SFX · one blink at b8 → exits with the field. |
| `systems/storyboard-onboarding.svg` / `.png` | 6 frames, §2.2, one per step (Nama/Greeting → Kenalan/Curious → Tujuan/Thinking → Level/Encouraging point → Pengingat/Calm → Selesai/Celebrating→Proud) against schematic card+CTA wireframes, incl. the §2.3 completion handoff (PAW shrinks 1→0.2 toward the coach-bubble corner, bubble birth pop +120 ms). |

**OWNER revision applied (2026-08-27, during drawing):** the `fiezel-paw` glyph appears on the **chest emblem only** — all hands/paws are drawn plain yellow, no pad markings. This supersedes §1.2 p4 "with pads (P18 on)", §2.2 step-4 "point with pads", and 17 R-4's "pads shown" gesture wording; those rows need a follow-up textual amendment (not made here — ruling edits are another agent's pass).

**Timing/spec ambiguities discovered while drawing** *(2026-08-28 status: items 1–5 and 7 — SB-1…SB-5, SB-7 — are **MOOT**, they exist only inside the rejected mascot-splash design; item 6 — SB-6 — is onboarding-side and stays recorded/informational.)*

1. **p3 `lookAt (+6,−3)` sign vs stage layout.** Negative y reads as *upward* gaze, but the logo stage (~52% height) sits **below** PAW (~30% height, §1.1). Drawn as a downward-right gaze toward the stage; the P9 sign convention vs the stage layout needs a one-line clarification.
2. **b6 arm-return overlaps b8.** The Welcoming arm returns "−105°→0 over 260 ms" starting at 1330 → ends ~1590, i.e. 30 ms into the b8 "still: breath only" window that opens at 1560. Drawn as fully settled by F7; harmless, but the beat table should either start the return at ≤1300 or note the spill.
3. **p4 eye treatment: §1.2 vs R-4 canon.** §1.2's p4 row keeps open eyes + raised brows; R-4's canonical Spark gesture inserts "quick double-blink into happy-arc eyes" at ~105 ms. Storyboard draws the §1.2 rig-supported open-eye version and flags R-4's variant in the frame label — which one binds on the *splash instance* of the Spark should be stated in one place.
4. **F7's "optional second blink @ ~1620"** sits inside the same b8 window that §1.2 describes as "Still: breath only" — drawn as an annotation, not a pose change; worth an explicit yes/no since R-5 elsewhere shows blink policy is load-bearing.
5. **Splash-lite has no absolute timestamps by design** (it inherits whichever beat table ships: current 2180/3400 ms or the compressed §1.2 table). Frames are therefore labeled by beat IDs (b1–b8) only.
6. **Step-6 handoff timing is unbounded.** Proud settle lands at 1900 ms, but the §2.3 handoff fires on the user's "Mulai Belajar" tap — the gap is user-dependent. Drawn as post-settle; no spec change needed, just noting the storyboard can't carry a timestamp there.
7. **Returning-user trim (−250 ms across p2+p3, §3) has no per-beat split** — not storyboarded; the WELCOME_BACK variant would need its own beat-table row values before it can be boarded.

## Storyboard v2 — "PAW STAMP" (auto-slam) — **SUPERSEDED BY OWNER v3 2026-08-28**

> **`storyboard-splash-v2.svg/.png` is SUPERSEDED** by the same-day OWNER v3 ruling (it boards the §1S auto-slam design, including the deleted b6 sheen sweep and the deleted halo flare — kept on disk as history, do not implement from it). The binding splash storyboard is **Storyboard v3** below. `storyboard-onboarding.svg/.png` remains current.

Storyboard Artist · Date: 2026-08-28 · Boards the superseded §1S sequence. **No cat mascot anywhere**: the only actors are the F logo (`logoMarkup()` exact rects), the FIEZEL wordmark (`fiezel-wordmark.svg` exact rects, small/bottom per §1S.3 P2), and the **real paw glyph** (`fiezel-paw.svg` exact toe/heel geometry, splash gold recolor per §1S.7). Generator: `systems/gen_storyboard_splash_v2.py` (design-doc artifact only; repo untouched).

| File | Contents |
|---|---|
| `systems/storyboard-splash-v2.svg` / `.png` | 8 frames, §1S.2 timeline: F1 letterform build (b1–b3, F2/F3/C4) · F2 gold bars on the colour beat (b4/b5, F4/**A4**) · F3 sheen + small bottom wordmark (b6/b7, C5/G5, size reduction annotated) · F4 s1 anticipation (raised seal, silence) · F5 s2 **SLAM** (contact frame: squash 1.12/0.84, shockwave ring, ≤3px shake, halo flare, STAMP THUD) · F6 impact decay (ring expands/fades, recovery through 1.02) · F7 s3/s4 settled seal + still · F8 exit fade into onboarding. Timestamp + beat + SFX under every frame. |

## Storyboard v3 — "PARTICLE FORMATION + PAW STAMP ON MULAI" (2026-08-28) — **FRAMES F6–F7 SUPERSEDED BY v4 (OA-6)**

> **v4 note (2026-08-28):** `storyboard-splash-v3.svg/.png` remains the visual reference for frames F1–F5 (formation/equalizer) and F8–F9 (slam/stamp grammar), but its **F6 welcome-card rest** and **F7 Mulai press** frames board the superseded gating — under §1S-v4 the composition holds without a card at F6 and the slam at F8 fires **automatically at 2200** (no press). Kept on disk as history; read timings for the closer from §1S-v4.2.

Storyboard Artist · Date: 2026-08-28 · Boards the binding §1S-v3 sequence. **No cat mascot anywhere** (m025-80 permanent); **no sheen/halo/glow anywhere** (OA-5 deletion). Actors: the particle point-cloud (scattered gold/cream dots per §1S-v3.3 P1), the F logo + two gold bars (exact rects), the equalizer takeover, the FIEZEL wordmark (small/bottom, v2 sizing), the welcome card + Mulai, and the **real paw glyph** (exact geometry, splash gold recolor §1S.7) — now fired by the Mulai press. Generator: `systems/gen_storyboard_splash_v3.py` (design-doc artifact only; repo untouched).

| File | Contents |
|---|---|
| `systems/storyboard-splash-v3.svg` / `.png` | 9 frames, §1S-v3.2 timeline: F1 **scatter cloud** (t=0, F2 ignition, no glow) · F2 **mid-convergence** (~500, curl-noise swirl, stem biasing visible) · F3 **F locked, bars still particles** (~950, F4 — the OWNER's ordering beat) · F4 **bars solidify → handoff** (1150, `bars-solid`, **A4** colour tone on the gold event) · F5 **equalizer** (1150–1900, scaleY-only bounce on the beat table, wordmark reveal 1200–1500) · F6 **settle + welcome card** (1900–2100, bars at exact logo proportions, G5, splash rests) · F7 **Mulai press** (user-triggered, anticipation 240ms, card dims) · F8 **SLAM contact** (squash 1.12/0.84, double rings, ≤3px Y shake, 3 debris dots, STAMP THUD — **no halo flare**) · F9 **stamp → onboarding** (−6° ink-spread seal settle, stamp expands as the transition, ≤1400ms press→onboarding). Timestamp/trigger + phase + SFX under every frame. |
