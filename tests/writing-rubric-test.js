const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// m025-138 — gate untuk B-10: bank prompt Writing dan rubrik analitik.
//
// Dua hal yang dijaga gate ini, dan keduanya pernah gagal di produk ini sebelumnya:
// 1. Cakupan. B2, C1, dan C2 pernah punya SATU prompt masing-masing - tidak mungkin
//    berlatih ujian dengan satu soal.
// 2. Kejujuran. Cek offline tidak boleh berpura-pura mengeluarkan skor, dan tidak boleh
//    ada janji band IELTS atau skor TOEFL di mana pun jalur Writing.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const bank = JSON.parse(fs.readFileSync(path.join(root, 'writing-prompts-v1.json'), 'utf8'));

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};
function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// --- 1. bank dan skema ------------------------------------------------------------------
check('Writing bank schema', bank.schema === 'fiezel-writing-prompts-v1' && bank.schemaVersion === '1.0.0' && Array.isArray(bank.prompts), `schema=${bank.schema}`);
check('Declared prompt count matches the bank', bank.promptCount === bank.prompts.length, `declared=${bank.promptCount} actual=${bank.prompts.length}`);
check('Unique prompt identities', new Set(bank.prompts.map(p => p.id)).size === bank.prompts.length, `ids=${new Set(bank.prompts.map(p => p.id)).size}`);

const perLevel = Object.fromEntries(LEVELS.map(level => [level, bank.prompts.filter(p => p.level === level)]));
check('At least six prompts per level', LEVELS.every(level => perLevel[level].length >= 6), Object.fromEntries(LEVELS.map(l => [l, perLevel[l].length])));
check('Only known CEFR levels', bank.prompts.every(p => LEVELS.includes(p.level)), 'setiap prompt harus terikat satu level');
check('Every prompt carries both languages and a focus', bank.prompts.every(p => p.en && p.id_hint && p.focus), 'en, id_hint, dan focus wajib ada');
check(
  'Genre diversity within every level',
  LEVELS.every(level => new Set(perLevel[level].map(p => p.genre)).size >= 3),
  Object.fromEntries(LEVELS.map(l => [l, new Set(perLevel[l].map(p => p.genre)).size]))
);

// --- 2. bentuk ujian --------------------------------------------------------------------
const examIds = Object.keys(bank.examTasks || {});
check('Exam task contracts are complete', examIds.length > 0 && examIds.every(id => {
  const task = bank.examTasks[id];
  return task.label && Number(task.minWords) > 0 && Number(task.minutes) > 0 && task.note;
}), examIds);
check('Every examTask reference resolves', bank.prompts.every(p => !p.examTask || examIds.includes(p.examTask)), 'tidak boleh ada prompt menunjuk kontrak ujian yang tidak ada');
check(
  'Exam-shaped practice exists from B1 upward',
  ['B1', 'B2', 'C1', 'C2'].every(level => perLevel[level].some(p => p.examTask)),
  Object.fromEntries(['B1', 'B2', 'C1', 'C2'].map(l => [l, perLevel[l].filter(p => p.examTask).length]))
);
check(
  'Both IELTS and TOEFL shapes are covered',
  bank.prompts.some(p => String(p.examTask || '').startsWith('ielts')) && bank.prompts.some(p => String(p.examTask || '').startsWith('toefl')),
  [...new Set(bank.prompts.map(p => p.examTask).filter(Boolean))]
);
check(
  'Adapted exam formats say so',
  bank.prompts.filter(p => String(p.examTask || '').includes('adapted')).every(p => p.sourceNote) &&
    examIds.filter(id => id.includes('adapted')).every(id => /adaptasi|ADAPTASI/.test(bank.examTasks[id].note)),
  'format yang tidak bisa direplikasi penuh harus mengaku sebagai adaptasi'
);
check(
  'Prompt targets never undercut the exam minimum',
  bank.prompts.every(p => !p.examTask || Number(p.target) >= Number(bank.examTasks[p.examTask].minWords)),
  'target di bawah batas ujian akan melatih murid menulis terlalu pendek'
);

