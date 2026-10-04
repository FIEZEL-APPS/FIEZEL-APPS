#!/usr/bin/env node
/**
 * tools/dev/braincore-grammar-feedback-audit-2026-10-03-probe.js — bukti yang bisa diulang
 * untuk reports/BRAINCORE-GRAMMAR-FEEDBACK-AUDIT-2026-10-03.md. BUKAN gerbang: mencetak
 * angka dan potongan layar, selalu exit 0.
 *
 *   node tools/dev/braincore-grammar-feedback-audit-2026-10-03-probe.js
 *
 * Menjalankan index.html SUNGGUHAN di Chromium (Playwright, sudah terpasang di lingkungan
 * cloud; kalau tidak ada, probe berhenti dengan pesan). Kuis tidak disentuh dari dalam:
 * soal ditangkap dengan membungkus pegangan modul (renderTokenOrder / showGrammarHint),
 * jawaban diberikan dengan MENGKLIK tombol seperti murid.
 *
 * P1  Token-order: berapa kali murid boleh mengirim jawaban salah sebelum pembahasan dibuka.
 * P2  Token-order: salah sekali lalu benar -> tercatat sebagai benar di percobaan pertama.
 * P3  Token-order: tombol "Jelaskan lebih sederhana" mengirim jawaban murid sebagai "-".
 * P4  Pilihan ganda: satu kesalahan pertama -> lencana "2x keliru".
 * P5  Pilihan ganda: giliran tutor BrainCore (tangga probe/hint/worked) tidak tampil saat retry.
 * P6  Pilihan ganda: setelah pembahasan dibuka, tutor masih menyuruh "coba lagi".
 * P7  Locale Thai: naskah umpan balik salah yang sampai ke murid dalam bahasa Indonesia.
 * P8  Data: alasan "Mengapa kurang tepat?" yang dicocokkan ke pilihan LAIN (substring).
 * P9  Data th: alasan pengecoh token-order yang tetap Indonesia (whyFailsId didahulukan).
 * P10 Modul: composeTurn dipanggil tanpa session/chosenOption/correctAnswer.
 * P11 Sumber: literal Indonesia di jalur umpan balik salah (tanpa FiezelI18n.t).
 * P12 Sumber: kabel yang dibaca langsung (pencocok, BKT, vault, buildFeedbackHTML mati).
 * P13 Data: petunjuk tingkat 4 (sebelum menjawab) menyebut kunci jawaban.
 *
 * P8 dan P13 dihitung dari soal yang dirakit ulang (pilihan diacak), jadi angkanya bergeser
 * sedikit antar-run; urutan besarnya stabil.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const ROOT = path.join(__dirname, '..', '..');

let chromium;
try { ({ chromium } = require('playwright')); } catch (_) {
  console.log('Playwright tidak tersedia — probe browser dilewati. (Lingkungan cloud Claude Code sudah memasangnya.)');
  process.exit(0);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
function startServer() {
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://127.0.0.1').pathname;
    const rel = p === '/' ? 'index.html' : p.replace(/^\/+/, '');
    const target = path.resolve(ROOT, rel);
    if (!target.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(target, (e, c) => {
      if (e) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
      res.end(c);
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

const out = (id, title, data) => {
  console.log(`\n=== ${id} — ${title}`);
  for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
};
const clip = (s, n = 220) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const ID_MARKERS = /\b(yang|kata|kurang|tepat|pilihan|coba|petunjuk|kesempatan|lagi|ganti|susunan|kalimat|isi di sini|simpan|rumus|catatan|beda|bahasa|perhatikan|periksa|sekali|terpasang|lengkapi|mungkin|belum|sesuai|konteks|intip|arti)\b/gi;
function langMix(text) {
  const s = String(text || '');
  const thai = (s.match(/[฀-๿]/g) || []).length;
  const idHits = [...new Set((s.match(ID_MARKERS) || []).map(x => x.toLowerCase()))];
  return { thaiChars: thai, indonesianMarkers: idHits };
}

async function boot(browser, port, locale) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => console.log('  [pageerror]', clip(e.message, 160)));
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => typeof window.go === 'function' && typeof window.startTokenOrderSession === 'function' && self.FiezelGrammarUpgrade && self.FiezelTutorBrain, null, { timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove();
  });
  if (locale === 'th') {
    await page.evaluate(() => FiezelI18n.setLocale('th'));
    await page.waitForFunction(() => self.FiezelThData && self.FiezelThData.ready && self.FiezelNaskahThBrain && FiezelI18n.hasCopy && FiezelI18n.t('quiz.periksa-ulang') !== 'Periksa Ulang', null, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  // Penangkap: soal aktif (closure kuis) diambil lewat pegangan modul yang menerimanya;
  // composeTurn dibungkus untuk mencatat input/keluaran tutor; panggilan AI dibelokkan
  // ke perekam supaya tidak ada jaringan.
  await page.evaluate(() => {
    window.__probe = { q: null, turns: [], ai: [] };
    const U = self.FiezelGrammarUpgrade;
    const rt = U.renderTokenOrder;
    U.renderTokenOrder = function (q) { window.__probe.q = q; return rt.apply(this, arguments); };
    U.showGrammarHint = function (q) { window.__probe.q = q; };
    const B = self.FiezelTutorBrain;
    self.FiezelTutorBrain = Object.assign({}, B, {
      composeTurn: function (i, s, n) {
        const r = B.composeTurn(i, s, n);
        window.__probe.turns.push({ move: i && i.move, scaffold: i && i.scaffold, sessionPassed: s != null, chosenOptionPassed: !!(i && i.chosenOption), correctAnswerPassed: !!(i && i.correctAnswer), sentencePassed: !!(i && i.sentence), say: r && r.say, ask: r && r.ask });
        return r;
      }
    });
    window.askFiezelAIResult = async function (prompt, task, ctx) { window.__probe.ai.push({ prompt, ctx }); throw new Error('probe: AI dimatikan'); };
  });
  return page;
}

const snap = page => page.evaluate(() => {
  const s = window.__getFiezelState();
  const h = s.history[s.history.length - 1];
  const vis = id => { const el = document.getElementById(id); return el && !el.hidden && !el.classList.contains('hidden') ? el.innerText : ''; };
  return {
    history: s.history.length,
    last: h ? { type: h.type, ok: h.ok, selectedIndex: h.selectedIndex, selectedAnswer: h.selectedAnswer } : null,
    widgetHint: vis('tokenScaffoldHint'),
    appNudge: document.getElementById('quizScaffoldNudge')?.innerText || '',
    tutor: vis('tutorTurn'),
    confidence: document.getElementById('confidencePop')?.innerText || '',
    feedback: vis('feedback'),
    vault: JSON.parse(JSON.stringify(s.mistakeVault || {}))
  };
});
async function openReveal(page) {
  await page.evaluate(() => document.querySelector('#confidencePop .confidence-go')?.click());
  await page.waitForTimeout(900);
}
async function placeTokens(page, words) {
  return page.evaluate(ws => {
    const reset = document.getElementById('tokenResetBtn');
    if (reset && !reset.disabled) reset.click();
    for (const w of ws) {
      const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w);
      if (!b) return 'hilang:' + w;
      b.click();
    }
    return 'ok';
  }, words);
}
async function submitTokens(page) {
  await page.evaluate(() => document.getElementById('tokenSubmitBtn')?.click());
  await page.waitForTimeout(700);
}
async function startTokenOrder(page) {
  await page.evaluate(() => { window.__probe.q = null; window.__probe.turns = []; window.__probe.ai = []; window.startTokenOrderSession(); });
  await page.waitForTimeout(1500);
  return page.evaluate(() => { const q = window.__probe.q; return q && { tokens: q.tokens.slice(), distractors: q.distractors.slice(), correct: q.options[q.answerIndex], skill: q.skill }; });
}
const wrongOrder = tokens => { const r = tokens.slice().reverse(); return r.join(' ') === tokens.join(' ') ? tokens.slice(1).concat(tokens[0]) : r; };

async function tokenOrderProbes(browser, port) {
  // ---- P1 + P3 -------------------------------------------------------------------------
  let page = await boot(browser, port, 'id');
  let q = await startTokenOrder(page);
  const wrong = wrongOrder(q.tokens);
  const h0 = (await snap(page)).history;
  const attempts = [];
  for (let i = 1; i <= 4; i++) {
    await placeTokens(page, wrong);
    await submitTokens(page);
    const s = await snap(page);
    attempts.push({ attempt: i, recordedAnswers: s.history - h0, widgetHint: clip(s.widgetHint, 90), appRetryBanner: clip(s.appNudge, 60), confidencePopOpen: !!s.confidence });
    if (s.confidence) break;
  }
  await openReveal(page);
  const revealed = await snap(page);
  await page.evaluate(() => document.getElementById('aiExplainBtn')?.click());
  await page.waitForTimeout(500);
  const ai = await page.evaluate(() => window.__probe.ai[0] || null);
  out('P1', 'token-order: percobaan salah sebelum pembahasan terbuka', {
    soal: q.correct,
    jawabanSalahYangDikirim: wrong.join(' '),
    attempts,
    attemptsBeforeReveal: attempts.length,
    badgeWidgetMenjanjikan: '"PETUNJUK · 1 KESEMPATAN LAGI" pada percobaan 1',
    lastHistoryRow: revealed.last
  });
  out('P3', 'token-order: AI explain menerima jawaban murid', {
    promptBaris: ai ? clip((ai.prompt.match(/Jawaban siswa:[^\n]*/) || [''])[0], 120) : '(tidak terpanggil)',
    ctxStageSelected: ai ? JSON.stringify(ai.ctx && ai.ctx.stage && ai.ctx.stage.selected) : '-',
    jawabanMuridSebenarnya: wrong.join(' ')
  });
  await page.close();

  // ---- P2 -------------------------------------------------------------------------------
  page = await boot(browser, port, 'id');
  q = await startTokenOrder(page);
  const before = await snap(page);
  const masteryBefore = await page.evaluate(sk => Number(window.__getFiezelState().grammar?.[sk]?.mastery || 0), q.skill);
  await placeTokens(page, wrongOrder(q.tokens));
  await submitTokens(page);
  const afterWrong = await snap(page);
  await placeTokens(page, q.tokens);
  await submitTokens(page);
  const afterRight = await snap(page);
  await openReveal(page);
  const fb = await snap(page);
  const masteryAfter = await page.evaluate(sk => Number(window.__getFiezelState().grammar?.[sk]?.mastery || 0), q.skill);
  out('P2', 'token-order: salah dulu, lalu benar', {
    percobaan1Salah_barisRiwayatBaru: afterWrong.history - before.history,
    percobaan2Benar_barisRiwayatBaru: afterRight.history - afterWrong.history,
    barisRiwayatYangTercatat: afterRight.last,
    vonisPembahasan: clip(fb.feedback.split('\n')[0], 80),
    masteryGrammarSkill: `${masteryBefore} -> ${masteryAfter}`
  });
  await page.close();
}

