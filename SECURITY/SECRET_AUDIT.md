# SECURITY — Secret and Credential Audit

**Purpose:** to determine whether any password, key, token or credential is exposed in this
repository, and whether any personal data is committed.

**Rule strictly applied: no secret value appears anywhere in this document.** Where a pattern
was found, it is described by location and kind only. Nothing was copied out.

---

## 1. Result

> **No live secret was found in the tracked files, and no live secret was found in the git
> history.**

Two independent methods were used, and they agree.

| Method | Result |
|---|---|
| The repository's own scanner (`secret-scan-test.js`) | `46/46 assert PASS, 1041 text files scanned, 295 binaries skipped, **0 findings**, 8 justified exceptions` |
| Independent pattern scan by this audit (OpenAI-style keys, GitHub tokens/PATs, AWS access keys, PEM private-key blocks, Slack tokens) across all tracked files **and** all history additions | **2 matches in tracked files, 1 match in history — all three confirmed to be deliberate test fixtures.** See §3. |

---

## 2. The project's own secret scanner is real, and it is good

This deserves saying because it is unusual. `secret-scan-test.js` is 46,238 bytes and is wired
into the quality gate. It was executed by this audit and passes.

What it actually does, verified from its source and its commit record:

- **11 detectors.** Eight are *hard* (OpenAI-style `sk-`, `pk_`, GitHub `ghp_`, Cloudflare
  `cfut_`, Google `AIza`, JWTs, PEM blocks, bcrypt hashes) and **cannot be silenced by the
  allowlist**. Three are heuristic (high-entropy base64url, base64 blobs,
  `password=`/`secret=`/`token=` with a literal value) and can be.
- **The false-positive filtering was measured, not assumed.** The commit record states: a naive
  base64url detector produced 9,000+ matches across 347 files; after rejecting hex, requiring
  mixed character classes, rejecting separator-delimited names, and requiring entropy ≥ 4.0,
  it produced **2 matches in 1 file** (a known test fixture).
- **The allowlist is deliberately weak.** Every entry must carry a justification of at least 40
  characters, and the test asserts that each justification is still relevant. **Hard detectors
  keep running even on allowlisted files** — and that behaviour is itself proven by injecting a
  synthetic `ghp_` token into an in-memory copy of an allowlisted file and confirming it is
  still caught.
- **Binaries are skipped only after being proven binary** by scanning for NUL bytes, not
  trusted from the file extension.
- **Repository-specific rules:** `deploy/edge/*.php` must contain placeholders and must be free
  of random-looking values.

**Plain language:** the project does not merely have a secret scanner; it has one that was
tested to prove it cannot be fooled by its own exception list. That is a materially higher
standard than most projects, and a buyer's security reviewer will recognise it.

---

## 3. The three pattern matches, and why none is a leak

All three are **intentional fake credentials used to test that the guards work.** Each was
inspected and confirmed.

| # | Location | Kind | Why it is not a leak |
|---|---|---|---|
| 1 | `fiezel-prompt-library-test.js:39` | An OpenAI-style `sk-` string | A test fixture passed into `renderPrompt()` **to prove the prompt library rejects text containing secrets.** |
| 2 | `fiezel-self-refine-test.js:65` | An OpenAI-style `sk-` string | The assertion is literally named *"ai text with secret rejected at render level"* — it exists to prove the rejection works. |
| 3 | Git history only (commit `6ac38ec`, the commit that **added** the secret scanner) | A GitHub-style `ghp_` string | The scanner's own self-test, injecting a synthetic token into an in-memory copy of an allowlisted file to prove hard detectors still fire there. Not present in the working tree. |

**Plain language:** all three are the software equivalent of a fire-drill smoke canister. They
exist so the alarm can be proven to work. Finding them is a good sign, not a bad one.

---

## 4. How real secrets are handled

The design is sound and is worth describing to a buyer.

### Secrets are named in the repository; values live only in the platform

`workers/api/wrangler.toml` lists the **names** of eight secrets and explicitly instructs that
values must be set through `wrangler secret put`:

`SESSION_HMAC_KEY_CURRENT`, `SESSION_HMAC_KEY_PREVIOUS`, `PUTER_CLAIM_SECRET_CURRENT`,
`PUTER_CLAIM_SECRET_PREVIOUS`, `IDENTITY_PEPPER`, `OWNER_SUBJECT`, `CRON_TOKEN`,
`EDGE_SHARED_SECRET`

The file carries the instruction *"NAMA SAJA — jangan pernah menulis nilainya"* (names only —
never write the values). **No values are present.** Verified.

### Design choices that reduce the amount of secret material that can leak