// --- 3. rubrik --------------------------------------------------------------------------
const criteria = bank.rubric?.criteria || [];
check('Rubric has five analytic criteria', criteria.length === 5, criteria.map(c => c.id));
check('Rubric covers the IELTS criterion families', ['task_response', 'coherence_cohesion', 'lexical_resource', 'grammatical_range_accuracy'].every(id => criteria.some(c => c.id === id)), criteria.map(c => c.id));
check('Every criterion is a full 0-4 band set', criteria.every(c => Array.isArray(c.levels) && c.levels.length === 5 && c.levels.every(x => typeof x === 'string' && x.length > 20)), 'tiap kriteria butuh deskriptor 0,1,2,3,4');
check('Every criterion states what it asks', criteria.every(c => c.label && c.labelEn && c.asks), 'label, labelEn, dan asks wajib ada');
check('Rubric scale is declared', bank.rubric?.scale?.min === 0 && bank.rubric?.scale?.max === 4, JSON.stringify(bank.rubric?.scale));

// --- 4. kejujuran -----------------------------------------------------------------------
check('Bank carries an explicit no-prediction statement', /tidak memprediksi skor/i.test(String(bank.honesty || '')), bank.honesty || 'missing');
const feedbackBlock = sourceBlock('requestWritingFeedback');
check('AI prompt forbids band and score claims', /jangan menyebut band IELTS atau skor TOEFL/i.test(feedbackBlock), 'AI tidak boleh mengarang band');
check('AI prompt asks for the same rubric the learner sees', /writingRubricCriteria\s*\(/.test(feedbackBlock) && /0-4/.test(feedbackBlock), 'rubrik murid dan rubrik AI harus satu sumber');

/* Hotfix CI pasca-#242 (lanjutan AI-20 F06 kategori 2a): nilai naskah review kini hidup di
   copy-map sebagai FiezelI18n.t('kunci'). Resolver ini mengganti referensi t() dengan nilai id
   VERBATIM dari features/i18n/copy-id-*.js sehingga semua asersi kunci->nilai di bawah tetap
   menguji teks yang benar-benar dilihat murid (byte-identik, dijaga id-golden-snapshot). */
function resolveI18nRefs(text){
  const dir=path.join(root,'features','i18n');
  if(!fs.existsSync(dir))return text;
  const map={};
  for(const n of fs.readdirSync(dir).filter(n=>/^copy-id-.*\.js$/.test(n))){
    const src=fs.readFileSync(path.join(dir,n),'utf8');
    const re=/'((?:[^'\\]|\\.)+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g;let m;
    while((m=re.exec(src)))map[m[1]]=m[2];
  }
  return text.replace(/FiezelI18n\.t\('((?:[^'\\]|\\.)+)'\)/g,(w,k)=>Object.prototype.hasOwnProperty.call(map,k)?"'"+map[k]+"'":w);
}
const reviewBlock = sourceBlock('writingLocalReview');
const reviewBlockResolved=resolveI18nRefs(reviewBlock||'');
check('Offline review does not invent a score', Boolean(reviewBlock) && !/\d\s*\/\s*4/.test(reviewBlockResolved) && /bukan penilaian bahasa dan bukan skor/i.test(reviewBlockResolved), 'cek offline hanya boleh mengaku memeriksa bentuk');

