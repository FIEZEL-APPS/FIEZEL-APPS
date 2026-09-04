const fs = require('fs');
const path = require('path');

const root = __dirname;
const grammar = JSON.parse(fs.readFileSync(path.join(root, 'grammar-templates.json'), 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(path.join(root, 'grammar-curriculum-v1.json'), 'utf8'));
const classroom = JSON.parse(fs.readFileSync(path.join(root, 'features/classroom/classroom-lessons-v1.json'), 'utf8'));

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const lessonById = new Map(curriculum.lessons.map(lesson => [lesson.lessonId, lesson]));
const templateBySkill = new Map(grammar.templates.map(template => [template.subskill, template]));

check(
  'Curriculum schema',
  curriculum.schemaVersion === '1.0.0' && curriculum.version === '1.0.0' && Array.isArray(curriculum.lessons),
  `schema=${curriculum.schemaVersion} version=${curriculum.version}`
);
check(
  'Curriculum inventory matches grammar master',
  curriculum.lessonCount === templateBySkill.size && curriculum.lessons.length === templateBySkill.size,
  `curriculum=${curriculum.lessons.length} lessonSubskills=${templateBySkill.size} (templates=${grammar.templates.length}, multi-templat per lesson sejak wave-2)`
);
check(
  'Unique lesson identities',
  lessonById.size === curriculum.lessons.length && lessonById.size === templateBySkill.size,
  `lessons=${lessonById.size} templates=${templateBySkill.size}`
);
check(
  'Contiguous ordered sequence',
  curriculum.lessons.every((lesson, index) => lesson.sequence === index + 1),
  'sequence must run from 1 to lessonCount without gaps or duplicates'
);
check(
  'Allowed CEFR levels',
  curriculum.lessons.every(lesson => levels.includes(lesson.level)),
  'every lesson uses A1, A2, B1, B2, C1, or C2'
);
check(
  'Level metadata counts',
  levels.every(level => curriculum.levelCounts[level] === curriculum.lessons.filter(lesson => lesson.level === level).length),
  JSON.stringify(curriculum.levelCounts)
);

const fieldFailures = [];
for (const lesson of curriculum.lessons) {
  const template = templateBySkill.get(lesson.lessonId);
  if (!template) {
    fieldFailures.push(`${lesson.lessonId}:missing-template`);
    continue;
  }
  if (lesson.level !== template.cefr) fieldFailures.push(`${lesson.lessonId}:level-mismatch`);
  if (!lesson.title || !lesson.unit || !lesson.source || !Array.isArray(lesson.prerequisites)) fieldFailures.push(`${lesson.lessonId}:missing-curriculum-field`);
  if (!Array.isArray(template.options) || template.options.length !== 4 || new Set(template.options.map(String)).size !== 4) fieldFailures.push(`${lesson.lessonId}:options`);
  if (!Number.isInteger(template.correctIndex) || template.correctIndex < 0 || template.correctIndex > 3) fieldFailures.push(`${lesson.lessonId}:correctIndex`);
  if (!Array.isArray(template.distractors) || template.distractors.length !== 3) fieldFailures.push(`${lesson.lessonId}:distractors`);
  if (!template.explanation || ['whyCorrect', 'rule', 'whyOthersFail', 'howToAvoid', 'memoryCue'].some(key => !String(template.explanation[key] || '').trim())) fieldFailures.push(`${lesson.lessonId}:explanation`);
}
check('Lesson and template field completeness', fieldFailures.length === 0, fieldFailures.length ? fieldFailures : 'all lessons have canonical fields');

const prereqFailures = [];
for (const lesson of curriculum.lessons) {
  for (const prerequisite of lesson.prerequisites) {
    const target = lessonById.get(prerequisite);
    if (!target) prereqFailures.push(`${lesson.lessonId}->${prerequisite}:missing`);
    else if (target.sequence >= lesson.sequence) prereqFailures.push(`${lesson.lessonId}->${prerequisite}:not-earlier`);
  }
}
check('Prerequisite graph is ordered and resolvable', prereqFailures.length === 0, prereqFailures.length ? prereqFailures : 'all prerequisites point to earlier lessons');

const expectedA1Order = [
  'subject_object_pronouns_and_possessives', 'be_subject_agreement', 'articles_a_an_the', 'plural_nouns_basic',
  'demonstrative_reference_distance_this_these_that_those', 'possessive_adjectives', 'have_got_has_got',
  'there_is_are', 'place_prepositions_basic', 'present_simple_basics', 'question_words_basic', 'can_ability',
  'present_continuous_basics', 'past_be_was_were', 'past_simple_regular_forms', 'some_any_countable_uncountable',
  'time_prepositions_in_on_at'
];
const actualA1Order = curriculum.lessons.filter(lesson => lesson.level === 'A1').map(lesson => lesson.lessonId);
check('A1 has a complete ordered foundation', JSON.stringify(actualA1Order) === JSON.stringify(expectedA1Order), actualA1Order);
check('A1 level has seventeen lessons', actualA1Order.length === 17, `A1=${actualA1Order.length}`);

const classroomA1 = classroom.lessons.filter(lesson => lesson.category === 'grammar' && lesson.level === 'A1');
const missingClassroomCoverage = classroomA1.filter(lesson => !curriculum.classroomA1Coverage?.[lesson.id]);
const invalidClassroomTargets = classroomA1.filter(lesson => {
  const target = curriculum.classroomA1Coverage?.[lesson.id];
  return target && !lessonById.has(target);
});
check('All classroom A1 grammar lessons are mapped', missingClassroomCoverage.length === 0 && invalidClassroomTargets.length === 0, {
  missing: missingClassroomCoverage.map(lesson => lesson.id),
  invalidTargets: invalidClassroomTargets.map(lesson => lesson.id)
});
check('A1 classroom coverage is fifteen of fifteen', classroomA1.length === 15 && Object.keys(curriculum.classroomA1Coverage || {}).length === 15, `classroomA1=${classroomA1.length} mapped=${Object.keys(curriculum.classroomA1Coverage || {}).length}`);

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  version: curriculum.version,
  counts: {
    pass: checks.filter(item => item.status === 'PASS').length,
    fail: checks.filter(item => item.status === 'FAIL').length,
    lessons: curriculum.lessons.length,
    a1Lessons: actualA1Order.length,
    classroomA1Lessons: classroomA1.length
  },
  checks
};
fs.writeFileSync(path.join(root, 'GRAMMAR-CURRICULUM-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
