// m025-231 — gerbang untuk OVERLAY Thai pada bank berformat ujian.
//
// Kenapa gerbang ini ada. Sebelum m025-231 bank ujian Listening lolos SELURUHNYA dari
// setiap audit yang ada: overlay lama mencocokkan id set (lx-ielts-s1, …) ke peta
// listening-bank-th.json yang isinya hanya kunci listen_sc_*. Pencocokan itu tidak
// pernah kena sasaran satu kali pun, jadi setiap set ujian - judul, penjelasan tiap
// soal, catatan format, dan paragraf honesty - selalu jatuh ke teks Indonesia, di dalam
// cangkang antarmuka yang sudah Thai. Tidak ada satu pun test yang melihatnya, karena
// semua gerbang purity memeriksa ISI sidecar dan tidak ada yang memeriksa bahwa sidecar
// itu benar-benar SAMPAI ke murid.
//
// Maka yang diperiksa di sini bukan mutu terjemahan (itu tugas tests/th-bank-purity-test.js)
// melainkan SATU hal: teks Thai yang ada di sidecar benar-benar keluar dari jalur baca
// yang dipakai penyaji. Fixture-nya sengaja sintetis dan mencolok (awalan TH-) supaya
// kegagalan pencocokan id tidak bisa menyamar sebagai keberhasilan.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok, details });
  if (!ok) failed = true;
};

// Addon adalah UMD dan menyentuh global saat dimuat; sediakan yang minimum.
global.self = global;
const addon = require(path.join(root, 'features/speaking-listening/fiezel-speaking-listening-addon.js'));

const Repo = (addon.__test && addon.__test.DataRepository) || null;
check('addon mengekspor Repo untuk diuji', !!Repo, 'ekspor __test: ' + Object.keys(addon.__test || {}).join(', '));

