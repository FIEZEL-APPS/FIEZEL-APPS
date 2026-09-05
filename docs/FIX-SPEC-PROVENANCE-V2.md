# FIX-SPEC: Grammar Question Provenance v2 (m025-155)

Repo: /home/user/workspace/FIEZEL-APPS (branch akan dibuat: fix/grammar-provenance-v2)
Bahasa konten: Indonesia. Gaya kode: ikuti gaya padat existing app.js. JANGAN reformat kode lain.

## Konteks cacat (sudah diverifikasi dari kode)
1. Check focus-leak di grammar-quality-audit.js tautologis: q.sourceId/conceptId/lessonSkill distempel dari template yang sama di makeGrammarQuestion (app.js ~L3044), tidak pernah bisa gagal.
2. variant 5 (sequence_reasoning) dan variant 22 (locate_decision_cue) di grammarExercise (app.js ~L387) memakai field 'reasoning' dengan seed hash sama `${own.id}:reasoning` → set opsi & jawaban identik, hanya stem beda.
3. variant 21 (classify_family): distraktor dari GRAMMAR_FAMILY_LABELS global TANPA optionSources → distempel own:true + sourceId lesson (bohong), dan reason jatuh ke grammarOptionReason() heuristik bentuk kata kerja → murid membaca "belum cocok dengan waktu, fungsi, atau susunan yang dibutuhkan kalimat" untuk label keluarga.
4. Fallback generik di grammarAlternativeMeta ber-sourceId:'' → di makeGrammarQuestion mapping `x.src||item[8]` menstempelnya own:true dengan sourceId lesson.
5. Peminjaman lintas level dalam keluarga tak berlabel: optionSources tidak punya sourceLevel.
6. teach_back/mastery_check (v23/24): teks opsi = gabungan 2 field, owner map audit hanya field satuan → tak terverifikasi.
7. buildGrammarLessonQuestions loop variant-major: 25 mode hanya tercapai karena kebetulan 1 template/subskill; tanpa penjaga.

## Kontrak baru (WAJIB dipatuhi semua pihak)

### Entry provenance opsi (bentuk objek)
`{sourceId:string, sourceLevel:string, origin:'own'|'peer'|'taxonomy'|'fallback'}`
- own: konten milik lesson aktif. sourceId boleh '' di exercise; di question final WAJIB = id template lesson.
- peer: dipinjam dari template lain. sourceId WAJIB id template asal (non-kosong, != id lesson), sourceLevel WAJIB cefr template asal.
- taxonomy: label global (GRAMMAR_FAMILY_LABELS). sourceId='taxonomy:family', sourceLevel=''.
- fallback: kalimat filler generik. sourceId='fallback:generic', sourceLevel=''.
- own===true HANYA untuk origin 'own'.

### Perubahan app.js (Subagent A)
A1. grammarAlternativeMeta(item,field,count,opts={}): kembalikan entry `{value,sourceId,sourceLevel:String(x.level||''),origin:'peer'}` (x = elemen GRAMMAR_ITEMS; level ada di x.level). Fallback → `{value,sourceId:'fallback:generic',sourceLevel:'',origin:'fallback'}`. Tambah dukungan opts: `{salt:'', exclude:[]}` — salt ikut seed hash `${own.id}:${field}:${salt}` (kalau salt kosong, seed lama `${own.id}:${field}` HARUS tetap agar v3-v8 deterministik sama), exclude = daftar value (norm) yang dilarang terpilih.
A2. grammarAlternativePairs: entry juga `{value,sourceId,sourceLevel,origin:'peer'}`.
A3. grammarExercise:
   - optionSources sekarang array objek kontrak (atau '' legacy untuk own — lebih baik seragam objek {origin:'own',sourceId:'',sourceLevel:''}).
   - Tambah kanal `optionExplanations` (array string, verbatim per index; '' = tidak ada) pada hasil direct().
   - v22 (locate_decision_cue): panggil grammarAlternativeMeta dengan salt 'cue' DAN exclude = value distraktor v5 (hitung dulu alts v5 dengan seed lama). Ubah stem sedikit agar fokus "petunjuk keputusan pertama". Set opsi v22 TIDAK BOLEH identik dengan v5.
   - v21 (classify_family): wrong label → optionSources origin 'taxonomy', optionExplanations verbatim: `Label “<label>” menunjuk keluarga grammar lain; contoh ini menguji pola keluarga “<familyLabel lesson>”.` Correct → origin 'own'.
   - v23/24: pakai entry pairs baru (sourceLevel ikut).
A4. makeGrammarQuestion:
   - Normalisasi entry optionSources (string legacy '' → own; string non-kosong → peer dengan sourceLevel via lookup GRAMMAR_ITEMS).
   - Urutan pemilihan reason distraktor: (1) optionExplanations verbatim bila ada; (2) origin 'peer' → grammarBorrowedOptionReason; (3) origin 'taxonomy'/'fallback' → reason baru yang jujur (taxonomy: label keluarga lain; fallback: "pernyataan umum yang tidak menjelaskan pola lesson ini"); (4) sisanya grammarOptionReason lama.
   - distractors[].sourceId: own → id template lesson; peer → id asal; taxonomy/fallback → sentinel ('taxonomy:family'/'fallback:generic'), own:false.
   - question.optionSources final: tambahkan sourceLevel dan origin di tiap entry; pertahankan field lama (option, sourceId, sourceSkill, own, lessonSkill, skill, conceptId) agar test lama tak pecah (grammar-memory-scope-test membaca .own dan .sourceSkill).
   - conceptId: ubah `item?.[8]||skill` → `item?.[8]||''` (samakan dengan sourceId).
