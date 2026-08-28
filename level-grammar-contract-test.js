'use strict';

/**
 * FIEZEL global learner-level and ordered-grammar contract gate.
 *
 * This is intentionally an independent source/data inspection. It does not load
 * app.js in a browser-like VM and it does not mutate any learner state. That makes
 * it safe to run before deployment and useful to a second AI that is applying the
 * implementation in a different checkout.
 *
 * The gate checks four product invariants:
 *   1. One active learner level scopes every learning domain.
 *   2. Grammar lessons have a deterministic CEFR/sequence curriculum.
 *   3. Only placement may intentionally read across all CEFR levels.
 *   4. Switching level persists preferences without deleting domain progress.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const appPath = path.join(root, 'app.js');
const app = fs.readFileSync(appPath, 'utf8');
const index = fs.existsSync(path.join(root, 'index.html'))
  ? fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  : '';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const checks = [];
let failed = false;

function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) failed = true;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return null;
  }
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.audit-tmp') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

function containsAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

// ---------------------------------------------------------------------------
// 1. Curriculum data and deterministic order
// ---------------------------------------------------------------------------

const curriculumCandidates = [
  path.join(root, 'grammar-curriculum-v1.json'),
  path.join(root, 'features', 'grammar', 'grammar-curriculum-v1.json'),
  path.join(root, 'features', 'grammar', 'grammar-curriculum.json'),
  ...walk(root).filter(file => /grammar.*curriculum.*\.json$/i.test(path.basename(file)))
];
const curriculumPath = [...new Set(curriculumCandidates)].find(file => fs.existsSync(file));
const curriculum = curriculumPath ? readJson(curriculumPath) : null;

check(
  'Ordered grammar curriculum exists',
  !!curriculum,
  curriculumPath ? path.relative(root, curriculumPath) : 'No grammar curriculum JSON was found.'
);

function curriculumRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.lessons)) return value.lessons;
  if (Array.isArray(value.items)) return value.items;
  if (Array.isArray(value.units)) return value.units.flatMap(unit =>
    Array.isArray(unit.lessons) ? unit.lessons.map(lesson => ({ ...lesson, unit: lesson.unit || unit.id })) : []
  );
  if (value.levels && typeof value.levels === 'object') {
    return Object.entries(value.levels).flatMap(([level, rows]) =>
      Array.isArray(rows) ? rows.map(row => ({ ...row, level: row.level || level })) : []
    );
  }
  return [];
}

const rows = curriculumRows(curriculum);
const rowLevel = row => String(row.level || row.cefr || row.targetLevel || '').toUpperCase();
const rowOrder = row => Number(row.sequence ?? row.order ?? row.position ?? row.index);
const rowId = row => String(row.id || row.lessonId || row.skill || row.subskill || row.topic || '').trim();
const validRows = rows.filter(row => row && typeof row === 'object');
const badRows = validRows.filter(row => !rowId(row) || !LEVELS.includes(rowLevel(row)) || !Number.isInteger(rowOrder(row)));

check(
  'Curriculum schema carries stable identity, CEFR level, and integer sequence',
  !!curriculum && validRows.length > 0 && badRows.length === 0,
  `rows=${validRows.length} invalid=${badRows.length}`
);

const duplicateIds = [...new Set(validRows.map(rowId).filter(Boolean).filter((id, i, all) => all.indexOf(id) !== i))];
const duplicateOrders = [];
for (const level of LEVELS) {
  const levelRows = validRows.filter(row => rowLevel(row) === level);
  const seen = new Set();
  for (const row of levelRows) {
    const order = rowOrder(row);
    if (seen.has(order)) duplicateOrders.push(`${level}:${order}`);
    seen.add(order);
  }
}
check('Curriculum lesson ids and per-level sequence numbers are unique', duplicateIds.length === 0 && duplicateOrders.length === 0,
  `duplicateIds=${duplicateIds.length} duplicateOrders=${duplicateOrders.length}`);

const unsortedLevels = [];
const missingPrerequisites = [];
for (const level of LEVELS) {
  const levelRows = validRows.filter(row => rowLevel(row) === level);
  const orderList = levelRows.map(rowOrder);
  if (orderList.some((value, i) => i > 0 && value <= orderList[i - 1])) unsortedLevels.push(level);
  const byId = new Map(validRows.map(row => [rowId(row), rowOrder(row)]));
  for (const row of levelRows) {
    const prerequisites = row.prerequisites || row.requires || [];
    if (!Array.isArray(prerequisites)) continue;
    for (const prerequisite of prerequisites) {
      const key = typeof prerequisite === 'string' ? prerequisite : rowId(prerequisite);
      if (!byId.has(key) || byId.get(key) >= rowOrder(row)) missingPrerequisites.push(`${rowId(row)}->${key}`);
    }
  }
}
check('Grammar curriculum is serialized in deterministic learning order', unsortedLevels.length === 0,
  unsortedLevels.length ? `unsorted=${unsortedLevels.join(',')}` : 'every CEFR track is strictly ordered');
check('Grammar prerequisites point to earlier curriculum lessons', missingPrerequisites.length === 0,
  missingPrerequisites.length ? missingPrerequisites.slice(0, 8).join(', ') : 'all prerequisite links resolve');

const a1Rows = validRows.filter(row => rowLevel(row) === 'A1');
check('A1 grammar track contains a usable foundation', a1Rows.length >= 14,
  `A1 lessons=${a1Rows.length}; expected at least 14 ordered foundations`);

const grammarBlock = sourceBlock('grammar');
const grammarOrderBlock = sourceBlock('grammarItemsForLevel');
const grammarQuestionBlock = sourceBlock('makeGrammarQuestion');
const practiceBlock = sourceBlock('practiceSkill');
check('Grammar hub consumes curriculum order instead of object/insertion order',
  /curriculum|sequence|grammarOrder|ordered/i.test(`${grammarBlock}\n${grammarOrderBlock}`) &&
    /sort\s*\([^)]*sequence|sequence[^\n]{0,180}sort/i.test(grammarOrderBlock) &&
    !/Object\.keys\(G\)\s*\.map/.test(grammarBlock),
  grammarBlock ? 'grammar renderer exposes an explicit curriculum/order path' : 'grammar() was not found');
check('Grammar option order may shuffle while lesson order remains stable',
  /shuffle\s*\(/.test(grammarQuestionBlock) && /preserveOrder|ordered|sequence|curriculum|grammarItemsForLevel|sortedGrammarSkillsForLevel/i.test(`${grammarBlock}\n${grammarOrderBlock}\n${practiceBlock}`),
  'option randomization is allowed in question construction; lesson traversal must remain ordered');

// ---------------------------------------------------------------------------
// 2. One active level across every learning domain
// ---------------------------------------------------------------------------

const allSource = `${app}\n${index}`;
const hasActiveField = /(?:activeLevel|learnerLevel|selectedLevel|learningLevel)/i.test(allSource);
const hasCentralResolver = containsAny(allSource, [
  /function\s+(?:get|resolve|read|current|selected|active|effective)[A-Za-z_$]*Level\s*\(/i,
  /(?:get|resolve|read|current|selected|active|effective)[A-Za-z_$]*Level\s*[:=]\s*(?:function|\()/i,
  /Fiezel[A-Za-z]*Level[A-Za-z]*(?:Context|Contract|Scope)/i
]);
check('Active learner level is a named persisted concept', hasActiveField,
  'state/preferences must carry activeLevel or an equivalent learner-level field');
check('A single active-level resolver exists', hasCentralResolver,
  'all panels should call one resolver rather than reading placement state directly');

const domainFunctions = {
  vocabulary: ['vocab', 'startVocabQuiz', 'flashcards', 'reviewVocab'],
  grammar: ['grammar', 'openGrammarLesson', 'practiceSkill'],
  reading: ['reading', 'openReadingLevel', 'startReadingRandom', 'startReadingAdaptive'],
  writing: ['writing', 'writingLevel'],
  classroom: ['classroomBase', 'renderClassroom'],
  adaptive: ['buildAdaptivePool', 'startAdaptive'],
  speakingListening: ['skillsLab']
};
const levelUsagePatterns = [
  /activeLevel|learnerLevel|selectedLevel|learningLevel/i,
  /filterBy(?:Active)?Level|contentForLevel|levelScope|levelContext|effectiveLevel/i,
  /resolve[A-Za-z]*Level|get[A-Za-z]*Level|current[A-Za-z]*Level/i
];
const domainLeaks = [];
for (const [domain, names] of Object.entries(domainFunctions)) {
  const blocks = names.map(name => sourceBlock(name)).filter(Boolean);
  if (!blocks.length) {
    domainLeaks.push(`${domain}:runtime block not found`);
    continue;
  }
  if (!blocks.some(block => containsAny(block, levelUsagePatterns))) domainLeaks.push(`${domain}:no active-level scope`);
}
check('Every learning domain reads the global active level', domainLeaks.length === 0,
  domainLeaks.length ? domainLeaks.join('; ') : 'vocabulary, grammar, reading, writing, classroom, adaptive, and speaking/listening are scoped');

// Explicit level lists are allowed for the placement assessment and the global
// selector. A regular learning panel must not silently use all CEFR levels as its
// content pool.
const crossLevelUses = [];
const levelExpression = /LEVELS\.(?:map|forEach|reduce|filter)|(?:V|R|GRAMMAR_ITEMS|G)\.filter\([^\n]{0,220}level\s*!==|(?:V|R|GRAMMAR_ITEMS|G)\.(?:slice|concat)\(/g;
for (const match of allSource.matchAll(levelExpression)) {
  const before = allSource.slice(0, match.index);
  const fnMatches = [...before.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  const fn = fnMatches.length ? fnMatches[fnMatches.length - 1][1] : 'top-level';
  // diagnosticReadinessMap menyusun peta readiness SATU per level - iterasi LEVELS di sini
  // justru kebalikan dari mencampur level, dan tanpa iterasi itu readiness kembali jadi satu
  // flag global (B-01). Pengecualiannya disebut per nama supaya tetap bisa diaudit.
  if (fn === 'diagnosticReadinessMap') continue;
  if (!/placement|levelPicker|openLevelPanel|activeLevel|setLevel|chooseLevel|settings/i.test(fn)) crossLevelUses.push(`${fn}:${match[0]}`);
}
check('Non-placement learning panels do not use an unscoped cross-level pool', crossLevelUses.length === 0,
  crossLevelUses.length ? crossLevelUses.slice(0, 12).join('; ') : 'cross-level access is isolated to placement/level selection');

const placementBlocks = ['placement', 'startPlacement', 'buildPlacement'].map(name => sourceBlock(name)).filter(Boolean).join('\n');
check('Placement remains the only explicit cross-level exception',
  /placement/i.test(placementBlocks) && /LEVELS|A1|A2|B1|B2|C1|C2/.test(placementBlocks) && /placement\s*:\s*true/i.test(placementBlocks),
  'placement must declare placement:true when it builds the cross-level assessment');

// ---------------------------------------------------------------------------
// 3. Progress continuity when the learner changes active level
// ---------------------------------------------------------------------------

const stateDeclaration = app.match(/const\s+defaultState\s*=\s*(\{[\s\S]{0,1600})/);
check('Domain progress remains separate from active-level preference',
  !!stateDeclaration && /vocab\s*:/.test(stateDeclaration[1]) && /grammar\s*:/.test(stateDeclaration[1]) && /reading\s*:/.test(stateDeclaration[1]) && /preferences\s*:/.test(stateDeclaration[1]),
  'vocab/grammar/reading progress must not be stored as a replaceable level bucket');

const setterMatches = [...app.matchAll(/(?:async\s+)?function\s+((?:set|select|choose|switch|change|update)[A-Za-z_$]*Level[A-Za-z_$]*)\s*\([^)]*\)/gi)];
const setterBlocks = setterMatches.map(match => sourceBlock(match[1])).filter(Boolean);
const setterBody = setterBlocks.join('\n');
check('Active-level changes are implemented through an explicit setter', setterBlocks.length > 0,
  setterMatches.length ? setterMatches.map(match => match[1]).join(', ') : 'no set/select/switch/change/update ... Level function found');
check('Level switching persists without resetting learner progress',
  setterBlocks.length > 0 && /save\s*\(/.test(setterBody) && !/(?:state\.)?(?:vocab|grammar|reading|history|totalAnswered|wrongAnswers)\s*=\s*(?:\{\}|\[\]|0|null)/.test(setterBody),
  setterBlocks.length ? 'setter saves the preference and does not clear domain evidence' : 'cannot verify without an explicit setter');
check('State revision or equivalent cache invalidation follows a level switch',
  setterBlocks.length > 0 && /stateRevision|revision|invalidate|cache|coreBrainCache\s*=\s*null|save\s*\(/i.test(setterBody),
  setterBlocks.length ? 'Core/adaptive caches must not keep the previous level after switching' : 'setter must invalidate level-sensitive caches');

let progressSwitchResult = 'setter unavailable';
if (setterBlocks.length) {
  try {
    // Execute only the small setter in a hermetic fixture. No DOM, storage, network,
    // or app boot is involved. This catches an implementation that appears to persist
    // activeLevel but accidentally clears the learner evidence while doing so.
    const progress = {
      vocab: { word_a: { total: 4, mastery: 75 } },
      grammar: { present_simple_basics: { total: 5, mastery: 60 } },
      reading: { reading_a: { total: 3, mastery: 66 } },
      history: [{ type: 'grammar', skill: 'present_simple_basics', ok: true }],
      totalAnswered: 12,
      preferences: { activeLevel: 'A1', levelMode: 'manual' },
      activeSession: null
    };
    const before = JSON.parse(JSON.stringify({
      vocab: progress.vocab,
      grammar: progress.grammar,
      reading: progress.reading,
      history: progress.history,
      totalAnswered: progress.totalAnswered
    }));
    let saves = 0;
    const sandbox = {
      state: progress,
      LEVELS,
      coreBrainCache: { stale: true },
      getActiveLevel: () => progress.preferences.activeLevel || 'A1',
      activeLevelIsManual: () => LEVELS.includes(String(progress.preferences.activeLevel || '')),
      abandonActiveSession: () => {},
      leaveAllStages: () => {},
      save: () => { saves++; },
      closeModal: () => {},
      render: () => {},
      showToast: () => {},
      // Hotfix i18n pasca-#242 (pola bac8b8d): setter kini memanggil FiezelI18n.t untuk
      // naskah toast — stub resolver cukup, fixture menguji transisi level, bukan copy.
      FiezelI18n: { t: (k, v) => String(k) }
    };
    const setter = vm.runInNewContext(`(${setterBlocks[0]})`, sandbox, { timeout: 1000 });
    const result = setter('B1');
    const after = JSON.parse(JSON.stringify({
      vocab: progress.vocab,
      grammar: progress.grammar,
      reading: progress.reading,
      history: progress.history,
      totalAnswered: progress.totalAnswered
    }));
    const ok = result === true && progress.preferences.activeLevel === 'B1' && saves === 1 &&
      JSON.stringify(after) === JSON.stringify(before) && sandbox.coreBrainCache === null;
    progressSwitchResult = ok ? 'active level changed A1 -> B1 and all evidence remained intact' :
      `unexpected transition: level=${progress.preferences.activeLevel} saves=${saves} progressUnchanged=${JSON.stringify(after) === JSON.stringify(before)}`;
    check('Behavioral progress continuity fixture', ok, progressSwitchResult);
  } catch (error) {
    progressSwitchResult = `setter fixture could not execute: ${error.message}`;
    check('Behavioral progress continuity fixture', false, progressSwitchResult);
  }
}

// ---------------------------------------------------------------------------
// Report and CLI result
// ---------------------------------------------------------------------------

const report = {
  schema: 'fiezel-level-grammar-contract-report-v1',
  generatedAt: new Date().toISOString(),
  status: failed ? 'NOT_READY' : 'PASS',
  curriculum: curriculumPath ? path.relative(root, curriculumPath) : null,
  counts: {
    pass: checks.filter(check => check.status === 'PASS').length,
    fail: checks.filter(check => check.status === 'FAIL').length,
    curriculumRows: validRows.length,
    a1Rows: a1Rows.length,
    domainLeaks: domainLeaks.length,
    crossLevelUses: crossLevelUses.length
  },
  checks
};

const reportPath = path.join(root, 'LEVEL-GRAMMAR-CONTRACT-REPORT.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
