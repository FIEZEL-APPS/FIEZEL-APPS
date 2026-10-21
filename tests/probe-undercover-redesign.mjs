#!/usr/bin/env node
/**
 * tests/probe-undercover-redesign.mjs — PROBE EMPIRIS UNDERCOVER "NEON CYBER-AGENCY" (m025-561)
 *
 * Bukan gerbang CI (namanya tidak berakhiran -test.js, jadi gate-registry tidak menuntutnya):
 * ia butuh Chromium sungguhan. Ia memainkan undercover.html dari awal sampai debrief di
 * viewport iPhone 390x844 dan MEMBUKTIKAN, bukan mengklaim:
 *
 *   1. Invarian 100dvh nol-scroll di SETIAP babak: html/body tidak lebih tinggi/lebar dari
 *      viewport, layar aktif tidak keluar viewport, dan panel internal (lobi, synthesizer,
 *      debrief) tidak menyembunyikan isi yang terpotong.
 *   2. Nol console error dan nol pageerror sepanjang empat skenario.
 *   3. Seluruh babak terjadi: lobi → dossier 3D (scan ditahan sungguhan) → interogasi
 *      (synthesizer) → debat (seruan + lemparan barang beranimasi) → tribunal (tiket suara,
 *      stempel eliminasi) → sudden death → debrief.
 *   4. Jembatan Braincore: baris bukti benar-benar masuk antrean localStorage dengan vocabId
 *      bank yang sah, dan TIDAK ada baris untuk kata di luar bank.
 *   5. Tujuh SFX wajib benar-benar dibunyikan (dihitung lewat FiezelUndercoverUI.sfx).
 *
 * Pakai:  node tests/probe-undercover-redesign.mjs
 * Keluaran: reports/undercover-redesign/*.jpg + probe-report.json. Exit 1 bila ada yang gagal.
 * Chromium: PLAYWRIGHT_CHROMIUM=<path> atau /opt/pw-browsers/chromium bila ada.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'reports', 'undercover-redesign');
const SPEED = 6;
const VIEWPORT = { width: 390, height: 844 };
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/\.(png|jpg)$/.test(f)) fs.unlinkSync(path.join(OUT, f));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/undercover.html`;

const exe = process.env.PLAYWRIGHT_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });

const results = [];
const consoleErrors = [];
const shots = [];
const sfxFired = {};
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
}

async function newPage() {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  return { ctx, page };
}

async function instrumentSfx(page) {
  await page.evaluate(() => {
    const s = window.FiezelUndercoverUI.sfx;
    window.__sfx = {};
    Object.keys(s).filter((k) => k.indexOf('sfx') === 0).forEach((k) => {
      const orig = s[k];
      s[k] = function () { window.__sfx[k] = (window.__sfx[k] || 0) + 1; return orig.apply(this, arguments); };
    });
    /* Balon dialog berumur pendek (umurnya ikut dibagi ?speed), jadi yang dihitung adalah
       KELAHIRANNYA lewat MutationObserver, bukan yang kebetulan masih terlihat. */
    window.__bubbles = { clue: 0, chat: 0 };
    new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.classList && n.classList.contains('uc-bubble')) window.__bubbles[n.classList.contains('is-chat') ? 'chat' : 'clue']++;
    }))).observe(document.getElementById('uc-arena'), { childList: true });
  });
}
async function collectSfx(page) {
  const got = await page.evaluate(() => window.__sfx || {});
  for (const k of Object.keys(got)) sfxFired[k] = (sfxFired[k] || 0) + got[k];
}