A5. buildGrammarLessonQuestions: seleksi mode-coverage-first — pass 1: untuk tiap variant 0..24 ambil SATU kartu valid+unik (item bergilir), pass 2: isi sisa slot sampai count dengan kandidat valid+unik lain. Nama fungsi, signature `(skill,count=GRAMMAR_SESSION_SIZE)`, dan perilaku 1-template tetap identik (hasil untuk own.length===1 harus tetap 25 mode distinct). JANGAN merusak regex kontrak di tests/experience-integration-test.js (`function buildGrammarLessonQuestions`, `GRAMMAR_SESSION_SIZE=25`, `count:GRAMMAR_SESSION_SIZE` — cek dulu di mana pola `count:GRAMMAR_SESSION_SIZE` cocok di app.js dan jangan hilangkan).
A6. grammarBorrowedOptionReason: tangani sentinel — sourceId 'fallback:generic'/'taxonomy:family'/kosong tidak boleh mengklaim "pernyataan yang benar untuk lesson X".
A7. Validasi diri: `node --check app.js` lalu jalankan: node tests/grammar-memory-scope-test.js; node tests/grammar-unlock-test.js; node grammar-quality-audit.js; node tests/experience-integration-test.js; node tests/regression-test.js. Semua harus PASS/exit 0 (audit boleh FAIL sementara pada check baru milik Subagent B jika B sudah menulis — koordinasi lewat file, jangan edit file milik B).

### Perubahan audit (Subagent B) — HANYA grammar-quality-audit.js dan content-integrity-audit.js
B1. grammar-quality-audit.js: pertahankan semua check lama KECUALI focusLeak tautologis — ganti dengan validasi provenance level opsi:
   - Tiap question: sourceId===template.id, conceptId===template.id, lessonSkill===subskill (tetap, murah).
   - Tiap entry optionSources: origin wajib salah satu dari 4 nilai; own → sourceId===template.id; peer → sourceId non-kosong, != template.id, resolve ke template nyata, sourceLevel===cefr template asal; taxonomy/fallback → own!==true dan sourceId sentinel.
   - Per lesson: set opsi v5 (sequence_reasoning) != set opsi v22 (locate_decision_cue) (bandingkan sorted norm options).
   - v21: setiap opsi salah origin 'taxonomy' dan reason-nya BUKAN kalimat fallback verb-form ("belum cocok dengan waktu, fungsi, atau susunan").
   - Jalankan untuk SEMUA level A1-C2 (ganti activeLevel per lesson seperti pola content-integrity-audit.js).
B2. content-integrity-audit.js: perluas owner map — claim juga gabungan `${pedagogicalObjective} ${explanation.rule}` dan `${explanation.howToAvoid} ${explanation.memoryCue}` (plus varian *Id) per template; perlakukan nilai GRAMMAR_FAMILY_LABELS sebagai taxonomy (jangan flag sebagai pinjaman tak berjejak; flag justru kalau kartu menstempelnya origin 'own'). Sesuaikan check borrowed-without-provenance dengan bentuk entry objek baru.
B3. Jangan sentuh app.js. Tulis asumsi kontrak dari file spec ini saja.

### Harness verifikasi (Subagent C) — file BARU tools/dev/grammar-provenance-verify.js + dump review
C1. Boot app.js via vm mengikuti pola persis tests/grammar-memory-scope-test.js (stub DOM, fetch file lokal, tunggu load selesai).
C2. Untuk tiap level A1,A2,B1,B2,C1,C2: set level aktif (ikuti cara grammar-memory-scope-test/content-integrity-audit mengganti state.preferences.activeLevel + levelMode), lalu untuk TIAP lesson level itu panggil buildGrammarLessonQuestions(subskill,25).
C3. Assert kontrak: 25/25 kartu, 25 practiceMode distinct, seluruh aturan provenance di atas, v5!=v22, v21 taxonomy, tidak ada distraktor ber-reason kalimat fallback verb-form pada mode v2-v14, v18-v24 (semua mode beropsi kalimat; hanya v0, v1, v15-v17 yang beropsi bentuk kata sehingga heuristik verb-form sah). Exit nonzero bila ada pelanggaran; print ringkasan per level.
C4. Dump kartu render ke /home/user/workspace/review/questions-<LEVEL>.json: per kartu {lesson, subskill, practiceMode, question, options, answerIndex, explain:{why,distractors:[{option,reason,sourceId,origin}]}, optionSources}. Buat folder bila belum ada.
C5. Harness harus tetap PASS saat dijalankan SETELAH patch A; saat dijalankan pada kode lama boleh FAIL (itu bukti harness bekerja). Jangan edit app.js atau file audit.

## Pembagian file (hindari konflik tulis)
- Subagent A: app.js SAJA.
- Subagent B: grammar-quality-audit.js, content-integrity-audit.js SAJA.
- Subagent C: tools/dev/grammar-provenance-verify.js (baru), folder /home/user/workspace/review/ SAJA.
- Laporan masing-masing: /home/user/workspace/reports/subagent-{A,B,C}.md (ringkas: apa yang diubah, hasil test).
