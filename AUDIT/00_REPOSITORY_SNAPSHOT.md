# AUDIT 00 — Repository Snapshot

**What this document is:** a factual photograph of the FIEZEL repository at one moment in
time, taken *before* anything was changed. It answers "what is actually here, right now?"
Nothing in this file is an opinion or a plan.

**Taken on:** 2026-08-30
**Taken by:** automated audit pass (Braincore IP / sale-readiness audit, Phase 0)
**Repository was NOT modified to produce this document.**

---

## 1. Identity

| Item | Value |
|---|---|
| Repository | `FIEZEL-APPS/FIEZEL-APPS` (GitHub) |
| Remote URL | `https://github.com/FIEZEL-APPS/FIEZEL-APPS` |
| Default branch | `main` |
| Audit branch | `claude/braincore-ip-audit-d3uk0o` |
| Commit audited | `a5abe3bedca23bb978e1e83761a1bb64fc039f31` |
| Commit date | 2026-08-30 14:52:55 +0700 |
| Commit subject | `build(m025-202): fix raw i18n keys leak in UI shell, localize quiz loop, and pass learnerLocale to AI coach and explanations` |
| Working tree at audit start | clean (no uncommitted changes) |
| Product version marker | `5.19.0` (`version.js`) |
| Page build marker | `m025-202` (`core-config.js`) |
| Brain bundle version | `3.0.0` (`features/brain/fiezel-brain-manifest.js`) |

### A note about history depth — important, and easy to get wrong

The copy of the repository this audit started from was a **shallow clone**: it only
contained the most recent 285 commits, and its oldest visible commit was dated
2026-08-27. Read naively, that would have said "this project is three days old."

That would have been **wrong**. The audit ran `git fetch --unshallow` (a read-only
operation — it downloads history, it does not change anything) and recovered the real
history. Every history figure in this audit uses the recovered full history.

**Plain language:** the first look at the project's history was incomplete, like opening a
book in the middle. We fetched the missing pages before drawing any conclusion. Any future
reviewer working from a shallow clone must do the same, or they will badly understate how
much work is in this project.

---

## 2. Size and shape

| Measure | Value |
|---|---|
| Tracked files | 1,336 |
| Commits on `main` (full history) | 1,328 |
| Merge commits | ~77 in the recent range |
| First commit | `252ed37`, 2026-08-13, "Initial FIEZEL deployment" (87 files) |
| Latest commit | 2026-08-30 |
| Active development window in git | 2026-08-13 → 2026-08-30 (18 days) |

### File types (tracked files only)

| Extension | Count | What it is |
|---|---|---|
| `.js` | 453 | Application code, Braincore modules, and ~200 test files |
| `.md` | 244 | Documentation, design notes, audit reports, handoffs |
| `.png` | 155 | Images and mascot art |
| `.json` | 98 | Learning content banks, manifests, configuration |
| `.woff2` | 44 | Web fonts |
| `.mjs` | 44 | Node scripts (deployment, push, tooling) |
| `.svg` | 43 | Icons and vector art |
| `.html` | 41 | Pages |
| `.ogg` / `.mp3` / `.wav` | 89 | Audio assets |
| `.py` | 28 | Tooling scripts |
| `.yml` | 20 | GitHub Actions workflows |
| `.css` | 18 | Styling |
| `.sql` | 13 | Database migrations |
| `.onnx` | 4 | On-device speech model weights |
| `.wasm` | 1 | On-device speech runtime |

**Plain language:** this is a medium-sized project. Roughly a third of the JavaScript files
are tests rather than product code, which is unusual and is a point in the project's favour.

---

## 3. Top-level structure

```
FIEZEL-APPS/
├── index.html              the application shell (loads 120 scripts)
├── app.js                  the main application (9,584 lines) — the biggest single file
├── sw.js                   service worker (offline / PWA caching)
├── style.css               (4,380 lines)
├── version.js              product version marker
├── core-config.js          runtime configuration and feature switches
│
├── features/               29 feature folders — see below
│   └── brain/              ← THE BRAINCORE (21 files, 8,899 lines)
│
├── workers/                Cloudflare Workers (server side)
│   ├── api/                the main API Worker (fiezel-api)
│   ├── owner/              owner dashboard Worker
│   └── fiezel-audio-worker.js   read-only audio asset Worker
│
├── vendor/supertonic-3/    bundled on-device speech engine (third-party)
├── deploy/                 hosting/edge deployment recipes (PHP edge proxy)
├── docs/                   Cloudflare runbooks, D1 capacity/retention/backup
├── audit/ analysis/ reports/ coordination/ design/   prior internal reports
├── assets/ audio/ website/ ecohero-quest/            static assets and side content
├── tools/                  build and verification scripts
└── ~200 *-test.js          test files, at the repository root
```

