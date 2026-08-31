# AUDIT 03 — Local vs Server Data Map

**What this document answers:** what is stored on the student's own phone, what is stored on
a server, and — the commercially important one — **does "Global Learning Intelligence"
actually exist today, or is it only a plan?**

---

## 1. The short answer, before the detail

> **All learning lives on the student's device. The server never sees a single learner's
> learning.**
>
> **Global Learning Intelligence does not exist yet.** The pipe to build it has been laid
> end to end, and it is currently switched off at both ends.

Everything below is the evidence for those two sentences.

---

## 2. What is stored on the student's device

### 2.1 `localStorage` — the real learner model

| Key | Contents | Braincore component |
|---|---|---|
| `fiezel-v5-state:<account-uuid>` | Answer history (last 1,000), wrong answers (last 300), review buckets for vocab/grammar/reading, levels, streaks, preferences, learner name | The main learner state |
| `fiezel-v4-state` | Legacy state, read once for migration | — |
| `fiezel-mastery-bkt-v1` | Mastery probability per lesson | Mastery BKT |
| `fiezel-misconception-ledger-v1` | Which wrong ideas the student holds, and how strongly | Misconception Ledger |
| `fiezel-confusion-matrix-v1` | Which answers get confused with which | Confusion Matrix |
| `fiezel-item-calibration-v1` | How hard each question turned out to be for this student | Item Calibration |
| `fiezel-olm-negotiation-v1` | The student's disagreements with the model's view of them | OLM |
| `fiezel-srl-coach-v1` | Self-regulated-learning coaching state | SRL Coach |
| `fiezel-sl-v1-state` | Speaking/listening state | Speaking/Listening Adaptive |
| `fiezel-library-progress-v1` | Reading library progress | — |
| `fzPawOutfits`, `fiezel-reminder-invite-v1`, etc. | Cosmetic and UI preferences | — |
| `puter.auth.token.v2` | Puter login token | Third-party auth |

### 2.2 IndexedDB

| Database | Contents |
|---|---|
| `fiezel-learning-queue-v1` (store `events`) | The outbound queue of learning events waiting to be sent. **Currently never filled — the emitter's default mode is `off`.** |

### 2.3 Cache Storage

The service worker (`sw.js`) pre-caches ~157 files: the app shell, scripts, fonts, and the
on-device speech engine. **No learner data is stored in Cache Storage.**

### 2.4 Cookies

One: `fz_id`, an HMAC-signed session cookie issued by the API Worker. It identifies a
*device session* for quota purposes. It carries **no learning data**.

---

## 3. What is stored on the server

Three physically separate Cloudflare D1 databases. The separation is not a convention — D1
**cannot join across databases**, so the isolation is a property of the structure.

### 3.1 `fiezel-core` — identity and quota

`identity`, `session`, `quota_daily`, `quota_reservation`, `anon_issue`, `cron_run`,
`ai_account_day`, `rank_jti`, `rank_week`, `social_*`

**Contains no learning data.** It answers "is this a valid session, and has it used up its
free AI allowance today?"

### 3.2 `fiezel-stats` — presence, aggregate only

`metrics_daily`, `usage_daily`, `dau_dedup`, `retention_daily`, `pepper_state`, `batch_dedup`

Counters only — "how many devices opened the app on this day". The daily identifier is
HMAC'd with a **pepper that rotates every 24 hours** (cron `5 17 * * *`, 00:05 Jakarta time),
so yesterday's token cannot be matched to today's.

### 3.3 `fiezel-learning` — learning outcomes, aggregate only

Two tables, and their entire shape is:

```sql
CREATE TABLE learning_daily (
  day   TEXT,     -- 'YYYY-MM-DD' — the ONLY time value that exists
  event TEXT,     -- 'answer_outcome' | 'session_summary'
  dim   TEXT,     -- 'dimension:value' from a closed list, e.g. 'level:A2'
  n     INTEGER,  -- a counter
  PRIMARY KEY (day, event, dim)
);

CREATE TABLE learning_dedup ( event_id TEXT PRIMARY KEY, batch_id TEXT, day TEXT );
```

**That is the whole thing.** There is no `user_id`, no `install_id`, no IP address, no
precise timestamp, no lesson ID, no score. The migration file forbids adding any of them,
and `d1-schema-contract-test.js` scans the DDL against a list of forbidden linking columns.

**Plain language:** even in the best case where this is fully switched on, the server would
learn *"on 24 August, 412 answers at level A2 were correct"*. It would never learn that
*Budi* got *this question* wrong at *2:14pm*. The design makes the second thing impossible to
store, not merely against policy.

---

## 4. Personal Brain vs Global Learning Intelligence

