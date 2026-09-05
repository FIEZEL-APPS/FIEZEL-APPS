const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// m025-145 â€” gate untuk Speaking berformat ujian.
//
// Dua hal yang dijaga, dan keduanya lebih mudah dilanggar daripada terlihat:
// 1. Kontrak waktunya harus benar. Latihan yang memberi 60 detik untuk TOEFL Task 1 melatih
//    murid pada ujian yang tidak ada - dan murid baru tahu di ruang ujian.
// 2. Klaim penilaiannya harus jujur. FIEZEL membaca transkrip, jadi ia bisa menghitung
//    cakupan gagasan dan TIDAK bisa menilai pelafalan. Rubrik yang diam soal itu berbohong.
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'features/speaking-listening/speaking-exam-v1.json'), 'utf8'));
const addon = fs.readFileSync(path.join(root, 'features/speaking-listening/fiezel-speaking-listening-addon.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

check('Speaking exam schema', bank.schema === 'fiezel-speaking-exam-v1' && Array.isArray(bank.items) && bank.items.length > 0, `schema=${bank.schema} items=${bank.items?.length}`);
check('Declared count matches the bank', Number(bank.count) === bank.items.length, `declared=${bank.count} actual=${bank.items.length}`);
check('Unique item identities', new Set(bank.items.map(i => i.id)).size === bank.items.length, `${bank.items.length} item`);

// --- kontrak waktu, dicocokkan dengan ujian yang sebenarnya ------------------------------
// Angka-angka ini bukan pilihan desain FIEZEL; ia milik ujiannya.
const REAL = {
  ielts_speaking_part1: { prepSeconds: 0 },
  ielts_speaking_part2: { prepSeconds: 60, speakSeconds: 120 },
  ielts_speaking_part3: { prepSeconds: 0 },
  toefl_speaking_task1: { prepSeconds: 15, speakSeconds: 45 },
  toefl_speaking_task2_adapted: { prepSeconds: 30, speakSeconds: 60 },
  toefl_speaking_task3_adapted: { prepSeconds: 30, speakSeconds: 60 },
  toefl_speaking_task4_adapted: { prepSeconds: 20, speakSeconds: 60 }
};
const formats = bank.examFormats || {};
const wrongTiming = Object.entries(REAL).filter(([id, expected]) => {
  const actual = formats[id];
  if (!actual) return true;
  return Object.entries(expected).some(([key, value]) => Number(actual[key]) !== value);
});
check('Every exam format carries the real preparation and speaking time', wrongTiming.length === 0,
  wrongTiming.map(([id]) => `${id}: ${JSON.stringify(formats[id] || null)}`));
check('Every format explains what the task actually asks for', Object.values(formats).every(f => f.label && f.note && String(f.note).length > 40), Object.keys(formats));
check('Every item points at a format that exists', bank.items.every(i => formats[i.exam]), [...new Set(bank.items.map(i => i.exam))]);

// --- cakupan bentuk ujian ---------------------------------------------------------------
check('All three IELTS Speaking parts are present',
  ['ielts_speaking_part1', 'ielts_speaking_part2', 'ielts_speaking_part3'].every(id => bank.items.some(i => i.exam === id)),
  [...new Set(bank.items.map(i => i.exam))].filter(x => x.startsWith('ielts')));
check('All four TOEFL Speaking tasks are present',
  ['toefl_speaking_task1', 'toefl_speaking_task2_adapted', 'toefl_speaking_task3_adapted', 'toefl_speaking_task4_adapted'].every(id => bank.items.some(i => i.exam === id)),
  [...new Set(bank.items.map(i => i.exam))].filter(x => x.startsWith('toefl')));
check('Part 2 items carry a four-bullet cue card', bank.items.filter(i => i.exam === 'ielts_speaking_part2').every(i => Array.isArray(i.cueCard) && i.cueCard.length === 4),
  'kartu IELTS Part 2 selalu punya empat butir, dan butir terakhir yang paling sering terlewat');
check('Part 3 items carry discussion follow-ups', bank.items.filter(i => i.exam === 'ielts_speaking_part3').every(i => Array.isArray(i.followUps) && i.followUps.length >= 3), 'Part 3 adalah diskusi, bukan satu pertanyaan');
check('Integrated tasks carry the source they must be summarised from',
  bank.items.filter(i => /task[234]/.test(i.exam)).every(i => String(i.sourceText || '').length > 200), 'tugas integrated tanpa sumber hanya jadi soal opini');

// --- kejujuran ---------------------------------------------------------------------------
check('Adapted formats admit what was changed',
  Object.entries(formats).filter(([id]) => id.includes('adapted')).every(([, f]) => /ADAPTASI/.test(f.note)) &&
    bank.items.filter(i => i.exam.includes('adapted')).every(i => /ADAPTASI/i.test(String(i.sourceNote || ''))),
  'aslinya memakai audio; menyajikannya tertulis harus dinyatakan, bukan didiamkan');
check('The bank states it predicts no band and judges no pronunciation',
  /tidak memprediksi band IELTS atau skor TOEFL/i.test(String(bank.honesty || '')) && /TIDAK menilai pelafalan/i.test(String(bank.honesty || '')),
  bank.honesty || 'missing');

const criteria = bank.rubric?.criteria || [];
check('Rubric follows the IELTS Speaking criterion families', criteria.length === 4 &&
  ['fluency_coherence', 'lexical_resource', 'grammatical_range_accuracy', 'pronunciation'].every(id => criteria.some(c => c.id === id)), criteria.map(c => c.id));
check('Every criterion is a full 0-4 band set', criteria.every(c => Array.isArray(c.levels) && c.levels.length === 5 && c.levels.every(x => String(x).length > 20)), 'tiap kriteria butuh deskriptor 0..4');
check('Each criterion says whether a machine can score it, and why',
  criteria.every(c => typeof c.machineScored === 'boolean' && String(c.why || '').length > 40), criteria.map(c => `${c.id}:${c.machineScored}`));
const pronunciation = criteria.find(c => c.id === 'pronunciation');
check('Pronunciation is explicitly NOT machine-scored', pronunciation && pronunciation.machineScored === false && /TIDAK menilai pelafalan/.test(pronunciation.why),
  'skor pengenalan ucapan naik-turun karena mikrofon dan kebisingan; memakainya sebagai nilai pelafalan menghukum murid atas perangkatnya');
check('Exactly one criterion is claimed as machine-scored', criteria.filter(c => c.machineScored).length === 1,
  criteria.filter(c => c.machineScored).map(c => c.id));
check('Every item keeps the coverage-only scoring claim',
  bank.items.every(i => i.scoring?.claim === 'spoken_production_coverage_not_pronunciation'), 'klaim penilaian tidak boleh berubah diam-diam per item');
check('No item persists raw audio or transcript',
  bank.items.every(i => i.privacy?.persistRawAudio === false && i.privacy?.persistRawTranscript === false), 'kontrak privasi Skills Lab berlaku sama untuk latihan ujian');

// --- runtime ------------------------------------------------------------------------------
check('The addon loads the exam bank without making it fatal', /async loadExam\(\)/.test(addon) && /catch\(_\)\{return false\}/.test(addon),
  'Skills Lab harian tidak boleh mati hanya karena berkas latihan ujian belum ada');
check('The exam domain is a real session domain', /'speaking_exam'/.test(addon) && /renderSpeakingExam\(/.test(addon), 'domain baru harus punya renderer sendiri');
/* 2026-08-30: lihat catatan kembar di tests/listening-exam-test.js. Assert ini menuntut `){const`
   dalam SATU BARIS TANPA SPASI dan merah begitu wave i18n memformat ulang examFor() ke
   beberapa baris - padahal kontraknya utuh. Spasi dilonggarkan; yang dijaga tetap sama. */
check('Exam sessions are level-scoped like everything else', /examFor\(level\)\s*\{\s*const\s+target\s*=\s*normalizeLevel\(level\)/.test(addon), 'kontrak level m025-136 berlaku di sini juga');
check('Voice controls are bound from one shared place', /bindSpeakingControls\(item\)\{/.test(addon) && (addon.match(/this\.bindSpeakingControls\(item\)/g) || []).length === 2,
  'menyalin pengikatan dua kali berarti perbaikan privasi hanya sampai ke salah satunya');
check('The exam renderer shows the timing contract to the learner', /fsl-timing/.test(addon) && /prepSeconds/.test(addon),
  'menyembunyikan waktunya berarti melatih soal ujian tanpa tekanan ujiannya');
check('The exam bank is precached for offline use', /speaking-exam-v1\.json/.test(sw), 'shell offline harus membawanya juga');

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  counts: {
    pass: checks.filter(i => i.status === 'PASS').length,
    fail: checks.filter(i => i.status === 'FAIL').length,
    items: bank.items.length,
    formats: Object.keys(formats).length
  },
  checks
};
fs.writeFileSync(path.join(root, 'SPEAKING-EXAM-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
