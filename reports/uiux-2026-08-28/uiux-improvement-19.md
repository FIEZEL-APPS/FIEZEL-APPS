# AGENT 19 — UX Reconstruction & Design Improvement Architecture (FIEZEL)

Timestamp: 2026-08-28T16:30+07 · Inputs: uiux-audit-01..18, uiux-redteam-20 (all read in full), spot-verified against repo HEAD (read-only) at /home/user/workspace/fiezel-repo.

**Identity contract (non-negotiable):** FIEZEL stays FIEZEL — warm yellow/cream v6 "Warm Paper, Bright Mind" palette (`--sun #FFC700`, `--bg #FFF9EE`, `--accent #C2402C`, style.css:652-778), Pau the cat mascot, casual Indonesian kamu/aku register, offline-first single-user PWA, tactile hard-offset shadows, once-per-day splash ritual. Nothing below clones Duolingo; every fix strengthens what already exists.

**Test-gate constraints honored throughout** (verified live in repo):
- `tests/splash-first-paint-test.js` requires: (a) static splash markup in index.html byte-identical to `FiezelSplash.markup()` (tests/splash-first-paint-test.js:187-191), (b) every splash rule copied into `<style id="fiezelBootCritical">` to exist verbatim in style.css — **but boot-only rules ("aturan khusus-boot") are exempt from comparison** (tests/splash-first-paint-test.js:206-218), (c) critical CSS block must precede the style.css `<link>` (:202-203). All splash fixes below use either fiezel-splash.js changes, boot-only rules, or synchronized style.css+index.html edits in one commit.
- `release-audit.py` requires these literals in app.js and must not be broken by any quiz-loop edit: render gate regex `if(!(?:q||!)?validateQuestion(q).ok)continue` (release-audit.py:107-108), `function validateQuestion`, evidence gate `hs.length>=24&&skills.size>=3&&types.size>=2`, absence of `state.totalAnswered>=150`, `GRAMMAR_SESSION_SIZE=25`, `id="answerBurst"`/`showAnswerBurst`/`.answer-burst.show`, `feedbackSounds:true`, `FIEZEL_AI_TIMEOUT_MS=30000`, `currentAIRequest(id,epoch)`, `id="aiRetry"` (release-audit.py:109-127). All sketches below are additive around these literals.

---

## 1. Cross-agent theme synthesis — shared root causes

Nineteen agents filed ~120 findings; they cluster into **eight root causes**. Fixing at the root resolves multiple issue IDs at once.

### RC-A · "Measurement UX was never forked from practice UX" (the biggest cluster)
One `quizLoop(cfg)` serves all 8 flows (verified pass, 01) — good architecture, but exam/placement/skip-gate inherit practice behaviors that are wrong for measurement:
- Mid-test reveal of correctness + correct answer in exams (**09-001**)
- Silent attempt-burn on Keluar with no confirmation (**09-002, 10-001, 16-005, 06-002, 08-002**)
- Reload loophole: `sanitizeState` interruption path skips the penalty `abandonActiveSession` applies (**09-003, 10-002, 20-011**) — app.js:1030 vs app.js:1160-1161
- Confidence popup + 700ms analyzing theater in exams (**10-005, 09-010**)
- Placement runs scaffold/retry hints (**09-005**); exam not identified in topbar (**10-004**); abandon-penalty undisclosed in exam modal (**10-003**)
→ Root fix: an explicit **exam-mode branch keyed off `cfg.type`** inside the one engine (§5).

### RC-B · "No session lifecycle: exit, interrupt, resume are all silent aborts"
`quizExit` → `go('home')` instantly (app.js:6266, 6311); `sanitizeState` hard-codes `view:'home'` and converts any dangling `activeSession` to abandoned/'interrupted' (app.js:1029-1030). Covers **06-002, 08-002, 09-002, 09-004, 05-003, 20-011, 18-P2(no-resume)**. → One exit-confirmation + one resume prompt design (§4.2, §4.3).

### RC-C · "Boot trusts the network and hides its work"
`load()` awaits 3 required bank fetches with no timeout (app.js:2410) → stalls yield a permanently blank stage under a live-looking chrome (**16-001, 17-002, 20-010**); 6.03MB of content JSON is eagerly fetched (**17-001, 17-008, 17-005**); shipped skeletons have zero call sites (**16-004, 12-005**); error card blames file:// for network failures (**16-002, 20-010**); primary CTA awaits a Puter popup with no timeout (**20-001**). → §6.

### RC-D · "The design system's paperwork lags two generations behind the product"
DESIGN-SYSTEM.md documents maroon #8C2233 + Fredoka + dark mode; the live product is yellow v6 + Jakarta/serif + light-only (**03-001, 02-001, 01-002, 03-007, 17-006**). Maroon still leaks in mascot micro-UI (**03-002**) and website tokens (**02-001**); token architecture is fragmented across 5 layers (**03-004, 01-010**); no type/spacing scale (**03-005, 02-006, 02-007**). → §3.

### RC-E · "History stack and overlays each act alone"
Modal dismiss (async `history.go(-1)`) races stage `pushState` (**06-001**); onboarding has no sentinel entry so first back exits the app (**06-005**); overlays stack 3-4 deep at first home and on exam results (**07-004, 09-007, 10-007, 18-P1**); modals aren't inert (**14-001, 04-006**); coach peek overlaps CTAs (**02-010, 04-002, 18-P3**). → §4.1 + an overlay-priority queue (§4.4).

