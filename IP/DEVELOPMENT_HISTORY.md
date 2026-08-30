# IP — Development History and Human Contribution

**Purpose:** to establish what evidence exists, inside this repository, about how FIEZEL and
Braincore were actually developed — and to be explicit about what is missing.

**Rule: missing history is reported as missing. It is never reconstructed or guessed.**

---

## 1. ⚠️ A warning about how history is read here

The clone this audit started from was **shallow** — it contained only the last 285 commits,
with the oldest dated 2026-08-27. Anyone reading that would conclude FIEZEL was three days old.

The audit ran `git fetch --unshallow` (a read-only operation) and recovered **1,328 commits**.
Every figure below comes from the recovered full history.

**Plain language:** if a buyer's technical reviewer clones this repository with the default
settings that some tools use, they may see a fraction of the history and badly underestimate
the work. **The sale package should tell them to fetch the full history.** It is a one-line
instruction that prevents a damaging misunderstanding.

---

## 2. What the git history actually shows

| Measure | Value |
|---|---|
| First commit | `252ed37`, **2026-08-13**, *"Initial FIEZEL deployment"* |
| Latest commit audited | `a5abe3b`, **2026-08-30** |
| Total commits | **1,328** |
| Span of history | **18 days** |
| Average | ~74 commits per day |
| Busiest day | 2026-08-28 — 178 commits |
| Distinct author identities | 30 |
| Merge commits | 77+ |

### Commits per day

```
08-13  ███████████                      37
08-14  ████████████████                 56
08-15  ██████████████████               62
08-16  ██████████████████████████       87
08-17  ██████████████████████████████████████████  141
08-18  ███████████                      36
08-19  ████████████████████████████████ 106
08-20  ██████████████                   48
08-21  █████████████                    43
08-22  ██████████████████████████       88   ← features/brain/ created
08-23  ████████████                     41
08-24  ████████████████████████         80
08-25  █████████████████                58
08-26  ██████████████████████████       86
08-27  ██████████████████████████████████  114
08-28  █████████████████████████████████████████████████████  178
08-29  ██████████████████               60
08-30  ██                                7
```

---

## 3. ⚠️ The most important gap: history begins mid-project

The first commit is named **"Initial FIEZEL deployment"** and contains **87 files**. Among them:

`app.js`, `README.md`, `ROADMAP.md`, `RELEASE-NOTES.md`, `VERSION.json`,
`THIRD-PARTY-LICENSES.md`, `DEPLOYMENT-CHECKLIST.md`, `FILE-MANIFEST.txt`,
`GITHUB-UPLOAD-MANIFEST.md`, `.github/workflows/quality.yml`, and **six test files already**.

**This is not the start of a project.** A first commit that already contains release notes, a
roadmap, a deployment checklist, a third-party licence file, a CI quality gate and six tests
is the *publication* of work that already existed somewhere else.

Further corroboration: the milestone numbering. The commits use markers like `m025-114`,
`m025-150`, `m025-202`. The very first commit in the recovered history is not `m001`.

**What this means, plainly:** whatever development happened before 2026-08-13 — design work,
earlier code, earlier versions of the app — **is not in this repository.** It may exist on the
owner's own computer, in another repository, or nowhere at all.

**Why a buyer will care.** Buyers use git history to answer "who built this, over what period,
and is the story consistent?" Here the answer for everything before 13 August is *"the record
is not in this repository."* That is not damning — plenty of projects are published from a
working directory — but it must be **stated up front rather than discovered**. Discovered, it
looks like something was hidden. Stated, it is an ordinary fact.

**Recommended action for the owner:** if earlier material exists — an older folder, a backup,
an earlier repository, dated design notes, chat logs with AI tools — preserve it, do not
delete it, and tell the lawyer it exists. It is evidence of your own contribution.

### On the 18-day span

1,328 commits in 18 days is a very high rate, and a buyer's reviewer will notice it. The
honest explanation, supported by this audit's evidence, has three parts:

1. **Much of the work predates the repository** (above), so the visible span understates the
   real development period.
2. **AI assistance genuinely accelerates commit rate** — 19.1% of commits carry an AI
   co-authorship trailer, and several contributor identities are automation.
3. **Some commits are machine-generated bookkeeping** — `fiezel-audio-bot` alone has 48.

All three are ordinary and defensible. What would not be defensible is presenting 18 days of
history as the whole development story without explanation.

---

## 4. Braincore's own history

| Event | Date | Commit |
|---|---|---|
| `features/brain/` created | **2026-08-22** | `14926db` — *"m025-114: nama murid wajib, swipe-back yang benar-benar berfungsi, dan Core Brain v2"* |
| Author | `fitrajft-ux` (the owner) | |
| Braincore v3 wave | 2026-08-27 → 08-29 | `BRAINCORE-V3-REPORT.md` (40,081 bytes), `BRAINCORE-V3-CONTRACTS.md` |
| Latest Braincore change | 2026-08-30 | `fiezel-core-brain.js` |

**Braincore was built in 8 days**, from 22 to 30 August, on top of adaptive-policy logic that
already existed in `app.js` and `fiezel-core-worker.js` before that.

The `fiezel-core-brain.js` header states the origin directly: it names the owner's directive
*"tingkatkan inti otak core FIEZEL agar lebih pintar dan semakin jenius dari pada sebelumnya"*
and then lists the four specific deficiencies in the previous system that v2 set out to fix.

