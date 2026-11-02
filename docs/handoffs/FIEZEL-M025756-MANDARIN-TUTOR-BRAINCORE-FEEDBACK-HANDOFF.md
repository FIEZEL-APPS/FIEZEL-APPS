# FIEZEL HANDOFF DOSSIER: MANDARIN TUTOR BRAINCORE FEEDBACK ALIGNMENT & PINYIN RUBY ENGINE

**Tanggal**: 2026-11-03
**Nomor Build**: `m025-756`
**Cabang**: `feat/mandarin-m025-748` (Pull Request #818)
**Tujuan Penyerahan**: Master Staging Arbiter & Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`) & Antigravity Architect (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`)
**Status Mutu**: 100% HIJAU (Semua Gerbang Lokal Lulus)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Evaluasi Pengguna & Mandat Utama
User menyampaikan komplain kritis terkait ekosistem pembelajaran bahasa Mandarin:
Pada kursus bahasa Inggris dan bahasa Jepang, feedback pembelajaran, miskonsepsi, tuntunan langkah Step Tutor, dan avatar karakter Tutor FIEZEL sudah bekerja sangat baik. Namun pada sesi latihan dan grammar Mandarin, feedback spesifik dan karakter tutor tersebut belum muncul selaras dengan kursus Jepang dan Inggris.

### B. Analisis Akar Masalah Teknis (Root Cause)
1. **Ketidakcocokan Skema Distraktor Template**:
   Pada `app.js:6633` dan `app.js:6641`, `G.templates` dihidrasi menggunakan:
   `const d=(t.distractors||[]).find(x=>String(x.option)===String(o));`
   Template lama Mandarin tidak menyertakan medan `option` berbasis string persis, melainkan `index`, sehingga pencarian selalu menghasilkan `undefined`. Hal ini menyebabkan `reasons` jatuh ke fallback umum, peta miskonsepsi `item[15]` kosong, dan `tutorWhyFails(q, resolvedUserPick)` mengembalikan string kosong.
2. **Ketiadaan Hidrasi Bank Mandarin di `load()`**:
   Di `app.js:6541`, hanya ada cabang `if(activeTargetLang()==='ja')` tanpa cabang `activeTargetLang()==='zh'`. Hal ini menyebabkan bank konten Mandarin tidak pernah terhidrasi ke `G`, `V`, `R`, `WRITING_BANK`, maupun kurikulum graph Core Brain.
3. **Ketiadaan Step Tutor Triples**:
   Template Mandarin sebelumnya tidak membawa `pedagogicalObjectiveId`, `misconceptionTargetedId`, dan `reasoningOperationId` (berformat `->`), sehingga `stepTutorGuidance` tidak dapat menghasilkan 3 langkah tuntunan logis saat murid salah menjawab.

---

## 2. Solusi Teknis & Arsitektur Implementasi

1. **Sinkronisasi 1:1 Skema Distraktor & Penjelasan (`features/mandarin/mandarin-grammar-bank.js`)**:
   - Menghasilkan 192 template grammar lengkap (`ZH-GR-001` .. `ZH-GR-192`) yang dipetakan 1-ke-1 ke 192 bab kurikulum.
   - Setiap template memiliki 4 pilihan opsi (`options`), `correctIndex`, dan tepat 3 `distractors` dengan medan `option` string yang cocok persis dengan opsi yang salah.
   - Setiap distraktor dilengkapi `whyFails`, `whyFailsId`, `misconception`, dan `misconceptionId`.
   - Objek `explanation` dilengkapi seluruh alias wajib: `rule`, `ruleId`, `why`, `whyCorrect`, `whyCorrectId`, `memory`, `avoid`, `whyOthersFail`, `whyOthersFailId`.
   - Membawa Step Tutor Triples: `pedagogicalObjectiveId`, `misconceptionTargetedId`, dan `reasoningOperationId` dengan format 3-langkah logis berpemisah `->`.

2. **Kompilasi Bank Konten Kanonikal (`content/zh/`)**:
   - `content/zh/grammar-templates-zh.json`: 192 template pilihan ganda terstruktur.
   - `content/zh/family-graph-zh.json`: Graf dependensi 12 keluarga gramatika Mandarin.
   - `content/zh/vocabulary-master-zh.json`: 2.194 kosakata HSK 1–6 lengkap ternormalisasi untuk `V` di `app.js`.

