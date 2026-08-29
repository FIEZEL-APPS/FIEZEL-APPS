# Evidence

Everything numeric in `../01-AUDIT.md` comes from here. Reproducible.

## Running it

```bash
cd /path/to/FIEZEL-APPS
python3 -m http.server 8931 &
npm i playwright                     # PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 if Chromium is preinstalled
SP=$(pwd)/design/ux-2026/evidence node design/ux-2026/evidence/capture.js
SP=$(pwd)/design/ux-2026/evidence node design/ux-2026/evidence/analyze.js
```

Both scripts expect `$SP/node_modules/playwright` and write into `$SP/shots` and
`$SP/metrics.json` / `$SP/analysis.json`.

## What each does

- **`capture.js`** — visits all 15 routes at 390×844 (DPR 2), full-page screenshot each,
  and records per-screen density: scroll height, visible element count, boxed containers
  (≥100×44px with a border, background or shadow), controls, visible characters,
  paragraphs >110 chars, and sub-44px control boxes.
- **`analyze.js`** — per-screen accessibility and structure sweep: computed contrast for
  every text node against its resolved background, computed font size for every text node,
  container nesting depth, uppercase eyebrow count, heading list, long-paragraph list.
- **`phases.js`** — stubs the wall clock to 06:30 / 12:00 / 17:30 / 21:00 and measures the
  screen-title contrast in each of the four sky phases. This is the regression check for
  P0-1; it reports 16.28:1 in all four after the fix, and reported 1.00:1 (night) /
  1.02:1 (dusk) before it.
- **`seed.json`** — the learner state used for every run: A2, placement done, 4-day streak,
  neural voice off. Onboarding, tour and splash flags are set by the scripts, and
  `js.puter.com` is route-aborted so the auth gate cannot hijack a run.

## Reading the numbers

Two caveats learned while producing this audit — both cost a false positive before they
were understood:

1. **A control's box is not its hit area.** `.lesson-skip-link` measures 24px tall but
   carries a `::before` extending it to 44px. `analyze.js` reports the box; always read
   the CSS before calling a target too small.
2. **Gradient backgrounds defeat background-walking.** An element with
   `background:linear-gradient(...)` has a transparent `backgroundColor`, so the walker
   climbs to its parent and can report a contrast failure that does not exist
   (`.core-cta` on `.core-panel` reported 1.06:1 and is actually fine). Confirm any
   contrast failure against the computed `color` and a real pixel before acting.

The one contrast failure in `analysis-before.json` that survived both checks is P0-1 —
confirmed by reading the computed colour (`rgb(248,250,255)` on `#FFF9EE`) and traced to
`features/tutor-classroom/tutor-v3.css:76`.

## Files

| File | Contents |
|---|---|
| `analysis-before.json` | Per-screen a11y/structure sweep **before** m025-202 |
| `metrics-after.json` | Per-screen density **after** m025-202 |
| `capture.js`, `analyze.js`, `phases.js`, `seed.json` | The harness |