**Plain language:** Braincore has a clear, documented, dated origin — a human instruction to
make the engine smarter, followed by a specific technical analysis of what was wrong, followed
by eight days of building. That is a good provenance story, and it is written down in the code
itself rather than reconstructed after the fact.

---

## 5. Evidence of human product direction

Summarised here; the detail is in `IP/AI_ASSISTED_DEVELOPMENT.md` §2.

| Evidence | Volume | What it demonstrates |
|---|---|---|
| `OWNER:` directives quoted in source | **478 references** | Specific product decisions, in the owner's own words, at the point in the code where they took effect |
| Design / handoff / decision documents | **103** top-level `.md` files | Architecture and requirements recorded |
| Braincore governance documents | `BRAIN-EVOLUTION-DECISIONS.md`, `BRAINCORE-V3-CONTRACTS.md`, `BRAIN-LEARNING-ARCHITECTURE-AUDIT.md`, `BRAIN-DATA-PRIVACY.md`, `BRAIN-TELEMETRY-SCHEMA.md`, `BRAIN-ACTIVATION-RUNBOOK.md` | Deliberate architectural control of Braincore specifically |
| Agent governance | `AGENTS-COORDINATION.md` v1.2, `CLAUDE.md`, `.claude/skills/` | The owner setting rules AI agents must follow |
| Tests | ~200 files, 214-step gate | An enforced standard of verification |
| Documented reversals | m025-34, m025-83, m025-176, m025-179 | Human review catching and correcting earlier decisions |

### The reversals are the strongest single category of evidence

Anyone can produce documents. Reversals are harder to fake and more revealing:

- **m025-34** — a forced-notification gate was removed after the owner judged it
  *"a dark pattern that makes the app feel cheap, not premium."* The flag was kept with value
  `false` rather than deleted, so that any module still reading it would read a real decision
  instead of `undefined`. That is a considered engineering judgement on top of a product one.
- **m025-176** — an Analytics Engine binding was found to be declared but never used, and to
  be breaking deploys on accounts without the feature enabled. It was removed, with the reason
  written down.
- **m025-179** — an audit found that a standing rule rested on a deployment mechanism that
  **did not exist in the repository**. Rather than quietly dropping the rule, the finding was
  recorded, and the mechanism was then actually built (`deploy-site.yml`, `.cpanel.yml`).

**Plain language:** the project has a documented habit of catching itself being wrong and
writing down what was wrong. For a buyer assessing whether documentation can be trusted, this
is worth more than any amount of polished prose.

---

## 6. Second human contributor — an open question

| Identity | Commits |
|---|---|
| `fitrarustqi` / `FIEZEL-APPS` / `fitrajft-ux` (all owner emails) | ~765 |
| **`Pilna Refa <pilnarefa@gmail.com>`** | **219** |
| `Claude <noreply@anthropic.com>` | 91 |
| Bots and agents (various) | ~200 |

`Pilna Refa` is the **second-largest contributor to this project**, with 219 commits, and
several agent identities (`fiezel-uiux-agent`, `FIEZEL Assessment QA`,
`FIEZEL Multilingual Orchestrator`, `Perplexity Computer (NightWatch)`) share that same email
address — suggesting one person operating several AI-assisted roles.

**Whether a contributor agreement, employment relationship or IP assignment exists is UNKNOWN
to this audit.**

**This deserves emphasis: it is probably a more pressing question than the AI one.** The legal
position on AI-tool output is generally addressed by the tool's terms. The legal position on a
second human contributor with 219 commits and no written assignment is a conventional,
well-understood IP problem — and it is the kind of thing that stops a sale at the last minute.

**Action for the owner: establish and document the relationship with this contributor, in
writing, before approaching a buyer.**

---

## 7. What is NOT in the repository

Reported as absent, not reconstructed:

| Missing | Consequence |
|---|---|
| Any history before 2026-08-13 | The origin of `app.js` and the initial 87 files is undocumented here |
| Design documents predating the first commit | The pre-history of the product concept is unrecorded |
| Prompts or transcripts of AI sessions | The detailed record of AI-assisted work is not in the repository |
| Contributor agreements or IP assignments | See §6 |
| Terms of service of the AI tools used | Must be supplied by the owner |
| Any issue tracker history | Not present in the repository |

---

## 8. Summary for a buyer

**What is strong:**
- 1,328 commits with detailed, technical, reasoned messages
- 478 recorded owner directives, many quoted verbatim
- 103 design and decision documents
- ~200 tests and an enforced 214-step gate
- Braincore has a clear dated origin traced to a specific human instruction
- AI assistance is openly attributed rather than hidden
- A documented habit of self-correction

**What is weak or unknown:**
- History begins mid-project; everything before 2026-08-13 is absent
- 18 visible days is a compressed window that needs explaining
- No contributor agreement is on record for the second-largest contributor
- AI tool terms are not in the repository
- Several agent identities are unexplained

**The honest framing:** the *visible* development record is unusually rich for a project this
size, and it is genuinely open about how it was made. Its weakness is not what it contains but
where it starts — and that is fixable by disclosure rather than by work.

---

*End of IP/DEVELOPMENT_HISTORY.md. Factual record only — not legal advice.*