### RC-F · "Reveal moments render off-screen or out of order"
Feedback panel paints below fold with no scroll (**11-001, 08-003**); lesson opens scrolled mid-page under sticky topbar (**02-002**); cloze reveal order contradicts MCQ (**08-004**); confidence asked after verdict (**09-006**). → small scroll/ordering fixes (P1-4, P2 items).

### RC-G · "Four voices, one product"
kamu/aku canon (quota-copy.js) vs gue/ga coach bubble vs lu/bro notifications vs raw-English errors (**15-001, 15-002, 15-003, 15-005..15-013, 18-P3, 16-002**). → single persona canon + copy lint (§2 P2-8).

### RC-H · "Shipped-but-unwired assets"
Skeleton helpers (**16-004**), level_up/streak_10 SFX (**13-005**), dead micro-animation CSS (**12-006**), duplicate keyframes (**12-003, 12-005**), preloads for fonts never used at boot (**17-006**). → wire or delete, per item below.

---

## 2. Prioritized P0–P4 fix list

No audit filed a P0; I promote two clusters to P0 because both leave the user staring at a dead app (the P0 bar: stuck/blocked).

### P0 — user stuck / app looks dead

**P0-1 · Bank-fetch stall = permanent blank app** — resolves **16-001, 17-002, 20-010(b)**; improves **16-002**.
Target: app.js:2410 (`load()`), app.js:7656 (`load().catch`), index.html:125-134 (15s watchdog).
Sketch (small diff, no gated literals touched):
```js
// app.js load(): add timeout so stalls reject into the EXISTING catch path
const get=async f=>{const r=await fetch(new URL(f,root),{signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error(`${f}: ${r.status}`);return r.json()};
```
And in the `load().catch` card (app.js:7656): branch the message + add retry:
```js
const offline=!navigator.onLine, fileProto=location.protocol==='file:';
const msg=offline?'Kamu lagi offline. Sambungkan internet dulu, ya.'
  :fileProto?'Jalankan melalui server lokal/GitHub Pages, bukan file://.'
  :'Materi belum bisa dimuat. Servernya lagi bermasalah atau koneksimu putus-putus.';
// render: `<button id="bootRetry" class="primary">Coba lagi</button>` → onclick re-runs load()
```
This also fixes 16-002's raw-English `Failed to fetch` interpolation (RC-G). While `load()` is pending, paint the skeleton (see P1-9/§6.3) so the stage is never silently blank.

**P0-2 · Primary CTA "Mulai sesi ini" hangs forever on Puter popup** — resolves **20-001**.
Target: app.js:5436 (`startAdaptive` awaits `resolveAdaptivePolicy`), app.js:2362, app.js:4321.
Sketch: wrap the policy resolution in a hard race — the local fallback pool already exists and works (verified: blocking js.puter.com falls back in 1.2s, agent 20 pass):
```js
const policy=await Promise.race([resolveAdaptivePolicy(...),
  new Promise(res=>setTimeout(()=>res(null),4000))]); // null → local pool path
```
Plus immediate button feedback on tap: `btn.disabled=true; btn.setAttribute('aria-busy','true')` and restore on settle. Never gate first-question render on network sign-in.

### P1 — major blockers (implementation sketches mandatory)

**P1-1 · Exam mode must not reveal answers mid-test** — resolves **09-001**; supports **09-006, 10-005, 09-010**. Design in §5.1. Targets: app.js:6441 (`answer()` classList), app.js:6390-6395 (`reveal()`), app.js:2542 (`answerFeedbackSignal`), app.js:6506-6507 (`openConfidencePop`).

**P1-2 · One consistent abandon policy + confirmation + reload-loophole closure** — resolves **09-002, 09-003, 10-001, 10-002, 10-003, 16-005**; partially **06-002, 08-002**. Design in §5.2. Targets: app.js:6266+6311 (`quizExit`), app.js:1154-1163 (`abandonActiveSession`), app.js:1030 (`sanitizeState` interrupted branch), app.js:4193 (exam modal copy), app.js:6555-6559 (stage leave hook).

**P1-3 · Modal→stage history race** — resolves **06-001**. Design in §4.1. Targets: app.js:4161-4163 (closeModal→quizLoop), app.js:5735 (skip-gate start), features/ui/fiezel-back-nav.js (new `replaceLayerWithStage()`).

**P1-4 · Feedback/explanation visible after reveal** — resolves **11-001, 08-003**; sibling fix for **02-002**.
Target: app.js:6394 (end of `reveal()`), app.js:6533-6547 (`revealCloze`), app.js:5692/3899 (`openGrammarLesson`/`enterStage`).
Sketch (mirrors the tutorTurn pattern that already scrolls):
```js
// at end of reveal(): the learning payload must be on screen
if(!prefersReducedMotion())f.scrollIntoView({behavior:'smooth',block:'nearest'});
else f.scrollIntoView({block:'nearest'});
```
And in `enterStage()` (app.js:3899): `window.scrollTo(0,0)` before stage render so lesson titles never open half-hidden under the sticky topbar (02-002).

