# FIEZEL — Grammar Quality Upgrade A1–B2 (Braincore)

Status: **DONE — semua gerbang grammar/konten/i18n hijau**
Build: `m025-255` (sw.js, core-config.js, fiezel-diag-panel.js, coordination/BUILD-VERSION.json)

## Prinsip

> Make the grammar challenging, not the reading.

Setiap soal A1–B2 dibuat pendek, natural, dan fokus pada SATU target grammar. Kesulitan
naik lewat pilihan bentuk (tense, modal, artikel, urutan kata), bukan lewat kalimat panjang,
vocabulary sulit, atau instruksi akademik ("Which completion expresses the strongest...").

## Apa yang berubah

| Area | Sebelum | Sesudah |
|---|---:|---:|
| Template grammar total | 249 | **282** (+33, semua A1–B2) |
| Lesson A1–B2 dengan satu template saja | 73 | 40 |
| Rata-rata panjang stem A2 | 13.5 kata | **11.0** |
| Rata-rata panjang stem B1 | 15.1 kata | **12.7** |
| Rata-rata panjang stem B2 | 16.6 kata | **13.8** |
| Stem bernada meta/akademik ("Which completion shows…", "Apply conventional backshift…") | 24 | **2** (keduanya soal "pilih kalimat yang benar", bukan instruksi akademik) |
| Soal runtime (25 mode × lesson) | 6.225 | **7.050** |

### 1. Penyederhanaan 61 stem (ID, opsi, kunci, distraktor TETAP)
Sumber: `tools/grammar-upgrade/stem-rewrites.json`. Pola perbaikan:
- Instruksi meta panjang diganti konteks natural + isyarat singkat dalam kurung bila perlu
  (`(you are sure)`, `(strong warning)`, `(informal)`, `(criticism)`).
- Konteks bertele-tele dipangkas; frasa kunci yang dikutip penjelasan (mis. *"right now"*,
  *"so far this week"*, *"until Saturday"*) dipertahankan supaya explanation en/id/th tetap sinkron.
- Tiga stem yang punya distraktor "sah tapi kurang tepat" (PA-001, b4_005, MO-015) tetap
  memuat pembatas eksplisit sesuai kontrak audit (`most formal`, dsb.).

### 2. 33 template baru = template KEDUA untuk lesson yang monoton
Sumber: `tools/grammar-upgrade/new-templates-a.json` (A1 4 + A2 15) dan
`new-templates-b.json` (B1 8 + B2 6). Setiap template lengkap tri-bahasa:
- Inggris: objective, misconception, reasoning, stem, 4 opsi, 3 distraktor berlabel, explanation.
- Indonesia (field `…Id`): gaya santai konsisten dengan bank, bebas istilah internal (gerbang m025-160).
- Thai: entri penuh di `grammar-explanations-th.json` (8 bidang + distraktor, kunci = teks opsi persis).

Runtime otomatis merotasi template saudara antar 25 mode latihan (`buildGrammarLessonQuestions`),
jadi satu lesson tidak lagi memutar satu kalimat yang sama 25 kali.

Lesson yang mendapat template kedua:
A1 — present simple, can, past simple regular, present continuous.
A2 — imperative, adverb frekuensi, possessive 's, would like, enjoy + -ing, present perfect
ever/never & for/since, better/worse, -er vs more, adverb -ly vs adjective, how much/many,
because/so, state verbs, double negative, the + ordinal/superlative.
B1 — second conditional, question tag, past perfect, reported wh-question, indirect question,
wish + could, already/yet, each other.
B2 — third conditional, modal passive, causative have, whose, although/despite, so/such.

### 3. Perbaikan runtime kecil (`app.js`)
`grammarPeerBlocked()` kini otomatis memblokir template saudara satu lesson (subskill sama) dari
kolam pinjaman meta. Tanpa ini, rule/cue template kedua dipinjam sebagai "penjelasan lesson
lain" untuk lesson yang sama — dan gerbang provenance merah.

## Rantai turunan yang diregenerasi (semua lewat alat resmi)
```
node tools/apply-grammar-upgrade.js
node tools/sync-grammar-explanations-id.js --write
node tools/build-misconception-taxonomy.js --write     # +19 OVERRIDES label baru
node tools/generate-th-misconception.js                # features/i18n/misconception-th.json
node audit/merge-grammar-id.js
node tools/build-cloze-bank.js --write                 # 210 -> 241 butir cloze
node tools/generate-th-cloze.js                        # features/i18n/cloze-bank-th.json
node id-golden-snapshot-test.js --write-baseline
node tools/bump-build.mjs "..."
```
Berkas data yang berubah: grammar-templates.json, grammar-explanations-id.json,
grammar-explanations-th.json, grammar-misconception-id.json (644 → 679 diagnosis),
misconception-taxonomy-v1.json, cloze-bank-v1.json, features/i18n/{cloze-bank-th,misconception-th}.json,
tools/th-strings/{cloze,misconception-diagnosis}.json, id-golden-baseline.json.

Skema, ID template lama, `grammar-curriculum-v1.json` (139 lesson, sequence, prerequisites,
templateId) TIDAK berubah.