3. **Integrasi Hidrasi Kursus Mandarin di `app.js`**:
   - Menambahkan cabang `else if(activeTargetLang()==='zh')` di `load()` untuk memuat `zhBank`, `zhGraph`, `zhVocab`, `zhRead`, dan `zhWrite`.
   - Mengisi `G`, `V`, `R`, `WRITING_BANK`, `GRAMMAR_ITEMS`, dan mengindeks kurikulum ke `GRAMMAR_CURRICULUM_INDEX` serta `FiezelCoreBrain.setFamilyGraph` & `setCurriculumGraph`.
   - Menambahkan fungsi `zhCourseOn()` dan `zhTogglesMarkup()`.
   - Menyelaraskan `displayLevel()` untuk menyajikan label HSK (`HSK 1` .. `HSK 6`) pada mode Mandarin.
   - Mengaktifkan kelas `fz-lang-zh` pada `document.body` dan memanggil `FiezelMandarinPinyinEngine.applyDisplayPrefs()` pada setiap render.

4. **Integrasi Mesin Anotasi Pinyin Ruby Otomatis & Toggle Display (`features/mandarin/mandarin-pinyin-engine.js`)**:
   - Menyediakan anotasi leksikon otomatis ke `<ruby class="zh-ruby">字<rt class="zh-rt">zì</rt></ruby>`.
   - Mendukung format 3-baris Kawan Bicara Xiao Mochi (Hanzi, Pinyin, Bahasa Indonesia).
   - Sakelar global zero-layout shift via CSS `body.fz-zh-no-pinyin rt.zh-rt { display: none !important; }`.

5. **Penyelarasan Interaktif Kuis di 5-Step Lesson Player (`features/mandarin/mandarin-ui.js`)**:
   - Memperbarui Step 4 (Kuis) dengan deteksi distraktor presisi, menampilkan kotak Tutor FIEZEL, pola miskonsepsi, dan 3 langkah tuntunan logis Step Tutor.

---

## 3. Daftar Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `features/mandarin/mandarin-grammar-bank.js` | 192 template grammar dengan skema distraktor presisi dan Step Tutor triples |
| `features/mandarin/mandarin-curriculum.js` | Penyelarasan kuis di 192 pelajaran dengan bank template dan distraktor nyata |
| `features/mandarin/mandarin-pinyin-engine.js` | Mesin anotasi Pinyin ruby, format 3-baris, dan toggle display |
| `features/mandarin/mandarin-ui.js` | Integrasi toggle Pinyin, feedback Tutor FIEZEL & Step Tutor pada Step 4 |
| `features/mandarin/mandarin.css` | Token tipografi ruby, zero-layout shift pinyin display, dan three-line CSS |
| `content/zh/grammar-templates-zh.json` | 192 template grammar Mandarin kanonikal |
| `content/zh/family-graph-zh.json` | Graf keluarga gramatika Mandarin untuk Braincore |
| `content/zh/vocabulary-master-zh.json` | 2.194 kosakata HSK lengkap untuk hidrasi `V` |
| `app.js` | Hidrasi bank Mandarin di `load()`, `zhCourseOn()`, `displayLevel()`, dan render styling |
| `index.html` | Penambahan script defer `mandarin-pinyin-engine.js` dan `mandarin-ui.js` |
| `sw.js` | Penambahan aset Mandarin ke precache shell, bump build ke `m025-756` |
| `coordination/BUILD-VERSION.json` | Bump build ke `m025-756` |
| `id-golden-baseline.json` | Pembaruan snapshot emas literal Indonesia |
| `tests/mandarin-tutor-braincore-feedback-test.js` | Uji mutu verifikasi 1:1 Tutor Character & Braincore feedback |
| `tests/mandarin-pinyin-ruby-test.js` | Uji mutu mesin anotasi pinyin ruby dan toggle display |
| `tools/mandarin-ingestion/build-mandarin-grammar-suite.mjs` | Generator kompilasi bank grammar, graph, dan vocab Mandarin |
| `tools/mandarin-ingestion/align-curriculum-quizzes.mjs` | Penyelaras kuis kurikulum dengan bank template |

---

## 4. Status Kelulusan Gerbang Mutu Lokal

Seluruh rangkaian pengujian gerbang mutu resmi dijalankan dan lulus 100%:
- `node tests/mandarin-blueprint-integrity-test.js`: **PASS (8/8 Pilar Lulus)**
- `node tests/mandarin-tutor-braincore-feedback-test.js`: **PASS (6/6 Pilar Lulus)**
- `node tests/mandarin-pinyin-ruby-test.js`: **PASS (4/4 Pilar Lulus)**
- `node tests/th-ui-leak-test.js`: **PASS (0 UI Leaks)**
- `node tests/id-golden-snapshot-test.js`: **HIJAU (Baseline Emas Utuh)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 Penegasan, Build m025-756 Selaras)**
- `node tests/gate-registry-test.js`: **PASS (10/10 Lulus)**
- `node tools/bump-build.mjs --check`: **Selaras (6 Titik Sinkron)**
