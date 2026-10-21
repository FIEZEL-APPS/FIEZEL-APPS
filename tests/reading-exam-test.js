const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// m025-139 — gate untuk jalur Reading berformat ujian, dan pengawas kalibrasi bank lama.
//
// Bagian 1 memeriksa set ujian yang baru: kunci jawaban, bukti yang benar-benar ada di
// bacaannya, dan kontrak format yang tidak boleh diam-diam menyusut.
// Bagian 2 mengukur bank reading lama dan MENCATAT kalibrasinya. Bank itu belum diperbaiki -
// gate ini menjaga supaya ia tidak makin buruk, dan supaya angkanya tidak bisa hilang diam-diam.
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const exam = JSON.parse(fs.readFileSync(path.join(root, 'reading-exam-v1.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(root, 'reading-bank.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const words = text => (String(text || '').match(/[A-Za-z']+/g) || []).length;

// ---------------------------------------------------------------------------
// 1. Set berformat ujian
// ---------------------------------------------------------------------------
check('Exam reading schema', exam.schema === 'fiezel-reading-exam-v1' && Array.isArray(exam.passages) && exam.passages.length > 0, `schema=${exam.schema} passages=${exam.passages?.length}`);
check('No-prediction statement is present', /tidak memprediksi band IELTS atau skor TOEFL/i.test(String(exam.honesty || '')), exam.honesty || 'missing');
check('Both exams are represented', ['ielts_academic_reading', 'toefl_reading'].every(id => exam.passages.some(p => p.exam === id)), exam.passages.map(p => p.exam));

const formatIds = Object.keys(exam.examFormats || {});
check('Format contracts are complete', formatIds.length > 0 && formatIds.every(id => {
  const f = exam.examFormats[id];
  return f.label && Array.isArray(f.passageWords) && f.passageWords.length === 2 &&
    Array.isArray(f.questionsPerPassage) && f.questionsPerPassage.length === 2 &&
    Number(f.passagesPerSession) > 0 && Number(f.questionsPerSession) > 0 &&
    Number(f.minutesPerPassage) > 0 && Array.isArray(f.questionTypes) && f.note;
}), formatIds);

const badLength = exam.passages.filter(p => {
  const f = exam.examFormats[p.exam];
  const n = words(p.text);
  return !f || n < f.passageWords[0] || n > f.passageWords[1];
});
check('Every passage sits inside its exam word range', badLength.length === 0,
  exam.passages.map(p => `${p.id}=${words(p.text)} (${exam.examFormats[p.exam]?.passageWords.join('-')})`));
check('Declared word counts match the text', exam.passages.every(p => p.wordCount === words(p.text)), exam.passages.map(p => `${p.id}:${p.wordCount}/${words(p.text)}`));
check('Every passage has enough paragraphs to be navigable', exam.passages.every(p => p.text.split(/\n\s*\n/).filter(Boolean).length >= 5), exam.passages.map(p => `${p.id}=${p.text.split(/\n\s*\n/).filter(Boolean).length}`));
// IELTS memberi 40 soal untuk TIGA bacaan (13/13/14), bukan 13 rata - jadi yang dijaga
// rentang per bacaan DAN total per sesi. Total itulah yang menentukan apakah satu sesi penuh
// benar-benar tersedia; rentang saja bisa lolos dengan jumlah bacaan yang salah.
check('Question count per passage sits inside the format range',
  exam.passages.every(p => {
    const [lo, hi] = exam.examFormats[p.exam].questionsPerPassage;
    return p.questions.length >= lo && p.questions.length <= hi;
  }), exam.passages.map(p => `${p.id}=${p.questions.length}`));
const sessionRows = formatIds.map(id => {
  const f = exam.examFormats[id];
  const owned = exam.passages.filter(p => p.exam === id);
  return { id, passages: owned.length, questions: owned.reduce((n, p) => n + p.questions.length, 0),
    wantPassages: Number(f.passagesPerSession), wantQuestions: Number(f.questionsPerSession) };
});
// m025-188: runtime menyajikan exam PER PASSAGE (startReadingExam per set), jadi pin
// "tepat satu sesi" adalah artefak tes, bukan kontrak runtime. Kontrak DIPERKETAT jadi
// deklaratif: setiap format wajib punya MINIMAL satu sesi penuh (tidak boleh menyusut
// di bawah kontrak examFormats) dan tidak boleh ada format kosong — penambahan konten
// legal, pengurangan di bawah sesi penuh tetap gagal.
check('Each exam offers at least one full session (declarative floor)',
  sessionRows.every(r => r.passages >= r.wantPassages && r.questions >= r.wantQuestions && r.wantPassages > 0),
  sessionRows.map(r => `${r.id}: ${r.passages}/${r.wantPassages} bacaan, ${r.questions}/${r.wantQuestions} soal`));
check('Every passage is bound to a known CEFR level', exam.passages.every(p => LEVELS.includes(p.level)), exam.passages.map(p => `${p.id}=${p.level}`));

const allQuestions = exam.passages.flatMap(p => p.questions.map(q => ({ passage: p, q })));
check('Unique question identities', new Set(allQuestions.map(x => x.q.id)).size === allQuestions.length, `${allQuestions.length} questions`);
check('Every answer index is inside its option list', allQuestions.every(({ q }) => Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length), 'kunci di luar daftar pilihan akan menilai jawaban benar sebagai salah');
check('Options are non-empty and distinct', allQuestions.every(({ q }) => q.options.length >= 3 && q.options.every(x => String(x).trim()) && new Set(q.options.map(x => String(x).trim().toLowerCase())).size === q.options.length), 'pilihan kembar membuat dua jawaban benar');
check('Every question declares a type its format allows', allQuestions.every(({ passage, q }) => exam.examFormats[passage.exam].questionTypes.includes(q.type)), [...new Set(allQuestions.map(x => x.q.type))]);
check('Every question explains itself three ways', allQuestions.every(({ q }) => q.explain?.evidence && q.explain?.why && q.explain?.whyOthersFail), 'evidence, why, dan whyOthersFail wajib ada');

// Bukti harus benar-benar ada di bacaannya. Ini yang membedakan kunci jawaban yang bisa
// dipertanggungjawabkan dari kunci yang terdengar meyakinkan.
const normalise = t => String(t || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
const missingEvidence = allQuestions.filter(({ passage, q }) => {
  const haystack = normalise(passage.text).toLowerCase();
  return String(q.explain.evidence).split('...').map(x => normalise(x).toLowerCase()).filter(Boolean)
    .some(fragment => !haystack.includes(fragment));
});
check('Every cited evidence string appears verbatim in its passage', missingEvidence.length === 0, missingEvidence.map(x => x.q.id));

// True/False/Not Given: urutan pilihannya baku, dan ketiga jawaban harus terpakai -
// set yang tidak pernah menjawab "Not Given" tidak melatih tipe soal yang paling sering salah.
const tfng = allQuestions.filter(({ q }) => q.type === 'true_false_not_given');
check('TFNG questions keep the canonical option order', tfng.length > 0 && tfng.every(({ q }) => JSON.stringify(q.options) === JSON.stringify(['True', 'False', 'Not Given'])), `${tfng.length} TFNG questions`);
check('TFNG answers use all three verdicts', new Set(tfng.map(({ q }) => q.options[q.answerIndex])).size === 3, tfng.map(({ q }) => q.options[q.answerIndex]));

// m025-147: Yes/No/Not Given menguji PANDANGAN penulis, bukan fakta di teks, dan tertukarnya
// dengan TFNG adalah salah satu sebab kehilangan nilai yang paling sering di IELTS. Karena itu
// ia dijaga dengan syarat yang sama ketatnya: urutan pilihan baku, dan ketiga vonis terpakai.
const ynng = allQuestions.filter(({ q }) => q.type === 'yes_no_not_given');
check('YNNG questions keep the canonical option order',
  ynng.length > 0 && ynng.every(({ q }) => JSON.stringify(q.options) === JSON.stringify(['Yes', 'No', 'Not Given'])),
  `${ynng.length} soal YNNG`);
check('YNNG answers use all three verdicts',
  new Set(ynng.map(({ q }) => q.options[q.answerIndex])).size === 3,
  ynng.map(({ q }) => q.options[q.answerIndex]));
check('The IELTS format lists both TFNG and YNNG, and explains the difference',
  ['true_false_not_given', 'yes_no_not_given'].every(t => exam.examFormats.ielts_academic_reading.questionTypes.includes(t)) &&
    /pandangan penulis/i.test(exam.examFormats.ielts_academic_reading.note),
  'dua tipe yang mirip bentuknya tetapi berbeda yang diujinya harus dibedakan di kontraknya');

// Mencocokkan informasi: nomor paragraf yang dipilih harus benar-benar memuat buktinya.
const matching = allQuestions.filter(({ q }) => q.type === 'matching_information');
const badParagraph = matching.filter(({ passage, q }) => {
  const paras = passage.text.split(/\n\s*\n/).filter(x => x.trim());
  const chosen = Number(String(q.options[q.answerIndex]).replace(/\D+/g, ''));
  return !(chosen >= 1 && chosen <= paras.length) || Number(q.paragraph) !== chosen ||
    !normalise(paras[chosen - 1]).toLowerCase().includes(normalise(q.explain.evidence).toLowerCase());
});
check('Matching-information keys point at the paragraph that holds the evidence', matching.length > 0 && badParagraph.length === 0, badParagraph.map(x => x.q.id));

const toefl = exam.passages.filter(p => p.exam === 'toefl_reading');
check('TOEFL sets cover the types that punish skimming', toefl.every(p => ['negative_factual', 'insert_text', 'sentence_simplification'].every(t => p.questions.some(q => q.type === t))), toefl.map(p => [...new Set(p.questions.map(q => q.type))]));

// ---------------------------------------------------------------------------
// 2. Runtime
// ---------------------------------------------------------------------------
function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}
const builder = sourceBlock('makeExamReadingQuestion');
check('Exam options are never shuffled', Boolean(builder) && !/shuffle\s*\(/.test(builder), 'mengacak "Position A-D" atau True/False/Not Given menghancurkan artinya');
const starter = sourceBlock('startReadingExam');
check('Exam sets honour the active level contract', /getActiveLevel\s*\(/.test(starter) && /validateQuestion\s*\(/.test(starter), 'set di luar level aktif harus ditolak, dan soal cacat tidak boleh masuk sesi');
check('Exam sets stay out of the random and adaptive pools',
  !/readingExamSets\s*\(/.test(sourceBlock('startReadingRandom')) && !/readingExamSets\s*\(/.test(sourceBlock('startReadingAdaptive')) && !/readingExamSets\s*\(/.test(sourceBlock('buildAdaptivePool')),
  'jalur ujian terpisah dari bank lama supaya kontrak level tidak bocor');

// ---------------------------------------------------------------------------
// 3. Kalibrasi bank lama - diukur, dicatat, dan dijaga tidak memburuk
// ---------------------------------------------------------------------------
const syllables = w => {
  const s = w.toLowerCase();
  let n = 0, prev = false;
  for (const c of s) { const v = 'aeiouy'.includes(c); if (v && !prev) n++; prev = v; }
  if (s.endsWith('e') && n > 1) n--;
  return Math.max(1, n);
};
const flesch = text => {
  const sentences = String(text || '').split(/[.!?]+/).filter(x => x.trim());
  const ws = String(text || '').match(/[A-Za-z']+/g) || [];
  if (!sentences.length || !ws.length) return null;
  return 206.835 - 1.015 * (ws.length / sentences.length) - 84.6 * (ws.reduce((n, w) => n + syllables(w), 0) / ws.length);
};
const legacyRows = Array.isArray(legacy) ? legacy : legacy.passages || [];
const calibration = LEVELS.map(level => {
  const sub = legacyRows.filter(r => r.level === level);
  const scores = sub.map(r => flesch(r.text)).filter(x => x !== null);
  return {
    level,
    passages: sub.length,
    meanWords: sub.length ? Math.round((sub.reduce((n, r) => n + words(r.text), 0) / sub.length) * 10) / 10 : 0,
    meanFlesch: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
  };
});
// Makin tinggi level, teks seharusnya makin sulit, artinya skor Flesch makin RENDAH.
// Setiap pasangan level berurutan yang melanggar itu dihitung sebagai inversi.
const inversions = [];
for (let i = 1; i < calibration.length; i++) {
  if (calibration[i].meanFlesch > calibration[i - 1].meanFlesch) inversions.push(`${calibration[i - 1].level}->${calibration[i].level}`);
}
const INVERSION_CEILING = 3; // baseline terukur pada m025-139: A2->... B1->B2, B2->C1, C1->C2
check(
  'Legacy reading calibration does not get worse',
  inversions.length <= INVERSION_CEILING,
  { inversions, ceiling: INVERSION_CEILING, note: 'bank lama BELUM terkalibrasi; angka ini plafon regresi, bukan tanda sehat' }
);
check(
  'Legacy calibration debt stays visible in the report',
  calibration.every(row => row.meanFlesch !== null),
  calibration
);

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  version: exam.version,
  counts: {
    pass: checks.filter(i => i.status === 'PASS').length,
    fail: checks.filter(i => i.status === 'FAIL').length,
    examPassages: exam.passages.length,
    examQuestions: allQuestions.length,
    questionTypes: [...new Set(allQuestions.map(x => x.q.type))].length
  },
  legacyCalibration: { rows: calibration, inversions, ceiling: INVERSION_CEILING },
  checks
};
fs.writeFileSync(path.join(root, 'READING-EXAM-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
