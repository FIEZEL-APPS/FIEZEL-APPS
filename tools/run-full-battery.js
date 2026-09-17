const { execSync } = require('child_process');

const tests = [
  { name: 'Grammar Quality Audit', cmd: 'node grammar-quality-audit.js' },
  { name: 'Cloze Bank Sync', cmd: 'node tools/build-cloze-bank.js' },
  { name: 'Reading Exam Test', cmd: 'npm run test:reading-exam' },
  { name: 'Listening Exam Test', cmd: 'npm run test:listening-exam' },
  { name: 'Speaking Exam Test', cmd: 'npm run test:speaking-exam' },
  { name: 'Writing Rubric Test', cmd: 'npm run test:writing-rubric' },
  { name: 'Grammar Curriculum Test', cmd: 'npm run test:grammar-curriculum' },
  { name: 'Grammar Unlock Test', cmd: 'npm run test:grammar-unlock' },
  { name: 'Grammar Memory Scope Test', cmd: 'npm run test:grammar-memory-scope' },
  { name: 'Level Evidence Test', cmd: 'npm run test:level-evidence' },
  { name: 'Level Contract Test', cmd: 'npm run test:level-contract' },
  { name: 'Prerequisite Graph Test', cmd: 'npm run test:prerequisite-graph' },
  { name: 'Teacher Content Test', cmd: 'npm run test:teacher-content' },
  { name: 'Content Integrity Gate', cmd: 'node tests/content-integrity-gate-test.js' },
  { name: 'Thai Bank Purity Test', cmd: 'node tests/th-bank-purity-test.js' },
  { name: 'Thai Coverage Test', cmd: 'node tests/th-coverage-test.js' },
  { name: 'Thai i18n Check', cmd: 'npm run i18n:check' },
  { name: 'ID Golden Snapshot', cmd: 'node tests/id-golden-snapshot-test.js' }
];

console.log('Running full verification of 18 test suites...\n');
let passed = 0;
let failed = 0;

for (const t of tests) {
  try {
    execSync(t.cmd, { stdio: 'pipe' });
    console.log(`PASS: ${t.name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${t.name}`);
    if (err.stdout) console.error(err.stdout.toString().slice(-400));
    if (err.stderr) console.error(err.stderr.toString().slice(-400));
    failed++;
  }
}

console.log(`\nResults: ${passed}/${tests.length} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