**P1-5 · Fix the onboarding→placement handoff** — resolves **07-002, 18-P1**; tames **07-004**.
Target: app.js:3493 (`pendingAfterGate==='placement'`), app.js:3497 (`armPuterAuthGate`), app.js:3619-3624 (`afterOnboardingExit`).
Sketch: on the explicit placement path, set a flag and skip the gate + skip-level modal entirely:
```js
// afterOnboardingExit: if(exit==='placement'){ startPlacement(); state.pendingPostPlacementGate=true; return; }
// after placement result renders → armPuterAuthGate() (account ask lands where its value is visible)
```
The level-entry "Ujian Skip Level" modal must never hijack this path — a user who *chose* the placement test has answered the level question. One overlay at a time (§4.4) covers the rest of 07-004.

**P1-6 · 300px ritual flame icon + 280px overflow** — resolves **20-002, 20-003**.
Target: style.css (near :3571 `.fz-ritual-streak`), style.css:2281 (base `.fz-i`).
Sketch (2 lines of CSS; kills the defect class permanently, as agent 20 asked):
```css
.fz-i{max-width:48px;max-height:48px} /* base guard: no icon may balloon again */
.fz-ritual-streak .fz-i{width:20px;height:20px}
```
Plus `.topbar-actions{min-width:0}` for the 280px overflow remnant. (Not part of the index.html inline splash block → no splash-test interaction.)

**P1-7 · DESIGN-SYSTEM.md rewrite** — resolves **03-001, 02-001, 01-002, 03-007**. Outline in §3.

**P1-8 · Boot payload diet + perceived-progress** — resolves **17-001, 17-002, 17-008**; improves **17-005**. Plan in §6.

**P1-9 · Wire the skeletons** — resolves **16-004, 17-002(visual)**; uses existing features/ui/skeleton-helpers.js (index.html:414, precached sw.js:51). Plan in §6.3.

### P2 — important UX problems (sketches mandatory)

**P2-1 · Session resume ("Lanjutkan sesi tadi?")** — resolves **05-003, 09-004, 20-011, 18-P2(no-resume)**. Design in §4.3. Targets: app.js:1029-1030, app.js:3493 area (boot sequence).

**P2-2 · Onboarding draft persistence + back button from step 2** — resolves **07-001, 07-005**; hardens **06-005**.
Target: features/onboarding/fiezel-onboarding.js:83 (STORAGE_KEY), :186-201 (markCompleted), :485/:521 (topbar(false)), :640-644.
Sketch: write `{done:false, step, name, goal, level}` to `fiezel-onboarding-v1` on every step advance; on boot with `done:false`, resume at `step` and prefill name (also from `state.userName`). Change `topbar(false)`→`topbar(true)` at :485 and :521 (one-argument fix, per agent 07). Add the back-nav sentinel push when onboarding opens (fiezel-back-nav.js:211-213 area) so first Android back doesn't exit the app (**06-005**).

**P2-3 · Listening play watchdog** — resolves **08-001**; sibling of **11-007, 13-002**.
Target: app.js:6333-6348.
Sketch: `Promise.race([audio.play(), timeout(9000)])` → on timeout: re-enable Dengarkan, `unlock()`, note 'Suaranya belum berbunyi. Coba sekali lagi atau lanjut.' (reuse existing failure branch copy). In Skills Lab, surface the existing `no_audio` state (addon:706) after the same bound (**11-007**), and wire `tts.stop` to a visible stop control (**13-002**).

**P2-4 · Cancellable AI-explain + offline short-circuit** — resolves **11-002, 16-003**.
Target: app.js:7449 (`openAILoading`), app.js:7403-7429, app.js:3737-3752.
Sketch: add `<button id="aiCancel" class="ghost">Batal</button>` to the loading modal; wrap `explainWithAI` in the same 25s `Promise.race` used by writing (app.js:5218-5245 — pattern already in repo); check `navigator.onLine` before dispatch and show the existing offline copy immediately. Keep `id="aiRetry"` and `FIEZEL_AI_TIMEOUT_MS=30000` literals intact (release-audit.py:116).

**P2-5 · Two-tab last-writer-wins loss** — resolves **20-005**.
Target: app.js:1072 (`saveFlushWrite`).
Sketch: guard the clobber + listen:
```js
// before setItem: const stored=readStoredRevision(); if(stored>state.stateRevision){adoptStored();return;}
window.addEventListener('storage',e=>{if(e.key===activeStateStorageKey&&newerRevision(e.newValue))adoptStored()});
```

**P2-6 · Modal/dialog inertness** — resolves **14-001, 04-006, 14-004**.
Target: app.js:7142/7147 (`openModal`/`closeModalNow`), features/onboarding/fiezel-onboarding.js:637-638, features/neural-voice/fiezel-diag-panel.js:280.
Sketch: `document.querySelector('main.app').inert=true` (+ `.bottomnav`) while any dialog/onboarding is open; restore focus to invoker on close. Give `#fiezelDiagOpen` `tabindex="-1" aria-hidden="true"`.

