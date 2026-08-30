/**
 * FIEZEL — gerbang audit UI/UX BERBASIS RENDER (2026-08-30).
 *
 * AKAR MASALAH YANG MELAHIRKAN BERKAS INI. Repo ini punya 201 berkas `*-test.js` dan
 * semuanya membaca TEKS SUMBER dengan regex: `contrast-test.js` mencocokkan pola warna di
 * style.css, `a11y-test.js` mencari literal di app.js, `ui-structure-test.js` menghitung
 * kemunculan `class="nav"`. Tidak satu pun pernah membuka halaman. Akibatnya seluruh kelas
 * cacat lolos dengan gerbang HIJAU, karena cacatnya baru ada setelah kaskade CSS dihitung
 * dan DOM disusun:
 *
 *   - contrast-test.js:353 SUDAH menguji `.section-head h1`, tetapi ia MEMODELKAN warnanya
 *     sebagai var(--ambient-text). Warna sungguhannya saat senja/malam datang dari
 *     features/tutor-classroom/tutor-v3.css yang menimpanya dengan #f8faff — tinta hampir
 *     putih di atas tanah terang, 1,18:1. Judul tiap layar hilang tiap sore dan gerbangnya
 *     tetap hijau.
 *   - Gerbang notifikasi memasang aria-modal="true" tanpa mengurung fokus. Regex tidak bisa
 *     menekan Tab; hanya browser yang bisa.
 *   - `session.snapshot()` ter-CONCAT ke string HTML alih-alih diteruskan sebagai argumen,
 *     jadi "[object Object]" tercetak di layar Classroom. Sintaksnya sah, tesnya diam.
 *
 * Karena itu gerbang ini MENJALANKAN aplikasinya di Chromium dan mengukur piksel serta
 * perilaku, bukan menebak dari sumber.
 *
 * BOLEH DILEWATI. Playwright bukan dependensi repo dan CI publik tidak memasang browser.
 * Kalau Playwright atau Chromium tidak ada, gerbang ini SKIP dengan keluaran jelas dan
 * keluar 0 — pola yang sama dengan gerbang live di quality.yml. Ia MERAH hanya kalau
 * browsernya ada DAN invariannya benar-benar patah.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PHASES = [['dawn', '2026-08-30T06:30:00'], ['day', '2026-08-30T12:00:00'],
                ['dusk', '2026-08-30T17:30:00'], ['night', '2026-08-30T22:00:00']];
const VIEWPORTS = [['xs', 320, 568], ['sm', 390, 844], ['md', 768, 1024], ['lg', 1280, 800]];

function loadPlaywright() {
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright', '/usr/local/lib/node_modules/playwright'];
  for (const id of candidates) { try { return require(id); } catch (_) {} }
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

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.onnx': 'application/octet-stream', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(String(req.url || '/').split('?')[0]);
      if (rel === '/' ) rel = '/index.html';
      const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('nope'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const failures = [];
const passes = [];
/* label = invarian yang DIPEGANG (dicetak saat hijau); message = apa yang PATAH (saat merah). */
const check = (ok, label, message) => { if (ok) passes.push(label); else failures.push(message); };

/* Seed murid yang SUDAH lewat perkenalan dan SUDAH menjawab kedua gerbang boot. Ditekan
   lewat localStorage, bukan lewat klik: kalau hanya diklik, scrim .82 masih menutupi layar
   saat piksel diambil dan setiap latar terbaca gelap palsu. */
function seedScript() {
  return () => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
    } catch (_) {}
  };
}

async function settle(page) {
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3800);
  await page.evaluate(() => {
    try {
      document.getElementById('fiezelBootSplash')?.remove();
      document.documentElement.classList.remove('fz-booting');
      document.querySelector('.fiezel-ob')?.remove();
    } catch (_) {}
  });
  await page.waitForTimeout(300);
}

