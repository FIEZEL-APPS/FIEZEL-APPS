# IP — Third-Party Licences (corrected, audit-verified)

**Purpose:** an accurate, verified list of third-party licence obligations.

**Relationship to the existing `THIRD-PARTY-LICENSES.md` in the repository root:** that file
is largely good and clearly maintained with care, but this audit found **three accuracy
defects** in it. This document is the corrected version. **The root file has deliberately not
been edited** — this audit pass does not modify the repository outside its own report
directories. The corrections are listed in §4 so the owner can apply them.

**Verification standard:** every licence below was confirmed against a file or a declaration
inside this repository. Anything that could not be confirmed is marked **UNKNOWN**.

---

## 1. Braincore — the asset being sold

> **`features/brain/` contains no third-party code. There are no licence obligations
> attached to the Braincore asset.**

Verified by reading all 21 files: no `import`, no `require`, no bundled library, no copied
third-party source. Each module is a self-contained UMD wrapper around original code.

Everything below therefore concerns the **surrounding FIEZEL application**, not Braincore.

---

## 2. Verified and compatible

### Lucide (icon subset) — ISC
- **Bundled at:** `lucide.min.js`
- **Declared in the file header:** `@license Lucide v1.8.0 subset - ISC`, `Copyright (c) 2026 Lucide Icons and Contributors`
- **Full text:** `LUCIDE-LICENSE.txt` ✅ present
- **Obligation:** keep the copyright and licence notice. **Currently satisfied.**

### Noto Sans Thai Looped — SIL OFL 1.1
- **Bundled at:** `assets/fonts/NotoSansThaiLooped-{400,500,600,700}.woff2`
- **Full text:** `assets/fonts/OFL-NotoSansThaiLooped.txt` ✅ present
- **Source:** notofonts/thai, via google/fonts `ofl/notosansthailooped`. Copyright 2022 The Noto Project Authors.
- **Obligation:** keep the notice; do not sell the font by itself. **Currently satisfied.**

### Supertonic 3 — runtime code — MIT
- **Bundled at:** `vendor/supertonic-3/` (WASM + JS)
- **Full text:** `vendor/supertonic-3/LICENSE` ✅ present — MIT, Copyright (c) 2025 Supertone Inc.
- **Build provenance:** `vendor/supertonic-3/provenance/m02542-build.json` records the exact
  upstream (`k2-fsa/sherpa-onnx` v1.13.6, commit `1cb484a`, emscripten 4.0.23), the build
  script, **and three explicit deviations from the upstream build with the reason for each.**
- **Integrity:** per-file SHA-256 in `vendor/supertonic-3/provenance/SHA256SUMS.txt`
- **Obligation:** keep the notice. **Currently satisfied.**

**Worth noting to a buyer:** this level of build provenance — pinned commit, pinned toolchain,
documented deviations, per-file hashes — is better than most commercial projects manage.

### sherpa-onnx — Apache-2.0
- Compiled into the Supertonic WASM. Obligation: retain notice / NOTICE file.

### web-push 3.6.7 — MPL-2.0
- Used **only** by the scheduled push dispatcher. **Never reaches the browser.**
- MPL-2.0 is file-level copyleft: modifications to *its* files must be shared. Used unmodified
  as a dependency, so no obligation is triggered beyond attribution.

### @heyputer/cli 0.1.2 — MIT
- CI/deployment tooling only. Not bundled into the runtime.

---

## 3. Requires attention

### 🔴 Fredoka — UNDOCUMENTED AND SHIPPING

| Evidence | Finding |
|---|---|
| Root `THIRD-PARTY-LICENSES.md:102` | States Fredoka was **removed** at m025-86 and its file deleted |
| `assets/fonts/Fredoka-var.woff2` | **Present, 29,704 bytes** |
| `sw.js:66` | **Pre-cached** — shipped to every device |
| `style.css:1396` | `@font-face{font-family:'FZ Fredoka'…}` |
| `style.css:855` | `--fz-display-round:'FZ Fredoka'…` — actively used |
| Licence text in repository | **NONE** |

It was removed at m025-86, re-added at m028 phase 2, and the documentation was never updated.

**Obligation:** Fredoka is published under SIL OFL 1.1 (via Google Fonts). The OFL permits
bundling and redistribution **provided the licence notice travels with the font.** No notice
currently travels with it.

**Fix:** confirm the exact source and version, add the OFL text to `assets/fonts/`, restore the
entry in the root licence file. Small task, must be done before a sale of the application.

### ⚠️ Instrument Serif and Plus Jakarta Sans — SIL OFL 1.1, notice not bundled

Both are declared as OFL 1.1 in the root file with project URLs, but unlike Noto Sans Thai
Looped, **no `OFL-*.txt` is bundled alongside them** in `assets/fonts/`.

**Fix:** add both OFL texts, matching the pattern already used correctly for the Thai font.

### ⚠️ Supertonic 3 — model weights — OpenRAIL-M

`vendor/supertonic-3/provenance/m02542-build.json` records:

