# SALE — Deployment Guide

*What it takes to actually run this, verified against the repository.*

---

## Part 1 — Running Braincore alone (the sellable asset)

### Requirements

**A JavaScript engine. That is the complete list.**

No build step, no bundler, no npm install, no server, no database, no internet.

### In Node.js

```js
const CoreBrain = require('./features/brain/fiezel-core-brain.js');
const TutorBrain = require('./features/brain/fiezel-tutor-brain.js');
const BKT       = require('./features/brain/fiezel-mastery-bkt.js');

const p = CoreBrain.successProbability(/* ability */ 2.4, /* difficulty */ 2.0);
const m = BKT.update({}, { lesson: 'past-simple', correct: true, weight: 1 }, Date.now());
```

### In a browser

```html
<script src="features/brain/fiezel-core-brain.js"></script>
<script>
  const p = FiezelCoreBrain.successProbability(2.4, 2.0);
</script>
```

### Verifying it works

```bash
node core-brain-test.js
node tutor-brain-v3-test.js
node mastery-bkt-test.js
# ... 24 test files in total — all pass
```

**Verified by this audit: 24/24 pass on Node v22.22.2.**

⚠️ **Before running the full 214-step gate**, know that it modifies tracked files. Restore
afterwards:
```bash
git checkout -- grammar-templates.json AI-ACCOUNT-CAP-GATE.json
```
*(See `SALE/KNOWN_LIMITATIONS.md` §6.)*

⚠️ **Fetch the full git history** before evaluating the project's development record — a
default shallow clone shows 285 of 1,328 commits:
```bash
git fetch --unshallow
```

---

## Part 2 — Running the whole FIEZEL application

Only relevant if the *application* is being sold. Braincore needs none of this.

### 2.1 The web app

**Requirements:** any static web host that can serve files over HTTPS. No Node.js on the
server, no build step.

Two supported publishing paths, both already implemented:

| Path | Mechanism |
|---|---|
| GitHub Actions | `.github/workflows/deploy-site.yml` — runs **only after** the Quality Gate is green; `rsync` over SSH |
| cPanel Git | `.cpanel.yml` — cPanel runs it on each pull |

**Both follow the same mandatory order, and it is not optional:**

1. Upload **all assets except `sw.js`**
2. Upload **`sw.js` last**
3. **Prove** the live site serves the new build marker (`tools/deploy-site-verify.mjs`)

**Why the order matters:** the service worker pre-caches 157 files in one operation. If it
lands before the files it caches, a new service worker stores stale bytes (or 404s) under the
new revision name — **and a single failed entry fails the entire pre-cache.** Every student
gets a broken app.

`deploy-site-gate-test.js` enforces that both paths use the same order and the same exclusion
list. Two publishing paths with two different orders would be two different ways to ship a
broken shell.

### 2.2 The API (Cloudflare Workers)

