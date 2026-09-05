const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// m025-137 — gate untuk B-05: prasyarat Grammar harus MENGUNCI, bukan sekadar tampil.
//
// Gate ini sengaja menjalankan lessonUnlockState() yang asli di dalam vm, bukan mencocokkan
// regex. Alasannya: temuan B-05 muncul justru karena kode yang MENYEBUT prasyarat sudah ada
// dan terlihat benar dari luar - yang tidak ada adalah penolakannya. Hanya eksekusi yang
// bisa membedakan keduanya.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'grammar-curriculum-v1.json'), 'utf8'));

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

const thresholdMatch = app.match(/const\s+GRAMMAR_UNLOCK_MASTERY\s*=\s*(\d+)/);
const threshold = thresholdMatch ? Number(thresholdMatch[1]) : NaN;
check(
  'Unlock threshold is an explicit named constant',
  Number.isFinite(threshold) && threshold > 0 && threshold <= 100,
  `GRAMMAR_UNLOCK_MASTERY=${thresholdMatch ? thresholdMatch[1] : 'missing'}`
);
check(
  'Unlock threshold is distinct from the mastered bar',
  /const\s+MASTERY_THRESHOLD\s*=\s*(\d+)/.test(app) && threshold !== Number(app.match(/const\s+MASTERY_THRESHOLD\s*=\s*(\d+)/)[1]),
  'melanjutkan jalur dan "sudah dikuasai" adalah dua ambang yang berbeda'
);

// --- lessonUnlockState() yang asli, dijalankan di atas kurikulum yang asli ---------------
const lessons = curriculum.lessons;
const byId = new Map(lessons.map(lesson => [lesson.lessonId, lesson]));
const blocks = ['grammarMastery', 'lessonUnlockState', 'lessonLockMessage'].map(name => sourceBlock(name));
check('Unlock contract exposes a pure lessonUnlockState()', blocks.every(Boolean), blocks.map((b, i) => (b ? '' : ['grammarMastery', 'lessonUnlockState', 'lessonLockMessage'][i])).filter(Boolean).join(', ') || 'all three helpers found');

function makeSandbox(grammarProgress) {
  return {
    state: { grammar: grammarProgress },
    GRAMMAR_UNLOCK_MASTERY: threshold,
    GRAMMAR_ITEMS: lessons.map(lesson => ({ skill: lesson.lessonId, level: lesson.level, prerequisites: lesson.prerequisites })),
    grammarCurriculumEntry: skill => byId.get(String(skill)) || null,
    friendlySkillName: skill => String(skill)
  };
}

function unlockFor(skill, grammarProgress) {
  const sandbox = makeSandbox(grammarProgress);
  vm.createContext(sandbox);
  vm.runInContext(blocks.join('\n'), sandbox, { timeout: 2000 });
  return vm.runInContext(`lessonUnlockState(${JSON.stringify(skill)})`, sandbox, { timeout: 2000 });
}

const roots = lessons.filter(lesson => !lesson.prerequisites.length);
check(
  'Every level keeps at least one open entry point',
  ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].every(level => lessons.some(lesson => lesson.level === level && !lesson.prerequisites.length)),
  `lessons without prerequisites=${roots.length}`
);
check(
  'A foundation lesson is never locked on an empty profile',
  roots.every(lesson => unlockFor(lesson.lessonId, {}).locked === false),
  'murid baru harus selalu punya pintu masuk'
);

const gated = lessons.filter(lesson => lesson.prerequisites.length);
check(
  'A lesson with unmet prerequisites is locked',
  gated.length > 0 && gated.every(lesson => unlockFor(lesson.lessonId, {}).locked === true),
  `gated lessons=${gated.length}`
);
check(
  'Locking names every prerequisite that is still missing',
  gated.every(lesson => {
    const unlock = unlockFor(lesson.lessonId, {});
    return unlock.missing.length === lesson.prerequisites.length &&
      unlock.missing.every(entry => lesson.prerequisites.includes(entry.skill));
  }),
  'murid harus tahu APA yang menahannya, bukan hanya bahwa ia tertahan'
);

const sample = gated[0];
const justBelow = Object.fromEntries(sample.prerequisites.map(skill => [skill, { mastery: threshold - 1 }]));
const atThreshold = Object.fromEntries(sample.prerequisites.map(skill => [skill, { mastery: threshold }]));
check(
  'Mastery one point below the threshold still locks',
  unlockFor(sample.lessonId, justBelow).locked === true,
  `${sample.lessonId} at mastery ${threshold - 1}`
);
check(
  'Mastery at the threshold unlocks',
  unlockFor(sample.lessonId, atThreshold).locked === false,
  `${sample.lessonId} at mastery ${threshold}`
);
if (sample.prerequisites.length > 1) {
  const partial = { [sample.prerequisites[0]]: { mastery: 100 } };
  check(
    'Partial prerequisites do not unlock',
    unlockFor(sample.lessonId, partial).locked === true,
    `${sample.lessonId} needs all of ${sample.prerequisites.join(', ')}`
  );
}

// Jalur penuh: kerjakan kurikulum berurutan, setiap lesson harus terbuka tepat pada gilirannya.
const progress = {};
const orderViolations = [];
for (const lesson of [...lessons].sort((a, b) => a.sequence - b.sequence)) {
  if (unlockFor(lesson.lessonId, progress).locked) orderViolations.push(lesson.lessonId);
  progress[lesson.lessonId] = { mastery: 100 };
}
check(
  'Walking the curriculum in order never hits a locked lesson',
  orderViolations.length === 0,
  orderViolations.length ? orderViolations.slice(0, 10) : `${lessons.length} lessons reachable in sequence order`
);

// --- penolakan harus ada di SETIAP pintu, bukan hanya di tombol -------------------------
// buildGrammarLessonQuestions() sengaja TIDAK ada di daftar ini. Ia pembangun konten, bukan
// pintu murid: audit inventaris soal harus tetap bisa bertanya "lesson ini punya 25 soal valid
// atau tidak" tanpa bergantung pada progres siapa pun. Yang menutup sesi adalah practiceSkill().
for (const entry of ['openGrammarLesson', 'renderGrammarLesson', 'practiceSkill']) {
  const block = sourceBlock(entry);
  check(
    `${entry}() refuses a locked lesson`,
    /lessonUnlockState\s*\(/.test(block) && /\.locked/.test(block),
    block ? 'entry point consults lessonUnlockState() itself' : `${entry} was not found`
  );
}
const hub = sourceBlock('grammar');
const builder = sourceBlock('buildGrammarLessonQuestions');
check(
  'The content builder stays free of learner progress',
  Boolean(builder) && !/lessonUnlockState\s*\(/.test(builder),
  'inventaris soal harus bisa diaudit tanpa profil murid; penguncian ada di practiceSkill()'
);
check(
  'Grammar Hub disables the button instead of only labelling it',
  /lessonUnlockState\s*\(/.test(hub) && /disabled/.test(hub),
  'kartu terkunci tidak boleh membawa onclick yang aktif'
);
check(
  'Grammar Hub still shows what is waiting ahead',
  /lesson-lock-note|lessonLockMessage/.test(hub),
  'lesson terkunci tetap terlihat supaya jalurnya bisa dibaca murid'
);

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  threshold,
  counts: {
    pass: checks.filter(item => item.status === 'PASS').length,
    fail: checks.filter(item => item.status === 'FAIL').length,
    lessons: lessons.length,
    gatedLessons: gated.length,
    openEntryPoints: roots.length
  },
  checks
};
fs.writeFileSync(path.join(root, 'GRAMMAR-UNLOCK-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