async function fit(page, label) {
  const m = await page.evaluate(() => {
    const de = document.documentElement;
    const b = document.body;
    const vis = Array.from(document.querySelectorAll('.uc-screen')).find((n) => !n.hidden);
    const r = vis ? vis.getBoundingClientRect() : { bottom: 0, right: 0 };
    const clipped = [];
    ['.uc-lobby-body', '#uc-p-synth', '.uc-debrief-body', '#uc-p-debate', '.uc-sheet'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((n) => {
        if (n.offsetParent === null) return;
        if (n.scrollHeight > n.clientHeight + 1) clipped.push(sel + ' ' + n.scrollHeight + '>' + n.clientHeight);
      });
    });
    return {
      innerH: window.innerHeight, innerW: window.innerWidth,
      docH: de.scrollHeight, docW: de.scrollWidth, bodyH: b.scrollHeight, bodyW: b.scrollWidth,
      screenBottom: Math.round(r.bottom), screenRight: Math.round(r.right), scrollY: window.scrollY, clipped
    };
  });
  const ok = m.docH <= m.innerH && m.bodyH <= m.innerH && m.docW <= m.innerW && m.bodyW <= m.innerW &&
    m.screenBottom <= m.innerH && m.screenRight <= m.innerW && m.scrollY === 0 && m.clipped.length === 0;
  check(`nol-scroll 390x844 · ${label}`, ok, ok ? `${m.docH}/${m.innerH}` : m);
  return ok;
}

async function shot(page, name) {
  const file = path.join(OUT, name + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 78, scale: 'css' });
  shots.push(path.relative(ROOT, file));
}

const snap = (page) => page.evaluate(() => window.FiezelUndercoverUI.snapshot());
const waitPhase = (page, phase, timeout = 20000) => page.waitForFunction((p) => window.FiezelUndercoverUI.snapshot().phase === p, phase, { timeout });
const queue = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('fiezel-undercover-evidence-v1')) || { rows: [] }; } catch (_) { return { rows: [] }; } });

/** Tahan sensor sidik jari sungguhan (pointerdown … pointerup), bukan klik. */
async function holdScan(page, midShot) {
  const box = await page.locator('#uc-scanner').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(90);
  if (midShot) await shot(page, midShot);
  await page.waitForFunction(() => document.getElementById('uc-card').classList.contains('is-flipped'), null, { timeout: 5000 });
  await page.mouse.up();
}

/** Pilih chip per strategi: 'fit' = chip yang cocok dengan kata sendiri, 'none' = chip keliru. */
async function playClue(page, strategy) {
  const plan = await page.evaluate((strat) => {
    const s = window.FiezelUndercoverUI.snapshot();
    const D = window.FiezelUndercoverData;
    const owners = {};
    D.chipsOf(D.pairById(s.pair.id)).forEach((c) => { owners[c.id] = c.owner; });
    const pickFor = (dim) => {
      document.getElementById('uc-tab-' + dim).click();
      const ids = Array.from(document.querySelectorAll('#uc-chips .uc-chip')).map((n) => n.getAttribute('data-chip'));
      const want = ids.filter((id) => strat === 'none' ? owners[id] === 'none' : (owners[id] === 'both' || owners[id] === s.me.role));
      return (want[want.length - 1] || ids[0]);
    };
    return { a: pickFor('a'), b: pickFor('b') };
  }, strategy);
  await page.locator('#uc-tab-a').click();
  await page.locator(`#uc-chips .uc-chip[data-chip="${plan.a}"]`).click();
  await page.locator('#uc-tab-b').click();
  await page.locator(`#uc-chips .uc-chip[data-chip="${plan.b}"]`).click();
  return plan;
}

/**
 * Mainkan sampai debrief. Setiap babak yang pertama kali muncul difoto + diukur nol-scroll.
 * strategy: { clue:'fit'|'none', vote:'inf'|'civ', debate:'act'|'skip', prefix }
 */
