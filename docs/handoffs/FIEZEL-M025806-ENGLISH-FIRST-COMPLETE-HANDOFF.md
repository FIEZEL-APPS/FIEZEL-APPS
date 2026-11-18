# FIEZEL-M025806: English-First Architecture Complete, 11 EN Content Sidecars, Voice Studio & Global Catalog Purity Handoff

- **Build Version**: `m025-806`
- **Branch**: `feat/english-first-complete-m025-806`
- **Date**: 2026-11-19

---

## 1. Executive Audit Summary & Rationale

Following the English-First ("Golden Pivot") architectural transition initiated in `m025-805`, a full end-to-end audit across the live PWA shell, authentication/onboarding gates, 9-locale JSON catalogs, native learning modules, content banks, and the isolated React/Vite Voice Studio (`call.html`) identified four remaining leak surfaces when learners selected non-Indonesian locales (`en`, `ja`, `th`, `ms`, `vi`, `fil`, `km`, `ru`):

1. **Track A — Auth Gate, Onboarding & Boot Locale Detection**:
   - Cold visitors arriving at `?fz_real_auth=1` without a stored `fiezel_lang_chosen` previously fell back to `'id'` before `FiezelI18n` checked URL parameters (`?lang=`, `?locale=`, `?hl=`) or browser `navigator.languages`.
   - The Auth screen (`features/auth/fiezel-auth-screen.js`) and Onboarding flow (`features/onboarding/fiezel-onboarding.js`) previously exposed only `ID | ไทย` pills without an `EN` quick-select pill or full English step copy (`en` map in onboarding steps 1–6).

2. **Track B — AI Voice Studio (`call.html`) & Host Iframe Bridge (`fiezel-interactive-chat.js`)**:
   - `readHostPwaPreferences()` in `features/voice-studio/src/lib/braincore.ts` treated `?lang=` exclusively as `targetLang` even when `?target=` / `?course=` was present (e.g., `call.html?lang=en&target=en`), did not read `localStorage.getItem('fiezel_lang_chosen')` or `fiezel-onboarding-v1`, omitted `'fil'` and `'km'` from `isSupportedUiLocale`, and defaulted `getInitialBraincoreState().learnerLocale` to `'id'`.
   - `resolveRuntimeVoiceLocale()` in `features/voice-studio/src/lib/i18n.ts` read `?lang=` ahead of `?locale=` and `fiezel_lang_chosen`, and several Interactive Whiteboard labels in `LiveWhiteboardCanvas.tsx`, `WhiteboardVisualDiagrams.tsx`, `whiteboardDirector.ts`, `InCallLearningWorkbenchModal.tsx`, and `BeginnerAnswerAssistant.tsx` contained unwrapped Indonesian strings (`"0 Mulai"`, `"Tutor sedang menulis di papan..."`, `"Menunggu giliran"`, `"Rakit Puzzle Pola Kalimat"`).
   - `features/interactive-chat/fiezel-interactive-chat.js` defaulted `locale` to `'id'`, did not propagate runtime `FiezelI18n.onChange` events via `fz.shell.locale` to `#fzMitraKaiwaStudioFrame`, and hardcoded `'Indonesian'` in `puterConversationPrompt`.

3. **Track C — 9-Locale JSON Catalogs & Native Feature Modules**:
   - `features/i18n/locales/fil/{ui,quiz,grammar,vocab}.json` had untranslated English placeholders, `quiz.quickwin-zh-q3` leaked Indonesian in 7 non-ID/non-TH `quiz.json` files, and minor terminology issues existed in `en`, `ms`, `vi`, and `ja` catalogs.
   - `app.js` (`startQuickWinLesson`, `courseLanguageLabel`, `dailyFiveWords`, `writing-prompts-v1.json` rubric `asksEn`/`levelsEn`), `features/speaking-listening/fiezel-jlpt-listening.js`, `features/mandarin/mandarin-ui.js`, `features/grammar/grammar-vocab-bridge.js`, and `features/nujum/fiezel-nujum.js` (`NUJUM_SCRIPTS`, `FALLBACK_TEMPLATES.ruleEn`, `"BERSIAP..."` -> `"GET READY..."`) had remaining Indonesian literals when running in non-Indonesian UI locales.