> `"modelWeights": "OpenRAIL-M per the upstream model card"`
> `"cost": "free; no API key, no runtime billing, inference is fully on-device"`

**What OpenRAIL-M means, plainly:** free of charge, but **not** an ordinary open-source
licence. It attaches rules about *how the model may be used* (no illegal or harmful use) and
normally requires those rules to be **passed on to anyone you give the software to**.

For a language-learning app the restrictions are irrelevant in practice. **The pass-on
requirement is what matters for a sale**, because a buyer inherits an obligation rather than a
clean grant.

**Does not affect Braincore.** Braincore does not touch the speech engine.

**Fix:** a lawyer must confirm the exact OpenRAIL-M variant and its flow-down terms before the
application is sold or sublicensed.

### 🔴 Puter SDK — UNKNOWN on every axis

- **Loaded live** from `https://js.puter.com/v2/` in `index.html`. Not bundled, **not version-pinned.**
- **Licence: UNKNOWN.** No Puter licence text exists in this repository.
- **Data-processing terms: UNKNOWN.** It handles login for an app used by language learners
  who may be minors.
- **Security note:** because it is unpinned and live-loaded, whatever Puter serves tomorrow
  executes in every student's browser. The rest of this project is unusually disciplined about
  pinning (`NEURAL-VOICE-SOURCE-LOCK.json`, per-file SHA-256 for the speech engine). **This is
  the single exception, and it has the most privileged position.**

**This is the highest-priority unknown in the licence audit.** The owner must obtain Puter's
terms of service, licence, and data-processing terms and give them to the lawyer.

### ⚠️ Wiktionary EN→ID dictionary — CC BY-SA 3.0 + GFDL

From `open-dsl-dict/wiktionary-dict`, file `src/en-id-enwiktionary.txt`. Optional; loaded only
if the operator supplies it.

**Share-alike:** redistributing the data or a derivative requires releasing it under the same
terms. The root licence file states this correctly and notes that the bundled 1,765-entry
learner vocabulary is **separate**.

**Unverified:** that no share-alike content leaked into the main bundled content files.
Confirming it would require comparing 93,892 lines of vocabulary against the external source.
**UNKNOWN.**

---

## 4. Corrections needed in the root `THIRD-PARTY-LICENSES.md`

| # | Defect | Fix |
|---|---|---|
| 1 | **Fredoka listed as removed, but it ships.** Line 102. | Restore the entry; add the OFL text. |
| 2 | **Kokoro entries describe code that is no longer bundled.** Lines 36–54 describe Kokoro.js 1.2.1, Kokoro-82M v1.0, @huggingface/transformers 3.5.1, phonemizer 1.2.1 and ONNX Runtime Web as *"bundled"*, pointing at `vendor/kokoro-js/` and `vendor/kokoro-model/`. **Neither directory exists.** Kokoro appears nowhere in `index.html` or `sw.js`; it was replaced by Supertonic 3 at m025-42. | Move these entries under the existing *"Retired"* heading. |
| 3 | **"Retired with m025-42" says two vendor directories "remain in the tree for one release"** — `vendor/sherpa-vits/` and `vendor/sherpa-vits-id/`. **Both are already gone.** | Update to record that they have been removed. |

**Plain language:** defects 2 and 3 are harmless in themselves — the file over-declares rather
than under-declares, which is the safe direction. But together with defect 1 (which is a real
gap) they show the licence file drifted out of step with the code. A buyer's lawyer checks
exactly this correspondence, and a mismatch invites them to doubt the rest.

**All three corrections are small and can be done in one pass.**

---

## 5. Summary

| Item | Class | Licence | Status |
|---|---|---|---|
| **Braincore (`features/brain/`)** | Own work | — | ✅ **No third-party content whatsoever** |
| Lucide | OSS | ISC | ✅ Compliant |
| Noto Sans Thai Looped | OSS | SIL OFL 1.1 | ✅ Compliant |
| Supertonic 3 runtime | OSS | MIT | ✅ Compliant |
| sherpa-onnx | OSS | Apache-2.0 | ✅ Compliant |
| web-push | OSS | MPL-2.0 | ✅ Compliant |
| @heyputer/cli | OSS | MIT | ✅ Compliant |
| Instrument Serif | OSS | SIL OFL 1.1 | ⚠️ Notice not bundled |
| Plus Jakarta Sans | OSS | SIL OFL 1.1 | ⚠️ Notice not bundled |
| **Fredoka** | UNKNOWN | UNKNOWN | 🔴 **Ships undocumented** |
| **Supertonic 3 weights** | Restricted | OpenRAIL-M | ⚠️ **Flow-down needs legal review** |
| **Puter SDK** | UNKNOWN | UNKNOWN | 🔴 **Terms unknown, unpinned, on the login path** |
| Wiktionary dictionary | OSS | CC BY-SA 3.0 + GFDL | ⚠️ Share-alike; leakage unverified |
| Learning content | UNKNOWN | UNKNOWN | ⚠️ Provenance unverified |

---

*End of IP/THIRD_PARTY_LICENSES.md. Factual record only — not legal advice.*
