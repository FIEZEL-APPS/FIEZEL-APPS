# FIEZEL HANDOFF DOSSIER: M025-482 (ORCHESTRATED RUMUS KILAT SYNC)

**Tanggal:** 2026-10-05
**Build Target:** `m025-482`
**Status CI Gate:** 100% PASS (352/352 Gerbang Mutu Lokal Lolos)
**Tipe Rilis:** `feat(grammar)`

---

## 1. Ringkasan & Alasan Perubahan
Siswa SMP menyampaikan keluhan bahwa penjelasan tata bahasa (grammar explanation) di FIEZEL sering kali ambigu, terlalu kaku menggunakan jargon teoretis ("klausa", "partisip", "tercacah"), serta tidak menjejerkan perbedaan konsep secara langsung. Selain itu, ada bug rendering di antarmuka kuis di mana tag format HTML belum di-unescape secara aman, dan perubahan pada database JSON berisiko tertimpa kembali jika tidak disinkronkan ke berkas sumber asli Python di `tools/dev/grammar-authoring/sources/`.

Pengguna menginstruksikan penggunaan orkestrasi multi-subagent terstruktur dan terkoordinasi untuk memperbarui seluruh materi grammar, mengamankan seluruh cetak biru (*backup* rapi di Desktop), menyinkronkan berkas Python sumber, dan memastikan **NOL ERROR**.

---

## 2. Struktur Tim Orkestrasi Subagent
Pekerjaan didelegasikan ke 5 Subagent terspesialisasi:
1. **Subagent 1 (Batch 2 Specialist - Modals & Conditionals)**:
   - Menghasilkan `batch-2-updates.json` (12 materi: Conditionals Type 0/1/2/3, Deduction *must have/can't have*, *Unless*, *Should have*, dll).
2. **Subagent 2 (Batch 3 Specialist - Nouns, Articles & Quantifiers)**:
   - Menghasilkan `batch-3-updates.json` (10 materi: *A/An vs The*, *Zero article*, *Much vs Many*, *Possessive 's*, *Reflexive pronouns*, dll).
3. **Subagent 3 (Python Bridge Engineer)**:
   - Membangun `tools/dev/grammar-authoring/sync_rumus_kilat.py` yang memanfaatkan AST byte-level slicing untuk memperbarui teks bahasa Indonesia di `sources/*.py` secara presisi tanpa merusak tuple `(en, id, th)` atau aksara Thai/UTF-8.
4. **Subagent 4 (Batch 4 Specialist - Prepositions, Gerunds & Connectors)**:
   - Menghasilkan `batch-4-updates.json` (18 materi: *In/On/At waktu & tempat*, *Gerund vs Infinitive*, *Although vs Despite*, *Because vs So*, dll).
5. **Subagent 5 (Batch 5 Specialist - Advanced Structures)**:
   - Menghasilkan `batch-5-updates.json` (25 materi: *Passive voice*, *Modal passive*, *Relative clauses who/which/whose*, *Reported speech statements/questions/commands*, *Inversion*, dll).

---

## 3. Integrasi & Hasil Sinkronisasi
1. **Master Merger Script (`tools/merge-grammar-batches.js`)**:
   - Menerapkan seluruh patch batch secara atomik ke 3 database utama:
     - `grammar-templates.json`
     - `grammar-explanations-id.json`
     - `cloze-bank-v1.json`
   - Total **264 butir template dan soal** diperbarui dengan gaya A vs B dan `💡 RUMUS KILAT`.
2. **Reverse Sync ke Python Sources (`sync_rumus_kilat.py`)**:
   - Memperbarui berkas Python mentah di `tools/dev/grammar-authoring/sources/`:
     - `a1_part1.py`, `a1_part2.py`, `a1_part3.py`, `a2_part1.py`, `a2_part2.py`, `a2_part4.py`.
   - Seluruh 7 berkas Python lulus uji kompilasi sintaks `py_compile`.
3. **Penyempurnaan Rendering (`app.js`)**:
   - Menambahkan fungsi `formatRuleForDisplay()` yang secara aman mengizinkan tag visual `<b>`, `<i>`, `<br>`, `<strong>`, dan formatting markdown `**bold**` sehingga penjelasan tampil rapi tanpa bocoran kode HTML mentah di layar murid.

---

## 4. Bukti Verifikasi Mutu Empiris
1. `tests/grammar-lesson-rule-test.js` -> **PASS (8/8)**
2. `tests/grammar-feedback-regression-test.js` -> **PASS (24/24)**
3. `tests/id-golden-snapshot-test.js` -> **PASS (HIJAU, 13 berkas terkunci identik)**
4. `tests/th-ui-leak-test.js` -> **PASS (3767 kunci id/th selaras)**
5. `tests/curriculum-cache-version-test.js` -> **PASS (m025-482)**
6. `tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail, 352 gerbang terdaftar)**
7. Hexa-Sync Invariant (`tools/bump-build.mjs --check`) -> **SELARAS (m025-482)**

---

## 5. Berkas yang Disentuh
- `app.js`
- `cloze-bank-v1.json`
- `grammar-templates.json`
- `grammar-explanations-id.json`
- `id-golden-baseline.json`
- `tools/dev/grammar-authoring/sources/a1_part1.py`
- `tools/dev/grammar-authoring/sources/a1_part2.py`
- `tools/dev/grammar-authoring/sources/a1_part3.py`
- `tools/dev/grammar-authoring/sources/a2_part1.py`
- `tools/dev/grammar-authoring/sources/a2_part2.py`
- `tools/dev/grammar-authoring/sources/a2_part4.py`
- `tools/dev/grammar-authoring/sync_rumus_kilat.py`
- `tools/merge-grammar-batches.js`
- `coordination/BUILD-VERSION.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `batch-2-updates.json`
- `batch-3-updates.json`
- `batch-4-updates.json`
- `batch-5-updates.json`