4. **Track D — Complete 11 English Content Sidecars (`41,818` Strings) & Runtime Loader**:
   - Canonical content banks (`vocabulary-master.json`, `cloze-bank-v1.json`, `reading-bank-v1.json`, `listening-bank-v1.json`, `speaking-bank-v1.json`, exam overlays, JLPT Chokai, Japanese course banks, and Mandarin HSK1–9 curriculum/grammar/vocab) store Indonesian explanations/meanings in their locked base files.
   - To preserve all 13 `LOCKED_FILES` and `content/ja/` parity invariants while delivering 100% English content to non-ID/non-TH learners, we generated and wired 11 dedicated English sidecar JSONs loaded on demand by `features/i18n/fiezel-en-loader.js` (`CacheStorage` `fiezel-locale-en-v1`).

---

## 2. Empirical Playwright Headless Browser Verification

Executed headless Chromium Playwright verification (`verify-i18n-playwright.mjs`) against the full local production build across 21 distinct screens and interactive modals, plus visual frame inspection of every captured PNG screenshot:

- `[CLEAN] auth_gate_en` (`chars=163`, `hits=[]`, `meta={"authVisible":true,"hasEnBtn":true,"i18nLoc":"en"}`)
- `[CLEAN] auth_gate_ja` (`chars=89`, `hits=[]`, `meta={"authVisible":true,"hasEnBtn":true,"i18nLoc":"ja"}`)
- `[CLEAN] auth_gate_th` (`chars=118`, `hits=[]`, `meta={"authVisible":true,"hasEnBtn":true,"i18nLoc":"th"}`)
- `[CLEAN] pwa_en_home` (`chars=664`, `hits=[]`, `meta={"locale":"en","enReady":true,"vocabSample":"every; the whole"}`)
- `[CLEAN] pwa_en_vocab_quiz` (`chars=283`, `hits=[]`)
- `[CLEAN] pwa_en_grammar_quiz` (`chars=254`, `hits=[]`)
- `[CLEAN] pwa_en_reading` (`chars=578`, `hits=[]`)
- `[CLEAN] pwa_en_writing` (`chars=1114`, `hits=[]`)
- `[CLEAN] pwa_en_skills` (`chars=396`, `hits=[]`)
- `[CLEAN] pwa_en_nujum` (`chars=374`, `hits=[]`)
- `[CLEAN] pwa_en_pte` (`chars=1789`, `hits=[]`)
- `[CLEAN] pwa_ja_en_home` (`chars=621`, `hits=[]`)
- `[CLEAN] pwa_ja_en_reading` (`chars=304`, `hits=[]`)
- `[CLEAN] pwa_ja_en_chokai` (`chars=641`, `hits=[]`)
- `[CLEAN] pwa_zh_en_home` (`chars=827`, `hits=[]`)
- `[CLEAN] pwa_zh_en_currmap` (`chars=2195`, `hits=[]`)
- `[CLEAN] pwa_zh_en_lesson_step2` (`chars=1120`, `hits=[]`)
- `[CLEAN] pwa_zh_en_lesson_step4` (`chars=1318`, `hits=[]`)
- `[CLEAN] pwa_zh_en_grammar_modal` (`chars=7651`, `hits=[]`)
- `[CLEAN] vs_en_call` (`chars=749`, `hits=[]`)
- `[CLEAN] vs_en_whiteboard` (`chars=2221`, `hits=[]`)
- **Result**: `TOTAL SCREENS WITH ID LEAKS: 0`

---

## 3. Files Touched & Key Changes