async function startMc(page) {
  await page.evaluate(() => { window.__probe.turns = []; window.startGrammarQuickSession(); });
  await page.waitForTimeout(1500);
}
async function captureMc(page) {
  await page.evaluate(() => { window.__probe.q = null; document.getElementById('quizGrammarHint')?.click(); });
  await page.waitForTimeout(200);
  return page.evaluate(() => { const q = window.__probe.q; return q && { type: q.type, options: q.options.slice(), answerIndex: q.answerIndex, skill: q.lessonSkill || q.skill, question: q.question }; });
}
const clickOption = async (page, j) => { await page.evaluate(k => document.querySelectorAll('#options .option')[k]?.click(), j); await page.waitForTimeout(700); };

async function mcProbes(browser, port) {
  const page = await boot(browser, port, 'id');
  await startMc(page);
  // ---- P4 + P5 --------------------------------------------------------------------------
  const q0 = await captureMc(page);
  if (!q0 || q0.type !== 'grammar') { out('P4', 'pilihan ganda', { dilewati: 'soal pertama sesi kilat bukan pilihan ganda: ' + (q0 && q0.type) }); await page.close(); return; }
  const w0 = q0.options.findIndex((_, i) => i !== q0.answerIndex);
  await clickOption(page, w0);
  const retry = await snap(page);
  const turnAtRetry = await page.evaluate(() => window.__probe.turns[window.__probe.turns.length - 1] || null);
  await clickOption(page, q0.answerIndex);
  await openReveal(page);
  const rev0 = await snap(page);
  const pills = await page.evaluate(() => document.querySelector('#feedback .braincore-telemetry-row')?.innerText || '');
  const mistakesInHistory = await page.evaluate(sk => window.__getFiezelState().history.filter(h => !h.ok && (h.skill === sk || h.target === sk)).length, q0.skill);
  out('P4', 'pilihan ganda: lencana kesalahan berulang setelah SATU kesalahan', {
    skill: q0.skill,
    kesalahanTercatatDiRiwayat: mistakesInHistory,
    mistakeVaultSetelahSalahPertama: retry.vault[q0.skill],
    lencanaDiPembahasan: clip(pills, 120)
  });
  out('P5', 'pilihan ganda: giliran tutor BrainCore saat retry', {
    tangga: turnAtRetry && turnAtRetry.scaffold,
    tutorBrainMengucapkan_say: clip(turnAtRetry && turnAtRetry.say, 160),
    tutorBrainMengucapkan_ask: clip(turnAtRetry && turnAtRetry.ask, 160),
    yangTampilDiKotakTutor: clip(retry.tutor, 260),
    sayTampil: !!(turnAtRetry && turnAtRetry.say && retry.tutor.includes(clip(turnAtRetry.say, 30))),
    askTampil: !!(turnAtRetry && turnAtRetry.ask && retry.tutor.includes(clip(turnAtRetry.ask, 30)))
  });
  // ---- P6 -------------------------------------------------------------------------------
  await page.evaluate(() => document.getElementById('quizNext')?.click());
  await page.waitForTimeout(900);
  const q1 = await captureMc(page);
  if (q1 && q1.type === 'grammar') {
    const wrongs = q1.options.map((_, i) => i).filter(i => i !== q1.answerIndex);
    await clickOption(page, wrongs[0]);
    await clickOption(page, wrongs[1]);
    await openReveal(page);
    const rev1 = await snap(page);
    const locked = await page.evaluate(() => [...document.querySelectorAll('#options .option')].every(b => b.disabled));
    const lastTurn = await page.evaluate(() => window.__probe.turns[window.__probe.turns.length - 1] || null);
    const whyLine = (rev1.feedback.split('\n').find(l => /Mengapa kurang tepat/.test(l)) || '');
    out('P6', 'pilihan ganda: tutor sesudah pembahasan dibuka (salah 2x)', {
      tangga: lastTurn && lastTurn.scaffold, move: lastTurn && lastTurn.move,
      semuaPilihanTerkunci: locked,
      kotakTutor: clip(rev1.tutor, 300),
      barisMengapaDiKotakPembahasan: clip(whyLine, 160),
      menyuruhMencobaLagi: /coba (lagi|jawab lagi)|yuk coba|sekarang coba/i.test(rev1.tutor)
    });
  } else {
    out('P6', 'pilihan ganda', { dilewati: 'soal kedua bukan pilihan ganda: ' + (q1 && q1.type) });
  }
  // ---- P6b: salah sekali lalu menekan "Buka Pembahasan" di bilah retry -------------------
  await startMc(page); // sesi kilat baru: soal pertamanya selalu pilihan ganda
  const q2 = await captureMc(page);
  if (q2 && q2.type === 'grammar') {
    const w2 = q2.options.findIndex((_, i) => i !== q2.answerIndex);
    await clickOption(page, w2);
    await page.evaluate(() => document.getElementById('quizRetryGiveUp')?.click());
    await page.waitForTimeout(700);
    const rev2 = await snap(page);
    const locked2 = await page.evaluate(() => [...document.querySelectorAll('#options .option')].every(b => b.disabled));
    const t2 = await page.evaluate(() => window.__probe.turns[window.__probe.turns.length - 1] || null);
    out('P6b', 'pilihan ganda: salah 1x lalu "Buka Pembahasan"', {
      tangga: t2 && t2.scaffold, move: t2 && t2.move,
      semuaPilihanTerkunci: locked2,
      kotakTutor: clip(rev2.tutor, 300),
      menyuruhMencobaLagi: /coba (lagi|jawab lagi)|yuk coba|sekarang coba/i.test(rev2.tutor)
    });
  } else {
    out('P6b', 'pilihan ganda', { dilewati: 'soal ketiga bukan pilihan ganda: ' + (q2 && q2.type) });
  }
  out('P10', 'input composeTurn dari app.js (semua giliran sesi ini)', {
    giliran: await page.evaluate(() => window.__probe.turns.map(t => ({ move: t.move, scaffold: t.scaffold, sessionPassed: t.sessionPassed, chosenOptionPassed: t.chosenOptionPassed, correctAnswerPassed: t.correctAnswerPassed, sentencePassed: t.sentencePassed })))
  });
  await page.close();
}