| Choice | Effect |
|---|---|
| R2 accessed by **binding**, not S3 access keys | No bucket credentials exist to leak |
| Workers AI accessed by **binding**, not a REST token | No AI API key inside the Worker. The config comment notes this is deliberate: *"repo ini pernah punya insiden secret"* |
| The audio Worker has **no secrets at all** | A read-only Worker cannot leak what it does not hold |
| Key rotation built in (`*_CURRENT` / `*_PREVIOUS`) | Keys can be rotated without logging every student out |
| Identity pepper rotates every 24 h via cron | Yesterday's daily token cannot be matched to today's |
| `deploy/edge/api-index.php` holds `__EDGE_SECRET__` as a **placeholder**, substituted at install | The secret is never in the repository |
| **Fail-closed** edge gate | Without `EDGE_SHARED_SECRET`, every route except `/healthz` returns 403. A deploy that forgets the secret produces a **silent API, not an open one.** |

**Plain language on that last row, because it is the best security decision in the project:**
if someone deploys and forgets to install the shared secret, the API refuses everybody. The
alternative — which many projects choose — is an API that works fine and is wide open. Failing
loudly and safely was chosen over failing conveniently.

### `.gitignore` covers the right things

`.env`, `.env.*`, `push-secrets*.json`, `push-secrets*.txt`, and `*.orig` / `*.rej` (added
deliberately, because merge leftovers are complete copies of another version of a file and can
contain values that were cleaned from the original).

---

## 5. ⚠️ One item that must be resolved by the owner

`workers/api/wrangler.toml` contains this remark, in a comment explaining why Workers AI is
accessed by binding rather than by API token:

> *"nol permukaan kebocoran kunci (repo ini pernah punya insiden secret)"*
> — zero key-leak surface (**this repository once had a secret incident**)

**This audit found no details of that incident anywhere in the repository**, and no leaked
value survives in the current history under the patterns tested.

**Status: UNKNOWN — and it must not be left unknown.**

The owner is the only person who can answer:

1. **What was exposed?** Which key or token?
2. **When?**
3. **Was it rotated or revoked?** If not, **rotate it now.**
4. **Was it ever pushed to a public GitHub repository?** If so, treat it as permanently
   compromised regardless of later deletion. Public repository content is scraped within
   minutes and copies persist outside anyone's control.

**Plain language:** a buyer's security review will ask "have you ever had a security incident?"
The answer must be prepared, honest and complete, and it must come with evidence that whatever
was exposed has been rotated. Being unable to answer is much worse than the incident itself.

---

## 6. Personal data in the repository

| Check | Finding |
|---|---|
| Email addresses in git author metadata | Present — normal for git. Includes the owner's addresses and `pilnarefa@gmail.com`. |
| Personal data in source files | None found |
| Real student data in content or fixtures | None found |
| Analytics containing personal data | Structurally impossible — see below |
| Learning telemetry containing personal data | Structurally impossible — see below |

The privacy design is enforced by schema and by test, not by policy:

- `learning_daily` holds only `(day, event, dim, n)` — a counter table. No user ID, no install
  ID, no IP, no precise timestamp, and the migration forbids adding one.
- `d1-schema-contract-test.js` scans the SQL against a list of forbidden linking columns.
  **It passes.**
- `analytics-privacy-test.js`, `observability-privacy-test.js`, `analytics-server-only-test.js`
  and `learning-lane-test.js` all pass.
- The three databases are physically separate, and D1 cannot join across databases.

**Plain language:** the strongest privacy statement here is not a promise. It is that the
database has nowhere to put a student's identity next to their learning results, even if
someone wanted to.

---

## 7. Findings summary

| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | No live secrets in tracked files or history | ✅ None | — |
| 2 | Secret scanner is present, thorough, and passes | ✅ Strength | Keep it in CI |
| 3 | Three fake-credential test fixtures | ℹ️ Informational | None — they are guards |
| 4 | **Undocumented past "secret incident"** | ⚠️ **UNKNOWN** | **Owner must document it and confirm rotation** |
| 5 | Secret names published in `wrangler.toml` | ℹ️ Informational | Acceptable — names are not secrets, and it aids deployment |
| 6 | Placeholder database IDs in `wrangler.toml` | ℹ️ Informational | Not a security issue; it is a deployment prerequisite (see AUDIT 00 §6) |
| 7 | Puter SDK loaded live and unpinned from a third party | ⚠️ Medium | See `IP/DEPENDENCY_AUDIT.md` §4.3 — this is the one dependency that is not pinned, and it sits on the login path |

---

## 8. What this audit did NOT check

1. **Whether secrets are correctly configured in the live Cloudflare account.** Not inspected.
2. **Whether any secret was leaked outside git** — chat logs, screenshots, CI logs, forks.
3. **A full cryptographic review** of the HMAC session scheme. The design reads sound
   (rotation, separate peppers, fail-closed) but a dedicated cryptographic review was out of
   scope.
4. **Penetration testing of the live API.** Nothing live was touched.
5. **Binary file contents.** 295 binaries (fonts, audio, ONNX models) were skipped by the
   project scanner and not independently examined by this audit.

---

*End of SECURITY/SECRET_AUDIT.md. No secret value is reproduced in this document.*
