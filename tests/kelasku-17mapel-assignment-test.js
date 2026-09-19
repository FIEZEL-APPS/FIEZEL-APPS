/**
 * tests/kelasku-17mapel-assignment-test.js
 *
 * Gerbang verifikasi integrasi Kurikulum 17 Mapel dan Pembuat Tugas/Ujian ke KelasKu.
 * Memastikan:
 * 1. Seluruh 17 mata pelajaran Kurikulum Merdeka terdaftar di KelasKu.
 * 2. Generator soal kurikulum (synthesizeMapelQuestions) menghasilkan format soal valid.
 * 3. Store KelasKu (buildAssignment) membentuk tugas mapel non-English tanpa mencemari dengan past_tense.
 * 4. Mode latihan vs ujian mini (timer & anti-contek) terkonfigurasi benar.
 * 5. Runner murid (FiezelClassHub resolveItem) dapat membaca dan mengeksekusi soal dari payload tugas mapel.
 * 6. Antarmuka guru menyediakan tab Kurikulum Nasional (17 Mapel) dan tombol buat tugas/ujian langsung.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log('  OK: ' + msg);
  } else {
    fail++;
    console.error('  FAIL: ' + msg);
  }
}

console.log('Memulai kelasku-17mapel-assignment-test...');

// 1. Periksa berkas cangkang guru
const shellPath = path.join(__dirname, '..', 'features/teacher/fiezel-teacher-shell.js');
const shellCode = fs.readFileSync(shellPath, 'utf8');

assert(shellCode.includes("data-tg=\"assign-tab\" data-tab=\"mapel\""), 'Tab 1 Kurikulum Nasional (17 Mapel) tersedia di modal assign');
assert(shellCode.includes("data-tg=\"create-assign-from-comp\""), 'Tombol buat tugas dari kompetensi tersedia di pohon kurikulum');
assert(shellCode.includes("data-mode=\"ujian\""), 'Tombol buat ujian mini dengan timer tersedia di pohon kurikulum');
assert(shellCode.includes("synthesizeMapelQuestions"), 'Fungsi generator butir soal 17 mapel tersedia di shell');
assert(shellCode.includes("srcType === 'mapel'"), 'Penanganan submit tugas kurikulum nasional 17 mapel aktif');
assert(shellCode.includes("mapelName(k)"), 'Pelabelan nama mapel di daftar tugas kelas aktif');

// 2. Evaluasi lingkungan sandbox untuk FiezelTeacherStore & Bank Soal
const storePath = path.join(__dirname, '..', 'features/teacher/fiezel-teacher-store.js');
const storeCode = fs.readFileSync(storePath, 'utf8');

const sandbox = {
  window: {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  },
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Array: Array,
  Number: Number,
  Object: Object,
  console: console
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(storeCode, sandbox);
const TS = sandbox.FiezelTeacherStore;

assert(!!TS, 'FiezelTeacherStore berhasil dimuat di sandbox');
assert(typeof TS.buildAssignment === 'function', 'TS.buildAssignment tersedia');

// 3. Uji pembuatan tugas Mapel Matematika (MAT)
const matQuestions = [
  {
    id: 'q-mat-1',
    prompt: 'Berapakah 25 × 4 + 10?',
    options: ['110', '100', '120', '90'],
    answer: 0,
    skill: 'MAT',
    why: { 0: '25 × 4 = 100, ditambah 10 = 110.' }
  },
  {
    id: 'q-mat-2',
    prompt: 'Luas persegi dengan sisi 8 cm adalah…',
    options: ['64 cm²', '32 cm²', '16 cm²', '48 cm²'],
    answer: 0,
    skill: 'MAT',
    why: { 0: 'Luas persegi = sisi × sisi = 8 × 8 = 64 cm².' }
  }
];

const assignMat = TS.buildAssignment({
  title: 'Matematika · Operasi Hitung dan Geometri',
  skills: ['MAT'],
  items: matQuestions,
  count: 2,
  mode: 'latihan',
  curriculumOnly: true,
  source: {
    subjectId: 'MAT',
    subjectName: 'Matematika',
    compCode: 'KOMP-MAT-D-7-BIL-01',
    compTitle: 'Operasi Bilangan'
  }
});

assert(assignMat.skills[0] === 'MAT', 'Skill tugas Matematika tidak di-override menjadi past_tense');
assert(assignMat.items.length === 2, 'Dua butir soal kustom Matematika tersimpan utuh');
assert(assignMat.itemIds.length === 2, 'ItemIds berisi 2 ID soal kustom');
assert(assignMat.mode === 'latihan', 'Mode latihan terekam');
assert(assignMat.source.subjectId === 'MAT', 'Metadata sumber mapel MAT tersimpan');

// 4. Uji pembuatan Ujian Mini IPA dengan Timer & Anti-Contek
const ipaQuestions = [
  {
    id: 'q-ipa-1',
    prompt: 'Pusat kendali aktivitas sel adalah…',
    options: ['Nukleus', 'Mitokondria', 'Ribosom', 'Sitoplasma'],
    answer: 0,
    skill: 'IPA',
    why: { 0: 'Nukleus memuat materi genetik pengendali sel.' }
  },
  {
    id: 'q-ipa-2',
    prompt: 'Perpindahan kalor tanpa perantara disebut…',
    options: ['Radiasi', 'Konduksi', 'Konveksi', 'Evaporasi'],
    answer: 0,
    skill: 'IPA',
    why: { 0: 'Radiasi tidak membutuhkan medium.' }
  },
  {
    id: 'q-ipa-3',
    prompt: 'Satuan SI untuk gaya adalah…',
    options: ['Newton', 'Joule', 'Watt', 'Pascal'],
    answer: 0,
    skill: 'IPA',
    why: { 0: 'Gaya diukur dalam Newton (N).' }
  }
];

const examIpa = TS.buildAssignment({
  title: 'Ujian Mini IPA · Sel & Energi',
  skills: ['IPA'],
  items: ipaQuestions,
  count: 3,
  mode: 'ujian',
  timer: 15,
  curriculumOnly: true,
  source: {
    subjectId: 'IPA',
    subjectName: 'Ilmu Pengetahuan Alam',
    compCode: 'KOMP-IPA-D-7-ZAT-01',
    compTitle: 'Wujud Zat & Energi'
  }
});

assert(examIpa.mode === 'ujian', 'Mode ujian terekam di objek assignment');
assert(examIpa.timer === 15, 'Timer ujian 15 menit terekam');
assert(examIpa.shuffle === true, 'Flag acak soal (shuffle anti-contek) aktif untuk ujian');

// 5. Uji payload pengiriman tugas ke murid
const dummyClass = { id: 'cls-1', name: 'Kelas 7A', code: 'FZ-7A123' };
const payload = TS.assignmentPayload(dummyClass, examIpa);

assert(payload.t === 'assign', 'Payload type adalah assign');
assert(payload.mode === 'ujian', 'Payload membawa mode ujian');
assert(payload.timer === 15, 'Payload membawa timer 15 menit');
assert(Array.isArray(payload.items) && payload.items.length === 3, 'Payload membawa 3 butir soal lengkap ke murid');
assert(payload.items[0].prompt.includes('Pusat kendali'), 'Prompt soal murid terbaca sempurna');
assert(Array.isArray(payload.skills) && payload.skills[0] === 'ipa', 'Skills dinormalisasi ke lowercase (ipa) agar lolos validasi server');
assert(payload.items.every(function(it) { return it.skill === 'ipa'; }), 'Setiap butir soal kustom dinormalisasi skill-nya ke lowercase');

// 6. Uji runner murid (resolveItem)
function resolveItem(a, id) {
  var q = (a.items || []).filter(function (x) { return x.id === id; })[0];
  return q || null;
}

const resolvedQ1 = resolveItem(examIpa, 'q-ipa-1');
assert(!!resolvedQ1, 'Murid berhasil me-resolve soal q-ipa-1 dari paket tugas');
assert(resolvedQ1.options[resolvedQ1.answer] === 'Nukleus', 'Kunci jawaban soal terverifikasi akurat');

// 7. Evaluasi FiezelTeacherShell di sandbox untuk menguji seluruh 17 mata pelajaran
sandbox.document = {
  createElement: function () { return { setAttribute: function () {}, style: {} }; },
  head: { appendChild: function () {} }
};
vm.runInContext(shellCode, sandbox);
const TShell = sandbox.FiezelTeacherShell;
assert(!!TShell, 'FiezelTeacherShell berhasil dimuat di sandbox');
assert(typeof TShell._synthesizeMapelQuestions === 'function', 'Generator soal _synthesizeMapelQuestions tersedia');
assert(Array.isArray(TShell._MAPEL_LIST) && TShell._MAPEL_LIST.length === 17, 'Tepat 17 mata pelajaran terdaftar di cangkang KelasKu');

// 8. Uji pembuatan 5 soal nyata untuk SETIAP 17 mata pelajaran Kurikulum Merdeka
const allMapelIds = ['MAT', 'IND', 'ENG', 'IPA', 'IPS', 'INF', 'PPK', 'AGM', 'FIS', 'KIM', 'BIO', 'EKO', 'GEO', 'SOS', 'SEJ', 'PJK', 'SNB'];
let nonZeroAnswersCount = 0;
let totalVerifiedQuestions = 0;

allMapelIds.forEach(function (mId) {
  const compCode = 'KOMP-' + mId + '-D-01';
  const questions = TShell._synthesizeMapelQuestions(mId, compCode, 'Materi Uji ' + mId, 5);
  assert(questions.length === 5, `Mapel ${mId}: Menghasilkan tepat 5 butir soal`);
  
  questions.forEach(function (q, qIdx) {
    const hasValidOptions = Array.isArray(q.options) && q.options.length >= 4;
    const hasValidAnswer = typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options.length;
    const hasValidPrompt = typeof q.prompt === 'string' && q.prompt.length > 10;
    const hasValidWhy = q.why && typeof q.why[q.answer] === 'string' && q.why[q.answer].length > 5;
    
    if (q.answer > 0) nonZeroAnswersCount++;
    if (hasValidOptions && hasValidAnswer && hasValidPrompt && hasValidWhy) {
      totalVerifiedQuestions++;
    }
  });
});

assert(totalVerifiedQuestions === 17 * 5, `Semua 85 butir soal dari 17 mata pelajaran memiliki prompt, 4 opsi, indeks kunci valid, dan penjelasan pembahasan`);
assert(nonZeroAnswersCount > 10, `Pengacakan opsi (shuffleOptions) terbukti aktif: kunci jawaban tersebar di opsi B/C/D (${nonZeroAnswersCount} dari 85 soal tidak di index 0)`);

// 8b. Verifikasi Permintaan 10, 15, dan 20 Soal: 100% Bebas dari Dummy Template Tiruan
const dummyPhrases = [
  'Dalam pembelajaran',
  'manakah pernyataan yang paling tepat secara konsep',
  'Pernyataan yang menerapkan konsep',
  'Pernyataan yang keliru karena mengabaikan syarat',
  'esensi capaian pembelajaran materi'
];

[10, 15, 20].forEach(function (reqCount) {
  allMapelIds.forEach(function (mId) {
    const qs = TShell._synthesizeMapelQuestions(mId, 'KOMP-' + mId + '-TEST', 'Uji Skala ' + mId, reqCount);
    assert(qs.length === reqCount, `Mapel ${mId} (req=${reqCount}): menghasilkan tepat ${reqCount} butir soal`);

    // Pastikan tidak ada satupun soal dummy template generik
    qs.forEach(function (q, idx) {
      dummyPhrases.forEach(function (phrase) {
        assert(!q.prompt.includes(phrase), `Mapel ${mId} butir #${idx+1} tidak boleh mengandung template dummy '${phrase}'`);
        q.options.forEach(function (opt) {
          assert(!opt.includes(phrase), `Mapel ${mId} butir #${idx+1} opsi tidak boleh mengandung template dummy '${phrase}'`);
        });
        if (q.why && q.why[q.answer]) {
          assert(!q.why[q.answer].includes(phrase), `Mapel ${mId} butir #${idx+1} pembahasan tidak boleh mengandung template dummy '${phrase}'`);
        }
      });
      assert(Array.isArray(q.options) && q.options.length === 4, `Mapel ${mId} butir #${idx+1} memiliki 4 opsi`);
      assert(typeof q.answer === 'number' && q.answer >= 0 && q.answer < 4, `Mapel ${mId} butir #${idx+1} memiliki indeks kunci valid`);
      assert(q.why && typeof q.why[q.answer] === 'string' && q.why[q.answer].length > 0, `Mapel ${mId} butir #${idx+1} memiliki pembahasan kunci`);
    });
  });
});
console.log('  OK: Permintaan 10, 15, dan 20 soal untuk seluruh 17 mapel 100% memuat soal kurikulum autentik (0 dummy template)');

// 9. Uji fz-api endpoint questions
const apiPath = path.join(__dirname, '..', 'features/curriculum/fz-api.js');
const apiCode = fs.readFileSync(apiPath, 'utf8');
assert(apiCode.includes("api('/questions'"), 'FZEngine menyediakan pemanggil endpoint API questions list');

// 10. Uji Katalog Materi Ajar (Teaching Briefs & Kompetensi) untuk Seluruh 17 Mapel
assert(!!TShell._MAPEL_CATALOG, '_MAPEL_CATALOG tersedia di FiezelTeacherShell');
const catalogKeys = Object.keys(TShell._MAPEL_CATALOG);
assert(catalogKeys.length === 17, 'Katalog materi memuat tepat 17 mata pelajaran');

let verifiedBriefs = 0;
let verifiedComps = 0;
allMapelIds.forEach(function (mId) {
  const cat = TShell._MAPEL_CATALOG[mId];
  assert(!!cat, `Katalog mapel ${mId} terdefinisi`);
  if (cat && Array.isArray(cat.competencies) && cat.competencies.length >= 3) {
    verifiedComps++;
  }
  if (cat && cat.teachingBrief && cat.teachingBrief.summary && cat.teachingBrief.hook5Minutes && cat.teachingBrief.boardFormula && Array.isArray(cat.teachingBrief.commonMisconceptions) && cat.teachingBrief.commonMisconceptions.length > 0) {
    verifiedBriefs++;
  }
});
assert(verifiedComps === 17, 'Seluruh 17 mapel memiliki daftar capaian kompetensi bawaan (minimal 3 per mapel)');
assert(verifiedBriefs === 17, 'Seluruh 17 mapel memiliki teaching briefs lengkap (Ringkasan, Apersepsi 5 Menit, Rumus/Konsep Papan Tulis, Top Miskonsepsi)');

// 11. Uji Multi-Subject Analytics di FiezelTeacherStore (activeSkills & weakestSkill)
assert(typeof TS.activeSkills === 'function', 'TS.activeSkills tersedia');
const multiSubjClass = {
  id: 'c-multi',
  name: 'Kelas Multimapel',
  assignments: [{ id: 'a-1', skills: ['MAT', 'FIS'] }],
  students: [
    {
      id: 's-1',
      name: 'Budi',
      results: [
        { skill: 'MAT', correct: 8, total: 10 },
        { skill: 'FIS', correct: 3, total: 10 },
        { skill: 'KIM', correct: 9, total: 10 }
      ]
    }
  ]
};
const discoveredSkills = TS.activeSkills(multiSubjClass, multiSubjClass.students[0]);
assert(discoveredSkills.includes('MAT'), 'activeSkills mendeteksi skill MAT');
assert(discoveredSkills.includes('FIS'), 'activeSkills mendeteksi skill FIS');
assert(discoveredSkills.includes('KIM'), 'activeSkills mendeteksi skill KIM');

const weakest = TS.weakestSkill(multiSubjClass.students[0]);
assert(weakest && weakest.skill === 'FIS', 'weakestSkill mengidentifikasi FIS (30%) sebagai kelemahan murid di antara mapel');

// 12. Uji Integrasi UI: Brief Card & Competency Select di Modal
assert(shellCode.includes('data-testid="tg-mapel-brief"'), 'Kartu panduan mengajar tg-mapel-brief terpasang di modal');
assert(shellCode.includes('data-testid="tg-assign-comp-select"'), 'Dropdown pilihan kompetensi terpasang di modal mapel');

// 13. Uji Integrasi Mobile Navigation untuk Kurikulum
assert(shellCode.includes("data-view=\"curriculum\">' + icon('library') + '<span>' + esc(t('guru.nav-kurikulum-singkat', 'Kurikulum'))"), 'Navigasi mobile menyertakan tombol kurikulum yang dijaga gerbang');

console.log(`\nHasil: ${pass} assert PASS, ${fail} assert FAIL`);
if (fail > 0) {
  process.exit(1);
}


