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
