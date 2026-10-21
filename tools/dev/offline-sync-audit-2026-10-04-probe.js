#!/usr/bin/env node
/**
 * tools/dev/offline-sync-audit-2026-10-04-probe.js — bukti untuk
 * reports/OFFLINE-SYNC-AUDIT-2026-10-04.md. BUKAN gerbang: mencetak angka, selalu exit 0.
 *
 *   node tools/dev/offline-sync-audit-2026-10-04-probe.js
 *
 * index.html sungguhan di Chromium (Playwright). Berkas repo disajikan lewat page.route;
 * Worker Cloudflare (https://api.fiezel.my.id) DITIRU di page.route yang sama: saat "offline"
 * setiap request ke sana digagalkan, saat "online" request POST dicatat lalu dijawab 200.
 * context.setOffline() ikut dipakai supaya navigator.onLine dan event online/offline nyata.
 *
 * O1  Dua sesi latihan grammar dijawab BENAR saat offline -> riwayat, skor sesi, gem, BKT,
 *     mastery, antrean hasil kebijakan, antrean IndexedDB bukti BrainCore.
 * O2  Muat ulang halaman (masih offline dari sisi Worker) -> semuanya masih ada?
 * O3  Sambung kembali -> apa yang otomatis terkirim ke Worker tanpa sesi baru.
 * O4  Satu sesi baru saat online -> antrean yang tertahan ikut terkirim, tanpa kehilangan.
 * O5  Data lokal sesudah sinkron: tidak ada yang tertimpa.
 * O6  DUA TAB: tab A menyelesaikan sesi, tab B (dibuka lebih dulu, state lama di memori)
 *     menyimpan sesuatu -> apakah kemajuan tab A tertimpa.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { console.log('Playwright tidak tersedia — probe dilewati.'); process.exit(0); }

const ORIGIN = 'http://localhost:4173';
const WORKER = 'https://api.fiezel.my.id';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4' };
const out = (id, title, data) => { console.log(`\n=== ${id} — ${title}`); for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`); };

const net = { offline: false, posts: [], blocked: 0 };
async function wire(context) {
  await context.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (u.origin === ORIGIN) {
      const t = path.resolve(ROOT, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname).slice(1));
      if (!t.startsWith(ROOT + path.sep) || !fs.existsSync(t) || fs.statSync(t).isDirectory()) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[path.extname(t)] || 'application/octet-stream', body: fs.readFileSync(t) });
    }
    if (u.origin === WORKER) {
      if (net.offline) { net.blocked++; return route.abort('internetdisconnected'); }
      if (req.method() === 'POST') {
        let body = null; try { body = JSON.parse(req.postData() || 'null'); } catch (_) { body = req.postData(); }
        net.posts.push({ path: u.pathname, body });
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"not_found"}' });
    }
    return route.abort();
  });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('__probeSeeded')) return;
    sessionStorage.setItem('__probeSeeded', '1');
    if (localStorage.getItem('__probeKeep')) return;
    localStorage.clear();
    localStorage.setItem('__probeKeep', '1');
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
    localStorage.setItem('fiezel-puter-auth-skipped', '1');
    localStorage.setItem('fiezel-remote-push', 'active');
  });
}
async function boot(page) {
  await page.goto(ORIGIN + '/');
  await page.waitForFunction(() => typeof window.startGrammarQuickSession === 'function' && self.FiezelGrammarUpgrade, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    document.getElementById('fiezelBootSplash')?.remove(); document.querySelector('.fiezel-ob')?.remove();
    window.__cap = { q: null };
    const U = self.FiezelGrammarUpgrade, rt = U.renderTokenOrder;
    U.renderTokenOrder = function (q) { window.__cap.q = q; return rt.apply(this, arguments); };
    U.showGrammarHint = function (q) { window.__cap.q = q; };
  });
}
/** Satu sesi kilat grammar, dijawab BENAR semua sampai layar hasil. */
const runSession = page => page.evaluate(async () => {
  const st = window.__getFiezelState(), sleep = ms => new Promise(r => setTimeout(r, ms));
  const sessions0 = (st.sessionHistory || []).length;
  window.startGrammarQuickSession();
  await sleep(1200);
  let answered = 0;
  for (let step = 0; step < 80 && (st.sessionHistory || []).length === sessions0; step++) {
    const tokenBtn = document.getElementById('tokenSubmitBtn');
    const opts = [...document.querySelectorAll('#options .option')].filter(b => !b.disabled);
    if (tokenBtn && window.__cap.q && window.__cap.q.type === 'token-order' && document.querySelectorAll('#tokenRail .token-chip').length === 0) {
      for (const w of window.__cap.q.tokens) { const b = [...document.querySelectorAll('#tokenBank button.token-chip')].find(x => x.textContent.trim() === w); if (b) b.click(); }
      tokenBtn.click(); answered++; await sleep(500);
    } else if (opts.length) {
      window.__cap.q = null;
      document.getElementById('quizGrammarHint')?.click();
      const q = window.__cap.q;
      const j = q && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 ? q.answerIndex : 0;
      document.querySelectorAll('#options .option')[j]?.click(); answered++;
      await sleep(400);
    }
    const skip = document.querySelector('#confidencePop .confidence-skip') || document.querySelector('#confidencePop .confidence-go');
    if (skip) { skip.click(); await sleep(500); }
    const next = document.getElementById('quizNext');
    if (next && !next.disabled) { next.click(); await sleep(500); }
  }
  const stuck = (st.sessionHistory || []).length === sessions0 ? (document.querySelector('.quiz-shell')?.innerText || document.getElementById('app')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160) : '';
  return { answered, sessionDone: (st.sessionHistory || []).length > sessions0, ...(stuck ? { macetDi: stuck } : {}) };
});
const snapshot = page => page.evaluate(async () => {
  const st = window.__getFiezelState();
  const idbCount = name => new Promise(res => {
    try {
      const req = indexedDB.open(name);
      req.onsuccess = () => { const db = req.result; try { const names = [...db.objectStoreNames]; if (!names.length) { db.close(); return res(0); } const tx = db.transaction(names, 'readonly'); let n = 0, left = names.length; names.forEach(s => { const c = tx.objectStore(s).count(); c.onsuccess = () => { n += c.result; if (--left === 0) { db.close(); res(n); } }; c.onerror = () => { if (--left === 0) { db.close(); res(n); } }; }); } catch (_) { db.close(); res(-1); } };
      req.onerror = () => res(-1);
    } catch (_) { res(-1); }
  });
  let bkt = null; try { bkt = Object.keys(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /bkt/i.test(k)) || 'null') || {}).lessons || {}).length; } catch (_) {}
  return {
    riwayat: (st.history || []).length,
    benar: (st.history || []).filter(h => h.ok).length,
    sesi: (st.sessionHistory || []).length,
    gem: Number(st.gems?.balance || 0),
    gemLedger: (st.gems?.ledger || []).length,
    masteryGrammar: Object.fromEntries(Object.entries(st.grammar || {}).map(([k, v]) => [k, v.mastery])),
    antreanHasilKebijakan: (st.policyOutcomeMeta?.queue || []).length,
    idbBuktiBraincore: await idbCount('fiezel-braincore-evidence-v1'),
    idbBuktiPerMurid: await idbCount('fiezel-braincore-learner-evidence-v1'),
    modeBuktiBraincore: (() => { try { return window.braincoreEvidenceMode(); } catch (_) { return '?'; } })(),
    stateRevision: st.stateRevision,
    lesonBkt: bkt
  };
});

