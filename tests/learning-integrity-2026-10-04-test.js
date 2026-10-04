#!/usr/bin/env node
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: gerbang tinggal di tests/, berkas produksi di akar repo. */
/**
 * tests/learning-integrity-2026-10-04-test.js — gerbang perbaikan prioritas tinggi dari tiga audit
 * 2026-10-04 (reports/PLACEMENT-IRT-AUDIT-2026-10-04.md, VOCAB-FSRS-AUDIT-2026-10-04.md,
 * OFFLINE-SYNC-AUDIT-2026-10-04.md).
 *
 * YANG DIJAGA
 *   P-A  mode ukur (tes penempatan, ujian lompat level, gerbang lewati materi) tanpa lampu
 *        petunjuk grammar dan tanpa "intip arti" susun-kata. (Bagian browser-nya ada di
 *        tests/grammar-feedback-regression-test.js C1-C2.)
 *   V-B  kosakata jatuh tempo dari level DI BAWAH level aktif tetap dihitung dan diulang.
 *   V-A  antrean ulangan kosakata diurutkan paling-rawan-lupa dulu, dan "Uji kosakata",
 *        flashcards, serta "Review jatuh tempo" membacanya. (Bentuk kolam "Uji kosakata" dijaga
 *        tests/grammar-vocab-leveling-test.js Test 10.)
 *   F1   dua tab tidak saling menimpa: fungsi simpan SUNGGUHAN dari app.js dijalankan di dua
 *        "tab" yang berbagi satu localStorage, mengulang skenario probe O6.
 *   F2   brainSyncFlush() benar-benar dipanggil (akhir sesi, online, boot, Pengaturan), tetap
 *        lewat gerbang fail-closed.
 *   F3   antrean sinkron tidak macet sesudah riwayat > 350 baris.
 *
 * Node murni, tanpa jaringan, tanpa dependensi npm. Fungsi diambil dari app.js apa adanya.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const upgrade = fs.readFileSync(path.join(ROOT, 'features/grammar/fiezel-grammar-upgrade.js'), 'utf8');
const Continuity = require(path.join(ROOT, 'features/continuity/fiezel-continuity.js'));

let failed = 0, passed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('ok - ' + name); }
  else { failed++; console.error('FAIL - ' + name + (detail ? '\n    ' + detail : '')); }
}
function fn(name, source = app) {
  const start = source.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (start < 0) return '';
  let depth = 0;
  for (let j = source.indexOf('{', start); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; if (depth === 0) return source.slice(start, j + 1); }
  }
  return '';
}
function constant(name) {
  const m = app.match(new RegExp('const ' + name + '=[^;]+;'));
  return m ? m[0] : '';
}
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ---------------------------------------------------------------------------------------
// P-A — mode ukur tanpa bantuan
// ---------------------------------------------------------------------------------------
check('P-A hint button is never rendered under MEASURE or noHints',
  /\$\{\(!MEASURE&&!cfg\.noHints&&\(q\.type==='grammar'\|\|q\.type==='token-order'\|\|q\.type==='video-grammar'\|\|q\.explain\?\.rule\)\)\?`<button id="quizGrammarHint"/.test(app),
  'tombol #quizGrammarHint harus bersyarat !MEASURE&&!cfg.noHints');
check('P-A token-order widget receives the measure flag',
  /renderTokenOrder\(q,\([^)]*\)=>\{[\s\S]{0,400}?\},\{measure:MEASURE\|\|!!cfg\.noHints\}\)/.test(app),
  'renderTokenOrder(q, onComplete, {measure:MEASURE||!!cfg.noHints})');
check('P-A token-order hides "intip arti" in measure mode',
  /renderTokenOrder = function\(q, onComplete, opts\)/.test(upgrade) && /const anyGloss = !measure && /.test(upgrade),
  'anyGloss harus false bila opts.measure');
check('P-A a hint popover left open by a practice session is closed when a measure quiz starts',
  /if\(MEASURE\|\|cfg\.noHints\)try\{document\.getElementById\('grammarHintPopover'\)\?\.remove\(\)\}/.test(app));

// ---------------------------------------------------------------------------------------
// V-A / V-B — ulangan kosakata lintas level, paling rawan lupa dulu
// ---------------------------------------------------------------------------------------
{
  const src = ['contentLevelFor', 'vocabReviewLevelOk', 'dueItems', 'vocabReviewQueue'].map(n => fn(n));
  check('V extract vocabReviewLevelOk/dueItems/vocabReviewQueue from app.js', src.every(Boolean), src.map((s, i) => i + ':' + !!s).join(' '));
  if (src.every(Boolean)) {
    const now = Date.now(), DAY = 86400000;
    const V = [
      { id: 'a1-old', level: 'A1' }, { id: 'a1-fresh', level: 'A1' }, { id: 'a2-due', level: 'A2' },
      { id: 'b1-due', level: 'B1' }, { id: 'a1-risky', level: 'A1' }
    ];
    const state = { vocab: {
      'a1-old': { total: 3, nextReview: now - DAY, risk: 0.2 },
      'a1-fresh': { total: 2, nextReview: now + DAY, risk: 0.1 },
      'a2-due': { total: 1, nextReview: now - 1000, risk: 0.5 },
      'b1-due': { total: 1, nextReview: now - 1000, risk: 0.9 },
      'a1-risky': { total: 4, nextReview: now - 2 * DAY, risk: 0.8 },
      'orphan': { total: 1, nextReview: now - DAY, risk: 0.99 }
    }, grammar: {}, reading: {} };
    const ctx = vm.createContext({ LEVELS, V, R: [], GRAMMAR_ITEMS: [], state, getActiveLevel: () => 'A2', forgettingProbability: b => b.risk, Date });
    vm.runInContext(src.join('\n'), ctx);
    const due = vm.runInContext('dueItems().map(([k])=>k).sort().join(",")', ctx);
    check('V-B due vocabulary from the previous level is still counted after a level-up',
      due === 'a1-old,a1-risky,a2-due', 'dueItems() = ' + due + ' (harus a1-old,a1-risky,a2-due; B1 di atas level aktif dan kunci yatim ditolak)');
    const queue = vm.runInContext('vocabReviewQueue().map(v=>v.id).join(",")', ctx);
    check('V-A review queue is ordered by forgetting risk and spans levels <= active',
      queue === 'a1-risky,a2-due,a1-old', 'vocabReviewQueue() = ' + queue);
  }
  const flash = fn('flashcards'), review = fn('reviewVocab'), quiz = fn('startVocabQuiz');
  check('V-A flashcards put due cards first', /vocabReviewQueue\(\)/.test(flash) && /pool=\[\.\.\.dueCards,/.test(flash));
  check('V-A "Review jatuh tempo" reads the shared queue', /const due=vocabReviewQueue\(\)/.test(review));
  check('V-A "Uji kosakata" reads the shared queue and allows earlier levels', /vocabReviewQueue\(\)/.test(quiz) && /allowCrossLevel:true/.test(quiz));
}

// ---------------------------------------------------------------------------------------
// F1 — dua tab, satu blob: penggabungan tiga arah (murni) + jalur simpan SUNGGUHAN
// ---------------------------------------------------------------------------------------
{
  const M = Continuity.mergeConcurrentState;
  check('F1 FiezelContinuity.mergeConcurrentState exists', typeof M === 'function');
  if (typeof M === 'function') {
    const base = { stateRevision: 3, view: 'home', totalAnswered: 0, totalCorrect: 0, history: [], sessionHistory: [],
      gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] }, vocab: {}, preferences: { haptics: true, motion: true } };
    const clone = o => JSON.parse(JSON.stringify(o));
    const tabA = clone(base);
    for (let i = 0; i < 5; i++) tabA.history.push({ attemptId: 'A' + i, at: 1000 + i, ok: true });
    tabA.totalAnswered = 5; tabA.totalCorrect = 5;
    tabA.gems = { schema: 'fiezel-gems-v1', balance: 2, earnedTotal: 2, spentTotal: 0, ledger: [{ at: 1005, delta: 2, reason: 'quiz', sessionId: 'sA' }] };
    tabA.sessionHistory.push({ id: 'sA', at: '2026-10-04T01:00:00.000Z' });
    tabA.vocab.w = { total: 1, lastSeen: 1003, mastery: 40 };
    const tabB = clone(base); tabB.preferences.motion = false; tabB.view = 'settings';
    // Probe O6: tab B (dibuka sebelum A belajar) menyimpan satu perubahan kecil SESUDAH tab A.
    const m = M(base, tabB, tabA);
    check('F1 the stale tab keeps the other tab\'s history, session and gems (probe O6)',
      m.history.length === 5 && m.sessionHistory.length === 1 && m.gems.balance === 2 && m.totalAnswered === 5 && m.vocab.w && m.vocab.w.mastery === 40,
      JSON.stringify({ history: m.history.length, sessions: m.sessionHistory.length, gems: m.gems.balance, total: m.totalAnswered }));
    check('F1 the stale tab keeps its own change and its own screen', m.preferences.motion === false && m.preferences.haptics === true && m.view === 'settings');
    // Keduanya belajar bersamaan.
    const tabC = clone(base);
    for (let i = 0; i < 3; i++) tabC.history.push({ attemptId: 'C' + i, at: 1002 + i * 10, ok: i > 0 });
    tabC.totalAnswered = 3; tabC.totalCorrect = 2;
    tabC.gems = { schema: 'fiezel-gems-v1', balance: 3, earnedTotal: 3, spentTotal: 0, ledger: [{ at: 1030, delta: 3, reason: 'quiz', sessionId: 'sC' }] };
    tabC.vocab.w = { total: 2, lastSeen: 1040, mastery: 55 };
    const both = M(base, tabC, tabA);
    check('F1 concurrent learning in two tabs: every attempt, counter and gem survives',
      both.history.length === 8 && both.totalAnswered === 8 && both.totalCorrect === 7 && both.gems.balance === 5 && both.gems.earnedTotal === 5 && both.gems.ledger.length === 2,
      JSON.stringify({ history: both.history.length, total: both.totalAnswered, correct: both.totalCorrect, gems: both.gems }));
    check('F1 merged history stays chronological and unique', both.history.every((r, i, a) => !i || a[i - 1].at <= r.at) && new Set(both.history.map(r => r.attemptId)).size === 8);
    check('F1 a word studied in both tabs keeps the newest evidence', both.vocab.w.lastSeen === 1040 && both.vocab.w.mastery === 55);
    const again = M(tabA, both, tabA);
    check('F1 merging is idempotent (re-merging the same write changes nothing)', JSON.stringify(again) === JSON.stringify(both));
  }

  // Jalur simpan SUNGGUHAN, dua "tab" berbagi satu localStorage.
  const start = app.indexOf("let stateSyncBase='',stateSyncKey='',stateSyncRev=NaN");
  const endMerge = start >= 0 ? app.indexOf('function saveFlushWrite(', start) : -1;
  const pieces = [start >= 0 && endMerge > start ? app.slice(start, endMerge) : '', fn('saveFlushWrite'), fn('stateSyncMarkWritten')];
  check('F1 extract the save path (stateSync*, saveFlushWrite) from app.js', pieces.every(Boolean));
  check('F1 saveFlushWrite merges external writes BEFORE writing', /function saveFlushWrite\(\)\{\s*saveWriteQueued=false;\s*try\{stateMergeExternal\(\)\}catch\(_\)\{\}/.test(app));
  check('F1 other tabs are noticed through the storage event', /window\.addEventListener\('storage',e=>\{[\s\S]{0,400}stateExternalDirty=true/.test(app));
  check('F1 foreign writes are detected from the stored revision (no extra key)', /function storedStateRevision\(\)/.test(app) && !/fiezel-state-rev-v1/.test(app));
  if (pieces.every(Boolean)) {
    const store = {};
    let writes = 0;
    const localStorage = { getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null), setItem: (k, v) => { writes++; store[k] = String(v); }, removeItem: k => { delete store[k]; } };
    const KEY = 'fiezel-v5-state:murid';
    const fresh = { stateRevision: 0, view: 'home', totalAnswered: 0, totalCorrect: 0, history: [], sessionHistory: [], gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] }, vocab: {}, preferences: { motion: true } };
    store[KEY] = JSON.stringify(fresh);
    const makeTab = () => {
      const ctx = vm.createContext({
        state: JSON.parse(store[KEY]), activeStateStorageKey: KEY, activeAccountUuid: 'murid', localStorage,
        self: { FiezelContinuity: Continuity }, loadState: k => JSON.parse(localStorage.getItem(k)),
        PROGRESS_STATE_FIELDS: [], PROGRESS_PREF_FIELDS: [], pickProgress: s => s, progressStorageKey: k => k, targetLangOfRaw: () => 'en',
        FiezelI18n: { t: k => k }, showToast: () => {}, Math, JSON, Object, Number, String, Date, coreBrainCache: null
      });
      vm.runInContext('var saveWriteQueued=false;let saveStorageWarned=false;' + pieces.join('\n') + '\nstateSyncReset();', ctx);
      return ctx;
    };
    const tabB = makeTab(); // dibuka lebih dulu
    const tabA = makeTab();
    vm.runInContext(`for(let i=0;i<5;i++)state.history.push({attemptId:'A'+i,at:1000+i,ok:true});state.totalAnswered=5;state.totalCorrect=5;
      state.gems={schema:'fiezel-gems-v1',balance:2,earnedTotal:2,spentTotal:0,ledger:[{at:1005,delta:2,reason:'quiz',sessionId:'sA'}]};
      state.sessionHistory.push({id:'sA',at:'2026-10-04T01:00:00.000Z'});saveFlushWrite();`, tabA);
    // Tab B tidak menerima event storage (mis. dibekukan) - tanda revisi saja harus cukup.
    vm.runInContext('state.preferences.motion=false;saveFlushWrite();', tabB);
    const saved = JSON.parse(store[KEY]);
    check('F1 real save path: the stale tab no longer erases the other tab (history/sessions/gems)',
      saved.history.length === 5 && saved.sessionHistory.length === 1 && saved.gems.balance === 2 && saved.totalAnswered === 5 && saved.preferences.motion === false,
      JSON.stringify({ history: saved.history.length, sessions: saved.sessionHistory.length, gems: saved.gems.balance, total: saved.totalAnswered, motion: saved.preferences.motion }));
    vm.runInContext("state.history.push({attemptId:'A5',at:2000,ok:false});state.totalAnswered++;saveFlushWrite();", tabA);
    const saved2 = JSON.parse(store[KEY]);
    check('F1 real save path: the first tab in turn keeps the stale tab\'s change',
      saved2.history.length === 6 && saved2.preferences.motion === false && saved2.totalAnswered === 6,
      JSON.stringify({ history: saved2.history.length, motion: saved2.preferences.motion, total: saved2.totalAnswered }));
    const before = writes;
    vm.runInContext("state.preferences.motion=true;saveFlushWrite();", tabB);
    check('F1 a save that merges is still exactly ONE localStorage write', writes - before === 1, (writes - before) + ' penulisan');
    check('F1 revisions keep rising across tabs', JSON.parse(store[KEY]).stateRevision > saved2.stateRevision, `${saved2.stateRevision} -> ${JSON.parse(store[KEY]).stateRevision}`);
  }
}

// ---------------------------------------------------------------------------------------
// F2 / F3 — sinkron riwayat BrainCore benar-benar berjalan, dan tidak macet
// ---------------------------------------------------------------------------------------
{
  check('F2 brainSyncFlush is scheduled when a session finishes', /slice\(-100\);const outcome=recordPolicyOutcomeFromSession\(session\);save\(\);if\(outcome\)queuePolicyOutcomeSync\(outcome\);try\{queueBrainSyncFlush\(\)\}/.test(app));
  check('F2 brainSyncFlush is scheduled when an abandoned session is closed', /recordPolicyOutcomeFromSession\(session,now\);save\(\);queueRemoteActivitySync\(\);try\{queueBrainSyncFlush\(\)\}/.test(app));
  check('F2/F4/F5 reconnecting flushes brain sync, activity and policy outcomes',
    /addEventListener\('online',\(\)=>\{[\s\S]{0,1200}queueBrainSyncFlush\(1500\)[\s\S]{0,200}queueRemoteActivitySync\(\)[\s\S]{0,200}flushPolicyOutcomeQueue\(\)/.test(app));
  check('F2 boot flushes what an offline session left behind', /try\{queueBrainSyncFlush\(0\)\}catch\(_\)\{\}\/\* Audit F2/.test(app));
  check('F2 the learner can opt in from Settings (fail-closed default untouched)',
    /id="settingBrainSync"[^>]*onchange="setBrainSyncPreference\(this\.checked\)"/.test(app) && /brainSync:on===true/.test(fn('setBrainSyncPreference')));
  const q = fn('queueBrainSyncFlush');
  check('F2 the scheduler goes through the fail-closed gate', /if\(!brainSyncEnabled\(\)\)return false/.test(q));

  const names = ['BRAIN_SYNC_KEY', 'BRAIN_SYNC_BATCH', 'BRAIN_SYNC_QUEUE_MAX', 'BRAIN_SYNC_SENT_MAX'];
  const consts = names.map(constant);
  const fns = ['brainSyncModule', 'brainSyncEnabled', 'brainSyncRead', 'brainSyncWrite', 'brainSyncPending', 'brainSyncFlush'].map(n => fn(n));
  check('F3 extract brain sync constants and functions', consts.every(Boolean) && fns.every(Boolean), names.map((n, i) => n + ':' + !!consts[i]).join(' '));
  if (consts.every(Boolean) && fns.every(Boolean)) {
    const store = {};
    const history = [];
    for (let i = 0; i < 1000; i++) history.push({ attemptId: 'r' + String(i).padStart(4, '0'), at: 1700000000000 + i, ok: i % 3 > 0, type: 'grammar', skill: 's' });
    const posted = [];
    const ctx = vm.createContext({
      state: { preferences: { brainSync: true }, history },
      activeAccountUuid: 'murid', CORE_WORKER_URL: 'https://worker.example',
      self: { FiezelAttemptRecord: { project: row => ({ attemptId: row.attemptId, at: row.at, ok: row.ok }) } },
      localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
      sideStateKey: b => b + ':murid',
      coreWorkerExec: async (p, o) => { posted.push(JSON.parse(o.body).attempts.map(a => a.attemptId)); return { ok: true }; },
      queueBrainSyncFlush: () => true, Date, JSON, Set, Array, Number, String
    });
    vm.runInContext(consts.join('\n') + '\n' + fns.join('\n'), ctx);
    (async () => {
      for (let i = 0; i < 20; i++) await vm.runInContext('brainSyncFlush()', ctx);
      const sentAll = new Set(posted.flat());
      check('F3 twenty flushes deliver all 1,000 history rows exactly once', sentAll.size === 1000 && posted.flat().length === 1000,
        `terkirim unik ${sentAll.size}, total kiriman ${posted.flat().length}`);
      const pending = vm.runInContext('brainSyncPending().length', ctx);
      check('F3 nothing is pending once everything was delivered', pending === 0, 'tertunda ' + pending);
      // Riwayat bergeser (record() membuang baris tertua) - id lama keluar dari daftar terkirim,
      // baris baru tetap tercapai.
      vm.runInContext("for(let i=0;i<60;i++){state.history.shift();state.history.push({attemptId:'n'+i,at:1800000000000+i,ok:true,type:'grammar',skill:'s'})}", ctx);
      const nextBatch = await vm.runInContext('brainSyncFlush().then(()=>1)', ctx).then(() => posted[posted.length - 1]);
      check('F3 new rows are reached after the history window shifts', nextBatch.every(id => id.startsWith('n')) && nextBatch.length === 50, JSON.stringify(nextBatch.slice(0, 3)));
      const sent = JSON.parse(store['fiezel-brain-sync-v1:murid']).sent;
      check('F3 the sent list is bounded by the live history, not by an arbitrary 300', sent.length <= 1200 && sent.length >= 990 && !sent.includes('r0000'), 'sent=' + sent.length);
      finish();
    })().catch(e => { check('F3 async run', false, e && e.stack); finish(); });
  } else finish();
}

function finish() {
  console.log(`\nlearning-integrity-2026-10-04: ${passed}/${passed + failed} PASS`);
  if (failed) process.exitCode = 1;
}