async function playToDebrief(page, strategy) {
  const seen = new Set();
  const first = async (key, fn) => { if (seen.has(key)) return; seen.add(key); await fn(); };
  let debateDone = 0;
  for (let guard = 0; guard < 900; guard++) {
    const s = await snap(page);
    if (s.phase === 'debrief') return { s, seen };
    const synthOn = await page.locator('#uc-p-synth').isVisible();
    if (s.phase === 'clue' && synthOn && s.me.alive) {
      await first('synth', async () => { await fit(page, strategy.prefix + ' synthesizer'); });
      const plan = await playClue(page, strategy.clue);
      await first('synth-picked', async () => { await shot(page, strategy.prefix + '-clue-synth'); });
      await page.locator('#uc-transmit').click();
      check(`${strategy.prefix}: petunjuk ditransmisikan (${plan.a} + ${plan.b})`, true);
      await page.waitForTimeout(300);
      await first('clue-bubble', async () => { await shot(page, strategy.prefix + '-clue-bubble'); });
      continue;
    }
    if (s.phase === 'clue' && !synthOn && !seen.has('listen') && (await page.locator('.uc-bubble').count()) > 0) {
      await first('listen', async () => {
        await shot(page, strategy.prefix + '-clue-listen');
        await fit(page, strategy.prefix + ' interogasi');
      });
    }
    if (s.phase === 'debate') {
      if (strategy.debate === 'act' && s.me.alive && debateDone === 0) {
        debateDone = 1;
        await page.waitForTimeout(250);
        await page.locator('#uc-shouts .uc-shout[data-shout="vague"]').click();
        await page.waitForTimeout(260);
        const target = s.players.find((p) => p.alive && p.seat !== 1);
        await page.locator(`#uc-seat-${target.seat}`).click();
        await page.waitForSelector('#uc-tray:not([hidden])', { timeout: 4000 });
        await shot(page, strategy.prefix + '-debate-tray');
        await fit(page, strategy.prefix + ' tray lempar');
        await page.waitForTimeout(250);
        await page.locator('#uc-tray-items .uc-item[data-item="tomato"]').click();
        const flying = await page.waitForSelector('.uc-proj', { timeout: 3000 }).then(() => true).catch(() => false);
        check(`${strategy.prefix}: proyektil tomat terbang dari kursi #01 ke #${String(target.seat).padStart(2, '0')}`, flying);
        await shot(page, strategy.prefix + '-debate-throw');
        const splat = await page.waitForSelector('.uc-stain, .uc-burst', { timeout: 3000 }).then(() => true).catch(() => false);
        check(`${strategy.prefix}: efek cipratan mendarat di sasaran`, splat);
        await page.waitForTimeout(500);
        await shot(page, strategy.prefix + '-debate-banter');
        await fit(page, strategy.prefix + ' debat');
        const bubbles = await page.evaluate(() => window.__bubbles);
        check(`${strategy.prefix}: balon petunjuk + balon debat lahir di kursi pembicara`, bubbles.clue > 0 && bubbles.chat > 0, bubbles);
      }
      if (await page.locator('#uc-to-tribunal').isVisible()) await page.locator('#uc-to-tribunal').click().catch(() => {});
      await page.waitForTimeout(120);
      continue;
    }
    if (s.phase === 'tribunal' && s.me.alive) {
      const voted = await page.locator('#uc-vote-status').textContent();
      if (!voted) {
        const pool = s.players.filter((p) => p.alive && p.seat !== 1);
        const pick = strategy.vote === 'inf' ? (pool.find((p) => p.role !== 'civ') || pool[0]) : (pool.find((p) => p.role === 'civ') || pool[0]);
        await page.waitForTimeout(200);
        await first('tribunal', async () => { await shot(page, strategy.prefix + '-tribunal-dim'); await fit(page, strategy.prefix + ' tribunal'); });
        await page.locator(`#uc-seat-${pick.seat}`).click().catch(() => {});
        await page.waitForTimeout(450);
        await first('tickets', async () => { await shot(page, strategy.prefix + '-tribunal-tickets'); });
      }
    }
    if (s.phase === 'tribunal') {
      const out = await page.locator('.uc-seat.is-slam').count();
      if (out) await first('busted-' + s.round, async () => { await page.waitForTimeout(350); await shot(page, strategy.prefix + '-busted-r' + s.round); });
    }
    if (s.phase === 'showdown') {
      const mine = await page.locator('#uc-sd-grid .uc-intel:not([disabled])').count();
      if (mine) {
        await first('showdown-you', async () => { await shot(page, strategy.prefix + '-showdown-you'); await fit(page, strategy.prefix + ' sudden death (murid)'); });
        await page.locator(`#uc-sd-grid .uc-intel[data-word="${s.pair.civ}"]`).click();
        await page.waitForTimeout(400);
        await shot(page, strategy.prefix + '-showdown-you-result');
        check(`${strategy.prefix}: murid menebak kata warga di kisi intel`, true);
      } else {
        await first('showdown-bot', async () => { await page.waitForTimeout(250); await shot(page, strategy.prefix + '-showdown-bot'); await fit(page, strategy.prefix + ' sudden death (bot)'); });
      }
    }
    await page.waitForTimeout(120);
  }
  throw new Error(strategy.prefix + ': debrief tidak pernah tercapai');
}

