# FIEZEL-M025805 · English-First I18N Foundation, Grammar Content Pivot & 36-Catalog Purification — Handoff & Roadmap

- **Owner / Authoritative Mandate**: `MASTER` / `OWNER`
- **Build Target**: `m025-805`
- **Status**: **Phase 1 Verified & Complete**
- **Related Audit Artifact**: `FIEZEL-M025803-I18N-COMPREHENSIVE-AUDIT.md`

---

## 1. Executive Summary & Architectural Decision

Audit empiris menyeluruh terhadap build produksi `m025-803` / `m025-804` mengungkapkan bahwa kebocoran Bahasa Indonesia ke pengguna internasional (`en`, `vi`, `ms`, `fil`, `ja`, `km`, `ru`, `th`) disebabkan oleh **Bahasa Indonesia pernah dijadikan bahasa sumber utama & fallback default di kode inti**. Akibatnya:

1. Pengguna non-Indonesia / non-Thai sering jatuh kembali (*fallback*) ke naskah Bahasa Indonesia di `app.js`, AI Voice Studio (`features/voice-studio`), `undercover.html`, modal Mandarin, Pembaca Cerita N5, dan tombol Mochi SOS.
2. Penerjemah katalog sebelumnya (`tools/i18n-localize-matrix.mjs`) melakukan substitusi kata-per-kata atas naskah Inggris sehingga melahirkan **kalimat gado-gado** di ~140–185 kunci pada `vi`, `ms`, `fil`, `ja`, `km`, `ru`, dan `th` (misalnya `can` -> `"tin"` / `"缶"` / `"банки"` / `"កំប៉ុង"` / `"lata"`, `Articles` -> `"記事"`, `Listening` -> `"鳥海"`, `Conversation` -> `"海和"`, serta `"KelasKu for Учительs"`), plus 12 kunci yang masih menyebut maskot pensiun `"PAW"`.
3. `grammar-templates.json` sebenarnya sudah menyimpan penjelasan bahasa Inggris lengkap pada **512/512 template** dan **1534/1536 distractor** (`rule`, `whyCorrect`, `whyOthersFail`, `howToAvoid`, `memoryCue`, `whyFails`), tetapi `applyContentLocale()` dan `grammarReasonForLearner()` di `app.js` hanya mengenal `'id'` vs `'th'` — sehingga user `'en'`, `'ja'`, `'ms'`, `'vi'`, `'fil'`, `'km'`, `'ru'` dipaksa menerima penjelasan grammar Bahasa Indonesia.

PR ini mengeksekusi **Fase 1** secara penuh untuk menegakkan **English-First Golden Pivot Architecture** dengan tetap menjaga pengalaman Bahasa Indonesia (`id`) dan Thai (`th`) yang sudah stabil serta pengecualian nasional Kurikulum Merdeka (`misi.html`, `kurikulum.html`, `sekolah.*`).

---

## 2. Three-Phase English-First Migration Roadmap (Next / Roadmap)

### Phase 1 — Foundation, Core Pedagogy Pivot, Voice Studio & Catalog Purification (**Delivered in `m025-805`**)
- **Governance**: Penambahan **§19 English-First Code, Fallbacks & Multi-Locale Content Architecture** di `AGENTS.md`.
- **`app.js` Grammar & Writing English-First Pivot**:
  - Menyimpan field Inggris kanonis (`enWhyFails`, `enMisconception`, `enWhyCorrect`, dsb.) di `load()`, menambahkan `grammarItemForEn(item)`, dan menghubungkannya di `applyContentLocale()` untuk seluruh bahasa selain `id` & `th`.
  - Memperbarui `grammarReasonForLearner()` agar penjelasan bahasa Inggris pada `en`/`ja`/`ms`/`vi`/`fil`/`km`/`ru` tampil utuh (tidak ditolak oleh filter `tutorIndonesian`).
  - Memetakan `WRITING_BANK` rubric `labelEn`, seluruh 45 prompt `focusEn`, serta `examTasks` (`noteEn` / `labelEn`) di `writing-prompts-v1.json` dan prompt AI `requestWritingFeedback` untuk penutur non-ID.
- **UI Chrome & Module Cleanup**:
  - Membungkus pill topbar (`topbar.tag-*`), judul view (`view.*`), header PTE/Story N5, `SKILL INTI TES`, `Start writing here…`, `aria-label="Tutup"`, `Bantuan mochi`, `features/grammar/grammar-vocab-bridge.js`, serta menurunkan kebocoran UI Thai `features/mandarin/mandarin-ui.js` dari 16 -> **0** (melokalkan step player, Pinyin Tones, Strokes/Radicals, Sandhi, 24 Can-Do scenarios, serta `enMeaning` di HSK Vocab Explorer).
  - Melengkapi `features/japanese/fiezel-story-reader.js` dengan `STORY_COPY_EN`, `descriptions`/`STORY_SCENE_I18N` (3 cerita × 5 adegan EN+TH penuh), kategori `story.cat-teknologi`, serta `WORD_GLOSS_I18N` (35 glosa kata).
  - Memperbaiki `features/undercover/fiezel-undercover-ui.js` (`resolveLocale()` & `boot()`) agar menerima & memuat `locales/en` + `locales/<loc>` untuk **semua 9 bahasa**, bukan hanya `'th'`.