### A. Core Runtime, Auth, Onboarding & EN Content Sidecar Loader
- `index.html`: Registered `<script defer src="./features/i18n/fiezel-en-loader.js"></script>`.
- `sw.js`: Added `'./features/i18n/fiezel-en-loader.js'` to `ASSETS` precache list and bumped `SW_REV` to `m025-806`.
- `app.js`: Wired `FiezelOnEnDataReady`, `grammarItemForEn(item, zhMap)`, `vocabForLocale`, `applyContentLocale`, `applyClozeLocale`, `writingTargetWords`, `writing()`, `startQuickWinLesson`, `courseLanguageLabel`, `dailyFiveWords`, and URL/navigator boot locale resolution.
- `features/i18n/fiezel-i18n.js`: Added URL query (`?lang=`, `?locale=`, `?hl=`) and browser `navigator.languages` detection when no explicit stored locale exists while preserving `DEFAULT_LOCALE = 'id'`.
- `features/i18n/fiezel-en-loader.js`: Created on-demand English content sidecar loader with `CacheStorage` (`fiezel-locale-en-v1`), `ensureCourse('ja'|'zh')`, and `FiezelOnEnDataReady` callback notification.
- `features/auth/fiezel-auth-screen.js`: Added `EN` pill (`data-auth-locale="en"`) to the auth language bar and English fallback copy.
- `features/onboarding/fiezel-onboarding.js`: Added complete `COPY.en` onboarding dictionary, `EN` language selector support, and localized Step 1–6 helpers.

### B. 11 English Content Sidecar JSONs & Rubric Metadata
- `vocabulary-en.json`: `2,440` English vocabulary definitions and example translations.
- `features/i18n/cloze-bank-en.json`: `436` English cloze prompts, explanations, and distractor rationales.
- `features/i18n/reading-bank-en.json`: `312` reading passages (A1–A2 questions/options/explanations + B1–C2 explanations).
- `features/i18n/reading-exam-en.json`: `8` exam passages (`96` questions), honesty notice, and format descriptions.
- `features/i18n/listening-bank-en.json`: `1,407` listening items in English.
- `features/i18n/listening-exam-en.json`: `8` listening exam sets, honesty notice, and format descriptions.
- `features/i18n/speaking-bank-en.json`: `53` speaking prompts, hints, and rubric criteria in English.
- `features/i18n/speaking-exam-en.json`: English speaking exam honesty statement, rubric descriptors, and format labels.
- `features/i18n/jlpt-listening-en.json`: `62` JLPT N5–N1 Chokai items and distractor explanations in English.
- `features/i18n/japanese-en.json`: Japanese course sidecar (`1,984` vocab, `180` reading, `100` writing items).
- `features/i18n/mandarin-en.json`: Mandarin HSK 1–9 sidecar (`6` foundation sections, `192` lessons, `192` grammar patterns, `2,194` vocab meanings/examples, `192` course grammar items, `49` readings, `5` writing prompts).
- `writing-prompts-v1.json`: Added `asksEn` and `levelsEn` descriptors to all 5 analytic writing rubric criteria.

### C. Native Learning Modules & 9-Locale Catalogs
- `features/i18n/locales/{en,id,th,ms,vi,fil,ja,km,ru}/{ui,quiz,grammar,vocab}.json` & `features/i18n/copy-{id,th}-{app-c,bahasa,feat-b}.js`: Completed Filipino (`fil`) translations, fixed `quiz.quickwin-zh-q3` in 7 non-ID/non-TH locales, and refined `en`/`ms`/`vi`/`ja` catalog strings.
- `features/speaking-listening/fiezel-speaking-listening-addon.js`: Wired `FiezelEnData` overlays for listening and speaking banks/exams.
- `features/speaking-listening/fiezel-jlpt-listening.js`: Added `jlptEnEntry()`/`jlptPick()` overlay routing and replaced hardcoded Indonesian strings with registered `t('jlpt.*')` keys.
- `features/mandarin/mandarin-ui.js`: Added `zhEnSidecar()` and `zhLessonView()` overlays, localized Curriculum Map, Lesson Player, HSK Vocab Explorer, Grammar Bank, and deduplicated identical `title · titleZh` headings.
- `features/grammar/fiezel-grammar-upgrade.js`, `features/grammar/grammar-vocab-bridge.js`, `features/mascot/fiezel-mochi-voice-sos.js`, `features/pte/fiezel-pte-ui.js`, `features/pte/fiezel-pte-engine.js`: Localized remaining UI strings and fallback messages.
- `features/nujum/fiezel-nujum.js`: Added `njIsId()`, `njPick()`, `njTxt()`, `njRule()`, added `ruleEn` to all 12 `FALLBACK_TEMPLATES`, and localized countdown (`GET READY...` / `GO!`), banners, surrender, dispute, and duel summary modals.

