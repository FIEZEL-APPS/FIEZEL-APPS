// m025-234 — gerbang untuk OVERLAY Thai pada bank konten di app.js.
//
// Kelas bug yang sudah muncul TIGA KALI dan selalu lolos setiap gerbang purity:
// sidecar th berisi terjemahan yang benar, gerbang memeriksa isinya dan hijau, tetapi
// applyContentLocale() tidak pernah menyalin bidang itu ke bank runtime. Terjemahannya
// terkirim ke perangkat murid, lalu menganggur, dan murid tetap membaca bahasa Indonesia.
//
//   1. bank ujian Listening   — sidecar tidak pernah ada sama sekali (m025-231)
//   2. writing prompts        — 45 hint + 45 focus + 5 catatan ujian menganggur
//   3. reading-exam passages  — 96 soal dengan why + whyOthersFail menganggur
//
// Gerbang purity tidak bisa melihat ini karena ia bertanya "apakah isinya bersih?".
// Berkas ini bertanya hal yang berbeda dan justru itu yang menentukan: "apakah isinya
// SAMPAI ke bank yang dibaca penyaji?" Ia menjalankan applyContentLocale() yang ASLI
// atas fixture sintetis berawalan TH- supaya kegagalan penyalinan tidak bisa menyamar
// sebagai keberhasilan.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok, details });
  if (!ok) failed = true;
};

const src = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
/* Dipotong tepat di kurung tutup fungsinya, BUKAN di "function" berikutnya: di antara
   dua fungsi ada deklarasi tingkat-atas (mis. let CLOZE_BANK_BASE=null) yang kalau ikut
   terbawa akan me-null-kan bank fixture sebelum overlay sempat menyentuhnya - dan tesnya
   lalu merah karena alasan yang salah. */
function ambilFungsi(nama) {
  const i = src.indexOf('function ' + nama + '(');
  if (i < 0) return '';
  const akhir = src.indexOf('\n}', i);
  return akhir < 0 ? src.slice(i) : src.slice(i, akhir + 2);
}

const kode = [ambilFungsi('grammarItemForTh'), ambilFungsi('vocabForLocale'), ambilFungsi('applyContentLocale'), ambilFungsi('applyClozeLocale')].join('\n');
check('applyContentLocale bisa diekstrak dari app.js', kode.includes('function applyContentLocale('), kode.length + ' karakter');

const writingSrc = JSON.parse(fs.readFileSync(path.join(root, 'writing-prompts-v1.json'), 'utf8'));
const readingSrc = JSON.parse(fs.readFileSync(path.join(root, 'reading-exam-v1.json'), 'utf8'));

/* Lima permukaan sisanya tidak punya berkas sumber terpisah yang enak dipakai sebagai
   fixture, jadi sumbernya dibuat minimal DI SINI - bentuknya mengikuti kontrak yang
   dibaca applyContentLocale, dan itulah yang sedang diuji. Nilai sumber sengaja diberi
   awalan ID- supaya kalau overlay tidak jalan, yang tertangkap adalah nilai ID- itu. */
const grammarTemplateId = 'tpl-uji-th';
const grammarOptA = 'goes';
const grammarOptB = 'go';
// Item grammar adalah LARIK berindeks: [0]=stem [1]=options [2]=answerIndex [4]=alasan
// per-pilihan [8]=id template [12]=meta penjelasan [16]=meta belajar [17]=distraktor.
function itemGrammarSumber() {
  const it = [];
  it[0] = 'She ___ to school.';
  it[1] = [grammarOptA, grammarOptB];
  it[2] = 0;
  it[4] = ['ID-BENAR', 'ID-SALAH'];
  it[8] = grammarTemplateId;
  it[12] = { ruleId: 'ID-ATURAN' };
  it[16] = { objectiveId: 'ID-TUJUAN', misconceptionId: 'ID-MISKONSEPSI', reasoningId: 'ID-NALAR' };
  it[17] = [{ option: grammarOptB, whyFails: 'ID-KENAPA-GAGAL' }];
  return it;
}
const vocabId = 'v-uji-th';
const bacaanId = 'r-uji-th';
const clozeId = 'c-uji-th';
const clozeDistraktor = 'ID-PILIHAN-SALAH';
const misconKey = 'subject verb agreement slip';