async function thaiProbes(browser, port) {
  const page = await boot(browser, port, 'th');
  const loc = await page.evaluate(() => FiezelI18n.getLocale());
  const q = await startTokenOrder(page);
  const glossBtn = await page.evaluate(() => document.getElementById('tokenGlossToggle')?.innerText || '');
  // Kirim kalimat yang memakai pengecoh bila ada (jalur "Cek kata …"), kalau tidak urutan terbalik.
  let words = wrongOrder(q.tokens);
  if (q.distractors.length) {
    const d = q.distractors[0];
    const correctWord = q.tokens.find(t => !q.tokens.includes(d) && t.toLowerCase() !== d.toLowerCase() && q.correct.includes(t) && d.slice(0, 2).toLowerCase() === t.slice(0, 2).toLowerCase()) || null;
    words = correctWord ? q.tokens.map(t => (t === correctWord ? d : t)) : q.tokens.concat([d]);
  }
  await placeTokens(page, words);
  await submitTokens(page);
  const a1 = await snap(page);
  await page.evaluate(() => document.getElementById('tokenGlossToggle')?.click());
  await page.waitForTimeout(200);
  const glosses = await page.evaluate(() => [...document.querySelectorAll('.token-gloss')].map(x => x.textContent).slice(0, 6));
  await placeTokens(page, words);
  await submitTokens(page);
  const a2 = await snap(page);
  out('P7a', 'locale th — token-order, percobaan 1 (petunjuk widget)', { locale: loc, dikirim: words.join(' '), petunjuk: clip(a1.widgetHint, 200), bahasa: langMix(a1.widgetHint), tombolGloss: clip(glossBtn, 40), contohGloss: glosses });
  out('P7b', 'locale th — token-order, percobaan 2 (tutor)', { kotakTutor: clip(a2.tutor, 260), bahasa: langMix(a2.tutor) });

  await startMc(page);
  const mq = await captureMc(page);
  if (mq && mq.type === 'grammar') {
    const w = mq.options.findIndex((_, i) => i !== mq.answerIndex);
    await clickOption(page, w);
    const r = await snap(page);
    out('P7c', 'locale th — pilihan ganda, nudge retry', { kotakTutor: clip(r.tutor, 260), bahasa: langMix(r.tutor) });
  } else {
    out('P7c', 'locale th — pilihan ganda', { dilewati: 'soal pertama bukan pilihan ganda: ' + (mq && mq.type) });
  }
  // ---- P9 -------------------------------------------------------------------------------
  const p9 = await page.evaluate(() => {
    const G = window.getGrammarBank();
    let entries = 0, thaiWhyFails = 0, shadowedById = 0; const sample = [];
    for (const items of Object.values(G)) for (const item of items) for (const d of (Array.isArray(item?.[17]) ? item[17] : [])) {
      entries++;
      const th = /[฀-๿]/.test(String(d.whyFails || ''));
      if (th) thaiWhyFails++;
      if (th && d.whyFailsId && !/[฀-๿]/.test(String(d.whyFailsId))) { shadowedById++; if (sample.length < 2) sample.push({ option: d.option, whyFailsId: d.whyFailsId, whyFails: d.whyFails }); }
    }
    return { entries, thaiWhyFails, shadowedById, sample };
  });
  out('P9', 'data th — alasan pengecoh token-order: whyFailsId (id) menutupi whyFails (th)', p9);
  await page.close();
}

