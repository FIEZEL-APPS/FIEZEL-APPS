#!/usr/bin/env node
/**
 * GERBANG UMPAN BALIK SALAH-JAWAB GRAMMAR (tests/grammar-feedback-regression-test.js).
 *
 * Mengunci perbaikan audit reports/BRAINCORE-GRAMMAR-FEEDBACK-AUDIT-2026-10-03.md. Keempat
 * cacat tinggi/sedang di sana lolos dari 300+ gerbang yang membaca sumber, karena cacatnya
 * baru terlihat saat murid MENGKLIK: widget susun kata yang menahan kiriman salah, pencocok
 * alasan yang memilih pilihan lain, naskah Indonesia di layar Thai, lencana "2x keliru"
 * sesudah satu kesalahan. Karena itu bagian B menjalankan index.html sungguhan di Chromium
 * dan menjawab dengan klik.
 *
 * A. Selalu jalan (tanpa browser): pencocok alasan dijalankan dari sumber app.js di VM,
 *    kunci naskah baru punya kembaran th, literal lama tidak kembali.
 * B. Browser (Playwright + Chromium). SKIP dengan pesan jelas, keluar 0, bila tidak ada —
 *    pola yang sama dengan tests/ui-render-audit-test.js. Merah hanya bila browsernya ada
 *    DAN perilakunya patah.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: konvensi alias akar repo untuk gerbang di tests/. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');
const assert = require('assert');

const ROOT = __fzRoot;
const APP = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const WIDGET = fs.readFileSync(path.join(ROOT, 'features/grammar/fiezel-grammar-upgrade.js'), 'utf8');

let pass = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + '\n    ' + (e && e.message)); }
}

// ------------------------------------------------------------------------------------------
// A. Tanpa browser
// ------------------------------------------------------------------------------------------
function loadMatcher() {
  const hit = APP.match(/function grammarReasonEntry\([\s\S]*?\n\}/);
  assert.ok(hit, 'grammarReasonEntry tidak ditemukan di app.js');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(hit[0] + '\nthis.grammarReasonEntry=grammarReasonEntry;', ctx);
  return ctx.grammarReasonEntry;
}

async function sectionA() {
  let match = () => { throw new Error('grammarReasonEntry tidak termuat'); };
  await test('A0 pencocok alasan bersama ada di app.js', () => { match = loadMatcher(); });
  // Urutan daftar sengaja menaruh KUNCI lebih dulu: persis keadaan yang dulu membuat murid
  // yang memilih "going" membaca alasan milik "go".
  const q = {
    options: ['go', 'going', 'goes', 'went'], answerIndex: 0,
    explain: { distractors: [
      { option: 'go', reason: '“go” bener — “We” itu jamak.' },
      { option: 'going', reason: '“going” butuh “are” di depannya.' },
      { option: 'goes', reason: '“goes” cuma untuk he/she/it.' },
      { option: 'went', reason: '“went” bentuk lampau.' }
    ] }
  };
  await test('A1 pencocok alasan: setiap pilihan salah mendapat alasannya SENDIRI', () => {
    for (const opt of ['going', 'goes', 'went']) assert.strictEqual(match(q, opt).option, opt, opt);
  });
  await test('A2 pencocok alasan: cadangan substring tidak pernah jatuh ke kunci', () => {
    const r = match(q, 'we go');
    assert.ok(!r || r.option !== 'go', 'kunci dipakai sebagai "alasan salah"');
  });
  await test('A3 pencocok alasan: cadangan hanya bila tepat satu pilihan salah cocok', () => {
    const q2 = { options: ['at', 'in', 'on'], answerIndex: 0, explain: { distractors: [
      { option: 'in', reason: 'r-in' }, { option: 'on', reason: 'r-on' }] } };
    assert.strictEqual(match(q2, 'in on'), null, 'dua kandidat → harus diam, bukan menebak');
    assert.strictEqual(match(q2, 'in the morning').option, 'in');
  });
  await test('A4 literal Indonesia lama tidak kembali ke jalur umpan balik', () => {
    for (const lit of ['PETUNJUK · 1 KESEMPATAN LAGI', 'Coba periksa sekali lagi', 'Intip arti kata',
      "'<span>↳</span> isi di sini'", 'Simpan Rumus ke Catatan', "'dia (pr)'"]) {
      assert.ok(!WIDGET.includes(lit), 'widget memuat literal: ' + lit);
    }
    for (const lit of ['nudgeText=`Perhatikan lagi', 'nudgeText=`Pilihan “', '`Kalimat yang tepat: “', '`Kata “${d}” bukan bentuk yang tepat.`']) {
      assert.ok(!APP.includes(lit), 'app.js memuat literal: ' + lit);
    }
  });
  await test('A5 kunci naskah baru terdaftar di id DAN th (aksara Thai)', () => {
    const read = f => fs.readFileSync(path.join(ROOT, 'features/i18n', f), 'utf8');
    const pairs = [['copy-id-app-e.js', 'copy-th-app-e.js', ['quiz.retry-why-probe', 'quiz.retry-why-hint', 'quiz.why-kalimat-tepat', 'quiz.why-bentuk-tepat']],
      ['copy-id-grammar-labels.js', 'copy-th-grammar-labels.js', ['grammar.token-intip-arti', 'grammar.token-isi-di-sini', 'grammar.token-reason-fallback', 'grammar.gloss.she', 'grammar.gloss.went']]];
    for (const [idf, thf, keys] of pairs) {
      const id = read(idf), th = read(thf);
      for (const k of keys) {
        assert.ok(id.includes("'" + k + "'"), k + ' hilang di ' + idf);
        const m = th.match(new RegExp("'" + k.replace(/\./g, '\\.') + "':\\s*'([^']*)'"));
        assert.ok(m && /[฀-๿]/.test(m[1]), k + ' tanpa nilai Thai di ' + thf);
      }
    }
  });
  await test('A6 widget susun kata tidak lagi menahan kiriman salah', () => {
    assert.ok(!/q\.__scaffoldAttempt\s*=\s*true/.test(WIDGET), 'widget kembali memasang scaffold sendiri');
    assert.ok(!/tokenScaffoldHint/.test(WIDGET), 'kotak petunjuk internal widget kembali');
  });
}

// ------------------------------------------------------------------------------------------
// B. Browser
// ------------------------------------------------------------------------------------------
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
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const p = new URL(req.url, 'http://127.0.0.1').pathname;
      const target = path.resolve(ROOT, p === '/' ? 'index.html' : p.replace(/^\/+/, ''));
      if (!target.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(target, (e, c) => {
        if (e) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(target)] || 'application/octet-stream' });
        res.end(c);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const ID_WORDS = /\b(pilihan|kurang|tepat|coba|petunjuk|kesempatan|kata|kalimat|ganti|lengkapi|belum)\b/i;

async function boot(browser, port, locale) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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
  await page.waitForFunction(() => typeof window.startTokenOrderSession === 'function' && self.FiezelGrammarUpgrade && self.FiezelTutorBrain, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove();
    document.documentElement.classList.remove('fz-booting');
    document.querySelector('.fiezel-ob')?.remove();
  });
  if (locale === 'th') {
    await page.evaluate(() => FiezelI18n.setLocale('th'));
    await page.waitForFunction(() => self.FiezelThData && self.FiezelThData.ready && FiezelI18n.t('quiz.periksa-ulang') !== 'Periksa Ulang', null, { timeout: 60000 });
    await page.waitForTimeout(500);
  }
  await page.evaluate(() => {
    window.__gt = { q: null };
    const U = self.FiezelGrammarUpgrade, rt = U.renderTokenOrder;
    U.renderTokenOrder = function (q) { window.__gt.q = q; return rt.apply(this, arguments); };
    U.showGrammarHint = function (q) { window.__gt.q = q; };
  });
  return page;
}
const snap = page => page.evaluate(() => {
  const s = window.__getFiezelState(), vis = id => { const el = document.getElementById(id); return el && !el.hidden && !el.classList.contains('hidden') ? el.innerText : ''; };
  return { history: s.history.length, last: s.history[s.history.length - 1] || null, nudge: document.getElementById('quizScaffoldNudge')?.innerText || '',
    tutor: vis('tutorTurn'), confidence: !!document.getElementById('confidencePop'), feedback: vis('feedback') };
});
const place = (page, words) => page.evaluate(ws => {
  const reset = document.getElementById('tokenResetBtn'); if (reset && !reset.disabled) reset.click();
  for (const w of ws) { const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w); if (!b) return false; b.click(); }
  return true;
}, words);
const submit = async page => { await page.evaluate(() => document.getElementById('tokenSubmitBtn')?.click()); await page.waitForTimeout(700); };
const openReveal = async page => { await page.evaluate(() => document.querySelector('#confidencePop .confidence-go')?.click()); await page.waitForTimeout(900); };
async function tokenQ(page) {
  await page.evaluate(() => { window.__gt.q = null; window.startTokenOrderSession(); });
  await page.waitForTimeout(1500);
  return page.evaluate(() => { const q = window.__gt.q; return q && { tokens: q.tokens.slice(), distractors: q.distractors.slice() }; });
}
async function mcQ(page) {
  await page.evaluate(() => window.startGrammarQuickSession());
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__gt.q = null; document.getElementById('quizGrammarHint')?.click(); });
  await page.waitForTimeout(200);
  return page.evaluate(() => { const q = window.__gt.q; return q && { type: q.type, options: q.options.slice(), answerIndex: q.answerIndex, skill: q.lessonSkill || q.skill }; });
}
const reversed = t => { const r = t.slice().reverse(); return r.join(' ') === t.join(' ') ? t.slice(1).concat(t[0]) : r; };
const pick = async (page, j) => { await page.evaluate(k => document.querySelectorAll('#options .option')[k]?.click(), j); await page.waitForTimeout(700); };

async function sectionB() {
  const pw = loadPlaywright();
  const exe = pw && findChromium(pw);
  if (!pw || !exe) { console.log('SKIP - B (browser): Playwright/Chromium tidak tersedia'); return; }
  const server = await serve();
  const port = server.address().port;
  const browser = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  try {
    let page = await boot(browser, port, 'id');
    let q = await tokenQ(page);
    const h0 = (await snap(page)).history;
    await test('B1 susun kata: kiriman salah pertama langsung dinilai answer() (2 kesempatan, bukan 3)', async () => {
      await place(page, reversed(q.tokens)); await submit(page);
      const a1 = await snap(page);
      assert.strictEqual(a1.history - h0, 1, 'kiriman salah pertama tidak tercatat');
      assert.strictEqual(a1.last.ok, false);
      assert.ok(a1.nudge, 'retry app tidak muncul pada kiriman pertama');
      await place(page, reversed(q.tokens)); await submit(page);
      assert.ok((await snap(page)).confidence, 'pembahasan tidak terbuka pada kiriman kedua');
    });
    await page.close();

    page = await boot(browser, port, 'id');
    q = await tokenQ(page);
    await test('B2 susun kata: salah lalu benar tercatat SALAH di percobaan pertama', async () => {
      const before = (await snap(page)).history;
      await place(page, reversed(q.tokens)); await submit(page);
      await place(page, q.tokens); await submit(page);
      const s = await snap(page);
      assert.strictEqual(s.history - before, 1, 'jumlah baris riwayat');
      assert.strictEqual(s.last.ok, false, 'salah-lalu-benar dinilai benar penuh');
    });
    await page.close();

    page = await boot(browser, port, 'id');
    const m = await mcQ(page);
    await test('B3 pilihan ganda: SATU kesalahan tidak menampilkan lencana "2x keliru"', async () => {
      assert.ok(m && m.type === 'grammar', 'soal pertama sesi kilat bukan pilihan ganda');
      await pick(page, m.options.findIndex((_, i) => i !== m.answerIndex));
      await pick(page, m.answerIndex);
      await openReveal(page);
      const pills = await page.evaluate(() => document.querySelector('#feedback .braincore-telemetry-row')?.innerText || '');
      assert.ok(!/2x/.test(pills), 'lencana: ' + pills);
    });
    const m2 = await mcQ(page);
    await test('B4 sesudah "Buka Pembahasan", tutor tidak menyuruh mencoba lagi', async () => {
      assert.ok(m2 && m2.type === 'grammar');
      await pick(page, m2.options.findIndex((_, i) => i !== m2.answerIndex));
      await page.evaluate(() => document.getElementById('quizRetryGiveUp')?.click());
      await page.waitForTimeout(700);
      const s = await snap(page);
      assert.ok(s.feedback, 'pembahasan tidak terbuka');
      assert.ok(!/coba (lagi|jawab lagi)|yuk coba|sekarang coba/i.test(s.tutor), 'tutor: ' + s.tutor);
      const why = (s.feedback.split('\n').find(l => /Mengapa kurang tepat/.test(l)) || '').replace(/^.*\?\s*/, '');
      if (why) assert.ok(!s.tutor.includes(why.slice(0, 40)), 'alasan diulang di kotak tutor');
    });
    await test('B5 data: alasan "Mengapa kurang tepat?" selalu milik pilihan yang diambil', async () => {
      const r = await page.evaluate(() => {
        const st = window.__getFiezelState(), items = window.getGrammarItems(), keep = st.preferences.activeLevel;
        const nw = w => String(w ?? '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        let picks = 0, wrong = 0, toKey = 0;
        for (const L of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
          st.preferences.activeLevel = L;
          for (const sk of [...new Set(items.filter(x => x.level === L).map(x => x.skill))]) {
            for (const q of (window.buildGrammarLessonQuestions(sk) || [])) {
              if (q.type !== 'grammar') continue;
              q.options.forEach((opt, j) => {
                if (j === q.answerIndex) return;
                picks++;
                const e = typeof window.grammarReasonEntry === 'function' ? window.grammarReasonEntry(q, opt) : { option: '__missing__' };
                if (e && nw(e.option) !== nw(opt)) { wrong++; if (nw(e.option) === nw(q.options[q.answerIndex])) toKey++; }
              });
            }
          }
        }
        st.preferences.activeLevel = keep;
        return { picks, wrong, toKey };
      });
      assert.ok(r.picks > 1000, 'terlalu sedikit soal dirakit: ' + r.picks);
      assert.strictEqual(r.wrong, 0, `salah alamat ${r.wrong}/${r.picks} (ke kunci ${r.toKey})`);
    });
    await page.close();

    page = await boot(browser, port, 'th');
    q = await tokenQ(page);
    await test('B6 locale th: umpan balik salah susun kata tanpa naskah Indonesia', async () => {
      const words = q.distractors.length ? q.tokens.concat([q.distractors[0]]) : reversed(q.tokens);
      await place(page, words); await submit(page);
      const s = await snap(page);
      for (const [label, text] of [['banner', s.nudge], ['tutor', s.tutor]]) {
        assert.ok(!ID_WORDS.test(text), label + ' memuat kata Indonesia: ' + text.slice(0, 160));
      }
      const glossBtn = await page.evaluate(() => document.getElementById('tokenGlossToggle')?.innerText || '');
      assert.ok(!/Intip/.test(glossBtn), 'tombol gloss Indonesia: ' + glossBtn);
    });
    const tm = await mcQ(page);
    await test('B7 locale th: nudge retry pilihan ganda tanpa bingkai Indonesia', async () => {
      assert.ok(tm && tm.type === 'grammar');
      await pick(page, tm.options.findIndex((_, i) => i !== tm.answerIndex));
      const s = await snap(page);
      assert.ok(s.tutor, 'kotak tutor kosong');
      assert.ok(!/\b(Pilihan|kurang tepat|Coba pilih|Perhatikan lagi)\b/.test(s.tutor), 'tutor: ' + s.tutor.slice(0, 200));
    });
    await page.close();
  } finally {
    await browser.close();
    server.close();
  }
}

(async () => {
  await sectionA();
  await sectionB();
  console.log('');
  if (failures.length) { console.error(`FIEZEL grammar feedback regression: FAIL (${failures.length})`); process.exit(1); }
  console.log(`FIEZEL grammar feedback regression: PASS (${pass})`);
})();
