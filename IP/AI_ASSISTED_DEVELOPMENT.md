# IP — AI-Assisted Development

**Purpose:** to record, factually and without concealment, how AI tools were used to build
FIEZEL and Braincore.

**Two rules govern this document:**
1. **Nothing is hidden.** AI assistance is documented, not disguised. No git history was
   rewritten to make the project look hand-typed, and none should be.
2. **No legal conclusions are drawn.** This document does **not** claim the owner owns the
   code, and does **not** claim they do not. It assembles the facts a qualified lawyer needs
   in order to answer that question.

---

## 1. What the evidence shows

AI coding assistants were used **extensively and openly** throughout this project. The
repository does not hide it — it records it in commit trailers, in documentation, and in a
written protocol for coordinating multiple agents.

### Measured from the full git history (1,328 commits)

| Measure | Count | Share |
|---|---|---|
| Total commits on `main` | 1,328 | 100% |
| Commits carrying a `Co-Authored-By: Claude…` trailer | **254** | **19.1%** |
| Commits authored under a Claude identity | 98 | 7.4% |
| Commits whose message mentions an AI tool or agent | 211 | 15.9% |

Breakdown of the co-authorship trailers:

| Trailer | Count |
|---|---|
| `Co-Authored-By: Claude Opus 5` | 210 |
| `Co-authored-by: Claude Opus 5` | 18 |
| `Co-authored-by: Claude` | 15 |
| `Co-Authored-By: Claude Haiku 4.5` | 3 |
| `Co-Authored-By: Claude Sonnet 5` | 1 |

**Plain language:** roughly one commit in five openly records that an AI assistant helped write
it. This is a deliberate, standard attribution practice — the trailers were added on purpose,
not left behind by accident.

### Contributor identities in the history

The history contains 30 distinct author identities. Several are clearly automated or
agent-operated:

| Identity | Commits | Apparent nature |
|---|---|---|
| `fitrarustqi <fitrajft@gmail.com>` | 693 | The owner |
| `Pilna Refa <pilnarefa@gmail.com>` | 219 | Human contributor |
| `Claude <noreply@anthropic.com>` | 91 | AI assistant |
| `fiezel-audio-bot` | 48 | Automation |
| `RD-B1 <rd-b1@fiezel.local>` | 41 | Agent |
| `FIEZEL-APPS <fitrajft@gmail.com>` | 36 | The owner |
| `fitrajft-ux` | 35+ | The owner |
| `Pilna Refa (Perplexity Computer)` | 31 | AI-assisted human |
| `fiezel-uiux-agent` | 19 | Agent |
| `FIEZEL Assessment QA (Perplexity Computer)` | 18 | AI-assisted |
| `FIEZEL Multilingual Orchestrator` | 14 | Agent |
| `Perplexity Computer (NightWatch)` | 13 | AI-assisted automation |
| Various `*-bot`, `*-agent`, `fiezel-*` identities | ~25 | Automation |

**Plain language:** at least three different AI systems were involved — Claude (Anthropic),
something operating as "Perplexity Computer", and a set of purpose-named in-house agents. The
naming is transparent: nobody tried to make an agent look like a person.

### The project has a written protocol for AI agents

`AGENTS-COORDINATION.md` (v1.2) is a governance document for multiple AI agents working on
one repository. Its rules include:

- *"Read before acting"* — fetch, check the log, check CI, read the task ledger first
- *"One writer per file at a time"* — agents must not write the same file simultaneously
- *"Separate clones"* — each agent works in its own directory
- *"Communication through artefacts"* — commit messages, `TASKS-LEDGER.json`, CI
- *"Verification over assumption"* — every claim of a fix needs local tests run **and** CI
  green **and**, for device claims, device diagnostics. *"Status labels must be honest."*

There is also `.claude/skills/` containing a written, checked-in skill definition for a design
task, and `CLAUDE.md`, a working agreement telling assistants what they may and may not do.

**Plain language:** this is not "the owner pasted some code from a chatbot." It is a managed
development process with written rules, division of labour, and a requirement that agents
prove their work with tests. That distinction is likely to matter to a buyer, and possibly to
a lawyer.

---

## 2. The role of the human owner

The brief for this audit states that the owner provided instructions, architecture direction,
decisions, corrections, evaluation and product requirements. **This audit found substantial
corroborating evidence in the repository itself**, and it is worth setting out because it is
unusually well documented.

### Owner directives are quoted verbatim in the source code

**478 references to `OWNER`** appear across the codebase. Many are direct quotations of the
owner's own words, in Indonesian, recorded at the point in the code where the decision took
effect. Examples found in `features/brain/`, `app.js` and elsewhere:

| Quoted directive (source) | Effect in the code |
|---|---|
| *"tingkatkan inti otak core FIEZEL agar lebih pintar dan semakin jenius dari pada sebelumnya"* (improve FIEZEL's core brain so it is smarter and more brilliant than before) | The header of `features/brain/fiezel-core-brain.js` — **this directive is the stated origin of Core Brain v2** |
| *"mendingan muncul pop up aja di layar dan langsung diikuti tombol next"* (better to show a popup with the next button right in it) | The confidence popup design, `app.js:2170+` |
| *"App premium biasanya lazy-load fitur berat (voice, tutor) setelah home screen"* | `fiezel-lazy-loader.js` |
| *"puter jangan dialihkan ke web lagi, itu sangat mengganggu"* (stop redirecting Puter to the web, it's very disruptive) | Puter auth flow rework |
| *"tetap bisa dipakai kalau ditolak"* (it must still work if permission is denied) | `core-config.js` — the reversal of the forced-notification gate |
| *"Ini pola dark-pattern yang justru bikin app terasa murahan, bukan premium"* (this dark pattern makes the app feel cheap, not premium) | `core-config.js:8` — owner overruling a previous design decision |
| *"level yang belum dibuktikan boleh dijajal, tetapi tidak boleh dibiarkan diam-diam"* | Level-evidence gating |

**Why this matters, in plain language.** These are not vague requirements. They are specific
product decisions, several of which **overrule** what had already been built — the owner
identifying a dark pattern and demanding it be reversed, the owner rejecting a redirect
behaviour, the owner setting the direction for the brain upgrade. The code records not just
*what* was built but *who decided it and why*, in the decider's own words.

For the question a lawyer will eventually be asked — *what did the human contribute?* — this
is considerably better evidence than most AI-assisted projects can produce.

### Other evidence of human direction

| Evidence | What it shows |
|---|---|
| 103 top-level design/handoff/decision documents | Architecture and requirements written down |
| `BRAIN-EVOLUTION-DECISIONS.md`, `BRAINCORE-V3-CONTRACTS.md` | Deliberate architectural governance of Braincore specifically |
| `AGENTS-COORDINATION.md` | The owner setting rules that AI agents must follow |
| `CLAUDE.md` | A working agreement constraining what assistants may do |
| ~200 test files and a 214-step quality gate | An insistence on verification |
| Reversals recorded in comments (m025-34, m025-83, m025-176, m025-179) | Human review catching and correcting earlier decisions |

The reversals are the most telling. Comments like *"OWNER MEMBALIK m025-34"* (the owner
reversed m025-34) and the m025-179 audit note — which found that a rule had been resting on a
deployment mechanism that **did not actually exist**, and said so — show a review process that
caught its own mistakes rather than papering over them.

---

## 3. What this audit did NOT and CANNOT determine

Stated plainly, because guessing here would be worse than useless:

1. **The exact proportion of code written by AI versus typed by a human.** The 19.1% trailer
   figure counts *commits that record AI assistance*, not lines of code. A commit may be 5%
   or 95% AI-written; the trailer does not say. **UNKNOWN.**
2. **Which specific AI tools were used at which times**, beyond what the identities and
   trailers state. Some agent identities (`RD-B1`, `fiezel-agent`, `FIEZEL Agent E9`) do not
   say what tool sat behind them. **UNKNOWN.**
3. **The terms of service of each AI tool at the time it was used.** This is central to the
   ownership question and cannot be answered from the repository. Anthropic, Perplexity and
   any other provider each have their own terms, and those terms change over time. **The owner
   must supply this to the lawyer.**
4. **Whether any AI output reproduced third-party code.** Not verifiable from within the
   repository. **UNKNOWN.**
5. **Development before 2026-08-13.** Git history starts there — see
   `IP/DEVELOPMENT_HISTORY.md`.

---

## 4. Why "AI helped write it" is not the same as "you don't own it"

Because this worries owners more than almost anything else, here is the honest position,
carefully phrased.

**What this audit will not do:** tell you that you own this code. That is a legal question
about the terms of the tools used, the law of your jurisdiction, and the nature of the human
contribution. Only a lawyer can answer it.

**What this audit can say factually:**

- Major AI providers' commercial terms have generally assigned output rights to the user.
  **Which terms applied to this project, at the times it was built, is a fact the owner must
  establish with documents — not something this audit can assume.**
- The human contribution here is documented at an unusually high standard: 478 recorded owner
  directives with verbatim quotations, 103 design documents, a written multi-agent governance
  protocol, ~200 tests, and a record of the owner overruling earlier decisions.
- Nothing has been hidden. The trailers, the agent identities and the coordination protocol
  are all in the history, and this audit recommends they **stay** there.

**Plain language:** the honest sentence to put in front of a buyer is *"AI assistants were
used extensively, under human direction, and the record of that is complete and open."* That
is a stronger commercial position than a scrubbed history, because a scrubbed history is
exactly what a careful buyer looks for and distrusts.

---

## 5. Recommendations

1. **Do not rewrite git history.** Not to remove AI trailers, not to merge agent identities,
   not for tidiness. The transparency is an asset. Removing it would look like concealment and
   would destroy the evidence of the owner's own contribution at the same time.
2. **Collect the tool terms.** For each AI tool used — Claude/Anthropic, Perplexity, and any
   tool behind the in-house agent identities — obtain the terms of service that applied at the
   time, and give them to the lawyer. **This is the single most useful thing the owner can do
   to make the ownership question answerable.**
3. **Identify the agent identities.** Record what `RD-B1`, `fiezel-agent`, `fiezel-uiux-agent`
   and the others actually were. A buyer will ask.
4. **Clarify the second human contributor.** `Pilna Refa <pilnarefa@gmail.com>` has 219
   commits — the second-largest contribution in the project. **Whether a contributor agreement
   or assignment exists is UNKNOWN to this audit, and it is a genuine gap.** A second human
   contributor with 219 commits and no written assignment is a more conventional IP question
   than the AI one, and probably a more pressing one.
5. **Keep this document in the sale package.** Volunteering it reads as confidence.
   Withholding it and having a buyer find the trailers themselves reads very differently.

---

*End of IP/AI_ASSISTED_DEVELOPMENT.md. Factual record only — not legal advice.*
