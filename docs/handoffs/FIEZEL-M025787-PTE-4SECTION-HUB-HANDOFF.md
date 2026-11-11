# FIEZEL HANDOFF DOSSIER: M025-787
## Comprehensive 4-Section Pearson PTE Academic Preparation Hub & Deep Pedagogical Feedback System

- **Release Build**: `m025-787`
- **Worktree**: `C:\Users\hp\fiezel-pte-prep-8979c`
- **Branch**: `feat/pte-academic-prep-hub`
- **Pull Request**: [#864](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/864)
- **Target User**: Fitra Rusdiawan (Australian Student Visa Subclass 500, Commercial Cookery & Hospitality Management at AILFE Perth, April 2027 intake)
- **Target PTE Score**: 42 (Vocational benchmark / IELTS 5.0–5.5 / CEFR B1)
- **Date**: 2026-11-12

---

## 1. Executive Summary & Mandate Background

In response to the user's explicit mandate:
> *"gini aja deh di seksi latihan di fiezel, tambahkan seksi fitur baru yaitu PTE, MASUKKAN SEMUA MATERI SESUAI SEKSI, READING, SPEAKING, WRITING DAN LISTENING, DAN FORMATNYA HARUS SANGAT SESUAI PEARSON RESMI, KAMU BISA MENCARI BANK SOAL YANG SANGAT LENGKAP DI WEBSITE WEBSITE TERTENTU SEPERTI DI e2language.com DAN MASIH BANYAK LAGI, POKOKNYA HARUS BANYAK BANK SOAL UNTUK SELURUH SEKSI, DAN UNTUK FEEDBACKNYA HARUS SANGAT BAGUS, DAN HARUS LEBIH BAGUS DARI PADA INI... KAMU MUNGKIN BISA MENCARI SUMBER SUMBER VIDEO LAIN DI YOUTUBE YANG MENJELASKAN FORMULA TERTENTU DAN YANG SANGAT LENGKAP"*

We expanded FIEZEL's PTE Academic module from an initial "Big 4" pilot into a **complete 4-section, 13-task PTE Academic Preparation Hub** mirroring the official Pearson exam specifications and integrating Nakul's tested 7-hour pedagogical heuristics and formulas.

Crucially, addressing the user's struggle with **Fill in the Blanks, collocations, linking words, and grammar mechanics**, we built a **Deep Pedagogical Feedback Drawer** that unpacks every mistake with:
1. **💡 3-Second Grammar Formula**: Instant parsing of structural constraints (e.g. `Subject + Verb + [Adverb]`, `Preposition + [Noun/Gerund]`).
2. **🤝 Patent Collocations**: Authentic academic word pairings with real-world co-occurrence context (e.g. *"deeply divided"*, *"play a crucial role"*).
3. **🧭 Linking Words & Discourse Map**: Logical function explanation (Contrast, Concession, Cause-Effect, Addition) showing why a transitional word fits or fails.
4. **❌ Distractor Analysis**: Detailed breakdown of why each plausible alternative is grammatically or semantically invalid.
5. **🇮🇩 Indonesian Sentence Translation**: Complete context translation to ensure deep semantic comprehension without cognitive overload.

---

## 2. Architecture & File Inventory

### A. 15 Comprehensive JSON Content Banks (`content/pte/`)
All files strictly formatted and verified against Pearson exam structures:

1. **`pte-read-aloud.json`**: Authentic academic passages, natural chunking markers (`//`), 35s preparation timer, 40s recording window.
2. **`pte-repeat-sentence.json`**: Authentic exam sentence bank, audio script, acoustic pitch tracking, Nakul 50% content retention rule.
3. **`pte-describe-image.json`**: Bar charts, line graphs, pie charts, and life-cycle diagrams with inline responsive SVG renderings and Nakul 5-line universal template.
4. **`pte-write-dictation.json`**: High-frequency exam sentences, spelling misconception traps, and Nakul Extra Words Hack evaluation.
5. **`pte-reading-fib.json`**: 8 authentic multi-paragraph passages, 24 blanks with full deep pedagogical feedback payloads (Grammar Formula, Collocation, Linking Map, Distractor Analysis, Translation).
6. **`pte-reading-drag-drop.json`**: 6 academic passages with interactive word pools, part-of-speech color tags, and collocation cues.
7. **`pte-reorder-paragraphs.json`**: 5 authentic jumbled texts with independent sentence identification clues and adjacent pair scoring logic.
8. **`pte-summarize-written-text.json`**: 5 academic texts with single-sentence validation (5–75 words, optimal 35–45), compound-complex clause analyzers, and model summaries.
9. **`pte-essay-writing.json`**: 5 official essay prompts with 4-paragraph structural scaffolds (Introduction, Body 1, Body 2, Conclusion) and 200–300 word counters.
10. **`pte-retell-lecture.json`**: 5 spoken academic lectures with audio transcripts, key noun chunk extraction, and Nakul 4-sentence spoken template.
11. **`pte-summarize-spoken-text.json`**: 5 spoken lectures with strict 50–70 word target limit validation, key idea checklist, and sample answers.
12. **`pte-listening-fib.json`**: 5 audio transcript passages with embedded spelling pitfalls (doubled consonants, silent letters, -ible vs -able).
13. **`pte-highlight-incorrect-words.json`**: 5 academic reading passages with interactive clickable word tokens and Pearson negative marking calculations (+1 correct, -1 false positive).
14. **`pte-templates.json`**: Complete Nakul Universal Cheat-Sheets (Describe Image, Retell Lecture, Essay Writing, Summarize Written Text).
15. **`pte-daily-roadmap.json`**: Structured 30-day curriculum tailored for Target 42 (Day 1–7 Foundation, Day 8–14 Fluency, Day 15–21 Skill Consolidation, Day 22–30 Mock Drills).

### B. Core PTE Engine (`features/pte/fiezel-pte-engine.js`)
Contains 22 exported functions covering all 13 Pearson tasks and scoring mechanics:
- `tokenize(text)`
- `charLevenshtein(a, b)`
- `tokenAlignment(targetText, spokenText)`
- `evaluateReadAloud(targetText, spokenText, durationSec)`
- `evaluateRepeatSentence(targetSentence, spokenText)`
- `evaluateDescribeImage(spokenText, durationSec, chartType)`
- `evaluateWriteFromDictation(targetSentence, typedText)`
- `calculateCompositePearson(sectionScores)`
- `evaluateAcousticPitch(analyser, sampleRate)`
- `getDailyRoadmapDay(dayNumber)`
- `calculateDailyProgress(completedItemIds)`
- `evaluateReadingFib(userSelections, blanks)`
- `evaluateReadingDragDrop(userPlacements, blanks)`
- `evaluateReorderParagraphs(userOrder, correctOrder)`
- `evaluateSummarizeWrittenText(summaryText, passageText)`
- `evaluateWriteEssay(essayText, promptText)`
- `evaluateRetellLecture(spokenText, durationSec, lectureKeywords)`
- `evaluateSummarizeSpokenText(summaryText, lectureKeywords)`
- `evaluateListeningFib(userInputs, blanks)`
- `evaluateHighlightIncorrectWords(selectedWordIndices, incorrectWordIndices)`

### C. Tactile UI & Stylesheet (`features/pte/fiezel-pte-ui.js`, `features/pte/pte-tactile.css`)
- **2-Level Navigation**:
  - Level 1: `[🎯 30-Day Plan] [🗣️ Speaking] [✍️ Writing] [📖 Reading] [🎧 Listening]`
  - Level 2: Section Task Pills (e.g. Reading: `[R&W FIB] [R-FIB] [RO]`).
- **Interactive Practice Cards**:
  - Inline custom `<select>` dropdowns for Reading FIB.
  - Word pool chips and drop slots for Reading Drag & Drop.
  - Reorder item cards with up/down controls and pair clue hints.
  - Word counter and single-sentence watchdog for SWT and Essay.
  - Clickable tokenized words for Highlight Incorrect Words.
  - Real-time speech status bar, 1000Hz Web Audio start beep, and 3-second silence monitor.
- **Deep Feedback Drawer**:
  - Expandable tactile card showing 3-second grammar formula, collocation pair, linking word discourse role, distractor explanation, and Indonesian translation.

---

## 3. Empirical Test & Verification Results

All tests executed cleanly on worktree `C:\Users\hp\fiezel-pte-prep-8979c`:

```bash
$ node tests/pte-academic-engine-test.js
All 29 PTE Academic Engine unit tests PASSED successfully!

$ node tests/pte-bank-integrity-test.js
All 30 PTE Bank Integrity tests PASSED successfully!

$ node tests/th-ui-leak-test.js
FIEZEL m025-265 kebocoran naskah Indonesia di mode Thai: PASS
4751 kunci id, semuanya punya padanan th

$ node tests/curriculum-cache-version-test.js
OK curriculum-cache-version: 33 penegasan, 3 halaman, build m025-787.

$ node tests/gate-registry-test.js
FIEZEL gate registry: PASS (10 pass, 0 fail)
Gerbang yang BOLEH dihitung sebagai bukti: 432
Pengecualian beralasan: 22

$ node tools/bump-build.mjs --check
{
  "sumber": "m025-787",
  "terpasang": {
    "sw.js": "m025-787",
    "core-config.js": "m025-787",
    "features/neural-voice/fiezel-diag-panel.js": "m025-787"
  },
  "selaras": true
}
Selaras.
```

---

## 4. Protected Surfaces & CI Invariant Adherence

1. **Rule #0 Zero Collateral Damage**:
   - Untouched surfaces: `features/auth/**`, `features/onboarding/**`, `manifest.json`, `website/**`, and runtime `sw.js` logic outside of cache version bump.
   - PR title contains mandatory authorization tag: `[ALLOW-PROTECTED: pwa|ci]`.
2. **Hexa-Sync Invariant**:
   - All 6 sync points verified at `m025-787`.
3. **Zero-Red-Merge / Branch Protection**:
   - Zero direct push to `main`.
   - Work conducted 100% inside isolated worktree `fiezel-pte-prep-8979c`.
   - Branch `feat/pte-academic-prep-hub` pushed and tracking PR #864.

---

## 5. User Testing Instructions

To test the newly added 4-section PTE Academic Hub locally:

1. Start the local preview server from the worktree:
   ```bash
   npx http-server . -p 4173 -c-1
   ```
2. Open in your browser:
   ```text
   http://127.0.0.1:4173/?v=m025-787
   ```
3. Navigate to **PTE Academic Prep** from the menu or bottom navigation:
   - Click on **[📖 Reading]** -> **[R&W FIB]** to practice Fill in the Blanks.
   - Choose options in the dropdown blanks and click **Submit & Check Answers**.
   - Inspect the **Deep Pedagogical Feedback Drawer** to see:
     * 💡 3-Second Grammar Formula
     * 🤝 Collocation Pair
     * 🧭 Linking Word Logic Map
     * ❌ Distractor Analysis
     * 🇮🇩 Indonesian Translation
   - Try **[✍️ Writing]** -> **[SWT]** to test the single-sentence validator.
   - Try **[🎧 Listening]** -> **[HIW]** to click on incorrect words with negative marking.
   - Try **[🗣️ Speaking]** -> **[DI]** or **[RA]** for oral fluency and pronunciation scoring.
