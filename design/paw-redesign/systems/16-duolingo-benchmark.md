# 16 — Duolingo Benchmark (Competitive Reference, With Anti-Copy Guardrails)

**Status:** Reference document. Informs specs 07–14; changes it suggests are AMENDMENT PROPOSALS, not binding until folded into the owning spec.
**Governance:** The master prompt bans copying another company's mascot and proprietary animations (§35) and bans optimizing toward copying another language-learning application (§43). Duolingo is used here ONLY as a bar for *character-system quality* and a source of *technique-level principles*. Every asset-level element of Duolingo (owl, green, poses, gags, sounds, UI compositions) is on the blocklist in §3.
**Evidence base:** Duolingo's own design/engineering blog, the Rive case study, a sound designer's portfolio of the shipped core sounds, onboarding teardowns, and a live capture of https://id.duolingo.com/ (`16-duolingo-landing-screenshot.png`, captured 2026-08-27).

---

## 1. What Duolingo actually does (facts, cited)

### 1.1 Character cast

- The mascot is **Duo, the green owl**, described by Duolingo as "the most important visual aspect" of the brand, built from four components: simple construction, highly geometric form, a body with wings, and very big endearing eyes plus a unique body shape and detached feet ([Duolingo blog — Building character](https://blog.duolingo.com/building-character/)). The brand's primary color is "Feather Green" `#58CC02` ([Brand Palettes](https://brandpalettes.com/duolingo-colors/)).
- Around Duo sits a cast of **ten "World Characters"** — Bea, Eddy, Falstaff, Junior, Lily, Lin, Lucy, Oscar, Vikram, Zari ([Duoplanet character guide](https://duoplanet.com/duolingo-character-names/)) — designed over ~18 months as modern humans with quirky personalities after rejecting vikings/aliens as "too far removed from the reality of language learning"; the humans deliberately reuse Duo's design DNA so a non-human owl and human cast read as one world ([Duolingo blog — Building character](https://blog.duolingo.com/building-character/)).
- Personalities are engineered in contrasting pairs (outgoing Zari ↔ introverted Lily; laid-back Lin ↔ neurotic Bea) with cross-cultural naming rules (same name in every language, pronounceable worldwide, no unintended meanings) ([Duolingo blog — female character origin stories](https://blog.duolingo.com/duolingo-female-character-origin-stories/)).
- All characters — including background extras — are constructed from "simple geometric building blocks", drawn in **Figma** ("the main illustration tool at Duolingo"), and background characters are explicitly designed *not to outshine* the main cast ([Duolingo blog — designing new characters internship](https://blog.duolingo.com/designing-new-characters-internship/)).
- Each of the nine story characters received a **custom ML text-to-speech voice** cast from human actors, with per-language personality tuning (Lin is "perpetually amused" in English, "languid and matter-of-fact" in Japanese) ([Duolingo blog — Giving our characters voices](https://blog.duolingo.com/character-voices/)).

### 1.2 Expression / animation technology

- Character animation runs on **Rive**, chosen for compact file sizes, app-architecture integration, and animator→engineer handoff; Rive's **State Machine** is "a visual representation of the logic connecting animations, or 'states'", letting the team programmatically control which states play, how they transition, and how they blend ([Duolingo blog — How Duolingo animates its world characters](https://blog.duolingo.com/world-character-visemes/)).
- **Lip sync is real viseme lip sync**: TTS audio is run through Duolingo's in-house speech recognition and pronunciation models to obtain per-word and per-**phoneme** timing; each phoneme maps to a **viseme** mouth shape; a "factory" generates viseme timings for all course content, with audit/correction tooling. Each of the ten characters has its own personality-consistent viseme shape set, defined in a design guide before animation began ([Duolingo blog — visemes](https://blog.duolingo.com/world-character-visemes/)).
- The Rive State Machine + mouth-input file is exported as a **single runtime file** handed to engineers; at lesson time the app fetches audio + timing and drives the state machine in sync — far smaller than shipping video ([Duolingo blog — visemes](https://blog.duolingo.com/world-character-visemes/)).
- For the AI **Video Call** feature, Lily's expressiveness was deliberately **restrained to match her deadpan personality** ("If Lily opened her eyes too wide, people were like, 'Why is she so happy? This feels weird.' So we had to dial it back"), and idle variety comes from **8 head × 8 body randomized animations combining into 64+ neutral-movement variations** so idle never loops repetitively; processing latency is masked as in-character "pondering" ([Rive — Duolingo Video Call case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)).

### 1.3 Lesson-embedded character presence

- World Characters were designed into "the majority of Duolingo's exercises", where they **speak the sentence the learner is translating** — the character *is* the exercise's voice, placed "where learners spent most of their time" ([Duolingo blog — Building character](https://blog.duolingo.com/building-character/)).
- The runtime system is interactive: **click a word → the character says and mouth-animates that word**; if the learner finishes the exercise early, **the character stops speaking in time**; idle behaviors (head nods, blinking, eyebrow movement) run between; and on the challenge verdict the character moves to a **final reaction state for right or wrong** ([Duolingo blog — visemes](https://blog.duolingo.com/world-character-visemes/)).
- Each character has a **unique correct-answer animation**, and "mid-lesson animations" are interstitials rewarding several correct answers in a row ([Duolingo blog — Building character](https://blog.duolingo.com/building-character/)).

### 1.4 Celebration tiers

- In-lesson combo tier: the **five-in-a-row** celebration is "WaBing" (Duo's voice), heard by 100M+ learners; **ten-in-a-row** summons "Buff Duo" — deliberately designed so a *common* event "can never wear out"; the **Lightning combo** sounds are "one musical and sonic idea, three levels of reward" (x5 → x10 → Perfect Lesson) ([Ambrose Yu — Duolingo core product sounds](https://ambroseyu.com/work/duolingo-core-product-sounds)).
- Streak-milestone tier: milestones (week / month / 100 days / year+) transform Duo into **"Fire Duo"**, a phoenix-based power-up chosen because the fire metaphor wasn't universally understood and the older "Duo holding number balloons" art lacked celebratory energy; the redesign emphasized timing/rhythm/energy in animation and shipped with a share card; early metrics showed more learners keeping streaks and celebrating milestones ([Duolingo blog — streak milestone design](https://blog.duolingo.com/streak-milestone-design-animation/)).
- Frequency economics are explicit: a milestone streak "lands a few times a year", so "it has to feel enormous" — the same system serving opposite tasks as the wear-proof common tier ([Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)).

### 1.5 Sound identity

- One sonic language extends "to every major mechanic, old and new"; the **App opener** plays on every launch and is "the most heard sound in the app"; escalation families reuse a single musical idea across reward levels; secondary mechanics get "friendly, organic" sounds that must not overshadow the lesson-end flow ([Ambrose Yu — Duolingo core product sounds](https://ambroseyu.com/work/duolingo-core-product-sounds)).

### 1.6 Onboarding character role

- Duolingo's onboarding (~38 screens) includes screens that "teach nothing" and exist so Duo can **react to answers, celebrate choices, and build a relationship before lesson one** — "By the time the paywall appears, Duo is not an icon, he is someone you know" ([Tasu — Duolingo onboarding teardown](https://www.tasu.ai/library/duolingo)).
- The same teardown is explicit that Duolingo's attachment loop runs on **guilt**: "Duo reacts. He celebrates. He guilt-trips… that guilt is the retention mechanism" ([Tasu](https://www.tasu.ai/library/duolingo)). This is documented here as a *known Duolingo persona trait to explicitly NOT copy* (see §3).
- The public landing page (id.duolingo.com) leads with the Duo app icon inside a phone mock and a single green CTA — character-forward but restrained: one character, one message (local capture: `16-duolingo-landing-screenshot.png`).

---

## 2. PRINCIPLES worth adopting for PAW (technique-level, never asset-level)

Each principle is stated as an abstract technique. PAW's implementation must be re-derived from PAW's own identity (gold cat, motif F2–G5, "pembimbing bukan wasit"), never traced from Duolingo output.

| # | Principle (abstracted) | Duolingo evidence | PAW status |
|---|---|---|---|
| P1 | **State-machine-driven animation**: model character behavior as named states with explicit transition/blend logic, controlled programmatically — never ad-hoc per-screen animations. | [Rive State Machine](https://blog.duolingo.com/world-character-visemes/) | ✅ Already met: 09 §4 priority ladder P0–P4 + legal-transition table. |
| P2 | **Audio-clocked mouth timing, upgradeable to true visemes**: mouth movement must be slaved to real audio timing data derived from a pipeline (not hand-animated, not free-guessing over silence). | [Phoneme→viseme factory](https://blog.duolingo.com/world-character-visemes/) | ◐ Partially met: 14 §2's audio-gated flap is the honest floor given FIEZEL's no-phoneme-timing ground truth; 14 already lists CI forced-alignment viseme tracks as optional upgrade. Duolingo validates that upgrade path (§4 amendment A). |
| P3 | **Combinatorial idle variety**: avoid repetitive idle loops by combining a small set of orthogonal micro-motions rather than authoring long loops (Duolingo: 8×8 → 64+ variations). | [Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) | ◐ PAW has blink + micro-gaze jitter (10 §1); see amendment B for cheap variety within the 4-node budget. |
| P4 | **Restraint calibrated to personality**: expressiveness is dialed to the character's persona, and over-emoting is treated as a bug ("dial it back"). | [Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) | ✅ Met/beaten: 07's cuteness guard (max two maxed channels), Proud's closed mouth, asymmetric negativity range. |
| P5 | **Frequency-tiered celebration economics**: common events must be wear-proof (small, never annoying); rare events must feel enormous; one system serves both ends. | [Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds); [streak milestone blog](https://blog.duolingo.com/streak-milestone-design-animation/) | ✅ Met/beaten: 13's tier-entry anti-inflation rule and once-ever milestone keys are *stricter* than Duolingo's repeating combos. |
| P6 | **Interruption correctness**: the character always yields to the learner — stops speaking when the learner moves on, never blocks progress. | [Visemes blog](https://blog.duolingo.com/world-character-visemes/) | ✅ Met: 14's stall gates / duration caps ("mouth stops too early, never flaps over silence"); 13's interrupt-forfeits-confetti. |
| P7 | **Character attends to the learner's actual focus**: reactions target what the learner touches (word tapped → character speaks/looks at that word). | [Visemes blog](https://blog.duolingo.com/world-character-visemes/) | ◐ 12 §3 has question-lifecycle gaze (stem, hover, answer). Word-level audio→gaze link is a gap (amendment C). |
| P8 | **Character-led onboarding builds relationship before lesson one** — but via *companionship*, never guilt. | [Tasu teardown](https://www.tasu.ai/library/duolingo) | ✅ Met with the right ethics: 11 §2's companion gaze/micro-reactions + Calm-on-skip is the guilt-free version by design. |
| P9 | **Geometric construction system for scalability**: characters built from simple geometric blocks so any artist/vendor can reproduce them consistently. | [Internship blog](https://blog.duolingo.com/designing-new-characters-internship/); [Building character](https://blog.duolingo.com/building-character/) | ✅ Met: PAW's rig-parameter tuples (07 §2, 08 §1) go further — the *pose itself* is data. |
| P10 | **One musical idea, escalating levels**: reward audio reuses a single motif family across tiers instead of unrelated stingers. | [Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds) | ✅ Met: 14 §3 — every character SFX quotes the F2 F3 C4 F4 A4 C5 G5 brand motif; single `FiezelUiSfx` engine. |
| P11 | **Single-runtime-file discipline**: animation logic ships as one integrated artifact, not scattered per-screen assets. | [Visemes blog](https://blog.duolingo.com/world-character-visemes/) | ✅ Met structurally: one rig mount, `faceMarkup` pre-stamping, scoped CSS vars (10 §5, 12 §1). |
| P12 | **Latency masked in character**: system delays are performed as in-character thinking, not spinners. | [Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) | ◐ PAW has `thinking` 700ms post-answer (12 §3); extend the same trick to voice-model loading (amendment D). |

---

## 3. HARD ANTI-COPY GUARDRAILS

### 3.1 Blocklist (binding; any hit = QA failure)

1. **No owl, no bird, no wings, no beak** anywhere in PAW's anatomy, shadows, or accessories. PAW is a cat (08, 10 "one cat, many windows").
2. **No green as a character or celebration color.** Specifically banned: Feather Green `#58CC02`, Mask Green `#89E219`, and any hue within ±20° of them at high saturation ([Brand Palettes](https://brandpalettes.com/duolingo-colors/); [Design Your Way](https://www.designyourway.net/blog/duolingo-logo/)). PAW's closed palette (14 §Color: `#EDB93A` gold family + sanctioned accents) already excludes green — keep it that way.
3. **No Duo poses or gags**: no phoenix/"on fire" transformation ([streak milestone blog](https://blog.duolingo.com/streak-milestone-design-animation/)), no "Buff"/muscular power-up variant ([Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)), no number balloons, no unhinged/menacing meme persona, no eye-roll-deadpan persona (that is Lily's registered trademark move — [Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)).
4. **No guilt-trip mechanics or copy.** Duolingo's documented "guilt is the retention mechanism" loop ([Tasu](https://www.tasu.ai/library/duolingo)) is banned for PAW in any form: no sad-PAW push notifications, no "PAW misses you / you let PAW down" framing, no crying icon variants. PAW's streak-lost state is Gentle concern + encouragement (13 §2), never reproach.
5. **No copying specific animations**: no recreation of WaBing, Fire-Duo transformation beats, Duolingo's correct-answer character dances, or Lily's Video Call choreography. PAW's reactions must be derivable from PAW's own spec tuples (07/08) alone.
6. **No copying sounds**: no "ba-ding" correct chime imitation, no Duo-voice-style celebratory vocalization ("WaBing" is literally Duo's voice — [Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)). All PAW audio must quote only the FIEZEL motif (14 §3).
7. **No copying UI compositions**: no character-transformation full-screen streak interstitial, no share-card layout clone, no Duolingo-style mid-lesson combo interstitial screens. PAW celebrates *within* the existing FIEZEL result/quiz surfaces (12, 13).
8. **No human side-cast cloning**: FIEZEL must not introduce a "ten quirky humans" ensemble mirroring the World Characters roster structure. If FIEZEL ever adds side characters, that is a separate OWNER decision — out of this redesign's scope (master prompt §1).
9. **No Rive-file reuse**: adopting the *state machine idea* (P1) is legal; importing/tracing any Duolingo Rive asset, viseme sheet, or mouth-shape set is not.

### 3.2 Differentiation table — PAW vs Duo

| Axis | Duo (Duolingo) | PAW (FIEZEL) — must remain |
|---|---|---|
| Species | Green owl; humans + one bear in side cast ([Building character](https://blog.duolingo.com/building-character/); [Duoplanet](https://duoplanet.com/duolingo-character-names/)) | Cat, single-character system, no ensemble |
| Palette | Feather Green `#58CC02` + Mask Green ([Brand Palettes](https://brandpalettes.com/duolingo-colors/)) | Gold `#EDB93A` closed palette, cream/dark contexts, zero green (spec §14 Color) |
| Persona / tone | Comedic, meme-friendly, guilt-trips as retention ([Tasu](https://www.tasu.ai/library/duolingo)); deadpan-sarcastic side cast ([Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)) | **"Pembimbing bukan wasit"** (a guide, not a referee): warm, restrained, never reproachful; wrong answers get Gentle concern → Encouraging, always quieter than correct (13 §2) |
| Geometry style | "Highly geometric" construction, detached feet, body-with-wings ([Building character](https://blog.duolingo.com/building-character/)) | Soft rounded-capsule cat forms, attached anatomy, rotation-free rig, shoulder-pivot arms (08, 10) |
| Negative feedback | Character reacts to wrong answers with visible disappointment states ([visemes blog](https://blog.duolingo.com/world-character-visemes/)) | Wrong is *always visually quieter* than right; no head-shake, no tears, no red flash (13 §2) |
| Celebration currency | Character transformation (Fire Duo, Buff Duo) ([streak blog](https://blog.duolingo.com/streak-milestone-design-animation/); [Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)) | Amplitude/repeat tiers of the *same* PAW — "never new drawings" (07 §Celebrating); transformation is banned |
| Lesson role | Character speaks the exercise content (is the content) ([Building character](https://blog.duolingo.com/building-character/)) | Companion *beside* the panel; FIEZEL's existing voice system speaks (G8); "a rarer PAW is a stronger PAW" (12 §4) |
| Audio signature | "Ba-ding"-family chimes, WaBing voice, app-opener sting ([Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)) | Struck-bar FIEZEL motif quotes only; most movements silent (14 §3) |

---

## 4. Gap analysis — where PAW meets/beats the Duolingo bar, and where it falls short

**Meets or beats (no action):**

- **07-expressions** — Duolingo's key published expression lesson is *restraint tuned to persona* ([Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)); 07's cuteness guard, blendable tuple space, and asymmetric negativity range already encode this more rigorously than anything Duolingo has published.
- **08-poses** — parameter-tuple poses with reuse matrices exceed Duolingo's published "geometric building blocks" guidance ([internship blog](https://blog.duolingo.com/designing-new-characters-internship/)).
- **09-states** — the P0–P4 priority ladder, legal-transition table, and anti-spam cooldowns are a full state-machine spec; Duolingo confirms state machines are the right architecture ([visemes blog](https://blog.duolingo.com/world-character-visemes/)) but has published no comparable interrupt/cooldown discipline. PAW's once-ever milestone keys are stricter than Duolingo's repeatable Fire-Duo events.
- **13-reactions** — the tier-entry anti-inflation rule and "wrong quieter than right" doctrine beat Duolingo's bar; Duolingo's own sound designer confirms the underlying economics (common = wear-proof, rare = enormous) that 13 already implements ([Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)).
- **14-voice-sfx (sound half)** — single engine + motif-quoting matches Duolingo's "one sonic language, escalating families" principle ([Ambrose Yu](https://ambroseyu.com/work/duolingo-core-product-sounds)) while being more restrained (most movements silent).

**Falls short — concrete amendment proposals:**

| ID | Owning spec | Gap vs Duolingo bar | Proposed amendment |
|---|---|---|---|
| **A** | 14-voice-sfx §2 | Duolingo has phoneme-level viseme timing from a recognition/alignment factory ([visemes blog](https://blog.duolingo.com/world-character-visemes/)); PAW's flap cycle is audio-gated but timing-blind. | Promote 14's already-listed "CI forced-alignment viseme tracks in `audio/manifest.json`" from *optional future* to a **named P1 backlog item** (master prompt §40 P1 "voice synchronization"). Keep the flap cycle as the permanent fallback layer. No new runtime clock — alignment data feeds the existing `FiezelSubtitle` cue brain. |
| **B** | 10-motion §1 | Duolingo prevents idle repetition with combinatorial variation (8×8 = 64 idle combos) ([Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)); PAW's idle is one breath loop + blink + micro-gaze. | Within the existing 4-node/2-timer budget, randomize *parameters* not nodes: jitter micro-gaze target among 3 zones, vary blink single/double (~1:5), and offset ear-sway phase per mount. Zero new nodes; variation comes from the JS timers PAW already owns. |
| **C** | 12-lesson-layer §3 | Duolingo: tapping a word makes the character speak and animate that word ([visemes blog](https://blog.duolingo.com/world-character-visemes/)); PAW's gaze lifecycle covers stem/hover/answer but not word-audio playback. | Add one trigger row: on existing per-word audio playback events, `lookAt(wordRect)` + speaking micro-state for the clip duration, throttled with the existing ≥250ms hover throttle. No new UI, no new voice behavior (G8 intact). |
| **D** | 09-states §2 / 14 §2 | Duolingo masks processing latency as in-character "pondering" ([Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)). | Map `fiezel-neural-voice-progress` (model download — already defined as "never speaking", 14 §2) to a capped `thinking` presentation (≤3s, then plain idle) so long TTS loads read as PAW considering, not the app hanging. |
| **E** | 11-splash-onboarding §2 | Duolingo dedicates onboarding screens purely to relationship-building ([Tasu](https://www.tasu.ai/library/duolingo)); PAW upgrades existing steps but adds no dedicated companion beat. | Optional OWNER-decision line item only: one 2–3s "PAW introduces himself by name" beat inside existing step 1 (no new screen, no added friction). Explicitly guilt-free per blocklist item 4. Do NOT add screens — that is funnel/game-design territory (master prompt §4). |
| **F** | 13-reactions §3 | Duolingo made milestones shareable via an in-app share card ([streak milestone blog](https://blog.duolingo.com/streak-milestone-design-animation/)). | Note as **out of scope** for the character system (share cards are product/UI features), but record that milestone-tier PAW art (Proud hold frame, 13 §4) should be exported at share-card-usable resolution so the product team *could* build one without new character work. |

---

## 5. "Same-test" rubric — verifying PAW outputs are non-derivative

A reviewer runs every new PAW asset/animation/sound through this checklist. **Any single ✗ fails QA** (extends master prompt §35 QA).

| # | Test | Method | Pass condition |
|---|---|---|---|
| 1 | **Silhouette test** | Fill PAW's silhouette solid black next to solid-black Duo (owl: round body-with-wings, detached feet — [Building character](https://blog.duolingo.com/building-character/)). Show to 3 reviewers for 2s. | 3/3 identify them as different characters/species; no wing or beak read on PAW. |
| 2 | **Palette test** | Programmatic scan of exported asset colors. | Zero pixels within ΔE < 15 of `#58CC02` / `#89E219`; all colors from PAW's closed palette (spec §14 Color). |
| 3 | **Pose lineup test** | Place the new PAW pose beside Duolingo's published poses (Fire Duo, Buff Duo, balloon Duo, correct-answer dances). | No pose matches in gesture + timing + composition simultaneously; reviewer can name the PAW spec tuple (07/08) the pose derives from. |
| 4 | **Beat-copy test (motion)** | Compare keyframe timing sheets of any PAW celebration against described Duolingo sequences (e.g., Fire-Duo transformation rhythm — [streak blog](https://blog.duolingo.com/streak-milestone-design-animation/)). | PAW's beats trace to 10/13 timing tables, not to a Duolingo reference video; no transformation (same-body rule holds). |
| 5 | **Sound A/B test** | Play the new SFX after Duolingo's correct chime / WaBing to a listener who uses Duolingo. | Listener does not say "that sounds like Duolingo"; spectral/melodic content quotes only the FIEZEL motif (14 §3). |
| 6 | **Persona copy test** | Grep all PAW-adjacent strings and notification copy. | Zero guilt framing (no "PAW sedih", "kamu mengecewakan PAW", crying imagery); tone matches "pembimbing bukan wasit". |
| 7 | **Blind provenance test** | Show the asset (no logos) to 3 people familiar with both apps: "Which app is this from?" | ≥2/3 answer FIEZEL or "not Duolingo". |
| 8 | **Derivation audit** | Author must cite, for each asset, the PAW spec sections (07–14) it derives from. | Every design decision traces to a PAW spec, never to "Duolingo does it this way." Duolingo may only be cited for *principles* P1–P12 of this document. |
| 9 | **Ensemble creep check** | Review any new character-adjacent art. | No second recurring character, no human side-cast, no "world" roster (blocklist item 8). |
| 10 | **Composition check** | Compare screen layouts of celebration/milestone moments with Duolingo's full-screen interstitial + share-card pattern. | PAW celebrations live inside existing FIEZEL surfaces (12 anchors, zero-CLS slots); no new full-screen character interstitial without OWNER approval. |

---

### Source index

- Duolingo blog — Building character: https://blog.duolingo.com/building-character/
- Duolingo blog — How Duolingo animates its world characters (Rive, visemes): https://blog.duolingo.com/world-character-visemes/
- Duolingo blog — Giving our characters voices: https://blog.duolingo.com/character-voices/
- Duolingo blog — Streak milestone design & animation: https://blog.duolingo.com/streak-milestone-design-animation/
- Duolingo blog — Designing new characters (internship): https://blog.duolingo.com/designing-new-characters-internship/
- Duolingo blog — Female character origin stories: https://blog.duolingo.com/duolingo-female-character-origin-stories/
- Rive — Duolingo's AI-powered Video Call brings Lily to life: https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life
- Ambrose Yu — Duolingo core product sounds: https://ambroseyu.com/work/duolingo-core-product-sounds
- Tasu — Duolingo onboarding teardown (38 screens): https://www.tasu.ai/library/duolingo
- Duoplanet — Duolingo character names: https://duoplanet.com/duolingo-character-names/
- Brand Palettes — Duolingo colors: https://brandpalettes.com/duolingo-colors/
- Design Your Way — Duolingo logo/colors: https://www.designyourway.net/blog/duolingo-logo/
- Live capture of https://id.duolingo.com/ — `systems/16-duolingo-landing-screenshot.png` (2026-08-27)