/* Sampel latar dari PIKSEL screenshot: warna paling sering muncul di kotak elemen. Ini satu-
   satunya cara yang jujur untuk gradien, alfa bertumpuk, dan lapisan langit. Titik yang
   TERTUTUP elemen lain dibuang lewat elementFromPoint — tanpa itu, teks yang kebetulan ada
   di bawah bottom-nav atau di luar lipatan akan dilaporkan gagal padahal tidak. */
const SAMPLE = ([shot, items]) => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const dpr = img.width / innerWidth;
    const out = [];
    for (const it of items) {
      const [l, t, r, b] = it.rect;
      const w = Math.round((r - l) * dpr), h = Math.round((b - t) * dpr);
      if (w < 2 || h < 2) { out.push(null); continue; }
      let d; try { d = cx.getImageData(Math.round(l * dpr), Math.round(t * dpr), w, h).data; }
      catch (e) { out.push(null); continue; }
      const bins = new Map();
      for (let i = 0; i < d.length; i += 4) {
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        bins.set(k, (bins.get(k) || 0) + 1);
      }
      let best = 0, bk = 0;
      for (const [k, v] of bins) if (v > best) { best = v; bk = k; }
      out.push([((bk >> 10) & 31) * 8 + 4, ((bk >> 5) & 31) * 8 + 4, (bk & 31) * 8 + 4]);
    }
    res(out);
  };
  img.onerror = () => res(items.map(() => null));
  img.src = shot;
});