// --- 4b. jalur Cloudflare (worker) --------------------------------------------------------
// Jalur default saat transport task menyala adalah Worker (app.js:7223), bukan Puter — dan
// gerbang lama hanya membaca app.js, jadi worker bisa melanggar kontrak tanpa ketahuan
// (temuan A06: prompt worker membuang rubrik dan teks soal, meminta prosa sambil
// jsonMode:true ⇒ 22/25 jawaban "{}"). Bagian ini menegakkan kontrak yang sama di worker.
const AiTasks = require(path.join(root, 'workers/api/ai/ai-tasks.js'));
const wfSpec = AiTasks.get('writing_feedback');
const wfInput = {
  text: 'I am very sorry about your book. I will replace it with a new copy this week. Please tell me which edition you prefer.',
  promptId: String(bank.prompts[0].id),
  promptText: 'You borrowed a book from a classmate and damaged it. Write a letter: apologise, explain what happened, and say how you will fix it.',
  examBrief: 'IELTS GT Task 1 (surat). Minimal 150 kata, 20 menit.',
  level: 'B1',
  rubricId: String(bank.rubric.id)
};
check(
  'Worker accepts the task text and exam brief as guarded input',
  AiTasks.validate({ schema: AiTasks.REQUEST_SCHEMA, task: 'writing_feedback', input: wfInput, locale: 'id' }).ok === true &&
    AiTasks.validate({ schema: AiTasks.REQUEST_SCHEMA, task: 'writing_feedback', input: { ...wfInput, promptText: 'x'.repeat(600) }, locale: 'id' }).ok === false,
  'promptText/examBrief opsional, dibatasi maxLength'
);
const wfPrompt = AiTasks.buildPrompt('writing_feedback', wfInput, 'id');
check('Worker prompt embeds the actual task text, not just the prompt id', wfPrompt.includes(wfInput.promptText) && wfPrompt.includes(wfInput.examBrief), 'model harus melihat apa yang soal minta');
check(
  'Worker prompt carries the same five criteria and 0-4 scale the learner sees',
  criteria.length === 5 && criteria.every(c => wfPrompt.includes(c.label) && wfPrompt.includes(c.asks)) && /0-4/.test(wfPrompt),
  'rubrik murid dan rubrik worker harus satu isi — kalau bank berubah, salinan di ai-tasks.js wajib ikut'
);
check('Worker prompt forbids band and score claims too', /jangan menyebut band IELTS atau skor TOEFL/i.test(wfPrompt) && /siap atau belum siap ujian/i.test(wfPrompt), 'aturan kejujuran berlaku di setiap transport');
check('Worker output mode matches the prose the client renders', wfSpec.jsonMode === false, 'app.js:5096 renderMarkdown mengonsumsi prosa; response_format json_object bertentangan dengan prompt prosa');
const wfSample = [
  'Penuntasan tugas: 3/4 - permintaan maaf dan rencana ganti rugi ada, penjelasan kejadiannya masih tipis.',
  'Keruntutan dan keterkaitan: 3/4 - urutan gagasannya mudah diikuti.',
  'Kekayaan kosakata: 2/4 - kata "book" diulang terus, coba "copy" atau "edition".',
  'Ragam dan ketepatan tata bahasa: 3/4 - kalimat majemukmu benar.',
  'Nada dan kerapian: 3/4 - nadanya sopan dan pas untuk teman sekelas.',
  'Satu langkah berikutnya: tambahkan satu kalimat yang menjelaskan bagaimana bukunya rusak supaya semua butir soal terjawab.',
  'Sebelum / sesudah: "I very sorry about book." menjadi "I am very sorry about your book."'
].join('\n');
check('Feedback in the demanded format passes the worker output contract', AiTasks.checkOutputContract('writing_feedback', wfSample).ok === true, 'format yang diminta prompt harus lulus pemeriksa keluaran worker sendiri');

// --- 5. fixture: jalankan penilai bentuk yang asli ---------------------------------------
const blocks = ['countWords', 'writingExamTask', 'writingTargetWords', 'writingFormSignals', 'writingFormChecklist'].map(name => sourceBlock(name));
check('Form checker is exposed as pure functions', blocks.every(Boolean), blocks.map((b, i) => (b ? '' : ['countWords', 'writingExamTask', 'writingTargetWords', 'writingFormSignals', 'writingFormChecklist'][i])).filter(Boolean).join(', ') || 'all found');