const promptId = (writingSrc.prompts || [])[0]?.id;
const examTaskKey = Object.keys(writingSrc.examTasks || {})[0];
const passageId = (readingSrc.passages || [])[0]?.id;
const questionId = (readingSrc.passages || [])[0]?.questions?.[0]?.id;

// Fixture sengaja mencolok: kalau pencocokan id meleset, nilai TH- tidak akan pernah muncul.
function buatSandbox(localeTh) {
  const sandbox = {
    console,
    JSON, Object, Array, String, Number, Boolean, Math,
    CONTENT_BASE: {
      items: [{ skill: 'grammar', item: itemGrammarSumber() }],
      g: {},
      v: [{ id: vocabId, meaning: 'ID-ARTI', example: 'She goes to school.' }],
      r: [{ id: bacaanId, qs: [['ID-STEM', ['ID-OPSI-1', 'ID-OPSI-2'], 0, {}]] }],
    },
    GRAMMAR_ITEMS: [], G: {}, V: [], R: [],
    placementListeningBank: null,
    CLOZE_BANK_BASE: [{ id: clozeId, explain: { why: 'ID-KENAPA' }, distractors: [{ text: clozeDistraktor, reason: 'ID-ALASAN' }] }],
    CLOZE_BANK: null,
    GRAMMAR_MISCONCEPTION_ID: null,
    GRAMMAR_MISCONCEPTION_BASE: { [misconKey]: 'ID-DIAGNOSIS' },
    __fzSyncShellElements() {},
    WRITING_BANK: JSON.parse(JSON.stringify(writingSrc)),
    READING_EXAM: JSON.parse(JSON.stringify(readingSrc)),
    self: {
      FiezelI18n: { getLocale: () => (localeTh ? 'th' : 'id') },
      FiezelThData: {
        grammar: { templates: { [grammarTemplateId]: {
          rule: 'TH-ATURAN', whyCorrect: 'TH-BENAR', whyOthersFail: 'TH-SALAH',
          objective: 'TH-TUJUAN', misconception: 'TH-MISKONSEPSI', reasoning: 'TH-NALAR',
          distractors: { [grammarOptB]: { whyFails: 'TH-KENAPA-GAGAL' } },
        } } },
        vocab: { entries: { [vocabId]: { meaning: 'TH-ARTI', example: 'TH-CONTOH' } } },
        readingBank: { [bacaanId]: { qs: [{ stem: 'TH-STEM', options: ['TH-OPSI-1', 'TH-OPSI-2'] }] } },
        cloze: { [clozeId]: { explain: { why: 'TH-KENAPA' }, distractors: { [clozeDistraktor]: { reason: 'TH-ALASAN' } } } },
        misconception: { diagnoses: { [misconKey]: 'TH-DIAGNOSIS' } },
        writing: {
          prompts: { [promptId]: { hint: 'TH-HINT', focus: 'TH-FOCUS' } },
          examTasks: { [examTaskKey]: { note: 'TH-EXAM-NOTE' } },
        },
        reading: {
          passages: { [passageId]: { questions: { [questionId]: { why: 'TH-WHY', whyOthersFail: 'TH-WOF' } } } },
        },
      },
    },
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(kode + '\napplyContentLocale();', sandbox, { timeout: 5000 });
  return sandbox;
}

let th;
try { th = buatSandbox(true); } catch (e) {
  check('applyContentLocale berjalan pada locale th', false, String(e && e.message || e));
}

if (th) {
  check('applyContentLocale berjalan pada locale th', true);

  const pr = (th.WRITING_BANK.prompts || []).find((x) => x && x.id === promptId);
  // Penyaji membaca prompt.id_hint (nama bidang warisan), jadi hint th WAJIB mendarat di sana.
  check('writing: petunjuk prompt memakai teks Thai (prompt.id_hint)',
    !!pr && pr.id_hint === 'TH-HINT', pr ? JSON.stringify(pr.id_hint).slice(0, 60) : 'prompt tidak ditemukan');
  check('writing: fokus prompt memakai teks Thai',
    !!pr && pr.focus === 'TH-FOCUS', pr ? JSON.stringify(pr.focus).slice(0, 60) : '-');
  check('writing: kalimat Inggris yang ditulis murid TIDAK disentuh',
    !!pr && pr.en === (writingSrc.prompts || []).find((x) => x.id === promptId).en, '-');

  const et = (th.WRITING_BANK.examTasks || {})[examTaskKey];
  check('writing: catatan tugas ujian memakai teks Thai',
    !!et && et.note === 'TH-EXAM-NOTE', et ? JSON.stringify(et.note).slice(0, 60) : '-');
  check('writing: angka kontrak tugas ujian (minWords/minutes) tetap dari sumber',
    !!et && et.minWords === writingSrc.examTasks[examTaskKey].minWords
      && et.minutes === writingSrc.examTasks[examTaskKey].minutes, '-');

  const ps = (th.READING_EXAM.passages || []).find((x) => x && x.id === passageId);
  const q = ps && (ps.questions || []).find((x) => x && x.id === questionId);
  check('reading-exam: penjelasan soal memakai teks Thai (explain.why)',
    !!q && q.explain && q.explain.why === 'TH-WHY', q ? JSON.stringify(q.explain && q.explain.why).slice(0, 60) : 'soal tidak ditemukan');
  check('reading-exam: alasan pengecoh memakai teks Thai (explain.whyOthersFail)',
    !!q && q.explain && q.explain.whyOthersFail === 'TH-WOF', q ? JSON.stringify(q.explain && q.explain.whyOthersFail).slice(0, 60) : '-');

  /* Kontrak paling mahal kalau dilanggar: stem, pilihan, dan kunci jawaban milik SUMBER.
     Satu pilihan yang bergeser menilai murid SALAH atas jawaban yang BENAR, tanpa jejak. */
  const qSrc = readingSrc.passages[0].questions[0];
  check('reading-exam: stem, pilihan, dan kunci jawaban tetap milik sumber',
    !!q && q.stem === qSrc.stem && q.answerIndex === qSrc.answerIndex
      && JSON.stringify(q.options) === JSON.stringify(qSrc.options), '-');
  check('reading-exam: bukti (evidence) bahasa Inggris tidak disentuh',
    !!q && q.explain && q.explain.evidence === qSrc.explain.evidence, '-');
}

if (th) {
  /* --- lima permukaan yang overlay-nya SUDAH ada tapi belum pernah diuji pengirimannya.
     Kelas bug ini tiga kali lolos justru pada permukaan yang kodenya 'sudah ada'. --- */

  const gi = (th.GRAMMAR_ITEMS || [])[0] && th.GRAMMAR_ITEMS[0].item;
  check('grammar: aturan dan alasan jawaban memakai teks Thai',
    !!gi && gi[12] && gi[12].ruleId === 'TH-ATURAN' && gi[4] && gi[4][0] === 'TH-BENAR',
    gi ? JSON.stringify([gi[12] && gi[12].ruleId, gi[4] && gi[4][0]]).slice(0, 70) : 'item tidak ada');
  check('grammar: alasan tiap pengecoh memakai teks Thai',
    !!gi && Array.isArray(gi[17]) && gi[17][0] && gi[17][0].whyFails === 'TH-KENAPA-GAGAL',
    gi ? JSON.stringify(gi[17]).slice(0, 70) : '-');
  check('grammar: meta belajar (tujuan/miskonsepsi/nalar) memakai teks Thai',
    !!gi && gi[16] && gi[16].objectiveId === 'TH-TUJUAN' && gi[16].misconceptionId === 'TH-MISKONSEPSI'
      && gi[16].reasoningId === 'TH-NALAR', gi ? JSON.stringify(gi[16]).slice(0, 70) : '-');
  check('grammar: kalimat soal dan pilihan Inggris TIDAK disentuh',
    !!gi && gi[0] === 'She ___ to school.' && JSON.stringify(gi[1]) === JSON.stringify([grammarOptA, grammarOptB])
      && gi[2] === 0, gi ? JSON.stringify([gi[0], gi[1], gi[2]]).slice(0, 70) : '-');

  const vv = (th.V || [])[0];
  check('vocab: arti kata memakai teks Thai',
    !!vv && vv.meaning === 'TH-ARTI', vv ? JSON.stringify(vv.meaning) : 'entri tidak ada');
  check('vocab: terjemahan kalimat contoh mendarat di exampleTranslation',
    !!vv && vv.exampleTranslation === 'TH-CONTOH', vv ? JSON.stringify(vv.exampleTranslation) : '-');
  check('vocab: kalimat contoh Inggris TIDAK disentuh',
    !!vv && vv.example === 'She goes to school.', vv ? JSON.stringify(vv.example) : '-');

  const rq = (th.R || [])[0] && th.R[0].qs && th.R[0].qs[0];
  check('reading A1/A2: pertanyaan memakai teks Thai',
    !!rq && rq[0] === 'TH-STEM', rq ? JSON.stringify(rq[0]) : 'bacaan tidak ada');
  check('reading A1/A2: pilihan jawaban memakai teks Thai',
    !!rq && JSON.stringify(rq[1]) === JSON.stringify(['TH-OPSI-1', 'TH-OPSI-2']), rq ? JSON.stringify(rq[1]) : '-');
  /* Indeks jawaban benar HARUS ikut posisi sumber. Overlay yang menggeser satu pilihan
     menilai murid SALAH atas jawaban yang BENAR, dan tidak ada yang melihatnya. */
  check('reading A1/A2: indeks kunci jawaban tetap dari sumber',
    !!rq && rq[2] === 0, rq ? String(rq[2]) : '-');

  const cz = (th.CLOZE_BANK || [])[0];
  check('cloze: penjelasan memakai teks Thai',
    !!cz && cz.explain && cz.explain.why === 'TH-KENAPA', cz ? JSON.stringify(cz.explain) : 'butir tidak ada');
  /* Kunci distraktor = TEKS PILIHAN persis, karena urutan pilihan diacak saat disajikan.
     Meleset satu byte = murid melihat kalimat umum, bukan koreksi atas kekeliruannya. */
  check('cloze: umpan balik per-pengecoh dijodohkan lewat teks pilihan dan memakai Thai',
    !!cz && Array.isArray(cz.distractors) && cz.distractors[0] && cz.distractors[0].reason === 'TH-ALASAN',
    cz ? JSON.stringify(cz.distractors).slice(0, 70) : '-');

  const mis = th.GRAMMAR_MISCONCEPTION_ID || {};
  check('misconception: isi diagnosis memakai teks Thai',
    mis[misconKey] === 'TH-DIAGNOSIS', JSON.stringify(mis[misconKey]));
  /* Kunci diagnosis adalah nama miskonsepsi berbahasa INGGRIS yang dipakai bank untuk
     menjodohkan. Menerjemahkan KUNCInya memutus penjodohan: diagnosisnya jadi tidak
     pernah ketemu, dan murid kehilangan koreksinya sama sekali. */
  check('misconception: kunci penjodohan Inggris TIDAK ikut diterjemahkan',
    Object.keys(mis).length === 1 && Object.keys(mis)[0] === misconKey, Object.keys(mis).join(', '));
}

// Arah sebaliknya, dan ini yang menjaga murid Indonesia: locale id TIDAK BOLEH kebocoran Thai.
let id;
try { id = buatSandbox(false); } catch (e) {
  check('applyContentLocale berjalan pada locale id', false, String(e && e.message || e));
}
if (id) {
  check('applyContentLocale berjalan pada locale id', true);
  const pr = (id.WRITING_BANK.prompts || []).find((x) => x && x.id === promptId);
  const asli = (writingSrc.prompts || []).find((x) => x.id === promptId);
  check('locale id: petunjuk writing tetap teks sumber',
    !!pr && pr.id_hint === asli.id_hint, pr ? JSON.stringify(pr.id_hint).slice(0, 50) : '-');
  const ps = (id.READING_EXAM.passages || []).find((x) => x && x.id === passageId);
  const q = ps && (ps.questions || []).find((x) => x && x.id === questionId);
  check('locale id: penjelasan reading-exam tetap teks sumber',
    !!q && q.explain && q.explain.why === readingSrc.passages[0].questions[0].explain.why, '-');

  const gi = (id.GRAMMAR_ITEMS || [])[0] && id.GRAMMAR_ITEMS[0].item;
  check('locale id: aturan grammar tetap teks sumber',
    !!gi && gi[12] && gi[12].ruleId === 'ID-ATURAN', gi ? JSON.stringify(gi[12]) : '-');
  const vv = (id.V || [])[0];
  check('locale id: arti kosakata tetap teks sumber',
    !!vv && vv.meaning === 'ID-ARTI' && vv.exampleTranslation === undefined, vv ? JSON.stringify(vv.meaning) : '-');
  const rq = (id.R || [])[0] && id.R[0].qs && id.R[0].qs[0];
  check('locale id: pertanyaan reading tetap teks sumber',
    !!rq && rq[0] === 'ID-STEM', rq ? JSON.stringify(rq[0]) : '-');
  const cz = (id.CLOZE_BANK || [])[0];
  check('locale id: penjelasan cloze tetap teks sumber',
    !!cz && cz.explain && cz.explain.why === 'ID-KENAPA', cz ? JSON.stringify(cz.explain) : '-');
  check('locale id: diagnosis miskonsepsi tetap teks sumber',
    (id.GRAMMAR_MISCONCEPTION_ID || {})[misconKey] === 'ID-DIAGNOSIS', '-');
}

// Sidecar belum terunduh (offline parsial) tidak boleh melempar: aturan fail-soft yang sama
// dengan sidecar bank lain — murid th offline harus tetap bisa belajar dengan teks sumber.
try {
  const kosong = {
    console, JSON, Object, Array, String, Number, Boolean, Math,
    CONTENT_BASE: {
      items: [{ skill: 'grammar', item: itemGrammarSumber() }],
      g: {},
      v: [{ id: vocabId, meaning: 'ID-ARTI', example: 'She goes to school.' }],
      r: [{ id: bacaanId, qs: [['ID-STEM', ['ID-OPSI-1', 'ID-OPSI-2'], 0, {}]] }],
    },
    GRAMMAR_ITEMS: [], G: {}, V: [], R: [],
    placementListeningBank: null, CLOZE_BANK: null,
    CLOZE_BANK_BASE: [{ id: clozeId, explain: { why: 'ID-KENAPA' }, distractors: [{ text: clozeDistraktor, reason: 'ID-ALASAN' }] }],
    GRAMMAR_MISCONCEPTION_ID: null, GRAMMAR_MISCONCEPTION_BASE: { [misconKey]: 'ID-DIAGNOSIS' },
    __fzSyncShellElements() {},
    WRITING_BANK: JSON.parse(JSON.stringify(writingSrc)),
    READING_EXAM: JSON.parse(JSON.stringify(readingSrc)),
    self: { FiezelI18n: { getLocale: () => 'th' }, FiezelThData: null },
  };
  kosong.globalThis = kosong;
  vm.createContext(kosong);
  vm.runInContext(kode + '\napplyContentLocale();', kosong, { timeout: 5000 });
  check('sidecar absen: overlay tidak melempar (fail-soft)', true);
} catch (e) {
  check('sidecar absen: overlay tidak melempar (fail-soft)', false, String(e && e.message || e));
}

let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}
console.log(`\nth-content-overlay-test: ${pass}/${checks.length} PASS${failed ? ' — GAGAL (terjemahan th menganggur, murid tetap membaca Indonesia)' : ''}`);
process.exit(failed ? 1 : 0);