**P2-7 · Register + terminology unification (one persona canon)** — resolves **15-001, 15-002, 15-005, 15-007, 15-011, 15-013, 18-P3**; and error-copy routing **15-003, 16-002**.
Sketch: canon = quota-copy.js voice (kamu/aku, "nggak", no tech nouns, no blame). Sweep list (all string-only diffs): coach-bubble gue/ga → aku/kamu (fiezel-coach-bubble.js:128-133); placement name → **"Tes penempatan"** everywhere (app.js:5958, 4401, 5436, 3989); deferral CTA → **"Nanti dulu"** (index.html:200, app.js:4193, 5733, 4401); "jatah" not "limit" (app.js:7248, 7256); "Runtun" in modal+gate too (app.js:4193, index.html:212); route the 8 raw-error interpolations through `aiErrorMessage()`-style authored copy (app.js:6180, 4160, 3749, 6352). Add a copy-lint test file (new, additive, joins the 164 gates) asserting banned tokens (`gue`,`bro`,`Anda`,`Failed to fetch` in UI strings).

**P2-8 · Returning-user splash (fast path)** — resolves **12-001, 17-004**; helps **07-011**. Design in §6.2 (splash-test-safe).

**P2-9 · Settings save button at 320px** — resolves **04-001**.
Target: style.css:506 (`.modal-actions`).
```css
@media (max-width:340px){.modal-actions{flex-wrap:wrap}.modal-actions button{flex-basis:100%}}
```

**P2-10 · Reset progres must reset everything it promises** — resolves **01-001**.
Target: app.js:7556 (`resetProgress`).
Sketch: maintain a `EVIDENCE_KEYS=[...]` registry (the 9 global keys agent 01 enumerated: `fiezel-sl-v1-state`, `fiezel-library-progress-v1`, `fiezel-mastery-bkt-v1`, `fiezel-confusion-matrix-v1`, `fiezel-misconception-ledger-v1`, `fiezel-item-calibration-v1`, `fiezel-olm-negotiation-v1`, `fiezel-srl-coach-v1`, `fiezel-tour-v1`) and remove them in `resetProgress()`. Longer-term: account-scoped storage facade (P3).

**P2-11 · Review demand/supply + count mismatch** — resolves **18-P2(reviews), 18-P2(12 vs 8)**.
Target: app.js:6873 (`slice(0,8)` feeding the stat), app.js:6885 (rows only), app.js:4313 (home chip).
Sketch: compute `const dueAll=dueItems()` once; `stat('Ulangan', dueAll.length)`; display list stays sliced. Add one CTA button "Mulai review (N)" on Peta + home chip tap → start a review-composed session via the existing quizLoop with the due queue (smallest viable: reuse `startAdaptive` with a review-weighted pool).

**P2-12 · Boot toasts speak developer** — resolves **15-009, 18-P2(jargon)**.
Target: app.js:3474. Route 'Core Brain…' status lines to the Diagnostics panel; show at most one learner-worded toast on genuine failure ('Pengingat jarak jauh belum aktif — cek Pengaturan').

**P2-13 · Ask-label contrast (only axe violation)** — resolves **14-002**.
Target: style.css:2006-2007. Drop `opacity:.75` (full `--muted #6E5E47` passes at ~5.8:1).

**P2-14 · One theme-color story** — resolves **05-001, 02-012**.
Target: manifest.json:8, index.html:17, app.js:2492. Set manifest `theme_color` to `#FFF9EE` (matches static meta + splash background `background_color` — already `#FFF9EE`); keep the runtime ambient rewrite but document it in DESIGN-SYSTEM.md §Ambient (§3).

### P3 — consistency/polish (targets only; all are small, self-contained)
- **02-003** level-trust chip → `--info #7A5F1B` ≥12px (style.css:3482) · **14-003** `.hero-stat small` on `--sun` → `--ink` (style.css:2780-2785)
- **02-004** remove `font-weight:700` at style.css:1106 · **02-005/02-006/02-007** adopt type/radius scale during §3 sweep
- **02-008** decorative category tokens ≠ state tokens (style.css:2330 vs :271) · **02-013** label the scaffold tint or suppress hover-leak
- **04-003** `Lewati materi` ≥44px hit area (style.css:3618) · **04-004** `.path-step::after{pointer-events:none}` (style.css:3509) · **04-005** setup-link as row (style.css:889)
- **06-003** highlight Home tab in home-launched sub-views · **06-004** replace lateral tab pushes (fiezel-back-nav.js:155-166)
- **07-006/07-007/07-009/07-010** onboarding copy/layout retitles (fiezel-onboarding.js:566-568, :547, :607-608)
- **08-004** route cloze through `confidencePopThen` (app.js:6533-6547) · **08-005** 'PERCOBAAN 1' badge (app.js:6441) · **08-006** thin progress bar + fewer taps
- **09-005** placement `noHints` (app.js:6186) · **09-006** confidence before verdict (app.js:1279) · **09-007/10-007** queue prasasti/tour off result screens (app.js:6675-6681) · **09-008** exam blueprint disclosure/listening parity (app.js:102) · **10-006** home skip-level mention
- **11-003** `role="status" aria-live="polite"` on `#feedback` (app.js:6310) · **11-004/09-010** correct-answer copy dedupe (app.js:6395) · **11-005** Skills Lab badges (addon css:18) · **11-006** progressive disclosure of long explanations
- **12-002** low-opacity logo in pre-JS splash frame (boot-only rule, splash-test-exempt) · **12-003** rename duplicate `pageIn` (style.css:1857) · **12-004** transform-based coreScan/celestial (style.css:3237, :123)
- **13-001** relabel 'Suara jawaban' → 'Suara aplikasi' (app.js:6952) · **15-006/15-008/15-010/15-012** casing/tab-label/coming-soon/placeholder sweeps
- **16-006** placement shortfall notice (app.js:6173-6187) · **16-007** quarantine corrupt state + restore pointer (app.js:1061)
- **17-003** make tutor-v3.css + speaking-listening-addon.css non-render-blocking (index.html:82-84) · **17-006** preload PlusJakartaSans-700 instead of serif/Fredoka (index.html:40-44)
- **20-006/20-007/07-008** `normalizeName` in `sanitizeState` + code-point-safe truncation `Array.from(s).slice(0,24).join('')` (app.js:1027, fiezel-onboarding.js:123) · **20-008** `<noscript>` block · **20-010(a)** boot watchdog for app.js itself · **01-003..01-007** architecture dedupe items
- **02-010/04-002/18-P3(mascot)** coach-peek clearance rules (style.css:3252-3266) — never anchor over a primary CTA