async function dataProbes(browser, port) {
  const page = await boot(browser, port, 'id');
  const res = await page.evaluate(() => {
    // Salinan setia tiga pencocok di app.js (lihat laporan §B2 untuk barisnya):
    const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9฀-๿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const revealFind = (list, picked) => list.find(x => { const xN = norm(String(x.option)), pN = norm(String(picked)); return xN === pN || (xN && pN && (pN.includes(xN) || xN.includes(pN))); });
    const nw = w => String(w || '').toLowerCase().replace(/[^\w\s]/g, '').trim();
    const tutorFind = (list, chosen) => { const c = nw(chosen); return list.find(x => { const o = nw(x?.option); return o === c || (o && c.includes(o)); }); };
    const st = window.__getFiezelState();
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const items = window.getGrammarItems();
    let questions = 0, wrongPicks = 0, revealMis = 0, revealMisCorrect = 0, tutorMis = 0, tutorMisCorrect = 0; const sample = [];
    for (const L of levels) {
      st.preferences.activeLevel = L;
      const skills = [...new Set(items.filter(x => x.level === L).map(x => x.skill))];
      for (const sk of skills) {
        let qs = []; try { qs = window.buildGrammarLessonQuestions(sk) || []; } catch (_) {}
        for (const q of qs) {
          if (q.type !== 'grammar' || !Array.isArray(q.explain?.distractors)) continue;
          questions++;
          const list = q.explain.distractors, correct = q.options[q.answerIndex];
          q.options.forEach((opt, j) => {
            if (j === q.answerIndex) return;
            wrongPicks++;
            const r = revealFind(list, opt), t = tutorFind(list, opt);
            if (r && norm(r.option) !== norm(opt)) {
              revealMis++;
              const toKey = norm(r.option) === norm(correct);
              if (toKey) revealMisCorrect++;
              if (sample.length < 4 && (toKey || sample.length < 2)) sample.push({ skill: sk, picked: opt, correct, reasonShownIsFor: r.option, reasonShown: String(r.reason || '').slice(0, 140), ownReason: String((list.find(x => norm(x.option) === norm(opt)) || {}).reason || '').slice(0, 140) });
            }
            if (t && nw(t.option) !== nw(opt)) { tutorMis++; if (nw(t.option) === nw(correct)) tutorMisCorrect++; }
          });
        }
      }
    }
    // P13: petunjuk 4 tingkat (sebelum menjawab) — tingkat 4 menampilkan explain.why apa adanya.
    let whyNamesKeyOnly = 0; const hintSample = [];
    const word = s => new RegExp('(^|[^a-z])' + String(s).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)');
    for (const L of levels) {
      st.preferences.activeLevel = L;
      for (const sk of [...new Set(items.filter(x => x.level === L).map(x => x.skill))]) {
        for (const q of (window.buildGrammarLessonQuestions(sk) || [])) {
          if (q.type !== 'grammar') continue;
          const key = String(q.options[q.answerIndex]), why = String(q.explain?.why || '').toLowerCase();
          const others = q.options.filter((_, i) => i !== q.answerIndex);
          if (key.length > 1 && word(key).test(why) && !others.some(o => String(o).length > 1 && word(o).test(why))) {
            whyNamesKeyOnly++;
            if (hintSample.length < 2) hintSample.push({ soal: String(q.question).slice(0, 70), kunci: key, petunjukTingkat4: String(q.explain.why).slice(0, 110) });
          }
        }
      }
    }
    return { questions, wrongPicks, revealMis, revealMisCorrect, tutorMis, tutorMisCorrect, sample, whyNamesKeyOnly, hintSample };
  });
  out('P13', 'petunjuk tingkat 4 (sebelum menjawab) menyebut kunci jawaban', {
    soalPilihanGanda: res.questions, petunjukMenyebutKunciSaja: res.whyNamesKeyOnly, contoh: res.hintSample,
    pemakaianPetunjukDicatat: false
  });
  out('P8', 'data id — "Mengapa kurang tepat?" milik pilihan lain (pencocok substring)', {
    soalPilihanGanda: res.questions, pilihanSalah: res.wrongPicks,
    reveal_salahAlamat: res.revealMis, reveal_salahAlamatKeAlasanKunci: res.revealMisCorrect,
    tutorWhyFails_salahAlamat: res.tutorMis, tutorWhyFails_salahAlamatKeAlasanKunci: res.tutorMisCorrect,
    contoh: res.sample
  });
  await page.close();
}

