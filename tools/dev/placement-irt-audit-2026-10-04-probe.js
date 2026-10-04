#!/usr/bin/env node
/**
 * tools/dev/placement-irt-audit-2026-10-04-probe.js — bukti untuk
 * reports/PLACEMENT-IRT-AUDIT-2026-10-04.md. BUKAN gerbang: mencetak angka, selalu exit 0.
 *
 *   node tools/dev/placement-irt-audit-2026-10-04-probe.js [jumlahRunPerStrategi=30] [strategi,dipisah,koma]
 *
 * A  Matematika 3PL di features/brain/fiezel-core-brain.js (murni, tanpa browser):
 *    A1 titik-titik kurva yang dijanjikan komentar; A2 informasi Fisher vs turunan numerik;
 *    A3 estimateAbility() pada 12 jawaban (2 per level) untuk murid sejati θ=1..6 dan penebak.
 * B  Aturan level tes penempatan PERSIS seperti app.js (tangga band + plafon akurasi),
 *    diekstrak dari sumbernya dan dijalankan di VM: peluang penebak acak per level, mode
 *    ringkas (12 soal) dan penuh (25 soal), 200.000 run Monte Carlo.
 * C  Tes penempatan SUNGGUHAN di Chromium: soal asli, dijawab dengan strategi tanpa
 *    pengetahuan (acak, selalu A, terpanjang, terpendek) DAN strategi 'petunjuk': membuka
 *    lampu petunjuk tata bahasa (yang tetap tampil di mode ukur) sampai tingkat 4 lalu memilih
 *    pilihan yang disebut teksnya. Kalau susunan pilihan atau petunjuk membocorkan kunci,
 *    strategi itu akan jauh di atas 25% dan levelnya naik.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const RUNS = Math.max(4, Number(process.argv[2]) || 30);
const out = (id, title, data) => { console.log(`\n=== ${id} — ${title}`); for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------------------------------
// A. Matematika 3PL
// ---------------------------------------------------------------------------------------
const B = require(path.join(ROOT, 'features', 'brain', 'fiezel-core-brain.js'));
{
  const P = (t, b) => B.successProbability(t, b);
  out('A1', 'kurva 3PL (a=1.5, c=0.25)', {
    'P(θ=b)': P(3, 3).toFixed(4), 'P(θ=b+1)': P(4, 3).toFixed(4), 'P(θ=b-1)': P(2, 3).toFixed(4),
    'P(θ=b-4) (≈ lantai tebakan)': P(1, 5).toFixed(4), 'P(θ=b+4)': P(6, 2).toFixed(4)
  });
  // Informasi Fisher 3PL analitik: I = (dP/dθ)^2 / (P(1-P)). Bandingkan dengan rumus modul
  // (yang menerima P, bukan θ) lewat estimateAbility tidak bisa - jadi hitung ulang di sini.
  const a = B.DISCRIMINATION, c = B.GUESS_FLOOR;
  const rows = [];
  for (const d of [-3, -1.5, -0.5, 0, 0.5, 1.5, 3]) {
    const p = P(d, 0), h = 1e-5;
    const dp = (P(d + h, 0) - P(d - h, 0)) / (2 * h);
    const numeric = dp * dp / (p * (1 - p));
    const formula = a * a * ((1 - p) / p) * Math.pow((p - c) / (1 - c), 2);
    rows.push({ 'θ-b': d, numerik: numeric.toFixed(5), rumusModul: formula.toFixed(5) });
  }
  out('A2', 'informasi Fisher: rumus modul vs turunan numerik', { baris: rows });
  // estimateAbility: 12 jawaban, 2 per level (blueprint ringkas), urutan acak per run.
  const sim = (truth, guess, runs, seed) => {
    const rnd = lcg(seed), hist = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    let sum = 0;
    for (let r = 0; r < runs; r++) {
      const items = [];
      for (let lv = 1; lv <= 6; lv++) for (let k = 0; k < 2; k++) items.push(lv);
      for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
      const attempts = items.map((d, i) => ({ difficulty: d, ok: rnd() < (guess ? 0.25 : P(truth, d)), at: 1e12 + i * 1000 }));
      const est = B.estimateAbility(attempts, { now: 1e12 + 20000 });
      sum += est.ability; hist[est.level]++;
    }
    return { meanAbility: (sum / runs).toFixed(2), level: hist };
  };
  const res = {};
  for (let t = 1; t <= 6; t++) res['θ=' + t] = sim(t, false, 4000, 100 + t);
  res['penebak acak'] = sim(0, true, 4000, 999);
  out('A3', 'estimateAbility() dari 12 jawaban (2 per level) — 4.000 run per murid', res);
}

// ---------------------------------------------------------------------------------------
// B. Aturan level penempatan dari app.js
// ---------------------------------------------------------------------------------------
const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const grab = re => { const m = APP.match(re); if (!m) throw new Error('tidak ditemukan: ' + re); return m[0]; };
const src = [
  "const LEVELS=['A1','A2','B1','B2','C1','C2'];",
  grab(/const PLACEMENT_BAND_PASS=[^;]+;/),
  grab(/const PLACEMENT_BAND_MIN_EVIDENCE=[^;]+;/),
  grab(/function placementBandTally\(answers\)\{[\s\S]*?\n\}/),
  grab(/function placementBandLevel\(bands\)\{[\s\S]*?\n\}/),
  grab(/const PLACEMENT_BLUEPRINT=\{[^\n]+;/),
  grab(/const PLACEMENT_LITE_BLUEPRINT=\{[^\n]+;/)
].join('\n');
const levelLine = grab(/state\.level=accuracy<45\?1:Math\.min\(Number\(state\.placementBandLevel\)\|\|6,accuracy<60\?2:accuracy<72\?3:accuracy<82\?4:accuracy<92\?5:6\);/);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src + `
this.levelFor=function(answers){const state={};state.placementBandLevel=placementBandLevel(placementBandTally(answers));const accuracy=Math.round(answers.filter(a=>a.ok).length/answers.length*100);${levelLine}return state.level};
this.bandOnly=function(answers){return placementBandLevel(placementBandTally(answers))};
this.blueprints={lite:PLACEMENT_LITE_BLUEPRINT,full:PLACEMENT_BLUEPRINT};`, ctx);
function placementDistribution(blueprint, pCorrect, runs, seed, rule) {
  const rnd = lcg(seed), hist = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  for (let r = 0; r < runs; r++) {
    const answers = [];
    for (const lv of LEVELS) {
      const plan = blueprint[lv], n = (plan.vocab || 0) + (plan.grammar || 0) + (plan.listening || 0);
      for (let k = 0; k < n; k++) answers.push({ level: lv, ok: rnd() < (typeof pCorrect === 'function' ? pCorrect(lv) : pCorrect) });
    }
    hist[LEVELS[(rule || ctx.levelFor)(answers) - 1]]++;
  }
  const pct = {};
  for (const k of LEVELS) pct[k] = (hist[k] / runs * 100).toFixed(3) + '%';
  return pct;
}
out('B1', 'penebak acak (p=0.25) — level hasil tes penempatan, 200.000 run', {
  ringkas12soal: placementDistribution(ctx.blueprints.lite, 0.25, 200000, 7),
  penuh25soal: placementDistribution(ctx.blueprints.full, 0.25, 200000, 8),
  catatan: 'aturan diekstrak dari app.js: tangga band (lulus >=0.625, min 2 soal) + plafon akurasi (<45% A1, <60% A2, <72% B1, <82% B2, <92% C1)'
});
out('B2', 'murid sejati (peluang benar per band dari kurva 3PL) — mode ringkas', (() => {
  const r = {};
  for (let t = 1; t <= 6; t++) r['θ=' + t] = placementDistribution(ctx.blueprints.lite, lv => B.successProbability(t, LEVELS.indexOf(lv) + 1), 50000, 20 + t);
  return r;
})());

out('B3', 'pembanding: tangga band SAJA (tanpa plafon akurasi) — mode ringkas', (() => {
  const r = { 'penebak acak': placementDistribution(ctx.blueprints.lite, 0.25, 200000, 9, ctx.bandOnly) };
  for (let t = 1; t <= 6; t++) r['θ=' + t] = placementDistribution(ctx.blueprints.lite, lv => B.successProbability(t, LEVELS.indexOf(lv) + 1), 50000, 40 + t, ctx.bandOnly);
  return r;
})());

// ---------------------------------------------------------------------------------------
// C. Tes penempatan sungguhan di Chromium
// ---------------------------------------------------------------------------------------
(async () => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (_) { console.log('\n(C dilewati: Playwright tidak tersedia)'); return; }
  const ORIGIN = 'http://localhost:4173';
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const browser = await chromium.launch();
  // Konteks BARU tiap 10 run: ingatan-soal app (fiezel-question-memory) sengaja menolak
  // mengulang soal yang baru dilihat, jadi sesudah ±50 tes beruntun di satu perangkat bank soal
  // penempatan "habis" - itu perilaku app yang benar, bukan bagian yang diaudit.
  let context = null, page = null;
  const fresh = async () => {
    if (context) await context.close();
    context = await browser.newContext({ serviceWorkers: 'block' });
    page = await context.newPage();
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin !== ORIGIN) return route.abort();
      const t = path.resolve(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1));
      if (!t.startsWith(ROOT + path.sep) || !fs.existsSync(t) || fs.statSync(t).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(t)] || 'application/octet-stream', body: fs.readFileSync(t) });
    });
    await page.addInitScript(() => {
      try {
        localStorage.clear();
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-puter-auth-skipped', '1');
      } catch (_) {}
    });
    await page.goto(ORIGIN + '/');
    await page.waitForFunction(() => typeof window.startPlacement === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { document.getElementById('fiezelBootSplash')?.remove(); document.querySelector('.fiezel-ob')?.remove(); });
  };
  try {
    const runOnce = async strategy => page.evaluate(async strat => {
      const st = window.__getFiezelState();
      st.placementDone = false; st.placementLastAt = 0;
      const before = st.history.length;
      await window.startPlacement();
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 40; i++) {
        await sleep(60);
        const opts = [...document.querySelectorAll('#options .option')];
        if (!opts.length) { if (st.placementDone) break; continue; }
        let j = 0;
        const hintBtn = document.getElementById('quizGrammarHint');
        if (hintBtn) window.__hintSeen = (window.__hintSeen || 0) + 1;
        window.__qSeen = (window.__qSeen || 0) + 1;
        if (strat === 'petunjuk' && hintBtn) {
          // Murid yang tidak tahu apa-apa membuka lampu petunjuk sampai tingkat 4, lalu memilih
          // pilihan yang disebut teks petunjuknya (kalau tepat satu yang disebut).
          const U = self.FiezelGrammarUpgrade; let q = null;
          const keep = U.showGrammarHint; U.showGrammarHint = qq => { q = qq; }; hintBtn.click(); U.showGrammarHint = keep;
          let text = '';
          for (let L = 1; L <= 4 && q; L++) { U._renderHintPopover(q, hintBtn, L); text += ' ' + (document.querySelector('#grammarHintPopover .hint-body-text')?.innerText || ''); document.getElementById('grammarHintPopover')?.remove(); }
          const low = text.toLowerCase();
          const named = opts.map((o, k) => [k, o.textContent.trim().toLowerCase()]).filter(([, t]) => t && new RegExp('(^|[^a-z])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(low));
          j = named.length === 1 ? named[0][0] : Math.floor(Math.random() * opts.length);
        }
        else if (strat === 'acak') j = Math.floor(Math.random() * opts.length);
        else if (strat === 'terpanjang') j = opts.reduce((b, o, k, a) => o.textContent.length > a[b].textContent.length ? k : b, 0);
        else if (strat === 'terpendek') j = opts.reduce((b, o, k, a) => o.textContent.length < a[b].textContent.length ? k : b, 0);
        opts[j].click();
        await sleep(40);
        document.getElementById('quizNext')?.click();
        await sleep(60);
        if (st.placementDone) break;
      }
      const rows = st.history.slice(before);
      return { level: st.level, bands: st.placementBands, answered: rows.length, correct: rows.filter(h => h.ok).length };
    }, strategy);
    const summary = {};
    const only = String(process.argv[3] || '').split(',').filter(Boolean);
    for (const strategy of ['acak', 'selalu-A', 'terpanjang', 'terpendek', 'petunjuk'].filter(x => !only.length || only.includes(x))) {
      const hist = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
      let answered = 0, correct = 0, done = 0;
      for (let r = 0; r < RUNS; r++) {
        if (r % 10 === 0) await fresh();
        const res = await runOnce(strategy);
        if (!res || !res.answered) continue;
        done++; answered += res.answered; correct += res.correct;
        hist[LEVELS[Math.max(1, Math.min(6, Number(res.level) || 1)) - 1]]++;
      }
      summary[strategy] = { run: done, akurasi: answered ? (correct / answered * 100).toFixed(1) + '%' : '-', soalPerRun: done ? (answered / done).toFixed(1) : '-', level: hist };
      console.log(`  [C ${strategy}] ${JSON.stringify(summary[strategy])}`);
    }
    const hintStat = await page.evaluate(() => ({ layarSoalDenganTombolPetunjuk: window.__hintSeen || 0, layarSoalDilihat: window.__qSeen || 0 }));
    summary.tombolPetunjukDiModeUkur = hintStat;
    out('C', `tes penempatan sungguhan, ${RUNS} run per strategi tanpa pengetahuan`, summary);
  } catch (e) {
    console.log('\n[C berhenti]', e && e.stack || e);
  } finally {
    await browser.close();
  }
})();