### 4.1 Personal Brain — **EXISTS, and is the whole product today**

| Question | Answer |
|---|---|
| Where does it run? | Entirely in the student's browser |
| Where is it stored? | Entirely in `localStorage` on the device |
| Does it need the internet? | **No** |
| Does it need the server? | **No** |
| What breaks if the server is down? | AI explanations and server-side speech. **Not learning.** |

This satisfies the Personal Brain principle (Phase 14 of the brief) as a matter of fact, not
aspiration: all 21 Braincore modules are already in the browser, all state is already on the
device, and there is no server call anywhere on the decision path.

### 4.2 Global Learning Intelligence — **DOES NOT EXIST**

This audit looked specifically for it and found the following, all of which point the same way:

| Evidence | Finding |
|---|---|
| Server flag | `LEARNING_ENABLED = "off"` in `workers/api/wrangler.toml` |
| Client emitter | `features/telemetry/fiezel-telemetry-config.js` — default `mode: 'off'` |
| Total API routes that exist | **Four**, in the entire Worker |
| Routes that *send* learning data | 1 — `POST /api/learning/events` |
| Routes that *return* learning intelligence | **0** |
| Aggregation job | None. There is a cron for analytics rollup and quota sweep. There is none for learning. |
| Code that reads population data back into Braincore | **None found** |

**The decisive point is the last three rows.** Even if the flag were switched on tomorrow and
data began flowing, **there is no way for that data to come back**. No endpoint serves it, no
job aggregates it into anything usable, and no line of Braincore reads it. The pipe runs one
way and currently terminates in a counter table.

**Plain language, and this is important to say clearly to any buyer:** FIEZEL today is a very
capable *personal* tutor that runs on one child's phone. It is **not** a system that learns
from thousands of students and gets smarter for everyone. The plumbing for that second thing
has been thoughtfully designed and partly built — the event schema is defined, the database
is created and privacy-locked, the sending queue exists, the endpoint exists — but it has
never been switched on and the return path was never built.

**Selling it as an existing capability would be false.** Selling it as *a designed,
privacy-reviewed, partly built foundation* is accurate and is genuinely worth something.

### 4.3 What would actually flow, if it were switched on

Two event types, every field a closed enumeration (a fixed list of allowed values — free text
is rejected with a 400 error, not silently dropped):

**`answer_outcome`:** `domain`, `level`, `mode`, `skillBucket`, `correct`, `predictedBucket`,
`responseTimeBucket`, `attemptBucket`, `reviewGapBucket`, `hintUsed`, `decisionReason`,
`confidenceBucket` *(optional)*

**`session_summary`:** `domain`, `level`, `policyId`, `plannedBucket`, `answeredBucket`,
`completed`, `accuracyBucket`, `durationBucket`

Envelope: `schema`, `batchId`, `appBuild`, `brainBundle`, `contentVersion`, `day`, `events`
(max 20 per batch). Time is expressed as `studyDay` — *days since install*, 0–4000 — never a
wall-clock timestamp.

This matches the "minimum viable learning evidence" principle in Phase 15 of the brief almost
exactly. Notably absent, and deliberately: user ID, device ID, install ID, lesson ID, raw
score, precise timing.

---

## 5. Does learning survive when the network fails?

Traced through the code, the answer is yes at every layer:

| Failure | Effect on learning |
|---|---|
| No internet at all | **None.** Braincore, content and state are all local; the service worker serves the app offline. |
| API Worker down | **None** for learning. AI explanations unavailable. |
| Telemetry upload fails | **None.** Events queue in IndexedDB and retry. |
| Free-tier quota exhausted | **None** for learning. `/api/learning/events` answers `202 {disabled:true}` — deliberately **not** a 404, because old clients seeing a 404 would retry forever. |
| Braincore module fails to load | Degrades to the older non-adaptive behaviour, silently (see AUDIT 02 §6). |

**Plain language:** if the server disappeared permanently tomorrow, every student could keep
learning with the full adaptive engine, indefinitely. That is a real and unusual strength,
and it is a direct consequence of putting Braincore in the browser.

---

## 6. Things Phase 3 could not determine

1. **Whether any data exists in the real databases.** The repository holds placeholder IDs
   (AUDIT 00 §6). Only the owner's Cloudflare dashboard can show whether these databases were
   ever created or contain rows.
2. **Whether telemetry was ever switched on in a past release.** The current source says off
   at both ends. This audit did not review past deployed builds.
3. **What the Puter third-party service stores.** `js.puter.com` is loaded from Puter's own
   servers and handles login. What Puter retains is governed by Puter's terms, not by this
   repository. Flagged in `IP/DEPENDENCY_AUDIT.md` as an item for legal review.

---

*End of AUDIT 03.*
