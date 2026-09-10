/**
 * tests/teacher-csv-test.js — GERBANG pipa impor/ekspor CSV konten guru (§7-§12).
 *
 * Node murni, nol dependency, nol jaringan. Yang dijaga:
 *   1. Parser RFC 4180 benar: koma dalam kutipan, kutipan ter-escape, baris baru
 *      di dalam sel, CRLF, BOM. Salah di sini = konten guru rusak SENYAP.
 *   2. Deteksi + pemetaan kolom, termasuk override manual (§9).
 *   3. Validasi §8 lengkap: kolom wajib, CEFR/skill/tipe salah, jawaban hilang,
 *      ID duplikat, soal duplikat, rujukan tak dikenal, berkas kebesaran.
 *   4. Laporan ber-severity + diagnostik PER BARIS bernomor baris BERKAS.
 *   5. Preview TIDAK menulis; commit menolak baris ERROR dan meloloskan sisanya.
 *   6. Impor SELALU mendarat DRAFT — tidak pernah langsung ke murid.
 *   7. Ekspor hanya konten milik guru pemanggil, dan menetralkan rumus.
 *   8. Bolak-balik ekspor->impor tidak menghasilkan duplikat (§12).
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const path = require('path');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}
function rowProblems(report, line) {
  const row = report.rows.find((r) => r.line === line);
  return row ? row.diagnostics.map((d) => d.problem) : [];
}
function fileProblems(report) {
  return report.fileProblems.map((p) => p.problem);
}

(async () => {
  const V = await import('file://' + path.join(__fzRoot, 'workers/api/teacher/csv-core.js'));
  const NOW = 1_800_000_000_000;

  /* ---------- 1. Parser RFC 4180 ---------------------------------------------- */
  const tricky = 'a,b,c\r\n"berisi, koma","dia bilang ""halo""","baris\nkedua"\r\n';
  const parsed = V.parseCsv(tricky);
  assert(parsed.rows.length === 2, 'CRLF + baris baru dalam sel: dua baris, bukan tiga');
  assert(parsed.rows[1][0] === 'berisi, koma', 'koma DI DALAM kutipan tidak memecah kolom');
  assert(parsed.rows[1][1] === 'dia bilang "halo"', 'kutipan ganda ter-escape dibaca satu kutipan');
  assert(parsed.rows[1][2] === 'baris\nkedua', 'baris baru DI DALAM sel dipertahankan');
  assert(V.parseCsv('﻿a,b\n1,2').rows[0][0] === 'a',
    'BOM UTF-8 Excel dibuang — kalau tidak, kolom pertama tidak pernah cocok');
  assert(V.parseCsv('a,b\n1,2\n').rows.length === 2, 'newline penutup bukan baris kosong palsu');
  assert(V.parseCsv('   ').problems.some((p) => p.problem === V.CSV_PROBLEM.FILE_EMPTY),
    'berkas kosong dilaporkan');
  const round = V.parseCsv(V.encodeCsv([['x,y', 'kata "kutip"', 'baris\nbaru']]));
  assert(round.rows[0][0] === 'x,y' && round.rows[0][1] === 'kata "kutip"' && round.rows[0][2] === 'baris\nbaru',
    'encode->parse pulang-pergi utuh');

  /* ---------- 2. Suntikan rumus ----------------------------------------------- */
  assert(V.looksLikeFormula('=HYPERLINK("http://jahat","klik")') === true, 'rumus = terdeteksi');
  assert(V.looksLikeFormula('@SUM(A1)') === true, 'rumus @ terdeteksi');
  assert(V.looksLikeFormula('-12') === false, 'angka negatif BUKAN rumus (hindari banjir peringatan palsu)');
  assert(V.looksLikeFormula('reservation') === false, 'teks biasa bukan rumus');
  assert(V.encodeCell('=cmd()').startsWith("'"), 'EKSPOR menetralkan rumus dengan awalan kutip tunggal');
  assert(V.encodeCell('biasa') === 'biasa', 'teks biasa tidak diubah saat ekspor');

  /* ---------- 3. Pemetaan kolom ------------------------------------------------ */
  const detected = V.detectMapping(['question_text', 'correct_answer', 'cefr', 'skill', 'lesson_id', 'type']);
  assert(detected.mapping.stem === 0, 'question_text -> Question Text (§9)');
  assert(detected.mapping.answer === 1, 'correct_answer -> Correct Answer (§9)');
  assert(detected.mapping.level === 2, 'cefr -> CEFR (§9)');
  assert(detected.mapping.skill === 3, 'skill -> Skill (§9)');
  assert(detected.problems.length === 0, 'seluruh kolom wajib terpetakan');

  const missing = V.detectMapping(['question_text', 'cefr']);
  assert(missing.problems.some((p) => p.problem === V.CSV_PROBLEM.COLUMN_REQUIRED_MISSING
    && p.field === 'answer'), 'kolom wajib yang hilang dilaporkan per-bidang');
  const dup = V.detectMapping(['stem', 'question_text', 'answer', 'skill', 'level', 'type', 'lesson_id']);
  assert(dup.problems.some((p) => p.problem === V.CSV_PROBLEM.COLUMN_DUPLICATE),
    'dua kolom memetakan ke bidang yang sama DITOLAK');
  const unknown = V.detectMapping(['stem', 'catatan_guru']);
  assert(unknown.unknown.some((u) => u.name === 'catatan_guru'),
    'kolom tak dikenal dicatat, bukan menggagalkan berkas');
  assert(V.applyOverrides({ stem: 0 }, { level: 5 }).level === 5, 'override manual dihormati');
  assert(!('bidang_karangan' in V.applyOverrides({}, { bidang_karangan: 3 })),
    'override ke bidang di luar skema DIBUANG — klien tidak bisa mengarang bidang');

  /* ---------- 4. Template (§10) ------------------------------------------------ */
  const template = V.templateCsv();
  const templateHeader = V.parseCsv(template).rows[0];
  assert(V.REQUIRED_KEYS.every((k) => templateHeader.includes(k)), 'template memuat semua kolom wajib');
  assert(template.includes('A1 | A2 | B1'), 'template menyebut nilai enum CEFR yang sah');
  assert(template.includes('mcq'), 'template menyebut tipe soal yang sah');
  assert(template.includes('WAJIB'), 'template menandai kolom wajib vs opsional');

  /* ---------- 5. Impor sah ------------------------------------------------------ */
  const known = { knownLessonIds: ['L1'], existingIds: [], existingStems: [] };
  const goodCsv = [
    'lesson_id,type,question_text,options,correct_answer,skill,cefr,difficulty',
    'L1,mcq,"I have a ___ under the name Putri.",reservation|receipt|reception,reservation,vocabulary,A2,2',
    'L1,mcq,"The room ___ on the fifth floor.",is|are|be,is,grammar,A1,1'
  ].join('\n');
  const good = V.buildPreview({ text: goodCsv, ...known }, NOW);
  assert(good.counts.total === 2 && good.counts.error === 0, 'dua baris sah, nol galat');
  assert(good.counts.create === 2, 'keduanya CREATE (tanpa content_id)');
  assert(good.plan.length === 2, 'rencana tulis berisi dua soal');
  assert(good.plan[0].question.status === 'DRAFT', 'impor mendarat DRAFT (§13)');
  assert(good.plan[0].question.content_source === 'TEACHER', 'impor ditandai sumber TEACHER');
  assert(V.summarize(good).imported === 2, 'ringkasan §8 menghitung yang terimpor');

  /* ---------- 6. Diagnostik per baris (§8) ------------------------------------- */
  const badCsv = [
    'lesson_id,type,question_text,options,correct_answer,skill,cefr',
    'L1,mcq,Soal tanpa kunci,a|b|c,,vocabulary,A2',
    'L1,mcq,Soal CEFR aneh,a|b|c,a,vocabulary,X9',
    'L1,mcq,Soal skill aneh,a|b|c,a,kungfu,A2',
    'L1,tebakan,Soal tipe aneh,a|b|c,a,vocabulary,A2',
    'L1,mcq,Soal jawaban di luar opsi,a|b|c,zzz,vocabulary,A2',
    'L9,mcq,Soal lesson asing,a|b|c,a,vocabulary,A2',
    'L1,mcq,Soal CEFR huruf kecil,a|b|c,a,vocabulary,b1'
  ].join('\n');
  const bad = V.buildPreview({ text: badCsv, ...known }, NOW);
  assert(rowProblems(bad, 2).includes('question_answer_missing'), 'Baris 2: ERROR kunci jawaban hilang');
  assert(rowProblems(bad, 3).includes('content_level_invalid'), 'Baris 3: ERROR CEFR tak sah');
  assert(rowProblems(bad, 4).includes('content_skill_invalid'), 'Baris 4: ERROR skill tak sah');
  assert(rowProblems(bad, 5).includes('question_type_invalid'), 'Baris 5: ERROR tipe soal tak sah');
  assert(rowProblems(bad, 6).includes('question_answer_not_in_options'),
    'Baris 6: ERROR jawaban di luar opsi');
  assert(rowProblems(bad, 7).includes(V.CSV_PROBLEM.UNKNOWN_REFERENCE),
    'Baris 7: ERROR lesson milik orang lain / tak dikenal (penahan IDOR lewat berkas)');
  assert(rowProblems(bad, 8).includes('value_normalized'),
    'Baris 8: WARNING CEFR dinormalkan dari b1 ke B1 — dilaporkan, bukan diam-diam');
  const row8 = bad.rows.find((r) => r.line === 8);
  assert(row8.severity === V.CSV_SEVERITY.WARNING, 'baris ternormalisasi = WARNING, bukan ERROR');
  assert(bad.counts.error === 6 && bad.counts.warning === 1,
    'ringkasan §8: enam ERROR, satu WARNING');
  assert(bad.plan.length === 1 && bad.plan[0].line === 8,
    'HANYA baris sah yang masuk rencana tulis — baris ERROR tidak pernah ditulis');

  /* ---------- 7. Duplikat & ID stabil (§12) ------------------------------------ */
  const dupCsv = [
    'lesson_id,type,question_text,options,correct_answer,skill,cefr',
    'L1,mcq,Soal kembar,a|b|c,a,vocabulary,A2',
    'L1,mcq,Soal Kembar,a|b|c,a,vocabulary,A2'
  ].join('\n');
  const dupReport = V.buildPreview({ text: dupCsv, ...known }, NOW);
  assert(rowProblems(dupReport, 3).includes(V.CSV_PROBLEM.DUPLICATE_QUESTION),
    'soal kembar DALAM SATU berkas terdeteksi (tidak peka kapital)');
  assert(dupReport.plan.length === 1, 'hanya satu dari sepasang kembar yang ditulis');

  const idCsv = [
    'content_id,lesson_id,type,question_text,options,correct_answer,skill,cefr',
    'Q-EXIST,L1,mcq,Soal lama disunting,a|b|c,a,vocabulary,A2',
    'Q-HANTU,L1,mcq,Soal ber-ID hantu,a|b|c,a,vocabulary,A2',
    'Q-EXIST,L1,mcq,ID dipakai dua kali,a|b|c,a,vocabulary,B1'
  ].join('\n');
  const idReport = V.buildPreview({ text: idCsv, knownLessonIds: ['L1'], existingIds: ['Q-EXIST'], existingStems: [] }, NOW);
  const updateRow = idReport.rows.find((r) => r.line === 2);
  assert(updateRow.operation === 'update' && updateRow.severity !== 'ERROR',
    'content_id yang dikenal = UPDATE, bukan CREATE (§12: impor ulang tidak menduplikasi)');
  assert(rowProblems(idReport, 3).includes(V.CSV_PROBLEM.UNKNOWN_REFERENCE),
    'content_id tak dikenal = ERROR, BUKAN diam-diam dibuat baru');
  assert(rowProblems(idReport, 4).includes(V.CSV_PROBLEM.DUPLICATE_ID),
    'content_id yang sama dua kali dalam satu berkas DITOLAK');
  assert(idReport.counts.update === 1, 'tepat satu UPDATE terhitung');

  // Soal identik yang sudah ada di bank dengan ID lain = WARNING (niat bisa sah).
  const stemDup = V.buildPreview({
    text: 'lesson_id,type,question_text,options,correct_answer,skill,cefr\nL1,mcq,Soal kembar,a|b|c,a,vocabulary,A2',
    knownLessonIds: ['L1'], existingIds: ['Q-OLD'],
    existingStems: [{ id: 'Q-OLD', lesson_id: 'L1', type: 'mcq', stem: 'Soal kembar' }]
  }, NOW);
  assert(rowProblems(stemDup, 2).includes(V.CSV_PROBLEM.DUPLICATE_QUESTION),
    'soal yang sudah ada di bank dilaporkan sebelum konfirmasi');
  assert(stemDup.rows[0].severity === V.CSV_SEVERITY.WARNING, 'duplikat terhadap bank = WARNING');

  /* ---------- 8. Berkas cacat --------------------------------------------------- */
  const noRequired = V.buildPreview({ text: 'question_text,cefr\nhalo,A1', ...known }, NOW);
  assert(fileProblems(noRequired).includes(V.CSV_PROBLEM.COLUMN_REQUIRED_MISSING),
    'kolom wajib hilang menggagalkan berkas SEBELUM baris diproses');
  assert(noRequired.plan.length === 0, 'berkas tanpa kolom wajib tidak menulis apa pun');

  const huge = V.buildPreview({ text: 'a'.repeat(V.CSV_LIMITS.MAX_BYTES + 10), ...known }, NOW);
  assert(fileProblems(huge).includes(V.CSV_PROBLEM.FILE_TOO_LARGE), 'berkas kebesaran DITOLAK (§8)');
  assert(huge.plan.length === 0, 'berkas kebesaran tidak menulis apa pun');

  const ragged = V.buildPreview({
    text: 'lesson_id,type,question_text,options,correct_answer,skill,cefr\nL1,mcq,kurang,kolom', ...known
  }, NOW);
  assert(rowProblems(ragged, 2).includes(V.CSV_PROBLEM.ROW_RAGGED), 'baris berkolom kurang DITOLAK');

  const formula = V.buildPreview({
    text: 'lesson_id,type,question_text,options,correct_answer,skill,cefr\nL1,mcq,=cmd|"a",a|b,a,vocabulary,A2',
    ...known
  }, NOW);
  assert(rowProblems(formula, 2).includes(V.CSV_PROBLEM.FORMULA_SUSPECT),
    'sel ber-rumus DIPERINGATKAN saat impor (§8), tidak diam-diam diubah');

  /* ---------- 9. Commit --------------------------------------------------------- */
  const commit = V.planCommit(bad);
  assert(commit.ok === true, 'commit berjalan meski sebagian baris bergalat');
  assert(commit.writes.length === 1 && commit.refused === 6,
    'commit menulis 1 baris sah dan MENOLAK 6 baris bergalat (§8 "182 imported, 4 errors")');
  assert(commit.writes.every((w) => w.question.status === 'DRAFT'),
    'setiap tulisan commit berstatus DRAFT — impor bukan jalan pintas ke layar murid');
  assert(V.planCommit(noRequired).ok === false,
    'commit atas berkas bercacat STRUKTUR ditolak seluruhnya');
  assert(V.planCommit(huge).ok === false, 'commit atas berkas kebesaran ditolak seluruhnya');
  assert(V.planCommit(null).ok === false, 'commit tanpa laporan ditolak');

  /* ---------- 10. Ekspor + otorisasi (§11) ------------------------------------- */
  const bank = [
    { id: 'Q1', teacher_sub: 'guruA', lesson_id: 'L1', type: 'mcq', stem: 'Milik guru A',
      options: ['a', 'b'], answer: 'a', skill: 'vocabulary', level: 'A2', difficulty: 2, tags: ['hotel'] },
    { id: 'Q2', teacher_sub: 'guruB', lesson_id: 'L2', type: 'mcq', stem: 'Milik guru B',
      options: ['a', 'b'], answer: 'a', skill: 'grammar', level: 'B1', difficulty: 3, tags: [] }
  ];
  const exported = V.exportQuestionsCsv(bank, { sub: 'guruA' });
  assert(exported.includes('Milik guru A'), 'ekspor memuat konten milik pemanggil');
  assert(!exported.includes('Milik guru B'),
    'ekspor TIDAK PERNAH memuat konten guru lain (§11) — disaring di dalam fungsi ekspor');
  assert(!exported.includes('guruA') && !exported.includes('guruB'),
    'ekspor tidak membocorkan pengenal internal guru');
  assert(V.exportQuestionsCsv(bank, null).trim().split('\r\n').length === 1,
    'ekspor tanpa pemanggil = hanya header, BUKAN seluruh bank');
  assert(V.exportQuestionsCsv(bank, { sub: 'penyusup' }).trim().split('\r\n').length === 1,
    'pemanggil tanpa konten mendapat header saja');

  const leakCheck = V.exportQuestionsCsv([{
    ...bank[0], created_by: 'RAHASIA-CREATOR', institution_id: 'RAHASIA-INST', pass_hash: 'RAHASIA-HASH'
  }], { sub: 'guruA' });
  for (const secret of ['RAHASIA-CREATOR', 'RAHASIA-INST', 'RAHASIA-HASH']) {
    assert(!leakCheck.includes(secret), 'ekspor tidak membocorkan ' + secret);
  }

  /* ---------- 11. Bolak-balik ekspor -> impor (§12) ---------------------------- */
  const trip = V.buildPreview({
    text: V.exportQuestionsCsv(bank, { sub: 'guruA' }),
    knownLessonIds: ['L1'], existingIds: ['Q1'],
    existingStems: [{ id: 'Q1', lesson_id: 'L1', type: 'mcq', stem: 'Milik guru A' }]
  }, NOW);
  assert(trip.counts.error === 0, 'hasil ekspor kita sendiri lolos impor tanpa galat');
  assert(trip.counts.update === 1 && trip.counts.create === 0,
    'bolak-balik menghasilkan UPDATE, BUKAN duplikat baru (§12)');
  assert(trip.plan[0].contentId === 'Q1', 'ID stabil terbawa pulang-pergi');

  assert(V.roundTripSafe({ options: ['a', 'b'], tags: ['x'] }) === true, 'opsi normal aman bolak-balik');
  assert(V.roundTripSafe({ options: ['a|b'], tags: [] }) === false,
    'opsi yang MEMUAT pemisah | dilaporkan tidak aman, bukan diperbaiki diam-diam');

  assert(V.dedupKey({ lesson_id: 'L1', type: 'mcq', stem: '  Halo   Dunia ' })
    === V.dedupKey({ lessonId: 'L1', type: 'MCQ', stem: 'halo dunia' }),
  'kunci dedup mengabaikan kapital + spasi berlebih');
  assert(V.dedupKey({ lesson_id: 'L1', type: 'mcq', stem: 'x' })
    !== V.dedupKey({ lesson_id: 'L2', type: 'mcq', stem: 'x' }),
  'batang soal yang sama di lesson BERBEDA bukan duplikat');

  /* ---------- Laporan -------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
  console.log('teacher-csv-test: ' + passed + '/' + results.length + ' assert PASS');
  if (failures) {
    console.error('teacher-csv-test GAGAL: ' + failures + ' assert merah');
    process.exit(1);
  }
})().catch((err) => {
  console.error('teacher-csv-test ERROR: ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