### P4 — enhancements
**02-011** one primary CTA per hero · **02-014** '16 materi' · **05-004/05-005** iOS metas + wide screenshot/monochrome icon · **05-002** update toast w/ skipWaiting handshake · **08-007** Damerau-Levenshtein · **08-008** '1 / 25' spacing · **09-009** cooldown line in intro · **12-006/12-007/12-008** dead-CSS cleanup, single press mechanism, denied-tap shake · **13-003/13-004/13-005** audio polish/wiring · **14-005/14-006** home h1, on-sun focus ring · **15-014..15-017** copy nits · **20-004** <300px breakpoint · **20-009** `t.finished.catch(()=>{})` (app.js:3865) · **01-009/01-011** feedback-channel + deep-link notes.

---

## 3. Design-system corrections — DESIGN-SYSTEM.md rewrite outline

Resolves **03-001, 02-001, 01-002, 03-002, 03-004, 03-005, 03-007, 17-006, 05-001**. Source of truth: **style.css second `:root` block (652-778, "FIEZEL Design System v6.0")** — confirmed live at runtime by agents 02/03 (computed values match exactly).

Rewrite outline (replace the doc wholesale; keep the file name so links survive):

1. **Identity** — "Warm Paper, Bright Mind". Yellow is the brand *field*, never small-text color (codify style.css:14-18/:698-700 rule). Pau mascot, kamu/aku voice pointer to quota-copy.js canon (RC-G).
2. **Color tokens (real values)** — `--sun #FFC700`, `--sun-deep`, `--bg #FFF9EE`, `--paper`, `--panel`, `--ink #241A11`, `--muted #6E5E47`, `--accent #C2402C` (terracotta — NOT maroon), `--gold #C9A24B`, semantic `--good/--good-soft/--bad/--bad-soft/--info #7A5F1B/--focus-ring #A67A00` + `--focus-ring-on-core`. Include the contrast annotations agents verified (ink-on-sun 10.9:1; `--info` is the only yellow approved for text).
3. **Dark mode: REMOVED** at m025-134 — state it plainly, delete the whole section (01-002, 02 pass note). Document the `color-scheme:light` pin (index.html:17-20) and the defensive `data-theme` shim decision (03-007).
4. **Typography roles (real)** — body: FZ Plus Jakarta Sans 400/500/600/700; display: FZ Instrument Serif 400 (never faux-bold — fixes 02-004); FZ Fredoka: restricted to `.word` + `.lesson-title` or retired (owner decision; 02-005). Self-hosted only, no Google Fonts CDN (verified pass). **New: type scale tokens** `--fs-11/12/14/16/18/21/24/28` (03-005, 02-006) with 11px floor.
5. **Space & radius** — codify `--radius-sm/md/lg/pill 12/16/24/999` as the only radii; add `--radius-xs:8px` if needed; introduce `--space-*` scale; migration note for the one-off radii (02-007).
6. **Shadows** — document the tactile hard-offset signature (verified pass, 02) + 2-3 ambient tokens (03-005).
7. **Icons** — two-system rule made explicit: `fz-i` duotone = identity chrome (nav, module/skill cards); Lucide stroke = in-content glyphs (01 pass, 02-009). **Every `.fz-i` context must declare width/height; base class carries a max-guard** (20-002 lesson).
8. **Ambient scenes** — 4 `scene-*` phases, runtime `theme-color` meta behavior, and the single boot chrome color `#FFF9EE` (05-001, 02-012).
9. **Motion** — single-clock splash contract, transform/opacity-only rule, reduced-motion kill-switches (12 passes), named-keyframe registry to prevent collisions (12-003, 12-005).
10. **Token governance** — one `:root` (v6). Plan: hoist the 31 block-1-only live tokens into v6, reduce block 1 to a deprecation shim (03-004); re-point mascot `--fz-maroon/--fz-gold` private palette at canonical tokens (03-002); normalize var() fallback literals (03-006); **add a token-sync test** (new gate) that diffs duplicated tokens and fails on drift.
11. **Copy canon** — one page: kamu/aku, "nggak", authored errors only, term table (Tes penempatan / Runtun / jatah / Nanti dulu) (15-001..15-013).
12. **Website note** — website/tokens.css still ships maroon; either migrate or version it explicitly as "legacy marketing palette" (02-001).

