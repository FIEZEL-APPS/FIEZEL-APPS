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
function ambilFungsi(nama) {
  const i = src.indexOf('function ' + nama + '(');
  if (i < 0) return '';
  const j = src.indexOf('\nfunction ', i + 10);
  return src.slice(i, j < 0 ? undefined : j);
}

const kode = [ambilFungsi('grammarItemForTh'), ambilFungsi('vocabForLocale'), ambilFungsi('applyContentLocale')].join('\n');
check('applyContentLocale bisa diekstrak dari app.js', kode.includes('function applyContentLocale('), kode.length + ' karakter');

const writingSrc = JSON.parse(fs.readFileSync(path.join(root, 'writing-prompts-v1.json'), 'utf8'));
const readingSrc = JSON.parse(fs.readFileSync(path.join(root, 'reading-exam-v1.json'), 'utf8'));

const promptId = (writingSrc.prompts || [])[0]?.id;
const examTaskKey = Object.keys(writingSrc.examTasks || {})[0];
const passageId = (readingSrc.passages || [])[0]?.id;
const questionId = (readingSrc.passages || [])[0]?.questions?.[0]?.id;

// Fixture sengaja mencolok: kalau pencocokan id meleset, nilai TH- tidak akan pernah muncul.
function buatSandbox(localeTh) {
  const sandbox = {
    console,
    JSON, Object, Array, String, Number, Boolean, Math,
    CONTENT_BASE: { items: [], g: {}, v: [], r: [] },
    GRAMMAR_ITEMS: [], G: {}, V: [], R: [],
    placementListeningBank: null,
    CLOZE_BANK_BASE: null,
    GRAMMAR_MISCONCEPTION_ID: null,
    GRAMMAR_MISCONCEPTION_BASE: null,
    applyClozeLocale() {},
    __fzSyncShellElements() {},
    WRITING_BANK: JSON.parse(JSON.stringify(writingSrc)),
    READING_EXAM: JSON.parse(JSON.stringify(readingSrc)),
    self: {
      FiezelI18n: { getLocale: () => (localeTh ? 'th' : 'id') },
      FiezelThData: {
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
}

// Sidecar belum terunduh (offline parsial) tidak boleh melempar: aturan fail-soft yang sama
// dengan sidecar bank lain — murid th offline harus tetap bisa belajar dengan teks sumber.
try {
  const kosong = {
    console, JSON, Object, Array, String, Number, Boolean, Math,
    CONTENT_BASE: { items: [], g: {}, v: [], r: [] },
    GRAMMAR_ITEMS: [], G: {}, V: [], R: [],
    placementListeningBank: null, CLOZE_BANK_BASE: null, GRAMMAR_MISCONCEPTION_ID: null, GRAMMAR_MISCONCEPTION_BASE: null,
    applyClozeLocale() {},
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
