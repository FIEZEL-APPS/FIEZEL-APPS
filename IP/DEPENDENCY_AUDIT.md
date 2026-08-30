# IP — Dependency and License Audit

**What this document is:** a list of every piece of software in this project that somebody
else wrote, what licence it carries, and whether that licence is compatible with selling the
work.

**Rules applied:**
- Every licence was checked against a file or a declaration **in this repository**. Nothing
  was recalled from memory.
- Where a licence could not be verified from the repository, it is marked **UNKNOWN**. It is
  never guessed.
- This is a factual record. **It is not legal advice**, and it does not conclude that anything
  is or is not permitted. A qualified lawyer must review it before a sale.

---

## 1. The most important finding first

> **The Braincore asset itself — all 21 files in `features/brain/` — contains no third-party
> code at all.**
>
> No imports, no `require`, no bundled library, no copied snippet. Each file is a
> self-contained UMD module with zero dependencies. Verified by reading all 21 files.

**Plain language:** the part of this project that is being prepared for sale does not borrow
anyone else's code. Every third-party item listed below belongs to the *surrounding
application* — the voice engine, the icons, the fonts, the login service. If Braincore were
lifted out on its own, **none of the licence obligations below would travel with it.**

That is a genuinely strong position and it should be stated clearly to any buyer.

---

## 2. Runtime dependencies of the browser application

| # | Name | Version | Purpose | Source | Licence | Commercial use | Attribution required | Copyleft | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Lucide** (icon subset) | 1.8.0 | UI icons | Bundled: `lucide.min.js` | **ISC** — declared in the file header; full text in `LUCIDE-LICENSE.txt` | Yes | Yes — keep the notice | No | ✅ **OK** |
| 2 | **Instrument Serif** | — | Display typeface | Bundled: `assets/fonts/InstrumentSerif-400.woff2` | **SIL OFL 1.1** per `THIRD-PARTY-LICENSES.md` | Yes | Yes | Font-scope only | ⚠️ **Licence text not bundled** |
| 3 | **Plus Jakarta Sans** | 4 weights | Body typeface | Bundled: `assets/fonts/PlusJakartaSans-*.woff2` | **SIL OFL 1.1** per `THIRD-PARTY-LICENSES.md` | Yes | Yes | Font-scope only | ⚠️ **Licence text not bundled** |
| 4 | **Noto Sans Thai Looped** | 4 weights | Thai typeface | Bundled: `assets/fonts/NotoSansThaiLooped-*.woff2` | **SIL OFL 1.1** — full text at `assets/fonts/OFL-NotoSansThaiLooped.txt` | Yes | Yes | Font-scope only | ✅ **OK** |
| 5 | **Fredoka** | variable | Round display typeface | Bundled: `assets/fonts/Fredoka-var.woff2` (29,704 bytes) | **UNKNOWN in this repo** — see §4.1 | Presumed yes (SIL OFL upstream) | Yes | Font-scope only | 🔴 **GAP — undocumented and shipping** |
| 6 | **Supertonic 3 — runtime** | sherpa-onnx v1.13.6 | On-device speech, WASM | Bundled: `vendor/supertonic-3/` | **MIT** — full text at `vendor/supertonic-3/LICENSE` (Supertone Inc. 2025) | Yes | Yes | No | ✅ **OK** |
| 7 | **Supertonic 3 — model weights** | int8, 2026-05-11 | On-device speech models (~145 MB) | Bundled: 4 × `.onnx` + `voice.bin` | **OpenRAIL-M** per upstream model card | Yes, free | Yes | **No — but use-restricted** | ⚠️ **Needs legal review — see §4.2** |
| 8 | **sherpa-onnx** | v1.13.6 | Speech inference framework | Compiled into the WASM above | **Apache-2.0** per `THIRD-PARTY-LICENSES.md` | Yes | Yes — NOTICE | No | ✅ **OK** |
| 9 | **Puter SDK** | v2 | Login, and an AI gateway | **NOT bundled** — loaded live from `https://js.puter.com/v2/` | **UNKNOWN** | Unknown | Unknown | Unknown | 🔴 **Needs review — see §4.3** |

### Server-side and tooling only (never reaches the student's browser)

| # | Name | Version | Purpose | Licence | Status |
|---|---|---|---|---|---|
| 10 | **web-push** | 3.6.7 | Scheduled push notifications | **MPL-2.0** per `THIRD-PARTY-LICENSES.md` | ✅ OK — file-level copyleft; used unmodified as a dependency |
| 11 | **@heyputer/cli** | 0.1.2 | Deploys the Puter Worker in CI | **MIT** per `THIRD-PARTY-LICENSES.md` | ✅ OK |