if (Repo) {
  const srcListening = JSON.parse(fs.readFileSync(path.join(root, 'features/speaking-listening/listening-exam-v1.json'), 'utf8'));
  const srcSpeaking = JSON.parse(fs.readFileSync(path.join(root, 'features/speaking-listening/speaking-exam-v1.json'), 'utf8'));

  const repo = new Repo('./');
  repo.listeningExam = srcListening.sets;
  repo.listeningFormats = srcListening.examFormats || {};
  repo.listeningHonesty = String(srcListening.honesty || '');
  repo.speakingExam = srcSpeaking.items;
  repo.examFormats = srcSpeaking.examFormats || {};
  repo.examHonesty = String(srcSpeaking.honesty || '');

  const set0 = srcListening.sets[0];
  const q0 = set0.questions[0];
  const fmtKey = set0.exam;
  const spk0 = srcSpeaking.items.find(i => i.exam && srcSpeaking.examFormats[i.exam]) || srcSpeaking.items[0];

  // Fixture sintetis: kalau pencocokan id meleset, nilai TH- ini tidak akan pernah muncul.
  global.FiezelThData = {
    listeningExam: {
      sets: {
        [set0.id]: { title: 'TH-JUDUL', questions: { [q0.id]: { explain: 'TH-PENJELASAN' } } },
      },
      examFormats: { [fmtKey]: { note: 'TH-CATATAN' } },
      honesty: 'TH-HONESTY',
    },
    speakingExam: {
      examFormats: spk0.exam ? { [spk0.exam]: { note: 'TH-CATATAN-SPEAKING' } } : {},
      honesty: 'TH-HONESTY-SPEAKING',
    },
  };
  global.FiezelThLoader = { isThActive: () => true };

  const rows = repo.listeningExamFor(set0.level);
  const got = rows.find(r => r.id === set0.id);

  check('listening exam: judul set memakai teks Thai',
    !!got && got.title === 'TH-JUDUL', got ? JSON.stringify(got.title) : 'set tidak ditemukan');

  const gotQ = got && (got.questions || []).find(q => q.id === q0.id);
  check('listening exam: penjelasan soal memakai teks Thai',
    !!gotQ && gotQ.explain === 'TH-PENJELASAN', gotQ ? JSON.stringify(gotQ.explain) : 'soal tidak ditemukan');

  // Kontrak terpenting dari penggabungan bersarang: urutan dan kunci jawaban milik SUMBER
  // harus utuh. Satu soal yang bergeser diam-diam mengubah jawaban benar tanpa jejak.
  check('listening exam: urutan soal dan kunci jawaban milik sumber tetap utuh',
    !!got && got.questions.length === set0.questions.length
      && got.questions.every((q, i) => q.id === set0.questions[i].id
        && q.answerIndex === set0.questions[i].answerIndex
        && JSON.stringify(q.options) === JSON.stringify(set0.questions[i].options)),
    got ? got.questions.length + ' vs ' + set0.questions.length : '-');

  const fmt = repo.listeningFormat(set0);
  check('listening exam: catatan format memakai teks Thai',
    !!fmt && fmt.note === 'TH-CATATAN', fmt ? JSON.stringify(fmt.note) : 'format null');
  check('listening exam: label format sumber tetap ada saat sidecar hanya menimpa catatan',
    !!fmt && fmt.label === (srcListening.examFormats[fmtKey] || {}).label, fmt ? JSON.stringify(fmt.label) : '-');

  check('listening exam: paragraf honesty memakai teks Thai',
    repo.listeningHonestyText() === 'TH-HONESTY', JSON.stringify(repo.listeningHonestyText()).slice(0, 60));

  check('speaking exam: paragraf honesty memakai teks Thai',
    repo.examHonestyText() === 'TH-HONESTY-SPEAKING', JSON.stringify(repo.examHonestyText()).slice(0, 60));
  if (spk0.exam) {
    const sfmt = repo.examFormat(spk0);
    check('speaking exam: catatan format memakai teks Thai',
      !!sfmt && sfmt.note === 'TH-CATATAN-SPEAKING', sfmt ? JSON.stringify(sfmt.note) : 'format null');
  }

  // Sisi sebaliknya, dan ini yang menjaga murid Indonesia: begitu locale bukan th,
  // TIDAK BOLEH ada satu pun teks Thai yang bocor ke jalur baca yang sama.
  global.FiezelThLoader = { isThActive: () => false };
  const rowsId = repo.listeningExamFor(set0.level);
  const gotId = rowsId.find(r => r.id === set0.id);
  check('locale id: judul kembali ke teks sumber',
    !!gotId && gotId.title === set0.title, gotId ? JSON.stringify(gotId.title).slice(0, 50) : '-');
  check('locale id: honesty kembali ke teks sumber',
    repo.listeningHonestyText() === repo.listeningHonesty, '-');
  check('locale id: catatan format kembali ke teks sumber',
    (repo.listeningFormat(set0) || {}).note === (srcListening.examFormats[fmtKey] || {}).note, '-');

  // Sidecar belum terunduh (offline parsial) tidak boleh melempar - ia harus diam-diam
  // memakai teks sumber, aturan fail-soft yang sama dengan sidecar bank lain.
  global.FiezelThLoader = { isThActive: () => true };
  global.FiezelThData = { listeningExam: null, speakingExam: null };
  let aman = true;
  try {
    repo.listeningExamFor(set0.level);
    repo.listeningFormat(set0);
    repo.listeningHonestyText();
    repo.examHonestyText();
  } catch (e) { aman = false; }
  check('sidecar absen: jalur baca tidak melempar (fail-soft)', aman, '-');
}

let pass = 0;
for (const c of checks) {
  if (c.ok) pass += 1;
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.ok || !c.details ? '' : `\n      → ${c.details}`}`);
}
console.log(`\nth-exam-overlay-test: ${pass}/${checks.length} PASS${failed ? ' — GAGAL (sidecar th tidak sampai ke murid)' : ''}`);
process.exit(failed ? 1 : 0);
