// m025-146 — gate untuk Listening berformat ujian.
//
// Tiga hal yang dijaga, dan ketiganya lebih mudah dilanggar daripada terlihat:
// 1. Audio diputar SEKALI. IELTS dan TOEFL tidak pernah mengulang. Bank harian memberi
//    maxReplays 2; latihan yang mengizinkan pengulangan melatih kebiasaan yang menghancurkan
//    skor di ruang ujian - kesalahan sejenis dengan target 120 kata untuk esai 250 kata.
// 2. TOEFL menyembunyikan soal sampai audio selesai. Kalau soal terlihat sejak awal, yang
//    dilatih bukan menyimak melainkan mencari-cari.
// 3. Kunci jawabannya benar. Kunci yang salah lebih buruk daripada tidak ada soal, jadi gate
//    menjalankan penilai yang asli DAN mencocokkan tiap jawaban isian ke skripnya.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const bank = JSON.parse(fs.readFileSync(path.join(root, 'features/speaking-listening/listening-exam-v1.json'), 'utf8'));
const addon = fs.readFileSync(path.join(root, 'features/speaking-listening/fiezel-speaking-listening-addon.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};
const words = t => (String(t || '').match(/[A-Za-z']+/g) || []).length;
const normalize = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// --- 1. skema dan cakupan ----------------------------------------------------------------
check('Listening exam schema', bank.schema === 'fiezel-listening-exam-v1' && Array.isArray(bank.sets) && bank.sets.length > 0, `schema=${bank.schema} sets=${bank.sets?.length}`);
check('Declared count matches the bank', Number(bank.count) === bank.sets.length, `declared=${bank.count} actual=${bank.sets.length}`);
check('Unique set identities', new Set(bank.sets.map(s => s.id)).size === bank.sets.length, `${bank.sets.length} set`);
const allQuestions = bank.sets.flatMap(s => s.questions.map(q => ({ set: s, q })));
check('Unique question identities', new Set(allQuestions.map(x => x.q.id)).size === allQuestions.length, `${allQuestions.length} soal`);

const formats = bank.examFormats || {};
check('All four IELTS listening sections are present',
  ['ielts_listening_s1', 'ielts_listening_s2', 'ielts_listening_s3', 'ielts_listening_s4'].every(id => bank.sets.some(s => s.exam === id)),
  [...new Set(bank.sets.map(s => s.exam))].filter(x => x.startsWith('ielts')));
check('Both TOEFL listening kinds are present',
  ['toefl_listening_conversation', 'toefl_listening_lecture'].every(id => bank.sets.some(s => s.exam === id)),
  [...new Set(bank.sets.map(s => s.exam))].filter(x => x.startsWith('toefl')));
check('Every set points at a format that exists', bank.sets.every(s => formats[s.exam]), [...new Set(bank.sets.map(s => s.exam))]);

// --- 2. kontrak ujian --------------------------------------------------------------------
const replayViolations = Object.entries(formats).filter(([, f]) => Number(f.replays) !== 1);
check('Every exam format plays the audio exactly once', replayViolations.length === 0,
  replayViolations.length ? replayViolations.map(([id, f]) => `${id}=${f.replays}`) : 'IELTS dan TOEFL tidak pernah mengulang audio');
check('IELTS shows its questions during the audio',
  Object.entries(formats).filter(([id]) => id.startsWith('ielts')).every(([, f]) => f.questionsVisibleDuringAudio === true),
  'membaca, mendengar, dan menulis serentak adalah keterampilan yang diuji IELTS');
check('TOEFL hides its questions until the audio ends',
  Object.entries(formats).filter(([id]) => id.startsWith('toefl')).every(([, f]) => f.questionsVisibleDuringAudio === false),
  'kalau soalnya terlihat sejak awal, yang dilatih mencari-cari, bukan menyimak dan mencatat');
check('Every format explains what it asks for', Object.values(formats).every(f => f.label && String(f.note || '').length > 40), Object.keys(formats));

const shortScripts = bank.sets.filter(s => words(s.script) < 400);
check('Every script is long enough to be exam listening', shortScripts.length === 0,
  shortScripts.length ? shortScripts.map(s => `${s.id}=${words(s.script)}`) : bank.sets.map(s => `${s.id}=${words(s.script)}`).join(', '));
check('Declared word counts match the scripts', bank.sets.every(s => s.wordCount === words(s.script)), bank.sets.map(s => `${s.id}:${s.wordCount}/${words(s.script)}`));
check('Every set carries enough questions for one audio', bank.sets.every(s => s.questions.length >= 6), bank.sets.map(s => `${s.id}=${s.questions.length}`));

// --- 3. kejujuran ------------------------------------------------------------------------
check('The bank states it predicts no band or score', /tidak memprediksi band IELTS atau skor TOEFL/i.test(String(bank.honesty || '')), bank.honesty || 'missing');
check('The bank admits the audio is synthesised from original scripts',
  bank.audioSource?.kind === 'tts_original_script' && /berhak cipta/i.test(String(bank.audioSource?.why || '')) && String(bank.audioSource?.limitation || '').length > 40,
  bank.audioSource || 'missing');
check('The single-voice limitation is stated, not hidden',
  /satu suara/i.test(String(bank.honesty || '') + String(bank.audioSource?.limitation || '')),
  'percakapan multi-pembicara diputar satu suara; itu harus diakui');
check('Adapted question forms say so',
  /adaptasi/i.test(String(formats.ielts_listening_s2?.note || '')),
  'soal denah asli butuh gambar; penggantinya harus mengaku sebagai adaptasi');

// --- 4. kunci jawaban ---------------------------------------------------------------------
const badChoice = allQuestions.filter(({ q }) => q.answerType === 'choice' &&
  !(Array.isArray(q.options) && q.options.length >= 3 && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length));
check('Every choice question has a valid key and enough options', badChoice.length === 0, badChoice.map(x => x.q.id));
const dupOptions = allQuestions.filter(({ q }) => q.answerType === 'choice' && new Set(q.options.map(o => normalize(o))).size !== q.options.length);
check('No choice question repeats an option', dupOptions.length === 0, dupOptions.map(x => x.q.id));
const badCompletion = allQuestions.filter(({ q }) => q.answerType === 'completion' && !(Array.isArray(q.accept) && q.accept.length && q.accept.every(a => String(a).trim())));
check('Every completion question carries an accept list', badCompletion.length === 0, badCompletion.map(x => x.q.id));
check('Every question explains its answer', allQuestions.every(({ q }) => String(q.explain || '').length > 20), 'kunci tanpa alasan tidak mengajarkan apa pun');

// Yang paling penting: jawaban isian harus benar-benar dapat didengar di skripnya.
//
// Sebagian jawaban IELTS memang DIEJA ("L S nine, four T P") dan karena itu tidak muncul
// sebagai teks di skrip - justru mentranskripsikannya itulah soalnya. Untuk kasus begitu,
// soal wajib mengutip frasa yang mendiktekannya lewat `spokenAs`, dan frasa ITU yang
// diverifikasi. Yang tidak boleh adalah kunci yang tidak tertelusur ke skrip sama sekali.
const unfindable = allQuestions.filter(({ set, q }) => {
  if (q.answerType !== 'completion') return false;
  const haystack = normalize(set.script);
  if (q.accept.some(a => haystack.includes(normalize(a)))) return true === false;
  return !(q.spokenAs && haystack.includes(normalize(q.spokenAs)));
});
check('Every completion answer is traceable to its script', unfindable.length === 0,
  unfindable.length ? unfindable.map(x => `${x.q.id}: ${x.q.accept.join(' / ')}`) : `${allQuestions.filter(x => x.q.answerType === 'completion').length} jawaban isian tercocokkan ke skripnya`);
const spelled = allQuestions.filter(({ q }) => q.spokenAs);
check('Spelled-out answers quote the phrase that dictates them', spelled.length > 0 && spelled.every(({ set, q }) =>
  normalize(set.script).includes(normalize(q.spokenAs))), spelled.map(x => x.q.id));

// --- 5. penilai yang asli, dijalankan ------------------------------------------------------
function sourceBlock(name, source = addon) {
  const start = source.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n\s{0,4}function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}
const blocks = ['scoreListeningExamAnswer', 'scoreListeningExamSet'].map(n => sourceBlock(n));
check('The exam scorer is exposed as pure functions', blocks.every(Boolean), blocks.map((b, i) => (b ? '' : ['scoreListeningExamAnswer', 'scoreListeningExamSet'][i])).filter(Boolean).join(', ') || 'keduanya ditemukan');

const sandbox = { normalizeText: normalize };
vm.createContext(sandbox);
vm.runInContext(blocks.join('\n'), sandbox, { timeout: 2000 });
const runSet = (set, responses) => {
  sandbox.__set = set; sandbox.__responses = responses;
  return vm.runInContext('scoreListeningExamSet(__set, __responses)', sandbox, { timeout: 2000 });
};

// Kunci resmi harus mencetak 100. Kalau tidak, ada kunci yang salah.
const perfectFailures = bank.sets.filter(set => {
  const responses = set.questions.map(q => q.answerType === 'choice' ? q.answerIndex : q.accept[0]);
  return runSet(set, responses).score !== 100;
});
check('The official answer key scores 100 on every set', perfectFailures.length === 0,
  perfectFailures.length ? perfectFailures.map(s => `${s.id}=${runSet(s, s.questions.map(q => q.answerType === 'choice' ? q.answerIndex : q.accept[0])).score}`) : `${bank.sets.length} set`);

// Setiap varian yang dijanjikan diterima harus benar-benar diterima.
const rejectedVariants = [];
for (const { set, q } of allQuestions) {
  if (q.answerType !== 'completion') continue;
  for (const variant of q.accept) {
    const responses = set.questions.map(x => x.id === q.id ? variant : (x.answerType === 'choice' ? x.answerIndex : x.accept[0]));
    if (runSet(set, responses).score !== 100) rejectedVariants.push(`${q.id}:${variant}`);
  }
}
check('Every accepted variant is really accepted', rejectedVariants.length === 0, rejectedVariants);

const firstSet = bank.sets[0];
const firstSetForShape = firstSet;
check('Case and spacing do not change the mark', (() => {
  const responses = firstSet.questions.map(q => q.answerType === 'choice' ? q.answerIndex : `  ${String(q.accept[0]).toUpperCase()}  `);
  return runSet(firstSet, responses).score === 100;
})(), 'murid tidak boleh dihukum karena huruf besar atau spasi berlebih');
check('A wrong answer is marked wrong', (() => {
  const responses = firstSet.questions.map(q => q.answerType === 'choice' ? (q.answerIndex + 1) % q.options.length : 'zzz tidak mungkin');
  return runSet(firstSet, responses).score === 0;
})(), 'penilai yang selalu memberi nilai bukan penilai');
check('Blank answers score zero, not partial credit',
  runSet(firstSet, firstSet.questions.map(() => '')).score === 0,
  'kemiripan parsial akan memberi nilai untuk jawaban yang di ujian dihitung salah');
check('The scorer refuses to convert to a band or score', (() => {
  const source = blocks.join('\n');
  // Yang dilarang adalah MENGELUARKAN band/skor ujian, bukan menyebut kata itu di komentar.
  const emitsBand = /\b(band|bandScore|ieltsBand|toeflScore)\s*:/.test(source);
  const result = runSet(firstSetForShape, firstSetForShape.questions.map(q => q.answerType === 'choice' ? q.answerIndex : q.accept[0]));
  return !emitsBand && result.metric === 'exam_answer_key' && !('band' in result) && !('toeflScore' in result);
})(), 'konversi band berbeda tiap sesi ujian; menirunya berarti mengarang angka');

// --- 6. runtime ---------------------------------------------------------------------------
check('The addon loads the listening exam bank without making it fatal',
  /async loadListeningExam\(\)/.test(addon) && /catch\(_\)\{return false\}/.test(addon), 'Skills Lab harian tidak boleh mati karena berkas baru');
check('The listening exam domain has its own renderer',
  /'listening_exam'/.test(addon) && /renderListeningExam\(/.test(addon), 'domain baru butuh renderer sendiri');
const renderer = addon.slice(addon.indexOf('renderListeningExam(set,progress){'), addon.indexOf('renderSpeakingExam(item,progress){'));
check('The renderer takes its replay limit from the exam format, not the daily config',
  /Number\(format\.replays\)/.test(renderer) && !/maxListeningReplays/.test(renderer),
  'config harian mengizinkan dua kali putar; kontrak ujian tidak boleh tunduk padanya');
check('The renderer honours the TOEFL hidden-questions rule',
  /questionsVisibleDuringAudio/.test(renderer) && /data-notes/.test(renderer),
  'soal disembunyikan sampai audio habis, dan murid diberi tempat mencatat');
/* Pasca-#242: naskah "Soal tetap terkunci" pindah ke copy-map i18n
   (skillslab.audio-tidak-can-diputar-item di copy-id-feat-b.js). Cek kini menilai
   kontrak utuh: renderer memanggil kunci i18n-nya + naskah persis ada di copy-map
   (pola product-audit 4448d14). */
const copyFeatB = require('fs').readFileSync(require('path').join(__dirname,'features','i18n','copy-id-feat-b.js'),'utf8');
check('Failed audio keeps the questions locked',
  /audio-tidak-can-diputar-item/.test(renderer) && /this\.replays--/.test(renderer) && /Soal tetap terkunci/.test(copyFeatB),
  'menjawab tanpa mendengar bukan latihan, dan percobaan yang gagal tidak boleh menghabiskan jatah putar');
/* m025-202: assert ini dulu menuntut `){const` DALAM SATU BARIS TANPA SPASI, jadi ia merah
   begitu wave i18n memformat ulang fungsinya ke beberapa baris - padahal kontraknya utuh
   (listeningExamFor masih menormalkan level di baris pertamanya). Gerbang yang merah karena
   pemformatan mengajari orang mengabaikan gerbang. Spasi dilonggarkan; yang dijaga tetap sama:
   level MASUK dan langsung dinormalkan sebelum dipakai menyaring. Kelas temuan D20 (assert
   proximity -> struktural). */
check('Exam sessions are level-scoped like everything else',
  /listeningExamFor\(level\)\s*\{\s*const\s+target\s*=\s*normalizeLevel\(level\)/.test(addon), 'kontrak level m025-136 berlaku di sini juga');
check('The listening exam bank is precached for offline use', /listening-exam-v1\.json/.test(sw), 'shell offline harus membawanya juga');

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  counts: {
    pass: checks.filter(i => i.status === 'PASS').length,
    fail: checks.filter(i => i.status === 'FAIL').length,
    sets: bank.sets.length,
    questions: allQuestions.length,
    scriptWords: bank.sets.reduce((n, s) => n + words(s.script), 0)
  },
  checks
};
fs.writeFileSync(path.join(root, 'LISTENING-EXAM-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