/* ======================= SKENARIO A · warga, alur penuh, bukti bank ======================= */
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?seed=2&pair=bike&speed=${SPEED}&probe=1`, { waitUntil: 'networkidle' });
  await instrumentSfx(page);
  await page.waitForTimeout(400);
  await shot(page, 'A01-lobby');
  await fit(page, 'A lobi');
  check('A: tombol SFX ON/OFF di pojok kanan atas', (await page.locator('#uc-sfx').textContent()) === 'SFX ON');
  await page.locator('#uc-sfx').click();
  check('A: toggle SFX → OFF', (await page.locator('#uc-sfx').getAttribute('aria-pressed')) === 'false');
  await page.locator('#uc-sfx').click();
  await page.locator('.uc-dossier.is-empty .uc-add').first().click();
  check('A: tombol tambah bot mengisi kursi dossier', (await page.locator('.uc-dossier:not(.is-empty)').count()) === 2);
  await page.locator('#uc-rules-btn').click();
  await page.waitForSelector('#uc-rules:not([hidden])');
  await shot(page, 'A02-rules');
  await fit(page, 'A modal cara main');
  await page.locator('#uc-rules-close').click();
  await page.locator('#uc-start').click();
  await page.waitForTimeout(250);
  await shot(page, 'A03-matchmaking');
  await waitPhase(page, 'reveal');
  await page.waitForTimeout(300);
  await shot(page, 'A04-reveal-front');
  await fit(page, 'A dossier tertutup');
  await holdScan(page, 'A05-reveal-scanning');
  await page.waitForTimeout(900);
  const flipped = await page.evaluate(() => getComputedStyle(document.getElementById('uc-card')).transform);
  /* m11 = cos(rotateY): -1 tepat di 180°. Pegas easing boleh belum diam sepenuhnya di bawah beban
     CPU (mis. -0.999999), jadi yang diuji sudutnya, bukan string persisnya. */
  const m11 = Number((flipped.match(/matrix3d\(([-0-9.e]+)/) || [])[1]);
  check('A: kartu dossier berputar 3D (rotateY 180°)', m11 < -0.99, flipped.slice(0, 40));
  const s0 = await snap(page);
  check('A: kata rahasia + arti tampil di kartu', (await page.locator('#uc-word').textContent()) === s0.me.word && (await page.locator('#uc-gloss').textContent()).length > 2, await page.locator('#uc-gloss').textContent());
  await shot(page, 'A06-reveal-back');
  await fit(page, 'A dossier terbuka');
  await page.locator('#uc-enter').click();
  await waitPhase(page, 'clue');
  await page.waitForTimeout(500);
  await page.locator('#uc-peek').click();
  await page.waitForSelector('#uc-peekbox:not([hidden])');
  check('A: Quick Peek di bar atas menampilkan kata', (await page.locator('#uc-peek-word').textContent()) === s0.me.word);
  await shot(page, 'A07-quick-peek');
  await page.locator('#uc-peek-close').click();
  const res = await playToDebrief(page, { clue: 'fit', vote: 'inf', debate: 'act', prefix: 'A' });
  await page.waitForTimeout(600);
  await shot(page, 'A99-debrief');
  await fit(page, 'A debrief');
  const q = await queue(page);
  const bad = q.rows.filter((r) => !/^(vocab_\d{5}|a1_curated_\d{4})$/.test(r.vocabId));
  check('A: bukti petunjuk masuk antrean Braincore dengan vocabId bank (bicycle → vocab_00082)', q.rows.some((r) => r.kind === 'clue' && r.vocabId === 'vocab_00082' && r.ok === true) && bad.length === 0, q.rows.map((r) => r.kind + ':' + r.word + ':' + r.ok));
  check('A: tidak ada bukti untuk MOTORCYCLE (di luar bank)', !q.rows.some((r) => /motor/i.test(r.word || '')));
  const banner = await page.locator('#uc-banner-code').textContent();
  check('A: banner sinematik debrief', /AGENT VICTORY|UNDERCOVER INFILTRATION/.test(banner), banner);
  check('A: komparasi semantik BICYCLE vs MOTORCYCLE', /BICYCLE/.test(await page.locator('#uc-vs').textContent()) && (await page.locator('#uc-nuance').textContent()).length > 40);
  check('A: telemetri menyebut bukti yang dikirim', /Braincore/.test(await page.locator('#uc-evid').textContent()), await page.locator('#uc-evid').textContent());
  check('A: babak yang terlewati lengkap', ['synth', 'listen', 'tribunal'].every((k) => res.seen.has(k)), Array.from(res.seen));
  await collectSfx(page);
  await ctx.close();
}

/* ============== SKENARIO B · penyusup tertangkap → tebakan sudden death murid ============== */
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?seed=1&pair=pen&speed=${SPEED}&probe=1`, { waitUntil: 'networkidle' });
  await instrumentSfx(page);
  await page.locator('#uc-start').click();
  await waitPhase(page, 'reveal');
  await page.locator('#uc-scanner').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('uc-card').classList.contains('is-flipped'), null, { timeout: 5000 });
  check('B: scan dossier bisa lewat keyboard (Enter)', true);
  await page.waitForTimeout(900);
  const s0 = await snap(page);
  check('B: peran murid PENYUSUP sesuai seed', s0.me.role === 'spy', s0.me);
  await shot(page, 'B01-reveal-spy');
  await page.locator('#uc-enter').click();
  const res = await playToDebrief(page, { clue: 'none', vote: 'civ', debate: 'skip', prefix: 'B' });
  await page.waitForTimeout(600);
  await shot(page, 'B99-debrief');
  await fit(page, 'B debrief');
  const q = await queue(page);
  const clueRows = q.rows.filter((r) => r.kind === 'clue');
  check('B: petunjuk keliru tercatat sebagai bukti GAGAL (pencil, ok=false)', clueRows.length > 0 && clueRows.every((r) => r.vocabId === 'a1_curated_0078' && r.ok === false), clueRows.map((r) => r.word + ':' + r.ok));
  if (res.seen.has('showdown-you')) {
    check('B: tebakan sudden death benar tercatat untuk kata warga (pen → a1_curated_0077, ok=true)', q.rows.some((r) => r.kind === 'guess' && r.vocabId === 'a1_curated_0077' && r.ok === true), q.rows.map((r) => r.kind + ':' + r.word));
    check('B: penyusup merebut kemenangan mutlak', /UNDERCOVER INFILTRATION/.test(await page.locator('#uc-banner-code').textContent()));
  } else {
    check('B: murid tidak tereliminasi pada pertandingan ini (tebakan murid tidak diuji di sini)', true, Array.from(res.seen));
  }
  await collectSfx(page);
  await ctx.close();
}

