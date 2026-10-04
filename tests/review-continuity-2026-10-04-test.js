#!/usr/bin/env node
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: gerbang tinggal di tests/, berkas produksi di akar repo. */
/**
 * tests/review-continuity-2026-10-04-test.js — gerbang tiga perbaikan lanjutan audit 2026-10-04
 *
 *   V-E  Flashcard "Masih belajar" adalah PENILAIAN DIRI, bukan jawaban salah: total, lapses,
 *        consecutiveWrong, dan mastery tidak boleh bergerak; kartunya hanya kembali segera.
 *        (reports/VOCAB-FSRS-AUDIT-2026-10-04.md V7.)
 *   P-C  Taksiran kemampuan Core Brain mulai dari level aktif murid, bukan konstanta 1,5:
 *        murid C2 tidak boleh ditaksir B1 sesudah 12 jawaban. (PLACEMENT-IRT-AUDIT A3.)
 *   R-X  Lesson grammar dan bacaan yang jatuh tempo dari level DI BAWAH level aktif tetap
 *        dihitung dan tetap masuk sesi ulangan sesudah naik level (lanjutan V-B).
 *
 * Bagian A Node murni (fungsi diambil apa adanya dari app.js). Bagian B Chromium lewat
 * page.route tanpa socket, SKIP bila Playwright tidak ada.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const Brain = require(path.join(ROOT, 'features/brain/fiezel-core-brain.js'));
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log('ok - ' + name); }
  else { failed++; console.error('FAIL - ' + name + (detail ? '\n    ' + detail : '')); }
}
function fn(name) {
  const start = app.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (start < 0) return '';
  let depth = 0;
  for (let j = app.indexOf('{', start); j < app.length; j++) {
    if (app[j] === '{') depth++;
    else if (app[j] === '}') { depth--; if (depth === 0) return app.slice(start, j + 1); }
  }
  return '';
}
const constant = name => { const m = app.match(new RegExp('const ' + name + '=[^;]+;')); return m ? m[0] : ''; };

// ---------------------------------------------------------------------------------------
// A1. V-E — "Masih belajar"
// ---------------------------------------------------------------------------------------
{
  const src = [constant('STILL_LEARNING_GAP_MS'), fn('markStillLearning')];
  check('V-E extract markStillLearning from app.js', src.every(Boolean));
  if (src.every(Boolean)) {
    const now = Date.now(), DAY = 86400000;
    const state = { consecutiveWrong: 0, vocab: {
      known: { correct: 3, total: 4, streak: 2, mastery: 60, lapses: 1, lapseBurden: 0.5, stabilityDays: 12, nextReview: now + 9 * DAY, lastSeen: now - DAY },
      soon: { correct: 1, total: 1, streak: 1, mastery: 20, lapses: 0, nextReview: now + 60000 }
    } };
    let saves = 0;
    const ctx = vm.createContext({ state, save: () => { saves++; }, Date, Number, Math });
    vm.runInContext(src.join('\n'), ctx);
    vm.runInContext("markStillLearning('vocab','known');markStillLearning('vocab','soon');markStillLearning('vocab','brand-new');", ctx);
    const k = state.vocab.known;
    check('V-E "Masih belajar" does not count as a wrong answer (total, lapses, mastery, beruntun-salah unchanged)',
      k.total === 4 && k.correct === 3 && k.lapses === 1 && k.mastery === 60 && k.streak === 2 && state.consecutiveWrong === 0,
      JSON.stringify({ total: k.total, lapses: k.lapses, mastery: k.mastery, streak: k.streak, consecutiveWrong: state.consecutiveWrong }));
    check('V-E the card comes back within minutes, never later than its existing schedule',
      k.nextReview > now && k.nextReview <= now + 10 * 60000 + 5000 && state.vocab.soon.nextReview === now + 60000,
      JSON.stringify({ known: Math.round((k.nextReview - now) / 60000) + ' mnt', soon: Math.round((state.vocab.soon.nextReview - now) / 1000) + ' dtk' }));
    const fresh = state.vocab['brand-new'];
    check('V-E a word never answered before enters the review queue without a fake attempt',
      fresh && fresh.total === 0 && fresh.nextReview > now && fresh.nextReview <= now + 11 * 60000 && saves === 3);
  }
  const flash = fn('flashcards'), review = fn('reviewVocab');
  check('V-E both flashcard decks use markStillLearning, not updateMastery(...,false)',
    /\$\('learning'\)\.onclick=e=>\{e\.stopPropagation\(\);markStillLearning\('vocab',v\.id\)/.test(flash) && /\$\('reviewLearning'\)\.onclick=e=>\{e\.stopPropagation\(\);markStillLearning\('vocab',v\.id\)/.test(review) &&
    !/updateMastery\('vocab',v\.id,false\)/.test(flash + review));
}

// ---------------------------------------------------------------------------------------
// A2. P-C — titik awal taksiran kemampuan
// ---------------------------------------------------------------------------------------
{
  const prior = fn('coreBrainPriorAbility');
  check('P-C extract coreBrainPriorAbility from app.js', !!prior);
  if (prior) {
    const ctx = vm.createContext({ LEVELS, level: 'C2', getActiveLevel() { return this.level; }, String });
    vm.runInContext(prior.replace('getActiveLevel()', 'getActiveLevel.call(this)'), ctx);
    const got = LEVELS.map(l => { ctx.level = l; return vm.runInContext('coreBrainPriorAbility()', ctx); });
    ctx.level = '';
    const fallback = vm.runInContext('coreBrainPriorAbility()', ctx);
    check('P-C prior = index of the active level (A1=1 .. C2=6), 1.5 when unknown', JSON.stringify(got) === '[1,2,3,4,5,6]' && fallback === 1.5, JSON.stringify({ got, fallback }));
  }
  check('P-C coreBrainSnapshot passes the prior to analyze()', /FiezelCoreBrain\.analyze\(\{\s*now,\s*priorAbility:coreBrainPriorAbility\(\),/.test(app));
  // Murid C2 sejati, 12 jawaban di soal C2 (riwayat yang dibaca hanya milik level aktif).
  let s = 7; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const runs = 2000, levelHits = { old: 0, fixed: 0 };
  for (let r = 0; r < runs; r++) {
    const attempts = Array.from({ length: 12 }, (_, i) => ({ difficulty: 6, ok: rnd() < Brain.successProbability(6, 6), at: 1e12 + i * 1000 }));
    if (Brain.estimateAbility(attempts, { now: 1e12 + 60000, prior: 1.5 }).level === 'C2') levelHits.old++;
    if (Brain.estimateAbility(attempts, { now: 1e12 + 60000, prior: 6 }).level === 'C2') levelHits.fixed++;
  }
  check('P-C a C2 learner is estimated C2 after 12 answers (was almost never)', levelHits.fixed / runs >= 0.85 && levelHits.old / runs <= 0.05,
    `C2 dengan prior lama ${(levelHits.old / runs * 100).toFixed(1)}%, dengan prior level aktif ${(levelHits.fixed / runs * 100).toFixed(1)}%`);
}

// ---------------------------------------------------------------------------------------
// A3. Ulangan grammar/reading lintas level
// ---------------------------------------------------------------------------------------
{
  const src = ['contentLevelFor', 'reviewLevelOk', 'dueItems'].map(fn);
  check('R-X extract contentLevelFor/reviewLevelOk/dueItems from app.js', src.every(Boolean));
  if (src.every(Boolean)) {
    const now = Date.now();
    const ctx = vm.createContext({
      LEVELS, V: [], R: [{ id: 'r-a1', level: 'A1' }, { id: 'r-b2', level: 'B2' }],
      GRAMMAR_ITEMS: [{ skill: 'g-a1', level: 'A1' }, { skill: 'g-a2', level: 'A2' }, { skill: 'g-b1', level: 'B1' }],
      state: { vocab: {}, grammar: { 'g-a1': { nextReview: now - 1000 }, 'g-a2': { nextReview: now - 1000 }, 'g-b1': { nextReview: now - 1000 } },
        reading: { 'r-a1': { nextReview: now - 1000 }, 'r-b2': { nextReview: now - 1000 } } },
      getActiveLevel: () => 'A2', Date
    });
    vm.runInContext(src.join('\n'), ctx);
    const due = vm.runInContext('dueItems().map(([k])=>k).sort().join(",")', ctx);
    check('R-X due grammar lessons and readings from earlier levels are still counted', due === 'g-a1,g-a2,r-a1', 'dueItems() = ' + due + ' (harus g-a1,g-a2,r-a1)');
  }
  check('R-X quizLoop lets marked cross-level review items through its level filter', /q\?\.__crossLevelReview===true\|\|!q\?\.level\|\|q\.level===\(cfg\.levelScope\|\|getActiveLevel\(\)\)/.test(app));
}

// ---------------------------------------------------------------------------------------
// B. Chromium — sesudah naik level, sesi ulangan sungguhan memuat materi lama yang jatuh tempo
// ---------------------------------------------------------------------------------------
function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}
function findChromium(pw) {
  try { const p = pw.chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch (_) {}
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const dir of fs.readdirSync(base)) {
      if (!/^chromium-/.test(dir)) continue;
      const exe = path.join(base, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  } catch (_) {}
  return null;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const ORIGIN = 'http://localhost:4173';

async function browserPart() {
  const pw = loadPlaywright();
  const exe = pw && findChromium(pw);
  if (!pw || !exe) { console.log('SKIP - B (browser): Playwright/Chromium tidak tersedia'); return; }
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.abort();
      const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(target)] || 'application/octet-stream', body: fs.readFileSync(target) });
    });
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
        localStorage.setItem('fiezel-puter-auth-skipped', '1');
      } catch (_) {}
    });
    await page.goto(ORIGIN + '/');
    await page.waitForFunction(() => typeof window.buildAdaptivePool === 'function' && typeof window.startReadingAdaptive === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { document.getElementById('fiezelBootSplash')?.remove(); document.querySelector('.fiezel-ob')?.remove(); });

    const r = await page.evaluate(async () => {
      const st = window.__getFiezelState(), now = Date.now();
      // Murid sudah naik ke A2; satu lesson grammar A1 dan satu bacaan A1 jatuh tempo kemarin.
      const lesson = GRAMMAR_ITEMS.find(x => x.level === 'A1' && (G[x.skill] || []).length);
      const reading = R.find(x => x.level === 'A1' && (x.qs || []).length);
      st.grammar[lesson.skill] = { correct: 4, total: 5, streak: 1, mastery: 80, nextReview: now - 86400000, stability: 3, lapses: 0, lastSeen: now - 4 * 86400000 };
      st.reading[reading.id] = { correct: 3, total: 4, streak: 1, mastery: 75, nextReview: now - 86400000, stability: 3, lapses: 0, lastSeen: now - 4 * 86400000 };
      st.preferences.activeLevel = 'A2';
      st.adaptiveReady = true;
      const due = window.__fiezelDueReviews();
      const pool = window.buildAdaptivePool(16, { primaryDomain: 'grammar', secondaryDomain: 'reading', mode: 'balance', sessionSize: 16 }, 4);
      const crossGrammar = pool.filter(q => q.type === 'grammar' && (q.lessonSkill || q.skill) === lesson.skill);
      const crossReading = pool.filter(q => q.type === 'reading' && q.passage?.id === reading.id);
      // "Reading adaptif" harus membuka bacaan A1 yang jatuh tempo, dan quizLoop tidak boleh menyaringnya.
      window.startReadingAdaptive();
      await new Promise(res => setTimeout(res, 1500));
      const passageTitle = document.querySelector('#quizPassage h3, #quizPassage b')?.innerText || '';
      const options = document.querySelectorAll('#options .option').length;
      return {
        due, poolSize: pool.length,
        grammar: crossGrammar.length, grammarFlag: crossGrammar.every(q => q.__crossLevelReview === true && q.level === 'A1'),
        reading: crossReading.length, readingFlag: crossReading.every(q => q.__crossLevelReview === true),
        readingTitleWanted: reading.title, passageTitle, options
      };
    });
    check('B dueItems counts the A1 grammar lesson and the A1 reading after moving to A2', r.due >= 2, JSON.stringify(r));
    check('B adaptive pool carries the due A1 grammar lesson, marked as cross-level review with its own level', r.grammar >= 1 && r.grammarFlag, JSON.stringify({ grammar: r.grammar, flag: r.grammarFlag, pool: r.poolSize }));
    check('B adaptive pool carries the due A1 reading', r.reading >= 1 && r.readingFlag, JSON.stringify({ reading: r.reading, flag: r.readingFlag }));
    check('B "Reading adaptif" opens the due A1 reading and its questions survive the level filter',
      r.passageTitle && r.passageTitle.trim() === String(r.readingTitleWanted).trim() && r.options > 0, JSON.stringify({ wanted: r.readingTitleWanted, got: r.passageTitle, options: r.options }));
    await page.close();
  } finally {
    await browser.close();
  }
}

browserPart().catch(e => check('B browser run', false, e && e.stack)).finally(() => {
  console.log(`\nreview-continuity-2026-10-04: ${passed}/${passed + failed} PASS`);
  if (failed) process.exitCode = 1;
});