### `features/` folders

`academic-readiness`, `analytics`, `audio`, `audio-assets`, **`brain`**, `brand`,
`cf-shadow`, `classroom`, `continuity`, `daily-target`, `diagnostics`, `health`, `i18n`,
`library`, `mascot`, `neural-voice`, `onboarding`, `personal-journey`, `prasasti`, `quota`,
`search`, `skills-evidence`, `social`, `speaking-listening`, `telemetry`,
`tutor-classroom`, `ui`.

---

## 4. Package management and build system

**There is no bundler and no build step for the application.** This is a genuinely unusual
finding and it matters for a buyer, so it is stated explicitly:

- `index.html` loads **120 separate `<script src=...>` tags** directly. There is no
  webpack, no Vite, no Rollup, no esbuild, no TypeScript compilation for the app.
- The files that ship to the browser are the same files that are in the repository.

| Item | Finding |
|---|---|
| `package.json` | Present. Name `fiezel-push-ops`, version `5.19.0`, `private: true`. |
| Runtime dependencies in `package.json` | **Exactly one:** `web-push` 3.6.7 |
| Lockfile (`package-lock.json`) | **ABSENT** — see risk note below |
| `node_modules` needed to run the app? | **No.** The browser app has zero npm runtime dependencies. |
| npm scripts | 22 scripts, mostly `node <something>-test.js` |
| Worker build | None. Cloudflare `wrangler` deploys the source directly. |

**Plain language, and why the missing lockfile matters:** a "lockfile" is a receipt that
records the exact version of every library that was installed. Without it, two people
installing the project on different days can end up with slightly different libraries.
Here the practical damage is small — the project only uses one library, and only for
sending push notifications, not for anything the student sees. But a buyer's technical
reviewer will ask about it, so it is better to have the answer ready than to be surprised.

---

## 5. Deployment configuration

There are **three separate deployment paths**, and they publish different things.

### 5.1 The student-facing web app → shared hosting (cPanel)

| Path | Mechanism |
|---|---|
| `.github/workflows/deploy-site.yml` | Runs **only after** the Quality Gate passes. Uploads by `rsync` over SSH to `~/public_html/app`. |
| `.cpanel.yml` | The same recipe, run by cPanel's own Git integration when it pulls a new commit. |

Both paths deliberately upload **all assets first and `sw.js` last**, and both then *prove*
the live site is serving the new build marker (`tools/deploy-site-verify.mjs`). The reason
is recorded in the files: the service worker pre-caches 157 files at once, and if it lands
before the files it caches, every student gets a broken or stale app.

**Plain language:** the publishing process is careful and self-checking. It refuses to
claim success without checking the live site. This is better than most projects of this
size.

### 5.2 The API → Cloudflare Workers

`workers/api/wrangler.toml` defines the `fiezel-api` Worker. Deployed by
`.github/workflows/deploy-api-worker.yml`.

### 5.3 Audio assets → Cloudflare Worker + R2

`workers/wrangler.toml` defines a deliberately **read-only** `fiezel-audio` Worker with an
R2 bucket binding and no secrets at all.

---

## 6. Cloudflare configuration (as declared in the repository)

| Resource | Binding | Name | Status in repo |
|---|---|---|---|
| D1 database | `CORE_DB` | `fiezel-core` | ID is a **placeholder** |
| D1 database | `STATS_DB` | `fiezel-stats` | ID is a **placeholder** |
| D1 database | `LEARNING_DB` | `fiezel-learning` | ID is a **placeholder** |
| KV namespace | `CFG` | — | ID is a **placeholder** |
| R2 bucket | `AUDIO` | `fiezel-audio` | Configured |
| Workers AI | `AI` | — | Binding declared |
| Durable Objects | — | — | **Not used** (deliberately — requires a paid plan) |
| Analytics Engine | — | — | **Removed** in m025-176 (was declared but unused, and broke deploys) |
| Cron triggers | 2 | `*/5 * * * *` and `5 17 * * *` | Configured |

**The placeholders are a real finding.** The three database IDs and the KV namespace ID in
`workers/api/wrangler.toml` literally read `<isi setelah: wrangler d1 create ...>`
("fill in after running..."). This means: **the repository alone is not enough to deploy the
API.** Whoever deploys it must create the databases themselves and fill in the IDs.

**Plain language:** think of it as a house wired for electricity with the meter number left
blank. The wiring is real and complete; the account numbers are not in the box. A buyer can
absolutely deploy this, but they must do a short setup step first, and they should be told
that up front rather than discovering it.

### Feature switches currently declared in the API Worker