/* ======================= SKENARIO C · locale Thai di layar yang sama ======================= */
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?lang=th&seed=2&pair=coffee&speed=${SPEED}&probe=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.FiezelUndercoverUI && window.FiezelUndercoverUI.snapshot().locale === 'th', null, { timeout: 8000 });
  await page.waitForTimeout(300);
  const title = await page.locator('#uc-lobby-title').textContent();
  check('C: naskah lobi tampil dalam aksara Thai', /[฀-๿]/.test(title), title);
  check('C: <html lang> mengikuti locale th-TH', (await page.evaluate(() => document.documentElement.lang)) === 'th-TH');
  await shot(page, 'C01-th-lobby');
  await fit(page, 'C lobi Thai');
  await page.locator('#uc-start').click();
  await waitPhase(page, 'reveal');
  await page.locator('#uc-scanner').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  check('C: arti kata rahasia dalam Thai', /[฀-๿]/.test(await page.locator('#uc-gloss').textContent()), await page.locator('#uc-gloss').textContent());
  await shot(page, 'C02-th-reveal');
  await page.locator('#uc-enter').click();
  await page.waitForSelector('#uc-p-synth:not([hidden])', { timeout: 30000 });
  await playClue(page, 'fit');
  await shot(page, 'C03-th-synth');
  await fit(page, 'C synthesizer Thai');
  const chipGloss = await page.locator('#uc-chips .uc-chip small').first().textContent();
  check('C: arti chip petunjuk dalam Thai', /[฀-๿]/.test(chipGloss), chipGloss);
  await ctx.close();
}