## Verifikasi
Hijau: grammar-quality-audit (7.050/7.050 soal, 25 mode × 282, provenance, jargon A1–A2),
grammar-curriculum-test, level-grammar-contract-test, grammar-unlock-test, grammar-memory-scope-test,
content-integrity-audit, content-integrity-gate-test, bank-soal-audit-test, content-drift-test,
misconception-diagnosis-test, misconception-taxonomy-test, cloze-bank-test, th-coverage-test,
th-bank-purity-test, tools/scan-th-bank-leak.js, grammar-provenance-verify, id-golden-snapshot-test,
regression-test, placement-accuracy-test, level-guard-test, install-health-test,
pwa-release-coherence-test, build-number-uniqueness-test, step-tutor-test, fiezel-evolution-loop-test,
content-adoption-test, dan `python3 release-audit.py` (703/705 PASS — 2 FAIL pra-eksis gerbang vendor/kokoro).
Log: `test_reports/grammar-upgrade/`.

Pra-eksis (bukan dampak perubahan ini): `e2e-level-grammar-test.js` butuh `WebSocket` global
(Node ≥ 22 / browser) — gagal identik pada checkout bersih di lingkungan ini.

---

## Gelombang 2 (build m025-256)

### 1. Template kedua untuk 40 lesson A1–B2 yang masih tunggal → **semua 139 lesson A1–B2 kini ≥ 2 template**
Sumber: `tools/grammar-upgrade/new-templates-{c,d,e}.json` (A2 2, B1 21, B2 17; termasuk 5 soal
`error_correction`). Total template 282 → **322**; soal runtime 7.050 → **8.050**; cloze 241 → 273 butir.
Label miskonsepsi memakai shorthand `@sibling:N` (label distraktor ke-N template pertama lesson yang
sama) — diselesaikan oleh `tools/apply-grammar-upgrade.js`, sehingga taksonomi/diagnosis id+th tidak
bertambah dan tiap lesson tetap menargetkan miskonsepsi yang sama dari dua kalimat berbeda.

Pelajaran teknis yang ditemukan dan dipatuhi:
- `contentLanguageFrame()` menilai KERANGKA bahasa opsi (kutipan diabaikan). Field Indonesia yang
  isinya contoh Inggris polos (mis. `None of them, both of us.`) dianggap Inggris dan membuat mode
  `recall_memory_cue`/`recognize_rule`/`teach_back` ditolak — bukan hanya di lesson-nya sendiri, tetapi
  juga di lesson lain yang meminjamnya (TA-013, CO-013, GI-014). Semua memoryCueId/ruleId baru kini
  berkerangka Indonesia dengan contoh Inggris di dalam tanda kutip.
- `step-tutor` menuntut setiap langkah `reasoningOperation` diawali verba kamus (identify/select/
  apply/…); semua template baru mengikuti itu.

### 2. Explanation A1–A2 diringkas
12 field Indonesia A1–A2 yang > 170 karakter (whyOthersFailId, ruleId, howToAvoidId, whyCorrectId,
satu whyFailsId) dipangkas menjadi 1–3 kalimat pendek tanpa mengubah maknanya; kini **0** field
A1–A2 di atas 170 karakter. Peta Thai cloze diperbarui mengikuti kunci Indonesia yang baru.

### 3. Sesi Kilat (latihan singkat harian)
`app.js`: `buildGrammarQuickQuestions()` + `startGrammarQuickSession()`; tombol
`data-testid="grammar-quick-session-btn"` di `.grammar-hub-tools` halaman Grammar.
- 10 soal dari lesson berbeda di level aktif yang SUDAH terbuka (satu soal per lesson per putaran);
  hanya mode bentuk (`apply_form`, `complete_sentence`, `repair_distractor_*`) supaya cepat dijawab.
- Level yang baru dibuka (satu lesson): sesi tetap jalan dengan 5 soal; < 5 → toast.
- Dicatat sebagai sesi `grammar` biasa → mastery per lesson ikut naik; tidak menyentuh lesson terkunci.
- Copy i18n: `grammar.sesi-kilat`, `grammar.sesi-kilat-belum-cukup` (id + th).

### Verifikasi gelombang 2
Hijau: grammar-quality-audit (8.050/8.050), content-integrity-audit/gate, grammar-provenance-verify,
grammar-memory-scope, curriculum, unlock, level-guard, bank-soal-audit, content-drift, cloze-bank,
misconception-diagnosis/taxonomy, th-coverage, th-bank-purity, scan-th-bank-leak, id-golden, step-tutor,
regression, locale-enum, global-name-collision. Log: `test_reports/grammar-upgrade/`.

---

## Thai penuh (build m025-257)
16 bidang penjelasan grammar yang masih locale-netral (rule CO-203 + 15 memoryCue, termasuk 4 warisan
lama: b5_014, A1-009, A1-013, b6_003) kini diberi aksara Thai dengan contoh Inggris dipertahankan.
`grammar-explanations-th.json`: **0 bidang tanpa aksara Thai** (322 template × 8 bidang + distraktor).
Peta `tools/th-strings/cloze.json` dan `features/i18n/cloze-bank-th.json` mengikuti. Gate th-coverage,
th-bank-purity, scan-th-bank-leak, cloze-bank, content-drift, id-golden, grammar-quality-audit hijau.