Doc-only change; zero test-gate risk. Ship in the same commit as the stale-comment sweep (style.css:1279, index.html:2).

---

## 4. Navigation & interaction improvements

### 4.1 Modal→stage history race (06-001) — design
Problem: `closeModal()` → `FiezelBackNav.dismiss('modal')` → **async** `history.go(-1)`, then `quizLoop()`→`enterStage`→`pushState` runs before the rewind lands; stack says depth-1 while the real pointer is on the base entry.
Fix (option b from agent 06, cleanest): add to features/ui/fiezel-back-nav.js:
```js
// swap the top layer entry for a stage entry IN PLACE — no go(-1), no race
function replaceLayerWithStage(stageSpec){
  const top=stack[stack.length-1];
  if(top&&top.kind==='layer'){stack[stack.length-1]=stageEntry(stageSpec);
    history.replaceState(stateFor(stack),'' ,location.href);return true}
  return false;
}
```
Call sites: app.js:4161-4163 (level exam start) and app.js:5735 (skip gate start) use `closeModalNow()` (visual close, app.js:7147 — no history op) + `replaceLayerWithStage(...)` instead of `closeModal()`+push. All other modal flows keep the existing dismiss path. Add a unit test in the fiezel-back-nav test family asserting depth and pointer agree after exam start.

### 4.2 Exit-confirmation pattern (06-002, 08-002, 09-002, 10-001, 16-005)
One shared confirm, differentiated by stakes, triggered from three chokepoints: `quizExit` onclick (app.js:6266, 6311), the stage leave/back hook (app.js:6555-6559 — return false → show confirm), and bottom-nav taps while `state.activeSession` exists.
- **Practice / adaptive / vocab / reading, answered ≥1:** "Keluar? ${answered}/${planned} jawaban sesi ini nggak dilanjutkan." [Keluar] [Lanjut belajar]. Answered 0 → exit freely (matches the existing free-peek rule, 09 pass).
- **Placement:** "Keluar? Tesnya mulai dari awal lagi kalau kamu balik." (09-004)
- **Level exam / skip gate, answered ≥1:** "Keluar sekarang dihitung gagal dan ujian terkunci 24 jam. Tetap keluar?" — states the exact consequence (10-001). After confirmed quit, toast on Home: "Percobaan terpakai. Bisa diulang 24 jam lagi." Use the existing `.welcome/.modal` panel system (app.js:7142) so it's automatically a back-nav layer; Android back on the confirm = cancel.
- Disclose the rule up front: add the abandon-penalty bullet to the exam modal at app.js:4193, mirroring the skip-gate modal at app.js:5733 (10-003).

### 4.3 Session resume design (05-003, 09-004, 20-011, 18-P2)
Keep `sanitizeState`'s integrity conversion (app.js:1030) but make it non-destructive for fresh interruptions:
```js
// instead of silently logging: stash a resume capsule (practice/adaptive only)
if(age<30*60*1000 && !isMeasurement(a.type)){next.resumeOffer={session:a, savedAt:now}}
// then log to sessionHistory as today, either way
```
On first home render after boot, if `state.resumeOffer` exists: one dismissible card (not a modal — respects §4.4) "Lanjutkan sesi tadi? Kamu berhenti di soal ${answered+1}/${planned}." [Lanjutkan] [Mulai baru]. Resume replays `quizLoop(cfg)` with the persisted remaining queue — requires persisting the planned question ids in `beginLearningSession` (app.js:1152); bank items are re-hydrated by id at resume. **Measurement sessions are never resumable** — they settle per §5.2, which is what closes the reload loophole coherently. Also restore `view` for placement-done users instead of hard-coding `'home'` (app.js:1029) — only for main views, stages excluded.

### 4.4 Overlay priority queue (07-004, 09-007, 10-007, 18-P1)
One rule: **max one overlay at a time**, drained in priority order from a tiny queue: (1) resume offer, (2) tour, (3) notification invitation, (4) Puter auth ask, (5) prasasti/achievements. Exam/placement result screens set a `resultOnScreen` flag that defers prasasti + tour + generic session toast to the next Home visit (09-007, 10-007). The skip-level "level-entry gate" modal never auto-fires in the first session after onboarding (P1-5). Coach peek: suppress when any overlay is open, and never anchor over an element matching `.primary` (02-010, 04-002).

---

## 5. Assessment integrity design