### D. AI Voice Studio (`call.html`) & Interactive Chat Bridge
- `features/interactive-chat/fiezel-interactive-chat.js`: Read `fiezel_lang_chosen`, added live `FiezelI18n.onChange` -> `StudioBridge.send('fz.shell.locale')` sync, localized iframe title, and localized offline/Puter fallback prompts.
- `features/voice-studio/src/types/voiceCall.ts`, `src/lib/braincore.ts`, `src/lib/i18n.ts`, `src/App.tsx`, `src/components/BeginnerAnswerAssistant.tsx`, `src/components/InCallLearningWorkbenchModal.tsx`, `src/components/LiveWhiteboardCanvas.tsx`, `src/components/WhiteboardVisualDiagrams.tsx`, `src/lib/whiteboardDirector.ts`, and compiled `features/voice-studio/dist/voice-studio.{js,css}`: Full 9-locale resolution (`fiezel_lang_chosen`, `?target=`+`?lang=`, `fiezel-onboarding-v1`, parent `FiezelI18n`), English-first initial state, live `fz.shell.locale` and `storage` listener, and localized Interactive Whiteboard phases/diagrams.
- `tests/i18n-english-first-and-purity-test.js` & `tests/fixtures/id-golden-baseline.json`: Extended test coverage to 14 checks and updated golden snapshot baseline.

---

## 4. Quality Gates & Technical Debt Notes

- **All 13 `LOCKED_FILES` & `content/ja/` Census**: Untouched (`0` modifications).
- **Local Verification Suites Passed**:
  - `node tests/i18n-english-first-and-purity-test.js` (`14/14 PASS`)
  - `node tests/i18n-global-purity-test.js` (`11/11 PASS`)
  - `node tests/i18n-leak-guard-test.js` (`PASS`)
  - `node tests/i18n-kunci-hantu-test.js` (`PASS`)
  - `node tests/i18n-param-collision-test.js` (`PASS`)
  - `node tests/th-ui-leak-test.js` (`PASS`)
  - `node tests/th-coverage-test.js`, `th-bank-purity-test.js`, `th-exam-overlay-test.js`, `th-content-overlay-test.js`, `tools/scan-th-bank-leak.js` (`PASS`)
  - `node tests/id-golden-snapshot-test.js` (`PASS`)
  - `node tests/auth-screen-test.js`, `onboarding-test.js`, `boot-auth-verdict-test.js`, `critical-surface-protection-test.js`, `collateral-scope-guard-test.js` (`PASS`)
  - `node tests/precache-covers-shell-test.js`, `curriculum-cache-version-test.js`, `sw-build-marker-freshness-test.js`, `pwa-release-coherence-test.js`, `gate-registry-test.js` (`PASS`)
  - `node tests/voice-studio-ui-architecture-test.js`, `mobile-pwa-mic-duplex-test.js`, `voice-duplex-fullphone-contract-test.js` (`PASS`)
- **Remaining Technical Debt**:
  - Kurikulum Merdeka Indonesian national school surfaces (`misi.html`, `kurikulum.html`, `content/mapel/*.json`) remain intentionally Indonesian by domain design.
  - B1–C2 reading passage bodies/questions in `reading-bank-v1.json` are already target-language English; `reading-bank-en.json` provides English explanations for all 312 passages and full English stem/options/explanations for A1–A2.
