# FIEZEL HANDOFF DOSSIER: M025-482 (ORCHESTRATED RUMUS KILAT SYNC)

**Tanggal:** 2026-10-05
**Build Target:** `m025-482`
**Status CI Gate:** 100% PASS (352/352 Gerbang Mutu Lokal Lolos)
**Tipe Rilis:** `feat(grammar)`

---

## 1. Ringkasan & Alasan Perubahan
Siswa SMP menyampaikan keluhan bahwa penjelasan tata bahasa (grammar explanation) di FIEZEL sering kali ambigu, terlalu kaku menggunakan jargon teoretis ("klausa", "partisip", "tercacah"), serta tidak menjejerkan perbedaan konsep secara langsung. Selain itu, ada bug rendering di antarmuka kuis di mana tag format HTML belum di-unescape secara aman, dan perubahan pada database JSON berisiko tertimpa kembali jika tidak disinkronkan ke berkas sumber asli Python di `tools/dev/grammar-authoring/sources/`.

Pengguna menginstruksikan penggunaan orkestrasi multi-subagent terstruktur dan terkoordinasi untuk memperbarui seluruh materi grammar, mengamankan seluruh cetak biru (*backup* rapi di Desktop `C:\Users\hp\Desktop\FIEZEL_BANKS_TEMPLATES_BACKUP`), menyinkronkan berkas Python sumber, dan memastikan **NOL ERROR**.

---