function runChecklist(prompt, text) {
  const sandbox = { WRITING_BANK: bank };
  vm.createContext(sandbox);
vm.runInContext("if(typeof globalThis.self==='undefined')globalThis.self=globalThis;if(typeof globalThis.window==='undefined')globalThis.window=globalThis;",sandbox);
/* Harness i18n (pola W1-TESTPLAN 2b, hotfix CI pasca-#242): muat runtime i18n + copy-id sebelum kode app dievaluasi. existsSync = hijau dua arah. */
const __i18nRt=path.join(root,'features','i18n','fiezel-i18n.js');
if(fs.existsSync(__i18nRt)){vm.runInContext(fs.readFileSync(__i18nRt,'utf8'),sandbox,{filename:'fiezel-i18n.js'});
for(const __n of fs.readdirSync(path.join(root,'features','i18n')).filter(n=>/^copy-id-.*\.js$/.test(n)).sort()){
vm.runInContext(fs.readFileSync(path.join(root,'features','i18n',__n),'utf8'),sandbox,{filename:__n});}}

  vm.runInContext(blocks.join('\n'), sandbox, { timeout: 2000 });
  sandbox.__prompt = prompt;
  sandbox.__text = text;
  return vm.runInContext('writingFormChecklist(__prompt, __text)', sandbox, { timeout: 2000 });
}

const task2 = bank.prompts.find(p => p.examTask === 'ielts_task2');
const shortEssay = runChecklist(task2, 'I agree with this statement because studying is important. It helps students.');
const taskRow = shortEssay.find(row => row.criterion === 'task_response');
check(
  'A 249-word shortfall is reported against the exam minimum, not a soft target',
  taskRow.status === 'perhatikan' && /di bawah batas/.test(taskRow.note) && taskRow.note.includes(String(bank.examTasks.ielts_task2.minWords)),
  taskRow.note
);
const longEnough = Array.from({ length: 260 }, (_, i) => `word${i % 40}`).join(' ');
const longRow = runChecklist(task2, `${longEnough}.`).find(row => row.criterion === 'task_response');
check('Meeting the exam minimum clears the task-response form check', longRow.status === 'ok', longRow.note);
const paragraphRow = runChecklist(task2, 'One.\n\nTwo.\n\nThree.').find(row => row.criterion === 'coherence_cohesion');
check('Three paragraphs clear the structure form check', paragraphRow.status === 'ok', paragraphRow.note);
const repeatRow = runChecklist(task2, `${'students '.repeat(6)}learn every day in class.`).find(row => row.criterion === 'lexical_resource');
check('Heavy repetition is surfaced', repeatRow.status === 'perhatikan' && /students/.test(repeatRow.note), repeatRow.note);
const honestRows = runChecklist(task2, longEnough).filter(row => row.status === 'ai');
check(
  'Criteria that cannot be measured offline admit it',
  honestRows.length === 2 && honestRows.every(row => /AI|membaca/i.test(row.note)),
  honestRows.map(row => row.criterion)
);
check(
  'Every checklist row maps to a real rubric criterion',
  runChecklist(task2, longEnough).every(row => criteria.some(c => c.id === row.criterion)),
  'checklist tidak boleh menyebut kriteria yang tidak ada di rubrik'
);

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  bank: bank.version,
  counts: {
    pass: checks.filter(item => item.status === 'PASS').length,
    fail: checks.filter(item => item.status === 'FAIL').length,
    prompts: bank.prompts.length,
    perLevel: Object.fromEntries(LEVELS.map(l => [l, perLevel[l].length])),
    examShaped: bank.prompts.filter(p => p.examTask).length,
    criteria: criteria.length
  },
  checks
};
fs.writeFileSync(path.join(root, 'WRITING-RUBRIC-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
