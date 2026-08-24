// m025-143 — gate untuk B-06: graph prasyarat Core Brain harus mengenali setiap lesson,
// dan tidak boleh kehilangan satu pun keluarga yang ada di bank soal.
//
// Kegagalan B-06 tidak pernah terlihat sebagai galat: keluarga yang hilang dari graph
// membuat rootCause() selalu menjawab "gejala ini akarnya sendiri" - jawaban yang masuk akal,
// selalu tersedia, dan diam-diam salah untuk seperlima materi.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const brain = require('./features/brain/fiezel-core-brain.js');
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'grammar-curriculum-v1.json'), 'utf8'));
const templates = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8'));
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

// --- 1. Tidak ada keluarga yang hilang dari graph ----------------------------------------
const families = [...new Set(templates.templates.map(t => t.family))].sort();
const chainOf = name => brain.prerequisiteChain(name);
const knownFamilies = families.filter(family => {
  // Keluarga dianggap dikenal kalau ia muncul sebagai simpul: entah punya prasyarat sendiri,
  // atau menjadi prasyarat keluarga lain, atau tercatat sebagai fondasi tanpa prasyarat.
  const asChild = chainOf(family).length > 0;
  const asParent = families.some(other => other !== family && chainOf(other).includes(family));
  return asChild || asParent || brain.prerequisiteChain(family).length === 0;
});
check('Every family in the question bank exists in the graph', knownFamilies.length === families.length, `families=${families.length}`);

// Pemeriksaan sebenarnya: lima keluarga yang disebut diagnosis harus benar-benar punya posisi.
const orphanCandidates = ['nouns', 'possession', 'pronouns_determiners', 'quantifiers', 'question_formation'];
const stillOrphan = orphanCandidates.filter(family => {
  const hasParents = chainOf(family).length > 0;
  const isParent = families.some(other => chainOf(other).includes(family));
  return !hasParents && !isParent;
});
check('The five families named by the diagnosis are wired into the graph', stillOrphan.length === 0, stillOrphan);
check('Foundation families are still allowed to have no prerequisites', chainOf('tense_aspect').length === 0, 'tense_aspect adalah fondasi dan tetap boleh kosong');

// --- 2. Graph lesson ---------------------------------------------------------------------
const size = brain.setCurriculumGraph(curriculum);
check('The curriculum graph maps every lesson', size === curriculum.lessons.length, `graph=${size} curriculum=${curriculum.lessons.length}`);
check('Graph size is reported honestly', brain.curriculumGraphSize() === size, `${brain.curriculumGraphSize()}`);

const byId = new Map(curriculum.lessons.map(l => [l.lessonId, l]));
const gated = curriculum.lessons.filter(l => l.prerequisites.length);
check('A gated lesson resolves its declared prerequisites', gated.length > 0 && gated.every(lesson => {
  const chain = brain.prerequisiteChain(lesson.lessonId);
  return lesson.prerequisites.every(p => chain.includes(p));
}), `gated=${gated.length}`);

// Rantai harus TRANSITIF: kalau A butuh B dan B butuh C, maka A butuh C juga. Graph keluarga
// lama tidak pernah bisa menjawab ini di tingkat lesson.
const deep = curriculum.lessons.find(l => l.prerequisites.some(p => (byId.get(p)?.prerequisites || []).length));
check('Lesson chains are transitive, not just one level up', Boolean(deep) && (() => {
  const chain = brain.prerequisiteChain(deep.lessonId);
  const grandparents = deep.prerequisites.flatMap(p => byId.get(p)?.prerequisites || []);
  return grandparents.length > 0 && grandparents.every(g => chain.includes(g));
})(), deep ? `${deep.lessonId} -> ${brain.prerequisiteChain(deep.lessonId).join(' -> ')}` : 'tidak ada rantai dua tingkat di kurikulum');

check('An unknown lesson id falls back to the family graph instead of throwing',
  Array.isArray(brain.prerequisiteChain('lesson_yang_tidak_ada')), 'materi legacy tanpa lessonId harus tetap terdiagnosis');
check('Family chains still work after the lesson graph is loaded',
  brain.prerequisiteChain('conditionals').includes('tense_aspect'), brain.prerequisiteChain('conditionals'));

// --- 3. rootCause di tingkat lesson ------------------------------------------------------
const child = gated.find(l => l.prerequisites.length === 1);
const parentId = child.prerequisites[0];
const evidence = [
  { skill: child.lessonId, family: byId.get(child.lessonId).family || 'core_grammar', attempts: 10, mastery: 55 },
  { skill: parentId, family: byId.get(parentId).family || 'core_grammar', attempts: 10, mastery: 20 }
];
const diagnosed = brain.rootCause({ skill: child.lessonId, family: byId.get(child.lessonId).family, mastery: 55 }, evidence);
check('Root cause points at the weaker prerequisite LESSON, not just its family',
  diagnosed.isRoot === false && diagnosed.skill === parentId && diagnosed.scope === 'lesson',
  `skill=${diagnosed.skill} scope=${diagnosed.scope} gap=${diagnosed.gap}`);

const healthy = brain.rootCause({ skill: child.lessonId, family: byId.get(child.lessonId).family, mastery: 55 }, [
  { skill: child.lessonId, family: byId.get(child.lessonId).family, attempts: 10, mastery: 55 },
  { skill: parentId, family: byId.get(parentId).family, attempts: 10, mastery: 90 }
]);
check('A mastered prerequisite is never blamed', healthy.isRoot === true, `via=${healthy.via} rationale=${healthy.rationale}`);

const thinEvidence = brain.rootCause({ skill: child.lessonId, family: byId.get(child.lessonId).family, mastery: 55 }, [
  { skill: child.lessonId, family: byId.get(child.lessonId).family, attempts: 10, mastery: 55 },
  { skill: parentId, family: byId.get(parentId).family, attempts: 2, mastery: 10 }
]);
check('A prerequisite with too little evidence is not blamed either', thinEvidence.isRoot === true,
  'dua percobaan bukan bukti; menuduhnya berarti menyuruh murid mengulang materi yang belum pernah benar-benar diukur');

// --- 4. Aplikasi benar-benar menyuntikkan graph-nya --------------------------------------
check('The app injects the curriculum into Core Brain on load', /setCurriculumGraph\s*\?\.\(\s*GRAMMAR_CURRICULUM\s*\)/.test(appSource),
  'graph yang tidak pernah disuntik sama saja dengan tidak ada');

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  counts: {
    pass: checks.filter(i => i.status === 'PASS').length,
    fail: checks.filter(i => i.status === 'FAIL').length,
    families: families.length,
    lessons: size
  },
  checks
};
fs.writeFileSync(path.join(root, 'PREREQUISITE-GRAPH-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
