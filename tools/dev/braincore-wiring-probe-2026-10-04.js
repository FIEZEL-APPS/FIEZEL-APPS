#!/usr/bin/env node
'use strict';
/**
 * tools/dev/braincore-wiring-probe-2026-10-04.js — apakah hasil BrainCore SAMPAI ke layar murid?
 *
 * Menjalankan index.html sungguhan di Chromium (berkas disajikan page.route, tanpa server, tanpa
 * egress) di layar HP 390x844. Murid "Rani" bermain sungguhan: beberapa sesi adaptif dari Beranda
 * plus beberapa sesi lesson grammar. Sekitar sepertiga jawabannya salah dengan keyakinan tinggi,
 * supaya BKT, buku besar miskonsepsi, matriks kekeliruan, OLM, dan jadwal lupa punya bukti.
 *
 * Sesudah itu probe:
 *   1. membaca keadaan BrainCore langsung dari modulnya (ability, momentum, beban, materi rawan
 *      lupa, akar masalah, jam produktif, BKT per lesson, miskonsepsi aktif, pasangan tertukar,
 *      vonis kalibrasi OLM, retensi, metrik belajar, rencana sesi);
 *   2. membuka Beranda, keempat tab Progres, dan ketiga tab KelasKu, memotret, dan mengambil teksnya;
 *   3. mencocokkan: fakta BrainCore mana yang muncul di layar mana.
 *
 * Pakai: node tools/dev/braincore-wiring-probe-2026-10-04.js <folder-keluaran>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'reports', 'braincore-wiring-2026-10-04'));
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = 'http://localhost:4173';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}

async function run() {
  const pw = loadPlaywright();
  if (!pw) { console.log('Playwright tidak tersedia'); return; }
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e && e.message || e)));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.abort();
    const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[path.extname(target)] || 'application/octet-stream', body: fs.readFileSync(target) });
  });
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('__probeSeeded')) return;
      sessionStorage.setItem('__probeSeeded', '1');
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-state-v1', JSON.stringify({ preferences: { learnerLocale: 'id', learnerLocaleExplicit: true } }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true }));
    } catch (_) {}
  });
  await page.goto(ORIGIN + '/');
  await page.waitForFunction(() => typeof window.go === 'function' && typeof window.startAdaptive === 'function' && self.FiezelCoreBrain, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { document.getElementById('fiezelBootSplash')?.remove(); document.documentElement.classList.remove('fz-booting'); document.querySelector('.fiezel-ob')?.remove(); });

  // Pengintip soal: sama dengan probe UX grammar — handler petunjuk dipinjam sebentar untuk membaca q.
  await page.evaluate(() => {
    window.__q = null;
    const U = self.FiezelGrammarUpgrade;
    if (U && U.renderTokenOrder) { const rt = U.renderTokenOrder; U.renderTokenOrder = function (q) { window.__q = q; return rt.apply(this, arguments); }; }
    window.__peek = () => {
      if (!U) return null;
      const keep = U.showGrammarHint; U.showGrammarHint = q => { window.__q = q; };
      document.getElementById('quizGrammarHint')?.click();
      U.showGrammarHint = keep; return window.__q;
    };
  });

  const closeOverlays = () => page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    for (const sel of ['#srlGoalPop .confidence-skip', '.fz-prasasti-close', '.modal.show .modal-close-corner', '.modal.show [data-close]', '.coach-skip']) {
      const b = [...document.querySelectorAll(sel)].find(vis); if (b) b.click();
    }
    const skip = [...document.querySelectorAll('button')].filter(vis).find(b => /^(Lewati|Nanti saja|Tutup)$/i.test((b.innerText || '').trim()));
    if (skip) skip.click();
  });

  let answered = 0, wrongs = 0;
  /** Satu sesi kuis sampai layar hasil. Pola: tiap jawaban ke-3 salah, dan dijawab "sangat yakin". */
  const playQuiz = async (label, maxQ = 25) => {
    for (let i = 0; i < maxQ; i++) {
      await page.waitForTimeout(500);
      const inQuiz = await page.evaluate(() => !!document.querySelector('.quiz-shell #options'));
      if (!inQuiz) break;
      if (process.env.PROBE_DEBUG) {
        const dbg = await page.evaluate(() => ({ hist: (window.__getFiezelState().history || []).length, opts: [...document.querySelectorAll('#options .option')].map(b => ({ t: (b.innerText || '').trim().slice(0, 20), dis: b.disabled, cls: b.className })), next: !!document.getElementById('quizNext'), pops: [...document.querySelectorAll('[role=dialog]')].map(d => d.id || d.className).slice(0, 4), counter: (document.querySelector('.quiz-shell')?.innerText || '').slice(0, 60) }));
        console.log('   dbg', label, i, JSON.stringify(dbg));
        if (i === 3) await page.screenshot({ path: path.join(OUT, 'dbg-' + label + '.png') });
      }
      const q = await page.evaluate(() => {
        let q = null; try { q = window.__peek(); } catch (_) {}
        const opts = [...document.querySelectorAll('#options .option')].map(b => (b.innerText || '').trim());
        return { type: q && q.type, answerIndex: q ? q.answerIndex : -1, tokens: q && q.tokens ? q.tokens.map(t => typeof t === 'object' ? t.text : t) : null, cloze: q && q.clozeAnswer || '', opts };
      });
      const beWrong = (answered % 3) === 2;
      if (q.type === 'token-order' && q.tokens) {
        const toks = beWrong ? q.tokens.slice().reverse() : q.tokens;
        await page.evaluate(ws => { for (const w of ws) { const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w && !x.disabled); b?.click(); } document.getElementById('tokenSubmitBtn')?.click(); }, toks);
      } else if (q.type === 'cloze') {
        await page.evaluate(a => { const i = document.querySelector('#options input, .cloze-input, input[type=text]'); if (i) { i.value = a; i.dispatchEvent(new Event('input', { bubbles: true })); } (document.querySelector('#options button.primary, .cloze-submit') || {}).click?.(); }, beWrong ? 'xyz' : q.cloze);
      } else {
        let k = q.answerIndex;
        if (k == null || k < 0) k = 0;
        if (beWrong) k = q.opts.findIndex((_, j) => j !== q.answerIndex);
        await page.evaluate(j => document.querySelectorAll('#options .option')[j]?.click(), Math.max(0, k));
        // Salah pertama di soal grammar membuka kesempatan kedua: murid tetap salah.
        if (beWrong) {
          await page.waitForTimeout(700);
          await page.evaluate(ai => { const o = [...document.querySelectorAll('#options .option')]; const j = o.findIndex((b, x) => x !== ai && !b.disabled && !b.classList.contains('is-tried') && !/Sudah dicoba/.test(b.innerText)); if (j >= 0) o[j].click(); }, q.answerIndex);
        }
      }
      answered++; if (beWrong) wrongs++;
      await page.waitForTimeout(800);
      // Skala keyakinan: salah dijawab "sangat yakin" (3), benar dijawab "cukup yakin" (2).
      await page.evaluate(w => { const pop = document.querySelector('#confidencePop'); if (!pop) return; const b = [...pop.querySelectorAll('.confidence-scale button')]; (b[w ? b.length - 1 : 1] || b[0] || pop.querySelector('.confidence-skip'))?.click(); }, beWrong);
      await page.waitForTimeout(500);
      // Sesudah salah terakhir murid harus membuka pembahasan dulu sebelum "Lanjut" ada.
      for (let k = 0; k < 3; k++) {
        await page.evaluate(() => {
          document.querySelector('#srlGoalPop .confidence-skip')?.click();
          const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
          const open = [...document.querySelectorAll('button')].filter(vis).find(b => /^(Lihat pembahasan|Buka Pembahasan)/i.test((b.innerText || '').trim()));
          if (open) { open.click(); return; }
          const n = document.getElementById('quizNext'); if (n && vis(n)) n.click();
        });
        await page.waitForTimeout(600);
      }
    }
    await page.waitForTimeout(1200);
    await closeOverlays();
    const hist = await page.evaluate(() => (window.__getFiezelState().history || []).length);
    const where = await page.evaluate(() => (document.querySelector('.quiz-shell') ? 'masih-kuis' : (document.querySelector('.result-hero, .session-summary, .quiz-result') ? 'layar-hasil' : (window.__getFiezelState().view || '?'))));
    console.log(`  sesi ${label}: klik jawaban ${answered} (salah ${wrongs}), riwayat tercatat ${hist}, posisi ${where}`);
  };

  const sessions = [];
  // Empat sesi adaptif dari Beranda.
  for (let s = 0; s < (process.env.PROBE_SESSIONS ? +process.env.PROBE_SESSIONS : 4); s++) {
    await page.evaluate(() => { go('home'); });
    await page.waitForTimeout(800);
    await page.evaluate(() => startAdaptive());
    await page.waitForTimeout(1500);
    await closeOverlays();
    await playQuiz('adaptif-' + (s + 1));
    sessions.push('adaptif-' + (s + 1));
  }
  // Tiga sesi lesson grammar A1 (BKT per lesson).
  const skills = await page.evaluate(() => (typeof GRAMMAR_ITEMS !== 'undefined' ? GRAMMAR_ITEMS : []).filter(x => x.level === 'A1').slice(0, 3).map(x => x.skill));
  for (const sk of skills) {
    await page.evaluate(k => { try { practiceSkill(k); } catch (e) { console.log('practiceSkill gagal', e); } }, sk);
    await page.waitForTimeout(1500);
    await closeOverlays();
    await playQuiz('grammar-' + sk);
    sessions.push('grammar-' + sk);
  }

  // ---------- 1. keadaan BrainCore, dibaca dari modulnya ----------
  const brain = await page.evaluate(() => {
    const out = {};
    const safe = (k, f) => { try { out[k] = f(); } catch (e) { out[k] = { error: String(e && e.message || e) }; } };
    const S = window.__getFiezelState();
    safe('history', () => (S.history || []).length);
    safe('snapshot', () => { const s = window.__fiezelCoreBrainSnapshot(); return s && { ability: s.ability, momentum: s.momentum, fatigue: s.fatigue, challenge: s.challenge, memory: s.memory && { total: s.memory.total, atRisk: s.memory.atRisk, relearn: s.memory.relearn, top: (s.memory.top || []).slice(0, 5) }, chronotype: s.chronotype, rootCause: s.rootCause, domains: s.domains, plan: s.plan }; });
    safe('policy', () => { const p = buildAdaptivePolicy(); return p && { mode: p.mode, primaryDomain: p.primaryDomain, targetSkill: p.targetSkill, difficultyBand: p.difficultyBand, sessionSize: p.sessionSize, pace: p.pace, summary: p.summary }; });
    safe('bkt', () => { const raw = bktRead(); const L = raw && (raw.lessons || {}); const M = self.FiezelMasteryBKT; return Object.keys(L).map(k => ({ k, L: Math.round(M.mastery(L[k]) * 100) / 100, gate: !!M.masteryGate(L[k]) })); });
    safe('bktMastered', () => [...bktMasteredSkills()]);
    safe('misconceptions', () => self.FiezelMisconceptionLedger.summarize(misconceptionLedgerRead()));
    safe('confusions', () => self.FiezelConfusionMatrix.topConfusions(confusionMatrixRead(), { limit: 5 }));
    safe('olm', () => { const s = self.FiezelOLM.summarize(olmSummarizeInput()); return s && { calibration: s.calibration, verdict: s.verdict, tone: s.tone, headline: s.headline, skills: (s.skills || []).slice(0, 5) }; });
    safe('olmNudge', () => olmCalibrationNudge());
    safe('srl', () => srlRead());
    safe('learningMetrics', () => typeof learningMetricsSnapshot === 'function' ? learningMetricsSnapshot() : 'fn-absent');
    safe('retention', () => typeof retentionProbeSnapshot === 'function' ? retentionProbeSnapshot() : 'fn-absent');
    safe('dueReviews', () => window.__fiezelDueReviews());
    return out;
  });
  fs.writeFileSync(path.join(OUT, 'brain-state.json'), JSON.stringify(brain, null, 2));
  console.log('BrainCore: riwayat', brain.history, '| ability', JSON.stringify(brain.snapshot && brain.snapshot.ability), '| momentum', brain.snapshot && brain.snapshot.momentum && brain.snapshot.momentum.state, '| beban', brain.snapshot && brain.snapshot.fatigue && brain.snapshot.fatigue.state);

  // ---------- 2. permukaan murid ----------
  const surfaces = {};
  const grab = async (name, note) => {
    await page.waitForTimeout(900);
    await closeOverlays();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
    surfaces[name] = { note, text: await page.evaluate(() => (document.getElementById('app') || document.body).innerText) };
    console.log(`[${name}] ${note} | ${surfaces[name].text.length} karakter`);
  };
  await page.evaluate(() => go('home')); await grab('01-beranda', 'Beranda "Hari ini"');
  await page.evaluate(() => go('latihan')); await grab('02-latihan', 'Tab Latihan');
  await page.evaluate(() => go('grammar')); await grab('03-grammar-hub', 'Grammar hub');
  await page.evaluate(() => go('progress')); await grab('04-progres-ringkasan', 'Progres · Ringkasan');
  for (const [tab, nm] of [['readiness', '05-progres-kesiapan'], ['analysis', '06-progres-analisis'], ['adaptive', '07-progres-cara-soal-dipilih']]) {
    await page.evaluate(t => switchProgressTab(t), tab); await grab(nm, 'Progres · ' + tab);
  }
  await page.evaluate(() => go('classroom')); await grab('08-kelasku-tugas', 'KelasKu · Tugas');
  for (const [tab, nm] of [['progres', '09-kelasku-papan'], ['kelas', '10-kelasku-paspor']]) {
    await page.evaluate(t => document.getElementById('ch-tab-' + t)?.click(), tab); await grab(nm, 'KelasKu · ' + tab);
  }
  fs.writeFileSync(path.join(OUT, 'surfaces.json'), JSON.stringify(surfaces, null, 2));
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ sessions, answered, wrongs, pageErrors: pageErrors.slice(0, 20) }, null, 2));
  await browser.close();
  console.log('selesai ->', path.relative(process.cwd(), OUT));
}

run().catch(e => { console.error(e); process.exit(1); });