function luminance(c) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function main() {
  const pw = loadPlaywright();
  if (!pw) { console.log('SKIP - playwright tidak terpasang; gerbang render dilewati (bukan kegagalan).'); return 0; }
  const exe = findChromium(pw);
  if (!exe) { console.log('SKIP - Chromium Playwright tidak ditemukan; gerbang render dilewati (bukan kegagalan).'); return 0; }

  const { server, port } = await serve();
  const BASE = `http://127.0.0.1:${port}/index.html`;
  const browser = await pw.chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking',
           '--disable-component-update', '--disable-sync', '--no-first-run',
           '--disable-features=Translate,OptimizationHints,MediaRouter'],
  });

  async function open(vp, opts = {}) {
    const ctx = await browser.newContext({
      viewport: { width: vp[1], height: vp[2] }, deviceScaleFactor: 1,
      colorScheme: opts.colorScheme || 'light',
      reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
    });
    /* Jaringan LUAR diblokir: SDK Puter dan endpoint config tidak boleh menahan boot
       gerbang ini, dan gerbang CI tidak boleh menembak layanan produksi. */
    await ctx.route('**/*', route => route.request().url().startsWith(`http://127.0.0.1:${port}/`)
      ? route.continue() : route.abort());
    const page = await ctx.newPage();
    if (!opts.keepGates) await page.addInitScript(seedScript());
    await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
    await settle(page);
    return { ctx, page };
  }

  try {
    // ---- T1: tidak ada nilai mentah yang bocor ke layar ----------------------------------
    {
      const { ctx, page } = await open(VIEWPORTS[1]);
      await page.evaluate(() => ['welcome', 'authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove()));
      const views = ['home', 'vocab', 'grammar', 'reading', 'skills', 'writing', 'test',
                     'progress', 'classroom', 'library', 'ask', 'online'];
      const dirty = [];
      for (const v of views) {
        await page.evaluate(x => { try { window.go(x); } catch (_) {} }, v);
        await page.waitForTimeout(320);
        const bad = await page.evaluate(() => {
          const t = document.getElementById('app')?.innerText || '';
          return ['[object Object]', 'undefined', 'NaN'].filter(k => t.includes(k));
        });
        if (bad.length) dirty.push(`${v}: ${bad.join(', ')}`);
      }
      check(dirty.length === 0,
        'T1 tidak ada objek/undefined/NaN yang ter-render di 12 layar',
        'T1 nilai mentah bocor ke layar murid: ' + dirty.join(' | '));
      await ctx.close();
    }

    // ---- T2: dialog mengurung fokus -----------------------------------------------------
    {
      const { ctx, page } = await open(VIEWPORTS[1]);
      await page.evaluate(() => ['authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove()));
      /* Gerbangnya DIBUKA langsung lewat fungsinya sendiri, bukan ditunggu muncul: kalau
         tes ini bergantung pada heuristik "kapan undangan layak tampil", ia akan diam-diam
         SKIP di lingkungan yang tidak memenuhinya - dan invarian terpenting dari audit ini
         (dialog mengurung fokus) berhenti dijaga tanpa ada yang tahu. */
      const opened = await page.evaluate(() => {
        try { window.setNotificationGateState('default'); } catch (_) { return false; }
        const g = document.getElementById('welcome');
        return !!g && !g.classList.contains('hidden');
      });
      await page.waitForTimeout(500);
      check(opened, 'T2a gerbang notifikasi bisa dibuka untuk diuji',
        'T2a setNotificationGateState() tidak membuka #welcome - invarian fokus tidak teruji.');
      if (opened) {
        const outside = [];
        for (let i = 0; i < 18; i++) {
          await page.keyboard.press('Tab');
          const where = await page.evaluate(() => {
            const a = document.activeElement;
            if (!a || a === document.body) return null;
            return a.closest('#welcome') ? null
              : (a.textContent || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 24);
          });
          if (where) outside.push(where);
        }
        check(outside.length === 0,
          'T2b fokus tetap terkurung di dialog aria-modal sepanjang 18 Tab',
          'T2b fokus lolos dari dialog aria-modal ke kontrol di balik scrim (' +
          outside.length + '/18 perhentian): ' + [...new Set(outside)].slice(0, 5).join(', '));
      }
      await ctx.close();
    }

    // ---- T3: judul halaman terbaca di SETIAP fase langit & kedua tema ---------------------
    {
      const bad = [];
      for (const scheme of ['light', 'dark']) {
        const { ctx, page } = await open(VIEWPORTS[1], { colorScheme: scheme });
        await page.evaluate(() => ['welcome', 'authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove()));
        for (const view of ['vocab', 'reading', 'progress', 'library']) {
          await page.evaluate(v => { try { window.go(v); } catch (_) {} }, view);
          await page.waitForTimeout(280);
          for (const [phase, iso] of PHASES) {
            await page.evaluate(t => { try { window.updateCelestialClock(new Date(t)); } catch (_) {} }, iso);
            await page.waitForTimeout(1350); /* transisi langit 1,2s harus SELESAI dulu */
            const it = await page.evaluate(() => {
              const h = document.querySelector('#app .section-head h1');
              if (!h) return null;
              const r = h.getBoundingClientRect();
              if (r.width < 4 || r.height < 4 || r.top < 0 || r.bottom > innerHeight) return null;
              const mid = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
              if (mid && !(mid === h || h.contains(mid))) return null; /* tertutup: bukan urusan tes ini */
              const cs = getComputedStyle(h);
              return { text: h.textContent.trim().slice(0, 26), color: cs.color,
                px: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight) || 400,
                rect: [r.left, r.top, r.right, r.bottom] };
            });
            if (!it) continue;
            const shot = 'data:image/png;base64,' + (await page.screenshot({ type: 'png' })).toString('base64');
            const [bg] = await page.evaluate(SAMPLE, [shot, [it]]);
            if (!bg) continue;
            const m = String(it.color).match(/rgba?\(([^)]+)\)/);
            if (!m) continue;
            const p = m[1].split(',').map(Number);
            const alpha = p.length > 3 ? p[3] : 1;
            const fg = alpha >= 1 ? [p[0], p[1], p[2]]
              : [0, 1, 2].map(i => p[i] * alpha + bg[i] * (1 - alpha));
            const need = (it.px >= 24 || (it.px >= 18.66 && it.weight >= 700)) ? 3 : 4.5;
            const ratio = contrast(fg, bg);
            if (ratio < need - 0.05) {
              bad.push(`${scheme}/${phase}/${view} "${it.text}" ${ratio.toFixed(2)}:1 < ${need}`);
            }
          }
        }
        await ctx.close();
      }
      check(bad.length === 0,
        'T3 judul halaman lulus kontras AA di 4 fase langit x 2 tema x 4 layar',
        'T3 judul halaman gagal kontras AA pada fase langit tertentu: ' + bad.slice(0, 6).join(' | '));
    }

    // ---- T4: sasaran sentuh kecil punya area sentuh EFEKTIF >= 44px ----------------------
    {
      const { ctx, page } = await open(VIEWPORTS[1]);
      await page.evaluate(() => ['welcome', 'authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove()));
      await page.evaluate(() => { try { window.go('grammar'); } catch (_) {} });
      await page.waitForTimeout(700);
      const hit = await page.evaluate(() => {
        const el = [...document.querySelectorAll('.lesson-skip-link')].find(e => e.checkVisibility && e.checkVisibility());
        if (!el) return null;
        const rc = el.getBoundingClientRect();
        const probe = dy => {
          const t = document.elementFromPoint(rc.left + rc.width / 2, rc.top + dy);
          return !!t && (t === el || el.contains(t) || t.closest('.lesson-skip-link') === el);
        };
        let top = 0; while (top > -40 && probe(top - 1)) top--;
        let bot = Math.round(rc.height); while (bot < rc.height + 40 && probe(bot + 1)) bot++;
        return { visual: Math.round(rc.height), effective: bot - top };
      });
      check(!hit || hit.effective >= 44,
        'T4 .lesson-skip-link punya area sentuh efektif >= 44px',
        'T4 .lesson-skip-link: area sentuh efektif ' + (hit && hit.effective) +
        'px < 44px (tinggi tampak ' + (hit && hit.visual) + 'px)');
      await ctx.close();
    }

    // ---- T5: ritual harian tidak pernah terbit di belakang dialog lain --------------------
    {
      const { ctx, page } = await open(VIEWPORTS[1], { keepGates: true });
      const stacked = await page.evaluate(() => {
        const open = ['authGate', 'modal', 'welcome'].filter(id => {
          const e = document.getElementById(id); return e && !e.classList.contains('hidden');
        });
        return { open, ritual: !!document.getElementById('fzRitual') };
      });
      check(!(stacked.ritual && stacked.open.length),
        'T5 kartu ritual tidak pernah terbit di belakang dialog lain',
        'T5 kartu ritual terbit di belakang dialog yang sedang terbuka (' + stacked.open.join(',') +
        ') - fokusnya dicuri dan jatah "sekali sehari" hangus tanpa pernah terlihat.');
      await ctx.close();
    }

    // ---- T6: tidak ada scroll horizontal di viewport mana pun ----------------------------
    {
      const over = [];
      for (const vp of VIEWPORTS) {
        const { ctx, page } = await open(vp);
        await page.evaluate(() => ['welcome', 'authGate', 'fzRitual'].forEach(i => document.getElementById(i)?.remove()));
        for (const v of ['home', 'vocab', 'grammar', 'progress', 'classroom', 'library']) {
          await page.evaluate(x => { try { window.go(x); } catch (_) {} }, v);
          await page.waitForTimeout(260);
          const d = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (d > 1) over.push(`${vp[0]}/${v} +${d}px`);
        }
        await ctx.close();
      }
      check(over.length === 0,
        'T6 nol scroll horizontal di 4 viewport x 6 layar',
        'T6 halaman menggeser horizontal: ' + over.join(', '));
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }

  passes.forEach(m => console.log('ok - ' + m));
  if (failures.length) {
    console.error('\nGERBANG RENDER MERAH:');
    failures.forEach(m => console.error('  FAIL - ' + m));
    return 1;
  }
  console.log('\nui-render-audit: semua invarian render hijau.');
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('ui-render-audit-test gagal dijalankan:', err && err.message);
  process.exit(1);
});