## 2. Struktur Tim Orkestrasi Subagent
Pekerjaan didelegasikan ke 5 Subagent terspesialisasi:
1. **Subagent 1 (Batch 1 & 2 Specialist - Fundamentals, Modals & Conditionals)**:
   - Menghasilkan `batch-1-updates.json` (Fondasi A1: Have got vs have, Past simple, Present simple vs continuous, There is/are, Was/were, Future plans, dll).
   - Menghasilkan `batch-2-updates.json` (12 materi: Conditionals Type 0/1/2/3, Deduction *must have/can't have*, *Unless*, *Should have*, dll).
2. **Subagent 2 (Batch 3 Specialist - Nouns, Articles & Quantifiers)**:
   - Menghasilkan `batch-3-updates.json` (10 materi: *A/An vs The*, *Zero article*, *Much vs Many*, *Possessive 's*, *Reflexive pronouns*, dll).
3. **Subagent 3 (Python Bridge Engineer)**:
   - Membangun `tools/dev/grammar-authoring/sync_rumus_kilat.py` yang memanfaatkan AST byte-level slicing untuk memperbarui teks bahasa Indonesia di `sources/*.py` secara presisi tanpa merusak tuple `(en, id, th)` atau aksara Thai/UTF-8.
4. **Subagent 4 (Batch 4 Specialist - Prepositions, Gerunds & Connectors)**:
   - Menghasilkan `batch-4-updates.json` (18 materi: *In/On/At waktu & tempat*, *Gerund vs Infinitive*, *Although vs Despite*, *Because vs So*, preposisi terikat kata benda/sifat/kerja, dll).
5. **Subagent 5 (Batch 5 Specialist - Advanced Structures)**:
   - Menghasilkan `batch-5-updates.json` (25 materi: *Passive voice*, *Modal passive*, *Passive with two objects*, *Relative clauses who/which/whose*, *Reported speech statements/questions/commands*, 6 jenis inversi spesifik terpisah, dll).

---

## 3. Integrasi & Hasil Sinkronisasi (Penyelesaian Temuan Audit P0, P1, P2, P3)
1. **Penyelesaian Temuan P0 (Sinkronisasi Dua Arah & UI Runtime)**:
   - Memperbaiki `tools/merge-grammar-batches.js`:
     - Menulis aturan baru langsung ke `t.explanation.ruleId` di `grammar-templates.json` (field resmi yang dibaca runtime `app.js:698 grammarMeta()`).
     - Menghapus field mati `t.ruleId` di level teratas template.
     - Menulis aturan ke `grammar-explanations-id.json` melalui pemetaan id template yang valid.
     - Menjalankan sinkronisasi dua arah resmi: `node tools/sync-grammar-explanations-id.js --write` dan `node audit/merge-grammar-id.js`.
     - Hasil: 512/512 template tersinkronisasi 100%, gerbang Wave F2 `tests/content-drift-test.js` PASS.
2. **Penyelesaian Temuan P1 (Diferensiasi Konten Spesifik Inversi & Pasif)**:
   - Mengganti teks duplikat generik inversi dengan penjelasan spesifik untuk tiap struktur:
     - `conditional_inversion_were_i_to` (*Were I to...*)
     - `formal_inversion_had_i_known` (*Had I known...*)
     - `no_sooner_hardly_inversion_paired_correlatives` (*No sooner... than* vs *Hardly... when*)
     - `inversion_after_only_restrictive_phrase` (*Only after / Only when*)
     - `negative_adverbial_inversion_never_rarely_not_only` (*Never / Rarely / Seldom*)
     - `passive_with_two_objects_verb_give_send_choice_of_subject` (aturan objek ganda dengan 'to')
     - Membedakan preposisi terikat kata benda (`reason for`, `solution to`), kata sifat (`good at`, `interested in`), dan kata kerja (`listen to`, `wait for`).
3. **Penyelesaian Temuan P2 (Determinisme Cloze Bank & PWA Precache)**:
   - Memperbarui `cloze-explains-v1.json` dari sumber template dan meregenerasi `cloze-bank-v1.json` secara deterministik menggunakan `node tools/build-cloze-bank.js --write`.
   - Membersihkan entri aset tidak ada di `sw.js` precache (`fiezel-bicara-privat.js`, `fiezel-kelas-tanpa-hp.js`, `fiezel-rapor-kktp.js`, `fiezel-analisis-butir.js`, `copy-id-sekolah.js`).
   - Hasil: `tests/cloze-bank-test.js` dan `tests/deploy-site-gate-test.js` (32/32 assert) 100% PASS.
4. **Penyelesaian Temuan P3 (Rendering HTML Aman & Baseline Emas)**:
   - Memasang `formatRuleForDisplay(esc(rule))` pada `app.js:13282` dan `features/grammar/fiezel-grammar-upgrade.js:542` serta mengekspos fungsi ke `self.formatRuleForDisplay`.
   - Memperbarui `id-golden-baseline.json` melalui `node tests/id-golden-snapshot-test.js --write-baseline` agar selaras dengan materi baru.

---

## 4. Bukti Verifikasi Mutu Empiris
1. `tests/cloze-bank-test.js` -> **PASS (10/10 assert, byte deterministik identik)**
2. `tests/content-drift-test.js` -> **PASS (512 template sinkron dua arah)**
3. `tests/grammar-lesson-rule-test.js` -> **PASS (8/8 assert, 276 aturan berbeda > 50%)**
4. `tests/deploy-site-gate-test.js` -> **PASS (32/32 assert)**
5. `tests/id-golden-snapshot-test.js` -> **PASS (HIJAU, 13 berkas terkunci identik)**
6. `tests/th-ui-leak-test.js` -> **PASS (3767 kunci id/th selaras)**
7. `tests/curriculum-cache-version-test.js` -> **PASS (m025-482)**
8. `tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail, 352 gerbang terdaftar)**
9. `tests/test_sync_rumus_kilat.py` -> **PASS (4/4 tests OK)**
10. `tools/dev/grammar-authoring/sync_rumus_kilat.py --verify-all` -> **PASS (7/7 berkas Python OK)**
11. Hexa-Sync Invariant (`tools/bump-build.mjs --check`) -> **SELARAS (m025-482)**

---

## 5. Berkas yang Disentuh
- `app.js`
- `cloze-bank-v1.json`
- `cloze-explains-v1.json`
- `grammar-templates.json`
- `grammar-explanations-id.json`
- `id-golden-baseline.json`
- `reports/th-ui-leak-report.json`
- `features/grammar/fiezel-grammar-upgrade.js`
- `tools/dev/grammar-authoring/sources/a1_part1.py`
- `tools/dev/grammar-authoring/sources/a1_part2.py`
- `tools/dev/grammar-authoring/sources/a1_part3.py`
- `tools/dev/grammar-authoring/sources/a2_part1.py`
- `tools/dev/grammar-authoring/sources/a2_part4.py`
- `tools/dev/grammar-authoring/sync_rumus_kilat.py`
- `tools/merge-grammar-batches.js`
- `batch-1-updates.json`
- `batch-2-updates.json`
- `batch-3-updates.json`
- `batch-4-updates.json`
- `batch-5-updates.json`
- `docs/handoffs/FIEZEL-M025482-GRAMMAR-ORCHESTRATED-SYNC-HANDOFF.md`
