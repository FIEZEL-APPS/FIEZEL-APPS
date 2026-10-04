#!/usr/bin/env node
'use strict';
/**
 * tools/dev/grammar-ux-audit-2026-10-04-probe.js — audit UI/UX sesi latihan grammar sebagai MURID.
 *
 * Menjalankan index.html sungguhan di Chromium (berkas disajikan page.route, tanpa server, tanpa
 * egress) di layar HP 390x844, lalu menempuh alur yang dialami murid: Latihan -> Grammar Hub ->
 * materi pelajaran -> soal -> salah -> coba lagi -> salah lagi -> keyakinan -> pembahasan -> soal
 * berikut benar -> ... -> layar hasil. Diulang untuk locale th dan untuk mode gelap.
 *
 * Di tiap layar: tangkapan layar + pemeriksaan otomatis
 *   - kontras WCAG teks vs latar efektifnya (ambang 4,5:1; 3:1 untuk teks besar),
 *   - target sentuh < 44x44 px,
 *   - luapan horizontal (lebar konten > lebar layar),
 *   - teks Indonesia di layar locale th.
 *
 * Pakai: node tools/dev/grammar-ux-audit-2026-10-04-probe.js <folder-keluaran>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'reports', 'ux-grammar-2026-10-04'));
fs.mkdirSync(OUT, { recursive: true });
const ORIGIN = 'http://localhost:4173';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webp': 'image/webp' };
const findings = { screens: [] };

function loadPlaywright() {
  for (const id of ['playwright', '/opt/node22/lib/node_modules/playwright', '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright']) {
    try { return require(id); } catch (_) {}
  }
  return null;
}

/** Diperiksa DI DALAM halaman: kontras, target sentuh, luapan, kebocoran bahasa. */
function inspectPage(opts) {
  const parse = c => { const m = String(c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const bgOf = el => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/url\(/.test(cs.backgroundImage)) {
        const stops = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map(x => parse(x[0])).filter(Boolean);
        if (stops.length) { const avg = stops.reduce((a, s) => ({ r: a.r + s.r / stops.length, g: a.g + s.g / stops.length, b: a.b + s.b / stops.length, a: Math.min(a.a, s.a) }), { r: 0, g: 0, b: 0, a: 1 }); layers.push(avg); if (avg.a >= 0.99) break; }
      }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    const bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    if (bodyBg && bodyBg.a > 0) base = blend(bodyBg, base);
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return base;
  };
  const visible = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05 && r.bottom > 0 && r.top < innerHeight * 3; };
  const lowContrast = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!own || own.length < 2) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    const fgEff = blend(fg, bg);
    const L1 = lum(fgEff), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      const key = own.slice(0, 40) + '|' + ratio.toFixed(2);
      if (seen.has(key)) continue; seen.add(key);
      lowContrast.push({ text: own.slice(0, 60), ratio: Number(ratio.toFixed(2)), need, size: Math.round(size), cls: String(el.className || el.tagName).slice(0, 60) });
    }
  }
  const smallTargets = [];
  for (const el of document.querySelectorAll('button, a[href], [role="button"], .option, input, select')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.width < 44 || r.height < 44) && r.top < innerHeight * 2) smallTargets.push({ label: (el.getAttribute('aria-label') || el.textContent || el.id || el.className || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const overflowX = document.documentElement.scrollWidth > innerWidth + 1;
  const idWords = /\b(Pilihan|kurang|tepat|Coba|Petunjuk|Kesempatan|Lanjut|Benar|Salah|Mulai|Soal|Latihan|Pembahasan|Kembali|Penjelasan|Keyakinan|TATA BAHASA|Jawaban|Lihat)\b/;
  const idLeaks = opts && opts.locale === 'th' ? [...new Set([...document.querySelectorAll('body *')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === 3 && idWords.test(n.textContent))).map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').slice(0, 60)))].slice(0, 12) : [];
  const fonts = [...new Set([...document.querySelectorAll('#app *')].filter(visible).map(e => Math.round(parseFloat(getComputedStyle(e).fontSize))))].sort((a, b) => a - b);
  return { lowContrast: lowContrast.slice(0, 25), lowContrastCount: lowContrast.length, smallTargets: smallTargets.slice(0, 15), smallTargetCount: smallTargets.length, overflowX, idLeaks, fontSizes: fonts, scrollHeight: document.documentElement.scrollHeight };
}

async function run() {
  const pw = loadPlaywright();
  if (!pw) { console.log('Playwright tidak tersedia'); return; }
  const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
  const shoot = async (page, name, note, opts = {}) => {
    await page.waitForTimeout(450);
    const file = path.join(OUT, name + '.png');
    await page.screenshot({ path: file, fullPage: !!opts.full });
    let check = null;
    try { check = await page.evaluate(inspectPage, { locale: opts.locale || 'id' }); } catch (e) { check = { error: String(e) }; }
    findings.screens.push({ name, note, file: path.relative(ROOT, file), ...check });
    console.log(`[${name}] ${note} | kontras<ambang: ${check.lowContrastCount} | target kecil: ${check.smallTargetCount} | luapan-x: ${check.overflowX}${check.idLeaks && check.idLeaks.length ? ' | bocor-id: ' + check.idLeaks.length : ''}`);
  };
  const boot = async ({ locale = 'id', dark = false } = {}) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light', serviceWorkers: 'block' });
    const page = await context.newPage();
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN) return route.abort();
      const target = path.resolve(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, ''));
      if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(target)] || 'application/octet-stream', body: fs.readFileSync(target) });
    });
    await page.addInitScript(loc => {
      try {
        localStorage.clear();
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: loc, name: 'Rani' }));
        localStorage.setItem('fiezel-state-v1', JSON.stringify({ preferences: { learnerLocale: loc, learnerLocaleExplicit: true } }));
        localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
        localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
        localStorage.setItem('fiezel-puter-auth-skipped', '1');
      } catch (_) {}
    }, locale);
    const t0 = Date.now();
    await page.goto(ORIGIN + '/');
    await page.waitForFunction(() => typeof window.go === 'function' && self.FiezelGrammarUpgrade && typeof window.renderGrammarLesson === 'function', null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    findings.bootMs = findings.bootMs || Date.now() - t0;
    await page.evaluate(() => { document.getElementById('fiezelBootSplash')?.remove(); document.documentElement.classList.remove('fz-booting'); document.querySelector('.fiezel-ob')?.remove(); });
    if (locale === 'th') {
      await page.evaluate(() => FiezelI18n.setLocale('th'));
      await page.waitForFunction(() => self.FiezelThData && self.FiezelThData.ready, null, { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.evaluate(() => {
      window.__q = null;
      const U = self.FiezelGrammarUpgrade, show = U.showGrammarHint, rt = U.renderTokenOrder;
      U.renderTokenOrder = function (q) { window.__q = q; return rt.apply(this, arguments); };
      window.__peek = () => { const keep = U.showGrammarHint; U.showGrammarHint = q => { window.__q = q; }; document.getElementById('quizGrammarHint')?.click(); U.showGrammarHint = keep; return window.__q; };
    });
    return { context, page };
  };
  const curQ = page => page.evaluate(() => { const q = window.__peek(); return q && { type: q.type, options: (q.options || []).slice(), answerIndex: q.answerIndex, tokens: (q.tokens || []).slice(), clozeAnswer: q.clozeAnswer || '' }; });
  const pickOpt = async (page, j) => { await page.evaluate(k => document.querySelectorAll('#options .option')[k]?.click(), j); await page.waitForTimeout(900); };
  const answerCorrect = async (page, q) => {
    if (!q) return false;
    if (q.type === 'token-order') {
      await page.evaluate(ws => { for (const w of ws) { const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w && !x.disabled); b?.click(); } document.getElementById('tokenSubmitBtn')?.click(); }, q.tokens);
    } else if (q.type === 'cloze') {
      await page.evaluate(a => { const i = document.querySelector('#options input, .cloze-input, input[type=text]'); if (i) { i.value = a; i.dispatchEvent(new Event('input', { bubbles: true })); } (document.querySelector('#options button.primary, .cloze-submit') || {}).click?.(); }, q.clozeAnswer);
    } else await pickOpt(page, q.answerIndex);
    await page.waitForTimeout(900);
    return true;
  };
  const next = async page => {
    await page.evaluate(() => { const pop = document.querySelector('#confidencePop'); (pop?.querySelector('.confidence-skip') || pop?.querySelector('.confidence-go'))?.click(); });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.getElementById('quizNext')?.click());
    await page.waitForTimeout(900);
  };

  /** Ketuk elemen yang terlihat dan teksnya cocok - di dalam modal yang terbuka bila ada. */
  const tap = (page, re) => page.evaluate(src => {
    const rx = new RegExp(src, 'i');
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const modal = [...document.querySelectorAll('.modal.show, .modal.open, [role=dialog]')].filter(vis).pop();
    const els = [...(modal || document).querySelectorAll('button, [onclick], [role=button]')].filter(vis);
    const e = els.find(x => rx.test((x.innerText || '').trim()));
    if (!e) return '';
    e.click(); return (e.innerText || '').trim().slice(0, 50);
  }, re.source);
  /** Mini game "FIEZEL QUEST": dimainkan dengan BENAR lewat handler kartu yang sama yang dipakai ketukan. */
  const playQuest = async (page, prefix, opts) => {
    let shotRound = new Set();
    for (let i = 0; i < 60; i++) {
      const st = await page.evaluate(() => { const g = FiezelGrammarVocabBridge.getActiveMiniGame(); if (!g) return null; const rq = g.rapidQuestions && g.rapidQuestions[g.rapidIndex]; return { round: g.round, victory: !!g.isVictory, rapid: rq ? rq.correctMeaning : null, tokens: g.cachedTokens || null, placed: (g.placedTokens || []).length, matched: g.matchedIds ? g.matchedIds.size : 0, words: (g.words || []).length }; });
      if (!st) break;
      const key = st.victory ? 'v' : String(st.round) + (st.rapid ? 'r' : '');
      if (!shotRound.has(key)) { shotRound.add(key); await shoot(page, `${prefix}-quest-${key}`, `FIEZEL QUEST tahap ${st.victory ? 'menang' : st.round}${st.rapid ? ' (pilihan cepat)' : ''}`, opts); }
      if (st.victory) { await tap(page, /Masuk|Lanjut|Mulai|Latihan|เข้าสู่|ไปที่|เริ่ม/); await page.waitForTimeout(1500); break; }
      if (st.round === 1) {
        await page.evaluate(() => { const g = FiezelGrammarVocabBridge.getActiveMiniGame(); const left = [...document.querySelectorAll('.match-card.en-card:not(.is-matched)')][0]; if (!left) return; const id = (left.getAttribute('onclick') || '').match(/'([^']+)'/)[1]; left.click(); const right = [...document.querySelectorAll('.match-card.id-card')].find(x => (x.getAttribute('onclick') || '').includes(`'${id}'`)); right && right.click(); });
        await page.waitForTimeout(700);
      } else if (st.rapid) {
        await page.evaluate(m => FiezelGrammarVocabBridge.handleRapidChoice(m), st.rapid); await page.waitForTimeout(1600);
      } else if (st.tokens && st.placed < st.tokens.length) {
        await page.evaluate(ts => { const g = FiezelGrammarVocabBridge.getActiveMiniGame(); for (const t of ts.slice(g.placedTokens.length)) FiezelGrammarVocabBridge.addPuzzleToken(t); }, st.tokens);
        await page.waitForTimeout(300);
        if (!shotRound.has(key + 'p')) { shotRound.add(key + 'p'); await shoot(page, `${prefix}-quest-${key}-tersusun`, 'FIEZEL QUEST: kalimat tersusun, sebelum diperiksa', opts); }
        await page.evaluate(() => FiezelGrammarVocabBridge.checkSentencePuzzle()); await page.waitForTimeout(1800);
      } else { await page.waitForTimeout(800); }
    }
  };
  /** Tur pengenalan (coach mark) bisa muncul kapan saja; murid menutupnya dengan "Lewati". Dipotret sekali. */
  const dismissTour = async (page, prefix, opts) => {
    const has = await page.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; return [...document.querySelectorAll('button')].filter(vis).some(b => /^(Lewati|ข้าม)$/.test((b.innerText || '').trim())); });
    if (!has) return false;
    if (!findings[prefix + 'Tour']) { findings[prefix + 'Tour'] = true; await shoot(page, `${prefix}-tur`, 'Tur pengenalan muncul di atas layar', opts); }
    await page.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; [...document.querySelectorAll('button')].filter(vis).find(b => /^(Lewati|ข้าม)$/.test((b.innerText || '').trim()))?.click(); });
    await page.waitForTimeout(700); return true;
  };
  const startLessonLikeStudent = async (page, prefix, opts = {}) => {
    await page.evaluate(() => window.go('grammar')); await page.waitForTimeout(1500);
    await dismissTour(page, prefix, opts);
    if (await page.evaluate(() => /Ritme|ความเข้มข้น/i.test(document.querySelector('.modal.show')?.innerText || ''))) {
      await shoot(page, `${prefix}-ritme`, 'Modal "Pilih Ritme Belajarmu" (kunjungan pertama ke Grammar)', opts);
      await tap(page, /Santai|สบาย|ชิล/); await page.waitForTimeout(1200);
      await dismissTour(page, prefix, opts);
    }
    await shoot(page, `${prefix}-grammar-hub`, 'Grammar Hub', opts);
    if (!opts.light) await shoot(page, `${prefix}-grammar-hub-full`, 'Grammar Hub (seluruh halaman)', { ...opts, full: true });
    await page.evaluate(() => document.querySelector('.path-cta')?.click()); await page.waitForTimeout(1300);
    findings[prefix + 'AfterOpen'] = await page.evaluate(() => ({ modal: (document.querySelector('.modal.show')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160), lessonHero: !!document.querySelector('.grammar-start-hero') }));
    await shoot(page, `${prefix}-buka-materi`, 'Sesudah mengetuk "Buka materi"', opts);
    await dismissTour(page, prefix, opts);
    if (await tap(page, /Mini Game|มินิเกม/)) { await page.waitForTimeout(1300); await playQuest(page, prefix, opts); }
    await page.waitForTimeout(800);
    await shoot(page, `${prefix}-sesudah-quest`, 'Sesudah FIEZEL QUEST selesai', opts);
    if (await page.evaluate(() => !!document.querySelector('.grammar-start-hero'))) {
      await shoot(page, `${prefix}-materi`, 'Kartu materi pelajaran', opts);
      await page.evaluate(() => document.querySelector('.grammar-start-direct-btn')?.click()); await page.waitForTimeout(1500);
    }
  };

  // ---------------- 1. Murid Indonesia, mode terang ----------------
  {
    const { context, page } = await boot();
    await page.evaluate(() => window.go('latihan')); await shoot(page, '01-latihan', 'Hub Latihan');
    await startLessonLikeStudent(page, '02');
    let q = await curQ(page);
    findings.firstQuestionType = q && q.type;
    await shoot(page, '04-soal', `Soal pertama (${q && q.type})`);
    if (q && q.type === 'token-order') { await shoot(page, '04b-soal-full', 'Soal pertama (seluruh halaman)', { full: true }); }
    // salah sekali, lalu salah lagi
    if (q && q.options && q.options.length && q.type !== 'token-order') {
      const wrong = q.options.findIndex((_, i) => i !== q.answerIndex);
      await pickOpt(page, wrong); await shoot(page, '05-salah-pertama', 'Sesudah jawaban salah pertama (coba lagi)');
      await shoot(page, '05b-salah-pertama-full', 'Sesudah salah pertama (seluruh halaman)', { full: true });
      const wrong2 = q.options.findIndex((_, i) => i !== q.answerIndex && i !== wrong);
      await pickOpt(page, wrong2 >= 0 ? wrong2 : wrong); await shoot(page, '06-keyakinan', 'Sesudah salah kedua (popup keyakinan)');
      await page.evaluate(() => document.querySelector('#confidencePop .confidence-go, #confidencePop .confidence-skip')?.click()); await page.waitForTimeout(1100);
      await shoot(page, '07-pembahasan', 'Pembahasan (layar pertama)');
      await shoot(page, '07b-pembahasan-full', 'Pembahasan (seluruh halaman)', { full: true });
      findings.reveal = await page.evaluate(() => ({ feedback: (document.getElementById('feedback')?.innerText || '').slice(0, 1500), tutor: (document.getElementById('tutorTurn')?.innerText || '').slice(0, 600), telemetryShown: !!document.querySelector('.braincore-telemetry-row') && getComputedStyle(document.querySelector('.braincore-telemetry-row')).display !== 'none' }));
      await next(page);
    } else if (q && q.type === 'token-order') {
      await page.evaluate(ws => { for (const w of ws.slice().reverse()) { const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w && !x.disabled); b?.click(); } document.getElementById('tokenSubmitBtn')?.click(); }, q.tokens);
      await page.waitForTimeout(900); await shoot(page, '05-salah-pertama', 'Susun kata salah pertama'); await shoot(page, '05b-salah-pertama-full', 'Susun kata salah pertama (seluruh halaman)', { full: true });
      await page.evaluate(() => document.getElementById('tokenSubmitBtn')?.click()); await page.waitForTimeout(900);
      await shoot(page, '06-keyakinan', 'Susun kata salah kedua');
      await page.evaluate(() => document.querySelector('#confidencePop .confidence-go, #confidencePop .confidence-skip')?.click()); await page.waitForTimeout(1100);
      await shoot(page, '07-pembahasan', 'Pembahasan susun kata'); await shoot(page, '07b-pembahasan-full', 'Pembahasan susun kata (seluruh halaman)', { full: true });
      findings.reveal = await page.evaluate(() => ({ feedback: (document.getElementById('feedback')?.innerText || '').slice(0, 1500), tutor: (document.getElementById('tutorTurn')?.innerText || '').slice(0, 600) }));
      await next(page);
    }
    const shotTypes = new Set();
    for (let i = 0; i < 24; i++) {
      const onResult = await page.evaluate(() => !!document.querySelector('.result-stage'));
      if (onResult) break;
      q = await curQ(page);
      if (!q) { await page.waitForTimeout(700); await next(page); continue; }
      if (!shotTypes.has(q.type)) { shotTypes.add(q.type); await shoot(page, '08-jenis-' + q.type, 'Jenis soal: ' + q.type); }
      await answerCorrect(page, q);
      if (i === 0) await shoot(page, '09-benar', 'Sesudah jawaban benar');
      await next(page);
    }
    findings.questionTypes = [...shotTypes];
    await page.waitForTimeout(1200);
    await shoot(page, '10-hasil', 'Layar hasil sesi'); await shoot(page, '10b-hasil-full', 'Layar hasil sesi (seluruh halaman)', { full: true });
    findings.result = await page.evaluate(() => (document.querySelector('.result-stage')?.innerText || '').slice(0, 800));
    await context.close();
  }

  // ---------------- 2. Murid Thai ----------------
  {
    const { context, page } = await boot({ locale: 'th' });
    await startLessonLikeStudent(page, '11-th', { locale: 'th', light: true });
    const q = await curQ(page);
    await shoot(page, '13-th-soal', 'Soal (th)', { locale: 'th' });
    if (q && q.options && q.options.length && q.type !== 'token-order') {
      const wrong = q.options.findIndex((_, i) => i !== q.answerIndex);
      await pickOpt(page, wrong); await shoot(page, '13-th-salah', 'Salah pertama (th)', { locale: 'th', full: true });
      await pickOpt(page, q.options.findIndex((_, i) => i !== q.answerIndex && i !== wrong));
      await page.evaluate(() => document.querySelector('#confidencePop .confidence-go, #confidencePop .confidence-skip')?.click()); await page.waitForTimeout(1100);
      await shoot(page, '14-th-pembahasan', 'Pembahasan (th)', { locale: 'th', full: true });
    }
    await context.close();
  }

  // ---------------- 3. Mode gelap (preferensi sistem) ----------------
  {
    const { context, page } = await boot({ dark: true });
    await startLessonLikeStudent(page, '15-gelap', { light: true });
    const q = await curQ(page);
    await shoot(page, '15-gelap-soal', 'Soal (sistem gelap)');
    if (q && q.options && q.options.length && q.type !== 'token-order') {
      const wrong = q.options.findIndex((_, i) => i !== q.answerIndex);
      await pickOpt(page, wrong); await pickOpt(page, q.options.findIndex((_, i) => i !== q.answerIndex && i !== wrong));
      await page.evaluate(() => document.querySelector('#confidencePop .confidence-go, #confidencePop .confidence-skip')?.click()); await page.waitForTimeout(1100);
      await shoot(page, '16-gelap-pembahasan', 'Pembahasan (sistem gelap)', { full: true });
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2));
  console.log('\nselesai ->', path.relative(ROOT, OUT));
}
run().catch(e => { console.error(e); process.exitCode = 1; });