### Content and data

| # | Name | Purpose | Licence | Status |
|---|---|---|---|---|
| 12 | **open-dsl-dict / wiktionary-dict** (English→Indonesian) | Optional expanded vocabulary | **CC BY-SA 3.0 + GFDL** | ⚠️ **Share-alike — see §4.4** |
| 13 | FIEZEL's own content banks (`vocabulary-master.json` 93,892 lines; `reading-bank.json`; `grammar-templates.json`; listening/cloze banks) | Learning content | Presumed owner-created | ⚠️ **Provenance not independently verified — see §4.5** |

---

## 3. External services the application depends on at runtime

| Service | Used for | If it disappears |
|---|---|---|
| **Cloudflare Workers / D1 / KV / R2** | API, identity, quota, audio | Learning continues. AI and stored audio stop. |
| **Puter** (`js.puter.com`, `*.puter.work`) | Login, AI gateway | Login and AI stop. **Learning continues.** |
| **cPanel / ArenHost** | Hosting the web app | The app stops being served; installed PWAs keep working offline. |
| **ElevenLabs** | Pre-generating audio assets (build time only, not runtime) | No runtime effect; new audio cannot be generated. |

**Plain language:** every one of these can fail without stopping a student from learning. That
is by design and it is a real strength. But it also means a buyer inherits **four supplier
relationships**, and two of them (Puter, ElevenLabs) are commercial third parties whose terms
this audit could not read.

---

## 4. Issues found — each stated plainly

### 4.1 🔴 Fredoka ships but is documented as removed

**The facts, all verified:**

| Evidence | Finding |
|---|---|
| `THIRD-PARTY-LICENSES.md:102` | *"m025-86: Fredoka dilepas dari bundel … berkasnya ikut dihapus"* — Fredoka was dropped from the bundle, its file deleted |
| `assets/fonts/Fredoka-var.woff2` | **Present.** 29,704 bytes |
| `sw.js:66` | **Pre-cached** — shipped to every user's device |
| `style.css:1396` | `@font-face{font-family:'FZ Fredoka'...}` — declared |
| `style.css:855` | `--fz-display-round:'FZ Fredoka'...` — actively used as the display typeface |

It was removed at milestone m025-86, then **re-added at m028 phase 2**, and the licence
document was never updated. No licence text for it exists anywhere in the repository.

**Plain language:** the project is shipping a font to every user while its own licence
document says that font was deleted. Fredoka is published by Google Fonts under the SIL Open
Font License, which permits this use but **requires the licence notice to travel with the
font**. Right now no notice travels with it.

**Severity: low risk, but it must be fixed before a sale.** A buyer's lawyer will check the
font list against the font folder, find the mismatch immediately, and reasonably ask what else
the documentation gets wrong.

**Fix (small):** confirm Fredoka's exact source and version, add its OFL text to
`assets/fonts/`, and restore its entry in `THIRD-PARTY-LICENSES.md`.

### 4.2 ⚠️ The speech model weights are OpenRAIL-M, not open source

`vendor/supertonic-3/provenance/m02542-build.json` records the weights as **OpenRAIL-M**.

**Plain language:** OpenRAIL-M is free of charge, but it is **not** an ordinary open-source
licence. It is a "responsible AI" licence that attaches *rules about how the model may be
used* — no illegal or harmful use — and, critically, it normally requires that **those same
rules be passed on to anyone you give the software to**.

For FIEZEL as a language-learning app, the restrictions themselves are irrelevant — nobody is
going to use it for anything the licence forbids. **The part that matters for a sale is the
pass-on requirement**, because a buyer needs to know they inherit an obligation, not a clean
grant.

**This affects the FIEZEL application, not Braincore.** Braincore does not touch the speech
engine. If Braincore is sold on its own, this issue does not travel with it — worth saying
explicitly, because it is one of the strongest arguments for selling Braincore separately.

**Action: a lawyer must confirm the exact OpenRAIL-M variant and its flow-down terms** before
the *application* is sold or sublicensed.

### 4.3 🔴 Puter's terms are unknown, and it is on the login path

`index.html` loads `https://js.puter.com/v2/` **live from Puter's servers on every page load**.
It is not bundled and not version-pinned.

Three separate problems, in increasing order of importance:

1. **Licence UNKNOWN.** No Puter licence text exists in this repository. It could not be
   verified without leaving the repository, which this audit does not do.
2. **Data handling UNKNOWN.** Puter handles login. What it stores about students is governed
   by Puter's terms, which this audit has not read. This matters because the users are
   language learners who may be minors.