- **AI Voice Studio (`features/voice-studio/`) 9-Locale Expansion**:
  - Memperluas `src/lib/i18n.ts` ke 9 bahasa penuh dengan **English Golden Pivot** (`COPY[locale] ?? COPY.en`), menghapus fallback Indonesian hardcoded di `whiteboardDirector.ts`, `App.tsx` (termasuk tab History, tab Braincore, bar input bawah, dan modal konfirmasi Gem), `BeginnerAnswerAssistant.tsx`, `HomeRedesignView.tsx`, dan `liveTransport.ts` (sambil mempertahankan anchor string `tests/voice-studio-ui-architecture-test.js`), serta mem-build ulang `dist/voice-studio.js`.
- **36-Catalog Purification (`features/i18n/locales/{9}/{ui,quiz,grammar,vocab}.json`)**:
  - Menghapus seluruh sisa `"PAW"` menjadi `"Mochi"` (termasuk di `copy-id-*`, `copy-th-*`, `locales/*`).
  - Membersihkan seluruh kunci gado-gado Inggris-bercampur, kebocoran Inggris di `fil` & Indonesia di `ms`, perbaikan `chat_misc_went_*` di `en`, serta perbaikan salah kaprah semantik (`can` / `is/are` / kanji `聴解・会話・冠詞` / `Skip`).
- **New Automated CI Gate**: `tests/i18n-english-first-and-purity-test.js` terdaftar di `.github/workflows/quality.yml`.

### Phase 2 — Content Dataset Sidecars & Protected Auth/Onboarding Scope (**Next**)
- `[ALLOW-PROTECTED: auth, onboarding]`: Audit & pembersihan string cadangan di `features/auth/fiezel-auth-screen.js`, `features/onboarding/`, dan pesan `authGateNeeded` di `app.js` dengan English fallback bersih.
- Membangun sidecar multi-bahasa penuh (`locales/{en,vi,ms,fil,ja,km,ru}`) untuk dataset konten:
  - `vocabulary-master.json` makna kata & contoh kalimat (saat ini hanya `id` + `vocabulary-th.json`).
  - `reading-exam-v1.json` / `reading-bank.json` A1/A2 passages & rasional jawaban.
  - `writing-prompts-v1.json` prompt instructions & deskripsi rubrik multi-bahasa.
  - `features/mandarin/mandarin-curriculum.js` & `features/japanese/fiezel-story-reader.js` naskah cerita/dialog berbahasa sumber Inggris.
  - Ekspansi terjemahan penuh `VOICE_PERSONAS` & `CALL_SCENARIOS` di `features/voice-studio/src/data/callScenarios.ts` menggunakan peta terjemahan `*En` / multi-locale.

### Phase 3 — Structural Snapshot Decoupling & Backend Localization (**Next**)
- Refactor bertahap `tests/id-golden-snapshot-test.js` agar menguji **rendered DOM & copy-id contracts** alih-alih melarang penghapusan string literal Indonesia dari `app.js`, sehingga string `app.js` 100% bebas hardcoded Indonesia.
- Pembaruan `workers/api/ai/ai-tasks.js` (`locale` prompt parameter dari hanya `id`/`th` ke seluruh 9 bahasa agar jawaban LLM & subtitle realtime menyesuaikan bahasa antarmuka user secara presisi).

---

## 3. Empirical Verification & Quality Gates

- Empirical Chromium Playwright probe (`totalChecks: 19, failures: []`, exit 0) across `en`, `th`, `ja`, `ms`, `vi`, `ru` on Grammar Hub/Quiz, Writing, Story N5 (Library + Scenes 0–4), Mandarin Modals (Pinyin, Can-Do, HSK Vocab), `call.html` (Call, History, Home Scenarios across `en`, `th`, `ja`, `ru`), and `undercover.html` (`en`, `ja`).
- Local test gates verified passing cleanly on release commit: `i18n-global-purity-test.js`, `i18n-english-first-and-purity-test.js`, `i18n-kunci-hantu-test.js`, `i18n-fallback-wrapper-test.js`, `i18n-leak-guard-test.js`, `i18n-param-collision-test.js`, `th-ui-leak-test.js`, `th-coverage-test.js`, `th-bank-purity-test.js`, `th-content-overlay-test.js`, `id-golden-snapshot-test.js`, `teacher-i18n-lazy-test.js`, `voice-studio-ui-architecture-test.js`, `critical-surface-protection-test.js`, `collateral-scope-guard-test.js`, `precache-covers-shell-test.js`, `locale-enum-test.js`, `story-reader-integration-test.js`, `mochi-voice-sos-test.js`, `undercover-game-test.js`, `writing-rubric-test.js`, `curriculum-cache-version-test.js`, `gate-registry-test.js`.