function moduleProbe() {
  const T = require(path.join(ROOT, 'features', 'brain', 'fiezel-tutor-brain.js'));
  const ex = { rule: 'subjek orang ketiga tunggal + kata kerja -s', whyCorrect: 'subjeknya she', memoryCue: 'she/he/it -> +s' };
  const asApp = T.composeTurn({ move: 'hint', scaffold: 'worked', explanation: ex, whyFails: 'bentuk dasar tanpa -s', conceptLabel: 'present simple' });
  const full = T.composeTurn({ move: 'hint', scaffold: 'worked', explanation: ex, whyFails: 'bentuk dasar tanpa -s', conceptLabel: 'present simple', sentence: 'She ___ to school.', correctAnswer: 'goes', chosenOption: 'go' });
  const s = T.createSession({ now: 1 });
  const seen = [];
  for (let i = 0; i < 3; i++) seen.push(T.composeTurn({ move: 'hint', scaffold: 'hint', concept: 'c', explanation: ex, whyFails: 'x', conceptLabel: 'c', chosenOption: 'go', correctAnswer: 'goes' }, null).ask);
  out('P10b', 'composeTurn: isi contoh-dikerjakan dengan input seperti app.js vs lengkap', {
    sepertiApp_worked: clip(asApp.ask, 200),
    inputLengkap_worked: clip(full.ask, 260),
    tanpaSession_askBerulangIdentik: seen.every(a => a === seen[0]),
    hintDefaultKalimat: clip(T.composeTurn({ move: 'hint', scaffold: 'hint', explanation: {} }).ask, 160),
    probeDefaultKalimat: clip(T.composeTurn({ move: 'hint', scaffold: 'probe', explanation: {} }).ask, 160),
    sessionDibuat: !!s
  });
}