| Switch | Value | Meaning |
|---|---|---|
| `FEATURE_AI` | `on` | AI assistance is live |
| `FEATURE_TTS` | `off` | Server-side speech is off |
| `FEATURE_COACH` | `off` | Coach feature is off |
| `FEATURE_SOCIAL` | `on` | ...but needs 3 switches ANDed together to actually run |
| `ANALYTICS_ENABLED` | `on` | Aggregate-only analytics on |
| **`LEARNING_ENABLED`** | **`off`** | **The learning-telemetry lane is switched off** |

The last row matters a great deal for the Braincore story and is examined in AUDIT 03.

---

## 7. Databases

Twenty-five tables are declared across the SQL migrations, split across **three physically
separate D1 databases**:

- **`fiezel-core`** — identity, sessions, quota: `identity`, `session`, `quota_daily`,
  `quota_reservation`, `anon_issue`, `cron_run`, `ai_account_day`, `rank_jti`, `rank_week`,
  and the `social_*` tables.
- **`fiezel-stats`** — aggregate analytics only: `metrics_daily`, `usage_daily`,
  `dau_dedup`, `retention_daily`, `pepper_state`, `batch_dedup`.
- **`fiezel-learning`** — learning outcomes only: `learning_daily`, `learning_dedup`.

The separation is deliberate and is documented in the migration files themselves: Cloudflare
D1 cannot join across databases, so "learning results cannot be linked to a person's
identity" is enforced by the *structure*, not merely by a policy someone has to remember.

**Plain language:** the student's identity and the student's learning results are kept in
different filing cabinets, and the system physically cannot open both at once to match them
up. That is a strong privacy design and it is worth telling a buyer about.

---

## 8. Continuous integration

Nineteen GitHub Actions workflows. The central one is `.github/workflows/quality.yml`
("FIEZEL Quality Gate"), which runs on every push and pull request.

- **213 distinct check steps** are invoked by the Quality Gate.
- **~200 test files** live at the repository root, named `*-test.js`.
- Two "live" gates that hit real Cloudflare infrastructure are **manual-only**
  (`workflow_dispatch` with a URL input), deliberately, so that public CI never fires at
  production on every commit.

Whether these tests actually pass is **not** assumed here. That is measured in AUDIT 05.

---

## 9. Third-party code bundled into the repository

| What | Where | License (as documented) |
|---|---|---|
| Supertonic 3 speech engine (WASM + 4 ONNX models, ~159 MB) | `vendor/supertonic-3/` | Code MIT; **model weights OpenRAIL-M** |
| Lucide icons | `lucide.min.js` | ISC |
| Instrument Serif, Plus Jakarta Sans, Noto Sans Thai Looped | `assets/fonts/` | SIL OFL 1.1 |
| `web-push` | npm dependency | MPL-2.0 |
| Puter SDK | loaded from `https://js.puter.com/v2/` | **Not bundled — loaded from their servers** |

Full treatment, including two documentation defects found in `THIRD-PARTY-LICENSES.md`, is
in `IP/DEPENDENCY_AUDIT.md`.

---

## 10. Frontend / backend boundary

```
        STUDENT'S BROWSER (the "front end")
        ├── index.html + 120 scripts, including all 21 Braincore modules
        ├── app.js — decides what happens on screen
        ├── sw.js — makes the app work offline
        └── local storage on the device — where learning progress actually lives
                    │
                    │  (network — optional, see AUDIT 03)
                    ▼
        CLOUDFLARE WORKERS (the "back end")
        ├── fiezel-api    — identity, quota, AI gateway, aggregate analytics
        ├── fiezel-audio  — read-only audio file delivery
        └── owner Worker  — owner-only dashboard
                    │
                    ▼
        D1 × 3 (separated)   ·   KV (config/flags only)   ·   R2 (audio files)
```

**The single most important structural fact in this whole snapshot:**
every one of the 21 Braincore modules runs **in the student's browser**. The server does not
run the Braincore. This is examined properly in AUDIT 03 and SALE/CORE_SEPARATION_ANALYSIS.md,
and it is central to whether Braincore can be sold as a standalone asset.

---

## 11. Things Phase 0 could NOT determine

Stated honestly, rather than guessed:

1. **Whether the declared Cloudflare resources exist in the owner's real account.** The
   repository contains placeholders. Only the owner's Cloudflare dashboard can confirm.
2. **Whether the tests pass.** Not assumed — measured in AUDIT 05.
3. **Whether any development happened before 2026-08-13.** Git history begins there with a
   commit called "Initial FIEZEL deployment" containing 87 files. Earlier work, if it
   exists, is not in this repository. Addressed in `IP/DEVELOPMENT_HISTORY.md`.
4. **Whether the live production site currently matches this commit.** Not checked; that
   would require hitting the live site.

---

*End of AUDIT 00. Nothing in the repository was modified to produce it.*