(async () => {
  const browser = await chromium.launch();
  try {
    // ---------------------------------------------------------------- O1..O5
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await wire(context);
    const page = await context.newPage();
    await boot(page);
    const awal = await snapshot(page);

    net.offline = true; await context.setOffline(true);
    const s1 = await runSession(page);
    const s2 = await runSession(page);
    const offline = await snapshot(page);
    out('O1', 'dua sesi dijawab benar saat OFFLINE', { sesi1: s1, sesi2: s2, sebelum: awal, sesudah: offline, requestKeWorkerDigagalkan: net.blocked });

    await page.reload();
    await boot(page);
    const sesudahMuatUlang = await snapshot(page);
    const sama = ['riwayat', 'benar', 'sesi', 'gem', 'antreanHasilKebijakan'].every(k => sesudahMuatUlang[k] === offline[k]);
    out('O2', 'muat ulang halaman, Worker masih tak terjangkau', { identikDenganSebelumMuatUlang: sama, sesudahMuatUlang });

    net.offline = false; await context.setOffline(false);
    await page.waitForTimeout(6000);
    const kirimSaatSambung = net.posts.map(p => p.path);
    out('O3', 'sambung kembali TANPA sesi baru (menunggu 6 detik)', {
      postKeWorker: kirimSaatSambung.length ? kirimSaatSambung : '(tidak ada)',
      antreanHasilKebijakanMasih: (await snapshot(page)).antreanHasilKebijakan
    });

    const nPostsBefore = net.posts.length;
    const s3 = await runSession(page);
    await page.waitForTimeout(4000);
    const baru = net.posts.slice(nPostsBefore);
    const outcomes = baru.filter(p => p.path === '/api/policy/outcome').map(p => p.body?.outcome?.outcomeId || '?');
    out('O4', 'satu sesi baru saat ONLINE', {
      sesi3: s3,
      postKeWorker: baru.map(p => p.path),
      hasilKebijakanTerkirim: outcomes.length,
      hasilKebijakanUnik: new Set(outcomes).size,
      percobaanBrainCoreTerkirim: baru.filter(p => p.path === '/api/brain/attempts').length,
      aktivitas: baru.filter(p => p.path === '/api/activity').map(p => ({ totalAnswered: p.body?.activity?.totalAnswered ?? p.body?.activity?.answered ?? '?', lastStudyAt: p.body?.activity?.lastStudyAt ? 'ada' : '-' }))
    });
    const akhir = await snapshot(page);
    out('O5', 'data lokal sesudah sinkron', { akhir, riwayatTidakBerkurang: akhir.riwayat >= offline.riwayat, gemTidakBerkurang: akhir.gem >= offline.gem });
    await context.close();

    // ---------------------------------------------------------------- O6 dua tab
    const ctx2 = await browser.newContext({ serviceWorkers: 'block' });
    await wire(ctx2);
    const tabA = await ctx2.newPage();
    await boot(tabA);
    const tabB = await ctx2.newPage();
    await boot(tabB);
    const a0 = await snapshot(tabA);
    const sa = await runSession(tabA);
    const aDone = await snapshot(tabA);
    // Tab B masih memegang state lama di memori. Satu aksi kecil yang memanggil save():
    await tabB.evaluate(() => { window.updateMastery('vocab', 'vocab_00003', true); });
    await tabB.waitForTimeout(500);
    const tabC = await ctx2.newPage();
    await boot(tabC);
    const c = await snapshot(tabC);
    out('O6', 'dua tab: A menyelesaikan sesi, B (state lama) menyimpan sesudahnya', {
      sesiA: sa, riwayatA: `${a0.riwayat} -> ${aDone.riwayat}`, gemA: `${a0.gem} -> ${aDone.gem}`,
      dibukaUlangSesudahBMenyimpan: { riwayat: c.riwayat, sesi: c.sesi, gem: c.gem },
      kemajuanAHilang: c.riwayat < aDone.riwayat || c.sesi < aDone.sesi
    });
    await ctx2.close();
  } catch (e) {
    console.log('\n[probe berhenti]', e && e.stack || e);
  } finally {
    await browser.close();
  }
})();