/* ============== SKENARIO D · Party Brawl 6 kursi + mode Si Polos dari UI lobi ============== */
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}?seed=6&pair=mountain&speed=${SPEED}&probe=1`, { waitUntil: 'networkidle' });
  await page.locator('.uc-mode[data-mode="white"]').click();
  await page.locator('#uc-sizes button[data-size="6"]').click();
  await page.locator('#uc-fill').click();
  await page.waitForTimeout(300);
  check('D: formasi 6 kursi terisi bot berkepribadian', (await page.locator('.uc-dossier:not(.is-empty)').count()) === 6);
  await shot(page, 'D01-lobby-6p-white');
  await fit(page, 'D lobi 6 kursi');
  await page.locator('#uc-start').click();
  await waitPhase(page, 'reveal');
  await page.locator('#uc-scanner').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  const s0 = await snap(page);
  check('D: mode Si Polos memberi murid peran SI POLOS (tanpa kata)', s0.me.role === 'white' && (await page.locator('#uc-word').textContent()) === '???', s0.me);
  await shot(page, 'D02-reveal-white');
  await page.locator('#uc-enter').click();
  await waitPhase(page, 'clue');
  await page.waitForSelector('.uc-bubble', { timeout: 15000 });
  await page.waitForTimeout(200);
  await shot(page, 'D03-table-6p');
  await fit(page, 'D meja 6 kursi');
  const seats = await page.locator('.uc-seat').count();
  check('D: meja bundar 6 kursi', seats === 6, seats);
  const overlap = await page.evaluate(() => {
    const r = Array.from(document.querySelectorAll('.uc-seat .uc-av')).map((n) => n.getBoundingClientRect());
    let hits = 0;
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      if (r[i].left < r[j].right && r[j].left < r[i].right && r[i].top < r[j].bottom && r[j].top < r[i].bottom) hits++;
    }
    const arena = document.getElementById('uc-arena').getBoundingClientRect();
    const outside = r.filter((x) => x.left < arena.left - 1 || x.right > arena.right + 1 || x.top < arena.top - 1 || x.bottom > arena.bottom + 1).length;
    return { hits, outside };
  });
  check('D: avatar 6 kursi tidak saling tumpang tindih dan tetap di dalam meja', overlap.hits === 0 && overlap.outside === 0, overlap);
  await page.waitForSelector('#uc-p-synth:not([hidden])', { timeout: 40000 });
  check('D: Si Polos mendapat catatan menyamar saat gilirannya', /[a-z]/i.test(await page.locator('#uc-toast').textContent()), await page.locator('#uc-toast').textContent());
  await shot(page, 'D04-white-synth');
  await fit(page, 'D synthesizer Si Polos');
  await ctx.close();
}

/* ====== SKENARIO E · app.js SUNGGUHAN menguras antrean bukti ke Braincore (index.html) ====== */
{
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const origin = new URL(BASE).origin;
  await page.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
  const at = Date.now() - 60000;
  await page.addInitScript((rowsAt) => {
    if (sessionStorage.getItem('__ucSeeded')) return;
    sessionStorage.setItem('__ucSeeded', '1');
    localStorage.clear();
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
    localStorage.setItem('fiezel-state-v1', JSON.stringify({ preferences: { learnerLocale: 'id', learnerLocaleExplicit: true } }));
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
    localStorage.setItem('fiezel-puter-auth-skipped', '1');
    localStorage.setItem('fiezel-tour-v1', JSON.stringify({ done: true }));
    localStorage.setItem('fiezel-undercover-evidence-v1', JSON.stringify({ v: 1, rows: [
      { id: 'e2e-1', at: rowsAt, kind: 'clue', pair: 'bike', word: 'bicycle', vocabId: 'vocab_00082', ok: true, ms: 5200, kappa: 0.5 },
      { id: 'e2e-2', at: rowsAt + 9000, kind: 'guess', pair: 'pen', word: 'pen', vocabId: 'a1_curated_0077', ok: false, ms: 3400, kappa: 0.6 },
      { id: 'e2e-3', at: rowsAt, kind: 'clue', pair: 'bike', word: 'motorcycle', vocabId: 'vocab_00082', ok: true, ms: 5000, kappa: 0.5 }
    ] }));
  }, at);
  await page.goto(origin + '/index.html');
  const drained = await page.waitForFunction(() => !localStorage.getItem('fiezel-undercover-evidence-v1') && !!localStorage.getItem('fiezel-undercover-receipt-v1'), null, { timeout: 90000 }).then(() => true).catch(() => false);
  check('E: app.js menguras antrean bukti Undercover saat FIEZEL dibuka', drained);
  if (drained) {
    const r = await page.evaluate(() => {
      const st = window.__getFiezelState ? window.__getFiezelState() : null;
      return { receipt: JSON.parse(localStorage.getItem('fiezel-undercover-receipt-v1')), bike: st && st.vocab && st.vocab.vocab_00082, pen: st && st.vocab && st.vocab.a1_curated_0077 };
    });
    check('E: state.vocab["vocab_00082"] (bicycle) menerima 1 bukti benar lewat updateMastery', r.bike && r.bike.total === 1 && r.bike.correct === 1, r.bike);
    check('E: state.vocab["a1_curated_0077"] (pen) menerima 1 bukti salah', r.pen && r.pen.total === 1 && r.pen.correct === 0, r.pen);
    const bk = (r.receipt.items || []).find((x) => x.vocabId === 'vocab_00082');
    check('E: tanda terima — 2 diterapkan, 1 baris cacat dibuang, BKT vocab_bicycle bergerak', r.receipt.applied === 2 && r.receipt.skipped === 1 && bk && bk.bktAfter > bk.bktBefore, r.receipt);
    check('E: app.js meninggalkan petunjuk locale untuk halaman satelit', (await page.evaluate(() => localStorage.getItem('fiezel-ui-locale-hint'))) === 'id');
    await page.goto(BASE + '?speed=6');
    await page.waitForTimeout(500);
    const receiptText = await page.locator('#uc-receipt').textContent();
    check('E: lobi Undercover menampilkan laporan Braincore dari app.js', !(await page.locator('#uc-receipt').isHidden()) && /BICYCLE/.test(receiptText), receiptText);
    await page.screenshot({ path: path.join(OUT, 'E01-lobby-braincore-receipt.jpg'), type: 'jpeg', quality: 78, scale: 'css' });
    shots.push('reports/undercover-redesign/E01-lobby-braincore-receipt.jpg');
  }
  await ctx.close();
}

const REQUIRED_SFX = ['sfxTap', 'sfxScan', 'sfxSpeech', 'sfxThrow', 'sfxSplat', 'sfxHeartbeat', 'sfxGavel'];
check('SFX prosedural wajib berbunyi (tap, scan, speech, throw, splat, heartbeat, gavel)', REQUIRED_SFX.every((k) => sfxFired[k] > 0), sfxFired);
check('SFX fanfare/fail penutup berbunyi', (sfxFired.sfxFanfare || 0) + (sfxFired.sfxFail || 0) > 0);
check('nol console error / pageerror di semua skenario', consoleErrors.length === 0, consoleErrors.slice(0, 5));

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
const report = { probe: 'undercover-redesign', build: 'm025-561', viewport: VIEWPORT, speed: SPEED, at: new Date().toISOString(), pass: failed.length === 0, checks: results, sfxFired, consoleErrors, shots };
fs.writeFileSync(path.join(OUT, 'probe-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`\nprobe-undercover-redesign: ${results.length - failed.length}/${results.length} PASS · ${shots.length} tangkapan layar di ${path.relative(ROOT, OUT)}`);
process.exit(failed.length ? 1 : 0);
