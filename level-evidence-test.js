// m025-140 — gate untuk B-01 dan B-04: bukti dan sesi terikat pada levelnya sendiri.
//
// Semua pemeriksaan di sini menjalankan fungsi app.js yang asli di dalam vm. Dua temuan yang
// ditutup rilis ini keduanya kegagalan senyap - tidak ada galat, tidak ada tes merah, hanya
// angka yang diam-diam berasal dari level yang salah. Hanya eksekusi yang bisa menangkapnya.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

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

const blocks = ['contentLevelFor', 'historyMatchesActive', 'sessionLevel', 'diagnosticEvidenceRows', 'diagnosticEvidenceReady', 'diagnosticReadinessMap'];
const sources = blocks.map(name => sourceBlock(name));
check('Evidence contract is exposed as pure functions', sources.every(Boolean),
  sources.map((b, i) => (b ? '' : blocks[i])).filter(Boolean).join(', ') || 'all found');

function makeContext(state, activeLevel) {
  const sandbox = {
    LEVELS,
    V: [], R: [], GRAMMAR_ITEMS: [],
    state,
    getActiveLevel: () => activeLevel
  };
  vm.createContext(sandbox);
  vm.runInContext(sources.join('\n'), sandbox, { timeout: 2000 });
  sandbox.__state = state;
  return sandbox;
}
const historyRows = (n, level, at = 1) => Array.from({ length: n }, (_, i) => ({
  at: at + i, ok: i % 3 !== 0, ms: 5000, level,
  type: ['vocab', 'grammar', 'reading'][i % 3],
  skill: ['vocabulary_meaning', 'present_simple_basics', 'reading_detail'][i % 3],
  target: `item-${i}`
}));

// --- B-01 -------------------------------------------------------------------------------
const b1Only = { history: historyRows(24, 'B1'), preferences: { activeLevel: 'A1' } };
const ctxA1 = makeContext(b1Only, 'A1');
const readyAtA1 = vm.runInContext('diagnosticEvidenceReady(__state, "A1")', ctxA1, { timeout: 2000 });
const rowsAtA1 = vm.runInContext('diagnosticEvidenceRows(__state, "A1").length', ctxA1, { timeout: 2000 });
const readyAtB1 = vm.runInContext('diagnosticEvidenceReady(__state, "B1")', ctxA1, { timeout: 2000 });
const rowsAtB1 = vm.runInContext('diagnosticEvidenceRows(__state, "B1").length', ctxA1, { timeout: 2000 });
check('24 answers at B1 do not unlock adaptive practice at A1', readyAtA1 === false, `readyAtA1=${readyAtA1}`);
check('Evidence seen from A1 is zero when every row is B1', rowsAtA1 === 0, `rowsAtA1=${rowsAtA1} of 24`);
check('The same evidence still counts at the level it came from', readyAtB1 === true && rowsAtB1 === 24, `readyAtB1=${readyAtB1} rowsAtB1=${rowsAtB1}`);

const map = vm.runInContext('diagnosticReadinessMap(__state)', ctxA1, { timeout: 2000 });
check('Readiness is reported per level, not as one flag', map && map.B1 === true && LEVELS.filter(l => l !== 'B1').every(l => map[l] === false), map);

const thin = { history: historyRows(23, 'A1'), preferences: { activeLevel: 'A1' } };
check('Twenty-three answers are still not enough', vm.runInContext('diagnosticEvidenceReady(__state, "A1")', makeContext(thin, 'A1'), { timeout: 2000 }) === false, 'ambang 24 jawaban tetap berlaku di dalam level');
const narrow = { history: Array.from({ length: 30 }, (_, i) => ({ at: i + 1, ok: true, level: 'A1', type: 'vocab', skill: 'vocabulary_meaning', target: `v-${i}` })), preferences: { activeLevel: 'A1' } };
check('Thirty answers in one skill are not breadth', vm.runInContext('diagnosticEvidenceReady(__state, "A1")', makeContext(narrow, 'A1'), { timeout: 2000 }) === false, 'butuh minimal 3 skill dan 2 tipe, di dalam level yang sama');

// --- B-04 -------------------------------------------------------------------------------
const ctxSwitch = makeContext({ history: [] }, 'B1');
const startedAtA1 = vm.runInContext('sessionLevel({level:"A1"})', ctxSwitch, { timeout: 2000 });
check('A session started at A1 is still A1 after the learner switches to B1', startedAtA1 === 'A1', `sessionLevel=${startedAtA1} while active=B1`);
check('A session with no level falls back to the active level', vm.runInContext('sessionLevel({})', ctxSwitch, { timeout: 2000 }) === 'B1', 'sesi lama tanpa label tetap harus bisa dinilai');
check('A session with a bogus level is not trusted', vm.runInContext('sessionLevel({level:"Z9"})', ctxSwitch, { timeout: 2000 }) === 'B1', 'label yang tidak dikenal harus jatuh ke level aktif, bukan dipakai apa adanya');

for (const fn of ['beginLearningSession', 'abandonActiveSession', 'completeActiveSession']) {
  const block = sourceBlock(fn);
  check(`${fn}() records the session level`, /level:\s*(getActiveLevel\(\)|sessionLevel\()/.test(block), block ? 'sesi membawa levelnya sendiri' : `${fn} not found`);
}
const outcomeRows = sourceBlock('policyOutcomeSessionRows');
check('Policy outcomes are scored with the session level, not today\'s level', /sessionLevel\s*\(\s*session\s*\)/.test(outcomeRows), outcomeRows ? 'outcome memakai level sesi' : 'policyOutcomeSessionRows not found');

const saveBlock = sourceBlock('save');
check('save() keeps the per-level readiness map current', /adaptiveReadyByLevel\s*=/.test(saveBlock) && /diagnosticReadinessMap\s*\(/.test(saveBlock), 'peta readiness harus ikut diperbarui tiap simpan');
check('The global flag now means "ready at the level you are on"', /adaptiveReady\s*=\s*!!readiness\[getActiveLevel\(state\)\]/.test(saveBlock), 'flag lama dipertahankan artinya, bukan dibiarkan global');
const accuracyBlock = sourceBlock('recentSkillAccuracy');
check('Recent skill accuracy is filtered by level', /historyMatchesActive\s*\(/.test(accuracyBlock), 'akurasi skill dari level lain tidak boleh jadi baseline sesi ini');

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  counts: { pass: checks.filter(i => i.status === 'PASS').length, fail: checks.filter(i => i.status === 'FAIL').length },
  checks
};
fs.writeFileSync(path.join(root, 'LEVEL-EVIDENCE-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