### 5.1 Exam mode: no mid-test reveal (09-001)
Add one derived flag inside `quizLoop`: `const MEASURE=['level-exam','grammar-skip','placement'].includes(String(cfg.type||''));` (placement included per 09-005 — it already scores first-tap-only, app.js:6445).
Behavior under `MEASURE`:
- `answer()` (app.js:6441): skip `classList.add(ok?'correct':'wrong')` → add a neutral `'picked'` class (new CSS: outline + "TERSIMPAN" tag); skip `answerFeedbackSignal` verdict burst (app.js:6392/2542) — play a neutral `button_tap` instead so audio feedback stays alive without leaking the verdict. **The `id="answerBurst"`/`showAnswerBurst` literals stay in code** (used by practice) so release-audit.py:125 keeps passing.
- `reveal()` (app.js:6390-6395): under `MEASURE`, render a one-line "Jawaban tersimpan." and enable Lanjut — no correct answer, no pembahasan, no AI button.
- Confidence popup: skip under `MEASURE` (app.js:6506-6507) — resolves **10-005**; for practice, move it before the verdict (09-006, P3).
- 700ms analyzing theater: skip under `MEASURE` (app.js:2571-2591) — resolves **09-010** in exams.
- **Post-test review screen**: after the result verdict, add "Lihat pembahasan (25)" — the full per-item review (chosen vs correct + explanations + AI button) moves here. Learning value is preserved, measurement is protected. The scaffold/retry path is disabled under `MEASURE` (placement currently runs it, 09-005): extend the existing `noHints` config (already true for exams, app.js:6163) to placement at app.js:6186.
- Topbar identification (**10-004**): under `MEASURE`, render a small label under the progress counter: "Ujian Skip Level B1 · tanpa petunjuk" / "Tes penempatan". (Additive markup in the app.js:6310 template; no gated literal touched.)
- Renderer edits must keep the render gate `if(!q||!validateQuestion(q).ok)continue` byte-intact (release-audit.py:107).