**⚠️ The repository alone cannot deploy this.** `workers/api/wrangler.toml` contains
**placeholders**, literally reading `<isi setelah: wrangler d1 create ...>` ("fill in after
running..."), for three database IDs and one KV namespace ID.

**Required setup, in order:**

```bash
# 1. Create the three databases and the KV namespace
wrangler d1 create fiezel-core
wrangler d1 create fiezel-stats
wrangler d1 create fiezel-learning
wrangler kv namespace create CFG
# → paste each returned id into workers/api/wrangler.toml

# 2. Apply migrations — per file, per database, explicitly.
#    See workers/api/migrations/MIGRATIONS.md. Do NOT use migrations_dir:
#    one directory can only point at one database, and this project has three.

# 3. Set the secrets (values never go in the repository)
wrangler secret put SESSION_HMAC_KEY_CURRENT
wrangler secret put SESSION_HMAC_KEY_PREVIOUS
wrangler secret put PUTER_CLAIM_SECRET_CURRENT
wrangler secret put PUTER_CLAIM_SECRET_PREVIOUS
wrangler secret put IDENTITY_PEPPER
wrangler secret put OWNER_SUBJECT
wrangler secret put CRON_TOKEN
wrangler secret put EDGE_SHARED_SECRET

# 4. Deploy
wrangler deploy
```

**Prerequisite:** the DNS zone `fiezel.my.id` must exist in Cloudflare. The Worker is
configured for a custom domain from day one and `workers_dev` is disabled — deliberately,
because an API that issues credentials must have an explicit CORS allowlist, which a
`*.workers.dev` address cannot have.

**Three failure modes that are intentional, and correct:**

| Missing | Result | Why this is right |
|---|---|---|
| `SESSION_HMAC_KEY_CURRENT` | `/api/auth/anon` returns 500 | Better to fail clearly than issue an identity that cannot be verified |
| `PUTER_CLAIM_SECRET_CURRENT` | `/api/auth/claim` always 401 | A feature with no ticket issuer must not bind identities |
| `EDGE_SHARED_SECRET` | **Everything except `/healthz` returns 403** | **Fail-closed.** A forgotten secret produces a silent API, not an open one that anyone can drain the free tier through |

### 2.3 Cloudflare free-tier limits, and how the design respects them

| Resource | Free limit | How the design stays inside it |
|---|---|---|
| KV writes | 1,000/day | **Hot paths are forbidden from writing to KV.** Only rare flag updates and short-TTL anti-replay markers |
| D1 | — | Used for quota via `UPDATE … WHERE used < limit RETURNING`, atomic per statement |
| Durable Objects | Paid only | **Deliberately not used.** The documented consequence: quota is atomic per statement but has no cross-statement locking |
| Workers requests | 100,000/day | The 5-minute cron uses 288/day ≈ 0.3% |
| Workers AI | 10,000 neurons/day | `GLOBAL_NEURON_CAP = 8000` — a deliberate margin |
| Users | — | `MAX_USERS = 250` |

**Plain language:** this was designed to run on a free plan on purpose, and the constraints
were engineered around rather than ignored. A buyer inherits a system with known, documented
ceilings and a written note about what upgrading to Durable Objects would buy.

### 2.4 Cron jobs — both required

| Schedule | Job | Consequence if missing |
|---|---|---|
| `*/5 * * * *` | Sweep expired quota reservations | Slots held by dead requests stay lost until midnight |
| `5 17 * * *` (00:05 Jakarta) | Analytics rollup + pepper rotation | **The privacy contract becomes false** — daily tokens are never deleted and the pepper never rotates |

Both are idempotent, so a failed run is simply repeated by the next.

### 2.5 Audio Worker

```bash
cd workers && wrangler deploy   # fiezel-audio, read-only, no secrets at all
```

---

## Part 3 — Verifying a deployment

```bash
node core-deploy-preflight.mjs   # pre-deploy checks
node core-live-smoke.mjs         # live smoke test
node tools/fiezel-health-probe.mjs
```

The Quality Gate also has manual-only live gates (`workflow_dispatch` with a base-URL input) so
that public CI never fires at production on every commit — `health-probe-test.js` actively
asserts that prohibition.

---

## Part 4 — What a buyer must supply

### For Braincore alone

| Item | Notes |
|---|---|
| A JavaScript runtime | That is all |
| Persistence for learner state | ~3–5 days |
| An evidence-intake function | ~2–3 days |
| Orchestration | ~5–8 days |
| A question pool and a curriculum graph | Own content, or FIEZEL's |
| **Total** | **~4–6 weeks, one engineer** |

### For the whole application

| Item | Notes |
|---|---|
| A Cloudflare account | Free tier is sufficient |
| A domain in Cloudflare DNS | Required — `workers_dev` is disabled |
| A static web host | cPanel/ArenHost today; any HTTPS host works |
| A Puter account | ⚠️ Terms UNKNOWN — see `IP/DEPENDENCY_AUDIT.md` §4.3 |
| An ElevenLabs key | Build-time audio generation only |
| SSH credentials for the host | For `deploy-site.yml` |

---

## Part 5 — Honest deployment risks

| # | Risk | Severity |
|---|---|---|
| 1 | **Placeholder database IDs.** Not deployable straight from the repository. | 🟠 Medium — one-time setup |
| 2 | **Puter dependency.** Live-loaded, unpinned, terms unknown, on the login path. | 🔴 High |
| 3 | **Free-tier ceilings.** `MAX_USERS = 250`. Growth requires a paid plan. | 🟡 Known and documented |
| 4 | **No Durable Objects.** Quota has no cross-statement locking. **The config file states this must be reported to the owner with real numbers before upgrading — not switched on silently.** | 🟡 Documented |
| 5 | **Five pre-existing test failures**, four of them in voice/audio. | 🟡 Not Braincore |
| 6 | **`vendor/supertonic-3/` is ~159 MB.** Clones are slow; some hosts have per-file limits. | 🟡 The build already works around a 100 MB per-file limit |

---

*End of SALE/DEPLOYMENT_GUIDE.md.*