3. **Unpinned third-party code executes in the app.** Because it is loaded live and not
   version-pinned, whatever Puter serves tomorrow runs in every student's browser. The rest of
   this project is unusually disciplined about pinning and hash-locking its dependencies
   (`NEURAL-VOICE-SOURCE-LOCK.json`, per-file SHA-256 sums for the speech engine). **This one
   dependency is the exception**, and it is the one with the most privileged position.

**Action for the owner:** obtain Puter's terms of service and data-processing terms, and give
them to the lawyer. This is the **highest-priority unknown in the entire dependency audit**.

### 4.4 ⚠️ The optional dictionary is share-alike

The English→Indonesian lexicon from `open-dsl-dict/wiktionary-dict` is **CC BY-SA 3.0 + GFDL**.
"Share-alike" means: if you redistribute that data or something derived from it, you must
release it under the same terms.

`THIRD-PARTY-LICENSES.md` already handles this correctly — it states the obligation and notes
that the bundled 1,765-entry learner vocabulary is **separate** from this source.

**What still needs confirming:** that no share-alike dictionary content has leaked into the
main bundled content files. This audit **did not verify that** — it would require comparing
93,892 lines of vocabulary against the external source. Marked **UNKNOWN**.

### 4.5 ⚠️ Content provenance is not independently established

The learning content is large: 93,892 lines of vocabulary, 31,026 lines of reading, plus
grammar, listening and cloze banks.

The repository has real machinery around content integrity — `content-integrity-audit.js`,
`content-evidence-origin.js`, `CONTENT-EVIDENCE-ORIGIN.md`, `grammar-provenance-verify.js` —
and those gates pass. But those verify **integrity** (has this been tampered with?) rather
than **origin** (who wrote it, and was any of it copied?).

**This audit cannot confirm the content is original.** Marked **UNKNOWN**. For a sale of the
*application* this needs an answer; for a sale of *Braincore alone* it does not, because
content is not part of the Braincore asset.

### 4.6 ℹ️ Retired dependencies still listed as bundled

`THIRD-PARTY-LICENSES.md` lines 36–54 describe Kokoro.js, Kokoro-82M, @huggingface/transformers,
phonemizer and ONNX Runtime Web as *"bundled"*, pointing at `vendor/kokoro-js/` and
`vendor/kokoro-model/`.

**Those directories do not exist.** Kokoro appears nowhere in `index.html` or `sw.js`. It was
replaced by Supertonic 3 at m025-42, for a documented and good reason (Kokoro ran long WASM
calls on the main thread and killed the iOS content process).

Harmless — it over-declares rather than under-declares — but it is the mirror image of the
Fredoka problem and should be corrected in the same pass.

### 4.7 ℹ️ No lockfile

There is no `package-lock.json`. With exactly one runtime dependency (`web-push`, used only by
the push dispatcher, never by the browser app) the practical risk is small, but a buyer's
reviewer will ask.

---

## 5. Summary table

| Item | Status |
|---|---|
| **Braincore (`features/brain/`) — third-party content** | ✅ **NONE. Zero dependencies.** |
| Lucide, Supertonic runtime, sherpa-onnx, Noto Sans Thai, web-push, @heyputer/cli | ✅ Verified and compatible |
| Instrument Serif, Plus Jakarta Sans | ⚠️ Licence stated, text not bundled |
| **Fredoka** | 🔴 Shipping, undocumented, no licence text |
| **Speech model weights (OpenRAIL-M)** | ⚠️ Use-restricted; flow-down needs legal review |
| **Puter SDK** | 🔴 Licence UNKNOWN, terms UNKNOWN, unpinned, on the login path |
| Wiktionary dictionary | ⚠️ Share-alike; leakage into bundled content unverified |
| Content provenance | ⚠️ UNKNOWN |
| Retired Kokoro entries | ℹ️ Documentation cleanup |
| Lockfile | ℹ️ Absent |

---

## 6. What a lawyer must verify before a sale

**If selling Braincore alone:**
1. That `features/brain/` really is dependency-free (this audit says yes — have it confirmed).
2. Authorship and ownership of the Braincore code itself, given AI-assisted development —
   see `IP/AI_ASSISTED_DEVELOPMENT.md`.

**If selling the whole FIEZEL application, additionally:**
3. Puter's terms of service, licence, and data-processing terms — **highest priority**.
4. The exact OpenRAIL-M variant on the speech weights and its flow-down obligations.
5. Whether any share-alike dictionary data reached the bundled content.
6. The origin of all learning content.
7. That every bundled font's licence notice is present and correct.

---

*End of IP/DEPENDENCY_AUDIT.md. Factual record only — not legal advice.*