function staticProbe() {
  const lines = (file, res) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n');
    const hits = [];
    src.forEach((l, i) => { for (const re of res) if (re.test(l)) { hits.push(`${file}:${i + 1}  ${clip(l, 110)}`); break; } });
    return hits;
  };
  const up = lines('features/grammar/fiezel-grammar-upgrade.js', [/Intip arti kata/, /isi di sini/, /'Coba periksa sekali lagi'/, /'Perhatikan bentuk kata kerja/, /Cek kata “\$\{/, /mungkin belum sesuai/, /'Ada kata yang belum terpasang'/, /'Masih ada kata yang tertinggal/, /PETUNJUK · 1 KESEMPATAN LAGI/, /Simpan Rumus ke Catatan/, /Beda dengan Bahasa Indonesia/, /'dia \(pr\)'/]);
  const app = lines('app.js', [/nudgeText=`Perhatikan lagi/, /nudgeText=`Pilihan “/, /`Kalimat yang tepat: “/, /`Bentuk yang tepat: “/, /`Kata “\$\{d\}” bukan bentuk yang tepat\.`/]);
  out('P11', 'literal Indonesia di jalur umpan balik salah (tanpa FiezelI18n.t)', { jumlah: up.length + app.length, baris: up.concat(app) });
  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  out('P12', 'kabel lain yang dibaca langsung dari sumber', {
    gxPinFormulaDidefinisikan: /function gxPinFormula|gxPinFormula\s*=/.test(appSrc + fs.readFileSync(path.join(ROOT, 'features/grammar/fiezel-grammar-upgrade.js'), 'utf8').replace(/typeof gxPinFormula|gxPinFormula\(this\)/g, '')),
    bktHanyaUntukTypeGrammar: /if\(q\.type==='grammar'\)\{\s*try\{bktRecord/.test(appSrc),
    vaultMinimumDua: /state\.mistakeVault\[mk\]=Math\.max\(2,/.test(appSrc),
    retrySembunyikanSayAsk: /const showSayAndAsk=!retry\|\|!q\.__diagnosticClue;/.test(appSrc),
    tutorComposeTanpaSession: /return self\.FiezelTutorBrain\.composeTurn\(\{[\s\S]{0,700}?\}\)\s*\n\s*\}catch\{return null\}/.test(appSrc),
    // P8 menyalin pencocok ini apa adanya; kalau baris sumbernya berubah, P8 harus ditinjau ulang.
    pencocokRevealSubstring: appSrc.includes('return xNorm===pNorm||(xNorm&&pNorm&&(pNorm.includes(xNorm)||xNorm.includes(pNorm)));'),
    pencocokTutorWhyFailsSubstring: appSrc.includes('return oNorm===cNorm||(oNorm&&cNorm.includes(oNorm));'),
    pencocokNudgeRetryEksak: appSrc.includes('const found=q.explain.distractors.find(x=>norm(String(x.option))===norm(String(userChoice)));'),
    // buildFeedbackHTML (tombol Simpan Rumus / kartu kontras) hanya dipanggil renderVideoExercise,
    // dan renderVideoExercise hanya dipakai mockup — bukan jalur kuis PWA.
    renderVideoExerciseDipakaiApp: /FiezelGrammarVideo\.renderVideoExercise\(/.test(appSrc)
  });
}

(async () => {
  staticProbe();
  moduleProbe();
  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    await tokenOrderProbes(browser, port);
    await mcProbes(browser, port);
    await thaiProbes(browser, port);
    await dataProbes(browser, port);
  } catch (e) {
    console.log('\n[probe berhenti]', e && e.stack || e);
  } finally {
    await browser.close();
    server.close();
  }
})();