### 5.2 Consistent abandon policy — close the reload loophole (09-003, 10-002)
Today: `abandonActiveSession` punishes (app.js:1160-1161: `recordSkipExamFail` + `skipGateCooldownUntil`) but the boot path doesn't (app.js:1030). Two coherent designs; recommend **(A)**:
**(A) Settle at attempt start (recommended, race-proof):** when a measurement session begins (`beginLearningSession`, app.js:1152), immediately persist an `inflightAttempt={type, levelScope|skipGateSkill, startedAt}` marker inside state (this write already flushes within ~9ms per agent 20's persistence pass). On clean completion or free-peek exit (answered 0), clear it. On next boot, `sanitizeState` finds a dangling marker with answered>0 → apply exactly `recordSkipExamFail`/`skipGateCooldownUntil` and show the one-time notice "Ujian kemarin terputus di soal N — percobaan terpakai, bisa diulang 24 jam lagi." Reload, crash, and process-kill all land in the same rule as Keluar. Keep the answered==0 grace (matches m025-177 anti-peek design).
**(B) Drop the punitive model, make exams resumable within 30 min:** simpler emotionally, but re-opens the peek-and-reroll exploit m025-177 closed unless the question set is pinned per attempt. Only choose with owner sign-off.
Either way the policy must be **symmetric across Keluar / back / nav-tap / reload** and **disclosed** in the exam modal (10-003) and placement intro (09-009).

### 5.3 Validity notes
Exam badge scope label or listening parity (09-008, app.js:102) — P3; placement shortfall notice when <25 items load (16-006).

---

## 6. Boot & perceived-performance plan

### 6.1 Bank fetch timeout + retry (P0-1) — see §2 sketch. 20s `AbortSignal.timeout`, branched Indonesian error copy, `Coba lagi` button re-running `load()`.

### 6.2 Returning-user splash (12-001, 17-004, 07-011, 12-002)
Constraint: splash-test compares copied rules to style.css but **exempts boot-only rules** (tests/splash-first-paint-test.js:211) and requires markup identical to `FiezelSplash.markup()`.
Design:
- **Inline boot script** (index.html, inside the existing early script that owns the watchdog): read `localStorage['fiezel-splash-seen-v1']` synchronously; if seen today, add class `fz-splash-fast` on `<html>`.
- **Boot-only CSS** (new rules in `#fiezelBootCritical` only — exempt from the style.css comparison): under `.fz-splash-fast`, show the composed logo statically at full opacity (`html.fz-splash-fast #fiezelBootSplash .fz-fgroup{opacity:1}`) + a subtle indeterminate shimmer bar. No choreography.
- **fiezel-splash.js**: when seen-today, skip the beat table and hold only until app-ready, `MIN_TAIL_MS` → ~400ms; keep the full 3.56s show for the first run of the day (preserves the brand ritual the owner designed). This also fixes the "featureless dark screen" (12-001) and cuts every warm launch by ~3s (17-004: measured 4.14s → ~1.1s).
- Markup unchanged → `markup()` identity test unaffected. New behavior gets its own additive test file.
- Sibling first-frame fix (12-002): render the logo at low opacity in the static frame via a boot-only rule.

### 6.3 Skeleton usage (16-004, 17-002, P1-9)
Wire the shipped `SkeletonHelpers` (features/ui/skeleton-helpers.js) at exactly three call sites:
1. `#app` while `load()` is pending (home-shaped skeleton: hero card + 4 skill rows) — killed on first `render()`;
2. Perpustakaan/list views while their lazy JSON loads;
3. boot error card replaces the skeleton (never blank).
Before wiring, fix the shimmer keyframe collision (12-005): namespace tutor-v3.css:81 `shimmer`→`tutorShimmer`, and prefer the transform-based `fzShimmer` sweep. If the owner prefers not to wire them, delete the module from the shell + precache instead — but wiring is the better fix since 17-002 needs a perceived-progress state anyway.

### 6.4 Boot payload diet (17-001, 17-008, 17-005)
Phase 1 (safe, config-level): defer `listening-bank-v1.json` prefetch until placement/listening entry; defer `library-books-v1.json` until Perpustakaan opens (both are `optional()`-style loads — keep `DATA` core to vocabulary/reading/grammar so app.js:2410's contract holds).
Phase 2: split banks per CEFR level (`reading-bank.A2.json`…), load active level + neighbors; JSON.parse in the existing worker infrastructure (fiezel-core-worker.js) to cut the 2.1s max long task (17-008).
Phase 3 (SW): move giant JSON banks out of the atomic shell precache into a versioned data cache filled lazily (17-005) — big win for the ~9.6MB install and full re-download per SW_REV. Requires careful sw.js work; schedule after Phases 1-2 prove out. Verify against sw-precache tests and the health-ping protocol (sw.js:40-47).

### 6.5 Preload set fix (17-006) + render-blocking CSS (17-003)
index.html:40-44: preload `PlusJakartaSans-700.woff2` (used by boot-visible text) instead of InstrumentSerif-400 + Fredoka-var (~50.7KB unused on the critical path — neither activates during splash→onboarding). Make tutor-v3.css and speaking-listening-addon.css non-render-blocking (index.html:82-84, `media="print"` swap or inject on view entry — neither styles splash/home). Keep the `#fiezelBootCritical` before-style.css ordering (tests/splash-first-paint-test.js:202).

### 6.6 View-switch cost (17-007) — P3, larger refactor
Cache per-view DOM or keyed containers so tab switches stop re-parsing innerHTML (401-783ms today). Do after the P0/P1 wave; guard with the existing boot-order and back-nav tests. Also `t.finished.catch(()=>{})` on `startViewTransition` (20-009, one line at app.js:3865).

---

## 7. What NOT to change (verified passes worth protecting)

These are load-bearing strengths, verified live by the audit; regressions here would be worse than any issue above:

1. **The one quiz engine + stage/back-nav macro-architecture** — single `quizLoop(cfg)` for all 8 flows; `enterStage` stores "how to draw", `FiezelBackNav` solely owns history (01 passes). Fix inside it (§5), never fork it.
2. **Double-tap/double-submit protection everywhere** — options, Lanjut, cloze Periksa, 10-click hammer = 1 record (08, 20 passes). Any `answer()` edit (P1-1) must keep `answer.locked` semantics intact.
3. **XSS-safe rendering** — `esc()` discipline held against every hostile-name payload (20 pass); `ai_escape` literals are release-audit-gated (release-audit.py:115).
4. **Instant, reload-safe persistence** — answers persist within 9ms; corruption matrix (17 keys) boots clean every time (16, 20 passes). P2-5 adds a guard, must not add write latency.
5. **Offline-first core** — 157/157 precache entries exist, exact superset of shell needs, versions coherent across core-config/sw/BUILD-VERSION; 90/90 requests from SW when warm (05, 17 passes). §6.4 Phase 3 must preserve the atomic-shell integrity tests.
6. **The splash system's engineering** — inline first-frame contract, single choreography clock, once-per-WIB-day policy, 15s watchdog, tap-to-skip, exemplary reduced-motion coverage (12 passes). §6.2 adds a fast path; it must not touch the beat table or markup identity.
7. **SFX system** — 54/54 files, one engine, throttling, armed-with-deadline autoplay semantics, honest diagnostics row (13 PASS verdict — the only outright PASS in the audit).
8. **Accessibility baseline** — zero div-soup (85/85 onclick on real buttons), axe near-clean, keyboard-completable onboarding + quiz, assertive `#answerBurst` live region, lang=id, real labels (14 passes). Keep `#answerBurst` markup and live-region order intact when touching feedback.
9. **Responsive foundation** — zero horizontal overflow on all 9 viewports, safe-area discipline, breakpoint layout switching (04 passes).
10. **Onboarding craft** — one typed field, honest stepper, mascot poses per step, skip paths, name-gated CTA (07 passes). P2-2 adds persistence; the flow's shape stays.
11. **Assessment communication** — exam instruction modal (count/blueprint/pass bar/cooldown), honest fail screens with weakest-skill lines, no DOM answer leaks, shuffled options, no fake timers (09/10 passes). §5 changes what leaks mid-test, not this honesty.
12. **Pedagogical feedback design** — kind verdicts, distractor-specific explanations, tutor retry with escape hatch, reteach cards, "never shames" tone (11/18 passes).
13. **Copy canon islands** — quota-copy.js, aiErrorMessage(), destructive confirmations, level-guard coaching (15 passes). These are the *template* for P2-7, not targets of it.
14. **Fonts self-hosted, no CDN** (02/03/17 passes) — §6.5 changes *which* file preloads, never the hosting rule.
15. **Ambient celestial scene system + tactile shadow signature + duotone identity icons** — this IS the FIEZEL identity; §3 documents it, nothing removes it.

---

## Sequencing (suggested waves)
- **Wave 1 (P0 + integrity):** P0-1, P0-2, P1-1, P1-2, P1-3 — all app.js-local, small diffs, each with an additive test.
- **Wave 2 (visibility + first-contact):** P1-4, P1-5, P1-6, P2-2, P2-3, P2-9, P2-13, §4.4 queue.
- **Wave 3 (docs + system):** P1-7 (§3), P2-7 copy sweep + lint, P2-14, token consolidation start.
- **Wave 4 (performance):** P1-8/P1-9 (§6.1-6.3, 6.5), then §6.4 phases, §6.6.
Every wave: run the full 164-gate suite; splash and release-audit gates are the two with cross-file coupling (see constraints at top).
